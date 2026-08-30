# Testing Patterns

**Analysis Date:** 2026-08-30

## Test Framework

**Runner:**
- Vitest with `@effect/vitest` integration
- Config: `vitest.config.ts` in root, overridable per package
- Package-specific configs in `packages/*/vitest.config.ts`

**Assertion Library:**
- `@effect/vitest` provides `assert` (via `assert` namespace)
- Standard assertions: `assert.isTrue()`, `assert.isFalse()`, `assert.strictEqual()`, `assert.deepStrictEqual()`, `assert.doesNotThrow()`, `assert.throws()`

**Run Commands:**
```bash
pnpm test              # Run all tests once
pnpm test:watch       # Watch mode for development
pnpm coverage         # Generate coverage report (enforces 90–95% thresholds)
pnpm test:types       # TypeScript type check tests (*.test-d.ts)
pnpm bench            # Run benchmarks (not in CI gate)
pnpm test:bdd         # BDD feature tests in spec/behaviors/
```

## Test File Organization

**Location:**
- Co-located next to source: `packages/core/src/Evaluate.ts` pairs with `packages/core/test/Evaluate.test.ts`
- Helpers in `test/helpers.ts` per package
- Shared fixtures in `test/fixtures/` if needed
- Feature/BDD tests in `spec/behaviors/` with Gherkin syntax

**Naming:**
- Test files: `[ModuleName].test.ts` (e.g., `Rules.test.ts`, `Layers.test.ts`)
- Benchmark files: `[ModuleName].bench.ts` in `bench/` directory (Vitest bench format)
- Type tests: `[ModuleName].test-d.ts` for TypeScript type checking via tstyche

**Structure:**
```
packages/core/
├── src/
│   ├── Evaluate.ts
│   └── index.ts
├── test/
│   ├── Evaluate.test.ts
│   ├── Rules.test.ts
│   ├── helpers.ts
│   └── ...
└── vitest.config.ts
```

## Test Structure

**Basic Suite:**
```typescript
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { evaluate } from "../src/Evaluate.ts";
import { testLayer, subjectWith } from "./helpers.ts";

describe("rule tables", () => {
  it.effect("an explicit deny row refuses where the permits would have allowed", () =>
    Effect.gen(function* () {
      const table = P.rules([P.denyWhen(P.hasRole("editor")), P.permitWhen(always)]);
      assert.isFalse(isAllowed(yield* run(table)));
    }));

  it.effect("no rule applying is a denial", () =>
    Effect.gen(function* () {
      const d = yield* run(P.rules([P.permitWhen(never), P.denyWhen(never)]));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.reason, "no rule applied");
    }));
});
```

**Test Runner Variants:**
- `it.effect()` — runs an Effect to completion, providing access to services
- `it.scoped()` — scoped resource setup/teardown via `Scope`
- `it.layer()` — test a Layer in isolation
- Plain `it()` — synchronous tests (rare; mostly for assertions or pure functions)

**Patterns:**
- Setup: `yield* Service` to get a service instance
- Teardown: automatic via Effect scope
- Assertions: `assert.*` methods from @effect/vitest
- Async/concurrent: expressed via Effect concurrency, not promises

## Mocking

**Framework:** Effect Layers — no external mocking library needed

**Patterns:**
```typescript
// ✅ Mock a service by providing a test Layer
const attributesMock = Layer.succeed(AttributeResolver, {
  name: "test",
  resolve: (_subjectId, attribute) => 
    Effect.succeed(testData[attribute]),
});

// ✅ Override a service in a test
Effect.provide(attributesMock)(evaluate(policy))

// ✅ Use testLayer() helper with selective overrides
evaluate(policy).pipe(
  Effect.provide(
    testLayer(subject, {
      attributes: attributeResolverFromRecord(customAttrs),
      relationships: relationshipResolverStatic(rules),
    })
  )
)
```

**What to Mock:**
- External services: `AttributeResolver`, `RelationshipResolver`, `DecisionHistory`, `SignatureHistory`, `CustomPredicate`
- Interfaces: Replace with stub/spy implementations returning fixed values or tracking calls
- Default implementations: `AttributeResolverNone`, `RelationshipResolverNever`, `DecisionHistoryUnknown` fail closed

**What NOT to Mock:**
- Core evaluation logic — test the actual `evaluate` function, not mocks of it
- Time (use `TestClock` from Effect instead)
- Random IDs (use `evaluationIdSequential()` for deterministic tests)
- Decision records or traces — verify real output
- Metric registry (isolate it per test to prevent pollution)

## Fixtures and Factories

