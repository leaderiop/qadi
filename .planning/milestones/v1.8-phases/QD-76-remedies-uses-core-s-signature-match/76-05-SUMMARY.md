---
phase: QD-76-remedies-uses-core-s-signature-match
plan: 05
subsystem: devtools
tags: [remedies, fixture-judgement, agreement, custom-predicate, single-source-sentence]
phase_base: bf339146723bd1eabd1f08dd94f489d8480027ef
plan_head_before: c4dad3e6581737ae20131bfef7d8d7d1ae9770f5
plan_head_after: 6beca815d1b2480e1dd18e04ec8a4a5829f7133b

requires: ["76-04"]
provides:
  - "remedyEdits decides signature and acted requirements by core's signatureAnswerFromSignatures and actedAnswerFromEvents"
  - "remedyEdits is total: a refused fixture row or site subject is skipped with the port's refusal, never offered a row, never thrown"
  - "NO_CUSTOM_PREDICATE_FIELD: the custom-predicate sentence, owned by SimulationFields.ts, read by the field table, the remedy table and both tests"
affects: [76-06, 76-07, 76-08]

actuals:
  tokens: 45000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "the remedy table asks core whether a fixture row meets a leaf instead of restating the port's scoping and match"
    - "one module-scope Match.tagsExhaustive dispatcher turns either judgement's failure into a skip sentence"

key-files:
  created: []
  modified:
    - packages/devtools/src/model/Remedies.ts
    - packages/devtools/src/model/SimulationFields.ts
    - packages/devtools/test/model/SimulationFields.test.ts
    - packages/devtools/test/model/Remedies.test.ts

key-decisions:
  - "FIXTURE_DATA.CustomPredicate takes the remedy table's sentence ('no form field; run against Snapshot or Live'), as the plan says; the field table's older sentence is gone and its test row asserts the new one"
  - "The FIXTURE_DATA doc comment's phrase 'no small typed value' became 'no value', because the plan's verify greps for the old sentence's words in that file"

requirements-completed: []  # SIGM-02 and SIGM-04 are held by this plan but stay Pending: only 76-08 marks SIGM rows

duration: about 20 min
completed: 2026-11-23
status: complete
---

# Phase 76 Plan 05: The remedy table asks core, and the custom-predicate refusal is one sentence

The `Signature` and `Acted` arms of `Remedies.ts` now read `signatureAnswerFromSignatures` and `actedAnswerFromEvents` at the form's site, so the `Any`-scope divergences close and a check the port refuses is skipped with its refusal. The custom-predicate sentence is one exported value, `NO_CUSTOM_PREDICATE_FIELD`.

## Accomplishments

- `Remedies.ts`: shared `SIGNATURE_PORT_REFUSED`, `HISTORY_PORT_REFUSED`, a three-arm `skipReason` (`Match.tagsExhaustive` over `MissingResourceId | SignatureHistoryUnavailable | DecisionHistoryUnavailable`, each message through `thrownMessage(failure.cause)`) and `siteOf` (`subjectOf(input.subject)` plus the resource).
- `Signature` arm: met is core's answer over `fieldOps("signatures").elements(input)`; an unmet leaf is one `AddSignature` row whose resource id comes from `signatureHistoryPort.asks.HasSignature(leaf, site)`. The inline `held.*` comparisons are gone (the inline-match grep finds nothing in `packages/devtools/src`). `sameSignature` is untouched and the arm comment keeps the line between the port's match and the form's full equality.
- `Acted` arm: `Acted` is no row; `NotActed` with a usable resource id is one `AddEvent` row; `NotActed` without one, and `MissingResourceId`, are skipped with `the check names no resource id`; a refusal is skipped with the history sentence. `HistoryScope` left the imports; the `Requirement` variants carry the leaf itself.
- `remedyEdits` doc paragraph says set membership is syntactic for roles, permissions and edges, core's answer for events and signatures, that a refused check is skipped and never thrown, and names the two agreement tests.
- `SimulationFields.ts` exports `NO_CUSTOM_PREDICATE_FIELD: NoFormVocabulary`; `FIXTURE_DATA.CustomPredicate` is that value; `Remedies.ts`'s `Custom` arm reads its `reason`; `CUSTOM_HAS_NO_FIELD` is deleted.
- `SimulationFields.test.ts` asserts the sentence once, against the export, and a new row asserts the cell is the export by identity and that `remedyEdits(hasCustom("isOwner"), ...)` skips with its reason.

