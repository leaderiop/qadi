/**
 * Pins each per-port fact's public type wherever it is declared (ARCH-137).
 *
 * Everything is read through the barrel, `../src/index.ts`, so the pins hold when a
 * declaration moves from one module to another: a type that keeps its name and its
 * shape across the move keeps passing, and one that changes either fails here.
 * Only `toBe` pins live in this file. No deliberate compile error does, because
 * `tsconfig.test.json` compiles every `*.tst.ts`, and no negative callable pin does,
 * so the negative-pin budget stays where it is.
 */
import { expect, test } from "tstyche";
import { PORT_NAMES } from "../src/index.ts";
import type {
  ActedEventInput,
  DescriptionOf,
  PortFixtureData,
  PortName,
  PortSpanName,
  PortSpanOf,
  PortTypes,
  RelationshipEdgeInput,
  SignatureInput,
} from "../src/index.ts";
import type { DistinctSpanNames } from "../src/PortDerivation.ts";

test("PortFixtureData is the five members a host states", () => {
  expect<PortFixtureData>().type.toBe<{
    readonly AttributeResolver: { readonly [key: string]: unknown };
    readonly RelationshipResolver: ReadonlyArray<RelationshipEdgeInput>;
    readonly DecisionHistory: ReadonlyArray<ActedEventInput>;
    readonly SignatureHistory: ReadonlyArray<SignatureInput>;
    readonly CustomPredicate: { readonly [key: string]: boolean };
  }>();
});

test("PortSpanName is the five span names", () => {
  expect<PortSpanName>().type.toBe<
    "qadi.attribute" | "qadi.acted" | "qadi.hasRelationship" | "qadi.hasCustom" | "qadi.hasSignature"
  >();
});

test("PortSpanOf is each port's own span", () => {
  expect<PortSpanOf<"AttributeResolver">>().type.toBe<"qadi.attribute">();
  expect<PortSpanOf<"DecisionHistory">>().type.toBe<"qadi.acted">();
  expect<PortSpanOf<"RelationshipResolver">>().type.toBe<"qadi.hasRelationship">();
  expect<PortSpanOf<"CustomPredicate">>().type.toBe<"qadi.hasCustom">();
  expect<PortSpanOf<"SignatureHistory">>().type.toBe<"qadi.hasSignature">();
});

test("PortName is the five ports", () => {
  expect<PortName>().type.toBe<
    | "AttributeResolver"
    | "DecisionHistory"
    | "RelationshipResolver"
    | "CustomPredicate"
    | "SignatureHistory"
  >();
});

test("PORT_NAMES is the five names, in the registry's order", () => {
  expect(PORT_NAMES).type.toBe<
    readonly [
      "AttributeResolver",
      "DecisionHistory",
      "RelationshipResolver",
      "CustomPredicate",
      "SignatureHistory",
    ]
  >();
});

type Six = {
  readonly A: { readonly span: "qadi.a" };
  readonly B: { readonly span: "qadi.b" };
  readonly C: { readonly span: "qadi.c" };
  readonly D: { readonly span: "qadi.d" };
  readonly E: { readonly span: "qadi.e" };
  readonly F: { readonly span: "qadi.f" };
};
type Duplicate = {
  readonly A: { readonly span: "qadi.a" };
  readonly B: { readonly span: "qadi.a" };
};
type Widened = {
  readonly A: { readonly span: `qadi.${string}` };
  readonly B: { readonly span: "qadi.b" };
};
type Prefixed = {
  readonly A: { readonly span: "qadi.acted" };
  readonly B: { readonly span: "qadi.actedX" };
};
type Cased = {
  readonly A: { readonly span: "qadi.Acted" };
  readonly B: { readonly span: "qadi.acted" };
};
type Claim = {
  readonly [K in keyof PortTypes]: K extends "AttributeResolver"
    ? { readonly span: "qadi.acted" }
    : PortTypes[K];
};

test("no two ports share a span name, and each names one literal", () => {
  expect<DistinctSpanNames<Six>>().type.toBe<unknown>();
  expect<DistinctSpanNames<PortTypes>>().type.toBe<unknown>();
  expect<DistinctSpanNames<Prefixed>>().type.toBe<unknown>();
  expect<DistinctSpanNames<Cased>>().type.toBe<unknown>();
  expect<DistinctSpanNames<Duplicate>>().type.toBe<never>();
  expect<DistinctSpanNames<Widened>>().type.toBe<never>();
  expect<DistinctSpanNames<Claim>>().type.toBe<never>();
});

test("span is a required member of a description", () => {
  expect<PortTypes["AttributeResolver"]>().type.toBeAssignableTo<DescriptionOf<"AttributeResolver">>();
  expect<PortTypes["DecisionHistory"]>().type.toBeAssignableTo<DescriptionOf<"DecisionHistory">>();
  expect<PortTypes["RelationshipResolver"]>().type.toBeAssignableTo<
    DescriptionOf<"RelationshipResolver">
  >();
  expect<PortTypes["CustomPredicate"]>().type.toBeAssignableTo<DescriptionOf<"CustomPredicate">>();
  expect<PortTypes["SignatureHistory"]>().type.toBeAssignableTo<DescriptionOf<"SignatureHistory">>();
  expect<Omit<PortTypes["AttributeResolver"], "span">>().type.not.toBeAssignableTo<
    DescriptionOf<"AttributeResolver">
  >();
  expect<Omit<PortTypes["DecisionHistory"], "span">>().type.not.toBeAssignableTo<
    DescriptionOf<"DecisionHistory">
  >();
  expect<Omit<PortTypes["RelationshipResolver"], "span">>().type.not.toBeAssignableTo<
    DescriptionOf<"RelationshipResolver">
  >();
  expect<Omit<PortTypes["CustomPredicate"], "span">>().type.not.toBeAssignableTo<
    DescriptionOf<"CustomPredicate">
  >();
  expect<Omit<PortTypes["SignatureHistory"], "span">>().type.not.toBeAssignableTo<
    DescriptionOf<"SignatureHistory">
  >();
});
