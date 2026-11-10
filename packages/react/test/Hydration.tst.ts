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
import type {
  Allow,
  ClientHydrationDropReason,
  DehydrationDropReason,
  Deny,
  HydrationDropReason,
} from "@qadi/core";
import { isAllowed } from "@qadi/core";
import type { DeniedNode } from "../src/components.tsx";
import type {
  ClientDecision,
  DecisionEntry,
  DehydrateOptions,
  DehydratedDecisions,
  HydrateOptions,
  HydrationDrop,
  SeededAllow,
  SeededDecision,
  SeededDeny,
} from "../src/Hydration.ts";
import { dehydrateDecisions } from "../src/Hydration.ts";
import type { EntryDropReason, PayloadRefusalReason } from "../src/HydrationEvent.ts";
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

test("dehydrateDecisions' signature and options are pinned (ARCH-51)", () => {
  // ARCH-51 moves the dehydrate direction into the engine behind this function;
  // its type is the public contract and must not move with it.
  expect<Parameters<typeof dehydrateDecisions>>().type.toBe<
    [entries: ReadonlyArray<DecisionEntry>, options?: DehydrateOptions]
  >();
  expect<ReturnType<typeof dehydrateDecisions>>().type.toBe<DehydratedDecisions>();
  expect<keyof DehydrateOptions>().type.toBe<"includeTrace" | "onDropped">();
  expect<DehydrateOptions["includeTrace"]>().type.toBe<boolean | undefined>();
  expect<DehydrateOptions["onDropped"]>().type.toBe<
    ((drop: HydrationDrop<DecisionEntry, DehydrationDropReason>) => void) | undefined
  >();
});

test("one HydrationDrop shape for both ends' onDropped (ARCH-60, D-53-b option-a)", () => {
  // The hydrate side's spelling is unchanged: one type argument still means the
  // client's reasons.
  expect<HydrationDrop<unknown>>().type.toBe<HydrationDrop<unknown, ClientHydrationDropReason>>();
  // One function over every reason serves both ends.
  type Either = (drop: HydrationDrop<unknown, HydrationDropReason>) => void;
  expect<Either>().type.toBeAssignableTo<NonNullable<DehydrateOptions["onDropped"]>>();
  expect<Either>().type.toBeAssignableTo<NonNullable<HydrateOptions["onDropped"]>>();
  // The bare-array hook is gone, so an old caller fails to compile rather than
  // reading a drop record as an array.
  expect<(dropped: ReadonlyArray<DecisionEntry>) => void>().type.not.toBeAssignableTo<
    NonNullable<DehydrateOptions["onDropped"]>
  >();
});

test("the client's reasons are partitioned into whole-payload and per-entry", () => {
  expect<PayloadRefusalReason | EntryDropReason>().type.toBe<ClientHydrationDropReason>();
  expect<Extract<PayloadRefusalReason, EntryDropReason>>().type.toBe<never>();
});
