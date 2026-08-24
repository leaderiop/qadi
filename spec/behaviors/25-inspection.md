# 25 — Inspection

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-25                                    |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.2 (2026-08-24): BEH-QD-199–200 — the record's wire form (CCR-QD-063)<br>1.1 (2026-08-24): BEH-QD-195–198 — the obligation gate, port identity, port activity, and the questions an atom set was asked (CCR-QD-062)<br>1.0 (2026-08-24): Initial release (CCR-QD-061) |

_Previous: [24 — The Decision Sink](./24-decision-sink.md)_

---

Twelve questions this library could pose and could not answer. Each was found the
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

## BEH-QD-195: The obligation gate reports what happened

```ts
export type ObligationOutcome = "Discharged" | "HandlerFailed" | "Refused" | "NotRequired";
```

```
REQUIREMENT: An allow carrying obligations MUST produce an `ObligationRecord`
             naming the outcome, paired to the decision by evaluation id.
```

```
REQUIREMENT: An allow carrying none MUST produce nothing.
```

The gap this closes is a fidelity gap in the log, not a decoration: a binding
obligation nobody discharges turns an **allow** into a refusal at the
enforcement boundary, so a log of decisions alone showed such a request as
`ALLOW` while the caller received `UndischargedObligation`.

**Per decision, not per obligation, and that limit is honest.**
`ObligationHandler` receives the whole array and returns `void`, so the library
observes that a set was presented and that the handler succeeded or failed —
never which individual duty was met. Reporting per-obligation state would mean
changing the handler contract, and a handler reporting falsely would still be
unverifiable. The four outcomes are what can actually be known.

Reporting must not change the outcome: a handler that fails reports
`HandlerFailed` and then fails **unchanged**, so a sink can no more rewrite an
enforcement result than it can a decision
([INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)).

`decide` and `check` never reach this gate — they report rather than enforce, so
obligations are the caller's to read off the decision.

## BEH-QD-196: A port says which implementation it is

```
REQUIREMENT: Every port Shape MUST carry an optional `name`, and every
             implementation shipped here MUST set it.
```

```
REQUIREMENT: A wrapper MUST name itself around what it wrapped.
```

A service value is an anonymous object literal, so the only way to distinguish a
fail-closed default from a real store was to call it and infer from the answer.
An operator seeing "everything denies" could not see that `AttributeResolverNone`
was wired — which is the single most likely cause of exactly that symptom.

`name` is **optional**, so no caller's implementation breaks, and **nothing
branches on it**. It is a label a reader sees, in the same category as
`StoredRecord.environment`, never an input to a decision. A wrapper composes —
`"attributeResolverFromRecord (retrying)"` — because losing the base
implementation's identity is losing the part that matters.

## BEH-QD-197: Port activity is counted

```
REQUIREMENT: `qadi_port_calls_total` MUST count calls the evaluator makes into a
             port, keyed by port.
```

```
REQUIREMENT: An attribute already present on the subject MUST count nothing.
```

Nothing counted port calls, so an attribute store answering normally and one no
policy ever consulted looked identical — opposite problems with the same
symptom.

The second requirement is the short-circuit guarantee
([INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)) visible
as an absence: the evaluator consults the subject first and calls the port only
on a miss. A counter that fired regardless would make a resolver look busy when
it was never reached.

`qadi_port_retries_total` counts failed attempts inside a retrying wrapper.
Paired with the call count, that is a store *degrading* — the reading neither
number gives alone.

**Metrics rather than the sink, deliberately.** `Metric.MetricRegistry`'s default
is memoised on the reference, so these are readable with **zero wiring** — the
one Effect signal that can be. Correlating calls to a single evaluation would
mean threading a collector through `evaluateNode`, risking the short-circuit
guarantee for a debug view, so the Services screen gets aggregates and the
decision inspector does without.

## BEH-QD-198: An atom set records the questions it was asked

```ts
readonly asked: () => ReadonlyArray<AskedQuestion>;
```

```
REQUIREMENT: `asked` MUST record each distinct question once, in the order first
             asked, and MUST count a structurally equal policy as the same
             question.
```

This is the honest basis for a "gates in the tree" panel, and the reason that
screen is keyed by **question** rather than by component instance. `Atom.family`
keys structurally, so ten `<Can policy={isAdmin}>` in different places are **one
atom**: the library cannot tell them apart, and a panel listing ten rows would
invent a distinction the architecture does not have.

Recorded in the atom layer rather than by components registering themselves.
[AGENTS.md §13](../../AGENTS.md) keeps the React glue to one
`useSyncExternalStore` call and decisions out of React state; an instance
registry would breach both, and DOM highlighting — which needs one — is dropped
rather than bought at that price.

## BEH-QD-199: A record has a wire form, decoded as untrusted

```ts
export const SinkRecordWire: Schema.Codec<…>;
export const toWire: (record: SinkRecord) => SinkRecordWire;
export const fromWire: (wire: SinkRecordWire) => SinkRecord;
export const decodeRecord: (input: unknown) => Effect<SinkRecord, SchemaIssue>;
```

```
REQUIREMENT: `decodeRecord` MUST validate untrusted input, and MUST NOT produce
             a half-built record.
```

An in-memory sink hands a consumer real objects. Anything crossing a process
boundary — a socket to a devtools page, a replica forwarding to a shared store, a
serverless function shipping its log before it dies — needs a form that survives
JSON and rebuilds on the far side.

**A record crossing a process boundary crosses a trust boundary**, which is
exactly the reasoning [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)
applies to policies. So the wire form is a Schema and decoding validates rather
than casts: a payload naming a policy shape the ADT does not have is refused,
not walked.

The wire shape lives beside the record it describes rather than inside whichever
transport carries it first, because it is a contract two processes agree on, not
a transport detail.

```
REQUIREMENT: An `EvaluationError` MUST cross carrying its tag and its stable
             code, and MUST be rebuilt from the **tag**.
```

`ERROR_CODES` exists, by its own comment, "for logging and cross-process
correlation"; this is that use. The code is written and then **ignored on
decode** — trusting a sender's code to choose a class would let it name one
error and receive another.

The mapping is hand-written, and that is forced: [AGENTS.md §4](../../AGENTS.md)
requires `Data.TaggedError` and explicitly not `Schema.TaggedErrorClass`, so the
errors cannot be Schema-derived where they are defined. A hand-written codec
drifting from its type is the defect this library was rewritten to remove, so a
**round-trip property over generated policies** stands in for the gate the policy
codec gets.

## BEH-QD-200: What the wire cannot carry, it says so

```
REQUIREMENT: An error's `cause` MUST be rendered to a string.
```

`cause` is `unknown` — whatever a caller's resolver threw — so it may be an
`Error`, a circular object, or a function, none of which survive JSON. Rendering
it keeps the diagnostic and puts the loss in the type instead of at the first
unserializable value. An `Error` keeps its message; a value whose `toString`
throws yields a fixed marker, because the encoder a transport calls must never be
able to break the thing it observes.

```
REQUIREMENT: A decision record naming neither outcome MUST decode to a `Failed`
             that says so.
```

Unreachable for anything this library encodes, but the wire is untrusted. A row
reading "the sender sent neither outcome" beats a silently dropped record, and it
can never be mistaken for a decision — which is the same reason `DecisionOutcome`
is a closed two-tag union in the first place.

**Optional fields normalise.** `Schema.optional` drops an absent key on decode,
so a field written as explicitly `undefined` arrives absent. Both read as
`undefined`, so nothing downstream can tell; it is stated here because a test
comparing structurally can.

---

_Previous: [24 — The Decision Sink](./24-decision-sink.md)_
