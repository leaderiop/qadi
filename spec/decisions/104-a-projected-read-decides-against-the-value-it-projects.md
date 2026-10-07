# ADR-QD-104 — A projected read decides against the value it projects

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-104                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Accepted — amends ADR-QD-011, ADR-QD-043       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-08): Initial (ARCH-39, CCR-QD-203) |

---

## Context

`enforceProjected` evaluated a policy against `options.resource` and projected whatever
`self` resolved to. Its own doc admitted nothing checked the two against each other, and a test pinned the
consequence as a documented hazard: a policy with a "public" branch granting `secret` and
a "private" branch withholding it, evaluated against a public stub while `self` returned
the private record, projected the secret. The same shape appeared in the spec's label-based
model, which restated a record's classification as a stub beside the loader that returned it.

The library had no way to write a resource-scoped projected read without a second channel.
Omit `resource`, and a policy that reads one fails `MissingResource` (`hasResourceAttribute`,
`hasRelationship`) or decides blind (a custom predicate is handed `undefined`, so BEH-QD-245's
own example denied even its author). Pass it, and nothing checks it is the value projected.

`guard` had the same two-channel defect and was fixed under INV-QD-032. `@qadi/http`'s
`authorizeRequest` already loads before it decides, and `@qadi/react`'s `useProjected` already
decides against the data it projects.

## Decision

- **Loaded siblings.** `enforceLoaded` (pass-through) and `enforceProjectedLoaded` (projected)
  run `self`, evaluate with its value as the resource, discharge, then pass through or project
  that same value. Every one routes through `permitted`, so obligation discharge, `AccessDenied`
  and the sink record stay one implementation (ADR-QD-019).
- **`enforceProjected` is resource-free** (**breaking**). Its options are `LoadedEnforceOptions`,
  the same type: `resource?: never`. It means "decide without a resource, then project", and
  passing one is a compile error that points at `enforceProjectedLoaded`. `enforce` is unchanged:
  it wraps work whose value is not a resource, so there is no second channel to reconcile.
- **Projected collections.** `filterProjected` and `filterStreamProjected` return each admitted
  item projected by its own decision. `filter` keeps returning items whole and BEH-QD-050 says so:
  an allow's `visibleFields` are not applied by it.
- **`@qadi/promise`** forwards the one-channel reads: `projected(subject, policy, record)` and
  `filterProjected`, each `run(subject, coreFn(...))` with no branch (ADR-QD-032).
- **The coarse gate is a composition, not an option.** `load.pipe(enforce(canReadAny),
  enforceProjectedLoaded(isOwner))` keeps a caller with no grant from reaching the loader. Two
  decisions, each with its own record and obligations; no `before` policy hidden in an option.

## Consequences

- ADR-QD-011's "the wrapped effect never runs" is about guarded *work*. For a loaded read the
  loader is the decision's input, and the guarantee is that the loaded value is never handed over.
- **The loader runs for a caller who is then denied.** Its side effects (a view counter, a "mark
  as read"), its failure (`NotFound` reveals existence to a caller who would have been denied) and
  its latency are observable. The library does not hide this; mapping "exists but denied" and "does
  not exist" to one response is the application's call, and the composed coarse gate removes it for
  callers with no access at all.
- A loader failure surfaces before any evaluation: no decision is taken and none is recorded.
- `enforceProjected` callers passing `resource` break at compile time (0.x minor).
- Rejected: changing `enforceProjected` to decide on `self`'s value (inverts ADR-QD-011 for every
  caller, including the resource-free majority, and opens an existence oracle on every current call
  site with no compile signal); making `resource` required and typing it to `self`'s `A` (catches
  "forgot", not "passed a different record of the same type", which is the defect); keeping
  `resource` on `enforceProjected` and re-deciding on the loaded value (two evaluations, two
  records and two discharges of possibly the same obligation).
