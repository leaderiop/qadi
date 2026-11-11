---
phase: "27"
slug: "bare-route-module"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 27 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| handler requirement typing → caller | a route that silently discharges `CurrentSubject` from a loader that runs outside the subject scope would compile and fail at runtime | handler and loader requirement types |
| client → bare guarded route | a request reaches a handler only through extraction, the edge decision and the handler step | HTTP request, subject, loaded resource |
| package → consumer | `@qadi/http`'s export list is the contract (ADR-QD-099) | type and value exports |
| spec → code | traceability and the overview are checked against the tree by gates 10 and 13 | spec records |
| repository → consumer | the changeset is what a consumer reads before upgrading | `.changeset/bare-route-module.md` |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-27-01 | Elevation of privilege | an over-wide `Exclude` that hides a loader's real `CurrentSubject` requirement | medium | mitigate | `GuardRoute.tst.ts` pins both directions on `addGuardedRoute` (handler's `CurrentSubject` discharged in the three- and four-argument forms; loader's not), added in 49c2b064 on the phase base before 27-02 moved the implementation; the `Exclude<R \| EvaluationServices, CurrentSubject> \| LR` shape at `GuardRoute.ts:60` keeps `LR` outside the exclusion; tstyche 8 tests / 12 assertions green | closed |
| T-27-02 | Repudiation | tests deleted before their replacement exists | low | mitigate | 27-01 added the replacements and left the `guardRoute` tests in place; 27-02 (11d3ea7a) deleted them in the same commit that removed `guardRoute`, with the four `PermissionRegistry.tst.ts` overload pins moved into `GuardRoute.tst.ts` | closed |
| T-27-03 | Elevation of privilege | `addGuardedRoute` mounting a handler without enforcement after the inline | high | mitigate | `GuardRoute.ts:140` calls `enforceRequest({ permission, policy, loadResource }, answerWithResponse, …)` exactly as `guardRoute` did; the http project ran unedited at 302 passed in 27-01 and 27-02 (403/502 mapping, the ordering test through `addGuardedRoute`, registry listing); full `pnpm test` 4582 passed at the end | closed |
| T-27-04 | Information disclosure | `unguardedRoutes` becoming public through the barrel | medium | mitigate | `packages/http/src/index.ts` exports `GuardRoute.ts` and `PermissionRegistryRoute.ts` and has no `UnguardedRoute` line; `pnpm spec:api` green (906 exports, no drift) in 27-02 and inside 27-03's `pnpm check:pr` | closed |
| T-27-05 | Denial of service | an import cycle breaking module load order | low | mitigate | `pnpm circular` reports "No circular dependency found!" at HEAD with `/__permissions` in `PermissionRegistryRoute.ts` and no re-export left in `PermissionRegistry.ts` | closed |
| T-27-06 | Repudiation | the two requirement deviations going unrecorded, so the next review re-proposes the cyclic shape | medium | mitigate | CCR-QD-417 in `spec/README.md` and the ADR-QD-036 Rev 1.10 amendment state both deviations with their reasons (76cffc31, 5d4d39f1); `pnpm spec:verify:strict` PASS 21 / FAIL 0 | closed |
| T-27-07 | Elevation of privilege | a regression slipping past per-plan checks | high | mitigate | `pnpm check:pr` exit 0 at the end of 27-03 (every suite, BDD, coverage, package-install gate); `git diff --name-only b1e2b1d7` of `scripts/`, `vitest.config.ts`, `stryker.http.mjs`, `.oxlintrc.json`, `AGENTS.md` is empty; mutation aggregate 138/138 against a base of 137/139 | closed |
| T-27-SC | Tampering | npm/pip/cargo installs | high | accept | no `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or `packages/http/package.json` changed since b1e2b1d7 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-27-01 | T-27-SC | No dependency is added or upgraded by this phase; no manifest, lockfile or workspace file changed since the base | plan-time threat model (27-01..27-03), confirmed by audit | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 8 | 8 | 0 | autonomous orchestrator (secure-phase, ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
