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

const describe = (world: QadiWorld): string =>
  JSON.stringify({
    allowed: world.outcome.allowed,
    denied: world.outcome.denied,
    errored: world.outcome.errored,
    reason: world.outcome.reason,
  });
