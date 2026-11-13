# Phase 34: Diagnostics as the dock model's seventh store - Research

**Researched:** 2026-11-12
**Domain:** Effect v4 (`effect@4.1.2`) fiber lifetime inside a `Scope`, and React 19 layout-effect/`<Activity>` lifecycle, for a headless devtools model
**Confidence:** HIGH (every API claim below was read in `node_modules/effect/src` this session, and the behavioural claims were run against the installed `effect/dist` in throwaway scripts outside the repo)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

The user's direction for every area: "the most clean solution, the most complete, not the simplest. We don't care about complexity." The decisions below take the complete option in each area.

#### The feed and its closed status (DIAG-05)
- **D-01 One scoped diagnostics feed.** A new package-private model, `makeDiagnosticsFeed`, built in a `Scope`, holds:
  - the diagnostics store;
  - one `FiberHandle` for the poll (`runDiagnostics`);
  - a `configure(options | undefined)` command, compared per field.

  The dock model and `useDiagnostics` both use it, so there is exactly one poll implementation.
- **D-02 The feed's snapshot is `{ status, reading }`, with a closed `DiagnosticsStatus`:**
  - `Off`: no diagnostics options were given, so nothing runs.
  - `Starting`: the poll is forked and no sample has been accepted yet.
  - `Live`: at least one sample has been accepted.
  - `Stopped { reason, sampled }`: the poll ended on a defect. The reason is `Cause.pretty` of the defect. `sampled` says whether any sample was accepted before the stop (a stop from `Live` is `true`, a stop from `Starting` is `false`), so the panel's copy is never false: after a sample it says the reading shown is the last one taken; before one it says nothing was read.

  It is a `Data.TaggedEnum` and is dispatched with `Match.tagsExhaustive`. The status belongs to the feed and not to a reading, so `Diagnostics` and `mergeReading` keep their shapes.
- **D-03 A defect stops the poll visibly and keeps the last good reading.**
  - A sample that dies (for example a throwing `questions`) ends the poll fiber. The feed observes the fiber's exit and sets `Stopped { reason, sampled }`. The last accepted reading stays on screen; with `sampled: false` it is still `noDiagnostics`.
  - An interruption (a restart, an input going `undefined`, or the scope closing) is not a defect and never produces `Stopped`.
  - A layer that fails to build stays `WiringRead.Failed` while the other reads continue (BEH-QD-218). That case is not a stop.
- **D-04 Restart.** A stopped poll restarts when an options field changes identity, and through an explicit `restart()` command on the feed. The stopped notice, shared by every screen that reads the diagnostics (Services and Questions), offers that command as a button, so a reviewer can resume without editing props. Every restart passes through `Starting` again.
- **D-05 Tested with a throwing source under `TestClock`, with no render.** The tests cover:
  - the transition to `Stopped`;
  - the kept reading;
  - restart by a field change;
  - restart by `restart()`;
  - interruption never reported as a stop.

  Model tests run inside `it.effect` with `settleTurns` before each `adjust`, following the roadmap's planning note.

#### Lifetime across `<Activity>` and `undefined` (DIAG-05)
- **D-06 Hidden `<Activity>`: the reading does not survive, and the gap is stated.** The model is rebuilt on hide and show (ADR-QD-137), as pause and the backlog already are. The feed belongs to the model, so a rebuilt model starts at `Starting` and becomes `Live` on the first sample, which is taken immediately. The panel renders `Starting` as an explicit "waiting for the first sample" state, never as a blank.
  - Holding the reading above the scoped model is rejected, because it would give the dock a second owner and a second lifetime.
  - The behaviour is stated in the ADR-QD-047 amendment and pinned in a test that closes and rebuilds the model.
  - It is confirmed once in a real browser as a recorded human check, as in the v1.2 audit.
- **D-07 `diagnostics` going `undefined` and back.**
  - `undefined` interrupts the poll, resets the reading to the `noDiagnostics` constant and sets the status to `Off`. A stale reading never passes for a live one.
  - When the options are defined again, the poll forks, the status goes to `Starting`, and then to `Live`.
  - Both directions are pinned in model tests.

#### Where the poll starts and what restarts it (DIAG-01)
- **D-08 Start from init, forked.** `DockModelInputs` gains `diagnostics` and `reading`. `makeDockModel` forks the poll from its init inputs while it is built, through the feed's `FiberHandle` runtime.
  - The fork never blocks `useScoped`'s `Effect.runSync`.
  - The host layer builds inside the forked fiber, so an asynchronous layer works.
  - The poll starts in the same commit that today's effect did, so the roadmap's one-render delay never appears and nothing has to work around it.
- **D-09 Per-field comparison.** `configure` restarts the poll only when one of these changes identity, so an inline options literal never restarts it:
  - `layer`, `collector`, `questions` or `intervalMillis`;
  - `diagnostics` changing between defined and `undefined`.

  A change to `reading` alone recomputes the merge and never restarts the poll.
- **D-10 Nothing forks from a React effect.**
  - The hand-written deps list and its `eslint-disable` are deleted with `useRunningStore`.
  - `useDockModel` passes `diagnostics` and `reading` through the `configure` call it already makes.

#### The merged reading as a model store (DIAG-02, DIAG-03)
- **D-11 The seventh store.** The dock model exposes a `diagnostics` store whose snapshot is `{ status, reading: mergeReading(feed.reading, inputs.reading) }`.
  - The merge is computed when the feed publishes or when `reading` changes identity, and never inside `getSnapshot`.
  - With nothing supplied, `mergeReading` returns the sampled reading itself, so the identity rule still holds.
  - `DevtoolsDock` renders the store and merges nothing.
- **D-12 `DiagnosticsDockOptions` is declared in the model** (beside the feed) and re-exported from `@qadi/devtools/react` under the same name, so the import path is unchanged.
- **D-13 Public `useDiagnostics` is a thin adapter over the same feed.** It is built as `useScoped(makeDiagnosticsFeed)`, plus `configure` in the layout effect, plus the one store-snapshot hook.
  - It returns the feed snapshot `{ status, reading }`, so a standalone host sees a stopped poll too.
  - This is a **Breaking** change to its return type, recorded in the changeset and in `upgrading.md`.
  - The example `examples/nextjs-newsroom/src/client/Counters.tsx` (`const { hydration } = useDiagnostics(...)`) and the website devtools page move with it.

#### One store-snapshot hook (DIAG-04)
- **D-14 One `useStoreSnapshot(store)` hook.** It replaces the dock's snapshot hooks:
  - `useDockSnapshot`;
  - the explorer hooks;
  - `useRunningStore(store, undefined, …)` used as a plain read;
  - the diagnostics read.

  No constant-`undefined` run remains (v1.2 Phase 26 IN-01). `usePaused` reads through the same hook if it can be expressed as a store snapshot without a second subscription; otherwise it stays as the one `useSyncExternalStore` read of a non-snapshot accessor, and the reason is stated in its doc comment.
