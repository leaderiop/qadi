# Qadi — Engineering Conventions

Effect-native authorization library. **Effect v4.** These rules are not suggestions; code that violates them does not merge.

New here? `CONTRIBUTING.md` is a short index into the section below that
governs whichever change you're making — read that first rather than this
file end to end.

Style reference projects (read them when in doubt). These are local checkouts,
not packages this repo depends on, so the path is whatever your workstation
put it at — ask a maintainer if you don't have one:

- `alchemy` — Effect v4 beta, `AGENTS.md` is its authority
- `effect` — the Effect v4 source itself. For the exact rc build this repo
  ships against, `node_modules/effect` after `pnpm install` is a checkout too,
  pinned via the `catalog:` protocol (`pnpm-workspace.yaml`).

**Doc-comment shape**: lead with a one-line summary of what the export is or
does; put the *why* — predecessor history, ADR citations, invariant
cross-references — in the paragraph(s) after it, not folded into the first
sentence. A reader skimming for "what does this do" gets it from line one; a
reviewer who needs the rationale reads on. This is already how most of this
codebase's comments are written (see `Evaluate.ts`, `Qadi.ts`) — stated here
so it stays the default rather than drifting file by file.

---

## 1. Imports

**Submodule namespace imports only.**

```ts
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
```

| Don't | Do |
| ----- | -- |
| `import { Effect, Layer } from "effect"` | `import * as Effect from "effect/Effect"` |
| `import { evaluate } from "./Evaluate.js"` | `import { evaluate } from "./Evaluate.ts"` |
| `import { Policy } from "./Policy.ts"` (type-only) | `import type { Policy } from "./Policy.ts"` |

The namespace rule is for `effect` submodules specifically, not for imports in
general. Crossing a package boundary inside this monorepo is a named import
from the dependency's root: `import { guard, CurrentSubject } from "@qadi/core"`
(`packages/http/src/GuardRoute.ts`), `import { DecisionSink } from "@qadi/core"`
(`packages/audit/src/AuditDecisionSinkLive.ts`). No package does
`import * as Core from "@qadi/core"`. The one exception is a package that
publishes a distinct entry point on purpose — `@qadi/devtools`'s React panel is
`import { DevtoolsDock } from "@qadi/devtools/react"`, a named import from a
named subpath, not a namespace import either.

Relative imports carry the **`.ts` extension** (`allowImportingTsExtensions` +
`rewriteRelativeImportExtensions`). `verbatimModuleSyntax` is on, so
`import type` is mandatory for type-only imports.

## 2. Services — `Context.Service`

Never `Effect.Service`, `Context.Tag`, `Context.GenericTag`, or `Context.Reference`.
The shape is a **separately exported `interface …Shape`**, per ADR-QD-010 —
naming it gives the interface a stable, importable type independent of the
`Context.Service` class built from it, which a test double or a wrapper (like
`attributeResolverRetrying` in §3) implements or extends without pulling in
the service class itself.

```ts
export interface AttributeResolverShape {
  readonly name?: string | undefined;
  readonly resolve: (
    subjectId: SubjectId,
    attribute: string,
  ) => Effect.Effect<unknown, AttributeResolveError>;
}

export class AttributeResolver extends Context.Service<
  AttributeResolver,
  AttributeResolverShape
>()("qadi/AttributeResolver") {
  // `use` requires its callback to RETURN an Effect — it is a one-step method
  // accessor, not an identity read.
  static readonly resolve = (subjectId: SubjectId, attribute: string) =>
    AttributeResolver.use((r) => r.resolve(subjectId, attribute));
}
```

> **Corrected in CCR-QD-077.** This example carried `resolve(attribute, resource?)`
> and omitted `name` — a signature no version of this library has had. Nothing
> checks the code in this file: `check-doc-examples.mjs` compiles fenced
> `typescript` blocks under `spec/`, and this is `ts` in `AGENTS.md`, which is
> reference material by §12's own rules. It was noticed four separate times
> before anyone changed it, each time as an aside in work about something else.
> The `@qadi/example-nextjs` port implementations are written against the real
> signature and compile, which is the first thing in this repository that would
> have caught it.

Tag ids are namespaced: `"qadi/AttributeResolver"`.

To obtain the whole service, `yield* AttributeResolver`. Note that alchemy's
`static current = X.use((x) => x)` idiom **only typechecks when the service
Shape is itself an `Effect`** (as in its `AWSEnvironment`). Our shapes are plain
records, so we use the method-accessor form above. `packages/core/test/v4-api-smoke.test.ts`
pins this and the other v4 APIs we depend on.

## 3. Layers — top-level consts

No `static layer`. No `.Default`. A layer is an exported top-level constant,
never a class member.

```ts
export const AttributeResolverFromSubject: Layer.Layer<AttributeResolver, never, CurrentSubject> =
  Layer.effect(
    AttributeResolver,
    Effect.gen(function* () {
      const subject = yield* CurrentSubject;
      return {
        resolve: (_subjectId, attribute) => Effect.succeed(subject.attributes[attribute]),
      };
    }),
  );
```

