/**
 * Pins what audit emits for every outcome leaf, as literals written on the phase base.
 *
 * ARCH-95's criterion 4 is that audit's observable output is unchanged for existing inputs, which is only
 * checkable against values set down before the change. Every message, annotation set, span and counter
 * record below is typed out, never derived from the projection the phase edits.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { EncodeRefusal } from "@qadi/core";
import { AuditStagingError } from "../src/AuditStagingPort.ts";
import type { LeafPath, SeriesKey } from "./observeLeaf.ts";
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

interface Line {
  readonly level: string;
  readonly message: ReadonlyArray<string>;
  readonly annotations: { readonly [key: string]: unknown };
}

const line = (level: string, message: string): Line => ({
  level,
  message: [message],
  annotations: { evaluationId: "target" },
});

interface LeafRow {
  readonly leaf: LeafPath;
  readonly emits: string;
  readonly stagingKeys: ReadonlyArray<string>;
  readonly lines: Array<Line>;
  readonly durability: string;
  readonly counters: { readonly [K in SeriesKey]: number };
  /** The written entry's row in the trail: 1 for a Written leaf, 0 otherwise. */
  readonly rows: number;
}

const ROWS: ReadonlyArray<LeafRow> = [
  {
    leaf: "Refused",
    emits: "one default warning, no row, encode_failed",
    stagingKeys: [],
    lines: [
      {
        level: "Warn",
        message: ["qadi/audit: a decision record could not be encoded for the audit trail; no row was written"],
        annotations: { "qadi.refusal": "Opaque", "qadi.path": "resource.tags", evaluationId: "target" },
      },
    ],
    durability: "Refused",
    counters: moved("writes.encode_failed"),
    rows: 0,
  },
  {
    leaf: "Written.NotWired",
    emits: "no line, written",
    stagingKeys: ["_tag"],
    lines: [],
    durability: "Trail",
    counters: moved("writes.written"),
    rows: 1,
  },
  {
    leaf: "Written.StageFailed",
    emits: "no line, written and staging.failed",
    stagingKeys: ["_tag"],
    lines: [],
    durability: "Trail",
    counters: moved("writes.written", "staging.failed"),
    rows: 1,
  },
  {
    leaf: "Written.Committed",
    emits: "no line, written and staging.staged",
    stagingKeys: ["_tag"],
    lines: [],
    durability: "Trail",
    counters: moved("writes.written", "staging.staged"),
    rows: 1,
  },
  {
    leaf: "Written.CommitFailed",
    emits: "one warning carrying the store's cause, durable in the trail, no lost counter",
    stagingKeys: ["_tag", "cause"],
    lines: [
      line(
        "Warn",
        "audit staging commit failed: entry is durable in the trail, but its staged copy will remain marked uncommitted in the staging store",
      ),
    ],
    durability: "Trail",
    counters: moved("writes.written", "staging.staged", "staging.commit_failed"),
    rows: 1,
  },
  {
    leaf: "WriteFailed.NotWired",
    emits: "one warning, span Lost, write_failed and lost.write_failed.not_wired",
    stagingKeys: ["_tag"],
    lines: [line("Warn", "audit entry dropped: trail write failed and no staging port wired")],
    durability: "Lost",
    counters: moved("writes.write_failed", "lost.write_failed.not_wired"),
    rows: 0,
  },
  {
    leaf: "WriteFailed.Staged",
    emits: "one info, StagingOnly, no lost counter",
    stagingKeys: ["_tag"],
    lines: [line("Info", "audit entry not written: trail write failed; its staged copy is left for reconciliation")],
    durability: "StagingOnly",
    counters: moved("writes.write_failed", "staging.staged"),
    rows: 0,
  },
  {
    leaf: "WriteFailed.StageFailed",
    emits: "one warning, Lost, lost.write_failed.failed",
    stagingKeys: ["_tag"],
    lines: [line("Warn", "audit entry dropped: trail write failed and staging failed")],
    durability: "Lost",
    counters: moved("writes.write_failed", "staging.failed", "lost.write_failed.failed"),
    rows: 0,
  },
  {
    leaf: "Skipped.NotWired",
    emits: "one warning, Lost, lost.skipped_open.not_wired",
    stagingKeys: ["_tag"],
    lines: [line("Warn", "audit entry dropped: circuit breaker open and no staging port wired")],
    durability: "Lost",
    counters: moved("writes.skipped_open", "staging.skipped_open", "lost.skipped_open.not_wired"),
    rows: 0,
  },
  {
    leaf: "Skipped.Staged",
    emits: "one info, StagingOnly, no lost counter",
    stagingKeys: ["_tag"],
    lines: [line("Info", "audit entry not written: circuit breaker open; its staged copy is left for reconciliation")],
    durability: "StagingOnly",
    counters: moved("writes.skipped_open", "staging.staged"),
    rows: 0,
  },
  {
    leaf: "Skipped.StageFailed",
    emits: "one warning, Lost, lost.skipped_open.failed",
    stagingKeys: ["_tag"],
    lines: [line("Warn", "audit entry dropped: circuit breaker open and staging failed")],
    durability: "Lost",
    counters: moved("writes.skipped_open", "staging.failed_open", "lost.skipped_open.failed"),
    rows: 0,
  },
];

