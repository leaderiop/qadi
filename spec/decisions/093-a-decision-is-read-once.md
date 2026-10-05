# ADR-QD-093 — A decision is read once, into a closed outcome

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-093                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Accepted — amends ADR-QD-017, ADR-QD-053, ADR-QD-025 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-05): Initial release (CCR-QD-175) |

---

## Context

[ADR-QD-017](./017-stale-decisions-are-not-decisions.md) made one rule — a decision
being re-checked is not a decision — and named `currentDecision` as "the single place
that rule lives". By the time of this ADR the rule was written in three places in
`@qadi/react`, each a hand-ordered ladder over the same `AsyncResult`:

| Reader | What it produced |
| ------ | ---------------- |
| `currentDecision` (`QadiAtoms.ts`) | the decision, or `undefined` for pending, re-checking and failed alike |
| `classify` (`components.tsx`) | `Pending` / `Failure` / `Settled`, because a guard renders "not yet" and "could not" differently — and its own comment called it "the one place that rule is written down for this package's components" |
| `renderStateOf` (`useGate.ts`) | the five gate render states the devtools panel shows |

`examples/nextjs-newsroom`'s `Guards.tsx` was a fourth, a hand copy of
`renderStateOf` with a branch that could not run. A probe drove a real decision atom
through every state it reaches and found the three library readers agreeing on all of
them, so there was no live divergence — the duplication was a drift risk, not a bug.

The documentation was where the rule had already failed. The React guide's "read the
whole decision" example (`spec/appendices/react-integration.md` §5) and the website's
`hooks.md` both checked `isInitial`, then `isFailure`, then read `result.value` —
which renders the editor while an allow is being re-checked, because a re-checked
result is a `Success` still holding the old answer. Both fences were compiled by a
merge gate. Compiling proved the example called real signatures; nothing checked what
it rendered.

And `waiting` is not the only place a stale answer lives. `AsyncResult.Failure` keeps
the last success as `previousSuccess`, and `AsyncResult.value`, `getOrElse` and
`getOrThrow` return it: after a re-check of an allow *fails*, those accessors still say
"allowed", with `waiting: false`. ADR-QD-017 and BEH-QD-066 spoke only of the flag —
the blind spot INV-QD-028's note already records for seeds, "an invariant about
staleness that speaks only of the flag does not reach a value that was never marked
stale."

## Decision

**A `DecisionResult` is read in one place, `outcomeOf`, into a closed five-case
union; every surface is a projection of that outcome.**

```ts
export type DecisionOutcome =
  | Pending
  | Rechecking
  | Allowed   // { decision: Allow | SeededAllow }
  | Denied    // { decision: Deny | SeededDeny }
  | Failed;   // { cause: Cause<EvaluationError> }
export const outcomeOf: (result: DecisionResult) => DecisionOutcome;
export const currentDecision: (result: DecisionResult) => ClientDecision | undefined;
```

- **(a) Five cases, seeded folded in.** A seed reads `Allowed`/`Denied` like this
  client's own answer (BEH-QD-149); which one it is stays a property of the decision
  inside, answered by `isSeeded`. A seventh-case split (`SeededAllowed`/`SeededDenied`)
  would put one fact in two places and change the `data-state` vocabulary the
  newsroom e2e pins. `Rechecking` stays apart from `Pending` because the gate registry
  reports them apart ([ADR-QD-053](./053-a-gate-can-be-found.md)).
- **(b) `Failed` carries the `Cause` and nothing else** — in particular not
  `previousSuccess`. No outcome has a field through which a stale value can leak.
- **(c) A leaf module.** `packages/react/src/DecisionOutcome.ts` owns `DecisionResult`,
  `DecisionOutcome`, `outcomeOf` and `currentDecision` (both moved from `QadiAtoms.ts`,
  same public names). It imports nothing local but `SeededDecision.ts`, so
  `GateWriter.ts` can declare `GateRenderState = DecisionOutcome["_tag"]` without
  closing a type-only cycle through `QadiAtoms.ts` ([ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md)).
- **(d) Public, with no new hook.** `outcomeOf` and `DecisionOutcome` are exported; a
  caller writes `outcomeOf(useDecision(p))`. `useDecision` and `usePolicies` keep
  returning the raw result: ADR-QD-017's deliberate stale-while-revalidate opt-in, and
  the raw tags the newsroom's `Divergent.tsx` records.
