# 04 — Matcher DSL

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-04                                    |
> | Revision       | 1.7                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.7 (2026-10-07): BEH-QD-304 gains `foldMatcherCases`, `MatcherCases`, `LeafMatcher` and `leafMatcherCases` — a wrapper arm receives its one child as `R` (ADR-QD-090 amendment, CCR-QD-190)<br>1.6 (2026-10-05): BEH-QD-027 corrected — `lt`'s value guard is load-bearing (`-Infinity < 3`), not cosmetic (CCR-QD-172); `inArray` denies an absent value; BEH-QD-028 lists `judgeMatcher` and `Verdict`; BEH-QD-305 added — comparison semantics have one owner (ADR-QD-091, CCR-QD-173)<br>1.5 (2026-10-04): BEH-QD-304 added (`foldMatcher`, `matcherDepth`) and `referencesAction`/`referencesResource` MUST be stack-safe (ADR-QD-090, CCR-QD-170)<br>1.4 (2026-09-08): `gte`/`lt` extended — both operands, not only the policy-authored bound, MUST be finite; the resolved value side was unguarded, so a `gte(...)` bound matched an `Infinity`-valued attribute regardless of the bound (issue #67, CCR-QD-116)<br>1.3 (2026-09-07): `Eq`/`Neq` corrected to deny on an absent operand on either side — `Neq` matched when a reference resolved to nothing, contradicting this document's own requirement; supersedes the "accepted as-is" call in commit `dab09bc`, which this document's Revision 1.2 never reflected (CCR-QD-112)<br>1.2 (2026-07-26): the `Dominates` matcher (CCR-QD-017)<br>1.1 (2026-07-26): `action()` value reference and `referencesAction` (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-025: Matchers are data

> **See:** [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)

Matchers contain no closures, so they serialize with the policy that holds them.
Like `Policy`, the `Matcher` type below is hand-written first, and the
`Schema.Codec` is built and type-asserted against it.

```ts
export type Matcher =
  | { readonly _tag: "Eq"; readonly ref: ValueRef }
  | { readonly _tag: "Neq"; readonly ref: ValueRef }
  | { readonly _tag: "Dominates"; readonly ref: ValueRef }
  | { readonly _tag: "In"; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "Exists" }
  | { readonly _tag: "Gte"; readonly value: number }
  | { readonly _tag: "Lt"; readonly value: number }
  | { readonly _tag: "Contains"; readonly value: unknown }
  | { readonly _tag: "FieldMatch"; readonly field: string; readonly matcher: Matcher }
  | { readonly _tag: "SomeMatch"; readonly matcher: Matcher }
  | { readonly _tag: "EveryMatch"; readonly matcher: Matcher }
  | { readonly _tag: "Size"; readonly matcher: Matcher };
```

## BEH-QD-026: Value references

```ts
export const subject: (path: string) => ValueRef;   // subject attributes
export const subjectId: () => ValueRef;             // the subject's own id
export const resource: (path: string) => ValueRef;  // resource fields
export const action: () => ValueRef;                // the request's verb
export const literal: (value: unknown) => ValueRef; // a constant
```

A comparison may target a constant, an attribute of the subject, the subject's
identifier, a field of the resource, or the action being performed. Together
these express relational rules such as "the document's owner is me":

```ts
hasResourceAttribute("owner", eq(subjectId()))
```

```
REQUIREMENT: `subject(path)` MUST address the subject's *attributes* only. The
             subject's identity MUST NOT be reachable through a path, because a
             reserved path would be shadowed by — or would shadow — an attribute
             that happened to share its name.
```

```
REQUIREMENT: `subjectId()` MUST be a distinct variant of the union rather than a
             reserved path or a magic string, so that it survives serialization
             as data and can never collide with an attribute name.
```

```
REQUIREMENT: Paths MUST be dot-separated and MUST yield `undefined` at any
             missing step rather than throwing. A reference that resolves to
             nothing denies; it is not an error, because an unset attribute is a
             legitimate answer rather than a policy defect.
```

