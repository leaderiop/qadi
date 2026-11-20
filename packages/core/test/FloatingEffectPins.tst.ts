/**
 * Pins how tstyche reads a call to a function that returns an `Effect`, under each
 * setting of the Effect language service's `floatingEffect` rule.
 *
 * tstyche checks `expect(f).type.not.toBeCallableWith(a)` by compiling the call `f(a)`
 * and reading any diagnostic on it as "not callable". With `floatingEffect` on, a bare
 * call that returns an `Effect` or a `Stream` always draws one, so that negative pin
 * passes for valid arguments and can never fail. tstyche therefore compiles under
 * `tsconfig.tstyche.json`, which is `tsconfig.test.json` with only that rule off.
 *
 * Measured on tstyche 7.2.5 (TypeScript 6.0.3) and `@effect/language-service` 0.87.5.
 * The first block below runs under that config: its negative pins on valid arguments
 * carry tstyche's `fixme` directive, so tstyche fails the run if one of them ever
 * passes. The position-based language-service directive further down turns the rule
 * back on for the rest of the file (the next-line form has no effect on it), and the
 * block after it is the repro of the old reading: the same negative pins pass. If an
 * upgrade turns either block red, the tool's reading changed: revisit
 * `tsconfig.tstyche.json` and the checks AGENTS.md section 6 builds on it.
 *
 * The bare negative pins on an Effect, a Stream and a constructor here are the one
 * deliberate exception to the rule that such a pin states its reason through the
 * parameter type: they pin the tool, not an API.
 */
import type * as Effect from "effect/Effect";
import type * as Stream from "effect/Stream";
import { describe, expect, test } from "tstyche";

declare const f: (n: number) => Effect.Effect<number>;
declare const s: (n: number) => Stream.Stream<number>;
declare const C: new (n: number) => Effect.Effect<number>;
declare const p: (n: number) => number;

describe("a plain-return subject", () => {
  test("is callable with valid arguments and refuses invalid ones", () => {
    expect(p).type.toBeCallableWith(1);
    expect(p).type.not.toBeCallableWith("x");
  });
});

describe("under the tstyche tsconfig, floatingEffect is off", () => {
  test("an Effect, a Stream or a constructed Effect is callable with valid arguments", () => {
    expect(f).type.toBeCallableWith(1);
    expect(s).type.toBeCallableWith(1);
    expect(C).type.toBeConstructableWith(1);
  });

  test("a negative pin on valid arguments fails", () => {
    // @tstyche fixme
    expect(f).type.not.toBeCallableWith(1);
    // @tstyche fixme
    expect(s).type.not.toBeCallableWith(1);
    // @tstyche fixme
    expect(C).type.not.toBeConstructableWith(1);
  });
});

// @effect-diagnostics effect/floatingEffect:error

describe("with floatingEffect restored by the in-file directive", () => {
  test("a negative pin on valid arguments passes, the known-wrong reading", () => {
    expect(f).type.not.toBeCallableWith(1);
    expect(s).type.not.toBeCallableWith(1);
    expect(C).type.not.toBeConstructableWith(1);
  });
});
