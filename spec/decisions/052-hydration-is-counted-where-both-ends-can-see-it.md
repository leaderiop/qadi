# ADR-QD-052 — Hydration is counted, and the counter is declared where both ends can see it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-052                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-072) |

---

## Context

The devtools React panel showed one hydration number and admitted, on screen,
that the other two were unobtainable: *"Dehydrated and re-checked counts are not
obtainable: hydration returns its entries and does not retain them, and nothing
counts re-evaluations."* The one it did show was accumulated by the **host**,
which had to count its own `onHydrationMismatch` calls, because `@qadi/react`
had no counter of its own.

Exploring that turned up something the gap note had not recorded, and it is the
larger half of this decision.

**Hydration had four exits by which an entry could be discarded, and only one of
them was announced.** `dehydrateDecisions` reported the entries it dropped for
belonging to another subject — added in CCR-QD-057, whose behaviour text called
it "the last quiet failure left in hydration". It was not. `hydrateDecisions`
could:

- return `[]` because the payload named a different subject,
- return `[]` because the atom set was not built by `makeQadiAtoms`,
- skip an entry whose policy did not decode, with a bare `continue`,

and in all three cases say nothing whatever. The page then re-decided everything
from scratch, which is the *correct* behaviour and is also exactly what a page
with nothing to hydrate does. There is no symptom.

The claim in CCR-QD-057 was made after closing the exit somebody had gone
looking for. Nothing had enumerated them, which is why this decision states the
property as a conservation law ([INV-QD-045](../invariants.md)) rather than as a
list of the cases known today.

## Decision

**Every entry hydration gains or loses is counted, and every exit is announced.**

Five metrics, and a reason carried on the reporter:

| Metric | Type | Meaning |
| ------ | ---- | ------- |
| `qadi_hydration_dehydrated_total` | counter | entries a server put into a payload |
| `qadi_hydration_seeded_total` | counter | entries a client took out of one |
| `qadi_hydration_dropped_total` | frequency | entries lost, by `HydrationDropReason` |
| `qadi_hydration_rechecks_total` | counter | seeded questions answered again by this client |
| `qadi_hydration_mismatches_total` | counter | those whose verdict disagreed |

**The declarations live in `@qadi/core`, and that is not a filing decision.**
`@qadi/react` writes them and `@qadi/devtools` reads them, and the two packages
do not depend on each other — `QuestionsPanel.tsx` already records that
`@qadi/devtools` "does not depend on `@qadi/react` and should not start for one
type". The metric registry is the only thing they share.

The obvious alternative is for the reader to re-declare the metrics by id, the
way an OTLP consumer needs no import from its producer. **It compiles and reads
zero forever.** `Metric`'s registry key is `type:id:description` (`makeKey` in
`effect/Metric`), so a description differing by a word gives the reader its own
registry entry, with no error raised anywhere. A contract whose key includes a
prose string cannot be restated; it has to be declared once and imported.

That has a consequence for a note already in this repository. `PortMetrics.ts`
records that its `description` strings "survive mutation testing… nothing reads
them back, so no test can distinguish a metric carrying one from a metric
carrying none". True there; **false for these five**, where a description is
half the key. `HydrationMetrics.test.ts` pins each id, type and description for
that reason.

**Two counters, not two keys on one frequency.** `Metric.frequency` increments
by exactly one per call, so a thousand-entry payload would be a thousand map
writes on a server's render path. `Metric.counter` takes the number. The drops
stay a frequency because *which* reason is the whole diagnosis, and because that
path only runs when something is already wrong.

**The drop reasons are a closed union, pre-registered at zero.** Closed for the
cardinality reason `PortMetrics.ts` gives for keying on a port name. Pre-
registered so a reader gets the key set off the metric rather than restating it,
and so an unraised reason reads as *did not happen* rather than as *this build
does not know about it* — a healthy system and a build that has lost a reason
must not look identical.

**The write side is `updateUnsafe`, off a fiber.** `dehydrateDecisions` and
`hydrateDecisions` are documented as pure and synchronous, and their callers are
a server rendering a page and a client's first render. Neither has an Effect
runtime, so `Metric.update` — which is an `Effect` — is unavailable to them.
Making both functions effectful would change a public API from sync to
effectful for a debug view. `HydrationCounts.ts` confines the
`Context.empty()` boundary to one named file, as `HydrationWarning.ts` confines
`console` and `process.env`.

**`hydrateDecisions` gains an `onDropped` carrying a reason**, the third
reporter in this package with the same shape: development-mode warning by
default, replaced outright by a supplied callback which then runs in production.
A reason rather than a count because the three causes have three different fixes
— a cache-key bug on the server, a wiring mistake in the call, version skew
between the ends — and a number cannot tell a developer which they have.

## Consequences

**The panel stops admitting to a gap.** All four counts, the disagreement rate,
and one row per drop reason that fired, with the sentence saying what it means.

**The re-check block in `QadiAtoms` loses its `report !== undefined` guard.**
That guard existed so an atom set with no reporter "reads exactly the atoms it
read before — no reporter, no added dependency, no change", and counting has to
happen whether or not a reporter is wired. `get.once` keeps the promise the
guard was protecting, because it registers no dependency — and it is the honest
read there in any case: the seed is already spent in that branch, so re-running
on a later seed change could not change the answer.

**The counts are process-wide**, as the port counts are, and the two ends count
different populations: a server builds payloads for many clients and a browser
seeds payloads it did not build. `unaccountedEntries` therefore **refuses the
subtraction** where it would go negative, rather than reporting "−4
unaccounted" and sending a reader after a bug that is not one.

**A registry cannot scope these**, and it is worth knowing before someone tries.
A `Metric` memoises its hooks on the metric object at first touch, keyed on
attributes and not on the registry, so the first registry to reach a metric owns
it for the life of the process. The useful consequence is that a writer and a
reader sharing one metric object cannot diverge whatever a host wires; the cost
is that every test assertion here is a delta rather than an absolute.

## Alternatives considered

**Returning counts from the two functions.** They already return their entries,
and a caller could count those — which is what the panel's old prop asked every
host to do. It cannot see the *dropped* ones, which is the half that matters,
and it makes every host responsible for wiring a number back to a panel.

**A dependency from `@qadi/devtools` on `@qadi/react`.** Rejected before this
increment and still rejected: the devtools model is consumable by a backend
aggregator with no React in it.

**Re-declaring the metrics in the reader.** The design this decision started
with. It fails silently on a description typo, which is the worst available
failure for a diagnostic feature.

**Counting entries rather than announcing exits.** A count says three entries
were lost; it does not say a policy shape stopped decoding. Both, or the feature
answers the easier question.
