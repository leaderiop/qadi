# ADR-QD-193 — The highlight lens is a headless session the dock model owns

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-193                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-24                                     |
> | Status         | Accepted — amends ADR-QD-185, ADR-QD-047 and ADR-QD-111 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-24): Initial (ARCH-127) |

---

## Context

The highlight lens points at the guards a page draws, in both directions: the panel draws an overlay over the guards a
question names, and the reader picks a guard off the page to find its row (BEH-QD-234). Its state and its rules lived in a
React hook, and a field of the provider's context had no reader.

- **Three `useState`s, and the rules in DOM handlers.** `useLens` held `highlighted`, `picking` and `picked`, and its rules
  sat in the `pointermove`, capture-phase `click` and `keydown` handlers and in the toggle: a click is swallowed only when a
  guard was found, `Escape` ends picking and clears the drawing and leaves the pick, entering picking drops the pick, and a
  pointer over nothing clears the drawing. Only DOM tests reached them, so they were outside the model's tests and outside
  the `src/model/**` glob `stryker.devtools.mjs` mutates, the defect class `ExplorerSession.ts` records fixing.
- **Listeners re-added on every change in the listed guards.** The listener effect depended on `[picking, instances]`, so
  every change of the registry while picking removed and added all three document listeners again.
- **The lens lived as long as its tab.** `useLens` ran inside `QuestionsPanel`, and `DevtoolsDock` unmounts a panel on a tab
  switch, so a pick was forgotten on every tab round trip. INV-QD-107 says a screen's choice must survive leaving the
  screen and returning to it, and every other choice the dock holds already does: the tab, the filters and the selection
  are `DockSession`, the explorer is `ExplorerSession`, and the roles are `HeldChoice`.
- **A context field with no reader.** `QadiContextValue.instrument` was public, and nothing read it. A guard learns
  whether it is instrumented from the writer the provider resolves once and hands through `GateScopeContext`
  (ADR-QD-111), so the field was surface that promised something nothing kept.

## Decision

1. **The lens is a headless session, `makeLensSession()`, package-private.** It lives in `packages/devtools/src/model/LensSession.ts`,
   is in neither barrel (ADR-QD-099), takes no scope and no input, and is built on `makeExternalStore` as `makeDockSession`
   is: each command that changes the snapshot publishes it once, and a command that changes nothing publishes nothing and
   keeps the snapshot's reference, so a reader does not render for it. The snapshot is a closed two-arm union built with
   `Data.taggedEnum` and read through `Match.tagsExhaustive`, never a `switch`:

   ```ts
   export type LensSnapshot = Data.TaggedEnum<{
     Idle: { readonly highlighted: ReadonlyArray<string>; readonly picked: string | undefined };
     Picking: { readonly highlighted: readonly [] | readonly [string] };
   }>;

   export interface LensSession extends ReadableStore<LensSnapshot> {
     readonly toggle: () => void;
     readonly hover: (id: string | undefined) => void;
     readonly choose: (id: string | undefined) => boolean;
     readonly cancel: () => void;
     readonly highlight: (ids: ReadonlyArray<string>) => void;
     readonly takeReveal: (id: string) => boolean;
   }
   ```

   `pickedOf(snapshot)` and `isPicking(snapshot)` read the arms. A `Picking` snapshot has no `picked`, so a pick while
   picking cannot be written; entering picking drops the pick and the only way to set one ends picking, so the code before
   ADR-QD-193 never reached that state either. While picking the drawn set is the guard under the pointer or nothing, so the
   tuple type makes two drawn guards while picking unwritable. Three flat fields were rejected: they admit both illegal
   states.

