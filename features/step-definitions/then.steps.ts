import { Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
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
