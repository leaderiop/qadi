/**
 * The superseding run's contract, through its own interface.
 *
 * The protocol of a run that a newer run supersedes lives in one module now, so its
 * rules are stated against `makeSupersedingRun` and nothing else: no test reaches
 * into the module's state or its fiber handle. The store files pin what each store
 * does with a result that lands; this file pins when a run starts, ends and is
 * heard. A test that ends its scope mid-test builds the scope itself, because
 * `it.effect` already gives every test a scope of its own.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import type * as Tracer from "effect/Tracer";
import * as TestClock from "effect/testing/TestClock";
import { collectingTracer } from "@qadi/testing";
import { makeSupersedingRun } from "../../src/model/SupersedingRun.ts";
import type { ForkHooks, RunToken } from "../../src/model/SupersedingRun.ts";
import { settleTurns } from "../helpers.ts";

/**
 * A run that logs its start, runs `prefix` in that same synchronous step, sleeps one
 * second, then logs its end; an interruption is logged too.
 */
const body = (log: Array<string>, name: string, prefix: () => void = () => undefined) =>
  Effect.sync(() => {
    log.push(`${name}:start`);
    prefix();
  }).pipe(
    Effect.andThen(Effect.sleep("1 second")),
    Effect.andThen(
      Effect.sync(() => {
        log.push(`${name}:done`);
      }),
    ),
    Effect.onInterrupt(() =>
      Effect.sync(() => {
        log.push(`${name}:interrupted`);
      }),
    ),
  );

/** What `onFailure` heard, one line per failure, beside the hooks that record it. */
const listener = () => {
  const heard: Array<string> = [];
  const hooks: ForkHooks = {
    onFailure: (cause) => {
      heard.push(Cause.pretty(cause).split("\n")[0] ?? "");
    },
  };
  return { heard, hooks };
};

/** Lets every fiber reach its next suspension, steps the clock past a run, then lets the ends land. */
const elapse = Effect.gen(function* () {
  yield* settleTurns;
  yield* TestClock.adjust("2 seconds");
  yield* settleTurns;
});

