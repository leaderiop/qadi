# Phase 36: Carried spec debt and stale records - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** 44 (new + modified, code, tests, records)
**Analogs found:** 43 / 44 (the one gap is the token contrast test; see "No Analog Found")

All analog paths below are git-tracked source. Line numbers are at the working tree on `arch-wave-8` (equal to the phase base for every file here; no src commit since `d31a25ee`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/TimelineFeed.ts` (mod) | model/service | streaming, scoped fiber | `packages/devtools/src/model/DiagnosticsFeed.ts` | exact |
| `packages/devtools/src/model/TimelineStore.ts` (mod: `runSource(store: Pick<TimelineStore,"accept">)`) | model | streaming | itself (`:99-102`) | n/a |
| `packages/devtools/src/model/DockModel.ts` (mod: eighth readout `timelineStatus`) | model | event-driven store | its own `diagnostics` readout `:69-71,136-142` | exact |
| `packages/devtools/src/react/useTimeline.ts` (mod: `status`, `restart`) | hook | store subscription | `DevtoolsDock.tsx:166-171` (`useStoreSnapshot(model.diagnostics)`) + own `:60-67` | exact |
| `packages/devtools/src/react/index.ts` (mod: export `TimelineStatus`) | barrel | n/a | `DiagnosticsStatus` export (`index.ts:15-16`) | exact |
| `packages/devtools/src/react/DiagnosticsNotice.tsx` (mod: box extracted, `StopLedger<S>`, `focusRingProps`) | component | render | itself | n/a |
| shared stopped box, new package-private file in `src/react/` (e.g. `StoppedNotice.tsx`) | component | render | `DiagnosticsNotice.tsx:75-178` (`stoppedStyle`, `reasonStyle`, `restart`, `StoppedNotice`, `keyOf`) | exact (extraction) |
| `packages/devtools/src/react/TimelineNotice.tsx` (new) | component | render | `DiagnosticsNotice.tsx:180-225` (`noticeOf`, `DiagnosticsNotice`) | exact |
| `packages/devtools/src/react/DevtoolsDock.tsx` (mod: notice slot, `qadi-dock-body`, delete `nothing`) | component | render | its own `announced`/`notice` wiring `:166-171`, `Screen` `:272-318` | exact |
| `packages/devtools/src/react/useDockModel.ts` (mod: `source` optional) | hook | n/a | `DockModelInputs.source?` (`DockModel.ts:59-60`) | exact |
| `packages/devtools/src/react/useScoped.ts` (mod: drop directive at `:45`) | hook | n/a | n/a (comment edit) | n/a |
| `packages/devtools/src/model/SimulationSource.ts` (mod: `ReadySource`/`RefusedSource`, `describeSource`) | model | transform | same file's `FixtureSource`/`SnapshotSource`/`LiveSource` interfaces `:36-58` | exact |
| `packages/devtools/src/model/SimulationSession.ts` (mod: `build()` uses `describeSource`; `Baseline.Checked.reading`; delete `baselineReading`) | model | event-driven | itself `:181-183,401,444,472,493` | n/a |
| `packages/devtools/src/model/Replay.ts` (mod, if the fold reaches it) | model | transform | itself `:106-114` | n/a |
| `packages/devtools/src/react/Simulator.tsx` (mod: `BaselineCard` reads `baseline.reading`) | component | render | itself `:470-486` | n/a |
| `packages/devtools/test/model/TimelineFeed.test.ts` (TF9-TF14) | test | effect | `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F8/F17/F24) + own harness `:9-30` | exact |
| `packages/devtools/test/model/DockModel.test.ts` (timelineStatus pin) | test | effect | own M-series near M15 | exact |
| `packages/devtools/test/react/useTimeline.test.tsx` (status via hook) | test | RTL | itself | exact |
| `packages/devtools/test/react/DiagnosticsNotice.test.tsx` (N10 changes; N12 focus ring) | test | RTL | itself `:1-40,152-165` | exact |
| `packages/devtools/test/react/TimelineNotice.test.tsx` (new) | test | RTL | `DiagnosticsNotice.test.tsx` | exact |
| `packages/devtools/test/react/DevtoolsDock.test.tsx` (slot on 4 timeline tabs; absence on 3) | test | RTL | itself (`:77` empty dock test) | exact |
| `packages/devtools/test/react/theme.contrast.test.ts` (new) | test | pure | none (see below) | none |
| `packages/devtools/test/model/SimulationSession.test.ts` (fold, identity pin) | test | effect | itself `:737-741,1071-1076` | exact |
| `packages/devtools/test/surface.test.ts`, `surface.tst.ts` | test | type | their `DiagnosticsStatus` lines | exact |
| `packages/react/src/QadiAtoms.ts` (mod: `subject` keepAlive; A2 seed wiring) | store/atoms | event-driven | itself `:248-250,258-300` | n/a |
| `packages/react/src/HydrationEngine.ts` (mod: A2 grant, delete `observedSeed`, `DENY_WITHHELD` spread) | store/atoms | transform | itself `:611-750`, `:92-98` | n/a |
| `packages/react/test/QadiProvider.subject.test.tsx` (new, SUBJ1-3) | test | RTL | `packages/react/test/QadiProvider.sweep.test.tsx` (P4 Activity) | exact |
| `packages/react/test/QadiProvider.seed.test.tsx` (new, SD1-SD5) | test | RTL | `QadiProvider.sweep.test.tsx` + `HydrationRender.test.tsx` | exact |
| `packages/react/test/Hydration.lifetime.test.ts` (new, graph) | test | atoms | `packages/react/test/QadiAtoms.sweep.test.ts`, `Hydration.test.ts` | exact |
| `packages/react/test/HydrationEngine.test.ts` (five seam tests migrated) | test | atoms | itself | n/a |
| `packages/react/test/GateRegistry.test.tsx` / `GateWriter.test.tsx` (GR-S1/S2 StrictMode identity change) | test | RTL | `GateRegistry.test.tsx:489`, `GateWriter.test.tsx:95-105`, `QadiProvider.sweep.test.tsx` P3 | exact |
| `packages/core/src/DecisionSink.ts:15` (comment) | comment | n/a | n/a | n/a |
| `packages/core/test/DecisionCache.test.ts:864` (wording) | test | n/a | n/a | n/a |
| `packages/http/test/v4-http-smoke.test.ts:106`, `stryker.http.mjs` comment | comment | n/a | n/a | n/a |
| `spec/behaviors/29-devtools-simulator.md` (BEH-QD-219..221 rebuilt) | spec | n/a | `spec-revise.mjs` flow (below) | exact |
| `spec/behaviors/28-devtools-screens.md` (BEH-QD-465 restated: eight readouts) | spec | n/a | its rev 1.18 restatement row `:13` | exact |
| `spec/traceability.md`, `spec/invariants.md`, `spec/overview.md`, react hydration behaviour doc (BEH-QD-516..518) | spec | n/a | CCR-QD-426's touched set | exact |
| `spec/README.md` (CCR-QD-427 row + Change History) | record | n/a | `spec/README.md:363` (CCR-QD-426), `:13` | exact |
| `spec/decisions/149-*.md` (new) + `spec/decisions/index.yaml` | ADR | n/a | `spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md:1-14`, `index.yaml:441-444` | exact |
| `spec/decisions/081-*.md` (amendment line) | ADR | n/a | `spec/decisions/014-react-via-atoms.md:1-11` | exact |
| `.changeset/*.md` (devtools minor Breaking; react patch) | changeset | n/a | `.changeset/atom-set-sweep.md` | exact |
| `apps/website/src/content/docs/docs/reference/upgrading.md` (0.x section for `baselineReading`) | doc | n/a | same file `## 0.12: the atom set holds its own bound` (`:552-580`) | exact |
| `.planning/phases/36-.../36-mutation-base.json` | record | n/a | `.planning/phases/34-.../34-mutation-base.json`, `35-mutation-base.json` | exact |
| `.planning/phases/36-.../36-LEDGER.md` (item ledger, D-03) | record | n/a | `36-RESEARCH-CODE.md` `## Ledger` table `:30-46` | role-match |

