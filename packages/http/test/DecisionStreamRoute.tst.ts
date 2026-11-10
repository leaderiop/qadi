/**
 * `decisionStreamRoute` takes something that can `read` (ARCH-11 D-11-i): a
 * `DecisionLog`, or a structural fake — and no longer a bare record stream,
 * which could carry neither a backlog nor an environment.
 */
import { expect, test } from "tstyche";
import type * as Stream from "effect/Stream";
import { hasPermission, permission } from "@qadi/core";
import type { DecisionLog, DecisionLogReader, SinkRecord } from "@qadi/core";
import { sseText } from "../src/DecisionLogHttp.ts";
import { decisionStreamRoute } from "../src/DecisionStreamRoute.ts";

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

// `frame` was removed (ARCH-60): a frame is core's `DecisionStreamFrame` now, and the
// route writes one through `sseText`. A record frame names its event from a closed set
// and carries an id; `synced` carries none.
test("a written frame names its event from a closed set", () => {
  expect(sseText).type.toBeCallableWith({ event: "backlog", id: "1.1", data: "" });
  expect(sseText).type.toBeCallableWith({ event: "message", id: "1.1", data: "" });
  expect(sseText).type.toBeCallableWith({ event: "synced", data: "" });
  expect(sseText).type.not.toBeCallableWith({ event: "synced", id: "1.1", data: "" });
  expect(sseText).type.not.toBeCallableWith({ event: "backlog", data: "" });
  expect(sseText).type.not.toBeCallableWith({ event: "other", id: "1.1", data: "" });
});
