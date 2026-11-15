---
phase: QD-44-the-hydration-seed-s-fields-stated-once
verified: 2026-11-15T05:50:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".changeset/react-seed-fields-stated-once.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-01-PLAN.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-01-SUMMARY.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-02-PLAN.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-02-SUMMARY.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-03-PLAN.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-03-SUMMARY.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-04-PLAN.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-04-SUMMARY.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-05-PLAN.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-05-SUMMARY.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-06-PLAN.md"
  - ".planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-06-SUMMARY.md"
  - "packages/react/src/HydrationEngine.ts"
  - "packages/react/src/SeededDecision.ts"
  - "packages/react/test/Hydration.tst.ts"
  - "packages/react/test/HydrationSeedFields.test.ts"
covered_digest: "v4:sha256:d7f6eb0167036cc9cd77eaad8d5504c4bceaf80761851038b3c04440095b56aa"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 44: The hydration seed's fields stated once - Verification Report

**Phase Goal:** Each verdict's seed fields are stated once, derived from core's wire statement, so a field added to the wire's `common` reaches the client's seed without a hand edit in `rebuild`, and the Allow/Deny branch is written once.
**Verified:** 2026-11-15
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | A property test (Decision to entry to SeededDecision keeps every disclosed wire field) is RED on the base under a scratch wire field, then green over the real fields | VERIFIED | `packages/react/test/HydrationSeedFields.test.ts` loops over `encodeDecision`'s own keys (300 runs, fixed seed), with test-local withheld lists, so a new key is checked without being named. Committed in `573f79e9` before any `src` change (`17c77bdc`, `4970ad2f`); the RED run is recorded in the 44-01 SUMMARY (property exit 1, counterexample `expected undefined to deeply equal 'x'`, `DecisionWire.ts` reverted, `git status` clean). I did not re-run the RED myself, because it needs a core rebuild and a temporary edit of core's wire file. The green side I did run: `pnpm exec vitest run --project react` is 34 files and 518 tests passing. The test file also gained a key-set pin (every wire key is classified disclosed or withheld) and an engine-agreement test (`ALLOW_WITHHELD`/`DENY_WITHHELD` equal the test's own lists), so an optional wire field with no fixture cannot ship unclassified. |
| 2 | Each verdict's seed fields are one statement derived from `DecisionWireAllow`/`DecisionWireDeny` minus the withheld fields; `SeededAllow`/`SeededDeny` stay `Data.TaggedClass` (`_tag` `SeededAllow`/`SeededDeny`) typed by it; no hand-written field list in `SeededDecision.ts` or `rebuild` | VERIFIED | `SeededDecision.ts` defines `AllowSeedFields = Schema.Struct({...Struct.omit(DecisionWireAllow.fields, ["_tag", ...ALLOW_WITHHELD]), disclosure})` and `DenySeedFields` the same way. `SeededAllow`/`SeededDeny` are `Data.TaggedClass("SeededAllow"/"SeededDeny")<typeof …SeedFields.Type & {subjectId}>`. `AllowEntry`/`DenyEntry` in `HydrationEngine.ts` are `Schema.TaggedStruct("Allow"/"Deny", …SeedFields.fields)`, the same fields. What remains in `SeededDecision.ts` is the withheld deny-list (names, not fields), which the engine-agreement test pins. `Hydration.tst.ts` passes (9 tests, 32 assertions): the key sets equal the wire's keys minus the withheld ones, plus `disclosure`. |
| 3 | `dehydrateDecision` and `rebuild` are spreads with the one `subjectId` substitution; the Allow/Deny branch is written once for dehydrate, rebuild and agreement | VERIFIED | `rebuild = seedOf(entry.decision, subjectId)`, and the row is `new SeededAllow({...entry, subjectId})` (deny likewise). `dehydrateDecision = entryOf(encodeDecision(decision), includeTrace)` spreads `Struct.omit(wire, …WITHHELD)`. `entryAgrees` calls `claimOf`. One closed table `VERDICTS: {[V in WireVerdict]: Row<V>}` carries entry, seed and claim, so a verdict without a row is a compile error. `grep` for `_tag ===` in `HydrationEngine.ts` finds no Allow/Deny branch; the base had three (`dehydrateDecision`, `rebuild`, `entryAgrees`). |
| 4 | `entryAgrees` still refuses a seed that disagrees with its trace through `decisionDisagreement` (INV-QD-170), existing tests unchanged, and the payload's wire form is byte-identical (golden committed on the base) | VERIFIED (with a recorded, planned deviation) | `entryAgrees` still delegates to core's `decisionDisagreement(claimOf(...), trace)`, with the deny claim `obligations: []` and the reason from the disclosure, as before. The eight-string golden was committed in `573f79e9` on the base, and `git diff 573f79e9 HEAD` on the test file shows the golden section untouched. `HydrationEngine.test.ts` is untouched and passes. Deviation: four test files (`DecisionOutcome`, `DeveloperSignals`, `HydrationEvent`, `SeededQuestion`) each lost one `visibleFields: undefined` line. This is the accepted decision D-03 (`visibleFields` is now an optional key, as on the wire), recorded as **Breaking** in a minor `@qadi/react` changeset and in the 0.13 section of `upgrading.md`. It is not an override, because the criterion's intent (no behaviour change to refusal logic or bytes) holds. |

**Score:** 4/4 truths verified (0 behavior-unverified; none of the truths is a cancellation or ordering invariant).

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/react/src/SeededDecision.ts` | Derived `AllowSeedFields`/`DenySeedFields`, typed classes | VERIFIED | Substantive and wired: imported by `HydrationEngine.ts`, `SeededQuestion.ts`, `DeveloperSignals.ts`. |
| `packages/react/src/HydrationEngine.ts` | `VERDICTS` table, spread `rebuild`/`dehydrateDecision`, `claimOf` in `entryAgrees` | VERIFIED | Substantive, no stubs. |
| `packages/react/test/HydrationSeedFields.test.ts` | Property, byte golden, key-set pin, engine-agreement test | VERIFIED | Passes. |
| `packages/react/test/Hydration.tst.ts` | Type pin of the seed's fields | VERIFIED | `tstyche` passes. |
| `.changeset/react-seed-fields-stated-once.md` | `@qadi/react` minor, Breaking | VERIFIED | Present, and the `upgrading.md` 0.13 entry exists. |
| `spec/decisions/157-…md`, `spec/behaviors/19-hydration.md` (BEH-QD-556), `spec/invariants.md` (INV-QD-333), `spec/traceability.md`, `spec/README.md` (CCR-QD-435), `spec/overview.md`, ADR-QD-078 amendment, `AGENTS.md` section 7 | Records | VERIFIED | Present. Only reserved numbers are used: BEH-QD-556 and INV-QD-333 (557 to 560 and 334 are left unused), ADR-QD-157 and CCR-QD-435; `spec/decisions/index.yaml` lists ADR-QD-157. |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `DecisionWireAllow`/`DecisionWireDeny` (core) | `AllowSeedFields`/`DenySeedFields` | `Struct.omit(….fields, …)` | WIRED |
| `*SeedFields.fields` | payload `AllowEntry`/`DenyEntry` | `Schema.TaggedStruct(tag, fields)` | WIRED |
| `*SeedFields.Type` | `SeededAllow`/`SeededDeny` | class type parameter | WIRED |
| `VERDICTS` rows | `dehydrateDecision`, `rebuild`, `entryAgrees` | `entryOf`, `seedOf`, `claimOf` | WIRED |
| `claimOf` | core `decisionDisagreement` | `entryAgrees` | WIRED |

### Data-Flow Trace (Level 4)

`encodeDecision` (real wire value) to `Struct.omit` spread to the entry, to `JSON` to the decoded `…Entry` schema, to `{...entry, subjectId}` to the seed. The property test walks this end to end, so the data is real and not static. FLOWING.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| React suite | `pnpm exec vitest run --project react` | 34 files, 518 tests passed | PASS |
| Type pins | `pnpm exec tstyche packages/react/test/Hydration.tst.ts` | 9 tests, 32 assertions passed | PASS |
| Typecheck | `pnpm typecheck` | no output, clean | PASS |
| House-style gate | `node scripts/check-house-style.mjs` | 508 files clean, 3 declared switches | PASS |
| API surface (gate 13) | `node scripts/check-api-surface.mjs` | 927 exports documented | PASS |
| DoD table | `node scripts/check-dod-table.mjs` | 25 steps match | PASS |
| Whole merge gate | the orchestrator's `pnpm check:pr < /dev/null` log at HEAD `9e63b00f` | 16 of 16 steps ran with no failure (typecheck, lint, circular, tstyche, coverage, bdd, spec gates, website); coverage `react/src` is 99.54 / 98.03 / 98.61 / 99.49. I read the log and did not re-run it. | PASS |

### Probe Execution

SKIPPED. No probes are declared by this phase.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| HYDF-01 | 44-02, 44-04 | SATISFIED | Truth 2. |
| HYDF-02 | 44-02, 44-03 | SATISFIED | Truth 3. |
| HYDF-03 | 44-01, 44-02, 44-03 | SATISFIED | Truth 1. |
| HYDF-04 | 44-01, 44-03 | SATISFIED | Truth 4. |
| WX-01 | 44-06 | SATISFIED | `pnpm check:pr` exit 0 at HEAD (log reviewed), and the gates re-run here pass. |
| WX-02 | 44-01, 44-04, 44-05 | SATISFIED | Reserved numbers only (ADR-QD-157, CCR-QD-435, BEH-QD-556, INV-QD-333); `scripts/` untouched, so `next-id.mjs` was not used. |
| WX-03 | 44-05 | SATISFIED | Gate 13 passes (927 exports), and `overview.md` is Rev 1.109 with the change history. |
| WX-04 | 44-02, 44-03, 44-06 | SATISFIED | No `switch`, `any`, `!`, `async`/`await`, `console`, `fnUntraced` or `as` casts in the two source files (only `as const`); `scripts/` and `.oxlintrc.json` are untouched, so no budget moved; house-style is clean. |
| WX-05 | 44-01, 44-06 | SATISFIED | Coverage for react is above 90. Stryker: `HydrationEngine.ts` 1 to 1 and `SeededDecision.ts` 0.875 to 0.875 (`44-mutation-base.json` against `44-mutation-after.json`), so no fall. |
| WX-06 | 44-01, 44-02, 44-06 | SATISFIED | The golden and property are committed green on the base (`573f79e9`) before the source edits; the RED for the defect is recorded in the 44-01 SUMMARY. |
| WX-07 | 44-04 | SATISFIED | `@qadi/react` minor changeset marked **Breaking** plus the 0.13 `upgrading.md` entry. Nothing is released. |

No orphaned requirements: all 11 IDs from ROADMAP and REQUIREMENTS.md appear in at least one PLAN's `requirements`, and REQUIREMENTS.md marks them Complete.

### Anti-Patterns Found

None in the phase's changed source (no TODO, FIXME, XXX or TBD, and no stubs). The lint warnings in the `check:pr` log come from untracked `.codex/` hooks and a pre-existing `QadiAtoms.ts` warning, none of them from this phase.

### Notes (non-blocking)

- ROADMAP's Records line says the changeset is "patch: a fix", and the phase shipped **minor, Breaking** under accepted decision D-03 (the optional `visibleFields` key). CONTEXT, the changeset, the upgrade guide and ADR-QD-157 agree with each other, so this is a planning-text drift, not a gap.
- The review's WR-01 (three iterations) is fixed. Info findings IN-01 (plan-local ids in source and test titles) and IN-02 ("pinned on the phase base" wording) remain open by disposition. They are cosmetic and not blocking.
- I did not independently re-run the RED-on-base experiment (it needs a temporary edit of core and a rebuild). I rely on the 44-01 SUMMARY record, the commit order (tests before source), and the derivation by construction in the current code.

### Human Verification Required

None.

### Gaps Summary

No gaps. The seed's fields are one derived statement in `SeededDecision.ts`; the payload entry and the seed class read it; `rebuild` and `dehydrateDecision` are spreads; the Allow/Deny branch is one closed table. The agreement rule, the bytes, and the mutation and coverage floors are preserved.

---

_Verified: 2026-11-15_
_Verifier: Claude (gsd-verifier)_
