# Phase 56: The gate-registry watch becomes the dock model's third feed - Context

**Gathered:** 2026-11-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers one package-private, scoped feed module in `@qadi/devtools` that owns the questions panel's two host inputs:

- the gate-registry watch (subscription, guarded reads, failure keying, re-subscription on `configure`, release in a finalizer);
- the `questions` thunk (GFED-05, decided Yes).

After it, `DockModel` composes three feeds (timeline, diagnostics, gates) and calls `joinQuestions`. `DockModel.ts` keeps no mutable gate-watch state; it has eight such `let`s on the base. The watch's tests run against the feed alone, and the questions panel's observable behaviour is pinned on the phase base.

Out of scope:
- the Services tab (Phase 55, done);
- `joinQuestions`' wording;
- any new panel state other than the failure that GFED-05 makes reachable.

</domain>

<decisions>
## Implementation Decisions

### GFED-05: the feed owns the `questions` thunk (owner, 2026-11-18)

- **D-01:** Yes. The feed owns both host inputs of the questions panel.
  - **Why:** on the base, a throwing `questions` thunk is a defect in the diagnostics sample. It ends the whole poll, so wiring, activity and calls freeze on every tab. A throwing registry, by contrast, becomes only `GatesView.Failed`. One feed gives both inputs one failure policy, and the poll survives a throwing thunk.
  - **Precedent:** the owner's standing preference is complete over simple. Breaking is acceptable, and compatibility never breaks a tie.
- **D-02:** `questions` leaves `DiagnosticsDockOptions` and becomes a dock input beside `gates`: `DockModelInputs.questions` and `DevtoolsDockProps.questions`.
  - `@qadi/react`'s `useDevtoolsFeed` returns `questions` at the top level, beside `gates` and `onInvalidate`, so `DevtoolsDiagnosticsFeed` loses it.
  - `<DevtoolsDock {...feed} />` keeps compiling for a host that spreads the feed.
  - A host that wrote `diagnostics={{ …, questions }}` by hand gets a compile error. Both packages carry this as **Breaking**.
  - Research must list every public surface that names the thunk and settle each one so no orphan path is left. Candidates: `DiagnosticsOptions.questions` and `runDiagnostics`' sampling of it, `useDiagnostics`, the `nextjs-newsroom` example, and website docs.
  - The reading's own `questions` field (`Diagnostics`/`DiagnosticsReading`, a reading supplied from elsewhere) stays. Its precedence over what this process reads is unchanged.
- **D-03:** A throwing thunk is stated in the questions panel, the way a throwing registry is. The poll keeps running.
  - This is the one deliberate behaviour change. A test written first pins it RED on the base, where the poll is `Stopped`, and it goes green after.
  - Its copy is one neutral sentence in the same register as decision 5 of ADR-QD-162.
  - The exact view tag is at Claude's discretion: a `QuestionsView.Failed{reason}` or a shared failure. It must keep the views closed unions and never claim rows it could not read.
- **D-04:** `asked()` cannot be observed; it has no change signal. The feed therefore reads it on its own cadence and compares by reference, so a quiet tick publishes nothing.
  - Default cadence: `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`.
  - Whether it also re-reads on each registry change, and how "unsampled" is decided now that the poll no longer carries the questions, are at Claude's discretion. The bar is that `QuestionsView.Unsampled` vs `Absent` reads the same to a user as on the base.
  - **Amended after research (orchestrator, 2026-11-18):** `asked()` returns a fresh array on every call (`packages/react/src/QuestionBook.ts:184`). A reference compare would therefore publish on every tick. The feed compares answers with `Equal.equals`, as `DiagnosticsStore`'s `keep` already does, inside the same `try` as the thunk's call. The other D-02 surface details are also settled by research, on the owner's rule that the path is complete and has no orphans:
    - `diagnostics.intervalMillis` is forwarded to the feed's cadence.
    - `FeedOwnedKey` becomes `"layer" | "questions"`, so passing `questions` in `extra` is a compile error.
    - `Diagnostics`/`DiagnosticsReading.questions` stays, as stated above. Only a supplied reading carries it (research Option A).
    - INV-QD-357 is worded by what the feed owns (registry, subscription, failure state, thunk). `DockModel` keeps `closed` and its last join.
    - The registry is no longer re-read on a diagnostics publish that changes no question. This matches ADR-QD-162's wording and is recorded in a BEH.

### Feed shape and home

- **D-05:** New `packages/devtools/src/model/GatesFeed.ts`, with `makeGatesFeed` as `Effect.fn("qadi.devtools.makeGatesFeed")` built in the caller's scope. It is package-private (ADR-QD-099) and out of both barrels.
- **D-06:** The snapshot is a closed tagged enum, `Unwatched | Read{instances} | Failed{reason}` for the registry, plus the questions read per D-03 and D-04. Names are at Claude's discretion.
  - The failure key (name and message; ADR-QD-162 Rev 1.3) stays private to the feed.
  - One failure arriving by two paths is published once.
- **D-07:** The interface mirrors `DiagnosticsFeed`: `getSnapshot`, `subscribe` and `configure(…)`.
  - It re-subscribes when the registry's identity changes or after a failed watch (Rev 1.4).
  - It releases in a finalizer. A release that throws is not stated and is not called again (Rev 1.2/1.5).
  - A closed feed runs no host code.
  - Stating a throw stays total (Rev 1.5).
- **D-08:** `reasonOf` and `keyOf` move into the feed. `DockModel` keeps `rejoin` only as a pure combine of the feeds' snapshots and the diagnostics status, and `configure` still swaps the registry before `remerge` (Rev 1.5).

### Tests and mutation

