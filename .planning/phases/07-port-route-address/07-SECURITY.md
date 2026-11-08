---
phase: "07"
slug: "port-route-address"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-08"
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → port route | An untrusted request reaches `portRoutes` / `portRoutesUnguarded` at the path `portPath` computes | bearer token, JSON port question (subject ids, attribute names) |
| network / proxy → client | A response body and status cross back to `remotePortsLayer`; an intermediary can substitute either | `PortWireReply` body (port answers, refusals) or a foreign page |
| server config ↔ client config | The route prefix is configured separately on each side; a mismatch must fail closed | route prefix string |
| spec → code | The spec is normative (AGENTS.md §11); a BEH misstating the reply-body contract would let a status-reading client pass review | normative text |
| repo → merge gate | `pnpm check:pr` is the definition of done (AGENTS.md §15) | gate configuration |
| repo → npm consumers | Export set and changeset reach consumers at the next release | `@qadi/http` public surface |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-01 | Spoofing | `remotePortsLayer` decode step | high | mitigate | `RemotePorts.ts:56-59` decodes the body whatever the status (comment at the decode step); `PortRoutes.test.ts` `describe("the client reads the reply from the body, whatever the status (ARCH-52)")` pins an HTML 502 as the port's own `Transport` error, a refusal under 200 as an error, an answer under 503 as the answer | closed |
| T-07-02 | Denial of Service | server/client prefix mismatch | medium | mitigate | Both sides build the path through `portPath` (`PortRoutes.ts:132,180`, `RemotePorts.ts:56`); test `${form}: a client left on the default prefix gets the port's own error, never an answer` asserts the failure `_tag` equals the port's own error | closed |
| T-07-03 | Elevation of Privilege | guarded route under a custom prefix | high | mitigate | Guarded form still mounts through `addGuardedRoute(..., portPath(options?.prefix, port), permission, policy, ...)` (`PortRoutes.ts:129-135`); test `guarded: a subject without the permission is still denied under the prefix` asserts 403 for bob under `/x/ports` | closed |
| T-07-04 | Information Disclosure | `PortRouteAddress.ts` exports | low | mitigate | Not referenced from `packages/http/src/index.ts` nor `packages/http/package.json` `exports`; `pnpm spec:api` 862 exports, unchanged | closed |
| T-07-05 | Repudiation | BEH-QD-338 and BEH-QD-333's pointer | low | mitigate | `spec/behaviors/23-http.md` BEH-QD-338 REQUIREMENT (2) states a non-reply body is the port's own error; traceability §4 row cites the ARCH-52 tests; 07-03 reconciled the names; `pnpm spec:verify:strict` 21 PASS | closed |
| T-07-06 | Tampering | the merge gate | medium | mitigate | `git diff 1cb87a3 HEAD` touches no file under `scripts/`, no `package.json`, vitest config, `.oxlintrc.json` or lockfile; `pnpm spec:gates` 25 steps match `pnpm check` | closed |
| T-07-07 | Information Disclosure | `@qadi/http`'s export set | low | mitigate | Same evidence as T-07-04; package-install gate (`pnpm spec:package`) green in the 07-03 `pnpm check:pr` run | closed |
| T-07-SC | Tampering | npm installs | high | accept | No package installed or added by any plan (empty diff on `pnpm-lock.yaml` and every `package.json`) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | T-07-SC | No dependency was installed or added in phase 07, so there is no supply-chain surface to check | plan-time threat model (07-01/02/03 PLAN) | 2026-11-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-08 | 8 | 8 | 0 | gsd-secure-phase (orchestrator, ASVS L1 grep-depth short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-08
