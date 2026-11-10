/**
 * The role walk's own laws: every reachable role visited once, in pre-order with
 * parents in array order, every edge into a visited role reported as a revisit
 * pointing at that role's visit, and stack-safe on a deep chain.
 *
 * The reference below is the plain recursive walk the four old copies all meant
 * to be; `roleWalk` must reproduce it step for step.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import { permission, role, roleWalk } from "../src/index.ts";
import type { Role, RoleStep } from "../src/index.ts";
import { arbitraryRoleGraph, chain, reachable } from "./RoleGraphArbitrary.ts";

interface Step {
  readonly _tag: "Visit" | "Revisit";
  readonly role: Role;
  readonly index: number;
  readonly depth: number;
  readonly parent: number | undefined;
  readonly first: number | undefined;
}

const reference = (root: Role): ReadonlyArray<Step> => {
  const steps: Array<Step> = [];
  const first = new Map<Role, number>();
  const go = (r: Role, depth: number, parent: number | undefined): void => {
    const index = steps.length;
    const earlier = first.get(r);
    if (earlier !== undefined) {
      steps.push({ _tag: "Revisit", role: r, index, depth, parent, first: earlier });
      return;
    }
    first.set(r, index);
    steps.push({ _tag: "Visit", role: r, index, depth, parent, first: undefined });
    for (const p of r.inherits) go(p, depth + 1, index);
  };
  go(root, 0, undefined);
  return steps;
};

const plain = (step: RoleStep): Step => ({
  _tag: step._tag,
  role: step.role,
  index: step.index,
  depth: step.depth,
  parent: step.parent,
  first: step._tag === "Revisit" ? step.first : undefined,
});

describe("roleWalk", () => {
  it("is the recursive pre-order walk, step for step, over random role graphs", () => {
    FastCheck.assert(
      FastCheck.property(arbitraryRoleGraph, ({ root }) => {
        const steps = roleWalk(root);
        assert.deepStrictEqual(steps.map(plain), reference(root));

        const visits = steps.filter((s) => s._tag === "Visit");
        assert.strictEqual(visits.length, reachable(root).size);
        assert.strictEqual(new Set(visits.map((s) => s.role)).size, visits.length);

        for (const step of steps) {
          assert.strictEqual(steps[step.index], step);
          if (step._tag === "Revisit") {
            const target = steps[step.first];
            assert.strictEqual(target?._tag, "Visit");
            assert.strictEqual(target?.role, step.role);
          }
        }
      }),
      { seed: 1639, numRuns: 300 },
    );
  });

  it("reports a diamond's second arm as a revisit of the first", () => {
    const base = role({ name: "base", permissions: [permission("doc", "read")] });
    const left = role({ name: "left", inherits: [base] });
    const right = role({ name: "right", inherits: [base] });
    const top = role({ name: "top", inherits: [left, right] });

    assert.deepStrictEqual(
      roleWalk(top).map((s) => [s._tag, s.role.name, s.index, s.depth, s.parent]),
      [
        ["Visit", "top", 0, 0, undefined],
        ["Visit", "left", 1, 1, 0],
        ["Visit", "base", 2, 2, 1],
        ["Visit", "right", 3, 1, 0],
        ["Revisit", "base", 4, 2, 3],
      ],
    );
    const revisit = roleWalk(top)[4];
    assert.strictEqual(revisit?._tag === "Revisit" ? revisit.first : undefined, 2);
  });

  it("keys on identity: two distinct roles sharing a name are both visited", () => {
    const a = role({ name: "editor", permissions: [permission("doc", "read")] });
    const b = role({ name: "editor", permissions: [permission("doc", "write")] });
    const top = role({ name: "top", inherits: [a, b] });

    assert.deepStrictEqual(
      roleWalk(top).map((s) => s._tag),
      ["Visit", "Visit", "Visit"],
    );
  });

  it("walks a 20,000-deep chain without a stack overflow", () => {
    const steps = roleWalk(chain(20_000));
    assert.strictEqual(steps.length, 20_000);
    assert.strictEqual(steps[19_999]?.depth, 19_999);
    assert.strictEqual(steps[19_999]?.role.name, "role-0");
  }, 60_000);
});
