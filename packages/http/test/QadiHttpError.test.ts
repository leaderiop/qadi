/**
 * `toResponse` is a plain, exported, pure function — tested directly rather
 * than through an HTTP round trip. The spec's "one seam" testing decision is
 * about the *stateful* HTTP integration paths (`http.test.ts`); a pure
 * error-to-status mapping needs no live request to exercise meaningfully,
 * and going through one for every one of `Match.tagsExhaustive`'s eleven arms
 * would only re-test `RequirePermission`/`guardRoute`'s own plumbing eleven
 * times over.
 */
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
import * as Effect from "effect/Effect";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import * as Schema from "effect/Schema";
import * as HttpApiSchema from "effect/http-api/HttpApiSchema";
import type * as HttpServerResponse from "effect/http/HttpServerResponse";
import { describe, expect, it } from "vitest";
import {
  AccessDeniedRefused,
  AttributeResolveErrorResponse,
  CustomPredicateErrorResponse,
  DecisionHistoryUnavailableResponse,
  MissingActionResponse,
  MissingResourceIdResponse,
  MissingResourceResponse,
  PolicyTooDeepResponse,
  RelationshipResolveErrorResponse,
  SignatureHistoryUnavailableResponse,
  SubjectExtractionFailed,
  SubjectExtractionRefused,
  UndischargedObligationRefused,
  handleEnforcementErrors,
  logDenial,
  subjectExtractionFailedResponse,
  toResponse,
} from "../src/index.ts";
import { everyHttpEnforcementFailure } from "./fixtures/everyHttpEnforcementFailure.ts";

/**
 * Runs `effect`, capturing every `Effect.log*` message emitted during it —
 * the same `Logger.layer`/`References.MinimumLogLevel` pattern
 * `packages/core/test/Evaluate.test.ts`'s "Debug log on denial" suite uses,
 * adapted to this file's plain-`vitest` style (no `it.effect` here) since
 * none of the functions under test need anything else from an Effect
 * runtime.
 */
const collectLogs = (effect: Effect.Effect<unknown>): ReadonlyArray<unknown> => {
  const logs: Array<unknown> = [];
  Effect.runSync(
    effect.pipe(
      Effect.provide(Logger.layer([Logger.make((options) => logs.push(options.message))])),
      Effect.provideService(References.MinimumLogLevel, "Debug"),
    ),
  );
  return logs;
};

describe("toResponse", () => {
  it("maps every EnforcementError tag to its documented status code", () => {
    const subjectId = makeSubjectId("u-1");
    const resourceId = makeResourceId("doc-1");
    const cases: ReadonlyArray<readonly [Parameters<typeof toResponse>[0], number]> = [
      [
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
        403,
      ],
      [new UndischargedObligation({ subjectId, obligationIds: ["ob-1"] }), 403],
      [new AttributeResolveError({ attribute: "clearance", cause: "down" }), 502],
      [new RelationshipResolveError({ relation: "owner", resourceId, cause: "down" }), 502],
      [new DecisionHistoryUnavailable({ event: "check", cause: "down" }), 502],
      [new CustomPredicateError({ name: "isBusinessHours", reason: "down" }), 502],
      [new SignatureHistoryUnavailable({ subjectId, resourceId, cause: "down" }), 502],
      [new MissingAction({ expected: "read" }), 500],
      [new MissingResource({ attribute: "clearance" }), 500],
      [new MissingResourceId({ relation: "owner" }), 500],
      [new PolicyTooDeep({ maxDepth: 64 }), 500],
    ];

    for (const [error, status] of cases) {
      expect(toResponse(error).status).toBe(status);
    }
  });
});

