<!-- refreshed: 2026-08-30 -->
# Architecture

**Analysis Date:** 2026-08-30

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Enforcement Interfaces                             │
│  decide | check | assert | enforce | enforceProjected | guard | filter      │
│                          (`Qadi.ts`)                                         │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Policy Evaluation Engine                                │
│  evaluateNode() → Trace tree with decision outcome (`Evaluate.ts`)           │
└────────────┬────────────────────────────┬──────────────────┬────────────────┘
             │                            │                  │
             ▼                            ▼                  ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  Matcher Evaluator   │  │ Obligation Handler   │  │ Decision Cache       │
│ (`Matcher.ts`)       │  │ (`Obligation.ts`)    │  │ (`DecisionCache.ts`) │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Evaluation Services Layer                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Attribute   │  │ Relationship │  │ Decision     │  │ Custom         │  │
│  │ Resolver    │  │ Resolver     │  │ History      │  │ Predicates     │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  └────────────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │ CurrentSubject       │  │ Signature History    │                        │
│  │ (request scope)      │  │                      │                        │
│  └──────────────────────┘  └──────────────────────┘                        │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │ Decision Sink        │  │ Evaluation Id        │                        │
│  │ (optional audit)     │  │ (correlation)        │                        │
│  └──────────────────────┘  └──────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Domain Data Structures                              │
│  Policy ADT | Decision (Allow|Deny) | Trace Tree | AuthSubject | Matcher    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Qadi** | Primary enforcement interface; gates Effects with policy decisions | `packages/core/src/Qadi.ts` |
| **Evaluate** | Policy tree evaluator; generates decision traces with Effect evaluation | `packages/core/src/Evaluate.ts` |
| **Matcher** | Evaluates matchers (comparisons); supports nested path resolution | `packages/core/src/Matcher.ts` |
| **Policy** | Policy ADT definition with schema codec; defines all policy types | `packages/core/src/Policy.ts` |
| **Decision** | Allow/Deny outcome types with trace trees and field visibility | `packages/core/src/Decision.ts` |
| **AttributeResolver** | Service to resolve subject attributes (lazily, on-demand) | `packages/core/src/AttributeResolver.ts` |
| **RelationshipResolver** | Service to answer ReBAC relationship queries | `packages/core/src/RelationshipResolver.ts` |
| **DecisionHistory** | Service to query history of subject actions/events | `packages/core/src/DecisionHistory.ts` |
| **CustomPredicate** | Service for externally-registered predicates | `packages/core/src/CustomPredicate.ts` |
| **SignatureHistory** | Service for signature validation | `packages/core/src/SignatureHistory.ts` |
| **DecisionCache** | Optional cache layer for decisions (policy + resource + subject) | `packages/core/src/DecisionCache.ts` |
| **DecisionSink** | Optional output for audit/observability; non-blocking append | `packages/core/src/DecisionSink.ts` |
| **Promise Facade** | Promise-returning wrapper for Effect-free consumers | `packages/promise/src/index.ts` |
| **React Binding** | Atoms-based reactive decision provider with hydration support | `packages/react/src/` |
| **Testing Layer** | Mock/recording implementations of all services | `packages/testing/src/` |
| **Audit Package** | Decision sink implementations and signature capture | `packages/audit/src/` |
| **HTTP Package** | Express/middleware integration and permission-based routing | `packages/http/src/` |
| **Predicate Translators** | SQL and Prisma predicate query builders | `packages/predicate-sql/src/`, `packages/predicate-prisma/src/` |

## Pattern Overview

**Overall:** Effect-native authorization library with policy-as-data, schema-derived ADT, and lazy evaluation.

**Key Characteristics:**
- **Policy as data**: Policies are persisted, decoded JSON — schema-first (ADR-QD-002)
- **Lazy evaluation**: Attributes and relationships resolved only when needed; short-circuits preserved (INV-QD-005)
- **Effect everywhere**: All I/O effects: service lookups, async relationships, retries, concurrency
- **Trace trees**: Every decision carries full reasoning for audit, debugging, and explanation
- **Field visibility**: Policies control both *permission* and *visible fields* in one pass
- **Obligation support**: Conditions that must be discharged before permission is exercised
- **Deterministic**: Uses `TestClock` and generated ids, not `Date.now()` or `performance.now()`

## Layers

