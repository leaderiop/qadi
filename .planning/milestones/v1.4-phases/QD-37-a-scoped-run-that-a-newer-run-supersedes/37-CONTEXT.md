# Phase 37: A scoped run that a newer run supersedes - Context

**Gathered:** 2026-11-14
**Status:** Ready for planning

<domain>
## Phase Boundary

One package-private devtools module owns the protocol for a scoped run that a newer run supersedes: the run handle, the
current token, the closed state, the finalizer ordering (registered after the handle, so it runs first on close),
interrupt-on-replace, `stop`, and "land only while current". `SimulationSession`, `TimelineFeed` and `DiagnosticsFeed`
(the only three adopters; `DockModel.ts` has none and `CircuitBreaker.ts` is a different concern) use it and stop
restating it by hand. A restart from inside a store's own notification leaves the newest run live. Observable
behaviour is otherwise unchanged. Records: ARCH-84, ADR-QD-150, CCR-QD-428, BEH-QD-521 to 525, INV-QD-319 to 320, a
`@qadi/devtools` patch changeset, and the AGENTS.md §10 correction. Requirements: RUN-01 to RUN-08 and WX-01 to WX-07.

Read first: `.planning/phases/_SHARED-CONTEXT.md`, `.planning/phases/_WAVE9-CONTEXT.md` (Phase 37 evidence),
`.planning/research/SUMMARY.md` (R1, R2, R6, Pitfalls 1 to 3).

</domain>

<decisions>
## Implementation Decisions

### Module shape (accepted 2026-11-14)
- **D-01:** Module: `packages/devtools/src/model/SupersedingRun.ts`, constructor `makeSupersedingRun`. It is an
  `Effect.fn` that requires `Scope.Scope`, builds synchronously (`useScoped` uses `Effect.runSync`) and holds per-build
  closure state only. It stays out of both devtools barrels (package-private; no `spec/overview.md` export row).
- **D-02:** Interface (R2, binding): two-step `begin()` → the store publishes → `fork(token, effect)`, plus
  `isCurrent(token)`, `stop()` and `closed()`. `begin()` supersedes (bumps) and returns a token. `fork` forks only
  while the token is still current and says whether it did. `isCurrent` guards each landed write (`marking.accept`,
  the session's `land`). A one-call `run(effect)` is rejected because each store publishes between the bump and the fork.
- **D-03:** The feeds' failure filter becomes one named hook: an optional `onFailure(cause)` on `fork`. The module calls
  it only for the current run's failure that is not interrupt-only (today's `mine === generation && Exit.isFailure(exit)
  && !Cause.hasInterruptsOnly(exit.cause)`, at `TimelineFeed.ts:150` and `DiagnosticsFeed.ts:221`). `SimulationSession`
  passes no hook. Its `land` keeps mapping every non-success exit with a current token to `Broke`, including a
  self-interrupt, and it uses only `isCurrent`.
- **D-04:** The token is opaque: stores only ask `isCurrent(token)`; no store does arithmetic on or compares tokens itself.

### Stop rule (R1, settled by research)
- **D-05:** `stop` is one unconditional rule: supersede, then fork `Effect.void`, with no guard. `SimulationSession.ts:462`'s
  `Option.isSome(FiberHandle.getUnsafe(runs))` guard is deleted. Pinned on the module interface: stopping with no run
  (not started, completed, closed) changes nothing and notifies nobody, opens no span, and leaves the handle empty.
  "Must not allocate a fiber" is not a requirement.

### Re-entrancy (accepted 2026-11-14)
- **D-06:** Pre-fork restart: `fork` re-checks the token by default, so the two feeds gain the post-commit re-check that
  only `SimulationSession` has today (a subscriber restarting the feed inside its Starting or Reading notification).
  The RED test runs on `637c0601` first. If a feed is not RED, record the evidence and keep the re-check anyway (the
  session needs it).
- **D-07:** In-prefix restart (a body whose synchronous prefix starts a command that starts a newer run; STACK `exp3`
  shows the newest run interrupted and the store idle with a stale token): **repair, not report.** A `fork` requested
  while another `fork` is still starting is held until that start returns, then installed (interrupting the stale
  outer run), so the newest run is live. One pending slot is enough, because each `begin` supersedes the previous one.
  Re-check the slot until it is stable. RED first. This supersedes research R2's option A ("report"), which the user
  accepted as the fallback only: if the RED evidence or an existing pin argues against holding, fall back to R2 option
  A (the doc rule "a body must not call a command before its first yield", and a violation shown as the store's failure
  state, never silently idle) and record why. RUN-05's second clause ("reported, not left silently idle") is met in its
  stronger form, because the newest run is live; the CCR row and ADR-QD-150 say so.
- **D-08:** Synchronous start is kept (R2): a body's synchronous prefix still runs inside `fork`. No `Effect.yieldNow`
  first (about 34 tests rely on the synchronous prefix; count them in the research step) and no
  `FiberHandle.run({ startImmediately: false })` (it needs `runSyncWith`).

### Tests and mutation (accepted 2026-11-14)
- **D-09:** Store tests: every pre-existing store test passes unchanged on day one. A store-level protocol case is
  deleted only after a module test covers it **and** the store's mutation score still holds; otherwise it stays.
