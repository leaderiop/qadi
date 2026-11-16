# Phase 49: Gates as the dock model's eighth store, one gate-state vocabulary - Research

**Researched:** 2026-11-16 (branch `arch-wave-10`, HEAD `634f5926`; `packages/*/src` is unchanged since Phase 48, so every line number below is the phase base's)
**Domain:** `@qadi/core` (new `GateState.ts`, ADR-QD-152 pattern), `@qadi/react` (`GateWriter.ts`, `GateRegistry.ts`, `DevtoolsFeed.ts`), `@qadi/devtools` (`model/Gates.ts`, `model/DockModel.ts`, `react/useDockModel.ts`, `react/DevtoolsDock.tsx`, `react/QuestionsPanel.tsx`), Effect 4.1.2, React 19 `Activity`, tstyche 7.2.5, Stryker 10.1.1, spec records
**Confidence:** HIGH on the vocabulary, the derivations, the store design and the characterisation (every one was built as a throwaway in-tree implementation, compiled, run against the existing suites and then reverted); HIGH on mutation commands and base scores; MEDIUM on the spec-record wording (read from the Phase 48 templates, not yet written); one open question needs a user decision (`useDevtoolsFeed`, Open Question 1).

All probes were temporary edits or files, each reverted or deleted. After the last one `git status --short packages` prints nothing, and `git status --short` shows only the pre-existing `.planning/`, `.agents/`, `.codex/` and `.vitest/` entries. Nothing was staged, committed or pushed, `scripts/next-id.mjs` was not run, and no tracked file is modified. Probe sources and raw outputs were kept outside the repo (the session scratchpad) and are not needed to plan.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The vocabulary in core (GATE-01)**
- **D-01:** Follow the ADR-QD-152 pattern (`packages/core/src/HydrationMetrics.ts`).
  - A new core module `GateState.ts` holds a module-private keyed table.
  - `GateState` is read off its keys. Core exports an `isGateState` guard (`Object.hasOwn`) and `gateStates` in declaration order (no cast).
  - The table itself is not exported.
  - It reaches the barrel through `export *` and gets `spec/overview.md` rows (gate 13).
- **D-02:** The table's declaration order is "worst news first": Failed, Denied, Rechecking, Pending, Allowed (today's `GATE_DISPLAY` key order).
  - Display words (`"Error"`, `"Deny"`, `"Allow"`) are devtools vocabulary and stay in devtools. Core does not carry them.
  - Each row carries only what is state-generic. If research finds nothing state-generic beyond the order, an empty row is acceptable; ADR-152 rows carry meaning, and this table may carry less.
- **D-03:** React: `GateRenderState = GateState` (derived from core).
  - React's `DecisionOutcome` stays its own `Data.TaggedEnum`.
  - A tstyche test pins `DecisionOutcome["_tag"]` equal to core's `GateState` both ways, so a sixth outcome in either place fails to compile.
  - `packages/react/test/DecisionOutcome.tst.ts:40-41` is updated accordingly.
- **D-04:** Devtools:
  - `GATE_DISPLAY` is typed `{ readonly [K in GateState]: DisplayState }`, so a new core state is a devtools compile error.
  - `GATE_STATES` and `displayOfGateState` read core's `gateStates`/`isGateState`.
  - Devtools takes no dependency on `@qadi/react` (ADR-QD-053/080); it reads only `@qadi/core`.

**What devtools accepts, unknown states (GATE-02)**
- **D-05:** `GateInstanceLike.state` stays `string`.
  - A devtools build may be paired with a newer react, so an unknown state is shown as `Unrecognised`, never dropped and never as an answer.
  - The existing unknown-state rows stay, including `"toString"` (`packages/devtools/test/model/Gates.test.ts:220-235`).
- **D-06:** `GateInstanceLike.kind` stays `string`. Tying it to `GateKind` is deferred.
- **D-07:** `GATE_DISPLAY` stays private. `GATE_STATES` keeps its exports and order. `gateGroups` stays unexported (`packages/devtools/test/surface.tst.ts:134`).

**The gate store and the dock's prop (GATE-03)**
- **D-08:** `DockModelInputs` gains `gates?: GateRegistryLike`, a structural `{ subscribe, instances }`.
  - React's `GateRegistry` (`packages/react/src/GateWriter.ts:115-120`) satisfies it without devtools importing react.
  - The model subscribes to it, within the model's scope (ADR-QD-137).
