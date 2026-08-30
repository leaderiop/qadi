# Codebase Structure

**Analysis Date:** 2026-08-30

## Directory Layout

```
qadi/
├── .changeset/              # Changesets for versioning (pnpm changesets)
├── .claude/                 # Claude Code settings and skills
├── .github/                 # GitHub workflows (CI)
├── .planning/               # Planning documents and codebase analysis
│   └── codebase/            # Generated architecture/structure docs
├── .scratch/                # Scratch work and exploratory code
├── apps/                    # Applications (not libraries)
│   └── website/             # Astro docs site + marketing landing
├── coverage/                # Generated test coverage reports
├── examples/                # Runnable examples
│   └── nextjs-newsroom/     # Next.js integration example
├── features/                # BDD acceptance tests (Cucumber-like)
│   ├── features/            # .feature files (tagged with @REQ-QD-NNN)
│   ├── step-definitions/    # Feature step implementations
│   └── lib/                 # Test utilities
├── packages/                # Core library packages (published)
│   ├── core/                # Main evaluation engine
│   ├── promise/             # Promise-returning facade
│   ├── react/               # React bindings with atoms
│   ├── testing/             # Mock services and test fixtures
│   ├── audit/               # Audit trail and signature capture
│   ├── http/                # HTTP middleware and routing
│   ├── devtools/            # Development tools (instrumentation)
│   ├── predicate-sql/       # SQL query builder
│   └── predicate-prisma/    # Prisma query builder
├── reports/                 # Generated mutation testing reports
├── scripts/                 # Build and check scripts
├── spec/                    # Normative specification
│   ├── behaviors/           # .md files with @REQ-QD-NNN BDD scenarios
│   ├── decisions/           # Architecture Decision Records (ADRs)
│   ├── invariants/          # Numbered invariants (INV-QD-NNN)
│   ├── models/              # Domain model documentation
│   ├── process/             # Definitions of done, workflow
│   ├── appendices/          # Reference material
│   └── devtools-spec/       # Devtools feature specifications
├── package.json             # Root workspace definition
├── pnpm-workspace.yaml      # pnpm monorepo config
├── tsconfig.json            # TypeScript config (includes tests)
├── tsconfig.build.json      # TypeScript config (published packages only)
├── tsconfig.test.json       # TypeScript config (test files)
├── vitest.config.ts         # Test runner config
├── AGENTS.md                # Engineering conventions (non-negotiable)
├── CONTRIBUTING.md          # Contributor guide (index into AGENTS.md)
└── README.md                # Project overview
```

## Directory Purposes

**`.planning/codebase/`:**
- Purpose: Codebase analysis documents consumed by other GSD tools
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- Key files: Documents written by `/gsd-map-codebase`, read by `/gsd-plan-phase`, `/gsd-execute-phase`

**`packages/core/`:**
- Purpose: Core authorization evaluation library
- Contains: Policy ADT, evaluator, decision traces, services
- Key files:
  - `src/Qadi.ts` — Enforcement entry points (decide, check, assert, enforce, etc.)
  - `src/Evaluate.ts` — Policy tree walker and decision builder
  - `src/Matcher.ts` — Matcher evaluator for predicates
  - `src/Policy.ts` — Policy ADT with schema codec
  - `src/Decision.ts` — Allow/Deny decision types
  - `src/AttributeResolver.ts` — Service for subject attributes
  - `src/RelationshipResolver.ts` — Service for ReBAC queries
  - `src/DecisionHistory.ts` — Service for event/action history
  - `src/CurrentSubject.ts` — Request-scoped subject context
  - `src/CustomPredicate.ts` — Service for custom logic
  - `src/SignatureHistory.ts` — Service for signature validation

**`packages/promise/`:**
- Purpose: Promise-returning facade for non-Effect consumers
- Contains: `makeQadi()` function wrapping Effect runtime
- Key files: `src/index.ts` — facade implementation (no decision logic, forwards only)

**`packages/react/`:**
- Purpose: React binding with atoms-based reactivity
- Contains: Hooks, components, hydration support, instance registry
- Key files:
  - `src/QadiProvider.tsx` — Provider component, instrument flag
  - `src/useGate.ts` — Hook for per-permission decisions
  - `src/hooks.ts` — `useDecision()`, `useCheck()` for policies
  - `src/QadiAtoms.ts` — Atom family and caching logic
  - `src/components.tsx` — `<Authorized>` and `<Denied>` components
  - `src/Hydration.ts` — Dehydration/rehydration for SSR
  - `src/GateRegistry.ts` — Instance registry (opt-in instrumentation)

**`packages/testing/`:**
- Purpose: Mock services and test fixtures
- Contains: Recording/failing implementations of all services
- Key files:
  - `src/RecordingAttributeResolver.ts` — Records attribute calls
  - `src/FailingAttributeResolver.ts` — Fails every call
  - `src/EdgeRelationshipResolver.ts` — Graph-based relationships
  - `src/EventDecisionHistory.ts` — In-memory event store
  - `src/QadiTestLayer.ts` — Combined test layer
  - `src/QadiReviewLayer.ts` — Layer for code review with validation
  - `src/Fixtures.ts` — Common test data

