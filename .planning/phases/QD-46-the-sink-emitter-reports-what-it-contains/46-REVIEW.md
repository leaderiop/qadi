---
phase: QD-46-the-sink-emitter-reports-what-it-contains
reviewed: 2026-11-15T15:50:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - .changeset/audit-sink-names-itself.md
  - .changeset/sink-emitter-reports-failures.md
  - apps/website/src/content/docs/docs/concepts/decision-lifecycle.md
  - apps/website/src/content/docs/docs/packages/core/services.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/audit/src/AuditDecisionSinkLive.ts
  - packages/audit/test/AuditDecisionSinkLive.test.ts
  - packages/core/src/DecisionLog.ts
  - packages/core/src/DecisionSink.ts
  - packages/core/src/DecisionSinkForwarding.ts
  - packages/core/src/EvaluationEnvironment.ts
  - packages/core/src/SinkEmit.ts
  - packages/core/test/DecisionSink.test.ts
  - packages/core/test/DecisionSink.tst.ts
  - packages/core/test/EvaluationEnvironment.test.ts
  - packages/core/test/ShippedSinkReports.test.ts
  - packages/core/test/SinkEmitReport.test.ts
  - spec/README.md
  - spec/behaviors/24-decision-sink.md
  - spec/decisions/044-an-optional-decision-sink.md
  - spec/decisions/159-the-sink-emitter-reports-what-it-contains.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase QD-46: Code Review Report

**Reviewed:** 2026-11-15T15:50:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

The implementation is sound on the points the brief singled out. I checked each one by running it, not only by reading it
(scratch probes outside the repo, against `packages/core/src`):

- `sinkEmitter` contains and reports a die, a throw inside `Effect.sync`, a throw before `record` returns an effect, a
  self-interrupt, a leaked typed failure, a throwing `name` getter and a throwing logger. A throwing logger surfaces as a
  `Die` from `Effect.logWarning` (probed), so the report's own `catchCause` is necessary, and E9 and A6 do fail without it.
- `String(cause)` did not throw for a die carrying an object with a throwing `toString`, a circular object, a null-prototype
  object, an error with a throwing `message`, `stack`, `cause` or `name` getter, a throwing `toJSON` or a throwing Proxy.
  Each produced exactly one line.
- An outer interrupt is not swallowed or logged. A forked evaluation whose sink is blocked on `Effect.never` ends
  `Failure(interrupt)` with zero lines, directly and under `decisionSinkAll`. A sink that is interrupted while in an
  uninterruptible sleep and then dies also yields zero lines and an interrupt exit.
- `decisionSinkAll` keeps member order and a later member always runs, including after a self-interrupting member.
- The sink is still read once: `serviceOption(DecisionSink)` appears once in the phase's source, and
  `check-house-style.mjs` reports 515 files clean. `Lifecycle.ts` and `Handover.ts` are the only emit callers.
- Each failure gets one report. A forwarder whose `onFailure` throws is reported by the emitter only, once, naming
  `decisionSinkForwarding`. The refusal hook, the no-hook send warning and the audit lines return success, so the emitter
  is silent.
- Gates run and pass: `vitest` on 6 files (149 tests), `tstyche` on `DecisionSink.tst.ts`, `check-doc-examples`
  (116 blocks), `check-api-surface`, `spec:verify:strict` (21 PASS), `madge --circular`, `oxlint` on the touched files.
- The spec and docs agree with the code on the message text, the four annotation keys, the five names and the record tag
  `Obligations`.

No Critical findings. The two Warnings are a hole in "exactly once per lost record" (a sink can make its own report vanish)
and an unpinned, unstated interruption contract the brief calls out.

## Warnings

### WR-01: A sink that makes the record unreadable before failing erases its own report

**File:** `packages/core/src/SinkEmit.ts:61-70` (read at `:65-66`), emitter at `:96-107`

**Issue:** `reportSinkFailure` reads `record._tag` and `record.evaluationId` lazily, after the sink has run, and inside the
suspend whose `catchCause(() => Effect.void)` discards any failure. The record is the same mutable object the sink was
handed (`Data.TaggedClass` instances are not frozen; `Object.isFrozen` is `false`). A sink that redefines a field with a
throwing getter and then dies makes the report's own read throw, and the line is dropped without trace. I probed this:
`Object.defineProperty(r, "evaluationId", { get() { throw ... } })` followed by `Effect.die("boom")` gives **0** lines.
A sink that merely reassigns `evaluationId` makes the report name the wrong evaluation.

This is the same class of hazard the phase already guards for `name` (E7) and for the logger (E9), but one the guards do not
cover. It contradicts INV-QD-337 ("exactly one `Warn` line per lost record"), and BEH-QD-566 states the same requirement.
It is also a failure to report exactly where a sink is misbehaving worst. A sink that rewrites its own record is a bug, not
an attack, but the report is supposed to be the thing that makes such a bug visible.

**Fix:** Capture the two fields before the sink is called, so the report describes what was handed over. Reading a tag and
an id is two property loads on the success path. A throwing getter on a real record would also surface at the call site, so
capture inside the same containment:

```ts
? (record) => {
    const { _tag, evaluationId } = record; // what was handed over, not what the sink left
    return Effect.catchCause(
      Effect.suspend(() => sink.value.record(record)),
      (cause) => reportSinkFailure(sink.value, { _tag, evaluationId }, cause),
    );
  }
```

