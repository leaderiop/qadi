/**
 * Pins `Authorized<P>`'s per-permission distinctness: `permission` is a real
 * field on the branded value, not a phantom, so a witness produced for one
 * permission must not satisfy a position typed for a different permission's
 * witness. Previously checked only via a `@ts-expect-error` comment inside
 * `Qadi.test.ts`, itself inside an `it()` that never runs — a real assertion
 * now, not a comment a future edit could delete without anything noticing.
 *
 * MP-03 (100-lens audit): the four `.tst.ts` files in this workspace pinned
 * `Authorized<P>`'s distinctness, `RequirePermission`'s genericity and its
 * `ClientError` union, and `addGuardedRoute`'s `CurrentSubject` discharge — but
 * nothing pinned `enforce`'s own inferred `E`/`R` channels or `guard`'s `P`
 * inference from its literal `permission` argument, the two generic-heavy
 * entry points every other guarded surface in this workspace is built from. A
 * regression widening either would surface only when a downstream app failed
 * to compile, the "assumed to work because the PR examples compile" failure
 * mode this file exists to close off. The tests below fill that gap.
 */
import { expect, test } from "tstyche";
import * as Effect from "effect/Effect";
import type { Authorized } from "../src/Authorized.ts";
import type { EvaluationServices } from "../src/EvaluationServices.ts";
import { permission } from "../src/Permission.ts";
import { hasPermission } from "../src/Policy.ts";
import type { EnforcementError, EvaluationError, UndischargedObligation } from "../src/Errors.ts";
import type { Allow } from "../src/Decision.ts";
import type { Obligation } from "../src/Obligation.ts";
import type { Question } from "../src/Question.ts";
import type { Resource } from "../src/Resource.ts";
import type {
  EnforceOptions,
  LoadedEnforceOptions,
  ObligationDischarge,
  ObligationHandler,
} from "../src/Qadi.ts";
import {
  enforce,
  enforceLoaded,
  enforceProjected,
  enforceProjectedLoaded,
  filter,
  filterProjected,
  filterStream,
  filterStreamProjected,
  guard,
} from "../src/Qadi.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");

test("a witness for one permission is not assignable where a different permission's is required", () => {
  expect<Authorized<typeof read>>().type.not.toBeAssignableTo<Authorized<typeof write>>();
  expect<Authorized<typeof write>>().type.not.toBeAssignableTo<Authorized<typeof read>>();
  expect<Authorized<typeof read>>().type.toBeAssignableTo<Authorized<typeof read>>();
});

type ErrorOf<T> = T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never;
type RequirementsOf<T> = T extends Effect.Effect<infer _A, infer _E, infer R> ? R : never;

declare class WrappedError {}
declare class WrappedReq {}
declare class ObligationError {}
declare class ObligationReq {}

declare const wrapped: Effect.Effect<number, WrappedError, WrappedReq>;
declare const options: EnforceOptions<ObligationError, ObligationReq>;

test("enforce's E channel is the wrapped effect's E, EnforcementError, and onObligations' own E", () => {
  const enforced = wrapped.pipe(enforce(hasPermission(read), options));
  type E = ErrorOf<typeof enforced>;

  expect<E>().type.toBe<WrappedError | EnforcementError | ObligationError>();
});

test("enforce's R channel is the wrapped effect's R, EvaluationServices, and onObligations' own R", () => {
  const enforced = wrapped.pipe(enforce(hasPermission(read), options));
  type R = RequirementsOf<typeof enforced>;

  expect<R>().type.toBe<WrappedReq | EvaluationServices | ObligationReq>();
});

test("onObligations' parameter is the ObligationDischarge, not the bare obligation array", () => {
  expect<Parameters<ObligationHandler>[0]>().type.toBe<ObligationDischarge>();
  expect<ObligationDischarge["question"]>().type.toBe<Question>();
  expect<ObligationDischarge["decision"]>().type.toBe<Allow>();

  // The pre-ObligationDischarge shape, a bare array of obligations, no longer fits.
  expect<
    (obligations: ReadonlyArray<Obligation>) => Effect.Effect<void>
  >().type.not.toBeAssignableTo<ObligationHandler>();
});

test("guard infers Authorized<P> from the literal permission argument, not a widened Permission", () => {
  // `route` is a function value, not an `Effect` — computing its parameter
  // types below never constructs or calls it, so nothing here is a floating
  // effect for `@effect/language-service`'s diagnostics to flag.
  const route = guard(read, hasPermission(read));
  type Handler = Parameters<typeof route>[1];
  type Witness = Parameters<Handler>[0];

  // If `guard`'s `P` were widened to the base `Permission` type instead of
  // inferred as the literal `typeof read`, `Witness` would be `Authorized`'s
  // shape for *any* permission and would accept `write`'s witness too —
  // exactly the loss of per-permission distinctness the first test in this
  // file pins for `Authorized<P>` on its own, now pinned through `guard`'s
  // actual inference too.
  expect<Witness>().type.toBe<Authorized<typeof read>>();
  expect<Authorized<typeof write>>().type.not.toBeAssignableTo<Witness>();
});

