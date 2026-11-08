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
import { hasPermission, permission } from "@qadi/core";
import type { DecisionLog, SinkRecordNotEncodable } from "@qadi/core";
import { decisionBacklogRoute } from "../src/DecisionBacklogRoute.ts";
import type { DecisionStreamOptions } from "../src/DecisionStreamRoute.ts";

const read = permission("devtools", "read");
const policy = hasPermission(read);
declare const log: DecisionLog;
declare const picked: Pick<DecisionStreamOptions, "onRefused">;
declare const stream: DecisionStreamOptions;

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
