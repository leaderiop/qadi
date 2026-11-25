# Phase 84: `useConfigured` requires `configure`, and the review's small finds - Pattern Map

**Mapped:** 2026-11-25
**Files analyzed:** 30 (groups below)
**Analogs found:** 29 / 30

All analog paths are git-tracked (`packages/devtools/...`, `scripts/`, `spec/`, `.changeset/`, `.planning/phases/QD-83-*`). No gitignored mirror is named.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/react/useConfigured.ts` (add `Configurable<I>`, drop adapter param) | hook | request-response | itself (lines 1-32) + `Effect.Effect<A, never, Scope.Scope>` shape | self |
| `src/react/useDockModel.ts` (delete `configureDock`, lines 22-24; call at :30) | hook | request-response | self | self |
| `src/react/useTimeline.ts` (delete `configureTimeline` 44-46; call at :71; reword comment :69-70) | hook | request-response | self | self |
| `src/react/useDiagnostics.ts` (delete `configureDiagnostics` 19-21; call at :44) | hook | request-response | self | self |
| `src/react/useLens.ts` (`useLens(lens, questions): UseLens`) | hook | event-driven | `useTimeline.ts` `UseTimeline` return interface; its own current body | role-match |
| `src/react/QuestionsPanel.tsx` (one `useLens` call, lines 114-118) | component | request-response | self | self |
| `src/react/useStopNotice.ts` (new) | hook | transform | `DevtoolsDock.tsx:116-128` (the pair being extracted); `useScoped.ts` for a small hook file | exact (extraction) |
| `src/react/StoppedBox.tsx` (add `StopNoticeProps<S>` beside `StopLedger<S>`, ~line 31) | component/types | n/a | `StoppedBoxProps<S>` (line ~60) and `StopLedger<S>` | exact |
| `src/react/DiagnosticsNotice.tsx` (lines 36-48 become an alias) | component | n/a | self | self |
| `src/react/TimelineNotice.tsx` (lines 23-34 become an alias) | component | n/a | self | self |
| `src/react/DevtoolsDock.tsx` (`DockFrame` 112-129 call `useStopNotice` twice; drop `useRef` import) | component | event-driven | self | self |
| `src/model/LensSession.ts` (delete `move` 148-152; `store.set`; `choose` 167-175) | model | event-driven | `ExternalStore.ts:108-112` `set` | exact |
| `test/react/useConfigured.test.tsx` | test | request-response | self (lines 22-60) | self |
| `test/react/useConfigured.tst.ts` (new) | test (type) | n/a | `test/model/ConfigureInputs.tst.ts` | exact |
| `test/react/Lens.adapter.test.tsx` (`mount`, line 53; drop import line 20) | test | event-driven | self | self |
| `test/surface.tst.ts` (additions only) | test (type) | n/a | its lines 230-270 | exact |
| `test/react/Lens.questions.characterisation.test.tsx` (new) | test | event-driven | `Lens.adapter.test.tsx` (mount/guard helpers) + `QuestionsPanel.feed.characterisation.test.tsx` (header) | role-match |
| `test/react/DockFrame.stops.characterisation.test.tsx` (new) | test | event-driven | `QuestionsPanel.feed.characterisation.test.tsx` (through `DevtoolsDock`) | role-match |
| `test/react/useTimeline.inputs.characterisation.test.tsx` (new) | test | event-driven | `test/react/useTimeline.test.tsx` (`renderHook`, `useTimeline`) | role-match |
| `84-check.mjs` | script | batch | `83-check.mjs` (846 lines) | exact |
| `84-pinned-check.mjs` | script | batch | `83-pinned-check.mjs` (294) | exact |
| `84-mutation.mjs` | script | batch | `83-mutation.mjs` (458) | exact |
| `84-earlier-checks.mjs` | script | batch | `83-earlier-checks.mjs` (174) | exact |
| `spec/decisions/197-<slug>.md` (new ADR) | doc | n/a | `spec/decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md` | exact |
| `spec/decisions/192-...md`, `193-...md` (dated amendment) | doc | n/a | ADR-192's own `## Amendment (2026-11-24, ARCH-128, CCR-QD-473)` at line 290 | exact |
| `spec/decisions/index.yaml` | register | n/a | the `ADR-QD-196` entry (line 613) | exact |
| `spec/behaviors/28-devtools-screens.md` (BEH-QD-756..760; amend 734/736/737) | doc | n/a | BEH-QD-751..755 | exact |
| `spec/invariants.md` (INV-QD-413..414 after 412; amend 406 Source) | doc | n/a | INV-QD-412 (line 4781) | exact |
| `spec/traceability.md`, `spec/README.md` | register | n/a | rows for `Lens.adapter.test.tsx` (696), CCR-QD-475 (README:412) | exact |
| `.changeset/devtools-lens-reads-each-fact-once.md` | config | n/a | `.changeset/devtools-configure-applies-every-input.md` | exact |
| (no analog) the `Configurable` negative refusal at a hook call | test | n/a | `ConfigureInputs.tst.ts` pattern only | partial |

