import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import { allOf, hasPermission, hasRole, not, obligation, obliged, permission } from "@qadi/core";
import { run, runGuarded } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

const logAccess = obligation("log-access", { channel: "audit" });
const notifyDpo = obligation("notify-dpo");

/** "auditor may act, provided the access is logged" — the archetypal duty. */
const auditedRole = (): Policy => obliged(logAccess, hasRole("auditor"));

export const obligationWhenSteps = defineSteps<World>(({ When }) => {
  When("they must hold role {string} and log the access", function* (name: string) {
    yield* run(obliged(logAccess, hasRole(name)));
  });

  When(
    "they must not hold role {string}, where holding it would log the access",
    function* (name: string) {
      yield* run(not(obliged(logAccess, hasRole(name))));
    },
  );

  When("they must satisfy both audited requirements", function* () {
    yield* run(allOf([auditedRole(), obliged(notifyDpo, hasPermission(permission("doc", "read")))]));
  });

  When("both requirements log the same access", function* () {
    // Identity is the whole obligation, so one duty reached twice is owed once.
    yield* run(
      allOf([auditedRole(), obliged(logAccess, hasPermission(permission("doc", "read")))]),
    );
  });

  When("the guarded work runs under an audited requirement", function* () {
    yield* runGuarded(auditedRole());
  });
});
