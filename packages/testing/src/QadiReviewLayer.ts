/**
 * The subject-less half of the test environment.
 *
 * Every default fails closed, so a test that forgets to grant something sees a
 * denial rather than an accidental allow.
 */
import { evaluationIdSequential, fixturePortsLayer } from "@qadi/core";
import type {
  EvaluationServices,
  PortFixtureData,
  PortName,
  PortTypes,
  ServiceOf,
  StandingEvaluationServices,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";

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

/**
 * How one port is set up: its fixture data, or a layer of its service — never
 * both, which the `never` members make a type error rather than a precedence
 * rule to remember.
 *
 * `answers` is `@qadi/core`'s `PortFixtureData` for the port (an attribute
 * record, an edge list, an event list, a signature list, fixed custom-predicate
 * answers), turned into the port's layer by core's fixture table. A `layer` is
 * for everything data cannot say: a failing, scripted or recording port is
 * `@qadi/core`'s `scriptedPort` or `recordingPort` over that port's description
 * (`attributeResolverPort`, ...), and a predicate that reads the subject or the
 * resource is `customPredicateFromRecord` with real functions.
 */
export type PortSetup<K extends PortName> =
  | { readonly answers: PortFixtureData[K]; readonly layer?: never }
  | { readonly layer: Layer.Layer<ServiceOf<PortTypes[K]>>; readonly answers?: never };

export interface TestLayerOptions {
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
   * Sets up any port, keyed by port name: `{ AttributeResolver: { answers: ... } }`
   * or `{ AttributeResolver: { layer: ... } }`. A port left out stays at its
   * fail-closed default.
   *
   * One way per port. This layer already satisfies every port, so an outer
   * `Effect.provide` could not override one (the innermost provide wins), which
   * is why the layer form lives here. Before ARCH-42 there were also four
   * top-level data options (`attributes`, `relationships`, `history`,
   * `signatures`) and a rule that an entry here won over the matching one; the
   * two ways to say the same thing are gone, and `CustomPredicate` has a data
   * form (`{ answers }`) like the other four.
   */
  readonly ports?: PortSetups;
}

/** {@link TestLayerOptions}' `ports`: any subset of the ports, each set up one way. */
export type PortSetups = {
  readonly [K in PortName]?: PortSetup<K> | undefined;
};

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
 *
 * Built on `@qadi/core`'s `fixturePortsLayer`, as `@qadi/devtools`' Fixtures
 * simulation is, so neither lists the ports or the data-to-layer map: a port
 * added to the registry is here, at its fail-closed default, without an edit,
 * and its fixture is one row in core's `PORT_FIXTURES`.
 */
export const qadiReviewLayer = (
  options?: TestLayerOptions,
): Layer.Layer<StandingEvaluationServices> =>
  Layer.mergeAll(
    fixturePortsLayer(answersOf(options?.ports ?? {}), layersOf(options?.ports ?? {})),
    evaluationIdSequential(options?.idPrefix ?? "eval"),
    clockLayer(options?.clock),
  );

/**
 * Each port's `answers`, or `undefined` when it was set up with a layer or not
 * at all. Typed over `PortName` so a port missing from this record is a
 * compile error.
 */
const answersOf = (
  ports: PortSetups,
): { readonly [K in PortName]: PortFixtureData[K] | undefined } => ({
  AttributeResolver: ports.AttributeResolver?.answers,
  DecisionHistory: ports.DecisionHistory?.answers,
  RelationshipResolver: ports.RelationshipResolver?.answers,
  CustomPredicate: ports.CustomPredicate?.answers,
  SignatureHistory: ports.SignatureHistory?.answers,
});

/** Each port's `layer`, or `undefined`; the counterpart of {@link answersOf}. */
const layersOf = (
  ports: PortSetups,
): { readonly [K in PortName]: Layer.Layer<ServiceOf<PortTypes[K]>> | undefined } => ({
  AttributeResolver: ports.AttributeResolver?.layer,
  DecisionHistory: ports.DecisionHistory?.layer,
  RelationshipResolver: ports.RelationshipResolver?.layer,
  CustomPredicate: ports.CustomPredicate?.layer,
  SignatureHistory: ports.SignatureHistory?.layer,
});

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