**Enforcement Layer:**
- Purpose: Provide Effect-based entry points to authorization decisions
- Location: `packages/core/src/Qadi.ts`
- Contains: `decide()`, `check()`, `assert()`, `enforce()`, `enforceProjected()`, `guard()`, `filter()`, `filterStream()`
- Depends on: Evaluate, Decision, Errors, CurrentSubject
- Used by: React components, HTTP middleware, custom integrations

**Evaluation Engine:**
- Purpose: Walk the policy tree, consult services, build decision traces
- Location: `packages/core/src/Evaluate.ts`
- Contains: Core `evaluate()` function, node evaluation logic, field merging, metrics
- Depends on: Policy, Matcher, AttributeResolver, RelationshipResolver, DecisionHistory, CustomPredicate, SignatureHistory, DecisionCache, DecisionSink
- Used by: Qadi enforcement layer

**Matcher Evaluator:**
- Purpose: Evaluate matcher predicates (comparisons, nested path access)
- Location: `packages/core/src/Matcher.ts`
- Contains: Matcher type definition and `evaluateMatcher()` logic
- Depends on: Policy, AuthSubject attributes
- Used by: Evaluate engine

**Service Layer:**
- Purpose: Abstract external dependencies (attributes, relationships, history, custom logic)
- Location: `packages/core/src/AttributeResolver.ts`, `RelationshipResolver.ts`, `DecisionHistory.ts`, `CustomPredicate.ts`, `SignatureHistory.ts`
- Contains: `Context.Service` definitions with default no-op implementations and composable wrappers (retrying, bounding)
- Depends on: Effect Context/Layer
- Used by: Evaluate engine

**Data Model Layer:**
- Purpose: Define domain types and persistence codec
- Location: `packages/core/src/Policy.ts`, `Decision.ts`, `AuthSubject.ts`, `Permission.ts`, `Role.ts`, `Matcher.ts`, `Obligation.ts`
- Contains: Type definitions, schema codecs (for Policy), utility functions
- Depends on: Effect Schema
- Used by: All layers

**Facade Layers:**
- Promise facade (`packages/promise/src/`): Forwards Effect calls to Promise via `ManagedRuntime`
- React binding (`packages/react/src/`): Atoms-based reactivity with hydration, keyed by policy structure
- Testing layer (`packages/testing/src/`): Mock AttributeResolver, RelationshipResolver, DecisionHistory, CustomPredicate

## Data Flow

### Primary Request Path: `enforce(policy)(effect)`

1. **Entry point** (`Qadi.ts`: `enforce()`) → wraps Effect with authorization
2. **Permitted check** (`Qadi.ts`: `permitted()`) → evaluates policy
3. **Policy evaluation** (`Evaluate.ts`: `evaluate()`) → walks tree, resolves services
4. **Node evaluation** (`Evaluate.ts`: `evaluateNode()`) → dispatches on policy tag
5. **Matcher evaluation** (for attribute/custom policies) (`Matcher.ts`: `evaluateMatcher()`) → compares values
6. **Service calls** (AttributeResolver, RelationshipResolver, etc.) → fetch data lazily
7. **Trace assembly** → builds decision with reason and field visibility
8. **Cache storage** (if cache wired) (`DecisionCache.ts`) → store for reuse
9. **Audit record** (if sink wired) (`DecisionSink.ts`) → append-only audit trail
10. **Obligation discharge** (`Qadi.ts`: `discharge()`) → run handler or fail with UndischargedObligation
11. **Guarded effect execution** → proceed or fail with AccessDenied

### Decision Outcomes

- **Allow with fields**: Permission granted; only listed fields visible (or all if fields=undefined)
- **Allow with obligations**: Permission granted; caller must discharge duties before proceeding
- **Deny with reason**: Permission refused; trace tree explains which policy node denied

### Cache Lookup Path

1. Policy + resource + subject id → cache key (`DecisionCacheKey`)
2. Cache hit → return stored decision immediately, skip evaluation
3. Cache miss → evaluate, store result, return
4. Cache invalidation → explicit via `DecisionCache.invalidate()`

### History/Signature Lookup Path

1. **HasActed** policy → call `DecisionHistory.check({ subjectId, event, scope })`
2. **HasNotActed** policy → negate history result
3. **HasSignature** policy → call `SignatureHistory.get({ subjectId, meaning, signerRole, scope })`

### Stream Filtering Path: `filterStream(policy)(stream)`

1. Stream emits item
2. `decideOne(policy, item)` evaluates per-item
3. Obligations discharged (items with binding obligations fail the entire filter)
4. Filtered stream emits only allowed items, in order

