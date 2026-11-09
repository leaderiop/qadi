---
phase: "03"
slug: "audit-archive-facts"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-08"
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| long-term store → `readAuditArchive` | The stored bundle is untrusted input. A `VerifiedArchive` read from it is the evidence that lets `planPurge` delete audit rows (ARCH-38, CCR-QD-230). | Archived audit entries — integrity-relevant; a wrongly accepted bundle authorizes deletion |
| `@qadi/audit` public surface | Consumers import `verifySequenceIntegrity` and `SequenceIntegrityError` by name and match on `_tag`. | Public API shape |
| spec → reviewers and compliance readers | The normative spec states what `@qadi/audit` guarantees; a compliance reviewer relies on the wording. | Guarantee claims (must not overstate tamper-evidence) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Tampering | `readAuditArchive` refusal checks | high | mitigate | `packages/audit/test/ArchiveRoundTrip.test.ts` — 4 fast-check properties: all 7 `ArchiveRefusal` kinds fire on their own tampering, reordering refused at first descent; written before the refactor (03-01) and green after it | closed |
| T-03-02 | Tampering | `readAuditArchive` order and claim checks | high | mitigate | `AuditArchive.ts:20` imports `archiveFacts`/`verifiedArchiveFacts` from `ArchiveFacts.ts`; writer and reader compute order and claim from the same facts; 03-01 properties unchanged and green | closed |
| T-03-03 | Repudiation | writer's integrity span | low | mitigate | `ArchiveFacts.ts:119` — `Effect.fn("qadi.audit.verifySequenceIntegrity")`, the single definition both the writer and the public check go through | closed |
| T-03-04 | Elevation of Privilege | package-private facts leaking into the public API | low | mitigate | `ArchiveFacts.ts` absent from `packages/audit/src/index.ts`; `spec/overview.md` Export column unchanged (Source cells only); `pnpm spec:api` exits 0 | closed |
| T-03-05 | Repudiation | INV-QD-054 / BEH-QD-254 / ADR-QD-110 wording | medium | mitigate | `SequenceIntegrity.ts` disclaimer header kept; ADR-QD-110 line 67 keeps "gap-and-duplicate, not tamper-evidence"; overview cell keeps "not cryptographic tamper-evidence" | closed |
| T-03-06 | Tampering | spec registries (index.yaml, traceability, CCR register) | low | mitigate | `spec/decisions/index.yaml:365` lists ADR-QD-110; CCR-QD-387 in `spec/README.md`; `pnpm spec:verify:strict` 21 PASS / 0 FAIL | closed |
| T-03-SC | Tampering | npm/pip/cargo installs | high | accept | No package installed: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `packages/audit/package.json` unchanged across the phase | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-SC | No dependency was added or changed; `fast-check` (catalog 4.10.2) and Stryker were already pinned devDependencies. Supply-chain exposure is unchanged by this phase. | plan-time disposition (03-01/02/03 PLAN threat models) | 2026-11-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-08 | 7 | 7 | 0 | secure-phase (orchestrator, ASVS L1 grep-depth; register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-08
