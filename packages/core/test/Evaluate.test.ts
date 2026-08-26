import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "effect/testing/FastCheck";
import * as TestClock from "effect/testing/TestClock";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Metric from "effect/Metric";
import * as References from "effect/References";
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
  SignatureHistoryUnavailable,
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
import { SignatureHistory, signatureHistoryFromSignatures } from "../src/SignatureHistory.ts";
import { isolatedMetrics, subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");

describe("leaf policies", () => {
  it.effect("HasPermission allows when the key is present, with an empty trace", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasPermission(read));
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasPermission");
      assert.deepStrictEqual(d.trace.children, []);
    }).pipe(Effect.provide(testLayer(subjectWith({ permissions: ["doc:read"] })))));

  it.effect("HasPermission denies with a reason naming the key, and an empty trace", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasPermission(write));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasPermission");
      assert.deepStrictEqual(d.trace.children, []);
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "subject lacks permission 'doc:write'");
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
      assert.strictEqual(d.trace.policyTag, "HasAttribute");
      assert.deepStrictEqual(d.trace.children, []);
    }).pipe(Effect.provide(testLayer(subjectWith({ attributes: { level: 5 } })))));

  it.effect("HasAttribute denies with a reason naming the attribute", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasAttribute("level", M.gte(3)));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasAttribute");
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "subject attribute 'level' did not match");
    }).pipe(Effect.provide(testLayer(subjectWith({ attributes: { level: 1 } })))));

  it.effect("AN ABSENT ATTRIBUTE SAYS SO, rather than 'did not match'", () =>
    Effect.gen(function* () {
      // "did not match" is *true* of an unresolved attribute — every matcher
      // fails `undefined` — so this was never a wrong answer, only a withheld
      // diagnosis. A misconfigured or unwired `AttributeResolver` produces this
      // case exclusively, and the two sentences are what tell them apart.
      const d = yield* evaluate(P.hasAttribute("level", M.gte(3)));
      assert.isFalse(isAllowed(d));
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "subject attribute 'level' has no value");
    }).pipe(Effect.provide(testLayer(subjectWith({ attributes: {} })))));

  it.effect("an absent resource attribute says so too", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const d = yield* evaluate(policy, { resource: { id: "doc-1" } });
      assert.isFalse(isAllowed(d));
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "resource attribute 'state' has no value");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("A PRESENT-BUT-UNDEFINED VALUE IS STILL 'has no value'", () =>
    Effect.gen(function* () {
      // `readAttribute` consults `Object.hasOwn` first, so this path reaches the
      // matcher without touching the resolver — and the sentence has to be true
      // of it too. "has no value" covers both readings; "is not set" would have
      // been a claim about the record's shape, which this is not.
      const d = yield* evaluate(P.hasAttribute("level", M.exists()));
      assert.isFalse(isAllowed(d));
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "subject attribute 'level' has no value");
    }).pipe(Effect.provide(testLayer(subjectWith({ attributes: { level: undefined } })))));

  it.effect("a matcher referencing action() allows once an action is supplied", () =>
    Effect.gen(function* () {
      // The positive half of `action === undefined && referencesAction(...)`:
      // supplying an action must actually let evaluation proceed to the match,
      // not merely avoid the MissingAction failure.
      const policy = P.hasAttribute("allowedOp", M.eq(M.action()));
      const d = yield* evaluate(policy, { action: "approve" });
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(testLayer(subjectWith({ attributes: { allowedOp: "approve" } }))),
    ));

  it.effect("HasResourceAttribute matches against the resource", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const d = yield* evaluate(policy, { resource: { state: "open" } });
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasResourceAttribute");
      assert.deepStrictEqual(d.trace.children, []);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasResourceAttribute denies with a reason naming the attribute", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const d = yield* evaluate(policy, { resource: { state: "closed" } });
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasResourceAttribute");
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "resource attribute 'state' did not match");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasResourceAttribute fails when no resource is in context", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const r = yield* Effect.result(evaluate(policy));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "MissingResource");
      if (r.failure._tag !== "MissingResource") return;
      assert.strictEqual(r.failure.attribute, "state");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasRelationship consults the resolver", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasRelationship("owner"), {
        resource: { id: "doc-1" },
      });
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasRelationship");
    }).pipe(
      Effect.provide(
        testLayer(subjectWith({ id: "u1" }), {
          relationships: relationshipResolverFromEdges([
            { subjectId: "u1", relation: "owner", resourceId: "doc-1" },
          ]),
        }),
      ),
    ));

  it.effect("HasRelationship denies when the edge is absent", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasRelationship("owner"), {
        resource: { id: "doc-2" },
      });
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasRelationship");
      if (d._tag !== "Deny") return;
      // A *wired* store looked and found nothing, so naming the missing edge is
      // correct here. The unwired case gets a different sentence — see below.
      assert.strictEqual(d.reason, "subject 'u1' has no 'owner' relation to 'doc-2'");
    }).pipe(
      Effect.provide(
        testLayer(subjectWith({ id: "u1" }), {
          relationships: relationshipResolverFromEdges([
            { subjectId: "u1", relation: "owner", resourceId: "doc-1" },
          ]),
        }),
      ),
    ));

  it.effect("AN UNWIRED RESOLVER NAMES ITSELF rather than the missing edge", () =>
    Effect.gen(function* () {
      // The defect this replaced: under `RelationshipResolverNever` the denial
      // read "subject 'u1' has no 'owner' relation to 'doc-1'" — a claim about
      // the contents of a graph nobody had connected, which sends a reader to
      // audit their edges instead of their wiring (INV-QD-029).
      const d = yield* evaluate(P.hasRelationship("owner"), {
        resource: { id: "doc-1" },
      });
      assert.isFalse(isAllowed(d));
      if (d._tag !== "Deny") return;
      assert.strictEqual(
        d.reason,
        "no relationship resolver is wired, so no 'owner' relation to 'doc-1' can be confirmed",
      );
      // Still a denial, not an error: an unwired port is a structural absence,
      // and INV-QD-007 has it fail closed rather than fail loud.
      assert.strictEqual(d.trace.policyTag, "HasRelationship");
      // `testLayer` defaults to RelationshipResolverNever, which is the point —
      // this is what a caller who wired nothing actually gets.
    }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1" })))));

  it.effect("HasRelationship fails without resource.id, naming the relation", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        evaluate(P.hasRelationship("owner"), { resource: { name: "x" } }),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "MissingResourceId");
      if (r.failure._tag !== "MissingResourceId") return;
      assert.strictEqual(r.failure.relation, "owner");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasRelationship fails when there is no resource at all", () =>
    Effect.gen(function* () {
      // `resource?.["id"]` (not `resource["id"]`): a policy with no resource in
      // context at all must fail typed, not throw on an unguarded index.
      const r = yield* Effect.result(evaluate(P.hasRelationship("owner")));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "MissingResourceId");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("the default relationship resolver fails closed", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasRelationship("owner"), {
        resource: { id: "doc-1" },
      });
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasSignature allows when a matching signature is on file", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasSignature("approved"), {
        resource: { id: "doc-1" },
      });
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasSignature");
    }).pipe(
      Effect.provide(
        testLayer(subjectWith({ id: "u1" }), {
          signatureHistory: signatureHistoryFromSignatures([
            { subjectId: "u1", resourceId: "doc-1", meaning: "approved" },
          ]),
        }),
      ),
    ));

  it.effect("HasSignature matches signerRole when specified, and denies when it doesn't", () =>
    Effect.gen(function* () {
      const layer = testLayer(subjectWith({ id: "u1" }), {
        signatureHistory: signatureHistoryFromSignatures([
          { subjectId: "u1", resourceId: "doc-1", meaning: "approved", signerRole: "manager" },
        ]),
      });

      const matches = yield* evaluate(
        P.hasSignature("approved", { signerRole: "manager" }),
        { resource: { id: "doc-1" } },
      ).pipe(Effect.provide(layer));
      assert.isTrue(isAllowed(matches));

      const wrongRole = yield* evaluate(
        P.hasSignature("approved", { signerRole: "director" }),
        { resource: { id: "doc-1" } },
      ).pipe(Effect.provide(layer));
      assert.isFalse(isAllowed(wrongRole));
    }));

  it.effect("HasSignature denies, naming the subject, when no signatures are on file at all", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasSignature("approved"), {
        resource: { id: "doc-1" },
      });
      assert.isFalse(isAllowed(d));
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "no signatures are on file for subject 'u1'");
    }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1" })))));

  it.effect(
    "HasSignature denies, naming the meaning, when signatures exist but none match",
    () =>
      Effect.gen(function* () {
        const d = yield* evaluate(P.hasSignature("approved"), {
          resource: { id: "doc-1" },
        });
        assert.isFalse(isAllowed(d));
        if (d._tag !== "Deny") return;
        assert.strictEqual(
          d.reason,
          "subject 'u1' has no signature matching meaning 'approved'",
        );
      }).pipe(
        Effect.provide(
          testLayer(subjectWith({ id: "u1" }), {
            signatureHistory: signatureHistoryFromSignatures([
              { subjectId: "u1", resourceId: "doc-1", meaning: "rejected" },
            ]),
          }),
        ),
      ),
  );

  it.effect("HasSignature scope: 'Any' matches a subject-global signature with no resource", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasSignature("approved", { scope: "Any" }));
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(
        testLayer(subjectWith({ id: "u1" }), {
          signatureHistory: signatureHistoryFromSignatures([
            { subjectId: "u1", meaning: "approved" },
          ]),
        }),
      ),
    ));

  it.effect("HasSignature fails without resource.id, naming the meaning", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        evaluate(P.hasSignature("approved"), { resource: { name: "x" } }),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "MissingResourceId");
      if (r.failure._tag !== "MissingResourceId") return;
      assert.strictEqual(r.failure.relation, "approved");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasSignature fails when there is no resource at all", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(evaluate(P.hasSignature("approved")));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "MissingResourceId");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("HasSignature propagates a wired-but-unreachable store as a typed failure", () =>
    Effect.gen(function* () {
      const failure = new SignatureHistoryUnavailable({
        subjectId: subjectWith({ id: "u1" }).id,
        resourceId: undefined,
        cause: "store offline",
      });
      const layer = Layer.succeed(SignatureHistory, {
        name: "broken",
        signaturesFor: () => Effect.fail(failure),
      });

      const r = yield* Effect.result(
        evaluate(P.hasSignature("approved"), { resource: { id: "doc-1" } }).pipe(
          Effect.provide(testLayer(subjectWith({ id: "u1" }), { signatureHistory: layer })),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "SignatureHistoryUnavailable");
    }));

  it.effect("the default signature history fails closed", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasSignature("approved"), {
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
      assert.strictEqual(d.trace.policyTag, "AllOf");
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("AllOf allows when every child allows", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.allOf([allow, P.hasRole("b")]));
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "AllOf");
      assert.strictEqual(d.trace.children.length, 2);
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a", "b"] })))));

  it.effect("AnyOf allows if any child allows", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.anyOf([denyP, allow]));
      assert.isTrue(isAllowed(d));
      // The winning child allowed under `First`, so this is `stepAnyOf`'s early
      // return, not `finishAnyOf`'s.
      assert.strictEqual(d.trace.policyTag, "AnyOf");
      assert.strictEqual(d.trace.children.length, 2);
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("AnyOf denies when every child denies, with the last child's reason", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.anyOf([denyP, P.hasRole("yyy")]));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "AnyOf");
      assert.strictEqual(d.trace.children.length, 2);
      if (d._tag !== "Deny") return;
      // The exact denial reason, not the generic "no alternative policy
      // allowed" fallback — that text is only for an AnyOf with NO children at
      // all (see the empty-AnyOf test below). A `?? -> &&` swap on the
      // fallback would replace this with the generic text even though the
      // last child's own reason is present.
      assert.strictEqual(d.reason, "subject lacks role 'yyy'");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("an AnyOf with no children denies with the generic fallback reason", () =>
    Effect.gen(function* () {
      // Here there is no child to supply a reason, so the fallback text is the
      // real behavior rather than a mutant swapping away a real one.
      const d = yield* evaluate(P.anyOf([]));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "AnyOf");
      assert.deepStrictEqual(d.trace.children, []);
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "no alternative policy allowed");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("Not inverts a denial into an allow, keeping the child in its trace", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.not(denyP));
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "Not");
      assert.strictEqual(d.trace.children.length, 1);
      assert.strictEqual(d.trace.children[0]?.policyTag, "HasRole");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("Not inverts an allow into a denial, keeping the child in its trace", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.not(allow));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "Not");
      assert.strictEqual(d.trace.children.length, 1);
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("Labeled surfaces its label in the trace, and keeps the child", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.labeled("four-eyes", allow));
      assert.strictEqual(d.trace.label, "four-eyes");
      assert.strictEqual(d.trace.policyTag, "Labeled");
      assert.strictEqual(d.trace.children.length, 1);
      assert.strictEqual(d.trace.children[0]?.policyTag, "HasRole");
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  it.effect("rejects a tree deeper than maxDepth, carrying the configured limit", () =>
    Effect.gen(function* () {
      let policy: P.Policy = P.hasRole("a");
      for (let i = 0; i < 10; i++) policy = P.not(policy);
      const r = yield* Effect.result(evaluate(policy, { maxDepth: 3 }));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "PolicyTooDeep");
      if (r.failure._tag !== "PolicyTooDeep") return;
      assert.strictEqual(r.failure.maxDepth, 3);
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));

  /**
   * `depth + 1` is threaded through every recursive call in `evaluateNode` —
   * `Not`, `Obliged`, `Labeled`, and both the sequential and concurrent paths of
   * `AllOf`/`AnyOf`/`Rules`. A mutant turning any one of those into `depth - 1`
   * makes recursion effectively unbounded through that combinator: not a
   * cosmetic gap but a stack-overflow/DoS exposure, so every combinator that
   * recurses gets its own exact-boundary check here rather than relying on the
   * `Not`-chain case above to stand in for all of them.
   */
  const depthLimitCombinators: ReadonlyArray<{
    readonly name: string;
    readonly wrap: (child: P.Policy) => P.Policy;
    readonly concurrency?: "unbounded";
  }> = [
    { name: "Not", wrap: P.not },
    { name: "Obliged", wrap: (child) => P.obliged(obligation("o"), child) },
    { name: "Labeled", wrap: (child) => P.labeled("l", child) },
    { name: "AllOf (sequential)", wrap: (child) => P.allOf([child]) },
    {
      name: "AllOf (concurrent)",
      wrap: (child) => P.allOf([child]),
      concurrency: "unbounded",
    },
    { name: "AnyOf (sequential)", wrap: (child) => P.anyOf([child]) },
    {
      name: "AnyOf (concurrent)",
      wrap: (child) => P.anyOf([child]),
      concurrency: "unbounded",
    },
    { name: "Rules (sequential)", wrap: (child) => P.rules([P.permitWhen(child)]) },
    {
      name: "Rules (concurrent)",
      wrap: (child) => P.rules([P.permitWhen(child)]),
      concurrency: "unbounded",
    },
  ];

  for (const { name, wrap, concurrency } of depthLimitCombinators) {
    it.effect(`${name} evaluates at exactly maxDepth and fails one level deeper`, () =>
      Effect.gen(function* () {
        // The check is success-vs-failure, not the resulting allow/deny — the
        // boundary is about depth counting, not about which polarity `Not`
        // leaves the leaf at.
        const nest = (levels: number): P.Policy => {
          let policy: P.Policy = P.hasRole("a");
          for (let i = 0; i < levels; i++) policy = wrap(policy);
          return policy;
        };
        const options = (maxDepth: number) => ({
          maxDepth,
          ...(concurrency === undefined ? {} : { concurrency }),
        });

        const atLimit = yield* Effect.result(evaluate(nest(2), options(2)));
        assert.strictEqual(atLimit._tag, "Success");

        const overLimit = yield* Effect.result(evaluate(nest(3), options(2)));
        assert.strictEqual(overLimit._tag, "Failure");
        if (overLimit._tag !== "Failure") return;
        assert.strictEqual(overLimit.failure._tag, "PolicyTooDeep");
        if (overLimit.failure._tag !== "PolicyTooDeep") return;
        assert.strictEqual(overLimit.failure.maxDepth, 2);
      }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a"] })))));
  }
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
          return request.relation === "owner" ? "Related" : "Unrelated";
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
      // `Union` cannot short-circuit on the first allowing child (unlike
      // `First`), so this exercises `finishAnyOf`'s allow branch rather than
      // `stepAnyOf`'s early return.
      assert.strictEqual(d.trace.policyTag, "AnyOf");
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

  it.effect("AllOf/Intersection merges path-shaped fields through mergeFields unchanged", () =>
    Effect.gen(function* () {
      // mergeFields dispatches on FieldStrategy alone, never on field-string
      // content — this pins that it needs no changes now that a field can be
      // a dot-path: a broader path-aware spec intersected with a narrower
      // one still yields the narrower one, through the real evaluator.
      const policy = P.allOf([
        P.hasPermission(read, { fields: ["contact.**"] }),
        P.hasPermission(write, { fields: ["contact.street"] }),
      ]);
      const d = yield* evaluate(policy);
      assert.isTrue(isAllowed(d));
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.visibleFields, ["contact.street"]);
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

  it.effect("durationMillis is the clock's actual elapsed time, not a sum", () =>
    Effect.gen(function* () {
      // The existing "at least 0" assertion above cannot distinguish
      // `end - startedAt` from `end + startedAt` when `TestClock` starts at 0:
      // `startedAt` is 0 either way, so `end - 0` and `end + 0` are the same
      // value — `+` survived exactly this way the first time this test was
      // written. Advancing the clock *before* `evaluate` runs, not just
      // during it, makes `startedAt` nonzero, so the two arithmetic mutants
      // genuinely diverge: `-` reads the 10ms actually elapsed during
      // resolution; `+` would read `startedAt` (1000) plus `end` (1010) = 2010.
      yield* TestClock.adjust("1 second");

      const slow = Layer.succeed(AttributeResolver, {
        resolve: () =>
          Effect.gen(function* () {
            yield* TestClock.adjust("10 millis");
            return 5;
          }),
      });

      const d = yield* evaluate(P.hasAttribute("x", M.gte(1))).pipe(
        Effect.provide(testLayer(subjectWith({}), { attributes: slow })),
      );

      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.durationMillis, 10);
    }));
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
      assert.strictEqual(d.trace.policyTag, "HasAction");
    }).pipe(Effect.provide(testLayer(anyone))));

  it.effect("HasAction denies a different action, naming both", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasAction("write"), { action: "read" });
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasAction");
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
      assert.strictEqual(r.failure._tag, "MissingAction");
      if (r.failure._tag !== "MissingAction") return;
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
      assert.strictEqual(r.failure._tag, "MissingAction");
      // Nothing was required, only compared, so there is no expected verb.
      if (r.failure._tag !== "MissingAction") return;
      assert.isUndefined(r.failure.expected);
    }).pipe(Effect.provide(testLayer(anyone))));

  it.effect("the same rule holds for a subject attribute matcher", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        evaluate(P.hasAttribute("op", M.eq(M.action()))),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "MissingAction");
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
                  return "Related";
                }),
            }),
          }),
        ),
      );

      assert.isTrue(isAllowed(d));
      assert.deepStrictEqual(calls, []);
    }));
});

