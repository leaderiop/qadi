# ADR-QD-092 — A field strategy's meaning lives beside the field lattice

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-092                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Accepted — amends ADR-QD-030, ADR-QD-034; amended 2026-10-06 (rendering is total) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-10-06): amended — the "left alone" rendering item is closed: `renderExplanation` and `@qadi/devtools`' `inspect` name a value outside either union verbatim and say how it is evaluated, instead of throwing (CCR-QD-183)<br>1.0 (2026-10-05): Initial release (CCR-QD-174) |

---

> **Amendment (2026-10-06, rendering is total — CCR-QD-183):** the item
> Consequences recorded as left alone is closed. `renderExplanation` threw a
> `MatchError` for an `allOf`/`anyOf` of two or more parts whose `fieldStrategy`
> was outside the union and for a non-empty rule table whose `combining` was —
> the unknown string, every `Object.prototype` key and the empty string alike —
> which broke [BEH-QD-141](../behaviors/18-explanation.md)'s "MUST NOT fail".
> Worse than the throw, the cases that did not throw were dishonest: an empty or
> one-part `allOf`/`anyOf` under such a strategy rendered as if it granted its
> part's fields (`` exposing only `a` ``), when the evaluator grants none.
>
> **(g) Membership has one test per union, beside the table it guards.**
> `FieldLattice.ts` exports `isFieldStrategy` and `ShortCircuit.ts` exports
> `isCombining`: type guards over `unknown`, each an `Object.hasOwn` lookup in the
> module's own table (and `false` for a non-string). `fieldStrategyLaws` and
> `effectiveCombining` now read them, so the decision and the sentence cannot
> disagree about which values are outside.
>
> **(h) A rendering names the value and what it is evaluated as.** An
> `All`/`Any` whose strategy is outside the union gains, at every part count, the
> clause *", but exposing no fields: its field strategy "Xor" is outside the
> closed union and is evaluated fail-closed"* — an empty `allOf` included, which
> therefore stops being atomic and is parenthesised as a child. A rule table says
> *"the combining algorithm "Xor" is outside the closed union and is evaluated
> under DenyOverrides, so any applying deny row wins"*, naming whatever
> `effectiveCombining` answers rather than restating it. A string is quoted, so
> `""` and `"__proto__"` read as values; a non-string is shown through `String`,
> an object as "an object". An empty `anyOf` and an empty rule table deny whatever
> their value, so their sentences are unchanged. The known values keep their
> `Match.exhaustive`, reached only after the guard, so `SWITCH_BUDGET` is
> unchanged and a fourth value is still a compile error.
>
> **(i) The devtools inspector says the same.** `inspect`'s `detail` for such a
> node is the value verbatim plus *"(outside the union, evaluated fail-closed)"*,
> judged by `Schema.is` over `@qadi/core`'s public `FieldStrategy`/`Combining`
> schemas, since the law-table guards are not on the root surface a sibling
> package imports from (AGENTS.md §1). Which algorithm stands in is left to core's
> sentence rather than restated in a second package.
>
> Rejected: **`Match.orElse` on the known arms** — total, but loses the
> compile-time exhaustiveness `Match.exhaustive` gives for a fourth value, the
> trade (b) already declined. **Rendering the fallback instead of the value**
> ("any applying deny row wins" alone) — total and accurate about the decision,
> but hides that the policy is corrupt, which is the thing a reviewer most needs
> to see. **Throwing a typed error from `renderExplanation`** — it has no error
> channel by design (BEH-QD-141), and a reviewer shown nothing learns less than
> one shown the value.

---

## Context

What a `FieldStrategy` *means* was held in four places, each restating part of it:

| Fact | Where it lived |
| ---- | -------------- |
| the binary meet and join (`intersectFields`, `unionFields`) | `Decision.ts`, beside the trace schema and rendering |
| each strategy's n-ary merge, the fast `Union` path, the unknown-value answer | `Evaluate.ts`'s `mergeFields`, a budgeted `switch` on the literal union |
| "only `First` may stop an `anyOf` at its first allow" | a `Record` table of `ShortCircuit.ts`'s own |
| "a nested same-strategy composite may be absorbed" | a sentence in `Simplify.ts` about associativity |

Two of those disagreed with the switch, and both disagreements widened what a caller
could read. Both are reachable only for a policy built in process — decode rejects a
value outside the union ([ADR-QD-006](./006-field-strategy-always-encoded.md)) — the
same class as CM-07, which this project chose to fix and pin.

