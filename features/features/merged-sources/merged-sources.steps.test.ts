/**
 * Steps for `merged-sources.feature`.
 *
 * The two-producer scenarios run **real evaluations** through real sinks rather
 * than building records by hand, because the property under acceptance is that a
 * server's decision and a browser's re-check — two `evaluate` calls in two
 * processes — can be shown as one pair. Hand-built records would share an id
 * because this file gave them one, which proves nothing about the chain that has
 * to carry it: `EvaluateOptions.evaluationId` into the second evaluation, out
 * through its sink, and into `pairedEntries`.
 *
 * The ordering and backlog scenarios do build records directly. There the
 * property is about `Source` and nothing else, and an evaluator in the way would
 * only make the timestamps harder to control.
 *
 * A dedicated `Context.Service` World, scoped to this Feature only — the same
 * reasoning as `port-calls.steps.test.ts`.
 */
import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Stream from "effect/Stream";
import {
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicateNone,
  decisionSinkRing,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  evaluate,
  hasPermission,
  makeSubject,
  ObligationRecord,
  permission,
  RelationshipResolverNever,
  SignatureHistoryNone,
  stampRecord,
} from "@qadi/core";
import type { Decision, StoredRecord } from "@qadi/core";
import { emptyTimeline, ingestAll, mergeSources, pairedEntries } from "@qadi/devtools";
import type { Source } from "@qadi/devtools";

const feature = await loadFeature(
  fileURLToPath(new URL("./merged-sources.feature", import.meta.url)),
);

const read = permission("doc", "read");
const alice = makeSubject({ id: "alice", permissions: ["doc:read"] });
/** The same subject without the grant — how a re-check comes out differently. */
const stripped = makeSubject({ id: "alice" });

const ports = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);

/** A source that answers for the past and nothing else — a ring's shape. */
const pastOnly = (records: ReadonlyArray<StoredRecord>): Source => ({
  backlog: Effect.succeed(records),
  live: Stream.empty,
});

/** A source that answers only for what happens next — a feed's, or SSE's. */
const futureOnly = (records: ReadonlyArray<StoredRecord>): Source => ({
  live: Stream.fromArray(records),
});

const stamped = (at: number, environment: string): StoredRecord =>
  stampRecord(
    new ObligationRecord({
      evaluationId: `ev-${at}`,
      at,
      outcome: "NotRequired",
      obligationIds: [],
    }),
    environment,
  );

/** One real evaluation, recorded by its own ring, and the ring's snapshot. */
const decideInto = (
  environment: string,
  subject: typeof alice,
  evaluationId?: string,
): Effect.Effect<{ readonly decision: Decision; readonly records: ReadonlyArray<StoredRecord> }> =>
  Effect.gen(function* () {
    const ring = decisionSinkRing({ environment });
    const decision = yield* evaluate(
      hasPermission(read),
      evaluationId === undefined ? undefined : { evaluationId },
    ).pipe(
      Effect.provide(Layer.mergeAll(ports, currentSubjectLayer(subject), ring.layer)),
      Effect.orDie,
    );
    return { decision, records: yield* ring.snapshot };
  });

interface MergedSourcesWorldState {
  readonly sources: ReadonlyArray<Source>;
  readonly merged: Source | undefined;
  readonly serverDecision: Decision | undefined;
}

const initialState: MergedSourcesWorldState = {
  sources: [],
  merged: undefined,
  serverDecision: undefined,
};

export interface WorldShape {
  readonly state: Ref.Ref<MergedSourcesWorldState>;
}

export class World extends Context.Service<World, WorldShape>()("features/merged-sources/World") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      return World.of({ state: yield* Ref.make(initialState) });
    }),
  );
}

const read_ = Effect.fn("merged-sources.read")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

const patch = Effect.fn("merged-sources.patch")(function* (
  fn: (s: MergedSourcesWorldState) => Partial<MergedSourcesWorldState>,
) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...fn(s) }));
});

const pushSource = Effect.fn("merged-sources.pushSource")(function* (source: Source) {
  yield* patch((s) => ({ sources: [...s.sources, source] }));
});

const past = Effect.fn("merged-sources.past")(function* () {
  const s = yield* read_();
  assert.ok(s.merged !== undefined, "nothing has been merged");
  const backlog = s.merged.backlog;
  assert.ok(backlog !== undefined, "the merged source cannot answer for the past");
  return yield* backlog;
});

