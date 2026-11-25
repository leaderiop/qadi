/**
 * The dock's stores and the rules between them, as one model a test can drive without
 * rendering.
 *
 * The dock built the timeline, the policy rail, the explorer, the role choice, the
 * simulation and its own session in React and connected them with layout effects,
 * so the rules between them (a new timeline reaches every screen, a replay commands
 * the simulation, an unchanged prop dispatches nothing) were reachable only by
 * rendering the whole dock. This is ADR-QD-047's amendments 1.7 and 1.10 taken one
 * step further (ARCH-74): the model subscribes to its own timeline, computes the
 * rail once per change and hands it to every store, so a host has nothing to wire.
 *
 * **One push per change.** A new shown timeline, or a new catalogue, computes
 * `catalogueOf` once and reaches the explorer, the simulation and the dock
 * session synchronously, so no two screens can read different timelines.
 * `configure` is seven steps, each a no-op on inputs its target already holds through
 * that target's own guard (ARCH-63's defect class: an unchanged prop must not wipe a
 * capture or a half-filled form). A capacity is compared by the bound it means and
 * applied whole or not at all: one the timeline refuses throws before anything moves.
 * Every step runs whatever a listener throws, and what they threw is rethrown after the
 * last step, one as itself and several as one `AggregateError` in step order
 * (ADR-QD-194).
 *
 * **The model owns its lifetime.** It is built in a `Scope`. It reads its source
 * through a timeline feed, its diagnostics through a diagnostics feed and its gate
 * registry and questions thunk through a gates feed, each with its own handle in the
 * model's scope; closing the scope ends all three and any simulation run (ADR-QD-137).
 * The model holds no registry subscription of its own. There is no `dispose` and no
 * `read` command.
 *
 * **Its stores.** The stores are listed once, in BEH-QD-700. A test of a built model
 * lists its members that have `subscribe` and `getSnapshot` and fails when one is added
 * or removed, and review keeps that list equal to BEH-QD-700's. The model has four
 * derived stores (ADR-QD-185): the sightings rail, the shown reading, `questions` and
 * `services`, each recomputed from its key when a field of it changes identity and
 * stopped with the model's scope. The rail is not a member: `sightings` is a thunk
 * reading it, and not a store.
 *
 * Package-private (ADR-QD-099): the dock is the one thing that drives it.
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import type * as Scope from "effect/Scope";
import type { Role } from "@qadi/core";
import { catalogueOf, type Catalogue, type PolicySighting } from "./Catalogue.ts";
import {
  isUnsampled,
  makeDiagnosticsFeed,
  type DiagnosticsReadout,
  type DiagnosticsSnapshot,
} from "./DiagnosticsFeed.ts";
import {
  mergeReading,
  type DiagnosticsOptions,
  type DiagnosticsReading,
} from "./Diagnostics.ts";
import { makeDockSession, type DockSession } from "./DockSession.ts";
import { makeExplorerSession, type ExplorerSession } from "./ExplorerSession.ts";
import { callAll, makeDerivedStore, type ReadableStore } from "./ExternalStore.ts";
import {
  joinQuestions,
  type AskedQuestionLike,
  type GateRegistryLike,
  type JoinInput,
  type QuestionsSnapshot,
} from "./Gates.ts";
import {
  makeGatesFeed,
  type AskedRead,
  type GatesFeedInputs,
  type GatesSnapshot,
  type RegistryRead,
} from "./GatesFeed.ts";
import { makeHeldChoiceStore, type HeldChoiceStore } from "./HeldChoice.ts";
import { makeLensSession, type LensSession } from "./LensSession.ts";
import { portCards, type ServicesInput, type ServicesView } from "./PortCards.ts";
import { sameRole } from "./RoleTree.ts";
import { makeSimulationSession, type SimulationSession } from "./SimulationSession.ts";
import type { EvaluationPortsLayer } from "./SimulationInput.ts";
import type { Source } from "./Source.ts";
import type { Timeline } from "./Timeline.ts";
import {
  effectiveCapacity,
  makeTimelineFeed,
  type TimelineFeedInputs,
  type TimelineStatusReadout,
} from "./TimelineFeed.ts";
import type { TimelineStore } from "./TimelineStore.ts";

/**
 * The dock's inputs, stated once: the props `DevtoolsDock` takes beside the host's own
 * (ADR-QD-192).
 *
 * Each field is compared by identity when it is configured again, except `capacity`, which is
 * compared by the bound it means; an omitted one is `DEFAULT_TIMELINE_CAPACITY` (ADR-QD-191).
 * Package-private (ADR-QD-099): a host reads these through `DevtoolsDockProps`.
 */
