/**
 * The one genuine differential property this package has (ticket #10's
 * resolution): staging-present and staging-absent configurations of the same
 * `AuditDecisionSinkLive` pipeline, driven by the same sequence of
 * `SinkRecord`s and the same scripted write outcomes, must produce identical
 * *committed* `AuditEntry` sequences. Staging must be provably non-observable
 * in the happy path — only additive to recoverability, per ticket #5.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "effect/testing/FastCheck";
import { DecisionSink } from "@qadi/core";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import { decisionRecord, obligationRecord } from "./helpers.ts";
import type { SinkRecord } from "@qadi/core";

const records: FastCheck.Arbitrary<SinkRecord> = FastCheck.oneof(
  FastCheck.tuple(FastCheck.string({ minLength: 1, maxLength: 8 }), FastCheck.integer({ min: 0, max: 10_000 })).map(
    ([evaluationId, at]) => decisionRecord({ evaluationId, at }),
  ),
  FastCheck.tuple(FastCheck.string({ minLength: 1, maxLength: 8 }), FastCheck.integer({ min: 0, max: 10_000 })).map(
    ([evaluationId, at]) => obligationRecord({ evaluationId, at }),
  ),
);

const runPipeline = (
  sequence: ReadonlyArray<SinkRecord>,
  wireStaging: boolean,
): Effect.Effect<ReadonlyArray<{ readonly evaluationId: string; readonly _tag: string }>> =>
  Effect.gen(function* () {
    const { layer: trail, written } = AuditTrailPortTest();
    const staging = AuditStagingPortTest();

    const program = Effect.gen(function* () {
      const sink = yield* DecisionSink;
      for (const record of sequence) yield* sink.record(record);
    }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail));

    yield* (wireStaging ? program.pipe(Effect.provide(staging.layer)) : program);
    return written().map((entry) => ({
      evaluationId: entry.record.evaluationId,
      _tag: entry.record._tag,
    }));
  });

describe("PROPERTY: staging is non-observable in the happy path", () => {
  it.effect("the same sequence of evaluations produces the same committed rows, staged or not", () =>
    Effect.gen(function* () {
      const sequences = FastCheck.sample(FastCheck.array(records, { minLength: 0, maxLength: 12 }), {
        numRuns: 30,
        seed: 4096,
      });

      for (const sequence of sequences) {
        const withoutStaging = yield* runPipeline(sequence, false);
        const withStaging = yield* runPipeline(sequence, true);
        assert.deepStrictEqual(
          withStaging,
          withoutStaging,
          JSON.stringify({ sequence: sequence.map((r) => r._tag) }),
        );
      }
    }));
});
