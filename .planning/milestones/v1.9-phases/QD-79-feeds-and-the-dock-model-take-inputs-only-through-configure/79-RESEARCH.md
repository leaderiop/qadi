# Phase 79: Feeds and the dock model take inputs only through `configure` - Research

**Researched:** 2026-11-24 (phase base: HEAD `39d51a4d`, branch `arch-wave-14`, Phase 78 complete)
**Domain:** `@qadi/devtools` headless model (`TimelineFeed`, `DiagnosticsFeed`, `GatesFeed`, `DockModel`, `ExternalStore`) and its React adapters (`useScoped`, `useDockModel`, `useTimeline`, `useDiagnostics`), React 19.3.1 (`StrictMode`, `Activity`)
**Confidence:** HIGH on the spike results and the line inventory (run and read this session). MEDIUM on one point: the closure-versus-ref choice was measured on React 19.3.1 only, and the peer range is `>=19.2.4` (see A1).

<user_constraints>
## User Constraints (from CONTEXT.md)

No `79-CONTEXT.md` exists yet. This research runs BEFORE the discuss step, so the discuss step decides the open questions below against this evidence. What binds today comes from `.planning/ROADMAP.md` (Phase 79), `.planning/REQUIREMENTS.md` (CONF-01..06, WX-01..07), `.planning/phases/_WAVE14-CONTEXT.md` and AGENTS.md.

### Locked (from ROADMAP / REQUIREMENTS / `_WAVE14-CONTEXT.md`)
- D2 order: 77 -> 78 -> 79 -> 80. Phase 79 follows 78 (hard dependency: after 78 `TimelineFeed.configure` is two comparisons).
- `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` and `makeDockModel` are built with no inputs; `configure` is the only way inputs arrive; the first `configure` produces what `init` produces today (CONF-02). `makeSimulationSession` only "if it has the same shape".
- One per-field identity rule, the one `makeDerivedStore` uses, decides whether an input moved: omitted and `undefined` alike, diagnostics on/off a distinct transition, G43 either part of the rule or a stated exception, and a type pin that can fail shows a new input field cannot compile without being compared (CONF-03).
- One package-private hook does "build in a scope, then configure with the latest inputs"; used by `useDockModel`, `useTimeline`, `useDiagnostics` (and `useSimulationSession` where it fits); a hidden `Activity` or a StrictMode rebuild configures with the current inputs, pinned by a test (CONF-04).
- `UseDockModelInput` is gone; `DevtoolsDockProps` is `DockModelInputs` plus the host-only props; inputs map onto each feed in one place in `DockModel` (CONF-05).
- Gate 14's packed consumer, `surface.tst.ts`, the compiled README fence, the website devtools page, `spec/behaviors` and ADR fences use the new signatures in the same plan; ADR-QD-192 amends ADR-QD-137, ADR-QD-173 and ADR-QD-185; Breaking `@qadi/devtools` changeset plus upgrade-guide entry (CONF-06).
- `DockModel.configure`'s dispatch order (gates, diagnostics, `shownReading.refresh()`) stays written once; the rule decides whether a feed restarts, not the order. `sameFields` is exported from its file, not the barrel.
- A characterisation test, written and green on the phase base, pins the first-render sequence (CONF-01 / WX-06). It stays out of shared helpers because Phase 80 edits them.
- Reserved records: ADR-QD-192, CCR-QD-471, BEH-QD-731..735, INV-QD-403..404. `node scripts/next-id.mjs` is never run. Stryker baselines of `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts`, `DockModel.ts` are committed first and re-closed after the review.

### Decisions still to be asked at the discuss step (this research recommends an answer to each)
1. How `configure` folds into the build hook without the `Off -> Starting` flash (inside the scoped build, a latest-inputs ref, or keeping the second effect), and what a throw during the first `configure` inside the build does.
2. Omitted vs `undefined` under `sameFields`.
3. Diagnostics `undefined` (off) vs `{}` (on) under "one rule".
4. `GatesFeed`'s restart on `watchFailure !== undefined` (G43): part of the rule or a stated exception.
5. Whether `capacity: undefined` vs the default capacity still wipes the timeline.

### Deferred / out of scope
- Phase 80 (`LensSession`, `instrument`) is out of scope; this phase only keeps its characterisation file clear of the helpers 80 edits.
- Nothing is released or published (WX-07).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-01 | Characterisation of the first-render sequence, plain and StrictMode, green on base and after | `## Spike results` runs 1, 2, 3 give the exact sequences to pin; `## Characterisation test design` says where to observe them |
| CONF-02 | Feeds and dock model built with no inputs; first `configure` equals today's `init` | Spike run 5 (bare + `configure(init)` equals init end state; extra notifications only for a pre-subscribed reader); `## Architecture Patterns` |
| CONF-03 | One per-field rule; omitted == `undefined`; diagnostics presence; G43; a pin that can fail | Spike runs 6 and 7; `## Recommendations` R3 to R6; `## Type pin` |
| CONF-04 | One package-private hook, latest inputs, Activity/StrictMode pinned | Spike runs 3 and 4; `## Recommendations` R1, R2; hook sketch |
| CONF-05 | `DevtoolsDockProps` = `DockModelInputs` + host-only props; single mapping site | `## Inventory` (props split, line numbers at HEAD), R9 |
| CONF-06 | Gate 14, `surface.tst.ts`, README, website, BEH and ADR fences, ADR-QD-192, changeset | `## Inventory` consumers table |
| WX-01..WX-07 | Per-phase invariants (check:pr green, records, gate 13/14, house budgets, mutation, characterisation, no plan ids) | `## Project Constraints`, `## Validation Architecture`, `## Mutation baselines` |
</phase_requirements>

## Summary

The roadmap's premise needs two corrections, both measured. (1) The dock's first render is NOT "`Starting` then `Starting`": `DevtoolsDock` renders `null` until its model exists, so its readers see exactly one configured state (`Starting`, gates `Listed`, questions `Unsampled`). "`Starting` then `Starting`" is what the PUBLIC `useDiagnostics` hook shows (idle stand-in, then the feed). (2) PITFALLS Pitfall 6 says a hidden `Activity` re-runs the build with the first render's `make` closure. On React 19.3.1 it does not: the re-run reads the latest committed closure, and a plain closure produced the same result as a latest-inputs ref in every run, including inputs swapped while hidden.

What the spike confirms: with a bare constructor and `configure` kept in the second layout effect (fold c), children commit once against an unconfigured model. The Questions join then states, falsely, "No live guards were handed to the dock", "No atom set was handed to the dock" and, in the hydration block, "no counts read. Pass diagnostics={{}}", because `isUnsampled(Off)` is `false`. For `useDiagnostics` the reader sees `Starting -> Off -> Starting`. With `configure` inside the build, before `setValue` publishes the value (folds a and b), every sequence is identical to today's, in render count, commit count, and even the number of `subscribe` and `instances()` calls on the gate registry.

A throw during the first `configure` inside the build is the cleanest case too: `useScoped`'s existing `catch` closes the scope and rethrows the original `Error` from the layout effect; no reader ever commits; the nearest error boundary catches it. This is exactly today's behaviour for a refused capacity at construction. Under fold c a half-built model is published and committed first.

