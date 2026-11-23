---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
plan: 08
subsystem: devtools
tags: [mutation, close, success-test, requirements, check-pr]

requires:
  - phase: 72-07
    provides: "the derived store specified, BEH-QD-700, INV-QD-389 and INV-QD-390, the CCR-QD-464 row checked"
provides:
  - "72-mutation-close.json: both groups on one head, compared with the base"
  - "the EXAMINED entry for the derived store's span name"
  - "the success test on the closed tree in 72-RED-EVIDENCE.md"
  - "pnpm check:pr green on the closed tree"
  - "DERV-01 to DERV-05 complete in REQUIREMENTS.md"
affects: []

phase_base: 74f631ada0e04a6003e4dbf959db93ca161f6136
plan_head_before: 27dc2f0384f12ef1b4ba97cecad277bfdde15b8c
plan_head_after: 3885e01417fbb8cd178010c86e7b892408d022e4

status: complete

actuals:
  tokens: 20000
  tasks: 3
  commits: 4

key-files:
  created:
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-mutation-close.json
  modified:
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-mutation.mjs
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-RED-EVIDENCE.md
    - .planning/REQUIREMENTS.md
    - spec/behaviors/28-devtools-screens.md
    - spec/README.md

key-decisions:
  - "A decision number the phase's own context uses (D-13) stood in BEH-QD-700's closing sentence, where the ADR has no such number: removed at its cause with a revision bump, not waved through the scan."
  - "The one new Ignored mutant (the span name's StringLiteral) was run by hand and recorded in EXAMINED rather than closed by a contrived test: it is Killed by the span-name test."

requirements-completed: [DERV-01, DERV-02, DERV-03, DERV-04, DERV-05]  # WX-01..07 stay Pending by instruction

duration: ~20min
completed: 2026-11-22
---

# Phase 72 Plan 08: Close of the derived-store phase Summary

Both source files hold their mutation base on the final tree, the two success-test throwaways fail where the design says they must, every close scan is clean, `pnpm check:pr` exits 0 on the closed tree, and DERV-01 to DERV-05 are marked complete.

phase_base: 74f631ada0e04a6003e4dbf959db93ca161f6136

## Accomplishments

- Task 1 (tracer): the model group, then the store group, each alone through Stryker with stdin closed; `compare` held both to their base and printed its success line; the scorer self-test ends `self-test: 29 passed`. The close head is `27dc2f03` (no `packages/` change after it).
- Task 2: the success test on the closed tree (added `ServicesInput` field refused at the reader; tenth store fails the store-list test), the classifier over the D-13 sweep and over the removed names, and every close scan.
- Task 3: `pnpm check:pr` exit 0 on `d8e201cd`; `check-api-surface.mjs` reads 941 exports; DERV-01 to DERV-05 marked complete in one commit.

## Mutation scores (detected/valid)

