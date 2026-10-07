/**
 * The decision log: a sink, a backlog and a live stream in one value.
 *
 * Ported from the ring's and the feed's suites, plus what neither could test
 * alone: the handoff between a reader's backlog and its live stream, which the
 * documented ring + feed pairing lost records across (ARCH-11 C9), and ingest
 * reaching live readers (C10).
 *
 * **No test here forks a collector that can wait forever** — the rule
 * `DecisionSinkFeed.test.ts` learned the hard way, when a mutant that killed
 * publishing turned a four-minute mutation run into three hours. Live reads are
 * bounded by count against records already published, ended by a sentinel the
 * test itself writes last, or, where live semantics are genuinely needed, by a
 * wall-clock timeout under `it.live`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Scheduler from "effect/Scheduler";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import * as FastCheck from "fast-check";
import { isAllowed } from "../src/Decision.ts";
import {
  DEFAULT_LOG_CAPACITY,
  DecisionStreamEvent,
  DecisionStreamSynced,
  formatLogCursor,
  makeDecisionLog,
  parseLogCursor,
} from "../src/DecisionLog.ts";
import type { DecisionLog } from "../src/DecisionLog.ts";
import { ObligationRecord, StoredDecisionRecord, StoredObligationRecord } from "../src/DecisionRecord.ts";
import type { StoredRecord } from "../src/DecisionRecord.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { PortReply } from "../src/PortDescription.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const allowed = subjectWith({ permissions: ["doc:read"] });
const policy = P.hasPermission(read);
const brokenAttributes = scriptedPort(attributeResolverPort, () => PortReply.fail("store offline")).layer;

/** Lets other fibers run `n` times: how a scenario places a fiber at a random point. */
const yieldTimes = (n: number) =>
  Effect.forEach(Array.from({ length: n }), () => Effect.yieldNow, { discard: true });

const obligations = (evaluationId: string, at = 1) =>
  new ObligationRecord({ evaluationId, at, outcome: "Discharged", obligationIds: ["o"] });

const ids = (records: ReadonlyArray<StoredRecord>) => records.map((record) => record.evaluationId);

/** The next `n` live records, read from a stream whose records are already published. */
const takeLive = (live: Stream.Stream<StoredRecord>, n: number) =>
  Effect.map(Stream.runCollect(Stream.take(live, n)), (records) => Array.from(records));

describe("makeDecisionLog — stores, stamps, bounds", () => {
  it.effect("stores records and stamps the environment", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });

      yield* evaluate(policy).pipe(Effect.provide(log.layer));

      const stored = yield* log.snapshot;
      assert.strictEqual(stored.length, 1);
      const first = stored[0];
      assert.strictEqual(first?.environment, "Server");
      assert.instanceOf(first, StoredDecisionRecord);
      if (first?._tag === "Decision") assert.strictEqual(first.outcome._tag, "Decided");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("drops the oldest arrival once capacity is reached", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Client", capacity: 2 });

      for (const id of ["a", "b", "c"]) {
        yield* evaluate(policy, { evaluationId: id }).pipe(Effect.provide(log.layer));
      }

      assert.deepStrictEqual(ids(yield* log.snapshot), ["b", "c"]);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("holds exactly `capacity` records, not one more", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server", capacity: 1 });

      yield* log.ingest(obligations("a"));
      yield* log.ingest(obligations("b"));

      assert.deepStrictEqual(ids(yield* log.snapshot), ["b"]);
    }));

  it.effect("clear empties the backlog but not the sequence", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("before"));

      yield* Effect.scoped(
        Effect.gen(function* () {
          const reader = yield* log.read;
          yield* log.clear;
          assert.deepStrictEqual(yield* log.snapshot, []);
          // A reader subscribed before the clear still receives what follows it,
          // and nothing it already had: its high-water mark stays valid.
          yield* log.ingest(obligations("after"));
          assert.deepStrictEqual(ids(reader.backlog), ["before"]);
          assert.deepStrictEqual(ids(yield* takeLive(reader.live, 1)), ["after"]);
        }),
      );

      // A reader opened after the clear sees only what followed it.
      const later = yield* Effect.scoped(Effect.map(log.read, (r) => r.backlog));
      assert.deepStrictEqual(ids(later), ["after"]);
    }));

  it.effect("records failures as well as decisions", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });

      yield* Effect.result(
        evaluate(P.hasAttribute("clearance", M.gte(3))).pipe(Effect.provide(log.layer)),
      );

      const first = (yield* log.snapshot)[0];
      assert.strictEqual(first?._tag, "Decision");
      if (first?._tag === "Decision") assert.strictEqual(first.outcome._tag, "Failed");
    }).pipe(
      Effect.provide(testLayer(subjectWith({}), { AttributeResolver: brokenAttributes })),
    ));

  it.effect("a snapshot is a copy, not a live view", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });

      yield* log.ingest(obligations("a"));
      const before = yield* log.snapshot;
      yield* log.ingest(obligations("b"));

      assert.strictEqual(before.length, 1);
      assert.strictEqual((yield* log.snapshot).length, 2);
    }));

  it("rejects 0, negative, fractional and NaN capacity, and names zero's reason", () => {
    for (const capacity of [0, -1, 1.5, Number.NaN]) {
      assert.throws(
        () => makeDecisionLog({ environment: "Server", capacity }),
        /positive integer/,
        `capacity ${capacity}`,
      );
    }
    assert.throws(() => makeDecisionLog({ environment: "Server", capacity: 0 }), /zero is refused/);
  });

  it.effect("defaults to DEFAULT_LOG_CAPACITY, and says what it was built with", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Edge" });
      assert.strictEqual(log.capacity, DEFAULT_LOG_CAPACITY);
      assert.strictEqual(log.environment, "Edge");
      assert.strictEqual((yield* makeDecisionLog({ environment: "x", capacity: 3 })).capacity, 3);
    }));
});

