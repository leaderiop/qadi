---
phase: 28-gate-registry-dependency
plan: 05
subsystem: react-gate-registry
tags: [adr, spec, mutation, merge-gate, changeset]
d01_outcome: A
requires:
  - phase: 28-gate-registry-dependency
    provides: "28-01..28-04: outcome A, baseline, reconcile, the write-side split"
provides:
  - "ADR-QD-140 (new) and dated amendments to ADR-QD-111 and ADR-QD-080 recording the split, the human's reason and the correction to the review's option A"
  - "CCR-QD-418 in the spec register; a @qadi/react patch changeset"
  - "28-mutation-after.json: per-file scores and aggregate over the six baselined files, none below base"
affects: []
actuals:
  tokens: 6200
  tasks: 3
  commits: 4
plan_head_before: f41a89e34b24cf2add890c9a0fb71f7759277e03
plan_head_after: 97162779c9a4da6859e5169f3030af6482e5f30d
tech-stack:
  added: []
  patterns:
    - "a decision that reverses a recorded import rule gets its own ADR number plus dated amendments on the ADRs it amends; the text above an amendment stays as history"
key-files:
  created:
    - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md
    - .changeset/gate-write-side.md
    - .planning/phases/28-gate-registry-dependency/28-mutation-after.json
  modified:
    - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
    - spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md
    - spec/decisions/103-a-question-is-opened-once.md
    - spec/decisions/index.yaml
    - spec/invariants.md
    - spec/behaviors/28-devtools-screens.md
    - spec/traceability.md
    - spec/README.md
    - packages/react/test/GateRegistry.store.test.ts
key-decisions:
  - "ADR-QD-140 quotes the human's recorded answer (row 28-01 T1) and the standing 'cleanest, not simplest; we can override any ADR' instruction, and states the correction: the review's registry-types-into-GateRegistry.ts form publishes gateWriterFor or closes a cycle"
  - "ADR-QD-103's one-element-case sentence is kept as written and followed by a dated parenthetical note, not rewritten (AGENTS.md section 15: history stays history)"
requirements-completed: [GATE-01, GATE-02, GATE-03, GATE-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06]
coverage:
  - id: D1
    description: "ADR-QD-140 and the ADR-111 / ADR-080 amendments, with statuses in the documents and in index.yaml naming ADR-QD-140"
    requirement: GATE-01
    verification:
      - kind: other
        ref: "plan Task 1 automated checks (outcome A arms) and pnpm spec:verify:strict (PASS 21, FAIL 0, SKIP 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "pnpm check:pr exits 0 on the final state and no budget, threshold or gate script was edited since the phase base"
    requirement: WX-01
    verification:
      - kind: other
        ref: "pnpm check:pr (ran 16 of 17 steps, exit 0); git diff --name-only 9b44e6b5 -- scripts AGENTS.md vitest.config.ts stryker.react.mjs .oxlintrc.json is empty"
        status: pass
    human_judgment: false
  - id: D3
    description: "mutation comparison clean against a fresh report: none of the six files, nor the aggregate over exactly those six, below its base"
    requirement: WX-05
    verification:
      - kind: other
        ref: "Task 3 node comparison, cmp_exit=0, from a Stryker report newer than every packages/react/src and test file"
        status: pass
    human_judgment: false
duration: 25min
completed: 2026-11-11
status: complete
---

# Phase 28 Plan 05: Record the split and prove the gate Summary

**Outcome A recorded in ADR-QD-140 (with ADR-QD-111 and ADR-QD-080 amended) and CCR-QD-418, and the merge gate proven: `pnpm check:pr` exits 0, every one of the six baselined files and the aggregate at or above base.**

## Performance

- **Duration:** about 25 min (the two `pnpm check:pr` runs and two Stryker runs dominate)
- **Completed:** 2026-11-11T22:30Z
- **Tasks:** 3
- **Files modified:** 12 (3 created)

## Accomplishments

- **ADR.** `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md` (slug as planned; Rev 1.0). It quotes the human's recorded reason, states the correction to the review's option A (the registry types in `GateRegistry.ts` would publish `gateWriterFor`, or, with the class kept private, close a cycle madge counts), and lists the edge list after the split. ADR-QD-111 and ADR-QD-080 each gained a `## Amendment (2026-11-11, CCR-QD-418, ARCH-76)`; their Status rows, in the documents and in `index.yaml`, read `amended by ADR-QD-140`. The ADR-111 amendment names every place the ADR put a hook in `GateWriter.ts` (the `GateScopeContext` bullet and D-49-a, the `useGates` bullet and D-49-b, D-49-c, the import-rule bullet, the first alternative).
- **Current-state text.** INV-QD-046's Source and behaviour 28's one-hook paragraph name `useGate.ts`; the invariant and behaviour themselves are unchanged (D-04). ADR-QD-103's "one-element case" sentence is kept and followed by a dated note that `useGateRegistration` was removed.
- **Traceability.** `GateWriter.test.tsx`'s row names `useGateRegistrations` (28-02 did the word; this plan reworded the row), a `GateWriter.reconcile.test.ts` row (BEH-QD-068, BEH-QD-233, INV-QD-064, ADR-QD-140), ADR-QD-140 added to the useGates and kinds rows, an ADR-QD-140 row in the decisions section, and ADR-QD-111's row notes the amendment.
- **Register and changeset.** CCR-QD-418 (every non-`.planning` file the phase changed, the outcome and who chose it, the correction, red-first commit, numbers); `.changeset/gate-write-side.md` (`@qadi/react` patch).
- **Gate.** `pnpm check:fast` exit 0; `pnpm check:pr` exit 0 twice (before the mutation work and again after the one test added, `ran 16 of 17 steps; "pnpm mutation" was skipped`); no gate script, budget or threshold edited since the phase base.

