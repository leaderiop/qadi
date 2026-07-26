# 19 — Decision Hydration

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-19                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-029) |

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

The type is named `DehydratedDecisions` rather than `ReadonlyArray<Decision>`
because the trace is reduced — a name that admits it is a projection.

## BEH-QD-149: A seeded decision is a decision, not a pending state

> **See:** [ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)

```
REQUIREMENT: A seeded value MUST be an `AsyncResult` success that is not
             `waiting`, so `currentDecision` returns it.
```

A seeded *denial* must read as a denial rather than as "not decided yet"; those are
different answers and the whole of `currentDecision` is keeping them apart.

## BEH-QD-150: Policies identify themselves structurally

```
REQUIREMENT: A payload MUST identify each policy by its serialized form, not by a
             caller-supplied key.
```

Hydration re-parses the policy and asks `atoms.decision(policy)` for the atom to
seed. That works because `Atom.family` keys **structurally**
([BEH-QD-071](./09-react.md)): a policy parsed on the client is a different object
from the one the server evaluated, and equal, so it maps to the same atom.

The structural keying that once looked like an implementation detail is what makes
hydration expressible without a caller-maintained key registry — and a key registry
is rejected precisely because nothing would check that a key referred to the policy
the server actually evaluated.

---

_Previous: [18 — Policy Explanation](./18-explanation.md)_
