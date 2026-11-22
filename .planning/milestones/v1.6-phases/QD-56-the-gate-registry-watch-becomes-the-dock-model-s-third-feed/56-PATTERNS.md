# Phase 56: The gate-registry watch becomes the dock model's third feed - Pattern Map

**Mapped:** 2026-11-18
**Files analyzed:** 24 (new or modified)
**Analogs found:** 22 / 24 (the two without a strong analog are the records files, which follow Phase 55's own set)

All analog paths below were checked as git-tracked source. Line numbers are at HEAD `e985d7ed`.
Detail that 56-RESEARCH.md already settles (Q1 surface table, Q5 twin map, Q6 mutation, Q7 records) is cited by section, not repeated.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/devtools/src/model/GatesFeed.ts` (new) | feed (service) | event-driven + scheduled poll | `packages/devtools/src/model/DiagnosticsFeed.ts` | exact (role), mixed with `DockModel.ts` 175-286 (the code being moved) |
| `packages/devtools/src/model/DockModel.ts` | model | pub-sub combine | itself, lines 125-326 | exact |
| `packages/devtools/src/model/Gates.ts` | model (pure join) | transform | itself (`QuestionsView`, `JoinInput`, `joinQuestions`) | exact |
| `packages/devtools/src/model/DiagnosticsFeed.ts` | feed | scheduled poll | itself, lines 77-98, 180-185, 226-232 | exact |
| `packages/devtools/src/model/DiagnosticsStore.ts` | store | scheduled poll | itself (`runDiagnostics`, `DiagnosticsOptions`) | exact |
| `packages/devtools/src/react/QuestionsPanel.tsx` | component | request-response (render) | itself, the hoisted `Match.tagsExhaustive` over `QuestionsView` | exact |
| `packages/devtools/src/react/DevtoolsDock.tsx` | component (props) | request-response | itself, the `gates` prop plumbing | exact |
| `packages/devtools/src/react/useDockModel.ts` | hook | pub-sub | itself, the `gates` plumbing | exact |
| `packages/react/src/DevtoolsFeed.ts` | hook | request-response | itself | exact |
| `packages/devtools/test/model/GatesFeed.test.ts` (new) | test | event-driven | `packages/devtools/test/model/DiagnosticsFeed.test.ts` + `DockModel.test.ts` M31..M47, P2 | exact |
| `packages/devtools/test/model/DockModel.test.ts` | test | pub-sub | itself (M18, M49 rewrite; "join moves first" new) | exact |
| `packages/devtools/test/model/DiagnosticsFeed.test.ts`, `DiagnosticsStore.test.ts` | test | scheduled poll | themselves (`collectorOf()` at :84-87) | exact |
| `packages/devtools/test/model/Gates.test.ts` | test | transform | itself | exact |
| `packages/devtools/test/react/questionsProp.ts` (new) | test seam | transform | `packages/devtools/test/react/gatesProp.ts` | exact |
| new questions characterisation `.test.tsx` | test | request-response (render) | `QuestionsPanel.characterisation.test.tsx`, `ServicesPanel.characterisation.test.tsx` | exact |
| D-03 RED dock test (new `.test.tsx`) | test | request-response | same characterisation (via the seam) | role-match |
| `DiagnosticsScreens.test.tsx`, `DevtoolsDock.test.tsx`, `useDiagnostics.test.tsx`, `QuestionsPanel.test.tsx` | test | render | themselves | exact |
| `packages/devtools/test/surface.tst.ts` | tstyche | n/a | its `makeDiagnosticsFeed` / `makeTimelineFeed` `@ts-expect-error` pins (:199, :202) | exact |
| `packages/react/test/DevtoolsFeed.test.tsx`, `DevtoolsFeed.tst.ts` | test | n/a | themselves | exact |
| `.planning/phases/QD-56-…/56-mutation.mjs` (new) | script | batch | `.planning/phases/QD-55-…/55-mutation.mjs` | exact |
| `spec/decisions/169-….md` + `index.yaml`, `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/README.md`, `spec/overview.md`, `spec/traceability.md`, `09-react.md` | records | n/a | Phase 55's records (ADR-QD-168, BEH-QD-611..615, INV-QD-356, CCR-QD-446) | exact |
| `.changeset/*.md` x2, `upgrading.md`, READMEs, website `devtools.md`, `hooks.md`, `examples/nextjs-newsroom/src/client/Dock.tsx` (comment only) | docs | n/a | `.changeset/devtools-port-activity-is-a-port-name.md` | exact |

## Pattern Assignments

### `packages/devtools/src/model/GatesFeed.ts` (feed, event-driven + cadence)

**Analog:** `packages/devtools/src/model/DiagnosticsFeed.ts` for shape; the guarded watch logic is copied from `DockModel.ts` 100-119 and 187-244.

**Header and imports** (`DiagnosticsFeed.ts` 1-39): one-line summary, then why, "Package-private (ADR-QD-099)." Imports are submodule namespaces plus `.ts` relative paths:
```typescript
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Schedule from "effect/Schedule";
import type * as Scope from "effect/Scope";
import { DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS } from "./DiagnosticsStore.ts";
import { makeExternalStore } from "./ExternalStore.ts";
import { makeSupersedingRun } from "./SupersedingRun.ts";
```
Add `import * as Equal from "effect/Equal"` and `import type { AskedQuestionLike, GateInstanceLike, GateRegistryLike } from "./Gates.ts";`.

**Closed enum pattern** (`DiagnosticsFeed.ts` 48-62):
```typescript
export type DiagnosticsStatus = Data.TaggedEnum<{
  Off: {};
  Starting: {};
  Live: {};
  Stopped: { readonly reason: string; readonly sampled: boolean };
}>;
export const DiagnosticsStatus = Data.taggedEnum<DiagnosticsStatus>();
```
Use for `RegistryRead` and `AskedRead` (RESEARCH Pattern 1 has the exact tags).

**Hoisted Match conversion** (`DiagnosticsFeed.ts` 118-125): module-scope `Match.type<…>().pipe(Match.tagsExhaustive({…}))`; never `Match.value` per call.

**Feed factory shell** (`DiagnosticsFeed.ts` 161-170, 243):
```typescript
export const makeDiagnosticsFeed = Effect.fn("qadi.devtools.makeDiagnosticsFeed")(function* (
  init?: DiagnosticsDockOptions,
): Effect.fn.Return<DiagnosticsFeed, never, Scope.Scope> {
  ...
  const view = makeExternalStore<DiagnosticsSnapshot>(diagnosticsOff);
  const runs = yield* makeSupersedingRun();
  ...
  return { subscribe: view.subscribe, getSnapshot: view.getSnapshot, configure, restart };
});
```
Closed-feed guard on `configure` (`DiagnosticsFeed.ts` 216-218): `if (runs.closed()) return;`. Per-field identity compare to decide a restart (`:226-232`); for the gates feed the restart list is the thunk and the interval.

**Cadence** (copy `DiagnosticsStore.ts` 235-238, `Effect.repeat(Effect.sync(...), Schedule.spaced(...))`, forked through `runs.begin()` and `runs.fork(token, ...)` as in `DiagnosticsFeed.ts` 187-207). The tick is total, so no `onFailure`.

**Watch and stating code to move verbatim** (`DockModel.ts`):
- `reasonOf` / `keyOf` (100-119) become one `stated(thrown, fallback)` returning `{ reason, key }`; two hoisted fallback sentences (registry: unchanged text pinned by M46; thunk: "The questions threw a value that could not be described.").
- `watchGates` (228-244): the handle leaves state before it is called; the release is `try { release() } catch {}` and is not stated; a `subscribe` throw sets `watchFailure` and `watchKey`:
```typescript
const release = offGates;
offGates = () => {};
watchFailure = undefined;
watchKey = undefined;
try { release(); } catch { /* not stated */ }
try {
  offGates = closed || registry === undefined ? () => {} : registry.subscribe(rejoin);
} catch (thrown) {
  watchFailure = reasonOf(thrown);
  watchKey = keyOf(thrown);
}
```
Replace `closed` with `runs.closed()`.
- `readGates` (187-196): a held `watchFailure` wins and `instances()` is not called; else guarded `instances()`.
- Finalizer (275-286): take and clear `offGates`, guarded release. Register it **before** `makeSupersedingRun()` so LIFO order marks `closed()` first (RESEARCH Pitfall 7).
- Retry rule from `configure` (315-322): re-subscribe when `next.gates !== gatesNow || watchFailure !== undefined`.

**Error handling:** `try/catch` around every host call, never `Effect.orDie`. The compare of the thunk's answer (`Equal.equals`, precedent `DiagnosticsStore.ts` `keep`, :152) sits inside the same `try` as the call.

### `packages/devtools/src/model/DockModel.ts` (model, pub-sub combine)

**Analog:** itself. Delete lines 100-119 (`reasonOf`, `keyOf`), 175-244 (the eight `let`s and the watch), the finalizer 275-286, and the gate branch of `configure` (315-322).

**Keep as the pattern for what stays** (`DockModel.ts` 245-269, `reservice`): a `lastX` key, `servicesKeyNow`, reference compare, `store.set`. `rejoin` is rewritten the same way over `{ feed snapshot, supplied, unsampled }` (RESEARCH Pattern 2 sketch).

**Ordering to preserve** (`DockModel.ts` 270-272): `shownReading` exists, then `gatesFeed.subscribe(rejoin)` and `shownReading.subscribe(rejoin)` before any host listener (the "join moves first" claim).

**configure** (`DockModel.ts` 304-324): call `gatesFeed.configure({ gates, questions, intervalMillis: next.diagnostics?.intervalMillis })` first, then `diagnosticsFeed.configure`, then `remerge()`, then `rejoin()`. Move the Rev 1.5 comment (315-317) with it.

**Inputs** (`DockModel.ts` 65-77): add `readonly questions?: (() => ReadonlyArray<AskedQuestionLike>) | undefined` beside `gates`.

### `packages/devtools/src/model/Gates.ts` (pure join)

**Analog:** itself. `QuestionsView` (285-292) gains `Failed: { readonly reason: string }`; `JoinInput` (303-310) gains required `readonly questionsFailed: string | undefined`; `joinQuestions` (339-359) orders rows, empty, failed, unsampled, absent. `Gates.test.ts` literals (:262, 296-297, 320, 332, 339, 348-349) gain `questionsFailed: undefined`.

### `packages/devtools/src/model/DiagnosticsFeed.ts` and `DiagnosticsStore.ts` (D-02 removal)

Edits are listed in RESEARCH Q1 rows 1-2. In `DiagnosticsFeed.ts`: remove line 95, line 183, the `next.questions !== before.questions` test at 230, the `AskedQuestionLike` import (37), and reword the header lines 3-8. In `DiagnosticsStore.ts`: remove `DiagnosticsOptions.questions` (~:200), the sampling (~:223-225) and the `Effect.all` key (~:232). `Diagnostics.questions` and `DiagnosticsReading.questions` stay.

### `packages/devtools/src/react/QuestionsPanel.tsx` (component)

**Analog:** the existing hoisted `Match.tagsExhaustive` over `QuestionsView` at ~165-185. Add one arm; copy and attributes are locked by `56-UI-SPEC.md` (`data-testid="qadi-questions-failed"`, `{ ...muted, color: colors.error }`, no `role`, no `aria-*`). Model it on the existing `qadi-gates-failed` paragraph in the same file.

### `packages/devtools/src/react/DevtoolsDock.tsx`, `useDockModel.ts` (props plumbing)

**Analog:** how `gates` is destructured, passed to `useDockModel({ source, capacity, catalogue, ports, diagnostics, reading, gates })` (`DevtoolsDock.tsx` ~:164) and listed in the `configure` effect dependencies (`useDockModel.ts` 28-36, 49-55). Add `questions` at each of the same three sites. Drop "and a question source" from the `diagnostics` doc (~:93).

### `packages/react/src/DevtoolsFeed.ts` (hook)

**Analog:** itself, lines 71-127 (read above). Concretely:
- `DevtoolsDiagnosticsFeed` becomes `{ layer }`; doc "The diagnostics field this feed owns".
- `DevtoolsFeed<Extra>` gains `readonly questions: () => ReadonlyArray<AskedQuestion>` beside `gates` and `onInvalidate`.
- `type FeedOwnedKey = "layer" | "questions";` (NOT `keyof DevtoolsDiagnosticsFeed`, or `extra.questions` would compile and be silently ignored).
- Body: `const diagnostics = useMemo(() => ({ ...extra, layer }), [extra, layer]); return { gates, questions: atoms.asked, onInvalidate, diagnostics };`.
- Tests: `DevtoolsFeed.test.tsx` :143-144 and `DevtoolsFeed.tst.ts` :39 move `feed.diagnostics.questions` to `feed.questions`; `:22-26` (`not.toBeCallableWith({ questions })`) stays valid. `DevtoolsFeed.ts` is in no Stryker glob, so ordinary tests only.

### `packages/devtools/test/model/GatesFeed.test.ts` (new, RED by import first)

**Analog:** M31..M47 and P2 in `DockModel.test.ts` (twin map: RESEARCH Q5 table) with `packages/devtools/test/gateRegistryDouble.ts` (`makeGateRegistryDouble`; `failReads`, `mendReads`, `mendReadsQuietly`, `failSubscribe`, `mendSubscribe`, `failRelease`, `listeners()`, `subscriptions()`, `releases()`, `reads()`; no API addition needed). Tick helper: `DockModel.test.ts` 1024-1028 (`settleTurns`, `TestClock.adjust("2 seconds")`, `settleTurns`; `settleTurns` in `test/helpers.ts:175-177`). First commit is the test importing the missing `../../src/model/GatesFeed.ts`. The quiet-tick example is RESEARCH "The twin that proves a quiet tick"; the store-level quiet-tick test at `DiagnosticsStore.test.ts` 274-300 moves here.

### `packages/devtools/test/react/questionsProp.ts` (new seam)

**Analog:** `packages/devtools/test/react/gatesProp.ts` (whole file, 14 lines; header explains the seam: the characterisation passes every input through it so the goldens never change). Base version: `(props, thunk) => ({ ...props, diagnostics: { ...props.diagnostics, questions: thunk } })`. In the commit that moves the thunk (4b) it becomes `({ ...props, questions: thunk })`; that is the only edit. Write it before the first characterisation cell.

### New questions characterisation (`QuestionsPanel.…characterisation…test.tsx`, never edited after base)

**Analog:** `QuestionsPanel.characterisation.test.tsx` (helpers at lines 24-62: `gate`, `hook`, `neverBuilt = { layer: Layer.effectDiscard(Effect.never) }`, `panelMarkup(props, guards)` that renders `<DevtoolsDock {...props} gates={gatesProp(guards)} />` and compares the panel root `outerHTML`, never a substring) and `ServicesPanel.characterisation.test.tsx` from Phase 55 for the "written on the base, header says so" style. Cells: RESEARCH Q5 list 1-10. Silent-mend cells use only a `configure` re-render, an announcement, or a changed-answer tick (never a hydration-only publish). Do NOT edit the existing characterisation file.

### D-03 RED dock test

Same render helpers and the `questionsProp` seam. Assert `qadi-questions-failed` text and root `data-diagnostics-status` is `Live`, and `qadi-diagnostics-stopped` absent. On the base this fails (poll `Stopped`). Model twin: rewritten M18 in `DockModel.test.ts`.

### Dying-poll rewrites (11 tests)

**Analog:** `DiagnosticsFeed.test.ts` `collectorOf()` (:84-87) and the `source(script)` helper (:73-77). A `PortCallCollector` whose `snapshot` is `Effect.die(...)` (`PortCalls.ts` 167-179). Affected cases: F4..F7, F13-F17, F23-F29, M18, M49 (trigger), D4..D8, D11, `useDiagnostics.test.tsx` 142-157, `DevtoolsDock.test.tsx` 1092-1096 and 1177-1190 (full table: RESEARCH Q4).

### `56-mutation.mjs`

**Analog:** `.planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation.mjs` (tracked). Copy whole; change `D`, the new-module constant to `GatesFeed.ts`, `BASE = [DockModel.ts, DiagnosticsFeed.ts, DiagnosticsStore.ts, Gates.ts]`, `AFTER = BASE + GatesFeed.ts`, `MOVED = [DockModel.ts, DiagnosticsFeed.ts, DiagnosticsStore.ts]` (declared before the change). Phase 55 recorded only `DockModel.ts` (145 killed, 0 survived), so the other three must be measured on the base.

### Records, changesets, docs

**Analog:** Phase 55's set (`55-PATTERNS.md`, and `.changeset/devtools-port-activity-is-a-port-name.md` for the changeset shape: frontmatter, one `**Breaking.**` paragraph, a "no X changes" sentence, ending "See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`."). Placement, ids and revision bumps are settled in RESEARCH Q7 (ADR-QD-169 plus `index.yaml` after the 168 entry; BEH-QD-616..620 after 615; INV-QD-357/358 after 356; CCR-QD-447 after 446, ending "Unused: …"; revision table; `node scripts/spec-revise.mjs --check`). Overview rows to edit: `spec/overview.md` :584, :909, :920, :923 ("nine optional props" becomes ten).

