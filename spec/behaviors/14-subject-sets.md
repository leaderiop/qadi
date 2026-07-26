# 14 — Subject Sets

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-14                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-018) |

_Previous: [13 — The Label Lattice](./13-labels.md)_

---

## BEH-QD-105: The transpose of `filter`

> **See:** [ADR-QD-022](../decisions/022-subject-set-evaluation.md)

`Qadi.filter` runs one policy across many resources. These run one policy across
many **subjects** — "who can see this?", the question an access review, a sharing
dialog and a leak investigation all ask.

```ts
export interface SubjectDecision {
  readonly subject: AuthSubject;
  readonly decision: Decision;
}

export const decideSubjects: (
  policy: Policy,
  subjects: ReadonlyArray<AuthSubject>,
  options?: EvaluateOptions,
) => Effect.Effect<ReadonlyArray<SubjectDecision>, EvaluationError, SubjectSetServices>;

export const filterSubjects: (
  policy: Policy,
  subjects: ReadonlyArray<AuthSubject>,
  options?: EvaluateOptions,
) => Effect.Effect<ReadonlyArray<AuthSubject>, EvaluationError, SubjectSetServices>;
```

```
REQUIREMENT: `filterSubjects` MUST be derived from `decideSubjects`. Two
             implementations of "who passes" would eventually disagree, and the
             one that disagreed by *allowing* would not announce itself.
```

`decideSubjects` is the form an access review should use: it keeps the trace, and
"denied" without "why" is not reviewable. `filterSubjects` loses that exactly as
`check` loses it against `decide`.

## BEH-QD-106: A review query is asked by nobody

> **Invariant:** [INV-QD-016](../invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone)

```ts
export type SubjectSetServices = Exclude<EvaluationServices, CurrentSubject>;
```

```
REQUIREMENT: Subject-set evaluation MUST NOT require a `CurrentSubject`. Each
             element is provided as the subject for its own evaluation, which
             discharges the requirement; asking for one as well would make
             callers wire a value that could not affect any answer.
```

This is the only entry point in the library where that is true, and it is not an
accident of `provideService`'s signature. An access review runs in a batch job at
midnight; a leak investigation runs from an admin console. Neither has a
requesting subject, and before this there was nowhere in Qadi that could be so.

```
REQUIREMENT: Each decision MUST be attributed to its element. A `CurrentSubject`
             that happens to be in scope MUST NOT decide any of them.
```

```
REQUIREMENT: `SubjectSetServices` MUST be derived from `EvaluationServices`
             rather than listed by hand, so a service added to the evaluator's
             requirements cannot quietly stop being required here.
```

## BEH-QD-107: It reports; it does not enforce

[ADR-QD-019](../decisions/019-obligations.md) divides the entry points in two.
`decide` and `check` report. `assert`, `enforce`, `enforceProjected` and `filter`
enforce, because each runs work or hands over data and so must refuse an allow
whose obligation nobody discharged.

```
REQUIREMENT: `decideSubjects` and `filterSubjects` MUST report. Neither takes an
             obligation handler, and an allow carrying a binding obligation MUST
             remain in the answer.
```

The reason is not "it returns a list, like `filter`":

- `filter` hands back the resources themselves; this hands back **identities**,
  and hands them to an administrator rather than to the subjects named. Nobody is
  being given access, so there is no permission for a duty to condition.
- Discharging would fire every obligation once per candidate — a policy obliged
  to log an access would log one per subject in the batch, for accesses that
  never happened. That is the defect
  [BEH-QD-089](./12-history.md) keeps out by making the history port read-only,
  and a review query is the most speculative call Qadi has.

The duty stays on the decision, where a reviewer can read it.

## BEH-QD-108: Order, duplicates and sequencing

```
REQUIREMENT: Results MUST preserve input order and MUST NOT deduplicate. A
             review is read beside the list it was asked about, so position is
             the join key, and two subjects sharing an id is the caller's fact
             to have.
```

```
REQUIREMENT: Elements MUST be evaluated one at a time. A batch multiplies the
             load on the caller's resolvers by its own length, and an unbounded
             fan-out onto somebody else's store is not a default to choose on
             their behalf.
```

Sequencing here is **not** the [ADR-QD-013](../decisions/013-short-circuit-default.md)
question. Separate subjects produce separate decisions and nothing combines them,
so no combining algorithm has to be settled first — this is not blocked by E3.
Concurrency, if it is ever added, belongs as a bounded option rather than a
change of default.

```
REQUIREMENT: A failure MUST fail the batch rather than deny an element
             ([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)).
             One broken lookup reported as "that person cannot see it" is how an
             outage becomes an access-review finding.
```

## BEH-QD-109: Worked example

The review query in both directions. `filter` answers what one subject can
reach; `filterSubjects` answers who can reach one object — which is the half
[34 — NGAC](../models/34-ngac.md) records as the common demand from callers who
never say NGAC.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  anyOf,
  filterSubjects,
  hasRole,
  hasResourceAttribute,
  makeSubject,
  eq,
  subjectId,
  type AuthSubject,
} from "@qadi/core";

const canRead = anyOf([hasRole("auditor"), hasResourceAttribute("owner", eq(subjectId()))]);

const staff: ReadonlyArray<AuthSubject> = [
  makeSubject({ id: "alice", roles: ["auditor"] }),
  makeSubject({ id: "bob" }),
  makeSubject({ id: "carol" }),
];

// No `currentSubjectLayer`: this environment names nobody, and that is the point.
const reviewEnvironment = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
);

// "Who can read doc-1?" — the auditor, and the person who owns it.
const whoCanRead = filterSubjects(canRead, staff, {
  resource: { id: "doc-1", owner: "carol" },
}).pipe(Effect.provide(reviewEnvironment));
```

---

_Previous: [13 — The Label Lattice](./13-labels.md)_
