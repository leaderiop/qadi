---
phase: 23-sink-record-fields
plan: 01
subsystem: core
tags: [sink-record, schema, fast-check, tstyche, bench, mutation-base, decision-checkpoint]

# Dependency graph
requires:
  - phase: 22-one-resource-scoped-port-read
    provides: "a closed Phase 22 (every plan summarised) and a clean packages/ tree to take the phase base from"
provides:
  - "the phase base sha and the per-file Stryker scores before any src change"
  - "a generated round trip over both record tags and every optional key, seen failing under three scratch mutations"
  - "key pins for the encoded value and type pins for the public record types, green on the base"
  - "SinkRecord.bench.ts and the five-round Bench before table"
  - "the recorded D-02/D-05 decision (A, keys absent) that plans 23-02..23-04 branch on"
affects: [23-02, 23-03, 23-04]

phase_base: f40bbfb258ff3dd5ebfc2ad95d6339936c4be4fb
d01_outcome: A
d01_date: 2026-11-11
d01_reason: "the recommendation should be the cleanest solution, not the simplest one; we can override any ADR if it causes us problems. (_DECISIONS-v1.2.md, 23-01 T3: A, keys: absent; the bench confirms A stands, B is not within noise and adds a throw on the evaluation path)"
d02_keys: absent
reserved_numbers_free: true
bench_verdict:
  - "one node: today 0.097 us, A 0.098 us (within noise), B 0.912 us (+0.815 us, 9.4x; 12.9% of Evaluate one node, whose noise is 7.6%): B not within noise"
  - "allOf x8: today 0.097 us, A 0.094 us (within noise), B 3.060 us (+2.963 us, 31.5x; 35.7% of Evaluate wide, whose noise is 6.0%): B not within noise"
  - "allOf x64: today 0.096 us, A 0.097 us (within noise), B 13.496 us (+13.400 us, 140x; no Evaluate workload this wide): B not within noise"
  - "obligation record: today 0.097 us, A 0.093 us (within noise), B 0.518 us (+0.420 us, 5.3x): B not within noise"

# Actuals (#2632): chars/4 over the diff of packages/ against the phase base
actuals:
  tokens: 6100
  tasks: 4
  commits: 2
plan_head_before: f40bbfb258ff3dd5ebfc2ad95d6339936c4be4fb
plan_head_after: 09ea74fba68455d42f529d6d919a868c89e0746b

tech-stack:
  added: []
  patterns:
    - "a three-state optional key (absent, present, present-undefined) as a FastCheck slot, built without a cast"
    - "bench rows bind module exports once so vitest's module-runner getter overhead lands on no single row"

key-files:
  created:
    - packages/core/test/SinkRecord.tst.ts
    - packages/core/bench/SinkRecord.bench.ts
    - .planning/phases/23-sink-record-fields/23-base.txt
    - .planning/phases/23-sink-record-fields/23-mutation-base.json
  modified:
    - packages/core/test/SinkCodec.test.ts

key-decisions:
  - "A (one Schema.Struct per record, the Data.TaggedClass typed by it) with keys: absent, taken from _DECISIONS-v1.2.md; the bench agrees"
  - "The decision-record key convention is absent: every projection leaves absent resource/action/cache absent, so a record is Equal to its own round trip"

requirements-completed: [SREC-01, SREC-03, SREC-05, WX-02, WX-05, WX-06]

