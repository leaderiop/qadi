/**
 * One real instance of every failure `@qadi/http` can answer, built with its
 * sensitive fields populated.
 *
 * The mapped type is the point: a tag added to `EnforcementError` (or to the
 * http failure union) with no factory here is TS2741, so every table-driven
 * test that walks this record walks the whole closed domain (ARCH-04). The
 * sensitive values are chosen so a leak is greppable in an encoded body: a
 * connection string in every `cause`, a stack-shaped `reason`, a populated
 * evaluation `trace`, and obligation ids.
 */
import type { EnforcementError } from "@qadi/core";
import {
  AccessDenied,
  AttributeResolveError,
  CustomPredicateError,
  DecisionHistoryUnavailable,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
  RelationshipResolveError,
  SignatureHistoryUnavailable,
  UndischargedObligation,
  makeResourceId,
  makeSubjectId,
} from "@qadi/core";
import { SubjectExtractionFailed } from "../../src/SubjectExtractor.ts";

type HttpFailure = EnforcementError | SubjectExtractionFailed;

const subjectId = makeSubjectId("u-1");
const resourceId = makeResourceId("doc-1");
const secretCause = () => new Error("postgres://user:pw@db");

export const everyHttpEnforcementFailure: {
  readonly [K in HttpFailure["_tag"]]: () => Extract<HttpFailure, { readonly _tag: K }>;
} = {
  AccessDenied: () =>
    new AccessDenied({
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
    }),
  UndischargedObligation: () => new UndischargedObligation({ subjectId, obligationIds: ["ob-1"] }),
  AttributeResolveError: () => new AttributeResolveError({ attribute: "clearance", cause: secretCause() }),
  RelationshipResolveError: () =>
    new RelationshipResolveError({ relation: "owner", resourceId, cause: secretCause() }),
  DecisionHistoryUnavailable: () =>
    new DecisionHistoryUnavailable({ event: "check", cause: secretCause() }),
  CustomPredicateError: () =>
    new CustomPredicateError({
      name: "isBusinessHours",
      reason: "TypeError: boom\n    at predicate (db.ts:1:1)",
    }),
  SignatureHistoryUnavailable: () =>
    new SignatureHistoryUnavailable({ subjectId, resourceId, cause: secretCause() }),
  MissingAction: () => new MissingAction({ expected: "read" }),
  MissingResource: () => new MissingResource({ attribute: "clearance" }),
  MissingResourceId: () => new MissingResourceId({ relation: "owner" }),
  PolicyTooDeep: () => new PolicyTooDeep({ maxDepth: 64 }),
  SubjectExtractionFailed: () => new SubjectExtractionFailed({ reason: "token service unreachable" }),
};