## Shared Patterns

### Host code is guarded, and stating a throw is total
**Source:** `DockModel.ts` 100-119 and 187-244 (moving to `GatesFeed.ts`)
**Apply to:** every registry and thunk call in `GatesFeed.ts`. A throw is stated, never swallowed; a release that throws is not stated and not repeated; a closed feed runs no host code.

### One store, publish only on a new reference
**Source:** `ExternalStore.ts` (`set` notifies only on a different reference)
**Apply to:** `GatesFeed.ts` snapshot, `DockModel.rejoin`. Keep each half's reference when unchanged (structural sharing) so `rejoin` compares one reference.

### Scoped run, superseded, closed with the scope
**Source:** `SupersedingRun.ts` (`makeSupersedingRun`: `begin`, `fork`, `isCurrent`, `stop`, `closed`)
**Apply to:** the thunk cadence in `GatesFeed.ts`.

### House style (AGENTS.md)
No `as`, `!`, `any`, `Record<string, unknown>`, `async`, new `switch`, `Effect.orDie`; `Effect.fn("qadi.devtools.…")` for the factory; no new `Effect.fnUntraced` (`UNTRACED_BUDGET`); hoisted `Match.type`; `.ts` relative imports and `import type` for types; module stays out of both barrels, pinned by `surface.tst.ts` `@ts-expect-error` entry for `makeGatesFeed`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `GatesFeed.ts` cadence that reads host code and compares with `Equal.equals` | feed | scheduled poll over a host thunk | The poll in `runDiagnostics` samples inside an Effect and ends on a defect; no existing feed guards a host thunk per tick. Combine `DiagnosticsStore.ts` 235-238 (loop) with `DockModel.ts` `readGates` (guard) as RESEARCH Pattern 1 rule 6-7 describes. |
| "join moves first" test | test | pub-sub ordering | No existing test asserts it (claim lives only in the `DockModel.ts:270` comment); RESEARCH Q5 gives the recipe. |

## Metadata

**Analog search scope:** `packages/devtools/{src/model,src/react,test}`, `packages/react/{src,test}`, `.planning/phases/QD-55-*`, `.changeset/`
**Files read this pass:** `56-RESEARCH.md` (lines 1-592 of 688; Validation Architecture tail and Plan Shape after line 592 not read), `56-CONTEXT.md`, `DiagnosticsFeed.ts`, `DockModel.ts` 95-326, `gatesProp.ts`, characterisation head, `DevtoolsFeed.ts` 60-130, `ExternalStore.ts`, `55-mutation.mjs` head. `TimelineFeed.ts`, `QuestionsPanel.tsx`, `DevtoolsDock.tsx`, `useDockModel.ts` were located and cited through RESEARCH line references, not re-read.
**Pattern extraction date:** 2026-11-18
