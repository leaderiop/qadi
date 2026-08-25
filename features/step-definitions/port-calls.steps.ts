/**
 * Steps for `port-calls.feature`.
 *
 * Module state with a tagged `Before` hook, for the reason the other devtools
 * step files record: these scenarios are about *what a port was asked* rather
 * than about one decision, and bending `QadiWorld` to hold that would make every
 * other feature file pay for this one.
 *
 * Every span here comes from a real evaluation. A hand-built one would prove
 * only that the decoder agrees with whatever this file assumed the evaluator
 * writes, which is the half of the claim that does not need checking.
 */
import { Before, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Tracer from "effect/Tracer";
import {
  anyOf,
  AttributeResolveError,
  AttributeResolver,
  AttributeResolverNone,
  currentSubjectLayer,
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
} from "@qadi/core";
import type { Policy, RelationshipResolver } from "@qadi/core";
import { collectPortCalls } from "@qadi/devtools";
import type { PortCall, PortCallLog } from "@qadi/devtools";

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

let subjectAttributes: Record<string, unknown> = {};
let subjectRoles: ReadonlyArray<string> = [];
let subjectId = "alice";
let attributes: Layer.Layer<AttributeResolver> = AttributeResolverNone;
let relationships: Layer.Layer<RelationshipResolver> = RelationshipResolverNever;
let capacity: number | undefined;
let secret: string | undefined;
let hostSaw: Array<string> | undefined;
let log: PortCallLog | undefined;
let spanValues: ReadonlyArray<unknown> = [];

Before({ tags: "@port-calls" }, () => {
  subjectAttributes = {};
  subjectRoles = [];
  subjectId = "alice";
  attributes = AttributeResolverNone;
  relationships = RelationshipResolverNever;
  capacity = undefined;
  secret = undefined;
  hostSaw = undefined;
  log = undefined;
  spanValues = [];
});

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

const callsOf = (tag: PortCall["_tag"]): ReadonlyArray<PortCall> =>
  (log?.calls ?? []).filter((call) => call._tag === tag);

const theCall = (): PortCall => {
  const first = (log?.calls ?? [])[0];
  if (first === undefined) throw new Error("no port call was recorded");
  return first;
};

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given("a subject {string} carrying no attributes", (id: string) => {
  subjectId = id;
});

Given("a subject {string} carrying {string} as {int}", (id: string, key: string, value: number) => {
  subjectId = id;
  subjectAttributes = { [key]: value };
});

Given("a subject {string} holding the role {string}", (id: string, role: string) => {
  subjectId = id;
  subjectRoles = [role];
});

Given("a resolver answering {string} with {int}", (attribute: string, value: number) => {
  attributes = recordOf({ [attribute]: value });
});

Given(
  "a resolver answering {string} with the secret {string}",
  (attribute: string, value: string) => {
    secret = value;
    attributes = recordOf({ [attribute]: value });
  },
);

Given("a resolver that has no attributes at all", () => {
  attributes = recordOf({});
});

Given("a resolver that is down", () => {
  attributes = Layer.succeed(AttributeResolver, {
    name: "broken",
    resolve: (_id: string, attribute: string) =>
      Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
  });
});

Given("an edge making {string} the {string} of {string}", (id: string, relation: string, resourceId: string) => {
  relationships = relationshipResolverFromEdges([{ subjectId: id, relation, resourceId }]);
});

Given("the host has wired its own tracer", () => {
  hostSaw = [];
});

Given("the collector keeps only {int} call", (kept: number) => {
  capacity = kept;
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

const run = async (name: string, resource?: Record<string, unknown>): Promise<void> => {
  const collector = collectPortCalls(capacity === undefined ? undefined : { capacity });
  const seen = hostSaw;
  const collected: Array<Tracer.Span> = [];

  const services = Layer.mergeAll(
    currentSubjectLayer(
      makeSubject({
        id: subjectId,
        roles: subjectRoles,
        permissions: [],
        attributes: subjectAttributes,
      }),
    ),
    attributes,
    relationships,
    DecisionHistoryUnknown,
    evaluationIdSequential("ev"),
  );

  // An outer tracer that records every span, so the value-disclosure scenario
  // can search all of them and the delegation scenario can prove the host's own
  // was not taken away.
  const outer = Layer.succeed(
    Tracer.Tracer,
    Tracer.make({
      span: (options) => {
        if (seen !== undefined) seen.push(options.name);
        const span = new Tracer.NativeSpan(options);
        collected.push(span);
        return span;
      },
    }),
  );

  await Effect.runPromise(
    Effect.result(
      evaluate(policyNamed(name), resource === undefined ? {} : { resource }).pipe(
        Effect.provide(services),
        Effect.provide(collector.layer),
        Effect.provide(outer),
      ),
    ),
  );

  log = await Effect.runPromise(collector.snapshot);
  spanValues = collected.flatMap((span) => [...span.attributes.values()]);
};

When("the {string} policy is evaluated under a collector", async (name: string) => {
  await run(name);
});

When(
  "the {string} policy is evaluated under a collector against {string}",
  async (name: string, resourceId: string) => {
    await run(name, { id: resourceId });
  },
);

When(
  "the {string} policy is evaluated under a collector against a resource with no id",
  async (name: string) => {
    await run(name, { name: "no id" });
  },
);

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then("one AttributeResolver call is recorded", () => {
  assert.equal(callsOf("AttributeResolver").length, 1);
});

Then("one RelationshipResolver call is recorded", () => {
  assert.equal(callsOf("RelationshipResolver").length, 1);
});

Then("no port calls are recorded", () => {
  assert.deepEqual(log?.calls, []);
});

Then("that call names the attribute {string}", (attribute: string) => {
  const call = theCall();
  assert.equal(call._tag, "AttributeResolver");
  if (call._tag !== "AttributeResolver") return;
  assert.equal(call.attribute, attribute);
});

Then("that call names the subject {string}", (id: string) => {
  assert.equal(theCall().subjectId, id);
});

Then("that call reports that a value came back", () => {
  const call = theCall();
  assert.equal(call._tag, "AttributeResolver");
  if (call._tag !== "AttributeResolver") return;
  assert.equal(call.resolved, true);
});

Then("that call reports that no value came back", () => {
  const call = theCall();
  assert.equal(call._tag, "AttributeResolver");
  if (call._tag !== "AttributeResolver") return;
  assert.equal(call.resolved, false);
});

Then("that call reports no answer at all", () => {
  const call = theCall();
  if (call._tag === "AttributeResolver") {
    assert.equal(call.resolved, undefined);
    return;
  }
  if (call._tag === "RelationshipResolver") {
    assert.equal(call.answer, undefined);
    return;
  }
  assert.equal(call.answer, undefined);
});

Then("that call reports the answer {string}", (answer: string) => {
  const call = theCall();
  assert.notEqual(call._tag, "AttributeResolver");
  if (call._tag === "AttributeResolver") return;
  assert.equal(call.answer, answer);
});

/** INV-QD-044, asserted across every span rather than only the attribute's own. */
Then("no span carries the secret", () => {
  assert.ok(secret !== undefined);
  const rendered = spanValues.map((value) => String(value)).join(" ");
  assert.ok(!rendered.includes(secret ?? ""), `a span disclosed the value: ${rendered}`);
});

Then("the host's tracer saw the evaluation span", () => {
  assert.ok(hostSaw?.includes("qadi.evaluate"), `host saw ${JSON.stringify(hostSaw)}`);
  assert.ok(hostSaw?.includes("qadi.attribute"));
});

Then("the log reports {int} dropped", (dropped: number) => {
  assert.equal(log?.dropped, dropped);
});
