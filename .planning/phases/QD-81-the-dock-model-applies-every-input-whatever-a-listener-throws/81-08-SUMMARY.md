---
phase: QD-81
plan: 08
subsystem: spec
tags: [spec, behaviours, invariants, traceability, callAll, dock-model, devtools]
requires:
  - phase: QD-81
    provides: ADR-QD-194 and the amendments (81-07), the measured counts (81-06), DL1 to DL17 and the callAll tests (81-02, 81-04)
provides:
  - BEH-QD-741 to BEH-QD-745 and INV-QD-407, INV-QD-408 specified and traced
  - BEH-QD-465, 656, 699, 700, 728, 735 and INV-QD-373, 390 restated; INV-QD-296 and INV-QD-403 corrected
  - CCR-QD-473's row naming each changed document at its new revision
affects: [81-09, 81-10, 81-11]
key-files:
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md
    - spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md
key-decisions:
  - "Decided autonomously: BEH-QD-699 is retitled to four computed stores, so every anchor to it (BEH-QD-465, BEH-QD-700, invariants, ADR-QD-185, traceability) follows the new title"
  - "Decided autonomously: INV-QD-296 and INV-QD-403 named the deleted spread and the dock's own catalogue comparison, so both are corrected in the same change"
  - "Decided autonomously: BEH-QD-700 is restated in one sentence to say the rail, internal to the model, is a fourth derived store outside its list of ten"
requirements-completed: [COLL-04, COLL-06, WX-02, WX-07]
duration: 35min
completed: 2026-11-24
status: complete
commits: 2
plan_head_before: ba992aa115af2fbc38d002a5647e0691c9e29125
plan_head_after: ec05cafc6673482d224d596ecc449ea1a21d6e6c
actuals:
  tokens: 30000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "BEH-QD-741 to BEH-QD-745 and INV-QD-407, INV-QD-408 exist in their files' shapes, cite ADR-QD-194 and each other, and name their tests"
    requirement: COLL-06
    verification:
      - kind: command
        ref: "pnpm spec:verify:strict; node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "BEH-QD-735's counts restated from the measurement (2, 2, 2, 2, 0, 1, 0, 2, 1 and 0), and the step order stated in BEH-QD-741 as the code has it"
    requirement: COLL-04
    verification:
      - kind: command
        ref: "81-check.mjs scan-ids; the task verify's three superseded-phrase refusals"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 08: The listener contract specified Summary

BEH-QD-741 to BEH-QD-745 and INV-QD-407 and INV-QD-408 now state the dock model's listener contract, and every record that described the open window, three derived stores, the spread or the old counts is restated.

## Accomplishments

- **New behaviours** (`spec/behaviors/28-devtools-screens.md` 1.68), each in BEH-QD-735's shape:
  - BEH-QD-741: the seven steps of a `configure`, in order, whatever a listener on any of the ten stores throws; a refused capacity throws first; each step a no-op through its target's guard; an identical `configure` after a throwing one changes nothing. A step table, DL1 to DL11 and M55, M56.
  - BEH-QD-742: the throws surface once after the last step, one value as itself and several as one `AggregateError` in step order, with both messages quoted exactly ("More than one step of the dock's configure threw." and "More than one step of the timeline feed's configure threw."); `callAll` stated once. DL12 to DL14, TF29 and the eight `callAll` tests.
  - BEH-QD-743: the sightings rail is a derived store, built first, with the explorer and the simulation as its two listeners; a record reaches all three whatever a listener throws; a capacity-and-catalogue change publishes it once. DL15, DL16, CR22.
  - BEH-QD-744: the work a status announces (`Reading`, `Starting`, `Running`) starts whatever a listener throws, and the throw is rethrown after; the gates feed forks before it publishes, and a throw on a gates tick's publish is the run's own failure. TF28, TF29, F31, SR6, G49.
  - BEH-QD-745: a `configure` from inside a step decides the end state; a listener that changes the inputs on every notification does not terminate. DL17, TF37.
