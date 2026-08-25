import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import {
  completeDecommissioningStep,
  createDecommissioningChecklist,
} from "../src/DecommissioningChecklist.ts";

describe("createDecommissioningChecklist", () => {
  it("creates all six steps, none completed, in order", () => {
    const checklist = createDecommissioningChecklist("system-1", 1_000);
    assert.strictEqual(checklist.checklistId, "system-1");
    assert.strictEqual(checklist.createdAt, 1_000);
    assert.deepStrictEqual(
      checklist.steps.map((s) => s.id),
      ["DECOMM-001", "DECOMM-002", "DECOMM-003", "DECOMM-004", "DECOMM-005", "DECOMM-006"],
    );
    assert.isTrue(checklist.steps.every((s) => s.completedAt === undefined));
  });

  it("HexDi's scope-disposal step is not present — no scope concept in this domain", () => {
    const checklist = createDecommissioningChecklist("system-1", 0);
    assert.strictEqual(checklist.steps.length, 6);
  });
});

describe("completeDecommissioningStep", () => {
  it.effect("marks the named step completed, leaving the rest untouched", () =>
    Effect.gen(function* () {
      const checklist = createDecommissioningChecklist("system-1", 0);
      const updated = yield* completeDecommissioningStep(checklist, "DECOMM-002", "alice", 5_000);

      const step = updated.steps.find((s) => s.id === "DECOMM-002");
      assert.strictEqual(step?.completedAt, 5_000);
      assert.strictEqual(step?.completedBy, "alice");

      const others = updated.steps.filter((s) => s.id !== "DECOMM-002");
      assert.isTrue(others.every((s) => s.completedAt === undefined));
    }));

  it.effect("an unknown stepId refuses rather than silently no-opping", () =>
    Effect.gen(function* () {
      const checklist = createDecommissioningChecklist("system-1", 0);
      const result = yield* Effect.result(
        completeDecommissioningStep(checklist, "DECOMM-999", "alice", 0),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "UnknownDecommissioningStep");
        assert.strictEqual(result.failure.stepId, "DECOMM-999");
        assert.strictEqual(result.failure.checklistId, "system-1");
      }
    }));

  it.effect("the original checklist object is left unmodified", () =>
    Effect.gen(function* () {
      const checklist = createDecommissioningChecklist("system-1", 0);
      yield* completeDecommissioningStep(checklist, "DECOMM-001", "alice", 5_000);
      assert.isTrue(checklist.steps.every((s) => s.completedAt === undefined));
    }));
});
