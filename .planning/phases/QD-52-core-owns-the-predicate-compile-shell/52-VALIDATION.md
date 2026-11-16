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

### Per-task map (from the PLAN files' `<verify>` blocks)

| Task | Requirements | Automated verify | Status |
|------|--------------|------------------|--------|
| 52-01 T1 base facts, reserved ids, declarations, gates | WX-02 | base-facts recount at `phase_base`; `git grep -lwF` per reserved id; `tsc -b` then both `lib/index.d.ts` sha256 lines and the 932 / 522 / three-switch lines in the SUMMARY | ⬜ pending |
| 52-01 T2 mutation base | WX-05, WX-06 | the three Stryker runs, `tools/mutation.mjs base`, then the JSON shape check (`movedShell` four lines per dialect, both `CompileMetrics.ts` unmeasured); first-commit check (`chore(52-01)` alone, parent `phase_base`) | ⬜ pending |
| 52-02 T1 SQL CompileShell (tracer) | COMP-03, WX-06 | `vitest run --project predicate-sql packages/predicate-sql/test/CompileShell.test.ts` (47 of 47), tsc, lint; import, literal and commit check | ⬜ pending |
| 52-02 T2 Prisma CompileShell | COMP-03, WX-06, WX-01 | `vitest run --project predicate-prisma packages/predicate-prisma/test/CompileShell.test.ts` (21 of 21), tsc, lint; import, literal and commit check; `pnpm check:pr` | ⬜ pending |
| 52-03 T1 RED, core shell, compileSql (tracer) | COMP-01, COMP-02, COMP-03, WX-04 | `vitest run --project core` CompilePredicate + RenderablePredicate, `--project predicate-sql`, `tsc -b`, `tsc -p tsconfig.test.json`, circular, lint, house style; structure check (plain function, pipe order, SQL through it, `params` inside `render`); RED-then-core-then-SQL order | ⬜ pending |
| 52-03 T2 compilePrismaWhere (D-06a) | COMP-02, COMP-03 | `vitest run --project predicate-prisma`, SQL CompileShell, core CompilePredicate, tsc, lint, the scoped grep (no output); structure and commit check, CompileShell files untouched | ⬜ pending |
| 52-03 T3 overview rows, gates | COMP-04, WX-03, WX-04, WX-01 | row check; `check-api-surface` 935; `spec-revise --check`; commit check; `tsc -b` then declarations equal to the base's, package-install 523, house style, circular; `pnpm check:pr` | ⬜ pending |
| 52-04 T1 ADR-QD-165 | WX-02 | ADR and `index.yaml` content check; `spec-revise --check`; commit check | ⬜ pending |
| 52-04 T2 BEH, INV, traceability | WX-02 | headings once each with exact titles and order, INV-QD-350 unused, traceability rows and anchors; `spec-revise --check`, `pnpm spec:examples`; commit check | ⬜ pending |
| 52-04 T3 CCR row, changesets | COMP-04, WX-02, WX-07, WX-01 | CCR row and changeset front-matter check; AGENTS.md, `25-inspection.md`, `upgrading.md` unchanged; `spec-revise --check`, `pnpm spec:verify:strict`; commit check; `pnpm check:pr` | ⬜ pending |
| 52-05 T1 mutation after | WX-05 | `tools/mutation.mjs compare` (`WX-05 holds (D-09a)`); base once, after last | ⬜ pending |
| 52-05 T2 phase scan | COMP-01..03, WX-04, WX-06 | `tsc -b`, `tools/scan.mjs` (`phase scan clean`), `pnpm circular`, house style (3 switches); no tools/scripts/Stryker config change | ⬜ pending |
| 52-05 T3 close | WX-01, WX-07, COMP-01..04 | `pnpm check:pr`; release check; COMP-01..04 complete | ⬜ pending |

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
