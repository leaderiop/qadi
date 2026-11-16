---
phase: QD-52-core-owns-the-predicate-compile-shell
reviewed: 2026-11-16T19:45:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - .changeset/core-compile-predicate.md
  - .changeset/predicate-prisma-compile-shell-in-core.md
  - .changeset/predicate-sql-compile-shell-in-core.md
  - .planning/phases/QD-52-core-owns-the-predicate-compile-shell/tools/mutation.mjs
  - .planning/phases/QD-52-core-owns-the-predicate-compile-shell/tools/scan.mjs
  - packages/core/src/RenderablePredicate.ts
  - packages/core/test/CompilePredicate.test.ts
  - packages/predicate-prisma/src/CompileMetrics.ts
  - packages/predicate-prisma/src/index.ts
  - packages/predicate-prisma/test/CompileShell.test.ts
  - packages/predicate-sql/src/CompileMetrics.ts
  - packages/predicate-sql/src/index.ts
  - packages/predicate-sql/test/CompileShell.test.ts
  - spec/README.md
  - spec/behaviors/31-predicate-compilation.md
  - spec/decisions/165-core-owns-the-predicate-compile-shell.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
  necessity: 0
status: issues_found
---

# Phase QD-52: Code Review Report

**Reviewed:** 2026-11-16T19:45:00Z
**Depth:** standard
**Files Reviewed:** 20

## Summary

The shell move is correct. `compilePredicate` counts `refused` once, only on a typed `PredicateNotRenderable` (`tapError` does not see a defect). It counts `compiled` only after `Effect.map(options.render)` returns, and `Effect.map` turns a throwing renderer into a defect that counts neither outcome. `render` runs inside the returned Effect, so a reused program re-runs it and the SQL `params` accumulator is fresh per run. The explicit `identifiers`/`maxInValues` keys sit after `...options.rules`, so at runtime the two defaults always win over anything in `rules`. `undefined` and an omitted value both reach the base's default. The `?? "Ascii"` and `?? DEFAULT_MAX_IN_VALUES` fallbacks match the base exactly.

I checked each of these against the diff and the code:
- Spans are unchanged: `compilePredicate` is a plain function and `toRenderable` is the only child span. Both packages' span-tree tests assert it.
- `compiledTotal: CompileOutcomes` is a pure annotation, and `check-house-style` is clean (542 files).
- `tsc -b` and `tsc -p tsconfig.test.json` pass.
- The three new test files pass (8, 47 and 21 tests).
- The characterisation tests assert literal reasons, tags and outputs and import neither `toRenderable` nor `compilePredicate`. Counters are read through `compiledTotal` and isolated per test with `isolatedMetrics`.
- `scan.mjs` prints "phase scan clean". `mutation.mjs compare`, run from the repo root, prints "WX-05 holds (D-09a)". Core goes 0.9815 to 0.9821 with every `compilePredicate` mutant killed, and SQL and Prisma keep identical survivor sets (+0/-0).
- The ADR, BEH, INV, traceability, overview and CCR-QD-443 claims match the code and the evidence. That covers the revision numbers, the six-versus-four refusal-reachability table, "Unused: INV-QD-350", and the three changesets and their levels (the packages are in one `fixed` group, so the levels cannot desynchronise).

No critical issues. One type-soundness warning on `rules`, and four info items.

## Warnings

### WR-01: `rules` accepts a full `RenderRules` and silently ignores its `identifiers` and `maxInValues`

**File:** `packages/core/src/RenderablePredicate.ts:540` (the `rules` field), `:563-564` (the overriding keys)
**Issue:** `rules: Omit<RenderRules, "identifiers" | "maxInValues">` rejects extra properties only on a fresh object literal. A caller who passes an existing `RenderRules` value, `compilePredicate(p, { rules: myRenderRules, render, outcomes })`, type-checks without error. The spread then puts `identifiers` and `maxInValues` into the object, and the two explicit keys after it overwrite them with `options.identifiers ?? "Ascii"` and `options.maxInValues ?? 1000`. A third dialect that has a complete `RenderRules` in hand would get a `maxInValues` of 1000 instead of its own tighter bound, with no compile error and no refusal. The shell is the only place that applies those fields (BEH-QD-596), so a silent override at its one seam goes the wrong way for a resource-exhaustion bound. The doc comment says only "minus the two fields core defaults".
**Fix:** Make the type reject the fields too:
```ts
readonly rules: Omit<RenderRules, "identifiers" | "maxInValues"> & {
  readonly identifiers?: never;
  readonly maxInValues?: never;
};
```
Or take the two fields only from the top level and document that a `rules` value carrying them is rejected. Pin it with a `.tst.ts` case. Update the same signature in ADR-QD-165 and BEH-QD-596, which copy it.

