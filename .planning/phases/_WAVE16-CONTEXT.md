# Wave 16 (v1.11): shared context for Phases 85–91

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and the
XC-05 mutation procedure all apply. **This file overrides only what it names:** the source, the base commit, the
numbering, the decisions and the per-phase evidence below.

**Source:** the 2026-11-25 architecture review,
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/b04729bd-9815-4720-957d-3637602848ac/scratchpad/architecture-review-20261125.html`
(session-scoped, outside the repo; it may be gone). Two read-only explorers walked the files most often changed across
the last six milestone merges (devtools model/react; core ports, react hydration/provider, audit). Four researchers then
wrote `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY). **SUMMARY.md is the planner's primary
input**: its per-phase Delivers/Avoids, the fold-verdict table and "Where the researchers disagree" are binding context.
The milestone resolves all seven candidates, by a change or by a recorded decision.

**Base commit:** the head of `arch-wave-16`, off `main` at `ac7578f3` (v1.9 and v1.10 merged as #165). Each phase's base
is its first commit's parent; that rule is unchanged from `_SHARED-CONTEXT.md`.

## Decisions (2026-11-25; locked)
- **D1 (scope, owner):** all seven review candidates become phases (85–91).
- **D2 (Phase 91 folds, owner):** fold a visibility-only file, including an ADR-QD-037 cycle-breaker, only where
  `pnpm circular` proves no cycle returns; amend ADR-QD-037 and remove the PROJECT.md Out of Scope line it supersedes.
- **D3 (research, owner):** run; `.planning/research/` is this wave's research.
- **D4 (order):** 85 → 91, strictly serial. 85 before 88 (both edit `DevtoolsDock.tsx` ≈110–115, 258); 87 before 88
  (88 keys on the status identity 87 keeps); 86, 89 and 90 before 91 (91 edits `QadiProvider.tsx` imports, folds
  `SequenceIntegrity` into `ArchiveFacts`, and names every export 89/90 settle).
- **D5 (branch):** `arch-wave-16` off `main` at `ac7578f3`. No merge, no push, no release.
- **D6 (grey areas):** every other choice is decided at its phase's discuss step under the owner's standing
  instruction (take the most complete, clean design; breaking changes are fine with a **Breaking** changeset and an
  upgrade-guide entry) and recorded there as decided, with the rejected options.

Grey areas for each phase's discuss step (the researchers disagree or the spec is silent; full text in SUMMARY.md):
- **Phase 85:** the view's home (own derived store, the model's eleventh store, vs riding an existing one); `DockFrame`'s
  status read (selector on `useStoreSnapshot`, precedent `usePaused`, vs a status store); the view's input shape
  (`{hydration, unsampled}` vs the view taking `status`). **Also decide the wave-wide changeset policy** (a patch per
  edited public package vs none for package-private moves; WX-03) and apply it to every later phase.
- **Phase 86:** one commit effect vs three ordered effects; where `AtomsReplaced` identity detection lives (owner vs
  component; reporting stays in the component). Tie-break: LT6, LT8, LT13, LT16–LT18 stay green unedited.
- **Phase 87:** the feeds' self-interrupt policy (today a self-interrupted timeline/diagnostics run keeps `Reading`/
  `Live` with nothing running; BEH-QD-519 is silent); whether `restart` on a bare timeline feed stays an empty read;
  rendering `Broke.message` in the `<pre>` treatment `Stopped.reason` has.
- **Phase 88:** relocate the render-phase ref read into the wrapper (recommended) vs remove it (key from a React-held
  value or a per-feed model store).
- **Phase 89:** an admitted-rows brand plus admission before the `qadi.audit.verifySequenceIntegrity` span vs a plain
  refusal-or-undefined function with spans unchanged (tie-break: spans unchanged unless the change is pinned and
  recorded).
- **Phase 90:** which of span name, serving shape and fixture type move onto the description (decided by plan 1's
  spike); a pairwise-distinct span-name type check to replace `PortSpanOf<N>`'s cross-check.
- **Phase 91:** `Hydration.ts`: a structural `hydrateDecisions` parameter declared in the engine (folds; a public
  `.d.ts` change with a changeset line) vs keep the file and record the cycle; `EvaluationSpan` stays apart unless
  `pnpm circular` proves the fold.

## Execution order
Phases run strictly one at a time, in numeric order (85 → 91): every records plan edits the same spec registers, and
`use_worktrees` is false. Phases 87, 90 and 91 open with a spike or research plan (SUMMARY "Research Flags").

## Numbering reserved for v1.11
Next free on `ac7578f3`: ADR-QD-198, CCR-QD-477, BEH-QD-761, INV-QD-415. The highest ARCH id in use is ARCH-131
(ARCH-132…138 are this wave's).

**The whole block below is reserved** in the shared reservation file
(`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`), set to CCR 483, ADR 204, BEH 795, INV 428 on 2026-11-25.
- **Never run `node scripts/next-id.mjs` while executing these phases**: every call writes a reservation.
- If a reservation goes unused, name it in the phase's CCR row ("Unused: …"). A phase that needs no new ADR (an amendment
  of an existing one suffices) leaves its ADR number unused and says so.
