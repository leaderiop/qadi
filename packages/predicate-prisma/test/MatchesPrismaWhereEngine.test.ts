import { assert, describe, it } from "@effect/vitest";
import { matchesPrismaWhere } from "./matchesPrismaWhere.ts";
import { matchesPrismaWhereEngine } from "./matchesPrismaWhereEngine.ts";

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
    assert.strictEqual(matchesPrismaWhereEngine({ OR: [] }, {}), false);
    assert.strictEqual(matchesPrismaWhereEngine({ AND: [] }, {}), true);
  });

  it("#17367: {OR: []} nested inside an AND array is dropped, not treated as always-false", () => {
    const buggy = { AND: [{ email: "user1@example.com" }, { OR: [] }] };
    const row = { email: "user1@example.com" };

    // The naive JS-semantics reader gets this right by construction — it is
    // exactly why it could never have caught C1.
    assert.strictEqual(matchesPrismaWhere(buggy, row), false);

    // The real engine drops the vacuous OR from the AND list and matches on
    // `email` alone — the row is (wrongly, per Prisma's own issue) admitted.
    assert.strictEqual(matchesPrismaWhereEngine(buggy, row), true);
  });

  it("the same is true of a nested {AND: []}, per the confirming comment on #17367", () => {
    const buggy = { AND: [{ email: "user1@example.com" }, { AND: [] }] };
    const row = { email: "user1@example.com" };

    assert.strictEqual(matchesPrismaWhere(buggy, row), true);
    assert.strictEqual(matchesPrismaWhereEngine(buggy, row), true);
  });

  it("#21856: {NOT: {AND: []}} incorrectly matches every row instead of none", () => {
    const buggy = { NOT: { AND: [] } };
    const row = {};

    // Naive semantics: NOT(True) = False.
    assert.strictEqual(matchesPrismaWhere(buggy, row), false);
    // Real engine: the inner empty AND strips to "no restriction" before
    // NOT ever sees it, so NOT fails to negate — every row matches.
    assert.strictEqual(matchesPrismaWhereEngine(buggy, row), true);
  });

  it("#21856: {AND: {OR: []}} incorrectly matches every row instead of none", () => {
    const buggy = { AND: [{ OR: [] }] };
    const row = {};

    assert.strictEqual(matchesPrismaWhere(buggy, row), false);
    assert.strictEqual(matchesPrismaWhereEngine(buggy, row), true);
  });

  it("a non-vacuous, real nested filter is unaffected — only genuinely empty AND/OR strips", () => {
    const where = { AND: [{ tenantId: "t-1" }, { OR: [{ tag: "red" }, { tag: "blue" }] }] };
    const admitted = { tenantId: "t-1", tag: "red" };
    const denied = { tenantId: "t-2", tag: "red" };

    assert.strictEqual(matchesPrismaWhere(where, admitted), true);
    assert.strictEqual(matchesPrismaWhereEngine(where, admitted), true);
    assert.strictEqual(matchesPrismaWhere(where, denied), false);
    assert.strictEqual(matchesPrismaWhereEngine(where, denied), false);
  });
});
