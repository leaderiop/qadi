/**
 * What each port states about itself, and how a scoped read treats a site, pinned
 * so that it answers the same wherever those facts are written.
 *
 * Every expectation is a literal in this file: a span name, a metric word, a
 * line of JSON, a row of the route table. None is read from the registry, a leaf
 * table or a description, because an expectation derived from the thing it guards
 * passes whatever that thing does. The registry is only the subject: each row
 * reads it through `tabulatePorts`, `forEveryPort`, `PORTS` and `PORT_FIXTURES`
 * and compares it with what is written here.
 *
 * The rows cover:
 * - each port's name, method, span, allowlist term, default and fixture shape;
 * - the order of the registry, and the words and order each port metric
 *   preregisters, read through `Metric.value` and never by a metric id;
 * - each port's question and answer as the JSON a wire carries, one served round
 *   per port, and the declaration `servingFor` derives from one policy per port;
 * - the scoped read: every scoped leaf tag, at each scope it has, at each shape of
 *   site, under each interpreter that may read it, with the outcome, the spans, the
 *   question the span carries, whether the port was reached and what was counted.
 *
 * Only the import lines below may change after this file is added.
 */
import { assert, describe, it } from "@effect/vitest";
import type * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Result from "effect/Result";
import type * as Schema from "effect/Schema";
import type * as Tracer from "effect/Tracer";
import {
  AttributeResolver,
  CustomPredicate,
  DecisionHistory,
  MissingResourceId,
  PORT_FIXTURES,
  PORTS,
  PortReply,
  RelationshipResolver,
  SignatureHistory,
  answerRemotely,
  currentSubjectLayer,
  forEveryPort,
  makeResourceId,
  makeSubject,
  makeSubjectId,
  portCallsTotal,
  portRetriesTotal,
  portTimeoutsTotal,
  predicatePortCallsTotal,
  scriptedPort,
  servedPortCallsTotal,
  servingFor,
  tabulatePorts,
} from "../src/index.ts";
import type { PortName, Resource } from "../src/index.ts";
import { askActed, askRelationship, askSignature } from "../src/PortAccess.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import { collectingTracer, isolatedMetrics, leafOf } from "./helpers.ts";

const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });

/** A wire value as the text it travels as, or the sentence that refused it. */
const jsonOf = (encoded: Result.Result<Schema.Json, string>): string =>
  Result.match(encoded, {
    onSuccess: (json) => JSON.stringify(json),
    onFailure: (message) => `refused: ${message}`,
  });

/** The `name` a shape says it has, once the layer that builds it is provided. */
const shapeNameOf = <Self, Shape extends { readonly name?: string | undefined }>(
  service: Context.Key<Self, Shape>,
  layer: Layer.Layer<Self>,
): Effect.Effect<string | undefined> =>
  Effect.gen(function* () {
    const shape = yield* service;
    return shape.name;
  }).pipe(Effect.provide(layer));

