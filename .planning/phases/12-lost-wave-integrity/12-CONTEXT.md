# Phase 12: Lost-wave integrity defects — decision stream order and hydration outcome - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-60 (ports lost ARCH-54 `6c67e44` and lost ARCH-53 `f27d049`)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, `.planning/phases/_SALVAGE.md`

<domain>
## Phase Boundary

1. **Decision stream order** (lost ARCH-54). The decision stream's protocol order has one owner in core
   (`DecisionStream.ts` encode/decode). SSE bytes stay in `@qadi/http` and `EventSource` stays in `@qadi/devtools`.
   A reconnect during the backlog, or after it, never loses or skips a record: the resume cursor and the send
   order agree.
2. **Hydration outcome** (lost ARCH-53). A hydration outcome is one closed `HydrationEvent`, projected once to the
   counter and to the reporter.
   - `dehydrateDecisions` never throws on a policy the public constructors accept: an unencodable entry is
     dropped and counted.
   - A host reporter (`onDropped`, `onHydrationMismatch`) that throws cannot change the outcome.
   - A refused payload is counted at least once (INV-QD-045), including a zero-entry subject mismatch.
</domain>

<evidence>
## Evidence (probes reproduced on 1721a42)
- Stream: `packages/core/src/DecisionLog.ts:215` sorts the backlog by `storedRecordOrder` (`at`), but `:326`
  resumes on `seq > resumeAfter`. Ingest `finished-first` (at=2, seq 1), then `started-first` (at=1, seq 2): the
  backlog is sent as `[started-first@0.2, finished-first@0.1]`, and `readEntries(cursor 0.2)` → `[]`, so
  `finished-first` is lost. Overlapping evaluations and Edge ingests trigger it. An existing http test asserts the
  defective order (lost plan §1 names it).
- Hydration: `packages/react/src/HydrationEngine.ts:155` uses `encodeSync`. `gte(-Infinity)`, `gte(NaN)` and
  `hasRelationship(…,{depth:1.5})` each throw `SchemaError` with dehydratedDelta 0 and foreignDelta 1. A throwing
  `onDropped` makes hydrate throw ("host boom", seededDelta 0) and makes dehydrate throw. `onHydrationMismatch` is
  called unguarded (`:652`). A zero-entry `PayloadSubjectMismatch` (`:465`) counts 0.
- Merged wave 5 already moved things these ports must sit on top of:
  - ARCH-50 `DecisionLogHttp.ts`: one encoder and refusal policy for stream and backlog; the backlog route no longer
    imports the stream route.
  - ARCH-51 `dehydrateWith` beside `hydrateWith` in `HydrationEngine`; `resolveMismatchReporter` deleted.
  - ARCH-54 `SinkEmit.ts` record projections and the `JsonRefusal.ts` leaf.
- Reference implementations: `git show 6c67e44` (31 files, new `core/src/DecisionStream.ts`, `devtools/model/Source.ts`
  −158) and `git show f27d049` (37 files, new `react/src/HydrationEvent.ts`, `HydrationCounts.ts` deleted).
  The lost plans `ARCH-54-*.md` (D-54-a…f) and `ARCH-53-*.md` (D-53-a…g) hold the decisions.
</evidence>

<decisions>
## Implementation Decisions
- **D-01 (test first):** each probe becomes a RED repo test before porting:
  - stream: the backlog-then-reconnect cursor case, plus the after-backlog reconnect variant (P2 in the lost plan);
  - dehydrate on the three policies;
  - throwing `onDropped` on hydrate and on dehydrate;
  - throwing `onHydrationMismatch`;
  - the zero-entry mismatch counter.
  Invert any existing test that asserts the defective order.
- **D-02:** same rule as Phase 11. Take each lost plan's recommended option unless main changed the premise. Moved
  one-way premises go to one `checkpoint:decision` per plan, asking once. Specifically re-decide the stream cursor
  format (D-54-c), because a cursor format change is visible on the wire to any `EventSource` client holding a
  `Last-Event-ID`.
- **D-03:** **port onto the merged modules.** The stream port keeps `DecisionLogHttp.ts` as the http-side encoder
  and moves only order and cursor ownership to core. The hydration port builds `HydrationEvent` inside the
  merged `HydrationEngine` (`hydrateWith`/`dehydrateWith`), not beside it.
- **D-04:** `DECISION_READ_BUDGET` (AGENTS.md §13) and the `DeveloperSignals.ts` console exemption are unchanged
  unless the port moves a budgeted read. If it does, update the budget and the AGENTS.md table in the same task.
- **D-05:** threat model: data loss in an audit-adjacent stream (repudiation/integrity); SSR crash (DoS) from a policy
  shape. Disposition `mitigate`.
- **D-06:** numbering from the Phase 12 reservations. Rewrite the lost ids in every ported line. Changesets:
  `@qadi/core` minor (new `DecisionStream` export if kept), `@qadi/http` patch or minor, `@qadi/devtools` patch,
  `@qadi/react` patch or minor. Any removed export is Breaking, with an upgrading.md entry.
- **D-07:** two parallel plans in wave 1, then a records/finalize plan in wave 2.
</decisions>

<canonical_refs>
## Canonical References
- `git show 6c67e44`, `git show f27d049`; `.planning/milestones/archive-pre-gsd/architecture/ARCH-54-decision-stream-order.md`, `ARCH-53-hydration-event.md`
- `packages/core/src/DecisionLog.ts`, `SseFrame*.ts`; `packages/http/src/DecisionStreamRoute.ts`, `DecisionBacklogRoute.ts`, `DecisionLogHttp.ts`; `packages/devtools/src/model/Source.ts`
- `packages/react/src/HydrationEngine.ts`, `Hydration.ts`, `HydrationCounts.ts`, `DeveloperSignals.ts`; `packages/core/src/HydrationMetrics.ts`
- `.planning/milestones/v1.0-phases/05-decision-log-over-http/`, `06-dehydration-in-engine/`
- INV-QD-045, INV-QD-022, BEH-QD-146; ADR-QD-078
</canonical_refs>

<deferred>
## Deferred Ideas
None.
</deferred>

---
*Phase: 12-lost-wave-integrity · Context gathered: 2026-11-10*
