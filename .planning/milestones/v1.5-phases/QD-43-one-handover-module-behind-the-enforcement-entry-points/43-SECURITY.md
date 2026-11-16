---
phase: "43"
slug: "one-handover-module-behind-the-enforcement-entry-points"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-15"
---

# Phase 43: Security

> The per-phase security contract: threat register, accepted risks, and audit trail. The register is the union of the `<threat_model>` blocks in 43-01..43-08-PLAN.md, authored at plan time. It was verified by `gsd-security-auditor` against `git diff 712317c1..c758852f`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Caller → enforcement entry point | A caller hands a policy, options and a value to `guard`, `enforce*`, `filter*` or the `@qadi/promise` facade | The resource the decision is taken on; the value handed over |
| Evaluation → handover | `Handover.ts` decides, discharges obligations, and releases whole or projected | `Allow` / `Deny` decisions, obligations, projected fields |
| Library → HTTP response body | `AccessDenied` / `AccessDeniedPublic` reach `@qadi/http` responses | Denial reason and trace (unchanged by this phase) |
| Branch → registry | Changesets and versions could publish | Package versions (nothing consumed) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-43-01 | Repudiation | `43-mutation-base.json` | medium | mitigate | Committed alone (`10824b9b`), parent is `phase_base`, `Handover.ts` recorded as `moved` | closed |
| T-43-02 | Tampering | RED type tests | medium | mitigate | `Parameters<…>[2]` refusals plus callable controls in `Qadi.tst.ts`; RED on the base per 43-01-SUMMARY | closed |
| T-43-03 | Repudiation | `Handover.test.ts` pins | medium | mitigate | Committed before the first `src` change (`0fd2a9fb`); per-entry-point columns asserted | closed |
| T-43-04 | Elevation of privilege | `enforceProjected` confused deputy | high | mitigate | Decides through `resourceFree(options)` (`Qadi.ts:155`, `Handover.ts:222-225`); the smuggled-resource case passes | closed |
| T-43-05 | Elevation of privilege | second resource beside a handed-over value | high | mitigate | `HandoverOptions` `resource?: never`; `decidedOn` writes the positional value last; tstyche and runtime cases pass | closed |
| T-43-06 | Elevation of privilege | undischarged binding obligation proceeds | high | mitigate | `discharge` moved byte-identical; `verdictOf` admits only after it; binding-with-no-handler cases pass | closed |
| T-43-07 | Denial of service | refusal turned into a defect | medium | mitigate | `AccessDenied` stays in the typed channel; no `orDie`/`die`/`catchCause` in either file | closed |
| T-43-08 | Information disclosure | `AccessDenied` gains a field | medium | mitigate | `Errors.ts` unchanged; the one construction sets the four existing fields | closed |
| T-43-09 | Elevation of privilege | array and stream forms disagree | high | mitigate | One per-item `handOver` behind all four `filter*` (`Qadi.ts:338,373,401,432`); array = stream cases pass | closed |
| T-43-10 | Tampering | facade decides | medium | mitigate | `@qadi/promise` diff is two option types plus comments; implementation still forwards only | closed |
| T-43-11 | Repudiation | stale docs | low | mitigate | Stale-phrase scan: 0 hits | closed |
| T-43-12 | Elevation of privilege | release via a consumed changeset | high | mitigate | No CHANGELOG/package.json change; `.changeset` only gained files | closed |
| T-43-13 | Repudiation | ADR history rewritten | medium | mitigate | Removed lines in ADR-019/022/035/104/105 are Revision/Change History rows only | closed |
| T-43-14 | Tampering | ids outside the reservation | medium | mitigate | Only ADR-QD-156, CCR-QD-434, BEH-QD-551/552, INV-QD-331, ARCH-90; reservations file unchanged | closed |
| T-43-15 | Repudiation | spec cites deleted helpers | medium | mitigate | 0 hits for `LoadedEnforceOptions`/`decideOne`/`withLoadedResource`/`permitted(` outside history | closed |
| T-43-16 | Information disclosure | spec teaches the override | low | mitigate | BEH-QD-551 states the refusal; override sentence absent | closed |
| T-43-17 | Repudiation | incomplete CCR row | low | mitigate | CCR-QD-434 row derived from the phase diff; house-style clean | closed |
| T-43-18 | Tampering | judging scripts/configs/lockfiles edited | high | mitigate | Name-only diff over scripts, configs, manifests, lockfiles, barrel and `Errors.ts` is empty | closed |
| T-43-19 | Elevation of privilege | release, tag or push | high | mitigate | No tag contains the base; HEAD on no remote branch; branch `arch-wave-10` only | closed |
| T-43-20 | Repudiation | baseline re-taken or mutant suppressed | medium | mitigate | Base JSON has one commit; after = 1.0 / 1.0; no Stryker-disable or ignore comment added | closed |
| T-43-SC | Tampering | dependency installs | high | mitigate | No manifest or lockfile change since `712317c1` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-15 | 21 | 21 | 0 | gsd-security-auditor (sonnet), ASVS L1, block on high |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
