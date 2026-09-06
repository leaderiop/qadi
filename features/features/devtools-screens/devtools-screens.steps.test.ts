/**
 * Steps for `devtools-screens.feature`.
 *
 * A dedicated `Context.Service` World, scoped to this Feature only — these
 * scenarios are about *catalogues and roles* rather than about one evaluation,
 * the same reasoning as `devtools.steps.test.ts`.
 */
import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import {
  allOf,
  Allow,
  Decided,
  DecisionRecord,
  flattenPermissions,
  hasPermission,
  makeSubjectId,
  permission,
  role,
  stampRecord,
} from "@qadi/core";
import type { Policy, Role, StoredRecord, Trace } from "@qadi/core";
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

const feature = await loadFeature(
  fileURLToPath(new URL("./devtools-screens.feature", import.meta.url)),
);

const read = permission("doc", "read");
const write = permission("doc", "write");

const policies: Record<string, Policy> = {
  "doc:read": hasPermission(read),
  "doc:write": hasPermission(write),
  "all of doc:read": allOf([hasPermission(read)]),
};

const trace: Trace = {
  policyTag: "HasPermission",
  allowed: true,
  children: [],
  obligations: [],
};

const named = (name: string): Policy => policies[name] ?? hasPermission(read);
const keyed = (key: string) => (key === "doc:write" ? write : read);

interface DevtoolsScreensWorldState {
  readonly timeline: Timeline;
  readonly declared: Catalogue;
  readonly catalogue: ReadonlyArray<PolicySighting>;
  readonly roles: Record<string, Role>;
  readonly structural: ReturnType<typeof inspect> | undefined;
  readonly at: number;
}

const initialState: DevtoolsScreensWorldState = {
  timeline: emptyTimeline(),
  declared: {},
  catalogue: [],
  roles: {},
  structural: undefined,
  at: 100,
};

export interface WorldShape {
  readonly state: Ref.Ref<DevtoolsScreensWorldState>;
}

export class World extends Context.Service<World, WorldShape>()(
  "features/devtools-screens/World",
) {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      return World.of({ state: yield* Ref.make(initialState) });
    }),
  );
}

const readState = Effect.fn("devtools-screens.readState")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

const patch = Effect.fn("devtools-screens.patch")(function* (
  fn: (s: DevtoolsScreensWorldState) => Partial<DevtoolsScreensWorldState>,
) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...fn(s) }));
});

const decisionFor = (at: number, policy: Policy): StoredRecord => {
  const evaluationId = `ev-${at}`;
  const record = new DecisionRecord({
    evaluationId,
    at,
    subjectId: makeSubjectId("alice"),
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
  });
  return stampRecord(record, "Server");
};

/** Ingests one more decision against `policy`, refreshing the derived catalogue. */
const ingestDecision = Effect.fn("devtools-screens.ingestDecision")(function* (policy: Policy) {
  const s = yield* readState();
  const at = s.at + 1;
  const timeline = ingest(s.timeline, decisionFor(at, policy));
  yield* patch(() => ({ timeline, at, catalogue: catalogueOf(timeline, s.declared) }));
});

