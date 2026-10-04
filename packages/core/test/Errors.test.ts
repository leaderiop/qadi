/**
 * Pins every entry of the enforcement-error class table (ARCH-04).
 *
 * The table is module-scope, so Stryker's `ignoreStatic` (ADR-QD-076) does
 * not mutate its literals; these hand-written expectations are what stands in
 * for that coverage. The expected map is BEH-QD-177's status table restated as
 * classes, written out here rather than derived from the code under test.
 */
import { describe, expect, it } from "vitest";
import {
  AccessDenied,
  AttributeResolveError,
  CustomPredicateError,
  DecisionHistoryUnavailable,
  ENFORCEMENT_DENIAL_TAGS,
  ENFORCEMENT_ERROR_CLASSES,
  ENFORCEMENT_ERROR_TAGS,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
  RelationshipResolveError,
  SignatureHistoryUnavailable,
  UndischargedObligation,
  classifyEnforcementError,
  toAccessDeniedPublic,
} from "../src/Errors.ts";
import type { EnforcementError } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";

const subjectId = makeSubjectId("u-1");
const resourceId = makeResourceId("doc-1");

const accessDenied = new AccessDenied({
  subjectId,
  policyTag: "HasPermission",
  reason: "denied",
  trace: {
    policyTag: "HasPermission",
    allowed: false,
    reason: "denied",
    children: [],
    obligations: [],
  },
});

const everyError: { readonly [K in EnforcementError["_tag"]]: Extract<EnforcementError, { readonly _tag: K }> } = {
  AccessDenied: accessDenied,
  UndischargedObligation: new UndischargedObligation({ subjectId, obligationIds: ["ob-1"] }),
  AttributeResolveError: new AttributeResolveError({ attribute: "clearance", cause: "down" }),
  RelationshipResolveError: new RelationshipResolveError({ relation: "owner", resourceId, cause: "down" }),
  DecisionHistoryUnavailable: new DecisionHistoryUnavailable({ event: "check", cause: "down" }),
  CustomPredicateError: new CustomPredicateError({ name: "isBusinessHours", reason: "down" }),
  SignatureHistoryUnavailable: new SignatureHistoryUnavailable({ subjectId, resourceId, cause: "down" }),
  MissingAction: new MissingAction({ expected: "read" }),
  MissingResource: new MissingResource({ attribute: "clearance" }),
  MissingResourceId: new MissingResourceId({ relation: "owner" }),
  PolicyTooDeep: new PolicyTooDeep({ maxDepth: 64 }),
};

describe("ENFORCEMENT_ERROR_CLASSES", () => {
  it("assigns every tag its documented class", () => {
    expect(ENFORCEMENT_ERROR_CLASSES).toEqual({
      AccessDenied: "denied",
      UndischargedObligation: "denied",
      AttributeResolveError: "outage",
      RelationshipResolveError: "outage",
      DecisionHistoryUnavailable: "outage",
      CustomPredicateError: "outage",
      SignatureHistoryUnavailable: "outage",
      MissingAction: "wiringMistake",
      MissingResource: "wiringMistake",
      MissingResourceId: "wiringMistake",
      PolicyTooDeep: "wiringMistake",
    });
  });

  it("is keyed by exactly ENFORCEMENT_ERROR_TAGS", () => {
    expect(new Set(ENFORCEMENT_ERROR_TAGS)).toEqual(new Set(Object.keys(ENFORCEMENT_ERROR_CLASSES)));
    expect(ENFORCEMENT_ERROR_TAGS).toHaveLength(Object.keys(ENFORCEMENT_ERROR_CLASSES).length);
  });

  it("is keyed by the tag of every real error instance", () => {
    expect(new Set(Object.keys(everyError))).toEqual(new Set(ENFORCEMENT_ERROR_TAGS));
  });
});

describe("classifyEnforcementError", () => {
  const expectedClass = {
    AccessDenied: "denied",
    UndischargedObligation: "denied",
    AttributeResolveError: "outage",
    RelationshipResolveError: "outage",
    DecisionHistoryUnavailable: "outage",
    CustomPredicateError: "outage",
    SignatureHistoryUnavailable: "outage",
    MissingAction: "wiringMistake",
    MissingResource: "wiringMistake",
    MissingResourceId: "wiringMistake",
    PolicyTooDeep: "wiringMistake",
  } as const;

  for (const tag of ENFORCEMENT_ERROR_TAGS) {
    it(`a real ${tag} classifies to ${expectedClass[tag]}`, () => {
      expect(classifyEnforcementError(everyError[tag])).toBe(expectedClass[tag]);
    });
  }

  it("classifies the no-trace AccessDeniedPublic projection as a denial", () => {
    expect(classifyEnforcementError(toAccessDeniedPublic(accessDenied))).toBe("denied");
  });
});

describe("ENFORCEMENT_DENIAL_TAGS", () => {
  it("is exactly the tags whose class is denied", () => {
    const denied = Object.entries(ENFORCEMENT_ERROR_CLASSES)
      .filter(([, errorClass]) => errorClass === "denied")
      .map(([tag]) => tag);
    expect(new Set(ENFORCEMENT_DENIAL_TAGS)).toEqual(new Set(denied));
    expect(ENFORCEMENT_DENIAL_TAGS).toHaveLength(denied.length);
  });
});