export interface DockModelInputs {
  /** How many rows to keep. Defaults to the timeline's own bound. */
  readonly capacity?: number | undefined;
  /**
   * Policies and roles the application names.
   *
   * Optional because the policy rail is built from what the log has **seen** —
   * every record carries its policy — so this adds only what has not run yet,
   * plus the names. Roles are not observable at all and come only from here.
   */
  readonly catalogue?: Catalogue | undefined;
  /**
   * What to sample while the dock is mounted: the application's layer and the
   * port-call collector, each optional.
   *
   * The way to keep the Services and React panels current without writing the
   * loop: the dock samples on a schedule, keeps a reading's identity while it is
   * unchanged, and releases the layer on unmount. Absent, nothing is sampled and
   * the panels explain what they would need; `{}` samples the metric reads
   * alone. Compared per field, so an inline literal restarts nothing; the run
   * restarts when a field changes identity, so hold the fields at module scope.
   * The dock's model polls in its own scope, so a hidden-then-shown dock samples
   * afresh, from its first sample.
   *
   * Gates and questions are not in it: the gates come from the registry the `gates`
   * input hands over, and the questions from the `questions` input, both read by the
   * dock's model in its own scope.
   */
  readonly diagnostics?: DiagnosticsOptions | undefined;
  /**
   * The registry of live guards, usually the feed's `gates` or `atoms.gates` from `@qadi/react`.
   *
   * Needs `instrument` on the `QadiProvider` to list anyone, so it is opt-in
   * twice over — a host has to ask for the registry and then hand it here. The
   * gates feed subscribes to it in the model's scope, so the host does not
   * re-render when a guard mounts or goes (ADR-QD-162). Absent: the panel says none was
   * handed over.
   */
  readonly gates?: GateRegistryLike | undefined;
  /**
   * The questions asked so far, usually the feed's `questions` or `atoms.asked` from `@qadi/react`.
   *
   * Read by the gates feed on the diagnostics cadence and never by the poll, so a throw is stated in
   * the panel and the poll keeps running (ADR-QD-169). Hold it at module scope or in a
   * `useMemo`, since the model reads it again when its identity changes.
   */
  readonly questions?: (() => ReadonlyArray<AskedQuestionLike>) | undefined;
  /**
   * A reading taken elsewhere, such as another process's or a fixture's.
   *
   * Each field it carries takes precedence over the same field of what
   * `diagnostics` samples, and a field it omits falls through to the sample
   * (`mergeReading`). It answers "what did another process see", which sampling
   * this one cannot: for this process, hand over `diagnostics` instead. Its
   * `wiring` is a `WiringRead`, so a reading from elsewhere can state a failed
   * read as well as a report; its `portCalls` come from `collectPortCalls` and
   * need the collector's tracer layer wired where evaluations ran; its
   * `questions` are usually `atoms.asked()` from `@qadi/react`. A change
   * recomputes the merge and never restarts the poll.
   */
  readonly reading?: DiagnosticsReading | undefined;
  /**
   * The application's own resolvers, for the simulator's `Live` source.
   *
   * The only way anything in this package performs I/O, so it is opt-in by the
   * application author. Without it the simulator still works on fixtures, and
   * the `Live` option is shown disabled with the reason.
   */
  readonly ports?: EvaluationPortsLayer | undefined;
  /**
   * Where records come from, read in the model's own scope; a new source (or capacity)
   * supersedes the previous read. Omitted, the dock renders empty rather than throwing.
   */
  readonly source?: Source | undefined;
}

/**
 * The one normaliser of the dock model's inputs.
 *
 * A capacity the timeline refuses throws here, before anything moves, and a field added to
 * `DockModelInputs` is a compile error until it is listed, so it cannot be left out of the
 * comparison (ADR-QD-192).
 */
export const completeDockInputs = (inputs: DockModelInputs): Required<DockModelInputs> => ({
  capacity: effectiveCapacity(inputs.capacity),
  catalogue: inputs.catalogue,
  diagnostics: inputs.diagnostics,
  gates: inputs.gates,
  questions: inputs.questions,
  reading: inputs.reading,
  ports: inputs.ports,
  source: inputs.source,
});

/**
 * What the dock hands each of its three feeds: the timeline's and the gates' records, and the
 * diagnostics' options as the host gave them when it is on, which the diagnostics feed's own
 * `configure` normalises.
 */
interface FeedInputs {
  readonly timeline: Required<TimelineFeedInputs>;
  readonly gates: Required<GatesFeedInputs>;
  readonly diagnostics: DiagnosticsOptions | undefined;
}

/**
 * Maps the dock's inputs onto its three feeds, the one place this is written.
 *
 * The poll's interval is one setting: the diagnostics own it, and the gates read their thunk on the
 * same cadence, so it crosses from one record to the other here and nowhere else (ADR-QD-192).
 */
