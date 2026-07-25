import { When } from "@cucumber/cucumber";
import type { Policy } from "@guard/core";
import {
  allOf,
  anyOf,
  gte,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  eq,
  literal,
  not,
  permission,
  subjectId,
} from "@guard/core";
import { GuardWorld } from "./world.ts";

/** Parses a `"resource:action"` key into a permission policy. */
const permissionPolicy = (key: string): Policy => {
  const [resource, action] = key.split(":");
  if (resource === undefined || action === undefined) {
    throw new Error(`malformed permission key: ${key}`);
  }
  return hasPermission(permission(resource, action));
};

const permissionList = (keys: string): ReadonlyArray<Policy> =>
  keys.split(",").map((k) => permissionPolicy(k.trim()));

When("they request permission {string}", function (this: GuardWorld, key: string) {
  this.run(permissionPolicy(key));
});

When("they must satisfy all of {string}", function (this: GuardWorld, keys: string) {
  this.run(allOf(permissionList(keys)));
});

When("they must satisfy any of {string}", function (this: GuardWorld, keys: string) {
  this.run(anyOf(permissionList(keys)));
});

When("they must hold role {string}", function (this: GuardWorld, name: string) {
  this.run(hasRole(name));
});

When("they must not hold role {string}", function (this: GuardWorld, name: string) {
  this.run(not(hasRole(name)));
});

When(
  "they must have attribute {string} of at least {int}",
  function (this: GuardWorld, key: string, threshold: number) {
    this.run(hasAttribute(key, gte(threshold)));
  },
);

When(
  "the resource attribute {string} must equal {string}",
  function (this: GuardWorld, key: string, value: string) {
    this.run(hasResourceAttribute(key, eq(literal(value))));
  },
);

When("they must be {string} of the resource", function (this: GuardWorld, relation: string) {
  this.run(hasRelationship(relation));
});

/** "the resource's owner is me" — the archetypal relational rule. */
const ownership = (): Policy => hasResourceAttribute("owner", eq(subjectId()));

When("the resource must be owned by the subject", function (this: GuardWorld) {
  this.run(ownership());
});

When("the ownership policy is round-tripped and evaluated", function (this: GuardWorld) {
  this.roundTrip(ownership());
  if (this.restored === undefined) throw new Error("round trip produced nothing");
  this.run(this.restored);
});

When(
  "a policy exposing fields {string} for {string} and {string} for {string} is evaluated with union visibility",
  function (
    this: GuardWorld,
    fieldsA: string,
    keyA: string,
    fieldsB: string,
    keyB: string,
  ) {
    const [ra, aa] = keyA.split(":");
    const [rb, ab] = keyB.split(":");
    if (ra === undefined || aa === undefined || rb === undefined || ab === undefined) {
      throw new Error("malformed permission key");
    }
    this.run(
      anyOf(
        [
          hasPermission(permission(ra, aa), { fields: fieldsA.split(",") }),
          hasPermission(permission(rb, ab), { fields: fieldsB.split(",") }),
        ],
        { fieldStrategy: "Union" },
      ),
    );
  },
);

When(
  "a policy exposing fields {string} for {string} and {string} for {string} is round-tripped and evaluated with union visibility",
  function (
    this: GuardWorld,
    fieldsA: string,
    keyA: string,
    fieldsB: string,
    keyB: string,
  ) {
    const [ra, aa] = keyA.split(":");
    const [rb, ab] = keyB.split(":");
    if (ra === undefined || aa === undefined || rb === undefined || ab === undefined) {
      throw new Error("malformed permission key");
    }
    const policy = anyOf(
      [
        hasPermission(permission(ra, aa), { fields: fieldsA.split(",") }),
        hasPermission(permission(rb, ab), { fields: fieldsB.split(",") }),
      ],
      { fieldStrategy: "Union" },
    );
    this.roundTrip(policy);
    if (this.restored === undefined) throw new Error("round trip produced nothing");
    this.run(this.restored);
  },
);
