/**
 * Pins the property that makes `DecisionSink` safe to add at all: it is read
 * through `Effect.serviceOption`, so it must contribute **nothing** to what
 * `evaluate` requires.
 *
 * A type-level assertion rather than a runtime one, deliberately. A runtime test
 * cannot observe a widened requirement — an over-wide `R` still runs correctly
 * when the service happens to be provided, and every test here provides a full
 * layer. The failure this guards against is a caller's `Effect.provide` no
 * longer type-checking, which only a type test sees. `DecisionCache` established
 * the same rule (ADR-QD-031) and nothing pinned it.
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type { EvaluationServices } from "../src/Evaluate.ts";
import { evaluate } from "../src/Evaluate.ts";
import type { DecisionSink, DecisionSinkShape } from "../src/DecisionSink.ts";
import * as P from "../src/Policy.ts";
import { permission } from "../src/Permission.ts";

const read = permission("doc", "read");

test("evaluate does not require DecisionSink", () => {
  // The whole claim, stated as a type: the sink is not one of the services
  // `evaluate` requires, so an application that never wires one is unaffected.
  expect<DecisionSink>().type.not.toBeAssignableTo<EvaluationServices>();

  const evaluated = evaluate(P.hasPermission(read));
  expect(evaluated).type.toBeAssignableTo<
    Effect.Effect<unknown, unknown, EvaluationServices>
  >();
});

test("evaluationId is optional and does not widen the requirement", () => {
  const correlated = evaluate(P.hasPermission(read), { evaluationId: "srv-1" });
  expect(correlated).type.toBeAssignableTo<
    Effect.Effect<unknown, unknown, EvaluationServices>
  >();
});

test("a sink that can fail is unrepresentable", () => {
  // The `never` error channel does more than oblige an implementor to handle
  // its own failures — it makes a failing sink un-writable. This was found by
  // the merge gate rejecting a test that tried to build one, which is a
  // stronger guarantee than the one originally claimed for it.
  //
  // What it does NOT stop is a defect: `Effect.die` and a body that throws are
  // both assignable, which is why `evaluate` also guards with `Effect.catchCause`
  // and why `DecisionSink.test.ts` exercises both.
  expect<Effect.Effect<void, string>>().type.not.toBeAssignableTo<
    ReturnType<DecisionSinkShape["record"]>
  >();
  expect<Effect.Effect<never, never>>().type.toBeAssignableTo<
    ReturnType<DecisionSinkShape["record"]>
  >();
});
