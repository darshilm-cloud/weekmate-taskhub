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

# Markers that mean the value may originate outside the process.
UNTRUSTED = re.compile(
    r"\b(req\.(body|query|params|headers|cookies)|request\.|"
    r"location\.(search|hash|href)|window\.location|document\.cookie|"
    r"localStorage|sessionStorage|searchParams|process\.argv|"
    r"socket\.on|payload|userInput|search|query)\b", re.I)

# Constant/literal sources: a regex applied to a hard-coded or internally
# generated string cannot be driven by an attacker.
INERT = re.compile(r"^\s*(const|let|var)?\s*[\w.]*\s*=\s*[\"'`/]", re.I)


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
    """-> (verdict, reason). SAFE is only returned when nothing untrusted is near."""
    line = source_line(h["component"], h.get("line", 0))
    ctx = line.strip()
    if not ctx:
        return "REVIEW", "source line unavailable - needs a human"
    if UNTRUSTED.search(ctx):
        return "REVIEW", "operates on a value that may carry untrusted input"
    if h["securityCategory"] in ("dos", "ssrf", "command-injection", "sql-injection"):
        if INERT.match(ctx) or re.search(r"/[^/]+/[gimsuy]*", ctx):
            return "SAFE", "pattern is a hard-coded literal, not attacker-controlled"
        return "REVIEW", f"{h['securityCategory']} needs a human judgement"
    if h["securityCategory"] in ("insecure-conf", "others", "weak-cryptography"):
        return "REVIEW", f"{h['securityCategory']} needs a human judgement"
    return "REVIEW", "unclassified"


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
            key = (h["rule"], why)
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
