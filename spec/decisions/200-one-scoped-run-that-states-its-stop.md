# ADR-QD-200 — One scoped run that states its stop

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-200                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-25                                     |
> | Status         | Accepted — applies ADR-QD-150; extends and amends ADR-QD-182; amends ADR-QD-192 and ADR-QD-194 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-25): Initial (ARCH-134, CCR-QD-479) |

---

## Context

[ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md) gave the devtools stores one module that owns a superseded run,
`SupersedingRun.ts`, and left each store to do what it does with a result. Three stores still started a run the same way, by
hand: publish what shows while the run starts, then fork it, in a `try` and a `finally`, because a subscriber may supersede the
run from inside the publish. The timeline feed, the diagnostics feed and the simulation session each wrote that out, and each
decided for itself what a run's end meant, and the three decided differently. The two feeds read the run's exit through a hook
on `fork` that skipped an interruption-only cause, so a read or a collector that interrupted itself left the timeline on
`Reading` with an empty tape and the diagnostics feed on `Starting` or `Live`, a status that looked current while nothing ran.
The session read its own exit, and rendered the cause with `String`, where the feeds used `causeMessage`.

The session's `String` of a cause is an inconsistency and not a defect: `String` of an Effect `Cause` is guarded by Effect and
never throws. What the three copies had in common was the cost, not a failure: a change to the order, the guard or the stop had
to be made three times, and the configure prologue the three feeds also shared ([ADR-QD-192](./192-feeds-and-the-dock-model-take-inputs-only-through-configure.md))
had the same shape, five lines restated before each feed did anything of its own.

One fact decides the stop rule, and it was measured on the unconverted module before anything moved: an interruption that comes
from outside the run (a newer `begin` and `fork`, `stop`, the scope closing, each with an engine that swallows its own
interruption as well as one that never ends) never resumes the forked body, so its exit is never read. A run that interrupts
itself does resume its body, as the current run, and a run that ends on its own after a newer one began resumes it too, not
current. The rule "a current run whose engine exits with anything but success is stated" therefore cannot state an interruption
from outside, and it states an interruption the run gave itself.

## Decision

1. **One package-private stated run, above the superseding run, owns publish-then-fork.** `makeStatedRun(stopped)` in
   `StatedRun.ts` returns `{ start, stop, closed }` over an unchanged `makeSupersedingRun`. `start(plan)` takes a plan of two
   callbacks, `starting` (the state shown while the run starts) and `engine` (the run, built after `starting` returns, told
   whether it is still current and given a guard for its writes). It does nothing once the scope has closed; otherwise it
   begins a run, calls `starting` in a `try`, and forks the engine in the `finally`, so a throw on the published state still
   leaves the work started. This applies [ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md) point 2 and does not
   reopen it: the callback is what lets a store publish between `begin` and `fork`, which a one-call run that publishes inside
   the module would not. Each store's `restart` builds its own plan, so a bare timeline restart reads the empty source.

2. **One stop rule, in `causeMessage`'s text.** A current run whose own work ends on anything but success is stopped, with
   `causeMessage` of the cause as the reason, an interruption the run gave itself included, so a timeline read, live stream or
   diagnostics collector that interrupts itself reads `Stopped`. An interruption from outside never does, because a newer
   start, `stop` and a scope close each replace or clear the current run before they interrupt it, and the run's exit is never
   read. A run that ends on its own after a newer one began is not current and states nothing. The evidence is the protocol
   spike: every interruption from outside, with an engine that never ends and with one that swallows its interruption, left the
   forked body unresumed; a self-interrupt resumed it as the current run; a natural end after a newer `begin` resumed it not
   current. This narrows the clause of [ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md) point 6 that said an
   interruption must never read as `Stopped`: it holds of an interruption from outside.

3. **The session shares the start and the stop, and keeps its own exit read.** `SimulationSession` starts every run through
   the stated run and renders the stop's reason as `Broke.message`, `causeMessage`'s text, as the feeds do. It still reads the
   exit of the run it lands, so a run that interrupts itself still reads `Broke`; the stop it hands the stated run is guarded to
   a session whose run is `Running`, so a defect after a result landed leaves the landed result. [ADR-QD-182](./182-one-total-thrown-value-to-text-rule-exported-by-core.md)
   decision 10, which lists the devtools sites that render a run's cause with `causeMessage`, is extended to the session, and
   decision 11's sentence about `String` of a cause is amended: the session was a site that list never named, and so is
   `packages/audit/src/AuditWriteReport.ts`, a sink report that stringifies a cause. The audit site is left as a follow-up and
   not changed here; the three core sites decision 11 named and the `v4-api-smoke` canary stand.

