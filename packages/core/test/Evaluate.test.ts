import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { isAllowed } from "../src/Decision.ts";
import { AttributeResolveError, RelationshipResolveError } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import {
  RelationshipResolver,
  relationshipResolverFromEdges,
} from "../src/RelationshipResolver.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");

describe("leaf policies", () => {
  it.effect("HasPermission allows when the key is present", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasPermission(read));
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("HasPermission denies with a reason naming the key", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasPermission(write));
      assert.isFalse(isAllowed(d));
      if (d._tag !== "Deny") return;
      assert.include(d.reason, "doc:write");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasRole matches inherited role names", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasRole("editor"));
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["admin", "editor"] })))));

  it.effect("HasAttribute reads from the subject without a resolver", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasAttribute("level", M.gte(3)));
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ attributes: { level: 5 } })))));

  it.effect("HasResourceAttribute matches against the resource", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const d = yield* evaluate(policy, { resource: { state: "open" } });
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasResourceAttribute fails when no resource is in context", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const r = yield* Effect.result(evaluate(policy));
      assert.strictEqual(r._tag, "Failure");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasRelationship consults the resolver", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasRelationship("owner"), {
        resource: { id: "doc-1" },
      });
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(
        testLayer(subjectWith({ id: "u1" }), {
          relationships: relationshipResolverFromEdges([["u1", "owner", "doc-1"]]),
        }),
      ),
    ));

  it.effect("HasRelationship denies when the edge is absent", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasRelationship("owner"), {
        resource: { id: "doc-2" },
      });
      assert.isFalse(isAllowed(d));
    }).pipe(
      Effect.provide(
        testLayer(subjectWith({ id: "u1" }), {
          relationships: relationshipResolverFromEdges([["u1", "owner", "doc-1"]]),
        }),
      ),
    ));

  it.effect("HasRelationship fails without resource.id", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        evaluate(P.hasRelationship("owner"), { resource: { name: "x" } }),
      );
      assert.strictEqual(r._tag, "Failure");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("the default relationship resolver fails closed", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasRelationship("owner"), {
        resource: { id: "doc-1" },
      });
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({})))));
});

