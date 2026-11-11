# 29 — The Subject Simulator

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-29                                    |
> | Revision       | 1.12                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.12 (2026-11-11): BEH-QD-455 — a source choice is prepared in one place: each source's availability and sentence are stated once, a Live preparation captures and each run prepares its own, and the session stores what `prepareSource` returns; BEH-QD-220's refusal and BEH-QD-322's fence name `prepareSource`, the session's former pair of functions being gone (ARCH-72, ADR-QD-050 amendment, CCR-QD-414)<br>1.11 (2026-11-10): BEH-QD-411 — a replay miss is an outage on every port; BEH-QD-221's miss requirements replaced, and a refused-key request is never captured and fails on replay (ARCH-65, ADR-QD-129, CCR-QD-407)<br>1.10 (2026-11-10): BEH-QD-390 — replay is an act: replaying a row always re-seeds, even the row last replayed; seed keeps its same-entry guard; BEH-QD-322's fence lists seed and replay (ARCH-63, ADR-QD-047, CCR-QD-405)<br>1.9 (2026-11-10): BEH-QD-222/225/322: signature rows, the hasCustom named skip, the field table and chip commands (ARCH-61, lost ARCH-48, ADR-QD-047 amendment, CCR-QD-400)<br>1.8 (2026-11-08): BEH-QD-221 — a signature request the capture never saw MUST fail as `SignatureHistoryUnavailable` (code review WR-04, INV-QD-043)<br>1.7 (2026-10-08): the simulator's mechanics (`simulate`, `whatIf`, `sweepPlan`, `capturing`, `replayLayer`, `remedyEdits`, `replayInput`, `baselineDiff`, the form codecs) are package-private; specified here because the simulator screen relies on them, and a host drives `makeSimulationSession` (ARCH-40, ADR-QD-047, CCR-QD-321)<br>1.6 (2026-10-08): BEH-QD-221 — a capture keys by the whole question the port received, not by a projection of it (ARCH-45, CCR-QD-263)<br>1.5 (2026-10-08): BEH-QD-322 — a chosen policy is held by value, not by its position in the rail; `choosePolicy` takes the policy, `PolicyChoice` gains `Evicted`, and the first policy shown is held (ARCH-33, INV-QD-107, CCR-QD-206)<br>1.4 (2026-10-07): BEH-QD-220 — a source that cannot be honoured is refused, and a sweep runs the evaluations it stated; BEH-QD-225 — every field a replay names has a control; BEH-QD-322 — a simulation is a session (ADR-QD-047 and ADR-QD-050 amended, CCR-QD-199)<br>1.3 (2026-10-05): BEH-QD-221 — `CapturedAnswers` is keyed by port name, each map by the port description's `key`; an unseen query's answer is the description's `none`, the same value the named default gives (ADR-QD-094, CCR-QD-177)<br>1.2 (2026-10-05): BEH-QD-223 — every leaf witness is checked against `judgeMatcher` before it is offered, so the requirement holds by construction; `gte(±Infinity)`, `gte(NaN)`, `eq(literal(NaN))` and `eq(literal(undefined))` had produced witnesses the evaluator rejects (ADR-QD-091, CCR-QD-173)<br>1.1 (2026-10-04): BEH-QD-222 — the remedy derivation and the matcher witness MUST be stack-safe (ADR-QD-090, CCR-QD-170)<br>1.0 (2026-08-24): Initial release (CCR-QD-070) |

_Previous: [28 — The Devtools Screens](./28-devtools-screens.md)_

---

The seventh screen, and the only one that **runs** an evaluation rather than
reading records. Six screens report what happened; this one answers what
*would*. See [ADR-QD-050](../decisions/050-a-simulation-is-sealed.md).

Everything below rests on one property, and it is not a display concern:
`Effect.provide` adds to a context and cannot remove from one, so a simulator
that supplied only what `evaluate` requires would write a fabricated audit row
per run in any process where a real sink is wired.

## BEH-QD-219: A simulation is sealed, in every source mode

```ts
export const simulate: (
  policy: Policy,
  input: SimulationInput,
  options?: SimulationOptions,
) => Effect.Effect<DecisionOutcome>;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `SimulationOptions`, `simulate`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: A simulation MUST write no DecisionRecord, in any source mode.
```

`simulationLayer` shadows `DecisionSink` with a discarding one and
`DecisionCache` with a private one. **Shadowing rather than omission**, because
omission is not expressible — `Effect.provide` has no complement — and the
consequence of skipping it is not cosmetic: a what-if sweep of eight edits
writes eight rows that read exactly like decisions somebody asked for
([INV-QD-042](../invariants.md)).

```
REQUIREMENT: A simulation MUST resolve every question through the source it was
             given, and reach nothing else.
```

