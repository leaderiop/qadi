# ADR-QD-019: An obligation is a condition on permission, carried by the allow that granted it

> **Status:** Accepted
> **Date:** 2026-07-26

## Context

A decision is `Allow | Deny` and nothing else. XACML returns "permit, provided
the access is logged"; purpose limitation is worthless without "allow, and record
the declared purpose"; risk-adaptive control's useful middle answer is "allow,
subject to re-authentication" rather than a refusal. Five model documents in the
[adoption matrix](../models/00-adoption-matrix.md) name this same absence as
**E2**, and unlike the action dimension it has no workaround: field visibility
expresses *redaction*, which is a restriction on what comes back, never a duty
the caller must discharge.

The shape has been sketched three times, identically, in
[26 — XACML](../models/26-xacml.md), [32 — UCON](../models/32-ucon.md) and
[17 — Purpose](../models/17-purpose.md):

```ts
interface Obligation {
  readonly id: string;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly advisory: boolean;
}

const obliged: (obligation: Obligation, policy: Policy) => Policy;
```

Those documents also record what they could not settle, and hand it here.
`AllOf` looked easy, `AnyOf` looked order-dependent, and **`Not` looked to have
no defensible answer at all** — negating "allow, and log this" produces a denial
carrying an obligation on something that did not happen. Three candidates were
offered (drop it, propagate it as advisory, or reject `obliged` under `Not` at
construction) with the note that each reads differently in a trace.

## Decision

### The principle

**An obligation is a condition attached to permission. The obligations on a
decision are those contributed by the allow that was actually returned.**

Everything else follows from that sentence, including the question that looked
hardest.

### `Not` needs no rule

The three-way choice dissolves once the principle is applied, because `Not`
never has an obligation set to decide about:

| Inner | `Not` returns | Obligations |
| ----- | ------------- | ----------- |
| Allowed | Deny | None — a denial permits nothing, so nothing is conditioned |
| Denied | Allow | None — the inner node never allowed, so it contributed none |

The question was hard only because it was framed as *"what does `Not` do to an
obligation set?"*. It is handed one in neither case.

What is lost in the first row — an obligation attached to a branch the negation
discarded — is **not lost silently**, which was the objection. The trace records
every node, including ones whose result was inverted, and obligations are
recorded on the trace node where they arose as well as on the decision. A
reviewer asking "was there an obligation on that branch?" reads the trace, which
is the mechanism this library already uses to answer "why".

### Composition

Two rules, and they are not the same rule field visibility uses.

- **`AllOf` that allows** — every child allowed, so every child's obligations
  apply. Union.
- **`AnyOf` that allows** — the obligations of the allowing children only.
  Union.
- **Anything that denies** — none.

**Obligations union; they never intersect.** This is the point at which the
sketches were wrong: [26 — XACML](../models/26-xacml.md) proposed "a merge policy
of exactly the kind `FieldStrategy` already encodes for fields". It is the
opposite kind. The two lattices point in opposite directions:

| | Empty set means | Narrowing is | Safe default |
| --- | --- | --- | --- |
| Visible fields | *nothing* visible; `undefined` is the top, meaning all | safe — less is disclosed | intersect |
| Obligations | *no* duties | **unsafe** — a duty a branch required goes undischarged | union |

Intersecting obligations would let a caller satisfy fewer duties than one of the
allowing branches demanded, which is a quiet grant. So `FieldStrategy` MUST NOT
govern obligations, and there is no `ObligationStrategy` to configure: union is
the only sound rule, and an option whose other settings are unsafe is not an
option.

### Short-circuiting is preserved, and the cost is stated

Under `AnyOf`'s default `First` strategy, evaluation stops at the first allowing
child, so the returned obligations are that child's — and the set therefore
depends on the order the author wrote the branches in.

That is accepted, not overlooked. Collecting from every allowing branch would
force exhaustive evaluation of any tree containing an obligation, repealing
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) invisibly:
a policy would become slower because someone attached a log line to it. An author
who wants every branch's obligations asks for every branch, with
`fieldStrategy: "Union"`, which already means "evaluate all of them".

### `enforce` must fail on an obligation it cannot discharge

The second real question, unasked by the model documents.

`Qadi.enforce` returns the guarded effect's value, not the decision. An
obligation would therefore be computed and thrown away — the caller would run
the protected work believing the policy permitted it, while the condition the
policy attached went undischarged. A deployment would hold an audit requirement
it does not meet and have no signal that it does not.

So:

```ts
export class UndischargedObligation extends Data.TaggedError(
  "qadi/UndischargedObligation",
)<{
  readonly subjectId: string;
  readonly obligationIds: ReadonlyArray<string>;
}> {}
```

`enforce` and `enforceProjected` MUST fail with it when an `Allow` carries a
non-advisory obligation and the caller supplied no handler for it. Advisory
obligations — XACML's *advice*, which a policy enforcement point may ignore —
pass through. Callers who want to discharge obligations pass a handler, or use
`decide`, which returns the whole decision and has always been the honest entry
point for anything that needs more than a boolean.

