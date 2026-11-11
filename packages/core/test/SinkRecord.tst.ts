/**
 * Pins the public types of the two sink records (ARCH-71).
 *
 * The record class's field type and the wire struct derive from one shared
 * statement (`SinkRecordFields.ts`); this file is what proves the derived types
 * are the types a consumer already compiles against. Each hand-written interface
 * below is the independent expectation the leaf-derived types must equal, written
 * out in full on purpose and not read from the source: a pin that imports its own
 * expectation cannot disagree with it.
 *
 * The constructor parameters are pinned by mutual assignability plus a `keyof`
 * check and per-key reads, not by `toBe` on the whole object: `ConstructorParameters`
 * of a `Data.TaggedClass` is a mapped type that `toBe` would call different from
 * an identical literal.
 */
import { expect, test } from "tstyche";
import type { obligationRecordFields, decisionRecordFields } from "../src/SinkRecordFields.ts";
import type { CacheOutcome } from "../src/EvaluationMetrics.ts";
import type { DecisionOutcome, ObligationOutcome } from "../src/DecisionRecord.ts";
import type { DecisionRecord, ObligationRecord } from "../src/DecisionRecord.ts";
import type { ResourceId, SubjectId } from "../src/Identity.ts";
import type { Policy } from "../src/Policy.ts";
import type { Resource } from "../src/Resource.ts";
import type { SinkRecordJson } from "../src/SinkCodec.ts";

/** What `new DecisionRecord(...)` accepts, written out by hand. */
interface DecisionRecordInput {
  readonly evaluationId: string;
  readonly at: number;
  readonly subjectId: SubjectId;
  readonly policy: Policy;
  readonly resource?: Resource | undefined;
  readonly action?: string | undefined;
  readonly cache?: CacheOutcome | undefined;
  readonly outcome: DecisionOutcome;
}

/** What `new ObligationRecord(...)` accepts, written out by hand. */
interface ObligationRecordInput {
  readonly evaluationId: string;
  readonly at: number;
  readonly outcome: ObligationOutcome;
  readonly obligationIds: ReadonlyArray<string>;
  readonly subjectId?: SubjectId | undefined;
  readonly action?: string | undefined;
  readonly resourceId?: ResourceId | undefined;
}

type DecisionInput = ConstructorParameters<typeof DecisionRecord>[0];
type ObligationInput = ConstructorParameters<typeof ObligationRecord>[0];

test("DecisionRecord's constructor takes exactly today's input", () => {
  expect<DecisionInput>().type.toBeAssignableTo<DecisionRecordInput>();
  expect<DecisionInput>().type.toBeAssignableFrom<DecisionRecordInput>();
  expect<keyof DecisionInput>().type.toBe<keyof DecisionRecordInput>();
  expect<DecisionInput["evaluationId"]>().type.toBe<string>();
  expect<DecisionInput["at"]>().type.toBe<number>();
  expect<DecisionInput["subjectId"]>().type.toBe<SubjectId>();
  expect<DecisionInput["policy"]>().type.toBe<Policy>();
  expect<DecisionInput["resource"]>().type.toBe<Resource | undefined>();
  expect<DecisionInput["action"]>().type.toBe<string | undefined>();
  expect<DecisionInput["cache"]>().type.toBe<CacheOutcome | undefined>();
  expect<DecisionInput["outcome"]>().type.toBe<DecisionOutcome>();
});

test("DecisionRecord's optional keys are optional, and the required ones are not", () => {
  expect<{
    readonly evaluationId: string;
    readonly at: number;
    readonly subjectId: SubjectId;
    readonly policy: Policy;
    readonly outcome: DecisionOutcome;
  }>().type.toBeAssignableTo<DecisionInput>();
  expect<{ readonly evaluationId: string }>().type.not.toBeAssignableTo<DecisionInput>();
});

