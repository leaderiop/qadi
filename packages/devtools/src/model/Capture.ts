/**
 * Record what real resolvers answered, so a sweep can be run against it.
 *
 * The point is arithmetic. A what-if sweep runs one evaluation per edit, so a
 * subject with six grants is seven evaluations from one click — seven times the
 * lookups, against whatever store is behind the ports. Capturing once and
 * replaying six times is the same information for one round of I/O, and it is
 * the reason `LiveSource` is defensible at all rather than merely available.
 *
 * **A capture records answers, not calls.** `@qadi/testing`'s
 * `recordingAttributeResolver` records the attribute *name* per call, which
 * answers "was this consulted" and cannot answer "with what". This records the
 * pair, including failures, so a replay reproduces an outage as an outage
 * rather than as a miss.
 *
 * The fidelity of that reproduction is an agreement property in the family of
 * [INV-QD-018](../../../../spec/invariants.md) and INV-QD-038 — two paths
 * answering one question — and it is stated as
 * [INV-QD-043](../../../../spec/invariants.md) rather than assumed.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import {
  AttributeResolveError,
  AttributeResolver,
  CustomPredicate,
  CustomPredicateError,
  DecisionHistory,
  DecisionHistoryUnavailable,
  RelationshipResolveError,
  RelationshipResolver,
  SignatureHistory,
  SignatureHistoryUnavailable,
} from "@qadi/core";
import type {
  ActedQuery,
  ActedResult,
  AuthSubject,
  RelatedResult,
  RelationshipCheck,
  Resource,
  Signature,
  SignatureQuery,
  SubjectId,
} from "@qadi/core";
import type { EvaluationPorts } from "./SimulationInput.ts";

/**
 * One answer, as it was given.
 *
 * A closed union rather than a value beside an optional error: exactly one of
 * the two happened, and a shape admitting both or neither would put a "cannot
 * happen" branch in every replay.
 */
export type Answer<A> =
  | { readonly _tag: "Answered"; readonly value: A }
  | { readonly _tag: "Broke"; readonly message: string };

export interface CapturedAnswers {
  /** Keyed by `(subjectId, attribute)`. */
  readonly attributes: ReadonlyMap<string, Answer<unknown>>;
  /** Keyed by `(subjectId, relation, resourceId)` — never by relation alone. */
  readonly relationships: ReadonlyMap<string, Answer<RelatedResult>>;
  /** Keyed by `(subjectId, event, resourceId?)`, so "ever, at all" stays distinct. */
  readonly history: ReadonlyMap<string, Answer<ActedResult>>;
  /**
   * Keyed by `(subjectId, name, params)` — not by the resource, since a
   * `HasCustom` node's resource is arbitrary caller data rather than a single
   * id the way a relationship or history check's is. A capture taken against
   * more than one resource per (subject, name, params) triple would collapse
   * onto one answer; a simulation run fixes one resource for its duration, so
   * this does not arise in practice.
   */
  readonly custom: ReadonlyMap<string, Answer<boolean>>;
  /** Keyed by `(subjectId, resourceId?)` — the same pair `SignatureHistory.signaturesFor` itself takes. */
  readonly signatures: ReadonlyMap<string, Answer<ReadonlyArray<Signature>>>;
}

export const emptyAnswers: CapturedAnswers = {
  attributes: new Map(),
  relationships: new Map(),
  history: new Map(),
  custom: new Map(),
  signatures: new Map(),
};

/** How many answers a capture holds, for a panel that wants to say so. */
export const answerCount = (self: CapturedAnswers): number =>
  self.attributes.size +
  self.relationships.size +
  self.history.size +
  self.custom.size +
  self.signatures.size;

/**
 * Keys, written once and called from both sides.
 *
 * Two functions deriving one key is precisely the drift this codebase treats as
 * a defect — a capture and a replay that disagreed about a key would make
 * INV-QD-043 fail in a way no single test of either side could see. So there is
 * one of each, and the capture and the replay both call it.
 *
 * Every key includes the **subject**, because that is the axis a what-if sweep
 * varies: a capture taken for `alice` must not answer a question asked about
 * `bob` after her `editor` role was dropped.
 */
export const attributeKey = (subjectId: SubjectId, attribute: string): string =>
  JSON.stringify([subjectId, attribute]);

export const relationshipKey = (check: RelationshipCheck): string =>
  JSON.stringify([check.subjectId, check.relation, check.resourceId]);