- **D-09 (GFED-04, WX-06):** A new characterisation is written on the phase base, through the public dock. It covers every `GatesView` and `QuestionsView` state the panel reaches:
  - a throwing `instances`;
  - a throwing `subscribe`;
  - a swapped registry;
  - mends, both announced and silent;
  - unsampled vs absent.

  It is green before and after, and never edited. The existing `QuestionsPanel.characterisation.test.tsx` stays unedited. The throwing-thunk case is the D-03 RED test, kept out of the characterisation.
- **D-10 (GFED-03):** M31..M47 and P2 each gain a twin in `packages/devtools/test/model/GatesFeed.test.ts`, which runs against the feed alone with `packages/devtools/test/gateRegistryDouble.ts`.
  - A `DockModel.test.ts` case is deleted only once its twin is green (Phase 26 precedent).
  - `DockModel.test.ts` keeps one test showing that the join moves first, plus the cases that are about the join and not the watch (M32, M34, or what research identifies).
- **D-11 (WX-05):** This follows Phase 55's D-15: Phase 53's D-14 rule, with the static-ignored credit accepted in Phase 54 (ADR-QD-167 Rev 1.1).
  - `56-mutation-base.json` is recorded on the phase base for every touched model file: `DockModel.ts`, `DiagnosticsFeed.ts`/`DiagnosticsStore.ts` (touched under D-02), and `Gates.ts` if touched.
  - A fall passes only as killed mutants that moved into `GatesFeed.ts`, where they are still killed.
  - `GatesFeed.ts` has no survivor that a test could kill.
- **D-12:** RED first: the feed's unit test fails by import before the module exists. Then the feed. Then the watch moves out of the model. Then the tests move. Then the records.

### Records

- **D-13 (GFED-05, WX-02):** ADR-QD-169 applies ADR-QD-137 and records D-01 with its reason. It leaves ADR-QD-162 intact, keeps ADR-QD-150, and amends ADR-QD-047's 2026-11-12 amendment, since `questions` is no longer a diagnostics option.
  - INV-QD-357: one feed owns the gate watch, and `DockModel` holds no mutable gate-watch state.
  - INV-QD-358: the questions panel's two host inputs fail the same way, and neither stops the diagnostics poll.
  - Also CCR-QD-447 and BEH-QD-616..620. Any unused reservation is named "Unused: …" in the CCR row.
- **D-14 (WX-07):** Two **minor** changesets, each with one **Breaking** entry:
  - `@qadi/devtools`: `questions` moves from `DiagnosticsDockOptions` to the dock, plus anything research adds under D-02;
  - `@qadi/react`: `useDevtoolsFeed` returns `questions` at the top level.

  `apps/website/src/content/docs/docs/reference/upgrading.md` gains the note in its unreleased 0.13 section. Nothing is released.
- **D-15 (WX-03):** `spec/overview.md` follows gate 13 (`check-api-surface.mjs`) for every changed export.

### Claude's Discretion
- Exact names of the snapshot tags, the questions failure tag and the feed's options.
- The cadence detail and the "unsampled" rule under D-04, within the stated bar.
- BEH placement across the devtools behaviour docs.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TimelineFeed.ts` and `DiagnosticsFeed.ts` are the shape to copy: a scoped feed with `configure`, a store and a finalizer. `makeExternalStore` in `ExternalStore.ts`, and `makeSupersedingRun` for a forked cadence.
- In `Gates.ts`: `joinQuestions`, `JoinInput`, `GatesView` (`Absent | Empty | Rows | Failed`), `QuestionsView` (`Unsampled | Absent | Empty | Rows`) and `GateRegistryLike`.
- `packages/devtools/test/gateRegistryDouble.ts`: it counts listeners, subscriptions, releases and reads, and offers `failReads`, `mendReads`, `mendReadsQuietly`, `failSubscribe`, `failRelease` and `swallowListenerErrors`.

### Established Patterns
- A host throw is stated, never swallowed (ADR-QD-162 decision 5, Rev 1.1–1.5). Failures are keyed by name and message.
- Each store recomputes only when an input reference moves (`rejoin`, `reservice`).
- Closed tagged enums (`Data.TaggedEnum`) and hoisted `Match.type<…>()`. House rules are in AGENTS.md.

### Integration Points
- `DockModel.ts` lines 175–326 hold the inline watch, `rejoin`, the finalizer and `configure`'s gate branch.
- `DiagnosticsStore.ts` `runDiagnostics` samples `questions` (lines ~223–225). `DiagnosticsFeed.ts` names `questions` in `DiagnosticsDockOptions` (line ~95) and restarts the poll when it changes (line ~230).
- `useDockModel.ts` passes `gates` and will pass `questions`. In `DevtoolsDock.tsx`, the props doc at line ~115 names `questions`.
- `packages/react/src/DevtoolsFeed.ts`: `useDevtoolsFeed`, `DevtoolsDiagnosticsFeed` and `FeedOwnedKey`.
- `examples/nextjs-newsroom/src/client/Counters.tsx` uses `DiagnosticsDockOptions`.

</code_context>

<specifics>
## Specific Ideas

- The owner chose GFED-05 = Yes on 2026-11-18 at the Phase 56 smart discuss.
- ADR-QD-162's decision 5 was revised three times on the day it was written, all about this guard. The feed must keep every one of those revisions (1.1–1.5) as tested behaviour.

</specifics>

<deferred>
## Deferred Ideas

- Phase 55's review Info items IN-01..03 (ServicesPanel.reading header, M54 title and BEH-QD-615 "notifies twice", the unguarded `reservice`) belong to the next change that touches those files. They are not this phase's scope unless `DockModel.ts` edits make IN-03 free to fix.
- The "never called" wording on the four non-port service cards (Phase 55 D-09).

</deferred>
