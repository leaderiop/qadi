import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import {
  allOf,
  anyOf,
  denyWhen,
  eq,
  gte,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  literal,
  lt,
  obligation,
  obliged,
  permission,
  permitWhen,
  rules,
  subject,
} from "@qadi/core";
import { compile } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

/** "rows of my tenant" — the sentence every multi-tenant application asks. */
export const tenancy = (): Policy => hasResourceAttribute("tenantId", eq(subject("tenantId")));

const logAccess = obligation("log-access", { channel: "audit" });

/**
 * A rule table with a refusal row on top of the tenancy conjunct.
 *
 * The catch-all permit row is load-bearing and easy to forget: no row applying
 * is a denial, so a table of nothing but `Deny` rows never permits anything.
 *
 * Exported: `PredicateThenSteps.ts` needs the same tree to prove
 * INV-QD-018 — that the compiled predicate and the tree evaluator agree on
 * every row.
 */
export const sealedRows = (): Policy =>
  allOf([
    tenancy(),
    rules([denyWhen(hasResourceAttribute("sealed", eq(literal(true)))), permitWhen(allOf([]))], {
      combining: "DenyOverrides",
    }),
  ]);

/**
 * The two range policies the non-finite scenarios compile (CCR-QD-172), by the
 * name a scenario gives them. Exported for `PredicateThenSteps.ts`, which needs
 * the same tree to ask the evaluator.
 */
export const levelPolicy = (name: string): Policy => {
  if (name === "at least 3") return hasResourceAttribute("level", gte(3));
  if (name === "below 3") return hasResourceAttribute("level", lt(3));
  throw new Error(`no level policy named "${name}"`);
};

export const predicateWhenSteps = defineSteps<World>(({ When }) => {
  When("the {string} level policy is compiled to a predicate", function* (name: string) {
    yield* compile(levelPolicy(name));
  });

  When("the tenancy policy is compiled to a predicate", function* () {
    yield* compile(tenancy());
  });

  When("the audited tenancy policy is compiled to a predicate", function* () {
    // The role folds to a constant, so whether it survives says which half of the
    // policy reached the query.
    yield* compile(allOf([hasRole("auditor"), tenancy()]));
  });

  When("the ownership relationship policy is compiled to a predicate", function* () {
    yield* compile(hasRelationship("owner"));
  });

  When("the audited-with-duty policy is compiled to a predicate", function* () {
    yield* compile(obliged(logAccess, hasRole("auditor")));
  });

  When("the field-restricted policy is compiled to a predicate", function* () {
    yield* compile(hasPermission(permission("doc", "read"), { fields: ["id"] }));
  });

  When("the risk policy is compiled to a predicate", function* () {
    yield* compile(hasAttribute("riskScore", lt(50)));
  });

  When("the editor-or-risk policy is compiled to a predicate", function* () {
    // The role alone decides it, so no lookup is owed: `anyOf` stops at its
    // first allowing child, as the evaluator does (INV-QD-005).
    yield* compile(anyOf([hasRole("editor"), hasAttribute("riskScore", lt(50))]));
  });

  When("the sealed-rows rule table is compiled to a predicate", function* () {
    yield* compile(sealedRows());
  });
});
