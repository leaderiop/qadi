# ADR-QD-040 — An unwired port names its own absence, because a denial that guesses sends the reader to the wrong system

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-040                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-08-23): Initial release (CCR-QD-055) |

_Extends: [ADR-QD-020](./020-decision-history-port.md), which made the history
port three-valued and explicitly left the relationship port boolean._

---

## Context

`hasRelationship("owner")` evaluated with nothing wired denied with:

> `subject 'u1' has no 'owner' relation to 'doc-1'`

That sentence is a claim about the contents of a graph. Under
`RelationshipResolverNever` — the default, and what every caller who has not yet
wired ReBAC is running — no graph was consulted, and there may be no graph at
all. The reader is told their data is wrong when their **wiring** is missing, and
the two have entirely different fixes.

This is not a hypothetical reading of the text. It is the denial `AccessDenied`
carries into a caller's error handler ([BEH-QD-054](../behaviors/07-enforcement.md)),
the sentence `renderTrace` prints, and the string a `Can` fallback shows a user
since [BEH-QD-072](../behaviors/09-react.md). It is also the *first* thing anyone
integrating ReBAC sees, because the unwired state is the state they start in.

[ADR-QD-020](./020-decision-history-port.md) had already met this shape and
solved half of it. It named `RelationshipResolverNever` answering `false` "the
exact counterpart" of `DecisionHistoryUnknown` answering `"Unknown"`, then made
only the history port three-valued — correctly, on the argument it was making.
That argument was about **polarity**: `hasNotActed` is a negative test, so a
`false`-answering default *grants*, and no boolean default is fail-closed for
both polarities. `hasRelationship` has no negative counterpart, so `false` is
fail-closed and there was nothing left for that ADR to fix.

The residue is that a boolean cannot tell the *evaluator* which of two answers it
is holding. Safety was never the problem here; the sentence was.

## Decision

### The relationship port answers three ways, as the history port does

```ts
export type RelatedResult = "Related" | "Unrelated" | "Unknown";

export interface RelationshipResolverShape {
  readonly check: (
    request: RelationshipCheck,
  ) => Effect.Effect<RelatedResult, RelationshipResolveError>;
}
```

`"Unknown"` means *nobody can say* — no resolver is wired. A resolver that is
wired and unreachable is a `RelationshipResolveError`, which is an error and not
an answer. That is the same three-way split
[ADR-QD-020](./020-decision-history-port.md) drew for history, and the same one
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) draws everywhere
else.

| Port answers | `hasRelationship` | Denial reads |
| ------------ | ----------------- | ------------ |
| `"Related"` | allow | — |
| `"Unrelated"` | deny | `subject 'u1' has no 'owner' relation to 'doc-1'` |
| `"Unknown"` | deny | `no relationship resolver is wired, so no 'owner' relation to 'doc-1' can be confirmed` |

**The verdicts are unchanged.** Both new arms deny exactly where the boolean
denied, so [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) holds
as before and no decision anywhere moves. The entire observable difference is
which sentence a reader gets, which is why this ADR is about diagnosis rather
than about authorization.

`RelationshipResolverNever` **keeps its name**. It is accurate in outcome — every
`HasRelationship` policy under it still denies — and it is named in roughly forty
model documents whose examples would churn for nothing.
`relationshipResolverFromEdges` answers `"Unrelated"` for an edge it does not
hold, because a static list *is* the store and does know: the same closed-world
reading `decisionHistoryFromEvents` already takes.

### Widening the type was considered and is the worse option

The alternative was `RelatedResult = boolean | "Unknown"`. `Effect` is covariant
in its success type, so every existing implementation would stay assignable and
nothing would break.

**That is the argument against it.** Existing consumer code reads

```ts
if (yield* RelationshipResolver.check(request)) { /* treat as related */ }
```

and `"Unknown"` is truthy. Under the widening that keeps compiling and starts
reading an unwired port as *related* — a grant, introduced by a type change,
with no diagnostic and no compile error. The closed union turns every
implementation and every truthiness test into a build failure instead.

Source compatibility is not a safety property. In this library a loud break is
worth more than a quiet reinterpretation, and this is exactly the direction the
predecessor's defects ran.

### A denial's reason names only what was consulted

The relationship port is the case where the old sentence was outright false. The
same principle has a milder application one policy over.

`HasAttribute` denied with `subject attribute 'level' did not match` whether the
attribute held a wrong value or held nothing at all. Nothing there is *false* —
every matcher fails `undefined`, so "did not match" is true of it — but a
misconfigured or unwired `AttributeResolver` produces the absent case
exclusively, and the sentence gave the reader no way to see it. An absent value
now says so:

| Value | Denial reads |
| ----- | ------------ |
| present, compares wrong | `subject attribute 'level' did not match` |
| absent or unresolved | `subject attribute 'level' has no value` |

`HasResourceAttribute` gets the mirror. "has no value" rather than "is not set"
deliberately: an attribute present on the record with the value `undefined`
reaches the same branch, and "is not set" would be a claim about the record's
shape that this code has not checked.

The value itself is still never printed. The attribute *name* was already in the
sentence; its contents are the subject's data, and a reason travels to logs and,
through `AccessDenied`, into error handlers.

## Consequences

**Positive**:

- The unwired state — the state every ReBAC integration begins in — is now
  diagnosable from the denial text alone, in production, without a debugger and
  without dismantling enforcement wiring to re-run `decide`.
- Two ports, one shape. A reader who has learned `ActedResult` has learned
  `RelatedResult`, and [INV-QD-029](../invariants.md#inv-qd-029-a-denial-names-only-what-was-consulted)
  states the rule once for both rather than per port.
- The three-valued answer is expressible by real resolvers, not just by the
  default. A graph store with no namespace for a relation can answer `"Unknown"`
  for that relation and `"Unrelated"` for the rest; a boolean forced it to lie
  about one of them.

**Negative**:

- **Breaking.** Every `RelationshipResolverShape` implementation outside this
  repository must change, and every `if (check(...))` with it. All packages are
  0.x, so this rides a changeset `minor`, said plainly in the changeset. Three
  implementations inside the repository moved: `RelationshipResolverNever`,
  `relationshipResolverFromEdges` and `@qadi/testing`'s
  `edgeRelationshipResolver`.
- **`assert.isTrue` took `unknown`**, so seven test call sites compiled cleanly
  against the new union and failed only at run time. They were replaced with
  typed `assertRelated`/`assertUnrelated`/`assertUnknown` helpers, which cannot
  confuse `"Unrelated"` with `"Unknown"` — the distinction this whole change
  exists to draw. Worth recording: the compile error this decision was chosen
  *for* does not reach assertion helpers that accept `unknown`.
- **Three arms where there were two**, dispatched with `Match.value` rather than
  a `switch` — `SWITCH_BUDGET` in `scripts/check-house-style.mjs` pins
  `Evaluate.ts` at exactly two and gate 4
  fails on a third ([ADR-QD-034](./034-the-switch-exception-is-measured.md)).
  `Match.value` rebuilds per call; the arms close over `policy`, `subject` and
  `rawId`, so there is nothing to hoist, and the rebuild is noise against a
  service call that may be a graph traversal.

**Trade-off accepted**: a third value is harder to reason about than a boolean,
and every reader of `check` now has to learn that `"Unknown"` exists — the same
cost [ADR-QD-020](./020-decision-history-port.md) accepted, paid a second time
for a smaller benefit, since safety was never at stake here. It buys a library
whose first-run failure mode explains itself. The predecessor's documentation
problem was not that it said nothing; it was that it said things that were not
true.
