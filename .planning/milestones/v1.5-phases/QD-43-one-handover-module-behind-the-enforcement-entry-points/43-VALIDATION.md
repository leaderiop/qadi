---
phase: "43"
slug: "one-handover-module-behind-the-enforcement-entry-points"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-15"
---

# Phase 43: Validation Strategy

> The per-phase validation contract for feedback sampling during execution. It is seeded from `43-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 + `@effect/vitest` 4.1.2 (projects `core` and `promise`); tstyche 7.2.5 for `*.tst.ts`; Stryker (`stryker.config.mjs`) for the per-file comparison |
| **Config file** | root `vitest.config.ts` (core held at 95%), `packages/core/vitest.config.ts`, `tstyche.json`, `stryker.config.mjs` |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/Qadi.test.ts packages/core/test/Handover.test.ts`, then `pnpm exec tsc -p tsconfig.test.json`, then `pnpm circular` |
| **Type-test command** | `pnpm exec tstyche packages/core/test/Qadi.tst.ts`; `pnpm exec tstyche packages/promise/test/Facade.tst.ts`; all: `pnpm test:tstyche` |
| **Full suite command** | `pnpm exec vitest run --project core && pnpm exec vitest run --project promise && pnpm lint && pnpm test:tstyche`, then `pnpm check:pr < /dev/null` at the phase gate |
| **Estimated runtime** | quick about 10 s; full suite about 30 s; `check:pr` about 5 minutes |

---

## Sampling Rate

- **After every task commit:** run the quick command. While the RED tstyche files are intentionally RED, exclude them, and run them only in the task that fixes them.
- **After every plan wave:** run the full suite command.
- **Before `/gsd-verify-work`:**
  - `pnpm check:pr < /dev/null` is green;
  - `pnpm spec:website-examples` is run explicitly;
  - the Stryker comparison against `43-mutation-base.json` exits 0.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

Plans: 43-01 (HAND-02 RED, WX-05 base, WX-06), 43-02 (HAND-03/04 table), 43-03/43-04 (HAND-01..05 GREEN), 43-05 (WX-07), 43-06/43-07 (HAND-06, WX-02/03), 43-08 (WX-01/04/05 close). Re-run 2026-11-15 at 0362a8fd: core 112/112 (Qadi + Handover), tstyche 45/45, `pnpm circular` clean, `decideOne`/`permitted` count 0; 43-08 recorded `pnpm check:pr < /dev/null` exit 0 and Stryker after = 1.0 / 1.0.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| HAND-02 | `guard` and the four `filter*` refuse `{ resource }`: RED on the base, GREEN after (use the `Parameters<…>` / `toBeAssignableFrom` form for `filter*`) | tstyche | `pnpm exec tstyche packages/core/test/Qadi.tst.ts` | ✅ | ✅ green |
| HAND-02 | promise `filter`/`filterProjected` refuse `resource` | tstyche | `pnpm exec tstyche packages/promise/test/Facade.tst.ts` | ✅ | ✅ green |
| HAND-03 | the released value is the decided value for all ten entry points, and per item for `filter*` | unit (table) | `pnpm exec vitest run --project core packages/core/test/Handover.test.ts` | ✅ | ✅ green |
| HAND-04 | discharge comes before the work; `filter*` partitions; array and stream agree; order holds under `concurrency`; a denial hands nothing over; `UndischargedObligation` comes before handover | unit (table) | same file | ✅ | ✅ green |
| HAND-04 | span names are unchanged (allow: `qadi.evaluate` then `qadi.discharge`; deny: `qadi.evaluate`) | unit | `pnpm exec vitest run --project core packages/core/test/Handover.test.ts -t "spans"` | ✅ | ✅ green |
| HAND-01 | `Handover.ts` is a leaf with no cycle; `permitted` and `decideOne` are gone; the allow/deny branch and `project(` each appear once in added code | cycle + scoped grep | `pnpm circular`; `/usr/bin/grep -cE "decideOne\|permitted" packages/core/src/Qadi.ts` = 0 | ✅ | ✅ green |
| HAND-05 | no `guard`/`filter*` call passes `resource` | typecheck + fence gates | `pnpm exec tsc -p tsconfig.test.json && pnpm spec:examples && pnpm spec:website-examples` | ✅ | ✅ green |
| HAND-06 | ADR-QD-156; INV-QD-108/032/009/013 restated; traceability updated | spec gates | `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims` | ✅ | ✅ green |
| WX-01 | the merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ✅ green |
| WX-02 | only reserved numbers are used | git grep | `bash -c "git grep -lE 'ADR-QD-156\|CCR-QD-434\|BEH-QD-55[1-5]\|INV-QD-33[12]' -- spec packages .changeset"` | ✅ | ✅ green |
| WX-03 | overview names `HandoverOptions` and drops `LoadedEnforceOptions` | gate 13 | `pnpm spec:api` | ✅ | ✅ green |
| WX-04 | nothing forbidden is added; budgets are unchanged | lint + scoped grep | `pnpm lint`; `git diff <base> -- scripts/check-house-style.mjs` is empty | ✅ | ✅ green |
| WX-05 | coverage, and no per-file Stryker drop | coverage + mutation | `pnpm coverage`; scoped Stryker on `Qadi.ts` and `Handover.ts`, then the comparer against `43-mutation-base.json` | ✅ | ✅ green |
| WX-06 | tests come before the change | git order | the RED/characterisation/base-Stryker commits come before the first `packages/core/src` edit | ✅ | ✅ green |
| WX-07 | Breaking changesets and `upgrading.md` | file + gate | the `.changeset/*.md` entries (`@qadi/core` minor, `@qadi/promise` minor, **Breaking**); `pnpm spec:website-examples` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `packages/core/test/Qadi.tst.ts`: the five refusals (RED on the base), and the `LoadedEnforceOptions` positives prepared for the rename
- [x] `packages/promise/test/Facade.tst.ts`: new; the promise refusals (RED)
- [x] `packages/core/test/Handover.test.ts`: new; the ten-row characterisation table (green before and after), the positional-resource defence, and the span pin
- [x] `43-mutation-base.json`: the base Stryker score for `Qadi.ts`, with `Handover.ts` recorded as `moved`

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have an `<automated>` verify or a Wave 0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without an automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` is set in the frontmatter

**Approval:** approved 2026-11-15

## Validation Audit 2026-11-15

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
