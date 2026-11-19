---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
plan: 01
subsystem: core
tags: [stryker, mutation-baseline, evidence, reserved-ids, api-surface]
phase_base: b6326514ae59c3ed335d940523d1e43639782be9
requires: []
provides:
  - phase_base and the re-verified base facts
  - ten reserved ids confirmed free at the base
  - the 936-export API surface baseline
  - 58-mutation.mjs and 58-mutation-base.json (D-16's rule and baseline, fixed before the change)
affects: [58-02, 58-03, 58-04, 58-05, 58-06, 58-07, 58-08, 58-09]
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
plan_head_before: b6326514ae59c3ed335d940523d1e43639782be9
plan_head_after: 3dc5af5f9d4f74fc8f6a511c7c185378a2640762
tech-stack:
  added: []
  patterns: ["mutation baseline over three Stryker suites committed alone as the phase's first commit, rule constants and declared deletions fixed before the change"]
key-files:
  created:
    - .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-mutation.mjs
    - .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-mutation-base.json
  modified: []
key-decisions:
  - "Four base files are below 1 (DecisionLog 69/70, DecisionStream 70/72, SinkCodec 122/126, TimelineStore 32/33); the close compares against those floors with no new survivor, not against 1"
requirements-completed: [WX-02, WX-03, WX-05, WX-06]
duration: 3min
completed: 2026-11-19
status: complete
---

# Phase QD-58 Plan 01: Evidence on the untouched base

## Base facts

Read at `phase_base` (`b6326514`). Every site matched.

`packages/core/src/DecisionRecord.ts`: `export interface Stamped` `:118`; `export class StoredDecisionRecord extends Data.TaggedClass("Decision")<` `:145`; `export class StoredObligationRecord` `:149`; `export type StoredRecord = StoredDecisionRecord | StoredObligationRecord;` `:153`; `const stampRecordMatch` `:177`; `export const stampRecord` `:186`; `export const storedRecordOrder: Order.Order<{ readonly at: number }>` `:205`.

`packages/core/src/DecisionLog.ts`: `import { stampRecord, storedRecordOrder }` `:38`; `const isolate = (half: "append" | "publish")` `:180`; `isolate("append")` call `:267` (doc `:169`); `isolate("publish")` call `:265` (doc `:168`); stamp at `append` `:237` `record: stampRecord(record, environment)`.

`packages/core/src/SinkCodec.ts`: `stampRecord` imported `:64`; `encodeSinkRecord(stored)` `:577`; decode re-stamp `stampRecord(record, read.success.environment)` `:616`.

`packages/devtools/src/model/Timeline.ts`: `ingest = (self, record: StoredRecord)` `:111`; `DecisionRecord & { environment: string }` `:114`; `ObligationRecord & { environment: string }` `:144`; `Order.isGreaterThan(storedRecordOrder)` `:201`.

`packages/core/test/ShippedSinkReports.test.ts` `:129` C4 ("an append that dies is reported once as the append half"). `scripts/check-package-install.mjs` `:487` `stampRecord(`. `spec/decisions/159-the-sink-emitter-reports-what-it-contains.md` `:178` "The decision log's append half is reachable through `ingest`". `packages/audit/src/AuditArchive.ts` `:102` names `storedRecordOrder`. `spec/overview.md` `:349` lists `stampRecord`.

None of `packages/core/test/StoredEnvelope.test.ts`, `packages/core/test/StoredEnvelope.tst.ts`, `packages/devtools/test/model/StoredOrder.test.ts`, `packages/http/test/StoredEnvelopeWire.test.ts` exists at `phase_base`.

`git grep -lw StoredRecord <phase_base> -- ':(glob)packages/*/src/**'` prints 9 files (the roadmap's "11" is not the base count):
`packages/core/src/AttributeResolver.ts`, `DecisionLog.ts`, `DecisionRecord.ts`, `DecisionStream.ts`, `SinkCodec.ts`; `packages/devtools/src/model/Source.ts`, `Timeline.ts`, `TimelineStore.ts`; `packages/http/src/DecisionLogHttp.ts`.

`pnpm -s typecheck < /dev/null` at `phase_base`: exit 0.

## Reserved numbers

`ARCH-105`, `ADR-QD-171`, `CCR-QD-449`, `BEH-QD-626`..`BEH-QD-630`, `INV-QD-361`, `INV-QD-362`: `git grep -lwF` at `phase_base` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts prints nothing for any of the ten. No `spec/decisions/171-*` exists at `phase_base`. The reservation file reads `{"CCR":452,"ADR":174,"BEH":645,"INV":368}`. `node scripts/next-id.mjs` was not run.

## API surface base

`pnpm -s spec:api` at `phase_base`:

```
api-surface: 936 export(s) documented across 9 package(s)
```

(58-04 and 58-09 compare against this line, adjusted only by the exports this phase documents.)

## Mutation base

Three scoped runs, one at a time on the untouched green tree (no test written yet, nothing else running), each exit 0. `node .../58-mutation.mjs base core|devtools|http` merged each report into `58-mutation-base.json`. `58-mutation.mjs` is the plan's verbatim block and passes `node --check`.

1. `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/DecisionLog.ts,packages/core/src/DecisionRecord.ts,packages/core/src/DecisionStream.ts,packages/core/src/SinkCodec.ts' < /dev/null`: Done in 32 seconds (34 s wall).

```
packages/core/src/DecisionLog.ts 0.9857142857142858 (69/70) ignored 3
  survivor packages/core/src/DecisionLog.ts:265:69 Survived | StringLiteral | "" | "publish" | PubSub.publish(pubsub, entry).pipe(Effect.asVoid, isolate("publish")),
packages/core/src/DecisionRecord.ts 1 (21/21) ignored 8
packages/core/src/DecisionStream.ts 0.9722222222222222 (70/72) ignored 14
  survivor packages/core/src/DecisionStream.ts:255:47 Survived | ObjectLiteral | {} | { capacity: "unbounded" } | const queue = yield* Stream.toQueue(frames, { capacity: "unbounded" });
  survivor packages/core/src/DecisionStream.ts:255:59 Survived | StringLiteral | "" | "unbounded" | const queue = yield* Stream.toQueue(frames, { capacity: "unbounded" });
packages/core/src/SinkCodec.ts 0.9682539682539683 (122/126) ignored 45
  survivor packages/core/src/SinkCodec.ts:322:10 Survived | EqualityOperator | stack.length >= 0 | stack.length > 0 | while (stack.length > 0) {
  survivor packages/core/src/SinkCodec.ts:324:9 Survived | ConditionalExpression | false | frame === undefined | if (frame === undefined) break;
  survivor packages/core/src/SinkCodec.ts:387:7 Survived | ConditionalExpression | false | Result.isFailure(before) | if (Result.isFailure(before)) return refuse(before.failure);
  survivor packages/core/src/SinkCodec.ts:391:7 Survived | ConditionalExpression | false | Result.isFailure(encoded) | if (Result.isFailure(encoded)) return refuse(encoded.failure);
wrote .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-mutation-base.json (core)
```

2. `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/Source.ts,packages/devtools/src/model/Timeline.ts,packages/devtools/src/model/TimelineStore.ts' < /dev/null`: Done in 1 minute 20 seconds (82 s wall).

```
packages/devtools/src/model/Source.ts 1 (80/80) ignored 4
packages/devtools/src/model/Timeline.ts 1 (103/103) ignored 9
packages/devtools/src/model/TimelineStore.ts 0.9696969696969697 (32/33) ignored 1
  survivor packages/devtools/src/model/TimelineStore.ts:58:11 Survived | ConditionalExpression | false | next === timeline | if (next === timeline) return;
wrote .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-mutation-base.json (devtools)
```

3. `pnpm exec stryker run stryker.http.mjs --mutate 'packages/http/src/DecisionLogHttp.ts' < /dev/null`: Done in 12 seconds (14 s wall).

```
packages/http/src/DecisionLogHttp.ts 1 (17/17) ignored 11
wrote .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-mutation-base.json (http)
```

Status counts in the JSON:

| File | Killed | Timeout | Survived | NoCoverage | Ignored | Score |
|---|---|---|---|---|---|---|
| `DecisionLog.ts` | 69 | 0 | 1 | 0 | 3 | 0.9857142857142858 |
| `DecisionRecord.ts` | 21 | 0 | 0 | 0 | 8 | 1 |
| `DecisionStream.ts` | 70 | 0 | 2 | 0 | 14 | 0.9722222222222222 |
| `SinkCodec.ts` | 121 | 1 | 4 | 0 | 45 | 0.9682539682539683 |
| `Source.ts` | 80 | 0 | 0 | 0 | 4 | 1 |
| `Timeline.ts` | 103 | 0 | 0 | 0 | 9 | 1 |
| `TimelineStore.ts` | 32 | 0 | 1 | 0 | 1 | 0.9696969696969697 |
| `DecisionLogHttp.ts` | 17 | 0 | 0 | 0 | 11 | 1 |

The base is below 1 for `DecisionLog.ts` (1 survivor), `DecisionStream.ts` (2), `SinkCodec.ts` (4) and `TimelineStore.ts` (1). These are pre-existing and recorded as the floor, not defects of this phase. `DecisionLog.ts:265` (`isolate("publish")`'s empty-string StringLiteral) sits on a line D-12 deletes, so it will show as `gone survivor`, an improvement, never a new one.

## Task Commits

1. Task 1 (evidence, no commit): base facts, reserved numbers, API surface base, typecheck exit 0; all three verifies exit 0.
2. Task 2: `3dc5af5f` `chore(58-01): mutation baseline of the eight stored-record files on the untouched base` (58-mutation.mjs, 58-mutation-base.json); parent is `phase_base`; the two files alone; Stryker configs unchanged.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `58-mutation.mjs` and `58-mutation-base.json` exist on disk; `3dc5af5f` is an ancestor of HEAD; its parent is `phase_base`.
- Task 1's three verifies and Task 2's two verifies exit 0.
- No change under packages, spec, scripts, .changeset, apps, examples, features or AGENTS.md; `node scripts/next-id.mjs` was not run; `.planning/config.json` not staged.
