# 19 — Decision Hydration

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-19                                    |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.2 (2026-08-23): BEH-QD-152 added — a superseded seed is announced (ADR-QD-041, CCR-QD-056)<br>1.1 (2026-08-23): BEH-QD-151 added — a seed is superseded by this client's own answer; BEH-QD-148 scoped and BEH-QD-149 restated (ADR-QD-039, INV-QD-028, CCR-QD-052)<br>1.0 (2026-07-26): Initial release (CCR-QD-029) |

_Previous: [18 — Policy Explanation](./18-explanation.md)_

---

## BEH-QD-145: Two pure functions, no React

> **See:** [ADR-QD-028](../decisions/028-decision-hydration.md)

```ts
export const dehydrateDecisions: (
  entries: ReadonlyArray<DecisionEntry>,
  options?: DehydrateOptions,
) => DehydratedDecisions;

export const hydrateDecisions: (
  atoms: QadiAtoms,
  dehydrated: DehydratedDecisions,
  subject: AuthSubject,
) => InitialValues;
```

```
REQUIREMENT: Both functions MUST be synchronous and free of React imports.
             `hydrateDecisions` MUST return a value assignable to
             `QadiProviderProps.initialValues`.
```

Seeding through `initialValues` rather than an effect after mount is the whole
point: a value written after mount shows the pending state for a frame, which is
the problem being solved.

## BEH-QD-146: A payload is bound to one subject, and fails closed

