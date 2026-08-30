# External Integrations

**Analysis Date:** 2026-08-30

## APIs & External Services

**Not Detected**

Qadi is a pure authorization library with zero external service dependencies. All computation is local and synchronous within Effect-managed async contexts. No HTTP calls, no third-party API consumption.

**Attribute Resolvers:**
- Extensible design via `AttributeResolver` service interface (`packages/core/src/AttributeResolver.ts`)
- Consumers provide their own resolver implementations
- Library supplies deterministic test resolvers in `packages/testing`

## Data Storage

**Databases:**
- Not applicable — library has no data layer
- **Optional for consumers:** `@qadi/predicate-sql` compiles policy predicates to SQL WHERE clauses (PostgreSQL, MySQL, SQLite) for row-level security
- **Optional for consumers:** `@qadi/predicate-prisma` compiles to Prisma WhereInput for Prisma-based applications

**File Storage:**
- None — policies are JSON-serializable (`Schema.Codec<Policy>`)
- Consumers persist policies as needed (database, JSON file, S3, etc.)

**Caching:**
- None built-in
- Effect's memoization patterns available to consumers via `Effect.memoize`

## Authentication & Identity

**Auth Provider:**
- Not detected — library is auth-agnostic
- Designed to compose after consumer's auth system
- Accepts `AuthSubject` (permissions + roles) from caller

**Current Subject:**
- Injected via `CurrentSubject` service (`packages/core/src/CurrentSubject.ts`)
- Consumers provide implementation (from session, JWT, etc.)

## Authorization Decision Flow

**Subject Extraction:**
- `@qadi/http` provides middleware helpers for Effect HTTP API/HttpRouter
- Consumer responsible for extracting subject from request headers/context

**Decision Evaluation:**
- `evaluate(policy)` returns `Effect.Effect<Decision, EvaluationError>`
- Consumer's Effect runtime executes the effect
- Decisions are cacheable via `currentDecision` atom in `@qadi/react`

**Enforcement:**
- `@qadi/http` provides middleware for automatic enforcement on routes
- Consumers call `assert(decision)` to fail if denied

## Monitoring & Observability

**Error Tracking:**
- Not integrated — errors are returned as `EvaluationError` union
- `packages/devtools` records decision timeline for inspection
- Consumers implement error logging as needed

**Logs:**
- No logging built-in
- Devtools timeline is the decision audit trail
- `@qadi/audit` optional package provides GxP-compliant audit staging

**Spans & Metrics:**
- Effect spans: Core evaluator is wrapped with `Effect.fn("qadi.evaluate")`
- Named effects follow Effect tracing protocol
- Consumers integrate with observability stack (OpenTelemetry, etc.)

## CI/CD & Deployment

**Hosting:**
- Not applicable — library published to npm registry
- Consumers deploy their applications

**Publishing:**
- Package manager: pnpm (required, npm breaks workspace-time protocols)
- Process: `pnpm publish` via `@changesets/cli`
- Workspace dependencies use `workspace:*` protocol (resolved at pack time by pnpm)

**CI Pipeline:**
- GitHub Actions: `check.yml` workflow
- Runs `pnpm check` on push to main, PRs, and manual dispatch
- No external CI service integrations (GitHub Actions native)

## Environment Configuration

**Required env vars:**
- None — library is deterministic and self-contained

**Development:**
- Effect `TestClock` used instead of `Date.now()` or `performance.now()`
- Deterministic evaluation IDs via `EvaluationId` service
- Test layers in `@qadi/testing` override clock and UUID generators

**Production Considerations:**
- Consumers provide runtime clock and UUID implementation
- Default Effect environment includes real clock/UUID if needed

## SDK & Client Libraries

**Effect Framework:**
- Single version pinned in `pnpm-workspace.yaml` (4.0.0-rc.110)
- Beta version — canary test `packages/core/test/v4-api-smoke.test.ts` pins APIs
- Direct dependency only — no version negotiation

**TypeScript & Type Checking:**
- Peer dependency: React (optional, only in `@qadi/react` and `@qadi/devtools`)
- No Prisma dependency in core — only in `@qadi/predicate-prisma` devDeps for compilation

## Webhooks & Callbacks

**Incoming:**
- Not applicable

**Outgoing:**
- Not applicable

## Specification & Documentation

**Traceability:**
- BDD scenarios in `spec/behaviors/` linked to requirements
- Documentation code examples compiled and type-checked
- Specification is the source of truth (code follows spec, not vice versa)

**API Surface:**
- Documented in `spec/overview.md`
- Checked against reality by `scripts/check-api-surface.mjs` (merge gate 13)
- Exports map in each `package.json` is the contract

---

*Integration audit: 2026-08-30*
