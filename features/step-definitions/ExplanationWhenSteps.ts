import { defineSteps } from "@effect-cucumber/vitest";
import { allOf, anyOf, denyWhen, hasPermission, hasRole, obligation, obliged, permission, permitWhen, rules } from "@qadi/core";
import { describePolicy } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";
import { canApproveInvoice } from "./TBACWhenSteps.ts";

export const explanationWhenSteps = defineSteps<World>(({ When }) => {
  /**
   * The publishing policy, described rather than decided.
   *
   * `describe` takes no subject and provides no layer — an explanation that
   * varied by who was looking would be a trace (ADR-QD-027).
   */
  When("the publishing policy is described", function* () {
    yield* describePolicy(
      allOf([
        hasRole("editor"),
        obliged(
          obligation("audit.log"),
          hasPermission(permission("doc", "publish"), { fields: ["id", "title"] }),
        ),
      ]),
    );
  });

  /**
   * The two groupings that used to render identically.
   *
   * Not equivalent: the first admits a lone `admin`, the second requires `onCall`
   * of everyone. Rendered without parentheses both read "either requires role
   * admin or requires role editor and requires role onCall" — one sentence for two
   * policies, which is what INV-QD-031 forbids.
   */
  When("the {string} policy is described", function* (name: string) {
    yield* describePolicy(
      name === "admin-or-both"
        ? anyOf([hasRole("admin"), allOf([hasRole("editor"), hasRole("onCall")])])
        : allOf([anyOf([hasRole("admin"), hasRole("editor")]), hasRole("onCall")]),
    );
  });

  When("an empty conjunction is described", function* () {
    yield* describePolicy(allOf([]));
  });

  When("an empty disjunction is described", function* () {
    yield* describePolicy(anyOf([]));
  });

  When("the invoice approval policy is described", function* () {
    yield* describePolicy(canApproveInvoice());
  });

  When("the rule table is described", function* () {
    yield* describePolicy(
      rules([denyWhen(hasRole("suspended")), permitWhen(hasRole("editor"))], {
        combining: "DenyOverrides",
      }),
    );
  });
});
