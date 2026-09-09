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
  SignatureHistory,
  SignatureHistoryNone,
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
import type { SignatureInput } from "./RecordingSignatureHistory.ts";
import { recordingSignatureHistory } from "./RecordingSignatureHistory.ts";

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
  /** On-file signatures. */
  readonly signatures?: ReadonlyArray<SignatureInput>;
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
   *
   * **`test` under `it.effect` shadows the ambient `TestClock`.**
   * `@effect/vitest`'s `it.effect` already provides a `TestClock` to the test
   * effect. `clock: "test"` builds a *second* `TestClock.layer()` inside this
   * fixture and provides it alongside the rest of the environment — Effect's
   * "innermost provide wins" rule means the evaluation this layer feeds runs
   * against *this* clock, not the ambient one.
   *
   * **Corrected.** This comment previously went on to say that driving the
   * inner clock forward — not just observing its frozen zero — needed a
   * handle this fixture had no way to hand back, and that recovering one from
   * the built context "would need an unsafe cast this codebase forbids (§6)",
   * so a caller was told to fall back to `it.live` and read time only, never
   * drive it. Both claims are refuted by `TestClock.testClockWith` itself
   * (`effect/testing/TestClock.ts`): it is exactly a cast-free accessor for
   * "the `TestClock` currently in scope" —
   * `Effect.withFiber((fiber) => f(fiber.getRef(Clock.Clock) as TestClock))`
   * — and the one unsafe cast it performs is internal to the library, never
   * something a caller of this option writes. `TestClock.adjust`/
   * `TestClock.setTime` are both built on `testClockWith`, so they read
   * whichever `Clock` is current at the point they are *called* — the same
   * fiber ref `Clock.currentTimeMillis` already reads correctly under
   * `clock: "test"` (see "makes durations reproducible when asked for" in
   * `TestLayers.test.ts`). Calling them from *inside* the same effect this
   * option's layer is provided to — before `evaluate`, in the same `pipe` —
   * reaches the inner clock, not the ambient one, because "innermost provide
   * wins" applies to every read of `Clock.Clock`, not only the one
   * `durationMillis` happens to make. `it.effect` works fine for this; `it.live`
   * was never required to drive it, only to observe the *default*, unshadowed
   * runtime clock (the "defaults to the runtime's own" case above, which
   * genuinely does need `it.live` — `it.effect`'s ambient `TestClock` would
   * otherwise be what `live` claims *not* to provide). The one thing still
   * true: calling `TestClock.adjust` from *outside* the provided effect —
   * after the layer has already been built and run, or from a sibling effect
   * — reaches the ambient clock instead, because "current" is scoped to the
   * fiber executing inside the `Effect.provide`, and a call outside it is a
   * different fiber's current context.
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
  /** Supplies the signature history port directly, taking precedence over `signatures`. */
  readonly signatureHistory?: Layer.Layer<SignatureHistory>;
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
    options?.signatureHistory ??
      (options?.signatures === undefined
        ? SignatureHistoryNone
        : recordingSignatureHistory(options.signatures).layer),
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
