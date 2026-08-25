/**
 * Steps for `devtools-simulator.feature`.
 *
 * Module state with a tagged `Before` hook, for the reason `devtools.steps.ts`
 * records: these scenarios are about *simulations and sweeps* rather than about
 * one evaluation, and bending `QadiWorld` to hold them would make every other
 * feature file pay for this one.
 *
 * Every assertion goes through the real engine. The scenarios that matter most
 * are the first three — a panel that runs evaluations beside a live application
 * has to be provably unable to touch it.
 */
import { Before, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  Allow,
  anyOf,
  AttributeResolveError,
  AttributeResolver,
  attributeResolverFromRecord,
  decisionSinkRing,
  DecisionHistory,
  DecisionHistoryUnavailable,
  DecisionHistoryUnknown,
  Decided,
  diffTraces,
  gte,
  hasAttribute,
  hasPermission,
  hasRole,
  makeSubjectId,
  permission,
  RelationshipResolveError,
  RelationshipResolver,
  RelationshipResolverNever,
} from "@qadi/core";
import type {
  DecisionOutcome,
  DecisionRecord,
  Policy,
  StoredRecord,
  Trace,
} from "@qadi/core";
import {
  baselineDiff,
  capturing,
  emptyTimeline,
  ingest,
  live,
  matchesBaseline,
  replayInput,
  replayLayer,
  simulate,
  snapshot,
  sweepPlan,
  whatIf,
  type CapturedAnswers,
  type EvaluationPortsLayer,
  type Replay,
  type SimulationInput,
  type TimelineEntry,
  type WhatIfReport,
} from "@qadi/devtools";

const read = permission("doc", "read");

const policies: Record<string, Policy> = {
  "doc:read": hasPermission(read),
  "doc:write": hasPermission(permission("doc", "write")),
  "editor role": hasRole("editor"),
  clearance: hasAttribute("clearance", gte(5)),
  "either way": anyOf([hasRole("editor"), hasPermission(read)]),
};

/** Ports whose every answer fails, so a run that reaches one cannot decide. */
const brokenPorts: EvaluationPortsLayer = Layer.mergeAll(
  Layer.succeed(AttributeResolver, {
    name: "broken",
    resolve: (_subjectId: string, attribute: string) =>
      Effect.fail(new AttributeResolveError({ attribute, cause: "the store is down" })),
  }),
  Layer.succeed(RelationshipResolver, {
    name: "broken",
    check: (request) =>
      Effect.fail(
        new RelationshipResolveError({
          relation: request.relation,
          resourceId: request.resourceId,
          cause: "the store is down",
        }),
      ),
  }),
  Layer.succeed(DecisionHistory, {
    name: "broken",
    hasActed: (query) =>
      Effect.fail(new DecisionHistoryUnavailable({ event: query.event, cause: "down" })),
  }),
);

let input: SimulationInput = { subject: { id: "alice" } };
let ports: EvaluationPortsLayer | undefined;
let ring: ReturnType<typeof decisionSinkRing> | undefined;
let outcome: DecisionOutcome | undefined;
let secondOutcome: DecisionOutcome | undefined;
let report: WhatIfReport | undefined;
let replay: Replay | undefined;
let entry: TimelineEntry | undefined;
let answers: CapturedAnswers | undefined;
let replayed: DecisionOutcome | undefined;

Before({ tags: "@devtools-simulator" }, () => {
  input = { subject: { id: "alice" } };
  ports = undefined;
  ring = undefined;
  outcome = undefined;
  secondOutcome = undefined;
  report = undefined;
  replay = undefined;
  entry = undefined;
  answers = undefined;
  replayed = undefined;
});

const policyNamed = (name: string): Policy => {
  const found = policies[name];
  if (found === undefined) throw new Error(`no policy named ${name}`);
  return found;
};

const sourceOptions = () =>
  ports === undefined ? {} : { source: live(ports) };

const decided = (self: DecisionOutcome | undefined) => {
  if (self?._tag !== "Decided") throw new Error("expected a decision");
  return self.decision;
};

const entryOf = (record: StoredRecord): TimelineEntry => {
  const [only] = ingest(emptyTimeline(), record).entries;
  if (only === undefined) throw new Error("expected an entry");
  return only;
};

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given("a simulated subject {string} holding nothing", (id: string) => {
  input = { subject: { id } };
});

Given("a simulated subject {string} holding the role {string}", (id: string, role: string) => {
  input = { subject: { id, roles: [role] } };
});

