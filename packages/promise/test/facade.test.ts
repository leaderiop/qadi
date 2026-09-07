import {
  AccessDenied,
  AttributeResolver,
  AttributeResolverNone,
  AttributeResolveError,
  CustomPredicateNone,
  SignatureHistoryNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  assert as assertCore,
  check as checkCore,
  currentSubjectLayer,
  decide as decideCore,
  filter as filterCore,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasRole,
  gte,
  isAllowed,
  makeSubject,
  permission,
  relationshipResolverFromEdges,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import { afterEach, assert, describe, expect, it } from "vitest";
import { makeQadi } from "../src/index.ts";

/**
 * Runs a Promise expected to reject, and hands back what it rejected with —
 * rather than only *that* it rejected, which `.rejects.toThrow()` alone
 * cannot distinguish from any other throw.
 */
const rejection = async (p: Promise<unknown>): Promise<unknown> => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected the promise to reject, but it resolved");
};

const baseLayer = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);

const alice = makeSubject({ id: "u-1", roles: ["editor"], permissions: ["doc:read"] });
const bob = makeSubject({ id: "u-2" });

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

const disposers: Array<() => Promise<void>> = [];
const facade = (layer = baseLayer) => {
  const q = makeQadi(layer);
  disposers.push(q.dispose);
  return q;
};

afterEach(async () => {
  while (disposers.length > 0) {
    const dispose = disposers.pop();
    if (dispose !== undefined) await dispose();
  }
});

