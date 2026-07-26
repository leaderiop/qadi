# ADR-QD-022: A subject set is asked by nobody, and the answer reports rather than enforces

> **Status:** Accepted
> **Date:** 2026-07-26

## Context

`Qadi.filter` evaluates one policy across many resources. The transpose — one
policy across many *subjects*, answering "who can see this?" — has been on the
[roadmap](../roadmap.md) since before the model survey, and the
[matrix](../models/00-adoption-matrix.md) records it as **E6**, the last additive
enabler.

The roadmap entry names the difficulty in one clause: *"the subject comes from
the environment rather than a parameter"*. Every other entry point reads
`CurrentSubject` out of the context, which is what lets `Qadi.enforce(policy)`
take one argument instead of the predecessor's eight
([ADR-QD-011](./011-enforce-as-aspect.md)). A batch over subjects cannot map over
`check`, because `check` has no place to put a subject.

[34 — NGAC](../models/34-ngac.md) is where the demand is written down, and it is
careful to separate two things. NGAC as an architecture is declined — a graph
administered over time is not an expression evaluator, and Qadi will not gain
assignment edges, associations or policy classes. But NGAC's **review queries**
are described there as "a quieter and far more common asker who never says
NGAC": an access review asking what a user can reach, a sharing dialog or a leak
investigation asking who can reach an object. That demand is real, recurring, and
independent of everything else in that document.

The matrix records E6 as carrying **no design question**. That was very nearly
right; the questions this ADR settles are consequences of the one clause above
rather than open choices, but two of them change the public type.

## Decision

### The ambient subject is replaced, so the entry point does not require one

```ts
export type SubjectSetServices = Exclude<EvaluationServices, CurrentSubject>;

export const decideSubjects: (
  policy: Policy,
  subjects: ReadonlyArray<AuthSubject>,
  options?: EvaluateOptions,
) => Effect.Effect<
  ReadonlyArray<SubjectDecision>,
  EvaluationError,
  SubjectSetServices
>;
```

Each element is evaluated under `Effect.provideService(…, CurrentSubject, subject)`,
which **discharges** the requirement. The batch entry points are therefore the
only ones in the library that do not ask for a current subject, and saying
otherwise would be a lie the type system would let us tell: requiring
`CurrentSubject` and then overriding it would make callers wire a subject whose
value could not affect any answer.

That is the finding worth stating plainly, because it reads as an accident of
`provideService`'s signature and it is not: **a review query is asked by nobody.**
An access review runs in a batch job at midnight, a leak investigation runs from
an admin console. Neither has a requesting subject, and before E6 there was
nowhere in Qadi that could be true.

`SubjectSetServices` is written as `Exclude` rather than as a hand-listed union
so that it tracks `EvaluationServices` — E5 added a service to that union and
this one must follow without an edit nobody would think to make.

### It reports; it does not enforce

[ADR-QD-019](./019-obligations.md) divided the entry points in two: `decide` and
`check` report, and `assert`, `enforce`, `enforceProjected` and `filter` enforce,
because each of those runs work or hands over data and so must refuse an allow
whose obligation nobody discharged.

Subject-set evaluation **reports**, and takes `EvaluateOptions` rather than
`EnforceOptions`. The reasoning is not "it returns a list, like `filter`":

- `filter` hands the caller the resources themselves. `filterSubjects` hands back
  *identities*, and hands them to an administrator rather than to the subjects
  named. Nobody is being given access, so there is no permission for an
  obligation to condition.
- Discharging would fire every duty once per candidate. A policy obliged to
  "log this access" would log an access per subject in the batch, for accesses
  that never happened — which is the same defect
  [BEH-QD-089](../behaviors/12-history.md) keeps out by making the history port
  read-only. Qadi is called speculatively, and a review query is the most
  speculative call there is.

An allow carrying a binding obligation is therefore reported as an allow, with
the duty on the decision where a reviewer can read it. `filterSubjects` loses
that detail exactly as `check` loses it against `decide`, and for the same
reason: a boolean has no room for a duty. The lossy form is the convenience; the
full form is the one an access review should use, because "denied" without "why"
is not reviewable.

### `filterSubjects` is derived from `decideSubjects`

```ts
export interface SubjectDecision {
  readonly subject: AuthSubject;
  readonly decision: Decision;
}

export const filterSubjects: (
  policy: Policy,
  subjects: ReadonlyArray<AuthSubject>,
  options?: EvaluateOptions,
) => Effect.Effect<ReadonlyArray<AuthSubject>, EvaluationError, SubjectSetServices>;
```