export const feedInputsOf = (inputs: Required<DockModelInputs>): FeedInputs => ({
  timeline: { capacity: inputs.capacity, source: inputs.source },
  gates: {
    gates: inputs.gates,
    questions: inputs.questions,
    intervalMillis: inputs.diagnostics?.intervalMillis,
  },
  diagnostics: inputs.diagnostics,
});

export interface DockModel {
  /** Stable across a capacity change: a different bound is a different buffer, not a different review session. */
  readonly timeline: TimelineStore;
  readonly dock: DockSession;
  /**
   * The highlight lens: what is drawn over the page, whether the reader is picking, and the
   * guard they picked; no configure touches it.
   */
  readonly lens: LensSession;
  readonly explorer: ExplorerSession;
  readonly roles: HeldChoiceStore<Role>;
  readonly simulation: SimulationSession;
  /** The merged reading and the poll's status, recomputed when either side changes, never on read. */
  readonly diagnostics: DiagnosticsReadout;
  /** The timeline read's status and its restart, passed through from the timeline feed; not merged. */
  readonly timelineStatus: TimelineStatusReadout;
  /** The asked questions joined to the guards asking them, both read at one moment; holds guards and questions, never a verdict. */
  readonly questions: ReadableStore<QuestionsSnapshot>;
  /** The Services tab's port cards of the shown reading, recomputed only when one of its four inputs changes identity. */
  readonly services: ReadableStore<ServicesView>;
  /**
   * The rail's snapshot: `catalogueOf` of the shown timeline and the held catalogue, recomputed
   * when either changes identity, once per change.
   */
  readonly sightings: () => ReadonlyArray<PolicySighting>;
  /**
   * Applies the inputs.
   *
   * A capacity the timeline refuses throws before anything moves. Every other step runs
   * whatever a listener throws, and the throws are rethrown after the last step, one as itself
   * and several as one `AggregateError` in step order (ADR-QD-194). An omitted input reads as
   * `undefined`, an omitted capacity as `DEFAULT_TIMELINE_CAPACITY`.
   */
  readonly configure: (inputs: DockModelInputs) => void;
}

/** What the join reads of the registry: its guards, or why it could not be read. */
const registryInput: (read: RegistryRead) => Pick<JoinInput, "gates" | "failed"> = Match.type<RegistryRead>().pipe(
  Match.tagsExhaustive({
    Unwatched: () => ({}),
    Read: ({ instances }) => ({ gates: instances }),
    Failed: ({ reason }) => ({ failed: reason }),
  }),
);

/** What the join reads of the questions thunk: its answer, or why it threw. */
const askedInput: (read: AskedRead) => {
  readonly read?: ReadonlyArray<AskedQuestionLike> | undefined;
  readonly failed?: string | undefined;
} = Match.type<AskedRead>().pipe(
  Match.tagsExhaustive({
    Unhanded: () => ({}),
    Read: ({ questions }) => ({ read: questions }),
    Failed: ({ reason }) => ({ failed: reason }),
  }),
);

/**
 * The three things the join reads, compared by identity: the feed's snapshot, the supplied questions and
 * whether the poll's lack of a sample matters, which it does only with no supplied questions.
 */
interface JoinKey {
  readonly feed: GatesSnapshot;
  readonly supplied: ReadonlyArray<AskedQuestionLike> | undefined;
  readonly unsampled: boolean;
}

/**
 * The join's input: supplied questions win, then the thunk's, which a poll that has not sampled withholds.
 *
 * A thunk's failure is carried even then; the view states it only when no questions are read, so a
 * supplied list makes it moot.
 */
const joinInputOf = (key: JoinKey): JoinInput => {
  const registry = registryInput(key.feed.registry);
  const asked = askedInput(key.feed.asked);
  return {
    questions: key.supplied ?? (key.unsampled ? undefined : asked.read),
    ...registry,
    questionsFailed: asked.failed,
    unsampled: key.unsampled,
  };
};

/** The two things the shown reading is merged from, compared by identity. */
interface MergeKey {
  readonly fed: DiagnosticsSnapshot;
  readonly supplied: DiagnosticsReading | undefined;
}

/**
 * The sampled snapshot with the supplied reading laid over it, the feed's own snapshot
 * when the merge changes nothing.
 */
function mergedOf(key: MergeKey): DiagnosticsSnapshot {
  const merged = mergeReading(key.fed.reading, key.supplied);
  if (merged === key.fed.reading) return key.fed;
  return { status: key.fed.status, reading: merged };
}

/** The two things the sightings rail is computed from, compared by identity. */
interface RailKey {
  readonly shown: Timeline;
  readonly catalogue: Catalogue | undefined;
}

/** One list for every absent catalogue, so the role store keeps one identity. */
const NO_ROLES: ReadonlyArray<Role> = [];

/**
 * Builds the model bare in the caller's scope; closing it interrupts the source read and any
 * run in flight.
 *
 * The model takes its inputs only through `configure` (ADR-QD-192), so a bare model
 * shows what an empty record shows until it is handed one.
 */
