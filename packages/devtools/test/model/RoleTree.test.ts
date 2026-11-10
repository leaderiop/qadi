/**
 * JOB 3 ledger — E3.1 … E3.9 (the model half; the rendered half is in
 * `test/react/RoleViewer.test.tsx`).
 *
 * The load-bearing case is E3.4: the permission set this screen shows must be
 * the set that decides. INV-QD-038 holds `permissionProvenance` and
 * `flattenPermissions` in agreement, and this asserts the screen inherits that
 * agreement rather than re-deriving one of its own.
 */
import { assert, describe, it } from "@effect/vitest";
import { flattenPermissions, permission, role } from "@qadi/core";
import type { Role } from "@qadi/core";
import { decidingSet, grantPath, roleSummary } from "../../src/model/RoleTree.ts";
import type { RoleRow } from "../../src/model/RoleTree.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");
const comment = permission("doc", "comment");
const archive = permission("doc", "archive");

const commenter = role({ name: "commenter", permissions: [comment] });
const viewer = role({ name: "viewer", permissions: [read], inherits: [commenter] });
const editor = role({ name: "editor", permissions: [write, archive], inherits: [viewer] });

const names = (rows: ReadonlyArray<RoleRow>): ReadonlyArray<string> => rows.map((row) => row.name);

describe("the inheritance tree", () => {
  it("is the role, then what it inherits, in order", () => {
    assert.deepStrictEqual(names(roleSummary(editor).rows), [
      "editor",
      "viewer",
      "commenter",
    ]);
  });

  it("numbers every row by its walk step, and indents it by its depth", () => {
    assert.deepStrictEqual(
      roleSummary(editor).rows.map((row) => [row.index, row.depth]),
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
    );
  });

  it("names each role's own permissions", () => {
    assert.deepStrictEqual(
      roleSummary(editor).rows.map((row) => [...row.own]),
      [["doc:write", "doc:archive"], ["doc:read"], ["doc:comment"]],
    );
  });

  // E3.5
  it("a role with no permissions and no parents is still a tree", () => {
    const bare = role({ name: "bare" });
    const summary = roleSummary(bare);

    assert.deepStrictEqual(names(summary.rows), ["bare"]);
    assert.deepStrictEqual(summary.grants, []);
    assert.strictEqual(summary.ownCount, 0);
    assert.strictEqual(summary.inheritedCount, 0);
  });

  // E3.6
  it("a deep chain renders without exhausting the stack", () => {
    let deep: Role = role({ name: "r0", permissions: [read] });
    for (let i = 1; i < 200; i += 1) deep = role({ name: `r${i}`, inherits: [deep] });

    assert.strictEqual(roleSummary(deep).rows.length, 200);
  });

  /**
   * E3.3 — a diamond, from the tree's side.
   *
   * The second arm is shown, because the catalogue really has that edge and
   * hiding it would misrepresent the graph — but as a leaf pointing at the first
   * occurrence, because the subtree beneath it is already shown there and a
   * reader summing the rows would otherwise double-count (decision 16-01 T1 = A).
   */
  it("shows the second arm of a diamond as a leaf pointing at the first", () => {
    const both = role({ name: "both", inherits: [viewer, editor] });
    assert.deepStrictEqual(
      roleSummary(both).rows.map((row) => [row.name, row.index, row.depth, row.repeated, row.first]),
      [
        ["both", 0, 0, false, undefined],
        ["viewer", 1, 1, false, undefined],
        ["commenter", 2, 2, false, undefined],
        ["editor", 3, 1, false, undefined],
        // Reached through `viewer` first: a leaf naming step 1, with no rows beneath it.
        ["viewer", 4, 2, true, 1],
      ],
    );
  });
});

const chainOf = (depth: number): Role => {
  let current: Role = role({ name: "r0", permissions: [read] });
  for (let i = 1; i < depth; i += 1) current = role({ name: `r${i}`, inherits: [current] });
  return current;
};

