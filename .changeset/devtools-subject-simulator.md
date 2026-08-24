---
"@qadi/devtools": minor
"@qadi/testing": minor
---

The subject simulator — the seventh devtools screen, and the only one that
**runs** an evaluation rather than reading records.

Run a policy against a subject you describe, vary that description a grant at a
time to find which grant the answer turns on, and — starting from a decision the
application actually made — check whether your reconstruction reproduces it.

**A simulation is sealed.** `Effect.provide` adds to a context and cannot remove
from one, so supplying the five services `evaluate` requires does not stop it
finding an optional one already in scope — and it reads two optionally. Left
unshadowed, a what-if sweep of eight edits writes eight fabricated decisions into
your real log and eight entries into your real cache, indistinguishable on screen
from decisions somebody asked for. `simulationLayer` shadows `DecisionSink` and
`DecisionCache` in every mode, `CurrentSubject` is excluded from a live layer by
type, and both are asserted rather than assumed.

**Three answer sources.** `Fixtures` (what you typed), `Snapshot` (real answers
captured once and replayed) and `Live` (your own resolvers, opt-in by passing a
`ports` layer to the dock). A sweep of N edits costs N in-memory folds on
fixtures, N live sweeps on `Live`, and one live run plus N folds on a snapshot —
which is why `Snapshot` exists and why the panel warns, with a count, before any
sweep that performs lookups.

**What-if runs in both directions.** Dropping each grant in turn answers the
question a reviewer holding an *allow* has; it is silent for one holding a
*denial*, since no removal turns a denial into an allow. So the sweep also reads
the policy for what it asks for and offers each of those, including attribute
values read backwards out of the matcher that demands them — and says which
requirements it could not build a remedy for, and why.

**Replay says what it could not seed.** A `DecisionRecord` names the subject by
id and carries what your ports answered only inside its trace, so the grants are
your hypothesis. The panel names every field it left blank, and refuses to claim
a match where the record cannot attest to one — a truncated payload or a failed
row cannot vouch for agreement it never recorded.

New in `@qadi/testing`: **`TestLayerOptions.clock`**. `qadiTestLayer(subject,
{ clock: "test" })` wires a `TestClock`, so `durationMillis` is reproducible
outside a test runner that happens to supply one. The ids were already
deterministic and the clock was not, which is half a determinism claim — and it
survived unnoticed because `@effect/vitest` hands `it.effect` a `TestClock`
anyway.