```
REQUIREMENT: `Eq` and `Neq` MUST deny when either operand is `undefined` —
             the resolved reference, the value being compared, or both. An
             absent operand is unknown, not "equal to nothing"; asserting
             equality or inequality about an unknown would treat an
             unchecked attribute as though it had been checked (CCR-QD-112).
             This holds even for a `literal` reference explicitly
             constructed as `undefined`: `exists()` is the DSL's
             purpose-built way to test for absence, and `Eq` MUST NOT double
             as an implicit second one.
```

```
REQUIREMENT: `Eq` and `Neq` MUST guard only `undefined`, not `null` — a
             `null` operand is an ordinary, comparable value on either side,
             not treated as absent the way `exists()` treats it. `Eq`/`Neq`
             answer "does this equal that"; `exists()` alone answers "is this
             present", and its notion of absence MUST NOT leak into the
             comparison matchers.
```

```
REQUIREMENT: `Eq` and `Neq` compare non-primitive operands by reference
             (`===`), not structurally. Two structurally equal but distinct
             objects are therefore never `Eq`-equal, and are ALLOWED by
             `Neq` — `Neq`'s denial is not a structural-inequality guarantee.
             Deliberate, for the same reason `Eq`'s `NaN` divergence from
             `inArray` is deliberate (BEH-QD-027): `predicate-sql` cannot
             render an object operand at all, so there is no compiled query
             for a structural comparison to stay consistent with.
```

## BEH-QD-027: Constructors and semantics

```ts
export const eq: (ref: ValueRef) => Matcher;
export const neq: (ref: ValueRef) => Matcher;
export const inArray: (values: ReadonlyArray<unknown>) => Matcher;
export const exists: () => Matcher;
export const gte: (value: number) => Matcher;
export const lt: (value: number) => Matcher;
export const contains: (value: unknown) => Matcher;
export const fieldMatch: (field: string, matcher: Matcher) => Matcher;
export const someMatch: (matcher: Matcher) => Matcher;
export const everyMatch: (matcher: Matcher) => Matcher;
export const size: (matcher: Matcher) => Matcher;
```

```
REQUIREMENT: `exists` MUST distinguish absence from falsity. `0` and `""` exist;
             `null` and `undefined` do not.
```

```
REQUIREMENT: `gte` and `lt` MUST return false for non-numeric values rather than
             coercing. `"5"` does not satisfy `gte(3)`.
```

```
REQUIREMENT: `gte` and `lt` MUST return false unless BOTH operands — the
             policy-authored bound and the resolved attribute value — are
             finite. A `Matcher` crosses the same untrusted-JSON trust
             boundary a `Policy` does: JSON has no literal spelling for
             `Infinity`, but `1e400` decodes to it, on either side of the
             comparison. Guarding only the bound left `gte(3)` satisfied by
             an `Infinity`-valued attribute regardless of the bound
             (`Infinity >= 3` is `true`); `lt`'s mirror case is `-Infinity`,
             which `-Infinity < 3` admits, so both guards are load-bearing
             (CCR-QD-116, corrected in CCR-QD-172).
```

> **Corrected (CCR-QD-172).** The requirement above previously ended: "`lt`
> already failed closed in the mirror case, but is guarded the same way for
> consistency (CCR-QD-116)." It does not: the mirror of `Infinity >= 3` is
> `-Infinity < 3`, which is true, so without the value guard every `lt(…)` admits
> a `-Infinity` attribute. Nothing evaluated `lt(3)` against `-Infinity`, and a
> mutation dropping the guard survived. The same false belief, applied to the
> row side of `evaluatePredicate`, let `toPredicate` admit non-finite rows the
> evaluator denies (INV-QD-018).

```
REQUIREMENT: `inArray` MUST deny an absent (`undefined`) value, even when its
             list holds `undefined`. Membership is SameValueZero
             (`Array.prototype.includes`, so `NaN` is a member of `[NaN]`), but
             it is asked only of a present value: an absent value satisfies no
             matcher (INV-QD-092). Before CCR-QD-173 `inArray([undefined])` was
             the one matcher an absent value satisfied.
```

