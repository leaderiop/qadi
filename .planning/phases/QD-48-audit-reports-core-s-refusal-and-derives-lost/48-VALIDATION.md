---
phase: "48"
slug: "audit-reports-core-s-refusal-and-derives-lost"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-16"
---

# Phase 48: Validation Strategy

> The validation contract for feedback sampling during this phase's execution. Seeded from `48-RESEARCH.md` § Validation Architecture, with the user's decisions D-01..D-14 and D-03a, D-05a, D-06a, D-10a (48-CONTEXT.md).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 with `@effect/vitest` (`it.effect`), project `audit`. Type pin: tstyche 7.2.5. Per-file mutation comparison: Stryker (`stryker.audit.mjs` with `--mutate`). |
| **Config file** | `packages/audit/vitest.config.ts`, root `vitest.config.ts` (coverage thresholds), `tstyche.json`, `stryker.audit.mjs` |
| **Quick run command** | `pnpm exec vitest run --project audit packages/audit/test/AuditWriteOutput.test.ts packages/audit/test/AuditLostAgreement.test.ts packages/audit/test/AuditWriteOutcome.test.ts packages/audit/test/AuditEntry.test.ts packages/audit/test/AuditDecisionSinkLive.test.ts packages/audit/test/AuditWriteExits.test.ts packages/audit/test/Metrics.test.ts`. Always run from the repo root. |
| **Full suite command** | `pnpm check:pr < /dev/null` (all of `pnpm check` except `pnpm mutation`) |
| **Type check** | `pnpm exec tsc -p tsconfig.test.json` (about 3 s warm) |
| **Estimated runtime** | Quick runs take about 2 s, the audit suite 1.5 s, and `check:pr` about 5 minutes. Stryker on the four audit files takes about 21 s. |

---

## Sampling Rate

- **After every task commit:** the quick run for the files touched, plus `pnpm exec tsc -p tsconfig.test.json` after any `src` edit.
- **After each of AREF-01/-02/-03:** `pnpm exec vitest run --project audit`, `node scripts/check-house-style.mjs` and `pnpm circular`.
- **Before `/gsd-verify-work`:**
  - `pnpm check:pr < /dev/null` is green;
  - the Stryker comparison against `48-mutation-base.json` exits 0.
- **Max feedback latency:** 60 seconds.
- **RED files:** until AREF-01 lands, a verify step that would run `packages/audit/test/AuditRefusal.tst.ts` excludes it by exact path.

---

## Per-Task Verification Map

Each plan fills in its own tasks. The requirement map below is the contract.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| AREF-01 | `onRefused`'s parameter, `AuditWriteOutcome.Refused.refusal` and `encodeAuditEntry`'s error are core's `SinkRecordNotEncodable`. This is RED on the base. | tstyche | `pnpm exec tstyche packages/audit/test/AuditRefusal.tst.ts` | Wave 0 | ✅ green |
| AREF-01 | `encodeAuditEntry` fails with an instance of core's class | unit | `pnpm exec vitest run --project audit packages/audit/test/AuditEntry.test.ts` | exists (edited) | ✅ green |
| AREF-01 | The default refusal warning is byte-identical: the message and exactly three annotations. The hook payload's `recordTag`, `evaluationId` and `refusal` are unchanged. | characterisation | `pnpm exec vitest run --project audit packages/audit/test/AuditWriteOutput.test.ts` | Wave 0 (green on base) | ✅ green |
| AREF-02 | The eleven leaves' lines (level, message, annotations, cause), span attributes and counter deltas are unchanged | characterisation | same file | Wave 0 (green on base) | ✅ green |
| AREF-02 (D-06/D-06a) | Lost ⇔ a lost counter ⇔ span `"Lost"` over all eleven leaves; warning ⇔ Lost over the six unwritten leaves | table | `pnpm exec vitest run --project audit packages/audit/test/AuditLostAgreement.test.ts` | Wave 0 (green before and after) | ✅ green |
| AREF-02 (D-05/D-05a) | One row per `UnwrittenStaging` variant. `durabilityOf`, the lost label and the unwritten line's level read it. `unwrittenDurability` and `lostStaging` are gone. | unit + grep | the row's test; `bash -c '! /usr/bin/grep -nE "unwrittenDurability\|lostStaging" packages/audit/src/*.ts'` | with the row | ✅ green |
| AREF-03 (D-09/D-10/D-10a) | `StageResult` is a closed union. `writtenStaging`, `evaluationIdOf` and `outcomePath` are exhaustive, and no `_tag ===` branch is left in the audit report or the sink. | existing + grep + tsc | `AuditWriteExits.test.ts`; `bash -c '! /usr/bin/grep -nE "_tag === \"(Refused\|StageFailed)\"" packages/audit/src/AuditWriteReport.ts packages/audit/src/AuditDecisionSinkLive.ts'` | exists | ✅ green |
| AREF-04 | ADR-QD-161 is recorded, and the changeset is Breaking | review + gates | `pnpm spec:verify:strict`; `pnpm spec:api`; `.changeset/*.md` front matter | at close | ✅ green |
| WX-01 | The merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ✅ green |
| WX-02 | Only reserved ids are used (ARCH-95, ADR-QD-161, CCR-QD-439, BEH-QD-576..580, INV-QD-341..342) | lint | `pnpm lint` (`[no-numbering-placeholder]`) | ✅ | ✅ green |
| WX-03 | The overview drops `AuditEntryNotEncodable` and adds nothing new | gate 13 | `pnpm spec:api` | ✅ | ✅ green |
| WX-04 | Nothing forbidden is added, and the budgets are unchanged | lint + scan | `pnpm lint`; `git diff <base> -- scripts/check-house-style.mjs` is empty | ✅ | ✅ green |
| WX-05 | Coverage holds, and no touched file's Stryker score drops | coverage + mutation | `pnpm coverage`; the `stryker.audit.mjs --mutate` run, then the comparer against `48-mutation-base.json` | base JSON Wave 0 | ✅ green |
| WX-06 | Tests come before the change | git order | The base JSON, the characterisation, the agreement table and the RED pin precede the first `packages/*/src` edit | n/a | ✅ green |
| WX-07 | The change is recorded as Breaking | file | `.changeset/*.md` with `"@qadi/audit": minor` and **Breaking**; the 0.13 `upgrading.md` entry; `pnpm spec:website-examples` | at close | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `48-mutation-base.json`, committed alone as the phase's first commit. It holds base scores for `AuditEntry.ts`, `AuditWriteOutcome.ts`, `AuditWriteReport.ts` and `AuditDecisionSinkLive.ts`, re-measured on the untouched tree.
- [x] `packages/audit/test/AuditWriteOutput.test.ts` (with its leaf driver): the eleven-leaf characterisation, green on the base.
- [x] `packages/audit/test/AuditLostAgreement.test.ts`: the agreement table, green on the base.
- [x] `packages/audit/test/AuditRefusal.tst.ts`: the type pin, RED on the base.

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-16 (State A audit: every requirement covered by a green automated check; WX-01 by 48-08's `check:pr` exit 0, WX-05 by `48-mutation-after.json` — all five files at 1)

## Validation Audit 2026-11-16

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
