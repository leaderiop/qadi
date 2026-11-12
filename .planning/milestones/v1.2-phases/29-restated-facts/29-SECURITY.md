---
phase: "29"
slug: "restated-facts"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-12"
---

# Phase 29 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| metrics registry → dashboards | a metric's id and description are its registry key (ADR-QD-052) | `qadi_port_*` metric ids and descriptions |
| port description → devtools decoder | a recorded span names the port a call went to | span names |
| hydration payload → client | the server withholds the trace and a denial's reason unless disclosed | dehydrated decision entries |
| devtools panel → reviewer | a failure must never read as a denial (INV-QD-006) | the failure sentence |
| spec → future reviews | the change record and reserved numbers are checked by gate 10 | CCR-QD-419, ADR-094 amendment |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-29-01 | Repudiation | a metric re-keyed by the move (reads zero forever) | medium | mitigate | `git diff 50c7292d -- packages/core/src/PortMetrics.ts` changes no `Metric.` or `qadi_` line: only the two unions left and a type import was added (2bfc6cc1); `Ports.test.ts` pins the descriptions and ran green in the core project (2084 tests) and in the final `pnpm check:pr` | closed |
| T-29-02 | Information disclosure | a withheld field (trace, reason) leaking into a payload when the lists are merged | high | mitigate | `ALLOW_WITHHELD`/`DENY_WITHHELD` (`HydrationEngine.ts:90,96`) feed both the schema (:107, :112) and `dehydrateDecision` (:236, :240), so the two uses cannot diverge; `HydrationPayload.test.ts` "%s survives dehydrate, JSON and hydrate" decodes allow and deny entries through `decodeEntry` under `UNTRUSTED_DECODE_OPTIONS` with `includeTrace` false and true, and its byte-exact pins cover both forms; 94841eb0 added a refusal test that raised the file's mutation score 0.9619 → 0.9693 | closed |
| T-29-03 | Spoofing | a description claiming another port's span, decoded as the wrong port by devtools | low | mitigate | `PortDescription.span: PortSpanOf<N>` (D-02 fallback not taken); `PortName.tst.ts` asserts a `span: "qadi.acted"` is not assignable to the attribute resolver's span; tstyche 233 passed | closed |
| T-29-04 | Tampering | the failure sentence changing on one screen only | low | mitigate | "depended on failed" appears only in `packages/devtools/src/model/Verdict.ts`; both panels render `FAILURE_IS_NOT_A_DENIAL` (d4813a15); `git diff 50c7292d -- packages/devtools/test` is empty, so the three wording tests passed unedited | closed |
| T-29-05 | Repudiation | a record claiming a change that did not happen, or an unused number silently reused later | low | mitigate | CCR-QD-419 lists its files from `git diff` and states ADR-QD-141, BEH-QD-480..484 and INV-QD-302..303 unused; no `spec/decisions/141-*` exists; `pnpm spec:verify:strict` green inside the final `pnpm check:pr` | closed |
| T-29-06 | Tampering | the gate passing because a threshold or budget was loosened | medium | mitigate | `git diff --name-only 50c7292d` over `scripts/`, `AGENTS.md`, the vitest configs, the three Stryker configs and `.oxlintrc.json` is empty; final `pnpm check:pr` exit 0 (16 of 17 steps, mutation skipped by design) | closed |
| T-29-SC | Tampering | npm/pip/cargo installs | high | accept | no `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or package manifest changed since 50c7292d; the astro `@astrojs/check` install prompt was declined (stdin closed), nothing installed | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-29-01 | T-29-SC | No dependency is added or upgraded by this phase; no manifest, lockfile or workspace file changed since the base | plan-time threat model (29-01..29-03), confirmed by audit | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 7 | 7 | 0 | autonomous orchestrator (secure-phase, ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
