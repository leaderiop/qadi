# ADR-QD-024: A predicate is a second interpreter, and it ships with the reference that proves it agrees

> **Status:** Accepted
> **Date:** 2026-07-26

## Context

Qadi's evaluator answers a question *about a resource in hand*: `evaluate` takes
at most one `resource` and returns `Allow | Deny`. Row-level security must decide
about rows **not yet loaded** — no resource to hand it, and no single answer to
return, because the output is a filter the database applies while the query runs.

That is **E7** in the [matrix](../models/00-adoption-matrix.md), and the matrix
calls it *the single largest departure from the current design* in the document.
[35 — Row-Level Security](../models/35-row-level.md) is where it is designed, and
it is unusually blunt about whether it should exist:

> Pursue E7 only as an abstract predicate with an explicitly translatable subset
> and a loud failure outside it — or not at all; a partial translator that
> quietly approximates is worse than no feature.

and about the risk that makes it different from every enabler before it:

> Two interpreters over one tree must agree, and nothing enforces that they do —
> a divergence is an authorisation defect no round-trip test catches.

This ADR builds the recommended form. Its central decision is an answer to the
second quote, because "nothing enforces that they do" is not a risk to accept in
an authorization library.

## Decision

### The predicate is abstract, and Qadi acquires no database dependency

```ts
export type CompareOp = "Eq" | "Neq" | "Gte" | "Lt";

export type Predicate =
  | { readonly _tag: "True" }
  | { readonly _tag: "False" }
  | { readonly _tag: "Compare"; readonly column: string; readonly op: CompareOp; readonly value: unknown }
  | { readonly _tag: "MemberOf"; readonly column: string; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "And"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Or"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Negate"; readonly predicate: Predicate };
```

Emitting SQL means owning a dialect: quoting, binding, null semantics, one
grammar per engine. Qadi has no database dependency and acquiring one is a far
larger commitment than this feature warrants. The caller compiles the predicate.

**`Predicate` is a hand-written type with no `Schema`.** That is the
[ADR-QD-002](./002-schema-derived-policy-adt.md) boundary applied rather than
forgotten: the policy ADT is schema-derived because policies are persisted and
re-parsed from untrusted JSON, and a predicate is neither. It is produced and
immediately consumed in the same process, like `Decision` and `Trace`, which
carry no codec for the same reason.

### It ships with a reference interpreter, and that is what makes it trustworthy

```ts
export const evaluatePredicate: (
  self: Predicate,
  row: Readonly<Record<string, unknown>>,
) => boolean;
```

This is the decision. A caller with only `toPredicate` compiles a predicate to
SQL and has **nothing** that says their SQL means what Qadi meant; the failure is
silent and it returns rows. With a reference interpreter they can differential-test
the compiler they wrote against the semantics Qadi intended, over their own rows,
in their own test suite.

It also lets Qadi state the agreement as a property it can *run* rather than as
an argument it makes:

```
REQUIREMENT: For every translatable policy P and every row R,
             evaluatePredicate(toPredicate(P), R) MUST equal
             isAllowed(evaluate(P, { resource: R })).
```

That becomes [INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows),
asserted by a `FastCheck` property over generated policies *and* generated rows.
[MOD-QD-035](../models/35-row-level.md) called it "the only evidence that would
make a second interpreter trustworthy", and it is right — but the evidence is not
obtainable at all without an executable predicate, so the reference interpreter
is a precondition of the recommendation rather than an extra.

### Untranslatable fails loudly; nothing is approximated

```ts
export class PolicyNotTranslatable extends Data.TaggedError("PolicyNotTranslatable")<{
  readonly policyTag: string;
  readonly reason: string;
}> {}

export const toPredicate: (
  policy: Policy,
  options?: PredicateOptions,
) => Effect.Effect<Predicate, PolicyNotTranslatable | EvaluationError, PredicateServices>;
```

```
REQUIREMENT: A node outside the translatable subset MUST fail. It MUST NOT
             translate to `True`.
```

An untranslatable node rendered as `True` returns rows the policy denies. This is
the one failure mode that makes the feature worse than its absence, and it is why
a type-level `TranslatablePolicy` was rejected: that means a second codec, union
and generator — the four coordinated edits
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) polices, duplicated —
where failing loudly costs one error and says the same thing.