Layers live beside the service they implement, not in a file of their own:
`AttributeResolver.ts` holds the Shape, the `Context.Service` class, the
fail-closed default (`AttributeResolverNone`), a fixture builder
(`attributeResolverFromRecord`), and the `…Retrying`/`…Bounded` wrappers, all
in one module — the same shape repeats in `RelationshipResolver.ts` and
`CustomPredicate.ts`. A standalone file is for a layer with its own
substantial dependency surface, distinct from the service it implements:
`packages/http/src/PermissionRegistry.ts`'s `PermissionRegistryLive` and
`packages/audit/src/AuditDecisionSinkLive.ts` are that case, and their file
names carry the `…Live` suffix for exactly this reason.

Naming: `…Live` (production) / `…Test` (deterministic) get their own file when
they're substantial; `Default` names the layer of a namespace-imported module.
A service's fail-closed default is named for the specific answer it gives, not
one generic word — `…None`, `…Never`, `…Unknown`, `…Anonymous` all appear in
this codebase, because what "no value" means differs per service
(`spec/behaviors/06-services.md`, BEH-QD-043).

**Gotcha:** `Layer.mergeAll` silently drops tail layers past ~90 arguments —
tsc's variadic inference limit. Nest into groups.

## 4. Errors — `Data.TaggedError`, with a measured `Schema.TaggedError` exception

