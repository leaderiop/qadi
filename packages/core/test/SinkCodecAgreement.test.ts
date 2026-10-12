/**
 * A decision record whose copies disagree is refused (ARCH-32, INV-QD-170).
 *
 * Every case is a valid version-2 envelope around a hand-written decision, so
 * the schema accepts it and only the agreement rule can refuse it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as Struct from "effect/Struct";
import * as FastCheck from "fast-check";
import type { DecisionDisagreement } from "../src/Decision.ts";
import { Decided, DecisionRecord } from "../src/DecisionRecord.ts";
import type { DecisionWire } from "../src/DecisionWire.ts";
import { evaluate } from "../src/Evaluate.ts";
import { POLICY_TAGS } from "../src/Policy.ts";
import { decodeSinkRecord, encodeSinkRecord } from "../src/SinkCodec.ts";
import { DecodeRefusal } from "../src/SinkWire.ts";
import { policyArbitrary, subjectWith, testLayer } from "./helpers.ts";

const policy = { _tag: "HasRole", role: "admin" };
const traceOf = (allowed: boolean, extra: object = {}) => ({
  policyTag: "HasRole",
  allowed,
  children: [],
  obligations: [],
  ...extra,
});
const audit = { id: "audit", attributes: {}, advisory: false };
const common = { evaluationId: "e1", subjectId: "u1", durationMillis: 0 };
const recordWith = (decision: object) => ({
  _tag: "Decision",
  version: 2,
  evaluationId: "e1",
  at: 0,
  subjectId: "u1",
  policy,
  outcome: { _tag: "Decided", decision },
});

const cases: ReadonlyArray<readonly [string, DecisionDisagreement, unknown]> = [
  [
    "A1 an Allow whose trace says allowed:false",
    "Verdict",
    recordWith({ _tag: "Allow", ...common, trace: traceOf(false, { reason: "no role" }), obligations: [] }),
  ],
  [
    "A2 an Allow whose visibleFields differ from the trace root's",
    "VisibleFields",
    recordWith({
      _tag: "Allow",
      ...common,
      trace: traceOf(true, { visibleFields: ["title"] }),
      visibleFields: ["title", "body"],
      obligations: [],
    }),
  ],
  [
    "A3 an Allow with no visibleFields whose trace root restricts",
    "VisibleFields",
    recordWith({
      _tag: "Allow",
      ...common,
      trace: traceOf(true, { visibleFields: ["title"] }),
      obligations: [],
    }),
  ],
  [
    "A4 an Allow dropping the trace's binding obligation",
    "Obligations",
    recordWith({ _tag: "Allow", ...common, trace: traceOf(true, { obligations: [audit] }), obligations: [] }),
  ],
  [
    "D1 a Deny whose trace says allowed:true",
    "Verdict",
    recordWith({ _tag: "Deny", ...common, trace: traceOf(true), obligations: [], reason: "denied" }),
  ],
  [
    "D2 a Deny whose reason differs from the trace's",
    "Reason",
    recordWith({
      _tag: "Deny",
      ...common,
      trace: traceOf(false, { reason: "lacks role admin" }),
      obligations: [],
      reason: "forged sentence",
    }),
  ],
  [
    "D3 a Deny carrying obligations",
    "DenyObligations",
    recordWith({
      _tag: "Deny",
      ...common,
      trace: traceOf(false, { reason: "x" }),
      obligations: [audit],
      reason: "x",
    }),
  ],
  [
    "R1 a record evaluationId that is not the decision's",
    "EvaluationId",
    recordWith({
      _tag: "Deny",
      ...common,
      evaluationId: "OTHER",
      trace: traceOf(false, { reason: "x" }),
      obligations: [],
      reason: "x",
    }),
  ],
  [
    "R2 a record subjectId that is not the decision's",
    "SubjectId",
    recordWith({
      _tag: "Deny",
      ...common,
      subjectId: "mallory",
      trace: traceOf(false, { reason: "x" }),
      obligations: [],
      reason: "x",
    }),
  ],
  [
    "R3 a record policy whose tag is not the trace root's",
    "PolicyTag",
    recordWith({
      _tag: "Deny",
      ...common,
      trace: { ...traceOf(false, { reason: "x" }), policyTag: "AnyOf" },
      obligations: [],
      reason: "x",
    }),
  ],
];

describe("a decision that contradicts its own trace or record is refused (ARCH-32)", () => {
  for (const [name, disagreement, input] of cases) {
    it(name, () => {
      const result = decodeSinkRecord(input);
      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) {
        assert.deepStrictEqual(result.failure.refusal, DecodeRefusal.Inconsistent({ disagreement }));
      }
    });
  }
});

/**
 * One duplicated field of a decision changed, or `undefined` when the mutation
 * has nothing to change on this decision (a `Deny` has no `visibleFields`).
 * Typed spreads over the wire shape: every mutation is a valid wire value that
 * contradicts itself, so only the agreement rule can refuse it.
 */
