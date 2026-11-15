# Phase 46: classification of every warning on a sink's record path

D-12 (EMIT-03): each `logWarning`, `logError` and `catchCause` on a sink's `record` path, classified, with the
test row that pins that the failure it covers is reported once and not twice. File:line are at the phase base
`76e589e0`; the rows named under "Pinned by" are in `packages/core/test/SinkEmitReport.test.ts` (E1-E11, O1-O5),
`packages/core/test/ShippedSinkReports.test.ts` (C1-C4, N1-N4, A1-A6, F1-F2), or are existing rows named by title.
46-05 copies this table into ADR-QD-159.

## Every warning on a sink's record path

| # | Where | What it says or does | Kind | Decision | One report after the change | Pinned by |
|---|-------|----------------------|------|----------|-----------------------------|-----------|
| W0 | `SinkEmit.ts:53` | `catchCause(..., () => Effect.void)`: contains every cause and reports none | outer containment | becomes the report (R0) | n/a: it is replaced by R0 | E1-E10, O1-O5 (46-01) |
| W1 | `DecisionSinkForwarding.ts:87-94`, through `EncodeRefusalReport.ts:37` | "qadi: a decision record could not be encoded for forwarding" with `qadi.refusal`, `qadi.path`, `evaluationId` | says something else (an encode refusal, not a delivery failure) | keep (D-09) | yes: it returns success, so the emitter is silent | existing `DecisionSinkForwarding.test.ts` "with no onFailure, a refusal logs its own message, distinct from a send failure" |
| W2 | `EncodeRefusalReport.ts:40-45`, called from W1 and `AuditWriteReport.ts:218-222` | "qadi: an encode-refusal hook threw" with `qadi.cause` | contains a hook the sink was handed and says which hook | keep | yes: it returns success | C3; existing `AuditDecisionSinkLive.test.ts` "a throwing onRefused is logged, and the next healthy record is still written" |
| W3 | `DecisionSinkForwarding.ts:98-100` (`reportSendFailure`, no `onFailure`) | "qadi: a decision record could not be forwarded" with `qadi.cause`: `send` failed or died | the sink handled the failure | keep (D-09) | yes: it returns success | C2; existing `DecisionSinkForwarding.test.ts` "with no onFailure it warns rather than going quiet" |
| W3b | `DecisionSinkForwarding.ts:108` (`reportSendFailure`, with `onFailure`) | no log: calls the caller's hook with `Cause.squash(cause)` | behaviour (BEH-QD-187) | keep | a hook that throws dies out of W3b, and after D-09 the emitter reports it once | F1 (a `send` that throws reaches the hook as the thrown error, nothing logged) |
| W4 | `DecisionSinkForwarding.ts:125-129` | same text as W3 with `qadi.cause`: the outer "defence in depth" for a throwing `onFailure` | pure outer containment | remove (D-09) | removing it is what prevents a second `Warn` beside the emitter's | C1 (count one before and after) and F2 (the emitter's report, naming `decisionSinkForwarding`) |
| W5 | `DecisionSinkForwarding.ts:187-191` | "qadi: a fanned-out decision sink failed unexpectedly" with `qadi.cause` | changes behaviour (later members still run) | keep, add `qadi.sink` = the member's `name` or `unnamed` (D-10) | yes: it returns success, so the emitter is silent; a nested fan-out reports once at the innermost level | A1-A6; existing "a member's death is reported through a log, not silently swallowed" |
| W6 | `DecisionLog.ts:172-177`, `isolate("append")` at `:259` | "qadi: a decision log's append half failed" with `qadi.cause` | says which half died | keep (D-11) | yes: it returns success | C4 |
| W7 | `DecisionLog.ts:257`, `isolate("publish")` | "qadi: a decision log's publish half failed" | behaviour-neutral but needed: without it the outer `isolate("append")` would label a publish defect as the append half | keep | yes: the inner catch returns success, so the outer sees none | none: see "Kept but unreachable" |
| W8 | `AuditWriteReport.ts:241` | the audit outcome line (`describeAuditWriteOutcome`), annotated with `evaluationId` | a report, not containment | keep, untouched | yes: the record path returns success | existing `AuditDecisionSinkLive.test.ts` "unwired, a failed write logs the drop with its evaluationId" and "onOutcome receives each record's outcome once, after its report" |
| W9 | `AuditWriteReport.ts:254-258` | "qadi/audit: an onOutcome hook threw" with `evaluationId`, `qadi.cause` | contains a caller's hook and says which | keep | yes: it returns success | existing `AuditDecisionSinkLive.test.ts` "a throwing onOutcome is logged, and the next record is still written" |
| W10 | `AuditDecisionSinkLive.ts:203` | `catchCause(... WrittenStaging.CommitFailed({ cause }))`: a value, not a log | behaviour (an outcome) | keep | n/a: no line is written; the failure becomes an outcome | existing `AuditSinkDeadline.test.ts` "a hung commit settles as CommitFailed after a successful write" |
| R0 | `SinkEmit.ts` (46-03) | "qadi: a decision sink failed; the record was not delivered" with `qadi.sink`, `qadi.record_tag`, `evaluationId`, `qadi.cause` (D-01 to D-04) | the emitter's one report of a cause the sink let through | new | the only report for a cause that escapes a sink's `record`: every row above returns success | E1-E11, O1-O5 (46-01); F2 |