```
REQUIREMENT: `contains` MUST apply to arrays and strings only.
             `someMatch`, `everyMatch` MUST apply to arrays only.
             `size` MUST apply to arrays and strings only.
             Any other input type MUST yield false, never an error.
```

## BEH-QD-028: Evaluation is pure

```ts
export type Verdict = "Held" | "NotHeld" | "ValueAbsent" | "ReferenceAbsent" | "Incomparable";

export const judgeMatcher: (
  self: Matcher,
  value: unknown,
  context: MatcherContext,
) => Verdict;

/** `holds(judgeMatcher(self, value, context))` — whether the verdict is `Held`. */
export const evaluateMatcher: (
  self: Matcher,
  value: unknown,
  context: MatcherContext,
) => boolean;

export interface MatcherContext {
  /** The subject's attributes. Its identity is `subjectId`, kept separate. */
  readonly subject: Readonly<Record<string, unknown>>;
  readonly subjectId: string;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  /** What the caller is doing. `undefined` when none was supplied. */
  readonly action: string | undefined;
}

export const referencesAction: (self: Matcher) => boolean;
```

```
REQUIREMENT: Matcher evaluation MUST be synchronous and total. Attribute
             *resolution* may perform I/O, but it completes before a matcher
             runs, so matchers need no Effect.
```

Totality has a consequence the evaluator has to absorb. A matcher cannot report
that it lacked an input, so anything a matcher *needs* must be checked before it
runs. `referencesAction` is that check for the action; see
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one).

## BEH-QD-304: A matcher folds bottom-up, and its nesting is measurable