Given(
  "a simulated subject {string} holding the permission {string}",
  (id: string, key: string) => {
    assert.match(key, /^[^:]+:[^:]+$/);
    input = { subject: { id, permissions: [`${key.split(":")[0] ?? ""}:${key.split(":")[1] ?? ""}`] } };
  },
);

Given("the subject also holds the permission {string}", (key: string) => {
  input = {
    ...input,
    subject: {
      ...input.subject,
      permissions: [`${key.split(":")[0] ?? ""}:${key.split(":")[1] ?? ""}`],
    },
  };
});

Given("a decision sink is recording", () => {
  ring = decisionSinkRing({ environment: "Server" });
});

Given("every real resolver is broken", () => {
  ports = brokenPorts;
});

Given("a real resolver answering {string} with {int}", (attribute: string, value: number) => {
  ports = Layer.mergeAll(
    attributeResolverFromRecord({ [attribute]: value }),
    RelationshipResolverNever,
    DecisionHistoryUnknown,
  );
});

Given(
  "a logged decision {string} against the {string} policy for {string}",
  (evaluationId: string, name: string, subjectId: string) => {
    const trace: Trace = {
      policyTag: "HasPermission",
      allowed: true,
      children: [],
      obligations: [],
    };
    const record: DecisionRecord = {
      _tag: "Decision",
      evaluationId,
      at: 1_000,
      policy: policyNamed(name),
      outcome: new Decided({
        decision: new Allow({
          evaluationId,
          subjectId: makeSubjectId(subjectId),
          durationMillis: 1,
          trace,
          visibleFields: undefined,
          obligations: [],
        }),
      }),
    };
    entry = entryOf({ ...record, environment: "Server" });
  },
);

