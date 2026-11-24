# Phase 78: `TimelineStore` owns its capacity - Context

**Gathered:** 2026-11-24
**Status:** Ready for planning

<domain>
## Phase Boundary

`makeTimelineStore` captures its capacity once (`packages/devtools/src/model/TimelineStore.ts:43-47`). `emptyTimeline`
validates it and throws on anything that is not a non-negative integer (`Timeline.ts:76-87`). Because the store cannot
change its own bound, `makeTimelineFeed` (`TimelineFeed.ts:123-193`) works around it:
- a mutable `inner` store, rebuilt on every capacity change (`bounded`, `:95-96`);
- a mirror `view` ExternalStore that outlives each `inner` (`:129`), fed by a `push` listener (`:132-133`);
- a six-member forwarder that restates the whole `TimelineStore` interface (`:135-142`);
- a resize that drops the old `inner` without unsubscribing from it (`:178`);
- `inputs = next` assigned before `bounded(next.capacity)` can throw (`:175`, `:179`), so an invalid capacity leaves the
  feed half-applied: `inputs` names a capacity the store never took.

`idleTimeline` (`:106-113`) writes the six members a third time. `useTimelineStore` (`react/useTimeline.ts:90-91`)
captures a hand-fed store's capacity once more, in `useState`, so a host that changes `capacity` on that hook is
silently ignored.

After this phase:
- `TimelineStore` owns its capacity through a `resize` command.
- The feed returns its one store, and the forwarder, the mirror, the `push` listener and the orphaned subscription are
  gone.
- A rejected capacity changes nothing anywhere.
- The host's store keeps its identity across a capacity change.

ARCH-125. Package: `@qadi/devtools`, a **minor** changeset marked **Breaking** (D-09).

Records (reserved, use nothing else; `node scripts/next-id.mjs` is never run):
- ADR-QD-191;
- CCR-QD-470;
- BEH-QD-726–730;
- INV-QD-401–402.

An unused reserved id is named in the CCR row.

