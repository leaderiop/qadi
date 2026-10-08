# House Rules — Evidence and Corrections

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-PROC-03                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Process Specification                          |
> | Change History | 1.0 (2026-10-08): the measurements behind `AGENTS.md`'s rules and its "Corrected in CCR-…" blocks moved here verbatim, so `AGENTS.md` carries each rule and a pointer instead of its history (retro of the wave-4 session) |

`AGENTS.md` is read in full by every agent that works in this repository. It
states each rule, its budget table and the command that enforces it. The
evidence for a rule, and the record of how the file was once wrong, live here:
text moved out of `AGENTS.md` unchanged, in the order it appeared.

## 1. Why exactly three functions are `Effect.fnUntraced` (AGENTS.md §5)

Ticket #101's `packages/core/bench/EffectFn.bench.ts` measured what a *named*
`Effect.fn(name)(...)` call adds over `Effect.fnUntraced` on this exact call
shape — a second `new Error()` capture, a span allocation through
`makeSpanUnsafe`, and a `CurrentStackFrame` record, on every call — at
**≈2.7–2.9 µs/call**. Ticket #102 converted the three functions above and
re-ran `Evaluate.bench.ts` before and after on the same machine, same day
(2026-09-09, 2–3 runs each, mean of the runs):

| Workload | Wrapped calls converted | Before | After | Change |
| -------- | ----------------------- | ------ | ----- | ------ |
| `one node` (no composite) | 0 | ≈8.3 µs | ≈8.1 µs | ~unchanged (control) |
| `resolver miss` (no composite) | 0 | ≈15.1 µs | ≈14.5 µs | ~unchanged (control) |
| `wide` — `allOf` of 8 | 1 | ≈14.1 µs | ≈9.9 µs | **≈−30%** |
| `matcher-heavy` — 3 refs | 1 | ≈17.6 µs | ≈11.9 µs | **≈−32%** |
| `obligation-heavy` — `allOf` of 8 | 1 | ≈18.5 µs | ≈13.3 µs | **≈−28%** |
| `field-heavy` — `allOf` of 8, `Intersection` | 1 | ≈34.0 µs | ≈28.0 µs | **≈−18%** |
| `deep` — 10 nested combinator levels | 10 | ≈49.2 µs | ≈12.6 µs | **≈−74%** |

The two zero-conversion workloads (`one node`, `resolver miss`, neither of
which reaches `evaluateAllOf`/`evaluateAnyOf`/`evaluateRules`) move by less
than the run-to-run noise either direction — the control confirming the
measured improvement is attributable to this conversion and not to
machine variance. The rest land close to, or (on `deep`) better than,
ticket #101's own end-to-end estimate (≈30–43% single-combinator, ≈54–66%
ten-level-deep) — real, not merely predicted.


## 2. `switch` against `Match`: what was measured (AGENTS.md §5a)

**Now measured** (`pnpm bench`, ADR-QD-034). At the dispatch site a `switch` is
**1.6–2.4×** faster than a hoisted `Match` whose arms return a closure, and
**3.5–7.7×** faster than `Match.value` rebuilt per call — which is the form a
naive conversion produces. End to end that is about **2–4%** on a matcher-heavy
policy and **under 1%** on a simple one. Ranges, not figures: absolute throughput
on a development machine moves by ~30% between runs, so only the direction
transfers. Small, then, but not noise — and not worth paying for style on an
authorization hot path.

> **The end-to-end 2–4%/under-1% figures are stale, not reproducible as stated
> (CCR-QD-119).** ADR-QD-034's 2026-09-07 addendum found the workload they were
> derived from ("four refs", "seventeen dispatches") no longer matches
> `Evaluate.bench.ts`, which now resolves 3 refs and dispatches ~13 times per
> evaluation — and that neither file had been re-measured since the ADR was
> written. Only the per-dispatch ratios above (**1.6–2.4×**, **3.5–7.7×**)
> survive that addendum; the end-to-end percentages do not and should not be
> treated as current without re-running `pnpm bench` against today's workload.