## Measured facts for later plans

| Item | Value |
| ---- | ----- |
| devtools project | 1775 tests, 1775 passed, 0 failed (1774 + the one new row) |
| the 8 red rows | all 8 green by source change alone: signature agreement 7 of 7, acted agreement 7 of 7 (after Task 1 the failures were exactly the 4 acted site rows and 2 acted refusal rows, 6 of 1774) |
| agreement check | `3 frozen and 3 append-only file(s) hold the statements of 22d5b10c` after every task |
| custom-sentence scan | `git grep -nE "a custom predicate.s answer has no" -- packages ":!*.md"` = 2 lines: `SimulationFields.ts:558` and `SimulationFields.test.ts:142` (4 at the base) |
| `Remedies.test.ts` diff from `phase_base` | 2 insertions, 1 deletion: `+import { NO_CUSTOM_PREDICATE_FIELD } from "../../src/model/SimulationFields.ts";` after the `Remedies.ts` import, and `-    const reason = "a custom predicate's answer has no form field; run against Snapshot or Live";` becomes `+    const reason = NO_CUSTOM_PREDICATE_FIELD.reason;` |
| api-surface | `940 export(s) documented across 9 package(s)` (unchanged; the new export is outside the devtools barrel) |
| house-style | `584 file(s) clean (3 declared switch(es), 74 type-test file(s))` |
| madge | no circular dependency |
| core | `git diff --quiet <start-76-05> HEAD -- packages/core` holds |

## Task Commits

1. **Task 1 (tracer): the signature remedy asks core** - `c2d3396f` (fix) - `Remedies.ts`.
2. **Task 2: the acted remedy asks core** - `c74fb9c6` (fix) - `Remedies.ts`.
3. **Task 3: the custom-predicate refusal is one sentence** - `6beca815` (refactor) - four files.

Each task's `<verify>` one-liner was extracted verbatim from the plan and run unchanged after its commit: all three passed (`the signature remedy asks core`, `the acted remedy asks core`, `the custom refusal is one sentence`). The tracer was re-run end to end before expanding.

## Deviations from Plan

**1. [Rule 3 - Blocking, verification-driven doc edit] FIXTURE_DATA's doc comment**
- **Found during:** Task 3
- **Issue:** the plan's verify refuses any remaining `no small typed value` in `SimulationFields.ts`, and the `FIXTURE_DATA` doc comment (not named by the plan as changing) contained that phrase.
- **Fix:** reworded to "there is no value a reviewer could type in that stands for arbitrary registered logic"; meaning unchanged.
- **Files modified:** `packages/devtools/src/model/SimulationFields.ts`
- **Commit:** `6beca815`

**2. [Verification-only] the plan head ledger**
- the plan-head ledger did not exist (no ledger was written before the first commit); `plan_head_before` is the HEAD recorded in `$TMPDIR/qd76/start-76-05`, and `git rev-list --count` over it reads 3.

**3. [Line width] Two doc lines reflowed**
- The `remedyEdits` doc line that kept the old `Attributes ...` text exceeded 90 columns once prefixed; the paragraph was reflowed. No wording of the attribute sentences changed.

**Total deviations:** 1 auto-fixed, 2 verification-only. **Impact:** none on behaviour or scope.

## Known Stubs

None.

## Threat Flags

None. T-76-12, T-76-13, T-76-14 and T-76-26 are mitigated as the plan states: the arms offer a row only on core's unmet answer, skip every failure through `skipReason`, and read core's total judgements, so no form value reaches a throw.

## Issues Encountered

None.

## Next Phase Readiness

76-06 onward can read `Remedies.ts` as the table that asks core; `packages/core` is unchanged by this plan.

## Self-Check: PASSED

Commits `c2d3396f`, `c74fb9c6`, `6beca815` are ancestors of HEAD; the four modified files exist; the three verifies pass on HEAD.
