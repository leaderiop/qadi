# Phase 60: Devtools' headless interface is the feeds - Pattern Map

**Mapped:** 2026-11-19
**Files analyzed:** 36 new or modified
**Analogs found:** 36 / 36 (all `git ls-files` tracked; no gitignored mirror paths)

Line numbers are HEAD `729c8064`. Excerpts are verbatim; "change" lines say what the plan edits. Research (`60-RESEARCH.md`) holds the target text for each edit (Pattern 1, Pattern 2, Q5, Q6, Q8); this file gives the in-repo shape to copy it into.

## File Classification

| File | Role | Data flow | Closest analog | Match |
|------|------|-----------|----------------|-------|
| `packages/devtools/src/index.ts` | barrel | n/a | itself (`:24-37`, `:123-126`) | exact |
| `packages/devtools/src/react/index.ts` | barrel | n/a | itself (`:19-22`) | exact |
| `src/model/DiagnosticsFeed.ts` (doc, delete `runOptions`, `DiagnosticsDockOptions`) | feed | event-driven | itself; `GatesFeed.ts` for the public doc | exact |
| `src/model/DiagnosticsStore.ts` (one `DiagnosticsOptions`, non-generic `runDiagnostics`) | engine | batch/poll | itself (`:188-260`) | exact |
| `src/model/TimelineFeed.ts`, `GatesFeed.ts` (doc comment only) | feed | event-driven | each other (line `Package-private (ADR-QD-099).` is the edit) | exact |
| `src/model/DockModel.ts`, `react/DevtoolsDock.tsx`, `react/useDockModel.ts`, `react/useDiagnostics.ts` | type rename | n/a | research Q2 table | exact |
| `test/surface.test.ts` | test | list pin | itself | exact |
| `test/surface.tst.ts` | type test | pin | itself | exact |
| `test/model/{Timeline,Diagnostics,Gates}Feed.test.ts` | test | re-point imports | research Pattern 3 | exact |
| `test/model/DiagnosticsStore.test.ts`, `.tst.ts` | test | rename + pins | themselves | exact |
| `test/react/*` (5 files) + frozen characterisation (2 lines) | test | rename | `questionsProp.ts` seam | exact |
| `scripts/check-package-install.mjs` consumer | gate script | request-response | itself (`:425`, `:488-501`) | exact |
| `packages/devtools/README.md` headless fence | doc, compiled | n/a | research Q6 + `README.md:125-147` | role |
| `apps/website/.../packages/devtools.md` | doc | n/a | itself (`:172-178`, `:220-226`) | exact |
| `apps/website/.../reference/upgrading.md` (0.12 fence + new 0.13) | doc, compiled fence | n/a | `:912-924` (0.13 questions section) | exact |
| `examples/nextjs-newsroom/src/client/Counters.tsx` | example | n/a | itself (`:13`, `:22`) | exact |
| `.changeset/devtools-headless-interface-is-the-feeds.md` | changeset | n/a | `.changeset/devtools-questions-is-a-dock-input.md` | exact |
| ADR-QD-173 + `index.yaml` | record | n/a | ADR-QD-172 + `index.yaml:537-540` | exact |
| ADR-047 / 099 / 169 amendment blocks | record | n/a | ADR-047 amendments (`:495-511`), ADR-099 (`:76-87`) | exact |
| BEH-QD-636..640 | record | n/a | BEH-QD-620 (`28-devtools-screens.md:2405-2427`) | exact |
| INV-QD-365..366 | record | n/a | INV-QD-363/364 (`invariants.md:4225-4252`) | exact |
| `spec/overview.md` rows | record, gated | n/a | itself (`:844-848`, `:866-920`) | exact |
| `spec/traceability.md`, CCR-QD-451 row in `spec/README.md` | record | n/a | rows for ADR-172, CCR-QD-450 | exact |
| `60-mutation.mjs`, `60-mutation-base.json` | phase script | batch | `.planning/phases/QD-59-*/59-mutation.mjs` + `56-mutation.mjs` constants | exact |
| `60-scan.mjs` | phase script | batch | `.planning/phases/QD-59-*/59-scan.mjs` | exact |

## Pattern Assignments

### `packages/devtools/src/index.ts` (barrel)

**Analog:** itself. The `devtools-named-barrel` rule (`check-house-style.mjs:1860-1868`) wants specifiers bytewise ascending and no `export *`.

