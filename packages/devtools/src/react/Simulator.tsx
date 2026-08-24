"use client";
/**
 * Screen 5 — the subject simulator.
 *
 * The only screen that **runs** an evaluation rather than reading records, which
 * is a different risk class and the reason the engine beneath it is sealed
 * ([INV-QD-042](../../../../spec/invariants.md)): whatever the reviewer does
 * here reaches no port it was not given and writes nothing to the application's
 * log or cache.
 *
 * **The form's job is to be honest about what it does not know.** Seeded from a
 * logged row it can fill in the policy, the action and the resource, and nothing
 * else — a record names the subject by id and carries what the ports answered
 * only inside its trace. So the grants are the reviewer's hypothesis, the panel
 * says which fields those are, and the baseline card says whether the hypothesis
 * reproduces the row.
 *
 * **Effect is run with `runFork`, not `runPromise`.** A React event handler
 * cannot be an `Effect`, so something has to bridge — and a fiber gives what a
 * promise does not: unmounting *interrupts* the run rather than letting it
 * finish and drop its result on the floor. A live source is the case that makes
 * the difference real, since it is the only one where a run does I/O.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FC,
} from "react";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { isAllowed } from "@qadi/core";
import type { Allow, DecisionOutcome, PermissionKey, Policy } from "@qadi/core";
import type { PolicySighting } from "../model/Catalogue.ts";
import { capturing, type CapturedAnswers } from "../model/Capture.ts";
import { inspect } from "../model/Inspect.ts";
import { baselineDiff, matchesBaseline, replayInput } from "../model/Replay.ts";
import type { Baseline, UnseededField } from "../model/Replay.ts";
import { simulate, type SimulationClock } from "../model/Simulation.ts";
import type { EvaluationPortsLayer, SimulationInput } from "../model/SimulationInput.ts";
import { fixtures, live, snapshot, type SimulationSource } from "../model/Sources.ts";
import type { TimelineEntry } from "../model/Timeline.ts";
import { verdictOfOutcome } from "../model/Verdict.ts";
import { sweepPlan, whatIf, type WhatIfReport } from "../model/WhatIf.ts";
import { FieldsPanel, ObligationList } from "./DecisionPanels.tsx";
import { PolicyTree } from "./PolicyTree.tsx";
import { VerdictTag } from "./VerdictTag.tsx";
import { WhatIfTable } from "./WhatIfTable.tsx";
import { button, chip, colors, font, heading, input, muted, panel } from "./theme.ts";

/** Which of the three answer sources the reviewer picked. */
type SourceChoice = SimulationSource["_tag"];

export interface SimulatorProps {
  /** Policies to run. Usually the log's sightings, so the rail fills as decisions arrive. */
  readonly sightings: ReadonlyArray<PolicySighting>;
  /**
   * A logged row to seed from, set when the reviewer chose *replay in simulator*.
   *
   * Changing it re-seeds the form and clears any result, because a result
   * belonging to one row shown under another's baseline would be worse than no
   * result at all.
   */
  readonly seed?: TimelineEntry;
  /**
   * The application's own resolvers.
   *
   * Absent by default and absent in most deployments: it is the only way a
   * devtools panel can cause I/O, so an application author supplies it
   * deliberately or not at all. Without it the `Live` option is offered and
   * disabled, with the reason — a control that vanishes teaches nobody why.
   */
  readonly ports?: EvaluationPortsLayer;
}

const blank: SimulationInput = { subject: { id: "someone" } };

/** What a run produced, and what it was produced from. */
type RunResult =
  | {
      readonly _tag: "Ran";
      readonly outcome: DecisionOutcome;
      readonly report: WhatIfReport | undefined;
      readonly clock: SimulationClock;
      readonly input: SimulationInput;
      readonly policy: Policy;
    }
  | { readonly _tag: "Broke"; readonly message: string; readonly input: SimulationInput };