describe("makeDecisionLog — live", () => {
  it.effect("a reader receives records made after `read`", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });

      yield* Effect.scoped(
        Effect.gen(function* () {
          const reader = yield* log.read;
          assert.deepStrictEqual(reader.backlog, []);
          yield* evaluate(policy, { evaluationId: "a" }).pipe(Effect.provide(log.layer));
          yield* evaluate(policy, { evaluationId: "b" }).pipe(Effect.provide(log.layer));
          const live = yield* takeLive(reader.live, 2);
          assert.deepStrictEqual(ids(live), ["a", "b"]);
          assert.strictEqual(live[0]?.environment, "Server");
        }),
      );
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("two readers each get their own copy", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });

      yield* Effect.scoped(
        Effect.gen(function* () {
          const one = yield* log.read;
          const two = yield* log.read;
          yield* log.ingest(obligations("only"));
          assert.deepStrictEqual(ids(yield* takeLive(one.live, 1)), ["only"]);
          assert.deepStrictEqual(ids(yield* takeLive(two.live, 1)), ["only"]);
        }),
      );
    }));

  it.effect("publishing with NO reader at all does not block the decision", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server", capacity: 1 });

      for (let i = 0; i < 50; i += 1) {
        const d = yield* evaluate(policy).pipe(Effect.provide(log.layer));
        assert.isTrue(isAllowed(d));
      }
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a subscribed reader that stops pulling does not block the decision either", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server", capacity: 1 });

      yield* Effect.scoped(
        Effect.gen(function* () {
          yield* log.read;
          for (let i = 0; i < 20; i += 1) {
            const d = yield* evaluate(policy).pipe(Effect.provide(log.layer));
            assert.isTrue(isAllowed(d));
          }
        }),
      );
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("the newest record wins on a full lag buffer, not the oldest", () =>
    Effect.gen(function* () {
      // Ported from the feed's "ACTIVE reader" case: only a reader that has
      // subscribed and then stalls makes the buffer itself fill, which is the
      // one place `publishUnsafe`'s missing sliding eviction is observable.
      const log = yield* makeDecisionLog({ environment: "Server", capacity: 2 });
      const drained = yield* Latch.make();

      const reading = yield* Effect.forkChild(
        Effect.gen(function* () {
          const { live } = yield* log.read;
          const pull = yield* Stream.toPull(live);
          const first = yield* pull;
          yield* drained.await;
          const rest = yield* pull;
          return [...first, ...rest];
        }).pipe(Effect.scoped),
        { startImmediately: true },
      );

      for (const id of ["a", "b", "c", "d", "e"]) yield* log.ingest(obligations(id));
      yield* drained.open;

      // `a` was pulled before the stall; `d` and `e` are the newest two.
      assert.deepStrictEqual(ids(yield* Fiber.join(reading)), ["a", "d", "e"]);
    }));

  it.live("without a reader, nothing published before `read` arrives live", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("early"));

      const got = yield* Effect.scoped(
        Effect.flatMap(log.read, ({ live }) =>
          Stream.runCollect(Stream.take(live, 1)).pipe(Effect.timeoutOption("20 millis"))),
      );
      assert.isTrue(Option.isNone(got));
    }));
});

