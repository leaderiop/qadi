---
phase: 19-verdict-presentation
plan: 03
subsystem: spec
tags: [spec, ccr, changeset, merge-gate, INV-QD-006, INV-QD-004]

mutation_baseline:
  packages/devtools/src/model/Gates.ts: 1.0 (19-mutation-base.json)
  packages/devtools/src/model/Inspect.ts: 1.0
  packages/devtools/src/model/Verdict.ts: 1.0
mutation_after:
  packages/devtools/src/model/Gates.ts: 1.0 (44/44)
  packages/devtools/src/model/Inspect.ts: 1.0 (97/97)
  packages/devtools/src/model/Verdict.ts: 1.0 (14/14)

requires: [19-01, 19-02]
provides:
  - "BEH-QD-429 (every panel shows a verdict through one treatment) and BEH-QD-430 (a record's outcome and obligation are read once)"
  - "INV-QD-006 devtools Enforcement note; INV-QD-004 Source note"
  - "CCR-QD-409; .changeset/verdict-presentation.md (@qadi/devtools patch)"
affects: [20]

key-files:
  created:
    - .changeset/verdict-presentation.md
    - .planning/phases/19-verdict-presentation/19-mutation-after.json
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/devtools-spec/02-screens.md
    - spec/README.md

requirements-completed: [VIEW-01, VIEW-02, VIEW-03, VIEW-04]
duration: ~45 min
completed: 2026-11-10
---

# Phase 19 Plan 03: Spec records and the merge gate Summary

**Phase 19 is recorded in the normative spec and `pnpm check:pr` exits 0. BEH-QD-429 and BEH-QD-430 state the one verdict treatment and the one outcome reading. INV-QD-006 gains its devtools Enforcement, and INV-QD-004 a Source note. CCR-QD-409 and a `@qadi/devtools` patch changeset record the visible change.**

## Decisions applied

- `_DECISIONS.md` pre-answers no checkpoint for Phase 19, and this plan raised none.
- **ADR-QD-131 is unused.** The phase makes no decision beyond ADR-QD-047's headless-model split. CCR-QD-409 states this.
- **Numbers.**
  - Used: BEH-QD-429 and BEH-QD-430.
  - Unused: ADR-QD-131, BEH-QD-431..438, and INV-QD-290..294. No new invariant was needed, because the rule is INV-QD-006's.
  - The verify grep confirms that the phase adds none of the unused numbers outside `spec/README.md`.
- **Changeset: patch, not Breaking.**
  - No pending changeset covered verdict colour, so a new `.changeset/verdict-presentation.md` was written.
  - Judged against `@qadi/devtools@0.11.0`, the phase removes no released name. `stateColour`, `statusColor` and `allowOf` were never on the 0.11.0 barrel.
  - `GATE_STATES` and the panels' removal from the barrel is already in `devtools-headless-interface.md`.
  - The barrel diff since the phase base is empty.
  - The changeset names the three visible changes: a Failed guard is amber, a Denied guard is red and bold, and a denied node's mark is red.

## Plan output notes

- **INV-QD-006 had no Enforcement block.** The devtools note was added as an `**Enforcement** (devtools):` paragraph after its Implication.
- **`devtools-spec/02-screens.md`** carries a `0.14 (draft)` revision, which spec-revise cannot parse. It was bumped to 0.15 by hand, as the standing rule says. It gained two statements:
  - §1: every panel's verdict colour comes from `react/VerdictTreatment.ts`.
  - §2: the Inspector and the Simulator read the outcome through `readOutcome`.
- **Both statements are presence claims.** Neither uses a phrase from the gate's claims list (`pnpm spec:claims` = `check-devtools-claims.mjs`), so no Claims-of-absence row was needed.
- **Traceability changes:**
  - Behaviour 28's row gains the two ids and the files `VerdictTreatment.ts`, `Verdict.ts`, `Gates.ts` and `Inspect.ts`.
  - The INV-QD-004 and INV-QD-006 rows name the devtools mechanisms.
  - New rows were added for `VerdictTreatment.test.tsx` and `Inspector.test.tsx`.
  - The `Inspect.test.ts`, `Gates.test.ts` and `QuestionsPanel.gates.test.tsx` rows gain BEH-QD-429/430.

## Deviations

None.

## Commits

- `3b541738` docs(19-03): BEH-QD-429/430, the INV-QD-006/004 notes and the devtools-spec statements
- `39d5642a` docs(19-03): CCR-QD-409 and the @qadi/devtools patch changeset
- docs(19-03): complete plan (this summary and the trackers)

## Gate results

- `node scripts/spec-revise.mjs --check`: pass.
- `pnpm spec:verify:strict`: 21 pass, 0 fail.
- `pnpm spec:examples`: 108 blocks compile.
- `pnpm spec:claims`: 8 claims registered.
- `pnpm spec:gates`: 25 steps match.
- **`pnpm check:pr`: exit 0.** It ran 16 of 17 steps; `pnpm mutation` is skipped by design.
  - Vitest: 172 files and 4454 tests passed, plus suites of 568 and 42 tests.
  - Coverage: all files at 99.46 / 97.64 / 99.31 / 99.72.
- Nothing under `scripts/`, `AGENTS.md`, the vitest or stryker configs, or `.oxlintrc.json` changed since the phase base. No budget, threshold or gate script was edited.
- **Mutation (XC-05):** a scoped Stryker run covered Verdict.ts, Gates.ts and Inspect.ts.
  - Every file is at 1.0, the same as the 1.0 in `19-mutation-base.json`, so there is no drop.
  - The results are in `19-mutation-after.json`.

## Next

Phase 19 is complete. The Phase 20 base is this plan's final commit.
