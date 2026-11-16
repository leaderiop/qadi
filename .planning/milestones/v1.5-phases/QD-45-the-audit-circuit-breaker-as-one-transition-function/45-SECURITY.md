---
phase: "45"
slug: "the-audit-circuit-breaker-as-one-transition-function"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-15"
---

# Phase 45: Security

> The per-phase security contract: threat register, accepted risks, and audit trail. The register is the union of the `<threat_model>` blocks in 45-01..45-08-PLAN.md, authored at plan time. It was verified by `gsd-security-auditor` against `git diff d6f1aff7..a3143071`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Host configuration → `AuditDecisionSinkLive` / `makeCircuitBreaker` | Options a host writes decide whether a down audit store is shed or hit on every record | `failureThreshold`, `resetTimeoutMs`, `storeCallTimeout` |
| Concurrent records → the breaker's `Ref` | Many fibers report outcomes and claim the probe at once | Success, Failure, Claim, Release events with a generation |
| Phase evidence → the close | A baseline or check edited would let the change judge itself | Mutation scores, the adapter table, the RED option rows |
| Branch → registry | Changesets and versions could publish | Package versions (nothing consumed) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-45-01 | Repudiation | `45-mutation-base.json` | medium | mitigate | Committed alone (`203bbbe2`), parent is `phase_base`, only the two measured files | closed |
| T-45-02 | Tampering | characterisation tests | high | mitigate | Table (`64422f42`) and RED rows (`849fb8a8`) added on an unedited `src`; `CircuitBreaker.test.ts` blob `6f2222f2` at base and HEAD | closed |
| T-45-03 | Tampering | `step`: stale Success/Failure/Release | high | mitigate | `admittedUnder` once before any arm (`CircuitBreaker.ts:308-312`), stale returns the state reference-equal; rows S1, F1, R2 and the property | closed |
| T-45-04 | Elevation of privilege | half-open probe claim | high | mitigate | `claimState` keeps a claimed HalfOpen reference-equal; `claimProbe` wins only on a changed state, through the one `Ref.modify`; rows C1-C2, property `won <= 1` | closed |
| T-45-05 | Tampering | per-event conversion commits | medium | mitigate | One event per commit (`4576c7e6`, `ced81251`, `0bb2a761`, `70b02048`, `59fc4a79`); `admit`/`withPermit` text equal to the base at each | closed |
| T-45-06 | Denial of service | lost update under concurrency (INV-QD-052) | high | mitigate | One `Ref.modify(` (`CircuitBreaker.ts:412`) and one clock read (`:411`); `step` takes `now` | closed |
| T-45-07 | Denial of service | `failureThreshold` NaN/Infinity never opened | high | mitigate | `SinkOptionChecks.ts:14-17` positive integer, before `Ref.make`; six refusal rows | closed |
| T-45-08 | Denial of service | `resetTimeoutMs` zero/negative/NaN flapping | medium | mitigate | `SinkOptionChecks.ts:25-33` finite, positive, whole ms, raw input reported; refusal and accept rows | closed |
| T-45-09 | Denial of service | malformed `resetTimeoutMs` defect | medium | mitigate | `Duration.fromInput` (an `Option`), typed `InvalidAuditSinkOption`; no `orDie`, `throw` or `fromInputUnsafe` left | closed |
| T-45-10 | Denial of service | `storeCallTimeout` zero/NaN/negative/malformed | high | mitigate | `checkStoreCallTimeout` at layer build (`AuditDecisionSinkLive.ts:148`); zero row asserts no store call | closed |
| T-45-11 | Denial of service | `Duration.infinity` accepted for `storeCallTimeout` | low | accept | See Accepted Risks Log | closed |
| T-45-12 | Repudiation | changeset and upgrade entry | medium | mitigate | `"@qadi/audit": minor`, opens `**Breaking.**`, names the values; `upgrading.md` 0.13 entry | closed |
| T-45-13 | Tampering | README and website stating the old `never` type | low | mitigate | Both name `InvalidAuditSinkOption`; the old type remains only in the upgrade guide's Before snippet and ADR-QD-056's history | closed |
| T-45-14 | Tampering | spec records and ids | low | mitigate | Only ARCH-92, ADR-QD-158, CCR-QD-436, BEH-QD-561, INV-QD-335 added; no placeholder | closed |
| T-45-15 | Repudiation | mutation after-run | medium | mitigate | `45-mutation-after.json` (`90f77914`) after the last src commit; 0.8496 vs base 0.805, 1 vs 1, new files 1; no disable comment | closed |
| T-45-16 | Tampering | gates, budgets, configs, manifests | high | mitigate | No change to scripts, Stryker/vitest/tsconfig/oxlint configs, manifests, lockfile, `packages/core`, `packages/testing` or AGENTS.md | closed |
| T-45-17 | Elevation of privilege | release, tag or push | high | mitigate | No remote branch contains HEAD; nothing staged; no tag, CHANGELOG or `package.json` change; changeset not consumed | closed |
| T-45-SC | Tampering | dependency installs | high | mitigate | No manifest or lockfile change since `d6f1aff7` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Threat ID | Risk | Why accepted | Guard |
|-----------|------|--------------|-------|
| T-45-11 | A host that passes `storeCallTimeout: Duration.infinity` lets a hung audit store hold `record` | The opt-out is the user's decision (45-CONTEXT D-06a) and documented in BEH-QD-379, ADR-QD-126 and the README; the default stays 5 seconds | The accept row in `CircuitBreakerOptions.test.ts` and the infinity row in `AuditSinkDeadline.test.ts` pin it as a choice |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-15 | 18 | 18 | 0 | gsd-security-auditor (sonnet), ASVS L1, block on high |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
