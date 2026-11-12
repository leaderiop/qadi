---
phase: 23-sink-record-fields
plan: 02
subsystem: core
tags: [sink-record, schema, wire-v2, package-private-leaf, madge, bench]

# Dependency graph
requires:
  - phase: 23-sink-record-fields
    provides: "23-01's every-shape round trip, encoded-value key pins, record type pins, phase base and d01_outcome A / d02_keys absent"
provides:
  - "SinkRecordFields.ts: each record's envelope fields as one Schema.Struct, the two record tags, ObligationOutcomeSchema and CacheOutcomeSchema, package-private"
  - "DecisionRecord / ObligationRecord typed by that struct's Type (A: Data.TaggedClass)"
  - "SinkCodec's v2 structs spread the leaf; project and rebuild name no envelope field"
  - "SinkRecordTag derived from the record tags, pnpm circular green"
affects: [23-03, 23-04]

# Actuals (#2632): chars/4 over the diff of packages/ against plan_head_before
actuals:
  tokens: 7400
  tasks: 3
  commits: 4
plan_head_before: 3abdc4c8384a646c14efc171e07719a9fbd844cc
plan_head_after: 112b9a301907ccb9f903681a8338e2911b92c3f1

tech-stack:
  added: []
  patterns:
    - "one Schema.Struct in a package-private leaf is the only statement of a record's fields; the class type and the wire struct both derive from it"
    - "a projection that spreads the record whole and filters its own undefined keys generically, naming no field"

key-files:
  created:
    - packages/core/src/SinkRecordFields.ts
  modified:
    - packages/core/src/DecisionRecord.ts
    - packages/core/src/SinkCodec.ts
    - packages/core/src/SinkWire.ts
    - packages/core/src/EvaluationMetrics.ts
    - packages/core/test/SinkRecord.tst.ts
    - packages/core/test/Errors.tst.ts

key-decisions:
  - "The cache-outcome literals live in the leaf (option a): CacheOutcome stays exported from EvaluationMetrics.ts as typeof CacheOutcomeSchema.Type, with no import cycle"
  - "undefined-valued optional keys are dropped by one generic in-place filter in project (omitUndefined), not by a wire-side transformOptional: the per-field transformation cost 0.2 to 0.3 us per field on the outbound encode"
  - "SinkRecordTag is derived (typeof DECISION_RECORD_TAG | typeof OBLIGATION_RECORD_TAG, a type-only import from the leaf); madge reports no cycle"
  - "Under A, DecisionRecord's constructor is unchanged for callers; the bench-confirmed B (Schema.TaggedClass) was not built"

requirements-completed: [SREC-02, SREC-03, SREC-04, SREC-05, WX-03, WX-04, WX-05]

coverage:
  - id: D1
    description: "Each record's envelope fields are one Schema.Struct in a package-private leaf, in the wire's order; the record classes and the v2 wire structs derive from it"
    requirement: SREC-02
    verification:
      - kind: unit
        ref: "packages/core/test/SinkRecord.tst.ts (pnpm test:tstyche packages/core/test/SinkRecord.tst.ts)"
        status: pass
      - kind: unit
        ref: "packages/core/test/SinkCodec.test.ts (147 tests, goldens untouched)"
        status: pass
    human_judgment: false
  - id: D2
    description: "project and rebuild name no envelope field and SinkCodec.ts holds no conditional spread or brand re-application"
    requirement: SREC-03
    verification:
      - kind: other
        ref: "grep -cF '? {}' packages/core/src/SinkCodec.ts is 0 (12 at the base); grep makeSubjectId|makeResourceId is empty (4 lines at the base)"
        status: pass
      - kind: unit
        ref: "packages/core/test/SinkCodec.test.ts#every record shape round-trips (ARCH-71)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SinkRecordTag is derived from the record tags' one statement with pnpm circular green"
    requirement: SREC-04
    verification:
      - kind: other
        ref: "pnpm circular; pnpm test:tstyche packages/core/test/Errors.tst.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "The v2 wire is byte-identical: goldens and fixtures untouched since the base, every SinkCodec, audit, devtools and http test passes"
    requirement: SREC-05
    verification:
      - kind: unit
        ref: "pnpm vitest run --project core --project audit --project devtools --project http (3913 passed)"
        status: pass
      - kind: other
        ref: "git diff <base> -- packages/core/test/fixtures/sinkWireV2.ts is empty; no V2./golden line removed from SinkCodec.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "No export is added to @qadi/core's barrel; no forbidden construct is added; lint and typecheck are green"
    requirement: WX-03
    verification:
      - kind: other
        ref: "pnpm lint && pnpm typecheck; SinkRecordFields absent from packages/core/src/index.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "The outbound encode of a small record costs 5 to 10 percent more after the change (one spread of a class instance); evaluation and large policies do not move"
    requirement: SREC-05
    verification: []
    human_judgment: true
    rationale: "A measured cost accepted as inherent to D-04's spread-the-record projection; whether 0.2 to 0.4 us per small record is acceptable is the owner's call, recorded in Bench after"

