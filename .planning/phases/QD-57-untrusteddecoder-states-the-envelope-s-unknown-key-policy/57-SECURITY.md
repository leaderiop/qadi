---
phase: "57"
slug: "untrusteddecoder-states-the-envelope-s-unknown-key-policy"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-19"
---

# Phase 57 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Untrusted JSON → `untrustedDecoder` | Every seam decodes through one recipe: project (under `ignore`), depth guard, `prepare`, strict decode | Sink records, stored envelopes, audit rows and archives, hydration payloads, policies, port wire |
| Schema → `EnvelopeKeys.ts` | The declared keys an `ignore` projection keeps are derived once, at build, from `SchemaAST.toEncoded` | Key sets (no input data) |
| Stored row → readers | `decodeStoredRecord`/`decodeStoredRecordString` stamp the envelope's own `environment` | Environment label, refusal tags and messages |
| Package API | `untrustedDecoder` requires `options.unknownKeys` (Breaking, `@qadi/core` minor); `UnknownKeyPolicy` exported | One public surface (936 exports) |
| Phase evidence → gate | D-12 decides WX-05 from committed JSONs | Mutation scores |
| Repo → npm | Release pipeline | Package artifacts (nothing released this phase) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-57-01 | Tampering | mutation base or script re-baselined | medium | mitigate | `57-mutation-base.json` and `57-mutation.mjs` are touched only by `chore(57-01)` 1b7c5da5 (parent `phase_base` 8a594712); 0 Stryker config changes; `compare` → `WX-05 holds (D-12)` (re-run by the orchestrator) | CLOSED |
| T-57-02 | Repudiation | reserved numbers | low | mitigate | 57-01 confirmed the ten ids free at `phase_base`; 57-11's scan checked the reservation file unchanged; `next-id.mjs` never run | CLOSED |
| T-57-03 | Denial of Service | record-wire and stored-envelope depth | medium | mitigate | R4/S4 run 60,000 deep in `assert.doesNotThrow`; R6/S6 pin `TooDeep` for a declared key | CLOSED |
| T-57-04 | Tampering | `__proto__` and inherited keys | medium | mitigate | R13, R14, S7, S13 present and green | CLOSED |
| T-57-05 | Tampering | audit row's and archive's own unknown keys accepted | medium | mitigate | `AuditEntry.ts` and `AuditArchive.ts` state `unknownKeys: "refuse"`; A2..A4, V2..V4 unedited and green | CLOSED |
| T-57-06 | Denial of Service | 60,000-deep row or record key | medium | mitigate | A4, A7, V4 present and green | CLOSED |
| T-57-07 | Tampering | `ignore` projection keeping an undeclared key | high | mitigate | `project` keeps only `keys.has(key)` entries (`UntrustedDecode.ts:171-173`); U4, U6, U7, U10, U13, U14 green | CLOSED |
| T-57-08 | Elevation of Privilege | seam loosened by an omitted or misspelt policy | high | mitigate | `unknownKeys` required and closed (`UntrustedDecode.tst.ts`, tstyche green in `check:pr`); U16 refuses an underivable schema at build (`EnvelopeKeys.ts:68`) | CLOSED |
| T-57-09 | Denial of Service | projection before the guard | high | mitigate | projection copies own top-level entries only, no recursion; R4, U3 at 60,000 deep green | CLOSED |
| T-57-10 | Tampering | derivation keeping/dropping a key | high | mitigate | keys from `SchemaAST.toEncoded` (`EnvelopeKeys.ts:65`); U10, U13..U16 green; `EnvelopeKeys.ts` mutation 48/48 and 9/9 static Killed | CLOSED |
| T-57-11 | Elevation of Privilege | mutated or omitted policy | high | mitigate | policy indexed through `PROJECTION` (`UntrustedDecode.ts:182,212`), no `=== "ignore"`; every non-record seam states `refuse` (9 call sites) | CLOSED |
| T-57-12 | Tampering | `__proto__` in the projection | medium | mitigate | `Object.entries`/`Object.fromEntries`; R13, R14 green | CLOSED |
| T-57-13 | Denial of Service | deep `environment` / deep unknown envelope key | medium | mitigate | S15 (`TooDeep` for `environment`), S3/S4 (unknown key never walked) green | CLOSED |
| T-57-14 | Spoofing | producer's environment label | medium | mitigate | `stampRecord` once from the envelope's own `environment`; S13 (inherited → `Missing key`) green | CLOSED |
| T-57-15 | Repudiation | a stored row's refusal tag silently changed | medium | mitigate | S1..S9, SinkCodec and Source pins green; only D-18 moved, recorded in ADR-QD-170 and the changeset | CLOSED |
| T-57-16 | Tampering | mutation evidence | medium | mitigate | see T-57-01; the script refuses stale reports; evidence config stayed in the scratchpad | CLOSED |
| T-57-17 | Repudiation | static mutant claimed as covered | low | mitigate | `compare` credited all 9 `EnvelopeKeys.ts` static mutants only after the `ignoreStatic: false` run reported each Killed | CLOSED |
| T-57-18 | Repudiation | widening with no recorded owner decision | medium | mitigate | ADR-QD-170 quotes the owner's instruction verbatim; ADR-QD-096 Rev 1.6 and ADR-QD-143 Rev 1.4 amended after untouched originals | CLOSED |
| T-57-19 | Tampering | BEH-QD-486 read as permitting any loosening | medium | mitigate | BEH-QD-622 and INV-QD-360 name the single carve-out | CLOSED |
| T-57-20 | Repudiation | unannounced widening | medium | mitigate | core (minor, **Breaking.**) and audit (patch) changesets and the 0.13 upgrading section state D-01, D-17, D-18, D-20 | CLOSED |
| T-57-21 | Elevation of Privilege | accidental release or version bump | high | mitigate | 0 changes to `package.json`, `packages/*/package.json`, lockfile or any `CHANGELOG.md` since `phase_base`; 0 changesets deleted | CLOSED |
| T-57-22 | Tampering | banned construct or out-of-scope file | medium | mitigate | `57-scan.mjs` → `phase scan clean`; `check:pr` (house-style gate) exit 0 | CLOSED |
| T-57-23 | Repudiation | RED-first order or mutation base rewritten | medium | mitigate | first `packages/*/src` commit is `feat(57-05)!` 9d109bab, after every `test(57-02..04)` commit; scan checked order and trailers | CLOSED |
| T-57-24 | Elevation of Privilege | accidental release from the close | high | mitigate | 0 remote branches contain HEAD; 0 tags contain a phase commit; nothing pushed | CLOSED |
| T-57-SC | Tampering | npm/pip/cargo installs | high | mitigate | 0 manifest, lockfile or workspace changes since `phase_base` | CLOSED |

---

## Accepted Risks Log

None.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-19 | 25 | 25 | 0 | orchestrator (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-19
