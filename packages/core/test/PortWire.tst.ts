/**
 * Pins that a port's wire is a required, correctly typed member of its
 * description (ARCH-31, ADR-QD-094): a description without one, or whose wire
 * answers the wrong type, is not a description of that port.
 *
 * No deliberate compile error lives here, because `tsconfig.test.json` also
 * compiles every `*.tst.ts`; the negative cases are `not.toBeAssignableTo`.
 */
import { expect, test } from "tstyche";
import type { AuthSubject } from "../src/AuthSubject.ts";
import type { SubjectId } from "../src/Identity.ts";
import type { PortWire } from "../src/PortWire.ts";
import type { DescriptionOf, PortTypes } from "../src/Ports.ts";
import type { RelatedResult, RelationshipCheck } from "../src/RelationshipResolver.ts";
import type { Resource } from "../src/Resource.ts";
import type { Signature } from "../src/Signature.ts";

test("each wire is typed by its port's arguments and answer", () => {
  expect<PortTypes["AttributeResolver"]["wire"]>().type.toBe<
    PortWire<[subjectId: SubjectId, attribute: string], unknown>
  >();
  expect<PortTypes["RelationshipResolver"]["wire"]>().type.toBe<
    PortWire<[request: RelationshipCheck], RelatedResult>
  >();
  expect<PortTypes["CustomPredicate"]["wire"]>().type.toBe<
    PortWire<
      [name: string, subject: AuthSubject, resource: Resource | undefined, params: unknown],
      boolean
    >
  >();
  expect<PortTypes["SignatureHistory"]["wire"]["decodeAnswer"]>().type.toBeCallableWith(
    undefined as unknown,
  );
});

test("a wire that answers the wrong type is not this port's wire", () => {
  expect<PortWire<[request: RelationshipCheck], boolean>>().type.not.toBeAssignableTo<
    PortWire<[request: RelationshipCheck], RelatedResult>
  >();
  expect<PortWire<[request: RelationshipCheck], ReadonlyArray<Signature>>>().type.not.toBeAssignableTo<
    DescriptionOf<"RelationshipResolver">["wire"]
  >();
});

test("a description without a wire is not a description of its port", () => {
  expect<Omit<PortTypes["AttributeResolver"], "wire">>().type.not.toBeAssignableTo<
    DescriptionOf<"AttributeResolver">
  >();
  expect<Omit<PortTypes["SignatureHistory"], "wire">>().type.not.toBeAssignableTo<
    DescriptionOf<"SignatureHistory">
  >();
});
