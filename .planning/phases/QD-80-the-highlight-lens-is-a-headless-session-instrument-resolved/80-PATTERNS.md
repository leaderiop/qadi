# Phase 80: The highlight lens is a headless session; `instrument` resolved - Pattern Map

**Mapped:** 2026-11-24
**Files analyzed:** 20 (code and tests; records listed once at the end)
**Analogs found:** 18 / 20 (records and the type pin follow CONTEXT D-23 / D-21 directly)

All analog paths below were verified git-tracked (`git ls-files` non-empty for `DockSession.ts`, `useLens.ts`; the rest are siblings in the same tracked trees). Line numbers are at `589c774d`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/LensSession.ts` (new) | model/session store | event-driven (commands -> snapshot) | `model/DockSession.ts` | exact |
| `packages/devtools/src/model/DockModel.ts` (mod) | model composition | pub-sub | itself (`dock`, `explorer` members) | exact |
| `packages/devtools/src/react/useLens.ts` (rewrite) | hook / DOM adapter | event-driven | old `useLens.ts` + `useStoreSnapshot.ts` | exact |
| `packages/devtools/src/react/Lens.ts` | utility | file-I/O (DOM) | unchanged (`gateIdAt`, `boxesOf`, `drawLens`, `clearLens` stay) | n/a |
| `packages/devtools/src/react/QuestionsPanel.tsx` (mod) | component | request-response | itself | exact |
| `packages/devtools/src/react/DevtoolsDock.tsx` (mod) | component | request-response | its sibling screens (`simulator: <Simulator session={props.model.simulation} />`) | exact |
| `packages/react/src/QadiProvider.tsx` (mod) | provider | request-response | itself (`GateScopeContext` value) | exact |
| `test/react/questionsPanelInput.ts` (mod) | test seam | transform | itself | exact |
| `test/model/LensSession.test.ts` (new) | test | CRUD | `test/model/DockSession.test.ts` | exact |
| `test/model/DockModel.test.ts`, `ConfigureRule.test.ts` (mod) | test | pub-sub | themselves | exact |
| `test/react/Lens.dock.characterisation.test.tsx` (new) | test | request-response | `test/react/ConfigureFirstRender.characterisation.test.tsx` (Phase 79) | role-match |
| `packages/react/test/QadiProvider.tst.ts` (new) | type test | n/a | other `*.tst.ts` (e.g. `packages/react/test/Hydration.tst.ts`) | role-match |
| `80-mutation.mjs`, `80-characterisation-check.mjs`, `80-pinned-check.mjs` (new) | script | batch | `79-*.mjs` in the Phase 79 directory | exact |

## Pattern Assignments

### `model/LensSession.ts` (session, event-driven)

**Analog:** `packages/devtools/src/model/DockSession.ts`

**Shape to copy** (`DockSession.ts:43-53`, `:63`, `:81-96`): an exported interface with `subscribe`/`getSnapshot` plus commands, a `make…` plain function (no Scope, no Effect), closure `let`s inside the function (never module scope: `MODULE_STATE_BUDGET`), a `build()` snapshot, and one `commit()` per effective command.

```ts
export const makeDockSession = (init: DockSessionInit): DockSession => {
  let tab: TabId = "log";
  ...
  const store = makeExternalStore<DockSnapshot>(build());
  const commit = () => store.publish(build());
  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    setTab: (next) => {
      if (next === tab) return;   // no-op publishes nothing
      tab = next;
      commit();
    },
```

**Imports** (`DockSession.ts:21-26`): relative with `.ts`, no-namespace for local modules:
`import { makeExternalStore, sameElements } from "./ExternalStore.ts";` (`sameElements` at `ExternalStore.ts:112`; `makeExternalStore` at `:69`; `publish` notifies unconditionally, so the session must decide no-ops itself).

**Snapshot arms** (copy `Gates.ts:262-276` precedent):
```ts
export type GatesView = Data.TaggedEnum<{ Absent: {}; Empty: {}; Listed: {}; Failed: { readonly reason: string } }>;
export const GatesView = Data.taggedEnum<GatesView>();
```
Use `import * as Data from "effect/Data"`. For `LensSnapshot` use `Idle: { highlighted: ReadonlyArray<string>; picked: string | undefined }` and `Picking: { highlighted: readonly [] | readonly [string] }` (D-10). Dispatch on the arm with a module-scope `Match.type<LensSnapshot>().pipe(Match.tagsExhaustive({...}))`, as `DiagnosticsFeed.ts:87` (`isUnsampled`) does, for `pickedOf` and `isPicking`; never `switch`.

**Doc-comment shape** (`DockSession.ts:1-20`): one-line summary, then the why (rules that lived in React, INV-QD-107, ADR-QD-099 package-private).

**Held-by-value rule to cite, not call:** `HeldChoice.ts:11-15` (an evicted value is kept, not swapped); `resolveHeld` reads "nothing held" as the head, so it is not reused (D-08).

**Reveal one-shot:** a closure `let armed: string | undefined`; `takeReveal(id)` returns a boolean and never calls `commit()` (D-06, D-11).

---

### `model/DockModel.ts` (modify)

- Interface member: add beside `dock`/`explorer` (`DockModel.ts:215-241`), one-line doc, e.g. `/** The highlight lens: what is drawn, and whether the reader is picking; no inputs, untouched by configure. */ readonly lens: LensSession;`
- Build it in `makeDockModel` (`:317+`) as `const lens = makeLensSession();` (plain call, like `dock`) and add `lens` to the return record at `:426-442` (after `roles`/`simulation`).
- Do not touch `configure` (`:396-424`) or the header's "Its stores" paragraph (`:29-34`).

### `react/useLens.ts` (rewrite as adapter)

**Analog:** current `useLens.ts` for the handler bodies and `useStoreSnapshot.ts:12-13` for reading stores.

Keep: `"use client"` and the header's "every `document` reference is inside an effect" (`:9-11`); imports `boxesOf, clearLens, drawLens, gateIdAt` from `./Lens.ts` (`:15`).
Draw effect carries over unchanged in shape (`:51-62`), with deps `[highlighted, instances]`:
```ts
useEffect(() => {
  if (highlighted.length === 0) { clearLens(document); return; }
  const wanted = instances.filter((instance) => highlighted.includes(instance.id));
  drawLens(document, boxesOf(wanted));
  return () => { clearLens(document); };
}, [highlighted, instances]);
```
Listener effect keeps the three add/remove calls (`:96-104`, capture flag `true` on click) but handlers call the session and read `questions.getSnapshot().instances` at event time; deps `[picking, lens, questions]` (was `[picking, instances]` at `:105`, the defect):
```ts
document.addEventListener("pointermove", move);
document.addEventListener("click", choose, true);
document.addEventListener("keydown", cancel);
```
`choose`: `if (lens.choose(gateIdAt(document, e.clientX, e.clientY, questions.getSnapshot().instances))) { e.preventDefault(); e.stopPropagation(); }`. Exit-on-unmount is its own effect: `useEffect(() => () => { lens.cancel(); }, [lens]);`. Return type `void`; the `Lens` interface and all `useState`/`useCallback` go away.

### `react/QuestionsPanel.tsx` (modify)

- Props (`:50-79`): add `readonly lens: LensSession`.
- `:104-106`: `const lens = useLens(snapshot.instances)` becomes `useLens(props lens, questions)`; read `const lensSnapshot = useStoreSnapshot(lens)` (`useStoreSnapshot.ts:12`).
- Delete `type Lens = ReturnType<typeof useLens>` (`:141`).
- `PickButton` (`:290-301`): `isPicking(snapshot)` replaces `lens.picking`, `onClick={lens.toggle}` replaces `togglePicking`; keep button text and `data-testid="qadi-pick"` verbatim.
- `InstanceRow` (`:243-256`): picked becomes `pickedOf(snapshot) === instance.id`; effect becomes
```ts
useEffect(() => {
  if (picked && lens.takeReveal(instance.id)) node.current?.scrollIntoView({ block: "nearest" });
}, [picked]);
```
- `Question` calls `lens.highlight(ids)`.

### `react/DevtoolsDock.tsx` (modify)

At `:267-274` add one prop to `QuestionsPanel`: `lens={props.model.lens}`, next to `questions={props.model.questions}`.

### `packages/react/src/QadiProvider.tsx` (modify)

- Delete the `instrument` field and its doc (`:53-62`); keep the per-context rationale by moving it to the prop's doc (`:151`).
- `:91` doc: fields read through `useQadiContext` become `atoms` and `gates`.
- `:306-309`: `useMemo(() => ({ atoms, registry, gates }), [atoms, registry, gates])`.
- `useGate.ts:10` and `:139` comments mention `QadiContextValue`; check wording.

### Tests

- `test/react/questionsPanelInput.ts`: extend the signature to `{ questions, gates?, lens? }`, return `{ questions: {...}, lens: input.lens ?? makeLensSession() }` (the existing return at the end of the file is `{ questions: { subscribe: () => () => {}, getSnapshot: () => snapshot } }`; widen the declared return type with `lens: LensSession`). Add one sentence to the header comment. The 42 routed renders (`{...panelInput(...)}` spread) stay byte for byte.
- `test/model/DockModel.test.ts:1791-1816`: add `"lens"` to the `assert.sameMembers` list (after `"services"` or in model order; `sameMembers` is order-free).
- `test/model/ConfigureRule.test.ts:583-600`: add `lens: model.lens` to `storesOf`, `"lens"` to `storeNames`, and rename the doc "The nine stores" to "The ten stores".
- `LensSession.test.ts`: copy `DockSession.test.ts` style (plain calls; assert publish counts through `subscribe`). Rows = every cell of D-11; plus a model-based property (random command sequences) for INV-QD-405: `Picking` never carries a pick, drawn set length <= 1, snapshot `===` implies no publish, `takeReveal(id)` true at most once per `choose(id)`.
- Characterisation `Lens.dock.characterisation.test.tsx`: render `DevtoolsDock` only (D-07); must not import `questionsPanelInput.ts`, `dockModelFixtures.ts` or `helpers.ts`. Model hash/RED conventions on `ConfigureFirstRender.characterisation.test.tsx` and the Phase 79 scripts.
- `QadiProvider.tst.ts`: positive `expect<keyof QadiContextValue>().type.toBe<"atoms" | "registry" | "gates">()`, an `@ts-expect-error` read of `.instrument` beside a positive `.gates` twin. No `not.toBeCallableWith`/`not.toBeConstructableWith` (`NOT_CALLABLE_PIN_BUDGET` unmoved).
- Existing lens cells in `QuestionsPanel.gates.test.tsx:203-420` and `Lens.test.ts` stay unedited.

### Mutation and check tooling

Copy from `.planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/`: `79-mutation.mjs` -> `80-mutation.mjs` (two groups: `DockModel.ts` base+close, `LensSession.ts` close-only), `79-characterisation-check.mjs` -> `80-characterisation-check.mjs`, `79-pinned-check.mjs` -> `80-pinned-check.mjs`. Records alongside: `79-mutation-base.json` / `79-mutation-close.json` (-> `80-`), `79-RED-EVIDENCE.md` (-> `80-RED-EVIDENCE.md`). Stryker invocation: `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/DockModel.ts`. `stryker.react.mjs` mutate list (`:55-60`) excludes `QadiProvider.tsx`: record, do not widen.

## Shared Patterns

**Publish-once-per-effective-command** (`DockSession.ts:91-92`, `:108-112`): `const commit = () => store.publish(build());` guarded by an early `return` on equality. Applies to every `LensSession` command except `takeReveal`.

**Tagged-enum + Match, no switch** (`Gates.ts:262-294`, `DiagnosticsFeed.ts:87`): module-scope `Match.type<T>().pipe(Match.tagsExhaustive({...}))`; `SWITCH_BUDGET` unmoved.

**Store read in React** (`useStoreSnapshot.ts:12-13`): the dock's one `useSyncExternalStore` call; use it in both `QuestionsPanel` and `useLens`, add no second one.

**Imports** (AGENTS.md §1): `.ts` extension on relative imports, `import type` for types, `import * as X from "effect/X"` for effect submodules.

**Forbidden in new code:** `as`, `!`, `any`, `Record<string, unknown>`, module-scope `let`, `Date.now`, `console`, `new Effect.fnUntraced`.

## Records (follow CONTEXT D-23, no code analog needed)

ADR-QD-193 (+ `index.yaml` entry, trace row; amends ADR-QD-185, ADR-QD-047, dated ADR-QD-111 amendment), BEH-QD-736..740 (`28-devtools-screens.md`; 740 in `09-react.md`), BEH-QD-700 and BEH-QD-234 restated, INV-QD-405/406 new, INV-QD-390 and INV-QD-107 amended, `spec/devtools-spec/01-shell.md:72` dated note, `02-screens.md` §7, `spec/overview.md:570` revision, CCR-QD-472, traceability row, `spec-revise --date 2026-11-24`, `@qadi/devtools` patch changeset, `@qadi/react` Breaking minor changeset, 0.13 upgrade-guide section in `apps/website/src/content/docs/docs/reference/upgrading.md` after `:1219`. Use existing neighbouring rows in each document as the format template (the Phase 79 entries in each are the nearest).

## No Analog Found

| File | Reason |
|---|---|
| `80-RED-EVIDENCE.md` content | Format from `79-RED-EVIDENCE.md`; content is phase-specific |
| Listener-count spy test (D-15) | No existing test spies on `document.addEventListener`; write fresh against `QuestionsPanel.gates.test.tsx:394-420` ("stops listening when the panel unmounts") as the nearest DOM-listener cell |

## Metadata

**Analog search scope:** `packages/devtools/src/{model,react}`, `packages/devtools/test/{model,react}`, `packages/react/src`, Phase 79 directory.
**Files scanned:** about 14 read or excerpted.
**Pattern extraction date:** 2026-11-24