> **Invariant:** [INV-QD-090](../invariants.md#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack)
> **See:** [ADR-QD-090](../decisions/090-a-tree-is-folded-through-one-seam.md)

```ts
export const foldMatcher: <R>(
  self: Matcher,
  combine: (node: Matcher, children: ReadonlyArray<R>) => R,
) => R;

export const matcherDepth: (self: Matcher) => number;

export type LeafMatcher = Exclude<
  Matcher,
  { readonly _tag: "FieldMatch" | "SomeMatch" | "EveryMatch" | "Size" }
>;

export interface MatcherCases<R> {
  // one arm per leaf tag, each (node) => R
  readonly FieldMatch: (node: Extract<Matcher, { _tag: "FieldMatch" }>, child: R) => R;
  readonly SomeMatch: (node: Extract<Matcher, { _tag: "SomeMatch" }>, child: R) => R;
  readonly EveryMatch: (node: Extract<Matcher, { _tag: "EveryMatch" }>, child: R) => R;
  readonly Size: (node: Extract<Matcher, { _tag: "Size" }>, child: R) => R;
}

export const leafMatcherCases: <R>(
  f: (node: LeafMatcher) => R,
) => Pick<MatcherCases<R>, LeafMatcher["_tag"]>;

export const foldMatcherCases: <R>(self: Matcher, cases: MatcherCases<R>) => R;
```

```
REQUIREMENT: `foldMatcher` MUST combine a node only after its children, combine a
             shared subtree once, and MUST NOT exhaust the call stack for any
             nesting depth.
```

```
REQUIREMENT: `matcherDepth` MUST be 0 for a matcher with no wrapped matcher and
             one more than its wrapped matcher's depth for `FieldMatch`,
             `SomeMatch`, `EveryMatch` and `Size` — the way `evaluateMatcher`
             recurses.
```

```
REQUIREMENT: `foldMatcherCases` MUST hand a `FieldMatch`, `SomeMatch`, `EveryMatch`
             or `Size` arm exactly its one wrapped matcher's result, as `R` and
             not as an array, and otherwise behave as `foldMatcher` does.
```

```
REQUIREMENT: `referencesAction` and `referencesResource` MUST NOT exhaust the call
             stack for any matcher nesting depth.
```

A matcher assembled in process has no decode bound either, and every walker over
one recursed natively: `referencesAction(size^10000(eq(action())))` threw a raw
`RangeError`. `matcherDepth` is what `policyDepth` adds for a matcher-bearing leaf
([BEH-QD-191](./25-inspection.md)). `foldMatcherCases` is the `Matcher` twin of
`foldPolicyCases` ([BEH-QD-318](./25-inspection.md)); `foldMatcher` stays the form for a
fold that treats children alike, as `matcherDepth` and the two `references…` walkers do.

## BEH-QD-305: Comparison semantics have one owner

> **Invariant:** [INV-QD-091](../invariants.md#inv-qd-091-a-primitive-matcher-and-its-predicate-leaf-are-one-function), [INV-QD-092](../invariants.md#inv-qd-092-an-absent-value-never-satisfies-a-matcher)
> **See:** [ADR-QD-091](../decisions/091-comparison-semantics-have-one-owner.md)

What `Eq`, `Neq`, `Gte`, `Lt`, membership and dominance *mean* is stated once,
in core's internal `Compare.ts`, as a closed `Verdict`:

| Verdict | Meaning |
| ------- | ------- |
| `Held` | the comparison ran and was true |
| `NotHeld` | the comparison ran and was false |
| `ValueAbsent` | the value being tested is `undefined` |
| `ReferenceAbsent` | the value it is compared against (a resolved reference, a bound) is `undefined` |
| `Incomparable` | both are present, but one is not a value this comparison can compare (a non-number or non-finite number under a range, a non-label under dominance) |

```typescript
import { eq, gte, judgeMatcher, makeSubjectId, subject } from "@qadi/core";
import type { MatcherContext, Verdict } from "@qadi/core";

const context: MatcherContext = {
  subject: {},
  subjectId: makeSubjectId("u-1"),
  resource: undefined,
  action: undefined,
};

const absent: Verdict = judgeMatcher(gte(3), undefined, context); // "ValueAbsent"
const notComparable: Verdict = judgeMatcher(gte(3), Number.POSITIVE_INFINITY, context); // "Incomparable"
const noReference: Verdict = judgeMatcher(eq(subject("tenantId")), "t-1", context); // "ReferenceAbsent"
```

```
REQUIREMENT: The verdicts MUST be ordered: an absent value is reported before
             an absent reference, and both before incomparability. Only `Held`
             holds; `evaluateMatcher` MUST be exactly whether `judgeMatcher`'s
             verdict is `Held`.
```

```
REQUIREMENT: A primitive matcher's verdict (`Eq`, `Neq`, `Dominates`, `In`,
             `Gte`, `Lt`) and the verdict `evaluatePredicate` applies to the
             same comparison on a row MUST come from one function, so the two
             interpreters' leaves cannot disagree (INV-QD-091).
```

```
REQUIREMENT: A composite (`FieldMatch`, `SomeMatch`, `EveryMatch`, `Size`) MUST
             report only its own absence (`ValueAbsent`) and shape
             (`Incomparable`); otherwise it reports `Held` or `NotHeld`, never
             its inner matcher's reason.
```

```
REQUIREMENT: The evaluator's denial reason for `HasAttribute` and
             `HasResourceAttribute` MUST be built from the verdict
             (BEH-QD-045), not re-derived after a boolean.
```

Before this the rules lived in three hand-kept copies — `evaluateMatcher`,
`evaluatePredicate`'s compare, and the renderable classifier — and every repair
patched one copy that the others then had to follow: the absent-operand rule
(CCR-QD-112), the finite value (CCR-QD-116), the finite bound (CCR-QD-120). The
fourth was not followed, and `toPredicate` failed open on a non-finite row
(CCR-QD-172). `Compare.ts` is out of the barrel and not importable from outside
`@qadi/core` (ADR-QD-099); `Verdict` and `judgeMatcher` are public from `Matcher.ts`.

---

_Previous: [03 — Policy ADT](./03-policy-adt.md) | Next: [05 — Evaluator](./05-evaluator.md)_
