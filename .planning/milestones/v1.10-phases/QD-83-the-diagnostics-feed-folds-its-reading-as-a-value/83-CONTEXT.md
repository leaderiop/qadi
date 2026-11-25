# Phase 83: The diagnostics feed folds its reading as a value - Context

**Gathered:** 2026-11-25 (smart discuss, autonomous mode. Every decision below was decided autonomously on 2026-11-25 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest")
**Status:** Ready for planning

<domain>
## Phase Boundary

Today the diagnostics feed keeps its reading in a second store that nothing subscribes to, and the public `Diagnostics` type carries a field the poll never writes.

1. **A store with no subscriber.**
   - `packages/devtools/src/model/DiagnosticsStore.ts:146-189` is a store: `subscribe`, `getSnapshot` and `accept`, built on `makeExternalStore`.
   - Its one caller is `DiagnosticsFeed.ts`. Its `subscribe` is reached only by its own test (`DiagnosticsStore.test.ts`, the `makeDiagnosticsStore` describe).
   - The feed already publishes `{ status, reading }` through its own `view` store, so the reading is held twice: once in the store and once in the view. `show` copies one into the other (`DiagnosticsFeed.ts:177-182`).
2. **A wrapper and a replacement around it.**
   - `start()` wraps the store in `marking` (`DiagnosticsFeed.ts:187-198`, which has drifted from the ≈189-200 the roadmap cites) only to put the `runs.isCurrent(token)` guard, the `sampled` flag and the `Live` mark before `accept`.
   - `off()` replaces the store with a fresh one (`:210-215`), which is how the reading resets.
3. **The engine takes more than it uses.** `runDiagnostics` (`DiagnosticsStore.ts:238-260`) takes the whole `DiagnosticsStore` and calls only `accept`. `runSource` takes `Pick<TimelineStore, "accept">` (`TimelineStore.ts:115-116`).
4. **`Diagnostics.questions` is never sampled.**
   - The poll writes `questions: undefined` on every sample (`DiagnosticsStore.ts:252`).
   - `mergeReading` copies a supplied reading's questions into its result (`:143`).
   - The dock's join reads `held.reading?.questions` straight from its input (`DockModel.ts:384`, drifted from `:378`), never from the reading.
   - Nothing in src, docs, examples or READMEs reads `Diagnostics.questions`.
   - It is still observable. `mergeReading` is public, and the dock model's `diagnostics` readout carries a supplied reading's questions in `reading.questions`. So removing it is a public type change. BEH-QD-617 (`28-devtools-screens.md` ≈2456), ADR-QD-169 decision 10 and `upgrading.md:921` each say it stays.

After this phase:
- The feed holds its reading in the one snapshot it publishes. Each accepted sample is folded into that reading by one pure per-field keep-if-equal function, which has value tests.
- `DiagnosticsStore`, `makeDiagnosticsStore`, `marking` and the store replacement in `off()` are gone.
- `runDiagnostics` takes a one-member `accept` sink, as `runSource` does.
- `Diagnostics` has no `questions`. `DiagnosticsReading.questions` stays, and the dock's join reads it with unchanged timing.
- The module is renamed `Diagnostics.ts` (with `Diagnostics.test.ts` and `Diagnostics.tst.ts`), with every register that names it kept in step.

ARCH-130. Package: `@qadi/devtools`. One **Breaking** minor changeset, because `Diagnostics` loses a field. No export is added or removed, so gate 13's count holds. `@qadi/react` is unchanged.

Records:
- ADR-QD-196 (new). It amends ADR-QD-173 and ADR-QD-169 decision 10.
- CCR-QD-475.
- BEH-QD-751..755. BEH-QD-323, 617, 637, 639, 640 and 699 are restated.
- INV-QD-411..412. INV-QD-314 and 366 are amended.

Evidence:
- The code at head `b0b3cabc`. `packages/devtools` was last changed by `98612f49`, Phase 81's IN-01 fix, and Phase 82 touched no devtools file.
- `.planning/phases/_WAVE15-CONTEXT.md`.
- `.planning/research/`.
- Phase 81's records and scripts.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE15-CONTEXT.md`, ROADMAP, REQUIREMENTS)
- **D-01:** Work on branch `arch-wave-15` only, one phase at a time, on the main tree (`use_worktrees` is false). No merge, push, tag, release, publish, `changeset version` or version-packages PR (WX-07).
- **D-02:** Use only the reserved records: ARCH-130, ADR-QD-196, CCR-QD-475, BEH-QD-751..755 and INV-QD-411..412.
  - Never run `node scripts/next-id.mjs`.
  - Name a reserved number left unused as "Unused" in the CCR row.
  - Make spec edits only through `node scripts/spec-revise.mjs <doc> "<change (CCR-QD-475)>" --date <the real date>`, and verify each with `--check`.
  - No D-number, plan-local id or phase number goes in shipped source, a test title or a BDD scenario. No `*-NEXT` placeholder goes anywhere.
- **D-03:** Tests come first (WX-06).
  - The characterisation of D-15 is written on the phase base, green there and at every later commit. It is shown failing once under a scratch source edit.
  - Every RED test (D-12's type and value pins) is seen RED on the base for the stated reason, with its output saved in `83-RED-EVIDENCE.md`.
  - Every new check is shown failing once.
  - No throwaway file exists at any commit or when a mutation record is taken.
  - A surviving mutant is closed with a test, never by re-baselining (WX-05).
- **D-04:** Nothing new from WX-04's list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, an ambient console, `process.env` or clock, `Record<string, unknown>`, `// Stryker disable`, or a module-scope `let`.
  - `MODULE_STATE_BUDGET`, `SWITCH_BUDGET` and `UNTRACED_BUDGET` do not move.
  - `NOT_CALLABLE_PIN_BUDGET` changes only by its key (D-19). Its count stays at `callable: 3`.

### Area 1: The fold, a pure value function (DIAG-02)
- **D-05: One pure function, `foldReading(previous: Diagnostics, next: Diagnostics): Diagnostics`, in the renamed `Diagnostics.ts`, beside `mergeReading`.**
  - Both are per-field laws of the reading, so they live with the reading's type and `noDiagnostics`.
  - It is exported from the module only, never from either barrel, as `sameFields` is (ADR-QD-099).
  - The name mirrors `mergeReading`: one lays a supplied reading over a sample, the other folds a sample into the last reading.
- **D-06: Its law.**
  - Each field keeps `previous`'s reference when `Equal.equals(previous.f, next.f)`, and takes `next.f` otherwise. This is today's private `keep`, which stays module-private.
  - When no field moved, it returns `previous` itself. It decides that with `sameFields(folded, previous)` from `ExternalStore.ts`, the one rule the feeds already use to decide whether something moved (ADR-QD-192), not with a hand-written `&&` chain per field.
  - The return type is `Diagnostics`, and the folded value is an object literal naming every field. A field added to `Diagnostics` is therefore a compile error until the fold lists it, and the identity check covers it with no edit.
  - Rejected: today's five-clause `===` chain. It is a second list of the fields that can silently miss a new one, and each clause adds a mutant that tests only the chain.
- **D-07: Value tests, with no Effect, no store and no clock** (in `Diagnostics.test.ts`, replacing the `makeDiagnosticsStore` describe). They pin:
  - It returns `previous` itself for a structurally equal but freshly built sample.
  - Each field moved alone gives only that field a new reference. This is table-driven over the field list, so a field added later without a row is visible in review.
  - Folding N identical samples from `noDiagnostics` changes identity once, at the first, and never after.
  - A first sample folded into `noDiagnostics` keeps the fields equal to the empty reading's, such as `WiringRead.NotHanded()`.
  - `Equal.equals`, not `===`, decides: a fresh `NotHanded()` and a fresh equal `activity` array keep the previous references.

### Area 2: The feed holds the reading, and the engine takes a sink (DIAG-02)
- **D-08: The reading lives in the one snapshot the feed publishes.**
  - `view.getSnapshot().reading` is the reading. There is no `let reading` beside it and no store, so no two places can disagree.
  - `show` takes the status and the reading together and keeps today's drop of an unchanged pair, so one transition is still one publish.
  - Rejected: a separate `let reading` in the closure. It recreates today's two copies (store and view) under another name.
  - Rejected: keeping a store with no subscriber, which is what the phase removes.
- **D-09: `runDiagnostics(sink: DiagnosticsSink, options?: DiagnosticsOptions)`.**
  - `DiagnosticsSink` is a named one-member interface, `{ readonly accept: (sample: Diagnostics) => void }`, in `Diagnostics.ts`. It is package-private, out of both barrels, and pinned as unexported in `surface.tst.ts` (D-21).
  - The span `qadi.devtools.runDiagnostics`, the `Effect.scoped` layer build, the `Schedule.spaced` cadence, the `never` error channel and the defect-ends-the-run behaviour are unchanged.
  - The sample is exactly the four fields the poll reads. With `questions` gone (D-11), the `{ ...reading, questions: undefined }` spread at `:252` goes and the sample is the `Effect.all` record itself.
  - Rejected: `Pick<…, "accept">`. No store type remains to pick from.
  - Rejected: an inline structural type. It would be unnamed at the feed and at three pin sites.
  - Rejected: turning the engine into a `Stream` the feed consumes. It would give the two engines two shapes, and `runSource` is the precedent the requirement names.
- **D-10: The sink the feed builds, per `start()`, keeps today's order.**
  1. `if (!runs.isCurrent(token)) return;`, before anything is read or folded (F33).
  2. Fold into the shown reading.
  3. `sampled = true`.
  4. Show `Live` (or keep a current `Live`), so an unchanged sample still marks `Live` (F19's "restart() over an unchanged world notifies twice").
  - `off()` becomes `runs.stop(); sampled = false; view.set(diagnosticsOff);`. `diagnosticsOff.reading` is `noDiagnostics`, so the reading resets by the constant and nothing is replaced.
  - `start()` keeps Phase 81's `try { show(Starting) } finally { runs.fork(...) }` exactly (ADR-QD-194), so no unguarded step returns. The fork's synchronous prefix may still reach `Live` or `Stopped` before `start` returns.
  - `onFailure` still shows `Stopped({ reason: causeMessage(cause), sampled })` with the reading kept.
  - `configure`, `restart`, `completeDiagnosticsOptions`, `idleDiagnostics`, `isUnsampled` and the two snapshot constants are unchanged.

### Area 3: `Diagnostics.questions` is removed (DIAG-03; Breaking)
- **D-11: Remove `questions` from `Diagnostics` and from `noDiagnostics`. Keep `DiagnosticsReading.questions`.**
  - The poll never samples it. Questions are the gates feed's input (ADR-QD-169), and the dock's join already reads a supplied list from `held.reading?.questions`, not from the reading.
  - After the removal, `Diagnostics` is exactly what the poll samples, which is what lets D-09 drop the manufactured `questions: undefined`.
  - `mergeReading` no longer carries a supplied reading's `questions`. Its doc comment and `DiagnosticsReading.questions`' comment say that a supplied reading's questions are read by the dock's join, beside the reading, and are not part of the merged reading.
  - The join's timing is unchanged, for two reasons. `shownReading`'s key is the feed's snapshot and `held.reading` by identity, so a supplied reading still moves the shown reading exactly when it did. And the join already reads `held.reading?.questions`, which is unchanged.
  - Rejected: keeping it and routing it through the shown reading. The join would then see new questions on the shown reading's publish instead of from its own key, which changes when the join sees them.
  - Rejected: keeping it as is. A public field the poll never writes, documented "`undefined` unless a supplied reading carries questions", is a second route to one value.
  - Rejected: dropping `DiagnosticsReading.questions` as well. ADR-QD-169 rejected that: a reading taken in another process brings its own questions.
- **D-12: It is pinned before it changes, and the pins can fail.**
  - Type pin in `Diagnostics.tst.ts`: `expect<Diagnostics>().type.not.toHaveProperty("questions")`, with its positive twin `expect<DiagnosticsReading>().type.toHaveProperty("questions")`. These are not `toBeCallableWith` pins, so `NOT_CALLABLE_PIN_BUDGET` does not move.
  - Value pins:
    - `"questions" in mergeReading(sample, { questions: [q] })` is false.
    - The dock model's `diagnostics` readout carries no `questions` key.
    - The Questions store still lists the supplied questions on the same `configure` publish.
  - Each is seen RED on the base, recorded in `83-RED-EVIDENCE.md`.
  - **Recorded flip.** `Diagnostics.test.ts`' two `mergeReading` cases "supplied questions win" and "absent questions fall through to the sample" become one case: "a supplied reading's questions are not part of the merged reading". The before and after text go in `83-RED-EVIDENCE.md` and in an ADR-QD-196 row.
- **D-13: One changeset, `.changeset/devtools-diagnostics-has-no-questions.md`, `"@qadi/devtools": minor`, opening "**Breaking.**".**
  - It names the removed field, says `DiagnosticsReading.questions` and the Questions tab are unchanged, and says where a reader of `reading.questions` reads instead: the `DiagnosticsReading` it supplied, or the model's `questions` store.
  - It mentions nothing package-private: the store, the sink and the rename are not a host's concern.
  - It is the phase's only changeset.
- **D-14: Plus, in the same plan as the removal:**
  - **The upgrade guide.** A `## 0.13: Diagnostics has no questions field` entry in `apps/website/src/content/docs/docs/reference/upgrading.md`, with a `ts` "before" fence and a compiled `typescript` "after" fence. The existing 0.13 note at ≈921 ("`DiagnosticsReading.questions` is unchanged") is checked against the new entry. The compiled fences that read `reading.hydration` (≈520-550) keep compiling.
  - **`spec/overview.md`'s rows.** The `Diagnostics` row says it carries what the poll samples, and the `mergeReading` row says it does not carry questions. All four rows that name `model/DiagnosticsStore.ts` (≈916-919) name `model/Diagnostics.ts` instead, in the rename commit (D-17).
  - **Gate 13.** `scripts/check-api-surface.mjs` prints the base count, because no export moves.
  - **Gate 14.** `check-package-install.mjs` gains `["Diagnostics", "questions"]` in `REFUSED_SHAPE_PROBES`, with a refused `Diagnostics` literal whose `questions` carries the `@ts-expect-error`, and an `expect` that the packed feed's live reading has no `questions` key. Gate 14 runs once, at the close.
  - The packages' READMEs and the website's devtools page are checked for a `reading.questions` reader. None was found at `b0b3cabc`.

### Area 4: Characterisation, the rename, registers and measurement (DIAG-01, DIAG-04)
- **D-15: The characterisation, `packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts`, written on the phase base.**
  - It is a table of transitions. Each row records the full publish sequence a listener sees: each publish's status tag, `sampled` when `Stopped`, and the reading's identity per field against the previous publish.
  - Rows:
    - bare `Off` by identity;
    - `configure({})` giving `Starting` then `Live`;
    - N identical samples publishing nothing after the first `Live`;
    - one field moving, so one publish where the other fields keep their references;
    - a stop after a sample (`sampled: true`, reading kept by identity);
    - a stop before any sample (`sampled: false`, the empty reading);
    - `restart()` over an unchanged world (`Starting`, then `Live` with the same reading reference);
    - `configure(undefined)` giving `Off` by identity, after which a stop before the next run's first sample is unsampled;
    - a superseded run's sample dropped by the token guard;
    - a fresh reading after `Off` and a new start.
  - A second describe pins the dock. With a supplied `reading` carrying `questions`, one `configure` publishes the shown reading once and the join once, and the Questions store lists the supplied questions. It does not assert `reading.questions`, which is the one behaviour this phase changes (D-12).
  - It imports nothing from the renamed module. It reaches the empty reading as `diagnosticsOff.reading` and the reading's type through `DiagnosticsSnapshot` or `DockModelInputs`, so its text is byte-identical from its commit to the close.
  - It is shown failing once under a scratch edit, for example dropping the `isCurrent` guard or the per-field keep.
- **D-16: Held tests pass unedited.**
  - F1-F33 in `DiagnosticsFeed.test.ts`: the roadmap says F1-F32, but F33, the stale-run guard, was added by Phase 81's `424ff7f7`. The unnumbered unrenderable-collector case is held as well.
  - `ConfigureFirstRender.characterisation.test.tsx`, byte for byte (it imports nothing from the module).
  - `DockModel.test.ts`, `DockModel.characterisation.test.ts` and `ConfigureRule.test.ts`.
  - `builtFeeds.ts` (in `packages/devtools/test/`, not `src/model/`): `diagnosticsFeedOf`'s body is unchanged because `makeDiagnosticsFeed`'s signature is unchanged. Its one edit is its `DiagnosticsOptions` import path. The 35 call sites (29 in `DiagnosticsFeed.test.ts`, 6 in `ConfigureRule.test.ts`) are untouched.
  - **The one declared exception:** an import specifier edit `./DiagnosticsStore.ts` to `./Diagnostics.ts` in the rename commit. It affects `DiagnosticsFeed.test.ts:28`, `DockModel.test.ts:50-51`, `ConfigureRule.test.ts:19`, `builtFeeds.ts:12` and the other importers.
  - `83-pinned-check.mjs` (D-20) enforces this. Each held file equals its base text with exactly that import edit reverted, and any other byte fails.
- **D-17: The rename is a pure commit, made first among the source commits and green on its own.**
  - `git mv` moves `src/model/DiagnosticsStore.ts` to `src/model/Diagnostics.ts`, `test/model/DiagnosticsStore.test.ts` to `test/model/Diagnostics.test.ts`, and `test/model/DiagnosticsStore.tst.ts` to `test/model/Diagnostics.tst.ts`. No identifier or behaviour changes, so `DiagnosticsStore` and `makeDiagnosticsStore` keep their names until D-08/D-09 delete them.
  - In the same commit, every importer's specifier moves: the barrels `src/index.ts` and `src/react/index.ts`, `DiagnosticsFeed.ts`, `DockModel.ts`, `GatesFeed.ts`, `PortCards.ts`, `DevtoolsDock.tsx`, `useDiagnostics.ts`, and the tests and fixtures.
  - Doc comments that name the file move too: `DiagnosticsFeed.ts:144`, `ExternalStore.ts:6`, `Gates.ts:39` and `useDiagnostics.test.tsx:6`.
  - Every register that names the files moves in the same commit:
    - `scripts/check-house-style.mjs:771`'s `NOT_CALLABLE_PIN_BUDGET` key;
    - AGENTS.md §6's table row (line 566);
    - `spec/traceability.md`'s two test-file rows (596-597; the roadmap's 579-580 has drifted) and the live source cells that name the file (the INV-QD-314, 366 and 384 rows);
    - the live spec text that names the paths (BEH-QD-617 ≈2461, BEH-QD-639/640 ≈2715-2716, INV-QD-314 ≈3833, INV-QD-366 ≈4335-4337);
    - `spec/overview.md` ≈916-919.
  - The spec edits go through `spec-revise` (CCR-QD-475).
  - Change history is exempt: CCR rows, Change History cells, `>` blockquotes and ADR decision text (an ADR is amended by a dated paragraph, never rewritten; D-22).
  - `83-check.mjs stale-path` refuses any other live mention of the three old paths after this commit.
  - Rejected: a re-export shim at the old path. It would be a second name for one module.
  - Rejected: renaming inside the refactor commit. That would make the rename's diff unreviewable and lose `git log --follow`.
  - Rejected: keeping the name. No store remains, so `DiagnosticsStore.ts` would name what the module no longer holds.
- **D-18: Commit order.**
  1. Scripts and the mutation base (D-23), before any test or source change.
  2. The characterisation (D-15).
  3. The pure rename (D-17).
  4. The RED pins for the removal (D-12).
  5. The removal with its changeset, upgrade entry, overview and gate-14 probe (D-11, D-13, D-14).
  6. `foldReading` with its value tests (D-05 to D-07).
  7. The feed and engine rewrite (D-08 to D-10).
  8. Records (D-22).
  9. The mutation close and the phase checks.
  - The removal comes before the fold so that the fold is written once, over the final four fields.
  - The planner may merge adjacent steps into one plan, but not reorder 1-3.
- **D-19: The three negative `Params<typeof runDiagnostics>` pins are rewritten to the sink parameter.**
  - A `declare const sink: DiagnosticsSink` replaces `declare const store: DiagnosticsStore`, so `callable: 3` holds under the new key, `packages/devtools/test/model/Diagnostics.tst.ts`.
  - The positive twin (`toBeCallableWith(sink, { intervalMillis: 500 })`) and the `toBe<Effect.Effect<void, never, never>>` pins follow.
  - No new negative callable pin is added. A pin refusing a wider object where the sink is asked for could never fail, because a structural one-member sink accepts any object with `accept` (ADR-QD-175: no pin that cannot fail).
- **D-20: Phase-local scripts mirror Phase 81's.**
  - **`83-check.mjs`** carries 81's modes: `base`, `commit`, `unchanged`, `seen-failing`, `scan-ids`, `scan-forbidden`, `trailers` and `--self-test`. Phase modes:
    - `no-store`: `src/model/**` declares no `DiagnosticsStore` or `makeDiagnosticsStore`; `DiagnosticsFeed.ts` holds one `makeExternalStore` call and no `marking`; `off()` assigns no store.
    - `single-fold`: the per-field keep-if-equal is written once, in `foldReading`, with `Equal.equals` in no other diagnostics source.
    - `stale-path`: D-17.
    - `registers`: the budget key, the AGENTS row and the traceability rows name files that exist, and they agree.
    - `GUARDED` admits exactly D-17's AGENTS.md and `check-house-style.mjs` edits.
  - **`83-pinned-check.mjs`** carries 81's flip, addition and edit model with a rename-aware base path, holding D-16's files.
  - **`83-mutation.mjs`** carries 81's removed-mutant rule, with a rename map `{ DiagnosticsStore.ts → Diagnostics.ts }`. It maps lines through `git diff -M -U0` of the pair.
  - **Phase 81's own checks**, `81-pinned-check.mjs` among them, hold `DiagnosticsFeed.test.ts`, `DockModel.test.ts` and `ConfigureRule.test.ts`. They are re-run from a scratch copy with the rename's import edits declared, never by editing Phase 81's directory. The archived v1.9 checks are handled the same way where they hold a touched file. Invocations and results go in the phase evidence.
  - Each script is shown failing once, and each self-test plants the failure it guards.
- **D-21: `surface.tst.ts`.**
  - The existing "no exported member" pins for `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics` and `type DiagnosticsStore` stay. They still hold, and they refuse a reintroduction under those names.
  - New pins refuse `foldReading` and `type DiagnosticsSink` from the root.
  - A pin that `Diagnostics` has no `questions` goes through the root's type, with its positive twin on `DiagnosticsReading`.
- **D-22: Records.**
  - **ADR-QD-196 (new), "The diagnostics feed folds its reading as a value".** It records:
    - the fold and its law (D-06);
    - the reading held in the one snapshot (D-08);
    - the sink (D-09);
    - the guard order (D-10);
    - the removal and its timing argument (D-11);
    - the flip (D-12);
    - the rename (D-17);
    - every rejected alternative above.
  - **Amendments, dated paragraphs, past text kept:**
    - ADR-QD-173: decision 2, because `makeDiagnosticsStore` and the `DiagnosticsStore` type no longer exist and `runDiagnostics` is the engine with a sink; decision 3, because `DiagnosticsOptions` is declared in `Diagnostics.ts`.
    - ADR-QD-169 decision 10: `Diagnostics.questions` is no longer kept, and `DiagnosticsReading.questions` is.
    - ADR-QD-047: a one-line pointer where its live amendments name `DiagnosticsStore`, if the gate-10 cross-reference check requires it (planner checks).
  - **BEH-QD-751..755** in `spec/behaviors/28-devtools-screens.md`:
    - 751: each accepted sample is folded by one pure per-field keep-if-equal function, and N identical samples publish nothing after the first.
    - 752: the poll writes through an `accept` sink; the feed's sink drops a superseded run's sample before the fold, marks `sampled`, and marks `Live` on an unchanged sample.
    - 753: `Off` resets the reading and `sampled` by the empty constant.
    - 754: `Diagnostics` carries only what the poll samples; a supplied reading's questions reach the dock's join, not the merged reading, on the same publish as before.
    - 755: the feed's status and reading transitions are the closed table D-15 pins.
  - **Restated:** BEH-QD-323 (where its mechanism names the store), BEH-QD-617 (≈2456, "`Diagnostics.questions` … stay"), BEH-QD-637, BEH-QD-639, BEH-QD-640 (its requirement lists names that now do not exist), and BEH-QD-699 where its shown-reading text names `questions`.
  - **INV-QD-411:** the diagnostics reading changes identity only when some field fails `Equal.equals` against the previous one, and an equal field keeps its reference, by one fold.
  - **INV-QD-412:** the public `Diagnostics` holds exactly the fields the poll samples.
  - **Amended:** INV-QD-314 (`mergeReading` in `Diagnostics.ts`, no questions) and INV-QD-366 (`DiagnosticsOptions` declared in `Diagnostics.ts`).
  - **Also updated:**
    - traceability rows for every new and amended id and the new test files;
    - `spec/README.md`'s CCR-QD-475 row;
    - `spec/decisions/index.yaml`;
    - the packages' READMEs and the website devtools page, where they describe the reading's fields.
- **D-23: Mutation is measured like Phase 81's.**
  - The base is recorded on the phase base with a clean tree, before any test or source edit, over `stryker.devtools.mjs --mutate` of `DiagnosticsFeed.ts`, `DiagnosticsStore.ts` and `DockModel.ts`. It goes in `83-mutation-base.json`.
  - The close goes in `83-mutation-close.json`, over `DiagnosticsFeed.ts`, `Diagnostics.ts` (base mapped from `DiagnosticsStore.ts`) and `DockModel.ts`. `DockModel.ts` is touched only by its import path, but it is measured anyway.
  - The rule:
    - A score may fall only because killed mutants were deleted (`makeDiagnosticsStore` and the `&&` chain go).
    - No new Survived, NoCoverage or Ignored mutant.
    - New literals stay inside function bodies.
    - The absolute bar is no open mutant in the two diagnostics files.
  - The close is re-taken after the review fixes.
  - ADR-QD-169's "60/60" for `DiagnosticsStore.ts` is not relied on, because the base re-measures it.
- **D-24: Gates.**
  - `pnpm check:pr < /dev/null` is green at the close and again after the review fixes (WX-01).
  - `pnpm spec:verify:strict` and `pnpm spec:package` pass.
  - Gate 12 (`check-devtools-claims.mjs`) stays clean. `spec/devtools-spec/` names no `DiagnosticsStore` today.
  - Coverage holds at 90% or more for devtools (WX-05).

### Claude's Discretion
- The exact names `foldReading` and `DiagnosticsSink` may change if a clearer pair emerges in planning. They must stay a named pure function and a named one-member sink, both out of the barrels.
- Whether `show` takes `(status, reading)` or the sink calls a second small helper, provided one transition is still one publish and `show`'s unchanged-pair drop is kept.
- The characterisation's row ids, its fixture helpers, and whether the dock describe lives in the same file or a sibling characterisation file. Either way it imports nothing from the renamed module.
- How plans group D-18's steps, provided steps 1-3 keep their order and each commit is green.
- The wording of the changeset and the upgrade entry, provided the changeset opens "**Breaking.**".
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExternalStore.ts`:
  - `sameFields`, per-field identity over own fields. Its doc already describes it as the one rule for "did something move", so it is the fold's identity check.
  - `makeExternalStore`, whose `set` drops an identical value, and `callAll`.
- `TimelineStore.ts:115` `runSource(store: Pick<TimelineStore, "accept">, …)` and `TimelineFeed.ts:175-185`'s `marking` sink: the engine-takes-a-sink precedent.
- `SupersedingRun.ts`: `begin`/`isCurrent`/`fork`/`stop`/`closed`, unchanged.
- Phase 81's scripts are the templates for D-20: `81-check.mjs`, `81-pinned-check.mjs` (whose flip, addition and edit model already supports an import-line edit), `81-mutation.mjs` (the removed-mutant rule, line mapping by `git diff -U0`) and `81-archived-checks.mjs`.
- Test helpers: `test/builtFeeds.ts` (`diagnosticsFeedOf`, `dockModelOf`), `test/collectorDouble.ts` (`makeCollectorDouble`) and `test/helpers.ts` (`settleTurns`, `thrownBy`, `hostile`).

### Established Patterns
- The feeds take inputs only through `configure`, with one per-field rule (ADR-QD-192). The dock's `configure` runs its steps through `callAll` (ADR-QD-194).
- Publish-then-fork is `try { publish } finally { fork }` at every such site (Phase 81 D-09).
- A package-private module stays out of the barrels, and `surface.tst.ts` pins each such name as "no exported member" (ADR-QD-099, ADR-QD-173).
- Negative type pins on Effect-returning functions go through `Params<…>` with a positive twin (ADR-QD-175, AGENTS.md §6).
- Run tests from the repo root: `pnpm exec vitest run --project devtools <file> < /dev/null`. Stryker runs alone with stdin closed.

### Integration Points
- `packages/devtools/src/model/DiagnosticsStore.ts` (renamed to `Diagnostics.ts`): the store at 146-189 is deleted, `runDiagnostics` (238-260) changes, `mergeReading` (132-144) changes, `Diagnostics` and `noDiagnostics` (76-97) change.
- `packages/devtools/src/model/DiagnosticsFeed.ts`: `makeDiagnosticsFeed` (163-232); `marking` and `off()` go.
- `packages/devtools/src/model/DockModel.ts`: the import (52-56) and the join's key (≈381-393, unchanged).
- Barrels: `src/index.ts:31-40` and `src/react/index.ts:21`.
- `packages/devtools/test/surface.tst.ts:240-265`.
- `scripts/check-house-style.mjs:771`.
- AGENTS.md §6 (line 566).
- `scripts/check-package-install.mjs`: `REFUSED_SHAPE_PROBES` (≈124) and the diagnostics probe (≈733-760).
- `spec/overview.md` ≈916-919.
- `spec/traceability.md` 168, 208, 217, 596-597.
- `spec/behaviors/28-devtools-screens.md` (BEH-QD-323 ≈643, 617 ≈2435, 637 ≈2593, 639 ≈2687, 640 ≈2718, 699 ≈2930).
- `spec/invariants.md` (INV-QD-314 ≈3829, 366 ≈4335).
- ADR-QD-173, ADR-QD-169 (decision 10 at line 68).
- `apps/website/src/content/docs/docs/reference/upgrading.md` (0.13 sections; ≈921).
</code_context>

<specifics>
## Specific Ideas

- `83-RED-EVIDENCE.md` holds, verbatim:
  - the base run of D-12's pins: the tstyche failure on `not.toHaveProperty("questions")` and the vitest failures on the `in` checks;
  - the characterisation's green base run and its one scratch-edit failure;
  - each check script's planted failure;
  - the flip's before and after text.
- The ADR's timing paragraph quotes the `shownReading` key (`fed`, `supplied` by identity) and the join's key (`held.reading?.questions`) as they read at the phase base, so the "timing unchanged" claim is checkable from the record.
- The phase base is the head when the first plan commit lands, recorded by `83-check.mjs base` as in Phase 81. At discuss time that head is `b0b3cabc`.
</specifics>

<deferred>
## Deferred Ideas

- Giving `runSource` a named sink type in place of `Pick<TimelineStore, "accept">`, for symmetry with `DiagnosticsSink`. It touches the timeline engine, which this phase does not, so it is noted for a later wave.
- Deriving `sampled` from the reading, instead of the flag. Rejected for now: the flag is required by the roadmap, and coupling "has a sample" to `hydration !== undefined` would rest on an incidental fact of the reads.
- Phase 84's items (`useConfigured`, `useLens`, the `DockFrame` duplicates and `useTimeline`'s record) stay in Phase 84. Phase 83 only moves the `useDiagnostics.ts` and `DevtoolsDock.tsx` import paths that Phase 84 then edits.
</deferred>
