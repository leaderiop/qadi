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
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import type * as Tracer from "effect/Tracer";
import { collectingTracer } from "@qadi/testing";
import * as FastCheck from "fast-check";
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

/**
 * An engine that waits forever, logs its interruption, and whose release dies as it
 * closes: the shape that would read as a failure if an outside interruption were read.
 */
const waitingWithDyingRelease = (log: Array<string>, name: string): Effect.Effect<void, unknown> =>
  Effect.scoped(
    Effect.addFinalizer(() => Effect.die(new Error("release died"))).pipe(
      Effect.andThen(
        Effect.never.pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              log.push(`${name}:interrupted`);
            }),
          ),
        ),
      ),
    ),
  );

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

  it.effect("ST7 a newer start interrupts the older engine, and the older run states nothing even when its release dies", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];

      run.start(planOf(log, "A", waitingWithDyingRelease(log, "A")));
      yield* settleTurns;
      run.start(planOf(log, "B", Effect.void));
      yield* settleTurns;

      assert.include(log, "A:interrupted");
      assert.deepStrictEqual(stops, []);

      // Positive control: the same module states the stop of a current engine that fails.
      run.start(planOf(log, "C", Effect.die(new Error("control died"))));
      yield* settleTurns;
      assert.strictEqual(stops.length, 1);
    }));

  it.effect("ST8 stop interrupts a running engine and states nothing, even when its release dies", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];

      run.start(planOf(log, "A", waitingWithDyingRelease(log, "A")));
      yield* settleTurns;
      run.stop();
      yield* settleTurns;

      assert.include(log, "A:interrupted");
      assert.deepStrictEqual(stops, []);

      // Positive control: the same module states the stop of a current engine that fails.
      run.start(planOf(log, "B", Effect.die(new Error("control died"))));
      yield* settleTurns;
      assert.strictEqual(stops.length, 1);
    }));

  it.effect("ST9 stop with no run states nothing and calls no starting state", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];
      const before = spans.length;

      assert.doesNotThrow(() => run.stop());
      yield* settleTurns;

      assert.deepStrictEqual(stops, []);
      assert.deepStrictEqual(log, []);
      assert.strictEqual(spans.length, before);
      assert.isFalse(run.closed());

      run.start(planOf(log, "A", Effect.void));
      yield* settleTurns;
      assert.deepStrictEqual(log, ["A:starting", "A:engine"]);

      // Positive control: this tracer does record a span, so the equality above can fail.
      yield* Effect.void.pipe(Effect.withSpan("control"));
      assert.strictEqual(spans.length, before + 1);
    }).pipe(Effect.provide(collectingTracer(spans)));
  });

  it.effect("ST10 stop after the engine completed changes nothing and states nothing", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];

      run.start(planOf(log, "A", Effect.void));
      yield* settleTurns;
      const before = spans.length;

      run.stop();
      yield* settleTurns;

      assert.deepStrictEqual(log, ["A:starting", "A:engine"]);
      assert.deepStrictEqual(stops, []);
      assert.strictEqual(spans.length, before);

      // Positive control: this tracer does record a span, so the equality above can fail.
      yield* Effect.void.pipe(Effect.withSpan("control"));
      assert.strictEqual(spans.length, before + 1);
    }).pipe(Effect.provide(collectingTracer(spans)));
  });

  it.effect("ST11 closing the scope mid-run interrupts the engine and states nothing even when its release dies, while a current engine that dies on the same module states once", () =>
    Effect.gen(function* () {
      const scope = Scope.makeUnsafe();
      const stops: Array<string> = [];
      const run = yield* Scope.provide(built(stops), scope);
      const log: Array<string> = [];

      // Positive control: before the close, the same module states a current engine that dies.
      run.start(planOf(log, "A", Effect.die(new Error("control died"))));
      yield* settleTurns;
      assert.strictEqual(stops.length, 1);

      run.start(planOf(log, "B", waitingWithDyingRelease(log, "B")));
      yield* settleTurns;
      yield* Scope.close(scope, Exit.void);
      yield* settleTurns;

      assert.include(log, "B:interrupted");
      assert.strictEqual(stops.length, 1);
      assert.isTrue(run.closed());
    }));

  it.effect("ST12 after the scope closed, start calls neither the starting state nor the engine, and closed reads true", () =>
    Effect.gen(function* () {
      const scope = Scope.makeUnsafe();
      const stops: Array<string> = [];
      const run = yield* Scope.provide(built(stops), scope);
      const log: Array<string> = [];
      assert.isFalse(run.closed());
      yield* Scope.close(scope, Exit.void);

      assert.doesNotThrow(() => run.start(planOf(log, "A", Effect.die(new Error("late died")))));
      yield* settleTurns;

      assert.isTrue(run.closed());
      assert.deepStrictEqual(log, []);
      assert.deepStrictEqual(stops, []);
    }));

  it.effect("ST13 the guard passes a write from the current run and drops one from a run a newer start replaced", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];
      const lives: Array<RunLive> = [];
      const written: Array<number> = [];
      const remember = (live: RunLive) => {
        lives.push(live);
      };

      run.start(planOf(log, "A", Effect.never, undefined, remember));
      run.start(planOf(log, "B", Effect.never, undefined, remember));
      yield* settleTurns;
      const [older, newer] = lives;
      if (older === undefined || newer === undefined) return assert.fail("both engines were handed their run");

      older.guard((n: number) => written.push(n))(1);
      newer.guard((n: number) => written.push(n))(2);

      assert.deepStrictEqual(written, [2]);
      assert.isFalse(older.current());
      assert.isTrue(newer.current());
    }));

  it.effect("ST14 an engine that starts a newer run in its synchronous start and then dies states nothing, and the newer run is live", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];
      const lives: Array<RunLive> = [];
      const newer = planOf(log, "B", Effect.never, undefined, (live) => {
        lives.push(live);
      });

      run.start(
        planOf(
          log,
          "A",
          Effect.sync(() => run.start(newer)).pipe(Effect.andThen(Effect.die(new Error("outer died")))),
        ),
      );
      yield* settleTurns;

      assert.deepStrictEqual(stops, []);
      assert.deepStrictEqual(log, ["A:starting", "A:engine", "B:starting", "B:engine"]);
      assert.isTrue(lives[0]?.current());

      // Positive control: the same module states the stop of a current engine that dies.
      run.start(planOf(log, "C", Effect.die(new Error("control died"))));
      yield* settleTurns;
      assert.strictEqual(stops.length, 1);
    }));

  it.effect("ST15 an engine that starts a newer run in its synchronous start and then interrupts itself states nothing", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];
      const lives: Array<RunLive> = [];
      const newer = planOf(log, "B", Effect.never, undefined, (live) => {
        lives.push(live);
      });

      run.start(
        planOf(log, "A", Effect.sync(() => run.start(newer)).pipe(Effect.andThen(Effect.interrupt))),
      );
      yield* settleTurns;

      assert.deepStrictEqual(stops, []);
      assert.deepStrictEqual(log, ["A:starting", "A:engine", "B:starting", "B:engine"]);
      assert.isTrue(lives[0]?.current());

      // Positive control: the same module states the stop of a current engine that interrupts itself.
      run.start(planOf(log, "C", Effect.interrupt));
      yield* settleTurns;
      assert.strictEqual(stops.length, 1);
    }));

  it.effect("ST16 a starting state that starts a newer run leaves only the newer engine running, and the outer run states nothing", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];
      const lives: Array<RunLive> = [];
      const newer = planOf(
        log,
        "B",
        Effect.never.pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              log.push("B:interrupted");
            }),
          ),
        ),
        undefined,
        (live) => {
          lives.push(live);
        },
      );

      run.start(planOf(log, "A", Effect.die(new Error("outer died")), () => run.start(newer)));
      yield* settleTurns;

      assert.deepStrictEqual(log, ["A:starting", "B:starting", "B:engine"]);
      assert.deepStrictEqual(stops, []);
      assert.isTrue(lives[0]?.current());

      run.stop();
      yield* settleTurns;
      assert.include(log, "B:interrupted");
      assert.deepStrictEqual(stops, []);
    }));

  it.effect("ST18 an engine that throws while it is built is a stop of its run, and the run after it starts", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const log: Array<string> = [];

      const { threw } = thrownBy(() =>
        run.start({
          starting: () => {
            log.push("A:starting");
          },
          engine: () => {
            throw new Error("build threw");
          },
        }),
      );
      yield* settleTurns;

      assert.isFalse(threw);
      assert.strictEqual(stops.length, 1);
      assert.strictEqual(stops[0]?.split("\n")[0], "Error: build threw");

      run.start(planOf(log, "B", Effect.void));
      yield* settleTurns;
      assert.deepStrictEqual(log, ["A:starting", "B:starting", "B:engine"]);
      assert.strictEqual(stops.length, 1);
    }));

  it.effect("ST19 an engine that throws while it is built does not replace the listener's throw, and is stated all the same", () =>
    Effect.gen(function* () {
      const stops: Array<string> = [];
      const run = yield* built(stops);
      const listener = new Error("listener threw");

      const { threw, thrown } = thrownBy(() =>
        run.start({
          starting: () => {
            throw listener;
          },
          engine: () => {
            throw new Error("build threw");
          },
        }),
      );
      yield* settleTurns;

      assert.isTrue(threw);
      assert.strictEqual(thrown, listener);
      assert.strictEqual(stops.length, 1);
      assert.strictEqual(stops[0]?.split("\n")[0], "Error: build threw");
    }));
});

