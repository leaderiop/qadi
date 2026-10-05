/**
 * `decisionStreamRoute` takes something that can `read` (ARCH-11 D-11-i): a
 * `DecisionLog`, or a structural fake — and no longer a bare record stream,
 * which could carry neither a backlog nor an environment.
 */
import { expect, test } from "tstyche";
import type * as Stream from "effect/Stream";
import { hasPermission, permission } from "@qadi/core";
import type { DecisionLog, DecisionLogReader, SinkRecord } from "@qadi/core";
import { decisionStreamRoute, frame } from "../src/DecisionStreamRoute.ts";

const read = permission("devtools", "read");
const policy = hasPermission(read);
declare const log: DecisionLog;
declare const reader: DecisionLogReader;
declare const stream: Stream.Stream<SinkRecord>;

test("a DecisionLog is a valid third argument", () => {
  expect(decisionStreamRoute).type.toBeCallableWith(read, policy, log);
  expect(decisionStreamRoute).type.toBeCallableWith(read, policy, reader);
});

test("a bare record stream is not", () => {
  expect(decisionStreamRoute).type.not.toBeCallableWith(read, policy, stream);
});

test("frame names its event from a closed set", () => {
  expect(frame).type.toBeCallableWith("backlog");
  expect(frame).type.toBeCallableWith("message");
  expect(frame).type.not.toBeCallableWith("synced");
});
