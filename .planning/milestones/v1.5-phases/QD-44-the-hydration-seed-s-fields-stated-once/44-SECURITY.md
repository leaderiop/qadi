---
phase: "44"
slug: "the-hydration-seed-s-fields-stated-once"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-15"
---

# Phase 44: Security

> The per-phase security contract: threat register, accepted risks, and audit trail. The register is the union of the `<threat_model>` blocks in 44-01..44-06-PLAN.md, authored at plan time. It was verified by `gsd-security-auditor` against `git diff e7e89658..7c22d2e7`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Server payload (untrusted JSON) → `decodeEntry` → `rebuild` → seed | A seed is an authorization answer the UI acts on before the client evaluates | Decision fields the payload discloses; the disclosure (trace, a denial's reason) |
| Core's wire → the payload a page embeds | Whatever the wire carries ships to the browser unless the row withholds it | `evaluationId`, `durationMillis`, `visibleFields`, `obligations` |
| Seed type → consumers of `@qadi/react` | Withheld fields appear only inside `disclosure` | The seed's own keys |
| Phase evidence → the close | A baseline or check edited would let the change judge itself | Mutation scores, the byte golden |
| Branch → registry | Changesets and versions could publish | Package versions (nothing consumed) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-44-01 | Repudiation | `44-mutation-base.json` | medium | mitigate | Committed alone (`ebfdaf4b`), parent is `phase_base`, only the two measured files, one commit | closed |
| T-44-02 | Tampering | scratch field in `DecisionWire.ts` | high | mitigate | No committed change under `packages/core`; no `scratch` field in `src` or `lib`; tree clean | closed |
| T-44-03 | Information disclosure | `AllowSeedFields` / `DenySeedFields` | medium | mitigate | `Struct.omit` of `ALLOW_WITHHELD`/`DENY_WITHHELD` (`SeededDecision.ts:63-100`); property and `Hydration.tst.ts` key-set pins pass | closed |
| T-44-04 | Tampering | `rebuild`'s spread | high | mitigate | Only `decodeEntry`'s strict output reaches `rebuild` (`HydrationEngine.ts:519-543`); decoder and payload tests unchanged; `subjectId` written last | closed |
| T-44-05 | Spoofing | entry `_tag` surviving on the seed | medium | mitigate | `Data.TaggedClass` sets `_tag` after the copy; property asserts `Seeded`+verdict; `isAllowed` pin intact | closed |
| T-44-06 | Spoofing | `entryAgrees` claims | high | mitigate | Withheld and `policyTag` guards verbatim (`HydrationEngine.ts:426-431`); claims equal the base's; forged-disclosure tests unedited and passing | closed |
| T-44-07 | Information disclosure | a new wire field reaches payload and seed by default | low | accept | See Accepted Risks Log | closed |
| T-44-08 | Repudiation | changeset and upgrade entry | medium | mitigate | `@qadi/react` minor, **Breaking.**, optional key, `Object.keys`, `Equal.equals`, unchanged bytes; no "patch" | closed |
| T-44-09 | Tampering | ids in 44-04 records | low | mitigate | Only ARCH-91, ADR-QD-157, CCR-QD-435, BEH-QD-556, INV-QD-333; no placeholder | closed |
| T-44-10 | Repudiation | CCR-QD-435 row | low | mitigate | Lists every changed file with matching Revs; unused reserved ids named | closed |
| T-44-11 | Tampering | gates, budgets, configs, base JSON | high | mitigate | No change to scripts, Stryker/tsconfig/vitest/oxlint configs, manifests, lockfile or `packages/core`; AGENTS.md change confined to §7 | closed |
| T-44-12 | Elevation of privilege | release, tag or push | high | mitigate | No tag contains the base; HEAD on no remote branch; no CHANGELOG/package.json change; `.changeset` only gained a file; nothing staged | closed |
| T-44-13 | Repudiation | mutation after-run | medium | mitigate | `44-mutation-after.json` (`7850fa8f`) after the last src commit; 1 / 0.875, no drop; report sources match disk; no disable comment | closed |
| T-44-SC | Tampering | dependency installs | high | mitigate | No manifest or lockfile change since `e7e89658`; `fast-check` already declared | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Threat ID | Risk | Why accepted | Guard |
|-----------|------|--------------|-------|
| T-44-07 | The payload and the seed are a deny-list of core's wire, so a field the wire gains ships to the browser by default | It is the requirement (HYDF-01, HYDF-03), and the payload was already derived from the wire at the base; `trace` and a denial's `reason`/`obligations` stay withheld by name | ADR-QD-157 Consequences; the byte golden in `packages/react/test/HydrationSeedFields.test.ts:182-218` fails on any new key |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-15 | 14 | 14 | 0 | gsd-security-auditor (sonnet), ASVS L1, block on high |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
