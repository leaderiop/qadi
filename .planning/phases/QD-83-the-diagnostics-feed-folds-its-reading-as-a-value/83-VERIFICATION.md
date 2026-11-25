---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
verified: 2026-11-25T00:00:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .changeset/devtools-diagnostics-has-no-questions.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-01-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-01-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-02-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-02-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-03-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-03-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-04-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-04-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-05-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-05-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-06-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-06-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-07-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-07-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-08-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-08-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-09-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-09-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-10-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-10-SUMMARY.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-11-PLAN.md
  - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-11-SUMMARY.md
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/Diagnostics.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/test/model/Diagnostics.tst.ts
  - packages/devtools/test/surface.tst.ts
  - scripts/check-package-install.mjs
covered_digest: "v4:sha256:db629eff5f60adb4f1a99cc0bd9839f3edf34091badbfeb7c33c61ae9afc5877"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 83: The diagnostics feed folds its reading as a value - Verification Report

**Phase Goal:** The diagnostics feed holds its reading as a value folded by one pure per-field keep-if-equal function, so the package-private store nothing subscribes to, its `marking` wrapper and the store replacement in `off()` are gone, `runDiagnostics` takes an `accept` sink as `runSource` does, and the never-written `Diagnostics.questions` is resolved.
**Verified:** 2026-11-25
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A characterisation test written on the phase base, green there and after, pins every status and reading transition of the feed (Off, Starting, Live, Stopped, per-field identity kept on a repeated sample, the `isCurrent` token guard, the `sampled` flag), so the rewrite changes no observable behaviour except the one the phase names | VERIFIED | `DiagnosticsFeed.characterisation.test.ts` FC1 to FC11: Off by identity (FC1), Starting then Live with the first sample folded (FC2), identical samples publish nothing (FC3), one field moving keeps the others' references (FC4), stop after a sample is `sampled` and keeps the reading object (FC5), stop before any sample is unsampled (FC6), restart (FC7), `configure(undefined)` (FC8), superseded run's sample dropped (FC9), start after Off folds into the empty reading (FC10), supplied questions reach the join (FC11). Git order: the file is born in `7b81f71b`, before the rename `77247c8f`, the `questions` removal `6cb3e499`, `foldReading` `97af1461` and the feed rewrite `16273275`. `node 83-pinned-check.mjs --all-applied` (run by me): "6 files hold their base text, 2 of 2 born files held, 1 of 1 declared flips applied" (the one flip is `F2`, the declared `questions` change). `83-RED-EVIDENCE.md` records each FC row seen failing under a scratch edit; the review-fix tests (`WR-01`, `WR-02`) are recorded failing first in `83-REVIEW-FIX.md`. `DiagnosticsFeed.superseded.test.ts` SR1 pins that a superseded run's sample does not set `sampled` (WR-02). I ran the five diagnostics test files: 5 files, 77 tests passed. |
| 2 | The feed holds its reading as a value updated by one pure per-field keep-if-equal function with value tests (returns the previous reading itself when no field moved; N identical samples publish nothing after the first); the package-private store, its `marking` wrapper and the store replacement in `off()` are gone; `runDiagnostics` takes an `accept` sink as `runSource` does | VERIFIED | `Diagnostics.ts`: `foldReading(previous, next)` builds an object literal naming all four fields through `keep` (`Equal.equals`), returns `previous` itself when `sameFields(folded, previous)`; reads no clock or closure. `DiagnosticsSink { accept }` is the `runSource` shape; `runDiagnostics(sink, options?)` ends in `Effect.tap(... sink.accept(reading))`. `DiagnosticsFeed.ts`: the reading lives only in the one `view` snapshot (`makeExternalStore<DiagnosticsSnapshot>`); `start` builds the sink with `runs.isCurrent(token)` before the fold, sets `sampled`, marks `Live` on an unchanged sample; `off()` is `runs.stop(); sampled = false; view.set(diagnosticsOff)` with no store replaced. `grep` for `DiagnosticsStore`, `makeDiagnosticsStore` and the `marking` wrapper across `packages/*/src`, `scripts`, `AGENTS.md`, `spec/traceability.md` and `apps`: none for the diagnostics module (the only `marking` hits are `TimelineFeed.ts`'s own `Pick<TimelineStore, "accept">` and two unrelated comments). `83-check.mjs no-store` ("the reading is held in the feed's one snapshot") and `single-fold` ("one per-field keep-if-equal, in foldReading") pass. Value tests: `Diagnostics.test.ts` "foldReading" describe, line 69 onward (returns `previous` itself for an equal sample, keeps references of unmoved fields, N identical samples). `83-06` and `83-07` also pinned that the root barrel does not export `foldReading` or `DiagnosticsSink` (`972fa4a8`, `e265bc83`). |
| 3 | `Diagnostics.questions` is removed from the public `Diagnostics` type (kept on `DiagnosticsReading`, which the dock join reads, so the join's timing is unchanged), shown by a type pin that can fail with its positive twin, with a `@qadi/devtools` changeset marked **Breaking**, a `0.13` upgrade-guide entry, `spec/overview.md`, gate 13 and gate 14 in the same plan | VERIFIED | `Diagnostics` has exactly `wiring`, `activity`, `hydration`, `portCalls`; `DiagnosticsReading` keeps `questions?`; `DockModel.ts` still reads `held.reading?.questions` (diff of `DockModel.ts` against the phase base is the import path and a doc comment only). Pins: `Diagnostics.tst.ts` "the reading carries no questions field" with the twin "a supplied reading carries its questions"; `surface.tst.ts` pins `keyof Diagnostics` as exactly the four names and `DiagnosticsReading` having `questions`. `DockModel.reading.test.ts` MR1, MR2 pin the join. `.changeset/devtools-diagnostics-has-no-questions.md` is `"@qadi/devtools": minor` and opens with **Breaking.** (unconsumed). `apps/website/.../reference/upgrading.md` gained 35 lines, the `0.13` entry; `spec/overview.md` revision 1.145; `scripts/check-package-install.mjs` gate 14 probe adds an exports row `["Diagnostics", "questions"]`, a runtime `"questions" in after.reading === false` assertion and a `@ts-expect-error` compile probe. Type tests: `node scripts/run-tstyche.mjs` (run by me), 77 files, 419 tests passed, 2 skipped (the tool-characterisation blocks that skip by design). Gate 13 (api-surface 942) and gate 14 (`spec:package` exit 0) are the orchestrator's facts at 13763f9f, source identical at HEAD. |
| 4 | A renamed module and its tests keep every register that names them in step (`spec/traceability.md`, AGENTS.md section 6's `NOT_CALLABLE_PIN_BUDGET` table and `scripts/check-house-style.mjs`'s budget, edited together), gate 12 stays clean, and ADR-QD-196 records the change, amending ADR-QD-173 | VERIFIED | `git diff --stat` shows `DiagnosticsStore.ts => Diagnostics.ts`, `DiagnosticsStore.test.ts => Diagnostics.test.ts`, `DiagnosticsStore.tst.ts => Diagnostics.tst.ts`. `AGENTS.md:566`, `scripts/check-house-style.mjs:771` (`callable: 3, constructable: 0`) and `spec/traceability.md:610` name `packages/devtools/test/model/Diagnostics.tst.ts` alike; `83-check.mjs registers` passes and `stale-path` ("no live mention of the three old paths") passes. `spec/decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md` (203 lines) is in `spec/decisions/index.yaml`, with dated amendments of ADR-QD-173, ADR-QD-169 and ADR-QD-047 (the 169 and 173 amendments are named in the roadmap goal). BEH-QD-751 to 755 in `spec/behaviors/28-devtools-screens.md`, INV-QD-411 and 412 in `spec/invariants.md`, traceability rows for each, `INV-QD-366` amended, CCR-QD-475 in `spec/README.md`. Gate 12 (`spec:claims`) is part of the orchestrator's `check:pr` exit 0. |

**Score:** 4/4 truths verified (0 behavior-unverified: every state-transition truth has a passing named test, FC and SR ids above).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/devtools/src/model/Diagnostics.ts` | reading, `foldReading`, `DiagnosticsSink`, `runDiagnostics` | VERIFIED | 270 lines, substantive, wired from `DiagnosticsFeed.ts`, `DockModel.ts`, `GatesFeed.ts`, `PortCards.ts`, `useDiagnostics.ts`, `DevtoolsDock.tsx`, the barrels; `foldReading` and `DiagnosticsSink` are not in `src/index.ts`. |
| `packages/devtools/src/model/DiagnosticsFeed.ts` | feed on one snapshot, sink | VERIFIED | 236 lines; one `view` store; no replaced store. |
| `packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts` | FC1 to FC11 | VERIFIED | 299 lines, passes. |
| `packages/devtools/test/model/DiagnosticsFeed.superseded.test.ts` | SR1 | VERIFIED | 61 lines, passes. |
| `packages/devtools/test/model/Diagnostics.test.ts` / `Diagnostics.tst.ts` | value tests, pins | VERIFIED | Renamed; pass. |
| `packages/devtools/test/model/DockModel.reading.test.ts` | join timing MR1, MR2 | VERIFIED | Passes. |
| `.changeset/devtools-diagnostics-has-no-questions.md` | Breaking minor | VERIFIED | Present, unconsumed. |
| `83-mutation-base.json`, `83-mutation-close.json` | same invocation at base and close | VERIFIED | `node 83-mutation.mjs compare` (run by me), below. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `DiagnosticsFeed.start` | `runDiagnostics` | `runs.fork(token, runDiagnostics(sink, next), ...)` | WIRED |
| sink `accept` | `foldReading` then `show` | `runs.isCurrent(token)` guard first, then fold, `sampled = true`, `Live` mark | WIRED |
| `DiagnosticsFeed.start` | `Starting` publish | `try { show(Starting) } finally { runs.fork(...) }`, so a throwing listener on `Starting` cannot leave the poll unforked (kept from the earlier collect-and-rethrow phase) | WIRED |
| dock join | supplied `reading.questions` | `held.reading?.questions` in `DockModel.ts`, unchanged | WIRED |
| gate 14 probe | `Diagnostics` shape | `scripts/check-package-install.mjs` | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `DiagnosticsFeed` snapshot | `reading` | `Effect.all({wiring, activity, hydration, portCalls})` sampled in `runDiagnostics`, folded by `foldReading` | Yes (FC2, FC4 read real folded samples through `getSnapshot`) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| diagnostics tests | `pnpm exec vitest run --project devtools <Diagnostics.test, DiagnosticsFeed.characterisation, .superseded, DiagnosticsFeed.test, DockModel.reading> < /dev/null` | 5 files, 77 tests passed | PASS |
| typecheck | `pnpm exec tsc -p tsconfig.test.json --noEmit < /dev/null` | no output, exit clean | PASS |
| type tests | `node scripts/run-tstyche.mjs < /dev/null` | 77 files, 419 passed, 2 skipped by design | PASS |
| no store | `node 83-check.mjs no-store` | the reading is held in the feed's one snapshot | PASS |
| one fold | `node 83-check.mjs single-fold` | one per-field keep-if-equal, in foldReading | PASS |
| stale paths | `node 83-check.mjs stale-path` | no live mention of the three old paths | PASS |
| registers | `node 83-check.mjs registers` | `Diagnostics.tst.ts` named alike by the budget, AGENTS.md and traceability | PASS |
| ids and phase wording | `node 83-check.mjs scan-ids` | none in added lines | PASS |
| forbidden forms | `node 83-check.mjs scan-forbidden` | none in added lines | PASS |
| trailers (phase's own scan) | `node 83-check.mjs trailers` | 31 plan commits, each with one Claude trailer | PASS |
| pinned tests | `node 83-pinned-check.mjs --all-applied` | 6 files hold base text, 2 of 2 born files held, 1 of 1 flips applied | PASS |
| mutation compare | `node 83-mutation.mjs compare` | exit 0 (below) | PASS |
| earlier phases' checks | `node 83-earlier-checks.mjs` | 81 and 80 checks exit 0; `79-pinned-check.mjs` exit 1 on `TF29` only, the recorded flip the script itself expects | PASS |

Mutation, same invocation at base and close: `DiagnosticsFeed.ts` 60/60 to 59/59, survived 0 to 0, no coverage 0 to 0, ignored 14 to 14 (0 new); `Diagnostics.ts` (was `DiagnosticsStore.ts`) 57/57 to 32/32, survived 0, ignored 6 to 6 (0 new); `DockModel.ts` 65/65 to 65/65, ignored 12 to 12 (0 new). Every score that fell lost only killed mutants (the removed store and `marking` code); no open mutant, no new Ignored. The roadmap's "60/60 at ADR-QD-169" for the store is the old figure; the base file records 57/57 at this phase's base.

Accepted from the orchestrator, measured at 13763f9f (source, tests, spec, scripts and changeset identical at HEAD; `git diff` after that commit is `.planning/` only): `pnpm check:pr < /dev/null` exit 0 (17 of 18 steps, mutation skipped by design; 6628 unit tests, BDD 568, examples 43, strict traceability PASS 21 FAIL 0, api-surface 942); `pnpm spec:package` exit 0 (9 packages, 527 runtime exports); Stryker close re-taken at the review-fixed tree. I did not re-run those, nor Stryker itself.

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh`; its record scripts are run above.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| DIAG-01 | 83-03 | SATISFIED | Truth 1 (FC1 to FC11, born before any change, each seen failing) |
| DIAG-02 | 83-06, 83-07 | SATISFIED | Truth 2 |
| DIAG-03 | 83-05 | SATISFIED | Truth 3 (removed, Breaking changeset, upgrade entry, overview, gate 14) |
| DIAG-04 | 83-04, 83-08, 83-09 | SATISFIED | Truth 4 (registers, ADR-QD-196, BEH 751 to 755, INV 411 to 412, CCR-QD-475) |
| WX-01 | 83-11 | SATISFIED (orchestrator-measured) | `check:pr` exit 0 at 13763f9f, `.planning/` only since |
| WX-02 | 83-08, 83-09 | SATISFIED | Only reserved ids (ADR-QD-196, CCR-QD-475, BEH-QD-751 to 755, INV-QD-411 to 412); `scan-ids` clean; `next-id.mjs` not used |
| WX-03 | 83-05, 83-11 | SATISFIED | `spec/overview.md` updated, api-surface 942, `spec:package` exit 0, gate 14 probes `Diagnostics` |
| WX-04 | 83-06, 83-07 | SATISFIED | `scan-forbidden` clean on added lines; the feed's `let held` and `let sampled` are function-scoped, not module scope; the only `AGENTS.md` change is the renamed budget row (matched in `check-house-style.mjs`) |
| WX-05 | 83-10 | SATISFIED | Mutation compare above; coverage gate runs inside `check:pr` (orchestrator) |
| WX-06 | 83-03, 83-10 | SATISFIED | Characterisation first; `83-RED-EVIDENCE.md`; review-fix tests seen failing |
| WX-07 | 83-11 | SATISFIED | See release checks below |

No orphaned requirement: DIAG-01..04 and WX-01..07 are all claimed by the plans, the roadmap and `REQUIREMENTS.md` (all ticked, traceability table "Complete").

### Commit, Release and Push Checks

| Check | Command | Result |
|-------|---------|--------|
| Trailer on every commit | `git log --format=%h bc02e8e6..HEAD`, count `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and any `co-authored-by` per commit | 45 commits at HEAD (43 plus the later validation and security records), each with exactly one trailer, none with a second `Co-Authored-By` line |
| No tag | `git tag --contains bc02e8e6` | empty |
| No remote branch | `git branch -r --contains bc02e8e6`; `git branch -a --contains HEAD` | no remote-tracking branches; only local `arch-wave-15` contains HEAD |
| No version or changelog change | `git diff --stat bc02e8e6..HEAD -- CHANGELOG.md '**/CHANGELOG.md' '**/package.json' package.json` | empty |
| Changeset unconsumed | `.changeset/devtools-diagnostics-has-no-questions.md` present, one commit adds it (`6cb3e499`) | present, unconsumed |

### Anti-Patterns Found

None in the added lines (`scan-forbidden`, `scan-ids`). No `TBD`, `FIXME` or `XXX` in `Diagnostics.ts` or `DiagnosticsFeed.ts` (read in full). Review: `83-REVIEW-DISPOSITION.md` has 7 findings, 5 fixed, 2 info skipped with reasons (IN-02, IN-03), 0 open; the fixes carry their own tests.

### Human Verification Required

None. The phase is a headless model change with no markup, copy or style change (roadmap "UI hint: no").

### Gaps Summary

No gaps. The roadmap's four success criteria and DIAG-01 to DIAG-04 hold against the code at HEAD, and WX-01 to WX-07 hold with the orchestrator's measured gates for `check:pr` and `spec:package`.

Notes, none blocking:
- `83-earlier-checks.mjs` reports exit 1 for the archived `79-pinned-check.mjs` on `TF29`. That is a flip the earlier phase recorded and the script treats it as the one expected failure, with a self-test that fails if it ever passes or another test fails.
- The roadmap's plan note quotes the old store's mutation score as 60/60; this phase's own base record shows 57/57, and the close is 32/32 with no survivors for the smaller module.
- Two info review findings (IN-02, IN-03) were skipped with recorded reasons.

---

_Verified: 2026-11-25_
_Verifier: Claude (gsd-verifier)_
