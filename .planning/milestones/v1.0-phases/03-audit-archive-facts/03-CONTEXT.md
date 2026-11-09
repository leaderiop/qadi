# Phase 3: Audit archive facts - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning
**Ticket:** ARCH-48 · reserved ADR-QD-110 · reserved CCR-QD-387

<domain>
## Phase Boundary

The audit archive's invariants are stated once, in one module that computes the "archive
facts" of a list of entries. The facts are: the ordered entries (sequenced first by
`sequenceNumber`, then unsequenced in arrival order), `sequenceIntegrityVerified` (true exactly
when sequencedCount ≥ 2), and the first sequence break (gap or duplicate), if any.
`archiveAuditTrail` (writer) builds its bundle from these facts. `readAuditArchive` (reader)
recomputes them and compares them with the bundle's claims.
</domain>

<decisions>
## Implementation Decisions

- **D-01:** Create one module in `packages/audit/src/` (suggested name `ArchiveFacts.ts`) with a
  pure `archiveFacts(entries)` function and any Effect wrapper the writer needs. The writer
  currently fails through `verifySequenceIntegrity`'s typed error. Keep that error class and
  its `_tag` unchanged.
- **D-02:** Fold `SequenceIntegrity.ts` (45 lines) and `SequenceBreak.ts` (38 lines) into the new
  module. If either exports a name that is public in `packages/audit/src/index.ts`, keep the
  name working (re-export from the new module) and check `spec/overview.md`. Remove a file only
  when nothing public depends on it.
- **D-03:** The ordering rule is stated once. The writer currently uses
  `(a.sequenceNumber ?? Number.POSITIVE_INFINITY) - (b.sequenceNumber ?? Number.POSITIVE_INFINITY)`
  (AuditArchive.ts:118), and the reader uses a separate `firstOutOfOrder` loop (~:280-310).
  The reader's out-of-order check must derive from the same ordering the writer uses. The
  ordering is stable for unsequenced entries, matching ARCH-29's pinned archive order
  (CCR-QD-185).
- **D-04:** The claim rule `sequencedCount >= 2` (AuditArchive.ts:121/:128 and :326-327) is
  stated once.
- **D-05:** The refusal vocabulary (`ArchiveRefusal`: `OutOfOrder`, `SequenceBreak`,
  `UnbackedClaim`, and any others) and its payloads stay unchanged. ARCH-38 (purge needs a
  verified archive, CCR-QD-230) depends on them.
- **D-06 (tests first):** Before refactoring, add a property test (fast-check if it is already
  a devDependency; check `package.json`. Otherwise use an enumerated generator) asserting that
  the reader accepts everything the writer writes. Add explicit tampering cases per refusal
  kind. Both must pass before and after the refactor.
- **D-07:** Records: ADR-QD-110 ("An archive's facts are computed once") if the change alters
  where a documented rule lives (it does: ADR/BEH text names `verifySequenceIntegrity`).
  Otherwise use a CCR-only justification. Also add CCR-QD-387, the `spec/README.md` line,
  audit behaviour doc rows, traceability, and `.changeset/archive-facts.md`
  (patch for @qadi/audit).

### Claude's Discretion
- Module and function names, and whether the facts object exposes `sequencedCount`.
</decisions>

<specifics>
## Specific Ideas

Verified on 2026-11-08: AuditArchive.ts imports `firstSequenceBreak` (:22) and
`verifySequenceIntegrity` (:23). The writer calls `verifySequenceIntegrity(entries)` (:115),
the reader calls `firstSequenceBreak(entries)` (:318), and both compute `sequencedCount`.
</specifics>

<canonical_refs>
## Canonical References

- `AGENTS.md` §4 (errors), §5 (Effect.fn), §10 (tests)
- `spec/decisions/` — ADRs for the audit archive and purge (grep "archive" in `spec/decisions/index.yaml`)
- `spec/README.md` CCR-QD-185 (ARCH-29 archive order pinned), CCR-QD-230 (ARCH-38 purge needs verified archive)
- `packages/audit/src/AuditArchive.ts`, `SequenceIntegrity.ts`, `SequenceBreak.ts`, `Retention.ts`, `index.ts`
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `firstSequenceBreak` (pure) and `verifySequenceIntegrity` (Effect).

### Integration Points
- `Retention.ts`/purge planning reads a verified archive, so keep its interface unchanged.
- `AuditDecisionSinkLive.ts` may call `verifySequenceIntegrity`. Grep for every caller.
</code_context>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase scope.
</deferred>

---

*Phase: 03-audit-archive-facts*
*Context gathered: 2026-11-08*
