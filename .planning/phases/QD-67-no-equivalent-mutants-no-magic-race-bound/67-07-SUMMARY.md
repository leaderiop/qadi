---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
plan: 07
subsystem: testing
tags: [stryker, mutation, close-scan, merge-gate, requirements]
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550
status: complete

requires:
  - phase: QD-67-no-equivalent-mutants-no-magic-race-bound
    provides: 67-01's base record and compare script, 67-03's split eviction, 67-04's arm-table dispatch, 67-05's bench of record, 67-06's records
provides:
  - 67-mutation-close.json, the close record of the three single-flight files (no mutant open)
  - 67-mutation-static.json, the ignoreStatic:false evidence of DecisionCache.ts and SharedComputation.ts
  - the close scan (13 checks) and one pnpm check:pr run, both green on the one tree
  - MUTE-01 to MUTE-04 ticked
affects: []

actuals:
  tokens: 9000
  tasks: 3
  commits: 2
plan_head_before: adb01b5f47629713ca33f07f41df7db725984bbd
plan_head_after: dfeffed64bf9ba645b188119c125150ebabdc5b4

tech-stack:
  added: []
  patterns:
    - "a mutation close made by the base's own invocation, with a second ignoreStatic:false run from a config kept outside the repository"

key-files:
  created:
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation-close.json
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation-static.json
  modified:
    - .planning/REQUIREMENTS.md

key-decisions:
  - "No test was appended and no spec revised: the close left no open mutant, so none of the plan's survivor exits was taken"

requirements-completed: [MUTE-01, MUTE-02, MUTE-03, MUTE-04]
requirements-checked-only: [WX-01, WX-04, WX-05, WX-06, WX-07]

duration: 12 min
completed: 2026-11-21
---

# Phase QD-67 Plan 07: Close Summary

**The Stryker close of the three single-flight files is 38/38, 42/42 and 71/71 with nothing open, both named survivors are gone, and the close scan and `pnpm check:pr` are green on one tree.**

## What was done

