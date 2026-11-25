---
phase: "86"
slug: "qadiprovider-s-registry-lifetime-has-a-react-free-owner"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-25"
---

# Phase 86 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `86-RESEARCH.md` §Validation
> Architecture (HEAD `3dd201a3`; `packages/react` unchanged since `ac7578f3`), amended by CONTEXT D-10a, D-18, D-19.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 (project `react`, happy-dom) + `@testing-library/react` 16.3.3 for the characterisation; plain `describe/it/expect` for the headless owner file; Stryker 10.1.1 (`stryker.react.mjs`); tstyche 7.2.5 unchanged |
| **Config file** | root `vitest.config.ts`; `packages/react/vitest.config.ts`; `stryker.react.mjs` |
| **Quick run command** | `bash -c 'pnpm exec vitest run --project react <file> < /dev/null'` |
| **Full suite command** | `pnpm check:pr < /dev/null` (plus `pnpm spec:package`, `pnpm spec:verify:strict`, the `86-mutation.mjs compare`, each alone) |
| **Estimated runtime** | quick ~3–10 s per file; full gate ~10–20 min; one Stryker file run ~1 min |

---

## Sampling Rate

- **After every task commit:** the one to three vitest files the task touches, plus the matching `86-check.mjs` mode.
- **After every plan wave:** `bash -c 'pnpm exec vitest run --project react < /dev/null'`, `pnpm test:tstyche`, `node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-pinned-check.mjs`, `pnpm circular`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null`, `pnpm spec:package`, `pnpm spec:verify:strict`, mutation `compare`: all green.
- **Max feedback latency:** 60 seconds per task (excluding Stryker runs).

---

## Per-Requirement Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| PREG-01 | LT1–LT18, RL1–RL10, every `QadiProvider.*` test, `edges`, `ServerRender` green and unedited | component / unit (held) | the react vitest suite; `86-pinned-check.mjs` | held | ⬜ pending |
| PREG-01 | create, seed order, subject write, recycle, atoms-replaced characterised on the base (C1–C9) | component (born green) | `… vitest run --project react packages/react/test/QadiProvider.owner.characterisation.test.tsx` | Wave 0 | ⬜ pending |
| PREG-02 | owner imports no React; no `dispose`/`scheduleTask`/`defaultIdleTTL`; nothing at module scope but the factory; in `stryker.react.mjs` | script | `86-check.mjs owner-shape` | Wave 0 | ⬜ pending |
| PREG-02 | owner mutation: no open or `Ignored` mutant, every kill by an owner test; the lease does not fall | mutation | `86-mutation.mjs record base lease` (before any edit), `record close lease`, `record close owner`, `compare` | Wave 0 | ⬜ pending |
| PREG-03 | RO rows, each "recycles nothing" with its "recycles once" twin; the host-refresh row (D-10a) | unit | `… vitest run --project react packages/react/test/RegistryOwner.test.ts`; `86-check.mjs seen-failing` | Wave 0 | ⬜ pending |
| PREG-04 | provider holds one owner ref, four effects in order (commit before hold, hold last), no lifetime branch, none of the old refs | script | `86-check.mjs provider-forwards-only` | Wave 0 | ⬜ pending |
| PREG-04 | provider hidden past a macrotask and shown again renders its decision, no disposed-registry throw | component (held) | `… QadiProvider.lifetime.test.tsx` | exists | ⬜ pending |
| PREG-05 | ADR-QD-199 (with the audit table, count 0), ADR-QD-195 Rev 1.4, BEH-QD-766/767, INV-QD-417/418, traceability, CCR-QD-478 with "Unused" | script + gates | `86-check.mjs records [--close]`; `pnpm spec:verify:strict` | Wave 0 | ⬜ pending |
| WX-01..07 | gate green, reserved ids only, changeset, no forbidden constructs, coverage + mutation, red evidence, trailers, no release | script + gate | `pnpm check:pr < /dev/null`; `86-check.mjs scan-ids` / `scan-forbidden` / `trailers` / `seen-failing` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `QadiProvider.owner.characterisation.test.tsx` (C1–C9), born green on the base, one recorded scratch failure each (`86-RED-EVIDENCE.md`), committed before any `src` file moves.
- [ ] `86-check.mjs`, `86-pinned-check.mjs`, `86-mutation.mjs`, `86-earlier-checks.mjs`, each with `--self-test`; ported from the `85-*.mjs` scripts with every hard-coded `85` name, scratch dir, subject regex and id list changed; trailer exact (D-18).
- [ ] `86-mutation-base.json` taken on a clean tree before any source edit (`record base lease`).
- [ ] `RegistryOwner.test.ts` and its defer helper.
- Framework install: none.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (Stryker excluded)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