export const makeDockModel = Effect.fn("qadi.devtools.makeDockModel")(function* (): Effect.fn.Return<
  DockModel,
  never,
  Scope.Scope
> {
  let held = completeDockInputs({});
  // Reads the source in this scope, once `configure` hands it over; the store it hands back
  // outlives a capacity change.
  const timelineFeed = yield* makeTimelineFeed();
  const timeline = timelineFeed.timeline;
  // The sightings rail, a function of the shown timeline and the held catalogue. Built right
  // after the timeline and before any other subscription, so it moves first; a pause toggle
  // publishes the same timeline, which reaches the host but not the rail.
  const rail = yield* makeDerivedStore({
    parents: [timeline],
    key: (): RailKey => ({ shown: timeline.getSnapshot(), catalogue: held.catalogue }),
    compute: (key) => catalogueOf(key.shown, key.catalogue),
  });

  const simulation = yield* makeSimulationSession({ sightings: rail.getSnapshot() });
  const explorer = makeExplorerSession({ sightings: rail.getSnapshot() });
  const roles = makeHeldChoiceStore(NO_ROLES, sameRole);
  const dock = makeDockSession({ timeline: timeline.getSnapshot(), simulation });
  const lens = makeLensSession();

  rail.subscribe(() => explorer.setSightings(rail.getSnapshot()));
  rail.subscribe(() => simulation.setSightings(rail.getSnapshot()));
  timeline.subscribe(() => dock.setTimeline(timeline.getSnapshot()));

  // Forks the poll and never waits on it, so an asynchronous layer leaves it `Starting` after the build.
  const diagnosticsFeed = yield* makeDiagnosticsFeed();
  const shownReading = yield* makeDerivedStore({
    parents: [diagnosticsFeed],
    key: (): MergeKey => ({
      fed: diagnosticsFeed.getSnapshot(),
      supplied: held.reading,
    }),
    compute: mergedOf,
  });

  // Host code, both of it: the feed guards the registry and the thunk, and states a throw in its snapshot.
  const gatesFeed = yield* makeGatesFeed();
  // The join is pure over the feed's snapshot, the supplied questions and the poll's
  // status, so no snapshot pairs a question from one moment with a guard from another.
  // Built after the shown reading and the feeds and before any host listener, so the join
  // and the cards move first.
  const questions = yield* makeDerivedStore({
    parents: [gatesFeed, shownReading],
    key: (): JoinKey => {
      const supplied = held.reading?.questions;
      const { status } = shownReading.getSnapshot();
      return {
        feed: gatesFeed.getSnapshot(),
        supplied,
        unsampled: supplied === undefined && isUnsampled(status),
      };
    },
    compute: (key) => joinQuestions(joinInputOf(key)),
  });
  // The port cards are a function of the shown reading alone: no host code is read, so nothing here is guarded.
  const services = yield* makeDerivedStore({
    parents: [shownReading],
    key: (): ServicesInput => {
      const { status, reading } = shownReading.getSnapshot();
      return {
        wiring: reading.wiring,
        activity: reading.activity,
        portCalls: reading.portCalls,
        unsampled: isUnsampled(status),
      };
    },
    compute: portCards,
  });

  const configure = (next: DockModelInputs) => {
    // A capacity the timeline refuses throws here, before anything moves.
    held = completeDockInputs(next);
    // Each step reads `held` when it runs, so a configure a listener makes from inside a step
    // decides the end state, and each is a no-op on inputs its target already holds.
    callAll(
      [
        () => timelineFeed.configure(feedInputsOf(held).timeline),
        () => rail.refresh(),
        () => roles.setList(held.catalogue?.roles ?? NO_ROLES),
        () => simulation.setPorts(held.ports),
        // The gates apply their inputs before the shown reading refreshes, whose publish
        // joins through them: one `configure` reads no registry the host has just handed
        // away, and publishes one join.
        () => gatesFeed.configure(feedInputsOf(held).gates),
        () => diagnosticsFeed.configure(feedInputsOf(held).diagnostics),
        // A reading that moved is a new shown reading, which the join and the cards
        // follow through their parents.
        () => shownReading.refresh(),
      ],
      "More than one step of the dock's configure threw.",
    );
  };

  return {
    timeline,
    dock,
    lens,
    explorer,
    roles,
    simulation,
    diagnostics: {
      subscribe: shownReading.subscribe,
      getSnapshot: shownReading.getSnapshot,
      restart: diagnosticsFeed.restart,
    },
    timelineStatus: timelineFeed.status,
    questions: { subscribe: questions.subscribe, getSnapshot: questions.getSnapshot },
    services: { subscribe: services.subscribe, getSnapshot: services.getSnapshot },
    sightings: () => rail.getSnapshot(),
    configure,
  };
});
