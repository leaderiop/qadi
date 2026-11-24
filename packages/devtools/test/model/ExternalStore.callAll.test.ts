/**
 * Pins `callAll`, the one rule every multi-call command in the model follows: every
 * call runs, then what they threw is rethrown, one value as itself and several as
 * one `AggregateError` in call order (ADR-QD-177).
 *
 * The rule is decided by how many calls threw, never by what they threw, so
 * `undefined`, `null` and an `AggregateError` are each one value like any other.
 */
import { assert, describe, it } from "@effect/vitest";
import { callAll } from "../../src/model/ExternalStore.ts";
import { thrownBy } from "../helpers.ts";

const message = "More than one call threw.";

describe("callAll", () => {
  it("callAll with no call returns and throws nothing", () => {
    const outcome = thrownBy(() => callAll([], message));
    assert.isFalse(outcome.threw);
  });

  it("callAll runs every call in order and returns when none throws", () => {
    const heard: Array<string> = [];
    const outcome = thrownBy(() =>
      callAll([() => heard.push("a"), () => heard.push("b"), () => heard.push("c")], message),
    );
    assert.isFalse(outcome.threw);
    assert.deepStrictEqual(heard, ["a", "b", "c"]);
  });

  it("callAll runs every call after one throws, then rethrows that value as itself", () => {
    const heard: Array<string> = [];
    const only = new Error("b failed");
    const outcome = thrownBy(() =>
      callAll(
        [
          () => heard.push("a"),
          () => {
            heard.push("b");
            throw only;
          },
          () => heard.push("c"),
        ],
        message,
      ),
    );
    assert.isTrue(outcome.threw);
    assert.strictEqual(outcome.thrown, only);
    assert.deepStrictEqual(heard, ["a", "b", "c"]);
  });

  it("callAll rethrows a thrown undefined as undefined and a thrown null as null", () => {
    for (const value of [undefined, null]) {
      const heard: Array<string> = [];
      const outcome = thrownBy(() =>
        callAll(
          [
            () => {
              throw value;
            },
            () => heard.push("second"),
          ],
          message,
        ),
      );
      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, value);
      assert.deepStrictEqual(heard, ["second"]);
    }
  });

  it("callAll collects two or more throws into one AggregateError in call order, with the message it was given", () => {
    const first = new Error("first");
    const second = new Error("second");
    const third = new Error("third");
    const outcome = thrownBy(() =>
      callAll(
        [
          () => {
            throw first;
          },
          () => {
            throw second;
          },
          () => {
            throw third;
          },
        ],
        message,
      ),
    );
    assert.isTrue(outcome.threw);
    assert.instanceOf(outcome.thrown, AggregateError);
    assert.strictEqual(outcome.thrown.message, message);
    assert.strictEqual(outcome.thrown.errors.length, 3);
    assert.strictEqual(outcome.thrown.errors[0], first);
    assert.strictEqual(outcome.thrown.errors[1], second);
    assert.strictEqual(outcome.thrown.errors[2], third);
  });

  it("callAll keeps one value thrown by two calls as two errors", () => {
    const same = new Error("the same value");
    const throwsSame = () => {
      throw same;
    };
    const outcome = thrownBy(() => callAll([throwsSame, throwsSame], message));
    assert.isTrue(outcome.threw);
    assert.instanceOf(outcome.thrown, AggregateError);
    assert.strictEqual(outcome.thrown.errors.length, 2);
    assert.strictEqual(outcome.thrown.errors[0], same);
    assert.strictEqual(outcome.thrown.errors[1], same);
  });

  it("callAll keeps an AggregateError a call threw as one error, never flattened", () => {
    const inner = new AggregateError([new Error("x"), new Error("y")], "inner");
    const other = new Error("other");
    const alone = thrownBy(() =>
      callAll(
        [
          () => {
            throw inner;
          },
        ],
        message,
      ),
    );
    assert.strictEqual(alone.thrown, inner);
    const beside = thrownBy(() =>
      callAll(
        [
          () => {
            throw inner;
          },
          () => {
            throw other;
          },
        ],
        message,
      ),
    );
    assert.instanceOf(beside.thrown, AggregateError);
    assert.strictEqual(beside.thrown.errors.length, 2);
    assert.strictEqual(beside.thrown.errors[0], inner);
    assert.strictEqual(beside.thrown.errors[1], other);
  });

  it("callAll over a live set calls a member added during the pass and skips one removed before its turn", () => {
    const heard: Array<string> = [];
    const calls = new Set<() => void>();
    const fourth = () => {
      heard.push("fourth");
    };
    const third = () => {
      heard.push("third");
    };
    calls.add(() => {
      heard.push("first");
      calls.add(fourth);
      calls.delete(third);
    });
    calls.add(() => {
      heard.push("second");
    });
    calls.add(third);
    callAll(calls, message);
    assert.deepStrictEqual(heard, ["first", "second", "fourth"]);
    callAll(calls, message);
    assert.deepStrictEqual(heard, ["first", "second", "fourth", "first", "second", "fourth"]);
  });
});
