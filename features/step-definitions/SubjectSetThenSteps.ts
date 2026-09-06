import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { readState, World } from "./SharedWorld.ts";

export const subjectSetThenSteps = defineSteps<World>(({ Then }) => {
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
});