**State Management:**
- **No global mutable state in evaluation paths**: Services are Effect-based; state lives in layers
- **Request scoping**: `CurrentSubject` is optional layer per request, not singleton
- **Cache state**: Held in `DecisionCache` service if wired; miss-only evaluation otherwise
- **Sink buffering**: `DecisionSink` implementations handle their own buffering (ring, feed, etc.)

## Key Abstractions

**Policy ADT (Algebraic Data Type):**
- Purpose: Closed union of policy types; schema-first definition
- Examples: `HasPermission`, `HasRole`, `HasAttribute`, `AllOf`, `AnyOf`, `Rules`, `Not`, `Obliged`, `HasSignature`
- Pattern: Each variant is a tagged struct; policy tree is recursive via `Schema.suspend()`; JSON codec is direct derivation

**Decision Trace Tree:**
- Purpose: Full reasoning trail for every decision
- Examples: Each node names the policy type, outcome, reason (for denials and rule matches), child traces, visible fields
- Pattern: Immutable tree of `Trace` nodes; captured at decision time; used for audit, explanation, debugging

**Matcher:**
- Purpose: Predicate language for attribute/resource comparisons
- Examples: `Eq`, `Lt`, `In`, `FieldMatch` (nested path), `And`, `Or`
- Pattern: Recursive matcher type; comparisons dispatch on type; lazy field access with `FieldPath` wildcards

**Obligation:**
- Purpose: Conditions to discharge before permission is exercised
- Examples: Named duty (e.g., "log_access", "send_email")
- Pattern: Tagged data; collected during allow trace; discharged via `ObligationHandler` or refused via `UndischargedObligation`

**Decision (Allow | Deny):**
- Purpose: Outcome of policy evaluation with metadata
- Examples: Allow carries visible fields, obligations, trace; Deny carries reason and trace
- Pattern: Tagged classes with full context; projected down to `Partial<Resource>` if resource type is known

## Entry Points

**`Qadi.decide(policy, options)`:**
- Location: `packages/core/src/Qadi.ts`
- Triggers: Direct call to report a decision
- Responsibilities: Evaluate policy, return full decision with trace and obligations (not enforced)

**`Qadi.check(policy, options)`:**
- Location: `packages/core/src/Qadi.ts`
- Triggers: Direct call for boolean answer
- Responsibilities: Evaluate policy, return `true` if allowed, `false` if denied

**`Qadi.assert(policy, options)`:**
- Location: `packages/core/src/Qadi.ts`
- Triggers: Direct call; fails if denied
- Responsibilities: Evaluate policy, fail with `AccessDenied` if denied, discharge obligations

**`Qadi.enforce(policy, options)(effect)`:**
- Location: `packages/core/src/Qadi.ts`
- Triggers: Wrap any Effect
- Responsibilities: Gate effect execution behind policy, discharge obligations, fail on denial

**`Qadi.enforceProjected(policy, options)(effect)`:**
- Location: `packages/core/src/Qadi.ts`
- Triggers: Wrap effect returning a Resource
- Responsibilities: Gate execution, project result down to visible fields

**`Qadi.guard(permission, policy, options)(resource, handler)`:**
- Location: `packages/core/src/Qadi.ts`
- Triggers: Per-permission scoped check
- Responsibilities: Evaluate policy against resource, pass witness to handler, type-tag result

**`Qadi.filter(policy, items, options)`:**
- Location: `packages/core/src/Qadi.ts`
- Triggers: Filter array by policy
- Responsibilities: Evaluate per item, discharge obligations, drop denied items

**`Qadi.filterStream(policy, stream, options)`:**
- Location: `packages/core/src/Qadi.ts`
- Triggers: Filter stream by policy
- Responsibilities: Evaluate per item as emitted, discharge obligations, drop denied items, stream allowed items

**Promise facade (`makeQadi(layer)`)**:
- Location: `packages/promise/src/index.ts`
- Triggers: Non-Effect consumers (HTTP handlers, server functions)
- Responsibilities: Forward to Effect entry points via `ManagedRuntime`

**React hooks (`useGate(policy, options)`)**:
- Location: `packages/react/src/useGate.ts`
- Triggers: Component render
- Responsibilities: Subscribe to decision atom, return AsyncResult with allow/deny state

## Architectural Constraints

