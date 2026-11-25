# Phase 84: `useConfigured` requires `configure`, and the review's small finds - Research

**Researched:** 2026-11-25
**Domain:** `@qadi/devtools` package-private React hooks and one headless model file (TypeScript structural constraint, `useSyncExternalStore` hooks, tstyche type pins, Stryker, spec registers)
**Confidence:** HIGH (every integration point was opened at HEAD `8ff027e1`; the one new type signature was compiled under TS 6.0.3 and TS 7.0.2)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Copied from `84-CONTEXT.md` `## Implementation Decisions` (D-01..D-27). The full text is in that file; the load-bearing statements are reproduced verbatim here and the rest by reference to the decision number.

- **D-01:** Work on branch `arch-wave-15` only, one phase at a time, on the main tree (`use_worktrees` is false). No merge, push, tag, release, publish, `changeset version` or version-packages PR (WX-07).
- **D-02:** Use only the reserved records: ARCH-131, ADR-QD-197, CCR-QD-476, BEH-QD-756..760 and INV-QD-413..414. Never run `node scripts/next-id.mjs`. Name a reserved number left unused as "Unused" in the CCR-QD-476 row. Make spec edits only through `node scripts/spec-revise.mjs <doc> "<change (CCR-QD-476)>" --date <the real date>`, and verify each with `--check`. No D-number, plan-local id or phase number goes in shipped source, a test title or a BDD scenario. No `*-NEXT` placeholder goes anywhere.
- **D-03:** Tests come first (WX-06). There is no defect, so there is no RED. Every characterisation (D-19) is written on the phase base, green there and at every later commit. Each is shown failing once under a scratch source edit, with the output saved in `84-EVIDENCE.md`. Every new check is shown failing once. No throwaway file exists at any commit or when a mutation record is taken. A surviving mutant is closed with a test, never by re-baselining (WX-05).
- **D-04:** Nothing new from WX-04's list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, an ambient console, `process.env` or clock, `Record<string, unknown>`, `// Stryker disable`, or a module-scope `let`. `MODULE_STATE_BUDGET`, `SWITCH_BUDGET`, `UNTRACED_BUDGET` and `NOT_CALLABLE_PIN_BUDGET` do not move (D-07).
- **D-05:** One named structural constraint, `Configurable<I>`, declared once in `react/useConfigured.ts`: `interface Configurable<I> { readonly configure: (inputs: I) => void }`; signature `useConfigured<A extends Configurable<I>, I>(make: () => Effect.Effect<A, never, Scope.Scope>, inputs: I): A | undefined`. The two `configure` calls stay where they are (`built.configure(inputs)` tapped onto the scoped build, `value.configure(inputs)` in the layout effect keyed `[value, inputs]`). The member is a function property, not a method signature. `Configurable` is exported from `useConfigured.ts` for its type test only and stays out of both barrels; `surface.tst.ts` gains a "no exported member" pin for it under both entries.
- **D-06:** Inference checked at HEAD with no explicit type arguments: `makeDockModel` infers `DockModel`, `makeTimelineFeed` infers `TimelineFeed`, `makeDiagnosticsFeed` infers `DiagnosticsFeed`; three calls refused. The three call sites lose their adapter, keep their comments (reworded where they name an adapter) and take no type argument.
- **D-07:** Type pins in a new `packages/devtools/test/react/useConfigured.tst.ts`: positive pins (`expect<DockModel>().type.toBeAssignableTo<Configurable<DockModelInputs>>()` and the same for `TimelineFeed` over `TimelineFeedInputs` and `DiagnosticsFeed` over `DiagnosticsOptions | undefined`), a return-type pin per hook (`ReturnType<typeof useDockModel>` is `DockModel | undefined`, `useTimeline`'s is `UseTimeline`, `useDiagnostics`'s is `DiagnosticsSnapshot`), and one `@ts-expect-error` refusal of a value with no `configure`, its message fragment checked by tstyche as `ConfigureInputs.tst.ts` does, beside an accepted twin that differs only in having `configure`. Seen failing once with the constraint loosened in a scratch edit. Not a `toBeCallableWith` pin, so no budget moves. Rejected: a negative `not.toBeCallableWith` pin.
- **D-08:** `useConfigured.test.tsx`: the double carries `configure`, U1..U4 re-expressed over it. On the phase base `Double` gains `configure` and the harness's one call reads `useConfigured(make, (double, inputs) => double.configure(inputs), inputs)`, U1..U4 green with titles and assertions unchanged. At the signature change the one call line becomes `useConfigured(make, inputs)`; that is the file's one declared edit (D-20).
- **D-09:** `move` is deleted; `toggle`, `hover`, `cancel` and `highlight` call `store.set(next)`. `choose` keeps `const current = store.getSnapshot()`, the `next === current` early return answering `false`, `armed = pickedOf(next)` with its comment "Armed before the publish, so a listener told of the pick can take its reveal", and `return true`; only its publish becomes `set`. After this `LensSession.ts` calls no `publish`. The module doc stays true and gains one clause: through the store's `set`. Rejected: collapsing `choose` to `store.set(next); return true`; arming after the publish; keeping `move`.
- **D-10:** `LensSession.test.ts:304` ("a listener told of a pick can take its reveal", asserts `taken` is `[true]`) is the arm-before-publish pin. At the base a scratch edit swaps `:172` and `:173` and the pin is seen failing (`[false]`), output in `84-EVIDENCE.md`, reverted with `git checkout`, tree checked clean. The same scratch swap is made again after D-09 and seen failing. The property at `:378` is the pin for the boolean. `LensSession.test.ts` is held unedited (D-20).
- **D-11:** `useLens(lens: LensSession, questions: ReadableStore<QuestionsSnapshot>): UseLens`, with `interface UseLens { readonly lens: LensSnapshot; readonly questions: QuestionsSnapshot }` in `useLens.ts`, out of both barrels. The hook calls `useStoreSnapshot(questions)` first and `useStoreSnapshot(lens)` second. The draw effect reads `read.questions.instances` from that subscription, keyed `[highlighted, instances]`. The listener effect stays keyed `[picking, lens, questions]` and each handler reads `questions.getSnapshot().instances` when its event arrives. The exit effect keyed `[lens]` is unchanged. No ref exists and none is written during render. Rejected: subscribing inside while the panel also subscribes; `useLens(lens, instances)` with a ref; keeping three parameters.
- **D-12:** `QuestionsPanel` replaces `const snapshot = useStoreSnapshot(questions)` (`:114`) and the `useLens(lens, questions, snapshot.instances)` call (`:118`) with one `useLens(lens, questions)` call and reads `.questions` for `gatesBlock`/`questionsBlock` and `.lens` for `LensView.snapshot`. No markup, copy, test id or style moves; `QuestionsPanelProps` unchanged; exactly one subscription to each store, pinned by `Lens.adapter.test.tsx:138` and `:160`, held byte for byte.
- **D-13:** `Lens.adapter.test.tsx`'s `mount`: the line `useLens(lens, questions, useStoreSnapshot(questions).instances);` (`:53`) becomes `useLens(lens, questions);` and the unused `useStoreSnapshot` import (`:20`) goes. These are the file's declared edits; every `it` is held byte for byte.
- **D-14:** Records move in the same commit as the signature: ADR-QD-193's dated amendment to decision 6, BEH-QD-737's restated pinned-by text, and the traceability row for `Lens.adapter.test.tsx`, found by its file cell (line 696 at HEAD, not 661). `84-check.mjs` checks this (D-21).
- **D-15:** One package-private hook `useStopNotice<S>(status: S, onRestart: () => void): StopNoticeProps<S>` in new `react/useStopNotice.ts`; it holds its own `useRef<StopLedger<S>>(noStops)` and returns `useMemo(() => ({ status, onRestart, announced }), [status, onRestart])`. `DockFrame` calls `useStopNotice(status, model.diagnostics.restart)` and `useStopNotice(timelineStatus, model.timelineStatus.restart)`. The memo is keyed on `onRestart`, not on `model` (equivalent: each `restart` is one closure per feed). The ledger records only which stop was announced (AGENTS.md §13); the one comment saying so lives in the hook. Rejected: one ref holding both ledgers; memoising on `status` alone; leaving the two copies.
- **D-16:** One generic `StopNoticeProps<S>` declared once in `react/StoppedBox.tsx` beside `StopLedger<S>`, fields `status`, `onRestart`, `announced: RefObject<StopLedger<S>>`, with the doc comments both notices carry today said once. `DiagnosticsNoticeProps` becomes `type DiagnosticsNoticeProps = StopNoticeProps<DiagnosticsStatus>`, `TimelineNoticeProps` likewise. Names kept so `test/helpers.ts`, `DiagnosticsNotice.test.tsx` and `TimelineNotice.test.tsx` compile unedited. Neither name enters a barrel.
- **D-17:** No memo for `useTimeline`'s per-render record. The rejection is recorded in ADR-QD-197 and in ADR-QD-192 decision 8's amendment, for four reasons (the value's own rule makes a memo a no-op; the other records are fresh by construction; memoising one of three hooks makes them asymmetric; the retry of a failed watch depends on repeated calls) with the note that `useTimeline` never reaches the gates feed, so reason 4 is a reason to keep the three symmetric and not a dependency of `useTimeline`'s own calls. Rejected: `useMemo` in `useTimeline` only; a shallow compare in `useConfigured`.
- **D-18:** A pin that the rejection costs nothing, written on the base through `useTimeline`: a re-render with a fresh options object holding the same `capacity` and `source` publishes nothing from the timeline store and nothing from the status store (listeners counted directly); the same with no options after no options; a moved capacity publishes (the control). G43 and `DockRegistryReads.test.tsx` held unedited.
- **D-19:** Characterisations, each written on the phase base and green there before any source edit: `useConfigured.test.tsx` re-expressed (D-08); `test/react/Lens.questions.characterisation.test.tsx` through `QuestionsPanel` (a highlight follows the store when it republishes a guard with another element; a pointer move and a click while picking resolve against the store's current list; a guard dropped while highlighted leaves no overlay; one subscription to each store across those publishes; shown failing once); `test/react/DockFrame.stops.characterisation.test.tsx` through `DevtoolsDock` (a diagnostics stop and a timeline stop each announced once and independently; a second stop of one remounts only its own box; after a hidden-then-shown dock a Restart on each notice calls the rebuilt model's `restart`; shown failing once); `test/react/useTimeline.inputs.characterisation.test.tsx` (D-18); the arm-before-publish pin (D-10, existing test). Separate files preferred.
- **D-20:** Held files, checked by `84-pinned-check.mjs`. Byte for byte: `ConfigureFirstRender.characterisation.test.tsx` and `Lens.dock.characterisation.test.tsx` (also held by the archived `79-`/`80-characterisation-check.mjs`), `Lens.dock.test.tsx`, `LensSession.test.ts`, `DockRegistryReads.test.tsx`, `GatesFeed.test.ts` (G43), `TimelineNotice.test.tsx` (TN1-TN14), `DiagnosticsNotice.test.tsx` (N1-N15), `QuestionsPanel.feed.characterisation.test.tsx`, `TimelineLifetime.test.tsx`, `useTimeline.test.tsx`, `test/helpers.ts`, and the files Phase 80's pinned check holds (`Lens.test.ts`, `QuestionsPanel.test.tsx`, `VerdictTreatment.test.tsx`, `QuestionsPanel.gates.test.tsx`). Declared edits: `useConfigured.test.tsx` (D-08's one call line after its base commit), `Lens.adapter.test.tsx` (D-13), `surface.tst.ts` (D-05's added "no exported member" pins for `useStopNotice`, `StopNoticeProps`, `UseLens` and `Configurable` under the root and the React entry). Any other byte fails. The earlier phases' checks that hold any of these files are re-run from a scratch copy with paths rewritten, never by editing their directories (`84-earlier-checks.mjs`, pattern of `83-earlier-checks.mjs`); invocations and results go in `84-EVIDENCE.md`.
- **D-21:** Phase-local scripts mirror Phase 83's: `84-check.mjs`, `84-pinned-check.mjs`, `84-mutation.mjs`, `84-earlier-checks.mjs`. `84-check.mjs` carries 83's modes (`base`, `commit`, `unchanged`, `seen-failing`, `scan-ids`, `scan-forbidden`, `trailers`, `--self-test`) plus `no-adapter`, `no-restated-set`, `one-path`, `one-ledger` and `records`. `GUARDED` admits no AGENTS.md or `check-house-style.mjs` edit. Each script is shown failing once and each self-test plants the failure it guards.
- **D-22:** Commit order, every commit green: (1) scripts and the mutation base; (2) the characterisations, D-08's base form and D-10's base scratch evidence; (3) `useConfigured` and the three call sites with the type test; (4) `LensSession` and D-10's second scratch evidence; (5) `useLens` and the panel with D-14's records; (6) `useStopNotice` and `StopNoticeProps`; (7) the remaining records and the changeset; (8) the mutation close and the phase gates. Steps 3 to 6 are independent and may be reordered or merged; steps 1 and 2 come first, in that order.
- **D-23:** `phase_base` is HEAD at the start of planning, recorded by `84-check.mjs base`.
- **D-24:** Mutation measured like Phase 83's: base over `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/LensSession.ts` on a clean tree before any test or source edit, into `84-mutation-base.json`; close in `84-mutation-close.json`, re-taken after each review-fix round. The score may fall only because killed mutants were deleted (`move`'s body); no new Survived, NoCoverage or Ignored mutant; new literals stay inside function bodies; the absolute bar is no open mutant in `LensSession.ts`. `src/react` is unmeasured: `useConfigured.ts`, `useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts`, `useLens.ts`, `useStopNotice.ts`, `QuestionsPanel.tsx`, `DevtoolsDock.tsx`, `StoppedBox.tsx`, `DiagnosticsNotice.tsx`, `TimelineNotice.tsx`.
- **D-25:** Records: ADR-QD-197 (new, "A configurable value, one questions path for the lens, and one stop ledger") amending ADR-QD-192 decision 8 and ADR-QD-193 decision 6 as dated paragraphs with past text kept; BEH-QD-756..760 in `spec/behaviors/28-devtools-screens.md` (756 `useConfigured` and inference; 757 lens publishes through `set`, reveal armed before publish; 758 `useLens` takes session and store, subscribes once to each, returns both; 759 one hook for the two stop notices, each own ledger, each moves with its feed's `restart`; 760 a fresh equal-field record publishes nothing and the per-render hand-over is kept); amended pinned-by lists of BEH-QD-734, 736, 737; INV-QD-413 (reveal armed before the pick is published) and INV-QD-414 (the adapter reads guards only from the one questions store it is handed); INV-QD-406's Source amended; traceability rows, `spec/README.md`'s CCR-QD-476 row, `spec/decisions/index.yaml`. Checked and left unchanged: ADR-QD-137, ADR-QD-047, AGENTS.md §13, `spec/overview.md`, `upgrading.md:194`.
- **D-26:** One changeset `.changeset/devtools-lens-reads-each-fact-once.md`, `"@qadi/devtools": patch`, ending "No export changes." and claiming no host-visible behaviour change.
- **D-27:** Gates: `pnpm check:pr < /dev/null` green at the close and again after review fixes (WX-01); `pnpm spec:verify:strict` and `pnpm spec:package` pass at the close; `pnpm test:tstyche` passes under both configurations; gate 12 stays clean; devtools coverage at 90% or more (WX-05).

### Claude's Discretion
- The names `Configurable`, `UseLens`, `useStopNotice` and `StopNoticeProps` may change in planning if a clearer set emerges. Each must stay one named, package-private declaration, out of both barrels.
- The characterisation files' names, row ids and fixtures, and whether D-18's pin lives in its own file or beside `TimelineLifetime.test.tsx` as a new file. Held files are never edited for it.
- How plans group D-22's steps, provided steps 1 and 2 come first in that order and each commit is green.
- The changeset's wording, provided it ends "No export changes." and claims no host-visible change.

### Deferred Ideas (OUT OF SCOPE)
- Giving `runSource` a named sink type in place of `Pick<TimelineStore, "accept">`. This was carried from Phase 83's deferred list. It touches the timeline engine, which this phase does not touch.
- Moving `src/react`'s headless rules into a measured module so that a Stryker config reaches them. Today only `LensSession` is measured. The hooks here hold no rule of their own after this phase, so there is nothing to move.
- Unifying `stoppedKey`'s callers or the two notice components beyond their props type. They differ in copy, test ids and focus targets (`FEEDS` in `StoppedBox.tsx:47-52`), so this is not a duplicate.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADPT-01 | `useConfigured` takes a value that has `configure`; the three identical adapters are deleted and its test double is an object. Hidden `Activity` / StrictMode rebuild still configures with current inputs. | Signature compiles and infers under TS 6.0.3 and 7.0.2 (Code Examples 1). `useConfigured.ts:19-32`, adapters at `useDockModel.ts:22-24`, `useTimeline.ts:44-46`, `useDiagnostics.ts:19-21`. U4 (`useConfigured.test.tsx:116`) and C7..C9 (`ConfigureFirstRender`) cover the rebuild. Type pins and refusal fragment in Common Pitfalls 1 and Validation Architecture. |
| ADPT-02 | `LensSession` publishes through `ExternalStore.set`; `choose` still arms before publish and answers consumed. | `move` at `LensSession.ts:148-152`, `choose` at `:167-175`; `ExternalStore.set` at `:108-112`. Pins `LensSession.test.ts:304` and `:378`. Mutation group `lens` (Stryker section). |
| ADPT-03 | `useLens` receives each fact once; panel keeps one subscription to each store; handlers read guards at event time. | `useLens.ts:37-41, 49-60, 64-111, 113-118`; `QuestionsPanel.tsx:114-119`. Subscription pins `Lens.adapter.test.tsx:138, 160`. Hook order and the two-`useStoreSnapshot` finding in Architecture Patterns. |
| ADPT-04 | `DockFrame`'s stop-ledger ref and memoised notice exist once. | `DevtoolsDock.tsx:112-129`; `StoppedBox.tsx:25-70`; the two `*NoticeProps` at `DiagnosticsNotice.tsx:36-48` and `TimelineNotice.tsx:23-34`. Hook order after the change in Architecture Patterns. |
| ADPT-05 | `useTimeline`'s per-render record is memoised or recorded as a rejection against ADR-QD-192 decision 8, G43 unaffected. ADR-QD-197 records the phase or is named unused. | Rejection recorded (D-17). `useTimeline` exposes `store` and a status snapshot but not the status store, so D-18's status side compares snapshot identity (Common Pitfalls 6). |
| WX-01 | `pnpm check:pr < /dev/null` green at phase end. | Gates section. |
| WX-02 | Reserved ids only, `next-id.mjs` never run. | Reservation file reads `{"CCR":476,"ADR":197,"BEH":760,"INV":414}`; Spec mechanics. |
| WX-03 | `spec/overview.md` names every added export (gate 13); gate 14 probes changed public signatures. | No public export changes; `check-api-surface.mjs` reads barrels only, so package-private names do not register. Gates section. |
| WX-04 | No new forbidden construct; a budget moves only with its AGENTS.md table. | No budget moves. `check-house-style.mjs` is clean at HEAD. Pitfall 3 on the `"use client"` directive. |
| WX-05 | Coverage holds (devtools 90%, model 95%); Stryker score of touched files does not fall. | `vitest.config.ts` thresholds; Stryker section. |
| WX-06 | Every behaviour change preceded by a characterisation on the base; every new check seen failing. | Validation Architecture and Phase 83 lessons. |
| WX-07 | No D-numbers or phase numbers in shipped files; nothing released, pushed, merged. | `84-check.mjs scan-ids` (Phase 83 token list adapted). |
</phase_requirements>

## Summary

All five finds are small, package-private and independent. Every line number in CONTEXT's Integration Points was re-opened at HEAD `8ff027e1` and holds. The only drifts are the ones CONTEXT already records (traceability row 696, `useTimeline.ts:71`, `useLens.ts:37-41`, `useConfigured.ts:19-32`). The riskiest piece is not the code. It is the record-keeping around it: four phase scripts to port from Phase 83, a held-files model that spans five earlier phases' checks, a mutation base on `LensSession.ts`, and nine spec documents edited through `spec-revise`.

The one new type signature, `useConfigured<A extends Configurable<I>, I>(make, inputs)`, was compiled in a scratch project outside the repo under both TypeScript 6.0.3 (the version tstyche targets) and 7.0.2 (the default `tsc`). The three positive inferences hold with no type arguments and the three refusals fire with identical messages in both compilers. The usable `@ts-expect-error` fragment for the missing-`configure` refusal is `Property 'configure' is missing in type`.

`useLens`'s new shape calls `useStoreSnapshot` twice in one hook, which is safe because `useStoreSnapshot` is a bare `useSyncExternalStore` call over the store's own `subscribe`/`getSnapshot`. `useTimeline` returns `store` (subscribable) and a status snapshot, not the status store, so D-18's status side must compare snapshot identity across the re-render and cannot count listeners directly. One real trap exists in the Phase 83 tooling: its `scan-forbidden` rule flags a module-scope string literal in `packages/devtools/src/`, which would flag the `"use client";` directive in the new `useStopNotice.ts`. `84-check.mjs` must exempt that line and plant the exemption in its self-test.

**Primary recommendation:** Port Phase 83's four scripts first (commit 1), changing only the phase number, the scratch directory (`qd84`), the evidence file (`84-EVIDENCE.md`), the ID-token list and the phase modes; exempt the `"use client";` directive in `scan-forbidden`; take the `LensSession.ts` mutation base before any other edit; then follow D-22 unchanged.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hand current inputs to a built feed or dock model | Browser / Client (React hook layer, `src/react/useConfigured.ts`) | Headless model (`configure` on `DockModel`, `TimelineFeed`, `DiagnosticsFeed`) | The hook decides nothing about whether an input moved; each value's own `configure` owns the no-op rule (ADR-QD-192 decision 8). |
| Lens state transitions and the consumed-click answer | Headless model (`src/model/LensSession.ts`) | Store primitive (`ExternalStore.set`) | Lens rules live in the headless session; React holds no state (ADR-QD-193). Only this file is under the mutation gate. |
| Lens DOM listeners, overlays, the draw | Browser / Client (`src/react/useLens.ts` effects) | `src/react/Lens.ts` pure DOM operations | Every `document` reference stays inside an effect (AGENTS.md §13). |
| Reading the questions store once for draw and render | Browser / Client (`useLens` via `useStoreSnapshot`) | — | One subscription per store; event handlers read the store at event time. |
| Stop-notice ledger and memoised notice props | Browser / Client (`DockFrame` through new `useStopNotice`) | `StoppedBox.tsx` types | The ledger records only which stop was announced, never what a status says (AGENTS.md §13). |
| Spec registers and phase scripts | Repository tooling (`spec/`, `.planning/phases/QD-84-…`) | Merge gates (`pnpm check:pr`) | Gated, not remembered (AGENTS.md §15). |

## Standard Stack

No external package is added or changed. Every library below is already installed and used by the package.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` | 4.1.2 (installed; catalog follows `latest`) [CITED: AGENTS.md header; `pnpm-workspace.yaml` per AGENTS.md] | `Effect.Effect<A, never, Scope.Scope>` for `make`, `ExternalStore` via `effect/reactivity` | The package is Effect-native; `useScoped` already builds values in a scope. |
| `react` | peer `>=19.2.4`; `@types/react` 19.3.0 [VERIFIED: scratch type check this session] | `useRef`, `useMemo`, `useSyncExternalStore`, `useLayoutEffect` | Existing hooks; `useRef<T>(init: T)` returns `RefObject<T>` with mutable `current` in these types. |
| `vitest` + `@effect/vitest` + `@testing-library/react` | as installed | Characterisations and held tests | Existing project `devtools`. |
| `tstyche` | targets `typescript` 6.0.3 (`tstyche.json`) [VERIFIED: `tstyche.json` read in prior context] | `.tst.ts` type pins | Existing `pnpm test:tstyche` runs two passes. |
| `@stryker-mutator/*` | as installed | Mutation group over `LensSession.ts` | `stryker.devtools.mjs` mutates `packages/devtools/src/model/**` only. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `scripts/spec-revise.mjs` | repo script | Edit Change History and Revision together | Every spec document edit (D-02). |
| Phase 83's `83-*.mjs` | repo | Templates for `84-*.mjs` | Commit 1. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Configurable<I>` interface with a function property | Inline `{ configure(inputs: I): void }` | Method signature is bivariant and unnamed at call sites; rejected by D-05. |
| `useLens(lens, questions)` returning both snapshots | `useLens(lens, instances)` plus ref | Handlers would read stale guards or churn the listener effect; rejected by D-11. |

**Installation:** none.

**Version verification:** TS 7.0.2 (default `tsc`) and TS 6.0.3 (tstyche) were both exercised on the new signature in this session [VERIFIED: scratch compile, both exit clean with the three `@ts-expect-error` refusals consumed].

## Package Legitimacy Audit

No external packages are installed, added or upgraded by this phase. The audit is empty by construction.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Host render
   |
   v
useDockModel(inputs) / useTimeline(source, opts) / useDiagnostics(opts)
   |  (each builds its inputs record fresh per render, by design)
   v
useConfigured(make, inputs)                        <-- Configurable<I> constraint
   |-- useScoped(() => make().tap(built => built.configure(inputs)))   [first render]
   '-- useLayoutEffect(() => value.configure(inputs), [value, inputs]) [every new record]
   v
DockModel | TimelineFeed | DiagnosticsFeed  .configure(inputs)
   '-- the value's own rule decides: equal fields => publishes nothing (sameFields)
        except GatesFeed, which retries a failed watch on any configure (G43)

DockModel.lens (LensSession) ---- set(next) ----> ExternalStore (drops identical reference)
   choose(id): current -> next; next === current ? false : (armed = pickedOf(next); set(next); true)

QuestionsPanel
   |  useLens(lens, questions)
   |     |-- useStoreSnapshot(questions)  --> read.questions  (subscription 1)
   |     |-- useStoreSnapshot(lens)       --> read.lens       (subscription 2)
   |     |-- draw effect  [highlighted, instances]  reads read.questions.instances
   |     |-- listener effect [picking, lens, questions]  handlers read questions.getSnapshot() at event time
   |     '-- exit effect [lens]
   '-- renders gatesBlock/questionsBlock from .questions and LensView.snapshot from .lens

DevtoolsDock -> DockFrame
   |-- useStoreSnapshot(dock)
   |-- useStoreSnapshot(model.diagnostics) -> { status, reading }
   |-- useStopNotice(status, model.diagnostics.restart)        -> notice   (own ledger)
   |-- useStoreSnapshot(model.timelineStatus)
   |-- useStopNotice(timelineStatus, model.timelineStatus.restart) -> timelineNotice (own ledger)
   '-- usePaused(timeline)
```

### Recommended Project Structure
```
packages/devtools/
├── src/model/LensSession.ts         # -move; every publish is store.set
├── src/react/
│   ├── useConfigured.ts             # +Configurable<I>; two parameters
│   ├── useDockModel.ts              # -configureDock
│   ├── useTimeline.ts               # -configureTimeline; per-render record kept
│   ├── useDiagnostics.ts            # -configureDiagnostics
│   ├── useLens.ts                   # (lens, questions): UseLens
│   ├── useStopNotice.ts             # NEW, package-private, "use client";
│   ├── StoppedBox.tsx               # +StopNoticeProps<S>
│   ├── DiagnosticsNotice.tsx        # DiagnosticsNoticeProps = StopNoticeProps<DiagnosticsStatus>
│   ├── TimelineNotice.tsx           # TimelineNoticeProps = StopNoticeProps<TimelineStatus>
│   ├── QuestionsPanel.tsx           # one useLens call
│   └── DevtoolsDock.tsx             # DockFrame calls useStopNotice twice
└── test/react/
    ├── useConfigured.tst.ts                              # NEW
    ├── Lens.questions.characterisation.test.tsx          # NEW
    ├── DockFrame.stops.characterisation.test.tsx         # NEW
    └── useTimeline.inputs.characterisation.test.tsx      # NEW
```

### Pattern 1: A named structural constraint with a function property
**What:** `interface Configurable<I> { readonly configure: (inputs: I) => void }` constrains `A`; `I` is inferred from the `inputs` argument.
**When to use:** Exactly `useConfigured`; no other call site.
**Example:** see Code Examples 1.

### Pattern 2: One hook owns a `useRef` and the `useMemo` that reads it
**What:** `useStopNotice<S>(status, onRestart)` owns `useRef<StopLedger<S>>(noStops)` and returns the memoised `{ status, onRestart, announced }`.
**When to use:** The two `DockFrame` call sites. The ref is stable, so it is not a memo dependency (the React lint for exhaustive deps does not ask for it).

### Pattern 3: Subscribe once, return what was read
**What:** `useLens` reads each store with `useStoreSnapshot` and returns both snapshots; the panel reads from the return.
**When to use:** Replaces the panel's own `useStoreSnapshot(questions)` plus the hand-off argument.

### Anti-Patterns to Avoid
- **Writing a ref during render in `useLens`.** Rejected in D-11; `84-check.mjs one-path` forbids `useRef` in `useLens.ts`.
- **Collapsing `choose` to `store.set(next); return true`.** Changes the consumed answer (D-09).
- **Keying the stop-notice memo on `status` alone.** A rebuilt model's `restart` would be lost (PITFALLS 84-E).
- **Memoising `useTimeline`'s record.** Rejected (D-17).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Publish only when the snapshot reference changed" | A local `move` helper | `ExternalStore.set` (`ExternalStore.ts:108-112`) | It is the same rule; the helper hosted the two survivors v1.9's first close found. |
| Reading a store in React | A hand-rolled subscription | `useStoreSnapshot` (`useSyncExternalStore`) | One path, already used twice in a hook elsewhere. |
| Counting store publishes in a test | A render counter | A listener counter on `store.subscribe` | Renders can be batched or skipped; listeners are the publish. |
| Checking a type refusal | A `not.toBeCallableWith` pin | `// @ts-expect-error <fragment>` | Costs no `NOT_CALLABLE_PIN_BUDGET` row (counted rows are edited with AGENTS.md §6). |
| A second scorer for mutation | New comparison logic | Copy `83-mutation.mjs` and cut the rename map | The scorer carries line numbers through `git diff -M -U0` and has a self-test. |

**Key insight:** every item in this phase deletes a restatement. The risk is in leaving a held byte or an unrecorded id behind, not in new logic.

## Runtime State Inventory

This is a refactor of package-private symbols, but it renames no string that any runtime store, service, OS registration or secret holds. Answered explicitly:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verified: no persisted key, collection or id contains `move`, `configureDock`, `configureTimeline`, `configureDiagnostics`, `useLens` or `DockNoticeProps`; these are source identifiers only | none |
| Live service config | None — no external service names these symbols | none |
| OS-registered state | None — no task, plist or unit names them | none |
| Secrets and env vars | None — no env var or secret key references them | none |
| Build artifacts / installed packages | `packages/devtools/lib/` and `.tsbuildinfo` are rebuilt by `tsc -b` (typecheck); no installed global carries the old names. `check-package-install.mjs` packs and installs fresh each run | none beyond running the gate |

## Common Pitfalls

### Pitfall 1: The `@ts-expect-error` refusal fails for the wrong reason or matches two diagnostics
**What goes wrong:** tstyche demands a message fragment, matches it by substring on the flattened diagnostic chain (`...` splits segments), requires exactly one diagnostic mapped to the directive line, and requires the error line to follow the directive (blank and comment lines allowed between). A multi-line refusal call produces diagnostics on several lines.
**Why it happens:** `Effect.succeed({ x: 1 })` fails at the `Effect.succeed` argument with TS2375 under `exactOptionalPropertyTypes`, not at `useConfigured`.
**How to avoid:** Keep the refusal on one line. Verified message, identical in TS 6.0.3 and 7.0.2: `Type 'Effect<{ x: number; }, never, never>' is not assignable to type 'Effect<Configurable<number>, never, Scope>' with 'exactOptionalPropertyTypes: true'... Property 'configure' is missing in type '{ x: number; }' but required in type 'Configurable<number>'`. Use the fragment `Property 'configure' is missing in type` [VERIFIED: scratch compile this session]. The accepted twin differs only in having `configure` and must have no directive.
**Warning signs:** tstyche reports "unused directive" or "more than one diagnostic".

### Pitfall 2: A counted negative pin sneaks in
**What goes wrong:** `[not-callable-pin]` counts `.not.toBeCallableWith` and `.not.toBeConstructableWith` in every tstyche-selected file. Writing `expect(...).type.not.toBeCallableWith(...)` in `useConfigured.tst.ts` moves the budget and forces an AGENTS.md §6 edit that D-04 forbids.
**How to avoid:** Use only `@ts-expect-error`, `toBeAssignableTo`, `toBe`. `84-check.mjs` should assert the file holds no `not.toBeCallableWith`/`not.toBeConstructableWith` text. `pnpm lint` (`check-house-style.mjs`) fails otherwise [VERIFIED: AGENTS.md §6 text].
**Selection:** `.tst.ts` files under `packages/devtools/test/react/` are selected by tstyche's default match and sit inside the `tsconfig.test.json` include `packages/*/test/**/*.ts` [VERIFIED: prior-context read of `tstyche.json` and the tsconfig]. `ConfigureInputs.tst.ts` lives under `test/model/` and is the header precedent for the fragment pattern.

### Pitfall 3: `"use client";` trips Phase 83's `scan-forbidden`
**What goes wrong:** `83-check.mjs`'s `judgeForbidden` flags a module-scope string literal in `packages/devtools/src/` (depth 0, parens 0, a quote in the blanked line, not an import, no `=>`, not a type or interface). The first line of the new `useStopNotice.ts` is `"use client";` and every other file in `src/react` starts with it (`useConfigured.ts:1` does) [VERIFIED: `useConfigured.ts` line 1 read this session].
**How to avoid:** In `84-check.mjs` exempt a line that is exactly `"use client";` and plant that exemption in the self-test, in both directions (the directive passes, a real module-scope literal still fails).

### Pitfall 4: The `83-` scripts' hard-coded names
**What goes wrong:** `83-check.mjs` reads `import.meta.url` for its directory but hard-codes `qd83` scratch, `83-RED-EVIDENCE.md`, `83-01-SUMMARY.md`, `PLAN_SUBJECT /^[a-z]+[(]83-[0-9]{2}[)]!?: /` and the id-token list (`D-\d+`, `83-NN`, `DIAG-0N`, `WX-0N`, `QD-83`, `Phase 83`, `-NEXT`). A straight copy would silently judge the wrong phase and leave Phase 83's scratch `phase_base` in play (it still sits in `$TMPDIR/qd83/`).
**How to avoid:** Change all of them (list in the port table below) and self-test that `84-NN` subjects pass and `83-NN` fail.

### Pitfall 5: Held-file maths in the earlier phases' checks
**What goes wrong:** Earlier checks hold files this phase edits only if the file is in their model. `useConfigured.test.tsx`, `Lens.adapter.test.tsx` and `surface.tst.ts` are held by none of them [VERIFIED: grep of the earlier checks in the prior context found only a `helpers.ts` mention in 81]. The ones that do hold files this phase must not touch are re-run unchanged: 79-pinned (TimelineFeed, GatesFeed G43, DockModel tests), 79-char (`ConfigureFirstRender`), 80-pinned (`Lens.test.ts`, `QuestionsPanel.test.tsx`, `VerdictTreatment.test.tsx`, `QuestionsPanel.gates.test.tsx`), 80-char (`Lens.dock.characterisation`, `InstrumentToggle.characterisation`), 81-pinned and 83-pinned.
**How to avoid:** `84-earlier-checks.mjs` runs `83-earlier-checks.mjs` (which re-runs 81, 79 and 80) and `83-pinned-check.mjs` in place, or wraps them in a scratch copy. At HEAD all of them pass, with the one expected exit: `79-pinned-check.mjs` exits 1 on `TF29` [VERIFIED: run this session].

### Pitfall 6: `useTimeline` does not expose the status store
**What goes wrong:** D-18 says "nothing from the status store". `useTimeline` returns `store` (subscribable) and `status` as a snapshot, not the status store [VERIFIED: `useTimeline.ts:31-42` and `useTimeline.test.tsx` read this session].
**How to avoid:** Count `store.subscribe` publishes directly for the timeline side; for the status side assert that `status` is the same reference after a same-field re-render and different after a moved capacity. The control is the moved capacity publishing.

### Pitfall 7: Rewording a held header fails the check
**What goes wrong:** A born characterisation file is held byte for byte, so a later review edit to its header or title fails `84-pinned-check.mjs`. Phase 83 solved this with a separate `DiagnosticsFeed.superseded.test.ts` for later rows.
**How to avoid:** Put later rows in a new file, never in a born characterisation. Review fixes follow the same rule.

### Pitfall 8: A plan verify step that cannot be run as written
**What goes wrong:** Phase 83's 83-10 verified `git diff --quiet <phase_base> -- 83-mutation-base.json`, which can never pass (the file is born after the base). 83-11 grepped for a consumer line that `check-package-install.mjs` never prints (it runs the consumer with `stdio: "pipe"`). A `commit` check mode only judges an existing commit.
**How to avoid:** Every `<verify>` in the plans is run once against the real tree before it is written; `check:pr` and `spec:package` each run alone.

### Pitfall 9: A green-on-base row no earlier edit ever failed
**What goes wrong:** A characterisation green on the base has no recorded failure unless a scratch edit failed it. `seen-failing` expects evidence lines in the formats `- failed: <title>`, `- failed (<tag>): <title>`, `- red on the base: <title>`, `green on the base` lines, `- flip <label>: …`, and `- check failed: <mode>: <stderr line>`.
**How to avoid:** Plan one scratch-edit failure per characterisation (D-19) and record it in `84-EVIDENCE.md` in `seen-failing`'s format, then revert with `git checkout` and prove the tree clean.

### Pitfall 10: The `set` in `choose` is redundant, and the property test must still kill the early-return mutants
**What goes wrong:** After D-09, `choose` only calls `set` when `next !== current`, so `set`'s own identity check never runs there. The mutants on `if (next === current) return false` (e.g. to `true`, `false`, or removing the return) must still die.
**How to avoid:** The property at `LensSession.test.ts:378` kills them through the answer check (`choose` answers `=== changed`), since `set` no longer notifies on an unchanged snapshot [VERIFIED: test read in prior context]. The base mutation record is the baseline; the close must show no new open mutant.

## Code Examples

### 1. The signature, compiled under TS 6.0.3 and 7.0.2
```ts
// Source: scratch compile this session (outside the repo), D-05/D-06 signature.
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";

export interface Configurable<I> {
  readonly configure: (inputs: I) => void;
}

export declare const useConfigured: <A extends Configurable<I>, I>(
  make: () => Effect.Effect<A, never, Scope.Scope>,
  inputs: I,
) => A | undefined;

// Positive: no type arguments; A is DockModel / TimelineFeed / DiagnosticsFeed.
// Refusals (each on one line, each consumed by a directive):
// @ts-expect-error Property 'configure' is missing in type
useConfigured(() => Effect.succeed({ x: 1 }), 1);
```
Messages for the other two refusals, identical in both compilers: `makeTimelineFeed` with `{ source: 1 }` gives TS2345 "Type 'number' is not assignable to type 'Source'"; `makeDiagnosticsFeed` fed `{ source }` gives TS2345 "has no properties in common with type 'DiagnosticsOptions'" [VERIFIED: scratch compile].

### 2. `useConfigured` body after the change (shape, from `useConfigured.ts:19-32`)
```ts
// Source: packages/devtools/src/react/useConfigured.ts at HEAD (lines 19-29), with the adapter removed.
export const useConfigured = <A extends Configurable<I>, I>(
  make: () => Effect.Effect<A, never, Scope.Scope>,
  inputs: I,
): A | undefined => {
  const value = useScoped(() => Effect.tap(make(), (built) => Effect.sync(() => built.configure(inputs))));
  useLayoutEffect(() => {
    if (value !== undefined) value.configure(inputs);
  }, [value, inputs]);
  return value;
};
```

### 3. `LensSession.move` as it reads at HEAD (to delete) and `choose`
```ts
// Source: packages/devtools/src/model/LensSession.ts:148-152 (verbatim at HEAD)
/** Publishes `next` when it is not the snapshot held, so a no-op publishes nothing. */
const move = (next: LensSnapshot): void => {
  if (next === store.getSnapshot()) return;
  store.publish(next);
};
```
`choose` at `:167-175`: `const current = store.getSnapshot(); const next = chosen(current)(id); if (next === current) return false; // Armed before the publish, so a listener told of the pick can take its reveal. armed = pickedOf(next); store.publish(next); return true;`. After the change `store.publish(next)` becomes `store.set(next)`.

### 4. `useStopNotice` (D-15)
```ts
// Source: derived from DevtoolsDock.tsx:112-129 at HEAD and CONTEXT D-15.
"use client";
import { useMemo, useRef } from "react";
import { noStops, type StopLedger, type StopNoticeProps } from "./StoppedBox.tsx";

export const useStopNotice = <S,>(status: S, onRestart: () => void): StopNoticeProps<S> => {
  // The ledger records which stop was announced, never what a status says (AGENTS.md section 13).
  const announced = useRef<StopLedger<S>>(noStops);
  return useMemo(() => ({ status, onRestart, announced }), [status, onRestart]);
};
```
(`noStops` is `StopLedger<never>` at `StoppedBox.tsx:31`; assigning it to `useRef<StopLedger<S>>` already compiles at HEAD in `DevtoolsDock.tsx`.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useConfigured(make, configure, inputs)` with three one-line adapters | `useConfigured(make, inputs)` over `Configurable<I>` | This phase | Three adapters and the adapter parameter vanish. |
| `LensSession.move` | `ExternalStore.set` | This phase | One statement of "publish only on a changed reference". |
| `useLens(lens, questions, instances)` | `useLens(lens, questions): UseLens` | This phase | One path for the guards. |

**Deprecated/outdated:** `MutableRefObject` still exists in `@types/react` 19.3.0 but is not what `useRef` returns; `StoppedBoxProps.announced` is already `RefObject<StopLedger<S>>` [VERIFIED: `StoppedBox.tsx:69`].

## Phase 83 Tooling: What to Port (D-21)

| Script | Source (Phase 83) | Change for 84 |
|--------|-------------------|----------------|
| `84-check.mjs` | `83-check.mjs` (846 lines; modes base, commit [--first], unchanged, seen-failing, scan-ids, scan-forbidden, trailers, no-store, single-fold, stale-path, registers, `--self-test` 177 passed at HEAD) | Drop `no-store`, `single-fold`, `stale-path`, `registers`. Add `no-adapter`, `no-restated-set`, `one-path`, `one-ledger`, `records`. Scratch `qd84`; evidence `84-EVIDENCE.md`; summary `84-01-SUMMARY.md` with `phase_base: <40hex>`; `PLAN_SUBJECT /^[a-z]+[(]84-[0-9]{2}[)]!?: /`; id tokens `D-\d+`, `84-NN`, `ADPT-0N`, `WX-0N`, `QD-84`, `Phase 84`, `-NEXT` plus the phase-relative wording list, exempt in `.changeset/`, `upgrading.md` and spec change history; `GUARDED` keeps `AGENTS.md`, `scripts/check-house-style.mjs`, `.oxlintrc.json` and no budget logic (no `TYPE_TEST_NEW`/`OLD` replacement); exempt `"use client";`. The trailer regex accepts any `Co-Authored-By: Claude … <noreply@anthropic.com>`. |
| `84-pinned-check.mjs` | `83-pinned-check.mjs` (modes plain, `--all-applied`, `--self-test` 28 passed) | PINNED entries `{file, flips, added, edits}` per D-20; edits are an import line that occurs once at the base and once now (D-13's `useStoreSnapshot` import) plus the one call line; BORN files held against their one adding commit; `--all-applied` needs born files already committed, so run plain before the commit and with `--all-applied` after. |
| `84-mutation.mjs` | `83-mutation.mjs` (458 lines; `record base|close <group> [--restart]`, `compare`, `--self-test`) | One group `lens` over `packages/devtools/src/model/LensSession.ts`; no `RENAMED`; `ABSOLUTE = [LensSession.ts]`; `UNMEASURED` lists the `src/react` files of D-24; phase string `"84"`; output `84-mutation-base.json` / `84-mutation-close.json`; usage message names the `lens` group. |
| `84-earlier-checks.mjs` | `83-earlier-checks.mjs` | Run `83-earlier-checks.mjs` (re-runs 81, 79, 80) and `83-pinned-check.mjs`, copying into `$TMPDIR/qd84/`; expect every exit 0 except `79-pinned-check.mjs` exit 1 on `TF29`. |

The scorer rule (83-mutation): the score may fall only through deleted killed mutants; no new Survived, NoCoverage or Ignored mutant; Ignored mutants are held per kind. The 80 close for `lens` read 52 killed, 0 survived, 0 no-coverage, 22 ignored at head `71b7b983` [CITED: `.planning/milestones/v1.9-phases/QD-80…/80-mutation-close.json` via the prior-context read]; the base must re-measure it.

## Stryker and Coverage

- **Invocation (run alone, stdin closed, never in parallel with another suite):** `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/LensSession.ts < /dev/null`. `stryker.devtools.mjs` mutates `packages/devtools/src/model/**/*.ts` only; `src/react` is unmeasured [VERIFIED: config read in prior context, D-24 cites `:47`].
- **Order:** the base is taken at the phase base on a clean tree before any test or source edit; `record base lens`. The close is `record close lens`; after each review-fix round `record close lens --restart`, then `compare`, then `pnpm check:pr` and `pnpm spec:package`, each alone (Phase 83's "Re-run after review fixes" rule).
- **Thresholds:** `packages/devtools/src/react/**` 90% (lines, functions, branches) [VERIFIED: `vitest.config.ts:112-115`]; `packages/devtools/src/model/**` 95% [VERIFIED: `vitest.config.ts:49-52`]. The new `useStopNotice.ts` and the changed `useLens.ts` stay in the 90% bucket; `LensSession.ts` in the 95% bucket.
- **Not run in this research** (per instruction); the base figure is therefore unmeasured here.

## Spec Mechanics (all line numbers verified at HEAD)

| Document | Where | Verified fact |
|----------|-------|----------------|
| `spec/behaviors/28-devtools-screens.md` | BEH-QD-734 at 3213 (pinned-by paragraph 3242-3250 naming U1..U4, C1..C11, DockRegistryReads titles); BEH-QD-736 at 3298 (pinned-by ends 3355-3356 with the property "a command publishes exactly when the snapshot changes"); BEH-QD-737 at 3358 (ends 3415; last requirement 3380-3383 "whether the lens is picking and on the two stores they read") | BEH-QD-751..755 exist; 756..760 follow. Revision 1.75 (newest history entry matches). |
| `spec/invariants.md` | INV-QD-403 at 4673, 405 at 4697, 406 at 4709 (Source names `useLens.ts`'s draw, listener and exit effects), 412 at 4781 is last | Append 413..414 after 412. Revision 1.226. |
| `spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md` | Rev 1.5; decision 5 at 76-79; decision 8 at 91-102; Related at 273-288; last amendment `## Amendment (2026-11-24, ARCH-128, CCR-QD-473): every step runs on every \`configure\`` at 290 | Already carries dated Amendment sections after Related: add 84's the same way. |
| `spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md` | Rev 1.9; decision 6 at 102-125 (`useLens(lens, questions, instances)`); test paragraph 249-256 names `Lens.adapter.test.tsx`; Related at 271 | No Amendment section yet; add one dated paragraph. |
| New ADR | Template `spec/decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md` | Document Control table (Document ID `QADI-ADR-196` becomes `QADI-ADR-197`, Revision, Effective Date, Status, Author "Qadi Engineering", Classification "Architecture Decision Record", Change History); sections Context, Decision, What changes and the test that pins it, Alternatives considered, Consequences, What enforces it, Related. The Document ID must equal the file number (gate 10). File name `197-<slug>.md`. |
| `spec/decisions/index.yaml` | Entries `- id: "ADR-QD-196"`, `file:`, `title:`, `status: "Accepted — amends …"` | New entry 197; the ADR-192 and 193 `status` strings gain "amended 2026-11-25 (ADR-QD-197: …)". |
| `spec/traceability.md` (Rev 1.325) | Rows by file cell: `useConfigured.test.tsx` 629, `ConfigureFirstRender.characterisation` 630, `DockRegistryReads` 631, `useTimeline.test.tsx` 636, `LensSession.test.ts` 649, `Lens.dock.test.tsx` 695, `Lens.adapter.test.tsx` 696, `Lens.dock.characterisation` 698, `surface.tst.ts` 706, INV-QD-405/406 rows 248-249, INV-QD-411/412 rows 254-255 | Row format `\| \`path\` \| ids — description \|`. ADR rows `\| [ADR-QD-NNN](decisions/…) \| …`. BEH rows `\| [BEH-QD-754](behaviors/…#anchor) \| title \| source \| tests \|`. The doc-28 row (line 70) lists BEH ranges and must gain BEH-QD-756–760. `SimulationSource.test.ts`'s row is at 661, not Lens.adapter's. Rows for the new test files (the three characterisations and `useConfigured.tst.ts`) are required: `verify-traceability.sh --strict` checks that every `§4` test file exists and every invariant and ADR is traced. |
| `spec/README.md` | Rev 1.406; CCR row format `\| CCR-QD-475 \| 2026-11-25 \| <files with revs> \| ARCH-130. **<title>** … \|` at line 412 | New CCR-QD-476 row goes after it and names every revision. |
| `scripts/spec-revise.mjs` | `<doc.md> "<what changed (CCR-QD-476)>" [--date YYYY-MM-DD]`; `--check` verifies each Revision equals its newest Change History entry | `--check` and `spec:verify:strict` both pass at HEAD [VERIFIED: run this session: 21 PASS, 0 FAIL; "every Revision matches its newest Change History entry"]. |

Documents named by CONTEXT as "checked and left unchanged": ADR-QD-137, ADR-QD-047, AGENTS.md §13, `spec/overview.md`, `upgrading.md:194`. The `useLens` mentions at `spec/decisions/047-…:533`, `spec/overview.md`, and `AGENTS.md:870` still say true things (the lens is a hook that wires listeners) [VERIFIED: `git grep useLens` this session].

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + pnpm | every script | ✓ | as installed (scripts ran) | — |
| TypeScript 7.0.2 (`tsc`) and 6.0.3 (tstyche target) | `pnpm typecheck`, `pnpm test:tstyche` | ✓ | both exercised this session | — |
| Stryker | `LensSession.ts` mutation base and close | ✓ (config present) | not run (instruction) | — |
| `git` with `-M` rename detection | `84-mutation.mjs compare` | ✓ | — | — |
| jsdom/vitest project `devtools` | characterisations | ✓ | baseline of 5 files / 38 tests green at HEAD [VERIFIED: run this session] | — |

**Missing dependencies:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (project `devtools`) + `@effect/vitest` + `@testing-library/react`; tstyche for `.tst.ts`; Stryker for `src/model/LensSession.ts` |
| Config file | `vitest.config.ts` (root); `tstyche.json` (`target` 6.0.3, `tsconfig.tstyche.json`); `stryker.devtools.mjs` |
| Quick run command | `pnpm exec vitest run --project devtools <file> < /dev/null` |
| Full suite command | `pnpm check:pr < /dev/null` (with `pnpm test:tstyche`, `pnpm spec:package`, `pnpm spec:verify:strict` each run alone) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADPT-01 | A value with `configure` configures first render and on rebuild; refusal of a value without it | unit + type | `pnpm exec vitest run --project devtools packages/devtools/test/react/useConfigured.test.tsx < /dev/null`; `pnpm test:tstyche` | test exists (edit); `.tst.ts` Wave 0 |
| ADPT-01 | Hidden `Activity` and StrictMode rebuild configure with current inputs | unit (held) | `… ConfigureFirstRender.characterisation.test.tsx` | exists, held |
| ADPT-02 | `choose` arms before it publishes; answer true exactly when changed; no-op publishes nothing | unit + property (held) | `… test/model/LensSession.test.ts` | exists, held |
| ADPT-02 | `LensSession.ts` declares no `move`, calls no `publish` | script | `node .planning/phases/QD-84-…/84-check.mjs no-restated-set` | Wave 0 |
| ADPT-03 | One subscription to each store; draw follows the store; handlers resolve against the current list; a dropped guard leaves no overlay | component | `… Lens.adapter.test.tsx` (held except its two edits); `… Lens.questions.characterisation.test.tsx` | adapter exists; characterisation Wave 0 |
| ADPT-03 | `useLens` two parameters, one `useStoreSnapshot` per store, no `useRef` | script | `84-check.mjs one-path` | Wave 0 |
| ADPT-04 | Each stop announced once, independently; a second stop remounts only its own box; a rebuilt model's `restart` | component | `… DockFrame.stops.characterisation.test.tsx`; `TimelineNotice.test.tsx`, `DiagnosticsNotice.test.tsx` held | characterisation Wave 0 |
| ADPT-04 | Exactly one `useRef<StopLedger` in `src/react` | script | `84-check.mjs one-ledger` | Wave 0 |
| ADPT-05 | A fresh record with equal fields publishes nothing; a moved capacity publishes | component | `… useTimeline.inputs.characterisation.test.tsx` | Wave 0 |
| ADPT-05 | G43 unaffected | unit (held) | `… GatesFeed.test.ts` (G43 at `:715`); `DockRegistryReads.test.tsx:121` | exist, held |
| WX-03/06 | Records: traceability rows, pinned-by lists, hidden ids | script | `84-check.mjs records`; `pnpm spec:verify:strict`; `node scripts/spec-revise.mjs --check` | Wave 0 |
| WX-05 | Mutation score of `LensSession.ts` | mutation | `node …/84-mutation.mjs compare` after `record close lens` | Wave 0 |
| WX-07 | No plan-local id in shipped files | script | `84-check.mjs scan-ids` | Wave 0 |

### Sampling Rate
- **Per task commit:** the one or two vitest files the task touches, plus the matching `84-check.mjs` mode.
- **Per wave merge:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm test:tstyche`, `84-pinned-check.mjs`, `84-earlier-checks.mjs`.
- **Phase gate:** `pnpm check:pr < /dev/null`, `pnpm spec:package`, `pnpm spec:verify:strict`, `pnpm spec:claims`, `pnpm spec:api`, the mutation `compare`; all green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `84-check.mjs`, `84-pinned-check.mjs`, `84-mutation.mjs`, `84-earlier-checks.mjs` and their self-tests.
- [ ] `packages/devtools/test/react/Lens.questions.characterisation.test.tsx`, `DockFrame.stops.characterisation.test.tsx`, `useTimeline.inputs.characterisation.test.tsx`.
- [ ] `packages/devtools/test/react/useConfigured.tst.ts`.
- [ ] `84-mutation-base.json` taken on a clean tree.
- Framework install: none.

## Security Domain

`security_enforcement` is on (`.planning/config.json`, ASVS level 1, block on high). This phase changes package-private React hooks and a headless lens model in a developer tool. It adds no input parsing, no network surface, no persistence and no new dependency.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no (no new untrusted input; the untrusted-decode budget `UNTRUSTED_DECODE_BUDGET` is untouched) | existing `untrustedDecoder` |
| V6 Cryptography | no | — |
| V14 Configuration / supply chain | yes, trivially | No dependency added; the Package Legitimacy Audit above is empty |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale-closure read of a guard list at click time (the lens picks the wrong or an unmounted guard) | Tampering (of what the developer sees) | Handlers read `questions.getSnapshot()` at event time; pinned by `Lens.questions.characterisation` and `Lens.dock.characterisation` |
| A lens listener left attached after the panel unmounts | Denial of service (developer tool) | Exit effect keyed `[lens]` unchanged; INV-QD-406 tests held |
| Plan-local ids or placeholders leaking into shipped files | Information disclosure (internal) | `84-check.mjs scan-ids`; `[no-numbering-placeholder]` |
| `console` / ambient clock introduced | Repudiation / determinism | `no-ambient-console`, `Date.now` rules in `pnpm lint`; no new use here |

## Gates and Changeset

- **Commands, each alone with stdin closed:** `pnpm check:pr < /dev/null` (= `node scripts/run-check.mjs --skip-mutation`; mutation runs only on release PRs, so the phase's own mutation compare is a separate step); `pnpm spec:package` (gate 14); `pnpm spec:verify:strict`; `pnpm spec:claims` (gate 12, 8 claims across 6 files at HEAD); `pnpm spec:api` (gate 13, 942 exports across 9 packages at HEAD); `pnpm lint` (`oxlint && node scripts/check-house-style.mjs`, `613 file(s) clean` at HEAD); `pnpm typecheck`; `pnpm test:tstyche`. [VERIFIED: gate outputs this session]
- **Gate 13** reads each package's barrels (`entryPointsOf` + `BARREL` regex over `export * from` lines, or the index itself) [VERIFIED: `scripts/check-api-surface.mjs:235-266` read this session], so `Configurable`, `UseLens`, `useStopNotice` and `StopNoticeProps` register nowhere while they stay out of both barrels. `[devtools-named-barrel]` is a rule on the barrels, which this phase does not edit; its exact text was not read here.
- **Changeset:** `.changeset/devtools-lens-reads-each-fact-once.md`, frontmatter `"@qadi/devtools": patch`, closing "No export changes." Precedent: `.changeset/devtools-configure-applies-every-input.md`. `.changeset/config.json` has `fixed` including all nine packages, so the patch bumps them together; do not run `changeset version`.
- **Commit trailer:** every commit made in this phase, including by gsd-tools, ends with exactly one Claude trailer. The spawn prompt for this research asked for `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; the runtime's own attribution reminder in this session names `Claude Sonnet 5.5`. The repo's recent history (14 commits sampled) uses exactly one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` line each, and `83-check.mjs trailers` accepts any `Claude … <noreply@anthropic.com>` [VERIFIED: `git log` count this session]. The plan should follow the repo's existing trailer and let the executor's reminder decide the model name, since the check accepts either.
- **Do not stage** `.planning/config.json` (modified) or the untracked review files in the working tree.

## Lessons Carried From Phase 83

1. A verify step must be runnable as written (Pitfall 8).
2. A born characterisation is held byte for byte, so later rows go in a separate file (Pitfall 7).
3. A row green on the base still needs a recorded scratch-edit failure (Pitfall 9).
4. `83-pinned-check --all-applied` needs born files already committed: run plain before the commit and `--all-applied` after.
5. Alphabetical barrel order and hand-wrapping at about 90 columns on added lines (`IN-04`, `IN-01` fix commits in 83).
6. A review-fix round touching measured model files needs a mutation re-close with `--restart`, then `compare`, then `check:pr` and `spec:package` each alone.
7. A `commit` check mode only judges an existing commit; run it after the commit exists.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `[devtools-named-barrel]` and `[module-state]` house-style rules do not react to a new package-private file in `src/react` that is not in a barrel. `pnpm lint` was clean at HEAD, but the rules' text was not read against a hypothetical new file. | Gates and Changeset | A new file fails `pnpm lint`; fix in the same commit (low cost). |
| A2 | The exact regexes `84-check.mjs` uses for `no-adapter`, `no-restated-set`, `one-path`, `one-ledger` are not specified here; CONTEXT's descriptions (D-21) are the contract. | Phase 83 Tooling | Planner writes them with a self-test planting each failure; no known blocker. |
| A3 | `useStopNotice` typed as `<S,>` in a `.ts` (not `.tsx`) file needs no trailing comma; the comma is only required in `.tsx`. The example shows `<S,>` for safety. | Code Examples 4 | Cosmetic; oxlint/typecheck will say. |
| A4 | The `lens` base figure (52 killed, 22 ignored) from the v1.9 close is expected to repeat; this session did not run Stryker (instruction). | Stryker | If the base differs, the close compares to the re-measured base anyway (D-24). |
| A5 | The trailer line in the executor's commit message follows the repo's existing `Opus 5.5` trailer (`83-check.mjs trailers` accepts any Claude trailer). | Gates and Changeset | A mismatch with a reminder-specified name is harmless to the check; flagged so the user can pick. |

## Open Questions (RESOLVED)

1. **Does D-18's status-side check need a second hook route?**
   - What we know: `useTimeline` returns `store` and a status snapshot, not the status store (Pitfall 6).
   - What's unclear: whether the user wants the status store exposed for the test. Exposing it would change `UseTimeline`, a public type.
   - Recommendation: compare snapshot identity; do not touch the public type.
   - **RESOLVED:** no second route. The status side is read by snapshot reference identity through `useTimeline`'s
     own return, and `UseTimeline` is not widened. Decided by the orchestrator (planning decision 4), autonomously on
     2026-11-25 under the owner's standing instruction. Carried by `84-05-PLAN.md` (TI1 to TI3, and its prohibition on
     widening `UseTimeline` or adding an export to read the status store).
2. **Whether the planner merges steps 3 to 6 of D-22.**
   - What we know: they are independent and each commit must be green; step 5 carries D-14's records.
   - Recommendation: keep four commits (smaller `commit`-mode and review surface); merge only if scripts make each its own plan awkward.
   - **RESOLVED:** kept separate, one plan and one source commit each. Decided by the orchestrator (planning decision
     5), autonomously on 2026-11-25 under the owner's standing instruction. Carried by `84-06-PLAN.md` (step 3,
     `useConfigured`), `84-07-PLAN.md` (step 4, `LensSession`), `84-08-PLAN.md` (step 5, `useLens` with D-14's records
     in the same commit) and `84-09-PLAN.md` (step 6, `useStopNotice`).

## Sources

### Primary (HIGH confidence)
- Repository files opened at HEAD `8ff027e1` this session: `useConfigured.ts`, `useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts`, `LensSession.ts`, `ExternalStore.ts`, `useLens.ts`, `QuestionsPanel.tsx`, `DevtoolsDock.tsx`, `StoppedBox.tsx`, both notice files, `useStoreSnapshot.ts`, `useScoped.ts`, the tests named in the map, `spec/` documents, `scripts/check-api-surface.mjs`, `vitest.config.ts`, `83-mutation.mjs`, and the Phase 83 plan frontmatter and summary.
- Scratch compile under TS 6.0.3 and 7.0.2 of the D-05 signature (outside the repo; deleted with the scratchpad).
- Gate runs this session: `check-house-style` (613 files clean), `check-api-surface` (942 exports), `check-devtools-claims` (8 claims), `verify-traceability --strict` (21 PASS, 0 FAIL), `spec-revise --check`, 83's earlier-checks and pinned check, `83-check --self-test` (177), devtools vitest baseline (5 files, 38 tests).

### Secondary (MEDIUM confidence)
- `.planning/research/` (ARCHITECTURE Phase 84, PITFALLS 84-A..F) and `_WAVE15-CONTEXT.md`, where they agree with the code read above.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no change to the stack.
- Architecture: HIGH, every integration point opened at HEAD and the type signature compiled.
- Pitfalls: HIGH for 1-10; they come from compiled output, read source and Phase 83's recorded lessons.
- Scripts' exact regexes and the mutation base figure: MEDIUM (A2, A4).

**Research date:** 2026-11-25
**Valid until:** until HEAD moves under `packages/devtools` or the spec registers (this is repo-local, no external drift); re-check line numbers if any commit lands before planning.
