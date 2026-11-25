/**
 * The diagnostics the dock polls, polled once: a store, and the loop that feeds it.
 *
 * Four reads keep a host's Services and React panels current: the wiring report
 * (which needs the application's layer), the port activity and the hydration
 * counts (which need nothing), and the port-call collector's snapshot. Each host
 * used to write that loop itself, with its own timer and its own
 * `Effect.runSync`, and the only host that did wrote it twice and got the
 * stateful read wrong. It lives here, in the headless model, for the reason
 * `TimelineStore.ts` gives for the decision log: held to the model's coverage
 * bar and mutated by the gate. It is the engine the diagnostics feed runs,
 * package-private (ADR-QD-099): a shell builds `makeDiagnosticsFeed`, which
 * watches the run and states a stop (ADR-QD-173).
 *
 * **Pull, not push.** Nothing here adds a write to the evaluation's hot path
 * for a debug view (BEH-QD-216, ADR-QD-052). The metrics and the context are
 * read on a schedule; `runDiagnostics` writes that pull once.
 *
 * **The layer is built once per run, and what that shares is narrower than it
 * looks.** A handed layer is built inside the run's scope and released when the
 * run is interrupted, so a sample reads one stable build instead of rebuilding
 * every port every tick, and an asynchronous layer works. It is still *its own
 * build*: a layer value built twice is two instances, and a service that keeps
 * state in its constructor (`decisionCacheLayer`'s cache) is shared with the
 * application only if the host shares it by value, for example by building its
 * context once and handing `Layer.succeedContext(context)` to both. Under a
 * `QadiProvider` there is nothing to share by hand: `@qadi/react`'s
 * `useDevtoolsFeed()` hands over a layer that is the provider's own build, so
 * the decisions and the panel read one instance (BEH-QD-323).
 *
 * **A sample that changed nothing changes nothing.** `useSyncExternalStore`
 * compares snapshots by identity, and every read builds fresh objects, so each
 * sample is folded into the last reading by `foldReading`, which keeps each
 * field's reference while `Equal.equals` says it is unchanged and returns the
 * last reading itself when nothing moved.
 *
 * Gates are deliberately not here. They are the dock model's own input
 * (`DockModelInputs.gates`), a registry the model subscribes to (ADR-QD-162).
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import { causeMessage } from "@qadi/core";
import { makeExternalStore, sameFields } from "./ExternalStore.ts";
import type { AskedQuestionLike } from "./Gates.ts";
import { hydrationActivity, type HydrationActivity } from "./Hydration.ts";
import type { PortCallCollector, PortCallLog } from "./PortCalls.ts";
import { portActivity, wiringReport, type PortActivity, type WiringReport } from "./Wiring.ts";

/**
 * What the wiring read produced, as a closed set of states.
 *
 * A layer that fails to build must be *stated* (BEH-QD-218: a blank panel is
 * indistinguishable from a broken one), and two fields that could disagree — a
 * report and a failure message — would be the shape a closed union exists to
 * rule out.
 */
export type WiringRead = Data.TaggedEnum<{
  /** No layer was handed over, so there is nothing to read the wiring from. */
  NotHanded: {};
  /**
   * The handed layer failed to build; the other reads keep sampling. `reason` is
   * `causeMessage`'s text of the build failure, a `Cause.pretty` trace whenever one renders,
   * for the host's own process: it must not cross a trust boundary.
   */
  Failed: { readonly reason: string };
  /** The report, read from the built layer. */
  Read: { readonly report: WiringReport };
}>;

export const WiringRead = Data.taggedEnum<WiringRead>();

/** One reading of what the poll samples. */
export interface Diagnostics {
  readonly wiring: WiringRead;
  readonly activity: ReadonlyArray<PortActivity>;
  /** `undefined` only before the first sample. */
  readonly hydration: HydrationActivity | undefined;
  /** `undefined` when no collector was handed over. */
  readonly portCalls: PortCallLog | undefined;
}

