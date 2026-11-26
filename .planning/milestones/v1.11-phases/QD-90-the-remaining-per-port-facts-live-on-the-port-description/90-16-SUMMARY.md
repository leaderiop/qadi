---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 16
subsystem: phase-close
status: complete
tags: [close, merge-gate, requirements]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: e987c9fd8b418d13db326f1dc15819a83a90a370
plan_head_after: df6068de36f69cbf093b607b18fef8b6456d60c6

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: the landed source, records, measurements and changeset of plans 01-15
provides:
  - the green merge gate without mutation on the final tree
  - the phase's closing run and the per-requirement verdicts
affects: []

requirements-completed: []

actuals:
  tokens: 6000
  tasks: 3
  commits: 1

key-files:
  created:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-16-SUMMARY.md
  modified: []

key-decisions:
  - "The bench gate of record passed, so PFACT-03 is reported met and the `scoped-route route` child ran (decided autonomously)."

duration: 20min
completed: 2026-11-26
---

# Phase 90 Plan 16: The Phase Close Summary

**`pnpm check:pr` exits 0 on the final tree (17 of 18 steps, mutation skipped by design), `90-check.mjs close` exits 0 with 18 checks and the no-release facts, and every requirement of the phase is met, PFACT-03 included (the bench gate of record is `pass`).**

## Task 1: the merge gate without mutation

Run alone, nothing else running, on HEAD `e987c9fd8b418d13db326f1dc15819a83a90a370` with the tree clean of tracked changes apart from the two pre-existing unrelated ones (`.planning/config.json`, `README.md`): `pnpm check:pr < /dev/null`, exit 0, 17 `[run-check n/17]` steps. Last lines:

```
[run-check 16/17] pnpm spec:publish
publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)

[run-check 17/17] pnpm bench:self-test
self-test: 25 passed

run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).
EXIT=0
```

No step failed, so no fix commit was needed. No `.vitest/` or `.stryker-tmp/` was left behind.

## Task 2: every phase check, one run

`node .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-check.mjs close < /dev/null`, exit 0, run alone after `check:pr` finished, on the same HEAD:

```
node .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-pinned-check.mjs --all-applied: exit 0: 90-pinned-check.mjs: pinned: 408 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied
node .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-earlier-checks.mjs: exit 0: 89-earlier-checks.mjs --self-test: exit 0: self-test: 47 passed
90-check.mjs records --close: exit 0: records: the pinned-by lists name tests that exist, and every reserved record is written
90-check.mjs scan-ids: exit 0: scan-ids: no id or phase wording in added lines
90-check.mjs scan-forbidden: exit 0: scan-forbidden: no forbidden form in added lines
90-check.mjs trailers: exit 0: trailers: 54 commits since phase_base, each with the one trailer
90-check.mjs port-facts: exit 0: port-facts names spans fixtures serving: the facts are stated as the shape requires
90-check.mjs scoped-route derived: exit 0: scoped-route derived: the scoped read is derived from the leaf rows and routed by the one matcher
90-check.mjs routing-landed: exit 0: routing-landed: the routing equals the patch of record
90-check.mjs scoped-route route: exit 0: scoped-route route: the scoped read is derived from the leaf rows and routed by the one matcher
90-check.mjs circular: exit 0: circular: no circular dependency found
90-check.mjs sixth-port close: exit 0: sixth-port close: 57 errors in 25 groups, the recorded groups; deleting span, fixture or serving is an error naming it
90-check.mjs bench: exit 0: bench: the patch of record routing.patch was fixed before its run, hashes alike in its record, its run and the tree, and the verdict is the analysis's: pass
90-mutation.mjs compare: exit 0: no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants
90-mutation.mjs landed close: exit 0: landed close: ok
90-mutation.mjs landed coverage-close: exit 0: landed coverage-close: ok
90-check.mjs seen-failing packages/core/test/PortFacts.mutation.test.ts --if-present: exit 0: seen-failing: packages/core/test/PortFacts.mutation.test.ts absent
pnpm spec:package: exit 0: package-install: 9 package(s) pack, resolve and authorize (528 runtime export(s))
close: 18 checks and the no-release facts pass
```

The no-release facts the runner judges (no `packages/*/package.json` version moved, no `CHANGELOG.md` changed since `phase_base`, no tag at HEAD, no commit since `phase_base` touching `.planning/milestones`) are inside the last line.

## Requirements

