---
phase: "70"
slug: "hydration-s-drop-events-come-from-its-buckets"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-22"
---

# Phase 70 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`; tstyche for type tests |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/react/test/HydrationDropEvents.test.ts packages/react/test/HydrationPayload.test.ts --project react < /dev/null` (2 files, 76 passed); `pnpm test:tstyche HydrationBuckets` (11 tests, 29 assertions) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 s per quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run commands
- **After every plan wave:** the quick runs plus `node scripts/check-house-style.mjs`, `node scripts/check-api-surface.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| DRPE-01 | A bucket without an event, and a payload or dehydration reason without a producer, is a compile error; RED on the base (`70-RED-EVIDENCE.md`), green now | type + recorded experiment | `pnpm test:tstyche HydrationBuckets`; the payload conformance describe in `HydrationPayload.test.ts` | ✅ | ✅ green |
| DRPE-02 | Hydrate buckets are one record keyed by `EntryDropReason`; events derived in one place | unit + type | `HydrationDropEvents.test.ts`, `HydrationBuckets.tst.ts` | ✅ | ✅ green |
| DRPE-03 | Dehydrate `LeftOut` events derived the same way | unit + type | same | ✅ | ✅ green |
| DRPE-04 | Events, order and counts identical to the base for every input (32-row characterisation, green on the untouched base) | unit | `pnpm exec vitest run packages/react/test/HydrationDropEvents.test.ts --project react < /dev/null` | ✅ | ✅ green |
| DRPE-05 | ADR-QD-183 cites and amends ADR-QD-152; INV-QD-045 restated; payload question decided | spec gate | `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/spec-revise.mjs --check` | ✅ | ✅ green |
| WX-01 | Merge gate (contribution) | full | `pnpm check:pr < /dev/null`, recorded green on b3903857 (`70-07-SUMMARY.md`); not re-run | n/a | ✅ green (milestone-wide row) |
| WX-02/03 | Reserved ids only; `spec/overview.md` unchanged, 941 exports documented | spec gates | `node scripts/check-api-surface.mjs`; `bash spec/scripts/verify-traceability.sh --strict` | n/a | ✅ green (contribution) |
| WX-04 | No forbidden construct added | lint | `node scripts/check-house-style.mjs < /dev/null` (566 files clean) | n/a | ✅ green (contribution) |
| WX-05 | Stryker score of touched files holds | mutation, recorded | `70-mutation-base.json`, `70-mutation-close.json`, `node 70-mutation.mjs compare` exit 0. Not re-run | n/a | ✅ green (contribution) |
| WX-06 | Characterisation and RED type pins written on the base | recorded | `70-RED-EVIDENCE.md`; plans 01-02 precede source change in 03-04 | n/a | ✅ green (contribution) |
| WX-07 | No decision, plan or phase id in source or titles; nothing released | gate | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green (contribution) |

*Status: ✅ green · ❌ red · ⚠️ flaky*

WX-01 to WX-07 span the whole milestone; this table records Phase 70's contribution, not their completion.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The characterisation and the RED type pins on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `70-RED-EVIDENCE.md`; 70-01 and 70-02 summaries |
| Nothing released or published | WX-07 | Absence of an action | Cited evidence: `70-07-SUMMARY.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-22

## Validation Audit 2026-11-22

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
