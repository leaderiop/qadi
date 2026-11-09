# Phase 6: Dehydration in the engine - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning
**Ticket:** ARCH-51 · reserved ADR-QD-113 (or an amendment to ADR-QD-078) · reserved CCR-QD-390

<domain>
## Phase Boundary

`HydrationEngine` owns both directions of the seed payload. It gets `dehydrateWith(entries,
options)` mirroring `hydrateWith`, which owns the subject filter, the `ForeignSubject` drop
count, `droppedEntriesReporter`, `includeTrace` and the versioned envelope. `Hydration.ts`
becomes the thin public file ADR-QD-078 says it is.
</domain>

<decisions>
## Implementation Decisions

- **D-01:** Add `dehydrateWith` to `packages/react/src/HydrationEngine.ts`. Move into it, from
  `Hydration.ts` `dehydrateDecisions`: the subject filter, `countDropped("ForeignSubject")`,
  the call to `droppedEntriesReporter`, and the composition
  `dehydratedPayload(subjectId, kept.map((entry) => dehydrateEntry(entry, includeTrace)))`.
- **D-02:** `dehydrateEntry` and `dehydratedPayload` become module-private. The precondition
  "already filtered to one subject", which today is stated only in a doc comment, becomes
  structural.
- **D-03:** Delete `resolveMismatchReporter` (HydrationEngine.ts ~:448), the identity wrapper
  over `hydrationMismatchReporter`. Inline its callers.
- **D-04:** The public `dehydrateDecisions` signature and output are byte-for-byte unchanged.
  Pin this with a snapshot or equality test written BEFORE the refactor.
- **D-05:** Counts keep living in the default registry (ARCH-45 I8, CCR-QD-269, ADR-QD-052).
  Do not change which registry is written to.
- **D-06:** HYDRATION_* signals still go through `DeveloperSignals.ts` (the only file exempt
  from `no-ambient-console`).
- **D-07 (tests):** Add a round-trip test in `HydrationPayload.test.ts` (or a sibling)
  through the engine: dehydrate mixed-subject entries, then hydrate, asserting the kept entries,
  the ForeignSubject count and that the reporter was called once.
- **D-08:** Records: amend ADR-QD-078 with a dated amendment, or write ADR-QD-113 if the
  amendment would exceed a paragraph. Also add CCR-QD-390, the `spec/README.md` line,
  `spec/behaviors/19-hydration.md` rows, traceability, and `.changeset/dehydrate-in-engine.md`
  (patch for @qadi/react).
- **D-09:** If `dehydrateEntry`/`dehydratedPayload`/`resolveMismatchReporter` appear in
  `spec/overview.md` or a barrel, removing them is breaking: record it in the changeset, or keep
  them exported if `@qadi/devtools` imports them (grep first).

### Claude's Discretion
- The options object's exact field names.
</decisions>

<specifics>
## Specific Ideas

- The hydrate side (subject check, version, counts) is already entirely inside `hydrateWith`. Mirror its structure.
</specifics>

<canonical_refs>
## Canonical References

- `AGENTS.md` §13
- `spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md`, `078-a-seed-is-its-own-type-and-the-payload-is-versioned.md`, `106-a-decision-is-constructed-from-its-trace.md`
- `spec/behaviors/19-hydration.md`
- `packages/react/src/Hydration.ts`, `HydrationEngine.ts`, `HydrationCounts.ts`, `DeveloperSignals.ts`, `SeededDecision.ts`
- `packages/core/src/DecisionWire.ts` (used by HydrationEngine)
</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- `examples/nextjs-newsroom` exercises SSR dehydration through `pnpm example` (gate). It must stay green.
</code_context>

<deferred>
## Deferred Ideas

None.
</deferred>

---

*Phase: 06-dehydration-in-engine*
*Context gathered: 2026-11-08*
