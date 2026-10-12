/**
 * A decision agrees with its trace (ARCH-32, INV-QD-170): the one constructor
 * builds only agreeing decisions, and the one rule names the first way a
 * claimed decision does not.
 *
 * The rule is tested here once, per arm. The record codec and the hydration
 * engine assert only their own adapter facts (that a disagreement is refused,
 * and with which reason).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import type { DecisionClaim, DecisionDisagreement, Trace } from "../src/Decision.ts";
import { decisionDisagreement, isAllowed, makeDecision } from "../src/Decision.ts";
import type { Decision } from "../src/Decision.ts";
import { evaluate } from "../src/Evaluate.ts";
import { makeSubjectId } from "../src/Identity.ts";
import { obligation } from "../src/Obligation.ts";
import { policyArbitrary, subjectWith, testLayer } from "./helpers.ts";
import { traceArbitrary } from "./TraceOracle.ts";

/** What a decision claims beside its trace: the reading the adapters build. */
const claimOf = (decision: Decision): DecisionClaim =>
  isAllowed(decision)
    ? { verdict: "Allow", visibleFields: decision.visibleFields, obligations: decision.obligations }
    : { verdict: "Deny", reason: decision.reason, obligations: [] };

const audit = obligation("audit", { nested: { deep: 1 } });

const allowing: Trace = {
  policyTag: "HasRole",
  allowed: true,
  children: [],
  visibleFields: ["title"],
  obligations: [audit],
};
const denying: Trace = {
  policyTag: "HasRole",
  allowed: false,
  reason: "lacks role admin",
  children: [],
  obligations: [],
};

const allowClaim: DecisionClaim = {
  verdict: "Allow",
  visibleFields: ["title"],
  obligations: [audit],
};
const denyClaim: DecisionClaim = { verdict: "Deny", reason: "lacks role admin", obligations: [] };

describe("decisionDisagreement names the first way a claim contradicts its trace", () => {
  const cases: ReadonlyArray<
    readonly [string, DecisionClaim, Trace, DecisionDisagreement | undefined]
  > = [
    ["an agreeing Allow", allowClaim, allowing, undefined],
    ["an agreeing Deny", denyClaim, denying, undefined],
    ["an Allow beside a denying trace", allowClaim, denying, "Verdict"],
    ["a Deny beside an allowing trace", denyClaim, allowing, "Verdict"],
    ["an Allow with other fields", { ...allowClaim, visibleFields: ["title", "body"] }, allowing, "VisibleFields"],
    ["an Allow with the same fields in another order", { ...allowClaim, visibleFields: ["b", "a"] }, { ...allowing, visibleFields: ["a", "b"] }, "VisibleFields"],
    ["an Allow showing every field beside a restricted trace", { ...allowClaim, visibleFields: undefined }, allowing, "VisibleFields"],
    ["an Allow showing no field beside an unrestricted trace", { ...allowClaim, visibleFields: [] }, { ...allowing, visibleFields: undefined }, "VisibleFields"],
    ["an Allow dropping the trace's duty", { ...allowClaim, obligations: [] }, allowing, "Obligations"],
    ["an Allow inventing a duty", allowClaim, { ...allowing, obligations: [] }, "Obligations"],
    ["a duty differing only inside its attributes", { ...allowClaim, obligations: [obligation("audit", { nested: { deep: 2 } })] }, allowing, "Obligations"],
    ["a Deny with another reason", { ...denyClaim, reason: "forged sentence" }, denying, "Reason"],
    ["a Deny owing a duty", { ...denyClaim, obligations: [audit] }, denying, "DenyObligations"],
    ["a Deny with no trace reason claiming the fallback", { verdict: "Deny", reason: "denied", obligations: [] }, { ...denying, reason: undefined }, undefined],
    ["a Deny with no trace reason claiming another", { verdict: "Deny", reason: "x", obligations: [] }, { ...denying, reason: undefined }, "Reason"],
  ];

  for (const [name, claim, trace, expected] of cases) {
    it(name, () => {
      assert.strictEqual(decisionDisagreement(claim, trace), expected);
    });
  }

  it("undefined fields and an empty array are different claims (INV-QD-004)", () => {
    assert.strictEqual(
      decisionDisagreement({ ...allowClaim, visibleFields: undefined }, { ...allowing, visibleFields: undefined }),
      undefined,
    );
    assert.strictEqual(
      decisionDisagreement({ ...allowClaim, visibleFields: [] }, { ...allowing, visibleFields: [] }),
      undefined,
    );
  });

  it("reports the verdict before the fields, the fields before the duties", () => {
    assert.strictEqual(
      decisionDisagreement({ verdict: "Allow", visibleFields: ["x"], obligations: [] }, denying),
      "Verdict",
    );
    assert.strictEqual(
      decisionDisagreement({ verdict: "Allow", visibleFields: ["x"], obligations: [] }, allowing),
      "VisibleFields",
    );
    assert.strictEqual(
      decisionDisagreement({ verdict: "Deny", reason: "other", obligations: [audit] }, denying),
      "DenyObligations",
    );
  });
});

describe("makeDecision builds a decision that agrees with its trace", () => {
  const stamp = { evaluationId: "e", subjectId: makeSubjectId("u"), durationMillis: 3 };

  it("an allowing trace gives an Allow carrying the root's fields and duties", () => {
    const decision = makeDecision(stamp, allowing);
    assert.isTrue(isAllowed(decision));
    if (isAllowed(decision)) {
      assert.deepStrictEqual(decision.visibleFields, ["title"]);
      assert.deepStrictEqual(decision.obligations, [audit]);
    }
  });

  it("a denying trace gives a Deny carrying the root's reason, or 'denied' without one", () => {
    const withReason = makeDecision(stamp, denying);
    const without = makeDecision(stamp, { ...denying, reason: undefined });
    assert.strictEqual(isAllowed(withReason) ? undefined : withReason.reason, "lacks role admin");
    assert.strictEqual(isAllowed(without) ? undefined : without.reason, "denied");
  });

  it("PROPERTY: over any trace and stamp, the decision agrees with it", () => {
    FastCheck.assert(
      FastCheck.property(
        traceArbitrary(6),
        FastCheck.string(),
        FastCheck.nat(),
        (trace, evaluationId, durationMillis) => {
          const decision = makeDecision(
            { evaluationId, subjectId: makeSubjectId("u"), durationMillis },
            trace,
          );
          return (
            isAllowed(decision) === trace.allowed &&
            decision.evaluationId === evaluationId &&
            decision.durationMillis === durationMillis &&
            decisionDisagreement(claimOf(decision), decision.trace) === undefined
          );
        },
      ),
      { numRuns: 300, seed: 2026100801 },
    );
  });

  it.effect("PROPERTY: every decision `evaluate` produces agrees with its own trace", () =>
    Effect.gen(function* () {
      const subject = subjectWith({
        roles: ["editor"],
        permissions: ["doc:read"],
        attributes: { seniority: 5 },
      });
      for (const policy of FastCheck.sample(policyArbitrary(), { numRuns: 200, seed: 2026100802 })) {
        const result = yield* Effect.result(evaluate(policy).pipe(Effect.provide(testLayer(subject))));
        if (Result.isSuccess(result)) {
          assert.isUndefined(
            decisionDisagreement(claimOf(result.success), result.success.trace),
          );
        }
      }
    }));
});
