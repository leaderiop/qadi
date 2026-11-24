# Feature Research: v1.10 Arch Wave 15 (Phases 81-84, ARCH-128..131)

**Domain:** internal architecture deepening of an Effect v4 authorization monorepo (`@qadi/devtools`, `@qadi/react`). No new product features: "features" here are observable behaviours that must hold after each phase.
**Researched:** 2026-11-24, on `arch-wave-15` (HEAD `911aa37f`, source identical to `902d2128`).
**Confidence:** HIGH for current behaviour (every claim read in source, the load-bearing ones also reproduced by a throwaway vitest run, deleted afterwards; `git status` shows no leftover file and no source edit). MEDIUM for the shape of the fixes (design is the planner's; constraints below are findings, not decisions).

Conventions: `file:line` is relative to the repo root; `P/…` = `packages/…`. "Spec" = ADR/BEH/INV ids that govern the behaviour. Next free ids, from the highest seen (verify and reserve with `scripts/next-id.mjs` before writing any): ADR-QD-194, CCR-QD-473, BEH-QD-740, INV-QD-407.

---

## Phase 81: the dock model's `configure` applies every input whatever a listener throws (devtools, LIVE DEFECT)

### 81.1 Every store and listener a host can subscribe to

The dock model has ten stores (BEH-QD-700, `spec/behaviors/28-devtools-screens.md:1087`; interface `P/devtools/src/model/DockModel.ts:216-247`, returned at `:433-450`): `timeline`, `dock`, `explorer`, `roles`, `simulation`, `diagnostics`, `timelineStatus`, `questions`, `services`, `lens`. `sightings` is a thunk, not a store. Each is built on `makeExternalStore` (`P/devtools/src/model/ExternalStore.ts:69-103`), whose `notify` calls every listener and rethrows what they threw (nothing / the value itself / one `AggregateError("More than one of the store's listeners threw.")`, `ExternalStore.ts:63-83`, ADR-QD-177, BEH-QD-656). `throwCollected` is module-private (`ExternalStore.ts:63`, not exported).

Other host code reached from `configure`, all already guarded inside `GatesFeed` (`P/devtools/src/model/GatesFeed.ts:179-253`): the gate registry's `instances`/`subscribe`, the `questions` thunk, and the `Source` read (a fiber, not a listener). Nothing else a host owns is called synchronously.

### 81.2 What `configure` does and what each step publishes (`DockModel.ts:403-431`)

| # | Line | Step | Publishes to (listener sets, in order) |
|---|------|------|-------------------------------------------|
| 0 | 405 | `completeDockInputs` | nothing. A capacity the timeline refuses throws here before anything moves (INV-QD-401, BEH-QD-728, M55 `DockModel.test.ts:455`). Must stay first and outside any collection. |
| 1 | 409 | `held = wanted` | nothing |
| 2 | 414 | `timelineFeed.configure` (`TimelineFeed.ts:195-209`): `resize` in a `try`, `readSource` in its `finally` | `timeline` store publish: the dock's own listener (`DockModel.ts:351-356`, subscribed first) runs `spread()` = `explorer.setSightings` (`ExplorerSession.ts:253-257`), `simulation.setSightings` (`SimulationSession.ts:501-506`), `dock.setTimeline` (`DockSession.ts:98-106`) in that order, then the host's `timeline` listeners. `timelineStatus` publishes only if it was `Stopped` (`TimelineFeed.ts:175`, `READING` is one constant). |
| 3 | 416-419 | in `finally`: if the catalogue moved, `spread()` again, then `roles.setList` (`HeldChoice.ts:158-162`) | `explorer`, `simulation`, `dock`, then `roles` |
| 4 | 421 | `simulation.setPorts` (`SimulationSession.ts:522-528`) | `simulation` |
| 5 | 425 | `gatesFeed.configure` (`GatesFeed.ts:280-297`) | the gates store, whose derived `questions` store refreshes (`DockModel.ts:375`, parents `[gatesFeed, shownReading]`) then `questions` listeners |
| 6 | 426 | `diagnosticsFeed.configure` (`DiagnosticsFeed.ts:213-221`; `start`/`off`) | the feed view, then `shownReading.refresh` (`DockModel.ts:360`) so `diagnostics`, then its children `questions` and `services` listeners |
| 7 | 429 | `shownReading.refresh()` | same chain as 6, for a supplied-`reading` change (not a parent) |

`lens` is never published by `configure` (INV-QD-390, ConfigureRule CR16-CR20/CR22). First-configure counts a reader subscribed to all ten stores hears (BEH-QD-735 `spec/behaviors/28-devtools-screens.md:3202`, pinned by CR22 `P/devtools/test/model/ConfigureRule.test.ts:895`): timeline 2, dock 2, explorer 3, simulation 3, roles 0, diagnostics 1, timelineStatus 0, questions 2, services 1, lens 0.

Also reachable outside `configure`: the same `spread()` runs from the timeline listener on **every record** (`DockModel.ts:351-356`), via `runSource` -> `timeline.accept`. The dock reaches `configure` from React through `useConfigured`'s layout effect (`P/devtools/src/react/useConfigured.ts:27-29`), so a throw from a later `configure` surfaces in a layout effect (error boundary), and `DevtoolsDock` hands a fresh rest record each render (`DevtoolsDock.tsx:86`).

### 81.3 Current behaviour, confirmed by throwaway run (matrix: one throwing listener per store, `configure({capacity:5, catalogue(roles:[editor]), diagnostics:{}, questions, reading})` on a model that already held one record; then the identical `configure` again)

| Throwing listener on | Observed after 1st configure | After identical 2nd configure |
|----------------------|------------------------------|-------------------------------|
| `explorer` | threw; **roles `[]`**, **simulation sightings !== explorer sightings**, **dock still shows 1 stale row** (timeline emptied to 0), diagnostics `Off`; listener called **twice** (once per spread) | roles still `[]`, sightings still differ, dock still stale; only feed-side steps heal (diag `Live`) because the feeds compare their own held inputs |
| `simulation` | threw; roles `[]`, dock stale (1 row), diagnostics `Off` | unchanged except diag |
| `roles` | threw; diagnostics `Off` (steps 5-7 skipped) | diag `Live` |
| `questions` | threw; diagnostics `Off` | threw again |
| `diagnostics` | threw; status `Starting` and stays (documented window, ADR-QD-177 decision 5, F31 `DiagnosticsFeed.test.ts:640`: no poll forked) | same |
| `timeline`, `dock`, `services`, `timelineStatus` | everything applied (the throw is collected inside the store, and the redundant second `spread` masks the `dock` case) | same |
| two listeners throwing (`timeline` and `roles`, distinct errors) | thrown value is the **roles** error, a plain `Error`: the timeline listener's error is lost, no `AggregateError` | same |
| **record path** (no `configure`): `explorer` listener always throws, two records accepted | timeline holds 2 entries, **dock rows 0, simulation sightings 0**: `spread` aborts at `explorer`, so `simulation` and `dock` never see any record | n/a |

Root causes: (a) only step 2 is inside the `try`; the `finally` (steps 3-7, `DockModel.ts:415-430`) is a plain sequence, so any throw skips the rest and a throw in the `finally` replaces the `try`'s throw (JS semantics); (b) `spread` (`:342-347`) is three plain calls; (c) an identical configure cannot heal: the catalogue compare is against `before = held` which was already advanced (`:406-409`), and INV-QD-403/BEH-QD-732 require a no-move configure to reach no host code.

**Double `spread`** (confirmed): `catalogueOf` builds fresh sighting objects on each call (`P/devtools/src/model/Catalogue.ts:155-189`, `unseen.push({...})`), so `sameElements` (`ExternalStore.ts:112`) never treats two calls as equal and explorer/simulation publish twice. A capacity change publishes a new `Timeline` (`TimelineStore.ts` `resize`), which fires the listener's `spread`; with a catalogue change too, the `finally`'s `spread` (`:416-417`) repeats it. Measured: explorer heard 2 on one capacity+catalogue configure; CR22's 3/3 = resize spread + `finally` spread + the source's first record. Expect 2/2 after the fix (not yet run: LOW until it is).

### 81.4 Required behaviour after

**Table stakes (testable)**

| ID | Requirement | Spec it extends |
|----|-------------|-----------------|
| 81-R1 | Past the capacity check, `configure` applies steps 2-7 whatever any listener throws; a throw in step *n* never skips step *n+1*. | ADR-QD-191 decision 11 (amend: today only step 2 is guarded), ADR-QD-177, BEH-QD-656 |
| 81-R2 | It rethrows once, at the end: nothing when none threw, the thrown value itself when exactly one did (`undefined`/`null` included), one `AggregateError` of every thrown value in order when more than one did. A second throw never replaces the first. | ADR-QD-177 decisions 2-3 (an `AggregateError` a step throws stays one value, never flattened) |
| 81-R3 | `spread` is total: `explorer`, `simulation` and `dock` are each updated whatever another's listener throws, on both paths (configure and the record-driven timeline listener). | BEH-QD-465 (`:915`), ADR-QD-047 |
| 81-R4 | The first configure leaves the model complete (roles, one rail shared by explorer and simulation, dock on the shown timeline, ports, gates read, diagnostics started, shown reading merged); an identical second configure stays a no-op reaching no host code. | INV-QD-403, BEH-QD-732 |
| 81-R5 | One `spread` per shown-timeline-or-catalogue change: a capacity-and-catalogue change notifies explorer and simulation once per distinct change. | BEH-QD-735 counts (`:3202`, "2, 2, 3, 3, 0, 1, 0, 2, 1 and 0") must be restated with CR22 |
| 81-R6 | Unchanged: a refused capacity throws first with nothing moved (M55); the step order timeline -> catalogue/roles -> ports -> gates -> diagnostics -> refresh (BEH-QD-735, "fixed order" test `DockModel.characterisation.test.ts:327`); `lens` never published; M56 (`run.thrown === boom`, roles `["editor"]`, diagnostics not `Off`) and the characterisation "a throwing questions listener lets services and diagnostics move, then escapes" (`:296`) pass unedited. | ADR-QD-191, INV-QD-401, INV-QD-390 |

**Differentiators (cheap, in scope)**: export the collecting primitive from `ExternalStore.ts` (package-private, ADR-QD-099) so `notify`, the derived store's release loop (`ExternalStore.ts:203-216`) and `configure` share one `throwCollected`; a matrix test over all ten stores (like ConfigureRule's sweep) so a new store or step is a failing row, not a new bug.