coverage:
  - id: D1
    description: "A generated round trip over both record tags and every optional key (absent, present, present-undefined) is green on the base and fails under each of three scratch mutations"
    requirement: WX-06
    verification:
      - kind: unit
        ref: "packages/core/test/SinkCodec.test.ts#every record shape round-trips (ARCH-71)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The encoded value of every golden record and of evaluate-shaped records keeps today's ordered keys with no undefined-valued own key"
    requirement: SREC-05
    verification:
      - kind: unit
        ref: "packages/core/test/SinkCodec.test.ts#ARCH-71: the encoded value keeps today's keys"
        status: pass
    human_judgment: false
  - id: D3
    description: "DecisionRecord's and ObligationRecord's constructor types, ObligationOutcome, CacheOutcome and SinkRecordJson's per-tag keys are pinned"
    requirement: SREC-05
    verification:
      - kind: unit
        ref: "packages/core/test/SinkRecord.tst.ts (pnpm test:tstyche packages/core/test/SinkRecord.tst.ts)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Record construction is benched for today, A and B on one-node, allOf x8 and allOf x64 policies, five interleaved rounds with Evaluate and SinkCodec benches"
    requirement: SREC-01
    verification:
      - kind: other
        ref: "pnpm bench packages/core/bench/SinkRecord.bench.ts --reporter=default"
        status: pass
    human_judgment: false
  - id: D5
    description: "The record shape (A, B or C) and the key convention are decided with the bench numbers in front of the decider"
    requirement: SREC-01
    verification: []
    human_judgment: true
    rationale: "A one-way design choice by the project owner, pre-recorded in _DECISIONS-v1.2.md; no test can assert that it is the right one"
  - id: D6
    description: "Per-file Stryker scores for every src file the phase may touch are recorded before any src change"
    requirement: WX-05
    verification:
      - kind: other
        ref: ".planning/phases/23-sink-record-fields/23-mutation-base.json"
        status: pass
    human_judgment: false

# Metrics
duration: 26min
completed: 2026-11-11
status: complete
---

# Phase 23 Plan 01: Sink record fields measured and pinned, decision recorded Summary

**A generated every-shape round trip, encoded-value and type pins, a Data.TaggedClass-versus-Schema.TaggedClass construction bench (B costs 5.3x to 140x per record), the per-file mutation base, and the recorded decision: A with absent keys.**

## Performance

- **Duration:** about 26 min
- **Started:** 2026-11-11T03:52Z (about; the start time was not captured at the first command, so this is taken from the first Stryker log)
- **Completed:** 2026-11-11T04:18Z
- **Tasks:** 4 (Task 3 answered from the pre-recorded decisions file, not asked)
- **Files modified:** 5 under `packages/` and `.planning/phases/23-sink-record-fields/` (no src file)

## Accomplishments

- Phase base `f40bbfb2` and per-file Stryker scores recorded before any src change. SinkCodec.ts scores 0.913; DecisionRecord.ts, EvaluationMetrics.ts, Lifecycle.ts, SinkEmit.ts and SinkWire.ts score 1.0.
- A field dropped from `project` or `rebuild` compiles (shown by three scratch mutations, none committed), and the new generated round trip over both tags and every optional key is seen failing under each.
- Today's encoded values and public record types are pinned, so plans 23-02 and 23-03 can prove the derived types and the new projection equal them.
- The bench shows A costs what today's class costs and B costs 5.3x to 140x per record, on the evaluation path.

## Scratch mutations on the base

Each mutation was applied alone to `packages/core/src/SinkCodec.ts` at the phase base, measured, then restored with `git checkout -- packages/core/src/SinkCodec.ts`. `git diff` of `packages/core/src` against HEAD and against the base is empty.

- m1: `action` out of `project`'s `Decision` arm
- m2: `cache` out of `rebuild`'s `Decision` arm
- m3: `resourceId` out of `rebuild`'s `Obligations` arm

