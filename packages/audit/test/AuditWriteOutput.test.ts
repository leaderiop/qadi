/**
 * Pins what audit emits for every outcome leaf, as literals written on the phase base.
 *
 * ARCH-95's criterion 4 is that audit's observable output is unchanged for existing inputs, which is only
 * checkable against values set down before the change. Every message, annotation set, span and counter
 * record below is typed out, never derived from the projection the phase edits.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import type * as Cause from "effect/Cause";
import type { SeriesKey } from "./observeLeaf.ts";
import { observeLeaf } from "./observeLeaf.ts";

const ZERO: { readonly [K in SeriesKey]: number } = {
  "writes.encode_failed": 0,
  "writes.written": 0,
  "writes.write_failed": 0,
  "writes.skipped_open": 0,
  "staging.staged": 0,
  "staging.failed": 0,
  "staging.skipped_open": 0,
  "staging.failed_open": 0,
  "staging.commit_failed": 0,
  "lost.write_failed.not_wired": 0,
  "lost.write_failed.failed": 0,
  "lost.skipped_open.not_wired": 0,
  "lost.skipped_open.failed": 0,
};

/** The full thirteen-series record with these series at 1 and the rest at 0. */
const moved = (...keys: ReadonlyArray<SeriesKey>): { readonly [K in SeriesKey]: number } => {
  const counters = { ...ZERO };
  for (const key of keys) counters[key] = 1;
  return counters;
};

const noReasons = (cause: Cause.Cause<unknown>): void => {
  assert.strictEqual(cause.reasons.length, 0);
};

describe("what audit emits for each outcome leaf, written on the phase base (ARCH-95, D-11)", () => {
  it.effect("WriteFailed.NotWired: one warning, span Lost, write_failed and lost.write_failed.not_wired", () =>
    Effect.gen(function* () {
      const o = yield* observeLeaf("WriteFailed.NotWired", { onRefused: false });
      assert.strictEqual(o.path, "WriteFailed.NotWired");
      assert.deepStrictEqual(o.stagingKeys, ["_tag"]);
      assert.strictEqual(o.lines.length, 1);
      assert.strictEqual(o.lines[0]?.level, "Warn");
      assert.deepStrictEqual(o.lines[0]?.message, [
        "audit entry dropped: trail write failed and no staging port wired",
      ]);
      assert.deepStrictEqual(o.lines[0]?.annotations, { evaluationId: "target" });
      noReasons(o.lines[0]?.cause ?? (yield* Effect.die("no line")));
      assert.deepStrictEqual(o.span, {
        "qadi.audit.outcome": "WriteFailed.NotWired",
        "qadi.audit.durability": "Lost",
      });
      assert.deepStrictEqual(o.counters, moved("writes.write_failed", "lost.write_failed.not_wired"));
      assert.deepStrictEqual(o.refusals, []);
      assert.strictEqual(o.rows, 0);
    }));
});