# Metrics
duration: 31min
completed: 2026-11-11
status: complete
---

# Phase 23 Plan 02: Sink record fields stated once Summary

**Each sink record's fields are one package-private `Schema.Struct`; `DecisionRecord`, `ObligationRecord` and the version-2 wire structs derive from it, `project` and `rebuild` list no field, `SinkRecordTag` is derived, and the v2 bytes did not move.**

## Performance

- **Duration:** about 31 min
- **Started:** 2026-11-11T04:22:19Z
- **Completed:** 2026-11-11T04:53Z
- **Tasks:** 3
- **Files modified:** 7 under `packages/core` (one new)

## Accomplishments

- `packages/core/src/SinkRecordFields.ts` (not in the barrel) states `decisionRecordFields` and `obligationRecordFields` once, in the wire's key order, with each field's doc comment moved onto its entry word for word, plus the two record tags, `ObligationOutcomeSchema` and `CacheOutcomeSchema`.
- `DecisionRecord` is `Data.TaggedClass(DECISION_RECORD_TAG)<typeof decisionRecordFields.Type & { readonly outcome: DecisionOutcome }>` and `ObligationRecord` is `Data.TaggedClass(OBLIGATION_RECORD_TAG)<typeof obligationRecordFields.Type>`. Runtime is today's class, so construction cost is unchanged (23-01's bench row "A").
- `SinkCodec.ts`: `decisionV2Fields` / `obligationsV2Fields` are `{ _tag, version, ...leaf.fields }` (plus `OutcomeWire`); `project` is two one-line arms; `rebuild` strips `_tag`/`version` with `Struct.omit`, runs `rebuildOutcome` unchanged (ADR-QD-106) and constructs. No `? {}` spread (12 at the base), no `makeSubjectId` / `makeResourceId` (4 lines at the base).
- A field dropped from the leaf now removes it from the record type, so every caller that sets it fails to compile (the new tstyche row with `@ts-expect-error does not exist in type`); `project` and `rebuild` have no list to leave it out of.

## Choices the plan left open