describe("makeDecisionLog — the handoff between backlog and live (C9)", () => {
  it.effect("a record made between `read`'s snapshot and the first live pull arrives live, once", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("before"));

      yield* Effect.scoped(
        Effect.gen(function* () {
          const reader = yield* log.read;
          yield* log.ingest(obligations("between"));
          yield* log.ingest(obligations("after"));
          assert.deepStrictEqual(ids(reader.backlog), ["before"]);
          assert.deepStrictEqual(ids(yield* takeLive(reader.live, 2)), ["between", "after"]);
        }),
      );
    }));

  it.effect("a record already in the backlog never arrives live again", () =>
    Effect.gen(function* () {
      // The record is appended, then a reader opens, then the record would be
      // published — the window the high-water mark exists for. Simulated by a
      // sink that appends and whose publish runs after a reader has subscribed:
      // a reader opened at any point sees `x` once, here in its backlog.
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("x"));

      yield* Effect.scoped(
        Effect.gen(function* () {
          const reader = yield* log.read;
          yield* log.ingest(obligations("sentinel"));
          assert.deepStrictEqual(ids(reader.backlog), ["x"]);
          assert.deepStrictEqual(
            ids(yield* takeLive(reader.live, 1)),
            ["sentinel"],
            "the first live record is the one after the backlog, not a repeat of it",
          );
        }),
      );
    }));

  it.effect("each reader sees every record exactly once, under concurrent writers and readers", () =>
    Effect.gen(function* () {
      // Random interleavings: 1–40 writer fibers and 1–3 readers opened at
      // random points, each yielding a random number of times first. Capacity is
      // larger than the run, so nothing is evicted and every reader's
      // `backlog ++ live` must be every record, as a multiset — no loss, no
      // duplicate. The live read ends on a sentinel written after every writer
      // and every reader, so a mutant that loses records still terminates.
      //
      // `MaxOpsBeforeYield` is set as low as 3 (below that the test runtime itself stalls), so the scheduler also switches
      // fibers *inside* an append-then-publish and inside a subscribe-then-
      // snapshot — the windows the high-water mark exists for, which a
      // scheduler yielding only every 2048 operations would almost never open.
      const scenarios = FastCheck.sample(
        FastCheck.record({
          writers: FastCheck.array(FastCheck.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 40 }),
          readers: FastCheck.array(FastCheck.integer({ min: 0, max: 12 }), { minLength: 1, maxLength: 3 }),
          opsBeforeYield: FastCheck.integer({ min: 3, max: 12 }),
        }),
        { numRuns: 80, seed: 11 },
      );

      for (const { writers, readers, opsBeforeYield } of scenarios) {
        yield* Effect.gen(function* () {
        const log = yield* makeDecisionLog({ environment: "Server", capacity: 64 });
        const writesDone = yield* Latch.make();
        const opened = yield* Effect.forEach(readers, () => Deferred.make<void>());

        const readerFibers = yield* Effect.forEach(readers, (delay, index) =>
          Effect.forkChild(
            Effect.scoped(
              Effect.gen(function* () {
                yield* yieldTimes(delay);
                const reader = yield* log.read;
                const signal = opened[index];
                if (signal !== undefined) yield* Deferred.succeed(signal, undefined);
                yield* writesDone.await;
                const live = yield* Stream.runCollect(
                  Stream.takeUntil(reader.live, (record) => record.evaluationId === "sentinel"),
                );
                return [...ids(reader.backlog), ...ids(Array.from(live))];
              }),
            ),
          ));
        const writerFibers = yield* Effect.forEach(writers, (delay, index) =>
          Effect.forkChild(
            yieldTimes(delay).pipe(Effect.andThen(log.ingest(obligations(`w${index}`)))),
          ));

        yield* Fiber.joinAll(writerFibers);
        yield* Effect.forEach(opened, Deferred.await);
        yield* log.ingest(obligations("sentinel"));
        yield* writesDone.open;
        const seen = yield* Fiber.joinAll(readerFibers);

        const expected = [...writers.map((_, index) => `w${index}`), "sentinel"].sort();
        for (const one of seen) assert.deepStrictEqual([...one].sort(), expected);
        }).pipe(Effect.provideService(Scheduler.MaxOpsBeforeYield, opsBeforeYield));
      }
    }),
    60_000,
  );
});