/** The reading before anything has been sampled. A constant, so it keeps its identity. */
export const noDiagnostics: Diagnostics = {
  wiring: WiringRead.NotHanded(),
  activity: [],
  hydration: undefined,
  portCalls: undefined,
};

/**
 * A reading taken elsewhere (another process, a fixture), field by field.
 *
 * Each of the four sampled fields it carries wins over the sampled one; a field it
 * omits falls through to the sample. The fields are `Diagnostics`' own types, so a
 * supplied reading can state everything a sampled one can, `WiringRead.Failed` included.
 * Its `questions` are not sampled: the dock's questions join reads them from the supplied
 * reading, beside the merged one, and they win there over the questions input (ADR-QD-169).
 *
 * An explicit interface and not `Partial<Diagnostics>`: with
 * `exactOptionalPropertyTypes`, `Partial<Diagnostics>` would accept an explicit
 * `hydration: undefined`, a third state ("supplied nothing") that is neither a
 * reading nor an omission. Here a field is present or it is absent.
 */
export interface DiagnosticsReading {
  readonly wiring?: WiringRead;
  readonly activity?: ReadonlyArray<PortActivity>;
  readonly hydration?: HydrationActivity;
  readonly portCalls?: PortCallLog;
  /** The questions the dock lists, read by its questions join and not part of the merged reading. */
  readonly questions?: ReadonlyArray<AskedQuestionLike>;
}

/**
 * The sampled reading with a supplied one laid over it, field by field.
 *
 * The one place the rule "a reading taken elsewhere wins over a sampled one"
 * lives (BEH-QD-323). It used to be restated by five props on the dock, each
 * with its own line of precedence and its own doc comment; ARCH-24's D-24-c
 * kept the rule and ARCH-44 moved it here, where it is tested without React.
 * An explicit empty list wins like any value: only an absent field falls
 * through. A supplied reading's `questions` is not part of the merged reading;
 * the dock's questions join reads it from the supplied reading.
 *
 * With nothing supplied it returns `sampled` itself, so a dock reading from a
 * store keeps the store's snapshot identity and does not re-render for it.
 */
export const mergeReading = (
  sampled: Diagnostics,
  supplied: DiagnosticsReading | undefined,
): Diagnostics =>
  supplied === undefined
    ? sampled
    : {
        wiring: supplied.wiring ?? sampled.wiring,
        activity: supplied.activity ?? sampled.activity,
        hydration: supplied.hydration ?? sampled.hydration,
        portCalls: supplied.portCalls ?? sampled.portCalls,
      };

export interface DiagnosticsStore {
  /** Registers a listener, and returns the function that removes it. */
  readonly subscribe: (listener: () => void) => () => void;
  /**
   * The latest reading.
   *
   * The same reference until some field changed, and a field that did not
   * change keeps its own reference too, so a panel reading one field is not
   * re-rendered by another's change.
   */
  readonly getSnapshot: () => Diagnostics;
  /** Folds one reading in, keeping the reference of every field that is unchanged. */
  readonly accept: (next: Diagnostics) => void;
}

const keep = <A>(previous: A, next: A): A => (Equal.equals(previous, next) ? previous : next);

/**
 * Folds one sampled reading into the last one, keeping every field that did not change.
 *
 * Each field keeps `previous`'s reference while `Equal.equals` says it is unchanged, and the
 * result is `previous` itself when no field moved, so a quiet poll hands a store the value it
 * already holds. A pure function of its two arguments: it reads no clock, no store and no
 * closure.
 *
 * The result is typed `Diagnostics` and built as an object literal naming every field, so a
 * field added to `Diagnostics` is a compile error until it is folded here, and `sameFields`
 * decides whether anything moved without a second list of the fields to forget it from.
 * Exported from this module only, not from a barrel (ADR-QD-099).
 */
export function foldReading(previous: Diagnostics, next: Diagnostics): Diagnostics {
  const folded: Diagnostics = {
    wiring: keep(previous.wiring, next.wiring),
    activity: keep(previous.activity, next.activity),
    hydration: keep(previous.hydration, next.hydration),
    portCalls: keep(previous.portCalls, next.portCalls),
  };
  return sameFields(folded, previous) ? previous : folded;
}