**`packages/audit/`:**
- Purpose: Audit trail and signature capture
- Contains: Decision sink implementations, signature port, circuit breaker
- Key files:
  - `src/AuditDecisionSinkLive.ts` — Live decision sink implementation
  - `src/CircuitBreaker.ts` — Failure handling for sink
  - `src/SignatureCapturePort.ts` — Signature capture service
  - `src/ChainIntegrity.ts` — Chain signing validation
  - `src/Retention.ts` — Audit retention policies

**`packages/http/`:**
- Purpose: HTTP middleware and routing
- Contains: Express.js integration points
- Key files:
  - `src/RequirePermission.ts` — Middleware for permission checks
  - `src/GuardRoute.ts` — Route-level guard wrapper
  - `src/SubjectExtractor.ts` — HTTP request → AuthSubject extraction
  - `src/PermissionRegistry.ts` — Permission-based routing

**`packages/predicate-sql/` and `predicate-prisma/`:**
- Purpose: Translate policies to database queries
- Contains: Single files with query builders
- Key files: `src/index.ts` in each

**`packages/devtools/`:**
- Purpose: Development tooling and instrumentation
- Contains: Instrumentation, tracing, visualization helpers
- Key files: Minimal surface; used for debugging

**`spec/`:**
- Purpose: Normative specification (code follows spec, not reverse)
- Contains: ADRs, invariants, behaviors, models, process docs
- Key patterns:
  - `behaviors/*.md` — BDD scenarios with @REQ-QD-NNN tags and `typescript` code fences
  - `decisions/*.md` — Architecture Decision Records explaining choices
  - `invariants.md` — Numbered properties that must hold (INV-QD-NNN)
  - `process/definitions-of-done.md` — Gate table matched to `pnpm check` steps

**`features/` (BDD acceptance tests):**
- Purpose: Executable specification via Gherkin
- Contains: .feature files with scenarios, step definitions
- Key patterns:
  - Each .feature tagged with @REQ-QD-NNN
  - Step definitions implement policy expressions as executable code

## Key File Locations

**Entry Points:**
- `packages/core/src/Qadi.ts` — Core enforcement API (decide, check, assert, enforce, etc.)
- `packages/core/src/index.ts` — Barrel export of all core types and functions
- `packages/promise/src/index.ts` — Promise facade entry point

**Configuration:**
- `package.json` — Workspace root; pnpm catalogs and workspace config
- `pnpm-workspace.yaml` — Workspace definition
- `tsconfig.json` — Main TypeScript config (dev + test)
- `tsconfig.build.json` — Build config (published packages only)
- `vitest.config.ts` — Test runner configuration
- `AGENTS.md` — Engineering conventions (non-negotiable rules)

**Core Logic:**
- `packages/core/src/Evaluate.ts` — Policy tree evaluation (47 KB, largest file)
- `packages/core/src/Policy.ts` — Policy ADT definition (29 KB)
- `packages/core/src/Qadi.ts` — Enforcement interfaces (14 KB)
- `packages/core/src/Matcher.ts` — Predicate matching (14 KB)

**Testing:**
- `packages/core/test/` — Unit tests (mirroring src/ structure)
- `features/` — BDD acceptance tests
- `scripts/check-doc-examples.mjs` — Validates spec code fences

## Naming Conventions

**Files:**
- `CamelCase.ts` (not kebab-case): Domain concepts (Policy.ts, Decision.ts, Matcher.ts)
- Services append `Shape` for the payload interface: `AttributeResolverShape`
- Test layers append `Live`, `Test`, `Default`: `AttributeResolverNone`, `QadiTestLayer`
- Generators prefix `make`: `makeRoleName()`, `makeQadi()`

**Directories:**
- `src/` — Source code
- `test/` — Unit tests (co-located, mirrors src structure)
- `lib/` — Compiled output (gitignored)
- `packages/` — Published libraries
- `apps/` — Applications (not published)
- `examples/` — Runnable examples
- `spec/` — Specification (normative)

**Exports:**
- Barrel files: `src/index.ts` exports everything alphabetically
- Internal helpers omitted from barrels (not re-exported; no public surface)
- Exported from a barrel means it's public API

**Naming Patterns:**
- `is…` — Type guard function (e.g., `isAllowed()`)
- `…Shape` — Service payload interface (e.g., `AttributeResolverShape`)
- `…Layer` or `…Live` — Effect.Layer (e.g., `AttributeResolverNone`)
- `…Test` — Test implementation (e.g., `RecordingAttributeResolver`)
- `…Unsafe` — Runtime-unsafe operation (e.g., `makeUnsafe()`)

## Where to Add New Code

**New Authorization Policy Feature:**
- Policy type definition: `packages/core/src/Policy.ts` (add to union, add schema variant)
- Evaluation logic: `packages/core/src/Evaluate.ts` (add `case` in switch or Match arm)
- Tests: `packages/core/test/` (mirror structure)
- Spec: `spec/behaviors/` (add .md with @REQ-QD-NNN and `typescript` code fence)