## Pattern Assignments

### `packages/devtools/src/model/TimelineFeed.ts` (model, scoped streaming)

**Analog:** `packages/devtools/src/model/DiagnosticsFeed.ts`

**Imports** (DiagnosticsFeed `:20-28`) add to TimelineFeed's current block (`TimelineFeed.ts:12-17`):
```ts
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberHandle from "effect/FiberHandle";
```

**Closed status** (DiagnosticsFeed `:49-63`) — copy the shape, keep only `Reading | Stopped{reason}` (D-13):
```ts
export type DiagnosticsStatus = Data.TaggedEnum<{
  Off: {};
  Starting: {};
  Live: {};
  Stopped: { readonly reason: string; readonly sampled: boolean };
}>;
export const DiagnosticsStatus = Data.taggedEnum<DiagnosticsStatus>();
```

**Readout + idle constant** (`:128-134`, `:143-159`): the readout is `{ subscribe, getSnapshot, restart }`; the idle readout is a module constant so the first pass keeps one identity:
```ts
const idle = (snapshot: DiagnosticsSnapshot): DiagnosticsReadout => ({
  subscribe: () => () => {},
  getSnapshot: () => snapshot,
  restart: () => {},
});
```
Mirror with `idleTimelineStatus` beside `idleTimeline` (`TimelineFeed.ts:48-55`).

