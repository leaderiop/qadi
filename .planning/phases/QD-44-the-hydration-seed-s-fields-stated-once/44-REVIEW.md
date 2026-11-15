---
phase: QD-44-the-hydration-seed-s-fields-stated-once
reviewed: 2026-11-15T00:00:00Z
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
  info: 3
  total: 4
status: issues_found
---

# Phase QD-44: Code Review Report

**Reviewed:** 2026-11-15
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

The phase's changes were reviewed against `e7e8965..HEAD`. I also ran the checks that bear on the claims:
- `vitest` on `HydrationEngine`, `HydrationPayload` and `HydrationSeedFields`: 58 tests passed.
- `tsc -p packages/react`: clean.
- `tstyche` on `Hydration.tst.ts`: 32 assertions passed.
- `scripts/check-house-style.mjs`: clean.

I found no correctness bug in the derivation. The checks that held up:
- `rebuild` spreads the decoded entry first and `subjectId` second, so an entry cannot override the subject.
- The class's own `_tag` overrides the spread `_tag`. This is pinned by the property test.
- Decoding is strict (`onExcessProperty: "error"`), so no stray key can reach a seed through the spread.
- The payload's key order still comes from `encodeDecision`'s value and is pinned byte-for-byte by the golden.

One warning concerns the safety net the new invariant leans on. The rest is minor.

The necessity reference was not read for this review, so `necessity:` is omitted from the frontmatter.

## Warnings

### WR-01: INV-QD-333 and ADR-QD-157 overstate what the byte golden guards: a new optional wire field still ships unseen

**File:** `packages/react/test/HydrationSeedFields.test.ts:150-195`, `spec/invariants.md` (INV-QD-333 Implication)
**Issue:** The entry and the seed are now both built by deny-list: a wire field is disclosed unless named in `ALLOW_WITHHELD` or `DENY_WITHHELD`. INV-QD-333 says "the byte golden is the guard that it cannot ship to the payload unseen either". The golden only exercises four hand-built fixtures. A new wire field that `encodeDecision` emits only when set (the way `visibleFields` is) is absent from every fixture, so the golden stays green. The field then travels in every real payload, including `includeTrace: false` (`Withheld`), where the module's stated security decision (BEH-QD-147) is to ship as little as possible.

The property test does not cover this either. Its `traceArbitrary` is built from the current `Trace` fields, so a new field is never generated. It proves "a wire field reaches the seed". It does not prove "a withheld-by-default field is not leaked".

Before this phase, the payload was already a deny-list, but the seed dropped the unknown field, so the client-side exposure was narrower. Now both ends carry it, and the spec says the failure is caught when it is not.

**Fix:** Do one of the following:
- Make the guard real. Add a test that diffs the key set of `DecisionWireAllow.fields` and `DecisionWireDeny.fields` against an explicit allow-list of disclosed keys in the test, so a new core field fails the test until someone classifies it as disclosed or withheld.
- Weaken the INV-QD-333 and ADR-QD-157 wording to say the golden only covers the fields the fixtures populate.

```ts
const DISCLOSED = { Allow: ["evaluationId", "durationMillis", "visibleFields", "obligations"], Deny: ["evaluationId", "durationMillis"] } as const;
expect(Object.keys(DecisionWireAllow.fields).filter((k) => !WITHHELD.Allow.includes(k))).toEqual(DISCLOSED.Allow);
```

## Info

### IN-01: Planning-process identifiers in shipped source and test titles do not resolve

**File:** `packages/react/src/SeededDecision.ts:75`, `packages/react/test/HydrationSeedFields.test.ts` (describe titles `HYDF-03`, `HYDF-04`), `packages/react/test/Hydration.tst.ts` (comment `D-03`)
**Issue:** The shipped files cite `D-04`, `D-03`, `HYDF-03` and `HYDF-04`. These come from the phase's planning artifacts, not the spec. `AGENTS.md §11` makes `spec/` the only normative id space, and the only IDs a reader can follow are ADR-/BEH-/INV-/CCR-QD-. Once `.planning/` is archived, these references cannot be resolved.
**Fix:** Replace them with the spec ids or inline the reason. For example, say "a denial's obligations are always empty (ADR-QD-157 D4 / `entryAgrees`' rule)" in place of `(D-04)`. Drop the `HYDF-nn` suffixes, or map them to BEH-QD-556.

### IN-02: Test header and INV-QD-333 "Enforcement" rely on a "phase base" that no longer exists

**File:** `packages/react/test/HydrationSeedFields.test.ts:9-12`, `spec/invariants.md` (INV-QD-333 Enforcement), `spec/traceability.md` (INV-QD-333 row)
**Issue:** The claims "RED on the phase base" and "RED under a scratch wire field" describe a one-off manual run that nothing in the repo reproduces. They are recorded as the enforcement evidence, but a future reader cannot verify them. The ADR does record the measured failure text, which is the right place for that evidence. The normative enforcement lines should say what the test checks, not how it was validated once.
**Fix:** Keep the RED run in ADR-QD-157's Context section. In the invariant and the traceability row, say only that the property fails if the seed drops a field the wire discloses.

### IN-03: `SeededDecision.ts` module header still describes a fixed field list

**File:** `packages/react/src/SeededDecision.ts:4-6`
**Issue:** The header still says a seed carries "the verdict, the visible fields and the obligations". The fields are now "the wire's minus the withheld ones", which is the whole point of the phase. The `entryAgrees` doc block in `HydrationEngine.ts` (about line 419-423) also grew to an over-long line when `{@link VERDICTS}` was spliced in.
**Fix:** Reword the header to "the wire's fields minus what the payload withholds, and a `disclosure`", and re-wrap the `entryAgrees` comment at about 90 columns.

---

_Reviewed: 2026-11-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