describe("the label lattice", () => {
  // Bell-LaPadula as one stored policy: no read up, no write down. Before E1 and
  // E4 this took `n x 2^c` transcribed rungs whose ordering was itself a trap —
  // the permitted sets shrink as clearance rises, so descending rungs are right
  // for reads and wrong for writes.
  const label = (level: number, ...compartments: ReadonlyArray<string>) => ({
    level,
    compartments,
  });

  const blp = P.anyOf([
    P.allOf([
      P.hasAction("read"),
      P.hasAttribute("clearance", M.dominates(M.resource("label"))),
    ]),
    P.allOf([
      P.hasAction("write"),
      P.hasResourceAttribute("label", M.dominates(M.subject("clearance"))),
    ]),
  ]);

  const cleared = (l: ReturnType<typeof label>) =>
    subjectWith({ id: "u1", attributes: { clearance: l } });

  const decide = (
    subjectLabel: ReturnType<typeof label>,
    action: string,
    resourceLabel: ReturnType<typeof label>,
  ) =>
    evaluate(blp, { action, resource: { id: "doc", label: resourceLabel } }).pipe(
      Effect.provide(testLayer(cleared(subjectLabel))),
      Effect.map(isAllowed),
    );

  it.effect("reads down, refuses to read up", () =>
    Effect.gen(function* () {
      assert.isTrue(yield* decide(label(2), "read", label(1)));
      assert.isTrue(yield* decide(label(1), "read", label(1)));
      assert.isFalse(yield* decide(label(1), "read", label(2)));
    }));

  it.effect("writes up, refuses to write down", () =>
    Effect.gen(function* () {
      assert.isTrue(yield* decide(label(1), "write", label(2)));
      assert.isTrue(yield* decide(label(1), "write", label(1)));
      assert.isFalse(yield* decide(label(2), "write", label(1)));
    }));

  it.effect("refuses across incomparable compartments, where a scalar would allow", () =>
    Effect.gen(function* () {
      // Read as numbers both labels are 2 and each reads the other. This is the
      // case the enumeration approach gets WRONG, not merely approximately.
      const crypto = label(2, "CRYPTO");
      const bio = label(2, "BIO");
      assert.isFalse(yield* decide(crypto, "read", bio));
      assert.isFalse(yield* decide(bio, "read", crypto));
      assert.isFalse(yield* decide(crypto, "write", bio));
    }));

  it.effect("a broader clearance reads a narrower document at the same level", () =>
    Effect.gen(function* () {
      assert.isTrue(yield* decide(label(2, "CRYPTO", "BIO"), "read", label(2, "CRYPTO")));
      assert.isFalse(yield* decide(label(2, "CRYPTO"), "read", label(2, "CRYPTO", "BIO")));
    }));

  it.effect("the whole rule survives a round trip through JSON", () =>
    Effect.gen(function* () {
      const restored = yield* Effect.flatMap(P.toJson(blp), P.fromJson);
      assert.deepStrictEqual(restored, blp);

      const d = yield* evaluate(restored, {
        action: "read",
        resource: { id: "doc", label: label(1) },
      }).pipe(Effect.provide(testLayer(cleared(label(2)))));
      assert.isTrue(isAllowed(d));
    }));

  it.effect("a subject with no clearance is denied, not errored", () =>
    Effect.gen(function* () {
      // Resolved data, not a caller argument: an absent label denies the way an
      // absent attribute always has. ADR-QD-021 states why this differs from
      // MissingAction.
      const d = yield* evaluate(blp, {
        action: "read",
        resource: { id: "doc", label: label(0) },
      }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1" }))));
      assert.isFalse(isAllowed(d));
    }));

  it.effect("dominates without an action still fails rather than denying", () =>
    Effect.gen(function* () {
      // `referencesAction` has to know about the new matcher, or a policy
      // comparing against `action()` would deny instead of failing.
      const r = yield* Effect.result(
        evaluate(P.hasAttribute("clearance", M.dominates(M.action()))).pipe(
          Effect.provide(testLayer(cleared(label(1)))),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "MissingAction");
    }));
});

describe("the integrity lattice", () => {
  // Biba, which is the block above with both operands exchanged and nothing else
  // added. Reading is the interesting direction: strict Biba forbids reading DOWN,
  // which is the ordinary case rather than the exceptional one.
  const label = (level: number, ...compartments: ReadonlyArray<string>) => ({
    level,
    compartments,
  });

  const biba = P.anyOf([
    P.allOf([
      P.hasAction("read"),
      // The object dominates the subject, not the other way round.
      P.hasResourceAttribute("label", M.dominates(M.subject("integrity"))),
    ]),
    P.allOf([
      P.hasAction("write"),
      P.hasAttribute("integrity", M.dominates(M.resource("label"))),
    ]),
  ]);

  const decide = (
    subjectLabel: ReturnType<typeof label>,
    action: string,
    resourceLabel: ReturnType<typeof label>,
  ) =>
    evaluate(biba, { action, resource: { id: "artefact", label: resourceLabel } }).pipe(
      Effect.provide(
        testLayer(subjectWith({ id: "u1", attributes: { integrity: subjectLabel } })),
      ),
      Effect.map(isAllowed),
    );

  it.effect("the dual: the same two labels reverse both answers", () =>
    Effect.gen(function* () {
      // Bell-LaPadula above reads (2, 1) and refuses (1, 2). Biba does the
      // reverse, from one matcher. If either assertion here passed alongside the
      // corresponding one in the block above, the operands would not be exchanged.
      assert.isFalse(yield* decide(label(2), "read", label(1)));
      assert.isTrue(yield* decide(label(1), "read", label(2)));

      assert.isTrue(yield* decide(label(2), "write", label(1)));
      assert.isFalse(yield* decide(label(1), "write", label(2)));
    }));

  it.effect("dominance is reflexive, so acting at your own level is permitted", () =>
    Effect.gen(function* () {
      assert.isTrue(yield* decide(label(2), "read", label(2)));
      assert.isTrue(yield* decide(label(2), "write", label(2)));
    }));

  it.effect("incomparable compartments refuse a write a scalar would allow", () =>
    Effect.gen(function* () {
      assert.isFalse(yield* decide(label(3, "CRYPTO"), "write", label(2, "BIO")));
      assert.isTrue(yield* decide(label(3, "CRYPTO"), "write", label(2, "CRYPTO")));
    }));

  it.effect("the whole rule survives a round trip through JSON", () =>
    Effect.gen(function* () {
      const restored = yield* Effect.flatMap(P.toJson(biba), P.fromJson);
      assert.deepStrictEqual(restored, biba);

      const d = yield* evaluate(restored, {
        action: "read",
        resource: { id: "artefact", label: label(2) },
      }).pipe(
        Effect.provide(
          testLayer(subjectWith({ id: "u1", attributes: { integrity: label(1) } })),
        ),
      );
      assert.isTrue(isAllowed(d));
    }));

  // Low-water-mark Biba. MOD-QD-028 forecast this needed the decision history port
  // (E5); it does not. `hasActed` answers a membership question about one named
  // event and returns no value, and a water mark is a MINIMUM over everything read.
  // The aggregate is the caller's, resolved live, which is E4 alone.
  const lowWaterMark = P.allOf([
    P.hasAction("write"),
    P.hasAttribute("effectiveIntegrity", M.dominates(M.resource("label"))),
  ]);

  const resolvingMark = (calls: Array<string>, mark: ReturnType<typeof label>) =>
    Layer.succeed(AttributeResolver, {
      resolve: (_id: string, attribute: string) =>
        Effect.sync(() => {
          calls.push(attribute);
          return mark;
        }),
    });

  it.effect("a lowered mark refuses the write an intact one allows", () =>
    Effect.gen(function* () {
      const write = (mark: ReturnType<typeof label>) =>
        evaluate(lowWaterMark, {
          action: "write",
          resource: { id: "manifest", label: label(3) },
        }).pipe(
          Effect.provide(
            testLayer(subjectWith({ id: "u1", attributes: { integrity: label(3) } }), {
              attributes: resolvingMark([], mark),
            }),
          ),
          Effect.map(isAllowed),
        );

      assert.isTrue(yield* write(label(3)));
      assert.isFalse(yield* write(label(1)));
    }));

  it.effect("a static attribute shadows the mark, and the refusal becomes a grant", () =>
    Effect.gen(function* () {
      // BEH-QD-034 in its dangerous reading. `HasAttribute` reads the subject's
      // own attributes first and calls the resolver ONLY on a miss, so a caller
      // who maintains a water mark and also carries the attribute on the subject
      // gets the static value — and the resolver is never asked at all.
      //
      // BDD cannot express the second half: that the lookup does not happen is
      // invisible in a decision, and it is the half that proves WHY the grant
      // occurs rather than merely that it does.
      const shadowed: Array<string> = [];
      const granted = yield* evaluate(lowWaterMark, {
        action: "write",
        resource: { id: "manifest", label: label(3) },
      }).pipe(
        Effect.provide(
          testLayer(
            subjectWith({
              id: "u1",
              attributes: { integrity: label(3), effectiveIntegrity: label(3) },
            }),
            { attributes: resolvingMark(shadowed, label(1)) },
          ),
        ),
      );

      assert.isTrue(isAllowed(granted));
      assert.deepStrictEqual(shadowed, []);

      // Naming an attribute the subject does not carry is the whole of the fix.
      const consulted: Array<string> = [];
      const denied = yield* evaluate(lowWaterMark, {
        action: "write",
        resource: { id: "manifest", label: label(3) },
      }).pipe(
        Effect.provide(
          testLayer(subjectWith({ id: "u1", attributes: { integrity: label(3) } }), {
            attributes: resolvingMark(consulted, label(1)),
          }),
        ),
      );

      assert.isFalse(isAllowed(denied));
      assert.deepStrictEqual(consulted, ["effectiveIntegrity"]);
    }));
});

describe("decision history", () => {
  // The port is three-valued because a boolean cannot fail closed under
  // negation: whichever way an unwired default answers, it grants under one of
  // `hasActed`/`hasNotActed`. ADR-QD-020.
  const clerk = subjectWith({ id: "u1" });
  const invoice = { resource: { id: "inv-1" } };

  const raisedIt = decisionHistoryFromEvents([
    { subjectId: "u1", event: "raised", resourceId: "inv-1" },
  ]);

  it.effect("hasActed allows when the event is recorded", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasActed("raised"), invoice).pipe(
        Effect.provide(testLayer(clerk, { history: raisedIt })),
      );
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasActed");
    }));

  it.effect("hasActed denies with a reason naming the event, when it was not", () =>
    Effect.gen(function* () {
      // The "has not" half of the reason sentence — distinct from the
      // "no history is available" branch below, which fires only under an
      // unwired (`Unknown`-answering) port.
      const d = yield* evaluate(P.hasActed("approved"), invoice).pipe(
        Effect.provide(testLayer(clerk, { history: raisedIt })),
      );
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasActed");
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "subject 'u1' has not performed 'approved'");
    }));

  it.effect("hasNotActed denies when the event is recorded", () =>
    Effect.gen(function* () {
      // "approve this invoice, unless you raised it" — the whole of dynamic
      // separation of duty.
      const d = yield* evaluate(P.hasNotActed("raised"), invoice).pipe(
        Effect.provide(testLayer(clerk, { history: raisedIt })),
      );
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasNotActed");
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "subject 'u1' has already performed 'raised'");
    }));

  it.effect("hasNotActed allows when a closed store says it did not happen", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasNotActed("raised"), {
        resource: { id: "inv-2" },
      }).pipe(Effect.provide(testLayer(clerk, { history: raisedIt })));
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "HasNotActed");
    }));

  it.effect("BOTH polarities deny under an unwired port", () =>
    Effect.gen(function* () {
      // The trap the matrix recorded, and the reason for the third value. A
      // boolean default grants under one of these whichever way it answers.
      const acted = yield* evaluate(P.hasActed("raised"), invoice);
      const notActed = yield* evaluate(P.hasNotActed("raised"), invoice);
      assert.isFalse(isAllowed(acted));
      assert.isFalse(isAllowed(notActed));
      assert.strictEqual(acted.trace.policyTag, "HasActed");
      assert.strictEqual(notActed.trace.policyTag, "HasNotActed");
      if (acted._tag !== "Deny" || notActed._tag !== "Deny") return;
      // Exact text, and identical for both polarities — the mismatch is what
      // makes "Unknown" three-valued rather than boolean.
      assert.strictEqual(acted.reason, "no history is available for 'raised'");
      assert.strictEqual(notActed.reason, "no history is available for 'raised'");
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
      const everRaised = decisionHistoryFromEvents([
        { subjectId: "u1", event: "raised", resourceId: "inv-9" },
      ]);
      const d = yield* evaluate(P.hasActed("raised", { scope: "Any" })).pipe(
        Effect.provide(testLayer(clerk, { history: everRaised })),
      );
      assert.isTrue(isAllowed(d));
    }));

  it.effect("scope Any strips resourceId from the query even when a resource IS present", () =>
    Effect.gen(function* () {
      // The test above proves `scope: "Any"` needs no resource; this proves
      // the stronger claim — that it ignores one it's given. A request
      // carrying a resource but asking "Any" must still ask the port an
      // unscoped question, or "ever, at all" silently narrows to "at this
      // resource" the moment a caller happens to have one in context.
      const queries: Array<string | undefined> = [];
      const recording = Layer.succeed(DecisionHistory, {
        hasActed: (query) =>
          Effect.sync(() => {
            queries.push(query.resourceId);
            return "NotActed";
          }),
      });

      yield* evaluate(P.hasActed("raised", { scope: "Any" }), invoice).pipe(
        Effect.provide(testLayer(clerk, { history: recording })),
      );

      assert.deepStrictEqual(queries, [undefined]);
    }));

  it.effect("scope Resource without resource.id is an error, not a denial", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(evaluate(P.hasActed("raised")));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "MissingResourceId");
      if (r.failure._tag !== "MissingResourceId") return;
      assert.strictEqual(r.failure.relation, "raised");
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
      assert.strictEqual(r.failure._tag, "DecisionHistoryUnavailable");
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

      const engagedWithShell = decisionHistoryFromEvents([
        { subjectId: "u1", event: "oil", resourceId: "shell" },
      ]);
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

