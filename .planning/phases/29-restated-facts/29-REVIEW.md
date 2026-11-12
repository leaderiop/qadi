---
phase: 29-restated-facts
reviewed: 2026-11-12T01:30:00Z
depth: standard
iteration: 2
files_reviewed: 33
files_reviewed_list:
  - .changeset/failure-sentence-constant.md
  - .changeset/hydration-withheld-fields.md
  - .changeset/port-name-leaf.md
  - packages/core/src/index.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/PortDoubles.ts
  - packages/core/src/PortMetrics.ts
  - packages/core/src/PortName.ts
  - packages/core/src/PortRemote.ts
  - packages/core/src/Ports.ts
  - packages/core/src/PortServing.ts
  - packages/core/test/PortAccess.test.ts
  - packages/core/test/PortConformance.test.ts
  - packages/core/test/PortName.tst.ts
  - packages/core/test/PortRemote.test.ts
  - packages/core/test/Ports.test.ts
  - packages/core/test/Ports.tst.ts
  - packages/core/test/PortServe.test.ts
  - packages/core/test/PortsLayer.test.ts
  - packages/core/test/PortSpan.test.ts
  - packages/core/test/PortSpan.tst.ts
  - packages/devtools/src/model/Verdict.ts
  - packages/devtools/src/react/Inspector.tsx
  - packages/devtools/src/react/Simulator.tsx
  - packages/react/src/HydrationEngine.ts
  - packages/react/test/HydrationEngine.test.ts
  - spec/decisions/094-a-port-is-described-once.md
  - spec/overview.md
  - spec/README.md
  - spec/decisions/123-a-metric-is-declared-once.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
  necessity: 0
status: issues_found
---

# Phase 29: Code Review Report (iteration 2)

**Reviewed:** 2026-11-12T01:30:00Z
**Depth:** standard
**Files Reviewed:** 33
**Status:** issues_found

## Summary

Iteration 2 re-reviews the whole phase after commit 7bddf8fb, which fixed iteration 1's WR-01.

**WR-01 is resolved.** ADR-QD-123's live line 72 now reads "`PortMetrics.ts` owned `PortName` ... (since moved to `PortName.ts`; see the amendment below)", and a dated amendment (2026-11-12, CCR-QD-419) states the new home. Revision 1.1 and its change-history row are in place. The README CCR-QD-419 row lists the ADR-123 amendment, and the README change history has a 1.156 entry. A grep across `.ts`, `.tsx`, `.md`, `.mjs` and `.feature` outside `.planning` finds no live comment or spec line that still places `PortName` or `PortSpanName` in `PortMetrics.ts`. The remaining hits are `PredicatePortName` (which does live there), change history, and the amendments. The fix introduced no false statement. One small wording blemish is IN-03 below.

**The source diff is correct.** Checked and found sound:

- **Closed union.** `PortSpans` is a module-private `interface`, so it cannot be augmented, and `PortName = keyof PortSpans` is closed. `PortSpanOf<N>` is an indexed access and `PortSpanName = PortSpans[PortName]` is the five-member union.
- **Generic `.span` reads.** `PortDescription<PortName,...>["span"]` is the full union, so devtools `PortCalls.ts:44` (`forEveryPort((d): readonly [PortSpanName, PortName] => [d.span, d.port])`) still typechecks.
- **No metric re-keyed.** `PortMetrics.ts` only lost the two type unions and gained one `import type`. The metric declarations are untouched.
- **Withheld fields unchanged.** `ALLOW_WITHHELD` and `DENY_WITHHELD` equal the old inline lists exactly (`["subjectId","trace"]` and `["subjectId","trace","obligations","reason"]`), so no field is newly leaked or withheld and the wire bytes are identical. Each `as const` sits on a literal, which AGENTS.md allows.
- **Rendered sentence identical.** JSX collapses the old line break to one space, so the text was "...nothing was decided. This is not a denial." The constant spells exactly that. `Simulator.tsx` keeps its JSX comment and adds no stray whitespace.
- **Barrels and house style.** `FAILURE_IS_NOT_A_DENIAL` is not in devtools' named barrels. The `index.ts` `export *` line is in alphabetical order (`PortMetrics`, `PortName`, `PortRemote`). There is no `as`, `!`, `any`, `switch` or `class` in the added code.
- **Changesets.** Core is minor (a new type export, plus `PortDescription.span` narrowed). React and devtools are patch (internal only). All three are right for a 0.x package.
- **Tests are meaningful.** The third `PortName.tst.ts` test pins `PortDescription<"AttributeResolver",...>["span"]` to exactly `"qadi.attribute"`, so it fails if the field reverts to `PortSpanName`. The new `HydrationEngine.test.ts` case asserts a counted mismatch, zero pairs, and `entries` handed back with `wholePayload: true`. It is not a tautology.

Gates run on the current tree:

| Gate | Result |
| ---- | ------ |
| `pnpm typecheck` | clean |
| `node scripts/check-house-style.mjs` | 457 files clean |
| `pnpm spec:api` | 907 exports documented |
| `pnpm circular` | no cycles |
| `pnpm test:tstyche` | 233 tests passed |
| `vitest` (react hydration, core Port*, devtools) | 1837 tests passed |

Three Info items remain. IN-01 and IN-02 carry forward from iteration 1. IN-03 is new.

## Info

### IN-01: `DENY_WITHHELD` restates `ALLOW_WITHHELD`, which its own comment says it contains (carried forward)

**File:** `packages/react/src/HydrationEngine.ts:93-96`
**Issue:** The comment says a deny entry "withholds what an allow does, plus" two fields. The tuple spells `"subjectId", "trace"` again. This is the restated-fact shape the phase removes, in miniature. The `HydrationPayload.test.ts` round trip keeps the two in step, so it is not a correctness risk.
**Fix:** `const DENY_WITHHELD = [...ALLOW_WITHHELD, "obligations", "reason"] as const;`. A spread of a readonly tuple inside `as const` keeps the literal tuple type.

### IN-02: CCR-QD-419 row contradicts itself on the re-pointed module count and cites its own revision one behind (carried forward, widened)

**File:** `spec/README.md:357`
**Issue:** Two restated facts in this row disagree with the rest of the document.
- The file list says "six modules re-pointed". The narrative in the same row says "the seven src modules". The diff shows seven re-pointed (`PortAccess`, `PortDerivation`, `PortDescription`, `PortDoubles`, `PortRemote`, `Ports`, `PortServing`), plus `PortMetrics`, which now imports the type.
- The row lists "`spec/README.md` Rev 1.155", but after 7bddf8fb the README is at Rev 1.156 (Document Control and the 1.156 change-history entry). The row cites its own file's revision one behind.

This is change history, so it is low stakes. Edits to change history are acceptable here because the row is still being written as part of the same CCR.
**Fix:** Change "six modules re-pointed" to "seven". Change "`spec/README.md` Rev 1.155" to "Rev 1.155, 1.156".

### IN-03: ADR-QD-123 amendment says `PortMetrics.ts` "still imports the leaf"

**File:** `spec/decisions/123-a-metric-is-declared-once.md:129`
**Issue:** `PortName.ts` is new in this phase, so `PortMetrics.ts` never imported it before, and "still" implies a prior import that did not exist. The substance is right: `PortMetrics.ts` imports the leaf and the leaf imports nothing, so the type-only cycle cannot form. This is a mild wording slip in a live line, not a false claim about where `PortName` lives.
**Fix:** Replace "still imports the leaf, not the other way round" with "now imports the leaf, never the reverse".

---

_Reviewed: 2026-11-12T01:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
