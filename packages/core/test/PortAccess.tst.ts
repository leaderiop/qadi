/**
 * Pins that a port read takes its policy leaf, so a meaning and a signer role,
 * or any two names, cannot be swapped and still type-check (ARCH-70, SCOPE-03).
 *
 * No deliberate compile error lives here, because `tsconfig.test.json` also
 * compiles every `*.tst.ts`; a refusal is asserted with `not.toBeCallableWith`.
 * Only the negative cases are written: a positive pin against the leaf-taking
 * interface would not compile until that interface exists, so it arrives with
 * it (22-03), together with `askActed` replacing the two acted reads.
 */
import { expect, test } from "tstyche";
import type { AuthSubject } from "../src/AuthSubject.ts";
import {
  askActedAny,
  askActedForResource,
  askCustom,
  askRelationship,
  askSignature,
  readAttribute,
} from "../src/PortAccess.ts";

declare const subject: AuthSubject;

/**
 * A read's parameters with its result dropped. The reads return an `Effect`, and
 * the Effect language service reports a call to one as a floating effect, which
 * tstyche then reads as "not callable": `not.toBeCallableWith` would pass on the
 * read itself whatever its parameters were.
 */
type Params<F> = F extends (...args: infer A) => unknown ? (...args: A) => void : never;

test("a signature read cannot be called with loose strings", () => {
  expect<Params<typeof askSignature>>().type.not.toBeCallableWith(subject, "approved", "manager", "Resource", undefined);
});

test("a relationship read cannot be called with loose strings", () => {
  expect<Params<typeof askRelationship>>().type.not.toBeCallableWith(subject, "owner", undefined, 2);
});

test("an acted read cannot be called with loose strings", () => {
  expect<Params<typeof askActedForResource>>().type.not.toBeCallableWith("evaluate", subject, "approved", undefined);
  expect<Params<typeof askActedAny>>().type.not.toBeCallableWith("toPredicate", subject, "approved");
});

test("an attribute read cannot be called with loose strings", () => {
  expect<Params<typeof readAttribute>>().type.not.toBeCallableWith("evaluate", subject, "level");
});

test("a custom read cannot be called with loose strings", () => {
  expect<Params<typeof askCustom>>().type.not.toBeCallableWith(subject, undefined, "isOwner", {});
});
