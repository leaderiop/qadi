---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
plan: 08
subsystem: spec
tags: [behaviours, invariants, traceability, ccr, arch-96]
phase_base: 76330fbd24b7aadcfc65bc78e5053f9690cc6227
plan_head_before: 83c865e503138e092efa41ced5aa67a300eaa504
plan_head_after: f9d2c3f58579aceed757fa86df497a1b063e40bf
commits: 2
requires: [49-07]
provides:
  - "BEH-QD-581 to BEH-QD-585 in spec/behaviors/28-devtools-screens.md, each with ADR-QD-162, a REQUIREMENT block and a Pinned by paragraph naming existing test files"
  - "BEH-QD-465 amended (the eighth store, the count as ADR-QD-162 states it, the two listing lines), BEH-QD-217 corrected (the dock subscribes), BEH-QD-327 lists readonly gates: GateRegistry"
  - "INV-QD-343 and INV-QD-344 with Source, Implication, Enforcement and Related"
  - "traceability: section 1 range and sources, section 2 rows, section 3 ADR-QD-162 invariants and BEH links, section 4 three new test rows and eight extended rows"
  - "CCR-QD-440 closed: Used: ARCH-96, ADR-QD-162, CCR-QD-440, BEH-QD-581..585, INV-QD-343..344. Unused: none."
affects: [49-09]
key-files:
  created: []
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/09-react.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "The five BEH records stay at five (vocabulary; Unrecognised; one moment; the registry as an input; the prop and the feed), the reserved range"
  - "The new listings are ts fences, not compiled: makeDockModel and the views are package-private (ADR-QD-099), as BEH-QD-465's listing already is"
  - "No edit to AGENTS.md or spec/devtools-spec/: both re-read and still true (see Review)"
metrics:
  duration: "about 25 minutes"
  tasks: 2
  files: 5
status: complete
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase 49 Plan 08: BEH-QD-581..585, INV-QD-343..344 and CCR-QD-440 closed Summary

Five behaviours, two invariants and the matrix rows now say what the code does since 49-03 to 49-07: the gate states stated once in core, and the gate registry the dock model's eighth store, with the CCR-QD-440 row closed on its Used/Unused sentence.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 | `1435edbe` docs(49-08): BEH-QD-581 to 585, the gate states and the gate registry as the dock model's eighth store | `spec/behaviors/28-devtools-screens.md` (Rev 1.24), `spec/behaviors/09-react.md` (Rev 3.8) |
| 2 | `f9d2c3f5` docs(49-08): INV-QD-343 and INV-QD-344 traced, and CCR-QD-440 closed | `spec/invariants.md` (Rev 1.139), `spec/traceability.md` (Rev 1.204), `spec/README.md` (Rev 1.221) |

Both carry the `Co-Authored-By: Claude Sonnet 5.5` trailer as their last line.

## Verification

- Task 1: `pnpm spec:examples`, `spec-revise.mjs --check`, `pnpm spec:claims`, `pnpm lint` exit 0; the plan's section check printed `five behaviours, three notes, anchors kept` against the committed tree.
- Task 2: `pnpm spec:verify:strict` (21 PASS, 0 FAIL, 0 SKIP), `spec-revise.mjs --check`, `pnpm spec:examples`, `pnpm spec:gates`, `pnpm spec:claims`, `pnpm spec:api` and `pnpm lint` each exit 0.
- **`pnpm check:pr < /dev/null`: exit code 0.** 16 of 17 steps ran; the run reports `"pnpm mutation" was skipped (release PRs run it)`, which `check:pr` does by construction. The last step, `pnpm spec:publish`, reported 9 packages and 6 documents agreeing on version 0.12.0.

## Review

AGENTS.md section 13 and `spec/devtools-spec/02-screens.md` (`:400-420`) were re-read against the change, and neither needs an edit.

- AGENTS.md section 13's guard-registry bullet says a guard may record that it exists, what it renders now and where, never a retained verdict, and that nothing in the registry can affect what one renders. The registry still holds exactly that: `GateRegistryLike` is `{ instances, subscribe }` over guard instances, and the new `questions` store holds guards and questions, never a verdict (BEH-QD-583 says so). The bullet also says "No module-scope state is left", and the model's subscription lives in a scope with a finalizer, not at module scope. The bullet does not say who subscribes to the registry, so the move from the host to the dock model contradicts nothing in it. "Instrumentation off means absent" holds: a dock handed no registry subscribes to nothing and the gates view is `Absent` (BEH-QD-584).
- `02-screens.md:405-418` says `atoms.gates` lists the guards under their question with what each rendered, and that the lens points at them in both directions. All three remain true: `atoms.gates` is still the registry, the panel still lists the guards under their question (now from one snapshot), and the lens is unchanged. It does not say who subscribes either.

No dated note was needed, so CCR-QD-440 names neither document as changed.

## Deviations from Plan

None - plan executed exactly as written.

Two judgement calls inside the plan's intent, neither a deviation:

- BEH-QD-583 records the questions store's `DockModel` field as `Pick<ExternalStore<QuestionsSnapshot>, "subscribe" | "getSnapshot">`, the form the code uses, and BEH-QD-465's listing carries the same line.
- The INV-QD-343 enforcement names the torn-join negative control as 49-04's SUMMARY records it: a cache of the instances refreshed only by poll-triggered joins, which fails P2. The plan's own wording of the control was a no-op against this store, as 49-04 noted.

## Known Stubs

None.

## Threat Flags

None. Spec text only; no endpoint, auth path or schema changed.

## Self-Check: PASSED

- FOUND: spec/behaviors/28-devtools-screens.md, spec/behaviors/09-react.md, spec/invariants.md, spec/traceability.md, spec/README.md
- FOUND: commits `1435edbe` and `f9d2c3f5` (ancestors of HEAD)
- Every `Pinned by` path in BEH-QD-581..585 exists on disk (the plan's check).
- Ids used: ARCH-96, ADR-QD-162, CCR-QD-440, BEH-QD-581..585, INV-QD-343..344; no placeholder id.
