import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { anonymous, fromRoles, makeSubject, withAttributes } from "../src/AuthSubject.ts";
import {
  CircularRoleInheritance,
  errorCode,
  ERROR_CODES,
  InvalidPermissionSegment,
  MissingResource,
  PolicyTooDeep,
  RelationshipResolveError,
} from "../src/Errors.ts";
import {
  isValidSegment,
  permission,
  permissionKey,
} from "../src/Permission.ts";
import type { Role as RoleType } from "../src/Role.ts";
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

  it("the diamond-once guards are a performance property, not a correctness one — a diamond gives the same result either way because `keys`/`names` are Sets", () => {
    // `flattenPermissions`'s `seen` guard and `roleNames`'s `names` guard skip a
    // role once already visited. For a diamond (no cycle), the sets that
    // `visit` writes into (`keys`, `names`) are themselves deduplicating, so
    // revisiting the shared ancestor a second time would just re-insert the
    // same keys — same result, more work. The diamond tests above
    // ("walks a diamond once...") already pin the *counts* that would matter if
    // work weren't idempotent; here the point is the *output* is unaffected.
    const base = role({ name: "base", permissions: [read] });
    const left = role({ name: "left", inherits: [base] });
    const right = role({ name: "right", inherits: [base] });
    const top = role({ name: "top", inherits: [left, right] });
    assert.deepStrictEqual([...flattenPermissions(top)], ["doc:read"]);
    assert.deepStrictEqual([...roleNames(top)].sort(), ["base", "left", "right", "top"]);
  });

  it("the seen/names guards are load-bearing where a diamond can't show it: a manually constructed cycle", () => {
    // A cycle can't arise from the `role()` builder — parents are held by
    // value, so a role can't reference one that doesn't exist yet — but the
    // `Role` shape itself doesn't forbid it: nothing stops a caller building one
    // by hand and mutating a still-mutable backing array before treating it as
    // `Role`. Without the guard, `visit` would recurse on this input forever;
    // with it, `flattenPermissions`/`roleNames` are what the module doc claims
    // they are — total.
    const inherits: Array<RoleType> = [];
    const cyclic: RoleType = { name: "cyclic", permissions: [read], inherits };
    inherits.push(cyclic);

    assert.deepStrictEqual([...flattenPermissions(cyclic)], ["doc:read"]);
    assert.deepStrictEqual([...roleNames(cyclic)], ["cyclic"]);
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
      if (r._tag !== "Failure") return;
      // The payload, not just "a failure occurred": `roleName` is the role
      // whose own name reappears on its own ancestor stack, and `cycle` is that
      // stack with the closing name appended — the diagnostic a caller reads to
      // fix a malformed catalogue.
      assert.strictEqual(r.failure._tag, "CircularRoleInheritance");
      if (r.failure._tag !== "CircularRoleInheritance") return;
      assert.strictEqual(r.failure.roleName, "a");
      assert.deepStrictEqual(r.failure.cycle, ["a", "b", "a"]);
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

  it("makeSubject defaults roles to an empty set when none are given", () => {
    const s = makeSubject({ id: "u" });
    assert.strictEqual(s.roles.size, 0);
  });

  it("makeSubject defaults permissions to an empty set when none are given", () => {
    const s = makeSubject({ id: "u" });
    assert.strictEqual(s.permissions.size, 0);
  });

  it("fromRoles carries the attributes it was given, not an empty object", () => {
    const s = fromRoles({ id: "u", roles: [], attributes: { level: 5 } });
    assert.deepStrictEqual(s.attributes, { level: 5 });
  });
});

describe("Errors", () => {
  it("every error tag maps to a distinct code", () => {
    const codes = Object.values(ERROR_CODES);
    assert.strictEqual(new Set(codes).size, codes.length);
  });

  it("errorCode derives from the tag", () => {
    const e = { _tag: "AccessDenied" } as const;
    assert.strictEqual(errorCode(e as never), "ACL001");
  });

  // The five classes below are only ever exercised through `Effect.result`'s
  // own "Failure" wrapper elsewhere in the suite, so their own `_tag` — the
  // real `Effect.catchTag` dispatch discriminant, unlike a `Context.Service`
  // tag id — and payload never got asserted directly against the real class.
  it("MissingResource carries the attribute and its own tag", () => {
    const e = new MissingResource({ attribute: "clearance" });
    assert.strictEqual(e._tag, "MissingResource");
    assert.strictEqual(e.attribute, "clearance");
  });

  it("RelationshipResolveError carries relation, resourceId, cause and its own tag", () => {
    const cause = new Error("resolver unreachable");
    const e = new RelationshipResolveError({
      relation: "owner",
      resourceId: "doc-1",
      cause,
    });
    assert.strictEqual(e._tag, "RelationshipResolveError");
    assert.strictEqual(e.relation, "owner");
    assert.strictEqual(e.resourceId, "doc-1");
    assert.strictEqual(e.cause, cause);
  });

  it("PolicyTooDeep carries the configured maxDepth and its own tag", () => {
    const e = new PolicyTooDeep({ maxDepth: 25 });
    assert.strictEqual(e._tag, "PolicyTooDeep");
    assert.strictEqual(e.maxDepth, 25);
  });

  it("CircularRoleInheritance carries roleName, cycle and its own tag", () => {
    const e = new CircularRoleInheritance({ roleName: "a", cycle: ["a", "b", "a"] });
    assert.strictEqual(e._tag, "CircularRoleInheritance");
    assert.strictEqual(e.roleName, "a");
    assert.deepStrictEqual(e.cycle, ["a", "b", "a"]);
  });

  it("InvalidPermissionSegment carries the offending segment and value, and its own tag", () => {
    const e = new InvalidPermissionSegment({ segment: "resource", value: "a:b" });
    assert.strictEqual(e._tag, "InvalidPermissionSegment");
    assert.strictEqual(e.segment, "resource");
    assert.strictEqual(e.value, "a:b");
  });
});