| Mutation | `tsc -b packages/core` | `--project core` failing tests (existing suite) | `--project audit`, `--project devtools` | New round trip (`ARCH-71`) |
| -------- | ---------------------- | ----------------------------------------------- | --------------------------------------- | -------------------------- |
| m1 | compiles | 4: "v2 bytes: the writer writes the version-2 goldens > a decision carrying resource, action and cache"; "decodeSinkRecord reads wire version 2, and only it > a full envelope: the v2 bytes decode to the record that was encoded"; "a record survives the wire > an allow round-trips through validation"; DecisionSinkForwarding "a record made in one process arrives in another's log and its live readers" | 372 and 1160 pass | fails: "Property failed after 1 tests", counterexample a decision with `action: ""` (also the new key pin "a decision with resource, action and cache") |
| m2 | compiles | 2: "a record survives the wire > an allow round-trips through validation"; "every literal the wire admits is exercised > each cache outcome round-trips" | 372 and 1160 pass | fails: "Property failed after 2 tests", counterexample a decision with `cache: "hit"` |
| m3 | TS6133 on the then-unused `makeResourceId` import (incidental: with the import kept in use, `tsc -b` exits 0, checked) | 1: "decodeSinkRecord reads wire version 2, and only it > an obligation row's identity keys survive a round trip as typed values" | 372 and 1160 pass | fails: "Property failed after 6 tests", counterexample an obligation record with `resourceId: "doc-1"` |

**Finding that differs from the planning evidence.** 23-CONTEXT.md expected the old suite to miss at least one of m1 to m3 (m2 "possibly nothing"). On this base it catches all three: m1 by the writer golden and three more tests, m2 by an `allow` round trip that carries `cache: "miss"` and by the cache-literal test, m3 by the identity-key test. So the "old suite misses at least one" half of the plan's SREC-03 success criterion is not met, and the record says so rather than overstating the gap. What the new property adds is coverage by construction: every optional key of both tags in all three states, instead of whichever keys happen to appear in a hand-written fixture. A sixth field added later is caught only if a fixture carries it; the property's slots are the place to list it, and plan 23-02's shared struct is what makes forgetting it a type error.

No audit or devtools test fails under any mutation: their suites do not assert a record's optional keys through the codec.

## Bench before

`pnpm bench <file> --reporter=default`, five interleaved rounds (SinkRecord, then Evaluate, then SinkCodec, five times), hz per round and the median. The first full set of rounds was discarded and re-run, see Deviations.

Noise is (max - min) / median of the five rounds. Per-record cost is 1 / median hz in microseconds.

### SinkRecord.bench.ts (construction)

| Shape | Row | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 | Median hz | Noise | Per record |
| ----- | --- | ------- | ------- | ------- | ------- | ------- | --------- | ----- | ---------- |
| one node | today: DecisionRecord | 8,799,128 | 9,962,017 | 10,522,853 | 10,275,389 | 10,510,038 | 10,275,389 | 16.8% | 0.0973 us |
| one node | A: Data.TaggedClass over a shared struct | 8,496,660 | 10,417,111 | 10,765,143 | 10,209,079 | 9,877,092 | 10,209,079 | 22.2% | 0.0980 us |
| one node | B: Schema.TaggedClass | 1,043,683 | 1,104,221 | 1,160,453 | 1,096,730 | 1,023,290 | 1,096,730 | 12.5% | 0.9118 us |
| allOf x8 | today: DecisionRecord | 10,314,359 | 10,583,055 | 10,287,653 | 10,550,032 | 9,848,887 | 10,314,359 | 7.1% | 0.0970 us |
| allOf x8 | A | 10,628,331 | 10,710,551 | 9,630,512 | 10,740,805 | 9,469,337 | 10,628,331 | 12.0% | 0.0941 us |
| allOf x8 | B | 326,840 | 336,603 | 276,788 | 332,255 | 301,392 | 326,840 | 18.3% | 3.0596 us |
| allOf x64 | today: DecisionRecord | 10,591,246 | 10,392,525 | 8,763,504 | 10,736,200 | 8,570,145 | 10,392,525 | 20.8% | 0.0962 us |
| allOf x64 | A | 10,289,190 | 10,325,707 | 9,455,487 | 10,272,602 | 9,791,570 | 10,272,602 | 8.5% | 0.0973 us |
| allOf x64 | B | 79,112 | 78,598 | 74,095 | 73,732 | 67,359 | 74,095 | 15.9% | 13.4962 us |
| obligation, all identity keys | today: ObligationRecord | 10,963,435 | 10,163,748 | 10,719,256 | 10,268,936 | 9,717,889 | 10,268,936 | 12.1% | 0.0974 us |
| obligation, all identity keys | A | 10,309,809 | 10,932,487 | 10,835,704 | 10,743,050 | 9,995,067 | 10,743,050 | 8.7% | 0.0931 us |
| obligation, all identity keys | B | 1,946,396 | 1,901,250 | 1,931,259 | 1,945,188 | 1,728,237 | 1,931,259 | 11.3% | 0.5178 us |

