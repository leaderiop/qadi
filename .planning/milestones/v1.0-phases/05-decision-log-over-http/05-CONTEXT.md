# Phase 5: Decision log over HTTP - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning
**Ticket:** ARCH-50 · reserved ADR-QD-112 (use only if a decision is made) · reserved CCR-QD-389

<domain>
## Phase Boundary

The HTTP side of the decision log has one internal module. It encodes a decision-log read
into records, either as SSE frames (DecisionStreamRoute) or as a JSON array
(DecisionBacklogRoute), and owns refusal reporting: a record that fails to encode drops only
its own frame, and `onRefused` is told. SinkCodec is unchanged (ADR-QD-095/097).
</domain>

<decisions>
## Implementation Decisions

- **D-01:** Create an internal module in `packages/http/src/` (suggested `DecisionLogHttp.ts`)
  holding the options type that today lives in DecisionStreamRoute as `DecisionStreamOptions`
  (at least `onRefused`), one `reportRefused` (message and span name as parameters, or one
  wording that covers both), and one encode-or-report function per framing, built on
  `encodeStoredRecordString` (SSE) and `encodeStoredRecord` (JSON).
- **D-02:** DecisionStreamRoute keeps the SSE framing (`frame`), the stream recheck (now
  through the Phase 1 enforcement module) and `decisionFrames`. DecisionBacklogRoute keeps its
  route and pagination. Neither restates refusal logic.
- **D-03:** DecisionBacklogRoute must not import from DecisionStreamRoute.
- **D-04:** If `DecisionStreamOptions` is a public export, keep the name exported (re-export or
  type alias), so the change is non-breaking. Check `spec/overview.md` and update gate 13 if
  its source module changes.
- **D-05:** A throwing `onRefused` stays contained (ARCH-25, CCR-QD-193). Pin it in the shared
  test.
- **D-06 (tests):** Add one table-driven refusal test over {SSE, JSON} × {all encodable, one
  refused in the middle, `onRefused` throws}. Keep the existing route-level tests for the
  framing format.
- **D-07:** Records: add CCR-QD-389, the `spec/README.md` line, rows in
  `spec/behaviors/23-http.md` (or the decision-stream behaviour doc), traceability, and
  `.changeset/decision-log-http.md` (patch). Write ADR-QD-112 only if the refusal policy's
  documented owner changes.

### Claude's Discretion
- Module name, and whether `frame` moves into the shared module.
</decisions>

<specifics>
## Specific Ideas

- The two `reportRefused` copies differ only in the message string and the span name.
- ARCH-28 (CCR-QD-195) put the decision stream's event names and `synced` payload in core. Reuse that vocabulary.
</specifics>

<canonical_refs>
## Canonical References

- `spec/decisions/046-*` (transport: buffering feed and guarded SSE route), `095-sinkcodec-owns-both-directions.md`, `096-*`, `097-a-decision-log-is-a-sink-and-its-own-history.md`
- `spec/README.md` CCR-QD-193 (ARCH-25), CCR-QD-195 (ARCH-28)
- `packages/http/src/DecisionStreamRoute.ts`, `DecisionBacklogRoute.ts`, `index.ts`
- `packages/core/src/SinkCodec.ts` (`encodeStoredRecord`, `encodeStoredRecordString`)
</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- After Phase 1, `recheck` goes through the enforcement module, so rebase on Phase 1's result.
</code_context>

<deferred>
## Deferred Ideas

None.
</deferred>

---

*Phase: 05-decision-log-over-http*
*Context gathered: 2026-11-08*
