---
phase: "39"
slug: "each-hydration-drop-reason-stated-once-with-its-kind"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-14"
---

# Phase 39 — Validation Strategy

> Per-phase validation contract. Reconstructed from the five PLAN and SUMMARY files (no RESEARCH.md for this phase).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 + `@effect/vitest` 4.1.2; tstyche 7.2.5 (checked `@ts-expect-error` directives) for compile-time pins; Stryker (core `stryker.config.mjs`, react `stryker.react.mjs`) for mutation |
| **Config file** | root `vitest.config.ts` (projects `core`, `react`, `devtools`; coverage thresholds); `tstyche.json` |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/HydrationMetrics.test.ts && pnpm exec vitest run --project devtools packages/devtools/test/model/Hydration.test.ts && pnpm exec tstyche HydrationMetrics.tst Hydration.tst` |
| **Full suite command** | `pnpm test`, then `pnpm check:pr < /dev/null` at the phase gate |
| **Estimated runtime** | ~15 seconds (quick); `check:pr` about 3 minutes |

---

## Sampling Rate

- **After every task commit:** the HydrationMetrics test file, plus `pnpm typecheck` when source is edited and the two tstyche files after the pins land
- **After every plan wave:** `pnpm typecheck && pnpm lint && pnpm circular`, `pnpm run build` for declaration emit, and the spec gates (`spec-revise --check`, `spec:verify:strict`, `spec:api`, `spec:examples`) once records change
- **Before verification:** `pnpm check:pr < /dev/null` green, mutation compare green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| DROP-01 | one module-private `HYDRATION_DROP_TABLE` holds each reason's kind, summary and remedy; `MEANINGS` gone | source scan + unit | 39-02 Task 1 source-shape verify; `HydrationMetrics.test.ts` per-reason meaning cases (25 green) | ✅ | ✅ green |
| DROP-02 | unions, list, guard and react's groups derive from the table; a kind-less row and an unknown kind fail to compile | tstyche + recorded experiment | `pnpm exec tstyche HydrationMetrics.tst Hydration.tst` (17 tests, 3 suppressed errors matched); 39-02 mechanical negatives (TS2741, TS2322); react code-only scan 0 reason literals beside `\|` (7 at base) | ✅ | ✅ green |
| DROP-03 | label set and order unchanged; written-out nine-word snapshot green on base and after | unit | `pnpm exec vitest run --project core packages/core/test/HydrationMetrics.test.ts` (written-out describe from `d84cc614`); devtools `Hydration.test.ts` order and `length === 9` pin unedited (15 green) | ✅ | ✅ green |
| DROP-04 | `qadi_hydration_dropped_total` declaration, id and description unchanged; one row reaches the metric and the panel | scan + recorded experiment | 39-05 Task 1 D-17 check; 39-01 and 39-03 experiments (base: 5 edits in 3 files, 1 asked for; after: 1 row edit) | n/a | ✅ green |
| WX-01 | merge gate green at phase end | gate | `pnpm check:pr < /dev/null` (exit 0 on `0c3aca1d`) | n/a | ✅ green |
| WX-02 | only reserved ids used; next-id never run | scan | 39-04/39-05 reserved-id verify (ARCH-86, ADR-QD-152, CCR-QD-430, INV-QD-323 only) | n/a | ✅ green |
| WX-03 | overview names `HydrationDropReasonOf` and `HydrationDropRow` | gate 13 | `pnpm spec:api` (920 exports) | n/a | ✅ green |
| WX-04 | no new `as`/`!`/`any`/`switch`/`fnUntraced` | scan (added lines) + house style | 39-05 Task 1 forbidden-construct scan; `pnpm lint` | n/a | ✅ green |
| WX-05 | coverage holds; mutation of touched files does not fall | mutation | Stryker per file vs `39-mutation-base.json` → `39-mutation-after.json` (both files 1 → 1) | ✅ | ✅ green — see note |
| WX-06 | characterisations written on the base before the change | commit order | 39-05 Task 1 commit-order check (`chore(39-01)`, `test(39-01)` precede `refactor(39-02)`) | n/a | ✅ green |
| WX-07 | changesets `@qadi/core` minor, `@qadi/react` patch; nothing released | scan | 39-04 Task 3 changeset verify; 39-05 Task 3 constraint check | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**WX-05 note:** after the change `HydrationMetrics.ts` has 0 scored mutants (18 ignored as static; base 5 scored, 72 ignored), because the guard and the meaning lookup now run at module load. Mutation no longer samples that file; the written-out pins (core 25 cases, devtools order and length, the tstyche partition) and the two recorded experiments carry it.

---

## Wave 0 Requirements

- [x] `39-mutation-base.json` — both files measured at the base, committed alone and first (`cd5ea7f7`)
- [x] Written-out ordered nine words, read off the metric, green on the base (`d84cc614`)
- [x] New-reason experiment on the base recorded (the harm), then after the change (the fix)

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

**Approval:** validated 2026-11-14 (all eleven requirements automated; HydrationMetrics 25, devtools Hydration 15, react HydrationEvent/Engine 32 green; tstyche 17 tests with 3 matched suppressed errors; full suite green post-merge)

## Validation Audit 2026-11-14

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