- **D-15 `useRunningStore` is deleted.** Public `useTimeline`, its last caller, is rebuilt the same way `useDiagnostics` is: a scoped timeline feed held by `useScoped`, with its source passed through `configure`.
  - Its public signature is unchanged.
  - After this, nothing in `@qadi/devtools`' React layer forks a fiber from an effect.
  - Its existing React tests (start on mount, stop on unmount, no restart on an unchanged re-render) must stay green unchanged.

#### Proof and records (DIAG-06; WX-01..07)
- **D-16 Characterisation first, then records:**
  - The phase's first commit records the mutation base, measured by `stryker.devtools.mjs`, for the touched devtools files that carry mutants. `DockModel.ts` has a base of 100, and `DiagnosticsStore.ts` and any other touched file are measured the same way.
  - Pins of today's behaviour come before any `src` change and must be green on the base: the merge's per-field precedence, the identity rule, and the poll's start, stop and no-restart-on-rerender.
  - New and moved files must keep the bar: no touched file falls below its base, and a drop is closed with a test, never by re-baselining.
  - Model tests cover start, restart, stop, merge, the four statuses, `undefined` and back, and rebuild, all under `TestClock` with no render.
  - Records: ADR-QD-047 amended (Rev 1.13), with ADR-QD-147 named Unused unless the amendment cannot carry the decision; BEH-QD-465 restated (seven stores) and BEH-QD-323 restated; BEH-QD-506..510 for the new behaviours, any unused number named Unused; INV-QD-313..314, any unused number named Unused; CCR-QD-425 with ARCH-82; traceability rows; the overview's export tables, for the new `DiagnosticsStatus` and the changed `useDiagnostics` return; the changeset (`@qadi/devtools` `minor`, with `**Breaking.**` for `useDiagnostics`); an `upgrading.md` section; the website devtools page.
  - CHANGELOG files are history and are not edited.

### Claude's Discretion
- The plan and wave split, provided D-16's characterisation commit comes first.
- Whether the feed lives in `DiagnosticsStore.ts` or a new `DiagnosticsFeed.ts`. Pick the one that keeps madge acyclic and each module's mutation score measurable.
- The exact type and file of the scoped timeline feed in D-15.
- The exact wording and layout of the `Starting` and `Stopped` notices. They follow the existing Services panel styles, and the UI contract (UI-SPEC) governs them.
- The exact wording of doc comments: a one-line summary first, ADR citations only in the paragraphs after it, and no plan or `D-NN` ids.

### Deferred Ideas (OUT OF SCOPE)
None. Rebuilding `useTimeline` on a scoped feed (D-15) is in scope because it deletes `useRunningStore` and completes ARCH-74's rule across the package.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DIAG-01 | `makeDockModel` takes `diagnostics` and `reading` through `configure`, per-field; poll on its own `FiberHandle`; nothing forked from a React effect | Q1 (the handle semantics, the `runtime` fork), Q2 (the fork is `runSync`-safe, first sample is synchronous) |
| DIAG-02 | The merge is computed in the model and exposed as a store | Q2 (what the store reads right after build), Pitfall 3 (publish ordering) |
| DIAG-03 | `useDiagnostics` is a thin adapter over the same feed | Q2 (pre-build pass returns `undefined` from `useScoped`; a placeholder is needed), Q3 |
| DIAG-04 | One store-snapshot hook, no constant-`undefined` run | Q3 (the full wrapper inventory, the `usePaused` verdict) |
| DIAG-05 | A poll defect is a visible failed state; Activity and `undefined`-and-back decided, stated, pinned | Q1 (exact shape: `Effect.onExit` + interrupts-only filter + run token), Q2 (Activity lifecycle) |
| DIAG-06 | Model tests under `TestClock`, no render | Q1 test recipe, Validation Architecture |
</phase_requirements>

## Summary

Two narrow questions, both answered from the installed `effect@4.1.2` source and confirmed by running the installed build. **A defect in a poll forked through `FiberHandle.runtime` is silent by default**: nothing propagates to the enclosing scope, nothing is logged, the handle just drops the fiber and (only for a non-interrupt failure) completes an internal deferred that only `FiberHandle.join` reads. So the feed must observe the exit itself. The one shape to use is `Effect.onExit` wrapped around `runDiagnostics` inside the forked effect, setting `Stopped` only when `Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)`, guarded by a run token so a replaced fiber can never write. Observed under `it.effect` with `TestClock`, a defect in such a fork neither logs nor fails the test.

**The fork is `runSync`-safe, and the first sample is synchronous.** `FiberHandle.runtime` forks through `Effect.runForkWith`, which evaluates the child synchronously to its first suspension and returns; the parent `runSync` only throws `AsyncFiberError` (the v4 name) if the parent itself awaits something asynchronous. A sync-building layer (or none) therefore reaches `Live` before `makeDockModel` returns; an asynchronously building layer leaves the store at `Starting`. This makes **the status must be set to `Starting` before the fork**, because the fork's synchronous prefix may already set `Live` or `Stopped`. The hidden-`<Activity>` rebuild is exactly `useScoped`'s cleanup then effect, already pinned for the model by `useSimulationSession.test.tsx:137-169`.

Two things in the plan will not be a drop-in: `useTimeline`'s public return is non-optional but `useScoped` yields `undefined` on the first pass (a placeholder is needed, and state no longer survives StrictMode's simulated remount or a hidden `<Activity>`), and `useDiagnostics`' own existing React test must be edited for the Breaking return type (only its `Probe`; the five behaviours stay).

**Primary recommendation:** Fork the poll as `runDiagnostics(markingStore, options).pipe(Effect.onExit(...))` through `FiberHandle.runtime`, bump a generation token and set `Starting` before every fork, and decide `Stopped` only from a non-interrupt failure exit of the current generation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Poll fork, status transitions, defect observation | Headless model (`packages/devtools/src/model`, scope-owned) | — | ARCH-74: the model owns fibers; the React layer forks nothing |
| Merge of sampled and supplied reading | Headless model | — | `mergeReading` is already model code (`DiagnosticsStore.ts:123-135`); only its *timing* moves |
| Scope lifetime across mount, StrictMode, `<Activity>` | React adapter (`useScoped`) | Model (closes via scope) | The adapter only opens and closes a scope; it decides nothing |
| Snapshot subscription | React adapter (`useStoreSnapshot`) | — | One `useSyncExternalStore` wrapper |
| Rendering the status notice | React view (`DiagnosticsNotice`, per UI-SPEC) | — | Renders `status`; computes nothing |

## Standard Stack

