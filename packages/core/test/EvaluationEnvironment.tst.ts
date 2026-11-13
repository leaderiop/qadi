/**
 * Pins the public shape of the evaluation environment builder, read through
 * `@qadi/core`'s barrel.
 *
 * `shadow` and `idPrefix` have no default, so forgetting the seal is a compile
 * error, and the pin says so by rejecting a call without them rather than by
 * a deliberate compile error: `tsconfig.test.json` also compiles every `*.tst.ts`.
 */
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { expect, test } from "tstyche";
import type {
  EvaluationClock,
  EvaluationEnvironmentOptions,
  EvaluationShadowing,
  PortServices,
  StandingEvaluationServices,
} from "../src/index.ts";
import { evaluationEnvironment, portsLayer } from "../src/index.ts";

test("EvaluationShadowing is exactly none or sinkAndCache", () => {
  expect<EvaluationShadowing>().type.toBe<"none" | "sinkAndCache">();
});

test("EvaluationClock is exactly live or deterministic", () => {
  expect<EvaluationClock>().type.toBe<"live" | "deterministic">();
});

test("EvaluationEnvironmentOptions is four readonly required fields", () => {
  expect<EvaluationEnvironmentOptions>().type.toBe<{
    readonly ports: Layer.Layer<PortServices>;
    readonly idPrefix: string;
    readonly clock: Layer.Layer<never>;
    readonly shadow: EvaluationShadowing;
  }>();
});

test("evaluationEnvironment takes the options and provides the standing services", () => {
  expect(evaluationEnvironment).type.toBe<
    (options: EvaluationEnvironmentOptions) => Layer.Layer<StandingEvaluationServices>
  >();
});

test("a forgotten or widened argument does not compile", () => {
  const ports = portsLayer();
  const clock = TestClock.layer();
  expect(evaluationEnvironment).type.not.toBeCallableWith({ ports, idPrefix: "x", clock });
  expect(evaluationEnvironment).type.not.toBeCallableWith({ ports, clock, shadow: "none" });
  expect(evaluationEnvironment).type.not.toBeCallableWith({
    ports,
    idPrefix: "x",
    clock,
    shadow: true,
  });
  expect(evaluationEnvironment).type.not.toBeCallableWith({
    ports,
    idPrefix: "x",
    clock,
    shadow: "sink",
  });
});

test("clock admits a test clock layer and an empty one", () => {
  const ports = portsLayer();
  expect(evaluationEnvironment).type.toBeCallableWith({
    ports,
    idPrefix: "x",
    clock: TestClock.layer(),
    shadow: "none",
  });
  expect(evaluationEnvironment).type.toBeCallableWith({
    ports,
    idPrefix: "x",
    clock: Layer.empty,
    shadow: "none",
  });
});