export const makeDiagnosticsStore = (): DiagnosticsStore => {
  const store = makeExternalStore(noDiagnostics);
  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    accept: (next) => store.set(foldReading(store.getSnapshot(), next)),
  };
};

/** How often the dock samples by default: a debug affordance's refresh rate. */
export const DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS = 2_000;

/**
 * What a host hands over to have its diagnostics sampled: things it already
 * owns, and no Effects.
 *
 * Gates and questions are not here. They are the gates feed's inputs
 * (`GatesFeedInputs.gates` and `GatesFeedInputs.questions`, `makeGatesFeed`), which reads them
 * (ADR-QD-162, ADR-QD-169).
 *
 * A field holding `undefined` reads as omitted.
 */
export interface DiagnosticsOptions {
  /**
   * The application's layer, read for the wiring report.
   *
   * Built once while the poll runs, and released when it stops. It is its own
   * build, so a service that keeps state in its constructor is shared with
   * the application only if the host shares it by value: build its context once
   * and pass that context here and to the atoms as one value. Under a
   * `QadiProvider`, hand `useDevtoolsFeed()`'s `diagnostics` from `@qadi/react`
   * instead: its layer is the provider's own build, so nothing needs sharing.
   *
   * Typed `Layer<never, unknown>` because `Layer` is contravariant in what it
   * provides: that is the one type every layer is assignable to.
   */
  readonly layer?: Layer.Layer<never, unknown> | undefined;
  /** The collector whose `layer` is wired where evaluations run, for the recent port calls. */
  readonly collector?: PortCallCollector | undefined;
  /**
   * How often to sample, in milliseconds. Defaults to `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`.
   *
   * A changed value restarts the poll, which is why a cadence is a number and not a `Schedule`.
   */
  readonly intervalMillis?: number | undefined;
}

/**
 * Samples the diagnostics into a store until interrupted.
 *
 * Reads once at the start and then once per `intervalMillis`. The error channel is
 * `never`: a layer that fails to build is reported as `WiringRead.Failed` while
 * the other reads carry on, because a run that died would leave every panel
 * blank. A defect in a sample, such as a collector whose snapshot throws, ends the
 * run as it ends `runSource`.
 */
export const runDiagnostics = Effect.fn("qadi.devtools.runDiagnostics")(function* (
  store: DiagnosticsStore,
  options?: DiagnosticsOptions,
) {
  yield* Effect.scoped(
    Effect.gen(function* () {
      const wiring: Effect.Effect<WiringRead> = yield* wiringReader(options?.layer);
      const portCalls: Effect.Effect<PortCallLog | undefined> =
        options?.collector === undefined ? Effect.undefined : options.collector.snapshot;
      const sample = Effect.all({
        wiring,
        activity: portActivity,
        hydration: hydrationActivity,
        portCalls,
      }).pipe(Effect.tap((reading) => Effect.sync(() => store.accept(reading))));

      yield* Effect.repeat(
        sample,
        Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS),
      );
    }),
  );
});

/**
 * Builds the layer once, in the run's scope, and returns the read over it.
 *
 * A build that failed is a constant `Failed` reading, so every sample states
 * the same reason instead of retrying a build the host did not ask to retry.
 */
const wiringReader = Effect.fn("qadi.devtools.wiringReader")(function* (
  layer: Layer.Layer<never, unknown> | undefined,
) {
  if (layer === undefined) return Effect.succeed<WiringRead>(WiringRead.NotHanded());
  const built = yield* Effect.exit(Layer.build(layer));
  if (Exit.isFailure(built)) {
    const failed = WiringRead.Failed({ reason: causeMessage(built.cause) });
    return Effect.succeed<WiringRead>(failed);
  }
  const context = built.value;
  return Effect.map(Effect.provideContext(wiringReport, context), (report) =>
    WiringRead.Read({ report }),
  );
});
