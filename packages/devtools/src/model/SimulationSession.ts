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
 * superseded never lands (`generation`). And a result is shown only for the
 * question it answered (`stale`, `baseline`).
 *
 * The store is a closure over `makeExternalStore`, the mechanics
 * `TimelineStore.ts` shares; commands are synchronous and notify once.
 *
 * **The session owns its runs.** It is built in a `Scope` and keeps one
 * `FiberHandle`: every run forks into it, so a newer run or a superseding
 * command interrupts the run in flight, and closing the scope interrupts it too.
 * A host ends a session by closing its scope; nothing is reaped or disposed
 * (ADR-QD-137, which overrides ARCH-20 D-20-b, "the hook forks; model code
 * never does").
 */
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as FiberHandle from "effect/FiberHandle";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import type * as Scope from "effect/Scope";
import type { DecisionOutcome, EvaluationClock, Policy } from "@qadi/core";
import { makeExternalStore } from "./ExternalStore.ts";
import type { CapturedAnswers } from "./Capture.ts";
import { sameSighting, sightingFor, type PolicySighting } from "./Catalogue.ts";
import { heldValue, makeHeldChoice } from "./HeldChoice.ts";
import { readOutcome, type RecordOutcome } from "./Inspect.ts";
import {
  baselineDiff,
  readBaseline,
  replayInput,
  type Baseline,
  type BaselineReading,
  type UnseededField,
} from "./Replay.ts";
import { simulate } from "./Simulation.ts";
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

/**
 * The policy being simulated, and where it came from.
 *
 * The first three arms are `HeldChoice`'s (ARCH-74, BEH-QD-466), written out here so
 * the type a host reads is complete, and not re-mapped from it. `Listed.index`
 * is a reading of the rail as it is now, never an input: the choice itself is the
 * policy, held by value (`choosePolicy`). `Evicted` is a chosen policy the rail
 * no longer lists. It is still the one a run evaluates, and a view says it has
 * left the log; it is neither dropped nor swapped for a neighbour.
 *
 * Nothing but the compiler keeps the three arms equal to `HeldChoice<PolicySighting>`,
 * and it does: `policyChoice` returns the cell's own `resolve()` as a
 * `PolicyChoice`, and `policyOf` reads the held arms through `heldValue`, so an
 * arm added to either side, or a field renamed on one, stops compiling there.
 */
export type PolicyChoice =
  | { readonly _tag: "Empty" }
  | { readonly _tag: "Listed"; readonly value: PolicySighting; readonly index: number }
  | { readonly _tag: "Evicted"; readonly value: PolicySighting }
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
      /**
       * The outcome, read once when the run lands: the failure, denial or allow a
       * view shows, with its fields and duties. A simulation discharges nothing, so
       * there is never a gate report to fold in.
       */
      readonly reading: RecordOutcome;
      readonly report: WhatIfReport | undefined;
      readonly clock: EvaluationClock;
    }
  | { readonly _tag: "Broke"; readonly question: SimulationQuestion; readonly message: string }
  | { readonly _tag: "Refused"; readonly question: SimulationQuestion; readonly refusal: SourceRefusal };

/** One entry of the policy dropdown: what it submits and what it says. */
export interface PolicyMenuOption {
  readonly value: string;
  readonly label: string;
}

/**
 * What the policy dropdown lists, in order, and which entry it shows.
 *
 * A reading of the policy the session holds, never the other way round: the
 * replayed row or an evicted choice leads the list while there is one, then each
 * sighting under its position as `String(index)`. `choosePolicyAt` takes a
 * position of `options`, so a view parses nothing.
 */
export interface PolicyMenu {
  readonly options: ReadonlyArray<PolicyMenuOption>;
  readonly selected: string;
}

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
  /** True when the form, the policy or the seed moved since the shown result ran. */
  readonly stale: boolean;
  /** Present only for a result that ran against the current seed. */
  readonly baseline: Baseline | undefined;
  /** The baseline in one line; present exactly when `baseline` is `Checked`. */
  readonly baselineReading: BaselineReading | undefined;
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

