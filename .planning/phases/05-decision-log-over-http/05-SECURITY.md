---
phase: "05"
slug: "decision-log-over-http"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-08"
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| caller data → decision record → wire | A record carries caller-supplied resources and resolver causes (cycles, sets, throwing getters); encoding it must never throw or take other records down | decision records (authorization decisions, may carry caller resource data) |
| server → log reader | `/__decisions` and `/__decisions/backlog` publish decisions to a guarded reader; refusal reports say where, never what | decision log frames / JSON elements, refusal annotations (tag, path, evaluation id) |
| operator hook → server process | `onRefused` is caller code and may throw | refusal values |
| spec → code | The spec is normative (AGENTS.md §11); a misstated behaviour lets a silent-drop regression through review | normative behaviour text |
| repo → npm consumers | The changeset and export set reach consumers at the next release | `@qadi/http` public surface |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01 | Denial of Service | `frameEntry` / `frameEntries` / `jsonElements` | high | mitigate | `DecisionLogHttp.ts` encodes through core's total `encodeStoredRecord`/`encodeStoredRecordString` (`Result`, no throw); a refusal becomes `Result.fail` and drops only that element (`DecisionLogHttp.ts:76-95,130-137`); table cell "one refused in the middle" keeps before/after in all 3 framings | closed |
| T-05-02 | Denial of Service | `onRefused` that throws | high | mitigate | Hooks reached only via core's `reportEncodeRefusal` (`DecisionLogHttp.ts:26,54`), which contains a throw (CCR-QD-193); table cell "onRefused throws" in every framing | closed |
| T-05-03 | Repudiation | refusal reporting | medium | mitigate | One reporter per route span; table asserts hook calls, line count and span count per cell (`DecisionLogHttp.test.ts` `spans` column) | closed |
| T-05-04 | Information Disclosure | refusal annotations | medium | mitigate | Module builds no annotations (no `encodeRefusalAnnotations` in `DecisionLogHttp.ts`); house rule `no-refusal-annotation-outside-core` (`scripts/check-house-style.mjs:260`) passes in `pnpm lint` | closed |
| T-05-05 | Elevation of Privilege | the two routes' guards | high | mitigate | Both routes still built on `addGuardedRoute` (`DecisionBacklogRoute.ts:50`, `DecisionStreamRoute.ts:225`); `decisionBacklog.test.ts` and `decisionStream.test.ts` unedited since `ea07f3e` and green | closed |
| T-05-06 | Information Disclosure | package-private module leaking into public surface | low | mitigate | `DecisionLogHttp.ts` absent from `packages/http/src/index.ts`; only `frame` re-exported by name (`DecisionStreamRoute.ts:107`); `pnpm spec:api` unchanged export set | closed |
| T-05-07 | Repudiation | BEH-QD-337 and INV-QD-097 | low | mitigate | BEH-QD-337 in `spec/behaviors/26-decision-stream.md:462`, traced in `spec/traceability.md:68`; `pnpm spec:verify:strict` 21 PASS / 0 FAIL | closed |
| T-05-08 | Tampering | the merge gate | medium | mitigate | No diff since `ea07f3e` to `package.json`, `scripts/`, `vitest.config.ts`, `.github/`; no thresholds, budgets or KNOWN_GAPS entries changed | closed |
| T-05-09 | Information Disclosure | the public export set | low | mitigate | `pnpm spec:api` (862 exports, none added/removed) and the package-install step (`spec:package`, inside `check:pr` step 12) passed | closed |
| T-05-SC | Tampering | npm/pip/cargo installs | high | accept | No package added or installed by either plan; no diff to `pnpm-lock.yaml` or any `package.json` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-05-01 | T-05-SC | No dependency is added or installed by this phase, so there is no supply-chain surface to vet (accepted at plan time in both PLAN threat models) | plan-time threat model | 2026-11-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-08 | 10 | 10 | 0 | secure-phase orchestrator (L1 grep-depth short-circuit; register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-08