describe("each port states its own facts", () => {
  interface Facts {
    readonly port: string;
    readonly method: string;
    readonly span: string;
    readonly allowlist: string;
    readonly none: string;
    readonly fixtureShape: string | undefined;
  }

  const GOLDEN: { readonly [K in PortName]: Facts } = {
    AttributeResolver: {
      port: "AttributeResolver",
      method: "resolve",
      span: "qadi.attribute",
      allowlist: "required",
      none: "AttributeResolverNone",
      fixtureShape: "attributeResolverFromRecord",
    },
    DecisionHistory: {
      port: "DecisionHistory",
      method: "hasActed",
      span: "qadi.acted",
      allowlist: "open",
      none: "DecisionHistoryUnknown",
      fixtureShape: "decisionHistoryFromEvents",
    },
    RelationshipResolver: {
      port: "RelationshipResolver",
      method: "check",
      span: "qadi.hasRelationship",
      allowlist: "open",
      none: "RelationshipResolverNever",
      fixtureShape: "relationshipResolverFromEdges",
    },
    CustomPredicate: {
      port: "CustomPredicate",
      method: "evaluate",
      span: "qadi.hasCustom",
      allowlist: "required",
      none: "CustomPredicateNone",
      fixtureShape: "customPredicateFromRecord",
    },
    SignatureHistory: {
      port: "SignatureHistory",
      method: "signaturesFor",
      span: "qadi.hasSignature",
      allowlist: "opt-in",
      none: "SignatureHistoryNone",
      fixtureShape: "signatureHistoryFromSignatures",
    },
  };

  /** The facts the registry states, by port, beside the name of the shape each fixture builds from no data. */
  const stated = Effect.gen(function* () {
    const fixtureShapes: { readonly [K in PortName]: string | undefined } = {
      AttributeResolver: yield* shapeNameOf(AttributeResolver, PORT_FIXTURES.AttributeResolver({})),
      DecisionHistory: yield* shapeNameOf(DecisionHistory, PORT_FIXTURES.DecisionHistory([])),
      RelationshipResolver: yield* shapeNameOf(
        RelationshipResolver,
        PORT_FIXTURES.RelationshipResolver([]),
      ),
      CustomPredicate: yield* shapeNameOf(CustomPredicate, PORT_FIXTURES.CustomPredicate({})),
      SignatureHistory: yield* shapeNameOf(SignatureHistory, PORT_FIXTURES.SignatureHistory([])),
    };
    return tabulatePorts<{ readonly [K in PortName]: Facts }>((d) => ({
      port: d.port,
      method: d.method,
      span: d.span,
      allowlist: d.serving.allowlist,
      none: d.none.name,
      fixtureShape: fixtureShapes[d.port],
    }));
  });

  it.effect("AttributeResolver states its facts", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual((yield* stated).AttributeResolver, GOLDEN.AttributeResolver);
    }));

  it.effect("DecisionHistory states its facts", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual((yield* stated).DecisionHistory, GOLDEN.DecisionHistory);
    }));

  it.effect("RelationshipResolver states its facts", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual((yield* stated).RelationshipResolver, GOLDEN.RelationshipResolver);
    }));

  it.effect("CustomPredicate states its facts", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual((yield* stated).CustomPredicate, GOLDEN.CustomPredicate);
    }));

  it.effect("SignatureHistory states its facts", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual((yield* stated).SignatureHistory, GOLDEN.SignatureHistory);
    }));
});

describe("the registry lists the ports in one order", () => {
  const ORDER: ReadonlyArray<string> = [
    "AttributeResolver",
    "DecisionHistory",
    "RelationshipResolver",
    "CustomPredicate",
    "SignatureHistory",
  ];

  it("forEveryPort visits the five ports in registry order", () => {
    assert.deepStrictEqual<ReadonlyArray<string>>(
      forEveryPort((d) => d.port),
      ORDER,
    );
  });

  it("tabulatePorts keys its rows in registry order", () => {
    assert.deepStrictEqual<ReadonlyArray<string>>(
      Object.keys(tabulatePorts<{ readonly [K in PortName]: string }>((d) => d.port)),
      ORDER,
    );
  });
});

describe("each port metric preregisters its words", () => {
  const FIVE = [
    ["AttributeResolver", 0],
    ["DecisionHistory", 0],
    ["RelationshipResolver", 0],
    ["CustomPredicate", 0],
    ["SignatureHistory", 0],
  ];

  it.effect("portCallsTotal preregisters the five ports, in order", () =>
    Effect.gen(function* () {
      const state = yield* isolatedMetrics(Metric.value(portCallsTotal));
      assert.deepStrictEqual([...state.occurrences], FIVE);
    }));

  it.effect("portRetriesTotal preregisters the five ports, in order", () =>
    Effect.gen(function* () {
      const state = yield* isolatedMetrics(Metric.value(portRetriesTotal));
      assert.deepStrictEqual([...state.occurrences], FIVE);
    }));

  it.effect("portTimeoutsTotal preregisters the five ports, in order", () =>
    Effect.gen(function* () {
      const state = yield* isolatedMetrics(Metric.value(portTimeoutsTotal));
      assert.deepStrictEqual([...state.occurrences], FIVE);
    }));

  it.effect("servedPortCallsTotal preregisters the five ports, in order", () =>
    Effect.gen(function* () {
      const state = yield* isolatedMetrics(Metric.value(servedPortCallsTotal));
      assert.deepStrictEqual([...state.occurrences], FIVE);
    }));

  it.effect("predicatePortCallsTotal preregisters the two ports toPredicate reads, in order", () =>
    Effect.gen(function* () {
      const state = yield* isolatedMetrics(Metric.value(predicatePortCallsTotal));
      assert.deepStrictEqual(
        [...state.occurrences],
        [
          ["AttributeResolver", 0],
          ["DecisionHistory", 0],
        ],
      );
    }));
});