**Test Data:**
```typescript
// ✅ Subject builder
const editor = subjectWith({ 
  id: "u1", 
  roles: ["editor"], 
  permissions: ["doc:read"] 
});

// ✅ Permission builder
const read = permission("doc", "read");

// ✅ Policy builders
const policy = P.hasRole("editor");
const table = P.rules([P.permitWhen(P.hasRole("admin"))]);
```

**Location:**
- `test/helpers.ts` contains `subjectWith()`, `testLayer()`, and other reusable fixtures per package
- Inline factories in test files for one-off data
- Shared test data in `test/fixtures/` when used across multiple test files

**Patterns:**
```typescript
// test/helpers.ts — exported helpers
export const subjectWith = (config: {
  readonly id?: string;
  readonly roles?: ReadonlyArray<string>;
  readonly permissions?: ReadonlyArray<PermissionKey>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}): AuthSubject => makeSubject({…});

export const testLayer = (subject: AuthSubject, overrides?: {…}): Layer.Layer<QadiServices> => 
  Layer.mergeAll(…);

// In tests
const subject = subjectWith({ roles: ["admin"] });
const layer = testLayer(subject, { attributes: customResolver });
```

## Coverage

**Requirements:** 
- 90% for most packages (lines, functions, branches, statements)
- 95% for pure-logic packages: `@qadi/core` and `@qadi/devtools/model`
- Enforced as a merge gate — shortfall fails CI

**View Coverage:**
```bash
pnpm coverage               # Generate HTML report in coverage/
# Open coverage/index.html in browser
```

**Configuration:**
- Provider: V8 (Vitest built-in)
- Reporters: text, html, lcov
- Thresholds in `vitest.config.ts` root
- Barrel files explicitly excluded from measurement to prevent false passes

**Improvement:**
- Missing branches in error paths? Add tests for error cases
- Uncovered functions? Add unit tests for that function
- Coverage gaps listed in each package test output

## Test Types

**Unit Tests:**
- Scope: Single function or module
- Approach: Provide inputs, verify outputs; mock dependencies
- Location: Alongside source file (co-located)
- Example: `Evaluate.test.ts` tests `evaluate` function in isolation with various policies

**Integration Tests:**
- Scope: Multiple modules working together
- Approach: Test realistic flows (e.g., policy evaluation with real resolver)
- Location: Same `test/` directory, often with "integration" in name or describe block
- Example: Evaluating a complete policy with custom predicates and history checks

**BDD/Feature Tests:**
- Scope: End-to-end behavior specifications
- Approach: Gherkin syntax (`Given`, `When`, `Then`)
- Location: `spec/behaviors/*.feature` and extracted TypeScript in `spec/behaviors/*.md`
- Command: `pnpm test:bdd` runs via Cucumber
- Traceability: Tagged with `@REQ-QD-NNN` linking to requirements

**E2E Tests:**
- Framework: Not used for authorization logic itself (authorization is unit/integration tested)
- Example apps: `examples/nextjs-newsroom/` has E2E via Cypress/Playwright if needed

## Common Patterns

**Async Testing:**
```typescript
// ✅ Effect yields and waits naturally
it.effect("async resolution completes", () =>
  Effect.gen(function* () {
    // Yields automatically wait for the Effect to complete
    const result = yield* someAsyncOperation();
    assert.isTrue(result);
  }));

// ✅ Concurrent evaluation via Effect concurrency
it.effect("concurrent evaluations", () =>
  Effect.gen(function* () {
    const results = yield* Effect.all([
      evaluate(policy1),
      evaluate(policy2),
      evaluate(policy3),
    ], { concurrency: 3 });
    // results now has all three decisions
  }));
```

**Error Testing:**
```typescript
// ✅ Catch and inspect errors
it.effect("raises AccessDenied when policy denies", () =>
  Effect.gen(function* () {
    const denied = yield* Effect.either(
      evaluate(denyPolicy).pipe(Effect.provide(testLayer(subject)))
    );
    assert.isTrue(Predicate.isLeft(denied));
    const error = denied.left;
    assert.strictEqual(error._tag, "AccessDenied");
    assert.strictEqual(error.subjectId, "u1");
  }));

// ✅ Test attribute resolver failures
it.effect("propagates attribute resolution errors", () =>
  Effect.gen(function* () {
    const broken = Layer.succeed(AttributeResolver, {
      resolve: () => Effect.fail(new AttributeResolveError({…})),
    });
    const result = yield* Effect.either(
      evaluate(policy).pipe(Effect.provide(broken))
    );
    assert.isTrue(Predicate.isLeft(result));
  }));
```

**Deterministic Execution:**
```typescript
// ✅ Use TestClock for time-based tests
it.effect("respects decision TTL", () =>
  Effect.gen(function* () {
    yield* TestClock.adjust(5000); // Advance time 5 seconds
    // Now test that cached decision expired
  }).pipe(Effect.provide(TestClock.layer)));

// ✅ Use evaluationIdSequential() for deterministic IDs
const layer = testLayer(subject); // Already uses evaluationIdSequential
// Each evaluation gets ID 1, 2, 3, … in order
```

