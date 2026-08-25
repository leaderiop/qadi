/**
 * JOB 4 ledger — E4.1 … E4.9.
 *
 * The sweep itself. Every row here is a sealed evaluation, so the last
 * describe block re-proves the seal at sweep scale: forty runs beside a real
 * ring must still write nothing, and that is the property that decides whether
 * a what-if button belongs in a debug panel at all.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  allOf,
  anyOf,
  AttributeResolveError,
  AttributeResolver,
  decisionSinkRing,
  DecisionHistoryUnknown,
  eq,
  gte,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasRole,
  literal,
  obligation,
  obliged,
  permission,
  RelationshipResolverNever,
} from "@qadi/core";
import type { DecisionOutcome } from "@qadi/core";
import {
  changedRows,
  compareOutcomes,
  isChanged,
  live,
  simulate,
  sweepPlan,
  verdictOfOutcome,
  whatIf,
} from "../../src/index.ts";
import type { Comparison, SimulationEdit, SimulationInput, WhatIfRow } from "../../src/index.ts";

const read = permission("doc", "read");

/** Two independent ways to satisfy one branch — the case first-order misses. */
const eitherWay = anyOf([hasRole("editor"), hasPermission(read)]);

const alice: SimulationInput = {
  subject: { id: "alice", roles: ["editor"], permissions: ["doc:read"] },
};

const rowFor = (rows: ReadonlyArray<WhatIfRow>, label: string): WhatIfRow => {
  const found = rows.find((row) => row.edit.label === label);
  if (found === undefined) throw new Error(`no row ${label}`);
  return found;
};

const compared = (self: Comparison) => {
  if (self._tag !== "Compared") throw new Error(`expected Compared, got ${self._tag}`);
  return self;
};

/** Ports whose attribute resolver is down, for the rows that must be errors rather than denials. */
const brokenPorts = Layer.mergeAll(
  Layer.succeed(AttributeResolver, {
    name: "broken",
    resolve: (_subjectId: string, attribute: string) =>
      Effect.fail(new AttributeResolveError({ attribute, cause: "the store is down" })),
  }),
  RelationshipResolverNever,
  DecisionHistoryUnknown,
);

describe("compareOutcomes", () => {
  const decided = (outcome: DecisionOutcome) => outcome;

  it.effect("reports no difference for two identical runs — E4.1", () =>
    Effect.gen(function* () {
      const once = yield* simulate(hasRole("editor"), alice);
      const twice = yield* simulate(hasRole("editor"), alice);

      const comparison = compareOutcomes(decided(once), decided(twice));

      assert.deepStrictEqual(compared(comparison).differences, []);
      assert.isUndefined(compared(comparison).flipped);
      assert.isFalse(isChanged(comparison));
    }));

  // E4.5 — an edit that breaks a resolver has not shown the subject would be
  // refused; it has shown nothing could be decided (INV-QD-006).
  it.effect("reports an edit that broke the evaluation as an error, never a denial", () =>
    Effect.gen(function* () {
      const baseline = yield* simulate(hasAttribute("clearance", gte(5)), {
        subject: { id: "alice", attributes: { clearance: 9 } },
      });
      const broken = yield* simulate(
        hasAttribute("clearance", gte(5)),
        { subject: { id: "alice" } },
        { source: live(brokenPorts) },
      );

      const comparison = compareOutcomes(baseline, broken);

      assert.strictEqual(comparison._tag, "BecameError");
      assert.strictEqual(verdictOfOutcome(broken), "Error");
      assert.isTrue(isChanged(comparison));
    }));
});

