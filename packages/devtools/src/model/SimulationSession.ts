/**
 * A simulation session: everything the simulator screen knows, as a store.
 *
 * The screen used to hold this in eleven `useState`s and two `useRef`s — which
 * source is honoured, when a capture is taken and dropped, which run is
 * current, what is stale and what a re-seed resets — and so none of it fell
 * under the model's tests or its mutation gate. It is here now, behind the
 * interface `useSyncExternalStore` already wants (`subscribe`, `getSnapshot`)
 * and a handful of commands, the way `TimelineStore` holds the log. The React
 * hook is an adapter that subscribes and dispatches; it decides nothing.
 *
 * **Four rules each live in one function.** A source that cannot be honoured is
 * *refused*, as a state, and nothing is evaluated (`prepareSource`, in
 * `SimulationSource.ts`) — the `portsOf` rule, one layer up, where a chosen `Live`
 * with no `ports` used to answer from fixtures. A Live run *captures*, which is
 * what makes `Snapshot` available (`prepareSource` again; the snapshot shows
 * `describeSource`, which builds no recorder). A run that was
 * superseded never lands (`isCurrent`, on the run's token). And a result is shown
 * only for the question it answered (`stale`, `baseline`).
 *
 * **The policy and where it came from are one value.** The session holds one
 * `SeededChoice` (`SeededChoice.ts`) and replaces it with what a transition answers:
 * the pin rule, the orphan rule, the menu and its reverse lookup, the same-policy rule
 * and the replay decode are the module's, and the session keeps its runs and its form
 * (ADR-QD-187).
 *
 * Once the session is built, `writeDraft` is the one place the draft and its
 * resource text are assigned, and `clearRun` is the one operation that stops the run
 * in flight and sets it `Idle`, called from `reseed`, `choosePolicy` and `setPorts`.
 *
 * The store is a closure over `makeExternalStore`, the mechanics
 * `TimelineStore.ts` shares; commands are synchronous and notify once.
 *
 * **The session owns its runs.** It is built in a `Scope` and keeps one stated run
 * (`makeStatedRun`, ADR-QD-200 over ADR-QD-150's protocol): every run starts through it, so a newer run
 * or a superseding command interrupts the run in flight, and closing the scope
 * interrupts it too.
 * A host ends a session by closing its scope; nothing is reaped or disposed
 * (ADR-QD-137, which overrides ARCH-20 D-20-b, "the hook forks; model code
 * never does").
 */
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import type * as Scope from "effect/Scope";
import { causeMessage } from "@qadi/core";
import type { DecisionOutcome, EvaluationClock, Policy } from "@qadi/core";
import { makeExternalStore } from "./ExternalStore.ts";
import type { CapturedAnswers } from "./Capture.ts";
import type { PolicySighting } from "./Catalogue.ts";
import { readOutcome, type RecordOutcome } from "./Inspect.ts";
import { baselineDiff, type Baseline } from "./Replay.ts";
import {
  choose,
  menuOf,
  policyChoice,
  policyOf,
  seedFrom,
  seededChoice,
  seededFrom,
  seedOf,
  sightingAt,
  withSightings,
} from "./SeededChoice.ts";
import type { PolicyChoice, PolicyMenu, SeededChoice } from "./SeededChoice.ts";
import { simulate } from "./Simulation.ts";
import { makeStatedRun } from "./StatedRun.ts";
import type { RunLive } from "./StatedRun.ts";
import type { ChipAdded, FieldView, SimulationField } from "./SimulationFields.ts";
import { fieldOps, formOf, renameSubject } from "./SimulationFields.ts";
import { actionOf, decodeResource, encodeResource, withAction, withResource } from "./SimulationForm.ts";
import type { EvaluationPortsLayer, SimulationInput } from "./SimulationInput.ts";
import {
  describeSource,
  prepareSource,
  type ReadySource,
  type SourceChoice,
  type SourceOption,
  type SourceRefusal,
} from "./SimulationSource.ts";
import type { TimelineEntry } from "./Timeline.ts";
import { sweepPlan, whatIf, type SweepPlan, type WhatIfReport } from "./WhatIf.ts";

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
      /**
       * The outcome, read once when the run lands: the failure, denial or allow a
       * view shows, with its fields and duties. A simulation discharges nothing, so
       * there is never a gate report to fold in.
       */
      readonly reading: RecordOutcome;
      readonly report: WhatIfReport | undefined;
      readonly clock: EvaluationClock;
    }
  | {
      readonly _tag: "Broke";
      readonly question: SimulationQuestion;
      /**
       * `causeMessage`'s text of the run's cause: a multi-line trace with the error's
       * message on its first line, or the one placeholder for a value that cannot be
       * described.
       */
      readonly message: string;
    }
  | { readonly _tag: "Refused"; readonly question: SimulationQuestion; readonly refusal: SourceRefusal };

