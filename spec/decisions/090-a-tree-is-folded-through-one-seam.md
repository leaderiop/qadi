# ADR-QD-090 — A tree is folded through one seam, and nesting depth is a property of the policy

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-090                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-04                                     |
> | Status         | Accepted — amends ADR-QD-034, ADR-QD-024       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |

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
(AGENTS.md §9); it is reachable only as the `@qadi/core/TreeFold` subpath.

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
imports a core subpath.

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
