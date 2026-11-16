# ADR-QD-164 — Policy tag arity is stated once

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-164                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-11-16                                     |
> | Status         | Accepted — applies ADR-QD-152; reads ADR-QD-090, ADR-QD-101, ADR-QD-099; keeps ADR-QD-073, ADR-QD-077 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.3 (2026-11-16): review iteration 1 IN-05: Leaf to Many is refused by the src readers, LeafNeeds.ts first (ARCH-98)<br>1.2 (2026-11-16): review iteration 1 WR-02: the trace children are a closed per-arity table (ARCH-98)<br>1.1 (2026-11-16): review iteration 1 WR-01: the after table says what each edit did on the base (ARCH-98)<br>1.0 (2026-11-16): Initial release (ARCH-98, CCR-QD-442) |

---

## Context

How many children a policy node has is a fact about its tag: none (a leaf), exactly one (a wrapper: `Not`, `Obliged`,
`Labeled`) or any number (`AllOf`, `AnyOf`, `Rules`). At the phase base (`8d87d837`) that fact was written four times and
tied by nothing:

- `childrenOf` in `Policy.ts`, one `Match.tagsExhaustive` arm per tag;
- `LeafPolicy`, a hand-written `Exclude<Policy, { _tag: "AllOf" | "AnyOf" | "Rules" | "Not" | "Obliged" | "Labeled" }>`;
- `PolicyCases`, whose arm signatures say what each tag receives (a node only, one child, an array or rows);
- `Decision.ts`'s `leafTags` array and three `Match.whenOr` lines in `traceShapeOf`, which `foldTrace` reads to decide
  which of a trace node's children an arm is handed.

Each is exhaustive over the tags, so a new tag fails to compile everywhere. Moving an existing tag's arity in one place and
not another does not: every list still names every tag exactly once.

The base experiment (`51-BASE-EXPERIMENT.md`, measured on the unchanged base) shows how far that goes. The roadmap's edit,
moving `Not` from the Wrapper `Match.whenOr` to the Many one in `traceShapeOf`, compiles: `node_modules/.bin/tsc -p
tsconfig.test.json` ends `exit 0`, because the three `whenOr`s still cover all sixteen tags. All 32 single-tag moves
(each of the 16 tags to each of the other two arities) compile. The existing tests catch 8 of the 32 (`Decision.test.ts`:
`HasRole`, `Not`, `AllOf` and `Rules`, each to both other arities); the table test written for this change,
`TraceShape.test.ts`, caught 32 of 32. Three edits to `childrenOf`'s own arms (`Not: () => []`, `Not` returning its child
twice, `AllOf: () => []`) also compile and fail only at runtime, in the `Policy` and `Explanation` tests.

`foldTrace` is the place the wrong arity does harm silently. It hands an arm the children its tag's arity names, so a
wrapper moved to Many receives an array where it expected one result, and a leaf moved to Wrapper is handed a child it
should never have been given.

## Decision

1. **One record states each tag's arity** (D-01a). `POLICY_ARITY` in `packages/core/src/PolicyArity.ts` is
   `{ HasPermission: "Leaf", …, Not: "Wrapper", …, AllOf: "Many", … } as const satisfies { readonly [tag: string]: Arity }`,
   applying ADR-QD-152's keyed-record pattern; `Arity` is `"Leaf" | "Wrapper" | "Many"`. It sits in a package-private
   sibling and not in `Policy.ts`, because `index.ts` does `export * from "./Policy.ts"`: a record declared there would be
   public API, the API-surface gate (`scripts/check-api-surface.mjs`) would demand an overview row for it, and the
   changeset would be a minor (ADR-QD-099, D-02). It is out of the barrel, and `PolicyArity.test.ts` asserts the barrel does
   not carry it.
2. **The module imports nothing.** madge counts an `import type` as an edge, and `Policy.ts` must import `PolicyArity.ts`;
   a record that named `Policy` would be a cycle. So the record cannot be keyed by `Policy["_tag"]` where it is declared.
   `Policy.ts` closes it over its own tag union instead: a module-local `ArityRecord` is `{ readonly [K in Policy["_tag"]]: Arity }`,
   and `TagsOfArity<A, R = typeof POLICY_ARITY>` constrains `R` to `ArityRecord` and to no key outside `Policy["_tag"]`. A
   record missing a tag fails the first constraint and one naming a stray tag fails the second, both as TS2344.