/**
 * ST1 to ST16, ST18 and ST19 pin each rule on one hand-picked sequence. This states them together as a
 * model, and checks the module against it after every step of a random interleaving of
 * starts, stops and a close. Every engine but `Never` ends in the start's own synchronous
 * step, so the model needs no clock: a start supersedes the run before it, an engine that
 * fails while current is stated once, and an outside interruption (a newer start, `stop`, the
 * close) is never stated, whether or not the interrupted engine's release dies. A `Nest`
 * engine starts a newer run in its own synchronous start and then fails: the run that ends
 * after a newer one began is not current, so it states nothing.
 */
describe("PROPERTY: a stop is stated for exactly the current runs whose engine fails, and nothing after close", () => {
  type Body = "Ok" | "Die" | "Interrupt" | "Never";
  type Command =
    | { readonly _tag: "Start"; readonly body: Body; readonly release: boolean }
    | { readonly _tag: "Nest"; readonly ends: "Die" | "Interrupt" }
    | { readonly _tag: "Stop" }
    | { readonly _tag: "Close" };

  const works: Record<Body, (id: number) => Effect.Effect<void, unknown>> = {
    Ok: () => Effect.void,
    Die: (id) => Effect.die(new Error(`run-${id}`)),
    Interrupt: () => Effect.interrupt,
    Never: () => Effect.never,
  };

  /** The release that dies as the engine's scope closes, on a normal end, a failure or an interruption alike. */
  const withDyingRelease = (work: Effect.Effect<void, unknown>) =>
    Effect.scoped(Effect.addFinalizer(() => Effect.die(new Error("release died"))).pipe(Effect.andThen(work)));

  /**
   * Which failure a stated reason names: the run it died in, a self-interruption, or a release
   * that died, whose defect is the whole text when the engine ended in it or in a self-interruption.
   */
  const labelOf = (reason: string): string => {
    const died = /run-(\d+)/.exec(reason);
    if (died !== null) return `die:${died[1]}`;
    if (reason.includes("InterruptError")) return "interrupt";
    if (reason.includes("release died")) return "release";
    return `unknown:${reason}`;
  };

  const body = FastCheck.oneof(
    { weight: 3, arbitrary: FastCheck.constant<Body>("Ok") },
    { weight: 4, arbitrary: FastCheck.constant<Body>("Die") },
    { weight: 3, arbitrary: FastCheck.constant<Body>("Interrupt") },
    { weight: 4, arbitrary: FastCheck.constant<Body>("Never") },
  );
  const commands = FastCheck.array(
    FastCheck.oneof(
      {
        weight: 14,
        arbitrary: FastCheck.tuple(body, FastCheck.boolean()).map(
          ([b, release]): Command => ({ _tag: "Start", body: b, release }),
        ),
      },
      {
        weight: 4,
        arbitrary: FastCheck.constantFrom<"Die" | "Interrupt">("Die", "Interrupt").map(
          (ends): Command => ({ _tag: "Nest", ends }),
        ),
      },
      { weight: 3, arbitrary: FastCheck.constant<Command>({ _tag: "Stop" }) },
      { weight: 2, arbitrary: FastCheck.constant<Command>({ _tag: "Close" }) },
    ),
    { minLength: 4, maxLength: 20 },
  );

  it.effect("ST17 a model property: a stop is stated for exactly the current runs whose engine fails, and nothing after close", () =>
      Effect.gen(function* () {
        let statedDeaths = 0;
        let statedInterrupts = 0;
        let statedReleases = 0;
        let outsideInterrupts = 0;
        let startsAfterClose = 0;
        let staleEnds = 0;

        const program = (cmds: ReadonlyArray<Command>) =>
          Effect.gen(function* () {
            const scope = Scope.makeUnsafe();
            const stops: Array<string> = [];
            let starts = 0;
            const run = yield* Scope.provide(built(stops), scope);

            // The reference model.
            let closed = false;
            let pending = false;
            let nextId = 0;
            const expected: Array<string> = [];
            let modelStarts = 0;

            const interruptPending = () => {
              if (pending) outsideInterrupts += 1;
              pending = false;
            };

            const check = Effect.gen(function* () {
              yield* settleTurns;
              assert.deepStrictEqual(stops.map(labelOf), expected, "the stops stated equal the model's");
              assert.strictEqual(starts, modelStarts, "the starting states published equal the model's");
              assert.strictEqual(run.closed(), closed, "closed equals the model's");
            });

            const startStep = (cmd: Extract<Command, { readonly _tag: "Start" }>) =>
              Effect.gen(function* () {
                const id = nextId;
                nextId += 1;
                const work = works[cmd.body](id);
                run.start({
                  starting: () => {
                    starts += 1;
                  },
                  engine: () => (cmd.release ? withDyingRelease(work) : work),
                });
                if (closed) startsAfterClose += 1;
                else {
                  modelStarts += 1;
                  interruptPending();
                  if (cmd.body === "Die") {
                    expected.push(`die:${id}`);
                    statedDeaths += 1;
                  } else if (cmd.body === "Interrupt" && !cmd.release) {
                    expected.push("interrupt");
                    statedInterrupts += 1;
                  } else if ((cmd.body === "Ok" || cmd.body === "Interrupt") && cmd.release) {
                    expected.push("release");
                    statedReleases += 1;
                  } else pending = cmd.body === "Never";
                }
                yield* check;
              });

            // An engine that starts a newer run in its own synchronous start and then ends
            // on its own while that newer run is the current one: the begin window.
            const nestStep = (cmd: Extract<Command, { readonly _tag: "Nest" }>) =>
              Effect.gen(function* () {
                const id = nextId;
                nextId += 1;
                const counting = {
                  starting: () => {
                    starts += 1;
                  },
                };
                run.start({
                  ...counting,
                  engine: () =>
                    Effect.sync(() => run.start({ ...counting, engine: () => Effect.never })).pipe(
                      Effect.andThen(works[cmd.ends](id)),
                    ),
                });
                if (closed) startsAfterClose += 1;
                else {
                  modelStarts += 2;
                  interruptPending();
                  pending = true;
                  staleEnds += 1;
                }
                yield* check;
              });

            const stopStep = Effect.gen(function* () {
              run.stop();
              if (!closed) interruptPending();
              yield* check;
            });

            const closeStep = Effect.gen(function* () {
              yield* Scope.close(scope, Exit.void);
              if (!closed) interruptPending();
              closed = true;
              yield* check;
            });

            for (const cmd of cmds) {
              if (cmd._tag === "Start") yield* startStep(cmd);
              else if (cmd._tag === "Nest") yield* nestStep(cmd);
              else if (cmd._tag === "Stop") yield* stopStep;
              else yield* closeStep;
            }
            yield* closeStep;
          });

        yield* Effect.promise(() =>
          FastCheck.assert(
            FastCheck.asyncProperty(commands, (cmds) => Effect.runPromise(program(cmds))),
            { numRuns: 300, seed: 4101 },
          ),
        );

        assert.isAtLeast(statedDeaths, 30, "current engines that died and were stated");
        assert.isAtLeast(statedInterrupts, 30, "current engines that interrupted themselves and were stated");
        assert.isAtLeast(statedReleases, 10, "current engines whose own release died and were stated");
        assert.isAtLeast(outsideInterrupts, 30, "running engines an outside interruption ended, never stated");
        assert.isAtLeast(startsAfterClose, 10, "starts after the close, which did nothing");
        assert.isAtLeast(staleEnds, 30, "engines that ended on their own after a newer run began, never stated");
      }),
    60_000,
  );
});
