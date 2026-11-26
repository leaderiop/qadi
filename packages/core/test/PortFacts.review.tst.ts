/**
 * Pins what `DistinctSpanNames` refuses beyond a shared literal and a pattern: a span
 * that is a union of names, a union that holds a pattern, and two unions that share
 * one member.
 *
 * Only `toBe` pins live in this file, as in `PortFacts.tst.ts`: no deliberate compile
 * error and no negative callable pin, so the negative-pin budget stays where it is.
 */
import { expect, test } from "tstyche";
import type { PortTypes } from "../src/index.ts";
import type { DistinctSpanNames } from "../src/PortDerivation.ts";

type Distinct = {
  readonly A: { readonly span: "qadi.a" };
  readonly B: { readonly span: "qadi.b" };
};
type UnionSpan = {
  readonly A: { readonly span: "qadi.a" | "qadi.x" };
  readonly B: { readonly span: "qadi.b" };
};
type UnionWithPattern = {
  readonly A: { readonly span: "qadi.a" | `qadi.${string}x` };
  readonly B: { readonly span: "qadi.b" };
};
type SharedThroughUnions = {
  readonly A: { readonly span: "qadi.a" | "qadi.shared" };
  readonly B: { readonly span: "qadi.b" | "qadi.shared" };
};

test("a registry of distinct literal spans is accepted, the library's own included", () => {
  expect<DistinctSpanNames<Distinct>>().type.toBe<unknown>();
  expect<DistinctSpanNames<PortTypes>>().type.toBe<unknown>();
});

test("a span that is a union of names is refused", () => {
  expect<DistinctSpanNames<UnionSpan>>().type.toBe<never>();
});

test("a span that is a union holding a pattern is refused", () => {
  expect<DistinctSpanNames<UnionWithPattern>>().type.toBe<never>();
});

test("two spans that share one member through their unions are refused", () => {
  expect<DistinctSpanNames<SharedThroughUnions>>().type.toBe<never>();
});
