# Phase 88: StoppedBox keys itself and owns the announce-once rule - Pattern Map

**Mapped:** 2026-11-25
**Files analyzed:** 17 (3 new src/test, 4 modified src, 5 modified tests, 4 phase scripts, records)
**Analogs found:** 17 / 17

All paths are under `/Users/mohammadalmechkor/Projects/Perso/qadi/` and git-tracked source.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/StopLedger.ts` (new) | model (pure) | transform | `packages/devtools/src/model/HydrationView.ts` (also `PortCards.ts`) | exact |
| `packages/devtools/test/model/StopLedger.test.ts` (new) | test (table) | transform | `packages/devtools/test/model/HydrationView.test.ts` | exact |
| `packages/devtools/src/react/StoppedBox.tsx` (mod) | component | request-response | itself at HEAD (split into wrapper + body) | self |
| `packages/devtools/src/react/useStopNotice.ts` (mod) | hook | state | itself at HEAD (`useRef` becomes `useReducer`) | self |
| `packages/devtools/src/react/TimelineNotice.tsx`, `DiagnosticsNotice.tsx` (mod) | component | request-response | themselves (drop `Binding`, `key=`) | self |
| `test/react/DockFrame.announce.characterisation.test.tsx` (new, born) | test | event-driven | `test/react/DockFrame.stops.characterisation.test.tsx` | exact |
| `test/react/useStopNotice.test.tsx` (new, born) | test | event-driven | same file (hook harness rows) | role-match |
| `test/helpers.ts`, `DiagnosticsNotice.test.tsx`, `TimelineNotice.test.tsx`, `Simulator.broke.test.tsx`, `surface.tst.ts` (declared edits) | test | n/a | 87's declared-region mechanism | exact |
| `88-check.mjs`, `88-pinned-check.mjs`, `88-mutation.mjs`, `88-earlier-checks.mjs` | script | batch | `87-*.mjs` in `.planning/phases/QD-87-one-scoped-run-that-states-its-stop/` | exact |
| ADR-QD-201, ADR-197 amendment, BEH/INV, CCR | spec | n/a | `spec/decisions/200-one-scoped-run-that-states-its-stop.md` | exact |

## Pattern Assignments

### `model/StopLedger.ts` (pure model, transform)

**Analog:** `packages/devtools/src/model/HydrationView.ts`

- Header doc (lines 1-16): one-line summary, then the why (the mutation gate measures `src/model/`, a rule in a render function is reachable only by rendering), then "Package-private: ...".
- No `"use client"`, no react import, no JSX. Imports use `import * as X from "effect/X"` and `.ts` extensions with `import type` for types (HydrationView.ts 17-19).
- Move these unchanged from `react/StoppedBox.tsx` 19-50:

```ts
export interface StopLedger<S> { readonly stop: S | undefined; readonly count: number }
export const noStops: StopLedger<never> = { stop: undefined, count: 0 };
export const stoppedKey = <S,>(ledger: StopLedger<S>, status: S): number =>
  ledger.stop === status ? ledger.count : ledger.count + 1;