**Primary recommendation:** one `useConfigured(make, configure, inputs)` hook in `react/` that runs `make`, calls `configure(built, inputs)` inside the same build (so the value is published already configured), plus one layout effect `[value, heldInputs]` for later changes; constructors take no inputs; each input type gets one complete-record normaliser (`Required<Inputs>`) and `sameFields` (exported from `ExternalStore.ts`, rule untouched) compares the normalised records; diagnostics presence is the `undefined` branch of one tiny exported sibling; G43 is a stated exception in `GatesFeed`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deciding whether an input moved (the per-field rule) | Headless model (`model/ExternalStore.ts`, each feed's `configure`) | none | Model files are the Stryker-gated tier (`stryker.devtools.mjs` mutates `src/model/**` only); a rule in `react/` would be ungated |
| Normalising an input type to a complete record | Headless model (beside each `…Inputs` interface) | none | The `Required<…>` return type is the compile-time force; it must be mutation-gated |
| Mapping dock inputs onto the three feeds | Headless model (`DockModel.ts`, one function) | none | CONF-05: one site, Match with `DockModelInputs` |
| "Build in a scope, then configure with the latest inputs" | React adapter (`react/useConfigured.ts`, package-private) | `useScoped` | React lifecycle only (StrictMode, `Activity`); outside the mutation glob, pinned by hook tests instead |
| Idle stand-ins before the scope exists | React adapter (`idleTimeline`, `idleDiagnostics`) | none | Public hooks must return something on the pass with no feed (ADR-QD-173 decision 5); the dock renders `null` instead |
| The input type of the dock | Headless model (`DockModelInputs`) | React (`DevtoolsDockProps extends` it) | One statement of the eight inputs; host-only props (`unknownParents`, `onInvalidate`) stay in React |
| Gate 14 consumer, README, website, BEH/ADR fences | Docs/gates | none | Compiled documents; same plan as the signature change |

## Standard Stack

No package is added, removed or upgraded. Everything used is already a dependency of `@qadi/devtools`.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` | 4.1.2 [VERIFIED: `node_modules/.pnpm/effect@4.1.2` path in the spike stack trace] | `Effect.fn`, `Scope`, `Layer`, `Match` | Repo-wide |
| `react` | 19.3.1 [VERIFIED: `node -e` printed `19.3.1 symbol undefined undefined`: `React.Activity` is a symbol, `unstable_Activity` is absent]; peer `>=19.2.4` [VERIFIED: `packages/devtools/package.json:51` `"react": ">=19.2.4"`] | `StrictMode`, `Activity`, `useLayoutEffect` | Repo-wide |
| `vitest` 5.1.0 + `@testing-library/react` + `happy-dom` | as installed [VERIFIED: spike run header `RUN v5.1.0`] | hook tests | Repo-wide |
| `tstyche` | as installed | type pins | Repo-wide |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| closure read of the current inputs in the build | a latest-inputs ref | Ref is independent of React's effect-closure behaviour but adds a ref and a write site; measured identical on 19.3.1 (R2) |
| normalise inputs, keep `sameFields` | change `sameFields` to treat omitted == `undefined` | Changes two pinned tests (`ExternalStore.test.ts:444`, `:491`) and `makeDerivedStore`'s documented rule (ADR-QD-185 decision 2) for no gain (R3) |

**Installation:** none. **Package Legitimacy Audit:** no external package is installed or recommended by this phase; the audit is not applicable (`gsd_run query package-legitimacy check` was not needed).

## Spike results

All runs were made on the phase base (no `src/` edit), with throwaway files `packages/devtools/test/_spike79.{dock,hooks}.test.tsx` and `_spike79.units.test.ts`, run from the repo root as `npx vitest run --project devtools packages/devtools/test/_spike79.<name>`. The files are deleted; `git status` shows no file under `packages/`, `scripts/` or `spec/`. (Copies, outside the repo: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/8b5d3789-bd5e-4ce2-bf7e-0b31a0ae4995/scratchpad/spike-copy/`; the condensed code is below so it can be re-run.) Each log line is a LAYOUT-effect commit line or a render line; `parent render` lines are render phase, `reader commit` lines are the reader's commit, `parent: ...` lines are effects in the parent hook. Under `StrictMode` a mount-time layout effect runs twice (React's simulated unmount and remount), so a doubled `commit` line is not a second render.

### Harness (condensed)

```tsx
const neverBuilt = { layer: Layer.effectDiscard(Effect.never) };          // diagnostics stays Starting
const Reader = ({ model }) => {                                           // what QuestionsPanel reads
  const { status } = useStoreSnapshot(model.diagnostics);
  const q = useStoreSnapshot(model.questions);
  const line = `commit: diag=${status._tag} unsampled=${isUnsampled(status)} gates=${q.gates._tag}[${q.instances.map(i => i.id)}] questions=${q.questions._tag}`;
  useLayoutEffect(() => { L(line); });   // every commit
  return null;
};
const Dock = ({ hook, inputs }) => {                                      // DevtoolsDock's shape
  const model = HOOKS[hook](inputs);
  L(`parent render: model=${model === undefined ? "undefined" : "built"}`);
  useLayoutEffect(() => { L("  parent: layout effects done"); });          // declared after the hook's effects
  return model === undefined ? null : <Reader model={model} />;
};
// the folds, written as spike-local hooks over the real useScoped:
const useToday = (i) => useDockModel(i);                                  // today: init + second effect
const useC = (i) => {                                                     // (c) bare + second effect
  const model = useScoped(() => makeDockModel());
  useLayoutEffect(() => { if (model) model.configure(i); }, [model, ...fields(i)]);
  return model;
};
const built = (get) => Effect.gen(function* () {                          // configure INSIDE the build
  yield* Effect.addFinalizer(() => Effect.sync(() => L("  scope closed")));
  const m = yield* makeDockModel(); m.configure(get()); return m;
});
const useA = (i) => {                                                     // (a) ref synced by an earlier layout effect
  const latest = useRef(i); useLayoutEffect(() => { latest.current = i; });
  const model = useScoped(() => built(() => latest.current));
  useLayoutEffect(() => { if (model) model.configure(i); }, [model, ...fields(i)]);
  return model;
};
const useB = (i) => { const latest = useRef(i); latest.current = i; /* ref written in render */ ... };
const useA0 = (i) => { const model = useScoped(() => built(() => i)); /* plain closure, no ref */ ... };
// inputs1 = { diagnostics: neverBuilt, gates: registryA (guard "a"), questions: () => [{ policy }] }, inputs2 = same with registryB (guard "b")
```

### Run 1: today's first-render sequence (phase base), diagnostics handed, gates handed

`today` = real `useDockModel`. Roadmap claim "today it is `Starting` then `Starting`": **not true for the dock; true for `useDiagnostics`** (run 2).

Plain:
```
parent render: model=undefined          (DevtoolsDock returns null)
  parent: layout effects done
parent render: model=built
reader commit: diag=Starting unsampled=true gates=Listed[a] questions=Unsampled
  parent: layout effects done           (the configure effect ran: a no-op, no second reader commit)
```
StrictMode: the same, with `parent render` doubled and `reader commit` doubled by the effect re-run; every reader commit reads `Starting / true / Listed[a] / Unsampled`.
Diagnostics NOT handed (gates only): one reader commit `diag=Off unsampled=false gates=Listed[a] questions=Absent`.
Real-source facts: `isUnsampled` has `Off: () => false,` [VERIFIED: `packages/devtools/src/model/DiagnosticsFeed.ts:89`]. `DevtoolsDock` is `return model === undefined ? null : <DockFrame ...>` [VERIFIED: `DevtoolsDock.tsx:180`]; the dock starts on the `log` tab, so the Questions panel cannot be the first thing mounted through the public dock.

### Run 2: the public hooks today, and the same with a bare constructor

`useDiagnostics(options)`, one probe logging each render's `status._tag`:

| Variant | options = `{ layer }` | options = `undefined` |
|---------|-----------------------|-----------------------|
| today (init in constructor + effect) | `Starting` (idle stand-in), `Starting` (feed) | `Off`, `Off` |
| (c) bare + second effect | `Starting`, **`Off`**, `Starting` (3 renders; `Off` is the unconfigured feed) | `Off`, `Off` |
| (a) configure inside build | `Starting`, `Starting` (identical to today; StrictMode: two builds, each configured) | `Off`, `Off` |

`useTimeline(src, { capacity })`, entries/capacity per render (source = one record):

| Variant | capacity `undefined` | capacity 50 |
|---------|----------------------|-------------|
| today | `0@500`, `1@500` | `0@500` (idle), `1@50` |
| (c) | `0@500`, `0@500` (bare feed), `1@500` | `0@500`, `0@500` (bare feed at the default bound), `1@50` |
| (a) | `0@500`, `1@500` | `0@500`, `1@50` (identical to today) |

### Run 3: bare constructor, dock, fold (c) (the roadmap's `Off -> Starting` flash)

Plain, diagnostics + gates handed:
```
parent render: model=undefined
  parent: layout effects done
parent render: model=built
reader commit: diag=Off unsampled=false gates=Absent[] questions=Absent     <- an unconfigured model is committed
  parent: configure effect                                                   <- child layout effects run BEFORE the parent's configure effect
  parent: layout effects done
reader commit: diag=Starting unsampled=true gates=Listed[a] questions=Unsampled
```
StrictMode: the `Off / Absent / Absent` commit appears twice (effect double-run), then `configure`, then `Starting`. With only `gates` handed (diagnostics off): `Off / false / Absent / Absent`, then `Off / false / Listed[a] / Absent`: the join claims "not handed over" even with no diagnostics involved.

Confirmed: children's layout effects run before the parent's configure effect, and `isUnsampled(Off)` is false so the join does not withhold. The false statements on that one commit are the panel's `GATES_ABSENT_TEXT` "No live guards were handed to the dock." [VERIFIED: `QuestionsPanel.tsx:84-85`], `qadi-questions-absent` "No atom set was handed to the dock." [VERIFIED: `QuestionsPanel.tsx:169-172`] and `qadi-hydration-unwired` "no counts read. Pass <code>{"diagnostics={{}}"}</code>" [VERIFIED: `QuestionsPanel.tsx:337-341`]. Nothing is PAINTED wrong in a browser (the commit is followed by a synchronous re-render because the model appeared through a layout-effect `setState`, a sync lane; I could not measure paint under happy-dom), but any reader effect, ref callback or listener runs against the unconfigured model, and a render-recording test sees it.

### Run 4: the three folds, plain, StrictMode, hidden-then-shown `Activity`

Plain and StrictMode, diagnostics + gates handed (reader commit lines only; effects shown where they order):

| Fold | Sequence |
|------|----------|
| (a) ref synced in an earlier layout effect, configure inside the build | `build: configure(latest)` -> `parent render: built` -> `reader commit: Starting/true/Listed[a]/Unsampled` -> `parent: change effect` (no-op). StrictMode: `build: configure`, `scope closed`, `build: configure` (the first scope is closed before the second build), then the same single configured state. **Identical to today.** |
| (b) ref written during render | Identical to (a) in every run. |
| (a0) plain closure over this render's inputs, no ref | Identical to (a) in every run. |
| (c) bare + second effect | Run 3: an `Off/Absent/Absent` commit before configure. |