Block to delete/replace (`index.ts:24-37`):
```ts
export {
  DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS,
  WiringRead,
  makeDiagnosticsStore,
  mergeReading,
  noDiagnostics,
  runDiagnostics,
} from "./model/DiagnosticsStore.ts";
export type {
  Diagnostics,
  DiagnosticsOptions,
  DiagnosticsReading,
  DiagnosticsStore,
} from "./model/DiagnosticsStore.ts";
```
and (`:123-124`):
```ts
export { makeTimelineStore, runSource } from "./model/TimelineStore.ts";
export type { TimelineStore } from "./model/TimelineStore.ts";
```
Change: keep the `TimelineStore` type line, drop the value line, add the groups from research Pattern 1 in module-path order (`DiagnosticsFeed` < `DiagnosticsStore`; `Gates` < `GatesFeed`; `Timeline` < `TimelineFeed` < `TimelineStore`). Also rewrite the header paragraph `:13-19` ("the three stores a shell runs (`TimelineStore`, `SimulationSession`, `DiagnosticsStore`) with their runners") to "the three feeds a shell builds in a scope".

### `packages/devtools/src/react/index.ts` (barrel)

**Analog:** itself (`:19-22`):
```ts
export { DiagnosticsStatus } from "../model/DiagnosticsFeed.ts";
export type { DiagnosticsDockOptions, DiagnosticsSnapshot } from "../model/DiagnosticsFeed.ts";
export type { AskedQuestionLike } from "../model/Gates.ts";
export { TimelineStatus } from "../model/TimelineFeed.ts";
```
Change: `DiagnosticsDockOptions` leaves line 20; add `export type { DiagnosticsOptions } from "../model/DiagnosticsStore.ts";` after the `DiagnosticsFeed` lines (module-path order). `useDiagnostics.ts:19` re-export of `DiagnosticsDockOptions` is deleted.

### `DiagnosticsStore.ts` (engine; one option shape)

**Analog:** itself. Current (`:188-199`, `:210-229`, `:240-242`) is the "before"; target is research Pattern 2. Keep the `Effect.fn("qadi.devtools.runDiagnostics")` name (span name unchanged). The single repeat line becomes
`Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)`. The doc comment of the new interface is `DiagnosticsDockOptions`' (`DiagnosticsFeed.ts:69-96`, quoted above in the file). Declare the type here, not in the feed (type-only cycle for `pnpm circular`). Rewrite the module comment `:1-36` ("available to any shell that is not React", "`runDiagnostics` writes that pull once") for a package-private engine.

### `DiagnosticsFeed.ts`

**Analog:** itself. Edits:
- `:26`, `:29` drop `Schedule` and `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS` imports (`noUnusedLocals`); import `type DiagnosticsOptions` from `./DiagnosticsStore.ts` (`:28-35` already imports that module).
- `:77-96` delete `DiagnosticsDockOptions`; `:178-182` delete `runOptions`; `:201` becomes `runs.fork(token, runDiagnostics(marking, next), {`.
- `:19` "Package-private (ADR-QD-099)." becomes a public-reader sentence (see GatesFeed doc below for tone).
- D-16 survivor rewrite, copy shape (current `:214-225`):
```ts
    if (next === undefined) {
      // Already off: a second `undefined` must not bump the token, fork or build a store.
      if (before !== undefined) off();
      return;
    }
```
  target: `if (next === undefined) { off(); return; }`, comment removed. `off` (`:204-209`) stays idempotent and silent; F26 (`DiagnosticsFeed.test.ts:422-439`) pins it. Measure against the base first.

### `TimelineFeed.ts`, `GatesFeed.ts` doc comments

**Analog:** each file's own header. Replace only the last line `* Package-private (ADR-QD-099).` (`TimelineFeed.ts:9`, `GatesFeed.ts:18`). Keep the preceding why-paragraphs (AGENTS.md doc-comment shape: one-line summary first, rationale after). Write for a headless caller: built in the caller's scope, only forks, closing the scope ends it, `configure` replaces the whole input set (TimelineFeed `:63`), `Stopped.reason` is a `Cause.pretty` trace that must not cross a trust boundary (D-17). No code changes, so no mutants move.

### `test/surface.test.ts`

**Analog:** itself. Pin shape (`:19-21`, `:75-87`):
```ts
const ROOT_VALUES: ReadonlyArray<string> = [ "DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS", ... ];
describe("@qadi/devtools' interface (ADR-QD-047, ADR-QD-099)", () => {
  it("the root exports exactly the stores, the host wiring and the timeline readings", () => {
    assert.deepStrictEqual(Object.keys(Root).sort(), [...ROOT_VALUES].sort());
  });
```
Change: ROOT_VALUES becomes the 49-name list in research Q5; drop `makeDiagnosticsStore`, `makeTimelineStore`, `noDiagnostics`, `runDiagnostics`, `runSource` (`:47,49,57,58`); header comment `:5-8` "three stores ... with their runners" reworded to feeds. `REACT_VALUES` unchanged (8).

