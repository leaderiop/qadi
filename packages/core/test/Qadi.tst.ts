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
 * `ClientError` union, and `guardRoute`'s `CurrentSubject` discharge — but
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
import type { EvaluationServices } from "../src/Evaluate.ts";
import { permission } from "../src/Permission.ts";
import { hasPermission } from "../src/Policy.ts";
import type { EnforceOptions, EnforcementError } from "../src/Qadi.ts";
import { enforce, guard } from "../src/Qadi.ts";

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
