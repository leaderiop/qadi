---
phase: "76"
slug: "remedies-uses-core-s-signature-match"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-23"
---

# Phase 76 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`; tstyche for type tests |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/core/test/SignatureHistory.test.ts packages/core/test/DecisionHistory.test.ts packages/core/test/LeafNeeds.test.ts packages/core/test/PortKey.test.ts packages/core/test/SinkCodec.test.ts --project core < /dev/null` (297 passed); `pnpm exec vitest run packages/devtools/test/model --project devtools < /dev/null` (1411 passed); `pnpm exec vitest run packages/http/test/QadiHttpError.test.ts --project http < /dev/null` (55 passed); `pnpm test:tstyche < /dev/null` (74 files, 400 passed, 2 skipped) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 to 8 s per quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run commands
- **After every plan wave:** the quick runs plus `node scripts/check-house-style.mjs`, `node scripts/check-api-surface.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`, `node .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-agreement-check.mjs`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| SIGM-01 | Remedies' "already met" verdict for a `hasSignature` leaf (and for an acted leaf) agrees with what `evaluate` answers over `fixturePortsLayer`, over subjects, resources, meanings and signer roles including an absent one; written on the base, green there, held to its first commit 22d5b10c | integration | `RemedySignatureConformance.test.ts`, `RemedyActedConformance.test.ts`, `packages/devtools/test/remedyAgreement.ts`; `node .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-agreement-check.mjs` (3 frozen, 3 append-only files) and `--self-test` (28 passed) | ✅ | ✅ green |
| SIGM-02 | Remedies asks core (`signatureAnswerFromSignatures`, `actedAnswerFromEvents`), each sharing one lookup and one answer rule with its port read; the inline match is gone; a refused fixture is skipped, not offered a row; the lookups, judgements, port reads and `remedyEdits` fail typed or skip for any value (symbols, null rows, throwing getters, revoked Proxies, throwing iterators) | unit + integration | `SignatureHistory.test.ts`, `DecisionHistory.test.ts`, `PortKey.test.ts`, `LeafNeeds.test.ts` (core); `Remedies.test.ts`, `RemedyTotality.test.ts` (devtools); `SignatureHistory.tst.ts`, `DecisionHistory.tst.ts` | ✅ | ✅ green |
| SIGM-03 | `SignatureMatch.ts` stays out of the barrel; each added export is named in `spec/overview.md` and probed by the packed install (940 documented exports; 526 packed runtime exports, equal to the base); `ActedEvent`, `ActedAnywhere`, `ActedAnywhereInput` removed | gate | `node scripts/check-api-surface.mjs`; `scripts/check-package-install.mjs` (part of `check:pr`, not re-run here) | ✅ | ✅ green |
| SIGM-04 | The custom-predicate refusal is one sentence, `NO_CUSTOM_PREDICATE_FIELD.reason` in `SimulationFields.ts`, which `Remedies.ts` reads | unit | `SimulationFields.test.ts` (the cell's value and `FIXTURE_DATA.CustomPredicate` identity); `Remedies.test.ts` (the skip reason equals the cell's) | ✅ | ✅ green |
| SIGM-05 | ADR-QD-189 records the change with CCR-QD-468; behaviour docs, invariants, traceability, changesets and the 0.13 upgrade guide agree | spec gates | `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict` (21 pass, 0 fail) | ✅ | ✅ green |
| Mutation | Close after code review on e2260f94: core `SignatureHistory.ts` 109/110 (the survivor is the base's equivalent `makeResourceId` line, paired by a MOVED entry), `SignatureMatch.ts` 14/14, `PortAccess.ts` 43/43, `DecisionHistory.ts` 64/64, `Errors.ts` 1/1; devtools `Remedies.ts` 288/288, `SimulationFields.ts` 190/190; http `QadiHttpError.ts` 34/34; close-only keys `PortKey.ts` 21/21, `ScopedLeaf.ts` 7/7, `LeafNeeds.ts` 9/9, `PortDerivation.ts` 2/2 | mutation, recorded | `node .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-mutation.mjs compare` (exit 0, against `76-mutation-close.json`) | ✅ | ✅ green |
| WX-01 | Merge gate (contribution) | full | `pnpm check:pr < /dev/null`, 17/18 steps green on 446f0b27 and again on 15acdb65, mutation skipped by design | n/a | ✅ green (milestone-wide row) |
| WX-02/03 | Reserved ids only (ADR-QD-189, CCR-QD-468, BEH-QD-716..720, INV-QD-397/398); `next-id.mjs` not run; overview names `signatureAnswerFromSignatures` and `actedAnswerFromEvents` | spec gates | `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-api-surface.mjs` | n/a | ✅ green (contribution) |
| WX-04 | No forbidden construct added | lint | `node scripts/check-house-style.mjs < /dev/null` (585 files clean, 3 declared switches) | n/a | ✅ green (contribution) |
| WX-05 | Stryker score of touched files holds; coverage core 99.90, devtools 99.79, http 100 | mutation, recorded | `76-mutation-base.json`, `76-mutation-close.json`; compare above | n/a | ✅ green (contribution) |
| WX-06 | Agreement tests written on the base; each new check shown failing once | recorded | `76-RED-EVIDENCE.md` | n/a | ✅ green (contribution) |
| WX-07 | No decision, plan, requirement or phase id in source or titles; nothing released or pushed | gate | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green (contribution) |

*Status: ✅ green · ❌ red · ⚠️ flaky*

WX-01 to WX-07 span the whole milestone; this table records Phase 76's contribution, not their completion.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The agreement tests and the RED evidence on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `signatureMatches` stays out of `@qadi/core`'s barrel | SIGM-03 | No test names its absence; gate 13 fails on an undocumented barrel export and gate 14 on a changed runtime export count, so a leak is caught indirectly | Read `packages/core/src/index.ts`: no `SignatureMatch.ts` line |
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `76-RED-EVIDENCE.md`; 76-01 to 76-03 summaries |
| Nothing released, published or pushed | WX-07 | Absence of an action | Cited evidence: `76-08-SUMMARY.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-23

## Validation Audit 2026-11-23

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