- **D-09:** `DevtoolsDock`'s public `gates` prop becomes `GateRegistryLike` only, replacing `ReadonlyArray<GateInstanceLike>`.
  - This is **Breaking** for `@qadi/devtools` (minor, marked Breaking).
  - The 0.13 `upgrading.md` entry says: pass the registry (`atoms.gates`, or the provider's registry) instead of `useGateInstances()`'s array.
  - Closed input over widening: there is no array-or-registry union.
- **D-10:** The model gains a `questions` store. Its one snapshot holds:
  - the polled questions, joined with the gate instances, each row with its instances;
  - whether gates are absent or empty.

  It is recomputed when either the diagnostics poll publishes or the registry notifies, and keeps the same reference until something changes. The join moves out of the view and into `model/Gates.ts`/the model; `instancesAsking`/`gateGroups` become model-side.
- **D-11:** Counting. The ADR and `DockModel.ts`'s header recount precisely: gates is the eighth store, and `sightings` stays a thunk. This fixes the header's current "eight readouts" arithmetic (`DockModel.ts:2, 20-24`).

**The panel, tests and evidence (GATE-03..05, WX-05/06)**
- **D-12:** `QuestionsPanel` renders the model's one `questions` snapshot.
  - No `gates` prop, and no `gateGroups`/`instancesAsking` call in the view.
  - It keeps the absent-versus-empty messages (`QuestionsPanel.tsx:115-117`) and the lens, pick and Activity behaviour exactly as today.
- **D-12a:** One deliberate copy edit (user decision during the UI contract, 2026-11-16). The gates-absent message's advice changes from `useGateInstances()` / `atoms.gates.instances()` to `Pass gates — usually atoms.gates, from @qadi/react — to list who is asking.`, because the old advice no longer type-checks after D-09. The one assertion on it in `QuestionsPanel.gates.test.tsx` is updated in the same commit, and ADR-QD-162 names it. Every other string stays byte-identical. `QuestionsPanel` is not exported, so its props are package-private and add no Breaking line.
- **D-13:** Characterisation first. A byte-exact test of the panel's current rows on the phase base is committed before any `packages/*/src` edit. It covers:
  - absent and empty gates;
  - one row per guard;
  - Deny vs Failure;
  - asked but unmounted;
  - an unknown state shown as `Unrecognised`.

  Existing panel tests that pass a `gates` array change only their input to a registry double; every expected value stays unchanged.
- **D-14:** A headless join test in `packages/devtools/test/model/DockModel.test.ts`. It is a fast-check property that interleaves registry changes and poll ticks under `TestClock`. Every snapshot's rows equal the join of questions and instances from one moment, with no render (the ARCH-74/82 store pattern).
- **D-15:** The mutation base uses the existing configs with `--mutate` and never edits them:
  - devtools `model/DockModel.ts` and `model/Gates.ts` (`stryker.devtools.mjs`);
  - react `GateWriter.ts` (`stryker.react.mjs`, if `--mutate` reaches it);
  - the new core `GateState.ts`, recorded as `new`.

  `QuestionsPanel.tsx` and `DevtoolsDock.tsx` are recorded as not instrumentable (the devtools config mutates `src/model/**` only), as `ServicesPanel.tsx` was in Phase 47. `ignoreStatic` means the tables themselves are not mutated (ADR-076). No touched file's score may drop.
- **D-16:** Instrumentation off (§13). With no registry, nothing is registered or rendered, and the panel shows today's "absent" message. The react suite passes untouched, apart from the tstyche pin in D-03.

**Records**
- **D-17:**
  - **ADR-QD-162:** amends the dock model's store set (the ARCH-74/82 lineage), applies the ADR-QD-152 pattern to the gate vocabulary, and keeps ADR-QD-053/080.
  - **Spec ids:** CCR-QD-440, BEH-QD-581..585, INV-QD-343..344.
  - **Changesets:**
    - `@qadi/core` minor: the vocabulary.
    - `@qadi/react` patch: `GateRenderState` derives from core.
    - `@qadi/devtools` minor, **Breaking**: the `gates` prop's type.
  - **Docs:** `spec/overview.md` rows (core's new exports; devtools' `GateInstanceLike` row unchanged or updated; line 585's statement about react's `GateRenderState`), the devtools and react docs that show `gates={useGateInstances()}`, and the 0.13 upgrade entry.

### Claude's Discretion
- The structural registry type's exact name (`GateRegistryLike`, following the `…Like` convention, AGENTS.md §8) and where it lives in devtools (`model/Gates.ts`).
- The store's snapshot shape (a closed tagged union for absent versus present is preferred over a boolean).
- How `useDockModel` receives the registry, and the order of plans within the RED-first shape.

### Deferred Ideas (OUT OF SCOPE)
- State the gate kinds (`GateKind`) once in core, and type devtools' `GateInstanceLike.kind` from it.
- Make `sightings` a dock-model store.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GATE-01 | The five gate-state words are stated once in `@qadi/core` (the ADR-152 pattern). React's `GateRenderState` and devtools' `GATE_DISPLAY` derive from that statement, and devtools takes no dependency on `@qadi/react`. | Q1 (module, 0 mutants, gate 13 rows), Q2 (react derivation, two-way pin with RED output on both sides), Q3 (devtools derivation, TS2741 on a sixth word). |
| GATE-02 | A state this build does not know is still shown as `Unrecognised`, never as an answer. | Q3 (`"toString"` row passes after the derivation), Q5 (characterisation cell `unrecognised and toString`). |
| GATE-03 | The gate registry (structural `subscribe`/`instances`) is a `makeDockModel` store; the model produces the joined rows and `QuestionsPanel` renders one snapshot. | Q4 (store, snapshot type, recompute, scope), Q5 (panel), Q7 (call sites, host wiring, Open Question 1). |
| GATE-04 | The join is tested headlessly through the dock model. | Q6 (fast-check property under `TestClock`, with a RED negative control). |
| GATE-05 | With instrumentation off, nothing is registered or rendered (§13), and the react suite passes untouched. | Q4 (no registry means nothing subscribed), Q2 (react suite 518/518 after the derivation), Open Question 1 (the one place "untouched" is at risk). |
| WX-01 | `pnpm check:pr < /dev/null` is green at the end of the phase. | Validation Architecture (the constituent steps, the gate each edit trips). |
| WX-02 | ADR, CCR row, BEH/INV/traceability, reserved numbers only, `next-id.mjs` never run. | Q9 (all eight reserved ids confirmed unused by `grep`, templates). |
| WX-03 | `spec/overview.md` names every added export and drops every removed one (gate 13). | Q1 and Q9 (the exact gate output for the four new names). |
| WX-04 | Nothing new from the forbidden list; budgets change only with their AGENTS.md table. | Project Constraints; Q1-Q4 (no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, ambient clock). `pnpm lint` ran clean on the scratch implementation except for the throwaway probe's own `!`. |
| WX-05 | Coverage holds (core 95, others 90); touched files' Stryker score does not fall. | Q8 (commands, base scores, the nine mutants a naive implementation leaves alive). |
| WX-06 | Every behaviour change is preceded by a characterisation or regression test written on the phase base. | Q5 (twelve-cell characterisation, deterministic across two base runs, diff against the new implementation). |
| WX-07 | Every public break is **Breaking** in its changeset and in `upgrading.md`. Nothing is released. | Q9, Q7 (what breaks: `DevtoolsDockProps.gates`, and `DevtoolsFeed.gates` under Option A). |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

`CLAUDE.md` is `@AGENTS.md`; every rule below is binding with the authority of a locked decision. Quoted rules are from `/Users/mohammadalmechkor/Projects/Perso/qadi/AGENTS.md` (read this session).

- **Imports (§1):** `import * as X from "effect/X"` only; relative imports carry `.ts`/`.tsx`; `import type` for type-only; cross-package imports are named imports from the dependency's root (`import { gateStates, isGateState } from "@qadi/core"`).
- **Services/layers/errors (§2-§4):** no new service, layer or error is needed by this phase. A `Schema.TaggedError` is not added (`SCHEMA_ERROR_BUDGET`).
- **Dispatch (§5a):** `Match`, not `switch`. New view dispatch on a closed tagged union uses a hoisted `Match.type<…>().pipe(Match.tagsExhaustive(…))`. `SWITCH_BUDGET` stays at three; a fourth `switch` fails gate 4.
- **Functions (§5):** `Effect.fn`; `Effect.fnUntraced` budget stays at three (`UNTRACED_BUDGET`). `makeDockModel` is already `Effect.fn("qadi.devtools.makeDockModel")`.
- **Forbidden (§6):** `as`, `as any`, `!`, `any`; `async`/`await`; `console.*`, `process.env`; `Date.now`, `new Date`, `performance.now`; `Effect.either`. Sync CPU calls are wrapped in `Effect.sync`. `Record<string, unknown>` as a widened implementation type is a hack (user memory): the state table is a `satisfies` row type, not a widened record.
- **Schema (§7):** the gate vocabulary is a table-derived union (ADR-QD-152), not a hand-written union restated in two packages. Untrusted-decode budget (§7a) is not touched: no `JSON.parse`/`Schema.decode*` token is added.
- **Barrels (§9):** core `export *` alphabetical (`GateState.ts` sorts between `Explanation.ts` and `GuardHealthCheck.ts`, `packages/core/src/index.ts:23-24`). `@qadi/devtools`' two barrels name exports per module; the `devtools-named-barrel` house-style rule refuses `export *` there. `GateRegistryLike` is a named type export.
- **Tests (§10):** `@effect/vitest` `it.effect`, `TestClock`; a test that closes a scope mid-test builds it with `Scope.make()`, provides it with `Scope.provide`, closes it with `Scope.close(scope, Exit.void)`. Coverage: core 95%, everything else 90%.
- **Spec (§11, §12, §15):** `spec/` is normative; ` ```typescript ` fences are compiled by gate `spec:examples`, ` ```ts ` fences are listings; `spec/overview.md` must name every export (gate 13, `scripts/check-api-surface.mjs`); a placeholder id is refused (`[no-numbering-placeholder]`), so only the reserved numbers are used.
- **React (§13):** no React state for decisions; read decisions through `outcomeOf`; **"A guard may record that it exists, what it renders now, and where — never a retained verdict"**, so the dock model's `questions` store holds guard instances and questions, never a decision; **"Instrumentation is opt-in, and off means absent"**: with no registry handed over nothing registers and the panel shows the absent message; `@qadi/react` calls no DOM API (the pick lens stays in `@qadi/devtools`); the `DECISION_READ_BUDGET` refuses a raw `AsyncResult` read outside its two files (not touched here).
- **Publishing (§16):** pnpm only, the changeset `fixed` group (all nine packages version together), `tsconfig.build.json` unchanged (no new package).
- **User memory:** closed union over widening (`GatesView`/`QuestionsView` are closed `Data.TaggedEnum`s, and D-09 forbids an array-or-registry union); prefer the cleanest and most complete design, breaking changes are acceptable and compatibility is never the tie-breaker; never run a release.
- **Run rules for this research:** do not edit tracked files, stage or commit; never run `scripts/next-id.mjs`; never push; the shell's `grep` is ugrep, use `/usr/bin/grep`; ignore `.stryker-tmp/`.

## Summary

The phase is two independent changes that meet in `model/Gates.ts`. The vocabulary change is small and fully verified: a new core `GateState.ts` copies `HydrationMetrics.ts`'s four moves (private `as const satisfies` table, `keyof typeof`, `Object.hasOwn` guard, `Object.keys(...).filter(guard)` list). Rows are empty, because nothing state-generic exists beyond the order and a field nobody reads would be an untested, unobservable surface. React's `GateRenderState` becomes `GateState` and the existing tstyche pin passes unchanged; a two-way `Exclude` pin fails with a named error when a sixth word is added on either side. Devtools' private union goes, `GATE_DISPLAY` is typed over core's `GateState`, and a sixth core word is TS2741 in devtools only. Core adds three exports, devtools adds one (`GateRegistryLike`), and gate 13 names all four.

The store change is a tagged-union snapshot built by a pure `joinQuestions` and held in an eighth `makeExternalStore` inside `makeDockModel`. The model reads both sources in one synchronous step (the merged diagnostics reading and `registry.instances()`), recomputes on a poll publish or a registry notification, skips the `set` when none of the three inputs changed by reference (so a quiet poll tick keeps the snapshot reference), subscribes to the registry inside the model's `Scope` with a finalizer, and re-subscribes only when `configure` receives a different registry. The panel reads the snapshot with `useStoreSnapshot` and a hoisted `Match.tagsExhaustive`; the characterisation (twelve cells, serialised through the public `DevtoolsDock`, identical across two base runs) is byte-identical after the change except for the one D-12a sentence. A fast-check property that interleaves registry changes and poll ticks under `TestClock` passes against the design and fails against a torn join, and Activity hide/show plus StrictMode leave exactly one registry subscription.

One thing is not decided by CONTEXT.md and needs the user: `useDevtoolsFeed()` returns `gates: ReadonlyArray<GateInstance>` and hosts spread the feed onto the dock (`examples/nextjs-newsroom/src/client/Dock.tsx:163`, the website docs, both READMEs). After D-09 that spread no longer type-checks (verified: `TS2322 ... Type 'readonly GateInstance[]' is missing the following properties from type 'GateRegistryLike'`). Option A (recommended): the feed returns the registry, which breaks one react test assertion pair and makes the react changeset minor and **Breaking**, contradicting D-17's "patch" and GATE-05's "react suite passes untouched". Option B: leave the feed alone and have every host add `gates={...}` after the spread. See Open Question 1.

**Primary recommendation:** Build it in the RED-first order the roadmap gives: (1) mutation base and the twelve-cell characterisation on the base, committed alone; (2) core `GateState.ts` with its tests and both derivations plus the two-way pin; (3) `joinQuestions` and `GateRegistryLike` in `model/Gates.ts`, the eighth store, `useDockModel`/`DevtoolsDock` wiring, the panel read and the harness change, with the headless property; (4) records. Resolve Open Question 1 before plan 3 is written.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| The five gate-state words (the vocabulary) | `@qadi/core` (pure module, no Effect services) | `@qadi/react`, `@qadi/devtools` derive | The only package both already depend on; the ADR-QD-152 pattern, and `HydrationMetrics.ts` is the precedent for a vocabulary core states and a downstream reads. |
| Display words (`Error`, `Deny`, `Allow`, ...) per state | `@qadi/devtools` `model/Gates.ts` (`GATE_DISPLAY`) | — | D-02: display vocabulary is devtools'; core carries no display word. |
| Which state a guard renders (outcome to state) | `@qadi/react` (`DecisionOutcome`, `GateWriter`) | — | React owns decisions and outcomes; core's `GateState` only names the words. |
| The registry of live guards | `@qadi/react` (`GateRegistry`, atom set) | `@qadi/devtools` reads a structural `GateRegistryLike` | ADR-QD-053/080: the registry belongs to the atom set; devtools has no dependency on react. |
| The join question x instance, and absent versus empty | `@qadi/devtools` model (`model/Gates.ts`, eighth store in `DockModel.ts`) | — | Headless and testable without rendering (ARCH-74/82); the view only renders one snapshot. |
| Subscription to the registry and its lifetime | `@qadi/devtools` model, in the model's `Scope` | `useDockModel` passes the input | ADR-QD-137: the model owns what it started; the hook subscribes and dispatches, decides nothing. |
| Rendering rows, lens, pick, highlight | `@qadi/devtools` `react/QuestionsPanel.tsx`, `useLens.ts`, `Lens.ts` | — | Unchanged; DOM calls stay in devtools (§13). |
| Wiring the registry into the dock | Host (`atoms.gates` or the provider's registry) | `useDevtoolsFeed` (Open Question 1) | The host owns the join between its atom set and the dock. |

## Standard Stack

### Core
No package is added or upgraded. Everything below is already installed and verified this session.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| effect | 4.1.2 | `Data.taggedEnum`, `Match`, `Scope`, `TestClock`, `Effect.addFinalizer` | [VERIFIED: `node -e 'console.log(require("./node_modules/effect/package.json").version)'` printed `4.1.2`] |
| react | catalog (>=19.2.4 peer in devtools) | `Activity`, `useSyncExternalStore` via `useStoreSnapshot` | [VERIFIED: `packages/devtools/package.json:51` `"react": ">=19.2.4"`] |
| fast-check | catalog (devtools devDependency) | the headless join property | [VERIFIED: `packages/devtools/package.json:65` `"fast-check": "catalog:"`] |
| tstyche | ^7.2.5 | the two-way vocabulary pin and the core table's type tests | [VERIFIED: root `package.json:71` `"tstyche": "^7.2.5"`; run printed `TSTyche 7.2.5`] |
| @stryker-mutator/core | 10.1.1 | mutation base and after | [VERIFIED: root `package.json:60`] |
| @effect/vitest, @testing-library/react | catalog | `it.effect`, characterisation render | [VERIFIED: used by the existing devtools tests] |

`@qadi/devtools` already depends on `@qadi/core` (`packages/devtools/package.json:47` `"@qadi/core": "workspace:^"`), so reading `gateStates`/`isGateState` as values adds no dependency edge. `pnpm circular` printed `No circular dependency found!` with the scratch implementation in place.

### Supporting
None. No new package.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Empty rows in the core table | A state-generic field such as `answered` | Nothing reads it today, and under `ignoreStatic` a field on a static table is unobservable to mutation testing. D-02 allows empty rows. Reject until a consumer exists. |
| A closed `GatesView` of three tags | Two tags (`Absent`, `Listed`) with `Listed` carrying an empty list | The absent/empty/listed distinction is the panel's three messages; two tags would put `length === 0` back in the view. Keep three. |
| `Data.TaggedEnum` snapshot parts | A boolean `gatesAbsent` | CONTEXT prefers a closed tagged union; a boolean cannot say "unsampled" for the questions side. |

**Installation:** none.

**Version verification:** no external package is recommended, so no `npm view` is needed.

## Package Legitimacy Audit

No external package is installed by this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 vocabulary (GATE-01/02)
 ----------------------------------------------------------------------------
 @qadi/core  GateState.ts
   GATE_STATE_TABLE (private, as const satisfies)   Failed Denied Rechecking Pending Allowed
        |                    |                                  |
   type GateState      isGateState(word)               gateStates (ordered list)
        |  (export * from core)                                 |
        +--------------------+-----------------+----------------+
                             |                 |
   @qadi/react               |                 |   @qadi/devtools model/Gates.ts
   GateRenderState =         |                 |   GATE_DISPLAY: { [K in GateState]: DisplayState }
     GateState               |                 |   GATE_STATES = gateStates
   DecisionOutcome["_tag"]   |                 |   displayOfGateState(s) = isGateState(s)
     pinned == GateState     |                 |       ? GATE_DISPLAY[s] : "Unrecognised"
     (tstyche, both ways)    |                 |   GateInstanceLike.state stays `string` (D-05)

 the eighth store (GATE-03/04/05)
 ----------------------------------------------------------------------------
 host: <DevtoolsDock gates={atoms.gates} reading|diagnostics={...} />
        |
        v
 useDockModel({ gates, ... }) --useScoped--> makeDockModel(inputs)  [one Scope per mounted dock]
        |                                         |
        |  useLayoutEffect: model.configure(...)  |-- diagnosticsFeed --(poll publish)--+
        |                                         |      -> shownReading (merged)       |
        |                                         |                                     v
        |                                         |   registry.subscribe(rejoin) --> rejoin()
        |                                         |      (subscribed in the Scope,        |
        |                                         |       released by a finalizer)        | reads BOTH in one sync step:
        |                                         |                                       |   shownReading.getSnapshot()
        |                                         |                                       |   registry.instances()
        |                                         |                                       v
        |                                         |                  same three inputs by reference? -> keep the snapshot
        |                                         |                  else questions.set(joinQuestions(...))
        |                                         v
        |                                 model.questions : { subscribe, getSnapshot }  -> QuestionsSnapshot
        v                                                           { gates: GatesView, questions: QuestionsView, instances }
 DockFrame -> <QuestionsPanel questions={model.questions} ...>
        |  useStoreSnapshot(...)  ->  Match.tagsExhaustive(gates) / Match.tagsExhaustive(questions)
        v
 same markup as today (absent / empty / listed; Rows with asking[] per question), lens on snapshot.instances
```

### Recommended Project Structure

```
packages/core/src/GateState.ts                         # NEW: the table, GateState, isGateState, gateStates
packages/core/src/index.ts                             # + export * from "./GateState.ts"; (line 23-24)
packages/core/test/GateState.test.ts                   # NEW (Wave 0): words, order, guard, "toString"/"__proto__"
packages/core/test/GateState.tst.ts                    # NEW (Wave 0): the union written out, guard narrows
packages/react/src/GateWriter.ts                       # GateRenderState = GateState (import type from core)
packages/react/test/DecisionOutcome.tst.ts             # the pin at :40-41 reworded to core's GateState, both ways
packages/devtools/src/model/Gates.ts                   # derive GATE_DISPLAY; + GateRegistryLike, QuestionRow,
                                                       #   GatesView, QuestionsView, QuestionsSnapshot, joinQuestions
packages/devtools/src/model/DockModel.ts               # DockModelInputs.gates, DockModel.questions, header recount
packages/devtools/src/react/useDockModel.ts            # + gates in the input and in configure
packages/devtools/src/react/DevtoolsDock.tsx           # gates?: GateRegistryLike; HostProps loses `gates`; wiring
packages/devtools/src/react/QuestionsPanel.tsx         # reads model.questions; D-12a copy; no gateGroups/instancesAsking
packages/devtools/src/index.ts                         # + GateRegistryLike in the :46 export type line
packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx   # NEW, first commit
```

### Pattern 1: the keyed table (ADR-QD-152), applied to five words

**What:** a module-private `as const satisfies` table whose keys are the vocabulary, the type read off the keys, an own-key guard, and the ordered list built with no cast.
**When to use:** exactly this phase's vocabulary. The scratch module compiled, type-checked in react and devtools, and `node scripts/check-house-style.mjs` printed `house-style: 527 file(s) clean (3 declared switch(es))` with it present.
**Example:**
```typescript
// Source: packages/core/src/HydrationMetrics.ts:82, 214, 268-269, 279-281 (the pattern); scratch module compiled this session
interface GateStateRow {}

const GATE_STATE_TABLE = {
  Failed: {},
  Denied: {},
  Rechecking: {},
  Pending: {},
  Allowed: {},
} as const satisfies { readonly [state: string]: GateStateRow };

export type GateState = keyof typeof GATE_STATE_TABLE;

export const isGateState = (word: string): word is GateState =>
  Object.hasOwn(GATE_STATE_TABLE, word);

export const gateStates: ReadonlyArray<GateState> = Object.keys(GATE_STATE_TABLE).filter(
  isGateState,
);
```
The doc comment must say why the rows are empty (D-02), that `gateStates` is declared after `isGateState` because it calls it at load (the `HydrationMetrics.ts:274-278` note), and that the order is worst-news-first and the devtools panel's sort order.

### Pattern 2: a snapshot made of closed tagged unions, joined by a pure function

**What:** `joinQuestions` is the one place the panel's rows are decided. It takes plain values (questions or `undefined`, instances or `undefined`, and an already-reduced `unsampled` flag) and returns a `QuestionsSnapshot`; the store only decides when to call it.
**When to use:** the eighth store. A pure join is testable with no model, and the property test checks it against an independent oracle.
**Example:** see Code Examples 2.

### Pattern 3: one synchronous read of both sources, a three-reference guard, a scope-owned subscription

**What:** the store's recompute reads `shownReading.getSnapshot()` and `registry.instances()` in the same call stack, compares `{questions, gates, unsampled}` to the last key by reference, and calls `questions.set(...)` only when one moved. The registry subscription is taken inside the scope and released by a finalizer; `configure` swaps it only when the registry's identity changes.
**When to use:** the eighth store. It is `diagnostics`' shape (`DockModel.ts:125-133`, `remerge`) with a second source.

### Anti-Patterns to Avoid

- **Reading the instances at one moment and the questions at another.** A poll publish must re-read `registry.instances()`; reusing the instances from the previous join produces a torn snapshot. The negative control below fails exactly this.
- **Passing `instances` through `useMemo` in the panel to keep `useLens` stable.** The lens effect depends on `instances` identity (`useLens.ts:43-56`), so the snapshot's flat `instances` must be the registry's own array (or one module constant when absent), never a copy.
- **A registry listener that can throw.** The react registry isolates listeners (`GateRegistry.ts:86-92`), but a structural double need not. `rejoin` must not throw (it calls `registry.instances()`, which is the host's code), or it propagates into the guard effect that triggered it.
- **Re-exporting the vocabulary table.** D-01: the table stays private; readers use `GateState`, `isGateState`, `gateStates`.
- **Retitling BEH-QD-506 to fix an ordinal.** A rename changes an anchor that other documents link to; see Open Question 2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A store with `subscribe`/`getSnapshot`/`set` | a new listener set | `makeExternalStore` (`model/ExternalStore.ts:30`) | `set` notifies only on a new reference (`:46-49`), which is the identity contract `useSyncExternalStore` needs. |
| Reading a store in React | a second `useSyncExternalStore` | `useStoreSnapshot` (`react/useStoreSnapshot.ts:13-14`) | The dock's one read; a copy is how a constant-`undefined` run once crept in (its own header). |
| Closed variants | a boolean or a string tag | `Data.taggedEnum` + a hoisted `Match.type<…>().pipe(Match.tagsExhaustive(…))` | AGENTS.md §5a; a new tag is a compile error at every reader. |
| An ordered, own-key-guarded word list | a hand-typed union beside a hand-typed array | the ADR-QD-152 table | The defect this phase removes is exactly a union restated in two packages. |
| Question x instance grouping | a new join loop | the existing `gateGroups` and `instancesAsking` (kept package-private, called by `joinQuestions`) | They are tested (`Gates.test.ts`), 100% mutation-killed on the base, and keep `Equal.equals` structural grouping (BEH-QD-217). |
| A subscription cleanup | a manual `dispose` | `Effect.addFinalizer` in the model's `Scope` | ADR-QD-137; the model "has no `dispose`". |
| Sampled property tests under a clock | a real timer | `FastCheck.sample` inside `it.effect` with `TestClock.adjust` | `FastCheck.assert` + `Effect.runSync` (P1's idiom) cannot advance a poll; the audit tests use `FastCheck.sample` the same way (`packages/audit/test/CircuitBreaker.test.ts:621`). |

**Key insight:** every piece already exists in this package; the phase moves a join and a vocabulary to where they can be stated once and tested without rendering.

## Findings by Question

### Q1. The core vocabulary module (GATE-01, D-01, D-02)

**Shape.** Pattern 1 above, verbatim. It was created as `packages/core/src/GateState.ts` with `export * from "./GateState.ts";` added to `packages/core/src/index.ts` after `./Explanation.ts` (`index.ts:23` is `export * from "./Explanation.ts";`, `:24` is `export * from "./GuardHealthCheck.ts";`, so the alphabetical slot is between them) [VERIFIED: `packages/core/src/index.ts:23-24`]. Everything compiled under `tsc -p tsconfig.test.json`. `pnpm exec oxlint packages/core/src/GateState.ts` printed nothing, and the house-style gate printed `house-style: 527 file(s) clean (3 declared switch(es))` with the module present.

**Empty rows.** Nothing state-generic exists beyond the order. The one candidate, "does this state carry a decision" (`Allowed`, `Denied` yes), is already `outcomeOf`'s rule in react (`DecisionOutcome.ts`, ADR-QD-017) and no devtools code needs it: devtools maps each state to a display word. A row field would be read by nobody and, because `gateStates` calls the guard at load, any mutation of it is "static" and ignored. Use `interface GateStateRow {}` with a doc line saying so. [ASSUMED] that the empty `interface` will not draw a lint rule in CI beyond what `oxlint` printed (no output for the file).

**Name collisions.** No declaration of `GateState`, `isGateState` or `gateStates` exists in `packages/*/src` [VERIFIED: `/usr/bin/grep -rnE "\bGateState\b|isGateState|gateStates"` over `packages`, `spec`, `apps`, `examples`, `scripts`, `features`]. The only occurrence of the word `GateState` is a React component declared in the example app: `examples/nextjs-newsroom/src/client/Guards.tsx:25` `export const GateState = ({`, imported by seven sibling files from `./Guards.tsx`. It is local to the example and never imported from `@qadi/core`, so it does not collide; a reader may confuse the two, and the ADR can say so in one line. `GateStateCount` (`packages/devtools/src/model/Gates.ts:117`) is a different, devtools-private interface.

**Mutation reach.** `pnpm exec stryker run --mutate 'packages/core/src/GateStateProbe49.ts'` on a copy of the module printed `Final mutation score of NaN` and `Done in 3 seconds`; the report had `"score": null, "detected": 0, "undetected": 0` [VERIFIED: probe log, `core-probe-report.json`]. So `GateState.ts` has no instrumentable mutant: the arrow in `isGateState` and the `.filter` are executed at load by `gateStates`, so Stryker classifies them static and `ignoreStatic` skips them. Record `GateState.ts` as `new, 0 mutants`. The behaviour is therefore pinned by tests, not by mutation: the five words in order, `isGateState("toString")`, `isGateState("__proto__")` and `isGateState("")` are all false, `gateStates` has length 5 and is the table's keys, and a tstyche test writes the union out by hand. Model them on `HydrationMetrics.test.ts:275-300` ("the drop reasons, written out: nine words in their order and no others", "a name every object inherits is not a reason") and `HydrationMetrics.tst.ts`.

**`spec/overview.md` rows** (gate 13). With the scratch module and `GateRegistryLike` exported from the devtools barrel, `node scripts/check-api-surface.mjs` printed (verbatim):

```
packages/core/src/GateState.ts  [missing] `GateState` is exported by @qadi/core and is not named in spec/overview.md's Public API surface section. Add it to a table, or to "Not listed above" with a reason.
packages/core/src/GateState.ts  [missing] `isGateState` is exported by @qadi/core and is not named in spec/overview.md's Public API surface section. Add it to a table, or to "Not listed above" with a reason.
packages/core/src/GateState.ts  [missing] `gateStates` is exported by @qadi/core and is not named in spec/overview.md's Public API surface section. Add it to a table, or to "Not listed above" with a reason.
packages/devtools/src/index.ts  [missing] `GateRegistryLike` is exported by @qadi/devtools and is not named in spec/overview.md's Public API surface section. Add it to a table, or to "Not listed above" with a reason.

4 API-surface drift(s). spec/overview.md must name every export of every public package.
```

Where the rows go [VERIFIED: `spec/overview.md:326` is the row `| \`hydrationDropReasons\` | constant | \`HydrationMetrics.ts\` — the table's keys, in declaration order ...`]: add three core rows next to the hydration vocabulary rows in the "Services/metrics" block that ends at `:326` (a type row for `GateState`, a function row for `isGateState`, a constant row for `gateStates`, each naming `GateState.ts` and the worst-news-first order). In the `@qadi/devtools` table, `spec/overview.md:901` currently reads ``| `GateInstanceLike` | type | `model/Gates.ts` |``; add a `GateRegistryLike` row beside it. Amend `spec/overview.md:585` (its text names `GateRenderState` as `DecisionOutcome["_tag"]`, derived rather than restated) to say it is core's `GateState`. The `DevtoolsDock` row (`:~915`, "nine optional props") needs no count change.

### Q2. The React derivation and the tstyche pin (GATE-01, D-03)

**Derivation.** In `packages/react/src/GateWriter.ts` the declaration at `:55` is `export type GateRenderState = DecisionOutcome["_tag"];` [VERIFIED: `GateWriter.ts:55`], with `import type { DecisionOutcome } from "./DecisionOutcome.ts";` at `:24` and `import type { Policy, Resource } from "@qadi/core";` at `:23`. The scratch edit was `import type { GateState, Policy, Resource } from "@qadi/core";` and `export type GateRenderState = GateState;`, deleting the `DecisionOutcome` import. Readers of `GateRenderState` (`GateWriter.ts:68, 98, 194`, `GateRegistry.ts:45, 47, 111`, `useGate.ts:36, 79, 134`) needed no change. Result: `pnpm exec vitest run --project react` passed all 518 tests; `tsc -p tsconfig.test.json` was clean.

The doc comment above `:55` ("Derived from {@link DecisionOutcome}'s tag rather than restated, so a guard reports exactly the outcome it rendered from, and a sixth outcome is a sixth state", `GateWriter.ts:51-53`) must be rewritten, and so must `DecisionOutcome.ts:33-35` ("A leaf: it imports nothing local but `SeededDecision.ts`, so `GateWriter.ts` can derive `GateRenderState` from it without closing an import cycle through `QadiAtoms.ts` (ADR-QD-037)"): the cycle reason is gone and the pin is now the tie.

**The existing pin passes untouched.** `packages/react/test/DecisionOutcome.tst.ts:40-41` is

```ts
test("a gate's render state is the outcome's tag, not a restatement of it", () => {
  expect<GateRenderState>().type.toBe<DecisionOutcome["_tag"]>();
```

[VERIFIED: `DecisionOutcome.tst.ts:40-41`]. With `GateRenderState = GateState`, `pnpm exec tstyche packages/react/test/DecisionOutcome.tst.ts` printed `Tests: 6 passed, 6 total`, `Assertions: 11 passed, 11 total`. So D-03's "updated accordingly" is a rewording plus the stronger pin below, not a repair.

**The two-way pin and its RED demos.** The probe file (a throwaway `packages/react/test/_p49probe/GatePin.tst.ts`, since deleted) was

```typescript
type Tag = DecisionOutcome["_tag"];

test("core's gate-state vocabulary and the outcome's tags are one set, in both directions", () => {
  expect<GateState>().type.toBe<Tag>();
  expect<Exclude<GateState, Tag>>().type.toBe<never>();
  expect<Exclude<Tag, GateState>>().type.toBe<never>();
  expect<GateRenderState>().type.toBe<GateState>();
});
```

Green on the base design: `Assertions: 4 passed, 4 total`. RED when core gains a sixth word `Suspended` (verbatim, ANSI stripped):

```
fail ./packages/react/test/_p49probe/GatePin.tst.ts
  × core's gate-state vocabulary and the outcome's tags are one set, in both directions
Error: Type '"Pending" | "Rechecking" | "Allowed" | "Denied" | "Failed" | "Suspended"' is not the same as type '"Pending" | "Rechecking" | "Allowed" | "Denied" | "Failed"'.
   9 |   expect<GateState>().type.toBe<Tag>();
Error: Type '"Suspended"' is not the same as type 'never'.
  10 |   expect<Exclude<GateState, Tag>>().type.toBe<never>();
```

RED when `DecisionOutcome` gains a sixth tag `Suspended` and core does not:

```
Error: Type '"Pending" | "Rechecking" | "Allowed" | "Denied" | "Failed"' is not the same as type '"Pending" | "Suspended" | "Rechecking" | "Allowed" | "Denied" | "Failed"'.
Error: Type '"Suspended"' is not the same as type 'never'.
  11 |   expect<Exclude<Tag, GateState>>().type.toBe<never>();
```

The two `Exclude` assertions name the direction and the missing word, which `toBe` alone does not. Keep all four; the file lives where the old pin lives, so `DecisionOutcome.tst.ts` is edited in place (D-03) and a second file is not needed. `DecisionOutcome.tst.ts:34-38` ("the outcome is the closed union of five cases") stays.

### Q3. The devtools derivation (GATE-01, GATE-02, D-04, D-05, D-07)

**Base** [VERIFIED: `packages/devtools/src/model/Gates.ts:77`] `type GateRenderState = "Failed" | "Denied" | "Rechecking" | "Pending" | "Allowed";`, `:86` `const GATE_DISPLAY: { readonly [K in GateRenderState]: DisplayState } = {`, `:102` `export const GATE_STATES: ReadonlyArray<string> = Object.keys(GATE_DISPLAY);`, `:104-105` `const isGateRenderState = (state: string): state is GateRenderState =>\n  Object.hasOwn(GATE_DISPLAY, state);`, `:113-114` `export const displayOfGateState = (state: string): DisplayState =>\n  isGateRenderState(state) ? GATE_DISPLAY[state] : "Unrecognised";`.

**Scratch edit** (compiled, all 1470 devtools tests passed before the store work was added): delete `:70-77` (the private union and its comment), import `{ gateStates, isGateState }` and `type { GateState, Policy, Resource }` from `@qadi/core`, type the table `{ readonly [K in GateState]: DisplayState }`, set `GATE_STATES = gateStates`, delete `isGateRenderState`, and have `displayOfGateState` call `isGateState`.

**Evidence.**
- `Gates.test.ts:220-238` passed unchanged, including `displayOfGateState("toString")` and `""` as `Unrecognised` and `GATE_STATES` as `["Failed", "Denied", "Rechecking", "Pending", "Allowed"]` [VERIFIED: `Gates.test.ts:229-237`].
- A sixth core word with no devtools row is **TS2741 in devtools only** (the table is missing the property). It is the compile error D-04 wants, and the react derivation does not break (react's consumers do not index by state).
- `GATE_STATES` keeps its type `ReadonlyArray<string>` and its order (D-07); `rank` (`Gates.ts:143-148`) still uses `indexOf`, so an unknown state still sorts last.
- `GateInstanceLike.state` stays `string` (`Gates.ts:65`), so `isGateState(string)` is the one narrowing, as D-05 says.

**Comments to rewrite:** `Gates.ts:52` ("A host passes `useGateInstances()` or `atoms.gates.instances()` straight in") and `:70-76` (deleted with the union). The GATE-02 guarantee now rests on `Gates.test.ts:220-238` plus the characterisation cell `unrecognised and toString` (Q5).

### Q4. The store (GATE-03, D-08, D-10, D-11, D-16)

**The structural registry type** (Discretion: name `GateRegistryLike`, in `model/Gates.ts`, exported by name from `src/index.ts`):

```typescript
export interface GateRegistryLike {
  readonly instances: () => ReadonlyArray<GateInstanceLike>;
  readonly subscribe: (listener: () => void) => () => void;
}
```

**Assignability.** A probe file in `packages/react/test/_p49probe/` (deleted) declared `export const assignable: GateRegistryLike = registry;` for `registry: GateRegistry`, `export const built: GateRegistryLike = makeGateRegistry();` and `export const fromAtoms: GateRegistryLike = atoms.gates;`; `tsc -p tsconfig.test.json` printed no error for any of the three. The react side is `GateWriter.ts:115-120`:

```ts
export interface GateRegistry {
  /** Every instance currently mounted, in registration order. Same reference until a change. */
  readonly instances: () => ReadonlyArray<GateInstance>;
  /** Subscribes to mounts, unmounts and render-state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
}
```

(`GateInstance.state` is the narrower `GateRenderState`, `kind` is `GateKind`; both widen to `string` covariantly.) Add a permanent type test for this in `packages/react/test/` (react's tests may import `@qadi/devtools`' source by relative path as the probe did, or the BDD feature `gate-instances.steps.test.ts` can hand `atoms.gates` to the dock; see Q7).

**Snapshot type** (compiled and exercised end to end):

```typescript
export interface QuestionRow {
  readonly question: AskedQuestionLike;
  readonly asking: ReadonlyArray<GateInstanceLike>;
}
export type GatesView = Data.TaggedEnum<{
  Absent: {};
  Empty: {};
  Listed: { readonly instances: ReadonlyArray<GateInstanceLike> };
}>;
export type QuestionsView = Data.TaggedEnum<{
  Unsampled: {};
  Absent: {};
  Empty: {};
  Rows: { readonly rows: ReadonlyArray<QuestionRow> };
}>;
export interface QuestionsSnapshot {
  readonly gates: GatesView;
  readonly questions: QuestionsView;
  /** Every guard the registry lists, for the lens: the registry's own array, or one constant when absent. */
  readonly instances: ReadonlyArray<GateInstanceLike>;
}
```

`QuestionsView.Unsampled` carries the third panel case (`questions === undefined && isUnsampled(status)`, which renders `null`, `QuestionsPanel.tsx:125`) so the view needs no `diagnostics.status` read for it; the join input takes the already-reduced boolean (`unsampled`), computed in the model with the existing `isUnsampled` (`model/DiagnosticsFeed.ts:118-125`). The Unsampled/Absent distinction is the panel's, taken from the polled status, so it is the model's business now.

**Recompute rule.** `DockModel.ts` HEAD [VERIFIED: `:117-133`] builds `shownReading = makeExternalStore<DiagnosticsSnapshot>(mergedOf(fed, supplied))` and `remerge` guarded `if (next === fed && inputs.reading === supplied) return;`. The eighth store follows it:

- Key = `{ questions: shownReading.getSnapshot().reading.questions, gates: gatesNow?.instances(), unsampled: reading.questions === undefined && isUnsampled(status) }`, read in one call.
- `rejoin()` returns early if all three are `===` to the last key; otherwise `questions.set(joinQuestions(...))`.
- `rejoin` is subscribed to `shownReading` (so a poll publish re-reads the registry in the same step) and to the registry (so a mount/unmount/state change re-reads the questions). `configure` calls `rejoin()` after `remerge()`.
- The reference-stability claim holds: the property test asserts `model.questions.getSnapshot()` is unchanged by reference across a poll tick that changed nothing, and the registry's `instances()` returns the same array until a change (`GateRegistry.ts:128-134`, `packages/react/src/GateRegistry.ts:74-77` "rebuilt on the first read after a change and not before").

**Subscription scope** (ADR-QD-137, D-08). The subscription is taken in `makeDockModel` after `shownReading` exists and before any host listener, so it moves first (the same order comment as `:114-115`). An `Effect.addFinalizer` sets `closed = true` and calls the current unsubscribe; `watchGates` takes `closed` into account so a `configure` after close subscribes nothing. `configure` re-subscribes only `if (next.gates !== gatesNow)`. Measured with the real model and a registry double that counts listeners: `reg.listeners()` is `0` after `Scope.close`, in all sixty sampled runs of the property.

**`DockModelInputs`, `configure`, `useDockModel`.**
- `DockModelInputs` gains `readonly gates?: GateRegistryLike | undefined;` with the doc line "The registry of live guards; the model subscribes in its own scope. Absent: the panel says none was handed over" (`DockModelInputs` is at `DockModel.ts:52-62`).
- `DockModel` gains `readonly questions: Pick<ExternalStore<QuestionsSnapshot>, "subscribe" | "getSnapshot">;` (the `diagnostics` readout exposes only what a reader may call, `:141-145`).
- `useDockModel.ts` HEAD [VERIFIED: `:28-36, 38-58`] gains `gates` in `UseDockModelInput`, in the `makeDockModel({...})` call (`:49`) and in the `model.configure({...})` call and dependency array (`:54-55`). Three lines.
- `DevtoolsDock.tsx`: `gates?: GateRegistryLike` replaces `:124` (`readonly gates?: ReadonlyArray<GateInstanceLike>;`); the doc comment at `:101-102` ("Gates are not in it: they are pushed by `@qadi/react`'s registry through the host's subscription, and stay the plain `gates` prop below") and `:119` are rewritten; `HostProps` (`:140`) becomes `Pick<DevtoolsDockProps, "unknownParents" | "onInvalidate">`; `DevtoolsDock` destructures `gates` with the other model inputs (`:142-149`) and passes it to `useDockModel` (`:161`); the questions screen (`:336-344`) passes `questions={props.model.questions}` and no `gates`.
- The `QuestionsPanel` prop `hydration={props.shown.hydration}` and `diagnostics={notice}` stay.

**Activity.** Measured with a throwaway probe against the real dock, a counting registry double and `<Activity>`:

```
shown: subs 1 rows ["CanAllowedno element — a hook has no node of its own"]
hidden: subs 0
re-shown: subs 1 tab pressed? false
re-shown rows ["CanDeniedno element — a hook has no node of its own","CanFailedno element — a hook has no node of its own"]
strict: subs 1
swapped: one 0 two 1
```

So: the model subscribes while shown, none while hidden (hiding closes the scope and the finalizer releases the subscription), a registry change while hidden is read fresh on re-show (the rebuilt model reads `registry.instances()` at construction), a re-show returns to the first tab (existing behaviour, ADR-QD-047; `aria-pressed` is `false` for the React tab until clicked again, as on the base), StrictMode's double mount leaves exactly one subscription, and handing a different registry swaps the subscription. No browser behaviour changes, so the ADR names none.

**Store recount (D-11).** `DockModel`'s return object at HEAD has `timeline`, `dock`, `explorer`, `roles`, `simulation`, `diagnostics`, `timelineStatus` (seven stateful readouts) and `sightings` (a thunk, `DockModel.ts:147`) plus `configure`. The header says "The dock's eight readouts" (`:2`) and then "The seventh store is the diagnostics reading ... The eighth is the timeline's status" (`:21-23`), which counts the policy rail among the stores (six before diagnostics). D-11's arithmetic counts stores without the thunk: seven stores today, so `questions` is the eighth, and `sightings` is the ninth readout but not a store. The header should say so in one sentence, and `DockModel.test.ts:4-6` ("The dock owns eight readouts (the timeline, the policy rail, ...") needs the same recount. Existing ordinals in BEH-QD-506's title (`spec/behaviors/28-devtools-screens.md:1200`, "the dock model's seventh store"), `ADR-QD-047`'s amendments (`047-...md:396, 458`) and `28-devtools-screens.md:886-925` are history written with the first counting; do not rewrite them (Open Question 2).

### Q5. The panel and the characterisation (GATE-03, D-12, D-12a, D-13)

**Panel as a snapshot reader.** `QuestionsPanel` at HEAD [VERIFIED: `QuestionsPanel.tsx:47-75` props, `:88-99` body]: `questions: ReadonlyArray<AskedQuestionLike> | undefined`, `gates?: ReadonlyArray<GateInstanceLike> | undefined`, then `const instances = useMemo(() => gates ?? [], [gates]); const groups = useMemo(() => gateGroups(instances), [instances]); const lens = useLens(instances);`, `{instances.length === 0 ? (<p ... data-testid="qadi-gates-absent">{gates === undefined ? "No live guards ..." : "No guard is registered ..."}</p>) : (<PickButton lens={lens} />)}` (`:114-122`), `questions === undefined ? (unsampled ? null : <p data-testid="qadi-questions-absent">...) : questions.length === 0 ? <p data-testid="qadi-questions-empty">...) : questions.map(... groups=... )` (`:124-143`), and `Question` calls `instancesAsking(groups, question.policy, question.resource)` at `:169`.

Scratch panel: a `questions` prop of type `Pick<ExternalStore<QuestionsSnapshot>, "subscribe" | "getSnapshot">`, `const snapshot = useStoreSnapshot(questions);`, `useLens(snapshot.instances)`, a hoisted `Match.type<GatesView>().pipe(Match.tagsExhaustive({ Absent, Empty, Listed }))` for the gates block (each arm a curried `(lens: Lens) => ReactNode`; annotate `lens`, otherwise TS7006 implicit-any), and a hoisted `Match.type<QuestionsView>()...` for `Unsampled | Absent | Empty | Rows`. `Question` takes the row (`{ question, asking }`) and keeps `asking.filter(isLocatable)`, `locatableIds(asking)`; the view no longer calls `gateGroups` or `instancesAsking`. Compile errors met on the way and their fixes: `TS6196` unused `AskedQuestionLike` import (drop it from the import, keep the `export type { AskedQuestionLike }` re-export at `:45`), `TS2559` passing the `QuestionRow` prop named `row` where the module-level `row: CSSProperties` style const is also named `row` (rename the prop to `entry`), `TS7006` as above.

**D-12a.** The base string [VERIFIED: `QuestionsPanel.tsx:117`]:

`"No live guards were handed to the dock. Pass gates — usually useGateInstances(), or atoms.gates.instances() — to list who is asking."`

becomes `"No live guards were handed to the dock. Pass gates — usually atoms.gates, from @qadi/react — to list who is asking."` (em dashes U+2014 as today). The one test assertion on it is `QuestionsPanel.gates.test.tsx:44-49`:

```tsx
  it("says where live guards come from when none were handed in", () => {
    render(<QuestionsPanel diagnostics={liveNotice} questions={asked} />);
    assert.include(
      screen.getByTestId("qadi-gates-absent").textContent ?? "",
      "useGateInstances()",
    );
  });
