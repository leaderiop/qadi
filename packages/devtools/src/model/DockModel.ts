/**
 * The dock's nine stores and the rules between them, as one model a test can drive without rendering.
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
 * through a timeline feed and its diagnostics through a diagnostics feed, each
 * with its own handle in the model's scope; closing the scope ends both and any
 * simulation run and the registry subscription (ADR-QD-137). There is no `dispose`
 * and no `read` command.
 *
 * **Nine stores, counted once.** Seven came first: the timeline, the dock session,
 * the explorer, the role choice, the simulation, the diagnostics reading (the poll's
 * status and the sampled reading with a supplied one laid over it) and the timeline
 * status (whether its read is running or stopped, with the one command that reads it
 * again). `questions` is the eighth: the gate registry joined to the polled questions,
 * recomputed from both in one synchronous step. `services` is the ninth (ADR-QD-168):
 * the Services tab's port cards, one pure function of the shown reading, recomputed
 * only when one of its four inputs changes identity. `sightings` is a thunk and not a
 * store. Earlier records counted the policy rail among the stores, which is why they
 * call diagnostics the seventh store and the timeline status the eighth.
 *
 * Package-private (ADR-QD-099): the dock is the one thing that drives it.
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import type { Role } from "@qadi/core";
import { catalogueOf, type Catalogue, type PolicySighting } from "./Catalogue.ts";
import {
  isUnsampled,
  makeDiagnosticsFeed,
  type DiagnosticsDockOptions,
  type DiagnosticsReadout,
  type DiagnosticsSnapshot,
} from "./DiagnosticsFeed.ts";
import { mergeReading, type DiagnosticsReading } from "./DiagnosticsStore.ts";
import { makeDockSession, type DockSession } from "./DockSession.ts";
import { makeExplorerSession, type ExplorerSession } from "./ExplorerSession.ts";
import { makeExternalStore, type ExternalStore } from "./ExternalStore.ts";
import { joinQuestions, type GateRegistryLike, type JoinInput, type QuestionsSnapshot } from "./Gates.ts";
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
  readonly diagnostics?: DiagnosticsDockOptions | undefined;
  /** The registry of live guards; the model subscribes in its own scope. Absent: the panel says none was handed over. */
  readonly gates?: GateRegistryLike | undefined;
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
  readonly questions: Pick<ExternalStore<QuestionsSnapshot>, "subscribe" | "getSnapshot">;
  /** The Services tab's port cards of the shown reading, recomputed only when one of its four inputs changes identity. */
  readonly services: Pick<ExternalStore<ServicesView>, "subscribe" | "getSnapshot">;
  /** `catalogueOf` of the shown timeline and the current catalogue, computed once per change. */
  readonly sightings: () => ReadonlyArray<PolicySighting>;
  /** Dispatches only the inputs whose identity changed. An omitted input reads as `undefined`. */
  readonly configure: (inputs: DockModelInputs) => void;
}

/**
 * What a registry's throw is stated as: the same text `DiagnosticsStatus.Stopped` carries for a poll's defect.
 * Total: a thrown value that cannot itself be rendered (a getter that throws) must not throw out of the guard.
 */
const reasonOf = (thrown: unknown): string => {
  try {
    return Cause.pretty(Cause.die(thrown));
  } catch {
    return "The registry threw a value that could not be described.";
  }
};