- Task 1 (tracer): the close run (the base's invocation) and the static evidence run (`ignoreStatic: false`, config outside the repository, SHA-256 `5e324dfd...`) each ran alone in the foreground with stdin closed. Both records were written by `67-mutation.mjs`, `compare` exited 0, and the two records were committed as `dfeffed6`.
- Task 2: the close scan passed its 13 checks, then `pnpm check:pr < /dev/null` ran once, alone, after a `pgrep` that printed nothing.
- Task 3: `MUTE-01` to `MUTE-04` ticked in `REQUIREMENTS.md` (four boxes, four rows); no WX line touched.

## Mutation

Counts are detected/valid (Killed + Timeout over valid mutants); Ignored mutants are the gate config's static mutants.

| File | Phase 61 floor | Base | Close | Ignored base -> close |
| --- | --- | --- | --- | --- |
| `DecisionCache.ts` | 42/43 | 42/43 (1 open) | 38/38 (0 open) | 2 -> 2 |
| `Lifecycle.ts` | 42/42 | 42/42 (0 open) | 42/42 (0 open) | 2 -> 2 |
| `SharedComputation.ts` | 70/71 | 70/71 (1 open) | 71/71 (0 open) | 8 -> 8 |

The close run's own report: 151 killed, 0 timeout, 0 survived, 0 no coverage, 0 errors; "Final mutation score of 100.00", 1 minute 29 seconds.

The two named survivors are gone, each by the measurement that found it:

- Base `DecisionCache.ts:287`, ConditionalExpression `true` on `if (Option.isSome(oldest)) entries = HashMap.remove(...)`: the guard no longer exists, the eviction is one split and one removal. DecisionCache.ts has 38 valid mutants at the close against 43 at the base, because that line's mutants are gone with it.
- Base `SharedComputation.ts:319`, StringLiteral `""` on `{ _tag: "Claimed", entry }`: killed, since the claim is dispatched through a closed arm table. 71 of 71 are detected.

Static evidence (`ignoreStatic: false`, `DecisionCache.ts` and `SharedComputation.ts`, nothing Ignored): `DecisionCache.ts` 39/40 and `SharedComputation.ts` 71/79. The nine survivors are static mutants of module-load text the phase did not write: `DecisionCache.ts:141` (the service id string) and `SharedComputation.ts:89` to `99` (the `afterReset` and `afterLastLeave` tables). The written hunks of `DecisionCache.ts` start at line 200, and `SharedComputation.ts`'s first hunk is line 107 (one line, outside lines 89 to 99). `compare` maps lines through `git diff -U0` and found none of the nine on a written line.

`compare` output (`$TMPDIR/qd67/compare.txt`):

```
packages/core/src/DecisionCache.ts 42/43 -> 38/38, ignored 2 -> 2 (0 new)
packages/core/src/Lifecycle.ts 42/42 -> 42/42, ignored 2 -> 2 (0 new)
packages/core/src/SharedComputation.ts 70/71 -> 71/71, ignored 8 -> 8 (0 new)
packages/core/src/DecisionCache.ts with static mutants scored 39/40
packages/core/src/SharedComputation.ts with static mutants scored 71/79
no file's score fell below its base or floor, the close leaves no mutant open, and no mutant on a line the phase wrote is left open
```

`stryker.config.mjs` is unchanged and no `stryker67` file is tracked.

## Close scan

`bash $TMPDIR/qd67/close-scan.sh` (SHA-256 `a17bbdc9...`, `added-tokens.mjs` `63836e53...`) at HEAD `dfeffed6`:

```
ok 1 phase_base eacf89b4b3ab9ef6189312ab904f7d4943714550 is an ancestor of HEAD
ok 2 packages: exactly the bench file, the three sources and DecisionCache.test.ts changed, besides an appended SharedComputation.test.ts
ok 3 tests: every hunk of DecisionCache.test.ts lies inside the race test, and SharedComputation.test.ts only gains lines
ok 4 source: the eviction, the table dispatch, the TraceDiff comment, the bench workloads and the race test are the planned texts
ok 5 unchanged: scripts, stryker.config.mjs, package.json, the core barrel, Lifecycle.ts, spec/overview.md, Phase 66's harness
ok 6 release: no changeset, version, changelog or tag
ok 7 bans: no banned path committed
ok 8 tokens: no forbidden token, suppression comment or milestone id on an added line
ok 9 ccr-row: the CCR-QD-458 row cites every revised document at its current Revision
ok 10 texts: no text describes the eviction loop, the two-check dispatch or the fixed sweep
ok 11 gates: house-style (the switch and untraced budgets), api-surface and dod-table unchanged
ok 12 commits: the phase's commits in order, each with exactly the trailer
ok 13 bench: the bench of record passed, and no source, bench file or check:pr script changed after it
close-scan: 13 checks passed
```

Its check 12 lists `docs(67-07): record the mutation close and the static evidence` as the last commit it expects, so it was run once the records were committed, as the plan orders. The scan was not re-run after this summary's commit.

## Merge gate

- `pnpm check:pr < /dev/null`, run once, in the foreground, after `pgrep -fl "vitest|stryker run|check-package-install"` printed nothing, on HEAD `dfeffed64bf9ba645b188119c125150ebabdc5b4` (`$TMPDIR/qd67/check-pr.head`).
- Exit status 0, duration 159 s, no `ELIFECYCLE` in the log.
- The log's last line: `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).`
- The tree since that head differs only by `.planning/REQUIREMENTS.md` and this summary (the tick commit's two files); state and roadmap follow in a separate commit, as in the earlier plans.

## Edge coverage

The 25 truths and 4 flagged assumptions of 67-01's table, each with where it was settled.

| Requirement | Edges | Settled by |
| --- | --- | --- |
| MUTE-01 | A1 (no branch that cannot be taken, read as straight-line eviction) | 67-03's eviction (one `Chunk.splitAt`, one `HashMap.removeMany`, one assignment); 67-07's close: no open mutant in `DecisionCache.ts` |
| MUTE-02 | A2 (every tag the claim step writes and the dispatch reads) | 67-04's arm table and `tag-mutants.sh`; 67-07's close: `SharedComputation.ts` 71/71, nothing open |
| MUTE-03 | boundary, adjacency, empty, ordering, precision (5 truths) | 67-01's race test (sweeps each budget until both sides are seen, with a cap and a margin) and `67-RED-EVIDENCE.md`; 67-07's close scan checks 3 and 4 |
| MUTE-04 | A3 (floors 42/43, 42/42, 70/71 by integer cross-multiplication, and not below the base) | 67-07's `compare` exit 0 |
| WX-01 | adjacency, empty, ordering (3 truths) | 67-07 Task 2: `pgrep` before, exit 0, no `ELIFECYCLE`, the run-check last line, HEAD unchanged, tree since differs only by the tick commit's two files |
| WX-02 | adjacency, empty, encoding, ordering (4 truths) | 67-06's records (INV-QD-379, BEH-QD-166's reasons, CCR-QD-458), the register red then green; close scan check 9 |
| WX-03 | adjacency, empty, encoding, ordering (4 truths) | 67-06 (no export changed; gate 13 `api-surface: 939 export(s)`); close scan check 11 |
| WX-04 | adjacency, empty, ordering (3 truths) | 67-04's dispatch; close scan check 11 (house-style's switch and untraced budgets unchanged) and check 8 |
| WX-05 | boundary, precision, concurrency (3 truths) | 67-07: integer cross-multiplication in `compare`; each Stryker run alone in the foreground with stdin closed; coverage thresholds inside `check:pr` |
| WX-06 | adjacency, empty (67-01); ordering (67-03) | 67-01's red evidence on the base before any source change; close scan check 12 (commit order) |
| WX-07 | A4 (nothing released) | close scan checks 6, 7 and 8: no changeset, version, changelog or tag; no banned path; no milestone id on an added line |

