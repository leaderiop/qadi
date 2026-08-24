/**
 * JOB 2 ledger — E2.1 … E2.8, plus the exhaustive-domain sweep.
 *
 * The timeline is the one module that absorbs a merged, unordered, duplicating
 * feed, and everything downstream is allowed to assume it did. So the tests
 * below are mostly about what arrives *badly*: backwards, twice, half, or with a
 * time nobody can order.
 *
 * Pure functions over arrays throughout — no fibers, no streams, no clock.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  DEFAULT_TIMELINE_CAPACITY,
  emptyTimeline,
  ingest,
  ingestAll,
  type TimelineEntry,
} from "../../src/model/Timeline.ts";
import { decisionRecord, failedRecord, obligationRecord } from "../helpers.ts";

const ids = (entries: ReadonlyArray<TimelineEntry>): ReadonlyArray<string> =>
  entries.map((e) => e.evaluationId);

const fold = (records: ReadonlyArray<Parameters<typeof ingest>[1]>, capacity?: number) =>
  ingestAll(emptyTimeline(capacity === undefined ? undefined : { capacity }), records);

describe("emptyTimeline", () => {
  it("defaults to the ring's capacity, so a reader is not bounded by two numbers", () => {
    assert.strictEqual(emptyTimeline().capacity, DEFAULT_TIMELINE_CAPACITY);
  });

  it("accepts zero — a coherent 'keep nothing'", () => {
    assert.strictEqual(emptyTimeline({ capacity: 0 }).capacity, 0);
  });

  it("rejects a capacity that is not a non-negative integer", () => {
    for (const capacity of [-1, 1.5, Number.NaN]) {
      assert.throws(
        () => emptyTimeline({ capacity }),
        /non-negative integer/,
        `capacity ${capacity}`,
      );
    }
  });
});

describe("ordering", () => {
  // E2.1
  it("orders records that arrive backwards", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "c", at: 300 }),
      decisionRecord({ evaluationId: "a", at: 100 }),
      decisionRecord({ evaluationId: "b", at: 200 }),
    ]);
    assert.deepStrictEqual(ids(timeline.entries), ["a", "b", "c"]);
  });

  // E2.2 — the tie is broken by arrival, and it must not flicker.
  it("breaks an identical `at` by arrival order, deterministically", () => {
    const records = [
      decisionRecord({ evaluationId: "first", at: 100 }),
      decisionRecord({ evaluationId: "second", at: 100 }),
      decisionRecord({ evaluationId: "third", at: 100 }),
    ];
    assert.deepStrictEqual(ids(fold(records).entries), ["first", "second", "third"]);

    // Folding the same records again must not reorder anything.
    const twice = ingestAll(fold(records), records);
    assert.deepStrictEqual(ids(twice.entries), ["first", "second", "third"]);
  });

  // E2.8 — a merged timeline reads clocks it does not control.
  it("orders zero, negative and infinite times without surprise", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "inf", at: Number.POSITIVE_INFINITY }),
      decisionRecord({ evaluationId: "zero", at: 0 }),
      decisionRecord({ evaluationId: "neg", at: -1 }),
      decisionRecord({ evaluationId: "negInf", at: Number.NEGATIVE_INFINITY }),
    ]);
    assert.deepStrictEqual(ids(timeline.entries), ["negInf", "neg", "zero", "inf"]);
  });

  it("sorts an unorderable time last rather than leaving the order undefined", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "nan", at: Number.NaN }),
      decisionRecord({ evaluationId: "real", at: 5 }),
      decisionRecord({ evaluationId: "alsoNan", at: Number.NaN }),
    ]);
    // Known times first, then unknown ones in arrival order. The point is that
    // it is *defined*: a comparator returning 0 for NaN leaves the sort
    // implementation-specific and the view reorders itself between renders.
    assert.deepStrictEqual(ids(timeline.entries), ["real", "nan", "alsoNan"]);
  });

  /**
   * The case that actually exercises the tie-break.
   *
   * A tie among records that arrive *in order* is preserved by almost any
   * comparator, correct or not — appending to a sorted array and re-sorting
   * leaves it alone. Only a tie whose members arrive out of order can tell a
   * real tie-break from an accident, and mutation testing is what said so:
   * three separate mutants of the comparator survived the in-order test above.
   */
  it("a late arrival that ties an existing entry lands in arrival order", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "early", at: 100 }),
      decisionRecord({ evaluationId: "late", at: 200 }),
      decisionRecord({ evaluationId: "tiesEarly", at: 100 }),
    ]);
    assert.deepStrictEqual(ids(timeline.entries), ["early", "tiesEarly", "late"]);
  });

  it("several late ties keep arriving in order", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "a", at: 100 }),
      decisionRecord({ evaluationId: "z", at: 900 }),
      decisionRecord({ evaluationId: "b", at: 100 }),
      decisionRecord({ evaluationId: "c", at: 100 }),
      decisionRecord({ evaluationId: "d", at: 100 }),
    ]);
    assert.deepStrictEqual(ids(timeline.entries), ["a", "b", "c", "d", "z"]);
  });

  it("unorderable times that arrive around a known one keep arrival order", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "n1", at: Number.NaN }),
      decisionRecord({ evaluationId: "real", at: 5 }),
      decisionRecord({ evaluationId: "n2", at: Number.NaN }),
      decisionRecord({ evaluationId: "n3", at: Number.NaN }),
      decisionRecord({ evaluationId: "alsoReal", at: 1 }),
    ]);
    assert.deepStrictEqual(ids(timeline.entries), ["alsoReal", "real", "n1", "n2", "n3"]);
  });
});