describe("separation of duty as a control", () => {
  // The dynamic half is the history port above. This is the other two forms
  // MOD-QD-024 names, and neither needs a construct of its own: they are
  // compositions of `allOf`, `not`, `labeled` and `subjectId()`.
  const sodRole = P.labeled("sod.role", P.hasRole("approve-payment"));
  const sodStatic = P.labeled(
    "sod.static",
    P.not(P.allOf([P.hasRole("raise-payment"), P.hasRole("approve-payment")])),
  );
  const notSelfRaised = P.not(P.hasResourceAttribute("raisedBy", M.eq(M.subjectId())));

  const fourEyes = P.allOf([sodRole, sodStatic, P.labeled("sod.object", notSelfRaised)]);

  const hardened = P.allOf([
    sodRole,
    sodStatic,
    P.labeled(
      "sod.object",
      P.allOf([P.hasResourceAttribute("raisedBy", M.exists()), notSelfRaised]),
    ),
  ]);

  const conflicted = subjectWith({
    id: "u-clerk",
    roles: ["raise-payment", "approve-payment"],
  });
  const approver = subjectWith({ id: "u-approver", roles: ["approve-payment"] });
  const raiser = subjectWith({ id: "u-raiser", roles: ["raise-payment"] });

  const raisedByOther = { resource: { id: "pay-1", raisedBy: "u-other" } };

  it.effect("a subject holding both conflicting roles is refused", () =>
    Effect.gen(function* () {
      // Detection, not prevention: the invalid grant already exists by the time
      // a subject reaches evaluation, and Qadi never saw it made.
      const d = yield* evaluate(fourEyes, raisedByOther);
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(conflicted))));

  it.effect("the refusal is attributable to the branch, and the reason is not", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(fourEyes, raisedByOther);
      assert.isFalse(isAllowed(d));
      if (d._tag !== "Deny") return;

      // A label never reaches the reason. `Labeled` copies its child's sentence
      // verbatim into a separate field, `Not` passes no label at all, and
      // `AllOf` propagates the child's — so this sentence names the negation and
      // never the branch it sat in.
      assert.strictEqual(d.reason, "negated policy allowed");
      assert.strictEqual(d.trace.children[1]?.label, "sod.static");

      // `AllOf` short-circuits, so the object branch was never evaluated. Its
      // absence from the trace is evidence in its own right.
      assert.strictEqual(d.trace.children.length, 2);
    }).pipe(Effect.provide(testLayer(conflicted))));

  it.effect("holding one role of the pair is not a conflict", () =>
    Effect.gen(function* () {
      // `not(allOf([a, b]))` allows whenever either is missing, which is what
      // mutual exclusion means. The raiser is refused by the role branch.
      const d = yield* evaluate(fourEyes, raisedByOther);
      assert.isFalse(isAllowed(d));
      if (d._tag !== "Deny") return;
      assert.include(d.reason, "approve-payment");
      assert.strictEqual(d.trace.children.length, 1);
    }).pipe(Effect.provide(testLayer(raiser))));

  it.effect("nobody approves what they raised", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(fourEyes, {
        resource: { id: "pay-2", raisedBy: "u-approver" },
      });
      assert.isFalse(isAllowed(d));
      assert.isTrue(
        isAllowed(yield* evaluate(fourEyes, { resource: { id: "pay-3", raisedBy: "x" } })),
      );
    }).pipe(Effect.provide(testLayer(approver))));

  it.effect("an absent raisedBy GRANTS self-approval, and exists() closes it", () =>
    Effect.gen(function* () {
      // The hazard, and the opposite of what MOD-QD-024 forecast. `eq` against
      // an absent field is false, so the negation allows — and a payment row
      // with no raiser recorded is what a data migration leaves behind.
      const unrecorded = { resource: { id: "pay-4" } };
      assert.isTrue(isAllowed(yield* evaluate(fourEyes, unrecorded)));
      assert.isFalse(isAllowed(yield* evaluate(hardened, unrecorded)));
    }).pipe(Effect.provide(testLayer(approver))));
});