No new packages are installed by this phase. Everything is already in the lockfile.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` | 4.1.2 | `FiberHandle`, `Effect.onExit`, `Cause`, `Exit`, `Data.TaggedEnum`, `Match` | Locked by the repo; `[VERIFIED: node_modules/effect/package.json:4 "version": "4.1.2"]`, lockfile `pnpm-lock.yaml:61` pins `4.1.2(effect@4.1.2)(react@19.3.1)...` |
| `@effect/vitest` | 4.1.2 | `it.effect` (provides `TestClock`, a scope) | `[VERIFIED: node_modules/@effect/vitest/package.json:3]` |
| `vitest` | 5.1.0 | runner | `[VERIFIED: node_modules/vitest/package.json:4]` |
| `react` | 19.3.1 | `Activity`, `useSyncExternalStore` | `[VERIFIED: pnpm-lock.yaml:61]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Effect.onExit` inside the fork | `fiber.addObserver(...)` on the fiber `runtime(...)` returns | Also correct (`Fiber.ts:83` declares `addObserver` on the interface; `FiberHandle.ts:420` uses it). Rejected: the status logic then lives outside the effect it describes and needs the same run token; `onExit` keeps it in one expression |
| `Effect.onExit` | `Effect.catchCause` | Probed: a `catchCause` handler is **not run when the fiber is interrupted**, and it turns the defect into a success exit. It would work for "defect only" but hides the exit and makes D-03's interruption rule implicit rather than stated. Rejected |
| `FiberHandle.join` | — | `join` (`FiberHandle.ts:1049-1050`) waits on a deferred completed once and never reset; it cannot observe a second stop after a restart. Not usable for a restartable poll |

**Version verification:** `effect@4.1.2` confirmed from `node_modules/effect/package.json`. No `npm view` needed; nothing is added.

## Package Legitimacy Audit

No external packages are installed by this phase. **Packages removed due to [SLOP] verdict:** none. **Packages flagged as suspicious [SUS]:** none. (The `package-legitimacy` seam was not run: there is nothing to check.)

## Architecture Patterns

### System Architecture Diagram

```
host props ──► useDockModel ──useScoped──► Scope.make ─► Effect.runSync(makeDockModel(init))
 (diagnostics,                                               │
  reading,                                                   ├─ FiberHandle.make / FiberHandle.runtime  (sync)
  source, ...)                                               │
        │                                                    ├─ feed = makeDiagnosticsFeed(init.diagnostics)
        │ layout effect                                      │      bump generation; status := Starting
        └─► model.configure(inputs)  (per-field identity)    │      ┌── fork (returns at first suspension) ──┐
                                                             │      │ poll(gen) =                            │
                                                             │      │  runDiagnostics(markingStore, opts)    │
                                                             │      │   .pipe(Effect.onExit(exit =>          │
                                                             │      │      gen current AND failure AND       │
                                                             │      │      !hasInterruptsOnly ⇒ Stopped))    │
                                                             │      └────────────────────────────────────────┘
                                                             │           ▲ sample accepted ⇒ markLive (Starting→Live, sampled=true)
                                                             │
                                                             └─ diagnostics store {status, reading: mergeReading(feed.reading, inputs.reading)}
                                                                      │  publish when the feed publishes or `reading` changes identity
                                                                      ▼
                                              useStoreSnapshot(store) ─► DevtoolsDock ─► DockFrame ─► Services / Questions (+ notice)

Scope close (unmount, StrictMode's simulated unmount, hidden Activity)
  ─► FiberHandle finalizer interrupts the poll (internal id -1) ─► runDiagnostics' Effect.scoped releases the built layer
  ─► onExit sees interrupts only ─► no Stopped. useScoped has already setValue(undefined).
```

### Recommended Project Structure
```
packages/devtools/src/model/
├── DiagnosticsStore.ts      # unchanged shapes: store, runDiagnostics, mergeReading, noDiagnostics
├── DiagnosticsFeed.ts       # NEW (recommended): DiagnosticsStatus, DiagnosticsDockOptions, makeDiagnosticsFeed
└── DockModel.ts             # seventh store; forks via the feed
packages/devtools/src/react/
├── useStoreSnapshot.ts      # NEW: the one snapshot hook (replaces useRunningStore's read half)
├── useScoped.ts             # unchanged
└── (useRunningStore.ts deleted)
```
A separate `DiagnosticsFeed.ts` is recommended over growing `DiagnosticsStore.ts`: the feed imports `DiagnosticsStore.ts` (`runDiagnostics`, `mergeReading`, `noDiagnostics`), so putting it in the same file adds no cycle, but a separate file keeps each module's Stryker score separately measurable (D-16). `[ASSUMED]` that this also keeps madge acyclic: the dependency direction is `DockModel → DiagnosticsFeed → DiagnosticsStore`, one way.

### Pattern 1: Poll forked on a handle, exit observed inside the fork

**What:** one expression, forked through the existing `FiberHandle.runtime` pattern from `DockModel.ts:117-121`.
**When to use:** every (re)start of the poll: init, per-field change, `restart()`, `undefined` to defined.

```typescript
// Source: composed from node_modules/effect/src (see line cites); house rules: no `as`, Match not switch.
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberHandle from "effect/FiberHandle";

export type DiagnosticsStatus = Data.TaggedEnum<{
  Off: {};
  Starting: {};
  Live: {};
  Stopped: { readonly reason: string; readonly sampled: boolean };
}>;
export const DiagnosticsStatus = Data.taggedEnum<DiagnosticsStatus>();
// (same two-line shape as WiringRead, DiagnosticsStore.ts:58-67)

// inside makeDiagnosticsFeed (an Effect.fn returning Effect.fn.Return<..., never, Scope.Scope>):
const handle = yield* FiberHandle.make<void>();           // FiberHandle.ts:152
const fork = yield* FiberHandle.runtime(handle)<never>(); // FiberHandle.ts:901-943

let generation = 0;
const start = (options: DiagnosticsOptions) => {
  generation += 1;
  const mine = generation;
  setStatus(DiagnosticsStatus.Starting());         // BEFORE the fork: the fork's sync prefix may reach Live or Stopped
  const marking: DiagnosticsStore = {
    ...store,
    accept: (reading) => {
      if (mine !== generation) return;
      store.accept(reading);
      markLive();                                   // Starting -> Live, sampled = true; also a no-op if already Live
    },
  };
  fork(
    runDiagnostics(marking, options).pipe(
      Effect.onExit((exit) =>                       // Effect.ts:14232
        Effect.sync(() => {
          if (mine !== generation) return;
          if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
            setStatus(DiagnosticsStatus.Stopped({ reason: Cause.pretty(exit.cause), sampled: wasLive() }));
          }
        }),
      ),
    ),
  );
};
const off = () => {
  generation += 1;                                  // any late onExit of the old run is now ignored
  fork(Effect.void);                                // replaces (interrupts) the old poll synchronously
  setSnapshot(DiagnosticsStatus.Off(), noDiagnostics);
};
```

Three details the plan must keep:
- `markLive` must not rely on the store's notify. `accept` returns early when no field changed (`DiagnosticsStore.ts:168-176`), so "the first accepted sample" has to be marked by the wrapper, not inferred from a `subscribe` callback. (Today the first sample always differs because `hydration` goes `undefined` to defined, but that is an accident, not a contract.)
- Replacing is `fork(newEffect)` on the same handle: `runtime` runs the new fiber first, then `setUnsafe` interrupts the previous (`FiberHandle.ts:938-939`, `416-419`). The previous fiber's `onExit` therefore runs after the new fiber's synchronous prefix; the run token is what stops it from touching the status.
- Going to `Off` (D-07) must interrupt synchronously from `configure`, and both `FiberHandle.clear` (`FiberHandle.ts:668-682`) and `Fiber.interrupt` are `Effect`s, not callable there. Use replacement by an effect that ends at once: `generation += 1`, `fork(Effect.void)`, then publish `Off` with the reading reset to `noDiagnostics`. The fork interrupts the previous fiber through `setUnsafe` (`FiberHandle.ts:419`) and the handle empties when the no-op completes (`FiberHandle.ts:421-426`). `DockModel.ts:119-120` does the same for a vanished source (`source ?? NO_SOURCE`). `[VERIFIED: FiberHandle.ts:416-426, DockModel.ts:119-121]`; the `Off` transition itself was not probed.

### Pattern 2: Test the feed under `it.effect` with `TestClock` (no render)

```typescript
// Mirrors packages/devtools/test/model/DiagnosticsStore.test.ts:143-155 and DockModel.test.ts:100.
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as TestClock from "effect/testing/TestClock";