describe("logDenial", () => {
  it("logs an AccessDenied's stable code, subject and reason, exactly", () => {
    const error = new AccessDenied({
      subjectId: makeSubjectId("bob"),
      policyTag: "HasPermission",
      reason: "subject lacks permission 'document:read'",
      trace: {
        policyTag: "HasPermission",
        allowed: false,
        reason: "subject lacks permission 'document:read'",
        children: [],
        obligations: [],
      },
    });

    const logs = collectLogs(logDenial(error));

    expect(logs).toEqual([
      [`qadi/http: request denied (ACL001) — subject "bob": subject lacks permission 'document:read'`],
    ]);
  });

  it("logs an UndischargedObligation's stable code, subject and every obligation id, comma-joined", () => {
    // Two ids, deliberately: `.join(", ")` and `.join("")` only disagree once
    // there is more than one element to join.
    const error = new UndischargedObligation({
      subjectId: makeSubjectId("alice"),
      obligationIds: ["log-delete", "notify-owner"],
    });

    const logs = collectLogs(logDenial(error));

    expect(logs).toEqual([
      [`qadi/http: request denied (ACL010) — subject "alice": undischarged obligation(s) log-delete, notify-owner`],
    ]);
  });
});

describe("subjectExtractionFailedResponse", () => {
  it("logs the real reason server-side before answering the tag-only 502", () => {
    const error = new SubjectExtractionFailed({ reason: "token service unreachable" });
    let response: HttpServerResponse.HttpServerResponse | undefined;
    const logs = collectLogs(
      subjectExtractionFailedResponse(error).pipe(
        Effect.tap((r) =>
          Effect.sync(() => {
            response = r;
          }),
        ),
      ),
    );

    expect(logs).toEqual([["qadi/http: subject extraction failed — token service unreachable"]]);
    expect(response?.status).toBe(502);
  });
});

