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
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Match from "effect/Match";
import * as Scope from "effect/Scope";
import type * as Tracer from "effect/Tracer";
import * as TestClock from "effect/testing/TestClock";
import { collectingTracer } from "@qadi/testing";
import * as FastCheck from "fast-check";
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

/**
 * R1 to R17 pin each rule on one hand-picked sequence. This states the rules that hold
 * together as a model, and checks the module against it after every step of a random
 * interleaving of begin, fork, land, stop and close (D-11, RUN-07; the form of
 * `SharedComputation.test.ts`'s property).
 *
 * A fork's body waits on a gate the program opens, so the program, not a clock, decides
 * when a run ends. A `Nest` body begins an inner token and forks an inner run from its
 * own synchronous prefix, so the inner fork is held and installed once the outer start
 * returns; `NestStale` then begins again before that, so the held fork is stale when
 * the start returns and nothing is installed. The model keeps `current` as the index of
 * a begun token, -1 for the token `stop` makes inside the module and none after close.
 */
describe("PROPERTY: only the current run lands, and nothing lands after close", () => {
  type Body = "Ok" | "Die" | "Never" | "Nest" | "NestStale";
  type Command =
    | { readonly _tag: "Begin" }
    | { readonly _tag: "Fork"; readonly fresh: boolean; readonly pick: number; readonly body: Body }
    | { readonly _tag: "Land" }
    | { readonly _tag: "Stop" }
    | { readonly _tag: "Close" };

  type Kind = "Ok" | "Die" | "Never";
  interface ModelRun {
    readonly id: number;
    readonly token: number;
    readonly kind: Kind;
    state: "unstarted" | "running" | "done" | "died" | "interrupted";
  }

  // Distance back from the newest begun token: mostly the newest, sometimes a stale one.
  const pick = FastCheck.oneof(
    { weight: 5, arbitrary: FastCheck.constant(0) },
    { weight: 2, arbitrary: FastCheck.constant(1) },
    { weight: 1, arbitrary: FastCheck.nat(8) },
  );
  // Mostly the begin-then-fork pairing a store does; a fork on an older token is the rest.
  const fresh = FastCheck.oneof(
    { weight: 3, arbitrary: FastCheck.constant(true) },
    { weight: 1, arbitrary: FastCheck.constant(false) },
  );
  const body = FastCheck.oneof(
    { weight: 4, arbitrary: FastCheck.constant<Body>("Ok") },
    { weight: 6, arbitrary: FastCheck.constant<Body>("Die") },
    { weight: 1, arbitrary: FastCheck.constant<Body>("Never") },
    { weight: 2, arbitrary: FastCheck.constant<Body>("Nest") },
    { weight: 2, arbitrary: FastCheck.constant<Body>("NestStale") },
  );
  const commands = FastCheck.array(
    FastCheck.oneof(
      { weight: 7, arbitrary: FastCheck.constant<Command>({ _tag: "Begin" }) },
      {
        weight: 10,
        arbitrary: FastCheck.tuple(fresh, pick, body).map(
          ([f, p, b]): Command => ({ _tag: "Fork", fresh: f, pick: p, body: b }),
        ),
      },
      { weight: 12, arbitrary: FastCheck.constant<Command>({ _tag: "Land" }) },
      { weight: 5, arbitrary: FastCheck.constant<Command>({ _tag: "Stop" }) },
      { weight: 5, arbitrary: FastCheck.constant<Command>({ _tag: "Close" }) },
    ),
    { minLength: 6, maxLength: 24 },
  );

  it.effect(
    "the started, interrupted, landed and heard runs equal the model after every step",
    () =>
      Effect.gen(function* () {
        let refusedForks = 0;
        let replacedWhileRunning = 0;
        let stoppedWhileRunning = 0;
        let closedWhileRunning = 0;
        let landedResults = 0;
        let staleLands = 0;
        let heldForks = 0;
        let staleHeldForks = 0;
        let heardFailures = 0;

        const program = (cmds: ReadonlyArray<Command>) =>
          Effect.gen(function* () {
            // The module under test, and what it did.
            const scope = Scope.makeUnsafe();
            const run = yield* Scope.provide(makeSupersedingRun(), scope);
            const tokens: Array<RunToken> = [];
            const gates = new Map<number, Deferred.Deferred<void>>();
            const returns: Array<boolean> = [];
            const started: Array<number> = [];
            const ended: Array<number> = [];
            const interrupted: Array<number> = [];
            const landed: Array<number> = [];
            const heard: Array<number> = [];
            let closedAt: { readonly started: number; readonly landed: number; readonly heard: number } | undefined;

            // The reference model.
            let closed = false;
            let current: number | undefined;
            let installed: ModelRun | undefined;
            const runs: Array<ModelRun> = [];
            const modelReturns: Array<boolean> = [];
            const modelStarted: Array<number> = [];
            const modelInterrupted: Array<number> = [];
            const modelLanded: Array<number> = [];
            const modelHeard: Array<number> = [];

            const allocate = (kind: Kind, token: number): ModelRun => {
              const model: ModelRun = { id: runs.length, token, kind, state: "unstarted" };
              runs.push(model);
              return model;
            };

            // Waits on its gate, then lands only while its token is current, or dies.
            const realBody = (model: ModelRun, token: RunToken, prefix: () => void = () => undefined) => {
              const gate = Deferred.makeUnsafe<void>();
              gates.set(model.id, gate);
              const wait: Effect.Effect<void> = model.kind === "Never" ? Effect.never : Deferred.await(gate);
              return Effect.sync(() => {
                started.push(model.id);
                prefix();
              }).pipe(
                Effect.andThen(wait),
                Effect.andThen(
                  Effect.suspend(() => {
                    ended.push(model.id);
                    return model.kind === "Die"
                      ? Effect.die(new Error("boom"))
                      : Effect.sync(() => {
                          if (run.isCurrent(token)) landed.push(model.id);
                        });
                  }),
                ),
                Effect.onInterrupt(() =>
                  Effect.sync(() => {
                    interrupted.push(model.id);
                  }),
                ),
              );
            };
            const hooksFor = (model: ModelRun): ForkHooks => ({
              onFailure: () => {
                heard.push(model.id);
              },
            });

            const installModel = (model: ModelRun) => {
              if (installed !== undefined && installed.state === "running") {
                installed.state = "interrupted";
                modelInterrupted.push(installed.id);
              }
              installed = model;
              model.state = "running";
              modelStarted.push(model.id);
            };

            const ascending = (x: number, y: number) => x - y;
            const check = () => {
              const modelRunning = runs.filter((r) => r.state === "running").map((r) => r.id);
              const running = started.filter((id) => !interrupted.includes(id) && !ended.includes(id));
              assert.isAtMost(running.length, 1, "law 1: at most one run is running");
              assert.deepStrictEqual(running, modelRunning, "law 1: the running run equals the model's");
              tokens.forEach((token, i) => {
                assert.strictEqual(run.isCurrent(token), current === i, `law 2: isCurrent of token ${i}`);
              });
              assert.strictEqual(run.closed(), closed, "law 2: closed");
              assert.deepStrictEqual(returns, modelReturns, "law 3: what fork answered");
              assert.deepStrictEqual(started, modelStarted, "law 4: the started runs, in order");
              assert.deepStrictEqual(
                landed,
                modelLanded,
                "law 4: only a run whose token is current when it lands lands, and every such run lands",
              );
              assert.deepStrictEqual(heard, modelHeard, "law 5: onFailure hears exactly the current runs that die");
              assert.deepStrictEqual(
                [...interrupted].sort(ascending),
                [...modelInterrupted].sort(ascending),
                "law 6: the interrupted runs",
              );
              assert.deepStrictEqual(
                [...ended].sort(ascending),
                runs.filter((r) => r.state === "done" || r.state === "died").map((r) => r.id),
                "law 6: the runs that ended on their own",
              );
              if (closedAt !== undefined) {
                assert.strictEqual(started.length, closedAt.started, "law 7: nothing starts after close");
                assert.strictEqual(landed.length, closedAt.landed, "law 7: nothing lands after close");
                assert.strictEqual(heard.length, closedAt.heard, "law 7: nothing is heard after close");
              }
            };
            const done = Effect.gen(function* () {
              yield* settleTurns;
              check();
            });

            const beginStep = Effect.gen(function* () {
              tokens.push(run.begin());
              if (!closed) current = tokens.length - 1;
              yield* done;
            });

            const forkStep = (cmd: Extract<Command, { readonly _tag: "Fork" }>) =>
              Effect.gen(function* () {
                if (cmd.fresh) {
                  tokens.push(run.begin());
                  if (!closed) current = tokens.length - 1;
                }
                const n = tokens.length;
                const index = n - 1 - Math.min(cmd.pick, n - 1);
                const token = tokens[index];
                // No token begun yet: a fork has nothing to name.
                if (token === undefined) return yield* done;

                const nested = cmd.body === "Nest" || cmd.body === "NestStale";
                const outer = allocate(cmd.body === "Die" || cmd.body === "Never" ? cmd.body : "Ok", index);
                const inner = nested ? allocate("Ok", n) : undefined;
                const prefix = () => {
                  if (inner === undefined) return;
                  const innerToken = run.begin();
                  tokens.push(innerToken);
                  returns.push(run.fork(innerToken, realBody(inner, innerToken), hooksFor(inner)));
                  if (cmd.body === "NestStale") tokens.push(run.begin());
                };
                returns.push(run.fork(token, realBody(outer, token, prefix), hooksFor(outer)));

                if (current !== index) {
                  modelReturns.push(false);
                  refusedForks += 1;
                  return yield* done;
                }
                if (installed !== undefined && installed.state === "running") replacedWhileRunning += 1;
                installModel(outer);
                if (inner !== undefined) {
                  // The inner begin is current, and its fork is held until the outer start returns.
                  current = n;
                  modelReturns.push(true);
                  heldForks += 1;
                  if (cmd.body === "NestStale") {
                    current = n + 1;
                    staleHeldForks += 1;
                  } else {
                    installModel(inner);
                  }
                }
                modelReturns.push(true);
                yield* done;
              });

            const landStep = Effect.gen(function* () {
              const target = installed;
              const gate = target === undefined ? undefined : gates.get(target.id);
              if (target === undefined || target.state !== "running" || target.kind === "Never") return yield* done;
              if (gate === undefined) return assert.fail("a started run has no gate");
              yield* Deferred.succeed(gate, undefined);
              yield* settleTurns;
              const lands = current === target.token;
              target.state = target.kind === "Die" ? "died" : "done";
              if (!lands) staleLands += 1;
              else if (target.kind === "Die") {
                modelHeard.push(target.id);
                heardFailures += 1;
              } else {
                modelLanded.push(target.id);
                landedResults += 1;
              }
              yield* done;
            });

            const stopStep = Effect.gen(function* () {
              run.stop();
              if (!closed) {
                current = -1;
                if (installed !== undefined && installed.state === "running") {
                  installed.state = "interrupted";
                  modelInterrupted.push(installed.id);
                  stoppedWhileRunning += 1;
                }
                installed = undefined;
              }
              yield* done;
            });

            const closeScope = Effect.gen(function* () {
              yield* Scope.close(scope, Exit.void);
              yield* settleTurns;
              if (!closed) {
                closed = true;
                current = undefined;
                if (installed !== undefined && installed.state === "running") {
                  installed.state = "interrupted";
                  modelInterrupted.push(installed.id);
                }
              }
              closedAt ??= { started: started.length, landed: landed.length, heard: heard.length };
              check();
            });
            const closeStep = Effect.gen(function* () {
              if (!closed && installed !== undefined && installed.state === "running") closedWhileRunning += 1;
              yield* closeScope;
            });

            // A new Command is a compile error here, not a silent no-op.
            const step = Match.type<Command>().pipe(
              Match.tagsExhaustive({
                Begin: () => beginStep,
                Fork: forkStep,
                Land: () => landStep,
                Stop: () => stopStep,
                Close: () => closeStep,
              }),
            );

            for (const cmd of cmds) yield* step(cmd);
            yield* closeScope;
          });

        yield* Effect.promise(() =>
          FastCheck.assert(
            FastCheck.asyncProperty(commands, (cmds) => Effect.runPromise(program(cmds))),
            { numRuns: 300, seed: 3701 },
          ),
        );

        assert.isAtLeast(refusedForks, 30, "forks refused because their token was not current");
        assert.isAtLeast(replacedWhileRunning, 30, "forks that replaced a run while it ran");
        assert.isAtLeast(stoppedWhileRunning, 30, "stops that found a run running");
        assert.isAtLeast(closedWhileRunning, 30, "closes that found a run running");
        assert.isAtLeast(landedResults, 30, "results that landed");
        assert.isAtLeast(staleLands, 30, "runs released after their token stopped being current");
        assert.isAtLeast(heldForks, 30, "forks held while another start ran");
        assert.isAtLeast(staleHeldForks, 30, "held forks whose token went stale before they installed");
        assert.isAtLeast(heardFailures, 30, "failures onFailure heard");
      }),
    60_000,
  );
});