## Info

### IN-01: Shipped source cites a planning-only decision id, and the comment describes the authoring process

**File:** `packages/predicate-prisma/src/index.ts:432-434`
**Issue:** The body comment says "(D-06a)" and then "A comment here, not the doc comment above: a sentence in the doc comment is emitted into the declaration." `D-06a` is a `52-CONTEXT.md` decision id. It is not defined in ADR-QD-165, BEH-QD-597 or anywhere else under `spec/`, so a reader of the source cannot resolve it. The second sentence is about how the comment was placed, not about what the code does.
**Fix:** Cite the spec record and drop the process sentence:
```ts
// `compiled` is counted only after `render` returns, so a renderer defect counts
// neither outcome (BEH-QD-597, ADR-QD-165).
```

### IN-02: `compilePredicate`'s doc leaves out the `render` contract and the `outcomes` field

**File:** `packages/core/src/RenderablePredicate.ts:538-550`
**Issue:** `render` runs once per run of the returned Effect, not once per construction, so it must allocate its own per-run state. SQL's accumulator relies on this and carries the comment "The accumulator is per run of the Effect". The core doc and the BEH state neither the rule nor that a throw becomes a defect. `outcomes` has no field comment. A third dialect author reading only core would not learn either point. Core's test "each run of the returned Effect counts once" pins the behaviour, but not the doc.
**Fix:** Add to `CompilePredicateOptions`: `render` "runs once per run of the returned Effect, after classification succeeds; keep per-run state inside it, and a throw is a defect that counts neither outcome", and `outcomes` "the dialect's own counter series (ADR-QD-123)".

### IN-03: One new SQL test is redundant and carries an oxlint warning

**File:** `packages/predicate-sql/test/CompileShell.test.ts:158-162`
**Issue:** "one more than the default maxInValues refuses" repeats the REFUSALS row "TooManyValues past the default maxInValues" (1001 values, postgres, same reason), which already runs for all three dialects. It also uses `new Array(1001).fill(1)`, which oxlint flags as `unicorn(no-new-array)`. This is the only warning this phase adds.
**Fix:** Delete the test, or use `Array.from({ length: 1001 }, () => 1)`. The row already covers the behaviour.

### IN-04: A core test title overstates what it pins

**File:** `packages/core/test/CompilePredicate.test.ts:118-129`
**Issue:** "the dialect's rules reach toRenderable unchanged" asserts only `reservedColumns`. `nullability`, `negation`, `finiteness` and `finiteExclusion` are not pinned in core. They are covered only indirectly, through each dialect's characterisation rows. Mutation (all `compilePredicate` mutants killed) shows nothing is lost today, but a rename of the title to the single field it asserts is more honest.
**Fix:** Rename it to "a rule from `rules` reaches toRenderable (reservedColumns)". Alternatively add one `NullOnNonNullableColumn` row (a `Declared` nullability) to cover a second field.

---

Tool notes, not findings (both tools do what the brief asks):
- `mutation.mjs` matches a moved mutant with `into.includes(key(x))`. It never consumes the counterpart it matched, so two base shell mutants that share a key would both be satisfied by a single killed mutant in core. Today all four keys per package are distinct, so the compare is sound.
- `scan.mjs` section 9 reads `lib/index.d.ts` from disk and cannot tell a stale build from a fresh one. It relies on the documented `tsc -b` run first. Section 7 hard-codes `(Opus|Sonnet) 5.5` in the trailer regex.

_Reviewed: 2026-11-16T19:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
