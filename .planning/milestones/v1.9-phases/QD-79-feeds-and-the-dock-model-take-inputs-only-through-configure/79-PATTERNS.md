# Phase 79: Feeds and the dock model take inputs only through `configure` - Pattern Map

**Mapped:** 2026-11-24
**Files analyzed:** 22 (new and modified groups)
**Analogs found:** 21 / 22 (the base-hash check has a close analog, not an exact one)

All analog paths below are git-tracked (checked under `packages/`, `scripts/`, `spec/`, `.changeset/`, `.planning/`). Line numbers are those at the phase base.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx` (new) | test (characterisation) | event-driven (render sequence) | `test/react/QuestionsPanel.characterisation.test.tsx`, `ServicesPanel.characterisation.test.tsx` | role |
| `.planning/phases/QD-79-*/79-characterisation-check.mjs` (new) | script (first-commit guard) | batch | `.planning/milestones/v1.8-phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs` | close |
| `packages/devtools/test/builtFeeds.ts` (new) | test fixture helper | request-response | `packages/devtools/test/dockModelFixtures.ts` | role |
| `.planning/phases/QD-79-*/79-mutation.mjs` + `79-mutation-base.json` / `-close.json` (new) | script (scorer) | batch | `.planning/phases/QD-78-timelinestore-owns-its-capacity/78-mutation.mjs` | exact |
| `packages/devtools/src/model/ExternalStore.ts` (mod: export `sameFields`, add `sameFieldsOrAbsent`) | utility | transform | itself, `:125-146` | exact |
| `model/TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts` (mod: bare ctor, normaliser, `sameFields` gate) | service (feed) | event-driven | `DockModel.ts` configure + `DiagnosticsFeed.ts:187-206` | exact |
| `model/DockModel.ts` (mod: bare ctor, one mapping fn, `DockModelInputs` as the one type) | service (model) | event-driven | itself, `:206-249`, `:308-335` | exact |
| new `model/` normaliser/mapping file(s) (if split out) | utility | transform | `model/ExternalStore.ts` `sameFields` (pure helper style) | role |
| `packages/devtools/src/react/useConfigured.ts` (new, package-private) | hook | event-driven | `react/useScoped.ts` | role |
| `react/useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts` (mod) | hook | event-driven | themselves | exact |
| `react/DevtoolsDock.tsx` (mod: `DevtoolsDockProps extends DockModelInputs`) | component | request-response | itself, `:80-152` | exact |
| `test/surface.tst.ts` (mod) | type test | transform | itself, `:294-309` | exact |
| `test/model/ExternalStore.tst.ts` or new `Inputs.tst.ts` (new pins) | type test | transform | `test/model/ExternalStore.tst.ts:49-76` | exact |
| ~201 construction sites in `packages/devtools/test/**` (mod) | test | request-response | `builtFeeds.ts` once written | n/a |
| `scripts/check-package-install.mjs` (mod, `:507-509`, `:653`, `:680-681`, `:711-712`) | script (template string) | request-response | itself | exact |
| `spec/decisions/192-*.md` (new) + `index.yaml` row | spec (ADR) | n/a | `spec/decisions/191-a-timeline-store-owns-its-capacity.md` | exact |
| dated amendment blocks in ADR-QD-137, 173, 185 | spec | n/a | `spec/decisions/137-*.md:153-160` | exact |
| CCR-QD-471, BEH-QD-731..735, INV-QD-403..404, traceability row, `spec/overview.md` | spec | n/a | the Phase 78 rows for CCR-QD-470 | exact |
| `.changeset/devtools-<name>.md` (new) | config | n/a | `.changeset/devtools-timeline-store-owns-its-capacity.md` | exact |
| `apps/website/src/content/docs/docs/reference/upgrading.md` | docs | n/a | its existing 0.13 / Phase 78 section | exact |
| README, website devtools page, `spec/behaviors/27-*`, `28-*` fences | docs | n/a | themselves | exact |

## Pattern Assignments

### Characterisation test (`ConfigureFirstRender.characterisation.test.tsx`)

**Analog:** `packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx` (and `ServicesPanel.characterisation.test.tsx`). Read their imports and `it.layer`/`render` shape before writing. CONTEXT D-08 forbids importing `questionsPanelInput.ts`, `dockModelFixtures.ts` and `helpers.ts`, so the new file is self-contained. Copy only the structure of the existing files, not their imports.

**Held-to-first-commit mechanism (honest note for the planner):** Phases 74 and 75 did NOT record a content hash. They hardcode the first commit's SHA and compare structure against `git show`:

`74-characterisation-check.mjs:47-49,845-846`
```js
const BASE = "e25c8cfdc28cdc797cb1f662615e7c214e9bda2d";
const CHARACTERISATION = "packages/devtools/test/model/SimulationSession.characterisation.test.ts";
...
const first = (path) => execFileSync("git", ["show", `${BASE}:${path}`], { cwd: root, encoding: "utf8" });
```
Its run line (header, `:38-40`) is `node <phase dir>/74-characterisation-check.mjs` with `--self-test`. Phase 75's equivalent is `.planning/milestones/v1.8-phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-contract-check.mjs` (same `BASE` + `git show` idea).

CONTEXT says "recorded content hash". Two options, planner decides:
1. (Lazy, recommended) Because D-08 isolates the file from every helper, the 74 check's import/moved-helper machinery (about 800 lines) is unnecessary. Write `79-characterisation-check.mjs` as: `BASE` = the commit that adds the file, `git show BASE:<path>` compared byte-for-byte (or sha256 via `node:crypto` `createHash("sha256")`) to the working file, plus a `--self-test` that plants a changed row and expects failure. Keep 74's `execFileSync("git", ["rev-parse","--show-toplevel"])` root lookup and its CLI/self-test layout.
2. Copy 74's script whole and trim the fixtures sections.

Only the Activity pins from D-05 may live in a sibling file; if so it needs the same check.

### `test/builtFeeds.ts`

**Analog:** `packages/devtools/test/dockModelFixtures.ts:1-60`. Match its header-comment shape (one-line summary, then why), `import type` for model types, `.ts` extensions, and exported helpers with a doc comment each:
```ts
/** A one-port `Read` wiring whose only row is the AttributeResolver, named `name`. */
export const wiringNamed = (name: string): WiringRead => ...
```
Functions are `timelineFeedOf`, `diagnosticsFeedOf`, `gatesFeedOf`, `dockModelOf`. Each is an `Effect.fn`/`Effect.gen` that does `const feed = yield* makeXFeed(); feed.configure(inputs); return feed;`, returning `Effect<..., never, Scope.Scope>` like the constructors (`surface.tst.ts:302-309`). Keep it free of `helpers.ts` imports unless needed, because `helpers.ts` is edited by Phase 80.

### `79-mutation.mjs`

**Analog:** `.planning/phases/QD-78-timelinestore-owns-its-capacity/78-mutation.mjs` (exact). Copy it and change four things:
- `const D` path and the `phase: "78"` strings (`:15`, `:182`, `:198`) become 79.
- `GROUPS` (`:20-26`). Five groups (CONTEXT D-26), plus a `closeOnly: true` entry for any new `model/` file (the script already reads `closeOnly`, `:191,212`):
```js
const DEVTOOLS = { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json" };
const GROUPS = {
  timeline: { ...DEVTOOLS, files: ["packages/devtools/src/model/TimelineFeed.ts"] },
  diagnostics: { ...DEVTOOLS, files: ["packages/devtools/src/model/DiagnosticsFeed.ts"] },
  gates: { ...DEVTOOLS, files: ["packages/devtools/src/model/GatesFeed.ts"] },
  store: { ...DEVTOOLS, files: ["packages/devtools/src/model/ExternalStore.ts"] },
  dock: { ...DEVTOOLS, files: ["packages/devtools/src/model/DockModel.ts"] },
};
```
- Update the header comment ("over the four model files", "No group is close-only").
- Keep `record base|close <group> [--restart]`, `compare`, `--self-test` and the "record from a clean tree" refusal (`dirtyReasons`). Base record `79-mutation-base.json` is committed alone at the phase base; the close is re-recorded with `--restart` after code review. Record shape is in `78-mutation-base.json` (per group: `head`, `invocation`, per-file `killed/timeout/survived/noCoverage/ignored/open[]`).
- Run line: `pnpm exec stryker run stryker.devtools.mjs --mutate <file>`, then `node .planning/phases/QD-79-.../79-mutation.mjs record base <group>`.

### `model/ExternalStore.ts` (`sameFields` exported, `sameFieldsOrAbsent`)

**Analog:** itself, `:125-146` (export it; keep the doc comment and the "field on one key only counts as a change" rule, and keep `ExternalStore.test.ts:444,:491` unedited):
```ts
function sameFields<K extends object>(a: K, b: K): boolean {
  const fromA = Object.entries(a);
  const fromB = new Map<string, unknown>(Object.entries(b));
  return (
    fromA.length === fromB.size &&
    fromA.every(([field, value]) => fromB.has(field) && fromB.get(field) === value)
  );
}
```
Existing use: `:181` `if (sameFields(held, next)) return;`. Add `sameFieldsOrAbsent(a: K | undefined, b: K | undefined)` right beside it (absent equals only absent, else `sameFields`). Keep both out of `src/index.ts` (AGENTS.md §9).

### Feeds (`TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`)

**Analog for the rewritten restart rule:** current hand-written rules, to be replaced by `sameFields` over normalised inputs.

`DiagnosticsFeed.ts:187-206` (before):
```ts
const configure = (next: DiagnosticsOptions | undefined) => {
  if (runs.closed()) return;           // keep: command on a closed feed
  const before = options;
  options = next;
  if (next === undefined) { off(); return; }
  if (before === undefined || next.layer !== before.layer || next.collector !== before.collector
      || next.intervalMillis !== before.intervalMillis) { start(next); }
};
...
if (init !== undefined) start(init);   // goes: bare ctor starts off
```
After: normalise first (`(inputs) => Required<I>`, D-13), `if (sameFieldsOrAbsent(before, next)) return` for presence, `start(next)` otherwise. `off()` on `undefined` while already off publishes nothing (ADR-QD-173 decision 8).

`GatesFeed.ts` configure (`:261-268` per CONTEXT; excerpt at the file end, `:236-268`):
```ts
configure: (next) => {
  if (runs.closed()) return;
  const before = inputs;
  inputs = next;
  if (next.gates !== registryNow || watchFailure !== undefined) { registryNow = next.gates; watch(registryNow); }
  let asked = store.getSnapshot().asked;
  if (next.questions !== before.questions || next.intervalMillis !== before.intervalMillis) { asked = readAsked(); cadence(); }
  publish(readRegistry(), asked);
},
```
After (D-16): top guard `if (sameFields(before, next) && watchFailure === undefined) return` with a one-line comment that G43's retry is a stated exception; each moved field still drives its own branch.

`TimelineFeed.ts`: Phase 78 shape is `configure` = capacity check, then `try { resize } finally { readSource }`; normaliser maps `capacity` through `effectiveCapacity` (D-13/D-14) so omitted, `undefined` and `DEFAULT_TIMELINE_CAPACITY` compare equal. A refused capacity throws in the normaliser, before anything moves. Not re-read here; the planner should read the file before editing (it is untouched by this mapping pass).

### `model/DockModel.ts`

**Analog:** itself. Today's two mapping sites:

Build (`:206`, `:234`, `:245-249`):
```ts
const timelineFeed = yield* makeTimelineFeed({ capacity: inputs.capacity, source: inputs.source });
const diagnosticsFeed = yield* makeDiagnosticsFeed(inputs.diagnostics);
const gatesFeed = yield* makeGatesFeed({ gates: inputs.gates, questions: inputs.questions,
  intervalMillis: inputs.diagnostics?.intervalMillis });
```
Configure (`:308-335`), whose order and Phase 78 error rule must be kept (ADR-QD-177, ADR-QD-191, M55/M56):
```ts
configure: (next) => {
  const capacity = effectiveCapacity(next.capacity);   // refused capacity throws before anything moves
  const before = inputs;
  inputs = next;                                       // before the timeline publishes
  try { timelineFeed.configure({ capacity, source: next.source }); }
  finally {
    if (next.catalogue !== before.catalogue) { spread(); roles.setList(next.catalogue?.roles ?? NO_ROLES); }
    simulation.setPorts(next.ports);
    gatesFeed.configure({ gates: next.gates, questions: next.questions, intervalMillis: next.diagnostics?.intervalMillis });
    diagnosticsFeed.configure(next.diagnostics);
    shownReading.refresh();
  }
},
```
After (D-20): one function beside `DockModelInputs` (`:84-103`) returns `{ timeline, gates, diagnostics }` feed inputs (this is where `intervalMillis` crosses from diagnostics to gates). `configure` calls it once, in the dispatch order above. `makeDockModel` becomes arg-less and builds each feed bare; `let inputs` starts as the normalised empty record. Note `makeDockModel` uses `Effect.fn("qadi.devtools.makeDockModel")(function* ...)` (AGENTS.md §5); keep that.

### `react/useConfigured.ts` (package-private, thin)

**Analog:** `react/useScoped.ts` (full file read). Copy its header comment shape ("Internal scaffolding, kept out of the barrel (AGENTS.md §9)", `"use client";`), its namespace imports, and layout-effect style:
```ts
import * as Effect from "effect/Effect";
import * as Scope from "effect/Scope";
import { useLayoutEffect } from "react";
import { useScoped } from "./useScoped.ts";
```
Sketch from CONTEXT D-04/D-06 (names are the planner's): build effect passes `make.pipe(Effect.tap((built) => Effect.sync(() => configure(built, inputs))))` into `useScoped`; a second `useLayoutEffect(() => { if (value !== undefined) configure(value, inputs) }, [value, inputs])` re-applies after any commit where `inputs` changed identity. No ref, no `sameFields` in the hook.

`useScoped.ts:48-50` comment to correct (D-05): "`make` is read once per mount: later inputs arrive as commands..." becomes "the build runs once per mount; a remount or `Activity` reveal re-runs it with the latest committed closure".

Existing call sites to rewrite (all currently "build, then configure in a second `useLayoutEffect`"):

`useDockModel.ts:39-64` (also delete `UseDockModelInput` `:28-37`):
```ts
const model = useScoped(() => makeDockModel({ source, capacity, ... }));
useLayoutEffect(() => {
  if (model !== undefined) model.configure({ source, capacity, ... });
}, [model, source, capacity, catalogue, ports, diagnostics, reading, gates, questions]);
```
`useTimeline.ts:56-65`:
```ts
const feed = useScoped(() => makeTimelineFeed({ source, capacity }));
useLayoutEffect(() => { if (feed !== undefined) feed.configure({ source, capacity }); }, [feed, source, capacity]);
```
`useDiagnostics.ts:36-43`:
```ts
const feed = useScoped(() => makeDiagnosticsFeed(options));
useLayoutEffect(() => { if (feed !== undefined) feed.configure(options); }, [feed, options]);
return useStoreSnapshot(feed ?? idleDiagnostics(options));
```
Caution: `useTimeline` passes `{ source, capacity }` as a fresh object per render. The change effect's dependency must be the inputs record's identity as the hook builds it (useMemo over its fields, or depend on the fields), else "after every commit" becomes harmless but wasteful; D-06 says `configure` with no moved field changes nothing, so either is correct. `useTimelineStore` (`:94-105`) and `useSimulationSession` are out of scope (D-11).

### `DevtoolsDock.tsx`

**Analog:** itself, `:80-152`. `export interface DevtoolsDockProps extends DockModelInputs { readonly unknownParents?: ...; readonly onInvalidate?: ... }`; move each prop's doc comment onto `DockModelInputs` (`DockModel.ts:84-103` already carries several). `DockModelInputs` stays package-private; fallback in D-19 is a barrel `export type` plus a `spec/overview.md` row (gate 13).

### Type pins

**Analog (golden `toBe`):** `test/surface.tst.ts:294-309`.
```ts
test("DiagnosticsOptions is a layer, a collector and an interval, and nothing else", () => {
  expect<DiagnosticsOptions>().type.toBe<{
    readonly layer?: Layer.Layer<never, unknown>;
    readonly collector?: PortCallCollector;
    readonly intervalMillis?: number;
  }>();
});
test("each feed is built in a scope and fails with nothing", () => {
  expect(makeTimelineFeed()).type.toBe<Effect.Effect<TimelineFeed, never, Scope.Scope>>();
  expect(makeDiagnosticsFeed({ intervalMillis: 1_000 })).type.toBe<...>();   // goes
});
```
Replace the constructor-input line with `expect<Parameters<typeof makeTimelineFeed>>().type.toBe<[]>()` (and the other two), and add `expect<Required<TimelineFeedInputs>>().type.toBe<{ ... }>()` per normalised type. `Parameters<F>` is the form AGENTS.md §6 names for `Effect`-returning subjects.

**Analog (`@ts-expect-error` with positive twin):** `test/model/ExternalStore.tst.ts:1-76`. Header documents the double check (TS2578 under `pnpm typecheck`; text after the directive is a fragment of the suppressed message under tstyche), and each refused call is held in a `const` that `expect` reads:
```ts
test("a key type with an optional field is refused", () => {
  const built = makeDerivedStore({
    parents: [parent],
    // @ts-expect-error is optional in type
    key: (): WithOptional => ({ a: parent.getSnapshot(), b: undefined, c: true }),
    compute: (key: WithOptional): number => key.a.length,
  });
  expect(built).type.toBe<Expected>();
});
```
New negative: a complete-record literal missing one field of `Required<…>`, with the positive twin (all fields) in the same file. No `not.toBeCallableWith` pin (D-17), so `NOT_CALLABLE_PIN_BUDGET` and its §6 table do not move.

### Gate 14 packed consumer

**Analog:** `scripts/check-package-install.mjs:507-509,653,680-681,711-712`. The fixture is a template string (backticks escaped as `\``) compiled only by `pnpm spec:package`. Today's calls and the pattern to rewrite to "bare, then `configure`":
```js
const feed = yield* makeTimelineFeed({ source: sourceFromRecords([stored]) });   // :653
const bare = yield* makeGatesFeed();
const feed = yield* makeGatesFeed({ gates: gateRegistry });                      // :680-681
const off = yield* makeDiagnosticsFeed();
const feed = yield* makeDiagnosticsFeed({});                                     // :711-712
```
After: `const feed = yield* makeTimelineFeed(); feed.configure({ source: ... });`, and so on. Also keep the assertion expectations (`"Reading"`, `"Unwatched"`, subscription count 1, release on close 0). This is also where D-19's emitted-`.d.ts` fallback is proven (consumer passing every prop to `DevtoolsDock`).

