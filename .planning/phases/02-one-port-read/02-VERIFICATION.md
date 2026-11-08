---
phase: 02-one-port-read
verified: 2026-11-08T05:00:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/02-one-port-read/02-01-PLAN.md"
  - ".planning/phases/02-one-port-read/02-01-SUMMARY.md"
  - ".planning/phases/02-one-port-read/02-02-PLAN.md"
  - ".planning/phases/02-one-port-read/02-02-SUMMARY.md"
  - ".planning/phases/02-one-port-read/02-03-PLAN.md"
  - ".planning/phases/02-one-port-read/02-03-SUMMARY.md"
  - ".planning/phases/02-one-port-read/02-04-PLAN.md"
  - ".planning/phases/02-one-port-read/02-04-SUMMARY.md"
  - "packages/core/src/PortAccess.ts"
  - "packages/core/src/PortSpan.ts"
  - "packages/core/src/PortWire.ts"
  - "packages/core/src/SignatureHistory.ts"
  - "packages/core/src/SignatureMatch.ts"
  - "packages/core/test/PortAccess.test.ts"
  - "packages/core/test/PortRemote.test.ts"
  - "packages/devtools/src/model/Capture.ts"
  - "packages/devtools/test/model/Capture.test.ts"
covered_digest: "v4:sha256:70422b7d10d3fb1a71a7e4becb30dc45b0148329a551a7c1341c4cdbbc221aa1"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed:
    - "WR-01: disclose now runs under catchPortDefect (7cbd7c8)"
    - "WR-02: the pre-validation question is derived from pose (e744e97)"
    - "WR-03: the 'over-keying can only miss and deny' claim corrected (ce9ecbd)"
    - "WR-04: devtools replay answers an unseen SignatureHistory request as SignatureHistoryUnavailable (ad5b3fe)"
    - "Human item 1: check:pr single-run exit, marked pass in 02-UAT.md"
  gaps_remaining: []
  regressions: []
---

# Phase 02: One port read Verification Report

**Phase Goal:** A port's span projection is stated once on its description, and every local and served read shares one body, so local and served spans cannot diverge.
**Verified:** 2026-11-08
**Status:** passed
**Re-verification:** Yes. This replaces the earlier report, which was stale after four review-fix commits. Every item that report left for a human is now resolved (UAT 3/3 pass).

## Goal Achievement

The goal holds in the current code. Each of the five port descriptions carries `attributes.pose` and a two-argument `attributes.disclose`. `PortAccess.ts` has one plain `readPort` body. All six local reads and `servePortRead` run it, so a served span and a local span for the same request come from the same projection and the same annotation code. The wire no longer has a separate span projection.

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Served and local signature reads of one question leave identical span attributes (`meaning`, `signerRole`, `matched`); `onFile` is on neither | VERIFIED | `signatureSpan.pose` and `.disclose` (`SignatureHistory.ts:~125-145`). `pose` carries `meaning` and `signerRole`. `disclose` computes `matched` from `signatureMatches(signatures, query.meaning, query.signerRole)`. `signatureWire` carries both as optional keys, so the requirement crosses the wire. `answer` has only `matched`; `onFile` appears only on `SignatureAnswer`, which is not a span field. Local and served run the same `readPort`. The per-port table and the signature round trip in `PortAccess.test.ts` and `PortRemote.test.ts` pass (312 tests in the 5 files I ran). |
| 2 | No port module's `wire` block declares `spanQuestion` or `spanAnswer` | VERIFIED | `grep -rn "spanQuestion\|spanAnswer\|PortWireSpan" packages/*/src packages/*/test apps examples` returns nothing. |
| 3 | `PortAccess.ts` has one generic read body; each `ask*` has only argument shaping and its own validation | VERIFIED | `readPort` (`PortAccess.ts:182-201`) is the only place that annotates the question, counts, invokes, annotates the answer and maps defects. It is called from `resolveAttribute`, `askActedAny`, `askActedForResource`, `askRelationship`, `askCustom`, `askSignature` and `servePortRead`. The three reads that annotate before validating the resource id (D-07) now build that early question with the description's own `pose(...)` (lines 321-325, 397-400, 449-460). The only hand-supplied field is `scope: "Resource"` in two of them, which is the read's own fact (an id that is missing still makes this a Resource question where `pose` would say `Any`). |
| 4 | Traced span names unchanged; UNTRACED_BUDGET unchanged | VERIFIED | Every read is still `Effect.fn(<port>.span)`, and `servePortRead` uses `Effect.withSpan(d.span)`. `readPort` opens no span. `node scripts/check-house-style.mjs` reports "397 file(s) clean (3 declared switch(es))". A scan of added non-comment lines in `packages/*/src` since `9b5b880` finds no `as`, `any`, `!.`, `fnUntraced`, `switch`, `async`/`await` or `console`. |
| 5 | `pnpm check:pr` green; ADR-QD-109, CCR-QD-386 and a changeset recorded | VERIFIED | `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md` exists. CCR-QD-386 and INV-QD-244 are present in `spec/README.md` and `spec/invariants.md`. `.changeset/one-port-read.md` exists, plus `.changeset/devtools-unseen-signature-fails.md` for WR-04. I ran `pnpm typecheck` (exit 0). The orchestrator observed every `check:pr` step exit 0 at HEAD, and the user marked the single-run check pass in UAT test 1. |