describe("whatIf", () => {
  // E4.9
  it.effect("runs one row per edit, in the plan's order", () =>
    Effect.gen(function* () {
      const report = yield* whatIf(eitherWay, alice);

      assert.deepStrictEqual(
        report.rows.map((row) => row.edit.label),
        sweepPlan(eitherWay, alice).edits.map((edit) => edit.label),
      );
      assert.strictEqual(report.evaluations, report.rows.length + 1);
    }));

  /**
   * E4.1 and E4.2 in one policy, and the case that justifies second-order
   * sweeps existing at all. Neither grant is load-bearing on its own — `anyOf`
   * is satisfied either way — so no single edit turns the verdict, and only the
   * pair names the branch.
   *
   * The two single rows differ from each other in a way worth reading, and it
   * is not a difference in verdict. Dropping the permission is invisible: it
   * was never consulted, because the role satisfied the branch first
   * (INV-QD-005). Dropping the role is visible without flipping anything: the
   * evaluation reached a second child it had not needed before, which
   * `diffTraces` reports as a shape change and declines to descend past.
   */
  it.effect("finds the pair that flips what no single edit could", () =>
    Effect.gen(function* () {
      const report = yield* whatIf(eitherWay, alice, { pairs: true, remedies: false });

      assert.strictEqual(verdictOfOutcome(report.baseline), "Allow");

      const dropRole = rowFor(report.rows, "without role editor");
      const dropPermission = rowFor(report.rows, "without permission doc:read");
      assert.strictEqual(verdictOfOutcome(dropRole.outcome), "Allow");
      assert.strictEqual(verdictOfOutcome(dropPermission.outcome), "Allow");

      assert.deepStrictEqual(compared(dropPermission.comparison).differences, []);
      assert.isFalse(isChanged(dropPermission.comparison));

      assert.deepStrictEqual(
        compared(dropRole.comparison).differences.map((d) => d._tag),
        ["ChildCountChanged"],
      );
      assert.isUndefined(compared(dropRole.comparison).flipped);

      const both = rowFor(report.rows, "without role editor + without permission doc:read");
      assert.strictEqual(verdictOfOutcome(both.outcome), "Deny");
      assert.deepStrictEqual(compared(both.comparison).flipped?.path, []);

      assert.deepStrictEqual(
        changedRows(report).map((row) => row.edit.label),
        [dropRole.edit.label, both.edit.label],
      );
    }));

  // E4.2 — the outermost changed node, which is where the answer turned.
  it.effect("names the node whose verdict flipped", () =>
    Effect.gen(function* () {
      const policy = allOf([hasRole("editor"), hasRole("auditor")]);
      const both: SimulationInput = { subject: { id: "alice", roles: ["editor", "auditor"] } };
      const report = yield* whatIf(policy, both, { remedies: false });

      const flipped = compared(rowFor(report.rows, "without role auditor").comparison).flipped;

      assert.isDefined(flipped);
      // The root `AllOf` is where the policy's answer turned; the leaf beneath
      // it is the cause, and both appear — outermost first.
      assert.deepStrictEqual(flipped?.path, []);
      assert.strictEqual(flipped?.policyTag, "AllOf");
      assert.isTrue(flipped?.before);
      assert.isFalse(flipped?.after);
    }));

  // E4.3 — a narrowed grant is a real difference even though the verdict held.
  it.effect("reports a change to the visible fields with no flip", () =>
    Effect.gen(function* () {
      const policy = anyOf([
        hasRole("editor"),
        hasPermission(read, { fields: ["title"] }),
      ]);
      const report = yield* whatIf(policy, alice, { remedies: false });

      const row = rowFor(report.rows, "without role editor");
      const comparison = compared(row.comparison);

      assert.strictEqual(verdictOfOutcome(row.outcome), "Allow");
      assert.isUndefined(comparison.flipped);
      assert.isTrue(comparison.differences.some((d) => d._tag === "FieldsChanged"));
      assert.isTrue(isChanged(row.comparison));
    }));

  // E4.4 — a dropped duty changes what the caller owes, so it is reported.
  it.effect("reports a change to the obligations with no flip", () =>
    Effect.gen(function* () {
      const policy = anyOf([
        obliged(obligation("audit"), hasRole("editor")),
        hasPermission(read),
      ]);
      const report = yield* whatIf(policy, alice, { remedies: false });

      const comparison = compared(rowFor(report.rows, "without role editor").comparison);

      assert.isUndefined(comparison.flipped);
      assert.isTrue(comparison.differences.some((d) => d._tag === "ObligationsChanged"));
    }));

  // E4.6
  it.effect("sweeps nothing when there is nothing to vary", () =>
    Effect.gen(function* () {
      const report = yield* whatIf(hasRole("editor"), { subject: { id: "alice" } }, {
        remedies: false,
      });

      assert.deepStrictEqual(report.rows, []);
      assert.strictEqual(report.evaluations, 1);
      assert.strictEqual(verdictOfOutcome(report.baseline), "Deny");
    }));

  /**
   * E4.8. A failing baseline is what the reviewer came to the screen about, so
   * refusing to sweep would withhold the answer exactly when it is wanted.
   * Every row compares against *no* trace and says which case it is.
   */
  it.effect("still sweeps when the baseline itself failed", () =>
    Effect.gen(function* () {
      const policy = anyOf([hasRole("editor"), hasAttribute("clearance", gte(5))]);
      const report = yield* whatIf(
        policy,
        { subject: { id: "alice", roles: ["auditor"] } },
        { source: live(brokenPorts), remedies: false },
      );

      assert.strictEqual(verdictOfOutcome(report.baseline), "Error");
      assert.strictEqual(report.rows.length, 1);

      const row = rowFor(report.rows, "without role auditor");
      assert.strictEqual(row.comparison._tag, "StillFailed");
      // The same outage on both sides is not a finding; a different one would be.
      assert.isFalse(isChanged(row.comparison));
    }));

  it.effect("reports a row that repaired a failing baseline", () =>
    Effect.gen(function* () {
      // The attribute is read only because the subject lacks the role; dropping
      // the *fixture* changes nothing, but granting the role short-circuits the
      // broken port away (INV-QD-005).
      const policy = anyOf([hasRole("editor"), hasAttribute("clearance", gte(5))]);
      const report = yield* whatIf(
        policy,
        { subject: { id: "alice" } },
        {
          source: live(brokenPorts),
          edits: [
            {
              kind: "GrantRole",
              direction: "Strengthen",
              label: "with role editor",
              apply: (self) => ({ ...self, subject: { ...self.subject, roles: ["editor"] } }),
            },
          ],
        },
      );

      const row = rowFor(report.rows, "with role editor");

      assert.strictEqual(row.comparison._tag, "Recovered");
      assert.isTrue(isChanged(row.comparison));
      assert.strictEqual(verdictOfOutcome(row.outcome), "Allow");
    }));

  it.effect("carries the edited input, so a panel can promote a row to the form", () =>
    Effect.gen(function* () {
      const report = yield* whatIf(hasRole("editor"), alice, { remedies: false });

      assert.deepStrictEqual(rowFor(report.rows, "without role editor").input.subject.roles, []);
      // And the input it was handed is untouched.
      assert.deepStrictEqual(alice.subject.roles, ["editor"]);
    }));

  it.effect("includes the remedies by default and drops them on request", () =>
    Effect.gen(function* () {
      const denied: SimulationInput = { subject: { id: "alice", roles: ["auditor"] } };

      const withRemedies = yield* whatIf(hasRole("editor"), denied);
      const without = yield* whatIf(hasRole("editor"), denied, { remedies: false });

      assert.deepStrictEqual(
        withRemedies.rows.map((r) => r.edit.label),
        ["without role auditor", "with role editor"],
      );
      assert.deepStrictEqual(without.rows.map((r) => r.edit.label), ["without role auditor"]);
      // Nothing was proposed, so nothing could have been declined.
      assert.deepStrictEqual(without.skipped, []);

      // And the remedy is the row that answers the question a denial raises.
      assert.strictEqual(
        verdictOfOutcome(rowFor(withRemedies.rows, "with role editor").outcome),
        "Allow",
      );
    }));

  it.effect("runs the caller's own edits verbatim when given some", () =>
    Effect.gen(function* () {
      const noop: SimulationEdit = {
        kind: "DropRole",
        direction: "Weaken",
        label: "nothing at all",
        apply: (self) => self,
      };
      const report = yield* whatIf(eitherWay, alice, { edits: [noop] });

      assert.deepStrictEqual(report.rows.map((r) => r.edit.label), ["nothing at all"]);
      assert.deepStrictEqual(report.skipped, []);
      assert.isFalse(isChanged(rowFor(report.rows, "nothing at all").comparison));
    }));
});

