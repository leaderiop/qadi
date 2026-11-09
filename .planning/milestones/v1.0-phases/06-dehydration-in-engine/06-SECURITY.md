---
phase: "06"
slug: "dehydration-in-engine"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-08"
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| server render → page HTML | A dehydrated payload is authorization state embedded in a page that developer tools and any script on the page can read | Decisions for one subject; trace only under `includeTrace: true` — sensitive |
| page JSON → client registry | The client decodes the payload as untrusted JSON through `hydrateWith` (unchanged by this phase) | Versioned seed payload — untrusted input |
| spec → reviewers and integrators | The normative spec states the hydration guarantees and where each rule lives | Normative text — integrity-sensitive |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-06-01 | Information disclosure | `dehydrateWith` subject filter | high | mitigate | Filter runs inside `dehydrateWith` (`HydrationEngine.ts:283`) before projection; `dehydrateEntry`/`dehydratedPayload` are module-private (`:235`, `:249`); round trip in `HydrationEngine.test.ts` asserts the foreign entry reaches neither payload nor seed; byte goldens in `HydrationPayload.test.ts` | closed |
| T-06-02 | Information disclosure | `includeTrace` default | high | mitigate | `options?.includeTrace ?? false` (`HydrationEngine.ts:281`); `Withheld` pinned in the goldens and the round trip | closed |
| T-06-03 | Repudiation | `ForeignSubject` count and `onDropped` report | medium | mitigate | `countDropped("ForeignSubject", …)` (`HydrationEngine.ts:289`) and one report of exactly the foreign entries (`:292`); `HydrationCounts.ts` unchanged since phase start (`git diff 08f3051 HEAD` empty) | closed |
| T-06-04 | Information disclosure | default console reporter | medium | mitigate | Reporter still resolved via `droppedEntriesReporter` (`HydrationEngine.ts:290`); `DeveloperSignals.ts` unchanged since phase start; `DeveloperSignals.test.ts` green | closed |
| T-06-05 | Elevation of privilege | engine reachability | low | mitigate | `HydrationEngine.ts` not in `packages/react/src/index.ts`; `exports` map is `"."` only; `pnpm spec:api` green | closed |
| T-06-06 | Repudiation | BEH-QD-146 / INV-QD-022 / INV-QD-045 / ADR-QD-078 wording | medium | mitigate | Edits add the structural requirement and Source/Enforcement text only (commits `10f7e06`, `28e0cc1`); `node scripts/spec-revise.mjs --check` and `pnpm spec:verify:strict` (PASS 21, FAIL 0) green | closed |
| T-06-07 | Tampering | spec registries (index.yaml, traceability, CCR register) | low | mitigate | `pnpm spec:verify:strict` green; gate 13 (`pnpm spec:api`) green | closed |
| T-06-08 | Information disclosure | `.changeset/dehydrate-in-engine.md` | low | accept | See Accepted Risks Log | closed |
| T-06-SC | Tampering | npm/pip/cargo installs (06-01) | high | accept | See Accepted Risks Log | closed |
| T-06-SC | Tampering | npm/pip/cargo installs (06-02) | high | accept | See Accepted Risks Log | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-08 | The changeset names only public API and internal module names already visible in the published `src/`, and no secrets | 06-02-PLAN threat model | 2026-11-08 |
| AR-06-02 | T-06-SC | Neither plan installs a package (no dependency change in either plan's commits) | 06-01/06-02-PLAN threat models | 2026-11-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-08 | 10 | 10 | 0 | secure-phase (L1 grep-depth, orchestrator) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-08
