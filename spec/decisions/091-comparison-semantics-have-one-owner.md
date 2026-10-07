# ADR-QD-091 — Comparison semantics have one owner

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-091                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Accepted — amends ADR-QD-079, ADR-QD-040       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-10-07): `Compare.ts` is not reachable from outside `@qadi/core` (ADR-QD-099, CCR-QD-188)<br>1.0 (2026-10-05): Initial release (CCR-QD-172, CCR-QD-173) |

---

## Context

What `Eq`, `Neq`, `Gte`, `Lt` and membership *mean* — which operands count as absent, which numbers can be
compared, strict versus SameValueZero equality — was written three times, each with a comment claiming to
mirror the others:

| Rule | `Matcher.ts` (`evaluateMatcher`) | `Predicate.ts` (`evaluatePredicate`) | `RenderablePredicate.ts` (classifier) |
| ---- | -------------------------------- | ------------------------------------ | ------------------------------------- |
| an absent operand denies `Eq`/`Neq` (CCR-QD-112) | yes | yes | — (a table has no absent column) |
| `Gte`/`Lt` need numbers | yes | yes | yes (constant false) |
| the bound is finite (CCR-QD-120) | yes | via `isRangeBound` | via `isRangeBound` |
| the value is finite (CCR-QD-116) | yes | **missing** | **missing** |
| membership | `includes` | `includes` | literal split |

Every repair was a patch to one copy that the others then had to follow: CCR-QD-112 (absent operand),
CCR-QD-116 (finite value), CCR-QD-120 (finite bound). The fourth was not followed. `evaluatePredicate` never
checked the value side, and its comment said it did not need to, so `toPredicate` admitted `±Infinity` rows
that `evaluate` denied — a fail-open, and [ADR-QD-024](./024-predicate-output.md)'s named worst case
(CCR-QD-172). `RenderablePredicate.ts`'s `nullGuardFor` was the one place that worked: it asked the reference
(`evaluatePredicate(leaf, {[column]: null})`) instead of keeping a second belief.