```

[VERIFIED: `QuestionsPanel.gates.test.tsx:44-49`, the `"useGateInstances()"` literal is at `:47`]. Change the expected substring to `"atoms.gates"` (and consider asserting `"from @qadi/react"` too, so a later edit cannot silently drop the second half of the sentence). Also rewrite the prop doc at `QuestionsPanel.tsx:59`, `DevtoolsDock.tsx:119` and `model/Gates.ts:52`, which all say `useGateInstances()`.

**The characterisation harness** (D-13). A throwaway test rendered `<DevtoolsDock {...(cell.stuck ? { diagnostics: { layer: never } } : {})} {...(questions ? { reading: { questions } } : {})} {...(gates ? { gates: gatesProp(gates) } : {})} />`, clicked the tab `getByRole("button", { name: "React" })`, and recorded `screen.getByTestId("qadi-questions").outerHTML` for twelve cells. `gatesProp` lived in a one-function helper file: on the base it returned the array, after the change it returns `{ instances: () => array, subscribe: () => () => {} }`. That helper is the **only** line that changes between the base capture and the after capture, which is exactly D-13's "change only their input to a registry double".

Cells and base output size in characters: `absent gates` 1600, `empty gates` 1556, `two guards one row` 3185, `deny vs failure` 3182, `asked but unmounted` 1807, `unrecognised and toString` 3202, `highlight 1 and a hook` 2966, `only hooks (disabled title)` 2670, `questions absent, gates absent` 1322, `questions absent, unsampled` 1531, `questions empty` 1495, `scoped and unscoped` 4525.

**Determinism.** The base was captured twice; `cmp char-base.json char-base2.json` printed no difference (`base run twice: identical`). The cells use `marker()` DOM elements for `element`, which never reach the serialised markup.

**Diff against the new implementation.** After the harness change, eleven of twelve cells were `IDENTICAL`, and `absent gates` and `questions absent, gates absent` were `DIFFERENT` (the two cells that render the gates-absent message). The first difference in `absent gates`, at character 611:

```
base : o live guards were handed to the dock. Pass gates — usually useGateInstances(), or atoms.gates.instances() — to list who is asking.</p>...
after: o live guards were handed to the dock. Pass gates — usually atoms.gates, from @qadi/react — to list who is asking.</p>...
```

That is the D-12a edit and only that. Verbatim base for `absent gates` (so the planner can write the golden literal, regenerate from the base to confirm, and commit it before any src edit):

```html
<div data-diagnostics-status="Off" tabindex="-1" style="padding: 12px;" data-testid="qadi-questions"><div role="status" data-testid="qadi-diagnostics-region"></div><p style="color: #8b93a3; font-size: 11px; margin-top: 0px;" data-testid="qadi-keying-note">One row per <em>question</em>, not per component. Atoms are keyed structurally, so ten gates on the same policy are one atom — that is what the evaluator sees. The guards asking each question are listed underneath.</p><p style="color: #8b93a3; font-size: 11px;" data-testid="qadi-gates-absent">No live guards were handed to the dock. Pass gates — usually useGateInstances(), or atoms.gates.instances() — to list who is asking.</p><div data-testid="qadi-question-block"><div style="display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #2a2f39;" data-testid="qadi-question"><span>doc:read</span><span style="color: #8b93a3; font-size: 11px;" data-testid="qadi-question-scope">no resource</span><span style="color: #8b93a3; font-size: 11px;" data-testid="qadi-question-unmounted">asked, nothing mounted</span></div></div><div style="margin-top: 10px;" data-testid="qadi-hydration"><div style="color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;">hydration</div><span style="color: #8b93a3;" data-testid="qadi-hydration-unwired">no counts read. Pass <code>diagnostics={{}}</code> to sample them, or <code>hydration</code> — the result of <code>hydrationActivity</code>, which needs no wiring — to fill this in.</span></div></div>
```

For `unrecognised and toString` the markup shows two rows in registry order, each `data-treatment="Unrecognised"`, text `Suspended` and `toString`, each followed by `qadi-instance-unlocatable` text `no element — a hook has no node of its own`, and the question row carries `<button ... data-testid="qadi-highlight" disabled="" title="only hooks are asking this, and a hook has no element to point at">highlight 0</button>`: instances are listed in registry order, never sorted by state (the panel does not use `GateGroup.counts`).

**Panel tests that must change** (all to a registry/readout input, no expected value changed except D-12a): with the scratch panel, `QuestionsPanel.gates.test.tsx` (21 failing cases), `QuestionsPanel.test.tsx` (17) and `VerdictTreatment.test.tsx` (1: "names each guard's treatment, and shows an unknown state as itself", `:150-168`) failed to compile or run, 39 in all; the other 1433 devtools tests passed, because `DevtoolsDock.test.tsx` and `DiagnosticsScreens.test.tsx` pass no `gates` and the BDD steps render `DevtoolsDock` with only `catalogue` (`features/features/devtools-screens/devtools-screens.steps.test.ts:158, 293, 306`). The tests render `QuestionsPanel` directly with `questions={asked}` and `gates={[...]}` props (e.g. `QuestionsPanel.gates.test.tsx:54, 61, 75, ...`). Recommended harness: one helper in `packages/devtools/test/helpers.ts` (or beside the tests) that takes the same `{ questions, gates }` and returns the readout the panel now needs, built from the real `joinQuestions`, so each test's body and expectation stay as written and only the render line changes; the dock-level characterisation proves the helper and the real model agree.

**e2e.** `examples/nextjs-newsroom/e2e/` holds `decision-log.spec.ts`, `lens.spec.ts`, `ssr.spec.ts`. None reads the panel's `qadi-*` markup (`/usr/bin/grep` for `qadi-gates-absent|qadi-instance|qadi-questions|qadi-highlight|qadi-pick` found it only in the devtools tests, the panel and `apps/website/DESIGN.md`); `lens.spec.ts` drives `[data-qadi-gate]` markers and the pick through the dock. The example's `check` script runs `pnpm typecheck && pnpm test && pnpm build && playwright install --with-deps chromium && pnpm test:e2e`, so the example must typecheck after the dock's `gates` prop changes (Open Question 1).

### Q6. The headless fast-check join test (GATE-04, D-14)

`DockModel.test.ts`'s existing property P1 (`:635-715`) is `FastCheck.assert(FastCheck.property(...))` around `Effect.runSync`, which cannot advance a poll. The join needs the poll, so use the sampled form in an `it.effect`: generate sequences with `FastCheck.sample(FastCheck.array(commands, { maxLength: 25 }), { numRuns: 60, seed: 49 })`, build each model in its own scope with `Scope.make()` + `Scope.provide`, drive a registry double and an `asked` variable the model's `diagnostics.questions` thunk reads, advance with `TestClock.adjust("1 second")` and `settleTurns` (`packages/devtools/test/helpers.ts:175`), and check after every command and inside a subscriber on `model.questions`.

Next case labels are free: the file's last labelled cases are `M29` (`:951-`) and `P1`. Name the new ones `M30` (join one moment), `M31` (absent/empty/listed and an unsampled poll), `M32` (subscription lifetime and swap), `P2` (the property).

Registry double (react's contract without importing react): an entries map, a listener set, a snapshot array rebuilt only after a change (`GateRegistry.ts:74-77, 128-134`), listeners called synchronously on `add`/`remove`/`update`.

Property body (the probe passed all sixty runs):

```typescript
// oracle: independent of joinQuestions, by Equal.equals over policy and resource, in registry order
const oracle = (qs: ReadonlyArray<AskedQuestionLike>, gs: ReadonlyArray<GateInstanceLike>) =>
  qs.map((q) => gs.filter((g) => Equal.equals(g.policy, q.policy) && Equal.equals(g.resource, q.resource)).map((g) => g.id));

