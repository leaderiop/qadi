---
phase: 23-sink-record-fields
plan: 04
subsystem: spec
tags: [adr, spec, traceability, changeset, mutation, merge-gate, sink-record]

requires:
  - phase: 23-sink-record-fields
    provides: "23-01's measured decision (A, keys absent), 23-02's leaf and derived wire, 23-03's one projection"
provides:
  - "ADR-QD-135 with the human's words, the bench and the measured cost; ADR-QD-095 amended"
  - "BEH-QD-450, BEH-QD-451, INV-QD-290, traceability rows, CCR-QD-413, AGENTS.md section 7 paragraph"
  - "the @qadi/core patch changeset naming what a sink now sees"
  - "pnpm check:pr green and a per-file mutation comparison that never falls below the base"
affects: []

actuals:
  tokens: 69500
  tasks: 3
  commits: 4
plan_head_before: a9eabf7d32248e3a5830c5c194921c2b52cb04d6
plan_head_after: d9d13760200e79731cbf3bc98fb2128e540ca8a2

tech-stack:
  added: []
  patterns:
    - "an equivalent-mutant source of a per-file score drop is fixed by deleting the redundant code, not by an ignore or a test pinning key order"

key-files:
  created:
    - spec/decisions/135-sink-record-fields-stated-once.md
    - .changeset/sink-record-fields.md
    - .planning/phases/23-sink-record-fields/23-mutation-after.json
  modified:
    - spec/decisions/095-sinkcodec-owns-both-directions.md
    - spec/decisions/index.yaml
    - spec/behaviors/25-inspection.md
    - spec/behaviors/24-decision-sink.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - AGENTS.md
    - packages/core/src/SinkCodec.ts

key-decisions:
  - "ADR file is 135-sink-record-fields-stated-once.md, not the plan's longer slug, because SinkRecordFields.ts (23-02) already links that exact path"
  - "rebuild strips only version: _tag and the wire's outcome were redundant strips whose mutants survived and dragged SinkCodec.ts under its base score"
  - "ADR-QD-100 is left as history; its failedRecord/decidedRecord naming is stated as stale in ADR-QD-135's Consequences, and the BEH-QD-183 and BEH-QD-195 notes are corrected"

requirements-completed: [SREC-01, SREC-02, SREC-03, SREC-04, SREC-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06]

coverage:
  - id: D1
    description: "ADR-QD-135, the ADR-QD-095 amendment, AGENTS.md section 7, BEH-QD-450/451, INV-QD-290 and the traceability rows record the A/absent outcome with its numbers"
    requirement: WX-02
    verification:
      - kind: other
        ref: "pnpm spec:verify:strict (21 pass); node scripts/spec-revise.mjs --check; pnpm spec:examples (108 compile)"
        status: pass
    human_judgment: false
  - id: D2
    description: "CCR-QD-413 lists every file the phase changed, the numbers used and unused, and the RED-first commits; the changeset is an @qadi/core patch"
    requirement: WX-06
    verification:
      - kind: other
        ref: "grep -cF '| CCR-QD-413 |' spec/README.md is 1; pnpm spec:verify:strict CCR register coverage"
        status: pass
    human_judgment: false
  - id: D3
    description: "No public name added or removed: spec/overview.md unchanged and the API surface gate passes"
    requirement: WX-03
    verification:
      - kind: other
        ref: "pnpm spec:api (900 exports documented); git diff <base>..HEAD -- spec/overview.md is empty"
        status: pass
    human_judgment: false
  - id: D4
    description: "pnpm check:pr exits clean (16 of 17 steps; mutation is the one skipped by design) with no budget, threshold, ignore or gate script edited since the base"
    requirement: WX-01
    verification:
      - kind: other
        ref: "pnpm check:pr (core coverage 99.46% statements, 97.59% branches; 4518 core tests, 568 + 42 more); git diff <base> -- scripts vitest.config.ts stryker.config.mjs .oxlintrc.json is empty"
        status: pass
    human_judgment: false
  - id: D5
    description: "No touched file's Stryker score fell below 23-mutation-base.json (per file)"
    requirement: WX-05
    verification:
      - kind: other
        ref: ".planning/phases/23-sink-record-fields/23-mutation-after.json against 23-mutation-base.json (node comparison from the plan, 'compare ok')"
        status: pass
    human_judgment: false
  - id: D6
    description: "ADR-QD-135 reflects the owner's choice and the measured 5 to 10 percent small-record encode cost fairly"
    verification: []
    human_judgment: true
    rationale: "The accepted encode cost and the phrasing of a design decision are the owner's to judge; the numbers are copied from 23-01 and 23-02 but whether the trade is described acceptably is not testable"

duration: 35min
completed: 2026-11-11
status: complete
---

# Phase 23 Plan 04: Sink record fields stated once, recorded and gated Summary

**ADR-QD-135, BEH-QD-450/451, INV-QD-290, CCR-QD-413 and a patch changeset record the one-statement sink record (A, absent keys, wire byte-identical), and `pnpm check:pr` is green with every touched file's mutation score at or above its base.**

## Performance

