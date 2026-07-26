import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Tracer from "effect/Tracer";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { isAllowed } from "../src/Decision.ts";
import {
  DecisionHistory,
  DecisionHistoryUnknown,
  decisionHistoryFromEvents,
} from "../src/DecisionHistory.ts";
import {
  AttributeResolveError,
  DecisionHistoryUnavailable,
  RelationshipResolveError,
} from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
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

describe("the action dimension", () => {
  // A permission is a grant the subject holds; an action is a property of the
  // request. `doc:write` means "may write"; action "write" means "is writing".
  // Read-down/write-up rules need both, and ADR-QD-018 refuses to derive one
  // from the other.
  const anyone = subjectWith({ id: "u1" });

  it.effect("HasAction allows when the caller is performing it", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasAction("write"), { action: "write" });
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(anyone))));

  it.effect("HasAction denies a different action, naming both", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasAction("write"), { action: "read" });
      assert.isFalse(isAllowed(d));
      if (d._tag !== "Deny") return;
      assert.include(d.reason, "'read'");
      assert.include(d.reason, "'write'");
    }).pipe(Effect.provide(testLayer(anyone))));

  it.effect("holding the permission is not performing the action", () =>
    Effect.gen(function* () {
      // The whole point of the separation: a subject who may write is not
      // thereby writing. If these ever collapsed into one notion, this
      // evaluation would allow.
      const d = yield* evaluate(P.hasAction("write"), { action: "read" });
      assert.isFalse(isAllowed(d));
    }).pipe(
      Effect.provide(testLayer(subjectWith({ id: "u1", permissions: ["doc:write"] }))),
    ));

  it.effect("an absent action is an error, not a denial", () =>
    Effect.gen(function* () {
      // The MissingResource precedent. Reporting a forgotten argument as "not
      // authorized" sends an engineer to audit permissions — INV-QD-011.
      const r = yield* Effect.result(evaluate(P.hasAction("write")));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "qadi/MissingAction");
      if (r.failure._tag !== "qadi/MissingAction") return;
      assert.strictEqual(r.failure.expected, "write");
    }).pipe(Effect.provide(testLayer(anyone))));

  it.effect("a matcher may compare the action against subject data", () =>
    Effect.gen(function* () {
      // Bell-LaPadula in miniature: the verb decides which comparison runs.
      const policy = P.hasAttribute("allowedOps", M.contains("write"));
      const d = yield* evaluate(policy, { action: "write" });
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(testLayer(subjectWith({ id: "u1", attributes: { allowedOps: ["write"] } }))),
    ));

  it.effect("action() resolves inside a matcher", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("requiredOp", M.eq(M.action()));
      const d = yield* evaluate(policy, {
        resource: { requiredOp: "approve" },
        action: "approve",
      });
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(anyone))));

  it.effect("a matcher referencing action() without one fails rather than denying", () =>
    Effect.gen(function* () {
      // `evaluateMatcher` is total, so without the pre-check the reference
      // would resolve to undefined, compare false, and read as a denial.
      const policy = P.hasResourceAttribute("requiredOp", M.eq(M.action()));
      const r = yield* Effect.result(evaluate(policy, { resource: { requiredOp: "approve" } }));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "qadi/MissingAction");
      // Nothing was required, only compared, so there is no expected verb.
      if (r.failure._tag !== "qadi/MissingAction") return;
      assert.isUndefined(r.failure.expected);
    }).pipe(Effect.provide(testLayer(anyone))));

  it.effect("the same rule holds for a subject attribute matcher", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        evaluate(P.hasAttribute("op", M.eq(M.action()))),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "qadi/MissingAction");
    }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1", attributes: { op: "x" } })))));

  it.effect("the action reaches every depth of the tree", () =>
    Effect.gen(function* () {
      const policy = P.allOf([P.hasRole("editor"), P.not(P.hasAction("delete"))]);
      const d = yield* evaluate(policy, { action: "write" });
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] })))));

  it.effect("read-down and write-up are expressible in one stored policy", () =>
    Effect.gen(function* () {
      // The rule eight models were blocked on: the verb selects the comparison,
      // and both arms live in a single serializable tree.
      const readDown = P.allOf([
        P.hasAction("read"),
        P.hasResourceAttribute("level", M.lt(3)),
      ]);
      const writeUp = P.allOf([
        P.hasAction("write"),
        P.hasResourceAttribute("level", M.gte(3)),
      ]);
      const starProperty = P.anyOf([readDown, writeUp]);

      const restored = yield* Effect.flatMap(P.toJson(starProperty), P.fromJson);

      const reading = yield* evaluate(restored, { action: "read", resource: { level: 1 } });
      const writingUp = yield* evaluate(restored, { action: "write", resource: { level: 5 } });
      const writingDown = yield* evaluate(restored, { action: "write", resource: { level: 1 } });

      assert.isTrue(isAllowed(reading));
      assert.isTrue(isAllowed(writingUp));
      assert.isFalse(isAllowed(writingDown));
    }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1" })))));

  it.effect("an unevaluated action branch is still not consulted", () =>
    Effect.gen(function* () {
      // HasAction is cheap, but it sits in trees beside lookups that are not.
      const calls: Array<string> = [];
      const policy = P.anyOf([P.hasAction("read"), P.hasRelationship("owner")]);

      const d = yield* evaluate(policy, { action: "read", resource: { id: "doc-1" } }).pipe(
        Effect.provide(
          testLayer(subjectWith({ id: "u1" }), {
            relationships: Layer.succeed(RelationshipResolver, {
              check: (request) =>
                Effect.sync(() => {
                  calls.push(request.relation);
                  return true;
                }),
            }),
          }),
        ),
      );

      assert.isTrue(isAllowed(d));
      assert.deepStrictEqual(calls, []);
    }));
});