/** What a sweep would cost, said before it runs, and whether that cost is the host's own I/O. */
export interface SweepCost {
  readonly sentence: string;
  /** True when the sweep reaches the host's live resolvers. */
  readonly warns: boolean;
}

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
  readonly policyMenu: PolicyMenu;
  readonly sourceChoice: SourceChoice;
  readonly options: ReadonlyArray<SourceOption>;
  /** Why the chosen source cannot be honoured, when it cannot. */
  readonly refusal: SourceRefusal | undefined;
  readonly clock: EvaluationClock;
  readonly pairs: boolean;
  readonly capture: CapturedAnswers | undefined;
  /** What a sweep would run now; absent while there is no policy. */
  readonly plan: SweepPlan | undefined;
  readonly cost: SweepCost;
  readonly run: RunState;
  /**
   * True when the form, the policy or the seed moved since the shown result ran.
   *
   * The policy and seed checks (no policy, another policy, another seed) state
   * BEH-QD-322's rule where it is read, not because one can hold while a run is
   * shown: every command that changes the policy or the seed also clears the run.
   */
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
   * Chooses the sighting listed at `position` of `snapshot.policyMenu.options`.
   *
   * A position naming the replayed row or an evicted choice, a position past the
   * list and a number that is not a position are no-ops that notify no one.
   * For a view that hands over the select's `selectedIndex` and parses nothing.
   */
  readonly choosePolicyAt: (position: number) => void;
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
  readonly setClock: (clock: EvaluationClock) => void;
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
  /**
   * Commits typed text as the action; an empty text removes it.
   *
   * Removed, not set to `""`: `hasAction` fails with `MissingAction` when none was
   * supplied, and an empty string is a different question. The text the draft
   * already has is a no-op.
   */
  readonly setAction: (text: string) => void;

  /**
   * Starts one run or sweep in the session's scope.
   *
   * A newer run or a superseding command interrupts it, and so does closing the
   * scope. Read the answer from the snapshot.
   */
  readonly run: (kind: RunKind) => void;
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

/**
 * The sentence above the run buttons: said before the sweep, never after it, and
 * with the count the sweep runs.
 */
const costOf = (refusal: SourceRefusal | undefined, plan: SweepPlan | undefined): SweepCost => {
  const warns = plan?.causesIO === true;
  const sentence =
    refusal !== undefined
      ? `a run would be refused: ${refusal.reason}`
      : plan === undefined
        ? ""
        : warns
          ? `a sweep runs ${plan.evaluations} evaluations against your live resolvers`
          : `a sweep runs ${plan.evaluations} evaluations, all in this process`;
  return { sentence, warns };
};

/**
 * Builds a session in the caller's scope.
 *
 * The scope is the session's lifetime: closing it interrupts the run in flight
 * and leaves the session inert, which is how a host ends one. The constructor
 * is an `Effect` so that the superseding run its runs fork into is acquired and released
 * with that scope, and `run` captures the context it was built under, so a run
 * sees the clock, tracer and sink the session was built with (ADR-QD-137).
 */