| Requirement | Verdict | Command and line that shows it |
| ----------- | ------- | ------------------------------ |
| PFACT-01 (spike on the base: circular simulation and routing bench decide which facts move) | met | `90-check.mjs circular`: `no circular dependency found`; `90-check.mjs bench`: `the verdict is the analysis's: pass`; `90-SPIKE.md` and `90-BENCH.md` are committed (`5105fef2`, `e28d64ee`) |
| PFACT-02 (`PortName.ts` an import-free tuple leaf; span names, fixture, serving, `PORT_NAMES_BY_NAME`, `ScopedPort` derived, registry order kept) | met | `90-check.mjs port-facts`: `names spans fixtures serving: the facts are stated as the shape requires`; `90-pinned-check.mjs --all-applied`: `5 of 5 declared edits applied` |
| PFACT-03 (`readScoped` routes off the `LEAF_NEEDS` row; plain function, no new span, hoisted `Match`, BEH-QD-445 order) | met (the gate of record passed, so it is not dropped) | `90-check.mjs scoped-route route`: `the scoped read is derived from the leaf rows and routed by the one matcher`; `routing-landed`: `the routing equals the patch of record`; `bench`: verdict `pass` |
| PFACT-04 (golden, metric snapshot and served bytes pinned on the base and unchanged; `PortServing.tst.ts` unedited; a sixth port without its facts does not compile) | met | `90-pinned-check.mjs --all-applied`: `408 files hold their base text, 3 of 3 born files held`; `sixth-port close`: `57 errors in 25 groups, the recorded groups` |
| PFACT-05 (ADR-QD-203 records the change, amends ADR-QD-163 and ADR-QD-094; AGENTS.md section 3, BEH, INV and traceability move with it) | met | `records --close`: `every reserved record is written`; ADR-QD-114 untouched by decision D-12 |
| WX-01 (`pnpm check:pr` green) | met | `pnpm check:pr`: `ran 17 of 18 steps`, `EXIT=0` |
| WX-02 (ADR, CCR row, BEH/INV/traceability, reserved numbers only) | met | `records --close` and `scan-ids` lines above; ids ARCH-137, ADR-QD-203, CCR-QD-482, BEH-QD-786..790, INV-QD-425..426 only, `next-id.mjs` never run |
| WX-03 (overview names every export; gate 13; gate 14) | met | `pnpm check:pr` includes `node scripts/check-api-surface.mjs` (943 exports documented, plan 15) and `pnpm spec:package`: `9 package(s) pack, resolve and authorize (528 runtime export(s))` |
| WX-04 (nothing new from the forbidden list; budgets move only with their tables) | met | `scan-forbidden`: `no forbidden form in added lines`; `pnpm check:pr` includes the house-style gate (648 files clean per plan 15) |
| WX-05 (coverage holds, Stryker score of touched files does not fall) | met | `90-mutation.mjs compare`: `no file has an open or Ignored mutant its base did not have`; `landed coverage-close: ok`; core coverage 99.86 lines / 99.70 functions / 98.33 branches / 99.58 statements (plan 13) |
| WX-06 (characterisation tests on the base; every new check seen failing once) | met | `90-pinned-check.mjs --all-applied`; `90-earlier-checks.mjs`: `89-earlier-checks.mjs --self-test: exit 0: self-test: 47 passed`; the failing-variant evidence is `90-RED-EVIDENCE.md` and the plan summaries |
| WX-07 (no D-numbers or phase numbers in shipped text; nothing released, pushed, merged, staged by glob) | met | `scan-ids: no id or phase wording in added lines`; `close` no-release facts (versions, changelogs, tags, `.planning/milestones`) pass |

## Mutation and coverage (from plan 13)

The mutation close was taken with the base invocation (46 s, exit 0). `compare` passes: no new open or Ignored mutant in the thirteen files beyond the allowances. Scores base to close: `Ports.ts` 16/16 to 14/14, `PortAccess.ts` 43/43 to 54/57 (94.74; the three open mutants are equivalent by construction, the `bare !== undefined` guard and the dead Always arm of `readScoped`), `PortDescription.ts` 16/16, `PortDerivation.ts` 46/47, `AttributeResolver.ts` 22/22, `RelationshipResolver.ts` 29/29, `CustomPredicate.ts` 30/31 to 33/33, `DecisionHistory.ts` 64/64, `SignatureHistory.ts` 109/110, `LeafNeeds.ts` 76/77, `ScopedLeaf.ts` 11/11, `PortName.ts` and `PortMetrics.ts` with no scorable mutant. Core coverage base to close: lines 99.89 to 99.86, functions 99.78 to 99.70, branches 98.33 to 98.33, statements 99.63 to 99.58, all above the 95 floor; `DecisionHistory.ts` and `LeafNeeds.ts` branch floors hold.

## Commits of the phase, in order

`phase_base` is `46174873`. The 54 commits before this plan's own:

