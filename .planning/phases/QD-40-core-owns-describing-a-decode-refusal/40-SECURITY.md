---
phase: "40"
slug: "core-owns-describing-a-decode-refusal"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-14"
---

# Phase 40 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| an untrusted frame/row → core's decoder | devtools frames and audit rows are sender-controlled JSON read through `untrustedDecoder` | `SinkRecord` JSON of any shape and depth |
| a refusal → logs, spans and sentences | a `DecodeRefusal` carries sender-derived `Malformed.message` and `UnsupportedVersion.version` | refusal tags, bounded descriptions |
| audit's persisted entry → storage and `Retention` | the entry's `record` is the bytes stored and counted | the strict decode's JSON form |
| the library → its consumers | `@qadi/devtools` Breaking change; new `@qadi/core` exports | the public API surface |
| phase ↔ its judging files | baselines, pins, budgets, gate scripts decide whether the phase passes | integrity of the verdict |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-40-01 | Repudiation | `40-mutation-base.json` | medium | mitigate | baseline is the first plan commit, alone (`bc19d65e`), parent `phase_base` `eb5a9406`; writer refusals unchanged except the recorded empty-entry default (40-01 Deviation 1) | closed |
| T-40-02 | Tampering | spec records / reserved ids | medium | mitigate | ten reserved ids grep-free at base (40-01); ADR commit `251ccd1a` precedes every `packages/*/src` commit; `spec:verify:strict` green | closed |
| T-40-03 | Tampering | the three characterisation pins | medium | mitigate | expected values written out as literals (40-02 Task 2/3 verifies); `AuditEntryDifferential.test.ts` unedited since `1069afe5` (40-06 verify) | closed |
| T-40-04 | Tampering | src change committed with the characterisation | medium | mitigate | 40-02 commits are three single-file test commits; no `packages/*/src` change before 40-03 | closed |
| T-40-05 | Information disclosure | `decodeRefusalAnnotations` | high | mitigate | returns exactly `{ "qadi.refusal": self._tag }` (`SinkWire.ts:178-180`); sentinel and one-key tests in `DecodeRefusal.test.ts`; type pin in `SinkWire.tst.ts` | closed |
| T-40-06 | Denial of service | `describeDecodeRefusal` on a hostile `version`/huge message | high | mitigate | `shownVersion` dispatches on `typeof` alone (`SinkWire.ts:145-155`), no property read; caps 40/200 with boundary rows; 19 hostile-version cases green (40-03) | closed |
| T-40-07 | Tampering | `check-house-style.mjs` exemption | medium | mitigate | one added `EXEMPTIONS` entry (`SinkWire.ts`), rule pattern byte-identical to base, five entries (40-03 verify; 40-09 check 1) | closed |
| T-40-08 | Tampering | `SinkRecordWithJson` json/record disagreement | high | mitigate | `json` is the source walk's output and `record` decoded from it; goldens, key-order, unknown-key and `undefined` cases green (40-04) | closed |
| T-40-09 | Denial of service | depth guard bypassed | high | mitigate | `untrustedDecoder(SinkRecordWithJson, { prepare: versionThenEnvelope })` (`SinkCodec.ts:522`); 60,000-deep `TooDeep` cases green unedited | closed |
| T-40-10 | Tampering | the decode budget | medium | mitigate | `Schema.decodeTo` only in `SinkCodec.ts`, no `encodeTo`; `UNTRUSTED_DECODE_TOKEN` unchanged; SinkCodec 1 → 2, AuditEntry row retired (40-04, 40-06, 40-09 check 1) | closed |
| T-40-11 | Denial of service | per-decode cost | low | accept | see AR-40-01 | closed |
| T-40-12 | Information disclosure | devtools default warning | high | mitigate | fixed literal message; annotations are `decodeRefusalAnnotations(refusal)` plus `qadi.frame` (`Source.ts:256-257`); test asserts no `qadi.reason` and no decoder text | closed |
| T-40-13 | Information disclosure | `qadi.frame` annotation | low | accept | see AR-40-02 | closed |
| T-40-14 | Information disclosure | example ingest 400 sentence | low | accept | see AR-40-03 | closed |
| T-40-15 | Tampering | audit entry's persisted record | high | mitigate | entry `record` is `decodeSinkRecordWithJson`'s `json`; 40-02 differential unedited and green; INV-QD-325 sentinel (40-06); `Retention` untouched | closed |
| T-40-16 | Denial of service | `decodeAuditEntry` on deep rows | high | mitigate | record read first by core's guarded decoder from its own root; row decoder leaves `record` unwalked; TooDeep differential rows green | closed |
| T-40-17 | Repudiation | spec records and measured figures | medium | mitigate | ADR bench lines verbatim from 40-02/40-04 SUMMARYs (40-07 verify); unused ids named in CCR-QD-431 | closed |
| T-40-18 | Repudiation | consumer docs | medium | mitigate | no drop word in README, website page, route comment, Peers; Breaking changeset with five-word map; After example compiled (40-08) | closed |
| T-40-19 | Elevation of privilege | release path | high | mitigate | three changesets added only; no `package.json` version, `CHANGELOG.md` or existing changeset change since base (verified by `git diff`) | closed |
| T-40-20 | Tampering | gates, config, lockfile | high | mitigate | only `scripts/check-house-style.mjs` changed under `scripts/`, on allowlisted lines; no Stryker/vitest/oxlint/tstyche config change since base; `pnpm check:pr` green (40-09) | closed |
| T-40-21 | Repudiation | mutation evidence | high | mitigate | base JSON in one commit; after-run with the same invocations, one at a time; no score fell (40-09) | closed |
| T-40-22 | Elevation of privilege | a release from this branch | high | mitigate | no tag contains `eb5a9406`; no version commit; release check green (40-09 Task 3) | closed |
| T-40-SC | Tampering | npm/pip/cargo installs | high | mitigate | no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-40-01 | T-40-11 | `decodeSinkRecord` went from 0.0084 ms to 0.0184 ms per record (~2.19×), measured and recorded in ADR-QD-153; the two-decoders fallback is named there; no path decodes unboundedly | plan (40-04 threat model), D-11 | 2026-11-14 |
| AR-40-02 | T-40-13 | `qadi.frame` on the default warning is pre-existing since ARCH-11 and unchanged; a caller who does not want it supplies `onMalformed` | plan (40-05 threat model) | 2026-11-14 |
| AR-40-03 | T-40-14 | the example's 400 describes only the sender's own body, capped at 200 code units; the route is a documented unguarded demo | plan (40-05 threat model) | 2026-11-14 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-14 | 23 | 23 | 0 | secure-phase (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-14
