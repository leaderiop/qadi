import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "effect/testing/FastCheck";
import { evaluatePredicate, type Predicate } from "@qadi/core";
import { compileSql, type SqlDialect } from "../src/index.ts";
import { interpretSqlFragment } from "./sqlInterpreter.ts";

type Row = Record<string, unknown>;

const rows: FastCheck.Arbitrary<Row> = FastCheck.record({
  tenantId: FastCheck.constantFrom("t-1", "t-2"),
  // Not just integers: a well-typed column never reaches the place two
  // interpreters diverge (ADR-QD-024's own lesson). A numeric string is the
  // discriminator between coercing and non-coercing comparisons.
  level: FastCheck.oneof(
    FastCheck.integer({ min: 0, max: 5 }),
    FastCheck.constantFrom("3", "0"),
    FastCheck.constant(null),
  ),
  tag: FastCheck.constantFrom("red", "blue", "green"),
  sealed: FastCheck.boolean(),
});

/** Only safe-value shapes: an unsafe value is `compileSql`'s refusal path, tested separately. */
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
  // Absent column: both sides must read `undefined` the same way.
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "missing", op: "Eq", value: "x" }),
  FastCheck.subarray(["red", "blue", "green"]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "tag", values: vs }),
  ),
  FastCheck.constant<Predicate>({ _tag: "MemberOf", column: "tag", values: [] }),
);

const tree: FastCheck.Arbitrary<Predicate> = FastCheck.letrec((tie) => ({
  node: FastCheck.oneof(
    { maxDepth: 4, withCrossShrink: true },
    leaf,
    FastCheck.array(tie("node") as FastCheck.Arbitrary<Predicate>, { maxLength: 3 }).map(
      (predicates): Predicate => ({ _tag: "And", predicates }),
    ),
    FastCheck.array(tie("node") as FastCheck.Arbitrary<Predicate>, { maxLength: 3 }).map(
      (predicates): Predicate => ({ _tag: "Or", predicates }),
    ),
    (tie("node") as FastCheck.Arbitrary<Predicate>).map(
      (predicate): Predicate => ({ _tag: "Negate", predicate }),
    ),
  ),
})).node;

const DIALECTS: ReadonlyArray<SqlDialect> = ["postgres", "mysql", "sqlite"];

describe("INV-QD-047: a compiled SQL fragment admits exactly the rows the predicate admits", () => {
  for (const dialect of DIALECTS) {
    it.effect(`PROPERTY: interpretSqlFragment(compileSql(P), R) equals evaluatePredicate(P, R) — ${dialect}`, () =>
      Effect.gen(function* () {
        const predicates = FastCheck.sample(tree, { numRuns: 150, seed: 2048 });
        const sample = FastCheck.sample(rows, { numRuns: 12, seed: 2048 });

        for (const predicate of predicates) {
          const fragment = yield* compileSql(predicate, { dialect });
          for (const row of sample) {
            assert.strictEqual(
              interpretSqlFragment(fragment, row),
              evaluatePredicate(predicate, row),
              JSON.stringify({ dialect, predicate, row, fragment }),
            );
          }
        }
      }),
    );
  }
});
