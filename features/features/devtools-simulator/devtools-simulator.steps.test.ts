/**
 * Steps for `devtools-simulator.feature`.
 *
 * A dedicated `Context.Service` World, scoped to this Feature only — these
 * scenarios are about *simulations and sweeps* rather than about one
 * evaluation, the same reasoning as `devtools.steps.test.ts`.
 *
 * Every assertion goes through the real engine. The scenarios that matter most
 * are the first three — a panel that runs evaluations beside a live application
 * has to be provably unable to touch it.
 *
 * `capturedPolicy` lived as a module-level `let` in the Cucumber-CLI version of
 * this file, declared after the `Before` hook — never reset between scenarios,
 * a real state leak. It is now a field of this Feature's Ref-backed World,
 * reset alongside everything else on every `Before`. ADR-EC-009 requires this
 * anyway: a value shared across steps has to live in the World's Ref, not a
 * closure variable.
 */
import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import {
  Allow,
  anyOf,
  AttributeResolveError,
  AttributeResolver,
  attributeResolverFromRecord,
  CustomPredicateNone,
  decisionSinkRing,
  DecisionHistory,
  DecisionHistoryUnavailable,
  DecisionHistoryUnknown,
  Decided,
  DecisionRecord,
  diffTraces,
  gte,
  hasAttribute,
  hasPermission,
  hasRole,
  makeSubjectId,
  ObligationRecord,
  permission,
  RelationshipResolveError,
  RelationshipResolver,
  RelationshipResolverNever,
  SignatureHistory,
  SignatureHistoryNone,
  SignatureHistoryUnavailable,
  stampRecord,
} from "@qadi/core";
import type { DecisionOutcome, Policy, StoredRecord, Trace } from "@qadi/core";
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

const feature = await loadFeature(
  fileURLToPath(new URL("./devtools-simulator.feature", import.meta.url)),
);

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
  CustomPredicateNone,
  Layer.succeed(SignatureHistory, {
    name: "broken",
    signaturesFor: (query) =>
      Effect.fail(
        new SignatureHistoryUnavailable({
          subjectId: query.subjectId,
          resourceId: query.resourceId,
          cause: "the store is down",
        }),
      ),
  }),
);

const policyNamed = (name: string): Policy => {
  const found = policies[name];
  if (found === undefined) throw new Error(`no policy named ${name}`);
  return found;
};

const sourceOptions = (ports: EvaluationPortsLayer | undefined) =>
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

interface DevtoolsSimulatorWorldState {
  readonly input: SimulationInput;
  readonly ports: EvaluationPortsLayer | undefined;
  readonly ring: ReturnType<typeof decisionSinkRing> | undefined;
  readonly outcome: DecisionOutcome | undefined;
  readonly secondOutcome: DecisionOutcome | undefined;
  readonly report: WhatIfReport | undefined;
  readonly replay: Replay | undefined;
  readonly entry: TimelineEntry | undefined;
  readonly answers: CapturedAnswers | undefined;
  readonly replayed: DecisionOutcome | undefined;
  readonly capturedPolicy: Policy | undefined;
}

const initialState: DevtoolsSimulatorWorldState = {
  input: { subject: { id: "alice" } },
  ports: undefined,
  ring: undefined,
  outcome: undefined,
  secondOutcome: undefined,
  report: undefined,
  replay: undefined,
  entry: undefined,
  answers: undefined,
  replayed: undefined,
  capturedPolicy: undefined,
};

export interface WorldShape {
  readonly state: Ref.Ref<DevtoolsSimulatorWorldState>;
}

export class World extends Context.Service<World, WorldShape>()(
  "features/devtools-simulator/World",
) {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      return World.of({ state: yield* Ref.make(initialState) });
    }),
  );
}

const readState = Effect.fn("devtools-simulator.readState")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

const patch = Effect.fn("devtools-simulator.patch")(function* (
  fn: (s: DevtoolsSimulatorWorldState) => Partial<DevtoolsSimulatorWorldState>,
) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...fn(s) }));
});

