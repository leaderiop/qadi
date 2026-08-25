/**
 * `SinkRecord`/`Decision` builders for this package's tests — mirrors
 * `@qadi/devtools`'s `test/helpers.ts`: none of these tests need a real
 * evaluator to get a record, since the pipeline's whole contract is that it
 * consumes `SinkRecord`s.
 */
import {
  Allow,
  Decided,
  DecisionRecord,
  Failed,
  hasPermission,
  makeSubjectId,
  MissingResource,
  ObligationRecord,
  permission,
} from "@qadi/core";
import type { ObligationOutcome, Policy, SinkRecord, Trace } from "@qadi/core";

export const read = permission("doc", "read");
export const readPolicy: Policy = hasPermission(read);

export const allowTrace: Trace = {
  policyTag: "HasPermission",
  allowed: true,
  children: [],
  obligations: [],
};

export const decisionRecord = (options?: {
  readonly evaluationId?: string;
  readonly at?: number;
  readonly subjectId?: string;
  readonly policy?: Policy;
  readonly resource?: Record<string, unknown>;
}): SinkRecord =>
  new DecisionRecord({
    evaluationId: options?.evaluationId ?? "ev-1",
    at: options?.at ?? 1_000,
    subjectId: makeSubjectId(options?.subjectId ?? "alice"),
    policy: options?.policy ?? readPolicy,
    ...(options?.resource === undefined ? {} : { resource: options.resource }),
    outcome: new Decided({
      decision: new Allow({
        evaluationId: options?.evaluationId ?? "ev-1",
        subjectId: makeSubjectId(options?.subjectId ?? "alice"),
        durationMillis: 1,
        trace: allowTrace,
        visibleFields: undefined,
        obligations: [],
      }),
    }),
  });

export const failedRecord = (options?: {
  readonly evaluationId?: string;
  readonly at?: number;
  readonly subjectId?: string;
}): SinkRecord =>
  new DecisionRecord({
    evaluationId: options?.evaluationId ?? "ev-2",
    at: options?.at ?? 2_000,
    subjectId: makeSubjectId(options?.subjectId ?? "alice"),
    policy: readPolicy,
    outcome: new Failed({ error: new MissingResource({ attribute: "doc.ownerId" }) }),
  });

export const obligationRecord = (options?: {
  readonly evaluationId?: string;
  readonly at?: number;
  readonly outcome?: ObligationOutcome;
}): SinkRecord =>
  new ObligationRecord({
    evaluationId: options?.evaluationId ?? "ev-3",
    at: options?.at ?? 3_000,
    outcome: options?.outcome ?? "Discharged",
    obligationIds: ["audit.log"],
  });
