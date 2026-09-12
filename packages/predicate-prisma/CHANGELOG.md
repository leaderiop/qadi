# @qadi/predicate-prisma

## 0.6.0

### Minor Changes

- 47e5683: `effect` bumped from `4.0.0-rc.112` to `4.0.0-rc.115` (`4.0.0-rc.113` shipped a broken `.d.ts` bundle — missing `Match`/`Schema` type exports — fixed in `rc.115`).

  **Breaking: the minimum supported Node version is now `>=22.12.0`, up from `>=20.19.0`.** This is forced by the bump: `@effect/vitest@4.0.0-rc.115` requires `vitest@^5.0.0`, and `vitest` 5 does not run on Node 20 at any patch level. There is no path that keeps both effect's newest rc and Node 20 support — see ADR-QD-074. If you run these packages on Node 20, stay on `effect@4.0.0-rc.112` and the previous published version until you can move to Node 22.12+.

  No public API changed. Internal-only: `effect/testing/FastCheck` was removed upstream, so this repo's own tests depend on `fast-check` directly now; `vitest`'s benchmark API moved to a `test`-context fixture, so `packages/core/bench/*.bench.ts` were ported to the new shape; `@stryker-mutator/vitest-runner` doesn't yet support `vitest` 5's `testNamePattern` change ([stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)), so it's patched via `pnpm patch` to backport the pending upstream fix (dev-only, not part of the published packages).

### Patch Changes

- Updated dependencies [47e5683]
  - @qadi/core@0.6.0

## 0.5.0

### Minor Changes

