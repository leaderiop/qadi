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
import * as FastCheck from "fast-check";
import {
  Claim,
  Failure,
  Observe,
  Release,
  StateClosed,
  StateHalfOpen,
  StateOpen,
  Success,
  step,
} from "../src/CircuitBreaker.ts";
import type { Event, State, Transition } from "../src/CircuitBreaker.ts";

const RULES = { failureThreshold: 3, resetTimeoutMillis: 100 };
const at = step(RULES);

const closed = (generation: number, consecutiveFailures = 0): StateClosed =>
  new StateClosed({ generation, consecutiveFailures });
const open = (generation: number, openedAt: number): StateOpen =>
  new StateOpen({ generation, openedAt });
const halfOpen = (generation: number, halfOpenAt: number, probeClaimed: boolean): StateHalfOpen =>
  new StateHalfOpen({ generation, halfOpenAt, probeClaimed });

/** The answer is the state it was given, reference-equal, and announces nothing. */
const assertSame = (t: Transition, before: State): void => {
  assert.strictEqual(t.next, before);
  assert.isUndefined(t.announced);
};

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

  it("S1: a Success from an older window does not touch a newer one", () => {
    const before = halfOpen(5, 1100, true);
    assertSame(at(before, new Success({ generation: 4 }), 1150), before);
  });

  it("S2: a Success on Closed under its own generation clears the failure count, silently", () => {
    const t = at(closed(4, 2), new Success({ generation: 4 }), 1000);
    assert.deepStrictEqual(t.next, closed(4, 0));
    assert.isUndefined(t.announced);
  });

  it("S3: a Success on the probe's HalfOpen window closes it, one generation on", () => {
    const t = at(halfOpen(4, 1000, true), new Success({ generation: 4 }), 1050);
    assert.deepStrictEqual(t.next, closed(5, 0));
    assert.strictEqual(t.announced, "Closed");
  });

  it("S4: a Success on Open under its own generation changes nothing", () => {
    const before = open(4, 1000);
    assertSame(at(before, new Success({ generation: 4 }), 1050), before);
  });

  it("F1: a stale Failure does not reopen a newer window", () => {
    const before = halfOpen(5, 1100, true);
    assertSame(at(before, new Failure({ generation: 4 }), 1150), before);
  });

  it("F2: a Failure below the threshold counts on Closed, silently", () => {
    const t = at(closed(4, 1), new Failure({ generation: 4 }), 1000);
    assert.deepStrictEqual(t.next, closed(4, 2));
    assert.isUndefined(t.announced);
  });

  it("F3: the Failure that reaches the threshold opens Closed, one generation on", () => {
    const t = at(closed(4, 2), new Failure({ generation: 4 }), 1000);
    assert.deepStrictEqual(t.next, open(5, 1000));
    assert.strictEqual(t.announced, "Open");
  });

  it("F4: a Failure on HalfOpen reopens it from the failure's own instant", () => {
    const t = at(halfOpen(4, 1000, true), new Failure({ generation: 4 }), 1050);
    assert.deepStrictEqual(t.next, open(5, 1050));
    assert.strictEqual(t.announced, "Open");
  });

  it("F5: a Failure on Open does not restart the window", () => {
    const before = open(4, 1000);
    assertSame(at(before, new Failure({ generation: 4 }), 1050), before);
  });

  it("C1: a Claim on an unclaimed HalfOpen claims it in place, silently", () => {
    const t = at(halfOpen(4, 1000, false), new Claim(), 1050);
    assert.deepStrictEqual(t.next, halfOpen(4, 1000, true));
    assert.isUndefined(t.announced);
  });

  it("C2: a Claim on a claimed HalfOpen changes nothing, so the probe has one holder", () => {
    const before = halfOpen(4, 1000, true);
    assertSame(at(before, new Claim(), 1050), before);
  });

  it("C3: a Claim on Closed or Open changes nothing", () => {
    for (const before of [closed(4), open(4, 1000)]) assertSame(at(before, new Claim(), 1050), before);
  });

  it("R1: a Release of the claimed window reopens it from the release's instant", () => {
    const t = at(halfOpen(4, 1000, true), new Release({ generation: 4 }), 1050);
    assert.deepStrictEqual(t.next, open(5, 1050));
    assert.strictEqual(t.announced, "Open");
  });

  it("R2: a Release from an older window does not steal a newer claim", () => {
    const before = halfOpen(5, 1100, true);
    assertSame(at(before, new Release({ generation: 4 }), 1150), before);
  });

  it("R3: a Release of an unclaimed HalfOpen changes nothing", () => {
    const before = halfOpen(4, 1000, false);
    assertSame(at(before, new Release({ generation: 4 }), 1050), before);
  });

  it("R4: a Release on Closed or Open changes nothing", () => {
    for (const before of [closed(4), open(4, 1000)]) {
      assertSame(at(before, new Release({ generation: 4 }), 1050), before);
    }
  });

  it("PROPERTY: the breaker's rules hold together over any event sequence", () => {
    const events: Record<"O" | "S" | "F" | "C" | "R", (generation: number) => Event> = {
      O: () => new Observe(),
      S: (generation) => new Success({ generation }),
      F: (generation) => new Failure({ generation }),
      C: () => new Claim(),
      R: (generation) => new Release({ generation }),
    };
    const command = FastCheck.record({
      e: FastCheck.constantFrom("O", "S", "F", "C", "R"),
      back: FastCheck.integer({ min: -1, max: 3 }),
      dt: FastCheck.integer({ min: 0, max: 150 }),
    });
    FastCheck.assert(
      FastCheck.property(
        FastCheck.integer({ min: 1, max: 4 }),
        FastCheck.integer({ min: 1, max: 200 }),
        FastCheck.array(command, { maxLength: 60 }),
        (failureThreshold, resetTimeoutMillis, commands) => {
          const run = step({ failureThreshold, resetTimeoutMillis });
          let state: State = closed(0);
          let now = 0;
          const claimsWon = new Map<number, number>();
          for (const { e, back, dt } of commands) {
            now += dt;
            const event = events[e](state.generation - back);
            const t = run(state, event, now);
            const changed = t.next._tag !== state._tag;
            assert.isAtLeast(t.next.generation, state.generation);
            assert.strictEqual(t.next.generation - state.generation, changed ? 1 : 0);
            assert.strictEqual(t.announced, changed ? t.next._tag : undefined);
            if ((e === "S" || e === "F" || e === "R") && back !== 0) assert.strictEqual(t.next, state);
            if (e === "C") {
              const unclaimed = state._tag === "HalfOpen" && !state.probeClaimed;
              assert.strictEqual(t.next !== state, unclaimed);
              if (unclaimed) {
                const won = (claimsWon.get(t.next.generation) ?? 0) + 1;
                claimsWon.set(t.next.generation, won);
                assert.isAtMost(won, 1);
              }
            }
            state = t.next;
          }
        },
      ),
      { numRuns: 1000, seed: 45 },
    );
  });
});
