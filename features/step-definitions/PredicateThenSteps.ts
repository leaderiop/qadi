import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { evaluatePredicate } from "@qadi/core";
import type { Predicate } from "@qadi/core";
import { agreesWith } from "./Bridge.ts";
import { sealedRows } from "./PredicateWhenSteps.ts";
import { readState, World, type WorldState } from "./SharedWorld.ts";

const compiled = (s: WorldState): Predicate => {
  assert.ok(s.predicate !== undefined, `nothing compiled; refused ${JSON.stringify(s.refusedTag)}`);
  return s.predicate;
};

export const predicateThenSteps = defineSteps<World>(({ Then }) => {
  Then("the predicate admits the row {string}", function* (tenantId: string) {
    const s = yield* readState();
    assert.equal(evaluatePredicate(compiled(s), { tenantId, sealed: false }), true);
  });

  Then("the predicate refuses the row {string}", function* (tenantId: string) {
    const s = yield* readState();
    assert.equal(evaluatePredicate(compiled(s), { tenantId, sealed: false }), false);
  });

  Then("the predicate refuses the sealed row {string}", function* (tenantId: string) {
    const s = yield* readState();
    // The refusal row is excluded from the filter, so the seal wins in the query
    // rather than after it.
    assert.equal(evaluatePredicate(compiled(s), { tenantId, sealed: true }), false);
  });

  Then("the predicate is exactly the tenancy comparison", function* () {
    const s = yield* readState();
    // Not `And([True, Compare])`. The satisfied half folded away, which is what
    // makes the output usable rather than merely correct.
    assert.deepEqual(compiled(s), { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" });
  });

  Then("the predicate is false", function* () {
    const s = yield* readState();
    assert.deepEqual(compiled(s), { _tag: "False" });
  });

  Then("the query need not be run", function* () {
    const s = yield* readState();
    // The outcome worth naming: a caller can skip the round trip rather than
    // sending a `WHERE false`.
    assert.equal(compiled(s)._tag, "False");
  });

  Then("compilation is refused for {string}", function* (tag: string) {
    const s = yield* readState();
    assert.equal(s.predicate, undefined, "a predicate was produced");
    assert.equal(s.refusedTag, tag);
  });

  Then("the predicate and the evaluator agree on every row", function* () {
    // INV-QD-018 as a scenario. Two interpreters over one tree, compared rather
    // than argued about — including a row missing the column entirely.
    const rows: ReadonlyArray<Record<string, unknown>> = [
      { tenantId: "t-1", sealed: false },
      { tenantId: "t-1", sealed: true },
      { tenantId: "t-2", sealed: false },
      { sealed: false },
      {},
    ];
    assert.ok(yield* agreesWith(sealedRows(), rows), "the two interpreters disagreed");
  });
});
