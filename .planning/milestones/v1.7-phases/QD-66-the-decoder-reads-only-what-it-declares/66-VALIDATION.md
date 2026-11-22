---
phase: "66"
slug: "the-decoder-reads-only-what-it-declares"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-22"
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest` |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/core/test/UntrustedDecode.test.ts packages/core/test/UntrustedSeams.test.ts packages/core/test/SinkCodec.test.ts packages/core/test/StoredEnvelope.test.ts packages/react/test/UntrustedSeams.test.ts < /dev/null` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 s for the quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run command
- **After every plan wave:** the quick run plus `node scripts/check-house-style.mjs`, `node scripts/check-api-surface.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| DECL-01 | Under `ignore`, an undeclared throwing accessor is never invoked, directly (U22-U25) and through `sinkWire` (R15, R16) and `storedWire` (S16, S17) | unit | quick run command (5 files, 346 passed); RED on the base: 8 of 127 failed (`66-RED-EVIDENCE.md`, `66-VERIFICATION.md` Truth 1) | ✅ | ✅ green |
| DECL-02 | The projection reads own key names, then each declared value once (a `_tag` only when a union needs it); `refuse` and `unwalked` reads stated in doc and ADR | unit + spec gate | `pnpm exec vitest run packages/core/test/UntrustedDecode.test.ts packages/core/test/UntrustedSeams.test.ts < /dev/null` (read counts U22-U29, R15-R17, S16-S18); `bash spec/scripts/verify-traceability.sh --strict` (PASS 21, FAIL 0) | ✅ | ✅ green |
| DECL-03 | Hydration keeps `refuse`, pinned by a test (H1: an unknown envelope key gives `MalformedPayload`) | unit | `pnpm exec vitest run packages/react/test/UntrustedSeams.test.ts < /dev/null` (in the quick run); `packages/react/src` diff is empty (`66-VERIFICATION.md` Truth 3) | ✅ | ✅ green |
| DECL-04 | Bench gate passes with the band fixed first; `UNTRUSTED_DECODE_BUDGET` unchanged; one `@qadi/core` patch changeset | bench, recorded + gate | `66-BENCH.md`: 0 workloads slower, geomean -2.13%, worst +3.5% vs 5% band, not re-run; `node scripts/check-house-style.mjs < /dev/null` (560 files clean, budget holds); `.changeset/core-decoder-reads-declared-keys.md` | ✅ | ✅ green |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null`, recorded green: 678fb6d3 (`66-VERIFICATION.md`), 68.1 runs, final run on `cd7cd3a1` (not re-run here) | n/a | ✅ green |
| WX-02/03 | Reserved ids only (ADR-QD-170 amended, CCR-QD-457, BEH-QD-666, INV-QD-377); traced; overview names every export (939) | spec gates | `bash spec/scripts/verify-traceability.sh --strict` (PASS 21, FAIL 0); `node scripts/check-api-surface.mjs` (939 exports); `node scripts/spec-revise.mjs --check`; `node scripts/check-dod-table.mjs` (26 steps, 153 references) | n/a | ✅ green |
| WX-04 | No forbidden construct in the diff | lint | `node scripts/check-house-style.mjs < /dev/null` (560 files clean, 3 declared switches, 66 type-test files) | n/a | ✅ green |
| WX-05 | Stryker score of touched files holds | mutation, recorded | `66-mutation-base.json`, `66-mutation-close.json`, `66-mutation-static.json`: `EnvelopeKeys.ts` 1.0000, `SinkCodec.ts` 0.9685 unchanged, `UntrustedDecode.ts` 0.9535 to 0.9565. Not re-run | n/a | ✅ green |
| WX-07 | No plan, phase or requirement id in source or test titles | gate | `node scripts/check-house-style.mjs < /dev/null` (placeholder-id rule); added-lines scan in `66-VERIFICATION.md` WX-07 | n/a | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The RED cases on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `66-RED-EVIDENCE.md` (tests f89e6451 before fix 19fe60a0; variants A-D each fail a test once); `66-VERIFICATION.md` WX-06 row |
| Prose in doc comments, ADR and spec states only what the code holds | DECL-02 (text) | No command parses sentence meaning | Cited evidence: `66-VERIFICATION.md` Truth 6 text-vs-code audit |

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
