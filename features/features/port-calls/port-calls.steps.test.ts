/**
 * Steps for `port-calls.feature`.
 *
 * A dedicated `Context.Service` World, scoped to this Feature only, for the
 * reason the other devtools-family step files record: these scenarios are
 * about *what a port was asked* rather than about one decision, and bending
 * the shared authorization World to hold that would make every other feature
 * file pay for this one.
 *
 * Every span here comes from a real evaluation. A hand-built one would prove
 * only that the decoder agrees with whatever this file assumed the evaluator
 * writes, which is the half of the claim that does not need checking.
 */
import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Tracer from "effect/Tracer";
import {
  anyOf,
  AttributeResolveError,
  AttributeResolver,
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  evaluate,
  evaluationIdSequential,
  gte,
  hasAttribute,
  hasRelationship,
  hasRole,
  makeSubject,
  RelationshipResolverNever,
  relationshipResolverFromEdges,
  SignatureHistoryNone,
} from "@qadi/core";
import type { Policy, RelationshipResolver } from "@qadi/core";
import { collectPortCalls } from "@qadi/devtools";
import type { PortCall, PortCallLog } from "@qadi/devtools";

const feature = await loadFeature(fileURLToPath(new URL("./port-calls.feature", import.meta.url)));

const policies: Record<string, Policy> = {
  clearance: hasAttribute("clearance", gte(5)),
  owner: hasRelationship("owner"),
  "either way": anyOf([hasRole("editor"), hasAttribute("clearance", gte(5))]),
  // `anyOf` rather than `allOf`: every branch denies, so all three are read.
  // Under `allOf` the first denial short-circuits the rest away (INV-QD-005),
  // and the scenario would be measuring one call rather than three.
  "three attributes": anyOf([
    hasAttribute("first", gte(5)),
    hasAttribute("second", gte(5)),
    hasAttribute("third", gte(5)),
  ]),
};

const policyNamed = (name: string): Policy => {
  const found = policies[name];
  if (found === undefined) throw new Error(`no policy named ${name}`);
  return found;
};

const recordOf = (record: Readonly<Record<string, unknown>>) =>
  Layer.succeed(AttributeResolver, {
    name: "record",
    resolve: (_id: string, attribute: string) => Effect.succeed(record[attribute]),
  });

interface PortCallsWorldState {
  readonly subjectAttributes: Record<string, unknown>;
  readonly subjectRoles: ReadonlyArray<string>;
  readonly subjectId: string;
  readonly attributes: Layer.Layer<AttributeResolver>;
  readonly relationships: Layer.Layer<RelationshipResolver>;
  readonly capacity: number | undefined;
  readonly secret: string | undefined;
  readonly hostSaw: Array<string> | undefined;
  readonly log: PortCallLog | undefined;
  readonly spanValues: ReadonlyArray<unknown>;
}

const initialState: PortCallsWorldState = {
  subjectAttributes: {},
  subjectRoles: [],
  subjectId: "alice",
  attributes: AttributeResolverNone,
  relationships: RelationshipResolverNever,
  capacity: undefined,
  secret: undefined,
  hostSaw: undefined,
  log: undefined,
  spanValues: [],
};

export interface WorldShape {
  readonly state: Ref.Ref<PortCallsWorldState>;
}

export class World extends Context.Service<World, WorldShape>()("features/port-calls/World") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      return World.of({ state: yield* Ref.make(initialState) });
    }),
  );
}

const read = Effect.fn("port-calls.read")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

const patch = Effect.fn("port-calls.patch")(function* (
  fn: (s: PortCallsWorldState) => Partial<PortCallsWorldState>,
) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...fn(s) }));
});

const callsOf = (log: PortCallLog | undefined, tag: PortCall["_tag"]): ReadonlyArray<PortCall> =>
  (log?.calls ?? []).filter((call) => call._tag === tag);

const theCall = (log: PortCallLog | undefined): PortCall => {
  const first = (log?.calls ?? [])[0];
  if (first === undefined) throw new Error("no port call was recorded");
  return first;
};

