/**
 * The decision stream's types (ARCH-60): a frame whose `synced` has no `id`, a
 * frame a reader receives is one a writer sent, and both directions are told how
 * a record crosses — `encodeRecord` and `decodeRecord` are required, so neither
 * end can fall back on a codec of core's choosing.
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import type * as Scope from "effect/Scope";
import type * as Stream from "effect/Stream";
import { decodeDecisionStream, encodeDecisionStream } from "../src/index.ts";
import type {
  DecisionLog,
  DecisionStreamFrame,
  DecisionStreamRead,
  ReceivedFrame,
  StoredRecord,
} from "../src/index.ts";

declare const log: DecisionLog;
declare const frames: Stream.Stream<ReceivedFrame>;
declare const encodeRecord: (record: StoredRecord) => Effect.Effect<Option.Option<string>>;
declare const decodeRecord: (data: string) => Effect.Effect<Option.Option<StoredRecord>>;

test("a frame is the two-member union: a record frame has an id, synced has none", () => {
  expect<DecisionStreamFrame>().type.toBe<
    | { readonly event: "backlog" | "message"; readonly id: string; readonly data: string }
    | { readonly event: "synced"; readonly id?: undefined; readonly data: string }
  >();
  expect<{ event: "synced"; id: string; data: string }>().type.not.toBeAssignableTo<DecisionStreamFrame>();
  expect<{ event: "backlog"; data: string }>().type.not.toBeAssignableTo<DecisionStreamFrame>();
  expect<{ event: "error"; id: string; data: string }>().type.not.toBeAssignableTo<DecisionStreamFrame>();
});

test("a frame a writer sends is a frame a reader receives, so the round trip needs no mapping", () => {
  expect<DecisionStreamFrame>().type.toBeAssignableTo<ReceivedFrame>();
});

test("encodeRecord is required, and the frames cannot fail and need nothing", () => {
  expect(encodeDecisionStream).type.toBeCallableWith(log, { encodeRecord });
  expect(encodeDecisionStream).type.not.toBeCallableWith(log, {});
  expect(encodeDecisionStream).type.not.toBeCallableWith(log);
  expect(encodeDecisionStream(log, { encodeRecord })).type.toBe<Stream.Stream<DecisionStreamFrame>>();
});

test("decodeRecord is required, and decoding needs a Scope and cannot fail", () => {
  expect(decodeDecisionStream).type.toBeCallableWith(frames, { decodeRecord });
  expect(decodeDecisionStream).type.toBeCallableWith(frames, { decodeRecord, syncTimeout: "1 second" });
  expect(decodeDecisionStream).type.not.toBeCallableWith(frames, { syncTimeout: "1 second" });
  expect(decodeDecisionStream).type.not.toBeCallableWith(frames);
  expect(decodeDecisionStream(frames, { decodeRecord })).type.toBe<
    Effect.Effect<DecisionStreamRead, never, Scope.Scope>
  >();
});

test("a read's backlog is optional: absent is not empty", () => {
  expect<DecisionStreamRead>().type.toBe<{
    readonly backlog?: ReadonlyArray<StoredRecord>;
    readonly live: Stream.Stream<StoredRecord>;
  }>();
});