describe("the superseding run", () => {
  it.effect("R1 a token superseded before its fork forks nothing, and its body never starts", () =>
    Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const log: Array<string> = [];
      const a = run.begin();
      const b = run.begin();

      assert.isFalse(run.fork(a, body(log, "A")));
      assert.isTrue(run.fork(b, body(log, "B")));
      yield* elapse;

      assert.deepStrictEqual(log, ["B:start", "B:done"]);
    }));

  it.effect("R2 a newer fork interrupts the older run, and only the newer one completes", () =>
    Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const log: Array<string> = [];
      const t1 = run.begin();
      run.fork(t1, body(log, "A"));
      yield* settleTurns;
      run.fork(run.begin(), body(log, "B"));
      yield* elapse;

      assert.deepStrictEqual(
        log.filter((entry) => entry.endsWith(":done")),
        ["B:done"],
      );
      assert.include(log, "A:interrupted");
      assert.isFalse(run.isCurrent(t1));
    }));

  it.effect("R3 closing the scope mid-run interrupts the run and never calls its onFailure, even when its release dies", () =>
    Effect.gen(function* () {
      const scope = Scope.makeUnsafe();
      const run = yield* Scope.provide(makeSupersedingRun(), scope);
      const log: Array<string> = [];
      const { heard, hooks } = listener();

      run.fork(
        run.begin(),
        Effect.never.pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              log.push("A:interrupted");
            }),
          ),
          Effect.ensuring(Effect.die(new Error("release"))),
        ),
        hooks,
      );
      yield* settleTurns;
      yield* Scope.close(scope, Exit.void);
      yield* settleTurns;

      assert.include(log, "A:interrupted");
      assert.deepStrictEqual(heard, []);
      assert.isTrue(run.closed());
    }));

  it.effect("R4 after the scope closes, begin gives a token that is never current, and fork starts nothing", () =>
    Effect.gen(function* () {
      const scope = Scope.makeUnsafe();
      const run = yield* Scope.provide(makeSupersedingRun(), scope);
      const log: Array<string> = [];
      yield* Scope.close(scope, Exit.void);

      const t = run.begin();
      assert.isFalse(run.isCurrent(t));
      assert.isFalse(run.fork(t, body(log, "A")));
      assert.isTrue(run.closed());
      yield* elapse;

      assert.deepStrictEqual(log, []);
    }));

  it.effect("R5 stop before any run starts nothing, calls no hook and opens no span", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const log: Array<string> = [];
      const { heard, hooks } = listener();
      const before = spans.length;

      assert.doesNotThrow(() => run.stop());
      yield* settleTurns;

      assert.deepStrictEqual(heard, []);
      assert.strictEqual(spans.length, before);
      assert.isFalse(run.closed());

      assert.isTrue(run.fork(run.begin(), body(log, "A"), hooks));
      yield* elapse;
      assert.deepStrictEqual(log, ["A:start", "A:done"]);
    }).pipe(Effect.provide(collectingTracer(spans)));
  });

  it.effect("R6 stop while a run is in flight interrupts it, and its onFailure is never called", () =>
    Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const log: Array<string> = [];
      const { heard, hooks } = listener();
      const t = run.begin();
      run.fork(t, body(log, "A"), hooks);
      yield* settleTurns;

      run.stop();
      yield* elapse;

      assert.include(log, "A:interrupted");
      assert.notInclude(log, "A:done");
      assert.deepStrictEqual(heard, []);
      assert.isFalse(run.isCurrent(t));
    }));

  it.effect("R7 stop after a run completed changes nothing, calls no hook and opens no span", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const log: Array<string> = [];
      const { heard, hooks } = listener();
      run.fork(run.begin(), body(log, "A"), hooks);
      yield* elapse;
      const before = spans.length;

      run.stop();
      yield* settleTurns;

      assert.deepStrictEqual(log, ["A:start", "A:done"]);
      assert.deepStrictEqual(heard, []);
      assert.strictEqual(spans.length, before);
    }).pipe(Effect.provide(collectingTracer(spans)));
  });

  it.effect("R8 stop after the scope closed changes nothing and throws nothing", () =>
    Effect.gen(function* () {
      const scope = Scope.makeUnsafe();
      const run = yield* Scope.provide(makeSupersedingRun(), scope);
      const log: Array<string> = [];
      yield* Scope.close(scope, Exit.void);

      assert.doesNotThrow(() => run.stop());
      assert.isTrue(run.closed());
      yield* elapse;

      assert.deepStrictEqual(log, []);
    }));

  it.effect("R9 onFailure hears the current run defect once, and never an interruption or a superseded run", () =>
    Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const { heard, hooks } = listener();

      run.fork(run.begin(), Effect.die(new Error("boom1")), hooks);
      yield* settleTurns;

      run.fork(run.begin(), Effect.never, hooks);
      run.fork(run.begin(), Effect.void, hooks);
      yield* settleTurns;

      run.fork(
        run.begin(),
        Effect.sleep("1 second").pipe(Effect.andThen(Effect.die(new Error("stale")))),
        hooks,
      );
      run.begin();
      yield* elapse;

      run.fork(run.begin(), Effect.interrupt, hooks);
      yield* settleTurns;

      run.fork(
        run.begin(),
        Effect.sleep("1 second").pipe(Effect.andThen(Effect.die(new Error("boom2")))),
        hooks,
      );
      yield* elapse;

      assert.strictEqual(heard.length, 2);
      assert.include(heard[0], "boom1");
      assert.include(heard[1], "boom2");
    }));

  it.effect("R10 two runs in two scopes share nothing: closing one leaves the other current and running", () =>
    Effect.gen(function* () {
      const first = Scope.makeUnsafe();
      const second = Scope.makeUnsafe();
      const one = yield* Scope.provide(makeSupersedingRun(), first);
      const two = yield* Scope.provide(makeSupersedingRun(), second);
      const log: Array<string> = [];
      const t1 = one.begin();
      const t2 = two.begin();
      one.fork(t1, body(log, "R1"));
      two.fork(t2, body(log, "R2"));
      yield* settleTurns;

      yield* Scope.close(first, Exit.void);
      yield* settleTurns;

      assert.isFalse(one.isCurrent(t1));
      assert.isTrue(two.isCurrent(t2));
      assert.isTrue(one.closed());
      assert.isFalse(two.closed());

      yield* elapse;
      assert.include(log, "R1:interrupted");
      assert.include(log, "R2:done");
      assert.notInclude(log, "R1:done");

      yield* Scope.close(second, Exit.void);
    }));

  it.effect("R11 a fork requested inside the synchronous start of a run is held, then installed, so the newest run is live and the outer one interrupted", () =>
    Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const log: Array<string> = [];
      const forked: Array<boolean> = [];
      const outer = run.begin();
      let inner: RunToken | undefined;

      run.fork(
        outer,
        body(log, "OUTER", () => {
          inner = run.begin();
          forked.push(run.fork(inner, body(log, "INNER")));
          log.push("OUTER:prefix-end");
        }),
      );
      yield* settleTurns;

      assert.deepStrictEqual(log, ["OUTER:start", "OUTER:prefix-end", "INNER:start", "OUTER:interrupted"]);
      assert.deepStrictEqual(forked, [true]);

      yield* elapse;
      assert.strictEqual(log[log.length - 1], "INNER:done");
      assert.notInclude(log, "OUTER:done");
      assert.isTrue(inner !== undefined && run.isCurrent(inner));
    }));

  it.effect("R12 three forks nested in one another leave only the innermost run live", () =>
    Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const log: Array<string> = [];

      run.fork(
        run.begin(),
        body(log, "A", () => {
          run.fork(
            run.begin(),
            body(log, "B", () => {
              run.fork(run.begin(), body(log, "C"));
            }),
          );
        }),
      );
      yield* elapse;

      assert.deepStrictEqual(
        log.filter((entry) => entry.endsWith(":done")),
        ["C:done"],
      );
      assert.include(log, "A:interrupted");
      assert.include(log, "B:interrupted");
    }));

  it.effect("R13 stop inside the synchronous start of a run leaves nothing running", () =>
    Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const log: Array<string> = [];

      run.fork(
        run.begin(),
        body(log, "A", () => run.stop()),
      );
      yield* elapse;

      assert.deepStrictEqual(log, ["A:start", "A:interrupted"]);
    }));

  it.effect("R14 closing the scope inside the synchronous start of a run throws nothing and starts nothing more", () =>
    Effect.gen(function* () {
      const scope = Scope.makeUnsafe();
      const run = yield* Scope.provide(makeSupersedingRun(), scope);
      const log: Array<string> = [];
      const forked: Array<boolean> = [];

      assert.doesNotThrow(() =>
        run.fork(
          run.begin(),
          body(log, "A", () => {
            Effect.runSync(Scope.close(scope, Exit.void));
            forked.push(run.fork(run.begin(), body(log, "B")));
          }),
        ),
      );
      yield* elapse;

      assert.deepStrictEqual(log, ["A:start", "A:interrupted"]);
      assert.deepStrictEqual(forked, [false]);
      assert.isTrue(run.closed());
    }));

  it.effect("R15 a begin with no fork leaves the older run running but no longer current, until the next fork or stop", () =>
    Effect.gen(function* () {
      const run = yield* makeSupersedingRun();
      const log: Array<string> = [];
      const t = run.begin();
      run.fork(t, body(log, "A"));
      yield* settleTurns;

      run.begin();
      assert.isFalse(run.isCurrent(t));
      yield* TestClock.adjust("500 millis");
      yield* settleTurns;
      assert.notInclude(log, "A:done");
      assert.notInclude(log, "A:interrupted");

      run.stop();
      yield* settleTurns;
      assert.include(log, "A:interrupted");
      assert.notInclude(log, "A:done");
    }));

  it.effect("R16 fork says whether it started or held a run, and refuses a token that is not current", () =>
    Effect.gen(function* () {
      const scope = Scope.makeUnsafe();
      const run = yield* Scope.provide(makeSupersedingRun(), scope);
      const log: Array<string> = [];
      const stale = run.begin();
      const live = run.begin();
      const held: Array<boolean> = [];

      assert.isFalse(run.fork(stale, body(log, "S")));
      assert.isTrue(run.fork(live, body(log, "L")));
      run.fork(
        run.begin(),
        body(log, "OUTER", () => {
          held.push(run.fork(run.begin(), body(log, "INNER")));
        }),
      );
      assert.deepStrictEqual(held, [true]);

      yield* Scope.close(scope, Exit.void);
      assert.isFalse(run.fork(run.begin(), body(log, "LATE")));
    }));

  it("R17 the run builds and closes under Effect.runSync, as a scoped store is built", () => {
    const scope = Scope.makeUnsafe();
    const run = Effect.runSync(Scope.provide(makeSupersedingRun(), scope));

    assert.isTrue(run.fork(run.begin(), Effect.void));
    assert.isFalse(run.closed());
    Effect.runSync(Scope.close(scope, Exit.void));
    assert.isTrue(run.closed());
  });
});