## Pattern Assignments

### `useConfigured.ts` (hook)

**Analog:** itself. At HEAD (lines 14-32):
```ts
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import { useLayoutEffect } from "react";
import { useScoped } from "./useScoped.ts";

export const useConfigured = <A, I>(
  make: () => Effect.Effect<A, never, Scope.Scope>,
  configure: (value: A, inputs: I) => void,
  inputs: I,
): A | undefined => {
  const value = useScoped(() => Effect.tap(make(), (built) => Effect.sync(() => configure(built, inputs))));
  // Runs again on the render the value appears, so an input changed in between still lands.
  useLayoutEffect(() => {
    if (value !== undefined) configure(value, inputs);
  }, [value, inputs]);
  return value;
};
```
**Target** (RESEARCH Code Example 2; keep line 1 `"use client";`, keep the existing doc block and put the new one-line lead first): add
```ts
export interface Configurable<I> {
  readonly configure: (inputs: I) => void; // function property, not a method (D-05)
}
export const useConfigured = <A extends Configurable<I>, I>(make: ..., inputs: I): A | undefined
// body: built.configure(inputs) / value.configure(inputs); BOTH calls stay (PITFALLS 84-A)
```
**Call sites** (delete the adapter const and its import of the value type if unused): `useDockModel.ts:30` `useConfigured(makeDockModel, inputs)`; `useTimeline.ts:71` `useConfigured(makeTimelineFeed, { source, capacity })`; `useDiagnostics.ts:44` `useConfigured(makeDiagnosticsFeed, options)`. No type arguments. Keep the comments; reword only words naming an adapter. `useDockModel.ts` still needs `DockModelInputs` (signature) but not `DockModel`'s adapter use (return type still names `DockModel`). `useDiagnostics.ts` still needs `DiagnosticsOptions`; `DiagnosticsFeed` import goes only if unused (lint).

**useTimeline rejection (D-17/D-18):** no code change beyond the comment at :69-70 (`"a record rebuilt every render configures nothing"` stays).

### `useStopNotice.ts` (new hook, extraction)

**Analog:** `DevtoolsDock.tsx:116-128` (verbatim today):
```tsx
// Records only which stops were announced, never what the reading says (AGENTS.md §13).
const announced = useRef<StopLedger<DiagnosticsStatus>>(noStops);
const notice = useMemo(() => ({ status, onRestart: model.diagnostics.restart, announced }), [status, model]);
const timelineStatus = useStoreSnapshot(model.timelineStatus);
const timelineAnnounced = useRef<StopLedger<TimelineStatus>>(noStops);
const timelineNotice = useMemo(
  () => ({ status: timelineStatus, onRestart: model.timelineStatus.restart, announced: timelineAnnounced }),
  [timelineStatus, model],
);
```
**Target:** RESEARCH Code Example 4 (first line `"use client";`, `export const useStopNotice = <S,>(status: S, onRestart: () => void): StopNoticeProps<S> => { const announced = useRef<StopLedger<S>>(noStops); return useMemo(() => ({ status, onRestart, announced }), [status, onRestart]); }`). The `<S,>` comma is the existing generic-arrow style in `StoppedBox.tsx` (`stoppedKey = <S,>(...)`). Frame: `const diagnosticsNotice = useStopNotice(status, model.diagnostics.restart); ... useStopNotice(timelineStatus, model.timelineStatus.restart)`; keep `useStoreSnapshot(model.timelineStatus)` in the frame and the notice prop names the JSX already uses (`notice`, `timelineNotice`). Call both unconditionally at the top, beside the other hooks. After the move `DevtoolsDock.tsx` has no `useRef<StopLedger` and the `useRef`/`useMemo`/`noStops`/`StopLedger` imports go if unused (check `useMemo` use elsewhere in the file).

