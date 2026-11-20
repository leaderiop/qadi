# Phase 67: No equivalent mutants, no magic race bound - Context

**Gathered:** 2026-11-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Three spots in `@qadi/core` keep a mutant alive or a test bound to an accident of the walk.

- **`DecisionCache.ts`'s eviction (about line 273–288).** A `while (HashMap.size(entries) > options.capacity)` loop
  reads `Chunk.head`, then `if (Option.isSome(oldest))`. The comment above it says the guard cannot be false, so its
  mutant is equivalent.
- **`SharedComputation.ts`'s claim dispatch (about line 297–335).** The `Effect.sync` claim returns `Hit`, `Joined`
  or `Claimed`, but only `_tag === "Hit"` and `_tag === "Joined"` are checked, and `Claimed` falls through. Mutating
  the `"Claimed"` literal survives.
- **`DecisionCache.test.ts`'s I5 race test (about line 1237–1308).** It sweeps `for (let gap = 0; gap <= 48; gap++)`
  at budgets 3–6. The comment at about 1249 says the switch-over gap depends on `walk`'s step count, so the bound 48
  is tied to `Walk.ts`.

After this phase:
- The eviction has no branch that cannot be taken.
- The claim result is dispatched closed, so mutating any of its tags is killed.
- The race test iterates until it sees both orderings at every budget, with a loud cap and no number tied to `walk`.

ARCH-114. Package `@qadi/core`, behaviour-neutral. **No changeset**, and no export changes (`spec/overview.md`
unchanged in its tables).

Records:
- CCR-QD-458.
- BEH-QD-671–675 and INV-QD-379–380 as needed, with unused ids named Unused in the CCR row.
- ADR-QD-180 named Unused.
- Traceability.

Requirements: MUTE-01..04, plus the cross-cutting WX-01..07.

</domain>

<decisions>
## Implementation Decisions

### Eviction (MUTE-01, owner 2026-11-20: splitAt + removeMany)
- Replace the loop with `Chunk.splitAt(insertionOrder, HashMap.size(entries) - options.capacity)`. It clamps
  negative and oversize counts. Then use `HashMap.removeMany(entries, evicted)`, and the kept half becomes the new
  `insertionOrder`.
  - Remove `import * as Option` in the same commit if nothing else in the file uses it.
  - No `Chunk.getUnsafe` or other throwing accessor.
  - No `Chunk.isNonEmpty(...) &&` in a loop condition, because that re-creates an equivalent mutant.
- FIFO order and capacity validation are unchanged. The existing eviction and FIFO tests stay green unedited.
  - Probe first that `Chunk.splitAt` clamps exactly as the roadmap says on the repo's installed `effect`
    (`node_modules/effect`, the version `pnpm-lock.yaml` pins).
  - Probe that `HashMap.removeMany` exists with that name and takes an iterable. If either differs, choose the
    nearest form with no impossible branch and record it.
- Rewrite the comment above the eviction to say what the new code holds (`Chunk.size(insertionOrder) ===
  HashMap.size(entries)`). Drop the "the `Option` check exists for that same reason" paragraph.

### Claim dispatch (MUTE-02, owner 2026-11-20: bench, then a fixed rule)
- **Candidates:**
  - (M) `Match.value(claimed).pipe(Match.tagsExhaustive({ Hit, Joined, Claimed }))`, built per call. It cannot be
    hoisted, because `A` and `E` are generic in `run`.
  - (T) A closed own-property arm table in the `FieldLattice.ts` style, read through `Object.hasOwn`. Its row type
    makes a missing tag a compile error.
- **Rule, fixed before any run.**
  1. Measure each candidate against the phase base with `DecisionCache.bench.ts`, 3 + 3 interleaved.
  2. Take (M) if it passes the gate: no workload more than **5%** slower, and a geometric mean of the deltas no
     worse than **+2%** (median of per-run minima, as in Phase 66).
  3. Otherwise take (T), which must pass the same gate.
  4. If neither passes, stop the phase with the evidence committed and return a `checkpoint:decision` to the owner.
     Do not re-run.
- The candidate benches are measurement runs, made from scratch patches kept outside the repo and committed as
  evidence. The run of record is a separate 3 + 3 run of the final committed source (eviction plus dispatch) against
  the phase base, under the same gate. It is the last executable change.
- The owner arm (about 70 lines of `forkDetach`/`onExit`) moves to a local function, so every arm is a call.
- The hit check stays inside the one synchronous claim step (ARCH-45, I5). The `Effect.sync` block itself is not
  reordered.
- No `switch`: `SharedComputation.ts` is not in `SWITCH_BUDGET`. No `// Stryker disable`.
  `UNTRACED_BUDGET` is unchanged: no `Effect.fnUntraced` is added.
- Every arm must be reached by a test that fails when its tag literal is mutated. Check this with the Stryker close
  run under `coverageAnalysis: "perTest"`, and do not assume it.

### Race loop (MUTE-03, owner 2026-11-20: cap 512, margin 3)
- **Per budget (3, 4, 5, 6),** iterate `gap` from 0 upward until both `coalesced` and `hit` have been observed for
  that budget, then 3 more gaps past the first flip.
  - Fail loudly at gap 512, naming the budget and the counts of each side seen.
  - The rule is per budget, not overall.
