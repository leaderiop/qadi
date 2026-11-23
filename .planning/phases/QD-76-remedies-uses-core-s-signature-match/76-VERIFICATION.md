---
phase: QD-76-remedies-uses-core-s-signature-match
verified: 2026-11-23T21:10:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-01-PLAN.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-01-SUMMARY.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-02-PLAN.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-02-SUMMARY.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-03-PLAN.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-03-SUMMARY.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-04-PLAN.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-04-SUMMARY.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-05-PLAN.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-05-SUMMARY.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-06-PLAN.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-06-SUMMARY.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-07-PLAN.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-07-SUMMARY.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-08-PLAN.md
  - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-08-SUMMARY.md
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/PortKey.ts
  - packages/core/src/ScopedLeaf.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/src/SignatureMatch.ts
  - packages/devtools/src/model/Remedies.ts
  - packages/devtools/src/model/SimulationFields.ts
  - packages/devtools/test/model/RemedyActedConformance.test.ts
  - packages/devtools/test/model/RemedySignatureConformance.test.ts
  - packages/devtools/test/remedyAgreement.ts
  - scripts/check-package-install.mjs
covered_digest: "v4:sha256:9966464eefa0b7f212a326888db4033ab737a9ebb966793d3d34f1345861c85e"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 76: Remedies uses core's signature match Verification Report

**Phase Goal:** Remedies' "already met" verdict for a fixture signature is core's own answer, or the phase records why no shape fits without widening core's public surface, and either way an agreement test pins Remedies to the fixture signature port.
**Verified:** 2026-11-23
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth (roadmap criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| 1 | An agreement test written on the phase base compares Remedies' verdict with the fixture port's own answer over subjects, resources, meanings and signer roles (including no signer role), plus the acted twin; red on the base where recorded, green now | VERIFIED | Commit `22d5b10c` is the first commit under `packages/` after the base (`git log --reverse bf339146..HEAD -- packages`), touches tests only (no `packages/*/src`), and follows the ADR commit `0fc9f17f`. `RemedySignatureConformance.test.ts` crosses 4 sites x 4 leaves x 74 lists = 1184 cases; `RESOURCE_IDS = [undefined, "doc-1", "doc-2"]`, `ROLES = [undefined, "approver", "other"]`, a list that is absent; the count row asserts 1184. The acted twin (`RemedyActedConformance.test.ts`) covers 144 cases. `76-RED-EVIDENCE.md` records, in three runs on the base, signature 5 pass / 2 fail, acted 1 pass / 6 fail (14 distinct `Any`-scope mismatches), core 22 pass / 5 fail, with the first failure line of each refusal row. Now: `node 76-agreement-check.mjs` exit 0 ("3 frozen and 3 append-only file(s) hold the statements of 22d5b10c"); `--self-test` 28 passed, exit 0. The five conformance, totality, remedy and field test files: 195/195 pass. |
| 2 | Remedies asks core and the inline `.some(held => …)` match is gone | VERIFIED | `Remedies.ts` imports `actedAnswerFromEvents` and `signatureAnswerFromSignatures` and calls them at the `Acted` and `Signature` arms (lines 602 and 632); the arm builds the row only when core says unmet, with the request's own resource id taken from `signatureHistoryPort.asks`. A grep of `packages/devtools/src` for `held.`/`.signerRole ===`/`.meaning ===` finds only `SimulationForm.ts` duplicate checks (`sameSignature`, the form's own equality, not the match) and prose; the remaining `.some(` calls are `SimulationFields.ts` element-equality and `Timeline.ts`, unrelated. The one signature lookup and the answer rule are shared with the port read (`SignatureMatch.ts` header; `askSignature` and `signatureAnswerFromSignatures` both use it), and each fixture's lookup is module-private and read by its layer and its judgement. Core tests (SignatureHistory, DecisionHistory, PortKey, LeafNeeds, SinkCodec, PortAccess): 366/366 pass; http `QadiHttpError.test.ts` 55/55. |
| 3 | `SignatureMatch.ts` stays package-private; every added export is named in `spec/overview.md` and probed by the packed-install gate | VERIFIED | `grep SignatureMatch packages/*/src/index.ts` and `packages/core/package.json`: no hit; the file is read only by `SignatureHistory.ts` and `PortAccess.ts`. The barrel reaches the two new functions through the existing `export *` of `SignatureHistory.ts` and `DecisionHistory.ts`, whose diff to `index.ts` is empty. `node scripts/check-api-surface.mjs`: "940 export(s) documented across 9 package(s)". `spec/overview.md` rows 276 and 279 name `actedAnswerFromEvents` and `signatureAnswerFromSignatures`; the removed `ActedEvent`, `ActedAnywhere`, `ActedAnywhereInput` are struck (Rev 1.135, 1.134). `scripts/check-package-install.mjs` imports both (lines 469, 492) and calls each with asserted results ("Any" row, "MissingResourceId" row); gate 14 itself was not run. |
| 4 | The custom-predicate refusal is one sentence owned in one place; ADR-QD-189 records the outcome; BEH/INV/ADR amendments, traceability, changesets, 0.13 section and CCR-QD-468 agree with the code | VERIFIED | The sentence exists once in `packages/devtools/src` (`SimulationFields.ts:555-559`, `NO_CUSTOM_PREDICATE_FIELD`); `Remedies.ts:53,660` imports it and `skip(..., NO_CUSTOM_PREDICATE_FIELD.reason)`; the field table's `CustomPredicate` cell is the same value (`:586`). ADR-QD-189 (Rev 1.9) decision 1 is "A change, not a recorded rejection", states it was decided autonomously on 2026-11-23 and recorded before any source change; ordering confirmed: `0fc9f17f` (ADR) precedes `22d5b10c` and every `packages/` commit. BEH-QD-716/717 (06-services), 718..720 (29-devtools-simulator), INV-QD-397/398 (invariants) all present and in traceability (rows for 06, 29 and the two invariants; test-file rows name BEH-QD-716..720 and ADR-QD-189). ADR-QD-058 (Rev 1.3) and ADR-QD-094 (Rev 1.12) amended, plus ADR-QD-163 (Rev 1.10). Three changesets: `@qadi/core` minor "**Breaking.**", `@qadi/http` minor "**Breaking.**", `@qadi/devtools` patch; upgrade guide has "0.13: `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` are removed, and two history errors may omit a member". `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry. CCR-QD-468's file list equals `git diff --name-only bf339146..HEAD` outside `.planning`, name by name (diff of the two sorted lists empty); its cited revisions (README 1.348, 06-services 1.24, 12-history 1.6, 23-http 1.20, 29 1.31, 30-port-calls 1.25, ADR-058 1.3, ADR-094 1.12, ADR-163 1.10, ADR-189 1.9, invariants 1.206, overview 1.135, traceability 1.286) equal the document headers. |