describe("decision history", () => {
  // The port is three-valued because a boolean cannot fail closed under
  // negation: whichever way an unwired default answers, it grants under one of
  // `hasActed`/`hasNotActed`. ADR-QD-020.
  const clerk = subjectWith({ id: "u1" });
  const invoice = { resource: { id: "inv-1" } };

  const raisedIt = decisionHistoryFromEvents([["u1", "raised", "inv-1"]]);

  it.effect("hasActed allows when the event is recorded", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasActed("raised"), invoice).pipe(
        Effect.provide(testLayer(clerk, { history: raisedIt })),
      );
      assert.isTrue(isAllowed(d));
    }));

  it.effect("hasNotActed denies when the event is recorded", () =>
    Effect.gen(function* () {
      // "approve this invoice, unless you raised it" — the whole of dynamic
      // separation of duty.
      const d = yield* evaluate(P.hasNotActed("raised"), invoice).pipe(
        Effect.provide(testLayer(clerk, { history: raisedIt })),
      );
      assert.isFalse(isAllowed(d));
    }));

  it.effect("hasNotActed allows when a closed store says it did not happen", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasNotActed("raised"), {
        resource: { id: "inv-2" },
      }).pipe(Effect.provide(testLayer(clerk, { history: raisedIt })));
      assert.isTrue(isAllowed(d));
    }));

  it.effect("BOTH polarities deny under an unwired port", () =>
    Effect.gen(function* () {
      // The trap the matrix recorded, and the reason for the third value. A
      // boolean default grants under one of these whichever way it answers.
      const acted = yield* evaluate(P.hasActed("raised"), invoice);
      const notActed = yield* evaluate(P.hasNotActed("raised"), invoice);
      assert.isFalse(isAllowed(acted));
      assert.isFalse(isAllowed(notActed));
      if (notActed._tag !== "Deny") return;
      assert.include(notActed.reason, "no history is available");
    }).pipe(Effect.provide(testLayer(clerk, { history: DecisionHistoryUnknown }))));

  it.effect("hasNotActed is NOT not(hasActed) — the difference is a grant", () =>
    Effect.gen(function* () {
      // The single most important assertion about this port. `not` inverts a
      // decision, so under an unwired port — where `hasActed` denies —
      // `not(hasActed(e))` ALLOWS. `hasNotActed` denies. Anyone "simplifying"
      // one into the other opens the door this enabler exists to close.
      const viaNot = yield* evaluate(P.not(P.hasActed("raised")), invoice);
      const viaVariant = yield* evaluate(P.hasNotActed("raised"), invoice);

      assert.isTrue(isAllowed(viaNot), "not(hasActed) allows under an unwired port");
      assert.isFalse(isAllowed(viaVariant), "hasNotActed denies under an unwired port");
    }).pipe(Effect.provide(testLayer(clerk))));

  it.effect("scope Any asks without a resource and needs none", () =>
    Effect.gen(function* () {
      const everRaised = decisionHistoryFromEvents([["u1", "raised", "inv-9"]]);
      const d = yield* evaluate(P.hasActed("raised", { scope: "Any" })).pipe(
        Effect.provide(testLayer(clerk, { history: everRaised })),
      );
      assert.isTrue(isAllowed(d));
    }));

  it.effect("scope Resource without resource.id is an error, not a denial", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(evaluate(P.hasActed("raised")));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "qadi/MissingResourceId");
    }).pipe(Effect.provide(testLayer(clerk, { history: raisedIt }))));

  it.effect("an unreachable store is an error, not a denial", () =>
    Effect.gen(function* () {
      // The strongest temptation in the library: for a separation-of-duty check
      // a denial *feels* safe. It makes an outage look like "you raised this".
      const failing = Layer.succeed(DecisionHistory, {
        hasActed: (query) =>
          Effect.fail(
            new DecisionHistoryUnavailable({ event: query.event, cause: "boom" }),
          ),
      });
      const r = yield* Effect.result(
        evaluate(P.hasNotActed("raised"), invoice).pipe(
          Effect.provide(testLayer(clerk, { history: failing })),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "qadi/DecisionHistoryUnavailable");
    }));

  it.effect("an unevaluated history branch performs no lookup", () =>
    Effect.gen(function* () {
      const calls: Array<string> = [];
      const recording = Layer.succeed(DecisionHistory, {
        hasActed: (query) =>
          Effect.sync(() => {
            calls.push(query.event);
            return "NotActed";
          }),
      });

      const policy = P.allOf([P.hasRole("nobody"), P.hasNotActed("raised")]);
      const d = yield* evaluate(policy, invoice).pipe(
        Effect.provide(testLayer(clerk, { history: recording })),
      );

      assert.isFalse(isAllowed(d));
      assert.deepStrictEqual(calls, []);
    }));

  it.effect("a history policy survives a round trip", () =>
    Effect.gen(function* () {
      const policy = P.hasNotActed("raised", { scope: "Any", fields: ["id"] });
      const restored = yield* Effect.flatMap(P.toJson(policy), P.fromJson);
      assert.deepStrictEqual(restored, policy);
    }));

  it.effect("Chinese Wall is expressible without a bespoke port", () =>
    Effect.gen(function* () {
      // Brewer-Nash from two questions the boolean-shaped port already answers.
      // 30 — Chinese Wall proposed an `Engagement` tagged union for this; it
      // turns out not to be needed.
      const withinWall = (conflictClass: string) =>
        P.anyOf([
          P.hasNotActed(conflictClass, { scope: "Any" }),
          P.hasActed(conflictClass, { scope: "Resource" }),
        ]);

      const engagedWithShell = decisionHistoryFromEvents([["u1", "oil", "shell"]]);
      const wall = withinWall("oil");
      const provide = Effect.provide(testLayer(clerk, { history: engagedWithShell }));

      // Same company: allowed. Competitor: refused.
      assert.isTrue(isAllowed(yield* evaluate(wall, { resource: { id: "shell" } }).pipe(provide)));
      assert.isFalse(isAllowed(yield* evaluate(wall, { resource: { id: "bp" } }).pipe(provide)));

      // An analyst with no engagement anywhere may take a free first access.
      const fresh = Effect.provide(
        testLayer(clerk, { history: decisionHistoryFromEvents([]) }),
      );
      assert.isTrue(isAllowed(yield* evaluate(wall, { resource: { id: "bp" } }).pipe(fresh)));
    }));

  it.effect("an unwired port seals every wall rather than opening it", () =>
    Effect.gen(function* () {
      // The failure `not(hasActed(...))` would have produced: with no store,
      // the first branch would allow and the analyst would reach every company.
      const withinWall = P.anyOf([
        P.hasNotActed("oil", { scope: "Any" }),
        P.hasActed("oil", { scope: "Resource" }),
      ]);
      const d = yield* evaluate(withinWall, { resource: { id: "bp" } });
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(clerk))));
});

