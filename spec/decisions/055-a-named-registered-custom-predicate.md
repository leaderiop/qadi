# ADR-QD-055 — A named, registered custom predicate: the policy tree's one escape hatch

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-055                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-25): Initial release (CCR-QD-082) |

---

## Context

[ADR-QD-002](./002-schema-derived-policy-adt.md) closed the policy union
deliberately: every node is declarative, so a policy stays serializable,
`explain`-able, and — since ADR-QD-024 — compilable to a `Predicate` a caller
can push into a query. That closedness has a real cost. `HasAttribute` and
`HasResourceAttribute` compare a value against `Matcher.ts`'s fixed vocabulary
(`eq`, `gte`, `contains`, `fieldMatch`, …), and some authorization conditions
do not reduce to a single comparison against a reference at all — a
cross-check against an external system, a multi-step computation over more
than one field, logic an application already owns and does not want
re-expressed as a matcher tree.

Today the only way past that ceiling is a closure outside the library
entirely — a `(user, resource) => boolean` an application writes and calls
before or around `evaluate`. That closure is not a small workaround; it is
the exact shape ADR-QD-002 already rejected once. A condition that is a plain
function cannot be serialized (there is no representation of a closure's
body to write to JSON), cannot be explained (`explain` has nothing to walk),
and cannot be compiled by `toPredicate` (there is no AST node for
"call this function"). An application reaching for it has silently stepped
outside every guarantee choosing Qadi was for.

## Decision

Add **`HasCustom`**, a new policy leaf, and **`CustomPredicate`**, a new
required service that resolves it:

```ts
export const hasCustom: (
  name: string,
  params?: unknown,
  options?: FieldOptions,
) => Policy;

export interface CustomPredicateShape {
  readonly name?: string;
  readonly evaluate: (
    name: string,
    subject: AuthSubject,
    resource: Resource | undefined,
    params: unknown,
  ) => Effect.Effect<boolean, CustomPredicateError>;
}
```

`HasCustom` stores a **name**, never a function — the policy tree round-trips
through JSON exactly as every other node does, because there is nothing on it
that could fail to serialize. The logic itself lives behind
`CustomPredicate`, registered once, at the edge of an application, the same
place `AttributeResolver`/`RelationshipResolver` implementations already live.

**`CustomPredicate` is required, not optional.** The dividing line already in
this codebase is whether a service's answer can change an `Allow`/`Deny`
verdict: `DecisionCache`/`DecisionSink` cannot — one is a pure optimization,
the other a write-only side channel — so both are read through
`Effect.serviceOption` and absent from `EvaluationServices`
([ADR-QD-031](./031-decision-cache.md), [ADR-QD-044](./044-an-optional-decision-sink.md)).
`AttributeResolver`, `RelationshipResolver` and `DecisionHistory` can, so all
three are required members, each paying the same one-line
`CustomPredicateNone`-style wiring cost. `HasCustom`'s verdict depends
entirely on `CustomPredicate`, so it follows the required precedent — the
default `CustomPredicateNone` layer pays that same cost, once, for
applications that never reach for it.

**Two failure meanings, not one**, mirroring the split
`AttributeResolver.resolve`'s own doc comment already draws between an absent
value and a broken lookup:

- No registry wired at all — `CustomPredicateNone` — answers `false`. Not a
  failure: an intentional fail-closed default, the same shape every other
  unwired required port answers with
  ([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)).
- A registry **is** wired but has no entry for the given name —
  `customPredicateFromRecord`'s miss case — **fails** with
  `CustomPredicateError`, never denies. A populated registry missing one
  entry is a wiring mistake, most likely a typo in `hasCustom`'s `name`, and
  "failure is not denial" ([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial))
  applies to a misconfigured registry exactly as it does to a broken
  attribute lookup: reporting it as a denial would send whoever reads the
  decision to audit permissions instead of the typo.
- The registered function's own logic failing (an outage in whatever it
  calls out to) also surfaces as `CustomPredicateError` — never converted to
  a denial.

