# Technology Stack

**Analysis Date:** 2026-08-30

## Languages

**Primary:**
- TypeScript 7.x - All source code, configs, tests

**Runtimes:**
- JavaScript (ESNext) - Compilation target

## Runtime

**Environment:**
- Node.js >=20.19.0 (verified: v26 in CI)
- Bun runtime supported (entry points via `bun` export condition)

**Package Manager:**
- pnpm 10.17.1 - Monorepo workspace management
- Lockfile: `pnpm-lock.yaml` (checked into repo, frozen in CI)

## Frameworks & Core Dependencies

**Authorization Core:**
- Effect 4.0.0-rc.110 - Effect-native, pure async, algebraic effects runtime
  - Used in `packages/core`, `packages/testing`, `packages/promise`, `packages/http`, `packages/react`, `packages/devtools`, `packages/audit`, `packages/predicate-sql`, `packages/predicate-prisma`
  - Catalog dependency ensures single version across monorepo

**Frontend:**
- React 19.2.8 - UI bindings (`packages/react`)
- React DOM 19.2.8 - DOM rendering
- Next.js 16.3.2 - Example SSR application (`examples/nextjs-newsroom`)

**Documentation & Website:**
- Astro 7.2.9 - Static site generation (`apps/website`)
- Starlight 0.41.7 - Documentation theme/framework
- Tailwind CSS 4.3.3 - Styling

**Testing:**
- Vitest 4.1.10 - Unit/integration test runner
- @effect/vitest 4.0.0-rc.110 - Effect testing utilities (sync, scoped, layer helpers)
- Cucumber 11.2.0 - BDD acceptance test framework (`features/`)
- @testing-library/react 16.3.2 - React component testing
- Playwright 1.62.1 - E2E browser testing (`examples/nextjs-newsroom`)
- happy-dom 20.11.1 - Lightweight DOM implementation for tests

## Build & Development Tools

**TypeScript:**
- TypeScript 7.0 - Language and compilation
- tstyche 7.2.3 - Type-level testing (`.test-d.ts` files)

**Linting & Formatting:**
- oxlint 1.51.0 - Fast JavaScript/TypeScript linter
- oxfmt 0.36.0 - Code formatter (not in CI gate — hand-wrapping wins)

**Code Quality:**
- Stryker 9.6.1 (@stryker-mutator/core) - Mutation testing
- @stryker-mutator/vitest-runner 9.6.1 - Vitest integration
- Madge 8.0.0 - Circular dependency detection
- @effect/language-service 0.77.0 - TypeScript language server plugin for Effect diagnostics

**Other:**
- @changesets/cli 3.0.1 - Changeset versioning and publishing
- tsx 4.19.2 - TypeScript executor (used in Cucumber tests)

## Key Dependencies

**Core Authorization Library:**
- `@qadi/core` - Token, policy ADT, evaluator, enforcement logic
- `@qadi/testing` - Testing fixtures and deterministic layers
- `@qadi/promise` - Promise facade (wraps Effect, no conditional logic)

**Integration Packages:**
- `@qadi/react` - React hooks, provider, server hydration
- `@qadi/http` - Effect HTTP API middleware bindings
- `@qadi/devtools` - Decision timeline and React dock UI
- `@qadi/audit` - GxP audit trail, staging, e-signature
- `@qadi/predicate-sql` - SQL WHERE clause compilation (PostgreSQL, MySQL, SQLite)
- `@qadi/predicate-prisma` - Prisma WhereInput compilation (dev dependency: `@prisma/client 7.10.0`)

**Infrastructure:**
- effect/Context - Service container and dependency injection
- effect/Schema - Type-safe JSON codecs for Policy ADT
- effect/Match - Pattern matching for tagged unions
- effect/Data - TaggedError and record constructors

## Configuration Files

**TypeScript:**
- `tsconfig.base.json` - Compiler options (strict mode, no assertions, ESNext target)
- `tsconfig.json` - Project references across packages
- `tsconfig.build.json` - Public packages only (excludes tests, examples, features)
- `tsconfig.test.json` - Test file compilation

**Build & Test:**
- `vitest.config.ts` - Vitest root config with coverage thresholds (90% default, 95% for core)
- `stryker.config.mjs` - Mutation testing baseline (and variant configs for specific packages)
- `.oxfmtrc.json` - Formatter config (not gated)
- `astro.config.mjs` - Website static build configuration

**Workspace:**
- `pnpm-workspace.yaml` - Workspace packages and catalog with pinned versions

**CI/CD:**
- `.github/workflows/check.yml` - Merge gate that runs `pnpm check` only

## Compilation & Exports

**ES Modules:**
- Module system: ESNext (Preserve - no transpilation)
- Module resolution: Bundler (modern resolution algorithm)
- Exports: Dual ESM + TypeScript source exports
  - `bun` condition points to `.ts` files
  - `import` condition points to compiled `.js` in `lib/`
  - Types always from generated `.d.ts` files

**Build Output:**
- Declaration files with maps (`declaration: true`, `declarationMap: true`)
- Source maps enabled for all builds
- No emitted JS during type-checking (noEmit for IDE experience)

## Development Node Versions

**Supported Range:**
- >=20.19.0 (declared in engines)
- CI tests on v26 (latest stable major)
- v20 is the minimum (vitest and oxlint constraints)

**Version Sources:**
- `packageManager` in `package.json` specifies pnpm version
- `.node-version` or `.nvmrc` not present (version is CI-pinned)

---

*Stack analysis: 2026-08-30*