### Evaluate.bench.ts, test "evaluate"

| Row | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 | Median hz | Noise | Per evaluation |
| --- | ------- | ------- | ------- | ------- | ------- | --------- | ----- | -------------- |
| one node | 164,837 | 158,891 | 165,806 | 153,765 | 154,540 | 158,891 | 7.6% | 6.294 us |
| wide — allOf of 8 | 125,773 | 126,632 | 120,522 | 119,411 | 119,521 | 120,522 | 6.0% | 8.297 us |

### SinkCodec.bench.ts (outbound encode)

| Row | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 | Median hz | Noise |
| --- | ------- | ------- | ------- | ------- | ------- | --------- | ----- |
| (a) one node, encodeSinkRecordString | 242,404 | 266,834 | 246,696 | 255,328 | 199,242 | 246,696 | 27.4% |
| (a) one node, encodeSinkRecord | 276,806 | 287,596 | 282,366 | 294,733 | 226,104 | 282,366 | 24.3% |
| (b) allOf x64, encodeSinkRecordString | 12,697 | 12,474 | 12,579 | 11,981 | 9,835 | 12,474 | 22.9% |
| (b) allOf x64, encodeSinkRecord | 14,249 | 13,272 | 14,474 | 13,591 | 10,013 | 13,591 | 32.8% |
| (c) Failed, Error cause, 20-key resource, encodeSinkRecordString | 242,277 | 235,728 | 242,818 | 242,752 | 181,113 | 242,277 | 25.5% |
| (c) Failed, Error cause, 20-key resource, encodeSinkRecord | 282,808 | 278,661 | 278,773 | 284,752 | 178,526 | 278,773 | 38.1% |

The encode rows are quoted for the same machine and rounds; the checkpoint compares construction with evaluation, not with encoding.

### Derived

| Shape | Delta A (A - today) | Delta B (B - today) | B / today | Today's spread | Delta B as a share of one evaluation | Evaluate row's noise |
| ----- | ------------------- | ------------------- | --------- | -------------- | ------------------------------------ | -------------------- |
| one node | +0.0006 us | +0.8145 us | 9.4x | 0.0186 us | 12.9% of 6.294 us | 7.6% |
| allOf x8 | -0.0029 us | +2.9626 us | 31.5x | 0.0070 us | 35.7% of 8.297 us | 6.0% |
| allOf x64 | +0.0011 us | +13.4000 us | 140x | 0.0235 us | no Evaluate workload this wide | n/a |
| obligation record | -0.0043 us | +0.4204 us | 5.3x | 0.0117 us | not on the per-evaluation path (emitted when an allow carried obligations) | n/a |

**Within noise verdict.** B is within noise only if its delta is inside today's spread for that shape and the one-node end-to-end share is below Evaluate one node's noise. It is on neither count, on any shape:

- **one node:** B is not within noise. The delta (0.8145 us) is 44 times today's spread (0.0186 us), and 12.9% of a one-node evaluation is above that row's 7.6% noise.
- **allOf x8:** B is not within noise. 2.9626 us against a 0.0070 us spread, and 35.7% of a wide evaluation against 6.0% noise.
- **allOf x64:** B is not within noise. 13.4000 us against a 0.0235 us spread; there is no Evaluate workload this wide to take a share of.
- **obligation record:** B is not within noise. 0.4204 us against a 0.0117 us spread.

A is within noise on every shape: its delta (-0.0043 to +0.0011 us) sits inside today's spread (0.0070 to 0.0235 us), as expected from a class whose runtime is today's.

