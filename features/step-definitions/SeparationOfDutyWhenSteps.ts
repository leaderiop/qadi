import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import { allOf, eq, exists, hasResourceAttribute, hasRole, labeled, not, subjectId } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

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

const fourEyes = (): Policy => allOf([sodRole, sodStatic, labeled("sod.object", notSelfRaised)]);

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
    labeled("sod.object", allOf([hasResourceAttribute("raisedBy", exists()), notSelfRaised])),
  ]);

export const separationOfDutyWhenSteps = defineSteps<World>(({ When }) => {
  When("the four-eyes approval policy is evaluated", function* () {
    yield* run(fourEyes());
  });

  When("the four-eyes approval policy requiring a recorded raiser is evaluated", function* () {
    yield* run(fourEyesWithRecordedRaiser());
  });
});
