/**
 * The public options shapes did not change when the decision log's HTTP wire
 * moved into one module (ARCH-50, D-04): every caller that passed a hook, a
 * declared `Pick<DecisionStreamOptions, "onRefused">` or a declared
 * `DecisionStreamOptions` still compiles, and a hook of the wrong shape still
 * does not.
 *
 * These pins pass on the tree before the move, too; their job is to keep
 * passing after it.
 */
import { expect, test } from "tstyche";
import type * as Duration from "effect/Duration";
import type * as Stream from "effect/Stream";
import { hasPermission, permission } from "@qadi/core";
import type { DecisionLog, LogEntry, SinkRecordNotEncodable } from "@qadi/core";
import { decisionBacklogRoute } from "../src/DecisionBacklogRoute.ts";
import { decisionFrames, decisionStreamRoute } from "../src/DecisionStreamRoute.ts";
import type { DecisionStreamOptions } from "../src/DecisionStreamRoute.ts";

const read = permission("devtools", "read");
const policy = hasPermission(read);
declare const log: DecisionLog;
declare const picked: Pick<DecisionStreamOptions, "onRefused">;
declare const stream: DecisionStreamOptions;
declare const entries: {
  readonly backlog: ReadonlyArray<LogEntry>;
  readonly live: Stream.Stream<LogEntry>;
};

test("decisionBacklogRoute takes a hook as an inline option", () => {
  expect(decisionBacklogRoute).type.toBeCallableWith(read, policy, log);
  expect(decisionBacklogRoute).type.toBeCallableWith(read, policy, log, {
    onRefused: (refusal: SinkRecordNotEncodable) => void refusal.evaluationId,
  });
});

test("decisionBacklogRoute still takes the stream's declared option shapes", () => {
  expect(decisionBacklogRoute).type.toBeCallableWith(read, policy, log, picked);
  expect(decisionBacklogRoute).type.toBeCallableWith(read, policy, log, stream);
});

test("decisionBacklogRoute refuses a hook whose parameter is not a refusal", () => {
  expect(decisionBacklogRoute).type.not.toBeCallableWith(read, policy, log, {
    onRefused: (refusal: number) => void refusal,
  });
});

test("decisionFrames takes a read, and the same declared hook options", () => {
  // Asserted on the call's result: tstyche's own `toBeCallableWith` checks the call as a
  // bare statement, which the Effect language service reports as a floating `Stream`.
  expect(decisionFrames(entries)).type.toBe<Stream.Stream<string>>();
  expect(decisionFrames(entries, picked)).type.toBe<Stream.Stream<string>>();
});

test("DecisionStreamOptions still carries reauth and onRefused", () => {
  expect<DecisionStreamOptions["onRefused"]>().type.toBe<((refusal: SinkRecordNotEncodable) => void) | undefined>();
  expect<DecisionStreamOptions["reauth"]>().type.toBe<{ readonly interval: Duration.Input } | undefined>();
});

test("decisionStreamRoute takes a declared DecisionStreamOptions", () => {
  expect(decisionStreamRoute).type.toBeCallableWith(read, policy, log, stream);
});