describe("makeQadi", () => {
  it("resolves true when permitted and false when denied", async () => {
    const qadi = facade();
    await expect(qadi.check(alice, canRead)).resolves.toBe(true);
    await expect(qadi.check(alice, isAdmin)).resolves.toBe(false);
  });

  it("A DENIAL RESOLVES; A FAILURE REJECTS", async () => {
    // INV-QD-006 crossing the boundary. Collapsing these — catching and returning
    // false — is what turns an attribute-store outage into a silent lockout.
    const broken = Layer.mergeAll(
      Layer.succeed(AttributeResolver, {
        resolve: () =>
          Effect.fail(new AttributeResolveError({ attribute: "clearance", cause: "down" })),
      }),
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
      CustomPredicateNone,
      SignatureHistoryNone,
    );
    const qadi = facade(broken);

    // Denied: an answer, so a value.
    await expect(qadi.check(alice, isAdmin)).resolves.toBe(false);
    // Broken: not an answer, so a rejection — NOT `false` — and typed as the
    // port failure that actually broke, not merely "some throw happened".
    const failure = await rejection(qadi.check(alice, hasAttribute("clearance", gte(1))));
    assert.instanceOf(failure, AttributeResolveError);
    if (failure instanceof AttributeResolveError) {
      // Not just "some Error subclass" — the caller needs the `_tag` to
      // `catchTag`/dispatch on, and nothing here asserted it before.
      assert.strictEqual(failure._tag, "AttributeResolveError");
      assert.strictEqual(failure.attribute, "clearance");
      assert.strictEqual(failure.cause, "down");
    }
  });

  it("decide carries the trace, the fields and the obligations", async () => {
    const qadi = facade();
    const decision = await qadi.decide(alice, canRead);

    assert.isTrue(isAllowed(decision));
    assert.strictEqual(decision.subjectId, "u-1");
    assert.strictEqual(decision.trace.policyTag, "HasPermission");
  });

  it("assert resolves when permitted and rejects when denied", async () => {
    // The one place a denial IS exceptional, because the caller said "proceed only
    // if permitted".
    const qadi = facade();
    await expect(qadi.assert(alice, canRead)).resolves.toBeUndefined();

    // BEH-QD-170: assert rejects with the *same* AccessDenied the Effect API
    // fails with — asserted by actually failing both and comparing, not by
    // trusting a doc comment's claim that they agree.
    const failure = await rejection(qadi.assert(alice, isAdmin));
    const coreResult = await Effect.runPromise(
      Effect.result(
        assertCore(isAdmin).pipe(
          Effect.provide(baseLayer),
          Effect.provide(currentSubjectLayer(alice)),
        ),
      ),
    );

    assert.instanceOf(failure, AccessDenied);
    if (failure instanceof AccessDenied) {
      assert.strictEqual(failure._tag, "AccessDenied");
    }
    assert.strictEqual(Result.isFailure(coreResult), true);
    if (Result.isFailure(coreResult)) {
      assert.deepStrictEqual(failure, coreResult.failure);
    }
  });

  it("exercises the relationship (hasRelationship) path, not just synchronous checks", async () => {
    // ADR-QD-004 / this file's own header: the predecessor's second evaluation
    // path left the asynchronous relationship API unreachable through the
    // facade, and nothing here noticed. `RelationshipResolverNever` is what
    // every other test in this file wires — it always denies, so it cannot
    // tell "the relationship path is unreachable" apart from "the relationship
    // path was reached and correctly denied". This wires an edge instead and
    // checks both outcomes: found, and not found.
    const owner = hasRelationship("owner");
    const withRelationships = Layer.mergeAll(
      AttributeResolverNone,
      relationshipResolverFromEdges([{ subjectId: "u-1", relation: "owner", resourceId: "doc-1" }]),
      DecisionHistoryUnknown,
      EvaluationIdLive,
      CustomPredicateNone,
      SignatureHistoryNone,
    );
    const qadi = facade(withRelationships);

    await expect(
      qadi.check(alice, owner, { resource: { id: "doc-1" } }),
    ).resolves.toBe(true);
    await expect(
      qadi.check(alice, owner, { resource: { id: "doc-2" } }),
    ).resolves.toBe(false);

    const decision = await qadi.decide(alice, owner, { resource: { id: "doc-1" } });
    assert.isTrue(isAllowed(decision));
    assert.strictEqual(decision.trace.policyTag, "HasRelationship");
  });

  it("filter keeps the admitted items in order", async () => {
    const qadi = facade();
    const owned = hasPermission(permission("doc", "read"));
    const items = [{ id: "a" }, { id: "b" }];

    assert.deepStrictEqual(await qadi.filter(alice, owned, items), items);
    assert.deepStrictEqual(await qadi.filter(bob, owned, items), []);
  });

  it("THE SUBJECT TRAVELS PER CALL, so one runtime serves many users", async () => {
    // `CurrentSubject` is excluded from the layer deliberately. A runtime holding one
    // subject would be a per-process subject — wrong for a server, a hazard in a
    // multi-tenant one.
    const qadi = facade();
    await expect(qadi.check(alice, canRead)).resolves.toBe(true);
    await expect(qadi.check(bob, canRead)).resolves.toBe(false);
    // And back again: no state carried between calls.
    await expect(qadi.check(alice, canRead)).resolves.toBe(true);
  });

  it("PROPERTY: the facade agrees with the core on every case", async () => {
    // The same shape of evidence a predicate needed: two ways to reach an answer, so
    // the agreement has to be runnable rather than argued. This is what makes "never
    // a second evaluator" checkable.
    const qadi = facade();
    const policies = [
      canRead,
      isAdmin,
      hasRole("editor"),
      hasPermission(permission("doc", "write")),
      hasAttribute("absent", gte(1)),
    ];

    for (const subject of [alice, bob]) {
      for (const policy of policies) {
        const viaCore = await Effect.runPromise(
          checkCore(policy).pipe(
            Effect.provide(baseLayer),
            Effect.provide(currentSubjectLayer(subject)),
          ),
        );
        const viaFacade = await qadi.check(subject, policy);
        assert.strictEqual(
          viaFacade,
          viaCore,
          `disagreed on ${policy._tag} for ${subject.id}`,
        );

        const decisionViaCore = await Effect.runPromise(
          decideCore(policy).pipe(
            Effect.provide(baseLayer),
            Effect.provide(currentSubjectLayer(subject)),
          ),
        );
        const decisionViaFacade = await qadi.decide(subject, policy);
        // The trace is compared too: the facade must not reshape the answer.
        assert.deepStrictEqual(decisionViaFacade.trace, decisionViaCore.trace);
      }
    }
  });

  it("dispose releases the runtime, and is the caller's to call", async () => {
    const qadi = makeQadi(baseLayer);
    await expect(qadi.check(alice, canRead)).resolves.toBe(true);
    await expect(qadi.dispose()).resolves.toBeUndefined();
  });

  it("options reach the core unchanged", async () => {
    const qadi = facade();
    const tenant = hasAttribute("clearance", gte(1));
    const withResolver = facade(
      Layer.mergeAll(
        Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(5) }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      ),
    );

    await expect(qadi.check(alice, tenant)).resolves.toBe(false);
    await expect(withResolver.check(alice, tenant)).resolves.toBe(true);
    // `concurrency` is an ordinary option and passes straight through.
    await expect(
      withResolver.check(alice, tenant, { concurrency: "unbounded" }),
    ).resolves.toBe(true);
  });

  it("filter forwards options, including concurrency, to core's filter unchanged", async () => {
    // BEH-QD-172 read literally: `filter` had no options parameter at all, so a
    // Promise consumer filtering many items had no escape hatch from sequential
    // resolution. Asserted against core directly, the same way the property test
    // above holds `check` and `decide` to core's own answer.
    const owned = hasPermission(permission("doc", "read"));
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

    const viaFacade = await facade().filter(alice, owned, items, {
      concurrency: "unbounded",
    });
    const viaCore = await Effect.runPromise(
      filterCore(owned, items, { concurrency: "unbounded" }).pipe(
        Effect.provide(baseLayer),
        Effect.provide(currentSubjectLayer(alice)),
      ),
    );

    assert.deepStrictEqual(viaFacade, items);
    assert.deepStrictEqual(viaFacade, viaCore);
  });
});