| File | Base | Close | Open (Survived + NoCoverage) | Ignored |
| ---- | ---- | ----- | ---------------------------- | ------- |
| `packages/devtools/src/model/DockModel.ts` | 114/114 | 70/70 | 0 -> 0 | 10 -> 10 (0 new) |
| `packages/devtools/src/model/ExternalStore.ts` | 41/42 | 70/71 | 1 -> 1 (the base's own survivor, `sameElements`, now at line 97) | 1 -> 2 (1 new, examined) |

The model's valid count fell 114 -> 70 because the hand triggers, key readers and last keys were deleted; every lost mutant was a killed one (`compare`: "every score that fell lost only killed mutants"). No test was added in this plan, so no restart was needed.

### The examined entry

`EXAMINED` now holds `"packages/devtools/src/model/ExternalStore.ts": { 'StringLiteral ""': 1 }`: the `StringLiteral ""` of the span name `qadi.devtools.makeDerivedStore` (line 142), a module-scope string literal, static. Run by hand under `<S>/stryker.examined.mjs` (the repository's `stryker.devtools.mjs` spread with `ignoreStatic: false`, `--mutate packages/devtools/src/model/ExternalStore.ts`): 72 Killed, 1 Survived (line 97, the base's), and both `StringLiteral ""` mutants of the file (lines 66 and 142) Killed. The scorer's doc comment says so in one sentence.

## Sweep hits and their reasons

The D-13 sweep (`/usr/bin/grep -rnE "\b(nine|ninth|eighth) store|store count" spec packages/devtools/src`) printed 25 hits and none under `packages/devtools/src`. Each has a reason:

| Hit | Reason |
| --- | ------ |
| `spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md:85` | ADR-QD-185: the decision that moved the count |
| `spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md:131` | ADR-QD-185: the decision that moved the count |
| `spec/decisions/047-a-headless-devtools-model.md:13` | a blockquote line: a Document Control cell |
| `spec/decisions/047-a-headless-devtools-model.md:487` | a blockquote line: an earlier dated amendment |
| `spec/decisions/047-a-headless-devtools-model.md:497` | a blockquote line: an earlier dated amendment |
| `spec/decisions/047-a-headless-devtools-model.md:510` | a blockquote line: an earlier dated amendment |
| `spec/decisions/168-a-port-card-is-a-model-row.md:63` | an ADR passage under its dated note (line 69) |
| `spec/decisions/168-a-port-card-is-a-model-row.md:142` | an ADR passage under its dated note (line 145) |
| `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md:1` | ADR-QD-162's title (an identifier) |
| `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md:10` | a blockquote line: a Document Control cell |
| `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md:189` | an ADR passage under its dated note (line 191) |
| `spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md:121` | an ADR passage under its dated note (line 124) |
| `spec/decisions/index.yaml:192` | index.yaml: an ADR title or status string |
| `spec/decisions/index.yaml:499` | index.yaml: an ADR title or status string |
| `spec/decisions/index.yaml:500` | index.yaml: an ADR title or status string |
| `spec/traceability.md:368` | ADR-QD-162's section 3 traceability row (an identifier) |
| `spec/traceability.md:386` | ADR-QD-185's section 3 traceability row: the decision that moved the count |
| `spec/README.md:13` | a blockquote line: a Document Control cell |
| `spec/README.md:377` | a change-register row |
| `spec/README.md:383` | a change-register row |
| `spec/README.md:401` | a change-register row |
| `spec/behaviors/28-devtools-screens.md:13` | a blockquote line: a Document Control cell |
| `spec/behaviors/28-devtools-screens.md:928` | a blockquote line: an earlier dated amendment |
| `spec/behaviors/28-devtools-screens.md:939` | a blockquote line: an earlier dated amendment |
| `spec/behaviors/28-devtools-screens.md:1093` | BEH-QD-700's section: the one place the stores are counted |

The removed names (`remerge`, `rejoin`, `reservice`, `keyNow`, `KeyNow`, `lastJoin`, `lastServices`) appear under `packages/` nowhere, and under `spec/` in two passages, both under a dated note:

| Hit | Reason |
| --- | ------ |
| `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md:146` | an ADR passage under its dated note (line 158) |
| `spec/decisions/168-a-port-card-is-a-model-row.md:86` | an ADR passage under its dated note (line 89) |

The proving grep of D-09 and `git grep -n "Pick<ExternalStore<" -- packages/devtools spec` print nothing.

## check:pr

`pnpm check:pr < /dev/null`: exit status `0` (in `<S>/check-pr.status`), head `d8e201cd2942ecb150fb31ff7560be5b1db8ff7e` (in `<S>/check-pr.head`), ending `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).` Nothing under `packages`, `spec`, `scripts`, `AGENTS.md`, `apps`, `examples`, `features` or the manifests changed after that head (the requirements commit touched `.planning/REQUIREMENTS.md` only).

## Task Commits

1. `8d3dabc1` docs(72-08): record the mutation close of the dock model and its store
2. `022adf70` docs(72-08): record the success test on the closed tree
3. `d8e201cd` docs(72-08): BEH-QD-700 cites its decision and the change register without the phase's decision number
4. `3885e014` docs(72-08): DERV-01 to DERV-05 complete

## Deviations from Plan

**1. [Rule 1 - Bug] A phase decision number stood in shipped spec text**
- **Found during:** Task 2 (the close scan for decision numbers)
- **Issue:** `spec/behaviors/28-devtools-screens.md` BEH-QD-700's closing sentence, added by 72-07, read `Specified in ADR-QD-185 (CCR-QD-464, D-13).` ADR-QD-185 has no `D-13`; the number is the phase context's, so it is a decision number the spec must not carry (WX-07).
- **Fix:** dropped `, D-13`; `spec-revise` took the document to Rev 1.45; the CCR-QD-464 row now cites Rev 1.45 and the README's own Rev 1.291 (README bumped with an entry, as earlier register rows did). Checked: every revision the row cites equals the document's Revision; `spec-revise --check`, `verify-traceability.sh --strict` (21 pass) and `check-doc-examples.mjs` (118 blocks) pass.
- **Files modified:** `spec/behaviors/28-devtools-screens.md`, `spec/README.md`
- **Commit:** `d8e201cd`

**2. [Verification-only] Task 2's verify misfired on pattern, not on content**
- The forbidden-construct scan matched `import * as X from` lines and the title text `counts as changed`; the decision-number scan matched `D-01`, `D-03` and `phase base` inside older Change History text of two rewritten (prepended) one-line cells in `spec/README.md` and `spec/invariants.md`. The same checks were run with import lines and quoted strings stripped, and with the diff read word by word (`--word-diff=porcelain`) so a rewritten line counts only its new words. Nothing was weakened: the one real hit above was fixed.
- The classifier's rule 6 was extended to ADR-QD-185's own section 3 row in `spec/traceability.md` (the plan lists ADR-QD-185 among the allowed hits; its text names only the ADR file).

**Total deviations:** 1 auto-fixed (Rule 1), 1 verification-only. **Impact:** none on source; one spec revision bump.

## Known Stubs

None.

## Threat Flags

None. No endpoint, auth path, file access or trust-boundary schema was added. T-72-17 is held by the by-hand report read in Task 1's verify; T-72-18 by the close head being an ancestor of HEAD with no `packages/` change after it, and the base record never rewritten.

## Requirements

DERV-01 to DERV-05 marked complete (checkbox and table row) by `3885e014`; no other line of `REQUIREMENTS.md` changed. WX-01..07 stay Pending as instructed; `requirements.mark-complete` was not run.

## Self-Check: PASSED

- `72-mutation-close.json` present; commits `8d3dabc1`, `022adf70`, `d8e201cd`, `3885e014` are ancestors of HEAD.
- Task verifies: Task 1 `mutation close compared`, Task 2 `close scans clean` (with the pattern-only adjustments above), Task 3 `phase closed`.
