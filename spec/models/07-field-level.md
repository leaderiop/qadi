# 07 — Field-Level Authorization

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-07                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-08-25): Field names may be dot-paths with a `*`/`**` wildcard terminal (BEH-QD-056); the leaf-variant list corrected from four to the real seven; the worked example extended (CCR-QD-078)<br>1.0 (2026-07-26): Initial release (CCR-QD-006) |

---

## What it is

Authorisation is a **projection**, not a boolean. The same policy that decides
whether a caller may read a record also decides which of its fields come back,
in one evaluation rather than a decision followed by a hand-written redaction
pass. A leaf policy may carry a `fields` restriction; a composite declares a
`fieldStrategy` saying how its children's sets combine; the resulting `Allow`
carries the merged set, and `project` applies it to the data.

This is the model Qadi exists for. Every other model in the
[matrix](./00-adoption-matrix.md) answers "may they?" — this one answers "how
much of it?", and it is why the library returns a `Decision` rather than a
`boolean`.

## Who asks for it

Any application whose records are wider than the caller's business with them:
clinical systems where a scheduler sees appointment times but not diagnoses, HR
systems where a manager sees a review but not a salary band, multi-tenant APIs
where a partner reads order status but never customer contact details. The
alternative is a per-endpoint DTO whose divergence from the policy is invisible
until it leaks.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped** |
| Priority | **P0** |
| Enablers required | None |
| Breaking change | No |

## How Qadi expresses it

Seven leaf variants accept a field restriction, applied when that node allows.
`hasRole` does not — a role is a membership test with no natural column scope,
and giving it one would create two spellings of the same grant.

```ts
export const hasPermission: (permission: Permission, options?: FieldOptions) => Policy;
export const hasAttribute: (attribute: string, matcher: Matcher, options?: FieldOptions) => Policy;
export const hasResourceAttribute: (attribute: string, matcher: Matcher, options?: FieldOptions) => Policy;
export const hasRelationship: (relation: string, options?: FieldOptions & { depth?: number }) => Policy;
export const hasAction: (action: string, options?: FieldOptions) => Policy;
export const hasActed: (event: string, options?: FieldOptions & { scope?: HistoryScope }) => Policy;
export const hasNotActed: (event: string, options?: FieldOptions & { scope?: HistoryScope }) => Policy;
export const hasRole: (role: string) => Policy;   // no options — no `fields`
```

### The lattice

An absent (`undefined`) field set means **all fields** — the *top* of the
lattice, not the empty set
([INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)).
Intersecting it with any set `S` yields `S`; unioning it with any set yields
`undefined`, because a branch granting everything makes the union everything.

```ts
type Fields = ReadonlyArray<string> | undefined;
export const intersectFields: (a: Fields, b: Fields) => Fields;
export const unionFields: (a: Fields, b: Fields) => Fields;
```

Reading `undefined` as "none" would invert the meaning of every unrestricted
policy in existence — an ordinary `hasRole("admin")` would project to `{}`. Both
helpers are exported so that anyone extending the merge logic inherits the
lattice rather than re-deriving it.

### Path-aware field names

A `fields` entry is still a plain `string` — nothing changed in `FieldOptions`,
in the schema, or on the wire; [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)'s
boundary is untouched by construction. What changed is what a string can *say*.
A dot-path addresses a nested field, and the terminal segment may carry a
wildcard:

| Terminal | Meaning |
| -------- | ------- |
| a literal name (`"street"`) | grants the value at that path whole, at any depth beneath it |
| `**` | the same as a literal terminal — grants everything beneath the path |
| `*` | grants exactly one level down: existence of every immediate child, capped — an object-valued child shows as `{}`, never its own contents |

A bare, undotted name (`"title"`) is a one-segment path with a literal
terminal, and is **containment-equivalent to `"title.**"`** — this is the
whole backward-compatibility argument: every `fields: [...]` array written
before this section existed means exactly what it always meant.

```ts
hasPermission(readDoc, { fields: ["id", "address.street", "contact.*"] });
// { id, address: { street }, contact: { email, phone, employer: {} } }
//                                                       ^^^^^^^^^^^^^
// employer exists — "contact.*" reaches it — but its own contents are one
// level beyond what "*" discloses.
```

`*` is deliberately narrower than a genuine subsumption relationship with a
deeper spec at the same path: `intersectFields(["address.*"], ["address.street"])`
is `[]`, not `["address.street"]`, because whether `"*"`'s capped view of
`street` discloses more or less than `"address.street"`'s full expansion
depends on `street`'s own runtime shape — a scalar makes them equal, an
object makes `"address.street"` strictly wider. The specs alone cannot say,
so the merge claims nothing rather than guess
([BEH-QD-056](../behaviors/07-enforcement.md)). This was a real defect caught
by a differential test during implementation, not a rule designed in advance
— see that behavior entry for the counterexample.

Wildcards are meaningful only as the terminal segment; `"a.*.b"` has no
special meaning and is read as a literal field named `*`. A literal field
name that itself contains a `.` is now ambiguous with a path separator — the
same limitation `Matcher.ts`'s `getByPath` already has for `M.subject(path)`/
`M.resource(path)`, so this is consistent with existing precedent, not a new
kind of gap.

