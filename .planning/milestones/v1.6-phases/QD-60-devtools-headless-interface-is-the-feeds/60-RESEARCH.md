# Phase 60: Devtools' headless interface is the feeds - Research

**Researched:** 2026-11-19
**Domain:** `@qadi/devtools`' public interface (its two named barrels), the diagnostics poll's option shape, and the records and gates that pin both
**Confidence:** HIGH. Every in-repo fact below was read at HEAD `1f28d352` this session; the source tree (`packages`, `spec`, `apps`, `examples`, `scripts`) is clean there. No package is installed. On that base the six affected devtools suites ran green (`TimelineFeed`, `DiagnosticsFeed`, `GatesFeed`, `DiagnosticsStore`, `TimelineStore`, `surface`: 6 files, 129 tests), and so did `surface.tst.ts` and `DiagnosticsStore.tst.ts` under tstyche (9 tests). The README example proposed below was type-checked this session against the current feed modules under `tsconfig.base.json`, and so was the replacement for spec 28's compiled `sampleOnce` fence (both `exit 0`, scratch files outside the repo).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Owner choices (2026-11-19, the HDLS-01 checkpoint)

- **D-01: pursue.** The feeds are devtools' headless interface. HDLS-02..04 go ahead; there is no rejection ADR.
- **D-02: all three feeds are public.** `makeTimelineFeed`, `makeDiagnosticsFeed` and `makeGatesFeed` are exported from the package root, with the handle and input types a caller needs to name. A headless shell can then reach everything the React dock shows.
- **D-03: one option shape, the feed's, named `DiagnosticsOptions`.**
  - The shape is `{ layer?: Layer<never, unknown>, collector?, intervalMillis? }`.
  - `DiagnosticsDockOptions` and the `Schedule`-based `DiagnosticsOptions<ROut, E>` are both removed, and `runOptions`' translation goes with them.
  - `schedule` is dropped because the feed restarts its poll when the interval changes, and that needs a value it can compare.
  - **Breaking:** `<ROut, E>`, `schedule` and the `DiagnosticsDockOptions` name all go away, and each is a compile error rather than a silent change. `@qadi/devtools/react` re-exports the new name.

#### Settled from the roadmap and the house rules

- **D-04:** `makeTimelineStore`, `runSource`, `makeDiagnosticsStore` and `runDiagnostics` leave the barrel. Their modules stay, package-private, because the feeds are built on them.
  - A type the feeds' handles still name stays exported. For example, `TimelineFeed.timeline` is a `TimelineStore`.
  - A type or value only the pairs needed (for example `noDiagnostics`, or the `DiagnosticsStore` type) is retired. Research lists each one with its reason.
- **D-05:** The feed tests run against the public entry: they import from the package root, not from `model/`. `surface.test.ts` and `surface.tst.ts` pin the new root surface and the retired names.
- **D-06:** The README's headless example uses the feeds, stop detection included. Its false "same loop without React" claim is removed.
- **D-07:** The `@qadi/devtools` barrel stays a named barrel (ARCH-40, the `devtools-named-barrel` rule).
- **D-08, RED first:**
  1. the mutation base for the touched devtools files;
  2. the public-entry tests;
  3. the export change and the option shape;
  4. the README, docs and records.
- **D-09:** Check the packed `exports` map with `check-package-install.mjs`.
- **D-10:** A touched file's mutation score must not fall, under the D-15/D-16 rule with the static-ignored credit (ADR-QD-167 Rev 1.1).
- **D-11:** Every "gate N" in spec text names its script (`check-dod-table.mjs`).

### Claude's Discretion
- Whether the feed modules keep their file names.
- Each feed's doc comment, written for a public reader.
- How the tests move: renamed in place or re-pointed.

### Deferred Ideas (OUT OF SCOPE)
None.

**Scope (from CONTEXT `<domain>`):** in: the two devtools barrels, the three feed modules, `DiagnosticsStore.ts`, `TimelineStore.ts` and their tests; the README's headless section, the website's `devtools.md` and `upgrading.md`, the newsroom's `Counters.tsx`; the records listed below. Out: the React dock's behaviour (must not change); `@qadi/react`'s `useDevtoolsFeed` beyond a type rename (none reaches it, see Risk R1); any new entry point (the closed `exports` map is unchanged); releasing or versioning.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HDLS-01 | Owner decides at a checkpoint whether to pursue | Settled: D-01 pursue (CONTEXT). No rejection ADR. |
| HDLS-02 | The three feeds are exported from the root; the four pair functions are retired | Q1 (the exact retire/keep/new list, both barrels, ordering under `devtools-named-barrel`) |
| HDLS-03 | One option shape configures the poll; the README's headless example uses the feeds | Q2 (the collapse, mechanically), Q6 (a type-checked example with stop detection) |
| HDLS-04 | Feed tests run against the public entry; surface tests, overview, ADR-047 1.6, ADR-099 updated; Breaking recorded | Q5 (test re-pointing), Q3 (inventory), Q4 (gates), Q8 (records) |
| WX-01 | `pnpm check:pr` green at the end | Q4 (every gate that will bite, by script) |
| WX-02 | Records use only the reserved ids; `next-id.mjs` never run | Q8 (ids confirmed unused; BEH/INV proposals) |
| WX-03 | `spec/overview.md` names every added export, drops every removed one | Q4 (`check-api-surface.mjs` MISSING and STALE), the overview rows in Q8 |
| WX-04 | Nothing new from the forbidden list | Pitfall 7; nothing in the change needs `as`, `switch`, `async` or a new budget |
| WX-05 | Stryker score of touched files does not fall | Q7 (files, invocation, harness, the one survivor that makes `DiagnosticsFeed.ts` fall) |
| WX-06 | Behaviour change preceded by a test on the base | Q5: there is no behaviour change; the RED tests are interface tests (import, surface, type pins) |
| WX-07 | Breaking in the changeset and `upgrading.md`; nothing released | Q3 (changeset disposition), Q8 (upgrade note) |
</phase_requirements>

## Summary

The change is an interface change with no behaviour change. The three feeds are already the dock's engine, already scope-owned, already tested under `TestClock`, and already stated their stops. What a headless shell lacks is the names. The root exports the two raw pairs instead, and the README calls `runDiagnostics` "the same loop without React" (`packages/devtools/README.md:141-142`), which it is not: it has no status, so a dying sample ends a fiber nobody watches.

The work is five mechanical moves, and none of them is large:

1. **Swap the root's runners for the feeds.** Five root values leave and seven arrive (root values 47 → 49). One type leaves and nine type-only names arrive. `DiagnosticsOptions` keeps its name with a new shape.
2. **Collapse the two option shapes into one.** The single declaration lives in `DiagnosticsStore.ts`, beside the engine that reads it, so no import cycle forms. `runDiagnostics` loses its generics and reads `intervalMillis` itself. `runOptions` disappears outright rather than shrinking.
3. **Re-point the three feed test files' public names at `../../src/index.ts`.** The idle placeholders stay imported from `model/`, because they stay private.
4. **Rewrite the docs.** Two compiled fences now name removed APIs: spec 28's `sampleOnce` (`28-devtools-screens.md:752-767`) and the 0.12 upgrade "After" fence (`upgrading.md:538-552`). Both gates (`check-doc-examples.mjs` and `check-website-doc-examples.mjs`) will fail on them.
5. **Write the records.**

Two things need attention beyond that. First, removing `runOptions` deletes killed mutants from `DiagnosticsFeed.ts`, while its one known survivor (an equivalent mutant, `if (before !== undefined) off();`) stays. That lowers the file's score, and D-10 forbids the drop. The plan must remove that survivor, not re-baseline. Second, a Phase 56 characterisation file that says "Never edited after it is written" imports `DiagnosticsDockOptions` (`QuestionsPanel.feed.characterisation.test.tsx:26,66`). Removing the name forces a type-only edit there, so the owner should approve it.

**Primary recommendation:** export the three feeds and the types their handles name from the root. Move `DiagnosticsOptions` (feed shape) into `DiagnosticsStore.ts` and delete `DiagnosticsDockOptions`. Make `runDiagnostics(store, options?: DiagnosticsOptions)` non-generic, building `Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)` itself, and pass the feed's options straight through. Keep every feed file and test file name, so the spec's "Pinned by" citations and `traceability.md` rows stay valid.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Read a source into a bounded timeline, state a stopped read | Headless model (`TimelineFeed.ts`, engine `TimelineStore.ts`) | none | Already the dock's engine (`DockModel.ts:174`); becomes the root's timeline interface |
| Poll the diagnostics, state a stopped poll | Headless model (`DiagnosticsFeed.ts`, engine `DiagnosticsStore.ts`) | none | The closed status is the fix the pairs lack (ADR-QD-047, 2026-11-12 amendment) |
| Watch a gate registry and a questions thunk, state a throw | Headless model (`GatesFeed.ts`) | none | ADR-QD-169's one failure policy; now reachable without the dock |
| The diagnostics option shape | Headless model (`DiagnosticsStore.ts`), re-exported by both barrels | React entry (re-export only) | One declaration, read by engine, feed, hook, dock prop and model input |
| Lifetime of every read | The caller's `Scope` | none | ADR-QD-137: closing the scope ends the read; an interruption is never a stop |
| Hooks and dock | React entry (`useDiagnostics`, `useTimeline`, `DevtoolsDock`) | none | Unchanged behaviour; only a type name moves |
| Packed interface | Manifest `exports` (`.`, `./react`) | `check-package-install.mjs` consumer | No new entry point (ADR-QD-099); the names ride the root |

## Standard Stack

Nothing new. All in-repo, reused as is.

| Piece | Where | Role here |
|-------|-------|-----------|
| `Effect.fn(...)` feed builders returning `Effect.fn.Return<…, never, Scope.Scope>` | `TimelineFeed.ts:98-100`, `DiagnosticsFeed.ts:159-161`, `GatesFeed.ts:102-104` | Become public as is |
| `makeSupersedingRun` | `SupersedingRun.ts:76` | Stays private; feeds' handles do not name `RunToken` or `SupersedingRun` |
| `makeExternalStore` | `ExternalStore.ts` | Stays private; no public handle names `ExternalStore` (only `DockModel.questions`, itself private) |
| `Data.taggedEnum` statuses | `TimelineStatus`, `DiagnosticsStatus`, `RegistryRead`, `AskedRead` | Become root values + types |
| vitest 5.1.0, `@effect/vitest`, tstyche 7.2.5, Stryker 10.1.1 | `node_modules/*/package.json` [VERIFIED: read] | Tests and mutation |

## Package Legitimacy Audit