**Score:** 4/4 truths verified; 0 behavior-unverified.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SIGM-01 | SATISFIED | Truth 1 |
| SIGM-02 | SATISFIED | Truth 2 (a change, not a rejection) |
| SIGM-03 | SATISFIED | Truth 3 (940 exports documented; probe present) |
| SIGM-04 | SATISFIED | Truth 4 (one sentence, one owner) |
| SIGM-05 | SATISFIED | Truth 4 (ADR-QD-189, CCR-QD-468) |
| WX-01..07 | Phase contribution met; rows stay Pending milestone-wide by design | WX-01: `pnpm check:pr` exit 0 on `15acdb65` is the recorded claim and was not re-run here; I re-ran `check-house-style` ("585 file(s) clean"), `check-api-surface` (940), `spec-revise --check`, `pnpm test:tstyche` (74 files, 400 tests pass, 2 skipped), the targeted core, devtools and http tests and the agreement check. WX-02: only reserved ids (ADR-QD-189, BEH-QD-716..720, INV-QD-397/398, CCR-QD-468). WX-03: two added exports named, three removed ones struck. WX-04: the added lines under `packages/*/src` hold no `as`-cast, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, `console`, `process.env`, `Record<string, unknown>` or `Stryker disable` (the only regex hits are `import * as Result`). WX-05: `76-mutation-base.json` and `76-mutation-close.json` exist; the recorded scores (Remedies 288/288, SignatureMatch 14/14, and so on) were not re-run (Stryker out of scope). WX-06: refusal and agreement rows seen red on the base in `76-RED-EVIDENCE.md`. WX-07: no D-numbers, plan ids or phase numbers in added lines of `packages/*/src`, `packages/*/test` or `features`. |

### Anti-Patterns Found

None blocking. Added-line scans for the forbidden list and for plan or phase identifiers in shipped source, tests and features are clean.

### Human Verification Required

None. The roadmap's owner decision (change or rejection) was made autonomously under the owner's standing instruction and recorded in ADR-QD-189 (decision 1, Rev 1.9) before any source change; ordering verified in truth 4.

### Gaps Summary

No gaps. Not re-run by me and taken from the recorded evidence: `pnpm check:pr` (exit 0 on `15acdb65`), Stryker scores, coverage percentages, and `scripts/check-package-install.mjs` (gate 14; the probe was read only).

---

_Verified: 2026-11-23_
_Verifier: Claude (gsd-verifier)_