model.questions.subscribe(() => { agrees("on notify"); });   // every notification is checked against the sources at that moment
for (const command of sequence) {
  /* add | remove | update (registry), ask (replace the polled list + TestClock.adjust), tick (TestClock.adjust only) */
  yield* settleTurns;
  agrees(command.kind);
  if (command.kind === "tick") assert.strictEqual(model.questions.getSnapshot(), before, "a tick that changed nothing keeps the reference");
}
yield* Scope.close(scope, Exit.void);
assert.strictEqual(reg.listeners(), 0, "closing the scope released the registry subscription");
```

`agrees` asserts `snapshot.instances === registry.instances()` (the flat list is the registry's own array) and `deepStrictEqual(rowIds(snapshot), oracle(model.diagnostics.getSnapshot().reading.questions, registry.instances()))`. The "on notify" subscriber is what makes it a **one moment** test: a snapshot that paired a question from one poll with instances from before the registry changed fails there, not later.

**Negative control (RED against a torn join).** The model's join key was altered so a poll publish reused the instances read at the previous join (`gates: fromRegistry ? gatesNow?.instances() : lastKey.gates`). Result: `Tests  1 failed (1)`; restored: `Tests  1 passed (1)`. Keep this as a reviewed "mutant the test must kill" note in the plan, since Stryker's score is the standing check (Q8 lists the surviving mutants a thinner test leaves).

Limits: `FastCheck.sample` does not shrink, so put the command sequence in every assertion message (`JSON.stringify(sequence)`) and keep `seed` fixed so a failure replays. `settleTurns` is needed after each command because the registry notifies synchronously but a poll tick publishes after the clock moves. The probe uses `policies`/`resources` pools small enough that questions and guards collide often, and one state (`"Suspended"`) outside the vocabulary to exercise the unknown path through the join.

### Q7. Call sites of `gates`, and how a host gets the registry (D-09, D-17)

**Must change** (type or text):
| File | Line | What |
|------|------|------|
| `packages/devtools/src/react/DevtoolsDock.tsx` | `:101-102`, `:119-124`, `:140`, `:161`, `:336-344` | the prop, its two doc comments, `HostProps`, `useDockModel` call, the panel wiring |
| `packages/devtools/src/react/QuestionsPanel.tsx` | `:58-66`, `:88-99`, `:114-122`, `:137-143`, `:169` | the `gates` prop goes; the join goes; the copy edit |
| `packages/devtools/src/model/Gates.ts` | `:52` (comment), `:70-114` | derive from core; join added |
| `packages/devtools/src/index.ts` | `:46` | `export type { AskedQuestionLike, GateInstanceLike } from "./model/Gates.ts";` gains `GateRegistryLike` |
| `packages/devtools/test/surface.tst.ts` | `:42` (import list) | `GateRegistryLike` joins `GateInstanceLike`; `:134` `export { gateGroups }` with its `@ts-expect-error` stays |
| `packages/devtools/test/react/QuestionsPanel.gates.test.tsx`, `QuestionsPanel.test.tsx`, `VerdictTreatment.test.tsx` | see Q5 | harness only; D-12a assertion at `QuestionsPanel.gates.test.tsx:44-49` |
| `packages/devtools/README.md` | `:140-146` | "`<DevtoolsDock {...useDevtoolsFeed({ collector })} />` supplies `gates`, `onInvalidate`..." |
| `apps/website/src/content/docs/docs/packages/devtools.md` | `:120-160` | the `useDevtoolsFeed` fence and the sentence "`useDevtoolsFeed` returns `gates`, `onInvalidate` and `diagnostics`" |
| `packages/react/README.md` | `:78-92` | "returns ... `gates`, `onInvalidate`, and a `diagnostics`" |
| `apps/website/src/content/docs/docs/packages/react/hooks.md` | `:28, :112-113` | `useGateInstances` signature (unchanged) and the feed paragraph "the `gates` that `useGateInstances` lists" |
| `spec/behaviors/28-devtools-screens.md` | `:379-381` correction, `:432-440`, DockModelInputs listing near `:888` | the dock's inputs; history paragraphs are not rewritten |
| `spec/behaviors/09-react.md` | `:640` | `readonly gates: ReadonlyArray<GateInstance>;` in the `DevtoolsFeed` listing (Option A only) |
| `examples/nextjs-newsroom/src/client/Dock.tsx` | `:117, :163` | `const feed = useDevtoolsFeed(dockExtras);` ... `<DevtoolsDock {...feed} .../>` |

**History, not to be rewritten:** `spec/behaviors/28-devtools-screens.md:379-381` ("**Correction (2026-10-04, ADR-QD-080).** The host call is now `useGateInstances()` ..."), CHANGELOGs, earlier ADR text, `apps/website/.../upgrading.md:191` (a 0.12 row listing `gateGroups` as removed).

**Untouched:** `features/features/gate-instances/gate-instances.steps.test.ts` reads `built?.gates.instances()` and the public `GateInstanceLike` and never renders the dock; `packages/react/test/GateRegistry*.test.ts*`, `GateWriter*.test.ts*`, `QadiProvider*.test.tsx`, `DeveloperSignals.test.ts`; `examples/nextjs-newsroom/test/dock-wiring.test.tsx` uses only `feed.diagnostics` (`:36`).

**How a host gets the registry.** `atoms.gates` is `QadiAtoms.gates: GateRegistry` (`QadiAtoms.ts:135`); under a provider the effective registry is `gatesProp ?? atoms.gates` (`QadiProvider.tsx:196`), exposed through the context as `gates` (`:62`) and read by `useGateInstances` (`hooks.ts:174`). The context hook `useQadiContext` is exported from `@qadi/react` (the probe imported it from the package's `index.ts` and compiled `const { gates } = useQadiContext("Dock")`), so Option B's host code is one hook call.

**The `useDevtoolsFeed` conflict (Open Question 1), evidence.**
- Base: `DevtoolsFeed.gates: ReadonlyArray<GateInstance>` (`packages/react/src/DevtoolsFeed.ts:84`) and `useDevtoolsFeed` calls `useGateInstances()` (`:115`), so the feed re-renders its host on every guard mount.
- With D-09 and the feed untouched, the website fence fails to compile (verbatim from `node scripts/check-website-doc-examples.mjs`):
  ```
  .website-doc-examples/apps_website_src_content_docs_docs_packages_devtools_md_1.tsx(18,11): error TS2322: Type '{ gates: readonly GateInstance[]; onInvalidate: () => void; diagnostics: { collector: PortCallCollector; } & DevtoolsDiagnosticsFeed; }' is not assignable to type 'DevtoolsDockProps'.
    Types of property 'gates' are incompatible.
      Type 'readonly GateInstance[]' is missing the following properties from type 'GateRegistryLike': instances, subscribe
  website-doc-examples: 66 block(s) extracted, compilation FAILED.
  ```
- Option A, probed: change `DevtoolsFeed.gates` to `GateRegistry`, take it from `useQadiContext("useDevtoolsFeed")` and drop `useGateInstances` (so the host no longer re-renders per guard, a side benefit). Results: `tsc -p tsconfig.test.json` clean; `node scripts/check-website-doc-examples.mjs` printed `website-doc-examples: 66 block(s) compile`; `pnpm exec vitest run --project react` printed `Tests  1 failed | 517 passed (518)`, the failing test being `test/DevtoolsFeed.test.tsx > what the feed forwards > gates are the provider's effective registry: one per instrumented guard, none otherwise`, whose assertions at `:176` (`expect(required(instrumented.feed, "the feed").gates).toHaveLength(1)`) and `:188` (`expect(required(plain.feed, "the feed").gates).toEqual([])`) read the feed's `gates` as an array.
- Option B: leave the feed; each host writes `<DevtoolsDock {...feed} gates={gates} />` with `gates` from `useQadiContext`. A probe compiled this. The bare spread `<DevtoolsDock {...feed} />` fails, so the example (`Dock.tsx:163`), both READMEs and the website fence all need an explicit `gates` line.