```
404b1541 docs(90-01): record the mutation base
2d9e1ab4 docs(90-01): record the coverage base
c9918de3 docs(90-01): complete measure the base plan
9a13cc35 chore(90-02): add the phase check
ec9dacc9 fix(90-02): name the cycles a circular variant fails on
527406dd docs(90-02): record the phase check seen failing
da2376fd docs(90-02): complete the phase check plan
8e044761 test(90-03): pin the port facts on the base
e8ecfa3c docs(90-03): record the port facts rows seen failing
3fc4b915 docs(90-03): complete the port facts characterisation plan
ed4c14f5 test(90-04): pin the moved port types on the base
f6bc8f4a test(90-04): hold the scoped read to its leaf rows
d329fdd8 docs(90-04): record the type pins and the scoped read seen failing
8ae31ae1 docs(90-04): complete the port types and scoped read plan
5105fef2 docs(90-05): record the spike
e93fc08c docs(90-05): complete the spike plan
c4349bf6 test(90-06): add the scoped-heavy bench workloads
77a2209f docs(90-06): fix the routing patch before its bench
e28d64ee docs(90-06): record the bench gate
660b818e docs(90-06): complete the bench gate plan
501710b2 chore(90-07): add the pinned-test check
ecf335b5 docs(90-07): record the pinned-test check seen failing
f8532cff docs(90-07): complete the pinned-test check plan
28895f3d chore(90-08): add the earlier-phase checks
e577a757 docs(90-08): record the earlier-phase checks seen failing
f5640598 docs(90-08): complete the earlier-phase checks plan
61ff69b8 feat(90-09): export the port names as one tuple
b60c2af2 docs(90-09): record the port names variants
a72d6069 docs(90-09): complete the port names tuple plan
71885b1e feat(90-10)!: a port description states its own span name
38cc5c6d docs(90-10): record the span variants
1518b2c3 docs(90-10): complete the span description plan
faaff622 docs(90): undo the second plan advance after plan 10
96009eb5 feat(90-11)!: a port description states its own fixture
49909ec1 docs(90-11): record the fixture variants
83aaaa24 docs(90-11): complete the fixture plan
c7660557 refactor(90-12): derive the scoped ports from the leaf rows
9c12b14a refactor(90-12): route every scoped read off its leaf row
bf39a490 docs(90-12): record the routing variants
1dcbac56 docs(90-12): complete the scoped read plan
4e63bbb9 docs(90-13): record the sixth port close set
79f26130 docs(90-13): record the mutation close
47fd2cc8 docs(90-13): record the coverage close
0f2e7407 docs(90-13): complete the close measurements plan
e953894f docs(90-14): record the port facts decision
3fe91a59 docs(90-14): state the port facts in the behaviors and invariants
3f441810 docs(90-14): amend the port description, leaf needs and scoped read decisions
429fb5b0 docs(90-14): complete the port facts records plan
c4bc48fb docs(90-15): complete the overview rows
c03e7fe1 docs(90-15): state a new port's facts in the house rules
1149044c docs(90-15): add the upgrade note
4252c23e chore(90-15): add the breaking minor changeset
ca3dbdb2 docs(90-15): record that no external API is touched
e987c9fd docs(90-15): complete the public-facing records plan
```

This plan adds `docs(90-16): close the phase` (the summary alone) and the state commit after it. The `trailers` line above counts 54 because it ran before them.

## Task 3: the scratch root

`node 90-check.mjs scratch-clean` then `scratch-clean --check`; the result is recorded in the plan's final report, because it runs after the summary commit and no tracked file changes.

## Nothing released

No push, merge, tag, publish or `changeset version` ran. No `package.json` version and no `CHANGELOG.md` changed since `phase_base` (the `close` runner's no-release judge passed), and no tag points at HEAD. The one Breaking minor changeset is plan 15's.

## Deviations from Plan

None - plan executed exactly as written. Two notes that are not deviations: the summary commit's `plan_head_after` is set by the state commit that follows it, because a file cannot hold its own commit's hash; and the closing run of `close` precedes the summary commit, so its `trailers` line counts the 54 commits before the two this plan adds.

## Known Stubs

None.

## Threat Flags

None. T-90-32 holds (the no-release facts pass and nothing was pushed, published, tagged or merged); T-90-33 holds (each requirement names a command and a line); T-90-36 is covered by `scratch-clean` refusing any other path.

## Self-Check: PASSED

`pnpm check:pr` exit 0 and `90-check.mjs close` exit 0 were observed on HEAD `e987c9fd`; every commit named above is an ancestor of HEAD (`trailers` checked all 54).
