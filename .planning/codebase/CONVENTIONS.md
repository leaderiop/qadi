# Coding Conventions

**Analysis Date:** 2026-08-30

## Naming Patterns

**Files:**
- Source files: PascalCase (e.g., `Evaluate.ts`, `AuthSubject.ts`, `AttributeResolver.ts`)
- Test files: `[Name].test.ts` (e.g., `Rules.test.ts`, `Policy.test.ts`)
- Benchmark files: `[Name].bench.ts` in `bench/` directory
- Index barrels: `index.ts`, re-exports in alphabetical order

**Functions:**
- Builder functions: `make…` prefix (e.g., `makeSubject`, `makeResourceId`, `makeRoleName`)
- Unsafe variants: `…Unsafe` suffix, v4 Effect convention (e.g., `makeUnsafe`)
- Type guards: `is…` prefix (e.g., `isAllowed`)
- Service accessors: Static method on service class (e.g., `AttributeResolver.resolve()`)
- Facade wrappers: `…Retrying`, `…Forwarding`, `…Ring` suffixes for composed services

**Variables:**
- camelCase for local variables and parameters
- PascalCase for types and classes
- ALL_CAPS for module-level constants (rare; prefer `const`)
- Readonly sets/arrays use `ReadonlySet<T>`, `ReadonlyArray<T>`
- Branded types: template-literal brands for domain values (e.g., `SubjectId`, `RoleName`, `PermissionKey`)

**Types:**
- `…Shape` suffix for service payload interfaces (e.g., `AttributeResolverShape`)
- `…Like` suffix for structural brands requiring a certain shape (e.g., `ResourceLike`)
- Error classes: `PascalCase` extending `Data.TaggedError` with unprefixed tags (e.g., `AccessDenied`, `AttributeResolveError`)
- Policy/Matcher ADT tags: PascalCase, no namespace prefix

**Layers:**
- Production: `…Live` suffix (e.g., `AttributeResolverLive`)
- Test doubles: `…Test` suffix (e.g., `AttributeResolverTest`)
- Fail-closed defaults: `…None`, `…Never`, `…Unknown` suffixes
- Generic implementations: `…Subject`, or implementation-specific names
- Composed layers: `Default` or implementation-specific names

## Code Style

**Formatting:**
- Hand-wrapped lines at approximately 90 columns — tool-unwrapped output is reformatted by hand to maintain this width
- oxfmt available (`pnpm format`) but **not** a merge gate — hand-wrapping wins
- No trailing commas in function parameters; trailing commas in multiline objects/arrays
- Indentation: 2 spaces
- No semicolons at end of statements (ESNext module style)

**Linting:**
- oxlint (`pnpm lint`) checks code quality
- oxlint fixes available (`pnpm lint:fix`)
- House style rules enforced by `scripts/check-house-style.mjs` (merge gate)
- Switch statement count budget (`SWITCH_BUDGET` in check-house-style.mjs) enforced — the four hot-path switches in `Evaluate.ts` and `Matcher.ts` are exceptions with exact counts

**Strictness:**
- TypeScript strict mode enabled
- `noUncheckedIndexedAccess: true` — security library, indexed access must be checked
- `exactOptionalPropertyTypes: true` — optional props cannot be assigned `undefined`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- `verbatimModuleSyntax: true` — `import type` mandatory for type-only imports

## Import Organization

**Order:**
1. Effect modules: `import * as Effect from "effect/Effect"`
2. Other Effect modules: `import * as Layer from "effect/Layer"`
3. Type imports from Effect: `import type { Concurrency } from "effect/Types"`
4. Local type imports: `import type { Policy } from "./Policy.ts"`
5. Local value imports: `import { evaluate } from "./Evaluate.ts"`

**Path Aliases:**
- Workspace packages resolve through tsconfig paths: `"@qadi/core": ["./packages/core/src/index.ts"]`
- Use full namespace imports, never named imports

**Relative Imports:**
- Carry `.ts` extension: `import { evaluate } from "./Evaluate.ts"` (not `./Evaluate`)
- Used for co-located files within a package

**Submodule Imports Only:**
```typescript
// ✅ Do this
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// ❌ Never do this
import { Effect, Layer } from "effect";
import { evaluate } from "./Evaluate.js";
```

## Error Handling