- **(e) `useDecisionSuspense` delegates.** It keeps `@effect/atom-react`'s
  `useAtomSuspense(atom, { suspendOnWaiting: true })`, whose suspend / throw / return
  partition is exactly `{Pending, Rechecking}` / `{Failed}` / `{Allowed, Denied}`.
  Reimplementing it would need a derived atom per question or a hand-rolled suspense
  promise — the second is where COMPAT-01's race came from (CCR-QD-150). A test now
  pins it: flipping the flag to `false` fails `edges.test.tsx`.
- **(f) Enforced, not remembered.** `DECISION_READ_BUDGET`
  (`scripts/check-house-style.mjs`) counts raw reads — `.waiting`, `.previousSuccess`,
  `AsyncResult.isSuccess(` and its siblings and value accessors — per file in
  `packages/*/src`, in both directions: `DecisionOutcome.ts` 2, `HydrationEngine.ts` 3
  (seed precedence, which chooses what the atom holds rather than reading it —
  [ADR-QD-039](./039-a-seed-is-not-an-authority.md)). The two doc-fence gates
  (`node scripts/check-doc-examples.mjs`, `node scripts/check-website-doc-examples.mjs`)
  refuse the same reads in any compiled fence that imports `@qadi/react`, unless the
  fence carries `// qadi:raw-decision-read — <reason>`. One pattern serves both, in
  `scripts/lib/raw-decision-read.mjs`.
- **(g) One scoped mutation gate.** `stryker.react.mjs` mutates
  `DecisionOutcome.ts` alone, break 80, `ignoreStatic` ([ADR-QD-076](./076-mutation-runs-skip-static-mutants.md)).
  `@qadi/react` stays excluded from mutation testing as a binding plus render code;
  this file is neither, and the exclusion's own reason does not reach it — the
  argument `stryker.devtools.mjs` makes for `src/model/`. It is step 22 of `pnpm check`
  ([ADR-QD-025](./025-mutation-testing.md) revision 1.3).
- **(h) Names.** `DecisionOutcome` / `outcomeOf`: "outcome" was already the package's
  word (`components.tsx`'s private `GateOutcome`), and it is not gate-specific.

`classify` and `renderStateOf` are deleted. `Can` and `Cannot` dispatch with
`DecisionOutcome.$match` (no new `switch`; [ADR-QD-034](./034-the-switch-exception-is-measured.md)),
`useCan` is `outcome._tag === "Allowed"`, `useProjected` projects an `Allowed`
outcome's decision, and `useGate` hands the registry `outcome._tag` — the same object
the surface renders from, so the panel and the guard cannot disagree by construction.

## Consequences

**Positive**:

- The stale-allow rule, INV-QD-006's failure-is-not-denial and BEH-QD-149's
  seeded-is-decided are each written once and checked by the compiler for every
  surface: a sixth outcome is a compile error in every `$match` and in
  `GateRenderState`'s consumers.
- `previousSuccess` is unreachable through the library's own read, and the doc gates
  refuse a documented example that reaches for it.
- "How does a re-check render?" has one answer and one test file
  (`DecisionOutcome.test.ts`), which drives a real atom through every state and checks
  every `AsyncResult` shape with fast-check, without rendering (AGENTS.md §13).

**Negative**:

- One more exported type and function in `@qadi/react`.
- A legitimate stale-while-revalidate documentation example now needs the opt-out
  marker. That is the intended friction: ADR-QD-017 keeps raw access deliberate.
- Two gates and the DoD table changed together; the website and publish-status steps
  renumbered 22–24 → 23–25.

**Unchanged on purpose**: seed precedence in `HydrationEngine.ts` (it decides which
result the atom holds, upstream of the read); `@qadi/devtools`' open-string
`GATE_STATES` (it renders a newer `@qadi/react`'s states without depending on it);
the newsroom's `Invalidation.tsx` and `Divergent.tsx`, which read raw as their exhibit;
ADR-QD-017's accepted one-frame subject-change window, which no read function can see.

_Related: [INV-QD-094](../invariants.md#inv-qd-094-a-decision-being-re-checked-or-that-failed-never-reads-as-a-verdict) · [BEH-QD-066](../behaviors/09-react.md#beh-qd-066-decision-state) · [BEH-QD-307](../behaviors/09-react.md#beh-qd-307-a-decision-result-reads-as-one-of-five-outcomes) · [ADR-QD-017](./017-stale-decisions-are-not-decisions.md) · [ADR-QD-053](./053-a-gate-can-be-found.md) · [ADR-QD-078](./078-a-seed-is-its-own-type-and-the-payload-is-versioned.md) · [ADR-QD-080](./080-a-gate-registry-belongs-to-its-atom-set.md)_