- **Leaf name:** `SinkRecordFields.ts`, holding the record tags too (no second leaf).
- **Cache-literal choice:** option (a). The leaf owns `CacheOutcomeSchema = Schema.Literals(["hit", "coalesced", "miss"])`; `EvaluationMetrics.ts` keeps `export type CacheOutcome = typeof CacheOutcomeSchema.Type` (same public name, module and type; 23-01's pin holds unedited). `CACHE_OUTCOMES_BY_OUTCOME: Record<CacheOutcome, true>` stays there as the metric's exhaustiveness check. `ObligationOutcome` likewise is `typeof ObligationOutcomeSchema.Type` in `DecisionRecord.ts`.
- **How `undefined` is dropped on encode:** `project` spreads the record and passes the fresh object through `omitUndefined`, one generic `for…in` that deletes own keys whose value is `undefined` (in place, so no second copy). It names no field and adds no `as`; the encode of the typed spread needed no `encodeUnknownResult` fallback. A first attempt put a wire-side `SchemaTransformation.transformOptional` on each optional field in the leaf; it worked and passed every test, but cost about 0.2 to 0.3 us per optional field on the outbound encode (small-record encode 13 to 23 percent slower in a paired run), so it was replaced in `a8a2e4d3`. A `Reflect.ownKeys` version was then replaced by `for…in` and an in-place edit (`112b9a30`). In a microbench the filter itself costs about 0.01 us; the remainder is the spread (see Bench after).
- **B specifics:** not applicable; `d01_outcome` is A.
- **`SinkRecordTag`:** derived. `SinkWire.ts` has `export type SinkRecordTag = typeof DECISION_RECORD_TAG | typeof OBLIGATION_RECORD_TAG` from a type-only import of the leaf, whose closure is `effect`, `Policy.ts` and `Identity.ts` only. `pnpm circular` output: `✔ No circular dependency found!` (205 files processed). `Errors.tst.ts`'s pin is kept and retitled to say the tag is derived.
- **Hover:** field documentation survives. Checked with the TypeScript 5.9.3 API (`getDocumentationComment` on `DecisionRecord`'s `at`, `subjectId`, `resource`, `cache` and `action`): each returns the struct entry's comment. The emitted `lib/DecisionRecord.d.ts` compiles and names the leaf through an `import type`.

## Bench after

Paired A/B on one machine in one session, because the absolute hz drifts by 20 to 30 percent between sessions (the first of my three attempts started cold and was discarded; the table below is the final run): `git checkout <base> -- <the four changed src files>` and `git checkout HEAD -- …` alternate, three rounds each, `SinkCodec.bench.ts` then `Evaluate.bench.ts` per variant. "Base" here is the phase base's sources benched now, not 23-01's session-old medians (23-01's median for `encodeSinkRecord` (a) was 282,366 hz at 24.3 percent noise; it is quoted for context, not used for the verdict). hz per round, median, noise = (max - min) / median.

| Row | Base, three rounds | Base median | Base noise | After, three rounds | After median | After noise | Change |
| --- | ------------------ | ----------- | ---------- | ------------------- | ------------ | ----------- | ------ |
| Evaluate "one node" | 161,062 / 168,448 / 167,308 | 167,308 | 4.4% | 172,249 / 171,991 / 170,104 | 171,991 | 1.2% | +2.8% (noise) |
| Evaluate "wide — allOf of 8" | 124,030 / 131,667 / 127,673 | 127,673 | 6.0% | 133,903 / 132,761 / 131,185 | 132,761 | 2.0% | +4.0% (noise) |
| (a) one node, `encodeSinkRecord` | 300,238 / 306,380 / 314,164 | 306,380 | 4.5% | 275,691 / 282,509 / 275,100 | 275,691 | 2.7% | -10.0% |
| (a) one node, `encodeSinkRecordString` | 260,960 / 264,585 / 276,240 | 264,585 | 5.8% | 241,365 / 248,526 / 252,190 | 248,526 | 4.4% | -6.1% |
| (b) allOf×64, `encodeSinkRecord` | 14,590 / 14,809 / 14,959 | 14,809 | 2.5% | 14,581 / 14,530 / 14,619 | 14,581 | 0.6% | -1.5% |
| (b) allOf×64, `encodeSinkRecordString` | 13,239 / 13,195 / 13,351 | 13,239 | 1.2% | 13,231 / 13,029 / 12,751 | 13,029 | 3.7% | -1.6% |
| (c) Failed, 20-key resource, `encodeSinkRecord` | 279,752 / 286,075 / 290,292 | 286,075 | 3.7% | 256,173 / 271,803 / 271,624 | 271,624 | 5.8% | -5.1% |
| (c) Failed, 20-key resource, `encodeSinkRecordString` | 241,499 / 249,197 / 245,302 | 245,302 | 3.1% | 224,135 / 234,297 / 235,821 | 234,297 | 5.0% | -4.5% |

**Verdict.** Evaluation does not move (it constructs the same class). The wide-policy encode (b) moves 1.5 percent, inside noise. The small-record encodes (a) and (c) are outside the base's noise band: per `encodeSinkRecord`, (a) goes from 3.26 us to 3.63 us (+0.36 us) and (c) from 3.50 us to 3.68 us (+0.19 us). Cause, measured by microbench of the projection alone: the plan's D-04 projection `{ ...record, version: 2 }` spreads a `Data.TaggedClass` instance, which costs about 0.21 us more than building the same object from a literal with explicit keys (0.233 us against 0.021 us); the undefined filter adds about 0.01 us. The schema encode is not the cause (a branded `SubjectIdSchema` encodes at the same speed as `Schema.String`, 0.151 us against 0.151 us). It is inherent to a projection that names no field, so it is recorded rather than fixed; it is paid once per record per sink and is smaller than 0.4 us against a 6 us evaluation. The owner can still choose to keep a hand-written literal projection if it matters (that would reintroduce the field list).

## Task Commits

1. **Task 1: the leaf and the derived record classes** - `3fd471c7` (refactor)
2. **Task 2: the v2 structs spread the leaf; project and rebuild lose their field lists; SinkRecordTag** - `ec35e4cc` (refactor)
3. **Task 3: bench after, with two cost fixes found by it** - `a8a2e4d3` and `112b9a30` (perf), then this SUMMARY (docs)

**Plan metadata:** the `docs(23-02)` SUMMARY commit and the STATE/ROADMAP commit that follows it.

## Files Created/Modified

- `packages/core/src/SinkRecordFields.ts` - new; the one statement of each record's fields, the tags and the two literal schemas
- `packages/core/src/DecisionRecord.ts` - the two classes typed by the leaf; `ObligationOutcome` derived
- `packages/core/src/SinkCodec.ts` - v2 structs spread the leaf; `project` / `rebuild` shrink; `omitUndefined`
- `packages/core/src/SinkWire.ts` - `SinkRecordTag` derived
- `packages/core/src/EvaluationMetrics.ts` - `CacheOutcome` is the leaf schema's `Type`
- `packages/core/test/SinkRecord.tst.ts` - three new rows (decision and obligation input equal the leaf's `Type`; an undeclared field is refused)
- `packages/core/test/Errors.tst.ts` - the `SinkRecordTag` pin retitled

## Decisions Made

- Option (a) for the cache literals, and a derived `SinkRecordTag`, both because the leaf's import closure stays inside `effect`, `Policy.ts` and `Identity.ts`.
- A generic `omitUndefined` in `project` rather than a per-field encode transformation, on the measured cost above.
- The 8 to 10 percent small-record encode cost is accepted as inherent to the D-04 spread and recorded (D6 in `coverage`, `human_judgment: true`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The first undefined-dropping mechanism slowed the outbound encode**
- **Found during:** Task 3 (bench after)
- **Issue:** `SchemaTransformation.transformOptional` on each optional leaf field cost 0.2 to 0.3 us per field, small-record encode 13 to 23 percent slower.
- **Fix:** replaced by one generic `omitUndefined` in `project` (commits `a8a2e4d3`, `112b9a30`); `SinkRecordFields.ts` is back to plain `Schema.optional`.
- **Files modified:** `packages/core/src/SinkCodec.ts`, `packages/core/src/SinkRecordFields.ts`
- **Verification:** `SinkCodec.test.ts` 147 passed with the key pins unedited; paired bench above.
- **Committed in:** `a8a2e4d3`, `112b9a30`

### Plan expectations not met as written

- The plan's WX-04 grep (`" as (any|unknown|[A-Z])"` over added lines) matches `import * as Struct from "effect/Struct"` and `import * as Schema …`, which are namespace imports, not casts: it prints two lines. Neither is a type assertion; `pnpm lint` (oxlint plus `check-house-style.mjs`, 448 files clean, 3 declared switches) is green and the added code lines hold no `as`, `switch`, `fnUntraced` or `Schema.TaggedError`. The grep is imprecise, not violated.
- The mutation base (23-01) is not re-run here; this plan did not ask for Stryker.

**Total deviations:** 1 auto-fixed (1 performance regression found by the bench). **Impact on plan:** none on scope; the wire and public types are as planned.

## TDD Gate Compliance

The plan is `type: tdd` over a refactor whose behaviour is pinned by 23-01 (green on the base by design). The tstyche rows that tie the record input to the leaf's `Type` were written after the leaf exists, as the plan specifies, and so have no RED commit; the RED evidence is 23-01's scratch-mutation table (the round trip fails when a field is dropped from `project`/`rebuild`), and after this plan the same mutation is a type error or impossible because those functions list no field. Commits are `refactor`/`perf`, not `test`/`feat`.

## Issues Encountered

- Two background notifications fired for launcher shells that returned immediately; the bench runs themselves were awaited on their done files.
- `git checkout <base> -- <files>` was used for the paired bench (a sanctioned per-file checkout); `git status` is clean for `packages/` afterwards.

## Known Stubs

None.

## Threat Flags

None. The leaf adds no network, auth or file-access surface; decode strictness is unchanged (`UNTRUSTED_DECODE_OPTIONS`, `envelopeOf` and the `Inconsistent` tests pass unedited).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 23-03 can replace `failedRecord` / `decidedRecord` with one projection (absent convention) against a record type that is now the leaf's `Type`.
- 23-04 records ADR-QD-135 with these numbers, including the 5 to 10 percent small-record encode cost and the derived `SinkRecordTag`.

## Self-Check: PASSED

Checked: `packages/core/src/SinkRecordFields.ts` exists and is absent from `index.ts`; commits `3fd471c7`, `ec35e4cc`, `a8a2e4d3`, `112b9a30` are ancestors of HEAD; `grep -cF '? {}' SinkCodec.ts` is 0; no `makeSubjectId` / `makeResourceId` in `SinkCodec.ts`; `sinkWireV2.ts` and the golden lines unchanged since the base; `pnpm vitest run --project core --project audit --project devtools --project http` (3913 passed), `pnpm test:tstyche` (229 passed), `pnpm circular`, `pnpm lint`, `pnpm typecheck` green; the SUMMARY greps for "Bench after" and "SinkRecordTag" hold.

---
*Phase: 23-sink-record-fields*
*Completed: 2026-11-11*