export const Simulator: FC<SimulatorProps> = ({ sightings, seed, ports }) => {
  const [chosen, setChosen] = useState(0);
  const [seeded, setSeeded] = useState<{ policy: Policy; unseeded: ReadonlyArray<UnseededField> }>();
  const [draft, setDraft] = useState<SimulationInput>(blank);
  const [source, setSource] = useState<SourceChoice>("Fixtures");
  const [clock, setClock] = useState<SimulationClock>("live");
  const [pairs, setPairs] = useState(false);
  const [captured, setCaptured] = useState<CapturedAnswers>();
  const [result, setResult] = useState<RunResult>();
  const [running, setRunning] = useState(false);

  /**
   * Adjusting state while rendering, which is React's own answer to "reset when
   * a prop changes" — and better here than an effect, because an effect would
   * paint one frame of the *previous* row's form under the new row's heading.
   *
   * Initialised to `undefined` rather than to `seed`, so a simulator **mounted**
   * with a seed seeds on its first render. Seeding it from the prop is the
   * natural-looking version and it silently handles only the second row a
   * reviewer opens.
   */
  const [seenSeed, setSeenSeed] = useState<TimelineEntry | undefined>(undefined);
  if (seed !== seenSeed) {
    setSeenSeed(seed);
    setResult(undefined);
    const replay = seed === undefined ? undefined : replayInput(seed);
    if (replay?._tag === "Replayable") {
      setSeeded({ policy: replay.policy, unseeded: replay.unseeded });
      setDraft(replay.input);
    } else {
      setSeeded(undefined);
    }
  }

  const policy = seeded?.policy ?? sightings[chosen]?.policy;

  const fiber = useRef<{ readonly interruptUnsafe: () => void }>(undefined);
  /**
   * Which run's result is still wanted.
   *
   * A counter rather than a comparison against `fiber.current`, because
   * `addObserver` fires **immediately** on a fiber that has already finished —
   * and a fixture run finishes synchronously inside `runFork`, before there is
   * anything to compare against. The token is decided before the fork, so it is
   * correct whichever way the race goes.
   */
  const token = useRef(0);

  // E7.8. Interrupting is the honest answer rather than a flag that suppresses
  // a `setState` after the fact: a live source is doing real work, and a panel
  // that has been closed should stop asking the application's resolvers.
  useEffect(
    () => () => {
      token.current += 1;
      fiber.current?.interruptUnsafe();
    },
    [],
  );

  const chooseSource = useCallback((next: SourceChoice) => {
    setSource(next);
    // The result stays: switching source changes where the *next* answers come
    // from, and the run that produced this one still happened.
  }, []);

  const edit = useCallback((next: SimulationInput) => {
    // A new object every time, which is what makes staleness exact: the result
    // holds the very input it ran against, so `!==` is "the form has moved".
    setDraft(next);
  }, []);

  const run = useCallback(
    (sweep: boolean) => {
      if (policy === undefined) return;
      const ran = draft;
      const program = runProgram({ policy, input: ran, sweep, clock, source, ports, captured });

      const mine = token.current + 1;
      token.current = mine;
      // Supersedes rather than queues: the reader pressed run again, so the
      // answer to the older question is no longer the one on screen.
      fiber.current?.interruptUnsafe();

      setRunning(true);
      const started = Effect.runFork(program);
      started.addObserver((exit) => {
        // Superseded, or unmounted. Either way there is nothing to report to.
        if (token.current !== mine) return;
        setRunning(false);
        if (Exit.isSuccess(exit)) {
          if (exit.value.answers !== undefined) setCaptured(exit.value.answers);
          setResult({ ...exit.value.result, input: ran });
          return;
        }
        // `simulate` and `whatIf` cannot fail — a broken resolver is a `Failed`
        // *outcome*, not an error — so reaching here means a defect, and a panel
        // that showed nothing would look merely unresponsive.
        setResult({ _tag: "Broke", message: String(exit.cause), input: ran });
      });
      fiber.current = started;
    },
    [policy, draft, clock, source, ports, captured],
  );

  if (policy === undefined) {
    return (
      <p style={{ ...muted, padding: 16 }} data-testid="qadi-simulator-empty">
        {/* E7.1 — an empty form with a dead run button teaches nobody why it is
            dead. */}
        Nothing to simulate yet. This screen runs a policy against a subject you
        describe, and it takes its policies from what the log has seen — so it
        fills up while decisions arrive. Pass a <code>catalogue</code> to name policies
        that have not run yet, or open a decision and choose{" "}
        <em>replay in simulator</em>.
      </p>
    );
  }

  const chosenSource = sourceOf(source, ports, captured);
  const plan = sweepPlan(policy, draft, {
    pairs,
    ...(chosenSource === undefined ? {} : { source: chosenSource }),
  });
  const stale = result !== undefined && result.input !== draft;

  return (
    <div style={{ padding: 12 }} data-testid="qadi-simulator">
      <Controls
        sightings={sightings}
        chosen={chosen}
        onChoose={(index) => {
          setChosen(index);
          // A seeded policy belongs to the row it came from; choosing another
          // from the rail is leaving that row behind.
          setSeeded(undefined);
          setResult(undefined);
        }}
        seeded={seeded !== undefined}
        source={source}
        onSource={chooseSource}
        hasPorts={ports !== undefined}
        hasCapture={captured !== undefined}
        clock={clock}
        onClock={setClock}
        pairs={pairs}
        onPairs={setPairs}
        running={running}
        evaluations={plan.evaluations}
        causesIO={plan.causesIO}
        onRun={() => run(false)}
        onSweep={() => run(true)}
      />

      <SubjectCard input={draft} onChange={edit} />
      <CheckCard input={draft} onChange={edit} />
      <FixturesCard input={draft} onChange={edit} />
      {seeded === undefined ? null : <UnseededCard unseeded={seeded.unseeded} />}

      {result === undefined ? null : (
        <ResultCard result={result} stale={stale} policy={policy} />
      )}
      {seed === undefined || result === undefined || result._tag !== "Ran" ? null : (
        <BaselineCard baseline={baselineDiff(seed, result.outcome)} />
      )}
      {result?._tag === "Ran" && result.report !== undefined ? (
        <WhatIfTable report={result.report} />
      ) : null}
    </div>
  );
};

