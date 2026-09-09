import { defineSteps } from "@effect-cucumber/vitest";
import {
  eq,
  gte,
  hasAttribute,
  hasResourceAttribute,
  hasRole,
  obligation,
  obliged,
  subjectId,
} from "@qadi/core";
import { runSubjectSet } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

const logAccess = obligation("log-access", { channel: "audit" });

export const subjectSetWhenSteps = defineSteps<World>(({ When }) => {
  When("it is asked who holds role {string}", function* (name: string) {
    yield* runSubjectSet(hasRole(name));
  });

  When("the review asks who holds role {string}", function* (name: string) {
    yield* runSubjectSet(hasRole(name));
  });

  When("it is asked who owns the resource", function* () {
    yield* runSubjectSet(hasResourceAttribute("owner", eq(subjectId())));
  });

  When(
    "it is asked who has attribute {string} of at least {int}",
    function* (name: string, value: number) {
      yield* runSubjectSet(hasAttribute(name, gte(value)));
    },
  );

  /**
   * Reporting, not enforcing. `filter` would refuse an allow nobody discharged;
   * this hands back identities to an administrator, so no permission is being
   * exercised and there is no duty to condition (ADR-QD-022).
   */
  When(
    "it is asked who holds role {string}, where holding it would log the access",
    function* (name: string) {
      yield* runSubjectSet(obliged(logAccess, hasRole(name)));
    },
  );
});