`Activity` (visible -> hidden -> visible; `settle` = a 20 ms `act`):

| Scenario | (a), (b), (a0) | (c) |
|----------|----------------|-----|
| Hide with `inputs1`, props change to `inputs2` WHILE HIDDEN, show | on show: `scope closed` at hide; at show `build: configure(latest)`; first reader commit already `Listed[b]` | on show: `Off/Absent/Absent` commit, `configure effect`, then `Listed[b]` |
| Hide with `inputs1`, show with `inputs2` in the SAME rerender | first reader commit `Listed[b]` | `Off/Absent/Absent`, then `Listed[b]` |
| Three `act`s without settling: hidden/`inputs2`, hidden/`inputs1`, visible/`inputs2` | first reader commit `Listed[b]` | `Off/Absent/Absent`, then `Listed[b]` |
| Direct proof that the BUILD saw the current inputs: fold (a0) logged which registry its closure held | first build `a (first render)`; build after show `b (current)` | not applicable |

The last row is decisive: on React 19.3.1 the effect that `useScoped` re-runs on `Activity` reveal reads the latest committed render's closure, although its dependency array is `[]`. PITFALLS Pitfall 6 (stale `make` closure after a hidden `Activity`) is therefore NOT reproduced; a ref is not needed for correctness on 19.3.1. [VERIFIED: spike, React 19.3.1]. Whether `>=19.2.4` all behave the same is A1.

Subscription counts on the gate registry (proves "first configure equals today's init" at the hook level), `subscribe` calls / live listeners / `instances()` reads:

| Variant | healthy plain | healthy StrictMode | failing `subscribe` plain | failing StrictMode |
|---------|---------------|--------------------|---------------------------|--------------------|
| today | 1 / 1 / 2 | 2 / 1 / 3 | 2 / 0 / 0 | 3 / 0 / 0 |
| (a) | 1 / 1 / 2 | 2 / 1 / 3 | 2 / 0 / 0 | 3 / 0 / 0 |
| (c) | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 0 / 0 | 1 / 0 / 0 |

Fold (a) reproduces today's counts exactly (including the second, G43-driven `subscribe` after a failed watch); (c) differs (one fewer call).

### Run 5: first `configure` equals today's `init`, and what a pre-subscribed reader hears

A model built with `{ capacity: 50, source (1 record), catalogue (1 policy), diagnostics: { layer }, gates, questions }` versus a bare model given the same inputs through `configure`: the end states are equal: entries 1, capacity 50, diagnostics `Starting`, questions `Unsampled`, gates `Listed`, sightings 1, timeline status `Reading`. A subscriber attached to each store BEFORE the first `configure` hears: `timeline 2, dock 2, explorer 3, simulation 3, roles 0, diagnostics 1, timelineStatus 0, questions 2, services 1` notifications; a model built with `init` publishes none of these to anyone. So equality holds in state; the intermediate publishes exist only for a reader that subscribed before the first `configure`. Under the hook (fold a) nobody subscribes before configure. A headless shell (README example) that subscribes first and configures after will hear them: the example must say so.

### Run 6: a throw during the first `configure` (`capacity: -1`), inside an error boundary

| Variant | What happened | Error React surfaced | Scope |
|---------|---------------|----------------------|-------|
| today (init in constructor, throws in the build) | no model published; readers never commit | `Error: emptyTimeline: capacity must be a non-negative integer, got -1` | `useScoped`'s `catch` closes it |
| (a) configure inside the Effect build | no model published; no reader commit | the same `Error`, same message (not a `FiberFailure`) | `scope closed` logged BEFORE the boundary caught it |
| (j) configure in plain JS after `runSync`, still before `setValue` | same as (a) | same | `scope closed` before the boundary |
| (c) configure in the second effect | the unconfigured model was published and committed (`Off/Absent/Absent`), then the effect threw | the same `Error` | closed only afterwards, by `useScoped`'s cleanup when React unmounted the tree under the boundary |

`useTimeline` with `capacity: -1` behaves the same way (today and (a): no commit of a feed; (c): the bare feed is committed at 500, then the throw). So the throw-closes-the-scope behaviour of folds (a)/(b) is not new: it is today's behaviour for a refused capacity, which `makeDockModel(init)` also threw from the build. No `Effect.runSync` wrapping surprise: a throw inside `Effect.sync` in the build surfaces as the original `Error`.

### Run 7: the rule's edge cases, measured on the phase base

- `makeDerivedStore` key `{a:1}` then `{a:1, b: undefined}`: recomputes (counted as a change). `{a:1, b: undefined}` then `{a:1}`: recomputes. `{a:1}` then `{a:1}`: does not. [VERIFIED: spike; the rule is `sameFields`, `ExternalStore.ts:134`, and two tests pin it: `ExternalStore.test.ts:444` "a key that loses a field holding undefined counts as changed" and `:491` "a key that swaps a field for another holding undefined counts as changed".]
- Capacity: a timeline feed configured with `{source}`, then `{source, capacity: DEFAULT_TIMELINE_CAPACITY}`, then `{source, capacity: undefined}`: the SAME snapshot object each time, nothing wiped, no re-read. Then `{capacity: 50}`: entries 1 at capacity 50. Then `{source}`: back to 500. The dock does the same (snapshot identity kept across default/undefined/omitted). After Phase 78 `effectiveCapacity` makes `undefined` and the default one bound. **The roadmap's wipe is gone; CONF-03 only needs a regression pin so the normalised rule keeps it.**
- A refused capacity (`-1`): throws `emptyTimeline: capacity must be a non-negative integer, got -1`, leaves capacity 500 and 0 entries.
- A first `configure` where a timeline listener throws: the error is rethrown, capacity is already 50 (applied whole, ADR-QD-191).
- Diagnostics feed: bare `Off`; `configure({})` -> `Live`; `configure(undefined)` -> `Off`; `configure({ layer: undefined })` -> `Live`. So `{}` and `{layer: undefined}` already behave as one "on" state; `undefined` is the distinct "off".

### Condensed re-run recipe

Recreate the three files from the harness above (the dock probe, a `useDiagnostics`/`useTimeline` probe pair with the same variants, and a units file calling the feeds through `Effect.runPromise(Effect.scoped(...))`), write each log to a file named by `SPIKE_OUT`, run `npx vitest run --project devtools packages/devtools/test/_spike79.<name>`, and delete them. Test names used: `FIRST RENDER`, `ACTIVITY`, `ACTIVITY-ONE`, `ACTIVITY-BATCH`, `THROW`, `G43 hook-level`.

## Recommendations (one per open decision)

### R1. The configure fold: (a), configure inside the scoped build; keep the second effect for later changes
Evidence: only (a)/(b)/(a0) leave every sequence identical to today's (renders, commits, `subscribe` and `instances()` counts, both plain and StrictMode); (c) commits an unconfigured model, shows `Starting -> Off -> Starting` through `useDiagnostics`, and makes the join assert false "not handed over" text (Runs 2 to 4). The second effect stays because later changes still arrive through it; its first run after the build is an idempotent no-op (it reproduces today's G43-driven second `subscribe`). This also removes the reason for `idleDiagnostics`'s two constants being a workaround for an unconfigured feed: they remain only for the pass with no feed at all (ADR-QD-173 decision 5).

### R2. Latest inputs: read the current render's inputs through a plain closure, pin it, keep a ref as the documented fallback
Evidence: a plain closure (a0) equalled the ref (a) and the render-written ref (b) in every Activity scenario, and the build's own log proved it read `b (current)` on re-show (Run 4). Use the closure: no ref, no write site, no render-phase write. Add the pins that fail if a React upgrade changes this (the three Activity scenarios, asserted on the first reader commit and on the build's inputs). If a pin ever fails, move to the ref in a layout effect declared before the build effect (not a render-phase write). The doc comment in `useScoped.ts:43-44` ("`make` is read once per mount") is inaccurate for a re-shown `Activity`, and PITFALLS Pitfall 6's premise is falsified on 19.3.1; correct both in this phase.

### R3. Omitted vs `undefined`: normalise the inputs; do not change `sameFields`
`sameFields` is the rule `makeDerivedStore` uses; two tests pin that a field on one side only is a change, and `makeDerivedStore`'s `K extends object & Required<K>` bound makes that case unreachable for its keys. Change nothing in the rule. Instead give each input type ONE normaliser returning `Required<Inputs>` (verified on this repo's compiler settings: with `exactOptionalPropertyTypes`, `Required<{ capacity?: number | undefined }>` is `{ capacity: number | undefined }` and a literal missing a field is a compile error, checked with `tsc 7.0.2`). `configure` normalises its argument first, so `{a}` and `{a, b: undefined}` become the same complete record, and `sameFields` then compares complete records exactly as `makeDerivedStore` compares its keys. The `Required<>` return type is also the compile-time "listed" force (R7). The `Required<K>` bound fits as follows: it stays on `makeDerivedStore` only (it is a bound on that function, not on `sameFields<K extends object>`), the normalised record satisfies it too, and no optional-key object ever reaches the rule.

