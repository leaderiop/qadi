---
phase: "66"
slug: "the-decoder-reads-only-what-it-declares"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-20"
---

# Phase 66 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase changes `@qadi/core`'s untrusted-decode projection. Under `unknownKeys: "ignore"`, `project` (`UntrustedDecode.ts`) takes `Object.keys`, filters by the declared set and copies each kept value once with `Object.fromEntries`. `envelopeKeysOf` (`EnvelopeKeys.ts`) reads `_tag` itself, and only for a schema that flattens to more than one member. `SinkCodec.ts` changed in comments only. Hydration keeps `refuse`, and `packages/react` has an empty diff. The phase adds no export (939 before and after), no network, auth or file surface, and one `@qadi/core` patch changeset. Its threats are an undeclared accessor run by the decoder, a prototype write or prototype-chosen discriminant, a bench or mutation record that is not what it claims, and texts claiming more than the code holds.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| caller → `decodeSinkRecord` family / `decodeStoredRecord` | in-process values or JSON handed to the `ignore` seams (`sinkWire`, `storedWire`) | a record envelope, possibly with undeclared keys or accessors |
| text → `untrustedDecoder` | `JSON.parse` output from a store, socket or devtools page | plain data; own `__proto__` keys possible |
| server page → hydration (`refuse`) | the embedded hydration payload | seeds; an unknown key is refused |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-66-01 | Denial of service | an undeclared throwing accessor on a value given to `decodeSinkRecord`, `decodeSinkRecordWithJson` or `decodeStoredRecord` | medium | mitigate | RED first on 48921088 (f89e6451 before the fix 19fe60a0): 8 of 127 fail (U22–U25, R15, R16, S16, S17), re-shown by the verifier; GREEN at HEAD (317/317 across the four files) | closed |
| T-66-02 | Repudiation | a RED case failing for another reason | medium | mitigate | `66-RED-EVIDENCE.md` records the exact failed set and first failure lines; U26–U29, R17, S18 green on base as characterisations | closed |
| T-66-03 | Tampering | a mutation base from a stale or wrong report | medium | mitigate | `66-mutation-base.json` taken before any edit; the scorer checks file set, source hash and config | closed |
| T-66-04 | Denial of service | Stryker beside vitest or after a red test | low | mitigate | 66-01 ran Stryker before adding tests; `pgrep` precondition | closed |
| T-66-05 | Denial of service | `project` invoking an undeclared accessor | medium | mitigate | `UntrustedDecode.ts:187-188` `Object.fromEntries(Object.keys(input)…)` reads names first; variant A fails the 8 tests | closed |
| T-66-06 | Tampering | an own `__proto__` key turned into a prototype write | medium | mitigate | copy built by `Object.fromEntries`, never by assignment; R14 green; reviewer probe confirmed no pollution | closed |
| T-66-07 | Elevation of privilege | a union member chosen by an inherited or non-enumerable `_tag` | low | mitigate | `EnvelopeKeys.ts:87` reads `_tag` only via `propertyIsEnumerable`; variants C and D fail U26 | closed |
| T-66-08 | Denial of service | a declared accessor that throws, or an accessor under `refuse` / one level down | low | accept | owner kept scope at the projection; R17, S18, U27, U28 characterise it; INV-QD-097 and INV-QD-377 state it (review WR-01 fixed) | closed |
| T-66-09 | Repudiation | a comment claiming the projection reads no value | low | mitigate | old-claim regex finds nothing under `packages`; verifier checked every comment | closed |
| T-66-10 | Repudiation | a band or workload set chosen after the run | medium | mitigate | `analyze.mjs` (5% band, geomean ≤ +2%) committed in 4fbc4cb3 before the bench commit ed3c44f0; self-test 7 passed; planted widenings fail | closed |
| T-66-11 | Tampering | src left patched by an interrupted bench | medium | mitigate | `ab.sh` refuses a dirty tree and reverts on every exit; `packages` clean after the run | closed |
| T-66-12 | Repudiation | an `analysis.tsv` not produced by the committed runs | low | mitigate | verifier re-ran the analyzer on the committed data: 0 slower, geomean −2.13%, worst +3.5%, pass | closed |
| T-66-13 | Denial of service | host load skewing one arm | low | accept | interleaved arms, median of per-run minima; load (26–37) logged in twelve committed files and `66-BENCH.md` | closed |
| T-66-14 | Repudiation | a spec or AGENTS.md sentence still claiming the projection reads no value | medium | mitigate | the old-claim regex finds exactly the three correction lines; verifier checked ADR-170, INV-QD-097/306/360/377, BEH-QD-488/621/622/666, AGENTS.md §7a, `spec/overview.md` rows | closed |
| T-66-15 | Repudiation | a CCR row citing a stale revision after a later fix | medium | mitigate | after the review fixes the CCR-QD-457 row (`spec/README.md:394`) cites ADR-170 1.2, 08-serialization 1.7, invariants 1.165, traceability 1.232, overview 1.130, README 1.268, each equal to its file's line 8 (`ccr-row.mjs` and the verifier) | closed |
| T-66-16 | Tampering | a minted or reused id | low | mitigate | reserved ids only; ADR-QD-179, BEH-QD-667–670, INV-QD-378 appear only in the CCR row; `next-id.mjs` never run; traceability strict 21/0 | closed |
| T-66-17 | Elevation of privilege | a release triggered from this phase | low | mitigate | one changeset (`.changeset/core-decoder-reads-declared-keys.md`), no version/release/publish commit in `48921088..HEAD`, no tag contains 48921088, nothing pushed | closed |
| T-66-18 | Repudiation | a mutation drop hidden by a static mutant counted as Ignored | medium | mitigate | static evidence run (`ignoreStatic: false`, config outside the repo): UntrustedDecode 46/48, EnvelopeKeys 66/66, 0 Ignored; close compare 41/43→44/46, 58/58→57/57, 123/127 unchanged | closed |
| T-66-19 | Repudiation | a `check:pr` result not of the final tree | medium | mitigate | `check:pr` exit 0 on 678fb6d3 (after every fix); later commits change only `.planning/` | closed |
| T-66-20 | Tampering | an executable edit after the bench | medium | mitigate | the only `packages/*/src` commits after ed3c44f0 are 179285d1 and 2b8e3249, token-identical (TypeScript scanner, fixer and verifier); nothing in `packages/*/bench`, `scripts` or `package.json` | closed |
| T-66-21 | Denial of service | Stryker or `check:pr` beside another heavy process | low | mitigate | each ran alone in the foreground after a `pgrep` check | closed |
| T-66-22 | Repudiation | an equivalent survivor silenced by a suppression comment | medium | mitigate | no open mutant on a line the phase wrote; no Stryker-disable added; `stryker.config.mjs` unchanged | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-66-01 | T-66-SC | No dependency is installed, upgraded or removed in this phase | plan-time disposition (66-01..66-05) | 2026-11-20 |
| AR-66-02 | T-66-08 | Accessors under `refuse`, for `unwalked` keys and one level down are still read; scope kept at the projection by the owner and stated in INV-QD-097 / INV-QD-377 | owner (66-CONTEXT) | 2026-11-20 |
| AR-66-03 | T-66-13 | The bench ran on a loaded host and was not waited out | orchestrator, plan-time disposition (66-03); not an owner decision, although the 66-03 threat row said "(owner)" | 2026-11-20 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **Review IN-02:** two behaviour differences on accessors that answer differently per read are unstated and unpinned (both fail closed).
- **Review IN-03:** `66-mutation.mjs compare` exempts by line text and drops multiplicity; this phase's result is unaffected.
- **Verifier info:** the `UntrustedDecoderOptions` doc says `_tag` selects the member without the more-than-one-member qualifier.
- **Plan verifies:** 66-04 (sort order) and 66-05 (diff-line regex) each shipped a verify that could not pass on the correct commit; each executor ran a corrected scratch copy.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-20 | 23 | 23 | 0 | orchestrator, L1 grep verification (ASVS 1, register authored at plan time, auditor skipped by rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-20
