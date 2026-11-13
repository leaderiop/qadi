---
phase: "30"
slug: "one-strict-decode-module"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-12"
---

# Phase 30 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Persisted / pasted policy JSON → `Policy.fromJson` / `fromJsonValue` | Untrusted text or value decoded into the Policy ADT | Authorization policy (integrity-critical) |
| Sink wire → `decodeSinkRecord` | Records from a socket, store or devtools page | Decision records, may include subject ids |
| Port wire (question / answer / reply) → `PortWireEncode`, `PortRemote` | A remote peer answering a port | Attribute / relationship answers |
| Server-rendered payload → `@qadi/react` hydration | Seeded decisions from the HTML payload | Decision seeds per policy |
| Stored archive / row → `@qadi/audit` | Audit archive envelope and per-row records | Audit trail (repudiation-critical) |
| Repository gates → `scripts/check-house-style.mjs`, mutation baseline | The checks that judge this phase | Build integrity |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-30-01 | Repudiation | seam refusal kind changing silently on move | medium | mitigate | characterisation tables in `packages/{core,react,audit}/test/UntrustedSeams.test.ts`, flips only with `Flips:` lines | closed |
| T-30-02 | Tampering | mutation baseline measured on an edited tree | medium | mitigate | `30-mutation-base.json` is in exactly one commit | closed |
| T-30-03 | Denial of service | policy nested tens of thousands deep exhausting the stack | high | mitigate | guard inside `UntrustedDecode.ts` `decode` (`exceedsJsonDepth(walked(input), MAX_DECODE_DEPTH)`); 60,000-deep rows in core table | closed |
| T-30-04 | Tampering | excess property silently stripped | high | mitigate | `UNTRUSTED_DECODE_OPTIONS` is a module-private `const` (`onExcessProperty: "error"`); no export in `packages/*/src` | closed |
| T-30-05 | Information disclosure | `PolicyNotJson.message` echoes caller input | low | accept | see Accepted Risks | closed |
| T-30-06 | Denial of service | peer reply / question nested past the bound | high | mitigate | `PortWireEncode.ts` and `PortRemote.ts` decode through `untrustedDecoder`; 60,000-deep rows | closed |
| T-30-07 | Repudiation | changed sentence breaking a log consumer | medium | mitigate | sentence templated from the old text; characterisation rows pin bytes; `Flips:` lines on changing commits | closed |
| T-30-08 | Tampering | guarding the stored envelope refusing additive keys mid-deploy | medium | mitigate | `decodeStoredRecord` stays outside the module in `SinkCodec.ts` | closed |
| T-30-09 | Denial of service | stored archive or row nested past the bound | high | mitigate | `AuditArchive.ts` / `AuditEntry.ts` on `untrustedDecoder`; 60,000-deep rows in audit table | closed |
| T-30-10 | Repudiation | too-deep archive reported as Malformed / misattributed | medium | mitigate | `ArchiveRefusal.TooDeep`; `unwalked: ["entries"]` keeps per-index attribution | closed |
| T-30-11 | Denial of service | hydration payload or entry nested past the bound | high | mitigate | three module-scope `untrustedDecoder` calls in `HydrationEngine.ts`; deep rows in react table | closed |
| T-30-12 | Repudiation | too-deep payload counted as `MalformedPayload` | medium | mitigate | `PayloadTooDeep` reason and metric series (`HydrationMetrics.ts`, `HydrationEvent.ts`) | closed |
| T-30-13 | Tampering | one hostile entry suppressing siblings' seeds | medium | mitigate | per-entry decode from its own root; three-entry row seeds two | closed |
| T-30-14 | Tampering | later seam decoding strictly without the guard / rule loosened | high | mitigate | `UNTRUSTED_DECODE_BUDGET`, `[untrusted-decode]`, `[untrusted-decode-names]`, `[untrusted-decode-table]`; two negative probes | closed |
| T-30-15 | Elevation of privilege | consumer composing exported options into an unguarded decode | medium | mitigate | options private; `DecodeDepthGuard.ts` not in `@qadi/core` barrel; gate 13 | closed |
| T-30-16 | Repudiation | break shipped without a record | medium | mitigate | ADR-QD-143 names every break; gate 13 for overview | closed |
| T-30-17 | Tampering | a gate loosened in the phase it judges | high | mitigate | 30-09 gate-integrity check: existing constants byte-identical, no deletions | closed |
| T-30-18 | Tampering | re-baseline hiding a score drop | medium | mitigate | 30-09 compare refuses a multi-commit or dirty baseline; `30-mutation-after.json` | closed |
| T-30-19 | Repudiation | break missing from changeset / upgrading.md | medium | mitigate | `.changeset/untrusted-decode-{core,react,audit}.md` marked **Breaking**; `upgrading.md` 0.12 sections | closed |
| T-30-SC | Tampering | npm/pip/cargo installs | high | accept | see Accepted Risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-30-01 | T-30-05 | The parser text is the caller's own input returned to the caller; the library logs nothing | plan-time threat model (30-02) | 2026-11-12 |
| AR-30-02 | T-30-SC | No package was installed in any plan of this phase (`pnpm-lock.yaml` untouched) | plan-time threat model (all plans) | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 20 | 20 | 0 | secure-phase orchestrator (L1 grep, short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
