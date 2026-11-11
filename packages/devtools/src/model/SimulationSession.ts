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
 * *refused*, as a state, and nothing is evaluated (`prepareSource`, in
 * `SimulationSource.ts`) — the `portsOf` rule, one layer up, where a chosen `Live`
 * with no `ports` used to answer from fixtures. A Live run *captures*, which is
 * what makes `Snapshot` available (`prepareSource` again). A run that was
 * superseded never lands (`generation`). And a result is shown only for the
 * question it answered (`stale`, `baseline`).
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
import { makeExternalStore, sameElements } from "./ExternalStore.ts";
import type { CapturedAnswers } from "./Capture.ts";
import { sameSighting, sightingFor, type PolicySighting } from "./Catalogue.ts";
import { pinHead, resolveHeld } from "./HeldChoice.ts";
import { baselineDiff, replayInput, type Baseline, type UnseededField } from "./Replay.ts";
import { simulate, type SimulationClock } from "./Simulation.ts";
import type { ChipAdded, FieldView, SimulationField } from "./SimulationFields.ts";
import { fieldOps, formOf, renameSubject } from "./SimulationFields.ts";
import { decodeResource, encodeResource, withResource } from "./SimulationForm.ts";
import type { EvaluationPortsLayer, SimulationInput } from "./SimulationInput.ts";
import {
  prepareSource,
  type PreparedSource,
  type SourceChoice,
  type SourceOption,
  type SourceRefusal,
} from "./SimulationSource.ts";
import type { TimelineEntry } from "./Timeline.ts";
import { sweepPlan, whatIf, type SweepPlan, type WhatIfReport } from "./WhatIf.ts";

/**
 * The policy being simulated, and where it came from.
 *
 * `Chosen.index` is a reading of the rail as it is now, never an input: the
 * choice itself is the policy, held by value (`choosePolicy`). `Evicted` is a
 * chosen policy the rail no longer lists. It is still the one a run evaluates,
 * and a view says it has left the log; it is neither dropped nor swapped for a
 * neighbour.
 */
export type PolicyChoice =
  | { readonly _tag: "None" }
  | { readonly _tag: "Chosen"; readonly index: number; readonly policy: Policy }
  | { readonly _tag: "Evicted"; readonly policy: Policy; readonly label: string }
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
  /**
   * The form's fields, top to bottom, each with its chips as they are shown.
   *
   * The reading is the model's, so what a chip says and whether the form could
   * show it faithfully is decided under the mutation gate; a view maps rows to
   * editors and computes nothing (ADR-QD-047).
   */
  readonly fields: ReadonlyArray<FieldView>;
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
  /**
   * Chooses a policy, held by value from here on: a rail that reorders, grows or
   * loses it does not change the choice. A policy the rail does not list is held
   * as `Evicted` at once.
   */
  readonly choosePolicy: (policy: Policy) => void;
  /**
   * Re-seeds from a logged row, resets the form to it and drops any run — unless
   * the session already holds that entry, which is a no-op.
   *
   * For a host keeping a prop in step: an effect re-run carrying the same entry
   * must not wipe a half-filled form. A reviewer replaying a row is `replay`.
   */
  readonly seed: (entry: TimelineEntry | undefined) => void;
  /**
   * Seeds from `entry` now, even if the session was last seeded from it.
   *
   * Replaying is an act the reviewer takes (E8.1), so pressing it again on the
   * same row after choosing another policy or editing the form re-seeds. `seed`
   * keeps its same-entry guard for the host's effect re-run; the two are told
   * apart by which command is called, never by comparing entries (ARCH-63, D-03).
   */
  readonly replay: (entry: TimelineEntry) => void;
  /** The host's resolvers. A different layer drops the capture taken from the old one. */
  readonly setPorts: (ports: EvaluationPortsLayer | undefined) => void;
  readonly chooseSource: (choice: SourceChoice) => void;
  readonly setClock: (clock: SimulationClock) => void;
  readonly setPairs: (pairs: boolean) => void;
  readonly edit: (next: SimulationInput) => void;
  /**
   * Commits typed text to one field, by that field's codec.
   *
   * Answers the refusal rather than holding it: the uncommitted text is the
   * view's only state (ARCH-20 D-20-f), so the reason goes back to the buffer
   * that owns the text. A refused chip moves nothing and notifies no one. An
   * element naming a subject is attributed to the form's current one.
   */
  readonly addChip: (field: SimulationField, text: string) => ChipAdded;
  /** Removes the chip at `index`. A field the form does not list, or an index past its end, is a no-op. */
  readonly removeChip: (field: SimulationField, index: number) => void;
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

const resourceTextOf = (input: SimulationInput): ResourceText => {
  const text = encodeResource(input.resource);
  return text._tag === "Ok"
    ? { text: text.value, error: undefined }
    : { text: "", error: text.reason };
};

