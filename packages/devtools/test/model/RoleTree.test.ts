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
import type { RoleNode } from "../../src/model/RoleTree.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");
const comment = permission("doc", "comment");
const archive = permission("doc", "archive");

const commenter = role({ name: "commenter", permissions: [comment] });
const viewer = role({ name: "viewer", permissions: [read], inherits: [commenter] });
const editor = role({ name: "editor", permissions: [write, archive], inherits: [viewer] });

const names = (node: RoleNode): ReadonlyArray<string> => [
  node.name,
  ...node.children.flatMap(names),
];

describe("the inheritance tree", () => {
  it("is the role, then what it inherits, in order", () => {
    assert.deepStrictEqual(names(roleSummary(editor).tree), [
      "editor",
      "viewer",
      "commenter",
    ]);
  });

  it("addresses every node, so a diamond's two arms differ", () => {
    const paths = (node: RoleNode): ReadonlyArray<string> => [
      node.path,
      ...node.children.flatMap(paths),
    ];
    assert.deepStrictEqual(paths(roleSummary(editor).tree), ["$", "$.0", "$.0.0"]);
  });

  it("names each role's own permissions", () => {
    const tree = roleSummary(editor).tree;
    assert.deepStrictEqual([...tree.own], ["doc:write", "doc:archive"]);
    assert.deepStrictEqual([...(tree.children[0]?.own ?? [])], ["doc:read"]);
  });

  // E3.5
  it("a role with no permissions and no parents is still a tree", () => {
    const bare = role({ name: "bare" });
    const summary = roleSummary(bare);

    assert.deepStrictEqual(names(summary.tree), ["bare"]);
    assert.deepStrictEqual(summary.grants, []);
    assert.strictEqual(summary.ownCount, 0);
    assert.strictEqual(summary.inheritedCount, 0);
  });

  // E3.6
  it("a deep chain renders without exhausting the stack", () => {
    let deep: Role = role({ name: "r0", permissions: [read] });
    for (let i = 1; i < 200; i += 1) deep = role({ name: `r${i}`, inherits: [deep] });

    assert.strictEqual(names(roleSummary(deep).tree).length, 200);
  });

  /**
   * E3.3 — a diamond, from the tree's side.
   *
   * The second arm is shown, because the catalogue really has that edge and
   * hiding it would misrepresent the graph — but it is marked, because the
   * permissions beneath it were already counted once and a reader summing the
   * rows would otherwise double-count.
   */
  it("marks the second arm of a diamond as already reached", () => {
    const both = role({ name: "both", inherits: [viewer, editor] });
    const tree = roleSummary(both).tree;

    const marked = (node: RoleNode): ReadonlyArray<[string, boolean]> => [
      [node.name, node.repeated],
      ...node.children.flatMap(marked),
    ];

    assert.deepStrictEqual(marked(tree), [
      ["both", false],
      ["viewer", false],
      ["commenter", false],
      ["editor", false],
      // Reached through `viewer` first.
      ["viewer", true],
      ["commenter", true],
    ]);
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