/** `k` diamonds stacked: 3k + 1 roles, 4k edges, so k edges reach a role already shown. */
const diamondStack = (k: number): Role => {
  let current: Role = role({ name: "d0", permissions: [read] });
  for (let i = 1; i <= k; i += 1) {
    const left = role({ name: `l${i}`, inherits: [current] });
    const right = role({ name: `r${i}`, inherits: [current] });
    current = role({ name: `d${i}`, inherits: [left, right] });
  }
  return current;
};

describe("the inheritance tree on hostile shapes", () => {
  it("does not mark a distinct role repeated because it shares a name", () => {
    const editorA = role({ name: "editor", permissions: [write] });
    const editorB = role({ name: "editor", permissions: [archive] });
    const rows = roleSummary(role({ name: "top", inherits: [editorA, editorB] })).rows;

    assert.deepStrictEqual(
      rows.slice(1).map((row) => [row.name, row.repeated, [...row.own]]),
      [
        ["editor", false, ["doc:write"]],
        ["editor", false, ["doc:archive"]],
      ],
    );
  });

  it("builds a 10,000-deep and a 20,000-deep chain without a RangeError", () => {
    for (const depth of [10_000, 20_000]) {
      assert.strictEqual(roleSummary(chainOf(depth)).rows.length, depth, `depth ${depth}`);
    }
  }, 60_000);

  // Linear: one row per reachable role plus one leaf per edge into a role
  // already shown. k = 16 is asserted first, so a tree that re-walks shared
  // subtrees (about 2^k rows) fails there, fast, before k = 30 (about 2^30) is
  // ever built.
  it("builds stacked diamonds in rows linear in the roles", () => {
    for (const k of [16, 30]) {
      assert.strictEqual(roleSummary(diamondStack(k)).rows.length, 3 * k + 1 + k, `k = ${k}`);
    }
  });
});

describe("provenance", () => {
  // E3.1
  it("a role's own permission has a single-element path", () => {
    const own = roleSummary(editor).grants.filter((g) => g.path.length === 1);
    assert.deepStrictEqual(own.map((g) => g.permission), ["doc:write", "doc:archive"]);
    assert.deepStrictEqual(own.map(grantPath), ["own", "own"]);
  });

  // E3.2
  it("an inherited permission carries the roles walked to reach it", () => {
    const grants = roleSummary(editor).grants;

    const inherited = grants.find((g) => g.permission === "doc:comment");
    assert.deepStrictEqual([...(inherited?.path ?? [])], ["editor", "viewer", "commenter"]);
    assert.strictEqual(grantPath(inherited ?? fail()), "via viewer → commenter");
  });

  it("counts own and inherited apart", () => {
    const summary = roleSummary(editor);
    assert.strictEqual(summary.ownCount, 2);
    assert.strictEqual(summary.inheritedCount, 2);
  });

  /**
   * E3.4 — the property that makes this screen trustworthy.
   *
   * Asserted against `flattenPermissions` directly rather than against a count
   * this test computed: two functions answering one question is the shape this
   * codebase has been bitten by, and INV-QD-038 is the agreement.
   */
  it("shows exactly the permissions that decide", () => {
    for (const subject of [editor, viewer, commenter, role({ name: "bare" })]) {
      assert.deepStrictEqual(
        new Set(roleSummary(subject).grants.map((g) => g.permission)),
        flattenPermissions(subject),
        subject.name,
      );
      assert.deepStrictEqual(decidingSet(subject), flattenPermissions(subject));
    }
  });

  // E3.3 — a diamond, from the grants' side.
  it("a diamond yields one grant, by the path reached first", () => {
    const both = role({ name: "both", inherits: [viewer, editor] });
    const grants = roleSummary(both).grants;

    assert.strictEqual(grants.filter((g) => g.permission === "doc:read").length, 1);
    assert.deepStrictEqual(
      new Set(grants.map((g) => g.permission)),
      flattenPermissions(both),
    );
  });
});

const fail = (): never => {
  throw new Error("expected a grant");
};
