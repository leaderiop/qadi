---
phase: "68"
slug: "hygiene-and-recorded-close-outs"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-22"
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`; tstyche; `scripts/check-*.mjs` gates; the phase's record scripts |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/model/ExternalStore.test.ts packages/devtools/test/model/DiagnosticsFeed.test.ts packages/core/test/Admission.test.ts packages/core/test/UntrustedSeams.test.ts packages/core/test/DecisionCache.test.ts packages/core/test/StoredEnvelope.test.ts < /dev/null` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~4 s for the quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run command
- **After every plan wave:** the quick run plus `node scripts/check-house-style.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

Phase directory prefix: `P = .planning/phases/QD-68-hygiene-and-recorded-close-outs`.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| HYGN-01 | Over-width lines hand-wrapped; `admit` reads each field once (OI-10); mutation scores do not fall against a base taken on the post-Phase-67 tree; bench has no slower workload | unit + mutation + bench, recorded | quick run (`Admission.test.ts` E11..E13 in the 236 passed); `node P/68-mutation.mjs --self-test` (16 passed) and `node P/68-mutation.mjs compare` (exit 0: "no file's score fell below its base", 0 new ignored); `node scripts/bench/analyze.mjs --self-test` (25 passed). Stryker and the bench were not re-run; records are `68-mutation-{base,close}.json` and `68-BENCH.md` (verdict pass, 35 workloads, 0 slower) | ✅ | ✅ green |
| HYGN-02 | Stale ids and "stamp" wording changed in titles and comments only | compiler-based comparison + unit | `node P/68-compare.mjs --self-test` (14 passed); `node P/68-compare.mjs 3d66becb packages/core/test/StoredEnvelope.test.ts packages/devtools/test/model/Source.test.ts packages/core/test/FloatingEffectPins.tst.ts` (all `same`); `StoredEnvelope.test.ts` in the quick run (22 passed) | ✅ | ✅ green |
| HYGN-03 | ADR-QD-174 lines re-wrapped in one `spec-revise` bump | spec gate | `node scripts/spec-revise.mjs --check` ("every Revision matches"); `bash spec/scripts/verify-traceability.sh --strict` (PASS 21, FAIL 0); `awk 'length>119 && NR>20' spec/decisions/174-a-decision-cache-is-asked-the-question.md` prints nothing | ✅ | ✅ green |
| HYGN-04 | ADR-QD-173 amendment recorded; no export added | spec gate | `node scripts/check-api-surface.mjs` (939 exports, unchanged); `node scripts/spec-revise.mjs --check`; ADR-QD-173 Rev 1.2 carries the amendment | ✅ | ✅ green |
| HYGN-05 | `61-SETTLED-ITEMS.md` added, no source edit | spec gate + record | `node scripts/check-house-style.mjs` (560 files clean); `git diff --name-only 3d66becb..HEAD -- .planning/milestones/v1.6-phases` lists only `QD-61-…/61-SETTLED-ITEMS.md` | ✅ | ✅ green |
| HYGN-06 | Stale-verification sweep: Phases 62..67 current | script | `node P/68-stale.mjs` (63..67 `current … 0 changed since`, `redo: none`) | ✅ | ✅ green |
| HYGN-07 | OI-01..29 each fixed with evidence or recorded | unit + type pin + gates + scripts | quick run (OI-09 `TimelineFeed.test.ts` TF26..TF29; OI-11/12 `ExternalStore.test.ts` hostile `Proxy`; OI-13 `UntrustedSeams.test.ts` H6/H7; OI-08/14 `DecisionCache.test.ts`; OI-10 `Admission.test.ts` E11..E13: 236 passed); `node scripts/check-house-style.mjs` (OI-15..17 gate and script fixes); `node scripts/spec-revise.mjs --check` and `verify-traceability.sh --strict` (OI-01..07, OI-26..29 text and records); `node scripts/bench/analyze.mjs --self-test` (OI-24, 25 passed); `node scripts/check-dod-table.mjs` (26 steps, 153 references); `pnpm test:tstyche` and gate 14 (OI-01, 19..21) recorded green in `check:pr`, not re-run | ✅ | ✅ green |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null`, recorded green, last on `cd7cd3a1` (not re-run here) | n/a | ✅ green |
| WX-02/03 | Reserved ids only; traced; overview names every export | spec gates | `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-api-surface.mjs`; `node scripts/spec-revise.mjs --check` | n/a | ✅ green |
| WX-04 | No forbidden construct | lint | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green |
| WX-05 | Mutation scores hold; coverage holds | mutation, recorded + full | `node P/68-mutation.mjs compare`; coverage thresholds inside `pnpm check:pr`, recorded green | n/a | ✅ green |
| WX-07 | No plan, phase or requirement id in source or test titles | gate | `node scripts/check-house-style.mjs < /dev/null` (placeholder-id rule) | n/a | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The RED evidence for the two behaviour edits is `68-RED-EVIDENCE.md`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RED evidence recorded before each behaviour change | WX-06 | No command shows order of work | Cited evidence: `68-RED-EVIDENCE.md` (`red-check: all passed`, six RED tests and eight plants); `68-VERIFICATION.md` anti-patterns |
| Reworded comments, ADR and spec prose state what the code holds (OI-01..07) | HYGN-07 (text) | No command parses sentence meaning | Cited evidence: `68-VERIFICATION.md` OI spot-checks |
| Dock `*.characterisation.test.tsx` files unchanged | HYGN-07 (OI-09) | One-off diff, not a standing gate | `git diff --name-only 3d66becb..HEAD -- ':(glob)packages/**/*.characterisation.test.tsx'` prints nothing (re-run for this record); `68-VERIFICATION.md` Truth 2 |

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
