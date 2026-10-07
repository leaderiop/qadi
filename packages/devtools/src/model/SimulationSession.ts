/**
 * A simulation session: everything the simulator screen knows, as a store.
 *
 * The screen used to hold this in eleven `useState`s and two `useRef`s — which
 * source is honoured, when a capture is taken and dropped, which run is
 * current, what is stale and what a re-seed resets — and so none of it fell
 * under the model's tests or its mutation gate. It is here now, behind the
 * interface `useSyncExternalStore` already wants (`subscribe`, `getSnapshot`)
 * and a handful of commands, the way `TimelineStore` holds the log. The React
 * hook is an adapter that forks `run` and subscribes; it decides nothing.
 *
 * **Four rules each live in one function.** A source that cannot be honoured is
 * *refused*, as a state, and nothing is evaluated (`resolveSource`) — the
 * `portsOf` rule, one layer up, where a chosen `Live` with no `ports` used to
 * answer from fixtures. A Live run *captures*, which is what makes `Snapshot`
 * available (`run`). A run that was superseded never lands (`generation`). And a
 * result is shown only for the question it answered (`stale`, `baseline`).
 *
 * The store is a closure over `makeExternalStore`, the mechanics
 * `TimelineStore.ts` shares; commands are synchronous and notify once. `run` is an Effect the caller
 * forks: model code never forks on its own behalf.
 */
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Match from "effect/Match";
import type { DecisionOutcome, Policy } from "@qadi/core";
import { makeExternalStore } from "./ExternalStore.ts";
import { capturing, type CapturedAnswers } from "./Capture.ts";
import type { PolicySighting } from "./Catalogue.ts";
import { baselineDiff, replayInput, type Baseline, type UnseededField } from "./Replay.ts";
import { simulate, type SimulationClock } from "./Simulation.ts";
import { decodeResource, encodeResource, renameSubject, withResource } from "./SimulationForm.ts";
import type { EvaluationPortsLayer, SimulationInput } from "./SimulationInput.ts";
import { fixtures, live, snapshot, type SimulationSource } from "./SimulationSource.ts";
import type { TimelineEntry } from "./Timeline.ts";
import { sweepPlan, whatIf, type SweepPlan, type WhatIfReport } from "./WhatIf.ts";

/** Which of the three answer sources the reviewer picked. */
export type SourceChoice = SimulationSource["_tag"];

/** One source button: whether it can be used, and the sentence that says why (or why not). */
export interface SourceOption {
  readonly id: SourceChoice;
  readonly enabled: boolean;
  readonly why: string;
}

/** Why a chosen source cannot be honoured. A data state: nothing failed, the run was declined. */
export type SourceRefusal =
  | { readonly _tag: "LiveWithoutPorts"; readonly reason: string }
  | { readonly _tag: "SnapshotWithoutCapture"; readonly reason: string };

export type ResolvedSource =
  | { readonly _tag: "Available"; readonly source: SimulationSource }
  | { readonly _tag: "Unavailable"; readonly refusal: SourceRefusal };

const LIVE_WITHOUT_PORTS =
  "the host did not pass a `ports` layer, so this panel cannot reach any resolver";
const SNAPSHOT_WITHOUT_CAPTURE = "run once against Live first; this replays what that run learned";

/**
 * The source a choice names, or the reason it cannot be had.
 *
 * Never a fall back to fixtures: `portsOf` treats an absent source as fixtures,
 * which is the right default for a caller who never chose and the wrong answer
 * for one who chose `Live` and is entitled to know it did not happen.
 */