- **Duration:** about 35 min (the start was not captured at the first command; taken from the first Stryker log)
- **Completed:** 2026-11-11
- **Tasks:** 3
- **Files modified:** 11 (one src, nine spec and doc, one changeset), plus the mutation-after record

## Accomplishments

- **ADR-QD-135** (Document ID `QADI-ADR-135`, in `index.yaml`): the five statements and the scratch-mutation evidence (the old suite caught all three), the owner's words quoted from `_DECISIONS-v1.2.md`, 23-01's construction bench (A within noise of today at 0.093 to 0.098 us, B 5.3x to 140x), the leaf and import rule, `project`/`rebuild`, the `SinkRecordTag` result (derived, `pnpm circular` clean), the absent-key convention, the byte-identical wire with no version moved, and 23-02's measured cost (evaluation +2.8 and +4.0 percent, noise; small-record `encodeSinkRecord` 5 to 10 percent slower, 0.19 to 0.36 us, accepted).
- **ADR-QD-095** gained a dated amendment (Rev 1.6); **AGENTS.md section 7** gained one paragraph naming the sink record envelope the second schema-first exception, with no budget table or count touched.
- **BEH-QD-450** (envelope is its fields plus a version) beside BEH-QD-199; **BEH-QD-451** (an absent optional is an absent key) in `24-decision-sink.md`, linked from BEH-QD-183; **INV-QD-290** appended; INV-QD-096's Enforcement names the every-shape round trip, the key pins and the emitted-record round trip. Every doc was revised with `spec-revise`.
- **Traceability:** ADR-QD-135, INV-QD-290 and `SinkRecord.tst.ts` rows, and the INV-QD-096, behaviour-24/25, `SinkCodec.test.ts`, `DecisionSink.test.ts` and `Errors.tst.ts` rows updated.
- **CCR-QD-413** (one row) and **`.changeset/sink-record-fields.md`** (`@qadi/core` patch; says the wire is unchanged and what a sink sees).

## Merge gate result

`pnpm check:pr` ran 16 of 17 steps and none failed (the skipped one is `pnpm mutation`, as `check:pr` is derived to do): typecheck, lint with the house-style budgets, circular, tstyche, coverage (core 99.46 percent statements, 97.59 branches, 99.31 functions, 99.72 lines; 4518 core tests), BDD, doc examples, `spec:verify:strict` (21 pass), the DoD table, devtools claims, API surface (900 exports documented, `spec/overview.md` unchanged), package install, the example app, website examples, the website build and publish status. No file under `scripts/`, no vitest or Stryker config and no `.oxlintrc.json` changed since the phase base, and AGENTS.md's diff has no budget or table line.

## Per-file mutation (base to after, WX-05)

Stryker was run with 23-01's command and the leaf added to `--mutate`. The plan's comparison script ("compare ok") passes.

| File | Base | After |
| ---- | ---- | ----- |
| `SinkCodec.ts` | 0.9132 | 0.9278 |
| `DecisionRecord.ts` | 1.000 | 1.000 |
| `SinkEmit.ts` | 1.000 | 1.000 |
| `Lifecycle.ts` | 1.000 | 1.000 |
| `SinkRecordFields.ts` | (new) | no mutants (module-scope constants, `ignoreStatic`) |
| `EvaluationMetrics.ts`, `SinkWire.ts` | 1.000 | no mutants |

The first run left `SinkCodec.ts` at 0.9126, just under the base (167 of 183 against 200 of 219). Of its 16 survivors, three were new and equivalent: `rebuild`'s `Struct.omit(wire, ["_tag", ...])` and `"outcome"` strips changed no record. `Data.TaggedClass` assigns its own `_tag` after its arguments and the rebuilt outcome replaces the wire's, so stripping either only moves a key's position. The redundant strips were deleted (`4537f801`); the doc comment says why. No ignore, threshold or key-order pin was added.

## Reserved numbers

- **Used:** ADR-QD-135, CCR-QD-413, BEH-QD-450, BEH-QD-451, INV-QD-290.
- **Unused:** BEH-QD-452 to BEH-QD-454, INV-QD-291.
- INV-QD-290 had been reserved by CCR-QD-409 (wave 6, Phase 19) and listed there as unused (INV-QD-290 to 294); CCR-QD-413 says it was re-reserved for v1.2 and is used here.

## SREC and WX traceability

| Requirement | Where |
| ----------- | ----- |
| SREC-01 (measured decision) | 23-01 bench, ADR-QD-135 |
| SREC-02 (one statement) | `3fd471c7`, `ec35e4cc`; BEH-QD-450, INV-QD-290 |
| SREC-03 (field-drop protection) | `9480a6bb` every-shape round trip; INV-QD-290 |
| SREC-04 (one projection, derived tag) | `0c68689c`, `3a9bca43`, `ec35e4cc`; BEH-QD-451 |
| SREC-05 (wire unchanged) | goldens untouched; ADR-QD-135 |
| WX-01 | `pnpm check:pr` |
| WX-02 | ADR-QD-135, CCR-QD-413, BEH/INV/traceability |
| WX-03 | `pnpm spec:api`, overview unchanged |
| WX-04 | no budget, gate script or forbidden construct changed |
| WX-05 | coverage thresholds held; per-file mutation table above |
| WX-06 | RED-first commits `9480a6bb`, `3e014f96`, named in CCR-QD-413 |

