# Phase 55: A port card is a model row, not a view join - Pattern Map

**Mapped:** 2026-11-18
**Files analyzed:** 14 (1 new src, 4 modified src, 4 new tests, 3 edited tests, tooling, records)
**Analogs found:** 14 / 14
All analog paths verified git-tracked. 55-RESEARCH.md already holds the typechecked recipes (Q4 `isPortName`, `activityByPort`/`callsByPort`, `portActivity` rewrite; Q3 `services` store; Pattern 1 `ServicesView` shape; Q1 wording; characterisation matrix). This map names the in-repo analogs and the exact lines to copy. Phase 54's `54-PATTERNS.md` is the model for the records/mutation shape.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/PortCards.ts` (new) | model (pure join) | transform | `packages/devtools/src/model/Gates.ts` (`joinQuestions`, `QuestionsView`, :255-300) | exact |
| `packages/devtools/src/model/Wiring.ts` (`PortActivity.port: PortName`, `portActivity`, `isPortName`) | model | transform | own `portActivity` :185-218; `PORT_BY_SPAN` in `PortCalls.ts:51`; `isGateState` in `packages/core/src/GateState.ts:36` | exact |
| `packages/devtools/src/model/DockModel.ts` (+ `services` store, header count) | store | event-driven | own `rejoin`/`questions` store :192-218, `shownReading.subscribe(rejoin)` :241 | exact |
| `packages/devtools/src/react/ServicesPanel.tsx` (rewrite: renders rows) | component | request-response | `packages/devtools/src/react/QuestionsPanel.tsx` (:50-135, `useStoreSnapshot`) | exact |
| `packages/devtools/src/react/DevtoolsDock.tsx` (Services lambda :330-337) | component | request-response | its Questions lambda :341 (`props.model.questions`) | exact |
| `packages/devtools/test/model/PortCards.test.ts` (new, RED by import) | test | transform | `packages/devtools/test/model/Gates.test.ts` | role-match |
| `packages/devtools/test/model/PortCards.tst.ts` (new) | type test | transform | `packages/devtools/test/model/Wiring.tst.ts` | exact |
| `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` (new, base) | test | request-response | `test/react/QuestionsPanel.characterisation.test.tsx` | exact |
| `packages/devtools/test/react/ServicesPanel.test.tsx` (shrunk) + `servicesInput.ts` store double | test | request-response | `test/react/QuestionsPanel.test.tsx` + `questionsPanelInput.ts` | exact |
| `DockModel.test.ts` (M48.. store cases; :787 type-only edit), `devtools-screens.steps.test.ts:419` | test | event-driven | existing M-cases in `DockModel.test.ts` (`listen` helper :79-90) | exact |
| `55-mutation.mjs`, `55-mutation-base.json` | batch tooling | batch | `.planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-mutation.mjs` | exact |
| `spec/decisions/168-<slug>.md` + `index.yaml` | record | - | `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md` (and 167) | exact |
| BEH-611..615 (`spec/behaviors/28-devtools-screens.md`), INV-355..356, CCR-446, traceability, README | record | - | Phase 54's records (BEH-606..610, INV-353..354, CCR-445) | role-match |
| `.changeset/devtools-port-activity-is-a-port-name.md`, `upgrading.md` 0.13 section | config/doc | - | `.changeset/devtools-feed-hands-the-gate-registry.md` | exact |

## Pattern Assignments

### `packages/devtools/src/model/PortCards.ts` (model, transform)

**Analog:** `Gates.ts` :255-300. Tagged enum + `Data.taggedEnum` constructor, doc comment that explains each tag:

```ts
export type QuestionsView = Data.TaggedEnum<{
  Unsampled: {};
  Absent: {};
  Empty: {};
  Rows: { readonly rows: ReadonlyArray<QuestionRow> };
}>;
export const QuestionsView = Data.taggedEnum<QuestionsView>();
```

