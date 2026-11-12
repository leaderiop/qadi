/**
 * Pins that a port's wire question and span question name every member, so a
 * question or a pose that leaves one out is a compile error rather than a
 * silently dropped field (ARCH-69, PREQ-04, PREQ-05).
 *
 * No deliberate compile error lives here, because `tsconfig.test.json` also
 * compiles every `*.tst.ts`; the negative cases are `not.toBeAssignableTo`.
 */
import type * as Result from "effect/Result";
import { expect, test } from "tstyche";
import type { ResourceId, SubjectId } from "../src/Identity.ts";
import type { PortWireSpec } from "../src/PortWireEncode.ts";
import type { DescriptionOf } from "../src/Ports.ts";
import type { RelationshipCheck } from "../src/RelationshipResolver.ts";
import type { SignatureQuery } from "../src/SignatureHistory.ts";

/** A question with one required and one optional member. */
type Q = { readonly subjectId: SubjectId; readonly meaning?: string };
type Slot = PortWireSpec<[q: Q], boolean, Q, Q, boolean, boolean>["toQuestion"];

/** A question whose second member is required. */
type QRequired = { readonly subjectId: SubjectId; readonly meaning: string };
type SlotRequired = PortWireSpec<
  [q: QRequired],
  boolean,
  QRequired,
  QRequired,
  boolean,
  boolean
>["toQuestion"];

type Asking<Question> = (args: [q: Q]) => Result.Result<Question, never>;
type AskingRequired<Question> = (args: [q: QRequired]) => Result.Result<Question, never>;

test("a question with an optional member left out is not a question", () => {
  expect<Asking<{ readonly subjectId: SubjectId }>>().type.not.toBeAssignableTo<Slot>();
});

test("a question states an absent member as undefined", () => {
  expect<
    Asking<{ readonly subjectId: SubjectId; readonly meaning: string | undefined }>
  >().type.toBeAssignableTo<Slot>();
});

test("a question's required member stays required and defined", () => {
  expect<
    AskingRequired<{ readonly subjectId: undefined; readonly meaning: string }>
  >().type.not.toBeAssignableTo<SlotRequired>();
  expect<
    AskingRequired<{ readonly subjectId: SubjectId; readonly meaning: string | undefined }>
  >().type.not.toBeAssignableTo<SlotRequired>();
  expect<AskingRequired<{ readonly meaning: string }>>().type.not.toBeAssignableTo<SlotRequired>();
  expect<
    AskingRequired<{ readonly subjectId: SubjectId; readonly meaning: string }>
  >().type.toBeAssignableTo<SlotRequired>();
});

/**
 * The relationship port's `pose` takes a request whose `resourceId` may be
 * absent, so a read can state its question before the id is validated (D-07).
 */
type RelationshipPoseArgs = [
  request: Omit<RelationshipCheck, "resourceId"> & { readonly resourceId: ResourceId | undefined },
];

type DropsSignerRole = (args: [query: SignatureQuery]) => {
  readonly subjectId: SubjectId;
  readonly scope: "Any" | "Resource";
  readonly resourceId: ResourceId | undefined;
  readonly meaning: string | undefined;
};

type DropsAttribute = (args: [subjectId: SubjectId, attribute: string]) => {
  readonly subjectId: SubjectId;
};

type DropsDepth = (args: RelationshipPoseArgs) => {
  readonly subjectId: SubjectId;
  readonly relation: string;
  readonly resourceId: ResourceId | undefined;
};

type StatesEverySignatureMember = (args: [query: SignatureQuery]) => {
  readonly subjectId: SubjectId;
  readonly scope: "Any" | "Resource";
  readonly resourceId: ResourceId | undefined;
  readonly meaning: string | undefined;
  readonly signerRole: string | undefined;
};

type StatesEveryAttributeMember = (args: [subjectId: SubjectId, attribute: string]) => {
  readonly subjectId: SubjectId;
  readonly attribute: string;
};

type StatesEveryRelationshipMember = (args: RelationshipPoseArgs) => {
  readonly subjectId: SubjectId;
  readonly relation: string;
  readonly resourceId: ResourceId | undefined;
  readonly depth: number | undefined;
};

test("a pose with a member left out is not this port's pose", () => {
  expect<DropsSignerRole>().type.not.toBeAssignableTo<
    DescriptionOf<"SignatureHistory">["attributes"]["pose"]
  >();
  expect<DropsAttribute>().type.not.toBeAssignableTo<
    DescriptionOf<"AttributeResolver">["attributes"]["pose"]
  >();
  expect<DropsDepth>().type.not.toBeAssignableTo<
    DescriptionOf<"RelationshipResolver">["attributes"]["pose"]
  >();
});

test("a pose that states every member is this port's pose", () => {
  expect<StatesEverySignatureMember>().type.toBeAssignableTo<
    DescriptionOf<"SignatureHistory">["attributes"]["pose"]
  >();
  expect<StatesEveryAttributeMember>().type.toBeAssignableTo<
    DescriptionOf<"AttributeResolver">["attributes"]["pose"]
  >();
  expect<StatesEveryRelationshipMember>().type.toBeAssignableTo<
    DescriptionOf<"RelationshipResolver">["attributes"]["pose"]
  >();
});
