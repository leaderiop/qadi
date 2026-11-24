---
phase: "77"
slug: "an-audit-row-is-a-value-only-its-codec-makes"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-24"
---

# Phase 77 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Stored audit row → `decodeAuditEntry` | A row read back from a store or archive is untrusted JSON | Audit record JSON + optional sequence number |
| Host input → `archiveAuditTrail` | `entries`, `now` and `options.keyMaterial` come from the host | Rows (codec-made only), clock value, public key material |
| Archive JSON → `readAuditArchive` | An archive is re-read from untrusted storage | Envelope, entries, key material |
| Phase records → reviewers | Mutation base, RED evidence and ADRs are the evidence a reviewer trusts | Measurements and decisions |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-77-01 | Tampering | `77-mutation-base.json` | medium | mitigate | Recorded once at phase_base (f6f8bbff); scorer refuses a dirty tree (`77-mutation.mjs` `dirtyReasons`) | closed |
| T-77-02 | Repudiation | `77-RED-EVIDENCE.md` | medium | mitigate | Command, HEAD and all 15 titles from c4fd276e recorded | closed |
| T-77-03 | Tampering | `scripts/check-api-surface.mjs` | medium | mitigate | `REEXPORT_LOCAL` decomposed by name; undecomposable lists still `[unsupported]`; plant shown failing | closed |
| T-77-04 | Denial of service | `archiveAuditTrail` | high | mitigate | Nominal codec-made row; `Number.isFinite(now)` guard fails `ArchiveInputInvalid` before the facts | closed |
| T-77-05 | Information disclosure | `keyMaterial` | high | mitigate | Each item projected to `{ keyId, algorithm, publicKey }`; test asserts exact keys and no extra value written | closed |
| T-77-06 | Tampering | `AuditEntry` construction | medium | mitigate | `declare private readonly nominal: never`, type-only export; only the codec calls `new AuditEntry`; `no-type-assertion` gate | closed |
| T-77-07 | Denial of service | `decodeAuditEntry` | low | accept | Reuses `untrustedDecoder` depth guard with `unwalked: ["record"]`; no new decode token | closed |
| T-77-08 | Spoofing | decode precedence | low | accept | Tag and accept sets unchanged; characterisation matrix pins every refusal | closed |
| T-77-09 | Tampering | `planPurge` without `undated` | low | accept | A purge still needs `archive.holds(entry)`; a non-finite `at` cannot be a codec-made row | closed |
| T-77-10 | Repudiation | `AuditEntry.tst.ts` | medium | mitigate | 6 `@ts-expect-error` pins with fragments and positive twins, seen failing with the brand removed | closed |
| T-77-11 | Repudiation | `planPurge` doc | low | mitigate | "about 22 µs per row" with method recorded in ADR-QD-190 | closed |
| T-77-12 | Information disclosure | `keyMaterial` projection | high | mitigate | Tests in `AuditArchive.test.ts` and `ArchiveWriterInputs.test.ts`, seen failing with the projection removed | closed |
| T-77-13 | Repudiation | ADR-QD-190 and amendments | medium | mitigate | Evidence quoted; dated appended amendments; `verify-traceability.sh --strict` PASS 21/21 | closed |
| T-77-14 | Tampering | upgrade guide, README, capabilities | medium | mitigate | Guidance names `decodeAuditEntry({ record, sequenceNumber })` as the one route; removed names absent from guidance | closed |
| T-77-15 | Repudiation | CCR-QD-469 | low | mitigate | Row names every document, ids used and unused ids | closed |
| T-77-16 | Tampering | mutation floor | high | mitigate | Base committed once; `compare` clean; 0 survived / 0 no-coverage in all four files; survivors closed by tests | closed |
| T-77-17 | Elevation of privilege | release and publish | high | mitigate | Changeset unconsumed; no tag, no CHANGELOG or version change; branch `arch-wave-14` | closed |
| T-77-SC | Tampering | dependency installs | high | mitigate | No `package.json`, lockfile or workspace change since phase_base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-77-01 | T-77-07 | The row decode reuses the existing depth guard and unwalked-record decode; no new decode token | Plan 77-03 register (autonomous mode, owner instruction 2026-11-22) | 2026-11-24 |
| AR-77-02 | T-77-08 | Only the reported refusal changes for a doubly bad row; tags and accepted inputs are unchanged and tabulated in ADR-QD-190 | Plan 77-03 register (autonomous mode) | 2026-11-24 |
| AR-77-03 | T-77-09 | `planPurge` still requires the verified archive to hold the row, so removing `undated` cannot purge an unheld row | Plan 77-03 register (autonomous mode) | 2026-11-24 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-24 | 18 | 18 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-24
