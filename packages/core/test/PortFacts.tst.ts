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
import type {
  ActedEventInput,
  PortFixtureData,
  PortName,
  PortSpanName,
  PortSpanOf,
  RelationshipEdgeInput,
  SignatureInput,
} from "../src/index.ts";

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