3. **`childrenOf` is typed by arity.** Its handler record is written `satisfies ChildArms<Policy, typeof POLICY_ARITY>`, a
   mapped type giving each tag's arm the children its arity allows (`ChildrenOf`: `readonly []`, `readonly [Child]`, or
   a `ReadonlyArray<Child>`). Its public signature, `(self: Policy) => ReadonlyArray<Policy>`, is unchanged, and so are its
   runtime arms and `Match.tagsExhaustive`.
4. **`LeafPolicy` is derived.** `Extract<Policy, { readonly _tag: TagsOfArity<"Leaf"> }>` replaces the hand-written
   `Exclude`. It is the same type (`PolicyArity.tst.ts` proves it by `toBe` against the old expression), so its overview row
   stands, and `LEAF_NEEDS`, keyed by `LeafPolicy["_tag"]` (ADR-QD-163), now follows the record.
5. **The trace shape reads the record.** `Decision.ts`'s `traceShapeOf` is `POLICY_ARITY[tag]`, one read. `leafTags`, the
   `TraceShape` alias and the `Match.whenOr` chain are deleted; `traceChildrenOf`'s behaviour is unchanged. It selects a
   node's children through a closed table with one row per `Arity` word (`as const satisfies { readonly [A in Arity]: … }`),
   not a ternary whose last arm is an unconditional else, and `ChildrenOf`'s last branch is `A extends "Many" ? … : never`.
   So a fourth arity word is a missing row (TS2741 in `Decision.ts`) and not a node silently handed every child; the
   proof was made by adding `"Pair"` to `Arity` temporarily.
6. **`PolicyCases` and `TraceCases` stay hand-written and are tied by tstyche** (D-06, D-06a). Their arms are not a function
   of arity alone: `Rules` receives `RuleResult` rows and not an array of results, and a trace wrapper's child is
   `R | undefined`. A generated type would have to special-case exactly those, so it would state the facts again less
   legibly. `PolicyArity.tst.ts` reads each arm's own parameter list into an arity and compares it to the record's, for all
   32 single-tag moves, with a negative control per case; the negatives are `@ts-expect-error` directives, which
   `pnpm typecheck` consumes, so an unused one is itself an error.
7. **`traceStep` keeps its per-tag `Match`** (D-07). It dispatches to the `TraceCases` arm of the node's tag, which arm and
   not how many children; that is a different fact from arity, and it is still sixteen arms because each calls a different
   member of the cases record.

## The Many type

