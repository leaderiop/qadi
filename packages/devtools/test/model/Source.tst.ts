/**
 * The `Source` seam's types (ARCH-11 D-11-c): a `DecisionLog` is a `Source` as
 * it is, with no adapter, and the old two-field shape is not one — a consumer
 * that ran `backlog` and then `live` independently could lose what happened
 * between them.
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type * as Stream from "effect/Stream";
import type { DecisionLog, StoredRecord } from "@qadi/core";
import type { Source } from "../../src/model/Source.ts";

test("a DecisionLog is a Source", () => {
  expect<DecisionLog>().type.toBeAssignableTo<Source>();
});

test("the old backlog-effect-plus-live shape is not a Source", () => {
  expect<{
    readonly backlog: Effect.Effect<ReadonlyArray<StoredRecord>>;
    readonly live: Stream.Stream<StoredRecord>;
  }>().type.not.toBeAssignableTo<Source>();
});
