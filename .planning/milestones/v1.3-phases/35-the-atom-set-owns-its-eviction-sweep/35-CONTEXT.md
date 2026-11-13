# Phase 35: The atom set owns its eviction sweep - Context

**Gathered:** 2026-11-12
**Status:** Ready for planning

<domain>
## Phase Boundary

`maxTrackedQuestions` (`QadiAtoms.ts`) bounds an atom set's question book (`QuestionBook.ts`). Today nothing in the atom set enforces that bound. `QadiProvider.tsx` forks `Effect.repeat(atoms.sweepEvictions, Schedule.spaced(sweepIntervalMillis))` from a React effect, so the bound has three gaps:

- With no provider (a bare `AtomRegistry`, a test, a non-React host), nothing sweeps and the bound never holds.
- With several providers, each one forks its own redundant sweeper.
- After the provider unmounts, the book stays over the bound. `QadiProvider.test.tsx` pins this ("stays over the bound after unmount").

This phase either moves enforcement into the atom set, through a mechanism that passes every SWEEP-02 criterion, or keeps the sweep in the provider and states and tests that rule. It opens with a mandatory spike, because the mechanism is unproven, and only the e2e catches a dropped render (CCR-QD-150).

Requirements: SWEEP-01..05 and WX-01..07. Records: ARCH-83; ADR-QD-148 (written only if a mechanism lands, otherwise named Unused in the CCR row); CCR-QD-426; BEH-QD-511..515; INV-QD-315..316; a changeset for `@qadi/react`.

</domain>

<decisions>
## Implementation Decisions

The user's standing direction: "the most clean solution, the most complete, not the simplest. We don't care about complexity." The user chose each grey area below explicitly on 2026-11-12.

### The spike (SWEEP-01, SWEEP-02)
- **D-01 All three candidates are measured; the cleanest passing one is chosen.** The spike does not stop at the first pass. It runs each candidate against every SWEEP-02 criterion (D-04) and records the evidence, then chooses. The candidates, in research order:
  1. **Edge-triggered deferred sweep.** The book signals pressure. The atom set coalesces signals behind one pending flag and forks `Effect.yieldNow` then the sweep, once. The fiber is one-shot: no timer, and no lifetime to tear down.
  2. **Self-terminating book-level fiber.** When the book first goes over capacity, a fiber is forked. It sweeps on a schedule and exits once the book is within the bound, or once everything over the bound is live.
  3. **Layer-scoped periodic fork.** The atom set's runtime layer owns a scoped repeating sweep, so its lifetime is the runtime's lifetime in each registry.
- **D-02 The rule for choosing among passing candidates is fixed now**, so the spike's conclusion needs no further checkpoint. "Cleanest" means, in priority order:
  1. no timer or interval;
  2. no fiber lifetime that something must tear down;
  3. one sweeper per atom set by construction, rather than by a guard;
  4. fewest moving parts.

  That ranks the candidates 1, 2, 3, so the edge-triggered sweep wins if it passes.
- **D-03 Hard exclusions (any candidate that needs one fails outright):**
  - `scheduleTask` or `defaultIdleTTL`. They reroute dispatch and dropped a required render (CCR-QD-150).
  - A sweep run synchronously from the render path.
  - A sweep inside the registry's synchronous dispose-then-reread window (`NodeImpl.invalidate`), which is why there is no synchronous sweep-on-`open`.
  - A module-scope timer or any other module-scope state.
- **D-04 The SWEEP-02 criteria are concrete tests, written once, run per candidate.** Every one passes, or the candidate is rejected:
  - **(a) Dispose-reread smoke.** `v4-reactivity-smoke.test.ts` stays green, and the sweep across an invalidation and across a recompute in `QadiAtoms.test.ts` stays green.
  - **(b) Existing sweep pins.** The `QadiAtoms.test.ts` eviction suite keeps its assertions: oldest cold first, never a live entry, re-admission, best-effort when every entry is live. Only the trigger changes, from a manual `sweepEvictions` call to the mechanism.
  - **(c) e2e.** `examples/nextjs-newsroom` passes unchanged under `pnpm example`, about 30 Playwright tests. The host can run Playwright: Chromium 1.65 from the pnpm store ran headless for Phase 34's browser checks.
  - **(d) One sweep per atom set**, however many providers or registries share it: N providers, or N bare registries, over one atom set produce one sweep per pressure episode, not N.
  - **(e) No second sweeper** under `<StrictMode>`'s double effects or across a hidden then shown `<Activity>`.
  - **(f) No leaked fibers.** After many atom sets are built, used past the bound and released, no sweep fiber is left running.