Asserted by running one beside a layer whose every port dies: the simulation
still decides, because it never reached them.

```
REQUIREMENT: `CurrentSubject` MUST come from the form, never from a supplied layer.
```

In the type, not by convention: `LiveSource` carries
`Layer<Exclude<EvaluationServices, CurrentSubject | EvaluationId>>`. The subject
is the thing being simulated, so a layer able to supply one could change *what is
being asked* rather than merely how it is answered.

```
REQUIREMENT: `simulate` MUST NOT fail. A broken port is a `Failed` outcome.
```

`R` and `E` are both `never`. A panel that could crash on a fixture typo is a
panel nobody trusts, and the outcome ADT the timeline already carries is the
right shape for the answer ([INV-QD-006](../invariants.md)).

## BEH-QD-220: Three sources, and a fourth is a compile error

```ts
export type SimulationSource = FixtureSource | SnapshotSource | LiveSource;
export const causesIO: (self: SimulationSource) => boolean;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `FixtureSource`, `LiveSource`, `SimulationSource`, `SnapshotSource`, `causesIO`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: The source union MUST dispatch exhaustively, with no default.
```

`portsOf` goes through `Match.tagsExhaustive`. Falling through to fixtures would
be the worst available failure: the screen would answer confidently from data
nobody supplied.

```
REQUIREMENT: A sweep's cost MUST be stated before it runs.
```

`sweepPlan` returns the evaluation count and whether the sweep performs I/O
without running anything. A count discovered afterwards is not a warning.

```
REQUIREMENT: The sweep MUST run exactly the evaluations it stated.
```

The pairs toggle is part of the plan: `whatIf` takes the same `pairs` the plan
was computed with, so `report.evaluations` equals the stated count in both
positions. A screen that stated three evaluations and ran four would be
announcing a cost it did not keep, and under `Live` the difference is unannounced
lookups against production.

```
REQUIREMENT: A chosen source that cannot be honoured MUST be refused, never
             replaced by another.
```

