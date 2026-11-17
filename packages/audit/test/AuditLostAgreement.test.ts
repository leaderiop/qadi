/**
 * Pins that whether an audit entry was lost is one answer, however it is read.
 *
 * On the phase base three mappings decided it independently (the durability, the lost word, the line level),
 * agreeing by accident. This file is green before 48-04 merges them into one row and after. Its warning leg
 * covers only the unwritten leaves, because `Written.CommitFailed` and `Refused` also warn without being lost.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { durabilityOf } from "../src/AuditWriteOutcome.ts";
import type { LeafPath } from "./observeLeaf.ts";
import { LEAF_PATHS, observeLeaf } from "./observeLeaf.ts";

/** Each leaf, keyed by it so dropping one is a compile error: whether it loses the entry, and whether it is unwritten. */
const LEAVES: { readonly [P in LeafPath]: { readonly lost: boolean; readonly unwritten: boolean } } = {
  Refused: { lost: false, unwritten: false },
  "Written.NotWired": { lost: false, unwritten: false },
  "Written.StageFailed": { lost: false, unwritten: false },
  "Written.Committed": { lost: false, unwritten: false },
  "Written.CommitFailed": { lost: false, unwritten: false },
  "WriteFailed.NotWired": { lost: true, unwritten: true },
  "WriteFailed.Staged": { lost: false, unwritten: true },
  "WriteFailed.StageFailed": { lost: true, unwritten: true },
  "Skipped.NotWired": { lost: true, unwritten: true },
  "Skipped.Staged": { lost: false, unwritten: true },
  "Skipped.StageFailed": { lost: true, unwritten: true },
};

const ALL: ReadonlyArray<LeafPath> = LEAF_PATHS;
const UNWRITTEN: ReadonlyArray<LeafPath> = ALL.filter((leaf) => LEAVES[leaf].unwritten);

it("the lists cover the eleven leaves, six of them unwritten", () => {
  assert.strictEqual(new Set(ALL).size, 11);
  assert.strictEqual(UNWRITTEN.length, 6);
});

describe("durability, the lost counter and the span agree on every leaf (D-06)", () => {
  for (const leaf of ALL) {
    it.effect(`${leaf}: lost is ${LEAVES[leaf].lost} by durability, counter and span`, () =>
      Effect.gen(function* () {
        const o = yield* observeLeaf(leaf, { onRefused: false });
        const lostMoved =
          o.counters["lost.write_failed.not_wired"] +
          o.counters["lost.write_failed.failed"] +
          o.counters["lost.skipped_open.not_wired"] +
          o.counters["lost.skipped_open.failed"];
        assert.strictEqual(durabilityOf(o.outcome) === "Lost", LEAVES[leaf].lost);
        assert.strictEqual(lostMoved, LEAVES[leaf].lost ? 1 : 0);
        assert.strictEqual(o.span["qadi.audit.durability"] === "Lost", LEAVES[leaf].lost);
      }),
    );
  }
});

describe("over the six unwritten leaves, a warning is exactly a lost entry (D-06a)", () => {
  for (const leaf of UNWRITTEN) {
    it.effect(`${leaf}: one line, a warning exactly when the entry is lost`, () =>
      Effect.gen(function* () {
        const o = yield* observeLeaf(leaf, { onRefused: false });
        assert.strictEqual(o.lines.length, 1);
        assert.strictEqual(o.lines[0]?.level === "Warn", LEAVES[leaf].lost);
      }),
    );
  }
});

describe("two leaves warn without losing the entry (D-06a)", () => {
  it.effect("Written.CommitFailed: warns, durability Trail, no lost counter", () =>
    Effect.gen(function* () {
      const o = yield* observeLeaf("Written.CommitFailed", { onRefused: false });
      assert.deepStrictEqual(
        o.lines.map((l) => l.level),
        ["Warn"],
      );
      assert.strictEqual(durabilityOf(o.outcome), "Trail");
      assert.strictEqual(o.span["qadi.audit.durability"], "Trail");
      assert.strictEqual(o.counters["lost.write_failed.not_wired"], 0);
      assert.strictEqual(o.counters["lost.write_failed.failed"], 0);
      assert.strictEqual(o.counters["lost.skipped_open.not_wired"], 0);
      assert.strictEqual(o.counters["lost.skipped_open.failed"], 0);
    }));

  it.effect("Refused: warns through core's report, durability Refused, no lost counter", () =>
    Effect.gen(function* () {
      const o = yield* observeLeaf("Refused", { onRefused: false });
      assert.deepStrictEqual(
        o.lines.map((l) => l.level),
        ["Warn"],
      );
      assert.strictEqual(durabilityOf(o.outcome), "Refused");
      assert.strictEqual(o.span["qadi.audit.durability"], "Refused");
      assert.strictEqual(o.counters["lost.write_failed.not_wired"], 0);
      assert.strictEqual(o.counters["lost.write_failed.failed"], 0);
      assert.strictEqual(o.counters["lost.skipped_open.not_wired"], 0);
      assert.strictEqual(o.counters["lost.skipped_open.failed"], 0);
    }));
});
