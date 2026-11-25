---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
verified: 2026-11-25T10:45:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-01-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-01-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-02-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-02-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-03-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-03-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-04-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-04-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-05-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-05-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-06-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-06-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-07-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-07-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-08-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-08-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-09-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-09-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-10-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-10-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-11-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-11-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-12-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-12-SUMMARY.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-13-PLAN.md"
  - ".planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-13-SUMMARY.md"
  - "packages/devtools/src/model/LensSession.ts"
  - "packages/devtools/src/react/DevtoolsDock.tsx"
  - "packages/devtools/src/react/QuestionsPanel.tsx"
  - "packages/devtools/src/react/StoppedBox.tsx"
  - "packages/devtools/src/react/useConfigured.ts"
  - "packages/devtools/src/react/useDiagnostics.ts"
  - "packages/devtools/src/react/useDockModel.ts"
  - "packages/devtools/src/react/useLens.ts"
  - "packages/devtools/src/react/useStopNotice.ts"
  - "packages/devtools/src/react/useTimeline.ts"
covered_digest: "v4:sha256:84c32c29f47e3e9ceaa2e952dacdf91abfedfb27430a1fa3d2dae74cd70cdd68"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 84: `useConfigured` requires `configure`, and the review's small finds - Verification Report

**Phase Goal:** `useConfigured` takes a value that has `configure`, so the three identical adapters are deleted, and the review's four small finds are settled in the same pass: `LensSession` publishes through `ExternalStore.set`, `useLens` receives each fact once, `DockFrame`'s stop ledger exists once, and `useTimeline`'s per-render inputs record is memoised or recorded as a rejection.
**Verified:** 2026-11-25
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `useConfigured` takes a value that has `configure`; the three adapters are deleted; the test double is an object; hidden `Activity` / StrictMode rebuild still configures with current inputs, pinned by existing tests unedited | VERIFIED | `useConfigured.ts` declares `interface Configurable<I> { readonly configure: (inputs: I) => void }` and `useConfigured = <A extends Configurable<I>, I>(make, inputs)` (two parameters), calling `built.configure(inputs)` in the tap and `value.configure(inputs)` in the layout effect. `grep configureDock\|configureTimeline\|configureDiagnostics` over `src/react` is empty. The three call sites are `useConfigured(makeDockModel, inputs)`, `(makeTimelineFeed, { source, capacity })`, `(makeDiagnosticsFeed, options)` with no adapter. `useConfigured.test.tsx` double carries its own `configure` (one declared call-line edit). `ConfigureFirstRender.characterisation.test.tsx`, `Lens.dock*`, `DockRegistryReads.test.tsx` held byte for byte by `84-pinned-check.mjs --all-applied` (16 files hold base text) and pass in my vitest run (39 files, 481 tests). `useConfigured.tst.ts` pins the three assignability facts, the three return types, and four `@ts-expect-error` refusals each with an accepted twin; included in `pnpm test:tstyche` (78 files passed). |
| 2 | `LensSession` publishes through `ExternalStore.set` with no restated `move`; `choose` arms before it publishes and still answers whether the click was consumed; a pin fails if arming moves after the publish | VERIFIED | `LensSession.ts` has no `move`/`publish`; `toggle`, `hover`, `cancel`, `highlight` call `store.set(...)`. `choose`: `current`, `if (next === current) return false`, `armed = pickedOf(next)`, `store.set(next)`, `return true`. The pin is `LensSession.test.ts` "a listener told of a pick can take its reveal" (held unedited, passes); `84-RED-EVIDENCE.md` records it failing on the base under an arm-after-publish swap and again over `set` (84-03, 84-07 sections). Mutation compare: `LensSession.ts` 52/52 -> 47/47, 0 survived, 0 no-coverage, 22 ignored unchanged (only killed mutants deleted). |
| 3 | `useLens` receives each fact once: draw and handlers read the same questions path, one subscription to each store (traceability pin), handlers read guards at event time | VERIFIED | `useLens(lens, questions): UseLens` calls `useStoreSnapshot` once per store (questions first, lens second), no `useRef`, draw effect keyed `[highlighted, instances]` over the hook's own read, handlers read `questions.getSnapshot().instances` at event time, listener effect keyed `[picking, lens, questions]`. `QuestionsPanel` makes one `useLens(lens, questions)` call and reads `read.lens` / `read.questions`; no `useStoreSnapshot(questions)` of its own. `Lens.adapter.test.tsx` differs from base only by the one call line and the unused import; its two subscription pins pass. New `Lens.questions.characterisation.test.tsx` (LQ1-LQ4) passes and was seen failing on the base (`84-RED-EVIDENCE.md`). |
| 4 | `DockFrame`'s stop-ledger ref and memoised notice exist once, shared by the diagnostics and timeline notices | VERIFIED | The only `useRef<StopLedger` in `packages/devtools/src` is in `useStopNotice.ts`. `DockFrame` calls `useStopNotice(status, model.diagnostics.restart)` and `useStopNotice(timelineStatus, model.timelineStatus.restart)`, each call with its own ledger. `StopNoticeProps<S>` is declared once in `StoppedBox.tsx`; `DiagnosticsNoticeProps` and `TimelineNoticeProps` are aliases of it (names kept, so held notice tests compile unedited and pass). `DockFrame.stops.characterisation.test.tsx` (DS1-DS3) passes. |
| 5 | `useTimeline`'s per-render inputs record is memoised or recorded as a rejection against ADR-QD-192 decision 8, G43 unaffected, ADR-QD-197 records the phase | VERIFIED | `useTimeline.ts` keeps `useConfigured(makeTimelineFeed, { source, capacity })` (no memo), the rejection recorded in `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md` (new) and the dated amendment to ADR-QD-192. `useTimeline.inputs.characterisation.test.tsx` TI1-TI3 pins that an equal record publishes nothing from the timeline store and leaves the status reference unchanged, and a moved capacity publishes. `GatesFeed.test.ts` (G43) held byte for byte and passes. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/devtools/src/react/useConfigured.ts` | VERIFIED | `Configurable<I>` declared once, two-parameter hook, wired by three callers |
| `packages/devtools/src/react/useStopNotice.ts` | VERIFIED | New, substantive, imported by `DevtoolsDock.tsx`, out of both barrels |
| `packages/devtools/src/react/StoppedBox.tsx` | VERIFIED | `StopNoticeProps<S>` added once, consumed by both notices and the hook |
| `packages/devtools/src/react/useLens.ts`, `QuestionsPanel.tsx` | VERIFIED | `UseLens` returned and read by the panel |
| `packages/devtools/src/model/LensSession.ts` | VERIFIED | Publishes only through `store.set` |
| Characterisations: `Lens.questions`, `DockFrame.stops`, `useTimeline.inputs`, `useConfigured.tst.ts` | VERIFIED | All exist, pass, shown failing once per `84-RED-EVIDENCE.md` |
| `.changeset/devtools-lens-reads-each-fact-once.md` | VERIFIED | `@qadi/devtools: patch`, ends "No export changes." |
| ADR-QD-197, CCR-QD-476, BEH-QD-756..760, INV-QD-413..414 | VERIFIED | Present in `spec/` (each id in 4-8 spec files); `pnpm spec:verify:strict` PASS 21 / FAIL 0 |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `useDockModel` / `useTimeline` / `useDiagnostics` | `useConfigured` | direct call with the make function and inputs | WIRED |
| `DockFrame` | `useStopNotice` | two calls | WIRED |
| `QuestionsPanel` | `useLens` | one call, both snapshots read from the return | WIRED |
| `LensSession.choose` | `store.set` | after `armed = pickedOf(next)` | WIRED |
| Notices | `StopNoticeProps` | type aliases | WIRED |

