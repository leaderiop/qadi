# 25 — Inspection

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-25                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-061) |

_Previous: [24 — The Decision Sink](./24-decision-sink.md)_

---

Six questions this library could pose and could not answer. Each was found the
same way — by auditing a devtools design against the code and finding the data
computed and discarded, or never computed at all — and each is a fact about
authorization rather than a feature of a tool, which is why they live in
`@qadi/core` and not in a UI.

## BEH-QD-189: A lookup reports how the cache answered

> **See:** [BEH-QD-161](./21-decision-cache.md), [INV-QD-025](../invariants.md)

```ts
export type CacheOutcome = "hit" | "coalesced" | "miss";
export interface CacheLookup { readonly trace: Trace; readonly outcome: CacheOutcome }
```

```
REQUIREMENT: `getOrCompute` MUST report which of its three paths it took.
```

```
REQUIREMENT: A `DecisionRecord`'s `cache` MUST be absent when no cache was
             consulted, and MUST NOT be reported as a miss.
```

`getOrCompute` returned a bare `Trace`, so "was this decision cached?" was
answerable only as `qadi_decision_cache_lookups_total` — a **process-global**
frequency shared by every `decisionCacheLayer()` in the process. An operator
could see a hit *rate* across every cache at once and never learn whether the one
decision in front of them had been recomputed.

Absence and `"miss"` are different facts and are kept apart: `"miss"` says the
cache was asked and did not have it; absence says there was nothing to ask.

**This does not weaken [INV-QD-025](../invariants.md).** That invariant is about
the *decision* — a hit produces the same verdict, trace and fields as a miss, and
still does. What differs is what an observer is told about how the answer was
reached, which is the category `durationMillis` and the evaluation id have always
been in.

## BEH-QD-190: A cache can be emptied

```
REQUIREMENT: `DecisionCacheShape` MUST expose `clear`, discarding every
             completed entry.
```

```
REQUIREMENT: `clear` MUST NOT cancel a `compute` already in flight.
```

The only way to empty a cache was to discard the layer scope, which a tool
running *inside* that scope cannot do — so an operator who could see a stale
decision, and knew exactly why it was stale, had nothing to do about it.
`useInvalidate` in `@qadi/react` is not this: it invalidates *atoms*, and an
invalidated atom re-evaluating through a warm cache receives the same cached
trace back.

In-flight work is left alone deliberately. Those fibers are answering questions
asked *before* the flush, and cancelling them would turn a housekeeping action
into a source of failures.

## BEH-QD-191: A policy's depth is measurable, and agrees with the bound

> **Invariant:** [INV-QD-037](../invariants.md#inv-qd-037-a-measured-depth-agrees-with-the-evaluated-bound)

```ts
export const policyDepth: (self: Policy) => number;
```

```
REQUIREMENT: `policyDepth(p) <= n` MUST hold exactly when
             `evaluate(p, { maxDepth: n })` does not raise `PolicyTooDeep`.
```

```
REQUIREMENT: An empty `allOf`, `anyOf` or `rules` MUST be depth 0.
```

`maxDepth` is an evaluation *input* defaulting to
[`DEFAULT_MAX_DEPTH`](./08-serialization.md); nothing on a `Policy` recorded how
deep it actually was. A caller wanting to know — a tool rendering a tree, or one
deciding whether a decoded policy will evaluate at all — had to walk it and guess
at the convention, and **a second walk that miscounted by one would report a
policy as safe that the evaluator then refuses.** So the agreement is the
requirement, and the test asserts it against `evaluate` in both directions rather
than asserting a number.

Empty composites are 0 because the evaluator never descends into them, and the
bound is about descent.

## BEH-QD-192: A permission names the role that granted it

> **Invariant:** [INV-QD-038](../invariants.md#inv-qd-038-provenance-and-flattening-agree)

```ts
export const permissionProvenance: (self: Role) => ReadonlyArray<PermissionGrant>;
```

```
REQUIREMENT: The permissions reported MUST be exactly the set
             `flattenPermissions` returns.
```

```
REQUIREMENT: A grant MUST name the role holding the permission and the path
             walked from the queried role to it.
```

`flattenPermissions` computes precisely this and discards all of it — its `visit`
closure holds the granting role's name and calls `keys.add` without it. So "own
permissions tinted, inherited ones gray, with the path" could be answered only by
a caller re-walking the graph and re-deriving a traversal order that might not
match the one that decides.

**A separate function, not a replacement.** `flattenPermissions` runs inside
`makeSubject` — once per subject, so per request on a server — and allocating a
path array per permission there would make every caller pay for what only an
explorer wants. The two are held in agreement instead, which is the invariant.

A single-element path means the queried role granted it directly. Diamonds
resolve as they do in the flatten: first path wins, by the shared visited-set
walk.

## BEH-QD-193: An unknown parent role is reported

```
REQUIREMENT: `resolveRoleGraph` MUST report every parent name no definition
             supplied, once per resolve.
```

```
REQUIREMENT: It MUST still resolve, granting less rather than failing.
```

The lenient drop is correct and stays — partial role catalogues are a normal
deployment state, and failing closed here would deny every request rather than
merely granting less. **Doing it silently was the defect.** A typo in one parent
name produced a role granting fewer permissions than its author wrote, with
nothing said at any level: the same shape as `dehydrateDecisions` before it
gained `onDropped` ([BEH-QD-146](./19-hydration.md)), and the same fix.

Reported once per resolve with every unknown name, rather than once per
occurrence: a catalogue missing one widely-inherited role would otherwise emit
the same warning dozens of times and bury it. `onUnknownParent` replaces the
warning for a caller who would rather alert.

A genuine cycle still fails with `CircularRoleInheritance` — that is a
different thing, and unrepresentable for by-value roles
([ADR-QD-015](../decisions/015-role-dag-acyclic-by-construction.md)).

## BEH-QD-194: Two traces can be compared, and the node that flipped named

```ts
export const diffTraces: (before: Trace, after: Trace) => ReadonlyArray<TraceDifference>;
export const flippedAt: (before: Trace, after: Trace) => VerdictChanged | undefined;
```

```
REQUIREMENT: `diffTraces` MUST report verdict, reason, field and obligation
             changes, each addressed by a path from the root.
```

```
REQUIREMENT: Differences MUST be ordered parents before children.
```

```
REQUIREMENT: Where the two trees differ in child count, `diffTraces` MUST report
             that and MUST NOT descend past it.
```

The question a what-if answers is not "did the verdict flip" — that is one
boolean the caller already has — but **which node flipped it**, and nothing could
answer it. `isMismatch` compares two decisions by verdict alone, returns a
boolean, and names nothing; comparing rendered strings reports a difference
without locating one.

The ordering is what makes `flippedAt` meaningful: it returns the first verdict
change, which must therefore be the outermost.

Structural divergence stopping the walk is a finding, not a limitation. Two
traces of one policy have the same shape *unless* short-circuiting reached a
different point, which
[INV-QD-020](../invariants.md#inv-qd-020-concurrency-changes-lookups-not-answers)
keeps the trace honest about — and "node 3 changed" is meaningless when one side
has no node 3.

`undefined` and `[]` never compare equal as field sets: they are opposite ends of
the lattice — every field versus none — and treating them as equal would hide a
total loss of visibility ([INV-QD-004](../invariants.md)).

---

_Previous: [24 — The Decision Sink](./24-decision-sink.md)_