### The three strategies

`fieldStrategy` governs field-set merging **only**; the allow/deny rule is
separate and hard-coded in `AllOf` and `AnyOf`.

| Strategy | Merge rule | Default of | Short-circuits |
| -------- | ---------- | ---------- | -------------- |
| `Intersection` | Fields visible in **every** allowing child — least privilege | `allOf` | `allOf` still stops at the first denial |
| `Union` | Fields visible in **any** allowing child | — | **No.** Every child must run to contribute its set |
| `First` | The first allowing child's set | `anyOf` | Yes |

`Union` deliberately forfeits short-circuiting: the merged set is not knowable
without visiting every branch, so `anyOf` runs exhaustively under any strategy
other than `First` — a cost opted into by naming the strategy, which is why
`First` is the `anyOf` default
([ADR-QD-013](../decisions/013-short-circuit-default.md)). An explicit
`Intersection` on an `anyOf` is honoured, not silently downgraded as the
predecessor downgraded it.

### `fieldStrategy` is required, not optional

```ts
// In the schema — and therefore in the wire format — the key is not optional:
//   { _tag: "AllOf"; policies: ReadonlyArray<Policy>; fieldStrategy: FieldStrategy }
export const allOf: (policies: ReadonlyArray<Policy>, options?: CombinatorOptions) => Policy;
export const anyOf: (policies: ReadonlyArray<Policy>, options?: CombinatorOptions) => Policy;
```

This is the single most important detail in the document. In the predecessor
`fieldStrategy` was optional, the serializer never wrote it, and on reload it
reverted to the default: a policy exposing `["title", "author"]` under `Union`
came back exposing only `["title"]` — no error, no warning, a narrowing that
looked like correct behaviour. **An omitted optional field is exactly what went
missing.** Qadi makes the key required in the schema and has the combinators
supply a default at *construction* (`Intersection` for `allOf`, `First` for
`anyOf`), so callers still need not think about it while the value is concrete
from the moment the policy exists
([ADR-QD-006](../decisions/006-field-strategy-always-encoded.md)). That defect is
why this library was rewritten.

### Projection at the call site

```ts
export const project: <A extends Record<string, unknown>>(decision: Decision, data: A) => Partial<A>;
export const enforceProjected: (policy: Policy, options?: EvaluateOptions) =>
  <A extends Record<string, unknown>, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<Partial<A>, ...>;
```

`enforceProjected` is the aspect form — it guards the effect and narrows its
result together, so the wide record never escapes the handler. `project` is the
manual form, for callers holding a `Decision` from `decide` that they wish to
apply to more than one record. A denial projects to `{}`; an unrestricted allow
projects to the whole record; listed fields absent from the record are skipped
silently ([BEH-QD-051](../behaviors/07-enforcement.md)).

## Worked example

```typescript
import {
  allOf,
  anyOf,
  decide,
  enforceProjected,
  fromJson,
  hasPermission,
  hasRole,
  isAllowed,
  permission,
  project,
  toJson,
  type Policy,
} from "@qadi/core";
import { qadiTestLayer, subjectWith } from "@qadi/testing";
import * as Effect from "effect/Effect";

const readDoc = permission("doc", "read");
const readMeta = permission("doc", "meta");

// Module scope: a policy built inline would be a fresh object on every call.
// Union — each allowing branch contributes what it exposes, so both must run.
// This is the strategy the predecessor dropped on serialization.
const canView: Policy = anyOf(
  [
    hasPermission(readDoc, { fields: ["id", "title", "author.name"] }),
    hasPermission(readMeta, { fields: ["id", "author"] }),
  ],
  { fieldStrategy: "Union" },
);

// `allOf` defaults to Intersection. `hasRole` carries no field set, and an
// absent set is the top of the lattice — so the conjunction narrows nothing.
const canViewAsReviewer = allOf([canView, hasRole("reviewer")]);

const quinn = subjectWith({
  id: "quinn",
  roles: ["reviewer"],
  permissions: ["doc:read", "doc:meta"],
});

declare const loadDocument: (id: string) => Effect.Effect<{
  id: string;
  title: string;
  author: { readonly name: string; readonly email: string };
  internalNotes: string;
}>;

const program = Effect.gen(function* () {
  // Stored and reloaded from untrusted JSON. `fieldStrategy` is encoded, so
  // `Union` survives and the reloaded policy decides as the original did.
  const reloaded = yield* fromJson(yield* toJson(canViewAsReviewer));

  const decision = yield* decide(reloaded);
  const fields = isAllowed(decision) ? decision.visibleFields : undefined;

  // One decision, projected manually over a record the caller already holds.
  const visible = project(decision, yield* loadDocument("doc-1"));

  // The same narrowing as an aspect: the wide record never leaves the handler.
  const guarded = yield* loadDocument("doc-2").pipe(enforceProjected(reloaded));

  return { fields, visible, guarded };
}).pipe(Effect.provide(qadiTestLayer(quinn)));
// → fields (the raw spec list): ["id", "title", "author.name", "author"] —
//   Union keeps both specs rather than collapsing the redundant one.
// → visible / guarded: { id, title, author: { name, email } } — `author`
//   (bare, from readMeta's branch) discloses the whole object, so its
//   presence wins over `author.name`'s narrower reach from readDoc's
//   branch; that is Union's OR semantics doing exactly what it always did,
//   just now visible at a nested key instead of only a top-level one.
//   `internalNotes` is never returned.
```