### Data-Flow Trace (Level 4)

The lens and stop notice read live store snapshots (`useStoreSnapshot`) and `questions.getSnapshot()`, not static values; LQ1-LQ3 and DS1-DS3 exercise them against republished stores. FLOWING.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Devtools react, LensSession and GatesFeed suites | `pnpm exec vitest run --project devtools packages/devtools/test/react packages/devtools/test/model/LensSession.test.ts packages/devtools/test/model/GatesFeed.test.ts < /dev/null` | 39 files, 481 tests passed | PASS |
| Type tests, both tsconfigs | `pnpm test:tstyche < /dev/null` | 78 files, 425 passed, 2 skipped (pre-existing skips) | PASS |
| Phase checks | `84-check.mjs no-adapter / no-restated-set / one-path / one-ledger / records / scan-ids / scan-forbidden / trailers`, `--self-test` | all pass; self-test 216 passed; 32 plan commits each with the one trailer | PASS |
| Held files | `84-pinned-check.mjs --all-applied` | 16 files hold base text, 2/2 declared edits, `useConfigured.test.tsx` 1/1 edit, 8/8 refusals, 3/3 born files | PASS |
| Mutation | `84-mutation.mjs compare` | `LensSession.ts` 52/52 -> 47/47, no open or new Ignored mutant | PASS |
| Spec | `pnpm spec:verify:strict` | PASS 21, FAIL 0, SKIP 0 | PASS |
| Full gate | `check-pr-2.out` (at ce02fbc7), exit 0; later commits are docs only | 17 of 18 steps (mutation is release-PR-only), `spec:package` ran green | PASS (not re-run, per instruction) |