**A sibling question, same discipline, separate axis, now settled.** This
section's benchmark discipline was about `switch` vs `Match` on `_tag` dispatch.
`Effect.fn` vs `Effect.fnUntraced` was the sibling question, and — until ticket
#102 — every effectful function in this codebase was a *named* `Effect.fn`,
with `Effect.fnUntraced` used zero times, despite the former capturing an
`Error()` and allocating a span and a stack-frame record on every call, none
of which the latter does. `packages/core/bench/EffectFn.bench.ts` measured
that question the same way `Dispatch.bench.ts` measures this one: per-call
overhead isolated (**≈2.7–2.9 µs/call**, ≈8.6–11.5× slower than `fnUntraced`),
then put in proportion against `Evaluate.bench.ts`'s pre-conversion end-to-end
numbers (**≈30–35%** estimated tracing share on a single-node evaluation, up
to **≈54–66%** on a ten-level-deep one — computed before ticket #102, so it
now overstates the share on any workload that reaches a composite node).

That measurement is what answered the question: §5 above records the outcome
— `Effect.fnUntraced` adopted at exactly the three composite dispatchers where
the per-node cost compounds (`evaluateAllOf`, `evaluateAnyOf`, `evaluateRules`),
budgeted and enforced in both directions by `UNTRACED_BUDGET`. That is the
current, measured boundary, not a fourth site still under discussion.
The port reads in `PortAccess.ts`, and the root `evaluate`, stay
`Effect.fn` and traced on purpose, per ADR-QD-051's reasoning in §5 — the
open question this paragraph used to describe is the one §5's table closed.

## 3. Correction: the `Context.Service` example (AGENTS.md §2)

> **Corrected in CCR-QD-077.** This example carried `resolve(attribute, resource?)`
> and omitted `name` — a signature no version of this library has had. Nothing
> checks the code in this file: `check-doc-examples.mjs` compiles fenced
> `typescript` blocks under `spec/`, and this is `ts` in `AGENTS.md`, which is
> reference material by §12's own rules. It was noticed four separate times
> before anyone changed it, each time as an aside in work about something else.
> The `@qadi/example-nextjs` port implementations are written against the real
> signature and compile, which is the first thing in this repository that would
> have caught it.

## 4. Why `@qadi/react` depends on `@effect/atom-react` (AGENTS.md §13)

  > **Corrected in CCR-QD-150.** ADR-QD-014 rejected `@effect/atom-react` as
  > supplying "the same thing plus features this package does not use" — but
  > what was checked was `@effect-atom/atom-react`, a similarly-named community
  > package pinned to `effect: ^3.22.1`, not the actual `@effect/atom-react`
  > (published from the `Effect-TS/effect` monorepo, tracking `effect`
  > version-for-version, and built directly on `effect/reactivity`'s
  > own `Atom`/`AtomRegistry`/`AsyncResult` types — not a parallel
  > implementation). Verified on a spike branch, not assumed: swapping in the
  > real package closed a gap this package had hand-rolled and patched three
  > separate times — `settled.ts`'s Suspense zero-listener race (COMPAT-01,
  > gap G-01-1), confirmed by 30/30 clean runs of the test the race was found
  > in, on the exact Node 20.17.0 binary that found it. A second gap — wiring
  > `AtomRegistry.make`'s `scheduleTask`/`defaultIdleTTL` for idle-atom GC,
  > matching the library's own `RegistryContext.ts` — was tried and reverted:
  > `scheduleTask` is not scoped to idle cleanup, it reroutes the registry's
  > core dispatch through React's low-priority scheduler, and doing so
  > silently dropped a required intermediate render under real network timing
  > in `examples/nextjs-newsroom`'s e2e suite. `@effect/atom-react` is now a
  > dependency of `@qadi/react`, and `QadiProvider.tsx`'s `useAtomValue` is a
  > direct re-export of its hook. See ADR-QD-014's Consequences section for the
  > full reversal.
  >
  > **The unbounded-growth gap this left is now closed, without going near
  > `scheduleTask`/`defaultIdleTTL` a second time.** `QadiAtoms.ts`'s
  > `Atom.family`-backed decision atoms and its `asked()` bookkeeping had
  > nothing bounding their growth over a long session asking many distinct
  > (policy, resource) combinations — confirmed by audit, and real regardless
  > of whether the underlying `Atom.family` entries are eventually GC'd, since
  > `asked()`'s own array held every question's `Policy`/`Resource` strongly,
  > forever. The fix is a qadi-owned eviction sweep instead: each tracked
  > question carries a `liveCount`, incremented when its decision atom's
  > reader runs and decremented by a finalizer `AtomRegistry` calls on genuine
  > teardown (never on a same-tick recompute, which reincrements before any
  > other fiber can observe zero — see `QuestionBook.ts` for
  > why), and `sweepEvictions` — plain `Effect.sync`, no `AtomRegistry` access
  > at all — drops the oldest questions with `liveCount === 0` once
  > `maxTrackedQuestions` is exceeded, skipping anything still live rather than
  > evicting it. `QadiProvider.tsx` forks `Effect.repeat(atoms.sweepEvictions,
  > Schedule.spaced(sweepIntervalMillis))` on its own fiber at mount and
  > interrupts it at unmount, the same shape `@qadi/devtools`'s
  > `useTimeline.ts` uses for its own background subscription — entirely
  > independent of `AtomRegistry`'s scheduler, so it cannot repeat the dropped-
  > render failure: it never touches value dispatch or notification, only
  > which entries the atom set's question book keeps. `QadiAtoms.test.ts` and
  > `QadiProvider.test.tsx` cover eviction past the bound, survival of a
  > currently-mounted gate, and that the existing render-sequence tests this
  > paragraph's history is about pass unchanged.