- **Keep the per-run assertions on every iteration:** one walk of `K`, and follow-ons exactly `miss,miss,miss,hit`.
  Keep the final "both sides at every budget" assertion.
- Delete the comment "Measured coalesced→hit switch-over … re-measure rather than retry" (about line 1249). No number
  in the test may be tied to `walk`'s step count. 512 and 3 are stated as a cap and a margin, not as measurements.
- **Measure runtime:**
  - the iterations actually run per budget, today versus after;
  - the test's wall time under vitest;
  - the test's wall time under Stryker's `timeoutMS: 20000`.

  The vitest timeout (30 000 ms) changes only if the measurement says so, and with its reason.
- **Acceptance RED.**
  1. Temporarily split the hit check from the claim, the pre-I5 shape, in a scratch worktree or reverted edit, never
     committed.
  2. Confirm the new loop goes RED with a message naming the recompute or FIFO break.
  3. Restore and confirm green.
  4. Record the evidence.

### Mutation (MUTE-04)
- **Base run.** Stryker on `DecisionCache.ts`, `SharedComputation.ts` and `Lifecycle.ts`, before any edit.
- **Close run.** The same invocation at close.
  - Floors are Phase 61's: `DecisionCache.ts` 0.977, `SharedComputation.ts` 0.986, `Lifecycle.ts` 1.000. No file may
    fall below its floor or below this phase's base.
  - Both named survivors (the eviction guard and the `"Claimed"` literal) must be gone.
- **Static evidence run.** Use `ignoreStatic: false` from a config kept outside the repo, as in Phases 61 and 66.
  `stryker.config.mjs` is never edited.
- **The scorer.** Copy and parameterise Phase 66's `66-mutation.mjs` into the phase directory, and fix the two
  weaknesses Phase 66's review found (IN-03) in the copy:
  - exempt a mutant by its mapped line, not by matching line text;
  - keep multiplicity in the key sets.

  Show the fixed scorer failing on a planted case of each.
- **A surviving mutant on a line the phase wrote.**
  - If it is not equivalent, kill it with an added test.
  - If it is proven equivalent, it triggers a `checkpoint:decision` to the owner.

### Records (owner 2026-11-20: no ADR, 180 Unused)
- CCR-QD-458 records the measured dispatch choice and names ADR-QD-180 Unused.
- BEH/INV within the reserved ranges, with unused ids named Unused.
- Traceability rows for every new id.
- AGENTS.md §5a gains a sentence only if the chosen form is a pattern §5a does not already describe. An arm table in
  the `FieldLattice.ts` style is already described.
- Every `spec-revise.mjs` call passes `--date 2026-11-21`.
- Reserved ids only. Never run `scripts/next-id.mjs`.
- **The Phase 65 lesson.** A review or verifier fix after the records plan must re-align the CCR-QD-458 row's cited
  revisions.

### Claude's Discretion
- Test titles and ids, and the exact local-function name for the owner arm.
- Which BEH/INV ids are used, and their wording.
- The bench workload set: every workload in `DecisionCache.bench.ts`, plus any `SharedComputation` workload if one
  exists. Name it in the plan before any run.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/DecisionCache.ts`: `insertionOrder` (a `Chunk`), `entries` (a `HashMap`), `options.capacity`
  (validated at construction).
- `packages/core/src/SharedComputation.ts`: `run`, the `Effect.sync` claim (about 297–320), `hooks.cached`,
  `hooks.onOutcome`, `awaitShared`, `InFlightClaim`, `restore`.
- `packages/core/src/FieldLattice.ts`: the own-property arm-table precedent (ADR-QD-092).
- `packages/core/bench/DecisionCache.bench.ts`.
- Phase 66's parameterised bench harness: `.planning/phases/QD-66-…/bench/ab.sh`, `analyze.mjs`, and `66-BENCH.md`
  for the record shape.
- Phase 66's `66-mutation.mjs`.
- Phase 61's `61-mutation*.json`: `.planning/milestones/v1.6-phases/QD-61-decisioncache-is-asked-only-the-question/`.

### Established Patterns
- RED first on the phase base. Scratch lives outside the repo.
- Executors never tick WX-*. Only the phase's last plan ticks MUTE-01..04.
- `check:pr` runs once, alone. Stryker never runs beside vitest, and the bench never runs beside anything.
- Git pathspecs need `:(glob)packages/*/src/**`.
- The shell is zsh: run multi-argument commands under `bash -c`.

### Integration Points
- `DecisionCache`'s `getOrCompute` runs through `shared.run`, and `evaluate` uses the cache when it is provided.
- The I5 test drives the cache with `Scheduler.MaxOpsBeforeYield` budgets.

</code_context>

<specifics>
## Specific Ideas

- The I5 acceptance check is temporary: split the hit check out of the synchronous claim step, see RED, then restore.
  Nothing from it is committed except the evidence.
- The candidate benches choose the form. The run of record proves the committed source. Keep the two apart.

</specifics>

<deferred>
## Deferred Ideas

- None beyond the milestone audit list.

</deferred>
