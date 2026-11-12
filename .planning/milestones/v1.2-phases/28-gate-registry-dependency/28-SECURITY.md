---
phase: "28"
slug: "gate-registry-dependency"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 28 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| automation → human decision | reopening an accepted ADR is a human's call | the D-01 outcome (A/B/C) and `useGateRegistration`'s fate |
| package → consumer | the gate writer and the gate kind stay unreachable from outside `@qadi/react` (ADR-QD-080, ADR-QD-099) | type and value exports |
| guard → registry | a registration ends when its guard unmounts or instrumentation turns off (off means absent, INV-QD-046); the registry lists exactly the mounted guards (INV-QD-064) and never decides what a guard renders | gate identity, render state, marker ref |
| spec → future reviews / code | the ADR stops the uncorrected option (which publishes the writer) from being proposed again; traceability is checked against the tree by gate 10 | spec records |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-28-01 | Elevation of privilege | an option that publishes `gateWriterFor` (the review's uncorrected A) | high | mitigate | Outcome A as corrected keeps the writer in the out-of-barrel `GateWriter.ts`; `packages/react/src/index.ts` exports `GateRegistry.ts` only (no `GateWriter`/`useGate` line); `pnpm spec:api` 906 exports, no drift (28-04); ADR-QD-140 records why the review's form was rejected | closed |
| T-28-02 | Tampering | `d01_outcome` diverging from the human's reply | medium | mitigate | `28-01-SUMMARY.md` `d01_outcome: A` is machine-checked against the `_DECISIONS-v1.2.md` row by 28-01's verify; ADR-QD-140 quotes the row verbatim (2d575c8e) | closed |
| T-28-03 | Elevation of privilege | Task 1 auto-resolved by an unattended run | medium | mitigate | The checkpoint was not auto-selected: its answer is the human's own, recorded beforehand in `_DECISIONS-v1.2.md` (row "28-01 T1 (D-01)", per the user's ask-once rule) and named in the plan's resume signal; the executor took that answer and quoted it, and the SUMMARY states its source | closed |
| T-28-04 | Repudiation | a lifecycle rule losing its only test when the wrapper is deleted | medium | mitigate | 28-02 moved all seven `GateWriter.test.tsx` cases onto `useGateRegistrations` with unchanged assertions (1b43a6fc) before deleting the wrapper (0ccfe996) | closed |
| T-28-05 | Spoofing | a stale registration surviving a reconcile | medium | mitigate | `GateWriter.reconcile.test.ts` covers dropped-id and changed-identity cases (8b03a02c red, 212dcf48 green); 28-05 added "a stale handle's update after a same-id re-registration does not touch the new entry" (8fbd9f58), killing a real `GateRegistry.ts` survivor | closed |
| T-28-06 | Tampering | the extraction changing when a registration happens (render-time instead of effect-time) | medium | mitigate | `reconcile` is called only from the existing effect; `useGate.ts` holds 3 `useEffect(` calls, `GateWriter.ts` none and imports types only; the 28-02 lifecycle tests ran unedited | closed |
| T-28-07 | Elevation of privilege | the writer or `useGates` reaching the barrel during the move | high | mitigate | Neither `GateWriter.ts` nor `useGate.ts` is in `src/index.ts`; `pnpm spec:api` green at 28-04 and inside 28-05's `pnpm check:pr`; `sameIdentity` was exported from `GateWriter.ts` but stays out of the barrel | closed |
| T-28-08 | Denial of service | an import cycle after the split | medium | mitigate | `pnpm circular`: "No circular dependency found!" at HEAD; `GateWriter.ts` has only type imports (`@qadi/core`, `DecisionOutcome.ts`) | closed |
| T-28-09 | Tampering | the ADR misstating the human's choice | medium | mitigate | ADR-QD-140 quotes the decisions-table row and branches on the machine-checked `d01_outcome`; ADR-QD-111/080 amendments are dated sections under CCR-QD-418 | closed |
| T-28-10 | Elevation of privilege | a regression slipping past per-plan checks | high | mitigate | `pnpm check:pr` exit 0 twice at the end of 28-05; post-merge `pnpm test` 177 files / 4595 tests; `git diff --name-only 9b44e6b5` of `scripts/`, `vitest.config.ts`, `stryker.react.mjs`, `.oxlintrc.json`, `AGENTS.md` empty; mutation aggregate 0.8239 → 0.8502 | closed |
| T-28-SC | Tampering | npm/pip/cargo installs | high | accept | no `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or `packages/react/package.json` changed since 9b44e6b5 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-28-01 | T-28-SC | No dependency is added or upgraded by this phase; no manifest, lockfile or workspace file changed since the base | plan-time threat model (28-01..28-05), confirmed by audit | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 11 | 11 | 0 | autonomous orchestrator (secure-phase, ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
