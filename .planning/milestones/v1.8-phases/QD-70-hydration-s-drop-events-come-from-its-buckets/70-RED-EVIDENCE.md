# Phase 70 RED evidence

phase_base: 3630e29865bbaed49126b214f0f6cc7006b6f4bc

Every experiment edit below was made in the working tree only and removed again with `git checkout --` (and the probe
test deleted) before anything was committed; after each, `git status --porcelain -- packages` printed nothing and
`pnpm exec tsc -b tsconfig.json` exited 0 on the restored tree. Logs and exit statuses are kept in the scratch
directory `qd70` beside the system temp directory.

The throwaway rows, each appended as the last row of `HYDRATION_DROP_TABLE` in `packages/core/src/HydrationMetrics.ts`:

```
EntryProbe: { kind: "entry", summary: "a throwaway entry reason", remedy: "remove it" },
PayloadProbe: { kind: "payload", summary: "a throwaway payload reason", remedy: "remove it" },
DehydrationProbe: { kind: "dehydration", summary: "a throwaway dehydration reason", remedy: "remove it" },
```

## Base experiment: an entry reason given a bucket and no event

Step 1, the `EntryProbe` row alone:

```
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-base-entry-1.log 2>&1; echo $?
2
$ head -6 exp-base-entry-1.log
packages/react/src/HydrationEngine.ts(516,9): error TS2741: Property 'EntryProbe' is missing in type '{ EntryTooDeep: unknown[]; MalformedEntry: unknown[]; UndecodablePolicy: unknown[]; }' but required in type 'Record<EntryDropReason, unknown[]>'.
```

Step 2, in `packages/react/src/HydrationEngine.ts` a fourth array `probe`, the key `EntryProbe: probe` in the `bucketOf`
record, and the trace-disagreement branch changed from `malformed.push(entry)` to `bucketOf.EntryProbe.push(entry)`; no
emission line for it:

```
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-base-entry-2.log 2>&1; echo $?
0
$ head -6 exp-base-entry-2.log
(empty)
```

Step 3, the probe `packages/react/test/BaseExperimentProbe.test.ts` (copy kept as `probe-base.test.ts`): hydrate
`{ version: 2, subjectId: "u1", entries: [good("g1"), disagreeing] }` for subject `u1` with an `onDropped` recording each
call; assert no reporter call, a seeded delta of 1, a delta of 0 under every reason of `hydrationDropReasons`, and that
`hydrationDropReasons` includes `"EntryProbe"`:

```
$ pnpm exec vitest run --project react packages/react/test/BaseExperimentProbe.test.ts --reporter=json --outputFile=exp-base-entry-probe.json < /dev/null > exp-base-entry-probe.log 2>&1; echo $?
0
$ head -1 exp-base-entry-probe.log
JSON report written to .../qd70/exp-base-entry-probe.json
report: success true; 1 assertion result
  title:  a probe bucket's entries reach no event and no count
  status: passed
```

Step 4, restore: the probe deleted, `git checkout -- packages/core/src/HydrationMetrics.ts
packages/react/src/HydrationEngine.ts`, then

```
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-restore-1.log 2>&1; echo $?
0
$ git status --porcelain -- packages
(empty)
```

Reading: the bucket record was total, so the row was refused where the record lacks it (TS2741), but nothing tied a
bucket to an event, so once the record had a bucket one entry in reached no reporter call and no count with the tree
compiling clean, the probe reason sitting in `hydrationDropReasons` the whole time.

## Base experiment: a payload reason nothing produces

The `PayloadProbe` row alone, then a search of the packages that could name it:

```
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-base-payload.log 2>&1; echo $?
0
$ head -6 exp-base-payload.log
(empty)
$ /usr/bin/grep -rn PayloadProbe packages/react/src packages/devtools/src > exp-base-payload-grep.log; echo $?
1
```

Restored with `git checkout -- packages/core/src/HydrationMetrics.ts`; the rebuilt restored tree (`exp-restore-2`) exited 0.

Reading: it compiles, and nothing in `@qadi/react` (or `@qadi/devtools`) names the reason, so no refusal or entry can ever
be reported or counted under it.

## Base experiment: a dehydration reason nothing produces

The `DehydrationProbe` row alone, then the same search:

```
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-base-dehydration.log 2>&1; echo $?
0
$ head -6 exp-base-dehydration.log
(empty)
$ /usr/bin/grep -rn DehydrationProbe packages/react/src packages/devtools/src > exp-base-dehydration-grep.log; echo $?
1
```

Restored with `git checkout -- packages/core/src/HydrationMetrics.ts`; the rebuilt restored tree (`exp-restore-2`) exited 0
and `git status --porcelain -- packages` printed nothing.

Reading: it compiles, and nothing in `@qadi/react` names the reason, so no refusal or entry can ever be reported or
counted under it.

## Type pins on the base

The type pins in `packages/react/test/HydrationBuckets.tst.ts` were written with no `packages/*/src` file changed
from `phase_base` and `HydrationBuckets.ts` absent:

```
$ pnpm test:tstyche HydrationBuckets < /dev/null > tst-red.log 2>&1; echo $?
1

> qadi-monorepo@0.4.0 test:tstyche /Users/mohammadalmechkor/Projects/Perso/qadi
> node scripts/run-tstyche.mjs HydrationBuckets

run-tstyche: pass 1 of 2, tstyche.json (tsconfig.tstyche.json, floatingEffect off), skipping "under tsconfig.test.json"
Error: Cannot find module '../src/HydrationBuckets.ts' or its corresponding type declarations. ts(2307)

  10 | import { expect, test } from "tstyche";
  11 | import type { DehydrationDropReason } from "@qadi/core";
  12 | import type { DropBuckets } from "../src/HydrationBuckets.ts";
```

