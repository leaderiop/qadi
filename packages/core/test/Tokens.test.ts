import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { anonymous, fromRoles, makeSubject, withAttributes } from "../src/AuthSubject.ts";
import { errorCode, ERROR_CODES } from "../src/Errors.ts";
import {
  isValidSegment,
  permission,
  permissionKey,
} from "../src/Permission.ts";
import { flattenAll, flattenPermissions, resolveRoleGraph, role, roleNames } from "../src/Role.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");
const del = permission("doc", "delete");

describe("Permission", () => {
  it("formats the runtime lookup key", () => {
    assert.strictEqual(permissionKey(read), "doc:read");
  });

  it("rejects segments that would make a key ambiguous", () => {
    assert.isTrue(isValidSegment("doc"));
    assert.isFalse(isValidSegment("a:b"));
    assert.isFalse(isValidSegment(""));
  });
});

describe("Role", () => {
  const viewer = role({ name: "viewer", permissions: [read] });
  const editor = role({ name: "editor", permissions: [write], inherits: [viewer] });
  const admin = role({ name: "admin", permissions: [del], inherits: [editor] });

  it("flattens permissions through the inheritance chain", () => {
    assert.deepStrictEqual([...flattenPermissions(admin)].sort(), [
      "doc:delete",
      "doc:read",
      "doc:write",
    ]);
  });

  it("collects transitive role names", () => {
    assert.deepStrictEqual([...roleNames(admin)].sort(), ["admin", "editor", "viewer"]);
  });

  it("walks a diamond once rather than exponentially", () => {
    const base = role({ name: "base", permissions: [read] });
    const left = role({ name: "left", inherits: [base] });
    const right = role({ name: "right", inherits: [base] });
    const top = role({ name: "top", inherits: [left, right] });
    assert.deepStrictEqual([...flattenPermissions(top)], ["doc:read"]);
  });

  it("roleNames walks a diamond once", () => {
    const base = role({ name: "base" });
    const left = role({ name: "left", inherits: [base] });
    const right = role({ name: "right", inherits: [base] });
    const top = role({ name: "top", inherits: [left, right] });
    assert.deepStrictEqual([...roleNames(top)].sort(), ["base", "left", "right", "top"]);
  });

  it("flattenAll unions across several roles", () => {
    assert.deepStrictEqual([...flattenAll([viewer, editor])].sort(), [
      "doc:read",
      "doc:write",
    ]);
  });

  it("a role with no permissions or parents yields nothing", () => {
    assert.strictEqual(flattenPermissions(role({ name: "empty" })).size, 0);
  });
});

describe("resolveRoleGraph", () => {
  it.effect("resolves named parents into by-value roles", () =>
    Effect.gen(function* () {
      const roles = yield* resolveRoleGraph([
        { name: "viewer", permissions: [read] },
        { name: "editor", permissions: [write], inherits: ["viewer"] },
      ]);
      const editor = roles.find((r) => r.name === "editor");
      assert.isDefined(editor);
      if (editor === undefined) return;
      assert.deepStrictEqual([...flattenPermissions(editor)].sort(), [
        "doc:read",
        "doc:write",
      ]);
    }));

  it.effect("detects a cycle, which is only representable by name", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        resolveRoleGraph([
          { name: "a", inherits: ["b"] },
          { name: "b", inherits: ["a"] },
        ]),
      );
      assert.strictEqual(r._tag, "Failure");
    }));

  it.effect("resolves a shared ancestor once, via the memo", () =>
    Effect.gen(function* () {
      const roles = yield* resolveRoleGraph([
        { name: "base", permissions: [read] },
        { name: "left", inherits: ["base"] },
        { name: "right", inherits: ["base"] },
        { name: "top", inherits: ["left", "right"] },
      ]);
      const top = roles.find((r) => r.name === "top");
      assert.isDefined(top);
      if (top === undefined) return;
      assert.deepStrictEqual([...flattenPermissions(top)], ["doc:read"]);
      // Both parents must be the same object, proving the memo was hit.
      assert.strictEqual(top.inherits[0]?.inherits[0], top.inherits[1]?.inherits[0]);
    }));

  it.effect("tolerates an unknown parent rather than failing closed", () =>
    Effect.gen(function* () {
      // A partial catalogue is a normal deployment state. Failing here would
      // deny every request instead of merely granting less.
      const roles = yield* resolveRoleGraph([{ name: "a", inherits: ["missing"] }]);
      assert.strictEqual(roles.length, 1);
      assert.strictEqual(roles[0]?.inherits.length, 0);
    }));
});

describe("AuthSubject", () => {
  it("makeSubject stores explicit keys", () => {
    const s = makeSubject({ id: "u", permissions: ["doc:read"], roles: ["r"] });
    assert.isTrue(s.permissions.has("doc:read"));
    assert.isTrue(s.roles.has("r"));
  });

  it("fromRoles flattens both permissions and role names", () => {
    const viewer = role({ name: "viewer", permissions: [read] });
    const editor = role({ name: "editor", permissions: [write], inherits: [viewer] });
    const s = fromRoles({ id: "u", roles: [editor] });
    assert.deepStrictEqual([...s.permissions].sort(), ["doc:read", "doc:write"]);
    assert.deepStrictEqual([...s.roles].sort(), ["editor", "viewer"]);
  });

  it("fromRoles merges directly granted permissions", () => {
    const s = fromRoles({ id: "u", roles: [], permissions: [del] });
    assert.isTrue(s.permissions.has("doc:delete"));
  });

  it("anonymous holds nothing, so every policy denies", () => {
    assert.strictEqual(anonymous.permissions.size, 0);
    assert.strictEqual(anonymous.roles.size, 0);
  });

  it("withAttributes returns a copy rather than mutating", () => {
    const s = makeSubject({ id: "u", attributes: { a: 1 } });
    const t = withAttributes(s, { b: 2 });
    assert.deepStrictEqual(t.attributes, { a: 1, b: 2 });
    assert.deepStrictEqual(s.attributes, { a: 1 });
  });
});

describe("Errors", () => {
  it("every error tag maps to a distinct code", () => {
    const codes = Object.values(ERROR_CODES);
    assert.strictEqual(new Set(codes).size, codes.length);
  });

  it("errorCode derives from the tag", () => {
    const e = { _tag: "qadi/AccessDenied" } as const;
    assert.strictEqual(errorCode(e as never), "ACL001");
  });
});
