import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import {
  allOf,
  eq,
  exists,
  hasNotActed,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  labeled,
  literal,
  not,
  subjectId,
} from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

/**
 * A workflow-step authorisation, complete.
 *
 * Cheapest first (INV-QD-005): `hasRole` is a set lookup, `state` and `raisedBy`
 * are fields on the resource in hand, `assigned-task` costs a resolver call, and
 * `task.once` costs a port call. MOD-QD-033's own example put the resolver ahead
 * of two free comparisons.
 *
 * Exported: `ExplanationWhenSteps.ts` describes this same policy rather than
 * evaluating it, and reuses this builder to keep the two in lockstep.
 */
export const canApproveInvoice = (): Policy =>
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

export const tbacWhenSteps = defineSteps<World>(({ When }) => {
  When("the invoice approval policy is evaluated", function* () {
    yield* run(canApproveInvoice());
  });
});
