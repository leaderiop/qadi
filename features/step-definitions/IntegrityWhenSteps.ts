import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import { allOf, anyOf, dominates, hasAction, hasAttribute, hasResourceAttribute, labeled, resource, subject } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

/**
 * Biba: no read down, no write up. The same two comparisons as Bell-LaPadula
 * with the operands exchanged, which is the entire content of "integrity
 * dual" — one lattice, one matcher, two readings of it.
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

export const integrityWhenSteps = defineSteps<World>(({ When }) => {
  When("Biba is enforced", function* () {
    yield* run(biba());
  });

  /**
   * A ring policy: reads down are permitted, writes up are still refused.
   *
   * The relaxation everyone actually deploys — reading downwards is what
   * software does all day. Dropping the read arm's comparison is the whole of
   * it, so the bare `hasAction("read")` is the policy, not a placeholder.
   */
  When("the ring policy is enforced", function* () {
    yield* run(
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
   */
  When("the low-water-mark policy is enforced", function* () {
    yield* run(
      allOf([
        hasAction("write"),
        labeled("lwm.no-write-up", hasAttribute("effectiveIntegrity", dominates(resource("label")))),
      ]),
    );
  });
});
