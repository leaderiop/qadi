---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
verified: 2026-11-19T04:10:00Z
status: passed
score: 4/4 must-haves verified
covered_files: [".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-01-PLAN.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-01-SUMMARY.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-02-PLAN.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-02-SUMMARY.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-03-PLAN.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-03-SUMMARY.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-04-PLAN.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-04-SUMMARY.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-05-PLAN.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-05-SUMMARY.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-06-PLAN.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-06-SUMMARY.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-07-PLAN.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-07-SUMMARY.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-08-PLAN.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-08-SUMMARY.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-09-PLAN.md",".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-09-SUMMARY.md","packages/core/src/DecisionLog.ts","packages/core/src/DecisionRecord.ts","packages/core/src/SinkCodec.ts","packages/devtools/src/model/Timeline.ts"]
covered_digest: "v4:sha256:b86cf4a7071773d8bb30cbc071b3919f15db3687e18c2dce6cb8e348d4edbb75"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 58: A stored record is its envelope in memory too Verification Report

**Phase Goal:** In memory a stored record is what it is on the wire, the producer's `environment` next to a `SinkRecord`, so the two flattened classes and the stamping that translates between the two shapes are gone and a new `SinkRecord` kind needs no stored class, stamp arm or decode re-stamp.
**Verified:** 2026-11-19
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | In memory the stored record is the envelope. `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord`, `stampRecordMatch`, `Stamped` and the prototype-loss doc are deleted; devtools' `X & { environment }` spellings are gone (STOR-01, D-01, D-02) | VERIFIED | `DecisionRecord.ts`: `class StoredRecord extends Data.Class<{ environment: string; record: SinkRecord }>`, `environment` doc moved onto the field. `git grep` for the deleted symbols over `packages` (src, test, non-`lib`), `features`, `examples`, `scripts`, `spec/overview.md`, `AGENTS.md` finds only CHANGELOG history, the changeset and the `upgrading.md` migration text. `Timeline.ts` `ingest(self, stored: StoredRecord)` narrows on `stored.record._tag`; no `& { environment: string }` remains. |
| 2 | The stored codec is the record codec plus one field; stored byte goldens unchanged (STOR-02, D-05) | VERIFIED | `SinkCodec.ts`: `encodeStoredRecord` is `Result.map(encodeSinkRecord(stored.record), record => ({ environment: stored.environment, record }))`; decode is `storedWire` (untrustedDecoder) then `decodeSinkRecord` then `new StoredRecord({...})`, no stamp. `StoredEnvelope.test.ts` goldens compose the hand-written `V2_*` fixtures into `{"environment":..,"record":..}` bytes; the file was last touched by `test(58-02)` commits, never by `feat(58-04)!`. All 265 core tests in the touched files pass on HEAD. |
| 3 | `DecisionLog` backlog stamping, `storedRecordOrder`, http encoders and devtools' timeline read the envelope, pinned by a round trip, a backlog-stamping test and an order test written on the base and green before and after (STOR-03, D-03, D-06, D-07) | VERIFIED | `DecisionLog.ts:220` builds `new StoredRecord({ environment, record })`, `byRecord` uses `storedRecordOrder`; `DecisionStream.ts:291` sorts by it; devtools `Source.ts:218` merges by it; `Timeline.ts:205` `isAfter = Order.isGreaterThan(Order.mapInput(sinkRecordOrder, recordOf))` (D-13); `DecisionLogHttp.ts` encodes the envelope directly. `sinkRecordOrder` reads `at` once, with the NaN-last rule. Characterisation files `StoredEnvelope.test.ts` (core), `StoredOrder.test.ts` (devtools), `StoredEnvelopeWire.test.ts` (http) were each committed in a `test(58-0N)` commit before `73232d6a` (the atomic Breaking commit) and not edited by it. Re-run on HEAD: core 265/265 in the six touched files, devtools model dir 41 files 1263/1263, http 15 files 306/306. |
| 4 | ADR-QD-171 makes ADR-QD-097 D-11-e true in memory; the break is **Breaking** in each package's changeset and in `upgrading.md` (STOR-04, D-10, D-11) | VERIFIED | `spec/decisions/171-a-stored-record-is-its-envelope-in-memory-too.md` exists; ADR-097, ADR-135 and ADR-159 carry the 2026-11-19 amendments. `.changeset/{core,http,devtools}-stored-record-is-its-envelope.md` are `minor` and start `**Breaking.**` (D-15's http basis stated). `upgrading.md` has the migration for `stampRecord`, `record.environment` and `_tag`. |

