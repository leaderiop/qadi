---
phase: "04"
slug: "gate-instrumentation-hook"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-08"
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| host page script → gate registry | When instrumentation is on, the registry gives any script on the page a list of what the current user may and may not do. When it is off, there must be nothing to read. | Authorization verdicts and the user's capability map, which is sensitive |
| `@qadi/react` consumer → gate write side | A consumer who could reach the writer could register a `<Can>` that does not exist (ADR-QD-080). | Gate registrations, so integrity matters |
| decision atom → rendered guard | A guard renders from `outcomeOf`, and anything unreadable fails closed (ADR-QD-017, INV-QD-094). | Allow and deny decisions |
| render loop → gate registry | A grouped hook rebuilt on every render must not churn registrations or atoms. | Registry notifications, which bear on availability |
| gate registry → devtools reviewer | An entry must show the question it currently asks, not a stale one. | Gate identity and policy |
| spec → reviewer and implementer | `spec/` is normative (AGENTS.md §11), so a record that misdescribes the code is a defect. | Normative claims |
| phase change → merge gate | `pnpm check` is the only definition of done (AGENTS.md §15). | Gate budgets and thresholds |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-01 | Information disclosure | `QadiProvider` writer resolution / `GateScope.writer` | high | mitigate | `QadiProvider.tsx:237` contains `instrument ? gateWriterFor(gates) : undefined`, and `useGates` registers only with a defined writer. The uninstrumented tracer test and the unedited `GateRegistry.test.tsx` off-means-absent tests both pass. | closed |
| T-04-02 | Elevation of privilege | `GateScopeContext`, `useGates` | medium | mitigate | Both live in `GateWriter.ts`, which `packages/react/src/index.ts` does not export. The `exports` map is `"."` only, and `pnpm spec:api` reports 862 exports with none added. | closed |
| T-04-03 | Tampering | hand-built or spread `gates` registry | medium | mitigate | `gateWriterFor` (`GateWriter.ts:194`) keeps its private-slot brand check unchanged. `GateRegistry.store.test.ts` and `GateRegistry.test.tsx` pass unedited. | closed |
| T-04-04 | Elevation of privilege | `useGates` missing-entry read | medium | mitigate | `GateWriter.ts:414`: an absent entry reads as `AsyncResult.initial()`, which `outcomeOf` reads as `Pending`. `check-house-style.mjs` (DECISION_READ_BUDGET) passes. | closed |
| T-04-05 | Spoofing | gate outside a provider | low | mitigate | `useGates` throws `MissingQadiProviderError(kind)`, imported from `MissingQadiProviderError.ts`. The class and message are pinned in `GateWriter.useGates.test.tsx`. | closed |
| T-04-06 | Denial of service | `usePolicies` / `useGates` group memo | medium | mitigate | `hooks.rerender.test.tsx` finds 1 group atom, an opener delta of 0 and a notification delta of 0 across equal re-renders. No structural memo was needed (04-02 SUMMARY, D-07). | closed |
| T-04-07 | Repudiation | per-entry gate identity | low | mitigate | The precision pin in `GateWriter.kinds.test.tsx` ("changing one entry re-registers that entry alone") and BEH-QD-068's existing test both pass. | closed |
| T-04-08 | Repudiation | ADR-QD-111, CCR-QD-388, traceability | low | mitigate | `pnpm spec:verify:strict` passes (21 PASS, 0 FAIL), and `pnpm spec:api` and `pnpm spec:gates` both exit 0. | closed |
| T-04-09 | Tampering | house-style budgets, coverage thresholds, Stryker and lint configs | medium | mitigate | `git diff ffa7b37..HEAD` over `scripts/check-house-style.mjs`, the vitest configs, `stryker.react.mjs` and `.oxlintrc.json` is empty, and `check-house-style.mjs` passes. | closed |
| T-04-10 | Information disclosure | instrumentation off across the published package | medium | mitigate | Gate 14 (`check-package-install.mjs`) passed against the packed artifact, and the newsroom e2e passed 30 of 30, including the uninstrumented-guard spec (04-04 SUMMARY). | closed |
| T-04-SC | Tampering | npm/pip/cargo installs (04-01 to 04-04) | high | accept | No package was installed. `git diff ffa7b37..HEAD` over `pnpm-lock.yaml` and `package.json` files is empty. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-SC | The phase added and upgraded no dependencies, and the lockfile is unchanged, so there was no supply-chain surface. | plan-time disposition (04-01 to 04-04 PLAN) | 2026-11-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-08 | 11 | 11 | 0 | /gsd-secure-phase (L1 grep-depth, plan-time register) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-08
