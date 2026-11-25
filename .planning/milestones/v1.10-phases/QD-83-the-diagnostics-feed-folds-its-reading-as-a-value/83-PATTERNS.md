# Phase 83: The diagnostics feed folds its reading as a value - Pattern Map

**Mapped:** 2026-11-25
**Files analyzed:** 14 (groups)
**Analogs found:** 13 / 14

All analog paths are tracked source under `packages/`, `scripts/`, `.changeset/` or `.planning/phases/QD-81-*` (none are gitignored mirrors).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/Diagnostics.ts` (git mv of `DiagnosticsStore.ts`; add `foldReading`, `DiagnosticsSink`; drop store and `questions`) | model/utility | transform | `ExternalStore.ts` `sameFields`; `TimelineStore.ts` `runSource` | role-match |
| `packages/devtools/src/model/DiagnosticsFeed.ts` | feed | event-driven (poll to publish) | `TimelineFeed.ts` `readSource` (lines 166-189) | exact |
| `packages/devtools/src/model/DockModel.ts` (import path only) | model | derived | self | n/a |
| `packages/devtools/test/model/Diagnostics.test.ts` (rename plus fold value tests) | test | transform | existing `DiagnosticsStore.test.ts` | exact |
| `packages/devtools/test/model/Diagnostics.tst.ts` (rename, sink pins) | test (type) | n/a | existing `DiagnosticsStore.tst.ts` | exact |
| `packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts` | test | event-driven | `DockModel.characterisation.test.ts` | exact |
| `packages/devtools/test/surface.tst.ts` | test (type) | n/a | its own lines 240-265 | exact |
| `.changeset/devtools-diagnostics-has-no-questions.md` | config | n/a | `.changeset/devtools-feed-hands-the-gate-registry.md` | exact |
| `apps/website/.../reference/upgrading.md` (new 0.13 entry) | docs | n/a | `## 0.13: the dock takes the gate registry, not its instances` (line 871) | exact |
| `scripts/check-package-install.mjs` (`REFUSED_SHAPE_PROBES`, line 124) | config/gate | n/a | existing map entries | exact |
| `scripts/check-house-style.mjs:771`, AGENTS.md §6 row, `spec/*` | registers | n/a | rename-in-step only | exact |
| `83-check.mjs`, `83-pinned-check.mjs`, `83-mutation.mjs` | script | batch | Phase 81 `81-check.mjs` (624 lines), `81-pinned-check.mjs` (210), `81-mutation.mjs` (361) | exact |
| `83-RED-EVIDENCE.md`, `83-mutation-*.json` | evidence | n/a | Phase 81 `81-RED-EVIDENCE.md`, `81-mutation-base.json` | exact |
| `foldReading` value tests | test | transform | none in repo for a per-field fold | no analog (use D-07) |

## Pattern Assignments

### `Diagnostics.ts` (model, transform)

**Analog for the fold:** today's private `keep` and `accept` in `DiagnosticsStore.ts` lines 161-189, plus `sameFields` in `ExternalStore.ts:153`.

Code being replaced:
```ts
const keep = <A>(previous: A, next: A): A => (Equal.equals(previous, next) ? previous : next);
// accept: merged = { wiring: keep(current.wiring, next.wiring), ... questions: keep(...) };
// then a five-clause `===` chain, then store.set(merged)
```
Target shape (D-06). Keep `keep` module-private. The return type `Diagnostics` makes a new field a compile error.
```ts
export const foldReading = (previous: Diagnostics, next: Diagnostics): Diagnostics => {
  const folded: Diagnostics = {
    wiring: keep(previous.wiring, next.wiring),
    activity: keep(previous.activity, next.activity),
    hydration: keep(previous.hydration, next.hydration),
    portCalls: keep(previous.portCalls, next.portCalls),
  };
  return sameFields(folded, previous) ? previous : folded;
};
```
`sameFields` (ExternalStore.ts 153-160) compares `Object.entries` by `===`.

