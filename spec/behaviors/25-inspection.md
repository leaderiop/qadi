# 25 — Inspection

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-25                                    |
> | Revision       | 1.10                                           |
> | Effective Date | 2026-10-05                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.10 (2026-10-05): BEH-QD-199 — the wire is versioned: version 1 read for good, version 2 carries one tagged `outcome` and is what the encoder writes, any other version refused as `UnsupportedVersion`; the reader ignores an unknown top-level envelope key and still refuses one at any nested position (GH-01, ADR-QD-903); BEH-QD-200 — a decision record naming neither outcome, or both, is refused rather than given an invented `MissingResource` or a silently chosen `decided` (tickets 96, 155, CCR-QD-904)<br>1.9 (2026-10-05): BEH-QD-199 — the record wire is one operation each way (`encodeSinkRecord`/`encodeSinkRecordString`, `decodeSinkRecord`/`decodeSinkRecordString`), and the error requirement no longer claims a wire-carried code; BEH-QD-200 — `cause` crosses through `Schema.Defect()` on every path, and the sender refuses, with a path, whatever would not round-trip (ADR-QD-902, CCR-QD-903)<br>1.8 (2026-10-05): BEH-QD-196's wrapper-naming requirement covers every derived wrapper, for all five ports; BEH-QD-197: `qadi_port_retries_total` and `qadi_port_timeouts_total` are keyed by all five ports, each preregistered (ADR-QD-901, CCR-QD-901)<br>1.7 (2026-10-04): BEH-QD-191 restated — `policyDepth` is exact in both directions, counts matcher nesting, and is stack-safe; BEH-QD-300–302 added (`foldPolicy`, `fieldsOf`, `POLICY_TAGS`) (ADR-QD-090, CCR-QD-170)<br>1.6 (2026-10-04): BEH-QD-197 — a second metric requirement: `qadi_predicate_port_calls_total` counts `toPredicate`'s port calls by port, and `qadi_port_calls_total` keeps counting the evaluator's only (ADR-QD-077, CCR-QD-153)<br>1.5 (2026-09-08): BEH-QD-199 gains an explicit requirement that `decodeRecord` reject an excess property inside its embedded `Policy` — `decodeSinkRecordWireUnknown` decoded with no `ParseOptions` at all, unlike every one of `Policy.ts`'s own untrusted entry points (issue #78, CCR-QD-139)<br>1.4 (2026-09-08): BEH-QD-199's `decodeRecord` signature corrected to `Effect<SinkRecord, PolicyDecodeTooDeep \| SchemaIssue>` — the depth guard's error was missing from the doc entirely — and the untrusted-decode discussion gained a note on that guard (CCR-QD-134)<br>1.3 (2026-09-07): BEH-QD-194 gains an explicit requirement that `ObligationsChanged` compare by the whole duty, not `id` alone — `diffTraces` compared by `id` only, contradicting `Obligation.ts`'s own "not an identity" note (issue 45, CCR-QD-114)<br>1.2 (2026-08-24): BEH-QD-199–200 — the record's wire form (CCR-QD-063)<br>1.1 (2026-08-24): BEH-QD-195–198 — the obligation gate, port identity, port activity, and the questions an atom set was asked (CCR-QD-062)<br>1.0 (2026-08-24): Initial release (CCR-QD-061) |

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

> **Corrected in CCR-QD-077.** This paragraph continued: "`useInvalidate` in
> `@qadi/react` is not this: it invalidates *atoms*, and an invalidated atom
> re-evaluating through a warm cache receives the same cached trace back." That
> was true, and it was a defect being described rather than a boundary being
> drawn — [BEH-QD-069](./09-react.md#beh-qd-069-invalidation) requires
> invalidation to discard every decision, and a caller who cannot observe any
> discarding has not been given that. `useInvalidate` now clears a
> `DecisionCache` in its layer before the atoms recompute.

`clear` remains what it always was and is still worth having: an operator's
flush, reachable from a tool, independent of any React context.

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
             `evaluate(p, { maxDepth: n })` does not raise `PolicyTooDeep`,
             whichever subject asks and whatever any branch would short-circuit
             past.
```

```
REQUIREMENT: `evaluate` and `toPredicate` MUST check nesting depth before any
             other judgement: an over-deep policy is `PolicyTooDeep` whatever its
             child order, and ahead of the fields refusal.
```

```
REQUIREMENT: A leaf that carries a matcher (`HasAttribute`,
             `HasResourceAttribute`) MUST contribute `matcherDepth` of that matcher
             to `policyDepth`, because the evaluator recurses through it.
```

```
REQUIREMENT: An empty `allOf`, `anyOf` or `rules` MUST be depth 0.
```

```
REQUIREMENT: `policyDepth` MUST NOT exhaust the call stack for any caller-held
             policy, whatever its nesting depth or width.
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

Until [ADR-QD-090](../decisions/090-a-tree-is-folded-through-one-seam.md) the
converse did not hold. `anyOf([hasRole("editor"), not(not(not(hasRole("x"))))])`
has depth 4, yet `evaluate(…, { maxDepth: 1 })` succeeded for a subject holding
`editor`, because `First` short-circuits before descending: whether a policy was
"too deep" depended on who was asking. It is now a property of the policy, and
`RolesAndDepth.test.ts` asserts the agreement over short-circuiting policies too.

## BEH-QD-300: A policy folds bottom-up through one seam

> **Invariant:** [INV-QD-090](../invariants.md#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack)
> **See:** [ADR-QD-090](../decisions/090-a-tree-is-folded-through-one-seam.md)

```ts
export const foldPolicy: <R>(
  self: Policy,
  combine: (node: Policy, children: ReadonlyArray<R>) => R,
) => R;
```

```
REQUIREMENT: `foldPolicy` MUST call `combine` for a node only after it has
             combined every one of that node's children, handing the results over
             in `childrenOf` order (`Rules` rows in row order).
```

```
REQUIREMENT: A subtree reachable by two paths (the same object) MUST be combined
             once, and every parent MUST receive the same result reference.
```

```
REQUIREMENT: `foldPolicy` MUST NOT exhaust the call stack for any nesting depth
             or width, and a cyclic policy MUST throw rather than hang.
```

`policyDepth`, `simplify`, `explain`, `toPredicate`'s refusal pass and devtools'
remedy derivation are all `foldPolicy` users, so each keeps only its per-tag
semantics and none writes its own traversal.

## BEH-QD-301: A node reports its own field restriction

```ts
export const fieldsOf: (self: Policy) => ReadonlyArray<string> | undefined;
```

```
REQUIREMENT: `fieldsOf(p)` MUST be the `fields` that node itself carries, never
             its children's, and `undefined` for a node that narrows nothing. A
             leaf restricted to no fields (`fields: []`) MUST return `[]`, not
             `undefined`.
```

A walker asking whether anything in a tree restricts visible fields folds over
this rather than listing the field-bearing tags itself, and a new `Policy` tag is
a compile error here, so its author must decide whether it narrows visibility.

## BEH-QD-302: The tag list is derived from the schema

```ts
export const POLICY_TAGS: readonly [
  "HasPermission", "HasRole", "HasAttribute", "HasResourceAttribute",
  "HasRelationship", "HasAction", "HasActed", "HasNotActed", "HasCustom",
  "HasSignature", "AllOf", "AnyOf", "Rules", "Not", "Obliged", "Labeled",
];
```

```
REQUIREMENT: `POLICY_TAGS` MUST list every `Policy` tag exactly once, in the
             schema union's declaration order, and MUST be derived from that
             union rather than restated.
```

`TraceSchema`'s `policyTag` and the `qadi_denials_by_policy_tag_total` metric's
closed domain both read it, replacing two hand-written copies.

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
REQUIREMENT: An obligation change MUST be judged by the whole duty — `id`,
             `attributes` and `advisory` — not by `id` alone. Two duties
             sharing an `id` with different `attributes` or a different
             `advisory` flag are different duties (`Obligation.ts`'s own "not
             an identity" note), and `ObligationsChanged` MUST report that
             difference.
```

> **Corrected (CCR-QD-114).** `diffTraces` originally reduced each side to
> `obligations.map((o) => o.id)` and compared those id lists, so two
> evaluations whose obligation kept its `id` but changed `attributes` or
> `advisory` underneath it produced an empty diff — "nothing changed" for a
> caller whose duty had, in fact, changed. `ObligationsChanged.before`/`after`
> now carry the whole `Obligation`, compared as a multiset by value
> (`Equal.equals`, the same comparison `unionObligations` already uses), which
> is the judgment call issue 45 asked for: content diffing, not documenting
> id-only comparison as intended, because this codebase's own obligation
> semantics already say `id` is not an identity.

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
REQUIREMENT: A wrapper MUST name itself around what it wrapped. Every derived
             wrapper — `…Retrying`, `…Bounded`, `…TimingOut` for each of the
             five ports, and the `recordingPort` decorator — composes
             "<inner> (<suffix>)", reading "?" for an unnamed inner.
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

```
REQUIREMENT: `qadi_predicate_port_calls_total` MUST count calls `toPredicate`
             makes into `AttributeResolver` and `DecisionHistory`, keyed by port,
             and `qadi_port_calls_total` MUST keep counting the evaluator's only.
```

A sibling rather than a second series of the first: `qadi_port_calls_total` keeps
its meaning, its description and its registry key, so nothing reading it changes
(the description is part of the key, ADR-QD-052). A deployment leaning on
`toPredicate` for row-level security reads its port traffic in the second metric,
and total port traffic is the sum of the two.

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
number gives alone. `qadi_port_timeouts_total` counts calls a timing-out wrapper
cut off at its deadline — a store that stopped answering rather than one that
answered with failure.

```
REQUIREMENT: `qadi_port_retries_total` and `qadi_port_timeouts_total` MUST be
             keyed by port and MUST preregister all five port names, since every
             port has a retrying and a timing-out wrapper (BEH-QD-901). Their
             descriptions MUST NOT change, because a description is part of the
             metric's registry key (ADR-QD-052).
```

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

Recorded in the atom layer rather than by components registering themselves —
this is the "asked" half of the panel, and it still answers exactly this
requirement: one row per distinct question, keyed structurally.

**Superseded.** This section previously stopped there, concluding that
[AGENTS.md §13](../../AGENTS.md) forbids anything more: an instance registry
would breach both "no React state for decisions" and "one
`useSyncExternalStore` call", so DOM highlighting — which needs one — was
dropped rather than bought at that price.
[ADR-QD-053](../decisions/053-a-gate-can-be-found.md) found the premise true
and the conclusion false: `GateRegistry.ts` was a module-scope map a guard
writes to from an effect, not React state (it is now each atom set's own
`gates`, ADR-QD-080), and nothing in it re-renders
anything, so neither rule is touched. The panel now shows both views, because
they are different questions rather than rivals: `asked()` above still says
what has been **asked**, unchanged; `atoms.gates` says who is **asking**,
keyed by component instance instead of by question. DOM highlighting is built
on the second view (`@qadi/devtools`'s lens), not dropped.

## BEH-QD-199: A record has a wire form, encoded and decoded by one operation each way

```ts
export const SinkRecordJson: Schema.Codec<…>; // version-2 bytes | version-1 bytes, each a version's encoded side
export type SinkRecordJson = …;
export type WireVersion = 1 | 2;
export const WIRE_VERSIONS: ReadonlyArray<WireVersion>; // [1, 2]: what decodeSinkRecord reads
export const encodeSinkRecord: (record: SinkRecord) => Result<SinkRecordJson, SinkRecordNotEncodable>; // writes version 2
export const encodeSinkRecordString: (record: SinkRecord) => Result<string, SinkRecordNotEncodable>;
export const decodeSinkRecord: (input: unknown) => Result<SinkRecord, SinkRecordNotDecodable>;
export const decodeSinkRecordString: (text: string) => Result<SinkRecord, SinkRecordNotDecodable>;
// SinkRecordNotDecodable.refusal: NotJson | TooDeep | Malformed | UnsupportedVersion { version, supported }
```

```
REQUIREMENT: Every outbound path — forwarding, the decision stream, the audit
             encoder — MUST produce a record's wire form through
             `encodeSinkRecord`/`encodeSinkRecordString`, and every inbound
             path MUST read one through `decodeSinkRecord`/
             `decodeSinkRecordString`. No adapter may assemble its own guard,
             projection, encode or parse.
REQUIREMENT: `decodeSinkRecord` MUST validate untrusted input, MUST NOT
             produce a half-built record, and MUST NOT throw.
```

```
REQUIREMENT: `decodeSinkRecord` MUST read wire version 1 (no `version` key)
             and wire version 2 (`version: 2`), and MUST decode both to the
             same `SinkRecord` for the same record. It MUST refuse any other
             `version` as `UnsupportedVersion`, naming the version sent and
             the versions it reads, never as `Malformed`.
REQUIREMENT: Version 1 MUST stay readable for good: its schema is frozen, and
             a change to the wire is a new version.
REQUIREMENT: `encodeSinkRecord` MUST write version 2.
```

The wire is versioned
([ADR-QD-903](../decisions/903-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)).
Version 2 carries `version: 2` and the decision's outcome as one tagged value,
`outcome: { _tag: "Decided", decision } | { _tag: "Failed", error }`, the same
closed union `DecisionRecord.outcome` is. Version 1 — every `@qadi/core` before
ADR-QD-903 — has no `version` key and carries the outcome as two optional
fields, `decided` and `failed`. Audit rows are durable, so version 1 is read for
good, unlike the hydration payload's version 1 (ADR-QD-078), which lives in one
cached page. An unknown version has a different fix from a malformed record —
upgrade the reader — so it is a different refusal. Nothing writes version 1 any
more, and a reader on a release before the versioned wire reads only version 1,
so readers of decision records upgrade before writers.

An in-memory sink hands a consumer real objects. Anything crossing a process
boundary — a socket to a devtools page, a replica forwarding to a shared store, a
serverless function shipping its log before it dies — needs a form that survives
JSON and rebuilds on the far side. Before
[ADR-QD-902](../decisions/902-sinkcodec-owns-both-directions.md) every such path
assembled its own subset of a guard, a projection and a schema encode, and each
subset differed: an `Error` cause crossed as `{}` on two paths and as
`{name, message}` on a third, and a cyclic cause ended every subscriber of the
decision stream. One operation each way is what makes "the same wire" true.

**A record crossing a process boundary crosses a trust boundary**, which is
exactly the reasoning [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)
applies to policies. So the wire form is a Schema and decoding validates rather
than casts: a payload naming a policy shape the ADT does not have is refused,
not walked. A refusal is a `SinkRecordNotDecodable` whose closed
`DecodeRefusal` says why: `NotJson` (text only), `TooDeep`, `Malformed` or
`UnsupportedVersion`.

`decodeSinkRecord` pre-checks structural depth before `Schema` ever recurses
into the input — the same `DecodeDepthGuard.ts` guard, in the same order,
`Policy.ts`'s own `fromJson`/`fromJsonValue` run, since the wire embeds
`Policy` and the self-recursive `TraceSchema` and neither has a depth cap of its
own. A payload nested past that guard is refused as `TooDeep` rather than
raising the `RangeError` `Schema.suspend`'s own descent would otherwise raise.

The wire shape lives beside the record it describes rather than inside whichever
transport carries it first, because it is a contract two processes agree on, not
a transport detail. Its outcome shape and any version handling live behind
`decodeSinkRecord`, so they change in `SinkCodec.ts` alone.

```
REQUIREMENT: `decodeSinkRecord` MUST reject an excess property inside its
             embedded `Policy`, not silently strip it.
REQUIREMENT: `decodeSinkRecord` MUST ignore a top-level envelope key it does
             not declare, and MUST still refuse an undeclared key at any nested
             position — the policy, the trace, the decision, the error.
```

The wire embeds the same `Policy` schema across the identical trust boundary
ADR-QD-002 describes, so it shares `Policy.ts`'s `UNTRUSTED_DECODE_OPTIONS`
(`{ onExcessProperty: "error" }`) rather than decoding with `Schema`'s default
`"ignore"`. Before CCR-QD-139 it did not: a wire record whose embedded policy
carried a typo'd field — `{"_tag":"HasPermission","permision":...}` — decoded
successfully, silently dropping the grant rather than reporting the typo,
exactly the class of silent data loss ADR-QD-002 exists to rule out.

The envelope is the one exception, and it is the top level only
([ADR-QD-903](../decisions/903-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)).
A newer sender adding envelope metadata — a `traceparent`, a host name — used to
have every record refused by an older reader for the length of a rolling deploy
(GH-01). `Schema`'s parse options apply to a whole decode call, so the reader
projects the input onto the keys its member declares and then decodes that
strictly: an unknown top-level key is ignored, and an unknown key one level
down is refused as before. A change to content — anything nested — needs a new
wire version, not a new envelope key.

```
REQUIREMENT: An `EvaluationError` MUST cross carrying its tag; its stable code
             is derived from `_tag` on the receiving side (ADR-QD-060), and it
             MUST be rebuilt from the tag.
```

`ERROR_CODES` exists, by its own comment, "for logging and cross-process
correlation"; this is that use. The code is not carried on the wire: a receiver
derives it from the decoded error's `_tag` with `errorCode`, which cannot drift
from the tag the way a second, independently written wire value could, and a
sender cannot make a receiver reconstruct one class by naming another's code.

> **Corrected in CCR-QD-903.** This requirement used to read "MUST cross carrying
> its tag and its stable code". ADR-QD-060 dropped `code` from the wire in 0.5.0;
> the requirement had not followed.

The mapping is not hand-written. Since
[ADR-QD-060](../decisions/060-schema-taggederror-for-the-nine-wire-crossing-errors.md)
(narrowed by
[ADR-QD-072](../decisions/072-schema-taggederror-for-accessdenied-and-undischargedobligation.md))
the wire-crossing `EvaluationError` tags are `Schema.TaggedError` at their own
definition in `Errors.ts` — the measured, budgeted exception `AGENTS.md §4`
carries for exactly this class of error. The wire's error member is nothing
more than `Schema.Union` of those classes themselves, private to
`SinkCodec.ts`. What survives as hand-written, and what the **round-trip
property** below guards, is the tag-driven rebuild into record classes.

## BEH-QD-200: What the wire cannot carry, the sender refuses and names

```
REQUIREMENT: An error's `cause` MUST cross through `Schema.Defect()`: an
             `Error` keeps `name`, `message` and `cause`, and any other value is
             normalised to JSON (a cycle dropped, a `bigint` as "10n", a
             non-finite number as `null`). A record MUST NOT be refused because
             of its cause.
REQUIREMENT: `encodeSinkRecord` MUST refuse, naming the refusal and the path it
             was found at, any value that would not round-trip — a cycle, a
             value nested deeper than the receiver's decode bound, `NaN` or
             `±Infinity` or an invalid `Date`, a function, a symbol, a `bigint`,
             an `undefined` array element, an object JSON renders as something
             it is not (`Map`, `Set`, `RegExp`, binary data, `Error`, a boxed
             primitive, a custom `toJSON`, any other built-in) — MUST refuse
             anything `decodeSinkRecord` would refuse, and MUST NOT throw.
REQUIREMENT: A decision record naming neither outcome, or both, MUST be refused
             by `decodeSinkRecord`; it MUST NOT decode to a record.
```

`cause` is `unknown` — whatever a caller's resolver threw — so it may be an
`Error`, a circular object, or a function. It is diagnostic, and an outage
record is the one an operator most wants to see, so it is normalised rather than
refused. `Schema.Defect()` is a maintained library schema, and now governs
`cause` on every outbound path, not only forwarding (ADR-QD-902 amends
ADR-QD-060).

> **Corrected in CCR-QD-903.** This requirement used to read "An error's `cause`
> MUST be rendered to a string". Since ADR-QD-060 forwarding wrote
> `{name, message}`, and the decision stream and the audit encoder wrote `{}`.

Everything else in a record is checked on the encoded output, by one walk, so no
field can be missed: the refusal is a `SinkRecordNotEncodable` whose closed
`EncodeRefusal` is `Circular`, `TooDeep`, `NonFinite`, `Unrepresentable`,
`Opaque` or `EncodeFailed` (the schema rejected the record, or reading it
threw). Each adapter reports a refusal in its own words and drops only that
record.

**Named normalisations.** A property whose value is `undefined` is absence, not a
hazard: JSON drops the key and decode reads it as absent. A valid `Date` in
`resource` or `params` crosses as its ISO string and decodes as a string. These,
and the `cause` normalisation above, are the only ways a decoded record differs
from the one encoded ([INV-QD-902](../invariants.md#inv-qd-902-whatever-the-record-codec-emits-it-accepts)).

In wire version 2 a record cannot name both outcomes or neither: `outcome` is
one tagged value, and a missing or doubled one is a schema failure like any
other. In version 1 it is unreachable for anything this library encodes, but
the wire is untrusted, so the decode refuses it as
`Malformed` ("names no outcome", "names both outcomes"). A record is not
something to be repaired at the receiver: no outcome is invented and none is
chosen.

> **Corrected in CCR-QD-904.** This requirement used to read "A decision record
> naming neither outcome MUST decode to a `Failed` that says so", and the decode
> invented a `MissingResource` error for it — indistinguishable by code
> (`ACL004`) from a real resolver-wiring failure, so a devtools row or a metric
> bucketed by code could not tell a missing attribute from a malformed record
> (ticket 96). A record naming both outcomes silently kept `decided`, an
> artifact of the order the fields were checked in (ticket 155).

**Optional fields normalise.** `Schema.optional` drops an absent key on decode,
so a field written as explicitly `undefined` arrives absent. Both read as
`undefined`, so nothing downstream can tell; it is stated here because a test
comparing structurally can.

---

_Previous: [24 — The Decision Sink](./24-decision-sink.md)_