describe("task-based access control", () => {
  // The consumable permission — "approve this invoice, once, while the step is
  // open". MOD-QD-033 called usage counting the whole of its E5 dependency; it
  // turned out to be one conjunct, and `scope` defaults to exactly the keyed
  // question it wanted.
  const approver = subjectWith({ id: "u-amina", roles: ["approver"] });
  const openStep = {
    resource: { id: "invoice-1041", state: "awaiting-approval", raisedBy: "u-clerk" },
  };

  const assigned = relationshipResolverFromEdges([
    { subjectId: "u-amina", relation: "assigned-task", resourceId: "invoice-1041" },
  ]);

  const canApprove = P.allOf([
    P.labeled("task.role", P.hasRole("approver")),
    P.labeled(
      "task.open",
      P.hasResourceAttribute("state", M.eq(M.literal("awaiting-approval"))),
    ),
    P.labeled(
      "task.not-raiser",
      P.allOf([
        P.hasResourceAttribute("raisedBy", M.exists()),
        P.not(P.hasResourceAttribute("raisedBy", M.eq(M.subjectId()))),
      ]),
    ),
    P.labeled("task.assigned", P.hasRelationship("assigned-task")),
    P.labeled("task.once", P.hasNotActed("approved")),
  ]);

  it.effect("a spent approval is refused, and nothing else changed", () =>
    Effect.gen(function* () {
      // The same policy, subject, resource and assignment. Only the recorded
      // event differs, which is the whole of "transient and consumable".
      const unspent = testLayer(approver, {
        relationships: assigned,
        history: decisionHistoryFromEvents([
          { subjectId: "u-amina", event: "approved", resourceId: "invoice-1040" },
        ]),
      });
      const spent = testLayer(approver, {
        relationships: assigned,
        history: decisionHistoryFromEvents([
          { subjectId: "u-amina", event: "approved", resourceId: "invoice-1041" },
        ]),
      });

      assert.isTrue(
        isAllowed(yield* evaluate(canApprove, openStep).pipe(Effect.provide(unspent))),
      );
      assert.isFalse(
        isAllowed(yield* evaluate(canApprove, openStep).pipe(Effect.provide(spent))),
      );
    }));

  it.effect("the role gate spares both the resolver and the port", () =>
    Effect.gen(function* () {
      // What the acceptance scenarios cannot assert: not merely that the later
      // branches are absent from the trace, but that neither dependency was
      // *called* (INV-QD-005). Two recording layers, one policy.
      const edges: Array<string> = [];
      const events: Array<string> = [];

      const recordingEdges = Layer.succeed(RelationshipResolver, {
        check: (request) =>
          Effect.sync(() => {
            edges.push(request.relation);
            return "Related";
          }),
      });
      const recordingEvents = Layer.succeed(DecisionHistory, {
        hasActed: (query) =>
          Effect.sync(() => {
            events.push(query.event);
            return "NotActed";
          }),
      });

      const d = yield* evaluate(canApprove, openStep).pipe(
        Effect.provide(
          testLayer(subjectWith({ id: "u-amina" }), {
            relationships: recordingEdges,
            history: recordingEvents,
          }),
        ),
      );

      assert.isFalse(isAllowed(d));
      assert.deepStrictEqual(edges, []);
      assert.deepStrictEqual(events, []);
    }));
});