describe("each port's question and answer travel as one fixed text", () => {
  const doc = makeResourceId("doc-1");
  const bob = makeSubjectId("bob");

  it("AttributeResolver's question", () => {
    const question = PORTS.AttributeResolver.wire.encodeQuestion([makeSubjectId("alice"), "clearance"]);
    assert.strictEqual(jsonOf(question), '{"subjectId":"alice","attribute":"clearance"}');
  });

  it("AttributeResolver's answer", () => {
    assert.strictEqual(jsonOf(PORTS.AttributeResolver.wire.encodeAnswer(5)), '{"value":5}');
  });

  it("DecisionHistory's question", () => {
    const question = PORTS.DecisionHistory.wire.encodeQuestion([
      { subjectId: makeSubjectId("alice"), event: "approved", resourceId: doc },
    ]);
    assert.strictEqual(
      jsonOf(question),
      '{"subjectId":"alice","event":"approved","resourceId":"doc-1"}',
    );
  });

  it("DecisionHistory's answer", () => {
    assert.strictEqual(jsonOf(PORTS.DecisionHistory.wire.encodeAnswer("Acted")), '"Acted"');
  });

  it("RelationshipResolver's question", () => {
    const question = PORTS.RelationshipResolver.wire.encodeQuestion([
      { subjectId: makeSubjectId("alice"), relation: "owner", resourceId: doc, depth: 2 },
    ]);
    assert.strictEqual(
      jsonOf(question),
      '{"subjectId":"alice","relation":"owner","resourceId":"doc-1","depth":2}',
    );
  });

  it("RelationshipResolver's answer", () => {
    assert.strictEqual(jsonOf(PORTS.RelationshipResolver.wire.encodeAnswer("Related")), '"Related"');
  });

  it("CustomPredicate's question", () => {
    const question = PORTS.CustomPredicate.wire.encodeQuestion([
      "isOwner",
      alice,
      { id: "doc-1" },
      { limit: 3 },
    ]);
    assert.strictEqual(
      jsonOf(question),
      '{"subjectId":"alice","name":"isOwner","resource":{"id":"doc-1"},"params":{"limit":3}}',
    );
  });

  it("CustomPredicate's answer", () => {
    assert.strictEqual(jsonOf(PORTS.CustomPredicate.wire.encodeAnswer(true)), "true");
  });

  it("SignatureHistory's question", () => {
    const question = PORTS.SignatureHistory.wire.encodeQuestion([
      { subjectId: makeSubjectId("alice"), resourceId: doc, meaning: "approved", signerRole: "manager" },
    ]);
    assert.strictEqual(
      jsonOf(question),
      '{"subjectId":"alice","resourceId":"doc-1","meaning":"approved","signerRole":"manager"}',
    );
  });

  it("SignatureHistory's answer", () => {
    const answer = PORTS.SignatureHistory.wire.encodeAnswer([
      { signerId: bob, meaning: "approved", signedAt: 7, signerRole: "manager" },
    ]);
    assert.strictEqual(
      jsonOf(answer),
      '[{"signerId":"bob","meaning":"approved","signerRole":"manager","signedAt":7}]',
    );
  });
});

