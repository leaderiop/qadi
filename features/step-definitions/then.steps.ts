import { Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { evaluatePredicate } from "@qadi/core";
import { sealedRows } from "./when.steps.ts";
import { QadiWorld } from "./world.ts";

Then("access is granted", function (this: QadiWorld) {
  assert.equal(
    this.outcome.allowed,
    true,
    `expected grant, got ${describe(this)}`,
  );
});

Then("access is denied", function (this: QadiWorld) {
  assert.equal(this.outcome.denied, true, `expected denial, got ${describe(this)}`);
});

Then("evaluation fails with an error", function (this: QadiWorld) {
  assert.equal(this.outcome.errored, true, `expected an error, got ${describe(this)}`);
});

Then("the denial reason mentions {string}", function (this: QadiWorld, text: string) {
  assert.ok(
    this.outcome.reason?.includes(text) === true,
    `reason ${JSON.stringify(this.outcome.reason)} does not mention ${JSON.stringify(text)}`,
  );
});

Then("the visible fields are {string}", function (this: QadiWorld, expected: string) {
  const want = expected.split(",").map((s) => s.trim()).sort();
  const got = [...(this.outcome.visibleFields ?? [])].sort();
  assert.deepEqual(got, want);
});

Then("all fields are visible", function (this: QadiWorld) {
  // `undefined` is the top of the visibility lattice: no restriction.
  assert.equal(this.outcome.visibleFields, undefined);
});

Then("the decision owes {string}", function (this: QadiWorld, expected: string) {
  const want = expected.split(",").map((s) => s.trim()).sort();
  assert.deepEqual([...this.outcome.obligations].sort(), want);
});

Then("the decision owes nothing", function (this: QadiWorld) {
  assert.deepEqual(this.outcome.obligations, []);
});

Then("the guarded work runs", function (this: QadiWorld) {
  assert.equal(this.workRan, true, "expected the guarded work to have run");
});

Then("the guarded work does not run", function (this: QadiWorld) {
  // Not merely discarded — never started. That is the whole point of an aspect.
  assert.equal(this.workRan, false, "the guarded work ran when it should not have");
});

Then("enforcement fails with an undischarged obligation", function (this: QadiWorld) {
  assert.equal(this.outcome.failure, "qadi/UndischargedObligation");
});

Then("the handler discharged {string}", function (this: QadiWorld, expected: string) {
  const want = expected.split(",").map((s) => s.trim()).sort();
  assert.deepEqual([...this.discharged].sort(), want);
});

Then("the answer is {string}", function (this: QadiWorld, expected: string) {
  const want = expected.split(",").map((s) => s.trim());
  // Order is asserted, not sorted: a review is read beside the list it was
  // asked about, so position is the join key.
  assert.deepEqual(this.answer, want);
});

Then("the answer is empty", function (this: QadiWorld) {
  assert.deepEqual(this.answer, []);
});

/**
 * A rule table's first diagnostic question, asked in both directions.
 *
 * `Rules` is the only node in the library whose *allowing* trace carries a
 * reason, and this is what that is for (ADR-QD-023).
 */
Then("the deciding row is {string}", function (this: QadiWorld, expected: string) {
  assert.equal(this.outcome.traceReason, expected);
});

/**
 * Which labelled branch refused.
 *
 * The counterpart to "the deciding row", and it cannot be asked the same way: a
 * rule table names its row *in* `trace.reason`, but a labelled branch never
 * reaches a reason at all. Attribution is a walk over the trace.
 */
Then("the denial is attributed to {string}", function (this: QadiWorld, label: string) {
  assert.equal(this.outcome.denied, true, `expected a denial, got ${describe(this)}`);
  assert.ok(
    this.outcome.deniedLabels.includes(label),
    `refusing branches ${JSON.stringify(this.outcome.deniedLabels)} exclude ${JSON.stringify(label)}`,
  );
});

/**
 * Load-bearing twice: it expresses "this branch, *not* that one", and it turns
 * `AllOf`'s short-circuit into an assertion — a branch never evaluated is absent
 * from the trace, so its absence is evidence.
 */
Then("the denial is not attributed to {string}", function (this: QadiWorld, label: string) {
  assert.equal(this.outcome.denied, true, `expected a denial, got ${describe(this)}`);
  assert.ok(
    !this.outcome.deniedLabels.includes(label),
    `${JSON.stringify(label)} refused unexpectedly: ${JSON.stringify(this.outcome.deniedLabels)}`,
  );
});

Then("the review covers {string}", function (this: QadiWorld, expected: string) {
  const want = expected.split(",").map((s) => s.trim());
  assert.deepEqual(this.review.map((r) => r.id), want);
});

Then(
  "{string} was refused because of {string}",
  function (this: QadiWorld, id: string, text: string) {
    const row = this.review.find((r) => r.id === id);
    assert.ok(row !== undefined, `no review row for ${id}`);
    assert.equal(row.allowed, false, `${id} was not refused`);
    assert.ok(
      row.reason?.includes(text) === true,
      `reason ${JSON.stringify(row.reason)} does not mention ${JSON.stringify(text)}`,
    );
  },
);

Then("{string} owes {string}", function (this: QadiWorld, id: string, expected: string) {
  const want = expected.split(",").map((s) => s.trim()).sort();
  const row = this.review.find((r) => r.id === id);
  assert.ok(row !== undefined, `no review row for ${id}`);
  assert.deepEqual([...row.obligations].sort(), want);
});

const describe = (world: QadiWorld): string =>
  JSON.stringify({
    allowed: world.outcome.allowed,
    denied: world.outcome.denied,
    errored: world.outcome.errored,
    reason: world.outcome.reason,
  });

// ---------------------------------------------------------------------------
// Predicate output
// ---------------------------------------------------------------------------

const compiled = (world: QadiWorld) => {
  assert.ok(
    world.predicate !== undefined,
    `nothing compiled; refused ${JSON.stringify(world.refusedTag)}`,
  );
  return world.predicate;
};

Then("the predicate admits the row {string}", function (this: QadiWorld, tenantId: string) {
  assert.equal(evaluatePredicate(compiled(this), { tenantId, sealed: false }), true);
});

Then("the predicate refuses the row {string}", function (this: QadiWorld, tenantId: string) {
  assert.equal(evaluatePredicate(compiled(this), { tenantId, sealed: false }), false);
});

Then(
  "the predicate refuses the sealed row {string}",
  function (this: QadiWorld, tenantId: string) {
    // The refusal row is excluded from the filter, so the seal wins in the query
    // rather than after it.
    assert.equal(evaluatePredicate(compiled(this), { tenantId, sealed: true }), false);
  },
);

Then("the predicate is exactly the tenancy comparison", function (this: QadiWorld) {
  // Not `And([True, Compare])`. The satisfied half folded away, which is what
  // makes the output usable rather than merely correct.
  assert.deepEqual(compiled(this), {
    _tag: "Compare",
    column: "tenantId",
    op: "Eq",
    value: "t-1",
  });
});

Then("the predicate is false", function (this: QadiWorld) {
  assert.deepEqual(compiled(this), { _tag: "False" });
});

Then("the query need not be run", function (this: QadiWorld) {
  // The outcome worth naming: a caller can skip the round trip rather than
  // sending a `WHERE false`.
  assert.equal(compiled(this)._tag, "False");
});

Then("compilation is refused for {string}", function (this: QadiWorld, tag: string) {
  assert.equal(this.predicate, undefined, "a predicate was produced");
  assert.equal(this.refusedTag, tag);
});

Then("the predicate and the evaluator agree on every row", function (this: QadiWorld) {
  // INV-QD-018 as a scenario. Two interpreters over one tree, compared rather
  // than argued about — including a row missing the column entirely.
  const rows: ReadonlyArray<Record<string, unknown>> = [
    { tenantId: "t-1", sealed: false },
    { tenantId: "t-1", sealed: true },
    { tenantId: "t-2", sealed: false },
    { sealed: false },
    {},
  ];
  assert.ok(this.agreesWith(sealedRows(), rows), "the two interpreters disagreed");
});
