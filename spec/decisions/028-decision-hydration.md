# ADR-QD-028 — A hydrated decision is bound to a subject and carries no trace

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-028                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-029) |

---

## Context

`QadiProvider` accepts `initialValues`, which is the hook a hydration story would
use, but nothing encodes decisions on the server or seeds them on the client. So a
server-rendered page shows every guarded control in its pending state and
re-decides after mount — a visible flash, and a round trip per policy the page
already knows the answer to.

The [roadmap](../roadmap.md) has carried this as the last of the React gaps.

## Decision

**Two pure functions: `dehydrateDecisions` on the server, `hydrateDecisions` on
the client. The payload is bound to a subject id, and it carries no trace.**

```ts
export const dehydrateDecisions: (
  entries: ReadonlyArray<DecisionEntry>,
  options?: { readonly includeTrace?: boolean },
) => DehydratedDecisions;

export const hydrateDecisions: (
  atoms: QadiAtoms,
  dehydrated: DehydratedDecisions,
  subject: AuthSubject,
) => InitialValues;
```

Neither touches React, neither is an `Effect`, and the caller evaluates on the
server with the `decide` they already have.

### Bound to a subject id, and it fails closed

This is the part that matters. A hydration payload is **authorization state
crossing a network**, and the failure mode is a page cached or reused for a
different user: subject A's allows seeding subject B's registry, which is a
privilege escalation with no lookup to catch it.

```
hydrateDecisions drops every entry whose subjectId is not the hydrating
subject's, and seeds nothing for it.
```

Dropping rather than throwing, and dropping rather than trusting. A dropped entry
leaves its atom `Initial`, so the client asks the question properly — the page
flashes, which is the *correct* outcome for a mismatched payload and is exactly
what would have happened without hydration at all. Throwing would turn a cache
misconfiguration into a blank page; trusting would turn it into a breach.

### No trace, by default

A `Trace` carries every node's `policyTag`, its `label`, and the `reason` sentence
explaining why it refused. That is a description of the authorization policy's
internal structure, plus which branch a particular subject failed — shipped to a
browser, where it is readable by anyone with developer tools and by any script on
the page.

So a dehydrated decision's trace is replaced by a single node, and a `Deny`'s
reason by a fixed `"hydrated"`. `includeTrace: true` opts back in for callers who
want the client-side explanation and accept the disclosure.

**A hydrated decision is therefore not equal to the one the server made.** It
carries the same verdict, the same `visibleFields` and the same obligations — the
things a UI acts on — and a reduced explanation. That asymmetry is deliberate and
is why the type is `DehydratedDecisions` rather than `ReadonlyArray<Decision>`: a
name that admits it is a projection.

### Policies identify themselves, structurally

The payload carries each policy as JSON, and hydration re-parses it and asks
`atoms.decision(policy)` for the atom to seed.

That works because `Atom.family` keys **structurally**
([ADR-QD-017](./017-stale-decisions-are-not-decisions.md), pinned by
`v4-reactivity-smoke.test.ts`): a policy parsed from JSON on the client is a
different object from the one the server evaluated, and equal, so it maps to the
same atom. Reference keying would have made this impossible without a
caller-maintained key registry — the structural keying that looked like an
implementation detail turns out to be what makes hydration expressible.

## Alternatives considered

**Opaque caller-supplied keys.** `{ key: "canPublish", decision }`, with the
client mapping keys to policies. Rejected: it puts a naming scheme in the caller's
hands and nothing checks that the key on the client refers to the policy the
server evaluated. A mismatch would seed the wrong answer for the wrong question —
the same class of defect as the subject mismatch, with no way to detect it.

**Serializing the whole `Decision` with a `Schema` codec.** Rejected. It would
imply decisions are a wire format with compatibility obligations, and they are
not: the policy is the artefact that crosses trust boundaries (ADR-QD-002). A
decision is derived, per-request, and disposable.

**Seeding through a React component instead of `initialValues`.** Rejected:
`initialValues` already exists for exactly this, and seeding in an effect after
mount would show the pending state for a frame, which is the problem being solved.

**Shipping the trace by default, redacting on request.** Rejected on the same
grounds every default in this library is chosen: the safe direction is the default,
and disclosure is opt-in. INV-QD-007's reasoning applied to information rather than
to decisions.

## Consequences

The flash is gone for hydrated policies and remains for everything else, which is
the honest behaviour — hydration is per-policy, not per-page.

Two costs worth naming. `durationMillis` in a hydrated decision is the **server's**
duration, and `evaluationId` is the server's identifier; both are preserved
deliberately, the second because correlating a client-side decision with a
server-side log entry is the one thing an id is for. And a caller who puts secrets
in obligation `attributes` must not hydrate a policy carrying that obligation —
obligations *are* shipped, because a UI that must discharge a duty needs to know
about it, so redacting them would break the feature rather than protect it. That is
documented rather than defended against, because Qadi cannot tell a sensitive
attribute from an ordinary one.

---

_Related: [ADR-QD-017](./017-stale-decisions-are-not-decisions.md) · [ADR-QD-014](./014-react-via-atoms.md) · [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) · [Roadmap](../roadmap.md)_