**Score:** 5/5 truths verified, 0 behavior-unverified.

### Plan-level must-haves beyond the success criteria

| Truth | Status | Evidence |
| ----- | ------ | -------- |
| A served read whose store throws becomes the port's typed error, not a defect | VERIFIED | `Effect.flatMap(d.service, (shape) => d.invoke(shape)(...args))` runs the call inside the effect, under `catchPortDefect` (`PortAccess.ts:192-199`). Named tests pass. |
| A malformed store answer does not escape as a defect (WR-01) | VERIFIED | `disclose` runs in `Effect.tap` before `catchPortDefect`. UAT test 3 cites three `[null]`-store tests, in `PortRemote.test.ts`, that pass. They cover a served read, a local read, and `answerRemotely` replying `Unavailable`. |
| Signature key is injective over the requirement | VERIFIED | `signatureHistoryPort.key` covers subject, resource, meaning and signerRole. The `PortRemote` and `PortConformance` tests pass. |
| A resource-scoped read with no usable id leaves its question, fails `MissingResourceId`, and counts no port call (D-07) | VERIFIED | The D-07 tests in `PortAccess.test.ts` pass, unchanged after the WR-02 derivation. |
| An unseen SignatureHistory request in devtools replay fails closed (WR-04) | VERIFIED | `UNSEEN_REQUEST_IS_AN_OUTAGE` in `Capture.ts` is a total `PortName`-keyed record. `Capture.test.ts` passes, including the new unseen-request tests. |
| `PortWire` is JSON only | VERIFIED | No span member on the wire types. |

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/core/src/PortAccess.ts` | VERIFIED | `readPort` is substantive and wired into 7 call sites. |
| `packages/core/src/PortSpan.ts` | VERIFIED | `pose` and two-argument `disclose` on `PortSpanAttributes` and its structural bound. Implemented in all five port modules (`AttributeResolver`, `RelationshipResolver`, `CustomPredicate`, `DecisionHistory`, `SignatureHistory`). |
| `packages/core/src/SignatureMatch.ts` | VERIFIED | 26-line leaf module. Used by `disclose` and by `askSignature`. |
| `packages/devtools/src/model/Capture.ts` | VERIFIED | `unseenReply` is wired into `replayLayer`. |
| ADR-QD-109, INV-QD-244, CCR-QD-386, changesets | VERIFIED | Present. |

### Key Link Verification

| From | To | Status |
| ---- | -- | ------ |
| `readPort` | each description's `attributes.pose` / `disclose` | WIRED (`PortAccess.ts:190`, `:198`) |
| `servePortRead` | `readPort(d, "remote", args)` under `Effect.withSpan(d.span)` | WIRED (`:496`) |
| `askRemotely` / `answerRemotely` | `signatureWire` carrying the requirement | WIRED (round-trip test) |
| Early annotation in the three D-07 reads | the description's `pose` | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
| -------- | ---- | ------ | --------- | ------ |
| Served signature span | `qadi.meaning`, `qadi.signer_role`, `qadi.matched` | The wire question's requirement and the store's list through `disclose` | Yes, shown by the `PortRemote.test.ts` round trip | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Port and capture tests | `pnpm vitest run` on `PortAccess`, `PortRemote`, `PortServe`, `PortConformance` and `devtools/Capture` tests | 5 files, 312 tests pass | PASS |
| Typecheck | `pnpm typecheck` | exit 0 | PASS |
| House style | `node scripts/check-house-style.mjs` | 397 files clean | PASS |
| Full gate | Orchestrator, each `check:pr` step at HEAD (3900 tests, e2e 30 passed) | exit 0 | PASS (not re-run by me, apart from the above) |

### Probe Execution

No phase-declared probes. Step 7c does not apply.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| PORT-01 | 02-01, 02-02 | SATISFIED | `pose` and `disclose` on every description. |
| PORT-02 | 02-02 | SATISFIED | No `spanQuestion`, `spanAnswer` or `PortWireSpan` anywhere. |
| PORT-03 | 02-01 | SATISFIED | `readPort`; `disclose` is under the defect mapping. |
| PORT-04 | 02-01, 02-02, 02-03 | SATISFIED | Per-port table and signature round trip. |
| PORT-05 | 02-01 | SATISFIED | Span names kept; house-style budgets clean. |
| PORT-06 | 02-01 | SATISFIED | Per-port table in `PortAccess.test.ts`. |
| XC-01 | 02-04 | SATISFIED | `check:pr` green at HEAD; UAT test 1 pass. |
| XC-02 | 02-03, 02-04 | SATISFIED | ADR-QD-109, CCR-QD-386, README row, traceability, changesets. |
| XC-03 | 02-04 | SATISFIED | Gate 13 green per the orchestrator. |
| XC-04 | 02-01, 02-02 | SATISFIED | Diff scan clean; house-style clean. |
| XC-05 | 02-04 | SATISFIED | Coverage run exits 0 per the orchestrator. |

All 11 IDs from the ROADMAP row appear in a PLAN's `requirements` and in REQUIREMENTS.md. No orphaned requirements.

**Bookkeeping still open:** the REQUIREMENTS.md traceability table still shows `PORT-01..06 | Phase 2 | Pending` (line 154) and `XC-01..05 | All phases | Pending` (line 162), while the checkboxes above are `[x]`. This is a doc update for the orchestrator. The ROADMAP checklist line for Phase 2 (line 18) also still reads `[ ]` while the Plans list is all `[x]`.

### Anti-Patterns Found

No TBD, FIXME or XXX in the changed source. No stubs.

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| `PortDescription.ts`, `PortRemote.ts`, `PortWire.ts`, `TreeFold.ts`, `http/PortRoutes.ts` | Stale `ADR-QD-NEXT` placeholders (IN-02) | Info | Comment only. |
| `PortSpan.ts:87-88` | "same type for all five ports" (IN-03) | Info | Comment only. |
| `SignatureLedger*.ts` comments, ledger key test, changeset skew note, resource-id check written three times, one over-width comment (IN-01, IN-04 to IN-07) | Review info findings, still open | Info | None on the goal. Recorded in `02-REVIEW-DISPOSITION.md` (7 open, all info). |

### Advisory: pre-existing, outside this phase

WR-04's fixer found that the `none` answers of the other four ports (attribute, relationship, history, custom) also grant under `not(...)` in devtools what-if replay. The cause is `Walk.ts`'s `Not` arm turning any denying child into an allow, which is the INV-QD-007 question that predates this phase. It does not affect the goal: local and served spans still come from one body. It does not touch live enforcement. Whether to extend the `UNSEEN_REQUEST_IS_AN_OUTAGE` table to those ports is a decision for a later phase or a separate issue. It is not a Phase 02 must-have, and I did not count it as a gap.

### Human Verification Required

None. The three items from the earlier report are resolved in `02-UAT.md` (3 of 3 pass, 0 issues). `02-SECURITY.md` has 14 threats, 14 closed, `threats_open: 0`.

### Gaps Summary

No gaps. All five ROADMAP success criteria hold in the code, the four review warnings are fixed with passing tests, and the gate is green at HEAD. The open items are bookkeeping (the Pending rows in REQUIREMENTS.md and the ROADMAP Phase 2 checkbox) and seven info-level review findings.

---

_Verified: 2026-11-08_
_Verifier: Claude (gsd-verifier)_
