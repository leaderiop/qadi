---
phase: "55"
slug: "a-port-card-is-a-model-row-not-a-view-join"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-18"
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `55-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`, `@testing-library/react`, happy-dom; tstyche (`*.tst.ts`); Stryker for mutation |
| **Config file** | `vitest.config.ts` (root; coverage `src/model/**` 95%, `src/react/**` 90%); `packages/devtools/vitest.config.ts` (`devtools`); `tstyche.json`; `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/PortCards.test.ts packages/devtools/test/react/ServicesPanel.characterisation.test.tsx < /dev/null` (repo root only) |
| **Full suite command** | `pnpm check:pr < /dev/null` (repo root, stdin closed) |
| **Estimated runtime** | quick ~5 s; full several minutes |

---

## Sampling Rate

- **After every task commit:** Run the quick run command plus any touched file's own test
- **After every plan wave:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm exec tstyche`, `pnpm lint`, `pnpm circular`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, then the two scoped Stryker runs and `55-mutation.mjs compare`
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
| CARD-01 | every card's markup byte-identical before/after | characterisation (render via dock) | `pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.characterisation.test.tsx < /dev/null` | ❌ W0 |
| CARD-02 | `portCards` returns the row per `PortName` with all wording | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/PortCards.test.ts < /dev/null` | ❌ W0 (RED by import first) |
| CARD-03 | misspelt/unknown port is a compile error; one entry per registry port | tstyche + unit | `pnpm exec tstyche packages/devtools/test/model/PortCards.tst.ts`; `pnpm exec vitest run --project devtools packages/devtools/test/model/Wiring.test.ts < /dev/null` | ❌ W0 / ✅ |
| CARD-04 | panel prints a hand-built `ServicesView`; testids and tag mapping | render | `pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.test.tsx < /dev/null` | ✅ (rewritten short) |
| CARD-04 | `services` store: one moment, reference kept | model | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts < /dev/null` | ✅ (cases added) |
| CARD-05 / WX-02 | records exist with reserved numbers | gate | `pnpm spec:verify:strict`, `pnpm spec:api`, `node scripts/check-devtools-claims.mjs` | ✅ |
| WX-04 | no `as`/`switch`/`any`/`!` | gate | `pnpm lint` | ✅ |
| WX-05 | mutation not lower | harness | `node .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation.mjs compare` | ❌ W0 |
| WX-07 | Breaking recorded | review | changeset + `upgrading.md` 0.13 entry present | ❌ |

---

## Wave 0 Requirements

- [ ] `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` — CARD-01, written on the base, green, never edited
- [ ] `packages/devtools/test/model/PortCards.test.ts` — CARD-02/04 (RED by import)
- [ ] `packages/devtools/test/model/PortCards.tst.ts` — CARD-03
- [ ] `55-mutation.mjs` + `55-mutation-base.json` — WX-05
- [ ] a `servicesInput.ts` store double for the render test (cf. `questionsPanelInput.ts`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Long text wraps inside a card (UI-SPEC backstop) | CARD-01 | No truncation style exists; layout is not asserted by happy-dom | Optional: open the dock's Services tab with a long implementation name and reason; nothing changes visually versus the base |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
