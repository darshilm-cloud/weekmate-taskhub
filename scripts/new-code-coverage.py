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

# ---- lcov: executable lines AND branches -------------------------------------
# Sonar's coverage is NOT line coverage. It is
#   (covered_conditions + covered_lines) / (conditions + lines_to_cover)
# so branches count too - a two-line change carrying eight branches is ten units,
# not two. Ignoring them is how a "80%" local reading turned into 8.2% on the
# server.
import collections
cov, branches, sf = {}, collections.defaultdict(list), None
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
    elif ln.startswith('BRDA:'):
        parts = ln[5:].split(',')
        branches[sf].append((int(parts[0]), parts[3]))

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
    nb = [(l, t) for (l, t) in branches[f] if l in nl]
    nbc = sum(1 for (l, t) in nb if t not in ('-', '0'))
    rows.append((f, len(newexec), len(newexec)-len(uncovered), len(uncovered),
                 uncovered, len(nb), nbc))

rows.sort(key=lambda r: -r[3])
tot_new = sum(r[1] for r in rows); tot_cov = sum(r[2] for r in rows)
tot_unc = sum(r[3] for r in rows)
tot_br  = sum(r[5] for r in rows); tot_brc = sum(r[6] for r in rows)

print(f"\nNEW CODE COVERAGE  (baseline {a.since}, lcov {a.lcov})")
print(f"{'file':<58}{'ln':>5}{'cov':>5}{'br':>5}{'brcov':>6}{'%':>7}")
print('-'*86)
for f,n,c,u,_,nb,nbc in rows:
    if n >= a.min:
        unit = n + nb; done = c + nbc
        print(f"{f:<58}{n:>5}{c:>5}{nb:>5}{nbc:>6}{100*done/unit:>6.1f}%")
print('-'*86)
units = tot_new + tot_br; done = tot_cov + tot_brc
pct = (100*done/units) if units else float('nan')
print(f"{'TOTAL':<58}{tot_new:>5}{tot_cov:>5}{tot_br:>5}{tot_brc:>6}{pct:>6.1f}%")
print(f"\nSonar formula: ({tot_cov} covered lines + {tot_brc} covered branches)"
      f" / ({tot_new} lines + {tot_br} branches) = {pct:.1f}%")
print(f"\nfiles with new executable lines: {len(rows)}")
if unblamable:
    print(f"UNBLAMABLE (untracked/ignored -> counted 100% new): {len(unblamable)}")
    for f in unblamable[:10]: print('   ', f)
if units:
    need = max(0, -(-(80*units)//100) - done)
    print(f"to reach 80%: need {int(need)} more of the {units-done} uncovered units "
          f"(lines + branches)")