// There is no settleTurns in packages/devtools today: the only one in the repo is
// packages/core/test/SharedComputation.test.ts:20-22. Put a copy in packages/devtools/test/helpers.ts.
export const settleTurns = Effect.gen(function* () {
  for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
});

it.effect("a throwing questions source stops the poll and keeps the last reading", () =>
  Effect.gen(function* () {
    let reads = 0;
    const seen: Array<string> = [];
    const feed = yield* makeDiagnosticsFeed();                  // it.effect provides the Scope
    feed.subscribe(() => seen.push(feed.getSnapshot().status._tag));
    feed.configure({
      questions: () => {
        reads += 1;
        if (reads === 3) throw new Error("questions blew up");  // a defect: Effect.sync(thunk) dies
        return [];
      },
    });
    assert.deepStrictEqual(seen, ["Starting", "Live"]);         // first sample is synchronous (see Q2)
    yield* settleTurns;
    yield* TestClock.adjust("2 seconds");                       // read 2
    yield* settleTurns;
    const before = feed.getSnapshot().reading;
    yield* TestClock.adjust("2 seconds");                       // read 3 throws
    const status = feed.getSnapshot().status;
    assert.strictEqual(status._tag, "Stopped");
    assert.isTrue(status._tag === "Stopped" && status.sampled);
    assert.isTrue(status._tag === "Stopped" && status.reason.includes("questions blew up"));
    assert.strictEqual(feed.getSnapshot().reading, before);     // kept, same identity
    yield* TestClock.adjust("20 seconds");
    assert.strictEqual(reads, 3);                               // no further sampling after the stop
  }));
