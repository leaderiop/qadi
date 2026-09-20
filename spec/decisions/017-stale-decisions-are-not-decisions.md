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
- **A subject-prop change carries a one-frame window this mechanism does not
  cover.** `QadiProvider.tsx` writes a changed `subject` prop to the registry
  in a `useEffect`, after commit, rather than during render — reverted there
  from a render-phase write (ticket 34) that reproducibly hung an in-flight
  re-check on a page where `subject` never changed at all. For the one frame
  between the new render and that effect running, every guarded child still
  reads the *previous* subject's settled, non-`waiting` decisions:
  `currentDecision` cannot help, because the atom has not been told the
  subject changed yet, so there is no re-check in flight for it to report as
  pending. This is narrower than the three situations in Context above (none
  of which involve a subject swap racing its own propagation) and is an
  accepted, distinct tradeoff of reverting to the effect, not a rule this ADR's
  mechanism already closes. On a genuine identity change (e.g. an account
  switch), the outgoing session's allows can render for one frame; see
  [BEH-QD-067](../behaviors/09-react.md#beh-qd-067-provider) and the react
  integration guide's [§8](../appendices/react-integration.md#8-re-checking-after-authority-changes)
  for where this is disclosed to a consumer.

**Trade-off accepted**: the flash is visible and harmless; a stale allow is
invisible and is a grant nobody authorised. Where the flash matters — a control
that would jump on every refresh — `useDecision` gives the caller the raw
result and the choice.

**Related**: [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)
makes the same argument about absent configuration. This is the same principle
applied to absent *currency*: not knowing yet is never a grant.