### Records

**ADR-QD-192:** copy `spec/decisions/191-a-timeline-store-owns-its-capacity.md` (Document Control table: `Document ID | QADI-ADR-191`, `Revision | 1.0`, `Effective Date`, `Status | Accepted — amends ADR-QD-137`). Status for 192: `Accepted — amends ADR-QD-137, ADR-QD-173 and ADR-QD-185`. Add the `index.yaml` row in the same shape (`:593-596`):
```yaml
  - id: "ADR-QD-191"
    file: "191-a-timeline-store-owns-its-capacity.md"
    title: "A timeline store owns its capacity"
    status: "Accepted — amends ADR-QD-137"
```
and append `; amended 2026-11-24 (ADR-QD-192)` to the amended ADRs' index `status`, as `index.yaml:428` did for 137.

**Amendment block shape** (`spec/decisions/137-*.md:153-160`), place under the ADR's body, one per amended ADR (137, 173, 185):
```md
> **Amended 2026-11-24 (CCR-QD-470): the timeline's store is the feed's one store.**
> Point 7 and the 2026-11-12 amendment stand: ... ([ADR-QD-191](./191-a-timeline-store-owns-its-capacity.md)). ...
> Context and Alternatives considered keep their history.
```
Use CCR-QD-471 and ADR-QD-192 links. Use `scripts/spec-revise.mjs` for each revision line (D-25). Never run `scripts/next-id.mjs` (D-02).