> **Invariant:** [INV-QD-022](../invariants.md#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it)

```
REQUIREMENT: `DehydratedDecisions` MUST carry the subject id its decisions were
             made for.
```

```
REQUIREMENT: `hydrateDecisions` MUST seed nothing when that id is not the
             hydrating subject's, and MUST NOT throw.
```

The failure mode is a page cached or reused across users: one subject's allows
seeding another's registry, which is a privilege escalation with no lookup to
catch it. A refused payload leaves every atom `Initial`, so the client asks
properly — the page flashes, which is what would have happened without hydration
and is the correct outcome for a payload that cannot be verified.

Not throwing is deliberate. A cache misconfiguration turning into a blank page is
worse than re-deciding; trusting it would be a breach.

```
REQUIREMENT: `dehydrateDecisions` MUST drop any entry whose decision belongs to a
             different subject than the payload's.
```

```
REQUIREMENT: `hydrateDecisions` MUST drop any entry whose policy does not decode.
```

The payload is untrusted input on the client, so a malformed entry gets the same
treatment as a mismatched subject.

## BEH-QD-147: The trace is withheld by default

```
REQUIREMENT: A dehydrated decision MUST NOT carry its trace or a denial's reason
             unless `includeTrace` is set.
```

A `Trace` names every node's `policyTag`, its `label`, and the sentence explaining
why it refused — the policy's internal structure plus which branch *this* subject
failed, shipped to a browser where any script on the page can read it.

The default is the safe direction, which is how every default in this library is
chosen ([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)) — here
applied to information rather than to decisions.

```
REQUIREMENT: Obligations MUST be carried, and this MUST be documented as a
             disclosure the caller controls.
```

A UI that has to discharge a duty needs to know about it, so redacting obligations
would break the feature rather than protect it. Qadi cannot tell a sensitive
obligation attribute from an ordinary one, so a caller putting secrets there must
not hydrate that policy.

## BEH-QD-148: A hydrated decision is a projection, not a copy

```
REQUIREMENT: A hydrated decision MUST carry the same verdict, the same
             `visibleFields` and the same obligations as the server's.
```

```
REQUIREMENT: It MUST keep the server's `evaluationId`.
```

Correlating a client-side decision with a server-side log entry is the one thing
an identifier is for. `durationMillis` is likewise the server's, and is preserved
rather than zeroed so it cannot be mistaken for a client measurement.

> **Scope, amended in CCR-QD-052.** This is a requirement on the payload and on
> the decision rebuilt from it — not a guarantee about what a consumer will read.
> Per [BEH-QD-151](#beh-qd-151-a-seed-is-superseded-by-this-clients-own-answer) a
> seed is superseded the moment this client answers, and for a policy that
> evaluates synchronously that is the first read — so the id observed is the
> client's own. That is the honest outcome: the decision on screen is the one this
> client made. The correlation remains available wherever the seed is what is
> being read, which is every asynchronously-evaluated policy and any point before
> the subject is known.

The type is named `DehydratedDecisions` rather than `ReadonlyArray<Decision>`
because the trace is reduced — a name that admits it is a projection.

## BEH-QD-149: A seeded decision is a decision, not a pending state

> **See:** [ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)

```
REQUIREMENT: While a seed is what a consumer reads, it MUST read as an
             `AsyncResult` success that is not `waiting`, so `currentDecision`
             returns it.
```

A seeded *denial* must read as a denial rather than as "not decided yet"; those are
different answers and the whole of `currentDecision` is keeping them apart.

> **Restated in CCR-QD-052.** The requirement was written as "a seeded value MUST
> be an `AsyncResult` success", which described where the value was stored rather
> than how it reads. A seed is now held as a `Decision` in its own atom and lifted
> into a non-`waiting` success by the atom a consumer reads
> ([ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md)). The observable
> requirement is unchanged; what it constrains is now the reading rather than the
> storage.

## BEH-QD-150: Policies identify themselves structurally

```
REQUIREMENT: A payload MUST identify each policy by its serialized form, not by a
             caller-supplied key.
```

Hydration re-parses the policy and looks up the seed atom standing behind
`atoms.decision(policy)`. That works because `Atom.family` keys **structurally**
([BEH-QD-071](./09-react.md)): a policy parsed on the client is a different object
from the one the server evaluated, and equal, so it maps to the same atom.

The structural keying that once looked like an implementation detail is what makes
hydration expressible without a caller-maintained key registry — and a key registry
is rejected precisely because nothing would check that a key referred to the policy
the server actually evaluated.

## BEH-QD-151: A seed is superseded by this client's own answer

> **See:** [ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md),
> [INV-QD-028](../invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer)

```
REQUIREMENT: Once this client has produced a decision of its own — an allow, a
             denial, or a failure — that decision MUST be what every consumer
             reads, and the seed MUST NOT be read again.
```

```
REQUIREMENT: A seed MUST NOT be read while a re-check is in flight, and MUST NOT
             cover a client-side evaluation failure.
```

A seed is a first-paint cover, not an authority. The server answered earlier, with
its own resolvers, about a subject whose grants may since have changed; this
client's answer is the current one and supersedes it.

The two negative clauses are where the rule earns its keep. A re-checking result
already carries its own previous decision, so falling back to the seed there would
resurrect something older still. And a failure means the client could not answer —
covering it with the server's allow would report an outage as permission, which is
[INV-QD-006](../invariants.md) in reverse.

For a policy that evaluates synchronously — every policy needing no resolver — the
client answers on the first read, so the seed is never observed at all. That is not
a defect: there is no flash to cover when the answer is already there.

The predecessor of this rule was an assumption rather than a requirement, and it did
not hold. Seeding the decision atom directly placed the seed under `AtomRegistry`'s
`preserveInitialValueOnBuild`, which keeps a seeded value over the one the node
computes; a synchronous evaluation publishes by returning, and was discarded. A
subject kept an allow they no longer qualified for, for the life of the page.

## BEH-QD-152: A superseded seed is announced

> **See:** [ADR-QD-041](../decisions/041-a-mismatch-is-announced.md)

```ts
export interface HydrationMismatch {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly seeded: Decision;
  readonly decided: Decision;
}

export type HydrationMismatchReporter = (mismatch: HydrationMismatch) => void;
```

```
REQUIREMENT: When this client's own answer disagrees with the seed, that
             disagreement MUST be reported once, and MUST NOT change the outcome.
```

[BEH-QD-151](#beh-qd-151-a-seed-is-superseded-by-this-clients-own-answer) made the
client's answer win, silently. Seen from outside, a mismatch is a guarded control
that renders on first paint and disappears on hydration — on every page, with no
explanation. The usual cause is not a grant that changed in the last two hundred
milliseconds; it is a client wired differently from the server, most often one
with no `RelationshipResolver` where the server has one. A configuration error
presenting as a rendering glitch is close to the worst available presentation for
it.

```
REQUIREMENT: A mismatch is a difference of VERDICT. Two allows differing in
             visible fields or obligations MUST NOT be reported.
```

```
REQUIREMENT: A client-side FAILURE MUST NOT be reported as a mismatch.
```

The client could not answer, so there is nothing for the server's answer to
disagree with; reporting one would be
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) in reverse. This
is the rule [BEH-QD-072](./09-react.md) applies to a function `fallback`, at a
different surface.

```
REQUIREMENT: The default reporter MUST be development-only. A supplied
             `onHydrationMismatch` MUST replace it and MUST run in production.
```

The default is a `console.warn`, which is what a developer who has read no
documentation needs at the moment they need it. The callback exists because a
server and a client disagreeing about an authorization question is signal worth
reporting in production — it can indicate a page cached and served to the wrong
user as readily as a wiring error.

The message names the policy from **`decided.trace`**, never from `seeded.trace`:
a hydrated trace is a reduced projection whose `policyTag` is the server's root,
and without `includeTrace` it is a stand-in naming nothing
([BEH-QD-147](#beh-qd-147-the-trace-is-withheld-by-default)). Its trailing clause
is `decided.reason`, which is where
[BEH-QD-045](./06-services.md) pays off: a client with no relationship resolver
says so there, turning "why did this button vanish" into an answer in one line.

---

_Previous: [18 — Policy Explanation](./18-explanation.md)_
