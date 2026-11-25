# Feature Research: v1.11 Arch Wave 16 (Phases 85-91, ARCH-132..138)

**Domain:** internal architecture deepening of an Effect v4 authorization monorepo (`@qadi/devtools`, `@qadi/react`, `@qadi/audit`, `@qadi/core`). No new product features: the "features" are the observable behaviours each deepening must keep or change.
**Researched:** 2026-11-25 on `arch-wave-16` (base `ac7578f3`). Read-only: no source edit, no `next-id.mjs`. Two throwaway scripts in the session scratchpad only (an Effect `Cause` rendering comparison and a `madge` type-import probe).
**Confidence:** HIGH for current behaviour and public surface (every claim read in source or spec, the two load-bearing runtime facts reproduced). MEDIUM for the shape of the fixes (design is the planner's; the constraints below are findings, not decisions). LOW only where marked.

Conventions: `file:line` is relative to the repo root; `P/...` = `packages/...`. "Review" = `architecture-review-20261125.html` (scratchpad). Reserved ids (not used here): ADR-QD-198..204, CCR-QD-477..483, BEH-QD-761..795, INV-QD-415..428. Highest existing at base: ADR-QD-197, CCR-QD-476, BEH-QD-760, INV-QD-414. `.planning/phases/_WAVE16-CONTEXT.md` does not exist yet.

## Wave summary (read this first)

| Phase | ARCH | Package | Public API change | Behaviour change a user can see | Breaking? | Complexity | Biggest risk |
|-------|------|---------|-------------------|----------------------------------|-----------|------------|--------------|
| 85 hydration view | 132 | devtools | none (`QuestionsPanel`, `DockModel`, the view are package-private) | none, byte-identical DOM is the oracle | No | MEDIUM | text pinned by two HTML-snapshot files; store count 10 to 11 touches 5 spec sections |
| 86 provider registry owner | 133 | react | none (`RegistryLease.ts` private, `QadiContextValue` untouched) | none | No | MEDIUM-HIGH | render/effect timing (StrictMode, `<Activity>`); ticket 34 render-phase hazard |
| 87 stated-stop run | 134 | devtools | none (feeds' interfaces unchanged) | **one**: the Simulator's "simulation itself failed" text | No (patch) | HIGH | self-interrupt asymmetry; gates feed's opposite ordering |
| 88 StoppedBox ledger | 135 | devtools | none | none | No | LOW-MEDIUM | the ref read in render relocates, it does not vanish |
| 89 audit admission | 136 | audit | none if the two refusal unions and two error classes stay | none | No (Breaking only if unions merge, an anti-feature) | LOW-MEDIUM | check order is spec'd and tested |
| 90 per-port facts | 137 | core | none if `PortName`, `PortServing`, `PORTS`, `PORT_FIXTURES` keep their shapes | none | No | HIGH (uncertain) | `madge` counts type edges; `PortName` derivation may be impossible as a leaf |
| 91 named barrels | 138 | core, react, audit | **zero names added or removed** (942 exports) | none | No (house-rule change) | HIGH (size), LOW (logic) | `Hydration.ts` fold is **not acyclic** as the engine file states; fold order vs barrel order |

---

## Phase 85: the dock's hydration block is a model row (devtools)

### 85.1 What exists (all in `P/devtools`)

- The union is decided in React: `src/react/QuestionsPanel.tsx:346-368` renders `activity === undefined` as `Pending` (`qadi-hydration-pending`, text `NO_COUNTS_YET` = `"no counts read yet."`, `:92`) when `unsampled`, else `Unwired` (`qadi-hydration-unwired`, a JSX sentence with three `<code>` spans), else `<Counts>` (`:371-427`).
- Text worked out in the component: the rate sentence (`:394-399`: shown only when `rechecked !== 0`; `"{m} of {n} re-checked question{s} disagreed with the server."`, singular at `rechecked === 1`); the raised-drops filter (`:373`, `count > 0`) with the no-drops sentence (`:401-407`, `"Nothing was dropped. All {drops.length} reasons are watched."`); each drop row (`count`, `reason`, `"- {meaning}"`); the unaccounted scope (`:418-426`: `"Process-wide totals, not this page's."` then either `"This process seeded more than it built, so it is a client reading payloads rendered elsewhere."` when `unaccountedEntries` is `undefined`, or `"{n} dehydrated entr{y|ies} have no seeding counted in this process."`, `y` only at 1, so **0 reads "0 dehydrated entries"**, a quirk to pin, not fix).
- The "unsampled" rule is `isUnsampled(status)` (`src/model/DiagnosticsFeed.ts:87`: Off false, Starting true, Live false, Stopped `!sampled`) called at `src/model/DockModel.ts:391` (questions key, **with an extra `supplied === undefined &&` guard**), `:405` (services key, no guard) and `src/react/QuestionsPanel.tsx:112` (hydration, **overridden by `activity !== undefined`**). The three sites share one primitive but not one predicate; the review's "decided once" must not flatten the per-view overrides (BEH-QD-619 questions, BEH-QD-615 services).
- `DockFrame` reads the whole diagnostics snapshot (`src/react/DevtoolsDock.tsx:112`: `{ status, reading: shown }`) and forwards `shown.hydration` at `:258`. It needs `status` for `useStopNotice` (`:113`) regardless, so removing `shown` alone does not stop the subscription; a status-only read is needed. Precedent: `usePaused` reads a derived value through `useStoreSnapshot({ subscribe, getSnapshot })` (`src/react/useStoreSnapshot.ts`). Note the review's "re-renders on every reading" is overstated: the shown reading keeps its identity when no field moved (INV-QD-411).
- Counts source: `hydrationActivity` (`src/model/Hydration.ts`), process-wide aggregates from `@qadi/core` metrics (BEH-QD-231, INV-QD-045). `unaccountedEntries` and `hasHydrated` are **public root exports** (`P/devtools/src/index.ts:53`, `spec/overview.md:924-926`); `hasHydrated` has no caller in `src` (only its own test and `test/surface.test.ts:42`).

### 85.2 Spec, tests and surface touched

| Kind | Ids |
|------|-----|
| Behaviour | BEH-QD-700 (store list, `spec/behaviors/28-devtools-screens.md:1098`), BEH-QD-699 ("four computed stores", `:2940`), BEH-QD-615 (services store, the precedent, `:2353`), BEH-QD-583/619 (questions store), BEH-QD-735 (first-configure counts per store, `:3254`; **questions 2, services 1**), BEH-QD-218 (empty states table, has **no hydration row**), BEH-QD-231 (`spec/behaviors/19-hydration.md:776`) |
| Invariant | INV-QD-390 (derived stores and their count), INV-QD-389, INV-QD-355 (port card joined in one pure function), INV-QD-045 |
| Decision | ADR-QD-168 (a port card is a model row: the template), ADR-QD-185 (decisions 9-11; "four derived stores", amend if a fifth), ADR-QD-047, ADR-QD-052, ADR-QD-152 |
| Tests that pin it | `test/react/QuestionsPanel.test.tsx:92-196` (copy per branch), `QuestionsPanel.characterisation.test.tsx` and `QuestionsPanel.feed.characterisation.test.tsx` (**full HTML strings per diagnostics status**, the byte oracle), `DiagnosticsScreens.test.tsx` D5/D6 (`:227` pending text, status Stopped-unsampled vs sampled), `DevtoolsDock.test.tsx:1088,1209`, `test/model/DockModel.test.ts` (store-list test), `test/model/ConfigureRule.test.ts` (CR22 sweeps all ten stores) |
| Mutation | `stryker.devtools.mjs` mutates `src/model/**` (break 80) and not `src/react/`. Moving the text into `src/model/` **brings it under the mutation floor**: every plural, `rechecked === 0`, `> 0` and `dehydrated >= seeded` boundary needs a killing case in the table test (XC-05) |

### 85.3 Must stay identical

- Every rendered byte of the hydration block for every status x reading combination (the two characterisation files), and every `data-testid` (`qadi-hydration`, `-pending`, `-unwired`, `-dehydrated`, `-seeded`, `-rechecked`, `-mismatched`, `-rate`, `-no-drops`, `-drops`, `-drop`, `-scope`).
- The state mapping: supplied or sampled `hydration` present => Counts; absent and `isUnsampled(status)` => Pending; absent otherwise (Off, Live, Stopped-after-sample) => Unwired; "zero is never shown for no reporter" (BEH-QD-218's rule, `:418-423`).
- `HydrationActivity`, `HydrationDrops`, `hydrationActivity`, `unaccountedEntries`, `hasHydrated`: public, unchanged (gate 13 stays at 942).
- Unknown drop reason is reported with the `UNRECOGNISED` meaning, not hidden (`src/model/Hydration.ts`, BEH-QD-231).

### 85.4 What changes (not Breaking)

A pure `hydrationView` in `src/model/` (beside `PortCards.ts`), a closed `Data.TaggedEnum` (`Pending | Unwired | Counts{rate, drops, scope}`), served by the dock model; `QuestionsPanel` takes the view and renders a tag; `DockFrame` stops passing `hydration`. `DockModel` is package-private, so **no changeset** (ADR-QD-185 consequence is the precedent).

### 85.5 Classification

| Table stakes | Why | Complexity |
|--------------|-----|------------|
| Characterise the block on the phase base first (the two HTML files already do; add the missing cells: `rechecked === 1`, `dehydrated === seeded`, a foreign drop key, Stopped-unsampled with a supplied hydration) and keep them green untouched | The view is "only worth it if nothing moves" | LOW |
| One pure function, one table test in `test/model/` (Pending, Unwired, Counts x rate/no-rate x drops/no-drops x scope two ways x plural edges) | Replaces ~20 DOM assertions; puts the text under mutation | MEDIUM |
| Serve it from the model with the services-store shape: derived store, parent `shownReading`, key = `{ activity, unsampled }` by identity (ADR-QD-185 d9, INV-QD-389/404 "every key field compared") | The owner's stated pattern; keeps questions and services keys semantically untouched | MEDIUM |
| Update the store list in the same change: BEH-QD-700 (ten to eleven), BEH-QD-699 title/wording, INV-QD-390, BEH-QD-735 counts (hydration hears 1), `DockModel.test.ts` list, `ConfigureRule.test.ts` CR22, ADR-QD-185 dated amendment, `spec/README.md` CCR row | The count is "stated once, kept equal by review"; a miss fails tests, not a gate | MEDIUM |
| Add a BEH for the hydration block's states (none exists: only BEH-QD-231 for counts and BEH-QD-218 without a hydration row) and a hydration row in BEH-QD-218's table | A rule moved into the model with no requirement text is the same locality gap in spec form | LOW |

| Differentiators (take them) | Value | Complexity |
|-----------------------------|-------|------------|
| `DockFrame` reads **status only** through a selector-style `useStoreSnapshot` (`getSnapshot: () => model.diagnostics.getSnapshot().status`) | Delivers the review's "frame stops subscribing to the whole reading" truthfully; today `shown` is used for nothing but `hydration` | LOW |
| Decide `isUnsampled(status)` in one model helper that both keys read (e.g. computed once from the shown snapshot), each view still applying its own override | Removes the three call sites without changing BEH-QD-619/615 | LOW-MEDIUM |
| `QuestionsPanel` takes the view store itself (`useStoreSnapshot(model.hydration)`) so the frame forwards nothing | Frame passes `status` only; one subscription per block | LOW |
| Keep the static Unwired advice as a panel constant keyed by tag (it has no data), put every data-dependent sentence in the model | Avoids smuggling JSX/`<code>` markup into a React-free module while still moving all computed text | LOW |

| Anti-features | Why | Instead |
|---------------|-----|---------|
| A fourth "nothing hydrated yet" tag using `hasHydrated` | Changes the DOM the characterisation files pin; new behaviour, not a deepening | Leave `hasHydrated` an unused public export |
| Removing `hasHydrated`/`unaccountedEntries`, or moving them out of `Hydration.ts` | Breaking minor on `@qadi/devtools` for no gain | Call them from the view |
| Folding the "unsampled" overrides into one boolean | Changes questions (supplied wins) or services semantics (BEH-QD-615, 619) | One primitive, per-view override |
| Putting hydration counts into `QuestionsSnapshot`/the questions store key | Couples hydration moves to BEH-QD-583's reference-keeping rule; the review's "unless it rides on questions" is the weaker option | Own derived store |
| Making `DiagnosticsSnapshot` (public type) carry a derived `unsampled` | Public type change | Private helper |
| Fixing the "0 dehydrated entries" plural in passing | Pinned today; a text change needs its own decision | Pin it, note it |

**Dependencies:** none earlier. Feeds Phase 91 nothing (devtools barrels are already named). Open decision for the planner: derived store (recommended, matches ADR-QD-168/185) vs riding the questions store (no count change, weaker locality).

---

## Phase 86: one React-free owner for the provider's registry lifetime (react)

### 86.1 What exists

`P/react/src/QadiProvider.tsx` (359 lines) holds **six refs** (`signalRef`, `registryRef`, `atomsIdentityRef`, `latestRef`, `leaseRef`, `reportedInstrumented`) and seven effects. The lifetime logic: build the registry lazily in render with `[atoms.subject, subject]` plus `initialValues` seeded (ADR-QD-195 d1), recycle = `registry.reset()` then write `latestRef.current` subject back in a `finally` (d4), neither `initialValues` nor a hydration seed written back (d5, ADR-QD-039), one effect declared last doing `lease.hold()` / `return () => lease.release()` (d3). `P/react/src/RegistryLease.ts` (85 lines) decides only when to recycle: closed state union `Unheld | Held | Releasing{cancel}`, injectable `defer`, matchers **built per lease inside the function** so each arm is a mutant (d7). `stryker.react.mjs:57-63` lists `RegistryLease.ts` **by name** in `mutate`.

### 86.2 Spec, tests, surface

| Kind | Ids |
|------|-----|
| Behaviour | BEH-QD-746 (hidden longer than a macrotask), 747 (one registry for its life), 748 (released once, a macrotask after the last release), 749 (recycle writes the latest committed subject back), 750 (recycle re-applies neither `initialValues` nor a seed) in `spec/behaviors/09-react.md:1083-1191`; BEH-QD-067 (provider); BEH-QD-692 / INV-QD-387 (a developer signal has one row; `AtomsReplaced` stays reported once) |
| Invariant | INV-QD-409 (no consumer reaches an unusable registry), INV-QD-410 (exactly one registry for a provider's life) |
| Decision | ADR-QD-195 (keep hold/defer semantics; its **rejected list is binding**: registry rebuilt in an effect or held in state, `useScoped` shape, a forwarding proxy, dispose, never release, re-apply seeds, subject write from the first closure or in render, a second guard inside the deferred run), ADR-QD-148 (the lease never touches the sweep), ADR-QD-149, ADR-QD-039, ADR-QD-099 |
| Tests | `test/QadiProvider.lifetime.test.tsx` (LT4-LT8, LT13 count distinct registries), `.seed`, `.subject`, `.sweep`, `.signals`, `.production`, `QadiProvider.test.tsx`, `RegistryLease.test.ts`, `QadiProvider.tst.ts`; the `examples/nextjs-newsroom` e2e cited in the ticket-34 comment (`QadiProvider.tsx` subject-effect block) |
| Surface | `QadiContextValue { atoms, registry, gates }` and `QadiProviderProps` unchanged; `InitialValues` is re-exported from `QadiProvider.tsx:117`; `RegistryLease.ts` is "out of the barrel" so absorbing it removes no public name |

### 86.3 Must stay identical

One registry object for the provider's life (identity visible through `RegistryContext` and `QadiContext`); the subject is already in the registry on the **first render** (no pending frame; server render and first client render agree); a hide shorter than a macrotask recycles nothing; a long hide recycles once, then the reveal reads the latest committed subject before any consumer subscribes (LT6, LT13); a recycle that throws leaves the lease usable and still writes the subject back (`finally`); a throwing `defer` leaves the lease `Held`; `AtomsReplaced` once per swap; the registry is never disposed.

### 86.4 What changes (not Breaking, no changeset)

A module with no React import that owns create, seed, write subject, recycle and lease; `QadiProvider` keeps one ref (the owner) and forwards hold, release, subject changes and the latest `{ atoms, subject }`. The owner is tested with an injected `defer` and `AtomRegistry.make`, no rendering.

### 86.5 Classification

| Table stakes | Why | Complexity |
|--------------|-----|------------|
| Owner built lazily in render exactly where `registryRef` is built today (first-render subject, ADR-QD-195 d1) | Moving construction to an effect is a rejected alternative | MEDIUM |
| Lease state machine kept as is (closed union, `cancel` is the only cancellation, matchers per instance) inside or beneath the owner | ADR-QD-195 d2/d7; the mutation floor depends on it | LOW |
| Owner tests with a recording fake `defer`: hold/release sequences, recycle-throws, subject write-back after a throwing reset, latest-subject read, seeds not re-applied, one registry identity | These are the defects ADR-QD-195 fixed; they should now fail without React | MEDIUM |
| Render suite shrinks to StrictMode/`<Activity>`/server smoke; the seven `QadiProvider.*.test.tsx` files keep their LT ids green | Review: "render tests shrink", but ids are spec pins (BEH-QD-747..750 cite them by title) | MEDIUM |
| Add the owner to `stryker.react.mjs` `mutate` (and drop or keep `RegistryLease.ts` as it stays or moves) and re-take per-file scores at the phase base | XC-05: a renamed file silently leaves the mutation floor | LOW |
| One ADR amendment of ADR-QD-195 (not a new reversal), BEH-QD-747..750 pinned-by lines, INV-QD-409/410 enforcement lines | Spec is normative; the pinned-by titles will move | LOW |

| Differentiators | Value | Complexity |
|-----------------|-------|------------|
| Owner also holds the "what a recycle re-seeds from" fact (`latestRef` + its commit effect become `owner.commit({ atoms, subject })`) | Removes the second of the four lifetime refs, the one a discarded render must never reach | MEDIUM |
| Move the subject-sync effect's `registry.get(...) !== subject` compare into the owner (`owner.writeSubject`) | The "write the subject" rule then exists once with the recycle's write-back | LOW |
| Keep `atomsIdentityRef` / `AtomsReplaced` in the component (it is a developer signal tied to `onDeveloperSignal`) but compare through the owner's held atoms | Avoids a second reporter path; INV-QD-387 stays one row | LOW |

| Anti-features | Why | Instead |
|---------------|-----|---------|
| Registry in state, in an effect, a proxy, `dispose()`, or a render-phase subject write | All rejected by ADR-QD-195; the render-phase write also hung an in-flight re-check (ticket 34 comment in `QadiProvider.tsx`) | Keep the effect-based subject write |
| Re-applying `initialValues` or a seed on recycle | A seed is not an authority (ADR-QD-039); would paint stale allows | BEH-QD-750 stays |
| Module-scope `let` for the owner or a "current provider" | `MODULE_STATE_BUDGET` (AGENTS.md section 6) counts exactly one name, in `DeveloperSignals.ts` | Closure state per owner |
| The owner calling the sweep or `scheduleTask` | ADR-QD-148 / ADR-QD-195 d6 | Keep it out |
| React state or a hook inside the owner | The point is React-free; AGENTS.md section 13 forbids decision state in React | Plain functions + `Match` |

**Dependencies:** none earlier. Phase 91 later folds `Hydration.ts`/`GateRegistry.ts` in the same package: land 86 first so 91 moves files over a settled `QadiProvider.tsx` (it imports `GateRegistry.ts`, `GateWriter.ts`, `HydrationEngine.ts` at `:47-49`).

---

## Phase 87: one "scoped run that states its stop" above `SupersedingRun` (devtools)

### 87.1 What each run produces today (the exact stop texts)

| Run | Where | State on a defect | Text |
|-----|-------|-------------------|------|
| `TimelineFeed` | `P/devtools/src/model/TimelineFeed.ts:186` | `TimelineStatus.Stopped({ reason })` | `causeMessage(cause)`: `Cause.pretty` (stack frames and checkout paths) or the placeholder `a value that could not be described` |
| `DiagnosticsFeed` | `P/devtools/src/model/DiagnosticsFeed.ts:208` | `DiagnosticsStatus.Stopped({ reason, sampled })` | same `causeMessage`; plus `sampled` |
| `SimulationSession` | `P/devtools/src/model/SimulationSession.ts:418` | `RunState.Broke({ question, message })` | **`String(exit.cause)`**, e.g. `Cause([Die(Error: the layer exploded)])` |
| `GatesFeed` | `GatesFeed.ts:131` (`stated`) | a `Failed{reason}` view of the registry or thunk, not a run stop; no restart | `causeMessage(Cause.die(thrown))` |
| Wiring read / explorer | `Diagnostics.ts:263`; `ExplorerSession.ts:160,171` | `WiringRead.Failed`, a refusal string | `causeMessage` |

The two feeds reach their hook through `SupersedingRun.fork`'s `onFailure`, which **excludes interrupt-only causes** (`SupersedingRun.ts:120`, `!Cause.hasInterruptsOnly`) and any non-current token (BEH-QD-519: "an interruption MUST NOT produce Stopped"). The simulation session instead does its own `Effect.exit` inside the run (`land`, `:395-420`), so a resolver that **interrupts itself** reads `Broke` (SR1, `test/model/SimulationSession.runs.test.ts:55-73`, asserts the message includes `"Interrupt"`, true of both renderings). A shared module that routes the session through `onFailure` would turn SR1 into a silent `Running`.

### 87.2 Is `String(exit.cause)` a user-visible defect? (answer, with evidence)

**A user-visible inconsistency; not a throw, not a safety defect, and not (by the letter) a violation of ADR-QD-182.**

- Reproduced with the installed `effect` (`P/devtools/node_modules/effect`): `String(Cause.die(new Error("boom")))` is `Cause([Die(Error: boom)])`; `Cause.pretty` of the same is `Error: boom` plus stack frames; a hostile die renders `Cause([Die([toString threw])])`, so it **does not throw**. `String(Cause.interrupt(1))` is `Cause([Interrupt(1)])`, `Cause.pretty` is `InterruptError: All fibers interrupted without error ...`.
- ADR-QD-182 decision 10 lists exactly the timeline feed, diagnostics feed, wiring read, policy explorer and gates feed; `SimulationSession` is **not named**. Decision 11 and `P/core/src/ThrownMessage.ts:49-51` (doc) explicitly bless `String(Cause)` as "the one other rendering ... Effect guards it itself". So a RED test "against ADR-QD-182" would assert a rule that ADR does not state. The new ADR (the review's "new ADR answering ADR-QD-150 point 2") should extend decision 10 to the session and say so; the RED test then pins that new rule (`Broke.message === causeMessage(cause)`).
- What a user sees: the Simulator's "the simulation itself failed" box (`P/devtools/src/react/Simulator.tsx:106-110`) shows the debug repr `Cause([Die(...)])`, while the Timeline and Diagnostics notices show a `Cause.pretty` trace inside a `<pre>` (`StoppedBox.tsx` `reasonStyle`). Existing pins hold under both renderings: `test/model/SimulationSession.test.ts:1358` and `test/react/Simulator.test.tsx:583` assert `"the layer exploded"`, SR1 asserts `"Interrupt"`. No test pins the `Cause(` form.

### 87.3 Spec, tests, surface

| Kind | Ids |
|------|-----|
| Behaviour | BEH-QD-519 (timeline stop), BEH-QD-507 and BEH-QD-637 (poll stop, restart), BEH-QD-521..525 (`SupersedingRun`), BEH-QD-461 and SR1-SR5 (`spec/behaviors/29-devtools-simulator.md:994,1040-1049`), BEH-QD-742/744/745 (what a configure throws; work a status announces starts whatever a listener throws; reconfigure from a step), BEH-QD-636 (timeline feed) |
| Invariant | INV-QD-313 (poll defect stated, interruption never, a replaced run never writes), **INV-QD-408** (publish-then-fork; **a gates feed forks its cadence before it publishes**), INV-QD-403 (a configure that moves no input reaches no host code), INV-QD-404 (every input field compared), INV-QD-407, INV-QD-373, INV-QD-402 |
| Decision | ADR-QD-150 (rejected a one-call `run(effect)`: nothing could publish between begin and fork), ADR-QD-194 (ordering, rethrow once), ADR-QD-192 (inputs only through `configure`), ADR-QD-182, ADR-QD-137, ADR-QD-177, ADR-QD-173 |
| Tests | `TimelineFeed.test.ts` (TF28, TF29), `TimelineFeed.listeners.test.ts`, `DiagnosticsFeed.test.ts` (F31), `DiagnosticsFeed.superseded.test.ts`, `DiagnosticsFeed.characterisation.test.ts`, `GatesFeed.test.ts` (G49), `SimulationSession.runs.test.ts` (SR1-SR6), `SupersedingRun.test.ts`, `test/builtFeeds.ts:16-28`, `test/react/useConfigured*.test.*` |
| Surface | The three feeds and their `status`/`restart`/`configure` are public root exports (`test/surface.test.ts`); `TimelineStatus`, `DiagnosticsStatus` public. All stay. `SupersedingRun.ts` is package-private and unchanged "underneath" |
| Mutation | `stryker.devtools.mjs` mutates all of `src/model/**`: the new module and the three feeds are under the floor; re-take scores |

### 87.4 Must stay identical

Status value identities (`READING`, `diagnosticsStarting`, `diagnosticsOff` constants; a repeat publish notifies nothing); the order inside `readSource`/`start`: **publish the status in a `try`, fork in the `finally`**, then rethrow what listeners threw once (INV-QD-408); a fork refuses a token a subscriber superseded; interruption (new source, no source, capacity change, scope close, release dying) never produces `Stopped`; a source that ends by itself stays `Reading`; `Stopped` keeps what was delivered; `restart` is a no-op once closed and replays the backlog into the same timeline; `configure` on a closed feed does nothing; `sameFields` gate: an unchanged input restarts nothing; `completeTimelineInputs` throws before anything moves (INV-QD-401); `DiagnosticsStatus.Stopped.sampled` (`sampled` reset only by `Off`); span names (`qadi.devtools.makeTimelineFeed`, `makeDiagnosticsFeed`).

### 87.5 What changes

Internal: one module owning held inputs + `sameFields`, publish-then-fork through a callback, failure to `Stopped(causeMessage)`, `restart`, the closed guard; the feeds and session supply engine + states. User-visible: **the Simulator's broken-run text becomes `causeMessage`'s**. Patch changeset for `@qadi/devtools` (a text change). Not Breaking: no type or tag changes.

### 87.6 Classification

| Table stakes | Why | Complexity |
|--------------|-----|------------|
| RED test first: a defect in the session's ports layer yields `Broke.message === causeMessage(Cause.die(error))`, plus a hostile-value case (placeholder, never `Cause(...)`) | The review's own condition; seen RED on the phase base | LOW |
| New ADR (answers ADR-QD-150 point 2: the callback is what lets a store publish between begin and fork; extends ADR-QD-182 d10 to the session) with a dated note on ADR-QD-150, not a reversal | The review says "so this isn't read as reopening 150" | LOW |
| Ordering property tested once (publish, then fork, then rethrow) against the shared module with a throwing listener; feed tests keep only feed behaviour | The promise is written as code three times and as doc twice | HIGH |
| Characterise **before** merging: self-interrupt of a timeline source and of a diagnostics collector (today unstated: feeds show `Reading`/`Live` with nothing running; BEH-QD-519 is silent), and SR1 for the session | The two feeds and the session disagree on interrupt-only causes; the shared module must take the policy as a parameter or keep SR1 | MEDIUM |
| `GatesFeed` shares only the `configure` prologue (closed guard, `completeInputs`, `sameFields`, retry-on-failed-watch exception) | Its cadence is not a stated-stop run | MEDIUM |
| `TimelineFeed.ts:43`, `DiagnosticsFeed.ts:52` doc and the ADR-QD-194 rethrow doc text move to the one module | Review lists 2 doc copies as part of the duplication | LOW |

| Differentiators | Value | Complexity |
|-----------------|-------|------------|
| Decide and record the self-interrupt policy for the feeds (state a stop, or state why not) instead of inheriting the asymmetry | Closes a latent "looks current, nothing running" window; a behaviour change, so only with its own test and ADR line | MEDIUM |
| Render the session's `Broke.message` in the same `<pre>` treatment as `Stopped.reason` (it is multi-line now; a `<span>` collapses it) | Same trust class and same shape as the feeds; changes `qadi-simulator-broke` DOM, so pin in `Simulator.test.tsx` | LOW |
| One shared "closed guard + restart" test helper in `test/builtFeeds.ts` | Feed tests stop restating it | LOW |

| Anti-features | Why | Instead |
|---------------|-----|---------|
| A one-call `run(effect)` that publishes inside the module | Exactly what ADR-QD-150 rejected | Callback publishes between `begin` and `fork` |
| Forcing `GatesFeed`'s cadence through publish-then-fork | INV-QD-408 says the gates feed forks first; inverting changes what a throwing listener leaves running | Share the prologue only |
| Routing the session through `onFailure` unchanged | Drops SR1's self-interrupt `Broke` | Keep an exit-based path or add an interrupt policy |
| A yield before each body, a second cancellation guard, a changed finalizer order | ADR-QD-150 alternatives; `SupersedingRun` is "unchanged, underneath" | Leave it |
| Putting the stack-trace reason into any sink record, response, log or metric | `reason` is for the host's own process (BEH-QD-519, ADR-QD-182 d4) | In-memory snapshot only |
| Merging `TimelineStatus` and `DiagnosticsStatus` into one public type | Public types; `sampled` differs | Shared engine, separate states |

**Dependencies:** none earlier. Phase 88 reads the `Stopped` states this phase keeps; Phase 91 does not touch devtools. 87 and 88 both amend devtools stop behaviour, so 87 must not change `Stopped`'s shape (88's `StoppedBox` keys on identity).

---

## Phase 88: `StoppedBox` keys itself and owns the announce-once ledger (devtools react)

### 88.1 What exists

`P/devtools/src/react/StoppedBox.tsx`: `StopLedger<S>`, `noStops`, `StopNoticeProps<S>`, `stoppedKey(ledger, status)` (`:48-50`), and the box's `useState(() => announced.current.stop !== status)` (alert fixed at mount) plus a layout effect that writes the ledger (`:130-134`). `TimelineNotice.tsx:33` and `DiagnosticsNotice.tsx:85` each compute `key={stoppedKey(announced.current, status)}` **during render from a ref**. `useStopNotice.ts` holds the per-feed `useRef<StopLedger<S>>(noStops)` and a `useMemo` of `{ status, onRestart, announced }` keyed on `[status, onRestart]`. `DevtoolsDock.tsx` calls it once per feed.

### 88.2 Spec, tests, surface

BEH-QD-509 (notice alerts once per stop, persistent status region), BEH-QD-507/519 (stops), INV-QD-313; ADR-QD-197 decision 4 (**amend this**; rejected: one ref for both ledgers, a memo keyed on `status` alone, two props interfaces, leaving the copies); `spec/behaviors/28-devtools-screens.md:3982-4003` (`useStopNotice`, `StopNoticeProps` are package-private, in neither barrel). Tests: `TimelineNotice.test.tsx` (TN14 "a notice mounted again for the stop already announced does not count it twice", `:273-296` including the rerender with a second ledger), `DiagnosticsNotice.test.tsx`, `DiagnosticsScreens.test.tsx` D7 (alert on the first screen showing a stop, silent on every revisit), `test/helpers.ts:225` and `test/surface.tst.ts` (build `noStops` / `StopNoticeProps`). All are test-scope users of `StopLedger`, `noStops`, `stoppedKey`.

### 88.3 Must stay identical

DOM: `${hooks}-notice`, `-stopped` (`role="alert"` iff announced for the first time, `data-announce`, `data-sampled` only when given), `-reason` (`<pre role="group" aria-label tabIndex=0>`, absent when empty), `-restart`; focus returns to the screen's `focusTarget` after Restart (`FEEDS` row per feed); a second distinct stop remounts the box so its alert is announced as it arrives; the ledger is per feed, owned by the dock so it outlives every screen; it records only which stop was announced, never what the reading says (AGENTS.md section 13); `StopNoticeProps`/`DiagnosticsNoticeProps`/`TimelineNoticeProps` names stay (tests import them).

### 88.4 Classification

| Table stakes | Why | Complexity |
|--------------|-----|------------|
| Callers stop calling `stoppedKey`; `StoppedBox` (an outer wrapper rendering a keyed inner box) derives the key and writes the ledger | The milestone goal; a component cannot change its own `key`, so a wrapper is the only shape | LOW-MEDIUM |
| TN14, D7 and the alert-role assertions green untouched on the phase base before and after | They are the oracle for "announced once" | LOW |
| Amend ADR-QD-197 d4 (dated), update the BEH-QD-509 / `useStopNotice` spec block; no new export, no changeset | Package-private | LOW |

| Differentiators | Value | Complexity |
|-----------------|-------|------------|
| Remove the render-phase ref read, not just move it: key from a value React can hold (e.g. the count in `useStopNotice` state) | The stated review concern is "reads a ref during render"; a wrapper in `StoppedBox` otherwise just relocates it | MEDIUM |
| `useStopNotice` and `StoppedBox` share one `StopLedger` definition site and one test for "same stop on remount counts once" | One concept in one file | LOW |
| Fold `noStops` construction into `useStopNotice` so `test/helpers.ts` stops hand-building a ledger | Fewer test seams | LOW |

| Anti-features | Why | Instead |
|---------------|-----|---------|
| One ref holding both feeds' ledgers | ADR-QD-197 rejected: a second stop of one feed re-announces the other | Ledger per feed |
| A memo keyed on `status` alone | A rebuilt model's `restart` would be lost | Keep `[status, onRestart]` |
| Adding `role="alert"` to an already-mounted element | Breaks the "fixed at mount" rule and screen-reader announce-once | New mount per new stop |
| Module-scope ledger or WeakMap shared across docks | Cross-dock leakage; `MODULE_STATE_BUDGET` | Per-hook ref |

**Dependencies:** order after 87 (same stop vocabulary). The review marks it "only if StoppedBox is being touched anyway"; the owner chose to run it. Smallest phase; cheap to land.

---

## Phase 89: one admission step for a host's audit batch (audit)

### 89.1 What exists

| Entry point | File:line | Order of checks (all pure, typed failures, never thrown) |
|-------------|-----------|----------------------------------------------------------|
| `archiveAuditTrail` | `P/audit/src/AuditArchive.ts:178-190` | `now` finite (`NowNotFinite`) -> `snapshotKeyMaterial` (`KeyMaterialNotAList`, `KeyMaterialItemRefused{index}`) -> `verifiedArchiveFacts` (rows, then sequence) |
| `planRetention` | `P/audit/src/Retention.ts:96-120` | `now` finite -> `maxAgeMs` (`MaxAgeInvalid`, `NaN`/negative; `+Infinity` valid) -> `rowsRefusal` |
| `verifiedArchiveFacts` / `verifySequenceIntegrity` | `P/audit/src/ArchiveFacts.ts:177-210` | `rowsRefusal` (`EntriesNotAList`, `EntryNotMadeByCodec{index}`) -> `SequenceIntegrityError` |
| `planPurge` | `Retention.ts` (end) | already delegates: `Result.map(planRetention(...))`, then counts against the archive. It adds no admission of its own |

`NowNotFinite { value: unknown }` is declared **twice**, in `ArchiveInputRefusal` (`ArchiveFacts.ts:139-145`) and `RetentionInputRefusal` (`Retention.ts:49-54`); the two shared rows tags are stated once as `RowsRefusalCases` (`P/audit/src/CodecMade.ts:44-49`, ADR-QD-190).

### 89.2 Public surface and error tags (all must stay)

Exports: `ArchiveInputInvalid`, `ArchiveInputRefusal` (re-exported from `AuditArchive.ts:48`), `RetentionInputInvalid`, `RetentionInputRefusal`, `SequenceIntegrityError`, `verifySequenceIntegrity`, `archiveAuditTrail`, `planRetention`, `planPurge` (`spec/overview.md:778-786`). `CodecMade.ts`, `ArchiveFacts.ts` are not in the barrel (`P/audit/src/index.ts`). Error `_tag`s: `ArchiveInputInvalid`, `RetentionInputInvalid`, `SequenceIntegrityError`. Refusal `_tag`s: `NowNotFinite` (both unions), `KeyMaterialNotAList`, `KeyMaterialItemRefused` (archive only), `MaxAgeInvalid` (retention only), `EntriesNotAList`, `EntryNotMadeByCodec` (both).

### 89.3 Spec and tests

BEH-QD-722 (`spec/behaviors/33-audit-pipeline.md:1208`: **the order is a requirement**: `now`, then `keyMaterial`, then entries, before any fact; `-0` is finite; `NaN`/`+-Infinity` refused), BEH-QD-253 (retention, `:709`), BEH-QD-721 (row envelope first); INV-QD-399, INV-QD-400; ADR-QD-190 (`RowsRefusalCases`; **"repeating the two members in each enum with a mapping" rejected, line ~418-420**), ADR-QD-110 (facts computed once; span names kept: `qadi.audit.archiveAuditTrail`, `qadi.audit.verifySequenceIntegrity`). Tests: `test/ForeignRows.test.ts` (468 lines; order cases at `:111,115,156,222,231,359`; `Match.tagsExhaustive` over both unions at `:260,269`; `deepStrictEqual` of the refusal object at `:163`), `Retention.test.ts:126,140`, `AuditArchive.test.ts:225`, `ArchiveRoundTrip.test.ts:375`. `stryker.audit.mjs` mutates all of `P/audit/src/**` except `index.ts`: a new module is under the floor from day one.

### 89.4 Must stay identical

Every refusal value and tag; each function's check **order** (including that a non-finite `now` on rows with a sequence break fails `ArchiveInputInvalid`, not `SequenceIntegrityError`); that `planRetention` reads `maxAgeMs` before the rows; `Number.isFinite` semantics (a string `now` is refused); `keyMaterial` read once, items snapshotted as three fields; that `planPurge` fails exactly like `planRetention`, before the archive is asked; the return shapes (`Result` for the plans, `Effect` for the archive); span names.

### 89.5 What changes (not Breaking, no changeset)

A private step (pure `Result`) that the entry points call first; `NowNotFinite` stated once, as a `RowsRefusalCases`-style fragment (e.g. `NowRefusalCases`) that both enums extend, so the existing public unions are **type-identical** to today's. Callers adapt the `Result` to their own error (`ArchiveInputInvalid` via `Effect.fail`, `RetentionInputInvalid` via `Result.fail`).

### 89.6 Classification

| Table stakes | Why | Complexity |
|--------------|-----|------------|
| Same `RowsRefusalCases` discipline for `now`: one fragment, each enum = fragments + own members, no mapping | ADR-QD-190's rejected alternative | LOW |
| A table test of the **check order** against the one step (each pair of simultaneous refusals: now vs key, now vs max-age, now vs rows, key vs rows, max-age vs rows), replacing the order cases scattered through `ForeignRows.test.ts` | The review's "check order tested once" | MEDIUM |
| Keep the entry-point-specific middle step (key material, max age) as a parameter or an own pre-step between `now` and rows | The orders differ in the middle slot; a flat "now, rows" step would reorder `KeyMaterial*`/`MaxAgeInvalid` against rows | MEDIUM |
| Keep the three distinct error classes and two unions; `verifiedArchiveFacts` still fails `ArchiveInputInvalid` with only the two rows tags | BEH-QD-722: "named for the archive because the refusals differ by which call refused" | LOW |

| Differentiators | Value | Complexity |
|-----------------|-------|------------|
| Admission also owns "read each host-given value once" (the `keyMaterial` snapshot discipline) so the single-read rule is stated beside the order rule | One home for the trust-boundary reading rules | MEDIUM |
| A type test pinning that both refusal unions still equal `Fragments & own members` (`P/audit/test/*.tst.ts`, counted by the `NOT_CALLABLE_PIN_BUDGET` only if negative) | Guards the "no mapping" property structurally | LOW |
| Do the `ArchiveFacts.ts` edit knowing Phase 91 folds `SequenceIntegrity.ts` into it: keep admission out of `ArchiveFacts.ts` (put it beside `CodecMade.ts` or in its own module) | Phase 91's fold then moves two names, not an admission step | LOW |

| Anti-features | Why | Instead |
|---------------|-----|---------|
| One shared public `AdmissionRefusal` / one error class for archive and retention | Breaking minor: every `Match.tagsExhaustive` handler and `deepStrictEqual` changes; reopens ADR-QD-190 | Shared private fragment only |
| Re-checking admission inside `planPurge` or `archive.holds` | `planPurge` already delegates; double work and a second order | Leave it |
| Exporting the step or `NowRefusalCases` from the barrel | New public name (gate 13, 942) | Out of the barrel (ADR-QD-099) |
| Throwing, or `Effect.die`, for a bad `now` | AGENTS.md section 4; refusals are typed results | Typed failure |
| Changing `-0`, `+Infinity` (`maxAgeMs`) or `Number.isFinite` handling | Spec'd (BEH-QD-722, retention) | Pin as is |

**Dependencies:** none earlier. Must land **before 91** (91 folds `SequenceIntegrity.ts` into `ArchiveFacts.ts`; this phase edits both). Low user value, flagged "speculative" by the review; cheap.

---

## Phase 90: the remaining per-port facts move onto the port description (core)

### 90.1 What exists

Per-port closed tables outside `PortDescription`: `PortSpans` (`P/core/src/PortName.ts:16-22`, a no-import leaf; `PortName = keyof PortSpans`), `PortTypes`/`PORTS`/`PORT_FIXTURES`/`PortFixtureData` (`P/core/src/Ports.ts:44-60,233-270`), `PortServing` interface (`P/core/src/PortServing.ts`, five hand-written members), `PORT_NAMES_BY_NAME` (`PortMetrics.ts:58`, `Record<PortName, true>`), `ScopedPort` and `completeRequest` (`PortAccess.ts:226-262`) and `LEAF_NEEDS.resourceId` (`P/core/src/LeafNeeds.ts`, **read only by `test/LeafNeeds.test.ts`**; its doc says `readScoped` "enforces the need and does not read this column"). `readScoped` (`PortAccess.ts:278`) is the one resource-id enforcement point (ADR-QD-163 D-06, BEH-QD-445).

### 90.2 Public surface (all must stay)

`PortName`, `PortSpanName`, `PortSpanOf` (`spec/overview.md:328`), `PortServing`, `PortServingOf`, `servingFor`, `PortServingFacet` (`:299-300`), `PortTypes`, `PORTS` (`:305`), `PortFixtureData`, `PortFixtures`, `PORT_FIXTURES`, `fixturePortsLayer` (`:307-308`), `mergePorts`, `decoratePorts`, `forEveryPort`; the `PORT_NAMES_BY_NAME` registry key behaviour (`portCallsTotal` etc.: metric registry key is `type:id:description`, ADR-QD-052). `LeafNeeds.ts` is out of the barrel.

### 90.3 Spec and tests

ADR-QD-163 D-06 (**the one to amend**: "the table says which leaves ask about one resource; it does not enforce it ... A test ties each row's `resourceId` to what `readScoped` does"), ADR-QD-094 (a port is described once; amend), ADR-QD-133, ADR-QD-134, ADR-QD-077, ADR-QD-099; BEH-QD-227 (a port span says what it asked, `spec/behaviors/30-port-calls.md:27`), BEH-QD-445 (missing resource id fails the same on every scoped port, `:314`); INV for leaf needs (`spec/invariants.md:4094-4112`). Tests/type pins: `LeafNeeds.test.ts` / `.tst.ts`, `PortName.tst.ts`, `Ports.test.ts` / `.tst.ts`, `PortServing.tst.ts`, `PortServe.test.ts`, `PortSpan.test.ts`, `PortAccess.tst.ts` (six counted negative pins).

### 90.4 Hard constraint found: the import graph

`madge` **counts `import type` edges** (probe reproduced it; ADR-QD-037, its revision note says so). Today `PortName.ts` is a leaf so `PortMetrics.ts` imports only it (`PortMetrics.ts:49`), while descriptions import `PortName` and `PortServing` (`PortDescription.ts:35,37`) and `PortDerivation.ts` imports `PortMetrics.ts:38`. A `PortName` or `PortServing` derived as `keyof PortTypes` or from `typeof PORTS` would give `PortMetrics -> Ports -> descriptions -> PortDerivation -> PortMetrics` and `PortServing -> Ports -> PortDescription -> PortServing`. The review's "PortName (derived, still a dependency leaf)" therefore has to mean a leaf that is derived **from a type-only fact table the descriptions satisfy**, not from the descriptions. Treat the derivation as unproven until a `pnpm circular` spike passes. (Confidence: MEDIUM; this is the phase most likely to be scoped down.)

### 90.5 Classification

| Table stakes | Why | Complexity |
|--------------|-----|------------|
| First plan is a spike: which of {span name, serving shape, fixture data type} can hang off the description and be read by `PortName`/`PortServing`/`PORT_FIXTURES` without a `madge` cycle | Otherwise the phase fails its own gate late | MEDIUM |
| Every public type above is **structurally identical** after the move (type pins in `Ports.tst.ts`, `PortName.tst.ts`, `PortServing.tst.ts`, `PortFixtures`) | Public names stay; gate 13 counts 942 | MEDIUM |
| `readScoped` routing off the `LEAF_NEEDS` row (`Never` / `Always` / `ByScope`) **keeping its behaviour**: annotate the question on the port's own span first, then `MissingResourceId` through `requireResourceId`, no extra span, port not called, no call counted (BEH-QD-445, ADR-QD-134) | The column "does real work" only if routing reads it; `ByScope` still needs the leaf's scope | MEDIUM-HIGH |
| `LeafNeeds.test.ts` loses the tying test only because the code now reads the column; keep the three-list `Disjoint`/`ListsDisjoint` compile-time guarantee | The tying test was the column's only reader | LOW |
| Amend ADR-QD-163 D-06 and ADR-QD-094 with dated notes; BEH-QD-445 / BEH-QD-227 pinned-by lines | Normative spec | LOW |
| `check-house-style.mjs` budgets that name files (`PortSpanEncode.ts` rows at `:662,:678`, type-test table `:766`) re-checked if counts move | Budgets are exact both ways | LOW |

| Differentiators | Value | Complexity |
|-----------------|-------|------------|
| Derive `PORT_NAMES_BY_NAME` and `PortFixtures` from the same fact row | Fewer places to edit for a sixth port (the review's gain) | MEDIUM |
| A test that adds a fake sixth port description and asserts the compiler names every missing row exactly once | Proves the "compiler asks for the rest" claim | MEDIUM |
| `ScopedPort` derived from the leaf-needs row instead of a hand-written union (`PortAccess.ts:226`) | Removes the last hand list in the read path | LOW-MEDIUM |

| Anti-features | Why | Instead |
|---------------|-----|---------|
| `Match`/`switch` rewrites or `Effect.fn` changes in `PortAccess` reads | `UNTRACED_BUDGET`/`SWITCH_BUDGET` are exact; port reads stay traced (ADR-QD-051) | Leave dispatch alone |
| Moving the registry key off `PortName` or changing a metric id or description | ADR-QD-052: re-declaring silently detaches reader from writer | Metrics untouched |
| Making `readScoped` decide from the table alone and drop the span annotation on a missing id | BEH-QD-445: the question is still recorded on the port's span | Keep annotate-before-validate |
| Making the table enforce and the test vanish with no replacement | The review rates this "low gain"; losing the guard is a regression | Replace, do not delete |
| Importing `Ports.ts` from `PortName.ts`/`PortMetrics.ts` | Cycle (madge, section 90.4) | Keep the leaf |

**Dependencies:** none earlier; **before 91**, which rewrites core's barrel and folds the `PortSpan*` files (90 must settle which names `Ports.ts`/`PortServing.ts` export). The review scores it speculative with low gain; a spike result of "only `readScoped`/`resourceId` is feasible" is an acceptable outcome if recorded in the amending ADR.

---

## Phase 91: named barrels in core, react and audit; fold the visibility-only files

### 91.1 The house rule already exists for narrow packages

AGENTS.md section 9 already says "A package whose interface is narrower than its modules names its exports per module ... `@qadi/devtools` is the one today", enforced by `[devtools-named-barrel]` over `DEVTOOLS_BARRELS` (`scripts/check-house-style.mjs:2161-2198`), while pure `export *` barrels are checked alphabetical by `[barrel-order]` (`:2125-2158`). So the change is: add three packages to the named-barrel list, generalise the gate, reword section 9 ("out of the barrel" means a name not listed, not a file not exported) and amend ADR-QD-099 ("a module kept out of the barrel is package-private") and ADR-QD-037. `check-api-surface.mjs` already parses both shapes (`:261-275`), so gate 13 needs no new capability. Remaining `export *` packages (http, testing, predicate-*, promise) must be told apart in the rule text: decide once whether they follow (recommended: state the criterion "narrower than its modules", not a package list).

### 91.2 Which exports move file; does any public name change? **No.**

| Fold | Files today | Public names that must survive (and from where) | Private names that must **not** become public |
|------|-------------|--------------------------------------------------|-----------------------------------------------|
| Span attributes (core) | `PortSpan.ts` (types, public), `PortSpanEncode.ts` (private machinery), `PortSpanDecode.ts` (26 lines, public `decodePortSpan`), `PortInterpreter.ts` (21 lines; type `PortInterpreter` public via `PortSpan.ts:80`) | `SpanValue`, `SpanFields`, `SpanKey`, `SpanType`, `SpanStruct`, `PortInterpreter` (type), `PortSpanAttributes`, `PortSpanAttributesLike`, `PortSpanRow`, `PortSpanRowOf`, `decodePortSpan` | `spanStruct`, `encodeSpan`, `annotateSpan`, `annotateAsked`, `attemptsStruct`, `sharedQuestionKeys`, the `portInterpreter` **schema value** |
| `PortSpanDecode` into `PortSpanEncode` | ok; **not** into `PortSpan.ts` (types, machinery, decode must stay layered: `PortSpanDecode.ts:7`) | | |
| `PortInterpreter` into `PortSpan.ts` | `PortSpan.ts` has no value imports; Encode imports it one way | | `portInterpreter` value |
| Hydration (react) | `Hydration.ts` (95 lines: `dehydrateDecisions`, `hydrateDecisions`, type re-exports, `SeededAllow`, `SeededDeny`, `isSeeded`, `permits`) and `HydrationEngine.ts` (676 lines) | the same names | `PAYLOAD_PRODUCERS`, `PAYLOAD_REASONS`, `OnlyMember`, `ReasonRaisedBy`, `dehydrateWith`, `hydrateWith`, `HydrationSeedLookup`, `InitialValues` (re-exported by `QadiProvider.tsx:117`, `QadiAtoms.ts:42`) |
| Gate registry (react) | `GateRegistry.ts` (60 lines: `makeGateRegistry`, `GateRegistryOptions`, type re-exports) and `GateWriter.ts` (364 lines) | `makeGateRegistry`, `GateRegistryOptions`, `GateInstance`, `GateKind`, `GateRegistry`, `GateRenderState` | `buildGateRegistry`, `gateWriterFor`, `reconcile`, `GateHandle`, `GateWriter`, `GateIdentity`, `Registered`, `GateWanted` |
| Archive facts (audit) | `SequenceIntegrity.ts` (26 lines, a re-export plus the **"not tamper-evident" disclaimer** cited by the README, `spec/urs.md`, `spec/models/17-purpose.md`, ADR-QD-009) and `ArchiveFacts.ts` | `SequenceIntegrityError`, `verifySequenceIntegrity`, plus `ArchiveInputInvalid`/`ArchiveInputRefusal` (today re-exported by `AuditArchive.ts:48`) | `archiveFacts`, `ArchiveFacts`, `SequenceBreak`, `verifiedArchiveFacts` |

### 91.3 Hard finding: the `Hydration.ts` fold is not acyclic

`HydrationEngine.ts:19-20` states it "imports nothing from `Hydration.ts`, `QadiAtoms.ts` or `QadiProvider.tsx`, so no cycle (counting `import type` edges, ADR-QD-037) can form through it". `Hydration.ts` imports `type QadiAtoms` (`Hydration.ts:32`) and `QadiAtoms.ts` imports `hydrateWith` from the engine (`QadiAtoms.ts:23-30`). Folding `hydrateDecisions(atoms: QadiAtoms, ...)` into the engine file creates `HydrationEngine -> QadiAtoms -> HydrationEngine`; the milestone's rule ("fold only where the madge graph proves no cycle returns") therefore **keeps `Hydration.ts`** unless `hydrateDecisions` is retyped against a structural `{ hydrate }` seam declared in the engine (a public parameter type widening: non-breaking but a deliberate d.ts change). The other folds look acyclic by import reading (`GateRegistry.ts` adds only `DeveloperSignals.ts` to `GateWriter.ts`, which imports no local file; `PortSpanDecode` -> `PortSpanEncode` is the existing direction); the only proof is `pnpm circular` after each fold. Likewise `PortSpanDecode` cannot fold into `PortSpan.ts` (review caveat, `PortSpanDecode.ts:7`).

### 91.4 Spec, gates, tests

AGENTS.md section 9 + section 16 (new-package barrel text), ADR-QD-099 and ADR-QD-037 amendments, ADR-QD-047 (the precedent); `spec/overview.md` rows naming source files (e.g. `model/Hydration.ts`, `Retention.ts`, `SequenceIntegrity.ts` at `:782`, `PortName.ts` at `:328`) must follow the moved definitions (gate 13 reads file names); `scripts/check-house-style.mjs` rules that name moved files (`PortSpanEncode.ts` at `:662,:678,:2441`; DECISION_READ and others scan `packages/*/src`); `stryker.react.mjs` lists files explicitly (HydrationEvent, RegistryLease, ...), core/audit use globs minus `index.ts`. Public-surface oracles: `scripts/check-api-surface.mjs` (942), `scripts/check-package-install.mjs` (packed artifact consumer), devtools-style `test/surface.test.ts` (**does not exist for core, react, audit**). Test churn: ~8 react tests import `../src/Hydration.ts`, many core tests import `../src/PortSpanEncode.ts` / `PortSpanDecode.ts`.

### 91.5 Classification

| Table stakes | Why | Complexity |
|--------------|-----|------------|
| **Barrels first, folds second** inside the phase | With `export *`, folding `GateRegistry.ts` into `GateWriter.ts` (or `PortInterpreter` into `PortSpan.ts`) would instantly make `buildGateRegistry`/`reconcile`/`portInterpreter` public | MEDIUM |
| Prove "no public name changes": snapshot the export names and kinds of each root `index` (from `lib/*.d.ts` or the api-surface scan) at the phase base and diff after, 942 constant | Highest-volume mechanical edit in the milestone (core's barrel lists ~50 modules) | MEDIUM |
| Generalise `[devtools-named-barrel]` to the named-barrel list and keep `[barrel-order]` for the rest; order named groups by module path | The rule is a gate, not a convention | LOW-MEDIUM |
| Re-export types referenced by public signatures (TS2883): list them in the barrel (AGENTS.md section 9 last sentence) | `.d.ts` emission fails otherwise | MEDIUM |
| `pnpm circular` after every fold; leave `Hydration.ts` unless proven | The milestone's own condition | LOW |
| Move the `SequenceIntegrity.ts` disclaimer text into `ArchiveFacts.ts` (or the barrel) and update the four documents that cite the file | They cite "this file for the disclaimers" | LOW |
| Update `check-house-style.mjs`, `stryker.react.mjs`, `spec/overview.md` file columns, AGENTS.md, ADR amendments in the same change; no changeset (no export change) | Gates read paths | MEDIUM |

| Differentiators | Value | Complexity |
|-----------------|-------|------------|
| A `surface.test.ts` per converted package listing root values like devtools' (`test/surface.test.ts:20-`) | Makes the barrel the pinned interface, so a named barrel cannot silently drop a name | MEDIUM |
| Delete the "re-export by name for TS2883" shim blocks in `Hydration.ts:38-44` and `AuditArchive.ts:48` by naming the exports in the barrel straight from their defining modules | Removes the pass-through lines the review calls shallow | LOW |
| Dismantle `PortSpanDecode.ts` and `PortInterpreter.ts` (both pass-through) after Phase 90 settles `PortSpan` | The review's "delete ~6 files" | LOW |
| Retype `hydrateDecisions` against a structural seam so `Hydration.ts` can fold too | Only if the owner wants the file gone; changes a public param type | MEDIUM-HIGH |

| Anti-features | Why | Instead |
|---------------|-----|---------|
| Any public name added or removed, or a renamed export | The point is "no behaviour change" | Barrel names equal today's set |
| Adding `./*` or new subpath exports to make internals reachable | ADR-QD-099: the exports map is a closed list (gate 13 `ENTRY`, gate 14 check 3b) | Keep the closed list |
| Folding any ADR-QD-037 cycle-breaker without a green `pnpm circular` | Cycle returns; `HydrationEngine.ts:19` states the invariant | Keep the file, record why |
| Namespace imports of `@qadi/*` internals or `import * as Core` | AGENTS.md section 1 | Named imports from the root |
| Converting packages the owner did not choose (http, testing, predicate-*) in passing | Scope; those barrels expose whole modules on purpose | Rule text by criterion, conversion per package later |

**Dependencies:** last by design. Needs 89 (ArchiveFacts settled), 90 (core Port exports settled), 86 (react provider settled).

---

## Feature dependencies (cross-phase)

```
85 (devtools model + react panel)      independent
86 (react provider)                    -> 91 (react folds import QadiProvider's neighbours)
87 (devtools model stop vocabulary)    -> 88 (StoppedBox keys on the Stopped values 87 keeps)
89 (audit ArchiveFacts/Retention)      -> 91 (SequenceIntegrity fold into ArchiveFacts)
90 (core Port* exports)                -> 91 (core barrel + PortSpan* folds)
ADR-QD-099 amendment (91) ----------- depends on 37/47/99 text; AGENTS.md section 9 rewritten once, in 91
```

Gates touched by more than one phase (edit once, keep both directions exact): `scripts/check-house-style.mjs` (91 names files; 90 may move budget rows), `spec/overview.md` (85 none, 89 none, 90/91 file columns), `spec/README.md` Document history + CCR rows (every phase), `spec/behaviors/28-devtools-screens.md` change-history cell (85, 87, 88).

## MVP recommendation (what the roadmap should lock)

1. Phase 85, 86, 88, 89: cheap, no public change, oracle exists (characterisation files, LT ids, TN14/D7, ForeignRows order tests).
2. Phase 87: only after a characterisation commit of the self-interrupt cases; take the user-visible `Broke` text change as an explicit, test-pinned patch.
3. Phase 90: open with the `madge` spike; ship whatever subset is provably acyclic and record the rest in the amending ADR.
4. Phase 91 last, barrels before folds, `Hydration.ts` kept unless the seam option is chosen.

Defer: unifying the two audit error types; a "nothing hydrated" state; any self-interrupt stop for feeds unless chosen deliberately in 87; converting http/testing/predicate-* barrels.

## Sources

- `AGENTS.md` sections 1-9, 13, 15, 16; `.planning/PROJECT.md` (v1.11 block); `.planning/phases/_SHARED-CONTEXT.md`; review `architecture-review-20261125.html` (scratchpad, read as text).
- Source read: `P/devtools/src/react/{QuestionsPanel,DevtoolsDock,StoppedBox,TimelineNotice,DiagnosticsNotice,useStopNotice,useStoreSnapshot,Simulator}.tsx|ts`, `P/devtools/src/model/{Hydration,DockModel,DiagnosticsFeed,TimelineFeed,GatesFeed,SimulationSession,SupersedingRun}.ts`, `P/react/src/{QadiProvider.tsx,RegistryLease,Hydration,HydrationEngine,GateRegistry,GateWriter}.ts`, `P/audit/src/{ArchiveFacts,AuditArchive,Retention,CodecMade,SequenceIntegrity,index}.ts`, `P/core/src/{PortName,Ports,PortServing,PortAccess,LeafNeeds,PortSpan,PortSpanEncode,PortSpanDecode,PortInterpreter,ThrownMessage}.ts`.
- Spec read: ADR-QD-037, 047, 094, 099, 150, 163, 168, 182, 185, 190, 195, 197; BEH-QD-218, 231, 253, 461, 507, 519, 583, 615, 699, 700, 722, 735, 746-750; INV-QD-313, 389, 390, 408-411.
- Runtime facts (HIGH, reproduced with the installed `effect`): `String(Cause)` vs `Cause.pretty` renderings; `madge --circular` counts `import type` edges; `node scripts/check-api-surface.mjs` reports 942 exports across 9 packages.