The evaluator's denial reason had the same problem one level up. `evaluateMatcher` returned a boolean, so
`Evaluate.ts` re-derived which operand had been absent through `refIsUnresolved`, a second `ValueRef`
dispatcher kept in step with `resolveRef` by comment and applied to `Neq` only. `eq(subject("missing"))`
therefore read "did not match" about a comparison that never ran, which
[BEH-QD-045](../behaviors/06-services.md#beh-qd-045-a-denials-reason-names-only-what-was-consulted) forbids.

## Decision

**(a) One internal module, `Compare.ts`, owns comparison semantics.** It holds `isFiniteNumber`, `holds`, and
one verdict function per comparison (`equalsVerdict`, `differsVerdict`, `atLeastVerdict`, `belowVerdict`,
`memberVerdict`, `dominatesVerdict`, and `compareVerdict` dispatching a `CompareOp` through a module-scope
table). It imports only `SecurityLabel.ts`, and stays out of the barrel (AGENTS.md §9): generic names like
`holds` would leak into the flat namespace, and the interface stays free to change while only core consumes
it. It is not reachable from outside `@qadi/core` (ADR-QD-099; it was the `@qadi/core/Compare` subpath until the `./*` export was removed).

**(b) A comparison answers with a closed five-way `Verdict`.** `Held | NotHeld | ValueAbsent |
ReferenceAbsent | Incomparable`, ordered: an absent value before an absent reference, both before
incomparability. String literals, so a verdict costs what a boolean does. A composite matcher reports only
its own absence and shape, never its inner matcher's reason.

**(c) `judgeMatcher` hosts the budgeted switch; `evaluateMatcher` is its adapter.** `judgeMatcher(self,
value, context): Verdict` is public (`Matcher.ts`, with `Verdict` re-exported there); `evaluateMatcher` is
`holds(judgeMatcher(…))` with an unchanged signature. `SWITCH_BUDGET` keeps `Matcher.ts` at 2;
`SWITCH_BUDGET_NAMES` and AGENTS.md §5a name `judgeMatcher`. Changing `evaluateMatcher`'s return type instead
was rejected: a non-empty string is always truthy, so every `if (evaluateMatcher(…))` would silently start
allowing.

This was benchmark-gated. Calling the imported verdict functions directly measured about 2.4× slower per
leaf under `vitest bench` — the module runner turns every imported binding into a getter — and module-local
bindings of the same function objects recovered it. Three runs before and after in one session (load
average 28–173), every `Compare.bench.ts` and `evaluate` workload landed within the baseline's run-to-run
spread (`matcher-heavy` 53.1k → 59.4k, `deep` 57.1k → 61.8k ops/s by `hz`), and `evaluatePredicate` over a
three-leaf conjunction got faster (403k → 585k ops/s).

**(d) `evaluatePredicate`'s leaves are the same verdicts.** `Compare` is `holds(compareVerdict(op, cell,
value))` and `MemberOf` is `holds(memberVerdict(cell, values))`, so a primitive matcher and its predicate leaf
are one function ([INV-QD-091](../invariants.md#inv-qd-091-a-primitive-matcher-and-its-predicate-leaf-are-one-function)).
`isRangeBound` is `isFiniteNumber` itself, by identity.

**(e) The denial reason reads the verdict.** `ValueAbsent` → "has no value"; `ReferenceAbsent` → "has no
reference value to compare against" (now for `Eq` and `Dominates` too, not only `Neq`); `Incomparable` → "is
not a value this matcher can compare"; `NotHeld` → "matched an excluded value" for a bare `Neq`, else "did not
match". `refIsUnresolved` is deleted, and the ED-03 ledger of `ValueRef` dispatch sites shrinks to four. The
sentences stay in `Evaluate.ts`: `Compare.ts` returns no prose. This amends
[ADR-QD-040](./040-an-unwired-port-names-its-absence.md)'s reason table.

**(f) Membership follows the absent-operand rule.** `memberVerdict` reports `ValueAbsent` before asking
`includes`, so `inArray([undefined])` no longer holds for an absent value and "an absent value never
satisfies a matcher" is total ([INV-QD-092](../invariants.md#inv-qd-092-an-absent-value-never-satisfies-a-matcher)).
Only reachable in process: JSON cannot carry `undefined`.

**(g) `@qadi/devtools` checks its witnesses against `judgeMatcher`.** `satisfyingValue` judges every leaf
witness before offering it, so BEH-QD-223 holds by construction whatever the comparison rules do next.

## Alternatives rejected

- **Boolean plus a separate "was an operand absent" query.** The smallest diff, and exactly the shape that
  drifted: two functions that must agree forever.
- **A three-way `Held | NotHeld | Unresolved`.** Cannot say *which* operand was absent, nor tell absence from
  incomparability (`gte(3)` on `"5"`).
- **Export `Compare.ts` from the barrel.** Freezes a seven-function interface into the public surface on day
  one; a renderer author can already differential-test against `evaluatePredicate` (BEH-QD-122).
- **Fold the rules into `PredicateLiteral.ts`.** That module is about what a renderer may bind; the matcher
  would then import a predicate module.
- **Keep `evaluateMatcher` boolean and only route its leaves through `Compare.ts`.** The reason would keep
  re-deriving after the fact; half the gain is lost. It was the bench fallback, not needed.

## Consequences

- Two public exports in `@qadi/core`: `judgeMatcher` and `Verdict`. `Compare.ts`'s functions get a "Not listed
  above" row in `spec/overview.md`.
- New denial texts for an unresolved `Eq`/`Dominates` reference and an incomparable value. The old rows are
  unchanged, so a log parser keyed on them keeps working; one keyed on "did not match" for those cases does
  not.
- `inArray([undefined])` denies an absent value (behavior change, in-process only).
- The equivalent mutants the copies carried (`other !== undefined` beside `value === other`; a `typeof` half
  beside `Number.isFinite`) are gone with the copies; a scoped Stryker run over `Compare.ts` and
  `judgeMatcher` kills all 192 mutants.
- A future comparison rule is one edit in `Compare.ts`, seen by both interpreters, the renderable classifier
  (through `evaluatePredicate`), the denial reason and devtools at once.
