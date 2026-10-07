# ADR-QD-090 — A tree is folded through one seam, and nesting depth is a property of the policy

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-090                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Accepted — amends ADR-QD-034, ADR-QD-024; amended by CCR-QD-190 (case-wise folds) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-10-07): the seam gains a case-wise interface beside the array form — `foldTreeBy`, `foldPolicyCases`, `foldMatcherCases`, `foldExplanationCases` (CCR-QD-190)<br>1.1 (2026-10-07): `TreeFold` is not reachable from outside `@qadi/core` (ADR-QD-099, CCR-QD-188) |

---

## Context

ARCH-02 found that folding a `Policy` bottom-up was a technique each module
re-implemented, and that the facts belonging to the ADT were restated wherever
they were needed. Verified at `1caf04c`, on Node 22.22.0 with the default stack:

- **C2.** Three modules carried their own post-order explicit-stack loop
  (`policyDepth`, `simplify`, `explain`). `simplify` and `explain` differed only in
  the rebuild function and an error label. `policyDepth`'s variant had no throws,
  so a traversal bug there would have *under*-reported nesting depth — the
  direction [INV-QD-037](../invariants.md) calls dangerous.
- **C3, N1, N2.** Six more walkers recursed natively, each with its own policy
  toward nesting depth, or none. `renderExplanation(explain(not^n(…)))` overflowed
  at about n = 734 — *lower* than `explain` itself handles, so a stack-safe
  producer fed a stack-unsafe consumer. `inspect` overflowed at about 1,759,
  `remedyEdits` at about 2,052 (`rules` below 1,000), and every `Matcher` walker
  had no guard at all (`referencesAction(size^10000(eq(action())))` threw a raw
  `RangeError`).
- **C3e.** `evaluateNode`'s `Not`/`Obliged`/`Labeled` arms built the child effect
  eagerly. `evaluate(labeled^5000(…), { maxDepth: Infinity })` failed with a `Die`
  cause carrying `RangeError`, which is a decision becoming a defect (AGENTS.md §4).
  A `RangeError` inside an `Effect` is a defect, not a typed failure.
- **C5, C6.** `POLICY_TAGS_BY_TAG` (`Evaluate.ts`) and `TRACE_TAGS_BY_TAG`
  (`Decision.ts`) were byte-for-byte copies. Adding a `Policy` tag was compiler-forced
  at nine sites plus five hand sites in `Policy.ts`.
- **N3.** [INV-QD-037](../invariants.md) said `policyDepth(p) <= n` held *exactly
  when* `evaluate(p, { maxDepth: n })` did not raise `PolicyTooDeep`. That was false
  in the converse direction: `anyOf([hasRole("editor"), not(not(not(hasRole("x"))))])`
  has `policyDepth` 4, yet `evaluate(…, { maxDepth: 1 })` succeeded for an editor
  because `First` short-circuits before descending. Whether a policy was "too deep"
  depended on *who was asking*.
- **N4.** Whether `toPredicate` raised `PolicyTooDeep` or the fields refusal
  depended on child order, because `restrictsFields` returned on the first hit.
- **N5.** A cyclic (hand-mutated) policy did not terminate.

## Decision

**A tree is folded through one seam.** `TreeFold.ts` owns stack-safe post-order
folding (`foldTree`). `Policy.ts`, `Explanation.ts` and `Matcher.ts` are thin
adapters over it (`foldPolicy`, `foldExplanation`, `foldMatcher`), each supplying
only its ADT's children function. `foldTree` is deliberately kept out of the barrel
(AGENTS.md §9) and is not reachable from outside `@qadi/core` (ADR-QD-099; it was
the `@qadi/core/TreeFold` subpath until the `./*` export was removed).