export const makeSimulationSession = (init?: SimulationSessionInit): SimulationSession => {
  let sightings: ReadonlyArray<PolicySighting> = init?.sightings ?? [];
  /** The chosen policy and the sighting it was chosen from. A value, never an index. */
  let held: PolicySighting | undefined = init?.seed === undefined ? pinHead(sightings, undefined) : undefined;
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
    const resolved = resolveHeld(sightings, held, sameSighting);
    return Match.value(resolved).pipe(
      Match.tagsExhaustive({
        Empty: (): PolicyChoice => ({ _tag: "None" }),
        Listed: (listed): PolicyChoice => ({
          _tag: "Chosen",
          index: listed.index,
          policy: listed.value.policy,
        }),
        Evicted: (gone): PolicyChoice => ({
          _tag: "Evicted",
          policy: gone.value.policy,
          label: gone.value.label,
        }),
      }),
    );
  };

  /**
   * Holds the head of the rail once there is one and nothing is chosen or seeded.
   *
   * Without it the default would follow the head, and a reviewer who never
   * touched the dropdown would run a different policy after a decision arrived.
   */
  const pin = () => {
    if (seeded === undefined) held = pinHead(sightings, held);
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
    const { options, prepared } = prepareSource(sourceChoice, { ports, capture });
    const policyNow = policyOf(policy);
    const plan =
      policyNow === undefined
        ? undefined
        : sweepPlan(policyNow, draft, {
            pairs,
            ...(prepared._tag === "Ready" ? { source: prepared.source } : {}),
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
      fields: formOf(draft),
      resourceText,
      sourceChoice,
      options,
      refusal: prepared._tag === "Refused" ? prepared.refusal : undefined,
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
    ready: Extract<PreparedSource, { readonly _tag: "Ready" }>,
    runClock: SimulationClock,
    runPairs: boolean,
  ) =>
    Effect.gen(function* () {
      const options = { clock: runClock, source: ready.source };
      const report =
        kind === "Sweep"
          ? yield* whatIf(question.policy, question.input, { ...options, pairs: runPairs })
          : undefined;
      const outcome = report?.baseline ?? (yield* simulate(question.policy, question.input, options));
      const answers = ready.captured === undefined ? undefined : yield* ready.captured;
      return { outcome, report, answers };
    });

  const runEffect = Effect.fn("qadi.devtools.simulationSession.run")(function* (kind: RunKind) {
    yield* reap();
    const choice = policyChoice();
    const policy = policyOf(choice);
    if (policy === undefined) return;

    retire();
    const mine = generation;
    yield* reap();
    // A command that moved the session while teardown ran owns what happens next.
    // Everything below reads the session after this last yield, so a ports layer
    // swapped during teardown can never contribute a recorder or a capture.
    if (mine !== generation) return;

    const question: SimulationQuestion = {
      policy,
      input: draft,
      seed: seedOf(choice),
      source: sourceChoice,
    };

    const { prepared } = prepareSource(sourceChoice, { ports, capture });
    if (prepared._tag === "Refused") {
      // Declined, not replaced: nothing is evaluated.
      run = { _tag: "Refused", question, refusal: prepared.refusal };
      commit();
      return;
    }

    const runClock = clock;
    run = { _tag: "Running", question };
    commit();

    const fiber = yield* Effect.forkDetach(
      program(question, kind, prepared, runClock, pairs),
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

  /** The one path a draft changes by: the same no-op rule and resource text for every command. */
  const edit = (next: SimulationInput) => {
    if (next === draft) return;
    if (next.resource !== draft.resource) resourceText = resourceTextOf(next);
    draft = next;
    commit();
  };

  /** Seeds from `entry` unconditionally: `seed` guards it, `replay` does not. */
  const reseed = (entry: TimelineEntry | undefined): void => {
    seedEntry = entry;
    const replay = entry === undefined ? undefined : replayInput(entry);
    if (replay?._tag === "Replayable") {
      seeded = { policy: replay.policy, unseeded: replay.unseeded };
      draft = replay.input;
    } else {
      seeded = undefined;
    }
    resourceText = resourceTextOf(draft);
    pin();
    retire();
    run = { _tag: "Idle" };
    commit();
  };

  const session: SimulationSession = {
    subscribe: store.subscribe,

    getSnapshot: store.getSnapshot,

    setSightings: (next) => {
      if (sameElements(next, sightings)) return;
      sightings = next;
      pin();
      commit();
    },

    choosePolicy: (policy) => {
      // A seeded policy belongs to the row it came from; choosing another from
      // the rail is leaving that row behind.
      if (
        seeded === undefined &&
        held !== undefined &&
        Equal.equals(held.policy, policy) &&
        run._tag === "Idle"
      ) {
        return;
      }
      held = sightingFor(sightings, policy);
      seeded = undefined;
      retire();
      run = { _tag: "Idle" };
      commit();
    },

    seed: (entry) => {
      if (entry === seedEntry) return;
      reseed(entry);
    },

    replay: reseed,

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

    edit,

    addChip: (field, text) => {
      const added = fieldOps(field).addChip(draft, text);
      if (added._tag === "Refused") return added;
      edit(added.value);
      return { _tag: "Ok" };
    },

    removeChip: (field, index) => {
      edit(fieldOps(field).removeChip(draft, index));
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