const runPolicy = Effect.fn("port-calls.run")(function* (
  name: string,
  resource?: Record<string, unknown>,
) {
  const s = yield* read();
  const collector = collectPortCalls(s.capacity === undefined ? undefined : { capacity: s.capacity });
  const seenHost = s.hostSaw;
  const collected: Array<Tracer.Span> = [];

  const services = Layer.mergeAll(
    currentSubjectLayer(
      makeSubject({
        id: s.subjectId,
        roles: s.subjectRoles,
        permissions: [],
        attributes: s.subjectAttributes,
      }),
    ),
    s.attributes,
    s.relationships,
    DecisionHistoryUnknown,
    evaluationIdSequential("ev"),
    CustomPredicateNone,
    SignatureHistoryNone,
  );

  // An outer tracer that records every span, so the value-disclosure scenario
  // can search all of them and the delegation scenario can prove the host's
  // own was not taken away.
  //
  // Provided as its own, separate `Effect.provide` call, deliberately not
  // folded into one `Layer.mergeAll` with `services`/`collector.layer` — the
  // `multipleEffectProvide` diagnostic suggests exactly that merge, but doing
  // it here changes when `collector.layer`'s span-observing construction runs
  // relative to this tracer becoming ambient, and silently broke the
  // drop-count and span-capture scenarios (6 failures, caught by `pnpm check`
  // during the migration). Sequential `Effect.provide` calls, preserved
  // unchanged from the original Cucumber-CLI suite, do not.
  const outer = Layer.succeed(
    Tracer.Tracer,
    Tracer.make({
      span: (options) => {
        if (seenHost !== undefined) seenHost.push(options.name);
        const span = new Tracer.NativeSpan(options);
        collected.push(span);
        return span;
      },
    }),
  );

  yield* Effect.result(
    evaluate(policyNamed(name), resource === undefined ? {} : { resource }).pipe(
      Effect.provide(services),
      Effect.provide(collector.layer),
      Effect.provide(outer),
    ),
  );

  const log = yield* collector.snapshot;
  const spanValues = collected.flatMap((span) => [...span.attributes.values()]);
  yield* patch(() => ({ log, spanValues, hostSaw: seenHost }));
});