- **New invariants** (`spec/invariants.md` 1.220): INV-QD-407 (a `configure` leaves no input unapplied) and INV-QD-408 (work a status announces is started), each with `Source`, `Implication`, `Enforcement` and `Related`.
- **Restated records**: BEH-QD-656 (the window is closed, `callAll` named, pinned-by lists the `callAll` file and G49), BEH-QD-699 (retitled four computed stores, the rail first), BEH-QD-700 (the rail is outside the ten), BEH-QD-728 (`try`/`finally` text is `callAll` over the feed's two steps and the dock's seven, pinned-by adds DL1 to DL10), BEH-QD-735 (explorer and simulation 2, not 3; the dock compares nothing of its own), BEH-QD-465 (a dated note, the requirement says a step does nothing on an input that did not move); INV-QD-373 (`callAll` is the one place), INV-QD-390 (four derived stores).
- **Corrected beyond the plan's list**: INV-QD-296 (named the deleted `push` and `spread`) and INV-QD-403 ("compares only its catalogue itself"), with the traceability row of INV-QD-296.
- **Traceability** (1.311): rows for INV-QD-407 and INV-QD-408, the new `DockModel.listeners.test.ts` and `ExternalStore.callAll.test.ts` rows, the section-1 range BEH-QD-731 to 739 and 741 to 745, and the restated rows of `ExternalStore.test.ts`, `TimelineFeed.test.ts`, `DiagnosticsFeed.test.ts`, `GatesFeed.test.ts`, `SimulationSession.runs.test.ts`, `ConfigureRule.test.ts` and `DockModel.characterisation.test.ts`.
- **ADR-QD-194** (1.1) links BEH-QD-741 to 745 and INV-QD-407, 408 (the 81-07 note); ADR-QD-185 (1.7) follows BEH-QD-699's new title.
- **CCR-QD-473's row** in `spec/README.md` (1.388) names each document at its revision; every reserved BEH and INV number is used, none left unused.

## Task Commits

1. Task 1 (tracer): `4a5ae013` docs(81-08): BEH-QD-741 and INV-QD-407, a configure applies every input
2. Task 2: `ec05cafc` docs(81-08): the rest of the listener contract specified, and the restated records

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] INV-QD-296 and INV-QD-403 stated deleted code**
- **Found during:** Task 2 (a search of `spec/` for `spread` and "compares only its catalogue")
- **Issue:** INV-QD-296's Source named `push` and `spread`, and INV-QD-403's said the dock compares its catalogue itself; both are false after the rail and the seven steps.
- **Fix:** restated each in place, and the INV-QD-296 traceability row.
- **Files modified:** `spec/invariants.md`, `spec/traceability.md`
- **Commit:** `ec05cafc`

**2. [Rule 3 - Blocking] The retitle of BEH-QD-699 broke every anchor to it**
- **Fix:** the anchor follows the title in the behaviours file, the invariants, the traceability file and ADR-QD-185 (revised to 1.7); the plan's commit lists gain `spec/decisions/194-...md` and `spec/decisions/185-...md`.
- **Commit:** `ec05cafc`

**3. [Plan wording] Task 2's commit holds six documents, not four**, for the two ADR edits above.

**Total deviations:** 2 auto-fixed, 1 wording. **Impact:** spec text only; no code, test or manifest changed.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`: found, headings `## BEH-QD-741` to `## BEH-QD-745` and `## INV-QD-407`, `## INV-QD-408` present
- commits `4a5ae013`, `ec05cafc`: found on `arch-wave-15`
- `pnpm spec:verify:strict`: 21 passed, 0 failed; `spec-revise.mjs --check` and `81-check.mjs scan-ids`: pass; `81-check.mjs commit` for both subjects: pass
- the three superseded phrases (three computed, the base counts, the open window) are absent from the behaviours file
