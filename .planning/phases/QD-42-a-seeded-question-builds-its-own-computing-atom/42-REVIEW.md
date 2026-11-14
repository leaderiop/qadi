---
phase: QD-42-a-seeded-question-builds-its-own-computing-atom
reviewed: 2026-11-14T20:05:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - packages/react/src/SeededQuestion.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/QadiAtoms.ts
  - packages/react/src/QuestionBook.ts
  - packages/react/src/SeededDecision.ts
  - packages/react/src/HydrationEvent.ts
  - packages/react/src/Hydration.ts
  - packages/react/test/SeededQuestion.test.ts
  - packages/react/test/QadiAtoms.test.ts
  - packages/react/test/HydrationEngine.test.ts
  - scripts/check-house-style.mjs
  - .changeset/react-seeded-question-owns-its-computing-atom.md
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase QD-42: Code Review Report

**Reviewed:** 2026-11-14
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The move is behaviour-preserving. I diffed the removed `makeSeededQuestion` and
`seededDecision` against the new `SeededQuestion.ts` line by line:

- The seed is read through `seededIn(get.registry)` in both the computing atom and the reader. Nothing calls `get(grantAtom)`.
- The reader's first statement is `get.addFinalizer(live())`, before any `get`.
- There is exactly one `Atom.readable` per question.
- `runtime.atom(...).pipe(runtime.factory.withReactivity([DECISIONS_KEY]))` is unchanged.
- The `announced` per-registry state and the `Initial`/seed precedence are byte-equivalent.
- The two decision-read tokens (`isInitial`, `isSuccess`) moved with the function, so `DECISION_READ_BUDGET` at 2 for `SeededQuestion.ts` is correct.

Checks I ran:

- `tsc --noEmit` on `packages/react` is clean. Narrowing the runtime parameter to `StandingEvaluationServices` type-checks against the `QadiRuntimeServices` runtime.
- `oxlint` reports only the `_` parameter warning at `QadiAtoms.ts:321`. That line is unchanged since 2026-08-25 and not part of this diff.
- `node scripts/check-house-style.mjs` is clean.
- `SeededQuestion.test.ts` and `HydrationEngine.test.ts` pass when run from the repo root (21 tests). From `packages/react` as cwd, `SeededQuestion.test.ts` fails with `Cannot read properties of undefined (reading 'config')`. That is the workspace project config, not the test, but note it.

No critical issues. The new `SeededQuestion.ts` has no import cycle: it imports only `DeveloperSignals` (type), `HydrationEvent` and `SeededDecision`. The remaining findings are stale prose and one weak test.

## Warnings

### WR-01: Normative spec still places `makeSeededQuestion` and the `announced` guard in `HydrationEngine.ts`

**File:** `spec/decisions/149-a-seed-is-held-by-its-question.md:43`, `spec/behaviors/19-hydration.md:329`, `spec/decisions/093-a-decision-is-read-once.md:93` and `:137`
**Issue:** AGENTS.md §11 says `spec/` is normative and that code follows it, so a changed location must update the doc in the same change. The move updated the Source lines in `invariants.md`, `traceability.md` and ADR-155. These sites still claim `makeSeededQuestion` or seed precedence lives in `HydrationEngine.ts`:

- ADR-149:43 reads "`makeSeededQuestion` (`HydrationEngine.ts`) keeps a WeakMap".
- BEH-QD-151, in `19-hydration.md:329`, reads "the `announced` guard in `HydrationEngine.ts`'s `read`".
- ADR-093:93 gives the `DECISION_READ_BUDGET` as "`HydrationEngine.ts` 3". The budget is now `SeededQuestion.ts` 2. ADR-093:137 says "seed precedence in `HydrationEngine.ts`".

ADR-039:96 and ADR-149:137 are amendment or history notes and may be intentionally frozen. The three above present the location as current fact. A reader following BEH-QD-151 to the `announced` guard lands in a file that no longer has it.
**Fix:** Change each to `SeededQuestion.ts`. For ADR-093:93, state the budget as it is now. If the ADR-093 lines are deliberately historical, mark them as `>` blockquote history, as AGENTS.md §15 does for superseded claims.

### WR-02: The late-seed test in `QadiAtoms.test.ts` can pass without ever delivering the late seed

**File:** `packages/react/test/QadiAtoms.test.ts:690-693`
**Issue:** The test is "a seed given after the first read does not re-run the computation":

```ts
for (const [grantAtom, grant] of seedsOf(atoms, serverAllow)) {
  if (Atom.isWritable(grantAtom)) registry.set(grantAtom, grant);
}
expect(decidedIn(registry, atoms)).toBe(first);
```

If `isWritable` is false, or `seedsOf` returns no pairs, the loop body never sets anything. The final `toBe(first)` then holds trivially, because nothing happened. It is the only guard for the "seed given later cannot re-run a computation" claim in `SeededQuestion.ts:181`. A regression that made the grant non-writable would leave this test green. The sibling in `SeededQuestion.test.ts` handles this correctly with `return assert.fail(...)`.
**Fix:**
```ts
const pairs = seedsOf(atoms, serverAllow);
expect(pairs.length).toBe(1);
const [grantAtom, grant] = pairs[0]!;
expect(Atom.isWritable(grantAtom)).toBe(true);
if (Atom.isWritable(grantAtom)) registry.set(grantAtom, grant);
```
Replace the `!` with a guard if the house `no-non-null` rule is enforced for tests.

## Info

### IN-01: `SeededQuestion.ts` exports `isMismatch` and `DECISIONS_KEY`; only `DECISIONS_KEY` has a consumer

**File:** `packages/react/src/SeededQuestion.ts:50`
**Issue:** `isMismatch` is exported but nothing in `packages/*/src` or `packages/*/test` imports it. It was exported from `HydrationEngine.ts` before, so this preserves an existing dead export. The move was the chance to drop it. `DECISIONS_KEY` is consumed by `QadiAtoms.ts:325`. It also had a single in-file owner before, so exporting it is necessary now.
**Fix:** Drop `export` from `isMismatch`. The prose references in `spec/overview.md` and `TraceDiff.ts` are to the concept, not the import. Leave it exported only if a structural (fallow) finding says otherwise.

### IN-02: `SeededQuestion.ts` header claims "imports nothing from `HydrationEngine.ts`", while the test imports a type from it

**File:** `packages/react/test/SeededQuestion.test.ts:8`
**Issue:** `HydrationMismatch` is imported from `../src/HydrationEngine.ts`. That is a re-export of the type declared in `DeveloperSignals.ts`. The source file is correct. The test couples a `SeededQuestion` test to the codec module whose responsibility it was just split from, and it would break if the re-export is ever trimmed.
**Fix:** `import type { HydrationMismatch } from "../src/DeveloperSignals.ts";`

---

_Reviewed: 2026-11-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