- Pass `--date 2026-11-25` (or the real date of the edit) to `spec-revise`.

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 85 | 132 | 198 | 477 | 761–765 | 415–416 |
| 86 | 133 | 199 | 478 | 766–770 | 417–418 |
| 87 | 134 | 200 | 479 | 771–775 | 419–420 |
| 88 | 135 | 201 | 480 | 776–780 | 421–422 |
| 89 | 136 | 202 | 481 | 781–785 | 423–424 |
| 90 | 137 | 203 | 482 | 786–790 | 425–426 |
| 91 | 138 | 204 | 483 | 791–795 | 427–428 |

ADR Document IDs must equal the file number (gate 10).

## Per-phase evidence (from the review; verified against `ac7578f3`)

### Phase 85 (ARCH-132, devtools)
- `packages/devtools/src/react/QuestionsPanel.tsx:112` calls `isUnsampled(diagnostics.status)`; `Hydration` 346–368 and
  `Counts` 371–420 decide Pending / Unwired / Counts and work out the rate sentence, the raised-drops filter and the
  unaccounted scope text.
- `packages/devtools/src/model/DockModel.ts` 383–409: the questions store keys `unsampled: supplied === undefined &&
  isUnsampled(status)` (≈391); the services store keys `unsampled: isUnsampled(status)` (≈405).
- `packages/devtools/src/react/DevtoolsDock.tsx:112` subscribes `DockFrame` to the merged diagnostics snapshot; `:258`
  passes `shown.hydration` to one tab. INV-QD-411 keeps the reading's identity when nothing moved.
- Precedent: `PortCards.ts` / ADR-QD-168. Store-name pins: `ConfigureRule.test.ts:583`, `DockModel.listeners.test.ts:64`.

### Phase 86 (ARCH-133, react)
- `packages/react/src/QadiProvider.tsx` (359 lines; refs ≈228, 259, 269, 314; seven effect hooks); `RegistryLease.ts`
  (85 lines, pure, injected `defer`, in `stryker.react.mjs`). ADR-QD-195's context lists the bugs that lived in the
  wiring (a second registry built while hidden; a disposed registry on reveal).

### Phase 87 (ARCH-134, devtools)
- Near-copies: status union with `Stopped{causeMessage}` (TimelineFeed 39–51 / DiagnosticsFeed 44–61); readout + the
  ADR-QD-194 rethrow paragraph (TF 62–73 / DF 97–111); idle readouts (TF 138–153 / DF 122–137); token-guarded sink
  (TF 175–180 / DF 186–199); publish-then-fork (TF 182–188 / DF 202–212 / SimulationSession 446–453); closed-guarded
  restart (TF 192–194 / DF 231–233); configure prologue (TF 199–205 / DF 221–226 / GatesFeed 280–286).
- `SimulationSession.ts:418`: `run = { _tag: "Broke", question, message: String(exit.cause) }`.
- Build-then-configure written five times: `test/builtFeeds.ts` 16–28 (×4) and `useConfigured.ts:34`.

### Phase 88 (ARCH-135, devtools)
- `StoppedBox.tsx` `stoppedKey` 48–50, ledger write in the layout effect 130–134; callers `TimelineNotice.tsx:33`,
  `DiagnosticsNotice.tsx:85`; ref in `useStopNotice.ts`; both notices thread `announced` through a private `Binding`.

### Phase 89 (ARCH-136, audit)
- `ArchiveFacts.ts:139` (`ArchiveInputRefusal.NowNotFinite`), `Retention.ts:49` (`RetentionInputRefusal`),
  `AuditArchive.ts:185`; `test/ForeignRows.test.ts` (468 lines) re-tests the order per entry point. Check order is
  BEH-QD-722; row refusals are shared through `RowsRefusalCases` (ADR-QD-190).

### Phase 90 (ARCH-137, core)
- Per-port tables: `PortName.ts` (`PortSpans`), `Ports.ts` (`PortTypes`, `PORTS`, `PortFixtureData`, `PORT_FIXTURES`),
  `PortServing.ts`, `PortMetrics.ts` (`PredicatePortName`), `PortAccess.ts` ≈222–247 (`ScopedPort`, `completeRequest`),
  ≈397 and ≈496 (`isResourceScoped(leaf) ? readScoped : readPort`). `LEAF_NEEDS.resourceId` is read only by
  `LeafNeeds.test.ts:137` (ADR-QD-163 D-06).

### Phase 91 (ARCH-138, core / react / audit)
- Visibility-only files: core `PortSpanDecode.ts` (26), `PortInterpreter.ts` (21); react `Hydration.ts` (95, forwards
  to `dehydrateWith` / `atoms.hydrate`), `GateRegistry.ts` (60, wraps `buildGateRegistry`); audit
  `SequenceIntegrity.ts` (26, re-exports from `ArchiveFacts.ts`). Fold verdicts: SUMMARY.md's table.
- Gate couplings: `scripts/check-house-style.mjs` `devtools-named-barrel` (≈2171–2198), `SPAN_KEY_SHARED`,
  `UNTRUSTED_DECODE_BUDGET` (row `PortSpanEncode.ts`), AGENTS.md §7a, §9, §16.