**Sink, copy `runSource`** (`TimelineStore.ts:115-116` takes `store: Pick<TimelineStore, "accept">` and calls `store.accept(record)`). Here `runDiagnostics` currently takes `store: DiagnosticsStore` (line 238-241) and its sample ends with:
```ts
}).pipe(Effect.tap((reading) => Effect.sync(() => store.accept({ ...reading, questions: undefined }))));
```
Change to `sink: DiagnosticsSink` (`export interface DiagnosticsSink { readonly accept: (sample: Diagnostics) => void }`) and `Effect.tap((sample) => Effect.sync(() => sink.accept(sample)))`. Keep the span name, `Effect.scoped`, `Schedule.spaced`, `wiringReader`.

**Remove:** `questions` from `Diagnostics` (lines 83-87), `noDiagnostics` (line 96) and `mergeReading` (line 143). Update the doc comments on `mergeReading` and `DiagnosticsReading.questions` (line 116). Delete `DiagnosticsStore` and `makeDiagnosticsStore` (146-189). Drop the `makeExternalStore` import if it is unused. Add the `sameFields` import from `./ExternalStore.ts`.

Imports use `import * as X from "effect/X"` and `.ts` extensions (AGENTS.md §1).

### `DiagnosticsFeed.ts` (feed, event-driven)

**Analog:** `TimelineFeed.ts:173-189`. It builds a `marking: Pick<TimelineStore,"accept">` with the `isCurrent` guard, then:
```ts
try { status.set(READING); } finally {
  reads.fork(token, runSource(marking, source ?? NO_SOURCE), { onFailure: (cause) => status.set(...) });
}
```
Current code to rewrite (`DiagnosticsFeed.ts` 168-215). The pieces:
- `let store` (169): delete.
- `show` (177-182): becomes `show(status, reading = view.getSnapshot().reading)`. It keeps the drop `if (current.status === status && current.reading === reading) return;` and then `view.set({ status, reading })`.
- `marking` (187-198): replaced by a sink literal built per `start()`:
```ts
const sink: DiagnosticsSink = {
  accept: (sample) => {
    if (!runs.isCurrent(token)) return;                       // F33, first
    const current = view.getSnapshot();
    const reading = foldReading(current.reading, sample);
    sampled = true;
    show(DiagnosticsStatus.$is("Live")(current.status) ? current.status : DiagnosticsStatus.Live(), reading);
  },
};
```
Take care: today `show` runs after `sampled = true`, and an unchanged sample must still mark `Live`. The `try { show(diagnosticsStarting.status) } finally { runs.fork(token, runDiagnostics(sink, next), {onFailure...}) }` shape stays byte for byte (ADR-QD-194).
- `off()` (210-215) becomes `runs.stop(); sampled = false; view.set(diagnosticsOff);`.
- Doc comment at line 144 names `DiagnosticsStore.ts`: change it to `Diagnostics.ts`.

### Test files
- `Diagnostics.tst.ts` (from `DiagnosticsStore.tst.ts`): the three negative pins on `Params<typeof runDiagnostics>` (lines 59, 64, 71) use `store`. Replace the `declare const store: DiagnosticsStore` (line 31) with `declare const sink: DiagnosticsSink`. The `callable: 3` count holds. Lines 47, 51, 55 and 65 are the positive twins. New non-callable pins: `expect<Diagnostics>().type.not.toHaveProperty("questions")` with the twin `expect<DiagnosticsReading>().type.toHaveProperty("questions")`.
- `surface.tst.ts` lines 240-265 use the pattern `// @ts-expect-error no exported member` followed by `export { X } from "../src/index.ts";`. Add the same pair for `foldReading` and `export type { DiagnosticsSink }`. Keep the existing `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics` and `DiagnosticsStore` pins.
- Characterisation: copy the style of `DockModel.characterisation.test.ts`. Its header lists the rows it pins and the rows left to other files. It imports `{ assert, describe, it } from "@effect/vitest"`, with `Effect`, `Exit` and `Scope`. Build feeds through `test/builtFeeds.ts` (`diagnosticsFeedOf`), `test/collectorDouble.ts` and `test/helpers.ts` (`settleTurns`). Do not import the renamed module. Use `diagnosticsOff.reading` as the empty reading.