### `StoppedBox.tsx` + notices (types)

**Analog:** `StopLedger<S>` / `noStops` (lines 20-31), `StoppedBoxProps<S>` doc style. Add:
```ts
/** What a dock hands one stop notice. */
export interface StopNoticeProps<S> {
  readonly status: S;                       // doc comments from the two notices, said once
  readonly onRestart: () => void;
  readonly announced: RefObject<StopLedger<S>>;
}
```
`DiagnosticsNotice.tsx:36-48` and `TimelineNotice.tsx:23-34` become `export type DiagnosticsNoticeProps = StopNoticeProps<DiagnosticsStatus>;` / `TimelineNoticeProps = StopNoticeProps<TimelineStatus>`. `TimelineNotice.tsx` line ~36 `type Binding = Pick<TimelineNoticeProps, "onRestart" | "announced">` keeps compiling. Held files: `test/helpers.ts`, `DiagnosticsNotice.test.tsx`, `TimelineNotice.test.tsx` compile unedited. Import `RefObject` stays in `StoppedBox.tsx` (already used at `StoppedBoxProps.announced`), drop it from the notices if unused.

### `useLens.ts` (hook)

**Analog:** `useTimeline.ts` `UseTimeline` (interface returned by a hook beside its subscribed stores). Current signature at `useLens.ts:37-41`:
```ts
export const useLens = (lens: LensSession, questions: ReadableStore<QuestionsSnapshot>, instances: QuestionsSnapshot["instances"]): LensSnapshot => {
  const snapshot = useStoreSnapshot(lens);
```
**Target (D-11):** `export interface UseLens { readonly lens: LensSnapshot; readonly questions: QuestionsSnapshot }`; body calls `const read = useStoreSnapshot(questions)` FIRST then `const snapshot = useStoreSnapshot(lens)`; draw effect uses `read.instances` (const `instances = read.instances`) keyed `[highlighted, instances]` (lines 54-60 shape unchanged); listener effect keyed `[picking, lens, questions]` and handlers keep `questions.getSnapshot().instances` (lines 72, 80 unchanged); exit effect unchanged; no `useRef`. Return `{ lens: snapshot, questions: read }`. Rewrite the doc paragraph above it (lines ~30-36: "the guards listed now are an argument ...") because it describes the removed argument.

**QuestionsPanel.tsx:114-118 target:**
```tsx
const { lens: lensSnapshot, questions: snapshot } = useLens(lens, questions);
const view: LensView = { session: lens, snapshot: lensSnapshot };
```
Everything below keeps reading `snapshot` (the questions snapshot). `useStoreSnapshot` import stays only if used elsewhere in the file (lint). One subscription per store is pinned by `Lens.adapter.test.tsx:138`/`:160`.

### `LensSession.ts` (model, event-driven)