describe("what audit emits for each outcome leaf, written on the phase base (ARCH-95, D-11)", () => {
  for (const row of ROWS) {
    it.effect(`${row.leaf}: ${row.emits}`, () =>
      Effect.gen(function* () {
        // Refused runs without a hook, to see the default warning; every other leaf installs one, so the empty
        // `refusals` below says the hook is never called for a record that was not refused.
        const o = yield* observeLeaf(row.leaf, { onRefused: row.leaf !== "Refused" });
        assert.strictEqual(o.path, row.leaf);
        assert.deepStrictEqual(o.stagingKeys, row.stagingKeys);
        assert.deepStrictEqual(
          o.lines.map((l) => ({ level: l.level, message: l.message, annotations: l.annotations })),
          row.lines,
        );
        assert.deepStrictEqual(o.span, { "qadi.audit.outcome": row.leaf, "qadi.audit.durability": row.durability });
        assert.deepStrictEqual(o.counters, row.counters);
        assert.deepStrictEqual(o.refusals, []);
        assert.strictEqual(o.rows, row.rows);

        if (row.leaf !== "Written.CommitFailed") {
          // Only the commit failure carries a cause; every other line, and the refusal, has none.
          assert.deepStrictEqual(
            o.lines.map((l) => l.cause.reasons.length),
            o.lines.map(() => 0),
          );
          return;
        }
        // The store's reason survives into the line: the warning is the operator's only account of it.
        const found = Cause.findErrorOption(o.lines[0]?.cause ?? Cause.empty);
        assert.isTrue(Option.isSome(found));
        const error = Option.getOrUndefined(found);
        assert.isTrue(error instanceof AuditStagingError);
        if (error instanceof AuditStagingError) assert.strictEqual(error.cause, "commit offline");
      }),
    );
  }

  it.effect("Refused with onRefused: no line, the counter still moves, and the hook gets the refusal", () =>
    Effect.gen(function* () {
      const o = yield* observeLeaf("Refused", { onRefused: true });
      assert.deepStrictEqual(o.lines, []);
      assert.deepStrictEqual(o.counters, moved("writes.encode_failed"));
      assert.strictEqual(o.refusals.length, 1);
      assert.deepStrictEqual(
        o.refusals.map((r) => ({
          recordTag: r.recordTag,
          evaluationId: r.evaluationId,
          refusal: r.refusal,
          isError: r instanceof Error,
        })),
        [
          {
            recordTag: "Decision",
            evaluationId: "target",
            refusal: EncodeRefusal.Opaque({ path: ["resource", "tags"], kind: "Set", brand: "Set" }),
            isError: true,
          },
        ],
      );
    }));
});
