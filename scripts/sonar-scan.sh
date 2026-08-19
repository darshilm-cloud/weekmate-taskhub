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

RAW_LCOV="client/coverage/lcov.info"
SONAR_LCOV="client/coverage/lcov.sonar.info"
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
[[ -n "${SONAR_TOKEN:-}" ]] || die "SONAR_TOKEN is not set. Export a SonarQube user token and re-run.
       Generate one at ${SONAR_HOST_URL}/account/security
       This script refuses to run without it - a tokenless scan is rejected at
       upload time, long after the analysis appears to have succeeded."

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
auth="$(curl -sS -m 15 -u "${SONAR_TOKEN}:" "${SONAR_HOST_URL}/api/authentication/validate" || true)"
[[ "$auth" == *'"valid":true'* ]] \
  || die "SONAR_TOKEN did not authenticate against ${SONAR_HOST_URL}.
       Response: ${auth:-<no response - is the server up?>}"
echo "    server:  ${SONAR_HOST_URL} (token OK)"
echo "    scanner: ${SONAR_SCANNER}"

# -----------------------------------------------------------------------------
# 1. Coverage
# -----------------------------------------------------------------------------
if [[ "${SKIP_TESTS:-0}" == "1" ]]; then
  step "Coverage: SKIPPED (SKIP_TESTS=1), reusing $RAW_LCOV"
  [[ -f "$RAW_LCOV" ]] || die "$RAW_LCOV does not exist, so there is nothing to reuse."
else
  step "Coverage: npm run test:coverage --prefix client"
  # Do NOT swallow a test failure. Coverage from a red suite is meaningless:
  # a suite that dies on import reports 0% for every file it touches.
  npm run test:coverage --prefix client \
    || die "The client test suite failed. Fix it before scanning - a crashed
       suite reports 0% for every file it imports, and uploading that would
       overwrite good numbers on the dashboard with a false collapse."
fi
[[ -f "$RAW_LCOV" ]] || die "Expected $RAW_LCOV to exist after the coverage run."

# -----------------------------------------------------------------------------
# 2. lcov path fix
# -----------------------------------------------------------------------------
# Jest runs inside client/ and writes paths relative to it ("SF:src/App.js").
# Sonar resolves reportPaths entries from the project root, so every SF: line
# needs a "client/" prefix or Sonar matches nothing and records 0% coverage
# WITHOUT failing - the single most common way this setup silently breaks.
step "Rewriting lcov paths for the project root"
first_raw="$(grep -m1 '^SF:' "$RAW_LCOV" || true)"
[[ -n "$first_raw" ]] || die "$RAW_LCOV contains no SF: lines - it covered no files at all."
echo "    before: $first_raw"

if [[ "$first_raw" == SF:/* ]]; then
  # Absolute paths: make them relative to the repo root.
  sed "s|^SF:${REPO_ROOT}/|SF:|" "$RAW_LCOV" > "$SONAR_LCOV"
else
  sed 's|^SF:src/|SF:client/src/|' "$RAW_LCOV" > "$SONAR_LCOV"
fi

first_fixed="$(grep -m1 '^SF:' "$SONAR_LCOV")"
echo "    after:  $first_fixed"

# Verify, do not assume: the rewritten path must name a file that exists on disk
# relative to the project root. This is the check that catches a wrong prefix.
probe="${first_fixed#SF:}"
[[ -f "$REPO_ROOT/$probe" ]] \
  || die "Rewritten lcov path does not resolve: '$probe' is not a file under
       $REPO_ROOT. Sonar would read 0% coverage. Fix the sed prefix above."

total_sf="$(grep -c '^SF:' "$SONAR_LCOV")"
missing=0
while IFS= read -r p; do
  [[ -f "$REPO_ROOT/$p" ]] || { missing=$((missing + 1)); [[ $missing -le 5 ]] && echo "    MISSING: $p"; }
done < <(grep '^SF:' "$SONAR_LCOV" | sed 's|^SF:||')
[[ "$missing" -eq 0 ]] \
  || die "$missing of $total_sf lcov paths do not resolve from the project root."
echo "    all $total_sf lcov paths resolve from the project root"

# -----------------------------------------------------------------------------
# 3. Scan
# -----------------------------------------------------------------------------
step "Scanning"
"$SONAR_SCANNER" \
  -Dsonar.host.url="$SONAR_HOST_URL" \
  -Dsonar.token="$SONAR_TOKEN" \
  "$@"

step "Done - quality gate passed"