and type `reportSinkFailure`'s second parameter as `Pick<SinkRecord, "_tag" | "evaluationId">`. If the reads must stay lazy,
wrap them in the same fallback `sinkName` uses, so a failed read degrades to `"unknown"` instead of dropping the line. Add a
row beside E7: a sink that installs a throwing getter on `evaluationId` and then dies is still reported once.

### WR-02: The outer-interrupt vs self-interrupt contract is neither pinned by a test nor stated in the spec

**File:** `packages/core/test/SinkEmitReport.test.ts:150-160` (E3) and `:269-279` (O3); `spec/behaviors/24-decision-sink.md` (BEH-QD-566);
`spec/invariants.md` (INV-QD-337)

**Issue:** The emitter reports every `Interrupt` cause that reaches its `catchCause`, and relies on the Effect runtime to
skip that handler when the evaluating fiber itself is being interrupted. That reliance is correct today (probed: an outer
`Fiber.interrupt` of an evaluation blocked in the sink ends as an interrupt with no line). But every interrupt row in the
phase (E3, O3) is a *self*-interrupt through `Effect.interrupt`. No row interrupts the evaluation from outside while the sink
is running. BEH-QD-566 and INV-QD-337 list "a self-interruption" as reported and say nothing about the case that must not be.

The result is that the one semantic distinction this change turns on can regress silently. Someone could replace `catchCause`
with a form that also runs for a fiber that is being interrupted, or add an `Effect.uninterruptible` around the call. The
change would then log a `Warn` for every cancelled request ("a decision sink failed") and make `evaluate` uninterruptible.
All 149 existing tests would still pass. The same applies to `decisionSinkAll`, where no row interrupts a member, from inside
or outside.

**Fix:** Add rows that fork an evaluation under a sink whose `record` is `Effect.never`, interrupt the fiber, and assert
that the exit is an interrupt and `logs.lines.length === 0`. Do it for the bare emitter and for a `decisionSinkAll` member.
Add one row for a self-interrupting `decisionSinkAll` member, with a later member still recording. Add a sentence to
BEH-QD-566 and INV-QD-337: "An interruption of the evaluation itself is not a sink failure: it propagates and is not
reported."

## Info

### IN-01: The fan-out's member line omits the record tag and evaluation id, and restates the emitter's report by hand

**File:** `packages/core/src/DecisionSinkForwarding.ts:184-195`

**Issue:** The emitter's line carries `qadi.sink`, `qadi.record_tag`, `evaluationId` and `qadi.cause`. The fan-out's member
line carries only `qadi.sink` and `qadi.cause`. A reader correlating lost records by `evaluationId` (the point of INV-QD-337)
gets those for a plain sink but not for the same failure behind `decisionSinkAll`, the deployment shape the spec recommends
for devtools plus a local log. BEH-QD-570 requires only the two keys, so this is a gap in the requirement, not a deviation
from it. The block (`sinkName`, `logWarning`, `annotateLogs`, `catchCause(() => Effect.void)`) is also a second hand-written
copy of `reportSinkFailure`'s skeleton.

**Fix:** Export one package-private report from `SinkEmit.ts` that takes the message and the record, and have both call it.
That gives the fan-out line `qadi.record_tag` and `evaluationId` for free, and means the next change to the report
(WR-01, for one) is made once. Amend BEH-QD-570 to list the four keys.

### IN-02: The tests do not pin the exact annotation set, and INV-QD-338's "cause rendering throws" clause has no row

**File:** `packages/core/test/SinkEmitReport.test.ts:83-99`; `spec/invariants.md:3901`; `spec/behaviors/24-decision-sink.md:186`

**Issue:** BEH-QD-566 and the ADR say the annotations are exactly four keys. `assertReport` checks the four values, then
rejects only keys containing `subjectid`, `resource`, `resourceid`, `policy` or `action`. An added `qadi.at`, `qadi.user` or
`qadi.record` annotation passes, so the "exactly these four" claim is not enforced and a later change could widen the line
with a content-bearing key whose name is not on the list. Separately, INV-QD-338 and BEH-QD-568 name "a cause whose rendering
throws" as a hazard they hold. No row exercises it (E7 is the name getter, E9 the logger). I could not make `String(cause)`
throw (see Summary), so the clause is currently true but unobserved, and the guard it describes is the same
`catchCause(() => Effect.void)` that E9 already covers.

**Fix:** Add `assert.deepStrictEqual(Object.keys(line.annotations).toSorted(), ["evaluationId", "qadi.cause", "qadi.record_tag", "qadi.sink"])`
to `assertReport`. For the rendering clause, either drop it from the two spec statements (the logger row proves the
containment) or add a row with the strongest hostile cause that can be built, and say so.

### IN-03: `sinkName` is exported from the emit module, so the forwarder now imports it

**File:** `packages/core/src/SinkEmit.ts:43`, imported at `packages/core/src/DecisionSinkForwarding.ts:29`

**Issue:** `sinkName` is a property of `DecisionSinkShape` (its `name` field and the `unnamed` rule), but it lives in the
module that projects records and reads the service. `DecisionSinkForwarding.ts` now depends on `SinkEmit.ts` (and through it
on `DecisionRecord`, `Question`, `Resource`) only for a four-line helper. No cycle results (`madge` is clean), and
`sink-read-once` is unaffected, so this is placement only.

**Fix:** Move `sinkName` and `UNNAMED` next to the shape in `DecisionSink.ts`, or fold the helper into the shared report
from IN-01. Keep it out of the barrel as now.

---

_Reviewed: 2026-11-15T15:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
