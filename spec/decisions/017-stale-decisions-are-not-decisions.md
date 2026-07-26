# ADR-QD-017: A decision being re-checked is not a decision

> **Status:** Accepted
> **Date:** 2026-07-26

## Context

`AsyncResult` carries a `waiting` flag independent of its variant. A result can
be `Success(Allow, waiting: true)`, meaning: the last answer was *allow*, and a
new answer is being computed right now.

For most cached data that is a feature — it is what lets an interface show last
minute's numbers while this minute's load. Applied to authorization it is an
over-permission. The three situations that produce it are all cases where the
previous answer is specifically the one not to trust:

- the subject has become unknown, because the user signed out or the session
  expired;
- the decisions have just been invalidated, because someone changed a grant;
- the subject has been replaced, and the new one's decision is still running.

In each, the value being held is the answer for a subject or an authority that
no longer applies. A test caught this: after the subject was set back to
`undefined`, `useCan` still returned `true`.

## Decision

Every consumer in `@qadi/react` treats a `waiting` result as *not decided*.
`currentDecision` is the single place that rule lives:

```ts
export const currentDecision = (result: DecisionResult): Decision | undefined =>
  AsyncResult.isSuccess(result) && !result.waiting ? result.value : undefined;
```

`useCan`, `useProjected`, `Can` and `Cannot` all read through it, and
`useDecisionSuspense` suspends while waiting rather than returning the stale
value. `useDecision` still returns the raw `AsyncResult`, so a caller who wants
stale-while-revalidate can have it deliberately.

`Can` checks `waiting` *before* it checks for failure: a decision being
re-checked is not yet an answer, whichever answer it held before.

## Consequences

**Positive**:

- A signed-out user's interface cannot keep showing controls granted to the
  previous session.
- Invalidation is honest: re-checking visibly re-checks.
- The rule exists once. Adding a consumer means calling `currentDecision`, not
  remembering a convention.

**Negative**:

- Re-evaluation flashes through the pending state, so a `Can` with a `pending`
  node will show it briefly on every invalidation.
- Stale-while-revalidate, which is usually the right default for cached data, is
  opt-in here rather than automatic.

**Trade-off accepted**: the flash is visible and harmless; a stale allow is
invisible and is a grant nobody authorised. Where the flash matters — a control
that would jump on every refresh — `useDecision` gives the caller the raw
result and the choice.

**Related**: [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)
makes the same argument about absent configuration. This is the same principle
applied to absent *currency*: not knowing yet is never a grant.