A second error in the same log, further down: `Module '"../src/HydrationEngine.ts"' has no exported member 'PAYLOAD_PRODUCERS'. ts(2305)`.

`node scripts/check-house-style.mjs` passes on the tree with the file in it; its last line:

```
house-style: 564 file(s) clean (3 declared switch(es), 67 type-test file(s))
```

Reading: the module and the record do not exist, and the hand-written emission lines are total over nothing.

## After the change: an entry reason without a bucket does not compile, and with one it is reported

The same experiment as the base entry one, run on the tree after the change (HEAD `40ce1237`). The `EntryProbe` row alone,
appended last to `HYDRATION_DROP_TABLE`:

```
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-after-entry-1.log 2>&1; echo $?
2
$ head -6 exp-after-entry-1.log
packages/react/src/HydrationBuckets.ts(33,75): error TS2741: Property 'EntryProbe' is missing in type '{ EntryTooDeep: never[]; MalformedEntry: never[]; UndecodablePolicy: never[]; }' but required in type 'DropBuckets<EntryDropReason, unknown>'.
```

Then the one edit that gives it a bucket (the key `EntryProbe: []` in `entryBuckets`) and routes the trace-disagreement push
through `drops.EntryProbe` in `HydrationEngine.ts`, and no emission line, because there is none to write:

```
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-after-entry-2.log 2>&1; echo $?
0
$ head -6 exp-after-entry-2.log
(empty)
```

The after-change probe (`packages/react/test/BaseExperimentProbe.test.ts`, the base probe with its assertions inverted:
exactly one reporter call, `{ reason: "EntryProbe", entries: [disagreeing], wholePayload: false }`, a seeded delta of 1, a
delta of 1 under `EntryProbe` and 0 under every other reason):

```
$ pnpm exec vitest run --project react packages/react/test/BaseExperimentProbe.test.ts --reporter=json --outputFile=exp-after-entry-probe.json < /dev/null; echo $?
0
report: success true; 1 assertion result
  title:  a probe bucket's entries are reported and counted
  status: passed
```

Restored: the probe deleted, `git checkout -- packages/core/src/HydrationMetrics.ts packages/react/src/HydrationBuckets.ts
packages/react/src/HydrationEngine.ts`; `git status --porcelain -- packages` printed nothing.

Reading: on the base the same two edits compiled and the entry reached no event and no count. Now the row is refused at the
record that lacks it, and once the record has it the entry is reported and counted with no other edit.

## After the change: a payload reason without a producer does not compile

The `PayloadProbe` row alone:

```
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-after-payload.log 2>&1; echo $?
2
$ head -6 exp-after-payload.log
packages/react/src/HydrationEngine.ts(221,3): error TS2741: Property 'PayloadProbe' is missing in type '{ PayloadSubjectMismatch: "SubjectCheck"; UnsupportedPayloadVersion: "UnsupportedPayloadVersion"; MalformedPayload: "Malformed"; PayloadTooDeep: "TooDeep"; }' but required in type '{ readonly MalformedPayload: PayloadProducer; readonly PayloadProbe: PayloadProducer; readonly PayloadSubjectMismatch: PayloadProducer; readonly PayloadTooDeep: PayloadProducer; readonly UnsupportedPayloadVersion: PayloadProducer; }'.
packages/react/src/HydrationEngine.ts(232,43): error TS2536: Type 'R' cannot be used to index type '{ PayloadSubjectMismatch: "SubjectCheck"; UnsupportedPayloadVersion: "UnsupportedPayloadVersion"; MalformedPayload: "Malformed"; PayloadTooDeep: "TooDeep"; }'.
```

Restored with `git checkout -- packages/core/src/HydrationMetrics.ts`.

Reading: refused at `PAYLOAD_PRODUCERS`, naming the row. A second error follows from the first (the `ReasonRaisedBy` index no
longer type-checks against the record that lacks the row); the plan predicted only the TS2741, and the extra TS2536 is the
same fault seen from the inverse record's type, so it disappears when the row is given its producer.

## After the change: a dehydration reason without a bucket does not compile

The `DehydrationProbe` row alone:

```
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-after-dehydration.log 2>&1; echo $?
2
$ head -6 exp-after-dehydration.log
packages/react/src/HydrationBuckets.ts(41,93): error TS2741: Property 'DehydrationProbe' is missing in type '{ ForeignSubject: never[]; UnencodablePolicy: never[]; }' but required in type 'DropBuckets<DehydrationDropReason, DecisionEntry>'.
```

Restored with `git checkout -- packages/core/src/HydrationMetrics.ts`; then:

```
$ git status --porcelain -- packages
(empty)
$ pnpm exec tsc -b tsconfig.json < /dev/null > exp-restore-3.log 2>&1; echo $?
0
```

## Type pins after the change

```
$ pnpm test:tstyche HydrationBuckets < /dev/null > tst-green.log 2>&1; echo $?
0
$ tail -6 tst-green.log
Targets:    1 passed, 1 total
Test files: 1 passed, 1 total
Tests:      6 passed, 6 total
Assertions: 12 passed, 12 total
Suppressed: 2 matched, 2 total
Duration:   2.1s
```

The whole `pnpm test:tstyche` run (both passes) passed after the payload-record commit: 67 test files, 354 tests passed
(2 skipped), 771 assertions passed (6 skipped). `HydrationBuckets.tst.ts`, red on the base, is green.