## One failure, one report, per shipped sink

- `decisionSinkForwarding`: a `send` failure with no hook is W3 and returns success (C2, existing "with no onFailure it
  warns rather than going quiet"); with a hook that returns, nothing is logged (existing hook rows); a `send` that
  throws before returning an effect reaches the hook (F1); a hook that throws is reported by R0 only, never by W4 as
  well (C1 holds the count at one before and after, F2 holds the text after); a refusal is W1, and a refusal whose
  hook throws is W2 (C3), each one line.
- `decisionSinkAll`: a member's failure is W5, once, naming the member, and the fan-out returns success so R0 is silent
  (A1, A2, A4); a member whose `name` getter throws is reported as `unnamed` (A3); a fan-out inside a fan-out reports at
  the innermost level only (A5); a logger that throws does not stop later members (A6); an empty fan-out reports
  nothing (N2).
- `decisionLog`: an append that dies is W6, once, nothing retained, the next record kept (C4); the sink returns success
  so R0 is silent.
- `evaluationEnvironment.shadow` (`sinkAndCache`): `record: () => Effect.void`; it cannot fail, so nothing is reported
  (N4 names it).
- `AuditDecisionSinkLive`: its record path returns success on every branch: W9 contains the outcome hook, W2 the
  refusal hook, W10 turns a commit failure into an outcome, and W8 is a report; the emitter never sees a failure, so R0
  is silent (the existing rows above; the audit name row pins its name).
- A sink of a caller's own: any cause that escapes `record` (a die, a throw inside `Effect.sync`, a throw before an
  effect is returned, a self-interrupt, a typed failure through a type escape) is reported once by R0 and the decision
  is unchanged (E1-E8, E11, O1-O5); a throwing logger does not change the decision (E9); a sink that never fails
  reports nothing (E10).

## Found while planning

- A sink whose `record` throws before it returns an effect makes `evaluate` die: `emit(record)` evaluates the call
  eagerly, outside `catchCause` (E5).
- A report handler that throws is a defect unless the report is built lazily and contained (E9, A6).
- A forwarder `send` that throws before returning an effect skips `onFailure` and is caught only by W4 (C2, F1).
- A fan-out member that throws before returning an effect silently stops every later member, because the call is
  eager inside the `forEach` callback (A4).
- A `name` getter that throws must not end the report: it is read inside the containment and reported as `unnamed`
  (E7, A3).
- A throwing logger in the fan-out's member report stops later members (A6).
- The decision log's append half is reachable through `ingest` with a record that carries an enumerable throwing getter
  (C4).

## Kept but unreachable

- W7 (`isolate("publish")`): `PubSub.publish` on the sliding pubsub `makeDecisionLog` builds cannot fail or die, so no
  test reaches it. It is kept because without it the outer `isolate("append")` would label a publish defect as the
  append half (D-11). It is not claimed as pinned.

## Packages with no sink

devtools (`model/Source.ts` and `model/Wiring.ts` read a feed; `Wiring.ts:106` is `Effect.serviceOption(DecisionSink)`,
which reads whether a sink is installed and implements none), react and http implement no `DecisionSink`. The grep, run
at the phase base over `packages/*/src` for `Layer.succeed(DecisionSink` and for `Layer.effect(` followed by `DecisionSink,`
on the next line, finds exactly five implementations: `DecisionSinkForwarding.ts:110` (`decisionSinkForwarding`) and
`:160-161` (`decisionSinkAll`), `DecisionLog.ts:283`, `EvaluationEnvironment.ts:75` and
`packages/audit/src/AuditDecisionSinkLive.ts:134-135`. Under `packages/devtools/src` the only other matches are comments and
the `Wiring.ts:24` import; `packages/react/src` has no match at all; `packages/http/src/QadiHttpError.ts:440` is a
doc comment.