**Token, closed flag, finalizer order** (`:169-182`):
```ts
// Names the current run, so a replaced run's late exit or accept changes nothing.
let generation = 0;
// Set when the scope closes: a command on a closed feed would publish a state nothing follows.
let closed = false;
const view = makeExternalStore<DiagnosticsSnapshot>(diagnosticsOff);
const handle = yield* FiberHandle.make<void>();
// Added after the handle, so it runs first on close: the run it interrupts is then a replaced one.
yield* Effect.addFinalizer(() =>
  Effect.sync(() => {
    generation += 1;
    closed = true;
  }),
);
const fork = yield* FiberHandle.runtime(handle)<never>();
```

**Gated accept + onExit** (`:198-226`):
```ts
const start = (next: DiagnosticsDockOptions) => {
  generation += 1;
  const mine = generation;
  ...
  const marking: DiagnosticsStore = {
    ...
    accept: (reading) => {
      if (mine !== generation) return;
      target.accept(reading);
      ...
    },
  };
  fork(
    runDiagnostics(marking, runOptions(next)).pipe(
      Effect.onExit((exit) =>
        Effect.sync(() => {
          if (mine === generation && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
            show(DiagnosticsStatus.Stopped({ reason: Cause.pretty(exit.cause), sampled }));
          }
        }),
      ),
    ),
  );
};
```
Replace TimelineFeed's `readSource` (`TimelineFeed.ts:79-82`, currently `forkRead(runSource(timeline, source ?? NO_SOURCE))`). Marking store is `{ accept }` only, so narrow `runSource`'s parameter in `TimelineStore.ts` to `Pick<TimelineStore, "accept">`.

