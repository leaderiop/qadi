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
import type * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import { hasPermission, permission } from "@qadi/core";
import type { DecisionLog, SinkRecordNotEncodable, StoredRecord } from "@qadi/core";
import { decisionBacklogRoute } from "../src/DecisionBacklogRoute.ts";
import { recordData } from "../src/DecisionLogHttp.ts";
import { decisionStreamRoute } from "../src/DecisionStreamRoute.ts";
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

// `decisionFrames` was removed (ARCH-60); the stream's record encoder, `recordData`, is what
// takes the hook options now, and the route passes them through unchanged.
test("the stream's record encoder takes no options, and the same declared hook options", () => {
  type RecordData = (record: StoredRecord) => Effect.Effect<Option.Option<string>>;
  expect(recordData()).type.toBe<RecordData>();
  expect(recordData(picked)).type.toBe<RecordData>();
  expect(recordData(stream)).type.toBe<RecordData>();
});

test("DecisionStreamOptions still carries reauth and onRefused", () => {
  expect<DecisionStreamOptions["onRefused"]>().type.toBe<((refusal: SinkRecordNotEncodable) => void) | undefined>();
  expect<DecisionStreamOptions["reauth"]>().type.toBe<{ readonly interval: Duration.Input } | undefined>();
});

test("decisionStreamRoute takes a declared DecisionStreamOptions", () => {
  expect(decisionStreamRoute).type.toBeCallableWith(read, policy, log, stream);
});
