---
phase: "23"
slug: "sink-record-fields"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 23 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| record wire, both directions | `decodeSinkRecord` reads untrusted input from forwarding, the stream, audit rows and devtools; the decode stays strict inside the policy and tolerant only at the envelope's top level (ADR-QD-096) | serialized decision/obligation records (subject ids, policies, outcomes) — integrity-sensitive audit data |
| in-memory record to every sink | every sink and the audit store read the same bytes for one record | `DecisionRecord` / `ObligationRecord` values |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-23-01 | Tampering | a field silently dropped from the wire by a later refactor | medium | mitigate | 23-01's every-shape round trip in `SinkCodec.test.ts` (ARCH-71), seen failing under m1–m3 (23-01-SUMMARY) | closed |
| T-23-02 | Denial of service | B's constructor parse paid on every evaluation, or a throw on the evaluation path | medium | mitigate | `SinkRecord.bench.ts` measured B at 9.4×–140× per record; A chosen; no `Schema.TaggedClass` in `DecisionRecord.ts` or `SinkRecordFields.ts` | closed |
| T-23-03 | Repudiation | a scratch mutation left in the tree or committed | medium | mitigate | 23-01 committed no `packages/core/src` change (verified against HEAD and base `f40bbfb2`) | closed |
| T-23-04 | Elevation of privilege | Task 3 auto-resolved | high | mitigate | `gate="blocking-human"` kept; the answer (`A`, `keys: absent`) was taken from the owner-authored `_DECISIONS-v1.2.md` (commit `ba38f367`), not chosen by the executor | closed |
| T-23-05 | Tampering | wire bytes changing silently | high | mitigate | `packages/core/test/fixtures/` unchanged since base; golden writer/decoder describes and encoded-key pins green (4518 tests) | closed |
| T-23-06 | Tampering | a decode that loosens | medium | mitigate | No changed line names `UNTRUSTED_DECODE_OPTIONS`; no removed line in the "untrusted"/"unknown envelope"/`Inconsistent` tests | closed |
| T-23-07 | Elevation of privilege | an ADR-QD-106 check dropped while shrinking `rebuild` | high | mitigate | `rebuildOutcome` definition unchanged and still called from `rebuild`; `Inconsistent` tests unedited and green | closed |
| T-23-08 | Denial of service | (B only) a constructor throw on the evaluation path | high | mitigate | Not applicable — `d01_outcome: A`; records stay `Data.TaggedClass`, no parse on construction | closed |
| T-23-09 | Repudiation | a record disagreeing with its question after the merge | medium | mitigate | 23-03's `decisionRecordFor` seam tests over every outcome, question shape and cache answer | closed |
| T-23-10 | Denial of service | a sink defect becoming a decision | high | mitigate | Only `Lifecycle.ts`'s import line changed around `sinkEmitter`; its `catchCause` untouched; "a sink cannot change a decision" tests unedited and green | closed |
| T-23-11 | Tampering | an undocumented change to what sinks receive | low | mitigate | RED-first test `3e014f96`; ADR-QD-135 and `.changeset/sink-record-fields.md` state the absent-key change | closed |
| T-23-12 | Repudiation | ADR-QD-135 misstating the choice or the numbers | medium | mitigate | 23-04 copied `d01_reason` and the bench tables verbatim from the 23-01/23-02 SUMMARYs | closed |
| T-23-13 | Repudiation | an unrecorded change to what sinks receive | low | mitigate | Changeset paragraph and BEH-QD-451 | closed |
| T-23-14 | Elevation of privilege | a gate weakened to pass | high | mitigate | No diff since base under `scripts/`, `stryker.config.mjs`, any `vitest.config.ts`, `.oxlintrc.json`, `tstyche.json` or `.github/`; `pnpm check:pr` green | closed |
| T-23-SC | Tampering | npm/pip/cargo installs | high | accept | `pnpm-lock.yaml` and every `package.json` unchanged since base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-23-01 | T-23-SC | No dependency is added or upgraded by this phase; the lockfile is byte-identical to the base | plan-time threat model (23-01..23-04), confirmed by audit | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 15 | 15 | 0 | execute-phase orchestrator (secure-phase, ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11

## Security Audit 2026-11-11

| Metric | Count |
|---|---|
| Threats found | 15 |
| Closed | 15 |
| Open | 0 |
