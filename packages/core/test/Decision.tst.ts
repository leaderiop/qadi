/**
 * Pins the compile-time half of "a decision is constructed from its trace"
 * (ARCH-32, INV-QD-170): a disagreeing `Allow` or `Deny` is not a value the
 * constructors will build.
 */
import { expect, test } from "tstyche";
import type {
  AllowingTrace,
  DecisionClaim,
  DecisionDisagreement,
  DecisionStamp,
  DenyingTrace,
  Trace,
} from "../src/Decision.ts";
import { Allow, Deny, makeDecision } from "../src/Decision.ts";
import type { Decision } from "../src/Decision.ts";
import type { VisibleFields } from "../src/FieldLattice.ts";
import type { Obligation } from "../src/Obligation.ts";
import type { DecodeRefusal } from "../src/SinkWire.ts";

declare const stamp: DecisionStamp;
declare const allowing: AllowingTrace;
declare const denying: DenyingTrace;
declare const unknownVerdict: Trace;

test("Allow takes a stamp and an allowing trace, and nothing else", () => {
  expect(Allow).type.toBeConstructableWith({ ...stamp, trace: allowing });
});

test("Allow refuses the fields it derives from its trace", () => {
  expect(Allow).type.not.toBeConstructableWith({ ...stamp, trace: allowing, visibleFields: [] });
  expect(Allow).type.not.toBeConstructableWith({ ...stamp, trace: allowing, obligations: [] });
});

test("Allow refuses a trace that is not known to allow", () => {
  expect(Allow).type.not.toBeConstructableWith({ ...stamp, trace: unknownVerdict });
  expect(Allow).type.not.toBeConstructableWith({ ...stamp, trace: denying });
});

test("Deny takes a stamp and a denying trace, and nothing else", () => {
  expect(Deny).type.toBeConstructableWith({ ...stamp, trace: denying });
  expect(Deny).type.not.toBeConstructableWith({ ...stamp, trace: denying, reason: "x" });
});

test("Deny refuses a trace that is not known to deny", () => {
  expect(Deny).type.not.toBeConstructableWith({ ...stamp, trace: unknownVerdict });
  expect(Deny).type.not.toBeConstructableWith({ ...stamp, trace: allowing });
});

test("makeDecision builds a Decision from a stamp and any trace", () => {
  expect(makeDecision(stamp, unknownVerdict)).type.toBe<Decision>();
});

test("the derived fields keep their types", () => {
  expect<Allow["visibleFields"]>().type.toBe<VisibleFields>();
  expect<Allow["obligations"]>().type.toBe<ReadonlyArray<Obligation>>();
  expect<Allow["trace"]>().type.toBe<AllowingTrace>();
  expect<Deny["trace"]>().type.toBe<DenyingTrace>();
  expect<Deny["reason"]>().type.toBe<string>();
});

test("a claim is one of the two verdicts, and a disagreement is a closed union", () => {
  expect<DecisionClaim["verdict"]>().type.toBe<"Allow" | "Deny">();
  expect<DecisionDisagreement>().type.toBe<
    | "Verdict"
    | "VisibleFields"
    | "Obligations"
    | "Reason"
    | "DenyObligations"
    | "EvaluationId"
    | "SubjectId"
    | "PolicyTag"
  >();
});

test("a record refusal names its disagreement", () => {
  expect<DecodeRefusal["_tag"]>().type.toBe<
    "NotJson" | "TooDeep" | "Malformed" | "Inconsistent" | "UnsupportedVersion"
  >();
});