/** The dropdown's entry for a choice: the value a select holds, never a position. */
const selectedOf: (choice: PolicyChoice) => string = Match.type<PolicyChoice>().pipe(
  Match.tagsExhaustive({
    Empty: () => "",
    Listed: (listed) => String(listed.index),
    Evicted: () => "evicted",
    Seeded: () => "seeded",
  }),
);

/** How many entries lead the rail in the menu: the replayed row, or an evicted choice. */
const leading = (choice: PolicyChoice): number =>
  choice._tag === "Seeded" || choice._tag === "Evicted" ? 1 : 0;

const policyMenuOf = (
  choice: PolicyChoice,
  sightings: ReadonlyArray<PolicySighting>,
): PolicyMenu => ({
  options: [
    ...(choice._tag === "Seeded" ? [{ value: "seeded", label: "from the replayed row" }] : []),
    ...(choice._tag === "Evicted"
      ? [{ value: "evicted", label: `${choice.value.label} — no longer in the log` }]
      : []),
    ...sightings.map((sighting, index) => ({ value: String(index), label: sighting.label })),
  ],
  selected: selectedOf(choice),
});

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
 * is an `Effect` so that the handle its runs fork into is acquired and released
 * with that scope, and `run` captures the context it was built under, so a run
 * sees the clock, tracer and sink the session was built with (ADR-QD-137).
 */
