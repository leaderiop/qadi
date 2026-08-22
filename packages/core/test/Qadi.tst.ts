/**
 * Pins `Authorized<P>`'s per-permission distinctness: `permission` is a real
 * field on the branded value, not a phantom, so a witness produced for one
 * permission must not satisfy a position typed for a different permission's
 * witness. Previously checked only via a `@ts-expect-error` comment inside
 * `Qadi.test.ts`, itself inside an `it()` that never runs — a real assertion
 * now, not a comment a future edit could delete without anything noticing.
 */
import { expect, test } from "tstyche";
import type { Authorized } from "../src/Authorized.ts";
import { permission } from "../src/Permission.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");

test("a witness for one permission is not assignable where a different permission's is required", () => {
  expect<Authorized<typeof read>>().type.not.toBeAssignableTo<Authorized<typeof write>>();
  expect<Authorized<typeof write>>().type.not.toBeAssignableTo<Authorized<typeof read>>();
  expect<Authorized<typeof read>>().type.toBeAssignableTo<Authorized<typeof read>>();
});