No external package is installed or added by this phase. **Packages removed due to [SLOP]:** none. **Flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
 host / headless shell                      @qadi/devtools (root)                       caller's Scope
 ─────────────────────                      ─────────────────────                       ──────────────
 Source (DecisionLog, SSE, records) ──▶ makeTimelineFeed({ source, capacity }) ──fork──▶ runSource (private)
                                            │ timeline: TimelineStore  ◀── accept ───────────┘
                                            │ status: TimelineStatusReadout  (Reading | Stopped{reason})
                                            └ configure(inputs)  (whole input set; omitted = undefined)

 DiagnosticsOptions                    ──▶ makeDiagnosticsFeed(options?) ──fork──▶ runDiagnostics (private)
   { layer?: Layer<never, unknown>,         │ getSnapshot(): { status, reading }     builds layer once/run,
     collector?, intervalMillis? }          │   status: Off | Starting | Live | Stopped{reason, sampled}
                                            │ restart(), configure(options | undefined)   samples on
                                            └ (restarts only when a field's identity moves)   Schedule.spaced(interval)

 GateRegistryLike, questions thunk     ──▶ makeGatesFeed({ gates, questions, intervalMillis })
                                            │ getSnapshot(): { registry: RegistryRead, asked: AskedRead }
                                            └ configure(inputs)  (host throws are Failed{reason}, never a stop)

 closing the Scope ──▶ interrupts every read (never reported as Stopped) ──▶ SSE connection closes
 (the React dock builds the same three in DockModel's scope; useDiagnostics/useTimeline in useScoped's)
```

### Recommended file layout (unchanged files, new exports)

```
packages/devtools/src/
├── index.ts                    # + feeds, their handles/inputs, the four tagged enums; − the pairs
├── react/index.ts              # DiagnosticsDockOptions → DiagnosticsOptions (from ../model/DiagnosticsStore.ts)
└── model/
    ├── TimelineFeed.ts         # public (doc comment); code unchanged
    ├── DiagnosticsFeed.ts      # DiagnosticsDockOptions and runOptions deleted; imports DiagnosticsOptions
    ├── GatesFeed.ts            # public (doc comment); code unchanged
    ├── DiagnosticsStore.ts     # DiagnosticsOptions is the feed's shape; runDiagnostics non-generic
    └── TimelineStore.ts        # untouched (still the timeline feed's engine, package-private)
```

### Pattern 1: the root barrel after the change (module-path order, ASCII names)

`devtools-named-barrel` compares the module specifiers bytewise with `>` (`scripts/check-house-style.mjs:1860-1868`, `if (specifiers[i - 1] > specifiers[i])`) [VERIFIED: read]. `"./model/DiagnosticsFeed.ts" < "./model/DiagnosticsStore.ts"`, `"./model/Gates.ts" < "./model/GatesFeed.ts"` (`.` is 46, `F` is 70), and `"./model/Timeline.ts" < "./model/TimelineFeed.ts" < "./model/TimelineStore.ts"`. So the new groups slot in like this:

```ts
// after ./model/Catalogue.ts
export { DiagnosticsStatus, makeDiagnosticsFeed } from "./model/DiagnosticsFeed.ts";
export type { DiagnosticsFeed, DiagnosticsReadout, DiagnosticsSnapshot } from "./model/DiagnosticsFeed.ts";
export {
  DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS,
  WiringRead,
  mergeReading,
} from "./model/DiagnosticsStore.ts";
export type { Diagnostics, DiagnosticsOptions, DiagnosticsReading } from "./model/DiagnosticsStore.ts";
// … ./model/Filters.ts, ./model/Gates.ts …
export { AskedRead, RegistryRead, makeGatesFeed } from "./model/GatesFeed.ts";
export type { GatesFeed, GatesFeedInputs, GatesSnapshot } from "./model/GatesFeed.ts";
// … ./model/HeldChoice.ts … ./model/Timeline.ts …
export { TimelineStatus, makeTimelineFeed } from "./model/TimelineFeed.ts";
export type { TimelineFeed, TimelineFeedInputs, TimelineStatusReadout } from "./model/TimelineFeed.ts";
export type { TimelineStore } from "./model/TimelineStore.ts";
```

React barrel:

```ts
export { DiagnosticsStatus } from "../model/DiagnosticsFeed.ts";
export type { DiagnosticsSnapshot } from "../model/DiagnosticsFeed.ts";
export type { DiagnosticsOptions } from "../model/DiagnosticsStore.ts";
export type { AskedQuestionLike } from "../model/Gates.ts";
export { TimelineStatus } from "../model/TimelineFeed.ts";
// ./DevtoolsDock.tsx … unchanged
```

### Pattern 2: the option collapse (Q2)

`DiagnosticsStore.ts` keeps the one declaration, and its doc comment is `DiagnosticsDockOptions`' (`DiagnosticsFeed.ts:69-96`). It also keeps `wiringReader`, which loses its generics:

```ts
export interface DiagnosticsOptions {
  readonly layer?: Layer.Layer<never, unknown>;
  readonly collector?: PortCallCollector;
  /** How often to sample, in milliseconds. Defaults to `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`. */
  readonly intervalMillis?: number;
}

export const runDiagnostics = Effect.fn("qadi.devtools.runDiagnostics")(function* (
  store: DiagnosticsStore,
  options?: DiagnosticsOptions,
) {
  // … unchanged sampling …
  yield* Effect.repeat(sample, Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS));
});