4. **One configure prologue, closed guard first.** `makeConfigure(rule, steps)` in `ConfigurePrologue.ts` is the order the
   timeline feed, the diagnostics feed and the gates feed share: the closed guard, the normaliser, the held inputs, the identity
   gate, the hold, then the steps. The identity gate is a parameter of the rule: the diagnostics feed compares absent options,
   and the gates feed also retries a failed watch. The gates feed shares only the prologue; it keeps forking its cadence before
   it publishes. This amends [ADR-QD-192](./192-feeds-and-the-dock-model-take-inputs-only-through-configure.md) points 5 and 7.

5. **The ordering of ADR-QD-194 is stated once.** [ADR-QD-194](./194-a-run-of-calls-applies-every-call-whatever-one-throws.md)
   point 5's order, publish in a `try` and fork in the `finally`, with what the listeners threw rethrown after the fork, is
   stated in the stated run's `start` and in no store. The clause of that point that names a failure hook is superseded by
   decision 6.

6. **The superseding run's failure hook is removed.** After the stores moved there was no caller of `ForkHooks.onFailure`, so
   `fork` is `(token, run) => boolean` and the module imports neither `Cause` nor `Exit`. The rows of `SupersedingRun.test.ts`
   that pinned the hook are audited below: each property they pinned is held by a row of `StatedRun.test.ts`, and the property
   test keeps every law that is not about the hook.

   | Row of `SupersedingRun.test.ts` | What it pinned | Change | Held by |
   | ------------------------------- | -------------- | ------ | ------- |
   | R3 | closing the scope mid-run interrupts the run and the hook is never called, even when a release dies | edited: the hook assertion is gone, the interruption stays | ST11 |
   | R5 | `stop` before any run starts nothing, calls no hook and opens no span | edited: the hook assertion is gone | ST9 |
   | R6 | `stop` in flight interrupts the run and the hook is never called | edited: the hook assertion is gone, the interruption stays | ST8 |
   | R7 | `stop` after a completed run changes nothing, calls no hook and opens no span | edited: the hook assertion is gone | ST10 |
   | R9 | the current run's defect is heard once, and an interruption, a replaced run or a stale run is not | removed | ST3, ST4, ST7, ST11, ST14 |
   | law 5 of the property test | the hook hears exactly the current runs that die | removed | ST17 |
   | law 7 of the property test | nothing is heard after the close, and nothing lands after it | the heard half removed, the landing half kept | ST12, ST17 |

Tests removed: 1.

R9 is the one test removed; law 5 and the heard half of law 7 were clauses of the one property test, which keeps its other
laws. Each edited row was seen failing under a scratch edit of the module after its edit, so a row that can only pass is not
left behind.

7. **The Simulator shows the broken-run message in the stopped box's reason treatment.** `Broke.message` is a multi-line
   `Cause.pretty` trace, as a `Stopped` reason is, so the Simulator renders it in a labelled, focusable `pre` with the style the
   stopped box's reason has, one `reasonStyle` shared by both, instead of a line of wrapped text.

## Alternatives considered

- **A one-call run that publishes inside the module.** Rejected by [ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md)
  point 2 and still rejected: each store publishes a different state between the bump and the fork, and that gap is where the
  first defect lived.
- **A remembered last engine, so `restart` re-runs it.** Rejected: a bare timeline feed would then restart nothing where it
  reads the empty source, and the stated run would hold a datum each store already holds.
- **Keeping an interruption the run gives itself silent, as the hook did.** Rejected: it leaves a feed looking live with nothing
  running, which is the defect the stop exists to prevent.
- **Reading the session through the stated run's stop alone.** Rejected: a run that interrupts itself must still read `Broke`,
  and the session's own exit read is where the question and the landed result are known.
- **Keeping the failure hook for the session's sake.** Rejected: the session passed none, and a hook with no caller is the
  surface a later store would use to state a stop a third way.
- **One prologue that also forks the gates cadence.** Rejected: the gates feed publishes after it forks, the reverse of the
  other two, and an order parameter would restate the two orders where one function states each.
- **Changing the audit report's `String` of a cause in the same change.** Rejected as out of scope: it lives in another
  package, and it is a sink report on the host's own process rather than a panel.

## Consequences

- No export moves, so `scripts/check-api-surface.mjs` (gate 13) and `scripts/check-package-install.mjs` (gate 14) are unmoved,
  and the change is a `@qadi/devtools` patch with a doc-only note on `@qadi/core`'s `ThrownMessage.ts`.
- **One visible change.** A host-supplied source or collector that interrupts itself now reads `Stopped` where it read
  `Reading`, `Starting` or `Live`. No shipped source, store or collector interrupts itself, so the change is reachable only by a
  host's own. An interruption from outside reads exactly as it did.
