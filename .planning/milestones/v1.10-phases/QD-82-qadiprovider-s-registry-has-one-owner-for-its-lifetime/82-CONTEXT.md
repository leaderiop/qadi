# Phase 82: `QadiProvider`'s registry has one owner for its lifetime - Context

**Gathered:** 2026-11-25 (smart discuss, autonomous mode; every decision below was decided autonomously on 2026-11-25 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest")
**Status:** Ready for planning

<domain>
## Phase Boundary

Today a `QadiProvider` inside an `<Activity>` that is hidden for longer than a macrotask and shown again reaches a disposed registry.

1. **The registry is disposed on hide.** `packages/react/src/QadiProvider.tsx:217-223` builds the registry lazily in `registryRef`. The effect at `:285-299` disposes it from its cleanup after `setTimeout(0)` and sets `registryRef.current = undefined`.
2. **React 19.3.1 `<Activity>` runs the cleanups on hide and re-runs the effects on reveal.**
   - Hiding runs both layout and passive cleanups.
   - Revealing a stable element re-runs both effect kinds with the last committed closure and no re-render.
   - Children's effects run before the provider's.
   - So after a hide longer than the timer, the children re-subscribe to the disposed registry, which is still in context, and the provider's subject effect (`:257-261`) then writes to it.
   - Reproduced on 2026-11-24 with a throwaway test, since deleted. The hide/reveal threw an `AggregateError` holding two `Cannot access Atom …: registry is disposed` errors: first from the consumer's `useAtomValue` subscription, then from `QadiProvider.tsx:258`.
3. **A long hide followed by a re-render silently builds a second registry.** The ref is `undefined`, so `??=` builds a new one. That loses the decision cache and re-applies the construction seeds.
4. **Tests that cannot fail:**
   - P4 (`QadiProvider.sweep.test.tsx:136`) hides and shows in one tick.
   - SUBJ1 and SD3 re-render the provider or put the `<Activity>` below it.
   - `edges.test.tsx:257` ("disposes its registry when unmounted") checks only that the body is empty.
5. **The lifetime rule is unmeasured.** It lives inline in `QadiProvider.tsx`, which is outside `stryker.react.mjs`.

After this phase:
- A provider's registry has one identity for the provider's whole life. Nothing ever nulls the ref or builds a second registry.
- The deferred release recycles the registry in place with `registry.reset()` instead of disposing it. The registry stays usable, so no consumer can reach an unusable one. The release then re-seeds the latest committed subject before any consumer can read.
- The rule lives in one package-private, headless lease module beside `SweepScheduler.ts`. It takes an injected timer, needs no React, is driven by its own tests, and is in `stryker.react.mjs`'s `mutate` list with no open mutant. The provider holds no lifetime logic beyond calling it.

ARCH-129. Package: `@qadi/react`, patch changeset: a defect fix, no export moves.

Records: ADR-QD-195 is new. It amends ADR-QD-014's consequence and ADR-QD-149, and amends ADR-QD-103 and ADR-QD-148 where they state the dispose-on-cleanup shape or the window around it.

Evidence:
- the code at the phase base (Phase 81's close, `d8b8bfa3`; `packages/react` is unchanged since `902d2128`)
- `.planning/research/` (SUMMARY §82, ARCHITECTURE §82, PITFALLS 82-A..H, FEATURES §82, STACK on `AtomRegistry`)
- `.planning/phases/_WAVE15-CONTEXT.md`
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE15-CONTEXT.md`, ROADMAP, REQUIREMENTS)
- **D-01:** Work only on branch `arch-wave-15`, one phase at a time, on the main tree (`use_worktrees` is false). No merge, push, tag, release, publish or `changeset version`.
- **D-02:** Use only the reserved records: ARCH-129, ADR-QD-195, CCR-QD-474, BEH-QD-746..750 and INV-QD-409..410.
  - Never run `node scripts/next-id.mjs`.
  - A reserved number left unused is named "Unused" in the CCR row.
  - Make spec edits only through `node scripts/spec-revise.mjs <doc> "<change (CCR-QD-474)>" --date <the real date>`, and verify them with `--check`.
  - No plan-local id (`D-01`, `WR-01`) goes in a shipped title, and no `*-NEXT` placeholder goes anywhere.
- **D-03:** Tests come first.
  - The RED test of D-13 is written on the phase base and seen RED there for the stated reason, with its output saved in `82-RED-EVIDENCE.md`. The claims about React's commit order that ADR-QD-195 makes are written from that observation, not from reasoning.
  - A characterisation test that is green on the base is shown failing once under a scratch source edit.
  - Every new check script is shown failing once.
  - No throwaway file exists at any commit or when the mutation base is recorded.

### Area 1 — Where the lifetime rule lives, and its shape (LEASE-02)
- **D-04: A new package-private module, `packages/react/src/RegistryLease.ts`.** It mirrors `SweepScheduler.ts`:
  - It imports neither React nor `QadiProvider.tsx`, and it is out of the barrel (AGENTS.md §9, ADR-QD-099).
  - It is added to `stryker.react.mjs`'s `mutate` list, and its header comment there says what a surviving mutant would mean: a registry released twice, never released, or released while held.
  - Its own test file, `packages/react/test/RegistryLease.test.ts`, drives it with an injected timer and renders nothing.
- **D-05: Its interface is small and its state is a closed union.**
  - A builder, `makeRegistryLease(...)`, takes:
    - the recycle action, i.e. what releasing does to the registry;
    - an injected defer, `(run: () => void) => cancel`, defaulting to `setTimeout(…, 0)` / `clearTimeout`.
  - It returns `hold()` and `release()`:
    - `hold()` cancels a pending release.
    - `release()` schedules one.
  - Its state is a closed tagged union (for example `Held` / `Releasing` / `Released`), never booleans that can disagree. Every transition answers for every state, so a repeated `hold` or `release` is a defined no-op, not an accident.
  - No module-scope `let`: `MODULE_STATE_BUDGET` must not grow. No `switch`, `as`, `!`, `any` or `Record<string, unknown>`.
  - The planner may adjust names if the research spike shows a cleaner cut. The interface must stay this size.
- **D-06: The provider only calls the lease.**
  - `QadiProvider.tsx` builds the registry once, in render, into a ref (D-08). It builds the lease once per registry. One effect calls `lease.hold()` in setup and `lease.release()` in its cleanup.
  - No timer, flag or dispose call remains in the provider.
  - `QadiProvider.tsx` stays `unmeasured` in the mutation record. Its behaviour is pinned by the rendered tests of D-13.
- **D-07: The lease never touches the sweep.**
  - It never calls `QadiAtoms`' sweep, `AtomRegistry`'s `scheduleTask` or `defaultIdleTTL` (ADR-QD-148, CCR-QD-150), and it never reads `registry.disposed`, which is not on the interface.
  - It owns infrastructure, never a decision (AGENTS.md §13).

### Area 2 — Recycle in place, not dispose (LEASE-01, LEASE-03)
- **D-08: One registry identity for the provider's life.**
  - The registry is built in render, so the first render and a server render keep the subject seeded at construction with no pending frame. This keeps today's `initialValues: [[atoms.subject, subject], ...initialValues]`.
  - `registryRef` is never nulled, and nothing builds a second registry.
  - Rejected, with reasons recorded in ADR-QD-195:
    - **An effect-time or state-held rebuild:** too late, because children's reveal effects run first.
    - **The `useScoped` shape:** it renders nothing on the server pass, which breaks SSR and the first-render subject.
    - **A registry proxy:** it forwards every member and hides identity.
    - **Dispose only on a true unmount:** React gives no hidden-vs-gone signal at cleanup time.
    - **Never releasing:** it leaks the runtime layer scope and running fibers.
- **D-09: The deferred release calls `registry.reset()`, not `dispose()`.**
  - `reset()` clears every node and runs its finalizers, which releases the `Atom.runtime` layer scope and stops what was running. The registry stays usable. `dispose()` is terminal and is no longer called.
  - The release then re-seeds the latest committed subject (D-11) in the same callback, so a consumer that re-subscribes on reveal reads the right subject.
  - The subject atom is `Atom.keepAlive` (`QadiAtoms.ts:237-242`), so the re-seed survives with no reader.
  - The research spike confirms that the re-seed holds, and picks between `registry.set(atoms.subject, …)` and `ensureNode(...).setInitialValue(...)`.
- **D-10: Every scenario has a stated, pinned outcome.**

  | Scenario | Outcome |
  |---|---|
  | StrictMode double effect | hold / release / hold in one tick recycles nothing; one registry |
  | Hide shorter than the timer | recycles nothing |
  | Hide longer than the timer, then reveal | recycles once, re-seeds the subject, throws nothing; decisions are re-evaluated |
  | Long hide with a re-render | the same registry, no second one |
  | Subject change while hidden | the revealed provider answers with the new subject once its effect runs; the one-frame tradeoff of ticket 34 is unchanged |
  | `atoms` prop change | keeps the registry and signals `AtomsReplaced`, unchanged |
  | True unmount | recycles exactly once after the timer, and the runtime layer scope is released |

  - **The accepted trade.** After a true unmount, a straggling `registry.get` silently recreates a node instead of throwing `registry is disposed`. ADR-QD-195 records it, and a test pins it. The node holds nothing alive: no subscriber, so it is idle-removed, and the registry becomes unreachable with the provider.

### Area 3 — What a recycle restores (LEASE-04)
- **D-11: The subject only, read from the latest committed props.**
  - The provider writes the subject and the subject atom into a ref inside an effect, never in render (PITFALLS 82-F: never the first closure). The lease's recycle action reads that ref.
  - With an `atoms` prop change, the ref holds the current atom set's `subject`.
- **D-12: Neither `initialValues` nor hydration seeds are re-applied after a recycle.** In this package `initialValues` is `hydrateDecisions`' output: seed grants (ADR-QD-149).
  - Re-applying a server seed after a hide would make the seed show again while the client re-evaluates. If the client had since replaced it, for example a server allow with the client's own denial, a superseded allow would render: a wrong decision. The seed is not an authority (ADR-QD-039), and the client's answer takes precedence (INV-QD-028, ADR-QD-017).
  - After a long hide the gates render `Pending`, then the client's own answer.
  - This is the "loss is recorded and pinned" branch of LEASE-04, and it is the correct one, not the cheaper one:
    - ADR-QD-195 records it, as do BEH-QD-067 and its SUBJ note, and the changeset says so.
    - A test pins a seeded allow not reappearing after a long hide.
  - It also changes scenario S2. Today a long hide with a re-render builds a fresh registry that re-applies the seeds; after this phase it does not. The ADR states the change.
  - Any other host atom passed in `initialValues` returns to its declared default after a long hide. The provider's doc comment and `09-react.md` state that `initialValues` seed construction only.
- **D-13: The sweep bound holds across a long hide.**
  - ADR-QD-148's one-sweeper-per-atom-set and no-sweep-in-the-reread-window are asserted across a long hide and reveal with `makeSweepCounter` and `withSweepFork`, not inferred from P4.
  - A hidden gate's question may be evicted and re-admitted. The test states what it asserts, not a step count.

### Area 4 — Tests, measurement and records (LEASE-01, LEASE-03, LEASE-05)
- **D-14: The RED test, written on the base: `packages/react/test/QadiProvider.lifetime.test.tsx`.**
  - Setup:
    - a parent with `mode` state;
    - a hoisted or `useMemo`'d `<QadiProvider><Can/></QadiProvider>` under `<Activity mode>`;
    - an error boundary and a captured `console.error`.
  - Steps: render, settle, hide, wait a real macrotask past the release timer, show.
  - Assertions: no captured error, `allowed` rendered, and a `useSubject()` probe reads the prop.
  - Expected base failure: the two `registry is disposed` errors.
  - Companions in the same file, each seen RED on the base or shown failing under a scratch edit:
    - `useInvalidate()` hidden then shown;
    - a `useDevtoolsFeed` consumer under hide and show;
    - StrictMode holding one registry;
    - a short-hide control;
    - a subject changed while hidden;
    - a long hide with a re-render keeping one registry identity;
    - the seeded allow not reappearing (D-12);
    - the sweep bound across a long hide (D-13);
    - the straggling read after unmount (D-10).
- **D-15: The vacuous unmount test becomes real.** `edges.test.tsx:257` must fail when the release is skipped, observed through the runtime layer's finalizer or an equivalent release probe, not the body being empty. It is shown failing once under a scratch edit that skips the release.
- **D-16: Mutation is measured like Phase 81.**
  - Phase-local scripts `82-check.mjs` and `82-mutation.mjs` reuse 81's shapes: base, compare, a dirty-tree refusal and a self-test.
  - The base is recorded before any source edit, over the existing `stryker.react.mjs` list: `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts`.
  - `RegistryLease.ts` is close-only, against an absolute bar: no surviving, no-coverage or ignored mutant.
  - `QadiProvider.tsx` stays `unmeasured`.
  - The close is re-taken after the review fixes.
- **D-17: Records.**
  - **ADR-QD-195 (new)** records:
    - the lifetime rule;
    - the observed commit order;
    - the rejected shapes;
    - the accepted trade;
    - the seeds not re-applied.
  - **Amendments, dated, past text kept:**
    - ADR-QD-014's consequence about the registry's lifetime;
    - ADR-QD-149 on seed grants after a recycle;
    - ADR-QD-103 and ADR-QD-148 where they describe dispose-on-cleanup or the dispose-then-reread window.
  - **BEH-QD-746..750:**
    - the long-hide reveal;
    - one identity;
    - release once on unmount;
    - the subject re-seed;
    - seeds not re-applied.
  - **Restated:** BEH-QD-067 and its SUBJ note (`09-react.md` ≈334, ≈380-390) and BEH-QD-516.
  - **INV-QD-409:** no consumer reaches an unusable registry.
  - **INV-QD-410:** a provider holds exactly one registry for its life.
  - **Also updated:**
    - traceability;
    - `spec/README.md`'s CCR-QD-474 row;
    - `appendices/react-integration.md` ≈139;
    - the `@qadi/react` README if it states the dispose behaviour.
  - **Changesets:** a `@qadi/react` patch changeset that names the fix and the seeds-not-re-applied change. No Breaking changeset and no upgrade-guide entry, because no export changes. `check-api-surface.mjs` must stay at the base count.
- **D-18: Gates.**
  - `pnpm check:pr < /dev/null` and `pnpm spec:package` are green at the close and again after the review fixes.
  - `pnpm spec:verify:strict` passes.
  - The archived v1.9 checks and Phase 81's checks are re-run from scratch copies where they hold React files. 81 touched none, so expect no React-held test.

### Refinements after the research spike (decided autonomously, 2026-11-25; `82-RESEARCH.md`)
The spike confirmed the shape: the lease, `reset()` and a subject re-seed, one identity, and the sweep left untouched. These corrections apply. Where they differ from D-01..D-18, they win.
- **D-19 — D-08's reason for rejecting "never release" is corrected.** On effect 4.1.2, idle removal already releases an unsubscribed `Atom.runtime` layer scope (probe `3e`). An unreleased registry retains only `keepAlive` nodes: the subject, seed grants, the runtime's layer atom and host `initialValues` atoms. So never releasing is rejected because it retains those nodes and grants past the provider's life, not because it leaks fibers.
  - ADR-QD-195 says this, and corrects PITFALLS 82-D where it is cited.
  - D-10's accepted trade is measured as no leak: a straggling read after a recycle re-acquires the layer, and idle removal releases it again.
- **D-20 — D-15's observable is replaced.** A layer finalizer still fires when the release is skipped, so it cannot make `edges.test.tsx:257` fail. The test reads `RegistryContext`'s registry after the timer, using a `keepAlive` host atom seeded through `initialValues`:
  - after a release it reads the atom's default;
  - with the release skipped it reads the seed;
  - under `dispose()` it throws.
- **D-21 — D-12's pin uses an unanswered question.** It uses a resolver that never answers. An answered question never re-reads its seed: `announced` is keyed by registry and survives `reset()`. So a test on an answered question is vacuous.
  - A second recorded loss: with `subject={undefined}` and a seed, the gate stays `Pending` after a long hide until a subject arrives. This is fail-closed and correct, because a seed is not an authority (ADR-QD-039). It is recorded in ADR-QD-195, BEH-QD-067's note and the changeset, and pinned by a test.
  - Today's S2 paints the superseded allow and reports a second hydration mismatch. After the fix it paints `Pending` and reports once. The tests and the ADR state both.
- **D-22 — `reset()` detaches a live subscriber.** A host that holds a `registry.mount` or `subscribe` across a hide is detached silently, because `reset()` clears live listeners (probe `3b2`). In `<Activity>` order every consumer has already unsubscribed before the timer fires, so Qadi's own hooks lose nothing. ADR-QD-195 states the limit for a host's own direct subscription, BEH-QD-067 documents it, and a test pins it.
- **D-23 — The lease's shape as measured.**
  - It is a closed union `Unheld | Held | Releasing` (carrying `cancel`), dispatched with a hoisted `Match.tagsExhaustive`.
  - `cancel` is the only cancellation mechanism: no second guard inside the callback, which would make removing `cancel()` an equivalent mutant.
  - One lease test runs on the default `setTimeout` defer with a real macrotask.
  - The lease's own test file must kill every mutant by itself, even though the rendered tests also reach it under `perTest`.
  - The re-seed is `registry.set(latest.atoms.subject, latest.subject)`, the same public call the provider's effect makes.
- **D-24 — The RED test asserts on an error boundary's caught list and the captured `console.error`.** With a boundary, `act` does not throw. The observed commit order quoted in ADR-QD-195 is:
  - Setup runs children before the provider, layout before passive, so the provider's `hold` runs last on reveal.
  - Cleanup runs parent before children, layout before passive.
  - `82-RED-EVIDENCE.md` re-records it at execution.

### Claude's Discretion
- The lease's exact export names, and whether the recycle action is passed at build time or held by the provider.
- Whether the release probe of D-15 is an `Atom.runtime` layer finalizer or a test-only registry wrapper. It must observe the real release.
- The ordering of companions in the lifetime test file, and whether the lease tests share a fixture with `SweepScheduler.test.ts`.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/react/src/SweepScheduler.ts` is the precedent:
  - a pure builder with an injected fork;
  - a closed lifecycle, with a flag cleared before the work runs so a throw cannot wedge it;
  - a class-private carrier (`withSweepFork`) for tests;
  - out of the barrel, and in `stryker.react.mjs`.
- `makeSweepCounter` / `withSweepFork` (sweep tests P1-P5) assert sweeps by count.
- `effect/reactivity/AtomRegistry`:
  - `reset()` clears and finalizes but leaves the registry usable;
  - `dispose()` is terminal;
  - `ensureNode(atom).setInitialValue(v)` re-seeds a node;
  - `disposed` is not on the interface.
- `QadiAtoms.ts:240` declares the subject atom as `Atom.keepAlive` with `subjectsEqual`.

### Established Patterns
- Hooks read the registry from `RegistryContext`, which provides the same object every render, so a recycled-in-place registry needs no context change.
- Developer signals go through `DeveloperSignals.ts` and the `providerSignals` table. `AtomsReplaced` is detected in an effect.
- Tests run from the repo root: `pnpm exec vitest run --project react <file> < /dev/null`. Stryker runs alone with stdin closed.

### Integration Points
- `QadiProvider.tsx:217-223` (registry), `:257-261` (subject effect) and `:285-299` (the deferred dispose, replaced by the lease).
- `stryker.react.mjs`'s `mutate` list and its header prose.
- Spec: `spec/behaviors/09-react.md` (BEH-QD-067, the SUBJ note, BEH-QD-516), `spec/appendices/react-integration.md`, and ADR-QD-014, 103, 148, 149.
</code_context>

<specifics>
## Specific Ideas

- The research spike that the ROADMAP requires (`/gsd-plan-phase --research-phase 82`) answers four questions before the planner commits to the shape:
  1. Do `reset()` and a subject re-seed hold under StrictMode?
  2. Do they hold with two providers on one atom set?
  3. Do they hold with the sweep's pressure-episode forks after a long hide?
  4. Does `reset()` release the `Atom.runtime` layer scope at a true unmount?
- If the spike finds `reset()` cannot meet D-09, it says so with the failing probe, and the plan stops for a recorded decision rather than falling back to a simpler shape.
- The RED test's observed failure text goes into `82-RED-EVIDENCE.md` verbatim, and ADR-QD-195's commit-order paragraph quotes it.
</specifics>

<deferred>
## Deferred Ideas

- A mutation baseline for `QadiProvider.tsx` itself. It renders, and its lifetime logic moves into the measured lease.
- Upstream `@effect/atom-react`'s `RegistryProvider`, which has the same dispose-in-cleanup shape. Out of scope, because Qadi does not use it.
- Unmounting children while hidden (the `useScoped` shape) and rebuilding the registry on an `atoms` change. Both were rejected in research, so do not re-propose them.
</deferred>