## Deviations from Plan

None - plan executed exactly as written. No survivor existed, so none of Task 1's three survivor exits (a killing test with a re-aligned CCR row, a report for replanning, a `checkpoint:decision`) was taken. `.planning/config.json` carried the owner's uncommitted change throughout and was never staged.

## Issues Encountered

None. The host load average was 14.9 at the start of Task 1 and none of it was ours (a browser renderer, `specforge`, a chat client); `pgrep` showed no vitest, Stryker or bench process before either Stryker run or before `check:pr`. The close run is all Killed with no Timeout, so load did not turn a slow test into a detection.

## Known Stubs

None.

## Threat Flags

None. No source, network endpoint, auth path or schema changed in this plan; only two measurement records and a requirements tick were added.

## Flagged for the owner

Each plan's flags, gathered.

- 67-01: the margin is not clipped by the cap (a budget whose sides appear at gap 510 runs to gap 513); the split's failing gaps (38, 21, 12 at budgets 3, 4, 6) are at or one before the base's switch-over gaps (38, 22, 13), and budget 5 did not fail in the one split run recorded, so the evidence says only that the test goes red; two test texts (the negative-capacity test and its comment) are left as history. The cap (512) and margin (3) are a cap and a margin, not measurements of `walk`.
- 67-02: the table run was made under load above the CPU count (verdict margin -6.3% to -8.4% on the hit workloads, +0.3% and +0.9% on the two miss workloads against a 5% band); the match run's absolute numbers should not be compared with the table run's; the arm table is indexed directly (`arms[claim._tag]`), not through `Object.hasOwn`, because a fail-closed row for a tag `run` wrote could never be reached and its mutant would be equivalent; Match was slower on the two miss workloads only, and the numbers do not say why.
- 67-03: `TraceDiff.ts` is a fourth file in scope (one comment); the negative-capacity test's title (line 1052) and comment (line 1054) still name the loop that no longer exists, left unedited as the plan states; the `+` mutant fails two tests, one of them the race test.
- 67-04: the arm table is indexed directly, with no `Object.hasOwn` row; `run` joins the claim step to its arm with `Effect.flatMap` inside the one `Effect.uninterruptibleMask`, and the `Effect.sync` block with the hit check is unchanged; the mutant counts in its summary were hand-applied runs, and this plan's Stryker close is the run under per-test coverage (all detected).
- 67-05: the bench run is not noise-free (load 9.43 on 12 CPUs at the start, another project's `check-links` at 97.9% just before the first run); the two miss workloads moved the wrong way (+2.8% and +1.0%, inside the 5% band) and the three hit workloads were 4.6% to 5.8% faster; the bench is the last executable change (close scan check 13 confirms it).
- 67-06: none beyond the note that a later spec fix must re-align the CCR-QD-458 row; none was needed.
- 67-07: the static evidence leaves nine survivors on lines the phase did not write (the service id string at `DecisionCache.ts:141`, the two standing tables at `SharedComputation.ts:89` to `99`). They are static mutants outside the gate's score and outside the plan's "written lines" rule; they predate the phase.

## Self-Check: PASSED

- `67-mutation-close.json`, `67-mutation-static.json` and this summary exist; commit `dfeffed6` is an ancestor of HEAD.
- Task 1's checks (records of the base invocation, `head` equal to the commit before the record commit, three files, nothing open, nothing Ignored in the evidence, `compare` exit 0, `stryker.config.mjs` unchanged, no `stryker67` file tracked) all held; the close scan passed 13 checks; `check:pr` exited 0 on the head it recorded.

---
*Phase: QD-67-no-equivalent-mutants-no-magic-race-bound*
*Completed: 2026-11-21*
