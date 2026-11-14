---
phase: "38"
slug: "the-sink-wire-version-stated-once"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-14"
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Reconstructed from the four PLAN and SUMMARY files (no RESEARCH.md for this phase).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 + `@effect/vitest` 4.1.2; tstyche for compile-time pins; Stryker (core config, `ignoreStatic`) for mutation |
| **Config file** | root `vitest.config.ts` (project `core`, coverage thresholds); `stryker.config.mjs` |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts packages/core/test/SinkCodecAgreement.test.ts && pnpm exec tstyche SinkWire.tst` |
| **Full suite command** | `pnpm test` (202 files, 4953 tests), then `pnpm check:pr < /dev/null` at the phase gate |
| **Estimated runtime** | ~10 seconds (quick); `check:pr` about 2 minutes |

---

## Sampling Rate

- **After every task commit:** the SinkCodec test file, plus `pnpm typecheck` when source is edited and `pnpm test:tstyche` after the pin lands
- **After every plan wave:** `pnpm typecheck && pnpm lint`, and the spec gates (`spec-revise --check`, `spec:verify:strict`, `spec:api`) once records change
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, mutation compare green, the code-only scan finds one line
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| WIRE-01 | the version number appears once in `packages/core/src/Sink*.ts` code (`SinkWire.ts:44`); everything else derives | scan (code lines) | 38-02 Task 1 verify: code-only scan for `Literal(2)`, `version: 2`, `= 2`, `2 as const`, `[2]` finds exactly one hit | n/a | ✅ green (1 hit; 7 at base) |
| WIRE-02 | a retype of the constant fails the type-test gate | tstyche + recorded experiment | `pnpm exec tstyche SinkWire.tst` (5 pins); 38-02 Task 3's mechanical retype verify | ✅ `packages/core/test/SinkWire.tst.ts` | ✅ green (retype: 5/5 pins red, goldens red) |
| WIRE-03 | bytes and key order unchanged; versions absent, 1, 3, `"2"` refused with `supported: [2]`; version 2 decodes | unit (byte golden + written-out rows) | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts` (`v2 bytes` describe; `the read set, written out` describe) | ✅ | ✅ green (155 cases) |
| WIRE-04 | INV-QD-096 amended in place; ADR-QD-151 amends ADR-QD-096 | doc gate | `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:examples` | n/a | ✅ green |
| WIRE-05 | overview names `WIRE_VERSION`; `@qadi/core` minor changeset; `PAYLOAD_VERSION`/`ARCHIVE_VERSION` untouched | doc gate + scope | `pnpm spec:api` (918 exports); 38-03 Task 3 changeset verify | ✅ `.changeset/sink-wire-version-stated-once.md` | ✅ green |
| WX-01 | merge gate green at phase end | gate | `pnpm check:pr < /dev/null` (exit 0 on `7f74dbef`) | n/a | ✅ green |
| WX-02 | only reserved ids used; next-id never run | scan | 38-03/38-04 reserved-id verify | n/a | ✅ green |
| WX-03 | overview names every added export | gate 13 | `pnpm spec:api` | n/a | ✅ green |
| WX-04 | no new `as`/`!`/`any`/`switch`/`fnUntraced`; decode budget unmoved | scan (added lines) + house style | 38-04 Task 1 checks; `pnpm lint` | n/a | ✅ green |
| WX-05 | coverage holds; mutation of touched files does not fall | mutation | `pnpm exec stryker run --mutate "packages/core/src/SinkCodec.ts,packages/core/src/SinkWire.ts"` vs `38-mutation-base.json` | ✅ `38-mutation-after.json` | ✅ green (0.9634 → 0.9752; drop on first run closed by test `72d4a0e2`) |
| WX-06 | characterisations written on the base before the change | commit order | 38-04 Task 1 commit-order check (`chore(38-01)`, `test(38-01)` precede `refactor(38-02)`) | n/a | ✅ green |
| WX-07 | no break, so no Breaking marker or upgrading row; nothing released | scan | 38-04 Task 3 constraint check | n/a | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `38-mutation-base.json` — SinkCodec.ts and SinkWire.ts measured at the base, committed alone and first
- [x] Byte goldens (`V2_DECIDED_ALLOW`, `V2_OBLIGATIONS`) confirmed on the base, not duplicated
- [x] Five written-out read-set rows (`supported: [2]`), green on the base
- [x] Retype-to-3 on the base recorded (the harm), then after the conversion (the fix)

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

**Approval:** validated 2026-11-14 (all twelve requirements automated; SinkCodec and SinkCodecAgreement 166 tests green, SinkWire.tst 5 pins green, full suite 4953 green; mutation 38-mutation-after.json at or above base)

## Validation Audit 2026-11-14

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