Given("a logged obligation outcome {string} with no decision", (evaluationId: string) => {
  entry = entryOf({
    _tag: "Obligations",
    evaluationId,
    at: 1_000,
    outcome: "Discharged",
    obligationIds: ["audit"],
    environment: "Server",
  });
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When("the {string} policy is simulated", async (name: string) => {
  const program = simulate(policyNamed(name), input, sourceOptions());
  outcome = await Effect.runPromise(
    ring === undefined ? program : program.pipe(Effect.provide(ring.layer)),
  );
});

When("the {string} policy is simulated against the live resolvers", async (name: string) => {
  if (ports === undefined) throw new Error("no live resolvers were given");
  outcome = await Effect.runPromise(
    simulate(policyNamed(name), input, { source: live(ports) }),
  );
});

When("a what-if sweep runs against the {string} policy", async (name: string) => {
  const program = whatIf(policyNamed(name), input, sourceOptions());
  report = await Effect.runPromise(
    ring === undefined ? program : program.pipe(Effect.provide(ring.layer)),
  );
});

When("a paired what-if sweep runs against the {string} policy", async (name: string) => {
  report = await Effect.runPromise(
    whatIf(policyNamed(name), input, { ...sourceOptions(), pairs: true, remedies: false }),
  );
});

When("that row is replayed", () => {
  if (entry === undefined) throw new Error("no row to replay");
  replay = replayInput(entry);
});

When(
  "the reviewer supposes the subject held the permission {string}",
  async (key: string) => {
    if (replay?._tag !== "Replayable") throw new Error("the row was not replayable");
    const [resource = "", action = ""] = key.split(":");
    outcome = await Effect.runPromise(
      simulate(replay.policy, {
        ...replay.input,
        subject: { ...replay.input.subject, permissions: [`${resource}:${action}`] },
      }),
    );
  },
);

When("the {string} policy is captured against the live resolvers", async (name: string) => {
  if (ports === undefined) throw new Error("no live resolvers were given");
  const recorder = capturing(ports);
  const run = await Effect.runPromise(
    Effect.gen(function* () {
      const first = yield* simulate(policyNamed(name), input, {
        source: live(recorder.layer),
      });
      return { first, captured: yield* recorder.answers };
    }),
  );
  outcome = run.first;
  answers = run.captured;
  // Kept so the replay step runs the same policy against the same input.
  capturedPolicy = policyNamed(name);
});

let capturedPolicy: Policy | undefined;

When("the capture is replayed", async () => {
  if (answers === undefined || capturedPolicy === undefined) {
    throw new Error("nothing was captured");
  }
  // Through `snapshot`, the source a panel would pick — not `replayLayer`
  // directly, so the scenario exercises the path a reviewer takes.
  assert.ok(replayLayer(answers));
  replayed = await Effect.runPromise(
    simulate(capturedPolicy, input, { source: snapshot(answers) }),
  );
});

When("the {string} policy is simulated under each clock", async (name: string) => {
  outcome = await Effect.runPromise(simulate(policyNamed(name), input, { clock: "live" }));
  secondOutcome = await Effect.runPromise(
    simulate(policyNamed(name), input, { clock: "deterministic" }),
  );
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then("the sink has recorded {int} decisions", async (count: number) => {
  if (ring === undefined) throw new Error("no sink was recording");
  assert.equal((await Effect.runPromise(ring.snapshot)).length, count);
});

Then("the simulation allows", () => {
  assert.equal(decided(outcome)._tag, "Allow");
});

Then("the decision names the subject {string}", (id: string) => {
  assert.equal(decided(outcome).subjectId, id);
});

Then("the simulation fails rather than denying", () => {
  assert.equal(outcome?._tag, "Failed");
});

Then("the replay fails rather than denying", () => {
  assert.equal(replayed?._tag, "Failed");
});

Then("the sweep reports {string} as flipping the verdict", (label: string) => {
  const row = report?.rows.find((one) => one.edit.label === label);
  assert.ok(row, `no row ${label}`);
  assert.equal(row.comparison._tag, "Compared");
  if (row.comparison._tag !== "Compared") return;
  assert.ok(row.comparison.flipped, "the verdict did not flip");
});

Then("no single edit flips the verdict", () => {
  const singles = report?.rows.filter((one) => one.edit.parts === undefined) ?? [];
  assert.ok(singles.length > 0);
  for (const row of singles) {
    assert.equal(decided(row.outcome)._tag, "Allow", row.edit.label);
  }
});

Then("the pair of both flips the verdict", () => {
  const pair = report?.rows.find((one) => one.edit.parts !== undefined);
  assert.ok(pair, "no pair was swept");
  assert.equal(decided(pair.outcome)._tag, "Deny");
});

Then("the sweep offers {string} as a strengthening", (label: string) => {
  const row = report?.rows.find((one) => one.edit.label === label);
  assert.ok(row, `no row ${label}`);
  assert.equal(row.edit.direction, "Strengthen");
});

Then("that row allows", () => {
  const row = report?.rows.find((one) => one.edit.direction === "Strengthen");
  assert.ok(row);
  assert.equal(decided(row.outcome)._tag, "Allow");
});

Then("a sweep against the live resolvers is reported as performing lookups", () => {
  if (ports === undefined) throw new Error("no live resolvers were given");
  const plan = sweepPlan(policies["editor role"] ?? hasRole("editor"), input, {
    source: live(ports),
  });
  assert.equal(plan.causesIO, true);
  assert.ok(plan.evaluations > 1);
});

Then("a sweep against fixtures is reported as performing none", () => {
  assert.equal(sweepPlan(policies["editor role"] ?? hasRole("editor"), input).causesIO, false);
});

Then("the replayed policy is the logged one", () => {
  assert.equal(replay?._tag, "Replayable");
  if (replay?._tag !== "Replayable") return;
  assert.deepEqual(replay.policy, policies["doc:read"]);
});

Then("the replay names {string} among the fields it could not seed", (field: string) => {
  if (replay?._tag !== "Replayable") throw new Error("the row was not replayable");
  assert.ok(replay.unseeded.some((one) => one.field === field), field);
});

Then("the replay is refused", () => {
  assert.equal(replay?._tag, "NotReplayable");
});

Then("the reconstruction matches the baseline", () => {
  if (entry === undefined || outcome === undefined) throw new Error("nothing to compare");
  assert.equal(matchesBaseline(baselineDiff(entry, outcome)), true);
});

Then("the reconstruction does not match the baseline", () => {
  if (entry === undefined || outcome === undefined) throw new Error("nothing to compare");
  assert.equal(matchesBaseline(baselineDiff(entry, outcome)), false);
});

Then("the difference names the node {string}", (tag: string) => {
  if (entry === undefined || outcome === undefined) throw new Error("nothing to compare");
  const baseline = baselineDiff(entry, outcome);
  assert.equal(baseline._tag, "Checked");
  if (baseline._tag !== "Checked" || baseline.comparison._tag !== "Compared") {
    throw new Error("expected a compared baseline");
  }
  assert.equal(baseline.comparison.flipped?.policyTag, tag);
});

Then("the replayed trace is identical to the captured one", () => {
  assert.deepEqual(diffTraces(decided(outcome).trace, decided(replayed).trace), []);
});

Then("both traces are identical", () => {
  assert.deepEqual(diffTraces(decided(outcome).trace, decided(secondOutcome).trace), []);
});

Then("the deterministic run reports a duration of {int}", (millis: number) => {
  assert.equal(decided(secondOutcome).durationMillis, millis);
});
