import { assert, describe, it } from "@effect/vitest";
import { evaluate, hasAttribute, hasRelationship, isAllowed, gte, anyOf, hasRole } from "@guard/core";
import * as Effect from "effect/Effect";
import {
  administrator,
  edgeRelationshipResolver,
  failingAttributeResolver,
  guardTestLayer,
  nobody,
  policies,
  recordingAttributeResolver,
  subjectWith,
  viewer,
} from "../src/index.ts";

describe("fixtures", () => {
  it("the administrator inherits the whole role chain", () => {
    assert.deepStrictEqual([...administrator.roles].sort(), ["admin", "editor", "viewer"]);
    assert.deepStrictEqual([...administrator.permissions].sort(), [
      "doc:delete",
      "doc:read",
      "doc:write",
    ]);
  });

  it("the viewer holds only read", () => {
    assert.deepStrictEqual([...viewer.permissions], ["doc:read"]);
  });

  it("nobody holds nothing", () => {
    assert.strictEqual(nobody.permissions.size, 0);
  });
});

describe("guardTestLayer", () => {
  it.effect("wires a complete environment with deterministic ids", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(policies.canRead);
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.evaluationId, "eval-1");
    }).pipe(Effect.provide(guardTestLayer(administrator))));

  it.effect("honours a custom id prefix", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(policies.canRead);
      assert.strictEqual(d.evaluationId, "run-1");
    }).pipe(Effect.provide(guardTestLayer(administrator, { idPrefix: "run" }))));

  it.effect("defaults fail closed", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasRelationship("owner"), { resource: { id: "d" } });
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(guardTestLayer(nobody))));

  it.effect("resolves configured attributes", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasAttribute("tier", gte(3)));
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(guardTestLayer(nobody, { attributes: { tier: 5 } }))));

  it.effect("resolves configured relationships", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasRelationship("owner"), { resource: { id: "d1" } });
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(
        guardTestLayer(subjectWith({ id: "u1" }), {
          relationships: [["u1", "owner", "d1"]],
        }),
      ),
    ));
});

describe("recording resolvers", () => {
  it.effect("records which attributes were asked for", () =>
    Effect.gen(function* () {
      const resolver = recordingAttributeResolver({ tier: 5 });
      // anyOf/First short-circuits, so only the first attribute is fetched.
      const policy = anyOf([hasAttribute("tier", gte(1)), hasAttribute("other", gte(1))]);

      yield* evaluate(policy).pipe(
        Effect.provide(guardTestLayer(nobody, { attributeResolver: resolver.layer })),
      );

      assert.deepStrictEqual([...resolver.calls], ["tier"]);
    }));

  it.effect("records relationship queries", () =>
    Effect.gen(function* () {
      const resolver = edgeRelationshipResolver([["u1", "owner", "d1"]]);
      yield* evaluate(hasRelationship("owner"), { resource: { id: "d1" } }).pipe(
        Effect.provide(
          guardTestLayer(subjectWith({ id: "u1" }), {
            relationshipResolver: resolver.layer,
          }),
        ),
      );
      assert.deepStrictEqual([...resolver.calls], ["u1 owner d1"]);
    }));

  it.effect("failingAttributeResolver surfaces an error, not a denial", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        evaluate(hasAttribute("x", gte(1))).pipe(
          Effect.provide(
            guardTestLayer(nobody, { attributeResolver: failingAttributeResolver() }),
          ),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
    }));
});

describe("fixture policies", () => {
  it.effect("canReadAndWrite requires both", () =>
    Effect.gen(function* () {
      assert.isFalse(isAllowed(yield* evaluate(policies.canReadAndWrite)));
    }).pipe(Effect.provide(guardTestLayer(viewer))));

  it.effect("adminOrReader accepts either", () =>
    Effect.gen(function* () {
      assert.isTrue(isAllowed(yield* evaluate(policies.adminOrReader)));
    }).pipe(Effect.provide(guardTestLayer(viewer))));

  it.effect("isAdmin matches the inherited role name", () =>
    Effect.gen(function* () {
      assert.isTrue(isAllowed(yield* evaluate(policies.isAdmin)));
      assert.isFalse(isAllowed(yield* evaluate(hasRole("nope"))));
    }).pipe(Effect.provide(guardTestLayer(administrator))));

  it.effect("canWrite denies a viewer", () =>
    Effect.gen(function* () {
      assert.isFalse(isAllowed(yield* evaluate(policies.canWrite)));
    }).pipe(Effect.provide(guardTestLayer(viewer))));
});