### R4. Diagnostics `undefined` vs `{}`: presence is the `undefined` branch of one exported sibling of the rule
`DiagnosticsFeed.configure(options | undefined)` stays; normalise `{}` to the complete `{ layer, collector, intervalMillis }` record (so `{}` equals `{layer: undefined}`), and compare with a second exported function in `ExternalStore.ts`, `sameFieldsOrAbsent(a, b)`: absent equals only absent, else `sameFields`. One file, mutation-gated, one rule plus its one stated extension; `configure(undefined)` on a feed already off still publishes nothing (today's `if (before !== undefined) off()` survivor, ADR-QD-173 decision 8, stays as is). Alternative (keep it feed-local) works but leaves "one rule" with a hand-written presence check in a second file.

### R5. G43 (`watchFailure !== undefined`): a stated exception, not part of the rule
G43 (`GatesFeed.test.ts:665`) pins that a `configure` with the SAME registry after a failed `subscribe` subscribes again, and `double.subscriptions()` is 2 then 3. The rule answers "did an input move?"; G43 is a retry, and it must fire when nothing moved. Writing it as part of the rule would need a sentinel for "applied" and would blur the rule's meaning. State it: in `GatesFeed`, `if (sameFields(held, next) && watchFailure === undefined) return`, with the comment and ADR-QD-192 saying why. Hook-level it is neutral: fold (a) produced the same subscribe counts as today (Run 4).

### R6. `capacity: undefined` vs the default wipes nothing (already true after 78); pin it so the normalised rule keeps it
Measured: same snapshot object, no re-read (Run 7). The normaliser maps `capacity` through `effectiveCapacity`, so the rule sees `500` for `undefined`, omitted and `DEFAULT_TIMELINE_CAPACITY`; that is also where a refused bound throws before anything moves (the check the feed and the dock run first today, `TimelineFeed.ts:174-176` and `DockModel.ts:299-300`). Add one regression test per level (feed and dock).

### R7. The type pin that can fail
Three layers, none counted by `NOT_CALLABLE_PIN_BUDGET` (it counts only `not.toBeCallableWith` and `not.toBeConstructableWith`, AGENTS.md section 6):
1. Compile force in `src`: each normaliser is declared `(inputs: I) => Required<I>`, so adding a field to `I` fails `pnpm typecheck` at the one line that lists the fields.
2. A golden pin per input type in a `.tst.ts` file, the form `surface.tst.ts:293` already uses for `DiagnosticsOptions`: `expect<Required<TimelineFeedInputs>>().type.toBe<{ readonly capacity: number | undefined; readonly source: Source | undefined }>()`. It fails the moment a field is added until the pin is edited, so the edit is reviewed.
3. A `@ts-expect-error` negative in the `ExternalStore.tst.ts` style ("checked twice": TS2578 under `pnpm typecheck`, and tstyche reads the fragment): a literal missing one field of a `Required<…>` record is refused, next to the accepted complete literal (its positive twin). This is the repo's own pattern and is not budgeted.
Honest limit: no type can force what a new field DOES. Back it with a per-feed "each input moved alone" sweep keyed by a `Record<keyof Required<I>, Mover>` table (compile-forced complete) that asserts the feed reacted; that is the guard against "compiles and never restarts".
Constructors that lose their inputs: pin them with the positive `expect<Parameters<typeof makeTimelineFeed>>().type.toBe<[]>()` form (and the same for the other two public ones) in `surface.tst.ts`, replacing `surface.tst.ts:306`. A negative `not.toBeCallableWith` pin would add rows to `NOT_CALLABLE_PIN_BUDGET` and AGENTS.md section 6 and need a positive twin; avoid it.

### R8. `makeSimulationSession`: it does NOT have the same shape; leave it (and `useSimulationSession`) out of the shared hook
`SimulationSessionInit` is `{ sightings?, seed?, ports? }` read once at build (`SimulationSession.ts:238-242`, `:279-293`); there is no `configure`. The session exposes three independent commands, `setSightings`, `seed(entry)` and `setPorts`, and `seed` is a re-seeding COMMAND whose rule is "Each prop is dispatched only when it changes, so a host that replays through `session.replay` is never overridden by an unchanged `seed` prop" [VERIFIED: `useSimulationSession.ts:59-60`]. A shared `configure(value, inputs)` would force a new `SimulationSession.configure` that merges three commands with different semantics, change a published member (43 test sites in `SimulationSession.test.ts`, 3 in `SimulationSession.runs.test.ts`, 3 in `features/features/devtools-simulator/devtools-simulator.steps.test.ts`, ADR-QD-137 decision 1 `makeSimulationSession: (init?)`), and buy nothing: `DockModel` already builds a session bare and calls `simulation.setPorts(inputs.ports)` plus `setSightings`. The roadmap's own wording ("if it has the same shape", "where it fits") allows this. Record it in ADR-QD-192 as considered and left, with `ExplorerSession` and `HeldChoice`. `useSimulationSession` keeps `useScoped` as today; `useScoped` is not changed by this phase except for its comment.

### R9. `DevtoolsDockProps` = `DockModelInputs` + host-only props
Eight model inputs, two host-only props. Today `DevtoolsDockProps` (`DevtoolsDock.tsx:80-152`) has `source`, `capacity`, `catalogue`, `diagnostics`, `reading`, `gates`, `questions`, `ports` (the eight, all `readonly x?: T`) and the host-only `unknownParents` and `onInvalidate`. `DockModelInputs` (`DockModel.ts:84-103`) has the same eight, each `?: T | undefined`; `UseDockModelInput` (`useDockModel.ts:28-37`) a third copy. Use `export interface DevtoolsDockProps extends DockModelInputs { readonly unknownParents?: ReadonlyArray<string>; readonly onInvalidate?: () => void }` and move each prop's long doc comment onto the `DockModelInputs` field it documents (one source of truth; an inherited property keeps its doc in an IDE). Note the widening: `exactOptionalPropertyTypes` is on (`tsconfig.base.json:27`), so today `DevtoolsDockProps` rejects an explicit `source={undefined}` and the new type accepts it; this is a non-breaking widening and goes in the changeset. `DockModelInputs` is not in the barrel today (the dock model is package-private); because it now appears in a public type, check gate 13 and TS2883 on `lib/`: if it is nameable only through the file, export it per AGENTS.md section 9 (re-export internal types explicitly where `.d.ts` emission names them) and give it an overview row, or keep `extends` (an interface heritage reference is emitted as an import and does not need the barrel). Decide at discuss; either way it is in this plan's consumer list. `DevtoolsDock` then does `const { unknownParents, onInvalidate, ...inputs } = props; useDockModel(inputs)`: the eight names are listed zero times in the component.

### R10. One mapping site; dispatch order stays written once
After the constructors lose `init`, the second of today's two mapping sites disappears by construction. At HEAD (`DockModel.ts`): timeline `{ capacity, source }` build at `:206`, configure at `:308`; gates `{ gates, questions, intervalMillis }` build at `:245-249`, configure at `:319-323`; diagnostics build at `:234`, configure at `:324`. After: one function (name at planner's discretion, e.g. `feedInputsOf(inputs: DockModelInputs)`) beside `DockModelInputs` returning `{ timeline: Required<TimelineFeedInputs>; gates: Required<GatesFeedInputs>; diagnostics: DiagnosticsOptions | undefined }`, used only by `configure`. `intervalMillis` crosses from `diagnostics` to gates there (`diagnostics?.intervalMillis`), stated once. The dispatch order is written once at `DockModel.ts:307-328` (the `try { timelineFeed.configure } finally { catalogue/roles, simulation.setPorts, gatesFeed.configure, diagnosticsFeed.configure, shownReading.refresh() }` block); the comment at `:316-318` says why gates precede the refresh; do not touch it. The dock keeps its own identity compares for the three inputs it owns (`catalogue` at `:310`, `ports` guarded by `SimulationSession.setPorts`, `reading` through `shownReading.refresh()`); the dock's fourth "unconditional `refresh()`" is not a hand-written rule, it is `makeDerivedStore`'s own `sameFields`.