describe("makeDecisionLog — ingest (C10)", () => {
  it.effect("an ingested record reaches a live reader with its own label", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });

      yield* Effect.scoped(
        Effect.gen(function* () {
          const reader = yield* log.read;
          yield* log.ingest(obligations("edge-1"), "Edge");
          const [first] = yield* takeLive(reader.live, 1);
          assert.instanceOf(first, StoredObligationRecord);
          assert.strictEqual(first?.environment, "Edge");
        }),
      );
      assert.strictEqual((yield* log.snapshot)[0]?.environment, "Edge");
    }));

  it.effect("an ingested record respects capacity", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server", capacity: 2 });
      for (const id of ["a", "b", "c"]) yield* log.ingest(obligations(id), "Edge");
      assert.deepStrictEqual(ids(yield* log.snapshot), ["b", "c"]);
    }));

  it.effect("ingest without a label falls back to the log's", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("mine"));
      assert.strictEqual((yield* log.snapshot)[0]?.environment, "Server");
    }));

  it.effect("a stored record keeps its class, so Equal and pipe still work", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("x"));
      const [stored] = yield* log.snapshot;
      assert.instanceOf(stored, StoredObligationRecord);
      assert.strictEqual(typeof stored?.pipe, "function");
    }));
});

describe("makeDecisionLog — order", () => {
  it.effect("the backlog is presented in storedRecordOrder, eviction is by arrival", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server", capacity: 2 });
      yield* log.ingest(obligations("three", 3));
      yield* log.ingest(obligations("one", 1));
      yield* log.ingest(obligations("two", 2));

      // `three` arrived first, so it went first — though it is the latest in time.
      assert.deepStrictEqual(ids(yield* log.snapshot), ["one", "two"]);
      const backlog = yield* Effect.scoped(Effect.map(log.read, (r) => r.backlog));
      assert.deepStrictEqual(ids(backlog), ["one", "two"]);
    }));

  it.effect("an unknown time is presented last, two unknowns in arrival order", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("nan-1", Number.NaN));
      yield* log.ingest(obligations("five", 5));
      yield* log.ingest(obligations("nan-2", Number.NaN));
      assert.deepStrictEqual(ids(yield* log.snapshot), ["five", "nan-1", "nan-2"]);
    }));
});