**Patterns:**
- All errors extend `Data.TaggedError` with unprefixed `_tag` values (e.g., `"AccessDenied"`, not `"qadi/AccessDenied"`)
- Error tags are exhaustively mapped to stable numeric codes in `ERROR_CODES` (e.g., `ACL001`, `ACL002`)
- Use `Effect.catchTag` with array form for handling multiple tags: `Effect.catchTag(["AccessDenied", "PolicyEvaluationError"], (e) => …)`
- **Never** use `Effect.catchTags` with object form (structural checks are forbidden)
- **Never** use `Effect.orDie` in evaluation or enforcement paths — authorization decisions must never become defects
- Failure vs. Denial: Failures (broken resolvers) propagate as effects; denials (policy did not allow) resolve with `Decision.allowed === false`

**Error Functions:**
- No `new Error()` — use `Data.TaggedError` exclusively
- Error codes stable and never reused — enables logging and cross-process correlation
- Error details include caller-supplied identifiers where relevant (e.g., `subjectId`, `attribute`, `reason`)

## Logging

**Framework:** `effect/Logger` via Effect's structured logging

**Patterns:**
- Logging is optional instrumentation, off by default
- Use `Effect.logDebug`, `Effect.logWarn`, `Effect.logError` within Effect contexts
- Metrics emit aggregates of decisions and errors by tag (cardinality-bounded to prevent memory leaks)
- Span attributes available via `@effect/opentelemetry` integration
- Per-evaluation metrics: `decisionsTotal`, `denialsByPolicyTag`, `evaluationErrors`

## Comments

**When to Comment:**
- Function-level: One-line summary first, then explanation of *why* (history, ADR citations, invariant cross-references)
- Inline: Explain non-obvious logic, especially edge cases and performance choices
- Architecture: Larger decisions documented in ADRs and spec/, not inline comments
- Do not comment what the code obviously does; comment why it was done that way

**JSDoc/TSDoc:**
- Exported functions and types carry JSDoc comments
- Format: `/** Summary. More detail. */`
- Links to other types: `{@link PolicyTag}`, `{@link Errors.AccessDenied}`
- Links to ADRs: `[ADR-QD-018](../../../spec/decisions/018-*.md)`
- Links to invariants: `[INV-QD-005](../../../spec/invariants.md#inv-qd-005-*)`
- Separate the summary (line 1) from rationale (following paragraphs)

Example:
```typescript
/**
 * The entity being authorized.
 *
 * `permissions` is a pre-flattened set of `"resource:action"` keys so that a
 * `HasPermission` check is O(1) and needs no role traversal at evaluation time.
 * Role inheritance is resolved once, when the subject is built.
 */
export interface AuthSubject { … }
```

## Function Design

**Size:** Most functions 10–50 lines; complex ones up to 150 lines with clear sections

**Parameters:**
- Destructured config objects preferred over multiple parameters (prevents `(a, b, c)` slip bugs)
- `ReadonlyArray<T>` and `ReadonlySet<T>` for inputs, never mutable
- Branded types constrain identifiers at the type level (e.g., `SubjectId`, `ResourceId`)

**Return Values:**
- Effectful functions return `Effect.Effect<A, E, R>` — never `Promise` (except `@qadi/promise` facade)
- Builders return values or Effects: `make…` functions
- Type guards return `value is TypeGuard` for narrowing
- Service methods return Effects through accessor pattern

## Module Design

**Exports:**
- Every module exports its primary type/function + supporting helpers
- Barrel index at `src/index.ts` re-exports public API alphabetically
- `…Shape` interfaces always exported alongside service classes
- Error types always exported

**Layers:**
- One implementation per file, named for what it is (e.g., `AttributeResolverSubject.ts` contains the subject-based implementation)
- No `static layer` properties on services
- Standalone layer consts at module scope

**Barrels:**
```typescript
// ✅ Alphabetical export * from
export * from "./AttributeResolver.ts";
export * from "./AuthSubject.ts";
export * from "./Errors.ts";
```

Shared scaffolding stays out of barrels — internal helpers not re-exported to avoid polluting the flat namespace.

## Schema

**Domain Types:**
- Hand-written interfaces with template-literal brands: `type SubjectId = string & Brand.Brand<"SubjectId">`
- Validators as pure functions: `makeSubjectId(id: string): SubjectId`

**Policy ADT (Exception):**
- Schema-first for untrusted input: `Policy` and `Matcher` are schema-derived unions
- Type derived from schema: `export type Policy = typeof PolicySchema.Type`
- Used because policies cross a trust boundary and must be re-parsed from untrusted JSON (ADR-QD-002)

