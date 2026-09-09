/**
 * Shared state for a scenario, ported from the Cucumber-CLI `QadiWorld` class.
 *
 * Where `QadiWorld` was a mutable class instance Cucumber constructed fresh per
 * scenario, this is a `Context.Service` holding one `Ref` of the same field set
 * — the shape ADR-EC-009 requires for anything shared across a Scenario's
 * steps under `@effect-cucumber/vitest`. `Bridge.ts` carries the six methods
 * that used to live on the class; the `*GivenSteps.ts`/`*WhenSteps.ts`/
 * `*ThenSteps.ts` modules are the step-definition vocabulary, split by domain
 * so each Feature file's runner only registers the step patterns it uses, that
 * read and write this `Ref`.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Ref from "effect/Ref";
import type * as Types from "effect/Types";
import { isAllowed, makeSubject } from "@qadi/core";
import type {
  ActedEventInput,
  AuthSubject,
  Decision,
  Policy,
  Predicate,
  RelationshipEdgeInput,
  SignatureInput,
  Trace,
} from "@qadi/core";

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
  readonly traceReason: string | undefined;
  readonly deniedLabels: ReadonlyArray<string>;
  readonly visibleFields: ReadonlyArray<string> | undefined;
  readonly obligations: ReadonlyArray<string>;
  /** The `_tag` of the error enforcement produced, when it produced one. */
  readonly failure: string | undefined;
}

