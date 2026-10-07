/**
 * Pins the compile-time half of the enforcement-error class table (ARCH-04).
 *
 * The real table is declared `as const satisfies EnforcementErrorClassTable`,
 * so widening `EnforcementError` makes that `satisfies` fail (TS1360) and the
 * tag tuples fail through `CoversExactly` (TS2322). The `HypotheticalNewError`
 * assertions below pin the *mechanism* — a table total over today's union is
 * not assignable to one total over a union that gained a member — the way
 * `GuardRoute.tst.ts` pins both directions of its discharge. This file
 * contains no deliberate compile error, because `tsconfig.test.json` also
 * compiles every `*.tst.ts` under `tsc`.
 */
import { expect, test } from "tstyche";
import type { CurrentSubject } from "../src/CurrentSubject.ts";
import type {
  EnforcementDenial,
  EnforcementError,
  EnforcementErrorClass,
  EnforcementErrorClassTable,
  EnforcementErrorTagOf,
} from "../src/Errors.ts";
import type { AccessDenied, UndischargedObligation } from "../src/Errors.ts";
import type { EncodeRefusal, EncodeRefusalAnnotations, SinkRecordTag } from "../src/SinkWire.ts";
import { encodeRefusalAnnotations } from "../src/SinkWire.ts";
import type {
  ERROR_CODES,
  QadiError,
  SinkRecordNotDecodable,
  SinkRecordNotEncodable,
} from "../src/Errors.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { ENFORCEMENT_DENIAL_TAGS, ENFORCEMENT_ERROR_CLASSES, ENFORCEMENT_ERROR_TAGS } from "../src/Errors.ts";
import type { EvaluationServices, StandingEvaluationServices } from "../src/Evaluate.ts";

declare class HypotheticalNewError {
  readonly _tag: "HypotheticalNewError";
}

test("the class table is keyed by exactly the EnforcementError tags", () => {
  expect<keyof typeof ENFORCEMENT_ERROR_CLASSES>().type.toBe<EnforcementError["_tag"]>();
});

test("the tag tuple holds exactly the EnforcementError tags", () => {
  expect<(typeof ENFORCEMENT_ERROR_TAGS)[number]>().type.toBe<EnforcementError["_tag"]>();
});

test("the class union is the closed three-member union", () => {
  expect<EnforcementErrorClass>().type.toBe<"denied" | "outage" | "wiringMistake">();
});

test("the denial tags are the two tags whose class is denied", () => {
  expect<EnforcementErrorTagOf<"denied">>().type.toBe<"AccessDenied" | "UndischargedObligation">();
  expect<(typeof ENFORCEMENT_DENIAL_TAGS)[number]>().type.toBe<EnforcementErrorTagOf<"denied">>();
  expect<EnforcementDenial>().type.toBe<AccessDenied | UndischargedObligation>();
});

test("a table total over today's union is not total over a widened one", () => {
  expect<typeof ENFORCEMENT_ERROR_CLASSES>().type.toBeAssignableTo<EnforcementErrorClassTable>();
  expect<typeof ENFORCEMENT_ERROR_CLASSES>().type.not.toBeAssignableTo<
    EnforcementErrorClassTable<EnforcementError | HypotheticalNewError>
  >();
});

test("StandingEvaluationServices is EvaluationServices without CurrentSubject", () => {
  expect<StandingEvaluationServices>().type.toBe<Exclude<EvaluationServices, CurrentSubject>>();
  expect<CurrentSubject>().type.not.toBeAssignableTo<StandingEvaluationServices>();
});

test("SinkRecordTag is exactly SinkRecord's tag, though Errors.ts cannot import it (ARCH-09)", () => {
  expect<SinkRecordTag>().type.toBe<SinkRecord["_tag"]>();
});

test("the two record-codec refusals are QadiError members with codes", () => {
  expect<SinkRecordNotEncodable>().type.toBeAssignableTo<QadiError>();
  expect<SinkRecordNotDecodable>().type.toBeAssignableTo<QadiError>();
  expect<(typeof ERROR_CODES)["SinkRecordNotEncodable"]>().type.toBe<"ACL019">();
  expect<(typeof ERROR_CODES)["SinkRecordNotDecodable"]>().type.toBe<"ACL020">();
});

declare const declaredSinkRefusal: SinkRecordNotEncodable;
declare const declaredPlainRefusal: { readonly refusal: EncodeRefusal; readonly evaluationId: string };

test("an encode refusal report has exactly three annotation keys, read from anything with a refusal and an id (ARCH-25)", () => {
  expect<keyof EncodeRefusalAnnotations>().type.toBe<"qadi.refusal" | "qadi.path" | "evaluationId">();
  expect(encodeRefusalAnnotations).type.toBeCallableWith(declaredSinkRefusal);
  expect(encodeRefusalAnnotations).type.toBeCallableWith(declaredPlainRefusal);
});