- **The session's broken-run message is `causeMessage`'s text.** A cause that renders keeps its `Cause.pretty` text; a value
  that cannot be described is the one placeholder. The text is for the host's own process and does not cross a trust boundary.
- The `isCurrent` gate of the stop is reached only by a run that ends on its own after a newer one began, so the rows that
  kill its mutant are the begin-window rows of `StatedRun.test.ts`, one for a defect and one for a self-interrupt.
- `StatedRun.ts` and `ConfigurePrologue.ts` are inside `stryker.devtools.mjs`'s `model/**`, so they are held to no surviving,
  uncovered, ignored or timed-out mutant, each kill by a test of its own file.
- The follow-up is named: `packages/audit/src/AuditWriteReport.ts` renders a cause with `String`, and a later change decides
  whether it reads through `causeMessage`.

## What enforces it

- `packages/devtools/test/model/StatedRun.test.ts`: ST1 to ST17, the stated run with no store. The order of a start and the
  rethrown throw (ST1, ST2); a stop for a defect, a self-interrupt and a value that cannot be described, and none for a success
  (ST3 to ST6); a newer start, `stop` and a scope close state nothing, a release that dies included (ST7 to ST11); a closed run
  starts nothing and the guard drops a stale write (ST12, ST13); the begin window states nothing for a defect or a
  self-interrupt of a run that is not current (ST14, ST15); a start inside a publish leaves only the newer run (ST16); and a
  model property over random commands (ST17).
- `packages/devtools/test/model/ConfigurePrologue.test.ts`: CP1 to CP8, the order of the prologue and what it reads.
- `packages/devtools/test/model/StatedRun.characterisation.test.ts`: SC1 to SC12, what the three stores did through the stated
  run before it was extracted and unchanged by it.
- `packages/devtools/test/model/TimelineFeed.stop.test.ts` and `packages/devtools/test/model/DiagnosticsFeed.stop.test.ts`: a
  read or a poll that interrupts itself reads `Stopped`, and every interruption from outside states nothing (TX1 to TX7, DX1 to
  DX7).
- `packages/devtools/test/model/SimulationSession.stop.test.ts` and `packages/devtools/test/react/Simulator.broke.test.tsx`:
  the session's message text and the Simulator's block (SX1 to SX3, SB1 to SB4).
- `packages/devtools/test/model/SupersedingRun.test.ts`: the protocol rows, with the audit above.
- The two modules' place under `stryker.devtools.mjs`'s `model/**`, and the merge gate by command (`pnpm check`), never by number.

## Related

- [ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md) — applied: point 2 stands; point 6's hook is removed
- [ADR-QD-182](./182-one-total-thrown-value-to-text-rule-exported-by-core.md) — decision 10 is extended to the session and
  decision 11's sentence is amended
- [ADR-QD-192](./192-feeds-and-the-dock-model-take-inputs-only-through-configure.md) and
  [ADR-QD-194](./194-a-run-of-calls-applies-every-call-whatever-one-throws.md) — amended: the prologue and the one ordering
- [ADR-QD-047](./047-a-headless-devtools-model.md) and
  [ADR-QD-196](./196-the-diagnostics-feed-folds-its-reading-as-a-value.md) — their statements of when a run is stopped are
  amended
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — both modules stay out of the barrels
- [BEH-QD-771](../behaviors/28-devtools-screens.md#beh-qd-771-a-stated-run-starts-in-one-order-rethrows-what-its-publish-threw-drops-a-stale-write-and-starts-nothing-once-closed),
  [BEH-QD-772](../behaviors/28-devtools-screens.md#beh-qd-772-a-runs-stop-is-stated-once-for-the-current-runs-own-failure-and-never-for-an-interruption-from-outside)
  and [BEH-QD-773](../behaviors/28-devtools-screens.md#beh-qd-773-a-feeds-configure-runs-one-prologue-closed-guard-normaliser-identity-gate-hold-then-its-steps),
  which state them;
  [BEH-QD-774](../behaviors/29-devtools-simulator.md#beh-qd-774-a-broken-simulation-run-reports-its-cause-in-the-one-stop-text) and
  [BEH-QD-775](../behaviors/29-devtools-simulator.md#beh-qd-775-the-simulator-shows-a-broken-runs-message-as-a-labelled-preformatted-block),
  which state the session's message and the Simulator's block
- [INV-QD-419](../invariants.md#inv-qd-419-a-stop-is-stated-once-for-the-current-run-only) and
  [INV-QD-420](../invariants.md#inv-qd-420-a-configure-reads-nothing-after-close-and-moves-nothing-before-its-input-is-complete-and-changed),
  the two invariants it adds;
  [INV-QD-313](../invariants.md#inv-qd-313-a-poll-defect-is-stated-an-interruption-from-outside-never-is-and-a-replaced-run-never-writes),
  which it retitles