Why B costs this: `Schema.TaggedClass`'s constructor parses its whole input on every `new`. From `node_modules/effect/src/Schema.ts` (`makeClass`, lines 17364-17386):

```ts
const payload = internalOptions?.["~payload"]
const value = payload?.token === payloadToken
  ? payload.value
  : struct.make(input ?? {}, options)
super(value, { ...options, disableChecks: true, "~payload": { token: payloadToken, value } })
```

Only an internal trusted payload skips `struct.make`; a caller's `new` never has one. For a `DecisionRecord` that parse walks the whole `Policy` (a recursive `Schema.suspend`), which is why B scales with policy size (0.91, 3.06, 13.50 us) while today's class stays flat (0.097 us). `evaluate` constructs a record on every evaluation, with or without a sink (`Lifecycle.ts:142,188`), so B is paid per evaluation; and a `struct.make` that throws on an invalid input would be a defect on the evaluation path, which AGENTS.md §4 forbids.

## Decision

Task 3 (`checkpoint:decision`, `gate="blocking-human"`) was not stopped on: `.planning/phases/_DECISIONS-v1.2.md` holds the project owner's answer, given 2026-11-11 before execution, and the plan's own resume-signal says to take it, quote it and continue. It reads: **`A`, `keys: absent`**, with the standing instruction **"the recommendation should be the cleanest solution, not the simplest one; we can override any ADR if it causes us problems."** The file adds that A holds unless the bench shows B within noise and B adds no throw on the evaluation path; the bench shows neither, so A stands.

