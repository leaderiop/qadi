# 29 — The Subject Simulator

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-29                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-070) |

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

```
REQUIREMENT: Replaying a capture MUST produce the trace the captured run produced.
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
REQUIREMENT: A query the capture never saw MUST answer the fail-closed default.
```

`undefined` for an attribute, `Unknown` for a relationship and for history —
what a real deployment gets from an unwired port
([INV-QD-007](../invariants.md)).

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

```
REQUIREMENT: A sweep MUST offer both weakenings and strengthenings.
```

They answer two different questions and each is useless for the other's reader.
Dropping a grant can never turn a denial into an allow, so on the screen where it
matters most — a reviewer holding a denial, asking *what would fix it* — a
weakening-only sweep produces a table of rows that all say the same nothing.

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
takes it as *and even that would not help*.

## BEH-QD-223: A matcher is read backwards to a witness, or declined

```ts
export const satisfyingValue: (matcher: Matcher, input: SimulationInput) => Synthesised;
```

```
REQUIREMENT: A synthesised value MUST satisfy the matcher it came from.
```

Checked against `evaluateMatcher` itself — the function the evaluator runs —
rather than against a test's restatement of what the matcher means. `Eq` compares
with `===`, so a literal object is passed through by reference rather than
copied; `Contains` and `SomeMatch` want the needle *inside* an array; `Size`
wants a value with a `length`.

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

```
REQUIREMENT: A replay MUST seed the policy, the action and the resource, and MUST
             name every field it could not seed.
```

A record names the subject **by id** and carries nothing else about them, and it
carries what the ports answered only *inside* its trace, never as fixtures a
rerun could use. So the grants are the reviewer's hypothesis — and a form that
filled itself in silently would present that hypothesis as a reproduction of what
happened.

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

---

_Next: [30 — Port Calls](./30-port-calls.md)_
