# 36 — Cell-Level Security

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-36                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): E7 shipped without the cell-level half, as argued here (CCR-QD-020)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Cell-level security makes the unit of authorisation a single **value** — this row,
this column — rather than a whole record. The canonical implementation is Apache
Accumulo: every cell carries a *visibility expression*, a boolean formula over the
caller's authorisation tokens, and a scan returns only the cells whose formula the
caller satisfies. Two callers issuing the identical query receive differently
shaped rows.

Qadi is closer to this than it is to [row-level security](./35-row-level.md), and
that is worth stating up front, because the [matrix](./00-adoption-matrix.md)
files both under E7 and the resemblance misleads.
[Field-level authorisation](./07-field-level.md) already decides *which fields* a
caller may see and projects the result. Cell-level goes one step further: the
visible field set becomes a function of the **row's own values**, not of the
policy and the subject alone. Under ordinary field-level authorisation a caller
sees `diagnosis` on every record the policy admits, or on none; under cell-level,
*this* record's `diagnosis` is visible because this record names the caller as its
treating clinician, while the next record's is not. That is the whole difference,
and it is subtle: it is not a difference in the projection mechanism, the lattice
or the merge rules — all three are already correct for the cell-level case.

## Who asks for it

Systems with mixed-sensitivity rows in one table: clinical records where one
patient's file is flagged restricted, case management where a subset of matters is
sealed, defence stores where the classification travels with the datum rather than
the table. Outside those, most requests for "cell-level" turn out on inspection to
be per-record field projection — which is shipped.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped, in part** — the per-record half; the rest is declined |
| Priority | **P3** |
| Enablers required | ~~**E7**~~ shipped, **without** the cell-level projection |
| Breaking change | Yes, for the half that was declined |

The status is a split, and the table above records the harder half only.

| Capability | Status |
| ---------- | ------ |
| Per-record, value-dependent field visibility — the field set derived from the row in hand | **Shipped.** No core change |
| Per-cell filtering across a *result set* the caller has not loaded | **Declined**, not deferred — see below |
| Visibility labels stored *with* the data, enforced at scan time | **Out of scope.** Qadi has no storage layer |

**E7 shipped and this half did not, on this document's own argument.**
[ADR-QD-024](../decisions/024-predicate-output.md) took the recommendation below
literally: *an application-level authorization library is the wrong layer for
high-cardinality cell labels and the right layer for per-record field
projection.* So `toPredicate` answers **which rows**, never which columns, and
`CellVisibility` below stays a sketch.

The refusal is stricter than a mere omission. A policy carrying a `fields`
restriction **anywhere** in the tree does not translate at all, because returning
the row filter and dropping the column restriction would let a caller run
`SELECT *` and receive columns the policy withheld. The shipped split is:
`toPredicate` narrows the page, and `decide` with `project` judges the columns on
it — which is what this document said Qadi should keep.

**"Shipped, in part" is the ceiling for this row.** The remaining half is declined
on a combinatorial argument, not waiting on an enabler.

## What Qadi can express today

Because `hasResourceAttribute` reads the resource in hand, a policy can already
make the visible field set depend on that row's values: `anyOf` branches carrying
different `fields`, selected by a classification column. Per-row, per-caller field
sets are shipped capability, not a proposal — a stronger result than most readers
expect, and most of what "cell-level" means in practice.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  anyOf,
  currentSubjectLayer,
  decide,
  eq,
  hasResourceAttribute,
  inArray,
  literal,
  makeSubject,
  project,
  subjectId,
} from "@qadi/core";

// A `type`, not an `interface`: `project` requires
// `A extends Record<string, unknown>`, which an interface cannot satisfy.
type PatientRecord = {
  readonly id: string;
  readonly sensitivity: string;
  readonly clinicianId: string;
  readonly name: string;
  readonly appointment: string;
  readonly diagnosis: string;
};

// Module scope. `First` is explicit: branches run most-specific first, and the
// first that allows decides both the answer and the columns.
const canViewRecord = anyOf(
  [
    // Restricted row, treating clinician — the clinical columns.
    allOf([
      hasResourceAttribute("sensitivity", eq(literal("restricted"))),
      hasResourceAttribute("clinicianId", eq(subjectId()), {
        fields: ["id", "name", "appointment", "diagnosis"],
      }),
    ]),
    // Restricted row, anyone else — scheduling only. Same subject, same
    // policy, different row: a different field set. That is cell-level.
    hasResourceAttribute("sensitivity", eq(literal("restricted")), {
      fields: ["id", "appointment"],
    }),
    // Ordinary row — everything except the diagnosis.
    hasResourceAttribute("sensitivity", inArray(["routine", "screening"]), {
      fields: ["id", "name", "appointment"],
    }),
  ],
  { fieldStrategy: "First" },
);

// The decision depends on the row, so the row must be in hand before it is
// taken: one decision per record, projected against that same record.
const visibleFor = (row: PatientRecord) =>
  decide(canViewRecord, { resource: row }).pipe(
    Effect.map((decision) => project(decision, row)),
    Effect.provide(
      Layer.mergeAll(
        currentSubjectLayer(makeSubject({ id: "u-31", roles: ["scheduler"] })),
        AttributeResolverNone,
        RelationshipResolverNever,
        EvaluationIdLive,
        DecisionHistoryUnknown,
      ),
    ),
  );