**New Service (Attribute Resolver, Relationship Resolver, etc.):**
- Interface: `packages/core/src/NewService.ts` (export `NewServiceShape`, extend `Context.Service`)
- Layer implementation: Same file or adjacent file (e.g., `packages/audit/src/AuditNewService.ts`)
- Tests: `packages/*/test/` corresponding to where the service is used
- Follow patterns in `AttributeResolver.ts` for shape, wrappers (retrying, bounding), defaults

**New Package:**
- Directory: `packages/new-package/src/`, `packages/new-package/test/`
- Entry point: `src/index.ts` (barrel export)
- Add to `pnpm-workspace.yaml` under `packages:`
- Add to `tsconfig.build.json` under `references:` (if published)
- Follow naming: `@qadi/new-package` in package.json

**New HTTP Integration:**
- Middleware/adapter: `packages/http/src/NewMiddleware.ts`
- Pair test: `packages/http/test/NewMiddleware.test.ts`
- Test fixtures: `packages/testing/src/` (extend as needed)

**New React Component:**
- Component: `packages/react/src/NewComponent.tsx`
- Hook: `packages/react/src/useNewFeature.ts`
- Tests: `packages/react/test/`
- Follows AGENTS.md §13: No React state for decisions (use atoms), no additional dependencies beyond `useSyncExternalStore`

**Test Utilities:**
- Shared test data: `packages/testing/src/Fixtures.ts` (or new fixture file)
- Recording/mock services: `packages/testing/src/Recording*.ts` or `Failing*.ts`
- Prefer recording over stubbing (captures actual calls for assertion)

## Special Directories

**`spec/behaviors/`:**
- Purpose: Normative scenario documentation
- Generated: No (hand-written)
- Committed: Yes
- Pattern: Each .md file contains BDD scenarios tagged with `@REQ-QD-NNN`, with `typescript` code fences
- Consumed by: `pnpm spec:examples` (validates code compiles), `pnpm test:bdd` (Cucumber)

**`spec/decisions/`:**
- Purpose: Architecture Decision Records explaining design choices
- Generated: No
- Committed: Yes
- Pattern: One .md per ADR (ADR-QD-NNN); references invariants and behavioral specs
- Consumed by: Developers reviewing or understanding tradeoffs

**`coverage/`:**
- Purpose: Test coverage reports
- Generated: Yes (`pnpm coverage`)
- Committed: No (gitignored)
- Pattern: Per-package coverage; threshold enforced in CI (95% core, 90% others)

**`reports/mutation-*/`:**
- Purpose: Mutation testing reports
- Generated: Yes (`pnpm mutation`)
- Committed: No (gitignored)
- Pattern: Per-package mutation scores; `pnpm check` runs all

**`.planning/codebase/`:**
- Purpose: Codebase analysis by `/gsd-map-codebase`
- Generated: Yes
- Committed: Yes (used as input to planning phases)
- Pattern: Markdown docs following templates; refreshed on significant refactors

## Module Entry Points (Barrels)

**`packages/core/src/index.ts`:**
Exports ~40 modules: Policy, Decision, AuthSubject, Permission, Role, Matcher, Qadi (enforcement), AttributeResolver, RelationshipResolver, DecisionHistory, CustomPredicate, SignatureHistory, DecisionCache, DecisionSink variants, Errors, Evaluation types, etc.

**`packages/promise/src/index.ts`:**
Exports: `makeQadi()` factory, `Qadi` interface, `QadiLayer` type.

**`packages/react/src/index.ts`:**
Exports: `QadiProvider`, `useGate()`, `useDecision()`, `useCheck()`, `<Authorized>`, `<Denied>`, `currentDecision` atom.

**`packages/testing/src/index.ts`:**
Exports: Mock services (`RecordingAttributeResolver`, `FailingAttributeResolver`, `EdgeRelationshipResolver`, `EventDecisionHistory`, `RecordingCustomPredicate`), test fixtures, `QadiTestLayer`.

## Dependency Graph

```
@qadi/core (main library)
  ├─ effect (4.0.0-rc.110)
  └─ (no external deps)

@qadi/promise (thin wrapper)
  └─ @qadi/core

@qadi/react (React binding)
  ├─ @qadi/core
  ├─ effect/unstable/reactivity
  └─ react

@qadi/testing (test utilities)
  └─ @qadi/core

@qadi/audit (audit trail)
  └─ @qadi/core

@qadi/http (HTTP middleware)
  ├─ @qadi/core
  └─ (no heavy HTTP lib; framework-agnostic interfaces)

@qadi/predicate-sql (query builder)
  └─ @qadi/core

@qadi/predicate-prisma (Prisma integration)
  ├─ @qadi/core
  └─ @prisma/client (peer dependency)

@qadi/devtools (dev tools)
  └─ @qadi/core

@qadi/website (Astro docs + marketing)
  └─ astro, astro-integrations
```

---

*Structure analysis: 2026-08-30*
