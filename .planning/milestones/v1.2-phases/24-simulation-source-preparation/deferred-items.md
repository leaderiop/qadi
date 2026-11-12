## Deferred Items

- `spec/behaviors/29-devtools-simulator.md` carries BEH-QD-219, BEH-QD-220 and BEH-QD-221 twice, as two similar blocks (they differ in places) (lines 28-185 and 186-344 at 965ff14c), present before this phase. Phase 24 applied its BEH-QD-220 wording to both copies so they stay equal; removing one copy is a separate spec change.
  status: acknowledged
- `spec/traceability.md` behaviour 29's module list names `Sources` (`model/Sources.ts`), a file that does not exist; the module is `Source.ts`. Present before this phase and not touched by it.
  status: acknowledged

## Run-start window: a replay/seed during `reap` does not drop the pending run (found 2026-11-11, after 24-03) — RESOLVED 2026-11-11

`SimulationSession.ts` `runEffect` reads `mine = generation` only after `yield* reap()`. A `replay(orphan)` or `seed` that lands while a superseded Live run is still cancelling leaves that run to start afterwards with the old question; only the `question.seed !== seedOf(policy)` clause keeps its result from showing as current (pinned by 1ba535aa). Fix candidate: read `const mine = generation` before `reap`. Not fixed here (phase 24 D-01: no defect). Phase 25 (25-01 D-01, FiberHandle: a new run interrupts the previous one, `reap` leaves the interface) replaces this code; its executor/verifier should confirm the window is gone.

**Resolved** by code review WR-01 (`1ad24867`): `runEffect` reads `mine = generation` before the last `reap` and returns if it moved, so a replay, seed or ports change during teardown drops the waiting run. The 1ba535aa test now asserts `Idle` outright (IN-04). Phase 25 replaces this code with a FiberHandle and should keep that test green.
