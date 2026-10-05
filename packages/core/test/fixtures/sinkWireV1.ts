/**
 * Version-1 decision-record bytes, as literals: the contract a reader keeps
 * honouring after the wire moved on.
 *
 * Wire version 1 is the record wire with no `version` key, written by every
 * `@qadi/core` before ARCH-15. Audit rows are durable, so a v1 row written in
 * 2026 must still read in 2030 (ADR-QD-096, D-15-d): these bytes are decoded
 * by the tests forever, and are never re-derived from the current encoder.
 *
 * The first three were pinned at commit `1caf04c`, before the decision codec
 * moved into `DecisionWire.ts`; the rest were captured from the encoder at
 * `899465c`, the last commit that wrote v1 by default. The `PRE05_*` rows are
 * hand-written: what `@qadi/audit` 0.3.x and 0.4.x persisted, before
 * ADR-QD-060 dropped the error's `code` from the wire in 0.5.0.
 */

/** An `Allow` with `visibleFields` and an obligation (`1caf04c`). */
export const V1_DECIDED_ALLOW =
  '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"decided":{"_tag":"Allow","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":true,"children":[],"visibleFields":["id"],"obligations":[]},"visibleFields":["id"],"obligations":[{"id":"audit.log","attributes":{},"advisory":false}]}}';

/** An `Allow` with no `visibleFields`, meaning everything is visible (`1caf04c`). */
export const V1_DECIDED_ALLOW_ALL_FIELDS =
  '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"decided":{"_tag":"Allow","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":true,"children":[],"obligations":[]},"obligations":[]}}';

/** A `Deny` with its reason (`1caf04c`). */
export const V1_DECIDED_DENY =
  '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"decided":{"_tag":"Deny","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":false,"reason":"no","children":[],"obligations":[]},"obligations":[],"reason":"no"}}';

/** A `Failed` record whose error is `MissingResource("owner")`. */
export const V1_FAILED_MISSING_RESOURCE =
  '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"failed":{"_tag":"MissingResource","attribute":"owner"}}';

/** A `Failed` record whose resolver error's cause is `new Error("db down")`. */
export const V1_FAILED_ATTRIBUTE_ERROR_CAUSE =
  '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"failed":{"_tag":"AttributeResolveError","attribute":"clearance","cause":{"name":"Error","message":"db down"}}}';

/** An obligation record. */
export const V1_OBLIGATIONS =
  '{"_tag":"Obligations","evaluationId":"g","at":1,"outcome":"Discharged","obligationIds":["audit.log"]}';

/** A decision carrying every optional envelope field: `resource`, `action` and `cache`. */
export const V1_DECISION_FULL_ENVELOPE =
  '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"resource":{"id":"doc-1","owner":"u1"},"action":"read","cache":"hit","decided":{"_tag":"Allow","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":true,"children":[],"obligations":[]},"obligations":[]}}';

/** {@link V1_FAILED_MISSING_RESOURCE} as 0.3.x/0.4.x wrote it: the error still carries its `code`. */
export const V1_PRE05_FAILED_WITH_CODE =
  '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"failed":{"_tag":"MissingResource","attribute":"owner","code":"ACL004"}}';

/** A pre-0.5 resolver error: a `code`, and a `cause` rendered to a string by the deleted `renderCause`. */
export const V1_PRE05_FAILED_RENDERED_CAUSE =
  '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"failed":{"_tag":"AttributeResolveError","attribute":"clearance","cause":"Error: db down","code":"ACL002"}}';
