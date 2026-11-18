---
phase: "56"
slug: "the-gate-registry-watch-becomes-the-dock-model-s-third-feed"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-18"
---

# Phase 56 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `56-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`, `@testing-library/react`, happy-dom; tstyche (`*.tst.ts`); Stryker for mutation |
| **Config file** | `vitest.config.ts` (root; projects `devtools`, `react`; coverage `src/model/**` 95%, `src/react/**` 90%); `packages/devtools/vitest.config.ts`; `tstyche.json`; `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts packages/devtools/test/model/DockModel.test.ts packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx < /dev/null` (repo root only) |
| **Full suite command** | `pnpm check:pr < /dev/null` (repo root, stdin closed) |
| **Estimated runtime** | quick ~5 s; full several minutes |

---

## Sampling Rate

- **After every task commit:** Run the quick run command plus any touched file's own test
- **After every plan wave:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm exec vitest run --project react < /dev/null`, `pnpm exec tstyche`, `pnpm lint`, `pnpm circular`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, then the scoped Stryker runs and `56-mutation.mjs compare`
- **Max feedback latency:** ~30 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by the planner from the plans' `<verify>` blocks) | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GFED-01 | the feed owns the watch and the thunk; twins of M31..M47 and P2 | unit (feed alone, `gateRegistryDouble.ts`) | `pnpm exec vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts < /dev/null` | ❌ W0 (RED by import) |
| GFED-02 | the model composes three feeds; the join moves first; one `configure` publishes one snapshot | model | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts < /dev/null` | ✅ (edited) |
| GFED-03 | each twin is green before its `DockModel` case is deleted | model + diff check | same as GFED-01/02 plus a `git diff` scan | ❌ W0 |
| GFED-04 | questions panel markup unchanged | characterisation through the dock | `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx <new characterisation file> < /dev/null` | ❌ W0 (new file + `questionsProp.ts`) |
| GFED-05 | the thunk is the feed's; its throw is stated and the poll stays `Live` | model + dock, RED → green | the D-03 RED test files (DockModel twin and dock-level) | ❌ W0 |
| GFED-05 | misuse is a compile error (`extra.questions`, `diagnostics.questions`) | tstyche | `pnpm exec tstyche packages/react/test/DevtoolsFeed.tst.ts < /dev/null` | ✅ (edited) |
| WX-02/03/07 | records, overview rows, two changesets, the 0.13 note | gate | `pnpm spec:verify:strict`; `pnpm spec:api`; `node scripts/check-devtools-claims.mjs` | ✅ |
| WX-04 | no banned constructs, no cycle | lint | `pnpm lint`; `pnpm circular` | ✅ |
| WX-05 | mutation not lower | harness | `node .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation.mjs compare <static evidence json>` | ❌ W0 |

---

## Wave 0 Requirements

- [ ] `56-mutation.mjs` + `56-mutation-base.json` for every touched model file, measured on the untouched base (WX-05)
- [ ] `packages/devtools/test/react/questionsProp.ts` (the input seam) and the new characterisation file, written on the base, green, never edited (GFED-04)
- [ ] the D-03 RED test (dock-level) and its `DockModel` twin, RED on the base (GFED-05)
- [ ] `packages/devtools/test/model/GatesFeed.test.ts`, RED by import (GFED-01/03)
- [ ] a dying-collector helper for the poll-defect tests that used a throwing thunk

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A long failure reason wraps inside the panel (UI-SPEC backstop) | GFED-05 | No truncation style exists; happy-dom asserts no layout | Optional: hand the dock a thunk that throws a long multi-line error; the paragraph wraps like `qadi-gates-failed` |
| The failure paragraph is not announced (UI-SPEC backstop) | GFED-05 | Screen-reader behaviour is not asserted | Optional: confirm no `role`/`aria-live`, as on the sibling failure paragraphs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