## What is missing

**Cell-level security needs E7.** Field visibility is uniform across rows: a
caller sees `salary` on every record the policy admits, or on none. Making it
depend on the *cell* — this row's `salary`, because the row belongs to the
caller's team — is a different contract. It cannot be a decision about one
resource; it is a decision that produces a predicate to push into the query,
which is E7 in the [matrix](./00-adoption-matrix.md). `filter` is not a
substitute: it evaluates per element in memory, after the read rather than
instead of it.

**Combining algorithms (E3) must not absorb field merging.** The two look
adjacent and are not. `fieldStrategy` answers "which fields does this composite
expose?"; a combining algorithm answers "does this composite allow?". The
tempting economy is to widen `fieldStrategy` into one field doing both — which
would make `Union` an allow rule as well as a merge rule, and would render
"permit-overrides with intersection visibility" (permissive on the decision,
restrictive on the columns) inexpressible. E3 must add a dimension *beside*
`fieldStrategy`, never on top of it, and must preserve the two properties this
model rests on: `undefined` stays *top*
([INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)),
and `First` keeps short-circuiting
([INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)).

## Verification

| Claim | Evidence |
| ----- | -------- |
| `undefined` is the top of the lattice; intersection keeps the overlap; union absorbs to all-fields | `packages/core/test/Matcher.test.ts` — `describe("field lattice")` |
| A denial projects to `{}`, an unrestricted allow to the whole record, a restricted allow to the listed fields | `packages/core/test/Matcher.test.ts` — `describe("project")` |
| The three strategies merge as specified, including an unrestricted child meaning all fields and `anyOf` honouring an explicit `Intersection` | `packages/core/test/Evaluate.test.ts` — `describe("field visibility")` |
| `Union` forfeits short-circuiting; `First` keeps it | `packages/core/test/Evaluate.test.ts` — `describe("short-circuiting")`, asserted by counting resolver invocations |
| `allOf` defaults to `Intersection`, `anyOf` to `First`, and an explicit value overrides | `packages/core/test/Policy.test.ts` — `describe("Policy combinators")` |
| **The original defect.** `fieldStrategy: "Union"` survives a store-and-reload | `packages/core/test/Policy.test.ts` — `REGRESSION: anyOf Union fieldStrategy survives a round trip` |
| Any policy tree at all survives a round trip | `packages/core/test/Policy.test.ts` — `PROPERTY: any generated policy survives a round trip`, building arbitrary trees with `FastCheck.letrec` |
| `enforceProjected` narrows the result, returns everything when unrestricted, ignores absent fields, and fails closed | `packages/core/test/Qadi.test.ts` — `describe("Qadi.enforceProjected")` |
| Path parsing, `*`/`**` depth semantics, and `compareFieldPaths`'s subsumption relation (including the `Incomparable` boundary) | `packages/core/test/FieldPath.test.ts` |
| A bare literal, `*`, and `**` project identically through the public `project`/`intersectFields` API, including the fail-closed `*`-boundary case | `packages/core/test/Matcher.test.ts` — the path-aware cases in `describe("field lattice")`/`describe("project")` |
| `mergeFields` needs no change: a path-shaped field survives `Intersection`/`Union`/`First` through the real evaluator | `packages/core/test/Evaluate.test.ts`, `packages/core/test/Layers.test.ts` — the path-aware cases in `describe("field visibility")`/`describe("field-strategy edge cases")` |
| The double-negation guard (`not(not(p))`) holds identically for a path-shaped field | `packages/core/test/Simplify.test.ts` |
| Explanation rendering, the wire codec, and the round-trip generator all treat a path-shaped spec opaquely | `packages/core/test/Explanation.test.ts`, `packages/core/test/SinkCodec.test.ts`, `packages/core/test/Policy.test.ts` |
| Acceptance | `REQ-QD-007` (`features/features/field-visibility/field-visibility.feature`), `REQ-QD-008` (`features/features/serialization/round-trip.feature`) |

The two acceptance features are near-duplicates by design. `@REQ-QD-007`
evaluates a `Union` policy and asserts the merged set; `@REQ-QD-008` round-trips
the same policy through JSON first and asserts the *same* set. The predecessor
would have passed the first and failed the second — which is the argument for
keeping both. The `FastCheck.letrec` property generalises it: a new policy
variant must join that generator in the change that adds it to the schema, or
the round trip quietly stops covering it
([BEH-QD-058](../behaviors/08-serialization.md)).

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [03 — Policy ADT](../behaviors/03-policy-adt.md) · [ADR-QD-006](../decisions/006-field-strategy-always-encoded.md)_
