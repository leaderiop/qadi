---
"@qadi/react": minor
---

Read a decision result once, with the new `outcomeOf`, and fix the documented example that rendered a stale allow.

- New exports `outcomeOf(result)` and `DecisionOutcome`: a `DecisionResult` read into one of five cases — `Pending`, `Rechecking`, `Allowed { decision }`, `Denied { decision }`, `Failed { cause }`. Only `Allowed` carries an allow. A re-check carries no verdict, and a failure carries only its `Cause`, never the `previousSuccess` an `AsyncResult.Failure` keeps (which `AsyncResult.value`/`getOrElse` return). Write `outcomeOf(useDecision(policy))` and `DecisionOutcome.$match` it.
- `Can`, `Cannot`, `useCan`, `useProjected` and the gate registry now all read through `outcomeOf`; what each renders is unchanged.
- `currentDecision` is now a projection of `outcomeOf` (same signature and answers). `DecisionResult` and `currentDecision` move from `QadiAtoms.ts` to `DecisionOutcome.ts`; their public names from `@qadi/react` are unchanged.
- `GateRenderState` is now `DecisionOutcome["_tag"]`, the same five strings.
- Docs: the React guide's "read the whole decision" example checked `isInitial`, then `isFailure`, then read `result.value`, which renders the editor while an allow is being re-checked (`Success` with `waiting: true`). If you copied it, replace the ladder with `outcomeOf`.
