# Code Quality — SonarQube

Static analysis + test coverage for WeekMate TaskHub.

- **Server:** `http://localhost:9000`
- **Project key:** `weekmate-taskhub` — [dashboard](http://localhost:9000/dashboard?id=weekmate-taskhub)

> The key is **case-sensitive**. A typo does not error; it silently creates a
> brand-new project and analyses into that instead, which looks like a working
> scan with inexplicably different numbers. The key that used to be in
> `sonar-project.properties`, `jselsner_elsnerpms_AY4N0IuwfFtGl2GK4wKU`
> (`projectName=ElsnerPMS`), does not exist on this server and is not ours.

## Running it

One command, from the repository root. It does coverage → lcov path fix → scan
→ quality gate, and exits non-zero if any step fails.

```bash
export SONAR_TOKEN=squ_xxxxxxxx     # never commit this
npm run sonar
```

| Script | What it does |
|---|---|
| `npm run sonar` | Full run: coverage → lcov path fix → scan → quality gate |
| `npm run sonar:fast` | Same, but reuses existing coverage (skips the ~90s test run) |
| `npm run test:coverage` | Coverage only, no scan |
| `npm run new-code` | New-code coverage table, no server needed |

All four are defined in the root `package.json` and shell out to
`scripts/`. `npm run sonar` is just a wrapper around
`./scripts/sonar-scan.sh`, which still works if you prefer to call it directly.

| Variable | Default | Purpose |
|---|---|---|
| `SONAR_TOKEN` | *(required)* | Refuses to run without it — see below |
| `SONAR_HOST_URL` | `http://localhost:9000` | Server URL |
| `SONAR_SCANNER` | auto-detected | Path to the `sonar-scanner` binary |
| `SKIP_TESTS=1` | off | Reuse the existing `client/coverage/lcov.info` |

Coverage only, no scan:

```bash
npm run test:coverage --prefix client
```

New-code coverage table, computed locally from `git blame` × lcov — the same way
Sonar decides newness, so you can check it *before* writing tests:

```bash
./scripts/new-code-coverage.py --since 2026-07-01
```

### Two things the script deliberately makes loud

**A missing token is fatal, not a warning.** Without it the scanner would still
run, spend ~4 minutes analysing, and only then have the upload rejected — which
reads as a scan that worked while leaving the dashboard stale. The script also
verifies the token actually authenticates before running the test suite.

**lcov paths are rewritten and then checked.** Jest runs inside `client/` and
writes paths relative to it (`SF:src/NextApp.js`), but Sonar resolves
`reportPaths` from the repository root. Unfixed, Sonar matches nothing and
records **0% coverage without failing** — the most common silent breakage in
this setup. The script writes a prefixed copy to `client/coverage/lcov.sonar.info`
(`SF:client/src/NextApp.js`), leaving the original untouched, then asserts that
every single `SF:` path resolves to a real file before scanning.

## What is excluded, and why

Every exclusion below exists because measurement is *impossible*, not because
the code is inconvenient to test. Exclusions live in two places that must stay
in sync: `sonar-project.properties` and `collectCoverageFrom` in
`client/package.json`.

### Not analysed at all (`sonar.exclusions`)

| Path | Why |
|---|---|
| `**/node_modules/**` | Third-party dependencies |
| `client/build/**` | Generated webpack output |
| `server/uploads/**` | Runtime user-upload directory |
| `server/public/**` | Served static assets |
| `client/src/settings/**`, `server/settings/**` | **Symlink duplicates** (see below) |

### Not scored for coverage (`sonar.coverage.exclusions`)

| Path | Why |
|---|---|
| `client/src/settings/**` | Resolves outside the Jest `rootDir` — see below |

**The symlink trap.** `client/src/settings → ../../settings` and
`server/settings → ../settings` both point at the repo-root `settings/`
directory (both links are in `.gitignore`; the app scripts recreate them via
`shx ln -sf` on start). Two separate consequences:

1. *Analysis:* indexing them would register the same physical files two extra
   times — a guaranteed false **100% duplicated-lines** reading on them, plus
   triple-counted `ncloc`. The real directory is analysed exactly once as the
   `settings` source root.
2. *Coverage:* the resolved path is **outside the Jest `rootDir` (`client/`)**.
   Jest resolves modules *through* the link — `client/src/containers/App/index.js`
   imports `../../settings/socketEventName` and that works fine — but it never
   emits coverage entries for files outside `rootDir`. Left scoreable, they
   would read 0% forever no matter how many tests were written.

### Deliberately *not* excluded

- **`client/src/pages/Tasks/index1.js`** — was excluded while it carried a real
  `SyntaxError` (a stray `</div>` at line 1393) that made Babel instrumentation
  impossible under any transform config. That line has since been removed, the
  file now parses and instruments cleanly, and including it costs **0.02pp** of
  line coverage (+158 executable lines). It is still **dead code** — nothing
  under `client/src` imports it and the live page is `index.jsx` — so it should
  be *deleted*, not excluded.
- **`server/`, `socket/`** — no test suite exists yet. Note what that actually
  means: Sonar computes coverage only for files present in a coverage report, so
  these files carry **no coverage measure at all** — they are not scored 0%, they
  are simply invisible to the coverage ratio. Excluding them would change
  nothing. The fix is a server-side test suite; until then this is a real gap in
  what the gate can see.

## Jest configuration notes

Config lives in the `jest` block of `client/package.json`. It cannot carry
comments: CRA validates that block against a whitelist and calls
`process.exit(1)` on any unrecognised key, so even a `"//"` comment key breaks
the test runner. That is why the rationale lives here and in
`sonar-project.properties`.

**CRA merges some overrides and replaces others** (`createJestConfig.js`), which
is easy to get wrong:

| Key | Type | CRA behaviour |
|---|---|---|
| `moduleNameMapper` | object | **Merged** — CRA's own entries survive |
| `transformIgnorePatterns` | array | **Replaced** — CRA's defaults must be restated |
| `collectCoverageFrom` | array | **Replaced** |

Verify with `npx react-scripts test --showConfig --watchAll=false`.

### ESM dependencies

Several dependencies now ship ESM that Jest 27 (CJS) cannot parse. A suite that
dies on one of these imports reports **0% for every file it touches**, so this is
worth more than any number of new tests. Preference is a `moduleNameMapper` entry
pointing at a real CJS build; `transformIgnorePatterns` is used only where no CJS
build exists.

| Dependency | Problem | Fix |
|---|---|---|
| `axios@1` | `exports` resolves `import` to ESM `index.js` | map → `axios/dist/browser/axios.cjs` |
| `antd/es/*` (7 deep imports) | `es/` build is ESM | map → `antd/lib/$1` |
| `query-string@9` + `decode-uri-component`, `filter-obj`, `split-on-first` | `type: module`, **no CJS build at all** | transform |
| `@ckeditor/ckeditor5-watchdog` | `type: module` | transform |
| `lodash-es` | `type: module` | transform |

## New code period

**Currently `PREVIOUS_VERSION` (inherited default). This is not yet correct and
is the one outstanding setup step.**

The `Sonar way` gate is made up of **six conditions, every one of them a
new-code metric**:

| Condition | Threshold |
|---|---|
| `new_coverage` | < 80% fails |
| `new_duplicated_lines_density` | > 3% fails |
| `new_security_rating` | worse than A fails |
| `new_reliability_rating` | worse than A fails |
| `new_maintainability_rating` | worse than A fails |
| `new_security_hotspots_reviewed` | < 100% fails |

That makes the new-code period the single most important setting here, and it
fails in two distinct ways if left alone:

1. **On the very first analysis** there is no previous version, so the period is
   empty, all six conditions are skipped, and the gate returns `status: OK` with
   `"conditions": []` — a **vacuous pass**.
2. **On later analyses** `PREVIOUS_VERSION` resolves to the timestamp of the
   *previous analysis* (the project version has not been bumped). "New code"
   then means "whatever changed since the last scan", which is not a meaningful
   review window and moves every time anyone scans.

Always check what was actually evaluated:

```bash
curl -s -u "$SONAR_TOKEN:" \
  "http://localhost:9000/api/qualitygates/project_status?projectKey=weekmate-taskhub"
```

If `conditions` is `[]`, nothing was evaluated. If a condition you expect is
missing from the list, that metric had no data — `new_coverage` disappears
entirely when the window contains no measurable new code, which reads as a pass
but measures nothing.

### Required action

Set **Project Settings → New Code → Specific date → `2026-06-01`**.

This needs a user token with *Administer* on the project; a global analysis
token (`sqa_` prefix) returns 403 on `POST /api/new_code_periods/set`, and also
on `measures/component` and `hotspots/search`.

`2026-06-01` was chosen deliberately: it spans 30 commits and 259 new executable
lines, which is a real review window. Note that the most recent commit is
**2026-07-15**, so any *number-of-days* period shorter than about five weeks
also yields an empty new-code set and another vacuous pass.

Because newness comes from SCM dates, **untracked and gitignored files have no
blame data and count as 100% new**. `server/scripts/backfill_default_timesheets.js`
is currently untracked and therefore counts entirely as new code.

## Coverage denominator

`collectCoverageFrom` is set explicitly so the denominator is stable and
intentional rather than inherited. Note that CRA already defaults it to
`src/**/*.{js,jsx,ts,tsx}`, so on the client the percentage does **not** collapse
as new tests drag their import graphs in — the denominator was already the whole
source tree (28,241 executable lines across 231 files, unchanged before and
after this work).

That protection does not exist on the server, which has no runner config at all.

## Test infrastructure notes

- `client/src/setupTests.js` is listed in `sonar.test.inclusions`. It is Jest's
  `setupFilesAfterEnv` bootstrap, so Jest never instruments it. Left classified
  as main source, every line of it counted as uncovered and pinned
  `new_coverage` at **0.0%** the moment it was edited. Classifying test
  infrastructure as test code is the fix; a coverage exclusion would merely have
  hidden it.
- `jest.setTimeout(30000)` and `--maxWorkers=50%` are set because several suites
  mount real application trees (antd + redux + router). Under full parallelism
  they contend for CPU and exceed the 5s default — the assertions are unchanged,
  the renders are just slower under load. CRA rejects `testTimeout` in
  `package.json`, so it lives in `setupTests.js`.
- `setupTests.js` also shims `window.matchMedia` and `ResizeObserver`, which
  jsdom does not implement but antd calls during render.

## Known issues found while testing

- **Corrupt `user_data` crashes the header.** 21 sites do
  `JSON.parse(localStorage.getItem("user_data"))`. The common
  `|| "{}"` guard only protects against a *missing* value, not a malformed one.
  `containers/Topbar` wraps its own read in try/catch, but a descendant does not,
  so invalid JSON takes the header down. Asserted deliberately in
  `containers/Topbar/companyName.test.js` so a fix trips the test.
- **`client/src/pages/Tasks/index1.js` is dead code.** Nothing under
  `client/src` imports it and the live page is `index.jsx`. Rebuilding with and
  without it produces byte-identical output. It should be deleted.
