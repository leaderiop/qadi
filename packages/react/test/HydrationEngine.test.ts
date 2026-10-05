import type { Decision } from "@qadi/core";
import { Deny, hasRole, makeSubjectId } from "@qadi/core";
import { assert, describe, it } from "@effect/vitest";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { makeSeededQuestion } from "../src/HydrationEngine.ts";
import type { HydrationMismatch } from "../src/HydrationEngine.ts";
import { SeededAllow } from "../src/SeededDecision.ts";

const subjectId = makeSubjectId("u1");
const trace = (allowed: boolean) => ({
  policyTag: "HasRole" as const,
  allowed,
  children: [],
  obligations: [],
});
const policy = hasRole("admin");

const allow = new SeededAllow({
  evaluationId: "e1",
  subjectId,
  durationMillis: 0,
  visibleFields: undefined,
  obligations: [],
  disclosure: { _tag: "Withheld" },
});
const deny = new Deny({
  evaluationId: "e2",
  subjectId,
  durationMillis: 0,
  trace: trace(false),
  reason: "no",
});

describe("makeSeededQuestion", () => {
  it("runs `track` before any read of its own atoms, once per computation", () => {
    const order: Array<string> = [];
    const q = makeSeededQuestion<never>({
      policy,
      resource: undefined,
      report: undefined,
      computedFor: () =>
        Atom.readable(() => {
          order.push("computed");
          return AsyncResult.success<Decision>(deny);
        }),
      track: () => {
        order.push("track");
      },
    });
    const registry = AtomRegistry.make();
    registry.get(q.read);
    assert.deepStrictEqual(order, ["track", "computed"]);
  });

  it("announces a disagreement once per registry, not once per question", () => {
    const reports: Array<HydrationMismatch> = [];
    const q = makeSeededQuestion<never>({
      policy,
      resource: undefined,
      report: (m) => reports.push(m),
      computedFor: () => Atom.readable(() => AsyncResult.success<Decision>(deny)),
      track: () => {},
    });

    const first = AtomRegistry.make();
    const second = AtomRegistry.make();
    first.set(q.seed, allow);
    second.set(q.seed, allow);
    first.mount(q.read);
    second.mount(q.read);
    // Re-reading in the same registry must not announce again.
    first.get(q.read);
    first.get(q.read);

    assert.strictEqual(reports.length, 2);
    assert.strictEqual(reports[0]?.seeded, allow);
    assert.strictEqual(reports[0]?.decided, deny);
  });

  it("reads the seed while the computed answer is still Initial, and drops it after", () => {
    let settled = false;
    const gate = Atom.make(0);
    const q = makeSeededQuestion<never>({
      policy,
      resource: undefined,
      report: undefined,
      computedFor: () =>
        Atom.readable((get) => {
          get(gate);
          return settled ? AsyncResult.success<Decision>(deny) : AsyncResult.initial<Decision, never>();
        }),
      track: () => {},
    });
    const registry = AtomRegistry.make();
    registry.mount(q.read);
    registry.set(q.seed, allow);

    const during = registry.get(q.read);
    assert.isTrue(AsyncResult.isSuccess(during));
    assert.strictEqual(AsyncResult.isSuccess(during) ? during.value : undefined, allow);

    settled = true;
    registry.set(gate, 1);
    const after = registry.get(q.read);
    assert.strictEqual(AsyncResult.isSuccess(after) ? after.value : undefined, deny);
  });
});
