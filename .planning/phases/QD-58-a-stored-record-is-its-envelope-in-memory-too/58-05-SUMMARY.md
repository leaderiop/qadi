---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
plan: 05
subsystem: devtools
tags: [docs, mutation, wx-05, d-16, stryker]
requires:
  - phase: QD-58
    provides: 58-01 mutation base and script; 58-04 the envelope change whose deletions this plan measures
provides:
  - Source.ts and AuditArchive.ts prose that no longer describes a stamp step
  - 58-mutation-after.json for the eight files and 58-mutation-static.json for the three files with new static-ignored mutants
  - WX-05 proven under D-16
affects: [58-06, 58-07, 58-08, 58-09]
actuals:
  tokens: 3000
  tasks: 3
  commits: 2
plan_head_before: 085bd6c7
plan_head_after: da9ed81402af3d074b0fa3b7bdcae3ee05d98a06
tech-stack:
  added: []
  patterns: ["an ignoreStatic:false evidence run lives in the scratchpad, never the repository"]
key-files:
  created:
    - .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-mutation-after.json
    - .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-mutation-static.json
  modified:
    - packages/devtools/src/model/Source.ts
    - packages/audit/src/AuditArchive.ts
key-decisions:
  - "No test was needed: compare held on the first run, so no test(58-05) commit exists"
requirements-completed: [STOR-02, WX-05]
duration: 8min
completed: 2026-11-19
status: complete
---

# Phase QD-58 Plan 05: docs and the WX-05 mutation proof

**Two doc-only src sentences stop describing a stamp the codec no longer has, and the eight touched files' mutation evidence is not lower than the base under D-16 (`WX-05 holds (D-16)`).**

## Accomplishments

- `Source.ts` says the producer's label is decoded from the envelope and sits beside the record; `AuditArchive.ts` names `sinkRecordOrder`.
- Three scoped gate runs and three evidence runs; `compare` passes with no new survivor and no surviving deleted statement.

## Docs

`docs(58-05)` commit `261aa1b8`: `Source.ts` (the `**The environment comes off the wire.**` paragraph and the `decodeStoredRecordString` doc now say the label is placed beside the record, and a bare record is a `Malformed` refusal given no label) and `AuditArchive.ts:102` (`storedRecordOrder` to `sinkRecordOrder`). Comment lines only; Task 1's check confirmed the code equals the feat commit's, and lint is green.

## After-runs

Each from the repository root, stdin closed, one at a time, exit 0, then `after <suite>`:

1. `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/DecisionLog.ts,packages/core/src/DecisionRecord.ts,packages/core/src/DecisionStream.ts,packages/core/src/SinkCodec.ts'` (34 s)
```
packages/core/src/DecisionLog.ts 1 (66/66) ignored 2
packages/core/src/DecisionRecord.ts 1 (17/17) ignored 3
packages/core/src/DecisionStream.ts 0.9722222222222222 (70/72) ignored 14
  survivor DecisionStream.ts:255:47 ObjectLiteral {} | { capacity: "unbounded" }
  survivor DecisionStream.ts:255:59 StringLiteral "" | "unbounded"
packages/core/src/SinkCodec.ts 0.968503937007874 (123/127) ignored 45
  survivor SinkCodec.ts:322:10, :324:9, :387:7, :391:7 (the four base survivors, unchanged)
```
2. `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/Source.ts,.../Timeline.ts,.../TimelineStore.ts'` (43 s)
```
Source.ts 1 (80/80) ignored 4
Timeline.ts 1 (107/107) ignored 10
TimelineStore.ts 0.9696969696969697 (32/33) ignored 1
  survivor TimelineStore.ts:58:11 ConditionalExpression false | next === timeline (the base survivor)
```
3. `pnpm exec stryker run stryker.http.mjs --mutate 'packages/http/src/DecisionLogHttp.ts'` (12 s)
```
packages/http/src/DecisionLogHttp.ts 1 (17/17) ignored 11
```

## Evidence

The first `compare` (no evidence) named new static-ignored mutants: `DecisionRecord.ts` 1, `SinkCodec.ts` 2, `Timeline.ts` 4. Two evidence runs in the scratchpad (`stryker58-core-static.config.mjs`, `stryker58-devtools-static.config.mjs`), each a first-line comment saying evidence only, a default export spreading the suite's gate config with `ignoreStatic: false`, `reporters: ["json", "clear-text"]` and a scratchpad `jsonReporter`:

- core, `--mutate 'packages/core/src/DecisionRecord.ts,packages/core/src/SinkCodec.ts'`: DecisionRecord `{"Killed":20}`; SinkCodec `{"Killed":156,"Timeout":1,"Survived":8,"RuntimeError":7}`.
- devtools, `--mutate 'packages/devtools/src/model/Timeline.ts'`: Timeline `{"Killed":117}`.

## Compare

`node 58-mutation.mjs compare 58-mutation-static.json`:

```
DecisionLog.ts 0.9857 -> 1 (lost 11, rewritten 5, deleted 6; survivors +0 -1)
DecisionRecord.ts 1 -> 1 (lost 5, deleted 5; static: all 1 new ignored Killed)
DecisionStream.ts 0.9722 -> 0.9722 (no change)
SinkCodec.ts 0.9683 -> 0.9685 (lost 3, deleted 3; static: all 2 new ignored Killed)
Source.ts 1 -> 1
Timeline.ts 1 -> 1 (lost 50, rewritten 4, deleted 46; static: all 4 new ignored Killed)
TimelineStore.ts 0.9697 -> 0.9697
DecisionLogHttp.ts 1 -> 1
WX-05 holds (D-16)
```

No file's score fell; the only survivor that left is the `isolate("publish")` string literal, on a deleted line.

## Commits

- `261aa1b8` docs(58-05): Source and AuditArchive describe the envelope, not a stamp
- `da9ed814` chore(58-05): mutation after-run and static evidence for D-16 (last commit to touch either evidence file)

## Deviations from Plan

None - plan executed exactly as written. (Task 1's second `<automated>` lint verify and Task 3's second verify ran green; the plan-level `git rev-list` ledger file was not written for this plan, so `plan_head_before` is the HEAD before the first commit, `085bd6c7`, and `commits: 2` was measured from it.)

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- Task 1 verify: `comment-only docs commit`; lint green.
- Task 2: after file holds exactly the eight files; base JSON and script byte-identical to `chore(58-01)`; no stryker config modified; no evidence file in the repository.
- Task 3: `compare` prints `WX-05 holds (D-16)`; `evidence committed last, after every code commit`.
