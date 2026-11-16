---
phase: QD-44-the-hydration-seed-s-fields-stated-once
verified: 2026-11-16T19:10:00Z
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
covered_digest: "v4:sha256:358b6d29ee91bfe70eef7e5a6ab08caa120d627ccd102c3e17f660c0b96b5374"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 4/4
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 44: The hydration seed's fields stated once - Verification Report

**Phase Goal:** Each verdict's seed fields are stated once, derived from core's wire statement, so a field added to the wire's `common` reaches the client's seed without a hand edit in `rebuild`, and the Allow/Deny branch is written once.
**Verified:** 2026-11-16 (at HEAD `6db92426`)
**Status:** passed
**Re-verification:** Yes. The first verification (2026-11-15) went stale because two covered files changed afterwards.

## Re-verification at 6db92426: what moved and why

Two review-cleanup commits touched `packages/react/src/SeededDecision.ts` and `packages/react/test/HydrationSeedFields.test.ts`. I read both diffs. Neither changes behaviour.

| Commit | Change | Effect on the phase goal |
| ------ | ------ | ------------------------ |
| `71dcd6ca` (IN-01) | One doc-comment in `SeededDecision.ts`: `(D-04)` becomes `(BEH-QD-081, ADR-QD-019)`. In the test, `describe` titles `(HYDF-03)` and `(HYDF-04)` become `(BEH-QD-556, INV-QD-333)` and `(ADR-QD-157)`. | None. A comment and two test titles changed, with no executable line touched. The cited ids exist: `spec/behaviors/11-obligations.md` has BEH-QD-081 and `spec/decisions/019-obligations.md` has a "`Deny` carries no obligations" section, which is the claim the comment makes. BEH-QD-556 and INV-QD-333 are in `19-hydration.md` and `invariants.md`, and ADR-QD-157 is `157-a-seeds-fields-are-the-wires-stated-once.md`. |
| `f18a93e1` (IN-02) | The byte golden's `describe` title drops "on the phase base". | None. The title changed and the eight golden strings did not. |

The review's IN-01 and IN-02, the two findings the first report listed as open, are now closed. The only other changes since the first verification are `.planning` files. `git diff HEAD` on `packages/`, `spec/` and `.changeset/` is empty, so the tree is clean.