export const NO_OUTCOME: Outcome = {
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

export interface WorldState {
  readonly subjectId: string;
  readonly roles: ReadonlyArray<string>;
  readonly permissions: ReadonlyArray<`${string}:${string}`>;
  readonly attributes: Record<string, unknown>;
  readonly resolvedAttributes: Record<string, unknown>;
  /**
   * Known edges. Defaults to a wired but **empty** store, not to an unwired
   * port — every scenario that adds no edge still expects a store that looked
   * and found nothing. `undefined` means unwired, as it does for `events`, and
   * the two produce different denials.
   */
  readonly relationships: ReadonlyArray<RelationshipEdgeInput> | undefined;
  readonly resource: Record<string, unknown> | undefined;
  readonly action: string | undefined;
  /** Set when a scenario supplies a handler for the duties a decision carries. */
  readonly handlesObligations: boolean;
  /** What a supplied handler was actually asked to discharge. */
  readonly discharged: ReadonlyArray<string>;
  /** Whether the effect behind `enforce` was started. */
  readonly workRan: boolean;
  /** Past events. Undefined means unwired. */
  readonly events: ReadonlyArray<ActedEventInput> | undefined;
  /**
   * Registered `hasCustom` answers, by name. `undefined` means no registry is
   * wired at all — `CustomPredicateNone`'s fail-closed default. A name present
   * here answers as recorded; a name absent from a *wired* table errors,
   * never denies (BEH-QD-247).
   */
  readonly customPredicates: Record<string, boolean> | undefined;
  /**
   * On-file signatures. `undefined` means no store is wired at all —
   * `SignatureHistoryNone`'s fail-closed default, the same "unwired" meaning
   * `events` carries for `DecisionHistory`.
   */
  readonly signatures: ReadonlyArray<SignatureInput> | undefined;
  /** Set when a scenario wants the history store to be down rather than absent. */
  readonly historyUnreachable: boolean;
  /**
   * Set when a scenario asks for concurrent evaluation.
   *
   * `undefined` is not "sequential" — it is the key being absent from
   * `EvaluateOptions` entirely, so a scenario that never mentions concurrency
   * evaluates exactly as it did before the option existed (ADR-QD-026).
   */
  readonly concurrency: Types.Concurrency | undefined;
  readonly outcome: Outcome;
  /** Candidates for a subject-set review, in the order they were given. */
  readonly candidates: ReadonlyArray<{
    readonly id: string;
    readonly roles: ReadonlyArray<string>;
    readonly permissions: ReadonlyArray<`${string}:${string}`>;
  }>;
  /**
   * Candidate ids whose attribute lookup fails outright, rather than
   * resolving to a value (issue #107: `decideSubjects`/`filterSubjects` now
   * accumulate a per-candidate failure instead of discarding the whole
   * review).
   */
  readonly brokenCandidates: ReadonlyArray<string>;
  /** Every candidate and the decision it received. */
  readonly review: ReadonlyArray<Reviewed>;
  /** The candidates `filterSubjects` kept, in order. */
  readonly answer: ReadonlyArray<string>;
  /** Candidate ids `decideSubjects`/`filterSubjects` could not evaluate at all. */
  readonly failedCandidates: ReadonlyArray<string>;
  /** The filter a policy compiled to, when it compiled. */
  readonly predicate: Predicate | undefined;
  /** The policy tag compilation refused, when it refused. */
  readonly refusedTag: string | undefined;
  /** The English rendering of a policy, for the explanation scenarios. */
  readonly explanation: string | undefined;
  /** Set by serialization scenarios. */
  readonly serialized: string | undefined;
  readonly restored: Policy | undefined;
}

export const initialWorldState: WorldState = {
  subjectId: "alice",
  roles: [],
  permissions: [],
  attributes: {},
  resolvedAttributes: {},
  relationships: [],
  resource: undefined,
  action: undefined,
  handlesObligations: false,
  discharged: [],
  workRan: false,
  events: undefined,
  customPredicates: undefined,
  signatures: undefined,
  historyUnreachable: false,
  concurrency: undefined,
  outcome: NO_OUTCOME,
  candidates: [],
  brokenCandidates: [],
  review: [],
  answer: [],
  failedCandidates: [],
  predicate: undefined,
  refusedTag: undefined,
  explanation: undefined,
  serialized: undefined,
  restored: undefined,
};

/**
 * Splits a `"resource:action"` permission key into its two halves.
 *
 * Shared so a malformed row fails the same way — same message, same halves
 * validated — no matter which step definition parses it.
 */
export const parsePermissionKey = (key: string): readonly [string, string] => {
  const [resource, action] = key.split(":");
  if (resource === undefined || action === undefined) {
    throw new Error(`malformed permission key: ${key}`);
  }
  return [resource, action];
};

export const subjectOf = (w: WorldState): AuthSubject =>
  makeSubject({
    id: w.subjectId,
    roles: w.roles,
    permissions: w.permissions,
    attributes: w.attributes,
  });

/**
 * The labels of every refusing `Labeled` node, in pre-order.
 *
 * A pre-order walk rather than a single value: a denial can sit inside several
 * labelled ancestors, and the outermost is not always the interesting one.
 */
export const deniedLabels = (trace: Trace): ReadonlyArray<string> => [
  ...(!trace.allowed && trace.label !== undefined ? [trace.label] : []),
  ...trace.children.flatMap(deniedLabels),
];

/** Renders an `Outcome`'s decision fields as JSON, for assertion failure messages. */
export const describeOutcome = (s: WorldState): string =>
  JSON.stringify({
    allowed: s.outcome.allowed,
    denied: s.outcome.denied,
    errored: s.outcome.errored,
    reason: s.outcome.reason,
  });

export const toOutcome = (decision: Decision): Outcome => ({
  allowed: isAllowed(decision),
  denied: !isAllowed(decision),
  errored: false,
  reason: decision._tag === "Deny" ? decision.reason : undefined,
  traceReason: decision.trace.reason,
  deniedLabels: deniedLabels(decision.trace),
  visibleFields: decision._tag === "Allow" ? decision.visibleFields : undefined,
  obligations: decision._tag === "Allow" ? decision.obligations.map((o) => o.id) : [],
  failure: undefined,
});

export interface WorldShape {
  readonly state: Ref.Ref<WorldState>;
}

export class World extends Context.Service<World, WorldShape>()("features/World") {}

export const readState = Effect.fn("features.readState")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

export const patch = Effect.fn("features.patch")(function* (
  fn: (s: WorldState) => Partial<WorldState>,
) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...fn(s) }));
});

/** Every runner file's `Before` hook calls this — the counterpart of `QadiWorld.reset()`. */
export const resetWorld = Effect.fn("features.resetWorld")(function* () {
  const { state } = yield* World;
  yield* Ref.set(state, initialWorldState);
});