**Anti-features**
| Anti-feature | Why not | Instead |
|--------------|---------|---------|
| Catch and log/swallow a listener throw | ADR-QD-177 rejected it; devtools has no logger (AGENTS.md §6) | rethrow collected |
| Flatten nested `AggregateError`s | ADR-QD-177 decision 3 | keep one value per step |
| Decide by reading the error | ADR-QD-191 "Alternatives" | decide by position/step |
| Roll back inputs on a throw | a throw is a listener fault, not a refused input | apply everything, rethrow |
| Close the documented `Starting`/`Reading` window (no poll forked when a listener throws on `Starting`) | out of scope in ADR-QD-177 decision 5; widening it changes the feeds | leave, note in ADR |
| Reorder steps or touch `lens` | BEH-QD-735 order, INV-QD-390 | keep |

### 81.5 Regression test to open with (must be RED on `911aa37f`)

New in `P/devtools/test/model/DockModel.test.ts` after M56 (`:481`), titled e.g. `M57`: for each of `explorer`, `simulation`, `roles`, `questions` a listener that throws, one `configure` with capacity, catalogue (with a role), ports, gates, `diagnostics: {}`; assert roles list, `simulation.getSnapshot().sightings === explorer.getSnapshot().sightings`, `dock.getSnapshot().rows` empty after the resize, diagnostics not `Off`, thrown value `=== boom`. Companions: two distinct throwing listeners -> `AggregateError` with both errors (RED: only the last escapes); the record path (throwing `explorer` listener, accept two records, `dock.getSnapshot().rows.length === 2`; RED: 0); capacity+catalogue notifies explorer once (RED: 2). Evidence these fail: throwaway matrix above.