## Task Commits

1. **Task 3 fix (mutation, src):** `4537f801` (refactor) - `rebuild` strips only `version`
2. **Task 1:** `40f96845` (docs) - ADR-QD-135, ADR-QD-095 amendment, AGENTS.md section 7, BEH-QD-450/451, INV-QD-290, traceability
3. **Task 2:** `4394d511` (docs) - CCR-QD-413 and the changeset
4. **Follow-up:** `d9d13760` (docs) - name the command beside "gate 13" (the DoD table gate refused the bare number)

**Plan metadata:** the `docs(23-04)` SUMMARY commit and the STATE/ROADMAP commit that follows it.

## Files Created/Modified

- `spec/decisions/135-sink-record-fields-stated-once.md` - the decision record
- `spec/decisions/095-sinkcodec-owns-both-directions.md`, `spec/decisions/index.yaml` - amendment (Rev 1.6) and index entry
- `spec/behaviors/25-inspection.md`, `spec/behaviors/24-decision-sink.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md` - behaviours, invariant, rows and register
- `AGENTS.md` - section 7's second schema-first exception
- `.changeset/sink-record-fields.md` - `@qadi/core` patch
- `packages/core/src/SinkCodec.ts` - the redundant strips removed from `rebuild`
- `.planning/phases/23-sink-record-fields/23-mutation-after.json` - per-file scores after

## Decisions Made

- The ADR file is `135-sink-record-fields-stated-once.md`. The plan's slug differs, but 23-02's `SinkRecordFields.ts` already links this path and the plan says the slug follows the title; the Document ID, index entry and the plan's greps are unaffected.
- ADR-QD-100 is left as history. Its text still names `failedRecord` and `decidedRecord`; ADR-QD-135 says so under Consequences rather than editing a record of what was true then. The two behaviour notes (BEH-QD-183, BEH-QD-195) are live claims and were corrected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `SinkCodec.ts`'s mutation score fell 0.0006 under its base**
- **Found during:** Task 3 (per-file mutation comparison)
- **Issue:** three equivalent surviving mutants in `rebuild`'s `Struct.omit` string literals (`_tag`, `outcome`) from 23-02's code.
- **Fix:** removed the two redundant strips and documented why in `rebuild`'s doc comment.
- **Files modified:** `packages/core/src/SinkCodec.ts`
- **Verification:** `SinkCodec` tests (158) pass, `tsc -b packages/core` clean, Stryker re-run: 0.9278; later `pnpm check:pr` green.
- **Committed in:** `4537f801`

**2. [Rule 3 - Blocking] `pnpm check:fast` refused a bare "gate 13" in ADR-QD-135**
- **Found during:** Task 3
- **Issue:** `check-dod-table.mjs` requires a gate number to name its command.
- **Fix:** "gate 13 (`pnpm spec:api`)" in ADR-QD-135 and CCR-QD-413.
- **Committed in:** `d9d13760`

### Plan shape

- Task 3's src fix was committed before Tasks 1 and 2 because Stryker ran first. Task 1's `spec:verify:strict` verify needed the CCR-QD-413 row (Task 2) to pass, so both were authored together and committed in the plan's order.
- The `pnpm check:fast` run used for the early check stopped at `spec:gates` (fix 2 above); the full `pnpm check:pr` afterwards passed.

**Total deviations:** 2 auto-fixed (1 mutation-score bug, 1 gate wording). **Impact on plan:** none on scope.

## TDD Gate Compliance

Not a TDD plan (`type: execute`). WX-06's RED-first evidence is 23-01's `9480a6bb` and 23-03's `3e014f96`, named in CCR-QD-413.

## Known Stubs

None.

## Threat Flags

None. T-23-12 to T-23-14: the ADR copies the owner's words and the bench tables verbatim from the 23-01 and 23-02 SUMMARYs; the changeset and BEH-QD-451 state the absent-key change; no gate script, threshold, ignore or budget table was edited.

## Issues Encountered

- The plan's slug and the leaf's existing ADR link disagreed (see Decisions Made).
- The start time was not captured, so the duration is an estimate.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 23 is complete: four of four plans summarised, `pnpm check:pr` green, wire byte-identical, no public name added. The branch carries a `@qadi/core` patch changeset; no release was run.

## Self-Check: PASSED

Checked: `spec/decisions/135-sink-record-fields-stated-once.md`, `.changeset/sink-record-fields.md` and `23-mutation-after.json` exist; commits `4537f801`, `40f96845`, `4394d511`, `d9d13760` are ancestors of HEAD; `grep -cF '| CCR-QD-413 |' spec/README.md` is 1; `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict`, `pnpm spec:examples`, `pnpm spec:api` and `pnpm check:pr` green; the per-file mutation comparison passes; `git status` shows only the orchestrator's `.planning/config.json` and `.planning/state.json`.

---
*Phase: 23-sink-record-fields*
*Completed: 2026-11-11*
