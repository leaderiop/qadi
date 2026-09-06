/**
 * `makeSubject`/`fromRoles`/`withAttributes`'s copy-on-build guarantee.
 *
 * `AuthSubject` documents itself as immutable; this pins the part of that
 * claim that is easy to silently lose — a caller mutating the config object
 * or attributes record they passed in must not be able to reach back into an
 * already-built subject (ticket 179).
 */
import { assert, describe, it } from "@effect/vitest";
import { fromRoles, makeSubject, withAttributes } from "../src/AuthSubject.ts";
import { permission } from "../src/Permission.ts";
import { role } from "../src/Role.ts";

describe("makeSubject", () => {
  it("copies the attributes record rather than storing it by reference", () => {
    const attributes = { department: "cardiology" };
    const subject = makeSubject({ id: "u1", attributes });

    attributes["department"] = "oncology";

    assert.strictEqual(subject.attributes["department"], "cardiology");
  });

  it("copies roles/permissions rather than aliasing whatever iterable was passed", () => {
    const roles = new Set(["editor"]);
    const permissions = new Set<`${string}:${string}`>(["doc:read"]);
    const subject = makeSubject({ id: "u1", roles, permissions });

    roles.add("admin");
    permissions.add("doc:write");

    assert.strictEqual(subject.roles.size, 1);
    assert.strictEqual(subject.permissions.size, 1);
  });
});

describe("fromRoles", () => {
  it("copies the attributes record rather than storing it by reference", () => {
    const attributes = { department: "cardiology" };
    const editor = role({ name: "editor", permissions: [permission("doc", "read")] });
    const subject = fromRoles({ id: "u1", roles: [editor], attributes });

    attributes["department"] = "oncology";

    assert.strictEqual(subject.attributes["department"], "cardiology");
  });
});

describe("withAttributes", () => {
  it("copies the attributes argument rather than storing it by reference", () => {
    const base = makeSubject({ id: "u1", attributes: { department: "cardiology" } });
    const extra = { clearance: 3 };

    const updated = withAttributes(base, extra);
    extra["clearance"] = 99;

    assert.strictEqual(updated.attributes["clearance"], 3);
  });
});