Requirements: TRSZ-01..04, plus the cross-cutting WX-01..07.

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE14-CONTEXT.md`)
- **D1–D4 (owner, 2026-11-23):**
  - all four phases, the small find folded into 80;
  - order 77 → 80, strictly serial;
  - branch `arch-wave-14`, with no merge and no release;
  - the research has run.
- **Standing instruction (owner, 2026-11-22):** "do not ask me, you are in the autonomous mode. always pick the most
  complete and clean solutions not the simplest." Every decision below was **decided autonomously, 2026-11-24, under
  that instruction**. Rejected options are recorded with each decision.
- **Keep (wave evidence):** `try { resize } finally { readSource }` (ADR-QD-177, Phase 64 WR-01) and the
  `reads.closed()` guard (Phase 60 WR-02). TF4, TF14, TF26, TF27 and TF29 pass **unedited**. ADR-QD-137 is kept.

### The command (TRSZ-01)
- **D-01: `resize(capacity: number): boolean` on `TimelineStore`.** It returns whether the timeline was resized.
  - It validates first, by building the new empty timeline through `emptyTimeline`, which is the one place the
    capacity rule is stated. An invalid capacity throws that error before any field of the store changes: the timeline,
    the freeze and the subscribers are untouched, and nothing is published.
  - The same **effective** capacity is a no-op. It returns `false` and publishes nothing. It neither empties the timeline
    nor releases the pause.
  - Otherwise it does four things:
    1. sets the timeline to the new empty one at the new bound;
    2. releases the pause, which is today's behaviour, because a rebuilt inner store is unpaused;
    3. publishes **once** with `publish`, not `set`, so a listener reading `isPaused` hears the release even when the
       snapshot reference would compare equal;
    4. returns `true`.
  - A listener's throw follows the existing `notify` contract (ADR-QD-177): it is rethrown after every listener ran.
  - Rejected:
    - `void` plus a separate effective-capacity comparison in the feed. That states "effective capacity" in two
      places, which is the duplication this phase removes.
    - Truncate-on-resize or keep-on-grow. These are out of scope, and listed in REQUIREMENTS "Future".
  - The boolean follows the `choose` precedent Phase 80 sets for a command that answers whether it acted.
- **D-02: the effective capacity is the timeline's own `capacity` field.**
  - The store compares the requested number with `timeline.capacity`. The feed maps an omitted capacity to
    `DEFAULT_TIMELINE_CAPACITY` before calling `resize`.
  - So `configure({ capacity: undefined })` after `configure({ capacity: DEFAULT_TIMELINE_CAPACITY })` is a no-op. Today
    it rebuilds, empties and re-reads.
  - This is a **behaviour change**. A characterisation test written on the phase base pins today's behaviour first,
    then it is changed and the test is updated in the same commit as the source, with the reason. TF4/TF14/TF26/TF27/
    TF29 must not be the test that changes. If one of them pins this exact case, stop and record it rather than editing
    it.
- **D-03: `accept` at capacity 0 publishes nothing.** Today `ingest` returns a fresh `bound({...})` object on every
  record, so a zero-capacity store calls `view.set` on every record. That is a render per record with nothing visible.
  - Fix it at the root: `ingest` (or `bound`) returns `self` when the bounded result keeps nothing and `self` already
    keeps nothing. Then the existing `next === timeline` guard in `accept` is the one place a non-change stops costing a
    render.
  - Write a characterisation test on the phase base first (RED: a listener is called per record at capacity 0), then
    GREEN.
  - Rejected: a `capacity === 0` special case in `accept`. It would state the rule outside `Timeline.ts`.
- **D-04: resize while paused.** It releases the pause and shows the emptied live timeline (D-01 step 2). Pin it with a
  plain store test, along with:
  - a resize to the same capacity while paused, which stays paused and publishes nothing;
  - an invalid resize while paused, which stays paused, keeps the frozen view and publishes nothing.

### The feed (TRSZ-02, TRSZ-03)
- **D-05: `makeTimelineFeed` returns its one store.**
  - Delete `bounded`'s per-change use, the `inner` variable, the mirror `view`, `push` and the six-member forwarder.
  - The feed builds one store with `makeTimelineStore({ capacity: inputs.capacity ?? DEFAULT_TIMELINE_CAPACITY })`, and
    `timeline` **is** that store. `readSource`'s `marking` keeps writing through `timeline.accept`.
- **D-06: `configure`'s order makes a rejected capacity change nothing.**
  - The closed guard comes first, as today.
  - Then the requested capacity is validated before `inputs` is assigned. The clean shape is to call `timeline.resize`
    **before** `inputs = next`, inside the structure that keeps ADR-QD-177's rethrow.
    - If `resize` throws during validation, nothing has changed: not `inputs`, not the store, not the read.
    - If `resize` changed the timeline and a listener threw during its publish, the feed still assigns `inputs = next`
      and starts the read in `finally` (`try { resize } finally { readSource }`, kept), then the throw propagates.
  - The planner writes the exact control flow. Required semantics:
    1. invalid capacity: no change at all (TRSZ-03);
    2. resized: one publish of the emptied timeline, then a new read of `next.source`;
    3. not resized, source changed: a new read only;
    4. neither changed: nothing.
  - TF26, TF27 and TF29 pin how the listener throws interleave, and pass unedited.
  - New tests pin these:
    - an invalid `configure` leaves `inputs`, the snapshot and the read untouched, and a later valid `configure`
      compares against the **old** inputs;
    - the host's store is the same object before and after a capacity change (identity, TRSZ-03).
- **D-07: `idleTimeline` gains `resize`.** It does nothing and returns `false`. It stays inert, never paused, and is
  never fed.

### The second captured-once site
- **D-08: `useTimelineStore` follows its `capacity` option.**
  - The hook keeps one store for its lifetime, as today, and calls `store.resize(options.capacity ?? DEFAULT)` when the
    capacity changes. It runs this from an effect, the hook's existing pattern for a command, and never during render.
  - Characterise first on the base: today a capacity change on `useTimelineStore` is ignored and the store keeps the old
    bound. Then make the change.
  - BEH-QD-519's hand-fed-store reading (`Reading`, inert `restart`) is unchanged.
  - Rejected: leaving it. It is the same captured-once defect, in the same package, with the same one-line fix once the
    command exists. Leaving it would keep a second store whose capacity silently does not follow its input.

### Records (TRSZ-04)
- **D-09: Breaking `@qadi/devtools` minor changeset.**
  - `TimelineStore` is a public interface. A host that implements it, as a test double or wrapper does, must add
    `resize`, so this is a compile break for implementers.
  - Callers gain a member, and see the D-02 and D-03 behaviour changes.
  - The changeset is marked **Breaking**, with a `0.13` upgrade-guide row.
  - `spec/overview.md` updates the `TimelineStore` row (`:874`) and the `useTimeline`/`useTimelineStore` row (`:927`).
- **D-10: ADR-QD-191 records the command.**
  - It covers: `resize`'s contract, the effective-capacity rule, validate-before-mutate, the pause release, one
    publish, the boolean, the capacity-0 no-publish, the feed's one store and `useTimelineStore` following its option.
  - Add a dated amendment to ADR-QD-137 that points to it. ADR-QD-137 is kept.
  - Rejected: amending ADR-QD-137 alone. A new public command with its own contract is a decision in its own right.
- **D-11: spec records.**
  - BEH rows for the command, the feed's one store, a rejected configure, capacity 0, and the hook following its
    option.
  - INV rows for "a rejected capacity changes nothing" and "the host's store is one object for the feed's life".
  - Traceability and the CCR-QD-470 row, naming every document with its revision.
  - Use `scripts/spec-revise.mjs` for revision lines.

### Claude's Discretion
- How the work splits into plans and waves. A natural cut:
  1. mutation baselines plus the base-side characterisation and RED files (D-02, D-03, D-08, and the half-applied
     configure);
  2. the store command, the feed rewrite, `idleTimeline`, `useTimelineStore` and test churn, as one compile-green
     change;
  3. records and prose.
- Test file names and placement. The store's own rules go in `TimelineStore.test.ts`, without a scope or a source
  (TRSZ-01).
- Whether D-03's root fix sits in `ingest` or in `bound`, whichever keeps one statement of the rule.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/devtools/src/model/ExternalStore.ts`: `makeExternalStore` with `set` (identity-skipping) and `publish`
  (always notifies), and the `notify` rethrow contract (ADR-QD-177).
