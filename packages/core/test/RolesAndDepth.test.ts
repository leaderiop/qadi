/**
 * The iterative-walker and deep-chain depth of `Role.ts`/`resolveRoleGraph`.
 * `Tokens.test.ts` covers the same two areas' basic behavior (a normal-depth
 * cycle's full `CircularRoleInheritance` payload, `AuthSubject` construction
 * from resolved roles) — this file is the deeper, iteration-and-depth-focused
 * sibling, matching the pattern `DecisionHistory.test.ts` documents against
 * `RelationshipResolver.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import {
  flattenPermissions,
  permissionProvenance,
  resolveRoleGraph,
  role,
  roleNames,
} from "../src/Role.ts";
import type { Role } from "../src/Role.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");
const publish = permission("doc", "publish");

describe("policyDepth", () => {
  it("every leaf tag is zero", () => {
    // One assertion per arm, so a leaf silently returning something else — the
    // shape a `Match` arm mutates into — cannot hide behind a sibling.
    const leaves: ReadonlyArray<P.Policy> = [
      P.hasPermission(read),
      P.hasRole("editor"),
      P.hasAttribute("x", M.gte(1)),
      P.hasResourceAttribute("y", M.gte(1)),
      P.hasRelationship("owner"),
      P.hasAction("read"),
      P.hasActed("approved", { scope: "Resource" }),
      P.hasNotActed("approved", { scope: "Resource" }),
      P.hasCustom("isOwner"),
      P.hasSignature("approved"),
    ];
    for (const leaf of leaves) {
      assert.strictEqual(P.policyDepth(leaf), 0, `${leaf._tag} should be depth 0`);
    }
  });

  it("each single-child wrapper adds exactly one", () => {
    const leaf = P.hasPermission(read);
    assert.strictEqual(P.policyDepth(P.not(leaf)), 1);
    assert.strictEqual(P.policyDepth(P.labeled("audit", leaf)), 1);
    assert.strictEqual(P.policyDepth(P.obliged(obligation("audit.log"), leaf)), 1);

    // Over a NON-leaf child, so `1 + d` and `1 - d` diverge. With a leaf child
    // both give 1, which is how an inverted operator survives a test that only
    // wraps leaves.
    const nested = P.not(leaf);
    assert.strictEqual(P.policyDepth(P.not(nested)), 2);
    assert.strictEqual(P.policyDepth(P.labeled("audit", nested)), 2);
    assert.strictEqual(P.policyDepth(P.obliged(obligation("audit.log"), nested)), 2);
  });

  it("a rule table counts its deepest condition", () => {
    assert.strictEqual(
      P.policyDepth(
        P.rules([
          { condition: P.hasPermission(read), effect: "Permit" },
          { condition: P.not(P.hasRole("editor")), effect: "Deny" },
        ]),
      ),
      2,
    );
    assert.strictEqual(P.policyDepth(P.rules([])), 0);
  });

  it("an empty composite is zero, because nothing is descended into", () => {
    assert.strictEqual(P.policyDepth(P.allOf([])), 0);
    assert.strictEqual(P.policyDepth(P.anyOf([])), 0);
  });

  it("nesting accumulates, and takes the deepest branch", () => {
    const shallow = P.hasPermission(read);
    const deep = P.not(P.not(P.hasRole("editor")));
    assert.strictEqual(P.policyDepth(P.allOf([shallow, deep])), 3);
  });

  it.effect("agrees with the evaluator's bound exactly, in both directions", () =>
    Effect.gen(function* () {
      // The property that makes this function worth having. A second walk that
      // miscounted by one would report a policy as safe that `evaluate` then
      // refuses, which is worse than not offering the answer.
      const policies = [
        P.hasPermission(read),
        P.not(P.hasPermission(read)),
        P.allOf([P.hasPermission(read), P.not(P.hasRole("editor"))]),
        P.anyOf([P.not(P.not(P.hasPermission(read)))]),
        P.rules([{ condition: P.not(P.hasPermission(read)), effect: "Permit" }], {
          combining: "DenyOverrides",
        }),
      ];

      for (const policy of policies) {
        const depth = P.policyDepth(policy);

        // At exactly the reported depth it evaluates.
        const atBound = yield* Effect.result(evaluate(policy, { maxDepth: depth }));
        assert.strictEqual(atBound._tag, "Success", `depth ${depth} should evaluate`);

        // One below, it must raise — otherwise the number is too large.
        if (depth > 0) {
          const below = yield* Effect.result(evaluate(policy, { maxDepth: depth - 1 }));
          assert.strictEqual(below._tag, "Failure", `depth ${depth - 1} should be too deep`);
        }
      }
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it("a wide tree (250k direct children) does not overflow the argument list", () => {
    // Regression for the `Math.max(...children.map(policyDepth))` spread:
    // spreading turns into one call argument per child, which throws a raw
    // `RangeError` well before 250k. `deepest` now walks with a plain loop,
    // so this must both return without throwing and report the right depth —
    // 1 above every (leaf, depth-0) child.
    const children: ReadonlyArray<P.Policy> = Array.from({ length: 250_000 }, () =>
      P.hasPermission(read),
    );
    const wide = P.anyOf(children);
    let depth: number | undefined;
    assert.doesNotThrow(() => {
      depth = P.policyDepth(wide);
    });
    assert.strictEqual(depth, 1);
  });

  it("a right-leaning spine counts its own length", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.integer({ min: 0, max: 30 }), (n) => {
        let policy: P.Policy = P.hasPermission(read);
        for (let i = 0; i < n; i += 1) policy = P.not(policy);
        return P.policyDepth(policy) === n;
      }),
      // Explicit seed, matching every other FastCheck-based property test in
      // this scope (Explanation.test.ts, Policy.test.ts, Predicate.test.ts,
      // Matcher.test.ts, Simplify.test.ts, Evaluate.test.ts): a CI failure
      // must replay byte-for-byte from a recorded seed, not only from
      // whatever FastCheck happened to print on that run's log.
      { seed: 1031 },
    );
  });
});

describe("permissionProvenance", () => {
  const viewer = role({ name: "viewer", permissions: [read] });
  const editor = role({ name: "editor", permissions: [write], inherits: [viewer] });
  const admin = role({ name: "admin", permissions: [publish], inherits: [editor] });

  it("names the granting role and the path to it", () => {
    const grants = permissionProvenance(admin);

    const inherited = grants.find((g) => g.permission === "doc:read");
    assert.isDefined(inherited);
    assert.strictEqual(inherited?.grantedBy, "viewer");
    assert.deepStrictEqual(inherited?.path, ["admin", "editor", "viewer"]);

    const own = grants.find((g) => g.permission === "doc:publish");
    assert.strictEqual(own?.grantedBy, "admin");
    // A single-element path is what "own, not inherited" looks like.
    assert.deepStrictEqual(own?.path, ["admin"]);
  });

  it("reports exactly the permissions flattenPermissions returns", () => {
    // The agreement that matters: a screen built on provenance cannot show a
    // different permission set from the one that decides.
    const flat = flattenPermissions(admin);
    const fromProvenance = new Set(permissionProvenance(admin).map((g) => g.permission));

    assert.deepStrictEqual([...fromProvenance].sort(), [...flat].sort());
  });

  it("walks a diamond once, as the flatten does", () => {
    const base = role({ name: "base", permissions: [read] });
    const left = role({ name: "left", inherits: [base] });
    const right = role({ name: "right", inherits: [base] });
    const top = role({ name: "top", inherits: [left, right] });

    const grants = permissionProvenance(top);
    assert.strictEqual(grants.filter((g) => g.permission === "doc:read").length, 1);
    // Depth-first, so the left route is the one reached first.
    assert.deepStrictEqual(grants[0]?.path, ["top", "left", "base"]);
  });

  it("a role granting nothing produces no grants", () => {
    assert.deepStrictEqual(permissionProvenance(role({ name: "empty" })), []);
  });
});

describe("two distinct Role objects sharing a name are not conflated", () => {
  // Before the fix, the visited set in `flattenPermissions`, `permissionProvenance`
  // and `roleNames` was keyed on `current.name`. Two distinct `Role` objects
  // named "viewer" reached from different branches would make the second one
  // look already-visited, and everything only it granted vanished silently.

  it("flattenPermissions keeps both same-named roles' permissions", () => {
    const viewerA = role({ name: "viewer", permissions: [read] });
    const viewerB = role({ name: "viewer", permissions: [write] });
    const left = role({ name: "left", inherits: [viewerA] });
    const right = role({ name: "right", inherits: [viewerB] });
    const top = role({ name: "top", inherits: [left, right] });

    const flat = flattenPermissions(top);
    assert.isTrue(flat.has("doc:read"));
    assert.isTrue(flat.has("doc:write"));
  });

  it("permissionProvenance reports grants from both same-named roles", () => {
    const viewerA = role({ name: "viewer", permissions: [read] });
    const viewerB = role({ name: "viewer", permissions: [write] });
    const left = role({ name: "left", inherits: [viewerA] });
    const right = role({ name: "right", inherits: [viewerB] });
    const top = role({ name: "top", inherits: [left, right] });

    const grants = permissionProvenance(top);
    assert.deepStrictEqual(
      grants.map((g) => g.permission).sort(),
      ["doc:read", "doc:write"],
    );
  });

  it("roleNames still walks the second same-named role's own parents", () => {
    const grandparent = role({ name: "superAdmin", permissions: [publish] });
    const viewerA = role({ name: "viewer" });
    // Distinct object, same name, but with a parent `viewerA` does not have.
    const viewerB = role({ name: "viewer", inherits: [grandparent] });
    const left = role({ name: "left", inherits: [viewerA] });
    const right = role({ name: "right", inherits: [viewerB] });
    const top = role({ name: "top", inherits: [left, right] });

    const names = roleNames(top);
    assert.isTrue(names.has("superAdmin"));
  });

  it("a true diamond — the same object reached twice — is still visited once", () => {
    // Regression guard for the identity-keyed rewrite: this must not become
    // exponential, and the shared parent's permission must not be double-added
    // in a way that would be visible (Set dedups values regardless, but the
    // traversal itself must still terminate and short-circuit on the second
    // visit).
    const base = role({ name: "base", permissions: [read] });
    const left = role({ name: "left", inherits: [base] });
    const right = role({ name: "right", inherits: [base] });
    const top = role({ name: "top", inherits: [left, right] });

    assert.deepStrictEqual([...flattenPermissions(top)], ["doc:read"]);
    assert.strictEqual(
      permissionProvenance(top).filter((g) => g.permission === "doc:read").length,
      1,
    );
    assert.deepStrictEqual([...roleNames(top)].sort(), ["base", "left", "right", "top"]);
  });
});

describe("the three walkers survive a very deep inheritance chain", () => {
  // Ticket 86: flattenPermissions, roleNames and permissionProvenance used to
  // recurse directly, one JS call frame per level of `inherits`. A chain this
  // deep overflowed the native stack (`RangeError: Maximum call stack size
  // exceeded`) well before Node's default limit. Built with a loop, not
  // recursion, so constructing the fixture itself does not hit the same limit.
  const DEPTH = 50_000;

  const buildChain = (depth: number): Role => {
    let current: Role = role({ name: "role-0", permissions: [read] });
    for (let i = 1; i < depth; i += 1) {
      current = role({ name: `role-${i}`, inherits: [current] });
    }
    return current;
  };

  it("flattenPermissions completes without a stack overflow", () => {
    const top = buildChain(DEPTH);
    const flat = flattenPermissions(top);
    assert.strictEqual(flat.size, 1);
    assert.isTrue(flat.has("doc:read"));
  });

  it("roleNames completes without a stack overflow", () => {
    const top = buildChain(DEPTH);
    const names = roleNames(top);
    assert.strictEqual(names.size, DEPTH);
    assert.isTrue(names.has("role-0"));
    assert.isTrue(names.has(`role-${DEPTH - 1}`));
  });

  it("permissionProvenance completes without a stack overflow", () => {
    const top = buildChain(DEPTH);
    const grants = permissionProvenance(top);
    assert.strictEqual(grants.length, 1);
    assert.strictEqual(grants[0]?.grantedBy, "role-0");
    // The path runs from the queried (top) role down to the granting one.
    assert.strictEqual(grants[0]?.path.length, DEPTH);
    assert.strictEqual(grants[0]?.path[0], `role-${DEPTH - 1}`);
    assert.strictEqual(grants[0]?.path[DEPTH - 1], "role-0");
  });
});

describe("resolveRoleGraph — an unknown parent is reported", () => {
  it.effect("calls onUnknownParent with the missing names, sorted and deduped", () =>
    Effect.gen(function* () {
      const seen: Array<ReadonlyArray<string>> = [];

      const roles = yield* resolveRoleGraph(
        [
          { name: "editor", permissions: [write], inherits: ["viewr", "ghost"] },
          { name: "admin", inherits: ["viewr"] },
        ],
        { onUnknownParent: (names) => seen.push(names) },
      );

      // Reported once per resolve, not once per occurrence: `viewr` is named by
      // two definitions and appears once.
      assert.strictEqual(seen.length, 1);
      assert.deepStrictEqual(seen[0], ["ghost", "viewr"]);

      // And the drop itself is unchanged — still lenient, still granting less
      // rather than failing closed.
      assert.strictEqual(roles.length, 2);
      assert.deepStrictEqual(roles[0]?.inherits, []);
    }));

  it.effect("says nothing when every parent resolves", () =>
    Effect.gen(function* () {
      let called = false;

      yield* resolveRoleGraph(
        [
          { name: "viewer", permissions: [read] },
          { name: "editor", inherits: ["viewer"] },
        ],
        { onUnknownParent: () => { called = true; } },
      );

      assert.isFalse(called);
    }));

  it.effect("with no callback, it warns — the default path most callers get", () =>
    Effect.gen(function* () {
      const logs: Array<{ message: unknown; annotations: unknown }> = [];

      yield* resolveRoleGraph([
        { name: "editor", permissions: [write], inherits: ["viewr"] },
      ]).pipe(
        Effect.provide(
          Logger.layer([
            Logger.make((options) => {
              logs.push({
                message: options.message,
                annotations: options.fiber.getRef(References.CurrentLogAnnotations),
              });
            }),
          ]),
        ),
      );

      assert.strictEqual(logs.length, 1);
      assert.include(String(logs[0]?.message), "parents that do not exist");
      assert.deepStrictEqual(logs[0]?.annotations, { "qadi.unknown_roles": "viewr" });
    }));

  it.effect("no unknown parents means no log at all", () =>
    Effect.gen(function* () {
      const logs: Array<unknown> = [];

      yield* resolveRoleGraph([
        { name: "viewer", permissions: [read] },
        { name: "editor", inherits: ["viewer"] },
      ]).pipe(
        Effect.provide(
          Logger.layer([Logger.make((options) => { logs.push(options.message); })]),
        ),
      );

      // Guards the outer `size > 0`: without it a clean catalogue would warn
      // about nothing on every resolve.
      assert.deepStrictEqual(logs, []);
    }));

  it.effect("still fails on a genuine cycle", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        resolveRoleGraph([
          { name: "a", inherits: ["b"] },
          { name: "b", inherits: ["a"] },
        ]),
      );

      assert.strictEqual(result._tag, "Failure");
    }));
});

describe("resolveRoleGraph — a duplicate definition name fails rather than shadowing", () => {
  it.effect("fails with DuplicateRoleDefinition instead of the last definition winning", () =>
    Effect.gen(function* () {
      // Before the fix, `byName` was a `Map` built from `definitions`: the
      // second "viewer" silently replaced the first, its `publish` permission
      // vanished, and nothing reported it.
      const result = yield* Effect.result(
        resolveRoleGraph([
          { name: "viewer", permissions: [read] },
          { name: "viewer", permissions: [publish] },
        ]),
      );

      assert.isTrue(Result.isFailure(result));
      if (!Result.isFailure(result)) return;
      const error = result.failure;
      assert.strictEqual(error._tag, "DuplicateRoleDefinition");
      if (error._tag !== "DuplicateRoleDefinition") return;
      assert.deepStrictEqual(error.names, ["viewer"]);
    }));

  it.effect("names every repeated name at once, sorted", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        resolveRoleGraph([
          { name: "zeta", permissions: [read] },
          { name: "alpha", permissions: [write] },
          { name: "zeta", permissions: [publish] },
          { name: "alpha", permissions: [read] },
        ]),
      );

      assert.isTrue(Result.isFailure(result));
      if (!Result.isFailure(result)) return;
      const error = result.failure;
      assert.strictEqual(error._tag, "DuplicateRoleDefinition");
      if (error._tag !== "DuplicateRoleDefinition") return;
      assert.deepStrictEqual(error.names, ["alpha", "zeta"]);
    }));

  it.effect("a catalogue with no repeated names is unaffected", () =>
    Effect.gen(function* () {
      const roles = yield* resolveRoleGraph([
        { name: "viewer", permissions: [read] },
        { name: "editor", permissions: [write], inherits: ["viewer"] },
      ]);

      assert.strictEqual(roles.length, 2);
    }));
});

describe("the policy a record carries can be measured", () => {
  it.effect("policyDepth of a decoded policy answers 'will this evaluate'", () =>
    Effect.gen(function* () {
      const nested = P.not(P.not(P.not(P.hasAttribute("x", M.gte(1)))));
      const json = yield* P.toJson(nested);
      const decoded = yield* P.fromJson(json);

      // The use this exists for: bounding untrusted decoded input before
      // evaluating it, rather than discovering the depth by being refused.
      assert.strictEqual(P.policyDepth(decoded), 3);
      assert.isTrue(P.policyDepth(decoded) <= P.DEFAULT_MAX_DEPTH);
    }));
});
