/**
 * Pins what the type of a decision now says about where it came from.
 *
 * A seeded decision is a projection of the server's, not an evaluation, and the
 * compiler is what makes a reader prove they handled that. Type-level, because a
 * runtime test cannot observe that a call stopped compiling — and a
 * `ClientDecision` that quietly satisfied `isAllowed` again is exactly the
 * regression that would reintroduce a seed read as if it were an evaluation
 * (ARCH-05, ADR-QD-028).
 */
import { expect, test } from "tstyche";
import type { Allow, Deny, EvaluationError } from "@qadi/core";
import { isAllowed } from "@qadi/core";
import type * as AsyncResult from "effect/reactivity/AsyncResult";
import type { DeniedNode } from "../src/components.tsx";
import type {
  ClientDecision,
  SeededAllow,
  SeededDecision,
  SeededDeny,
} from "../src/Hydration.ts";
import type { DecisionResult } from "../src/QadiAtoms.ts";
import { currentDecision } from "../src/QadiAtoms.ts";
import { permits } from "../src/SeededDecision.ts";

declare const anyDecision: ClientDecision;
declare const evaluated: Allow;

test("ClientDecision is the closed union of four cases", () => {
  expect<ClientDecision>().type.toBe<Allow | Deny | SeededAllow | SeededDeny>();
  expect<SeededDecision>().type.toBe<SeededAllow | SeededDeny>();
});

test("isAllowed from core rejects a ClientDecision", () => {
  // A seed is not an `Allow`, so core's verdict read must not accept one.
  expect(isAllowed).type.not.toBeCallableWith(anyDecision);
  expect(isAllowed).type.toBeCallableWith(evaluated);
});

test("permits reads the verdict of every case", () => {
  expect(permits).type.toBeCallableWith(anyDecision);
});

test("a denied fallback is handed an evaluated or a seeded denial", () => {
  expect<Parameters<Extract<DeniedNode, (...args: never) => unknown>>[0]>().type.toBe<
    Deny | SeededDeny
  >();
});

test("a decision atom holds a ClientDecision, read through currentDecision", () => {
  expect<DecisionResult>().type.toBe<AsyncResult.AsyncResult<ClientDecision, EvaluationError>>();
  expect<ReturnType<typeof currentDecision>>().type.toBe<ClientDecision | undefined>();
});
