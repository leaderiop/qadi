---
phase: 29-restated-facts
reviewed: 2026-11-12T01:15:00Z
depth: standard
files_reviewed: 32
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
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

All three facts are stated once and the behaviour claims hold. I checked each against the code and ran
`pnpm typecheck`, `pnpm spec:api`, `tstyche PortName.tst.ts` and `HydrationEngine.test.ts`. All pass.

- **Closed union.** `PortSpans` is a non-exported interface, so no other module can augment it. `PortName = keyof PortSpans` and `PortSpanName = PortSpans[PortName]` are closed. `PortSpanOf<N>` is exact per port. `PortDescription.span: PortSpanOf<N>` does not break generic reads: `PortCalls.ts` reads `d.span` as `PortSpanName`, and typecheck is green.
- **Metrics.** `PortMetrics.ts` diff touches only the two type declarations and a comment. Ids, descriptions and preregistered words are unchanged, so no registry key moved.
- **Public surface.** `PortName` and `PortSpanName` stay exported through `export *`, now from `PortName.ts`. `PortSpanOf` is the only new export. `index.ts` stays alphabetical (§9). `FAILURE_IS_NOT_A_DENIAL` is not in either devtools named barrel.
- **Withheld lists.** `ALLOW_WITHHELD` is `["subjectId","trace"]` and `DENY_WITHHELD` is `["subjectId","trace","obligations","reason"]`. Both are byte-for-byte the old inline lists, at all four use sites, so the wire is identical.
- **Rendered sentence.** The JSX collapses the old multi-line text to single spaces ("decided. This is not a denial."), which equals the constant. In the Simulator the comment-then-expression layout adds no whitespace.
- **New test.** The `PortName.tst.ts` last assertion fails if `span` reverts to the whole union, so it is not a tautology. The `HydrationEngine.test.ts` case asserts the mismatch count, the empty result and the exact drop record.
- **Changesets.** Core `minor`, react and devtools `patch` are right. Core is 0.x and the narrowing is breaking only for hand-built descriptions, which the changeset says. The packages are in a `fixed` group.
- **AGENTS.md.** No `as` (beyond `as const` on literals), `!`, `any`, `switch` or class was added.

One live spec line still says the old thing.

## Warnings

### WR-01: ADR-QD-123's decision text still says `PortMetrics.ts` owns `PortName`

**File:** `spec/decisions/123-a-metric-is-declared-once.md:72`
**Issue:** The `## Decision` section (not a dated amendment) reads "`PortMetrics.ts` owns `PortName` for the same reason". After this phase `PortName` is declared in `PortName.ts`, so a reader of the live decision text is sent to the wrong module. The grep for `PortMetrics.ts` near `PortName` across spec, packages and scripts found this as the only stale placement. The ADR-QD-094 amendment and the overview row are correct. This is the "a live spec line still places `PortName` in `PortMetrics.ts`" case.
**Fix:** Either add a dated amendment note to ADR-QD-123 pointing at ADR-QD-094's CCR-QD-419 amendment (preferred, §15 treats dated amendments as history), or edit the sentence to say `PortName` lives in `PortName.ts` (declared in a leaf for the same type-only-cycle reason). If you edit it, bump ADR-QD-123's revision and list it in the CCR-QD-419 row. Today that row names only ADR-QD-094.

## Info

### IN-01: `DENY_WITHHELD` restates `ALLOW_WITHHELD` that its own comment says it contains

**File:** `packages/react/src/HydrationEngine.ts:93-96`
**Issue:** The comment says a deny entry "withholds what an allow does, plus" two fields, but the tuple spells out `"subjectId", "trace"` again. This is the same restated-fact shape the phase removes, in miniature. The round-trip test keeps the two in step, so it is not a correctness risk.
**Fix:** `const DENY_WITHHELD = [...ALLOW_WITHHELD, "obligations", "reason"] as const;`. This keeps a literal tuple type, and `as const` on a literal is allowed.

### IN-02: CCR-QD-419 row contradicts itself on how many modules were re-pointed

**File:** `spec/README.md:357`
**Issue:** The file list says "six modules re-pointed", while the narrative in the same row says "the seven src modules". The diff shows seven (`PortAccess`, `PortDerivation`, `PortDescription`, `PortDoubles`, `PortRemote`, `Ports`, `PortServing`), plus `PortMetrics` itself, which imports the type. This is change history, so it is low stakes, but it is a restated fact that already disagrees with itself.
**Fix:** Change "six modules re-pointed" to "seven".

---

_Reviewed: 2026-11-12T01:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