2. **The transitions are one table.** Each row publishes only when the snapshot changes.

   | Command | From `Idle { h, p }` | From `Picking { h }` | Returns |
   | ------- | -------------------- | -------------------- | ------- |
   | `toggle()` | `Picking { [] }`, reveal disarmed | `Idle { [], undefined }` | nothing |
   | `hover(id)` | no-op | `Picking { [id] }`, or `Picking { [] }` for `undefined`; the same guard is a no-op | nothing |
   | `choose(id)` | no-op | a guard: `Idle { [], id }` and the reveal armed for it; `undefined`: no-op | `true` only when it moved to `Idle` with a pick |
   | `cancel()` | `Idle { [], p }`; a no-op when nothing is drawn | `Idle { [], undefined }` | nothing |
   | `highlight(ids)` | `Idle { ids, p }`; the same elements in the same order are a no-op | `Idle { ids, undefined }`, ending picking | nothing |
   | `takeReveal(id)` | `true` once, if armed for `id` | the same | a boolean; never publishes |

   `choose` answers whether the click it was given is consumed, so the adapter decides it synchronously inside the capture
   listener: a click is swallowed only by a pick that found a guard, and an idle lens never swallows one. `hover` and `choose`
   from `Idle` are reachable only headlessly, because the adapter listens only while picking; they are pinned so that an idle
   lens fails closed. There is **no `clear` command**: each outcome it would have is already another command's, `cancel()` or
   `highlight([])` from `Idle` and `hover(undefined)` from `Picking`, and no caller would read a second name for a transition
   that exists. "Draw nothing" is `highlight([])` while idle and `hover(undefined)` while picking.

3. **A highlight asked for while picking ends picking and draws the guards asked for.** The dock is not inside a guard, so
   its highlight button's click goes through the capture listener, and the code before ADR-QD-193 drew the guards while
   picking stayed on, so the next `pointermove`, over the dock, wiped them. The highlight is the reader's explicit act, so it
   wins; this keeps BEH-QD-234's "the dock's own controls keep working while the mode is on", and is a fourth exit from
   picking beside the toggle, the pick and `Escape`.

4. **A hover over the guard already drawn publishes nothing and redraws nothing.** Every `pointermove` set a fresh `[id]`
   before, which re-rendered the panel and replaced the overlay element. The session compares the guard it holds with
   `sameElements` and answers the same snapshot.

5. **The dock model's tenth store is `lens`.** `makeDockModel` builds the session beside `dock` and returns it as a member
   of `DockModel`. It has no input, so `configure` touches nothing of it and a `configure` publishes nothing on it, and it
   is a store the model builds and no input computes, so it is not a derived store and the derived-store rule of ADR-QD-185
   does not reach it. BEH-QD-700 lists the stores once and `DockModel.test.ts`'s store-list test holds that list.

6. **`useLens(lens, questions)` is the document adapter, with three effects and no React state.**
   - **Draw.** It reads the session snapshot and the questions snapshot through `useStoreSnapshot` and draws
     `snapshot.highlighted` over the matching instances with `drawLens`, or calls `clearLens` when there are none. Its
     dependencies are `[highlighted, instances]` and its cleanup clears.
   - **Listeners.** It adds the three document listeners when the snapshot becomes `Picking` and removes them when it stops
     being so, with dependencies `[picking, lens, questions]`. Each handler reads `questions.getSnapshot().instances` when
     the event arrives, so a change in the listed guards adds and removes nothing.
   - **Exit on unmount.** An effect keyed on `[lens]` alone whose cleanup calls `lens.cancel()`. It is its own effect because
     the listeners' effect re-runs on every mode change: a `cancel()` in its cleanup would wipe a highlight that
     `highlight` had just drawn while ending picking (decision 3).

   Every `document` reference stays inside an effect, and `@qadi/react` calls no DOM API (AGENTS.md §13).
   `QuestionsPanel` takes a required `lens` prop, `DevtoolsDock` passes `props.model.lens`, and no markup, copy, test id or
   style moves.

7. **A tab switch keeps the pick and ends picking and the drawing.** Leaving the panel unmounts it and so runs the exit.
   - **The pick is kept**, by INV-QD-107. It is the reader's choice of a row, and the screen's choice must survive leaving
     the screen and returning to it.
   - **Picking ends.** `spec/devtools-spec/01-shell.md:72` says "opening the inspector exits lens mode", and in the built dock
     the lens lives in the React panel, so leaving that panel is that act; BEH-QD-234's unmount exit ends it there. A model
     left in `Picking` with no listeners attached would be a mode nobody can see and nothing can exit, which BEH-QD-234's
     "Picking MUST have an exit" forbids.
   - **The drawing is cleared.** A highlight is an act ("show me these guards now"), like a replay, and not a held choice.
     Redrawing it when the reader returns would draw over the host page unasked, and BEH-QD-234 already requires that
     unmounting removes every overlay.

   The model adds no tab rule of its own. `DockModel` subscribing the lens to `dock.tab` was rejected: it writes the one
   rule twice, since the adapter's cleanup is needed either way for a panel that unmounts for any reason other than a tab
   change, and it couples two stores ADR-QD-185 keeps independent.