describe("identity and duplication", () => {
  // E2.4
  it("the same record delivered twice is one row", () => {
    const record = decisionRecord({ evaluationId: "a", at: 100 });
    assert.strictEqual(fold([record, record, record]).entries.length, 1);
  });

  /**
   * A duplicate returns the *same* timeline, not an equal one.
   *
   * This is the property the dedupe guards actually earn, and asserting only
   * the row count could not see it: rebuilding an identical entry produces the
   * same rows and a new object, so a React shell subscribed through
   * `useSyncExternalStore` would re-render on every replayed frame. Both guards
   * looked like dead code to the mutation gate until this test existed.
   */
  it("a duplicate returns the identical timeline, so a subscriber does not re-render", () => {
    const decision = decisionRecord({ evaluationId: "a", at: 100 });
    const outcome = obligationRecord({ evaluationId: "a", at: 101 });
    const orphan = obligationRecord({ evaluationId: "ghost", at: 100 });

    const settled = fold([decision, outcome, orphan]);

    assert.strictEqual(ingest(settled, decision), settled, "a repeated decision");
    assert.strictEqual(ingest(settled, outcome), settled, "a repeated outcome");
    assert.strictEqual(ingest(settled, orphan), settled, "a repeated orphan");
  });

  // E2.3 — the pairing story depends on this NOT collapsing.
  it("one id in two environments is two rows", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
      decisionRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
    ]);
    assert.strictEqual(timeline.entries.length, 2);
    assert.deepStrictEqual(
      timeline.entries.map((e) => e.environment),
      ["Server", "Client"],
    );
  });

  // E2.6 — replicas.
  it("one id across three environments keeps all three", () => {
    const timeline = fold(
      ["replica-1", "replica-2", "replica-3"].map((environment, index) =>
        decisionRecord({ evaluationId: "ev-7", at: 100 + index, environment }),
      ),
    );
    assert.strictEqual(timeline.entries.length, 3);
  });

  // E3.7 seen from the timeline's side: same id, same process, two evaluations.
  it("one id reused in one environment is two rows, not a silent merge", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "reused", at: 100 }),
      decisionRecord({ evaluationId: "reused", at: 200 }),
    ]);
    assert.strictEqual(timeline.entries.length, 2);
  });

  /**
   * The hard half of E2.3. Two processes agreeing on the millisecond is not
   * exotic in a merged replica set, and if `environment` dropped out of the
   * identity these two would collapse into one row — losing exactly the
   * distinction the merge exists to preserve. The version of this test that
   * used different times could not see that; a mutant removing the environment
   * comparison survived it.
   */
  it("one id in two environments at the same instant is still two rows", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
      decisionRecord({ evaluationId: "ev-7", at: 100, environment: "Client" }),
    ]);
    assert.strictEqual(timeline.entries.length, 2);
  });
});

