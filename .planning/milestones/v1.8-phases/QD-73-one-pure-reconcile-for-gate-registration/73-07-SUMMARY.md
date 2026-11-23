---
phase: QD-73-one-pure-reconcile-for-gate-registration
plan: 07
subsystem: testing
tags: [stryker, mutation-close, close-scans, check-pr, requirements]

requires:
  - phase: 73-06
    provides: the spec records the close scans read
provides:
  - "73-mutation-close.json: groups writer and hook measured on one head, compare exits 0"
  - "73-RED-EVIDENCE.md: the close on the final tree, ending with the RECN-03 reading line"
  - "RECN-01 to RECN-05 complete in REQUIREMENTS.md"
affects: []

phase_base: 1dbaf1a932109af41278b9b56892083c6ec40913
plan_head_before: 86032b43e7510a912df2d47d5c168d80f152c463
plan_head_after: ee8b62003fc5f65619b42e035cd4c57394bd5386

actuals:
  tokens: 9000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a close is both groups recorded on one head with no later packages change; a drop is closed with a test, never by re-baselining"

key-files:
  created:
    - .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-mutation-close.json
  modified:
    - .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-RED-EVIDENCE.md
    - .planning/REQUIREMENTS.md
    - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md

key-decisions:
  - "The one added spec line that named ADR-QD-111's decisions-table row by its label was reworded to 'its row in the table above' so the label scan passes as written, rather than excusing the hit; an older amendment line naming the row is not an added line"
  - "No test was added and EXAMINED stays empty: the close held every base score with no new open or Ignored mutant"

requirements-completed: [RECN-01, RECN-02, RECN-03, RECN-04, RECN-05]  # WX-01, WX-03, WX-04, WX-05, WX-07 are held by the scans and the gate here but stay Pending by instruction

duration: ~30min
completed: 2026-11-23
status: complete
---

# Phase 73 Plan 07: Close of the keyed reconcile Summary

**The mutation score of `GateWriter.ts` and `useGate.ts` held on the final tree, every close scan is clean, `pnpm check:pr` is green, and RECN-01 to RECN-05 are complete.**

## The close

`phase_base: 1dbaf1a932109af41278b9b56892083c6ec40913`. Both groups were measured on `86032b43e7510a912df2d47d5c168d80f152c463`, by the base's invocation, alone, stdin closed; nothing under `packages/` changed after it.

| File | Base `detected/valid` | Close `detected/valid` | Survived (base to close) | Ignored (base to close, new) |
|------|-----------------------|------------------------|--------------------------|------------------------------|
| `packages/react/src/GateWriter.ts` | 95/96 | 97/97 | 1 to 0 | 2 to 2, 0 new |
| `packages/react/src/useGate.ts` | 62/74 | 44/45 | 11 to 1 | 25 to 25, 0 new |

`compare` exits 0: "no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants". The `useGate.ts` count fell because the rewrite deleted the mutants of the removed `join("|")` diff and the paired `Record.values` calls. The one `useGate.ts` survivor (line 96, `ConditionalExpression -> false`) is not new. The scorer self-test ends `self-test: 29 passed`. No drop appeared, so no test was added; `EXAMINED` is `{}` and no by-hand `ignoreStatic: false` run was needed.

## The close scans on the final tree

Recorded in `73-RED-EVIDENCE.md` under `## The close on the final tree`: the proving grep over `useGate.ts` and `GateWriter.ts` prints nothing; `useGate.ts` holds two `useEffect(` and two `= useRef`; no added source line, test line or suppression comment holds a forbidden construct; no added `packages` line passes 90 columns; the 43 added test titles are unique, at most 80 characters and label-free; the characterisation has one commit (`2680ab4d`); `check-api-surface` ends `api-surface: 941 export(s) documented across 9 package(s)`; overview, AGENTS.md, `scripts/`, the DoD table and `.changeset/` equal `phase_base`.

RECN-03 is closed under the reading of ADR-QD-186: one registration effect beside the writer-keyed teardown (Decision item 7).

## Merge gate

`pnpm check:pr < /dev/null` exited 0 ending `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).` `check-pr.status` holds `0` and `check-pr.head` holds `f1d28a8ae6f20598994896b4e236dacdc3fc3cac`. Nothing under `packages`, `spec` or `scripts` changed after it (only `REQUIREMENTS.md` and this summary).

## Requirements

RECN-01 to RECN-05 are `[x]` and `Complete` by `ee8b6200`, which holds only `.planning/REQUIREMENTS.md`; no other line changed and every WX checkbox line and table row is byte-identical to before. `requirements.mark-complete` was not used.

## Commits

- `68eb0f26` docs(73-07): record the mutation close of the gate writer and its hook
- `f109881b` docs(73-07): point the useGates amendment at its table row without the label
- `f1d28a8a` docs(73-07): record the close of the keyed reconcile on the final tree
- `ee8b6200` docs(73-07): RECN-01 to RECN-05 complete

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] An added spec line carried a decision-table label**
- **Found during:** Task 2 (the added-line label scan)
- **Issue:** the amendment ADR-QD-186 added to ADR-QD-111 (73-02) opened "The `useGates` bullet and row D-49-b:", a decision label the scan refuses in an added `spec` line.
- **Fix:** reworded to "The `useGates` bullet and its row in the table above:". The ADR keeps its revision (text of an amendment bullet only); no id, link or claim changed.
- **Files modified:** `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md`
- **Commit:** `f109881b`; the scan was repeated and `close scans clean`.

**2. [Verification-only] the verify one-liners were run from files**
- The three `<automated>` blocks were extracted verbatim to scratch files under `$TMPDIR/qd73` and run with `bash`, to avoid re-quoting; nothing a gate checks was changed.

**Total deviations:** 1 auto-fixed (Rule 1), 1 verification-only. **Impact:** a one-line spec wording change; no behaviour change.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

The three task verifies exit 0 (`mutation close compared`, `close scans clean`, `phase closed`); `73-mutation-close.json` exists; commits `68eb0f26`, `f109881b`, `f1d28a8a` and `ee8b6200` are ancestors of HEAD.
