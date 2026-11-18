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
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import * as TestClock from "effect/testing/TestClock";
import { hasPermission, hasRole, permission } from "@qadi/core";
import type { Policy } from "@qadi/core";
import type { AskedQuestionLike, GateInstanceLike } from "../../src/model/Gates.ts";
import { AskedRead, RegistryRead, makeGatesFeed } from "../../src/model/GatesFeed.ts";
import type { GatesFeed } from "../../src/model/GatesFeed.ts";
import { makeGateRegistryDouble } from "../gateRegistryDouble.ts";
import { readPolicy, settleTurns } from "../helpers.ts";

const writePolicy: Policy = hasPermission(permission("doc", "write"));

const guard = (id: string, policy: Policy): GateInstanceLike => ({ id, kind: "Can", policy, state: "Allowed" });

/** Settles every fiber, steps the clock one default interval, settles again. */
const tick = Effect.gen(function* () {
  yield* settleTurns;
  yield* TestClock.adjust("2 seconds");
  yield* settleTurns;
});

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
      const feed = yield* makeGatesFeed({ gates: double.registry, questions: () => asked });
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

      const feed = yield* makeGatesFeed({ gates: double.registry });
      yield* settleTurns;

      assert.include(registryFailure(feed) ?? "", "registry exploded");
      assert.strictEqual(double.listeners(), 1);
    }));

  it.effect("T1 a thunk that throws is stated as Failed, the build does not throw, and the cadence keeps reading it", () =>
    Effect.gen(function* () {
      const calls = { n: 0 };
      const feed = yield* makeGatesFeed({
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
      const feed = yield* makeGatesFeed({
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
      const feed = yield* makeGatesFeed({
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
      const other = yield* makeGatesFeed({
        questions: () => {
          throw unrenderable;
        },
      });
      assert.strictEqual(askedFailure(other), "The questions threw a value that could not be described.");
    }));

  it.effect("T4 a new thunk is read by configure at once and restarts the cadence; no thunk stops it", () =>
    Effect.gen(function* () {
      const first = counting(() => []);
      const second = counting(() => [{ policy: readPolicy }]);
      const feed = yield* makeGatesFeed({ questions: first.thunk });
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
      yield* makeGatesFeed({ questions: quick.thunk, intervalMillis: 500 });
      yield* settleTurns;
      assert.strictEqual(quick.seen.calls, 1);
      yield* TestClock.adjust("499 millis");
      yield* settleTurns;
      assert.strictEqual(quick.seen.calls, 1);
      yield* TestClock.adjust("1 millis");
      yield* settleTurns;
      assert.strictEqual(quick.seen.calls, 2);

      const slow = counting(() => []);
      yield* makeGatesFeed({ questions: slow.thunk });
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
      const feed = yield* makeGatesFeed({ questions: () => list.map((question) => ({ policy: question.policy })) });
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
      const feed = yield* makeGatesFeed({ gates: double.registry, questions: asked.thunk });
      yield* settleTurns;
      const seen = listen(feed);

      double.add(guard("b", readPolicy));

      assert.strictEqual(seen.calls, 1);
      assert.strictEqual(instancesOf(feed)?.length, 2);
      assert.strictEqual(asked.seen.calls, 1);
    }));

  it.effect("G32 (twin of M32): no registry reads Unwatched, an empty one Read of no guard, a listed one Read of its array; no thunk reads Unhanded", () =>
    Effect.gen(function* () {
      const none = yield* makeGatesFeed();
      assert.strictEqual(none.getSnapshot().registry._tag, "Unwatched");
      assert.strictEqual(none.getSnapshot().asked._tag, "Unhanded");

      const empty = yield* makeGatesFeed({ gates: makeGateRegistryDouble().registry });
      assert.deepStrictEqual(instancesOf(empty), []);

      const one = makeGateRegistryDouble([guard("a", readPolicy)]);
      const listed = yield* makeGatesFeed({ gates: one.registry });
      assert.strictEqual(instancesOf(listed), one.registry.instances());
      assert.strictEqual(listed.getSnapshot().asked._tag, "Unhanded");

      const asked = yield* makeGatesFeed({ questions: () => [{ policy: readPolicy }] });
      assert.strictEqual(asked.getSnapshot().registry._tag, "Unwatched");
      assert.deepStrictEqual(questionsOf(asked), [{ policy: readPolicy }]);
    }));

  it.effect("G32 b (twin of M32 b): the feed reads a handed thunk at build, whatever the poll; withholding an unsampled answer is the model's", () =>
    Effect.gen(function* () {
      const feed = yield* makeGatesFeed({ questions: () => [] });

      assert.deepStrictEqual(questionsOf(feed), []);
    }));

  it.effect("G33 (twin of M33): the subscription lives as long as the scope, follows a new registry, and never outlives close", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const b = makeGateRegistryDouble([guard("b1", writePolicy), guard("b2", readPolicy)]);
      const scope = yield* Scope.make();
      const feed = yield* Scope.provide(makeGatesFeed({ gates: a.registry }), scope);

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
      const feed = yield* makeGatesFeed({ gates: double.registry });
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
      const feed = yield* Scope.provide(makeGatesFeed({ gates: a.registry }), scope);
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
      const feed = yield* Scope.provide(makeGatesFeed({ gates: a.registry, questions: held.thunk }), scope);
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
      const feed = yield* makeGatesFeed({ gates: double.registry, questions: () => [{ policy: readPolicy }] });
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
      const feed = yield* makeGatesFeed({ gates: double.registry, questions: () => asked });
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

      const feed = yield* makeGatesFeed({ gates: bad.registry });
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
      const feed = yield* Scope.provide(makeGatesFeed({ gates: a.registry }), scope);
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
});