export const makeSimulationSession = Effect.fn("qadi.devtools.makeSimulationSession")(function* (
  init?: SimulationSessionInit,
): Effect.fn.Return<SimulationSession, never, Scope.Scope> {
  const seeding = seededChoice(init?.sightings ?? [], init?.seed);
  /**
   * The policy being simulated and where it came from, replaced by what a
   * transition answers (`SeededChoice.ts`).
   */
  let choice: SeededChoice = seeding.choice;
  let draft: SimulationInput = seeding.input ?? blank;
  let resourceText: ResourceText = resourceTextOf(draft);
  let sourceChoice: SourceChoice = "Fixtures";
  let clock: EvaluationClock = "live";
  let pairs = false;
  let ports: EvaluationPortsLayer | undefined = init?.ports;
  let capture: CapturedAnswers | undefined;
  let run: RunState = { _tag: "Idle" };

  const build = (): SimulationSnapshot => {
    const policy = policyChoice(choice);
    const policyNow = policyOf(choice);
    const seed = seedOf(choice);
    const { options, refusal, source } = describeSource(sourceChoice, { ports, capture });
    const plan =
      policyNow === undefined
        ? undefined
        : sweepPlan(policyNow, draft, {
            pairs,
            ...(source === undefined ? {} : { source }),
          });

    const question = run._tag === "Idle" ? undefined : run.question;
    const stale =
      question !== undefined &&
      (question.input !== draft ||
        policyNow === undefined ||
        !Equal.equals(question.policy, policyNow) ||
        question.seed !== seed);

    const baseline =
      run._tag === "Ran" && !stale && seed !== undefined
        ? baselineDiff(seed, run.outcome)
        : undefined;

    return {
      sightings: choice.sightings,
      policy,
      draft,
      fields: formOf(draft),
      resourceText,
      policyMenu: menuOf(choice),
      sourceChoice,
      options,
      refusal,
      clock,
      pairs,
      capture,
      plan,
      cost: costOf(refusal, plan),
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
   * Every run starts through this, so a newer run or a superseding command interrupts the one in
   * flight; a closed session answers no `run`. A defect after the run landed leaves the landed result.
   */
  const runs = yield* makeStatedRun((reason) => {
    if (run._tag !== "Running") return;
    run = { _tag: "Broke", question: run.question, message: reason };
    commit();
  });

  /**
   * Makes the run in flight stale and stops it, before the command returns.
   *
   * Correctness is the token's: the abandoned run's exit is never applied. The
   * stop is unconditional, so a superseded Live run stops asking the application's
   * resolvers with no host code (BEH-QD-322, ADR-QD-150). The replaced run's
   * finalizers run inside the command, and none of them writes session state.
   */
  const supersede = () => {
    runs.stop();
  };

  /** Stops the run in flight and sets the run `Idle`. */
  const clearRun = () => {
    supersede();
    run = { _tag: "Idle" };
  };

  const program = (
    question: SimulationQuestion,
    kind: RunKind,
    ready: ReadySource,
    runClock: EvaluationClock,
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

  // `root`: a run is the reviewer's own act, and the context the session captured
  // has the constructor's span as its parent.
  const land = Effect.fn("qadi.devtools.simulationSession.run", { root: true })(function* (
    live: RunLive,
    question: SimulationQuestion,
    kind: RunKind,
    ready: ReadySource,
    runClock: EvaluationClock,
    runPairs: boolean,
  ) {
    const exit = yield* Effect.exit(program(question, kind, ready, runClock, runPairs));
    // Superseded, or its scope closed: there is nothing to report to.
    if (!live.current()) return;

    if (Exit.isSuccess(exit)) {
      if (exit.value.answers !== undefined) capture = exit.value.answers;
      run = {
        _tag: "Ran",
        question,
        outcome: exit.value.outcome,
        reading: readOutcome(question.policy, exit.value.outcome, undefined),
        report: exit.value.report,
        clock: runClock,
      };
    } else {
      // `simulate` and `whatIf` cannot fail — a broken resolver is a `Failed`
      // *outcome* — so reaching here means a defect, and a panel that showed
      // nothing would look merely unresponsive.
      run = { _tag: "Broke", question, message: causeMessage(exit.cause) };
    }
    commit();
  });

  const start = (kind: RunKind): void => {
    if (runs.closed()) return;
    const policy = policyOf(choice);
    if (policy === undefined) return;

    const question: SimulationQuestion = {
      policy,
      input: draft,
      seed: seedOf(choice),
      source: sourceChoice,
    };

    const prepared = prepareSource(sourceChoice, { ports, capture });
    if (prepared._tag === "Refused") {
      // Declined, not replaced: nothing is evaluated, and the run in flight stops.
      supersede();
      run = { _tag: "Refused", question, refusal: prepared.refusal };
      commit();
      return;
    }

    const runClock = clock;
    runs.start({
      starting: () => {
        run = { _tag: "Running", question };
        commit();
      },
      engine: (live) => land(live, question, kind, prepared, runClock, pairs),
    });
  };

  /**
   * Assigns the draft and its resource text, answering whether it wrote anything.
   *
   * Given `text`, it is written as given, so `editResourceText` keeps what was typed
   * and `reseed` writes the text it re-encoded. Without it the text is re-encoded
   * only when the resource changed, and the draft already held writes nothing.
   */
  const writeDraft = (next: SimulationInput, text?: ResourceText): boolean => {
    if (text === undefined && next === draft) return false;
    const kept = next.resource === draft.resource;
    resourceText = text ?? (kept ? resourceText : resourceTextOf(next));
    draft = next;
    return true;
  };

  /**
   * Writes `next` through `writeDraft` and publishes; the draft already held
   * publishes nothing.
   */
  const edit = (next: SimulationInput) => {
    if (writeDraft(next)) commit();
  };

  /** Seeds from `entry` unconditionally: `seed` guards it, `replay` does not. */
  const reseed = (entry: TimelineEntry | undefined): void => {
    const seeding = seedFrom(choice, entry);
    choice = seeding.choice;
    const next = seeding.input ?? draft;
    writeDraft(next, resourceTextOf(next));
    clearRun();
    commit();
  };

  const choosePolicy = (policy: Policy): void => {
    // The module owns the same-policy rule; the session adds only that a run in
    // flight or shown is cleared even by the policy already held.
    const next = choose(choice, policy);
    if (next === choice && run._tag === "Idle") return;
    choice = next;
    clearRun();
    commit();
  };

  const session: SimulationSession = {
    subscribe: store.subscribe,

    getSnapshot: store.getSnapshot,

    setSightings: (next) => {
      const resighted = withSightings(choice, next);
      if (resighted === choice) return;
      choice = resighted;
      commit();
    },

    choosePolicy,

    choosePolicyAt: (position) => {
      const picked = sightingAt(choice, position);
      if (picked !== undefined) choosePolicy(picked.policy);
    },

    seed: (entry) => {
      if (entry === seededFrom(choice)) return;
      reseed(entry);
    },

    replay: reseed,

    setPorts: (next) => {
      if (next === ports) return;
      ports = next;
      // A capture is the answers of the environment it came from.
      capture = undefined;
      if (run._tag === "Running") clearRun();
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
        writeDraft(draft, { text, error: decoded.reason });
      } else {
        writeDraft(withResource(draft, decoded.value), { text, error: undefined });
      }
      commit();
    },

    renameSubject: (to) => {
      if (to === draft.subject.id) return;
      edit(renameSubject(draft, draft.subject.id, to));
    },

    setAction: (text) => {
      // `withAction` always returns a new object, so an unchanged action is told apart here.
      const action = actionOf(text);
      if (action === draft.action) return;
      edit(withAction(draft, action));
    },

    run: start,
  };

  return session;
});