**CCR / BEH / INV / traceability:** Phase 78 rows are in `spec/overview.md`, `spec/traceability.md`, `spec/invariants.md`, `spec/behaviors/27-devtools-timeline.md` and `28-devtools-screens.md`; grep `CCR-QD-470` / `ADR-QD-191` to find each row to copy (they appear in all of those files). New rows: CCR-QD-471, BEH-QD-731..735, INV-QD-403..404.

**Changeset:** copy `.changeset/devtools-timeline-store-owns-its-capacity.md`:
```md
---
"@qadi/devtools": minor
---

**Breaking.** <one-sentence claim>. N changes:

- `TimelineStore` gains the required ... (one bullet per observable change, concrete signatures)
```
Bullets for 79: the three public feed constructors lose their argument; a first `configure(i)` equals old `make…(i)`; omitted and `undefined` fields are one field; a reader subscribed before the first `configure` hears its publishes (D-10); `UseDockModelInput` removed; `DevtoolsDockProps` extends `DockModelInputs`.

**Upgrade guide:** `apps/website/src/content/docs/docs/reference/upgrading.md`, add a section under 0.13 (the "After" fence near `:1044-1056` is compiled, and must change in the same plan, D-24). The gate scripts checking fences are `scripts/check-doc-examples.mjs` and `scripts/check-website-doc-examples.mjs`.