describe("joining a decision to its obligation outcome", () => {
  // E2.5
  it("a decision and its outcome are one entry, not two rows", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "ev-7", at: 100 }),
      obligationRecord({ evaluationId: "ev-7", at: 101 }),
    ]);

    assert.strictEqual(timeline.entries.length, 1);
    const entry = timeline.entries[0];
    assert.strictEqual(entry?._tag, "TimelineDecision");
    if (entry?._tag !== "TimelineDecision") return;
    assert.strictEqual(entry.obligations?.outcome, "Discharged");
  });

  // E3.2 — the outcome is emitted from a different module, after evaluate
  // returned, so it can win the race to the reader.
  it("an outcome that arrives before its decision still joins", () => {
    const timeline = fold([
      obligationRecord({ evaluationId: "ev-7", at: 101 }),
      decisionRecord({ evaluationId: "ev-7", at: 100 }),
    ]);

    assert.strictEqual(timeline.entries.length, 1);
    const entry = timeline.entries[0];
    assert.strictEqual(entry?._tag, "TimelineDecision");
    if (entry?._tag !== "TimelineDecision") return;
    assert.strictEqual(entry.obligations?.outcome, "Discharged");
  });

  // E3.3 — kept, because "something was refused and I cannot show you what"
  // is a fact a reviewer needs.
  it("an outcome whose decision never arrives is shown, not dropped", () => {
    const timeline = fold([
      obligationRecord({ evaluationId: "ghost", at: 101, outcome: "Refused" }),
    ]);

    assert.strictEqual(timeline.entries.length, 1);
    assert.strictEqual(timeline.entries[0]?._tag, "TimelineOrphan");
  });

  it("a duplicated outcome does not double-attach", () => {
    const outcome = obligationRecord({ evaluationId: "ev-7", at: 101 });
    const timeline = fold([decisionRecord({ evaluationId: "ev-7", at: 100 }), outcome, outcome]);
    assert.strictEqual(timeline.entries.length, 1);
  });

  it("a duplicated orphan does not become two rows", () => {
    const outcome = obligationRecord({ evaluationId: "ghost", at: 101 });
    assert.strictEqual(fold([outcome, outcome]).entries.length, 1);
  });

  it("an outcome joins the decision from its own process, not another's", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
      decisionRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
      obligationRecord({ evaluationId: "ev-7", at: 201, environment: "Client" }),
    ]);

    const server = timeline.entries.find((e) => e.environment === "Server");
    const client = timeline.entries.find((e) => e.environment === "Client");
    assert.strictEqual(server?._tag === "TimelineDecision" ? server.obligations : "x", undefined);
    assert.strictEqual(
      client?._tag === "TimelineDecision" ? client.obligations?.outcome : undefined,
      "Discharged",
    );
  });

  /**
   * An orphan and its decision sharing an instant.
   *
   * The dedupe check and the orphan lookup read the same three fields, so if
   * dedupe stopped distinguishing an orphan from a decision this would be
   * rejected as a duplicate and the row would stay orphaned forever — an
   * evaluation permanently displayed as "outcome without a decision". A mutant
   * doing exactly that survived until this case existed.
   */
  it("an outcome and its decision sharing an instant still join", () => {
    const timeline = fold([
      obligationRecord({ evaluationId: "ev-7", at: 100 }),
      decisionRecord({ evaluationId: "ev-7", at: 100 }),
    ]);

    assert.strictEqual(timeline.entries.length, 1);
    assert.strictEqual(timeline.entries[0]?._tag, "TimelineDecision");
  });

  it("two outcomes with no decision are two orphans, not a malformed row", () => {
    const timeline = fold([
      obligationRecord({ evaluationId: "ghost", at: 100 }),
      obligationRecord({ evaluationId: "ghost", at: 200, outcome: "Refused" }),
    ]);

    // An orphan must never be mistaken for a decision to attach to: doing so
    // would build a `TimelineDecision` with no decision in it.
    assert.strictEqual(timeline.entries.length, 2);
    assert.isTrue(timeline.entries.every((e) => e._tag === "TimelineOrphan"));
  });

  it("a later, different outcome replaces the one on the row", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "ev-7", at: 100 }),
      obligationRecord({ evaluationId: "ev-7", at: 101, outcome: "Discharged" }),
      obligationRecord({ evaluationId: "ev-7", at: 102, outcome: "Refused" }),
    ]);

    assert.strictEqual(timeline.entries.length, 1);
    const entry = timeline.entries[0];
    assert.strictEqual(entry?._tag, "TimelineDecision");
    if (entry?._tag !== "TimelineDecision") return;
    // The gate's current state, not its first state — a row showing
    // "Discharged" for an evaluation that ended up refused is a row that
    // disagrees with what the caller saw.
    assert.strictEqual(entry.obligations?.outcome, "Refused");
  });

  it("a reused id attaches the outcome to the latest decision", () => {
    const timeline = fold([
      decisionRecord({ evaluationId: "reused", at: 100 }),
      decisionRecord({ evaluationId: "reused", at: 200 }),
      obligationRecord({ evaluationId: "reused", at: 201 }),
    ]);

    const [older, newer] = timeline.entries;
    assert.strictEqual(older?._tag === "TimelineDecision" ? older.obligations : "x", undefined);
    assert.isDefined(newer?._tag === "TimelineDecision" ? newer.obligations : undefined);
  });
});

