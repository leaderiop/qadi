import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { describeOutcome, readState, World } from "./SharedWorld.ts";

/** Which labelled branch of a policy tree refused (or did not). */
export const attributionThenSteps = defineSteps<World>(({ Then }) => {
  /**
   * A rule table's first diagnostic question, asked in both directions.
   *
   * `Rules` is the only node in the library whose *allowing* trace carries a
   * reason, and this is what that is for (ADR-QD-023).
   *
   * A rule table names its row *in* `trace.reason`, but a labelled branch never
   * reaches a reason at all. Attribution is a walk over the trace.
   */
  Then("the denial is attributed to {string}", function* (label: string) {
    const s = yield* readState();
    assert.equal(s.outcome.denied, true, `expected a denial, got ${describeOutcome(s)}`);
    assert.ok(
      s.outcome.deniedLabels.includes(label),
      `refusing branches ${JSON.stringify(s.outcome.deniedLabels)} exclude ${JSON.stringify(label)}`,
    );
  });

  /**
   * Load-bearing twice: it expresses "this branch, *not* that one", and it turns
   * `AllOf`'s short-circuit into an assertion — a branch never evaluated is absent
   * from the trace, so its absence is evidence.
   */
  Then("the denial is not attributed to {string}", function* (label: string) {
    const s = yield* readState();
    assert.equal(s.outcome.denied, true, `expected a denial, got ${describeOutcome(s)}`);
    assert.ok(
      !s.outcome.deniedLabels.includes(label),
      `${JSON.stringify(label)} refused unexpectedly: ${JSON.stringify(s.outcome.deniedLabels)}`,
    );
  });
});
