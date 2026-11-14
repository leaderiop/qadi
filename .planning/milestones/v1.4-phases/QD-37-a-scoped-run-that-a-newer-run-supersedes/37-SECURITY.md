---
phase: "37"
slug: "a-scoped-run-that-a-newer-run-supersedes"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-14"
---

# Phase 37 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| devtools store ↔ host application | A devtools run (timeline read, diagnostics poll, simulation run) queries the host's resolvers and `questions()` while it is current | the host's decision data, read-only; a stale run must stop reading it |
| run ↔ store readout | A finished run writes its result, sample or `Stopped`/`Broke` into the store a reviewer sees | integrity of what the panel shows |
| phase ↔ its judging files | Baselines, budgets, gate scripts and thresholds decide whether the phase passes | integrity of the verdict |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-37-01 | Tampering | `37-mutation-base.json` | medium | mitigate | baseline is the first plan commit, alone (`c8accf4c`), touched by no later commit | closed |
| T-37-02 | Repudiation | base characterisations | medium | mitigate | TF20, SR1–SR4 green on the untouched base with exact titles and counts | closed |
| T-37-03 | Tampering | timeline readout | medium | mitigate | `TimelineFeed.ts:128` lands only `isCurrent(token)`; TF21–TF23 RED then GREEN | closed |
| T-37-04 | Denial of service | nested timeline restart | medium | mitigate | `fork` re-check + held-fork drain in `SupersedingRun.ts`; TF21–TF23 | closed |
| T-37-05 | Repudiation | RED evidence | low | mitigate | each RED case failed on an `AssertionError` with every other case green (37-02, 37-05, 37-06 SUMMARYs) | closed |
| T-37-06 | Tampering | module land/hook rules | medium | mitigate | R1, R3, R4, R9, R15 in `SupersedingRun.test.ts`; R3 rewrite fails | closed |
| T-37-07 | Denial of service | nested fork/stop/close in a start | medium | mitigate | R11–R14; R11 rewrite fails | closed |
| T-37-08 | Repudiation | vacuous module rows | low | mitigate | per-row rewrites (37-03) and mutation: every `SupersedingRun.ts` mutant killed or named equivalent (`37-mutation-survivors.json`) | closed |
| T-37-09 | Repudiation | vacuous property | medium | mitigate | nine floors ≥ 30 never lowered; four rewrites each fail the property (37-04) | closed |
| T-37-10 | Tampering | fixed property seed | low | accept | see Accepted Risks | closed |
| T-37-11 | Denial of service | stale diagnostics poll | medium | mitigate | `DiagnosticsFeed.ts:196` guard + re-check/held fork; F28, F29 RED then GREEN | closed |
| T-37-12 | Tampering | diagnostics readout | medium | mitigate | `marking.accept` guarded by `isCurrent`; F9, F24 unchanged and green | closed |
| T-37-13 | Information disclosure | stopped Live run querying resolvers | medium | mitigate | unconditional `runs.stop()` interrupts inside the command; `SimulationSession.test.ts` byte-identical to base and green | closed |
| T-37-14 | Tampering | session readout | medium | mitigate | `SimulationSession.ts:482` `if (!runs.isCurrent(mine)) return;` | closed |
| T-37-15 | Denial of service | session stuck `Running` | medium | mitigate | held fork; SR5 RED then GREEN | closed |
| T-37-16 | Repudiation | record ids | low | mitigate | only reserved ids added; `spec:verify:strict` 21/21 | closed |
| T-37-17 | Tampering | AGENTS.md scope | low | mitigate | AGENTS.md diff confined to §10; house-style budgets re-read clean | closed |
| T-37-18 | Repudiation | cited test rows | low | mitigate | 37-08 cited-row check resolves every R/TF/F/SR id to a test title | closed |
| T-37-19 | Tampering | INV-QD-313 source | low | mitigate | Source restated to `SupersedingRun.ts`; strict traceability passes | closed |
| T-37-20 | Tampering | judging files | high | mitigate | no diff since base in `scripts/`, Stryker or vitest configs; baseline committed once | closed |
| T-37-21 | Repudiation | test-first claim | medium | mitigate | 37-09 commit-order and test-shape checks pass | closed |
| T-37-22 | Elevation of privilege | accidental release | high | mitigate | no tag since base, no version-packages commit, `.changeset/superseding-run.md` unconsumed, nothing pushed | closed |
| T-37-SC | Tampering | package installs | high | accept | see Accepted Risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-37-01 | T-37-10 | The property seed (3701) is fixed for reproducibility, as in the Phase 31 precedent; the nine non-vacuity floors and the four rewrites bound what it must reach | plan (37-04 threat model) | 2026-11-14 |
| AR-37-02 | T-37-SC | No package was installed or added in this phase (`fast-check` was already a devtools devDependency) | plan (all nine threat models) | 2026-11-14 |

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
