# ADR-QD-150 — A scoped run that a newer run supersedes

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-150                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-14                                     |
> | Status         | Accepted — amends ADR-QD-137; amended 2026-11-25 (ADR-QD-200: the failure hook is removed and the stop rule is the stated run's) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-25): amended by ADR-QD-200: the failure hook is removed and the stop rule is the stated run's; point 2 is applied (CCR-QD-479)<br>1.0 (2026-11-14): Initial (ARCH-84, CCR-QD-428) |

---

## Context

[ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md) gave the simulator's
session a scope that owns its run: a `FiberHandle`, a finalizer, and a newer run that
interrupts the one before it. The timeline feed and the diagnostics feed then adopted the same
shape, so three stores (`SimulationSession.ts`, `TimelineFeed.ts`, `DiagnosticsFeed.ts`) each
restated one protocol by hand: a counter naming the current run, a closed flag, a finalizer
registered after the handle so it runs first on a close, a runtime to fork with, and a check
before every landed write. The copies had drifted. The session re-checked its counter after
publishing `Running` and before it forked; the two feeds did not. The session guarded its stop
with `Option.isSome(FiberHandle.getUnsafe(runs))`; the feeds had no stop.

Two defects came out of the copies, both reproduced on the phase base and seen RED before any
repair:

- **A restart from inside a notification.** A store publishes (`Reading`, `Starting`,
  `Running`) between bumping its counter and forking. A subscriber that restarts the store in
  that notification moved the counter past the run about to start; the feed forked the stale run
  anyway and interrupted nothing that was live (TF21, F28). The session already had the
  re-check, so it was not RED for this case.
- **A restart from inside a run's synchronous prefix.** `effect@4.1.2`'s `FiberHandle.runtime`
  runs a body's synchronous prefix before it installs the fiber in the handle
  (`FiberHandle.ts:938-940`, `402-409`). A prefix that starts a command that starts a newer run
  therefore installs the newer fiber first and the stale outer fiber after it, and replacing a
  fiber interrupts the one it replaces: the newest run was the one interrupted, and the store
  was left idle with a stale token (TF22, TF23, F29, SR5).

The session's guarded stop was the third piece of state to restate: forking only when the
handle held a fiber saved one throwaway fiber, with no effect a host could see.

## Decision

**One package-private module owns the run, and a store keeps only what it does with a result
that lands.** (ARCH-84, CCR-QD-428.)

1. **The module is `packages/devtools/src/model/SupersedingRun.ts`.** `makeSupersedingRun` is an
   unnamed `Effect.fn` that requires `Scope.Scope`, builds synchronously (`useScoped` builds a
   store with `Effect.runSync`) and holds per-build closure state only. It is in neither
   devtools barrel and has no `spec/overview.md` row ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)).
   It is unnamed so a store build gains no child span.
2. **The interface is two steps.** `begin()` supersedes the current run and returns a token; the
   store then publishes whatever it shows while a run starts; `fork(token, effect, hooks?)` runs
   the effect only while the token is still current and says whether it did. `isCurrent(token)`
   guards each landed write, `stop()` supersedes and starts nothing, and `closed()` reports the
   scope's end. A one-call `run(effect)` was rejected because each store publishes between the
   bump and the fork, and that gap is where the first defect lives.
3. **The token is opaque.** A store asks `isCurrent(token)` and nothing else: no store does
   arithmetic on a token or compares two of them.
4. **The finalizer runs first, and the order is load-bearing.** It is registered after the handle,
   so on a close it clears the current token and marks the module closed before the handle
   interrupts the run. The run the handle then interrupts is no longer current, and a run that
   dies as its scope closes is never reported. That order holds under the default `"sequential"`
   finalizer strategy only: **a `Scope.make("parallel")` forks its finalizers and voids it.** A
   store is therefore never built in a parallel scope, and the module's own doc says so. A
   `begin` after the close returns a token that is never current.
5. **Stop is unconditional.** `stop` supersedes, then forks `Effect.void`, with no guard. The
   session's `Option.isSome(FiberHandle.getUnsafe(runs))` guard is deleted. Stopping with no run
   (not started, completed, closed) changes nothing a host can see: it notifies nobody and opens
   no span. "Must not allocate a fiber" was never a requirement.
6. **A failure has one named hook.** `ForkHooks.onFailure(cause)` is called only for the current
   run's failure that is not interrupt-only, never for a run that was replaced, stopped or
   closed. The two feeds use it for their `Stopped` state. The session passes none: its `land`
   keeps mapping every non-success exit of a current run to `Broke`, a self-interrupt included,
   because an interruption must never read as `Stopped` (INV-QD-313).

   > **Amended 2026-11-25 ([ADR-QD-200](./200-one-scoped-run-that-states-its-stop.md), CCR-QD-479).** The hook is removed: once the stated run stated every stop
   > no store called it, so `fork` takes the token and the run and nothing else. The stop rule is the stated run's: a current run
   > whose own work ended on anything but success is stopped, an interruption the run gave itself included, so the clause
   > "because an interruption must never read as `Stopped`" holds of an interruption from outside, and so does the sentence of
   > the Consequences that says the same. Point 2 is applied and not reversed: the callback is what lets a store publish
   > between `begin` and `fork`. The text above is left as written.
