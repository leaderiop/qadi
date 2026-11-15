/**
 * Pins every rule of the breaker's transition function, with no fiber or clock.
 *
 * `step` is pure: a state, an event and a `now` go in, the next state and the
 * status it announces come out. So each rule is one literal row, and the
 * property further down checks that the rules hold together over any event
 * sequence (BRKR-01, BRKR-04). The adapter's own behaviour, its announcements
 * and its one `Ref.modify` per event, is `CircuitBreakerTable.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  Observe,
  StateClosed,
  StateHalfOpen,
  StateOpen,
  step,
} from "../src/CircuitBreaker.ts";

const RULES = { failureThreshold: 3, resetTimeoutMillis: 100 };
const at = step(RULES);

describe("the breaker's transition function (BRKR-01, BRKR-04)", () => {
  it("O1: Observe on Closed changes nothing, however late", () => {
    const before = new StateClosed({ generation: 4, consecutiveFailures: 1 });
    const t = at(before, new Observe(), 5000);
    assert.strictEqual(t.next, before);
    assert.isUndefined(t.announced);
  });

  it("O2: Observe on Open one millisecond before the reset changes nothing", () => {
    const before = new StateOpen({ generation: 4, openedAt: 1000 });
    const t = at(before, new Observe(), 1099);
    assert.strictEqual(t.next, before);
    assert.isUndefined(t.announced);
  });

  it("O3: Observe on Open exactly at the reset enters HalfOpen, unclaimed, one generation on", () => {
    const t = at(new StateOpen({ generation: 4, openedAt: 1000 }), new Observe(), 1100);
    assert.deepStrictEqual(
      t.next,
      new StateHalfOpen({ generation: 5, halfOpenAt: 1100, probeClaimed: false }),
    );
    assert.strictEqual(t.announced, "HalfOpen");
  });

  it("O4: Observe on a claimed HalfOpen one millisecond before the age-out changes nothing", () => {
    const before = new StateHalfOpen({ generation: 4, halfOpenAt: 1000, probeClaimed: true });
    const t = at(before, new Observe(), 1099);
    assert.strictEqual(t.next, before);
    assert.isUndefined(t.announced);
  });

  it("O5: Observe on a claimed HalfOpen exactly at the age-out reopens, one generation on", () => {
    const t = at(
      new StateHalfOpen({ generation: 4, halfOpenAt: 1000, probeClaimed: true }),
      new Observe(),
      1100,
    );
    assert.deepStrictEqual(t.next, new StateOpen({ generation: 5, openedAt: 1100 }));
    assert.strictEqual(t.announced, "Open");
  });
});