### R11. Hook: `useConfigured`, built on `useScoped`, outside the mutation glob
Sketch (names are a recommendation; no `as`, `!`, `any`, `switch` or `async`):
```ts
// react/useConfigured.ts (package-private, AGENTS.md section 9)
export const useConfigured = <A, I extends object>(
  make: Effect.Effect<A, never, Scope.Scope>,
  configure: (value: A, inputs: I) => void,
  inputs: I,                      // a complete record, so `held` below compares exactly
): A | undefined => {
  const held = useHeldFields(inputs);
  // The build configures the value before `setValue` publishes it, so no reader sees it bare.
  // `inputs` here is the current render's closure; React re-runs this effect with the latest
  // committed one on a StrictMode remount or an `Activity` reveal (pinned by tests).
  const value = useScoped(() => Effect.tap(make, (built) => Effect.sync(() => { configure(built, held); })));
  useLayoutEffect(() => { if (value !== undefined) configure(value, held); }, [value, held]);
  return value;
};
// useHeldFields: `const ref = useRef(inputs); if (!sameFields(ref.current, inputs)) ref.current = inputs; return ref.current;`
```
`held` is stabilised by the rule so the change effect runs exactly when a field moved (an object rebuilt each render does not retrigger it), without a field list at the call site; a conditionally spread host prop is already neutral after normalisation. A throw in the first `configure` surfaces through `useScoped`'s existing `catch` (Run 6). `useTimeline` becomes `useConfigured(makeTimelineFeed(), (feed, i) => feed.configure(i), { source, capacity })`; `useDiagnostics` wraps its nullable option as `{ options }` (the feed's own `sameFieldsOrAbsent` still decides inside); `useDockModel` becomes `useConfigured(makeDockModel(), (model, i) => model.configure(i), complete(inputs))`. `src/react/` is outside `stryker.devtools.mjs`'s `mutate: ["packages/devtools/src/model/**/*.ts"]`, so the hook's behaviour is held by hook tests, not the mutation gate: write them so each Activity/StrictMode/throw scenario of Runs 4 and 6 fails when the build stops configuring (show each failing once, WX-06).

## Architecture Patterns

### Data flow after the change

```
host props / hook inputs
        |
        v
 DevtoolsDock: { unknownParents, onInvalidate, ...inputs } = props
        |                                   (host-only props go to the frame untouched)
        v
 useDockModel(inputs) --> useConfigured(makeDockModel(), configure, complete(inputs))
        |                       |
        |   effect, mount/StrictMode/Activity reveal:
        |   useScoped builds in a fresh scope:  make --> model (bare, inert)
        |                                       --> model.configure(inputs)   [first configure, inside the build]
        |                                       --> setValue(model)            [published already configured]
        |   throw: scope closed, error rethrown from the layout effect, no value published
        |
        |   later render, a field moved (held changed):
        v   layout effect --> model.configure(inputs)
 DockModel.configure(next)
        |  normalise(next) ----------------------------- one complete record
        |  effectiveCapacity check (throws before anything moves, ADR-QD-191)
        |  feedInputsOf(next) -------------------------- the one mapping site
        |      timeline  {capacity, source}  --> TimelineFeed.configure  (sameFields; any field moved -> resize + read)
        |      then, in `finally`, in this written-once order:
        |      catalogue/roles, simulation.setPorts,
        |      gates {gates, questions, intervalMillis} --> GatesFeed.configure (sameFields, or watchFailure retry: G43)
        |      diagnostics --> DiagnosticsFeed.configure (sameFieldsOrAbsent)
        |      shownReading.refresh()  --> derived stores (questions, services) via makeDerivedStore's sameFields
        v
 stores publish; readers (useSyncExternalStore) see a configured model on their first commit
```

### Recommended structure (no new model file)
```
packages/devtools/src/
  model/ExternalStore.ts     # export sameFields; add sameFieldsOrAbsent (mutation-gated here)
  model/TimelineFeed.ts      # makeTimelineFeed(): no params; complete-record normaliser; configure
  model/DiagnosticsFeed.ts   # makeDiagnosticsFeed(): no params; normaliser; sameFieldsOrAbsent
  model/GatesFeed.ts         # makeGatesFeed(): no params; normaliser; stated G43 exception
  model/DockModel.ts         # makeDockModel(): no params; DockModelInputs complete(); feedInputsOf
  react/useConfigured.ts     # NEW, package-private: scope, configure inside the build, change effect
  react/useScoped.ts         # unchanged except its comment (the `make` claim)
  react/useDockModel.ts      # UseDockModelInput deleted; takes DockModelInputs
  react/useTimeline.ts, useDiagnostics.ts   # over useConfigured
  react/DevtoolsDock.tsx     # DevtoolsDockProps extends DockModelInputs
```
No new `model/` file, so no close-only Stryker group (see Mutation baselines).

