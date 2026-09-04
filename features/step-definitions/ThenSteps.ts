import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { evaluatePredicate } from "@qadi/core";
import type { Predicate } from "@qadi/core";
import { agreesWith } from "./Bridge.ts";
import { sealedRows } from "./WhenSteps.ts";
import { readState, World, type WorldState } from "./SharedWorld.ts";

const describeOutcome = (s: WorldState): string =>
  JSON.stringify({
    allowed: s.outcome.allowed,
    denied: s.outcome.denied,
    errored: s.outcome.errored,
    reason: s.outcome.reason,
  });

const compiled = (s: WorldState): Predicate => {
  assert.ok(s.predicate !== undefined, `nothing compiled; refused ${JSON.stringify(s.refusedTag)}`);
  return s.predicate;
};

export const thenSteps = defineSteps<World>(({ Then }) => {
  Then("access is granted", function* () {
    const s = yield* readState();
    assert.equal(s.outcome.allowed, true, `expected grant, got ${describeOutcome(s)}`);
  });

  Then("access is denied", function* () {
    const s = yield* readState();
    assert.equal(s.outcome.denied, true, `expected denial, got ${describeOutcome(s)}`);
  });

  Then("evaluation fails with an error", function* () {
    const s = yield* readState();
    assert.equal(s.outcome.errored, true, `expected an error, got ${describeOutcome(s)}`);
  });

  Then("the denial reason mentions {string}", function* (text: string) {
    const s = yield* readState();
    assert.ok(
      s.outcome.reason?.includes(text) === true,
      `reason ${JSON.stringify(s.outcome.reason)} does not mention ${JSON.stringify(text)}`,
    );
  });

  Then("the visible fields are {string}", function* (expected: string) {
    const s = yield* readState();
    const want = expected
      .split(",")
      .map((v) => v.trim())
      .sort();
    const got = [...(s.outcome.visibleFields ?? [])].sort();
    assert.deepEqual(got, want);
  });

  Then("all fields are visible", function* () {
    const s = yield* readState();
    // `undefined` is the top of the visibility lattice: no restriction.
    assert.equal(s.outcome.visibleFields, undefined);
  });

  Then("the decision owes {string}", function* (expected: string) {
    const s = yield* readState();
    const want = expected
      .split(",")
      .map((v) => v.trim())
      .sort();
    assert.deepEqual([...s.outcome.obligations].sort(), want);
  });

  Then("the decision owes nothing", function* () {
    const s = yield* readState();
    assert.deepEqual(s.outcome.obligations, []);
  });

  Then("the guarded work runs", function* () {
    const s = yield* readState();
    assert.equal(s.workRan, true, "expected the guarded work to have run");
  });

  Then("the guarded work does not run", function* () {
    const s = yield* readState();
    // Not merely discarded — never started. That is the whole point of an aspect.
    assert.equal(s.workRan, false, "the guarded work ran when it should not have");
  });

  Then("enforcement fails with an undischarged obligation", function* () {
    const s = yield* readState();
    assert.equal(s.outcome.failure, "UndischargedObligation");
  });

  Then("the handler discharged {string}", function* (expected: string) {
    const s = yield* readState();
    const want = expected
      .split(",")
      .map((v) => v.trim())
      .sort();
    assert.deepEqual([...s.discharged].sort(), want);
  });

  Then("the answer is {string}", function* (expected: string) {
    const s = yield* readState();
    const want = expected.split(",").map((v) => v.trim());
    // Order is asserted, not sorted: a review is read beside the list it was
    // asked about, so position is the join key.
    assert.deepEqual(s.answer, want);
  });

  Then("the answer is empty", function* () {
    const s = yield* readState();
    assert.deepEqual(s.answer, []);
  });

  /**
   * A rule table's first diagnostic question, asked in both directions.
   *
   * `Rules` is the only node in the library whose *allowing* trace carries a
   * reason, and this is what that is for (ADR-QD-023).
   */
  Then("the deciding row is {string}", function* (expected: string) {
    const s = yield* readState();
    assert.equal(s.outcome.traceReason, expected);
  });

  /**
   * Which labelled branch refused.
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

  Then("the review covers {string}", function* (expected: string) {
    const s = yield* readState();
    const want = expected.split(",").map((v) => v.trim());
    assert.deepEqual(
      s.review.map((r) => r.id),
      want,
    );
  });

  Then("{string} was refused because of {string}", function* (id: string, text: string) {
    const s = yield* readState();
    const row = s.review.find((r) => r.id === id);
    assert.ok(row !== undefined, `no review row for ${id}`);
    assert.equal(row.allowed, false, `${id} was not refused`);
    assert.ok(
      row.reason?.includes(text) === true,
      `reason ${JSON.stringify(row.reason)} does not mention ${JSON.stringify(text)}`,
    );
  });

  Then("{string} owes {string}", function* (id: string, expected: string) {
    const s = yield* readState();
    const want = expected
      .split(",")
      .map((v) => v.trim())
      .sort();
    const row = s.review.find((r) => r.id === id);
    assert.ok(row !== undefined, `no review row for ${id}`);
    assert.deepEqual([...row.obligations].sort(), want);
  });

  // -------------------------------------------------------------------------
  // Predicate output
  // -------------------------------------------------------------------------

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

  Then("the description reads {string}", function* (expected: string) {
    const s = yield* readState();
    assert.equal(s.explanation, expected);
  });

  Then("the description mentions {string}", function* (expected: string) {
    const s = yield* readState();
    assert.ok(
      s.explanation !== undefined && s.explanation.includes(expected),
      `description ${JSON.stringify(s.explanation)} omits ${JSON.stringify(expected)}`,
    );
  });
});