- **Threading:** Single-threaded event loop with optional concurrent evaluation via `concurrency` option; concurrency does *not* change answers (ADR-QD-026)
- **Global state:** None in evaluation paths; services live in Effect layers; `DecisionCache` and `DecisionSink` hold optional state keyed by decision
- **Circular imports:** Prevented by barrel exports and layer separation; `packages/*/src/index.ts` alphabetizes and omits internal helpers
- **Service cardinality:** One instance of each service per Effect context; `CurrentSubject` is optional and scoped per request, not a singleton
- **Determinism:** Times and ids generated via Effect services (`Clock`, `EvaluationId`), never `Date.now()` or `crypto.randomUUID()`; reproducible under `TestClock`

## Anti-Patterns

### Deciding Inside Evaluation

**What happens:** Conditional logic in a facade or middleware that changes behavior based on policy outcome.

**Why it's wrong:** A second evaluation path that is never tested; answers can disagree; short-circuiting is destroyed.

**Do this instead:** The `@qadi/promise` facade forwards to Effect entry points only (`packages/promise/src/index.ts`). Review finding a conditional deciding anything is a defect (ADR-QD-032).

### Pre-Resolving All Attributes

**What happens:** Load all attributes into `AuthSubject.attributes` before evaluation starts.

**Why it's wrong:** Kills short-circuiting; an `anyOf` whose first branch allows still pays for all lookups in other branches.

**Do this instead:** Attributes on the subject are consulted first (`Evaluate.ts`: `readAttribute()`); only cache misses call `AttributeResolver`. The evaluator calls the resolver at the node that needs it, preserving short-circuit (INV-QD-005).

### Omitting Obligations from JSON

**What happens:** `fieldStrategy` or other required fields are optional in a Policy codec.

**Why it's wrong:** Field omission survives JSON round-trips; a policy stored and reloaded silently changes behavior (this is the defect ADR-QD-002 fixed).

**Do this instead:** Required fields are required in the schema (`Policy.ts`). A missing field at decode time fails with a `SchemaIssue`, not silent narrowing.

### Using `any` or Widened Types

**What happens:** `Record<string, unknown>` to dodge a type mismatch.

**Why it's wrong:** Hides the actual disagreement; future changes cannot see what broke.

**Do this instead:** Monomorphize the type or use a type predicate (memory note: `Record<string, unknown> is a hack`). The cast at the boundary is the honest cost of an abstraction.

## Error Handling

**Strategy:** Errors separate from denials; a denial is an answer, a failure is an error.

**Patterns:**
- **Denial**: Policy evaluated; answered "no". Returns `Deny` decision (in `decide`/`check`) or fails Effect with `AccessDenied` (in enforce).
- **Evaluation error**: Policy could not be evaluated (attribute resolver failed, tree too deep, missing required data). Returns error via Effect channel; re-thrown by Promise facade.
- **Obligation failure**: Handler failed to discharge duty. Returns `UndischargedObligation`; guarded effect does not run.
- **Undischarged (no handler)**: Allow carries binding obligations, no handler supplied. Returns `UndischargedObligation`; guarded effect does not run.

**Categorization:**
- `EvaluationError`: Errors during policy tree walk (`MissingAction`, `MissingResource`, `PolicyTooDeep`, `AttributeResolveError`, `RelationshipResolveError`)
- `EnforcementError`: `EvaluationError | AccessDenied | UndischargedObligation`
- `AccessDenied`: Raised by enforcing entry points when policy denies
- `UndischargedObligation`: Raised when binding obligations cannot be discharged

## Cross-Cutting Concerns

**Logging:** Performed via `Effect.logDebug`, `Effect.logInfo`, `Effect.annotateCurrentSpan`. Full decision reason (caller-specific ids) logged; metrics keyed on closed unions (policy tags) to avoid cardinality explosion.

**Validation:** Policy validation happens at JSON decode time via `Schema` codec. Branded strings (`RoleName`, `ActionName`, etc.) validate segment patterns (`SEGMENT_PATTERN`). Hand-written types carry template-literal brands; do not round-trip through JSON.

**Authentication:** Not Qadi's concern; `CurrentSubject` is supplied by the layer wiring it. The subject may be cached or scoped per request; architecture does not dictate which.

**Caching:** Optional; `DecisionCache` service holds decisions keyed by (policy, resource, subject). Miss-only evaluation otherwise.

**Observability:** Metrics for decision counts (by outcome), denial frequency (by policy tag), evaluation duration, evaluation errors (by error tag), port retries. All exported as `Metric.Metric` objects; wired to a `MetricRegistry` by the caller.

---

*Architecture analysis: 2026-08-30*