**Analog:** `ExternalStore.ts:108-112` `set`. Verbatim HEAD (lines 148-175 area):
```ts
const move = (next: LensSnapshot): void => {
  if (next === store.getSnapshot()) return;
  store.publish(next);
};
...
toggle: () => { armed = undefined; move(toggled(store.getSnapshot())); },
hover: (id) => { move(hovered(store.getSnapshot())(id)); },
choose: (id) => {
  const current = store.getSnapshot();
  const next = chosen(current)(id);
  if (next === current) return false;
  // Armed before the publish, so a listener told of the pick can take its reveal.
  armed = pickedOf(next);
  store.publish(next);
  return true;
},
cancel: () => { armed = undefined; move(cancelled(store.getSnapshot())); },
```
**Target:** delete `move` and its doc; `toggle`, `hover`, `cancel`, `highlight` call `store.set(...)`; `choose` keeps its four lines and swaps only `store.publish(next)` for `store.set(next)`. Keep every `armed = undefined` before its `set`. Extend the module doc by "through the store's `set`". `84-check.mjs no-restated-set` asserts: no `move`, no `publish`, `armed =` precedes `store.set(` inside `choose`.

### `useConfigured.tst.ts` (new type test)

**Analog:** `test/model/ConfigureInputs.tst.ts`: header explains `@ts-expect-error` checked twice (TS2578 under `pnpm typecheck`; message fragment under tstyche); imports `import { expect, test } from "tstyche";` and `import type ... from "../../src/model/...ts"`; positive `expect<T>().type.toBe<U>()`; negative is `// @ts-expect-error is missing in type` directly above ONE line, with the accepted twin differing in one field.
```ts
test("...", () => {
  const whole: Required<TimelineFeedInputs> = { capacity: undefined, source: undefined };
  expect(whole).type.toBe<Required<TimelineFeedInputs>>();

  // @ts-expect-error is missing in type
  const missing: Required<TimelineFeedInputs> = { capacity: undefined };
  expect(missing).type.toBe<Required<TimelineFeedInputs>>();
});
```
**For this file:** `expect<DockModel>().type.toBeAssignableTo<Configurable<DockModelInputs>>()` (and `TimelineFeed`/`TimelineFeedInputs`, `DiagnosticsFeed`/`DiagnosticsOptions | undefined`); `expect<ReturnType<typeof useDockModel>>().type.toBe<DockModel | undefined>()`, `UseTimeline`, `DiagnosticsSnapshot`; refusal on ONE line using the fragment `Property 'configure' is missing in type` (RESEARCH Pitfall 1: `// @ts-expect-error Property 'configure' is missing in type` above `useConfigured(() => Effect.succeed({ x: 1 }), 1);`), with a twin `Effect.succeed({ configure: (_: number) => {} })` and no directive. Use NO `not.toBeCallableWith` / `not.toBeConstructableWith` (budget row would move; D-04). Directory `test/react/` is tstyche-selected.

### `surface.tst.ts` (additions)

**Analog:** its lines 230-270, pair form:
```ts
// @ts-expect-error no exported member
export { foldReading } from "../src/index.ts";
...
// @ts-expect-error no exported member
export type { DiagnosticsStore } from "../src/index.ts";
```
Add, appended and under both `../src/index.ts` and `../src/react/index.ts` (the react form is at ~230: `export { drawLens } from "../src/react/index.ts";`): `useStopNotice`, `StopNoticeProps` (type), `UseLens` (type), `Configurable` (type). Additions only (held-file model).

### `useConfigured.test.tsx` (declared edit)

**Analog:** itself, lines 22-60. Base step (D-08): `Double` gains `configure`:
```ts
interface Double { readonly configured: Array<string>; released: boolean; readonly configure: (inputs: Inputs) => void }
// make(): build the double with configure = (inputs) => { if (inputs.fail === true) throw new Error(`refused ${inputs.label}`); double.configured.push(inputs.label); }
// harness call (base form):  useConfigured(make, (double, inputs) => double.configure(inputs), inputs)
// at signature change:       useConfigured(make, inputs)
```
Remove the free `configure` fn (43-46). U1..U4 titles and assertions unchanged. The `Double` must stay `A extends Configurable<Inputs>` so `released` stays mutable alongside.

### `Lens.adapter.test.tsx` (declared edits)

Lines 53 and 20: `useLens(lens, questions, useStoreSnapshot(questions).instances);` becomes `useLens(lens, questions);` and `import { useStoreSnapshot } from "../../src/react/useStoreSnapshot.ts";` is deleted. Nothing else moves (held).

### New characterisations (3 files, all on the phase base, green there)