- **An `anyOf` on a prototype-key strategy granted every field.** `ShortCircuit.ts`'s
  bare `TABLE[strategy]` read an inherited member for `"toString"`, `"constructor"`,
  `"__proto__"` and `"hasOwnProperty"` — truthy — so the `anyOf` stopped at its first
  allowing child and returned that child's `undefined`, the lattice's top. This is
  the predecessor's defect [BEH-QD-035](../behaviors/05-evaluator.md) records,
  reborn one module over.
- **`simplify` changed `visibleFields`, against INV-QD-024.** Associativity was
  necessary but not sufficient: an empty `allOf` grants top, which is
  `Intersection`'s unit but `Union`'s absorbing element, and `First` has no unit. And
  a one-child composite under an unknown strategy (which merges to `[]`) was unwrapped
  to its child — from no fields to every field the child grants.

Two further findings came out of the same reading. `Intersection`'s bytes depended on
child order: two specs of one shape (`"title"`, `"title.**"`) compare `Equal`, and
the meet kept the right-hand operand's text, so swapping two `allOf` children swapped
the representative — while a doc comment claimed sorting made bytes track meaning. And
an unknown `combining` walked a rule table as `FirstApplicable` (`"Xor"`) or as an
algorithm with no decisive effect (`"toString"`), permitting where `DenyOverrides`
would deny; `toPredicate`'s `formulaFor` threw a `MatchError` on it outright.

## Decision

**(a) One internal module, `FieldLattice.ts`, owns the lattice and every strategy's
meaning.** It holds `VisibleFields`, `intersectFields`, `unionFields`, `mergeFields`,
`fieldStrategyLaws` and `StrategyLaws`. It stays out of the barrel (AGENTS.md §9);
`Decision.ts` re-exports `intersectFields`, `unionFields`, `mergeFields` and
`VisibleFields`, so `@qadi/core` and `@qadi/core/Decision` keep resolving.
`mergeFields` is new on the public surface, for the reason
[ADR-QD-029](./029-lattice-join-and-meet.md) gives for `join`/`meet`: a caller made to
reimplement it will get it wrong.

**(b) Each strategy is one row of an own-property law table.** A row is a closed
`StrategyLaws` record — `merge`, `decidedByFirst`, `emptyIsUnit`,
`singletonIsIdentity` — in a `Readonly<Record<FieldStrategy, StrategyLaws>>`, so a
fourth strategy is a TS2741 compile error. `fieldStrategyLaws(s)` reads it through
`Object.hasOwn` and answers a named fail-closed row for anything else: `merge` gives
`[]`, every law is `false`. `mergeFields(s, sets)` is `fieldStrategyLaws(s).merge(sets)`.
This replaces the `switch`, so [AGENTS.md §5a](../../AGENTS.md)'s budget goes from four
to three.

This was benchmark-gated (§5a, [ADR-QD-034](./034-the-switch-exception-is-measured.md)),
with the rule: take the table if it is within 1.2× of the switch per dispatch and the
two field-heavy evaluations stay within run-to-run noise (≤ 10% on the mean of means).
Measured on 2026-10-05 under the user's own builds (load average 7–160), so as
ranges and medians, not figures. Per dispatch (`Dispatch.bench.ts`, `mergeFields — one
dispatch`, three strategies with the merge work each selects, three runs): switch
2.40 µs, table 2.33 µs (**≈0.97×**), `Match.value` 2.67 µs (≈1.1×). End to end, the
pre-move evaluator and the post-move one paired in one bench group per workload, six
runs (one-minute load ≈14–16): `field-heavy — allOf of 8 under Intersection` mean of
means 26.6 → 28.3 µs (+6.2%, one 41.6 µs outlier run; median p75 24.2 → 22.3 µs, median
throughput 42.0k → 43.3k ops/s); `field-heavy — anyOf of 8 under Union` 16.3 → 16.1 µs
(−1.0%); `one node` 11.5 → 10.0 µs; `wide` 12.1 → 11.6 µs. Both conditions held, so the
table was taken.