**`Policy.ts` owns the per-tag structural facts.** `POLICY_TAGS` (derived from the
schema union with `Schema.toTaggedUnion`, so ADR-QD-002's "one definition" holds),
`childrenOf`, `fieldsOf` and the private `matcherOf`. A walker keeps only its
*semantic* per-tag arms. Re-running the probe procedure on the finished tree
reports compile errors for a new tag in `Policy.ts` plus five other sites
(`Evaluate.ts`'s switch, `Explanation.ts`, `Predicate.ts`'s `compileTree`,
`Simplify.ts`, devtools' `Remedies.ts`), down from eight outside `Policy.ts`.

**Nesting depth is a property of the policy, and is checked first.** `evaluate`
and `toPredicate` reject `policyDepth(policy) > maxDepth` with
`PolicyTooDeep({ maxDepth })` before any node is visited. `policyDepth` is
memoised per policy object in a module-scope `WeakMap`. [INV-QD-037](../invariants.md)
is now exact in both directions, and `toPredicate`'s precedence no longer depends
on child order. `evaluateNode` keeps its own per-node guard as defense in depth.

**Matcher nesting counts.** A matcher-bearing leaf (`HasAttribute`,
`HasResourceAttribute`) contributes `matcherDepth(matcher)` to `policyDepth`, so
the same root check bounds `evaluateMatcher`'s native recursion and one
nesting-depth semantics covers everything the evaluator recurses through.

**A wrapper's child is suspended.** `Not`, `Obliged` and `Labeled` build their
child under `Effect.suspend`, and translation's `Negation` does the same, so
building an effect cannot recurse natively and no `maxDepth` a caller supplies can
turn a decision into a defect.

**A cycle throws.** `foldTree` throws `Error("foldTree: the tree contains a cycle")`
on a node met again while open. Pure functions here already throw on broken
invariants, and a named, immediate defect beats a hang.

**Devtools gets a package-private twin.** `Inspect.ts` zips an `Explanation` with a
`Trace` and a path top-down, which needs a fold over *virtual* position nodes that
no domain adapter in core can describe. AGENTS.md §9 keeps `foldTree` out of core's
barrel and §1 forbids importing a core subpath, so
`packages/devtools/src/model/TreeFold.ts` is a copy of the ~35-line mechanism,
covered by the same test file and mutation-gated by the devtools run.
`requirementsOf` and `witness` use core's public `foldPolicy`/`foldMatcher`, so
per-tag knowledge stays single-owner; only the traversal mechanism exists twice.

### What stays

ADR-QD-034's switches stay: `SWITCH_BUDGET` is still 4 (`evaluateNode`,
`mergeFields`, `evaluateMatcher`, `resolveRef`), and `evaluateMatcher` is not made
iterative — it recurses over the *value* as well as the matcher and is a hot path.
No new `Effect.fnUntraced` (ADR-QD-073). No new error class: every nesting-depth
failure reuses `PolicyTooDeep`.

### Measured: the root pre-check and the suspended wrappers

Both are on the evaluation path, so both were measured, `pnpm bench`-style
(`Evaluate.bench.ts`, which gained a `wrapper-heavy` workload: ten nested
`labeled`/`not`/`obliged`, because `deep` is built from `allOf`/`anyOf`/`not` only
and under-samples the arms this changes). Absolute throughput on the development
machine moves by about 30% between runs (AGENTS.md §5a), so the comparison is
**interleaved A/B**, four runs of each alternating, medians of ops/s:

| Workload | Before the pre-check | With the pre-check | Change |
| -------- | -------------------- | ------------------ | ------ |
| `one node` | ≈107k | ≈100k | −6% |
| `wide` (`allOf` of 8) | ≈83k | ≈87k | +5% |
| `deep` (10 levels) | ≈67k | ≈66k | −2% |
| `wrapper-heavy` | ≈85k | ≈83k | −2% |
| `matcher-heavy` | ≈68k | ≈63k | −8% |
| `resolver miss` | ≈60k | ≈61k | 0% |
| `obligation-heavy` | ≈58k | ≈58k | −1% |
| `field-heavy` | ≈42k | ≈41k | −2% |

and, with the pre-check in both, suspending the three wrapper children:

| Workload | Pre-check only | Pre-check + `Effect.suspend` | Change |
| -------- | -------------- | ---------------------------- | ------ |
| `one node` | ≈113k | ≈112k | −1% |
| `wide` | ≈86k | ≈84k | −2% |
| `deep` | ≈67k | ≈67k | 0% |
| `wrapper-heavy` | ≈87k | ≈82k | −6% |
| `matcher-heavy` | ≈66k | ≈65k | −3% |
| `resolver miss` | ≈64k | ≈61k | −4% |
| `obligation-heavy` | ≈61k | ≈56k | −8% |
| `field-heavy` | ≈40k | ≈39k | −4% |

Every workload is inside the run-to-run spread of the *baseline's own* four runs
(for example `one node` alone ranged 103k–112k before the pre-check). The
`obligation-heavy` and `field-heavy` workloads contain no wrapper node at all, so
their apparent −8% and −4% in the second table is machine drift rather than an effect of
the change. Neither threshold the plan set (outside noise on a memo hit) was
crossed, so the fallbacks — D-02-e(a) spec-only and D-02-g(b) a `maxDepth`
ceiling — were not taken. Ranges, not figures: only the direction transfers.

## Amendment (ARCH-17, 2026-10-07)

The seam is kept and its interface widens. `foldTree`'s `combine(node, children:
ReadonlyArray<R>)` throws away a fact the ADT states — a `Not` has one child and a
`Rules` row has one condition — so every adapter that needed the fact rebuilt it
with a runtime check no input could reach: seven "exactly one child" helpers
(`Simplify.ts`, `Explanation.ts` ×3, `Predicate.ts`, devtools' `Remedies.ts` ×2) and
five `Rules` length or alignment checks, one of them silent (`renderExplanation`'s
`Table` arm read `conditions[i]`, typed `string | undefined`, straight into a
template literal). Each was an unkillable mutant — the guard's failing branch cannot
run — and a line a reader had to convince themselves was dead.

**The case-wise form.** `Policy.ts`, `Matcher.ts` and `Explanation.ts` each gain
`fold…Cases(self, cases)`: one arm per tag, each receiving its children in the
tag's own shape — a wrapper's child as `R`, a combinator's as `ReadonlyArray<R>`, a
`Rules` or `Table` row as `{ rule | row, result }`. A missing arm is TS2741 and an
arm that treats a wrapper's child as an array is TS2339 (`Policy.tst.ts`,
`Matcher.tst.ts`, `Explanation.tst.ts`). `leafCases` and `leafMatcherCases` build
every leaf arm from one function, so a consumer with uniform leaves lists only its
composites and a new leaf tag is a compile error in the helper.

**Locality.** Each dispatcher is a module-scope `Match.tagsExhaustive` beside the
`childrenOf` it must agree with. A child it reads that `childrenOf` does not list
throws in `foldTreeBy`; a child `childrenOf` lists that it never reads is silent,
so a lockstep property test in each ADT's test file asserts that the arms receive
exactly `childrenOf(node)`'s children, by identity, once each, in order.

**One loop.** `TreeFold.ts` exports `foldTreeBy`, which `combine(node, resultOf)`
reads a child's result through by naming it; `foldTree` and `foldTreeBy` are two
projections of one private `walk`. The only check that remains is `resultOf` on a
node the tree did not list as a child, and it *is* reachable (`TreeFold.test.ts`),
so its mutants are killable, unlike the seven helpers'. `foldTreeBy` is as private
as `foldTree` (ADR-QD-099): the barrel exports the three case-wise folds, not it.

**The array form stays**, and three in-repo folds stay on it on purpose. It is the
right interface for a fold that treats children alike, and `referencesRef`
(`referencesAction`/`referencesResource`) runs once per matcher-bearing node on every
evaluation that carries no action or resource — a case-form dispatch there would
cost it ≈110–150 ns a call for no safety gain, since a homogeneous fold has no arity
to check. `matcherDepth`, `restrictsFields` and `policyDepth` stay on it too (below).

### Measured

On a machine under load (the 1-minute load average was in the dozens, then
well past a hundred), `pnpm bench`'s sequential runs were not usable, so the
comparison is an **interleaved, in-process A/B** as ARCH-16's was: the same
workloads built from HEAD's sources (A) and from the branch's (B) in one Node
process, alternating which runs first, 150 batches of 200–400 calls each, the
25th-percentile batch reported in µs per call (the minimum is noisier under
load, the median noisier still). It is **not** `Evaluate.bench.ts` and is not
vitest's harness; `Fold.bench.ts` is the committed workload set. An **A/A
control** — HEAD against an identical copy of HEAD — measured the harness's own
second-position bias at +0–7% (mean ≈ +3%), which is the number to read the rows
against, not 0%.

| Workload | A | B | B/A | A/A control |
| -------- | -: | -: | -: | -: |
| `evaluate` — one node | 19.9 | 20.5 | 1.03 | 1.05 |
| `evaluate` — matcher-heavy | 31.7 | 33.0 | 1.04 | 1.06 |
| `evaluate` — fresh depth 5 / 10 / 20 / 40 | 30.2 / 37.8 / 52.8 / 81.4 | 31.6 / 39.2 / 55.0 / 85.0 | 1.05 / 1.04 / 1.04 / 1.05 | 1.05 / 1.04 / 1.04 / 1.04 |
| `policyDepth` — depth 40, fresh root | 31.2 | 30.8 | 0.99 | 1.00 |
| `referencesAction` — `eq` / `fieldMatch` | 0.45 / 0.67 | 0.46 / 0.70 | 1.04 / 1.05 | 1.00 / 0.99 |
| `toPredicate` — mixed / depth 10 | 76.5 / 156.1 | 50.6 / 82.1 | **0.66 / 0.53** | 1.01 / 1.00 |
| `simplify` — depth 40 / wrapper-heavy / 3-row rules | 41.1 / 2.60 / 2.15 | 43.8 / 2.80 / 2.50 | 1.07 / 1.08 / 1.16 | 1.00 / 1.01 / 1.02 |
| `explain` — depth 40 / wrapper-heavy / 3-row rules | 36.1 / 2.56 / 2.03 | 38.0 / 2.84 / 2.50 | 1.05 / 1.11 / 1.23 | 1.04 / 1.01 / 1.07 |
| `renderExplanation` — depth 40 | 56.3 | 60.3 | 1.07 | 1.02 |

What the table says. The evaluate path (the first five rows) is inside the
control's bias: nothing the evaluator reaches per request got slower. `toPredicate`
is **34–47% faster**, because the case form replaces `compileNode`'s `Match.value(node)`
rebuilt per *node* with one cases object built per call. `simplify`, `explain` and
`renderExplanation` — off the request path, run by tooling and admin screens — pay
for the extra dispatch: ≈5–10% on a deep tree and up to ≈15–23% on a three-row table,
where the fixed per-call cost (one cases object, one reader closure, one dispatcher
closure per node) is a larger share of ≈2 µs. That is a cost the plan expected to be
neutral; it was not, and it is recorded rather than argued away.

A last simplification of `TreeFold.ts` (the positional-results flag removed, the
memo handed in rather than bound later) was re-measured under heavier load and
gave the same picture (`toPredicate` 0.65 / 0.50, `simplify` 1.16 / 1.13 / 1.17,
the evaluate rows inside the control); the table is the cleaner of the two runs.

**Mutation** (scoped Stryker runs, sequentially, before and after; Survived plus
NoCoverage, `ignoreStatic` on). The deleted helpers and checks took their
unkillable mutants with them, and the one guard that remains is covered:

| File | Before | After |
| ---- | -----: | ----: |
| `Simplify.ts` | 19 | 1 |
| `Explanation.ts` | 39 | 2 |
| `Predicate.ts` | 11 | 1 |
| devtools `Remedies.ts` | 22 | 0 |
| `TreeFold.ts` | 0 | 0 |

`Matcher.ts` (5) and `Policy.ts` (3) are unchanged, and the survivors that remain
in the other files are lines this change did not touch. Both runs stay far above
`break: 80` (core's subset 98.8%, devtools' `Remedies.ts` 100%).

**What was measured and not taken.**

- *`policyDepth` on the case form* was implemented and measured first
  (D-17-d(a) recommended it, and its probe said faster). In the one-loop
  implementation it ran ≈+9–15% over the control on a fresh root and ≈+5–7% on a
  fresh `evaluate` of depth 5–40 — `policyDepth` runs once per distinct policy object
  on the evaluate path, so that is a regression on the path this ADR protects. It
  stays on `foldPolicy`; `matcherOf` and `leafNesting` stay with it.
- *A second loop for `foldTreeBy`* (D-17-b(b)) was implemented and measured against
  the one-loop form; the two were indistinguishable within the control, so the one
  seam stays. The array form also runs the same loop unchanged: passing `combine`
  straight through, with no wrapper closure, keeps `referencesAction` inside the
  control (a per-call reader closure first built there cost it ≈40%).
- *A leaf fast path in the loop* (D-17-h(a): a childless root combined without the
  memo, path set or frame) took a leaf `referencesAction` from 0.45 µs to 0.27 µs
  but left `evaluate`'s matcher-heavy workload where it was (31.6 → 31.9 µs) and
  made a one-wrapper matcher ≈9% slower. The plan's rule was to keep it only if
  matcher-heavy improved; it did not, so it was reverted and `TreeFold.ts` carries no
  fast path.

### What stays

`SWITCH_BUDGET` is unchanged: every new dispatcher is a hoisted
`Match.tagsExhaustive`, and no `switch` is added. `UNTRACED_BUDGET`, `ANY_BUDGET`
and the other budgets are untouched; nothing here is effectful, and no arm needs an
assertion.

### Not yet

- **A `Trace` fold**, when ARCH-22 builds one, takes the case form from the start.
- **Devtools' package-private `TreeFold.ts` twin** is unchanged: its nodes are
  virtual positions with no tag-determined arity, so a case form buys it nothing.

### Alternatives considered

- **Keep only the array form** and add a helper that destructures it. Moves the
  runtime check, does not remove it; the helper's guard is the same unkillable mutant.
- **Replace the array form outright** (D-17-a(c)), or deprecate it (D-17-a(b)). The
  array form is the correct interface for a fold with no arity, `foldPolicy`,
  `foldExplanation` and `foldMatcher` are published API since 0.10.0, and removing
  them costs a measured hot-path regression for no type-safety gain.
- **Positional reads, one check per adapter** (D-17-b(c)): `results[0]` zipped with
  rows. Three unkillable guards instead of seven, not zero.
- **A per-tag record table instead of `Match`** (D-17-b(d)): needs a correlated-union
  index only a cast can type, and an AGENTS.md §5a exception like ADR-QD-092's. The
  consumers that need arity already pay a `Match` per node, so the dispatch is not
  where the cost is.
- **One `Leaf` arm over `LeafPolicy`** (D-17-c(b)): a consumer with per-leaf semantics
  needs a second `Match` over it, and a composite tag forgotten in the composite list
  silently becomes a "leaf" whose children are folded and ignored.
- **Overloading `foldPolicy`** (D-17-e(b)): a `typeof` branch in an exported function
  hides which interface a call site uses.

## Consequences

- **Breaking, 0.x, rides a minor.** A policy that previously allowed or denied by
  short-circuiting past an over-deep branch now fails with `PolicyTooDeep`;
  `toPredicate` on a policy both too deep and field-restricting now always reports
  `PolicyTooDeep`; and `policyDepth(hasAttribute("tags", someMatch(eq(…))))` goes
  from 0 to 1, so a policy near `maxDepth` with nested matchers may now need a
  larger one. Consumers raise `maxDepth`. The changeset says so.
- Every pure walk over a caller-held `Policy`, `Explanation` or `Matcher` is
  stack-safe ([INV-QD-090](../invariants.md)).
- One definition of the tag list; a new tag is a compile error in fewer places.
- Two copies of the fold mechanism exist (core and devtools), until a third package
  needs one, at which point D-02-d is reopened with an ADR.

### Not yet

- **`Trace` walkers.** `renderTrace` and `diffTraces` recurse natively over a
  `Trace`. A trace exists only after an evaluation succeeded, so its nesting is
  bounded by that evaluation's `maxDepth` — and `maxDepth` is a caller's to raise,
  so they are the next candidates now that `TreeFold.ts` exists.
- **Seven `FastCheck.letrec` policy arbitraries** in core tests
  (`Explanation.test.ts`, `Policy.test.ts`, `Simplify.test.ts`, `Predicate.test.ts`,
  `Evaluate.test.ts` ×2, `SinkCodec.test.ts` ×2) could migrate onto
  `helpers.ts`'s all-tags `policyArbitrary`.
- **JSON-value and role-graph walkers** (`DecodeDepthGuard.ts`, `SinkCodec.ts`'s
  `isJsonSafe`, `Role.ts`, `FieldPath.ts`) are explicit-stack already and answer
  different questions (pre-order, early exit, cycle-as-answer); they stay.

## Alternatives considered

**A Policy-only `PolicyFold.ts`.** Moves `childrenOf` and `policyDepth` off the
`@qadi/core/Policy` subpath, breaking importers, does nothing for `Explanation` or
`Matcher`, and `policyDepth` cannot stay in `Policy.ts` without a cycle.

**Everything inside `Policy.ts`.** `Matcher.ts` → `Policy.ts` is a cycle, since
`Policy.ts` already imports `Matcher.ts`.

**Export `foldTree` from the barrel.** One copy, but it breaks AGENTS.md §9 and
would need an ADR exception.

**Import `@qadi/core/TreeFold` from devtools.** Breaks AGENTS.md §1: no package
imports a core subpath; since ADR-QD-099 no such subpath exists to import.

**Leave `Inspect` recursive and document the ≈1.7k limit.** Leaves a walker that
crashes on input the other walkers accept.

**Restate the tag list with one `Record<Policy["_tag"], true>` in `Policy.ts`.**
Exhaustive by TS2741, but a fifth hand site beside the union. It was the
documented fallback if declaration emit failed; `lib/Policy.d.ts` emits
`POLICY_TAGS` as a plain 16-element readonly tuple of string literals, so it was
not needed.

**`"fields" in p ? p.fields : undefined`.** Zero per-tag lines, but a new tag that
forgets `fields` silently counts as "never restricts", which widens visibility.

**Spec-only for `evaluate` (D-02-e(a)).** Rewrite INV-QD-037 one-directionally and
keep whether-too-deep subject-dependent. No behavior change, but it leaves a
property of the *policy* depending on *who is asking*, and keeps `toPredicate`'s
child-order dependence.

**A separate fixed matcher ceiling (D-02-f(b)).** Two nesting-depth notions, and
`PolicyTooDeep.maxDepth` would report a number the caller never passed.

**Clamp `maxDepth` (D-02-g(b)).** Needs a new option-validation failure shape, and
reusing `PolicyTooDeep` with an unrequested number is misleading.

**Keep non-termination on a cycle (D-02-h(b)).** A hang is the worst way to learn
a tree was mutated.