/**
 * One run, as an Effect.
 *
 * Outside the component so a test can reason about it, and so the component
 * holds no evaluation logic of its own. In `Live` mode it always **captures**:
 * the answers cost nothing extra to record and they are what makes `Snapshot`
 * reachable, which is the mode a sweep should actually use — one round of I/O
 * instead of one per edit.
 */
const runProgram = (options: {
  readonly policy: Policy;
  readonly input: SimulationInput;
  readonly sweep: boolean;
  readonly clock: SimulationClock;
  readonly source: SourceChoice;
  readonly ports: EvaluationPortsLayer | undefined;
  readonly captured: CapturedAnswers | undefined;
}): Effect.Effect<{
  readonly result: Omit<Extract<RunResult, { _tag: "Ran" }>, "input">;
  readonly answers: CapturedAnswers | undefined;
}> =>
  Effect.gen(function* () {
    const recorder =
      options.source === "Live" && options.ports !== undefined
        ? capturing(options.ports)
        : undefined;
    const source =
      recorder === undefined
        ? sourceOf(options.source, options.ports, options.captured)
        : live(recorder.layer);

    const run = { clock: options.clock, ...(source === undefined ? {} : { source }) };

    const report = options.sweep
      ? yield* whatIf(options.policy, options.input, { ...run, pairs: true })
      : undefined;
    const outcome = report?.baseline ?? (yield* simulate(options.policy, options.input, run));

    return {
      result: { _tag: "Ran" as const, outcome, report, clock: options.clock, policy: options.policy },
      answers: recorder === undefined ? undefined : yield* recorder.answers,
    };
  });

/**
 * The source a choice names, or nothing when it cannot be honoured.
 *
 * `undefined` rather than a silent fall back to fixtures: `portsOf` treats an
 * absent source as fixtures, which is the right default for a caller who never
 * chose — and would be the wrong answer for one who chose `Live` and is entitled
 * to know it did not happen. The selector disables both unavailable options, so
 * this is the belt to that brace.
 */
const sourceOf = (
  choice: SourceChoice,
  ports: EvaluationPortsLayer | undefined,
  captured: CapturedAnswers | undefined,
): SimulationSource | undefined => {
  if (choice === "Fixtures") return fixtures;
  if (choice === "Snapshot") return captured === undefined ? undefined : snapshot(captured);
  return ports === undefined ? undefined : live(ports);
};

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const row: CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

