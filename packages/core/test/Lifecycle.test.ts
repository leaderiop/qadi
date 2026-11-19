import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import type { Question } from "../src/Question.ts";
import { DecisionCache, decisionCacheLayer } from "../src/DecisionCache.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import { ask } from "../src/Lifecycle.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const policy = P.hasPermission(read);
const alice = subjectWith({ id: "alice", permissions: ["doc:read"] });
const doc = { id: "doc-1", owner: "alice" };

describe("ask — one question, built once", () => {
  it.effect("the question it returns is the cache key and the record's request half", () =>
    Effect.gen(function* () {
      const keys: Array<Question> = [];
      const records: Array<SinkRecord> = [];
      // A host cache wraps core's, which walks the question it is given
      // (ADR-QD-174); this one records each key it is asked.
      const cache = Layer.effect(
        DecisionCache,
        Effect.gen(function* () {
          const inner = yield* DecisionCache;
          return DecisionCache.of({
            ...inner,
            getOrCompute: (key, options) => {
              keys.push(key);
              return inner.getOrCompute(key, options);
            },
          });
        }),
      ).pipe(Layer.provide(decisionCacheLayer()));
      const sink = Layer.succeed(DecisionSink, {
        record: (record) =>
          Effect.sync(() => {
            records.push(record);
          }),
      });

      const asked = yield* ask(policy, { resource: doc, action: "read" }).pipe(
        Effect.provide(Layer.mergeAll(cache, sink)),
      );

      assert.strictEqual(keys.length, 1);
      assert.isTrue(Equal.equals(asked.question, keys[0]));
      assert.strictEqual(asked.question.subject.id, "alice");
      assert.strictEqual(asked.decision._tag, "Allow");

      const record = records.find((r) => r._tag === "Decision");
      assert.strictEqual(record?._tag, "Decision");
      if (record?._tag !== "Decision") return;
      assert.strictEqual(record.subjectId, asked.question.subject.id);
      assert.strictEqual(record.policy, asked.question.policy);
      assert.deepStrictEqual(record.resource, asked.question.resource);
      assert.strictEqual(record.action, asked.question.action);
    }).pipe(Effect.provide(testLayer(alice))));

  it.effect("an unset action and resource are undefined on the question, not absent", () =>
    Effect.gen(function* () {
      const asked = yield* ask(policy);
      assert.isUndefined(asked.question.resource);
      assert.isUndefined(asked.question.action);
      assert.isTrue(Object.hasOwn(asked.question, "resource"));
      assert.isTrue(Object.hasOwn(asked.question, "action"));
    }).pipe(Effect.provide(testLayer(alice))));
});