- **D-05 Trigger points for the edge-triggered candidate.** The book signals pressure:
  - when a release brings an entry to zero while the book is over capacity;
  - when an admission takes the book past capacity.

  A signal never sweeps synchronously. It only sets the pending flag and forks, and the forked fiber begins with `Effect.yieldNow`, because `runFork` runs synchronously to its first yield. The spike checks that a signal raised from `open` (the render path) or from inside a release in the dispose-reread window only ever sweeps after that window. If admission-signalling cannot be shown safe, the spike records that, and the admission trigger is dropped in favour of release-only plus whatever bounds never-read cold admissions.
- **D-06 `QuestionBook.ts` stays free of `effect` imports.** The book takes a package-private scheduling seam from its options, for example `signal: () => void`, which `QadiAtoms.ts` implements with the coalescing deferred fork. Book tests drive the seam with a plain counting function, which is also how criterion (d) counts sweeps without a public test hook. `QuestionBook` is not exported, so the seam is not public API.
- **D-07 Spike shape and artifacts.** The spike is plan 35-01, and its record is `35-SPIKE.md` in the phase directory: each candidate, each criterion, the evidence (test names, e2e run output and counts), pass or fail, and why. It ends with the conclusion and the D-02 ranking applied.
  - The criterion tests (D-04 b, d, e, f) are permanent tests and are committed.
  - Candidate prototypes that lose are not committed to `src`. They live on the working tree only for their measurement, or in a scratch worktree, and are reverted.
  - The e2e is run once per candidate that passes the unit criteria. A candidate that fails a unit criterion does not need an e2e run, but its failure is recorded.

### The fallback (SWEEP-04)
- **D-08 Full evidence plus a stated rule.** If no candidate passes, the sweep stays in the provider, and the phase records:
  - for each candidate, the exact criterion it failed and the test or e2e run that showed it;
  - in the spec (`spec/behaviors/09-react.md`, `25-inspection.md`) and in the `QadiAtoms` and `QadiProvider` doc comments, what happens with no provider (the bound does not hold until something sweeps) and with several providers;
  - tests pinning both of those rules.

  ADR-QD-148 is then Unused in the CCR-QD-426 row.

### The old knobs (SWEEP-03)
- **D-09 Remove both `sweepIntervalMillis` and `QadiAtoms.sweepEvictions`, recorded as Breaking.** If the winning mechanism needs no interval:
  - `QadiProviderProps.sweepIntervalMillis` and `DEFAULT_SWEEP_INTERVAL_MILLIS` are deleted, along with the provider's sweep `useEffect`;
  - `sweepEvictions` leaves the public `QadiAtoms` interface, because the atom set enforces its own bound and a manual sweep would be a second way to do one thing.

  If the winner needs an interval (candidate 2 or 3), the interval moves to `QadiAtomsOptions`, and `sweepEvictions` is still removed. No inert prop is kept for compatibility. Both removals go in the `@qadi/react` changeset under **Breaking** and get a section in `upgrading.md`. In the fallback case (D-08), both knobs stay.
- **D-10 Tests that called `Effect.runSync(set.sweepEvictions)` are rewritten** to drive the mechanism: release, then settle the scheduler (a `settleTurns`-style helper, as in Phase 34) or adjust the `TestClock`. Their assertions do not change.

### Pins and characterisation (SWEEP-03, SWEEP-04, WX-06)
- **D-11 Characterisation first, on the phase base.** Before any `src` change, a commit pins today's behaviour:
  - no provider means no sweep;
  - several providers mean several sweepers;
  - a provider unmount leaves the book over the bound (the existing pin).

  The commit that changes each behaviour flips its pin, with the reason in the commit, the house pattern from Phase 34 (K5, L3, L4).
