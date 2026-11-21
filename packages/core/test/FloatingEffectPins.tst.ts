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
 * Three blocks, one for each way the rule's setting reaches a pin, and each runs where
 * it holds (`scripts/run-tstyche.mjs`).
 *
 * - The first runs under `tsconfig.tstyche.json`, rule off: its negative pins on valid
 *   arguments carry tstyche's `fixme` directive, so tstyche fails the run if one of them
 *   ever passes. Pass 2 skips it.
 * - The second carries no directive and asserts the reading that holds only when the
 *   config itself has the rule on: the same negative pins pass. Pass 1 skips it, and in
 *   pass 2 it goes red if `tsconfig.test.json` (or its base) stops having the rule on,
 *   by any route (severity, `diagnostics: false`, the plugin dropped).
 * - The third follows the position-based language-service directive, which turns the rule
 *   back on for the rest of the file (the next-line form has no effect on it), and asserts
 *   the same reading. It runs in both passes: in pass 1 it goes red if the directive stops
 *   working; in pass 2 the config and the directive agree, so it proves nothing more.
 *
 * The two blocks that a pass skips each carry the text their skip uses in their title,
 * and each text appears once in the repository's type tests; the third runs in both
 * passes and carries none. If an upgrade turns any block red, the tool's reading changed:
 * revisit `tsconfig.tstyche.json` and the checks AGENTS.md section 6 builds on it.
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

describe("under tsconfig.test.json, floatingEffect is on", () => {
  test("a negative pin on valid arguments passes, the known-wrong reading", () => {
    expect(f).type.not.toBeCallableWith(1);
    expect(s).type.not.toBeCallableWith(1);
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
