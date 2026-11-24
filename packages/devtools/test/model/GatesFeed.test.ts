/**
 * The gates feed's watch and thunk cases, against the feed alone (ADR-QD-169).
 *
 * The watch's cases were exercised by building the whole dock model, so each `M<n>`
 * of `DockModel.test.ts` gains a `G<n>` twin here and is deleted there once it is
 * green: the Phase 26 precedent. The `T` cases pin the thunk the feed took from the
 * diagnostics poll, where a throw stopped every tab; here it is stated and the
 * cadence lives.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import * as TestClock from "effect/testing/TestClock";
import * as Tracer from "effect/Tracer";
import * as FastCheck from "fast-check";
import { hasPermission, hasRole, permission } from "@qadi/core";
import type { Policy, Resource } from "@qadi/core";
import type { AskedQuestionLike, GateInstanceLike } from "../../src/model/Gates.ts";
import { AskedRead, RegistryRead, makeGatesFeed } from "../../src/index.ts";
import type { GatesFeed, GatesSnapshot } from "../../src/index.ts";
import { gatesFeedOf } from "../builtFeeds.ts";
import { makeGateRegistryDouble } from "../gateRegistryDouble.ts";
import { guard, readPolicy, settleTurns, thrownBy, tick } from "../helpers.ts";

const writePolicy: Policy = hasPermission(permission("doc", "write"));

/** Counts every notification of the feed, so "publishes nothing" is an observation. */
const listen = (feed: GatesFeed) => {
  const seen = { calls: 0 };
  feed.subscribe(() => {
    seen.calls += 1;
  });
  return seen;
};

const instancesOf = (feed: GatesFeed): ReadonlyArray<GateInstanceLike> | undefined => {
  const { registry } = feed.getSnapshot();
  return RegistryRead.$is("Read")(registry) ? registry.instances : undefined;
};

const registryFailure = (feed: GatesFeed): string | undefined => {
  const { registry } = feed.getSnapshot();
  return RegistryRead.$is("Failed")(registry) ? registry.reason : undefined;
};

const questionsOf = (feed: GatesFeed): ReadonlyArray<AskedQuestionLike> | undefined => {
  const { asked } = feed.getSnapshot();
  return AskedRead.$is("Read")(asked) ? asked.questions : undefined;
};

const askedFailure = (feed: GatesFeed): string | undefined => {
  const { asked } = feed.getSnapshot();
  return AskedRead.$is("Failed")(asked) ? asked.reason : undefined;
};

/** A thunk that counts its calls and answers what `answer` is when it is called. */
const counting = (answer: () => ReadonlyArray<AskedQuestionLike>) => {
  const seen = { calls: 0 };
  return {
    seen,
    thunk: (): ReadonlyArray<AskedQuestionLike> => {
      seen.calls += 1;
      return answer();
    },
  };
};