### Probe Execution

No probe scripts are declared by the phase. SKIPPED.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| ADPT-01 | `useConfigured` takes a value with `configure`; adapters deleted; double is an object; Activity/StrictMode rebuild still configures | SATISFIED | Truth 1 |
| ADPT-02 | `LensSession` publishes through `set`; `choose` arms before publish, answers consumption | SATISFIED | Truth 2 |
| ADPT-03 | `useLens` receives each fact once; one subscription per store; handlers read guards at event time | SATISFIED | Truth 3 |
| ADPT-04 | `DockFrame` stop ledger and memoised notice exist once | SATISFIED | Truth 4 |
| ADPT-05 | `useTimeline` inputs record rejection recorded, G43 unaffected, ADR-QD-197 | SATISFIED | Truth 5 |
| WX-01 | `pnpm check:pr` green | SATISFIED | `check-pr.exit` 0, `check-pr-2.out` "check:pr exit 0" after review fixes |
| WX-02 | Reserved ids only, records present | SATISFIED | ADR-QD-197, CCR-QD-476 row in `spec/README.md`, BEH-QD-756..760, INV-QD-413..414 present; `spec:verify:strict` clean; `scan-ids` clean |
| WX-03 | `spec/overview.md` / gates 13 and 14 | SATISFIED | No export change (package-private only); `spec/overview.md` untouched; gates inside `check:pr` and `spec:package` ran green |
| WX-04 | Nothing new from the forbidden list; no budget moves | SATISFIED | `scan-forbidden` clean; `git diff 8ff027e1..HEAD` shows no change to `AGENTS.md`, `scripts/`, `stryker.devtools.mjs` |
| WX-05 | Coverage holds; Stryker score of touched files does not fall | SATISFIED | Coverage step in `check-pr-2.out` passed; mutation compare shows only killed mutants deleted, 0 open |
| WX-06 | Characterisation first; every new check seen failing | SATISFIED | `84-RED-EVIDENCE.md` sections 84-01 to 84-09 plus review fixes; self-test plants each check's failure |
| WX-07 | No D-numbers/plan ids in shipped source; nothing released | SATISFIED | `scan-ids` clean; changeset only, no version/publish commit in `8ff027e1..HEAD` |

All 12 IDs appear in the plans' `requirements` frontmatter and in REQUIREMENTS.md. No orphaned requirements.

### Decisions D-01..D-27

Honored as checked above: property-form `Configurable` (D-05), arm-before-publish kept (D-09), `useLens(lens, questions)` with no ref (D-11), per-feed ledger keyed on `restart` (D-15), generic `StopNoticeProps<S>` with names kept (D-16), no memo with the rejection recorded (D-17), held files and declared edits (D-20), `83-earlier-checks` pattern re-run, one patch changeset ending "No export changes." (D-26).

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`, `as`, `!`, `any`, `switch`, console, `process.env`, or module-scope `let` in lines added to `packages/devtools/src` since the phase base.

### Human Verification Required

None. The phase changes no markup, copy, test id or style; every behavior-dependent truth (arm-before-publish, one subscription per store, per-feed ledger independence, equal-record no-op publish) has a passing behavioral test.

### Gaps Summary

No gaps. The four review iterations' findings (3 warnings, 5 infos) are all recorded `fixed` in `84-REVIEW-DISPOSITION.md`, with the two ledger rows lost to id reuse restored in prose. The only unmeasured area is `src/react`, which no Stryker config reaches by design (D-24) and which the held characterisations and the coverage threshold cover.

---

_Verified: 2026-11-25_
_Verifier: Claude (gsd-verifier)_