```

Nothing there is a cell-level construct: it is the ordinary `fields` option and an
ordering of branches. `enforceProjected` does the same as an aspect, but must be
given `{ resource }` in its options for the same reason `project` is used here — a
decision that depends on the row cannot guard the read that produces it.

Two things this does **not** reach. **A result set, unloaded** is
[row-level security](./35-row-level.md)'s problem — E7, predicate output —
compounded by per-cell granularity, because the pushed-down artefact must carry a
*projection* varying by row rather than a single row filter; `filter` is no
substitute, evaluating per element in memory after the read. And **labels stored
with the data**, as Accumulo stores them in the cell: Qadi decides against a
resource the caller supplies, has no storage layer and no opinion on where labels
live. A caller storing labels per cell can hand them over as resource fields and
match on them — the example does that with one column — but the storage, indexing
and scan-time enforcement are theirs.

## Proposed API design

E7 is designed in [35](./35-row-level.md). Only one thing is specific to per-cell
granularity: the field set stops being a constant on the result.

Unshipped, and now deliberately so. These fences are a sketch of the half that
was declined.

```ts
// Row-level output is one predicate for the query. Cell-level cannot be, because
// the visible columns differ per row — so the field dimension is a function OF
// the row, not a list beside it.
export interface CellVisibility {
  readonly rows: Predicate;
  readonly fieldsFor: (
    row: Readonly<Record<string, unknown>>,
  ) => ReadonlyArray<string> | undefined;
}

// 1. `fieldsFor` returning `undefined` means ALL fields — the top of the
//    lattice, unchanged. It must never be read as "none".
// 2. Pushed into SQL this is a per-column CASE expression per branch, not a
//    WHERE clause: branches x columns, and where an implementation fails.
```

## What it would cost

E7 — breaking, and the single largest departure from the current design in the
matrix — plus a combinatorial problem E7 does not have on its own.

Accumulo-style visibility expressions are boolean formulas per cell. Evaluating
one policy per cell across a large result set is not viable: the work is rows ×
columns, each evaluation is an Effect, and the resolvers behind it may perform
I/O. That is why systems which genuinely need this push it into the storage
engine, where labels are indexed alongside the data and the filter runs during the
scan instead of after it.

Stated plainly: an application-level authorisation library is the **wrong layer**
for high-cardinality cell labels and the **right layer** for per-record field
projection. Qadi should keep the second and decline the first. A caller needing
the first keeps labels in the store and uses Qadi to decide the caller's token set
— which is [label-based access control](./23-label-based.md), a P1 recipe.

### The field-strategy interaction

Where several branches allow with different field sets, `fieldStrategy` governs
the merge: `Intersection` for least privilege, `Union` to accumulate, `First` to
short-circuit. `Union` forfeits short-circuiting — the merged set is not knowable
without visiting every branch, so every branch runs and every resolver behind it
is called ([ADR-QD-013](../decisions/013-short-circuit-default.md),
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)). That cost
lands hardest exactly here, because the cell-level pattern is *many branches by
construction*: one per sensitivity class, per role, per column group. `Union` over
a dozen branches costs a dozen evaluations per record where `First` costs one. The
example above names `First` deliberately.

Whichever strategy is chosen, an absent field set means **all fields** — the top
of the lattice, never none
([INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)).
An unrestricted branch in a cell-level `anyOf` therefore *widens*, and under
`Union` absorbs every sibling's restriction. That is correct, and easy to write by
accident.

## Verification

**The shipped half** rests on tested mechanics. Nothing verifies this *document*,
but every construct the example uses is covered: `hasResourceAttribute` reading the
resource in hand by `REQ-QD-006`; comparison against `subjectId()` by `REQ-QD-009`;
the lattice and `project` by `packages/core/test/Matcher.test.ts`; the three merge
strategies, and `Union` forfeiting short-circuiting where `First` keeps it, by
`packages/core/test/Evaluate.test.ts` (`describe("field visibility")` and
`describe("short-circuiting")`, the latter asserted by counting resolver
invocations); `enforceProjected` by `packages/core/test/Qadi.test.ts`. Field
merging as a whole is accepted by `REQ-QD-007`.

What is *not* covered is the composition: no test asserts that two records
differing only in a classification column yield two different field sets. That is
one scenario against shipped API, costing a newly allocated `REQ-QD` identifier,
and it is the cheapest verification work in this phase.

**The E7 half is declined.** Predicate output now exists
([16 — Predicate Output](../behaviors/16-predicates.md)), and it carries no column
dimension: `CellVisibility` above remains a sketch and no test, behaviour or
invariant touches it. The combinatorial argument was to be settled before anything
was built, and it was — in the direction this document predicted. *"The honest
outcome may be that this half is never built"* is the outcome.

What did change is that a policy restricting fields is now **refused** by
`toPredicate` rather than silently narrowed, so the boundary between the two
halves is enforced by the type's absence *and* by an error, not by documentation.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [07 — Field-Level Authorization](./07-field-level.md) · [35 — Row-Level Security](./35-row-level.md) · [23 — Label-Based Access Control](./23-label-based.md)_