Copy for `ServicesView` (`NotHanded | Withheld | Failed{reason} | Read{rows, cache}`) and `CallsView` (`Hidden | Uncollected | Listed{calls, earlier}`); `Withheld` mirrors `QuestionsView.Unsampled` (renders nothing). Shape sketch: RESEARCH "Pattern 1" (lines 212-243). `portCards(input)` is a plain pure function (as `joinQuestions`), no `Effect.fn`. Hoisted `Match.type<WiringRead>().pipe(Match.tagsExhaustive({...}))` annotated `: (self: WiringRead) => (input: ServicesInput) => ServicesView` (RESEARCH Code Examples :557-564; AGENTS.md §5a). Closed tables keyed by union for interpreter label (`PortInterpreter`, Pitfall 2 :524) and tone. Port-keyed grouping: RESEARCH Q4 :455-470 (`Map` + `tabulatePorts<ByPort<…>>`, first entry wins, no `===` on a port). Wording: RESEARCH Q1 :261-296 verbatim; `describeCall` imported from `PortReading.ts`. Write `attempts === undefined || attempts <= 1 ? plain : suffixed` and `calls.toReversed().slice(0, SHOWN_PER_PORT)` (Q5 :500). `SHOWN_PER_PORT` / `NO_ACTIVITY_READING` move here with their why-comments from `ServicesPanel.tsx:28,37`.

---

### `packages/devtools/src/model/Wiring.ts` (model)

**Analog:** own `portActivity` :185-218 (replace the `Set` of metric keys, keep the four `Metric.value` reads and the `> 0` filter) with the `forEveryPort` form in RESEARCH Q4 :432-439. String-to-`PortName` precedent, cast-free (`PortCalls.ts:51-53`):

```ts
const PORT_BY_SPAN: ReadonlyMap<string, PortName> = new Map(
  forEveryPort((d): readonly [PortSpanName, PortName] => [d.span, d.port]),
);
```

Guard precedent (`core/src/GateState.ts:36-37`):

```ts
export const isGateState = (word: string): word is GateState =>
  Object.hasOwn(GATE_STATE_TABLE, word);
```

Copy as `export const isPortName = (name: WiredServiceName): name is PortName => Object.hasOwn(PORTS, name);` (RESEARCH :450). Narrow `PortActivity.port` (:142) to `PortName`.

---

### `packages/devtools/src/model/DockModel.ts` (store, event-driven)

**Analog:** the `questions` store and `rejoin` (:192-218), registered at :241 "after `shownReading` exists and before any host listener":

```ts
let lastKey = joinKeyNow();
const questions = makeExternalStore<QuestionsSnapshot>(joinQuestions(lastKey));
const rejoin = () => {
  const key = joinKeyNow();
  if (key.questions === lastKey.questions && /* ... */ key.unsampled === lastKey.unsampled) return;
  lastKey = key;
  questions.set(joinQuestions(key));
};
// ...
shownReading.subscribe(rejoin);
```

Copy as `servicesKeyNow`/`reservice`/`services` per RESEARCH Q3 :401-415 (four reference compares, no `closed` guard because no host code runs). Add `readonly services: Pick<ExternalStore<ServicesView>, "subscribe" | "getSnapshot">` to the returned object beside `questions`; update the header count ("Eight stores", ~:24-31) to nine. Subscribe next to :241.

---

### `packages/devtools/src/react/ServicesPanel.tsx` (component)

**Analog:** `QuestionsPanel.tsx` :50-135: props take the store, read it once, then dispatch on the tag with a hoisted matcher:

```tsx
readonly questions: Pick<ExternalStore<QuestionsSnapshot>, "subscribe" | "getSnapshot">;
readonly diagnostics: DiagnosticsNoticeProps;
// ...
const snapshot = useStoreSnapshot(questions);
return (
  <div {...diagnosticsRootProps(diagnostics.status)} data-testid="qadi-questions">
    <DiagnosticsNotice {...diagnostics} />
    {gatesBlock(snapshot.gates)(lens)}
```

Copy: props `{ services, diagnostics }`; keep `diagnosticsRootProps`/`DiagnosticsNotice`, the fixed prose (`qadi-activity-scope`, cache no-TTL sentence, `qadi-calls-uncollected` note), and the existing `wiringView` hoisted-`Match` idiom (:81-115), now over `ServicesView`. Drop `isUnsampled`, `stateOf`, `activityFor`, `callsFor`, `describe`, `SHOWN_PER_PORT`. Pitfall 1: no JSX line may contain `as <letter>` (house-style `no-type-assertion`).