export const historyKey = (query: ActedQuery): string =>
  JSON.stringify([query.subjectId, query.event, query.resourceId ?? null]);

export const customPredicateKey = (
  subjectId: SubjectId,
  name: string,
  params: unknown,
): string => JSON.stringify([subjectId, name, params]);

export const signatureHistoryKey = (query: SignatureQuery): string =>
  JSON.stringify([query.subjectId, query.resourceId ?? null]);

/**
 * Wraps live ports so every answer they give is recorded.
 *
 * The `Layer.build` + `Context.get` shape `decisionSinkAll` uses to wrap a
 * layer it was handed. State lives in this function's closure rather than the
 * layer's, so `answers` can read what the layer wrote — the same arrangement
 * `decisionSinkRing` uses, and the reason providing the returned layer twice
 * shares one capture.
 */
export const capturing = (
  ports: Layer.Layer<EvaluationPorts>,
): {
  readonly layer: Layer.Layer<EvaluationPorts>;
  readonly answers: Effect.Effect<CapturedAnswers>;
} => {
  const attributes = new Map<string, Answer<unknown>>();
  const relationships = new Map<string, Answer<RelatedResult>>();
  const history = new Map<string, Answer<ActedResult>>();
  const custom = new Map<string, Answer<boolean>>();
  const signatures = new Map<string, Answer<ReadonlyArray<Signature>>>();

  const layer = Layer.mergeAll(
    Layer.effect(
      AttributeResolver,
      Effect.gen(function* () {
        const context = yield* Layer.build(ports);
        const inner = Context.get(context, AttributeResolver);
        return {
          name: `${inner.name ?? "?"} (capturing)`,
          resolve: (subjectId: SubjectId, attribute: string) =>
            record(attributes, attributeKey(subjectId, attribute), inner.resolve(subjectId, attribute)),
        };
      }),
    ),
    Layer.effect(
      RelationshipResolver,
      Effect.gen(function* () {
        const context = yield* Layer.build(ports);
        const inner = Context.get(context, RelationshipResolver);
        return {
          name: `${inner.name ?? "?"} (capturing)`,
          check: (request: RelationshipCheck) =>
            record(relationships, relationshipKey(request), inner.check(request)),
        };
      }),
    ),
    Layer.effect(
      DecisionHistory,
      Effect.gen(function* () {
        const context = yield* Layer.build(ports);
        const inner = Context.get(context, DecisionHistory);
        return {
          name: `${inner.name ?? "?"} (capturing)`,
          hasActed: (query: ActedQuery) =>
            record(history, historyKey(query), inner.hasActed(query)),
        };
      }),
    ),
    Layer.effect(
      CustomPredicate,
      Effect.gen(function* () {
        const context = yield* Layer.build(ports);
        const inner = Context.get(context, CustomPredicate);
        return {
          name: `${inner.name ?? "?"} (capturing)`,
          evaluate: (name: string, subject: AuthSubject, resource: Resource | undefined, params: unknown) =>
            record(
              custom,
              customPredicateKey(subject.id, name, params),
              inner.evaluate(name, subject, resource, params),
            ),
        };
      }),
    ),
    Layer.effect(
      SignatureHistory,
      Effect.gen(function* () {
        const context = yield* Layer.build(ports);
        const inner = Context.get(context, SignatureHistory);
        return {
          name: `${inner.name ?? "?"} (capturing)`,
          signaturesFor: (query: SignatureQuery) =>
            record(signatures, signatureHistoryKey(query), inner.signaturesFor(query)),
        };
      }),
    ),
  );

  return {
    layer,
    // Copied on read, so a caller holding a snapshot is not handed a map that
    // keeps changing under a later capture.
    answers: Effect.sync(() => ({
      attributes: new Map(attributes),
      relationships: new Map(relationships),
      history: new Map(history),
      custom: new Map(custom),
      signatures: new Map(signatures),
    })),
  };
};

/**
 * Runs one call, stores what it answered, and hands the answer on unchanged.
 *
 * `tapError` rather than `catchAll`: a capture must **observe** a failure
 * without absorbing it. The live run being wrapped still has to fail the way it
 * would have, or the capture would be a capture of something that did not
 * happen.
 */