describe("makeDecisionLog — a sink cannot change a decision (INV-QD-035)", () => {
  it.effect("evaluating with the log gives what evaluating without it gives", () =>
    Effect.gen(function* () {
      const log: DecisionLog = yield* makeDecisionLog({ environment: "Server", capacity: 1 });
      const without = yield* evaluate(policy, { evaluationId: "same" });
      const withLog = yield* evaluate(policy, { evaluationId: "same" }).pipe(Effect.provide(log.layer));
      assert.strictEqual(withLog._tag, without._tag);
      assert.deepStrictEqual(withLog.trace, without.trace);
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("makeDecisionLog — cursors and resume (D-11-g)", () => {
  const seqs = (entries: ReadonlyArray<{ readonly cursor: { readonly seq: number } }>) =>
    entries.map((entry) => entry.cursor.seq);

  it.effect("the epoch is the clock's, read once when the log is made", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(1_700_000_000_000);
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* TestClock.adjust("1 hour");
      yield* log.ingest(obligations("a"));

      const { backlog } = yield* Effect.scoped(log.readEntries());
      assert.deepStrictEqual(backlog.map((entry) => entry.cursor), [{ epoch: 1_700_000_000_000, seq: 1 }]);
    }));

  it.effect("every entry carries its cursor, backlog and live, in arrival order", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("a"));
      yield* log.ingest(obligations("b"));

      yield* Effect.scoped(
        Effect.gen(function* () {
          const { backlog, live } = yield* log.readEntries();
          yield* log.ingest(obligations("c"));
          const next = Array.from(yield* Stream.runCollect(Stream.take(live, 1)));
          assert.deepStrictEqual(seqs(backlog), [1, 2]);
          assert.deepStrictEqual(seqs(next), [3]);
          assert.strictEqual(next[0]?.record.evaluationId, "c");
        }),
      );
    }));

  it.effect("a cursor from this log yields only what followed it", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      for (const id of ["a", "b", "c", "d"]) yield* log.ingest(obligations(id));
      const all = yield* Effect.scoped(log.readEntries());
      const second = all.backlog[1]?.cursor;
      assert.isDefined(second);

      const resumed = yield* Effect.scoped(log.readEntries(second));
      assert.deepStrictEqual(resumed.backlog.map((entry) => entry.record.evaluationId), ["c", "d"]);

      // Resuming from the newest record misses nothing and repeats nothing.
      const last = all.backlog[3]?.cursor;
      assert.deepStrictEqual((yield* Effect.scoped(log.readEntries(last))).backlog, []);
    }));

  it.effect("a cursor from another epoch yields the full backlog", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(5_000);
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("a"));
      yield* log.ingest(obligations("b"));

      const restarted = yield* Effect.scoped(log.readEntries({ epoch: 4_000, seq: 1 }));
      assert.deepStrictEqual(seqs(restarted.backlog), [1, 2]);
    }));

  it.effect("read is readEntries without a cursor, mapped to records", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      yield* log.ingest(obligations("x", 2));
      yield* log.ingest(obligations("y", 1));
      const records = yield* Effect.scoped(Effect.map(log.read, (r) => r.backlog));
      const entries = yield* Effect.scoped(Effect.map(log.readEntries(), (r) => r.backlog));
      assert.deepStrictEqual(records, entries.map((entry) => entry.record));
      assert.deepStrictEqual(ids(records), ["y", "x"]);
    }));

  it("formats and parses a cursor, strictly", () => {
    assert.strictEqual(formatLogCursor({ epoch: 1_700_000_000_000, seq: 42 }), "1700000000000.42");
    assert.deepStrictEqual(parseLogCursor("1700000000000.42"), Option.some({ epoch: 1_700_000_000_000, seq: 42 }));
    assert.deepStrictEqual(parseLogCursor("0.0"), Option.some({ epoch: 0, seq: 0 }));
    for (const malformed of ["", "1", "1.", ".1", "1.2.3", "-1.2", "1.-2", "1e3.4", "1.5e1", " 1.2", "1.2 ", "a.b", "99999999999999999999.1"]) {
      assert.isTrue(Option.isNone(parseLogCursor(malformed)), JSON.stringify(malformed));
    }
  });
});

describe("the decision stream's protocol words (ARCH-28)", () => {
  it("DecisionStreamEvent is the three wire names, in protocol order (a golden: changing it is a protocol break)", () => {
    assert.deepStrictEqual([...DecisionStreamEvent.literals], ["backlog", "synced", "message"]);
  });

  it("Schema.is(DecisionStreamEvent) holds for the three names and nothing else", () => {
    const is = Schema.is(DecisionStreamEvent);
    for (const name of ["backlog", "synced", "message"]) assert.isTrue(is(name), name);
    for (const name of ["error", "", "Backlog"]) assert.isFalse(is(name), name);
  });

  it("DecisionStreamSynced accepts a count and refuses what no sender produces", () => {
    const decode = Schema.decodeUnknownResult(DecisionStreamSynced);
    for (const backlog of [0, 3]) assert.isTrue(Result.isSuccess(decode({ backlog })), String(backlog));
    for (const bad of [{ backlog: -1 }, { backlog: 1.5 }, { backlog: Number.NaN }, { backlog: "3" }, {}]) {
      assert.isTrue(Result.isFailure(decode(bad)), JSON.stringify(bad));
    }
  });
});