- `packages/devtools/src/model/Timeline.ts:76-87`: `emptyTimeline`, the one statement of the capacity rule.
- `packages/devtools/src/model/SupersedingRun` (`makeSupersedingRun`): `begin`/`isCurrent`/`fork`/`closed`, kept as
  is.
- `.planning/milestones/v1.8-phases/QD-72-*/` and `QD-76-*`: a phase-local mutation scorer (`dirtyReasons`, `hunks`),
  copied and adapted as `78-mutation.mjs`, the same way 77 did.

### Established Patterns
- A store command is synchronous and notifies once. A command on a closed feed is a no-op.
- `idle…` stand-ins are inert and never fed.
- Tests for the model are plain calls without React. The hook tests use the package's existing render helpers.

### Integration Points
- `packages/devtools/src/model`: `TimelineStore.ts` (the command), `Timeline.ts` (D-03), `TimelineFeed.ts` (D-05,
  D-06, D-07).
  - `DockModel.ts` holds `timeline: TimelineStore`, and a type-only change reaches it.
  - `SimulationSession.ts`, `DiagnosticsStore.ts` and `ExternalStore.ts` only mention the store in comments.
- `packages/devtools/src/react/useTimeline.ts` (D-08).
- Tests:
  - `packages/devtools/test/model/TimelineStore.test.ts`, `TimelineFeed.test.ts` (TF4/14/26/27/29 unedited), and
    `Timeline.test.ts`;
  - the `useTimeline` hook tests;
  - any test double implementing `TimelineStore`: grep `TimelineStore` across `packages/*/test` and `examples/`.
- Gate 14 (`scripts/check-package-install.mjs`) probes every `make*Feed`. `makeTimelineFeed`'s signature does not
  change here (Phase 79 changes it), but the packed consumer must still compile against the widened `TimelineStore`.
- Gate 13 (`spec/overview.md`): row text only. No export is added or removed.

</code_context>

<specifics>
## Specific Ideas

- Commit every characterisation and RED test on the phase base, and record each one's output in `78-RED-EVIDENCE.md`
  before any source edit:
  - D-02 undefined-vs-default;
  - D-03 capacity-0 render per record;
  - D-08 hook ignores capacity;
  - D-06 half-applied `inputs` after an invalid capacity.
- Show each new check failing once after the change. Use static guts, such as `resize` not validating first or the
  no-op branch removed.

</specifics>

<deferred>
## Deferred Ideas

- Truncate-on-resize or grow-keeps-entries (REQUIREMENTS "Future").
- `configure` as the only input path for the feed's constructor is Phase 79 (CONF-02). This phase leaves
  `makeTimelineFeed(init?)`'s signature alone.

</deferred>

## Workflow note (decided autonomously, 2026-11-24)

The planner must run `check ui-plan-gate 78` if it answers `frontend: true`. This phase does touch a React hook
(`useTimeline.ts`), but it changes no rendered markup, styling or layout. So the UI-SPEC hook is skipped unless the gate
names a real visual surface.
