import { assert, describe, it } from "@effect/vitest";
import { foldTree } from "../src/TreeFold.ts";

interface Node {
  readonly name: string;
  readonly kids: ReadonlyArray<Node>;
}

const node = (name: string, kids: ReadonlyArray<Node> = []): Node => ({ name, kids });
const kidsOf = (n: Node): ReadonlyArray<Node> => n.kids;

describe("foldTree", () => {
  it("combines post-order, children in childrenOf order", () => {
    const order: Array<string> = [];
    const tree = node("a", [node("b", [node("d")]), node("c")]);
    const result = foldTree<Node, string>(tree, kidsOf, (n, children) => {
      order.push(n.name);
      return `${n.name}(${children.join(",")})`;
    });
    assert.strictEqual(result, "a(b(d()),c())");
    assert.deepStrictEqual(order, ["d", "b", "c", "a"]);
  });

  it("gives a leaf an empty children array", () => {
    const seen: Array<ReadonlyArray<number>> = [];
    foldTree<Node, number>(node("x"), kidsOf, (_n, children) => {
      seen.push(children);
      return 1;
    });
    assert.deepStrictEqual(seen, [[]]);
  });

  it("combines a shared child once and reuses its result by reference", () => {
    const shared = node("s");
    const tree = node("root", [shared, node("mid", [shared]), shared]);
    const combined: Array<string> = [];
    const result = foldTree<Node, Node>(
      tree,
      kidsOf,
      (n, children) => {
        combined.push(n.name);
        return { name: n.name, kids: children };
      },
    );
    assert.deepStrictEqual(combined, ["s", "mid", "root"]);
    const mid = result.kids[1];
    assert.strictEqual(result.kids[0], result.kids[2]);
    assert.strictEqual(result.kids[0], mid?.kids[0]);
  });

  it("calls childrenOf once per distinct node", () => {
    const calls = new Map<Node, number>();
    const shared = node("s");
    const tree = node("root", [shared, node("mid", [shared]), shared]);
    foldTree<Node, number>(
      tree,
      (n) => {
        calls.set(n, (calls.get(n) ?? 0) + 1);
        return n.kids;
      },
      () => 0,
    );
    assert.strictEqual(calls.size, 3);
    for (const count of calls.values()) assert.strictEqual(count, 1);
  });

  it("folds a 100,000-deep chain", () => {
    let tree = node("leaf");
    for (let i = 0; i < 100_000; i++) tree = node("n", [tree]);
    const depth = foldTree<Node, number>(tree, kidsOf, (_n, c) => (c[0] === undefined ? 0 : c[0] + 1));
    assert.strictEqual(depth, 100_000);
  }, 60_000);

  it("folds a 250,000-wide node", () => {
    const kids = Array.from({ length: 250_000 }, () => node("k"));
    const width = foldTree<Node, number>(node("root", kids), kidsOf, (_n, c) => c.length);
    assert.strictEqual(width, 250_000);
  }, 60_000);

  it("throws on a cycle and on a self-loop", () => {
    const a: { name: string; kids: Array<Node> } = { name: "a", kids: [] };
    const b: Node = { name: "b", kids: [a] };
    a.kids.push(b);
    assert.throws(() => foldTree<Node, number>(a, kidsOf, () => 0), /cycle/);

    const self: { name: string; kids: Array<Node> } = { name: "self", kids: [] };
    self.kids.push(self);
    assert.throws(() => foldTree<Node, number>(self, kidsOf, () => 0), /cycle/);
  });

  it("does not report a diamond as a cycle", () => {
    const d = node("d");
    const tree = node("a", [node("b", [d]), node("c", [d])]);
    const count = foldTree<Node, number>(tree, kidsOf, (_n, c) => 1 + c.reduce((x, y) => x + y, 0));
    assert.strictEqual(count, 5);
  });

  it("memoises an undefined result", () => {
    const shared = node("s");
    const tree = node("root", [shared, shared]);
    let combines = 0;
    const result = foldTree<Node, undefined>(tree, kidsOf, () => {
      combines += 1;
      return undefined;
    });
    assert.isUndefined(result);
    assert.strictEqual(combines, 2);
  });

  it("reads each children array once, even if childrenOf would vary", () => {
    let flip = false;
    const a = node("a");
    const b = node("b");
    const tree = node("root", [a, b]);
    const names = foldTree<Node, string>(
      tree,
      (n) => {
        if (n !== tree) return [];
        flip = !flip;
        return flip ? [a, b] : [b];
      },
      (n, c) => `${n.name}[${c.join("")}]`,
    );
    assert.strictEqual(names, "root[a[]b[]]");
  });
});