const Controls: FC<{
  readonly sightings: ReadonlyArray<PolicySighting>;
  readonly chosen: number;
  readonly onChoose: (index: number) => void;
  readonly seeded: boolean;
  readonly source: SourceChoice;
  readonly onSource: (choice: SourceChoice) => void;
  readonly hasPorts: boolean;
  readonly hasCapture: boolean;
  readonly clock: SimulationClock;
  readonly onClock: (clock: SimulationClock) => void;
  readonly pairs: boolean;
  readonly onPairs: (pairs: boolean) => void;
  readonly running: boolean;
  readonly evaluations: number;
  readonly causesIO: boolean;
  readonly onRun: () => void;
  readonly onSweep: () => void;
}> = (props) => (
  <div style={{ ...row, marginBottom: 10 }}>
    <select
      aria-label="Policy"
      data-testid="qadi-simulator-policy"
      style={input}
      value={props.seeded ? -1 : props.chosen}
      onChange={(event) => props.onChoose(Number(event.target.value))}
    >
      {props.seeded ? <option value={-1}>from the replayed row</option> : null}
      {props.sightings.map((sighting, index) => (
        <option key={`${sighting.label}-${index}`} value={index}>
          {sighting.label}
        </option>
      ))}
    </select>

    <SourceSelector
      source={props.source}
      onSource={props.onSource}
      hasPorts={props.hasPorts}
      hasCapture={props.hasCapture}
    />

    {/* E6.1/E6.2 — the clock is *labelled*, never inferred from the number.
        A live run of a trivial policy also reports zero. */}
    <span style={{ display: "inline-flex", gap: 4 }}>
      {(["live", "deterministic"] as const).map((option) => (
        <button
          key={option}
          type="button"
          style={button(props.clock === option)}
          aria-pressed={props.clock === option}
          onClick={() => props.onClock(option)}
        >
          {option} clock
        </button>
      ))}
    </span>

    <button
      type="button"
      style={button(props.pairs)}
      aria-pressed={props.pairs}
      data-testid="qadi-simulator-pairs"
      onClick={() => props.onPairs(!props.pairs)}
    >
      pairs
    </button>

    <button
      type="button"
      style={button(false)}
      disabled={props.running}
      data-testid="qadi-simulator-run"
      onClick={props.onRun}
    >
      run
    </button>
    <button
      type="button"
      style={button(false)}
      disabled={props.running}
      data-testid="qadi-simulator-sweep"
      onClick={props.onSweep}
    >
      what if
    </button>

    {/* Before the sweep, never after it: a count discovered afterwards is not a
        warning (E3.2). */}
    <span
      style={{ ...muted, fontSize: font.sizeSmall, ...(props.causesIO ? { color: colors.error } : {}) }}
      data-testid="qadi-simulator-cost"
    >
      {props.causesIO
        ? `a sweep runs ${props.evaluations} evaluations against your live resolvers`
        : `a sweep runs ${props.evaluations} evaluations, all in this process`}
    </span>
  </div>
);

/**
 * Three options, two of which are usually unavailable — and both say why.
 *
 * A control that disappears when it cannot be used teaches nobody that it
 * exists, which matters most for `Snapshot`: it is the mode a sweep should use,
 * and nobody would guess that running once against `Live` is what unlocks it.
 */
const SourceSelector: FC<{
  readonly source: SourceChoice;
  readonly onSource: (choice: SourceChoice) => void;
  readonly hasPorts: boolean;
  readonly hasCapture: boolean;
}> = ({ source, onSource, hasPorts, hasCapture }) => {
  const options: ReadonlyArray<{
    readonly id: SourceChoice;
    readonly enabled: boolean;
    readonly why: string;
  }> = [
    { id: "Fixtures", enabled: true, why: "answers you typed below" },
    {
      id: "Snapshot",
      enabled: hasCapture,
      why: hasCapture
        ? "real answers, captured once and replayed — one round of I/O for a whole sweep"
        : "run once against Live first; this replays what that run learned",
    },
    {
      id: "Live",
      enabled: hasPorts,
      why: hasPorts
        ? "the application's own resolvers — every row is real I/O"
        : "the host did not pass a `ports` layer, so this panel cannot reach any resolver",
    },
  ];

  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          title={option.why}
          disabled={!option.enabled}
          aria-pressed={source === option.id}
          data-testid={`qadi-source-${option.id}`}
          style={{ ...button(source === option.id), ...(option.enabled ? {} : { opacity: 0.45 }) }}
          onClick={() => onSource(option.id)}
        >
          {option.id}
        </button>
      ))}
    </span>
  );
};

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