describeFeature(feature, World.layer, ({ Before, Given, When, Then }) => {
  Before(function* () {
    const { state } = yield* World;
    yield* Ref.set(state, initialState);
  });

  // -------------------------------------------------------------------------
  // Given
  // -------------------------------------------------------------------------

  Given("a server decided {string} for {string}", function* (question: string, who: string) {
    assert.equal(question, "doc:read");
    assert.equal(who, "alice");
    const server = yield* decideInto("Server", alice);
    yield* patch((s) => ({
      serverDecision: server.decision,
      sources: [...s.sources, pastOnly(server.records)],
    }));
  });

  /**
   * The re-check carries the server's evaluation id, which is the whole mechanism.
   * A browser minting a fresh id produces two rows nothing can relate.
   */
  Given("the browser re-checked the same question", function* () {
    const s = yield* read_();
    assert.ok(s.serverDecision !== undefined, "the server has not decided yet");
    const client = yield* decideInto("Client", alice, s.serverDecision.evaluationId);
    yield* pushSource(pastOnly(client.records));
  });

  Given("the browser re-checked and disagreed", function* () {
    const s = yield* read_();
    assert.ok(s.serverDecision !== undefined, "the server has not decided yet");
    const client = yield* decideInto("Client", stripped, s.serverDecision.evaluationId);
    yield* pushSource(pastOnly(client.records));
  });

  Given("two producers that keep no history", function* () {
    yield* patch((s) => ({ sources: [...s.sources, futureOnly([]), futureOnly([])] }));
  });

  Given("a producer that keeps no history", function* () {
    yield* pushSource(futureOnly([]));
  });

  Given(
    "a producer whose records are at {int} and {int}",
    function* (first: number, second: number) {
      yield* pushSource(pastOnly([stamped(first, "Server"), stamped(second, "Server")]));
    },
  );

  Given("a producer whose record is at {int}", function* (at: number) {
    yield* pushSource(pastOnly([stamped(at, "Client")]));
  });

  Given("a producer streaming {int} records live", function* (count: number) {
    const s = yield* read_();
    const offset = s.sources.length * 100;
    yield* pushSource(
      futureOnly(Array.from({ length: count }, (_, index) => stamped(offset + index, "Server"))),
    );
  });

  // -------------------------------------------------------------------------
  // When
  // -------------------------------------------------------------------------

  When("the two sources are merged", function* () {
    const s = yield* read_();
    yield* patch(() => ({ merged: mergeSources(s.sources) }));
  });

  // -------------------------------------------------------------------------
  // Then
  // -------------------------------------------------------------------------

  Then("the timeline holds {int} rows", function* (count: number) {
    const timeline = ingestAll(emptyTimeline(), yield* past());
    assert.equal(timeline.entries.length, count);
  });

  Then("the rows are one pair", function* () {
    const rows = pairedEntries(ingestAll(emptyTimeline(), yield* past()));
    assert.equal(rows.length, 2);
    // Origin and Continuation, not two Alones: the roles come from time, and a
    // record with no partner would be Alone.
    assert.deepEqual(
      rows.map((row) => row.role).sort(),
      ["Continuation", "Origin"],
    );
  });

  Then("the pair does not disagree", function* () {
    const rows = pairedEntries(ingestAll(emptyTimeline(), yield* past()));
    assert.ok(rows.every((row) => !row.disagrees));
  });

  Then("the pair disagrees", function* () {
    const rows = pairedEntries(ingestAll(emptyTimeline(), yield* past()));
    assert.ok(rows.some((row) => row.disagrees));
  });

  Then("the merged source cannot answer for the past", function* () {
    const s = yield* read_();
    assert.ok(s.merged !== undefined, "nothing has been merged");
    // Absent, not empty. An empty array would say a history was looked at.
    assert.equal(s.merged.backlog, undefined);
  });

  Then("the merged source can answer for the past", function* () {
    const s = yield* read_();
    assert.ok(s.merged !== undefined, "nothing has been merged");
    assert.notEqual(s.merged.backlog, undefined);
  });

  Then(
    "the merged rows are ordered {int}, {int}, {int}",
    function* (a: number, b: number, c: number) {
      assert.deepEqual(
        (yield* past()).map((record) => record.at),
        [a, b, c],
      );
    },
  );

  Then("the merged past holds {int} records", function* (count: number) {
    assert.equal((yield* past()).length, count);
  });

  Then("{int} records arrive live", function* (count: number) {
    const s = yield* read_();
    assert.ok(s.merged !== undefined, "nothing has been merged");
    const got = yield* Stream.runCollect(s.merged.live);
    assert.equal(Array.from(got).length, count);
  });
});
