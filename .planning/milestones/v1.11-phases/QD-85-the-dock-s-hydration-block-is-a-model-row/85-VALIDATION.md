---
phase: "85"
slug: "the-dock-s-hydration-block-is-a-model-row"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-25"
---

# Phase 85 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `85-RESEARCH.md` §Validation
> Architecture (HEAD `0f790a4d`; `packages/devtools` and `spec/` unchanged since `ac7578f3`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 (project `devtools`) + `@effect/vitest` 4.1.2 + `@testing-library/react` 16.3.3 (happy-dom); tstyche 7.2.5 for `.tst.ts`; Stryker 10.1.1 (`stryker.devtools.mjs`, `src/model/**`) |
| **Config file** | root `vitest.config.ts`; `stryker.devtools.mjs`; `tstyche.json` + `tsconfig.tstyche.json` |
| **Quick run command** | `bash -c 'pnpm exec vitest run --project devtools <file> < /dev/null'` |
| **Full suite command** | `pnpm check:pr < /dev/null` (plus `pnpm spec:package`, `pnpm spec:verify:strict`, the `85-mutation.mjs compare`, each alone) |
| **Estimated runtime** | quick ~10–30 s per file; full gate ~10–20 min; one Stryker file run several minutes |

---

## Sampling Rate

- **After every task commit:** the one to three vitest files the task touches, plus the matching `85-check.mjs` mode.
- **After every plan wave:** `bash -c 'pnpm exec vitest run --project devtools < /dev/null'`, `pnpm test:tstyche`, `node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-pinned-check.mjs`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null`, `pnpm spec:package`, `pnpm spec:verify:strict`, mutation `compare`: all green.
- **Max feedback latency:** 60 seconds per task (excluding Stryker runs).

---

## Per-Requirement Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| HYDV-01 | Every state and sentence byte-pinned on the base (cells H1–H13: Pending, Unwired, Counts with rate 0/1/n, raised drop, foreign reason, `All 0 reasons`, the three scope sentences incl. "0 dehydrated entries", precedence under Starting/Stopped) | component (HTML golden) | `… vitest run --project devtools packages/devtools/test/react/QuestionsPanel.hydration.characterisation.test.tsx` | ✅ (born green, 85-01) | ✅ green |
| HYDV-01 | The 30 held cells stay green, unedited | component (held) | `… QuestionsPanel.characterisation.test.tsx QuestionsPanel.feed.characterisation.test.tsx` | ✅ held | ✅ green |
| HYDV-02 | Every arm and boundary of `hydrationView` | unit (table) | `… packages/devtools/test/model/HydrationView.test.ts` | ✅ | ✅ green |
| HYDV-02 | The union is closed; `HydrationView.ts` imports no React | type + script | `pnpm test:tstyche`; `85-check.mjs no-react-in-model` | ✅ | ✅ green |
| HYDV-02 | No open mutant in `HydrationView.ts` (Ignored per research Q4/A2) | mutation | `85-mutation.mjs record close hydration` then `compare` | ✅ | ✅ green |
| HYDV-03 | `model.hydration` snapshot per status; identical poll publishes nothing, changed once; equal-content republish on `unsampled` flip; status moves leaving `unsampled` alone publish nothing | unit | `… packages/devtools/test/model/DockModel.test.ts` | ✅ extended | ✅ green |
| HYDV-03 | The three unsampled predicates stay distinct | script | `85-check.mjs three-predicates` | ✅ | ✅ green |
| HYDV-03 | `DockModel.ts` does not fall under mutation | mutation | `85-mutation.mjs record base dock` (before any edit), `record close dock`, `compare` | ✅ | ✅ green |
| HYDV-04 | Panel renders each tag with every `data-testid`; rewritten `QuestionsPanel.test.tsx` hydration tests pass; held Lens characterisation renders with no `hydration` | component | `… QuestionsPanel.test.tsx Lens.questions.characterisation.test.tsx` | ✅ edited / held | ✅ green |
| HYDV-04 | `DockFrame` commits on no reading-only move; a status move commits once (control) | component (Profiler) | `… packages/devtools/test/react/DockFrame.renders.test.tsx` | ✅ | ✅ green |
| HYDV-04 | `QuestionsPanel.tsx` imports neither `isUnsampled` nor `unaccountedEntries`; `Screen` has no `shown` | script | `85-check.mjs panel-decides-nothing` | ✅ | ✅ green |
| HYDV-05 | Eleven stores in every pin; AggregateError row; spec registers | unit + script | `… ConfigureRule.test.ts DockModel.listeners.test.ts DockModel.test.ts`; `pnpm spec:verify:strict`; `85-check.mjs records` | ✅ edited | ✅ green |
| WX-01..07 | Gate green, changeset, trailers, red evidence, no release | script | `pnpm check:pr < /dev/null`; `85-check.mjs trailers` / `seen-failing` / `records` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `QuestionsPanel.hydration.characterisation.test.tsx` (H1–H13), born green on the base; one recorded scratch failure each (`85-RED-EVIDENCE.md`).
- [x] `85-check.mjs`, `85-pinned-check.mjs` (declaring the `QuestionsPanel.test.tsx` hydration region as the one editable span), `85-mutation.mjs`, `85-earlier-checks.mjs`, each with `--self-test`; ported from the `84-*.mjs` scripts with every hard-coded `84` name, scratch dir, subject regex and id-token list changed.
- [x] `85-mutation-base.json` taken on a clean tree before any source edit (`record base dock`).
- [x] `HydrationView.test.ts`, `HydrationView.tst.ts`, `DockFrame.renders.test.tsx`.
- Framework install: none.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s (Stryker excluded)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-25 (autonomous run): every requirement maps to a test file or phase check that exists and passed on the finished tree at `b19deef7`

## Validation Audit 2026-11-25

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
