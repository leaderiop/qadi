# Phase 20: DecisionCache's shared computation, and closing #64 - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-68 · review candidate #9 (Speculative; only worth doing together with fixing #64)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`

<domain>
## Phase Boundary

The single-flight protocol inside `@qadi/core`'s `DecisionCache` becomes an internal module with its own seam:
- every waiter is settled;
- the shared computation is interrupted only when nobody is left waiting;
- it is keyed generically.

That module is tested with plain keys and latched effects, without a real walk. On that seam the issue-#64
follow-up gap is pinned and closed. `DecisionCache` keeps its three-method interface (`getOrCompute`, `size`,
`clear`) on top. Generation counting and FIFO eviction stay in the cache.
</domain>

<evidence>
## Evidence (verified by reading at 1721a42)
- `packages/core/src/DecisionCache.ts:350-557` — one closure holds four concerns: single-flight with last-leaver
  interrupt; the generation counter for `clear`; FIFO capacity eviction; the metric.
- The #64 follow-up gap is documented as open at `DecisionCache.ts:326-348`: a fresh joiner can receive an interrupt
  meant for an abandoned compute while that compute is parked in a port's uninterruptible region. The only way to
  test it today is through `Question` and `Trace` with a real walk. ARCH-45 (`.planning/milestones/archive-pre-gsd/architecture/ARCH-45-loose-ends.md:~410`)
  left it out of scope.
- One adapter, so the seam is hypothetical. It is justified only by the #64 test it makes possible.
</evidence>

<decisions>
## Implementation Decisions
- **D-01 (test first):** first reproduce the #64 gap as a RED test. If it can be reproduced through the current
  interface with a latched port (`scriptedPort` with a latch, or `Effect.uninterruptible` + `Latch`), do that before
  extracting anything. If it **cannot** be reproduced at all, the phase stops after a written finding and the
  extraction is dropped (`checkpoint:decision` with the evidence). Don't build a seam for a bug that can't be shown.
- **D-02:** if reproduced, extract the shared-computation module (package-private, not in the barrel), test the regime
  with plain keys, then fix #64 in it. The cache's public behaviour and interface are unchanged apart from the fix.
- **D-03:** keep ADR-QD-031 (cache absent by default) and INV-QD-025. Keep the cache's existing tests green
  unchanged, since they are the proof that the interface held. Add a `pnpm bench` row if the hot path is touched.
  UNTRACED_BUDGET is unchanged: use no `Effect.fnUntraced` without a benchmark (AGENTS.md §5).
- **D-04:** Records: CCR; BEH or INV for the "interrupted only when nobody waits; every waiter settles" regime if not
  already stated (the planner greps `spec/`); changeset (`@qadi/core` patch).

### Claude's Discretion
- Module name and whether the generation counter moves with it.
</decisions>

<canonical_refs>
## Canonical References
- `packages/core/src/DecisionCache.ts`, `Question.ts`, `PortDoubles.ts`; `packages/core/test/DecisionCache*.test.ts`
- ADR-QD-031; INV-QD-025; issue #64 (`gh issue view 64` if accessible); `.planning/milestones/archive-pre-gsd/architecture/ARCH-45-loose-ends.md`
</canonical_refs>

<deferred>
## Deferred Ideas
None.
</deferred>

---
*Phase: 20-decision-cache-shared-computation · Context gathered: 2026-11-10*