describeFeature(feature, World.layer, ({ Before, Given, When, Then }) => {
  Before(function* () {
    const { state } = yield* World;
    yield* Ref.set(state, initialState);
  });

  // -------------------------------------------------------------------------
  // Given
  // -------------------------------------------------------------------------

  Given("a subject {string} carrying no attributes", function* (id: string) {
    yield* patch(() => ({ subjectId: id }));
  });

  Given(
    "a subject {string} carrying {string} as {int}",
    function* (id: string, key: string, value: number) {
      yield* patch(() => ({ subjectId: id, subjectAttributes: { [key]: value } }));
    },
  );

  Given("a subject {string} holding the role {string}", function* (id: string, role: string) {
    yield* patch(() => ({ subjectId: id, subjectRoles: [role] }));
  });

  Given("a resolver answering {string} with {int}", function* (attribute: string, value: number) {
    yield* patch(() => ({ attributes: recordOf({ [attribute]: value }) }));
  });

  Given(
    "a resolver answering {string} with the secret {string}",
    function* (attribute: string, value: string) {
      yield* patch(() => ({ secret: value, attributes: recordOf({ [attribute]: value }) }));
    },
  );

  Given("a resolver that has no attributes at all", function* () {
    yield* patch(() => ({ attributes: recordOf({}) }));
  });

  Given("a resolver that is down", function* () {
    yield* patch(() => ({
      attributes: Layer.succeed(AttributeResolver, {
        name: "broken",
        resolve: (_id: string, attribute: string) =>
          Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
      }),
    }));
  });

  Given(
    "an edge making {string} the {string} of {string}",
    function* (id: string, relation: string, resourceId: string) {
      yield* patch(() => ({
        relationships: relationshipResolverFromEdges([{ subjectId: id, relation, resourceId }]),
      }));
    },
  );

  Given("the host has wired its own tracer", function* () {
    yield* patch(() => ({ hostSaw: [] }));
  });

  Given("the collector keeps only {int} call", function* (kept: number) {
    yield* patch(() => ({ capacity: kept }));
  });

  // -------------------------------------------------------------------------
  // When
  // -------------------------------------------------------------------------

  When("the {string} policy is evaluated under a collector", function* (name: string) {
    yield* runPolicy(name);
  });

  When(
    "the {string} policy is evaluated under a collector against {string}",
    function* (name: string, resourceId: string) {
      yield* runPolicy(name, { id: resourceId });
    },
  );

  When(
    "the {string} policy is evaluated under a collector against a resource with no id",
    function* (name: string) {
      yield* runPolicy(name, { name: "no id" });
    },
  );

  // -------------------------------------------------------------------------
  // Then
  // -------------------------------------------------------------------------

  Then("one AttributeResolver call is recorded", function* () {
    const s = yield* read();
    assert.equal(callsOf(s.log, "AttributeResolver").length, 1);
  });

  Then("one RelationshipResolver call is recorded", function* () {
    const s = yield* read();
    assert.equal(callsOf(s.log, "RelationshipResolver").length, 1);
  });

  Then("no port calls are recorded", function* () {
    const s = yield* read();
    assert.deepEqual(s.log?.calls, []);
  });

  Then("that call names the attribute {string}", function* (attribute: string) {
    const s = yield* read();
    const call = theCall(s.log);
    assert.equal(call._tag, "AttributeResolver");
    if (call._tag !== "AttributeResolver") return;
    assert.equal(call.attribute, attribute);
  });

  Then("that call names the subject {string}", function* (id: string) {
    const s = yield* read();
    assert.equal(theCall(s.log).subjectId, id);
  });

  Then("that call reports that a value came back", function* () {
    const s = yield* read();
    const call = theCall(s.log);
    assert.equal(call._tag, "AttributeResolver");
    if (call._tag !== "AttributeResolver") return;
    assert.equal(call.resolved, true);
  });

  Then("that call reports that no value came back", function* () {
    const s = yield* read();
    const call = theCall(s.log);
    assert.equal(call._tag, "AttributeResolver");
    if (call._tag !== "AttributeResolver") return;
    assert.equal(call.resolved, false);
  });

  Then("that call reports no answer at all", function* () {
    const s = yield* read();
    const call = theCall(s.log);
    if (call._tag === "AttributeResolver") {
      assert.equal(call.resolved, undefined);
      return;
    }
    if (call._tag === "RelationshipResolver") {
      assert.equal(call.answer, undefined);
      return;
    }
    if (call._tag === "SignatureHistory") {
      assert.equal(call.matched, undefined);
      return;
    }
    assert.equal(call.answer, undefined);
  });

  Then("that call reports the answer {string}", function* (answer: string) {
    const s = yield* read();
    const call = theCall(s.log);
    assert.notEqual(call._tag, "AttributeResolver");
    assert.notEqual(call._tag, "SignatureHistory");
    if (call._tag === "AttributeResolver" || call._tag === "SignatureHistory") return;
    assert.equal(call.answer, answer);
  });

  /** INV-QD-044, asserted across every span rather than only the attribute's own. */
  Then("no span carries the secret", function* () {
    const s = yield* read();
    assert.ok(s.secret !== undefined);
    const rendered = s.spanValues.map((value) => String(value)).join(" ");
    assert.ok(!rendered.includes(s.secret ?? ""), `a span disclosed the value: ${rendered}`);
  });

  Then("the host's tracer saw the evaluation span", function* () {
    const s = yield* read();
    assert.ok(s.hostSaw?.includes("qadi.evaluate"), `host saw ${JSON.stringify(s.hostSaw)}`);
    assert.ok(s.hostSaw?.includes("qadi.attribute"));
  });

  Then("the log reports {int} dropped", function* (dropped: number) {
    const s = yield* read();
    assert.equal(s.log?.dropped, dropped);
  });
});