### `packages/devtools/src/react/DevtoolsDock.tsx`
Change the Services lambda (:330-337) to pass `props.model.services` as the Questions lambda passes `props.model.questions` (:341).

---

### `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` (new, on base)

**Analog:** `QuestionsPanel.characterisation.test.tsx`: header comment shape (:1-11), `neverBuilt` for the unsampled cell (:36), render through `DevtoolsDock` public props, click the tab button, compare `outerHTML` whole against a `GOLDEN` literal (:55-68):

```tsx
const neverBuilt = { layer: Layer.effectDiscard(Effect.never) };
render(<DevtoolsDock {...props} />);
act(() => { fireEvent.click(screen.getByRole("button", { name: "Services" })); });
return screen.getByTestId("qadi-services").outerHTML;
```

Cells 1-14 and fixture R9/A/C: RESEARCH "Characterisation matrix" :298-339. Record goldens by running on the untouched base.

### `ServicesPanel.test.tsx` shrunk + `servicesInput.ts`
**Analog:** `questionsPanelInput.ts`: a hand-built snapshot, deliberately not produced by the join (header :1-17), returned as `{ subscribe: () => () => {}, getSnapshot: () => snapshot }`. Build a `ServicesView` by hand; cases classed (b) in RESEARCH Q2 :347-385.

### `PortCards.test.ts` / `PortCards.tst.ts`
Model cases: RESEARCH Q2 class (a); reuse the 20-row `READINGS` table from `ServicesPanel.reading.test.tsx`. `.tst.ts`: copy `Wiring.tst.ts` idiom (`import { expect, test } from "tstyche"`, `.type.not.toBeAssignableFrom`); bodies in RESEARCH Q4 :476-486.

### `54-mutation.mjs` -> `55-mutation.mjs`
Copy whole; retarget `D`, `RP = reports/mutation-devtools/mutation.json`, `CF = stryker.devtools.mjs`, staleness probe dirs, `FILES = [Wiring.ts, DockModel.ts]` base, plus `PortCards.ts` after (RESEARCH Q5 :495). Record base on the untouched green tree, committed alone.

### Records, changeset
- **ADR-168:** layout of ADR-162 (Context/Decision/Consequences/Related; Status "Accepted — amends ADR-QD-047; applies ADR-QD-162; keeps ADR-QD-160"); restate store count as nine; Document ID `QADI-ADR-168` = file number; tail entry in `spec/decisions/index.yaml`. ADR-047 gets a dated Rev 1.17 amendment.
- **Changeset** (`.changeset/devtools-feed-hands-the-gate-registry.md` shape):
```md
---
"@qadi/devtools": minor
---

**Breaking.** `PortActivity.port` is now `PortName`, not `string`. ...

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
```
- BEH/INV/CCR/traceability placement: RESEARCH Q6 :503-514. Never run `next-id`.

## Shared Patterns

- **Imports (AGENTS.md §1):** `.ts` extensions; `import type` for types; `effect/*` namespace imports; named imports from `@qadi/core`.
- **No `as`/`!`/`any`/`switch`/`fnUntraced`**; dispatch via module-scope `Match.tagsExhaustive`; `as const` allowed.
- **Closed unions over widening:** tone, interpreter label, `CallsView` are closed tables/unions.
- **Untrusted string keys:** `Map` or `Object.hasOwn`, never `obj[key]` (RESEARCH Security :658).
- **Doc-comment shape:** one-line summary, the why after.
- **Barrels:** `PortCards.ts` and `ServicesView` stay out of both barrels (package-private; `devtools-named-barrel`).
- **Verification greps** (`/usr/bin/grep`, scope `packages/ spec/ .changeset/ features/ apps/website/src/`): D-08 and `as` greps in RESEARCH :489, :519.
- **Run from repo root, stdin closed:** `pnpm check:pr < /dev/null`; Stryker alone.

## No Analog Found

None.

## Metadata

**Analog search scope:** `packages/devtools/src/{model,react}`, `packages/devtools/test`, `packages/core/src/GateState.ts`, `spec/decisions`, `.changeset`, QD-54 phase dir
**Pattern extraction date:** 2026-11-18
