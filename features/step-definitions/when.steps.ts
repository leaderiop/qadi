import { DataTable, When } from "@cucumber/cucumber";
import type { Combining, Policy, Rule } from "@qadi/core";
import {
  allOf,
  anyOf,
  denyWhen,
  permitWhen,
  rules,
  gte,
  hasAction,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  eq,
  exists,
  labeled,
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
// Separation of duty
// ---------------------------------------------------------------------------

/**
 * Four-eyes approval, every branch labelled.
 *
 * Three constraints in one tree and only the trace can say which refused, so
 * each conjunct is named. `hasRole` goes first: it is a set lookup on the
 * subject in hand and costs no resolution (INV-QD-005).
 */
const sodRole = labeled("sod.role", hasRole("approve-payment"));

/** Detection, not prevention: Qadi never sees the assignment (MOD-QD-024). */
const sodStatic = labeled(
  "sod.static",
  not(allOf([hasRole("raise-payment"), hasRole("approve-payment")])),
);

const notSelfRaised = not(hasResourceAttribute("raisedBy", eq(subjectId())));

const fourEyes = (): Policy =>
  allOf([sodRole, sodStatic, labeled("sod.object", notSelfRaised)]);

/**
 * The same rule with the hazard closed.
 *
 * `exists` is not decoration. An absent `raisedBy` makes the comparison false,
 * so the negation alone **allows** — it grants the self-approval the rule exists
 * to stop, on precisely the row a data migration leaves behind.
 */
const fourEyesWithRecordedRaiser = (): Policy =>
  allOf([
    sodRole,
    sodStatic,
    labeled(
      "sod.object",
      allOf([hasResourceAttribute("raisedBy", exists()), notSelfRaised]),
    ),
  ]);

When("the four-eyes approval policy is evaluated", function (this: QadiWorld) {
  this.run(fourEyes());
});

When(
  "the four-eyes approval policy requiring a recorded raiser is evaluated",
  function (this: QadiWorld) {
    this.run(fourEyesWithRecordedRaiser());
  },
);

// ---------------------------------------------------------------------------
// Chinese Wall
// ---------------------------------------------------------------------------

/**
 * Brewer–Nash as two questions the one-member port already answers.
 *
 * The conflict class names the *event* and the company in hand is the
 * *resource*, so there is one policy per class — which is what MOD-QD-030
 * forecast when it said the attribute path cannot be derived from the resource.
 */
const withinWall = (conflictClass: string): Policy =>
  anyOf([
    // Exempt material first: a field on the resource in hand, so an exempt read
    // costs no history lookup at all (INV-QD-005).
    labeled("wall.sanitised", hasResourceAttribute("sanitised", eq(literal(true)))),
    labeled("wall.first", hasNotActed(conflictClass, { scope: "Any" })),
    labeled("wall.same", hasActed(conflictClass, { scope: "Resource" })),
  ]);

const oilWall = (): Policy =>
  allOf([labeled("wall.analyst", hasRole("analyst")), withinWall("oil")]);

When("the conflict-of-interest wall is enforced", function (this: QadiWorld) {
  this.run(oilWall());
});

// ---------------------------------------------------------------------------
// Task-based access control
// ---------------------------------------------------------------------------

/**
 * A workflow-step authorisation, complete.
 *
 * Cheapest first (INV-QD-005): `hasRole` is a set lookup, `state` and `raisedBy`
 * are fields on the resource in hand, `assigned-task` costs a resolver call, and
 * `task.once` costs a port call. MOD-QD-033's own example put the resolver ahead
 * of two free comparisons.
 */
const canApproveInvoice = (): Policy =>
  allOf([
    labeled("task.role", hasRole("approver")),
    labeled("task.open", hasResourceAttribute("state", eq(literal("awaiting-approval")))),
    labeled(
      "task.not-raiser",
      // `exists` is not decoration: without it an absent `raisedBy` GRANTS the
      // self-approval this branch exists to stop (MOD-QD-024 Rev 1.1).
      allOf([
        hasResourceAttribute("raisedBy", exists()),
        not(hasResourceAttribute("raisedBy", eq(subjectId()))),
      ]),
    ),
    labeled("task.assigned", hasRelationship("assigned-task")),
    // The once-ness, and the whole of the E5 dependency. `scope` defaults to
    // `"Resource"`, which is exactly the keyed question TBAC wanted.
    labeled("task.once", hasNotActed("approved")),
  ]);

When("the invoice approval policy is evaluated", function (this: QadiWorld) {
  this.run(canApproveInvoice());
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

// ---------------------------------------------------------------------------
// Integrity, the other direction
// ---------------------------------------------------------------------------

/**
 * Biba: no read down, no write up. The same two comparisons as Bell-LaPadula
 * above with the operands exchanged, which is the entire content of "integrity
 * dual" — one lattice, one matcher, two readings of it.
 *
 * `labeled` where Bell-LaPadula's step has none, so a refusal can be attributed
 * to the arm that produced it.
 */
const biba = (): Policy =>
  anyOf([
    allOf([
      hasAction("read"),
      // The object must dominate the subject: read only at or above your level.
      labeled("no-read-down", hasResourceAttribute("label", dominates(subject("integrity")))),
    ]),
    allOf([
      hasAction("write"),
      // The subject must dominate the object: write only at or below your level.
      labeled("no-write-up", hasAttribute("integrity", dominates(resource("label")))),
    ]),
  ]);

When("Biba is enforced", function (this: QadiWorld) {
  this.run(biba());
});

/**
 * A ring policy: reads down are permitted, writes up are still refused.
 *
 * The relaxation everyone actually deploys, and the reason strict Biba is rarely
 * asked for by name — reading downwards is what software does all day. Dropping
 * the read arm's comparison is the whole of it, so the bare `hasAction("read")`
 * is the policy, not a placeholder.
 */
When("the ring policy is enforced", function (this: QadiWorld) {
  this.run(
    anyOf([
      hasAction("read"),
      allOf([
        hasAction("write"),
        labeled("ring.no-write-up", hasAttribute("integrity", dominates(resource("label")))),
      ]),
    ]),
  );
});

/**
 * Low-water-mark Biba: the same no-write-up rule against the subject's *effective*
 * level rather than its assigned one.
 *
 * `effectiveIntegrity`, not `integrity`, and that is the design. The mark is an
 * aggregate — the minimum over everything read — so it is the caller's to compute
 * and Qadi's to resolve. MOD-QD-028 forecast this needed E5; the history port
 * answers membership questions about one event and returns no value, so it cannot
 * supply a minimum.
 */
When("the low-water-mark policy is enforced", function (this: QadiWorld) {
  this.run(
    allOf([
      hasAction("write"),
      labeled(
        "lwm.no-write-up",
        hasAttribute("effectiveIntegrity", dominates(resource("label"))),
      ),
    ]),
  );
});

// ---------------------------------------------------------------------------
// Predicate output
// ---------------------------------------------------------------------------

/** "rows of my tenant" — the sentence every multi-tenant application asks. */
export const tenancy = (): Policy =>
  hasResourceAttribute("tenantId", eq(subject("tenantId")));

/**
 * A rule table with a refusal row on top of the tenancy conjunct.
 *
 * The catch-all permit row is load-bearing and easy to forget: no row applying
 * is a denial, so a table of nothing but `Deny` rows never permits anything.
 * Written without it, this fixture refused every row — and the predicate agreed
 * with the evaluator that it did, which is the property working.
 */
export const sealedRows = (): Policy =>
  allOf([
    tenancy(),
    rules(
      [denyWhen(hasResourceAttribute("sealed", eq(literal(true)))), permitWhen(allOf([]))],
      { combining: "DenyOverrides" },
    ),
  ]);

When("the tenancy policy is compiled to a predicate", function (this: QadiWorld) {
  this.compile(tenancy());
});

When("the audited tenancy policy is compiled to a predicate", function (this: QadiWorld) {
  // The role folds to a constant, so whether it survives says which half of the
  // policy reached the query.
  this.compile(allOf([hasRole("auditor"), tenancy()]));
});

When(
  "the ownership relationship policy is compiled to a predicate",
  function (this: QadiWorld) {
    this.compile(hasRelationship("owner"));
  },
);

When("the audited-with-duty policy is compiled to a predicate", function (this: QadiWorld) {
  this.compile(obliged(logAccess, hasRole("auditor")));
});

When("the field-restricted policy is compiled to a predicate", function (this: QadiWorld) {
  this.compile(hasPermission(permission("doc", "read"), { fields: ["id"] }));
});

When("the sealed-rows rule table is compiled to a predicate", function (this: QadiWorld) {
  this.compile(sealedRows());
});

// ---------------------------------------------------------------------------
// Rule tables
// ---------------------------------------------------------------------------

/**
 * The condition mini-language the feature file writes in.
 *
 * Deliberately small. A rule table is *data* an operator maintains, so the
 * scenarios read as rows rather than as a tree, and the condition column has to
 * stay short enough to be read at a glance.
 */
const condition = (text: string): Policy => {
  const [head, ...rest] = text.trim().split(/\s+/);
  switch (head) {
    case "role":
      return hasRole(rest.join(" "));
    case "owner":
      return ownership();
    // `allOf([])` allows vacuously, which is the catch-all row. There is no
    // `always()` variant, and the awkwardness falls on the widening side.
    case "always":
      return allOf([]);
    default:
      throw new Error(`unknown rule condition: ${text}`);
  }
};

const table = (data: DataTable): ReadonlyArray<Rule> =>
  data.hashes().map((row) => {
    const text = row["condition"];
    if (text === undefined) throw new Error("a rule row needs a condition");
    return row["effect"] === "deny"
      ? denyWhen(condition(text))
      : permitWhen(condition(text));
  });

const COMBINING: Readonly<Record<string, Combining>> = {
  FirstApplicable: "FirstApplicable",
  DenyOverrides: "DenyOverrides",
  PermitOverrides: "PermitOverrides",
};

const combiningNamed = (name: string): Combining => {
  const found = COMBINING[name];
  if (found === undefined) throw new Error(`unknown combining algorithm: ${name}`);
  return found;
};

When("the rule table is evaluated", function (this: QadiWorld, data: DataTable) {
  this.run(rules(table(data)));
});

When(
  "the rule table is evaluated with {string}",
  function (this: QadiWorld, combining: string, data: DataTable) {
    this.run(rules(table(data), { combining: combiningNamed(combining) }));
  },
);

When("the empty rule table is evaluated", function (this: QadiWorld) {
  // `allOf([])` allows vacuously; a table emptied by an administrator must not.
  this.run(rules([]));
});

// ---------------------------------------------------------------------------
// Subject sets
// ---------------------------------------------------------------------------

When("it is asked who holds role {string}", function (this: QadiWorld, name: string) {
  this.runSubjectSet(hasRole(name));
});

When("the review asks who holds role {string}", function (this: QadiWorld, name: string) {
  this.runSubjectSet(hasRole(name));
});

When("it is asked who owns the resource", function (this: QadiWorld) {
  this.runSubjectSet(hasResourceAttribute("owner", eq(subjectId())));
});

/**
 * Reporting, not enforcing. `filter` would refuse an allow nobody discharged;
 * this hands back identities to an administrator, so no permission is being
 * exercised and there is no duty to condition (ADR-QD-022).
 */
When(
  "it is asked who holds role {string}, where holding it would log the access",
  function (this: QadiWorld, name: string) {
    this.runSubjectSet(obliged(logAccess, hasRole(name)));
  },
);
