---
phase: "22"
slug: "scoped-port-read"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 22 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| decisions file → plans 22-02..22-04 | the later plans implement whatever 22-01 records | the human's two answers (D-02, D-05) |
| policy evaluation → port | a scoped read must not reach a port without a string resource id | subject id, resource id, leaf fields (authorization-critical) |
| description `asks` → serving facet (`servingFor`) | what a remote port declares it serves must match what the reads ask | port names / leaf requests |
| code → public record | a public span or type change must be recorded as behaviour | spec, export table, changesets |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-22-01 | Elevation of privilege | an answer invented rather than taken from the human | medium | mitigate | 22-01 took both rows from `_DECISIONS-v1.2.md`; `d02_reason`/`d05_reason` quoted in `22-01-SUMMARY.md` | closed |
| T-22-02 | Tampering | a recorded outcome diverging from the decisions file | low | mitigate | `d02_outcome: A` / `d05_outcome: state-once` keys; standing instruction quoted in `spec/decisions/134-*.md` | closed |
| T-22-03 | Repudiation | taking a reserved number another phase used | low | mitigate | `reserved_numbers_free: true` after the per-id grep; 22-04 used only ADR-QD-134, CCR-QD-412, BEH-QD-445/446, INV-QD-288/289 | closed |
| T-22-04 | Elevation of privilege | a scoped read that asks the port without an id | high | mitigate | D-07 table (`PortAccess.test.ts`) asserts `calls` empty and `nonZero(portCalls)` empty per scoped port; green | closed |
| T-22-05 | Repudiation | a trace that differs by port with no test seeing it | low | mitigate | D-07 table closed over `ScopedPort`, pins the span-name list per row | closed |
| T-22-06 | Repudiation | a red test failing for the wrong reason | low | mitigate | 22-02 counted exactly 2 D-07 failures; tstyche failures were assertion failures (Params-alias deviation documented) | closed |
| T-22-07 | Information disclosure | the serving declaration drifting from what the reads ask | medium | mitigate | `PortAsks.tst.ts` (asks on all five, no `leaves`); site-independence law in `PortConformance`/`PortRemote` tests | closed |
| T-22-08 | Elevation of privilege | a scoped read that reaches the port with a non-string id | high | mitigate | one check in `readScoped` (`PortAccess.ts:267`); D-07 no-call assertions; Evaluate MissingResourceId rows green | closed |
| T-22-09 | Tampering | an `asks` entry reading the wrong leaf field | medium | mitigate | `qadi.meaning`/`qadi.signer_role`/`qadi.depth` asserted in `PortAccess.test.ts` (5) and `PortRemote.test.ts` (2) | closed |
| T-22-10 | Information disclosure | `servingFor` naming more or fewer names than the reads ask | medium | mitigate | `servingFor` derived from `asks` (`PortServing.ts`); existing tests + law + property test green | closed |
| T-22-11 | Repudiation | a span losing its question on the failure path | low | mitigate | D-07 attribute assertion unchanged and green | closed |
| T-22-12 | Elevation of privilege | a subject-hit attribute read diverging from the port request | low | mitigate | `readAttribute` builds its request through `asks`; subject-hit tests in `PortAccess`/`Evaluate` green | closed |
| T-22-13 | Repudiation | an unrecorded public span change or public type change | medium | mitigate | BEH-QD-445/446 in `spec/behaviors/30-port-calls.md`, `34-remote-ports.md`, `06-services.md`; `LeafRequests` in `spec/overview.md`; `.changeset/one-port-read.md`; `spec:api` green | closed |
| T-22-14 | Tampering | ADR-QD-134 misstating the human's choices | low | mitigate | D-02/D-05 answers and the standing instruction quoted verbatim in ADR-QD-134 (rejected options B/C described from the tree, noted in 22-04-SUMMARY) | closed |
| T-22-15 | Elevation of privilege | a fail-closed regression slipping past per-plan checks | high | mitigate | `pnpm check:pr` exit 0 (22-04); no diff since `7f64db9a` in `scripts/`, vitest/stryker configs or `.oxlintrc.json` | closed |
| T-22-SC | Tampering | npm/pip/cargo installs | high | accept | nothing installed: no diff in `package.json`, `packages/*/package.json` or `pnpm-lock.yaml` since base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-22-01 | T-22-SC | The phase installs no dependency (declared at plan time in every plan's register; confirmed by an empty manifest/lockfile diff since `7f64db9a`) | plan-time register (22-01..22-04) | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 16 | 16 | 0 | secure-phase (orchestrator, L1 grep-depth; auditor skipped per short-circuit: threats_open 0, plan-time register, ASVS 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