declare const loadedOptions: LoadedEnforceOptions<ObligationError, ObligationReq>;
declare const loaded: Effect.Effect<{ readonly id: string }, WrappedError, WrappedReq>;

test("the loaded entry points refuse a second resource", () => {
  expect(enforceProjectedLoaded).type.not.toBeCallableWith(hasPermission(read), {
    resource: { id: "x" },
  });
  expect(enforceLoaded).type.not.toBeCallableWith(hasPermission(read), { resource: { id: "x" } });
  // D-39-c: the resource-free projected read refuses it too.
  expect(enforceProjected).type.not.toBeCallableWith(hasPermission(read), {
    resource: { id: "x" },
  });
  expect(enforceProjected).type.toBeCallableWith(hasPermission(read), {});
  expect(enforceLoaded).type.toBeCallableWith(hasPermission(read), {});
});

test("enforceProjectedLoaded returns Partial<A> and widens E and R like enforce", () => {
  const projected = loaded.pipe(enforceProjectedLoaded(hasPermission(read), loadedOptions));
  expect<ErrorOf<typeof projected>>().type.toBe<
    WrappedError | EnforcementError | ObligationError
  >();
  expect<RequirementsOf<typeof projected>>().type.toBe<
    WrappedReq | EvaluationServices | ObligationReq
  >();
  const rec = { id: "1", title: "T" };
  expect(Effect.succeed(rec).pipe(enforceProjectedLoaded(hasPermission(read)))).type.toBe<
    Effect.Effect<Partial<typeof rec>, EnforcementError, EvaluationServices>
  >();
});

test("enforceLoaded returns A unchanged", () => {
  const rec = { id: "1", title: "T" };
  expect(Effect.succeed(rec).pipe(enforceLoaded(hasPermission(read)))).type.toBe<
    Effect.Effect<typeof rec, EnforcementError, EvaluationServices>
  >();
});

test("filterProjected and filterStreamProjected return Partial<A>", () => {
  const rec = { id: "1", title: "T" };
  const items = [rec];
  expect(filterProjected(hasPermission(read), items)).type.toBe<
    Effect.Effect<
      ReadonlyArray<Partial<typeof rec>>,
      EvaluationError | UndischargedObligation,
      EvaluationServices
    >
  >();
});

type SecondResource = { readonly resource: Resource };

test("guard refuses a second resource in its options", () => {
  // `guard(...)` returns a function, not an Effect, so this callable form is a real check.
  expect(guard).type.not.toBeCallableWith(read, hasPermission(read), { resource: { id: "x" } });
  expect<Parameters<typeof guard>[2]>().type.not.toBeAssignableFrom<SecondResource>();
  expect(guard).type.toBeCallableWith(read, hasPermission(read));
  expect(guard).type.toBeCallableWith(read, hasPermission(read), {});
});

test("the collection entry points refuse a second resource in their options", () => {
  // `Parameters<…>[2]` rather than `not.toBeCallableWith`: a call that returns an Effect or a
  // Stream is never "callable" to tstyche under `effect(floatingEffect)`, so the callable form
  // would pass vacuously on the base. `{ resource: undefined }` is refused only because
  // `exactOptionalPropertyTypes` is on.
  expect<Parameters<typeof filter>[2]>().type.not.toBeAssignableFrom<SecondResource>();
  expect<Parameters<typeof filter>[2]>().type.not.toBeAssignableFrom<{
    readonly resource: undefined;
  }>();
  expect<Parameters<typeof filterStream>[2]>().type.not.toBeAssignableFrom<SecondResource>();
  expect<Parameters<typeof filterStream>[2]>().type.not.toBeAssignableFrom<{
    readonly resource: undefined;
  }>();
  expect<Parameters<typeof filterProjected>[2]>().type.not.toBeAssignableFrom<SecondResource>();
  expect<Parameters<typeof filterProjected>[2]>().type.not.toBeAssignableFrom<{
    readonly resource: undefined;
  }>();
  expect<Parameters<typeof filterStreamProjected>[2]>().type.not.toBeAssignableFrom<SecondResource>();
  expect<Parameters<typeof filterStreamProjected>[2]>().type.not.toBeAssignableFrom<{
    readonly resource: undefined;
  }>();

  // Controls: a refusal of every options value would pass the lines above too.
  expect<Parameters<typeof filter>[2]>().type.toBeAssignableFrom<{ readonly concurrency: number }>();
  expect<Parameters<typeof filter>[2]>().type.toBeAssignableFrom<{ readonly action: string }>();
  expect<Parameters<typeof filter>[2]>().type.toBeAssignableFrom<undefined>();
  expect<Parameters<typeof filterStream>[2]>().type.toBeAssignableFrom<{
    readonly concurrency: number;
  }>();
  expect<Parameters<typeof filterStream>[2]>().type.toBeAssignableFrom<{
    readonly action: string;
  }>();
  expect<Parameters<typeof filterStream>[2]>().type.toBeAssignableFrom<undefined>();
});
