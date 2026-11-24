# Phase 80: The highlight lens is a headless session; `instrument` resolved - Context

**Gathered:** 2026-11-24 (smart discuss, autonomous mode; every decision below was decided autonomously on 2026-11-24 under the owner's standing instruction "always pick the most complete and clean solution, not the simplest")
**Status:** Ready for planning

<domain>
## Phase Boundary

Today the highlight lens keeps its state and its rules inside a React hook, and `@qadi/react` exports a context field nothing reads.

1. **Three `useState`s and four rules in DOM handlers.** `useLens.ts:43-122` holds `highlighted`, `picking` and `picked`. The rules sit in the `pointermove`, capture-phase `click` and `keydown` handlers and in `togglePicking`:
   - a click is swallowed only when a guard was found (`:75-86`);
   - `Escape` ends picking and clears the highlight, and leaves `picked` alone (`:88-92`);
   - toggling clears the highlight and the pick (`:115-119`);
   - hovering nothing clears the highlight (`:67-73`).

   Only DOM tests cover them (`QuestionsPanel.gates.test.tsx:203-420`), so they are outside the model's tests and outside `stryker.devtools.mjs`'s `src/model/**` glob: the defect class `ExplorerSession.ts:4-8` records fixing.
2. **Listeners re-added on every instance change.** The listener effect depends on `[picking, instances]` (`useLens.ts:105`), so every registry change while picking removes and re-adds all three document listeners.
3. **The lens lives as long as its tab.** `useLens` is called inside `QuestionsPanel` (`QuestionsPanel.tsx:106`), and `DevtoolsDock`'s `Screen` unmounts the panel on a tab switch (`DevtoolsDock.tsx:267-274`, `screens[props.view.tab]()`). A pick is forgotten on every tab round trip, which INV-QD-107 ("Leaving the screen and returning to it is not a choice") says a screen's choice must not be.
4. **`QadiContextValue.instrument` has no reader.** It is declared at `QadiProvider.tsx:62` and written at `:306-309`; guards learn whether they are instrumented from the writer the provider resolves once and hands through `GateScopeContext` (`:203-208`, ADR-QD-111). The repository-wide search (D-22) finds no reader.

After this phase:
- A package-private `model/LensSession.ts`, a plain `makeLensSession()` like `makeDockSession`, holds the lens as a closed two-arm snapshot (`Idle` | `Picking`). Its transitions are `toggle`, `hover`, `choose` (answers whether the click is consumed), `cancel` and `highlight`, plus `takeReveal`, the one-shot that lets a picked row bring itself into view once. Every rule is pinned by plain calls under the model's mutation gate.
- The dock model owns it as its tenth store, `lens`; it has no inputs and `configure` does not touch it.
- `useLens` is the DOM adapter only: three document listeners added on entering picking and removed on leaving it, never on an instance change; `drawLens`/`clearLens`; and an unmount-only cleanup that calls `cancel()`.
- `QuestionsPanel` takes a `lens` prop; `test/react/questionsPanelInput.ts` stays the one seam for the 42 panel renders in three test files.
- A tab round trip keeps the pick and ends picking and any highlight; the picked row does not scroll itself into view again on return.
- `QadiContextValue.instrument` is removed: a **Breaking** `@qadi/react` minor. The provider's `instrument` prop stays.

ARCH-127. Packages: `@qadi/devtools` (patch changeset: behaviour only, no export moves) and `@qadi/react` (minor, Breaking). ADR-QD-193 is new and amends ADR-QD-185 and ADR-QD-047, with a dated amendment of ADR-QD-111.

No research was run (the roadmap's planning notes: "No research flag"). The evidence is the code at `589c774d`, the head of `arch-wave-14` when this was written, with file:line cited per decision.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE14-CONTEXT.md`, ROADMAP, REQUIREMENTS)
- **D-01:** Branch `arch-wave-14` only. Phases run strictly one at a time, on the main tree (`use_worktrees` is false). No merge, push, tag, release, publish or `changeset version`.
- **D-02:** Only the reserved records are used:
  - ADR-QD-193, which amends ADR-QD-185 and ADR-QD-047 and carries the dated ADR-QD-111 amendment;
  - CCR-QD-472;
  - BEH-QD-736..740;
  - INV-QD-405..406.

  `node scripts/next-id.mjs` is never run. A reserved number left unused is named "Unused" in the CCR row.
- **D-03:** Behaviour changes are guarded by tests written first.
  - Every behaviour change is preceded by a characterisation or regression test written on the phase base: RED for a defect, green for preserved behaviour.
  - Every new check is shown failing once.
  - A mutation survivor is closed with a test, never by re-baselining.
  - No D-number, plan-local id or phase number enters shipped source, a test title or a BDD scenario.

### Area 1 — What survives a tab switch (LENS-04)
- **D-04 — the pick survives; picking and the highlight do not.**
  - **`picked` is kept.** It is the reader's choice of a row, and INV-QD-107 says leaving a screen and returning "is not a choice" (`spec/invariants.md:3405-3411`). Every other screen choice already lives in the dock model for this reason: the tab, filters and selection (`DockSession.ts:16-17`), the explorer (`ExplorerSession.ts:12-13`) and the roles (`HeldChoice.ts:21-23`). `02-screens.md` 0.13 recorded the same move for §3 and §4.
  - **`Picking` ends.** `spec/devtools-spec/01-shell.md:72` says "opening the inspector exits lens mode". In the built dock the lens lives in the React panel, so leaving that panel is the same act, and BEH-QD-234's "unmount" exit (`28-devtools-screens.md:614-618`) already ends it there. A model left in `Picking` with no listeners attached would be a mode nobody can see and nothing can exit, which BEH-QD-234's "Picking MUST have an exit" forbids.
  - **The highlight is cleared.** A highlight is an act ("show me these guards now"), like a replay (ARCH-63), not a held choice. Redrawing it when the reader returns would draw over the host page without being asked. BEH-QD-234 already requires "Unmount also removes every overlay".
  - **Mechanism:** `useLens`'s unmount cleanup calls `cancel()`. `cancel` is `Idle { highlighted: [], picked }` from `Idle`, and `Idle { highlighted: [], picked: undefined }` from `Picking` (in `Picking` nothing is picked, D-11).
  - **Rejected: everything persists**, the review's reading. It would redraw an overlay unasked and leave an unexitable mode in the model.
  - **Rejected: nothing persists**, today's behaviour. It breaks INV-QD-107 for the one screen choice the dock still drops.
- **D-05 — the exit lives in the adapter's unmount cleanup, in an effect keyed on the session alone. The model adds no tab rule.**
  - **Why that effect:** the listener effect re-runs on every mode change. A `cancel()` in its cleanup would wipe a highlight that `highlight` had just set while ending picking (D-12). So the exit-on-unmount is its own effect with `[lens]` deps, which runs on unmount and never on a mode change.
  - **Rejected: `DockModel` subscribing the lens to `dock.tab`.** It writes the one rule twice (the model and the adapter, whose cleanup the roadmap requires either way). It couples two stores that ADR-QD-185 keeps independent. And it would still need the adapter's cleanup for a panel that unmounts for any reason other than a tab change.
- **D-06 — a picked row reveals itself once per pick, never on a remount.**
  - **Hazard:** `InstanceRow`'s `useEffect(() => { if (picked) scrollIntoView(...) }, [picked])` (`QuestionsPanel.tsx:251-256`) runs on mount. With `picked` kept (D-04), every return to the tab would scroll the panel unasked, which is the hazard the wave context names ("`InstanceRow`'s `scrollIntoView` must not re-fire on remount").
  - **Mechanism:** `choose` arms a one-shot reveal for the chosen id, and `takeReveal(id): boolean` answers `true` once, for that id only, and disarms it. `toggle` disarms it. `takeReveal` publishes nothing, because it is an event and not state. The row's effect becomes `if (picked && lens.takeReveal(instance.id)) node.current?.scrollIntoView({ block: "nearest" })`.
  - **What this keeps:** a row that was not rendered when the pick happened (its question not yet in the rows view) reveals itself the first time it mounts after the pick, which is the first reveal and not a re-fire.
  - **StrictMode:** the double-mounted effect takes the reveal on its first run and reads `false` on its second, so the panel scrolls once.
  - **Rejected: a `useRef(picked)` "mounted already picked" guard in the row.** It keeps the rule in React, outside the mutation gate, and it would skip that first reveal.
- **D-07 — the characterisation of the persistence change runs through `DevtoolsDock`.**
  - **On the phase base:** with a guard and `gates` handed to the dock, pick a guard, switch to another tab and back. Today the row is not marked, picking is off, no overlay remains and the pick button reads "pick a control on the page". Also pin "highlight, switch tab, return: no overlay".
  - **Why through the dock:** its props do not change in this phase, so the file can be held byte for byte (D-24) where a file rendering `QuestionsPanel` directly could not, because that panel gains a required `lens` prop.
  - **After the change:** the "row not marked" assertion flips to "row marked, and `scrollIntoView` not called on return". The flip is recorded as before/after in `80-RED-EVIDENCE.md` and as an ADR-QD-193 row. Every other assertion in the file is preserved.

### Area 2 — A pick whose guard has gone (LENS-04)
- **D-08 — the pick is held by its gate id, the way `HeldChoice` holds a value. It is never moved to another guard, and only `choose` or `toggle` replaces it.**
  - **What fits from `HeldChoice`:** hold by value, compare by identity, and an evicted value is kept rather than silently swapped for a neighbour or silently reset (`HeldChoice.ts:11-15`). A gone guard has no row, so its pick marks nothing. The panel already states the guard's absence on its question row ("asked, nothing mounted", `QuestionsPanel.tsx:209-214`) when it was the last guard asking.
  - **Why `resolveHeld` itself is not reused:** it reads "nothing held" as the head of the list (`HeldChoice.ts:55-57`). For the lens that would mark the first guard as picked when nothing is. It also answers an index, which nothing here reads: each row compares `pickedOf(snapshot) === instance.id`. ADR-QD-193 records this reason.
  - **Identity:** a gate id is React's `useId` (`useGate.ts:215-218`), and the registry disambiguates a live collision (`GateWriter.ts:153-170`). A pinned test in `@qadi/devtools`'s DOM suite mounts a real `QadiProvider` with `instrument`, unmounts the picked guard and mounts one in the same position. It asserts the new guard has a different id and its row is not marked. This shows that keeping the id cannot re-attach a pick to a different guard. If the test finds an id reused, the decision falls back to dropping the pick when its id leaves the instances list, through a `retain(ids)` command `DockModel` calls from the questions store; record that in ADR-QD-193.
  - **Rejected: a "the guard you picked has unmounted" note.** It is new copy and a visible change, and the question row already states the unmount.

### Area 3 — The session's interface and snapshot (LENS-01, LENS-02)
- **D-09 — `model/LensSession.ts` exports `makeLensSession(): LensSession`.**
  - **What it is:** a plain function with no `Scope` and no `Effect`, like `makeDockSession` (`DockSession.ts:63`). It holds no resource; closing the model's scope needs nothing from it. It takes no init, because the lens has no inputs.
  - **Package-private:** it is not in either barrel (ADR-QD-099; exporting it is out of scope per the ROADMAP).
  - **Built on** `makeExternalStore` (`ExternalStore.ts`), publishing exactly once per effective command (`store.publish(build())`), as `DockSession` does (`:91-92`).
- **D-10 — the snapshot is a closed two-arm union, so the illegal states cannot be written.**
  ```ts
  type LensSnapshot =
    | { readonly _tag: "Idle"; readonly highlighted: ReadonlyArray<string>; readonly picked: string | undefined }
    | { readonly _tag: "Picking"; readonly highlighted: readonly [] | readonly [string] };
  ```
  - **The evidence for the shape:**
    - Entering picking clears the pick (`useLens.ts:118`), and the only way to set one ends picking (`:83-85`). "Picking with a pick held" is unreachable today, and the union makes it unwritable.
    - While picking, the drawn set is the hovered guard or nothing (`:72`). The tuple type makes "picking with several highlighted" unwritable. Today that state is reachable only transiently, through the highlight button (D-12).
  - **Stable identities:** each arm stores the array the overlay draws, so its identity is stable per publish and the draw effect's deps do not change on a re-render that published nothing.
  - **Construction:** the arms are built with `Data.taggedEnum` constructors, the `GatesView`/`QuestionsView` precedent in `Gates.ts`. Dispatch is `Match.tagsExhaustive` and never a `switch` (`SWITCH_BUDGET` unmoved).
  - **Readings:** `pickedOf(snapshot)` (the `Idle` arm's `picked`, else `undefined`) and `isPicking(snapshot)` sit beside the type.
  - **Rejected: three flat fields.** They admit both illegal states, and the owner's "closed union over widening" applies.
- **D-11 — the transitions.** Each transition publishes only when the snapshot changes, and a no-op publishes nothing (the DockSession rule, BEH-QD-736).

  | Command | From `Idle { h, p }` | From `Picking { h }` | Returns |
  | ------- | -------------------- | -------------------- | ------- |
  | `toggle()` | `Picking { [] }`, reveal disarmed | `Idle { [], undefined }` | — |
  | `hover(id \| undefined)` | no-op | `Picking { id ? [id] : [] }`; same id → no-op | — |
  | `choose(id \| undefined)` | no-op | `id` defined → `Idle { [], id }`, reveal armed for `id`; `undefined` → no-op | `true` only when it moved to `Idle` with a pick |
  | `cancel()` | `Idle { [], p }` | `Idle { [], undefined }` | — |
  | `highlight(ids)` | `Idle { ids, p }`; same elements (`sameElements`) → no-op | `Idle { ids, undefined }`, ending picking (D-12) | — |
  | `takeReveal(id)` | `true` once, if armed for `id` | same | `boolean`; never publishes |

  - **The idle rows:** `hover` and `choose` from `Idle` are reachable only headlessly, because the adapter listens only while picking (D-14). They are pinned so that an idle lens never swallows a click (fail closed).
  - **No `clear` command (orchestrator decision, decided autonomously 2026-11-24).** LENS-01 names a `clear` transition, but every
    outcome it would have is already another command's: from `Idle` it is `cancel()` and `highlight([])` (`Idle { [], p }`), and
    from `Picking` it is `hover(undefined)` (`Picking { [] }`). No shipped caller would read it (`QuestionsPanel.tsx` reads only
    `highlight`, `picked`, `picking` and `togglePicking`). A second name for a transition that exists is surface that promises a
    distinction nothing keeps, so it is not added; "draw nothing" is `highlight([])` while idle and `hover(undefined)` while
    picking. LENS-01 carries a dated note recording this.
- **D-12 — `highlight` while picking ends picking and draws the guards asked for. This is a behaviour change and gets an ADR-QD-193 row.**
  - **Today:** the capture listener lets a click on the dock through, because the dock is not inside a guard (`useLens.ts:77`). The highlight button then draws its ids while picking stays on, and the next `pointermove`, over the dock, which is no guard, wipes them (`:72`). The reader sees, at most, a flash.
  - **After:** the highlight is the reader's explicit act, so it wins. This honours BEH-QD-234's "the dock's own controls keep working while the mode is on" (`28-devtools-screens.md:607-611`), and it is a fourth exit from picking.
  - **Characterisation first, on the base:** while picking, click highlight; overlays are drawn and the pick button still reads "picking"; one `pointermove` over the dock removes them.
- **D-13 — the dock model's tenth store is `lens: LensSession`.**
  - **Where it is built:** in `makeDockModel` (`DockModel.ts:317-443`), returned beside `dock`, and listed in the `DockModel` interface (`:215-241`) with a one-line doc.
  - **What it touches:** nothing in `configure` (`:396-424`), no feed and no other store. A `configure` publishes nothing on it, which is pinned by extending `ConfigureRule.test.ts`'s hand-written `storesOf`/`storeNames` (`:583-600`; "The nine stores" becomes "The ten stores") so the per-store "nothing heard" sweep covers it.
  - **The store-list test** (`DockModel.test.ts:1791-1816`) gains `"lens"`.
  - **The header's "Its stores" paragraph** (`DockModel.ts:29-34`) stays pointing at BEH-QD-700 and gains no count.

### Area 4 — `useLens`'s remaining shape (LENS-03)
- **D-14 — `useLens(lens: LensSession, questions: ReadableStore<QuestionsSnapshot>): void`.** It holds no React state. It has three effects:
  1. **Draw.** It reads the lens snapshot and the questions snapshot through `useStoreSnapshot`, and draws `snapshot.highlighted` over the matching `instances` with `drawLens`, or calls `clearLens` when there are none. Its deps are `[highlighted, instances]`, as today (`useLens.ts:51-62`), and its cleanup clears.
  2. **Listeners.** They are added when `isPicking` becomes true and removed when it becomes false; the deps are `[picking, lens, questions]`. Each handler reads `questions.getSnapshot().instances` at event time, so an instance change re-adds nothing.
     - The capture `click` handler is `if (lens.choose(gateIdAt(document, x, y, instances))) { event.preventDefault(); event.stopPropagation(); }`, decided synchronously inside the capture listener.
     - `pointermove` calls `lens.hover(gateIdAt(...))`.
     - `keydown` calls `lens.cancel()` on `Escape`.
  3. **Exit on unmount.** An effect with `[lens]` deps whose cleanup calls `lens.cancel()` (D-05).

  Every `document` reference stays inside an effect, as today (`useLens.ts:9-11`).
- **D-15 — a regression check, shown RED on the base: entering picking adds exactly three document listeners, and a registry change while picking adds none.**
  - **How:** spy on `document.addEventListener`/`removeEventListener`, enter picking, push a changed instance list through the questions store, and count. Today each instance change removes and re-adds all three (`useLens.ts:105`), so the test is RED on the base and recorded in `80-RED-EVIDENCE.md`.
- **D-16 — a hover over the same guard publishes nothing and redraws nothing. This is a behaviour change and gets an ADR-QD-193 row.**
  - **Today:** every `pointermove` sets a fresh `[id]` (`useLens.ts:72`), which re-renders the panel and re-runs `drawLens`, which replaces the overlay element.
  - **Characterisation first, on the base:** two `pointermove`s over one guard leave a different overlay element. After the change it is the same element.

### Area 5 — `QuestionsPanel`'s `lens` prop and the test seam (LENS-03)
- **D-17 — `QuestionsPanelProps` gains `readonly lens: LensSession`, required.**
  - **How the panel uses it:** it calls `useLens(lens, questions)`, reads the lens snapshot through `useStoreSnapshot`, and passes the snapshot and the session down. The local `type Lens = ReturnType<typeof useLens>` (`QuestionsPanel.tsx:141`) is deleted.
  - **Where the props come from:** `PickButton` reads `isPicking` and calls `toggle`. `Question` calls `highlight`. `InstanceRow` reads `pickedOf(...) === instance.id` and `takeReveal` (D-06).
  - **The dock:** `DevtoolsDock`'s `questions` screen passes `lens={props.model.lens}` (`DevtoolsDock.tsx:267-274`).
  - **No visible markup, copy, test id or style changes.**
- **D-18 — `test/react/questionsPanelInput.ts` stays the one seam.**
  - **What it returns:** `panelInput` returns `{ questions, lens }`, with a fresh `makeLensSession()` per call unless the caller passes one: `panelInput({ questions, gates, lens? })`. A test that re-renders and must keep its lens passes the same session.
  - **What does not move:** the 42 routed renders (24 in `QuestionsPanel.gates.test.tsx`, 17 in `QuestionsPanel.test.tsx` and 1 in `VerdictTreatment.test.tsx`) change no line. The seam's header comment gains one sentence.
- **D-19 — the existing lens cells keep their assertions.** `QuestionsPanel.gates.test.tsx`'s highlight and pick cells (`:203-420`) and `Lens.test.ts` keep passing unedited.
  - **The highlight-and-unmount cell** (`:252-264`) still holds: unmount clears the overlays, through the draw effect's cleanup and through `cancel()`.
  - **"stops listening when the panel unmounts"** (`:394-420`) still holds.
  - A pinned-test check script (D-24) holds these cells byte for byte from the phase base.

### Area 6 — `QadiContextValue.instrument` (LENS-05)
- **D-20 — removed. The provider's `instrument` prop stays.**
  - **Evidence:** the repository-wide search, D-22.
  - **Why removal:** a public field with no reader and no stated first reader is surface that promises something nothing keeps. Whether a guard registers is decided by the writer the provider resolves once (`QadiProvider.tsx:203-208`), which ADR-QD-111 put out of `QadiContextValue` on purpose (`111-…md:36-41`, `:107`). A host that wants to know whether it instrumented reads the value it passed.
  - **Rejected: keep it with a recorded first reader.** None exists: `useDevtoolsFeed` reads `atoms`, `registry` and `gates` (`DevtoolsFeed.ts:126`), and the gates read the writer.
- **D-21 — what moves with the removal:**
  - **`QadiProvider.tsx`:**
    - the field and its doc (`:53-62`);
    - the doc comment at `:91` that names `instrument` among the fields read through `useQadiContext`, which becomes `atoms` and `gates`;
    - the `useMemo` at `:306-309`, which becomes `({ atoms, registry, gates })` with deps `[atoms, registry, gates]`. The per-context rationale in the removed doc ("per authorization context … a test can turn it on without touching process state") moves to the prop's doc at `:151`, where it is still true.
  - **One behaviour change:** toggling `instrument` no longer gives `QadiContext` consumers a new value. Guards still re-register and unregister through `GateScopeContext`, whose `writer` follows `instrument`. Characterisation first, on the base: a `useQadiContext` consumer that reads `atoms` re-renders when `instrument` toggles, and a `<Can>` registers on toggle-on and unregisters on toggle-off. After the change, the consumer does not re-render and the guard rows are unchanged. ADR-QD-193 row.
  - **Type pin:** in a new `packages/react/test/QadiProvider.tst.ts`, `expect<keyof QadiContextValue>().type.toBe<"atoms" | "registry" | "gates">()` (positive). It has an `@ts-expect-error` reading `.instrument` beside a positive twin reading `.gates`. It adds no `not.toBeCallableWith`/`not.toBeConstructableWith` pin, so `NOT_CALLABLE_PIN_BUDGET` and its AGENTS.md §6 table stay unmoved.
  - **Records:**
    - a **Breaking** `@qadi/react` minor changeset;
    - an upgrade-guide section in the 0.13 block of `apps/website/src/content/docs/docs/reference/upgrading.md`, after `## 0.13: a timeline store owns its capacity` (`:1219`) and Phase 79's section, titled "`QadiContextValue` no longer carries `instrument`". Any fence in it is compiled by `pnpm spec:website-examples`;
    - a `spec/overview.md` revision line for the `QadiContextValue` row (`:570`; the type is still exported, so the row stays);
    - a dated ADR-QD-111 amendment correcting its "`QadiContextValue`, which is public, is unchanged" sentence (`:40`).
- **D-22 — the repository-wide search (run 2026-11-24 at `589c774d`).**
  - **Searches run:**
    - `QadiContextValue` outside `lib/`, `node_modules/` and `.planning/` appears only in `QadiProvider.tsx`, comments in `useGate.ts:10` and `:139`, `spec/overview.md:570`, ADR-QD-111, CCR-QD-388 and two CHANGELOG lines.
    - `.instrument` as a property read, and `instrument` destructured from `useQadiContext`/`useContext`, have no hit in `packages/*/src`, `packages/*/test`, `examples/`, `apps/` (the website lives at `apps/website/`), `features/`, `spec/` or `scripts/`.
    - Every other `instrument` hit is the provider prop: `examples/nextjs-newsroom/src/client/Providers.tsx:59` and `:79`, `src/ui/Shell.tsx:43` and `:55`, `app/page.tsx:76`, `apps/website/.../packages/react/hooks.md:36`, and `packages/react/test/support/trees.tsx:54`.
    - `scripts/check-package-install.mjs` names neither the field nor the type.
  - **Rerun:** the plan reruns the search at its own base and records the result in the summary.

### Area 7 — Records, numbers and mutation (LENS-02, WX-02, WX-05)
- **D-23 — the records.**
  - **ADR-QD-193** ("The highlight lens is a headless session the dock model owns"):
    - D-04..D-21;
    - a before/after table of the four behaviour changes: the pick survives a tab switch, a pick reveals once, highlight-while-picking ends picking, and same-hover publishes nothing;
    - why `resolveHeld` is not reused;
    - a dated amendment of ADR-QD-185 (ten stores; the lens is a store and not a computed one, so it is not a derived store);
    - a dated amendment of ADR-QD-047 (the lens joins the headless model);
    - the dated ADR-QD-111 amendment (D-21).

    It also gets an `index.yaml` entry and a trace row. ADR document ids equal the file number (gate 10).
  - **BEH:**
    - BEH-QD-736: the lens is a headless session, and a no-op publishes nothing;
    - BEH-QD-737: a click is consumed only by a pick that found a guard, decided in the capture listener;
    - BEH-QD-738: leaving the React panel ends picking and clears the highlight, and the pick is kept;
    - BEH-QD-739: a picked row reveals itself once per pick, and a pick whose guard has gone marks no row and moves to no other;
    - BEH-QD-740 (in `spec/behaviors/09-react.md`): `QadiContextValue` is the atoms, the registry and the gates, and instrumentation is the provider's prop.
    - BEH-QD-700 is restated: "nine" becomes "ten", and `lens` is added to its requirement list.
    - BEH-QD-234's exits paragraph is restated: the toggle, the pick, `Escape`, a highlight, and leaving the panel.
  - **INV:**
    - INV-QD-405: the lens snapshot admits no pick while picking and at most one drawn guard while picking;
    - INV-QD-406: lens mode never outlives the panel's listeners, and no overlay outlives the panel;
    - INV-QD-390 is amended: the lens is the tenth store and not a computed one;
    - INV-QD-107's Source/Enforcement gains the lens pick.
  - **Devtools spec:**
    - a dated "Noted 2026-11-24" under `spec/devtools-spec/01-shell.md:72`: the built lens lives in the React panel, so leaving that panel is the exit `:72` names. This is a note, not a claim of absence, so gate 12 is unaffected;
    - `02-screens.md` §7 says the pick is kept across a tab switch, as 0.13 did for §3 and §4.
  - **Other records:**
    - a CCR-QD-472 row naming each document at its HEAD revision;
    - a traceability row;
    - `spec-revise --date 2026-11-24` for every revision line;
    - a `@qadi/devtools` **patch** changeset stating the four behaviour changes, with no API change, because `LensSession` and `QuestionsPanel` are package-private.
- **D-24 — characterisation and pinned files held by script, the Phase 79 pattern.**
  - **Characterisation files**, written on the phase base, green there, and held to their first commit by recorded content hash (`80-characterisation-check.mjs`, copied from `79-characterisation-check.mjs`):
    - `packages/devtools/test/react/Lens.dock.characterisation.test.tsx`, through `DevtoolsDock`; it does not import `questionsPanelInput.ts`, `dockModelFixtures.ts` or `helpers.ts`;
    - the `@qadi/react` toggle characterisation (D-21).
  - **The four changing behaviours** (D-07, D-12, D-16, D-21) are written in those files on the base and flipped by the change. The script compares every other assertion byte for byte, and the flips are listed in `80-RED-EVIDENCE.md` with the base commit.
  - **`80-pinned-check.mjs`** holds the lens cells of `QuestionsPanel.gates.test.tsx` and `Lens.test.ts` unedited from the base (D-19).
- **D-25 — mutation (WX-05).**
  - **The scorer:** copy `79-mutation.mjs` to `80-mutation.mjs`, with two groups:
    - `DockModel.ts`: base and close, on the same invocation, `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/DockModel.ts`;
    - `LensSession.ts`: new, so close-only. Its bar is set at its first commit: a score of 1, no open mutant, and every ignored mutant listed with its reason.
  - **Order:** commit the `DockModel.ts` base record alone, first, at the phase base. Re-close both groups after the code review, on one commit, with `compare` exiting 0. `DockModel.ts` holds its score of 1 (ADR-QD-168's record, carried by `79-mutation-close.json`).
  - **`@qadi/react`:** `QadiProvider.tsx` is not in `stryker.react.mjs`'s `mutate` list (`:55-60`), so it gets no mutation group. Record this in the base file rather than widening the glob.
  - **Budgets:** none moves.
    - `MODULE_STATE_BUDGET`: the session's `let`s are inside `makeLensSession`, not at module scope.
    - `SWITCH_BUDGET` and `UNTRACED_BUDGET`: no new `switch` and no new `Effect.fnUntraced`.
    - `NOT_CALLABLE_PIN_BUDGET`: no negative callable or constructable pin (D-21).
    - `ANY_BUDGET` and `DECISION_READ_BUDGET`: no `any`, and no `AsyncResult` read.
    - No `as`, `!` or `Record<string, unknown>`.

### Area 8 — UI
- **D-26 — No markup, copy, test id, style, colour or layout changes.** Four interaction rules change (D-04/D-06, D-12, D-16, D-21); each is covered by characterisation tests and an ADR-QD-193 row:
  - **The pick after a tab switch:** returning to the React tab now shows the picked row still marked, with its existing `data-qadi-picked` background, and does not scroll. Before, the row was unmarked.
  - **Highlight while picking:** the highlight button pressed while picking now ends picking (the pick button's existing text returns to "pick a control on the page") and the overlays stay. Before, picking stayed on and the overlays vanished on the next pointer move.
  - **Hover over one guard:** it no longer re-renders the panel or replaces the overlay element on every pointer move. No pixel changes.
  - **Toggling `instrument`:** it no longer re-renders `QadiContext` consumers that do not register guards. Not a devtools visual.

  **Recommendation to the orchestrator:** a UI-SPEC is not warranted. The changes are interaction-state rules with no new visual surface, and the Workflow note below records the resolution.

### Claude's Discretion
These must all keep D-04..D-21:
- the exact names of the readings (`pickedOf`, `isPicking`) and of `takeReveal`;
- whether the tagged-enum constructors are exported from `LensSession.ts` or kept module-local;
- the file names of the new tests, apart from the characterisation file named in D-24;
- the plan split and wave order: characterisation and RED first, then the `DockModel.ts` base mutation record, then the session and the model, then the adapter and the panel, then `instrument`, then records, then the mutation close and the gate.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExternalStore.ts`:
  - `makeExternalStore`, whose `publish` notifies unconditionally, so a session decides its own no-op;
  - `sameElements`, for `highlight`'s no-op check;
  - `ReadableStore`.
- `DockSession.ts`: the precedent for a plain `make…` session with closure state, one `commit()` per effective command, and no scope.
- `HeldChoice.ts`: the value-held, never-swapped eviction rule (D-08), cited rather than called.
- `Gates.ts`:
  - the `GatesView`/`QuestionsView` `Data.taggedEnum` precedent for the snapshot's arms;
  - `QuestionsSnapshot.instances`, the list the listeners read at event time;
  - `locatableIds`.
- `react/Lens.ts`: `gateIdAt`, `boxesOf`, `drawLens` and `clearLens`, unchanged and still the only element-measuring module (AGENTS.md §13).
- `react/useStoreSnapshot.ts`: the panel's and the adapter's subscription.
- Phase 79's `79-mutation.mjs`, `79-characterisation-check.mjs`, `79-pinned-check.mjs` and `79-RED-EVIDENCE.md`: the patterns for `80-mutation.mjs`, the two check scripts and the evidence file.

### Established Patterns
- A headless model holds the rules, and a thin React adapter decides nothing (`useDockModel.ts`, ARCH-74, ADR-QD-047). A command that changes nothing publishes nothing (`DockSession.test.ts`).
- The dock owns every screen's choice, so a tab switch is not a choice (INV-QD-107). An act (replay, highlight) is a command, never held state (ARCH-63).
- `@qadi/react` calls no DOM API, and every `document` call in devtools is inside an effect (AGENTS.md §13).
- Characterisation files are held to their first commit by a recorded hash (Phases 74, 75 and 79). The mutation base is committed alone, first, and re-closed after review.
- Doc-comment shape: a one-line summary first, then the why.

### Integration Points
- `packages/devtools/src/model/DockModel.ts`: the `DockModel` interface (`:215-241`), `makeDockModel` (`:317-443`) and the return record (`:426-442`).
- `packages/devtools/src/react/DevtoolsDock.tsx:267-274`: the `questions` screen, which passes `lens`.
- `packages/devtools/src/react/QuestionsPanel.tsx`: the props (`:50-79`), the `useLens` call (`:106`), the `Lens` alias (`:141`), `gatesBlock`/`questionsBlock` (`:150-191`), `Question` (`:194-240`), `InstanceRow` (`:243-288`) and `PickButton` (`:290-301`).
- `packages/devtools/src/react/useLens.ts`: rewritten whole.
- Tests:
  - `packages/devtools/test/model/DockModel.test.ts:1791-1816` (the store list);
  - `packages/devtools/test/model/ConfigureRule.test.ts:583-600` (`storesOf`/`storeNames`);
  - `packages/devtools/test/react/questionsPanelInput.ts` (the seam);
  - `packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx`: Phase 79's hash-held file. It reads `model.diagnostics`, `model.questions` and the gates store and enumerates no members, so a tenth member does not touch it. The plan confirms this by rerunning `79-characterisation-check.mjs` at close.
- `packages/react/src/QadiProvider.tsx`: `:51-68`, `:91`, `:151`, `:306-309`.
- Docs:
  - `apps/website/src/content/docs/docs/reference/upgrading.md` (the 0.13 block);
  - `spec/overview.md:570`;
  - `spec/behaviors/28-devtools-screens.md` (BEH-QD-234 at `:559`, BEH-QD-700 at `:1082`);
  - `spec/behaviors/09-react.md`;
  - `spec/invariants.md` (INV-QD-107 at `:3405`, INV-QD-390 at `:4502`);
  - `spec/devtools-spec/01-shell.md:72` and `02-screens.md` §7;
  - ADR-QD-047, ADR-QD-111 and ADR-QD-185.
</code_context>

<specifics>
## Specific Ideas

- The adapter's sketch. The names are the planner's:
  ```text
  draw:      useEffect(() => highlighted.length === 0 ? clearLens(document)
                        : (drawLens(document, boxesOf(instances.filter(i => highlighted.includes(i.id)))), () => clearLens(document)),
                        [highlighted, instances])
  listen:    useEffect(() => { if (!picking) return; add move/click(capture)/keydown, each reading questions.getSnapshot().instances;
                        return remove all three }, [picking, lens, questions])
  exit:      useEffect(() => () => lens.cancel(), [lens])
  ```
- The headless pins read as a table of `(state, command) -> (state, publishes, returns)` rows covering every cell of D-11, plus a model-based property over random command sequences. Its checks: `Picking` never carries a pick; `Picking`'s drawn set has length at most 1; a command that leaves the snapshot `===` publishes nothing; `takeReveal(id)` is `true` at most once per `choose(id)`.
</specifics>

<deferred>
## Deferred Ideas

- `01-shell.md`'s lens design (a toolbar crosshair, a popover with the gate's verdict and explanation, and "Open in inspector →") was never built. The built pick selects the row in the React panel. Building the popover is a feature for a later wave; this phase only adds the dated note in D-23.
- Exporting the lens session from `@qadi/devtools`' barrel: out of scope per the ROADMAP.
- A stated "the guard you picked has unmounted" line in the panel: rejected for now (D-08). It is a UI change for a phase that wants a UI-SPEC.
- Carried from v1.7, unchanged: aligning `@qadi/react`'s swallowing gate registry with ADR-QD-177's rethrow contract, and guarding the feeds' publish-between-`begin()`-and-`fork()` window.
</deferred>

## Workflow note (decided autonomously, 2026-11-24)

Phase 80 edits `QuestionsPanel.tsx`, `DevtoolsDock.tsx` and `useLens.ts`, but it adds or changes no rendered markup, copy, test id, styling or layout (D-26). Its four interaction-rule changes are covered by characterisation tests and ADR-QD-193 rows, not by a design contract. The recommended resolution is the one Phases 78 and 79 recorded: the orchestrator sets the ROADMAP Phase 80 line to `**UI hint**: no`, with this note as the reason, so the UI-SPEC step and the post-wave `ui-safety-gate` do not treat a hook or a `.tsx` test file as a visual surface. The ROADMAP edit is left to the orchestrator.
