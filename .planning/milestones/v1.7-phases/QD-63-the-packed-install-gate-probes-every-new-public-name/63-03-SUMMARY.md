---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
plan: 03
subsystem: build-gate
tags: [gate-14, package-install, removed-probe-proof, red-evidence]
phase_base: 11dc168f4d8a8b295aef16f2d04b762c503d1ba8
plan_head_before: d693b2d1ca182439c33e48ad20b6a9667eff1f5f
plan_head_after: fb965dba6ac536c2056ec4db78057ea4994618bf
requires: [63-02]
provides:
  - "each whole probe removed (gates, diagnostics, host cache, refused literal) shown failing gate 14 by name, alone"
  - "both @ts-expect-error directives, the published DecisionCache.d.ts and each probe's assertion shown load-bearing"
  - "DoD table unchanged: 25 steps match pnpm check"
affects: [63-04, 63-05]
tech-stack:
  added: []
  patterns:
    - "scratch copies of the committed script with ROOT and SANDBOX overridden, one anchor-asserted edit each, run as the real gate and deleted"
key-files:
  created: []
  modified:
    - .planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-RED-EVIDENCE.md
key-decisions:
  - "The proof is recorded from logs of scratch copies, never as a committed self-test, which would need its own sandbox install"
requirements-completed: []
duration: 15min
completed: 2026-11-20
status: complete
commits: 2
actuals:
  tokens: 1300
  tasks: 2
  commits: 2
---

# Phase QD-63 Plan 03: Removed and broken probes fail gate 14 Summary

Eleven scratch variants of the committed gate (`c0`, `r1`, `r2`, `r4`, `r5`, `r3`, `r6`, `dts`, `m1`, `m2`, `m3`) each matched their expected exit, failure lines and count; the record is `63-RED-EVIDENCE.md`, section `## Removed and broken probes` plus `### DoD table`.

## Results

Full rows are in `.planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-RED-EVIDENCE.md`.

- c0 (no edit) exits 0 with `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`.
- r1 and r2 (a feed probe removed) each exit 1 with `1 failure(s)`: `  the consumer fixture never calls makeGatesFeed: every make*Feed the packed @qadi/devtools root exports must be probed`, and the same line naming `makeDiagnosticsFeed`.
- r4 (the host cache removed, the refused literal still naming the type) exits 1, `1 failure(s)`:
  `  the consumer fixture never uses DecisionCacheShape as a type: every type-only probe name must be a type reference outside a refused literal`
- r5 (the refused literal and its directive removed, the host cache still using the type) exits 1, `1 failure(s)`:
  `  the consumer fixture never refuses a literal typed DecisionCacheShape: every refused-shape probe name must annotate a declaration holding a @ts-expect-error that names its refused member`
- r3 (pre-0.13 directive dropped) fails the compile with TS2345 and, the literal now unrefused, the refused-shape line: `2 failure(s)`. r6 (`schedule` directive dropped) gives TS2353; dts (packed `DecisionCache.d.ts` reverted to the `compute` parameter) gives TS2578, an unused directive; each `1 failure(s)`.
- m1, m2 and m3 (one assertion broken each) fail the run with the probe's own message: `diagnostics feed reached Live in 200 turns was Off, wanted Live`, `host cache lookups was miss,miss, wanted miss,hit`, `gates feed instance count was 0, wanted 1`; each `1 failure(s)`.
- `node scripts/check-dod-table.mjs` reports `dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve`; `spec/process/definitions-of-done.md` and `package.json` are unchanged since `phase_base`.

No `### Stated limit` subsection: no removal is left green.

## Task commits

| Task | Commit | Files |
| --- | --- | --- |
| 1 (tracer) | `2f249852` | `63-RED-EVIDENCE.md` |
| 2 | `fb965dba` | `63-RED-EVIDENCE.md` |

The tracer's feedback gate was its own verify (each whole-probe removal failing by name, c0 green); expansion followed.

## Deviations from Plan

None - plan executed exactly as written; every observed exit, line and count matched its expected cell.

Notes, not deviations: the TS2345 in r3 is reported at `consumer.ts(258,52)`, the `Effect.map(compute, …)` line, and TS2578 in dts at `consumer.ts(258,3)`. The gate's static trailer `Sandbox kept in .package-check/ for inspection.` is printed by scratch copies too although their sandbox is `.scratch/qd63-red/sandbox`; the shared `.package-check/` was not written by any variant.

## Known Stubs

None.

## Threat Flags

None. `.scratch/qd63-red` was deleted after each task; `git status --porcelain -- scripts packages spec AGENTS.md` is empty and `git diff --quiet HEAD -- scripts/` holds. Other `.scratch/` directories were untouched.

## Self-Check: PASSED

- `63-RED-EVIDENCE.md` and this SUMMARY exist; commits `2f249852` and `fb965dba` are ancestors of HEAD; eleven rows are in the second section; `.scratch/qd63-red` is gone; no file outside the phase directory changed.