**Analog for header and harness:** `QuestionsPanel.feed.characterisation.test.tsx` lines 1-40: header comment says what was pinned, why (React files sit outside the mutation glob), "Never edited after it is written"; imports `{ assert, describe, it } from "@effect/vitest"`, `{ act, fireEvent, render, screen } from "@testing-library/react"`, `{ vi } from "vitest"`, `DevtoolsDock` from `../../src/react/index.ts`, `makeGateRegistryDouble` from `../gateRegistryDouble.ts`, `questionsProp` from `./questionsProp.ts`.
- `Lens.questions.characterisation.test.tsx`: drive `QuestionsPanel` with `panelInput` from `./questionsPanelInput.ts`; guard builder and `control()` from `Lens.adapter.test.tsx:28-45` (`guard(id, element): GateInstanceLike`), a `makeExternalStore(joinQuestions({...}))` questions store as in `mount` (lines 41-47), `picking(lens)` via `act(async () => lens.toggle())`, and `document.elementFromPoint` stubbing with the `afterEach` restore (lines 66-71). Four rows per D-19. Subscription counting: copy the pin approach at `Lens.adapter.test.tsx:138` and `:160` (do not re-read them blind; the planner opens those two `it`s).
- `DockFrame.stops.characterisation.test.tsx`: through `DevtoolsDock`; stop-notice test ids `qadi-diagnostics-notice`, `qadi-timeline-notice` (FEEDS table, `StoppedBox.tsx`); stop values from `DiagnosticsNotice.test.tsx` / `test/helpers.ts` (`liveNotice`); use `Activity` hide/show as in `useConfigured.test.tsx` imports.
- `useTimeline.inputs.characterisation.test.tsx`: `renderHook` over `useTimeline` as in `useTimeline.test.tsx` (imports lines 11-24, `sourceFromRecords`); count `store.subscribe` listener calls; per Pitfall 6 the status store is not exposed, so assert `status` reference is stable across a same-field rerender and changes on a moved capacity (the control).
- Later review-fix rows go in a NEW file, never into a born characterisation (Pitfall 7).

### Phase scripts (`84-*.mjs`)

Analogs: `.planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-*.mjs`. What must change (RESEARCH "Phase 83 Tooling" table is the checklist):

`84-check.mjs` from `83-check.mjs`:
- Line 25 `D` derives from `import.meta.url` (good, keep). Line 26-29: `EVIDENCE` `83-RED-EVIDENCE.md` -> `84-EVIDENCE.md`; `SUMMARY` `83-01-SUMMARY.md` -> `84-01-SUMMARY.md`; `PLAN_SUBJECT` `/^[a-z]+[(]83-[0-9]{2}[)]!?: /` -> `84`. Line 38 scratch `"qd83"` -> `"qd84"` (a stale `$TMPDIR/qd83` still exists; a straight copy would reuse the wrong `phase_base`).
- Id-token table lines ~165-175: `83-\d{2}` -> `84-\d{2}`, `QD-83` -> `QD-84`, `Phase 83` -> `Phase 84`, drop `DIAG-0N`, add `ADPT-0N`; keep `D-\d+`, `WX-0N`, `-NEXT`. Self-test lines ~616-619 rewrite the sample strings (`"see 84-05"`, `"ADPT-02 holds"`, `"QD-84 closes"`, and negatives like `"83-05"` must now pass, `"a 1284-05x"`).
- `judgeForbidden` (line 236): exempt a line that is exactly `"use client";` (Pitfall 3) and add both-direction self-tests (directive passes; a real module-scope string literal still fails). Self-test helpers `one`/`lit` at lines 639/710 show the pattern.
- `GUARDED` (line 30) stays `["AGENTS.md","scripts/check-house-style.mjs",".oxlintrc.json"]`; no budget logic.
- Drop modes `no-store`, `single-fold`, `stale-path`, `registers`; add `no-adapter`, `no-restated-set`, `one-path`, `one-ledger`, `records` (D-21), each with a planted-failure self-test. Also add the assertion that `useConfigured.tst.ts` holds no `not.toBeCallableWith`/`not.toBeConstructableWith` (Pitfall 2). Trailer regex: any `Co-Authored-By: Claude ... <noreply@anthropic.com>`.

