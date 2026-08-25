/**
 * The subject-less half of the test environment.
 *
 * Every default fails closed, so a test that forgets to grant something sees a
 * denial rather than an accidental allow.
 */
import {
  AttributeResolver,
  AttributeResolverNone,
  CustomPredicate,
  CustomPredicateNone,
  DecisionHistory,
  DecisionHistoryUnknown,
  RelationshipResolver,
  RelationshipResolverNever,
  evaluationIdSequential,
} from "@qadi/core";
import type {
  ActedEventInput,
  CurrentSubject,
  EvaluationServices,
  RelationshipEdgeInput,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { edgeRelationshipResolver } from "./EdgeRelationshipResolver.ts";
import { recordingAttributeResolver } from "./RecordingAttributeResolver.ts";
import { eventDecisionHistory } from "./EventDecisionHistory.ts";

/**
 * Everything an evaluation needs.
 *
 * A re-export of `EvaluationServices`, not a parallel copy — a hand-copied
 * union here would silently stop matching the evaluator's if that one ever
 * gained a service, and a requirement set drifting out of sync with the
 * evaluator's is a worse defect than a type needing one hop to read
 * (the same reasoning `SubjectSet.ts`'s own `Exclude<EvaluationServices, …>`
 * is built on).
 */
export type QadiTestServices = EvaluationServices;

export interface TestLayerOptions {
  /** Attributes resolved on a subject miss. */
  readonly attributes?: Readonly<Record<string, unknown>>;
  /** Relationship edges. */
  readonly relationships?: ReadonlyArray<RelationshipEdgeInput>;
  /** Past events. */
  readonly history?: ReadonlyArray<ActedEventInput>;
  /** Prefix for the deterministic evaluation ids. Defaults to `eval`. */
  readonly idPrefix?: string;
  /**
   * Which clock the evaluation runs under. Defaults to `live`.
   *
   * `test` makes `durationMillis` reproducibly zero, which matters when two
   * decisions are being compared field by field.
   *
   * **This option exists because the ids were reproducible and the clock was
   * not**, and one half of a determinism claim is worse than neither: revision
   * 0.1 of the devtools overview said "clock and evaluation ids reproducible",
   * and only the ids were. `@effect/vitest`'s `it.effect` supplies a `TestClock`
   * to *tests*, so a test suite rarely noticed; anything else using these
   * fixtures — a simulator in a browser, a script — had no such ambient help.
   *
   * `live` provides no clock at all rather than a second one: the runtime's own
   * is already correct, and layering another over it would only be a way to get
   * it wrong.
   */
  readonly clock?: "live" | "test";
  /**
   * Supplies the resolver layer directly, taking precedence over
   * `attributes`.
   *
   * Needed because this layer already satisfies the requirement — an outer
   * `Effect.provide` cannot override it, since the innermost provide wins.
   */
  readonly attributeResolver?: Layer.Layer<AttributeResolver>;
  /** Supplies the relationship layer directly, taking precedence over `relationships`. */
  readonly relationshipResolver?: Layer.Layer<RelationshipResolver>;
  /** Supplies the history port directly, taking precedence over `history`. */
  readonly decisionHistory?: Layer.Layer<DecisionHistory>;
  /** Supplies the `HasCustom` registry directly. Defaults to `CustomPredicateNone`. */
  readonly customPredicate?: Layer.Layer<CustomPredicate>;
}

/**
 * The same environment `qadiTestLayer` builds, with no current subject.
 *
 * For `decideSubjects` and `filterSubjects`, which supply their own subject per
 * element and so must not require an ambient one (ADR-QD-022). A review query is
 * asked by nobody, and a fixture that made one up would be the first thing later
 * mistaken for a real requester.
 *
 * `qadiTestLayer` is this plus a subject rather than a parallel copy: two
 * bodies resolving the same options would eventually disagree about a default,
 * and a fixture that fails *open* in one of them is not a failure anyone reads.
 */
export const qadiReviewLayer = (
  options?: TestLayerOptions,
): Layer.Layer<Exclude<QadiTestServices, CurrentSubject>> =>
  Layer.mergeAll(
    options?.attributeResolver ??
      (options?.attributes === undefined
        ? AttributeResolverNone
        : recordingAttributeResolver(options.attributes).layer),
    options?.relationshipResolver ??
      (options?.relationships === undefined
        ? RelationshipResolverNever
        : edgeRelationshipResolver(options.relationships).layer),
    options?.decisionHistory ??
      (options?.history === undefined
        ? DecisionHistoryUnknown
        : eventDecisionHistory(options.history).layer),
    evaluationIdSequential(options?.idPrefix ?? "eval"),
    options?.customPredicate ?? CustomPredicateNone,
    clockLayer(options?.clock),
  );

/**
 * `Layer.empty` for `live`, so nothing shadows the runtime's own clock.
 *
 * Deliberately unannotated. `TestClock.layer()` provides a `TestClock`, which is
 * a *wider* service than `Clock` — it adds `adjust`, `setTime` and `withLive` —
 * so no single annotation covers both branches without either lying about the
 * live one or narrowing away the test one. The inferred union is the truth, and
 * it costs a caller nothing: `Clock` is a default service, so neither branch can
 * leave an unmet requirement behind.
 */
const clockLayer = (clock: TestLayerOptions["clock"]) =>
  clock === "test" ? TestClock.layer() : Layer.empty;
