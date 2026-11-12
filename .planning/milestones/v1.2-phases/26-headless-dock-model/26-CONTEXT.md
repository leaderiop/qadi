# Phase 26: A headless dock model - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Ticket:** ARCH-74 · 2026-11-11 review candidate #2
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE7-CONTEXT.md` (base `965ff14c`, numbering row 26)
**Builds on (not yet executed when this was written):** Phase 24 (`SimulationSource.prepareSource`), Phase 25 (session-only `Simulator`,
`setAction`/`choosePolicyAt`, readings in the snapshot, and D-01 answered as option **D**: `makeSimulationSession(init?)` is an
`Effect<SimulationSession, never, Scope.Scope>`, the session owns an `effect/FiberHandle`, `run(kind)` is a synchronous command,
`reap`/`hasRetired`/`dispose` are gone, closing the scope interrupts a run in flight; React owns a scope through the package-private
`react/useScoped.ts`; the dock is split into an owner and a private `DockFrame` rendered once the session exists; recorded as
ADR-QD-137, which overrides ARCH-20 D-20-b). Every plan re-reads `25-*-SUMMARY.md` before it starts; every place a Phase 25
decision changes this plan is marked **[25]**.

<domain>
## Phase Boundary

`@qadi/devtools`' dock builds six stores in React today and wires them together with layout effects: the timeline, the
policy rail (`sightings`), the simulation session, the explorer session, the role viewer's held choice and the dock session
(ARCH-63). The rules that connect them (a new timeline reaches every screen; a replay commands the simulation; a new head does
not move a held choice; an unchanged prop dispatches nothing) exist only in those effects and are tested only by rendering.

After this phase one package-private `makeDockModel` owns all six and pushes each new timeline and catalogue into every store
itself. It is built in a `Scope` (ADR-QD-137's rule: a store that owns fibers is built in a scope its owner holds), and the
simulation session lives in that same scope. React has one owned-model hook, which owns that one scope. The three files of `useOwnedX` hooks go, `Screen` takes the model instead of 18 props,
and every cross-store rule the dock test proves through the DOM has a model test that renders nothing. The simulation and
explorer sessions share one held-choice implementation, and `HeldChoice`'s three arms stop being re-mapped into local unions.

This continues ADR-QD-047's amendments 1.7 (ARCH-58, the explorer's state is a session the dock owns) and 1.10 (ARCH-63, the
dock's state is a session; replay is a command). It reverses neither.
</domain>

<evidence>
## Evidence (re-verified against the working tree on 2026-11-11; HEAD `965ff14c`, Phases 21–25 not yet executed)

- `packages/devtools/src/react/DevtoolsDock.tsx:148-184` builds, in order: `useTimeline(source, {capacity})` (:148),
  `sightings = useMemo(() => catalogueOf(timeline, catalogue), …)` (:159), `useOwnedSimulationSession({ sightings, ports })`
  (:168), `useOwnedExplorerSession(sightings)` (:174), `useOwnedHeldChoice(catalogue?.roles ?? NO_ROLES, sameRole)` (:175),
  `useOwnedDockSession(timeline, simulation)` (:183), `useDockSnapshot(dock)` (:184). **Confirmed.**
- The owned hooks, each `useState(() => makeX(…))` plus one `useLayoutEffect` per input:
  `useDockSession.ts:24-31` (1 effect, `setTimeline`), `useExplorerSession.ts:32-38` and `:45-52` (1 each, `setSightings`,
  `setList`), `useSimulationSession.ts:73-100` (3 effects: `setSightings`, `seed`, `setPorts`, plus a passive `dispose`
  effect). **6 `useLayoutEffect`s in total, not 9** (`/usr/bin/grep -c 'useLayoutEffect('` over the three files: 1, 2, 3).
  **`useSimulationSession.ts`'s owned hook is at :73-100, not :83-112.**
- **`useOwnedSimulationSession` is public**: `src/react/index.ts:24`, `spec/overview.md:889`, `test/surface.test.ts:72`.
  It is **unreleased**: `.changeset/simulation-session.md` (pending, `@qadi/devtools: minor`) introduces it together with
  `makeSimulationSession`, `PolicyChoice` and the snapshot types; `packages/devtools/package.json` is `0.11.0`. The other three
  owned hooks are package-private.
- `Screen` (`DevtoolsDock.tsx:306-357`) takes **18 props** (tab, rows, selectedKey, onSelect, selection, sightings, explorer,
  roleChoice, unknownParents, wiring, activity, portCalls, questions, gates, hydration, onInvalidate, onReplay, simulation).
  **Conditional spreads: 10, not 8** (`/usr/bin/grep -cF '=== undefined ? {} :' DevtoolsDock.tsx` → 10: five at the `<Screen>`
  call :255-262, five inside `Screen` :335-351). `exactOptionalPropertyTypes` is on (`tsconfig.base.json:27`), which is why
  the panels' optional props force the spreads (`ServicesPanel.portCalls?`, `QuestionsPanel.hydration?/gates?/onInvalidate?`,
  `RoleViewer.unknownParents?`).
- `Simulator` is rendered as `<Simulator sightings={props.sightings} session={props.simulation} />` (:345); `sightings` is
  ignored there (Phase 25 removes it **[25]**).
- `HeldChoice<A>` (`model/HeldChoice.ts:28-31`: `Empty | Listed{value,index} | Evicted{value}`) is re-mapped three times:
  `SimulationSession.policyChoice` (`SimulationSession.ts:299-319`, `Empty→None`, `Listed→Chosen{index,policy}`,
  `Evicted→Evicted{policy,label}`), `ExplorerSession.build` (`ExplorerSession.ts:207-217`, `Listed→{sighting,index}`,
  `Evicted→{sighting}`), `RoleViewer.tsx:50-56` (`→ {role, index, evicted}`). **Confirmed.**
- Both sessions re-implement held/pin/resolve instead of using `makeHeldChoiceStore`: `SimulationSession.ts:282`
  (`held`), `:327-329` (`pin`, **conditional**: not while a row is seeded), `:543-566` (`setSightings`, `choosePolicy` with
  `sightingFor`); `ExplorerSession.ts:182` (`held`), `:255-279` (`setSightings` pins unconditionally, `choose` with
  `sightingFor`). `makeHeldChoiceStore` (`HeldChoice.ts:82-106`) is used only by the role viewer.
- `PolicyChoice`'s tags are read by `Simulator.tsx:97,118,189-191`, `test/model/SimulationSession.test.ts` (16 sites, `"Chosen"`)
  and `features/features/devtools-simulator/devtools-simulator.steps.test.ts:426,713-716`. `ExplorerShown`'s by
  `PolicyExplorer.tsx:92-97` (`shown.sighting.label`).
- `useTimeline` (`useTimeline.ts:39-59`) recreates its `TimelineStore` when `capacity` changes (`useMemo([capacity])`) and
  restarts `runSource` when `source` changes; today the dock's sessions survive a capacity change (they receive an empty
  timeline). `TimelineStore` reads `capacity` only at construction (`TimelineStore.ts:43`).
- `test/react/DevtoolsDock.test.tsx` is **1,430 lines, 76 `it` cases**; "a timeline change after a replay keeps the replayed
  form" is at l.1060 and "a new head during the visit does not change what the explorer shows" at l.1152. **Confirmed.**
- Already model-tested (no new test needed for these rules): `test/model/DockSession.test.ts` (pair then filter :124, count
  whole :146, environments :86, select :203, evicted key :214, selection survives filter :224, tab switch re-reads nothing
  :166, replay :259/:269), `test/model/DiagnosticsStore.test.ts:302` (`mergeReading`), `test/model/HeldChoice.test.ts`.
- Mutation: `stryker.devtools.mjs` mutates `packages/devtools/src/model/**/*.ts` and writes
  `reports/mutation-devtools/mutation.json`. Coverage: `src/model/**` 95/95/95/95, `src/react/**` 90/90/90/90 (`vitest.config.ts:49,112`).
- **[25] Phase 25's end state (planned, `25-CONTEXT.md` D-09..D-16):** `makeSimulationSession` is
  `Effect.fn("qadi.devtools.makeSimulationSession")` returning `Effect<SimulationSession, never, Scope.Scope>`; the session has no
  `dispose`; `run(kind): void`. `useScoped<A>(make: () => Effect<A, never, Scope>): A | undefined` (`react/useScoped.ts`,
  package-private) opens a scope in a `useLayoutEffect`, builds with `Effect.runSync(Scope.provide(make(), scope))`, closes the
  scope on cleanup (StrictMode-safe: the double mount closes the first scope and builds afresh). `useOwnedSimulationSession`
  returns `SimulationSession | undefined` through it, and `useSimulationSession` returns `SimulationSessionView | undefined`
  (`{ session, snapshot }`). `DevtoolsDock` is the owner (timeline, diagnostics, rail, simulation) and renders a private
  `DockFrame` (explorer, role choice, dock session, snapshot, JSX) once the simulation exists. So at this phase's base
  `useLayoutEffect(` appears in `src/react` **7** times (`useDockSession.ts` 1, `useExplorerSession.ts` 2,
  `useSimulationSession.ts` 3, `useScoped.ts` 1), not 6.
- `@effect/vitest@4.1.2`'s `it.effect` provides a `Scope` (no `it.scoped` in v4) and has `it.effect.prop` (`src/index.ts:112,253-259`).
- Numbers free on `965ff14c`: `git grep -w` finds none of ARCH-74, ADR-QD-138, CCR-QD-416, BEH-QD-465…469, INV-QD-296/297.
- Spec today: BEH-QD-389 (`28-devtools-screens.md:749`) names `useOwnedDockSession`; INV-QD-107 Source names it too
  (`spec/invariants.md:3246`); ADR-QD-047 Rev 1.10 names `useOwnedDockSession` and `useOwnedSimulationSession` (:292, :314);
  `spec/devtools-spec/01-shell.md:102` says replay is a command (still true after this phase).
</evidence>

<inventory>
## DevtoolsDock.test.tsx: every case, classified (drives DMOD-02)

Classes: **Model** — the assertion is about which state results from commands across one or more stores, independent of how
it is drawn; it moves to a model test and the DOM case is deleted once that test is green. **Wiring** — the only DOM proof
that a prop or control reaches the model, or that a screen reads a dock-owned store across an unmount; stays. **Layout** —
presentation or wording; stays.

| # | Line | Case | Class | Rule owner / model test | Action |
|---|---|---|---|---|---|
| 1 | 77 | mounted with no source renders an empty dock | Layout | — | stays |
| 2 | 85 | reports counts of the whole timeline | Layout | header sentence ("unattached" clause); rule in DockSession.test:86 | stays |
| 3 | 103 | the counts do not narrow when the filter does | Model | DockSession.test:146 (exists) | delete |
| 4 | 121 | offers exactly the environments present | Model | DockSession.test:86 (exists) | delete |
| 5 | 133 | pauses and resumes | Wiring | button → `model.timeline.setPaused` | stays |
| 6 | 145 | clearing empties the view | Wiring | button → `model.timeline.clear`; rule M12 | stays |
| 7 | 154 | renders only where the host puts it | Layout | packaging | stays |
| 8 | 162 | two docks each render their own timeline | Wiring | one model per mounted dock; rule M14 | stays |
| 9 | 190 | carries its own typography | Layout | — | stays |
| 10 | 201 | one row per record, environment badge | Layout | — | stays |
| 11 | 218 | three distinct verdict classes | Layout | — | stays |
| 12 | 239 | a failed row invents no duration | Layout | — | stays |
| 13 | 254 | absent action/resource renders blank | Layout | — | stays |
| 14 | 264 | shows the action and the resource | Layout | — | stays |
| 15 | 280 | an unfamiliar environment renders as itself | Layout | — | stays |
| 16 | 287 | the pair badge moves to the partner | Wiring | badge → `dock.select(partnerKey)` | stays |
| 17 | 311 | a disagreeing pair is marked | Layout | — | stays |
| 18 | 337 | an agreeing pair reads as one story | Layout | — | stays |
| 19 | 349 | a resource with no id names its keys | Layout | — | stays |
| 20 | 363 | an orphan row has nothing to show | Layout | — | stays |
| 21 | 372 | free text narrows the table | Wiring | input → `dock.setFilters({text})` | stays |
| 22 | 393 | an environment chip narrows, reset widens | Wiring | `Segment` → `dock.setFilters({environment})` | stays |
| 23 | 409 | an unpaired row shows no badge | Layout | — | stays |
| 24 | 419 | contains a long value | Layout | — | stays |
| 25 | 435 | renders no more rows than the capacity allows | Model | M11 (capacity reaches the timeline) | delete |
| 26 | 448 | with nothing selected it invites a selection | Layout | — | stays |
| 27 | 455 | a row click opens it on that evaluation | Model | DockSession.test:203 (exists); row-click wiring is exercised by #28–41 | delete |
| 28–41 | 462–702 | the 14 inspector rendering cases (tree, never resolved, error panel, fields, duties, gate, cache wording, undisclosed, orphan question lines) | Layout | — | stay |
| 42 | 717 | a pair badge reaches a partner the filter has hidden | Model | DockSession.test:124 and :224 (exist) | delete |
| 43 | 732 | a selection dropped by capacity says the buffer moved on | Layout | eviction wording + `capacity` prop wiring | stays |
| 44 | 780 | offers every tab, each renders its screen | Layout | `Screen` lookup | stays |
| 45 | 804 | the selected tab survives a re-render | Wiring | the model is created once per mount | stays |
| 46 | 831 | the four new screens explain their emptiness | Layout | — | stays |
| 47 | 853 | the policy rail fills from the log alone | Model | M1 (timeline → sightings → explorer and simulation) | delete |
| 48 | 865 | a declared catalogue adds names and unrun policies | Model | M2 (`configure({catalogue})` → both rails) | delete |
| 49 | 883 | roles come only from the catalogue | Model | M3 (`configure({catalogue})` → role choice; records add none) | delete |
| 50 | 891 | threads wiring, activity, questions, invalidate | Wiring | props → panels | stays |
| 51 | 933 | surfaces a dropped parent name | Wiring | `unknownParents` → `RoleViewer` | stays |
| 52 | 947 | the inspector shows verdicts, the explorer none | Layout | — | stays |
| 53 | 976 | seven tabs; the simulator works with no new props | Layout | `Live` shown disabled | stays |
| 54 | 988 | replaying from the inspector switches tab and seeds | Wiring | replay button → `dock.replay`; rule M4 | stays |
| 55 | 1026 | replays the same row again after another policy was chosen | Model | M5 | delete |
| 56 | 1045 | replays the same row again after the form was edited | Model | M6 | delete |
| 57 | 1060 | a timeline change after a replay keeps the replayed form | Model | M7 | delete |
| 58 | 1089 | keeps the simulator's form, capture and result across a tab round trip | Wiring | screen unmount reads the dock-owned session; rule M9 | stays |
| 59 | 1124 | the explorer keeps its chosen policy (round trip) | Wiring | same, explorer | stays |
| 60 | 1133 | the explorer keeps a pasted draft, view, unloaded edit | Wiring | same, explorer | stays |
| 61 | 1152 | a new head during the visit does not change the explorer | Model | M8 | delete |
| 62 | 1175 | the role viewer keeps its chosen role (round trip) | Wiring | same, role viewer | stays |
| 63 | 1188 | no replay action on an orphan | Layout | — | stays |
| 64 | 1197 | visiting every tab leaves the log where it was | Model | M9 (a tab change touches no other store) | delete |
| 65 | 1226 | names what the call detail would take | Layout | — | stays |
| 66 | 1237 | renders the calls when a collector is wired | Wiring | `reading.portCalls` → `ServicesPanel` | stays |
| 67 | 1280 | fills Services and React from the sampled reading | Wiring | `diagnostics` → `useDiagnostics` | stays |
| 68 | 1298 | samples the questions thunk | Wiring | same | stays |
| 69 | 1305 | an explicit activity prop wins | Wiring | `mergeReading(sampled, reading)` argument order; rule in DiagnosticsStore.test:302 | stays |
| 70 | 1325 | a supplied reading can state a failed wiring read | Layout | failed-read wording | stays |
| 71 | 1337 | an explicit wiring prop wins, field by field | Wiring | argument order (as #69) | stays |
| 72 | 1352 | an explicit portCalls prop wins | Wiring | argument order | stays |
| 73 | 1383 | an explicit questions prop wins | Wiring | argument order | stays |
| 74 | 1398 | an explicit hydration prop wins | Wiring | argument order | stays |
| 75 | 1412 | states a layer that failed to build | Layout | — | stays |
| 76 | 1423 | samples nothing without the prop | Wiring | — | stays |

**Totals:** 76 cases. **Model: 13** (delete after their model tests are green: #3, 4, 25, 27, 42, 47, 48, 49, 55, 56, 57, 61,
64). **Stays: 63** (Layout 40, Wiring 23). Of the 13 Model cases, 4 are already covered by `DockSession.test.ts` (#3, 4, 27,
42) and 9 need a new test in `test/model/DockModel.test.ts` (M1–M3, M5–M9, M11).

New model tests (M-numbers are referenced by the plans):
- **M1** records alone fill the explorer's and the simulation's rail, one sighting per policy, with its tally.
- **M2** `configure({ catalogue })` adds declared names and unrun policies to both rails.
- **M3** roles come only from the catalogue: records add none; a new catalogue's roles reach the role choice.
- **M4** `dock.replay(entry)` moves to the simulator *and* the simulation is `Seeded` with the row's policy and action.
- **M5** replay A, choose another policy, replay A → `Seeded` A again.
- **M6** replay A, edit the action, replay A → A's action again.
- **M7** replay A, edit the action, a new record arrives → still `Seeded`, the edit kept, the new policy on the simulation's rail.
- **M8** the explorer and the simulation show head a; record b becomes the head → both still show a.
- **M9** `dock.setTab` through every tab and back leaves the timeline, the explorer, the role choice and the simulation
  snapshots reference-equal (INV-QD-107 at the model).
- **M10** `configure` dispatches only what changed identity: same `ports` + new `catalogue` keeps the simulation's capture;
  new `ports` drops it; same everything publishes nothing anywhere (the merged-effect defect class of ARCH-63).
- **M11** a model built with capacity 5 holds 5 rows after 6 records; `configure({ capacity })` with a new bound empties the
  timeline and keeps the tab, the filters and every held choice.
- **M12** `timeline.clear()` empties rows and counts in the dock session and the rails, and keeps the tab.
- **M13** closing the model's scope interrupts a simulation run in flight (it never lands) **[25]**.
- **M15** `configure({ source: b })` after reading `a` releases `a`'s subscription and records from `b` reach the timeline (D-14).
- **M16** closing the model's scope while a source is being read releases its subscription; no record lands after (D-14).
- **M14** two models share nothing (a record accepted by one is absent from the other).
- **P1** property (fast-check; `it.effect.prop`, or the `ExplorerSession.test.ts:598` idiom with `Effect.runSync`, each sample's
  model built inside `Effect.scoped`): after any sequence of `accept`/`clear`/`setPaused`/
  `configure`, the dock's counts, the explorer's and the simulation's rails all equal what `countsOf`/`catalogueOf` give for
  `model.timeline.getSnapshot()` and the current catalogue (INV-QD-296).
</inventory>

<decisions>
## Implementation Decisions

- **D-01 (shape):** a new package-private module `packages/devtools/src/model/DockModel.ts`,
  `makeDockModel = Effect.fn("qadi.devtools.makeDockModel")(function* (init?: DockModelInputs): Effect.fn.Return<DockModel, never, Scope.Scope> { … })`,
  in the `ExplorerSession`/`DockSession` style (closures, `makeExternalStore`, no React, no class) and scoped by D-13. It owns
  and exposes the six stores as fields (`timeline`, `dock`, `explorer`, `roles`, `simulation`) plus `sightings()`; host inputs
  arrive through one `configure({ source, capacity, catalogue, ports })`, and the model reads the source itself in its own
  scope (D-14; there is no `read` member). **[25]** There is no `dispose`: the model ends when its scope closes. The verified target interface is in `26-01-PLAN.md`'s
  `<interfaces>`; names may change, the rules may not.
- **D-02 (the model pushes):** the model subscribes to its own timeline at construction. On each new timeline snapshot (the one
  the dock shows, so a pause freezes every screen together) it computes `catalogueOf(timeline, catalogue)` once and calls
  `explorer.setSightings`, `simulation.setSightings` and `dock.setTimeline`, synchronously and in that order, before any React
  listener runs (the model subscribed first). A catalogue change pushes the rail and the roles the same way. No React effect
  carries a timeline or a rail.
- **D-03 (one effect, diffed in the model):** `configure` compares each field by identity and dispatches only the changed ones;
  `simulation.setPorts` and `setSightings` keep their own guards. React calls it from **one** `useLayoutEffect` with deps
  `[model, capacity, catalogue, ports]`. This is the one place ARCH-63's lesson (a merged effect re-dispatching an unchanged
  input) is now a model rule with a test (M10), instead of a hook convention.
- **D-04 (React hook):** one package-private hook `useDockModel({ source, capacity, catalogue, ports }): DockModel | undefined`
  in `packages/devtools/src/react/useDockModel.ts`: **[25]** `const model = useScoped(() => makeDockModel({ source, capacity, catalogue, ports }))`
  (the model held in `useScoped`'s one `useState`, never a decision; one scope per mounted dock, D-13) and the one `configure`
  layout effect, which does nothing while `model` is `undefined`. The hook forks nothing (D-14): no read effect, no dispose
  effect; `useScoped`'s cleanup closes the scope, which interrupts the read and a simulation run in flight. `DevtoolsDock` renders `model === undefined ? null : <DockFrame … />`;
  the frame Phase 25 introduced takes the model. Snapshot readers (`useDockSnapshot`, `useExplorerSnapshot`,
  `useHeldChoiceSnapshot`, `useSimulationSnapshot`) stay or move beside it.
- **D-05 (capacity keeps the dock's choices):** today a capacity change empties the timeline and leaves every session's state
  alone. Keep that: the model's `timeline` is a stable `TimelineStore`-shaped object that delegates to an inner
  `makeTimelineStore({ capacity })`, replaced on a capacity change (the model re-subscribes and publishes the empty
  timeline). `TimelineStore`'s public interface is unchanged. Pinned by M11.
- **D-06 (delete the owned hooks):** `useOwnedDockSession`, `useOwnedExplorerSession`, `useOwnedHeldChoice` (package-private)
  and `useOwnedSimulationSession` (public, unreleased) are deleted. The public `useSimulationSession` keeps its documented
  host prop-in-step behaviour (`seed` prop, BEH-QD-390; ADR-047 Rev 1.10 keeps that path for hosts) with its own effects inlined,
  and the dock no longer uses it; **[25]** it keeps building its session through `useScoped` and returns
  `SimulationSessionView | undefined`. Removing an unreleased export is not a published break: `.changeset/simulation-session.md` is
  edited in place (Phase 15's precedent), `spec/overview.md:889` and `test/surface.test.ts` drop the name. **Precondition:**
  that changeset is still pending; if a release has happened, stop and report (the removal would then be Breaking, a human call).
- **D-07 (Screen):** `Screen` takes `{ model, view: DockSnapshot, shown: Diagnostics, host }` where `host` is
  `Pick<DevtoolsDockProps, "gates" | "unknownParents" | "onInvalidate">`. The panels' optional props become `?: T | undefined`
  (`ServicesPanel.portCalls`, `QuestionsPanel.hydration`/`gates`/`onInvalidate`, `RoleViewer.unknownParents`) so the 10
  conditional spreads go (target 0). `TABS` stays `satisfies` the closed `TabId`.
- **D-08 (DMOD-04, one held choice):** `HeldChoice.ts` gains the non-publishing cell both sessions embed —
  `makeHeldChoice(initial, same)` with `list()`, `held()`, `resolve(): HeldChoice<A>`, `setList(list): boolean`,
  `pin(): void`, `choose(value): boolean` (booleans say whether anything changed, so a session publishes exactly once per
  effective command) — and `makeHeldChoiceStore` becomes that cell plus one publish (pinning on `setList` as today). A nested
  store subscription was considered and rejected: it would publish twice per command and break "every effective command
  notifies exactly once" (`ExplorerSession.test.ts:503`). `SimulationSession` keeps its conditional pin by calling `pin()` only
  while nothing is seeded. Two total readers, `heldValue(choice): A | undefined` and `heldIndex(choice): number | undefined`,
  are the one place a choice is read as a value or a position.
- **D-09 (DMOD-04, no re-mapping):** `PolicyChoice` becomes `HeldChoice<PolicySighting> | Seeded` (tags `Empty | Listed |
  Evicted | Seeded`; a listed policy is `value.policy`, its label `value.label`); `ExplorerShown` becomes
  `Exclude<HeldChoice<PolicySighting>, { _tag: "Empty" }> | Draft`; `RoleViewer` reads `heldValue`/`heldIndex`. Each union is
  written out in full where declared (closed union over widening). `HeldChoice` is exported as a type from the root barrel,
  because the public `PolicyChoice` is built from it (AGENTS.md §9: re-export what `.d.ts` must name). `PolicyChoice` is
  unreleased (D-06's changeset), so this is an edit to a pending minor, not a published break. **[25]** Phase 25 may have moved
  `PolicyChoice` reads from `Simulator.tsx` into session readings; re-grep `"Chosen"`/`"None"` before editing.
- **D-10 (test first, then delete):** the model tests M1–M16 and P1 are written RED in 26-01 against the D-01 interface,
  turned GREEN in 26-02, and only then (26-05) are the 13 Model-class DOM cases deleted. Every Wiring and Layout case stays
  and passes unchanged through 26-04 (that is the regression net for the React switch).
- **D-11 (records):** ADR-QD-047 gains its next revision (amendment, "the dock is one model"; Phase 25's D-08 takes the
  revision after 1.10, so this is 1.12 unless Phase 24 also amended it: read the header). ADR-QD-138 stays unused, stated in the
  CCR row: this amends the same boundary 1.7 and 1.10 drew, which this record owns (Phase 15 left ADR-QD-127 unused for the
  same reason). BEH-QD-465 (the dock is one model: six stores, one push, one configure, a tab change touches nothing else,
  capacity keeps choices) and BEH-QD-466 (a choice from a list has one shape in every store) in `28-devtools-screens.md`;
  BEH-QD-322's and BEH-QD-389's fences follow the code; INV-QD-296 "the dock's stores never disagree about the timeline"
  (enforced by P1); INV-QD-107's Source/Enforcement name `DockModel.ts`. CCR-QD-416; BEH-QD-467–469 and INV-QD-297 unused.
- **D-12 (AGENTS.md §13, DMOD-05):** the devtools reads no `@qadi/react` decision, so `outcomeOf` is not engaged; the rule
  held is "no React state for decisions": `DevtoolsDock.tsx` and `useDockModel.ts` have 0 `useState`; the one `useState` that
  holds the model is `useScoped`'s (the model itself), and `pnpm lint:style` (`DECISION_READ_BUDGET`) stays green with no budget edit.
- **D-13 (the model is scoped and owns the session's scope) [25]:** ADR-QD-137 makes the simulation session scoped, and the
  model builds it, so the model is scoped too: `makeDockModel` needs a `Scope` and builds the session with
  `yield* makeSimulationSession({ sightings: rail, ports })` in that same scope. The model adds no finalizer of its own (its other
  stores hold no fibers); closing its scope interrupts a simulation run in flight (M13) and nothing else needs releasing.
  The model's source read lives in the same scope (D-14). React owns exactly one scope per mounted
  dock, through `useScoped` (Phase 25); StrictMode's double mount closes the first model's scope and builds a fresh model, which
  is safe because nothing was read or chosen in between. Tests build the model in `it.effect` (`yield* makeDockModel(…)`), and a
  test that closes the scope mid-test uses `Scope.make()`/`Scope.provide`/`Scope.close`; P1 builds each sample's model inside
  `Effect.scoped`.
- **D-14 (the model reads its source in its own scope):** nothing that belongs to the model's scope stays forked by a hook (the
  user's rule: cleanest, not simplest). `DockModelInputs` gains `source?: Source | undefined`; the model holds a second
  `FiberHandle` for reads (`reads = yield* FiberHandle.make<void>()`, `forkRead = yield* FiberHandle.runtime(reads)<never>()`)
  and forks `runSource(timeline, source)` into it at construction when a source is given, and again from `configure` when
  `source` or `capacity` changes identity (the deps the hook had, `[source, capacity]`: a new bound re-reads the backlog into
  the new buffer, D-05). `FiberHandle`'s replacement interrupts the previous read before the new one starts, and its scope
  release interrupts the read in flight when the model's scope closes; `runSource`'s own scope then releases the source's
  subscription. `read` leaves `DockModel`. Tests M15 (a source change interrupts the previous read and the new one feeds the
  timeline) and M16 (closing the model's scope interrupts an in-flight read and releases the source).

### Claude's Discretion
- Exact names (`makeDockModel`, `configure`, `roles`, `DockFrame`, the read handle), whether the snapshot readers move into
  `useDockModel.ts`, and whether `useDockSession.ts`/`useExplorerSession.ts` are deleted or keep only readers.
- Whether `sightings()` is a function or a field of a small model snapshot.

### Checkpoint
None. `makeDockModel` stays package-private by the rule D-05 of Phase 15 applied (ADR-QD-099; `DockSession`,
`ExplorerSession` are package-private), and every public-surface change touches only unreleased names (D-06, D-09).
</decisions>

<canonical_refs>
## Canonical References
- `packages/devtools/src/react/DevtoolsDock.tsx`, `useDockSession.ts`, `useExplorerSession.ts`, `useSimulationSession.ts`,
  `useTimeline.ts`, `useRunningStore.ts`, `RoleViewer.tsx`, `PolicyExplorer.tsx`, `Simulator.tsx`, `ServicesPanel.tsx`,
  `QuestionsPanel.tsx`, `src/react/index.ts`, `src/index.ts`
- `packages/devtools/src/model/DockSession.ts`, `ExplorerSession.ts`, `SimulationSession.ts`, `HeldChoice.ts`,
  `TimelineStore.ts`, `Catalogue.ts`, `ExternalStore.ts`
- `packages/devtools/test/react/DevtoolsDock.test.tsx`, `test/model/{DockSession,ExplorerSession,SimulationSession,HeldChoice}.test.ts`,
  `test/surface.test.ts`, `test/surface.tst.ts`, `features/features/devtools-simulator/devtools-simulator.steps.test.ts`
- `.planning/phases/15-dock-session/` (ARCH-63, all plans and summaries), `.planning/phases/25-session-only-simulator/25-CONTEXT.md`
  (D-09..D-16) and `25-*-SUMMARY.md`, `react/useScoped.ts`, ADR-QD-137 (Phase 25)
- ADR-QD-047 (Rev 1.7 explorer, Rev 1.10 dock), ADR-QD-099, `spec/behaviors/28-devtools-screens.md` (BEH-QD-337, BEH-QD-389),
  `spec/behaviors/29-devtools-simulator.md` (BEH-QD-322, BEH-QD-390), INV-QD-107, `spec/devtools-spec/` (gate 12
  `node scripts/check-devtools-claims.mjs`), `spec/overview.md` (gate 13 `node scripts/check-api-surface.mjs`)
</canonical_refs>

<deferred>
## Deferred Ideas
- Moving the diagnostics reading (`useDiagnostics` + `mergeReading`) into the dock model. It is a separate store with its own
  runner and is already model-tested; the six DOM precedence cases (#69, 71–74) stay as wiring of the argument order.
- A `typeChip` buffer in the session (ADR-047 Rev 1.9 left it open; unchanged here).
- `useSimulationSession`'s three prop-in-step effects (the public host path). Folding them into a diffed `configure` like D-03
  is possible but changes a public adapter's behaviour for hosts; not needed by DMOD-03, whose target is the dock's path.
</deferred>

---
*Phase: 26-headless-dock-model · Context gathered: 2026-11-11*
