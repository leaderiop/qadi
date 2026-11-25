# Phase 84: `useConfigured` requires `configure`, and the review's small finds - Context

**Gathered:** 2026-11-25 (smart discuss, autonomous mode. Every decision below was decided autonomously on 2026-11-25 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". The grey areas the orchestrator fixed are recorded with their evidence and rejected alternatives; where evidence at HEAD qualifies one, the note sits under the decision.)
**Status:** Ready for planning

<domain>
## Phase Boundary

Five small finds from the 2026-11-24 review, all in `@qadi/devtools`, all package-private. None is a defect.

1. **Three identical adapters.**
   - `packages/devtools/src/react/useConfigured.ts:19-32` takes `(make, configure, inputs)` (the roadmap cites 19-31; the closing `};` is at 32).
   - Its three callers each pass a one-line adapter that only calls the value's own `configure`: `configureDock` (`useDockModel.ts:22-24`, called at `:30`), `configureTimeline` (`useTimeline.ts:44-46`, called at `:71`) and `configureDiagnostics` (`useDiagnostics.ts:19-21`, called at `:44`).
   - `DockModel`, `TimelineFeed` and `DiagnosticsFeed` each declare `configure` as a `readonly` function property: `DockModel.ts:254`, `TimelineFeed.ts:98` and `DiagnosticsFeed.ts:119`.
2. **`LensSession` restates `ExternalStore.set`.**
   - `model/LensSession.ts:148-152` is `move`: "publishes `next` when it is not the snapshot held". That is `ExternalStore.set` (`ExternalStore.ts:108-112`) word for word.
   - `choose` (`:167-175`) has its own `next === current` early return because it answers a boolean. It arms the reveal at `:172` before it publishes at `:173`.
   - The line numbers have not drifted.
3. **`useLens` is handed one fact twice.**
   - `react/useLens.ts:37-41` takes `(lens, questions, instances)`. Research cited 39-43.
   - The panel reads the questions store at `QuestionsPanel.tsx:114` and passes `snapshot.instances` beside the store at `:118`.
   - The draw effect reads the argument (`useLens.ts:54`, keyed `[highlighted, instances]` at `:60`). The handlers read `questions.getSnapshot().instances` at event time (`:72`, `:80`).
   - So one fact arrives by two paths: the render-time argument and the event-time store. A second caller (`Lens.adapter.test.tsx:53`) has to repeat the panel's pairing by hand.
4. **`DockFrame` writes its stop ledger twice.**
   - `react/DevtoolsDock.tsx:116-128` holds a `useRef<StopLedger<DiagnosticsStatus>>(noStops)` with its `useMemo` notice (`:117-121`), then the same pair for the timeline (`:124-128`), each under the same comment.
   - `DiagnosticsNoticeProps` (`DiagnosticsNotice.tsx:36-48`) and `TimelineNoticeProps` (`TimelineNotice.tsx:23-34`) are structurally one shape over two status types.
5. **`useTimeline` builds a fresh `{ source, capacity }` per render** (`useTimeline.ts:71`; the roadmap cites `:70`, which is now the comment's second line).
   - The feed drops it by its per-field rule.
   - The open question is whether to memoise it or record the rejection against ADR-QD-192 decision 8.

After this phase:
- `useConfigured(make, inputs)` takes a value that has `configure`, through one named structural constraint. The three adapters are gone.
- `LensSession` publishes every move through `ExternalStore.set` and holds no `move`. `choose` keeps its boolean and its arm-before-publish order, and only its publish becomes `set`.
- `useLens(lens, questions)` subscribes once to each store and returns both snapshots. The draw reads the snapshot the hook itself read, and the handlers read `questions.getSnapshot()` at event time. The panel still holds exactly one subscription to each store.
- `DockFrame`'s stop ledger and memoised notice are written once, in one package-private hook that the frame calls twice.
- `useTimeline`'s per-render record stays, as a recorded rejection with a pin.

ARCH-131. Package: `@qadi/devtools`. One `patch` changeset saying "No export changes." Gate 13's count holds, gate 14 is unmoved, and `@qadi/react` is unchanged.

Records:
- ADR-QD-197 (new). It amends ADR-QD-192 decision 8 and ADR-QD-193 decision 6.
- CCR-QD-476.
- BEH-QD-756..760. The pinned-by lists of BEH-QD-734, 736 and 737 are amended.
- INV-QD-413..414. INV-QD-406's Source is amended.

Evidence:
- The code at HEAD `3d0ccfbc`. `packages/devtools` was last changed by `9f081401`, Phase 83's IN-01 fix.
- `.planning/phases/_WAVE15-CONTEXT.md`.
- `.planning/research/` (ARCHITECTURE §Phase 84, PITFALLS 84-A..F, SUMMARY §Phase 84).
- Phase 83's records and scripts.
- A scratch type-check of the proposed signature (D-06), run in an untracked directory that was then deleted.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE15-CONTEXT.md`, ROADMAP, REQUIREMENTS)
- **D-01:** Work on branch `arch-wave-15` only, one phase at a time, on the main tree (`use_worktrees` is false). No merge, push, tag, release, publish, `changeset version` or version-packages PR (WX-07).
- **D-02:** Use only the reserved records: ARCH-131, ADR-QD-197, CCR-QD-476, BEH-QD-756..760 and INV-QD-413..414.
  - The reservation file (`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`) reads CCR 476, ADR 197, BEH 760, INV 414, and none of these ids appears in `spec/`, `packages/`, `scripts/` or AGENTS.md at HEAD.
  - Never run `node scripts/next-id.mjs`.
  - Name a reserved number left unused as "Unused" in the CCR-QD-476 row.
  - Make spec edits only through `node scripts/spec-revise.mjs <doc> "<change (CCR-QD-476)>" --date <the real date>`, and verify each with `--check`.
  - No D-number, plan-local id or phase number goes in shipped source, a test title or a BDD scenario. No `*-NEXT` placeholder goes anywhere.
- **D-03:** Tests come first (WX-06).
  - There is no defect, so there is no RED.
  - Every characterisation (D-19) is written on the phase base, green there and at every later commit. Each is shown failing once under a scratch source edit, with the output saved in `84-EVIDENCE.md`.
  - Every new check is shown failing once.
  - No throwaway file exists at any commit or when a mutation record is taken.
  - A surviving mutant is closed with a test, never by re-baselining (WX-05).
- **D-04:** Nothing new from WX-04's list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, an ambient console, `process.env` or clock, `Record<string, unknown>`, `// Stryker disable`, or a module-scope `let`.
  - `MODULE_STATE_BUDGET`, `SWITCH_BUDGET`, `UNTRACED_BUDGET` and `NOT_CALLABLE_PIN_BUDGET` do not move (D-07).

### Area 1: `useConfigured` takes a value that has `configure` (ADPT-01)
- **D-05: One named structural constraint, `Configurable<I>`, declared once in `react/useConfigured.ts`.**
  - The shape is `interface Configurable<I> { readonly configure: (inputs: I) => void }`.
  - The signature becomes `useConfigured<A extends Configurable<I>, I>(make: () => Effect.Effect<A, never, Scope.Scope>, inputs: I): A | undefined`.
  - The two `configure` calls stay where they are: one tapped onto the scoped build, one in the layout effect keyed `[value, inputs]`. They read `built.configure(inputs)` and `value.configure(inputs)`.
  - Removing either call regresses the first render (PITFALLS 84-A).
  - **The member is a function property, not a method signature.** It mirrors how the three values declare it (`readonly configure: (…) => void`), and a property is checked contravariantly under `strictFunctionTypes`, where a method is checked bivariantly.
    - In the scratch check, both forms refused every mismatched call tried, because TypeScript's weak-type check caught them.
    - The property form is still the one that does not rest on that check.
  - `Configurable` is exported from `useConfigured.ts` for its type test only, and stays out of both barrels (AGENTS.md §9, ADR-QD-099). `surface.tst.ts` gains a "no exported member" pin for it under both entries.
  - The doc comment leads with one line ("Builds a value that has `configure` in a scope and configures it with the latest inputs before anything reads it"). The ADR-QD-192 rationale follows it.
  - Rejected: keeping the adapter parameter and sharing one `(v, i) => v.configure(i)` constant. That renames the duplication instead of removing it (ARCHITECTURE #1(b)).
  - Rejected: folding `configure` back into the constructors. ADR-QD-192 decision 1 refuses it.
  - Rejected: an inline `{ configure(inputs: I): void }` constraint. It is unnamed at the three call sites and in the type test, and it is a method signature.
- **D-06: Inference was checked at HEAD, in a scratch file in an untracked directory that was then deleted, with no explicit type arguments.**
  - `useConfigured(makeDockModel, inputs)` infers `DockModel`.
  - `useConfigured(makeTimelineFeed, { source, capacity })` infers `TimelineFeed`, with `capacity: number | undefined`, accepted by `TimelineFeedInputs`' `capacity?: number | undefined`.
  - `useConfigured(makeDiagnosticsFeed, options)` infers `DiagnosticsFeed` for `options: DiagnosticsOptions | undefined`.
  - Three calls were refused: a value with no `configure`, `makeDiagnosticsFeed` fed a timeline input, and `makeTimelineFeed` fed `{ source: 1 }`.
  - The three call sites lose their adapter and keep their comments, reworded where they name an adapter. They take no type argument.
- **D-07: Type pins in a new `packages/devtools/test/react/useConfigured.tst.ts`: positive pins, plus one `@ts-expect-error` refusal with its accepted twin.**
  - The pins: `expect<DockModel>().type.toBeAssignableTo<Configurable<DockModelInputs>>()`, the same for `TimelineFeed` over `TimelineFeedInputs`, and the same for `DiagnosticsFeed` over `DiagnosticsOptions | undefined`.
  - Add a return-type pin per hook, so inference cannot widen silently (PITFALLS 84-A): `ReturnType<typeof useDockModel>` is `DockModel | undefined`, `useTimeline`'s is `UseTimeline`, and `useDiagnostics`'s is `DiagnosticsSnapshot`. No `.tst.ts` pins any of the three hooks at HEAD.
  - These are not `toBeCallableWith` pins, so `NOT_CALLABLE_PIN_BUDGET` and its AGENTS.md §6 table do not move.
  - **Note (evidence at HEAD):** a refusal written as a `@ts-expect-error`, with its message fragment checked by tstyche, also costs no budget row.
    - Precedent: `test/model/ConfigureInputs.tst.ts`, whose header states that pattern.
    - Such a refusal would fail if the constraint were loosened. Today only `useConfigured`'s body (`value.configure(inputs)`) refuses a loosened constraint.
    - **Decided (orchestrator, autonomously 2026-11-25, the more complete option):** the file also carries one `@ts-expect-error` refusal of a value with no `configure`, its message fragment checked by tstyche as `ConfigureInputs.tst.ts` does, beside an accepted twin that differs only in having `configure`. It is seen failing once with the constraint loosened in a scratch edit. It is not a `toBeCallableWith` pin, so no budget moves; the plan confirms the file is in tstyche's selection and that `[not-callable-pin]` counts nothing in it.
  - Rejected: a negative `not.toBeCallableWith` pin. It costs a counted row in a new file, and the edit to the budget and the AGENTS.md table together, for a refusal the compile already makes.
- **D-08: `useConfigured.test.tsx`: the double carries `configure`, and U1..U4 are re-expressed over it.**
  - **Note (evidence at HEAD):** the double is already an object (`interface Double`, `:22-25`). What is passed as a function is the `configure` adapter (`:43-46`) beside it. "The double becomes an object" therefore means the double gains its own `configure`, carrying the same `fail` rule and the same `configured` log, and the free function goes.
  - **On the phase base** (D-19, step 2): `Double` gains `configure`, and the harness's one call reads `useConfigured(make, (double, inputs) => double.configure(inputs), inputs)`. U1..U4 are green there with their titles and assertions unchanged.
  - **At the signature change** the one call line becomes `useConfigured(make, inputs)`. It is the file's one declared edit (D-20).
  - The header comment's "a store whose `configure` records the label" already describes the object double. It stays true.

### Area 2: `LensSession` publishes through `ExternalStore.set` (ADPT-02)
- **D-09: `move` is deleted, and `toggle`, `hover`, `cancel` and `highlight` call `store.set(next)`.**
  - `set` notifies only when the reference differs, which is exactly `move`'s doc and body.
  - `choose` keeps four things, and only its publish becomes `set`:
    - `const current = store.getSnapshot()`;
    - the `next === current` early return answering `false`;
    - `armed = pickedOf(next)` with its comment "Armed before the publish, so a listener told of the pick can take its reveal";
    - `return true`.
  - The `set` in `choose` is reached only with `next !== current`. Its own identity check is redundant there but harmless. It lives in `ExternalStore.ts`, so it adds no mutant to `LensSession.ts`.
  - After this, `LensSession.ts` calls no `publish`. `84-check.mjs no-restated-set` (D-21) holds that.
  - The module doc ("a command that moves nothing publishes nothing and keeps the snapshot reference") stays true and gains one clause: through the store's `set`.
  - Rejected: collapsing `choose` to `store.set(next); return true`. That changes the consumed answer.
  - Rejected: arming after the publish. That breaks the one-shot reveal (PITFALLS 84-C).
  - Rejected: keeping `move`. It is a second statement of `set`, and it hosted the two survivors the v1.9 first close found on `move`'s unread boolean.
- **D-10: A pin that fails if the arming moves after the publish, seen failing.**
  - `LensSession.test.ts:304` ("a listener told of a pick can take its reveal") already asserts `taken` is `[true]` from inside a listener. That is the pin, and its line has not drifted.
  - At the base, before any source edit, a scratch edit swaps `:172` and `:173` (publish, then arm). The pin is run and seen failing (`[false]`). The output goes in `84-EVIDENCE.md`. The scratch edit is reverted with `git checkout`, and the tree is checked clean.
  - The same scratch swap is made again after D-09 (arm after the `set`) and is seen failing. That shows the pin still guards the order once the publish is `set`.
  - The property at `:378` ("a command publishes exactly when the snapshot changes", which also holds that `choose` answers `true` exactly when it changed the snapshot) is the pin for the boolean.
  - `LensSession.test.ts` is held unedited (D-20).

### Area 3: `useLens` receives each fact once (ADPT-03)
- **D-11: The shape is `useLens(lens: LensSession, questions: ReadableStore<QuestionsSnapshot>): UseLens`, with `interface UseLens { readonly lens: LensSnapshot; readonly questions: QuestionsSnapshot }`.**
  - The interface name follows `useTimeline.ts`'s `UseTimeline`. It lives in `useLens.ts`, out of both barrels.
  - The hook calls `useStoreSnapshot(questions)` first and `useStoreSnapshot(lens)` second, so the order in which the stores are subscribed is today's order (the panel subscribed to questions at `:114` before `useLens` subscribed to the lens).
  - It returns both snapshots exactly as read.
  - The draw effect reads `read.questions.instances` from that same subscription and is keyed `[highlighted, instances]`, with `instances` now the hook's own read.
  - The listener effect stays keyed `[picking, lens, questions]`. Each handler reads `questions.getSnapshot().instances` when its event arrives, so a guard that registers while picking still adds no listener and is found by the next move and click (BEH-QD-737's last requirement, unchanged).
  - The exit effect keyed `[lens]` is unchanged.
  - No ref exists, and none is written during render.
  - "One questions path" means this: every read of the listed guards, at draw and at event time, goes to the one `questions` store the hook is handed, and the hook holds the one subscription to it.
  - Rejected: `useLens(lens, questions)` subscribing inside while the panel also subscribes. That gives two subscriptions and breaks the pin.
  - Rejected: `useLens(lens, instances)` with a ref for the handlers. The handlers would read the last render's guards and not the store's, and either the listener effect would churn or a ref would be written.
  - Rejected: keeping the three parameters. That is the two-path hand-off this phase removes.
- **D-12: `QuestionsPanel` reads both snapshots from the return.**
  - It replaces `const snapshot = useStoreSnapshot(questions)` (`:114`) and the `useLens(lens, questions, snapshot.instances)` call (`:118`) with one `useLens(lens, questions)` call. It then reads `.questions` for `gatesBlock`/`questionsBlock` and `.lens` for `LensView.snapshot`.
  - No markup, copy, test id or style moves. `QuestionsPanelProps` is unchanged.
  - The panel keeps exactly one subscription to each store. These are pinned by `Lens.adapter.test.tsx:138` (lens) and `:160` (questions store), which are held byte for byte.
- **D-13: `Lens.adapter.test.tsx`'s `mount` helper changes by its one line.**
  - The line `useLens(lens, questions, useStoreSnapshot(questions).instances);` (`:53`) becomes `useLens(lens, questions);`, and the now-unused `useStoreSnapshot` import (`:20`) goes.
  - These are the file's declared edits (D-20). Every `it`, the two subscription pins included, is held byte for byte.
  - The file's header ("holds one subscription to it … and to the questions store likewise") stays true.
- **D-14: Records move in the same commit as the signature.**
  - That commit carries ADR-QD-193's dated amendment to decision 6, BEH-QD-737's restated pinned-by text, and the traceability row for `Lens.adapter.test.tsx`.
  - **Note (drift):** the orchestrator and the roadmap call that row "traceability row 661". At HEAD it is line 696 of `spec/traceability.md`; line 661 is `SimulationSource.test.ts`'s row.
  - The row is found by its file cell, not by its number. `84-check.mjs` checks this (D-21).

### Area 4: `DockFrame`'s stop ledger exists once (ADPT-04)
- **D-15: One package-private hook, `useStopNotice<S>(status: S, onRestart: () => void): StopNoticeProps<S>`, in a new `react/useStopNotice.ts`.**
  - The hook holds its own `useRef<StopLedger<S>>(noStops)` and returns `useMemo(() => ({ status, onRestart, announced }), [status, onRestart])`.
  - `DockFrame` calls it twice:
    - `useStopNotice(status, model.diagnostics.restart)`;
    - `useStopNotice(timelineStatus, model.timelineStatus.restart)`.
  - Each call has its own ledger, so the two stay independent (PITFALLS 84-E). The ledger stays owned by the frame, so it outlives every screen.
  - The memo is keyed on `onRestart` and not on `model`. This is equivalent:
    - the diagnostics feed's `restart` is one closure per feed (`DiagnosticsFeed.ts:235`);
    - the timeline status's `restart` is one closure per feed (`TimelineFeed.ts:192-198`);
    - so a new model, after a hidden `Activity` rebuild, is a new `restart`, and the notice moves with it.
  - The ledger records only which stop was announced (AGENTS.md §13). The one comment saying so lives in the hook.
  - **Why a hook and not a plain helper:** the pair is a `useRef` and a `useMemo`. A helper that is not a hook cannot own either, so the frame would still write each twice. The hook is the seam that removes the second copy, and it is called unconditionally at the top of `DockFrame` like the hooks beside it.
  - Rejected: one ref holding both ledgers. It couples two independent stop histories.
  - Rejected: memoising on `status` alone. A rebuilt model's `restart` would be lost (PITFALLS 84-E).
  - Rejected: leaving the two copies.
- **D-16: One generic `StopNoticeProps<S>`, declared once in `react/StoppedBox.tsx` beside `StopLedger<S>`.**
  - Its fields are `status`, `onRestart` and `announced: RefObject<StopLedger<S>>`, with the doc comments both notices carry today, said once.
  - `DiagnosticsNoticeProps` becomes `type DiagnosticsNoticeProps = StopNoticeProps<DiagnosticsStatus>`, and `TimelineNoticeProps` likewise.
  - The names are kept so `test/helpers.ts`, `DiagnosticsNotice.test.tsx` and `TimelineNotice.test.tsx` compile unedited.
  - Neither name is in a barrel today, and neither enters one.
  - Rejected: keeping two structurally identical interfaces. The hook's return type would then have to be one of them, or a third copy.

### Area 5: `useTimeline`'s per-render inputs record is a recorded rejection (ADPT-05)
- **D-17: No memo. The rejection is recorded in ADR-QD-197 and in ADR-QD-192 decision 8's amendment, for these reasons:**
  1. **The value's own rule makes a memo a no-op.** `TimelineFeed`'s `configure` returns early on `sameFields` of the normalised inputs (ADR-QD-192 decisions 2 and 7), so a fresh record with equal fields publishes and reads nothing. A memo would save a function call and buy no behaviour.
  2. **The other records are fresh by construction.** `DevtoolsDock`'s `({ unknownParents, onInvalidate, ...inputs })` (`DevtoolsDock.tsx:86`) builds a new record each render, and so does a host's `useDiagnostics({})`. A memo there would need the host's cooperation, and ADR-QD-192 decision 8 says the hook "decides nothing about whether an input moved".
  3. **Memoising one of three hooks makes them asymmetric.** One of the three would follow a different hand-over rule for no observable gain.
  4. **The retry of a failed watch depends on repeated calls.** The gates feed retries on any `configure` (ADR-QD-192 decision 5, G43 at `GatesFeed.test.ts:715`, and `DockRegistryReads.test.tsx`'s "subscribed again by each build"), and `useDockModel`'s per-commit hand-over is what drives it. A memo rule applied across the hooks would remove that retry.
  - **Note (evidence at HEAD):** `useTimeline` never reaches the gates feed. Its `configure` is `TimelineFeed`'s, which has no retry. So reason 4 is not a dependency of `useTimeline`'s own calls. It is a reason not to make memoisation the hooks' rule, and so to keep the three symmetric (reason 3). The ADR states it in that form rather than claiming G43 depends on `useTimeline`.
  - `useTimeline.ts:69-70`'s comment ("a record rebuilt every render configures nothing") stays, reworded only if it names the deleted adapter.
  - Rejected: `useMemo` in `useTimeline` only (STACK/FEATURES, PITFALLS 84-B's fallback).
  - Rejected: a shallow compare in `useConfigured`. It breaks ADR-QD-192 decision 8 and would swallow G43's retry through `useDockModel`.
- **D-18: A pin that the rejection costs nothing.** Written on the base (D-19), through `useTimeline`, whose public signature does not change:
  - A re-render with a fresh options object holding the same `capacity` and the same `source` publishes nothing from the timeline store (`store`) and nothing from the status store. Listeners are counted directly, not through renders.
  - The same holds with no options after no options.
  - A re-render with a moved capacity publishes, as a control showing that the counter can see a publish.
  - G43 and `DockRegistryReads.test.tsx` are held unedited (D-20). That is how "G43 unaffected" is shown.

### Area 6: Characterisations, held files, order, scripts, measurement, records (WX-01..07)
- **D-19: Characterisations, each written on the phase base and green there before any source edit.** Each imports nothing whose signature this phase changes, except where D-08 says otherwise, so its text holds from its commit to the close.
  - **`useConfigured.test.tsx`**, re-expressed as D-08 says.
  - **`test/react/Lens.questions.characterisation.test.tsx`**, through `QuestionsPanel`, whose props do not change. It pins:
    - a highlight drawn over a guard follows the questions store when the store republishes that guard with another element, so the overlay moves to the new element;
    - a pointer move and a click while picking resolve against the store's current list;
    - a guard dropped from the store while it is highlighted leaves no overlay;
    - the panel holds one subscription to each store across those publishes.
    - It is shown failing once under a scratch edit, for example making the draw read a stale `instances`.
  - **`test/react/DockFrame.stops.characterisation.test.tsx`**, through `DevtoolsDock`. It pins:
    - a diagnostics stop and a timeline stop are each announced once, and independently;
    - a second stop of one remounts only its own box, and the other's alert is not re-announced;
    - after a hidden-then-shown dock, a Restart on each notice calls the rebuilt model's `restart`.
    - It is shown failing once under a scratch edit, for example sharing one ledger or keying the memo on `status` alone.
  - **`test/react/useTimeline.inputs.characterisation.test.tsx`**: D-18.
  - **The arm-before-publish pin**: D-10, using the existing `LensSession.test.ts:304`. No new file.
  - The planner may merge these into existing files only if the held-file check (D-20) can still state each held region exactly. Separate files are preferred.
- **D-20: Held files, checked by `84-pinned-check.mjs` (81's flip, addition and edit model).**
  - **Byte for byte:**
    - `ConfigureFirstRender.characterisation.test.tsx` and `Lens.dock.characterisation.test.tsx`, both held to their first commit by hash by the archived `79-` and `80-characterisation-check.mjs`;
    - `Lens.dock.test.tsx`;
    - `LensSession.test.ts`;
    - `DockRegistryReads.test.tsx`;
    - `GatesFeed.test.ts` (G43);
    - `TimelineNotice.test.tsx` (TN1-TN14);
    - `DiagnosticsNotice.test.tsx` (N1-N15);
    - `QuestionsPanel.feed.characterisation.test.tsx`;
    - `TimelineLifetime.test.tsx`;
    - `useTimeline.test.tsx`;
    - `test/helpers.ts`;
    - the files Phase 80's pinned check holds (`Lens.test.ts`, `QuestionsPanel.test.tsx`, `VerdictTreatment.test.tsx`, `QuestionsPanel.gates.test.tsx`).
  - **Declared edits:**
    - `useConfigured.test.tsx`: D-08's one call line, after its base commit.
    - `Lens.adapter.test.tsx`: D-13's call line and import.
    - `surface.tst.ts`: D-05's added "no exported member" pins, as additions. This includes pins for `useStopNotice`, `StopNoticeProps`, `UseLens` and `Configurable` under the root and the React entry.
  - Any other byte fails.
  - The earlier phases' checks that hold any of these files are re-run from a scratch copy with paths rewritten, never by editing their directories. That means `79-`/`80-pinned-check.mjs`, `79-`/`80-characterisation-check.mjs`, `81-pinned-check.mjs` and `83-pinned-check.mjs`. The archived v1.9 ones hard-code `.planning/phases/QD-79…`/`QD-80…` (`_WAVE15-CONTEXT.md`, Cross-cutting). The pattern is `83-earlier-checks.mjs`, as `84-earlier-checks.mjs`. Invocations and results go in `84-EVIDENCE.md`.
- **D-21: Phase-local scripts mirror Phase 83's: `84-check.mjs`, `84-pinned-check.mjs`, `84-mutation.mjs`, `84-earlier-checks.mjs`.**
  - `84-check.mjs` carries 83's modes: `base`, `commit`, `unchanged`, `seen-failing`, `scan-ids`, `scan-forbidden`, `trailers` and `--self-test`. Phase modes:
    - `no-adapter`: `src/react/**` holds no `configureDock`, `configureTimeline` or `configureDiagnostics`. `useConfigured` has two parameters. `Configurable` is declared once.
    - `no-restated-set`: `LensSession.ts` declares no `move` and calls no `publish`. In `choose`, the `armed =` assignment precedes the `store.set(` call.
    - `one-path`: `useLens` has two parameters, calls `useStoreSnapshot` once per store, and contains no `useRef`. `QuestionsPanel.tsx` calls no `useStoreSnapshot(questions)` of its own.
    - `one-ledger`: `src/react/**` holds exactly one `useRef<StopLedger` (in `useStopNotice.ts`). `DevtoolsDock.tsx` holds none.
    - `records`: the `Lens.adapter.test.tsx` traceability row, found by file cell, matches its `it` titles. BEH-QD-734/736/737's pinned-by lists name existing titles.
    - `GUARDED` admits no AGENTS.md or `check-house-style.mjs` edit, because no budget moves.
  - Each script is shown failing once, and each self-test plants the failure it guards.
- **D-22: Commit order. Every commit is green.**
  1. Scripts and the mutation base (D-24), before any test or source change.
  2. The characterisations (D-19), D-08's base form and D-10's base scratch evidence.
  3. `useConfigured` and the three call sites (D-05..D-08), with the type test.
  4. `LensSession` (D-09) and D-10's second scratch evidence.
  5. `useLens` and the panel (D-11..D-13), with D-14's records in the same commit.
  6. `useStopNotice` and `StopNoticeProps` (D-15, D-16).
  7. The remaining records (D-25) and the changeset (D-26).
  8. The mutation close and the phase gates (D-24, D-27).
  - Steps 3 to 6 are independent and may be reordered or merged by the planner. Steps 1 and 2 come first, in that order.
- **D-23: `phase_base` is HEAD at the start of planning.** `84-check.mjs base` records it, as in Phases 81 and 83. At discuss time HEAD is `3d0ccfbc`; this CONTEXT's own commit follows it.
- **D-24: Mutation, measured like Phase 83's.**
  - The base is taken at the phase base with a clean tree, before any test or source edit, over `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/LensSession.ts`. It goes in `84-mutation-base.json`.
  - The v1.9 Phase 80 close read 52 killed, 0 survived, 0 no-coverage and 22 ignored (`80-mutation-close.json`, group `lens`). The base re-measures it and does not rely on that figure.
  - The close goes in `84-mutation-close.json` and is re-taken after each review-fix round.
  - The rule:
    - the score may fall only because killed mutants were deleted (`move`'s body);
    - no new Survived, NoCoverage or Ignored mutant;
    - new literals stay inside function bodies;
    - the absolute bar is no open mutant in `LensSession.ts`.
  - **Unmeasured, with the reason.** `stryker.devtools.mjs:47` mutates `packages/devtools/src/model/**` only, and no Stryker config reaches `src/react`. These files are measured by their tests, the held characterisations and the 90% coverage threshold: `src/react/useConfigured.ts`, `useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts`, `useLens.ts`, `useStopNotice.ts`, `QuestionsPanel.tsx`, `DevtoolsDock.tsx`, `StoppedBox.tsx`, `DiagnosticsNotice.tsx` and `TimelineNotice.tsx`.
- **D-25: Records.**
  - **ADR-QD-197 (new), "A configurable value, one questions path for the lens, and one stop ledger".** It records:
    - the `Configurable<I>` constraint and its property form, with D-06's inference result;
    - `LensSession` publishing through `set` and `choose`'s arm-before-publish order;
    - the lens's one-fact contract (D-11);
    - the shared stop ledger (D-15, D-16);
    - the `useTimeline` rejection with all four reasons and the note on reason 4 (D-17);
    - every rejected alternative above.
  - **Amendments, as dated paragraphs, with past text kept:**
    - ADR-QD-192 decision 8: `useConfigured` takes a value that has `configure`, and the per-render hand-over is kept, by recorded rejection.
    - ADR-QD-193 decision 6: `useLens(lens, questions)` returns both snapshots and the draw reads the hook's own read.
  - **BEH-QD-756..760** in `spec/behaviors/28-devtools-screens.md`:
    - 756: `useConfigured` takes a value that has `configure` through one named constraint, and each hook infers its value and input with no adapter and no type argument.
    - 757: the lens publishes every move through the store's `set`, and a pick's reveal is armed before the pick is published, so a listener told of it can take it.
    - 758: `useLens` takes the session and the questions store, subscribes once to each, and returns both snapshots. The draw reads its own read, and the handlers read the store when their event arrives.
    - 759: the dock's two stop notices come from one hook, each with its own ledger, and each moves with its feed's `restart`.
    - 760: a hook that hands over a fresh inputs record with equal fields publishes nothing, and the per-render hand-over is kept on purpose.
  - **Amended pinned-by lists:**
    - BEH-QD-734: U1..U4 over a double that carries `configure`, plus the new type test.
    - BEH-QD-736: the arm-before-publish pin, named.
    - BEH-QD-737: the subscription pins and the new questions characterisation.
  - **INV-QD-413:** when the lens publishes a pick, the reveal is already armed for that pick's guard. Source: `choose` in `LensSession.ts`. Enforced by `LensSession.test.ts:304` and `stryker.devtools.mjs`.
  - **INV-QD-414:** the lens adapter reads the listed guards only from the one questions store it is handed, through one subscription at render and through `getSnapshot` at event time, and the panel holds one subscription to each store. Source: `useLens.ts`. Enforced by `Lens.adapter.test.tsx` and the new questions characterisation.
  - **Amended:** INV-QD-406's Source, whose draw effect now reads the hook's own questions read.
  - All five BEH numbers and both INV numbers are used, so the CCR-QD-476 row names none as unused. If planning finds one of them is not a real invariant or behaviour, the CCR row names it unused instead of stretching it.
  - **Also updated:**
    - traceability rows for every new and amended id and for the new test files;
    - `spec/README.md`'s CCR-QD-476 row;
    - `spec/decisions/index.yaml`.
  - Checked and left unchanged, because each is still true at HEAD:
    - ADR-QD-137 (the `useConfigured` amendment at `:165`);
    - ADR-QD-047 (`:533`);
    - AGENTS.md §13 (`:870`);
    - `spec/overview.md`;
    - `upgrading.md:194`.
- **D-26: One changeset, `.changeset/devtools-lens-reads-each-fact-once.md`, `"@qadi/devtools": patch`, ending "No export changes."**
  - It says the lens adapter now reads the listed guards from one subscription and the store, and that the dock's internal hand-over is unchanged.
  - **Note (evidence at HEAD):** the change is not observable by a host. Before, the panel passed `useStoreSnapshot(questions).instances`, a read of the same store over the same single subscription. The changeset therefore states the internal change and claims no host-visible behaviour change. Precedent: `devtools-configure-applies-every-input.md` closes "No export changes."
  - It mentions nothing package-private by name beyond what a reader of the CHANGELOG needs.
- **D-27: Gates.**
  - `pnpm check:pr < /dev/null` is green at the close and again after the review fixes (WX-01).
  - `pnpm spec:verify:strict` and `pnpm spec:package` (gate 14) pass at the close.
  - `pnpm test:tstyche` passes under both configurations.
  - Gate 12 (`check-devtools-claims.mjs`) stays clean.
  - Coverage holds at 90% or more for devtools (WX-05).

### Claude's Discretion
- The names `Configurable`, `UseLens`, `useStopNotice` and `StopNoticeProps` may change in planning if a clearer set emerges. Each must stay one named, package-private declaration, out of both barrels.
- The characterisation files' names, row ids and fixtures, and whether D-18's pin lives in its own file or beside `TimelineLifetime.test.tsx` as a new file. Held files are never edited for it.
- How plans group D-22's steps, provided steps 1 and 2 come first in that order and each commit is green.
- The changeset's wording, provided it ends "No export changes." and claims no host-visible change.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExternalStore.ts`:
  - `makeExternalStore` with `set` (`:108-112`, drops an identical value) and `publish` (`:113-116`);
  - `ReadableStore<A>` (`:41`);
  - `sameFields` (`:153`), the feeds' rule that makes the per-render hand-over free.
- `useScoped.ts` (unchanged) and `useStoreSnapshot.ts` (`useStoreSnapshot`, `usePaused`).
- `StoppedBox.tsx`: `StopLedger<S>` (`:25-28`), `noStops` (`:31`), `stoppedKey` (`:34-35`) and `StoppedBoxProps<S>` (`:55-70`).
- `useTimeline.ts`'s `export interface UseTimeline` (`:31-42`) is the naming precedent for a hook's return record.
- Test helpers: `test/helpers.ts` (`liveNotice`, `settleTurns`), `test/react/questionsPanelInput.ts` (`panelInput`), `test/builtFeeds.ts` and `test/collectorDouble.ts`.
- Phase 83's scripts are the templates for D-21: `83-check.mjs`, `83-pinned-check.mjs` (rename-aware, with the flip, addition and edit model), `83-mutation.mjs` and `83-earlier-checks.mjs`.

### Established Patterns
- The feeds and the dock take inputs only through `configure`, and `useConfigured` decides nothing about whether an input moved (ADR-QD-192 decision 8).
- A package-private module stays out of the barrels, and `surface.tst.ts` pins each such name as "no exported member" (ADR-QD-099).
- Type refusals in `.tst.ts` files are either counted `not.toBeCallableWith` pins (`NOT_CALLABLE_PIN_BUDGET`) or budget-free `@ts-expect-error` lines with a message fragment (`ConfigureInputs.tst.ts`, `ExternalStore.tst.ts`).
- Lens rules live in the headless session, and `useLens` holds no React state (ADR-QD-193). Every `document` reference is inside an effect (AGENTS.md §13).
- Run tests from the repo root: `pnpm exec vitest run --project devtools <file> < /dev/null`. Stryker runs alone with stdin closed.

### Integration Points
- `packages/devtools/src/react/useConfigured.ts:19-32`.
- `useDockModel.ts:22-24, 30`, `useTimeline.ts:44-46, 69-71` and `useDiagnostics.ts:19-21, 42-44`.
- `packages/devtools/src/model/LensSession.ts:148-152` (`move`) and `:167-175` (`choose`).
- `packages/devtools/src/react/useLens.ts:22-41` (doc and signature), `:49-60` (draw), `:64-111` (listeners) and `:113-118` (exit).
- `QuestionsPanel.tsx:106-119` and `LensView` (`:155-158`).
- `packages/devtools/src/react/DevtoolsDock.tsx:86` (rest spread), `:97`, `DockFrame` `:108-128`, and the notice hand-off at `:195-196`.
- `DiagnosticsNotice.tsx:36-48` and `TimelineNotice.tsx:23-34`.
- Tests:
  - `useConfigured.test.tsx:22-46` (double and adapter) and U1-U4 (`:74-116`);
  - `LensSession.test.ts:304` and `:378`;
  - `Lens.adapter.test.tsx:53` (mount) and `:137-180` (subscription pins);
  - `GatesFeed.test.ts:715` (G43);
  - `DockRegistryReads.test.tsx:121`;
  - `test/surface.tst.ts:270-290`.
- Spec:
  - `spec/behaviors/28-devtools-screens.md` (BEH-QD-734 at 3213, 736 at 3298, 737 at 3358);
  - `spec/invariants.md` (INV-QD-403 at 4673, 405 at 4697, 406 at 4709);
  - `spec/traceability.md` (useConfigured row 629, ConfigureFirstRender 630, LensSession 649, Lens.dock 695, Lens.adapter 696, Lens.dock characterisation 698, INV-QD-405/406 rows 248-249);
  - ADR-QD-192 (decision 8 at `:91-102`, decision 5 at `:76-79`, last amendment at `:290`);
  - ADR-QD-193 (decision 6 at `:102-125`, test paragraph at `:249-256`).

### Drift from the roadmap's evidence (written at `902d2128`)
- `useConfigured.ts:19-31` → `19-32`.
- `useTimeline.ts:70` (the fresh record) → `:71`. `:70` is the comment.
- `useLens.ts` signature: research `39-43` → `37-41`.
- "Traceability row 661" → line 696 of `spec/traceability.md`. 661 is `SimulationSource.test.ts`.
- Unchanged:
  - `useDockModel.ts:22`, `useTimeline.ts:44` and `useDiagnostics.ts:19`;
  - `LensSession.ts` 149-152 and 167-175;
  - `QuestionsPanel.tsx:114-118`;
  - `Lens.adapter.test.tsx:160`;
  - `DevtoolsDock.tsx:116-128` and `:86`;
  - `LensSession.test.ts:304/378`.
</code_context>

<specifics>
## Specific Ideas

- `84-EVIDENCE.md` holds, verbatim:
  - each characterisation's green base run and its one scratch-edit failure;
  - D-10's two arm-after-publish failures, before and after the `set` change;
  - each check script's planted failure;
  - the earlier phases' checks re-run from scratch copies.
- ADR-QD-197's `useTimeline` paragraph quotes `useTimeline.ts:69-71` and `DevtoolsDock.tsx:86` as they read at the phase base, so the "fresh by construction" claim can be checked from the record.
- ADR-QD-197 states D-06's inference result as checked: three call sites, no type arguments, three refusals.
</specifics>

<deferred>
## Deferred Ideas

- Giving `runSource` a named sink type in place of `Pick<TimelineStore, "accept">`. This was carried from Phase 83's deferred list. It touches the timeline engine, which this phase does not touch.
- Moving `src/react`'s headless rules into a measured module so that a Stryker config reaches them. Today only `LensSession` is measured. The hooks here hold no rule of their own after this phase, so there is nothing to move.
- Unifying `stoppedKey`'s callers or the two notice components beyond their props type. They differ in copy, test ids and focus targets (`FEEDS` in `StoppedBox.tsx:47-52`), so this is not a duplicate.
</deferred>
