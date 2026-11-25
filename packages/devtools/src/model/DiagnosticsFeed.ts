/**
 * One diagnostics poll, owned by a scope, with a closed status a panel can state.
 *
 * A sample that dies (a collector whose snapshot throws) ends the poll fiber, and a fiber
 * handle drops a dead fiber without a word, so the panel used to freeze on its
 * last reading with nothing said. The feed watches its own run's exit, states
 * the stop with its reason, keeps the last reading, and restarts on a changed
 * field or an explicit command (ADR-QD-047, as amended; ADR-QD-137 for the scope).
 *
 * The run and its stop are `StatedRun.ts`'s, and the configure order is
 * `ConfigurePrologue.ts`'s. A layer that fails to build is not a defect of the run: it is
 * `WiringRead.Failed` inside a feed that stays `Live`.
 *
 * **It only forks.** Nothing here waits on the poll, so a scope built under
 * `Effect.runSync` cannot throw for an asynchronous layer: the feed is `Starting`
 * until the first sample lands.
 *
 * Exported from the package root (ADR-QD-173): a shell builds it in a scope it owns.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import type * as Scope from "effect/Scope";
import { makeConfigure } from "./ConfigurePrologue.ts";
import {
  foldReading,
  noDiagnostics,
  runDiagnostics,
  type Diagnostics,
  type DiagnosticsOptions,
} from "./Diagnostics.ts";
import { makeExternalStore, sameFieldsOrAbsent } from "./ExternalStore.ts";
import { makeStatedRun, type RunPlan } from "./StatedRun.ts";

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
   * The run's own work ended on anything but success, an interruption it gave itself
   * included. An interruption from outside (a restart, absent options, a replaced field, the
   * scope closing) never stops it. `reason` is `causeMessage`'s text of the cause: a
   * `Cause.pretty` trace with stack frames and checkout paths whenever one renders, and the
   * one placeholder when the failed value cannot be read. It is for a developer in the host's
   * own process and must not cross a trust boundary. `sampled` says whether the reading
   * shown holds an accepted sample.
   */
  Stopped: { readonly reason: string; readonly sampled: boolean };
}>;

export const DiagnosticsStatus = Data.taggedEnum<DiagnosticsStatus>();

/** The poll's status and the reading shown, in one value so no reader sees one without the other. */
export interface DiagnosticsSnapshot {
  readonly status: DiagnosticsStatus;
  readonly reading: Diagnostics;
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
  /**
   * Registers a listener, and returns the function that removes it. A throw during a
   * publish from the poll is stated as the poll's stop, and the `Stopped` is held even when
   * a listener throws on that publish too. What a listener throws on the `Starting` that
   * `restart` or `configure` publishes is rethrown once the new poll has started (see
   * `StatedRun.ts`).
   */
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => DiagnosticsSnapshot;
  /** Starts the poll again with the options it holds; nothing when it holds none. */
  readonly restart: () => void;
}

export interface DiagnosticsFeed extends DiagnosticsReadout {
  /**
   * Compared per field over the normalised options: an options object equal field by
   * field to the previous one restarts nothing, and a field omitted equals one holding
   * `undefined`. `undefined` ends the run and resets the reading.
   */
  readonly configure: (options: DiagnosticsOptions | undefined) => void;
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
export const idleDiagnostics = (options: DiagnosticsOptions | undefined): DiagnosticsReadout =>
  options === undefined ? IDLE_OFF : IDLE_STARTING;

/**
 * The one normaliser of the diagnostics feed's options.
 *
 * An omitted field and one holding `undefined` become one field, so two options that
 * differ only in how they spell an absent field are one option. It sits here rather than
 * beside its type in `Diagnostics.ts` so that it is in a file the mutation record
 * measures. The declared return type makes a new option a compile error until it is
 * listed here (ADR-QD-192).
 */
export const completeDiagnosticsOptions = (
  options: DiagnosticsOptions,
): Required<DiagnosticsOptions> => ({
  layer: options.layer,
  collector: options.collector,
  intervalMillis: options.intervalMillis,
});

/**
 * Builds the feed bare in the caller's scope; closing it interrupts the run, and an
 * interruption from outside is never a `Stopped`.
 *
 * The feed takes its options only through `configure` (ADR-QD-192), so a bare feed is
 * `Off` and starts nothing until it is handed options.
 */
export const makeDiagnosticsFeed = Effect.fn("qadi.devtools.makeDiagnosticsFeed")(function* (): Effect.fn.Return<
  DiagnosticsFeed,
  never,
  Scope.Scope
> {
  let held: Required<DiagnosticsOptions> | undefined;
  // Whether the reading shown holds an accepted sample: reset only by `Off`.
  let sampled = false;
  const view = makeExternalStore<DiagnosticsSnapshot>(diagnosticsOff);
  // One run at a time: a newer start supersedes and interrupts the one before it.
  const runs = yield* makeStatedRun((reason) =>
    show(DiagnosticsStatus.Stopped({ reason, sampled }), view.getSnapshot().reading),
  );

  // One publish per transition, carrying status and reading together: the snapshot is the
  // only place the reading lives. An unchanged pair publishes nothing.
  const show = (status: DiagnosticsStatus, reading: Diagnostics) => {
    const current = view.getSnapshot();
    if (current.status === status && current.reading === reading) return;
    view.set({ status, reading });
  };

  // The `Starting` value is the one constant, so `show` drops a repeat.
  const plan = (next: Required<DiagnosticsOptions>): RunPlan => ({
    starting: () => show(diagnosticsStarting.status, view.getSnapshot().reading),
    engine: ({ guard }) =>
      runDiagnostics(
        {
          // The run guard comes first, so a superseded run's sample is neither read nor folded.
          accept: guard((sample) => {
            const current = view.getSnapshot();
            const reading = foldReading(current.reading, sample);
            sampled = true;
            // An unchanged sample folds to the same reading, so Live is marked here, not by a
            // changed one.
            show(
              DiagnosticsStatus.$is("Live")(current.status) ? current.status : DiagnosticsStatus.Live(),
              reading,
            );
          }),
        },
        next,
      ),
  });

  const configure = makeConfigure(
    {
      closed: runs.closed,
      complete: (next: DiagnosticsOptions | undefined) =>
        next === undefined ? undefined : completeDiagnosticsOptions(next),
      held: () => held,
      same: sameFieldsOrAbsent,
      hold: (wanted) => {
        held = wanted;
      },
    },
    (wanted) => {
      if (wanted === undefined) {
        runs.stop();
        sampled = false;
        view.set(diagnosticsOff);
      } else runs.start(plan(wanted));
    },
  );

  const restart = () => {
    if (held !== undefined) runs.start(plan(held));
  };

  return { subscribe: view.subscribe, getSnapshot: view.getSnapshot, configure, restart };
});