**Score:** 4/4 truths verified (0 behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/DecisionRecord.ts` | `StoredRecord` class, `sinkRecordOrder`, `storedRecordOrder = mapInput(sinkRecordOrder, s => s.record)` | VERIFIED | Read; both orders typed, INV-QD-039 rule in one place |
| `packages/core/src/DecisionLog.ts` | no `isolate`, envelope built at `append` | VERIFIED | `isolate` token absent from `packages`; the module doc states the log has no catch of its own (ADR-QD-171 D-12) |
| `packages/core/src/SinkCodec.ts` | no re-stamp on decode | VERIFIED | `fromEnvelope` builds `new StoredRecord` |
| `packages/devtools/src/model/Timeline.ts` | ingest over envelope | VERIFIED | `recordOf` picks `entry.decision`/`entry.obligations` |
| `spec/decisions/171-*.md`, `.changeset/*-stored-record-is-its-envelope.md` (3), `upgrading.md` 0.13 entry | records | VERIFIED | present |
| `58-mutation-base.json`, `58-mutation-after.json`, `58-mutation-static.json`, `58-mutation.mjs`, `58-scan.mjs` | D-16 evidence | VERIFIED | base committed first (`3dc5af5f`) |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `DecisionLog.append` | `StoredRecord` | `new StoredRecord({ environment, record })` | WIRED |
| `decodeStoredRecordString` | `StoredRecord` | `fromEnvelope` over `storedWire` + `decodeSinkRecord` | WIRED |
| `encodeStoredRecord` | wire `{environment, record}` | `Result.map(encodeSinkRecord(stored.record), ...)` | WIRED |
| http `DecisionLogHttp` encoders | core `encodeStoredRecord`/`String` | called on the envelope directly | WIRED |
| devtools `Source` merge | `storedRecordOrder` | `backlogs.flat().sort(storedRecordOrder)` | WIRED |
| devtools `Timeline.ingest` | `sinkRecordOrder` | `isAfter` over `recordOf` | WIRED |

### Data-Flow Trace (Level 4)

Not applicable beyond the wiring above: no rendered dynamic data was added; the devtools row keys and rendering are unchanged (D-04), covered by the passing devtools suite.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Core stored round trip, log stamping, order, byte goldens | `vitest --project core StoredEnvelope SinkCodec DecisionLog DecisionRecord ShippedSinkReports DecisionStream` | 6 files, 265 passed | PASS |
| Devtools merge and timeline order, Source | `vitest --project devtools packages/devtools/test/model` | 41 files, 1263 passed | PASS |
| Http encoders and routes | `vitest --project http` | 15 files, 306 passed | PASS |
| Typecheck (root graph) | `pnpm -s typecheck` | exit 0 | PASS |
| House style | `node scripts/check-house-style.mjs` | 559 files clean (3 declared switches) | PASS |
| Gate 13 | `pnpm -s spec:api` | 933 exports (936 base, D-16's expected 933) | PASS |
| Phase scan | `node 58-scan.mjs` | `phase scan clean` | PASS |
| WX-05 | `node 58-mutation.mjs compare 58-mutation-static.json` | `WX-05 holds (D-16)`; every touched file's score equal to base, TimelineStore and DecisionLogHttp lost 0, rewritten 0, deleted 0 | PASS |

### Probe Execution

No `probe-*.sh` declared by this phase. SKIPPED.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| STOR-01 | SATISFIED | Truth 1 |
| STOR-02 | SATISFIED | Truth 2 |
| STOR-03 | SATISFIED | Truth 3 |
| STOR-04 | SATISFIED | Truth 4 |
| WX-01 (share) | SATISFIED | `pnpm check:pr` exit 0 reported by the orchestrator; targeted vitest, typecheck, house-style and spec:api re-run green here. Full `check:pr` not re-run |
| WX-02 (share) | SATISFIED | ARCH-105, ADR-QD-171, CCR-QD-449, BEH-QD-626..630, INV-QD-361..362 each found in `spec/`; traceability change history 1.220 lists them. `scripts/next-id.mjs` not run (no evidence in the phase's commits) |
| WX-03 (share) | SATISFIED | `spec:api` 933 and passes; `overview.md` change history 1.126 names the removed and added exports |
| WX-04 (share) | SATISFIED | the `+` lines of the `packages/*/src` diff since `b6326514` contain no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, `console`, `process.env` or clock token; house-style gate clean with the same 3 declared switches |
| WX-05 (share) | SATISFIED | compare prints `WX-05 holds (D-16)` (static credit for the deleted mutants; no new survivor). The "no lost kill unless its line is gone" rule was applied by the script, not independently re-derived |
| WX-06 (share) | SATISFIED | `StoredEnvelope.test.ts`, `StoredOrder.test.ts`, `StoredEnvelopeWire.test.ts` committed (`ea1e7d98`, `2dac0e69`, `8ab597da`, `ac9fc05c`) before the source commit `73232d6a`, and never edited by it |
| WX-07 (share) | SATISFIED | three **Breaking** minor changesets plus the `upgrading.md` 0.13 entry; no release or version-packages artefact in the phase |

WX-01..WX-07 remain Pending in REQUIREMENTS.md by design. STOR-01..04 are [x] and Complete. No orphaned requirements for Phase 58.

### Owner decisions honoured

D-01 (one `Data.Class`), D-02 (name kept, `Stamped` gone, no aliases), D-03 (two typed orders), D-04, D-05, D-06, D-12 (`isolate` and C4 deleted; the C4 mention left in `ShippedSinkReports.test.ts` is a header comment), D-13, D-14 (one atomic `feat(58-04)!` commit), D-15 (http changeset, no http src change), D-16 all verified in code or records.

### Anti-Patterns Found

None blocking. No `TBD`/`FIXME`/`XXX` introduced in the phase's source files (`58-scan.mjs` is clean).

### Notes (not gaps)

- The review round (commits `22d6fcf7`, `84da6af1`, `9dbb9d02`) changed comments and docs only; the scan's comment-only rule was authorised by the orchestrator and is recorded beside it. `58-mutation-after.json` was reported byte-identical after the review round and `compare` still holds.
- Three over-width code lines (`DecisionLog.ts:220`, `SinkCodec.ts` `fromEnvelope`, the decision-log step) were left unwrapped deliberately so D-16 mutant ids keep matching. AGENTS.md section 17 makes oxfmt non-gating, so this is cosmetic.
- Not independently re-run here: full `pnpm check:pr`, BDD (`test:bdd`) and Stryker. Their results are taken from the orchestrator and the phase's own evidence files.

## Human Verification Required

None.

---

_Verified: 2026-11-19_
_Verifier: Claude (gsd-verifier)_