describe("rule tables", () => {
  // `evaluateRules`'s two denial arms — "no rule applied" and "rules[N]
  // denied" — are covered elsewhere for their reason text (via the concurrent
  // evaluation tests' `rules[0] permitted`) but not for `trace.policyTag`,
  // which every other combinator gets a dedicated check for above.
  it.effect("denies with 'no rule applied' when no rule's condition holds", () =>
    Effect.gen(function* () {
      const policy = P.rules([P.permitWhen(P.hasRole("nobody"))]);
      const d = yield* evaluate(policy);
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "Rules");
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "no rule applied");
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("an empty rule table denies with 'no rule applied'", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.rules([]));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "Rules");
      assert.deepStrictEqual(d.trace.children, []);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("denies naming the deciding row under DenyOverrides", () =>
    Effect.gen(function* () {
      const policy = P.rules(
        [P.permitWhen(P.hasRole("editor")), P.denyWhen(P.hasRole("suspended"))],
        { combining: "DenyOverrides" },
      );
      const d = yield* evaluate(policy);
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "Rules");
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "rules[1] denied");
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["editor", "suspended"] })))));

  it.effect("allows naming the deciding row", () =>
    Effect.gen(function* () {
      const policy = P.rules([P.permitWhen(P.hasRole("editor"))]);
      const d = yield* evaluate(policy);
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "Rules");
      assert.strictEqual(d.trace.reason, "rules[0] permitted");
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["editor"] })))));
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
      assert.strictEqual(d.trace.policyTag, "Obliged");
      assert.strictEqual(d.trace.children.length, 1);
      assert.strictEqual(d.trace.children[0]?.policyTag, "HasRole");
      if (d._tag !== "Allow") return;
      assert.deepStrictEqual(d.obligations, [logIt]);
    }).pipe(Effect.provide(testLayer(holder))));

  it.effect("a denial carries none — it permits nothing, so it conditions nothing", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.obliged(logIt, P.hasRole("nobody")));
      assert.isFalse(isAllowed(d));
      assert.strictEqual(d.trace.policyTag, "Obliged");
      assert.strictEqual(d.trace.children.length, 1);
      // `Deny` has no obligations field at all. The trace node records none
      // either, because the inner policy never allowed.
      assert.deepStrictEqual(d.trace.obligations, []);
      // The exact denial reason must be the child's own — `child.reason ??
      // "the obliged policy denied"` — never the generic fallback, which only
      // applies when the child carries no reason at all (it always does).
      // A `?? -> &&` swap here would silently replace this with the fallback
      // text even though `child.reason` is present.
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "subject lacks role 'nobody'");
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
                  return "Related";
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

  /**
   * JOB 1's ledger — the port spans.
   *
   * The load-bearing one is the last: a span attribute goes to whatever backend
   * is wired, so what may appear in one is a disclosure decision rather than a
   * formatting one (INV-QD-044).
   */
  const attributes = (span: Tracer.Span | undefined): Record<string, unknown> =>
    span === undefined ? {} : Object.fromEntries(span.attributes);

  const resolverOf = (record: Readonly<Record<string, unknown>>) =>
    Layer.succeed(AttributeResolver, {
      name: "record",
      resolve: (_subjectId, attribute: string) => Effect.succeed(record[attribute]),
    });

  // E1.1 — the commonest branch. A subject hit asks no port, so it emits
  // nothing: the span and `portCallsTotal` agree about what happened.
  it.effect("an attribute the subject carries emits no span", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasAttribute("tier", M.gte(3))).pipe(
        Effect.provide(testLayer(subjectWith({ attributes: { tier: 5 } }))),
        Effect.provide(collectingTracer(spans)),
      );

      assert.isUndefined(named(spans, "qadi.attribute"));
    }));

  // E1.2 / E1.3
  it.effect("a resolved attribute names itself and says a value came back", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasAttribute("tier", M.gte(3))).pipe(
        Effect.provide(
          testLayer(subjectWith({ id: "u1" }), { attributes: resolverOf({ tier: 5 }) }),
        ),
        Effect.provide(collectingTracer(spans)),
      );

      assert.deepStrictEqual(attributes(named(spans, "qadi.attribute")), {
        "qadi.attribute": "tier",
        "qadi.subject_id": "u1",
        "qadi.resolved": true,
      });
    }));

  it.effect("an attribute the resolver does not have says so, without inventing one", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasAttribute("tier", M.gte(3))).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1" }), { attributes: resolverOf({}) })),
        Effect.provide(collectingTracer(spans)),
      );

      assert.strictEqual(attributes(named(spans, "qadi.attribute"))["qadi.resolved"], false);
    }));

  // E1.4 — the question is annotated before the call precisely so this holds.
  it.effect("a resolver that fails still leaves a span saying what it was asked", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* Effect.result(
        evaluate(P.hasAttribute("tier", M.gte(3))).pipe(
          Effect.provide(
            testLayer(subjectWith({ id: "u1" }), {
              attributes: Layer.succeed(AttributeResolver, {
                name: "broken",
                resolve: (_subjectId, attribute: string) =>
                  Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
              }),
            }),
          ),
          Effect.provide(collectingTracer(spans)),
        ),
      );

      const span = named(spans, "qadi.attribute");
      assert.isDefined(span);
      assert.deepStrictEqual(attributes(span), {
        "qadi.attribute": "tier",
        "qadi.subject_id": "u1",
      });
      // No answer to record, and the span must still close or a failing
      // dependency would leave traces open.
      assert.notStrictEqual(span?.status._tag, "Started");
    }));

  // E1.5 — INV-QD-005 is unchanged by any of this: a branch never reached
  // performs no lookup, and now emits no span either.
  it.effect("a short-circuited attribute branch emits no span", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(
        P.anyOf([P.hasRole("editor"), P.hasAttribute("tier", M.gte(3))]),
      ).pipe(
        Effect.provide(
          testLayer(subjectWith({ roles: ["editor"] }), { attributes: resolverOf({ tier: 5 }) }),
        ),
        Effect.provide(collectingTracer(spans)),
      );

      assert.isUndefined(named(spans, "qadi.attribute"));
    }));

  // E1.6 — an `Any`-scoped question asks about no resource even where the
  // request carries one, so the span says what was asked.
  it.effect("qadi.acted names the question, and omits a resource it did not ask about", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasActed("raised", { scope: "Any" }), {
        resource: { id: "doc-1" },
      }).pipe(
        Effect.provide(
          testLayer(subjectWith({ id: "u1" }), {
            history: decisionHistoryFromEvents([
              { subjectId: "u1", event: "raised", resourceId: "doc-9" },
            ]),
          }),
        ),
        Effect.provide(collectingTracer(spans)),
      );

      assert.deepStrictEqual(attributes(named(spans, "qadi.acted")), {
        "qadi.subject_id": "u1",
        "qadi.event": "raised",
        "qadi.scope": "Any",
        "qadi.answer": "Acted",
      });
    }));

  it.effect("a resource-scoped qadi.acted carries the resource it asked about", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasActed("raised"), { resource: { id: "doc-1" } }).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1" }))),
        Effect.provide(collectingTracer(spans)),
      );

      assert.deepStrictEqual(attributes(named(spans, "qadi.acted")), {
        "qadi.subject_id": "u1",
        "qadi.event": "raised",
        "qadi.scope": "Resource",
        "qadi.resource_id": "doc-1",
        // Unwired, so three-valued rather than a denial's boolean (ADR-QD-020).
        "qadi.answer": "Unknown",
      });
    }));

  /**
   * The other half of E1.6, and the case that makes annotating *before* the
   * guard cost something: `scoped` is true and there is no id to report, so the
   * key must still be absent. Writing `qadi.resource_id: undefined` would put a
   * field on the span whose value is the word nobody meant — the same failure
   * the decision log avoids by rendering an absent column blank.
   */
  it.effect("a resource-scoped qadi.acted with no resource id reports no resource", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* Effect.result(
        evaluate(P.hasActed("raised"), { resource: { name: "no id" } }).pipe(
          Effect.provide(testLayer(subjectWith({ id: "u1" }))),
          Effect.provide(collectingTracer(spans)),
        ),
      );

      const span = named(spans, "qadi.acted");
      assert.deepStrictEqual(attributes(span), {
        "qadi.subject_id": "u1",
        "qadi.event": "raised",
        "qadi.scope": "Resource",
      });
      assert.notStrictEqual(span?.status._tag, "Started");
    }));

  // E1.7
  it.effect("qadi.hasRelationship omits a depth the policy did not set", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasRelationship("owner"), { resource: { id: "doc-1" } }).pipe(
        Effect.provide(
          testLayer(subjectWith({ id: "u1" }), {
            relationships: relationshipResolverFromEdges([
              { subjectId: "u1", relation: "owner", resourceId: "doc-1" },
            ]),
          }),
        ),
        Effect.provide(collectingTracer(spans)),
      );

      assert.deepStrictEqual(attributes(named(spans, "qadi.hasRelationship")), {
        "qadi.subject_id": "u1",
        "qadi.relation": "owner",
        "qadi.resource_id": "doc-1",
        "qadi.answer": "Related",
      });
    }));

  it.effect("a depth the policy did set is carried", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* evaluate(P.hasRelationship("owner", { depth: 3 }), {
        resource: { id: "doc-1" },
      }).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1" }))),
        Effect.provide(collectingTracer(spans)),
      );

      assert.strictEqual(attributes(named(spans, "qadi.hasRelationship"))["qadi.depth"], 3);
    }));

  // E1.8 — a wiring error should still say what it wanted a resource id for.
  it.effect("a missing resource id leaves a span naming the relation", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* Effect.result(
        evaluate(P.hasRelationship("owner"), { resource: { name: "no id" } }).pipe(
          Effect.provide(testLayer(subjectWith({ id: "u1" }))),
          Effect.provide(collectingTracer(spans)),
        ),
      );

      const span = named(spans, "qadi.hasRelationship");
      assert.deepStrictEqual(attributes(span), {
        "qadi.subject_id": "u1",
        "qadi.relation": "owner",
      });
      assert.notStrictEqual(span?.status._tag, "Started");
    }));

  /**
   * E1.9 — the one that would be a defect rather than a shortfall.
   *
   * `hasActed` and `hasRelationship` answer with closed enums; an attribute
   * resolves to arbitrary data. A span attribute reaches whatever backend is
   * wired, so the value must not appear in one — asserted against **every**
   * span the evaluation emitted, not only the attribute's own, because the
   * question is where the value could leak rather than where it was meant to.
   */
  it.effect("a resolved attribute's value never reaches any span", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      const secret = "sentinel-8f21-do-not-disclose";

      yield* evaluate(P.hasAttribute("clearance", M.eq(M.literal(secret)))).pipe(
        Effect.provide(
          testLayer(subjectWith({ id: "u1" }), {
            attributes: resolverOf({ clearance: secret }),
          }),
        ),
        Effect.provide(collectingTracer(spans)),
      );

      const rendered = spans
        .flatMap((span) => [...span.attributes.values()])
        .map((value) => String(value))
        .join(" ");
      assert.notInclude(rendered, secret);
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

describe("qadi_decisions_total / qadi_denials_by_policy_tag_total", () => {
  const counterOf = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>, attributes: Record<string, string>) =>
    snapshots.find(
      (s): s is Extract<Metric.Metric.Snapshot, { type: "Counter" }> =>
        s.type === "Counter" &&
        s.id === "qadi_decisions_total" &&
        Object.entries(attributes).every(([k, v]) => s.attributes?.[k] === v),
    );

  const frequencyOf = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>, id: string) =>
    snapshots.find(
      (s): s is Extract<Metric.Metric.Snapshot, { type: "Frequency" }> => s.type === "Frequency" && s.id === id,
    );

  it.effect("tags an allow and a deny under separate outcome series", () =>
    Effect.gen(function* () {
      // Two allows, one deny — deliberately asymmetric. Equal counts (one of
      // each) would still read as "correct" even if `evaluate` attributed
      // outcomes to the wrong series entirely, as long as it did so
      // consistently; only different counts prove which series is which.
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* evaluate(P.hasRole("editor")).pipe(
            Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] }))),
          );
          yield* evaluate(P.hasRole("editor")).pipe(
            Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] }))),
          );
          yield* evaluate(P.hasPermission(write)).pipe(
            Effect.provide(testLayer(subjectWith({ id: "u2" }))),
          );
          return yield* Metric.snapshot;
        }),
      );

      const allow = counterOf(snapshots, { outcome: "allow" });
      const deny = counterOf(snapshots, { outcome: "deny" });
      assert.isDefined(allow);
      assert.isDefined(deny);
      assert.strictEqual(allow?.state.count, 2);
      assert.strictEqual(deny?.state.count, 1);
    }));

  it.effect("does not count a failed evaluation as either outcome", () =>
    Effect.gen(function* () {
      // A missing resource.id is an error, not a decision (INV-QD-006) — it
      // must not inflate either series.
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* Effect.result(
            evaluate(P.hasRelationship("owner"), { resource: { name: "no id" } }).pipe(
              Effect.provide(testLayer(subjectWith({}))),
            ),
          );
          return yield* Metric.snapshot;
        }),
      );

      assert.isUndefined(counterOf(snapshots, { outcome: "allow" }));
      assert.isUndefined(counterOf(snapshots, { outcome: "deny" }));
    }));

  it.effect("records the denying node's policy tag in the frequency", () =>
    Effect.gen(function* () {
      // Not the free-text reason: `evaluateActed`/`evaluateHasRelationship`
      // both build theirs from caller-supplied identifiers, which would make
      // a frequency keyed on the raw sentence grow one entry per distinct
      // (subject, resource) pair ever denied — see the doc comment on
      // `denialsByPolicyTagTotal` in `Evaluate.ts`.
      const snapshots = yield* isolatedMetrics(
        evaluate(P.hasPermission(write))
          .pipe(Effect.provide(testLayer(subjectWith({ id: "u2" }))))
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      const denials = frequencyOf(snapshots, "qadi_denials_by_policy_tag_total");
      assert.isDefined(denials);
      assert.strictEqual(denials?.state.occurrences.get("HasPermission"), 1);
    }));

  it.effect("an allow adds nothing to the denial frequency", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        evaluate(P.hasRole("editor"))
          .pipe(Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] }))))
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      assert.isUndefined(frequencyOf(snapshots, "qadi_denials_by_policy_tag_total"));
    }));
});

