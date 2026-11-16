---
phase: "44"
slug: "the-hydration-seed-s-fields-stated-once"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-15"
---

# Phase 44 — Validation Strategy

> The per-phase validation contract for feedback sampling during execution. Seeded from `44-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 (`@effect/vitest`, `fast-check` 4.10.2), project `react` (happy-dom, `@qadi/core` aliased to core source); tstyche for type pins; Stryker (`stryker.react.mjs` with `--mutate`) for the per-file comparison |
| **Config file** | root `vitest.config.ts`, `packages/react/vitest.config.ts`, `tstyche.json`, `stryker.react.mjs` |
| **Quick run command** | `pnpm exec vitest run --project react packages/react/test/HydrationSeedFields.test.ts packages/react/test/HydrationPayload.test.ts packages/react/test/HydrationEngine.test.ts` (from the repo root, never from `packages/react`) |
| **Full suite command** | `pnpm check:pr < /dev/null` (all of `pnpm check` but `pnpm mutation`); fast loop `pnpm check:fast` |
| **Estimated runtime** | quick about 10 s; `check:fast` about 2 minutes; `check:pr` about 5 minutes |

---

## Sampling Rate

- **After every task commit:** the quick run command, plus `pnpm typecheck` after any `src` edit, and `pnpm circular` after the derived-statement plan.
- **After every plan wave:** `pnpm check:fast`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, and the Stryker comparer against `44-mutation-base.json` exits 0.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

Plans: 44-01 (HYDF-03/04 base evidence, WX-05 base, WX-06), 44-02 (HYDF-01/02 seed fields, D-03 RED), 44-03 (HYDF-02 verdict table, scratch GREEN), 44-04 (WX-07 records), 44-05 (WX-02/03 records), 44-06 (WX-01/04/05 close). Re-run 2026-11-15 at f00a01c1: react 58/58 (HydrationSeedFields + HydrationPayload + HydrationEngine), tstyche `Hydration.tst.ts` 9/9 (32 assertions), verdict `_tag ===` count 0, `pnpm spec:api` 927 exports, house-style unchanged, no `-QD-NEXT` added; 44-06 recorded `pnpm check:pr < /dev/null` exit 0 and Stryker after = 1 / 0.875 (base 1 / 0.875).

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| HYDF-01 | seed fields are the wire's minus the withheld ones; the classes are typed by the struct | property + type pin | `pnpm exec vitest run --project react packages/react/test/HydrationSeedFields.test.ts`; `pnpm test:tstyche` | ✅ | ✅ green |
| HYDF-02 | the branch is written once; dehydrate and rebuild are spreads with one `subjectId` | structural scan + typecheck | `pnpm typecheck`; `_tag === "Allow"`/`"Deny"` count in `HydrationEngine.ts` is 0; no hand field list in `rebuild` or `SeededDecision.ts` | n/a | ✅ green |
| HYDF-03 | any Decision → entry → seed keeps every disclosed wire field; RED with a scratch field | property | same property file; RED with the scratch edit on the base (uncommitted, reverted with `git checkout -- packages/core/src/DecisionWire.ts`), GREEN after | ✅ | ✅ green |
| HYDF-04 | `entryAgrees` unchanged; payload bytes identical | golden + existing forged-disclosure tests | `pnpm exec vitest run --project react packages/react/test/HydrationSeedFields.test.ts packages/react/test/HydrationPayload.test.ts` | ✅ | ✅ green |
| WX-01 | the merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ✅ green |
| WX-02 | only reserved ids (ARCH-91, ADR-QD-157, CCR-QD-435, BEH-QD-556..560, INV-QD-333..334) | git grep | `bash -c "git grep -nE 'ADR-QD-NEXT\|CCR-QD-NEXT\|BEH-QD-NEXT\|INV-QD-NEXT' -- packages spec"` empty | ✅ | ✅ green |
| WX-03 | the overview names every export | gate 13 | `pnpm spec:api` | ✅ | ✅ green |
| WX-04 | nothing forbidden is added; budgets unchanged | lint + scoped scan | `pnpm lint`; `git diff <base> -- scripts/check-house-style.mjs` empty | ✅ | ✅ green |
| WX-05 | coverage holds; no per-file Stryker drop | coverage + mutation | `pnpm coverage`; `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/HydrationEngine.ts,packages/react/src/SeededDecision.ts'`, then the comparer | ✅ | ✅ green |
| WX-06 | tests come before the change | git order | the base JSON, golden and property commits precede the first `packages/react/src` edit | n/a | ✅ green |
| WX-07 | Breaking recorded | file + gate | `.changeset/*.md` has `"@qadi/react": minor` and **Breaking**; `upgrading.md` entry; `pnpm spec:website-examples` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `packages/react/test/HydrationSeedFields.test.ts`: the round-trip property (HYDF-03) and the byte golden (HYDF-04), green on the base
- [x] `44-mutation-base.json`: the base Stryker scores for `HydrationEngine.ts` and `SeededDecision.ts`, committed alone
- [x] RED evidence in the SUMMARY: the failing property output under the scratch field, and the revert command

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-15

## Validation Audit 2026-11-15

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