## 5. Where the gate-instance subscription lives; the registry's scope (AGENTS.md §13)

  **Correction:** this section, and ADR-QD-053, previously went on to say
  present-tense "and it is `@qadi/devtools`, a DOM package already, that
  subscribes." `@qadi/devtools` has no dependency on `@qadi/react` at all
  (the registry lives in `@qadi/react`) and `DevtoolsDock.tsx` takes
  `gates` as a plain, one-shot prop — it does not subscribe to anything.
  What subscribes is the **host** wiring the two packages together:
  `examples/nextjs-newsroom/src/client/Dock.tsx` calls `useDevtoolsFeed()`
  (which reads `useGateInstances()`, or `useSyncExternalStore(atoms.gates.subscribe,
  atoms.gates.instances, atoms.gates.instances)` outside the provider) and spreads
  the result onto the dock, `gates` included. That is the correct place for it — `@qadi/devtools`'s panel is
  meant to render for a host that has no `@qadi/react` at all, fed `gates`
  from wherever it likes — not a gap in `@qadi/devtools` to close.

  What the argument actually established is that the **atom layer** cannot see
  instances, which is true and is why the panel is still keyed by question. A
  component knows perfectly well that it exists; nothing was asking it.

  > **Corrected in CCR-QD-160.** This bullet used to say `GateRegistry.ts` "is a
  > module-scope map a guard writes to from an effect", shared by every
  > `QadiProvider` in the process, and that the host calls
  > `useSyncExternalStore(subscribeGates, gateInstances, gateInstances)`. Both are
  > gone. The registry is per atom set, the scope `asked()` already had, so two
  > tenants no longer list each other's guards and a hydrated root can no longer
  > replace another's. The host call is `useGateInstances()` inside the provider,
  > or `useSyncExternalStore(atoms.gates.subscribe, atoms.gates.instances,
  > atoms.gates.instances)` outside it. The write side is not exported, because
  > the kind is not a caller's to choose. `@qadi/devtools` is still fed `gates` as
  > a plain prop and still has no dependency on `@qadi/react`.

## 6. The formatter-disagreement counts (AGENTS.md §17)

> **Corrected in CCR-QD-121, and again here.** This section used to carry an
> undated "147 of 169" / "113 of 169" snapshot, stated as if evergreen, plus
> the `lineWidth` experiment above. No script gates these counts — unlike the
> DoD table, devtools claims, and publish-status facts §15 gates for exactly
> this reason — so they drifted twice over before CCR-QD-121: no
> `.oxfmtrc.json` file existed any more by the time anyone checked, and
> `spec/process/definitions-of-done.md`'s own note on the identical command had
> separately drifted to a *different* pair of numbers ("127 of 145 files").
> CCR-QD-121 re-ran the command (207 of 376 files, 2026-09-08) but left the
> stale 147/169 figures in place above, promising a date stamp beside them that
> was never added — the same class of drift this note exists to describe, one
> level up. The figures above are now that 2026-09-08 run's numbers directly,
> not the old ones with a date attached; `spec/process/definitions-of-done.md`'s
> note already carries the same dated figure. If this drifts again, re-run
> `pnpm format:check` and replace both counts here together, in place, rather
> than adding another correction paragraph.

_Previous: [Definitions of Done](./definitions-of-done.md)_
