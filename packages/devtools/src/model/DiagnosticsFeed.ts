/**
 * One diagnostics poll, owned by a scope, with a closed status a panel can state.
 *
 * A sample that dies (a throwing `questions`) ends the poll fiber, and a fiber
 * handle drops a dead fiber without a word, so the panel used to freeze on its
 * last reading with nothing said. The feed watches its own run's exit, states
 * the stop with its reason, keeps the last reading, and restarts on a changed
 * field or an explicit command (ADR-QD-047, as amended; ADR-QD-137 for the scope).
 *
 * **An interruption is not a stop.** A restart, `configure(undefined)`, a replaced
 * field and the scope closing all interrupt the run; only a run that ended on a
 * defect is `Stopped`. A layer that fails to build is not a defect either: it is
 * `WiringRead.Failed` inside a feed that stays `Live`.
 *
 * **It only forks.** Nothing here waits on the poll, so a scope built under
 * `Effect.runSync` cannot throw for an asynchronous layer: the feed is `Starting`
 * until the first sample lands.
 *
 * Package-private (ADR-QD-099).
 */
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberHandle from "effect/FiberHandle";
import type * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Schedule from "effect/Schedule";
import type * as Scope from "effect/Scope";
import {
  DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS,
  makeDiagnosticsStore,
  noDiagnostics,
  runDiagnostics,
  type Diagnostics,
  type DiagnosticsStore,
} from "./DiagnosticsStore.ts";
import { makeExternalStore } from "./ExternalStore.ts";
import type { AskedQuestionLike } from "./Gates.ts";
import type { PortCallCollector } from "./PortCalls.ts";

/**
 * Where the poll stands, as a closed set of states.
 *
 * A stop must be stated, not left as a reading that looks current, and `reason`
 * with `sampled` side by side would be the two-field disagreement a closed
 * union exists to rule out.
 */
export type DiagnosticsStatus = Data.TaggedEnum<{
  /** No options were handed over, so nothing runs. */
  Off: {};
  /** Forked, and this run has accepted no sample yet. */
  Starting: {};
  /** A sample has been accepted by the current run. */
  Live: {};
  /**
   * The run ended on a defect. `reason` is `Cause.pretty` of it; `sampled` says
   * whether the reading shown holds an accepted sample.
   */
  Stopped: { readonly reason: string; readonly sampled: boolean };
}>;

export const DiagnosticsStatus = Data.taggedEnum<DiagnosticsStatus>();

/** The poll's status and the reading shown, in one value so no reader sees one without the other. */
export interface DiagnosticsSnapshot {
  readonly status: DiagnosticsStatus;
  readonly reading: Diagnostics;
}

/**
 * What a host hands over to have its diagnostics sampled: things it already
 * owns, and no Effects.
 *
 * Gates are not here. They are pushed by the host's subscription to
 * `@qadi/react`'s registry and stay a plain prop (AGENTS.md §13).
 */
export interface DiagnosticsDockOptions {
  /**
   * The application's layer, read for the wiring report.
   *
   * Built once while the dock is mounted, and released on unmount. It is its
   * own build, so a service that keeps state in its constructor is shared with
   * the application only if the host shares it by value: build its context once
   * and pass that context here and to the atoms as one value. Under a
   * `QadiProvider`, hand `useDevtoolsFeed()`'s `diagnostics` from `@qadi/react`
   * instead: its layer is the provider's own build, so nothing needs sharing.
   *
   * Typed `Layer<never, unknown>` because `Layer` is contravariant in what it
   * provides: that is the one type every layer is assignable to.
   */
  readonly layer?: Layer.Layer<never, unknown>;
  /** The collector whose `layer` is wired where evaluations run, for the recent port calls. */
  readonly collector?: PortCallCollector;
  /** Where the questions asked so far come from, usually `() => atoms.asked()`. */
  readonly questions?: () => ReadonlyArray<AskedQuestionLike>;
  /** How often to sample, in milliseconds. Defaults to `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`. */
  readonly intervalMillis?: number;
}

/** Nothing runs and nothing was sampled. A constant, so it keeps its identity. */
export const diagnosticsOff: DiagnosticsSnapshot = {
  status: DiagnosticsStatus.Off(),
  reading: noDiagnostics,
};

/** Handed options and no feed built yet: what a reader shows on the pass before its feed exists. */
export const diagnosticsStarting: DiagnosticsSnapshot = {
  status: DiagnosticsStatus.Starting(),
  reading: noDiagnostics,
};

/**
 * Whether a panel must withhold claims that read an absent field as "not handed over".
 *
 * True while no sample has been taken: before the first one and after a stop
 * that preceded it. Kept in the model so the gate's mutation run measures it.
 */
export const isUnsampled: (status: DiagnosticsStatus) => boolean = Match.type<DiagnosticsStatus>().pipe(
  Match.tagsExhaustive({
    Off: () => false,
    Starting: () => true,
    Live: () => false,
    Stopped: (stopped) => !stopped.sampled,
  }),
);

