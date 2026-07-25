import { World } from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";
import type { AuthSubject, Decision, Policy } from "@guard/core";
import { evaluate, isAllowed, makeSubject, toJson, fromJson } from "@guard/core";
import { guardTestLayer } from "@guard/testing";
import * as Effect from "effect/Effect";

/** What a Then step can assert on. */
export interface Outcome {
  readonly allowed: boolean;
  readonly denied: boolean;
  readonly errored: boolean;
  readonly reason: string | undefined;
  readonly visibleFields: ReadonlyArray<string> | undefined;
}

const NO_OUTCOME: Outcome = {
  allowed: false,
  denied: false,
  errored: false,
  reason: undefined,
  visibleFields: undefined,
};

/**
 * Shared state for a scenario.
 *
 * Holds the subject under test and the resolver fixtures, and builds the layer
 * on demand so that Given steps can keep amending the subject right up until
 * the When step runs.
 */
export class GuardWorld extends World {
  subjectId = "alice";
  roles: Array<string> = [];
  permissions: Array<`${string}:${string}`> = [];
  attributes: Record<string, unknown> = {};
  resolvedAttributes: Record<string, unknown> = {};
  relationships: Array<readonly [string, string, string]> = [];
  resource: Record<string, unknown> | undefined = undefined;

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
    const program = evaluate(policy, {
      ...(this.resource === undefined ? {} : { resource: this.resource }),
    }).pipe(
      Effect.provide(
        guardTestLayer(this.subject, {
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
});
