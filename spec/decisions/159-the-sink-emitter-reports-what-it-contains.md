# ADR-QD-159 — The sink emitter reports what it contains

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-159                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-11-15                                     |
> | Status         | Accepted — amends ADR-QD-044                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.3 (2026-11-15): the report names the tag and evaluation id read before the sink runs, and unknown when they cannot be read; rows E13, E14 (ARCH-93, CCR-QD-437)<br>1.2 (2026-11-15): The record tag literal reads Obligations, as the code emits<br>1.1 (2026-11-15): Related: BEH-QD-566 to BEH-QD-570, INV-QD-337 and INV-QD-338 (ARCH-93, CCR-QD-437)<br>1.0 (2026-11-15): Initial (ARCH-93, CCR-QD-437) |

---

## Context

`sinkEmitter` (`SinkEmit.ts`) is the one place a record is handed to the optional `DecisionSink`
([ADR-QD-044](./044-an-optional-decision-sink.md), [ADR-QD-100](./100-a-question-is-asked-once.md)). It contained every
cause a sink's `record` let through with `catchCause(..., () => Effect.void)` and reported none of them. So a sink that
failed, whether a user's own or one of ours, lost its record and left no line anywhere: the decision was right and the
audit trail had a hole nobody could see.

It was also not complete. `emit(record)` called `sink.record(record)` eagerly, outside the `catchCause`, so a sink whose
`record` threw before it returned an effect did not lose a record quietly; it ended `evaluate`, a defect in
[INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision) rather than a missing report. And the shipped
sinks each carried a containment of their own, one of them (the forwarder's outer catch) a second copy of the emitter's.

Measured on the phase base `76e589e0` before any source change, by rows that drive a sink through `evaluate` and
`enforce` and count the lines a collecting logger saw (plan 46-01, `SinkEmitReport.test.ts`, 16 rows):

```
 Test Files  1 failed (1)
      Tests  14 failed | 2 passed (16)
```

A sink whose `record` dies, throws inside `Effect.sync`, self-interrupts, or fails through a type escape produced zero
lines (`expected +0 to equal 1`) with the decision unchanged. A `record` that throws before returning an effect made
`evaluate`'s exit a `Die` instead of an allow. The two rows that passed are the sink that never fails (nothing to report)
and a throwing logger (nothing logged, so the logger is never called).

The shipped sinks, characterised and then driven RED by plan 46-02 (`ShippedSinkReports.test.ts`,
`AuditDecisionSinkLive.test.ts`):

```
 Test Files  1 failed (1)
      Tests  12 failed | 4 passed (16)        (ShippedSinkReports.test.ts)

 Test Files  1 failed (1)
      Tests  1 failed | 34 passed (35)        (AuditDecisionSinkLive.test.ts)
```

Four rows (C1-C4) held green on the base and fixed what must not change: a forwarder send failure whose `onFailure`
throws produced one line, a `send` that threw before returning an effect produced one line, a refusal whose hook threw
produced one line, and the decision log's dying append produced one line. The twelve that failed asked for a sink's name
(`expected { record: [Function record] } to have property 'name'`), a fan-out member's name in its report, and that a
member throwing before returning an effect, or a throwing logger, not stop the members after it.

## Decision

**The emitter contains and reports every cause once, naming the sink.** (ARCH-93, CCR-QD-437.)

1. **One report, built lazily and contained.** `sinkEmitter` suspends the call (`Effect.suspend(() => sink.record(record))`)
   and any cause it contains, whether a defect, a throw before an effect is returned, a self-interruption or a typed
   failure leaked through a type escape, becomes one `Warn` line:

   ```
   qadi: a decision sink failed; the record was not delivered
   ```

   annotated with exactly four keys: `qadi.sink` (the sink's name), `qadi.record_tag` (`Decision` or `Obligations`),
   `evaluationId` and `qadi.cause` (the cause, rendered as `String(cause)`). Never a subject, resource, policy or
   action. The tag and the evaluation id are read from the record before the sink is called (`handedOver`, contained), so a
   sink that rewrites its own record and then fails is reported with the evaluation it was handed; a record whose fields
   cannot be read is reported as `unknown`, never dropped. The report is a plain function built under `Effect.suspend` and has its own `catchCause`, so a throwing logger,
   name getter or cause rendering cannot become a defect and cannot change an outcome (INV-QD-035). It is not traced: it
   runs only on a failure, and a span-name literal would be a mutant no row can observe.
2. **A sink may name itself.** `DecisionSinkShape.name` is optional, `string | undefined`, as
   `AttributeResolverShape.name` is. It is read only inside a report and guarded (`sinkName`, package-private), so a getter
   that throws is reported as `unnamed` and a sink that never fails pays nothing for having one. A sink with no name is
   `unnamed`; an empty string is annotated as given, because the sink chose it (`??`, not `||`). Nothing branches on it.
3. **The five shipped sinks name themselves:** `decisionSinkForwarding`, `decisionSinkAll`, `decisionLog`,
   `evaluationEnvironment.shadow` (the simulation's discarding sink, which cannot fail) and `AuditDecisionSinkLive`.
4. **A sink keeps its own catch only when the catch changes behaviour or says what the emitter cannot.** Every warning
   and `catchCause` on a sink's `record` path was classified (table below) and the rule applied row by row:
   - The forwarder's outer catch (W4) is removed. It was pure containment and, left beside the emitter's, would log one
     failure twice. A `send` that throws before returning an effect is now suspended and handled as the send failure it
     is, so it reaches `onFailure` ([BEH-QD-187](../behaviors/24-decision-sink.md#beh-qd-187-a-sink-can-forward-and-a-forwarder-cannot-break-evaluation)).
   - The fan-out's member catch (W5) stays, because it changes behaviour (later members still run), and gains `qadi.sink`
     with the member's name, or `unnamed`. Its call is suspended and its report contained, so a member that throws before
     returning an effect, a throwing name getter or a throwing logger no longer stops the members after it.
   - The decision log's two `isolate` catches (W6, W7) stay: they say which half failed, which the emitter cannot. Their
     doc is corrected: the other half does **not** run, because `isolate("publish")` sits inside `isolate("append")`.
     W7 is kept but unreachable, and is not claimed as pinned.
   - The forwarder's refusal and send-failure reports (W1-W3), the audit sink's reports and outcome (W8-W10) say
     something other than "the emitter let a cause through" and stay untouched.
5. **The sink is still read once.** ADR-QD-044's single read and ADR-QD-100's `sink-read-once` rule stand. Nothing about
   what a sink receives, or when, changes.

### The classification

D-12: each `logWarning`, `logError` and `catchCause` on a sink's `record` path, with the test row that pins that the
failure it covers is reported once and not twice. `File:line` are at the phase base `76e589e0`; the rows named under
"Pinned by" are in `packages/core/test/SinkEmitReport.test.ts` (E1-E14, O1-O5),
`packages/core/test/ShippedSinkReports.test.ts` (C1-C4, N1-N4, A1-A6, F1-F2), or are existing rows named by title.

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
| R0 | `SinkEmit.ts` (46-03) | "qadi: a decision sink failed; the record was not delivered" with `qadi.sink`, `qadi.record_tag`, `evaluationId`, `qadi.cause` (D-01 to D-04) | the emitter's one report of a cause the sink let through | new | the only report for a cause that escapes a sink's `record`: every row above returns success | E1-E14, O1-O5 (46-01); F2 |

devtools, react and http implement no `DecisionSink`: `Wiring.ts` in devtools only reads whether one is installed
(`Effect.serviceOption(DecisionSink)`), and a grep over `packages/*/src` finds exactly five implementations, the five
named above.

## Alternatives considered

- **A `qadi_*` counter of lost records.** Declined here and deferred, not rejected: a counter is a second signal for the
  same event and a later phase can add it, with its row in the metric table, under
  [ADR-QD-123](./123-a-metric-is-declared-once.md). The line is enough to find a failing sink today.
- **Reading the sink's name when the emitter is built.** Rejected: `name` may be a getter in a caller's code, and one that
  throws would end `evaluate`. It is read inside the report, guarded.
- **Keeping each shipped sink's outer catch.** Rejected: two reports for one failure, which is what W4 was.
- **A traced span on the report.** Rejected: it runs only on a failure, and its name would be a string literal no test
  observes.
- **Normalising an empty name to `unnamed`.** Rejected: the sink chose the empty string, and the report says what it was
  told.
- **Making a failing `record` representable (`Effect<void, E>`).** Rejected: ADR-QD-044's choice stands. An observer's
  failure is not the decision's, and the type already refuses it; a type escape is contained and reported like any other
  cause.

## Consequences

- **A sink that fails on every record fills the log, one line per lost record** (accepted; T-46-09). A deployment that
  must not log that often should handle its own failure, as the shipped sinks do, so the emitter sees success.
- **A sink's `name` is its author's label.** It reaches the log as an annotation value, never in the message, so a name
  with newlines or markup cannot forge a line (accepted; T-46-08).
- **`qadi.cause` renders the cause as the shipped sinks already did.** A sink that puts record content into its own error
  puts it in this line too; this decision does not change what a cause says.
- **One text change.** A throwing `onFailure` on a send failure is now reported by the emitter's line, naming
  `decisionSinkForwarding`, where it used to say "qadi: a decision record could not be forwarded". A query keyed on that
  text for this case changes; the same text is still what a send failure with no hook logs.
- **A `send` that throws before returning an effect now reaches `onFailure`**, as a send failure does, where it was caught
  only by the forwarder's outer catch and the hook was skipped.
- **A fan-out member's line gains `qadi.sink`**, and a member that throws before returning an effect no longer stops the
  members after it.
- **A failing `record` still compiles only through a type escape**, and is contained and reported.
- **Not a breaking change.** `DecisionSinkShape` gains an optional field and no export is added or removed; `@qadi/core`
  is a minor, `@qadi/audit` a patch. Nothing a sink receives, and no outcome, changes.

### Found while planning

- A sink whose `record` throws before it returns an effect makes `evaluate` die: `emit(record)` evaluates the call
  eagerly, outside `catchCause` (E5).
- A sink that redefines a field of its own record with a throwing getter and then dies erased its own report, because the
  report read the record lazily, after the sink had run (E13, E14).
- A report handler that throws is a defect unless the report is built lazily and contained (E9, A6).
- A forwarder `send` that throws before returning an effect skips `onFailure` and is caught only by W4 (C2, F1).
- A fan-out member that throws before returning an effect silently stops every later member, because the call is eager
  inside the `forEach` callback (A4).
- A `name` getter that throws must not end the report: it is read inside the containment and reported as `unnamed`
  (E7, A3).
- A throwing logger in the fan-out's member report stops later members (A6).
- The decision log's append half is reachable through `ingest` with a record that carries an enumerable throwing getter
  (C4).

## Related

- [ADR-QD-044](./044-an-optional-decision-sink.md), which this amends
- [ADR-QD-100](./100-a-question-is-asked-once.md), the single emitter and `sink-read-once`
- [ADR-QD-123](./123-a-metric-is-declared-once.md), the metric a later phase may add
- [ADR-QD-009](./009-observability-via-effect.md), observability through Effect's own channels
- [BEH-QD-181](../behaviors/24-decision-sink.md#beh-qd-181-the-sink-is-optional-and-write-only),
  [BEH-QD-182](../behaviors/24-decision-sink.md#beh-qd-182-a-sink-cannot-change-a-decision),
  [BEH-QD-187](../behaviors/24-decision-sink.md#beh-qd-187-a-sink-can-forward-and-a-forwarder-cannot-break-evaluation)
- [INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)
- [BEH-QD-566](../behaviors/24-decision-sink.md#beh-qd-566-a-sink-that-fails-is-reported-once-for-every-record-it-loses),
  [BEH-QD-567](../behaviors/24-decision-sink.md#beh-qd-567-a-sink-may-name-itself-and-a-report-names-it-or-says-unnamed),
  [BEH-QD-568](../behaviors/24-decision-sink.md#beh-qd-568-a-report-cannot-change-an-outcome),
  [BEH-QD-569](../behaviors/24-decision-sink.md#beh-qd-569-a-shipped-sink-keeps-only-the-reports-that-change-behaviour-or-say-something-else),
  [BEH-QD-570](../behaviors/24-decision-sink.md#beh-qd-570-a-fan-out-names-the-member-that-failed-and-every-member-is-isolated)
- [INV-QD-337](../invariants.md#inv-qd-337-a-contained-sink-failure-is-reported-exactly-once-per-lost-record-naming-the-sink),
  [INV-QD-338](../invariants.md#inv-qd-338-no-report-on-the-sink-path-can-change-an-outcome-or-stop-a-later-fan-out-member)