`portsOf(undefined)` answering from fixtures is the right default for a caller
who never chose, and is pinned as such. The screen's session
([BEH-QD-322](#beh-qd-322-a-simulation-is-a-session)) never passes it: a `Live`
choice with no `ports`, or a `Snapshot` choice with no capture, is refused by
`prepareSource` ([BEH-QD-455](#beh-qd-455-a-source-choice-is-prepared-in-one-place)),
with the choice and the reason, and the session turns that refusal into the run
state; nothing is evaluated.

**`Snapshot` is what makes `Live` defensible rather than merely available.** A
sweep of N edits costs N in-memory folds on fixtures, N live sweeps on `Live`,
and one live run plus N folds on a snapshot.

## BEH-QD-221: A capture records answers, and a replay reproduces them

```ts
export const capturing: (ports: Layer.Layer<EvaluationPorts>) => {
  readonly layer: Layer.Layer<EvaluationPorts>;
  readonly answers: Effect.Effect<CapturedAnswers>;
};
export const replayLayer: (answers: CapturedAnswers) => Layer.Layer<EvaluationPorts>;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `capturing`, `replayLayer`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: Replaying a capture MUST produce the trace the captured run produced.
```

```
REQUIREMENT: A capture MUST key every answer by the whole question the port
             received: the subject (roles, permissions and attributes, not its id
             alone), the resource, and a relationship's depth. It MUST NOT answer
             a question differing in any of them.
```

[INV-QD-043](../invariants.md). An agreement property, and it is stated rather
than assumed because two paths answering one question is precisely the drift this
library treats as a defect.

```
REQUIREMENT: A captured failure MUST replay as that failure, not as a miss.
```

Fail-closed defaults deny, so a replayed outage that became a miss would look
like a correctly-denying policy rather than a broken port.

```
REQUIREMENT: A query the capture never saw MUST fail with the port's own typed
             error, on every port, and MUST NOT answer the port's fail-closed
             default (BEH-QD-411).
```

```
REQUIREMENT: A request whose key is refused (BEH-QD-410) MUST NOT be captured:
             the captured run MUST pass it to the live port unrecorded, and a
             replay MUST fail it with the port's own typed error.
```

`CapturedAnswers` is keyed by port name, each map by the port description's `key`; an unseen query's answer is the description's `none`, the same value the named default gives (ADR-QD-094, CCR-QD-177)<br>1.2 (2026-10-05): BEH-QD-223 — every leaf witness is checked against `judgeMatcher` before it is offered, so the requirement holds by construction; `gte(±Infinity)`, `gte(NaN)`, `eq(literal(NaN))` and `eq(literal(undefined))` had produced witnesses the evaluator rejects (ADR-QD-091, CCR-QD-173)<br>1.1 (2026-10-04): BEH-QD-222 — the remedy derivation and the matcher witness MUST be stack-safe (ADR-QD-090, CCR-QD-170)<br>1.0 (2026-08-24): Initial release (CCR-QD-070) |

_Previous: [28 — The Devtools Screens](./28-devtools-screens.md)_

---

The seventh screen, and the only one that **runs** an evaluation rather than
reading records. Six screens report what happened; this one answers what
*would*. See [ADR-QD-050](../decisions/050-a-simulation-is-sealed.md).

Everything below rests on one property, and it is not a display concern:
`Effect.provide` adds to a context and cannot remove from one, so a simulator
that supplied only what `evaluate` requires would write a fabricated audit row
per run in any process where a real sink is wired.

## BEH-QD-219: A simulation is sealed, in every source mode

```ts
export const simulate: (
  policy: Policy,
  input: SimulationInput,
  options?: SimulationOptions,
) => Effect.Effect<DecisionOutcome>;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `SimulationOptions`, `simulate`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: A simulation MUST write no DecisionRecord, in any source mode.
```

`simulationLayer` shadows `DecisionSink` with a discarding one and
`DecisionCache` with a private one. **Shadowing rather than omission**, because
omission is not expressible — `Effect.provide` has no complement — and the
consequence of skipping it is not cosmetic: a what-if sweep of eight edits
writes eight rows that read exactly like decisions somebody asked for
([INV-QD-042](../invariants.md)).

```
REQUIREMENT: A simulation MUST resolve every question through the source it was
             given, and reach nothing else.
```

Asserted by running one beside a layer whose every port dies: the simulation
still decides, because it never reached them.

```
REQUIREMENT: `CurrentSubject` MUST come from the form, never from a supplied layer.
```

In the type, not by convention: `LiveSource` carries
`Layer<Exclude<EvaluationServices, CurrentSubject | EvaluationId>>`. The subject
is the thing being simulated, so a layer able to supply one could change *what is
being asked* rather than merely how it is answered.

```
REQUIREMENT: `simulate` MUST NOT fail. A broken port is a `Failed` outcome.
```

`R` and `E` are both `never`. A panel that could crash on a fixture typo is a
panel nobody trusts, and the outcome ADT the timeline already carries is the
right shape for the answer ([INV-QD-006](../invariants.md)).

## BEH-QD-220: Three sources, and a fourth is a compile error

```ts
export type SimulationSource = FixtureSource | SnapshotSource | LiveSource;
export const causesIO: (self: SimulationSource) => boolean;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `FixtureSource`, `LiveSource`, `SimulationSource`, `SnapshotSource`, `causesIO`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: The source union MUST dispatch exhaustively, with no default.
```

`portsOf` goes through `Match.tagsExhaustive`. Falling through to fixtures would
be the worst available failure: the screen would answer confidently from data
nobody supplied.

```
REQUIREMENT: A sweep's cost MUST be stated before it runs.
```

`sweepPlan` returns the evaluation count and whether the sweep performs I/O
without running anything. A count discovered afterwards is not a warning.

```
REQUIREMENT: The sweep MUST run exactly the evaluations it stated.
```

The pairs toggle is part of the plan: `whatIf` takes the same `pairs` the plan
was computed with, so `report.evaluations` equals the stated count in both
positions. A screen that stated three evaluations and ran four would be
announcing a cost it did not keep, and under `Live` the difference is unannounced
lookups against production.

```
REQUIREMENT: A chosen source that cannot be honoured MUST be refused, never
             replaced by another.
```

`portsOf(undefined)` answering from fixtures is the right default for a caller
who never chose, and is pinned as such. The screen's session
([BEH-QD-322](#beh-qd-322-a-simulation-is-a-session)) never passes it: a `Live`
choice with no `ports`, or a `Snapshot` choice with no capture, is refused by
`prepareSource` ([BEH-QD-455](#beh-qd-455-a-source-choice-is-prepared-in-one-place)),
with the choice and the reason, and the session turns that refusal into the run
state; nothing is evaluated.

**`Snapshot` is what makes `Live` defensible rather than merely available.** A
sweep of N edits costs N in-memory folds on fixtures, N live sweeps on `Live`,
and one live run plus N folds on a snapshot.

## BEH-QD-221: A capture records answers, and a replay reproduces them

```ts
export const capturing: (ports: Layer.Layer<EvaluationPorts>) => {
  readonly layer: Layer.Layer<EvaluationPorts>;
  readonly answers: Effect.Effect<CapturedAnswers>;
};
export const replayLayer: (answers: CapturedAnswers) => Layer.Layer<EvaluationPorts>;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `capturing`, `replayLayer`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: Replaying a capture MUST produce the trace the captured run produced.
```

```
REQUIREMENT: A capture MUST key every answer by the whole question the port
             received: the subject (roles, permissions and attributes, not its id
             alone), the resource, and a relationship's depth. It MUST NOT answer
             a question differing in any of them.
```

[INV-QD-043](../invariants.md). An agreement property, and it is stated rather
than assumed because two paths answering one question is precisely the drift this
library treats as a defect.

```
REQUIREMENT: A captured failure MUST replay as that failure, not as a miss.
```

Fail-closed defaults deny, so a replayed outage that became a miss would look
like a correctly-denying policy rather than a broken port.

```
REQUIREMENT: A query the capture never saw MUST answer the fail-closed default,
             except where the next requirement says otherwise.
```

`undefined` for an attribute, `Unknown` for a relationship and for history,
`false` for a custom predicate — what a real deployment gets from an unwired port
([INV-QD-007](../invariants.md)). The answer is read from the port's description
(`none`), not re-declared here.

```
REQUIREMENT: A signature request the capture never saw MUST fail as
             `SignatureHistoryUnavailable`, not answer an empty list.
```

The signature request key carries the asker's `meaning` and `signerRole`, which a
store may answer whatever they say, so a what-if that edits either cannot be
answered from the capture. An empty list denies `hasSignature` and grants
`not(hasSignature)`; a failure is neither ([INV-QD-043](../invariants.md),
[ADR-QD-109](../decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md)).

`CapturedAnswers` is keyed by port name (`AttributeResolver`, …), and each map by
that port description's `key`, so the capture and the replay agree about a key by
construction. Both are written once over `@qadi/core`'s port registry —
`capturing` is `decoratePorts`, `replayLayer` is each port's `scriptedPort` — so a
port added to the registry is captured and replayed with no edit here
([ADR-QD-094](../decisions/094-a-port-is-described-once.md)).

## BEH-QD-411: A replay miss is an outage on every port

> **Invariant:** [INV-QD-043](../invariants.md#inv-qd-043-a-snapshot-answers-what-the-live-layer-answered)

```ts
// package-private, packages/devtools/src/model/Capture.ts
const unseenReply: (port: PortName) => PortReply<never>;
```

```
REQUIREMENT: A replay asked a request its capture holds no answer for MUST fail
             with that port's own typed error, built by the port description's
             `failure`, with a cause that says the request was not captured. This
             MUST hold for every port in `@qadi/core`'s registry, under a leaf and
             under `not(leaf)` alike, so a replay never decides from a miss.
```

| Port | A miss replays as |
| ---- | ----------------- |
| `AttributeResolver` | `AttributeResolveError` |
| `RelationshipResolver` | `RelationshipResolveError` |
| `DecisionHistory` | `DecisionHistoryUnavailable` |
| `CustomPredicate` | `CustomPredicateError` |
| `SignatureHistory` | `SignatureHistoryUnavailable` |

A port's `none` denies the leaf that asked, and so grants `not(leaf)`: before ARCH-65
the four ports above `SignatureHistory` answered it on a miss, and a what-if sweep that
wandered outside the captured set could report an allow the capture could not back
([INV-QD-007](../invariants.md)). A miss also says nothing about the real store: a key
may carry what a what-if edited (a signature's `meaning` and `signerRole`, a custom
predicate's subject roles). The policy is one function, not a per-port table, so a port
added to the registry fails closed with no edit. What it costs: a Snapshot replay of a
partial capture shows a failed row for every question the live run did not ask
([ADR-QD-129](../decisions/129-a-replay-miss-is-an-outage-on-every-port.md)).

## BEH-QD-222: A what-if sweep varies the input in both directions

```ts
export const singleEdits: (input: SimulationInput) => ReadonlyArray<SimulationEdit>;
export const remedyEdits: (policy: Policy, input: SimulationInput) => RemedySweep;
export const whatIf: (
  policy: Policy,
  input: SimulationInput,
  options?: WhatIfOptions,
) => Effect.Effect<WhatIfReport>;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `RemedySweep`, `WhatIfOptions`, `remedyEdits`, `singleEdits`, `whatIf`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: A sweep MUST offer both weakenings and strengthenings.
```

They answer two different questions and each is useless for the other's reader.
Dropping a grant can never turn a denial into an allow, so on the screen where it
matters most — a reviewer holding a denial, asking *what would fix it* — a
weakening-only sweep produces a table of rows that all say the same nothing.

The weakenings drop each element of every held field - roles, permissions,
subject attributes, resolver attributes, relationships, events and signatures
([INV-QD-257](../invariants.md#inv-qd-257-each-simulation-input-field-is-described-once)). A signature fixture is a grant like any other: a
`hasSignature` allow is asked *was it the signature?* (`DropSignature`), and a row
for two signatures that differ only in a field the title does not carry
(`signedAt`, `algorithm`, `keyId`) is titled with the chip's own text, so one row
never stands for two. The strengthenings supply what the policy names: a
`hasSignature` requirement is answered with the signature its node describes
(`AddSignature`) - its meaning, its signer role when it names one, and a row
carrying the resource id exactly when the node's scope asks about a resource -
and an opaque `hasCustom` requirement is named as skipped, with the reason that
its answer has no field in the form: it comes from Snapshot or Live.

```
REQUIREMENT: Sweep ordering MUST be deterministic.
```

Derived from the input's own order, so two sweeps of the same input can be read
side by side.

```
REQUIREMENT: A bounded sweep MUST state what it excluded.
```

Pairs grow as the square of the edit count, so second-order sweeps are opt-in and
capped — and `omittedPairs` says how many were dropped. Silent truncation reads
as *these are all the pairs*.

```
REQUIREMENT: A requirement no remedy could be built for MUST be named, with the reason.
```

A remedy row that does not remedy is worse than an absent one, because the reader
takes it as *and even that would not help*. `hasCustom` and a resource-scoped
`hasSignature` with no resource id are therefore reported in `skipped`, not passed
over in silence (ARCH-61 found both were).

```
REQUIREMENT: A sweep's remedy derivation and a matcher witness MUST NOT exhaust the
             call stack for any caller-held policy or matcher, whatever its nesting
             depth.
```

`remedyEdits`, `sweepPlan` and `whatIf` have no `maxDepth` to consult, and a policy
built with the smart constructors is not bounded by the decode limit, so the
derivation is a fold over `foldPolicy` and `foldMatcher` rather than a native
recursion that crashed at about two thousand levels (ARCH-02,
[ADR-QD-090](../decisions/090-a-tree-is-folded-through-one-seam.md)).

## BEH-QD-223: A matcher is read backwards to a witness, or declined

```ts
export const satisfyingValue: (matcher: Matcher, input: SimulationInput) => Synthesised;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `Synthesised`, `satisfyingValue`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: A synthesised value MUST satisfy the matcher it came from.
```

Checked against `evaluateMatcher` itself — the function the evaluator runs —
rather than against a test's restatement of what the matcher means. `Eq` compares
with `===`, so a literal object is passed through by reference rather than
copied; `Contains` and `SomeMatch` want the needle *inside* an array; `Size`
wants a value with a `length`.

```
REQUIREMENT: Every leaf witness MUST be judged by `judgeMatcher` before it is
             offered, and declined — "the synthesised value does not satisfy
             the matcher" — when its verdict is not `Held`.
```

Reading a matcher backwards is a second belief about what a comparison accepts,
and it lagged the evaluator's: `gte(Infinity)`, `gte(-Infinity)` and `gte(NaN)`
offered the bound itself, `eq(literal(NaN))` offered `NaN`, and
`eq(literal(undefined))` offered `undefined` — none of which the evaluator
accepts (CCR-QD-173). Checking each leaf makes the requirement above true by
construction, whatever comparison semantics do next. Only leaves are judged: a
wrapper's witness (`{field: v}`, `[v]`, an array of length `v`) holds exactly when
its child's does, so the check costs no recursion and the derivation stays
stack-safe at any depth (BEH-QD-222). `Gte` also declines a non-finite bound with
its own reason, as `Lt` already did.

```
REQUIREMENT: Where no witness can be derived, the reason MUST be reported.
```

A closed union rather than `unknown | undefined`, because `undefined` is a value
an attribute can genuinely hold — it is what an absent one resolves to — so the
two would be indistinguishable exactly where the distinction matters.

```
REQUIREMENT: A `Not` MUST NOT be descended into for remedies.
```

Satisfying a requirement under a negation makes the enclosing node deny, so a
remedy there is a removal — and every removal expressible over a subject's own
grants is already offered by `singleEdits`. Declining to descend loses nothing
and avoids relabelling anti-remedies as strengthenings, which inverts the one
thing the table is read for.

## BEH-QD-224: A comparison is four cases, not a list plus a flag

```ts
export type Comparison = Compared | BecameError | Recovered | StillFailed;
export const compareOutcomes: (baseline: DecisionOutcome, edited: DecisionOutcome) => Comparison;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `compareOutcomes`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: An edit that turns a decision into a failure MUST be reported as an
             error, never as a denial.
```

Only `Compared` has a trace on each side to walk. A shape carrying
`differences: []` for the other three would report *no difference* for an edit
that turned an allow into an outage — the inversion
[INV-QD-006](../invariants.md) exists to prevent.

```
REQUIREMENT: A difference that is not a flip MUST still be reported.
```

A narrowed field set and a dropped duty both change what the caller may actually
do ([INV-QD-004](../invariants.md)), and a table reporting only flips would call
that *no change*.

```
REQUIREMENT: A sweep whose baseline failed MUST still run.
```

A failing baseline is what the reviewer came to the screen about, so refusing to
sweep would withhold the answer exactly when it is wanted. Every row compares
against no trace and says which case it is.

## BEH-QD-225: A replay says what it could not seed

```ts
export const replayInput: (entry: TimelineEntry) => Replay;
export const baselineDiff: (entry: TimelineEntry, simulated: DecisionOutcome) => Baseline;
export const matchesBaseline: (self: Baseline) => boolean;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `baselineDiff`, `matchesBaseline`, `replayInput`. Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: A replay MUST seed the policy, the action and the resource, and MUST
             name every field it could not seed.
```

A record names the subject **by id** and carries nothing else about them, and it
carries what the ports answered only *inside* its trace, never as fixtures a
rerun could use. So the grants are the reviewer's hypothesis — and a form that
filled itself in silently would present that hypothesis as a reproduction of what
happened.

Every field named has a control to supply it: the Fixtures card edits resolver
attributes, relationships, history and signatures alike. Each `UnseededField`
carries the field's `key` as well as its `field` text, and the text is the label
the form shows that field under - both come from the one table that describes the
form's fields (`SimulationFields.ts`, ADR-QD-047), so the list and the form cannot
name one field two ways.

```
REQUIREMENT: An orphan MUST be refused.
```

An obligation outcome whose decision never arrived carries no policy, so there is
nothing to run.

```
REQUIREMENT: A match MUST NOT be claimed where the record cannot attest to one.
```

A truncated payload ships a trace that stops at the root, and a failed row
produced none at all. `matchesBaseline` is false in both cases even when nothing
*differs*: the difference between *no difference found* and *no difference to
find* is the whole value of the check.

**The log is already the snapshot.** A `DecisionRecord` carries the real
`Trace`, so checking a reconstruction against reality needs no live resolvers and
no capture — which is why replay runs nothing.

## BEH-QD-390: Replay is an act

> **Decision:** [ADR-QD-047](../decisions/047-a-headless-devtools-model.md) (amended, CCR-QD-405)

```ts
export interface SimulationSession {
  // …
  readonly seed: (entry: TimelineEntry | undefined) => void;
  readonly replay: (entry: TimelineEntry) => void;
}
```

```
REQUIREMENT: Replaying a row MUST re-seed the simulator, even when it is the row
             last replayed, after another policy was chosen, and after the form
             was edited.
```

The button promises a re-seed, so a second press on the same row must keep it.
Replaying row A, choosing another policy from the rail and replaying A again used to
do nothing: the dock replayed by setting a `seed` prop, React skipped the identical
value, and the session's same-entry guard would have skipped it anyway. `replay` is a
command, not a prop the session reads from an effect, so it re-seeds on every call:
a replay re-seeds the policy and the form from the row, retires a run in flight, and states what it could not seed exactly as a first seed does
([BEH-QD-225](#beh-qd-225-a-replay-says-what-it-could-not-seed)). The dock's `replay`
calls it ([BEH-QD-389](./28-devtools-screens.md#beh-qd-389-the-docks-choices-are-a-session)).

```
REQUIREMENT: `seed` re-run with the entry it last seeded MUST leave the form as it is.
```

`seed` is the host's prop-driven path, and an effect re-run must not wipe a
half-filled form, so it keeps its same-entry guard. The two are told apart by method,
not by comparing identities, and both run one re-seed, so they cannot drift. This
reverses ARCH-20's "seed flows in as a prop" for replay only (ADR-QD-047, amended
2026-11-10).

Pinned by `SimulationSession.test.ts` ("replaying a row"), `DevtoolsDock.test.tsx`
("replays the same row again") and the acceptance scenario *Replaying the same row
again re-seeds the question* (`devtools-simulator.feature`).

## BEH-QD-226: The clock is chosen, and the duration is labelled

```ts
export type SimulationClock = "live" | "deterministic";
```

```
REQUIREMENT: A `Trace` MUST be identical under either clock.
```

A trace carries no time at all, which is why replay comparison was already
deterministic and why the gap `02-screens.md` recorded turned out to be about
presentation.

```
REQUIREMENT: The clock MUST be labelled rather than inferred from the duration.
```

A live run of a trivial policy also reports **zero** milliseconds, because an
in-memory evaluation genuinely takes under one. So `0` cannot distinguish *not
measured* from *measured, and fast*, and only the option the caller passed can.

```
REQUIREMENT: `@qadi/testing` MUST offer the same choice.
```

`TestLayerOptions.clock` takes `"live" | "test"`. It exists because the ids were
reproducible and the clock was not, and **one half of a determinism claim is
worse than neither, because it is believed** — a claim that stood in
`00-overview.md` from revision 0.1 (CCR-QD-069). It survived because
`@effect/vitest` hands `it.effect` a `TestClock`, so every test suite already had
the half that was missing.

## BEH-QD-322: A simulation is a session

```ts
export const makeSimulationSession: (init?: SimulationSessionInit) => SimulationSession;
export interface SimulationSession {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => SimulationSnapshot;
  readonly choosePolicy: (policy: Policy) => void;
  readonly seed: (entry: TimelineEntry | undefined) => void;
  readonly replay: (entry: TimelineEntry) => void;
  readonly run: (kind: "Run" | "Sweep") => Effect.Effect<void>;
  readonly reap: Effect.Effect<void>;
  readonly dispose: Effect.Effect<void>;
  readonly edit: (next: SimulationInput) => void;
  readonly editResourceText: (text: string) => void;
  readonly renameSubject: (to: string) => void;
  readonly addChip: (field: SimulationField, text: string) => ChipAdded;
  readonly removeChip: (field: SimulationField, index: number) => void;
}
export interface SimulationSnapshot {
  // …
  readonly fields: ReadonlyArray<FieldView>;
}
export const prepareSource: (
  choice: SourceChoice,
  have: {
    readonly ports: EvaluationPortsLayer | undefined;
    readonly capture: CapturedAnswers | undefined;
  },
) => SourcePreparation;
```

> Package-private since [CCR-QD-321](../README.md#document-history): `PreparedSource`, `SourcePreparation`, `prepareSource` ([BEH-QD-455](#beh-qd-455-a-source-choice-is-prepared-in-one-place); `SourceChoice`, `SourceOption` and `SourceRefusal` are exported types). Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: A Live run MUST capture, and a capture MUST be dropped when the
             ports it came from change.
```

The session holds the capture and drops it; that a Live run records at all is
`prepareSource`'s ([BEH-QD-455](#beh-qd-455-a-source-choice-is-prepared-in-one-place)).
The answers cost nothing extra to record and they are what makes `Snapshot`
reachable. A capture is the answers of one environment; replaying it under
another's name is the quiet mismatch this screen exists to prevent. It survives
edits and a re-seed, because its keys include the subject.

```
REQUIREMENT: A superseded run's result MUST NOT be shown.
```

A policy change, a re-seed, a change of ports, a newer run and `dispose` each
move a generation synchronously, so the abandoned run's exit is never applied
whatever order the fibers finish in; `reap` then interrupts the fiber, so a Live
run stops asking the application's resolvers. The commands stay synchronous so a
view may dispatch them while rendering.

```
REQUIREMENT: A result MUST be shown only under the policy, the seed and the
             input it ran against.
```

`stale` covers all three, and a baseline is present only for a result that ran
against the current seed. Policies compare structurally, so a host rebuilding an
equal policy each render does not mark a result stale.

```
REQUIREMENT: A chosen policy MUST be held by its value: a new decision, a reorder
             or a shrink of the rail MUST NOT change it. A policy that leaves the
             rail MUST stay chosen and be marked as no longer in the log. Before
             any choice, the first policy shown is held.
```

The rail lists policies newest-decided first, so a decision on a policy below the
head moves it to the head, and a policy's first decision inserts a row and shifts
every index by one. A choice kept as an index would name another policy the next
time the rail was rebuilt, and the next run would evaluate that one
([INV-QD-107](../invariants.md)). `choosePolicy` therefore takes the policy, so an
index that names nothing cannot be expressed, and `PolicyChoice.index` is a reading
of the current rail, never an input. The choice is compared with `Equal.equals`, as
a result's staleness is: each decision record is decoded on its own, so the policy
object a sighting carries is replaced whenever a newer decision on it arrives, and
only structural equality survives that.

`PolicyChoice` is `None`, `Chosen` (listed, with its current index), `Evicted` (held
but no longer listed, with its label) or `Seeded` (the policy of a replayed row). An
`Evicted` policy is still the one a run evaluates; a view says it has left the log
and does not swap it for a neighbour. The first policy shown is held when the rail
first becomes non-empty and nothing is chosen or seeded, so the default does not
follow the head either. Choosing a policy the rail does not list holds it as
`Evicted` at once.

```
REQUIREMENT: A chip MUST be committed to the draft only through a session
             command, which answers with the refusal when there is one. A chip
             MUST be added to a field by its codec and refused, with the reason,
             when the text is empty, does not decode, or duplicates an element by
             structure. A record field MUST replace a pair of the same name.
```

The session holds the form, not just the draft. `addChip(field, text)` decodes the
text with that field's codec against the form's current subject (so a short-form
edge, event or signature is attributed to the subject in the form), refuses empty
text (`nothing to add`), text the codec refuses, and an element the field already
holds *by structure* (`already there`) - two edges that differ only by subject are
two elements - and otherwise moves the draft. A refusal moves nothing and notifies
no one; the reason is the command's answer (`ChipAdded`), because the uncommitted
text is the view's only state. A record field (attributes) has no duplicate to
refuse: a pair of the same name replaces the held one and is listed last.
`removeChip(field, index)` removes exactly that chip, and is a no-op for a field
the draft does not list or an index past its end. `snapshot.fields` is the form's
reading, in the form's order: each field's label, hint, who answers it, and each
chip as the codec writes it, a value the form cannot show faithfully as its
refusal. A view maps these rows to editors and computes none of it (ADR-QD-047).

```
REQUIREMENT: The form's text MUST round-trip every input it can display.
```

`SimulationForm` is one codec per field with a short form for the common case and
an explicit JSON form for the rest: an edge, event or signature naming another
subject is shown in full, a relation containing a colon is not split, a string
that reads as a number is shown quoted, and a value JSON cannot carry (`NaN`,
`-0`, a `Map`) is refused rather than rendered lossily. Renaming the subject moves
the elements that named the old id and leaves the others.

```typescript
import { makeSimulationSession } from "@qadi/devtools";

const session = makeSimulationSession();

// A resource is shown as JSON text, and the text parses back to the resource.
session.edit({ subject: { id: "alice" }, resource: { id: "doc-1", tags: ["draft"] } });
const shown = session.getSnapshot().resourceText;

// Text that does not parse yet is reported inline and the last good resource is kept.
session.editResourceText("{ not json");
const typing = session.getSnapshot();

session.editResourceText(shown.text);

// A chip is committed by its field's codec; a refusal comes back as the answer.
const added = session.addChip("roles", "editor");
const again = session.addChip("roles", "editor");
console.log(shown.error, typing.resourceText.error !== undefined, typing.draft.resource);
console.log(added._tag, again._tag, session.getSnapshot().fields[0]?.chips.length);
```

Everything this section names other than `makeSimulationSession` and the types it
returns (the form codecs, the field table in `SimulationFields.ts` and the
operations derived from it, `sweepPlan`, `whatIf`, `simulate`) is package-private
since [CCR-QD-321](../README.md#document-history) and [CCR-QD-400](../README.md#document-history): a host drives the session, and the
codecs and the field table are specified here because the simulator screen relies
on them.

## BEH-QD-455: A source choice is prepared in one place

```ts
export const prepareSource: (
  choice: SourceChoice,
  have: {
    readonly ports: EvaluationPortsLayer | undefined;
    readonly capture: CapturedAnswers | undefined;
  },
) => SourcePreparation;
export interface SourcePreparation {
  readonly options: ReadonlyArray<SourceOption>;
  readonly prepared: PreparedSource;
}
export type PreparedSource =
  | {
      readonly _tag: "Ready";
      readonly source: SimulationSource;
      readonly captured: Effect.Effect<CapturedAnswers> | undefined;
    }
  | { readonly _tag: "Refused"; readonly refusal: SourceRefusal };
```

> Package-private since [CCR-QD-321](../README.md#document-history): `PreparedSource`, `SourcePreparation`, `prepareSource`. `SourceChoice`, `SourceOption` and `SourceRefusal` are the exported types that sit in the same module (ARCH-72, [ADR-QD-050](../decisions/050-a-simulation-is-sealed.md)). Specified because the screens rely on it; a host reaches the behaviour through `makeSimulationSession` or the dock, not through these names (ADR-QD-047).

```
REQUIREMENT: Each source's availability, and the sentence that says why it is or
             is not available, MUST be stated once, in a table closed over
             SourceChoice.
```

The three options the screen offers and the choice a run prepares are both read
from that table, so they cannot disagree and a fourth source is a compile error
at the table rather than a missing case in two places. `Fixtures` is always
available; `Live` needs `ports`; `Snapshot` needs a capture.

```
REQUIREMENT: A Live preparation MUST capture, and each run MUST prepare its own.
```

A `Ready` Live source answers from the application's ports through a recorder,
and `captured` reads that recorder; that is what makes `Snapshot` available once
a Live run has happened. It is the only place the rule is written. Each run
prepares afresh, so a second run's capture holds only what that run asked.

```
REQUIREMENT: The session MUST store what the preparation returns and MUST NOT
             branch on a source variant.
```

The session keeps `options` and the `Ready`/`Refused` result and branches only on
that result's tag. A `Refused` result becomes the run state
([BEH-QD-220](#beh-qd-220-three-sources-and-a-fourth-is-a-compile-error)'s refused
choice), never a run on another source.

Enforcement: `test/model/SimulationSource.prepare.test.ts` (every choice against
ports present or absent and capture present or absent, and the sentences), and
the one-recorder-per-run test in `test/model/SimulationSession.test.ts`.

---

_Next: [30 — Port Calls](./30-port-calls.md)_