export const makeSimulationSession = Effect.fn("qadi.devtools.makeSimulationSession")(function* (
  init?: SimulationSessionInit,
): Effect.fn.Return<SimulationSession, never, Scope.Scope> {
  /** The chosen policy and the sighting it was chosen from. A value, never an index. */
  const chosen = makeHeldChoice(init?.sightings ?? [], sameSighting);
  if (init?.seed === undefined) chosen.pin();
  let seedEntry: TimelineEntry | undefined;
  /** The replayed row's policy, held with the row it came from so neither exists without the other. */
  let seeded:
    | { readonly entry: TimelineEntry; readonly policy: Policy; readonly unseeded: ReadonlyArray<UnseededField> }
    | undefined;
  let draft: SimulationInput = blank;
  let resourceText: ResourceText = { text: "", error: undefined };
  let sourceChoice: SourceChoice = "Fixtures";
  let clock: EvaluationClock = "live";
  let pairs = false;
  let ports: EvaluationPortsLayer | undefined = init?.ports;
  let capture: CapturedAnswers | undefined;
  let run: RunState = { _tag: "Idle" };

  /** Which run's result is still wanted. Bumped synchronously, before any fiber is touched. */
  let generation = 0;
  /** Every run forks into this handle, so a newer fiber interrupts the one it replaces. */
  const runs = yield* FiberHandle.make<void>();
  const fork = yield* FiberHandle.runtime(runs)<never>();
  let closed = false;
  // Registered after the handle, so it runs first when the scope closes: a run the
  // close interrupts can never land, and a closed session answers no `run`.
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      generation += 1;
      closed = true;
    }),
  );

  const policyChoice = (): PolicyChoice =>
    seeded === undefined
      ? chosen.resolve()
      : { _tag: "Seeded", entry: seeded.entry, policy: seeded.policy, unseeded: seeded.unseeded };

  /**
   * Holds the head of the rail once there is one and nothing is chosen or seeded.
   *
   * Without it the default would follow the head, and a reviewer who never
   * touched the dropdown would run a different policy after a decision arrived.
   */
  const pin = () => {
    if (seeded === undefined) chosen.pin();
  };

  const policyOf = (picked: PolicyChoice): Policy | undefined =>
    picked._tag === "Seeded" ? picked.policy : heldValue(picked)?.policy;

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
    const { options, refusal, source } = describeSource(sourceChoice, { ports, capture });
    const policyNow = policyOf(policy);
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
        question.seed !== seedOf(policy));

    const seed = seedOf(policy);
    const baseline =
      run._tag === "Ran" && !stale && seed !== undefined
        ? baselineDiff(seed, run.outcome)
        : undefined;

    return {
      sightings: chosen.list(),
      policy,
      draft,
      fields: formOf(draft),
      resourceText,
      policyMenu: policyMenuOf(policy, chosen.list()),
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
      baselineReading: baseline?._tag === "Checked" ? readBaseline(baseline) : undefined,
    };
  };

  const store = makeExternalStore(build());

  /** Rebuilds the snapshot and tells every subscriber, once per command. */
  const commit = () => {
    store.publish(build());
  };

  /**
   * Makes the run in flight stale and stops it, before the command returns.
   *
   * Correctness is the generation's: the abandoned run's exit is never applied.
   * Installing a fiber in the handle interrupts the one it replaces at once, so a
   * superseded Live run stops asking the application's resolvers with no host
   * code (BEH-QD-322, ADR-QD-137). The replaced run's finalizers run inside the
   * command, and none of them writes session state.
   */
  const supersede = () => {
    generation += 1;
    if (Option.isSome(FiberHandle.getUnsafe(runs))) fork(Effect.void);
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
    mine: number,
    question: SimulationQuestion,
    kind: RunKind,
    ready: ReadySource,
    runClock: EvaluationClock,
    runPairs: boolean,
  ) {
    const exit = yield* Effect.exit(program(question, kind, ready, runClock, runPairs));
    // Superseded, or its scope closed: there is nothing to report to.
    if (mine !== generation) return;

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
      run = { _tag: "Broke", question, message: String(exit.cause) };
    }
    commit();
  });

  const start = (kind: RunKind): void => {
    if (closed) return;
    const choice = policyChoice();
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

    generation += 1;
    const mine = generation;
    const runClock = clock;
    run = { _tag: "Running", question };
    commit();
    // A subscriber notified by that commit may already have superseded this run.
    if (mine === generation) fork(land(mine, question, kind, prepared, runClock, pairs));
  };

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
    seeded = undefined;
    if (entry !== undefined) {
      const replay = replayInput(entry);
      if (replay._tag === "Replayable") {
        seeded = { entry, policy: replay.policy, unseeded: replay.unseeded };
        draft = replay.input;
      }
    }
    resourceText = resourceTextOf(draft);
    pin();
    supersede();
    run = { _tag: "Idle" };
    commit();
  };

  const choosePolicy = (policy: Policy): void => {
    // A seeded policy belongs to the row it came from; choosing another from
    // the rail is leaving that row behind.
    const held = chosen.held();
    if (
      seeded === undefined &&
      held !== undefined &&
      Equal.equals(held.policy, policy) &&
      run._tag === "Idle"
    ) {
      return;
    }
    chosen.choose(sightingFor(chosen.list(), policy));
    seeded = undefined;
    supersede();
    run = { _tag: "Idle" };
    commit();
  };

  const session: SimulationSession = {
    subscribe: store.subscribe,

    getSnapshot: store.getSnapshot,

    setSightings: (next) => {
      if (!chosen.setList(next)) return;
      pin();
      commit();
    },

    choosePolicy,

    choosePolicyAt: (position) => {
      // The menu's leading entries (the replayed row, an evicted choice) name no sighting.
      const picked = Number.isInteger(position)
        ? chosen.list()[position - leading(policyChoice())]
        : undefined;
      if (picked !== undefined) choosePolicy(picked.policy);
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
        supersede();
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

    setAction: (text) => {
      // `withAction` always returns a new object, so an unchanged action is told apart here.
      const action = actionOf(text);
      if (action === draft.action) return;
      edit(withAction(draft, action));
    },

    run: start,
  };

  // A session made with a seed is seeded before anyone reads it, so a screen
  // mounted with one shows its first render seeded.
  if (init?.seed !== undefined) session.seed(init.seed);
  return session;
});