Default is `Data.TaggedError`. Not `Schema.TaggedErrorClass`. Plain, unprefixed tags — unlike service ids (§2's `"qadi/AttributeResolver"`), error `_tag`s deliberately dropped the `qadi/` prefix.

```ts
export class CircularRoleInheritance extends Data.TaggedError("CircularRoleInheritance")<{
  readonly roleName: string;
}> {}
```

**Twelve measured, budgeted exceptions** (ADR-QD-060, narrowed by ADR-QD-072) —
the same discipline §5's `UNTRACED_BUDGET` and §5a's `SWITCH_BUDGET` apply to
their own exceptions: an error is `Schema.TaggedError` instead when it is
*part of the codec*, not merely "an error that happens to leave the process."
Nine cross a process boundary as an element of a `SinkRecord`
(`packages/core/src/SinkCodec.ts`) — the class itself is the schema
`SinkCodec` encodes/decodes, rather than a second, hand-mapped description of
the same shape living beside it. `AccessDenied` and `UndischargedObligation`
don't cross that wire but do cross a second, independent trust boundary —
`@qadi/http`'s response body — and the class is the schema `httpApiStatus`
annotates there, for the same reason. The twelfth, `AccessDeniedPublic`, is
`AccessDenied`'s own no-trace projection: not a member of `EnforcementError`
and never raised by evaluation, but a `Schema.TaggedError` for the identical
reason `AccessDenied` is — it is the schema `httpApiStatus` annotates
(`AccessDeniedRefused` in `QadiHttpError.ts`) at the same response-body
boundary, so the class staying the schema applies to it too.

| Class | Crosses |
| ----- | ------- |
| `MissingResource` | `SinkRecord` (ADR-QD-060) |
| `MissingAction` | `SinkRecord` (ADR-QD-060) |
| `AttributeResolveError` | `SinkRecord` (ADR-QD-060) |
| `RelationshipResolveError` | `SinkRecord` (ADR-QD-060) |
| `MissingResourceId` | `SinkRecord` (ADR-QD-060) |
| `DecisionHistoryUnavailable` | `SinkRecord` (ADR-QD-060) |
| `SignatureHistoryUnavailable` | `SinkRecord` (ADR-QD-060) |
| `PolicyTooDeep` | `SinkRecord` (ADR-QD-060) |
| `CustomPredicateError` | `SinkRecord` (ADR-QD-060) |
| `AccessDenied` | `@qadi/http` response body (ADR-QD-072) |
| `UndischargedObligation` | `@qadi/http` response body (ADR-QD-072) |
| `AccessDeniedPublic` | `@qadi/http` response body — `AccessDenied` redacted to drop `trace` |

```ts
export class MissingResource extends Schema.TaggedError<MissingResource>()("MissingResource", {
  attribute: Schema.String,
}) {}
```

Every other error stays `Data.TaggedError` — including one that crosses
exactly one boundary but isn't part of a generic codec: `SubjectExtractionFailed`
(`@qadi/http`) stays `Data.TaggedError` internally, and gets its own explicit,
hand-written wire-facing `Schema.TaggedStruct` mirror
(`SubjectExtractionRefused` in `QadiHttpError.ts`) at the one place it's
serialized — because nothing generic needs to decode it structurally the way
`SinkCodec` or a typed HTTP client does for the eleven above. That's the test:
**does a codec need this error's shape, or does exactly one call site need to
turn it into a response?** The former earns `Schema.TaggedError`; the latter
stays `Data.TaggedError` plus its own mirror.

Enforced by `SCHEMA_ERROR_BUDGET` in `scripts/check-house-style.mjs`, checked
in both directions like `UNTRACED_BUDGET`: a thirteenth `Schema.TaggedError`
class added to `packages/core/src/Errors.ts` without updating the table above
and the budget together fails the gate, and so does the count silently
dropping back to eleven.

Handling — use the **array form**, never `catchTags({...})`. (The installed
`effect@4.0.0-rc.116` still ships `Effect.catchTags` with an object-form
signature, so this is a house-style choice enforced by
`scripts/check-house-style.mjs`'s `no-catchtags-object-form` rule, not
something the API's absence makes moot — a stray call compiles cleanly.)

```ts
// ✅
Effect.catchTag("AccessDenied", (e) => …)
Effect.catchTag(["AccessDenied", "PolicyEvaluationError"], (e) => …)

// ❌ structural checks on unknown
if (Predicate.hasProperty(e, "_tag") && (e as { _tag: unknown })._tag === "X")
```

Never `Effect.orDie` in evaluation or enforcement paths — an authorization
decision must never become a defect.

## 5. Functions — `Effect.fn`

Every effectful function is `Effect.fn(function* …)`. Name it when a span is wanted.

```ts
export const evaluate = Effect.fn("qadi.evaluate")(function* (policy: Policy) {
  const subject = yield* CurrentSubject;
  // …
});
```

`Effect.gen` to construct; `.pipe` for the error/retry tail of a single expression.

**Three exceptions, measured and budgeted** (ADR-QD-073). `Effect.fnUntraced`
replaces `Effect.fn(name)` on exactly the composite-dispatch functions below —
the same discipline §5a's `SWITCH_BUDGET` applies to `switch`: an exact,
enforced list rather than a convention left to be remembered.

| Location | Why untraced |
| -------- | ------------ |
| `Evaluate.ts` — `evaluateAllOf` | Runs once per `AllOf` node, every evaluation. |
| `Evaluate.ts` — `evaluateAnyOf` | Runs once per `AnyOf` node, every evaluation. |
| `Evaluate.ts` — `evaluateRules` | Runs once per `Rules` node, every evaluation. |

Ticket #101's `packages/core/bench/EffectFn.bench.ts` measured what a *named*
`Effect.fn(name)(...)` call adds over `Effect.fnUntraced` on this exact call
shape — a second `new Error()` capture, a span allocation through
`makeSpanUnsafe`, and a `CurrentStackFrame` record, on every call — at
**≈2.7–2.9 µs/call**. Ticket #102 converted the three functions above and
re-ran `Evaluate.bench.ts` before and after on the same machine, same day
(2026-09-09, 2–3 runs each, mean of the runs):

| Workload | Wrapped calls converted | Before | After | Change |
| -------- | ----------------------- | ------ | ----- | ------ |
| `one node` (no composite) | 0 | ≈8.3 µs | ≈8.1 µs | ~unchanged (control) |
| `resolver miss` (no composite) | 0 | ≈15.1 µs | ≈14.5 µs | ~unchanged (control) |
| `wide` — `allOf` of 8 | 1 | ≈14.1 µs | ≈9.9 µs | **≈−30%** |
| `matcher-heavy` — 3 refs | 1 | ≈17.6 µs | ≈11.9 µs | **≈−32%** |
| `obligation-heavy` — `allOf` of 8 | 1 | ≈18.5 µs | ≈13.3 µs | **≈−28%** |
| `field-heavy` — `allOf` of 8, `Intersection` | 1 | ≈34.0 µs | ≈28.0 µs | **≈−18%** |
| `deep` — 10 nested combinator levels | 10 | ≈49.2 µs | ≈12.6 µs | **≈−74%** |

The two zero-conversion workloads (`one node`, `resolver miss`, neither of
which reaches `evaluateAllOf`/`evaluateAnyOf`/`evaluateRules`) move by less
than the run-to-run noise either direction — the control confirming the
measured improvement is attributable to this conversion and not to
machine variance. The rest land close to, or (on `deep`) better than,
ticket #101's own end-to-end estimate (≈30–43% single-combinator, ≈54–66%
ten-level-deep) — real, not merely predicted.

The boundary stops exactly at these three. `resolveAttribute`, `evaluateActed`,
`evaluateHasRelationship`, `evaluateHasCustom`, `evaluateHasSignature` (the
port-call wrappers) and the root `evaluate` stay `Effect.fn` and traced:
ADR-QD-051 ("a span says what was asked, and a tracer is what reads it back")
treats those spans as product observability a deployment wires a real tracer
to consume, not incidental cost, and none of the six runs once per policy
*node* the way the three above do. `requireScopedResourceId` is a small
helper called from inside `evaluateActed`, not a per-node dispatch point, and
was considered and rejected for conversion on the same grounds (issue #102).

Converting anything not in the table above needs a benchmark first, the same
qualifier §5a's `SWITCH_BUDGET` carries — `scripts/check-house-style.mjs`'s
`UNTRACED_BUDGET` enforces the count in both directions, so a new
`Effect.fnUntraced` call site anywhere in `packages/*/src` fails the gate
until this table and the budget agree.

## 5a. Dispatch — `Match`, not `switch`

Dispatching on a `_tag` uses `effect/Match`, never a `switch`.

```ts
import * as Match from "effect/Match";

// A tagged union: `tagsExhaustive` returns the function, and a missing arm is a
// compile error.
export const referencesAction: (self: Matcher) => boolean = Match.type<Matcher>().pipe(
  Match.tagsExhaustive({
    Eq: (m) => m.ref._tag === "ActionRef",
    FieldMatch: (m) => referencesAction(m.matcher),
    In: () => false,
    // …every remaining tag
  }),
);

// A plain literal union has no `_tag`, so match the values.
const compare = (op: CompareOp): string =>
  Match.value(op).pipe(
    Match.when("Eq", () => "="),
    Match.when("Lt", () => "<"),
    Match.exhaustive,
  );
```

Recursive dispatchers annotate the const (`: (self: X) => Y`) — that breaks the
inference cycle, and the handler bodies only run later, so referring to the const
inside them is fine.

`Match.type<T>()` builds the matcher **once**, at module scope. Prefer that shape;
`Match.value(x)` rebuilds per call, which is fine for a translator invoked once
per request and is worth avoiding on a per-node evaluation path.

**Four switches remain unconverted**, and the exception is enforced rather than
remembered: `scripts/check-house-style.mjs` carries a `SWITCH_BUDGET` naming each
file and its exact count, and gate 4 fails on any deviation.

| Location | Dispatches on |
| -------- | ------------- |
| `Evaluate.ts` — `evaluateNode` | `policy._tag` |
| `Evaluate.ts` — `mergeFields` | the `FieldStrategy` literal union |
| `Matcher.ts` — `evaluateMatcher` | `self._tag` |
| `Matcher.ts` — `resolveRef` | `ref._tag` |

All four run once per policy node or matcher node per evaluation — and in `filter`
and `decideSubjects`, once per element on top of that — where their handlers close
over per-call state so the matcher cannot be hoisted to module scope.

**Now measured** (`pnpm bench`, ADR-QD-034). At the dispatch site a `switch` is
**1.6–2.4×** faster than a hoisted `Match` whose arms return a closure, and
**3.5–7.7×** faster than `Match.value` rebuilt per call — which is the form a
naive conversion produces. End to end that is about **2–4%** on a matcher-heavy
policy and **under 1%** on a simple one. Ranges, not figures: absolute throughput
on a development machine moves by ~30% between runs, so only the direction
transfers. Small, then, but not noise — and not worth paying for style on an
authorization hot path.

> **The end-to-end 2–4%/under-1% figures are stale, not reproducible as stated
> (CCR-QD-119).** ADR-QD-034's 2026-09-07 addendum found the workload they were
> derived from ("four refs", "seventeen dispatches") no longer matches
> `Evaluate.bench.ts`, which now resolves 3 refs and dispatches ~13 times per
> evaluation — and that neither file had been re-measured since the ADR was
> written. Only the per-dispatch ratios above (**1.6–2.4×**, **3.5–7.7×**)
> survive that addendum; the end-to-end percentages do not and should not be
> treated as current without re-running `pnpm bench` against today's workload.

**A sibling question, same discipline, separate axis, now settled.** This
section's benchmark discipline was about `switch` vs `Match` on `_tag` dispatch.
`Effect.fn` vs `Effect.fnUntraced` was the sibling question, and — until ticket
#102 — every effectful function in this codebase was a *named* `Effect.fn`,
with `Effect.fnUntraced` used zero times, despite the former capturing an
`Error()` and allocating a span and a stack-frame record on every call, none
of which the latter does. `packages/core/bench/EffectFn.bench.ts` measured
that question the same way `Dispatch.bench.ts` measures this one: per-call
overhead isolated (**≈2.7–2.9 µs/call**, ≈8.6–11.5× slower than `fnUntraced`),
then put in proportion against `Evaluate.bench.ts`'s pre-conversion end-to-end
numbers (**≈30–35%** estimated tracing share on a single-node evaluation, up
to **≈54–66%** on a ten-level-deep one — computed before ticket #102, so it
now overstates the share on any workload that reaches a composite node).

That measurement is what answered the question: §5 above records the outcome
— `Effect.fnUntraced` adopted at exactly the three composite dispatchers where
the per-node cost compounds (`evaluateAllOf`, `evaluateAnyOf`, `evaluateRules`),
budgeted and enforced in both directions by `UNTRACED_BUDGET`. That is the
current, measured boundary, not a fourth site still under discussion.
`resolveAttribute`, the port-call wrappers, and the root `evaluate` stay
`Effect.fn` and traced on purpose, per ADR-QD-051's reasoning in §5 — the
open question this paragraph used to describe is the one §5's table closed.

**Each of these switches must remain exhaustive by construction.** Two of the four
were not, and they were the two this section had failed to declare: `resolveRef`
returns `unknown` and `mergeFields` returns `… | undefined`, so a new tag compiled
and returned `undefined` silently. `resolveRef` would then deny everything;
`mergeFields` would merge to the **top** of the field lattice and *widen*
visibility. Both now carry a `default` arm assigning the scrutinee to `never`,
which is free at runtime and makes a new tag the same compile error
`Match.tagsExhaustive` gives. A switch whose return type cannot absorb `undefined`
— `evaluateNode` and `evaluateMatcher` — already gets TS2366 and needs no guard.

The budget is an exact count and not a per-file pass, deliberately: a blanket
exemption would let the next `switch` into these two files unnoticed, and they are
the two hottest in the library — exactly where one would be added. It fails in both
directions, so converting one to `Match` also fails until this table and the budget
are updated together.

This section said "two" while there were four, and named only the two whose
justification someone had written down; nothing checked the count (CCR-QD-039).

## 6. Forbidden

| Don't | Do |
| ----- | -- |
| `async` / `await` | `Effect.fn(function* …)` |
| `new Promise(...)`, `.then(...)` | `Effect` |
| `import fs from "node:fs"` | `yield* FileSystem.FileSystem` |
| `Date.now()`, `new Date()` | `yield* Clock.currentTimeMillis` / `DateTime` |
| `performance.now()` | `Effect.timed` |
| `crypto.randomUUID()` | the `EvaluationId` service |
| `Effect.either` / `effect/Either` | `Effect.result` + `Result.isSuccess/isFailure` |
| `switch (x._tag)` | `Match.tagsExhaustive` — see §5a |
| `as`, `as any`, `!`, `any` | fix the type |

Sync CPU-only calls still get wrapped: `yield* Effect.sync(() => …)`.

Determinism matters here beyond taste: the previous implementation used
`performance.now()` and `new Date()` inside the evaluator, which made every
evaluation trace untestable. Under `TestClock` ours are reproducible.

**One measured, budgeted exception to `any`** (ADR-QD-075), the same
discipline §5's `UNTRACED_BUDGET` and §5a's `SWITCH_BUDGET` apply to their own
exceptions: `packages/http/src/HttpApiMiddlewareClient.ts`'s
`passthroughClientLayer` needs `any` seven times, in `effect`'s own
`HttpApiMiddleware<any, any, any>`/`HttpApiMiddlewareSecurity<any, any, any,
any>` constraint shapes — the only way found to stay generic over any
middleware service (`unknown` in `Provides`'s position rejects a concrete
middleware's real type, tried and confirmed broken first). `.oxlintrc.json`
scopes a `no-explicit-any` override to that one file, and
`scripts/check-house-style.mjs`'s `ANY_BUDGET` enforces the exact count in
both directions, so the override cannot silently grow to cover an unrelated
`any` added to the same file later.

**`hasCustom(...)` outside `packages/core/src`/`packages/testing/src` is a
fourth budget, `HAS_CUSTOM_BUDGET`** (ADR-QD-055), the same discipline as the
three above. `HasCustom` is Qadi's one deliberate escape hatch — a policy node
whose condition is opaque, externally-registered logic rather than a
declarative matcher — so reaching for it forfeits `explain()`'s ability to
decompose the check and `toPredicate`'s ability to compile it to a row filter.
An escape hatch with no friction becomes the default path, so adopting it
anywhere outside core/testing is a conscious, reviewed edit to
`scripts/check-house-style.mjs`'s `HAS_CUSTOM_BUDGET`, checked in both
directions like the others, not a convention left to be remembered. The one
entry there today is `features/step-definitions/CustomPredicateWhenSteps.ts`
— the BDD acceptance step that exercises `hasCustom` itself.

## 7. Schema

Domain types are ordinarily **hand-written interfaces** with template-literal
brands — that is the alchemy norm and it applies to `Permission`, `Role`, `AuthSubject`.

**The Policy ADT is the deliberate exception** (ADR-QD-002). Policies cross a
trust boundary: they are persisted and re-parsed from untrusted JSON. Hand-written
codecs are exactly what caused the data-loss defect this library was rewritten to
fix. So the schema and the type are one definition, not two independently
maintained ones. For a flat union that means schema-first, type derived:

```ts
export const ValueRef = Schema.Union([SubjectRef, SubjectIdRef, /* … */]);
export type ValueRef = typeof ValueRef.Type;
```

`Policy` and `Matcher` are recursive, so the order inverts: the self-referential
type is hand-written first — `Schema.suspend` needs a named type to close the
loop — and the `Schema.TaggedStruct` variants are then built and type-asserted
against it. See `Policy.ts` and `Matcher.ts`.

v4 API notes: `Schema.Union([...])` takes an **array**; the type is
`Schema.Codec<T>` (not `Schema.Schema<T>`); recursion factors into a single
shared `Schema.suspend` ref; `parseJson(s)` → `fromJsonString(s)`;
`decodeUnknown` → `decodeUnknownEffect`; `ParseResult` → `SchemaIssue`.

## 8. Naming

| Pattern | Meaning |
| ------- | ------- |
| `make…` | builder returning a value or Effect |
| `…Unsafe` **suffix** | v4 convention — `makeUnsafe`, not `unsafeMake` |
| `…Live` / `…Test` / `Default` | layers |
| `is…` | type guards |
| `…Shape` | a service's payload interface |
| `…Like` | structural brand for requirement bubbling |
| `…Refused` | `@qadi/http`'s tag-only, `httpApiStatus`-annotated wire schema for a real error class the response body must not carry full-fielded (`AccessDeniedRefused`, `UndischargedObligationRefused`, `SubjectExtractionRefused`, `QadiHttpError.ts`) — a different, exported *const* from the class its `_tag` matches, deliberately: the identifier names the disclosure decision ("this crosses the wire refused, not admitted"), the `_tag` still names the failure. Corroborated in GVR-05: a reader grepping a shared tag across `@qadi/core` and `@qadi/http` lands on two exports for one concept, on purpose. |

## 9. Barrels

`export * from "./File.ts"`, alphabetical. Shared scaffolding stays **out** of
the barrel — exporting internal helpers leaks generic names into the flat
namespace. Re-export internal types explicitly where `.d.ts` emission needs to
name them (TS2883).

## 10. Tests

`@effect/vitest`: `it.effect`, `it.scoped`, `it.layer`, `TestClock`.
Coverage thresholds are enforced in config — a shortfall fails the run.
`packages/core` is held at 95%, everything else at 90%.

Every behavior in `spec/behaviors/` has tests; every `.feature` file is tagged
`@REQ-QD-NNN` so BDD scenarios join the traceability chain.

## 11. Specification

`spec/` is normative. Code follows the spec, not the reverse. Changing public
behavior means updating the behavior doc, the invariant, and the traceability
matrix in the same change. TypeScript blocks in `spec/behaviors/*.md` are
extracted and type-checked by the merge gate — documentation that does not compile is a
build failure.

## 12. Specification code fences

`spec/` uses three TypeScript fence languages, and the distinction is load-bearing:

- ` ```typescript ` — a **runnable example**. Extracted and compiled by
  `scripts/check-doc-examples.mjs`; it must import what it uses and must
  type-check against the real API.
- ` ```tsx ` — a runnable example **containing JSX**. Compiled the same way, as
  a `.tsx` file.
- ` ```ts ` — an **API signature listing or fragment**. Reference material, not
  compiled.

Prefer `typescript` wherever an example can be made to compile. The predecessor's
documentation was uniformly uncompilable — every README example called a
signature that no longer existed — which is worse than no documentation, because
readers and models pattern-match against it. This gate has already caught two
errors in our own docs.

## 13. React

`@qadi/react` is a binding over `effect/unstable/reactivity`, not a
state-management layer of its own. The rules that keep it that way:

- **No React state for decisions.** Decisions live in atoms. If you find
  yourself writing `useState` + `useEffect` to hold one, the atom graph is the
  place for it instead. This is the rule the instance registry below does **not**
  bend: it holds who is asking, never what the answer was.
- **No additional dependencies, with one deliberate exception.** The React glue
  was one hand-rolled `useSyncExternalStore` call in `QadiProvider.tsx`.

  > **Corrected in CCR-QD-150.** ADR-QD-014 rejected `@effect/atom-react` as
  > supplying "the same thing plus features this package does not use" — but
  > what was checked was `@effect-atom/atom-react`, a similarly-named community
  > package pinned to `effect: ^3.22.1`, not the actual `@effect/atom-react`
  > (published from the `Effect-TS/effect` monorepo, tracking `effect`
  > version-for-version, and built directly on `effect/unstable/reactivity`'s
  > own `Atom`/`AtomRegistry`/`AsyncResult` types — not a parallel
  > implementation). Verified on a spike branch, not assumed: swapping in the
  > real package closed a gap this package had hand-rolled and patched three
  > separate times — `settled.ts`'s Suspense zero-listener race (COMPAT-01,
  > gap G-01-1), confirmed by 30/30 clean runs of the test the race was found
  > in, on the exact Node 20.17.0 binary that found it. A second gap — wiring
  > `AtomRegistry.make`'s `scheduleTask`/`defaultIdleTTL` for idle-atom GC,
  > matching the library's own `RegistryContext.ts` — was tried and reverted:
  > `scheduleTask` is not scoped to idle cleanup, it reroutes the registry's
  > core dispatch through React's low-priority scheduler, and doing so
  > silently dropped a required intermediate render under real network timing
  > in `examples/nextjs-newsroom`'s e2e suite. `@effect/atom-react` is now a
  > dependency of `@qadi/react`, and `QadiProvider.tsx`'s `useAtomValue` is a
  > direct re-export of its hook. See ADR-QD-014's Consequences section for the
  > full reversal.
  >
  > **The unbounded-growth gap this left is now closed, without going near
  > `scheduleTask`/`defaultIdleTTL` a second time.** `QadiAtoms.ts`'s
  > `Atom.family`-backed decision atoms and its `asked()` bookkeeping had
  > nothing bounding their growth over a long session asking many distinct
  > (policy, resource) combinations — confirmed by audit, and real regardless
  > of whether the underlying `Atom.family` entries are eventually GC'd, since
  > `asked()`'s own array held every question's `Policy`/`Resource` strongly,
  > forever. The fix is a qadi-owned eviction sweep instead: each tracked
  > question carries a `liveCount`, incremented when its decision atom's
  > reader runs and decremented by a finalizer `AtomRegistry` calls on genuine
  > teardown (never on a same-tick recompute, which reincrements before any
  > other fiber can observe zero — see `QadiAtoms.ts`'s `TrackedQuestion` for
  > why), and `sweepEvictions` — plain `Effect.sync`, no `AtomRegistry` access
  > at all — drops the oldest questions with `liveCount === 0` once
  > `maxTrackedQuestions` is exceeded, skipping anything still live rather than
  > evicting it. `QadiProvider.tsx` forks `Effect.repeat(atoms.sweepEvictions,
  > Schedule.spaced(sweepIntervalMillis))` on its own fiber at mount and
  > interrupts it at unmount, the same shape `@qadi/devtools`'s
  > `useTimeline.ts` uses for its own background subscription — entirely
  > independent of `AtomRegistry`'s scheduler, so it cannot repeat the dropped-
  > render failure: it never touches value dispatch or notification, only
  > which entries `QadiAtoms`' own bookkeeping keeps. `QadiAtoms.test.ts` and
  > `QadiProvider.test.tsx` cover eviction past the bound, survival of a
  > currently-mounted gate, and that the existing render-sequence tests this
  > paragraph's history is about pass unchanged.
- **Submodule imports, as everywhere else:**
  `import * as Atom from "effect/unstable/reactivity/Atom"`.
- **Read decisions through `currentDecision`.** It is the single place the rule
  "a decision being re-checked is not a decision" lives (ADR-QD-017). A new
  consumer that reads `AsyncResult.isSuccess` directly will report stale allows.
- **Atoms are keyed structurally.** `Atom.family` compares with `Equal.equals`,
  so two separately built but equal policies share one atom and an inline policy
  still shares. Hoist to module scope or `useMemo` anyway — the hash is cached
  per object, so a fresh object each render re-walks the tree — but do not claim
  inline "defeats sharing", because it does not.
  `v4-reactivity-smoke.test.ts` pins the keying rule.
- **Test the graph, not the DOM, where you can.** `QadiAtoms.test.ts` renders
  nothing — caching, sharing and invalidation are properties of the atoms, and
  proving them through components only makes the test slower and vaguer.
- **A guard may record that it exists, what it renders now, and where — never
  a retained verdict** (ADR-QD-053). `GateRegistry.ts` is a module-scope map a
  guard writes to from an effect — the shape `HydrationSeed.ts` already uses —
  carrying its policy, its resource, its current render state, and a ref React
  filled in. Nothing re-renders because a guard registered, and nothing in
  that file can affect what one renders.

  This section previously read as forbidding it, and `@qadi/devtools`'s React
  panel said so on screen: *"an instance registry would breach AGENTS.md §13
  twice over."* It would not, and the two rules it was said to breach are both
  still intact. Decisions are still not in React state, and the React glue in
  `QadiProvider.tsx` is `@effect/atom-react`'s `useAtomValue` (CCR-QD-150), not
  a hand-rolled subscription of its own — `GateRegistry.ts` exposes its own,
  separate `subscribe`/`snapshot` pair for exactly the instance-registry
  purpose this bullet describes.

  **Correction:** this section, and ADR-QD-053, previously went on to say
  present-tense "and it is `@qadi/devtools`, a DOM package already, that
  subscribes." `@qadi/devtools` has no dependency on `@qadi/react` at all
  (`GateRegistry.ts` lives in `@qadi/react`) and `DevtoolsDock.tsx` takes
  `gates` as a plain, one-shot prop — it does not subscribe to anything.
  What subscribes is the **host** wiring the two packages together:
  `examples/nextjs-newsroom/src/client/Dock.tsx` calls `useSyncExternalStore(
  subscribeGates, gateInstances, gateInstances)` and passes the result down as
  `gates`. That is the correct place for it — `@qadi/devtools`'s panel is
  meant to render for a host that has no `@qadi/react` at all, fed `gates`
  from wherever it likes — not a gap in `@qadi/devtools` to close.

  What the argument actually established is that the **atom layer** cannot see
  instances, which is true and is why the panel is still keyed by question. A
  component knows perfectly well that it exists; nothing was asking it.
- **Instrumentation is opt-in, and off means absent.** `QadiProvider`'s
  `instrument` defaults to `false`, and with it off no guard registers and no
  marker element is rendered — not a wrapper that does nothing, no wrapper. A
  consumer's DOM must not change because they upgraded this package. The
  assertion that keeps this honest is that the React suite's existing tests pass
  untouched.
- **`@qadi/react` calls no DOM API.** It renders a `display: contents` span and
  holds the ref React fills in; every DOM call lives in `@qadi/devtools`, split
  three ways rather than one. `react/Lens.ts` is a set of pure DOM operations —
  measuring, drawing and hit-testing — that a test can drive without
  rendering. `useLens.ts` wires `document`'s pointer/click/keydown listeners
  for the pick gesture, each inside an effect so a server-rendered host never
  reaches them. `QuestionsPanel.tsx` makes one `scrollIntoView` call, from a
  ref, to bring a picked row into view.

## 14. `@qadi/promise`

A Promise-returning facade for callers who do not use Effect. One rule, and it is
the whole package:

- **No branch in it may decide anything.** Every method is
  `runtime.runPromise(coreFunction(...))`. The predecessor shipped a second
  evaluation path and it destroyed short-circuiting, left the async relationship
  API unreachable, and rotted untested (ADR-QD-004). A facade that only forwards
  cannot repeat that; one that decides can. A review finding a conditional here
  should treat it as a defect (ADR-QD-032).
- **A denial resolves; a failure rejects.** `try { check() } catch { return false }`
  is the natural Promise idiom and turns an attribute-store outage into a silent
  lockout. `assert` is the deliberate exception, because there the caller has said
  "proceed only if permitted".
- **The subject travels per call**, so `CurrentSubject` stays out of the layer — as
  in `@qadi/react`, and for the same reason.

## 15. Documentation is gated, not remembered

`spec/overview.md` must name every export of every public package.
`scripts/check-api-surface.mjs` is merge gate 13 and fails otherwise; to leave an
export out of the tables, put it in that document's "Not listed above" table with a
reason. Omission is allowed, silent omission is not.

This exists because the document drifted twice — see CCR-QD-025 and CCR-QD-034. Two
occurrences is a property of the process rather than an oversight, and adding a
gate was cheaper than remembering a third time.

**Two more documents are gated for the same reason** (CCR-QD-075), and both were
found the same way: a claim was true when written and nobody was connecting it to
the thing it described.

`spec/devtools-spec/` held **seven** false claims at once — screens marked *Partial*
after they were built, "Not built. Screens 3 to 6" six increments late, lens mode
"blocked on a design change to `@qadi/react`" which is the change ADR-QD-053 made.
`scripts/check-devtools-claims.mjs` is merge gate 12: every statement there that
something is absent is registered in that folder's "Claims of absence" table with
the reason it still is. A superseded claim kept as a `>` blockquote under a
correction needs no row, which is already how those documents preserve history.

`spec/process/definitions-of-done.md` had drifted in both directions at once — a
Stryker run `pnpm check` performs and the table never listed, and **eight**
references elsewhere naming a step by a number two off, because CCR-QD-048 inserted
two steps in the middle. `scripts/check-dod-table.mjs` is merge gate 11: the table
must be the commands `pnpm check` runs, in order, and a "gate N" anywhere must name
the command it means so the number can be checked. **Name the script, not just the
number** — that is the rule that makes the rest possible, and prose that gives a
number with no command fails.

Change history is exempt from both. A CCR row saying a gate was added "as merge gate
10" records what was true then, and a gate that forced history to be rewritten to
stay green would corrupt the record it exists to protect.

**CI runs `pnpm check` and nothing else** (`.github/workflows/check.yml`). That is
deliberate: a workflow with its own list of steps would be a second definition of
"done", and two definitions of one thing drifting apart is the defect this library
was rewritten to remove. Adding a gate means editing `check` and the DoD table
together, and CI follows for free.

So a claim that CI does something is true exactly when that something is in
`pnpm check`. Before CCR-QD-036 there was no CI at all and six documents said there
was (CCR-QD-035) — check the workflow before writing the words, rather than the
other way round.

## 16. Publish with `pnpm`, never `npm`

`scripts/check-package-install.mjs` is merge gate 14: it packs each public package,
installs it into a sandbox and makes a TypeScript consumer authorize through the
published `exports` map. Two rules come out of it, and both are checked rather than
remembered.

**`pnpm publish`, never `npm publish`.** Dependencies use pnpm's workspace-time
protocols — `"effect": "catalog:"` everywhere, and `"@qadi/core": "workspace:*"`
in every public package that depends on it (currently eight: `@qadi/http`,
`promise`, `react`, `devtools`, `audit`, `testing`, `predicate-sql` and
`predicate-prisma` — check each package's `package.json` for the current set
rather than trusting this count to stay in sync). `pnpm` resolves them when
packing; `npm` copies them into the tarball
verbatim and the result cannot be installed at all (`EUNSUPPORTEDPROTOCOL`). The gate
fails if either protocol reaches a tarball, so this cannot rot into folklore.

**A new public package goes in `tsconfig.build.json`.** It is a *different* project
graph from `tsconfig.json`: the latter includes tests and the acceptance suite and is
what `pnpm typecheck` uses, the former is what ships. `@qadi/promise` was missing from
it from the day the facade landed and nobody noticed for six commits, because
`tsc -b` on the typecheck graph emits the same `lib/` and left something on disk that
looked like a build product (ADR-QD-033). Adding a package means editing both.

## 17. Formatting: hand-wrapping wins, `oxfmt` stays out of the gate

`oxfmt` is available (`pnpm format`, `pnpm format:check`) and is **not** a merge
gate — this is now a settled choice, not an open question. As of 2026-09-08,
`pnpm format:check` on a clean checkout (`packages/*/lib` removed) fails on 207
of 376 files — almost entirely by wanting to *un*wrap lines this codebase wraps
by hand at about ninety columns. An earlier `.oxfmtrc.json` `lineWidth`
experiment tried narrowing the formatter's width to close that gap; it still
produced 92-column lines, so width was never the whole disagreement, and the
file was reverted rather than kept — no `.oxfmtrc.json` exists in this
repository today.

Hand-wrapping wins: most files (169 of 376, same run) already wrap by hand,
nothing in this codebase's review history has flagged the wrapping style as a
problem, and reformatting the rest to match `oxfmt` would be a large, purely
cosmetic diff with no correctness or readability payoff. **`oxfmt` does not go
in `pnpm check`.** If a future change wants to revisit this, it needs a reason
beyond taste — this section existing is not license to reopen it without one.

> **Corrected in CCR-QD-121, and again here.** This section used to carry an
> undated "147 of 169" / "113 of 169" snapshot, stated as if evergreen, plus
> the `lineWidth` experiment above. No script gates these counts — unlike the
> DoD table, devtools claims, and publish-status facts §15 gates for exactly
> this reason — so they drifted twice over before CCR-QD-121: no
> `.oxfmtrc.json` file existed any more by the time anyone checked, and
> `spec/process/definitions-of-done.md`'s own note on the identical command had
> separately drifted to a *different* pair of numbers ("127 of 145 files").
> CCR-QD-121 re-ran the command (207 of 376 files, 2026-09-08) but left the
> stale 147/169 figures in place above, promising a date stamp beside them that
> was never added — the same class of drift this note exists to describe, one
> level up. The figures above are now that 2026-09-08 run's numbers directly,
> not the old ones with a date attached; `spec/process/definitions-of-done.md`'s
> note already carries the same dated figure. If this drifts again, re-run
> `pnpm format:check` and replace both counts here together, in place, rather
> than adding another correction paragraph.
