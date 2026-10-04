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
  allOf,
  anyOf,
  Decided,
  DecisionRecord,
  Deny,
  denyWhen,
  eq,
  Failed,
  gte,
  hasAction,
  hasAttribute,
  hasPermission,
  hasResourceAttribute,
  hasRole,
  labeled,
  literal,
  makeSubjectId,
  MissingResource,
  not,
  obligation,
  obliged,
  ObligationRecord,
  permission,
  permitWhen,
  rules,
  someMatch,
  stampRecord,
  subjectId,
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
  readonly subjectId?: string;
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
      subjectId: makeSubjectId(options?.subjectId ?? "alice"),
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
  readonly subjectId?: string;
  readonly error?: EvaluationError;
}): StoredRecord =>
  decisionRecord({
    ...(options?.evaluationId === undefined ? {} : { evaluationId: options.evaluationId }),
    ...(options?.at === undefined ? {} : { at: options.at }),
    ...(options?.environment === undefined ? {} : { environment: options.environment }),
    ...(options?.subjectId === undefined ? {} : { subjectId: options.subjectId }),
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

// ---------------------------------------------------------------------------
// ARCH-02 — chain builder and a seeded policy generator
// ---------------------------------------------------------------------------

/** An n-deep single-child chain, built iteratively so building cannot overflow. */
export const chain = <T>(wrap: (inner: T) => T, n: number, leaf: T): T => {
  let current = leaf;
  for (let i = 0; i < n; i++) current = wrap(current);
  return current;
};

/** A small deterministic PRNG (mulberry32), so no property-test dependency is needed. */
const prng = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * A pseudo-random `Policy` over the tags the remedy derivation distinguishes
 * (roles, permissions, attributes, `Not`, wrappers, combinators, rule tables).
 */
export const randomPolicy = (seed: number, depth = 4): Policy => {
  const next = prng(seed);
  const pick = (n: number): number => Math.floor(next() * n);
  const build = (remaining: number): Policy => {
    const leaves: ReadonlyArray<() => Policy> = [
      () => hasRole("editor"),
      () => hasPermission(read),
      () => hasAttribute("seniority", gte(3)),
      () => hasAttribute("tags", someMatch(eq(literal("a")))),
      () => hasAction("read"),
      () => hasResourceAttribute("ownerId", eq(subjectId())),
    ];
    const composites: ReadonlyArray<() => Policy> = [
      () => allOf(Array.from({ length: pick(4) }, () => build(remaining - 1))),
      () => anyOf(Array.from({ length: pick(4) }, () => build(remaining - 1))),
      () => not(build(remaining - 1)),
      () => labeled("l", build(remaining - 1)),
      () => obliged(obligation("audit.log"), build(remaining - 1)),
      () =>
        rules(
          Array.from({ length: pick(4) }, () =>
            pick(2) === 0 ? permitWhen(build(remaining - 1)) : denyWhen(build(remaining - 1)),
          ),
        ),
    ];
    const table = remaining <= 0 || pick(3) === 0 ? leaves : composites;
    const make = table[pick(table.length)];
    return make === undefined ? hasRole("editor") : make();
  };
  return build(depth);
};
