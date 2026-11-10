---
id: ARCH-03
title: Dialect-free leaf rules move beside evaluatePredicate; predicate-sql and predicate-prisma become renderers checked against real engines
strength: Strong        # review: "Strong (duplication), Worth exploring (remedy)"
status: implemented-pending-ci
evidence_verified_at: 1caf04c
depends_on: []           # no ARCH id; see §4 for the uncommitted ADR-QD-076 work on branch ci/stryker-ignore-static
blocks: []
adrs_touched:
  - ADR-QD-054 (amend: core owns renderability and the one PredicateNotRenderable; a nullability declaration is accepted)
  - ADR-QD-024 (read: core owns no dialect, refuse rather than approximate)
  - ADR-QD-008 (read: the _tag is the identity; ERROR_CODES is exhaustive over QadiError)
  - ADR-QD-002 (read: Predicate is hand-written, no Schema)
  - ADR-QD-017 (read: a changed decision is recorded, not drifted into)
  - ADR-QD-025 / ADR-QD-076 (read: mutation gate, ignoreStatic)
  - ADR-QD-033 (read: the packed artifact is the product, gate 14)
  - ADR-QD-034 / ADR-QD-073 (read: SWITCH_BUDGET, UNTRACED_BUDGET)
  - ADR-QD-037 (read: madge circular-import gate)
  - ADR-QD-038 (read: changesets)
  - ADR-QD-074 (read: Node floor 22.12, which constrains node:sqlite)
packages: ["@qadi/core", "@qadi/predicate-sql", "@qadi/predicate-prisma"]
estimate: XL
---

# ARCH-03: Dialect-free leaf rules move beside evaluatePredicate; the dialect packages become renderers checked against real engines

## 1. Verified evidence (at `1caf04c`)

Re-checked on 2026-10-04 against `git rev-parse --short HEAD` = `1caf04c` on
branch `ci/stryker-ignore-static`. The working tree carries uncommitted
ADR-QD-076 work: `ignoreStatic: true` in all six `stryker*.mjs` files and an
untracked `spec/decisions/076-mutation-runs-skip-static-mutants.md`. Line
numbers below are HEAD's. Where a line moved since the review, the claim is
tagged **CHANGED**.

Every throwaway script cited below ran from the session scratchpad
(`/private/tmp/claude-502/…/scratchpad/`), never from the repository. A
real-engine Prisma client was installed there (`prisma@7.10.0`,
`@prisma/client@7.10.0`, `@prisma/adapter-better-sqlite3@7.10.0`,
`better-sqlite3`), generated from a copy of
`packages/predicate-prisma/prisma/schema.prisma`, and fed the repository's own
`compilePrismaWhere` / `compileSql` / `evaluatePredicate` source through Node's
type stripping. Reproduction recipes appear in T1 and T2.

### 1.1 Review claims

