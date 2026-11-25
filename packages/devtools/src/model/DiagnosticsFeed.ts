/**
 * One diagnostics poll, owned by a scope, with a closed status a panel can state.
 *
 * A sample that dies (a collector whose snapshot throws) ends the poll fiber, and a fiber
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
 * Exported from the package root (ADR-QD-173): a shell builds it in a scope it owns.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import type * as Scope from "effect/Scope";
import { causeMessage } from "@qadi/core";
import {
  foldReading,
  noDiagnostics,
  runDiagnostics,
  type Diagnostics,
  type DiagnosticsOptions,
  type DiagnosticsSink,
} from "./Diagnostics.ts";
import { makeExternalStore, sameFieldsOrAbsent } from "./ExternalStore.ts";
import { makeSupersedingRun } from "./SupersedingRun.ts";

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
   * The run ended on a defect. `reason` is `causeMessage`'s text of it: a `Cause.pretty`
   * trace with stack frames and checkout paths whenever one renders, and the one
   * placeholder when the died value cannot be read. It is for a developer in the host's
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
   * Registers a listener, and returns the function that removes it. Every listener is
   * called, and then what they threw is rethrown out of whatever published: one value as
   * itself, several as one `AggregateError`. A throw during a publish from the poll is
   * stated as the poll's stop, and the `Stopped` is held even when a listener throws on
   * that publish too. A throw on the `Starting` that `restart` or `configure` publishes is
   * rethrown once the new poll has started, so the feed never stays `Starting` with no poll
   * (ADR-QD-194).
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
 * interruption is never a `Stopped`.
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
  const runs = yield* makeSupersedingRun();

  // One publish per transition, carrying status and reading together: the snapshot is the
  // only place the reading lives. An unchanged pair publishes nothing.
  const show = (status: DiagnosticsStatus, reading: Diagnostics) => {
    const current = view.getSnapshot();
    if (current.status === status && current.reading === reading) return;
    view.set({ status, reading });
  };

  const start = (next: DiagnosticsOptions) => {
    const token = runs.begin();
    // The run guard comes first, so a superseded run's sample is neither read nor folded.
    const sink: DiagnosticsSink = {
      accept: (sample) => {
        if (!runs.isCurrent(token)) return;
        const current = view.getSnapshot();
        const reading = foldReading(current.reading, sample);
        sampled = true;
        // An unchanged sample folds to the same reading, so Live is marked here, not by a
        // changed one.
        show(
          DiagnosticsStatus.$is("Live")(current.status) ? current.status : DiagnosticsStatus.Live(),
          reading,
        );
      },
    };
    // Before the fork: its synchronous prefix may already reach `Live` or `Stopped`. The one
    // `Starting` value, so `show` drops a repeat. The poll starts whatever a listener throws on it.
    try {
      show(diagnosticsStarting.status, view.getSnapshot().reading);
    } finally {
      runs.fork(token, runDiagnostics(sink, next), {
        onFailure: (cause) =>
          show(
            DiagnosticsStatus.Stopped({ reason: causeMessage(cause), sampled }),
            view.getSnapshot().reading,
          ),
      });
    }
  };

  const off = () => {
    runs.stop();
    sampled = false;
    view.set(diagnosticsOff);
  };

  const configure = (next: DiagnosticsOptions | undefined) => {
    // A command on a closed feed would publish a state nothing follows.
    if (runs.closed()) return;
    const wanted = next === undefined ? undefined : completeDiagnosticsOptions(next);
    if (sameFieldsOrAbsent(held, wanted)) return;
    held = wanted;
    if (wanted === undefined) off();
    else start(wanted);
  };

  const restart = () => {
    if (!runs.closed() && held !== undefined) start(held);
  };

  return { subscribe: view.subscribe, getSnapshot: view.getSnapshot, configure, restart };
});