### 81.6 Sites

Source: `DockModel.ts:342-347, 351-356, 403-431` (and doc comment `:17-20`); `ExternalStore.ts:63` (export), `:203-216`. Tests that move: `DockModel.test.ts:454-510` (M55/M56), `ConfigureRule.test.ts:895-933` (CR22 counts), `DockModel.characterisation.test.ts:274-355`. Spec to amend with the code (AGENTS.md §11): ADR-QD-191 decision 11 (+ its "What enforces it" `:M56`), ADR-QD-177 consequences, BEH-QD-465, BEH-QD-656, BEH-QD-728, BEH-QD-735 (counts), INV-QD-401/403 wording, `spec/README.md` CCR row, upgrade guide (`apps/website/src/content/docs/docs/reference/upgrading.md`, a "0.13" section) and a changeset (`.changeset/`, `@qadi/devtools`; a patch unless the thrown-value shape is deemed Breaking). Mutation floor: `DockModel.ts` score 1 (ADR-QD-191 "mutation floor": 70/70), `stryker.devtools.mjs` mutates `src/model/**`; a drop is answered with a test.

---

## Phase 82: `QadiProvider`'s registry has one owner for its lifetime (react, LIVE DEFECT)

### 82.1 How the registry lives today (`P/react/src/QadiProvider.tsx`)

