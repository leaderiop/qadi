---
phase: "31"
slug: "a-reset-supersedes-its-claims"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-12"
---

# Phase 31 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| `DecisionCache.clear` → in-flight computations | A flush must not let an answer computed before it re-enter the emptied cache | Cached authorization decisions (integrity-critical) |
| `SharedComputation` claim → its waiters | Every coalesced request must be answered once, and an abandoned compute must be interrupted | Decisions handed to concurrent callers |
| Repository gates → `scripts/`, configs, `DecisionCache.test.ts` pins, mutation baseline | The checks that judge this phase | Build integrity |
| `spec/` records | The normative description of the rule's owner | Specification integrity |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-31-01 | Tampering | `31-mutation-base.json` measured on an edited tree | medium | mitigate | baseline in exactly one commit (the phase's first), JSON only | closed |
| T-31-02 | Repudiation | a RED race failing for a reason other than the rule | medium | mitigate | 31-01 verify required AssertionError (no timeout) for each named race; wave-1 gate confirmed 5 RED by AssertionError | closed |
| T-31-03 | Elevation of privilege | a stale allow re-entering the emptied cache after a flush | high | mitigate | `SharedComputation.ts:390` settles only `entry.standing === "Live"`; `reset` supersedes every in-flight claim in the same sync step `clear` empties the cache; four races + `DecisionCache.test.ts` pins | closed |
| T-31-04 | Denial of service | a superseded claim's waiter never answered / compute never interrupted | medium | mitigate | `Deferred.done(entry.claim, exit)` always runs; last-leaver interrupt unchanged; two-key and parked-uninterruptible races | closed |
| T-31-05 | Tampering | `DecisionCache.test.ts` edited to make the deletion pass | medium | mitigate | byte-identical to phase base `7d89747a` (re-checked at verify) | closed |
| T-31-06 | Elevation of privilege | the `settle` rename moving the call outside the Live guard | high | mitigate | `hooks.settle(key, exit)` inside the Live guard; property Law 1; sabotage check fails the property | closed |
| T-31-07 | Repudiation | a vacuous property claiming SUPR-04 | medium | mitigate | seed 3101, 300 runs, three floors of 30 (reached 81/46/35), laws after every step, sabotage check | closed |
| T-31-08 | Repudiation | spec records still describing the deleted counter, or an unreserved id | medium | mitigate | ADR-QD-132 amendment (2026-11-12), INV-QD-307 new, INV-QD-025 restated; reserved-id check; `spec:verify:strict` green | closed |
| T-31-09 | Tampering | a gate loosened in the phase it judges | high | mitigate | 31-05 gate-integrity check: no judging file changed since base; no `DecisionCache.test.ts` line removed or changed; D-09 order held | closed |
| T-31-10 | Tampering | a re-baseline hiding a score drop | medium | mitigate | 31-05 compare refuses a multi-commit or dirty baseline; `31-mutation-after.json` ≥ base for both files | closed |
| T-31-SC | Tampering | npm/pip/cargo installs | high | accept | see Accepted Risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on severity count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-31-01 | T-31-SC | No package was installed in any plan of this phase (`pnpm-lock.yaml` unchanged since the phase base); fast-check was already a core devDependency | plan-time threat model (all plans) | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 11 | 11 | 0 | secure-phase orchestrator (L1 grep, short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
