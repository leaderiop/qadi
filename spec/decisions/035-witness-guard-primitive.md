# ADR-QD-035 — A witness travels as a value, because `Context` cannot prove which permission it's for

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-035                                   |
> | Revision       | 1.0                                             |
> | Effective Date | 2026-08-22                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-08-22): Initial release (CCR-QD-041) |

---

## Context

Every one of Qadi's enforcing entry points — `assert`, `enforce`,
`enforceProjected`, `filter` — either runs the guarded work or hands over data,
and each refuses to do either when the policy denies
([INV-QD-009](../invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied)).
What none of them do is hand the caller anything usable *after* the fact: once
`enforce` has run, nothing in the type system distinguishes code that is
inside its guarded effect from code that merely runs later in the same
function, having forgotten to call it at all. That gap was tolerable while
every enforcing call wrapped the entire unit of work it protected. It stopped
being tolerable once `@qadi/http` needed a way to prove, at the specific point
a resource is mutated — not merely somewhere earlier in the same request — that
a policy check against *that* resource had actually succeeded.

The first design tried was a `Context.Service` minted per permission: a
factory function returning a memoized class keyed by the permission's string
key, so a handler could declare `Authorized<typeof writeDocument>` in its
requirement channel and only `guard` could supply it. It does not work
soundly. `Context` resolves services by runtime id, not structurally — storing
a heterogeneous collection of per-permission tag classes and retrieving one
for a caller's specific permission type has no way to prove the retrieved
class actually matches, short of an unsound cast at the retrieval boundary.
Every version of that design needed one. Given this codebase's stance on
casting (`AGENTS.md` forbids `as`/`any` outright), that ruled the whole
approach out rather than prompting a cleverer retrieval scheme.

## Decision

**A witness is a branded value, not a service, produced by one combinator in
`@qadi/core`:**

```ts
export type Authorized<P extends Permission> = Brand.Branded<{ readonly permission: P }, "Authorized">;

export const guard =
  <P extends Permission, EO = never, RO = never>(permission: P, policy: Policy, options?: EnforceOptions<EO, RO>) =>
  <A extends Resource, B, E, R>(
    resource: A,
    handler: (authorized: Authorized<P>, resource: A) => Effect.Effect<B, E, R>,
  ): Effect.Effect<B, E | EnforcementError | EO, R | EvaluationServices | RO> =>
    Qadi.enforce(policy, options)(Effect.suspend(() => handler(makeWitness(permission), resource)));
```

`guard` is built on the existing `Qadi.enforce`, not a parallel evaluation
path — the same obligation-discharge and denial handling every other
enforcing entry point shares. It differs from them in shape, not in
semantics: `enforce` wraps an already-constructed `Effect` and returns its
value unchanged; `guard` takes a resource and a handler *function*, and hands
the handler a witness as an explicit argument. `Authorized<P>`'s `permission`
field is real, not phantom, so a witness produced for one permission is not
assignable where a different permission's witness is required — the
per-permission distinctness the rejected `Context.Service` design was after,
recovered soundly and for free, because it falls out of ordinary structural
typing on a real field rather than out of runtime tag identity.

Passing the witness as a value rather than through `Context` also means
`guard` needs no framework to work: an HTTP handler, a queue consumer, and a
CLI command call it identically, and nothing about it depends on
`effect/unstable/http`.

### Naming

The glossary calls this a **Witness**, deliberately not two other words it
could have reached for:

- **Not "Capability".** `spec/models/04-capability.md` already ships that term
  with a specific, different meaning: holding a `Permission` token *is* the
  authority, with no policy to evaluate. A witness is closer to the opposite —
  proof that a full `Policy` evaluation (roles, attributes, relationships,
  rules, anything) succeeded for a specific resource. Reusing "Capability"
  for it would contradict an already-adopted model document.
- **Not "Aspect".** `spec/glossary.md`'s existing entry is precise: a function
  that wraps an `Effect` without changing its shape, citing `Qadi.enforce`
  itself as the example. `guard` does change shape — its input is
  `(resource, handler)`, not an `Effect`, and the handler receives an extra
  argument. Stretching `Aspect` to also cover it would be the vocabulary
  drift `spec/glossary.md`'s own preamble warns against.

## Alternatives considered

**A `Context.Service` minted per permission, in a registry.** Described above;
rejected for requiring an unsound cast at retrieval.

**One shared `Context.Service` holding whichever permission was last
checked.** Sound to build, but useless for the actual guarantee wanted: a
single runtime tag cannot distinguish `Authorized<ReadDoc>` from
`Authorized<WriteDoc>` at the type level, so a handler expecting one
permission's proof would silently type-check against another's.

**Call it "Capability".** Matches informal industry usage and the term this
whole design used in early discussion. Rejected once `spec/models/
04-capability.md` was checked: it already names a different, shipped model,
and a second meaning for the same word in the same codebase is precisely the
defect `spec/glossary.md`'s preamble exists to prevent.

**Extend `Aspect`'s definition to cover `guard`.** Cheaper than a new term.
Rejected: `Aspect`'s definition is exact and already load-bearing elsewhere in
the glossary; loosening it to fit a combinator that doesn't share its shape
would make the term mean less for everything else that cites it.

## Consequences

**Positive**:

- The guarantee is checkable at the handler's own definition, not deferred to
  whether some `Layer` graph happens to wire a service correctly — a missing
  `guard` call is a type error where the witness-typed parameter is used, not
  a `Layer.Layer<..., R>` residual requirement discovered only when composing
  the whole application.
- Zero runtime cost beyond what `Qadi.enforce` already pays: a brand is
  compile-time-only, so `Authorized<P>` erases to `{ permission: P }` at
  runtime.
- Works identically outside HTTP — nothing in `guard`'s signature or
  implementation mentions a transport.

**Negative**:

- A brand is not adversary-proof: nothing stops application code from calling
  `Brand.nominal<Authorized<P>>()(...)` directly and forging a witness without
  ever calling `guard`. This is the same trust boundary Qadi already accepts
  for `RoleName`/`ActionName`/`EventName` in `Policy.ts` — validation and
  intent-signaling for code written in good faith, not a security boundary
  against a determined author within the same codebase.
- `guard`'s handler-as-argument shape means it cannot be used where the
  caller only has an existing `Effect` to guard and no natural place to
  restructure it into `(resource, handler)` — `Qadi.enforce` remains the
  right tool there. The two are siblings, not a replacement of one by the
  other.

**Trade-off accepted**: a witness that is only informally hard to forge is a
smaller guarantee than one enforced by the type system against a malicious
caller — but so is every brand already in this codebase, and the actual
threat this ADR addresses (a handler that *forgot* to check, not one that
deliberately fakes having checked) is fully covered by it.

---

_Related: [ADR-QD-002](./002-schema-derived-policy-adt.md) · [ADR-QD-011](./011-enforce-as-aspect.md) · [ADR-QD-032](./032-promise-facade.md) · [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) · [INV-QD-009](../invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied) · [Glossary](../glossary.md) · [Roadmap](../roadmap.md)_
