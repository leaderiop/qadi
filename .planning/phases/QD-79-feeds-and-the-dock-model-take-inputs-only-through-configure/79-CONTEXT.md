# Phase 79: Feeds and the dock model take inputs only through `configure` - Context

**Gathered:** 2026-11-24 (smart discuss, autonomous mode; every decision below was decided autonomously on 2026-11-24 under the owner's standing instruction "always pick the most complete and clean solution, not the simplest")
**Status:** Ready for planning

<domain>
## Phase Boundary

Today each devtools feed and the dock model take their inputs twice: once at construction (`init`) and again through `configure`. Four problems follow from that.

1. **Three input types.** The same eight-field input set is written as three types:
   - `DevtoolsDockProps` (`DevtoolsDock.tsx:80-152`);
   - `UseDockModelInput` (`useDockModel.ts:28-37`);
   - `DockModelInputs` (`DockModel.ts:84-103`).
2. **Two mapping sites.** `DockModel` maps its inputs onto each feed twice, once in the build and once in `configure`. The timeline mapping sits at `:206` and `:308`, the gates mapping at `:245-249` and `:319-323`, and the diagnostics mapping at `:234` and `:324`.
3. **Four hand-written restart rules.** Each answers "did an input move?" in its own way:
   - timeline: capacity, then source;
   - diagnostics (`DiagnosticsFeed.ts:197-200`);
   - gates (`GatesFeed.ts:261-268`), plus the G43 retry;
   - dock: an unconditional `refresh()`.

   A new input field compiles and never restarts anything.
4. **Two hand-built "build, then configure" hooks.** `useDockModel`, `useTimeline` and `useDiagnostics` each hand-build "build in a scope, then configure in a second effect".

After this phase:
- `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` and `makeDockModel` are built with **no inputs**, and `configure` is the only way inputs arrive. A first `configure(i)` produces what `make…(i)` produces today.
- One per-field identity rule, `sameFields` (the rule `makeDerivedStore` already uses), decides whether an input moved. It is applied to inputs normalised to complete records.
- One package-private hook, `useConfigured`, builds in a scope and configures before anything is published.
- The dock's input type is stated once: `UseDockModelInput` is deleted, and `DevtoolsDockProps extends DockModelInputs` plus the two host-only props.
- Inputs are mapped onto the feeds in one place in `DockModel`.

ARCH-126. Package: `@qadi/devtools`, a **minor** changeset marked **Breaking** (the three public feed constructors lose their argument). It amends ADR-QD-137, ADR-QD-173 and ADR-QD-185 through the new ADR-QD-192.

The evidence base is `79-RESEARCH.md`. Its spike was RUN on the phase base `39d51a4d` with React 19.3.1, and every decision below cites a run from it.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE14-CONTEXT.md`, ROADMAP, REQUIREMENTS)
- **D-01:** Branch `arch-wave-14` only. Phases run strictly one at a time, sequentially on the main tree (`use_worktrees` is false). No merge, push, tag, release, publish or `changeset version`.
- **D-02:** Only the reserved records are used:
  - ADR-QD-192, which amends ADR-QD-137, ADR-QD-173 and ADR-QD-185;
  - CCR-QD-471;
  - BEH-QD-731..735;
  - INV-QD-403..404.

  `node scripts/next-id.mjs` is never run. A reserved number left unused is named "Unused" in the CCR row.
- **D-03:** Behaviour changes are guarded by tests written first.
  - Every behaviour change is preceded by a characterisation or regression test written on the phase base: RED for a defect, green for preserved behaviour.
  - Every new check is shown failing once.
  - A mutation survivor is closed with a test, never by re-baselining.

### The first render and the configure fold (CONF-01, CONF-04)
- **D-04 — fold (a): configure inside the scoped build, before the value is published.**
  - **Mechanism:** the shared hook's build effect runs `configure(built, inputs)` inside the scoped build, before `useScoped`'s `setValue` publishes the value. No reader ever sees an unconfigured model.
  - **Evidence:** Runs 1, 3 and 4.
    - Fold (a) leaves every measured sequence identical to today: renders, commits, and the gate registry's `subscribe` and `instances()` counts, both plain and under StrictMode.
    - Fold (c), which keeps configure only in the second effect, commits an unconfigured model. The Questions panel's join then falsely says "No live guards were handed to the dock", and `useDiagnostics` goes `Starting → Off → Starting`.
  - **Rejected:** fold (c). A latest-inputs ref is also rejected; see D-05.
- **D-05 — the latest inputs reach the build through the current render's closure. No ref.**
  - **Mechanism:** `useScoped`'s build effect has `[]` deps, but React stores the latest committed `create` for it. A StrictMode remount and an `Activity` reveal therefore re-run the build with the inputs of the latest committed render.
  - **Evidence:** Run 4 measured this in all three Activity scenarios: props swapped while hidden, hide and show in one rerender, and three un-settled `act`s. The build's own log read the current inputs.
  - **Pins:** tests that fail if a React upgrade changes this. They assert on the first reader commit after a reveal AND on the inputs the build itself received.
  - **Fallback:** if a pin ever fails, move to a ref written in a layout effect declared before the build effect. Never use a render-phase write. Record this fallback in ADR-QD-192.
  - **Comment correction:** the `useScoped.ts` comment "`make` is read once per mount" is corrected. The build runs once per mount, and a remount or reveal re-runs it with the latest committed closure.
- **D-06 — the hook does not decide whether an input moved; the model's rule does.**
  - `useConfigured`'s change effect re-applies the current inputs after every commit in which the inputs record changed identity.
  - `configure` with no moved field must change nothing observable: no publish, no restart, no re-read. A test pins this per feed and for the dock.
  - There is no render-phase ref write and no second copy of the rule in React. This is the phase's point: one rule, in one place, under the model's mutation gate.
  - **Rejected:** the research's `useHeldFields` render-phase ref, because it writes a ref during render and would restate the rule in the hook.
- **D-07 — a throw during the first `configure` closes the scope, publishes nothing, and reaches the error boundary as the original error.**
  - This is what fold (a) already does through `useScoped`'s existing `catch` (Run 6). It is also today's behaviour for a refused capacity at construction.
  - A test pins it: an invalid capacity on first mount gives no reader commit, the scope closed, and the boundary receiving the error.
- **D-08 — the characterisation file is written on the phase base and green there.**
  - **Location:** `packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx`.
  - **What it pins:** the dock's first-render sequence (diagnostics status, `isUnsampled`, the gates feed, the Questions join) with diagnostics handed and with diagnostics off, plain and under `<StrictMode>`. It also pins the same for the public `useTimeline` / `useDiagnostics`.
  - **The Activity pins from D-05** go in this file, or in a sibling characterisation file.
  - **How it reads:** it reads `model.diagnostics`, `model.questions` and the gates store directly, and does not render `QuestionsPanel`. Phase 80 adds a `lens` prop there, and edits the shared helpers.
  - **Isolation:** it must not import `questionsPanelInput.ts`, `dockModelFixtures.ts` or `helpers.ts`. It is held to its first commit the way Phases 74 and 75 held theirs: a recorded content hash, checked at close.

### The bare constructors (CONF-02)
- **D-09 — `makeTimelineFeed()`, `makeDiagnosticsFeed()`, `makeGatesFeed()` and `makeDockModel()` take no arguments.**
  - **Equivalences:**
    - A bare `make…()` is exactly today's `make…({})`; for diagnostics, today's `make…(undefined)`, which is off. A bare timeline feed therefore keeps today's `NO_SOURCE` read; no special case for "unconfigured".
    - `make…()` followed by `configure(i)` reaches the same state as today's `make…(i)`. The research's Run 5 measured this.
  - **Tests:** per feed and for the dock, a table-driven equivalence test over each field covers both.
  - **Rejected:** skipping the bare timeline feed's `NO_SOURCE` read. It would make "bare" a third state beside "configured" and "configured with nothing".
- **D-10 — a reader subscribed BEFORE the first `configure` hears that configure's publishes.**
  - Measured counts: timeline 2, dock 2, explorer 3, simulation 3, diagnostics 1, questions 2, services 1.
  - This is a stated consequence for headless hosts, recorded in ADR-QD-192 and in the BEH text. React readers never see it, because the hook configures before publishing (D-04).
  - It is pinned by one test, so the counts cannot drift silently.
- **D-11 — `makeSimulationSession` and `useSimulationSession` are left out, with the reason recorded in ADR-QD-192.**
  - The session has no `configure`. It has three independent commands: `setSightings`, `seed(entry)` and `setPorts`.
  - `seed` is a re-seeding command whose rule is that a host replaying through `session.replay` is never overridden by an unchanged `seed` prop (`useSimulationSession.ts:59-60`). Folding the three into one `configure` would merge rules that differ by design.
  - This satisfies CONF-02's and CONF-04's "if it has the same shape" / "where it fits" by recorded reason, not by omission.

### One per-field identity rule (CONF-03)
- **D-12 — `sameFields` is unchanged and exported from `ExternalStore.ts`, not from the barrel.**
  - Each feed and the dock compare normalised inputs with it.
  - The two existing tests stay as they are: a field on one side only is a change (`ExternalStore.test.ts:444`, `:491`).
- **D-13 — each input type has exactly one normaliser, declared `(inputs: I) => Required<I>`.**
  - **Where:** in `model/`, beside its type, so it sits under the mutation gate.
  - **How it is used:** `configure` normalises its argument first.
  - **What it settles:** omitted and `undefined` become the same field, so `{a}` and `{a, b: undefined}` stop differing. This holds because every compared record is complete.
  - **Compile force:** under `exactOptionalPropertyTypes`, a literal missing a field of a `Required<…>` record is a compile error. Adding a field to an input type therefore fails `pnpm typecheck` at the one line that lists the fields.
  - **Capacity:** the timeline normaliser maps `capacity` through `effectiveCapacity`. `undefined`, omitted and `DEFAULT_TIMELINE_CAPACITY` therefore compare equal (Run 7 measured that nothing is wiped).
- **D-14 — refusing a capacity happens before anything moves, in the normaliser, for the feed and for the dock alike.**
  - Phase 78's whole-or-nothing rule for the dock (ADR-QD-191, D-13 there) is kept: the capacity is checked first, then `try { timeline configure } finally { the rest }`, and a listener throw still applies the rest and then rethrows (ADR-QD-177).
  - M55 and M56 keep their assertions unedited.
- **D-15 — diagnostics presence uses one exported sibling of the rule, `sameFieldsOrAbsent(a, b)`.**
  - **Placement:** it sits in `ExternalStore.ts` beside `sameFields`.
  - **Rule:** absent equals only absent; otherwise `sameFields`. `{}` (on) normalises to the complete `{ layer, collector, intervalMillis }` record, so on and off stay a distinct transition.
  - **Off feed:** `configure(undefined)` on a feed already off still publishes nothing (ADR-QD-173 decision 8).
- **D-16 — G43 is a stated exception, not part of the rule.**
  - **What it is:** the gates feed re-subscribes after a failed watch even when no input moved. `GatesFeed` guards with `if (sameFields(held, next) && watchFailure === undefined) return`, with a one-line comment and ADR-QD-192 saying why.
  - **Why an exception:** the rule answers "did an input move?", and G43 is a retry that must fire when nothing moved. Folding it in would need an "applied" sentinel that blurs what the rule means.
  - G43 keeps its assertions.
- **D-17 — the type pins, all of which can fail.** No negative `not.toBeCallableWith` pin is added, so `NOT_CALLABLE_PIN_BUDGET` and its AGENTS.md §6 table stay unmoved.
  1. The compile force of D-13.
  2. A golden pin per normalised input type in a `.tst.ts`, in the form `surface.tst.ts` already uses for `DiagnosticsOptions`: `expect<Required<TimelineFeedInputs>>().type.toBe<{ … }>()`.
  3. A `@ts-expect-error` negative, a complete-record literal missing one field, next to its accepted positive twin, in the `ExternalStore.tst.ts` style.
  4. `expect<Parameters<typeof makeTimelineFeed>>().type.toBe<[]>()`, and the same for `makeDiagnosticsFeed` and `makeGatesFeed`, in `surface.tst.ts`, replacing today's constructor-input pins.
- **D-18 — behaviour backing for the type pins: a per-feed and per-dock "each input moved alone" sweep.**
  - It is keyed by a compile-forced complete `Record<keyof Required<I>, Mover>`, and asserts that the feed reacted.
  - This guards against "compiles and never restarts". No type can force what a new field does.

### The dock's input type and its one mapping site (CONF-05)
- **D-19 — `UseDockModelInput` is deleted.**
  - `DevtoolsDockProps` becomes `export interface DevtoolsDockProps extends DockModelInputs { readonly unknownParents?: …; readonly onInvalidate?: … }`, and each prop's doc comment moves onto `DockModelInputs`.
  - `DockModelInputs` stays package-private, because `makeDockModel` is not public.
  - **Fallback, if the emitted `.d.ts` or the packed consumer cannot name it:** export the type only from the barrel, with a `spec/overview.md` row (gate 13 `scripts/check-api-surface.mjs`). The planner proves this early: `pnpm build` plus gate 14 `scripts/check-package-install.mjs` compiling a consumer that passes every prop.
- **D-20 — one mapping function beside `DockModelInputs`.**
  - It maps the dock's inputs onto each feed and returns the normalised feed inputs. This is where `intervalMillis` crosses from diagnostics to gates.
  - `DockModel.configure` uses it once. The dispatch order (timeline, then gates, then diagnostics, then `shownReading.refresh()`) stays written once, in `configure`. The rule decides whether a feed restarts, never the order.

### The hook (CONF-04)
- **D-21 — one package-private hook, `react/useConfigured.ts`, built on `useScoped`. It is kept out of the barrel (AGENTS.md §9).**
  - `useDockModel`, `useTimeline` and `useDiagnostics` use it. The public hooks keep their signatures.
  - It stays thin: every rule it relies on (normalisers, `sameFields`, `sameFieldsOrAbsent`, the mapping) lives in `model/`, where `stryker.devtools.mjs` mutates. The hook is covered by vitest and the coverage threshold.

### Tests and their churn
- **D-22 — about 201 construction sites move onto one fixture helper, `packages/devtools/test/builtFeeds.ts`.**
  - Its functions are `timelineFeedOf`, `diagnosticsFeedOf`, `gatesFeedOf` and `dockModelOf`, each "build bare, then configure".
- **D-23 — the pinned tests are migrated by construction lines only.**
  - The pinned tests are TF4, TF14, TF26, TF27, TF29, G43, M55, M56 and the Phase 78 resize rules.
  - Their assertions stay byte-identical. A diff check, run at close, shows that only construction lines changed in them.

### Records (CONF-06)
- **D-24 — same-plan changes.** These consumers change in the same plan as the signature change:
  - gate 14's packed consumer (`scripts/check-package-install.mjs`, a template string only `pnpm spec:package` compiles);
  - `surface.tst.ts`;
  - the compiled README fence;
  - the website's devtools page;
  - the compiled `upgrading.md` "After" fence (`:1044-1056`);
  - the `spec/behaviors` fences (BEH-QD-636..639 and doc 28);
  - the ADR fences;
  - the `spec/overview.md` rows.

  A plan that changes a signature leaves no consumer broken at its commit.
- **D-25 — ADR-QD-192 records D-04..D-21.**
  - **Amends:** it carries dated amendments of ADR-QD-137, ADR-QD-173 and ADR-QD-185, and its `useScoped` section supersedes the "`make` is read once" premise.
  - **Other records:**
    - BEH-QD-731..735 and INV-QD-403..404;
    - a traceability row, and a CCR-QD-471 row naming each document at its HEAD revision;
    - `spec-revise` for every revision line;
    - a **Breaking** `@qadi/devtools` minor changeset;
    - an upgrade-guide section under 0.13.
- **D-26 — mutation.**
  - Copy Phase 78's scorer to `79-mutation.mjs` with five groups: `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts` and `DockModel.ts`, plus any new `model/` file. A new model file is close-only, with no open mutant allowed.
  - Commit the base record alone, first, at the phase base.
  - Re-close after the code review, on one commit, with `compare` exiting 0.
  - DockModel holds a score of 1 (ADR-QD-168).

### Claude's Discretion
- Exact names of the normalisers, the mapping function and the fixture helpers; `useConfigured`'s exact parameter shape (`make` as an Effect, or a thunk); and the file that holds the Activity pins. All of them must keep D-04..D-21.
- The plan split and the wave order. Characterisation and RED tests come first, then the base mutation record, then the source change, then records, then the mutation close and the gate.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExternalStore.ts`:
  - `sameFields` (private today, `:133-146`), used by `makeDerivedStore` under a `Required<K>` bound;
  - `sameElements`;
  - `makeExternalStore`'s `set` (notifies on a new reference only) and `publish` (notifies unconditionally).
- `useScoped.ts`: a layout-effect scoped build. Its `catch` closes the scope on a throwing build, and its cleanup clears the value for a hidden `Activity`.
- `TimelineFeed.ts` after Phase 78: one store, `effectiveCapacity` (kept out of the barrel), and `configure` = capacity check, then `try { resize } finally { readSource }`.
- `DockModel.ts` after Phase 78: `effectiveCapacity` checked before `inputs = next`, then `try { timelineFeed.configure } finally { the rest }`.
- Phase 78's `78-mutation.mjs` scorer, with `record base|close <group> [--restart]`, `compare` and `--self-test`: the pattern for `79-mutation.mjs`.

### Established Patterns
- Headless model first, with a thin React adapter that decides nothing (`useDockModel.ts`'s header, ARCH-74, ADR-QD-099).
- Doubles and scripted ports in tests rather than hand-built layers (AGENTS.md §6).
- Characterisation files held to their first commit by a recorded hash (Phases 74 and 75).
- The doc-comment shape: a one-line summary first, then the why.

### Integration Points
- **Public barrel `packages/devtools/src/index.ts`:** `makeTimelineFeed` (:128), `makeDiagnosticsFeed` (:25), `makeGatesFeed` (:50) and the `…Inputs` types.
- **React entry `src/react/index.ts`:** `DevtoolsDockProps`.
- **Gate 14's consumer:** `scripts/check-package-install.mjs`, imports at :507-509 and calls at :653, :680-681 and :711-712.
- **Docs:**
  - `website/` devtools page and `upgrading.md`;
  - `packages/devtools/README.md`;
  - `spec/overview.md`;
  - `spec/behaviors/28-*`;
  - ADR-QD-137, ADR-QD-173 and ADR-QD-185.
</code_context>

<specifics>
## Specific Ideas

- `useConfigured` sketch. The names are the planner's:
  ```text
  build:  useScoped(() => make.pipe(tap(built => sync(() => configure(built, inputs)))))
  change: useLayoutEffect(() => { if (value !== undefined) configure(value, inputs) }, [value, inputs])
  ```
  The feed or dock's own rule makes the second call a no-op when nothing moved (D-06).
- The research's condensed spike harness (`79-RESEARCH.md`, "Spike results") is the starting point for the characterisation and Activity pins. Copies of the spike files are in the session scratchpad, `spike-copy/`.
</specifics>

<deferred>
## Deferred Ideas

- Running the Activity pins against React 19.2.4, the peer floor, in CI: a CI matrix is not part of `pnpm check`. Today the pins run on the installed 19.3.1. This is recorded as a risk in ADR-QD-192.
- Structural (deep) identity for feed inputs: identity is the rule. This is carried from REQUIREMENTS "Future".
- A `configure` for `SimulationSession`: D-11.
</deferred>

## Workflow note (decided autonomously, 2026-11-24)

Phase 79 touches React hooks and `DevtoolsDock.tsx`, but it changes no rendered markup, styling or layout. The characterisation test pins identical render sequences. The ROADMAP Phase 79 section therefore carries the authoritative `**UI hint**: no` line, so the UI-SPEC step and the post-wave `ui-safety-gate` do not treat a hook or a `.tsx` test file as a visual surface. This is the same resolution Phase 78 recorded.