### Q8. Mutation commands and scores (D-15, WX-05)

All runs used the existing configs with `--mutate` and no config edit; `reports/mutation-*/` was restored from a saved copy after each run. A mutation base run is **not** part of a commit's diff.

| Target | Command | Base result |
|--------|---------|-------------|
| devtools model | `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/Gates.ts'` | `DockModel.ts` 100.00 (48 killed, 0 survived), `Gates.ts` 100.00 (44 killed, 0 survived); wall time 54.8 s |
| devtools, neighbour | same run with `DiagnosticsFeed.ts`, `DiagnosticsStore.ts` added | `DiagnosticsFeed.ts` 94.74 (90/5), `DiagnosticsStore.ts` 100 (60/0); untouched by this phase |
| react | `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/GateWriter.ts'` | `GateWriter.ts` 97.96 (48 killed, 1 survived); wall time 25.7 s; the one survivor is `GateWriter.ts:178` ConditionalExpression to `true` on `a.id === b.id &&` (pre-existing) |
| core, new file | `pnpm exec stryker run --mutate 'packages/core/src/GateState.ts'` (probe on a copy) | `NaN`, 0 mutants (static) |

(Both `Final mutation score of 97.98` and `97.96` appear in the logs: the first is the four-file devtools run's total, the second is `GateWriter.ts`'s; the per-file rows above are the ones to compare.) The mutate list is `--mutate` only: `stryker.devtools.mjs` mutates `src/model/**` (its header: "Scoped to `src/model/` deliberately"), so `QuestionsPanel.tsx` and `DevtoolsDock.tsx` are "not instrumentable", as D-15 records. `stryker.react.mjs` did reach `GateWriter.ts` through `--mutate`.

