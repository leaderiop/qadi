/**
 * What flattening a role graph costs, on the paths that run once per subject.
 *
 * `flattenPermissions` runs inside `fromRoles`, once per subject — per request,
 * on a server — so a slower walk is paid on every request. ARCH-64 moved the
 * core walkers onto the one role walk (`RoleTraversal.ts`); this file is the
 * before/after for that move (ROLE-05), and the reason it must only ever be read
 * as ranges over repeated runs (spec/process/house-rules-evidence.md §2).
 *
 * The workloads stress different parts of the walk rather than being realistic
 * catalogues:
 *
 *   single           one role, five permissions, no parents — the floor
 *   wide             one role inheriting 50 parents of five permissions each,
 *                    the per-edge cost
 *   deep chain       a 1,000-deep inheritance chain, the stack-safety path
 *                    (ticket 86) at a depth a recursion would still survive
 *   diamonds         10 stacked diamonds, where the visited set turns 2^10
 *                    paths into 31 visits — the revisit path
 *   fromRoles shared three roots sharing 194 of a 200-role graph, where the
 *                    old `fromRoles` walked the shared part six times
 *                    (`roleNames` and `flattenAll`, per root) and one walk
 *                    over all roots walks it once
 *   fromRoles disjoint the same three roots over disjoint thirds of the same
 *                    size, where one walk saves only the second pass — the
 *                    control for the shared row
 *
 * Every graph is built once, at module scope, so only the walk is measured.
 */
import { test } from "vitest";
import { fromRoles } from "../src/AuthSubject.ts";
import { permission } from "../src/Permission.ts";
import { flattenPermissions, role } from "../src/Role.ts";
import type { Role } from "../src/Role.ts";

const grants = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => permission(prefix, `action${i}`));

const single = role({ name: "single", permissions: grants("single", 5) });

const wide = role({
  name: "wide",
  inherits: Array.from({ length: 50 }, (_, i) => role({ name: `parent${i}`, permissions: grants(`parent${i}`, 5) })),
});

const chain = (prefix: string, length: number): Role =>
  Array.from({ length }).reduce<Role>(
    (inner, _, i) => role({ name: `${prefix}${i}`, permissions: grants(`${prefix}${i}`, 1), inherits: [inner] }),
    role({ name: `${prefix}-base`, permissions: grants(`${prefix}-base`, 1) }),
  );

const deepChain = chain("deep", 999);

// Each level: a join inheriting a left and a right that both inherit the level below.
const diamonds = Array.from({ length: 10 }).reduce<Role>((below, _, i) => {
  const left = role({ name: `left${i}`, permissions: grants(`left${i}`, 1), inherits: [below] });
  const right = role({ name: `right${i}`, permissions: grants(`right${i}`, 1), inherits: [below] });
  return role({ name: `join${i}`, permissions: grants(`join${i}`, 1), inherits: [left, right] });
}, role({ name: "bottom", permissions: grants("bottom", 1) }));

// A ladder: role i inherits roles i-1 and i-2, so it is full of shared parents.
const ladder = (prefix: string, length: number): Role => {
  const rungs: Array<Role> = [];
  for (let i = 0; i < length; i += 1) {
    rungs.push(
      role({
        name: `${prefix}${i}`,
        permissions: grants(`${prefix}${i}`, 2),
        inherits: rungs.slice(Math.max(0, i - 2)).toReversed(),
      }),
    );
  }
  return rungs[rungs.length - 1] ?? role({ name: `${prefix}-empty` });
};

const rootOver = (name: string, shared: Role): Role =>
  role({ name, inherits: [role({ name: `${name}-own`, permissions: grants(`${name}-own`, 3) }), shared] });

const sharedCore = ladder("shared", 194);
const sharedRoots = ["a", "b", "c"].map((name) => rootOver(name, sharedCore));
const disjointRoots = ["a", "b", "c"].map((name) => rootOver(name, ladder(`${name}-rung`, 64)));

const options = { time: 1000, warmupTime: 300 };

test("flattenPermissions", async ({ bench }) => {
  await bench.compare(
    bench("single", () => flattenPermissions(single)),
    bench("wide — 50 parents", () => flattenPermissions(wide)),
    bench("deep chain — 1,000", () => flattenPermissions(deepChain)),
    bench("diamonds — 10 stacked", () => flattenPermissions(diamonds)),
    options,
  );
});

test("fromRoles", async ({ bench }) => {
  await bench.compare(
    bench("shared — 3 roots over one 200-role graph", () => fromRoles({ id: "u", roles: sharedRoots })),
    bench("disjoint — 3 roots over separate thirds", () => fromRoles({ id: "u", roles: disjointRoots })),
    options,
  );
});