export const resolveSource = (
  choice: SourceChoice,
  ports: EvaluationPortsLayer | undefined,
  capture: CapturedAnswers | undefined,
): ResolvedSource =>
  Match.value(choice).pipe(
    Match.when("Fixtures", (): ResolvedSource => ({ _tag: "Available", source: fixtures })),
    Match.when("Snapshot", (): ResolvedSource =>
      capture === undefined
        ? {
            _tag: "Unavailable",
            refusal: { _tag: "SnapshotWithoutCapture", reason: SNAPSHOT_WITHOUT_CAPTURE },
          }
        : { _tag: "Available", source: snapshot(capture) },
    ),
    Match.when("Live", (): ResolvedSource =>
      ports === undefined
        ? { _tag: "Unavailable", refusal: { _tag: "LiveWithoutPorts", reason: LIVE_WITHOUT_PORTS } }
        : { _tag: "Available", source: live(ports) },
    ),
    Match.exhaustive,
  );

/**
 * The three options and whether each is available.
 *
 * Offered and disabled with a reason, never removed: a control that disappears
 * teaches nobody it exists, which matters most for `Snapshot`.
 */
export const sourceOptions = (
  ports: EvaluationPortsLayer | undefined,
  capture: CapturedAnswers | undefined,
): ReadonlyArray<SourceOption> => [
  { id: "Fixtures", enabled: true, why: "answers you typed below" },
  {
    id: "Snapshot",
    enabled: capture !== undefined,
    why:
      capture === undefined
        ? SNAPSHOT_WITHOUT_CAPTURE
        : "real answers, captured once and replayed — one round of I/O for a whole sweep",
  },
  {
    id: "Live",
    enabled: ports !== undefined,
    why:
      ports === undefined
        ? LIVE_WITHOUT_PORTS
        : "the application's own resolvers — every row is real I/O",
  },
];

/** The policy being simulated, and where it came from. */
export type PolicyChoice =
  | { readonly _tag: "None" }
  | { readonly _tag: "Chosen"; readonly index: number; readonly policy: Policy }
  | {
      readonly _tag: "Seeded";
      readonly entry: TimelineEntry;
      readonly policy: Policy;
      readonly unseeded: ReadonlyArray<UnseededField>;
    };

/** What a run was asked, kept with its answer so the answer can be judged against the form. */
export interface SimulationQuestion {
  readonly policy: Policy;
  readonly input: SimulationInput;
  /** The replayed row the policy came from, when it came from one. */
  readonly seed: TimelineEntry | undefined;
  readonly source: SourceChoice;
}

export type RunState =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Running"; readonly question: SimulationQuestion }
  | {
      readonly _tag: "Ran";
      readonly question: SimulationQuestion;
      readonly outcome: DecisionOutcome;
      readonly report: WhatIfReport | undefined;
      readonly clock: SimulationClock;
    }
  | { readonly _tag: "Broke"; readonly question: SimulationQuestion; readonly message: string }
  | { readonly _tag: "Refused"; readonly question: SimulationQuestion; readonly refusal: SourceRefusal };

/** The resource field's text, which may not parse yet, and why it does not. */
export interface ResourceText {
  readonly text: string;
  readonly error: string | undefined;
}

/** Everything a view reads. A new object only when something changed. */
export interface SimulationSnapshot {
  readonly sightings: ReadonlyArray<PolicySighting>;
  readonly policy: PolicyChoice;
  readonly draft: SimulationInput;
  readonly resourceText: ResourceText;
  readonly sourceChoice: SourceChoice;
  readonly options: ReadonlyArray<SourceOption>;
  /** Why the chosen source cannot be honoured, when it cannot. */
  readonly refusal: SourceRefusal | undefined;
  readonly clock: SimulationClock;
  readonly pairs: boolean;
  readonly capture: CapturedAnswers | undefined;
  /** What a sweep would run now; absent while there is no policy. */
  readonly plan: SweepPlan | undefined;
  readonly run: RunState;
  /** True when the form, the policy or the seed moved since the shown result ran. */
  readonly stale: boolean;
  /** Present only for a result that ran against the current seed. */
  readonly baseline: Baseline | undefined;
}

export type RunKind = "Run" | "Sweep";

export interface SimulationSession {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => SimulationSnapshot;

