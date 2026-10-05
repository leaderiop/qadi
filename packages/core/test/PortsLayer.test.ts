/**
 * The environment functions over the port registry (`Ports.ts`): the default
 * environment, per-slot overrides, the build-once decorator, and the visitor
 * order every other derivation relies on.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import {
  AttributeResolver,
  attributeResolverFromRecord,
  attributeResolverPort,
} from "../src/AttributeResolver.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { CustomPredicate } from "../src/CustomPredicate.ts";
import { DecisionHistory } from "../src/DecisionHistory.ts";
import { EvaluationId } from "../src/EvaluationId.ts";
import { EvaluationServicesNone } from "../src/EvaluationServicesNone.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import { PortReply } from "../src/PortDescription.ts";
import { nonePort } from "../src/PortDerivation.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import {
  PORTS,
  decoratePorts,
  forEveryPort,
  mapPorts,
  mergePorts,
  portsLayer,
} from "../src/Ports.ts";
import type { PortServices } from "../src/Ports.ts";
import { RelationshipResolver } from "../src/RelationshipResolver.ts";
import { SignatureHistory } from "../src/SignatureHistory.ts";

const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
const aliceId = makeSubjectId("alice");
const doc = makeResourceId("doc-1");

/** Every port's name and its answer to one representative request. */
const askEveryPort = Effect.gen(function* () {
  const attribute = yield* AttributeResolver;
  const history = yield* DecisionHistory;
  const relationship = yield* RelationshipResolver;
  const custom = yield* CustomPredicate;
  const signatures = yield* SignatureHistory;
  return {
    names: [attribute.name, history.name, relationship.name, custom.name, signatures.name],
    answers: [
      yield* attribute.resolve(aliceId, "level"),
      yield* history.hasActed({ subjectId: aliceId, event: "approved", resourceId: undefined }),
      yield* relationship.check({
        subjectId: aliceId,
        relation: "owner",
        resourceId: doc,
        depth: undefined,
      }),
      yield* custom.evaluate("isOwner", alice, undefined, undefined),
      yield* signatures.signaturesFor({ subjectId: aliceId, resourceId: doc }),
    ],
  };
});

describe("portsLayer", () => {
  it.effect("puts every port at its fail-closed default", () =>
    Effect.gen(function* () {
      const { names, answers } = yield* askEveryPort.pipe(Effect.provide(portsLayer()));
      assert.deepStrictEqual(names, [
        "AttributeResolverNone",
        "DecisionHistoryUnknown",
        "RelationshipResolverNever",
        "CustomPredicateNone",
        "SignatureHistoryNone",
      ]);
      assert.deepStrictEqual(answers, [undefined, "Unknown", "Unknown", false, []]);
    }));

  it.effect("an override replaces exactly its own slot", () =>
    Effect.gen(function* () {
      const { names, answers } = yield* askEveryPort.pipe(
        Effect.provide(portsLayer({ AttributeResolver: attributeResolverFromRecord({ level: 3 }) })),
      );
      assert.deepStrictEqual(names, [
        "attributeResolverFromRecord",
        "DecisionHistoryUnknown",
        "RelationshipResolverNever",
        "CustomPredicateNone",
        "SignatureHistoryNone",
      ]);
      assert.deepStrictEqual(answers, [3, "Unknown", "Unknown", false, []]);
    }));

  it.effect("an undefined override is the default, the same as an absent one", () =>
    Effect.gen(function* () {
      const { names } = yield* askEveryPort.pipe(
        Effect.provide(portsLayer({ AttributeResolver: undefined })),
      );
      assert.strictEqual(names[0], "AttributeResolverNone");
    }));

  it.effect("EvaluationServicesNone is the defaults plus an evaluation id", () =>
    Effect.gen(function* () {
      const { names } = yield* askEveryPort;
      const ids = yield* EvaluationId;
      assert.strictEqual(names[0], "AttributeResolverNone");
      assert.strictEqual(ids.name, "EvaluationIdLive");
    }).pipe(Effect.provide(EvaluationServicesNone)));
});

describe("forEveryPort", () => {
  it("visits the five ports in PortName's declaration order", () => {
    assert.deepStrictEqual(
      forEveryPort((d) => d.port),
      ["AttributeResolver", "DecisionHistory", "RelationshipResolver", "CustomPredicate", "SignatureHistory"],
    );
    assert.deepStrictEqual(
      forEveryPort((d) => d.span),
      ["qadi.attribute", "qadi.acted", "qadi.hasRelationship", "qadi.hasCustom", "qadi.hasSignature"],
    );
  });

  it("each registry entry is filed under its own name", () => {
    assert.deepStrictEqual(
      forEveryPort((d): string => d.port),
      Object.keys(PORTS),
    );
    assert.strictEqual(PORTS.AttributeResolver, attributeResolverPort);
  });
});

describe("mapPorts and mergePorts", () => {
  it.effect("round-trip to the same environment portsLayer builds", () =>
    Effect.gen(function* () {
      const viaMap = yield* askEveryPort.pipe(Effect.provide(mergePorts(mapPorts(nonePort))));
      const viaDefaults = yield* askEveryPort.pipe(Effect.provide(portsLayer()));
      assert.deepStrictEqual(viaMap, viaDefaults);
    }));

  it.effect("build one layer per port from its description", () =>
    Effect.gen(function* () {
      const layers = mapPorts((d) => scriptedPort(d, () => PortReply.fail("down")).layer);
      const result = yield* Effect.result(
        AttributeResolver.resolve(aliceId, "level").pipe(Effect.provide(layers.AttributeResolver)),
      );
      assert.strictEqual(result._tag, "Failure");
    }));
});

describe("decoratePorts", () => {
  it.effect("builds the underlying layer once and decorates all five ports", () =>
    Effect.gen(function* () {
      const builds = yield* Ref.make(0);
      const counted: Layer.Layer<PortServices> = Layer.unwrap(
        Effect.as(Ref.update(builds, (n) => n + 1), portsLayer()),
      );
      const decorated = decoratePorts(counted, (d, inner) => {
        const call = d.invoke(inner);
        return d.make(`${inner.name ?? "?"} (decorated)`, (...args) => call(...args));
      });

      const { names, answers } = yield* askEveryPort.pipe(Effect.provide(decorated));

      assert.strictEqual(yield* Ref.get(builds), 1);
      assert.deepStrictEqual(names, [
        "AttributeResolverNone (decorated)",
        "DecisionHistoryUnknown (decorated)",
        "RelationshipResolverNever (decorated)",
        "CustomPredicateNone (decorated)",
        "SignatureHistoryNone (decorated)",
      ]);
      assert.deepStrictEqual(answers, [undefined, "Unknown", "Unknown", false, []]);
    }));
});