describe("qadi_evaluation_duration_millis", () => {
  const histogramOf = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>) =>
    snapshots.find(
      (s): s is Extract<Metric.Metric.Snapshot, { type: "Histogram" }> =>
        s.type === "Histogram" && s.id === "qadi_evaluation_duration_millis",
    );

  it.effect("records one observation per evaluate call, allow or deny alike", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* evaluate(P.hasRole("editor")).pipe(
            Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] }))),
          );
          yield* evaluate(P.hasPermission(write)).pipe(
            Effect.provide(testLayer(subjectWith({ id: "u2" }))),
          );
          return yield* Metric.snapshot;
        }),
      );

      const duration = histogramOf(snapshots);
      assert.isDefined(duration);
      assert.strictEqual(duration?.state.count, 2, "one allow and one deny both contribute a sample");
    }));

  it.effect("does not record a sample for a failed evaluation", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* Effect.result(
            evaluate(P.hasRelationship("owner"), { resource: { name: "no id" } }).pipe(
              Effect.provide(testLayer(subjectWith({}))),
            ),
          );
          return yield* Metric.snapshot;
        }),
      );

      assert.isUndefined(histogramOf(snapshots));
    }));
});

describe("qadi.evaluate Debug log on denial", () => {
  const collectingLogger = (
    logs: Array<{ readonly message: unknown; readonly annotations: Record<string, unknown> }>,
  ) =>
    Logger.layer([
      Logger.make((options) => {
        logs.push({
          message: options.message,
          annotations: options.fiber.getRef(References.CurrentLogAnnotations),
        });
      }),
    ]);

  it.effect("logs the policy tag, subject and reason", () =>
    Effect.gen(function* () {
      const logs: Array<{ readonly message: unknown; readonly annotations: Record<string, unknown> }> = [];

      yield* evaluate(P.hasPermission(write)).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u2" }))),
        Effect.provideService(References.MinimumLogLevel, "Debug"),
        Effect.provide(collectingLogger(logs)),
      );

      assert.strictEqual(logs.length, 1);
      // `Effect.log*` is variadic (`...message`), so a single-argument call
      // still arrives as a one-element array.
      assert.deepStrictEqual(logs[0]?.message, ["qadi: policy denied"]);
      assert.deepStrictEqual(logs[0]?.annotations, {
        "qadi.policy_tag": "HasPermission",
        "qadi.subject_id": "u2",
        "qadi.reason": "subject lacks permission 'doc:write'",
      });
    }));

  it.effect("an allow logs nothing", () =>
    Effect.gen(function* () {
      const logs: Array<{ readonly message: unknown; readonly annotations: Record<string, unknown> }> = [];

      yield* evaluate(P.hasRole("editor")).pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] }))),
        Effect.provideService(References.MinimumLogLevel, "Debug"),
        Effect.provide(collectingLogger(logs)),
      );

      assert.strictEqual(logs.length, 0);
    }));
});