`84-pinned-check.mjs` from `83-pinned-check.mjs`:
- `PINNED` entries shape `{ file, flips, added, edits }` (lines 34-60). Replace with D-20: byte-for-byte list (flips `[]`, `added []`, `edits []`) and declared edits for `useConfigured.test.tsx` (the one call line), `Lens.adapter.test.tsx` (line 53 and import line 20), `surface.tst.ts` (additions). Remove the `importEdit` rename helper (no rename this phase). Line 27 `EVIDENCE`, line 241 `83-check.mjs base` -> 84. Header line 17 usage path -> QD-84 dir (derive from `import.meta.url`; do not hard-code the phase dir, per RESEARCH Pitfall 4). Run plain before the commit, `--all-applied` after.

`84-mutation.mjs` from `83-mutation.mjs`:
- Delete `RENAMED` (line 35) and make `baseOf` identity; `ABSOLUTE` (line 41) -> `[ `${MODEL_DIR}LensSession.ts` ]`; the self-test at 418-419 that asserts `ABSOLUTE` equals `[FB, DN]` -> `[LensSession.ts]`; `UNMEASURED` (line 43) -> the eleven `src/react` files of D-24; phase string `"83"` (lines 228, 247, 352) -> `"84"`; output `83-mutation-${name}.json` (229, 246, 258-259) -> `84-`; one group `lens`; usage text line 444 names `lens`. Base command: `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/LensSession.ts < /dev/null`.

`84-earlier-checks.mjs` from `83-earlier-checks.mjs`:
- Line 20 scratch `"qd83"` -> `"qd84"`; line 26's three-line `PINNED` rewrite for the Diagnostics rename is not needed. Instead run `83-earlier-checks.mjs` (re-runs 81, 79, 80) and `83-pinned-check.mjs`, from a scratch copy with paths rewritten, never editing earlier phase dirs. Expect all exit 0 except `79-pinned-check.mjs` exit 1 on `TF29`.

### `spec/decisions/197-<slug>.md` (new ADR)

**Convention:** file `NNN-<kebab slug>.md`; the Document ID must equal the file number (gate 10). **Analog:** `spec/decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md`:
```md
# ADR-QD-196 — The diagnostics feed folds its reading as a value

> **Document Control**
> | Property | Value |
> | Document ID    | QADI-ADR-196 |
> | Revision       | 1.3 |
> | Effective Date | 2026-11-25 |
> | Status         | Accepted — amends ADR-QD-173, ADR-QD-169 and ADR-QD-047 |
> | Author         | Qadi Engineering |
> | Classification | Architecture Decision Record |
> | Change History | 1.0 (2026-11-25): new (CCR-QD-475) |
---
## Context  /  ## Decision  /  ## What changes and the test that pins it  /  ## Alternatives considered  /  ## Consequences  /  ## What enforces it  /  ## Related
```
For 197: `QADI-ADR-197`, Revision 1.0, `Status: Accepted — amends ADR-QD-192 decision 8 and ADR-QD-193 decision 6`, change history `1.0 (2026-11-25): new (CCR-QD-476)`; contents per D-25. Create the file through `spec-revise.mjs`/by the repo's usual route, then `node scripts/spec-revise.mjs <doc> "<change (CCR-QD-476)>" --date <real date>` and `--check`. Never run `next-id.mjs`.

**Amendments:** ADR-192 already carries dated `## Amendment (2026-11-24, ARCH-128, CCR-QD-473): ...` sections after Related (line 290): add `## Amendment (2026-11-25, ARCH-131, CCR-QD-476): ...` the same way. ADR-193 has none yet: add one dated paragraph after Related (line ~271).