- **D-12 A bare-registry graph test** shows `maxTrackedQuestions` holding with no provider: an `AtomRegistry` and an atom set, questions pushed past the bound, readers released, the scheduler settled, and `asked()` back at the bound. This is the SWEEP-03 acceptance test.
- **D-13 `QadiProvider.test.tsx`'s "stays over the bound after unmount" pin is reconciled.** If a mechanism lands, it flips to "returns to the bound after unmount". In the fallback it stays and is cited by the stated rule.
- **D-14 New reliance on any `@stability unstable` atom API is pinned** in `v4-reactivity-smoke.test.ts`, for example finalizer timing relative to `registry.dispose()`, or the dispose-reread ordering the trigger depends on.

### Records and house rules (SWEEP-05, WX-01..07)
- **D-15 The user approved the AGENTS.md §13 edit on 2026-11-12.** §13's `maxTrackedQuestions` sentence is amended to the outcome: the mechanism, the criteria it met, and that `scheduleTask`/`defaultIdleTTL` stay off limits. `spec/process/house-rules-evidence.md` §4 gets an addendum describing the outcome, and its quoted history is not rewritten. CCR history rows are not rewritten. The amendment lands in the phase's records commit.
- **D-16 Records.**
  - ADR-QD-148 is new if a mechanism lands: "The atom set owns its eviction sweep". It cites the spike, and amends ADR-QD-014/CCR-QD-150's provider-fork clause.
  - CCR-QD-426 is the change row.
  - BEH-QD-511..515 cover the bound holding without a provider, one sweeper per atom set, the trigger and deferral, the removals and the unmount behaviour.
  - INV-QD-315..316: one sweeper per atom set; a sweep never runs on the render path or inside the dispose-reread window.
  - Traceability, `spec/README.md`, and `spec/overview.md` (gate 13: removed exports, if `sweepEvictions` appears there).
  - Every date is 2026-11-12 (`scripts/spec-revise.mjs --date 2026-11-12`). Only reserved ids are used; `scripts/next-id.mjs` is never run.
- **D-17 Mutation.** `stryker.react.mjs` is compared before and after on the touched files (`QuestionBook.ts`, `QadiAtoms.ts`, `QadiProvider.tsx`), with `35-mutation-base.json` committed alone as the first plan commit, as in Phase 34. Scores do not fall, and survivors are named.

### Claude's Discretion
- The exact name and shape of the book's scheduling seam (D-06), and of any test helper for settling the deferred sweep.
- How criterion (f) observes fibers, for example a `Supervisor` or the counting seam.
- Plan count and wave split beyond the fixed order: mutation base, then characterisation pins, then spike, then implementation, then records, then the gate.

</decisions>

<canonical_refs>
## Canonical References

- `packages/react/src/QuestionBook.ts` — the book, its liveness and the sweep algorithm
- `packages/react/src/QadiAtoms.ts` — the adapter: `track`/`live`, `sweepEvictions`, `maxTrackedQuestions`
- `packages/react/src/QadiProvider.tsx` — the current sweep fork and `sweepIntervalMillis`
- `packages/react/test/QadiAtoms.test.ts` — the `sweepEvictions` suite
- `packages/react/test/QadiProvider.test.tsx` — the `sweepIntervalMillis` suite and the "stays over the bound after unmount" pin
- `packages/react/test/v4-reactivity-smoke.test.ts` — the dispose-reread pin
- `AGENTS.md` §13; `spec/process/house-rules-evidence.md` §4 (CCR-QD-150's evidence)
- `spec/behaviors/09-react.md` (the `QadiAtoms` interface), `spec/behaviors/25-inspection.md` (`asked` bound requirement), `spec/invariants.md` (the liveness invariant near line 3197)
- `examples/nextjs-newsroom` — the e2e (`pnpm example`)
- `stryker.react.mjs`

</canonical_refs>

<deferred>
## Deferred Ideas

- Phase 34's polish items (the screen root's thin default focus ring, and the restart button's unmeasured contrast) are carried to Phase 36, not this phase.

</deferred>