I did not trust the commit subjects. I re-checked the goal's structure against the source at HEAD. `SeededDecision.ts` still builds `AllowSeedFields` and `DenySeedFields` with `Struct.omit(DecisionWireAllow/Deny.fields, ["_tag", ...WITHHELD])` plus `disclosure`. `SeededAllow` and `SeededDeny` are still `Data.TaggedClass` typed by those fields plus `subjectId`. `HydrationEngine.ts` still has the one `VERDICTS` table with `entryOf`, `seedOf` and `claimOf`. `entryAgrees` still delegates to core's `decisionDisagreement`. A grep finds no `_tag ===` Allow/Deny branch in the engine, and none of `D-04` or `HYDF-0` remains in the three covered source and test files.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | A property test (Decision to entry to SeededDecision keeps every disclosed wire field) is RED on the base under a scratch wire field, then green over the real fields | VERIFIED | `HydrationSeedFields.test.ts` loops over `encodeDecision`'s own keys (300 runs, fixed seed) with test-local withheld lists, so a new key is checked without being named. It was committed in `573f79e9` before any `src` change (`17c77bdc`, `4970ad2f`). The RED run is recorded in the 44-01 SUMMARY (counterexample `expected undefined to deeply equal 'x'`, `DecisionWire.ts` reverted). I did not re-run the RED, because it needs a core rebuild and a temporary edit of core's wire file. Re-run at HEAD: `pnpm exec vitest run --project react` gives 518 of 518 passing. A key-set pin and an engine-agreement test keep an unclassified wire key from shipping. |
| 2 | Each verdict's seed fields are one statement derived from `DecisionWireAllow`/`DecisionWireDeny` minus the withheld fields; `SeededAllow`/`SeededDeny` stay `Data.TaggedClass` typed by it; no hand-written field list in `SeededDecision.ts` or `rebuild` | VERIFIED | See the structure re-checked above. `AllowEntry`/`DenyEntry` in `HydrationEngine.ts` are `Schema.TaggedStruct` over the same `…SeedFields.fields`. `Hydration.tst.ts` passes (9 tests, 32 assertions at HEAD). |
| 3 | `dehydrateDecision` and `rebuild` are spreads with the one `subjectId` substitution; the Allow/Deny branch is written once for dehydrate, rebuild and agreement | VERIFIED | `rebuild` is `seedOf(entry.decision, subjectId)` (line 409). `dehydrateDecision` is `entryOf(encodeDecision(decision), includeTrace)` (line 315). `entryAgrees` calls `claimOf` (line 430). One closed table `VERDICTS: {[V in WireVerdict]: Row<V>}` (line 279) carries entry, seed and claim, so a verdict without a row is a compile error. |
| 4 | `entryAgrees` still refuses a seed that disagrees with its trace through `decisionDisagreement` (INV-QD-170), existing tests unchanged, and the payload's wire form is byte-identical (golden committed on the base) | VERIFIED (with a recorded, planned deviation) | `entryAgrees` delegates to core's `decisionDisagreement(claimOf(...), trace)`. The eight-string golden was committed in `573f79e9` on the base. In this re-verification the golden's strings are unchanged: the `f18a93e1` diff shows only the title line, and the suite passes. `HydrationEngine.test.ts` is untouched and passes. The deviation from the first report stands: four test files each lost one `visibleFields: undefined` line under accepted decision D-03 (`visibleFields` is an optional key, as on the wire), recorded as Breaking in a minor `@qadi/react` changeset and in `upgrading.md` 0.13. It is not an override, because refusal logic and bytes are unchanged. |

