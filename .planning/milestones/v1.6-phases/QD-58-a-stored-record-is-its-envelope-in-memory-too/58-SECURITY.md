---
phase: "58"
slug: "a-stored-record-is-its-envelope-in-memory-too"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-19"
---

# Phase 58 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Untrusted stored envelope → `SinkCodec` | `decodeStoredRecord*` reads `{ environment, record }` from a socket, a store or a devtools page through `untrustedDecoder` (`storedWire`), then `decodeSinkRecord` | Untrusted JSON (environment label, record) |
| Sink → decision log | `DecisionLog.record` retains a `SinkRecord` handed over by the sink emitter, now by reference inside `new StoredRecord(...)` | Records (possibly hostile getters or `NaN` times) |
| Log / stream backlog → devtools timeline | `mergeSources` and the timeline order merged backlogs by INV-QD-039 | Stored records |
| Package API | `StoredRecord` becomes a value class; `Stamped`, the flattened classes and `stampRecord` are removed (Breaking in core, http, devtools) | Public surface 936 → 933 exports |
| Phase evidence → gate | The D-16 comparer decides WX-05 from committed JSONs | Mutation scores |
| Repo → npm | Release pipeline | Package artifacts (nothing released this phase) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-58-01 | Tampering | mutation base or script re-recorded after the change | medium | mitigate | `58-mutation-base.json` has exactly one commit, `chore(58-01)` 3dc5af5f on `phase_base` b6326514; 0 Stryker config changes since `phase_base`; `compare` re-run by the orchestrator prints `WX-05 holds (D-16)` | CLOSED |
| T-58-02 | Repudiation | reserved numbers | low | mitigate | 58-01 recorded the ten ids free at `phase_base`; `next-id.mjs` not run; `58-scan.mjs` prints `phase scan clean` | CLOSED |
| T-58-03 | Tampering | stored byte goldens (D-05) | medium | mitigate | `StoredEnvelope.test.ts`'s only commits are ea1e7d98 and 2dac0e69 (`test(58-02)`); G1..G9 green after 58-04 (orchestrator re-run: 4 files, 236 tests) | CLOSED |
| T-58-04 | Repudiation | a RED row failing for the wrong reason | low | mitigate | 58-02-SUMMARY records N1..N4 failing by `AssertionError` only; they turned green unedited in 58-04 | CLOSED |
| T-58-05 | Tampering | http encoders' stored bytes | medium | mitigate | `StoredEnvelopeWire.test.ts`'s only commit is ac9fc05c (`test(58-03)`); W1, W2 green after (orchestrator re-run 2/2) | CLOSED |
| T-58-06 | Denial of service | `NaN` order across merge and timeline | low | mitigate | `StoredOrder.test.ts`'s only commit is 8ab597da; M1, M2, T1..T3 green after (orchestrator re-run 5/5); INV-QD-039 names both orders | CLOSED |
| T-58-07 | Spoofing | a reader's label replacing the producer's | medium | mitigate | `SinkCodec.ts:616` builds `new StoredRecord({ environment: read.success.environment, record })`; the producer-label row in `SinkCodec.test.ts` green | CLOSED |
| T-58-08 | Tampering | stored wire bytes and Phase 57 refusals | medium | mitigate | 0 commits to `UntrustedSeams.test.ts` since `phase_base`; G, W and UntrustedSeams rows pass unedited; `check:pr` exit 0 (58-09) | CLOSED |
| T-58-09 | Denial of service | hostile getter or `NaN` reaching the log after D-12 | low | mitigate | N4 pins that `append` reads no record field; `sinkRecordOrder` keeps the `NaN` rule; the emitter's `catchCause` (`SinkEmit.ts`) contains a real defect (ADR-QD-171) | CLOSED |
| T-58-10 | Tampering | log retains the sink's record by reference | low | accept | See Accepted Risks | CLOSED |
| T-58-11 | Elevation of privilege | an alias keeping the old shape alive | low | mitigate | 0 matches for the four deleted names under `packages/*/src`, `features`, `scripts`, `examples` | CLOSED |
| T-58-12 | Repudiation | static-ignored mutants claimed as covered | low | mitigate | `58-mutation-static.json` from an `ignoreStatic: false` run; all 7 new ignored mutants Killed there (58-05-SUMMARY); evidence config stayed in the scratchpad | CLOSED |
| T-58-13 | Tampering | base re-recorded or config edited to hide a fall | low | mitigate | as T-58-01; one `chore(58-01)` commit; 0 config changes | CLOSED |
| T-58-14 | Repudiation | ADR-QD-171's D-12 account | low | mitigate | ADR-QD-171 names `examples/nextjs-newsroom/src/server/api.ts` as the one `ingest` caller outside tests and states the emitter's containment | CLOSED |
| T-58-15 | Repudiation | a requirement changed with no record | low | mitigate | 3 `Amended in CCR-QD-449` notes in `24-decision-sink.md`, more in 26/27/33; strict traceability PASS 21 FAIL 0 (58-08) | CLOSED |
| T-58-16 | Tampering | a changeset bumping the wrong package or level | medium | mitigate | three changesets, each one package at `minor` (`@qadi/core`, `@qadi/http`, `@qadi/devtools`); 0 `package.json`/`CHANGELOG.md` changes since `phase_base` | CLOSED |
| T-58-17 | Repudiation | a break shipped without its record | low | mitigate | core changeset names the removed exports and warning; upgrade fence compiles (`spec:website-examples` 69 blocks); `spec:api` 933 | CLOSED |
| T-58-18 | Repudiation | a plan passing while the phase broke a rule | low | mitigate | `58-scan.mjs` prints `phase scan clean`. One orchestrator-authorised edit: its `has` check also compares layout-free (a wrapped `Order.mapInput(` call was a false positive); the `not` checks and every other section are the planned block | CLOSED |
| T-58-19 | Elevation of privilege | a release, tag, push or version during the close | medium | mitigate | 0 remote branches contain HEAD; 0 tags contain `phase_base`; 0 version or changelog changes; `pnpm changeset version` not run | CLOSED |
| T-58-SC | Tampering | npm/pip/cargo installs | high | mitigate | 0 changes to any `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` since `phase_base` | CLOSED |

---

## Accepted Risks Log

| Risk | Rationale | Owner / Review |
|------|-----------|----------------|
| T-58-10: the log retains the sink's record instance by reference, so a later top-level mutation would be visible | Records are typed `readonly`; nested fields were already shared by the old shallow copy; no src caller mutates a record after `record`; ADR-QD-171 records the aliasing. Severity low, below the `high` block threshold | Accepted at plan time (58-04 threat model); orchestrator-verified 2026-11-19 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-19 | 20 | 20 | 0 | orchestrator (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-19
