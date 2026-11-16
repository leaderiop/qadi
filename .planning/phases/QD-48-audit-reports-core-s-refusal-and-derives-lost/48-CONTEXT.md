# Phase 48: Audit reports core's refusal and derives "lost" - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit reports the same refusal type that core, forwarding and http use, and whether a staged write was lost is decided in one place, so the span attribute and the metric/log label cannot disagree (ARCH-95, `@qadi/audit`; AREF-01..04, WX-01..07).

In scope:
- Delete `AuditEntryNotEncodable` (`packages/audit/src/AuditEntry.ts`). `onRefused`, `AuditWriteEmitOptions.onRefused`, `AuditWriteOutcome.Refused.refusal` and `encodeAuditEntry`'s error become core's `SinkRecordNotEncodable`.
- One closed per-variant row for `UnwrittenStaging`, read by both `durabilityOf` (`AuditWriteOutcome.ts`) and the lost label (`AuditWriteReport.ts`).
- `writtenStaging` (`AuditDecisionSinkLive.ts`) and the two `_tag === "Refused"` branches in `AuditWriteReport.ts` become exhaustive matches.

Out of scope:
- changing any log line, span attribute, metric id or label;
- core's `reportEncodeRefusal` and its annotations (forwarding and http keep their lines);
- the circuit breaker (Phase 45's);
- the gap marker ADR-QD-056 leaves to callers.

Shared wave rules: `.planning/phases/_WAVE10-CONTEXT.md`. Reserved ids: ARCH-95, ADR-QD-161, CCR-QD-439, BEH-QD-576..580, INV-QD-341..342.

</domain>

<decisions>
## Implementation Decisions

### The refusal type (AREF-01)
- **D-01:** `AuditEntryNotEncodable` is deleted with no alias. `AuditDecisionSinkLive`'s `onRefused`, `AuditWriteEmitOptions.onRefused` and `AuditWriteOutcome.Refused.refusal` take core's `SinkRecordNotEncodable` (`packages/core/src/Errors.ts:381`), the type `decisionSinkForwarding` and `@qadi/http`'s `DecisionLogHttp` already use.
- **D-02:** `encodeAuditEntry` fails with core's `SinkRecordNotEncodable` exactly as `encodeSinkRecord` returns it. The `mapError` goes. This is Breaking for a caller's `catchTag("AuditEntryNotEncodable")`.
- **D-03:** The `reason` field goes away. The default refusal warning stays byte-identical: it never carried the reason, because core's `reportEncodeRefusal` annotates `qadi.refusal`, `qadi.path` and `evaluationId`. A hook that wants the sentence calls `describeEncodeRefusal(e.refusal)`. Success criterion 1's "logged reason ... computed at the one place a line is written" is read this way: the one place the sentence is computed is core's `describeEncodeRefusal`, and audit's one line is written by `reportEncodeRefusal`. No `qadi.reason` annotation is added to core, because that would change the forwarding and http lines (criterion 4).
- **D-04:**
  - ADR-QD-161 records the decision. The class's ADR-QD-054 citation ("core has no reason to know this error exists") was a misreading: ADR-054 concerns compile-only dialect packages, and core already declares the error.
  - ADR-QD-056 is checked and unaffected: core's `DecisionSink` is the seam.
  - `JsonRefusal.ts`'s doc comment, which names the class, is updated.

### "Lost" decided once (AREF-02)
- **D-05:**
  - One closed row per `UnwrittenStaging` variant, typed so that durability and the lost label cannot disagree: `{ durability: "StagingOnly" } | { durability: "Lost"; lost: "not_wired" | "failed" }`.
  - `durabilityOf` and the lost label (`lostLabel`) both read it.
  - `unwrittenDurability` and `lostStaging` are deleted, so only one exhaustive mapping remains.
- **D-06:** A table test over all 11 outcome leaves (Refused; Written × NotWired/StageFailed/Committed/CommitFailed; WriteFailed × NotWired/Staged/StageFailed; Skipped × NotWired/Staged/StageFailed) pins that `durabilityOf(o) === "Lost"` ⇔ a lost counter is incremented ⇔ the line is a warning ⇔ span `qadi.audit.durability` is `"Lost"`.
- **D-07:** Metric ids, labels and the `LOST_COUNTERS` keys are unchanged (ADR-QD-123; the `[metric-table]` rows are untouched).
- **D-08:** The public `Durability` type is unchanged.

### Exhaustive branches (AREF-03)
- **D-09:**
  - `StageResult` (`AuditDecisionSinkLive.ts`) becomes a closed tagged union in which only `Staged` carries `commit`.
  - `writtenStaging` is an exhaustive match: NotWired → `WrittenStaging.NotWired`, StageFailed → `WrittenStaging.StageFailed`, Staged → commit, then Committed/CommitFailed.
  - The `_tag` ternary and the `commit === undefined` check both go.
  - Hoisted to module scope where it closes over no per-call state (§5a).
- **D-10:** `evaluationIdOf` and `emitWriteOutcome`'s `if (outcome._tag === "Refused")` in `AuditWriteReport.ts` also become exhaustive matches, because they are the same defect class in the same file.

### Evidence and records
- **D-11:** Committed first, before any `packages/*/src` edit:
  - Characterisation on the phase base of all 11 leaves through `AuditDecisionSinkLive`: each log line's level, message and annotations; the span attributes `qadi.audit.outcome` and `qadi.audit.durability`; the metric deltas; the default refusal warning; and the `onRefused` payload's fields.
  - A tstyche pin that `onRefused`'s parameter is `SinkRecordNotEncodable`. It is RED on the base.
- **D-12:** The mutation base is measured on the base for `AuditEntry.ts`, `AuditWriteOutcome.ts`, `AuditWriteReport.ts` and `AuditDecisionSinkLive.ts`, and committed alone. No touched file's score may drop.
- **D-13:**
  - The `@qadi/audit` changeset is minor and marked **Breaking** (the 0.x convention of Phases 43–45).
  - The 0.13 entry in `upgrading.md` gives the rename (`AuditEntryNotEncodable` → `SinkRecordNotEncodable`), the replacement for `reason` (`describeEncodeRefusal(e.refusal)`) and the new `catchTag` tag.
- **D-14:** Docs updated:
  - `spec/behaviors/33-audit-pipeline.md`;
  - `spec/overview.md` (gate 13: the export is gone);
  - the audit README;
  - the website's `docs/packages/audit/capabilities.md`;
  - ADR-QD-056's revision note;
  - ADR-QD-095 wherever it names the class.

  Change history (CHANGELOGs, old CCR rows) is not rewritten.

### Claude's Discretion
- The row table's name and file (it should sit beside `UnwrittenStaging` in `AuditWriteOutcome.ts`, so `AuditWriteReport.ts` imports it).
- The characterisation harness, reusing the log/span capture helpers already in `packages/audit/test`.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/SinkCodec.ts:388`: `encodeSinkRecord` already returns `Result<SinkRecordJson, SinkRecordNotEncodable>`.
- `packages/core/src/EncodeRefusalReport.ts`: `reportEncodeRefusal<R extends { refusal; evaluationId }>`, generic over the refusal, so it takes `SinkRecordNotEncodable` with no change.
- `packages/core/src/JsonRefusal.ts:143`: `describeEncodeRefusal`. At :123, `encodeRefusalAnnotations`.

### Established Patterns
- Hoisted `Match.type<…>().pipe(Match.tagsExhaustive(…))`, as already used throughout `AuditWriteReport.ts`/`AuditWriteOutcome.ts`.
- A literal-typing helper for match arms (`durability(d)`, `lostWord(w)`).

### Integration Points
- `AuditDecisionSinkLive.ts:90` (`onRefused` option), `:143` (emit options), `:176-204` (`stageEntry`/`writtenStaging`), `:239-247` (record, span attributes).
- `AuditWriteReport.ts:115-127` (`lostStaging`/`lostLabel`), `:208-246` (emit options, `evaluationIdOf`, the Refused branch).
- `AuditWriteOutcome.ts:79` (Refused carries the refusal), `:101-123` (durability).
- Tests naming the class: `packages/audit/test/AuditDecisionSinkLive.test.ts`, `AuditWriteOutcome.test.ts`, `AuditEntry.test.ts`.

</code_context>

<specifics>
## Specific Ideas

The log, span and metric output must not move for any existing input. The only observable changes are the type and tag of the refusal value and the absence of `reason`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
