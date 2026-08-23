import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Ref from "effect/Ref";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import type { AuthSubject } from "../src/AuthSubject.ts";
import { DecisionCache, decisionCacheLayer } from "../src/DecisionCache.ts";
import { isAllowed } from "../src/Decision.ts";
import { AttributeResolveError } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import { makeSubjectId } from "../src/Identity.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { isolatedMetrics, subjectWith, testLayer } from "./helpers.ts";

/**
 * Forks `count` copies of `effect`, yields enough scheduler turns for every
 * fork to actually run up to whatever it is blocked on, then returns the
 * fibers — still running, not yet joined. The caller opens whatever gate
 * they are blocked on and joins them afterward.
 */
const forkAllAndSettle = <A, E, R>(effect: Effect.Effect<A, E, R>, count: number) =>
  Effect.gen(function* () {
    const fibers = yield* Effect.forEach(Array.from({ length: count }, () => effect), (e) =>
      Effect.forkChild(e),
    );
    for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
    return fibers;
  });

describe("DecisionCache", () => {
  /** Answerable only through the resolver, so lookups are countable. */
  const needsLookup = P.hasAttribute("clearance", M.gte(1));

  const counting = (calls: Array<string>, answer = 5) =>
    Layer.succeed(AttributeResolver, {
      resolve: (id: string, attribute: string) =>
        Effect.sync(() => {
          calls.push(`${id}:${attribute}`);
          return answer;
        }),
    });

  const alice = subjectWith({ id: "u-1" });
  const bob = subjectWith({ id: "u-2" });

  it.effect("absent by default: the same question costs the same lookups twice", () =>
    Effect.gen(function* () {
      // The baseline that makes the option honest — no cache means no change.
      const calls: Array<string> = [];
      yield* Effect.gen(function* () {
        yield* evaluate(needsLookup);
        yield* evaluate(needsLookup);
      }).pipe(Effect.provide(testLayer(alice, { attributes: counting(calls) })));

      assert.deepStrictEqual(calls, ["u-1:clearance", "u-1:clearance"]);
    }));

  it.effect("with a cache around the request, the second ask performs no lookup", () =>
    Effect.gen(function* () {
      const calls: Array<string> = [];
      const [first, second] = yield* Effect.gen(function* () {
        return [yield* evaluate(needsLookup), yield* evaluate(needsLookup)] as const;
      }).pipe(
        Effect.provide(testLayer(alice, { attributes: counting(calls) })),
        Effect.provide(decisionCacheLayer()),
      );

      assert.isTrue(isAllowed(first));
      assert.isTrue(isAllowed(second));
      assert.deepStrictEqual(calls, ["u-1:clearance"]);
    }));

  it.effect("A CACHE PROVIDED PER EVALUATION CACHES NOTHING, which is the usage trap", () =>
    Effect.gen(function* () {
      // Worth an assertion rather than a doc comment. `Effect.provide` builds the
      // layer per execution, so a caller who pipes the cache onto each `evaluate`
      // gets a fresh empty cache every time — and pays for it in code that looks
      // right. The layer has to wrap the unit of work, which for a caller is the
      // request.
      const calls: Array<string> = [];
      const perEvaluation = () =>
        evaluate(needsLookup).pipe(
          Effect.provide(testLayer(alice, { attributes: counting(calls) })),
          Effect.provide(decisionCacheLayer()),
        );

      yield* perEvaluation();
      yield* perEvaluation();
      assert.deepStrictEqual(calls, ["u-1:clearance", "u-1:clearance"]);
    }));

  it.effect("a hit is identical to a miss, EXCEPT for the evaluation id", () =>
    Effect.gen(function* () {
      // The design point. Caching the `Decision` whole would hand two evaluations
      // the same `evaluationId`, so two log lines would claim to be one event and
      // correlation — the one thing an identifier is for — would stop working. The
      // TRACE is cached and the id is re-stamped per call.
      const [miss, hit] = yield* Effect.gen(function* () {
        const opts = { resource: { id: "doc-1" } };
        return [yield* evaluate(needsLookup, opts), yield* evaluate(needsLookup, opts)] as const;
      }).pipe(
        Effect.provide(testLayer(alice, { attributes: counting([]) })),
        Effect.provide(decisionCacheLayer()),
      );

      assert.deepStrictEqual(hit.trace, miss.trace);
      assert.strictEqual(isAllowed(hit), isAllowed(miss));
      assert.strictEqual(hit.subjectId, miss.subjectId);
      // Asserted as INEQUALITY, because equality here would be the defect.
      assert.notStrictEqual(hit.evaluationId, miss.evaluationId);
    }));

  it.effect("THE KEY INCLUDES THE SUBJECT, so one subject's allow is not another's", () =>
    Effect.gen(function* () {
      // The security boundary. A cache keyed on the policy alone would serve
      // alice's allow to bob. One cache, two subjects, and the resolver answers
      // differently for each — so a leak would show as bob being allowed.
      const calls: Array<string> = [];
      const resolver = Layer.succeed(AttributeResolver, {
        resolve: (id: string, attribute: string) =>
          Effect.sync(() => {
            calls.push(`${id}:${attribute}`);
            return id === "u-1" ? 5 : 0; // only alice clears the bar
          }),
      });

      const [forAlice, forBob] = yield* Effect.gen(function* () {
        const a = yield* evaluate(needsLookup).pipe(
          Effect.provide(testLayer(alice, { attributes: resolver })),
        );
        const b = yield* evaluate(needsLookup).pipe(
          Effect.provide(testLayer(bob, { attributes: resolver })),
        );
        return [a, b] as const;
      }).pipe(Effect.provide(decisionCacheLayer()));

      assert.isTrue(isAllowed(forAlice));
      assert.isFalse(isAllowed(forBob));
      // Both were asked: bob did not read alice's entry.
      assert.deepStrictEqual(calls, ["u-1:clearance", "u-2:clearance"]);
    }));

  it.effect("the resource is part of the question", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("tenantId", M.eq(M.literal("t-1")));

      const [first, second] = yield* Effect.gen(function* () {
        const a = yield* evaluate(policy, { resource: { id: "a", tenantId: "t-1" } });
        const b = yield* evaluate(policy, { resource: { id: "b", tenantId: "t-2" } });
        return [a, b] as const;
      }).pipe(
        Effect.provide(testLayer(alice)),
        Effect.provide(decisionCacheLayer()),
      );

      // Same subject, same policy, different resource — different answers.
      assert.isTrue(isAllowed(first));
      assert.isFalse(isAllowed(second));
    }));

  it.effect("the action is part of the question", () =>
    Effect.gen(function* () {
      const policy = P.hasAction("read");

      const [read, write] = yield* Effect.gen(function* () {
        const a = yield* evaluate(policy, { action: "read" });
        const b = yield* evaluate(policy, { action: "write" });
        return [a, b] as const;
      }).pipe(
        Effect.provide(testLayer(alice)),
        Effect.provide(decisionCacheLayer()),
      );

      assert.isTrue(isAllowed(read));
      assert.isFalse(isAllowed(write));
    }));

  it.effect("a denial is cached too, and stays a denial", () =>
    Effect.gen(function* () {
      // A cache that only remembered allows would re-ask every denial, which is the
      // expensive case in a library whose defaults deny.
      const calls: Array<string> = [];
      const [first, second] = yield* Effect.gen(function* () {
        return [yield* evaluate(needsLookup), yield* evaluate(needsLookup)] as const;
      }).pipe(
        Effect.provide(testLayer(alice, { attributes: counting(calls, 0) })),
        Effect.provide(decisionCacheLayer()),
      );

      assert.isFalse(isAllowed(first));
      assert.isFalse(isAllowed(second));
      assert.deepStrictEqual(calls, ["u-1:clearance"]);
    }));

  it.effect("obligations and visible fields survive a hit intact", () =>
    Effect.gen(function* () {
      const policy = P.obliged(
        obligation("audit.log"),
        P.hasPermission(permission("doc", "read"), { fields: ["id", "title"] }),
      );
      const subject = subjectWith({ id: "u-1", permissions: ["doc:read"] });

      const [miss, hit] = yield* Effect.gen(function* () {
        return [yield* evaluate(policy), yield* evaluate(policy)] as const;
      }).pipe(Effect.provide(testLayer(subject)), Effect.provide(decisionCacheLayer()));

      assert.isTrue(isAllowed(miss));
      assert.isTrue(isAllowed(hit));
      if (!isAllowed(miss) || !isAllowed(hit)) return;

      assert.deepStrictEqual(hit.visibleFields, ["id", "title"]);
      assert.deepStrictEqual(
        hit.obligations.map((o) => o.id),
        miss.obligations.map((o) => o.id),
      );
    }));

  it.effect("a resource whose keys differ in order is the SAME question", () =>
    Effect.gen(function* () {
      // It used to miss, and that was defended as the safe direction of a
      // stringified key. The key is now the struct itself, compared with
      // Effect's structural `Equal`/`Hash`, so property order is not a
      // property of the question and this hits.
      const calls: Array<string> = [];
      yield* Effect.gen(function* () {
        yield* evaluate(needsLookup, { resource: { a: 1, b: 2 } });
        yield* evaluate(needsLookup, { resource: { b: 2, a: 1 } });
      }).pipe(
        Effect.provide(testLayer(alice, { attributes: counting(calls) })),
        Effect.provide(decisionCacheLayer()),
      );

      assert.strictEqual(calls.length, 1, "same question, one evaluation");
    }));

  it.effect("TWO DIFFERENT QUESTIONS NEVER SHARE A KEY", () =>
    Effect.gen(function* () {
      // The defect the reordering test's old comment claimed was impossible.
      // `JSON.stringify` maps a Date onto its ISO string, so these two resources
      // produced one key — and the second caller was handed the first's verdict.
      // A collision serves one question's decision as another's answer, which is
      // INV-QD-025 broken, not merely a cache inefficiency.
      const calls: Array<string> = [];
      yield* Effect.gen(function* () {
        yield* evaluate(needsLookup, { resource: { d: new Date(0) } });
        yield* evaluate(needsLookup, { resource: { d: "1970-01-01T00:00:00.000Z" } });
      }).pipe(
        Effect.provide(testLayer(alice, { attributes: counting(calls) })),
        Effect.provide(decisionCacheLayer()),
      );

      assert.strictEqual(calls.length, 2, "a Date is not its ISO string");
    }));

  it.effect("an undefined-valued property is not an absent one", () =>
    Effect.gen(function* () {
      // The second stringify collision: `JSON.stringify` drops
      // `undefined`-valued properties outright, so `{a: 1, b: undefined}` and
      // `{a: 1}` produced one key.
      const calls: Array<string> = [];
      yield* Effect.gen(function* () {
        yield* evaluate(needsLookup, { resource: { a: 1, b: undefined } });
        yield* evaluate(needsLookup, { resource: { a: 1 } });
      }).pipe(
        Effect.provide(testLayer(alice, { attributes: counting(calls) })),
        Effect.provide(decisionCacheLayer()),
      );

      assert.strictEqual(calls.length, 2, "an explicit undefined is part of the question");
    }));

  it.effect("size reports what is held, so a caller can measure its own hit rate", () =>
    Effect.gen(function* () {
      const held = yield* Effect.gen(function* () {
        yield* evaluate(needsLookup);
        yield* evaluate(needsLookup); // hit, so no new entry
        yield* evaluate(needsLookup, { resource: { id: "doc-1" } }); // a different question
        return yield* DecisionCache.use((c) => c.size);
      }).pipe(
        Effect.provide(testLayer(alice, { attributes: counting([]) })),
        Effect.provide(decisionCacheLayer()),
      );

      assert.strictEqual(held, 2);
    }));

  it.effect(
    "a cache hit never runs evaluateNode at all, not even the leaf-level synchronous work",
    () =>
      Effect.gen(function* () {
        // `HasRole` decides via `subject.roles.has(...)` synchronously, inline
        // in evaluateNode's own switch — not deferred behind an Effect the
        // way HasAttribute's resolver call is. A `Set` subclass that counts
        // `.has()` calls makes that synchronous work observable from outside.
        class CountingRoles extends Set<P.RoleName> {
          hasCalls = 0;
          override has(value: P.RoleName): boolean {
            this.hasCalls++;
            return super.has(value);
          }
        }
        const roles = new CountingRoles([P.makeRoleName("admin")]);
        const subject: AuthSubject = {
          id: makeSubjectId("u1"),
          roles,
          permissions: new Set(),
          attributes: {},
        };

        yield* Effect.gen(function* () {
          yield* evaluate(P.hasRole("admin")); // miss: evaluateNode runs, roles.has called once
          yield* evaluate(P.hasRole("admin")); // hit: must not call roles.has again
        }).pipe(Effect.provide(testLayer(subject)), Effect.provide(decisionCacheLayer()));

        assert.strictEqual(
          roles.hasCalls,
          1,
          "the cache hit re-ran evaluateNode's synchronous leaf work instead of skipping it",
        );
      }),
  );

  it.effect("concurrency and the cache compose without either changing the answer", () =>
    Effect.gen(function* () {
      const policy = P.allOf([needsLookup, P.hasAttribute("other", M.gte(1))]);
      const calls: Array<string> = [];

      const [sequential, concurrent] = yield* Effect.gen(function* () {
        const a = yield* evaluate(policy);
        const b = yield* evaluate(policy, { concurrency: "unbounded" });
        return [a, b] as const;
      }).pipe(
        Effect.provide(testLayer(alice, { attributes: counting(calls) })),
        Effect.provide(decisionCacheLayer()),
      );

      // The second ask differs only in `concurrency`, which is NOT part of the key —
      // it cannot change the answer (INV-QD-020), so it must not split the entry.
      assert.deepStrictEqual(concurrent.trace, sequential.trace);
      assert.deepStrictEqual(calls, ["u-1:clearance", "u-1:other"]);
    }));

  it.effect(
    "N concurrent identical asks coalesce into one compute — the resolver is invoked once",
    () =>
      Effect.gen(function* () {
        const invocations = yield* Ref.make(0);
        const gate = yield* Deferred.make<void>();
        // Blocks every caller on the same gate, so all N asks are genuinely
        // in flight together rather than finishing one at a time.
        const blockingResolver = Layer.succeed(AttributeResolver, {
          resolve: () =>
            Ref.update(invocations, (n) => n + 1).pipe(
              Effect.flatMap(() => Deferred.await(gate)),
              Effect.as(5),
            ),
        });

        const decisions = yield* Effect.gen(function* () {
          const fibers = yield* forkAllAndSettle(evaluate(needsLookup), 5);
          // Every fiber is now blocked inside the resolver, on the gate — if
          // coalescing worked, that's one fiber, not five.
          assert.strictEqual(
            yield* Ref.get(invocations),
            1,
            "only the fiber that claimed the key should have reached the resolver",
          );
          yield* Deferred.succeed(gate, undefined);
          return yield* Effect.forEach(fibers, Fiber.join);
        }).pipe(
          Effect.provide(testLayer(alice, { attributes: blockingResolver })),
          Effect.provide(decisionCacheLayer()),
        );

        for (const decision of decisions) assert.isTrue(isAllowed(decision));
        assert.strictEqual(yield* Ref.get(invocations), 1);
      }),
  );

  it.effect("a failed compute is not cached — the next ask, once nothing is in flight, retries", () =>
    Effect.gen(function* () {
      const invocations = yield* Ref.make(0);
      const alwaysFails = Layer.succeed(AttributeResolver, {
        resolve: (_id, attribute) =>
          Ref.updateAndGet(invocations, (n) => n + 1).pipe(
            Effect.flatMap((n) =>
              Effect.fail(new AttributeResolveError({ attribute, cause: `down (attempt ${n})` })),
            ),
          ),
      });

      const [first, second, size] = yield* Effect.gen(function* () {
        const a = yield* Effect.result(evaluate(needsLookup));
        const b = yield* Effect.result(evaluate(needsLookup));
        return [a, b, yield* DecisionCache.use((c) => c.size)] as const;
      }).pipe(
        Effect.provide(testLayer(alice, { attributes: alwaysFails })),
        Effect.provide(decisionCacheLayer()),
      );

      assert.strictEqual(first._tag, "Failure");
      assert.strictEqual(second._tag, "Failure");
      // Not memoized: the second ask re-ran the resolver rather than replaying
      // the first ask's failure from a stale entry.
      assert.strictEqual(yield* Ref.get(invocations), 2);
      // And nothing failed ever becomes a completed entry.
      assert.strictEqual(size, 0);
    }));

  it.effect(
    "N concurrent identical asks share a genuine failure — the resolver is invoked once",
    () =>
      Effect.gen(function* () {
        const invocations = yield* Ref.make(0);
        const gate = yield* Deferred.make<void>();
        const failingResolver = Layer.succeed(AttributeResolver, {
          resolve: (_id, attribute) =>
            Ref.update(invocations, (n) => n + 1).pipe(
              Effect.flatMap(() => Deferred.await(gate)),
              Effect.flatMap(() =>
                Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
              ),
            ),
        });

        const results = yield* Effect.gen(function* () {
          const fibers = yield* forkAllAndSettle(evaluate(needsLookup), 5);
          assert.strictEqual(
            yield* Ref.get(invocations),
            1,
            "only the fiber that claimed the key should have reached the resolver",
          );
          yield* Deferred.succeed(gate, undefined);
          return yield* Effect.forEach(fibers, (f) => Effect.result(Fiber.join(f)));
        }).pipe(
          Effect.provide(testLayer(alice, { attributes: failingResolver })),
          Effect.provide(decisionCacheLayer()),
        );

        for (const result of results) assert.strictEqual(result._tag, "Failure");
        assert.strictEqual(
          yield* Ref.get(invocations),
          1,
          "the failure was shared, not independently retried by each waiter",
        );
      }),
  );

  it.effect(
    "an interrupted claimant still resolves the shared claim — a later ask does not hang forever",
    () =>
      Effect.gen(function* () {
        const started = yield* Deferred.make<void>();
        const release = yield* Deferred.make<void>();
        const invocations = yield* Ref.make(0);
        // Only the FIRST call blocks (and signals `started` once it's inside
        // the block, so the test knows the claimant genuinely holds the claim
        // before interrupting it). Every later call answers immediately, so a
        // correctly-cleared claim resolves fast and a stuck one times out.
        const resolver = Layer.succeed(AttributeResolver, {
          resolve: () =>
            Ref.updateAndGet(invocations, (n) => n + 1).pipe(
              Effect.flatMap((n) =>
                n === 1
                  ? Deferred.succeed(started, undefined).pipe(
                      Effect.flatMap(() => Deferred.await(release)),
                      Effect.as(5),
                    )
                  : Effect.succeed(5),
              ),
            ),
        });

        const outcome = yield* Effect.gen(function* () {
          const claimant = yield* Effect.forkChild(evaluate(needsLookup));
          // Wait until the claimant is genuinely holding the claim, blocked
          // inside `compute` — not merely forked.
          yield* Deferred.await(started);
          // `Fiber.interrupt` waits for the target fiber to fully settle, but
          // that is not enough on its own — confirmed empirically, not
          // assumed: a fiber interrupted while suspended inside `compute`
          // never returns control to code sequenced *after* an
          // `Effect.exit(compute)` yield at all, even code wrapped in
          // `Effect.uninterruptible`. Only a finalizer attached via
          // `Effect.onExit` (what `getOrCompute` actually uses) is guaranteed
          // to run on every path `compute` can end on, interruption included.
          yield* Fiber.interrupt(claimant);

          // A later ask for the exact same question. Under the bug, the
          // claimant's Deferred was never resolved and its key was never
          // cleared from `inFlight`, so this would await a Deferred that can
          // never complete — a permanent hang, not just a slow answer.
          return yield* Effect.timeoutOption(500)(Effect.exit(evaluate(needsLookup)));
        }).pipe(
          Effect.provide(testLayer(alice, { attributes: resolver })),
          Effect.provide(decisionCacheLayer()),
        );

        assert.strictEqual(
          outcome._tag,
          "Some",
          "the later ask timed out — the interrupted claimant's entry was left stuck in DecisionCache",
        );
      }),
  );

  describe("capacity", () => {
    it.effect("rejects a negative capacity rather than looping forever", () =>
      Effect.gen(function* () {
        // Regression: a negative capacity used to make the eviction loop's own
        // exit condition unsatisfiable once `entries` ran dry — an infinite
        // loop inside `Effect.sync`, not a small cache.
        const exit = yield* Effect.exit(
          evaluate(needsLookup).pipe(
            Effect.provide(testLayer(alice, { attributes: counting([]) })),
            Effect.provide(decisionCacheLayer({ capacity: -1 })),
          ),
        );
        assert.strictEqual(exit._tag, "Failure");
        if (exit._tag !== "Failure") return;
        const defect = Cause.squash(exit.cause);
        assert.instanceOf(defect, Error);
        if (!(defect instanceof Error)) return;
        assert.match(defect.message, /capacity/i);
      }));

    it.effect("rejects a fractional or NaN capacity rather than silently disabling eviction", () =>
      Effect.gen(function* () {
        // Regression: `size(entries) > NaN` is always false, so an unvalidated
        // NaN capacity made eviction a silent no-op — "bounded" in name only.
        const exit = yield* Effect.exit(
          evaluate(needsLookup).pipe(
            Effect.provide(testLayer(alice, { attributes: counting([]) })),
            Effect.provide(decisionCacheLayer({ capacity: Number.NaN })),
          ),
        );
        assert.strictEqual(exit._tag, "Failure");
      }));

    it.effect("capacity: 0 is a legal, degenerate cache that retains nothing", () =>
      Effect.gen(function* () {
        const calls: Array<string> = [];
        yield* Effect.gen(function* () {
          yield* evaluate(needsLookup);
          yield* evaluate(needsLookup);
        }).pipe(
          Effect.provide(testLayer(alice, { attributes: counting(calls) })),
          Effect.provide(decisionCacheLayer({ capacity: 0 })),
        );

        assert.deepStrictEqual(calls, ["u-1:clearance", "u-1:clearance"]);
      }));

    it.effect("unset, still unbounded — the existing behaviour every prior test assumes", () =>
      Effect.gen(function* () {
        const held = yield* Effect.gen(function* () {
          yield* evaluate(needsLookup, { resource: { id: "doc-1" } });
          yield* evaluate(needsLookup, { resource: { id: "doc-2" } });
          yield* evaluate(needsLookup, { resource: { id: "doc-3" } });
          return yield* DecisionCache.use((c) => c.size);
        }).pipe(
          Effect.provide(testLayer(alice, { attributes: counting([]) })),
          Effect.provide(decisionCacheLayer()),
        );

        assert.strictEqual(held, 3);
      }));

    it.effect("evicts the oldest completed entry once exceeded, insertion order (FIFO)", () =>
      Effect.gen(function* () {
        const calls: Array<string> = [];
        const ask = (id: string) => evaluate(needsLookup, { resource: { id } });

        yield* Effect.gen(function* () {
          yield* ask("doc-1");
          yield* ask("doc-2");
          // Capacity 2: inserting doc-3 pushes size to 3, so doc-1 — the
          // oldest — is evicted immediately after.
          yield* ask("doc-3");
          const afterThird = yield* DecisionCache.use((c) => c.size);
          assert.strictEqual(afterThird, 2, "capacity must never be exceeded, not even transiently");

          yield* ask("doc-2"); // still held — a hit, no resolver call
          yield* ask("doc-1"); // evicted — a miss, one more resolver call
        }).pipe(
          Effect.provide(testLayer(alice, { attributes: counting(calls) })),
          Effect.provide(decisionCacheLayer({ capacity: 2 })),
        );

        assert.deepStrictEqual(calls, [
          "u-1:clearance", // doc-1: miss
          "u-1:clearance", // doc-2: miss
          "u-1:clearance", // doc-3: miss, evicts doc-1
          "u-1:clearance", // doc-1 again: miss — it was evicted
        ]);
      }));

    it.effect("never evicts a key with a compute still in flight", () =>
      Effect.gen(function* () {
        // A capacity of 1 under two genuinely concurrent, DIFFERENT questions
        // is the case eviction must not touch: neither claim is a completed
        // entry yet, so there is nothing eviction is entitled to remove.
        const gate = yield* Deferred.make<void>();
        const blockingResolver = Layer.succeed(AttributeResolver, {
          resolve: () => Deferred.await(gate).pipe(Effect.as(5)),
        });

        const [first, second] = yield* Effect.gen(function* () {
          const fiberA = yield* Effect.forkChild(evaluate(needsLookup, { resource: { id: "doc-1" } }));
          const fiberB = yield* Effect.forkChild(evaluate(needsLookup, { resource: { id: "doc-2" } }));
          for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
          yield* Deferred.succeed(gate, undefined);
          return [yield* Fiber.join(fiberA), yield* Fiber.join(fiberB)] as const;
        }).pipe(
          Effect.provide(testLayer(alice, { attributes: blockingResolver })),
          Effect.provide(decisionCacheLayer({ capacity: 1 })),
        );

        assert.isTrue(isAllowed(first));
        assert.isTrue(isAllowed(second));
      }));
  });

  describe("qadi_decision_cache_lookups_total", () => {
    const frequencyOf = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>) =>
      snapshots.find(
        (s): s is Extract<Metric.Metric.Snapshot, { type: "Frequency" }> =>
          s.type === "Frequency" && s.id === "qadi_decision_cache_lookups_total",
      );

    it.effect("counts a miss, then a hit, under separate outcomes", () =>
      Effect.gen(function* () {
        const snapshots = yield* isolatedMetrics(
          Effect.gen(function* () {
            yield* evaluate(needsLookup);
            yield* evaluate(needsLookup);
            return yield* Metric.snapshot;
          }).pipe(
            Effect.provide(testLayer(alice, { attributes: counting([]) })),
            Effect.provide(decisionCacheLayer()),
          ),
        );

        const lookups = frequencyOf(snapshots);
        assert.isDefined(lookups);
        assert.strictEqual(lookups?.state.occurrences.get("miss"), 1);
        assert.strictEqual(lookups?.state.occurrences.get("hit"), 1);
        assert.isUndefined(lookups?.state.occurrences.get("coalesced"));
      }));

    it.effect("counts a coalesced join separately from the claiming miss", () =>
      Effect.gen(function* () {
        const invocations = yield* Ref.make(0);
        const gate = yield* Deferred.make<void>();
        const blockingResolver = Layer.succeed(AttributeResolver, {
          resolve: () =>
            Ref.update(invocations, (n) => n + 1).pipe(
              Effect.flatMap(() => Deferred.await(gate)),
              Effect.as(5),
            ),
        });

        const snapshots = yield* isolatedMetrics(
          Effect.gen(function* () {
            const fibers = yield* forkAllAndSettle(evaluate(needsLookup), 2);
            yield* Deferred.succeed(gate, undefined);
            yield* Effect.forEach(fibers, Fiber.join);
            return yield* Metric.snapshot;
          }).pipe(
            Effect.provide(testLayer(alice, { attributes: blockingResolver })),
            Effect.provide(decisionCacheLayer()),
          ),
        );

        const lookups = frequencyOf(snapshots);
        assert.isDefined(lookups);
        assert.strictEqual(lookups?.state.occurrences.get("miss"), 1);
        assert.strictEqual(lookups?.state.occurrences.get("coalesced"), 1);
      }));
  });
});