**What a naive implementation leaves alive.** Running the devtools config with the scratch implementation and only the pre-existing tests gave `DockModel.ts` 92.31 (84/7) and `Gates.ts` 96.49 (55/2). The nine survivors are exactly the behaviours the new tests must pin:

```
DockModel.ts L168 ConditionalExpression -> false   | if (key.questions === lastKey.questions && key.gates === lastKey.gates && key.unsampled === ...
DockModel.ts L159 ConditionalExpression -> true    | unsampled: reading.questions === undefined && isUnsampled(status),
DockModel.ts L168 ConditionalExpression -> true    | (the same guard)
DockModel.ts L168 EqualityOperator -> "key.unsampled !== lastKey.unsampled"
DockModel.ts L180 BooleanLiteral -> false          | closed = true;
DockModel.ts L211 ConditionalExpression -> true    | if (next.gates !== gatesNow) {
DockModel.ts L217 CallExpression -> ;              | rejoin();   (the call in configure)
Gates.ts L299 ObjectLiteral -> {}                  | ? GatesView.Listed({ instances })
Gates.ts L296 ConditionalExpression -> true        | input.gates === undefined
```

Tests to kill them: a quiet tick keeps the snapshot reference (L168 x3); the `Unsampled` versus `Absent` split with no questions and a `Starting` poll (L159); a `configure` after the scope closed subscribes nothing (L180); a `configure` with a new registry swaps the subscription and an unchanged one does not (L211); a `configure` that changes only `gates` re-joins at once with no registry event (L217); a `Listed` view carries the instances and an `Absent` registry is told apart from an `Empty` one (Gates.ts). A registry change while only `configure` moved is the case P2 does not cover.

**After-phase rule (D-15):** `DockModel.ts` and `Gates.ts` must stay at 100.00 unless a survivor is justified in the plan; `GateWriter.ts` must not fall below 97.96. Re-run the same commands and compare per file, not the run total.

### Q9. Spec records (WX-02, WX-03, WX-07, D-17)

**Reserved ids are unused.** `/usr/bin/grep -rl` over `spec/` finds no occurrence of `ADR-QD-162`, `CCR-QD-440`, `BEH-QD-581`, `BEH-QD-585`, `INV-QD-343`, `INV-QD-344`; the last used are `BEH-QD-580` and `INV-QD-342` (both appear in `spec/decisions/161-...md`, `traceability.md`, `README.md`/`invariants.md`). `spec/decisions` ends at `161-audit-reports-cores-refusal-and-decides-lost-once.md` and `index.yaml`.

**ADR template** (`spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md:1-13`): title `# ADR-QD-161 — <title>`, a Document Control blockquote table with `Document ID | QADI-ADR-161`, `Revision`, `Effective Date`, `Status | Accepted — amends ADR-QD-056, ADR-QD-095`, `Author | Qadi Engineering`, `Classification | Architecture Decision Record`, `Change History`; then `## Context`, `## Decision` (numbered), `## Consequences` (bold-led bullets, including the **Breaking** line for the package and where it is recorded), `## Related` (links to ADRs, ARCH/CCR ids, and BEH/INV anchors). Use `node scripts/spec-revise.mjs <doc> "<what changed>"` for every revision bump of an existing document (`pnpm spec:revise`); it writes the `Revision` row and prepends the `Change History` entry together, and `pnpm spec:verify` runs `--check`.

**`spec/decisions/index.yaml`** [VERIFIED: `:493-497`]:

```yaml
  - id: "ADR-QD-161"
    file: "161-audit-reports-cores-refusal-and-decides-lost-once.md"
    title: "Audit reports core's refusal and decides lost once"
    status: "Accepted — amends ADR-QD-056, ADR-QD-095"
```