### `test/surface.tst.ts`

**Analog:** itself. Type-list export blocks (`:13-33`, `:95-107`), refusal idiom (`:198-205`):
```ts
// @ts-expect-error no exported member
export { makeDiagnosticsFeed } from "../src/index.ts";
```
and precedent for "the two entries share one type" (`:208-210`):
```ts
test("the React entry's AskedQuestionLike is the model's", () => {
  expect<ReactAskedQuestionLike>().type.toBe<AskedQuestionLike>();
});
```
Change: delete the three feed refusals (they become TS2578), add refusals for `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics`, `type DiagnosticsStore`, `idleTimeline`, `idleDiagnostics`, `isUnsampled`, and `type DiagnosticsDockOptions` from both entries; root types add the 13 names in Q5; React list `DiagnosticsDockOptions` to `DiagnosticsOptions`; add `expect<ReactDiagnosticsOptions>().type.toBe<DiagnosticsOptions>()` and an exact-shape pin (`layer`, `collector`, `intervalMillis`) in the style of the `GateRegistryLike` test (`:213-218`).

### Re-pointed feed tests

**Analog:** research Pattern 3, matching existing header shapes.
- `TimelineFeed.test.ts:23-24` currently imports `sourceFromRecords, type Source, type SourceRead` from `model/Source.ts` and `idleTimeline, makeTimelineFeed, type TimelineFeed` from `model/TimelineFeed.ts`. Move `makeTimelineFeed`, `type TimelineFeed` (+ source names) to `"../../src/index.ts"`; keep `idleTimeline` on `model/`.
- `DiagnosticsFeed.test.ts:8-18` imports `DiagnosticsStatus, diagnosticsOff, diagnosticsStarting, idleDiagnostics, ...`. Public names to root; `diagnosticsOff`, `diagnosticsStarting`, `idleDiagnostics`, `isUnsampled`, `noDiagnostics` stay on `model/`.
- `GatesFeed.test.ts:12-14` imports `AskedQuestionLike, GateInstanceLike` from `model/Gates.ts` and `AskedRead, RegistryRead, makeGatesFeed` + types from `model/GatesFeed.ts`; all move to root.
Use `../../src/index.ts` (relative), never `@qadi/devtools` (`vitest.config.ts` aliases only core/testing). Keep case ids (TF, F, G/T). `surface.test.ts` already imports `../src/index.ts`.

### `DiagnosticsStore.test.ts` and `.tst.ts`

**Analog:** themselves.
- `test.ts:55-56`: `const start = <ROut, E>(store: DiagnosticsStore, options?: DiagnosticsOptions<ROut, E>) => Effect.forkChild(runDiagnostics(store, options), { startImmediately: true });` becomes non-generic; drop `Schedule` import (`:12`).
- `test.ts:157-168` "honours a schedule override" becomes "honours an interval override": `{ collector, intervalMillis: 500 }`, same `TestClock.adjust("1 second")` and `state.reads === 3`.
- `.tst.ts` pin idiom to extend (`:31-41`):
```ts
test("a layer's typed failure is not the run's failure", () => {
  expect(runDiagnostics(store, { layer })).type.toBe<Effect.Effect<void, never, never>>();
});
test("the poll takes no questions thunk: the gates feed reads it", () => {
  expect(runDiagnostics).type.not.toBeCallableWith(store, { questions: () => [] });
  expect<DiagnosticsDockOptions>().type.not.toHaveProperty("questions");
});
```
Change: import `DiagnosticsOptions` from `../../src/model/DiagnosticsStore.ts` (drop the `DiagnosticsFeed.ts` import `:16`); `.not.toHaveProperty("questions")` on `DiagnosticsOptions`. New pins in the same idiom: `runDiagnostics` not callable with `{ schedule }`; `DiagnosticsOptions<never, never>` under `// @ts-expect-error` (TS2315); a `Layer<Thing, never, Other>` (unmet `RIn`) refused.

### React tests and the frozen characterisation file

**Analog:** type-only rename. Frozen file lines (D-12), exactly these two edits:
- `QuestionsPanel.feed.characterisation.test.tsx:26`: `import type { DevtoolsDockProps, DiagnosticsDockOptions } from "../../src/react/index.ts";` to `DiagnosticsOptions`.
- `:66`: `const live: DiagnosticsDockOptions = {};` to `DiagnosticsOptions`.
Other rename sites: `useDiagnostics.test.tsx:14`, `DiagnosticsLifetime.test.tsx:18` (import via `../../src/react/index.ts` once the re-export at `useDiagnostics.ts:19` is gone), `DiagnosticsScreens.test.tsx:15`, `questionsProp.ts`.

