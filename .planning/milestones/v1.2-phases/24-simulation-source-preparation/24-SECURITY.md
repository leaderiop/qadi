---
phase: "24"
slug: "simulation-source-preparation"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 24 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| host ports to the simulator | a Live source is the only way the panel causes I/O against the application's resolvers | resolver answers (application data) |
| capture to replay | a Snapshot replays what a Live run recorded, so a capture that mixes runs shows answers to questions this run never asked | captured resolver answers |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-24-01 | Tampering | a preparation reused across runs, merging two runs' answers into one capture | medium | mitigate | `SimulationSession.test.ts` ARCH-72 characterisation test (one recorder per Live run), green on the base and after | closed |
| T-24-02 | Information disclosure | a Live choice answered from fixtures when ports are absent | medium | mitigate | `SimulationSource.prepare.test.ts` table pins `Refused{LiveWithoutPorts}` for both capture states; C2 session tests unchanged | closed |
| T-24-03 | Repudiation | a red test that fails for the wrong reason | low | mitigate | 24-01 recorded the RED failing on `prepareSource is not a function` only; the table is green since 24-02 | closed |
| T-24-04 | Tampering | a refactor that answers a refused Live choice from fixtures | high | mitigate | the table's `Refused` rows for every no-ports combination; session branches only on `prepared._tag` | closed |
| T-24-05 | Tampering | a preparation built once in `build()` and reused by a run, merging captures | medium | mitigate | `prepareSource` is called per run (`SimulationSession.ts` build at :276, run at :375); ARCH-72 test green | closed |
| T-24-06 | Information disclosure | a moved type silently dropped from the public barrel | low | mitigate | `surface.tst.ts` imports `SourceChoice`/`SourceOption`/`SourceRefusal` from `src/index.ts`; `spec:api` (gate 13) green in `pnpm check:pr` | closed |
| T-24-07 | Repudiation | a spec still naming a deleted function as the rule's owner | low | mitigate | `resolveSource`/`sourceOptions` remain in `spec/` only in change history (CCR-QD-414 row, overview revision lines) | closed |
| T-24-08 | Tampering | a mutation drop hidden by a lowered threshold | medium | mitigate | no diff to Stryker/vitest configs, `scripts/` or AGENTS.md since the phase base `2c24f19d`; per-file scores at or above base (24-mutation-after.json) | closed |
| T-24-09 | Elevation of privilege | a fail-closed regression (Live answered from fixtures) slipping past per-plan checks | high | mitigate | `pnpm check:pr` exit 0 on the final tree (devtools, BDD, coverage) | closed |
| T-24-SC | Tampering | npm/pip/cargo installs | high | accept | no package manifest or lockfile changed since the phase base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-24-01 | T-24-SC | No dependency is added or upgraded by this phase; no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` changed since the base | plan-time threat model (24-01..24-03), confirmed by audit | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 10 | 10 | 0 | autonomous orchestrator (secure-phase, ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
