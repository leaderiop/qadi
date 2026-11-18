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
});
