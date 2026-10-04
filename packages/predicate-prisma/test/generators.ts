/**
 * Predicate generators shared by this package's agreement properties
 * (`Agreement.test.ts`, `EngineAgreement.test.ts`).
 *
 * Every leaf is type-consistent with the fixture table (`tenantId` and `tag` are
 * text, `level` an integer, `sealed` a boolean), which is what lets a real
 * engine be the oracle: a literal whose JS type differs from its column's is
 * the accepted N2 limitation, characterised separately.
 */
import * as FastCheck from "fast-check";
import type { Predicate } from "@qadi/core";

/** Only safe-value shapes: an unsafe value is `compilePrismaWhere`'s refusal path, tested separately. */
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
  FastCheck.constant<Predicate>({ _tag: "Compare", column: "sealed", op: "Eq", value: true }),
  // (No leaf over an absent column: a table has no absent columns, and the
  // engine model refuses an unknown field the way Prisma's validator does.
  // `Predicate.test.ts` keeps covering `undefined`.)
  FastCheck.subarray(["red", "blue", "green"]).map(
    (vs): Predicate => ({ _tag: "MemberOf", column: "tag", values: vs }),
  ),
  FastCheck.constantFrom("red", "blue").map(
    (v): Predicate => ({ _tag: "Compare", column: "tag", op: "Eq", value: v }),
  ),
  FastCheck.constantFrom("red", "blue").map(
    (v): Predicate => ({ _tag: "Compare", column: "tag", op: "Neq", value: v }),
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

