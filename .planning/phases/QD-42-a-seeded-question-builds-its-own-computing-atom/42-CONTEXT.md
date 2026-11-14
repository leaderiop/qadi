# Phase 42: A seeded question builds its own computing atom - Context

**Gathered:** 2026-11-14
**Status:** Ready for planning

<domain>
## Phase Boundary

The seed-to-evaluation link moves into one module. Today `makeSeededQuestion` (`packages/react/src/HydrationEngine.ts`) takes
`computedFor`, a callback that receives another callback (`seededIn`). The computing atom lives in `QadiAtoms.ts`
(`seededDecision`), so the link is split across two modules. `HydrationEngine.test.ts` tests it with a fake `computedFor`.
The liveness rule is also stated three times.

The user chose **option 1b** after the spike evidence in `42-RESEARCH.md`. A new package-private module,
`packages/react/src/SeededQuestion.ts`, builds its own computing atom and is tested through a real atom runtime.
`HydrationEngine.ts` becomes a pure codec. The phase's last plan sweeps anything Phases 37 to 41 left stale and re-verifies
the milestone at its final head.

Records:
- ARCH-89, ADR-QD-155 (used, D-02), CCR-QD-433.
- BEH-QD-546..550 and INV-QD-329..330 are reserved. Use them only for statements nothing already covers.
- Changeset: `@qadi/react` patch.

Requirements: SEED-01 to SEED-06, plus the WX cross-cutting rows. SEED-05 (reject) does not apply, because the decision is a go.

Read first:
- `42-RESEARCH.md` (the spike evidence table, pitfalls 1 to 7, plan shape "Go: 1b", the last-plan sweep list)
- `.planning/phases/_SHARED-CONTEXT.md`
- `.planning/phases/_WAVE9-CONTEXT.md` (Phase 42 section)
- the Phase 42 section of `.planning/ROADMAP.md`

</domain>

<decisions>
## Implementation Decisions

### The human checkpoint (SEED-01, SEED-02; decided 2026-11-14)
- **D-01: Option 1b, invert into its own module.** The spike evidence (research commit `2ec342d9`) was gathered first. One `AskUserQuestion` offered 1a, 1b, 2 and 3, and the user chose 1b.
  - The phase's first plan records the evidence table and the decision before any `packages/*/src` edit (SEED-02), and commits the mutation base alone first.
  - Options 1a, 2 and 3 are not implemented.

### The shape (SEED-03)
- **D-03: `packages/react/src/SeededQuestion.ts` owns the seeded question.** `makeSeededQuestion({ policy, resource, runtime, subject, report, live })` builds its own computing atom and calls the liveness release itself. No parameter is a function that receives a function.
  - It reads the seed through `seededIn(get.registry)`, never `get(grantAtom)`.
  - It adds no second `Atom.readable`.
  - `live()` stays the reader's first statement.
  - It is handed the final `keepAlive`/`withEquality` subject atom object (the `subject` const in `QadiAtoms.ts`), never a pre-pipe base.
  - `WeakMap<SeedGrant, ...>` stays the only seed holder.
  - The module is package-private, out of the barrel (ADR-QD-099), with no `"use client"`.
- **D-04: What moves.**
  - `DECISIONS_KEY`, `SeededQuestion`, `makeSeededQuestion`, `SeedSlot`, `SeedGrant` and `isMismatch` move to `SeededQuestion.ts`.
  - `HydrationEngine.ts` keeps the codec and imports `type SeedSlot`.
  - `QadiAtoms.ts`'s build becomes one call, and `seededDecision` plus the local `DECISIONS_KEY` are deleted.
  - `QadiRuntimeServices` does **not** move. It is an alias of core's `StandingEvaluationServices`, which the moved code names directly.
  - Importing `DECISIONS_KEY` back up from `QadiAtoms.ts` is a madge cycle (ADR-QD-037), so it moves down.
- **D-05: The tests come first, through a real runtime.** These are written before the fakes are deleted:
  - real-runtime seam tests (`Atom.runtime(Layer)`, the real subject atom), first through the current API at the `makeQadiAtoms` level, green as characterisation;
  - the two trap tests, "a late seed does not re-run the computation" and "no grant node for an unhydrated question" (they turn red under the `get(grantAtom)` trap);
  - the two mutation-closing tests, an equal-subject write and a non-envelope payload that hands back no entries.

  Then the four fake-`computedFor` cases go, and the `makeSeededQuestion` tests move to `SeededQuestion.test.ts` on the real runtime.
