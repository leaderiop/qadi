/**
 * `toResponse` is a plain, exported, pure function — tested directly rather
 * than through an HTTP round trip. The spec's "one seam" testing decision is
 * about the *stateful* HTTP integration paths (`http.test.ts`); a pure
 * error-to-status mapping needs no live request to exercise meaningfully,
 * and going through one for every one of `Match.tagsExhaustive`'s nine arms
 * would only re-test `RequirePermission`/`guardRoute`'s own plumbing nine
 * times over.
 */
import {
  AccessDenied,
  AttributeResolveError,
  DecisionHistoryUnavailable,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
  RelationshipResolveError,
  UndischargedObligation,
  makeResourceId,
  makeSubjectId,
} from "@qadi/core";
import { describe, expect, it } from "vitest";
import { toResponse } from "../src/index.ts";

describe("toResponse", () => {
  it("maps every EnforcementError tag to its documented status code", () => {
    const subjectId = makeSubjectId("u-1");
    const resourceId = makeResourceId("doc-1");
    const cases: ReadonlyArray<readonly [Parameters<typeof toResponse>[0], number]> = [
      [new AccessDenied({ subjectId, policyTag: "HasPermission", reason: "denied" }), 403],
      [new UndischargedObligation({ subjectId, obligationIds: ["ob-1"] }), 403],
      [new AttributeResolveError({ attribute: "clearance", cause: "down" }), 502],
      [new RelationshipResolveError({ relation: "owner", resourceId, cause: "down" }), 502],
      [new DecisionHistoryUnavailable({ event: "check", cause: "down" }), 502],
      [new MissingAction({ expected: "read" }), 500],
      [new MissingResource({ attribute: "clearance" }), 500],
      [new MissingResourceId({ relation: "owner" }), 500],
      [new PolicyTooDeep({ maxDepth: 64 }), 400],
    ];

    for (const [error, status] of cases) {
      expect(toResponse(error).status).toBe(status);
    }
  });
});
