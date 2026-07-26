import { When } from "@cucumber/cucumber";
import type { Policy } from "@qadi/core";
import {
  allOf,
  anyOf,
  gte,
  hasAction,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  eq,
  literal,
  lt,
  dominates,
  hasActed,
  hasNotActed,
  not,
  obligation,
  obliged,
  permission,
  resource,
  subject,
  subjectId,
} from "@qadi/core";
import { QadiWorld } from "./world.ts";

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

When("they request permission {string}", function (this: QadiWorld, key: string) {
  this.run(permissionPolicy(key));
});

When("they must satisfy all of {string}", function (this: QadiWorld, keys: string) {
  this.run(allOf(permissionList(keys)));
});

When("they must satisfy any of {string}", function (this: QadiWorld, keys: string) {
  this.run(anyOf(permissionList(keys)));
});

When("they must hold role {string}", function (this: QadiWorld, name: string) {
  this.run(hasRole(name));
});

When("they must not hold role {string}", function (this: QadiWorld, name: string) {
  this.run(not(hasRole(name)));
});

When(
  "they must have attribute {string} of at least {int}",
  function (this: QadiWorld, key: string, threshold: number) {
    this.run(hasAttribute(key, gte(threshold)));
  },
);

When(
  "the resource attribute {string} must equal {string}",
  function (this: QadiWorld, key: string, value: string) {
    this.run(hasResourceAttribute(key, eq(literal(value))));
  },
);

When("they must be {string} of the resource", function (this: QadiWorld, relation: string) {
  this.run(hasRelationship(relation));
});

When("they must be performing {string}", function (this: QadiWorld, verb: string) {
  this.run(hasAction(verb));
});

/**
 * Bell-LaPadula's two rules as one stored policy: read what is below you, write
 * only at or above you. Inexpressible until the action became an input, because
 * both arms have to sit in the same tree and disagree about the verb.
 */
When("read-down and write-up are enforced", function (this: QadiWorld) {
  this.run(
    anyOf([
      allOf([hasAction("read"), hasResourceAttribute("level", lt(3))]),
      allOf([hasAction("write"), hasResourceAttribute("level", gte(3))]),
    ]),
  );
});

/** "the resource's owner is me" — the archetypal relational rule. */
const ownership = (): Policy => hasResourceAttribute("owner", eq(subjectId()));

When("the resource must be owned by the subject", function (this: QadiWorld) {
  this.run(ownership());
});

When("the ownership policy is round-tripped and evaluated", function (this: QadiWorld) {
  this.roundTrip(ownership());
  if (this.restored === undefined) throw new Error("round trip produced nothing");
  this.run(this.restored);
});

When(
  "a policy exposing fields {string} for {string} and {string} for {string} is evaluated with union visibility",
  function (
    this: QadiWorld,
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
    this: QadiWorld,
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

// ---------------------------------------------------------------------------
// Obligations
// ---------------------------------------------------------------------------

const logAccess = obligation("log-access", { channel: "audit" });
const notifyDpo = obligation("notify-dpo");

/** "auditor may act, provided the access is logged" — the archetypal duty. */
const auditedRole = (): Policy => obliged(logAccess, hasRole("auditor"));

When("they must hold role {string} and log the access", function (
  this: QadiWorld,
  name: string,
) {
  this.run(obliged(logAccess, hasRole(name)));
});

When(
  "they must not hold role {string}, where holding it would log the access",
  function (this: QadiWorld, name: string) {
    this.run(not(obliged(logAccess, hasRole(name))));
  },
);

When("they must satisfy both audited requirements", function (this: QadiWorld) {
  this.run(
    allOf([
      auditedRole(),
      obliged(notifyDpo, hasPermission(permission("doc", "read"))),
    ]),
  );
});

When("both requirements log the same access", function (this: QadiWorld) {
  // Identity is the whole obligation, so one duty reached twice is owed once.
  this.run(
    allOf([
      auditedRole(),
      obliged(logAccess, hasPermission(permission("doc", "read"))),
    ]),
  );
});

When("the guarded work runs under an audited requirement", function (this: QadiWorld) {
  this.runGuarded(auditedRole());
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

When("they must not have raised the resource", function (this: QadiWorld) {
  this.run(hasNotActed("raised"));
});

When("they must have raised the resource", function (this: QadiWorld) {
  this.run(hasActed("raised"));
});

/**
 * The distinction ADR-QD-020 exists to hold: `not(hasActed(e))` is not
 * `hasNotActed(e)`. Under an unwired port the first ALLOWS and the second denies.
 */
When("the negation of having raised the resource is evaluated", function (this: QadiWorld) {
  this.run(not(hasActed("raised")));
});

// ---------------------------------------------------------------------------
// Label dominance
// ---------------------------------------------------------------------------

/**
 * Bell-LaPadula: no read up, no write down. Both rules are one comparison with
 * the operands exchanged, which is why a boolean matcher is safe here — the
 * question is never asked by negating the answer.
 */
When("Bell-LaPadula is enforced", function (this: QadiWorld) {
  this.run(
    anyOf([
      allOf([hasAction("read"), hasAttribute("clearance", dominates(resource("label")))]),
      allOf([
        hasAction("write"),
        hasResourceAttribute("label", dominates(subject("clearance"))),
      ]),
    ]),
  );
});