- Resolved all 202 findings from a full-codebase audit (2026-09-06), plus the two follow-up human-decision items it surfaced. Correctness fixes, spec-consistency corrections, and hardening spanning every package — no single public API change dominates; see the merged PRs (#28-#32) for the itemized findings.
- Resolved all 191 Low/Info findings from a second full-codebase audit (2026-09-07, issue #49), including several genuine correctness fixes surfaced along the way:
  - `Neq` now denies whenever either resolved operand is `undefined` (including the both-absent case), matching `Eq`'s existing fail-closed stance — previously matched on one side being absent (H2).
  - `projectAt` (`FieldPath.ts`) walks an explicit stack instead of the call stack, closing a stack-overflow on deeply-nested field specs.
  - The untrusted-decode depth guard is now shared between `Policy.ts` and `SinkCodec.ts` (H6), and the circuit breaker releases its probe claim on abnormal exit (H4).
  - `predicate-prisma`'s compiler constant-folds vacuous AND/OR identities so they never nest (C1); `predicate-sql`/`predicate-prisma` guard non-finite bounds so both interpreters agree.
  - `DecisionCache`'s coalesced-waiter interruption path was closed; its `maxDepth` key issue was confirmed already fixed.

  Also: spec-consistency sweeps across every behavior/invariant/traceability document, gate-blind-spot closures (dod-table, api-surface, doc-examples, mutation-upload), and house-style/BDD cleanup.

### Patch Changes

- Smaller fixes and consolidation rounding out this release:
  - `@qadi/audit`'s `encodeAuditEntry` now guards the whole record (`isRecordJsonSafe`) instead of `resource` alone — a circular or `BigInt`-valued `HasCustom.params` previously sailed past the guard and threw uncaught at the store write.
  - `@qadi/react`'s `Hydration.ts` now decodes with `UNTRUSTED_DECODE_OPTIONS`, refusing an excess property on a dehydrated entry or its embedded policy instead of silently stripping it.
  - `SinkCodec.ts`'s `toWire`/`fromWire`/`isRecordJsonSafe` dispatch is now `Match.tagsExhaustive` instead of a ternary/`if` chain — a third `SinkRecord` tag is now a compile error instead of a silent fall-through.
  - Five hand-built one-shot test gates now use `Latch`; `TestClock.testClockWith` replaces a cast-requiring fixture pattern; five duplicated `CollectingTracer` test helpers are consolidated into one shared `@qadi/testing` implementation.
  - The docs' flagship error-handling example now uses `Effect.catchTag` instead of `_tag ===` narrowing.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @qadi/core@0.5.0

## 0.4.0

### Patch Changes

- Closed a SQL-injection surface in `@qadi/predicate-sql`: column identifiers
  were quoted without validation, so an embedded quote in a policy-derived
  column name reached the generated query unescaped. Column identifiers are
  now refused outright when they fall outside a safe allowlist, before
  quoting ever runs.

  Also fixed two agreement/injection bugs shared by both predicate compilers'
  translation logic — found together because the two packages share the same
  translation shape and the same bug class had been introduced in both.

- Updated dependencies
- Updated dependencies
  - @qadi/core@0.4.0

## 0.3.0

### Minor Changes

- a61dadc: New packages: `@qadi/predicate-sql` and `@qadi/predicate-prisma` compile a
  `@qadi/core` `Predicate` into something a database can actually run.

  `toPredicate` has always emitted an abstract, dialect-free AST and stopped
  there (ADR-QD-024) — a caller with only `toPredicate` had to hand-roll their
  own SQL or Prisma compiler with nothing but `evaluatePredicate` to check it
  against. These two optional, separately versioned companion packages close
  that gap. `@qadi/core` gains no dependency of any kind through either
  existing (ADR-QD-054).

  ```ts
  import { toPredicate } from "@qadi/core";
  import { compileSql } from "@qadi/predicate-sql";

  const fragment = toPredicate(visible).pipe(
    Effect.flatMap((predicate) => compileSql(predicate, { dialect: "postgres" })),
  );
  // { text: '"tenantId" = $1', params: ["t-1"] }
  ```

  `@qadi/predicate-sql` ships all three dialects at v1 — PostgreSQL, MySQL,
  SQLite — one shared renderer around a small per-dialect syntax table.
  `@qadi/predicate-prisma` compiles to a Prisma `WhereInput`
  (`Record<string, unknown>`, deliberately: the package never sees a generated
  schema).

  Both refuse rather than approximate: a `Compare`/`MemberOf` value outside the
  safe allowlist (`string | number | boolean | null | Date`) fails
  `PredicateNotRenderable` instead of being stringified or bound blind, and
  `@qadi/predicate-sql` refuses a `MemberOf` past `maxInValues` (default 1000)
  rather than rendering an unbounded `IN (...)`. Every compiled fragment is
  checked, by property, against `@qadi/core`'s own `evaluatePredicate` —
  INV-QD-047 and INV-QD-048, the same differential method that already proves
  `toPredicate` agrees with `evaluate`, one interpreter further from the tree.

  `Eq`/`Neq`/`MemberOf` handle `null` correctly, including across an engine
  boundary — `col = NULL` never matches in real SQL, so an `Eq`/`Neq` literal
  of `null` renders `IS [NOT] NULL`; `Neq` against a non-null value, and a
  `MemberOf` whose column may be NULL, admit a NULL-valued row the same way
  `evaluatePredicate`'s `!==` does, which a bare `!=`/`IN` alone would silently
  exclude. Found by running compiled output against real PostgreSQL, MySQL,
  SQLite and a SQLite-backed Prisma client, not assumed — Prisma's own `in`
  filter refuses a `null` member outright rather than mishandling it. A
  `Gte`/`Lt` predicate against a numeric value stored as text is a documented,
  accepted limitation rather than something this release attempts to patch:
  `evaluatePredicate` requires both sides to be genuine numbers, and no
  portable SQL reproduces that check across all three dialects without a
  schema the compiler doesn't have — Postgres refuses such a query outright,
  SQLite and MySQL silently coerce it.

  See BEH-QD-236–244.

### Patch Changes

- Updated dependencies [efa3435]
- Updated dependencies [dc767f2]
- Updated dependencies [d251db4]
- Updated dependencies [a61dadc]
- Updated dependencies [f1c6aa5]
- Updated dependencies [50bf38a]
- Updated dependencies [2227e5e]
- Updated dependencies [39b7cbe]
- Updated dependencies [0649129]
- Updated dependencies [f03d75c]
- Updated dependencies [0363a5a]
- Updated dependencies [e2a44d9]
- Updated dependencies [73508bb]
- Updated dependencies [0363a5a]
  - @qadi/core@0.3.0