describe("capacity", () => {
  // E2.7
  it("drops the oldest, exactly as decisionSinkRing evicts", () => {
    const timeline = fold(
      ["a", "b", "c", "d"].map((id, index) =>
        decisionRecord({ evaluationId: id, at: 100 + index }),
      ),
      2,
    );
    assert.deepStrictEqual(ids(timeline.entries), ["c", "d"]);
  });

  it("a capacity of zero keeps nothing and does not throw", () => {
    const timeline = fold([decisionRecord({ evaluationId: "a" })], 0);
    assert.deepStrictEqual(timeline.entries, []);
  });

  /**
   * Under capacity, nothing is dropped — and the offset must be clamped to get
   * there. An unclamped `slice(length - capacity)` goes negative and slices
   * from the *end*, silently keeping the wrong rows while still looking like a
   * bounded log.
   */
  it("under capacity every row is kept", () => {
    const timeline = fold(
      ["a", "b"].map((id, index) => decisionRecord({ evaluationId: id, at: 100 + index })),
      10,
    );
    assert.deepStrictEqual(ids(timeline.entries), ["a", "b"]);
  });

  it("an out-of-order arrival evicts by time, not by arrival", () => {
    // The oldest *record* goes, not the earliest-delivered one — otherwise a
    // late-arriving old record would evict the newest thing on screen.
    const timeline = fold(
      [
        decisionRecord({ evaluationId: "new", at: 900 }),
        decisionRecord({ evaluationId: "old", at: 100 }),
        decisionRecord({ evaluationId: "mid", at: 500 }),
      ],
      2,
    );
    assert.deepStrictEqual(ids(timeline.entries), ["mid", "new"]);
  });
});

/**
 * The exhaustive-domain sweep, in the idiom `Predicate.test.ts` uses for
 * INV-QD-018: enumerate a closed product of the record shapes that can occur and
 * assert the timeline's invariants across all of it, rather than spot-checking
 * the three cases whoever wrote the test happened to think of.
 */
describe("every record shape, folded every way", () => {
  const outcomes = ["allow", "deny", "failed"] as const;
  const environments = ["Server", "Client", "edge-3"] as const;
  const caches = ["hit", "coalesced", "miss", undefined] as const;
  const duties = [true, false] as const;

  const domain = outcomes.flatMap((outcome) =>
    environments.flatMap((environment) =>
      caches.flatMap((cache) =>
        duties.map((withDuties) => ({ outcome, environment, cache, withDuties })),
      ),
    ),
  );

  const recordsFor = (
    spec: (typeof domain)[number],
    index: number,
  ): ReadonlyArray<Parameters<typeof ingest>[1]> => {
    const evaluationId = `ev-${index}`;
    const at = 1_000 + index * 10;
    const decision =
      spec.outcome === "failed"
        ? failedRecord({ evaluationId, at, environment: spec.environment })
        : decisionRecord({
          evaluationId,
          at,
          environment: spec.environment,
          ...(spec.cache === undefined ? {} : { cache: spec.cache }),
        });

    return spec.withDuties
      ? [decision, obligationRecord({ evaluationId, at: at + 1, environment: spec.environment })]
      : [decision];
  };

  const all = domain.flatMap(recordsFor);

  it("covers the whole product", () => {
    assert.strictEqual(domain.length, 3 * 3 * 4 * 2);
  });

  it("every decision becomes exactly one entry, duties joined rather than listed", () => {
    const timeline = fold(all, all.length);
    assert.strictEqual(timeline.entries.length, domain.length);
    assert.isTrue(timeline.entries.every((e) => e._tag === "TimelineDecision"));
  });

  it("is ordered, whatever order it was fed in", () => {
    const forward = fold(all, all.length);
    const reversed = fold([...all].reverse(), all.length);

    const times = (t: typeof forward) => t.entries.map((e) => e.at);
    assert.deepStrictEqual(times(forward), [...times(forward)].sort((a, b) => a - b));
    assert.deepStrictEqual(ids(reversed.entries), ids(forward.entries));
  });

  it("is idempotent: delivering everything twice changes nothing", () => {
    const once = fold(all, all.length);
    const twice = ingestAll(once, all);

    assert.deepStrictEqual(ids(twice.entries), ids(once.entries));
    assert.strictEqual(twice.entries.length, once.entries.length);
  });

  it("interleaving two deliveries changes nothing", () => {
    const shuffled = all.flatMap((record, index) =>
      index % 2 === 0 ? [record] : [all[all.length - 1 - index] ?? record, record],
    );
    const interleaved = fold(shuffled, all.length);
    const plain = fold(all, all.length);

    assert.deepStrictEqual(ids(interleaved.entries), ids(plain.entries));
  });

  it("an ERROR outcome is never rendered as a decision that denied", () => {
    const timeline = fold(all, all.length);
    const failures = timeline.entries.filter(
      (e) => e._tag === "TimelineDecision" && e.decision.outcome._tag === "Failed",
    );
    assert.strictEqual(failures.length, domain.filter((s) => s.outcome === "failed").length);
  });
});
