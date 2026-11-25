/**
 * The stated run's contract, through its own interface.
 *
 * This file pins the stated run's start, its one stop rule and what it never states: a
 * store hands over what it publishes and the engine it runs, and the module decides the
 * order, the guards and when a stop is stated. The rows that pinned these through the
 * superseding run's failure hook live here, over the module that owns them now. The
 * stores' own files pin what each store does with the stop it is told of.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { hostile, settleTurns, thrownBy } from "../helpers.ts";
import { makeStatedRun } from "../../src/model/StatedRun.ts";
import type { RunLive, RunPlan } from "../../src/model/StatedRun.ts";

/** A stated run that records each reason it is told of. */
const built = (stops: Array<string>) =>
  makeStatedRun((reason) => {
    stops.push(reason);
  });

/**
 * A plan that logs its starting state, then its engine's start, and then runs `work`.
 * `starting` runs in the start's synchronous step, and so does the engine's first line.
 */
const planOf = (
  log: Array<string>,
  name: string,
  work: Effect.Effect<void, unknown>,
  starting: () => void = () => undefined,
  engine: (live: RunLive) => void = () => undefined,
): RunPlan => ({
  starting: () => {
    log.push(`${name}:starting`);
    starting();
  },
  engine: (live) =>
    Effect.sync(() => {
      log.push(`${name}:engine`);
      engine(live);
    }).pipe(Effect.andThen(work)),
});

describe("the stated run", () => {
  it.effect("ST1 start publishes the starting state before the engine runs, then runs the engine once", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];

      run.start(planOf(log, "A", Effect.void));

      assert.deepStrictEqual(log, ["A:starting", "A:engine"]);
      yield* settleTurns;
      assert.deepStrictEqual(log, ["A:starting", "A:engine"]);
      assert.deepStrictEqual(stops, []);
    }));

  it.effect("ST2 a starting state whose listener throws is rethrown once by identity after the engine has started", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];
      const listener = new Error("listener threw");

      const { threw, thrown } = thrownBy(() =>
        run.start(
          planOf(log, "A", Effect.never, () => {
            throw listener;
          }),
        ),
      );

      assert.isTrue(threw);
      assert.strictEqual(thrown, listener);
      assert.deepStrictEqual(log, ["A:starting", "A:engine"]);
      yield* settleTurns;
      assert.deepStrictEqual(log, ["A:starting", "A:engine"]);
      assert.deepStrictEqual(stops, []);
    }));

  it.effect("ST3 a current engine that dies states one stop in the cause text, its first line the error", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];

      run.start(planOf(log, "A", Effect.die(new Error("engine died"))));
      yield* settleTurns;

      assert.strictEqual(stops.length, 1);
      assert.strictEqual(stops[0]?.split("\n")[0], "Error: engine died");
      assert.isFalse(stops[0]?.startsWith("Cause(") ?? true);
    }));

  it.effect("ST4 a current engine that interrupts itself states one stop naming the interruption", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];

      run.start(planOf(log, "A", Effect.interrupt));
      yield* settleTurns;

      assert.strictEqual(stops.length, 1);
      assert.include(stops[0], "InterruptError");
    }));

  it.effect("ST5 a current engine that dies with a value that cannot be described states the one placeholder", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];

      run.start(planOf(log, "A", Effect.die(hostile)));
      yield* settleTurns;

      assert.deepStrictEqual(stops, ["a value that could not be described"]);
    }));

  it.effect("ST6 an engine that succeeds states nothing", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];

      run.start(planOf(log, "A", Effect.void));
      yield* settleTurns;
      assert.deepStrictEqual(stops, []);

      // Positive control: the same module states the stop of a current engine that fails.
      run.start(planOf(log, "B", Effect.die(new Error("control died"))));
      yield* settleTurns;
      assert.strictEqual(stops.length, 1);
    }));
});