```

Recording `seen` through a subscriber is deliberate: with a synchronous first sample, `Starting` and `Live` are both published inside one tick, so an end-state assertion alone cannot prove "every restart passes through `Starting`" (D-04).

### Anti-Patterns to Avoid
- **Setting `Starting` after the fork.** The fork has already run to its first suspension; you would overwrite `Live` (or `Stopped`) with `Starting` and freeze it there. Verified: my probe printed `["after fork","Live"]` with the status set first.
- **Treating any non-success exit as a stop.** A replaced or scope-closed fiber exits with an interrupt cause; only `Cause.hasInterruptsOnly` separates it from a defect.
- **Reading `FiberHandle.join`/`awaitEmpty` for the stop signal.** See Alternatives.
- **Computing the merge in `getSnapshot`** (roadmap note). Compute it on publish.
- **`yield*`-ing anything that waits inside `makeDockModel`'s body** (see Pitfall 2).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One-fiber-at-a-time replacement and scope-close interruption | a mutable `Fiber` ref with manual interrupt | `FiberHandle.make` + `FiberHandle.runtime` (already used at `DockModel.ts:117-118`) | Replacement installs the new fiber before interrupting the old one so a finalizer cannot re-enter (`FiberHandle.ts:416-419`); the close finalizer interrupts with the internal id (`FiberHandle.ts:152-161`) |
| Telling an interrupt from a defect | inspecting `cause.reasons` or `_tag` strings | `Cause.hasInterruptsOnly` (`Cause.ts:648`) | `internal/effect.ts:247-248`: `reasons.length > 0 && every(isInterruptReason)`, so a mixed die-plus-interrupt cause reads as a defect |
| Rendering the cause | `String(error)` | `Cause.pretty` (`Cause.ts:1281`) | D-02 names it; multi-line, starts `Error: <message>` followed by stack frames (probed) |
| Status union dispatch | `switch (status._tag)` | `Data.taggedEnum` + `Match.tagsExhaustive` | House rule (AGENTS.md §5a, §6) |

**Key insight:** every piece of this is already a one-liner in the codebase's own idiom (`WiringRead`, `readSource`, `useScoped`); the only invention is the run token and the `markLive` wrapper.

## Common Pitfalls

### Pitfall 1: A replaced fiber writes after its replacement started
**What goes wrong:** the previous poll's `onExit` runs after the new fiber's synchronous prefix (the new fiber is forked and evaluated first, then the old one is interrupted: `FiberHandle.ts:938-939`, `416-419`). If the old fiber's cause is not purely an interrupt (for example a finalizer defect while its layer is being released inside `Effect.scoped`), `hasInterruptsOnly` is false and the old fiber would stamp `Stopped` over the new run's `Starting`/`Live`.
**How to avoid:** the generation token in Pattern 1, checked in `onExit` and in the marking `accept`.
**Warning signs:** a restart test that ends at `Stopped` although the new source is healthy.

### Pitfall 2: `AsyncFiberError` out of `useScoped`
**What goes wrong:** `useScoped` does `Effect.runSync(Scope.provide(make(), scope))` (`useScoped.ts:28`). `runSyncExitWith` returns `exitDie(new AsyncFiberError(fiber))` whenever the *parent* fiber has not finished after the sync dispatcher flush (`internal/effect.ts:5864-5877`; class at `6520`). `useScoped` then closes the scope and rethrows (`useScoped.ts:29-33`), so the whole dock errors.
**Probed against the installed build** (`runSync`):
- `Effect.yieldNow` in the init body: returns fine.
- `Effect.sleep(10)` in the init body: **throws** `AsyncFiberError`.
- Forking `Effect.sleep(10)` and returning: fine.
- `Fiber.await` of that fork: **throws**.

So forking the poll through `FiberHandle.runtime` cannot throw, however slowly the host layer builds, because `Layer.build` (`DiagnosticsStore.ts:253`) is reached only inside `runDiagnostics`, which runs in the forked fiber. The only ways to throw are the init body itself awaiting (`Fiber.await`, `FiberHandle.join`/`awaitEmpty`, `Deferred.await`, `Effect.sleep`) or a fork whose parent context is not the `runSync` one.
**How to avoid:** no waiting in `makeDockModel`/`makeDiagnosticsFeed`; forking and `FiberHandle.make`/`runtime` only. The existing source fork (`DockModel.ts:121`) already runs under the same constraint, so there is precedent.

### Pitfall 3: Publishing the status and the reading as two events
**What goes wrong:** `{ status, reading: mergeReading(...) }` is one snapshot. If the feed publishes a new reading and a new status in two separate `set` calls, subscribers see an intermediate snapshot (new reading, old status), and the "sampled is true exactly when a reading was accepted" invariant has a visible gap.
**How to avoid:** one publish per transition; build the combined snapshot in one place and `publish` once per event (`ExternalStore.publish` at `ExternalStore.ts:51-54` notifies unconditionally; `set` at `46-50` only on a changed reference). Mark `Live` and accept the reading in the same publish.

### Pitfall 4: The forked fiber runs on `runSync`'s scheduler
`runSyncExitWith` passes `new Scheduler.MixedScheduler("sync")` (`internal/effect.ts:5872`); `FiberHandle.runtime` captures `Effect.context()` (`FiberHandle.ts:919-921`) and forks with it. Probed: `Context.get(ctx, Scheduler.Scheduler).executionMode` inside `runSync` is `"sync"`. A sync scheduler's `setImmediate` is `setMicrotask` (`Scheduler.ts:185`), so the poll's yields resume on microtasks, not macrotasks. Real `Effect.sleep` timers are unaffected. `readSource` has always had this property, so nothing new; it is noted so nobody is surprised.

### Pitfall 5: `Cause.pretty` is multi-line with stack frames
`Error: questions blew up` is the first line (probed), then `at ...` frames with absolute paths. A test asserts `reason.includes(message)`, never equality. UI-SPEC already treats the reason as a pre-wrapped block; the stack is a (dev-tool) path disclosure, see Security Domain.

## Code Examples

### Q1 summary: what the installed source says

| Question | Answer | Evidence |
|---|---|---|
| Defaults | `propagateInterruption` undefined (falsy); `onlyIfMissing` undefined (replace); `startImmediately` default `true` (applies to `FiberHandle.run` only, not `runtime`) | `FiberHandle.ts:429-433`, `410`, `835-852`, `922-941` |
| A fiber ends with a die | The fiber is removed from the handle (`FiberHandle.ts:421-426`); the handle's internal `deferred` is completed with the exit (`:427-436`, condition `Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)` under the default). Nothing is interrupted, nothing is thrown, the enclosing scope is untouched | `FiberHandle.ts:420-437` |
| Who can see that deferred | Only `FiberHandle.join` (`:1049-1050`) and the close path; `awaitEmpty` (`:1079-1084`) waits on the *current fiber* and fails with its failure | same |
| `propagateInterruption: true` | switches the filter to `!isInternalInterruption(cause)`: the deferred then completes on an *external* interruption too; replacement and scope close (id `-1`) still do not | `FiberHandle.ts:272-276`, `429-433` |
| Replacement | `previous.interruptUnsafe(internalFiberId)` after the new fiber is installed; the old exit is an interrupt cause, `Cause.hasInterruptsOnly` is `true` (probed: `A-async-then-die`, `B-never`, `C-replaces-B` each printed `interruptsOnly: true, dies: false`) | `FiberHandle.ts:416-419`; probe |
| Closed handle | `runtime`'s fork returns a constant interrupted fiber and never runs the effect | `FiberHandle.ts:933-934` |
| Scope close | finalizer marks the handle `Closed` and `Fiber.interruptAllAs(fibers, -1)` | `FiberHandle.ts:152-161` |
| Is a defect logged? | No. `FiberImpl.evaluate` just calls the observers (`internal/effect.ts:654-660`); `UnhandledLogLevel` is read only by `ignore`'s logger (`internal/effect.ts:3506-3512`), default `"Error"` (`internal/references.ts:61-64`) | probed: stderr empty, process exit 0 |
| Does it fail an `it.effect` test? | No. `@effect/vitest` only logs/rethrows the *test fiber's own* failure | `node_modules/@effect/vitest/src/internal/internal.ts:23-41`; probe |
| Names that exist | `Effect.onExit` `Effect.ts:14232`; `Effect.exit` `Effect.ts:3916`; `Effect.catchCause` `Effect.ts:5726`; `Effect.repeat` `Effect.ts:15709`; `Cause.hasInterruptsOnly` `Cause.ts:648`; `Cause.hasDies` `Cause.ts:1023`; `Cause.pretty` `Cause.ts:1281`; `Exit.isFailure` `Exit.ts:435`; `Fiber.addObserver` (interface) `Fiber.ts:83`; `FiberHandle.{make,runtime,run,clear,join,awaitEmpty,setUnsafe}` at `152,901,731,668,1049,1079,311` | grep this session |

### Q2: first sample, and what the store reads right after the build

Probed with the shape of Pattern 1 under `runPromise` + `TestClock.layer()`:

```
["after fork","Live"], ["t=2s","Live",2], "Error: questions blew up",
["t=4s (3rd read throws)","Stopped",3,true], ["t=14s no more reads",3],
["restart","Live"], ["restart again (interrupt of previous must not Stop)","Live"]
```

- **First sample: synchronous**, during the fork, when there is no layer or the layer builds synchronously and the samples are synchronous. `runForkWith` calls `fiber.evaluate(effect)` before returning (`internal/effect.ts:5751-5756`). The existing tests rely on the same thing: `DiagnosticsStore.test.ts:146-147` asserts `state.reads === 1` straight after `start`, and `:225-235` reads `store.getSnapshot()` with no yield.
- So the model's `diagnostics` store reads **`Live` immediately after build** in the common (sync) case, and **`Starting`** when the host layer builds asynchronously (until `TestClock.adjust` or real time lets `Layer.build` finish), and **`Stopped { sampled: false }`** if the very first sample dies. `Starting` is still *published* before `Live` (set it before forking), but React batches, so a sync build never paints a `Starting` frame.
- The scheduler turn is not needed for the sync path (probe ran identically with and without `settleTurns`; `TestClock.adjust` itself starts with `Fiber.await(forkChild(yieldNow))`, `TestClock.ts:465`). `settleTurns` is still the project convention and is genuinely needed when the layer yields.

### Q2: `useScoped` lifecycle across a hidden `<Activity>`

Confirmed from `useScoped.ts:21-46`:
1. mount: layout effect creates a scope (`:22`), builds under `Effect.runSync(Scope.provide(make(), scope))` (`:28`), `setValue(() => built)` (`:35`);
2. hide / StrictMode's simulated unmount: cleanup runs `setValue(undefined)` (`:41`, which unmounts every child that read the value) then `close()` = `Effect.runFork(Scope.close(scope, Exit.void))` (`:23-25`, `:42`), which runs `FiberHandle.make`'s finalizer (interrupts the poll, `FiberHandle.ts:152-161`) and then the `Effect.scoped` inside `runDiagnostics` (`DiagnosticsStore.ts:218`) releases the layer;
3. show / the second StrictMode pass: the effect runs again with the first render's `make` (deps `[]`, `:46`), builds a fresh model, `setValue` mounts the children again.

Already pinned for the model identity by `useSimulationSession.test.tsx:137-169` (`Activity` hide then show yields `owned !== first` and a child that re-reads the new one). The diagnostics-specific pin (D-06) is therefore: a model test that closes the model's scope and builds a second one, asserting `Starting`/`Live` fresh and `noDiagnostics` before the first sample (async layer variant makes `Starting` observable), and optionally one React test copying `:137-169` against `DevtoolsDock` with `diagnostics`.

Where the poll starts: `useDockModel` captures the inputs in the first render's `make` closure (`useDockModel.ts:39`); a prop that changed between first render and the layout effect is caught by the `configure` layout effect, which re-runs on the render the model appears (`:43-45`, comment on `:41-42`). Adding `diagnostics` and `reading` to both is mechanical. Because `configure` compares per field, the second `configure` with an inline literal restarts nothing.

### Q2: React tests that touch these hooks, and what they depend on

| Test | What it pins | Depends on `useRunningStore`? | Survives D-13/D-15? |
|---|---|---|---|
| `test/react/useDiagnostics.test.tsx` (5 tests) | fills after mount (`vi.waitFor`, `:43-49`); `undefined` options start nothing (`:51-60`); layer finalizer on unmount (`:62-77`); fresh equal literal does not restart (`:79-107`, builds stays 1); replacing the layer restarts (`:109-121`) | Indirectly (it renders the hook that uses it); no direct import | The five behaviours survive. The `Probe` (`:32-40`) reads `diagnostics.hydration` and `diagnostics.wiring`; with D-13's `{status, reading}` return it must read `.reading.hydration`/`.reading.wiring`. That edit is forced by the Breaking change, not a behaviour change. Add `status` assertions (`Off` for `undefined`) |
| `test/react/useTimeline.test.tsx` `useTimeline` (2 tests) | rows appear (`:41-52`, `findByText`); SSE connection `close` count goes to 1 on unmount (`:60-96`, `waitFor`) | Yes: the two `useTimeline` cases are the last `useRunningStore` consumer | Both stay green: they `await` the rows, and unmount goes through `Scope.close` which interrupts `runSource`'s `Effect.scoped` (`TimelineStore.ts:96-103`) |
| `useTimelineStore` tests (`:125-150`) | manual store | No | untouched |
| `test/react/DevtoolsDock.test.tsx:1060-1210` ("diagnostics") | each does `await act(async () => {})` then clicks a tab and `findBy*` | Indirectly | Stay green; with a sync-first-sample the reading is there earlier, never later |
| `useSimulationSession.test.tsx:74-106` | StrictMode double mount, model keeps a run alive | No | The pattern to copy for a StrictMode diagnostics test |

No test in the repo renders a StrictMode or `Activity` tree against `useDiagnostics` or `useTimeline` today (grep of `packages/devtools/test` for `StrictMode`/`Activity` finds only `useSimulationSession.test.tsx`), so the behavioural changes below are not caught by any existing test, in either direction.

### Q2: behaviours that change when `useTimeline` (D-15) and `useDiagnostics` (D-13) move onto `useScoped`

1. **A first pass with no value.** `useScoped` returns `undefined` until the layout effect has built (`useScoped.ts:18-19`, `:35`). `useTimeline` returns a non-optional `UseTimeline` (`useTimeline.ts:22-29`, `39-42`) and today has a store on its first render (`useMemo`, `:44-47`). To keep the signature unchanged the hook must return an inert placeholder on that pass (an empty timeline, `paused: false`, no-op commands, and a `store` that is a constant inert `TimelineStore`; a shared inert one is safe, a shared *live* `makeTimelineStore()` at module scope is not: a caller can `store.accept` into it, `useTimeline.ts:27` "exposed so a screen can drive the store directly"). Same for `useDiagnostics`: a constant placeholder snapshot (`options === undefined ? Off : Starting` with `noDiagnostics`) so the identity rule holds.
2. **`store` identity is no longer stable for the component's life.** Today it changes only with `capacity` (`useMemo([capacity])`). After: placeholder to feed, and a fresh feed after every StrictMode simulated remount or hidden-then-shown `Activity`.
3. **State no longer survives a remount.** Today the `useMemo` store (and `useState` store in `useDiagnostics`) lives across StrictMode's simulated unmount and across an `Activity` hide: timeline rows, the `paused` flag, and the last diagnostics reading are kept, only the fiber is interrupted and restarted. After: all of it resets and the source is re-read (backlog sources re-fill; a purely live stream loses its rows; `paused` returns to `false`). This is D-06's decision extended to the two public hooks; it should be stated in the ADR-QD-047 amendment and in `upgrading.md`, because it is observable to a standalone host and untested today.
4. **Layer-build counts under StrictMode are unchanged** (today: effect, cleanup, effect gives builds 2, releases 1; after: scope, close, scope gives the same), but the poll now starts in a layout effect (before paint) rather than a passive effect (after paint).
5. **Capacity change.** `DockModel` keeps one stable `timeline` store across capacity (`DockModel.ts:108-115`, `134-140`); today's `useTimeline` makes a new store per capacity. The plan must choose which the scoped timeline feed does; mirroring `DockModel` is the cleaner answer and is a (documented) behaviour change for `useTimeline`'s `store` identity. `[ASSUMED]` that no consumer depends on the per-capacity identity; grep of `examples/` and `packages/` found no `store` identity use.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `AsyncFiberException` | `Cause.AsyncFiberError` (`class AsyncFiberError extends TaggedError("AsyncFiberError")`, `internal/effect.ts:6520`), returned as a die from `runSyncExit` (`:5876`), thrown by `runSync` as the squashed cause (`:5883-5889`) | v4 | Match on `Cause.isAsyncFiberError` (`:6515`), not an old exception name |
| `Effect.either` / `catchAll` | `Effect.result`, `Effect.exit`, `Effect.catchCause` | v4 | House rule bans `Effect.either`; use `Effect.exit` for the exit-shaped read |

**Deprecated/outdated:** nothing in this phase relies on a deprecated API.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `DockModel → DiagnosticsFeed → DiagnosticsStore` is acyclic (madge was not run) | Architecture | A cycle fails `pnpm circular`; trivially fixed by moving a type |
| A2 | No consumer depends on `useTimeline`'s per-capacity `store` identity | Q2 point 5 | A host re-creating on capacity might see its manual `store.accept` calls hit a stable store instead; low |
| A3 | React 19.3.1's `Activity` runs layout-effect cleanups on hide and re-runs them on show | Q2 lifecycle | Evidenced by the existing passing test `useSimulationSession.test.tsx:137-169` (run green this session), but React's own docs were not consulted |
| A4 | A shared inert placeholder store for `useTimeline`'s first pass is acceptable | Q2 point 1 | A different placeholder strategy changes nothing else; the plan owns it |

## Open Questions

1. **What does `useTimeline` return on the pass before its feed exists?**
   - Known: `useScoped` yields `undefined` first; the public return is non-optional; D-15 says the signature is unchanged.
   - Unclear: the placeholder's exact shape (inert store vs. a lazily-created real store, which brings back two stores).
   - Recommendation: constant inert `TimelineStore` (no-op `accept`/`clear`/`setPaused`, `emptyTimeline()` snapshot, `isPaused` false) at module scope.
2. **`useDiagnostics`' pre-build status** — `Off` when `options === undefined`, `Starting` otherwise (recommended, truthful and cheap).
3. **Should the stopped fiber's `reason` be capped in length?** `Cause.pretty` can be long; UI-SPEC treats it as a block. Out of scope for research; flag for the plan.

## Environment Availability

Code-only phase; no external services. Probed: `node`, `pnpm`, and `pnpm vitest run --project devtools <files>` all work (4 files, 41 tests green on the base this session, 517 ms). Playwright is not needed here (the D-06 browser check is a recorded human step).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 with `@effect/vitest` 4.1.2 (`it.effect` gives `TestClock` and a scope); React Testing Library for `test/react` |
| Config file | `packages/devtools/vitest.config.ts` (project name `devtools`, `happy-dom`, `include: test/**/*.test.ts(x)`, setup `test/setupTests.ts`) |
| Quick run command | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.test.ts` |
| Full suite command | `pnpm vitest run --project devtools` (merge gate is `pnpm check`; mutation is `stryker run stryker.devtools.mjs`) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIAG-01 | per-field `configure`: an inline literal never restarts; a changed `layer`/`collector`/`questions`/`intervalMillis` or defined/`undefined` flip does; `reading` alone never restarts; poll forked from init | model, `TestClock` | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.test.ts` | Wave 0 (new) |
| DIAG-01 | the init fork does not block `runSync`, async layer builds (`Layer.effectDiscard(Effect.sleep)` leaves `Starting` until `adjust`) | model | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | extend existing |
| DIAG-02 | the seventh store: `{status, reading: mergeReading(...)}` published on feed publish or `reading` identity change; identity kept when nothing supplied; never merged in `getSnapshot` | model | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | extend existing |
| DIAG-02 | merge per-field precedence and identity (characterisation, green on the base) | model | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsStore.test.ts` | exists (`:302+`) |
| DIAG-03 | `useDiagnostics` returns `{status, reading}`; `undefined` gives `Off`; one poll (builds stays 1 on an equal re-render); finalizer on unmount; layer replacement restarts | React | `pnpm vitest run --project devtools packages/devtools/test/react/useDiagnostics.test.tsx` | exists; `Probe` edit only |
| DIAG-04 | one `useStoreSnapshot`; no `useRunningStore` import left | static + React | `pnpm vitest run --project devtools packages/devtools/test/surface.test.ts` plus a grep gate in the plan | exists / add grep step |
| DIAG-05 | throwing `questions`: `Stopped{sampled:true}`, kept reading identity, no more reads; first-sample throw: `Stopped{sampled:false}` and `noDiagnostics`; interruption (restart, `undefined`, scope close) never `Stopped`; restart by field change and by `restart()` passes through `Starting` (record transitions via `subscribe`); `undefined` resets to `noDiagnostics`+`Off`, defined again goes `Starting` then `Live`; layer build failure stays `WiringRead.Failed` and status is not `Stopped` | model, `TestClock` | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.test.ts` | Wave 0 (new) |
| DIAG-05 | hidden `<Activity>`/rebuild: close the scope, build again, fresh `Starting`/`Live`, reading blank before the first sample | model + one React | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts packages/devtools/test/react/useSimulationSession.test.tsx` | extend; copy `:137-169` |
| DIAG-06 | all of the above under `TestClock` with no render; `DockModel.ts` mutation score stays at its base (100) | mutation | `pnpm exec stryker run stryker.devtools.mjs` (CI-length; per phase, not per commit) | gate |
| D-15 | `useTimeline` stays green unchanged (start on mount, close on unmount) | React | `pnpm vitest run --project devtools packages/devtools/test/react/useTimeline.test.tsx` | exists |