describe("obligations", () => {
  // An obligation is a condition on permission, so a decision carries those
  // contributed by the allow it returned — ADR-QD-019. Every rule below follows
  // from that one sentence, including `Not`, which needs no rule.
  const logIt = obligation("log-access", { channel: "audit" });
  const notify = obligation("notify-dpo");
  const advice = obligation("prefer-redacted", {}, { advisory: true });

  const holder = subjectWith({ id: "u1", roles: ["auditor"], permissions: ["doc:read"] });

  it.effect("an allow carries the obligation attached to it", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.obliged(logIt, P.hasRole("auditor")));
      assert.isTrue(isAllowed(d));
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, [logIt]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("a denial carries none — it permits nothing, so it conditions nothing", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.obliged(logIt, P.hasRole("nobody")));
      assert.isFalse(isAllowed(d));
      // `Deny` has no obligations field at all. The trace node records none
      // either, because the inner policy never allowed.
      assert.deepStrictEqual(d.trace.obligations, []);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("an evaluation with no obligation reports an empty set, not undefined", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasRole("auditor"));
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, []);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("AllOf unions every child's obligations", () =>
    Effect.gen(function* () {
      const policy = P.allOf([
        P.obliged(logIt, P.hasRole("auditor")),
        P.obliged(notify, P.hasPermission(read)),
      ]);
      const d = yield* evaluate(policy);
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, [logIt, notify]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("the same obligation reached twice appears once", () =>
    Effect.gen(function* () {
      // Identity is the whole value, not the id — a diamond must not double a
      // duty. Two duties sharing an id with different attributes are two duties
      // and both survive; that is the next assertion.
      const policy = P.allOf([
        P.obliged(logIt, P.hasRole("auditor")),
        P.obliged(logIt, P.hasPermission(read)),
      ]);
      const d = yield* evaluate(policy);
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, [logIt]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("two duties sharing an id but not their attributes both survive", () =>
    Effect.gen(function* () {
      const toAudit = obligation("log", { channel: "audit" });
      const toSiem = obligation("log", { channel: "siem" });
      const policy = P.allOf([
        P.obliged(toAudit, P.hasRole("auditor")),
        P.obliged(toSiem, P.hasPermission(read)),
      ]);
      const d = yield* evaluate(policy);
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, [toAudit, toSiem]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("AllOf that denies carries none", () =>
    Effect.gen(function* () {
      const policy = P.allOf([
        P.obliged(logIt, P.hasRole("auditor")),
        P.hasRole("nobody"),
      ]);
      const d = yield* evaluate(policy);
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("AnyOf/First takes the winning branch's obligations only", () =>
    Effect.gen(function* () {
      // Order-dependent by design: collecting from every branch would force
      // exhaustive evaluation and repeal INV-QD-005 for any tree with a duty.
      const policy = P.anyOf([
        P.obliged(logIt, P.hasRole("auditor")),
        P.obliged(notify, P.hasPermission(read)),
      ]);
      const d = yield* evaluate(policy);
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, [logIt]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("AnyOf/Union takes every allowing branch's obligations", () =>
    Effect.gen(function* () {
      const policy = P.anyOf(
        [
          P.obliged(logIt, P.hasRole("auditor")),
          P.obliged(notify, P.hasPermission(read)),
          P.obliged(advice, P.hasRole("nobody")),
        ],
        { fieldStrategy: "Union" },
      );
      const d = yield* evaluate(policy);
      if (d._tag !== "Allow") return;
      // The third branch denied, so its duty never attached.
      assert.deepStrictEqual(d.obligations, [logIt, notify]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("Not carries no obligation in either direction", () =>
    Effect.gen(function* () {
      // The question three model documents called undecidable. It needs no rule:
      // the inner policy denied, so it contributed nothing to negate.
      const d = yield* evaluate(P.not(P.obliged(logIt, P.hasRole("nobody"))));
      assert.isTrue(isAllowed(d));
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, []);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("a negated obligation is discarded from the decision but kept in the trace", () =>
    Effect.gen(function* () {
      // This is what makes dropping defensible rather than silent. The reviewer
      // asking "was there a duty on that branch?" reads the trace.
      const d = yield* evaluate(P.not(P.obliged(logIt, P.hasRole("auditor"))));
      assert.isFalse(isAllowed(d));
      assert.deepStrictEqual(d.trace.obligations, []);
      assert.deepStrictEqual(d.trace.children[0]?.obligations, [logIt]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("Labeled passes its child's obligations through", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.labeled("audited", P.obliged(logIt, P.hasRole("auditor"))));
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, [logIt]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("Obliged passes its child's field visibility through", () =>
    Effect.gen(function* () {
      // A duty restricts nothing on its own; it must not silently widen or
      // narrow what the wrapped policy exposes.
      const d = yield* evaluate(
        P.obliged(logIt, P.hasPermission(read, { fields: ["title"] })),
      );
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.visibleFields, ["title"]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("an obligation survives a round trip through JSON", () =>
    Effect.gen(function* () {
      const policy = P.obliged(logIt, P.hasRole("auditor"));
      const restored = yield* Effect.flatMap(P.toJson(policy), P.fromJson);
      const d = yield* evaluate(restored);
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, [logIt]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("an unevaluated obliged branch performs no lookup", () =>
    Effect.gen(function* () {
      // Obligations must not quietly force exhaustive evaluation.
      const calls: Array<string> = [];
      const policy = P.anyOf([
        P.hasRole("auditor"),
        P.obliged(notify, P.hasRelationship("owner")),
      ]);

      const d = yield* evaluate(policy, { resource: { id: "doc-1" } }).pipe(
        Effect.provide(
          testLayer(holder, {
            relationships: Layer.succeed(RelationshipResolver, {
              check: (request) =>
                Effect.sync(() => {
                  calls.push(request.relation);
                  return true;
                }),
            }),
          }),
        ),
      );

      assert.isTrue(isAllowed(d));
      assert.deepStrictEqual(calls, []);
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, []);
    }));
});

describe("observability", () => {
  /**
   * Collects the spans an evaluation emits.
   *
   * `Tracer.Tracer` is a `Context.Reference`, so substituting it captures every
   * span without an exporter or a network. Until this existed, URS-QD-012 was
   * satisfied by inspection only: `evaluate` annotated a span and nothing
   * asserted that it did, which is exactly the kind of claim this project is
   * meant not to make.
   */
  const collectingTracer = (spans: Array<Tracer.Span>) =>
    Layer.succeed(
      Tracer.Tracer,
      Tracer.make({
        span: (options) => {
          const span = new Tracer.NativeSpan(options);
          spans.push(span);
          return span;
        },
      }),
    );

  const named = (spans: ReadonlyArray<Tracer.Span>, name: string) =>
    spans.find((s) => s.name === name);

  it.effect("an allow annotates qadi.evaluate with the whole decision", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasRole("editor")).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] }))),
        Effect.provide(collectingTracer(spans)),
      );

      const span = named(spans, "qadi.evaluate");
      assert.isDefined(span);
      if (span === undefined) return;
      // The identifier is deterministic because EvaluationId is a service —
      // ADR-QD-012. Under crypto.randomUUID this assertion could not exist.
      assert.deepStrictEqual(Object.fromEntries(span.attributes), {
        "qadi.decision": "Allow",
        "qadi.subject_id": "u1",
        "qadi.evaluation_id": "eval-1",
        "qadi.policy_tag": "HasRole",
      });
    }));

  it.effect("a denial is reported as Deny, not as an absent span", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasPermission(write)).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u2" }))),
        Effect.provide(collectingTracer(spans)),
      );

      const span = named(spans, "qadi.evaluate");
      assert.isDefined(span);
      if (span === undefined) return;
      assert.deepStrictEqual(Object.fromEntries(span.attributes), {
        "qadi.decision": "Deny",
        "qadi.subject_id": "u2",
        "qadi.evaluation_id": "eval-1",
        "qadi.policy_tag": "HasPermission",
      });
    }));

  it.effect("the action appears on the span only when one was supplied", () =>
    Effect.gen(function* () {
      // Two evaluations of the same policy differing only in what the caller
      // was doing were indistinguishable in a trace until this existed.
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasAction("write"), { action: "write" }).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1" }))),
        Effect.provide(collectingTracer(spans)),
      );

      const span = named(spans, "qadi.evaluate");
      assert.isDefined(span);
      if (span === undefined) return;
      assert.deepStrictEqual(Object.fromEntries(span.attributes), {
        "qadi.decision": "Allow",
        "qadi.subject_id": "u1",
        "qadi.evaluation_id": "eval-1",
        "qadi.policy_tag": "HasAction",
        "qadi.action": "write",
      });
    }));

  it.effect("an evaluation with no action carries no action attribute", () =>
    Effect.gen(function* () {
      // Absence must stay absent rather than becoming the string "undefined",
      // and every span predating the action dimension must be unchanged.
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasRole("editor")).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] }))),
        Effect.provide(collectingTracer(spans)),
      );

      const span = named(spans, "qadi.evaluate");
      assert.isDefined(span);
      if (span === undefined) return;
      assert.notProperty(Object.fromEntries(span.attributes), "qadi.action");
    }));

  it.effect("obligations are reported on the span, by id, only when present", () =>
    Effect.gen(function* () {
      // Reported, never run. The evaluator invoking an obligation would give
      // evaluation side effects and INV-QD-009 would be gone.
      const spans: Array<Tracer.Span> = [];

      const policy = P.allOf([
        P.obliged(obligation("log-access"), P.hasRole("auditor")),
        P.obliged(obligation("notify-dpo"), P.hasRole("auditor")),
      ]);

      yield* evaluate(policy).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["auditor"] }))),
        Effect.provide(collectingTracer(spans)),
      );

      const span = named(spans, "qadi.evaluate");
      assert.isDefined(span);
      if (span === undefined) return;
      assert.strictEqual(
        Object.fromEntries(span.attributes)["qadi.obligations"],
        "log-access,notify-dpo",
      );
    }));

  it.effect("an evaluation owing nothing carries no obligations attribute", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasRole("editor")).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] }))),
        Effect.provide(collectingTracer(spans)),
      );

      const span = named(spans, "qadi.evaluate");
      assert.isDefined(span);
      if (span === undefined) return;
      assert.notProperty(Object.fromEntries(span.attributes), "qadi.obligations");
    }));

  it.effect("combinators emit their own spans beneath the evaluation", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      const policy = P.allOf([P.hasRole("a"), P.anyOf([P.hasRole("b"), P.hasRole("c")])]);
      yield* evaluate(policy).pipe(
        Effect.provide(testLayer(subjectWith({ roles: ["a", "b"] }))),
        Effect.provide(collectingTracer(spans)),
      );

      // Named spans exist so a slow branch is attributable in a trace viewer,
      // not merely a slow evaluation overall.
      assert.isDefined(named(spans, "qadi.evaluate"));
      assert.isDefined(named(spans, "qadi.allOf"));
      assert.isDefined(named(spans, "qadi.anyOf"));
    }));

  it.effect("a failed evaluation still ends its span", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      // A missing resource.id is an error, not a denial — INV-QD-006. The span
      // must close regardless, or a failing dependency would leave traces open.
      yield* Effect.result(
        evaluate(P.hasRelationship("owner"), { resource: { name: "no id" } }).pipe(
          Effect.provide(testLayer(subjectWith({}))),
          Effect.provide(collectingTracer(spans)),
        ),
      );

      const span = named(spans, "qadi.evaluate");
      assert.isDefined(span);
      if (span === undefined) return;
      assert.notStrictEqual(span.status._tag, "Started");
    }));
});