describe("sweepPlan — what a sweep would cost, before it costs it", () => {
  it("counts the baseline as one of the evaluations", () => {
    const plan = sweepPlan(eitherWay, alice, { remedies: false });

    assert.strictEqual(plan.edits.length, 2);
    assert.strictEqual(plan.evaluations, 3);
  });

  // E3.2, closed here rather than in JOB 3: the count only exists once there is
  // a sweep to count.
  it("says whether the sweep performs I/O", () => {
    assert.isFalse(sweepPlan(eitherWay, alice).causesIO);
    assert.isTrue(sweepPlan(eitherWay, alice, { source: live(brokenPorts) }).causesIO);
  });

  // E4.7
  it("states the pairs the cap excluded", () => {
    const plan = sweepPlan(eitherWay, alice, { pairs: true, maxPairs: 0, remedies: false });

    assert.strictEqual(plan.omittedPairs, 1);
    assert.strictEqual(plan.evaluations, 3);
  });

  it("omits nothing when pairs were not asked for", () => {
    assert.strictEqual(sweepPlan(eitherWay, alice, { pairs: false }).omittedPairs, 0);
  });

  it("pairs the caller's own edits when both are asked for", () => {
    const edits: ReadonlyArray<SimulationEdit> = ["a", "b"].map((label) => ({
      kind: "DropRole" as const,
      direction: "Weaken" as const,
      label,
      apply: (self: SimulationInput) => self,
    }));
    const plan = sweepPlan(eitherWay, alice, { edits, pairs: true });

    assert.deepStrictEqual(plan.edits.map((e) => e.label), ["a", "b", "a + b"]);
  });

  it("drops the weakenings on request and keeps the remedies", () => {
    const plan = sweepPlan(hasRole("editor"), alice, { weakenings: false });

    assert.deepStrictEqual(plan.edits.map((e) => e.label), []);
    assert.deepStrictEqual(
      sweepPlan(hasRole("admin"), alice, { weakenings: false }).edits.map((e) => e.label),
      ["with role admin"],
    );
  });

  it("carries the requirements no remedy could be built for", () => {
    const plan = sweepPlan(hasRelationship("owner"), { subject: { id: "alice" } });

    assert.deepStrictEqual(plan.skipped, [
      { requirement: "relationship owner", reason: "the check names no resource id" },
    ]);
  });
});

