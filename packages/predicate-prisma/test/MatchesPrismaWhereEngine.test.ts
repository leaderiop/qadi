import { assert, describe, it } from "@effect/vitest";
import { matchesPrismaWhere } from "./matchesPrismaWhere.ts";
import { matchesPrismaWhereEngine } from "./matchesPrismaWhereEngine.ts";

/** No column declared nullable: none of these shapes mentions `null`. */
const NONE: ReadonlySet<string> = new Set();
const LEVEL: ReadonlySet<string> = new Set(["level"]);

/**
 * Pins `matchesPrismaWhereEngine` itself against the two real, live-engine
 * Prisma bug reports `../src/index.ts`'s `isVacuousTrue`/`isVacuousFalse`
 * cites (#17367, #21856) — on hand-built `WhereInput` shapes a *pre-fix*
 * `renderNode` would have emitted, not through `compilePrismaWhere`, which
 * no longer produces them. Without this, a bug in the interpreter itself
 * (e.g. one that quietly agreed with `matchesPrismaWhere` everywhere) could
 * make `Agreement.test.ts`'s stronger property pass for the wrong reason —
 * because there is nothing left in `renderNode`'s own output for it to
 * disagree on, not because the interpreter would have caught the C1 defect
 * had it still been there.
 */
describe("matchesPrismaWhereEngine models Prisma's real nested-vacuous-identity bug", () => {
  it("a bare, un-nested {OR: []} at the top level is correctly False, matching #17367's own baseline", () => {
    assert.strictEqual(matchesPrismaWhereEngine({ OR: [] }, {}, NONE), false);
    assert.strictEqual(matchesPrismaWhereEngine({ AND: [] }, {}, NONE), true);
  });

  it("#17367: {OR: []} nested inside an AND array is dropped, not treated as always-false", () => {
    const buggy = { AND: [{ email: "user1@example.com" }, { OR: [] }] };
    const row = { email: "user1@example.com" };

    // The naive JS-semantics reader gets this right by construction — it is
    // exactly why it could never have caught C1.
    assert.strictEqual(matchesPrismaWhere(buggy, row), false);

    // The real engine drops the vacuous OR from the AND list and matches on
    // `email` alone — the row is (wrongly, per Prisma's own issue) admitted.
    assert.strictEqual(matchesPrismaWhereEngine(buggy, row, NONE), true);
  });

  it("the same is true of a nested {AND: []}, per the confirming comment on #17367", () => {
    const buggy = { AND: [{ email: "user1@example.com" }, { AND: [] }] };
    const row = { email: "user1@example.com" };

    assert.strictEqual(matchesPrismaWhere(buggy, row), true);
    assert.strictEqual(matchesPrismaWhereEngine(buggy, row, NONE), true);
  });

  it("#21856: {NOT: {AND: []}} incorrectly matches every row instead of none", () => {
    const buggy = { NOT: { AND: [] } };
    const row = {};

    // Naive semantics: NOT(True) = False.
    assert.strictEqual(matchesPrismaWhere(buggy, row), false);
    // Real engine: the inner empty AND strips to "no restriction" before
    // NOT ever sees it, so NOT fails to negate — every row matches.
    assert.strictEqual(matchesPrismaWhereEngine(buggy, row, NONE), true);
  });

  it("#21856: {AND: {OR: []}} incorrectly matches every row instead of none", () => {
    const buggy = { AND: [{ OR: [] }] };
    const row = {};

    assert.strictEqual(matchesPrismaWhere(buggy, row), false);
    assert.strictEqual(matchesPrismaWhereEngine(buggy, row, NONE), true);
  });

  it("a non-vacuous, real nested filter is unaffected — only genuinely empty AND/OR strips", () => {
    const where = { AND: [{ tenantId: "t-1" }, { OR: [{ tag: "red" }, { tag: "blue" }] }] };
    const admitted = { tenantId: "t-1", tag: "red" };
    const denied = { tenantId: "t-2", tag: "red" };

    assert.strictEqual(matchesPrismaWhere(where, admitted), true);
    assert.strictEqual(matchesPrismaWhereEngine(where, admitted, NONE), true);
    assert.strictEqual(matchesPrismaWhere(where, denied), false);
    assert.strictEqual(matchesPrismaWhereEngine(where, denied, NONE), false);
  });
});

/**
 * The three-valued half of the model (CCR-QD-153): what a real Prisma 7.10
 * client over SQLite returned for these exact shapes, on rows
 * `level ∈ {null, 1, 5}`.
 */