describe("concurrent evaluation", () => {
  // ADR-QD-026: turning concurrency on changes which lookups happen and how long
  // they take. It must not change the decision or the trace.
  const label = (level: number, ...compartments: ReadonlyArray<string>) => ({
    level,
    compartments,
  });

  const subject = subjectWith({
    id: "u-1",
    roles: ["editor"],
    permissions: ["doc:read"],
    attributes: { seniority: 5, clearance: label(2, "CRYPTO") },
  });

  const resource = { id: "doc-1", ownerId: "u-1", tenantId: "t-1", label: label(1) };

  /** Counts every attribute and relationship lookup an evaluation performs. */
  const counting = (calls: Array<string>) => ({
    attributes: Layer.succeed(AttributeResolver, {
      resolve: (_id: string, attribute: string) =>
        Effect.sync(() => {
          calls.push(`attr:${attribute}`);
          return attribute === "riskScore" ? 10 : undefined;
        }),
    }),
    relationships: Layer.succeed(RelationshipResolver, {
      check: (request: { readonly relation: string }) =>
        Effect.sync(() => {
          calls.push(`rel:${request.relation}`);
          return request.relation === "owner" ? "Related" : "Unrelated";
        }),
    }),
  });

  const run = (policy: P.Policy, concurrency: number | "unbounded" | undefined) =>
    Effect.gen(function* () {
      const calls: Array<string> = [];
      const decision = yield* evaluate(policy, {
        resource,
        action: "read",
        ...(concurrency === undefined ? {} : { concurrency }),
      }).pipe(Effect.provide(testLayer(subject, counting(calls))));
      return { decision, calls };
    });

  it.effect("the decision and the whole trace are identical either way", () =>
    Effect.gen(function* () {
      // A tree with a denying branch mid-way, so short-circuiting is observable:
      // sequential stops at `hasRole("legal")`, concurrent evaluates past it and
      // must then discard what it learned.
      const policy = P.allOf([
        P.hasPermission(permission("doc", "read")),
        P.hasRole("legal"),
        P.hasRelationship("owner"),
        P.hasAttribute("riskScore", M.gte(1)),
      ]);

      const sequential = yield* run(policy, undefined);
      const concurrent = yield* run(policy, "unbounded");

      assert.isFalse(isAllowed(sequential.decision));
      assert.isFalse(isAllowed(concurrent.decision));
      // Deep equality over the trace, which includes `children` — the shape a
      // reviewer reads and the thing a naive implementation would change.
      assert.deepStrictEqual(concurrent.decision.trace, sequential.decision.trace);
      assert.strictEqual(concurrent.decision.trace.children.length, 2);
    }));

  it.effect("concurrency performs MORE lookups, or it is doing nothing", () =>
    Effect.gen(function* () {
      // The equality test above would pass if `concurrency` were ignored
      // entirely. This is the half that proves it is not.
      const policy = P.allOf([
        P.hasRole("legal"),
        P.hasRelationship("owner"),
        P.hasAttribute("riskScore", M.gte(1)),
      ]);

      const sequential = yield* run(policy, undefined);
      const concurrent = yield* run(policy, "unbounded");

      // `hasRole` denies from the subject in hand, so sequential asks nothing.
      assert.deepStrictEqual(sequential.calls, []);
      assert.deepStrictEqual(concurrent.calls.toSorted(), ["attr:riskScore", "rel:owner"]);
      assert.deepStrictEqual(concurrent.decision.trace, sequential.decision.trace);
    }));

  it.effect("AnyOf: concurrency performs MORE lookups, or it is doing nothing", () =>
    Effect.gen(function* () {
      // Mirrors the AllOf test above, but AnyOf short-circuits on the first
      // ALLOWING child rather than the first denying one: `hasRole` allows
      // from the subject already in hand, so sequential evaluation never asks
      // the relationship/attribute resolvers at all. Concurrency evaluates
      // every child before folding — under `First` the fold still settles on
      // the same winning child and trace (`beginAnyOf`/`stepAnyOf`'s own
      // header comment), so only `calls` should differ, not the decision.
      const policy = P.anyOf([
        P.hasRole("editor"),
        P.hasRelationship("owner"),
        P.hasAttribute("riskScore", M.gte(1)),
      ]);

      const sequential = yield* run(policy, undefined);
      const concurrent = yield* run(policy, "unbounded");

      assert.isTrue(isAllowed(sequential.decision));
      assert.isTrue(isAllowed(concurrent.decision));
      assert.deepStrictEqual(sequential.calls, []);
      assert.deepStrictEqual(concurrent.calls.toSorted(), ["attr:riskScore", "rel:owner"]);
      assert.deepStrictEqual(concurrent.decision.trace, sequential.decision.trace);
    }));

  it.effect("Rules: concurrency performs MORE lookups, or it is doing nothing", () =>
    Effect.gen(function* () {
      // Same shape again for `Rules` under the default `FirstApplicable`
      // combining: the walk stops at the first rule whose condition applies
      // at all, so a `hasRole` row the subject already satisfies means
      // sequential evaluation never reaches the later rows' resolvers.
      const policy = P.rules([
        P.permitWhen(P.hasRole("editor")),
        P.permitWhen(P.hasRelationship("owner")),
        P.permitWhen(P.hasAttribute("riskScore", M.gte(1))),
      ]);

      const sequential = yield* run(policy, undefined);
      const concurrent = yield* run(policy, "unbounded");

      assert.isTrue(isAllowed(sequential.decision));
      assert.isTrue(isAllowed(concurrent.decision));
      assert.deepStrictEqual(sequential.calls, []);
      assert.deepStrictEqual(concurrent.calls.toSorted(), ["attr:riskScore", "rel:owner"]);
      assert.deepStrictEqual(concurrent.decision.trace, sequential.decision.trace);
    }));

  it.effect("an allowing anyOf under First keeps the first branch's fields", () =>
    Effect.gen(function* () {
      // The interaction the roadmap named: under `First` the order of allowing
      // children decides the field set, so concurrency must fold by declaration
      // order rather than by which fiber finished first.
      const policy = P.anyOf([
        P.hasRelationship("owner", { fields: ["id", "title"] }),
        P.hasPermission(permission("doc", "read"), { fields: ["id", "title", "body"] }),
      ]);

      const sequential = yield* run(policy, undefined);
      const concurrent = yield* run(policy, "unbounded");

      assert.strictEqual(sequential.decision._tag, "Allow");
      assert.strictEqual(concurrent.decision._tag, "Allow");
      if (sequential.decision._tag !== "Allow" || concurrent.decision._tag !== "Allow") return;
      assert.deepStrictEqual(sequential.decision.visibleFields, ["id", "title"]);
      assert.deepStrictEqual(concurrent.decision.visibleFields, ["id", "title"]);
      assert.deepStrictEqual(concurrent.decision.trace, sequential.decision.trace);
    }));

  it.effect("the deciding rule is selected by index, not by arrival", () =>
    Effect.gen(function* () {
      // E3's constraint. Under DenyOverrides the verdict is order-independent but
      // the DECIDING ROW is not, and it supplies the field set and obligations.
      const audited = obligation("audit.log");
      const policy = P.rules(
        [
          P.permitWhen(P.hasRelationship("owner")),
          P.permitWhen(P.obliged(audited, P.hasRole("editor"))),
          P.denyWhen(P.hasRole("suspended")),
        ],
        { combining: "DenyOverrides" },
      );

      const sequential = yield* run(policy, undefined);
      const concurrent = yield* run(policy, "unbounded");

      assert.isTrue(isAllowed(sequential.decision));
      assert.strictEqual(sequential.decision.trace.reason, "rules[0] permitted");
      assert.strictEqual(concurrent.decision.trace.reason, "rules[0] permitted");
      // Row 0 carries no duty; row 1 does. Selecting by arrival could pick row 1
      // and the decision would owe an obligation the sequential run does not.
      assert.strictEqual(concurrent.decision._tag, "Allow");
      if (concurrent.decision._tag !== "Allow") return;
      assert.deepStrictEqual(concurrent.decision.obligations, []);
      assert.deepStrictEqual(concurrent.decision.trace, sequential.decision.trace);
    }));

  it.effect("a nested tree agrees at every depth", () =>
    Effect.gen(function* () {
      const policy = P.allOf([
        P.anyOf([P.hasRole("nobody"), P.hasRelationship("owner")]),
        P.anyOf(
          [P.hasAttribute("riskScore", M.gte(1)), P.hasPermission(permission("doc", "read"))],
          { fieldStrategy: "Union" },
        ),
        P.not(P.hasRole("suspended")),
      ]);

      const sequential = yield* run(policy, undefined);
      const concurrent = yield* run(policy, 2);

      assert.isTrue(isAllowed(sequential.decision));
      assert.deepStrictEqual(concurrent.decision.trace, sequential.decision.trace);
    }));

  it.effect("an error in any branch still fails rather than denying", () =>
    Effect.gen(function* () {
      // INV-QD-006 under concurrency: a resolver failure is an error, and it must
      // not be swallowed into a denial just because a sibling denied first.
      const policy = P.allOf([
        P.hasRole("legal"),
        P.hasAttribute("boom", M.gte(1)),
      ]);

      const failing = Layer.succeed(AttributeResolver, {
        resolve: () => Effect.fail(new AttributeResolveError({ attribute: "boom", cause: "down" })),
      });

      const r = yield* Effect.result(
        evaluate(policy, { resource, concurrency: "unbounded" }).pipe(
          Effect.provide(testLayer(subject, { attributes: failing })),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
    }));

  it.effect("PROPERTY: both paths agree on every generated tree", () =>
    Effect.gen(function* () {
      // The same shape of evidence INV-QD-018 needed for predicates: two ways of
      // producing one answer, compared rather than argued about. Here the two are
      // not two interpreters but two schedules over one interpreter, so agreement
      // is a claim about the fold rather than about the semantics.
      const leaf: FastCheck.Arbitrary<P.Policy> = FastCheck.oneof(
        FastCheck.constantFrom("editor", "legal", "suspended").map((r) => P.hasRole(r)),
        FastCheck.constant(P.hasPermission(permission("doc", "read"))),
        FastCheck.constant(P.hasPermission(permission("doc", "delete"))),
        FastCheck.constantFrom("owner", "viewer").map((r) => P.hasRelationship(r)),
        FastCheck.constantFrom("riskScore", "seniority", "absent").map((a) =>
          P.hasAttribute(a, M.gte(1)),
        ),
        FastCheck.constant(P.hasResourceAttribute("ownerId", M.eq(M.subjectId()))),
      );

      const strategies = FastCheck.constantFrom(
        "First" as const,
        "Union" as const,
        "Intersection" as const,
      );

      const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec((tie) => ({
        node: FastCheck.oneof(
          { maxDepth: 3, withCrossShrink: true },
          leaf,
          FastCheck.tuple(
            FastCheck.array(tie("node") as FastCheck.Arbitrary<P.Policy>, { maxLength: 3 }),
            strategies,
          ).map(([ps, fieldStrategy]) => P.allOf(ps, { fieldStrategy })),
          FastCheck.tuple(
            FastCheck.array(tie("node") as FastCheck.Arbitrary<P.Policy>, { maxLength: 3 }),
            strategies,
          ).map(([ps, fieldStrategy]) => P.anyOf(ps, { fieldStrategy })),
          (tie("node") as FastCheck.Arbitrary<P.Policy>).map(P.not),
          FastCheck.tuple(
            FastCheck.array(
              FastCheck.tuple(
                tie("node") as FastCheck.Arbitrary<P.Policy>,
                FastCheck.boolean(),
              ).map(([c, permits]) => (permits ? P.permitWhen(c) : P.denyWhen(c))),
              { maxLength: 3 },
            ),
            FastCheck.constantFrom(
              "FirstApplicable" as const,
              "DenyOverrides" as const,
              "PermitOverrides" as const,
            ),
          ).map(([rs, combining]) => P.rules(rs, { combining })),
        ),
      })).node;

      let composites = 0;
      for (const policy of FastCheck.sample(tree, { numRuns: 150, seed: 1026 })) {
        const sequential = yield* run(policy, undefined);
        const concurrent = yield* run(policy, "unbounded");
        const bounded = yield* run(policy, 2);

        assert.deepStrictEqual(
          concurrent.decision.trace,
          sequential.decision.trace,
          `unbounded disagreed on ${JSON.stringify(policy)}`,
        );
        assert.deepStrictEqual(
          bounded.decision.trace,
          sequential.decision.trace,
          `bounded disagreed on ${JSON.stringify(policy)}`,
        );
        if (concurrent.calls.length > sequential.calls.length) composites += 1;
      }

      // Vacuity guard, the lesson INV-QD-018 cost: if no generated tree ever had
      // a branch the sequential path skipped, every assertion above would hold
      // for a `concurrency` option that did nothing at all.
      assert.isAbove(composites, 10);
    }));
});