**`explain()` renders `HasCustom` as an honest, opaque leaf** — it names the
check (`custom predicate 'isOwner'`) without pretending to decompose logic it
cannot see. This is not a gap the way an unhandled tag would be: `explain` is
still total over `Policy` ([BEH-QD-138](../behaviors/18-explanation.md)), it
simply has nothing further to say about this one leaf, by construction.

**`toPredicate` refuses `HasCustom`**, using the refusal that already exists
for exactly this shape of problem — `PolicyNotTranslatable`
([ADR-QD-024](./024-predicate-output.md)) — rather than a new mechanism. A
registered predicate is opaque, externally-owned logic; folding it to a
resource-independent expression would be the "approximate rather than
refuse" failure mode ADR-QD-024 already rejected, one interpreter further in.

**A usage guardrail ships in the same change.** `scripts/check-house-style.mjs`
gains a `HAS_CUSTOM_BUDGET` — a named, exact-count allowlist of `hasCustom(`
call sites outside `packages/core/src` and `packages/testing/src`, checked in
both directions the same way `SWITCH_BUDGET` is (AGENTS.md §5a). This is not
incidental caution: an escape hatch with no friction becomes the default
path, and every policy that reaches for it opts out of `explain`ability and
SQL/Prisma pushdown at once. Making adoption a conscious, reviewed edit to a
named list — rather than a silent grep hit nobody is watching — is the
cheapest control available, and it is empty today: no shipped package outside
core/testing calls `hasCustom` yet.

## Alternatives considered

- **An inline closure directly in the policy tree**, the shape described in
  Context. Rejected outright: it is the exact unserializable,
  unexplainable, uncompilable form ADR-QD-002 already removed once, and
  readmitting it here would undo that decision through a side door rather
  than reopening it.

- **Extend `Matcher.ts` with more matcher kinds instead.** Workable for
  conditions that are still, structurally, a comparison against a reference —
  and the right answer for those. Rejected as a substitute for `HasCustom`
  because the conditions motivating this change are not comparisons at all:
  a cross-check against an external system or a multi-step computation has no
  single reference value a matcher could hold.

- **`CustomPredicate` optional, via `Effect.serviceOption`**, matching
  `DecisionCache`/`DecisionSink`. Rejected: those two are optional precisely
  because the evaluator's correctness never depends on them. `HasCustom`'s
  verdict depends on `CustomPredicate` entirely, which is the required-service
  line this codebase already draws, not the optional one.

- **Ship the node with no usage guardrail, and add one later if adoption
  becomes a problem.** Rejected: by the time overuse is visible, the policies
  reaching for it are already in production, and retrofitting discipline onto
  existing usage is strictly harder than declaring it from the first commit —
  the same reasoning `SWITCH_BUDGET` was enforced under from the start rather
  than added after a fifth `switch` appeared.

## Consequences

**Positive**:

- Closes a real expressiveness gap without reintroducing the drift defect
  ADR-QD-002 exists to prevent — the escape hatch is named, not hidden.
- The two-failure-meanings split gives a registry the same "wiring omission
  denies, wiring mistake errors" discipline every other resolver-shaped
  service already has, rather than inventing a new one.
- `@qadi/devtools`'s Wiring/ServicesPanel, `Capture`/replay, and the remedy
  sweep all gained deliberate, if intentionally shallow, support — a
  `HasCustom` node is visible in the wiring report and capturable for a
  what-if sweep, even though neither `explain` nor the remedy sweep can see
  inside it.

**Negative**:

- A `HasCustom` node is opaque to `explain()` beyond naming the check, and
  refused by `toPredicate` — a named, declared limitation, not a silent one.
- One more required service every `EvaluationServices` caller must wire —
  the same one-line `CustomPredicateNone` cost paid whenever a required
  service was added historically, but a cost nonetheless.
- The usage guardrail governs `packages/*/src` in this repository only. An
  application built on `@qadi/core` has no equivalent check unless it adopts
  the same pattern itself — stated as a limit of this ADR's own scope, not
  solved by it.

**Implemented**: BEH-QD-245–248 ([32 — Custom Predicates](../behaviors/32-custom-predicates.md)),
INV-QD-049–050, REQ-QD-031 (`features/features/custom-predicates/custom-predicates.feature`).
