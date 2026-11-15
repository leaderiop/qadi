# Phase 46: The sink emitter reports what it contains - Context

**Gathered:** 2026-11-15
**Status:** Ready for planning

<domain>
## Phase Boundary

A decision sink that fails or dies is contained, as INV-QD-035 requires (an observer must never deny), and reported with exactly one warning, so a user-written sink can no longer lose records with no log at all (ARCH-93, `@qadi/core`; EMIT-01..04, WX-01..07).

In scope:
- `sinkEmitter` (`packages/core/src/SinkEmit.ts`) gains the report;
- `DecisionSinkShape` gains an optional `name`;
- the shipped sinks name themselves;
- each shipped-sink warning is classified, and only containment the emitter now covers is removed.

Out of scope:
- a new metric;
- any change to what a sink receives or when;
- a second read of the sink (ADR-QD-044/100, `sink-read-once`).

Shared wave rules: `.planning/phases/_WAVE10-CONTEXT.md`. Reserved ids: ARCH-93, ADR-QD-159, CCR-QD-437, BEH-QD-566..570, INV-QD-337..338.

</domain>

<decisions>
## Implementation Decisions

### The emitter's report
- **D-01:** A contained sink failure produces one `Effect.logWarning` and nothing else. No metric.
- **D-02:** The warning text is fixed: "qadi: a decision sink failed; the record was not delivered". Its annotations are:
  - the sink's name;
  - the record's `_tag`;
  - its `evaluationId`;
  - `qadi.cause` (`String(cause)`, the annotation the shipped sinks already use).
- **D-03:** Every cause the emitter contains is reported: a defect (`Effect.die` or a throw), a typed failure leaking through a type escape, and the sink's own self-interruption. Each one lost the record.
- **D-04:** The report runs inside the containment. A logger that throws is swallowed too, so INV-QD-035 holds whatever the logger does.

### The sink's `name`
- **D-05:** `DecisionSinkShape` gains `readonly name?: string | undefined`, the same shape `AttributeResolverShape` uses (AGENTS.md §2). It is optional, so existing sinks still compile.
- **D-06:** Every shipped sink names itself: `decisionSinkForwarding`, `decisionSinkAll`, `DecisionLog`'s sink, `AuditDecisionSinkLive`, and any devtools or react sink research finds. A warning from a shipped sink never says "unnamed".
- **D-07:** `decisionSinkAll` is named a fixed `"decisionSinkAll"`.
- **D-08:** An unnamed sink's warning carries `"unnamed"` in the name annotation, with the same message. It still produces its one warning.

### Classifying the shipped sinks' warnings
- **D-09:** In `DecisionSinkForwarding.ts`:
  - keep the encode-refusal report (`reportRefusal`) and the send-failure report (`reportSendFailure`, which calls `onFailure`). Both say something else: the sink handled the failure.
  - remove the outer defence-in-depth `Effect.catchCause` (the one for a throwing `onFailure`). It is containment the emitter now covers, so a throwing `onFailure` gets the emitter's one warning.
- **D-10:** `decisionSinkAll`'s per-member catch stays, because it changes behaviour: the members after a failed one still run. Its warning gains the failing member's `name` (`"unnamed"` when the member has none). A member's failure is reported once, by `decisionSinkAll`, and the emitter sees success.
- **D-11:** `DecisionLog`'s `isolate` stays. It changes behaviour (the other half still runs) and says which half failed.
- **D-12:** For any other shipped sink found in research (audit, devtools, react), the rule is one failure, one report:
  - a sink's own catch stays only if it changes behaviour or says something the emitter cannot;
  - pure outer containment is removed.

  Every existing warning gets a row in the phase's classification table, which is committed with the RED tests.

### Tests and evidence
- **D-13:** The RED tests drive both record kinds through public entry points: a decision record through `evaluate`, and an obligation record through `enforce`'s discharge. Each runs with three sinks:
  - a dying sink (`Effect.die`);
  - a throwing sink (a throw inside `Effect.sync`);
  - a self-interrupting sink.

  Each asserts exactly one warning (zero on the phase base) and an unchanged decision. A named sink's warning carries its name, and an unnamed one carries `"unnamed"`.
- **D-14:** A "failing" sink is written without `as`. `record`'s error is `never`, so a test fails a sink as a defect. Research checks whether a typed failure can leak without a cast, and pins one if it can.
- **D-15:** Warnings are counted with a test logger (`Logger.make` collecting entries), which reads the level and the annotations. No `console`.
- **D-16:** The base Stryker scores for `SinkEmit.ts`, `DecisionSinkForwarding.ts`, `DecisionLog.ts` and every other edited sink file are committed alone, first. No touched file's score may drop.

### Claude's Discretion
- The exact module layout of the report (inline in `sinkEmitter`, or a small package-private helper beside it), as long as `sink-read-once` holds.
- Annotation key names, as long as `qadi.cause` keeps its existing meaning.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sinkEmitter` (`SinkEmit.ts:49-55`): it reads the sink once (`Effect.serviceOption`) and returns `record => Effect.catchCause(sink.value.record(record), () => Effect.void)`.
- The warning shape the shipped sinks already use: `Effect.logWarning(msg).pipe(Effect.annotateLogs({ "qadi.cause": String(cause) }))` (`DecisionSinkForwarding.ts:98`, `:126`, `:188`; `DecisionLog.ts:174`).
- Port shapes carry `readonly name?: string | undefined` (`AttributeResolverShape`, `PortDescription.ts`).

### Established Patterns
- INV-QD-035: an observer must never deny. `catchCause` is used rather than `catchAll`, because the `never` error channel is subverted by `Effect.die` (BEH-QD-175).
- `sink-read-once` rule in `scripts/check-house-style.mjs` (ADR-QD-044, ADR-QD-100).
- `decisionSinkAll`'s member isolation is report-and-continue (JA-02).

### Integration Points
- `evaluate` and `discharge` both get their emitter from `sinkEmitter`.
- Sinks outside core: `packages/audit/src/AuditDecisionSinkLive.ts`, plus whatever research finds in devtools (`model/Source.ts`, `model/Wiring.ts`) and react.
- Spec: INV-QD-035 (restated to include the report), the decision-sink behaviours, `spec/overview.md` (gate 13, if a type export changes), and a changeset for `@qadi/core` (minor), plus one per package whose sink gains a name.

</code_context>

<specifics>
## Specific Ideas

- `decisionSinkAll`'s member warning does not name the member today. D-10 adds it, so a fan-out failure says which member failed.

</specifics>

<deferred>
## Deferred Ideas

- A `qadi_*` counter of contained sink failures (declined in D-01; a later phase may add it with its ADR-QD-123 metric-table row).

</deferred>
