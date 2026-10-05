/**
 * Version-2 decision-record bytes, as literals: the same records as
 * `sinkWireV1.ts`, carried as wire version 2 (ADR-QD-096).
 *
 * Version 2 adds `version: 2` to both envelope members and carries a
 * decision's outcome as one tagged value, `outcome: { _tag: "Decided",
 * decision } | { _tag: "Failed", error }`, where version 1 had two optional
 * fields. Hand-written from the v1 fixtures and the ADR, not captured from
 * the encoder, so the encoder is checked against them rather than the other
 * way round.
 */

/** An `Allow` with `visibleFields` and an obligation. */
export const V2_DECIDED_ALLOW =
  '{"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"outcome":{"_tag":"Decided","decision":{"_tag":"Allow","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":true,"children":[],"visibleFields":["id"],"obligations":[]},"visibleFields":["id"],"obligations":[{"id":"audit.log","attributes":{},"advisory":false}]}}}';

/** An `Allow` with no `visibleFields`, meaning everything is visible. */
export const V2_DECIDED_ALLOW_ALL_FIELDS =
  '{"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"outcome":{"_tag":"Decided","decision":{"_tag":"Allow","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":true,"children":[],"obligations":[]},"obligations":[]}}}';

/** A `Deny` with its reason. */
export const V2_DECIDED_DENY =
  '{"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"outcome":{"_tag":"Decided","decision":{"_tag":"Deny","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":false,"reason":"no","children":[],"obligations":[]},"obligations":[],"reason":"no"}}}';

/** A `Failed` record whose error is `MissingResource("owner")`. */
export const V2_FAILED_MISSING_RESOURCE =
  '{"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"outcome":{"_tag":"Failed","error":{"_tag":"MissingResource","attribute":"owner"}}}';

/** A `Failed` record whose resolver error's cause is `new Error("db down")`. */
export const V2_FAILED_ATTRIBUTE_ERROR_CAUSE =
  '{"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"outcome":{"_tag":"Failed","error":{"_tag":"AttributeResolveError","attribute":"clearance","cause":{"name":"Error","message":"db down"}}}}';

/** An obligation record. */
export const V2_OBLIGATIONS =
  '{"_tag":"Obligations","version":2,"evaluationId":"g","at":1,"outcome":"Discharged","obligationIds":["audit.log"]}';

/** A decision carrying every optional envelope field: `resource`, `action` and `cache`. */
export const V2_DECISION_FULL_ENVELOPE =
  '{"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"resource":{"id":"doc-1","owner":"u1"},"action":"read","cache":"hit","outcome":{"_tag":"Decided","decision":{"_tag":"Allow","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":true,"children":[],"obligations":[]},"obligations":[]}}}';