## Mutation comparison (WX-05)

Fresh Stryker run (`stryker.react.mjs --mutate` the six files), newer than every file under `packages/react/src` and `packages/react/test`; comparison exit 0, no `missing`, `DROP`, `unbaselined`, `stale`, `no phase base` or `base missing/extra`.

| File | Base | After |
| ---- | ---- | ----- |
| `GateWriter.ts` | 0.8261 | 0.9796 |
| `GateRegistry.ts` | 0.9643 | 0.9643 |
| `useGate.ts` | 0.8000 | 0.8243 |
| `QadiProvider.tsx` | 0.7500 | 0.7500 |
| `hooks.ts` | 0.8065 | 0.8065 |
| `MissingQadiProviderError.ts` | 0.4000 | 0.4000 |
| `__aggregate__` | 0.8239 | 0.8502 |

`GateWriter.ts` rose because it now holds only the write side and `reconcile`, whose rules `GateWriter.reconcile.test.ts` pins. `useGate.ts` rose even though the hooks moved in.

## Task Commits

1. **Task 1: ADR-QD-140, the ADR-111 and ADR-080 amendments, the ADR-103 note, traceability** - `2d575c8e` (docs)
2. **Task 2: CCR-QD-418 and the changeset** - `95f196b4` (docs)
3. **Task 3: mutation fallout test** - `8fbd9f58` (test); **mutation scores** - `97162779` (chore)

## Decisions Made

- The reserved numbers: used ARCH-76, ADR-QD-140, CCR-QD-418; unused BEH-QD-475..479 and INV-QD-300..301 (behaviour unchanged, D-04). Recorded in the CCR row.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in the safety net] Stale-handle `update` was unpinned; added one test**
- **Found during:** Task 3 (first mutation comparison)
- **Issue:** the comparison reported `DROP packages/react/src/GateRegistry.ts` (0.9643 to 0.9464). The file is untouched by the phase; one more mutant survived (113:13, `!live || existing === undefined` mutated to `!live && existing === undefined`). It is a real behaviour, not an equivalent mutant: once `unregister` frees a key, a same-id re-registration reuses it, so a stale handle's `update` is stopped only by that handle's own `live` flag. Only the `unregister` side of that was tested. Which earlier test used to catch it was not determined: the redistribution of tests between `GateWriter.ts` and `useGate.ts` is the likely cause.
- **Fix:** `GateRegistry.store.test.ts`: "a stale handle's update after a same-id re-registration does not touch the new entry". No ignore, threshold or baseline change.
- **Files modified:** `packages/react/test/GateRegistry.store.test.ts`
- **Verification:** the test passes; fresh Stryker: `GateRegistry.ts` 0.9643 (54 killed of 56), then the comparison exit 0; `pnpm check:pr` re-run after it, exit 0.
- **Committed in:** `8fbd9f58`

**2. [Process] Task 1's `pnpm spec:verify:strict` failed once, transiently**
- The `CCR register coverage` row reports `418` as drift from the script's known-gaps list until the register row exists, and the plan puts that row in Task 2. Task 1's other checks and `pnpm spec:examples` were green and Task 1 was committed; the row landed in Task 2's commit and `pnpm spec:verify:strict` has been green (PASS 21, FAIL 0, SKIP 0) at every commit from there. No script was edited.

**3. [Process] `spec-revise` run once too many on the new ADR**
- `node scripts/spec-revise.mjs` on the brand-new ADR-QD-140 bumped it to 1.1 with a duplicate "Initial" entry; the document was restored to Rev 1.0 with its single entry before any commit (a new document is not a revision of itself). `node scripts/spec-revise.mjs --check` is green.

**Total deviations:** 3 (1 auto-fixed test, 2 process notes). **Impact:** none on behaviour, scope or any gate.

## Issues Encountered

None beyond the deviations.

## Known Stubs

None.

## Threat Flags

None. T-28-09 (misstating the human's choice): the ADR quotes row 28-01 T1 and `d01_reason` and the register row repeats them. T-28-10 (a regression past per-plan checks): `pnpm check:pr` exit 0 on the final state, and the second verify (no gate script, budget or threshold edited since the phase base) is empty.

## Self-Check: PASSED

- FOUND: spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md, .changeset/gate-write-side.md, 28-mutation-after.json.
- FOUND commits (ancestors of HEAD): 2d575c8e, 95f196b4, 8fbd9f58, 97162779; `git rev-list --count f41a89e3..HEAD` gave 4.

## Next Phase Readiness

All five plans of phase 28 are done; ready for phase verification.

---
*Phase: 28-gate-registry-dependency*
*Completed: 2026-11-11*
