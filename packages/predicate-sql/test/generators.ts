/**
 * Predicate generators for the real-engine agreement properties
 * (`EngineAgreement.test.ts`).
 *
 * Every leaf is type-consistent with the fixture table (`tenantId` and `tag` are
 * text, `level` an integer, `sealed` a boolean, `score` a float that may hold
 * `±Infinity` and, on PostgreSQL, `NaN`), which is what lets a real
 * engine be the oracle: a literal whose JS type differs from its column's is the
 * accepted N2 limitation, characterised separately (S4) rather than fuzzed.
 */
import * as FastCheck from "fast-check";
import type { Predicate } from "@qadi/core";

export const leaf: FastCheck.Arbitrary<Predicate> = FastCheck.oneof(
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
  FastCheck.boolean().map(
    (v): Predicate => ({ _tag: "Compare", column: "sealed", op: "Eq", value: v }),
  ),
  FastCheck.boolean().map(
    (v): Predicate => ({ _tag: "Compare", column: "sealed", op: "Neq", value: v }),
  ),
  FastCheck.subarray(["red", "blue", "green"]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "tag", values: vs }),
  ),
  FastCheck.subarray(["red", "blue", null]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "tag", values: vs }),
  ),
  FastCheck.constant<Predicate>({ _tag: "MemberOf", column: "tag", values: [] }),
  FastCheck.constantFrom("red", "blue").map(
    (v): Predicate => ({ _tag: "Compare", column: "tag", op: "Eq", value: v }),
  ),
  FastCheck.constantFrom("red", "blue").map(
    (v): Predicate => ({ _tag: "Compare", column: "tag", op: "Neq", value: v }),
  ),
  // `level` and `tag` can be NULL in the table — the shapes that found INV-QD-047's
  // original NULL-handling defect.
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "level", op: "Eq", value: null }),
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "level", op: "Neq", value: null }),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Eq", value: n }),
  ),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "level", op: "Neq", value: n }),
  ),
  FastCheck.subarray([0, 3, 5, null]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "level", values: vs }),
  ),
  // `score` is the float column, the only one that can hold a non-finite value
  // (CCR-QD-172): ranges, finite equality and membership over it.
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "score", op: "Gte", value: n }),
  ),
  FastCheck.integer({ min: 0, max: 5 }).map(
    (n): Predicate => ({ _tag: "Compare", column: "score", op: "Lt", value: n }),
  ),
  FastCheck.constantFrom(0, 3, 5).map(
    (v): Predicate => ({ _tag: "Compare", column: "score", op: "Eq", value: v }),
  ),
  FastCheck.constantFrom(0, 3, 5).map(
    (v): Predicate => ({ _tag: "Compare", column: "score", op: "Neq", value: v }),
  ),
  FastCheck.subarray([0, 3, 5]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "score", values: vs }),
  ),
);

export const treeOf = (node: FastCheck.Arbitrary<Predicate>): FastCheck.Arbitrary<Predicate> =>
  FastCheck.letrec<{ node: Predicate }>((tie) => ({
    node: FastCheck.oneof(
      { maxDepth: 4, withCrossShrink: true },
      node,
      FastCheck.array(tie("node"), { maxLength: 3 }).map(
        (predicates): Predicate => ({ _tag: "And", predicates }),
      ),
      FastCheck.array(tie("node"), { maxLength: 3 }).map(
        (predicates): Predicate => ({ _tag: "Or", predicates }),
      ),
      tie("node").map((predicate): Predicate => ({ _tag: "Negate", predicate })),
    ),
  })).node;
