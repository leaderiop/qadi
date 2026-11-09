# Phase 9: Sink record projection - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning
**Ticket:** ARCH-54 · reserved ADR-QD-115 (record projection) and ADR-QD-116 (refusal leaf), or a CCR-only justification · reserved CCR-QD-393

<domain>
## Phase Boundary

Two related locality fixes in `@qadi/core`:
1. Every sink record (failed, decided, obligation) is projected from its question in one module,
   `SinkEmit.ts`. `Qadi.ts`'s `discharge` stops building `ObligationRecord` inline.
2. The JSON encode-refusal vocabulary (`EncodeRefusal`, `OpaqueKind`, `WirePath`,
   `describeEncodeRefusal`) moves out of `SinkWire.ts` into a leaf beside `JsonHazard.ts`, so
   the port wire no longer depends on the sink wire's module.
</domain>

<decisions>
## Implementation Decisions

### Record projection (SINK-01)
- **D-01:** Add `obligationRecord(question, decision, at, outcome)` (name at discretion) to
  `SinkEmit.ts`, beside `failedRecord`/`decidedRecord` (:59-86). It uses the same
  `resourceIdOf` and conditional `action` projection.
- **D-02:** `Qadi.ts` (~:152) `discharge` calls it. ADR-QD-105 says an obligation is discharged
  against the question it answered, so the record must come from that same question value.
- **D-03 (test first):** Pin today's obligation record for a question with and without a
  resource id and an action, and assert equality before and after.

### Refusal vocabulary leaf (SINK-02, SINK-03)
- **D-04:** Create a leaf module (suggested `JsonRefusal.ts`, or fold into `JsonHazard.ts` if
  that keeps the leaf property) holding `EncodeRefusal`, `OpaqueKind`, `WirePath` and
  `describeEncodeRefusal`. `SinkWire.ts` keeps `WireVersion`, `DecodeRefusal` and
  `SinkRecordTag`, and re-exports the moved names only if they are public (check
  `spec/overview.md` and `packages/core/src/index.ts`). A public name must stay importable
  from `@qadi/core`'s root, with only its source module changing in `spec/overview.md`.
- **D-05:** Retarget the imports in `PortWireEncode.ts:23-24`, `AttributeResolver.ts:27`,
  `CustomPredicate.ts:32`, `EncodeRefusalReport.ts` and any other importer (grep
  `from "./SinkWire.ts"`). The ARCH-27 amendment (ADR-095/096) explains why SinkWire is a
  leaf, and the new module must be a leaf too: it imports only `effect/*` and other leaves.
  `pnpm circular` must stay green.
- **D-06:** `describeEncodeRefusal` wording is unchanged. ARCH-25 (CCR-QD-193) made it "described
  once", and the audit pipeline reports it.

### Records
- **D-07:** Use a CCR-only justification if neither change alters a documented contract.
  Otherwise write ADR-QD-115 (record projection, amending ADR-105) and/or ADR-QD-116 (refusal
  leaf, amending ADR-095/096/107). Also add CCR-QD-393, the `spec/README.md` line,
  traceability, and `.changeset/sink-record-projection.md`.

### Claude's Discretion
- Leaf module name; whether to merge the leaf into JsonHazard.ts.
</decisions>

<canonical_refs>
## Canonical References

- `spec/decisions/095-sinkcodec-owns-both-directions.md`, `096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md` (ARCH-27 amendment: SinkWire as a leaf), `100-a-question-is-asked-once.md`, `105-an-obligation-is-discharged-against-the-question-it-answered.md`, `107-*`
- `spec/README.md` CCR-QD-193 (ARCH-25), CCR-QD-194 (ARCH-27)
- `packages/core/src/SinkEmit.ts`, `Qadi.ts`, `SinkWire.ts`, `JsonHazard.ts`, `PortWireEncode.ts`, `EncodeRefusalReport.ts`, `AttributeResolver.ts`, `CustomPredicate.ts`, `index.ts`
</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- Phase 2 edits PortWire/PortWireEncode and the port modules, so rebase on Phase 2.
</code_context>

<deferred>
## Deferred Ideas

None.
</deferred>

---

*Phase: 09-sink-record-projection*
*Context gathered: 2026-11-08*