- **D-10:** Mutation: base all three stores at `637c0601` with the exact invocation the close will use, committed alone
  and first (`DiagnosticsFeed.ts` has no recorded base; `TimelineFeed.ts` was 1.0; `SimulationSession.ts` about 0.97).
  The new module has no base: every mutant is killed or named in the close plan as an equivalent survivor. A drop in a
  store is closed with a test and never re-baselined (WX-05).
- **D-11:** RUN-07 property: a seeded fast-check model in the ARCH-79 / Phase 31 form (`fast-check` is already a devtools
  devDependency) over random begin, fork, land, stop and close interleavings. The precedent
  (`packages/core/test/SharedComputation.test.ts:566-845`) is a weighted `oneof` command array, a hand-written
  interpreter, `asyncProperty` and a fixed seed, not `fc.commands`; the discuss table's `fc.commands` wording was a
  mislabel of that precedent, corrected after research (A5). It checks that only the current
  run's result lands and nothing lands after close. Weighted generators meet non-vacuity floors, and a floor is never lowered.
- **D-12:** Module tests, through its own interface in a new test file: supersede, close mid-run (including a defecting
  finalizer), stop in each state (not started, running, completed, closed), interrupt versus failure (the `onFailure`
  hook), the self-interrupt row ("reads Broke, not Running", pinned at the session before it is touched), two instances
  in two scopes, and the D-06 and D-07 re-entrancy rows. A test that closes its scope mid-test builds
  `Scope.makeUnsafe()` and runs `Scope.provide` then `Scope.close`. `it.effect` already scopes a test, and `it.scoped`
  does not exist in `@effect/vitest@4.1.2` (R6).

### Records
- **D-13:** ADR-QD-150 amends ADR-QD-137 §7 (no `useRunningStore`; names the module) and point 3 (the unconditional stop),
  and states the finalizer order, the held-fork repair (D-07) and the `Scope.make("parallel")` caveat (a parallel
  scope voids the finalizer ordering, and the module doc says so). AGENTS.md §10 stops naming `it.scoped`. The three
  "Added after the handle" comments and `DiagnosticsFeed`'s "without a `Stopped`" doc are updated. The changeset is a
  `@qadi/devtools` patch. Use only the reserved numbers (ARCH-84, ADR-QD-150, CCR-QD-428, BEH-QD-521 to 525,
  INV-QD-319 to 320). Confirm each is free by grep. Never run `node scripts/next-id.mjs`. Name any unused number in the
  CCR row. The CCR README row lands in the same plan as its first citation, then `spec-revise --date`, then `--check`.

### Claude's Discretion
- Exact names of the interface members beyond `begin`/`fork`/`isCurrent`/`stop`/`closed` and `onFailure`, the token's
  concrete representation behind its opaque type, and the BEH/INV split across the reserved numbers.
- How the per-store "ordering rows" are expressed in tests (publish-before-fork for each store).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FiberHandle.make` / `FiberHandle.runtime(handle)<never>()`: the three stores' current run handle; installing a
  fiber interrupts the one it replaces.
- `makeExternalStore` (`model/ExternalStore.ts`): each store's publish/subscribe; publishing between `begin` and `fork`
  is where the pre-fork re-entrancy happens.
- `fast-check` (`fc.commands`), already a devtools devDependency; the Phase 31 (ARCH-79) model-based property is the
  template.

### Established Patterns
- The protocol restated three times: `let generation`, `let closed`, `FiberHandle.make` followed by an
  `Effect.addFinalizer` that bumps and closes (added after the handle so it runs first), `FiberHandle.runtime` to fork,
  and each run capturing `mine` and landing only while `mine === generation`.
  - `TimelineFeed.ts:122-161` (`readSource`, `restart`; publishes `status.set(READING)` before the fork)
  - `DiagnosticsFeed.ts:170-240` (`start`, `off`; `show(Starting)` before the fork; its prefix may reach Live or Stopped)
  - `SimulationSession.ts:350-362, 460-462, 538-544` (`supersede` with the guarded stop; `commit()` then
    `if (mine === generation) fork(land(...))`)
- The session run is a root span; interruption never reads as `Stopped` (INV-QD-313).

### Integration Points
- `useScoped` builds stores with `Effect.runSync`, so the module must build synchronously.
- Tests: `packages/devtools/test/model/{TimelineFeed,DiagnosticsFeed,SimulationSession}.test.ts`
  (`SimulationSession.test.ts` is 1,809 lines; Phase 41's RED session test goes in a new file).
- Vitest runs from the repo root with `--project devtools`; Stryker's devtools config decides the mutation invocation.

</code_context>

<specifics>
## Specific Ideas

- The user accepted repairing in-prefix re-entrancy (D-07) over research's "report", in line with the standing
  direction that the cleanest, most complete design wins and a breaking change is not a cost.
- RED first everywhere: the two re-entrancy reproductions (pre-fork and in-prefix) on `637c0601` before the interface
  is fixed; the count of store tests that depend on a synchronous prefix is recorded.

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase scope. Out of scope per REQUIREMENTS.md: `CircuitBreaker.ts`'s generation
and `DockModel.ts`.

</deferred>