- Built lazily in render: `registryRef.current ??= AtomRegistry.make({initialValues:[[atoms.subject, subject], ...initialValues]})` (`:217-223`); the subject is seeded here on purpose (BEH-QD-067 "seeded when the registry is constructed", `spec/behaviors/09-react.md:246`).
- Disposed by an effect cleanup: `setTimeout(() => { registry.dispose(); registryRef.current = undefined }, 0)` (`:285-299`); the effect's re-run clears a pending timer (`:289-292`). Deps `[registry]`.
- The subject effect writes the prop into the registry (`:257-261`, deps `[registry, atoms, subject]`); `registry.get` there is the throw site.
- `AtomRegistry.dispose()` = `disposed = true; reset()` (`node_modules/effect/dist/reactivity/AtomRegistry.js:438-441`); after it **any** atom access, even a `keepAlive` one, throws `Cannot access Atom …: registry is disposed` (`createNode`, `:329-331`). `reset()` also drops every node's finalizers, so never disposing would leak what `atoms.runtime` holds until GC (MEDIUM: `reset` read, not run).
- Everything that reaches the registry reaches it through the context value fixed at last render: `@effect/atom-react` `useAtomValue` via `RegistryContext` (`QadiProvider.tsx:313`; `useSubject` `hooks.ts:23`, `useGate` `useGate.ts:214`), `useInvalidate` (`hooks.ts:155-160`: `registry.mount` in an effect, `registry.set` in the callback), `useDevtoolsFeed` (`P/react/src/DevtoolsFeed.ts:126-128`, `runtimeLayer(atoms, registry)` held by a consumer's scope).

### 82.2 Every way the registry is disposed and reached again (throwaway run, 6 scenarios)

| Scenario | Today | Evidence |
|----------|-------|----------|
| **Unmount** | cleanup -> dispose after one macrotask; a later `registry.get` throws "registry is disposed". By design. | S6; test `edges.test.tsx:257` ("disposes its registry when unmounted") is **vacuous**: it asserts only that body text is empty, which is true after any unmount |
| **StrictMode double effect** | cleanup sets the timer, the re-run clears it; one registry observed by a consumer | S3 (1 registry); pins `edges.test.tsx:243`, `GateRegistration.characterisation.test.tsx:283`, `QadiProvider.sweep.test.tsx` P3 |
| **Activity hide < one macrotask**, shown | timer cleared by the effect re-run; fine | S1b; P4 (`QadiProvider.sweep.test.tsx:136`) only tests this and re-renders the provider |
| **Activity hide > one macrotask, provider re-rendered on reveal** (new element) | registry was disposed and `registryRef` cleared, so render builds a **second registry**; consumers get the new context; every cached decision is lost and re-evaluated; seeds re-applied from `initialValues` | S2 (2 distinct registries, `allowed` shown) |
| **Activity hide > one macrotask, stable children, provider not re-rendered** (parent state toggles Activity mode, provider element memoised) | on reveal React re-runs the effects with the **disposed** registry: `registry.get(atoms.subject)` at `QadiProvider.tsx:258` throws, and the consumer's `useAtomValue` throws too (two messages: one for a non-`keepAlive` decision atom, one for the `keepAlive` subject). With no error boundary React unmounts the root. | **S1 DEFECT** |
| **Subject change while visible** | effect `:257-261` writes it (BEH-QD-067, one-frame window accepted, BEH-QD-516) | existing `QadiProvider.subject.test.tsx` SUBJ1-SUBJ3 |
| **Subject change while hidden > a macrotask** (provider re-renders hidden) | render rebuilds the registry seeded with the new subject; on reveal `u2` is read | S4 |
| **`atoms` prop change** | registry is **not** rebuilt (1 registry observed); `AtomsReplaced` signalled; the old atom set's decisions stay cached, the new `initialValues` are not seeded. Documented contract (header `:225-236`, `DeveloperSignals.ts:209`, BEH-QD-067) | S5 |
| **`gates`/`instrument` change** | only the memoised `writer` changes (`:203-206`); registry untouched | read |

Existing tests put the Activity **below** the provider (`QadiProvider.subject.test.tsx:26` SUBJ1, `QadiProvider.seed.test.tsx` SD3) or re-render the provider (P4), so none exercises the defect. The error only needs `Activity` above a stable provider element (parent re-render still creates equal elements, so real apps hit it when only the Activity-owning parent's *state* changes).

### 82.3 Required behaviour after

**Table stakes**

| ID | Requirement | Spec |
|----|-------------|------|
| 82-R1 | A provider hidden in `<Activity>` longer than a macrotask and shown again with stable children throws nothing from the provider or any consumer; gates settle to their decisions, `useSubject()` reads the prop, `useInvalidate()` still works. | BEH-QD-067, BEH-QD-516 |
| 82-R2 | One owner for the registry's lifetime: no consumer ever holds a registry another path has disposed. Disposal happens once, only when the provider is really gone (unmount), never because an effect cycled. | BEH-QD-067 "MUST NOT dispose it across React's development-mode double mount" (`09-react.md:334`) restated and extended to Activity |
| 82-R3 | Unmount still releases the registry (a probe's registry reads "disposed" after unmount plus a turn) and still logs/throws nothing with a consumer's run alive. | `edges.test.tsx:257` (strengthen), `DevtoolsFeed.test.tsx:277` |
| 82-R4 | Unchanged: subject seeded at construction so the first render has it; SSR `renderToString`; `AtomsReplaced` keeps the registry; no `scheduleTask`/`defaultIdleTTL` (header `:10-22`, ADR-QD-014); sweep tests P1-P5; hydration seeds still reach the first render. | BEH-QD-067, BEH-QD-152, ADR-QD-148/149 |

**Constraint found (not a decision)**: React gives an effect cleanup no way to tell "hidden" from "gone", and on reveal children's effects run before the provider's, so a "rebuild on reveal" owner cannot beat a stable consumer to the swap (the consumer would subscribe to the disposed registry first). Candidates for the plan, all needing a spike: (a) dispose only when a liveness check says the provider is gone; (b) reset instead of dispose on hide (`registry.reset` is public, `AtomRegistry.d.ts:76`, keeps the registry usable but drops seeded nodes, so the subject effect and seeds must re-apply); (c) an owner that rebuilds and forces a provider re-render before children read it. `@qadi/devtools`' `useScoped` (`P/devtools/src/react/useScoped.ts`) solves the same problem by unmounting its children on hide (`setValue(undefined)`), which is **not acceptable here**: it would destroy children's React state and break SSR/first-render subject.

**Anti-features**
| Anti-feature | Why not | Instead |
|--------------|---------|---------|
| Unmount children while hidden (the `useScoped` pattern) | Activity exists to preserve state; breaks the first-render subject (BEH-QD-067) | keep children mounted |
| Rebuild the registry when the `atoms` prop changes | contradicts the documented `AtomsReplaced` contract and loses caches | keep as is |
| React state or a module `let` holding decisions or the registry | AGENTS.md §13 no React state for decisions; `MODULE_STATE_BUDGET` (§6) permits one `let` only in `DeveloperSignals.ts` | ref/WeakMap `const` |
| `scheduleTask`/`defaultIdleTTL` | dropped a required render (header) | untouched |
| New dependency | §13 | none |

### 82.4 Regression test to open with (RED on `911aa37f`)

New `P/react/test/QadiProvider.lifetime.test.tsx` (or beside P4): a parent holding `mode` state and a `useMemo`'d `<QadiProvider><Can/></QadiProvider>` under `<Activity mode>`, an error boundary capturing messages; render, settle, hide, wait a real macrotask (`turn()` as in `QadiProvider.subject.test.tsx:23`, 50 ms), show, settle; assert no captured message, `allowed` rendered, and a `useSubject` probe reads the prop. Observed failure: two errors, the second from the `keepAlive` subject atom, body text `caught`. Companions: a hidden-then-shown `useInvalidate` call does not throw; a probe's registry is disposed after real unmount (the strengthened `edges.test.tsx:257`); StrictMode still yields one registry (S3); the hide-<-one-tick control (S1b) stays green.

### 82.5 Sites

Source: `QadiProvider.tsx:209-306`; consumers `hooks.ts:23, 155-160`, `useGate.ts:214`, `DevtoolsFeed.ts:126-128`. Tests: `QadiProvider.sweep.test.tsx:136` (P4), `QadiProvider.subject.test.tsx`, `QadiProvider.seed.test.tsx` (SD3/SD4), `QadiProvider.signals.test.tsx` (AtomsReplaced), `edges.test.tsx:243, 257`, `DevtoolsFeed.test.tsx:277`, `GateRegistration.characterisation.test.tsx:283`. Spec: BEH-QD-067 (add a lifetime requirement + Activity), BEH-QD-516, a new ADR (registry owner), `spec/README.md` CCR row, changeset (`@qadi/react` patch), upgrade guide only if an observable contract changes. `QadiProvider.tsx` is not in `stryker.react.mjs`'s `mutate` list (`DecisionOutcome`, `QuestionBook`, `HydrationEvent`, `SweepScheduler`, …): an extracted owner module should be added.

---

## Phase 83: the diagnostics feed holds its reading as a value folded by a pure per-field rule (devtools; possibly Breaking)

### 83.1 Current behaviour

Status and reading transitions of `makeDiagnosticsFeed` (`P/devtools/src/model/DiagnosticsFeed.ts:163-228`), publishing one `{status, reading}` value (`show`, `:177-182`, no-op when both identities are unchanged):

| Trigger | Status / reading published | Line |
|---------|---------------------------|------|
| build | `Off`, `noDiagnostics` (the constant `diagnosticsOff`) | `:172` |
| `configure(undefined)` when already absent | nothing (`sameFieldsOrAbsent`) | `:217` |
| `configure(options)` first or a moved field (layer, collector, interval) | `Starting` over the **store's last reading** (`noDiagnostics` after build/`off`, the previous reading after a restart or stop) | `:184-204`, `:188` |
| first accepted sample of the current run | `Live` + new reading (marked in the wrapper because `accept` returns early for an unchanged reading) | `:192-199` |
| later sample, every field `Equal.equals` | nothing | `DiagnosticsStore.ts:168-187` |
| later sample, a field moved | same `Live`, reading with only the moved fields new references | `:171-176` |
| run dies on a defect | `Stopped{reason: causeMessage, sampled}` over the kept reading; stated even if a listener throws (F32) | `:201-203` |
| `restart()` | `Starting` over the kept reading; `sampled` unchanged; ignored when no options held or the scope is closed | `:223-225` |
| `configure(undefined)` after on | `off()`: run stopped, **new store**, `sampled = false`, `diagnosticsOff` | `:206-211` |
| layer fails to build | `WiringRead.Failed` inside a `Live` feed | `DiagnosticsStore.ts:268-281` |
| interruption (restart, replaced field, scope close) | never `Stopped` | `:9-13` |

Pinned by F1-F32 (`P/devtools/test/model/DiagnosticsFeed.test.ts:98-690`, including F6/F7 `Starting` then `Live`, F10/F11, F19 identity, F23 `sampled` after `Off`, F28/F29 re-entrancy, F30-F32 listener throws).

Shape of the three-part machinery to collapse:
- `DiagnosticsStore` (`DiagnosticsStore.ts:146-189`): an `ExternalStore` plus `accept`'s five-field `keep` fold (`Equal.equals`, `:161`) and a five-way `===` chain (`:177-183`). Its `subscribe` has **no production reader** since ADR-QD-173: the feed polls `store.getSnapshot()` after `accept` (`DiagnosticsFeed.ts:178`) and only `DiagnosticsStore.test.ts` subscribes.
- `marking` (`DiagnosticsFeed.ts:189-200`): a `DiagnosticsStore` literal restating `subscribe` and `getSnapshot` and overriding `accept`, so `runDiagnostics(store: DiagnosticsStore, …)` (`DiagnosticsStore.ts:238-260`) can call one member. Compare `runSource(store: Pick<TimelineStore,"accept">, …)` (`TimelineStore.ts`, used by `TimelineFeed.ts:176-182`).
- `off()` replaces the store (`:208`) only to reset the reading.
- The `Diagnostics` field list is written four times: the type (`:76-88`), `noDiagnostics` (`:91-97`), `mergeReading` (`:139-143`), `accept` (`:170-183`), plus the sample's `{...reading, questions: undefined}` (`:252`).

### 83.2 Who reads `Diagnostics.questions` (public field, `DiagnosticsStore.ts:87`)

- **Nobody reads it in source.** The poll never writes it (always `undefined`, `:252`; asserted by `DiagnosticsStore.test.ts:251` and `DiagnosticsFeed.test.ts:118`). The only code that produces a defined value is `mergeReading` copying a *supplied* `DiagnosticsReading.questions` (`:143`).
- The dock join does **not** read it: `DockModel.ts:378` reads `held.reading?.questions`, the host's supplied reading, not the shown `Diagnostics`. `DevtoolsDock.tsx:115, 194, 271` reads only `shown.hydration`; `services` reads wiring/activity/portCalls (`DockModel.ts:392-399`).
- Public surface that carries it: type `Diagnostics` (`P/devtools/src/index.ts:36-40`), `DiagnosticsSnapshot.reading` returned by `useDiagnostics` (`react/index.ts:20`), `mergeReading` (`index.ts:34`), `DiagnosticsReading.questions` (the supplied-input half, a live input). `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics`, `DiagnosticsStore` are already **not exported** (`surface.tst.ts:240-265`, BEH-QD-640), so the store's removal is not Breaking; a removal of `Diagnostics.questions` is.
- No example, README or docs page reads it. Docs that read `reading`: `apps/website/src/content/docs/docs/packages/devtools.md:195-210` (`reading.hydration`), `…/reference/upgrading.md:520-560` (`reading.hydration`) and `:921` ("`DiagnosticsReading.questions` is unchanged"); the packed consumer `scripts/check-package-install.mjs:739-749` reads `.reading.hydration` and `.status._tag` (compiled by gate 14).
- Spec that states "kept, carried only by a supplied reading": ADR-QD-169 decision 10 (`spec/decisions/169-…md:68`), BEH-QD-617 (`28-devtools-screens.md:2447`), BEH-QD-323's listing (`:643-`), `spec/overview.md:916-919`.

### 83.3 Required behaviour after

**Table stakes**

| ID | Requirement | Spec |
|----|-------------|------|
| 83-R1 | The feed holds `reading` as a plain value updated by one pure per-field keep-if-equal function (previous reference kept per field when `Equal.equals`; the whole value kept when no field moved); `off` sets `noDiagnostics`. | amend ADR-QD-173 (`:49-53`), BEH-QD-323, BEH-QD-637 |
| 83-R2 | `DiagnosticsStore.ts`'s `DiagnosticsStore`/`makeDiagnosticsStore`/`accept`/`subscribe` are gone; `runDiagnostics` takes an `accept` sink as `runSource` does (`Pick<…,"accept">`-style), keeping its span `qadi.devtools.runDiagnostics` (`DiagnosticsStore.test.ts:171`). | BEH-QD-640 |
| 83-R3 | Every transition in the table above is unchanged: `Starting` over the kept reading, `Live` on the first accepted sample even when nothing changed, one publish per transition, stale-run samples dropped, `sampled` rules, F1-F32 pass unedited. | BEH-QD-506/507/637, INV-QD-373 |
| 83-R4 | `Diagnostics`' field list is stated once (type-checked so a new field is a compile error, as INV-QD-404 does for inputs); `mergeReading` and the fold share it. | INV-QD-404, INV-QD-314 |
| 83-R5 | `Diagnostics.questions` is resolved, one way: either removed (the poll's reading has four fields; the join keeps reading `held.reading?.questions`; `mergeReading` stops carrying questions; **Breaking** for `@qadi/devtools` readers of `reading.questions` / `mergeReading(...).questions`, upgrade guide + changeset) or kept and documented as supplied-only. Owner's standing instruction prefers the complete design: removal; the planner must still record the choice and amend ADR-QD-169 decision 10. | ADR-QD-169 d10, BEH-QD-617, overview rows 916-919 |

**Differentiators**: derive the fold and `mergeReading` from one field table; a type test that the poll's reading has no `questions` (positive twin required by `[not-callable-control]`).

**Anti-features**
| Anti-feature | Why not | Instead |
|--------------|---------|---------|
| Re-export `runDiagnostics`/`makeDiagnosticsStore` | ADR-QD-173 d2, BEH-QD-640 | stay package-private |
| Let the poll sample `questions` | ADR-QD-169: a thunk throw would stop every tab | gates feed owns it |
| Keep the store "for the tests" | its only subscriber is its own test | test the fold directly |
| Make `Starting` clear the reading | BEH-QD-508/F6/F7 expect the kept reading | keep |

### 83.4 Regression test to open with

This is a refactor, so open with a **characterisation** that is green on the base and must stay green: a table over (build, configure(options), first sample, unchanged sample, changed-one-field sample, defect, restart-after-stop, configure(undefined)) asserting `{status._tag, reading identity per field, publish count}`. Write the per-field-identity row first (`DiagnosticsStore.test.ts:86, 105, 226` already do it for the store: they must be re-pointed at the fold). If `Diagnostics.questions` is removed, add a RED type pin (`@ts-expect-error` access of `.questions` on the poll's reading) and a RED `mergeReading` test.

### 83.5 Sites

Source: `DiagnosticsStore.ts:76-97, 132-189, 238-260`; `DiagnosticsFeed.ts:163-228`; consumers `DockModel.ts:307-311, 360-367, 377-384, 389-401`, `DevtoolsDock.tsx:115-119, 271`, `useDiagnostics.ts`. Tests to migrate: `DiagnosticsStore.test.ts` (`makeDiagnosticsStore` at `:61-141`, `start(store…)` `:56-57`, `runDiagnostics` `:142-306`, `mergeReading` `:308-395`), `DiagnosticsStore.tst.ts` (3 negative pins, `scripts/check-house-style.mjs:771` and the AGENTS.md §6 table row must move with it; subject text changes if the first parameter type does), `DiagnosticsFeed.test.ts`, `DockModel.test.ts` (M18-M28), `DockModel.characterisation.test.ts:49-90`, `surface.tst.ts:240-265`, fixtures `dockModelFixtures.ts`, `DiagnosticsScreens.test.tsx`. Spec/docs: ADR-QD-173, ADR-QD-169 d10, BEH-QD-323, BEH-QD-617, BEH-QD-637, BEH-QD-640, INV-QD-314, INV-QD-366, `spec/overview.md:916-923`, upgrade guide, changeset. Mutation floor for `DiagnosticsStore.ts` (60/60 at ADR-QD-169, `:100`) and `DiagnosticsFeed.ts` must not drop.

---

## Phase 84: `useConfigured` takes a value that has `configure`, plus four small finds (devtools)

### 84.1 Current behaviour and sites

| Find | Where today | Observable behaviour to keep | Test sites |
|------|-------------|------------------------------|------------|
| `useConfigured(make, configure, inputs)` with an adapter | `react/useConfigured.ts:19-32`; three identical adapters `(v,i)=>v.configure(i)`: `useDockModel.ts:22-24` (call `:30`), `useTimeline.ts:44-46` (call `:71`), `useDiagnostics.ts:19-21` (call `:44`) | configure inside the scoped build before any reader commits; a new inputs record configures once more, the same record nothing more; a rebuild/Activity reveal uses the latest committed render's inputs; a first configure that throws closes the scope and reaches the boundary as itself (BEH-QD-734 `28-devtools-screens.md:3163`) | `test/react/useConfigured.test.tsx` (U1-U4; its double passes a `configure` *function*, so it must become an object with `configure`), `ConfigureFirstRender.characterisation.test.tsx` C1-C11, `DockRegistryReads.test.tsx`, `useTimeline.test.tsx`, `DiagnosticsLifetime.test.tsx`, `TimelineLifetime.test.tsx` |
| `LensSession.move` restates `ExternalStore.set` | `model/LensSession.ts:149-152` (`if (next === getSnapshot()) return; publish(next)`), used by `toggle :160`, `hover :164`, `cancel :179`, `highlight :184`; `choose :167-175` does the same guard then `armed = …; publish` | a no-op publishes nothing and keeps the reference; a command run inside a listener sees the published snapshot; a listener told of a pick can take its reveal (arm **before** the publish) (BEH-QD-736 `:3242`, INV-QD-405/406, ADR-QD-193) | `test/model/LensSession.test.ts:229, 243, 304, 317, 378`, `ConfigureRule.test.ts` CR16-CR22 (lens silent), `DockModel.test.ts:1821` |
| `useLens` takes the questions store **and** its snapshot `instances` | `react/useLens.ts:37-41`; render-time `instances` feed the draw effect (`:49-60`), event-time `questions.getSnapshot().instances` feeds hover/click (`:72, :80`); caller `QuestionsPanel.tsx:114-118` reads the store once and passes both | exactly one subscription to the questions store while mounted and none after (`Lens.adapter.test.tsx:160`); handlers read the guards when the event arrives so a guard registered while picking adds no listener (`useLens.ts:62-63`); picking exits on pick/Escape/unmount | `test/react/Lens.adapter.test.tsx:53` (`useLens(lens, questions, useStoreSnapshot(questions).instances)`), `Lens.dock.test.tsx`, `Lens.dock.characterisation.test.tsx`, `QuestionsPanel*.test.tsx` |
| `DockFrame` writes the stop-ledger ref and memoised notice twice | `DevtoolsDock.tsx:115-127`: `useRef<StopLedger<…>>(noStops)` + `useMemo({status, onRestart, announced}, [status, model])` once for diagnostics, once for the timeline | once-per-stop alert semantics and notice identity stable while status and model are (BEH-QD-509 `:1501`, BEH-QD-520 `:1711`) | `DiagnosticsNotice.test.tsx`, `TimelineNotice.test.tsx`, `DevtoolsDock.test.tsx`, `useSimulationSession.test.tsx` (uses `DockFrame`/dock) |
| `useTimeline` builds `{ source, capacity }` every render | `useTimeline.ts:71` (passed to `useConfigured`, whose layout effect re-runs each commit: `useConfigured.ts:27-29`) | `feed.configure` already no-ops for equal fields (CR1, BEH-QD-732), so this is cosmetic; `DevtoolsDock` has the same property by construction (`DevtoolsDock.tsx:86` rest spread) | `useTimeline.test.tsx`, `ConfigureRule.test.ts` CR1 |

### 84.2 Required behaviour after

| ID | Requirement | Class |
|----|-------------|-------|
| 84-R1 | `useConfigured` takes `make` and `inputs` and calls `value.configure(inputs)`; `A extends { readonly configure: (inputs: I) => void }`; the three adapters are deleted; every BEH-QD-734 behaviour unchanged. Package-private (ADR-QD-099), not Breaking. | table stakes |
| 84-R2 | `LensSession` holds one publishing rule: `move` and `choose` use `ExternalStore.set` (the two are the same operation; `choose` still arms before it and answers `false` on a no-op). | table stakes |
| 84-R3 | `useLens` takes one source of the guard list and keeps one subscription; the event-time-freshness behaviour is either preserved (read the store in handlers) or consciously restated in BEH-QD-736/ADR-QD-193. | table stakes; MEDIUM risk (see pitfalls) |
| 84-R4 | `DockFrame`'s two ledger/notice pairs come from one helper. | table stakes |
| 84-R5 | `useTimeline` stops building a fresh inputs record per render (memoise on `[source, capacity]`, or hand the fields). | differentiator (low value) |

**Anti-features**: making `useConfigured` decide whether an input moved (ADR-QD-192: the value's own rule decides; INV-QD-403); a `useRef` for the latest inputs (the hook relies on React running an effect with its latest closure, BEH-QD-734 text); moving DOM calls out of the adapter (`@qadi/react` calls no DOM API, `useLens` is the sanctioned place); a second subscription to `questions`.

### 84.3 Regression test to open with

Characterisation, green on base, before any edit: (a) `useConfigured.test.tsx` U1-U4 re-expressed over a double that is an object with `configure` (it is the contract the generic type changes); (b) a lens test that a no-op command publishes nothing and that `choose` arms before its listeners run (exists at `LensSession.test.ts:304/378`: confirm it fails when `armed` is set after `publish`, i.e. mutation-check it); (c) `Lens.adapter.test.tsx:160` one-subscription pin stays. No defect, so no RED test; ADR/BEH edits are the BEH-QD-734 and BEH-QD-736 "pinned by" lists and a CCR row. Changeset: `@qadi/devtools` patch or none (internal), at the planner's reading of the repo's changeset rule.

---

## Feature Dependencies

```
81 (configure total, one spread)  --same configure block-->  83 (diagnostics configure/feed value)
81 --counts in BEH-QD-735/CR22-->  84 (hooks call configure; no count change)
82 (provider registry owner)  independent of 81/83/84 (different package)
83 --makes DiagnosticsFeed smaller--> 84 (no change needed, but useDiagnostics shares useConfigured)
```

- 81 before 83: both edit the `configure` tail (`DockModel.ts:425-429` calls `diagnosticsFeed.configure`); 83 must not re-introduce an unguarded step.
- 84-R1 depends on nothing but should land after 81/83 so `useConfigured.test.tsx` does not churn twice.
- 82 can be done in any order but is the second defect: keep the owner's plan order (strictly serial, brief).

## MVP Recommendation (what each phase must ship to be "done")

1. **81**: RED matrix -> total `configure` + total `spread` + one spread + collected rethrow; amend ADR-QD-191/177, BEH-QD-465/656/735, CR22.
2. **82**: RED Activity test -> a registry owner that no cycle of effects can invalidate under a held consumer; strengthen the vacuous unmount test.
3. **83**: characterisation -> the pure fold, the sink, delete the store; resolve `Diagnostics.questions` (recommend removal, Breaking minor with upgrade-guide entry).
4. **84**: `useConfigured` on `configure`; `set` in `LensSession`; the three small finds.

Defer: closing the `Starting`/`Reading` publish windows of ADR-QD-177 d5; a mutation baseline for `QadiProvider.tsx` beyond whatever module 82 extracts.

## Prioritisation

| Item | Value | Cost | Priority |
|------|-------|------|----------|
| 81-R1..R4 | HIGH (live defect, permanent dock desync) | MEDIUM | P1 |
| 82-R1..R3 | HIGH (live defect, crashes the tree) | MEDIUM-HIGH (design spike) | P1 |
| 81-R5 double spread | MEDIUM (extra renders, count restatement) | LOW | P1 (same block) |
| 83-R1..R4 | MEDIUM | MEDIUM | P2 |
| 83-R5 questions | MEDIUM (Breaking) | LOW | P2 |
| 84-R1, R2, R4 | LOW-MEDIUM | LOW | P3 |
| 84-R3 | LOW | MEDIUM (staleness trade) | P3 |
| 84-R5 | LOW | LOW | P3 |

## Pitfalls specific to these phases (for the planner)

1. **Fixing `spread` alone passes the explorer case and still loses a second throw**: both the timeline-listener path and the `finally` need the collector; test both.
2. **Removing the redundant second spread unmasks the `dock` case** unless `spread` itself is total (currently the second spread hides a throw from `dock.setTimeline`).
3. **CR22, BEH-QD-735's counts and ADR-QD-192's consequences change** when the double spread goes; they are asserted, not incidental.
4. **A configure that throws from React's layout effect reaches the error boundary** (`useConfigured.ts:27-29`); BEH-QD-734 pins only the *first* configure. Do not change that contract, but do not claim "never throws" either.
5. **82's cleanup/effect ordering**: children's effects run before the provider's; any "rebuild on reveal" is too late for stable consumers (finding above).
6. **`edges.test.tsx:257` is vacuous**: a fix that never disposes would pass it.
7. **`NOT_CALLABLE_PIN_BUDGET`** (`scripts/check-house-style.mjs:771`, AGENTS.md §6 table): changing `runDiagnostics`'s parameter type moves `DiagnosticsStore.tst.ts`'s three pins and their positive twins.
8. **84's `useLens` single source**: the draw effect lags the store by a render, the handlers do not; collapsing to the render snapshot can make a hover resolve against guards the store has already dropped. Keep one subscription (`Lens.adapter.test.tsx:160`).
9. **Docs gates**: `typescript` fences are compiled (`check-doc-examples.mjs`, `check-website-doc-examples.mjs`); the `0.12`/`0.13` upgrade sections read `reading.hydration` and must keep compiling.

## Sources

- Read in full: `P/devtools/src/model/{DockModel,ExternalStore,TimelineFeed,GatesFeed,DiagnosticsFeed,DiagnosticsStore,LensSession,Catalogue}.ts`, `P/devtools/src/react/{useConfigured,useScoped,useDockModel,useDiagnostics,useTimeline,useLens}.ts`, `DevtoolsDock.tsx`, `QuestionsPanel.tsx`, `P/react/src/QadiProvider.tsx`; `node_modules/effect/dist/reactivity/AtomRegistry.js`.
- Spec: ADR-QD-191 (full), ADR-QD-177, ADR-QD-169 d10, ADR-QD-173; BEH-QD-067, 323, 465, 508, 516, 617, 637, 640, 656, 700, 728, 731-736; INV-QD-314, 366, 373, 390, 401-405; `spec/overview.md:916-923`.
- Throwaway runs (deleted, no source change): `pnpm vitest run --project devtools|react <file>` from the repo root (running from a package dir fails with "reading 'config'"). Matrix of nine throwing listeners, record-path, two-throw and double-spread probes for 81; six scenarios (S1 stable-Activity defect, S1b short hide, S2 re-render rebuild, S3 StrictMode, S4 hidden subject change, S5 atoms replaced, S6 unmount) for 82.
- Not run: any fix, the post-fix notification counts (81-R5), `AtomRegistry.reset` as an owner (82 candidate b), a StrictMode double-render registry leak (unmeasured).