**Restart** (`:253-255`, D-18 overrides RESEARCH-CODE's "no restart"):
```ts
const restart = () => {
  if (!closed && options !== undefined) start(options);
};
```
For the timeline: `if (!closed) readSource(inputs.source)`. `configure` must also early-return when `closed` (`:228-229`).

**Doc header**: keep the package-private note (`TimelineFeed.ts:10`) and add an "An interruption is not a stop" paragraph copied in spirit from DiagnosticsFeed `:10-13`.

---

### `packages/devtools/src/model/DockModel.ts` (eighth readout)

**Analog:** its own `diagnostics` readout. Interface (`:69-71`):
```ts
/** The merged reading and the poll's status, recomputed when either side changes, never on read. */
readonly diagnostics: DiagnosticsReadout;
```
Return (`:136-142`):
```ts
diagnostics: {
  subscribe: shownReading.subscribe,
  getSnapshot: shownReading.getSnapshot,
  restart: diagnosticsFeed.restart,
},
```
`timelineStatus` re-exposes `timelineFeed.status` + `timelineFeed.restart` directly (no merge). Update the header "seven stores" (`:2`, `:21`) to eight.

---

### `packages/devtools/src/react/useTimeline.ts` (hook)

**Analog:** own return (`useTimeline.ts:62-67`) plus the dock's diagnostics read (`DevtoolsDock.tsx:166`):
```ts
const store = feed?.timeline ?? idleTimeline;
const timeline = useStoreSnapshot(store);
const paused = usePaused(store);
return { timeline, paused, setPaused: store.setPaused, clear: store.clear, store };
```
Add `const status = useStoreSnapshot(feed?.status ?? idleTimelineStatus)` and `restart: feed?.restart ?? noop`; extend `UseTimeline` (`:24-31`). `useTimelineStore` (`:76+`) must also return a `status` (constant `Reading`) to satisfy the interface.

---

### Shared stopped box (new) and `DiagnosticsNotice.tsx` (mod)

**Analog:** `packages/devtools/src/react/DiagnosticsNotice.tsx`. Extract verbatim:
- `stoppedStyle` / `reasonStyle` (`:83-104`), button `{ ...button(false), marginTop: 8 }` (`:160`) hardened per D-16 to `color: colors.text` + amber border.
- Focus-return handler (`:113-118`), parameterised by selector:
```ts
const restart = (onRestart: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
  onRestart();
  const root = event.currentTarget.closest("[data-diagnostics-status]");
  if (root instanceof HTMLElement) root.focus();
};
```
Timeline passes `[data-testid="qadi-dock-body"]`.
- Alert-once by ledger (`:120-131`) and `keyOf` (`:169-170`):
```ts
const [alert] = useState(() => announced.current.stop !== status);
useLayoutEffect(() => {
  const { stop, count } = announced.current;
  if (stop !== status) announced.current = { stop: status, count: count + 1 };
}, [announced, status]);
```
- `StopLedger` (`:50-56`) becomes `StopLedger<S>` with `noStops` typed generically (`{ stop: undefined, count: 0 }`).
- `diagnosticsRootProps` (`:65-69`) spreads a new `focusRingProps` (onFocus/onBlur `matches(":focus-visible")` -> `outline: 2px solid colors.accent; outlineOffset: -2`), so N10's `deepStrictEqual(props.style, { padding: 12 })` (`DiagnosticsNotice.test.tsx:162`) must be updated in the same commit.
- Keep the box out of `src/react/index.ts` (ADR-QD-099; header `:15`).

### `packages/devtools/src/react/TimelineNotice.tsx` (new)

**Analog:** `noticeOf` + component (`DiagnosticsNotice.tsx:180-225`): `Match.type<S>().pipe(Match.tagsExhaustive({...}))` at module scope (AGENTS.md §5a), `Reading: () => () => NOTHING`, `Stopped: (status) => (binding) => <StoppedBox key={keyOf(...)} .../>`. Timeline has no `Starting`, so no polite region is needed unless UI-SPEC says so (UI-SPEC `:172-252` is the contract; test ids at UI-SPEC `:374-393`).

### `packages/devtools/src/react/DevtoolsDock.tsx` (mod)

Copy the diagnostics wiring (`:166-171`):
```ts
const { status, reading: shown } = useStoreSnapshot(model.diagnostics);
// Records only which stops were announced, never what the reading says (AGENTS.md §13).
const announced = useRef(noStops);
const notice = useMemo(
  () => ({ status, onRestart: model.diagnostics.restart, announced }),
  [status, model],
);
```
as `timelineAnnounced` + `model.timelineStatus`. `Screen` (`:272-318`) is a `Record<TabId, () => ReactNode>`; add a sibling `readsTimeline: Record<TabId, boolean>` and render the slot above. Delete `const nothing` (`:44`), its comment (`:40-43`) and the default `source = nothing` (`:130`).

---

### `packages/devtools/src/model/SimulationSource.ts` / `SimulationSession.ts` / `Simulator.tsx`

Named-arm pattern already in `SimulationSource.ts:36-58` (`FixtureSource`, `SnapshotSource`, `LiveSource` interfaces unioned). Declare `ReadySource`, `RefusedSource` the same way; replace private `type Ready` (`:187`) and the two inline `Extract<PreparedSource, { readonly _tag: "Ready" }>` (`SimulationSession.ts:472,493`). `describeSource` (no recorder) for `build()` at `SimulationSession.ts:401`; `prepareSource` stays for `start()`. Fold: `Checked { ..., reading: BaselineReading }`, delete `SimulationSnapshot.baselineReading` (`:181-183,444`); `Simulator.tsx:470-486` reads `baseline.reading.sentence`.

---

### `packages/devtools/test/model/TimelineFeed.test.ts`

Harness to reuse (own `:9-26`):
```ts
const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"));
const record = (evaluationId: string, at: number): StoredRecord => decisionRecord({ evaluationId, at });
const idsOf = (feed: TimelineFeed): ReadonlyArray<string> =>
  feed.timeline.getSnapshot().entries.map((entry) => entry.evaluationId);
```
Append after TF8 (`:155`). TF9 body is given verbatim in `36-RESEARCH-CODE.md:137-158`. TF12 mirrors `DiagnosticsFeed.test.ts` F8/F17/F24 (scope close + `settleTurns` from `test/helpers.ts:175`).

### `packages/devtools/test/react/TimelineNotice.test.tsx` (new) and N12

**Analog:** `DiagnosticsNotice.test.tsx`. Header doc + imports (`:1-16`), helpers (`:18-41`):
```ts
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
const freshRef = (): DiagnosticsNoticeProps["announced"] => ({ current: noStops });
const borderColorOf = (value: string): string => {
  const probe = document.createElement("span");
  probe.style.borderColor = value;
  return probe.style.borderColor;
};
```
Alert-once under StrictMode pattern: `:140-150`. Root-props pin: N10 `:152-165`.

---

### `packages/react/src/QadiAtoms.ts` (subject keepAlive)

Current (`:248-250`):
```ts
const subject = Atom.make<AuthSubject | undefined>(undefined).pipe(
  Atom.withEquality(subjectsEqual),
);
```
Fix: add `Atom.keepAlive` to the pipe. No `keepAlive` exists anywhere in `packages/react/src` today, so the comment must carry the why (the seed is written via `initialValues` at `QadiProvider.tsx:216-221` and only re-written on a dep change at `:255-259`). Lands before the seed fix (D-19 ordering, SD5).

### `packages/react/src/HydrationEngine.ts` (A2)

Code being replaced (`:694-750`): `seed = Atom.make(undefined)`, `announceStateFor` WeakMap per registry, `observedSeed` write at `:746` and fallback at `:730`:
```ts
const created: AnnounceState = { announced: false, observedSeed: undefined };
...
const seeded = get.once(seed) ?? state.observedSeed;
...
const seeded = get(seed);
if (seeded !== undefined) state.observedSeed = seeded;
return seeded === undefined ? result : AsyncResult.success(seeded);
```
The `WeakMap<AtomRegistry, AnnounceState>` (`:698-704`) is the in-file analog for A2's `WeakMap<SeedGrant, SeededDecision>`. `hydrate`/`hydrateWith` return `initialValues` (`:561`, `:589-598`). `DENY_WITHHELD` at `:92,98` becomes `[...ALLOW_WITHHELD, "obligations", "reason"] as const`. The prototype body is in `36-RESEARCH-SEEDS.md`; `DECISION_READ_BUDGET` stays at 2 for this file.

### `packages/react/test/QadiProvider.subject.test.tsx` / `QadiProvider.seed.test.tsx` (new)

**Analog:** `packages/react/test/QadiProvider.sweep.test.tsx` — imports (`:13-21`) and the Activity case P4 (`:136-165`):
```ts
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import { Activity, StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Can, QadiProvider, makeQadiAtoms } from "../src/index.ts";
import { settle } from "./support/settle.ts";
```
Use `support/settle.ts` for the macrotask waits instead of an ad hoc `setTimeout`. Test ids `SUBJ1-3`, `SD1-5`, `HL*` per the research files.

---

### Spec and records

- **spec-revise** (`scripts/spec-revise.mjs:5-6`): `node scripts/spec-revise.mjs <spec-doc.md> "<what changed>" --date 2026-11-12`, then `node scripts/spec-revise.mjs --check`.
- **Change History cell shape** (`spec/behaviors/28-devtools-screens.md:13`, rev 1.18): `1.18 (2026-11-12): BEH-QD-465 restated (seven stores) ... (ARCH-82, CCR-QD-425)` — the BEH-QD-465 restatement this phase repeats with "eight", heading at `:835`.
- **CCR row** (`spec/README.md:363`): `| CCR-QD-426 | 2026-11-12 | <every touched path, (new)/(amendment line) tagged, changesets with level and **Breaking**> | ...` and the README Change History entry `1.163 (2026-11-12): CCR-QD-426 — ARCH-83: ...` (`:13`). CCR-QD-427 adds `Used: … Unused: …` and `ADR: ADR-QD-149`.
- **New ADR header** (`spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md:1-14`): `# ADR-QD-148 — <title>`, a `> **Document Control**` table with Document ID `QADI-ADR-148`, Revision, Effective Date, `Status | Accepted — amends ADR-QD-014, ADR-QD-103`, Change History, then `## Context`. Index entry (`spec/decisions/index.yaml:441-444`):
```yaml
  - id: "ADR-QD-148"
    file: "148-the-atom-set-owns-its-eviction-sweep.md"
    title: "The atom set owns its eviction sweep"
    status: "Accepted — amends ADR-QD-014, ADR-QD-103"
```
- **Amendment line** (`spec/decisions/014-react-via-atoms.md:6-8`):
```md
> **Amended:** 2026-08-24 by [ADR-QD-053](./053-a-gate-can-be-found.md) — a guard
> may record that it exists. Two stale claims in the Consequences below corrected
> at the same time (CCR-QD-073).
```
Use for ADR-QD-081 (`Evaluate.ts` -> `Walk.ts`/`PortAccess.ts`, CCR-QD-427) and for any ADR ADR-QD-149 amends (ADR-QD-103/ADR-QD-014).

### Changesets and upgrading.md

**Analog:** `.changeset/atom-set-sweep.md`:
```md
---
"@qadi/react": minor
---

**Breaking.** `QadiProvider`'s `sweepIntervalMillis` prop is removed. ... Delete the prop.
```
Upgrade section (`upgrading.md:552-580`): `## 0.12: <what changed>`, one paragraph ending "Before:", a ` ```ts ` before block (not compiled), "After:", a compiled ` ```typescript `/` ```tsx ` block importing what it uses (`check-website-doc-examples.mjs`). For D-15: `SimulationSnapshot.baselineReading` -> `baseline.reading`.

### `36-mutation-base.json`

**Analog:** `34-mutation-base.json` (shape: `measured` file->score, `unmeasured` file->reason, `new`, `deleted`):
```json
{
 "measured": { "packages/devtools/src/model/DockModel.ts": 1 },
 "unmeasured": {
  "packages/devtools/src/react/useTimeline.ts": "outside stryker.devtools.mjs mutate (packages/devtools/src/model/** only)"
 },
 "new": ["packages/devtools/src/model/DiagnosticsFeed.ts"],
 "deleted": {}
}
```
`35-mutation-base.json` shows `QadiAtoms.ts` measured (0.8947) via the CLI `--mutate` override despite being outside the config list; follow that for `QadiAtoms.ts`/`HydrationEngine.ts` (D-19). Globs: `stryker.devtools.mjs:47` `mutate: ["packages/devtools/src/model/**/*.ts"]`; `stryker.react.mjs:55` list.

## Shared Patterns

### Generation token + onExit stop
**Source:** `DiagnosticsFeed.ts:169-226` — **Apply to:** `TimelineFeed.ts`. Interrupt is never a stop; finalizer added after the handle bumps the token first.

### Closed tagged status + module-scope Match
**Source:** `DiagnosticsFeed.ts:49-63,113-126`; `DiagnosticsNotice.tsx:180-198` — **Apply to:** `TimelineStatus`, `TimelineNotice.tsx`. No `switch` (SWITCH_BUDGET).

### Readout `{ subscribe, getSnapshot, restart }` read with `useStoreSnapshot`
**Source:** `DiagnosticsFeed.ts:128-134`, `DevtoolsDock.tsx:166` — **Apply to:** `DockModel.timelineStatus`, `useTimeline`, dock.

### Package-private (ADR-QD-099)
Feed and box stay out of `src/react/index.ts`; only `TimelineStatus` (value+type) is exported, beside `DiagnosticsStatus`, with `spec/overview.md` and `surface.test.ts`/`surface.tst.ts` rows (gate 13).

### Records discipline
Dates via `spec-revise.mjs --date 2026-11-12`; history rows never rewritten; amendments by `> **Amended:**` line.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| `packages/devtools/test/react/theme.contrast.test.ts` | test (pure) | No contrast/luminance test exists in `packages/devtools/test` (grep for `contrast|luminance` is empty). Use the WCAG relative-luminance formula from `36-RESEARCH-CODE.md` Q6 arithmetic; style probes like `borderColorOf` (`DiagnosticsNotice.test.tsx:21-26`) for normalising colours. |

## Research claims contradicted or stale

- `36-RESEARCH-CODE.md` says the timeline needs **no `restart`**; D-18 adds one. Follow D-18.
- `stryker.devtools.mjs` `mutate` is at `:47`, not `:62`; `stryker.react.mjs` `mutate` starts at `:55` (RESEARCH-CODE says `:78-83`; RESEARCH-SEEDS's `:55-60` is right).
- `theme.contrast.test.ts` is named in the research as if it existed; it is new.
- D-02 names `packages/react/src/useScoped.ts`; the file is `packages/devtools/src/react/useScoped.ts` (RESEARCH-CODE already notes this).
- `35-mutation-base.json` measured `QadiAtoms.ts` and `QadiProvider.tsx`, consistent with D-19's CLI-override approach.

## Metadata

**Analog search scope:** `packages/devtools/src/{model,react}`, `packages/devtools/test`, `packages/react/{src,test}`, `spec/decisions`, `spec/README.md`, `.changeset`, `apps/website/.../upgrading.md`, `.planning/phases/3[45]-*`, `stryker.*.mjs`, `scripts/spec-revise.mjs`
**Files scanned:** ~30
**Pattern extraction date:** 2026-11-12
