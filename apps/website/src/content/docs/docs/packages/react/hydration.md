---
title: Server-Render Hydration
description: Why hydration rechecks a server-rendered decision on the client and reports mismatches, rather than trusting stale server output or re-deciding in silence.
---

`QadiProvider` renders under `renderToString`. A policy needing no resolver
decides during that first, synchronous pass; a policy that reaches a resolver
cannot, however fast it is — `renderToString` is one synchronous pass — and
renders its `pending` node instead. `dehydrateDecisions` and `hydrateDecisions`
close that gap: two pure, synchronous, React-free functions that carry a
server's answers to the client so the first paint does not have to be a flash
of `pending`.

```ts
export const dehydrateDecisions: (
  entries: ReadonlyArray<DecisionEntry>,
  options?: DehydrateOptions,
) => DehydratedDecisions;

export const hydrateDecisions: (
  atoms: QadiAtoms,
  dehydrated: DehydratedDecisions,
  subject: AuthSubject,
  options?: HydrateOptions,
) => InitialValues;
```

`hydrateDecisions`'s result is assignable to `QadiProvider`'s
`initialValues` prop directly. Seeding through that prop, rather than through
an effect that runs after mount, is the whole point — a value written after
mount still shows the pending state for a frame, which is the problem being
solved.

## A decision being re-checked is not a decision

`@qadi/react` treats `AsyncResult`'s `waiting` flag as "not decided," even
when the value it is waiting to replace is a `Success`. The rule exists because
a decision can be re-checked for reasons that specifically invalidate the
previous answer: the subject signed out, a grant was just revoked, or the
subject was replaced and the new one's decision is still in flight. In each
case the value being held is the answer for an authority that no longer
applies, and showing it — even briefly, even labeled "last known" — is an
over-permission nobody authorized.

That is the same discipline hydration has to apply to a seed from the server:
a hydrated decision is a **first-paint cover**, not an authority. The server
answered earlier, with its own resolvers, about a subject whose grants may
have changed since. So once this client has produced its own answer — allow,
deny, or failure — that answer is what every consumer reads, and the seed is
never read again. A re-checking result already carries its own previous
decision, so falling back to the seed there would resurrect something even
older; and a seed never covers a client-side failure, because covering an
outage with the server's earlier allow would report the outage as permission.

For any policy that evaluates synchronously — everything needing no resolver —
the client answers on the very first read, so the seed is never observed at
all. There is no flash to cover when the answer was already there.

## Silently trusting stale output is not an option, and neither is silence about re-deciding

Two failure modes were rejected, not just one:

- **Trusting the server's seed indefinitely** would mean a client that never
  re-evaluates could keep granting powers the subject no longer has — the same
  problem re-checking exists to prevent, just moved to page load.
- **Re-deciding silently, with no report,** turns a real configuration problem
  into an invisible rendering glitch. A guarded control that renders on first
  paint and disappears once the client's own decision lands is easy to blame on
  "a grant that changed in the last two hundred milliseconds." The more common
  cause is a client wired differently from the server — most often one missing
  a `RelationshipResolver` the server has.

So a disagreement between the seed and the client's own answer is **reported**,
not hidden and not allowed to change the outcome:

```ts
export interface HydrationMismatch {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly seeded: Decision;
  readonly decided: Decision;
}

export type HydrationMismatchReporter = (mismatch: HydrationMismatch) => void;
```

Only a difference of *verdict* is reported — two allows differing in visible
fields or obligations is not a mismatch, and a client-side failure is never
reported as one, since there is nothing for the server's answer to disagree
with. The default reporter is a development-only `console.warn`; supplying
`onHydrationMismatch` (via `makeQadiAtoms`'s `QadiAtomsOptions`) replaces it and
runs in production too, since a server and client disagreeing about an
authorization question is signal worth watching in production — it can
indicate a caching bug serving one user's page to another as readily as a
wiring mistake.

## Bound to one subject, and every drop has a reason

A dehydrated payload carries the subject id it was produced for.
`hydrateDecisions` seeds nothing — without throwing — when that id does not
match the hydrating subject: the failure mode being guarded against is a page
cached or reused across users, where trusting the payload would be a privilege
escalation with no lookup to catch it. A refused payload leaves every atom
`Initial`, so the client re-decides properly; the page flashes, which is
exactly what would have happened with no hydration at all, and is the correct
outcome for a payload that cannot be verified.

Every other way `hydrateDecisions` can decline to seed an entry — an
unregistered atom set, a policy that no longer decodes, a payload naming the
wrong subject — is announced too, with a reason rather than a bare count, so a
developer can tell a server-side cache bug from version skew from a wiring
mistake at the call site. `dehydrateDecisions` likewise reports what it drops:
an entry belonging to a different subject than the payload's is dropped, and
silently would have been the wrong choice for the same reason.

A dehydrated decision withholds its trace and a denial's reason by default —
that detail names the policy's internal structure and which branch a specific
subject failed, which is not safe to ship to a browser unasked. Obligations
are carried regardless, since a UI that has to discharge one needs to know
about it; a caller who has put something sensitive in an obligation attribute
should not hydrate that policy.

See [ADR-QD-017](https://github.com/leaderiop/qadi/blob/main/spec/decisions/017-stale-decisions-are-not-decisions.md)
for the fuller argument, and [behavior 19](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/19-hydration.md)
for the normative requirements this page describes.
