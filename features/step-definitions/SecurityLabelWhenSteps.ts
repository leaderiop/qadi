import { defineSteps } from "@effect-cucumber/vitest";
import { allOf, anyOf, dominates, hasAction, hasAttribute, hasResourceAttribute, labeled, resource, subject } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

export const securityLabelWhenSteps = defineSteps<World>(({ When }) => {
  /**
   * Bell-LaPadula: no read up, no write down. Both rules are one comparison with
   * the operands exchanged, which is why a boolean matcher is safe here — the
   * question is never asked by negating the answer.
   */
  When("Bell-LaPadula is enforced", function* () {
    yield* run(
      anyOf([
        allOf([hasAction("read"), hasAttribute("clearance", dominates(resource("label")))]),
        allOf([hasAction("write"), hasResourceAttribute("label", dominates(subject("clearance")))]),
      ]),
    );
  });

  /**
   * The flow rule, stated as Denning stated it: information may flow from `A` to
   * `B` only when `B` dominates `A`. No read, no write, no verb.
   */
  When("information flows to the resource", function* () {
    yield* run(labeled("flow", hasResourceAttribute("label", dominates(subject("clearance")))));
  });

  /**
   * The flow rule in the reading direction: information flows FROM the resource TO
   * the subject, so the subject must dominate the resource.
   */
  When("information flows from the resource to the subject", function* () {
    yield* run(labeled("flow", hasAttribute("clearance", dominates(resource("label")))));
  });
});
