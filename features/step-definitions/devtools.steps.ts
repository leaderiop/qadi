/**
 * Steps for `devtools.feature`.
 *
 * A separate world from `QadiWorld`, held in module state, because these
 * scenarios are about a *timeline of records* rather than about one evaluation
 * — the shared world models a single subject, policy and decision, and bending
 * it to hold a list of records from several processes would make every other
 * feature file pay for this one.
 */
import { Before, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  Allow,
  allOf,
  AttributeResolverNone,
  currentSubjectLayer,
  Decided,
  DecisionHistoryUnknown,
  Deny,
  evaluate,
  EvaluationIdLive,
  Failed,
  fromRoles,
  hasPermission,
  makeSubjectId,
  MissingResource,
  permission,
  RelationshipResolverNever,
  role,
} from "@qadi/core";
import type { DecisionRecord, ObligationRecord, StoredRecord, Trace } from "@qadi/core";
import {
  countsOf,
  emptyTimeline,
  flattenTree,
  ingest,
  inspectEntry,
  pairedEntries,
  verdictOf,
  type Timeline,
} from "@qadi/devtools";

const read = permission("doc", "read");
const write = permission("doc", "write");
const reader = role({ name: "reader", permissions: [read] });
const alice = fromRoles({ id: "alice", roles: [reader] });

const services = Layer.mergeAll(
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
);

let timeline: Timeline = emptyTimeline();
let last: StoredRecord | undefined;
let inspected: ReturnType<typeof inspectEntry>;

/**
 * Cucumber runs every scenario in one process, so module state has to be reset
 * between them.
 *
 * A hook rather than a `reset()` at the end of each Then step, which is what
 * this file did first and got wrong: a scenario whose last assertion did not
 * happen to call it leaked its rows into the next one, and two scenarios then
 * failed for a reason that had nothing to do with what they were testing.
 */
Before({ tags: "@devtools" }, () => {
  timeline = emptyTimeline();
  last = undefined;
  inspected = undefined;
});

const trace = (allowed: boolean): Trace => ({
  policyTag: "HasPermission",
  allowed,
  ...(allowed ? {} : { reason: "the subject does not hold doc:read" }),
  children: [],
  obligations: [],
});

const decisionAt = (at: number, environment: string, allowed: boolean): StoredRecord => {
  const evaluationId = `ev-${at}`;
  const record: DecisionRecord = {
    _tag: "Decision",
    evaluationId,
    at,
    policy: hasPermission(read),
    outcome: new Decided({
      decision: allowed
        ? new Allow({
          evaluationId,
          subjectId: makeSubjectId("alice"),
          durationMillis: 1,
          trace: trace(true),
          visibleFields: undefined,
          obligations: [],
        })
        : new Deny({
          evaluationId,
          subjectId: makeSubjectId("alice"),
          durationMillis: 1,
          trace: trace(false),
          reason: "the subject does not hold doc:read",
        }),
    }),
  };
  return { ...record, environment };
};

const accept = (record: StoredRecord) => {
  timeline = ingest(timeline, record);
  last = record;
};

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given("a decision recorded at {int} on {string}", function (at: number, environment: string) {
  accept(decisionAt(at, environment, true));
});

Given(
  "an allowed decision recorded at {int} on {string}",
  function (at: number, environment: string) {
    accept(decisionAt(at, environment, true));
  },
);

Given(
  "a denied decision recorded at {int} on {string}",
  function (at: number, environment: string) {
    accept(decisionAt(at, environment, false));
  },
);

Given(
  "a failed evaluation recorded at {int} on {string}",
  function (at: number, environment: string) {
    const record: DecisionRecord = {
      _tag: "Decision",
      evaluationId: `ev-${at}`,
      at,
      policy: hasPermission(read),
      // Not a `Deny` with a reason: a lookup broke, so there is no verdict.
      outcome: new Failed({ error: new MissingResource({ attribute: "doc.ownerId" }) }),
    };
    accept({ ...record, environment });
  },
);

Given("that same decision is delivered again", function () {
  if (last !== undefined) accept(last);
});