  readonly setSightings: (sightings: ReadonlyArray<PolicySighting>) => void;
  readonly choosePolicy: (index: number) => void;
  /** Re-seeds from a logged row, resets the form to it and drops any run. */
  readonly seed: (entry: TimelineEntry | undefined) => void;
  /** The host's resolvers. A different layer drops the capture taken from the old one. */
  readonly setPorts: (ports: EvaluationPortsLayer | undefined) => void;
  readonly chooseSource: (choice: SourceChoice) => void;
  readonly setClock: (clock: SimulationClock) => void;
  readonly setPairs: (pairs: boolean) => void;
  readonly edit: (next: SimulationInput) => void;
  /** Types into the resource field; the last resource that parsed is kept while it does not. */
  readonly editResourceText: (text: string) => void;
  readonly renameSubject: (to: string) => void;

  /** One run or sweep. Fork it; interrupting it interrupts the evaluation. */
  readonly run: (kind: RunKind) => Effect.Effect<void>;
  /** Interrupts the runs a command superseded. A no-op when there are none. */
  readonly reap: Effect.Effect<void>;
  /** Whether a superseded run is waiting for `reap`. */
  readonly hasRetired: () => boolean;
  /** Supersedes and interrupts every run. The session stays usable afterwards. */
  readonly dispose: Effect.Effect<void>;
}

export interface SimulationSessionInit {
  readonly sightings?: ReadonlyArray<PolicySighting>;
  readonly seed?: TimelineEntry;
  readonly ports?: EvaluationPortsLayer;
}

const blank: SimulationInput = { subject: { id: "someone" } };

const sameElements = <A>(a: ReadonlyArray<A>, b: ReadonlyArray<A>): boolean =>
  a === b || (a.length === b.length && a.every((one, index) => one === b[index]));

const resourceTextOf = (input: SimulationInput): ResourceText => {
  const text = encodeResource(input.resource);
  return text._tag === "Ok"
    ? { text: text.value, error: undefined }
    : { text: "", error: text.reason };
};

