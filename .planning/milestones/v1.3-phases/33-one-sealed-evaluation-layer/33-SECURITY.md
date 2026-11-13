---
phase: "33"
slug: "one-sealed-evaluation-layer"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-12"
---

# Phase 33 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| A simulation's imagined decisions → the application's `DecisionSink` and `DecisionCache` | A simulated decision must never reach a real audit row or cache entry (INV-QD-042) | Decision records, cache entries |
| The review layer → a test's outer sink and cache | A review layer that silently shadowed would make an audit assertion pass vacuously (INV-QD-311) | Decision records, cache lookups |
| Package boundaries (`@qadi/core` ↔ `effect/testing`, `@qadi/devtools` ↔ `@qadi/testing`) | Core imports no test module; devtools gains no runtime dependency on testing (ADR-QD-050) | Module dependency graph |
| Phase changes → the evidence that judges them | Baseline, pins, gates, scripts and configs | Build integrity |
| `spec/`, changesets, upgrade guide | The normative and consumer-facing record of the seal and the two breaks | Specification integrity |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-33-01 | Tampering | `33-mutation-base.json` misclassifying a touched core file | medium | mitigate | classified by Stryker's `mutate` globs; `measured: {}`, six unmeasured files with reasons, `EvaluationEnvironment.ts` under `new`; the phase's first plan commit (`cd00086e`) carries the JSON alone | closed |
| T-33-02 | Repudiation | a vacuous characterisation pin | medium | mitigate | outer sink and cache provided around the layer; `it.live` for clock cases; exact counts 4 + 4, green on the untouched base (`28f3237f`, `646ad991`) | closed |
| T-33-03 | Tampering | the rebuilt `simulationLayer` writing into an outer sink or cache | high | mitigate | `Simulation.ts:78` passes `shadow: "sinkAndCache"`; `shadow` has no default (type pin); 171 seal and conformance tests green unchanged; the core test calls the installed sink's `record` directly | closed |
| T-33-04 | Information Disclosure | a private cache shared across simulation builds | medium | mitigate | `decisionCacheLayer()` is built inside `shadowing(...)` per layer build (`EvaluationEnvironment.ts`); the freshness case asserts one entry per run | closed |
| T-33-05 | Repudiation | the review layer silently shadowing | medium | mitigate | `QadiReviewLayer.ts:161` and `helpers.ts:56` pass `shadow: "none"`; 33-01's pin and the core `none` case prove outer sink and cache receive records | closed |
| T-33-06 | Elevation of Privilege | `clock: Layer.Layer<never>` admitting an arbitrary layer | low | accept | see Accepted Risks | closed |
| T-33-07 | Tampering | test files edited beyond the clock literal | medium | mitigate | line-diff shape check accepts only the exact substitution (39 + 4 counts held); re-proved over the phase history by 33-06 Task 1 | closed |
| T-33-08 | Elevation of Privilege | devtools importing `@qadi/testing`, or core importing `effect/testing` | medium | mitigate | no import in either direction (the one `@qadi/testing` match in devtools src is prose at `SimulationSource.ts:114`); `packages/devtools/package.json` unchanged since the base | closed |
| T-33-09 | Repudiation | INV-QD-042 / ADR-QD-146 describing a seal the code does not perform | medium | mitigate | restated Source names the builder, `sinkAndCache` and five ports; INV-QD-312 names the `.tst.ts` refusals; `spec:verify:strict` 21 / 0 | closed |
| T-33-10 | Repudiation | a break shipped without a Breaking record | medium | mitigate | `**Breaking.**` lead on exactly the testing and devtools changesets (core has none); `upgrading.md` `## 0.12: one clock vocabulary, EvaluationClock`, its After fence compiled by `spec:website-examples` | closed |
| T-33-11 | Tampering | an unreserved or placeholder id | low | mitigate | CCR-QD-424 names exactly ARCH-81, ADR-QD-146, CCR-QD-424, BEH-QD-501..505, INV-QD-311..312, "Unused: none"; no `…-NEXT` added (two pre-existing history rows are exempt) | closed |
| T-33-12 | Tampering | a judging file loosened in the phase it judges | high | mitigate | `scripts/`, `stryker.config.mjs`, `vitest.config.ts`, `AGENTS.md`, `.oxlintrc.json`, `tsconfig.json`, every `package.json` and `pnpm-lock.yaml` unchanged over `a201e2fb..HEAD` (re-checked at secure) | closed |
| T-33-13 | Repudiation | a surviving mutant hidden | high | mitigate | `EvaluationEnvironment.ts` scored 100.00 (6 killed, 2 ignored static, 0 survived / no-coverage); baseline in one commit; report fresher than core's newest src/test | closed |
| T-33-SC | Tampering | npm/pip/cargo installs | high | accept | see Accepted Risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on severity count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-33-01 | T-33-06 | `EvaluationEnvironmentOptions` has three in-repo callers, each passing `Layer.empty` or `TestClock.layer()`; the `.tst.ts` pins what is admitted; a branded clock layer has no consumer ask | plan-time threat model (33-02) | 2026-11-12 |
| AR-33-02 | T-33-SC | No package was installed in any plan of this phase (`pnpm-lock.yaml` and every `package.json` unchanged since the phase base) | plan-time threat model (all plans) | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 14 | 14 | 0 | secure-phase orchestrator (L1 grep, short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