Given(
  "the same evaluation re-checked at {int} on {string}",
  function (at: number, environment: string) {
    accept({ ...decisionAt(at, environment, true), evaluationId: "ev-100" });
  },
);

Given(
  "the same evaluation denied at {int} on {string}",
  function (at: number, environment: string) {
    accept({ ...decisionAt(at, environment, false), evaluationId: "ev-100" });
  },
);

Given(
  "an obligation outcome {string} recorded at {int} for that evaluation",
  function (outcome: string, at: number) {
    accept(obligationAt(outcome, at, `ev-${at - 1}`));
  },
);

Given(
  "an obligation outcome {string} recorded at {int} for {string}",
  function (outcome: string, at: number, evaluationId: string) {
    accept(obligationAt(outcome, at, evaluationId));
  },
);

const obligationAt = (outcome: string, at: number, evaluationId: string): StoredRecord => {
  const record: ObligationRecord = {
    _tag: "Obligations",
    evaluationId,
    at,
    outcome: outcome === "Refused" ? "Refused" : "Discharged",
    obligationIds: ["audit.log"],
  };
  return { ...record, environment: "Server" };
};

Given("a policy requiring all of {string} and {string}", async function (_first: string, _second: string) {
  const policy = allOf([hasPermission(write), hasPermission(read)]);
  const decision = await Effect.runPromise(
    evaluate(policy).pipe(
      Effect.provide(currentSubjectLayer(alice)),
      Effect.provide(services),
    ),
  );
  const record: DecisionRecord = {
    _tag: "Decision",
    evaluationId: "ev-100",
    at: 100,
    policy,
    outcome: new Decided({ decision }),
  };
  accept({ ...record, environment: "Server" });
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When("the timeline inspects that decision", function () {
  const entry = timeline.entries[0];
  inspected = entry === undefined ? undefined : inspectEntry(entry);
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then("the timeline reads {string}", function (expected: string) {
  assert.equal(timeline.entries.map((e) => e.evaluationId).join(", "), expected);
});

Then("the timeline has {int} row(s)", function (expected: number) {
  assert.equal(timeline.entries.length, expected);
});

Then("the row on {string} is the origin", function (environment: string) {
  const row = pairedEntries(timeline).find((p) => p.entry.environment === environment);
  assert.equal(row?.role, "Origin");
});

Then("the row on {string} continues it", function (environment: string) {
  const row = pairedEntries(timeline).find((p) => p.entry.environment === environment);
  assert.equal(row?.role, "Continuation");
});

Then("both rows are marked as disagreeing", function () {
  const rows = pairedEntries(timeline);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.disagrees));
});

Then("the row reads {string}", function (expected: string) {
  const entry = timeline.entries[0];
  assert.ok(entry !== undefined);
  assert.equal(verdictOf(entry), expected);
});

Then("the row does not read {string}", function (unexpected: string) {
  const entry = timeline.entries[0];
  assert.ok(entry !== undefined);
  assert.notEqual(verdictOf(entry), unexpected);
});

Then(
  "the counts are {int} decisions, {int} denied and {int} errored",
  function (decisions: number, denies: number, errors: number) {
    const counts = countsOf(timeline.entries);
    assert.equal(counts.decisions, decisions);
    assert.equal(counts.denies, denies);
    assert.equal(counts.errors, errors);
  },
);

Then("the first branch is {string}", function (expected: string) {
  assert.ok(inspected !== undefined);
  assert.equal(inspected.children[0]?.status, expected);
});

Then("the second branch is {string}", function (expected: string) {
  assert.ok(inspected !== undefined);
  assert.equal(inspected.children[1]?.status, expected);
  // Everything beneath an unexamined node is unexamined too.
  assert.ok(
    flattenTree(inspected)
      .filter((node) => node.path.startsWith("$.1"))
      .every((node) => node.status === "NeverResolved"),
  );
});

Then("that row has no requirement tree", function () {
  const entry = timeline.entries[0];
  assert.ok(entry !== undefined);
  // Nothing, rather than a tree of unexamined nodes: an empty requirement tree
  // reads as "no requirements", which reads as "allowed".
  assert.equal(inspectEntry(entry), undefined);
});