### Sampling Rate (Nyquist)
The poll is a discrete-event system: its observable events are status transitions and sample ticks at the schedule period. A test must sample **at least once between every pair of events it distinguishes**, or it aliases (for example `Starting` and `Live` both fire inside one synchronous tick, so only a `subscribe`-recorded sequence resolves them, not an end-state read). Concretely: step `TestClock` at the interval boundary (`1999 ms` then `1 ms`, the existing idiom at `DiagnosticsStore.test.ts:148-150`) so an off-by-one on the cadence is visible; assert after **each** `adjust`, not only the last; and run the stop test across at least `interval x 3` so "no further sampling after a stop" is observed over a window longer than the period.
- **Per task commit:** the single new/edited test file with `pnpm vitest run --project devtools <file>`
- **Per wave merge:** `pnpm vitest run --project devtools`
- **Phase gate:** `pnpm check:pr` green; `stryker run stryker.devtools.mjs` compared to the D-16 base before verify-work

### Wave 0 Gaps
- [ ] `packages/devtools/test/model/DiagnosticsFeed.test.ts`, covering DIAG-01/02/05/06
- [ ] `settleTurns` in `packages/devtools/test/helpers.ts` (none in devtools; the only copy is `packages/core/test/SharedComputation.test.ts:20-22`)
- [ ] characterisation pins (merge precedence and identity already exist; add: poll starts/stops/no-restart on today's `useDiagnostics`, green before any `src` change per D-16)
- [ ] `packages/devtools/test/react/useStoreSnapshot` coverage via the existing screens' tests (no new file needed)

## Security Domain

`security_enforcement` is enabled (`.planning/config.json`, ASVS level 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | no authorization decision is touched |
| V5 Input Validation | partly | the supplied `reading` and the stopped `reason` are rendered as React text children (auto-escaped); never `dangerouslySetInnerHTML` |
| V6 Cryptography | no | — |
| V7 Error handling and logging | yes | the defect is surfaced in-panel instead of being swallowed; no `console.*` (AGENTS.md §6, `no-ambient-console`) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stack-trace disclosure through `Cause.pretty` (absolute file paths, internals) shown in the panel | Information disclosure | The dock is a developer tool a host mounts deliberately (opt-in `diagnostics`); render as text only, and keep the `reason` out of anything that crosses a trust boundary (it is in the model snapshot, never in a `SinkRecord` or HTTP body) |
| A stale reading passing for live after the source went away | Spoofing (of freshness) | D-07 (reset to `noDiagnostics` and `Off`), D-02 `sampled` |
| A swallowed defect hiding that the panel is frozen | Repudiation / integrity of what the reviewer sees | `Stopped` status, restart control |

## Sources

### Primary (HIGH confidence)
- `node_modules/effect/src/FiberHandle.ts` (read in full for `make`, `setUnsafe`, `run`, `runtime`, `clear`, `join`, `awaitEmpty`) `[VERIFIED]`
- `node_modules/effect/src/internal/effect.ts` (`FiberImpl`, `runForkWith`, `runSyncExitWith`, `hasInterruptsOnly`, `ignoreCauseLogger`) `[VERIFIED]`
- `node_modules/effect/src/{Cause,Exit,Fiber,Scheduler,References}.ts`, `testing/TestClock.ts`, `internal/references.ts` `[VERIFIED]`
- `node_modules/@effect/vitest/src/internal/internal.ts:23-41` `[VERIFIED]`
- Repo files read this session: `DockModel.ts`, `DiagnosticsStore.ts`, `TimelineStore.ts`, `ExternalStore.ts`, `useScoped.ts`, `useRunningStore.ts`, `useDiagnostics.ts`, `useTimeline.ts`, `useDockModel.ts`, `useDockSession.ts`, `useExplorerSession.ts`, `useSimulationSession.ts`, `DevtoolsDock.tsx:100-260`, and the test files cited
- Behavioural probes: throwaway scripts under the session scratchpad, importing `effect/dist` by absolute path (no repo file created or modified)

### Secondary / Tertiary
- None. React's own `Activity` documentation was not consulted (A3).

## Q3 (small): one store-snapshot hook

**Every wrapper of `useSyncExternalStore` in `packages/devtools/src/react`** (grep `useSyncExternalStore|useRunningStore`):

| Site | Reads | Goes through `useRunningStore`? |
|---|---|---|
| `useRunningStore.ts:41` | `store.getSnapshot` | is the wrapper |
| `useDockSession.ts:14-15` `useDockSnapshot` | `DockSession.getSnapshot` | yes, `(session, undefined, [session])` |
| `useExplorerSession.ts:15-16` `useExplorerSnapshot` | `ExplorerSession.getSnapshot` | yes, constant-`undefined` run |
| `useExplorerSession.ts:19-20` `useHeldChoiceSnapshot` | `HeldChoiceStore.getSnapshot` | yes, constant-`undefined` run |
| `useDiagnostics.ts:85` | `DiagnosticsStore.getSnapshot` | yes, with a run |
| `useTimeline.ts:52` | `TimelineStore.getSnapshot` | yes, with a run (the last real run) |
| `useTimeline.ts:53` | `store.isPaused` | no, direct |
| `useTimeline.ts:71` (`useTimelineStore`) | `store.getSnapshot` | no, direct |
| `useTimeline.ts:72` (`useTimelineStore`) | `store.isPaused` | no, direct |
| `useDockModel.ts:51-52` `usePaused` | `timeline.isPaused` | no, direct |
| `useSimulationSession.ts:34` `useSimulationSnapshot` | `session.getSnapshot` | no, direct |
| `useSimulationSession.ts:41-44` `useSnapshotOf` | `session?.getSnapshot()` with a `noSubscription` fallback | no, direct, tolerant of an absent session |

**Can `usePaused` go through `useStoreSnapshot` without a second subscription? Yes mechanically, and that is the recommendation.** `getSnapshot` cannot carry it: `TimelineStore.setPaused` publishes the *same* timeline reference (`frozen = paused ? timeline : undefined; view.publish(frozen ?? timeline)`, `TimelineStore.ts:69-75`), so the snapshot is indistinguishable before and after a pause; the pause is only in `isPaused()` (`:77`), and `publish` exists precisely so a second hook hears of it (`:72-73`, `ExternalStore.ts:51-54`). But `useSyncExternalStore` only needs a `subscribe` and a read function, and `timeline.subscribe` is the same stable function either way (`DockModel.ts:109`), so one subscription per hook is unchanged:

```typescript
// useStoreSnapshot.ts: the hook takes the minimal shape, so a narrower store qualifies.
export const useStoreSnapshot = <A>(store: {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => A;
}): A => useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

// usePaused: a view of the same store, no second subscription mechanism, no change to TimelineStore:
export const usePaused = (timeline: TimelineStore): boolean =>
  useStoreSnapshot({ subscribe: timeline.subscribe, getSnapshot: timeline.isPaused });
```

The throwaway object literal is harmless: `useSyncExternalStore` re-subscribes only when the `subscribe` function identity changes, and it does not. This also lets `useTimeline` and `useTimelineStore` express `paused` and `timeline` through the same one hook. Do **not** change `TimelineStore.getSnapshot` to carry `paused` (it is a public type, `src/index.ts:130-131`, and `useTimeline`'s `store` is public). `useSnapshotOf`'s tolerance of an absent session is a different concern (a pre-build `undefined`) and is not part of D-14's list; leave it, or fold it after the plan decides the pre-build placeholder (Open Question 1).

## Project Constraints (from CLAUDE.md)

From `CLAUDE.md` which includes `AGENTS.md`; treated as locked:
- Effect v4 only; **submodule namespace imports** (`import * as Effect from "effect/Effect"`); relative imports carry `.ts`; `import type` for type-only (verbatimModuleSyntax).
- Services are `Context.Service` with a separately exported `…Shape` interface; layers are top-level consts, never `static layer`; fail-closed defaults named for their answer (`…None`/`…Never`/`…Unknown`).
- Errors are `Data.TaggedError`; **array-form `Effect.catchTag`**, never `catchTags({...})`; never `Effect.orDie` in evaluation/enforcement paths.
- Every effectful function is `Effect.fn(...)`; **`Effect.fnUntraced` only on the three budgeted `Walk.ts` functions** (the budget fails both directions): do not add one.
- Dispatch on `_tag` with `Match` (`Match.tagsExhaustive`), **never `switch`** (budgeted exceptions are fixed). `DiagnosticsStatus` is dispatched with `Match`.
- Forbidden: `async`/`await`, `new Promise`, `.then`, `node:fs` imports, `Date.now()`/`new Date()`, `performance.now()`, `crypto.randomUUID()`, `console.*`/`process.env` (no-ambient-console), `Effect.either`/`effect/Either`, `as`, `as any`, `!`, `any`. Sync CPU-only work is wrapped in `Effect.sync`.
- Domain types are hand-written interfaces unless a trust boundary is crossed (the status enum is not one).
- Barrels: `@qadi/devtools` uses named exports, no `export *` (`devtools-named-barrel`); package-private means **out of the barrel**; adding a public name is a line in `react/index.ts`, a row in `spec/overview.md`, and a line in `test/surface.test.ts` (gate 13).
- Tests: `@effect/vitest`, `it.effect`, `TestClock`; devtools is held at 90% coverage; every behaviour in `spec/behaviors/` has tests; **`spec/` is normative** and public-behaviour changes update the behaviour doc, invariant and traceability in the same change; TypeScript fences in `spec/` are type-checked (`typescript` fences must compile).
- `@qadi/react` rules (decisions only in atoms, no React state for decisions, no DOM API in `@qadi/react`) are not touched, but the dock's own rule (ARCH-74: React adapters decide nothing and fork nothing) is the point of this phase.
- Doc comments: a one-line summary first, the why and ADR/CCR citations in the paragraphs after; no plan or `D-NN` ids (CONTEXT, Claude's Discretion).
- A placeholder id (`ADR-QD-NEXT`...) in source, tests or titles is refused; reserve numbers with `scripts/next-id.mjs`.
- Merge gate is `pnpm check` only; `pnpm check:pr` skips mutation. `pnpm publish` never `npm publish`. `oxfmt` is not a gate: hand-wrap at about ninety columns.
- Memory-recorded preferences (user): never `Record<string, unknown>` as a widening dodge; a new union case means the full closed union; the most complete design wins, breaking changes allowed (not in prod); no release without an explicit request.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new and every version read from `node_modules`.
- Architecture (Q1 shape, Q2 sync fork): HIGH, source read and each behaviour reproduced against the installed build.
- Pitfalls: HIGH for 1-4 (reproduced or read), MEDIUM for the React-side behaviour deltas of D-15 (derived from reading the hooks; no test renders those paths today).
- Not confirmed: A1 (madge), A3 (React `Activity` docs); a probe of the real `DevtoolsDock` under `Activity` with diagnostics was not run.

**Research date:** 2026-11-12
**Valid until:** 2026-12-12, or the next `effect` bump (the `FiberHandle` observer rules and `runSync` scheduler are the parts a minor release could change; the lockfile pins 4.1.2).