7. **`fork` re-checks the token before it forks.** The two feeds gain the check only the session
   had, so a subscriber that restarts a store inside its `Starting` or `Reading` notification
   leaves the newest run live.
8. **A fork requested while another fork is starting is held, not lost.** One pending slot is
   enough, because each `begin` supersedes the one before it. When the outer start returns the
   module installs what is held, re-checking the slot until nothing is held, so the newest run is
   live and the stale outer run is interrupted. This is a repair, not a report. Research had
   offered the weaker option (document that a body must not call a command before its first
   yield, and show a violation as the store's failure state) and the user accepted it as a
   fallback only. The held fork needed no fallback: it passed all 1362 existing devtools tests
   unchanged on the prototype, and instrumenting the base showed no existing test requested a
   fork while another was starting, so it changes no test. It meets the second clause of
   RUN-05 (a violation is "reported, not left silently idle") in its stronger form, because
   the newest run is live and nothing is left idle at all.
9. **A run starts synchronously.** A body's synchronous prefix still runs inside `fork`. 36
   existing tests depend on it (21 in `DiagnosticsFeed.test.ts`, 9 in `DockModel.test.ts`, 2 in
   `TimelineFeed.test.ts`, 4 in the React lifetime and screen tests), so neither an
   `Effect.yieldNow` before every body nor `FiberHandle.run({ startImmediately: false })` (which
   needs `runSyncWith`) was adopted.
10. **A `begin` is paired with a `fork` or a `stop`.** A `begin` alone leaves the run before it
    running, fenced by its token, until the next `fork` or `stop`. Every store pairs them, and the
    session's "Running is announced, the old run keeps going until the fork" window depends on it.

## Alternatives considered

- **A one-call `run(effect)`.** Rejected (point 2). It cannot let a store publish between the
  bump and the fork, which is where each store's `Starting`, `Reading` or `Running` is written.
- **A yield before every body**, so no prefix can restart a store. Rejected (point 9). It makes
  the in-prefix case structurally impossible and fails 36 existing tests that read the state a
  first step reaches before `fork` returns.
- **Report instead of repair** (a documented rule that a body must not call a command before its
  first yield, and a violation shown as the store's failure state). Rejected (point 8) as the
  design, kept as the recorded fallback. Holding the fork changed no existing test, so the
  fallback was not needed.
- **Keep the session's guarded stop.** Rejected (point 5). The guard saved one fiber that no
  host could observe, and it was the one place the three copies disagreed about what a stop is.
- **A named constructor** (`Effect.fn("qadi.devtools.makeSupersedingRun")`). Rejected (point 1).
  It would add a child span to every store build and to every `useScoped` build, which is
  observable for no gain; AGENTS.md §5 says to name a function when a span is wanted.
- **A `begin` that interrupts the older run at once** (installing `Effect.void`). Rejected
  (point 10). It closes the "Running is announced, the old run keeps going" window the session
  relies on, and it makes a `begin` that is never forked destructive.

## Consequences

- No store restates the protocol: a store reads `closed()` before a restart, calls `begin`,
  publishes, calls `fork`, and guards each landed write with `isCurrent`. What is left in a
  store is what it does with a result.
- The six RED cases (TF21 to TF23, F28, F29, SR5) are green, each seen RED on the unconverted
  store first. All 1362 pre-existing devtools tests pass unchanged.
- Observable behaviour is otherwise unchanged. [INV-QD-313](../invariants.md) keeps its
  meaning: an interruption never reads as `Stopped`, and the session maps every non-success
  exit of a current run to `Broke`.
- Nothing is exported, so the change is a `@qadi/devtools` patch.
- [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md) now says what the
  code does: point 3 states the unconditional stop, point 4 says the finalizer ends the current
  token, point 7 names the module and drops the deleted `useRunningStore`, and only the current
  run writes session state. Its earlier text is unchanged in Context and Alternatives
  considered, which keep their history.
- A module that forks into a `Scope.make("parallel")` scope loses the finalizer order and so the
  "a run that dies as its scope closes is never reported" guarantee. Nothing builds one; a
  later store must not.
- A body that re-forks without end overflows the stack in the drain loop. No caller does, and a
  bound is not added.

## Related

[ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md),
[ADR-QD-047](./047-a-headless-devtools-model.md),
[INV-QD-313](../invariants.md),
[ADR-QD-200](./200-one-scoped-run-that-states-its-stop.md),
[BEH-QD-461](../behaviors/29-devtools-simulator.md#beh-qd-461-a-session-owns-its-runs),
[BEH-QD-322](../behaviors/29-devtools-simulator.md#beh-qd-322-a-simulation-is-a-session),
CCR-QD-428.