const SubjectCard: FC<{
  readonly input: SimulationInput;
  readonly onChange: (next: SimulationInput) => void;
}> = ({ input: draft, onChange }) => (
  <section style={panel} data-testid="qadi-subject-card">
    <div style={heading}>subject</div>
    <div style={{ ...row, marginBottom: 6 }}>
      <label style={{ ...muted, fontSize: font.sizeSmall }} htmlFor="qadi-subject-id">
        id
      </label>
      <input
        id="qadi-subject-id"
        style={input}
        value={draft.subject.id}
        data-testid="qadi-subject-id"
        onChange={(event) =>
          onChange({ ...draft, subject: { ...draft.subject, id: event.target.value } })
        }
      />
    </div>
    <Chips
      label="roles"
      testId="qadi-roles"
      values={draft.subject.roles ?? []}
      onChange={(roles) => onChange({ ...draft, subject: { ...draft.subject, roles } })}
    />
    <Chips
      label="permissions"
      testId="qadi-permissions"
      placeholder="resource:action"
      values={draft.subject.permissions ?? []}
      onChange={(next) =>
        onChange({
          ...draft,
          // Filtered rather than cast. `PermissionKey` is a template literal
          // type, and a chip reading `admin` with no colon is not one — the
          // evaluator would look up a key nothing can ever hold, and the row
          // would deny for a reason the reviewer could not see.
          subject: { ...draft.subject, permissions: next.filter(isPermissionKey) },
        })
      }
    />
    <Pairs
      label="attributes"
      testId="qadi-subject-attributes"
      values={draft.subject.attributes ?? {}}
      onChange={(attributes) => onChange({ ...draft, subject: { ...draft.subject, attributes } })}
    />
  </section>
);

const CheckCard: FC<{
  readonly input: SimulationInput;
  readonly onChange: (next: SimulationInput) => void;
}> = ({ input: draft, onChange }) => {
  const [text, setText] = useState<string>();
  const [error, setError] = useState<string>();
  const shown = text ?? (draft.resource === undefined ? "" : JSON.stringify(draft.resource));

  return (
    <section style={panel} data-testid="qadi-check-card">
      <div style={heading}>check</div>
      <div style={{ ...row, marginBottom: 6 }}>
        <label style={{ ...muted, fontSize: font.sizeSmall }} htmlFor="qadi-action">
          action
        </label>
        <input
          id="qadi-action"
          style={input}
          value={draft.action ?? ""}
          data-testid="qadi-action"
          onChange={(event) => {
            const action = event.target.value;
            // Absent, not empty. `hasAction` fails with `MissingAction` when no
            // action was supplied, and an empty string is a different question.
            onChange(action === "" ? withoutAction(draft) : { ...draft, action });
          }}
        />
      </div>
      <div style={row}>
        <label style={{ ...muted, fontSize: font.sizeSmall }} htmlFor="qadi-resource">
          resource
        </label>
        <input
          id="qadi-resource"
          style={{ ...input, minWidth: 320 }}
          value={shown}
          placeholder='{"id": "doc-1"}'
          data-testid="qadi-resource"
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            if (next.trim() === "") {
              setError(undefined);
              onChange(withoutResource(draft));
              return;
            }
            const parsed = parseJson(next);
            // E7.3 — reported inline, and the previous resource is left alone.
            // Clearing it on every keystroke that is not yet valid JSON would
            // make the form unusable halfway through typing one.
            if (parsed._tag === "Bad") {
              setError(parsed.message);
              return;
            }
            setError(undefined);
            onChange({ ...draft, resource: parsed.value });
          }}
        />
        {error === undefined ? null : (
          <span style={{ color: colors.error }} data-testid="qadi-resource-error">
            {error}
          </span>
        )}
      </div>
    </section>
  );
};