/** What two failures are compared by: an error's name and message, since the stack differs by call path. */
const keyOf = (thrown: unknown): string => {
  try {
    return thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : reasonOf(thrown);
  } catch {
    return reasonOf(thrown);
  }
};

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
  let fed = diagnosticsFeed.getSnapshot();
  let supplied = inputs.reading;
  const mergedOf = (snapshot: DiagnosticsSnapshot, reading: DiagnosticsReading | undefined): DiagnosticsSnapshot => {
    const merged = mergeReading(snapshot.reading, reading);
    return merged === snapshot.reading ? snapshot : { status: snapshot.status, reading: merged };
  };
  const shownReading = makeExternalStore<DiagnosticsSnapshot>(mergedOf(fed, supplied));
  const remerge = () => {
    const next = diagnosticsFeed.getSnapshot();
    if (next === fed && inputs.reading === supplied) return;
    fed = next;
    supplied = inputs.reading;
    shownReading.set(mergedOf(fed, supplied));
  };
  diagnosticsFeed.subscribe(remerge);

  // Both sources are read in the one call, so no snapshot pairs a question from one moment with
  // a guard from another. The registry is host code and the read is guarded: react's own registry
  // swallows a listener's throw, so an unguarded one would freeze this store silently, and a throw
  // while building would take the host's tree with it. A throw is stated as `GatesView.Failed`.
  let gatesNow = inputs.gates;
  let closed = false;
  let offGates = () => {};
  // Why `subscribe` threw, if it did: the registry's changes then may not reach the model, until `configure` watches again.
  let watchFailure: string | undefined;
  let watchKey: string | undefined;
  // What `rejoin` compares of a failure: one throw reads the same from any call path, where its rendered stack does not.
  let failureKey: string | undefined;
  const readGates = (): Pick<JoinInput, "gates" | "failed"> => {
    failureKey = watchKey;
    if (watchFailure !== undefined) return { gates: undefined, failed: watchFailure };
    try {
      return { gates: gatesNow?.instances(), failed: undefined };
    } catch (thrown) {
      failureKey = keyOf(thrown);
      return { gates: undefined, failed: reasonOf(thrown) };
    }
  };
  const joinKeyNow = (): JoinInput => {
    const { status, reading } = shownReading.getSnapshot();
    return {
      questions: reading.questions,
      ...readGates(),
      unsampled: reading.questions === undefined && isUnsampled(status),
    };
  };
  let lastKey = joinKeyNow();
  let lastFailureKey = failureKey;
  const questions = makeExternalStore<QuestionsSnapshot>(joinQuestions(lastKey));
  const rejoin = () => {
    // A closed model runs no host code: a command after close reads no registry.
    if (closed) return;
    const key = joinKeyNow();
    if (
      key.questions === lastKey.questions &&
      key.gates === lastKey.gates &&
      failureKey === lastFailureKey &&
      key.unsampled === lastKey.unsampled
    ) {
      return;
    }
    lastKey = key;
    lastFailureKey = failureKey;
    questions.set(joinQuestions(key));
  };
  // Releases the held subscription and takes the new one; both are host code and both are guarded.
  // The handle leaves the model's state before it is called, so a release that throws neither skips the
  // new subscription nor runs again on the next `configure` or in the finalizer. A release that throws
  // is not stated: it belongs to a registry the model no longer reads, and has nowhere honest to be shown.
  const watchGates = (registry: GateRegistryLike | undefined) => {
    const release = offGates;
    offGates = () => {};
    watchFailure = undefined;
    watchKey = undefined;
    try {
      release();
    } catch {
      // The registry left behind may keep a listener, which only calls `rejoin`.
    }
    try {
      offGates = closed || registry === undefined ? () => {} : registry.subscribe(rejoin);
    } catch (thrown) {
      watchFailure = reasonOf(thrown);
      watchKey = keyOf(thrown);
    }
  };
  // The port cards are a function of the shown reading alone: no host code is read, so nothing here is guarded.
  const servicesKeyNow = (): ServicesInput => {
    const { status, reading } = shownReading.getSnapshot();
    return {
      wiring: reading.wiring,
      activity: reading.activity,
      portCalls: reading.portCalls,
      unsampled: isUnsampled(status),
    };
  };
  let lastServices = servicesKeyNow();
  const services = makeExternalStore<ServicesView>(portCards(lastServices));
  const reservice = () => {
    const key = servicesKeyNow();
    if (
      key.wiring === lastServices.wiring &&
      key.activity === lastServices.activity &&
      key.portCalls === lastServices.portCalls &&
      key.unsampled === lastServices.unsampled
    ) {
      return;
    }
    lastServices = key;
    services.set(portCards(key));
  };
  // After `shownReading` exists and before any host listener, so the join and the cards move first.
  shownReading.subscribe(rejoin);
  shownReading.subscribe(reservice);
  watchGates(gatesNow);
  rejoin();
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      closed = true;
      const release = offGates;
      offGates = () => {};
      try {
        release();
      } catch {
        // A closing model has nowhere to state it.
      }
    }),
  );

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
      diagnosticsFeed.configure(next.diagnostics);
      // The registry is swapped before `remerge`, whose publish joins through it: one `configure` reads
      // no registry the host has just handed away. A watch that failed is tried again, with the same
      // registry or another.
      if (next.gates !== gatesNow || watchFailure !== undefined) {
        gatesNow = next.gates;
        watchGates(gatesNow);
      }
      remerge();
      rejoin();
    },
  };
});
