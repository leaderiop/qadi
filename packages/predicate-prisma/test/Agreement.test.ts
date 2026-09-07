import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "effect/testing/FastCheck";
import { evaluatePredicate, type Predicate } from "@qadi/core";
import { compilePrismaWhere } from "../src/index.ts";
import { matchesPrismaWhere } from "./matchesPrismaWhere.ts";
import { matchesPrismaWhereEngine } from "./matchesPrismaWhereEngine.ts";

type Row = Record<string, unknown>;

const rows: FastCheck.Arbitrary<Row> = FastCheck.record({
  tenantId: FastCheck.constantFrom("t-1", "t-2"),
  level: FastCheck.oneof(
    FastCheck.integer({ min: 0, max: 5 }),
    FastCheck.constantFrom("3", "0"),
    FastCheck.constant(null),
  ),
  tag: FastCheck.constantFrom("red", "blue", "green"),
  sealed: FastCheck.boolean(),
});

/** Only safe-value shapes: an unsafe value is `compilePrismaWhere`'s refusal path, tested separately. */
const leaf: FastCheck.Arbitrary<Predicate> = FastCheck.oneof(
  FastCheck.constant<Predicate>({ _tag: "True" }),
  FastCheck.constant<Predicate>({ _tag: "False" }),
  FastCheck.constantFrom("t-1", "t-2").map(
    (v): Predicate => ({ _tag: "Compare", column: "tenantId", op: "Eq", value: v }),
  ),
  FastCheck.constantFrom("t-1", "t-2").map(
    (v): Predicate => ({ _tag: "Compare", column: "tenantId", op: "Neq", value: v }),
  ),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Gte", value: n }),
  ),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Lt", value: n }),
  ),
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "sealed", op: "Eq", value: true }),
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "missing", op: "Eq", value: "x" }),
  FastCheck.subarray(["red", "blue", "green"]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "tag", values: vs }),
  ),
  FastCheck.constant<Predicate>({ _tag: "MemberOf", column: "tag", values: [] }),
  // `level` can be `null` in a generated row (above) — these leaves are what
  // caught INV-QD-048's original NULL-handling defect. Neither `matchesPrismaWhere`
  // nor the reference interpreter can find that class of bug without a
  // predicate whose OWN value is null, or whose column can be, compared with
  // Eq/Neq/MemberOf specifically.
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "level", op: "Eq", value: null }),
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "level", op: "Neq", value: null }),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Eq", value: n }),
  ),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Neq", value: n }),
  ),
  FastCheck.subarray([0, 1, 2, null]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "level", values: vs }),
  ),
);

const tree: FastCheck.Arbitrary<Predicate> = FastCheck.letrec<{ node: Predicate }>((tie) => ({
  node: FastCheck.oneof(
    { maxDepth: 4, withCrossShrink: true },
    leaf,
    FastCheck.array(tie("node"), { maxLength: 3 }).map(
      (predicates): Predicate => ({ _tag: "And", predicates }),
    ),
    FastCheck.array(tie("node"), { maxLength: 3 }).map(
      (predicates): Predicate => ({ _tag: "Or", predicates }),
    ),
    tie("node").map((predicate): Predicate => ({ _tag: "Negate", predicate })),
  ),
})).node;

describe("INV-QD-048: a compiled Prisma WhereInput admits exactly the rows the predicate admits", () => {
  it.effect("PROPERTY: matchesPrismaWhere(compilePrismaWhere(P), R) equals evaluatePredicate(P, R)", () =>
    Effect.gen(function* () {
      const predicates = FastCheck.sample(tree, { numRuns: 150, seed: 4096 });
      const sample = FastCheck.sample(rows, { numRuns: 12, seed: 4096 });

      for (const predicate of predicates) {
        const where = yield* compilePrismaWhere(predicate);
        for (const row of sample) {
          assert.strictEqual(
            matchesPrismaWhere(where, row),
            evaluatePredicate(predicate, row),
            JSON.stringify({ predicate, row, where }),
          );
        }
      }
    }));

  // C1 (issue 34, CCR-QD-111): `matchesPrismaWhere` above implements JS
  // `.every`/`.some` at every depth — the same semantics `renderNode`
  // wrongly assumed before this fix, so it cannot see the difference
  // between a correct render and one that nests a vacuous identity where
  // Prisma's real engine silently drops or fails to negate it. The `tree`
  // generator already produces `And`/`Or`/`Negate` nodes containing `True`/
  // `False`/empty-`MemberOf` leaves at every depth — exactly the shapes C1
  // was about — so this is the same sample, checked against
  // `matchesPrismaWhereEngine` (`./matchesPrismaWhereEngine.ts`), which
  // models Prisma's actual nested-empty-array stripping instead. This
  // property fails against the pre-fix `renderNode` (nested `parts`
  // verbatim) for exactly the predicates C1 describes, and passes here only
  // because `renderNode` now guarantees no vacuous identity is ever nested
  // in what it emits.
  it.effect(
    "PROPERTY: matchesPrismaWhereEngine(compilePrismaWhere(P), R) equals evaluatePredicate(P, R)",
    () =>
      Effect.gen(function* () {
        const predicates = FastCheck.sample(tree, { numRuns: 150, seed: 4096 });
        const sample = FastCheck.sample(rows, { numRuns: 12, seed: 4096 });

        for (const predicate of predicates) {
          const where = yield* compilePrismaWhere(predicate);
          for (const row of sample) {
            assert.strictEqual(
              matchesPrismaWhereEngine(where, row),
              evaluatePredicate(predicate, row),
              JSON.stringify({ predicate, row, where }),
            );
          }
        }
      }),
  );
});