describeFeature(feature, World.layer, ({ Before, Given, When, Then }) => {
  Before(function* () {
    const { state } = yield* World;
    yield* Ref.set(state, initialState);
  });

  // -------------------------------------------------------------------------
  // Given
  // -------------------------------------------------------------------------

  Given("a simulated subject {string} holding nothing", function* (id: string) {
    yield* patch(() => ({ input: { subject: { id } } }));
  });

  Given(
    "a simulated subject {string} holding the role {string}",
    function* (id: string, role: string) {
      yield* patch(() => ({ input: { subject: { id, roles: [role] } } }));
    },
  );

  Given(
    "a simulated subject {string} holding the permission {string}",
    function* (id: string, key: string) {
      assert.match(key, /^[^:]+:[^:]+$/);
      yield* patch(() => ({
        input: {
          subject: { id, permissions: [`${key.split(":")[0] ?? ""}:${key.split(":")[1] ?? ""}`] },
        },
      }));
    },
  );

  Given("the subject also holds the permission {string}", function* (key: string) {
    const s = yield* readState();
    yield* patch(() => ({
      input: {
        ...s.input,
        subject: {
          ...s.input.subject,
          permissions: [`${key.split(":")[0] ?? ""}:${key.split(":")[1] ?? ""}`],
        },
      },
    }));
  });

  Given("a decision sink is recording", function* () {
    yield* patch(() => ({ ring: decisionSinkRing({ environment: "Server" }) }));
  });

  Given("every real resolver is broken", function* () {
    yield* patch(() => ({ ports: brokenPorts }));
  });

  Given(
    "a real resolver answering {string} with {int}",
    function* (attribute: string, value: number) {
      yield* patch(() => ({
        ports: Layer.mergeAll(
          attributeResolverFromRecord({ [attribute]: value }),
          RelationshipResolverNever,
          DecisionHistoryUnknown,
          CustomPredicateNone,
          SignatureHistoryNone,
        ),
      }));
    },
  );

  Given(
    "a logged decision {string} against the {string} policy for {string}",
    function* (evaluationId: string, name: string, subjectId: string) {
      const trace: Trace = {
        policyTag: "HasPermission",
        allowed: true,
        children: [],
        obligations: [],
      };
      const record = new DecisionRecord({
        evaluationId,
        at: 1_000,
        subjectId: makeSubjectId(subjectId),
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
      });
      yield* patch(() => ({ entry: entryOf(stampRecord(record, "Server")) }));
    },
  );

  Given("a logged obligation outcome {string} with no decision", function* (evaluationId: string) {
    yield* patch(() => ({
      entry: entryOf(
        stampRecord(
          new ObligationRecord({
            evaluationId,
            at: 1_000,
            outcome: "Discharged",
            obligationIds: ["audit"],
          }),
          "Server",
        ),
      ),
    }));
  });

  // -------------------------------------------------------------------------
  // When
  // -------------------------------------------------------------------------

  When("the {string} policy is simulated", function* (name: string) {
    const s = yield* readState();
    const program = simulate(policyNamed(name), s.input, sourceOptions(s.ports));
    const outcome = yield* (s.ring === undefined ? program : program.pipe(Effect.provide(s.ring.layer)));
    yield* patch(() => ({ outcome }));
  });

  When("the {string} policy is simulated against the live resolvers", function* (name: string) {
    const s = yield* readState();
    if (s.ports === undefined) throw new Error("no live resolvers were given");
    const outcome = yield* simulate(policyNamed(name), s.input, { source: live(s.ports) });
    yield* patch(() => ({ outcome }));
  });

  When("a what-if sweep runs against the {string} policy", function* (name: string) {
    const s = yield* readState();
    const program = whatIf(policyNamed(name), s.input, sourceOptions(s.ports));
    const report = yield* (s.ring === undefined ? program : program.pipe(Effect.provide(s.ring.layer)));
    yield* patch(() => ({ report }));
  });

  When("a paired what-if sweep runs against the {string} policy", function* (name: string) {
    const s = yield* readState();
    const report = yield* whatIf(policyNamed(name), s.input, {
      ...sourceOptions(s.ports),
      pairs: true,
      remedies: false,
    });
    yield* patch(() => ({ report }));
  });

  When("that row is replayed", function* () {
    const s = yield* readState();
    const { entry } = s;
    if (entry === undefined) throw new Error("no row to replay");
    yield* patch(() => ({ replay: replayInput(entry) }));
  });

  When("the reviewer supposes the subject held the permission {string}", function* (key: string) {
    const s = yield* readState();
    if (s.replay?._tag !== "Replayable") throw new Error("the row was not replayable");
    const [resource = "", action = ""] = key.split(":");
    const outcome = yield* simulate(s.replay.policy, {
      ...s.replay.input,
      subject: { ...s.replay.input.subject, permissions: [`${resource}:${action}`] },
    });
    yield* patch(() => ({ outcome }));
  });

  When("the {string} policy is captured against the live resolvers", function* (name: string) {
    const s = yield* readState();
    if (s.ports === undefined) throw new Error("no live resolvers were given");
    const recorder = capturing(s.ports);
    const first = yield* simulate(policyNamed(name), s.input, { source: live(recorder.layer) });
    const captured = yield* recorder.answers;
    // Kept so the replay step runs the same policy against the same input.
    yield* patch(() => ({ outcome: first, answers: captured, capturedPolicy: policyNamed(name) }));
  });

  When("the capture is replayed", function* () {
    const s = yield* readState();
    if (s.answers === undefined || s.capturedPolicy === undefined) {
      throw new Error("nothing was captured");
    }
    // Through `snapshot`, the source a panel would pick — not `replayLayer`
    // directly, so the scenario exercises the path a reviewer takes.
    assert.ok(replayLayer(s.answers));
    const replayed = yield* simulate(s.capturedPolicy, s.input, { source: snapshot(s.answers) });
    yield* patch(() => ({ replayed }));
  });

  When("the {string} policy is simulated under each clock", function* (name: string) {
    const s = yield* readState();
    const outcome = yield* simulate(policyNamed(name), s.input, { clock: "live" });
    const secondOutcome = yield* simulate(policyNamed(name), s.input, { clock: "deterministic" });
    yield* patch(() => ({ outcome, secondOutcome }));
  });

  // -------------------------------------------------------------------------
  // Then
  // -------------------------------------------------------------------------

  Then("the sink has recorded {int} decisions", function* (count: number) {
    const s = yield* readState();
    if (s.ring === undefined) throw new Error("no sink was recording");
    const snap = yield* s.ring.snapshot;
    assert.equal(snap.length, count);
  });

  Then("the simulation allows", function* () {
    const s = yield* readState();
    assert.equal(decided(s.outcome)._tag, "Allow");
  });

  Then("the decision names the subject {string}", function* (id: string) {
    const s = yield* readState();
    assert.equal(decided(s.outcome).subjectId, id);
  });

  Then("the simulation fails rather than denying", function* () {
    const s = yield* readState();
    assert.equal(s.outcome?._tag, "Failed");
  });

  Then("the replay fails rather than denying", function* () {
    const s = yield* readState();
    assert.equal(s.replayed?._tag, "Failed");
  });

  Then("the sweep reports {string} as flipping the verdict", function* (label: string) {
    const s = yield* readState();
    const row = s.report?.rows.find((one) => one.edit.label === label);
    assert.ok(row, `no row ${label}`);
    assert.equal(row.comparison._tag, "Compared");
    if (row.comparison._tag !== "Compared") return;
    assert.ok(row.comparison.flipped, "the verdict did not flip");
  });

  Then("no single edit flips the verdict", function* () {
    const s = yield* readState();
    const singles = s.report?.rows.filter((one) => one.edit.parts === undefined) ?? [];
    assert.ok(singles.length > 0);
    for (const row of singles) {
      assert.equal(decided(row.outcome)._tag, "Allow", row.edit.label);
    }
  });

  Then("the pair of both flips the verdict", function* () {
    const s = yield* readState();
    const pair = s.report?.rows.find((one) => one.edit.parts !== undefined);
    assert.ok(pair, "no pair was swept");
    assert.equal(decided(pair.outcome)._tag, "Deny");
  });

  Then("the sweep offers {string} as a strengthening", function* (label: string) {
    const s = yield* readState();
    const row = s.report?.rows.find((one) => one.edit.label === label);
    assert.ok(row, `no row ${label}`);
    assert.equal(row.edit.direction, "Strengthen");
  });

  Then("that row allows", function* () {
    const s = yield* readState();
    const row = s.report?.rows.find((one) => one.edit.direction === "Strengthen");
    assert.ok(row);
    assert.equal(decided(row.outcome)._tag, "Allow");
  });

  Then("a sweep against the live resolvers is reported as performing lookups", function* () {
    const s = yield* readState();
    if (s.ports === undefined) throw new Error("no live resolvers were given");
    const plan = sweepPlan(policies["editor role"] ?? hasRole("editor"), s.input, {
      source: live(s.ports),
    });
    assert.equal(plan.causesIO, true);
    assert.ok(plan.evaluations > 1);
  });

  Then("a sweep against fixtures is reported as performing none", function* () {
    const s = yield* readState();
    assert.equal(sweepPlan(policies["editor role"] ?? hasRole("editor"), s.input).causesIO, false);
  });

  Then("the replayed policy is the logged one", function* () {
    const s = yield* readState();
    assert.equal(s.replay?._tag, "Replayable");
    if (s.replay?._tag !== "Replayable") return;
    assert.deepEqual(s.replay.policy, policies["doc:read"]);
  });

  Then("the replay names {string} among the fields it could not seed", function* (field: string) {
    const s = yield* readState();
    if (s.replay?._tag !== "Replayable") throw new Error("the row was not replayable");
    assert.ok(
      s.replay.unseeded.some((one) => one.field === field),
      field,
    );
  });

  Then("the replay is refused", function* () {
    const s = yield* readState();
    assert.equal(s.replay?._tag, "NotReplayable");
  });

  Then("the reconstruction matches the baseline", function* () {
    const s = yield* readState();
    if (s.entry === undefined || s.outcome === undefined) throw new Error("nothing to compare");
    assert.equal(matchesBaseline(baselineDiff(s.entry, s.outcome)), true);
  });

  Then("the reconstruction does not match the baseline", function* () {
    const s = yield* readState();
    if (s.entry === undefined || s.outcome === undefined) throw new Error("nothing to compare");
    assert.equal(matchesBaseline(baselineDiff(s.entry, s.outcome)), false);
  });

  Then("the difference names the node {string}", function* (tag: string) {
    const s = yield* readState();
    if (s.entry === undefined || s.outcome === undefined) throw new Error("nothing to compare");
    const baseline = baselineDiff(s.entry, s.outcome);
    assert.equal(baseline._tag, "Checked");
    if (baseline._tag !== "Checked" || baseline.comparison._tag !== "Compared") {
      throw new Error("expected a compared baseline");
    }
    assert.equal(baseline.comparison.flipped?.policyTag, tag);
  });

  Then("the replayed trace is identical to the captured one", function* () {
    const s = yield* readState();
    assert.deepEqual(diffTraces(decided(s.outcome).trace, decided(s.replayed).trace), []);
  });

  Then("both traces are identical", function* () {
    const s = yield* readState();
    assert.deepEqual(diffTraces(decided(s.outcome).trace, decided(s.secondOutcome).trace), []);
  });

  Then("the deterministic run reports a duration of {int}", function* (millis: number) {
    const s = yield* readState();
    assert.equal(decided(s.secondOutcome).durationMillis, millis);
  });
});
