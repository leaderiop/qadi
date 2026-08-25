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
 * Nothing here forks a fiber that could block. Every live stream is finite and
 * every backlog is an `Effect` that completes, which is the constraint
 * `packages/devtools/test/model/Source.test.ts` states for the same reason.
 */
import { Before, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import {
  AttributeResolverNone,
  currentSubjectLayer,
  decisionSinkRing,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  evaluate,
  hasPermission,
  makeSubject,
  permission,
  RelationshipResolverNever,
} from "@qadi/core";
import type { Decision, StoredRecord } from "@qadi/core";
import { emptyTimeline, ingestAll, mergeSources, pairedEntries } from "@qadi/devtools";
import type { Source } from "@qadi/devtools";

const read = permission("doc", "read");
const alice = makeSubject({ id: "alice", permissions: ["doc:read"] });
/** The same subject without the grant — how a re-check comes out differently. */
const stripped = makeSubject({ id: "alice" });

const ports = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
);

let sources: Array<Source> = [];
let merged: Source | undefined;
let serverDecision: Decision | undefined;

Before({ tags: "@merged-sources" }, () => {
  sources = [];
  merged = undefined;
  serverDecision = undefined;
});

/** A source that answers for the past and nothing else — a ring's shape. */
const pastOnly = (records: ReadonlyArray<StoredRecord>): Source => ({
  backlog: Effect.succeed(records),
  live: Stream.empty,
});

/** A source that answers only for what happens next — a feed's, or SSE's. */
const futureOnly = (records: ReadonlyArray<StoredRecord>): Source => ({
  live: Stream.fromArray(records),
});

const stamped = (at: number, environment: string): StoredRecord => ({
  _tag: "Obligations",
  evaluationId: `ev-${at}`,
  at,
  outcome: "NotRequired",
  obligationIds: [],
  environment,
});

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

Given("a server decided {string} for {string}", (question: string, who: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      assert.equal(question, "doc:read");
      assert.equal(who, "alice");
      const server = yield* decideInto("Server", alice);
      serverDecision = server.decision;
      sources.push(pastOnly(server.records));
    }),
  ));

/**
 * The re-check carries the server's evaluation id, which is the whole mechanism.
 * A browser minting a fresh id produces two rows nothing can relate.
 */
Given("the browser re-checked the same question", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      assert.ok(serverDecision !== undefined, "the server has not decided yet");
      const client = yield* decideInto("Client", alice, serverDecision.evaluationId);
      sources.push(pastOnly(client.records));
    }),
  ));

Given("the browser re-checked and disagreed", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      assert.ok(serverDecision !== undefined, "the server has not decided yet");
      const client = yield* decideInto("Client", stripped, serverDecision.evaluationId);
      sources.push(pastOnly(client.records));
    }),
  ));

Given("two producers that keep no history", () => {
  sources.push(futureOnly([]), futureOnly([]));
});

Given("a producer that keeps no history", () => {
  sources.push(futureOnly([]));
});

Given("a producer whose records are at {int} and {int}", (first: number, second: number) => {
  sources.push(pastOnly([stamped(first, "Server"), stamped(second, "Server")]));
});

Given("a producer whose record is at {int}", (at: number) => {
  sources.push(pastOnly([stamped(at, "Client")]));
});

Given("a producer streaming {int} records live", (count: number) => {
  const offset = sources.length * 100;
  sources.push(
    futureOnly(Array.from({ length: count }, (_, index) => stamped(offset + index, "Server"))),
  );
});

When("the two sources are merged", () => {
  merged = mergeSources(sources);
});

const past = (): Promise<ReadonlyArray<StoredRecord>> => {
  assert.ok(merged !== undefined, "nothing has been merged");
  const backlog = merged.backlog;
  assert.ok(backlog !== undefined, "the merged source cannot answer for the past");
  return Effect.runPromise(backlog);
};

Then("the timeline holds {int} rows", async (count: number) => {
  const timeline = ingestAll(emptyTimeline(), await past());
  assert.equal(timeline.entries.length, count);
});

Then("the rows are one pair", async () => {
  const rows = pairedEntries(ingestAll(emptyTimeline(), await past()));
  assert.equal(rows.length, 2);
  // Origin and Continuation, not two Alones: the roles come from time, and a
  // record with no partner would be Alone.
  assert.deepEqual(rows.map((row) => row.role).sort(), ["Continuation", "Origin"]);
});

Then("the pair does not disagree", async () => {
  const rows = pairedEntries(ingestAll(emptyTimeline(), await past()));
  assert.ok(rows.every((row) => !row.disagrees));
});

Then("the pair disagrees", async () => {
  const rows = pairedEntries(ingestAll(emptyTimeline(), await past()));
  assert.ok(rows.some((row) => row.disagrees));
});

Then("the merged source cannot answer for the past", () => {
  assert.ok(merged !== undefined, "nothing has been merged");
  // Absent, not empty. An empty array would say a history was looked at.
  assert.equal(merged.backlog, undefined);
});

Then("the merged source can answer for the past", () => {
  assert.ok(merged !== undefined, "nothing has been merged");
  assert.notEqual(merged.backlog, undefined);
});

Then("the merged rows are ordered {int}, {int}, {int}", async (a: number, b: number, c: number) => {
  assert.deepEqual((await past()).map((record) => record.at), [a, b, c]);
});

Then("the merged past holds {int} records", async (count: number) => {
  assert.equal((await past()).length, count);
});

Then("{int} records arrive live", async (count: number) => {
  assert.ok(merged !== undefined, "nothing has been merged");
  const got = await Effect.runPromise(Stream.runCollect(merged.live));
  assert.equal(Array.from(got).length, count);
});