/** What a panel reads: a snapshot, and the command that starts the poll again. */
export interface DiagnosticsReadout {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => DiagnosticsSnapshot;
  /** Starts the poll again with the options it holds; nothing when it holds none. */
  readonly restart: () => void;
}

export interface DiagnosticsFeed extends DiagnosticsReadout {
  /**
   * Compared per field: an options object equal field by field to the previous
   * one restarts nothing. `undefined` ends the run and resets the reading.
   */
  readonly configure: (options: DiagnosticsDockOptions | undefined) => void;
}

const idle = (snapshot: DiagnosticsSnapshot): DiagnosticsReadout => ({
  subscribe: () => () => {},
  getSnapshot: () => snapshot,
  restart: () => {},
});

const IDLE_OFF = idle(diagnosticsOff);
const IDLE_STARTING = idle(diagnosticsStarting);

/**
 * The readout to show before a feed is built: `Off` without options, `Starting` with them.
 *
 * Two constants, so a reader's first pass keeps one identity whatever it was handed.
 */
export const idleDiagnostics = (options: DiagnosticsDockOptions | undefined): DiagnosticsReadout =>
  options === undefined ? IDLE_OFF : IDLE_STARTING;

/** Builds the feed in the caller's scope; closing it interrupts the run, without a `Stopped`. */
export const makeDiagnosticsFeed = Effect.fn("qadi.devtools.makeDiagnosticsFeed")(function* (
  init?: DiagnosticsDockOptions,
): Effect.fn.Return<DiagnosticsFeed, never, Scope.Scope> {
  let options = init;
  let store: DiagnosticsStore = makeDiagnosticsStore();
  // Whether the reading shown holds an accepted sample: reset only by `Off`.
  let sampled = false;
  // Names the current run, so a replaced run's late exit or accept changes nothing.
  let generation = 0;
  // Set when the scope closes: a command on a closed feed would publish a state nothing follows.
  let closed = false;
  const view = makeExternalStore<DiagnosticsSnapshot>(diagnosticsOff);
  const handle = yield* FiberHandle.make<void>();
  // Added after the handle, so it runs first on close: the run it interrupts is then a replaced one.
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      generation += 1;
      closed = true;
    }),
  );
  const fork = yield* FiberHandle.runtime(handle)<never>();

  // One publish per transition, carrying status and reading together.
  const show = (status: DiagnosticsStatus) => {
    const reading = store.getSnapshot();
    const current = view.getSnapshot();
    if (current.status === status && current.reading === reading) return;
    view.set({ status, reading });
  };

  const runOptions = (next: DiagnosticsDockOptions) => ({
    ...(next.layer === undefined ? {} : { layer: next.layer }),
    ...(next.collector === undefined ? {} : { collector: next.collector }),
    ...(next.questions === undefined ? {} : { questions: next.questions }),
    schedule: Schedule.spaced(next.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS),
  });

  const start = (next: DiagnosticsDockOptions) => {
    generation += 1;
    const mine = generation;
    const target = store;
    // Before the fork: its synchronous prefix may already reach `Live` or `Stopped`.
    show(DiagnosticsStatus.Starting());
    const marking: DiagnosticsStore = {
      subscribe: target.subscribe,
      getSnapshot: target.getSnapshot,
      accept: (reading) => {
        if (mine !== generation) return;
        target.accept(reading);
        sampled = true;
        // `accept` returns early on an unchanged reading, so Live is marked here, not by its notify.
        const current = view.getSnapshot().status;
        show(DiagnosticsStatus.$is("Live")(current) ? current : DiagnosticsStatus.Live());
      },
    };
    fork(
      runDiagnostics(marking, runOptions(next)).pipe(
        Effect.onExit((exit) =>
          Effect.sync(() => {
            if (mine === generation && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
              show(DiagnosticsStatus.Stopped({ reason: Cause.pretty(exit.cause), sampled }));
            }
          }),
        ),
      ),
    );
  };

  const off = () => {
    generation += 1;
    // Replacing the fiber interrupts the previous run synchronously; `FiberHandle.clear` is an Effect.
    fork(Effect.void);
    store = makeDiagnosticsStore();
    sampled = false;
    view.set(diagnosticsOff);
  };

  const configure = (next: DiagnosticsDockOptions | undefined) => {
    if (closed) return;
    const before = options;
    options = next;
    if (next === undefined) {
      off();
      return;
    }
    if (
      before === undefined ||
      next.layer !== before.layer ||
      next.collector !== before.collector ||
      next.questions !== before.questions ||
      next.intervalMillis !== before.intervalMillis
    ) {
      start(next);
    }
  };

  const restart = () => {
    if (!closed && options !== undefined) start(options);
  };

  if (init !== undefined) start(init);

  return { subscribe: view.subscribe, getSnapshot: view.getSnapshot, configure, restart };
});