describe("the gates feed", () => {
  it.effect("G31 (twin of M31): a registry change is published at once with the registry's own array, and a quiet tick publishes nothing", () =>
    Effect.gen(function* () {
      let asked: ReadonlyArray<AskedQuestionLike> = [{ policy: readPolicy }];
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      const feed = yield* gatesFeedOf({ gates: double.registry, questions: () => asked });
      yield* settleTurns;

      assert.strictEqual(instancesOf(feed), double.registry.instances());
      assert.deepStrictEqual(questionsOf(feed), [{ policy: readPolicy }]);

      const seen = listen(feed);
      double.add(guard("b", readPolicy));
      assert.strictEqual(seen.calls, 1);
      const added = feed.getSnapshot();
      assert.strictEqual(instancesOf(feed), double.registry.instances());
      assert.strictEqual(instancesOf(feed)?.length, 2);

      yield* tick;
      assert.strictEqual(feed.getSnapshot(), added);
      assert.strictEqual(seen.calls, 1);

      asked = [{ policy: readPolicy }, { policy: writePolicy }];
      yield* tick;
      assert.strictEqual(seen.calls, 2);
      assert.deepStrictEqual(questionsOf(feed), asked);
    }));

  it.effect("G37 (twin of M37): a registry that throws while the feed is built is stated, the build does not throw, and the subscription is held", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      double.failReads(new Error("registry exploded"));

      const feed = yield* gatesFeedOf({ gates: double.registry });
      yield* settleTurns;

      assert.include(registryFailure(feed) ?? "", "registry exploded");
      assert.strictEqual(double.listeners(), 1);
    }));

  it.effect("T1 a thunk that throws is stated as Failed, the build does not throw, and the cadence keeps reading it", () =>
    Effect.gen(function* () {
      const calls = { n: 0 };
      const feed = yield* gatesFeedOf({
        questions: () => {
          calls.n += 1;
          throw "questions down";
        },
      });
      yield* settleTurns;

      assert.include(askedFailure(feed) ?? "", "questions down");
      assert.strictEqual(calls.n, 1);

      yield* tick;
      yield* tick;
      yield* tick;
      assert.strictEqual(calls.n, 4);
      assert.include(askedFailure(feed) ?? "", "questions down");
    }));

  it.effect("T2 one thunk failure is published once, a different one is published, and an answer mends it", () =>
    Effect.gen(function* () {
      const script: ReadonlyArray<() => ReadonlyArray<AskedQuestionLike>> = [
        () => [],
        () => {
          throw new Error("down");
        },
        () => {
          throw new Error("down");
        },
        () => {
          throw new Error("down");
        },
        () => {
          throw new Error("down again");
        },
        () => [{ policy: readPolicy }],
      ];
      const calls = { n: 0 };
      const feed = yield* gatesFeedOf({
        questions: () => {
          const step = script[calls.n];
          calls.n += 1;
          return step?.() ?? [];
        },
      });
      yield* settleTurns;
      const seen = listen(feed);

      yield* tick;
      yield* tick;
      yield* tick;
      assert.strictEqual(calls.n, 4);
      assert.strictEqual(seen.calls, 1);
      assert.include(askedFailure(feed) ?? "", "down");

      yield* tick;
      assert.strictEqual(seen.calls, 2);
      assert.include(askedFailure(feed) ?? "", "down again");

      yield* tick;
      assert.strictEqual(seen.calls, 3);
      assert.deepStrictEqual(questionsOf(feed), [{ policy: readPolicy }]);
    }));

  it.effect("T3 an answer that throws when compared is stated, not thrown", () =>
    Effect.gen(function* () {
      const hostile = new Proxy([], {
        get: (target, key, receiver) => {
          if (key === "length") throw new Error("a length that throws");
          return Reflect.get(target, key, receiver);
        },
      });
      const calls = { n: 0 };
      const feed = yield* gatesFeedOf({
        questions: () => {
          calls.n += 1;
          return calls.n === 1 ? [{ policy: readPolicy }] : hostile;
        },
      });
      yield* settleTurns;
      assert.deepStrictEqual(questionsOf(feed), [{ policy: readPolicy }]);

      yield* tick;
      assert.strictEqual(calls.n, 2);
      assert.isDefined(askedFailure(feed));

      const unrenderable = new Proxy(
        {},
        {
          get: () => {
            throw new Error("a getter that throws");
          },
          getPrototypeOf: () => {
            throw new Error("a trap that throws");
          },
          ownKeys: () => {
            throw new Error("a trap that throws");
          },
        },
      );
      const other = yield* gatesFeedOf({
        questions: () => {
          throw unrenderable;
        },
      });
      assert.strictEqual(askedFailure(other), "a value that could not be described");
    }));

  it.effect("T4 a new thunk is read by configure at once and restarts the cadence; no thunk stops it", () =>
    Effect.gen(function* () {
      const first = counting(() => []);
      const second = counting(() => [{ policy: readPolicy }]);
      const feed = yield* gatesFeedOf({ questions: first.thunk });
      yield* settleTurns;
      assert.strictEqual(first.seen.calls, 1);

      feed.configure({ questions: second.thunk });
      assert.strictEqual(second.seen.calls, 1);
      assert.deepStrictEqual(questionsOf(feed), [{ policy: readPolicy }]);

      yield* tick;
      assert.strictEqual(first.seen.calls, 1);
      assert.strictEqual(second.seen.calls, 2);

      feed.configure({});
      assert.strictEqual(feed.getSnapshot().asked._tag, "Unhanded");
      yield* tick;
      yield* tick;
      assert.strictEqual(first.seen.calls, 1);
      assert.strictEqual(second.seen.calls, 2);
    }));

  it.effect("T5 the cadence follows intervalMillis, and its first tick is one interval after the build", () =>
    Effect.gen(function* () {
      const quick = counting(() => []);
      yield* gatesFeedOf({ questions: quick.thunk, intervalMillis: 500 });
      yield* settleTurns;
      assert.strictEqual(quick.seen.calls, 1);
      yield* TestClock.adjust("499 millis");
      yield* settleTurns;
      assert.strictEqual(quick.seen.calls, 1);
      yield* TestClock.adjust("1 millis");
      yield* settleTurns;
      assert.strictEqual(quick.seen.calls, 2);

      const slow = counting(() => []);
      yield* gatesFeedOf({ questions: slow.thunk });
      yield* settleTurns;
      yield* TestClock.adjust("1999 millis");
      yield* settleTurns;
      assert.strictEqual(slow.seen.calls, 1);
      yield* TestClock.adjust("1 millis");
      yield* settleTurns;
      assert.strictEqual(slow.seen.calls, 2);
    }));

  it.effect("T6 a fresh array of equal questions keeps the Read's reference, and a changed one replaces it", () =>
    Effect.gen(function* () {
      const list: Array<{ readonly policy: Policy }> = [];
      // A fresh array of fresh, structurally built policies on every read, the way `atoms.asked()` answers.
      const feed = yield* gatesFeedOf({ questions: () => list.map((question) => ({ policy: question.policy })) });
      yield* settleTurns;
      const first = feed.getSnapshot().asked;
      assert.deepStrictEqual(questionsOf(feed), []);

      yield* tick;
      assert.strictEqual(feed.getSnapshot().asked, first);

      list.push({ policy: hasRole("Editor") });
      yield* tick;
      const second = feed.getSnapshot().asked;
      assert.notStrictEqual(second, first);
      assert.strictEqual(questionsOf(feed)?.length, 1);

      list[0] = { policy: hasRole("Editor") };
      yield* tick;
      assert.strictEqual(feed.getSnapshot().asked, second);
    }));

  it.effect("T7 a registry notification reads the registry, not the thunk", () =>
    Effect.gen(function* () {
      const asked = counting(() => [{ policy: readPolicy }]);
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      const feed = yield* gatesFeedOf({ gates: double.registry, questions: asked.thunk });
      yield* settleTurns;
      const seen = listen(feed);

      double.add(guard("b", readPolicy));

      assert.strictEqual(seen.calls, 1);
      assert.strictEqual(instancesOf(feed)?.length, 2);
      assert.strictEqual(asked.seen.calls, 1);
    }));

  it.effect("T8 configure with the thunk and the interval the feed already has reads nothing; a new interval reads at once and re-times the cadence", () =>
    Effect.gen(function* () {
      const asked = counting(() => []);
      const feed = yield* gatesFeedOf({ questions: asked.thunk, intervalMillis: 2000 });
      yield* settleTurns;
      assert.strictEqual(asked.seen.calls, 1);
      const built = feed.getSnapshot();

      feed.configure({ questions: asked.thunk, intervalMillis: 2000 });
      assert.strictEqual(asked.seen.calls, 1);
      assert.strictEqual(feed.getSnapshot(), built);

      feed.configure({ questions: asked.thunk, intervalMillis: 500 });
      assert.strictEqual(asked.seen.calls, 2);
      yield* TestClock.adjust("499 millis");
      yield* settleTurns;
      assert.strictEqual(asked.seen.calls, 2);
      yield* TestClock.adjust("1 millis");
      yield* settleTurns;
      assert.strictEqual(asked.seen.calls, 3);
    }));

  it.effect("T9 a feed with no thunk holds no pending sleep, and handing it none ends the cadence it had", () =>
    Effect.gen(function* () {
      const clock = yield* Clock.Clock;
      const pending = { n: 0 };
      // The test clock, counting the sleeps still waiting: a stopped cadence is a sleep that is gone.
      const counted: Clock.Clock = {
        ...clock,
        sleep: (duration) =>
          Effect.suspend(() => {
            pending.n += 1;
            return clock.sleep(duration).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  pending.n -= 1;
                }),
              ),
            );
          }),
      };
      yield* Effect.gen(function* () {
        const bare = yield* gatesFeedOf({});
        yield* settleTurns;
        assert.strictEqual(pending.n, 0);
        bare.configure({ gates: undefined });
        yield* settleTurns;
        assert.strictEqual(pending.n, 0);

        const feed = yield* gatesFeedOf({ questions: () => [] });
        yield* settleTurns;
        assert.strictEqual(pending.n, 1);
        feed.configure({});
        yield* settleTurns;
        assert.strictEqual(pending.n, 0);
      }).pipe(Effect.provideService(Clock.Clock, counted));
    }));

  it.effect("T10 the feed is built under a span named for it", () =>
    Effect.gen(function* () {
      const names: Array<string> = [];
      const tracer = Tracer.make({
        span: (options) => {
          names.push(options.name);
          return new Tracer.NativeSpan(options);
        },
      });

      yield* gatesFeedOf({}).pipe(Effect.provideService(Tracer.Tracer, tracer));

      assert.include(names, "qadi.devtools.makeGatesFeed");
    }));

  it.effect("G32 (twin of M32): no registry reads Unwatched, an empty one Read of no guard, a listed one Read of its array; no thunk reads Unhanded", () =>
    Effect.gen(function* () {
      const none = yield* makeGatesFeed();
      assert.strictEqual(none.getSnapshot().registry._tag, "Unwatched");
      assert.strictEqual(none.getSnapshot().asked._tag, "Unhanded");

      const empty = yield* gatesFeedOf({ gates: makeGateRegistryDouble().registry });
      assert.deepStrictEqual(instancesOf(empty), []);

      const one = makeGateRegistryDouble([guard("a", readPolicy)]);
      const listed = yield* gatesFeedOf({ gates: one.registry });
      assert.strictEqual(instancesOf(listed), one.registry.instances());
      assert.strictEqual(listed.getSnapshot().asked._tag, "Unhanded");

      const asked = yield* gatesFeedOf({ questions: () => [{ policy: readPolicy }] });
      assert.strictEqual(asked.getSnapshot().registry._tag, "Unwatched");
      assert.deepStrictEqual(questionsOf(asked), [{ policy: readPolicy }]);
    }));

  it.effect("G32 b (twin of M32 b): the feed reads a handed thunk at build, whatever the poll; withholding an unsampled answer is the model's", () =>
    Effect.gen(function* () {
      const feed = yield* gatesFeedOf({ questions: () => [] });

      assert.deepStrictEqual(questionsOf(feed), []);
    }));

  it.effect("G33 (twin of M33): the subscription lives as long as the scope, follows a new registry, and never outlives close", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const b = makeGateRegistryDouble([guard("b1", writePolicy), guard("b2", readPolicy)]);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(gatesFeedOf({ gates: a.registry }), scope);

      assert.strictEqual(a.listeners(), 1);
      assert.strictEqual(a.subscriptions(), 1);
      const first = feed.getSnapshot();

      feed.configure({ gates: a.registry });
      assert.strictEqual(a.subscriptions(), 1);
      assert.strictEqual(feed.getSnapshot(), first);

      feed.configure({ gates: b.registry });
      assert.strictEqual(a.listeners(), 0);
      assert.strictEqual(b.listeners(), 1);
      assert.strictEqual(instancesOf(feed), b.registry.instances());

      feed.configure({});
      assert.strictEqual(b.listeners(), 0);
      assert.strictEqual(feed.getSnapshot().registry._tag, "Unwatched");

      feed.configure({ gates: a.registry });
      assert.strictEqual(a.listeners(), 1);

      yield* Scope.close(scope, Exit.void);
      assert.strictEqual(a.listeners(), 0);
      assert.strictEqual(b.listeners(), 0);

      const subscribed = a.subscriptions();
      feed.configure({ gates: a.registry });
      assert.strictEqual(a.listeners(), 0);
      assert.strictEqual(a.subscriptions(), subscribed);
    }));

  it.effect("G34 (twin of M34): with no thunk no cadence runs, and nothing is published while time passes", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      const feed = yield* gatesFeedOf({ gates: double.registry });
      const first = feed.getSnapshot();
      const seen = listen(feed);

      for (let i = 0; i < 10; i++) yield* tick;

      assert.strictEqual(seen.calls, 0);
      assert.strictEqual(feed.getSnapshot(), first);
    }));

  it.effect("G35 (twin of M35): a closed feed subscribes to no registry a later configure hands it", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const b = makeGateRegistryDouble([guard("b", readPolicy)]);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(gatesFeedOf({ gates: a.registry }), scope);
      yield* Scope.close(scope, Exit.void);

      feed.configure({ gates: b.registry });

      assert.strictEqual(a.listeners(), 0);
      assert.strictEqual(b.listeners(), 0);
      assert.strictEqual(b.subscriptions(), 0);
    }));

  it.effect("G36 (twin of M36): a closed feed reads no registry or thunk a later configure hands it, and none it held", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const b = makeGateRegistryDouble([guard("b", readPolicy)]);
      const held = counting(() => []);
      const handed = counting(() => [{ policy: writePolicy }]);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(gatesFeedOf({ gates: a.registry, questions: held.thunk }), scope);
      yield* Scope.close(scope, Exit.void);
      const readByA = a.reads();
      const last = feed.getSnapshot();

      feed.configure({ gates: b.registry, questions: handed.thunk });
      feed.configure({ gates: a.registry, questions: held.thunk });
      yield* tick;

      assert.strictEqual(b.reads(), 0);
      assert.strictEqual(a.reads(), readByA);
      assert.strictEqual(held.seen.calls, 1);
      assert.strictEqual(handed.seen.calls, 0);
      assert.strictEqual(feed.getSnapshot(), last);
    }));

  const boom = new Error("registry exploded");

  const idsOf = (feed: GatesFeed): ReadonlyArray<string> | undefined => instancesOf(feed)?.map((one) => one.id);

  it.effect("G38 (twin of M38): a throw on a notification the registry swallows still reaches the snapshot, and mending recovers it", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble([guard("a", readPolicy)], { swallowListenerErrors: true });
      const feed = yield* gatesFeedOf({ gates: double.registry, questions: () => [{ policy: readPolicy }] });
      yield* settleTurns;
      const seen = listen(feed);
      assert.deepStrictEqual(idsOf(feed), ["a"]);

      double.failReads(boom);
      const failed = feed.getSnapshot();
      assert.include(registryFailure(feed) ?? "", "registry exploded");
      assert.strictEqual(seen.calls, 1);

      // The same failure thrown afresh, from another call site with another stack, says the same thing.
      double.failReads(new Error("registry exploded"));
      assert.strictEqual(feed.getSnapshot(), failed);
      assert.strictEqual(seen.calls, 1);

      // A different reason is a different statement, though no guard moved with it.
      double.failReads(new Error("registry exploded again"));
      const again = feed.getSnapshot();
      assert.include(registryFailure(feed) ?? "", "registry exploded again");
      assert.strictEqual(seen.calls, 2);

      // A change during the same throw says the same thing: nothing is published for it.
      double.add(guard("b", readPolicy));
      assert.strictEqual(feed.getSnapshot(), again);
      assert.strictEqual(seen.calls, 2);

      double.mendReads();
      assert.deepStrictEqual(idsOf(feed), ["a", "b"]);
      assert.strictEqual(seen.calls, 3);
    }));

  it.effect("G39 (twin of M39): a registry that throws on a tick leaves the cadence running, and a changed answer still arrives", () =>
    Effect.gen(function* () {
      let asked: ReadonlyArray<AskedQuestionLike> = [{ policy: readPolicy }];
      const double = makeGateRegistryDouble([guard("a", readPolicy)], { swallowListenerErrors: true });
      const feed = yield* gatesFeedOf({ gates: double.registry, questions: () => asked });
      yield* settleTurns;
      double.failReads(boom);
      const seen = listen(feed);

      asked = [{ policy: readPolicy }, { policy: writePolicy }];
      yield* tick;

      assert.strictEqual(seen.calls, 1);
      assert.strictEqual(questionsOf(feed)?.length, 2);
      assert.include(registryFailure(feed) ?? "", "registry exploded");

      // The cadence goes on: the next change in what is asked still arrives.
      asked = [{ policy: writePolicy }];
      yield* tick;
      assert.strictEqual(questionsOf(feed)?.length, 1);
      assert.strictEqual(seen.calls, 2);
      assert.include(registryFailure(feed) ?? "", "registry exploded");
    }));

  it.effect("G40 (twin of M40): a registry whose subscribe throws is stated, and a registry that works replaces it", () =>
    Effect.gen(function* () {
      const bad = makeGateRegistryDouble([guard("a", readPolicy)]);
      bad.failSubscribe(boom);
      const good = makeGateRegistryDouble([guard("b", readPolicy)]);

      const feed = yield* gatesFeedOf({ gates: bad.registry });
      assert.include(registryFailure(feed) ?? "", "registry exploded");

      feed.configure({ gates: good.registry });
      assert.deepStrictEqual(idsOf(feed), ["b"]);
      assert.strictEqual(good.listeners(), 1);
      assert.strictEqual(bad.listeners(), 0);
    }));

  it.effect("G41 (twin of M41): configure with a throwing registry applies in full and never throws; the old subscription is released once", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const reads = makeGateRegistryDouble([guard("b", readPolicy)]);
      reads.failReads(boom);
      const subscribes = makeGateRegistryDouble([guard("c", readPolicy)]);
      subscribes.failSubscribe(boom);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(gatesFeedOf({ gates: a.registry }), scope);
      assert.deepStrictEqual(idsOf(feed), ["a"]);

      feed.configure({ gates: reads.registry });
      assert.include(registryFailure(feed) ?? "", "registry exploded");
      assert.strictEqual(a.listeners(), 0);
      assert.strictEqual(a.releases(), 1);
      assert.strictEqual(reads.listeners(), 1);

      feed.configure({ gates: a.registry });
      assert.deepStrictEqual(idsOf(feed), ["a"]);

      feed.configure({ gates: subscribes.registry });
      assert.include(registryFailure(feed) ?? "", "registry exploded");
      assert.strictEqual(a.releases(), 2);

      yield* Scope.close(scope, Exit.void);
      assert.strictEqual(a.releases(), 2);
      assert.strictEqual(subscribes.releases(), 0);
    }));

  it.effect("G42 (twin of M42): a release that throws is not stated, applies the new registry in full and is not called again", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const b = makeGateRegistryDouble([guard("b", readPolicy)]);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(gatesFeedOf({ gates: a.registry }), scope);
      const seen = listen(feed);
      a.failRelease(boom);

      // The release belongs to a registry the feed has left: the read is the new registry's listing.
      feed.configure({ gates: b.registry });
      assert.deepStrictEqual(idsOf(feed), ["b"]);
      assert.strictEqual(a.releases(), 1);
      assert.strictEqual(b.listeners(), 1);
      assert.strictEqual(seen.calls, 1);
      b.add(guard("c", readPolicy));
      assert.deepStrictEqual(idsOf(feed), ["b", "c"]);
      assert.strictEqual(seen.calls, 2);

      // The handle left the feed's state before it was called: neither a swap nor `configure({})` calls it again.
      feed.configure({ gates: b.registry });
      feed.configure({});
      assert.strictEqual(a.releases(), 1);
      assert.strictEqual(b.listeners(), 0);
      assert.strictEqual(feed.getSnapshot().registry._tag, "Unwatched");

      feed.configure({ gates: a.registry });
      assert.strictEqual(a.releases(), 1);
      yield* Scope.close(scope, Exit.void);
      assert.strictEqual(a.releases(), 2);
    }));

  it.effect("G42 b (twin of M42 b): a scope that closes over a release that throws still closes, and calls it once", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(gatesFeedOf({ gates: a.registry }), scope);
      a.failRelease(boom);

      const closed = yield* Effect.exit(Scope.close(scope, Exit.void));
      assert.isTrue(Exit.isSuccess(closed));
      assert.strictEqual(a.releases(), 1);
      feed.configure({ gates: a.registry });
      assert.strictEqual(a.releases(), 1);
    }));

  it.effect("G42 c: a notification that still reaches a closed feed reads no registry and publishes nothing", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(gatesFeedOf({ gates: a.registry }), scope);
      // The release throws, so the closed feed's listener stays live on the registry.
      a.failRelease(boom);
      yield* Scope.close(scope, Exit.void);
      assert.strictEqual(a.listeners(), 1);
      const read = a.reads();
      const last = feed.getSnapshot();
      const seen = listen(feed);

      a.add(guard("b", readPolicy));

      assert.strictEqual(a.reads(), read);
      assert.strictEqual(feed.getSnapshot(), last);
      assert.strictEqual(seen.calls, 0);
    }));

  it.effect("G43 (twin of M43): a registry whose subscribe threw is subscribed again by a configure with the same registry", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      double.failSubscribe(boom);
      const feed = yield* gatesFeedOf({ gates: double.registry });
      assert.include(registryFailure(feed) ?? "", "registry exploded");

      // Still failing: tried again and stated again, with nothing held. The same failure thrown afresh,
      // with another stack, is the same statement and publishes nothing.
      const failed = feed.getSnapshot();
      const seen = listen(feed);
      double.failSubscribe(new Error("registry exploded"));
      feed.configure({ gates: double.registry });
      assert.include(registryFailure(feed) ?? "", "registry exploded");
      assert.strictEqual(feed.getSnapshot(), failed);
      assert.strictEqual(seen.calls, 0);
      assert.strictEqual(double.subscriptions(), 2);

      double.mendSubscribe();
      feed.configure({ gates: double.registry });
      assert.deepStrictEqual(idsOf(feed), ["a"]);
      assert.strictEqual(double.listeners(), 1);

      // Recovered: the same registry is not subscribed again, and its changes arrive.
      feed.configure({ gates: double.registry });
      assert.strictEqual(double.subscriptions(), 3);
      double.add(guard("b", readPolicy));
      assert.deepStrictEqual(idsOf(feed), ["a", "b"]);
    }));

  it.effect("G44 (twin of M44): a registry that mends without announcing stays Failed until something reads it again", () =>
    Effect.gen(function* () {
      let asked: ReadonlyArray<AskedQuestionLike> = [{ policy: readPolicy }];
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      const answer = () => asked;
      const feed = yield* gatesFeedOf({ gates: double.registry, questions: answer });
      yield* settleTurns;
      double.failReads(boom);
      assert.include(registryFailure(feed) ?? "", "registry exploded");

      double.mendReadsQuietly();
      yield* tick;
      assert.include(registryFailure(feed) ?? "", "registry exploded");

      // A tick whose answer changed reads the registry again.
      asked = [{ policy: readPolicy }, { policy: writePolicy }];
      yield* tick;
      assert.deepStrictEqual(idsOf(feed), ["a"]);

      // So does a notification, and so does a `configure`, even with the same registry.
      double.failReads(boom);
      double.mendReadsQuietly();
      double.add(guard("b", readPolicy));
      assert.deepStrictEqual(idsOf(feed), ["a", "b"]);

      double.failReads(boom);
      double.mendReadsQuietly();
      feed.configure({ gates: double.registry, questions: answer });
      assert.deepStrictEqual(idsOf(feed), ["a", "b"]);
    }));

  it.effect("G45 (twin of M45): a thrown value that is not an error is compared by what it renders as", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble([guard("a", readPolicy)], { swallowListenerErrors: true });
      const feed = yield* gatesFeedOf({ gates: double.registry, questions: () => [{ policy: readPolicy }] });
      yield* settleTurns;
      const seen = listen(feed);

      double.failReads("registry down");
      const down = feed.getSnapshot();
      assert.include(registryFailure(feed) ?? "", "registry down");
      assert.strictEqual(seen.calls, 1);

      // The same string from another path says the same thing; a different one is a different statement.
      double.failReads("registry down");
      assert.strictEqual(feed.getSnapshot(), down);
      assert.strictEqual(seen.calls, 1);
      double.failReads({ code: 503 });
      assert.include(registryFailure(feed) ?? "", "503");
      assert.strictEqual(seen.calls, 2);
      double.add(guard("b", readPolicy));
      assert.strictEqual(seen.calls, 2);
    }));

  it.effect("G46 (twin of M46): a thrown value that cannot be rendered is stated all the same, and reaches no host", () =>
    Effect.gen(function* () {
      const unrenderable = new Proxy(
        {},
        {
          get: () => {
            throw new Error("a getter that throws");
          },
          getPrototypeOf: () => {
            throw new Error("a trap that throws");
          },
          ownKeys: () => {
            throw new Error("a trap that throws");
          },
        },
      );
      const sentence = "a value that could not be described";
      const double = makeGateRegistryDouble([guard("a", readPolicy)], { swallowListenerErrors: true });
      double.failReads(unrenderable);
      const feed = yield* makeGatesFeed();
      assert.strictEqual(feed.getSnapshot().registry._tag, "Unwatched");

      // From no registry to one that throws a value nothing can render: the read moves, though no list did.
      feed.configure({ gates: double.registry });
      assert.strictEqual(registryFailure(feed), sentence);

      double.mendReads();
      double.failReads(unrenderable);
      feed.configure({ gates: double.registry });
      assert.strictEqual(registryFailure(feed), sentence);

      const bad = makeGateRegistryDouble();
      bad.failSubscribe(unrenderable);
      feed.configure({ gates: bad.registry });
      assert.strictEqual(registryFailure(feed), sentence);
    }));

  it.effect("G47 (twin of M47): one configure publishes one snapshot and reads no registry the host has handed away", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const b = makeGateRegistryDouble([guard("b", readPolicy)]);
      const feed = yield* gatesFeedOf({ gates: a.registry, questions: () => [{ policy: readPolicy }] });
      const published: Array<GatesSnapshot> = [];
      feed.subscribe(() => {
        published.push(feed.getSnapshot());
      });
      const readByA = a.reads();

      feed.configure({ gates: b.registry });

      assert.strictEqual(published.length, 1);
      assert.strictEqual(instancesOf(feed), b.registry.instances());
      assert.strictEqual(a.reads(), readByA);

      // A new registry and a new thunk together are still one snapshot.
      feed.configure({ gates: a.registry, questions: () => [{ policy: readPolicy }, { policy: writePolicy }] });
      assert.strictEqual(published.length, 2);
      assert.strictEqual(instancesOf(feed), a.registry.instances());
      assert.strictEqual(questionsOf(feed)?.length, 2);
    }));

  type Command =
    | { readonly kind: "add"; readonly id: number; readonly policy: number; readonly resource: number; readonly state: number }
    | { readonly kind: "remove"; readonly id: number }
    | { readonly kind: "update"; readonly id: number; readonly state: number }
    | { readonly kind: "ask"; readonly questions: ReadonlyArray<number> }
    | { readonly kind: "tick" };

  const policies: ReadonlyArray<Policy> = [readPolicy, writePolicy, hasRole("admin")];
  // One state outside the vocabulary, so the unknown path runs through the join.
  const states: ReadonlyArray<string> = ["Allowed", "Denied", "Failed", "Pending", "Rechecking", "Suspended"];
  const GUARDS = 4;
  const RESOURCES = 3;

  const nth = <A>(pool: ReadonlyArray<A>, index: number): A => {
    const one = pool[index];
    if (one === undefined) throw new Error(`no pool entry ${index}`);
    return one;
  };
  const resourceOf = (index: number): Resource | undefined => (index === 0 ? undefined : { id: `r${index}` });
  const questionOf = (index: number): AskedQuestionLike => ({
    policy: nth(policies, index % policies.length),
    resource: resourceOf(Math.floor(index / policies.length)),
  });

  const pick = (size: number) => FastCheck.integer({ min: 0, max: size - 1 });
  const commands = FastCheck.oneof(
    FastCheck.record({
      id: pick(GUARDS),
      policy: pick(policies.length),
      resource: pick(RESOURCES),
      state: pick(states.length),
    }).map((fields): Command => ({ kind: "add", ...fields })),
    pick(GUARDS).map((id): Command => ({ kind: "remove", id })),
    FastCheck.record({ id: pick(GUARDS), state: pick(states.length) }).map(
      (fields): Command => ({ kind: "update", ...fields }),
    ),
    FastCheck.array(pick(policies.length * RESOURCES), { maxLength: 3 }).map(
      (questions): Command => ({ kind: "ask", questions }),
    ),
    FastCheck.constant<Command>({ kind: "tick" }),
  );

  it.effect("GP2 (twin of P2): whatever the registry and the thunk do, each snapshot is the registry's own array and the last tick's answer", () =>
    Effect.gen(function* () {
      const sequences = FastCheck.sample(FastCheck.array(commands, { maxLength: 25 }), { numRuns: 60, seed: 56 });

      for (const sequence of sequences) {
        const where = JSON.stringify(sequence);
        let asked: ReadonlyArray<AskedQuestionLike> = [];
        // What the thunk answered at the last tick: the build reads it once, and only a tick reads it again.
        let lastTick: ReadonlyArray<AskedQuestionLike> = [];
        const double = makeGateRegistryDouble();
        const scope = yield* Scope.make();
        const feed = yield* Scope.provide(gatesFeedOf({ gates: double.registry, questions: () => asked }), scope);

        /** What is wrong with the snapshot now, read against both sources at this very moment. */
        const disagreements = (moment: string): ReadonlyArray<string> => {
          const { registry, asked: read } = feed.getSnapshot();
          const problems: Array<string> = [];
          if (!RegistryRead.$is("Read")(registry)) problems.push(`${moment}: registry is ${registry._tag}, wanted Read`);
          else if (registry.instances !== double.registry.instances())
            problems.push(`${moment}: instances is not the registry's own array`);
          if (!AskedRead.$is("Read")(read)) problems.push(`${moment}: asked is ${read._tag}, wanted Read`);
          else if (!Equal.equals(read.questions, lastTick))
            problems.push(`${moment}: asked ${JSON.stringify(read.questions)}, last tick ${JSON.stringify(lastTick)}`);
          return problems;
        };

        const heard: Array<string> = [];
        feed.subscribe(() => {
          heard.push(...disagreements("on notify"));
        });
        const agrees = (moment: string) => {
          assert.deepStrictEqual(disagreements(moment), [], where);
          assert.deepStrictEqual(heard, [], where);
        };

        yield* settleTurns;
        agrees("start");
        for (const command of sequence) {
          const before = feed.getSnapshot();
          if (command.kind === "add") {
            double.add(
              guard(`g${command.id}`, nth(policies, command.policy), {
                state: nth(states, command.state),
                resource: resourceOf(command.resource),
              }),
            );
            yield* settleTurns;
          } else if (command.kind === "remove") {
            double.remove(`g${command.id}`);
            yield* settleTurns;
          } else if (command.kind === "update") {
            double.update(`g${command.id}`, nth(states, command.state));
            yield* settleTurns;
          } else if (command.kind === "ask") {
            // The tick reads the answer and notifies from inside it, so the oracle moves first.
            asked = command.questions.map(questionOf);
            lastTick = asked;
            yield* tick;
          } else {
            yield* tick;
            assert.strictEqual(feed.getSnapshot(), before, `a tick that changed nothing keeps the reference: ${where}`);
          }
          agrees(command.kind);
        }

        yield* Scope.close(scope, Exit.void);
        assert.strictEqual(double.listeners(), 0, `closing the scope released the registry subscription: ${where}`);
      }
    }));

  it.effect("G48 a listener that throws does not silence the next one, and configure rethrows what it threw after taking the registry", () =>
    Effect.gen(function* () {
      const feed = yield* makeGatesFeed();
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      const boom = new Error("boom");
      const seen: Array<string> = [];
      feed.subscribe(() => {
        throw boom;
      });
      feed.subscribe(() => {
        seen.push(feed.getSnapshot().registry._tag);
      });

      const outcome = thrownBy(() => feed.configure({ gates: double.registry }));

      assert.deepStrictEqual(seen, ["Read"]);
      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.strictEqual(double.listeners(), 1);
    }));
});