describe("composites", () => {
  const allow = P.hasRole("a");
  const denyP = P.hasRole("zzz");

  it.effect("AllOf denies if any child denies", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.allOf([allow, denyP]));
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("AnyOf allows if any child allows", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.anyOf([denyP, allow]));
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("AnyOf denies when every child denies", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.anyOf([denyP, P.hasRole("yyy")]));
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("Not inverts a denial into an allow", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.not(denyP));
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("Not inverts an allow into a denial", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.not(allow));
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("Labeled surfaces its label in the trace", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.labeled("four-eyes", allow));
      assert.strictEqual(d.trace.label, "four-eyes");
      assert.strictEqual(d.trace.policyTag, "Labeled");
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("rejects a tree deeper than maxDepth", () =>
    Effect.gen(function* () {
      let policy: P.Policy = P.hasRole("a");
      for (let i = 0; i < 10; i++) policy = P.not(policy);
      const r = yield* Effect.result(evaluate(policy, { maxDepth: 3 }));
      assert.strictEqual(r._tag, "Failure");
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));
});

describe("short-circuiting", () => {
  /** Counts resolver calls so we can prove unused branches cost nothing. */
  const countingResolver = (counter: { calls: number }) =>
    Layer.succeed(AttributeResolver, {
      resolve: (_id: string, attribute: string) =>
        Effect.sync(() => {
          counter.calls += 1;
          return attribute === "cheap" ? 10 : 0;
        }),
    });

  it.effect("AnyOf/First stops at the first allowing child", () =>
    Effect.gen(function* () {
      const counter = { calls: 0 };
      const policy = P.anyOf([
        P.hasRole("a"),
        P.hasAttribute("expensive", M.gte(1)),
        P.hasAttribute("alsoExpensive", M.gte(1)),
      ]);

      const d = yield* evaluate(policy).pipe(
        Effect.provide(
          testLayer(subjectWith({ roles: ["a"] }), {
            attributes: countingResolver(counter),
          }),
        ),
      );

      assert.isTrue(isAllowed(d));
      // The predecessor resolved every attribute in the tree up front, so this
      // would have been 2.
      assert.strictEqual(counter.calls, 0);
    }));

  it.effect("AllOf stops at the first denying child", () =>
    Effect.gen(function* () {
      const counter = { calls: 0 };
      const policy = P.allOf([P.hasRole("nope"), P.hasAttribute("expensive", M.gte(1))]);

      const d = yield* evaluate(policy).pipe(
        Effect.provide(
          testLayer(subjectWith({}), { attributes: countingResolver(counter) }),
        ),
      );

      assert.isFalse(isAllowed(d));
      assert.strictEqual(counter.calls, 0);
    }));

  it.effect("AnyOf/Union evaluates every child by design", () =>
    Effect.gen(function* () {
      const counter = { calls: 0 };
      const policy = P.anyOf(
        [P.hasAttribute("cheap", M.gte(1)), P.hasAttribute("other", M.gte(1))],
        { fieldStrategy: "Union" },
      );

      yield* evaluate(policy).pipe(
        Effect.provide(
          testLayer(subjectWith({}), { attributes: countingResolver(counter) }),
        ),
      );

      assert.strictEqual(counter.calls, 2);
    }));

  it.effect("attribute resolution errors propagate rather than denying", () =>
    Effect.gen(function* () {
      // A broken lookup must not be silently reported as "not authorized" —
      // that would mask an outage as a permissions problem.
      const failing = Layer.succeed(AttributeResolver, {
        resolve: (_id: string, attribute: string) =>
          Effect.fail(new AttributeResolveError({ attribute, cause: "boom" })),
      });

      const r = yield* Effect.result(
        evaluate(P.hasAttribute("x", M.exists())).pipe(
          Effect.provide(testLayer(subjectWith({}), { attributes: failing })),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
    }));

  /**
   * Records the queries a resolver was actually asked, so an unevaluated branch
   * can be shown to cost nothing — not merely to be absent from the decision.
   *
   * A relationship lookup is the expensive one: it is the branch most likely to
   * cross a network. Counting attribute calls proved the rule for the cheap
   * case only, which is why these mirror the tests above.
   */
  const recordingRelationships = (calls: Array<string>) =>
    Layer.succeed(RelationshipResolver, {
      check: (request) =>
        Effect.sync(() => {
          calls.push(`${request.subjectId} ${request.relation} ${request.resourceId}`);
          return request.relation === "owner";
        }),
    });

  const doc = { resource: { id: "doc-1" } };

  it.effect("AnyOf/First performs no relationship lookup once a child allows", () =>
    Effect.gen(function* () {
      const calls: Array<string> = [];
      const policy = P.anyOf([P.hasRole("a"), P.hasRelationship("owner")]);

      const d = yield* evaluate(policy, doc).pipe(
        Effect.provide(
          testLayer(subjectWith({ roles: ["a"] }), {
            relationships: recordingRelationships(calls),
          }),
        ),
      );

      assert.isTrue(isAllowed(d));
      assert.deepStrictEqual(calls, []);
    }));

  it.effect("AllOf performs no relationship lookup once a child denies", () =>
    Effect.gen(function* () {
      const calls: Array<string> = [];
      const policy = P.allOf([P.hasRole("nope"), P.hasRelationship("owner")]);

      const d = yield* evaluate(policy, doc).pipe(
        Effect.provide(
          testLayer(subjectWith({}), {
            relationships: recordingRelationships(calls),
          }),
        ),
      );

      assert.isFalse(isAllowed(d));
      assert.deepStrictEqual(calls, []);
    }));

  it.effect("AnyOf/Union performs every relationship lookup by design", () =>
    Effect.gen(function* () {
      const calls: Array<string> = [];
      const policy = P.anyOf(
        [P.hasRelationship("owner"), P.hasRelationship("editor")],
        { fieldStrategy: "Union" },
      );

      const d = yield* evaluate(policy, doc).pipe(
        Effect.provide(
          testLayer(subjectWith({}), {
            relationships: recordingRelationships(calls),
          }),
        ),
      );

      assert.isTrue(isAllowed(d));
      assert.deepStrictEqual(calls, ["u1 owner doc-1", "u1 editor doc-1"]);
    }));

  it.effect("relationship resolution errors propagate rather than denying", () =>
    Effect.gen(function* () {
      // Same rule as the attribute case: an unreachable relationship store is
      // an outage, not a decision that the subject lacks the relationship.
      const failing = Layer.succeed(RelationshipResolver, {
        check: (request) =>
          Effect.fail(
            new RelationshipResolveError({
              relation: request.relation,
              resourceId: request.resourceId,
              cause: "boom",
            }),
          ),
      });

      const r = yield* Effect.result(
        evaluate(P.hasRelationship("owner"), doc).pipe(
          Effect.provide(testLayer(subjectWith({}), { relationships: failing })),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
    }));
});

describe("field visibility", () => {
  it.effect("AllOf/Intersection keeps only fields every child allows", () =>
    Effect.gen(function* () {
      const policy = P.allOf([
        P.hasPermission(read, { fields: ["a", "b"] }),
        P.hasPermission(write, { fields: ["b", "c"] }),
      ]);
      const d = yield* evaluate(policy);
      assert.isTrue(isAllowed(d));
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.visibleFields, ["b"]);
    }).pipe(
      Effect.provide(testLayer(subjectWith({ permissions: ["doc:read", "doc:write"] }))),
    ));

  it.effect("AnyOf/Union merges the fields of all allowing children", () =>
    Effect.gen(function* () {
      const policy = P.anyOf(
        [
          P.hasPermission(read, { fields: ["title"] }),
          P.hasPermission(write, { fields: ["author"] }),
        ],
        { fieldStrategy: "Union" },
      );
      const d = yield* evaluate(policy);
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual([...(d.visibleFields ?? [])].sort(), ["author", "title"]);
    }).pipe(
      Effect.provide(testLayer(subjectWith({ permissions: ["doc:read", "doc:write"] }))),
    ));

  it.effect("an unrestricted child means all fields", () =>
    Effect.gen(function* () {
      const policy = P.allOf([
        P.hasPermission(read),
        P.hasPermission(write, { fields: ["b"] }),
      ]);
      const d = yield* evaluate(policy);
      if (d._tag !== "Allow") return;
      // undefined is the top of the lattice, so intersecting leaves ["b"].
      assert.deepStrictEqual(d.visibleFields, ["b"]);
    }).pipe(
      Effect.provide(testLayer(subjectWith({ permissions: ["doc:read", "doc:write"] }))),
    ));

  it.effect("AnyOf honours an explicit Intersection instead of downgrading", () =>
    Effect.gen(function* () {
      // The predecessor silently treated anything that was not "union" as
      // "first", so an explicit intersection was ignored.
      const policy = P.anyOf(
        [
          P.hasPermission(read, { fields: ["a", "b"] }),
          P.hasPermission(write, { fields: ["b", "c"] }),
        ],
        { fieldStrategy: "Intersection" },
      );
      const d = yield* evaluate(policy);
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.visibleFields, ["b"]);
    }).pipe(
      Effect.provide(testLayer(subjectWith({ permissions: ["doc:read", "doc:write"] }))),
    ));

  it.effect("Not carries no field visibility of its own", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.not(P.hasPermission(write, { fields: ["secret"] })));
      if (d._tag !== "Allow") return;
      assert.strictEqual(d.visibleFields, undefined);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));
});

describe("decision metadata", () => {
  it.effect("identifiers come from the service, so they are deterministic", () =>
    Effect.gen(function* () {
      const first = yield* evaluate(P.hasRole("a"));
      const second = yield* evaluate(P.hasRole("a"));
      assert.strictEqual(first.evaluationId, "eval-1");
      assert.strictEqual(second.evaluationId, "eval-2");
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("the decision carries the subject id and a duration", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasRole("a"));
      assert.strictEqual(d.subjectId, "u1");
      assert.isAtLeast(d.durationMillis, 0);
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("the trace records children of a composite", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.allOf([P.hasRole("a"), P.hasRole("b")]));
      assert.strictEqual(d.trace.children.length, 2);
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a", "b"] })))));
});

describe("subject identity references", () => {
  // "the resource's owner is me" is the archetypal relational rule, and until
  // now it was inexpressible: `subject("id")` reads the subject's *attributes*,
  // where `id` is normally absent, so the comparison silently denied.
  const ownsIt = P.hasResourceAttribute("owner", M.eq(M.subjectId()));

  it.effect("allows when the resource attribute equals the subject id", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(ownsIt, { resource: { owner: "u1" } });
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1" })))));

  it.effect("denies when the resource belongs to someone else", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(ownsIt, { resource: { owner: "u2" } });
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1" })))));

  it.effect("leaves subject(\"id\") meaning the attribute named id", () =>
    Effect.gen(function* () {
      // Adding a way in must not quietly change an existing meaning. A subject
      // carrying an `id` attribute distinct from its identity proves the two
      // references stay separate rather than one shadowing the other.
      const byAttribute = P.hasResourceAttribute("owner", M.eq(M.subject("id")));
      const d = yield* evaluate(byAttribute, { resource: { owner: "from-attribute" } });
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(
        testLayer(subjectWith({ id: "u1", attributes: { id: "from-attribute" } })),
      ),
    ));
});