**Layer Testing:**
```typescript
// ✅ Test a layer with it.layer
it.layer("AttributeResolverSubject resolves from subject", () =>
  Layer.effect(AttributeResolver, Effect.gen(function* () {
    const subject = yield* CurrentSubject;
    return { resolve: (_, attr) => Effect.succeed(subject.attributes[attr]) };
  })).pipe(
    Effect.provide(currentSubjectLayer(testSubject))
  ),
  (resolver) => 
    Effect.gen(function* () {
      const value = yield* resolver.resolve("u1", "department");
      assert.strictEqual(value, "engineering");
    }));
```

**Metric Isolation:**
```typescript
// ✅ Prevent test metric pollution
const isolated = isolatedMetrics(evaluate(policy))
  .pipe(Effect.provide(testLayer(subject)));

// Each test gets its own MetricRegistry with test attributes
```

## Test Doubles and Factories

**Layers (Service Implementations for Tests):**
- `testLayer(subject)` — complete environment with fail-closed defaults
- `subjectSetLayer()` — same but without CurrentSubject (for `evaluateSubjects`)
- `AttributeResolverNone` — resolves nothing, returns `undefined`
- `RelationshipResolverNever` — always returns false
- `DecisionHistoryUnknown` — claims no history
- `SignatureHistoryNone` — no signature support
- `CustomPredicateNone` — no custom predicates registered
- `evaluationIdSequential()` — deterministic sequential IDs (1, 2, 3, …)
- `CurrentSubject` layer via `currentSubjectLayer(subject)` — provides the subject under evaluation

**Builders:**
- `subjectWith(config)` — quick subject construction with defaults
- `makeSubject(config)` — explicit subject construction with validation
- `permission(resource, action)` — build a permission key
- `P.allOf([…])`, `P.hasRole(…)`, `P.rules([…])` — policy builders

## BDD/Feature Tests

**Location:** `spec/behaviors/*.feature` (Gherkin) and `spec/behaviors/*.md` (extracted, compiled TypeScript)

**Format:**
```gherkin
@REQ-QD-NNN @critical
Feature: Rule table combining strategies
  Background:
    Given an editor subject
    And a policy with permit and deny rows

  Scenario: FirstApplicable applies the first matching rule
    When evaluated
    Then the decision should allow
    And the trace reason should be "rules[0] permitted"

  Scenario: DenyOverrides applies the first deny rule anywhere
    When evaluated
    Then the decision should deny
```

**Traceability:**
- Every scenario tagged with `@REQ-QD-NNN` linking to spec requirement
- Extracted TypeScript code block compiled by `scripts/check-doc-examples.mjs`
- Code examples must type-check against the real API
- False documentation (examples that don't compile) is a build failure

## Type Checking Tests

**TStyche:**
- Command: `pnpm test:types`
- Test files: `[Name].test-d.ts` (d = definition)
- Assertions: `expectType<T>(value)`, `expectNotType<T>(value)`, `expectAssignable<T>(value)`
- Purpose: Verify type signatures and inference, not runtime behavior
- Example: `expectType<ReadonlyArray<string>>(roles)` verifies roles are readonly

**Disabled in Default Run:**
- `vitest.config.ts` has `typecheck: { enabled: false }` — type tests are slow
- Run separately or in CI: `pnpm test:types`

## Benchmarks

**Location:** `bench/[Name].bench.ts` (Vitest bench format)

**Run:**
```bash
pnpm bench               # Run all benchmarks once, print results
```

**Not a Gate:**
- Benchmarks are measurement, not a pass/fail gate in CI
- Timing thresholds fail on noisy runners and don't track meaningful changes
- Use benchmarks to track performance regression locally (`git diff`) before submitting

**Pattern:**
```typescript
import { bench, describe } from "vitest";
import { evaluate } from "../src/Evaluate.ts";

describe("evaluation performance", () => {
  bench("simple policy", () => {
    const policy = P.hasRole("editor");
    // Sync code only; Effects need .pipe(Effect.runSync())
  });

  bench("complex policy with matching", async () => {
    // Async benchmarks allowed
  });
});
```

## Coverage Threshold Exceptions

**Barrels Excluded:**
- `packages/core/src/index.ts` — re-export only, no logic
- `packages/react/src/index.ts` — re-export only
- `packages/devtools/src/index.ts` and `src/react/index.ts` — re-export split for dual entry points

**Reason:** Blanket `packages/*/src/index.ts` pattern would exclude real logic in `@qadi/promise` (whose index *is* the implementation), producing false passing coverage.

---

*Testing analysis: 2026-08-30*
