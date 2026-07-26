# Qadi — Engineering Conventions

Effect-native authorization library. **Effect v4.** These rules are not suggestions; code that violates them does not merge.

Style reference projects (read them when in doubt):

- `/Users/u1070457/Projects/Sanofi/alchemy` — Effect v4 beta, `AGENTS.md` is its authority
- `/Users/u1070457/Projects/Sanofi/effect` — the Effect v4 source itself

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

Relative imports carry the **`.ts` extension** (`allowImportingTsExtensions` +
`rewriteRelativeImportExtensions`). `verbatimModuleSyntax` is on, so
`import type` is mandatory for type-only imports.

## 2. Services — `Context.Service`

Never `Effect.Service`, `Context.Tag`, `Context.GenericTag`, or `Context.Reference`.
The shape is a **separately exported `interface …Shape`**.

```ts
export interface AttributeResolverShape {
  readonly resolve: (
    attribute: string,
    resource?: Resource,
  ) => Effect.Effect<unknown, AttributeResolveError>;
}

export class AttributeResolver extends Context.Service<
  AttributeResolver,
  AttributeResolverShape
>()("qadi/AttributeResolver") {
  // `use` requires its callback to RETURN an Effect — it is a one-step method
  // accessor, not an identity read.
  static resolve = (attribute: string) =>
    AttributeResolver.use((r) => r.resolve(attribute));
}
```

Tag ids are namespaced: `"qadi/AttributeResolver"`.

To obtain the whole service, `yield* AttributeResolver`. Note that alchemy's
`static current = X.use((x) => x)` idiom **only typechecks when the service
Shape is itself an `Effect`** (as in its `AWSEnvironment`). Our shapes are plain
records, so we use the method-accessor form above. `packages/core/test/v4-api-smoke.test.ts`
pins this and the other v4 APIs we depend on.

## 3. Layers — standalone consts, own file

No `static layer`. No `.Default`. One implementation per file, named for what it is.

```ts
// AttributeResolverSubject.ts
export const AttributeResolverSubject = Layer.effect(
  AttributeResolver,
  Effect.gen(function* () {
    const subject = yield* CurrentSubject;
    return {
      resolve: (attribute) => Effect.succeed(subject.attributes[attribute]),
    };
  }),
);
```

Naming: `…Live` (production), `…Test` (deterministic), `Default` (the layer of a
namespace-imported module), or implementation-specific (`…Subject`, `…Never`).

**Gotcha:** `Layer.mergeAll` silently drops tail layers past ~90 arguments —
tsc's variadic inference limit. Nest into groups.

## 4. Errors — `Data.TaggedError`

Not `Schema.TaggedErrorClass`. Namespaced tags.

```ts
export class AccessDenied extends Data.TaggedError("qadi/AccessDenied")<{
  readonly policyTag: string;
  readonly subjectId: string;
  readonly reason: string;
}> {}
```

Handling — v4 uses the **array form**; there is no `catchTags({...})` object form:

```ts
// ✅
Effect.catchTag("qadi/AccessDenied", (e) => …)
Effect.catchTag(["qadi/AccessDenied", "qadi/PolicyEvaluationError"], (e) => …)

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

**Two hot-path switches remain unconverted**: `evaluateNode` in `Evaluate.ts` and
`evaluateMatcher` in `Matcher.ts`. Both run once per policy node per evaluation —
and in `filter` and `decideSubjects`, once per element on top of that — where
their handlers close over per-call state so the matcher cannot be hoisted. They
are a deliberate exception, not an oversight; converting them needs a benchmark
first.

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

## 7. Schema

Domain types are ordinarily **hand-written interfaces** with template-literal
brands — that is the alchemy norm and it applies to `Permission`, `Role`, `AuthSubject`.

**The Policy ADT is the deliberate exception** (ADR-QD-002). Policies cross a
trust boundary: they are persisted and re-parsed from untrusted JSON. Hand-written
codecs are exactly what caused the data-loss defect this library was rewritten to
fix. So the policy union is defined once as a Schema and the type is derived:

```ts
export const Policy = Schema.Union([HasPermission, HasRole, AllOf, /* … */]);
export type Policy = typeof Policy.Type;
```

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
  place for it instead.
- **No additional dependencies.** The React glue is one `useSyncExternalStore`
  call in `QadiProvider.tsx`. `@effect/atom-react` supplies the same thing plus
  features this package does not use, and was rejected on that basis
  (ADR-QD-014).
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
`scripts/check-api-surface.mjs` is merge gate 9 and fails otherwise; to leave an
export out of the tables, put it in that document's "Not listed above" table with a
reason. Omission is allowed, silent omission is not.

This exists because the document drifted twice — see CCR-QD-025 and CCR-QD-034. Two
occurrences is a property of the process rather than an oversight, and adding a
gate was cheaper than remembering a third time.

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

`scripts/check-package-install.mjs` is merge gate 10: it packs each public package,
installs it into a sandbox and makes a TypeScript consumer authorize through the
published `exports` map. Two rules come out of it, and both are checked rather than
remembered.

**`pnpm publish`, never `npm publish`.** Dependencies use pnpm's workspace-time
protocols — `"effect": "catalog:"` everywhere, `"@qadi/core": "workspace:*"` in three
packages. `pnpm` resolves them when packing; `npm` copies them into the tarball
verbatim and the result cannot be installed at all (`EUNSUPPORTEDPROTOCOL`). The gate
fails if either protocol reaches a tarball, so this cannot rot into folklore.

**A new public package goes in `tsconfig.build.json`.** It is a *different* project
graph from `tsconfig.json`: the latter includes tests and the acceptance suite and is
what `pnpm typecheck` uses, the former is what ships. `@qadi/promise` was missing from
it from the day the facade landed and nobody noticed for six commits, because
`tsc -b` on the typecheck graph emits the same `lib/` and left something on disk that
looked like a build product (ADR-QD-033). Adding a package means editing both.

## 17. Formatting is deliberately not enforced

`oxfmt` is available (`pnpm format`, `pnpm format:check`) and is **not** a merge
gate. `pnpm format:check` reports 147 of 169 files, and running the formatter
rewrites 56 of them — almost entirely by *un*wrapping lines this codebase wraps by
hand at about ninety columns. Setting `lineWidth` in `.oxfmtrc.json` cut the count
to 55 but did not stop it producing 92-column lines, so its width is not the whole
disagreement.

That is a genuine conflict of opinion, not an oversight, and it is recorded here so
nobody has to rediscover it: **do not add `format:check` to `pnpm check` without
first settling whether the formatter or the hand-wrapping wins.** A script that
always fails and gates nothing is the shape this repository has spent several
changes removing; leaving it undecided and undocumented would be the same defect in
a smaller form.
