#!/usr/bin/env bash
# =============================================================================
# One command: coverage -> lcov path fix -> scan -> quality gate.
# Run from anywhere; it always operates on the repository root.
#
#   SONAR_TOKEN=xxx ./scripts/sonar-scan.sh
#
# Optional environment:
#   SONAR_HOST_URL   default http://localhost:9000
#   SONAR_SCANNER     path to the sonar-scanner binary (auto-detected)
#   SKIP_TESTS=1      reuse the existing client/coverage/lcov.info
# =============================================================================
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# package dir : raw lcov : rewritten lcov : path prefix to prepend
LCOV_SETS=(
  "client:client/coverage/lcov.info:client/coverage/lcov.sonar.info:client/"
  "server:server/coverage/lcov.info:server/coverage/lcov.sonar.info:server/"
)
SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"

die() { printf '\n\033[1;31mFATAL: %s\033[0m\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

# -----------------------------------------------------------------------------
# 0. Preflight. Fail LOUDLY and BEFORE doing any work.
# -----------------------------------------------------------------------------
# A missing token must not degrade into a warning: the scanner would still run,
# spend minutes analysing, then have the upload rejected - which looks like a
# scan that "worked" but silently left the dashboard stale.
step "Preflight"
# Credentials: a token, or a username/password pair. Basic auth is supported so
# a revoked or wrong-type token does not block a scan - and because a "Global
# Analysis Token" (sqa_) cannot read measures or hotspots even as admin.
SONAR_USER="${SONAR_USER:-}"
SONAR_PASS="${SONAR_PASS:-}"
if [[ -n "$SONAR_USER" ]]; then
  # A token in SONAR_PASS is a common slip and always yields {"valid":false},
  # so name it here rather than letting the server give a generic answer.
  if [[ "$SONAR_PASS" == sq[apu]_* ]]; then
    die "SONAR_PASS looks like a token (${SONAR_PASS:0:4}...), not a password.
       A token authenticates on its own - drop SONAR_USER and use:
         SONAR_TOKEN=${SONAR_PASS} npm run sonar
       SONAR_USER/SONAR_PASS is for a real login password."
  fi
  AUTH="${SONAR_USER}:${SONAR_PASS}"
  AUTH_DESC="user '${SONAR_USER}'"
elif [[ -n "${SONAR_TOKEN:-}" ]]; then
  AUTH="${SONAR_TOKEN}:"
  AUTH_DESC="token ${SONAR_TOKEN:0:4}..."
else
  die "No credentials. Set SONAR_TOKEN, or SONAR_USER and SONAR_PASS.
       Generate a token at ${SONAR_HOST_URL}/account/security
       (choose Type = 'User Token'; a 'Global Analysis Token' cannot read
       measures or hotspots).
       This script refuses to run without credentials - a scan without them is
       rejected at upload time, long after the analysis appears to succeed."
fi

# Resolve the scanner binary.
SONAR_SCANNER="${SONAR_SCANNER:-$(command -v sonar-scanner || true)}"
if [[ -z "$SONAR_SCANNER" ]]; then
  for candidate in /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner; do
    [[ -x "$candidate" ]] && SONAR_SCANNER="$candidate" && break
  done
fi
[[ -n "$SONAR_SCANNER" && -x "$SONAR_SCANNER" ]] \
  || die "sonar-scanner not found. Set SONAR_SCANNER=/path/to/sonar-scanner."

# Verify the token actually authenticates before burning time on tests.
auth="$(curl -sS -m 15 -u "$AUTH" "${SONAR_HOST_URL}/api/authentication/validate" || true)"
[[ "$auth" == *'"valid":true'* ]] \
  || die "${AUTH_DESC} did not authenticate against ${SONAR_HOST_URL}.
       Response: ${auth:-<no response - is the server up?>}

       {\"valid\":false} means the credential was revoked or is wrong.

       NOTE: a token is NOT a password. Use one form or the other, never both:
         SONAR_TOKEN=sq..._yourtoken npm run sonar            # a token
         SONAR_USER=admin SONAR_PASS=yourLoginPassword ...    # real credentials
       Passing a token as SONAR_PASS sends admin:<token>, which always fails.

       Generate a token (Type = 'User Token' for full API access) at
         ${SONAR_HOST_URL}/account/security"
echo "    server:  ${SONAR_HOST_URL} (${AUTH_DESC} OK)"
echo "    scanner: ${SONAR_SCANNER}"

# -----------------------------------------------------------------------------
# 1. Coverage
# -----------------------------------------------------------------------------
if [[ "${SKIP_TESTS:-0}" == "1" ]]; then
  step "Coverage: SKIPPED (SKIP_TESTS=1), reusing the existing lcov reports"
  for set in "${LCOV_SETS[@]}"; do
    IFS=: read -r pkg raw _fixed _prefix <<< "$set"
    [[ -f "$raw" ]] || die "$raw does not exist, so there is nothing to reuse for $pkg."
    echo "    reusing $raw"
  done
else
  for pkg in client server; do
    step "Coverage: npm run test:coverage --prefix $pkg"
    # Do NOT swallow a test failure. Coverage from a red suite is meaningless:
    # a suite that dies on import reports 0% for every file it touches.
    npm run test:coverage --prefix "$pkg" \
      || die "The $pkg test suite failed. Fix it before scanning - a crashed
       suite reports 0% for every file it imports, and uploading that would
       overwrite good numbers on the dashboard with a false collapse."
  done
fi

# -----------------------------------------------------------------------------
# 2. lcov path fix
# -----------------------------------------------------------------------------
# Jest runs inside client/ and writes paths relative to it ("SF:src/App.js").
# Sonar resolves reportPaths entries from the project root, so every SF: line
# needs a "client/" prefix or Sonar matches nothing and records 0% coverage
# WITHOUT failing - the single most common way this setup silently breaks.
step "Rewriting lcov paths for the project root"
# Each jest runs inside its own package and writes paths relative to it
# ("SF:src/App.js", "SF:helpers/x.js"). Sonar resolves reportPaths entries from
# the project root, so every SF: line needs its package prefix or Sonar matches
# nothing and records 0% coverage WITHOUT failing.
for set in "${LCOV_SETS[@]}"; do
  IFS=: read -r pkg raw fixed prefix <<< "$set"
  [[ -f "$raw" ]] || die "Expected $raw to exist after the coverage run."

  first_raw="$(grep -m1 '^SF:' "$raw" || true)"
  [[ -n "$first_raw" ]] || die "$raw contains no SF: lines - it covered no files at all."
  echo "    [$pkg] before: $first_raw"

  if [[ "$first_raw" == SF:/* ]]; then
    sed "s|^SF:${REPO_ROOT}/|SF:|" "$raw" > "$fixed"      # absolute -> repo-relative
  else
    sed "s|^SF:|SF:${prefix}|" "$raw" > "$fixed"
  fi
  echo "    [$pkg] after:  $(grep -m1 '^SF:' "$fixed")"

  # Verify, do not assume: every rewritten path must name a real file.
  total=0; missing=0
  while IFS= read -r rel; do
    total=$((total + 1))
    [[ -f "$REPO_ROOT/$rel" ]] || { missing=$((missing + 1)); [[ $missing -le 5 ]] && echo "    MISSING: $rel"; }
  done < <(grep '^SF:' "$fixed" | sed 's|^SF:||')
  [[ "$missing" -eq 0 ]] \
    || die "$missing of $total lcov paths in $fixed do not resolve from the project root."
  echo "    [$pkg] all $total lcov paths resolve from the project root"
done

# -----------------------------------------------------------------------------
# 3. Scan
# -----------------------------------------------------------------------------
step "Scanning"
if [[ -n "$SONAR_USER" ]]; then
  "$SONAR_SCANNER" \
    -Dsonar.host.url="$SONAR_HOST_URL" \
    -Dsonar.login="$SONAR_USER" \
    -Dsonar.password="$SONAR_PASS" \
    "$@"
else
  "$SONAR_SCANNER" \
    -Dsonar.host.url="$SONAR_HOST_URL" \
    -Dsonar.token="$SONAR_TOKEN" \
    "$@"
fi

step "Done - quality gate passed"