type Mutation = (wire: DecisionWire, policyTag: string) => DecisionWire | undefined;

const extraDuty = { id: "extra", attributes: {}, advisory: false };

const mutations: ReadonlyArray<readonly [string, Mutation]> = [
  [
    "the verdict tag flipped with its own fields",
    (wire) =>
      wire._tag === "Allow"
        ? { ...Struct.omit(wire, ["visibleFields"]), _tag: "Deny", obligations: [], reason: "x" }
        : { ...Struct.omit(wire, ["reason"]), _tag: "Allow", obligations: [] },
  ],
  ["trace.allowed flipped", (wire) => ({ ...wire, trace: { ...wire.trace, allowed: !wire.trace.allowed } })],
  ["visibleFields replaced", (wire) => (wire._tag === "Allow" ? { ...wire, visibleFields: ["zzz"] } : undefined)],
  [
    "visibleFields dropped or invented",
    (wire) =>
      wire._tag === "Allow"
        ? wire.visibleFields === undefined
          ? { ...wire, visibleFields: [] }
          : Struct.omit(wire, ["visibleFields"])
        : undefined,
  ],
  [
    "a duty added to the decision",
    (wire) => ({ ...wire, obligations: [...wire.obligations, extraDuty] }),
  ],
  [
    "a duty added to the trace root",
    (wire) =>
      wire._tag === "Allow"
        ? { ...wire, trace: { ...wire.trace, obligations: [...wire.trace.obligations, extraDuty] } }
        : undefined,
  ],
  ["the decision's reason changed", (wire) => (wire._tag === "Deny" ? { ...wire, reason: `${wire.reason}!` } : undefined)],
  [
    "the trace root's reason changed",
    (wire) =>
      wire._tag === "Deny"
        ? { ...wire, trace: { ...wire.trace, reason: `${wire.trace.reason ?? "denied"}!` } }
        : undefined,
  ],
  ["the decision's evaluationId changed", (wire) => ({ ...wire, evaluationId: `${wire.evaluationId}-other` })],
  ["the decision's subjectId changed", (wire) => ({ ...wire, subjectId: `${wire.subjectId}-other` })],
  [
    "the trace root's policy tag changed",
    (wire, policyTag) => ({
      ...wire,
      trace: { ...wire.trace, policyTag: POLICY_TAGS.find((tag) => tag !== policyTag) ?? "AllOf" },
    }),
  ],
];

describe("a decoded decision agrees with its trace, or is refused (INV-QD-170)", () => {
  it.effect("PROPERTY: an evaluated record decodes, and each one-field contradiction of it is refused", () =>
    Effect.gen(function* () {
      const subject = subjectWith({
        id: "u1",
        roles: ["editor"],
        permissions: ["doc:read"],
        attributes: { seniority: 5 },
      });
      let decided = 0;
      let refused = 0;
      for (const policy of FastCheck.sample(policyArbitrary(), { numRuns: 150, seed: 2026100803 })) {
        const result = yield* Effect.result(evaluate(policy).pipe(Effect.provide(testLayer(subject))));
        if (Result.isFailure(result)) continue;
        const record = new DecisionRecord({
          evaluationId: result.success.evaluationId,
          at: 0,
          subjectId: result.success.subjectId,
          policy,
          outcome: new Decided({ decision: result.success }),
        });
        const encoded = encodeSinkRecord(record);
        assert.isTrue(Result.isSuccess(encoded));
        if (Result.isFailure(encoded) || encoded.success._tag !== "Decision") continue;
        const base = encoded.success;
        if (base.outcome._tag !== "Decided") continue;

        // The unmutated record decodes.
        assert.isTrue(Result.isSuccess(decodeSinkRecord(JSON.parse(JSON.stringify(base)))));
        decided += 1;

        for (const [name, mutate] of mutations) {
          const wire = mutate(base.outcome.decision, policy._tag);
          if (wire === undefined) continue;
          const mutated = JSON.parse(JSON.stringify({ ...base, outcome: { ...base.outcome, decision: wire } }));
          const decoded = decodeSinkRecord(mutated);
          assert.isTrue(Result.isFailure(decoded), `${name} was accepted`);
          if (Result.isFailure(decoded)) {
            assert.include(["Inconsistent", "Malformed"], decoded.failure.refusal._tag, name);
            refused += 1;
          }
        }
      }
      // Not vacuous: the sample reached decisions, and mutations applied to them.
      assert.isAbove(decided, 50);
      assert.isAbove(refused, 300);
    }));
});
