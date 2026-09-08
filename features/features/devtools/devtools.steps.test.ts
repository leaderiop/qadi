/**
 * Steps for `devtools.feature`.
 *
 * A dedicated `Context.Service` World, scoped to this Feature only — these
 * scenarios are about a *timeline of records* rather than about one evaluation,
 * the same reasoning as `port-calls.steps.test.ts`.
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
  allOf,
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicateNone,
  Decided,
  DecisionHistoryUnknown,
  DecisionRecord,
  Deny,
  evaluate,
  EvaluationIdLive,
  Failed,
  fromRoles,
  hasPermission,
  makeSubjectId,
  MissingResource,
  ObligationRecord,
  permission,
  RelationshipResolverNever,
  role,
  SignatureHistoryNone,
  stampRecord,
} from "@qadi/core";
import type { StoredRecord, Trace } from "@qadi/core";
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

const feature = await loadFeature(fileURLToPath(new URL("./devtools.feature", import.meta.url)));

const read = permission("doc", "read");
const write = permission("doc", "write");
const reader = role({ name: "reader", permissions: [read] });
const alice = fromRoles({ id: "alice", roles: [reader] });

const services = Layer.mergeAll(
  AttributeResolverNone,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  SignatureHistoryNone,
);

const trace = (allowed: boolean): Trace => ({
  policyTag: "HasPermission",
  allowed,
  ...(allowed ? {} : { reason: "the subject does not hold doc:read" }),
  children: [],
  obligations: [],
});

// Unstamped, and taking an `evaluationId` override, so the re-check steps
// below can build a second record for the same evaluation without spreading
// an already-stamped `StoredRecord` — spreading a `Data.TaggedClass` instance
// into a plain object literal silently drops its prototype.
const buildDecision = (at: number, allowed: boolean, evaluationId?: string): DecisionRecord => {
  const id = evaluationId ?? `ev-${at}`;
  return new DecisionRecord({
    evaluationId: id,
    at,
    subjectId: makeSubjectId("alice"),
    policy: hasPermission(read),
    outcome: new Decided({
      decision: allowed
        ? new Allow({
            evaluationId: id,
            subjectId: makeSubjectId("alice"),
            durationMillis: 1,
            trace: trace(true),
            visibleFields: undefined,
            obligations: [],
          })
        : new Deny({
            evaluationId: id,
            subjectId: makeSubjectId("alice"),
            durationMillis: 1,
            trace: trace(false),
            reason: "the subject does not hold doc:read",
          }),
    }),
  });
};

const decisionAt = (at: number, environment: string, allowed: boolean): StoredRecord =>
  stampRecord(buildDecision(at, allowed), environment);

const obligationAt = (outcome: string, at: number, evaluationId: string): StoredRecord =>
  stampRecord(
    new ObligationRecord({
      evaluationId,
      at,
      outcome: outcome === "Refused" ? "Refused" : "Discharged",
      obligationIds: ["audit.log"],
    }),
    "Server",
  );

interface DevtoolsWorldState {
  readonly timeline: Timeline;
  readonly last: StoredRecord | undefined;
  readonly inspected: ReturnType<typeof inspectEntry>;
}

const initialState: DevtoolsWorldState = {
  timeline: emptyTimeline(),
  last: undefined,
  inspected: undefined,
};

export interface WorldShape {
  readonly state: Ref.Ref<DevtoolsWorldState>;
}

export class World extends Context.Service<World, WorldShape>()("features/devtools/World") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      return World.of({ state: yield* Ref.make(initialState) });
    }),
  );
}

const readState = Effect.fn("devtools.readState")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

const patch = Effect.fn("devtools.patch")(function* (
  fn: (s: DevtoolsWorldState) => Partial<DevtoolsWorldState>,
) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...fn(s) }));
});

const accept = Effect.fn("devtools.accept")(function* (record: StoredRecord) {
  yield* patch((s) => ({ timeline: ingest(s.timeline, record), last: record }));
});

describeFeature(feature, World.layer, ({ Before, Given, When, Then }) => {
  Before(function* () {
    const { state } = yield* World;
    yield* Ref.set(state, initialState);
  });

  // -------------------------------------------------------------------------
  // Given
  // -------------------------------------------------------------------------

  Given("a decision recorded at {int} on {string}", function* (at: number, environment: string) {
    yield* accept(decisionAt(at, environment, true));
  });

  Given(
    "an allowed decision recorded at {int} on {string}",
    function* (at: number, environment: string) {
      yield* accept(decisionAt(at, environment, true));
    },
  );

  Given(
    "a denied decision recorded at {int} on {string}",
    function* (at: number, environment: string) {
      yield* accept(decisionAt(at, environment, false));
    },
  );

  Given(
    "a failed evaluation recorded at {int} on {string}",
    function* (at: number, environment: string) {
      const record = new DecisionRecord({
        evaluationId: `ev-${at}`,
        at,
        subjectId: makeSubjectId("alice"),
        policy: hasPermission(read),
        // Not a `Deny` with a reason: a lookup broke, so there is no verdict.
        outcome: new Failed({ error: new MissingResource({ attribute: "doc.ownerId" }) }),
      });
      yield* accept(stampRecord(record, environment));
    },
  );

  Given("that same decision is delivered again", function* () {
    const s = yield* readState();
    if (s.last !== undefined) yield* accept(s.last);
  });

  Given(
    "the same evaluation re-checked at {int} on {string}",
    function* (at: number, environment: string) {
      yield* accept(stampRecord(buildDecision(at, true, "ev-100"), environment));
    },
  );

  Given(
    "the same evaluation denied at {int} on {string}",
    function* (at: number, environment: string) {
      yield* accept(stampRecord(buildDecision(at, false, "ev-100"), environment));
    },
  );

  Given(
    "an obligation outcome {string} recorded at {int} for that evaluation",
    function* (outcome: string, at: number) {
      yield* accept(obligationAt(outcome, at, `ev-${at - 1}`));
    },
  );

  Given(
    "an obligation outcome {string} recorded at {int} for {string}",
    function* (outcome: string, at: number, evaluationId: string) {
      yield* accept(obligationAt(outcome, at, evaluationId));
    },
  );

  Given(
    "a policy requiring all of {string} and {string}",
    function* (_first: string, _second: string) {
      const policy = allOf([hasPermission(write), hasPermission(read)]);
      const decision = yield* evaluate(policy).pipe(
        Effect.provide(Layer.mergeAll(currentSubjectLayer(alice), services)),
      );
      const record = new DecisionRecord({
        evaluationId: "ev-100",
        at: 100,
        subjectId: decision.subjectId,
        policy,
        outcome: new Decided({ decision }),
      });
      yield* accept(stampRecord(record, "Server"));
    },
  );

  // -------------------------------------------------------------------------
  // When
  // -------------------------------------------------------------------------

  When("the timeline inspects that decision", function* () {
    const s = yield* readState();
    const entry = s.timeline.entries[0];
    yield* patch(() => ({ inspected: entry === undefined ? undefined : inspectEntry(entry) }));
  });

  // -------------------------------------------------------------------------
  // Then
  // -------------------------------------------------------------------------

  Then("the timeline reads {string}", function* (expected: string) {
    const s = yield* readState();
    assert.equal(s.timeline.entries.map((e) => e.evaluationId).join(", "), expected);
  });

  Then("the timeline has {int} row(s)", function* (expected: number) {
    const s = yield* readState();
    assert.equal(s.timeline.entries.length, expected);
  });

  Then("the row on {string} is the origin", function* (environment: string) {
    const s = yield* readState();
    const row = pairedEntries(s.timeline).find((p) => p.entry.environment === environment);
    assert.equal(row?.role, "Origin");
  });

  Then("the row on {string} continues it", function* (environment: string) {
    const s = yield* readState();
    const row = pairedEntries(s.timeline).find((p) => p.entry.environment === environment);
    assert.equal(row?.role, "Continuation");
  });

  Then("both rows are marked as disagreeing", function* () {
    const s = yield* readState();
    const rows = pairedEntries(s.timeline);
    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.disagrees));
  });

  Then("the row reads {string}", function* (expected: string) {
    const s = yield* readState();
    const entry = s.timeline.entries[0];
    assert.ok(entry !== undefined);
    assert.equal(verdictOf(entry), expected);
  });

  Then("the row does not read {string}", function* (unexpected: string) {
    const s = yield* readState();
    const entry = s.timeline.entries[0];
    assert.ok(entry !== undefined);
    assert.notEqual(verdictOf(entry), unexpected);
  });

  Then(
    "the counts are {int} decisions, {int} denied and {int} errored",
    function* (decisions: number, denies: number, errors: number) {
      const s = yield* readState();
      const counts = countsOf(s.timeline.entries);
      assert.equal(counts.decisions, decisions);
      assert.equal(counts.denies, denies);
      assert.equal(counts.errors, errors);
    },
  );

  Then("the first branch is {string}", function* (expected: string) {
    const s = yield* readState();
    assert.ok(s.inspected !== undefined);
    assert.equal(s.inspected.children[0]?.status, expected);
  });

  Then("the second branch is {string}", function* (expected: string) {
    const s = yield* readState();
    assert.ok(s.inspected !== undefined);
    assert.equal(s.inspected.children[1]?.status, expected);
    // Everything beneath an unexamined node is unexamined too.
    assert.ok(
      flattenTree(s.inspected)
        .filter((node) => node.path.startsWith("$.1"))
        .every((node) => node.status === "NeverResolved"),
    );
  });

  Then("that row has no requirement tree", function* () {
    const s = yield* readState();
    const entry = s.timeline.entries[0];
    assert.ok(entry !== undefined);
    // Nothing, rather than a tree of unexamined nodes: an empty requirement tree
    // reads as "no requirements", which reads as "allowed".
    assert.equal(inspectEntry(entry), undefined);
  });
});