describe("handleEnforcementErrors", () => {
  it("logs a denial (AccessDenied) before reducing it to a bodyless 403", () => {
    const error = new AccessDenied({
      subjectId: makeSubjectId("bob"),
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

    let status: number | undefined;
    const logs = collectLogs(
      handleEnforcementErrors(Effect.fail(error)).pipe(
        Effect.tap((response) =>
          Effect.sync(() => {
            status = response.status;
          }),
        ),
      ),
    );

    expect(status).toBe(403);
    expect(logs).toEqual([[`qadi/http: request denied (ACL001) — subject "bob": denied`]]);
  });

  it("logs an unmet obligation (UndischargedObligation) before reducing it to a bodyless 403", () => {
    const error = new UndischargedObligation({ subjectId: makeSubjectId("alice"), obligationIds: ["ob-1"] });

    let status: number | undefined;
    const logs = collectLogs(
      handleEnforcementErrors(Effect.fail(error)).pipe(
        Effect.tap((response) =>
          Effect.sync(() => {
            status = response.status;
          }),
        ),
      ),
    );

    expect(status).toBe(403);
    expect(logs).toEqual([[`qadi/http: request denied (ACL010) — subject "alice": undischarged obligation(s) ob-1`]]);
  });
});

describe("the redacted *Response schemas", () => {
  const resourceId = makeResourceId("doc-1");
  const subjectId = makeSubjectId("alice");

  it("RelationshipResolveErrorResponse encodes the tag and the safe fields, never `cause`", () => {
    const error = new RelationshipResolveError({ relation: "owner", resourceId, cause: "connection refused" });
    const encoded = Schema.encodeSync(RelationshipResolveErrorResponse)(error);
    expect(encoded).toEqual({ _tag: "RelationshipResolveError", relation: "owner", resourceId });
  });

  it("DecisionHistoryUnavailableResponse encodes the tag and `event`, never `cause`", () => {
    const error = new DecisionHistoryUnavailable({ event: "check", cause: "store down" });
    const encoded = Schema.encodeSync(DecisionHistoryUnavailableResponse)(error);
    expect(encoded).toEqual({ _tag: "DecisionHistoryUnavailable", event: "check" });
  });

  it("CustomPredicateErrorResponse encodes the tag and `name`, never `reason`", () => {
    const error = new CustomPredicateError({ name: "isBusinessHours", reason: "threw: TypeError boom" });
    const encoded = Schema.encodeSync(CustomPredicateErrorResponse)(error);
    expect(encoded).toEqual({ _tag: "CustomPredicateError", name: "isBusinessHours" });
  });

  it("SignatureHistoryUnavailableResponse encodes the tag, subjectId and resourceId, never `cause`", () => {
    const error = new SignatureHistoryUnavailable({ subjectId, resourceId, cause: "store down" });
    const encoded = Schema.encodeSync(SignatureHistoryUnavailableResponse)(error);
    expect(encoded).toEqual({ _tag: "SignatureHistoryUnavailable", subjectId, resourceId });
  });

  it("AttributeResolveErrorResponse encodes the tag and `attribute`, never `cause`", () => {
    const error = new AttributeResolveError({ attribute: "clearance", cause: "postgres://user:pw@db" });
    const encoded = Schema.encodeSync(AttributeResolveErrorResponse)(error);
    expect(encoded).toEqual({ _tag: "AttributeResolveError", attribute: "clearance" });
  });
});

/**
 * Characterization of the whole closed domain (ARCH-04 T1). Both tables below
 * are read off `everyHttpEnforcementFailure`, whose mapped type makes a
 * missing tag a compile error, so these tests cannot silently stop covering a
 * tag. The *expected* values are written out by hand, never derived from the
 * code under test: they are BEH-QD-177's table and the disclosure review's
 * per-tag field lists.
 */
const wireSchemaByTag = {
  AccessDenied: AccessDeniedRefused,
  UndischargedObligation: UndischargedObligationRefused,
  AttributeResolveError: AttributeResolveErrorResponse,
  RelationshipResolveError: RelationshipResolveErrorResponse,
  DecisionHistoryUnavailable: DecisionHistoryUnavailableResponse,
  CustomPredicateError: CustomPredicateErrorResponse,
  SignatureHistoryUnavailable: SignatureHistoryUnavailableResponse,
  MissingAction: MissingActionResponse,
  MissingResource: MissingResourceResponse,
  MissingResourceId: MissingResourceIdResponse,
  PolicyTooDeep: PolicyTooDeepResponse,
  SubjectExtractionFailed: SubjectExtractionRefused,
} as const;

describe("the two routing shapes", () => {
  it("answer the same status for every tag", () => {
    const tags = [
      "AccessDenied",
      "UndischargedObligation",
      "AttributeResolveError",
      "RelationshipResolveError",
      "DecisionHistoryUnavailable",
      "CustomPredicateError",
      "SignatureHistoryUnavailable",
      "MissingAction",
      "MissingResource",
      "MissingResourceId",
      "PolicyTooDeep",
    ] as const;
    for (const tag of tags) {
      const status = toResponse(everyHttpEnforcementFailure[tag]()).status;
      expect(HttpApiSchema.getStatusErrorSchema(wireSchemaByTag[tag]), tag).toBe(status);
    }
    expect(HttpApiSchema.getStatusErrorSchema(wireSchemaByTag.SubjectExtractionFailed)).toBe(502);
  });
});

describe("every HttpApi wire schema encodes only its declared fields", () => {
  const expectedKeys = {
    AccessDenied: ["_tag", "policyTag", "reason", "subjectId"],
    UndischargedObligation: ["_tag"],
    AttributeResolveError: ["_tag", "attribute"],
    RelationshipResolveError: ["_tag", "relation", "resourceId"],
    DecisionHistoryUnavailable: ["_tag", "event"],
    CustomPredicateError: ["_tag", "name"],
    SignatureHistoryUnavailable: ["_tag", "resourceId", "subjectId"],
    MissingAction: ["_tag", "expected"],
    MissingResource: ["_tag", "attribute"],
    MissingResourceId: ["_tag", "relation"],
    PolicyTooDeep: ["_tag", "maxDepth"],
    SubjectExtractionFailed: ["_tag"],
  } as const;

  for (const tag of Object.keys(expectedKeys) as ReadonlyArray<keyof typeof expectedKeys>) {
    it(`${tag}: exact key set, and none of the sensitive values`, () => {
      const encoded = Schema.encodeUnknownSync(wireSchemaByTag[tag])(everyHttpEnforcementFailure[tag]());
      expect(Object.keys(encoded).sort()).toEqual([...expectedKeys[tag]]);
      const json = JSON.stringify(encoded);
      for (const leaked of ["postgres://", "trace", "TypeError", "obligationIds", "token service"]) {
        expect(json, `${tag} leaked ${leaked}`).not.toContain(leaked);
      }
    });
  }
});