The type an arm of a Many tag may return is `ReadonlyArray<Child> & { readonly 0?: never }` (`ChildrenOf`'s third branch).
The extra `0` property is deliberate. An array literal whose contextual type has a `0` property is typed as a tuple, and a
tuple's element `0` is not assignable to `never`. So a Wrapper arm left behind when its tag moves to Many, `(p) => [p.policy]`,
fails with `is not assignable to type 'never'`, while an existing array (`p.policies`) or a mapped one (`p.rules.map(…)`) is
accepted. Without it a one-element tuple is an array, and the base experiment's own move would compile again.

It has one gap, and it is stated and not hidden. A Many arm may be empty, so `readonly []` is assignable to a Many arm,
and the move Leaf to Many leaves `childrenOf` accepting every arm it had. That move is refused elsewhere: a leaf moved
to Many drops out of `LeafPolicy`, so its readers in `src` disagree at that tag, before any test file is read:
`LeafNeeds.ts`'s table, keyed by `LeafPolicy["_tag"]`, has a row for a tag that is no longer a leaf
(`LeafNeeds.ts(165,3): error TS2353: … 'HasRole' does not exist in type …`), and `Policy.ts`'s `leafCases`, `Walk.ts`,
`Predicate.ts` and `Simplify.ts` fail with it. The other direction, Many to
Leaf, is refused by the arm itself, which would return an array where `readonly []` is required. A Many arm that returns the wrong array, or an empty one, is a runtime fact, caught by
`PolicyArity.test.ts`'s per-tag lockstep (every reader agrees on the child count) and by `Policy.test.ts`'s own lockstep
property.

## Why renderTrace and diffTraces keep their own walks

ARTY-03 asked whether the other trace walkers should read the record too. They do not, and `foldTrace` is not replaced.

`renderTrace` is pre-order: it writes a node's line when it meets the node, before any child, indented by depth and capped
by `indentLimit`. A bottom-up fold produces a node's result only after its children's, so rendering through one would
build every line first and indent and order them in a second pass. `diffTraces` walks two trees in lockstep, matching
child *i* of one against child *i* of the other and reporting a position present in only one; a fold takes one tree.
Neither fits the shape `foldTrace` has, and neither is helped by being given an arity.

They also do not read an arity today, and that is a behaviour this change pins and does not alter (BEH-QD-595):
`renderTrace` renders every child a node carries, a leaf's included, and `diffTraces` compares every child position present
in either tree, under every tag. The planning probe on the base found `renderTrace` rendering all three children under each
of the 16 tags and `diffTraces` comparing them, while `foldTrace` dropped them; `PolicyArity.test.ts` pins both sides for
all 16 tags. So a single arity read would be wrong for them: a trace built by an evaluator has no foreign children under a
leaf, but a caller-held trace (`Trace.children` is public) may, and a renderer or a diff should show what is there. Only `foldTrace`, whose arms are told "a leaf has none", must not let a leaf's foreign children reach a fold
(INV-QD-348).

`foldTrace` stays public and byte-for-byte unchanged in its signature, its stack-safe loop (`foldTreeBy`) and its sharing
and cycle rules, with its barrel pin and ADR-QD-090's and ADR-QD-101's tests untouched. Only the private function it reads
the shape through changed, and INV-QD-090 is kept as written, not restated.

## The experiment, after

`tools/proofs.mjs` (run on the committed tree, exit 0) makes each of the following edits temporarily and runs
`node_modules/.bin/tsc -p tsconfig.test.json`; each is then restored. The control, no edit, is `exit 0`.

| Edit | On the base (`base-experiment/moves.tsv`) | Result after |
|---|---|---|
| the base experiment's patch | `move Not Wrapper->Many`: `tsc_exit` 0 | cannot be applied: its list is deleted (`git apply --check` refused, `patch failed: packages/core/src/Decision.ts:435`) |
| record: `Not` Wrapper to Many (the same move, where the arity now lives) | `move Not Wrapper->Many`: `tsc_exit` 0 | `exit 1`, `Policy.ts(1060,18): error TS2322: Type 'Policy' is not assignable to type 'never'` |
| record: `Obliged` Wrapper to Many | `move Obliged Wrapper->Many`: `tsc_exit` 0 | `exit 1`, `Policy.ts(1061,22)`, the same error |
| record: `AllOf` Many to Wrapper | `move AllOf Many->Wrapper`: `tsc_exit` 0 | `exit 1`, `Type 'readonly Policy[]' is not assignable to type 'readonly [Policy]'` |
| record: `Rules` Many to Wrapper | `move Rules Many->Wrapper`: `tsc_exit` 0 | `exit 1`, `Type 'Policy[]' is not assignable to type 'readonly [Policy]'` |
| record: `Not` Wrapper to Leaf | `move Not Wrapper->Leaf`: `tsc_exit` 0 | `exit 1`, `Type '[Policy]' is not assignable to type 'readonly []'` |
| record: `HasRole` Leaf to Wrapper | `move HasRole Leaf->Wrapper`: `tsc_exit` 0 | `exit 1`, `Type '[]' is not assignable to type 'readonly [Policy]'` |
| record: `HasRole` Leaf to Many (the gap above) | `move HasRole Leaf->Many`: `tsc_exit` 0 | `exit 1`, `LeafNeeds.ts(165,3): error TS2353`, `'HasRole' does not exist in type`: `LeafPolicy`'s readers in `src` refuse it (`leafCases`, `Walk.ts`, `Predicate.ts` and `Simplify.ts` as well) |
| record: `HasRole` removed, an unknown tag added, an unknown arity word | no counterpart: the base had no record, and `moves.mjs` measured none of the three | `exit 1`, `TS7053`, `TS2344`, `TS2322` |
| `childrenOf` arm: `Not` returns none, or two | `arm Not`: `tsc_exit` 0 for both | `exit 1`, `TS2322` at the arm |
| `childrenOf` arm: `AllOf: () => []` | `arm AllOf`: `tsc_exit` 0 | `exit 0`: a Many may be empty; `Policy.test.ts`'s lockstep property refuses it at runtime |

On the base all 32 single-tag moves of `traceShapeOf` and all three `childrenOf` arm edits compiled (`moves.tsv`,
`tsc_exit` 0 on every row). After, the equivalent record edits and the two `Not` arm edits fail to compile. The three
structural rows (a tag removed, a stray tag, an unknown word) have no base counterpart, because there was no record to
edit, and the nearest base edit did not compile either: a tag deleted from `leafTags` leaves `Match.exhaustive` with that
tag unmatched (`Decision.ts(439,3)`, TS2345; measured by the phase's code review on a copy of the base, not part of
`moves.tsv`), which is the Context's "a new tag fails to compile everywhere". The last row is the one the type was never
going to see.

The evidence's order is part of the record. `TraceShape.test.ts` was written and committed on the base, by hand from
INV-QD-090 and `childrenOf` and independent of the record (`dfb137ea`), so it passes on the old code and on the new; the
base experiment followed (`4288068a`). The RED commit for the change (`1168fdab`) is the two new test files and fails with the module
`PolicyArity.ts` absent. Its `diffTraces` expectation omitted the three optional keys that `diffTraces` sets as explicit
`undefined`; that was a defect in the test, the same 16 failures held on the base, and it was corrected in a test-only
commit of its own (`74917a4d`) between RED and GREEN, so the RED commit stays tests-only and the source commit
(`80062b1c`) carries exactly `PolicyArity.ts` and `Decision.ts`. `childrenOf` and `LeafPolicy` follow in `88613394`.

## Mutation

No benchmark was run: the change replaces a `Match.whenOr` chain on a fold that has no in-repo caller with one record read,
and nothing on the evaluation path changes (D-11). Mutation was measured instead. The base, on the unchanged tree with
`pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Policy.ts,packages/core/src/Decision.ts'`:

| File | Score | Detected / scored | Survived or uncovered |
|---|---|---|---|
| `Decision.ts` | 0.9585798816568047 | 162 / 169 | 7 (6 survived, 1 not covered) |
| `Policy.ts` | 0.9864864864864865 | 146 / 148 | 2 |

The deleted region of `Decision.ts` (`leafTags` up to `traceChildrenOf`) held 2 detected mutants and one survivor, the
`""` to `"Many"` string on the Many `whenOr` line. The rule the comparison applies is ADR-QD-163's (Phase 50's): no new
survivor, no fall in `Policy.ts`, and a fall in `Decision.ts` is a pass only when its survivor set is otherwise unchanged
and the loss is killed mutants that left with the deleted code. `PolicyArity.ts` is a static initialiser and type
declarations, and `stryker.config.mjs` sets `ignoreStatic: true` (ADR-QD-076), so it is expected to have no scored mutant;
the after-run reports it with the others.