const record = <A, E>(
  into: Map<string, Answer<A>>,
  key: string,
  call: Effect.Effect<A, E>,
): Effect.Effect<A, E> =>
  call.pipe(
    Effect.tap((value) => Effect.sync(() => into.set(key, { _tag: "Answered", value }))),
    Effect.tapError((error) =>
      Effect.sync(() => into.set(key, { _tag: "Broke", message: renderError(error) })),
    ),
  );

/**
 * The part of a port failure worth keeping.
 *
 * `String(error)` alone is nearly useless here: every port error is a
 * `Data.TaggedError`, so it stringifies to its tag — `"AttributeResolveError"` —
 * and the `cause` a resolver actually reported is dropped. A replay
 * reconstructs the error *class* from which port it was, so the class is
 * already known and the cause is the only thing a capture has to carry.
 *
 * The same shape `SinkCodec`'s `renderCause` uses, for the same reason: a cause
 * is `unknown`, so it may be an `Error`, a plain object, or something that
 * cannot be stringified at all.
 */
const renderError = (error: unknown): string => {
  const cause = Predicate.hasProperty(error, "cause") ? error.cause : undefined;
  if (cause === undefined) return String(error);
  if (cause instanceof Error) return cause.message;
  try {
    return String(cause);
  } catch {
    return "<unrenderable cause>";
  }
};

/**
 * Ports that answer from a capture.
 *
 * **A query the capture never saw answers the fail-closed default** — not an
 * invented value: `undefined` for an attribute, `Unknown` for a relationship
 * and for history. That is exactly what a real deployment gets from an unwired
 * port ([INV-QD-007](../../../../spec/invariants.md)), so a what-if that
 * wanders outside the captured set denies for the reason a misconfigured
 * deployment would, rather than for a reason peculiar to this panel.
 */
export const replayLayer = (answers: CapturedAnswers): Layer.Layer<EvaluationPorts> =>
  Layer.mergeAll(
    Layer.succeed(AttributeResolver, {
      name: "snapshot",
      resolve: (subjectId: SubjectId, attribute: string) =>
        answer(
          answers.attributes.get(attributeKey(subjectId, attribute)),
          undefined,
          (message) => new AttributeResolveError({ attribute, cause: message }),
        ),
    }),
    Layer.succeed(RelationshipResolver, {
      name: "snapshot",
      check: (request: RelationshipCheck) =>
        answer(
          answers.relationships.get(relationshipKey(request)),
          unrelatedUnknown,
          (message) =>
            new RelationshipResolveError({
              relation: request.relation,
              resourceId: request.resourceId,
              cause: message,
            }),
        ),
    }),
    Layer.succeed(DecisionHistory, {
      name: "snapshot",
      hasActed: (query: ActedQuery) =>
        answer(
          answers.history.get(historyKey(query)),
          actedUnknown,
          (message) => new DecisionHistoryUnavailable({ event: query.event, cause: message }),
        ),
    }),
    Layer.succeed(CustomPredicate, {
      name: "snapshot",
      evaluate: (name: string, subject: AuthSubject, _resource: Resource | undefined, params: unknown) =>
        answer(
          answers.custom.get(customPredicateKey(subject.id, name, params)),
          false,
          (message) => new CustomPredicateError({ name, reason: message }),
        ),
    }),
    Layer.succeed(SignatureHistory, {
      name: "snapshot",
      signaturesFor: (query: SignatureQuery) =>
        answer(
          answers.signatures.get(signatureHistoryKey(query)),
          noSignatures,
          (message) =>
            new SignatureHistoryUnavailable({
              subjectId: query.subjectId,
              resourceId: query.resourceId,
              cause: message,
            }),
        ),
    }),
  );

/** Named so the fail-closed default is a value with a reason, not a literal. */
const unrelatedUnknown: RelatedResult = "Unknown";
const actedUnknown: ActedResult = "Unknown";
/** Matches `SignatureHistoryNone`'s own answer — a replay default must never diverge from the real one. */
const noSignatures: ReadonlyArray<Signature> = [];

const answer = <A, E>(
  captured: Answer<A> | undefined,
  unseen: A,
  toError: (message: string) => E,
): Effect.Effect<A, E> => {
  if (captured === undefined) return Effect.succeed(unseen);
  return captured._tag === "Answered"
    ? Effect.succeed(captured.value)
    // Replays the outage as an outage. Turning a captured failure into a miss
    // would make a snapshot *disagree* with the run that produced it, which is
    // exactly what INV-QD-043 forbids.
    : Effect.fail(toError(captured.message));
};