| Node | Translation |
| ---- | ----------- |
| `HasResourceAttribute` with `Eq`/`Neq`/`Gte`/`Lt` | `Compare` on that column — the only node that becomes a column reference |
| `HasResourceAttribute` with `In` | `MemberOf` |
| `HasRole`, `HasPermission`, `HasAction` | folds to `True` or `False` |
| `HasAttribute` | folds, consulting the subject and then the resolver |
| `HasActed`/`HasNotActed` with `scope: "Any"` | folds — subject-keyed |
| `AllOf`, `AnyOf`, `Not`, `Labeled` | `And`, `Or`, `Negate`, transparent |
| `Rules` | see below |
| `HasRelationship` | **untranslatable** — keyed by `resourceId`, one call per row |
| `HasActed`/`HasNotActed` with `scope: "Resource"` | **untranslatable**, for the same reason |
| `Obliged` | **untranslatable** — see below |
| any node carrying `fields` | **untranslatable** — see below |

Which side a `ValueRef` sits on decides the rest. `subject(path)`, `subjectId()`
and `action()` are constants at translation time; `resource(path)` is a column
reference, a *dotted* one names a column no relational schema has, and two
resource paths compared is `column op column`, which `Predicate` cannot express.

[MOD-QD-035](../models/35-row-level.md)'s subset table predates E1, E2, E3 and
E5, and three rows above are new. The history port splits by **scope**, which is
the distinction that decides it: `"Any"` asks about the subject and folds to a
constant, `"Resource"` asks per row and cannot. The action folds because it is a
property of the request. And `Rules` is translatable, below.

### `Obliged` is untranslatable, and a `fields` anywhere is too

```
REQUIREMENT: A policy containing an obligation MUST NOT translate. A predicate
             has no channel to carry a duty, and rows selected by one would be
             handed over with a condition nobody was told about.
```

That is [INV-QD-013](../invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation)
reaching a construct it could not otherwise reach. `filter` refuses an allow
whose obligation nobody discharged; a predicate pushed into a query hands back
rows with no decision attached at all, so the only safe answer is to refuse the
translation.

```
REQUIREMENT: A policy carrying a `fields` restriction anywhere in the tree MUST
             NOT translate.
```

This is stricter than [MOD-QD-035](../models/35-row-level.md) contemplated, and
the reason is the rule above about silent widening. A predicate answers **which
rows**, never which columns. A policy that says "permitted, and only these
fields" translated to a row filter alone lets a caller run `SELECT *` and receive
columns the policy restricted — a widening that no error announces. Refusing is
cheap and the caller has two honest options: drop the restriction, or keep using
`decide` and `project` per row.

The check is conservative: *any* `fields` in the tree, including one on a branch
whose set would have been discarded. A precise check would have to reproduce the
evaluator's merge rules in the translator, which is a third interpreter to keep
in agreement with the other two.

**Column projection is therefore not in E7**, and [36 — Cell-Level
Security](../models/36-cell-level.md)'s `CellVisibility` sketch stays unbuilt.
That document's own argument is the one being followed: an application-level
authorization library is the wrong layer for high-cardinality cell labels and the
right layer for per-record field projection, so keep the second and decline the
first. The split is that `toPredicate` narrows the page and `decide` + `project`
judges the columns on it.

### `Rules` translates, and it is the proof the shape is expressive enough

E3 shipped an ordered rule table three weeks of documents said was the other half
of phase 5. It translates without a new predicate node:

| Combining | Admitted rows |
| --------- | ------------- |
| `PermitOverrides` | `Or(permit conditions)` |
| `DenyOverrides` | `And(Negate(Or(deny conditions)), Or(permit conditions))` |
| `FirstApplicable` | `Or(cᵢ ∧ ¬c₀ ∧ … ∧ ¬cᵢ₋₁)` over the `Permit` rows |

The first two are one line each because those algorithms do not depend on
position. `FirstApplicable` does, and the formula pays for it — each `Permit` row
must exclude every row above it, so a table of *n* rows becomes O(n²) conjuncts.
That is the honest cost of pushing an ordered walk into a set-based engine, it is
bounded by the caller's own table, and the property test covers all three.

This is worth having beyond row-level security: `DenyOverrides` over a tenancy
column is the exact shape every multi-tenant application asks for, and until E3
it could not be written at all.

### Folding is simplification, not decoration