One evaluation path, as `labelDominates` is defined through `compareLabels`
([ADR-QD-021](./021-label-lattice.md)) and as every enforcing entry point goes
through one `permitted`. Two implementations of "who passes" would eventually
disagree, and the one that disagreed by allowing would not announce itself.

### Order in, order out, duplicates and all

```
REQUIREMENT: results MUST preserve the input order and MUST NOT deduplicate.
```

A review is read beside the list it was asked about, so position is the join key.
Deduplicating by `id` would be a helpful-looking transform that silently drops a
row the caller is expecting to see, and two subjects sharing an id is the
caller's fact to have.

### Sequential, and not because of E3

`filter` and the combinators are sequential and short-circuiting
([ADR-QD-013](./013-short-circuit-default.md)), and the roadmap lists *concurrent
evaluation* as blocked by E3, because combining algorithms and evaluation order
are one design question.

Subject-set evaluation is **not** blocked by that: separate subjects produce
separate decisions and nothing combines them, so there is no algorithm to fix
first. It is sequential for a different reason. A batch multiplies the load on
the caller's attribute resolver and relationship store by the number of subjects,
and an unbounded fan-out onto somebody else's database is not a default to choose
on their behalf. If concurrency is added it should arrive as a bounded option on
`EvaluateOptions`, not as a change of default.

### What is not added

No new error, no new policy variant, no schema change, and nothing in
`@qadi/react`. E6 is the first enabler to touch neither `Policy` nor the codec —
it is a second way to call the evaluator, not a new thing to say in a policy. A
render-time hook is deliberately absent: a component asking "who else can see
this?" is asking an administrative question on a user's render path, and the
answer belongs on a server.

## Consequences

**Positive**:

- The review query NGAC is worth taking seriously for is now expressible without
  any of NGAC. Both directions are covered: `filter` answers "what can this user
  reach", `filterSubjects` answers "who can reach this object".
- A batch job needs no synthetic subject. Constructing a fake `CurrentSubject` to
  satisfy a requirement it does not use is precisely the shape that later gets
  mistaken for a real one.
- Every policy feature composes into it for free: labels, history, obligations
  and actions all work, because this reuses `evaluate` rather than
  reimplementing traversal.

**Negative**:

- The cost is `O(subjects × policy)` with resolver calls in the inner loop, and
  the API makes that easy to reach for on a list of every user in a system.
  Documented, not prevented — the caller's candidate list is the caller's to
  bound, exactly as it is for `filter`.
- Two entry points that look like `filter` and do not enforce like it. The
  asymmetry is real and the names do not carry it; the behaviour document states
  it and a test pins it.
- `decideSubjects` retains a full `Decision`, including a trace tree, per
  subject. That is what makes a review reviewable and it is also the memory
  profile; a caller wanting only the verdicts has `filterSubjects`.

**Trade-off accepted**: `Exclude<EvaluationServices, CurrentSubject>` is a
computed type in a public signature, which reads less clearly in an editor than a
hand-written union would. The alternative drifts silently the next time a service
joins `EvaluationServices`, and a requirement set that quietly stops matching the
evaluator's is worse than a type that needs one hop to read.

**Implemented**, with the evidence the
[Definitions of Done](../process/definitions-of-done.md) require:
[14 — Subject Sets](../behaviors/14-subject-sets.md),
[INV-QD-016](../invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone),
`@REQ-QD-014`.

Three notes from building it.

**The type held the central rule; no test had to.** Dropping the
`provideService` and letting the evaluator read the ambient subject does not
compile — `SubjectSetServices` excludes `CurrentSubject`, so there is no ambient
subject to read. This is the first enabler where the load-bearing property is
enforced by the requirement channel rather than by an assertion, and it is worth
noting because the same property stated as a comment would have decayed.

**The fixture library had the leak the invariant warns about.**
`recordingAttributeResolver` in `@qadi/testing` answers every subject from one
flat table, ignoring the `subjectId` it is handed. That was harmless while an
environment named one subject and is a cross-subject leak the moment a batch runs
over it — precisely
[INV-QD-016](../invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone)'s
implication, found in our own test toolkit rather than in a caller's. It is
documented rather than changed, because a keyed table is a different fixture and
the existing one is correct for what it is used for. `qadiTestLayer` was
refactored to *be* `qadiReviewLayer` plus a subject, so the two cannot drift
apart on a default.

**[MOD-QD-034](../models/34-ngac.md) forecast this better than the matrix did.**
It named the fan-out hazard — "a batch API that fans out unboundedly is a
denial-of-service surface reached through a review screen" — which is why the
shipped implementation is sequential, and it named
[INV-QD-016](../invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone)'s
property before there was anything to state it about. It was wrong on one
mechanism: it expected N subjects to mean N rebuilt environments, where
`provideService` supplies one service into the environment already there.
