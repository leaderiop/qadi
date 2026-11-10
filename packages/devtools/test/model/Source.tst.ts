/**
 * The `Source` seam's types (ARCH-11 D-11-c): a `DecisionLog` is a `Source` as
 * it is, with no adapter, and the old two-field shape is not one — a consumer
 * that ran `backlog` and then `live` independently could lose what happened
 * between them.
 */
import { expect, test } from "tstyche";
import type * as Duration from "effect/Duration";
import type * as Effect from "effect/Effect";
import type * as Stream from "effect/Stream";
import type { DecisionLog, DecisionStreamRead, StoredRecord } from "@qadi/core";
import { sourceFromEventSource } from "../../src/model/Source.ts";
import type { DecisionEventSource, MalformedReason, Source, SourceRead } from "../../src/model/Source.ts";

test("a DecisionLog is a Source", () => {
  expect<DecisionLog>().type.toBeAssignableTo<Source>();
});

test("the old backlog-effect-plus-live shape is not a Source", () => {
  expect<{
    readonly backlog: Effect.Effect<ReadonlyArray<StoredRecord>>;
    readonly live: Stream.Stream<StoredRecord>;
  }>().type.not.toBeAssignableTo<Source>();
});

// ARCH-60 moved the prelude's rules into core's `decodeDecisionStream`; the
// adapter's exported signature is what it was.
test("sourceFromEventSource's options and result are unchanged", () => {
  expect(sourceFromEventSource).type.toBe<
    (options: {
      readonly url: string;
      readonly withCredentials?: boolean;
      readonly syncTimeout?: Duration.Input;
      readonly open?: (url: string, withCredentials: boolean) => DecisionEventSource;
      readonly onMalformed?: (frame: string, reason: MalformedReason) => void;
      readonly onDisconnect?: () => void;
    }) => Source
  >();
});

test("core's decoded read is a SourceRead", () => {
  expect<DecisionStreamRead>().type.toBeAssignableTo<SourceRead>();
});
