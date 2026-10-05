/**
 * The decision log's types: a reader needs only `read`, `read` needs exactly a
 * `Scope`, and nothing a log does can fail — a sink that could fail would hand
 * its failure to the decision that called it (INV-QD-035).
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import type { DecisionLog, DecisionLogRead, DecisionLogReader } from "../src/DecisionLog.ts";
import { makeDecisionLog } from "../src/DecisionLog.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";

test("a DecisionLog is a DecisionLogReader", () => {
  expect<DecisionLog>().type.toBeAssignableTo<DecisionLogReader>();
});

test("read requires exactly a Scope and cannot fail", () => {
  expect<DecisionLog["read"]>().type.toBe<Effect.Effect<DecisionLogRead, never, Scope.Scope>>();
});

test("ingest, snapshot and clear cannot fail and need nothing", () => {
  expect<ReturnType<DecisionLog["ingest"]>>().type.toBe<Effect.Effect<void>>();
  expect<DecisionLog["snapshot"]>().type.toBe<Effect.Effect<ReadonlyArray<import("../src/DecisionRecord.ts").StoredRecord>>>();
  expect<DecisionLog["clear"]>().type.toBe<Effect.Effect<void>>();
  expect<Parameters<DecisionLog["ingest"]>>().type.toBe<[record: SinkRecord, environment?: string]>();
});

test("makeDecisionLog requires an environment and returns an Effect of a log", () => {
  expect(makeDecisionLog({ environment: "Server" })).type.toBe<Effect.Effect<DecisionLog>>();
  expect(makeDecisionLog).type.not.toBeCallableWith({ capacity: 10 });
});
