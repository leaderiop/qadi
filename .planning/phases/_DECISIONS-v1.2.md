# Wave 7 (v1.2) — human decisions (answered 2026-11-11, before execution)

The user answered every `checkpoint:decision` of Phases 21–29 up front, with the instruction: **"the recommendation should be the
cleanest solution, not the simplest one; we can override any ADR if it causes us problems."** An executor that reaches one of
these checkpoint tasks treats it as answered with the value below. It quotes the answer and that instruction in the plan's SUMMARY (and in the ADR the
plan names), and continues without stopping.

| Plan · task | Answer | Meaning |
|---|---|---|
| 22-01 T1 (D-02) | `A` | No nested span: every scoped port read is one span that carries the question and the `MissingResourceId` failure; `requireResourceId` is deleted; AGENTS.md §5's sentence is rewritten |
| 22 D-05 (planner decision, **overridden**) | `state once` | The leaf→request mapping is stated once, in each port description (built through Phase 21's `makePortDescription`); the scoped reads and `servingFor` both derive from it, so the two can no longer disagree. `ServedLeaves` changes (public, `@qadi/core` minor). The `servingFor` property test stays as a guard. ADR-QD-134 records the override |
| 23-01 T3 (D-02/D-05) | `A`, `keys: absent` | One `Schema.Struct` per record; the `Data.TaggedClass` is typed by it and the v2 wire spreads it (unless the bench shows B within noise **and** B adds no throw on the evaluation path, which it does, so A stands). Every projection leaves absent `resource`/`action`/`cache` absent, so a record is `Equal` to its own round trip |
| 25-01 T1 (D-01) | `D: FiberHandle` + public confirmed | New option, not in the original plan. The session is constructed in a `Scope` and owns an `effect/FiberHandle`. Every run forks into it, so a new run interrupts the previous one and closing the scope interrupts the run in flight. `reap`, `hasRetired`, the retired list and `dispose` leave the interface. **Overrides ARCH-20 D-20-b** ("model code never forks"): the session owns its runs' lifetime through structured concurrency instead. The interface changes listed in 25-01 D-06 are confirmed, adjusted for a scoped constructor |
| 28-01 T1 (D-01) | `A` (useGateRegistration deleted) | Split the React-free write side plus pure `reconcile` (private leaf below the registry) from the hooks (`useGate.ts`, above `QadiAtoms`); `GateAtoms` = `Pick<QadiAtoms, …>`; ADR-QD-140 amends ADR-QD-111's import rule |

Any **new** one-way decision that is not in this table and not settled by a CONTEXT is a real blocker: stop and return it.
