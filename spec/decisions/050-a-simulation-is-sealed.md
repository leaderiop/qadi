# ADR-QD-050 — A simulation is sealed, and it answers from one of three sources

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-050                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-070) |

---

## Context

Six of the devtools' seven screens **read records**. The subject simulator
**evaluates**, and that is a different risk class: it needs `CurrentSubject`,
three resolver ports and an id generator, and it is invoked from a debug panel
that may be open beside a running application.

Two facts about Effect decide most of what follows.

**`Effect.provide` adds to a context and cannot remove from one.** Supplying the
five services `evaluate` *requires* does not stop it finding an **optional** one
already in scope, and `evaluate` reads two optionally: `DecisionSink` and
`DecisionCache`. So a simulator that provided only what it needed would, in any
process where a real sink is wired, write a record per run — and a what-if sweep
of eight edits writes eight. Those records are indistinguishable on screen from
decisions somebody actually asked for. The cache is the same shape of problem in
the other direction: a fabricated entry a real request would later hit.

**A `Trace` carries no time.** `diffTraces` compares `allowed`, `reason`,
`children`, `visibleFields` and `obligations`, so replay comparison is already
deterministic under any clock. The clock question, which `02-screens.md` recorded
as a gap, is about a number on screen rather than about correctness.

The remaining question is where a simulated evaluation's *answers* come from.
Fixtures the reviewer types are the obvious default and are not sufficient: a
reviewer investigating a real denial wants the answers the real ports gave. The
naive way to offer that — point the simulator at the application's resolvers —
makes a what-if sweep issue one round trip **per edit**, so a subject with six
grants is seven live sweeps from one click.

## Decision

**Every simulation runs in a sealed layer, in every mode.**

`simulationLayer` supplies `CurrentSubject` from the form, the three ports from
the chosen source, and `EvaluationId` as a sequential generator — and it
**shadows** `DecisionSink` with a discarding one and `DecisionCache` with a
private one. Shadowing rather than omission, because omission is not available:
there is no way to remove a service from a context, so the only way to guarantee
a simulation writes nothing is to put something there that discards.

`CurrentSubject` is never taken from a supplied layer even in `Live` mode. The
subject is the thing being simulated, and a layer able to supply it could change
*what is being asked* rather than merely how it is answered. The exclusion is in
the type — `LiveSource` carries
`Layer<Exclude<EvaluationServices, CurrentSubject | EvaluationId>>` — rather than
in a convention.

**Three sources, as a closed union.**

| Source     | Answers from                | A sweep of N edits costs |
| ---------- | --------------------------- | ------------------------ |
| `Fixtures` | data the reviewer typed     | N in-memory folds        |
| `Snapshot` | real answers captured once  | 1 live run + N folds      |
| `Live`     | the application's resolvers | N live sweeps            |

**`Snapshot` is what makes `Live` defensible rather than merely available.** It
gives `Live`'s real answers at `Fixtures`' cost, and it is the mode a sweep
should actually use. A capture records *answers, not calls* — including
failures, so a snapshot replays an outage as an outage rather than as a miss —
and every key includes the subject, because the subject is the axis a what-if
sweep varies.

`Live` is opt-in by the application author (a `ports` prop the host passes),
sequential, and counted **before** the sweep runs rather than after. A count
discovered afterwards is not a warning.

**Both clocks, and the number is labelled rather than read.**
`simulate({ clock: "deterministic" })` wires `TestClock`; `qadiTestLayer({ clock:
"test" })` closes the same gap for `@qadi/testing`'s own users. Neither changes a
trace. And a live run of a trivial policy also reports **zero** milliseconds, so
the number alone cannot distinguish *not measured* from *measured, and fast* —
the panel says which clock ran.

## Consequences

**A sweep can be run beside a production sink without consequence**, and that is
asserted rather than assumed ([INV-QD-042](../invariants.md)): a forty-row sweep
next to a real `decisionSinkRing` leaves it empty.

**A snapshot must answer what the live layer answered** — an agreement property
in the family of INV-QD-018 and INV-QD-038, and it drifts the same way two paths
answering one question always do. Stated as INV-QD-043 rather than assumed, and
the keys are written once and called from both sides so a capture and a replay
cannot disagree about one.

**A fourth source is a compile error at every consumer.** `portsOf` dispatches
through `Match.tagsExhaustive` rather than a `switch` with a default, because
falling through to fixtures would be the worst available failure: the screen
would answer confidently from data nobody supplied.

**The simulator cannot reach `@qadi/testing`.** Everything it needs is already
public in `@qadi/core` — `attributeResolverFromRecord`,
`relationshipResolverFromEdges`, `decisionHistoryFromEvents`,
`evaluationIdSequential` — and shipping test fixtures into an application's
production bundle to power a debug panel would be a strange trade.

## Alternatives considered

**Fixtures only.** Simplest, and it cannot answer the question the screen exists
for: a reviewer holding a real denial wants to know what the real ports said.

**Live only.** Answers that question and makes a sweep a burst of round trips
from a debug panel.

**Removing the sink and cache instead of shadowing them.** Not expressible.
`Effect.provide` has no complement.

**Inferring the clock from the duration.** Zero is ambiguous, so this would
report *not measured* for every fast evaluation.