**`index.yaml`** analog (line 613):
```yaml
  - id: "ADR-QD-196"
    file: "196-the-diagnostics-feed-folds-its-reading-as-a-value.md"
    title: "The diagnostics feed folds its reading as a value"
    status: "Accepted — amends ADR-QD-173, ADR-QD-169 and ADR-QD-047"
```
Add the 197 entry after it, and append "amended 2026-11-25 (ADR-QD-197: ...)" to the `status` strings of ADR-192 and ADR-193.

### Other spec registers
- `28-devtools-screens.md`: BEH-QD-751..755 are the format analog; amend pinned-by of 734 (3242-3250), 736 (3355-3356), 737 (3380-3383, ends 3415). `invariants.md`: append 413..414 after INV-QD-412 (4781); INV-QD-406 Source at 4709. `traceability.md`: find rows by file cell (`Lens.adapter.test.tsx` is 696, `useConfigured.test.tsx` 629, `surface.tst.ts` 706), add rows for the four new test files, BEH/INV/ADR rows, and extend the doc-28 BEH range row (line 70) with BEH-QD-756-760. `README.md`: CCR-QD-476 row after the CCR-QD-475 row (line 412) naming every revision. All edits via `spec-revise.mjs`; verify with `--check`, `spec:verify:strict` and `verify-traceability.sh --strict`.

### Changeset

**Analog:** `.changeset/devtools-configure-applies-every-input.md`:
```md
---
"@qadi/devtools": patch
---

<one long paragraph describing the internal change>. No export changes.
```
Write `.changeset/devtools-lens-reads-each-fact-once.md` the same way: the lens adapter reads the listed guards from one subscription and the store; the dock's internal hand-over is unchanged; claims no host-visible change; ends "No export changes." Exempt from id-token scan.

## Shared Patterns

### Package-private out of the barrel
**Source:** `test/surface.tst.ts` "no exported member" pins (ADR-QD-099, AGENTS.md §9). Apply to `Configurable`, `UseLens`, `useStopNotice`, `StopNoticeProps`; export from their module only for tests/siblings.

### Imports and `"use client";`
**Source:** `useConfigured.ts` lines 1, 14-17: `"use client";` first line of every `src/react` file; `import * as Effect from "effect/Effect"`, `import type * as Scope from "effect/Scope"`, relative imports with `.ts`/`.tsx` extension, `import type` for type-only (`verbatimModuleSyntax`).

### Doc comment shape
**Source:** AGENTS.md preamble and `useConfigured.ts:2-13`: one-line summary first, rationale (ADR citation) after. New `Configurable`, `UseLens`, `StopNoticeProps`, `useStopNotice` follow it.

### Publish only on a changed reference
**Source:** `ExternalStore.ts:108-112` `set` (`LensSession`), `sameFields` (`ExternalStore.ts:153`) used by each feed's `configure` (why a fresh inputs record publishes nothing, D-17).

### Held-file discipline
Born characterisations and the D-20 list are byte-held; record review-fix rows in new files. Each characterisation and each new check is shown failing once, recorded in `84-EVIDENCE.md` in `seen-failing`'s line formats (`- failed: <title>`, `- check failed: <mode>: <line>`), then reverted with `git checkout`.

### Forbidden forms
No `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, console, `process.env`, `Record<string, unknown>`, `// Stryker disable`, or module-scope `let` (D-04). No D-number, `84-NN`, `ADPT-0N`, `Phase 84` in shipped source, test titles or scenarios.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| A tstyche refusal of a hook *call* (`useConfigured` with a value lacking `configure`) | test (type) | `ConfigureInputs.tst.ts` refuses assignments to record types, not generic hook calls. Use its `@ts-expect-error <fragment>` mechanics with RESEARCH Pitfall 1's verified one-line form. |

## Metadata

**Analog search scope:** `packages/devtools/src/react`, `src/model`, `test`, `test/react`, `test/model`; `.planning/phases/QD-83-*`; `spec/decisions`, `.changeset`.
**Files scanned:** about 25. Not re-read in full by this mapper: the two subscription pins at `Lens.adapter.test.tsx:138`/`:160`, `DiagnosticsNotice.test.tsx`, `test/helpers.ts` (the planner opens these before writing the characterisations).
**Pattern extraction date:** 2026-11-25
