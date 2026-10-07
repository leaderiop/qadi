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
 * bar and mutated by the gate, and available to any shell that is not React.
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
 * context once and handing `Layer.succeedContext(context)` to both.
 *
 * **A sample that changed nothing changes nothing.** `useSyncExternalStore`
 * compares snapshots by identity, and every read builds fresh objects, so
 * `accept` keeps each field's previous reference when `Equal.equals` says it is
 * unchanged and notifies only if some field moved.
 *
 * Gates are deliberately not here. They are pushed by the host's subscription
 * to `@qadi/react`'s registry and stay a plain prop (AGENTS.md §13).
 */
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import { makeExternalStore } from "./ExternalStore.ts";
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
  /** The handed layer failed to build; the other reads keep sampling. */
  Failed: { readonly reason: string };
  /** The report, read from the built layer. */
  Read: { readonly report: WiringReport };
}>;

export const WiringRead = Data.taggedEnum<WiringRead>();

/** One reading of everything the dock polls. */
export interface Diagnostics {
  readonly wiring: WiringRead;
  readonly activity: ReadonlyArray<PortActivity>;
  /** `undefined` only before the first sample. */
  readonly hydration: HydrationActivity | undefined;
  /** `undefined` when no collector was handed over. */
  readonly portCalls: PortCallLog | undefined;
  /** `undefined` when no question source was handed over. */
  readonly questions: ReadonlyArray<AskedQuestionLike> | undefined;
}

/** The reading before anything has been sampled. A constant, so it keeps its identity. */
export const noDiagnostics: Diagnostics = {
  wiring: WiringRead.NotHanded(),
  activity: [],
  hydration: undefined,
  portCalls: undefined,
  questions: undefined,
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

export const makeDiagnosticsStore = (): DiagnosticsStore => {
  const store = makeExternalStore(noDiagnostics);
  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    accept: (next) => {
      const current = store.getSnapshot();
      const merged: Diagnostics = {
        wiring: keep(current.wiring, next.wiring),
        activity: keep(current.activity, next.activity),
        hydration: keep(current.hydration, next.hydration),
        portCalls: keep(current.portCalls, next.portCalls),
        questions: keep(current.questions, next.questions),
      };
      if (
        merged.wiring === current.wiring &&
        merged.activity === current.activity &&
        merged.hydration === current.hydration &&
        merged.portCalls === current.portCalls &&
        merged.questions === current.questions
      ) {
        return;
      }
      store.set(merged);
    },
  };
};

/** How often the dock samples by default: a debug affordance's refresh rate. */
export const DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS = 2_000;

export interface DiagnosticsOptions<ROut = never, E = never> {
  /**
   * The application's layer, read for the wiring report.
   *
   * Built once per run. See the module comment for what that does not share.
   */
  readonly layer?: Layer.Layer<ROut, E>;
  /** The collector whose `layer` is wired where evaluations run. Absent: no calls are read. */
  readonly collector?: PortCallCollector;
  /**
   * Where the questions asked so far come from, usually `() => atoms.asked()`.
   *
   * A plain function, so a host needs no dependency on `@qadi/react` to pass it,
   * and anything that can list its questions can satisfy it.
   */
  readonly questions?: () => ReadonlyArray<AskedQuestionLike>;
  /** The cadence. Defaults to `Schedule.spaced(DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)`. */
  readonly schedule?: Schedule.Schedule<unknown>;
}

/**
 * Samples the diagnostics into a store until interrupted.
 *
 * Reads once at the start and then once per schedule step. The error channel is
 * `never`: a layer that fails to build is reported as `WiringRead.Failed` while
 * the other reads carry on, because a run that died would leave every panel
 * blank. A defect in a sample, such as a throwing `questions`, ends the run as
 * it ends `runSource`.
 */
export const runDiagnostics = Effect.fn("qadi.devtools.runDiagnostics")(function* <
  ROut = never,
  E = never,
>(store: DiagnosticsStore, options?: DiagnosticsOptions<ROut, E>) {
  yield* Effect.scoped(
    Effect.gen(function* () {
      const wiring: Effect.Effect<WiringRead> = yield* wiringReader(options?.layer);
      const portCalls: Effect.Effect<PortCallLog | undefined> =
        options?.collector === undefined ? Effect.undefined : options.collector.snapshot;
      const questionsThunk = options?.questions;
      const questions: Effect.Effect<ReadonlyArray<AskedQuestionLike> | undefined> =
        questionsThunk === undefined ? Effect.undefined : Effect.sync(questionsThunk);

      const sample = Effect.all({
        wiring,
        activity: portActivity,
        hydration: hydrationActivity,
        portCalls,
        questions,
      }).pipe(Effect.tap((reading) => Effect.sync(() => store.accept(reading))));

      yield* Effect.repeat(
        sample,
        options?.schedule ?? Schedule.spaced(DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS),
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
const wiringReader = Effect.fn("qadi.devtools.wiringReader")(function* <ROut, E>(
  layer: Layer.Layer<ROut, E> | undefined,
) {
  if (layer === undefined) return Effect.succeed<WiringRead>(WiringRead.NotHanded());
  const built = yield* Effect.exit(Layer.build(layer));
  if (Exit.isFailure(built)) {
    const failed = WiringRead.Failed({ reason: Cause.pretty(built.cause) });
    return Effect.succeed<WiringRead>(failed);
  }
  const context = built.value;
  return Effect.map(Effect.provideContext(wiringReport, context), (report) =>
    WiringRead.Read({ report }),
  );
});