describe("matchesPrismaWhereEngine models SQL's three-valued logic", () => {
  const nullRow = { level: null };

  it("a comparison with a non-null operand against NULL is unknown, so it is excluded", () => {
    assert.strictEqual(matchesPrismaWhereEngine({ level: { gte: 3 } }, nullRow, LEVEL), false);
    assert.strictEqual(matchesPrismaWhereEngine({ level: 3 }, nullRow, LEVEL), false);
    assert.strictEqual(matchesPrismaWhereEngine({ level: { in: [3] } }, nullRow, LEVEL), false);
  });

  it("NOT of unknown stays unknown, so the NULL row is excluded (the C6 defect's mechanism)", () => {
    assert.strictEqual(matchesPrismaWhereEngine({ NOT: { level: { gte: 3 } } }, nullRow, LEVEL), false);
    assert.strictEqual(matchesPrismaWhereEngine({ NOT: { level: 3 } }, nullRow, LEVEL), false);
    assert.strictEqual(matchesPrismaWhereEngine({ NOT: { level: { in: [3] } } }, nullRow, LEVEL), false);
    // ...while a definite row negates normally.
    assert.strictEqual(matchesPrismaWhereEngine({ NOT: { level: { gte: 3 } } }, { level: 1 }, LEVEL), true);
    assert.strictEqual(matchesPrismaWhereEngine({ NOT: { level: { gte: 3 } } }, { level: 5 }, LEVEL), false);
  });

  it("a null guard makes the leaf definite, so NOT admits the NULL row", () => {
    const guarded = { NOT: { level: { gte: 3, not: null } } };
    assert.strictEqual(matchesPrismaWhereEngine(guarded, nullRow, LEVEL), true);
    assert.strictEqual(matchesPrismaWhereEngine(guarded, { level: 5 }, LEVEL), false);
  });

  it("Kleene AND/OR: false beats unknown under AND, true beats unknown under OR", () => {
    const row = { level: null, tenantId: "t-1" };
    assert.strictEqual(
      matchesPrismaWhereEngine({ AND: [{ level: 3 }, { tenantId: "t-2" }] }, row, LEVEL),
      false,
    );
    // unknown AND true is unknown, so it is excluded; NOT of it is unknown again.
    assert.strictEqual(
      matchesPrismaWhereEngine({ NOT: { AND: [{ level: 3 }, { tenantId: "t-1" }] } }, row, LEVEL),
      false,
    );
    // unknown AND false is false, so NOT of it is true.
    assert.strictEqual(
      matchesPrismaWhereEngine({ NOT: { AND: [{ level: 3 }, { tenantId: "t-2" }] } }, row, LEVEL),
      true,
    );
    assert.strictEqual(
      matchesPrismaWhereEngine({ OR: [{ level: 3 }, { tenantId: "t-1" }] }, row, LEVEL),
      true,
    );
    assert.strictEqual(
      matchesPrismaWhereEngine({ OR: [{ level: 3 }, { tenantId: "t-2" }] }, row, LEVEL),
      false,
    );
  });

  it("several operators in one filter object combine as a Kleene AND", () => {
    assert.strictEqual(matchesPrismaWhereEngine({ level: { gte: 3, not: null } }, { level: 5 }, LEVEL), true);
    assert.strictEqual(matchesPrismaWhereEngine({ level: { gte: 3, not: null } }, { level: 1 }, LEVEL), false);
    assert.strictEqual(matchesPrismaWhereEngine({ level: { equals: 1, not: null } }, { level: 1 }, LEVEL), true);
  });

  it("{col: null} and {col: {not: null}} are exact on a nullable column", () => {
    assert.strictEqual(matchesPrismaWhereEngine({ level: null }, nullRow, LEVEL), true);
    assert.strictEqual(matchesPrismaWhereEngine({ level: null }, { level: 1 }, LEVEL), false);
    assert.strictEqual(matchesPrismaWhereEngine({ level: { not: null } }, { level: 1 }, LEVEL), true);
    assert.strictEqual(matchesPrismaWhereEngine({ NOT: { level: null } }, { level: 1 }, LEVEL), true);
  });

  it("a null mention on a column outside `nullable` throws Prisma's validation error (N1)", () => {
    const required = { tenantId: "t-1" };
    for (const where of [
      { tenantId: null },
      { tenantId: { not: null } },
      { tenantId: { equals: null } },
      { tenantId: { gte: 3, not: null } },
    ]) {
      assert.throws(
        () => matchesPrismaWhereEngine(where, required, NONE),
        "Argument `tenantId` is missing.",
      );
    }
  });

  it("`in` with a null member is refused, as Prisma refuses it", () => {
    assert.throws(
      () => matchesPrismaWhereEngine({ level: { in: [1, null] } }, { level: 1 }, LEVEL),
      "refuses a null member",
    );
  });

  it("an `in` is true or false on a definite row and requires an array", () => {
    assert.strictEqual(matchesPrismaWhereEngine({ level: { in: [1] } }, { level: 1 }, LEVEL), true);
    assert.strictEqual(matchesPrismaWhereEngine({ level: { in: [1] } }, { level: 2 }, LEVEL), false);
    assert.throws(
      () => matchesPrismaWhereEngine({ level: { in: 1 } }, { level: 1 }, LEVEL),
      "in must be an array",
    );
  });

  it("rejects malformed filters instead of guessing", () => {
    assert.throws(
      () => matchesPrismaWhereEngine({ level: {} }, { level: 1 }, LEVEL),
      "unrecognized column filter",
    );
    assert.throws(
      () => matchesPrismaWhereEngine({ level: { bogus: 1 } }, { level: 1 }, LEVEL),
      "unrecognized column filter operator",
    );
    assert.throws(
      () => matchesPrismaWhereEngine({ level: { gte: null } }, { level: 1 }, LEVEL),
      "refuses null",
    );
    assert.throws(
      () => matchesPrismaWhereEngine({ a: 1, b: 2 }, { a: 1, b: 2 }, NONE),
      "exactly one column filter",
    );
    assert.throws(() => matchesPrismaWhereEngine({ nope: 1 }, { a: 1 }, NONE), "unknown field");
    assert.throws(() => matchesPrismaWhereEngine({ AND: 1 }, {}, NONE), "AND must be an array");
    assert.throws(() => matchesPrismaWhereEngine({ OR: 1 }, {}, NONE), "OR must be an array");
    assert.throws(() => matchesPrismaWhereEngine({ NOT: 1 }, {}, NONE), "NOT must be an object");
  });
});