**Score:** 4/4 truths verified (0 behavior-unverified; none of the truths is a cancellation or ordering invariant).

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/react/src/SeededDecision.ts` | Derived `AllowSeedFields`/`DenySeedFields`, typed classes | VERIFIED | Substantive and wired: imported by `HydrationEngine.ts`, `SeededQuestion.ts`, `DeveloperSignals.ts`. |
| `packages/react/src/HydrationEngine.ts` | `VERDICTS` table, spread `rebuild`/`dehydrateDecision`, `claimOf` in `entryAgrees` | VERIFIED | Substantive, no stubs. |
| `packages/react/test/HydrationSeedFields.test.ts` | Property, byte golden, key-set pin, engine-agreement test | VERIFIED | Passes. |
| `packages/react/test/Hydration.tst.ts` | Type pin of the seed's fields | VERIFIED | `tstyche` passes. |
| `.changeset/react-seed-fields-stated-once.md` | `@qadi/react` minor, Breaking | VERIFIED | Present and unchanged. |
| `spec/decisions/157-…md`, `spec/behaviors/19-hydration.md` (BEH-QD-556), `spec/invariants.md` (INV-QD-333), `spec/traceability.md`, `spec/README.md` (CCR-QD-435), `spec/overview.md`, ADR-QD-078 amendment, `AGENTS.md` section 7 | Records | VERIFIED | Present. Ids cited by the IN-01 edit resolve (see above). |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `DecisionWireAllow`/`DecisionWireDeny` (core) | `AllowSeedFields`/`DenySeedFields` | `Struct.omit(….fields, …)` | WIRED |
| `*SeedFields.fields` | payload `AllowEntry`/`DenyEntry` | `Schema.TaggedStruct(tag, fields)` | WIRED |
| `*SeedFields.Type` | `SeededAllow`/`SeededDeny` | class type parameter | WIRED |
| `VERDICTS` rows | `dehydrateDecision`, `rebuild`, `entryAgrees` | `entryOf`, `seedOf`, `claimOf` | WIRED |
| `claimOf` | core `decisionDisagreement` | `entryAgrees` | WIRED |

### Data-Flow Trace (Level 4)

`encodeDecision` (real wire value) to `Struct.omit` spread to the entry, to `JSON` to the decoded `…Entry` schema, to `{...entry, subjectId}` to the seed. The property test walks this end to end. FLOWING. Unchanged by the two comment and title edits.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| React suite | `pnpm exec vitest run --project react` | 518 tests passed | PASS |
| Type pins | `pnpm exec tstyche packages/react/test/Hydration.tst.ts` | 9 tests, 32 assertions passed | PASS |
| House-style gate | `node scripts/check-house-style.mjs` | 542 files clean, 3 declared switches | PASS |
| API surface (gate 13) | `node scripts/check-api-surface.mjs` | 935 exports documented across 9 packages | PASS |
| Whole merge gate | `pnpm check:pr` | Not re-run. Per the caller it exited 0 at `f18a93e1`, the last commit to change source, and only `.planning` files changed after it. I did not verify that exit code myself. | CARRIED |
| Stryker | not re-run | Floors recorded in `44-mutation-base.json` against `44-mutation-after.json` (`HydrationEngine.ts` 1 to 1, `SeededDecision.ts` 0.875 to 0.875). The two new edits touch only a comment and test titles, which no mutant can change. | CARRIED |

### Probe Execution

SKIPPED. No probes are declared by this phase.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ---------- | ------ | -------- |
| HYDF-01 | 44-02, 44-04 | SATISFIED | Truth 2. |
| HYDF-02 | 44-02, 44-03 | SATISFIED | Truth 3. |
| HYDF-03 | 44-01, 44-02, 44-03 | SATISFIED | Truth 1. |
| HYDF-04 | 44-01, 44-03 | SATISFIED | Truth 4. |
| WX-01 | 44-06 | SATISFIED | `check:pr` exit 0 at the last source commit (caller-reported), plus the gates re-run here. |
| WX-02 | 44-01, 44-04, 44-05 | SATISFIED | Reserved numbers only (ADR-QD-157, CCR-QD-435, BEH-QD-556, INV-QD-333); `scripts/` untouched. |
| WX-03 | 44-05 | SATISFIED | Gate 13 passes, with `overview.md` documenting the change. |
| WX-04 | 44-02, 44-03, 44-06 | SATISFIED | House-style is clean; no `switch`, `any`, `!`, `async`/`await`, `console` or `as` casts in the covered source (only `as const`). |
| WX-05 | 44-01, 44-06 | SATISFIED | Coverage and mutation floors held (see above). |
| WX-06 | 44-01, 44-02, 44-06 | SATISFIED | The golden and property were committed green on the base before the source edits. |
| WX-07 | 44-04 | SATISFIED | `@qadi/react` minor changeset marked Breaking, plus the 0.13 `upgrading.md` entry. Nothing is released. |

No orphaned requirements. All 11 IDs appear in at least one PLAN's `requirements` field.

### Anti-Patterns Found

None in the covered files. The two commits removed the plan-local ids (`D-04`, `HYDF-03`, `HYDF-04`) that the review had flagged.

### Notes (non-blocking)

- ROADMAP's Records line says the changeset is "patch: a fix", and the phase shipped minor Breaking under accepted decision D-03. CONTEXT, the changeset, the upgrade guide and ADR-QD-157 agree with each other, so this is planning-text drift and not a gap.
- The review's WR-01 is fixed, and IN-01 and IN-02 are now fixed too.
- I did not independently re-run the RED-on-base experiment, `pnpm check:pr` or Stryker.

### Human Verification Required

None.

### Gaps Summary

No gaps. The two commits since the first verification are comment and test-title edits, the goal's structure is unchanged at HEAD, and the checks I re-ran pass.

---

_Verified: 2026-11-16_
_Verifier: Claude (gsd-verifier)_