Add `ADR-QD-162` the same way, with the file name `162-<slug>.md`, status `Accepted — amends ADR-QD-047; applies ADR-QD-152; keeps ADR-QD-053, ADR-QD-080` (the exact verbs follow the ADR's own Status row). The ADR is to be read-and-cited, with its text quoted as read, for ADR-QD-047 (store set, `:396-430` seventh store, `:458-480` eighth readout), ADR-QD-053 (`:231-234` structural), ADR-QD-080 (`:87` "a registry holds who is asking and what each guard rendered, never a verdict"), ADR-QD-137 (a model is built in a scope and has no `dispose`), ADR-QD-152 (the pattern); that is the ADR check WX-02 expects, as Phase 48's AREF-04 did.

**CCR row** (`spec/README.md:376` is CCR-QD-439): `| CCR-QD-440 | 2026-11-16 | <list of changed spec documents with their new revisions, in the form "`spec/behaviors/28-devtools-screens.md` Rev 1.N (BEH-QD-581 to BEH-QD-585 new; ...)">, ... |`; the Document Control `Change History` of `spec/README.md` gets a matching revision. Every document touched (behaviors, invariants, overview, traceability, ADRs amended, README) is revised through `spec:revise`.

**Where each new record goes.**
- `BEH-QD-581..585` in `spec/behaviors/28-devtools-screens.md` (the devtools screens; BEH-QD-506 is its model of this shape) and, for the vocabulary, a core behaviour in the doc that holds `hydrationDropReasons`' behaviour or in `28-devtools-screens.md` with a core source. Suggested split: 581 the gate-state vocabulary is stated once in core and derived by react and devtools; 582 a state this build does not know is shown as `Unrecognised`; 583 the questions store is the join of one moment and keeps its reference; 584 the registry is a model input with its subscription in the model's scope (absent, empty and listed read differently); 585 the dock's `gates` prop takes the registry (the **Breaking** record), plus the D-12a message. [ASSUMED] the split; the planner may merge two.
- `INV-QD-343` (the questions snapshot is the join of one moment and keeps its identity; template INV-QD-314 at `spec/invariants.md:3726-3745`: Source, Implication, Enforcement, Related) and `INV-QD-344` (the five gate-state words are stated once; react's and devtools' derivations are tied by type tests; Enforcement cites the tstyche pin and `GateState.test.ts`). Both go at the end of `spec/invariants.md` (after INV-QD-342).
- `spec/traceability.md`: a `§1` behavior-to-source row per new BEH (`:39`), a `§2` invariant row each (`:78`), a `§3` decision row for ADR-QD-162 beside `:329`, and `§4` test-file rows (`:332-`), for the new and changed test files: `packages/core/test/GateState.test.ts`, `GateState.tst.ts`, `packages/react/test/DecisionOutcome.tst.ts`, `packages/devtools/test/model/DockModel.test.ts` (M30-M32, P2), `Gates.test.ts`, `packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx`, `QuestionsPanel.gates.test.tsx`. Existing rows to extend (not duplicate): `traceability.md:493` (`DockModel.test.ts`) and the `Gates.test.ts` row. The strict verifier is `pnpm spec:verify:strict`.
- Stale phrases to correct in the same change: `spec/overview.md:585`, `DockModel.ts:2, 20-24`, `DockModel.test.ts:4-6`, `DevtoolsDock.tsx:101-102`. `spec/behaviors/28-devtools-screens.md:886-925` says the diagnostics poll is "the seventh store" and the timeline status "the eighth readout"; leave as history and let ADR-QD-162 state the new count (Open Question 2).

**Changesets.** `.changeset/*.md` use the form
```
---
"@qadi/core": minor
---

**A decision sink that fails is reported once.** ...

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
```
[VERIFIED: `.changeset/sink-emitter-reports-failures.md:1-8`]. The package set is one fixed group (`.changeset/config.json` `fixed`: core, testing, promise, react, http, devtools, audit, predicate-sql, predicate-prisma), so the three files below version together. Planned files (names in the repo's kebab style): `gate-states-stated-once.md` (`@qadi/core` minor: three exports, `GateState`, `isGateState`, `gateStates`), `react-gate-render-state-derived.md` (`@qadi/react` patch, or **minor Breaking** under Option A: `DevtoolsFeed.gates` type), `devtools-gates-is-a-registry.md` (`@qadi/devtools` minor, **Breaking**: `DevtoolsDockProps.gates` is `GateRegistryLike`, and `GateRegistryLike` is exported). Each Breaking changeset says **Breaking** in bold and points at the 0.13 section.

**0.13 upgrade entry** (`apps/website/src/content/docs/docs/reference/upgrading.md`): the last `## 0.13:` heading is at `:829` ("audit reports core's refusal, and AuditEntryNotEncodable is gone") and the one before it at `:794` ("a port's defaulted state is read from the port, not its name") shows the format: heading, a paragraph naming the old and new behaviour, a `Before:` ` ```ts ` fence and an `After:` ` ```typescript ` fence (the second is compiled by `spec:website-examples`), and a final line linking the ADR (`The decision is [ADR-QD-160](https://github.com/leaderiop/qadi/blob/main/spec/decisions/160-...md).`). New heading: `## 0.13: the dock takes the gate registry, not its instances`. Before: `<DevtoolsDock gates={useGateInstances()} />`; After: `<DevtoolsDock gates={atoms.gates} />` (or the provider's registry from `useQadiContext`), plus the D-12a message change, plus Option A's feed line if chosen. The `After` fence must compile against the real exports.

**Website docs** that show the old wiring are listed in Q7. `pnpm spec:website-examples` is the check that catches a stale fence (it failed on the unchanged `devtools.md` fence once the dock's prop changed, output above).

**AGENTS.md.** No budget changes (no `as`, `!`, `any`, `switch`, `fnUntraced`, `hasCustom`, `Schema.TaggedError`, untrusted-decode token, metric or port double added). The §13 text "Each atom set's `gates` registry ... is what a guard writes to from an effect" and the §15 gate-13 paragraph need no edit; add one sentence only if the ADR changes what §13 says about who reads the registry (the dock model now subscribes). [ASSUMED] no AGENTS.md edit is needed.

### Q10. Validation Architecture: see the section below.

### Q11. Security Domain: see the section below.

## Common Pitfalls

### Pitfall 1: a characterisation whose golden is produced by the code under change
**What goes wrong:** the golden strings are copied from the post-change output, so the test can never fail on the change it exists to catch.
**Why it happens:** it is the fast path once the panel renders something.
**How to avoid:** capture on the phase base (twelve cells, twice, compare byte for byte), commit the literals in a commit with no `packages/*/src` change, run it green, and only then change the harness helper. The only expected diff afterwards is D-12a's one sentence in two cells.
**Warning signs:** the characterisation file appears in the same commit as a `src` edit.

### Pitfall 2: reusing a stale instances list on a poll publish
**What goes wrong:** the snapshot pairs a question from poll N with guards from registry state N-1; the panel shows an `asked, nothing mounted` row for a mounted guard for one render.
**Why it happens:** caching `registry.instances()` "because it is the same until a change".
**How to avoid:** the recompute reads both in one call (Pattern 3); the property's "on notify" subscriber and `snapshot.instances === registry.instances()` assert it.
**Warning signs:** the negative control passing.

### Pitfall 3: a snapshot whose flat `instances` is a copy
**What goes wrong:** `useLens(instances)`'s effect (`useLens.ts:43-56`) depends on the array identity, so a copy per snapshot clears and redraws the lens overlay on every poll tick.
**How to avoid:** `instances` is the registry's array itself, or one module constant when absent; assert `strictEqual`, not `deepStrictEqual`.

### Pitfall 4: the panel prop name `row` shadowing the style constant
**What goes wrong:** `QuestionsPanel.tsx:80` declares `const row: CSSProperties`, and a component prop named `row` makes `style={row}` pass a `QuestionRow` (TS2559).
**How to avoid:** name the prop `entry`.

### Pitfall 5: a listener that throws into the guard's effect
**What goes wrong:** the react registry catches listener errors (`GateRegistry.ts:86-92`); a structural registry double need not, and `rejoin` calls the host's `instances()`.
**How to avoid:** `rejoin` does only reads and a `set`; a throwing `instances()` is the host's defect. Do not add a `try`/`catch` that hides it (a swallowed error is a silent lockout in the panel); say so in the ADR.

### Pitfall 6: subscribing at the wrong time
**What goes wrong:** subscribing before `shownReading` exists, or after a host listener, changes which store moves first; a `configure` after close re-subscribes on a dead model.
**How to avoid:** subscribe after `shownReading` is built and before any host listener; track `closed`; release in the finalizer; re-subscribe only when the registry's identity changed.

### Pitfall 7: the ordinal arithmetic
**What goes wrong:** ADR text calling `questions` "the eighth store" while BEH-QD-506 calls diagnostics "the seventh" and the status "the eighth readout".
**How to avoid:** the ADR states the count once with the thunk excluded (seven stores + `questions` = eight; `sightings` is the ninth readout) and says the earlier ordinals counted the rail; do not retitle BEH-QD-506 (an anchor).

### Pitfall 8: the characterisation depends on the old prop
**What goes wrong:** the harness helper `gatesProp` is imported by the committed characterisation; after the change it returns a registry double, and the file's own expected values must not move.
**How to avoid:** keep the helper one function in one file, and commit the change to it together with the dock change, nothing else in the characterisation.

### Pitfall 9: the website and the example break at typecheck, not at test time
**What goes wrong:** `pnpm check:pr` passes locally for devtools and react and fails in `pnpm example`/`pnpm spec:website-examples` because `{...feed}` stopped compiling.
**How to avoid:** resolve Open Question 1 first; run both after the dock's prop changes.

### Pitfall 10: `gateGroups` stays unexported
**What goes wrong:** exporting `gateGroups` from the barrel to let the model use it breaks `surface.tst.ts:134` (`export { gateGroups } from "../src/index.ts";` under `@ts-expect-error`) and gate 13.
**How to avoid:** the model imports it from `./Gates.ts` (same package, same model folder); nothing crosses the barrel.

## Code Examples

### 1. Core vocabulary and its devtools derivation

```typescript
// packages/core/src/GateState.ts  (see Pattern 1)

// packages/devtools/src/model/Gates.ts, after the change
import { gateStates, isGateState } from "@qadi/core";
import type { GateState, Policy, Resource } from "@qadi/core";

const GATE_DISPLAY: { readonly [K in GateState]: DisplayState } = {
  Failed: "Error",
  Denied: "Deny",
  Rechecking: "Rechecking",
  Pending: "Pending",
  Allowed: "Allow",
};

export const GATE_STATES: ReadonlyArray<string> = gateStates;

export const displayOfGateState = (state: string): DisplayState =>
  isGateState(state) ? GATE_DISPLAY[state] : "Unrecognised";
```

### 2. The join, the registry type and the snapshot (compiled in the scratch implementation)

```typescript
export interface GateRegistryLike {
  readonly instances: () => ReadonlyArray<GateInstanceLike>;
  readonly subscribe: (listener: () => void) => () => void;
}

export interface JoinInput {
  readonly questions: ReadonlyArray<AskedQuestionLike> | undefined;
  readonly gates: ReadonlyArray<GateInstanceLike> | undefined;
  /** Already reduced to "no sample yet and no questions": the only case the view needs. */
  readonly unsampled: boolean;
}

const NO_INSTANCES: ReadonlyArray<GateInstanceLike> = [];
const GATES_ABSENT = GatesView.Absent();
const GATES_EMPTY = GatesView.Empty();
const QUESTIONS_UNSAMPLED = QuestionsView.Unsampled();
const QUESTIONS_ABSENT = QuestionsView.Absent();
const QUESTIONS_EMPTY = QuestionsView.Empty();

/** Joins the asked questions to the guards asking them: the one place the panel's rows are decided. */
export const joinQuestions = (input: JoinInput): QuestionsSnapshot => {
  const instances = input.gates ?? NO_INSTANCES;
  const groups = gateGroups(instances);
  const rowOf = (question: AskedQuestionLike): QuestionRow => ({
    question,
    asking: instancesAsking(groups, question.policy, question.resource),
  });
  return {
    gates:
      input.gates === undefined
        ? GATES_ABSENT
        : Arr.isReadonlyArrayNonEmpty(input.gates)
          ? GatesView.Listed({ instances })
          : GATES_EMPTY,
    questions:
      input.questions === undefined
        ? input.unsampled
          ? QUESTIONS_UNSAMPLED
          : QUESTIONS_ABSENT
        : Arr.isReadonlyArrayNonEmpty(input.questions)
          ? QuestionsView.Rows({ rows: input.questions.map(rowOf) })
          : QUESTIONS_EMPTY,
    instances,
  };
};
```

### 3. The eighth store inside `makeDockModel` (compiled and run)

```typescript
let gatesNow = inputs.gates;
let closed = false;
let offGates = () => {};
const joinKeyNow = () => {
  const { status, reading } = shownReading.getSnapshot();
  return {
    questions: reading.questions,
    gates: gatesNow?.instances(),
    unsampled: reading.questions === undefined && isUnsampled(status),
  };
};
let lastKey = joinKeyNow();
const questions = makeExternalStore<QuestionsSnapshot>(joinQuestions(lastKey));
const rejoin = () => {
  const key = joinKeyNow();
  if (key.questions === lastKey.questions && key.gates === lastKey.gates && key.unsampled === lastKey.unsampled) return;
  lastKey = key;
  questions.set(joinQuestions(key));
};
const watchGates = (registry: GateRegistryLike | undefined) => {
  offGates();
  offGates = closed || registry === undefined ? () => {} : registry.subscribe(rejoin);
};
shownReading.subscribe(rejoin);
watchGates(gatesNow);
yield* Effect.addFinalizer(() =>
  Effect.sync(() => {
    closed = true;
    offGates();
    offGates = () => {};
  }),
);
// configure: after `diagnosticsFeed.configure(next.diagnostics); remerge();`
//   if (next.gates !== gatesNow) { gatesNow = next.gates; watchGates(gatesNow); }
//   rejoin();
```

The `Parameters<typeof joinQuestions>[0]["questions"]` indirection in the scratch (`asked`) was only to avoid widening the key's `questions` type to `ReadonlyArray<unknown>`; declare the key as `JoinInput` and drop it.

### 4. The panel's view dispatch (hoisted, exhaustive)

```tsx
const gatesBlock: (view: GatesView) => (lens: Lens) => ReactNode = Match.type<GatesView>().pipe(
  Match.tagsExhaustive({
    Absent: () => () => <p style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-gates-absent">{GATES_ABSENT_TEXT}</p>,
    Empty:  () => () => <p style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-gates-absent">{GATES_EMPTY_TEXT}</p>,
    Listed: () => (lens: Lens) => <PickButton lens={lens} />,
  }),
);
```

The three texts are the base strings with D-12a applied to `GATES_ABSENT_TEXT`. The scratch used inline strings in the arms; hoisting them is a style choice and changes no output. `Lens` is `ReturnType<typeof useLens>`.

### 5. The characterisation cell list and a registry double

```typescript
export const gatesProp = (instances: ReadonlyArray<GateInstanceLike>): GateRegistryLike => ({
  instances: () => instances,
  subscribe: () => () => {},
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| A union restated in two packages (`GateWriter.ts:55`, `Gates.ts:77`) with no test tying them | one table in core, derived by both, with a two-way tstyche pin | this phase (ADR-QD-162, applying ADR-QD-152) | a sixth word is a compile error where it matters |
| The dock takes a `gates` array, the panel joins it in the view | the dock takes the registry, the model joins | this phase | rows come from one moment and the join is tested without rendering |
| A host re-renders on every guard change to feed the dock (`useGateInstances()`) | the host hands over the registry; the model subscribes | this phase (Option A removes the feed's host-side subscription too) | fewer renders in the host |

**Deprecated/outdated:**
- `GateInstanceLike`'s doc line "A host passes `useGateInstances()` or `atoms.gates.instances()` straight in" (`Gates.ts:52`): the host passes the registry.
- The "Gates are not in it ... stay the plain `gates` prop" paragraph in `DevtoolsDock.tsx:101-102`.

## Runtime State Inventory

Not a rename or migration phase; omitted per the template. (One note for completeness: no stored data, service config, OS registration, secret or build artifact carries the gate-state words by name, and nothing persisted keys on them. `GateRenderState` is a compile-time type.)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The empty `interface GateStateRow {}` draws no lint finding in CI beyond what `oxlint` printed (it printed nothing for the file). | Q1 | A lint step flags it; use `satisfies { readonly [state: string]: object }` instead. |
| A2 | The BEH split into five records (581 vocabulary, 582 Unrecognised, 583 join one moment, 584 registry as input, 585 prop and copy) is the right granularity. | Q9 | The planner merges or splits; ids are reserved as 581..585, so only five exist. |
| A3 | No AGENTS.md edit is needed. | Q9 | A §13 sentence about who reads the registry may merit one line; low risk. |
| A4 | `vitest --project core` is the core project name (devtools and react were confirmed; the root config is `projects: ["packages/*"]`). | Validation Architecture | The quick command needs the right name; `pnpm exec vitest run packages/core/test/GateState.test.ts` works regardless. |
| A5 | A real `@qadi/react` host passing `atoms.gates` as `GateRegistryLike` is also covered by a permanent type test; only a scratch compile was run. | Q4 | The planner adds the test (listed in Wave 0). |

## Open Questions

1. **`useDevtoolsFeed()` returns `gates` as an array, and D-09 makes the dock's `gates` a registry.**
   - What we know: the feed is spread onto the dock in `examples/nextjs-newsroom/src/client/Dock.tsx:163`, in the website fence `apps/website/src/content/docs/docs/packages/devtools.md` and in two READMEs. After D-09 the spread fails to compile (verbatim output in Q7). D-17 lists only a react **patch** for `GateRenderState`, and GATE-05/D-16 say the react suite passes untouched.
   - What's unclear: whether the feed should follow the dock (Option A) or the host should name the registry (Option B).
   - Option A (recommended; the cleanest and most complete, per the user's standing preference): `DevtoolsFeed.gates: GateRegistry`, taken from `useQadiContext` with no `useGateInstances()` call. Probed: typecheck clean, `66 block(s) compile`, react suite 517/518 with the single failure being the two feed assertions at `packages/react/test/DevtoolsFeed.test.tsx:176, 188`. Costs: those two assertions change to read `feed.gates.instances()` (an exception to "untouched" that the ADR must name), the `@qadi/react` changeset becomes **minor, Breaking** (the type of `DevtoolsFeed.gates`), `spec/behaviors/09-react.md:640` and `spec/overview.md:579` change, a second 0.13 sentence is added. Benefit: hosts that spread the feed need no edit, and the host no longer re-renders per guard mount.
   - Option B: leave `useDevtoolsFeed` alone. Costs: every spreading host adds `gates={...}` after the spread (the example's `Dock.tsx`, three docs), the react suite is truly untouched and the react changeset stays a patch, but the feed then hands a `gates` field the dock cannot take and a host that forgets the override gets a type error rather than a silent miss.
   - Recommendation: ask the user to choose before plan 3 is written; default to Option A if the user delegates.

2. **The ordinal wording ("seventh store", "eighth readout") in older records.**
   - What we know: counted with the rail as a store, the new store is the ninth; counted as D-11 does (thunk excluded), it is the eighth.
   - What's unclear: whether to amend BEH-QD-506/BEH-QD-519's wording.
   - Recommendation: do not retitle (anchors are linked); ADR-QD-162 states the count once and says the earlier ordinals used the older counting; add a one-line amendment note under BEH-QD-506 only if the plan-checker asks.

3. **`GatesView` tags.** Three (`Absent`, `Empty`, `Listed`) are recommended and probed; a two-tag form is possible but moves a `length === 0` check back into the view. Discretion.

4. **Exporting `GATE_STATES`.** It stays exported from `model/Gates.ts` (its test imports it) and not from the barrel (D-07); the vocabulary the barrel offers is core's `gateStates`. No action.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 | — |
| pnpm | commands | yes | 10.17.1 | — |
| effect | runtime | yes | 4.1.2 | — |
| vitest, tstyche, fast-check, Stryker | tests and mutation | yes | tstyche 7.2.5, Stryker 10.1.1 | — |
| happy-dom / @testing-library | panel tests | yes (used by the existing devtools suite and the probes) | — | — |
| Playwright + Chromium | `examples/nextjs-newsroom` e2e (part of that package's own `check`) | not run this session | — | The example's `typecheck` and `vitest` cover the dock-wiring change; the e2e specs do not read the panel markup (Q5). |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Playwright e2e was not executed; the gate that matters is `pnpm example` (part of `pnpm check`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (projects `packages/*`), `@effect/vitest`, tstyche 7.2.5, `@testing-library/react`, fast-check, Stryker 10.1.1 |
| Config file | `vitest.config.ts` (`projects: ["packages/*"]`), `tstyche` default config, `stryker.config.mjs`, `stryker.devtools.mjs`, `stryker.react.mjs` |
| Quick run command | `pnpm exec vitest run --project devtools packages/devtools/test/model/Gates.test.ts packages/devtools/test/model/DockModel.test.ts` |
| Full suite command | `pnpm check:pr < /dev/null` (the merge gate minus mutation, `scripts/run-check.mjs --skip-mutation`); `pnpm check` adds `pnpm mutation` |

`pnpm check` is `pnpm typecheck && pnpm lint && pnpm circular && pnpm test:tstyche && pnpm coverage && pnpm test:bdd && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api && pnpm spec:package && pnpm example && pnpm mutation && pnpm spec:website-examples && pnpm website && pnpm spec:publish` [VERIFIED: `package.json:41`].

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GATE-01 | the five words, their order, the guard, own keys only | unit | `pnpm exec vitest run --project core packages/core/test/GateState.test.ts` | Wave 0 |
| GATE-01 | the union written out; `isGateState` narrows a string | type | `pnpm exec tstyche packages/core/test/GateState.tst.ts` | Wave 0 |
| GATE-01 | react's `GateRenderState`, `DecisionOutcome["_tag"]` and core's `GateState` are one set, both directions | type | `pnpm exec tstyche packages/react/test/DecisionOutcome.tst.ts` | exists, edited |
| GATE-01 | a sixth core word is a devtools compile error | typecheck | `pnpm exec tsc -p tsconfig.test.json` (negative control recorded as a RED demo, not committed) | n/a |
| GATE-02 | unknown state (`Suspended`, `toString`, `""`) is `Unrecognised`; `GATE_STATES` order | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/Gates.test.ts` | exists (`:220-238`) |
| GATE-02 | the panel shows it as itself with `data-treatment="Unrecognised"` | characterisation | `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx` | Wave 0 |
| GATE-03 | `joinQuestions`: Absent/Empty/Listed, Unsampled/Absent/Empty/Rows, instances identity | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/Gates.test.ts` | exists, extended |
| GATE-03 | the store: recompute on poll and on registry; reference kept on a quiet tick; scope releases; configure swaps | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` (M30-M32) | exists, extended |
| GATE-03 | panel renders the snapshot; D-12a text; lens/pick/highlight unchanged | component | `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.gates.test.tsx packages/devtools/test/react/QuestionsPanel.test.tsx packages/devtools/test/react/VerdictTreatment.test.tsx` | exist, harness changed |
| GATE-03 | `GateRegistryLike` accepts react's `GateRegistry` (and `atoms.gates`) | type | `pnpm exec tstyche packages/react/test/...` or `pnpm exec tsc -p tsconfig.test.json` | Wave 0 |
| GATE-04 | rows of every snapshot equal the join of one moment | property | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts -t P2` | Wave 0 (in an existing file) |
| GATE-05 | uninstrumented: nothing registered; panel shows the absent message; react suite passes | integration | `pnpm exec vitest run --project react` (518 tests on the base; 518 after the derivation) | exists |
| GATE-05 | Activity hide/show and StrictMode leave one subscription | component | `pnpm exec vitest run --project devtools packages/devtools/test/react/DevtoolsDock.test.tsx` | extend (Wave 0 adds the case) |
| WX-05 | mutation scores do not fall | mutation | the three commands in Q8 | n/a |
| WX-03 | overview names every export | gate | `pnpm spec:api` | exists |
| WX-07 | the upgrade fence compiles | gate | `pnpm spec:website-examples` | exists |

### Sampling Rate
- **Per task commit:** the quick command for the touched package, plus `pnpm exec tsc -p tsconfig.test.json` (about 30 s) when types move.
- **Per wave merge:** `pnpm check:pr < /dev/null`, plus the three Stryker runs of Q8 after the store lands.
- **Phase gate:** `pnpm check:pr < /dev/null` green and the mutation comparison recorded in `49-mutation-base.json`/`49-mutation-after.json` (the Phase 48 convention) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx`: twelve cells through the public dock, golden literals captured on the base (commit alone, before any `packages/*/src` edit); a one-function `gatesProp` helper.
- [ ] `packages/core/test/GateState.test.ts` and `GateState.tst.ts`: modelled on `HydrationMetrics.test.ts` and `HydrationMetrics.tst.ts` (RED until `GateState.ts` exists).
- [ ] The two-way pin in `packages/react/test/DecisionOutcome.tst.ts` (reword `:40-41`, add the two `Exclude` assertions).
- [ ] `DockModel.test.ts` cases M30-M32 and P2 (registry double with react's contract, `FastCheck.sample`, `TestClock`).
- [ ] An Activity/StrictMode registry-subscription case in `DevtoolsDock.test.tsx` (the probe's two cases are the template).
- [ ] A permanent type test that `GateRegistry`/`atoms.gates` is assignable to `GateRegistryLike`.
- [ ] Framework install: none.

## Security Domain

`workflow.security_enforcement` is `true` and `security_asvs_level` is `1` [VERIFIED: `.planning/config.json`].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | The phase adds no identity or credential handling. |
| V3 Session Management | no | Nothing session-related is touched. |
| V4 Access Control | no | No authorization decision is made or changed; the model holds instances and questions, never a verdict (AGENTS.md §13; ADR-QD-080: "a registry holds who is asking and what each guard rendered, never a verdict"). |
| V5 Input Validation | yes | An unknown `state` string from a structural registry is handled by an own-key guard (`Object.hasOwn`), so `"toString"`, `"__proto__"` and `""` are `Unrecognised`, never a table lookup that returns an inherited member. |
| V6 Cryptography | no | None. |
| V7 Errors and logging | yes (light) | No `console.*` (forbidden, §6); a throwing registry is not swallowed by the model (Pitfall 5). |
| V14 Configuration | no | No new config, no new dependency. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| An inherited-property key used as a state (`"toString"`, `"constructor"`, `"__proto__"`) indexing a table | Tampering | `Object.hasOwn` guard before any `GATE_DISPLAY[state]` read (existing, kept; the `"toString"` row stays at `Gates.test.ts:231`). |
| A newer react paired with an older devtools sending a state this build does not know | Spoofing (a guard drawn as an answer) | `Unrecognised`, muted and labelled with its own name; `instance.state` rendered as React text, escaped by React (no `dangerouslySetInnerHTML` or `innerHTML` in `packages/devtools/src`, checked with `/usr/bin/grep`, which returned no match). |
| A hostile page supplying a registry that mounts guards it does not own | Spoofing | The registry is host-supplied and the model only reads and renders it; `id` is used as a React key and a lens lookup, never as markup. No new trust boundary: devtools has always rendered what the host hands it. |
| A registry listener that throws into the guard's effect | Denial of service | `rejoin` is read-and-set only; the react registry already isolates listeners (`GateRegistry.ts:86-92`). |
| A retained verdict in the registry or the model | Information disclosure / integrity | The snapshot holds `GateInstanceLike` and `AskedQuestionLike` only; the `DECISION_READ_BUDGET` gate refuses a raw `AsyncResult` read, and none is added. |

## Sources

### Primary (HIGH confidence)
- In-repo files read this session, each cited with line ranges above: `packages/core/src/HydrationMetrics.ts`, `packages/core/src/index.ts`, `packages/react/src/GateWriter.ts`, `GateRegistry.ts`, `hooks.ts`, `DecisionOutcome.ts`, `DevtoolsFeed.ts`, `QadiProvider.tsx`, `packages/react/test/DecisionOutcome.tst.ts`, `DevtoolsFeed.test.tsx`, `packages/devtools/src/model/{Gates,DockModel,ExternalStore,DiagnosticsFeed,DiagnosticsStore,Verdict}.ts`, `src/react/{DevtoolsDock,QuestionsPanel,useDockModel,useStoreSnapshot,useLens}.ts(x)`, `src/index.ts`, `src/react/index.ts`, `test/model/{Gates,DockModel}.test.ts`, `test/react/QuestionsPanel*.test.tsx`, `test/surface.tst.ts`, `AGENTS.md`, `.planning/{ROADMAP,REQUIREMENTS,config}.json|md`, `49-CONTEXT.md`, `49-UI-SPEC.md`, `48-RESEARCH.md` (layout), `spec/decisions/{047,053,080,137,161}-*.md`, `spec/decisions/index.yaml`, `spec/overview.md`, `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`, `scripts/spec-revise.mjs`, `scripts/check-api-surface.mjs` output, `.changeset/*`, `apps/website/.../upgrading.md`.
- Probe outputs recorded verbatim above: tstyche (4 assertions green, two RED demos), `check-api-surface.mjs`, `check-website-doc-examples.mjs`, Stryker (devtools base and scratch, react base, core probe), the twelve-cell characterisation diff, the Activity/StrictMode counts, the property and its negative control.

### Secondary (MEDIUM confidence)
- Spec-record wording for ADR-QD-162, the BEH split and the changeset names are modelled on Phase 48's records and have not been written.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new package; all versions read from the installed tree.
- Architecture: HIGH, the store, panel and wiring were implemented in-tree, compiled, and run against the existing suites before being reverted.
- Pitfalls: HIGH for the nine measured ones, MEDIUM for the lint note (A1).
- Open Question 1 is a decision, not a research gap.

**Research date:** 2026-11-16
**Valid until:** 2026-11-23 (this branch moves one phase per day; re-read `DockModel.ts`, `Gates.ts` and `DevtoolsFeed.ts` if any commit touches `packages/devtools/src/model` or `packages/react/src` first)