**C1: `isSafeValue` is duplicated, a type guard in sql and a boolean in prisma. CONFIRMED.**
- `packages/predicate-sql/src/index.ts:161-167`: `export type SqlSafeValue = string | number | boolean | null;` and `const isSafeValue = (value: unknown): value is SqlSafeValue => …`.
- `packages/predicate-prisma/src/index.ts:101-105`: `const isSafeValue = (value: unknown): boolean => …`, with the same four arms, including `Number.isFinite`.
- CCR-QD-120 records the sql copy lagging on `Number.isFinite`. CONFIRMED as history: `packages/predicate-sql/src/index.ts:127-147`, `packages/predicate-prisma/src/index.ts:88-99`, `spec/behaviors/31-predicate-compilation.md:13` (Rev 1.5) and `spec/invariants.md` INV-QD-047 ("And a third time, on `NaN`"). The divergence ran in the admit-more direction, because PostgreSQL's `NaN = NaN` is TRUE. Both copies are now identical in logic. The duplication is what allowed the lag.
- The reference evaluator holds a third copy of one half of the rule. `packages/core/src/Predicate.ts:156-171` (`dispatchCompare`'s `Gte`/`Lt`) requires `typeof against === "number" && Number.isFinite(against)`. Nothing ties that to either package's `isSafeValue`.

**C2: the Compare arms run line for line in parallel. CONFIRMED for the leaves; CHANGED for And/Or/Negate.**

| Rule | predicate-sql `src/index.ts` | predicate-prisma `src/index.ts` |
| ---- | ---------------------------- | ------------------------------- |
| 1. unsafe-column refusal | 228-235 | 281-288 |
| 2. unsafe-value refusal | 242-250 | 289-296 |
| 3. `Gte`/`Lt` on a non-number → FALSE | 267-269 (`"FALSE"`) | 310-312 (`{OR: []}`) |
| 4. `null` handled per op | 271-277 | 313-319 |
| 5. `Neq` → `!= v OR IS NULL` | 280-282 | 320-324 |
| 6. `MemberOf` splits out `null` | 322-334 | 348-355 |
| empty `MemberOf` is FALSE | 297 | 339 |

- The ordering differs as well. In sql's `MemberOf` the order is column → empty → `maxInValues` → value safety (287-320). Prisma's order is column → empty → value safety (329-347). So a 1002-member list containing `{}` refuses for a *different reason* in each package (scratch `compile-set.mts`).
- And/Or are **not** the same shape. Sql nests the parts and special-cases only the empty list (351-361). Prisma constant-folds the vacuous identities `{AND: []}`/`{OR: []}` at every level (374-390), working around Prisma engine bugs #17367 and #21856 (prisma 153-200).
- Negate is **not** the same shape. Sql renders `CASE WHEN (inner) THEN FALSE ELSE TRUE END` (387-391). Prisma renders `{NOT: inner}`, after folding vacuous children (400-405). See C6.
- The reference: `dispatchCompare` is at `packages/core/src/Predicate.ts:123-173`, `compare` at 175-176, `dispatchPredicate` at 199-209 and `evaluatePredicate` at 211-214. The review's "~123-226" is **CHANGED**: the region ends at 214.

**C3: `PredicateNotRenderable` is declared twice with the same `_tag`, and ticket 95 says that is intentional. CONFIRMED; the ticket's location is now known.**
- `packages/predicate-sql/src/index.ts:56-59` and `packages/predicate-prisma/src/index.ts:52-55` both declare `Data.TaggedError("PredicateNotRenderable")<{ predicateTag: string; reason: string }>`.
- The rationale lives in doc comments: sql `index.ts:44-54` and prisma `index.ts:41-50`. The review's "around :50–68" is **CHANGED** to 44-54.
- **Where ticket 95 is recorded:** `.scratch/qadi-audit-fix/issues/95-index-ts-predicate-sql-and-predicate-pr.md`. That directory is gitignored (`.gitignore:22`). The file still reads `Status: open` and has no Answer section. The only tracked artifact is commit `6e7c5f9` (2026-09-07, "docs(predicate-sql,predicate-prisma): document intentional shared PredicateNotRenderable _tag", `Fixes: .scratch/qadi-audit-fix/issues/95-....md`), which adds doc comments only. Ticket 95 is **not normative**.
- **The decision itself is normative elsewhere,** and that is what a reversal must amend:
  - `spec/decisions/054-a-companion-package-may-compile-a-dialect.md:87-91`: "Each companion package declares its own unprefixed `PredicateNotRenderable` error … not shared via `@qadi/core`, because `@qadi/core` has no reason to know this error exists."
  - `spec/behaviors/31-predicate-compilation.md:57-59` (BEH-QD-236) says the same.
  - Reversing it therefore needs an ADR (ADR-QD-017: a changed decision is recorded). See D-03-a.

**C4: the identifier policy differs, prisma has no `maxInValues`, and so "which predicates compile" differs, contradicting the docs. CONFIRMED.**
- Prisma blocklist: `packages/predicate-prisma/src/index.ts:136-151` (13 reserved keys, case-sensitive). Sql allowlist: `packages/predicate-sql/src/index.ts:181-182` (`/^[A-Za-z_][A-Za-z0-9_]*$/`).
- Prisma has no `maxInValues`: `packages/predicate-prisma/src/index.ts:428-431`, plus BEH-QD-240 (`31-predicate-compilation.md:197-209`).
- Settled by scratch `compile-set.mts` (postgres dialect against prisma):

  | Predicate | `compileSql` | `compilePrismaWhere` |
  | --------- | ------------ | -------------------- |
  | column `first name` | refuses | compiles |
  | column `a.b` | refuses | compiles |
  | column `gte` | compiles | refuses |
  | column `NOT` | compiles | refuses |
  | `MemberOf` with 1001 values | refuses | compiles |

- The doc claims this contradicts:
  - `packages/predicate-sql/src/index.ts:145-147` ("the two dialect packages now agree on which predicates compile at all").
  - `31-predicate-compilation.md:136-137` (BEH-QD-238, same words).
  - `31-predicate-compilation.md:239-241` (BEH-QD-242: "There is no `Predicate` shape that renders to one target and not the other").
  - `spec/invariants.md` INV-QD-048 *Implication* (the same sentence).
  - Prisma's own sentence at `index.ts:88-89` ("agree on which **values** compile") is still true.
- One fact matters for D-03-b. A throwaway `prisma validate` shows that Prisma accepts field names `gte`, `NOT` and `é`, and rejects `_under`. A Prisma field can therefore be non-ASCII, and the ASCII regex would refuse it.

**C5: sql is tested against a hand-written JS interpreter, with no real engine. CONFIRMED, and the same holds for prisma.**
- `packages/predicate-sql/test/sqlInterpreter.ts:14-23` admits it "cannot by itself catch a NULL-safety regression". `packages/predicate-sql/test/Agreement.test.ts:158-235` drives it.
- `packages/predicate-prisma/test/matchesPrismaWhere.ts` holds JS `.every`/`.some`. `packages/predicate-prisma/test/matchesPrismaWhereEngine.ts:1-52` models Prisma's vacuous-identity stripping "confirmed against two live-engine bug reports". Neither reader models SQL three-valued logic: `matchesPrismaWhereEngine.ts:136-139` and `matchesPrismaWhere.ts:48-49` both treat NOT as a two-valued `!`.
- No test imports a database driver (`grep -rnE "prisma/client|PrismaClient|better-sqlite|pglite|node:sqlite" packages/predicate-*` finds only comments). `@prisma/client` and `prisma` sit in `packages/predicate-prisma/package.json` devDependencies, unused. The fixture schema `packages/predicate-prisma/prisma/schema.prisma` exists, and its generated output is gitignored (`.gitignore:33-36`).
- Real-engine checks so far were manual one-offs: commit `71cdc4a` ("NULL, found by verifying against real engines") and BEH-QD-244 (`31-predicate-compilation.md:324-332`).

**C6 (suspected): prisma's plain `{ NOT: inner }` excludes NULL rows that `evaluatePredicate` admits. CONFIRMED by a real engine, and it fails closed.**
- Real Prisma 7.10 over SQLite (`@prisma/adapter-better-sqlite3`), rows `level ∈ {null, 1, 5}`:

  | `WhereInput` | Prisma's SQL | Engine rows | `evaluatePredicate` rows |
  | ------------ | ------------ | ----------- | ------------------------ |
  | `{NOT: {level: {gte: 3}}}` | `WHERE (NOT level >= ?)` | `level=1` | `level=null`, `level=1` |
  | `{NOT: {tag: "red"}}` | `WHERE (NOT tag = ?)` | `tag=blue` | `tag=null`, `tag=blue` |
  | `{NOT: {tag: {in: ["red"]}}}` | `WHERE (NOT tag IN (?))` | `tag=blue` | `tag=null`, `tag=blue` |

- Differential run (scratch `prisma-oracle/diff2.mts`): 3000 random type-consistent predicates against a 48-row typed table. **127 result-set mismatches, every one under a `Negate`, and 0 over-admissions**: each mismatch is the engine returning a strict subset.
- That matches the theory. Kleene's logic is monotone, so replacing the reference's FALSE with UNKNOWN can only push a negated subtree from TRUE to UNKNOWN, which `WHERE` excludes. The defect is availability or correctness (missing rows), **not** a widening.
- The sql package avoided this with `CASE WHEN`, commit `40941b6`, ticket `.scratch/qadi-audit-fix/issues/05-…md`. That fix was never carried over to prisma.

### 1.2 New findings (not in the review)

**N1: prisma's NULL-correct shapes are refused by Prisma on a required (NOT NULL) column. CONFIRMED.**
- In the same 1500-predicate run (scratch `diff3.mts`), **153 queries were refused**: 81 with ``Argument `tenantId` is missing.`` and 72 with ``Argument `sealed` is missing.``
- Prisma refuses every filter that mentions `null` on a required field: `{tenantId: null}`, `{tenantId: {not: null}}` and `{tenantId: {equals: null}}` all fail (scratch `two.mjs`).
- So `Neq "t-1"` on a required column fails at query time, because it renders `{OR: [{tenantId: {not: "t-1"}}, {tenantId: null}]}` (`packages/predicate-prisma/src/index.ts:320-324`).
- A schema-blind Prisma renderer **cannot** emit a NULL-correct leaf that is valid on both nullable and required columns. Fixing C6 and N1 needs per-column nullability. See D-03-e.

**N2: `Eq`/`Neq`/`MemberOf` with a literal whose JS type differs from the column's type over-admit on real engines. CONFIRMED; broader than BEH-QD-244 documents.**
- Scratch `sql-oracle.mts`, PGlite and node:sqlite: 13/3000 mismatches per dialect, every one a string literal `"3"` compared against an `INTEGER` column. Both engines coerce and match `level = 3`, while `evaluatePredicate`'s `3 === "3"` is false. A boolean bound against an integer column in PGlite fails loudly (`invalid input syntax for type integer: "true"`).
- BEH-QD-244 (`31-predicate-compilation.md:334-349`) documents only the `Gte`/`Lt` text-column direction.
- With type-consistent literals (scratch `sql-oracle-typed.mts`) the result is **0 mismatches and 0 errors across 12 000 compiled queries**, postgres plus sqlite. `compileSql`'s NULL handling and `CASE WHEN` hold on real engines.

**N3: `compileSql`'s sqlite dialect emits boolean parameters that neither Node SQLite driver can bind. CONFIRMED.**
- `node:sqlite` throws `Provided value cannot be bound to SQLite parameter 1`.
- `better-sqlite3@12.11.1` throws `SQLite3 can only bind numbers, strings, bigints, buffers, and null`.
- `SqlSafeValue` includes `boolean` (`packages/predicate-sql/src/index.ts:161`) for all three dialects. See D-03-h.

**N4: `node:sqlite` is unavailable on the CI floor leg without a flag. CONFIRMED.**
- `npx -p node@22.12.0 node -e "require('node:sqlite')"` gives `ERR_UNKNOWN_BUILTIN_MODULE`.
- With `--experimental-sqlite` it loads on 22.12.0, and Node 26.10.0 still accepts the flag.
- CI runs both `22.12.0` and `26` (`.github/workflows/check.yml:48`). Vitest 5 exposes `test.execArgv`.

**N5: `better-sqlite3` is built locally but would not be built in CI. CONFIRMED.**
- A local binary exists (`node_modules/.pnpm/better-sqlite3@12.11.1/…/build/Release/better_sqlite3.node`, dated Aug 25).
- `pnpm-workspace.yaml:39-41` `onlyBuiltDependencies` lists only `esbuild` and `msgpackr-extract`, so a CI `pnpm install` (pnpm 10.17.1) skips its install script.

**N6: `@electric-sql/pglite@0.4.3` is already in the lockfile. CONFIRMED.**
- It arrives transitively through `prisma` → `@prisma/dev` (`pnpm why @electric-sql/pglite -r`).
- It is pure WASM with no build script, about 23 MB on disk, and runs real PostgreSQL semantics.

**N7: the website and README docs for predicate-prisma are already stale. CONFIRMED.**
- `apps/website/src/content/docs/docs/packages/predicate-prisma.md:40` still lists `Date` on the allowlist, which BEH-QD-238 Rev 1.2 removed.
- Its example (`:27`) is a ` ```ts ` fence, so gate 22 does not compile it.

**N8: gate 14 calls `compilePrismaWhere` with one argument. CONFIRMED.**
- `scripts/check-package-install.mjs:432`: `compilePrismaWhere(predicate)`. Any change to the signature must update it.

## 2. Goal and success criteria

**Goal.** Today each dialect package is a shallow module. Its interface (`compileSql`, `compilePrismaWhere`) hides little that the other does not re-derive: what a safe literal is, what `Compare` means against NULL and against non-numbers, that an empty `MemberOf` is false, which identifiers are refused, and how large an `IN` list may be. These are properties of `evaluatePredicate`'s semantics, not of SQL or Prisma.

This plan deepens `@qadi/core` with one module beside `evaluatePredicate`. That module turns a `Predicate` plus a small set of declared rules into a closed, pre-validated *renderable* tree, or refuses with the one `PredicateNotRenderable`.

The two packages become thin adapters across that seam. Each renders a closed union of node shapes into its own syntax and decides nothing about NULLs, numbers or safety. Prisma keeps the one target-specific concern it alone has: vacuous-identity folding.

Leverage: a third dialect is a renderer and nothing more. Locality: a semantic fix such as CCR-QD-120 lands once.

Every claim of agreement is then checked against **real engines** rather than JS re-implementations of the same belief: PostgreSQL via PGlite, SQLite via `node:sqlite`, and Prisma Client over SQLite. The live Prisma NOT defect (C6) and the required-column refusal (N1) are fixed first, test-first, as their own defect task.

**Success criteria**

1. `grep -rnE "isSafeValue|isSafeIdentifier|isSafeColumn|SAFE_IDENTIFIER" packages/predicate-sql/src packages/predicate-prisma/src` prints nothing.
2. `grep -rn "class PredicateNotRenderable" packages/*/src` prints exactly one line, in `packages/core/src/Errors.ts`. Both packages `export { PredicateNotRenderable } from "@qadi/core"`. In each package a test asserts `failure instanceof PredicateNotRenderable` against the class imported from `@qadi/core`.
3. `grep -rnE "=== null|!== null|typeof [a-z.]+ (===|!==) \"number\"|Number\.isFinite" packages/predicate-sql/src packages/predicate-prisma/src` prints nothing. The renderers contain no NULL or number semantics.
4. `packages/core/src/Predicate.ts`'s `Gte`/`Lt` arms and the renderable classifier call the same exported `isRangeBound`. `grep -n "isRangeBound" packages/core/src/*.ts` shows both call sites.
5. The C6 repro tests, the N1 required-column test and the engine-model 3VL property (T1) all pass: `pnpm vitest run --project predicate-prisma`.
6. Real-engine agreement properties pass on both CI legs, Node `22.12.0` and `26`:
   - `packages/predicate-sql/test/EngineAgreement.test.ts` (postgres via PGlite, sqlite via `node:sqlite`, mysql by the structural property in T3);
   - `packages/predicate-prisma/test/EngineAgreement.test.ts` (Prisma Client over SQLite).
7. The lie-safety property passes on every engine. A wrong nullability declaration yields engine rows ⊆ `evaluatePredicate` rows, or a loud engine or compile refusal, and never an over-admission.
8. `git diff` of `packages/predicate-sql/test/CompileSql.test.ts`'s `"compileSql — golden fragments, one row per dialect"` block shows **no change to any expected `text`/`params`**. SQL output is byte-identical under default options.
9. The refusal-parity tests pass. `compileSql` refuses exactly when `toRenderable(p, sqlRules)` refuses. `compilePrismaWhere` refuses exactly when `toRenderable(p, prismaRules)` refuses. The two rule sets differ only in `reservedColumns`, which the spec now states.
10. `pnpm check` is green on both matrix legs, including `pnpm circular`, `node scripts/check-house-style.mjs` (no budget changes), `node scripts/check-api-surface.mjs`, `node scripts/check-package-install.mjs`, and Stryker steps 16, 18 and 19 at or above 80%.
11. `grep -n "agree on which predicates compile\|no \`Predicate\` shape that renders to one target and not the other" spec packages/*/src` prints nothing unqualified. The spec states the exact difference instead.

## 3. Non-goals

- **Fixing N2 (type-mismatched literals over-admit).** A schema-blind compiler cannot know a column's type. This plan widens BEH-QD-244's caveat to `Eq`/`Neq`/`MemberOf`, pins it with an executable characterization test (T3), and records a follow-up. That follow-up would extend `ColumnNullability` into per-column type facts, so `Compare(Eq, "3")` on a declared-integer column refuses. It needs its own decision on how far the declared-schema surface grows.
- **A MySQL engine in the oracle.** No embeddable MySQL exists for Node. Coverage comes from T3's structural property: the mysql text equals the sqlite text modulo identifier quote characters, with identical params. Goldens cover the rest. Container-hosted databases (Docker, testcontainers) are rejected: CI runs `pnpm check` and nothing else (AGENTS.md §15), and a workflow that provisions its own databases is a second definition of done.
- **Changing `Predicate` itself** (seven tags, `value: unknown`) or `toPredicate`. ADR-QD-002 and ADR-QD-024 stand. The renderable tree is a new output type, not a new AST.
- **Folding constants in core.** Core's classifier preserves structure ("renders exactly what the AST says": sql `index.ts:363-366`, prisma `index.ts:392-399`). Vacuous-identity folding is a workaround for Prisma's engine bugs and stays in the Prisma renderer.
- **Removing sql's `CASE WHEN`.** It makes NOT two-valued without schema knowledge and is verified by 12 000 real-engine queries (N2). The sql renderer declares `negation: "TwoValued"` and keeps it.
- **A shared test-support package for the oracle.** Packages never import each other (README `:156`, ADR-QD-054). `@qadi/testing` is public. Each package keeps a small engine helper under `test/`.
- **ARCH-01 and ARCH-02 work.** They also touch `packages/core/src/Predicate.ts`: port reads at `:424`/`:443`, and the Policy walker at `:330`/`:385`. This plan touches only `dispatchCompare` (`:156-171`). See §9 for the conflict risk.

## 4. Constraints

| Source | Consequence for this plan |
| ------ | ------------------------- |
| AGENTS.md §1 | Namespace imports of `effect/*` submodules only. Cross-package imports are named from `"@qadi/core"`. Relative imports carry `.ts`. `import type` for type-only imports. |
| AGENTS.md §4, ADR-QD-008 | The single `PredicateNotRenderable` is a `Data.TaggedError`. It crosses no codec: not a `SinkRecord` element, not an `@qadi/http` body. **`SCHEMA_ERROR_BUDGET` is unchanged.** If it joins `QadiError` (D-03-a), `ERROR_CODES` (`packages/core/src/Errors.ts:347-365`, `satisfies Record<QadiError["_tag"], …>`) must gain `ACL018`, and INV-QD-010's injectivity test (`packages/core/test/Tokens.test.ts:272-273`) covers it automatically. No `Effect.orDie` anywhere. |
| AGENTS.md §5, ADR-QD-073 | `toRenderable`, `compileSql` and `compilePrismaWhere` stay or become named `Effect.fn`. The per-node classifier recursion is a **pure** function (returns `Result`) built from module-scope `Match` arms, so it needs no `Effect.fn` per node. **No new `Effect.fnUntraced`.** `UNTRACED_BUDGET` stays at 3. |
| AGENTS.md §5a, ADR-QD-034 | Dispatch on `RenderableNode`/`Predicate` tags uses a module-scope `Match.type<…>().pipe(Match.tagsExhaustive(…))` returning closures over per-call state, the pattern at `packages/predicate-sql/src/index.ts:207-213`. Literal-to-literal tables (e.g. `NullGuard` → SQL suffix) are module-scope `Record`s, as at sql `:103-108`. **No `switch`.** `SWITCH_BUDGET` stays at 4. |
| AGENTS.md §6, memory notes | No `as` (tests included; `as const` is allowed by `scripts/check-house-style.mjs:140-143`), no `!`, no `any` (`ANY_BUDGET` unchanged). No new `Record<string, unknown>` used to widen around the type checker. `PrismaWhereInput` keeps its documented public meaning (`packages/predicate-prisma/src/index.ts:22-33`), and nothing new is typed that way. New option fields are **closed unions** (`ColumnNullability`, `IdentifierRule`, `NullGuard`, `Negation`, `RenderRefusal`), not `string` or `boolean | "x"`. No `Date.now`/`new Date`. Test bodies may use `async`/`await` (`check-house-style.mjs:15-16` exempts test scope), but helpers prefer `Effect.tryPromise` and `Layer` for engine lifecycles. |
| AGENTS.md §7, ADR-QD-002 | `RenderableNode` is hand-written with no `Schema`, the same as `Predicate` (`packages/core/src/Predicate.ts:42-49`): produced and consumed in one process. |
| AGENTS.md §8 | `is…` for guards (`isSafeLiteral`, `isRangeBound`, `isRenderableIdentifier`), `…Like` for structural inputs (`PrismaModelLike`), `make…` for builders. |
| AGENTS.md §9 | `packages/core/src/index.ts` gains `export * from "./PredicateLiteral.ts";` and `export * from "./RenderablePredicate.ts";` in alphabetical position. No internal-only helper is exported from a barrel-exported module. |
| AGENTS.md §10 | `packages/core/src/**` is held at 95% coverage (`vitest.config.ts`). The new core modules need direct tests in `packages/core/test/`. Package tests do not count toward core's coverage, and they **do not run under core's Stryker config**. |
| AGENTS.md §11-§12 | Spec changes ship in the same change as code. BEH-QD-243's ` ```typescript ` example (`31-predicate-compilation.md:266-300`) must keep compiling under gate 9 (`node scripts/check-doc-examples.mjs`). |
| AGENTS.md §15 (gate 13) | `node scripts/check-api-surface.mjs` requires `spec/overview.md` rows for every new core export. A package's `export { PredicateNotRenderable } from "@qadi/core"` is parsed by `REEXPORT_FROM` (`scripts/check-api-surface.mjs:78`), so the package tables keep their row with Source updated. |
| AGENTS.md §16 (gate 14), ADR-QD-033 | `node scripts/check-package-install.mjs:421-433` exercises both packages through their published exports. The `compilePrismaWhere` signature change must update `:432`. New devDependencies never reach a tarball. No new package means no `tsconfig.build.json` change. |
| ADR-QD-054, BEH-QD-236 | "`@qadi/core` MUST gain no dependency … on anything either package depends on" (`31-predicate-compilation.md:49-50`). The new core modules import only `effect/*` and core modules. All engine dependencies are **devDependencies of the two packages**. `packages/core/package.json` does not change. Core owning *renderability* and the error contradicts ADR-QD-054 `:87-91`, which needs an amendment (D-03-a). Accepting a nullability declaration narrows "never sees a schema" (`:72-73`) and needs one too (D-03-e). |
| ADR-QD-024 | Core still emits no dialect text. Refuse rather than approximate holds for every new refusal (`NullOnNonNullableColumn`, `TooManyValues` in Prisma). |
| ADR-QD-037 (gate 5) | No cycles. `PredicateLiteral.ts` imports nothing internal. `Predicate.ts` imports `PredicateLiteral.ts`. `RenderablePredicate.ts` imports `Predicate.ts`, `PredicateLiteral.ts` and `Errors.ts`. `Errors.ts` imports neither new module. Verified by `pnpm circular`. |
| ADR-QD-074 | The Node floor is 22.12.0, so `node:sqlite` needs `--experimental-sqlite` (N4). It goes into `packages/predicate-sql/vitest.config.ts` `test.execArgv`, verified on both legs. |
| ADR-QD-025 / ADR-QD-076 (uncommitted on this branch) | All Stryker configs set `ignoreStatic: true`. Module-scope constants (the identifier regex, the reserved-key `Set`, `Match.type` tables) are **not** mutation-measured, so ordinary tests must pin them. ADR-QD-076 reports mutation legs at 40-50 minutes against a 60-minute CI budget (`check.yml:36`). Engine-backed tests must keep Stryker wall-clock growth measured and bounded (T8). This plan rebases on ADR-QD-076 once it lands and must not edit the `ignoreStatic` lines. |
| ADR-QD-038 | Changesets: `@qadi/core` minor (new exports; `QadiError` gains a member, which breaks exhaustive consumer matches). `@qadi/predicate-prisma` minor (**breaking**: required `options`, new refusals). `@qadi/predicate-sql` minor (new optional options; sqlite boolean binding changes `params`). |
| `pnpm-workspace.yaml:39-41` (pnpm 10) | A native devDependency (`better-sqlite3`) must be listed in `onlyBuiltDependencies`, or CI installs it without a binary (N5). |

## 5. Decisions needed before work starts

### D-03-a: One `PredicateNotRenderable`, owned by core (reverses ticket 95)

- **Options**
  1. *Keep two classes (status quo, ticket 95).* Core's classifier returns a neutral refusal record, and each package maps it into its own class. This keeps a mapping layer whose only purpose is to preserve a known collision. `catchTag("PredicateNotRenderable")` still sees two structurally identical classes (sql `index.ts:51-54` concedes this). ADR-QD-008's "the `_tag` is the identity" stays bent.
  2. *One class in `packages/core/src/Errors.ts`, re-exported by both packages; not in `QadiError`.* Single identity, and the packages keep their import path. But a core-raised error would then lack a stable code, unlike every other core error except the projection `AccessDeniedPublic`.
  3. *As 2, and it joins `QadiError` with `ERROR_CODES["PredicateNotRenderable"] = "ACL018"`.* It is raised by core's `toRenderable` just as `PolicyNotTranslatable` (ACL012) is raised by `toPredicate`. Widening `QadiError` is a closed-union change that breaks consumer code matching it exhaustively. That is the intended failure mode (memory: closed union over widening).
- **Shape (any option):** narrow `predicateTag: string` to `"Compare" | "MemberOf"`, the only nodes that refuse, and add `refusal: RenderRefusal = "UnsafeColumn" | "ReservedColumn" | "UnsafeValue" | "TooManyValues" | "NullOnNonNullableColumn"`. Keep `reason: string` and today's exact reason texts, which tests pin, e.g. `CompilePrismaWhere.test.ts:505`.
- **Does reversing ticket 95 need an ADR?** The ticket is not normative (§1 C3). It lives in a gitignored scratch file still marked open. But the decision it documented is ADR-QD-054 `:87-91` plus BEH-QD-236. Changing it needs **ADR-QD-NEXT amending ADR-QD-054**, the same ADR that D-03-e needs. The scratch ticket gets a closing note (T0); it is not a repository artifact.
- **Recommendation: option 3.**
- **status: decided (2026-10-04, recommended default: option 3)**

### D-03-b: Identifier policy, unified or per-dialect

- **Options**
  1. *Per-dialect, as today, with the docs corrected.* The cheapest option. The compile sets keep differing in both directions (C4), and a third dialect re-derives its own rule.
  2. *Unified ASCII rule.* Core applies `^[A-Za-z_][A-Za-z0-9_]*$` for every renderer. Prisma additionally passes its 13 reserved keys as data (`reservedColumns`). The compile sets then differ only by the declared reserved set. Cost: Prisma models with non-ASCII field names, which Prisma accepts (`é` validates, §1 C4), stop compiling, with a loud, fail-closed refusal.
  3. *Unified and layered.* Core owns `IdentifierRule = "Ascii" | "UnicodeBmp"`:
     - `"Ascii"` is today's regex and the **default for both** packages;
     - `"UnicodeBmp"` is `/^[\p{L}_][\p{L}\p{N}_]*$/u`, with every code point ≤ U+FFFF because MySQL refuses supplementary-plane identifiers;
     - both packages accept `identifiers?: IdentifierRule`, so for each rule the two compile sets agree modulo `reservedColumns`;
     - quoting a BMP letter cannot break out of `"…"` or `` `…` ``, since neither delimiter is a letter or digit.
- **Recommendation: option 3.** It is honest by default and the more powerful mode is opt-in (memory: prefer complete). The ADR records that the reserved set is a target-syntax hazard and the regex is a text-injection hazard, and that both are core vocabulary applied per renderer.
- **status: decided (2026-10-04, recommended default: option 3)**

### D-03-c: Fix the Prisma NOT defect first, as its own test-first defect task

- **Options**
  1. *Fold the fix into the refactor (T6).* One change, but a known wrong-results defect waits behind seven decisions and an XL refactor.
  2. *Fix first in `@qadi/predicate-prisma` alone (T1), test-first, with its own CCR and changeset.* The refactor later moves already-tested logic into core. About a day of work is rewritten when T6 lands.
  3. *Interim refusal.* Refuse any `Negate` over a leaf that can be UNKNOWN. That needs no nullability input, but it refuses most negated policies. That is a large functional regression, worse than the fail-closed defect it replaces.
- **Fix design (any of 1 or 2).** Polarity-aware null guards, prototyped in scratch `prisma-oracle/fixed.mts`: **0 mismatches and 0 errors over 1500 random predicates** on real Prisma.
  - Each leaf gets `nullGuard: "None" | "AdmitNull" | "ExcludeNull"`.
  - `AdmitNull` applies when the column is nullable and `evaluatePredicate(leaf, {[column]: null})` is true: `Neq v`, or `MemberOf` with a `null` member.
  - `ExcludeNull` applies when the column is nullable, that result is false, and the leaf sits under an odd number of `Negate`s.
  - `None` applies otherwise.
  - Un-negated output stays byte-identical. Required columns never mention `null`, which fixes N1.
- **Recommendation: option 2.** The defect is live and user-visible: rows silently missing for negated tenancy and soft-delete policies on nullable columns. It is independent of D-03-a/b/f/g. It needs D-03-e decided first.
- **status: decided (2026-10-04, recommended default: option 2)**

### D-03-d: Real-engine oracle choice

ADR-QD-054 only forbids `@qadi/core` taking a database dependency. Engine devDependencies on the two packages are allowed.

| Engine | Covers | Cost / risk |
| ------ | ------ | ----------- |
| `@electric-sql/pglite` (WASM PostgreSQL) | sql `postgres`; optionally Prisma (T10) | Already in the lockfile at 0.4.3 (N6). No native build. About 23 MB, plus WASM boot of roughly 0.5-1 s per worker. |
| `node:sqlite` (built in) | sql `sqlite` | Zero dependencies. Needs `--experimental-sqlite` on 22.12.0, accepted on 26.10.0 (N4). Prints an ExperimentalWarning. |
| `better-sqlite3` (native) | sql `sqlite`; required by Prisma's SQLite adapter | Must join `onlyBuiltDependencies` (N5). Node 26 prebuild availability unverified; may fall back to node-gyp on `ubuntu-latest`. |
| `sql.js` (WASM SQLite) | sql `sqlite` | New dependency, no native build. Redundant if `node:sqlite` works. |
| Prisma Client 7.10 + `@prisma/adapter-better-sqlite3` | Prisma, as the real query compiler plus SQLite | Needs `prisma generate` before typecheck and tests, plus `better-sqlite3`. Matches the existing fixture schema (`provider = "sqlite"`) and the historical manual verification (`CompilePrismaWhere.test.ts:122`). |
| Prisma + PGlite (`@electric-sql/pglite-socket` + `@prisma/adapter-pg` + `pg`) | Prisma's PostgreSQL query compiler | All WASM or JS. Needs a second schema and generated client. More moving parts. |
| Docker / testcontainers | real MySQL / PostgreSQL | Rejected: CI is `pnpm check` only (AGENTS.md §15); it provisions no databases. |

- **Recommendation:**
  - `predicate-sql`: PGlite for postgres, `node:sqlite` with `test.execArgv: ["--experimental-sqlite"]` for sqlite, and mysql by structural property (T3);
  - `predicate-prisma`: Prisma Client + `@prisma/adapter-better-sqlite3` over the existing fixture schema (T2);
  - the Prisma-over-PGlite leg as a layered follow-on (T10), not blocking.
- **status: decided (2026-10-04, recommended default: PGlite + node:sqlite for sql, Prisma Client + better-sqlite3 for prisma; Prisma-over-PGlite as T10)**

### D-03-e: Nullability input (required for C6 and N1)

- **Options**
  1. *Keep Prisma schema-blind and treat every column as nullable (status quo).* N1 stays: `Neq` on a required column is refused by Prisma at query time.
  2. *Treat every column as required.* Fail-closed, but under-admits on every nullable column. This turns today's correct `Neq` handling on nullable columns into a regression.
  3. *A required declaration: `CompilePrismaWhereOptions.nullable: ReadonlySet<string>`, plus a helper `nullableFieldsOf(model: PrismaModelLike): ReadonlySet<string>`.*
     - `PrismaModelLike` is a structural shape of a Prisma DMMF model: `{ fields: ReadonlyArray<{ name: string; isRequired: boolean; kind: string }> }`. No dependency on `@prisma/client`.
     - Core models the concept as `ColumnNullability = { _tag: "Unknown" } | { _tag: "Declared"; nullable: ReadonlySet<string> }`.
     - `compileSql` accepts an *optional* `nullable` (absent means `Unknown`; output byte-identical to today). Declaring it lets SQL drop redundant `OR col IS NULL` on NOT NULL columns.
- **Safety property (verified by T2/T3's lie-safety property).** Core never folds anything on the strength of a declaration. A wrong declaration can therefore only:
  - under-admit (column declared NOT NULL but actually nullable: no guards, and Kleene monotonicity gives a subset);
  - fail loudly (column declared nullable but actually required: Prisma refuses the `null` mention).
  - `IsNull` leaves (`Eq`/`Neq` against `null`, or an all-`null` `MemberOf`) on a column declared NOT NULL **refuse** (`NullOnNonNullableColumn`). Folding them to a constant could over-admit under a `Negate` if the declaration were wrong.
- **Recommendation: option 3.** It is a breaking change for `@qadi/predicate-prisma` (minor in 0.x, stated in the changeset). ADR-QD-NEXT records that a nullability declaration is the minimum schema fact; the package still never opens a connection or reads a schema itself.
- **status: decided (2026-10-04, recommended default: option 3)**

### D-03-f: `maxInValues` for Prisma

- **Options**
  1. *Keep it SQL-only.* BEH-QD-240 says bounding is a Prisma caller's concern. The compile sets keep differing (C4).
  2. *Core owns the bound (default 1000); both packages expose `maxInValues?`.* Prisma gains a refusal, which is breaking. An unbounded `in` is the same resource-exhaustion vector handed to the database whichever grammar carries it.
- **Recommendation: option 2.**
- **status: decided (2026-10-04, recommended default: option 2)**

### D-03-g: Where the core module lives, and whether it is public

- **Options**
  1. *Inside `packages/core/src/Predicate.ts`.* Literally "beside `evaluatePredicate`", but adds roughly 250 lines to a 637-line file that ARCH-01 and ARCH-02 also edit.
  2. *Two new barrel-exported modules.*
     - `PredicateLiteral.ts` holds `SafeLiteral`, `isSafeLiteral`, `isRangeBound`, `IdentifierRule`, `isRenderableIdentifier`. It has no internal imports, and `Predicate.ts` imports `isRangeBound` from it.
     - `RenderablePredicate.ts` holds `toRenderable`, `RenderableNode`, `RenderRules`, `ColumnNullability`, `NullGuard`, `Negation`, `RenderRefusal` and `DEFAULT_MAX_IN_VALUES`.
     - Public, so a third-party renderer (Drizzle, Kysely, Mongo) gets the same leverage.
  3. *As 2, but published only via the `./*` wildcard subpath and kept out of the barrel.* Smaller public surface, but then `spec/overview.md`'s "Not listed above" table has to explain why.
- **Recommendation: option 2.**
- **status: decided (2026-10-04, recommended default: option 2)**

### D-03-h: SQLite boolean parameters

- **Options**
  1. *Leave as is.* Booleans in sqlite `params` fail to bind in both Node drivers (N3).
  2. *The sqlite dialect binds booleans as `1`/`0`.* This is a dialect syntax-table entry, the same kind as `quote`/`placeholder` at `packages/predicate-sql/src/index.ts:67-86`. SQLite stores booleans as 1/0, so `sealed = 1` is the faithful rendering. `SqlFragment.params` for sqlite then never contains a boolean.
  3. *Document only.*
- **Recommendation: option 2.** It is a caller-visible change to `params`, called out in the changeset. Postgres and mysql are unchanged, since `mysql2` binds booleans itself.
- **status: decided (2026-10-04, recommended default: option 2)**

## 6. Tasks

The tasks are ordered. Each one is independently mergeable, and each spec edit lands in the same change as its code (AGENTS.md §11).

### T0: Record the decisions (ADR-QD-NEXT, ticket 95 closure)
- **Status:** [x] done
- **Depends on:** D-03-a, D-03-b, D-03-e, D-03-f, D-03-g, D-03-h decided (D-03-c and D-03-d need no ADR)
- **Files:**
  - `spec/decisions/NNN-renderability-is-a-core-rule.md` *(new, ADR-QD-NEXT)*;
  - `spec/decisions/054-a-companion-package-may-compile-a-dialect.md` (status line plus an amendment pointer);
  - `spec/decisions/index.yaml`;
  - `spec/README.md` (CCR register row, CCR-QD-NEXT);
  - `.scratch/qadi-audit-fix/issues/95-index-ts-predicate-sql-and-predicate-pr.md` (local, gitignored: append an Answer pointing at ADR-QD-NEXT).
- **Steps:**
  1. Write ADR-QD-NEXT in the house ADR format (Document Control table; Context, Decision, Alternatives rejected, Consequences). Status: "Accepted — amends ADR-QD-054". Decision sections:
     - (a) core owns the dialect-free leaf rules and the renderable tree;
     - (b) one `PredicateNotRenderable` in core (per D-03-a), reversing ADR-QD-054 `:87-91`, with ticket 95 and commit `6e7c5f9` cited as the superseded rationale;
     - (c) the identifier rule (D-03-b);
     - (d) the nullability declaration and its lie-safety property (D-03-e), narrowing ADR-QD-054 `:72-73`;
     - (e) `maxInValues` in both packages (D-03-f);
     - (f) sqlite boolean binding (D-03-h).
     Consequences must state that `@qadi/core` still has no database dependency and cite §1 evidence C1-C6 and N1-N3.
  2. In ADR-QD-054, set Status to "Accepted — narrows ADR-QD-024; amended by ADR-QD-NEXT" and add a Change History row. Do not rewrite the original paragraphs: add a blockquote under `:87-91` pointing forward, the same way superseded claims are kept elsewhere (AGENTS.md §15).
  3. Add the ADR to `spec/decisions/index.yaml`, and a CCR-QD-NEXT row to `spec/README.md`'s register.
- **Tests:** none. This task is documents only.
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-doc-examples.mjs`.
- **Done when:** the ADR exists with status Accepted, ADR-QD-054 points to it, and both gates pass.

### T1: Defect, test-first: Prisma `Negate` drops NULL rows (C6); NULL-mentioning filters break on required columns (N1)
- **Status:** [x] done
- **Depends on:** D-03-c, D-03-e
- **Files:**
  - `packages/predicate-prisma/test/matchesPrismaWhereEngine.ts`;
  - `packages/predicate-prisma/test/MatchesPrismaWhereEngine.test.ts`;
  - `packages/predicate-prisma/test/CompilePrismaWhere.test.ts`;
  - `packages/predicate-prisma/test/Agreement.test.ts`;
  - `packages/predicate-prisma/test/Metrics.test.ts`;
  - `packages/predicate-prisma/src/index.ts`;
  - `packages/predicate-prisma/README.md`;
  - `apps/website/src/content/docs/docs/packages/predicate-prisma.md`;
  - `scripts/check-package-install.mjs` (`:432`);
  - `spec/behaviors/31-predicate-compilation.md`;
  - `spec/invariants.md` (INV-QD-048);
  - `spec/overview.md` (`@qadi/predicate-prisma` table);
  - `spec/traceability.md`;
  - `.changeset/<name>.md` *(new)*.
- **Steps (red first):**
  1. **Make the engine model three-valued.** Change `matchesPrismaWhereEngine(where, row)` to `matchesPrismaWhereEngine(where, row, nullable: ReadonlySet<string>)`.
     - `evalLeaf` returns `boolean | "unknown"`:
       - a scalar or `{equals|gte|lt|in|not: v}` with `v !== null`, against a row value of `null`, is `"unknown"`;
       - `{col: null}` / `{col: {not: null}}` are exact;
       - several operators in one filter object (`{gte: 3, not: null}`) combine as a Kleene AND.
     - Kleene AND, OR and NOT replace `.every`, `.some` and `!`.
     - The top level maps `"unknown"` to false.
     - A `null` mention on a column **not** in `nullable` throws `Error("prisma validation: Argument \`<col>\` is missing.")`, modelling N1.
     - Keep the existing vacuous-identity `"empty"` result and add `"unknown"` to `EngineResult`. This is a closed union of three cases (`boolean | "empty" | "unknown"`); do not widen it with ad hoc checks.
  2. **Add failing tests in `CompilePrismaWhere.test.ts`, in a new `describe("compilePrismaWhere — Negate is NULL-safe on nullable columns (C6)")`:**
     - `Negate(Compare level Gte 3)` with `nullable: {level}` renders a shape that `matchesPrismaWhereEngine` evaluates to `true` on `{level: null}`;
     - golden: `{NOT: {level: {gte: 3, not: null}}}`;
     - the same for `Negate(Compare tag Eq "red")` (`{NOT: {tag: {equals: "red", not: null}}}`) and `Negate(MemberOf tag ["red"])` (`{NOT: {tag: {in: ["red"], not: null}}}`).
     The compact multi-operator form is the preferred shape. If T2's engine run shows Prisma rejects it, fall back to `{AND: [plain, {[col]: {not: null}}]}`, the shape `fixed.mts` proved.
  3. **Add failing N1 tests in `describe("compilePrismaWhere — a required column never mentions null (N1)")`:**
     - `Neq tenantId "t-1"` with `nullable: {level, tag}` gives `{tenantId: {not: "t-1"}}`;
     - `Compare tenantId Eq null` refuses with `refusal`-equivalent reason `"column 'tenantId' is declared NOT NULL; a null comparison is not renderable"`;
     - `MemberOf tenantId ["t-1", null]` gives `{tenantId: {in: ["t-1"]}}`, the null member dropped as fail-closed.
  4. **Add a failing property to `Agreement.test.ts`.**
     - Generate rows where `tenantId` and `sealed` are never `null` and `level` and `tag` may be.
     - Generate predicates over all four columns, including `Neq` on `tenantId` and `Negate` everywhere.
     - Use the `nullable = {level, tag}` declaration.
     - Assert `matchesPrismaWhereEngine(compilePrismaWhere(P, {nullable}), R, nullable) === evaluatePredicate(P, R)`.
     Run it and confirm it fails on HEAD's compiler with a `Negate` counterexample and a validation throw.
  5. **Implement it in `packages/predicate-prisma/src/index.ts`.**
     - Add `export interface CompilePrismaWhereOptions { readonly nullable: ReadonlySet<string> }`, `export interface PrismaFieldLike`, `export interface PrismaModelLike`, and `export const nullableFieldsOf`. A field counts as nullable when `kind !== "object" && !isRequired`.
     - `compilePrismaWhere(predicate, options)` becomes two-argument, still `Effect.fn("qadi.predicatePrisma.compilePrismaWhere")`.
     - Thread `polarity: "Positive" | "Negative"` and `nullable` through `renderNode` the way sql threads `syntax`/`params`. The module-scope `Match.type<Predicate>()` arms return closures (sql `index.ts:207-213` is the pattern). `Negate` flips polarity.
     - Compute `whenNull` by calling `evaluatePredicate(leaf, { [leaf.column]: null })` from `@qadi/core`. It is derived from the reference, not restated.
     - Map `(nullable, whenNull, polarity)` to a `NullGuard` through a module-scope table, never a `switch`.
     - Keep the vacuous-identity folding untouched.
  6. Update every existing `compilePrismaWhere(p)` call in `packages/predicate-prisma/test/*.ts` to pass `{ nullable }`. The fixture columns `level`, `tag`, `c` and `deletedAt` are nullable; `tenantId` and `sealed` are required. Existing goldens must not change for un-negated predicates. Note that `CompilePrismaWhere.test.ts:263-269` (`{NOT: {tenantId: "t-1"}}`) **stays identical**, because `tenantId` is declared required.
  7. Update `scripts/check-package-install.mjs:432` to `compilePrismaWhere(predicate, { nullable: new Set() })`, and the README and website examples (`.md` `ts` fences). Fix the stale `Date` allowlist sentence in the website doc (N7).
  8. **Spec:**
     - add to BEH-QD-244 a fourth REQUIREMENT ("A `Negate` over a leaf on a nullable column MUST admit a NULL-valued row exactly when `evaluatePredicate` does; a compiled `WhereInput` MUST NOT mention `null` for a column the caller declared NOT NULL");
     - update BEH-QD-236's `compilePrismaWhere` signature listing;
     - add an INV-QD-048 enforcement paragraph (the third time a JS reader shared the compiler's belief, found by a real engine; 127/3000 missing-row mismatches, 0 over-admissions);
     - add the `CompilePrismaWhereOptions`, `PrismaModelLike`, `PrismaFieldLike` and `nullableFieldsOf` rows to `spec/overview.md`;
     - add a traceability row for the new tests.
  9. Add a changeset: `@qadi/predicate-prisma` minor, **breaking**, with a migration line (`compilePrismaWhere(p)` → `compilePrismaWhere(p, { nullable: nullableFieldsOf(Prisma.dmmf.datamodel.models.find(...)) })`).
- **Tests:** steps 2-4 (written first, red), plus `MatchesPrismaWhereEngine.test.ts` cases for the new `"unknown"` and validation semantics.
- **Verify:**
  - `pnpm vitest run --project predicate-prisma`
  - `pnpm typecheck`
  - `node scripts/check-house-style.mjs`
  - `node scripts/check-api-surface.mjs`
  - `node scripts/check-package-install.mjs`
  - `node scripts/check-doc-examples.mjs`
  - `pnpm exec stryker run stryker.predicate-prisma.mjs` (≥ 80%)
  - The tests are red on a stash of step 5 and green with it.
- **Done when:** the step 2-4 tests fail against HEAD's `src/index.ts` and pass after step 5; the gates above pass; the CCR is listed in `spec/README.md`.

### T2: Real-engine oracle for `@qadi/predicate-prisma` (Prisma Client over SQLite)
- **Status:** [x] done
- **Depends on:** D-03-d, T1
- **Files:**
  - `pnpm-workspace.yaml` (`onlyBuiltDependencies` gains `better-sqlite3`);
  - `packages/predicate-prisma/package.json` (devDependencies: `@prisma/adapter-better-sqlite3: 7.10.0`, `better-sqlite3: 12.11.1`; script `"generate": "prisma generate"`);
  - root `package.json` (`prepare`: `effect-tsgo patch && pnpm --filter @qadi/predicate-prisma run generate`);
  - `packages/predicate-prisma/prisma/schema.prisma` (unchanged columns; confirm `tenantId String`, `level Int?`, `tag String?`, `sealed Boolean`);
  - `packages/predicate-prisma/vitest.config.ts` (`globalSetup`, `testTimeout`);
  - `packages/predicate-prisma/test/globalSetup.ts` *(new)*;
  - `packages/predicate-prisma/test/prismaEngine.ts` *(new)*;
  - `packages/predicate-prisma/test/EngineAgreement.test.ts` *(new)*.
- **Steps:**
  1. Add the devDependencies and `onlyBuiltDependencies` entry. Run `pnpm install`, then on a clean clone `rm -rf node_modules && pnpm install --frozen-lockfile`, and confirm `better_sqlite3.node` is built.
  2. Make `prisma generate` run before `pnpm typecheck` on a clean CI checkout via root `prepare`. Set `PRISMA_HIDE_UPDATE_MESSAGE=1` and `CHECKPOINT_DISABLE=1` in the script to avoid network chatter.
     - Verify that `prisma generate` for `prisma-client-js` in 7.10 needs no engine binary download when pnpm skipped `@prisma/engines`' postinstall. If it does, add `@prisma/engines` and `prisma` to `onlyBuiltDependencies`.
     - `globalSetup.ts` re-runs `prisma generate` only if `prisma/generated/index.js` is missing. Stryker's sandbox (`.stryker-tmp`) may not copy gitignored files, and this covers that case.
  3. **`prismaEngine.ts`:**
     - a `Layer.scoped` named `PrismaEngineTest` (AGENTS.md §3 naming; a top-level const) that constructs `new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: ":memory:" }) })`;
     - it creates the `Row` table with `$executeRawUnsafe` using Prisma's SQLite DDL (`CREATE TABLE "Row" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "tenantId" TEXT NOT NULL, "level" INTEGER, "tag" TEXT, "sealed" BOOLEAN NOT NULL)`), seeds the full row universe and releases with `$disconnect`;
     - it exposes `query(where): Effect<ReadonlyArray<number>, EngineRefused>`, where `EngineRefused` is a test-local `Data.TaggedError` carrying the Prisma message;
     - generated-client types come from `../prisma/generated/index.js`, with no `as`.
  4. **`EngineAgreement.test.ts`**, using `layer(PrismaEngineTest)` from `@effect/vitest`, holds five properties:
     - (P1) *exact agreement*: for type-consistent generated predicates (the T1 generator) under the true declaration `nullable = {level, tag}`, engine ids equal `rows.filter(r => evaluatePredicate(P, r))` ids;
     - (P2) *lie-safety, under-declared*: with `nullable = {}`, every engine result ⊆ the reference, and a test asserts at least one strict subset occurred so the property cannot pass vacuously;
     - (P3) *lie-safety, over-declared*: with `nullable = {tenantId, sealed, level, tag}`, every query either equals the reference or fails with `EngineRefused`, and never returns a row the reference denies;
     - (P4) *C1 regression on the engine*: the vacuous-identity shapes from `CompilePrismaWhere.test.ts:286-404` give the reference row sets;
     - (P5) `nullableFieldsOf(Prisma.dmmf.datamodel.models.find(m => m.name === "Row"))` equals `{level, tag}`, verifying that the DMMF shape matches `PrismaModelLike`.
     Use `FastCheck.sample` with fixed seeds (`numRuns` 300 predicates, as in the existing files) so runtime is bounded and reproducible.
  5. Measure: `time pnpm vitest run --project predicate-prisma` before and after. Record it in the T8 table.
- **Tests:** P1-P5 above.
- **Verify:**
  - `pnpm install --frozen-lockfile && pnpm typecheck && pnpm vitest run --project predicate-prisma` on Node 22.12.0 and 26 (locally via `npx -p node@22.12.0` or `fnm`/`nvm`; then CI);
  - `pnpm exec stryker run stryker.predicate-prisma.mjs`.
- **Done when:** P1-P5 pass on both Node versions in CI, P1 runs at least 300 predicates over 48 rows, and a clean-clone `pnpm check` builds the client before typecheck.

### T3: Real-engine oracle for `@qadi/predicate-sql` (PGlite, node:sqlite, mysql by structure)
- **Status:** [x] done
- **Depends on:** D-03-d, D-03-h
- **Files:**
  - `packages/predicate-sql/package.json` (devDependency `@electric-sql/pglite: 0.4.3`);
  - `packages/predicate-sql/vitest.config.ts` (`test.execArgv: ["--experimental-sqlite"]`, `testTimeout`);
  - `packages/predicate-sql/test/sqlEngines.ts` *(new)*;
  - `packages/predicate-sql/test/EngineAgreement.test.ts` *(new)*;
  - `packages/predicate-sql/src/index.ts` (sqlite boolean binding, D-03-h);
  - `packages/predicate-sql/test/CompileSql.test.ts` (sqlite golden params for booleans).
- **Steps:**
  1. **`sqlEngines.ts`:** two top-level scoped layers, `PgliteEngineTest` and `SqliteEngineTest`.
     - `PgliteEngineTest`: `new PGlite()`; `CREATE TABLE r (id int primary key, "tenantId" text not null, level int, tag text, sealed boolean not null)`; seed; close on release.
     - `SqliteEngineTest`: `new DatabaseSync(":memory:")` from `node:sqlite`, same DDL with `INTEGER` for `sealed`, close on release.
     - Each exposes `query(fragment: SqlFragment): Effect<ReadonlyArray<number>, EngineRefused>`, and reads rows back into the canonical JS row (sqlite's `sealed` 1/0 becomes boolean) so `evaluatePredicate` sees the same values the engine holds.
  2. **D-03-h:**
     - Add `bind: (value: SqlSafeValue) => SqlBindValue` to `DialectSyntax` (`packages/predicate-sql/src/index.ts:67-86`). It is the identity for postgres and mysql; for sqlite it maps `true` to `1` and `false` to `0`.
     - Push `syntax.bind(value)` at `:278` and `:330`.
     - Type `SqlFragment.params` as `ReadonlyArray<SqlSafeValue>`, unchanged, since numbers are already members.
     - Update the sqlite golden(s) that bind a boolean (e.g. `CompileSql.test.ts:91` binds `true` for `"sealed" = ?`) to `1`.
     - Test first: a new golden asserting sqlite `params` contain `1`, red before the change.
  3. **`EngineAgreement.test.ts`:**
     - (S1) *exact agreement, postgres and sqlite*: `FastCheck` trees with type-consistent leaves (the `leaf` arbitrary in `Agreement.test.ts:26-77` minus the string or boolean `level` operands); engine ids equal the reference ids. The scratch run found 0 mismatches over 12 000.
     - (S2) *mysql by structure*: for every generated P, `compileSql(P, {dialect: "mysql"})` equals `compileSql(P, {dialect: "sqlite"})` with `"` replaced by a backtick in identifier positions, and `params` equal after `bind`. Since the sqlite text is engine-verified, this carries the guarantee to mysql's grammar for every production that differs only in quoting.
     - (S3) *lie-safety*, available after T5 adds `nullable`: as P2 and P3 in T2. Over-declaration on SQL is always safe (`IS NULL` is valid on NOT NULL columns), so S3's over-declared case asserts exact agreement.
     - (S4) *characterize the accepted limitation (N2)*: `Compare level Eq "3"` and `MemberOf level ["3"]` admit `level = 3` on both engines while the reference denies. The assertion pins that **documented** divergence, so a change in engine behavior surfaces as a test failure prompting a spec update. `Compare level Eq true` errors on postgres (`EngineRefused`).
  4. Measure runtime and record it in the T8 table.
- **Tests:** S1-S4 and the D-03-h golden.
- **Verify:**
  - `pnpm vitest run --project predicate-sql` on Node 22.12.0 and 26;
  - `pnpm exec stryker run stryker.predicate-sql.mjs` (confirm `execArgv` reaches Stryker's vitest workers: a mutant in the sqlite path must be killed, not errored);
  - `pnpm typecheck` (`@types/node` 22.x must expose `node:sqlite` types under `tsconfig.test.json`'s `"types": ["node"]`).
- **Done when:** S1-S4 pass in CI on both legs, the D-03-h golden is green, and the ExperimentalWarning is the only new stderr output.

### T4: Core module: `PredicateLiteral.ts`, `RenderablePredicate.ts`, and the one `PredicateNotRenderable`
- **Status:** [x] done
- **Depends on:** T0 (D-03-a, b, e, f, g)
- **Files:**
  - `packages/core/src/PredicateLiteral.ts` *(new)*;
  - `packages/core/src/RenderablePredicate.ts` *(new)*;
  - `packages/core/src/Errors.ts`;
  - `packages/core/src/Predicate.ts` (`:156-171` only);
  - `packages/core/src/index.ts`;
  - `packages/core/test/PredicateLiteral.test.ts` *(new)*;
  - `packages/core/test/RenderablePredicate.test.ts` *(new)*;
  - `packages/core/test/Predicate.test.ts` (bound-rule cases);
  - `packages/core/test/Tokens.test.ts` (if a code-specific assertion is added).
- **Steps:**
  1. **`PredicateLiteral.ts`** (reference shape; final names follow D-03-g):
     ```ts
     /** A value every renderer can bind as a parameter: string, finite number, boolean, or null. */
     export type SafeLiteral = string | number | boolean | null;
     export const isSafeLiteral = (value: unknown): value is SafeLiteral => …; // today's isSafeValue body
     /** A `Gte`/`Lt` bound `evaluatePredicate` can compare against: a finite number. */
     export const isRangeBound = (value: unknown): value is number =>
       typeof value === "number" && Number.isFinite(value);
     export type IdentifierRule = "Ascii" | "UnicodeBmp";
     export const isRenderableIdentifier = (column: string, rule: IdentifierRule): boolean => …;
     ```
     The two regexes are module-scope constants dispatched through a `Record<IdentifierRule, RegExp>`. `"UnicodeBmp"` also rejects any code point above U+FFFF.
  2. **`Predicate.ts`:** replace `typeof against === "number" && Number.isFinite(against)` at `:159-161` and `:167-169` with `isRangeBound(against)`, and import it from `./PredicateLiteral.ts`. Behavior is unchanged; `Predicate.test.ts`'s existing non-finite cases (`:72-73` and the CCR-QD-120 cases) must pass untouched.
  3. **`Errors.ts`:** add `export type RenderRefusal = "UnsafeColumn" | "ReservedColumn" | "UnsafeValue" | "TooManyValues" | "NullOnNonNullableColumn";` and `export class PredicateNotRenderable extends Data.TaggedError("PredicateNotRenderable")<{ readonly predicateTag: "Compare" | "MemberOf"; readonly refusal: RenderRefusal; readonly reason: string }> {}`, with a doc comment that cites ADR-QD-NEXT. Per D-03-a option 3, also add it to `QadiError` and `ERROR_CODES` (`"PredicateNotRenderable": "ACL018"`).
  4. **`RenderablePredicate.ts`** (reference shape):
     ```ts
     export type ColumnNullability =
       | { readonly _tag: "Unknown" }
       | { readonly _tag: "Declared"; readonly nullable: ReadonlySet<string> };
     export type Negation = "TwoValued" | "ThreeValued";
     export type NullGuard = "None" | "AdmitNull" | "ExcludeNull";
     export interface RenderRules {
       readonly identifiers: IdentifierRule;
       readonly reservedColumns: ReadonlySet<string>;
       readonly maxInValues: number;
       readonly nullability: ColumnNullability;
       readonly negation: Negation;
     }
     export const DEFAULT_MAX_IN_VALUES = 1000;
     export type EqualityLiteral = string | number | boolean;
     export type RenderableNode =
       | { readonly _tag: "Constant"; readonly value: boolean }
       | { readonly _tag: "IsNull"; readonly column: string; readonly negated: boolean }
       | { readonly _tag: "Equals"; readonly column: string; readonly negated: boolean;
           readonly value: EqualityLiteral; readonly nullGuard: NullGuard }
       | { readonly _tag: "Range"; readonly column: string; readonly op: "Gte" | "Lt";
           readonly bound: number; readonly nullGuard: "None" | "ExcludeNull" }
       | { readonly _tag: "OneOf"; readonly column: string;
           readonly values: readonly [EqualityLiteral, ...ReadonlyArray<EqualityLiteral>];
           readonly nullGuard: NullGuard }
       | { readonly _tag: "All"; readonly parts: ReadonlyArray<RenderableNode> }
       | { readonly _tag: "Any"; readonly parts: ReadonlyArray<RenderableNode> }
       | { readonly _tag: "Not"; readonly inner: RenderableNode };
     export const toRenderable: (
       predicate: Predicate,
       rules: RenderRules,
     ) => Effect.Effect<RenderableNode, PredicateNotRenderable>;
     ```
     **Classification order.** It reproduces today's refusal reasons exactly:
     - `True`/`False` become `Constant`.
     - **`Compare`:**
       1. identifier check, giving `UnsafeColumn` (reason `column '<c>' is not a safe identifier`), then the reserved check, giving `ReservedColumn` with the **same** reason text, which `CompilePrismaWhere.test.ts:505` pins;
       2. `isSafeLiteral(value)`, else `UnsafeValue` (`value for column '<c>' is not a safe query parameter`);
       3. `Gte`/`Lt` with a value that is not `isRangeBound` becomes `Constant false` (null included);
       4. `value === null`: if `Declared` and the column is not nullable, refuse `NullOnNonNullableColumn`; otherwise `Eq` → `IsNull {negated: false}` and `Neq` → `IsNull {negated: true}`;
       5. otherwise `Equals` or `Range`.
     - **`MemberOf`:**
       1. identifier and reserved checks;
       2. empty becomes `Constant false`;
       3. a list longer than `maxInValues` refuses `TooManyValues` (`<n> values exceeds maxInValues (<m>)`);
       4. every member must pass `isSafeLiteral`, else `UnsafeValue` (`a value for column '<c>' is not a safe query parameter`);
       5. all-`null` behaves as `Compare Eq null`, refusing under a non-nullable declaration;
       6. a mixed list becomes `OneOf` of the non-null members, its `nullGuard` derived as below. A `null` member on a declared NOT NULL column is dropped, which can only under-admit.
     - **`nullGuard` for a leaf:**
       - `None` if `Declared` and the column is not nullable;
       - else `AdmitNull` if `evaluatePredicate(leaf, { [column]: null })` is true (**derived from the reference, not restated**);
       - else `ExcludeNull` if `rules.negation === "ThreeValued"` and the leaf sits under an odd number of `Not`;
       - else `None`.
       A module-scope `Record` table maps `(whenNull, polarity, negation)` to the guard; there is no `switch`.
     - **`And`/`Or`/`Negate`** become `All`/`Any`/`Not` with no folding, and `Negate` flips polarity.
     - **Implementation.** A pure recursive `classify(node, ctx): Result.Result<RenderableNode, PredicateNotRenderable>` dispatched by a module-scope `Match.type<Predicate>().pipe(Match.tagsExhaustive(...))` whose arms return `(ctx) => Result` closures. It returns the first refusal in left-to-right order, matching `Effect.forEach`'s sequential short-circuit today. `toRenderable = Effect.fn("qadi.predicate.toRenderable")(function* (predicate, rules) { … })` lifts the `Result`. Confirm that `Result` is yieldable in Effect v4, and pin that in `packages/core/test/v4-api-smoke.test.ts` if not already there; otherwise use `Effect.fromResult`.
  5. **Barrel:** add both modules to `packages/core/src/index.ts` alphabetically.
  6. **Tests (`RenderablePredicate.test.ts`)**, using `@effect/vitest` and `FastCheck` with fixed seeds:
     - **(R1) `whenNull` is the reference.** For every generated leaf, the `nullGuard` is `AdmitNull` exactly when `evaluatePredicate(leaf, {[col]: null})` holds, given an `Unknown` nullability.
     - **(R2) The renderable means what the predicate means.** A **test-only** two-valued interpreter `evaluateRenderable(node, row)`:
       - `Equals` is `row[c] !== null && row[c] === v`, inverted for `negated` with the `AdmitNull` disjunct;
       - `Range` requires `typeof row[c] === "number"`;
       - `OneOf` is `includes`;
       - `IsNull` is `row[c] === null`;
       - `All`/`Any`/`Not` are the obvious two-valued forms.
       It must equal `evaluatePredicate(P, row)` on rows whose values are `string | number | boolean | null`, including type-mismatched values. Absent (`undefined`) columns are excluded and stated as such: a table has no absent columns, and `Predicate.test.ts` keeps covering `undefined`.
     - **(R3) The guard is a no-op in two-valued logic.** It never changes `evaluateRenderable`'s answer; guards matter only for three-valued engines (T2 and T3 prove that side).
     - **(R4) Refusal points at a value that earned it,** in both directions. This moves the "non-finite operand is refused" structural properties from both packages' `Agreement.test.ts` (`predicate-sql:192-235`, `predicate-prisma:221-260`) into one property here.
     - **(R5) Identifier rules:** an ASCII table, a BMP table (`é` accepted under `"UnicodeBmp"` only; `"😀x"` refused under both; `"a\"b"`, `` "a`b" ``, `"a b"`, `"a.b"`, `""` refused under both), and reserved-set membership as a separate refusal.
     - **(R6) `maxInValues`:** exactly at the bound compiles; one over refuses with the exact reason text.
     - **(R7) Declared nullability:** an `IsNull` on a non-nullable column refuses; a `null` member is dropped; `None` guards apply on non-nullable columns.
     - **(R8)** `PredicateNotRenderable` carries `refusal`, `predicateTag` and `reason`, and `errorCode(e) === "ACL018"`.
- **Verify:**
  - `pnpm vitest run --project core packages/core/test/RenderablePredicate.test.ts packages/core/test/PredicateLiteral.test.ts packages/core/test/Predicate.test.ts`
  - `pnpm coverage` (core ≥ 95%)
  - `pnpm circular`
  - `node scripts/check-house-style.mjs` (budgets unchanged)
  - `pnpm exec stryker run` (core ≥ 80%; record the score delta)
- **Done when:** R1-R8 pass, core coverage holds at 95%, madge is clean, and `grep -rn "switch\s*(" packages/core/src/RenderablePredicate.ts packages/core/src/PredicateLiteral.ts` prints nothing.

### T5: `@qadi/predicate-sql` becomes a renderer of `RenderableNode`
- **Status:** [x] done
- **Depends on:** T4, T3 (so the oracle guards the migration)
- **Files:** `packages/predicate-sql/src/index.ts`, `packages/predicate-sql/test/CompileSql.test.ts`, `packages/predicate-sql/test/Metrics.test.ts`, `packages/predicate-sql/README.md`, `apps/website/src/content/docs/docs/packages/predicate-sql.md`.
- **Steps:**
  1. Delete `isSafeValue`, `SAFE_IDENTIFIER`/`isSafeIdentifier`, the local `PredicateNotRenderable` class and the local `DEFAULT_MAX_IN_VALUES`. Add `export { PredicateNotRenderable } from "@qadi/core";`. Keep `export type SqlSafeValue = SafeLiteral` for compatibility, with a doc comment pointing at core.
  2. Extend `CompileSqlOptions` with `nullable?: ReadonlySet<string>` (absent means `Unknown`) and `identifiers?: IdentifierRule` (default `"Ascii"`). Keep `maxInValues?`, now defaulting to core's `DEFAULT_MAX_IN_VALUES`.
  3. `compileSql` runs `yield* toRenderable(predicate, { identifiers, reservedColumns: EMPTY, maxInValues, nullability, negation: "TwoValued" })`, then renders it. `EMPTY` is a module-scope `ReadonlySet<string>`.
  4. Rewrite `dispatchNode` as `Match.type<RenderableNode>().pipe(Match.tagsExhaustive({...}))`, with closures over `(syntax, params)`:
     - `Constant` → `TRUE`/`FALSE`;
     - `IsNull` → `col IS [NOT] NULL`;
     - `Equals` → `col = ph` / `col != ph`, plus a guard suffix from a module-scope `Record<NullGuard, (col, expr) => string>`: `AdmitNull` is `(expr OR col IS NULL)` and `ExcludeNull` is `(expr AND col IS NOT NULL)`, which `TwoValued` never produces but exhaustiveness requires;
     - `Range` → `>=`/`<`;
     - `OneOf` → `IN (…)`;
     - `All`/`Any` → today's join with `TRUE`/`FALSE` for empty;
     - `Not` → `CASE WHEN`.
     Keep the sequential `Effect.forEach` note from `:343-350`. `compareOperator` becomes `Range`'s two-entry table.
  5. Keep the metrics and the `Effect.fn` name `qadi.predicateSql.compileSql` unchanged.
  6. Add one test asserting that a refusal is `instanceof` the class imported from `@qadi/core`, and that `Effect.catchTag("PredicateNotRenderable", …)` catches it.
  7. Add a refusal-parity property: for generated predicates including unsafe ones, `Effect.result(compileSql(P, opts))` fails exactly when `Effect.result(toRenderable(P, sqlRules(opts)))` fails, with an equal `refusal`.
- **Tests:** the existing goldens (byte-identical, success criterion 8), refusal tests (reason texts unchanged), T3's S1-S4, the parity property, and the new `nullable` goldens (`(“tenantId” != $1)` without `OR IS NULL` when declared NOT NULL).
- **Verify:** `pnpm vitest run --project predicate-sql`; `git diff packages/predicate-sql/test/CompileSql.test.ts`, where the golden block's expected strings must be unchanged; `pnpm exec stryker run stryker.predicate-sql.mjs`.
- **Done when:** success criteria 1, 3 and 8 hold for this package and S1 is still green.

### T6: `@qadi/predicate-prisma` becomes a renderer of `RenderableNode`
- **Status:** [x] done
- **Depends on:** T4, T1, T2
- **Files:** `packages/predicate-prisma/src/index.ts`, `packages/predicate-prisma/test/CompilePrismaWhere.test.ts`, `packages/predicate-prisma/test/Metrics.test.ts`, `packages/predicate-prisma/README.md`, `apps/website/src/content/docs/docs/packages/predicate-prisma.md`.
- **Steps:**
  1. Delete `isSafeValue`, `isSafeColumn`, the local `PredicateNotRenderable` class, the T1 in-package `whenNull`/polarity logic, and `COMPARE_FILTER`'s `Neq` exclusion. Add `export { PredicateNotRenderable } from "@qadi/core";`. Keep `RESERVED_PRISMA_KEYS` (`:136-150`) as the Prisma rule passed as `reservedColumns`; it is target syntax, not leaf semantics.
  2. Change `CompilePrismaWhereOptions` to `{ readonly nullable: ReadonlySet<string>; readonly maxInValues?: number; readonly identifiers?: IdentifierRule }`, and call `toRenderable(p, { identifiers, reservedColumns: RESERVED_PRISMA_KEYS, maxInValues, nullability: { _tag: "Declared", nullable }, negation: "ThreeValued" })`.
  3. Rewrite `renderNode` as `Match.type<RenderableNode>()`, mapping each node to the shapes in D-03-c and T1:
     - `Equals` with `negated: false` is `{c: v}` or `{c: {equals: v, not: null}}`;
     - `Equals` with `negated: true` is `{c: {not: v}}` or the `AdmitNull` `OR` shape;
     - `Range` is `{c: {gte|lt: b[, not: null]}}`;
     - `OneOf` is `{c: {in: vs}}`, or the `OR` with `{c: null}`, or `{in, not: null}`;
     - `IsNull` is `{c: null}` or `{c: {not: null}}`;
     - `Constant` is a vacuous identity;
     - `All`/`Any`/`Not` keep today's folding (`:374-405`).
     Each guard is a module-scope `Record<NullGuard, …>` table.
  4. Add the `instanceof`/`catchTag` test and the refusal-parity property, as in T5, plus a `TooManyValues` test (D-03-f).
- **Tests:** existing goldens (unchanged under the T1 declarations), T1's tests, T2's P1-P5, the parity property, and the `maxInValues` refusal.
- **Verify:** `pnpm vitest run --project predicate-prisma`; `pnpm exec stryker run stryker.predicate-prisma.mjs`.
- **Done when:** success criteria 1-3 hold for this package and P1-P5 are still green.

### T7: Replace, don't layer: retire the JS readers the engines supersede
- **Status:** [x] done
- **Depends on:** T2, T3, T5, T6
- **Files:**
  - delete `packages/predicate-sql/test/sqlInterpreter.ts` and `packages/predicate-prisma/test/matchesPrismaWhere.ts`;
  - edit `packages/predicate-sql/test/Agreement.test.ts`, `packages/predicate-prisma/test/Agreement.test.ts`, `packages/predicate-prisma/test/matchesPrismaWhereEngine.ts` and `packages/predicate-prisma/test/MatchesPrismaWhereEngine.test.ts`;
  - edit `spec/traceability.md` (`:290-296`).
- **Steps:**
  1. Remove `interpretSqlFragment` and its property (`predicate-sql/test/Agreement.test.ts:158-190`). It proved structure only (its own doc, `sqlInterpreter.ts:14-23`), and S1 and S2 now prove meaning on engines. Move the non-finite property to core (R4), then delete `Agreement.test.ts` if empty, or rename its remainder.
  2. Remove `matchesPrismaWhere.ts` and the property that uses it (`predicate-prisma/test/Agreement.test.ts:147-190`). It shares `evaluatePredicate`'s semantics, which `31-predicate-compilation.md:246-262` already calls a blind spot.
  3. Decide the fate of `matchesPrismaWhereEngine.ts`, now three-valued since T1, **by measurement**. Run `pnpm exec stryker run stryker.predicate-prisma.mjs` with and without its property and compare the killed-mutant sets in `reports/mutation-predicate-prisma/mutation.json`.
     - If the engine oracle kills every mutant it kills, delete it and its test.
     - Otherwise keep it as the documented fast model and record which mutants only it kills.
     Record the outcome in the progress log.
  4. Update `spec/traceability.md`'s test-to-requirement rows: delete rows for removed files and add rows for `EngineAgreement.test.ts` (both packages), `RenderablePredicate.test.ts` and `PredicateLiteral.test.ts`.
- **Tests:** none added; coverage is preserved by T2-T6.
- **Verify:** `pnpm coverage`; `bash spec/scripts/verify-traceability.sh --strict`; all three Stryker runs (≥ 80%).
- **Done when:** no test file imports `sqlInterpreter.ts` or `matchesPrismaWhere.ts`, the traceability check passes, and the engine-model decision is logged.

### T8: Stryker configs and mutation-gate impact
- **Status:** [x] done
- **Depends on:** T5, T6, T7; ADR-QD-076 landed on `main`
- **Files:** `stryker.predicate-sql.mjs`, `stryker.predicate-prisma.mjs`, `stryker.config.mjs` (comment only, if any), `spec/decisions/076-mutation-runs-skip-static-mutants.md` (measurement addendum, if ADR-QD-076 is merged by then) or the CCR.
- **Steps:**
  1. **Ownership of mutants moves.**
     - The leaf-rule mutants (`isSafeLiteral`, `isRangeBound`, classification order, `nullGuard` derivation, `maxInValues`) now live in `packages/core/src` and are measured by `stryker.config.mjs`, using **core's** tests only (`vitest.dir: packages/core`). T4's R1-R8 must kill them. Engine tests in the packages do not run there.
     - Update the doc comments at `stryker.predicate-sql.mjs:9-13` and `stryker.predicate-prisma.mjs:9-11`. "`index.ts` is the whole implementation" becomes "the renderer; leaf rules are mutated under `stryker.config.mjs`".
  2. **The `mutate` globs stay `packages/predicate-*/src/**/*.ts`.** Do not edit the `ignoreStatic` lines. Under ADR-QD-076 the module-scope reserved-key `Set` (prisma) and `Record` syntax tables (sql) are static and unmeasured. Their values are pinned by goldens and R5, and that is stated in the comment.
  3. **Engine runtime under Stryker.**
     - `coverageAnalysis: "perTest"` re-runs only covering tests per mutant, but each vitest worker boots PGlite or Prisma once per file.
     - Measure `pnpm exec stryker run stryker.predicate-sql.mjs` and `… predicate-prisma.mjs` wall-clock before T2/T3 and after T7.
     - If either grows by more than 50% or pushes the CI leg past about 50 minutes, raise `timeoutMS` only as much as the measured per-test time needs. If that is not enough, cap engine-property `numRuns` when `process.env.STRYKER_MUTATOR_WORKER` is set (verify the variable name against `@stryker-mutator/vitest-runner@10`), documented in the test file.
     - Never exclude the engine tests from Stryker: they are the strongest killers.
  4. Confirm that the sandbox (`.stryker-tmp`) can import the generated Prisma client (T2 `globalSetup`) and that `test.execArgv` reaches the workers (T3).
  5. Record a before/after table in the CCR: score, mutants, wall-clock, for core, sql and prisma.
- **Tests:** none added.
- **Verify:** `pnpm mutation`, run in full, locally on Node 26 and 22.12.0; then CI.
- **Done when:** all six Stryker runs pass at ≥ 80%, the measured table is recorded, and CI leg time stays under the 60-minute budget with margin recorded.

### T9: Specification and documentation
- **Status:** [x] done
- **Depends on:** T4-T7 (T1 already carried its own spec edits)
- **Files:**
  - `spec/behaviors/31-predicate-compilation.md`;
  - `spec/behaviors/16-predicates.md` (BEH-QD-121/122 cross-reference);
  - `spec/behaviors/index.yaml`;
  - `spec/invariants.md`;
  - `spec/traceability.md`;
  - `spec/overview.md`;
  - `spec/README.md`;
  - `packages/predicate-sql/README.md`, `packages/predicate-prisma/README.md`;
  - `apps/website/src/content/docs/docs/packages/predicate-sql.md`, `…/predicate-prisma.md`, `…/concepts/predicates.md`;
  - `.changeset/*.md` *(new)*.
- **Steps:** see §8 for the full list. Apply them, then run every spec gate.
- **Tests:** gate 9 compiles BEH-QD-243's example under the new signatures.
- **Verify:**
  - `node scripts/check-doc-examples.mjs`
  - `bash spec/scripts/verify-traceability.sh --strict`
  - `node scripts/check-api-surface.mjs`
  - `node scripts/check-dod-table.mjs` (unchanged table; confirm no gate number moved)
  - `node scripts/check-website-doc-examples.mjs`
  - `node scripts/check-publish-status.mjs`
- **Done when:** every gate passes and success criterion 11 holds.

### T10: Second Prisma engine leg: Prisma over PGlite (layered, non-blocking)
- **Status:** [-] skipped
- **Depends on:** D-03-d (only if accepted), T2
- **Files:**
  - `packages/predicate-prisma/prisma/postgres/schema.prisma` *(new; `provider = "postgresql"`, same model, output `./generated-pg`)*;
  - `.gitignore` (add the generated-pg path);
  - `packages/predicate-prisma/package.json` (devDependencies `@prisma/adapter-pg@7.10.0`, `pg`, `@electric-sql/pglite`, `@electric-sql/pglite-socket` at the lockfile versions);
  - `packages/predicate-prisma/test/prismaPgEngine.ts` *(new)*;
  - `packages/predicate-prisma/test/EngineAgreement.test.ts`.
- **Steps:**
  1. Start a `PGLiteSocketServer` on an ephemeral port inside a scoped `Layer`, and connect `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`. Create the table with raw DDL.
  2. Parameterize P1-P4 over both engine layers.
  3. Measure runtime as in T8.
- **Verify:** `pnpm vitest run --project predicate-prisma` on both Node legs.
- **Done when:** P1-P4 pass on both Prisma engines in CI; otherwise the task is logged as deferred, with the measured blocker.

### T11: Full gate and CI verification
- **Status:** [x] done
- **Depends on:** T1-T9 (T10 optional)
- **Files:** none (verification only); `.planning/architecture/ARCH-03-predicate-dialect-rules.md` §10.
- **Steps:**
  1. Run `pnpm check` locally on Node 26, then on 22.12.0.
  2. Push the branch and confirm both `check.yml` legs pass and leg time is recorded.
  3. Set this plan's `status: done`.
- **Verify:** `pnpm check`.
- **Done when:** both CI legs are green and every success criterion in §2 has its check recorded in §10.

## 7. Test strategy

- **Unchanged:**
  - `CompileSql.test.ts`'s golden block: expected strings byte-identical, only the import lines may change;
  - sqlite goldens, except the boolean-param rows (D-03-h, deliberate);
  - `CompilePrismaWhere.test.ts` goldens for un-negated predicates, plus `:263-269`;
  - both `Metrics.test.ts` files (metric names and outcomes unchanged);
  - every refusal test, whose exact reason texts are preserved;
  - `Predicate.test.ts`'s `evaluatePredicate` suite (`:46+`), which stays the reference.
- **Moved to the new core interface:**
  - non-finite refusal properties (`predicate-sql/test/Agreement.test.ts:192-235`, `predicate-prisma/test/Agreement.test.ts:221-260`) become one core property (R4);
  - unsafe-value, `Date`, identifier and `maxInValues` refusal semantics move into `RenderablePredicate.test.ts`/`PredicateLiteral.test.ts`;
  - each package keeps one `instanceof`/`catchTag` smoke test and one refusal-parity property.
- **Deleted as redundant:** `sqlInterpreter.ts` and its property, and `matchesPrismaWhere.ts` and its property (T7). `matchesPrismaWhereEngine.ts` is deleted or kept according to T7's measured criterion.
- **Property coverage:**
  - R1-R3: the renderable tree agrees with `evaluatePredicate` in two-valued logic, and `whenNull` is derived from it;
  - **differential, real engines:** P1-P4 (Prisma over SQLite, plus T10 over PGlite) and S1 (PGlite, `node:sqlite`);
  - S2 extends to mysql structurally;
  - **lie-safety:** P2, P3 and S3 (never over-admit under a wrong declaration);
  - **characterization:** S4 pins BEH-QD-244's widened accepted limitation.
  - Row universe: a typed 48-row table (`tenantId` × `level ∈ {null,0,3,5}` × `tag ∈ {null,red,blue}` × `sealed`), the one the scratch runs used.
  - Generators reuse the existing `leaf`/`treeOf` arbitraries with `FastCheck.sample` and fixed seeds, so failures reproduce.
- **Mutation (Stryker):**
  - leaf-rule mutants are owned by `stryker.config.mjs` (core tests);
  - renderer mutants by `stryker.predicate-sql.mjs`/`stryker.predicate-prisma.mjs` (goldens plus engine oracles);
  - static mutants are unmeasured per ADR-QD-076, so goldens and R5 pin the reserved set and syntax tables;
  - T8 records score and wall-clock before and after.
- **Not covered by engines, and stated:**
  - absent columns (`undefined`), which a table cannot hold; `Predicate.test.ts` and R2's exclusion note cover them;
  - MySQL semantics beyond S2's structural equivalence.

## 8. Spec and documentation updates

Placeholders: CCR-QD-NEXT, ADR-QD-NEXT, BEH-QD-NEXT and INV-QD-NEXT. Numbers are assigned when the work lands.

- **ADR-QD-NEXT** (T0): renderability is a core rule. It amends ADR-QD-054 (status line, plus a forward-pointer blockquote under `:87-91` and `:72-73`). Index entry in `spec/decisions/index.yaml`.
- **`spec/behaviors/31-predicate-compilation.md`** (bump the Revision, add a Change History row citing CCR-QD-NEXT):
  - **BEH-QD-236:**
    - the signatures gain `CompilePrismaWhereOptions` and `CompileSqlOptions.nullable`/`identifiers`;
    - `:57-59` changes from "Each package declares its own … `PredicateNotRenderable`" to "`@qadi/core` declares the one `PredicateNotRenderable`; both packages re-export it (ADR-QD-NEXT)";
    - the REQUIREMENT `:49-50` stays and is reworded to make clear that core's new modules carry no dependency.
  - **BEH-QD-238:** the allowlist is core's `isSafeLiteral`. `:136-137` ("agree on which predicates compile at all") is replaced by the exact statement: identical leaf rules, an identical identifier rule per `IdentifierRule`, an identical `maxInValues`, differing only by Prisma's declared `reservedColumns`.
  - **BEH-QD-240:** both packages refuse past `maxInValues`; remove "`compilePrismaWhere` carries no such option" (`:207-209`).
  - **BEH-QD-241/242:** correct `:239-241` ("no `Predicate` shape that renders to one target and not the other") to the reserved-set difference. The REQUIREMENT now names real-engine agreement (PGlite, `node:sqlite`, Prisma over SQLite) as the check, with the JS readers retired.
  - **BEH-QD-244:**
    - T1's Negate/required-column REQUIREMENT;
    - the accepted limitation widened to `Eq`/`Neq`/`MemberOf` with type-mismatched literals (N2), with the scratch evidence restated as S4;
    - the sqlite boolean binding (D-03-h).
  - **BEH-QD-258:** the identifier rule is core's `IdentifierRule` plus the renderer's reserved set.
  - **New BEH-QD-NEXT (a):** "A predicate is classified once, in core, into a renderable tree", covering `toRenderable`, the `RenderableNode` closed union and the refusal order.
  - **New BEH-QD-NEXT (b):** "A nullability declaration can only narrow or refuse", covering `ColumnNullability` and the lie-safety rule.
  - BEH-QD-243's worked example stays a compiling ` ```typescript ` block.
- **`spec/behaviors/16-predicates.md`:** a one-line cross-reference from BEH-QD-121/122 to BEH-QD-NEXT(a): core still emits no dialect, but now says what is renderable.
- **`spec/invariants.md`:**
  - **INV-QD-047/048:** rewrite *Enforcement* to name the engine properties (S1/S2, P1-P4) and keep the history paragraphs, which are change history and exempt (AGENTS.md §15). INV-QD-048 also gets the C6/N1 paragraph (T1) and a corrected *Implication* (reserved-set difference).
  - **New INV-QD-NEXT (c):** "`toRenderable` preserves `evaluatePredicate`'s meaning in two-valued logic", with Source `RenderablePredicate.ts` and Enforcement R1-R3.
  - **New INV-QD-NEXT (d):** "A wrong nullability declaration never admits a row `evaluatePredicate` denies", with Enforcement P2/P3/S3 and the Kleene-monotonicity argument.
  - Document Control row.
- **`spec/traceability.md`:**
  - `:73` source files gain `packages/core/src/RenderablePredicate.ts` and `PredicateLiteral.ts`;
  - INV rows `:127-128` updated, with new INV rows;
  - ADR row `:196` and a new ADR-QD-NEXT row;
  - test-file rows `:290-296` per T7.
- **`spec/overview.md` (gate 13):**
  - the core "Evaluation and enforcement" table (`:146-169`) gains rows for `toRenderable`, `RenderableNode`, `RenderRules`, `ColumnNullability`, `NullGuard`, `Negation`, `DEFAULT_MAX_IN_VALUES` (`RenderablePredicate.ts`) and `SafeLiteral`, `isSafeLiteral`, `isRangeBound`, `IdentifierRule`, `isRenderableIdentifier` (`PredicateLiteral.ts`);
  - the Errors paragraph (`:326-334`) gains `PredicateNotRenderable` and `RenderRefusal`;
  - the `@qadi/predicate-sql` table (`:487-504`): `PredicateNotRenderable`'s Source becomes "re-exported from `@qadi/core`"; `SqlSafeValue` is described as an alias of `SafeLiteral`; `CompileSqlOptions` gains its new fields;
  - the `@qadi/predicate-prisma` table (`:506-520`) gains `CompilePrismaWhereOptions`, `PrismaModelLike`, `PrismaFieldLike` and `nullableFieldsOf`, and "declared independently" is removed;
  - Change History row.
- **`spec/README.md`:** CCR register rows: one for T1 (defect) and one for T4-T9 (refactor), or one per merged PR.
- **AGENTS.md:** no section changes. §4's table lists only `Schema.TaggedError` exceptions, and this error stays `Data.TaggedError`.
- **READMEs and website:** update examples to the two-argument `compilePrismaWhere`; document `nullable`, `identifiers` and `maxInValues`; remove the stale `Date` claim (N7); document the sqlite boolean binding.
- **Changesets (ADR-QD-038):**
  - `@qadi/core` minor: new exports; `QadiError` gains `PredicateNotRenderable`, which breaks exhaustive consumer matches;
  - `@qadi/predicate-prisma` minor, **breaking**: required options, new `TooManyValues` and `NullOnNonNullableColumn` refusals, the identifier rule now also applies;
  - `@qadi/predicate-sql` minor: new optional options; sqlite `params` bind booleans as 1/0;
  - T1 ships its own prisma changeset first.
- **`spec/process/definitions-of-done.md`:** no new gate and no renumbering. Confirm via `node scripts/check-dod-table.mjs`.

## 9. Risks and rollback

| Risk | How it shows up | Mitigation | Rollback |
| ---- | --------------- | ---------- | -------- |
| `better-sqlite3` has no Node 26 prebuild and node-gyp fails on `ubuntu-latest` | `pnpm install` or the T2 tests fail on the 26 leg only | `onlyBuiltDependencies`; verify on both legs in T2 before T5/T6 depend on it | Swap the Prisma leg to T10 (Prisma over PGlite, all WASM) and drop `better-sqlite3` |
| `prisma generate` wants an engine download that pnpm skipped | `pnpm install`'s `prepare` fails in CI | T2 step 2 verifies; add `prisma`/`@prisma/engines` to `onlyBuiltDependencies` if needed | Revert the `prepare` hook; T2 tests then import the client dynamically through a type predicate |
| Stryker wall-clock grows past the 60-minute budget (ADR-QD-076: 40-50 min legs today) | CI `check` times out | T8 measures; fixed `numRuns`; one engine per file; capped runs under Stryker as a last resort | Remove the engine property from the Stryker run only via that documented cap, never by excluding the file |
| `node:sqlite` flag behavior changes in a future Node | the sqlite engine tests fail at import | `--experimental-sqlite` verified on 22.12.0 and 26.10.0 (N4) | Switch to `better-sqlite3` (already a devDependency after T2) for the sqlite dialect |
| PGlite memory or boot per vitest worker | slow or flaky sql tests | one shared instance per file via a scoped `Layer` | Lower worker concurrency for the predicate-sql project only |
| Behavior change: `compilePrismaWhere` callers must declare nullability | consumer compile errors | that is the intended failure (memory: closed union over widening); changeset migration line plus `nullableFieldsOf` | Revert T1's signature; C6 and N1 return |
| `QadiError` gains a member | consumer exhaustive matches stop compiling | changeset calls it out (0.x minor) | D-03-a option 2: keep the class but out of `QadiError` |
| Identifier unification refuses Prisma non-ASCII fields | refusal `UnsafeColumn` for e.g. `é` | D-03-b option 3's `identifiers: "UnicodeBmp"` opt-in | Default the Prisma renderer to `"UnicodeBmp"` |
| Merge conflicts with ARCH-01/ARCH-02 in `packages/core/src/Predicate.ts` | rebase conflicts | this plan edits only `:156-171`; land T4 step 2 as its own small commit | trivial re-apply |
| A Prisma minor release changes multi-operator filter rendering (`{gte, not: null}`) | P1 fails after a Prisma bump | pin `prisma`/`@prisma/client` exactly (they already are, `7.10.0`); P1 runs on every bump | Fall back to the `{AND: [plain, {c: {not: null}}]}` shape proven in `fixed.mts` |
| ADR-QD-076 is not yet merged when T8 runs | conflicting edits to `stryker*.mjs` | T8 depends on it landing; this plan never edits the `ignoreStatic` lines | none needed |

Rollback granularity:
- T1 is a self-contained defect fix (one PR, one changeset).
- T2 and T3 add tests and devDependencies only. Reverting them leaves `src` untouched.
- T4 is additive in core.
- T5 and T6 can each be reverted to the pre-renderer `index.ts` without touching core.
- T7 deletions are reversible from git history.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-04 | — | Plan written. Evidence re-verified at `1caf04c`. C6 confirmed on real Prisma 7.10/SQLite (127/3000 mismatches, all under `Negate`, 0 over-admissions). New findings N1-N8 recorded. Fix design prototyped against the real engine (0/1500 mismatches). | planning agent |
| 2026-10-04 | — | Decisions D-03-a..h recorded as decided (2026-10-04, recommended default) in §5; status set in-progress. | implementing agent |
| 2026-10-04 | T0 | ADR-QD-077 written (Accepted, amends ADR-QD-054); ADR-054 Rev 1.1 forward pointers; index.yaml, traceability ADR row, CCR-QD-153/154 rows in spec/README.md. Gate: verify-traceability --strict PASS 19. Ticket 95 scratch file not touched (gitignored, not in worktree). | implementing agent |
| 2026-10-04 | T1 | Prisma Negate NULL-drop (C6) and required-column null refusal (N1) fixed test-first. Red on HEAD src: 12 failing tests (C6 goldens, N1 goldens, nullableFieldsOf, and the engine-model Agreement property with a Negate counterexample/validation throw); green after. matchesPrismaWhereEngine is now Kleene three-valued with a nullable param and Prisma-validation throw; matchesPrismaWhere handles multi-operator filters. Compact {gte, not:null} shape used (not yet engine-verified; T2 confirms or falls back). Gates: predicate-prisma vitest 71 pass, typecheck, lint/house-style, api-surface, doc-examples, website-doc-examples, verify-traceability --strict, publish-status, package-install (gate 14), stryker predicate-prisma 91.49%. CCR-QD-153 + changeset prisma-negate-null-safe. | implementing agent |
| 2026-10-04 | T2 | Real-engine oracle for predicate-prisma done: Prisma Client 7.10 + @prisma/adapter-better-sqlite3 over :memory: SQLite, 48-row table, P1-P4 (+C6 and N1 repros) pass; compact {gte, not:null} shape verified on the real engine (no fallback needed). better-sqlite3 + adapter pinned as devDependencies, better-sqlite3 in onlyBuiltDependencies, root prepare runs prisma generate (works with @prisma/engines/prisma scripts still ignored), globalSetup regenerates for Stryker sandbox. Verified on fresh clones: Node 22.22 (macOS), 22.12.0, and 26.10.0 (fresh pnpm install builds/downloads the binary). DEVIATION: P5 as written is not achievable: Prisma 7.10's runtime Prisma.dmmf strips isRequired (fields carry only name/kind/type), so nullableFieldsOf cannot be fed from it. P5 now pins that fact and tests nullableFieldsOf on an isRequired-bearing DMMF shape; README/website/doc comments say to use getDMMF from @prisma/internals or write the set by hand. Lockfile: pnpm re-resolved @effect/vitest to the @types/node@25 vitest variant (two vitest instances, runner crashed); hand-reverted those two snapshot lines. Ubuntu/CI build of better-sqlite3 not verifiable locally. | implementing agent |
| 2026-10-04 | — | Real-engine oracle for predicate-sql done: PGlite (postgres) + node:sqlite (sqlite) over a 48-row table; S1 exact agreement (300 predicates x 2 engines), S2 mysql = sqlite text modulo quote chars + params equal after bind, S4 pins N2 (string literal vs INTEGER over-admits on both engines; boolean literal refused by PostgreSQL). S3 deferred to T5 as planned. D-03-h done test-first (4 red goldens, then DialectSyntax.bind: identity for postgres/mysql, 1/0 for sqlite); sqlEngines' toSqliteInput throws on a boolean like the real drivers so S1 would fail without the fix. Existing sqlInterpreter-based Agreement test now reads sqlite rows in stored 1/0 form (retired in T7). test.execArgv --experimental-sqlite verified: 22.12.0 pass (needs the flag), 22.22 pass. @electric-sql/pglite 0.4.3 devDependency (already in lockfile transitively). Lockfile vitest-variant drift re-fixed by hand (+ pnpm install --frozen-lockfile --force to relink). Changeset sql-sqlite-boolean-bind. S2/S4 etc. run time ~3s for the package. | implementing agent |
| 2026-10-04 | T3 | T3 complete (details in the preceding row); commit 343c477; package tests run in about 3 s. | implementing agent |
| 2026-10-04 | T4 | Core module done: PredicateLiteral.ts (SafeLiteral, isSafeLiteral, isRangeBound, IdentifierRule, isRenderableIdentifier), RenderablePredicate.ts (toRenderable, RenderableNode, RenderRules, ColumnNullability, NullGuard, Negation, DEFAULT_MAX_IN_VALUES, EqualityLiteral), one PredicateNotRenderable in Errors.ts as a QadiError member with ACL018 (D-03-a option 3). Predicate.ts edit confined to the Gte/Lt arms + one import, own commit. R1-R8 + literal tests: 50 tests; core coverage holds (core/src 95.73% branches); madge clean; house-style budgets unchanged (UNTRACED 3, SWITCH 4, ANY, SCHEMA_ERROR); no switch in new modules. Classifier is pure Result via Match.type, toRenderable named Effect.fn. Minor deviation: Range.nullGuard is the full NullGuard union (AdmitNull unreachable for Range) to avoid a dead narrowing branch. IMPORTANT FINDING (deviation from the plan's NULL_GUARD table): the plan's lie-safety claim does not hold for a TwoValued renderer. SQL's CASE WHEN collapses UNKNOWN to FALSE, so a leaf the reference admits on NULL (Neq, or a null MemberOf member), unguarded under an odd number of Negates on a column declared NOT NULL that actually holds NULL, over-admits. Found by the new real-engine S3 property (PGlite and node:sqlite). Fix: for TwoValued, Required+Admits keeps AdmitNull at Negative polarity; ThreeValued (Prisma) is unchanged (monotone, under-admits). ADR-QD-077 (d) amended in place accordingly. Stryker core score recorded in T8. | implementing agent |
| 2026-10-04 | T5 | predicate-sql is a renderer of RenderableNode: local isSafeValue/isSafeIdentifier/PredicateNotRenderable/DEFAULT_MAX_IN_VALUES deleted; PredicateNotRenderable re-exported from core; options nullable and identifiers added; Match.type<RenderableNode> dispatcher with module-scope guard/operator tables. Golden block byte-identical (only diff vs HEAD is the sqlite boolean param true->1 from D-03-h). Tests: nullable goldens, instanceof+catchTag, refusal-parity property (5 option sets x 300 predicates, >100 refusals, >100 compiles), S3 lie-safety (true/over/under-declared) on PGlite+node:sqlite. Stryker predicate-sql 95.45%. Success criteria 1 and 3 hold for this package. | implementing agent |
| 2026-10-04 | T6 | predicate-prisma is a renderer of RenderableNode: local isSafeValue/isSafeColumn/PredicateNotRenderable and the T1 in-package whenNull/polarity logic deleted; RESERVED_PRISMA_KEYS kept as reservedColumns; options gain maxInValues and identifiers; Match.type<RenderableNode> dispatcher with Prisma's vacuous-identity folding kept in the renderer. Tests: instanceof+catchTag, refusal-parity property (4 option sets x 300 predicates), TooManyValues, identifiers, ReservedColumn vs UnsafeColumn; all P1-P5 engine properties still green. Success criteria 1-3 grep clean for both packages; exactly one 'class PredicateNotRenderable' (core Errors.ts). | implementing agent |
| 2026-10-04 | T7 | Readers retired: sqlInterpreter.ts + sql Agreement.test.ts, naive matchesPrismaWhere.ts, and (by measurement) matchesPrismaWhereEngine.ts with its test and the prisma Agreement.test.ts. Measurement (step 3): stryker predicate-prisma with all tests (A) vs without the model-using tests Agreement.test.ts + MatchesPrismaWhereEngine.test.ts (B) vs model deleted and its assertions dropped from CompilePrismaWhere.test.ts (C): 173 mutants, 107 killed, 4 survived, 11 no-coverage, 87.70% in all three; per-mutant statuses identical (0 differences A vs B). So the engine oracle + goldens kill everything the model killed: deleted. The non-finite refusal property moved to core (R4) plus the per-package refusal-parity properties. traceability rows updated. | implementing agent |
| 2026-10-04 | T9 | Spec and docs done: BEH-QD-236/238/240/241/242/244/258 revised, BEH-QD-264/265 and INV-QD-058/059 added, 16-predicates cross-reference, INV-QD-047/048 enforcement and corrected Implication, traceability, overview (core rows, ACL018 paragraph, package tables), READMEs, website pages, CCR-QD-153/154, ADR-QD-077 amended for the TwoValued lie-safety finding. Gates: verify-traceability --strict (19 pass), check-doc-examples, check-api-surface (715 exports), dod-table, devtools-claims, website-doc-examples, publish-status all green. Success criterion 11: the 'agree on which predicates compile' / 'no Predicate shape that renders to one target' sentences remain only as quoted history in the corrections. | implementing agent |
| 2026-10-04 | T10 | SKIPPED (optional, not cheap): needs @prisma/adapter-pg, pg and @electric-sql/pglite-socket as new devDependencies, a second postgresql schema and generated client, and a PGlite socket server whose single-connection behaviour under Prisma's pool is unverified; P1-P4 already run on a real Prisma engine over SQLite and the SQL package covers real PostgreSQL via PGlite directly. | implementing agent |
| 2026-10-04 | T8 | Stryker configs and measurement. Comments in stryker.predicate-sql.mjs / stryker.predicate-prisma.mjs updated (leaf-rule mutants now measured under stryker.config.mjs; ignoreStatic lines untouched; static tables pinned by goldens/R5). Engine tests are never excluded; the prisma vitest globalSetup path made absolute so Stryker's sandbox resolves it (sandbox failed with ERR_LOAD_URL until then); test.execArgv reaches Stryker workers (sql engine tests ran in-sandbox, 95.45%). Before (ADR-QD-076, 2026-10-04, idle machine): core 2936 mutants 91.79% 308 s; sql 191 mutants 98.01% 12.4 s. predicate-prisma at the T1 commit (model-only tests): 235 mutants 91.49% 27 s. After (this branch, host load avg 35-170 from other sessions, so wall-clock is NOT comparable): core 3090 mutants 92.46% (RenderablePredicate.ts 100%, PredicateLiteral.ts no survivors) 1125 s; sql 66 mutants 95.45% 86 s; prisma 112 mutants 90.18% 49 s (101 killed, 6 survived, 5 no-coverage); devtools 98.20%; audit 86.05%; http 96.71%. All six >= 80. Wall-clock verdict: sql and prisma runs are well under a minute even with PGlite/Prisma engines booted per file, so the 50% growth bound is not threatened; the core figure under load is not usable as a leg-time estimate, re-measure on CI. | implementing agent |
| 2026-10-04 | T11 | Full gate, locally. Every step of pnpm check was run and passes on this branch: typecheck, lint (house-style budgets unchanged: UNTRACED 3, SWITCH 4, ANY, SCHEMA_ERROR), circular, test:tstyche, coverage (core/src 95.7% branches; predicate-prisma functions 87.87% failed the 90% gate once and was fixed by composing the shape tables), test:bdd (470), spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api (715 exports), spec:package (gate 14), example (26 e2e), all six Stryker runs, spec:website-examples, website, spec:publish. Host caveats: (1) the machine ran at load average 50-170 from other sessions; core's 5 s timeouts on FieldPath.test.ts (20k-deep recursion, 2.6 s idle, passes on baseline c75220e under the same load) and Simplify.test.ts (250k children) flaked inside `pnpm check`/`pnpm mutation` dry runs, so steps were re-run individually and core Stryker retried until its dry run passed; not caused by this change but real fragility; (2) the disk filled once (ENOSPC) mid-run and was cleared of my scratch clones. Node: fresh clone + pnpm install --frozen-lockfile + core/predicate-sql/predicate-prisma tests + typecheck pass on 22.12.0 (sqlite needs the execArgv flag) and 26.10.0 (better-sqlite3 prebuilt/built at install); tstyche also on 22.12.0. NOT DONE: pushing the branch and observing both check.yml legs (pushing is out of scope); the Ubuntu CI build of better-sqlite3 and CI leg time are therefore unverified. Plan status left at in-progress for that reason. | implementing agent |