8. **A picked row reveals itself once per pick, never on a remount.** With the pick kept, a row that marks itself picked on
   mount would scroll the panel at every return to the tab. `choose` arms a one-shot reveal for the chosen guard before it
   publishes, so a listener told of the pick can take it, and `takeReveal(id)` answers `true` once, for that guard only, and
   disarms it. `toggle` disarms it, and `takeReveal` publishes nothing, because it is an event and not state. The row's
   effect is `if (picked && session.takeReveal(instance.id)) node.current?.scrollIntoView(...)`. A row not rendered when the
   pick happened reveals itself the first time it mounts after the pick, which is the first reveal and not a re-fire, and
   under StrictMode the double-mounted effect takes the reveal on its first run and reads `false` on its second. A `useRef`
   "mounted already picked" guard in the row was rejected: it keeps the rule in React, outside the mutation gate, and it
   would skip that first reveal.

9. **The pick is held by its guard's id, the way `HeldChoice` holds a value, and is never moved to another guard.** Only
   `choose` or `toggle` replaces it. A guard that has gone has no row, so its pick marks nothing, and the panel already
   states the guard's absence on its question row ("asked, nothing mounted"). What fits from `HeldChoice` is the rule that
   an evicted value is kept, never silently swapped for a neighbour or reset. **`resolveHeld` is not reused**, for two
   reasons: it reads "nothing held" as the head of the list, so for the lens it would mark the first guard as picked when
   nothing is, and it answers an index that nothing reads, because each row compares `pickedOf(snapshot) === instance.id`.
   A note that the picked guard unmounted was rejected: it is new copy and a visible change, and the question row already
   says it.

10. **A remounted guard registers under a new id, so keeping the id cannot attach a pick to another guard.** A gate id is
    React's `useId`, and the registry disambiguates a live collision. The evidence was measured on the code before
    ADR-QD-193 and is split between two packages, because `@qadi/devtools` does not import `@qadi/react` (ADR-QD-053):
    `packages/react/test/GateId.remount.test.tsx`, "a guard unmounted and mounted again in the same position registers
    under a new id", mounts a real `QadiProvider` and asserts the second id differs from the first, and the dock cell "a pick
    whose guard unmounted marks no row, and the guard mounted in its place is not marked" in
    `packages/devtools/test/react/Lens.dock.characterisation.test.tsx` asserts the panel half through a registry double that
    gives the new guard its own id. The branch taken is therefore that the id is held and nothing drops the pick, and the
    session has no `retain(ids)` command. Had the measurement found an id reused, the pick would have been dropped when its id
    left the list, through a `retain(ids)` command called from the questions store; that command is not built.

11. **`QadiContextValue` is `atoms`, `registry` and `gates`: it drops `instrument`.** A repository-wide search found no
    reader of the field: the one `.instrument` property read is a test helper's own options object passed on as the
    provider's prop, every consumer of `useQadiContext` destructures other fields, and no example, app, feature or script
    reads it. The provider's `instrument` prop stays, and whether a guard registers is still decided by the writer the
    provider resolves once from it and hands through `GateScopeContext`, which ADR-QD-111 kept off the public value on
    purpose; a host that wants to know whether it instrumented reads the value it passed. The context's value is memoised
    on `[atoms, registry, gates]`, so a toggle of `instrument` hands a consumer no new value. A first reader was not
    recorded: `useDevtoolsFeed` reads `atoms`, `registry` and `gates`, and the gates read the writer. This is a breaking
    change to a public type, a **Breaking** `@qadi/react` minor.

### What changes for a reader

Four interaction rules and the instrument toggle change; no markup, copy, test id, style, colour or layout does. Each row
names the test that holds its after.

