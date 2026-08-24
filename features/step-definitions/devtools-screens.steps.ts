/**
 * Steps for `devtools-screens.feature`.
 *
 * Module state with a tagged `Before` hook, for the reason
 * `devtools.steps.ts` records: these scenarios are about *catalogues and roles*
 * rather than about one evaluation, and bending `QadiWorld` to hold them would
 * make every other feature file pay for this one.
 */
import { Before, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import * as Effect from "effect/Effect";
import {
  allOf,
  Allow,
  Decided,
  flattenPermissions,
  hasPermission,
  makeSubjectId,
  permission,
  role,
} from "@qadi/core";
import type { DecisionRecord, Policy, Role, StoredRecord, Trace } from "@qadi/core";
import {
  catalogueOf,
  emptyTimeline,
  ingest,
  inspect,
  flattenTree,
  portActivity,
  roleSummary,
  wiringReport,
  type Catalogue,
  type PolicySighting,
  type Timeline,
} from "@qadi/devtools";

const read = permission("doc", "read");
const write = permission("doc", "write");

const policies: Record<string, Policy> = {
  "doc:read": hasPermission(read),
  "doc:write": hasPermission(write),
  "all of doc:read": allOf([hasPermission(read)]),
};

let timeline: Timeline = emptyTimeline();
let declared: Catalogue = {};
let catalogue: ReadonlyArray<PolicySighting> = [];
let roles: Record<string, Role> = {};
let structural: ReturnType<typeof inspect> | undefined;
let at = 100;

Before({ tags: "@devtools-screens" }, () => {
  timeline = emptyTimeline();
  declared = {};
  catalogue = [];
  roles = {};
  structural = undefined;
  at = 100;
});

const trace: Trace = {
  policyTag: "HasPermission",
  allowed: true,
  children: [],
  obligations: [],
};

const decisionFor = (policy: Policy): StoredRecord => {
  at += 1;
  const evaluationId = `ev-${at}`;
  const record: DecisionRecord = {
    _tag: "Decision",
    evaluationId,
    at,
    policy,
    outcome: new Decided({
      decision: new Allow({
        evaluationId,
        subjectId: makeSubjectId("alice"),
        durationMillis: 1,
        trace,
        visibleFields: undefined,
        obligations: [],
      }),
    }),
  };
  return { ...record, environment: "Server" };
};

const named = (name: string): Policy => policies[name] ?? hasPermission(read);

const refresh = () => {
  catalogue = catalogueOf(timeline, declared);
};

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given("a decision against the {string} policy", function (name: string) {
  timeline = ingest(timeline, decisionFor(named(name)));
  refresh();
});

Given("another decision against the {string} policy", function (name: string) {
  timeline = ingest(timeline, decisionFor(named(name)));
  refresh();
});

Given("a decision against an {string} policy", function (name: string) {
  timeline = ingest(timeline, decisionFor(named(name)));
  refresh();
});

// Built separately on purpose: the grouping must be structural, not by
// reference, or two components building one policy inline would be two rows.
Given("a decision against a separately built {string} policy", function (_name: string) {
  timeline = ingest(timeline, decisionFor(allOf([hasPermission(read)])));
  refresh();
});

Given(
  "the application declares a policy {string} that has never run",
  function (name: string) {
    declared = { ...declared, policies: { ...declared.policies, [name]: hasPermission(write) } };
    refresh();
  },
);

Given("the application declares that same policy as {string}", function (name: string) {
  declared = {
    ...declared,
    policies: { ...declared.policies, [name]: allOf([hasPermission(read)]) },
  };
  refresh();
});

Given("the {string} policy", function (name: string) {
  structural = inspect(named(name), undefined);
});

Given("a role {string} granting {string}", function (name: string, key: string) {
  roles = { ...roles, [name]: role({ name, permissions: [keyed(key)] }) };
});

Given(
  "a role {string} granting {string} and inheriting {string}",
  function (name: string, key: string, parent: string) {
    const inherited = roles[parent];
    roles = {
      ...roles,
      [name]: role({
        name,
        permissions: [keyed(key)],
        inherits: inherited === undefined ? [] : [inherited],
      }),
    };
  },
);

Given("no application layer at all", function () {
  // Nothing to do: `wiringReport` reads every port through `serviceOption`, so
  // it runs with no layer and reports what it found.
});

Given("a port that nothing ever calls", function () {
  // `EvaluationId` is in `EvaluationServices` and is reached through the
  // service, never through the counted resolver path — so nothing increments a
  // metric for it, whatever else the process has run.
});

const keyed = (key: string) => (key === "doc:write" ? write : read);

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When("it is viewed structurally", function () {
  // `inspect(policy, undefined)` is what the explorer renders, and the screen
  // shows it with `showStatus={false}`.
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then("the catalogue lists {int} policy/policies", function (expected: number) {
  assert.equal(catalogue.length, expected);
});

Then("that policy shows {int} decisions", function (expected: number) {
  assert.equal(catalogue[0]?.count, expected);
});

Then("{string} shows {int} decisions", function (label: string, expected: number) {
  assert.equal(catalogue.find((entry) => entry.label === label)?.count, expected);
});

Then("the catalogue names it {string}", function (expected: string) {
  assert.equal(catalogue[0]?.label, expected);
});

Then("no node carries a verdict", function () {
  assert.ok(structural !== undefined);
  // Every node is `NeverResolved` in the model — which is why the screen is
  // rendered with `showStatus={false}` rather than trusting the value to read
  // correctly in both places.
  assert.ok(flattenTree(structural).every((node) => node.status === "NeverResolved"));
});

Then("{string} shows {string} as own", function (roleName: string, key: string) {
  const subject = roles[roleName];
  assert.ok(subject !== undefined);
  const grant = roleSummary(subject).grants.find((g) => g.permission === key);
  assert.deepEqual([...(grant?.path ?? [])], [roleName]);
});

Then("{string} shows {string} via {string}", function (roleName: string, key: string, parent: string) {
  const subject = roles[roleName];
  assert.ok(subject !== undefined);
  const grant = roleSummary(subject).grants.find((g) => g.permission === key);
  assert.deepEqual([...(grant?.path ?? [])], [roleName, parent]);
});

Then("the permissions shown for {string} are exactly the set that decides", function (roleName: string) {
  const subject = roles[roleName];
  assert.ok(subject !== undefined);
  assert.deepEqual(
    new Set(roleSummary(subject).grants.map((g) => g.permission)),
    flattenPermissions(subject),
  );
});

Then("the wiring report marks {string} as required", async function (port: string) {
  const report = await Effect.runPromise(wiringReport);
  assert.equal(report.ports.find((entry) => entry.port === port)?.required, true);
});

Then("the wiring report marks {string} as optional", async function (port: string) {
  const report = await Effect.runPromise(wiringReport);
  assert.equal(report.ports.find((entry) => entry.port === port)?.required, false);
});

Then("it does not appear in the port activity", async function () {
  const activity = await Effect.runPromise(portActivity);
  // Asserted as an absence rather than as an empty list: the metric registry is
  // process-wide, which is exactly what the panel tells a reader, so other
  // scenarios in this suite have already counted calls into it. A test that
  // assumed an empty registry would be asserting the opposite of the
  // documented behaviour.
  assert.equal(activity.find((entry) => entry.port === "EvaluationId"), undefined);
});
