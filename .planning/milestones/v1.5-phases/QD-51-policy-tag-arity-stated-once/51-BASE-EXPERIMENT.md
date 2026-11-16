# QD-51 Base experiment: an arity move compiles on the base

Measured on `phase_base` 8d87d837beab28e8d0610eab8b6c274d45152374 (no `packages/*/src` change since), by
`tools/moves.mjs`, which edits `Decision.ts` or `Policy.ts` temporarily, measures, and restores both files
(`git status` of `packages/core/src` is clean afterwards). Raw rows: `base-experiment/moves.tsv`.
Every measurement runs `node_modules/.bin/tsc -p tsconfig.test.json` (the whole test graph, no emit) and
vitest over the `TraceShape`, `Decision`, `Policy` and `Explanation` tests.

Control row (no edit): tsc exit 0, 0 failing tests in all four files.

## Experiment 1

The roadmap's edit: on the base, move the wrapper tag `Not` from the Wrapper `Match.whenOr` to the Many
one in `Decision.ts`'s `traceShapeOf`. The exact patch (`base-experiment/not-to-many.patch`):

```diff
diff --git a/packages/core/src/Decision.ts b/packages/core/src/Decision.ts
index c635602f..97da8fa2 100644
--- a/packages/core/src/Decision.ts
+++ b/packages/core/src/Decision.ts
@@ -435,8 +435,8 @@ const traceShapeOf: (tag: Trace["policyTag"]) => TraceShape = Match.type<
   Trace["policyTag"]
 >().pipe(
   Match.whenOr(...leafTags, (): TraceShape => "Leaf"),
-  Match.whenOr("Not", "Obliged", "Labeled", (): TraceShape => "Wrapper"),
-  Match.whenOr("AllOf", "AnyOf", "Rules", (): TraceShape => "Many"),
+  Match.whenOr("Obliged", "Labeled", (): TraceShape => "Wrapper"),
+  Match.whenOr("AllOf", "AnyOf", "Rules", "Not", (): TraceShape => "Many"),
   Match.exhaustive,
 );
```

The added Many line is `Match.whenOr("AllOf", "AnyOf", "Rules", "Not", (): TraceShape => "Many")`. The matcher stays
exhaustive because the three `whenOr`s still cover all sixteen tags, so nothing forces the edit to be
reconciled with `childrenOf`.

- Command: `node_modules/.bin/tsc -p tsconfig.test.json`
- Result: `exit 0` (the `move Not Wrapper->Many` row's `tsc_exit` is 0). The wrong arity compiles.
- At runtime `TraceShape.test.ts` fails 1 test on it and `Decision.test.ts` fails 1 test.
- Revert: the harness restores `Decision.ts` in a `finally`; `git status --porcelain -- packages` prints nothing.

## Experiment 2

Three edits to `childrenOf`'s arms in `Policy.ts`, each leaving the type checker silent
(`tsc -p tsconfig.test.json`, `tsc_exit` 0 on the base for all three). Failing tests per file, from `moves.tsv`:

| Edit | tsc_exit | TraceShape | Decision | Policy | Explanation |
|---|---|---|---|---|---|
| `Not: () => []` | 0 | 0 | 0 | 5 | 9 |
| `Not: (p) => [p.policy, p.policy]` | 0 | 0 | 0 | 1 | 0 |
| `AllOf: () => []` | 0 | 0 | 0 | 2 | 15 |

They fail only at runtime, in the Policy and Explanation tests; the compiler accepts all three.

## Matrix

32 of 32 single-tag moves compile on the base; TraceShape.test.ts fails on 32 of 32; Decision.test.ts fails on
8 of 32.

The moves Decision.test.ts catches (`Decision_failed` > 0): `HasRole` Leaf->Wrapper and Leaf->Many, `Not`
Wrapper->Leaf and Wrapper->Many, `AllOf` Many->Leaf and Many->Wrapper, `Rules` Many->Leaf and Many->Wrapper.
The existing tests see a quarter of the moves; the table sees all of them.

Move table (a move is one tag's shape changed in `traceShapeOf`; failures are tests failing per file):

| Tag | Move | tsc exit | TraceShape | Decision | Policy | Explanation |
|---|---|---|---|---|---|---|
| HasPermission | Leaf->Wrapper | 0 | 1 | 0 | 0 | 0 |
| HasPermission | Leaf->Many | 0 | 1 | 0 | 0 | 0 |
| HasRole | Leaf->Wrapper | 0 | 1 | 1 | 0 | 0 |
| HasRole | Leaf->Many | 0 | 1 | 1 | 0 | 0 |
| HasAttribute | Leaf->Wrapper | 0 | 1 | 0 | 0 | 0 |
| HasAttribute | Leaf->Many | 0 | 1 | 0 | 0 | 0 |
| HasResourceAttribute | Leaf->Wrapper | 0 | 1 | 0 | 0 | 0 |
| HasResourceAttribute | Leaf->Many | 0 | 1 | 0 | 0 | 0 |
| HasRelationship | Leaf->Wrapper | 0 | 1 | 0 | 0 | 0 |
| HasRelationship | Leaf->Many | 0 | 1 | 0 | 0 | 0 |
| HasAction | Leaf->Wrapper | 0 | 1 | 0 | 0 | 0 |
| HasAction | Leaf->Many | 0 | 1 | 0 | 0 | 0 |
| HasActed | Leaf->Wrapper | 0 | 1 | 0 | 0 | 0 |
| HasActed | Leaf->Many | 0 | 1 | 0 | 0 | 0 |
| HasNotActed | Leaf->Wrapper | 0 | 1 | 0 | 0 | 0 |
| HasNotActed | Leaf->Many | 0 | 1 | 0 | 0 | 0 |
| HasCustom | Leaf->Wrapper | 0 | 1 | 0 | 0 | 0 |
| HasCustom | Leaf->Many | 0 | 1 | 0 | 0 | 0 |
| HasSignature | Leaf->Wrapper | 0 | 1 | 0 | 0 | 0 |
| HasSignature | Leaf->Many | 0 | 1 | 0 | 0 | 0 |
| Not | Wrapper->Leaf | 0 | 1 | 4 | 0 | 0 |
| Not | Wrapper->Many | 0 | 1 | 1 | 0 | 0 |
| Obliged | Wrapper->Leaf | 0 | 1 | 0 | 0 | 0 |
| Obliged | Wrapper->Many | 0 | 1 | 0 | 0 | 0 |
| Labeled | Wrapper->Leaf | 0 | 1 | 0 | 0 | 0 |
| Labeled | Wrapper->Many | 0 | 1 | 0 | 0 | 0 |
| AllOf | Many->Leaf | 0 | 1 | 3 | 0 | 0 |
| AllOf | Many->Wrapper | 0 | 1 | 3 | 0 | 0 |
| AnyOf | Many->Leaf | 0 | 1 | 0 | 0 | 0 |
| AnyOf | Many->Wrapper | 0 | 1 | 0 | 0 | 0 |
| Rules | Many->Leaf | 0 | 1 | 1 | 0 | 0 |
| Rules | Many->Wrapper | 0 | 1 | 1 | 0 | 0 |

## After

51-03 re-applies the patch and the equivalent record edits through `tools/proofs.mjs` and records that they
fail to compile.
