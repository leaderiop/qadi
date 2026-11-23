---
phase: "75"
slug: "a-declared-span-shape-for-the-evaluate-family"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-23"
---

# Phase 75 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`; tstyche for type tests |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/core/test/EvaluationSpan.contract.test.ts packages/core/test/EvaluationSpan.test.ts packages/core/test/Evaluate.test.ts packages/core/test/Predicate.test.ts packages/core/test/GuardHealthCheck.test.ts packages/core/test/SubjectSet.test.ts packages/core/test/PortSpan.test.ts --project core < /dev/null` (7 files, 454 passed); `pnpm test:tstyche < /dev/null` (72 files, 398 passed, 2 skipped) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 s per quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run commands
- **After every plan wave:** the quick runs plus `node scripts/check-house-style.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`, `node .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-contract-check.mjs`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| ESPN-01 | The outcome key (`qadi.outcome`: Allow, Deny, Failed) and no dual write are decided and recorded before any source change | spec gates | `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict` (21 pass) | ✅ | ✅ green |
| ESPN-02 | A failed `qadi.evaluate` span carries its subject, evaluation id and question, plus outcome Failed and its error tag: red on the base, green now; an interrupted or defected evaluation carries its question and no outcome | integration | `EvaluationSpan.contract.test.ts` (33 rows, held to its first commit ecb0256f); `Evaluate.test.ts`; `node .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-contract-check.mjs` (exit 0) and `--self-test` (28 passed) | ✅ | ✅ green |
| ESPN-03 | Every span of the family (evaluate, toPredicate, guardHealthCheck, decideSubject, decideSubjects, decideSubjectsStream) declared once with its name, question and answer; question annotated before the lookup; one outcome key tied to `Decision["_tag"] \| "Failed"`; the denial event a log-only struct | unit + type | `EvaluationSpan.test.ts` (plain values, identity of shared fields, round trip of every struct); `pnpm test:tstyche` (`EvaluationSpan.tst.ts`: outcome tie, key refusals, a denial event refused by every span-writing function and accepted by a log line); `PortSpan.test.ts` | ✅ | ✅ green |
| ESPN-04 | `Lifecycle.ts`, `Predicate.ts`, `SubjectSet.ts`, `GuardHealthCheck.ts` write span keys only through the declaration; tests read keys from it | integration + lint | `Predicate.test.ts`, `GuardHealthCheck.test.ts`, `SubjectSet.test.ts`, `Evaluate.test.ts`; `node scripts/check-house-style.mjs < /dev/null` (581 files clean; `[span-key-source]`, `[span-key-literal]`, `[span-key-literal-table]` with `SPAN_KEY_LITERAL_BUDGET`, each plant shown failing in `75-RED-EVIDENCE.md`) | ✅ | ✅ green |
| ESPN-05 | Behavior doc, invariant, traceability, changeset and upgrade guide describe the span change; ADR-QD-188 extends ADR-QD-051 and ADR-QD-109 | spec gates | `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-api-surface.mjs` | ✅ | ✅ green |
| Mutation | Core group 362/362 killed; `EvaluationSpan.ts` 3/3 valid with 38 Ignored, none unexamined; `PortSpanEncode.ts` 0/0 valid with 6 Ignored, none unexamined; no file has an open mutant its base did not have; re-closed at 6e1ffc3e | mutation, recorded | `node .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation.mjs compare` (exit 0, against `75-mutation-close.json`) | ✅ | ✅ green |
| WX-01 | Merge gate (contribution) | full | `pnpm check:pr < /dev/null`, 17/18 steps green on 119acab6, mutation skipped by design | n/a | ✅ green (milestone-wide row) |
| WX-02/03 | Reserved ids only (ADR-QD-188, CCR-QD-467, BEH-QD-711..715, INV-QD-395/396); `next-id.mjs` not run | spec gates | `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-api-surface.mjs` | n/a | ✅ green (contribution) |
| WX-04 | No forbidden construct added; the new `any`-free, `switch`-free source; AGENTS.md §6 table agrees with the span-key budget | lint | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green (contribution) |
| WX-05 | Stryker score of touched files holds | mutation, recorded | `75-mutation-base.json`, `75-mutation-close.json`; compare above. Not re-run here | n/a | ✅ green (contribution) |
| WX-06 | Contract written on the base (15 rows green, 18 red); each guard and plant shown failing once | recorded | `75-RED-EVIDENCE.md` | n/a | ✅ green (contribution) |
| WX-07 | No decision, plan or phase id in source or titles; nothing released | gate | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green (contribution) |

*Status: ✅ green · ❌ red · ⚠️ flaky*

WX-01 to WX-07 span the whole milestone; this table records Phase 75's contribution, not their completion.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The contract and the RED evidence on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Position of each annotation inside its writer | ESPN-03 | INV-QD-395 says review keeps it; the seven failed-span contract rows pin the observable result, no gate checks position | Read the writers in `Lifecycle.ts`, `Predicate.ts`, `GuardHealthCheck.ts` |
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `75-RED-EVIDENCE.md`; 75-02 and 75-03 summaries |
| Nothing released or published | WX-07 | Absence of an action | Cited evidence: `75-09-SUMMARY.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-23

## Validation Audit 2026-11-23

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