| Behaviour | Before | After | Held by |
| --------- | ------ | ----- | ------- |
| The pick after a tab switch | A pick, then a switch to the log and back: the row is not marked, picking is off, no overlay remains, and the pick button reads "pick a control on the page" | The row is still marked with its existing `data-qadi-picked` background, and the panel does not scroll on the return; picking is off and no overlay remains | `Lens.dock.characterisation.test.tsx`, "a pick, then a switch to the log and back"; `Lens.dock.test.tsx`, "under StrictMode a pick reveals its row once, and after a switch to the log and back the row is still marked with no second reveal" |
| The reveal | The row's effect scrolls it into view whenever it mounts picked | It scrolls once for the pick that was made | `LensSession.test.ts`, "a pick reveals its row once, and only for its own guard; toggle disarms a reveal that was not taken; takeReveal publishes nothing" |
| Highlight pressed while picking | Picking stays on, the overlays are drawn, and the next pointer move over the dock removes them | Picking ends and the overlays stay | `Lens.dock.characterisation.test.tsx`, "the highlight button pressed while picking"; `LensSession.test.ts`, the cell whose title ends "highlight while picking ends picking and draws the guards asked for" |
| Two pointer moves over one guard | The panel re-renders and the overlay element is replaced each time | Nothing is published and the overlay element is the same | `Lens.dock.characterisation.test.tsx`, "two pointer moves over one guard while picking"; `LensSession.test.ts`, the cell whose title contains "a hover over the guard already drawn publishes nothing" |
| A change in the listed guards while picking | The three document listeners are removed and added again | Nothing is removed or added | `Lens.dock.test.tsx`, "entering picking adds three document listeners, and a change in the listed guards while picking adds none" |
| Toggling `instrument` | A memoised consumer of the context renders once more | It does not render, and a `Can` still registers on toggle-on and unregisters on toggle-off | `InstrumentToggle.characterisation.test.tsx`, "a memoised consumer of the context renders again when instrument is toggled" (its assertion is the render count, now zero) and "a Can registers when instrument is turned on and unregisters when it is turned off"; `QadiProvider.tst.ts` |

## Alternatives considered

- **Everything persists across a tab switch.** It redraws an overlay over the host page unasked and leaves a model in
  `Picking` with nothing listening, a mode nobody can see and nothing can exit.
- **Nothing persists.** The code before ADR-QD-193. It breaks INV-QD-107 for the one screen choice the dock still dropped.
- **`DockModel` subscribing the lens to the dock's tab.** Decision 7.
- **Three flat fields for the snapshot.** Decision 1.
- **A `useRef` guard in the row for the reveal.** Decision 8.
- **A note that the picked guard unmounted.** Decision 9.
- **Reusing `resolveHeld`.** Decision 9.
- **Keeping `instrument` on the context with a first reader.** None exists, and a public field with no reader and no stated
  first reader promises something nothing keeps.
- **A `clear` command.** Decision 2.

## Consequences

1. The lens's rules are pinned by plain calls and fall under the model's mutation gate, because the session lives in
   `src/model/`. The hook decides nothing.
2. A pick survives a tab round trip, and picking, the drawing and the reveal do not. Four interaction rules and the
   instrument toggle change, as the table says.
3. `DockModel` has ten stores, and `configure` publishes nothing on the tenth.
4. Breaking for `@qadi/react`, a minor release marked **Breaking**: `QadiContextValue` is `atoms`, `registry` and `gates`. A
   host that read `instrument` from `useQadiContext` reads the value it passed to the provider.
5. Patch for `@qadi/devtools`: behaviour only, no export moves, because `LensSession` and `QuestionsPanel` are
   package-private.
6. A pick for a guard that has gone stays held until `choose` or `toggle` replaces it, and marks no row meanwhile.

ADR-QD-185 gains a dated amendment (ten stores, and the lens is a store and not a computed one), ADR-QD-047 gains one
(the lens is model too) and ADR-QD-111 gains one (the public value drops `instrument`); none is rewritten.

## What enforces it

