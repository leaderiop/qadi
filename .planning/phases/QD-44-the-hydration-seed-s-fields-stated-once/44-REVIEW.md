---
phase: QD-44-the-hydration-seed-s-fields-stated-once
reviewed: 2026-11-15T06:10:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/SeededDecision.ts
  - packages/react/test/HydrationSeedFields.test.ts
  - packages/react/test/Hydration.tst.ts
  - packages/react/test/DecisionOutcome.test.ts
  - packages/react/test/DeveloperSignals.test.ts
  - packages/react/test/HydrationEvent.test.ts
  - packages/react/test/SeededQuestion.test.ts
  - .changeset/react-seed-fields-stated-once.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - AGENTS.md
  - spec/behaviors/19-hydration.md
  - spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md
  - spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
  necessity: 0
status: issues_found
---

# Phase QD-44: Code Review Report (iteration 3)

**Reviewed:** 2026-11-15T06:10:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Both earlier fixes hold.

- **Iteration 1 WR-01 (0e05e184).** The key-set pin compares `Object.keys(DecisionWireAllow.fields)` and `Object.keys(DecisionWireDeny.fields)` with `DISCLOSED` plus `WITHHELD`. A new wire key, optional or not, fails it.
- **Iteration 2 WR-01 (623edb09).** A second test compares `ALLOW_WITHHELD` and `DENY_WITHHELD`, with `_tag` stripped, with the test-local `WITHHELD`. The lists are the ones `AllowSeedFields`/`DenySeedFields` (`SeededDecision.ts:89,99`) and the `VERDICTS` rows (`HydrationEngine.ts:282,290`) actually use. A field marked withheld in the test but not in the source therefore fails. The two checks together force `DISCLOSED` to equal the wire keys minus the engine's withheld list.
- **Test run.** `HydrationSeedFields.test.ts` passes, 8 of 8.

The engine and seed source show no new defects. There is no `as` beyond `as const`, no `!`, `any` or `switch`, and `VERDICTS` is a closed mapped table.

The one new finding is documentation. The spec still says the key-set pin alone is the guard. That is the claim iteration 2 showed to be incomplete, and the test that now closes the gap is not named anywhere in the spec.

## Warnings

### WR-01: INV-QD-333, ADR-QD-157 and the traceability rows name the key-set pin as the whole guard and omit the engine-agreement test

**File:** `spec/invariants.md:3853` (Implication and Enforcement of INV-QD-333); also `spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md:97-101` (Consequences, "the guard is that file's key-set pin"), `spec/traceability.md:168` and `:390`.

**Issue:** `AGENTS.md` §11 makes `spec/` normative, and §15 shows this repo gates documentation drift. Commit 623edb09 changed only the test file. After it, the guard against a mislabelled new optional field has two parts:

- the key-set pin, and
- the test "the engine withholds exactly the fields this file classifies as withheld".

The spec still says "the guard is the test that pins the wire structs' key sets against an explicit disclosed and withheld list". Enforcement and the traceability rows list the property, the pin and the golden. The pin alone does not stop the failure mode iteration 2 found. A developer can put a new field in the test's `WITHHELD` and leave the source's `ALLOW_WITHHELD` alone. The field would then be shipped to every page with every test green. A reader who trusts the INV text would not know the engine-agreement test exists, and could delete it as redundant.

**Fix:** In INV-QD-333 Implication and Enforcement, in the ADR-QD-157 Consequences paragraph, and in the `traceability.md` rows (INV-QD-333 and the `HydrationSeedFields.test.ts` row), add the second part of the guard. For example:

> ...the guard is the key-set pin together with the test that compares the engine's `ALLOW_WITHHELD`/`DENY_WITHHELD` with the test's withheld classification, so a field classified withheld in the test is withheld by the engine.

Then bump the revision and the Change History of each touched document, and update the CCR-QD-435 row in `spec/README.md`, as 0e05e184 did.

## Info

### IN-01: plan-local ids remain in source and test titles (carried)

**File:** `packages/react/src/SeededDecision.ts:75` ("(D-04)"); `packages/react/test/HydrationSeedFields.test.ts:109` ("(HYDF-03)") and `:214` ("(HYDF-04)").

**Issue:** `D-04`, `HYDF-03` and `HYDF-04` are planning-artifact ids with no entry in `spec/`. Anyone reading the shipped source cannot resolve them.

**Fix:** Replace them with the spec ids that exist (`BEH-QD-556`, `INV-QD-333`, `ADR-QD-157`). For D-04, cite the invariant that says a denial's obligations are empty.

### IN-02: "pinned on the phase base" wording survives (carried, remainder of IN-02)

**File:** `packages/react/test/HydrationSeedFields.test.ts:214` (describe title "the payload's bytes are pinned on the phase base"); `spec/traceability.md:390` ("pinned on the base").

**Issue:** "Phase base" is a branch-history notion. The golden's job is to pin the bytes against future change. The wording was already half-removed from the file header in the earlier fix, and these two places were missed.

**Fix:** Retitle to "the payload's bytes are pinned (HYDF-04)", or better "(BEH-QD-556)". Drop "on the base" from the traceability row.

---

_Reviewed: 2026-11-15T06:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