export const makeSimulationSession = (init?: SimulationSessionInit): SimulationSession => {
  let sightings: ReadonlyArray<PolicySighting> = init?.sightings ?? [];
  let chosen = 0;
  let seedEntry: TimelineEntry | undefined;
  let seeded: { readonly policy: Policy; readonly unseeded: ReadonlyArray<UnseededField> } | undefined;
  let draft: SimulationInput = blank;
  let resourceText: ResourceText = { text: "", error: undefined };
  let sourceChoice: SourceChoice = "Fixtures";
  let clock: SimulationClock = "live";
  let pairs = false;
  let ports: EvaluationPortsLayer | undefined = init?.ports;
  let capture: CapturedAnswers | undefined;
  let run: RunState = { _tag: "Idle" };

  /** Which run's result is still wanted. Bumped synchronously, before any fiber is touched. */
  let generation = 0;
  let current: Fiber.Fiber<unknown, unknown> | undefined;
  const retired: Array<Fiber.Fiber<unknown, unknown>> = [];

  const policyChoice = (): PolicyChoice => {
    if (seeded !== undefined && seedEntry !== undefined) {
      return { _tag: "Seeded", entry: seedEntry, policy: seeded.policy, unseeded: seeded.unseeded };
    }
    // `chosen` can outlive `sightings` shrinking: clamped here rather than
    // trusted, so a stale index reads the policy the dropdown now shows.
    const index = sightings.length === 0 ? undefined : Math.min(chosen, sightings.length - 1);
    const sighting = index === undefined ? undefined : sightings[index];
    return index === undefined || sighting === undefined
      ? { _tag: "None" }
      : { _tag: "Chosen", index, policy: sighting.policy };
  };

  const policyOf = (choice: PolicyChoice): Policy | undefined =>
    choice._tag === "None" ? undefined : choice.policy;

  /**
   * The row a result is compared against, when there is one to compare with.
   *
   * The replayed row while its policy is the one running. An orphan has no
   * policy to replay, so it never becomes the running policy — but it is still
   * the row the reviewer opened, and the baseline says it carries no decision.
   * A replayable row the reviewer walked away from is neither.
   */
  const seedOf = (choice: PolicyChoice): TimelineEntry | undefined =>
    choice._tag === "Seeded"
      ? choice.entry
      : seedEntry?._tag === "TimelineDecision"
        ? undefined
        : seedEntry;

  const build = (): SimulationSnapshot => {
    const policy = policyChoice();
    const resolved = resolveSource(sourceChoice, ports, capture);
    const policyNow = policyOf(policy);
    const plan =
      policyNow === undefined
        ? undefined
        : sweepPlan(policyNow, draft, {
            pairs,
            ...(resolved._tag === "Available" ? { source: resolved.source } : {}),
          });

    const question = run._tag === "Idle" ? undefined : run.question;
    const stale =
      question !== undefined &&
      (question.input !== draft ||
        policyNow === undefined ||
        !Equal.equals(question.policy, policyNow) ||
        question.seed !== seedOf(policy));

    const seed = seedOf(policy);
    const baseline =
      run._tag === "Ran" && !stale && seed !== undefined
        ? baselineDiff(seed, run.outcome)
        : undefined;

    return {
      sightings,
      policy,
      draft,
      resourceText,
      sourceChoice,
      options: sourceOptions(ports, capture),
      refusal: resolved._tag === "Unavailable" ? resolved.refusal : undefined,
      clock,
      pairs,
      capture,
      plan,
      run,
      stale,
      baseline,
    };
  };

  const store = makeExternalStore(build());

  /** Rebuilds the snapshot and tells every subscriber, once per command. */
  const commit = () => {
    store.publish(build());
  };

  /**
   * Makes the run in flight stale, synchronously.
   *
   * The generation alone guarantees the abandoned run's exit is never applied;
   * the fiber is parked for `reap` to interrupt, so a sync command (which a view
   * may dispatch while rendering) never has to run an Effect.
   */
  const retire = () => {
    generation += 1;
    if (current !== undefined) retired.push(current);
    current = undefined;
  };

  const reap = Effect.fn("qadi.devtools.simulationSession.reap")(function* () {
    const parked = retired.splice(0);
    yield* Effect.forEach(parked, (fiber) => Fiber.interrupt(fiber), { discard: true });
  });

  const program = (
    question: SimulationQuestion,
    kind: RunKind,
    source: SimulationSource,
    recorder: ReturnType<typeof capturing> | undefined,
    runClock: SimulationClock,
    runPairs: boolean,
  ) =>
    Effect.gen(function* () {
      const options = { clock: runClock, source };
      const report =
        kind === "Sweep"
          ? yield* whatIf(question.policy, question.input, { ...options, pairs: runPairs })
          : undefined;
      const outcome = report?.baseline ?? (yield* simulate(question.policy, question.input, options));
      const answers = recorder === undefined ? undefined : yield* recorder.answers;
      return { outcome, report, answers };
    });

  const runEffect = Effect.fn("qadi.devtools.simulationSession.run")(function* (kind: RunKind) {
    yield* reap();
    const choice = policyChoice();
    const policy = policyOf(choice);
    if (policy === undefined) return;

    const question: SimulationQuestion = {
      policy,
      input: draft,
      seed: seedOf(choice),
      source: sourceChoice,
    };

    const resolved = resolveSource(sourceChoice, ports, capture);
    if (resolved._tag === "Unavailable") {
      // Declined, not replaced: nothing is evaluated.
      retire();
      yield* reap();
      run = { _tag: "Refused", question, refusal: resolved.refusal };
      commit();
      return;
    }

    // A Live run always captures: the answers cost nothing extra to record and
    // they are what makes `Snapshot` reachable — the mode a sweep should use,
    // one round of I/O instead of one per edit.
    const recorder =
      resolved.source._tag === "Live" && ports !== undefined ? capturing(ports) : undefined;
    const source = recorder === undefined ? resolved.source : live(recorder.layer);

    retire();
    yield* reap();
    const mine = generation;
    const runClock = clock;
    run = { _tag: "Running", question };
    commit();

    const fiber = yield* Effect.forkDetach(
      program(question, kind, source, recorder, runClock, pairs),
    );
    current = fiber;

    const exit = yield* Fiber.await(fiber).pipe(Effect.onInterrupt(() => Fiber.interrupt(fiber)));
    // Superseded, or disposed: there is nothing to report to.
    if (mine !== generation) return;
    current = undefined;

    if (Exit.isSuccess(exit)) {
      if (exit.value.answers !== undefined) capture = exit.value.answers;
      run = {
        _tag: "Ran",
        question,
        outcome: exit.value.outcome,
        report: exit.value.report,
        clock: runClock,
      };
    } else {
      // `simulate` and `whatIf` cannot fail — a broken resolver is a `Failed`
      // *outcome* — so reaching here means a defect, and a panel that showed
      // nothing would look merely unresponsive.
      run = { _tag: "Broke", question, message: String(exit.cause) };
    }
    commit();
  });

  const dispose = Effect.fn("qadi.devtools.simulationSession.dispose")(function* () {
    const wasRunning = run._tag === "Running";
    retire();
    if (wasRunning) {
      run = { _tag: "Idle" };
      commit();
    }
    yield* reap();
  });

  const session: SimulationSession = {
    subscribe: store.subscribe,

    getSnapshot: store.getSnapshot,

    setSightings: (next) => {
      if (sameElements(next, sightings)) return;
      sightings = next;
      commit();
    },

    choosePolicy: (index) => {
      // A seeded policy belongs to the row it came from; choosing another from
      // the rail is leaving that row behind.
      if (seeded === undefined && index === chosen && run._tag === "Idle") return;
      chosen = index;
      seeded = undefined;
      retire();
      run = { _tag: "Idle" };
      commit();
    },

    seed: (entry) => {
      if (entry === seedEntry) return;
      seedEntry = entry;
      const replay = entry === undefined ? undefined : replayInput(entry);
      if (replay?._tag === "Replayable") {
        seeded = { policy: replay.policy, unseeded: replay.unseeded };
        draft = replay.input;
      } else {
        seeded = undefined;
      }
      resourceText = resourceTextOf(draft);
      retire();
      run = { _tag: "Idle" };
      commit();
    },

    setPorts: (next) => {
      if (next === ports) return;
      ports = next;
      // A capture is the answers of the environment it came from.
      capture = undefined;
      if (run._tag === "Running") {
        retire();
        run = { _tag: "Idle" };
      }
      commit();
    },

    chooseSource: (choice) => {
      if (choice === sourceChoice) return;
      // The result stays: switching source changes where the *next* answers
      // come from, and the run that produced this one still happened.
      sourceChoice = choice;
      commit();
    },

    setClock: (next) => {
      if (next === clock) return;
      clock = next;
      commit();
    },

    setPairs: (next) => {
      if (next === pairs) return;
      pairs = next;
      commit();
    },

    edit: (next) => {
      if (next === draft) return;
      if (next.resource !== draft.resource) resourceText = resourceTextOf(next);
      draft = next;
      commit();
    },

    editResourceText: (text) => {
      const decoded = decodeResource(text);
      if (decoded._tag === "Refused") {
        // Reported inline, and the previous resource is left alone: clearing it
        // on every keystroke that is not yet valid JSON would make the form
        // unusable halfway through typing one.
        resourceText = { text, error: decoded.reason };
      } else {
        resourceText = { text, error: undefined };
        draft = withResource(draft, decoded.value);
      }
      commit();
    },

    renameSubject: (to) => {
      if (to === draft.subject.id) return;
      draft = renameSubject(draft, draft.subject.id, to);
      commit();
    },

    run: runEffect,
    reap: reap(),
    hasRetired: () => retired.length > 0,
    dispose: dispose(),
  };

  // A session made with a seed is seeded before anyone reads it, so a screen
  // mounted with one shows its first render seeded.
  if (init?.seed !== undefined) session.seed(init.seed);
  return session;
};
