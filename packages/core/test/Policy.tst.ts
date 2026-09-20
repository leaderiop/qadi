/**
 * Type-level tests for the recursive `Policy`/`PolicyEncoded` pair — this
 * workspace's only hand-written recursive types and only `Schema.suspend`
 * loop (ADR-QD-002).
 *
 * TC-06 (100-lens audit): `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md`'s
 * table of permanent `.tst.ts` files pinned `Authorized<P>`'s distinctness,
 * `guardRoute`'s `CurrentSubject` discharge, and `RequirePermission`'s
 * genericity — four assertions, all valuable, none touching the recursive
 * types where this repo's trickiest assignability questions live. The pair's
 * guarantees are covered at runtime (a roundtrip property test, decode
 * gates) and at the compile time of `Policy.ts` itself; nothing pinned that a
 * well-formed policy tree stays assignable to the schema's own `Type`/
 * `Encoded` in both directions — the failure mode `Qadi.tst.ts`'s own header
 * names: an un-formalized type guarantee a future edit, or a TypeScript
 * upgrade changing recursive-union assignability, could break without
 * anything noticing.
 */
import { expect, test } from "tstyche";
import type { Policy as PolicyTree, PolicyEncoded } from "../src/Policy.ts";
import { allOf, anyOf, hasPermission, hasRole, Policy } from "../src/Policy.ts";
import { permission } from "../src/Permission.ts";

// Three levels deep — `AllOf` over a leaf and an `AnyOf` of two more leaves —
// deliberately nesting a second combinator rather than stopping at one level:
// a `Schema.suspend` loop that only unrolls once would first stop narrowing
// exactly one level past where a naive single-level fixture would still pass.
const threeLevelsDeep = allOf([
  hasRole("admin"),
  anyOf([
    hasPermission(permission("doc", "read")),
    hasPermission(permission("doc", "write")),
  ]),
]);

test("a well-formed, three-level-deep composite policy assigns to the schema's own Type in both directions", () => {
  expect(threeLevelsDeep).type.toBeAssignableTo<typeof Policy.Type>();
  expect<typeof Policy.Type>().type.toBeAssignableTo<PolicyTree>();
  expect<PolicyTree>().type.toBeAssignableTo<typeof Policy.Type>();
});

test("the schema's own Encoded type agrees with the hand-written PolicyEncoded union in both directions", () => {
  expect<typeof Policy.Encoded>().type.toBeAssignableTo<PolicyEncoded>();
  expect<PolicyEncoded>().type.toBeAssignableTo<typeof Policy.Encoded>();
});