const FixturesCard: FC<{
  readonly input: SimulationInput;
  readonly onChange: (next: SimulationInput) => void;
}> = ({ input: draft, onChange }) => (
  <section style={panel} data-testid="qadi-fixtures-card">
    <div style={heading}>fixtures — what the ports would answer</div>
    <Pairs
      label="resolver attributes"
      testId="qadi-fixture-attributes"
      values={draft.attributes ?? {}}
      onChange={(attributes) => onChange({ ...draft, attributes })}
    />
    <Chips
      label="relationships"
      testId="qadi-relationships"
      placeholder="relation:resourceId"
      values={(draft.relationships ?? []).map((e) => `${e.relation}:${e.resourceId}`)}
      onChange={(next) =>
        onChange({
          ...draft,
          relationships: next.flatMap((entry) => {
            const split = splitOnce(entry);
            return split === undefined
              ? []
              : [{ subjectId: draft.subject.id, relation: split[0], resourceId: split[1] }];
          }),
        })
      }
    />
    <Chips
      label="history"
      testId="qadi-history"
      placeholder="event:resourceId"
      values={(draft.history ?? []).map((e) => `${e.event}:${e.resourceId}`)}
      onChange={(next) =>
        onChange({
          ...draft,
          history: next.flatMap((entry) => {
            const split = splitOnce(entry);
            return split === undefined
              ? []
              : [{ subjectId: draft.subject.id, event: split[0], resourceId: split[1] }];
          }),
        })
      }
    />
    <p style={{ ...muted, fontSize: font.sizeSmall, margin: "6px 0 0" }}>
      Edges and events are attributed to the subject above. A port left empty
      answers the way an unwired one does, so a policy that needs it denies for
      the reason a misconfigured deployment would.
    </p>
  </section>
);

/**
 * What a replay could not fill in, named field by field.
 *
 * The most important card on the screen when it is present. Without it a form
 * that filled itself in reads as a faithful reproduction, when in fact every
 * grant below is the reviewer's hypothesis.
 */
const UnseededCard: FC<{ readonly unseeded: ReadonlyArray<UnseededField> }> = ({ unseeded }) => (
  <section style={{ ...panel, borderColor: colors.accent }} data-testid="qadi-unseeded">
    <div style={heading}>seeded from a logged row — these are yours to supply</div>
    {unseeded.map((one) => (
      <div key={one.field} style={{ fontSize: font.sizeSmall }}>
        <span>{one.field}</span>
        <span style={{ ...muted, marginLeft: 6 }}>{one.reason}</span>
      </div>
    ))}
  </section>
);

// ---------------------------------------------------------------------------
// The result
// ---------------------------------------------------------------------------

const ResultCard: FC<{
  readonly result: RunResult;
  readonly stale: boolean;
  readonly policy: Policy;
}> = ({ result, stale, policy }) => {
  if (result._tag === "Broke") {
    return (
      <section style={{ ...panel, borderColor: colors.error }} data-testid="qadi-simulator-broke">
        <div style={{ ...heading, color: colors.error }}>the simulation itself failed</div>
        <span>{result.message}</span>
      </section>
    );
  }

  const outcome = result.outcome;
  const allow: Allow | undefined =
    outcome._tag === "Decided" && isAllowed(outcome.decision) ? outcome.decision : undefined;

  return (
    <>
      <section style={panel} data-testid="qadi-simulator-result">
        <div style={{ ...row, marginBottom: 6 }}>
          <div style={heading}>result</div>
          <VerdictTag verdict={verdictOfOutcome(outcome)} />
          {/* E7.4 — never presented like a current answer. The reader edited the form after
              this ran, so what is on screen answers a question they have since
              changed. */}
          {stale ? (
            <span style={{ color: colors.error }} data-testid="qadi-simulator-stale">
              stale — the form has changed since this ran
            </span>
          ) : null}
          <Duration outcome={outcome} clock={result.clock} />
        </div>

        {outcome._tag === "Failed" ? (
          <div data-testid="qadi-simulator-error">
            <div>{outcome.error._tag}</div>
            <p style={{ ...muted, marginBottom: 0 }}>
              {/* As screen 2: a failure has no trace, so there is no requirement
                  tree — and an empty one would read as "nothing was required",
                  which reads as "allowed" (INV-QD-006). */}
              A lookup this evaluation depended on failed, so nothing was decided.
              This is not a denial.
            </p>
          </div>
        ) : (
          <PolicyTree node={inspect(policy, outcome.decision.trace)} showStatus />
        )}
      </section>

      {allow === undefined ? null : <FieldsPanel fields={allow.visibleFields} />}
      {allow === undefined || allow.obligations.length === 0 ? null : (
        <section style={panel} data-testid="qadi-simulator-obligations">
          <div style={heading}>obligations</div>
          <ObligationList duties={allow.obligations} />
          <p style={{ ...muted, marginBottom: 0, marginTop: 6 }}>
            {/* E7.6. Not merely unobservable per duty, which is the inspector's case — here
                no handler ran at all, because a simulation does not discharge
                anything. Saying "not observable" would imply something tried. */}
            Owed, and undischarged: a simulation runs no obligation handler, so
            nothing here was attempted. A binding duty left undischarged turns
            this allow into a refusal at the enforcement boundary.
          </p>
        </section>
      )}
    </>
  );
};

