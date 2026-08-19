#!/usr/bin/env python3
"""
Compute new-code line coverage the same way SonarQube does, locally.

Sonar decides "newness" from SCM data, not from the diff: for a date-based new
code period, a line is new if its last-commit author date is >= the baseline.
This script reproduces that with `git blame` and intersects the result with the
lcov DA: records, so the numbers can be checked before writing any tests.

  ./scripts/new-code-coverage.py --since 2026-06-01 [--lcov client/coverage/lcov.info]

Files that git cannot blame (untracked or gitignored) have no SCM dates at all;
Sonar treats every one of their lines as new, so this script does too and flags
them, because they can silently dominate the metric.
"""
import argparse, collections, os, re, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument('--since', required=True, help='baseline date, YYYY-MM-DD')
ap.add_argument('--lcov', default='client/coverage/lcov.info')
ap.add_argument('--prefix', default='client/', help='prepend to lcov SF: paths')
ap.add_argument('--min', type=int, default=1, help='only list files with >= N new lines')
a = ap.parse_args()

root = subprocess.run(['git','rev-parse','--show-toplevel'], capture_output=True, text=True).stdout.strip()
os.chdir(root)

# ---- lcov: per file, {line: hits} for executable lines only -------------------
cov, sf = {}, None
for ln in open(a.lcov):
    ln = ln.rstrip('\n')
    if ln.startswith('SF:'):
        sf = ln[3:]
        if not sf.startswith(a.prefix) and not sf.startswith('/'):
            sf = a.prefix + sf
        cov[sf] = {}
    elif ln.startswith('DA:'):
        n, h = ln[3:].split(',')[:2]
        cov[sf][int(n)] = int(h)

# ---- blame: which lines are new ---------------------------------------------
def new_lines(path):
    """Return (set_of_new_line_numbers, unblamable_bool)."""
    r = subprocess.run(['git','blame','--line-porcelain','-w','--',path],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None, True                      # untracked/ignored -> all new
    out, lineno, res = r.stdout, 0, set()
    for m in re.finditer(r'^author-time (\d+)$', out, re.M):
        pass
    # walk porcelain records in order
    cur_ts = None
    for line in out.split('\n'):
        if line.startswith('author-time '):
            cur_ts = int(line.split()[1])
        elif line.startswith('\t'):
            lineno += 1
            if cur_ts is not None and cur_ts >= base_ts:
                res.add(lineno)
    return res, False

base_ts = int(subprocess.run(['date','-d',a.since,'+%s'],capture_output=True,text=True).stdout.strip())

rows, unblamable = [], []
for f, lines in sorted(cov.items()):
    if not lines: continue
    nl, unb = new_lines(f)
    if unb:
        nl = set(lines)                        # no SCM data -> 100% new
        unblamable.append(f)
    newexec = sorted(set(lines) & nl)
    if not newexec: continue
    uncovered = [n for n in newexec if lines[n] == 0]
    rows.append((f, len(newexec), len(newexec)-len(uncovered), len(uncovered), uncovered))

rows.sort(key=lambda r: -r[3])
tot_new = sum(r[1] for r in rows); tot_cov = sum(r[2] for r in rows)
tot_unc = sum(r[3] for r in rows)

print(f"\nNEW CODE COVERAGE  (baseline {a.since}, lcov {a.lcov})")
print(f"{'file':<66}{'new':>6}{'cov':>6}{'unc':>6}{'%':>7}")
print('-'*91)
for f,n,c,u,_ in rows:
    if n >= a.min:
        print(f"{f:<66}{n:>6}{c:>6}{u:>6}{100*c/n:>6.1f}%")
print('-'*91)
pct = (100*tot_cov/tot_new) if tot_new else float('nan')
print(f"{'TOTAL':<66}{tot_new:>6}{tot_cov:>6}{tot_unc:>6}{pct:>6.1f}%")
print(f"\nfiles with new executable lines: {len(rows)}")
if unblamable:
    print(f"UNBLAMABLE (untracked/ignored -> counted 100% new): {len(unblamable)}")
    for f in unblamable[:10]: print('   ', f)
if tot_new:
    need = max(0, -(-(80*tot_new)//100) - tot_cov)
    print(f"\nto reach 80%: need {int(need)} more of the {tot_unc} uncovered new lines covered")