- **D-06: The liveness rule is stated once,** at `QuestionBook.ts` `BookOptions.build`, with a one-line pointer in `makeSeededQuestion`'s doc. The `QuestionBook.ts` header comment ("`QadiAtoms.ts` is its one adapter …") is corrected.

### Pins (SEED-04)
- **D-07: Every existing pin holds untouched.** That covers:
  - the render sequences in `QadiProvider.test.tsx`, SD1-SD5, HL1-HL7, the seed/lifetime/sweep/eviction suites and the 30 e2e scenarios (`pnpm example`; Playwright runs on this host);
  - INV-QD-028/105/317/318;
  - the `maxTrackedQuestions` proofs (StrictMode, `<Activity>`, no leaked fibers, one sweeper per atom set);
  - no `scheduleTask`/`defaultIdleTTL`.

  `git diff --stat` on the pinned test files is empty.

### Proof and records
- **D-08: Mutation.**
  - The base runs `stryker.react.mjs --mutate 'packages/react/src/QadiAtoms.ts,packages/react/src/HydrationEngine.ts,packages/react/src/SeededQuestion.ts'` on the phase base. It is committed alone first, with the same invocation the close uses.
  - `SeededQuestion.ts` is recorded as **moved**, not new. Its gate is no survivor outside the five base survivors that move with the code (named in RESEARCH: the `SeedGrant.kind` string, the two `Option.isSome(held) && … instanceof SeedGrant` mutants, `{ announced: false }`→`{}`, the resource conditional).
  - A reshape that kills one (for example `AnnounceState` as a `WeakSet<AtomRegistry>`) is welcome if measured.
  - `HydrationEngine.ts` and `QadiAtoms.ts` must not fall below base.
  - Never re-baseline.
- **D-02: ADR-QD-155 is used.** It records that the seeded question owns its computing atom in its own module (review #6, the options with their measured costs, the user's choice). ADR-QD-149 gets a dated amendment, with the file citation now `SeededQuestion.ts` and a pointer to ADR-QD-155. No ADR is reversed.
- **D-09: Records change together, each with its own grep verify,** because no gate catches a stale citation (RESEARCH Pitfall 3).
  - AGENTS.md §13 (`HydrationEngine.ts`'s seed precedence → `SeededQuestion.ts`'s).
  - `DECISION_READ_BUDGET` and its `_NAMES` file keys in `scripts/check-house-style.mjs`, with the same count and the same name.
  - INV-QD-028/105/317/318 Source and Enforcement.
  - BEH-QD-517/518 Source.
  - The `spec/traceability.md` rows.
  - The CCR-QD-433 row naming the unused numbers.
  - A `@qadi/react` patch changeset.
  - Dated blockquotes in older ADRs are history and are left alone.

### The last plan (SEED-06)
- **D-10: Cross-phase stale sweep and milestone re-verify.**
  - The sweep covers spec, AGENTS.md, READMEs, the website and `.changeset`, for every symbol Phases 37 to 41 removed or renamed (change history excluded). It also covers the overview module columns for moved declarations and the BEH/INV Source lines naming 37 to 41 files.
  - The mutation re-check covers every file touched in the milestone, `git diff --name-only 637c0601 -- 'packages/*/src/*'` (the `'packages/*/src'` form prints nothing). It runs one Stryker per config, one at a time, against each phase's `NN-mutation-after.json`.
  - `DecisionStreamRoute.ts` changed only in a comment and is recorded as such.
  - Then `pnpm check:pr < /dev/null` and `pnpm example`. Nothing is released.

### Claude's Discretion
- How the plans split, within RESEARCH's "Go: 1b" order: evidence and base, tests first, inversion, records, close.
- Whether to take the `WeakSet` reshape.
- Wording of ADR-QD-155 and the amendment.

</decisions>

<code_context>
## Existing Code Insights

Evidence lines are in `42-RESEARCH.md` ("Plan shape per outcome", "Go: 1b"). The spike diff for 1b is at
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bea2edc6-796f-4f45-9f14-5cbd1f92cfb8/scratchpad/spike-1b.diff`
(a reference, not a patch to apply blindly). In that spike, `check:pr` exited 0 and `pnpm example` passed 30 of 30.

</code_context>

<specifics>
## Specific Ideas

- The user chose the recommended, most complete option. Breaking changes are allowed, and compatibility is never the tiebreaker.
- The proof shape is the same as Phases 38 to 41: base committed alone first, characterisation on the base, then the change.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
