---
phase: "69"
slug: "one-total-thrown-value-to-message-module"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-22"
---

# Phase 69 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest` |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/core/test/ThrownMessage.test.ts packages/core/test/PortWire.test.ts packages/core/test/PortKey.test.ts packages/core/test/PortDescription.test.ts packages/core/test/SinkCodec.test.ts packages/core/test/PortConformance.test.ts packages/core/test/Evaluate.test.ts --project core < /dev/null` (7 files, 642 passed); the same with `packages/http/test/PortRoutes.test.ts --project http` (64), `packages/react/test/DeveloperSignals.test.ts --project react` (35), and the six devtools `model/` tests (Capture, ExplorerSession, TimelineFeed, DiagnosticsFeed, DiagnosticsStore, GatesFeed) `--project devtools` (227) |
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
| THRW-01 | Each previously unguarded site stays total for a value whose `toString` and `message` getter both throw: RED on the base (21 titles, 24 failed assertions, `69-RED-EVIDENCE.md`), green now | unit | the quick runs above (core R1-R9, http H1, react S1-S3/P1/P2, capture C1-C3, devtools E1/E2/F1-F3) | ✅ | ✅ green |
| THRW-02 | `thrownMessage` and `causeMessage` exported from `@qadi/core`; guard `message`, `String()` and `Cause.pretty`; one placeholder | unit | `pnpm exec vitest run packages/core/test/ThrownMessage.test.ts --project core < /dev/null`; `node scripts/check-api-surface.mjs` | ✅ | ✅ green |
| THRW-03 | All six core sites, http, react, capture and every devtools Cause site read through the rule; no inline rendering remains | unit + gate | the quick runs; `/usr/bin/grep -rnE "instanceof Error \? .*(message\|String)\|Cause\.pretty\(" packages/*/src` finds only `ThrownMessage.ts` and `GatesFeed.ts:113`'s try-guarded identity key (never shown) | ✅ | ✅ green |
| THRW-04 | Table test on the function (Error, plain value, throwing `toString`, throwing `message`, both); `SinkCodec` and `CustomPredicate` pins on the one placeholder | unit | `pnpm exec vitest run packages/core/test/ThrownMessage.test.ts packages/core/test/SinkCodec.test.ts packages/core/test/PortConformance.test.ts --project core < /dev/null` | ✅ | ✅ green |
| THRW-05 | ADR-QD-182 and INV-QD-383/384 state the rule, traced | spec gate | `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/spec-revise.mjs --check` | ✅ | ✅ green |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null`, recorded green on 81678a58 (`69-09-SUMMARY.md`); not re-run here | n/a | ✅ green |
| WX-02/03 | Reserved ids only; overview names `thrownMessage` and `causeMessage` | spec gates | `node scripts/check-api-surface.mjs`; `node scripts/check-dod-table.mjs`; `bash spec/scripts/verify-traceability.sh --strict` | n/a | ✅ green |
| WX-04 | No forbidden construct added | lint | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green |
| WX-05 | Stryker score of touched files holds | mutation, recorded | `69-mutation-base.json`, `69-mutation-close.json`, `node 69-mutation.mjs compare` exit 0 (`69-09-SUMMARY.md`). Not re-run | n/a | ✅ green |
| WX-06 | Behaviour changes preceded by RED tests on the base | recorded | `69-RED-EVIDENCE.md`; reds in plans 01-03 precede source in 04-06 | n/a | ✅ green |
| WX-07 | No decision, plan or phase id in source or test titles | gate | `node scripts/check-house-style.mjs < /dev/null` (placeholder-id rule); per-plan added-line scans | n/a | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The RED cases on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `69-RED-EVIDENCE.md`; plan 01-03 summaries |
| Nothing released or published | WX-07 | Absence of an action | Cited evidence: `69-09-SUMMARY.md` |

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
