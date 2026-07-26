import { World } from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";
import type {
  AuthSubject,
  Decision,
  EvaluateOptions,
  Obligation,
  Policy,
} from "@qadi/core";
import { enforce, evaluate, isAllowed, makeSubject, toJson, fromJson } from "@qadi/core";
import { qadiTestLayer } from "@qadi/testing";
import * as Effect from "effect/Effect";

/** What a Then step can assert on. */
export interface Outcome {
  readonly allowed: boolean;
  readonly denied: boolean;
  readonly errored: boolean;
  readonly reason: string | undefined;
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

  outcome: Outcome = NO_OUTCOME;
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
    this.outcome = NO_OUTCOME;
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

  /** Runs a policy and records the outcome for the Then steps. */
  run(policy: Policy): void {
    // Keys are omitted rather than set to undefined, so a scenario that never
    // mentions a resource or an action evaluates exactly as it did before
    // either existed.
    const options: EvaluateOptions = {
      ...(this.resource === undefined ? {} : { resource: this.resource }),
      ...(this.action === undefined ? {} : { action: this.action }),
    };

    const program = evaluate(policy, options).pipe(
      Effect.provide(
        qadiTestLayer(this.subject, {
          attributes: this.resolvedAttributes,
          relationships: this.relationships,
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

  /** Serializes then deserializes a policy, recording both sides. */
  roundTrip(policy: Policy): void {
    const json = Effect.runSync(toJson(policy));
    this.serialized = json;
    this.restored = Effect.runSync(fromJson(json));
  }
}

const toOutcome = (decision: Decision): Outcome => ({
  allowed: isAllowed(decision),
  denied: !isAllowed(decision),
  errored: false,
  reason: decision._tag === "Deny" ? decision.reason : undefined,
  visibleFields: decision._tag === "Allow" ? decision.visibleFields : undefined,
  obligations:
    decision._tag === "Allow" ? decision.obligations.map((o) => o.id) : [],
  failure: undefined,
});
