---
phase: "84"
slug: "useconfigured-requires-configure-and-the-review-s-small-fin"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-25"
---

# Phase 84 — Validation Strategy

> Every requirement (ADPT-01..05, WX-01..07) was cross-referenced to a test or a gate, and the map was run green on
> 2026-11-25 at head ce02fbc7 (after the code review fixes):
> - the eleven devtools files of the map below: 11 files, 116 tests passed;
> - `84-check.mjs` `no-adapter`, `no-restated-set`, `one-path`, `one-ledger`, `records`, `records --close`, `scan-ids`,
>   `scan-forbidden`, `trailers` (32 plan commits, one trailer each): all hold; `84-pinned-check.mjs --all-applied`
>   (16 files hold their base text, 2 of 2 declared edits, `useConfigured.test.tsx` held from f6e3e6ff with 1 of 1
>   edits, 8 of 8 refusals, 3 of 3 born files); `84-earlier-checks.mjs` exit 0;
> - `pnpm check:pr < /dev/null` exit 0 (17 of 18 steps, mutation skipped by design; 6638 unit tests, BDD 568,
>   examples 43; strict traceability PASS 21 FAIL 0; api-surface 942 exports, unchanged; house-style 617 files,
>   78 type-test files), then `pnpm spec:package < /dev/null` exit 0 (9 packages, 527 runtime exports);
> - `84-mutation.mjs compare` on the close: `LensSession.ts` 52/52 -> 47/47, survived 0, no coverage 0, ignored
>   22 -> 22, 0 new (the five killed mutants that left were in the deleted `move`). `LensSession.ts` is unchanged
>   since the close; the review fixes touched comments, a type parameter, a type test and spec text only.
>
> The review fixes added three `@ts-expect-error` refusals to `useConfigured.tst.ts` (a mismatched input, the bad
> timeline source, and narrower inputs than the value is handed, the last refused only by the property form of
> `Configurable`); each was seen failing, recorded in `84-RED-EVIDENCE.md` § Review fixes. No validation gap needed a
> new test.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `devtools`) with `@effect/vitest` and `@testing-library/react`; tstyche for `.tst.ts`; Stryker for `src/model/LensSession.ts` |
| **Config file** | `vitest.config.ts` (root); `tstyche.json` with `tsconfig.tstyche.json`; `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools <file> < /dev/null` (from the repository root only) |
| **Full suite command** | `pnpm check:pr < /dev/null`, then `pnpm spec:package < /dev/null`, each alone |
| **Estimated runtime** | quick ~10 seconds per file; full gate ~20 minutes; Stryker on `LensSession.ts` alone ~45 seconds |

---

## Sampling Rate

- **After every task commit:** the one or two vitest files the task touches, plus the matching `84-check.mjs` mode.
- **After every plan wave:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm test:tstyche < /dev/null`, `84-pinned-check.mjs`, `84-earlier-checks.mjs`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null`, `pnpm spec:package < /dev/null`, `bash spec/scripts/verify-traceability.sh --strict`, and `84-mutation.mjs compare`, all green.
- **Max feedback latency:** 60 seconds for a task-level check.

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | Status |
|-------------|----------|-----------|-------------------|--------|
| ADPT-01 | A value with `configure` configures on first render and on rebuild (U1..U4 over a double with its own `configure`) | unit | `pnpm exec vitest run --project devtools packages/devtools/test/react/useConfigured.test.tsx < /dev/null` | ✅ green |
| ADPT-01 | `Configurable<I>` accepts the three values; four refusals, each with its twin | type | `pnpm test:tstyche < /dev/null` (`test/react/useConfigured.tst.ts`, both passes) | ✅ green |
| ADPT-01 | Hidden `Activity` and StrictMode rebuilds configure with current inputs | unit (held) | `ConfigureFirstRender.characterisation.test.tsx` | ✅ green |
| ADPT-01 | No adapter, two parameters, `Configurable` declared once and in no barrel | script + type | `84-check.mjs no-adapter`; `surface.tst.ts` refusals | ✅ green |
| ADPT-02 | `choose` arms before it publishes; answers true exactly when it changed the snapshot | unit + property (held) | `LensSession.test.ts` (seen failing under arm-after-publish on the base and over `set`) | ✅ green |
| ADPT-02 | `LensSession.ts` declares no `move`, calls no `publish`, arms before `store.set(` | script | `84-check.mjs no-restated-set` | ✅ green |
| ADPT-03 | One subscription to each store; draw follows the store; handlers read the current list; a dropped guard leaves no overlay | component | `Lens.adapter.test.tsx` (two declared edits), `Lens.questions.characterisation.test.tsx` LQ1..LQ4 | ✅ green |
| ADPT-03 | `useLens` has two parameters, one `useStoreSnapshot` per store, questions first, no `useRef` | script | `84-check.mjs one-path` | ✅ green |
| ADPT-04 | Each stop announced once and independently; a second stop remounts only its own box; Restart reaches the rebuilt model | component | `DockFrame.stops.characterisation.test.tsx` DS1..DS3; `TimelineNotice.test.tsx`, `DiagnosticsNotice.test.tsx` held | ✅ green |
| ADPT-04 | Exactly one stop ledger, in `useStopNotice`, called once per feed | script | `84-check.mjs one-ledger` | ✅ green |
| ADPT-05 | A fresh record with equal fields publishes nothing; a moved capacity publishes (the memo recorded as a rejection in ADR-QD-197) | component | `useTimeline.inputs.characterisation.test.tsx` TI1..TI3 | ✅ green |
| ADPT-05 | G43 unaffected | unit (held) | `GatesFeed.test.ts`, `DockRegistryReads.test.tsx` | ✅ green |
| WX-02/03/06 | Records: traceability rows, pinned-by lists, held files, every reserved record written | script | `84-check.mjs records --close`; `84-pinned-check.mjs --all-applied`; `verify-traceability.sh --strict`; `spec-revise.mjs --check`; api-surface 942 | ✅ green |
| WX-04 | No forbidden construct, no plan-local id | script | `84-check.mjs scan-forbidden`, `scan-ids`; house-style gate | ✅ green |
| WX-05 | `LensSession.ts` mutation: no open mutant, no new Survived/NoCoverage/Ignored; coverage thresholds | mutation + gate | `84-mutation.mjs compare` on `84-mutation-close.json`; coverage inside `check:pr` | ✅ green |
| WX-01/07 | Phase gate green; nothing pushed, tagged or released; one trailer per commit | gate | `pnpm check:pr`; `pnpm spec:package`; `84-check.mjs trailers` | ✅ green |

*Status: green on every row. The first failing output of each new test and check is in `84-RED-EVIDENCE.md` (WX-06).*

---

## Wave 0 Requirements

- [x] `84-check.mjs` (self-test 216), `84-pinned-check.mjs` (38), `84-mutation.mjs` (44), `84-earlier-checks.mjs` (8), each mode seen failing once.
- [x] `84-mutation-base.json`, taken at the execution start on a tree equal to `phase_base` outside `.planning/` (ff0be2b4).
- [x] `Lens.questions.characterisation.test.tsx`, `DockFrame.stops.characterisation.test.tsx`, `useTimeline.inputs.characterisation.test.tsx`, green on the base, each row seen failing.
- [x] `useConfigured.tst.ts`, landed with the signature change, its refusals seen failing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | n/a | Every behaviour is reached by a rendered, headless or type test | n/a |

The `src/react` files are outside every Stryker config and are recorded as unmeasured (D-24); their behaviour is held by the component tests above.

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s per file
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-25

## Validation Audit 2026-11-25

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