The subject-side nodes fold to `True` and `False`, and an unsimplified result is
full of them. The translator applies boolean algebra as it builds: `And` drops
`True` and collapses to `False`; `Or` drops `False` and collapses to `True`;
`Negate` inverts the constants.

That is not tidiness. It is what makes the output usable, and it produces one
result worth naming: **`False` means do not run the query.** A subject who fails
the role half of a policy yields `False` before any column is mentioned, and the
caller can skip the round trip entirely rather than sending a `WHERE false`.

## Consequences

**Positive**:

- Multi-tenancy — the most requested capability in the matrix — becomes a
  predicate pushed into the query, where the engine can use an index, rather than
  `filter` over every candidate row after the read.
- The reference interpreter makes the caller's SQL compiler testable, which is
  the part of this feature that would otherwise be unverifiable in principle.
- The agreement property is the first test in the library that compares two
  independent implementations of the same semantics. It found nothing on the
  first run, which is the outcome to hope for and not the outcome to assume.

**Negative**:

- **A predicate returning no rows explains nothing.** `Deny` carries a reason and
  a structured trace, which is what [URS-QD-009](../urs.md) requires; "zero
  results" is indistinguishable from "empty table", and any explanation lives in
  a query planner Qadi never sees. The most on offer is the predicate itself as a
  diagnostic, which explains the *rule* but never why a given row fell outside
  it. This is a real and permanent loss, and it is the strongest argument for
  using `filter` where the page is small.
- The translatable subset is narrow, and the nodes outside it are not obscure:
  `hasRelationship` is how ReBAC is written, and it is exactly the node that
  cannot fold. A caller whose authorization is relationship-shaped gets an error,
  not a filter.
- Two interpreters exist now, and the property is what holds them together. If
  a future variant is added to `Policy` without a translation, `toPredicate`
  fails loudly on it — which is the correct default and also means the property
  test silently stops covering that shape.

**Trade-off accepted**: the `fields` check is conservative and will refuse
policies that would have translated safely. A precise check means reproducing
`mergeFields` inside the translator, which is a third implementation of a rule
two already share; refusing more than necessary costs a caller an edit, and
translating one policy too many costs them columns.

**Trade-off accepted**: `FirstApplicable` translates to O(n²) conjuncts. The
alternatives are a predicate node for ordered choice — a `Case` the caller's
compiler would then have to render per dialect — or declining the algorithm.
Neither is better than a formula whose cost the caller can see and bound.

**Implemented**, with the evidence the
[Definitions of Done](../process/definitions-of-done.md) require:
[16 — Predicate Output](../behaviors/16-predicates.md),
[INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows),
`@REQ-QD-016`.

Three notes from building it.

**The agreement property was weaker than it looked, and mutation testing is what
showed that.** Ten mutations were run against the translator; nine died at once.
The survivor coerced the ordered comparison — `Number(value) >= Number(against)`
rather than requiring both sides to be numbers — and it survived **both** the
property and the hand-written test that exists precisely to pin this. The test
compared against `"red"`, which coercion refuses too; the property only ever
generated integers in the ordered column. The discriminator is a **numeric
string**: a text column holding `"3"` is admitted by coercion and refused by the
evaluator, so those rows return.

That is the lesson worth carrying past this ADR. A property comparing two
interpreters is only as strong as the *untidiness* of its generated data, and the
first instinct when generating rows is to make them well-typed. Well-typed rows
never reach the place two interpreters disagree — which, for anything destined for
a database, is exactly where a text column meets a numeric comparison.

**`Rules` translating was not in the plan and is the best thing here.**
[MOD-QD-035](../models/35-row-level.md) predates E3 and so could not have proposed
it. The formulas are short, they need no new predicate node, and the one that
matters — `DenyOverrides` over a tenancy column with a deny row for sealed
records — is the shape that document says every multi-tenant application asks for.
Two enablers filed as "breaking, phase 5, land together or not at all" turned out
to compose, which the phase framing did not anticipate.

**The `fields` refusal is the decision that took longest and reads shortest.** The
first instinct was to return the row filter and note in the documentation that
column restrictions are not carried. That is a silent widening by the definition
this ADR opens with, arriving by the one route the subset table does not cover: not
an untranslatable *node*, but a translatable node whose *field set* is dropped.
Refusing outright, conservatively, across the whole tree, is three lines and the
only version that cannot be got wrong by a caller.