This is fail-closed in the sense of
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed): the default
behaviour of the convenient API refuses rather than proceeding on a permission
whose condition nobody has met. It changes no existing call, because no existing
policy carries an obligation.

### Obligations are data, never callbacks

Non-negotiable and worth stating where it cannot be missed. An obligation is a
value returned with a decision. The evaluator MUST NOT invoke anything.

The moment an obligation executes, evaluation has side effects; a policy that
denies would have run work on the way to denying, and
[INV-QD-009](../invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied)
— that a guarded effect does not run when denied — would be gone. The predecessor
shipped an `AuditTrailPort` that guaranteed nothing
([ADR-QD-016](./016-gxp-out-of-scope.md)); an obligation channel that ran code
would be the same mistake with a better name.

### `Deny` carries no obligations

XACML permits obligations on both Permit and Deny, and Qadi will diverge here
deliberately.

An obligation is a *condition on permission*. "Deny, and notify security" is not
a condition on anything — it is a reaction to a refusal, and the caller already
holds the `Deny`, its reason and its full trace, which is everything needed to
react. Adding obligations to `Deny` would also demand a second composition rule
with no clean answer: under `AllOf` the first denying child short-circuits, so
the set would be whichever branch happened to be written first; under `AnyOf`
every child denied, so it would be a union of duties arising from mutually
independent refusals.

Recorded as a divergence rather than an omission, so nobody re-derives it as a
gap.

## Consequences

**Positive**:

- The `Not` question that blocked E2 is answered by a principle rather than by a
  special case, so there is no rule to remember and no branch in the evaluator.
- No wire-format break for `Decision`. `Allow` and `Deny` are `Data.TaggedClass`
  values with no `Schema`, so adding `obligations` cannot reproduce the
  round-trip defect that motivated the rewrite.
- Purpose limitation gains the record that makes it accountable, and
  risk-adaptive control gains its middle answer, without either needing an audit
  port Qadi has refused to ship.

**Negative**:

- **`Obliged` is a codec change**, and the model documents understated this.
  "Adding a field to `Allow` is not a codec change" is true and irrelevant: the
  new *policy* node has a codec, so it is the same four coordinated edits any
  variant costs, plus the round-trip generator in `Policy.test.ts`
  ([INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)). E1 is the
  precedent for how that goes wrong — its `ActionRef` case had to be nested
  deliberately, because a leaf generator producing only policies never reaches a
  `ValueRef`.
- `Obligation.attributes` is `Record<string, unknown>`, so arbitrary JSON crosses
  the trust boundary inside a policy. `LiteralRef.value` is already `Unknown` and
  the precedent holds — a matcher constant is equally arbitrary — but it is one
  more place where "decoded successfully" does not mean "contains what you
  expect".
- Obligation sets are order-dependent under `First`. Defensible, stated, and a
  surprise to somebody eventually.
- `UndischargedObligation` widens the error surface, and `ERROR_CODES` is
  `satisfies Record<QadiError["_tag"], …>`, so it cannot be forgotten
  ([INV-QD-010](../invariants.md#inv-qd-010-error-codes-are-injective)).
- Deduplication needs a rule. The same obligation reached twice through a diamond
  must appear once; two obligations sharing an `id` with *different* attributes
  are two duties and must both survive. Identity is therefore the whole value,
  not the `id` — the same reasoning that gives `flattenPermissions` a visited set
  rather than a name check.

**Trade-off accepted**: obligations make a decision something the caller must
*act on* rather than merely read, and the library cannot verify that they were
acted on. Qadi can refuse to proceed when one is undischarged, which is the whole
of what a decision point can do; whether the logging actually reached durable
storage is beyond anything this library will claim. That limit is the same one
[17 — Purpose](../models/17-purpose.md) states about declared purposes, and it
should be quoted to anyone who reads an obligation as a guarantee.

**Implemented**, with the evidence the
[Definitions of Done](../process/definitions-of-done.md) require:
[11 — Obligations](../behaviors/11-obligations.md),
[INV-QD-012](../invariants.md#inv-qd-012-obligations-are-never-narrowed),
[INV-QD-013](../invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation),
`@REQ-QD-011`.

Three things building it added to what is written above.

**The refusal extends past `enforce` and `enforceProjected`.** `assert` and
`filter` enforce by the same test — one runs work as a precondition, the other
hands back data — so both refuse too. Leaving `filter` alone would have left a
hole precisely where obligations matter most: a row-level policy attaching "log
this access" to each visible row. It fails rather than dropping the row, because
dropping would report a wiring mistake as a denial
([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)). All four route
through one internal `permitted`, which is what makes INV-QD-013 an invariant
rather than four independent habits.

**`Trace.obligations` is required, not optional.** An optional field would have
meant a `?? []` at every read that no execution could take — visible in the
coverage report as branches nothing reaches. Every trace node has a set; empty is
the common case, like `children`.

**The `Not` claim is mechanically demonstrable, not merely argued.** Mutating the
evaluator to propagate `child.obligations` through `Not` kills no test — the
mutant is *equivalent*, because that expression is provably `[]` at that point.
"Needs no rule" and "any rule would be unobservable" turn out to be the same
statement, which is a stronger result than this ADR claimed.