const wiringReader = Effect.fn("qadi.devtools.wiringReader")(function* (
  layer: Layer.Layer<never, unknown> | undefined,
) { /* unchanged body */ });
```

`DiagnosticsFeed.ts` then imports `type DiagnosticsOptions` from `./DiagnosticsStore.ts` and deletes three things: `DiagnosticsDockOptions` (`:77-96`), `runOptions` (`:178-182`) and `import * as Schedule` (`:26`). The fork becomes `runs.fork(token, runDiagnostics(marking, next), …)`. `runOptions` does not shrink to building `Schedule.spaced` inside the feed: the engine builds it, because the engine is what repeats.

**Why the declaration goes in `DiagnosticsStore.ts`, not `DiagnosticsFeed.ts`:** the feed already imports the store module (`DiagnosticsFeed.ts:28-35`). Declaring the type in the feed and importing it back into the store is a type-only cycle. `pnpm circular` is `madge --circular --extensions ts,tsx packages/*/src` (`package.json` scripts) [VERIFIED: read], and whether that madge counts type-only imports is [ASSUMED]. Declaring it in the store module avoids the question.

**Why `Layer<never, unknown>` still accepts every closed layer:** `Layer<in ROut, out E = never, out RIn = never>` (`node_modules/effect/src/Layer.ts:56`) [VERIFIED: read]. A `Layer<Thing, MyError>` is assignable, and a layer that still needs a service (`RIn ≠ never`) is refused. Both were type-checked this session against `DiagnosticsDockOptions`, which is the shape being adopted.

### Pattern 3: re-pointing a feed test (Q5)

```ts
// packages/devtools/test/model/DiagnosticsFeed.test.ts
import {
  DiagnosticsStatus,
  makeDiagnosticsFeed,
  type DiagnosticsOptions,
  type DiagnosticsReadout,
} from "../../src/index.ts";
import { diagnosticsOff, diagnosticsStarting, idleDiagnostics, isUnsampled } from "../../src/model/DiagnosticsFeed.ts";
import { noDiagnostics } from "../../src/model/DiagnosticsStore.ts";
```

Relative `../../src/index.ts`, not the package name. Two reasons [VERIFIED: read]:

- `packages/devtools/vitest.config.ts` aliases only `@qadi/core` and `@qadi/testing`, so a self-import of `@qadi/devtools` resolves to `lib/` (the manifest's `import` condition), and that path needs a build.
- `surface.test.ts:16-17` already imports `../src/index.ts` and `../src/react/index.ts`.

### Anti-Patterns to Avoid
- **An alias kept for `DiagnosticsDockOptions`, or a second `DiagnosticsOptions`.** D-03 makes each removed name a compile error. Two declarations would also break `export type { DiagnosticsOptions }` at the barrel.
- **Renaming the feed modules or the feed test files.** `28-devtools-screens.md` cites them by path, for example `:1311` and `:1414` ("Pinned by `packages/devtools/test/model/TimelineFeed.test.ts` (TF1 to TF8)"). `traceability.md:523-525` rows do too, and `verify-traceability.sh` checks backticked `packages/` paths exist (`spec/scripts/verify-traceability.sh:258`). Keep the names (the discretion item, resolved).
- **Exporting the idle placeholders.** `idleTimeline`, `idleTimelineStatus`, `idleDiagnostics`, `diagnosticsOff`, `diagnosticsStarting` exist for a React hook's first pass before `useScoped` has built the feed (`TimelineFeed.ts:75-95`, `DiagnosticsFeed.ts:98-156`). A headless shell has the feed the moment `yield*` returns. Keep them, and `isUnsampled`, private.
- **Reading a feed once right after building it.** Every feed only forks (`DiagnosticsFeed.ts:15-17` "It only forks"), so a snapshot taken immediately may predate the first sample. Subscribe instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Headless poll with stop detection | a `runDiagnostics` fork plus an `onExit` watcher in the README | `makeDiagnosticsFeed` | The token, supersession and interrupt-vs-defect split are INV-QD-313's; the README would restate them wrongly |
| Hand-fed timeline in a headless shell | `makeTimelineStore` (retired) | `makeTimelineFeed()` with no source, then `feed.timeline.accept(record)` | With no source the feed reads `NO_SOURCE` (`TimelineFeed.ts:67-68`) and stays `Reading`; `accept` forwards to the inner store (`:113`) |
| Comparing an options object to decide a restart | anything in the README | `configure` already compares the three fields by identity (`DiagnosticsFeed.ts:223-230`) | It's the reason `schedule` had to go (D-03) |
| A feed probe in the install check | a bespoke script | one more import and a scoped build in `check-package-install.mjs`'s existing consumer fixture | It already type-checks the packed `.d.ts` with `skipLibCheck: false` |

## Q1. The exact retire / keep / new list (D-04)

### Root (`packages/devtools/src/index.ts`) today, the lines the pairs and options touch [VERIFIED: `packages/devtools/src/index.ts:24-37,123-126`]

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
…
export { makeTimelineStore, runSource } from "./model/TimelineStore.ts";
export type { TimelineStore } from "./model/TimelineStore.ts";
```

| Name | Kind | Verdict | Reason (file:line) |
|------|------|---------|--------------------|
| `makeTimelineStore` | value | **RETIRE** | Only the pair needed it. Stays in `TimelineStore.ts`, used by `TimelineFeed.ts:70-71` and `react/useTimeline.ts:91` (`useTimelineStore`). A hand-fed headless timeline is a sourceless feed. |
| `runSource` | value | **RETIRE** | The timeline feed's engine (`TimelineFeed.ts:132`); no handle names it. |
| `makeDiagnosticsStore` | value | **RETIRE** | The poll feed's engine (`DiagnosticsFeed.ts:163,208`). |
| `runDiagnostics` | value | **RETIRE** | The poll feed's engine (`DiagnosticsFeed.ts:201`). The README's "same loop" claim is about it. |
| `noDiagnostics` | value | **RETIRE** | Named by D-04. It reaches a caller only as `diagnosticsOff.reading` (`DiagnosticsFeed.ts:99-102`), and `status: Off` already says "nothing sampled". `useDiagnostics.ts:24`'s doc comment names it: reword. |
| `DiagnosticsStore` | type | **RETIRE** | No public handle names it. `DiagnosticsFeed` exposes `subscribe`/`getSnapshot` over `DiagnosticsSnapshot`, not the store. |
| `DiagnosticsOptions` | type | **REPLACED** (same name, new shape) | Becomes `{ layer?: Layer<never, unknown>; collector?; intervalMillis? }`. Was `DiagnosticsOptions<ROut = never, E = never> { layer?: Layer<ROut, E>; collector?; schedule?: Schedule.Schedule<unknown> }` (`DiagnosticsStore.ts:188-199`). |
| `TimelineStore` | type | **KEEP** | `TimelineFeed.timeline: TimelineStore` (`TimelineFeed.ts:60`), `UseTimeline.store` (`useTimeline.ts:30`). |
| `Diagnostics` | type | **KEEP** | `DiagnosticsSnapshot.reading: Diagnostics` (`DiagnosticsFeed.ts:66`). |
| `DiagnosticsReading` | type | **KEEP** | `DevtoolsDockProps.reading` (`DevtoolsDock.tsx:118`) and `mergeReading`'s parameter. |
| `WiringRead` | value + type | **KEEP** | `Diagnostics.wiring` (`DiagnosticsStore.ts:71`). |
| `mergeReading` | value | **KEEP** | Not a pair. It's the `reading` prop's rule (BEH-QD-323), and a headless shell lays a supplied reading over `feed.getSnapshot().reading` with it, as `DockModel.ts:206` does. |
| `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS` | value | **KEEP** | The documented default of `DiagnosticsOptions.intervalMillis` and `GatesFeedInputs.intervalMillis` (`GatesFeed.ts:62`). |
| `DEFAULT_TIMELINE_CAPACITY` | value | **KEEP** (untouched) | `TimelineFeedInputs.capacity`'s default (`TimelineFeed.ts:70-71`). |
| `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` | value | **NEW** | D-02. |
| `TimelineStatus`, `DiagnosticsStatus` | value + type | **NEW at root** (already on the React entry, `react/index.ts:19,22`) | `TimelineStatusReadout.getSnapshot` and `DiagnosticsSnapshot.status` name them, and a shell matches on them. |
| `RegistryRead`, `AskedRead` | value + type | **NEW** | `GatesSnapshot`'s two halves (`GatesFeed.ts:53-56`). The constructors give `$is` narrowing. |
| `TimelineFeed`, `TimelineFeedInputs`, `TimelineStatusReadout` | type | **NEW** | The handle, its input, and the type of `TimelineFeed.status` (`TimelineFeed.ts:23-27,52-65`). |
| `DiagnosticsFeed`, `DiagnosticsReadout`, `DiagnosticsSnapshot` | type | **NEW at root** (`DiagnosticsSnapshot` already on React) | `DiagnosticsFeed extends DiagnosticsReadout` (`DiagnosticsFeed.ts:126-139`). The readout must be nameable (see Risk R4). |
| `GatesFeed`, `GatesFeedInputs`, `GatesSnapshot` | type | **NEW** | `GatesFeed.ts:53-71`. |

**Counts, root:**
- Retired: 6 (5 values: `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics`; 1 type: `DiagnosticsStore`). One type is replaced in place: `DiagnosticsOptions`.
- New: 16 names.
  - 3 functions.
  - 4 value-and-type tagged enums (`TimelineStatus`, `DiagnosticsStatus`, `RegistryRead`, `AskedRead`).
  - 9 type-only names (`TimelineFeed`, `TimelineFeedInputs`, `TimelineStatusReadout`, `DiagnosticsFeed`, `DiagnosticsReadout`, `DiagnosticsSnapshot`, `GatesFeed`, `GatesFeedInputs`, `GatesSnapshot`).
- Kept, among those the pairs and options touch: 7 (`TimelineStore`, `Diagnostics`, `DiagnosticsReading`, `WiringRead`, `mergeReading`, `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`, `DEFAULT_TIMELINE_CAPACITY`).
- `surface.test.ts`'s `ROOT_VALUES` goes from 47 to 49 [VERIFIED: computed from `test/surface.test.ts:19-67`].

### React entry (`src/react/index.ts`) [VERIFIED: `packages/devtools/src/react/index.ts:19-22`]

```ts
export { DiagnosticsStatus } from "../model/DiagnosticsFeed.ts";
export type { DiagnosticsDockOptions, DiagnosticsSnapshot } from "../model/DiagnosticsFeed.ts";
export type { AskedQuestionLike } from "../model/Gates.ts";
export { TimelineStatus } from "../model/TimelineFeed.ts";
```

| Name | Verdict |
|------|---------|
| `DiagnosticsDockOptions` | **RETIRE** (renamed): React exports `type DiagnosticsOptions` from `../model/DiagnosticsStore.ts` (D-03) |
| `DiagnosticsStatus`, `TimelineStatus`, `DiagnosticsSnapshot`, `AskedQuestionLike` | **KEEP**: `useDiagnostics` returns `DiagnosticsSnapshot` and `UseTimeline.status` is a `TimelineStatus`, so a React user needs no second import. This is the same dual-entry precedent as `AskedQuestionLike` (`surface.tst.ts:213-215` pins that the two are one type). |

`REACT_VALUES` is unchanged (8).

**No name clash** [VERIFIED: `git grep` of `export (const|type|interface|class) <name>` over `packages`]. Every new name is declared only in `packages/devtools/src/model/`. `@qadi/react`'s `DevtoolsFeed`/`DevtoolsDiagnosticsFeed` are different names. After the move there is exactly one `DiagnosticsOptions` declaration.

**Internal re-export to delete:** `react/useDiagnostics.ts:19` `export type { DiagnosticsDockOptions } from "../model/DiagnosticsFeed.ts";`. Two tests import the type through it (`useDiagnostics.test.tsx:14`, `DiagnosticsLifetime.test.tsx:18`). Point them at `../../src/react/index.ts`.

## Q2. The option-shape collapse, mechanically (D-03)

| Site | Today | After |
|------|-------|-------|
| `DiagnosticsStore.ts:188-199` | `DiagnosticsOptions<ROut = never, E = never>` with `layer?: Layer.Layer<ROut, E>`, `collector?`, `schedule?: Schedule.Schedule<unknown>` | Non-generic feed shape, `intervalMillis?: number` |
| `DiagnosticsStore.ts:210-213` | `Effect.fn(...)(function* <ROut = never, E = never>(store, options?: DiagnosticsOptions<ROut, E>)` | `function* (store: DiagnosticsStore, options?: DiagnosticsOptions)` |
| `DiagnosticsStore.ts:226-229` | `options?.schedule ?? Schedule.spaced(DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)` | `Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)` |
| `DiagnosticsStore.ts:240-242` | `wiringReader … function* <ROut, E>(layer: Layer.Layer<ROut, E> \| undefined)` | `(layer: Layer.Layer<never, unknown> \| undefined)` |
| `DiagnosticsStore.ts:1-36` (module comment) | "available to any shell that is not React"; "`runDiagnostics` writes that pull once" | The feed's engine, package-private; the public interface is `makeDiagnosticsFeed` |
| `DiagnosticsFeed.ts:77-96` | `export interface DiagnosticsDockOptions` | deleted (its doc comment moves to `DiagnosticsOptions`) |
| `DiagnosticsFeed.ts:178-182` | `const runOptions = (next) => ({ …spreads…, schedule: Schedule.spaced(next.intervalMillis ?? DEFAULT…) })` | deleted; `:201` passes `next` |
| `DiagnosticsFeed.ts:26,29` | `import * as Schedule`; `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS` import | both unused after; delete (`noUnusedLocals`) |
| `DiagnosticsFeed.ts:138,155,160,184,213` | `DiagnosticsDockOptions` | `DiagnosticsOptions` |
| `DiagnosticsFeed.ts:19` | "Package-private (ADR-QD-099)." | public doc comment (discretion) |
| `DockModel.ts:48,79` | `type DiagnosticsDockOptions` | `type DiagnosticsOptions` from `./DiagnosticsStore.ts` (merge into the `:52` import) |
| `react/DevtoolsDock.tsx:21,105` | `DiagnosticsDockOptions` | `DiagnosticsOptions` |
| `react/useDockModel.ts:21,34` | `DiagnosticsDockOptions` | `DiagnosticsOptions` |
| `react/useDiagnostics.ts:13,19,39` | `DiagnosticsDockOptions` + re-export | `DiagnosticsOptions`; re-export deleted |

**Tests that pass `schedule` or a typed layer today** [VERIFIED: grep and read]:

| File | Uses | What it should do |
|------|------|-------------------|
| `test/model/DiagnosticsStore.test.ts:12,55-56` | imports `Schedule`; `start = <ROut, E>(store, options?: DiagnosticsOptions<ROut, E>)` | `start = (store: DiagnosticsStore, options?: DiagnosticsOptions)`; drop the `Schedule` import |
| `test/model/DiagnosticsStore.test.ts:157-168` "honours a schedule override" | `schedule: Schedule.spaced("500 millis")`, then `TestClock.adjust("1 second")` → `state.reads === 3` | `intervalMillis: 500`, same clock steps and assertion; rename "honours an interval override". Determinism is unchanged: `Schedule.spaced` reads the `Clock`, and `DiagnosticsFeed.test.ts` already drives `intervalMillis` under `TestClock` (8 uses) |
| `test/model/DiagnosticsStore.tst.ts:16,31,35,39-40` | `runDiagnostics(store, { layer })` with `Layer<Thing, MyError>` → `Effect<void, never, never>`; `DiagnosticsDockOptions` has no `questions` | Same pins hold with the non-generic signature (`Layer` is contravariant in `ROut`, covariant in `E`). Rename the type. Add: `runDiagnostics` is not callable with `{ schedule }`; `DiagnosticsOptions<never, never>` is TS2315 (not generic) under `// @ts-expect-error`; a layer with an unmet `RIn` is refused |

Every other test that names `DiagnosticsDockOptions` is a type-only rename (Q3 table).

## Q3. Inventory of every reference outside `src`

Found with `git grep -nwE 'DiagnosticsOptions|DiagnosticsDockOptions|runDiagnostics|makeDiagnosticsStore|runSource|makeTimelineStore|makeTimelineFeed|makeDiagnosticsFeed|makeGatesFeed' -- ':!.planning'` (44 files, counted per file this session).

### Tests (current; must change)

| File | Hits | Action |
|------|------|--------|
| `test/surface.test.ts` | 4 (`:47,49,57,58`) | Root list per Q1; header comment's "three stores … with their runners" |
| `test/surface.tst.ts` | 5 (`:33,104,199,202,205`) | Root type list + React list per Q5; delete the three `@ts-expect-error` feed refusals (they'd now be unused-directive errors); add the retired names as refusals |
| `test/model/DiagnosticsFeed.test.ts` | 33 | Re-point public names to root (Pattern 3) |
| `test/model/TimelineFeed.test.ts` | 25 | `makeTimelineFeed`, `type TimelineFeed` from root; `idleTimeline` from model |
| `test/model/GatesFeed.test.ts` | 39 | `AskedRead`, `RegistryRead`, `makeGatesFeed`, `type GatesFeed`, `type GatesSnapshot` from root; `AskedQuestionLike`, `GateInstanceLike` may also come from root |
| `test/model/DiagnosticsStore.test.ts` | 20 | Q2 table (a private module's own test; stays on `model/`) |
| `test/model/DiagnosticsStore.tst.ts` | 6 | Q2 table |
| `test/model/TimelineStore.test.ts` | 27 | **No change**: it tests the private engine from `../../src/model/TimelineStore.ts` |
| `test/model/Source.test.ts` | 3 (`:39,196-197`) | **No change** (imports `model/TimelineStore.ts`) |
| `test/react/useStoreSnapshot.test.tsx` | 3 | **No change** (imports `model/TimelineStore.ts`) |
| `test/react/DiagnosticsLifetime.test.tsx` | 9 | type rename; import from `../../src/react/index.ts` |
| `test/react/DiagnosticsScreens.test.tsx` | 12 (`:15` imports from `model/DiagnosticsFeed.ts`) | type rename; import from react entry or `model/DiagnosticsStore.ts` |
| `test/react/useDiagnostics.test.tsx` | 5 | type rename; import from react entry |
| `test/react/questionsProp.ts` | 2 | type rename (it's the seam Phase 56 built so the characterisation stays unedited) |
| `test/react/QuestionsPanel.feed.characterisation.test.tsx` | 2 (`:26`, `:66`) | **type rename forced in a file whose header says "Never edited after it is written"** (`:13`). See Open Question 1 |

### Docs and examples

| Reference | Current text or history? | Action |
|-----------|--------------------------|--------|
| `packages/devtools/README.md:26-27` (root list) and `:141-142` ("`runDiagnostics` and `makeDiagnosticsStore` are the same loop without React") | Current | Rewrite; add the headless section (Q6). The README **is** compiled for ` ```typescript ` fences: `check-doc-examples.mjs` walks "every package's own README" (`scripts/check-doc-examples.mjs:3-4,66-67`) [VERIFIED: read] |
| `apps/website/src/content/docs/docs/packages/devtools.md:177` ("a shell running `runDiagnostics`") and `:223-226` (Stores bullet) | Current | Rewrite to the feeds. Optionally mirror the README example as ` ```typescript ` (compiled by `check-website-doc-examples.mjs`) |
| `apps/website/…/reference/upgrading.md:177-178` (0.12 interface section) | History (0.12) | Leave (AGENTS.md §15 exempts change history) |
| `upgrading.md:538-552` (0.12 "After" fence, ` ```typescript `, `import type { DiagnosticsDockOptions } from "@qadi/devtools/react"; const sampling: DiagnosticsDockOptions = …`) | History, **but compiled** | Must change or `check-website-doc-examples.mjs` fails. Recommended: drop the import and the annotation (`const sampling = { intervalMillis: 1_000 };`), which compiles on 0.12 and 0.13 alike. See Open Question 2 |
| `upgrading.md:916` (unreleased 0.13 questions section; names `DiagnosticsDockOptions`, `DiagnosticsOptions`, `runDiagnostics` in prose) | Unreleased history relative to 0.12 | Leave. It's true relative to 0.12, and the new 0.13 section that follows states the rename |
| `upgrading.md` new section | New | `## 0.13: the feeds are devtools' headless interface`, appended after the last 0.13 section (file is 1020 lines) |
| `examples/nextjs-newsroom/src/client/Counters.tsx:13,22` | Current code (`pnpm example` type-checks it) | `import type { DiagnosticsOptions } from "@qadi/devtools/react"; const sampling: DiagnosticsOptions = { intervalMillis: 1_000 };` |
| `.changeset/devtools-questions-is-a-dock-input.md` (unreleased, Phase 56) | Change record relative to released 0.12 | **Leave unedited.** It's accurate against 0.12, and both entries land in the same 0.13 CHANGELOG. A **new** changeset carries this break: `.changeset/devtools-headless-interface-is-the-feeds.md`, `"@qadi/devtools": minor`, one `**Breaking.**` paragraph, ending with "See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`." (shape of the existing one) |
| `packages/devtools/CHANGELOG.md:36,46,51` | Released history | Leave (generated) |
| `spec/overview.md:844-845,869,908,912,913,918-919` | Current (gated) | Q8 rows |
| `spec/behaviors/28-devtools-screens.md:645-666` (BEH-QD-323 ` ```ts ` listing) | Current | Replace the `runDiagnostics`/`makeDiagnosticsStore` lines with `makeDiagnosticsFeed`'s signature; dated amendment note |
| `28-devtools-screens.md:752-767` (BEH-QD-323 ` ```typescript ` `sampleOnce`, imports `makeDiagnosticsStore, runDiagnostics` from `@qadi/devtools`) | Current, **compiled** | Must be rewritten or `check-doc-examples.mjs` fails. The replacement under Code Examples was type-checked this session |
| `28-devtools-screens.md:938` (BEH-QD-465 `DockModelInputs` listing), `:1275-1277` (BEH-QD-506 note: "`DiagnosticsReadout` and the feed that builds it are package-private"), `:1490` (BEH-QD-510 listing) | Current | Rename; amend the 1275 note in a dated note (now public) |
| `spec/behaviors/09-react.md:697` ("Its `DiagnosticsDockOptions.layer` is a `Layer<never, unknown>`") | Current (BEH-QD-327) | Rename to `DiagnosticsOptions.layer`; Rev bump |
| `spec/decisions/047-…md:151-152` (1.4 amendment prose), `:207-208` (the 1.6 amendment's root list), `:404` (1.13 "package-private") | History inside an ADR | Not rewritten; a new dated amendment (Rev 1.19) supersedes the 1.6 list and the "package-private" words (the house pattern, e.g. `:505-511`) |
| `spec/decisions/053-…md:232`, `137-…md:27`, `162-…md:63` | ADR history | Leave |
| `spec/decisions/169-…md:22,34-35,60` (decision 1: "`GatesFeed.ts` is one package-private module … out of both barrels") | ADR decision now contradicted | ADR-QD-173 amends ADR-QD-169's decision 1. Add a dated amendment block to ADR-169 (Rev 1.0 → 1.1) and list it in its status line in `index.yaml` |
| `spec/devtools-spec/02-screens.md:354,401` ("`runDiagnostics` samples it") | Current, ungated prose (not a claim of absence) | Recommended reword to "the diagnostics feed samples it"; Rev 0.20 → 0.21 |
| `spec/README.md:407` (CCR-QD-200 row) | History | Leave |
| `spec/traceability.md:593` ("ADR-QD-169 (`makeGatesFeed` is package-private)") | Current | Update with the new BEH/INV ids |

## Q4. The gates that will bite, by script

| Gate (script) | What bites | What to do |
|---------------|-----------|------------|
| `scripts/check-api-surface.mjs` (gate 13) | MISSING: every new export must be a backticked token between `## Public API surface` and `## Worked example`. STALE: every backticked Export-column name must still be exported by some package (`check-api-surface.mjs:12-22,355`) [VERIFIED: read]. `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics`, `DiagnosticsStore`, `DiagnosticsDockOptions` all sit in Export cells today (`overview.md:869,908,912,913,919`) | Rows in Q8. ENTRY is unaffected (no new `exports` key) |
| `scripts/check-package-install.mjs` (gate 14) | Check 3b: the packed `exports` map is still `.` and `./react` (unchanged). Check 4's consumer (`:425-426`) imports only `emptyTimeline, ingest, verdictOf` and `DevtoolsDock`, so **no feed `.d.ts` is exercised today** | D-09: extend the consumer. Import `makeTimelineFeed`, `sourceFromRecords`, `TimelineStatus` from `"@qadi/devtools"`; build the feed in `Effect.scoped` over the record the fixture already builds; assert `feed.status.getSnapshot()._tag === "Reading"`, which is deterministic whether or not the fork ran. The fixture compiles with `skipLibCheck: false` (`:584-594`), so this type-checks the shipped feed declarations |
| `scripts/check-doc-examples.mjs` (spec + package READMEs) | `28-devtools-screens.md:752-767` imports retired names; the README's new headless fence must compile | Rewrite the fence; write the README example as ` ```typescript ` |
| `scripts/check-website-doc-examples.mjs` | `upgrading.md:538-552` imports `DiagnosticsDockOptions` | Q3 row; the new 0.13 "After" fence as ` ```typescript ` |
| `scripts/check-house-style.mjs` | `devtools-named-barrel`: no `export *`, specifiers bytewise ascending (Pattern 1). Budgets: nothing added to `SWITCH_BUDGET`, `UNTRACED_BUDGET`, `ANY_BUDGET`, `UNTRUSTED_DECODE_BUDGET`, `PORT_DOUBLE_BUDGET`. `DECISION_READ_BUDGET` concerns `AsyncResult` reads in `packages/*/src` and in fences importing `@qadi/react`; none here | Keep the README fence free of `@qadi/react` |
| `scripts/check-devtools-claims.mjs` (gate 12) | Only claims of absence in `spec/devtools-spec/` ("not built", "needs an aggregator's page", …). The "aggregator page / CLI not written" claims (`00-overview.md:100-112`) stay true: this phase writes no shell | None. The `02-screens.md` reword above is not a claim of absence |
| `scripts/check-dod-table.mjs` (gate 11) | Scans `AGENTS.md`, root `README.md`, `CONTRIBUTING.md`, `spec/**`, `scripts/**`, workflows for "gate N" without its command (`:257-265`) | In every spec edit write "gate 13 (`check-api-surface.mjs`)", never a bare number (D-11). `pnpm check` gains no step, so the table is unchanged |
| `spec/scripts/verify-traceability.sh --strict` | Every `INV-QD-*` in `invariants.md` and every ADR must appear in `traceability.md`; backticked `packages/` paths must exist (`:84,106,258`) | Trace BEH-636..640, INV-365..366, ADR-173 |
| `node scripts/spec-revise.mjs --check` | Each touched spec doc's Revision equals its newest Change History entry | Bump with `node scripts/spec-revise.mjs <doc> "<what>"` (Q8 list) |
| `pnpm circular` (madge) | A type-only cycle between `DiagnosticsFeed.ts` and `DiagnosticsStore.ts` | Pattern 2: declare `DiagnosticsOptions` in the store module |
| `pnpm example` | `Counters.tsx` | Q3 row |
| `pnpm website` (`check-website-build.mjs`) | Markdown only | Low risk |

## Q5. The public-entry tests (D-05)

**What `surface.test.ts` pins today** [VERIFIED: `test/surface.test.ts:19-87`]: `Object.keys(Root).sort()` deep-equals `ROOT_VALUES` (47 names, including `"makeDiagnosticsStore"`, `"makeTimelineStore"`, `"noDiagnostics"`, `"runDiagnostics"`, `"runSource"`), and the React entry equals `REACT_VALUES` (`"DevtoolsDock"`, `"DiagnosticsStatus"`, `"TimelineStatus"`, `"useDiagnostics"`, `"useSimulationSession"`, `"useSimulationSnapshot"`, `"useTimeline"`, `"useTimelineStore"`).

**New `ROOT_VALUES` (49)** [VERIFIED: computed]:

```
AskedRead, DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS, DEFAULT_PORT_CALL_CAPACITY, DEFAULT_TIMELINE_CAPACITY,
DiagnosticsStatus, Evicted, NoSelection, RegistryRead, Selected, TimelineDecision, TimelineOrphan,
TimelineStatus, WiringRead, applyFilters, catalogueOf, collectPortCalls, countsOf, describeTracePath,
emptyTimeline, entryKey, environmentsOf, flattenTree, hasHydrated, hydrationActivity, ingest, ingestAll,
inspect, inspectEntry, isNeverResolved, isTruncated, isUnfiltered, makeDiagnosticsFeed, makeGatesFeed,
makeSimulationSession, makeTimelineFeed, mergeReading, mergeSources, noFilters, pairedEntries, pairsOf,
portActivity, searchTextOf, selectionOf, sourceFromEventSource, sourceFromRecords, unaccountedEntries,
verdictOf, verdictOfOutcome, wiringReport
```

**What `surface.tst.ts` pins today** [VERIFIED: `test/surface.tst.ts:13-111,198-205`]:
- The root type list includes `DiagnosticsOptions`, `DiagnosticsReading`, `DiagnosticsStore`, `TimelineStore`.
- The React type list includes `DiagnosticsDockOptions`, `DiagnosticsSnapshot`, `DiagnosticsStatus`, `TimelineStatus`.
- `// @ts-expect-error no exported member` refusals cover `makeDiagnosticsFeed`, `makeGatesFeed` and `makeTimelineFeed` from the root.

**After:**
- **Root types:**
  - Drop `DiagnosticsStore`.
  - Add `AskedRead`, `DiagnosticsFeed`, `DiagnosticsReadout`, `DiagnosticsSnapshot`, `DiagnosticsStatus`, `GatesFeed`, `GatesFeedInputs`, `GatesSnapshot`, `RegistryRead`, `TimelineFeed`, `TimelineFeedInputs`, `TimelineStatus`, `TimelineStatusReadout`.
- **React types:** `DiagnosticsDockOptions` → `DiagnosticsOptions`.
- **Delete** the three feed refusals.
- **Add refusals:**
  - from the root: `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics`, `type DiagnosticsStore`, `idleTimeline`, `idleDiagnostics`, `isUnsampled`;
  - from both entries: `type DiagnosticsDockOptions`.
- **Add pins:**
  - React's `DiagnosticsOptions` is the root's (`expect<ReactDiagnosticsOptions>().type.toBe<DiagnosticsOptions>()`, the `AskedQuestionLike` precedent).
  - `DiagnosticsOptions` is exactly `{ readonly layer?: Layer.Layer<never, unknown>; readonly collector?: PortCallCollector; readonly intervalMillis?: number }`, so `schedule` is gone and the type is not generic.
  - `makeDiagnosticsFeed`'s type is `(init?: DiagnosticsOptions) => Effect<DiagnosticsFeed, never, Scope>`; the timeline and gates feeds get the same.

**Feed tests, the import split** (re-pointed in place; no renames). Each file keeps its case ids (TF…, F…, G…/T…), which the spec cites.

| File | From `../../src/index.ts` | Stays on `model/` (private) |
|------|---------------------------|-----------------------------|
| `TimelineFeed.test.ts:23` | `makeTimelineFeed`, `type TimelineFeed`; `sourceFromRecords`, `type Source`, `type SourceRead` may follow | `idleTimeline` |
| `DiagnosticsFeed.test.ts:8-18` | `DiagnosticsStatus`, `makeDiagnosticsFeed`, `type DiagnosticsOptions`, `type DiagnosticsReadout`; `PortCallCollector`, `PortCallLog` may follow | `diagnosticsOff`, `diagnosticsStarting`, `idleDiagnostics`, `isUnsampled`, `noDiagnostics` |
| `GatesFeed.test.ts:12-14` | `AskedRead`, `RegistryRead`, `makeGatesFeed`, `type GatesFeed`, `type GatesSnapshot`, `type AskedQuestionLike`, `type GateInstanceLike` | none |

**RED first (WX-06, D-08 step 2):** written on the base, these fail by import.
- Root lacks `makeTimelineFeed`, so vitest's ESM transform yields `undefined` and the first call throws a `TypeError`. The typecheck fails with TS2305.
- The surface lists fail.
- The tstyche pins fail.

There is **no behaviour change**: the React dock, the hooks and the feeds' semantics are untouched. The proof is that the existing feed suites pass unmodified apart from their import lines, and that `DevtoolsDock.test.tsx`, both `QuestionsPanel` characterisations and `DiagnosticsScreens.test.tsx` stay green.

## Q6. The README headless example (D-06)

This was type-checked this session against the current feed modules under `tsconfig.base.json` with `lib: ["ESNext", "DOM"]` (`exit 0`). In that check the imports pointed at `model/`; the README form imports from `"@qadi/devtools"`, which the doc-examples gate resolves through `tsconfig.base.json`'s `paths` to `packages/devtools/src/index.ts`. It follows AGENTS.md: namespace `effect/*` imports, `Effect.fn`, `Match.tagsExhaustive` (no `switch`), no `async`, no `console`.

```typescript
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import { makeDecisionLog } from "@qadi/core";
import {
  makeDiagnosticsFeed,
  makeGatesFeed,
  makeTimelineFeed,
  type AskedQuestionLike,
  type DiagnosticsStatus,
  type GateRegistryLike,
  type TimelineStatus,
} from "@qadi/devtools";

// A stop is a state of the feed, not a silent dead fiber: say it.
const timelineLine: (status: TimelineStatus) => string = Match.type<TimelineStatus>().pipe(
  Match.tagsExhaustive({
    Reading: () => "timeline: reading",
    Stopped: ({ reason }) => `timeline: stopped (${reason})`,
  }),
);

const diagnosticsLine: (status: DiagnosticsStatus) => string = Match.type<DiagnosticsStatus>().pipe(
  Match.tagsExhaustive({
    Off: () => "diagnostics: off",
    Starting: () => "diagnostics: starting",
    Live: () => "diagnostics: live",
    Stopped: ({ reason, sampled }) =>
      `diagnostics: stopped${sampled ? "" : " before its first sample"} (${reason})`,
  }),
);

export interface HostInputs {
  readonly gates?: GateRegistryLike | undefined;
  readonly questions?: (() => ReadonlyArray<AskedQuestionLike>) | undefined;
}

/** Builds the three feeds in the caller's scope; closing it ends every read. */
export const watch = Effect.fn("example.watch")(function* (report: (line: string) => void, host: HostInputs) {
  const log = yield* makeDecisionLog({ environment: "Server", capacity: 512 });
  const timeline = yield* makeTimelineFeed({ source: log });
  const diagnostics = yield* makeDiagnosticsFeed({ intervalMillis: 1_000 });
  const gates = yield* makeGatesFeed(host);

  timeline.timeline.subscribe(() => report(`${timeline.timeline.getSnapshot().entries.length} entries`));
  timeline.status.subscribe(() => report(timelineLine(timeline.status.getSnapshot())));
  diagnostics.subscribe(() => report(diagnosticsLine(diagnostics.getSnapshot().status)));
  gates.subscribe(() => report(`gates: ${gates.getSnapshot().registry._tag}`));

  return { log, timeline, diagnostics, gates };
});