```

- Add `announcesStop = (l, s) => l.stop !== s` and `recordStop = (l, s) => l.stop === s ? l : { stop: s, count: l.count + 1 }`. It must return `l` by identity.
- Stryker's static-mutant note (D-18a): the `noStops` literal and const-arrow bodies are `EXAMINED`.

### `test/model/StopLedger.test.ts` (table test)

**Analog:** `packages/devtools/test/model/HydrationView.test.ts` (lines 1-50)

- Header comment says what a row pins. Imports are `import { assert, describe, it } from "@effect/vitest"` and `../../src/model/X.ts`.
- Rows are `it("V1 ...")` titles that name a property, never a D-number or phase number (WX-07).
- Use `assert.deepStrictEqual`/`assert.strictEqual` for the `===` identity rows.
- Add the two law rows and the `fast-check` property row (D-11a).

### `react/StoppedBox.tsx` (outer wrapper plus module-private body)

**Analog:** itself at HEAD.

- Keep as they are: `"use client"` (line 1), the `FEEDS` table (62-67), the styles (87-100), the focus-restart handler (122-127) and the JSX (129-148).
- Replace 116-120, the render-phase ref read and the layout effect:

```tsx
const [alert] = useState(() => announcesStop(announced.ledger, status));
useLayoutEffect(() => announced.record(status), [announced.record, status]);
```

- Line 15 drops `RefObject`. Import from `../model/StopLedger.ts`.
- `StopNoticeProps.announced` becomes `AnnouncedStops<S>` (lines 45, 84).
- The exported `StoppedBox` renders `<StoppedBody key={stoppedKey(notice.announced.ledger, notice.status)} .../>`.
- Rewrite the header doc (9-11) so it names the wrapper and the ledger module.

### `react/useStopNotice.ts`

**Analog:** itself (lines 12-19).

```ts
const [ledger, record] = useReducer(recordStop, noStops);
return useMemo(() => ({ status, onRestart, announced: { ledger, record } }), [status, onRestart, ledger, record]);
```

- Keep `"use client"`, keep the header doc about `restart` and the per-feed hold, and keep the signature.
- Imports come from `../model/StopLedger.ts` and the `StoppedBox.tsx` types.

### `react/TimelineNotice.tsx` and `react/DiagnosticsNotice.tsx`

**Analog:** themselves. Both use the hoisted `Match.type<...>().pipe(Match.tagsExhaustive({...}))` form (Timeline 27-47, Diagnostics 76-100), which stays.

- Delete `type Binding = Pick<...>` (Timeline 25, Diagnostics 66).
- The arms take the notice whole: `Stopped: (status) => (notice: StopNoticeProps<...>) => ...`.
- Delete `key={stoppedKey(announced.current, status)}`, pass `notice={notice}` to `StoppedBox`, and drop the `stoppedKey` import (Timeline 14).
- The components call `noticeOf(status)(props)`.

### Born characterisation tests

**Analog:** `test/react/DockFrame.stops.characterisation.test.tsx` (lines 1-60).

- Header: "held byte for byte from its first commit, a later row goes in a new file", and reads only the DOM through `DevtoolsDock`.
- Reuse `dyingSource`, `throwing` (via `makeCollectorDouble`), `settle`, `click`, `goTo`, `announceOf`, `timelineBox` and `diagnosticsBox`. Copy these helpers, or import them if the analog exports them (it does not).
- Add `<StrictMode>` for A1-A5.
- Imports: `@testing-library/react` (`act`, `render`, `screen`), `effect/Effect`, `effect/Stream`, `react` (`Activity`), `vitest` (`vi`), `../collectorDouble.ts`, `../helpers.ts`.
- Plan 1 commits both born files with the base `helpers.ts`.

### Declared test edits

**Analog:** `test/helpers.ts` 221-226 (`liveNotice`) is the shape to change:

```ts
export const liveNotice: DiagnosticsNoticeProps = {
  status: DiagnosticsStatus.Live(),
  onRestart: () => undefined,
  announced: { current: noStops },   // becomes { ledger: noStops, record: () => undefined }
};
```

- Line 14 changes the `noStops` import to `../src/model/StopLedger.ts`.
- Declared-region mechanism: `87-pinned-check.mjs`. It has a `held` set computed from `git ls-tree` at `phase_base`, `declared` files with regions (`from` inclusive, `to` exclusive), and `born` files held against the one adding commit. Modes are `--all-applied` and `--self-test`.

### Phase scripts

**Analogs:** `.planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-check.mjs`, `87-pinned-check.mjs`, `87-mutation.mjs` (`UNMEASURED`, `EXAMINED`), `87-earlier-checks.mjs` and `87-mutation-base.json` (`phase_base`).

- Copy their structure and give each a `--self-test`.
- Never edit the archived scripts' path constants. Use the expected-reports ledger in `88-earlier-checks.mjs`.

### Records

**Analog:** `spec/decisions/200-one-scoped-run-that-states-its-stop.md`. Copy its audit table and its "What enforces it" section, which names commands and never gate numbers.

- Also edit `spec/decisions/197-...md` decision 4 (lines 83-91) with a dated amendment, `spec/behaviors/28-devtools-screens.md` (BEH-QD-509 at 1554-1556, BEH-QD-759 at 4046), `spec/traceability.md`, `spec/decisions/index.yaml` and `spec/README.md` (the CCR-QD-480 row).
- `surface.tst.ts` 301-310 is the analog for the six new `@ts-expect-error` refusal pairs.

## Shared Patterns

- **House style:** every `src/react` file starts with `"use client";`, relative imports carry `.ts` or `.tsx`, and type-only imports use `import type`. There is no `switch`, no `as`, and no module-scope `let` (AGENTS.md §5a, §6).
- **Package-private:** the new names stay out of both barrels (ADR-QD-099). Gate 13 is unmoved.
- **Doc-comment shape:** a one-line summary first, then the why.
- **Test titles** name properties, never D-numbers or phase numbers.

## No Analog Found

None. The `fast-check` property row has no model-test precedent that was read. The planner should grep `packages/devtools/test/model` for `fast-check` before writing it.

## Metadata

**Analog search scope:** `packages/devtools/src/{model,react}`, `packages/devtools/test/{model,react}`, and the 87 phase directory.
**Files read:** 8 (StoppedBox, useStopNotice, TimelineNotice, HydrationView head, plus partial reads of DiagnosticsNotice, helpers.ts, HydrationView.test.ts, the stops characterisation test and 87-pinned-check).
**Extraction date:** 2026-11-25