describe("a sweep is sealed, forty rows at a time", () => {
  /**
   * The property the whole feature rests on. `Effect.provide` adds to a context
   * and cannot remove from one, so a sweep run where a real sink is in scope
   * would write one fabricated audit row *per edit* — indistinguishable on
   * screen from decisions somebody actually asked for.
   */
  it.effect("writes no record, however many rows it runs", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });
      const wide: SimulationInput = {
        subject: {
          id: "alice",
          roles: ["a", "b", "c"],
          permissions: ["doc:read", "doc:write"],
          attributes: { x: 1, y: 2 },
        },
      };

      const report = yield* whatIf(eitherWay, wide, { pairs: true }).pipe(
        Effect.provide(ring.layer),
      );

      assert.isAbove(report.rows.length, 20);
      assert.deepStrictEqual(yield* ring.snapshot, []);
    }));

  it.effect("decides every row from the panel's subject", () =>
    Effect.gen(function* () {
      const report = yield* whatIf(hasPermission(read), alice, { remedies: false });

      for (const row of report.rows) {
        if (row.outcome._tag !== "Decided") throw new Error("expected a decision");
        assert.strictEqual(row.outcome.decision.subjectId, "alice", row.edit.label);
      }
    }));

  it.effect("is reproducible: the same sweep twice gives the same rows", () =>
    Effect.gen(function* () {
      const once = yield* whatIf(eitherWay, alice, { pairs: true });
      const twice = yield* whatIf(eitherWay, alice, { pairs: true });

      assert.deepStrictEqual(
        once.rows.map((r) => [r.edit.label, verdictOfOutcome(r.outcome)]),
        twice.rows.map((r) => [r.edit.label, verdictOfOutcome(r.outcome)]),
      );
    }));

  it.effect("changes nothing about the question when it varies the answers", () =>
    Effect.gen(function* () {
      const policy = hasAttribute("clearance", eq(literal(9)));
      const report = yield* whatIf(policy, {
        subject: { id: "alice", attributes: { clearance: 9 } },
        action: "read",
        resource: { id: "doc-1" },
      });

      for (const row of report.rows) {
        assert.strictEqual(row.input.action, "read", row.edit.label);
        assert.deepStrictEqual(row.input.resource, { id: "doc-1" }, row.edit.label);
      }
    }));
});
