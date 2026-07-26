import { World } from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";
import type {
  AuthSubject,
  Decision,
  EvaluateOptions,
  Obligation,
  Policy,
  Predicate,
  Trace,
} from "@qadi/core";
import {
  DecisionHistory,
  DecisionHistoryUnavailable,
  decideSubjects,
  filterSubjects,
  enforce,
  evaluate,
  evaluatePredicate,
  explain,
  isAllowed,
  renderExplanation,
  toPredicate,
  makeSubject,
  toJson,
  fromJson,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import type { Concurrency } from "effect/Types";
import { qadiReviewLayer, qadiTestLayer } from "@qadi/testing";
import * as Effect from "effect/Effect";

/** One row of a subject-set review. */
export interface Reviewed {
  readonly id: string;
  readonly allowed: boolean;
  readonly reason: string | undefined;
  readonly obligations: ReadonlyArray<string>;
}

/** What a Then step can assert on. */
export interface Outcome {
  readonly allowed: boolean;
  readonly denied: boolean;
  readonly errored: boolean;
  readonly reason: string | undefined;
  /**
   * The root trace node's own sentence.
   *
   * Distinct from `reason`, which a denial always carries: a `Rules` node
   * carries one when it *allows* too, naming the row that permitted
   * (ADR-QD-023). A rule table's first question is which row hit.
   */
  readonly traceReason: string | undefined;
  /**
   * The label of every `Labeled` node that refused, outermost first.
   *
   * Attribution cannot come off `reason`. `Labeled` copies its child's sentence
   * verbatim and carries the label in a field of its own, `Not` passes none at
   * all, and `AllOf` propagates the child's — so a denial's reason names the
   * leaf that refused and never the branch it sat in. A label is a property of
   * the trace ([BEH-QD-039](../../spec/behaviors/05-evaluator.md)).
   *
   * Only refusing nodes are collected. An allowing label names nothing, because
   * an `allOf` needs every child to allow.
   */
  readonly deniedLabels: ReadonlyArray<string>;
  readonly visibleFields: ReadonlyArray<string> | undefined;
  readonly obligations: ReadonlyArray<string>;
  /** The `_tag` of the error enforcement produced, when it produced one. */
  readonly failure: string | undefined;
}

const NO_OUTCOME: Outcome = {
  allowed: false,
  denied: false,
  errored: false,
  reason: undefined,
  traceReason: undefined,
  deniedLabels: [],
  visibleFields: undefined,
  obligations: [],
  failure: undefined,
};

/**
 * Shared state for a scenario.
 *
 * Holds the subject under test and the resolver fixtures, and builds the layer
 * on demand so that Given steps can keep amending the subject right up until
 * the When step runs.
 */
export class QadiWorld extends World {
  subjectId = "alice";
  roles: Array<string> = [];
  permissions: Array<`${string}:${string}`> = [];
  attributes: Record<string, unknown> = {};
  resolvedAttributes: Record<string, unknown> = {};
  relationships: Array<readonly [string, string, string]> = [];
  resource: Record<string, unknown> | undefined = undefined;
  action: string | undefined = undefined;
  /** Set when a scenario supplies a handler for the duties a decision carries. */
  handlesObligations = false;
  /** What a supplied handler was actually asked to discharge. */
  discharged: Array<string> = [];
  /** Whether the effect behind `enforce` was started. */
  workRan = false;
  /** Past events as `[subjectId, event, resourceId]`. Undefined means unwired. */
  events: Array<readonly [string, string, string]> | undefined = undefined;
  /** Set when a scenario wants the history store to be down rather than absent. */
  historyUnreachable = false;
  /**
   * Set when a scenario asks for concurrent evaluation.
   *
   * `undefined` is not "sequential" — it is the key being absent from
   * `EvaluateOptions` entirely, so a scenario that never mentions concurrency
   * evaluates exactly as it did before the option existed (ADR-QD-026).
   */
  concurrency: Concurrency | undefined = undefined;

  outcome: Outcome = NO_OUTCOME;
  /** Candidates for a subject-set review, in the order they were given. */
  candidates: Array<{
    readonly id: string;
    readonly roles: ReadonlyArray<string>;
    readonly permissions: ReadonlyArray<`${string}:${string}`>;
  }> = [];
  /** Every candidate and the decision it received. */
  review: Array<Reviewed> = [];
  /** The candidates `filterSubjects` kept, in order. */
  answer: Array<string> = [];
  /** The filter a policy compiled to, when it compiled. */
  predicate: Predicate | undefined = undefined;
  /** The policy tag compilation refused, when it refused. */
  refusedTag: string | undefined = undefined;
  /** The English rendering of a policy, for the explanation scenarios. */
  explanation: string | undefined = undefined;
  /** Set by serialization scenarios. */
  serialized: string | undefined = undefined;
  restored: Policy | undefined = undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }

  reset(): void {
    this.subjectId = "alice";
    this.roles = [];
    this.permissions = [];
    this.attributes = {};
    this.resolvedAttributes = {};
    this.relationships = [];
    this.resource = undefined;
    this.action = undefined;
    this.handlesObligations = false;
    this.discharged = [];
    this.workRan = false;
    this.events = undefined;
    this.historyUnreachable = false;
    this.concurrency = undefined;
    this.explanation = undefined;
    this.outcome = NO_OUTCOME;
    this.candidates = [];
    this.review = [];
    this.answer = [];
    this.predicate = undefined;
    this.refusedTag = undefined;
    this.serialized = undefined;
    this.restored = undefined;
  }

  get subject(): AuthSubject {
    return makeSubject({
      id: this.subjectId,
      roles: this.roles,
      permissions: this.permissions,
      attributes: this.attributes,
    });
  }

  /**
   * Describes a policy without evaluating it.
   *
   * No layer, no runtime, no subject — the absence of all three is the point
   * (ADR-QD-027), and this method taking no services is where that shows in the
   * test suite rather than only in the type.
   */
  describe(policy: Policy): void {
    this.explanation = renderExplanation(explain(policy));
  }

  /** Runs a policy and records the outcome for the Then steps. */
  run(policy: Policy): void {
    // Keys are omitted rather than set to undefined, so a scenario that never
    // mentions a resource or an action evaluates exactly as it did before
    // either existed.
    const options: EvaluateOptions = {
      ...(this.resource === undefined ? {} : { resource: this.resource }),
      ...(this.action === undefined ? {} : { action: this.action }),
      ...(this.concurrency === undefined ? {} : { concurrency: this.concurrency }),
    };

    const program = evaluate(policy, options).pipe(
      Effect.provide(
        qadiTestLayer(this.subject, {
          attributes: this.resolvedAttributes,
          relationships: this.relationships,
          // A store that is *down* and a port that is *unwired* are different
          // answers, and only one of them is a denial.
          ...(this.historyUnreachable
            ? { decisionHistory: unreachableHistory }
            : this.events === undefined
              ? {}
              : { history: this.events }),
        }),
      ),
    );

    const result = Effect.runSyncExit(program);

    if (result._tag === "Failure") {
      this.outcome = { ...NO_OUTCOME, errored: true };
      return;
    }

    this.outcome = toOutcome(result.value);
  }

  /**
   * Runs a policy as a guard over some work, recording whether the work ran.
   *
   * Distinct from `run` because obligations are where reporting and enforcing
   * diverge: `evaluate` hands the duty back, `enforce` refuses to proceed on
   * one nobody discharged.
   */
  runGuarded(policy: Policy): void {
    const work = Effect.sync(() => {
      this.workRan = true;
    });

    const handler = (obligations: ReadonlyArray<Obligation>) =>
      Effect.sync(() => {
        for (const o of obligations) this.discharged.push(o.id);
      });

    const guarded = work.pipe(
      enforce(policy, this.handlesObligations ? { onObligations: handler } : {}),
      Effect.provide(qadiTestLayer(this.subject, {})),
    );

    const result = Effect.runSync(Effect.result(guarded));
    this.outcome =
      result._tag === "Failure"
        ? { ...NO_OUTCOME, errored: true, failure: result.failure._tag }
        : { ...NO_OUTCOME, allowed: true };
  }

  /**
   * Runs a policy across every candidate, recording the whole review.
   *
   * Note what is *not* provided: no current subject. A review query is asked by
   * nobody, and requiring one would mean wiring a value that could not affect
   * any answer (ADR-QD-022).
   */
  runSubjectSet(policy: Policy): void {
    const options: EvaluateOptions =
      this.resource === undefined ? {} : { resource: this.resource };

    const subjects = this.candidates.map((c) =>
      makeSubject({ id: c.id, roles: c.roles, permissions: c.permissions }),
    );

    // Both entry points, every scenario. `filterSubjects` is derived from
    // `decideSubjects`, so running the pair here means every scenario also
    // asserts they agree.
    const program = Effect.all([
      decideSubjects(policy, subjects, options),
      filterSubjects(policy, subjects, options),
    ]).pipe(Effect.provide(qadiReviewLayer()));

    const [reviewed, kept] = Effect.runSync(program);

    this.review = reviewed.map(({ subject, decision }) => ({
      id: subject.id,
      allowed: isAllowed(decision),
      reason: decision._tag === "Deny" ? decision.reason : undefined,
      obligations:
        decision._tag === "Allow" ? decision.obligations.map((o) => o.id) : [],
    }));
    this.answer = kept.map((s) => s.id);
  }

  /**
   * Compiles a policy into a row filter, recording the predicate or the refusal.
   *
   * Note the environment: no `EvaluationId`, because no decision is produced.
   * Translation reads the subject and folds; it never sees a row.
   */
  compile(policy: Policy): void {
    const program = toPredicate(policy).pipe(
      Effect.provide(qadiTestLayer(this.subject, { attributes: this.resolvedAttributes })),
    );

    const result = Effect.runSync(Effect.result(program));

    if (result._tag === "Failure") {
      this.predicate = undefined;
      this.refusedTag =
        result.failure._tag === "qadi/PolicyNotTranslatable"
          ? result.failure.policyTag
          : result.failure._tag;
      return;
    }
    this.predicate = result.success;
    this.refusedTag = undefined;
  }

  /**
   * Runs the compiled filter and the evaluator over the same rows.
   *
   * INV-QD-018 as a scenario: two interpreters over one tree, compared rather
   * than argued about.
   */
  agreesWith(policy: Policy, rows: ReadonlyArray<Record<string, unknown>>): boolean {
    if (this.predicate === undefined) throw new Error("nothing was compiled");
    const compiled = this.predicate;
    return rows.every((row) => {
      const decision = Effect.runSync(
        evaluate(policy, { resource: row }).pipe(
          Effect.provide(
            qadiTestLayer(this.subject, { attributes: this.resolvedAttributes }),
          ),
        ),
      );
      return evaluatePredicate(compiled, row) === isAllowed(decision);
    });
  }

  /** Serializes then deserializes a policy, recording both sides. */
  roundTrip(policy: Policy): void {
    const json = Effect.runSync(toJson(policy));
    this.serialized = json;
    this.restored = Effect.runSync(fromJson(json));
  }
}

const unreachableHistory = Layer.succeed(DecisionHistory, {
  hasActed: (query) =>
    Effect.fail(new DecisionHistoryUnavailable({ event: query.event, cause: "down" })),
});

/**
 * The labels of every refusing `Labeled` node, in pre-order.
 *
 * A pre-order walk rather than a single value: a denial can sit inside several
 * labelled ancestors, and the outermost is not always the interesting one.
 */
const deniedLabels = (trace: Trace): ReadonlyArray<string> => [
  ...(!trace.allowed && trace.label !== undefined ? [trace.label] : []),
  ...trace.children.flatMap(deniedLabels),
];

const toOutcome = (decision: Decision): Outcome => ({
  allowed: isAllowed(decision),
  denied: !isAllowed(decision),
  errored: false,
  reason: decision._tag === "Deny" ? decision.reason : undefined,
  traceReason: decision.trace.reason,
  deniedLabels: deniedLabels(decision.trace),
  visibleFields: decision._tag === "Allow" ? decision.visibleFields : undefined,
  obligations:
    decision._tag === "Allow" ? decision.obligations.map((o) => o.id) : [],
  failure: undefined,
});