- **What 23-02 does for A:** one `Schema.Struct` per record in a package-private leaf (not in the barrel), in today's wire order; `DecisionRecord` and `ObligationRecord` stay `Data.TaggedClass`, typed by that struct's `Type` (the decision's `outcome` stays out of the struct and is added to the class type); the v2 wire structs spread the same fields; `CacheOutcome` and `ObligationOutcome` keep their public names with their literal lists stated once. `SinkRecord.tst.ts` proves the derived types equal today's.
- **What 23-03 does for `absent`:** `project` encodes `{ ...record, version: 2 }` (plus the encoded outcome) and names no envelope field; `rebuild` strips `version`, runs `rebuildOutcome` unchanged and constructs; `failedRecord` and `decidedRecord` become one projection that leaves an absent `resource`, `action` and `cache` absent, as `obligationRecordFor` already does, so a record `evaluate` emits is `Equal` to its own round trip. 23-03 commits a RED test for that convention first; the encoded value keeps today's keys and no `undefined`-valued own key (the pins in `SinkCodec.test.ts`).
- **What 23-04 records:** ADR-QD-135 with these numbers and the owner's words.

## Task Commits

Each task was committed atomically:

1. **Task 1: Phase base, mutation base, the gap shown by scratch mutation, and the every-shape round trip** - `9480a6bb` (test)
2. **Task 2: Bench record construction (today, A, B) interleaved with Evaluate and the encode** - `09ea74fb` (bench)
3. **Task 3: D-02/D-05 checkpoint** - no commit: answered by `_DECISIONS-v1.2.md`
4. **Task 4: Record the outcome where plans 23-02..23-04 read it** - this SUMMARY (docs)

**Plan metadata:** the `docs(23-01)` SUMMARY commit and the STATE/ROADMAP commit that follows it.

## Files Created/Modified

- `packages/core/test/SinkCodec.test.ts` - the every-shape round trip (`ARCH-71`, seed 7101, 600 runs, at least 300 encoded) inside "properties", and the encoded-value key pins (eight cases) in a new top-level describe
- `packages/core/test/SinkRecord.tst.ts` - the record constructor types, `ObligationOutcome`, `CacheOutcome` and `SinkRecordJson`'s per-tag keys, pinned by mutual assignability, `keyof` and per-key reads
- `packages/core/bench/SinkRecord.bench.ts` - today, A and B on one-node, allOf x8, allOf x64 and an obligation record (bench-local classes, none exported)
- `.planning/phases/23-sink-record-fields/23-base.txt` - the phase base sha
- `.planning/phases/23-sink-record-fields/23-mutation-base.json` - per-file Stryker scores before any src change

## Decisions Made

- A and `keys: absent`, taken from `_DECISIONS-v1.2.md` and confirmed by the bench (above).
- The every-shape property compares the decoded record key by key rather than with whole-record `Equal.equals` for the obligation arm: a record built with `subjectId: undefined` is not `Equal` to its decode, which is the asymmetry 23-03 removes. The property pins `Object.hasOwn(back, key)` against the original holding a defined value, which holds on the base and is what the absent convention requires.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Bench module-export getter overhead skewed the first set of rounds**
- **Found during:** Task 2
- **Issue:** vitest's module runner reads `DecisionRecord`, `ObligationRecord`, `Decided` and `Failed` through export getters, and warned "accessed module export getters too many times". On the first run that landed on today's row (and, through `Decided`/`Failed` in B's `Schema.declare` predicate, on B's), so today's row measured slower than A.
- **Fix:** bound the four classes to module-scope constants (`TodayDecision`, `TodayObligation`, `IsDecided`, `IsFailed`); the warning no longer appears. The first five rounds were discarded and the full set re-run; only the re-run is tabulated.
- **Files modified:** `packages/core/bench/SinkRecord.bench.ts`
- **Verification:** `Benchmark Warning` count is 0 in all five SinkRecord logs; today and A agree within noise.
- **Committed in:** `09ea74fb`

### Plan expectations the base did not bear out (recorded, not fixed)

- The old suite catches all three scratch mutations (the plan expected it to miss at least one), see "Scratch mutations on the base".
- m3 does not compile cleanly under `tsc -b` only because its removal leaves the `makeResourceId` import unused (TS6133); with the import kept in use it compiles. The plan's "each compile" holds for the field, not for the leftover import.

**Total deviations:** 1 auto-fixed (1 measurement bug). **Impact on plan:** none on scope; the bench numbers quoted are the corrected ones.

## TDD Gate Compliance

The plan is `type: execute`; its `tdd="true"` task characterises today's behaviour, so its tests are green on the base by design and there is no RED commit. The RED evidence is the scratch-mutation run: the new round trip and key pin fail under each of m1 to m3 (table above) and pass on the clean tree. No `feat` commit exists because 23-01 changes no src.

## Issues Encountered

- The start time was not captured at the first command, so the duration is an estimate from the first Stryker log.
- The precondition for Task 1 held (four Phase 22 plans, four summaries, `git diff --quiet HEAD -- packages`).

## Known Stubs

None.

## Threat Flags

None. No file added to `packages/*/src`; the bench and tests introduce no network, auth or file-access surface.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 23-02, 23-03 and 23-04 read `d01_outcome: A` and `d02_keys: absent` from this frontmatter.
- The pins in `SinkCodec.test.ts` and `SinkRecord.tst.ts` are green on the base, so any change that moves an encoded key or a public type fails them.
- Numbers reserved for Phase 23 are free by use (ARCH-71, ADR-QD-135, CCR-QD-413, BEH-QD-450..454, INV-QD-290 outside CCR-QD-409's "Unused" row, INV-QD-291; no `spec/decisions/135-*`).

## Self-Check: PASSED

Checked: the four Task 4 frontmatter greps, the Task 2 SUMMARY greps, `phase_base` equal to `23-base.txt`, all five created or modified files present, commits `9480a6bb` and `09ea74fb` ancestors of HEAD, 23-01's commits touch only `.planning/`, `packages/core/test/` and `packages/core/bench/`, `SinkCodec.test.ts` 147 passed, `SinkRecord.tst.ts` 9 passed, and `packages/core/src` unchanged against HEAD and the base.

---
*Phase: 23-sink-record-fields*
*Completed: 2026-11-11*