describe("a host answers one fixed question per port", () => {
  const session = currentSubjectLayer(alice);

  it.effect("AttributeResolver answers a served attribute", () =>
    Effect.gen(function* () {
      const reply = yield* answerRemotely(PORTS.AttributeResolver, { attributes: ["clearance"] })({
        subjectId: "alice",
        attribute: "clearance",
      }).pipe(Effect.provide([session, PORT_FIXTURES.AttributeResolver({ clearance: 5 })]));
      assert.strictEqual(JSON.stringify(reply), '{"_tag":"Answered","answer":{"value":5}}');
    }));

  it.effect("DecisionHistory answers a served event", () =>
    Effect.gen(function* () {
      const reply = yield* answerRemotely(PORTS.DecisionHistory, { events: ["approved"] })({
        subjectId: "alice",
        event: "approved",
        resourceId: "doc-1",
      }).pipe(
        Effect.provide([
          session,
          PORT_FIXTURES.DecisionHistory([{ subjectId: "alice", event: "approved", resourceId: "doc-1" }]),
        ]),
      );
      assert.strictEqual(JSON.stringify(reply), '{"_tag":"Answered","answer":"Acted"}');
    }));

  it.effect("RelationshipResolver answers a served relation", () =>
    Effect.gen(function* () {
      const reply = yield* answerRemotely(PORTS.RelationshipResolver, { relations: ["owner"] })({
        subjectId: "alice",
        relation: "owner",
        resourceId: "doc-1",
        depth: 2,
      }).pipe(
        Effect.provide([
          session,
          PORT_FIXTURES.RelationshipResolver([
            { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
          ]),
        ]),
      );
      assert.strictEqual(JSON.stringify(reply), '{"_tag":"Answered","answer":"Related"}');
    }));

  it.effect("CustomPredicate answers a served predicate", () =>
    Effect.gen(function* () {
      const reply = yield* answerRemotely(PORTS.CustomPredicate, { names: ["isOwner"] })({
        subjectId: "alice",
        name: "isOwner",
        resource: { id: "doc-1" },
        params: { limit: 3 },
      }).pipe(Effect.provide([session, PORT_FIXTURES.CustomPredicate({ isOwner: true })]));
      assert.strictEqual(JSON.stringify(reply), '{"_tag":"Answered","answer":true}');
    }));

  it.effect("SignatureHistory answers once its records are opted in", () =>
    Effect.gen(function* () {
      const reply = yield* answerRemotely(PORTS.SignatureHistory, { signatures: "own-records" })({
        subjectId: "alice",
        resourceId: "doc-1",
        meaning: "approved",
        signerRole: "manager",
      }).pipe(
        Effect.provide([
          session,
          PORT_FIXTURES.SignatureHistory([
            {
              subjectId: "alice",
              resourceId: "doc-1",
              meaning: "approved",
              signerRole: "manager",
              signedAt: 7,
            },
          ]),
        ]),
      );
      assert.strictEqual(
        JSON.stringify(reply),
        '{"_tag":"Answered","answer":[{"signerId":"alice","meaning":"approved","signerRole":"manager","signedAt":7}]}',
      );
    }));

  it("servingFor declares what one policy per port asks", () => {
    const declared = servingFor([
      P.hasAttribute("clearance", M.exists()),
      P.hasActed("approved"),
      P.hasRelationship("owner", { depth: 2 }),
      P.hasCustom("isOwner", { limit: 3 }),
      P.hasSignature("approved", { signerRole: "manager" }),
    ]);
    assert.strictEqual(
      JSON.stringify(declared),
      '{"AttributeResolver":{"attributes":["clearance"]},"DecisionHistory":{"events":["approved"]},' +
        '"RelationshipResolver":{"relations":["owner"]},"CustomPredicate":{"names":["isOwner"]},' +
        '"SignatureHistory":{"signatures":"own-records"}}',
    );
  });
});

/**
 * Every scoped read at every site, with each cell of the outcome written out.
 *
 * A row names the leaf, the scope it has (a relationship has none), the shape of
 * the site's resource, and the interpreter. It states what the read answers or
 * refuses with, the spans it leaves (exactly the port's own, so a read opens no
 * other), what the span's question says, which resource ids the port was asked
 * with (none when it was never reached), and how many calls were counted for the
 * interpreter. A refusal names the leaf's event, relation or meaning, and still
 * leaves a question on the span.
 */
describe("a scoped read at every site", () => {
  type Leaf = "HasRelationship" | "HasActed" | "HasNotActed" | "HasSignature";
  type Scope = "Resource" | "Any";
  type Site = "absent resource" | "resource without id" | "resource with non-string id" | "resource with usable id";
  type Interpreter = "evaluate" | "toPredicate";

  const RESOURCES: { readonly [S in Site]: Resource | undefined } = {
    "absent resource": undefined,
    "resource without id": {},
    "resource with non-string id": { id: 7 },
    "resource with usable id": { id: "doc-1" },
  };

  /** What the span's question says the read asked: the fields the leaf's port records about it. */
  type Asked = Readonly<Record<string, string | undefined>>;

  interface Route {
    readonly leaf: Leaf;
    readonly scope: Scope | undefined;
    readonly site: Site;
    readonly interpreter: Interpreter;
    /** `refused` names the id-less leaf; `answered` is the scripted answer's value. */
    readonly outcome: { readonly refused: string } | { readonly answered: unknown };
    readonly asked: Asked;
    readonly reached: ReadonlyArray<string | undefined>;
    readonly counted: 0 | 1;
  }

  const refused = (name: string, asked: Asked): Pick<Route, "outcome" | "asked" | "reached" | "counted"> => ({
    outcome: { refused: name },
    asked,
    reached: [],
    counted: 0,
  });
  const answered = (
    value: unknown,
    asked: Asked,
    reached: ReadonlyArray<string | undefined>,
  ): Pick<Route, "outcome" | "asked" | "reached" | "counted"> => ({
    outcome: { answered: value },
    asked,
    reached,
    counted: 1,
  });

  const ASKED_RESOURCE_NO_ID = { scope: "Resource", resourceId: undefined };
  const ASKED_RESOURCE_DOC = { scope: "Resource", resourceId: "doc-1" };
  const ASKED_ANY = { scope: "Any", resourceId: undefined };
  const REL_NO_ID = { relation: "owner", resourceId: undefined };
  const REL_DOC = { relation: "owner", resourceId: "doc-1" };
  const SIGNED = { matched: true, onFile: 1 };

  const row = (
    leaf: Leaf,
    scope: Scope | undefined,
    site: Site,
    interpreter: Interpreter,
    rest: Pick<Route, "outcome" | "asked" | "reached" | "counted">,
  ): Route => ({ leaf, scope, site, interpreter, ...rest });

  const ROUTES: ReadonlyArray<Route> = [
    row("HasRelationship", undefined, "absent resource", "evaluate", refused("owner", REL_NO_ID)),
    row("HasRelationship", undefined, "resource without id", "evaluate", refused("owner", REL_NO_ID)),
    row("HasRelationship", undefined, "resource with non-string id", "evaluate", refused("owner", REL_NO_ID)),
    row("HasRelationship", undefined, "resource with usable id", "evaluate", answered("Related", REL_DOC, ["doc-1"])),

    row("HasActed", "Resource", "absent resource", "evaluate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasActed", "Resource", "resource without id", "evaluate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasActed", "Resource", "resource with non-string id", "evaluate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasActed", "Resource", "resource with usable id", "evaluate", answered("Acted", ASKED_RESOURCE_DOC, ["doc-1"])),
    row("HasActed", "Any", "absent resource", "evaluate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasActed", "Any", "resource without id", "evaluate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasActed", "Any", "resource with non-string id", "evaluate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasActed", "Any", "resource with usable id", "evaluate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasActed", "Resource", "absent resource", "toPredicate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasActed", "Resource", "resource without id", "toPredicate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasActed", "Resource", "resource with non-string id", "toPredicate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasActed", "Resource", "resource with usable id", "toPredicate", answered("Acted", ASKED_RESOURCE_DOC, ["doc-1"])),
    row("HasActed", "Any", "absent resource", "toPredicate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasActed", "Any", "resource without id", "toPredicate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasActed", "Any", "resource with non-string id", "toPredicate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasActed", "Any", "resource with usable id", "toPredicate", answered("Acted", ASKED_ANY, [undefined])),

    row("HasNotActed", "Resource", "absent resource", "evaluate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasNotActed", "Resource", "resource without id", "evaluate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasNotActed", "Resource", "resource with non-string id", "evaluate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasNotActed", "Resource", "resource with usable id", "evaluate", answered("Acted", ASKED_RESOURCE_DOC, ["doc-1"])),
    row("HasNotActed", "Any", "absent resource", "evaluate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasNotActed", "Any", "resource without id", "evaluate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasNotActed", "Any", "resource with non-string id", "evaluate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasNotActed", "Any", "resource with usable id", "evaluate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasNotActed", "Resource", "absent resource", "toPredicate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasNotActed", "Resource", "resource without id", "toPredicate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasNotActed", "Resource", "resource with non-string id", "toPredicate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasNotActed", "Resource", "resource with usable id", "toPredicate", answered("Acted", ASKED_RESOURCE_DOC, ["doc-1"])),
    row("HasNotActed", "Any", "absent resource", "toPredicate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasNotActed", "Any", "resource without id", "toPredicate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasNotActed", "Any", "resource with non-string id", "toPredicate", answered("Acted", ASKED_ANY, [undefined])),
    row("HasNotActed", "Any", "resource with usable id", "toPredicate", answered("Acted", ASKED_ANY, [undefined])),

    row("HasSignature", "Resource", "absent resource", "evaluate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasSignature", "Resource", "resource without id", "evaluate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasSignature", "Resource", "resource with non-string id", "evaluate", refused("approved", ASKED_RESOURCE_NO_ID)),
    row("HasSignature", "Resource", "resource with usable id", "evaluate", answered(SIGNED, ASKED_RESOURCE_DOC, ["doc-1"])),
    row("HasSignature", "Any", "absent resource", "evaluate", answered(SIGNED, ASKED_ANY, [undefined])),
    row("HasSignature", "Any", "resource without id", "evaluate", answered(SIGNED, ASKED_ANY, [undefined])),
    row("HasSignature", "Any", "resource with non-string id", "evaluate", answered(SIGNED, ASKED_ANY, [undefined])),
    row("HasSignature", "Any", "resource with usable id", "evaluate", answered(SIGNED, ASKED_ANY, [undefined])),
  ];

  /** What a read left behind: how it ended, which ids its port was asked with, and the question its span carried. */
  interface Observed {
    readonly result: Result.Result<unknown, unknown>;
    readonly reached: ReadonlyArray<string | undefined>;
  }

  const manager = [
    { signerId: makeSubjectId("bob"), meaning: "approved", signedAt: 7, signerRole: "manager" },
  ];

  const READS: {
    readonly [L in Leaf]: (route: Route, resource: Resource | undefined) => Effect.Effect<Observed>;
  } = {
    HasRelationship: (_route, resource) => {
      const port = scriptedPort(PORTS.RelationshipResolver, () => PortReply.answer("Related"));
      return Effect.map(
        Effect.result(
          askRelationship(alice, leafOf("HasRelationship", P.hasRelationship("owner", { depth: 2 })), resource).pipe(
            Effect.provide(port.layer),
          ),
        ),
        (result) => ({ result, reached: port.calls.map(([request]) => request.resourceId) }),
      );
    },
    HasActed: (route, resource) => {
      const port = scriptedPort(PORTS.DecisionHistory, () => PortReply.answer("Acted"));
      const scope = route.scope ?? "Resource";
      return Effect.map(
        Effect.result(
          askActed(route.interpreter, alice, leafOf("HasActed", P.hasActed("approved", { scope })), resource).pipe(
            Effect.provide(port.layer),
          ),
        ),
        (result) => ({ result, reached: port.calls.map(([query]) => query.resourceId) }),
      );
    },
    HasNotActed: (route, resource) => {
      const port = scriptedPort(PORTS.DecisionHistory, () => PortReply.answer("Acted"));
      const scope = route.scope ?? "Resource";
      return Effect.map(
        Effect.result(
          askActed(route.interpreter, alice, leafOf("HasNotActed", P.hasNotActed("approved", { scope })), resource).pipe(
            Effect.provide(port.layer),
          ),
        ),
        (result) => ({ result, reached: port.calls.map(([query]) => query.resourceId) }),
      );
    },
    HasSignature: (route, resource) => {
      const port = scriptedPort(PORTS.SignatureHistory, () => PortReply.answer(manager));
      const scope = route.scope ?? "Resource";
      return Effect.map(
        Effect.result(
          askSignature(
            alice,
            leafOf("HasSignature", P.hasSignature("approved", { scope, signerRole: "manager" })),
            resource,
          ).pipe(Effect.provide(port.layer)),
        ),
        (result) => ({ result, reached: port.calls.map(([query]) => query.resourceId) }),
      );
    },
  };

  /** The port each leaf reads, by the name its span and its metrics carry. */
  const PORT_OF: { readonly [L in Leaf]: { readonly port: string; readonly span: string } } = {
    HasRelationship: { port: "RelationshipResolver", span: "qadi.hasRelationship" },
    HasActed: { port: "DecisionHistory", span: "qadi.acted" },
    HasNotActed: { port: "DecisionHistory", span: "qadi.acted" },
    HasSignature: { port: "SignatureHistory", span: "qadi.hasSignature" },
  };

  /** What the span's question says, read through the port's own span struct. */
  const askedBy = (leaf: Leaf, attributes: ReadonlyMap<string, unknown>): Asked => {
    if (leaf === "HasRelationship") {
      const question = PORTS.RelationshipResolver.attributes.question.decode(attributes);
      return { relation: question.relation, resourceId: question.resourceId };
    }
    if (leaf === "HasSignature") {
      const question = PORTS.SignatureHistory.attributes.question.decode(attributes);
      return { scope: question.scope, resourceId: question.resourceId };
    }
    const question = PORTS.DecisionHistory.attributes.question.decode(attributes);
    return { scope: question.scope, resourceId: question.resourceId };
  };

  /** A literal list of the ports a read of this site could have counted in. */
  const nonZero = (frequency: { readonly occurrences: ReadonlyMap<string, number> }) =>
    [...frequency.occurrences].filter(([, count]) => count !== 0);

  const title = (route: Route): string =>
    route.scope === undefined
      ? `${route.leaf}, ${route.site}, under ${route.interpreter}`
      : `${route.leaf}, scope ${route.scope}, ${route.site}, under ${route.interpreter}`;

  for (const route of ROUTES) {
    it.effect(title(route), () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        const seen = yield* isolatedMetrics(
          Effect.gen(function* () {
            const observed = yield* READS[route.leaf](route, RESOURCES[route.site]).pipe(
              Effect.provide(collectingTracer(spans)),
            );
            return {
              observed,
              evaluator: nonZero(yield* Metric.value(portCallsTotal)),
              translator: nonZero(yield* Metric.value(predicatePortCallsTotal)),
            };
          }),
        );
        const { port, span } = PORT_OF[route.leaf];

        // How it ended.
        const { result, reached } = seen.observed;
        if ("refused" in route.outcome) {
          assert.isTrue(Result.isFailure(result));
          if (Result.isFailure(result) && result.failure instanceof MissingResourceId) {
            assert.strictEqual(result.failure.relation, route.outcome.refused);
          } else {
            assert.fail("the read did not fail with MissingResourceId");
          }
        } else {
          assert.isTrue(Result.isSuccess(result));
          if (Result.isSuccess(result)) assert.deepStrictEqual(result.success, route.outcome.answered);
        }

        // The spans it left: the port's own, and no other.
        assert.deepStrictEqual(
          spans.map((s) => s.name),
          [span],
        );
        // What the span says it asked, whether or not the port was reached.
        const [opened] = spans;
        assert.deepStrictEqual(askedBy(route.leaf, opened?.attributes ?? new Map()), route.asked);
        // Whether the port was reached, and with which resource id.
        assert.deepStrictEqual(reached, route.reached);
        // What was counted, and under which interpreter's series.
        const counted: ReadonlyArray<readonly [string, number]> = route.counted === 0 ? [] : [[port, 1]];
        assert.deepStrictEqual(seen.evaluator, route.interpreter === "evaluate" ? counted : []);
        assert.deepStrictEqual(seen.translator, route.interpreter === "toPredicate" ? counted : []);
      }));
  }
});