### Anti-patterns to avoid
- **Configure in the second effect only** (fold c): commits an unconfigured model (Runs 2 and 3).
- **A render-phase ref write** (fold b): works here, but is a render-time write; the closure needs none.
- **Changing `sameFields`** to treat omitted as `undefined`: flips two pinned tests and the rule ADR-QD-185 decision 2 states for `makeDerivedStore`.
- **A negative `not.toBeCallableWith` pin on an Effect-returning constructor**: it adds budget rows; use the positive `Parameters<F>` `toBe<[]>` form.
- **Putting the first-render characterisation file or its fixtures in `helpers.ts`, `dockModelFixtures.ts` or `questionsPanelInput.ts`** (Phase 80 edits those; render `QuestionsPanel` directly and Phase 80's new `lens` prop breaks it). Read the model's stores (`model.diagnostics`, `model.questions`) in the probe, as the spike did.
- **Reading the registry or the thunk on every host render** by dropping the held-fields stabiliser: each `configure` re-reads host code and, after a failed watch, retries `subscribe` (G43).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-field "did it move" | A fourth/fifth `next.x !== before.x` list | `sameFields` exported from `ExternalStore.ts` over a normalised complete record | The four hand-written rules are the defect: a new field compiles and never restarts |
| Presence of an optional whole input (diagnostics) | A feed-local `before === undefined \|\| ...` | `sameFieldsOrAbsent` beside `sameFields` | One file, one mutation gate |
| Scope + build + publish | A new scope manager | `useScoped` (build already inside a `try`/`catch` that closes the scope) | Already right for StrictMode, `Activity` and a throw |
| A scripted broken port or sink in a new test | Hand-written failing layers | `scriptedPort`, `AuditTrailPortTest` (AGENTS.md section 6) | `PORT_DOUBLE_BUDGET` |
| A feed built with inputs in a test | 166 hand edits | One fixture helper per constructor (below) | Same shape at every site; tests of `Scope.provide(makeX(...), scope)` use the same helper |

## Inventory (everything at HEAD `39d51a4d`)

### Construction sites per test file (counted this session)
Counts are call sites of `makeX(` in each file (grep, then split by form):

| File | Total | `yield* makeX(` | `Scope.provide(makeX(` | multi-line / other | With an argument (must change) | Bare (stay) |
|------|-------|-----------------|------------------------|--------------------|--------------------------------|-------------|
| `test/model/TimelineFeed.test.ts` (`makeTimelineFeed`) | 36 | 30 | 6 | 0 | 30 | 6 |
| `test/model/DiagnosticsFeed.test.ts` (`makeDiagnosticsFeed`) | 33 | 30 | 3 | 0 | 28 | 5 |
| `test/model/GatesFeed.test.ts` (`makeGatesFeed`) | 38 | 30 | 8 | 0 | 35 | 3 |
| `test/model/DockModel.test.ts` (`makeDockModel`) | 79 | 73 | 4 | 2 | 58 | 21 |
| `test/model/DockModel.characterisation.test.ts` (`makeDockModel`) | 15 | 12 | 1 | 2 | 15 | 0 |
| **Total** | **201** | | | | **166** | **35** |

Others: `test/react/useSimulationSession.test.tsx:39,108` call `useDockModel` with partial inputs (`{ source, catalogue, ports }`, `{ source }`), still valid with `DockModelInputs`. `test/surface.tst.ts:303-306` pins the constructors (`:306` `makeDiagnosticsFeed({ intervalMillis: 1_000 })` becomes a refusal: replace by the positive `Parameters<...>` `toBe<[]>` pins). `makeSimulationSession` sites (unchanged): `SimulationSession.test.ts` 43, `SimulationSession.runs.test.ts` 3, `features/features/devtools-simulator/devtools-simulator.steps.test.ts` 3, `Simulator.test.tsx` 1, `SimulationSession.characterisation.test.ts` 1, `NonJsonWitness.test.ts` 1. No `makeTimelineFeed`/`makeGatesFeed`/`makeDiagnosticsFeed`/`makeDockModel` use under `examples/` or `features/` [VERIFIED: grep over `packages examples website spec scripts features`].

**Proposed fixture helper** (one new file, `packages/devtools/test/builtFeeds.ts`, separate from `helpers.ts` and `dockModelFixtures.ts`; `Effect.fn` so `Scope.provide(timelineFeedOf(x), scope)` and `yield* timelineFeedOf(x)` both work):
```ts
export const timelineFeedOf = Effect.fn(function* (inputs: TimelineFeedInputs = {}) {
  const feed = yield* makeTimelineFeed(); feed.configure(inputs); return feed; });
export const diagnosticsFeedOf = Effect.fn(function* (options?: DiagnosticsOptions) {
  const feed = yield* makeDiagnosticsFeed(); feed.configure(options); return feed; });
export const gatesFeedOf = Effect.fn(function* (inputs: GatesFeedInputs = {}) {
  const feed = yield* makeGatesFeed(); feed.configure(inputs); return feed; });
export const dockModelOf = Effect.fn(function* (inputs: DockModelInputs = {}) {
  const model = yield* makeDockModel(); model.configure(inputs); return model; });
```
A test that asserts something about the BUILD with inputs (a throw at construction, the status right after `makeX(init)`) needs a per-test look: grep found no `Effect.exit(makeX(...))` construction-throw test; the refused-capacity tests are already `configure` ones (`TimelineFeed.test.ts:666,695`, `DockModel.test.ts:454`).

### Published-signature consumers that change in the same plan
| Consumer | Where (re-checked at HEAD) | Change |
|----------|----------------------------|--------|
| Gate 14 packed consumer (`pnpm spec:package` only; a TEMPLATE STRING inside `scripts/check-package-install.mjs`) | `makeTimelineFeed({ source: sourceFromRecords([stored]) })` at `:653`; `makeGatesFeed()` `:680` and `makeGatesFeed({ gates: gateRegistry })` `:681`; `makeDiagnosticsFeed()` `:711` and `makeDiagnosticsFeed({})` `:712`; imports `:507-509` | build bare, subscribe, then `configure`; keep every `expect(...)` line and the "a `make*Feed` left uncalled fails" accounting; confirm it still fails when a call is dropped. A green local `pnpm typecheck` hides a break here. Note the `"Unwatched"` expectation at `:697` (`bare`) and the `"Off"` expectation at `:724` (`off`) read the pre-configure state of a bare feed, which is what they assert today; `bare` and `off` stay bare. |
| `packages/devtools/test/surface.tst.ts` | `:303-306` | positive `Parameters<…>` `toBe<[]>` pins; keep the three `Effect<…, never, Scope>` pins on `makeX()` |
| `packages/devtools/README.md` (compiled fence) | `:185-187` imports, `:220-222` `makeTimelineFeed({ source: log })`, `makeDiagnosticsFeed({ intervalMillis: 1_000 })`, `makeGatesFeed(host)`, prose `:26-27`, `:251` (the `configure` prose) | build bare, subscribe (`follow`) BEFORE `configure`, then configure; the Phase 60 WR-01 lesson: a stop reached during a build is missed by a late subscriber, and now the window is the first `configure` |
| Website devtools page | `apps/website/src/content/docs/docs/packages/devtools.md:177` (prose, `makeDiagnosticsFeed`), `:223-226` (the Feeds bullet), the `useDiagnostics` fence `:194-209` (unchanged signature) | prose; check `:177` and `:223-224` wording for "built with" |
| Website upgrade guide | `apps/website/src/content/docs/docs/reference/upgrading.md:1044-1056`, the **"After" fence of "0.13: the feeds are devtools' headless interface"** (`makeTimelineFeed({ source: log })`, `makeDiagnosticsFeed(sampling)`), which `check-website-doc-examples.mjs` compiles and which stops compiling | rewrite it to build bare then `configure`, and add a new `## 0.13: ...` section for this phase (the file's 0.13 sections end with `:1217` "a timeline store owns its capacity") |
| Behaviour docs | `spec/behaviors/28-devtools-screens.md`: `ts` signature listings at `:654` (`makeDiagnosticsFeed`), `:2522` (`makeTimelineFeed: (inputs?) => …`), `:2564`, `:2614` (`makeGatesFeed: (inputs?) => …`); the compiled ```typescript fence at `:766-775` (`makeDiagnosticsFeed({ layer: decisionCacheLayer() })`); REQUIREMENT text `:2531` ("`makeTimelineFeed(inputs?)` MUST build…") and BEH-QD-636 to 639, BEH-QD-323 (`:638`); BEH-QD-656 (`:2697`) | restate signatures and requirements; add BEH-QD-731..735 |
| ADRs | ADR-QD-137 decision 1 line `:57` (`makeSimulationSession: (init?) =>`, kept: R8), ADR-QD-173 decisions 1 and 4, ADR-QD-185 decision 2 (`:44-47` "module-private comparison, `sameFields`") and ADR-QD-162 `:74`; ADRs contain NO fenced code in these files (grep of "```" returned nothing), so "ADR fences" means the inline signature text | dated amendments pointing to ADR-QD-192; new ADR-QD-192 |
| `spec/overview.md` rows (gate 13) | `:875` `makeTimelineFeed`, `:876` `TimelineFeed`/`TimelineFeedInputs`, `:893` `makeSimulationSession` (unchanged), `:920` `makeDiagnosticsFeed`, `:921` `makeGatesFeed`/`GatesFeedInputs`, `:927` `useTimeline`, `:928` `useDiagnostics`, `:932` `DevtoolsDock`/`DevtoolsDockProps` ("ten optional props") | rows name "built with no inputs; `configure` takes them"; Change History line; no export added unless `DockModelInputs` is exported (R9) |
| `spec/traceability.md`, `spec/invariants.md` (INV-QD-389 `:4494` names `sameFields` as source), `spec/README.md` (CCR row), `spec/decisions/index.yaml` | | new INV-QD-403..404 and BEH-QD-731..735 rows; INV-QD-389 source line |
| Changeset | `.changeset/devtools-headless-interface-is-the-feeds.md` is the 0.13 precedent | a new Breaking `@qadi/devtools` changeset, plus the upgrade-guide entry |
| `examples/nextjs-newsroom/src/client/Dock.tsx` | uses `<DevtoolsDock ...>` props only (`DevtoolsDockProps` fields unchanged) | no change expected; verify `examples` still compiles (`pnpm example`) |

### Where inputs are mapped today (line numbers at HEAD)
| Site | `DockModel.ts` at HEAD | Roadmap's pre-78 number |
|------|------------------------|-------------------------|
| `inputs` initial | `:204` (`init ?? {}`) | |
| timeline `{ capacity, source }` build | `:206` | `:188` |
| timeline configure | `:308` (`{ capacity, source: next.source }`, after the `effectiveCapacity` check at `:300`) | `:283` |
| diagnostics build / configure | `:234` / `:324` | |
| gates `{ gates, questions, intervalMillis }` build | `:245-249` | `:227-230` |
| gates configure | `:319-323` | `:293-296` |
| `useDockModel.ts` | eight inputs listed: `:39-49` (destructure), `:51` (build), `:55-58` (effect + deps list) | `:51-57` |
| the three types | `DevtoolsDockProps` `DevtoolsDock.tsx:80`, `UseDockModelInput` `useDockModel.ts:28`, `DockModelInputs` `DockModel.ts:84` | |
| constructors' `init` | `TimelineFeed.ts:141-143`, `DiagnosticsFeed.ts:140-142` and `:210`, `GatesFeed.ts:129-131`, `DockModel.ts:202-204` | |
| hand-written restart rules | Timeline `:174-190`, Diagnostics `:194-201`, Gates `:259-275` (`:263` the G43 test, `:268` thunk/interval), Dock `:310` (catalogue) and the unconditional `:327` | |

## Common Pitfalls

### Pitfall 1: Believing the closure is stale after a hidden `Activity`
**What goes wrong:** the planner adds a ref "because PITFALLS says so", or the pin is not written because the risk looks handled.
**Why it happens:** PITFALLS Pitfall 6 was derived by reading; the run shows the opposite on 19.3.1.
**How to avoid:** write the three Activity pins from Run 4 anyway (they are the alarm if React changes) and assert on the FIRST reader commit after the show, not on the settled state: the second effect would mask a stale build.
**Warning signs:** a pin that only checks the settled registry passes under fold (c) and under a stale build alike.

### Pitfall 2: The characterisation observes the wrong tier
**What goes wrong:** a test that renders the public `DevtoolsDock` cannot see the Questions join at first render (the dock starts on `log`, and renders `null` until the model exists).
**How to avoid:** observe the sequence through a probe that calls `useDockModel` and reads `model.diagnostics`, `model.questions` and `isUnsampled`, as the spike did, plus `useDiagnostics` and `useTimeline` probes. Put it in its own file with its own helpers. Do not render `QuestionsPanel` (Phase 80 adds its `lens` prop) and do not import `questionsPanelInput.ts`/`dockModelFixtures.ts`.

### Pitfall 3: Reading the phase base's sequence as "two renders"
**What goes wrong:** a doubled `commit` line under StrictMode is mistaken for a second render and the test asserts a count React does not guarantee.
**How to avoid:** assert the ORDERED set of distinct committed states and the absence of an unconfigured state; separately assert the number of `scope closed` and `configure` calls under StrictMode (two builds, one close between them).

### Pitfall 4: The first `configure` is not free of notifications
**What goes wrong:** a headless consumer that subscribes before the first `configure` hears extra publishes (Run 5: 2, 2, 3, 3, 1, 2, 1 across timeline, dock, explorer, simulation, diagnostics, questions, services).
**How to avoid:** the hook configures before anyone subscribes; the README example and BEH-QD-731 state "subscribe before configure hears the first configure's publishes".

### Pitfall 5: A bare `TimelineFeed` starts a wasted read
`makeTimelineFeed()` today calls `readSource(undefined)` (`NO_SOURCE`) at build (`TimelineFeed.ts:143-170`), then the first `configure` supersedes it. It is harmless (superseding run) but the new build should not start one if the first `configure` is guaranteed; decide at planning, and keep the status `Reading` constant so `status.set(READING)` publishes nothing (PITFALLS Pitfall 17). Same for `DiagnosticsFeed.configure(undefined)` as a FIRST call (`off()` runs `runs.stop()` and a new store) and the gates feed's build-time `watch`/`publish`/`cadence`.

### Pitfall 6: Gate 14 only fails in `pnpm spec:package`
The consumer is a template string; `pnpm typecheck` does not compile it. Plan an explicit `pnpm spec:package` task and a self-check that dropping a feed call still fails the gate.

### Pitfall 7: `configure` on a closed feed, and first-configure ordering
Keep the `reads.closed()` / `runs.closed()` guards in front of every new path (Phase 60 WR-02). The Strict/Activity build closes the first scope; a late `configure` on its model must stay inert.

### Pitfall 8: Two Stryker groups for a file measured on different commits
`78-mutation.mjs` refuses a record whose groups were measured on different commits ("every group of one record is measured on one commit"). Measure all five base groups on the phase base commit in one sitting, before any source edit, from a clean tree.

## Mutation baselines (Stryker, ADR-QD-168)

- Config: `stryker.devtools.mjs`, `mutate: ["packages/devtools/src/model/**/*.ts"]`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`, report `reports/mutation-devtools/mutation.json`. **`react/` is not mutated**: a new `react/useConfigured.ts` is not covered, and neither is `useDockModel`. Keep decision logic in `model/` (the normalisers, `sameFields`, `sameFieldsOrAbsent`, `feedInputsOf`) so it is gated; the hook is held by hook tests. If a new `model/` file is added anyway, it needs a close-only group (`closeOnly`, `judgeNew`: no open mutant, Ignored allowed).
- Files to baseline first, on the phase base, one `record base <group>` each: `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts`, `DockModel.ts`. Phase 78's close (at `35c45e60`) already holds `TimelineFeed.ts` 41/41 and `DockModel.ts` 72/72 with 0 open mutants; `DiagnosticsFeed.ts`, `GatesFeed.ts` and `ExternalStore.ts` have no record in 78 and need a fresh base. The existing `reports/mutation-devtools/mutation.json` (08:58 today) holds only `DockModel.ts` (72 Killed, 10 Ignored): re-measure; do not reuse it.
- Pattern to copy: `.planning/phases/QD-78-timelinestore-owns-its-capacity/78-mutation.mjs` -> `79-mutation.mjs`. It defines `GROUPS` (one per file, each `{ config, report, files }`), `invocation(group)` = `pnpm exec stryker run stryker.devtools.mjs --mutate <file>`, `record base|close <group> [--restart]` (reads the report, checks it holds exactly the group's files and the file on disk matches, refuses a dirty tree through `dirtyReasons`, writes under `groups.<name>` with the head SHA), and `compare` (the removed-mutant rule: a fallen score passes only when killed mutants were deleted, a new Survived/NoCoverage never does, a new Ignored mutant of a kind the base lacked never does, mutants located by line numbers carried through `git diff -U0 <base> <close>`, multiset counting; `EXAMINED` records Ignored mutants run by hand); `--self-test` drives planted records. Records: `79-mutation-base.json`, `79-mutation-close.json`. Run: stdin closed, nothing else running, from the repo root. A drop is closed with a test, never re-baselined (WX-05).
- Score expectation: the dock's score is held at 1 (ADR-QD-168); close each of the five against its base after the review.

## Characterisation test design (CONF-01, WX-06)

Write it on `39d51a4d`, green there, then green unchanged after: `packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx` (a new, self-contained file; own harness, no shared helper). Cells (each shown to fail once against a deliberate edit, e.g. fold (c)):
1. Dock probe, plain and StrictMode, diagnostics + gates handed: ordered committed states; expected `[Starting, true, Listed[a], Unsampled]` only, never `Off/false/Absent/Absent`.
2. Same with diagnostics NOT handed: `[Off, false, Listed[a], Absent]` only.
3. `useDiagnostics` status per render: with options `Starting, Starting`; without `Off, Off`; StrictMode doubled renders but the same distinct states; never `Starting, Off, Starting`.
4. `useTimeline` entries/capacity per render: `0@500` then `1@50` (capacity 50) / `1@500` (omitted).
5. Activity: swapped inputs while hidden, same-rerender show, three `act`s with no settle: the first reader commit after the show holds the CURRENT registry.
6. Throw: refused capacity inside the build: one error reaches the boundary, the scope's finalizer ran, no reader committed.
After 79 the test also guards against the regression the phase exists to prevent. Delete nothing from `DockModel.characterisation.test.ts` (15 sites move to `dockModelOf`, assertions untouched).

## Code Examples

### The normaliser and the rule (sketch, in `TimelineFeed.ts` and `ExternalStore.ts`)
```ts
// TimelineFeed.ts: the one place the feed's input fields are listed. A field added to
// TimelineFeedInputs makes this a compile error (TS2741); sameFields then compares it for free.
const complete = (inputs: TimelineFeedInputs): Required<TimelineFeedInputs> => ({
  capacity: effectiveCapacity(inputs.capacity),   // throws a refused bound before anything moves; undefined == default
  source: inputs.source,
});

configure: (next) => {
  if (reads.closed()) return;
  const wanted = complete(next);                  // refusal first, as ADR-QD-191 requires
  if (sameFields(held, wanted)) return;
  held = wanted;
  let resized = true;
  try { resized = timeline.resize(wanted.capacity); } finally { readSource(wanted.source); }
},
```
```ts
// ExternalStore.ts
export function sameFields<K extends object>(a: K, b: K): boolean { /* unchanged, now exported */ }
/** The rule over an input that may be absent: absent is its own state, equal only to absent. */
export function sameFieldsOrAbsent<K extends object>(a: K | undefined, b: K | undefined): boolean {
  return a === undefined || b === undefined ? a === b : sameFields(a, b);
}
```
(`held` starts as the bare state, so the first `configure` with a source or a non-default capacity always moves; with neither, nothing starts and the bare build's `NO_SOURCE` read already stands. Planner to settle Pitfall 5.)

### The G43 stated exception (sketch, `GatesFeed.ts`)
```ts
// A watch that threw applied nothing: retry it on every configure, whether or not an input moved (G43).
if (sameFields(held, wanted) && watchFailure === undefined) return;
```

### A positive pin that can fail (sketch, `.tst.ts`)
```ts
test("a feed takes no inputs at construction, and every input is a field of its complete record", () => {
  expect<Parameters<typeof makeTimelineFeed>>().type.toBe<[]>();
  expect<Required<TimelineFeedInputs>>().type.toBe<{
    readonly capacity: number | undefined;
    readonly source: Source | undefined;
  }>();
});
```

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Constructor `init` + a second effect that re-sends the same inputs | Bare constructor, `configure` inside the build, one effect for later changes | this phase | one entry path, no unconfigured commit |
| Four hand-written restart rules | One rule over normalised complete records | this phase | a new field cannot be silently ignored |
| "`make` is read once per mount" (comment, PITFALLS) | An effect re-run on `Activity` reveal reads the latest committed closure (React 19.3.1, measured) | measured now | a ref is a fallback, not a requirement |

**Deprecated/outdated:** the `useScoped.ts:43-44` comment on `make`; PITFALLS Pitfall 6's premise; the roadmap's "today `Starting` then `Starting`" for the dock.

## Runtime State Inventory

Not a rename/refactor of stored strings: this is an API-shape change. Nothing found in any category: no stored data keyed by these names, no live-service config, no OS-registered state, no env var or secret names, and no installed artifact carrying a changed name (verified by the grep over `packages examples website spec scripts features` for the five constructors; only source, tests and docs match). Build artifacts: `packages/devtools/lib/` is rebuilt by `pnpm build`; gate 14 packs from it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node + pnpm + vitest | spikes, tests | yes | vitest 5.1.0 [VERIFIED: run header] | none needed |
| React `Activity`, StrictMode | hook tests | yes | 19.3.1 | none needed |
| Stryker (`pnpm exec stryker`) | baselines | present in `stryker.devtools.mjs` (not run this session) | unverified | none |
| tstyche, `tsc` 7.0.2 | pins | yes [VERIFIED: `tsc -v` printed `7.0.2+effect-tsgo.0.67.5`] | | none |
| React 19.2.4 (the peer floor) | confirming A1 | not installed | | install in a scratch dir and rerun the Activity pins before release |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0, `@effect/vitest`, `@testing-library/react`, happy-dom; tstyche for pins |
| Config file | `packages/devtools/vitest.config.ts` (project name `devtools`) |
| Quick run command | `npx vitest run --project devtools packages/devtools/test/<file>` |
| Full suite command | `pnpm check:pr < /dev/null` (the merge gate; `pnpm check` for the mutation step) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-01 | first-render sequence, plain and StrictMode | react | `npx vitest run --project devtools packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx` | Wave 0 |
| CONF-02 | bare build + first configure equals old init | model | `npx vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts` (and the other three) | partly |
| CONF-03 | one rule: omitted == undefined, presence, G43, capacity | model + tstyche | `npx vitest run --project devtools packages/devtools/test/model/ExternalStore.test.ts` ; `pnpm test:tstyche` | partly |
| CONF-04 | Activity and StrictMode configure with current inputs; a throw closes the scope | react | `npx vitest run --project devtools packages/devtools/test/react/useConfigured.test.tsx` | Wave 0 |
| CONF-05 | dock props = model inputs + host-only; one mapping | tstyche + model | `pnpm test:tstyche` ; `DockModel.test.ts` | Wave 0 |
| CONF-06 | docs and gates compile | gates | `pnpm spec:examples`, `pnpm spec:package`, `pnpm spec:website-examples`, `pnpm spec:api` | exist |
| WX-01..07 | per-phase | `pnpm check:pr < /dev/null` | | |

### Sampling Rate
- **Per task commit:** the single test file above.
- **Per wave merge:** `npx vitest run --project devtools` and `pnpm test:tstyche`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, plus `pnpm spec:package`, plus the mutation `compare`.

### Wave 0 Gaps
- [ ] `packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx`: CONF-01 (own harness)
- [ ] `packages/devtools/test/react/useConfigured.test.tsx`: CONF-04 (Activity x3, StrictMode, throw)
- [ ] `packages/devtools/test/builtFeeds.ts`: the four fixture helpers
- [ ] `79-mutation.mjs` plus `79-mutation-base.json` measured first, on one commit

## Security Domain

`security_enforcement` is on (`.planning/config.json`, ASVS level 1). This phase is an internal model/adapter refactor with no new input surface.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | none |
| V3 Session Management | no | none |
| V4 Access Control | no | none |
| V5 Input Validation | yes (narrow) | a refused capacity must still throw before anything moves; `effectiveCapacity`/`emptyTimeline` stay the only check, run first in each `configure` |
| V6 Cryptography | no | none |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Host code (`registry.instances`, `subscribe`, the questions thunk) reached on every host render | Denial of service | the held-fields stabiliser; G43 stays a per-configure retry, never per render |
| A stop's `reason` (a `Cause.pretty` trace with checkout paths) crossing a trust boundary | Information disclosure | unchanged: the docs and the README keep the "must not cross a trust boundary" statement; do not add the reason to any new field |
| A first configure that throws leaving a half-built model reachable | Tampering/robustness | fold (a): scope closed, nothing published (Run 6) |

## Open Questions

1. **`DockModelInputs` and the public type surface.** Making `DevtoolsDockProps extends DockModelInputs` puts a currently package-private type into a public signature.
   - Known: `extends` emits an import of `lib/model/DockModel.d.ts`, which ships.
   - Unclear: whether gate 13 (`check-api-surface.mjs`) or TS2883 wants it exported and given an overview row.
   - Recommendation: run `pnpm spec:api` and `pnpm build` in the first task of the plan that makes the change; if it objects, export the type from the barrel and add the row.
2. **Skip the bare feed's wasted `NO_SOURCE` read (Pitfall 5)?** Behaviourally invisible; decide whether the first `configure` starts the only read.
   - Recommendation: build starts no read; the first `configure` always starts one (one moved-field rule: `held` starts at an impossible sentinel only inside the feed, not exposed).
3. **Does gate 13 need a row for `sameFieldsOrAbsent`/`sameFields`?** They live in a package-private module outside the barrel, so no (AGENTS.md section 9). Confirm with `pnpm spec:api`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | An effect re-run on `Activity` reveal reads the latest committed closure on every React in the peer range `>=19.2.4`; only 19.3.1 was run | R2, Run 4 | If 19.2.x differs, fold (a) with a closure builds with stale inputs after a hidden `Activity` until the change effect corrects it; the Activity pins would catch it, and the ref fallback fixes it |
| A2 | Nothing is painted from the unconfigured commit of fold (c) in a real browser (it is followed by a synchronous re-render) | Run 3 | Only affects how strongly "flash" is worded; the recommendation does not depend on it, since a committed unconfigured state is already unacceptable |
| A3 | `Required<K>`-style normalisers compile cleanly under the project's TS 7.0.2 for the four real input types (checked on a toy interface only) | R3 | A normaliser may need a small type adjustment; the planner's first compile reveals it |
| A4 | `DevtoolsDockProps extends DockModelInputs` passes gate 13 and `.d.ts` emission without an export (Open Question 1) | R9 | An extra export plus an overview row |
| A5 | Stryker scores of `DiagnosticsFeed.ts`, `GatesFeed.ts` and `ExternalStore.ts` are 1 (ADR-QD-168 states 1 for the dock; no record for these three was read) | Mutation baselines | The base measured at plan time sets the bar, so only the claim, not the process, is affected |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Imports: `effect` submodule namespace imports only (`import * as Effect from "effect/Effect"`); relative imports carry `.ts`; `import type` for type-only; cross-package imports are named from the root. (Section 1)
- Services/layers/errors: `Context.Service` with a separate `…Shape`; layers are top-level consts; `Data.TaggedError` with the budgeted `Schema.TaggedError` exceptions; array-form `catchTag`; never `Effect.orDie` in an evaluation path. (Sections 2 to 4)
- Functions: `Effect.fn`; `Effect.fnUntraced` only in the three budgeted `Walk.ts` sites (`UNTRACED_BUDGET` must not move). Dispatch on a tag uses `Match`, never `switch` (`SWITCH_BUDGET` must not move); a table keyed by a tag the code wrote itself is allowed. (Sections 5, 5a)
- Forbidden: `async`/`await`, `new Promise`, `fs`, `Date.now`, `performance.now`, `crypto.randomUUID`, ambient `console`/`process.env`, `Effect.either`, `switch (x._tag)`, `as`, `as any`, `!`, `any`. `MODULE_STATE_BUDGET` must not grow (no module-scope `let`). (Section 6)
- Budgets: `NOT_CALLABLE_PIN_BUDGET` moves only with the AGENTS.md section 6 table; this research recommends pins that do not move it (R7). No `Record<string, unknown>` widening, no `// Stryker disable`.
- Schema/untrusted decode: not touched by this phase. (Sections 7, 7a)
- Naming: `make…` builders, `…Shape`, `…Port`; barrels `export *` alphabetical except `@qadi/devtools`'s named barrels (add nothing to the barrel for `sameFields`). (Sections 8, 9)
- Tests: `@effect/vitest` (`it.effect`, `it.layer`); `Scope.makeUnsafe`/`Scope.close(scope, Exit.void)` mid-test; coverage core 95, others 90. A new behaviour has a test shown failing once. (Section 10)
- Spec: normative; behaviour change updates the BEH doc, the invariant and the traceability matrix in the same change; TS fences in `spec/behaviors/*.md` are compiled; placeholder ids (`ADR-QD-NEXT`, etc.) are refused. (Sections 11, 12)
- React: `@qadi/react` rules do not apply to `@qadi/devtools`, but the dock's reads go through `useStoreSnapshot`, decisions are not React state, and `@qadi/react` calls no DOM API. (Section 13)
- Gates: `pnpm check` is the only definition of done; `pnpm check:pr` skips only mutation; docs are gated (gates 11 to 14); publish with `pnpm`, never `npm`. (Sections 15, 16)
- Formatting: hand-wrapped at about ninety columns; `oxfmt` is not a gate. (Section 17)
- Memory rules (the user's): never use `Record<string, unknown>` as a widened implementation type; a new case means the full closed union; complete over simple, breaking changes are fine (not in prod), compatibility is never the tiebreaker; autonomous mode decides grey areas without asking. Doc comments lead with a one-line summary, the why after.

## Sources

### Primary (HIGH confidence)
- This session's runs: the three spike files over React 19.3.1, vitest 5.1.0, `tsc` 7.0.2 (all `[VERIFIED: spike]` claims).
- Source read in full this session: `packages/devtools/src/model/{TimelineFeed,DiagnosticsFeed,GatesFeed,DockModel}.ts`, `ExternalStore.ts:90-205`, `SimulationSession.ts:225-300,500-593`, `src/react/{useScoped,useDockModel,useTimeline,useDiagnostics,useSimulationSession,DevtoolsDock,useStoreSnapshot}.ts*`, `QuestionsPanel.tsx` (the three texts), `test/model/GatesFeed.test.ts:625-720`, `ExternalStore.tst.ts`, `scripts/check-package-install.mjs:640-730`.
- `.planning/ROADMAP.md` Phase 79, `.planning/REQUIREMENTS.md`, `.planning/phases/_WAVE14-CONTEXT.md`, `.planning/research/{ARCHITECTURE,PITFALLS}.md` (Phase 79 parts), `78-CONTEXT.md` D-13, `78-VERIFICATION.md`, `78-mutation.mjs`, `78-mutation-{base,close}.json`, `stryker.devtools.mjs`, ADR-QD-137/173/185/191/162/169 excerpts.

### Secondary (MEDIUM confidence)
- React's effect re-creation on `Activity` reveal: inferred from the measured behaviour on 19.3.1 and the way `updateEffectImpl` stores the latest `create`; not read from React's source this session.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new.
- Architecture and recommendations R1 to R11: HIGH where a run backs them (R1, R2 on 19.3.1, R5, R6, R8, R9, R10), MEDIUM for the exact shape of the hook and normalisers (sketches, to be settled at planning).
- Pitfalls: HIGH, each from a run or a read line.

**Research date:** 2026-11-24
**Valid until:** until Phase 79 starts executing, or until `react` moves off 19.3.1 (the Activity pins are the alarm).
