/**
 * `SinkRecord`/`Decision` builders for this package's tests — mirrors
 * `@qadi/devtools`'s `test/helpers.ts`: none of these tests need a real
 * evaluator to get a record, since the pipeline's whole contract is that it
 * consumes `SinkRecord`s.
 */
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import {
  Allow,
  AttributeResolveError,
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

/** Isolates one test's counts from the process-wide registry every other test shares. */
export const isolatedMetrics = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provideService(Metric.MetricRegistry, new Map()),
    Effect.provideService(Metric.CurrentMetricAttributes, { test: "isolated" }),
  );

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
        trace: {
          ...allowTrace,
          policyTag: options?.policy?._tag ?? allowTrace.policyTag,
        },
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

/**
 * A `Failed` record whose resolver error carries `cause` — what an
 * attribute-store outage produces, and the position `encodeAuditEntry`'s guard
 * never walked before ARCH-09.
 */
export const failedWithCause = (cause: unknown, evaluationId = "poisoned"): SinkRecord =>
  new DecisionRecord({
    evaluationId,
    at: 2_000,
    subjectId: makeSubjectId("alice"),
    policy: readPolicy,
    outcome: new Failed({ error: new AttributeResolveError({ attribute: "clearance", cause }) }),
  });

/**
 * The error an axios-style HTTP client throws: an `Error` whose own enumerable
 * `config`/`request` properties reference each other (ARCH-09 probe 9).
 */
export const httpClientError = (): Error => {
  const config: { url: string; request?: unknown } = { url: "https://attributes.internal/x" };
  const request = { config };
  config.request = request;
  return Object.assign(new Error("Request failed with status code 503"), { config, request });
};

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