### Changeset, upgrade guide, gate 14
- Changeset: copy `.changeset/devtools-feed-hands-the-gate-registry.md`. Frontmatter has `"@qadi/devtools": minor`, and the body opens `**Breaking.** ...`.
- upgrading.md: copy the heading style `## 0.13: ...` (line 871 is the nearest, and line 898 is the last). It has a `ts` before-fence and a compiled `typescript` after-fence. Check the existing line ≈921 note.
- Gate 14: `REFUSED_SHAPE_PROBES` (scripts/check-package-install.mjs:124-127) is `new Map([["DecisionCacheShape","getOrCompute"],["DiagnosticsOptions","schedule"]])`. Add `["Diagnostics","questions"]`. The sandbox consumer, around line 733-760 and 1012, needs a `Diagnostics` literal whose `questions` carries `@ts-expect-error`, plus an `expect` that the packed feed's live reading has no `questions` key. Read the doc comment at line 63 first.

### Phase-local scripts
Copy from `.planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/`: `81-check.mjs` (modes base, commit, unchanged, seen-failing, scan-ids, scan-forbidden, trailers, --self-test), `81-pinned-check.mjs`, `81-mutation.mjs`, `81-archived-checks.mjs` and `81-RED-EVIDENCE.md`. Add the modes `no-store`, `single-fold`, `stale-path` and `registers` (D-20). Add the rename map `DiagnosticsStore.ts -> Diagnostics.ts` to the mutation script and to the pinned-check base path.

## Shared Patterns

### Per-field "did it move"
**Source:** `ExternalStore.ts` `sameFields` (153) and `sameFieldsOrAbsent` (169). Used by `configure` (`DiagnosticsFeed.ts:221`, `TimelineFeed.ts:204`). The fold reuses it, so no hand-written `&&` chain.

### Superseded-run guard and publish-then-fork
**Source:** `TimelineFeed.ts:175-188` and `DiagnosticsFeed.ts:187-207`. The order is guard, then fold, then flag, then publish. The shape is `try { show(Starting) } finally { runs.fork(...) }`.

### Package-private out of the barrel
**Source:** `surface.tst.ts` "no exported member" pins (ADR-QD-099).

### Rename-in-step registers
Importers of `./DiagnosticsStore.ts` to move: `src/index.ts` (31-40), `src/react/index.ts:21`, `DiagnosticsFeed.ts`, `DockModel.ts` (52-56), `GatesFeed.ts`, `PortCards.ts`, `DevtoolsDock.tsx`, `useDiagnostics.ts`, tests and `builtFeeds.ts`. Registers to move: `scripts/check-house-style.mjs:771`, AGENTS.md §6 line 566, and `spec/traceability.md`, `spec/overview.md` and `spec/behaviors`, all through `spec-revise`. Before the rename commit, run `grep -rn DiagnosticsStore` over `packages/`, `spec/`, `scripts/` and AGENTS.md for a complete list.

## No Analog Found

| File | Reason |
|---|---|
| `foldReading` table-driven value tests | No existing per-field fold has value tests. Use D-07 and the style of the existing `makeDiagnosticsStore` describe in `DiagnosticsStore.test.ts`, minus store and Effect. |

## Precedent notes
- `git log --diff-filter=R -- packages/devtools` shows rename commits `45760c2b` and `dab09bc0`. They are mixed-content commits, so they are not a pure-rename model. Use `git mv` and an import-only edit.
- The join in `DockModel.ts` (≈381-393) reads `held.reading?.questions` directly. It needs no logic change.

## Metadata
**Analog search scope:** `packages/devtools/src/model`, `packages/devtools/test`, `scripts`, `.changeset`, Phase 81 directory.
**Files scanned:** about 15.
**Extraction date:** 2026-11-25