### `scripts/check-package-install.mjs` consumer (D-18)

**Analog:** itself. Import line `:425` `import { emptyTimeline, ingest, verdictOf } from "@qadi/devtools";`. The fixture builds the record inline inside `ingest(...)` (`:487-499`) and asserts with `expect(label, actual, expected)`:
```ts
const [only] = timeline.entries;
expect("devtools timeline", timeline.entries.length, 1);
expect("devtools verdict", only === undefined ? "missing" : verdictOf(only), "Allow");
expect("devtools dock", typeof DevtoolsDock, "function");
```
Change: add `makeTimelineFeed, sourceFromRecords` to the root import, hoist the `new StoredRecord({...})` to `const stored`, then paste the probe from research Code Examples ("The install-check probe"), asserting `feed.status.getSnapshot()._tag === "Reading"` (deterministic: the feed only forks). `effect/Effect` must be reachable in the fixture; check its existing imports (`Effect.runPromise` form used elsewhere in the file) before assuming. Fixture compiles with `skipLibCheck: false` (`:584-594`).

### README headless `typescript` fence

**Analog:** research Q6 (type-checked this session) placed after the dock paragraph `README.md:125-147`. Rewrite root-list prose `:26-32` ("The root has the three stores (`makeTimelineStore` and `runSource`, ... `makeDiagnosticsStore` and `runDiagnostics`)") and delete `:141-142` ("`runDiagnostics` and `makeDiagnosticsStore` are the same loop without React, for a shell of your own."). Fence is compiled by `check-doc-examples.mjs`, so ` ```typescript `, namespace `effect/*` imports, `Match.tagsExhaustive`, no `@qadi/react` import (`DECISION_READ_BUDGET`). Prose bullets: Q6's list (`log.layer`, `restart`, `configure` replaces the whole set, `mergeReading`, `Stopped.reason` not for a trust boundary).

### `apps/website/.../packages/devtools.md`

**Analog:** itself. Replace `:177` "(a shell running `runDiagnostics`)" with "(a shell running `makeDiagnosticsFeed`)" and the Stores bullet `:223-226` ("`makeTimelineStore` and `runSource` hold the timeline; ... `makeDiagnosticsStore` and `runDiagnostics` hold what the dock samples") with the feeds. Optionally mirror the README fence as ` ```typescript ` (compiled by `check-website-doc-examples.mjs`).

### `upgrading.md`

**Analog 1 (0.12 fence, `:538-552`, D-13):** current
```typescript
import { DiagnosticsStatus, useDiagnostics } from "@qadi/devtools/react";
import type { DiagnosticsDockOptions } from "@qadi/devtools/react";

const sampling: DiagnosticsDockOptions = { intervalMillis: 1_000 };
```
Target: delete the type import line, `const sampling = { intervalMillis: 1_000 };` (compiles on 0.12 and 0.13). Leave `:177-178` and `:916` (history).

**Analog 2 (new section):** `## 0.13: the questions are a dock input, beside the gates` (`:912-924`) and the section tail `## 0.13: a stored record is its envelope in memory` (`:968-1020`, ends with "The decision is [ADR-QD-171](https://github.com/leaderiop/qadi/blob/main/spec/decisions/171-...md)."). Append `## 0.13: the feeds are devtools' headless interface` after it, same shape: opening paragraph, `Before:` ` ```ts ` fence (`makeDiagnosticsStore` + `Effect.forkChild(runDiagnostics(store, { layer, schedule: Schedule.spaced("1 second") }))`, `makeTimelineStore` + `runSource`), `After:` ` ```typescript ` fence (`makeDiagnosticsFeed({ layer, intervalMillis: 1_000 })`, `makeTimelineFeed({ source })` in a scope), rename bullets (`DiagnosticsDockOptions` to `DiagnosticsOptions`, not generic, `schedule` to `intervalMillis`, hand-fed store is `makeTimelineFeed()` + `timeline.accept`, `useTimelineStore` unchanged), final "The decision is [ADR-QD-173](https://github.com/leaderiop/qadi/blob/main/spec/decisions/173-...md)."

### `Counters.tsx`

**Analog:** itself. `:13` `import type { DiagnosticsDockOptions } from "@qadi/devtools/react";` and `:22` `const sampling: DiagnosticsDockOptions = { intervalMillis: 1_000 };` to `DiagnosticsOptions`.

### Changeset

**Analog:** `.changeset/devtools-questions-is-a-dock-input.md`, whole file:
```
---
"@qadi/devtools": minor
---

**Breaking.** `questions` is no longer a field of `DiagnosticsDockOptions` ...

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
```
New file `.changeset/devtools-headless-interface-is-the-feeds.md`, same front matter, one `**Breaking.**` paragraph (root exports the feeds; the four runners, `noDiagnostics`, `DiagnosticsStore` not importable; `DiagnosticsDockOptions` is `DiagnosticsOptions`, also on `/react`; not generic; `intervalMillis` for `schedule`), then the same closing sentence. Leave the Phase 56 changeset unedited. No `@qadi/react` changeset. Never consume it.

### ADR-QD-173 (new) and `index.yaml`

**Analog:** `spec/decisions/172-admission-produces-the-one-walk-environment.md`. Header block (`:1-14`):
```
# ADR-QD-172 — Admission produces the one walk environment

> **Document Control**
> | Document ID    | QADI-ADR-172                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-19                                     |
> | Status         | Accepted — amends ADR-QD-024, ADR-QD-100, ADR-QD-163 |
> | Change History | 1.0 (2026-11-19): Initial release (ARCH-106, CCR-QD-450) |
```
Sections: `## Context`, `## Decision` (numbered, each citing its D-xx), `## Mutation`/`## Consequences`, `## Related`. File name `173-the-devtools-headless-interface-is-its-feeds.md`; ID line `QADI-ADR-173`; Status `Accepted — amends ADR-QD-047, ADR-QD-099, ADR-QD-169; applies ADR-QD-137`; Change History cites `ARCH-107, CCR-QD-451`. `index.yaml` block after `:537-540` (copy shape):
```
  - id: "ADR-QD-172"
    file: "172-admission-produces-the-one-walk-environment.md"
    title: "Admission produces the one walk environment"
    status: "Accepted — amends ADR-QD-024, ADR-QD-100, ADR-QD-163"
```
Also update ADR-169's `index.yaml` status line (`:525-528`) to add the amendment, as the status text on the ADR file itself.

### ADR-047 1.6 / ADR-099 entry list / ADR-169 decision 1 amendments

**ADR-047 analog:** the dated blockquote pattern at `047-…md:495-511`, e.g.
```
> **Amended 2026-11-18 (CCR-QD-447): the questions are read by the gates feed, not the diagnostics poll.**
> ... This narrows the two amendments and reverses nothing else ([ADR-QD-169](./169-the-questions-panels-two-host-inputs-are-one-feed.md)).
```
New block "**Amended 2026-11-19 (CCR-QD-451): the headless interface is the feeds.**" narrowing the 1.6 root list (`:207-208`) and the 1.13/1.15 "package-private" words; do not rewrite history. Revision 1.18 to 1.19, add a Change History entry and extend the Status line (`:9`) with "2026-11-19 (the headless interface is the feeds)". Use `node scripts/spec-revise.mjs <doc> "<what>"`.

**ADR-099 analog:** its own `## Amendment (2026-10-08, CCR-QD-321): a barrel may name its exports` (`:76-87`) and the header `Revision 1.1`, `Status ... amended 2026-10-08 (a barrel may name its exports)`, Change History `1.1 (2026-10-08): amendment — ...<br>1.0 ...`. Add `## Amendment (2026-11-19, CCR-QD-451)` one paragraph (three wholly-private modules are now part-public via named exports; the "Entry points" table and `exports` map unchanged), Rev 1.1 to 1.2.

**ADR-169 analog:** decision 1 text `:22` ("`GatesFeed.ts` is one package-private module ... out of both barrels"). Add a dated amendment block (Rev 1.0 to 1.1): `makeGatesFeed` and its snapshot types are exported from the root only; all other decisions unchanged. Edit its `Status` line and Change History in the header table.

### BEH-QD-636..640

**Analog:** `spec/behaviors/28-devtools-screens.md` BEH-QD-620 (`:2405-2427`), appended after it:
```
## BEH-QD-620: The devtools feed hands the questions beside the gates

> **Decision:** [ADR-QD-169](../decisions/169-...md) ·
> **Scope:** [ADR-QD-053](../decisions/053-a-gate-can-be-found.md) ·
> **Invariant:** [INV-QD-357](../invariants.md#inv-qd-357-...)

```
REQUIREMENT: `useDevtoolsFeed().questions` MUST be `atoms.asked`, ...
```

This is **Breaking** for `@qadi/react`: ...

Pinned by `packages/react/test/DevtoolsFeed.test.tsx`, ... 
Specified in ADR-QD-169 (CCR-QD-447, D-02, D-05).
```
Each BEH: `## BEH-QD-63N: <sentence>` heading (the scan counts exactly one heading per id), Decision/Invariant blockquote, `REQUIREMENT:` fence(s) with MUST, "**Breaking**" note where relevant (BEH-639), `Pinned by` real `packages/` paths (checked by `verify-traceability.sh:258`), `Specified in ADR-QD-173 (CCR-QD-451, D-xx)`. BEH-637 holds the rewritten compiled `sampleOnce` fence (research Code Examples) and the "`Stopped.reason` must not cross a trust boundary" requirement. Dated amendment notes for BEH-QD-323 (`:640-666` listing: replace `runDiagnostics`/`makeDiagnosticsStore` lines `:648-653` and the `sampleOnce` fence `:752-767`), BEH-465 (`:938`), BEH-506 (note `:1270-1272` "`DiagnosticsReadout` and the feed that builds it are package-private"), BEH-510 (`:1490`); `09-react.md:697` BEH-327 rename. The existing house form for a dated amendment is the blockquote under the Decision line at `:640-643`:
```
> **Amended 2026-11-18 (CCR-QD-447).** The poll no longer samples the questions: ...
```

### INV-QD-365..366

**Analog:** INV-QD-363/364 (`spec/invariants.md:4225-4252`), appended after INV-QD-364. Shape per record: `## INV-QD-N: <statement title>`, one paragraph with BEH links, then `**Source**:`, `**Implication**:`, `**Enforcement**:`, `**Related**:` paragraphs (links `behaviors/28-devtools-screens.md#beh-qd-...`, `decisions/173-...md`). Anchors are the lowercased heading with punctuation dropped; copy that exactly.

### `spec/overview.md`

**Analog:** itself, rows (`:866-920`) in the form `| \`names\` | kind | \`model/File.ts\` — description |`. Edits per research Q8: replace row `| \`makeTimelineStore\`, \`runSource\` | function | \`model/TimelineStore.ts\` |` (`:868`) with `makeTimelineFeed` + `TimelineFeed`, `TimelineFeedInputs`, `TimelineStatusReadout` rows; drop `:912` `makeDiagnosticsStore`, `runDiagnostics` row; `:869` `Diagnostics`, `DiagnosticsOptions`, `DiagnosticsStore` row loses `DiagnosticsStore` and states the new shape; `:913` `noDiagnostics` leaves the constants row; `:919` `DiagnosticsDockOptions` row becomes `DiagnosticsSnapshot`, `DiagnosticsStatus` (root and React) + feed rows; new rows for `makeGatesFeed`, `GatesFeed`, `GatesFeedInputs`, `GatesSnapshot`, `RegistryRead`, `AskedRead` (`model/GatesFeed.ts`); fix the stale `AskedQuestionLike` row text (`:908`, "so `DiagnosticsStore` can sample a thunk returning it"). Prose `:842-848` ("three stores a shell runs ... with `runDiagnostics`"). Every export must be a backticked token in the table (gate 13, `check-api-surface.mjs`) and every backticked Export-column name must still exist (STALE).

### `spec/traceability.md`, `spec/README.md` CCR-QD-451

**Analog (traceability):** ADR row `:361` `| [ADR-QD-172](decisions/172-...md) | <title>; amends ... | [BEH-QD-631](behaviors/05-evaluator.md#beh-qd-631-...), ... |`; test rows `:521-525`, `:592-593` (`| \`packages/devtools/test/surface.tst.ts\` | ADR-QD-047, ADR-QD-099, ADR-QD-169 (\`makeGatesFeed\` is package-private), BEH-QD-585 ... |` — replace the parenthetical, add BEH-636..640, ADR-QD-173). Prior ADRs amended get "; amended 2026-11-19 by ADR-QD-173 (CCR-QD-451)" like `:255`. Header change history (`:13`): `1.221 (2026-11-19): BEH-QD-631..635, INV-QD-363..364 and ADR-QD-172 traced; ... (ARCH-106, CCR-QD-450)`.

**Analog (CCR):** `spec/README.md:387` row `| CCR-QD-450 | 2026-11-19 | <one cell naming every changed file with new Revs> | ARCH-106. **Admission produces the one walk environment.** ... Unused: none. |`. Scan asserts the row starts `| CCR-QD-N |`, names the ARCH id and ends with `Unused: none.`. The CCR-QD-451 cell must name the two-line characterisation exception (D-12), the changeset, the upgrade note, `check-package-install.mjs`, source and tests.

### `60-mutation.mjs` (and `60-mutation-base.json`)

**Analog:** `.planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation.mjs` (208 lines; copy whole, newest mechanics: `keyOf` without line numbers, `minus` multiset, `DELETED`, `MOVED` plus receiver `LN`, static credit). Replace only the constants block (`59-mutation.mjs:12-34`):
```js
const D = ".planning/phases/QD-59-admission-produces-the-one-walk-environment/";
const CF = "stryker.config.mjs";
const RP = "reports/mutation/mutation.json";
const DIRS = ["packages/core/src", "packages/core/test"];
...
const FILES = [AD, PR, WK];
const LN = AD;
const MOVED = [PR, WK];
const DELETED = { [AD]: [...], ... };
```
Devtools values (from `56-mutation.mjs:9-11,47` and research Q7):
```js
const D = ".planning/phases/QD-60-devtools-headless-interface-is-the-feeds/";
const CF = "stryker.devtools.mjs";
const RP = "reports/mutation-devtools/mutation.json";
const DIRS = ["packages/devtools/src", "packages/devtools/test"];
const M = "packages/devtools/src/model/";
const FILES = [M+"DiagnosticsFeed.ts", M+"DiagnosticsStore.ts", M+"DockModel.ts", M+"GatesFeed.ts", M+"TimelineFeed.ts"]; // sorted
const MOVED = [];  // no mutant moves between files; DiagnosticsFeed must instead lose its survivor (D-16)
const LN = M+"DiagnosticsStore.ts";  // only used for the "gained" line; with MOVED empty, left = 0
const DELETED = {
  [M+"DiagnosticsFeed.ts"]: ["const runOptions =", "export interface DiagnosticsDockOptions", "import * as Schedule"],
  [M+"DiagnosticsStore.ts"]: ["readonly schedule?: Schedule.Schedule<unknown>;", "<ROut = never, E = never>"],
};
```
Edits to sweep: every `"59-mutation..."` literal (`:7-10`, `:104`, `:128`, `:188-208`) to `60-`. Two cautions from the code. First, with `MOVED = []`, `compare` fails any file whose score falls (`:178-179`), which is exactly D-10; it also fails a new survivor, and a "moved" survivor passes only if its body is unchanged and its line text is gone (so the D-16 survivor must be deleted, not moved). Second, 56's `reportOf` used `files.join(",")` but 59's sorts, so keep FILES sorted anyway. Note `code(f)` in the `DELETED` check strips comments, so fragments must be code text. Invocation (research Q7): `pnpm exec stryker run stryker.devtools.mjs --mutate '<5 files>' < /dev/null` then `node <dir>/60-mutation.mjs base`. First commit of the phase = `60-mutation.mjs` + `60-mutation-base.json` only, measured on the untouched tree.

### `60-scan.mjs`

**Analog:** `.planning/phases/QD-59-.../59-scan.mjs` (321 lines). Keep the skeleton and rename `59`/`QD-59` to `60`. Sections to keep and the lines to copy:
- Header/base (`:6-12`): `phase_base:` read from `60-01-SUMMARY.md`; `g`, `lines`, `bad`, `TRAILER` (`:15`).
- Section 1 scope (`:34-58`): `ALLOWED` set. For 60: the five model files plus `DockModel.ts` if renamed there, `react/{index,DevtoolsDock,useDockModel,useDiagnostics}`, `src/index.ts`, the test files listed above, `scripts/check-package-install.mjs`, `packages/devtools/README.md`, the website `devtools.md` and `upgrading.md`, `Counters.tsx`, the new changeset, ADR-173 + `index.yaml` + ADR-047/099/169, `28-devtools-screens.md`, `09-react.md`, `invariants.md`, `overview.md`, `traceability.md`, `README.md`, `devtools-spec/02-screens.md`. Files that must change by exact lines only (D-12): reuse the `REVIEW_COMMENT_ONLY` loop (`:52-56`) idea, but pin the characterisation to the two-line rename: diff `-U0` must be exactly `-`/`+` pairs on lines 26 and 66 with only `DiagnosticsDockOptions` to `DiagnosticsOptions`.
- Section 2 banned constructs (`:61-92`, `RULES` + `net`): copy as is, `CODE` glob to devtools plus scripts if wanted.
- Section 3 budgets (`:94-103`): `switch (`, `Effect.fnUntraced`, plus `new PolicyTooDeep(` is core-only so drop; keep first two.
- Section 4 frozen (`:105-117`): `package.json`, lockfile, `.oxlintrc.json`, `tsconfig*.json`, `stryker*.mjs`, `AGENTS.md`, `packages/devtools/package.json` (closed `exports` unchanged), `TimelineStore.ts` (untouched per research), `packages/react/src/**`, and `scripts/**` except `check-package-install.mjs`. Not frozen: barrels, overview, changesets (they change here).
- Section 5 order (`:119-211`): RED before GREEN. First plan commit after docs(60-01) is `chore(60-02)` touching only `60-mutation.mjs` + `60-mutation-base.json`; re-baseline guard (`:134-146`); first `packages/devtools/src` commit is the GREEN commit; RED test commits (`test(60-0x): ... RED`) precede it (`:156-168`); mutation-after is the last evidence commit and follows the last code commit (comment-only exception via `commentOnly`, `:169`, `:213-224`). Drop the bench block.
- Section 6 numbers (`:226-248`): reservation file check, `BEHS = ["BEH-QD-636"..."BEH-QD-640"]`, `INVS = ["INV-QD-365","INV-QD-366"]`, `RESERVED = new Set(["ARCH-107","ADR-QD-173","CCR-QD-451", ...])`, one heading each (`^## BEH-QD-636: `, `^# ADR-QD-173 — `), the CCR row checks (`| CCR-QD-451 |`, `ARCH-107.`, `Unused: none.`). The 59 scan hard-codes the reservation JSON; read the current `qadi-reserved-ids.json` (`git rev-parse --git-common-dir`) before pinning it, do not assume 59's values.
- Section 7 promises (`:250-299`): same `PROMISE = { [file]: { has: [...], not: [regex] } }` shape over `code()`/`flatOf()`. For 60: `DiagnosticsStore.ts` has `export interface DiagnosticsOptions {` and `options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`, not `/schedule\?:/`, `/<ROut/`; `DiagnosticsFeed.ts` not `/runOptions/`, `/DiagnosticsDockOptions/`, `/before !== undefined\) off\(\)/`; barrels: `src/index.ts` has `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed`, not `/makeTimelineStore|runSource|makeDiagnosticsStore|runDiagnostics|noDiagnostics/`; one declaration: `git grep -c "export interface DiagnosticsOptions" packages` equals 1 (the `new Admitted(` once-check at `:290-293` is the shape). Plus: `no "export *"` in the two barrels, feed tests import from `../../src/index.ts`, the README fence mentions `makeDiagnosticsFeed` and not `same loop without React`.
- Finish (`:315-321`): print findings, exit 1, else `phase scan clean`.

## Shared Patterns

### Named-barrel discipline
**Source:** `packages/devtools/src/index.ts`; rule `devtools-named-barrel` (`scripts/check-house-style.mjs:1860-1868`). **Apply to:** both barrels. `export { values } from`, `export type { types } from`, per module, bytewise ascending specifiers, names alphabetical within a group (uppercase before lowercase in existing groups, e.g. `DEFAULT_...`, `WiringRead`, `makeDiagnosticsStore`).

### Spec edits (gates 11, 12, 13 by script)
**Apply to:** every spec doc. Write "gate 13 (`check-api-surface.mjs`)", never a bare number (`check-dod-table.mjs`). Bump each touched doc's Revision and Change History with `node scripts/spec-revise.mjs <doc> "<what>"`; `--check` verifies Revision equals the newest history entry. Revs to expect (research Q8): overview 1.126 to 1.127, traceability 1.221 to 1.222, spec README 1.253 to 1.254, 28-devtools-screens 1.32 to 1.33, 09-react 3.9 to 3.10, invariants 1.158 to 1.159, ADR-047 1.18 to 1.19, ADR-099 1.1 to 1.2, ADR-169 1.0 to 1.1. Ids come from the reservation only (`scripts/next-id.mjs` is not run).

### Compiled doc fences
**Source:** AGENTS.md section 12. ` ```typescript ` fences are compiled by `check-doc-examples.mjs` (spec + package READMEs) and `check-website-doc-examples.mjs`; ` ```ts ` is signature-only. **Apply to:** README, `devtools.md`, `upgrading.md`, BEH-323 and BEH-637. Namespace `effect/*` imports, `Effect.fn`, `Match.tagsExhaustive`, no `switch`/`async`/`console`/`as`.

### Tests
**Source:** `@effect/vitest` `it.effect` under `TestClock` (`DiagnosticsFeed.test.ts:1-8` header), tstyche for types (`DiagnosticsStore.tst.ts`). **Apply to:** all re-pointed and new tests; no `as`, no hand-built failing ports.

## No Analog Found

None. The only first-of-kind pieces are the README headless fence and the BEH-637 `sampleOnce` replacement, and research Q6/Code Examples already hold type-checked text for both.

## Metadata

**Analog search scope:** `packages/devtools/{src,test}`, `scripts/`, `spec/{decisions,behaviors,invariants.md,overview.md,traceability.md,README.md}`, `.changeset/`, `apps/website/.../docs`, `examples/nextjs-newsroom`, `.planning/phases/QD-56-*`, `QD-59-*`.
**Files scanned:** about 30 read, plus `git ls-files` tracked check on the script and changeset analogs.
**Pattern extraction date:** 2026-11-19