/**
 * The number, and what it measured.
 *
 * A live run of a trivial policy also reports zero, so the number alone cannot
 * say whether it was measured. Only the clock the caller chose can, which is why
 * it is labelled rather than inferred.
 */
const Duration: FC<{
  readonly outcome: DecisionOutcome;
  readonly clock: SimulationClock;
}> = ({ outcome, clock }) => {
  if (outcome._tag !== "Decided") return null;
  return (
    <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-simulator-duration">
      {clock === "deterministic"
        ? "not measured — the deterministic clock does not advance"
        : `${outcome.decision.durationMillis} ms in this browser, not in the deployment that logged the row`}
    </span>
  );
};

/** Whether the reconstruction reproduces the row it was seeded from. */
const BaselineCard: FC<{ readonly baseline: Baseline }> = ({ baseline }) => {
  if (baseline._tag === "Unavailable") {
    return (
      <section style={panel} data-testid="qadi-baseline">
        <div style={heading}>baseline</div>
        <span style={muted}>{baseline.reason}</span>
      </section>
    );
  }

  const matches = matchesBaseline(baseline);
  return (
    <section
      style={{ ...panel, borderColor: matches ? colors.allow : colors.border }}
      data-testid="qadi-baseline"
    >
      <div style={heading}>baseline {baseline.evaluationId}</div>
      <div data-testid="qadi-baseline-state">
        {matches ? "matches — this reconstruction reproduces the logged decision" : summarise(baseline)}
      </div>
      {baseline.caveat === undefined ? null : (
        <p
          style={{ ...muted, marginBottom: 0, marginTop: 6, color: colors.error }}
          data-testid="qadi-baseline-caveat"
        >
          {baseline.caveat.reason}
        </p>
      )}
    </section>
  );
};

/**
 * What differed, in one line.
 *
 * The `Compared` arm names the outermost node whose verdict turned when one did,
 * because "the verdict flipped" is a boolean the reader already has and "at
 * which node" is the thing they came for.
 */
const summarise = (baseline: Extract<Baseline, { _tag: "Checked" }>): string => {
  const comparison = baseline.comparison;
  if (comparison._tag === "BecameError") {
    return `this reconstruction failed with ${comparison.error._tag} where the logged one decided`;
  }
  if (comparison._tag === "Recovered") {
    return "this reconstruction decided where the logged one failed";
  }
  if (comparison._tag === "StillFailed") {
    return comparison.same
      ? `the same failure, ${comparison.after._tag}`
      : `a different failure: ${comparison.before._tag} then, ${comparison.after._tag} now`;
  }
  const flipped = comparison.flipped;
  if (flipped !== undefined) {
    return `differs — ${flipped.policyTag} at ${pathOf(flipped.path)} was ${
      flipped.before ? "allowed" : "denied"
    } and is now ${flipped.after ? "allowed" : "denied"}`;
  }
  return `differs at ${String(comparison.differences.length)} node${
    comparison.differences.length === 1 ? "" : "s"
  }, with the same verdict`;
};

const pathOf = (path: ReadonlyArray<number>): string =>
  path.length === 0 ? "the root" : `$.${path.join(".")}`;

// ---------------------------------------------------------------------------
// Small editors
// ---------------------------------------------------------------------------