## Consequences

- **An arity move in one place and not another does not compile.** Moving a tag in `POLICY_ARITY` is a type error in the
  tag's `childrenOf` arm, in `LeafPolicy`'s readers and in the `PolicyCases` and `TraceCases` ties (INV-QD-347,
  [BEH-QD-591](../behaviors/25-inspection.md#beh-qd-591-every-policy-tag-has-exactly-one-arity-stated-once),
  [BEH-QD-592](../behaviors/25-inspection.md#beh-qd-592-leafpolicy-is-the-tags-the-record-calls-leaf-and-childrenof-is-typed-by-arity),
  [BEH-QD-594](../behaviors/25-inspection.md#beh-qd-594-policycases-and-tracecases-arms-agree-with-the-record)).
- **The fold reads what the record says.** `foldTrace` hands an arm none of a leaf's children, the first of a wrapper's and
  all of a many's, by one read, and a leaf's foreign children never reach a fold
  (INV-QD-348, [BEH-QD-593](../behaviors/18-explanation.md#beh-qd-593-foldtrace-hands-each-arm-its-tags-children-by-the-record)).
- **The other two walks are unchanged and pinned**
  ([BEH-QD-595](../behaviors/18-explanation.md#beh-qd-595-rendertrace-and-difftraces-walk-every-present-child-and-read-no-arity)).
  A phase that wants them to read an arity starts from this record and must decide first what a leaf's foreign children are
  for.
- **No public surface moved.** No export was added or removed (the API-surface gate reports the base's 932), so
  `spec/overview.md` and AGENTS.md are unchanged. `LeafPolicy`'s declaration changed and its type did not. The changeset is
  a `@qadi/core` patch.
- **The one gap is named.** Leaf to Many is refused by `LeafPolicy`'s readers and not by `childrenOf`, and an empty Many
  arm is accepted by the compiler and refused by the lockstep tests.
