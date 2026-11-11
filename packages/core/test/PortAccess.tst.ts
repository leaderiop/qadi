/**
 * Pins that a port read takes its policy leaf, so a meaning and a signer role,
 * or any two names, cannot be swapped and still type-check (ARCH-70, SCOPE-03).
 *
 * No deliberate compile error lives here, because `tsconfig.test.json` also
 * compiles every `*.tst.ts`; a refusal is asserted with `not.toBeCallableWith`,
 * and what each read does take with `toBeCallableWith`: the leaf it answers
 * (`LeafOf`), and the resource where the request needs one.
 */
import { expect, test } from "tstyche";
import type { AuthSubject } from "../src/AuthSubject.ts";
import {
  askActed,
  askCustom,
  askRelationship,
  askSignature,
  readAttribute,
} from "../src/PortAccess.ts";
import type { LeafOf } from "../src/PortDescription.ts";
import type { Resource } from "../src/Resource.ts";

declare const subject: AuthSubject;
declare const resource: Resource | undefined;
declare const attributeLeaf: LeafOf["HasAttribute"];
declare const actedLeaf: LeafOf["HasActed"];
declare const notActedLeaf: LeafOf["HasNotActed"];
declare const relationshipLeaf: LeafOf["HasRelationship"];
declare const customLeaf: LeafOf["HasCustom"];
declare const signatureLeaf: LeafOf["HasSignature"];

/**
 * A read's parameters with its result dropped. The reads return an `Effect`, and
 * the Effect language service reports a call to one as a floating effect, which
 * tstyche then reads as "not callable": a bare `toBeCallableWith` would fail on
 * the read itself whatever its parameters were, and `not.toBeCallableWith` would
 * pass.
 */
type Params<F> = F extends (...args: infer A) => unknown ? (...args: A) => void : never;

test("a signature read cannot be called with loose strings", () => {
  expect<Params<typeof askSignature>>().type.not.toBeCallableWith(subject, "approved", "manager", "Resource", undefined);
});

test("a signature read is called with its leaf and the resource", () => {
  expect<Params<typeof askSignature>>().type.toBeCallableWith(subject, signatureLeaf, resource);
});

test("a relationship read cannot be called with loose strings", () => {
  expect<Params<typeof askRelationship>>().type.not.toBeCallableWith(subject, "owner", undefined, 2);
});

test("a relationship read is called with its leaf and the resource", () => {
  expect<Params<typeof askRelationship>>().type.toBeCallableWith(subject, relationshipLeaf, resource);
});

test("an acted read cannot be called with loose strings", () => {
  expect<Params<typeof askActed>>().type.not.toBeCallableWith("evaluate", subject, "approved", undefined);
  expect<Params<typeof askActed>>().type.not.toBeCallableWith("toPredicate", subject, "approved");
});

test("an acted read takes the interpreter first, then either acted leaf and the resource", () => {
  expect<Params<typeof askActed>>().type.toBeCallableWith("evaluate", subject, actedLeaf, resource);
  expect<Params<typeof askActed>>().type.toBeCallableWith("toPredicate", subject, notActedLeaf, undefined);
});

test("an attribute read cannot be called with loose strings", () => {
  expect<Params<typeof readAttribute>>().type.not.toBeCallableWith("evaluate", subject, "level");
});

test("an attribute read takes the interpreter first, then its leaf", () => {
  expect<Params<typeof readAttribute>>().type.toBeCallableWith("evaluate", subject, attributeLeaf);
  expect<Params<typeof readAttribute>>().type.toBeCallableWith("toPredicate", subject, attributeLeaf);
});

test("a custom read cannot be called with loose strings", () => {
  expect<Params<typeof askCustom>>().type.not.toBeCallableWith(subject, undefined, "isOwner", {});
});

test("a custom read is called with its leaf and the resource", () => {
  expect<Params<typeof askCustom>>().type.toBeCallableWith(subject, customLeaf, resource);
});