## Shared Patterns

### Doc-comment shape
**Source:** `useScoped.ts:1-14` and `ExternalStore.ts:125-132`. One-line summary first, the why in following paragraphs, ADR ids as citations. Apply to every new export (normalisers, mapping function, `sameFieldsOrAbsent`, `useConfigured`).

### Imports and Effect style (AGENTS.md §1, §5)
`import * as Effect from "effect/Effect"` namespace imports; relative imports end in `.ts`; `import type` for type-only. New model functions that are effectful use `Effect.fn(...)`; normalisers are plain pure functions (no `as`, no `any`, no `switch` on `_tag`).

### Whole-or-nothing configure
**Source:** `DockModel.ts:308-335` (excerpt above). Refuse before assigning `inputs`; `try { timeline } finally { rest }`; a listener throw is applied-then-rethrown. Applies to the dock and to every feed's refusal in the normaliser (D-14).

### Closed-feed guard
**Source:** `DiagnosticsFeed.ts:189` and `GatesFeed.ts:253` `if (runs.closed()) return;`. Keep as the first line of every `configure`.

### Test fixtures isolation
New characterisation file: no imports from `questionsPanelInput.ts`, `dockModelFixtures.ts`, `helpers.ts` (D-08). New `builtFeeds.ts` is for the migrated ~201 sites; pinned tests (TF4, TF14, TF26, TF27, TF29, G43, M55, M56, Phase 78 resize rules) change construction lines only, verified by a diff check at close (D-23).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| (none outright) | | | The "recorded content hash" is the one gap: Phases 74/75 used a first-commit SHA plus `git show` structural comparison, not a stored hash. Use the 74 check's `BASE` mechanism, or add a plain sha256 line to the script. |

## Metadata

**Analog search scope:** `packages/devtools/{src,test}`, `scripts/`, `spec/decisions`, `.changeset`, `.planning/phases/QD-78*`, `.planning/milestones/v1.8-phases/QD-74*,QD-75*`
**Files read:** about 14 (several only by targeted excerpt)
**Not read in full:** `TimelineFeed.ts` (read it before editing), `78-mutation.mjs` past `:70` (its structure was taken from grep), `upgrading.md`, ADR-QD-173/185 bodies, the two existing `*.characterisation.test.tsx` files (the planner should open one for its render/`it.layer` shape).
**Pattern extraction date:** 2026-11-24
