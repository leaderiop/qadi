---
phase: "40"
slug: "core-owns-describing-a-decode-refusal"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
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
| 40-01-01 | 01 | 1 | WX-05, WX-02 | T-40-01 | baseline committed alone, first; reserved ids free | mutation | three Stryker runs → `40-mutation-base.json`, then the writer's node check | ✅ | ✅ green |
| 40-01-02 | 01 | 1 | DREF-01, WX-02 | T-40-02 | ADR-QD-153 before any code | spec | node order and content check; `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` | ✅ | ✅ green |
| 40-02-01 | 02 | 2 | DREF-01, WX-06 | T-40-03 | five drop words pinned on the base | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts` + JSON-report node check | ✅ | ✅ green |
| 40-02-02 | 02 | 2 | DREF-05, WX-06 | T-40-03 | Malformed messages written out; base bench | unit | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts` + node check | ✅ | ✅ green |
| 40-02-03 | 02 | 2 | DREF-05, WX-06 | T-40-04 | audit differential on the base | unit | `pnpm exec vitest run --project audit packages/audit/test/AuditEntryDifferential.test.ts` | ✅ | ✅ green |
| 40-03-01 | 03 | 3 | DREF-02 | T-40-05 | tracer: one mapping, `decodeRefusalOf` | unit | node shape check + `pnpm typecheck && pnpm circular` | ✅ | ✅ green |
| 40-03-02 | 03 | 3 | DREF-02, DREF-03 | T-40-06, T-40-07 | describer total and bounded; annotations tag-only | unit (tdd) | `pnpm exec vitest run --project core packages/core/test/DecodeRefusal.test.ts` + node check | ✅ | ✅ green |
| 40-03-03 | 03 | 3 | DREF-02, WX-04 | T-40-05 | reader types pinned | type | `pnpm exec tstyche SinkWire.tst` | ✅ | ✅ green |
| 40-04-01 | 04 | 4 | DREF-05, WX-04 | T-40-08, T-40-09 | one strict decode, counted; goldens unchanged | unit | vitest core SinkCodec + budget/allowlist node check + `pnpm lint` | ✅ | ✅ green |
| 40-04-02 | 04 | 4 | DREF-05 | T-40-10 | single-decode types pinned; bench after | type | `pnpm exec tstyche SinkWire.tst` + bench grep | ✅ | ✅ green |
| 40-05-01 | 05 | 5 | DREF-04, DREF-07 | T-40-12 | onMalformed receives DecodeRefusal; log tag-only | unit (tdd) | vitest devtools JSON-report node check; `pnpm exec tstyche Source.tst`/`surface.tst` | ✅ | ✅ green |
| 40-05-02 | 05 | 5 | DREF-02, DREF-07 | T-40-14 | example reads the describer; new refusal fails in core only | build | `pnpm run build && pnpm --filter @qadi/example-nextjs typecheck && pnpm --filter @qadi/example-nextjs test` | ✅ | ✅ green |
| 40-06-01 | 06 | 6 | DREF-05, DREF-06 | T-40-15, T-40-16 | audit decodes once; budget row gone | unit | `pnpm exec vitest run --project audit packages/audit/test` + node check | ✅ | ✅ green |
| 40-06-02 | 06 | 6 | DREF-05 | T-40-15 | entry record is the strict decode's JSON form | unit | vitest audit JSON-report node check | ✅ | ✅ green |
| 40-07-01 | 07 | 7 | WX-02 | T-40-17 | ADR measured; INV-QD-104 amended; INV-QD-325 | spec | node record check; `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ✅ green |
| 40-07-02 | 07 | 7 | WX-03, DREF-07 | T-40-17 | BEH-QD-536/537; BEH-QD-204; overview | spec | node record check; `pnpm spec:api` | ✅ | ✅ green |
| 40-08-01 | 08 | 8 | WX-07, DREF-07 | T-40-18, T-40-19 | Breaking changeset and 0.13 upgrade note; nothing consumed | docs | node check; `pnpm run build && pnpm spec:website-examples` | ✅ | ✅ green |
| 40-08-02 | 08 | 8 | DREF-07 | T-40-18 | README, website page, route comment | docs | node check; `pnpm spec:examples && pnpm spec:website-examples && pnpm lint` | ✅ | ✅ green |
| 40-08-03 | 08 | 8 | WX-02 | T-40-19 | CCR-QD-431 row complete | spec | node row check; `pnpm spec:verify:strict` | ✅ | ✅ green |
| 40-09-01 | 09 | 9 | WX-02, WX-03, WX-04, WX-06 | T-40-20 | gates untouched beyond allowlist; order; ids | integrity | six node checks; `pnpm spec:api && pnpm circular` | ✅ | ✅ green |
| 40-09-02 | 09 | 9 | WX-05 | T-40-21 | no score fell; SinkWire.ts at 1 | mutation | three Stryker runs + comparison node check | ✅ | ✅ green |
| 40-09-03 | 09 | 9 | WX-01, WX-07 | T-40-22 | merge gate green; nothing released | gate | `pnpm spec:website-examples && pnpm example && pnpm check:pr < /dev/null` + release node check | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `40-mutation-base.json`, committed alone first (core `SinkWire.ts`/`SinkCodec.ts`, devtools `Source.ts`, audit `AuditEntry.ts`)
- [x] ADR-QD-153 (the compatibility decision) before any code
- [x] Five-word table pin in `packages/devtools/test/model/Source.test.ts`, green on the base
- [x] Malformed-message table in `packages/core/test/SinkCodec.test.ts`, green on the base
- [x] Audit differential rows (unknown envelope key, key order, `undefined` fields, a float, 60,000-deep) green on the base

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

**Approval:** validated 2026-11-14 (every task has an automated verify, each recorded green in its SUMMARY; `pnpm check:pr` green on the final tree in 40-09; 40-09-01 checks 3 and 4 failed only on recorded plan-verify defects: the Sonnet 5.5 commit trailer and over-matches on 40-05's own absence pins)

## Validation Audit 2026-11-14

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
