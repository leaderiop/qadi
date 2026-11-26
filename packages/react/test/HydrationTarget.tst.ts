/**
 * Pins what `hydrateDecisions` asks of its first argument: any value with the
 * `hydrate` capability, and an atom set is one.
 *
 * Type-level, because a runtime test cannot observe a parameter widening or
 * narrowing. It uses positive pins and `not.toBeAssignableTo` only, so the
 * negative-pin budget in `scripts/check-house-style.mjs` does not move.
 */
import { expect, test } from "tstyche";
import type { AuthSubject } from "@qadi/core";
import type { DehydratedDecisions, HydrateOptions, InitialValues } from "../src/HydrationEngine.ts";
import { hydrateDecisions } from "../src/HydrationEngine.ts";
import type { QadiAtoms } from "../src/QadiAtoms.ts";

type Written = (
  dehydrated: DehydratedDecisions,
  subject: AuthSubject,
  options?: HydrateOptions,
) => InitialValues;

declare const forwarding: { readonly hydrate: Written };
declare const payload: DehydratedDecisions;
declare const subject: AuthSubject;

test("hydrateDecisions accepts any value that has the hydrate capability", () => {
  expect(hydrateDecisions).type.toBeCallableWith(forwarding, payload, subject);
});

test("an atom set is a hydrate target", () => {
  expect<QadiAtoms>().type.toBeAssignableTo<Parameters<typeof hydrateDecisions>[0]>();
});

test("the atom set states hydrate through the one signature", () => {
  expect<QadiAtoms["hydrate"]>().type.toBe<Written>();
});

test("a value without hydrate is not a hydrate target", () => {
  expect<{ readonly decision: unknown }>().type.not.toBeAssignableTo<
    Parameters<typeof hydrateDecisions>[0]
  >();
});
