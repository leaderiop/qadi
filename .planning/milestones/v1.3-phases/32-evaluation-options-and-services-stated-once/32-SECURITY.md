---
phase: "32"
slug: "evaluation-options-and-services-stated-once"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-12"
---

# Phase 32 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| `@qadi/core` public type surface → consumers | A move must not change what callers may pass (`EvaluateOptions`) or must provide (`EvaluationServices`, `StandingEvaluationServices`) | Type-level contract of the evaluation entry points |
| `decideQuestion` options → an already-built question | The remaining options must not let a caller restate a question's `resource`, `action` or `maxDepth` | Authorization question identity |
| Repository gates → `scripts/`, configs, the `EvaluationShapes.tst.ts` pin, mutation baseline | The checks that judge this phase | Build integrity |
| `spec/` records | The normative description of where the types are declared | Specification integrity |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-32-01 | Tampering | `32-mutation-base.json` measured on an edited tree | medium | mitigate | fresh report on the untouched base; baseline is the phase's first plan commit (`e88d9f23`) and carries the JSON alone; no-mutant files refused if they appear | closed |
| T-32-02 | Repudiation | a vacuous characterisation pin | medium | mitigate | `EvaluationShapes.tst.ts` imports only `../src/index.ts`, spells every union out, compares by identity; 5 tests / 6 assertions on the base (`459ad540`) | closed |
| T-32-03 | Tampering | a key, modifier, field type or service changed under cover of the move | medium | mitigate | the pin is byte-identical to `459ad540` at HEAD and green after both move commits; `pnpm spec:api` 911 exports, no drift | closed |
| T-32-04 | Spoofing | `decideQuestion` accepting a second `resource`/`action`/`maxDepth` | low | mitigate | `Lifecycle.ts:66` `options?: Omit<EvaluateOptions, keyof QuestionOptions>`; pinned by `Lifecycle.tst.ts` | closed |
| T-32-05 | Repudiation | spec records still naming `Evaluate.ts`, or an unreserved id | medium | mitigate | ADR-QD-105/037 notes, overview, traceability, 06-services corrected; reserved-id check; `spec:verify:strict` 21/0 | closed |
| T-32-06 | Tampering | a gate or the pin loosened in the phase it judges | high | mitigate | 32-04 Task 1: no judging file changed since `4a534545` (re-checked at secure: `scripts`, `stryker.config.mjs`, `vitest.config.ts`, `AGENTS.md`, `.oxlintrc.json`, `tsconfig.json` unchanged); pin committed before the first src change and unchanged since | closed |
| T-32-07 | Tampering | a re-baseline hiding a score drop, or a no-mutant file gaining code | medium | mitigate | 32-04 compare: baseline in one commit, no stale report; all six scores equal to base; `EvaluationServices.ts` and `EvaluationServicesNone.ts` absent from the report | closed |
| T-32-SC | Tampering | npm/pip/cargo installs | high | accept | see Accepted Risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on severity count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-32-01 | T-32-SC | No package was installed in any plan of this phase (`pnpm-lock.yaml` and `package.json` unchanged since the phase base) | plan-time threat model (all plans) | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 8 | 8 | 0 | secure-phase orchestrator (L1 grep, short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