test("ObligationRecord's constructor takes exactly today's input", () => {
  expect<ObligationInput>().type.toBeAssignableTo<ObligationRecordInput>();
  expect<ObligationInput>().type.toBeAssignableFrom<ObligationRecordInput>();
  expect<keyof ObligationInput>().type.toBe<keyof ObligationRecordInput>();
  expect<ObligationInput["evaluationId"]>().type.toBe<string>();
  expect<ObligationInput["at"]>().type.toBe<number>();
  expect<ObligationInput["outcome"]>().type.toBe<ObligationOutcome>();
  expect<ObligationInput["obligationIds"]>().type.toBe<ReadonlyArray<string>>();
  expect<ObligationInput["subjectId"]>().type.toBe<SubjectId | undefined>();
  expect<ObligationInput["action"]>().type.toBe<string | undefined>();
  expect<ObligationInput["resourceId"]>().type.toBe<ResourceId | undefined>();
});

test("ObligationRecord's identity keys are optional, and the required ones are not", () => {
  expect<{
    readonly evaluationId: string;
    readonly at: number;
    readonly outcome: ObligationOutcome;
    readonly obligationIds: ReadonlyArray<string>;
  }>().type.toBeAssignableTo<ObligationInput>();
  expect<{ readonly evaluationId: string }>().type.not.toBeAssignableTo<ObligationInput>();
});

test("ObligationOutcome is exactly the four outcomes", () => {
  expect<ObligationOutcome>().type.toBe<"Discharged" | "HandlerFailed" | "Refused" | "NotRequired">();
});

test("CacheOutcome is exactly the three cache answers", () => {
  expect<CacheOutcome>().type.toBe<"hit" | "coalesced" | "miss">();
});

type DecisionJson = Extract<SinkRecordJson, { readonly _tag: "Decision" }>;
type ObligationsJson = Extract<SinkRecordJson, { readonly _tag: "Obligations" }>;

test("SinkRecordJson has exactly the two tags", () => {
  expect<SinkRecordJson["_tag"]>().type.toBe<"Decision" | "Obligations">();
});

test("the Decision member of SinkRecordJson has exactly today's keys", () => {
  expect<keyof DecisionJson>().type.toBe<
    "_tag" | "version" | "evaluationId" | "at" | "subjectId" | "policy" | "resource" | "action" | "cache" | "outcome"
  >();
  expect<DecisionJson["version"]>().type.toBe<2>();
  expect<DecisionJson["subjectId"]>().type.toBe<string>();
  expect<DecisionJson["cache"]>().type.toBe<"hit" | "coalesced" | "miss" | undefined>();
});

test("the Obligations member of SinkRecordJson has exactly today's keys", () => {
  expect<keyof ObligationsJson>().type.toBe<
    | "_tag"
    | "version"
    | "evaluationId"
    | "at"
    | "outcome"
    | "obligationIds"
    | "subjectId"
    | "action"
    | "resourceId"
  >();
  expect<ObligationsJson["version"]>().type.toBe<2>();
  expect<ObligationsJson["outcome"]>().type.toBe<ObligationOutcome>();
  expect<ObligationsJson["subjectId"]>().type.toBe<string | undefined>();
  expect<ObligationsJson["resourceId"]>().type.toBe<string | undefined>();
});

// ARCH-71: the leaf's structs are the record classes' field types, so the two cannot differ.
test("the decision record's input minus outcome is the leaf struct's Type", () => {
  expect<Omit<DecisionInput, "outcome">>().type.toBeAssignableTo<typeof decisionRecordFields.Type>();
  expect<Omit<DecisionInput, "outcome">>().type.toBeAssignableFrom<typeof decisionRecordFields.Type>();
  expect<keyof DecisionInput>().type.toBe<keyof typeof decisionRecordFields.Type | "outcome">();
});

test("the obligation record's input is the leaf struct's Type", () => {
  expect<ObligationInput>().type.toBeAssignableTo<typeof obligationRecordFields.Type>();
  expect<ObligationInput>().type.toBeAssignableFrom<typeof obligationRecordFields.Type>();
});
