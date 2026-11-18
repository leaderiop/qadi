# ADR-QD-166 — One module owns the value a leaf compares

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-166                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-18                                     |
> | Status         | Accepted — extends ADR-QD-091, ADR-QD-024      |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-18): Initial release (ARCH-100, CCR-QD-444) |

---

## Context

A decoded policy is untrusted input and may name any key: an attribute, a column, a `SubjectRef`/`ResourceRef` path or a
`FieldMatch` field. `JSON.parse` gives an object its own `__proto__` key without touching its real prototype, so an own
key is data and an inherited `Object.prototype` member is not. Nine readers of such a key each restated that rule, and
the restatements were kept in step by comments that said they mirrored one another.

The reference interpreter's `Compare` and `MemberOf` arms did not restate it. They read `row[column]` bare, so a column
named `constructor` read the inherited function. The roadmap's probe: `hasResourceAttribute("constructor",
neq(literal("x")))` on `{ id: "r1" }` was **denied** by `evaluate` (an inherited member reads as absent, and an absent
value never satisfies a matcher, INV-QD-092) and **admitted** by `evaluatePredicate(toPredicate(…))`, because the
function is a present value that differs from `"x"`. That is [INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)
violated at a leaf, in the direction [ADR-QD-024](./024-predicate-output.md) names as the worst case: the row filter
admits a row the evaluator denies. [ADR-QD-091](./091-comparison-semantics-have-one-owner.md) gave a comparison one
owner and the invariant that followed, INV-QD-091, claimed the two interpreters "cannot disagree by construction", but
it covered what a comparison *means*, not what it *compares*.

Looking for the same shape elsewhere found two more bare reads, both in fixture builders, and both fail-open or worse
than the defect that started the phase:

- `attributeResolverFromRecord` (`packages/core/src/AttributeResolver.ts`) answered `table[attribute]`. On the built
  library, `evaluate(hasAttribute("constructor", neq(literal("x"))))` **allowed** under
  `attributeResolverFromRecord({ dept: "eng" })` and denied under `AttributeResolverNone`: a fail-open in `evaluate`
  itself, in the configuration its doc calls "useful for tests and fixed configuration".
- `customPredicateFromRecord` (`packages/core/src/CustomPredicate.ts`) read `table[name]`. `hasCustom("constructor")` and
  `hasCustom("toString")` **died** ("Fiber.runLoop: Not a valid effect") and `hasCustom("hasOwnProperty")` failed with a
  `TypeError` message ("Cannot convert undefined or null to object"), where the documented answer is a
  `CustomPredicateError` "no predicate is registered under this name". An authorization decision must never become a
  defect (AGENTS.md §4).

Both builders feed `PORT_FIXTURES` (`Ports.ts`), which `@qadi/testing`'s review layer and devtools' Fixtures simulation
use.

## Decision

`packages/core/src/Operand.ts` owns the value a leaf compares. It is package-private, beside `Compare.ts`: out of the
barrel (AGENTS.md §9) and not an entry point (ADR-QD-099). It is pure, synchronous and span-free, imports nothing, and
offers three functions:

- `ownValue(cell, key)`: the value at `key`, or `undefined` when `key` is not an own property.
- `isOwnKey(data, key)`: a type predicate (`key is keyof A & string`), true for an own key, one holding `undefined`
  included. It keeps "own key holding `undefined`" distinct from "no key" where a caller needs it: `readAttribute`
  consults the resolver only when the subject does not own the key, and `projectAt` keeps an own `undefined`.
- `getByPath(input, path)`: the dot-path own read, keeping the `indexOf` walk (no intermediate segment array).

Every interpreter and both fixture builders read a decoded key only through it
([INV-QD-351](../invariants.md#inv-qd-351-every-interpreter-and-both-fixture-builders-read-a-decoded-key-only-through-operandts)):

| Reader | File | Reads through |
| ------ | ---- | ------------- |
| `Compare`/`MemberOf` arms and the `SubjectRef` fold | `packages/core/src/Predicate.ts` | `ownValue`, `getByPath` |
| `getByPath` and the `FieldMatch` field read | `packages/core/src/Matcher.ts` | re-export, `ownValue` |
| `HasResourceAttribute` | `packages/core/src/Walk.ts` | `ownValue` |
| `readAttribute` | `packages/core/src/PortAccess.ts` | `isOwnKey`, `ownValue` |
| `projectAt` | `packages/core/src/FieldPath.ts` | `isOwnKey`, `ownValue` |
| the field-membership check | `packages/core/src/Decision.ts` | `isOwnKey` (`isFieldOf` is deleted) |
| `attributeResolverFromRecord` | `packages/core/src/AttributeResolver.ts` | `ownValue` |
| `customPredicateFromRecord` | `packages/core/src/CustomPredicate.ts` | `ownValue` |

The why is stated once, in `Operand.ts`'s header; the six comments that claimed to mirror one another are deleted and
the import is the pointer. An inherited member reads as absent, so a prototype-named key behaves like any other missing
key and denies ([INV-QD-352](../invariants.md#inv-qd-352-an-inherited-member-reads-as-absent)).

`getByPath` stays public and unchanged: `Matcher.ts` re-exports it (`export { getByPath } from "./Operand.ts"`), the
precedent `Verdict` set from `Compare.ts`, and `spec/overview.md`'s row says where it now lives. `Matcher.ts` and
`Predicate.ts` call module-local bindings of the imported reads on the hot path, the getter cost ADR-QD-091 measured.
The write guards stay where they are: `Object.create(null)` in `FieldPath.ts` and `Object.defineProperty` in
`Decision.ts` are writes of untrusted keys, not operand reads.

This extends ADR-QD-091: it owned what a comparison means and this owns what it compares, so INV-QD-091 now covers the
operand read as well as the verdict. It extends ADR-QD-024: the two walks stay two, and read a leaf's operand the same
way. The `SWITCH_BUDGET` switches (`evaluateNode`, `judgeMatcher`, `resolveRef`) are unchanged.

## Alternatives rejected

- **A `Present | Absent` result object.** It would allocate on every read, on the most frequently run path in the library
  (once per ref resolution, per matcher node, per evaluation, and once per element under `filter`); `ownValue` returns
  the value or `undefined`, and `isOwnKey` answers the one question that needs the distinction.
- **A house-style gate counting the own-property test.** The defect was a bare `row[key]`, which a count of
  `Object.hasOwn` cannot see. The enforcement is the agreement property over prototype names in `Predicate.test.ts` and
  `Operand.test.ts`.
- **A fourth export from `Operand.ts`, or exporting `Matcher.ts`'s `isObject`.** `isObject` stays private to the module
  that needs it for `getByPath`; no export is added to the public surface or removed from it.
- **Fixing only `evaluatePredicate`.** It closes the roadmap's probe and leaves two fixture builders that allow, die or
  fail with a `TypeError`, and a tenth reader the next time a key is read.

## Mutation

Measured with Stryker over the eight files that held a reader, plus `Operand.ts`, on the phase base and on the final
tree (one invocation, `node .planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-mutation.mjs`). A
touched file whose score falls passes only when its survivor set is unchanged and the fall is exactly the detected
mutants that moved into `Operand.ts`, where they are still detected. Scores are the unrounded stored values; "detected"
is killed plus timeout.

| File | Base score | After score | Detected before → after | Survivors unchanged |
| ---- | ---------- | ----------- | ----------------------- | ------------------- |
| `AttributeResolver.ts` | 1 | 1 | 22 → 22 | yes |
| `CustomPredicate.ts` | 0.9459459459459459 | 0.972972972972973 | 35 → 36 | no: one fewer (the unregistered-name reason, killed by the new test) |
| `Decision.ts` | 0.967741935483871 | 0.967741935483871 | 150 → 150 | yes |
| `FieldPath.ts` | 0.9347826086956522 | 0.9347826086956522 | 172 → 172 | yes |
| `Matcher.ts` | 0.9774774774774775 | 0.9748743718592965 | 217 → 194 | yes |
| `PortAccess.ts` | 1 | 1 | 47 → 47 | yes |
| `Predicate.ts` | 1 | 1 | 293 → 293 | yes |
| `Walk.ts` | 0.948051948051948 | 0.948051948051948 | 292 → 292 | yes |
| `Operand.ts` | none (new file) | 1 | 31 detected, 0 survivors | n/a |

Only `Matcher.ts` fell, and its survivor set is unchanged: the 23 detected mutants it lost are fewer than the 31 that
`Operand.ts` detects, because `getByPath` and its private `isObject` moved there. `CustomPredicate.ts` rose. Every other
score is equal. `Operand.ts` has no survivor, so none is named as equivalent. Two survivors sat beside an edited line
(`FieldPath.ts`'s `if (key === undefined) continue;`, `Decision.ts`'s `writable: true` / `configurable: true`); their
text did not change and they remain survivors, exactly as on the base.

## Consequences

- `evaluatePredicate` no longer admits a row through an inherited member: a column, attribute, path segment or field
  named `constructor`, `toString`, `__proto__`, `hasOwnProperty` or `valueOf` reads as absent on both sides, whether the
  row lacks the key or the key is the row's own (`JSON.parse`'s own `__proto__` is ordinary data).
- A row that is a class instance now reads its prototype getters as absent in `evaluatePredicate`, matching `evaluate`.
  No caller in this repository passes one; a caller outside it that does sees those columns as missing, which denies
  (INV-QD-092).
- `attributeResolverFromRecord` answers `undefined` for a name its table does not own, and `customPredicateFromRecord`
  fails with the documented `CustomPredicateError` for one, instead of allowing or dying. Both are fixes with no type
  change; `@qadi/core` takes a patch release.
- `getByPath` keeps its name, signature and behaviour and stays in `spec/overview.md`'s `Matcher.ts` row; no export is
  added or removed.
- The enforcement is [BEH-QD-603](../behaviors/16-predicates.md#beh-qd-603-the-two-interpreters-agree-on-prototype-named-keys)'s
  property (`PROPERTY: the two interpreters agree on prototype names, row by row`, beside the existing agreement
  property, whose generators are unchanged) and `packages/core/test/Operand.test.ts`.
- Lookups on a module's own closed table (`ShortCircuit.ts`, `FieldLattice.ts`, `GateState.ts`,
  `HydrationMetrics.ts`) and `SinkCodec.ts`'s envelope key reads are out of scope: they ask whether a word is a row of
  the module's own table, not what value a leaf compares.
