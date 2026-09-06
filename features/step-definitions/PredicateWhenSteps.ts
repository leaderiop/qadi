import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import {
  allOf,
  denyWhen,
  eq,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  literal,
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

export const predicateWhenSteps = defineSteps<World>(({ When }) => {
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

  When("the sealed-rows rule table is compiled to a predicate", function* () {
    yield* compile(sealedRows());
  });
});