/** Runs until interrupted; interrupting it closes the scope, which is never reported as a stop. */
export const run = (report: (line: string) => void, host: HostInputs = {}) =>
  Effect.scoped(Effect.andThen(watch(report, host), Effect.never));
```

The prose under it should say:
- **`log.layer` is the application's sink.** It is `DecisionSink` for the code that evaluates.
- **A stopped feed restarts on command.** `timeline.status.restart()` and `diagnostics.restart()` restart a stopped feed.
- **`configure` replaces the whole input set.** `TimelineFeed.configure` treats an omitted input as `undefined` (`TimelineFeed.ts:63`), and `diagnostics.configure(undefined)` ends the poll and resets it to `Off`.
- **A shell supplies any `reading` itself.** A supplied reading is laid over the feed's with `mergeReading`, which is the dock's `reading` rule.
- **The removed claim goes.** "`runDiagnostics` and `makeDiagnosticsStore` are the same loop without React" is removed, and so is the "three stores" root list at `:26-27`.

## Q7. Mutation (D-10, WX-05)

- **Config** [VERIFIED: `stryker.devtools.mjs` read]:
  - `mutate: ["packages/devtools/src/model/**/*.ts"]`, `ignoreStatic: true`, `thresholds: { high: 90, low: 80, break: 80 }`.
  - JSON report `reports/mutation-devtools/mutation.json`; `vitest.configFile: "packages/devtools/vitest.config.ts"`.
  - Devtools has its own config and project. `src/react/` and the barrels are outside the glob, so edits to `index.ts`, `react/index.ts`, `useDiagnostics.ts`, `DevtoolsDock.tsx` and `useDockModel.ts` produce no mutants.
- **Touched model files and expected effect:**
  - `DiagnosticsFeed.ts`: deletes `runOptions` and `DiagnosticsDockOptions`; doc comment.
  - `DiagnosticsStore.ts`: signature and schedule line; doc comment.
  - `DockModel.ts`: type-only import rename, so no mutant changes.
  - `TimelineFeed.ts`, `GatesFeed.ts`: the "Package-private" doc line only, so no mutant changes.
  - `TimelineStore.ts` stays **untouched** (leave its comment; it stays true), so it stays out of the list.
- **Invocation (base and close, identical):** `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DiagnosticsFeed.ts,packages/devtools/src/model/DiagnosticsStore.ts,packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/GatesFeed.ts,packages/devtools/src/model/TimelineFeed.ts' < /dev/null`. This is the shape `56-01-PLAN.md:25,100` used.
- **Harness:** copy `.planning/phases/QD-59-…/59-mutation.mjs`, which carries the newest mechanics: identity keys without line numbers, `minus` multiset, `DELETED` declarations, `MOVED` plus receiver, static credit from an `ignoreStatic:false` evidence run. Change only `D`, `CF = "stryker.devtools.mjs"`, `RP = "reports/mutation-devtools/mutation.json"` and `DIRS = ["packages/devtools/src", "packages/devtools/test"]` (56's freshness check used exactly these dirs, `56-mutation.mjs:47`), plus `FILES`/`MOVED`/`DELETED`. `60-mutation.mjs` and `60-mutation-base.json` are the phase's first commit, measured on the untouched tree.
- **Declare before the change** (`DELETED`):
  - `DiagnosticsFeed.ts`: `"const runOptions ="`, `"export interface DiagnosticsDockOptions"`, `"import * as Schedule"`.
  - `DiagnosticsStore.ts`: `"readonly schedule?: Schedule.Schedule<unknown>;"`, `"<ROut = never, E = never>"`.
- **The fall to expect, and its fix:**
  - At Phase 56's close, `DiagnosticsFeed.ts` was killed 86, survived 1, ignored 13, measured 0.98851 (`56-mutation-after.json`) [VERIFIED: read]. The only survivor is `ConditionalExpression | Survived | true | before !== undefined | if (before !== undefined) off();`. No commit has touched the file since `c02f2c43` (56-09) [VERIFIED: `git log`].
  - Deleting `runOptions` removes killed mutants: roughly two conditional spreads, an equality pair, object literals and a `??` [ASSUMED count, about 8 to 12]. The survivor stays, so the score drops (for example 76/77 = 0.987 < 0.9885).
  - Under 59's `compare`, a file not in `MOVED` that falls fails, and D-10 forbids re-baselining.
  - The survivor is **equivalent**: with no option held, `off()` calls `runs.stop()`, which forks `Effect.void` with no live run (`SupersedingRun.ts:139-141`). It replaces an unreachable store, resets `sampled`, and `view.set(diagnosticsOff)` is the same reference, so `set` notifies nothing (`ExternalStore.ts` `if (next === current) return`). No test can kill it.
  - **Recommendation:** rewrite it away, as Phase 56 did with five equivalent mutants (`c02f2c43`, ADR-QD-169's mutation note). The configure branch becomes `if (next === undefined) { off(); return; }`, `off` stays idempotent and silent, and the comment at `:219` goes. Behaviour is unchanged: `DiagnosticsFeed.test.ts` F26 ("configure(undefined) over a feed that is already off changes and notifies nothing", `:422-439`) pins it [VERIFIED: read]. The file then reaches no survivor.
  - **Alternatives:** keep the guard and declare `DiagnosticsFeed.ts` in `MOVED` with `DiagnosticsStore.ts` as receiver. That cannot pass, because the store gains about as many mutants as it loses, not 8 or more.
- **`DiagnosticsStore.ts`** was 57/57 (measured 1). Its rewritten lines' mutants are new identities (lines changed), and they are killed by the default-cadence test ("samples once at start and once per interval", 1999 ms vs 2000 ms) and the 500 ms override. Keep it at 1.
- **Static credit:** the change adds no module-scope code, so expect no new static-ignored mutant. If one appears, run the evidence pass with an out-of-repo config using `ignoreStatic: false` (56-06's practice).
- **Coverage:** `packages/devtools/src/model/**` is held at 95/95/95/95 (`vitest.config.ts` root `thresholds`) [VERIFIED: read]. Deleting `runOptions` cannot lower it.

## Q8. Records

**Ids confirmed unused** [VERIFIED: `git grep -nE 'ADR-QD-173|CCR-QD-451|BEH-QD-63[6-9]|BEH-QD-640|INV-QD-36[56]' -- ':!.planning'` → no match, exit 1]. Highest used today: `BEH-QD-635`, `INV-QD-364`, `CCR-QD-450`, `ADR-QD-172`. `scripts/next-id.mjs` was not run.

| Record | Where | Content |
|--------|-------|---------|
| **ADR-QD-173** | new `spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md` (`Document ID` = `QADI-ADR-173`) + `index.yaml` block after `ADR-QD-172` (`:537-540`) | Status: `Accepted — amends ADR-QD-047, ADR-QD-099, ADR-QD-169; applies ADR-QD-137`. Decision: the three feeds and the types their handles name are the root's headless interface; the four runners and `noDiagnostics`/`DiagnosticsStore` leave the root and stay as the feeds' engines; one option shape `DiagnosticsOptions` (why `schedule` goes: restart needs a comparable value); the idle placeholders stay private (no pass-before-build in a headless shell); no entry point added. Alternatives: keep the pairs beside the feeds (two ways, one of them unwatched); export only timeline+diagnostics (D-02 rejected); keep `schedule` (cannot compare); rename the input types (Open Question 3) |
| ADR-QD-047 amendment | `spec/decisions/047-…md`, Rev 1.18 → 1.19, new block after `:505-511` | "**Amended 2026-11-19 (CCR-QD-451): the headless interface is the feeds.**" The 1.6 amendment's root list (`:207-208`, "the three stores (`TimelineStore` with `runSource`, `SimulationSession`, `DiagnosticsStore` with `runDiagnostics`)") and the 1.13/1.15 "package-private" feed modules are narrowed; history not rewritten |
| ADR-QD-099 amendment | `spec/decisions/099-…md`, Rev 1.1 → 1.2 | One paragraph: the devtools root's named list now carries the feeds; three modules that were wholly private are part-public through named exports; the "Entry points" table and the `exports` map are unchanged (`:41-42` still true: the only non-root entry is `@qadi/devtools/react`) |
| ADR-QD-169 amendment | `spec/decisions/169-…md`, Rev 1.0 → 1.1 | Decision 1's "package-private … out of both barrels" is amended: `makeGatesFeed` and its snapshot types are exported from the root (not the React entry); every other decision unchanged |
| **BEH-QD-636** | `spec/behaviors/28-devtools-screens.md`, appended after BEH-QD-620 (`:2405-2427`) | *The timeline feed is the root's timeline interface.* `makeTimelineFeed(inputs?)` built in the caller's scope returns `{ timeline, status, configure }`; closing the scope ends the read; `status` is `Reading` or `Stopped { reason }`; a feed with no source is a hand-fed timeline; `configure` replaces the input set. Pinned by `TimelineFeed.test.ts` through the root |
| **BEH-QD-637** | same | *The diagnostics feed is the root's poll, and its stop is stated.* `makeDiagnosticsFeed(options?)` → `{ subscribe, getSnapshot, restart, configure }`, `{ status, reading }`, `Off | Starting | Live | Stopped { reason, sampled }`; it only forks; an interruption is never `Stopped`. The compiled `typescript` fence goes here (Code Examples). Pinned by `DiagnosticsFeed.test.ts` through the root |
| **BEH-QD-638** | same | *The gates feed is the root's gate watch.* `makeGatesFeed(inputs?)` → `{ subscribe, getSnapshot, configure }`, `{ registry: RegistryRead, asked: AskedRead }`; nothing the host throws leaves it (restates BEH-QD-616/618 for a headless caller). Pinned by `GatesFeed.test.ts` through the root |
| **BEH-QD-639** | same | *One option shape configures the poll.* `DiagnosticsOptions = { layer?: Layer<never, unknown>; collector?; intervalMillis? }`, taken unchanged by `makeDiagnosticsFeed`, `useDiagnostics`, `DevtoolsDock`'s `diagnostics` and the model input; no `schedule`, not generic; a layer with an unmet requirement is refused; `DiagnosticsDockOptions` is gone (**Breaking**). Pinned by `DiagnosticsStore.tst.ts`, `surface.tst.ts`, `DiagnosticsStore.test.ts` (the interval override) |
| **BEH-QD-640** | same | *The runners are the feeds' engines, not the interface.* `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics` and `DiagnosticsStore` are not importable from either entry; adding a root name is a barrel line, an overview row and a surface line. Pinned by `surface.test.ts`, `surface.tst.ts`, and `check-package-install.mjs`' consumer (the packed root builds a feed) |
| Amend in dated notes | `28-devtools-screens.md` BEH-QD-323 (`:645-666`, `:752-767`), BEH-QD-465 (`:938`), BEH-QD-506 (`:1275-1277`), BEH-QD-510 (`:1490`); `09-react.md` BEH-QD-327 (`:697`) | As in Q3 |
| **INV-QD-365** | `spec/invariants.md` after INV-QD-364 (`:4237-4248`), same shape (statement, Source, Implication, Enforcement, Related) | *Every read the dock runs is reachable headless, and none the root exports goes unwatched.* Each of the dock model's three reads is a root-exported feed with a closed status, and the root exports no runner a caller must fork and watch itself. Source: `index.ts`, the three feed modules. Enforcement: `surface.test.ts`, `surface.tst.ts`, the three feed suites through the root |
| **INV-QD-366** | same | *The diagnostics poll has one option shape, read without translation.* Exactly one `DiagnosticsOptions` declaration; engine, feed, hook, dock prop and model input take it unchanged (no `runOptions`); React's is the root's. Enforcement: `DiagnosticsStore.tst.ts`, `surface.tst.ts`, `DiagnosticsStore.test.ts` |
| **CCR-QD-451** | `spec/README.md` table after CCR-QD-450 (`:387`), README Rev 1.253 → 1.254 | Date 2026-11-19; one cell naming every changed file (spec docs with their new Revs, the new changeset, the upgrade note, source, tests, `check-package-install.mjs`); then `ARCH-107. **Devtools' headless interface is the feeds.** …` ending `Unused: none` (or the unused ids) |
| `spec/overview.md` | Rev 1.126 → 1.127; rows at `:844-848` (prose), `:868-869`, `:907-913`, `:917-920` | Prose: "The root exports the three feeds a shell builds in a scope (`makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed`), the simulation session, …". Rows: `TimelineStore` keeps its row; replace the `makeTimelineStore`/`runSource` row with `makeTimelineFeed` + `TimelineFeed`, `TimelineFeedInputs`, `TimelineStatusReadout`; move `TimelineStatus` to "root and React"; `Diagnostics`, `DiagnosticsOptions` row (new shape: `layer`, `collector`, `intervalMillis`; drop `DiagnosticsStore`); drop the `makeDiagnosticsStore`/`runDiagnostics` row; `noDiagnostics` leaves the constants row; `DiagnosticsDockOptions` row → `DiagnosticsSnapshot`, `DiagnosticsStatus` (root and React) + `makeDiagnosticsFeed`, `DiagnosticsFeed`, `DiagnosticsReadout`; new `makeGatesFeed`, `GatesFeed`, `GatesFeedInputs`, `GatesSnapshot`, `RegistryRead`, `AskedRead` rows (`model/GatesFeed.ts`). The `AskedQuestionLike` row's "so `DiagnosticsStore` can sample a thunk returning it" is stale since ADR-QD-169: fix in passing |
| `spec/traceability.md` | Rev 1.221 → 1.222 | ADR-QD-173 row; INV-365/366 rows; BEH-636..640 into the 28 row (`:70`, "…BEH-QD-616–620, BEH-QD-636–640"); test rows `:521-525`, `:592-593` gain the new ids; `:593`'s "(`makeGatesFeed` is package-private)" replaced |
| Other Revs | `28-devtools-screens.md` 1.32 → 1.33, `09-react.md` 3.9 → 3.10, `invariants.md` 1.158 → 1.159, `devtools-spec/02-screens.md` 0.20 → 0.21 (if reworded) | [VERIFIED: each header read] |
| Changeset | new `.changeset/devtools-headless-interface-is-the-feeds.md`, `"@qadi/devtools": minor` | **Breaking.** The root exports the feeds; the four runners, `noDiagnostics` and `DiagnosticsStore` are no longer importable; `DiagnosticsDockOptions` is `DiagnosticsOptions` (also on `@qadi/devtools/react`); `DiagnosticsOptions` is not generic and takes `intervalMillis` for `schedule`. No `@qadi/react` changeset: nothing there changes (Risk R1) |
| Upgrade note | `upgrading.md` new `## 0.13:` section | Before (` ```ts `): `makeDiagnosticsStore()` + `Effect.forkChild(runDiagnostics(store, { layer, schedule: Schedule.spaced("1 second") }))`; `makeTimelineStore()` + `runSource(store, source)`. After (` ```typescript `): `makeDiagnosticsFeed({ layer, intervalMillis: 1_000 })`, `makeTimelineFeed({ source })`, inside a scope; `DiagnosticsDockOptions` → `DiagnosticsOptions`; a hand-fed store is `makeTimelineFeed()` + `timeline.accept`; `useTimelineStore` is unchanged |

## Common Pitfalls

### Pitfall 1: the two compiled fences that name removed APIs
**What goes wrong:** `check-doc-examples.mjs` fails on `28-devtools-screens.md:752-767`, and `check-website-doc-examples.mjs` fails on `upgrading.md:538-552`.
**How to avoid:** rewrite both in the same commit as the export change, or immediately after it. They're easy to miss because one is spec and one is "history".
**Warning signs:** TS2305 "has no exported member" in either gate.

### Pitfall 2: a stale `@ts-expect-error`
**What goes wrong:** `surface.tst.ts:198-205` expects `makeDiagnosticsFeed`, `makeGatesFeed` and `makeTimelineFeed` to be missing. Once they're exported, each directive becomes TS2578 "Unused '@ts-expect-error' directive".
**How to avoid:** delete them, and add the retired names as refusals in their place.

### Pitfall 3: `DiagnosticsFeed.ts`' score falls (Q7)
**What goes wrong:** `runOptions`' killed mutants leave while the equivalent survivor stays, so the score drops.
**How to avoid:** remove the guard's equivalent mutant in the same plan. Measure the base first: the 56 figures are history, not the base.

### Pitfall 4: a type cycle
**What goes wrong:** declaring `DiagnosticsOptions` in `DiagnosticsFeed.ts` and importing it into `DiagnosticsStore.ts` creates a type-only cycle.
**How to avoid:** declare it in `DiagnosticsStore.ts`.

### Pitfall 5: reading a feed before it has read anything
**What goes wrong:** every feed only forks. The README example, the install-check probe and any new BEH fence must not assert a sampled value straight after `yield* make…Feed(…)`.
**How to avoid:** assert a status that is deterministic (`Reading`), or subscribe.

### Pitfall 6: the characterisation edit
**What goes wrong:** `QuestionsPanel.feed.characterisation.test.tsx` is declared never-edited, but it imports the removed type.
**How to avoid:** if the owner approves (Open Question 1), make a type-name-only edit of lines 26 and 66 and nothing else. Keep the goldens byte-identical, and say so in the CCR row.

### Pitfall 7 (house style, WX-04)
**What goes wrong:** a new `switch`, `as`, `!`, `any` or `async` slips in.
**How to avoid:** none is needed anywhere. The README example uses `Match.tagsExhaustive`. A test asserting a feed type uses tstyche, not `as`.

### Pitfall 8: `configure` replaces the whole input set
**What goes wrong:** `TimelineFeed.configure({ source })` after a capacity was set reads the capacity as `undefined`. That counts as a resize, so the timeline empties and re-reads (`TimelineFeed.ts:146-157`).
**How to avoid:** state this in BEH-QD-636 and in the README prose, because a headless caller (unlike `useTimeline`) calls `configure` by hand.

## Code Examples

### BEH-QD-323's compiled fence, rewritten (type-checked this session against the current feed module)

```typescript
import * as Effect from "effect/Effect";
import { decisionCacheLayer } from "@qadi/core";
import { makeDiagnosticsFeed } from "@qadi/devtools";

export const sampleOnce = Effect.scoped(
  Effect.gen(function* () {
    const feed = yield* makeDiagnosticsFeed({ layer: decisionCacheLayer() });
    yield* Effect.yieldNow;
    return feed.getSnapshot().reading.wiring._tag;
  }),
);
```

The same session check confirmed that `{ layer: needs }` with `needs: Layer.Layer<Thing, never, Other>` is refused (`@ts-expect-error` satisfied). That refusal is the `RIn` pin BEH-QD-639 states.

### The install-check probe (D-09), added to the existing fixture (`check-package-install.mjs:425-501`)

```ts
import { emptyTimeline, ingest, makeTimelineFeed, sourceFromRecords, verdictOf } from "@qadi/devtools";
// … after `timeline` is built from the StoredRecord the fixture already makes:
const fedStatus = await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed({ source: sourceFromRecords([stored]) });
      return feed.status.getSnapshot()._tag;
    }),
  ),
);
expect("devtools feed", fedStatus, "Reading");
```

(`stored` is the `new StoredRecord({...})` the fixture currently passes inline to `ingest`; hoist it to a `const`.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Root exports raw pairs; the shell forks and watches | Root exports scoped feeds with closed statuses | this phase (ADR-QD-173) | A headless stop is stated instead of silent |
| Two option shapes and a translator | One `DiagnosticsOptions` | this phase | `schedule` and `<ROut, E>` become compile errors |
| Feeds package-private (ADR-QD-047 1.13/1.15, ADR-QD-169 decision 1) | Feeds public | this phase | `surface.tst.ts` flips three refusals |

## Runtime State Inventory

The phase renames and removes public names, so the five categories are answered:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None. No store, sink record or wire format carries these names (they're TS identifiers; `qadi.devtools.runDiagnostics` is a span name, kept since the function stays) | none |
| Live service config | None | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `packages/devtools/lib/` holds the old `.d.ts`. `tsc -b` rebuilds it, and `check-package-install.mjs` packs after `prepack` (`pnpm -w run build`) | none beyond the normal build |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | madge counts a type-only import cycle | Pattern 2 | None if the recommendation is followed; it only motivates placing the type in `DiagnosticsStore.ts` |
| A2 | `runOptions` carries about 8 to 12 killed mutants | Q7 | The fall's size changes, not its existence: any deletion with the survivor kept lowers the score |
| A3 | `DiagnosticsFeed.ts`' base is still 86 killed / 1 survived | Q7 | Plan 01 measures it; 57-59 touched no devtools model file, but tests changed in 58 |
| A4 | Leaving the Phase 56 changeset unedited is the house's preference | Q3 | A reader of the 0.13 CHANGELOG sees `DiagnosticsDockOptions` named in one entry and renamed in the next; harmless but could be tidied |
| A5 | Editing the 0.12 section's compiled "After" fence is acceptable | Q3 | If history must stay byte-identical, the fence has to become ` ```ts ` instead (uncompiled), which AGENTS.md §12 discourages |

## Open Questions (owner)

1. **May `QuestionsPanel.feed.characterisation.test.tsx` take a type-name-only edit?**
   - What we know: its header says "Never edited after it is written" (`:13`), and it imports and annotates with `DiagnosticsDockOptions` (`:26`, `:66`). D-03 removes that name, so it must change or the suite won't compile.
   - Recommendation: approve an edit of exactly those two lines (`DiagnosticsDockOptions` → `DiagnosticsOptions`), with the goldens untouched and the edit recorded in CCR-QD-451. The only alternative is an alias, which D-03 rules out.
2. **The 0.12 upgrade "After" fence** (`upgrading.md:538-552`) names `DiagnosticsDockOptions` and is compiled.
   - Recommendation: drop the import and the annotation, so the fence compiles on 0.12 and 0.13 alike.
   - Alternative: mark it ` ```ts `.
3. **Input type names** (low): `TimelineFeedInputs` and `GatesFeedInputs` sit beside `DiagnosticsOptions`.
   - Recommendation: keep them. D-03 named only the diagnostics shape, and the spec already cites the other two.

## Risks

- **R1, `@qadi/react` / newsroom structural typing:** `@qadi/react` has no dependency on `@qadi/devtools`. `DevtoolsDiagnosticsFeed` is `{ readonly layer: Layer.Layer<QadiRuntimeServices> }` (`packages/react/src/DevtoolsFeed.ts:72-75`), and `DevtoolsFeed<Extra>.diagnostics` is `Extra & DevtoolsDiagnosticsFeed` [VERIFIED: read]. Both stay assignable to the new `DiagnosticsOptions`, since the shape is identical to `DiagnosticsDockOptions`. No react source names a devtools type (`git grep` over `packages/react/src`: none). The newsroom's only reference is `Counters.tsx:13,22`, a rename. **No `@qadi/react` change or changeset.**
- **R2, website build:** markdown edits only. `check-website-doc-examples.mjs` is the risk (Pitfall 1), not `check-website-build.mjs`.
- **R3, the packed interface:** `exports` is `.` and `./react` only (`packages/devtools/package.json`) [VERIFIED: read], so no change. The feed modules' `.d.ts` already ship under `lib/model/` (the `files: ["lib", "src", "README.md"]`), and the root `.d.ts` re-exports them. Today no packed consumer type-checks them; the D-09 probe closes that gap.
- **R4, TS2883 / unnameable types:** every type a public feed signature reaches is exported once the Q1 list lands: `Source`, `StoredRecord` (core), `Timeline`, `WiringRead`, `PortActivity`, `HydrationActivity`, `PortCallLog`, `PortCallCollector`, `AskedQuestionLike`, `GateInstanceLike`, `GateRegistryLike`, `Layer`, `Scope`. The two that would otherwise be reachable only by property are `TimelineStatusReadout` (`TimelineFeed.status`) and `DiagnosticsReadout` (the interface `DiagnosticsFeed` extends). A consumer with `declaration: true` that exports `feed.status` would hit TS2883/TS4023 unless they're exported, which is why Q1 exports both (AGENTS.md §9). Nothing public names `SupersedingRun`, `RunToken` or `ExternalStore`.
- **R5, `reason` is a stack trace:** a public `Stopped.reason` is `Cause.pretty`, which names checkout paths (`QuestionsPanel.feed.characterisation.test.tsx:9-11` empties it for that reason). ADR-QD-047's 2026-11-12 amendment kept it in-memory only. A headless shell may now forward it, so BEH-QD-637 should say a shell must not send it across a trust boundary (Security Domain).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | yes | v26.13.0 (engines `>=22.12.0`) | none needed |
| pnpm | scripts, `pnpm publish`-shaped pack in gate 14 | yes | 10.17.1 | none needed |
| tsc (effect-tsgo) | typecheck, doc-example gates | yes | 7.0.2+effect-tsgo.0.67.5 | none needed |
| vitest / tstyche / Stryker | tests, mutation | yes | 5.1.0 / 7.2.5 / 10.1.1 | none needed |

No missing dependency.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 (`@effect/vitest`), tstyche 7.2.5 |
| Config file | `packages/devtools/vitest.config.ts` (project `devtools`), root `vitest.config.ts` (coverage) |
| Quick run command | `pnpm exec vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/model/DiagnosticsFeed.test.ts packages/devtools/test/model/GatesFeed.test.ts packages/devtools/test/model/DiagnosticsStore.test.ts packages/devtools/test/surface.test.ts < /dev/null` (base: about 1 s) |
| Type tests | `pnpm exec tstyche packages/devtools/test/surface.tst.ts packages/devtools/test/model/DiagnosticsStore.tst.ts < /dev/null` (base: 2.5 s) |
| Full suite command | `pnpm check:pr < /dev/null` (phase gate only; never run in research) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HDLS-02 | Root exports the feeds; the pairs are gone | unit + type | `vitest … test/surface.test.ts`; `tstyche test/surface.tst.ts` | yes (edit) |
| HDLS-02 | The packed root builds a feed | gate | `node scripts/check-package-install.mjs` | yes (extend consumer) |
| HDLS-03 | One option shape; no `schedule`; not generic; RIn refused | type + unit | `tstyche test/model/DiagnosticsStore.tst.ts`; `vitest … DiagnosticsStore.test.ts` | yes (edit) |
| HDLS-03 | README example compiles | gate | `node scripts/check-doc-examples.mjs` | yes |
| HDLS-04 | Feed suites run against the root | unit | `vitest … TimelineFeed DiagnosticsFeed GatesFeed` | yes (re-point) |
| HDLS-04 | Overview matches the interface | gate | `node scripts/check-api-surface.mjs` | yes |
| WX-05 | Touched files' scores do not fall | mutation | `pnpm exec stryker run stryker.devtools.mjs --mutate '<5 files>'` + `node .planning/phases/QD-60-…/60-mutation.mjs compare` | Wave 0: `60-mutation.mjs` |
| (no behaviour change) | Dock unchanged | unit/characterisation | `vitest --project devtools` (whole) | yes |

### Sampling Rate
- **Per task commit:** the quick run plus the type tests above.
- **Per wave merge:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm typecheck`, `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs`, `node scripts/check-website-doc-examples.mjs`, `pnpm lint`, `pnpm circular`.
- **Phase gate:** `pnpm check:pr < /dev/null` green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `.planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-mutation.mjs` + `60-mutation-base.json`, measured on the untouched tree (D-08 step 1).
- No framework install needed.

## Security Domain

`security_enforcement: true`, ASVS L1 (`.planning/config.json`) [VERIFIED: read].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | none |
| V3 Session Management | no | none |
| V4 Access Control | no | A developer tool; it decides nothing (the model renders decisions, it never makes one) |
| V5 Input Validation | no change | Host inputs stay guarded in the feeds (`GatesFeed.ts` `stated`); decoding stays in `Source.ts` via `untrustedDecoder` |
| V6 Cryptography | no | none |
| V7/V8 Error handling and data protection | yes | `Stopped.reason` is `Cause.pretty` (stack frames, checkout paths). It now reaches a public headless API, so BEH-QD-637 and the README should state it is for a developer in the host's own process and must not be sent across a trust boundary (ADR-QD-047's 2026-11-12 amendment item 3) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A stack trace forwarded by a headless shell to a remote viewer | Information disclosure | A documented rule (above); nothing in this package sends it |
| A host callback throwing into the feed | Denial of service (a frozen panel) | Already handled: the gates feed states it; the poll's defect is `Stopped` (INV-QD-313, INV-QD-358) |

## Plan Shape (suggested, D-08 order)

1. **60-01: mutation base, alone.** `60-mutation.mjs` (the 59 harness, devtools constants, `DELETED` declared) and `60-mutation-base.json` over the five files.
2. **60-02: RED.**
   - Re-point the three feed suites to the root.
   - Rewrite `surface.test.ts` and `surface.tst.ts`.
   - Add the `DiagnosticsStore.tst.ts` pins and rename "honours an interval override".
   - All of these fail by import or type on the base.
3. **60-03: GREEN.**
   - Barrels; `DiagnosticsOptions` in `DiagnosticsStore.ts`; `runDiagnostics` non-generic; `runOptions` and `DiagnosticsDockOptions` deleted.
   - The equivalent survivor rewritten away.
   - React/test/`Counters.tsx` renames; the characterisation's two-line edit, if approved.
   - Feed doc comments for a public reader.
4. **60-04:** extend `check-package-install.mjs`' consumer (D-09), then run it.
5. **60-05: mutation after + compare** (+ evidence run only if a new static-ignored mutant appears).
6. **60-06: docs.** README headless section; website `devtools.md`; `upgrading.md` (0.12 fence + new 0.13 section); the new changeset.
7. **60-07: records.**
   - ADR-QD-173 + `index.yaml`, plus the ADR-047/099/169 amendments.
   - BEH-636..640 and the dated amendments in 28 and 09.
   - INV-365..366.
   - Overview rows.
   - Traceability; CCR-QD-451; Rev bumps; `02-screens.md` reword.
   - `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`.

## Sources

### Primary (HIGH confidence): files read this session at HEAD `1f28d352`
- `packages/devtools/src/index.ts`, `src/react/index.ts`, `src/model/{DiagnosticsStore,DiagnosticsFeed,TimelineStore,TimelineFeed,GatesFeed,DockModel,SupersedingRun,ExternalStore}.ts`, `src/react/{useDiagnostics,useTimeline,DevtoolsDock,useDockModel}.ts(x)`
- `packages/devtools/test/{surface.test.ts,surface.tst.ts}`, `test/model/{DiagnosticsStore.test.ts,DiagnosticsStore.tst.ts,DiagnosticsFeed.test.ts,TimelineFeed.test.ts,GatesFeed.test.ts}` (imports), `test/react/{QuestionsPanel.feed.characterisation.test.tsx,questionsProp.ts}`
- `packages/devtools/{package.json,vitest.config.ts,README.md}`, root `vitest.config.ts`, `tsconfig.base.json`, `package.json` scripts, `stryker.devtools.mjs`
- `packages/react/src/DevtoolsFeed.ts`, `node_modules/effect/src/Layer.ts:56`
- `scripts/{check-api-surface,check-package-install,check-doc-examples,check-website-doc-examples,check-house-style,check-devtools-claims,check-dod-table,spec-revise}.mjs`, `spec/scripts/verify-traceability.sh`
- `spec/overview.md`, `spec/behaviors/28-devtools-screens.md`, `spec/behaviors/09-react.md`, `spec/decisions/{047,099,169}-*.md`, `spec/decisions/index.yaml`, `spec/devtools-spec/{00-overview,02-screens,README}.md`, `spec/invariants.md` (INV-357..364), `spec/traceability.md`, `spec/README.md`
- `apps/website/src/content/docs/docs/{packages/devtools.md,reference/upgrading.md}`, `examples/nextjs-newsroom/src/client/Counters.tsx`, `.changeset/devtools-questions-is-a-dock-input.md`
- `.planning/phases/QD-56-*/{56-RESEARCH.md,56-CONTEXT.md,56-mutation.mjs,56-mutation-after.json,56-01-PLAN.md}`, `.planning/phases/QD-59-*/59-mutation.mjs`, `QD-58` mutation-after
- Runs: six devtools suites (129 tests) and two tstyche files (9 tests) green; scratch type-check of the README and spec-28 examples green

### Secondary / Tertiary
- None. No web source was needed; every claim is in-repo.

## Metadata

**Confidence breakdown:**
- Retire/keep/new list: HIGH. Every name was traced to the handle or signature that names it.
- Option collapse: HIGH. The shape already exists (`DiagnosticsDockOptions`) and the variance was checked.
- Gates: HIGH. Each script's scope was read.
- Mutation: MEDIUM. The fall is certain, but its size and the base need measuring (A2, A3).
- Records: HIGH. Ids are confirmed unused; the shapes are copied from Phase 56.

**Research date:** 2026-11-19
**Valid until:** the next commit touching `packages/devtools/src` or `spec/overview.md`'s devtools section
