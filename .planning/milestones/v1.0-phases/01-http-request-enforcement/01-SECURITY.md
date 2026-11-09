---
phase: "01"
slug: "http-request-enforcement"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-08"
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → HTTP route / HttpApi endpoint | An untrusted request reaches `portRoutesUnguarded`, every `addGuardedRoute` route and `RequirePermission`'s middleware | Bearer token, JSON body |
| route → credential store | `SubjectExtractor`'s lookup may fail; its reason stays server-side | Extraction failure reason (sensitive) |
| server → response body / generated client | Enforcement failures are projected; `trace`, resolver `cause`s and extraction reasons must not cross | Projected wire values only |
| open SSE connection | A revoked principal must stop receiving decisions at the next recheck | Decision frames |
| server log | The operator's only record of an extraction failure or a denial | Log lines with `qadi.denial_site` |
| spec → code | `spec/` is normative (AGENTS.md §11) | Behaviour and invariant records |
| repo → npm consumers | The changeset and export set reach consumers at the next release | Public export surface |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Repudiation | `portRoutesUnguarded` extraction failure | high | mitigate | `PortRoutes.ts:184` routes through `enforceSubject`; `logSubjectExtractionFailed` (`QadiHttpError.ts:430`) is the one tap | closed |
| T-01-02 | Elevation of Privilege | subject-only mode (`enforceSubject`) | high | mitigate | Handler runs only after successful extraction; `PortRoutes.test.ts:465` asserts the port double's `calls.length === 0` on extraction failure | closed |
| T-01-03 | Information Disclosure | projection moved into the module | medium | mitigate | `answerWithResponse` is the failure's `toResponse` (`AuthorizeRequest.ts:75`); projections unchanged | closed |
| T-01-04 | Information Disclosure | `AuthorizeRequest.ts` leaving the barrel | low | mitigate | Named re-export of only `authorizeRequest` / `AuthorizedRequest` (`GuardApi.ts:32-33`); `pnpm spec:api` green | closed |
| T-01-05 | Elevation of Privilege | `endpointMemberKey` in guardApi and middleware | high | mitigate | One function used for registration (`GuardApi.ts:150`) and check (`RequirePermissionMiddleware.ts:90`); `GuardApi.test.ts:185` outside-the-API 500 test | closed |
| T-01-06 | Information Disclosure | middleware projection (`answerInChannel`) | high | mitigate | Uses `projectHttpEnforcementFailure` (`AuthorizeRequest.ts:33`); `http.test.ts:765` no-`trace` test green | closed |
| T-01-07 | Repudiation | handler-denial log for middleware and recheck | medium | mitigate | One tap annotates `qadi.denial_site` (`DenialLog.ts:27`); asserted in `RequestEnforcement.test.ts` | closed |
| T-01-08 | Elevation of Privilege | decision stream recheck | high | mitigate | Recheck runs the full edge step via `enforceRequest` (`DecisionStreamRoute.ts:257`); reauth tests green; zero `Effect.orDie` in `packages/http/src` | closed |
| T-01-09 | Repudiation | future caller dropping or doubling a log line | medium | mitigate | Table-driven `RequestEnforcement.test.ts`, total over caller × column, with pinned `NotApplicable` cells | closed |
| T-01-10 | Information Disclosure | pruning a test that also guarded redaction | medium | mitigate | Redaction and body-shape tests kept (`http.test.ts:765`); coverage gate green | closed |
| T-01-11 | Repudiation | BEH-QD-321 / new BEHs / new INV | low | mitigate | `INV-QD-243` (`spec/invariants.md:3235`) cites the table-driven suite; `pnpm spec:verify:strict` green | closed |
| T-01-12 | Tampering | the merge gate | medium | mitigate | `pnpm check:pr` ran unmodified (UAT 2026-11-08: every step green except the host-only `playwright --with-deps` sudo install) | closed |
| T-01-13 | Information Disclosure | the public export set | low | mitigate | `pnpm spec:api` and `pnpm spec:package` green | closed |
| T-01-SC | Tampering | npm/pip/cargo installs | high | accept | No package installed or added by any plan in this phase | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01-01 | T-01-SC | No dependency was added or installed by plans 01-01 to 01-05; there is no supply-chain surface to check | plan-time threat model | 2026-11-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-08 | 14 | 14 | 0 | /gsd-secure-phase (L1 grep-depth, plan-time register; auditor short-circuited) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-08