**(c) `Intersection` keeps the lexicographically smaller of two equal specs.** The
meet is byte-for-byte commutative and an n-ary fold byte-for-byte independent of
input order; disclosure is unchanged. The claim is "independent of child order", not
"canonical": an `undefined` operand still passes the other through as authored.
Canonicalizing every allow (sorting leaf `fields`, `First`'s pass-through) was
rejected: it would reorder the keys of every field-restricted projection for no
disclosure gain.

**(d) `Simplify.ts` asks the lattice's laws.** An empty nested `allOf` is absorbed
only when `emptyIsUnit` holds (`Intersection`), and a one-child composite is unwrapped
only when `singletonIsIdentity` holds (the three known strategies). An empty nested
`anyOf` is still absorbed — it denies and contributes no field set — and that clause
stays in `Simplify.ts`, because it is a fact about the combinator, not the lattice.
This amends [ADR-QD-030](./030-policy-simplification.md).

**(e) `ShortCircuit.anyOfStopsAtAllow` is an adapter over `decidedByFirst`.** Both
interpreters still read their stop rule from `ShortCircuit.ts`
([ADR-QD-077](./077-both-interpreters-read-ports-through-one-module.md)); only the
source of the fact moved, and the fail-closed answer is the lattice's. The evaluator's
`stepAnyOf` keeps returning the first allowing child's set directly — that *is* the
merge under `decidedByFirst` — rather than allocating a one-element array to call it.

**(f) An unknown `combining` decides as `DenyOverrides`.** `ShortCircuit.ts`'s
`effectiveCombining` maps a value outside the union to `DenyOverrides`;
`rulesDecisiveEffect` and `toPredicate`'s plan both read it, so both interpreters stop
and translate the same way. `DenyOverrides` is the one fallback that cannot permit
what the author's lost algorithm would have refused.

## Alternatives rejected

- **Move the switch as is (D-12-b(a)).** No dispatch risk, but each strategy's meaning
  stays split across switch arms and law rows in one file, and an unknown value is
  handled twice. It was the measured fallback; the measurement did not call for it.
- **A hoisted `Match.type<FieldStrategy>()`.** `Match.exhaustive` throws `MatchError`
  on an unknown value — a defect in an authorization path (AGENTS.md §4) — and
  `Match.orElse` loses compile-time exhaustiveness. It measured slowest of the three.
- **Keep `mergeFields` internal.** No new surface, and a caller composing decisions by
  strategy reimplements it: ADR-QD-029's failure mode, kept on purpose.
- **Grow `Decision.ts` instead of a new module.** Smallest diff; leaves a mixed module
  and no obvious home for the laws.
- **Never absorb an empty composite, never unwrap an unknown strategy.** Simpler, but
  gives up a sound `Intersection` flatten, and `Simplify.ts` keeps its own copy of the
  reasoning.
- **Make `Union`'s empty merge `[]`, its algebraic unit.** Textbook-correct, and
  changes `evaluate`'s output for `allOf([], { fieldStrategy: "Union" })` from every
  field to none — a narrowing behaviour change against a pinned test.
- **Delete `anyOfStopsAtAllow` and read the lattice directly.** One hop fewer, and
  reverses ADR-QD-077's single home for stop rules.
- **Document today's unknown-`combining` behaviour.** Leaves a corrupted rule table
  able to permit what its author's algorithm denied.

## Consequences

- `SWITCH_BUDGET` drops from four to three (`Evaluate.ts: 1`); AGENTS.md §5a's table
  loses the `mergeFields` row and keeps its history.
- The law table's literals are evaluated at module load, so Stryker does not mutate
  them ([ADR-QD-076](./076-mutation-runs-skip-static-mutants.md)). `FieldLattice.test.ts`
  asserts every row's flags exactly and checks each flag against the merge it
  describes, so a lying flag fails a property rather than only an example.
- One new public export, `mergeFields`; `fieldStrategyLaws`, `StrategyLaws` and
  `effectiveCombining` get "Not listed above" rows in `spec/overview.md`.
- `Allow.visibleFields` bytes change for `Intersection` over equivalent specs
  (`"title"` over `"title.**"`); hydration compares verdicts only, so no mismatch.
- `simplify` keeps one more node in the empty-child and unknown-strategy cases.
- `explain` still renders a strategy or combining value outside the union through a
  `Match.exhaustive` and throws. It is rendering, not a decision, and out of scope
  here; recorded so it is not mistaken for covered. **Closed by the 2026-10-06
  amendment above (CCR-QD-183):** it was `renderExplanation`, not `explain`, that
  threw, and it now names the value and how it is evaluated.
- A fourth strategy is one table row, and the compiler makes the row mandatory.

---

_Related: [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top) · [INV-QD-024](../invariants.md#inv-qd-024-simplification-changes-the-tree-and-nothing-a-caller-can-observe) · [INV-QD-093](../invariants.md#inv-qd-093-a-merge-discloses-nothing-its-inputs-did-not) · [BEH-QD-018](../behaviors/03-policy-adt.md) · [BEH-QD-035](../behaviors/05-evaluator.md) · [BEH-QD-112](../behaviors/15-rules.md) · [BEH-QD-154](../behaviors/20-simplification.md)_
