/**
 * Record builders for the devtools tests.
 *
 * Every test in this package needs `StoredRecord`s and none of them should need
 * an evaluator to get one — the model's whole contract is that it consumes
 * records, so building them directly is testing it at its actual boundary. The
 * few tests that *do* want a real evaluation (the end-to-end ones) call
 * `evaluate` and let a sink produce the record, which is a different and
 * deliberately smaller set.
 */
import {
  Allow,
  Decided,
  DecisionRecord,
  Deny,
  Failed,
  hasPermission,
  makeSubjectId,
  MissingResource,
  ObligationRecord,
  permission,
  stampRecord,
} from "@qadi/core";
import type {
  EvaluationError,
  ObligationOutcome,
  Policy,
  StoredRecord,
  Trace,
} from "@qadi/core";

export const read = permission("doc", "read");
export const readPolicy: Policy = hasPermission(read);

/** A minimal allowing trace for the policy above. */
export const allowTrace: Trace = {
  policyTag: "HasPermission",
  allowed: true,
  children: [],
  obligations: [],
};

export const denyTrace: Trace = {
  policyTag: "HasPermission",
  allowed: false,
  reason: "the subject does not hold doc:read",
  children: [],
  obligations: [],
};

export const allow = (options?: {
  readonly evaluationId?: string;
  readonly subjectId?: string;
  readonly durationMillis?: number;
  readonly trace?: Trace;
  readonly visibleFields?: ReadonlyArray<string> | undefined;
  readonly obligations?: ReadonlyArray<Allow["obligations"][number]>;
}): Allow =>
  new Allow({
    evaluationId: options?.evaluationId ?? "ev-1",
    subjectId: makeSubjectId(options?.subjectId ?? "alice"),
    durationMillis: options?.durationMillis ?? 1,
    trace: options?.trace ?? allowTrace,
    visibleFields: options?.visibleFields,
    obligations: options?.obligations ?? [],
  });

export const deny = (options?: {
  readonly evaluationId?: string;
  readonly subjectId?: string;
  readonly reason?: string;
  readonly trace?: Trace;
}): Deny =>
  new Deny({
    evaluationId: options?.evaluationId ?? "ev-1",
    subjectId: makeSubjectId(options?.subjectId ?? "alice"),
    durationMillis: 1,
    trace: options?.trace ?? denyTrace,
    reason: options?.reason ?? "the subject does not hold doc:read",
  });

/** A `Decision` record, stamped. The workhorse of these tests. */
export const decisionRecord = (options?: {
  readonly evaluationId?: string;
  readonly at?: number;
  readonly environment?: string;
  readonly policy?: Policy;
  readonly action?: string;
  readonly resource?: Record<string, unknown>;
  readonly cache?: DecisionRecord["cache"];
  readonly outcome?: DecisionRecord["outcome"];
}): StoredRecord =>
  stampRecord(
    new DecisionRecord({
      evaluationId: options?.evaluationId ?? "ev-1",
      at: options?.at ?? 1_000,
      policy: options?.policy ?? readPolicy,
      ...(options?.resource === undefined ? {} : { resource: options.resource }),
      ...(options?.action === undefined ? {} : { action: options.action }),
      ...(options?.cache === undefined ? {} : { cache: options.cache }),
      outcome:
        options?.outcome ?? new Decided({ decision: allow({ evaluationId: options?.evaluationId ?? "ev-1" }) }),
    }),
    options?.environment ?? "Server",
  );

/** A `Decision` record whose evaluation broke. Not a denial — INV-QD-006. */
export const failedRecord = (options?: {
  readonly evaluationId?: string;
  readonly at?: number;
  readonly environment?: string;
  readonly error?: EvaluationError;
}): StoredRecord =>
  decisionRecord({
    ...(options?.evaluationId === undefined ? {} : { evaluationId: options.evaluationId }),
    ...(options?.at === undefined ? {} : { at: options.at }),
    ...(options?.environment === undefined ? {} : { environment: options.environment }),
    outcome: new Failed({
      error: options?.error ?? new MissingResource({ attribute: "doc.ownerId" }),
    }),
  });

export const obligationRecord = (options?: {
  readonly evaluationId?: string;
  readonly at?: number;
  readonly environment?: string;
  readonly outcome?: ObligationOutcome;
  readonly obligationIds?: ReadonlyArray<string>;
}): StoredRecord =>
  stampRecord(
    new ObligationRecord({
      evaluationId: options?.evaluationId ?? "ev-1",
      at: options?.at ?? 1_001,
      outcome: options?.outcome ?? "Discharged",
      obligationIds: options?.obligationIds ?? ["audit"],
    }),
    options?.environment ?? "Server",
  );
