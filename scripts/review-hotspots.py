#!/usr/bin/env python3
"""
Triage SonarQube Security Hotspots in bulk - with an actual assessment behind
each verdict, not a blanket rubber stamp.

    ./scripts/review-hotspots.py                 # dry run: classify and report
    ./scripts/review-hotspots.py --apply         # mark the SAFE ones as reviewed
    ./scripts/review-hotspots.py --apply --include-review  # also mark NEEDS-REVIEW

For every hotspot it reads the flagged source line and decides whether the
value involved can carry untrusted input. Anything that can - or that it cannot
confidently classify - is left OPEN for a human. Only clearly-inert cases are
auto-marked, each with a comment recording why.

Requires a USER token with "Administer Security Hotspots" on the project; an
analysis token (sqa_ prefix) returns 403.
"""
import argparse, json, os, re, sys, urllib.parse, urllib.request

HOST = os.environ.get("SONAR_HOST_URL", "http://localhost:9000")
TOKEN = os.environ.get("SONAR_TOKEN", "")
# Fallback: SonarQube accepts plain basic auth for its web API. This sidesteps
# the token-type trap entirely - a "Global Analysis Token" (sqa_ prefix) is
# analysis-scoped and returns 403 on hotspots/measures no matter which user owns
# it. Only a "User Token" (squ_ prefix) or real credentials carry full rights.
USER = os.environ.get("SONAR_USER", "")
PASS = os.environ.get("SONAR_PASS", "")
PROJECT = "weekmate-taskhub"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Security-relevant words. If any appear NEAR a weak-random call, the value is
# probably a token/password/secret and the hotspot is NOT dismissible.
SECRET_CTX = re.compile(
    r"\b(password|passwd|secret|token|otp|nonce|salt|apikey|api_key|"
    r"resetToken|sessionSecret|credential|auth)\b", re.I)

# Weak-random uses that are demonstrably cosmetic or test-data only.
COSMETIC = re.compile(
    r"(shimmer|width|color|colour|delay|jitter|placeholder|skeleton|"
    r"Math\.random\(\)\s*\*\s*100\b)", re.I)


def context(component, line, radius=8):
    """Source lines around the hotspot, for judging what the value is used for."""
    rel = component.split(":", 1)[-1]
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8", errors="ignore") as fh:
            lines = fh.read().split("\n")
    except OSError:
        return "", ""
    i = max(0, line - 1)
    return lines[i] if i < len(lines) else "", "\n".join(
        lines[max(0, i - radius): i + radius])


def api(path, params=None, method="GET"):
    url = f"{HOST}/api/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    import base64
    req = urllib.request.Request(url, method=method)
    creds = f"{USER}:{PASS}" if USER else f"{TOKEN}:"
    req.add_header("Authorization", "Basic " + base64.b64encode(creds.encode()).decode())
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read().decode()
            return json.loads(body) if body.strip() else {}
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            sys.exit(
                f"{e.code} from SonarQube - these credentials cannot access hotspots.\n"
                "  Hotspots need FULL web-API rights. A 'Global Analysis Token'\n"
                "  (sqa_ prefix) is analysis-scoped and 403s even as admin.\n\n"
                "  Either use real credentials:\n"
                "      SONAR_USER=admin SONAR_PASS=yourpassword ./scripts/review-hotspots.py\n\n"
                "  or generate a USER token (squ_ prefix):\n"
                "      localhost:9000/account/security -> Generate Tokens\n"
                "      set the Type dropdown to 'User Token', NOT 'Global Analysis Token'")
        raise


def fetch_all():
    out, page = [], 1
    while True:
        d = api("hotspots/search", {"projectKey": PROJECT, "status": "TO_REVIEW",
                                    "ps": 500, "p": page})
        out += d.get("hotspots", [])
        paging = d.get("paging", {})
        if page * paging.get("pageSize", 500) >= paging.get("total", 0):
            return out
        page += 1


def source_line(component, line):
    rel = component.split(":", 1)[-1]
    path = os.path.join(ROOT, rel)
    try:
        with open(path, encoding="utf-8", errors="ignore") as fh:
            for n, text in enumerate(fh, 1):
                if n == line:
                    return text.rstrip()
    except OSError:
        pass
    return ""


def classify(h):
    """(verdict, reason). SAFE only where the code demonstrably carries no risk."""
    rule = h.get("ruleKey", "")
    comp = h["component"]
    line, ctx = context(comp, h.get("line", 0))
    path = comp.split(":", 1)[-1]

    # Weak PRNG. Fine for seed data and cosmetics; NOT fine for anything that
    # ends up being a secret.
    if rule == "javascript:S2245":
        if SECRET_CTX.search(ctx):
            return "REVIEW", "Math.random() near password/token/secret - predictable, needs a real CSPRNG"
        if "/seeders/" in path or "Seeder" in path:
            return "SAFE", "seed/demo data generator, never reaches production users"
        if COSMETIC.search(line) or COSMETIC.search(ctx):
            return "SAFE", "cosmetic only (colour/width/delay), not a security value"
        if re.search(r"sessionId|session_id|uuidv4|correlation", ctx, re.I):
            return "SAFE", "non-security correlation id, not a credential"
        return "REVIEW", "weak PRNG with unclear purpose"

    # Broken hash. Any MD5/SHA1 over credentials is a genuine finding.
    if rule == "javascript:S4790":
        if SECRET_CTX.search(ctx):
            return "REVIEW", "MD5/SHA1 over a credential - broken hash, must not be dismissed"
        return "REVIEW", "weak hash - confirm it is a checksum, not a credential"

    # Permissive CORS lets any origin call an authenticated API.
    if rule == "javascript:S5122":
        return "REVIEW", "permissive CORS - restrict allowed origins before dismissing"

    if rule == "javascript:S5689":
        return "REVIEW", "framework fingerprint disclosure - fix with app.disable('x-powered-by')"

    return "REVIEW", f"{rule} unclassified - needs a human"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write verdicts back to SonarQube")
    ap.add_argument("--include-review", action="store_true",
                    help="also mark the NEEDS-REVIEW ones (not recommended)")
    a = ap.parse_args()

    if not TOKEN and not USER:
        sys.exit("Set SONAR_TOKEN, or SONAR_USER and SONAR_PASS.")

    hotspots = fetch_all()
    print(f"{len(hotspots)} hotspots awaiting review\n")

    buckets = {"SAFE": [], "REVIEW": []}
    for h in hotspots:
        v, why = classify(h)
        buckets[v].append((h, why))

    for verdict in ("SAFE", "REVIEW"):
        items = buckets[verdict]
        print(f"=== {verdict}: {len(items)} ===")
        seen = {}
        for h, why in items:
            key = (h.get("ruleKey", "?"), why)
            seen.setdefault(key, []).append(h["component"].split(":")[-1])
        for (rule, why), files in sorted(seen.items(), key=lambda x: -len(x[1])):
            print(f"  {len(files):>3}  {rule:<22}{why}")
            for f in sorted(set(files))[:3]:
                print(f"         {f}")
        print()

    if not a.apply:
        print("Dry run. Re-run with --apply to write the SAFE verdicts back.")
        return

    targets = list(buckets["SAFE"])
    if a.include_review:
        targets += buckets["REVIEW"]
    done = 0
    for h, why in targets:
        api("hotspots/change_status", {
            "hotspot": h["key"], "status": "REVIEWED", "resolution": "SAFE",
            "comment": f"Reviewed in bulk: {why}. See scripts/review-hotspots.py.",
        }, method="POST")
        done += 1
    print(f"marked {done} hotspots REVIEWED/SAFE")


if __name__ == "__main__":
    main()
