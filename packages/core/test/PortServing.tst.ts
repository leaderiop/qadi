/**
 * Pins that a port's serving facet is a required, correctly typed member of its
 * description, and that the host's `PortServing` declaration keeps the shape it
 * had before it moved (ARCH-53, ADR-QD-114): a description without a facet, or
 * whose allowlist word disagrees with its `PortServing` slot, is not that
 * port's description.
 *
 * No deliberate compile error lives here, because `tsconfig.test.json` also
 * compiles every `*.tst.ts`; the negative cases are `not.toBeAssignableTo`.
 */
import { expect, test } from "tstyche";
import type { PortServing, PortServingFacet } from "../src/PortServing.ts";
import type { ActedQuery } from "../src/DecisionHistory.ts";
import type { DescriptionOf, PortTypes } from "../src/Ports.ts";

test("PortServing keeps the five-member declaration a host writes", () => {
  expect<PortServing>().type.toBe<{
    readonly AttributeResolver?: { readonly attributes: ReadonlyArray<string> } | undefined;
    readonly RelationshipResolver?: { readonly relations?: ReadonlyArray<string> | undefined } | undefined;
    readonly DecisionHistory?: { readonly events?: ReadonlyArray<string> | undefined } | undefined;
    readonly CustomPredicate?: { readonly names: ReadonlyArray<string> } | undefined;
    readonly SignatureHistory?: { readonly signatures: "own-records" } | undefined;
  }>();
});

test("serving is a required member of a description", () => {
  expect<Omit<PortTypes["AttributeResolver"], "serving">>().type.not.toBeAssignableTo<
    DescriptionOf<"AttributeResolver">
  >();
});

test("each allowlist word is the one its PortServing slot earns", () => {
  expect<PortTypes["AttributeResolver"]["serving"]["allowlist"]>().type.toBe<"required">();
  expect<PortTypes["CustomPredicate"]["serving"]["allowlist"]>().type.toBe<"required">();
  expect<PortTypes["DecisionHistory"]["serving"]["allowlist"]>().type.toBe<"open">();
  expect<PortTypes["RelationshipResolver"]["serving"]["allowlist"]>().type.toBe<"open">();
  expect<PortTypes["SignatureHistory"]["serving"]["allowlist"]>().type.toBe<"opt-in">();
});

test("a facet whose word disagrees with its slot is not that port's facet", () => {
  expect<PortServingFacet<"DecisionHistory", [query: ActedQuery]>>().type.toBe<
    PortTypes["DecisionHistory"]["serving"]
  >();
  expect<
    Omit<PortServingFacet<"DecisionHistory", [query: ActedQuery]>, "allowlist"> & {
      readonly allowlist: "required";
    }
  >().type.not.toBeAssignableTo<PortTypes["DecisionHistory"]["serving"]>();
});
