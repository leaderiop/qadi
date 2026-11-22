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
 * `configure` dispatches only the inputs whose identity moved (ARCH-63's defect
 * class: an unchanged prop must not wipe a capture or a half-filled form).
 *
 * **The model owns its lifetime.** It is built in a `Scope`. It reads its source
 * through a timeline feed, its diagnostics through a diagnostics feed and its gate
 * registry and questions thunk through a gates feed, each with its own handle in the
 * model's scope; closing the scope ends all three and any simulation run (ADR-QD-137).
 * The model holds no registry subscription of its own. There is no `dispose` and no
 * `read` command.
 *
 * **Its stores.** The stores are listed once, in BEH-QD-700, and a test of a built model
 * checks that list. The shown reading, `questions` and `services` are derived stores
 * (ADR-QD-185), each recomputed from its key when a field of it changes identity and
 * stopped with the model's scope. `sightings` is a thunk and not a store.
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
} from "./DiagnosticsStore.ts";
import { makeDockSession, type DockSession } from "./DockSession.ts";
import { makeExplorerSession, type ExplorerSession } from "./ExplorerSession.ts";
import { makeDerivedStore, type ReadableStore } from "./ExternalStore.ts";
import {
  joinQuestions,
  type AskedQuestionLike,
  type GateRegistryLike,
  type JoinInput,
  type QuestionsSnapshot,
} from "./Gates.ts";
import { makeGatesFeed, type AskedRead, type GatesSnapshot, type RegistryRead } from "./GatesFeed.ts";
import { makeHeldChoiceStore, type HeldChoiceStore } from "./HeldChoice.ts";
import { portCards, type ServicesInput, type ServicesView } from "./PortCards.ts";
import { sameRole } from "./RoleTree.ts";
import { makeSimulationSession, type SimulationSession } from "./SimulationSession.ts";
import type { EvaluationPortsLayer } from "./SimulationInput.ts";
import type { Source } from "./Source.ts";
import type { Timeline } from "./Timeline.ts";
import { makeTimelineFeed, type TimelineStatusReadout } from "./TimelineFeed.ts";
import type { TimelineStore } from "./TimelineStore.ts";

/** What a host hands the dock. Each field is compared by identity when it is configured again. */
export interface DockModelInputs {
  readonly capacity?: number | undefined;
  readonly catalogue?: Catalogue | undefined;
  /** What to sample; compared per field, so an inline literal restarts nothing. */
  readonly diagnostics?: DiagnosticsOptions | undefined;
  /** The registry of live guards; the gates feed subscribes in the model's scope. Absent: the panel says none was handed over. */
  readonly gates?: GateRegistryLike | undefined;
  /**
   * The questions asked so far, usually `atoms.asked`.
   *
   * Read by the gates feed on the diagnostics cadence and never by the poll, so a throw is stated in
   * the panel and the poll keeps running (ADR-QD-169).
   */
  readonly questions?: (() => ReadonlyArray<AskedQuestionLike>) | undefined;
  /** A reading taken elsewhere: each field it carries wins; a change recomputes the merge and never restarts the poll. */
  readonly reading?: DiagnosticsReading | undefined;
  readonly ports?: EvaluationPortsLayer | undefined;
  /** Read in the model's own scope; a new source (or capacity) supersedes the previous read. */
  readonly source?: Source | undefined;
}

export interface DockModel {
  /** Stable across a capacity change: a different bound is a different buffer, not a different review session. */
  readonly timeline: TimelineStore;
  readonly dock: DockSession;
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
  /** `catalogueOf` of the shown timeline and the current catalogue, computed once per change. */
  readonly sightings: () => ReadonlyArray<PolicySighting>;
  /** Dispatches only the inputs whose identity changed. An omitted input reads as `undefined`. */
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

/** One list for every absent catalogue, so the role store keeps one identity. */
const NO_ROLES: ReadonlyArray<Role> = [];

/** Builds the model in the caller's scope; closing it interrupts the source read and any run in flight. */
export const makeDockModel = Effect.fn("qadi.devtools.makeDockModel")(function* (
  init?: DockModelInputs,
): Effect.fn.Return<DockModel, never, Scope.Scope> {
  let inputs: DockModelInputs = init ?? {};
  // Reads the source in this scope; the store it hands back outlives a capacity change.
  const timelineFeed = yield* makeTimelineFeed({ capacity: inputs.capacity, source: inputs.source });
  const timeline = timelineFeed.timeline;
  let shown: Timeline = timeline.getSnapshot();
  let rail = catalogueOf(shown, inputs.catalogue);

  const simulation = yield* makeSimulationSession({ sightings: rail });
  simulation.setPorts(inputs.ports);
  const explorer = makeExplorerSession({ sightings: rail });
  const roles = makeHeldChoiceStore(inputs.catalogue?.roles ?? NO_ROLES, sameRole);
  const dock = makeDockSession({ timeline: shown, simulation });

  const spread = () => {
    rail = catalogueOf(shown, inputs.catalogue);
    explorer.setSightings(rail);
    simulation.setSightings(rail);
    dock.setTimeline(shown);
  };

  // Subscribed here, before any host listener, so the rail moves first. A pause toggle
  // publishes the same timeline, which reaches the host but not the rail.
  timeline.subscribe(() => {
    const next = timeline.getSnapshot();
    if (next === shown) return;
    shown = next;
    spread();
  });

  // Forks the poll and never waits on it, so an asynchronous layer leaves it `Starting` after the build.
  const diagnosticsFeed = yield* makeDiagnosticsFeed(inputs.diagnostics);
  const shownReading = yield* makeDerivedStore({
    parents: [diagnosticsFeed],
    key: (): MergeKey => ({
      fed: diagnosticsFeed.getSnapshot(),
      supplied: inputs.reading,
    }),
    compute: mergedOf,
  });

  // Host code, both of it: the feed guards the registry and the thunk, and states a throw in its snapshot.
  const gatesFeed = yield* makeGatesFeed({
    gates: inputs.gates,
    questions: inputs.questions,
    intervalMillis: inputs.diagnostics?.intervalMillis,
  });
  // The join is pure over the feed's snapshot, the supplied questions and the poll's
  // status, so no snapshot pairs a question from one moment with a guard from another.
  // Built after the shown reading and the feeds and before any host listener, so the join
  // and the cards move first.
  const questions = yield* makeDerivedStore({
    parents: [gatesFeed, shownReading],
    key: (): JoinKey => {
      const supplied = inputs.reading?.questions;
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

  return {
    timeline,
    dock,
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
    sightings: () => rail,

    configure: (next) => {
      const before = inputs;
      inputs = next;
      timelineFeed.configure({ capacity: next.capacity, source: next.source });
      if (next.catalogue !== before.catalogue) {
        spread();
        roles.setList(next.catalogue?.roles ?? NO_ROLES);
      }
      // The session guards an identical layer itself, so this is not guarded again.
      simulation.setPorts(next.ports);
      // The feed re-reads the registry and the thunk before the shown reading is
      // refreshed, whose publish joins through them: one `configure` reads no
      // registry the host has just handed away, and publishes one join.
      gatesFeed.configure({
        gates: next.gates,
        questions: next.questions,
        intervalMillis: next.diagnostics?.intervalMillis,
      });
      diagnosticsFeed.configure(next.diagnostics);
      // A reading that moved is a new shown reading, which the join and the cards follow
      // through their parents.
      shownReading.refresh();
    },
  };
});
