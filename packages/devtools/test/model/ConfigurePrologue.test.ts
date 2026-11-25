/**
 * The configure prologue's contract, through its own interface.
 *
 * The three feeds restated one order before they did anything of their own, so the order is
 * pinned here once, against a recording rule: each call the prologue makes is logged with the
 * arguments it passed, so a row can say what was read, compared, held and stepped, and in which
 * order. The feeds' own files pin what each feed does in its steps.
 */
import { assert, describe, it } from "@effect/vitest";
import { thrownBy } from "../helpers.ts";
import { makeConfigure } from "../../src/model/ConfigurePrologue.ts";
import type { ConfigureRule } from "../../src/model/ConfigurePrologue.ts";

interface Options {
  readonly closed?: boolean;
  readonly held?: number;
  /** The raw input the normaliser refuses by throwing `refusal`. */
  readonly refuse?: number;
  readonly refusal?: Error;
  readonly same?: (held: number, wanted: number) => boolean;
  readonly steps?: (wanted: number, before: number, configure: (raw: number) => void) => void;
}

/**
 * A rule over numbers that logs each of its calls, and the configure built from it.
 * The normaliser returns its input, and two numbers are the same when equal unless `same` says otherwise.
 */
const recording = (options: Options = {}) => {
  const log: Array<string> = [];
  const gateCalls: Array<readonly [number, number]> = [];
  let held = options.held ?? 0;
  const rule: ConfigureRule<number, number> = {
    closed: () => {
      log.push("closed");
      return options.closed === true;
    },
    complete: (raw) => {
      log.push(`complete(${raw})`);
      if (raw === options.refuse) throw options.refusal ?? new Error("refused");
      return raw;
    },
    held: () => {
      log.push("held");
      return held;
    },
    same: (before, wanted) => {
      log.push(`same(${before},${wanted})`);
      gateCalls.push([before, wanted]);
      return (options.same ?? ((a, b) => a === b))(before, wanted);
    },
    hold: (wanted) => {
      log.push(`hold(${wanted})`);
      held = wanted;
    },
  };
  const configure: (raw: number) => void = makeConfigure(rule, (wanted, before) => {
    log.push(`steps(${wanted},${before}) held=${held}`);
    options.steps?.(wanted, before, configure);
  });
  return { log, gateCalls, configure, heldNow: () => held };
};

describe("the configure prologue", () => {
  it("CP1 a configure after close calls nothing past the closed guard, even for input the normaliser would refuse", () => {
    const { log, configure, heldNow } = recording({ closed: true, held: 4, refuse: 9 });

    assert.doesNotThrow(() => configure(9));
    assert.doesNotThrow(() => configure(5));

    assert.deepStrictEqual(log, ["closed", "closed"]);
    assert.strictEqual(heldNow(), 4);
  });

  it("CP2 a refused input throws from the normaliser before the held value is read, compared, held or stepped", () => {
    const refusal = new Error("capacity refused");
    const { log, configure, heldNow } = recording({ held: 4, refuse: 9, refusal });

    const { threw, thrown } = thrownBy(() => configure(9));

    assert.isTrue(threw);
    assert.strictEqual(thrown, refusal);
    assert.deepStrictEqual(log, ["closed", "complete(9)"]);
    assert.strictEqual(heldNow(), 4);
  });

  it("CP3 an input the gate calls the same returns before hold and the steps", () => {
    const { log, configure, heldNow } = recording({ held: 4 });

    configure(4);

    assert.deepStrictEqual(log, ["closed", "complete(4)", "held", "same(4,4)"]);
    assert.strictEqual(heldNow(), 4);

    // Positive control: the same rule holds and steps an input the gate calls different.
    configure(5);
    assert.include(log, "hold(5)");
    assert.include(log, "steps(5,4) held=5");
  });

  it("CP4 a changed input is held before the steps run, and the steps receive the wanted and the previous value", () => {
    const { log, configure, heldNow } = recording({ held: 4 });

    configure(5);

    // The steps ran with the wanted value already held, and were handed the wanted value and the one before.
    assert.include(log, "steps(5,4) held=5");
    assert.isBelow(log.indexOf("hold(5)"), log.indexOf("steps(5,4) held=5"));
    assert.strictEqual(heldNow(), 5);
  });

  it("CP5 a configure nested in a step decides, because the steps read the held value when they run", () => {
    const { log, configure, heldNow } = recording({
      held: 1,
      steps: (wanted, _before, again) => {
        if (wanted === 2) again(3);
      },
    });

    configure(2);

    // The nested configure compared against the value the outer one had already held, and it was the last to hold.
    assert.include(log, "same(2,3)");
    assert.include(log, "steps(3,2) held=3");
    assert.strictEqual(heldNow(), 3);
  });

  it("CP6 the gate receives the held value first and the wanted value second", () => {
    const { gateCalls, configure } = recording({ held: 5 });

    configure(6);

    assert.deepStrictEqual(gateCalls, [[5, 6]]);
  });

  it("CP7 a step that throws reaches the caller after the input was held", () => {
    const failure = new Error("a step threw");
    const { configure, heldNow } = recording({
      held: 1,
      steps: () => {
        throw failure;
      },
    });

    const { threw, thrown } = thrownBy(() => configure(2));

    assert.isTrue(threw);
    assert.strictEqual(thrown, failure);
    assert.strictEqual(heldNow(), 2);
  });

  it("CP8 the calls run in the order closed, complete, held, same, hold, steps", () => {
    const { log, configure } = recording({ held: 1 });

    configure(2);

    assert.deepStrictEqual(
      log.map((entry) => entry.split("(")[0]),
      ["closed", "complete", "held", "same", "hold", "steps"],
    );
  });
});