describeFeature(feature, World.layer, ({ Before, Given, When, Then }) => {
  Before(function* () {
    const { state } = yield* World;
    yield* Ref.set(state, initialState);
  });

  // -------------------------------------------------------------------------
  // Given
  // -------------------------------------------------------------------------

  Given("a decision against the {string} policy", function* (name: string) {
    yield* ingestDecision(named(name));
  });

  Given("another decision against the {string} policy", function* (name: string) {
    yield* ingestDecision(named(name));
  });

  Given("a decision against an {string} policy", function* (name: string) {
    yield* ingestDecision(named(name));
  });

  // Built separately on purpose: the grouping must be structural, not by
  // reference, or two components building one policy inline would be two rows.
  Given("a decision against a separately built {string} policy", function* (_name: string) {
    yield* ingestDecision(allOf([hasPermission(read)]));
  });

  Given("the application declares a policy {string} that has never run", function* (name: string) {
    const s = yield* readState();
    const declared = {
      ...s.declared,
      policies: { ...s.declared.policies, [name]: hasPermission(write) },
    };
    yield* patch(() => ({ declared, catalogue: catalogueOf(s.timeline, declared) }));
  });

  Given("the application declares that same policy as {string}", function* (name: string) {
    const s = yield* readState();
    const declared = {
      ...s.declared,
      policies: { ...s.declared.policies, [name]: allOf([hasPermission(read)]) },
    };
    yield* patch(() => ({ declared, catalogue: catalogueOf(s.timeline, declared) }));
  });

  Given("the {string} policy", function* (name: string) {
    yield* patch(() => ({ structural: inspect(named(name), undefined) }));
  });

  Given("a role {string} granting {string}", function* (name: string, key: string) {
    const s = yield* readState();
    yield* patch(() => ({
      roles: { ...s.roles, [name]: role({ name, permissions: [keyed(key)] }) },
    }));
  });

  Given(
    "a role {string} granting {string} and inheriting {string}",
    function* (name: string, key: string, parent: string) {
      const s = yield* readState();
      const inherited = s.roles[parent];
      yield* patch(() => ({
        roles: {
          ...s.roles,
          [name]: role({
            name,
            permissions: [keyed(key)],
            inherits: inherited === undefined ? [] : [inherited],
          }),
        },
      }));
    },
  );

  Given("no application layer at all", function* () {
    // Nothing to do: `wiringReport` reads every port through `serviceOption`, so
    // it runs with no layer and reports what it found.
  });

  Given("a port that nothing ever calls", function* () {
    // `EvaluationId` is in `EvaluationServices` and is reached through the
    // service, never through the counted resolver path — so nothing increments a
    // metric for it, whatever else the process has run.
  });

  // -------------------------------------------------------------------------
  // When
  // -------------------------------------------------------------------------

  When("it is viewed structurally", function* () {
    // `inspect(policy, undefined)` is what the explorer renders, and the screen
    // shows it with `showStatus={false}`.
  });

  // -------------------------------------------------------------------------
  // Then
  // -------------------------------------------------------------------------

  Then("the catalogue lists {int} policy/policies", function* (expected: number) {
    const s = yield* readState();
    assert.equal(s.catalogue.length, expected);
  });

  Then("that policy shows {int} decisions", function* (expected: number) {
    const s = yield* readState();
    assert.equal(s.catalogue[0]?.count, expected);
  });

  Then("{string} shows {int} decisions", function* (label: string, expected: number) {
    const s = yield* readState();
    assert.equal(s.catalogue.find((entry) => entry.label === label)?.count, expected);
  });

  Then("the catalogue names it {string}", function* (expected: string) {
    const s = yield* readState();
    assert.equal(s.catalogue[0]?.label, expected);
  });

  Then("no node carries a verdict", function* () {
    const s = yield* readState();
    assert.ok(s.structural !== undefined);
    // Every node is `NeverResolved` in the model — which is why the screen is
    // rendered with `showStatus={false}` rather than trusting the value to read
    // correctly in both places.
    assert.ok(flattenTree(s.structural).every((node) => node.status === "NeverResolved"));
  });

  Then("{string} shows {string} as own", function* (roleName: string, key: string) {
    const s = yield* readState();
    const subject = s.roles[roleName];
    assert.ok(subject !== undefined);
    const grant = roleSummary(subject).grants.find((g) => g.permission === key);
    assert.deepEqual([...(grant?.path ?? [])], [roleName]);
  });

  Then(
    "{string} shows {string} via {string}",
    function* (roleName: string, key: string, parent: string) {
      const s = yield* readState();
      const subject = s.roles[roleName];
      assert.ok(subject !== undefined);
      const grant = roleSummary(subject).grants.find((g) => g.permission === key);
      assert.deepEqual([...(grant?.path ?? [])], [roleName, parent]);
    },
  );

  Then(
    "the permissions shown for {string} are exactly the set that decides",
    function* (roleName: string) {
      const s = yield* readState();
      const subject = s.roles[roleName];
      assert.ok(subject !== undefined);
      assert.deepEqual(
        new Set(roleSummary(subject).grants.map((g) => g.permission)),
        flattenPermissions(subject),
      );
    },
  );

  Then("the wiring report marks {string} as required", function* (port: string) {
    const report = yield* wiringReport;
    assert.equal(report.ports.find((entry) => entry.port === port)?.required, true);
  });

  Then("the wiring report marks {string} as optional", function* (port: string) {
    const report = yield* wiringReport;
    assert.equal(report.ports.find((entry) => entry.port === port)?.required, false);
  });

  Then("it does not appear in the port activity", function* () {
    const activity = yield* portActivity;
    // Asserted as an absence rather than as an empty list: the metric registry is
    // process-wide, which is exactly what the panel tells a reader, so other
    // scenarios in this suite have already counted calls into it. A test that
    // assumed an empty registry would be asserting the opposite of the
    // documented behaviour.
    assert.equal(
      activity.find((entry) => entry.port === "EvaluationId"),
      undefined,
    );
  });
});