const Chips: FC<{
  readonly label: string;
  readonly testId: string;
  readonly placeholder?: string;
  readonly values: ReadonlyArray<string>;
  readonly onChange: (values: ReadonlyArray<string>) => void;
}> = ({ label, testId, placeholder, values, onChange }) => {
  const [text, setText] = useState("");

  const add = () => {
    const value = text.trim();
    if (value === "" || values.includes(value)) return;
    setText("");
    onChange([...values, value]);
  };

  return (
    <div style={{ ...row, marginBottom: 4 }} data-testid={testId}>
      <span style={{ ...muted, fontSize: font.sizeSmall, minWidth: 130 }}>{label}</span>
      {values.map((value) => (
        <span key={value} style={chip}>
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            style={{ ...button(false), border: "none", padding: "0 4px" }}
            onClick={() => onChange(values.filter((other) => other !== value))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        style={{ ...input, minWidth: 140 }}
        aria-label={`Add ${label}`}
        placeholder={placeholder ?? label}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") add();
        }}
      />
    </div>
  );
};

const Pairs: FC<{
  readonly label: string;
  readonly testId: string;
  readonly values: Readonly<Record<string, unknown>>;
  readonly onChange: (values: Readonly<Record<string, unknown>>) => void;
}> = ({ label, testId, values, onChange }) => {
  const [text, setText] = useState("");
  const entries = useMemo(() => Object.entries(values), [values]);

  const add = () => {
    const split = splitOnce(text.trim());
    if (split === undefined) return;
    setText("");
    // JSON first, the raw string otherwise: `clearance:7` should be the number
    // seven, because `gte(5)` compares numerically and would deny the string.
    // `parseValue`, not `parseJson` — an attribute may hold a scalar, where a
    // resource must be an object because `evaluate` reads it by path.
    onChange({ ...values, [split[0]]: parseValue(split[1]) });
  };

  return (
    <div style={{ ...row, marginBottom: 4 }} data-testid={testId}>
      <span style={{ ...muted, fontSize: font.sizeSmall, minWidth: 130 }}>{label}</span>
      {entries.map(([key, value]) => (
        <span key={key} style={chip}>
          {key}={render(value)}
          <button
            type="button"
            aria-label={`Remove ${key}`}
            style={{ ...button(false), border: "none", padding: "0 4px" }}
            onClick={() =>
              onChange(Object.fromEntries(entries.filter(([other]) => other !== key)))
            }
          >
            ×
          </button>
        </span>
      ))}
      <input
        style={{ ...input, minWidth: 140 }}
        aria-label={`Add ${label}`}
        placeholder="name:value"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") add();
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

/** True for the `resource:action` shape a permission lookup uses. */
const isPermissionKey = (value: string): value is PermissionKey => splitOnce(value) !== undefined;

/** `name:value`, split on the **first** colon so a value may contain one. */
const splitOnce = (text: string): readonly [string, string] | undefined => {
  const at = text.indexOf(":");
  if (at <= 0 || at === text.length - 1) return undefined;
  return [text.slice(0, at), text.slice(at + 1)];
};

type Parsed =
  | { readonly _tag: "Ok"; readonly value: Readonly<Record<string, unknown>> }
  | { readonly _tag: "Bad"; readonly message: string };

/**
 * A JSON scalar or structure, or the text itself.
 *
 * `clearance:7` must become the **number** seven — `gte(5)` compares
 * numerically and would deny the string — while `dept:legal` is not JSON at all
 * and is worth keeping as typed rather than reporting an error the reviewer
 * never asked for.
 */
const parseValue = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * `JSON.parse` behind a result, so a half-typed object is a message rather than
 * a thrown render.
 *
 * A parse that succeeds but yields something other than an object is refused
 * too: `evaluate` reads a resource by path, and `7` has no paths.
 */
const parseJson = (text: string): Parsed => {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? { _tag: "Ok", value: { ...value } }
      : { _tag: "Bad", message: "expected a JSON object" };
  } catch (error) {
    // `String`, not `error.message`: `JSON.parse` throws a `SyntaxError` today
    // and narrowing to `Error` would add a branch nothing can reach.
    return { _tag: "Bad", message: String(error) };
  }
};

const render = (value: unknown): string =>
  typeof value === "string" ? value : String(JSON.stringify(value));

/** Omitting a key, which `exactOptionalPropertyTypes` will not let a spread do. */
const withoutAction = (self: SimulationInput): SimulationInput => {
  const { action: _action, ...rest } = self;
  return rest;
};

const withoutResource = (self: SimulationInput): SimulationInput => {
  const { resource: _resource, ...rest } = self;
  return rest;
};
