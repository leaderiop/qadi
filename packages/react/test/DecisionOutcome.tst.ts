/**
 * Pins what a decision outcome can carry, at the type level.
 *
 * The point of `DecisionOutcome` is that a stale answer has nowhere to live: a
 * re-check, a first ask and a failure carry no decision, and an allow carries
 * only an allow. A runtime test can show today's values are right; only the
 * compiler can show tomorrow's cannot be wrong (ADR-QD-017).
 */
import { expect, test } from "tstyche";
import type { Allow, Deny, EvaluationError } from "@qadi/core";
import type * as AsyncResult from "effect/reactivity/AsyncResult";
import type { DecisionOutcome, DecisionResult } from "../src/DecisionOutcome.ts";
import { currentDecision, outcomeOf } from "../src/DecisionOutcome.ts";
import type { GateRenderState } from "../src/GateRegistry.ts";
import type { ClientDecision, SeededAllow, SeededDeny } from "../src/SeededDecision.ts";

type Case<Tag extends DecisionOutcome["_tag"]> = Extract<DecisionOutcome, { readonly _tag: Tag }>;

test("an allowed outcome carries only an allow, evaluated or seeded", () => {
  expect<Case<"Allowed">["decision"]>().type.toBe<Allow | SeededAllow>();
});

test("a denied outcome carries only a denial, evaluated or seeded", () => {
  expect<Case<"Denied">["decision"]>().type.toBe<Deny | SeededDeny>();
});

test("the non-answers carry no decision", () => {
  expect<Case<"Pending">>().type.not.toHaveProperty("decision");
  expect<Case<"Rechecking">>().type.not.toHaveProperty("decision");
  expect<Case<"Failed">>().type.not.toHaveProperty("decision");
  expect<Case<"Failed">>().type.not.toHaveProperty("previousSuccess");
});

test("the outcome is the closed union of five cases", () => {
  expect<DecisionOutcome["_tag"]>().type.toBe<
    "Pending" | "Rechecking" | "Allowed" | "Denied" | "Failed"
  >();
});

test("a gate's render state is the outcome's tag, not a restatement of it", () => {
  expect<GateRenderState>().type.toBe<DecisionOutcome["_tag"]>();
});

test("a decision atom holds a ClientDecision, read through outcomeOf or currentDecision", () => {
  expect<DecisionResult>().type.toBe<AsyncResult.AsyncResult<ClientDecision, EvaluationError>>();
  expect<ReturnType<typeof outcomeOf>>().type.toBe<DecisionOutcome>();
  expect<ReturnType<typeof currentDecision>>().type.toBe<ClientDecision | undefined>();
});
