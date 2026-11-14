---
phase: "40"
slug: "core-owns-describing-a-decode-refusal"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-14"
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from `40-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 + `@effect/vitest` (projects `core`, `devtools`, `audit`); tstyche 7.2.5 with checked `@ts-expect-error` directives; per-package Stryker 10.1.1 (`stryker.config.mjs`, `stryker.devtools.mjs`, `stryker.audit.mjs`) |
| **Config file** | root `vitest.config.ts` (coverage: core 95%, others 90%); `tstyche.json` |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/DecodeRefusal.test.ts packages/core/test/SinkCodec.test.ts && pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts && pnpm exec vitest run --project audit packages/audit/test/AuditEntry.test.ts packages/audit/test/UntrustedSeams.test.ts && pnpm exec tstyche SinkWire.tst Source.tst surface.tst` |
| **Full suite command** | `pnpm test`, then `pnpm check:pr < /dev/null` at the phase gate |
| **Estimated runtime** | ~20 seconds (quick); `check:pr` about 3 minutes |

---

## Sampling Rate

- **After every task commit:** the quick-run files the task edits; `pnpm typecheck` when `src` changes; `node scripts/check-house-style.mjs` when a budget, exemption or counted token moves
- **After every plan wave:** `pnpm typecheck && pnpm lint && pnpm circular`, `pnpm exec tstyche`, `pnpm run build`, and the spec gates once records change
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, the three Stryker compares, `pnpm spec:website-examples` run explicitly, `pnpm example`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Filled by the planner from the plans' `<automated>` verify blocks; the per-requirement map is in `40-RESEARCH.md` § Validation Architecture.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | WX-05, WX-06 | — | baseline committed alone, first | mutation | three Stryker runs → `40-mutation-base.json` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `40-mutation-base.json`, committed alone first (core `SinkWire.ts`/`SinkCodec.ts`, devtools `Source.ts`, audit `AuditEntry.ts`)
- [ ] ADR-QD-153 (the compatibility decision) before any code
- [ ] Five-word table pin in `packages/devtools/test/model/Source.test.ts`, green on the base
- [ ] Malformed-message table in `packages/core/test/SinkCodec.test.ts`, green on the base
- [ ] Audit differential rows (unknown envelope key, key order, `undefined` fields, a float, 60,000-deep) green on the base

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