**The session.** `packages/devtools/test/model/LensSession.test.ts` pins every row of decision 2 by plain calls, each seen
failing against an inert stub and an eager one before the module existed: a new session is idle; toggle, hover, choose,
cancel and highlight from each arm, with the publish count of each; "highlight with no guards while idle draws nothing and
keeps the pick"; "a repeated cancel, hover or highlight publishes once"; "a listener told of a pick can take its reveal";
"a command run from inside a listener sees the snapshot already published"; and two properties over random command
sequences, "every sequence of commands keeps picking free of a pick and draws at most one guard while picking" and "a
command publishes exactly when the snapshot changes".

**The dock model.** `packages/devtools/test/model/DockModel.test.ts`: "a built model's members with subscribe and getSnapshot
are exactly this list" holds the ten members, and "a bare model holds the lens idle, with nothing drawn and nothing picked"
holds the bare store. `packages/devtools/test/model/ConfigureRule.test.ts` holds the sweep over the ten stores, so a
`configure` that moves nothing, or moves any input, never makes the lens publish (the cells CR16 to CR20 and CR22, CR22's
title listing ten counts).

**The adapter and the panel through the dock.** `packages/devtools/test/react/Lens.dock.test.tsx` holds decision 6's
listeners and decision 8's single reveal under StrictMode. `packages/devtools/test/react/Lens.dock.characterisation.test.tsx`
was written before the hook changed and is held to its first commit by a recorded hash, with exactly four declared flips
(the pick kept, the highlight ending picking, the overlay surviving the next move, and the same overlay element); its other
cells hold what did not change: "a pick on a guard swallows its click and ends picking", "a click over no guard goes through
and picking stays on", "Escape after a pick keeps the pick", "entering picking again drops the pick, and leaving it does not
restore it", "a switch to the log while picking ends picking and leaves no listener", and the one-reveal line of the first
cell. `packages/devtools/test/react/QuestionsPanel.gates.test.tsx` and `Lens.test.ts` keep their lens cells, including
"removes its overlays when the panel unmounts" and "stops listening when the panel unmounts", held byte for byte from before.

**The context value.** `packages/react/test/QadiProvider.tst.ts` pins the key set as `"atoms" | "registry" | "gates"` and that
`instrument` is not a member, under both tstyche passes, and adds no negative callable or constructable pin, so
`NOT_CALLABLE_PIN_BUDGET` and its table in AGENTS.md are unmoved. `InstrumentToggle.characterisation.test.tsx` holds the
toggle, and `GateId.remount.test.tsx` holds decision 10's id.

**The scripts.** `bash spec/scripts/verify-traceability.sh --strict` holds this record's registration, tracing and revision,
`node scripts/spec-revise.mjs --check` holds every revision line, and `scripts/check-doc-examples.mjs` compiles the typescript
fences, of which this record has none: its listing is a `ts` fence, because `LensSession` is package-private.

## Related

- [ADR-QD-047](./047-a-headless-devtools-model.md) — the devtools is a headless model with a React shell over it; the lens joins the model; amended by this decision
- [ADR-QD-053](./053-a-gate-can-be-found.md) — a gate can be found; `@qadi/devtools` does not import `@qadi/react`, which splits decision 10's evidence
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — the session is out of both barrels
- [ADR-QD-111](./111-a-gate-writer-is-resolved-once-by-its-provider.md) — the writer is resolved once and stays off the context; its "unchanged" sentence is corrected by this decision
- [ADR-QD-185](./185-the-dock-models-computed-stores-are-derived-stores.md) — the lens is the tenth store and not a computed one; amended by this decision
- [BEH-QD-234](../behaviors/28-devtools-screens.md#beh-qd-234-the-lens-points-at-a-guard-in-both-directions) — the lens's exits and its unmount cleanup
- [BEH-QD-700](../behaviors/28-devtools-screens.md#beh-qd-700-the-dock-models-stores-are-listed-once) — the stores, now ten
- BEH-QD-736 to BEH-QD-740 — the behaviours that state this decision
- [INV-QD-107](../invariants.md#inv-qd-107-a-screen-never-changes-what-it-shows-without-the-reviewer) — leaving a screen and returning to it is not a choice
- [INV-QD-390](../invariants.md#inv-qd-390-the-dock-models-computed-stores-are-derived-stores-and-their-count-is-stated-once) — the dock model's stores and their count
- INV-QD-405 and INV-QD-406 — the lens snapshot admits no pick while picking, and lens mode never outlives the panel's listeners
