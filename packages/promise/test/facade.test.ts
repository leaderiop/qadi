import {
  AttributeResolver,
  AttributeResolverNone,
  AttributeResolveError,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  check as checkCore,
  currentSubjectLayer,
  decide as decideCore,
  hasAttribute,
  hasPermission,
  hasRole,
  gte,
  isAllowed,
  makeSubject,
  permission,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { afterEach, assert, describe, expect, it } from "vitest";
import { makeQadi } from "../src/index.ts";

const baseLayer = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
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
  while (disposers.length > 0) await disposers.pop()!();
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
    );
    const qadi = facade(broken);

    // Denied: an answer, so a value.
    await expect(qadi.check(alice, isAdmin)).resolves.toBe(false);
    // Broken: not an answer, so a rejection — NOT `false`.
    await expect(qadi.check(alice, hasAttribute("clearance", gte(1)))).rejects.toThrow();
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
    await expect(qadi.assert(alice, isAdmin)).rejects.toThrow();
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
      ),
    );

    await expect(qadi.check(alice, tenant)).resolves.toBe(false);
    await expect(withResolver.check(alice, tenant)).resolves.toBe(true);
    // `concurrency` is an ordinary option and passes straight through.
    await expect(
      withResolver.check(alice, tenant, { concurrency: "unbounded" }),
    ).resolves.toBe(true);
  });
});