**Schema Patterns:**
- `Schema.Union([…])` for tagged unions (array form, not rest args)
- `Schema.suspend` for self-referential types
- `Schema.TaggedStruct` for ADT variants
- Type-assertion validates schema against intended type

## Service Pattern

**Structure:**
```typescript
// ✅ Service pattern with Shape interface
export interface AttributeResolverShape {
  readonly name?: string;
  readonly resolve: (subjectId: SubjectId, attribute: string) 
    => Effect.Effect<unknown, AttributeResolveError>;
}

export class AttributeResolver extends Context.Service<
  AttributeResolver,
  AttributeResolverShape
>()("qadi/AttributeResolver") {
  static readonly resolve = (subjectId: SubjectId, attribute: string) =>
    AttributeResolver.use((r) => r.resolve(subjectId, attribute));
}
```

Tag IDs namespaced as `"qadi/ServiceName"`. Static accessors return Effects (one-step method, not identity).

## Effectful Functions

**All effectful functions use `Effect.fn`:**
```typescript
// ✅ Effectful function with optional span name
export const evaluate = Effect.fn("qadi.evaluate")(function* (policy: Policy) {
  const subject = yield* CurrentSubject;
  // …
});

// ✅ Constructor using Effect.gen
const layer = Layer.effect(Service, Effect.gen(function* () {
  const dep = yield* Dependency;
  return { /* impl */ };
}));
```

**Never:**
```typescript
// ❌ async/await
async function evaluate(policy: Policy) { … }

// ❌ new Promise
return new Promise((resolve) => { … });

// ❌ .then chains
effect.then(value => …);
```

## Dispatch and Pattern Matching

**Use `Match` for tag-based dispatch:**
```typescript
// ✅ Exhaustive match on tagged union
export const referencesAction: (self: Matcher) => boolean = 
  Match.type<Matcher>().pipe(
    Match.tagsExhaustive({
      Eq: (m) => m.ref._tag === "ActionRef",
      FieldMatch: (m) => referencesAction(m.matcher),
      In: () => false,
      // …every remaining tag
    }),
  );

// ✅ Literal union dispatch
const compare = (op: CompareOp): string =>
  Match.value(op).pipe(
    Match.when("Eq", () => "="),
    Match.when("Lt", () => "<"),
    Match.exhaustive,
  );
```

**Four documented switch exceptions** (hot paths with measured performance benefit):
- `Evaluate.ts` — `evaluateNode` switch on `policy._tag`
- `Evaluate.ts` — `mergeFields` switch on `FieldStrategy`
- `Matcher.ts` — `evaluateMatcher` switch on `self._tag`
- `Matcher.ts` — `resolveRef` switch on `ref._tag`

Each has exhaustive coverage (default arm assigns to `never` for cardinality safety).

## Type Narrowing and Assertions

**Forbidden:**
- `as`, `as any` — fix the type instead
- `!` (non-null assertion) — fix the type or add a check
- `any` type — use generics or `unknown` with type guards
- Structural type checks like `if (e._tag === "X")` — use `Match` or type guards

**Preferred:**
- Branded types for domain values
- Type predicates and type guards for narrowing
- Generics for polymorphism

## Library Imports

**Dependencies at source (not lib/):**
- Workspace packages in `tsconfig.paths` resolve to `src/`, not built `lib/`
- Tests need no build step; `pnpm typecheck` compiles both together
- Emitted `.d.ts` files preserve `.ts` module specifiers
- Entrypoint exports map published through `exports` field in `package.json`

## Forbidden Patterns

| Don't | Do |
| ----- | -- |
| `import fs from "node:fs"` | `yield* FileSystem.FileSystem` |
| `Date.now()`, `new Date()` | `yield* Clock.currentTimeMillis`, `DateTime` |
| `performance.now()` | `Effect.timed` |
| `crypto.randomUUID()` | `yield* EvaluationId` service |
| `Effect.either` | `Effect.result` + `Result.isSuccess/isFailure` |
| `Effect.orDie` in evaluation | fail with proper error type |
| `Record<string, unknown>` as impl type | monomorphize or use type predicate |

Determinism matters: previous implementation used `Date.now()` and `performance.now()` inside evaluation, making traces untestable. Under `TestClock` they are now reproducible.

---

*Convention analysis: 2026-08-30*
