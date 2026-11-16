---
phase: "52"
slug: "core-owns-the-predicate-compile-shell"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-16"
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 with `@effect/vitest` |
| **Config file** | `vitest.config.ts` (root), `packages/{core,predicate-sql,predicate-prisma}/vitest.config.ts`, `tsconfig.test.json`, `stryker.config.mjs` |
| **Quick run command** | `pnpm exec vitest run --project predicate-sql packages/predicate-sql/test/CompileShell.test.ts`; `pnpm exec vitest run --project predicate-prisma packages/predicate-prisma/test/CompileShell.test.ts`; `pnpm exec vitest run --project core packages/core/test/CompilePredicate.test.ts` |
| **Full suite command** | `pnpm exec vitest run --project predicate-sql`, `--project predicate-prisma`, `--project core`; `pnpm exec tsc -b tsconfig.json && pnpm exec tsc -p tsconfig.test.json`; then `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 second quick; ~10 s for the three projects; ~6 minutes `check:pr` |

---

## Sampling Rate

- **After every task commit:** the quick-run command(s) of the touched package
- **After every plan wave:** the three project runs, `tsc -b` + `tsc -p tsconfig.test.json`, `node scripts/check-house-style.mjs`, `pnpm circular`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, and Stryker re-run with the base's invocations
- **Max feedback latency:** 10 seconds (quick run)

---

## Per-Task Verification Map

Filled by the planner from the PLAN files' `<verify>` blocks. Requirement → test map (from 52-RESEARCH.md "Validation Architecture"):

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| COMP-03 | Every reachable refusal reason per dialect (error fields + counters); unreachable reasons pinned as compiled rows | characterisation (green on base) | the two `CompileShell.test.ts` quick runs | ❌ W0 | ⬜ pending |
| COMP-03 | Compiled outputs per dialect (SQL text + params; Prisma where) and counters | characterisation | same | ❌ W0 | ⬜ pending |
| COMP-03 / D-06 | One counter move per call; a defect counts neither | characterisation | same | ❌ W0 | ⬜ pending |
| D-02 | Span tree unchanged: package span root, `toRenderable` its child, no new span | characterisation | same | ❌ W0 | ⬜ pending |
| COMP-01 | `compilePredicate`: defaults (`Ascii`, `DEFAULT_MAX_IN_VALUES`), overrides, `undefined` is the default, rules reach `toRenderable`, render only after success, counts once | unit (core) | `pnpm exec vitest run --project core packages/core/test/CompilePredicate.test.ts` | ❌ W0 (RED by import) | ⬜ pending |
| COMP-01..02 | The shell is gone from both packages (scoped grep) | grep | `/usr/bin/grep -nE '\?\? "Ascii"\|DEFAULT_MAX_IN_VALUES\|Metric\.update\|tapError\|toRenderable\(' packages/predicate-sql/src/index.ts packages/predicate-prisma/src/index.ts` → no output | n/a | ⬜ pending |
| COMP-02 | Rules, renderer and `compiledTotal` stay in the packages; `[metric-table]`, `METRIC_ID_LITERAL_BUDGET` unchanged | gate | `node scripts/check-house-style.mjs` | ✅ | ⬜ pending |
| COMP-04 | Overview names the new exports; changesets for three packages; packed exports map | gate | `node scripts/check-api-surface.mjs`; `node scripts/check-package-install.mjs`; changeset files present | ✅ | ⬜ pending |
| WX-05 | Scores per D-09/D-09a (survivors identical; drop = killed mutants moved to core) | mutation | the research Q5 Stryker invocations, alone | base: research Q5 | ⬜ pending |
| WX-06 | Characterisation and mutation base before any `src` edit | commit order | git log order | — | ⬜ pending |
| WX-01..04, 07 | Gates, ids, overview, banned constructs, no break | gate | `pnpm check:pr < /dev/null`; `pnpm circular` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `52-mutation-base.json` — before any `src` edit
- [ ] `packages/predicate-sql/test/CompileShell.test.ts` — green on the base, before any `src` edit
- [ ] `packages/predicate-prisma/test/CompileShell.test.ts` — green on the base, before any `src` edit
- [ ] `packages/core/test/CompilePredicate.test.ts` — RED by import until `compilePredicate` exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Prisma's renderer defect no longer counts `compiled` (D-06a) | COMP-03 / D-06a | Depends on stack depth (a `Negate` chain ~3000–7000 deep); not a stable test | Read the converted `compilePrismaWhere`: `compiled` is updated only after `render` returns, inside core's `compilePredicate`; ADR-QD-165, the counting BEH and the Prisma changeset state the correction |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
