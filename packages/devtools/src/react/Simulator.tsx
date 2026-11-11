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
 * **This file renders and dispatches.** What the screen knows — which source is
 * honoured, what a Live run captured, which run is current, what is stale — and
 * what it says about it, the dropdown's entries, the cost line, the run's
 * reading and the baseline's sentence, is `SimulationSession`'s (model). The
 * only state held here is a chip editor's uncommitted typing buffer.
 *
 * **The form's job is to be honest about what it does not know.** Seeded from a
 * logged row it can fill in the policy, the action and the resource, and nothing
 * else — a record names the subject by id and carries what the ports answered
 * only inside its trace. So the grants are the reviewer's hypothesis, the panel
 * says which fields those are, and the baseline card says whether the hypothesis
 * reproduces the row.
 */
import { useState, type CSSProperties, type FC, type ReactNode } from "react";
import * as Match from "effect/Match";
import type { DecisionOutcome, EvaluationError } from "@qadi/core";
import type { RecordOutcome } from "../model/Inspect.ts";
import type { Baseline, BaselineReading, UnseededField } from "../model/Replay.ts";
import type { SimulationClock } from "../model/Simulation.ts";
import type { FieldView, SimulationField } from "../model/SimulationFields.ts";
import type {
  RunState,
  SimulationSession,
  SimulationSnapshot,
} from "../model/SimulationSession.ts";
import type { SourceChoice, SourceOption, SourceRefusal } from "../model/SimulationSource.ts";
import { verdictOfOutcome } from "../model/Verdict.ts";
import { FieldsPanel, ObligationList } from "./DecisionPanels.tsx";
import { PolicyTree } from "./PolicyTree.tsx";
import { useSimulationSnapshot } from "./useSimulationSession.ts";
import type { SimulationSessionView } from "./useSimulationSession.ts";
import { VerdictTag } from "./VerdictTag.tsx";
import { WhatIfTable } from "./WhatIfTable.tsx";
import { button, chip, colors, font, heading, input, muted, panel } from "./theme.ts";

export interface SimulatorProps {
  /**
   * The host's session: the dock owns it in its scope, so the form, the capture
   * and the result outlive this component, and a run outlives a tab switch.
   *
   * Which policies are listed, which row seeds the form and which ports are
   * honoured are the session's to be told (`useOwnedSimulationSession`), not
   * read from here.
   */
  readonly session: SimulationSession;
}

export const Simulator: FC<SimulatorProps> = ({ session }) => (
  <SimulatorView view={useSimulationSnapshot(session)} />
);

const SimulatorView: FC<{ readonly view: SimulationSessionView }> = ({ view }) => {
  const { session, snapshot } = view;
  const { policy } = snapshot;

  if (policy._tag === "None") {
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

  return (
    <div style={{ padding: 12 }} data-testid="qadi-simulator">
      <Controls snapshot={snapshot} session={session} />

      <SubjectCard snapshot={snapshot} session={session} />
      <CheckCard snapshot={snapshot} session={session} />
      <FixturesCard snapshot={snapshot} session={session} />
      {policy._tag === "Seeded" ? <UnseededCard unseeded={policy.unseeded} /> : null}

      <RunView state={snapshot.run} stale={snapshot.stale} />
      {snapshot.baseline === undefined ? null : (
        <BaselineCard baseline={snapshot.baseline} reading={snapshot.baselineReading} />
      )}
      {snapshot.run._tag === "Ran" && snapshot.run.report !== undefined ? (
        <WhatIfTable report={snapshot.run.report} />
      ) : null}
    </div>
  );
};

/** What a run state shows. `Idle` and `Running` show no result: nothing has answered yet. */
const RunView: FC<{ readonly state: RunState; readonly stale: boolean }> = ({ state, stale }) =>
  Match.value(state).pipe(
    Match.tagsExhaustive({
      Idle: () => null,
      Running: () => null,
      Ran: (ran) => <ResultCard result={ran} stale={stale} />,
      Broke: (broke) => (
        <section style={{ ...panel, borderColor: colors.error }} data-testid="qadi-simulator-broke">
          <div style={{ ...heading, color: colors.error }}>the simulation itself failed</div>
          <span>{broke.message}</span>
        </section>
      ),
      Refused: (refused) => <RefusedCard choice={refused.question.source} refusal={refused.refusal} />,
    }),
  );

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const row: CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

const Controls: FC<{
  readonly snapshot: SimulationSnapshot;
  readonly session: SimulationSession;
}> = ({ snapshot, session }) => {
  const running = snapshot.run._tag === "Running";
  const { policyMenu, cost } = snapshot;

  return (
    <div style={{ ...row, marginBottom: 10 }}>
      <select
        aria-label="Policy"
        data-testid="qadi-simulator-policy"
        style={input}
        value={policyMenu.selected}
        // A position of the list this render drew, which the session maps to the
        // policy it names; this parses nothing.
        onChange={(event) => session.choosePolicyAt(event.target.selectedIndex)}
      >
        {policyMenu.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <SourceSelector
        source={snapshot.sourceChoice}
        options={snapshot.options}
        onSource={session.chooseSource}
      />

      {/* E6.1/E6.2 — the clock is *labelled*, never inferred from the number.
          A live run of a trivial policy also reports zero. */}
      <span style={{ display: "inline-flex", gap: 4 }}>
        {clocks.map((option) => (
          <button
            key={option}
            type="button"
            style={button(snapshot.clock === option)}
            aria-pressed={snapshot.clock === option}
            onClick={() => session.setClock(option)}
          >
            {option} clock
          </button>
        ))}
      </span>

      <button
        type="button"
        style={button(snapshot.pairs)}
        aria-pressed={snapshot.pairs}
        data-testid="qadi-simulator-pairs"
        onClick={() => session.setPairs(!snapshot.pairs)}
      >
        pairs
      </button>

      <button
        type="button"
        style={button(false)}
        disabled={running}
        data-testid="qadi-simulator-run"
        onClick={() => session.run("Run")}
      >
        run
      </button>
      <button
        type="button"
        style={button(false)}
        disabled={running}
        data-testid="qadi-simulator-sweep"
        onClick={() => session.run("Sweep")}
      >
        what if
      </button>

      {/* Before the sweep, never after it: a count discovered afterwards is not a
          warning (E3.2). And the count is the count the sweep runs. */}
      <span
        style={{ ...muted, fontSize: font.sizeSmall, ...(cost.warns ? { color: colors.error } : {}) }}
        data-testid="qadi-simulator-cost"
      >
        {cost.sentence}
      </span>
    </div>
  );
};

const clocks: ReadonlyArray<SimulationClock> = ["live", "deterministic"];

/**
 * Three options, two of which are usually unavailable — and both say why.
 *
 * A control that disappears when it cannot be used teaches nobody that it
 * exists, which matters most for `Snapshot`: it is the mode a sweep should use,
 * and nobody would guess that running once against `Live` is what unlocks it.
 * Which options are available is the session's to say.
 */
const SourceSelector: FC<{
  readonly source: SourceChoice;
  readonly options: ReadonlyArray<SourceOption>;
  readonly onSource: (choice: SourceChoice) => void;
}> = ({ source, options, onSource }) => (
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

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

interface CardProps {
  readonly snapshot: SimulationSnapshot;
  readonly session: SimulationSession;
}

const SubjectCard: FC<CardProps> = ({ snapshot, session }) => {
  const subjectId = snapshot.draft.subject.id;
  return (
    <section style={panel} data-testid="qadi-subject-card">
      <div style={heading}>subject</div>
      <div style={{ ...row, marginBottom: 6 }}>
        <label style={{ ...muted, fontSize: font.sizeSmall }} htmlFor="qadi-subject-id">
          id
        </label>
        <input
          id="qadi-subject-id"
          style={input}
          value={subjectId}
          data-testid="qadi-subject-id"
          onChange={(event) => session.renameSubject(event.target.value)}
        />
      </div>
      <Fields fields={snapshot.fields} holder="Subject" session={session} />
    </section>
  );
};

const CheckCard: FC<CardProps> = ({ snapshot, session }) => {
  const draft = snapshot.draft;
  const { text, error } = snapshot.resourceText;

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
          onChange={(event) => session.setAction(event.target.value)}
        />
      </div>
      <div style={row}>
        <label style={{ ...muted, fontSize: font.sizeSmall }} htmlFor="qadi-resource">
          resource
        </label>
        <input
          id="qadi-resource"
          style={{ ...input, minWidth: 320 }}
          value={text}
          placeholder='{"id": "doc-1"}'
          data-testid="qadi-resource"
          onChange={(event) => session.editResourceText(event.target.value)}
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

const FixturesCard: FC<CardProps> = ({ snapshot, session }) => {
  return (
    <section style={panel} data-testid="qadi-fixtures-card">
      <div style={heading}>fixtures — what the ports would answer</div>
      <Fields fields={snapshot.fields} holder="Port" session={session} />
      <p style={{ ...muted, fontSize: font.sizeSmall, margin: "6px 0 0" }}>
        Edges, events and signatures are attributed to the subject above, and the
        ones naming it follow a rename; one naming somebody else is shown in full
        and stays. A port left empty answers the way an unwired one does, so a
        policy that needs it denies for the reason a misconfigured deployment would.
      </p>
    </section>
  );
};

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

/** A run the session declined: no evaluation happened, and the card says which choice and why. */
const RefusedCard: FC<{ readonly choice: SourceChoice; readonly refusal: SourceRefusal }> = ({
  choice,
  refusal,
}) => (
  <section style={{ ...panel, borderColor: colors.error }} data-testid="qadi-simulator-refused">
    <div style={{ ...heading, color: colors.error }}>
      nothing was run — {choice} cannot be used
    </div>
    <span>{refusal.reason}</span>
    <p style={{ ...muted, marginBottom: 0, marginTop: 6 }}>
      The simulator does not answer from another source in its place. Choose one
      that is available, or have the host supply what this one needs.
    </p>
  </section>
);

const ResultCard: FC<{
  readonly result: Extract<RunState, { _tag: "Ran" }>;
  readonly stale: boolean;
}> = ({ result, stale }) => {
  const { outcome, reading } = result;
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

        {resultBody(reading)}
      </section>

      {resultGrant(reading)}
    </>
  );
};

/** Inside the result card: the error, or the tree. */
const resultBody: (self: RecordOutcome) => ReactNode = Match.type<RecordOutcome>().pipe(
  Match.tagsExhaustive({
    Failed: ({ error }) => <SimulatedFailure error={error} />,
    Denied: ({ tree }) => <PolicyTree node={tree} showStatus />,
    Allowed: ({ tree }) => <PolicyTree node={tree} showStatus />,
  }),
);

/** Below the result card: what an allow grants and owes. A denial and a failure grant nothing. */
const resultGrant: (self: RecordOutcome) => ReactNode = Match.type<RecordOutcome>().pipe(
  Match.tagsExhaustive({
    Failed: () => null,
    Denied: () => null,
    Allowed: ({ fields, duties, obligation }) => (
      <>
        <FieldsPanel fields={fields} />
        {obligation._tag === "NoneOwed" ? null : (
          <section style={panel} data-testid="qadi-simulator-obligations">
            <div style={heading}>obligations</div>
            <ObligationList duties={duties} />
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
    ),
  }),
);

const SimulatedFailure: FC<{ readonly error: EvaluationError }> = ({ error }) => (
  <div data-testid="qadi-simulator-error">
    <div>{error._tag}</div>
    <p style={{ ...muted, marginBottom: 0 }}>
      {/* As screen 2: a failure has no trace, so there is no requirement
          tree — and an empty one would read as "nothing was required",
          which reads as "allowed" (INV-QD-006). */}
      A lookup this evaluation depended on failed, so nothing was decided.
      This is not a denial.
    </p>
  </div>
);

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
const BaselineCard: FC<{
  readonly baseline: Baseline;
  readonly reading: BaselineReading | undefined;
}> = ({ baseline, reading }) => {
  if (baseline._tag === "Unavailable") {
    return (
      <section style={panel} data-testid="qadi-baseline">
        <div style={heading}>baseline</div>
        <span style={muted}>{baseline.reason}</span>
      </section>
    );
  }

  return (
    <section
      style={{ ...panel, borderColor: reading?.matches === true ? colors.allow : colors.border }}
      data-testid="qadi-baseline"
    >
      <div style={heading}>baseline {baseline.evaluationId}</div>
      <div data-testid="qadi-baseline-state">{reading?.sentence}</div>
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

// ---------------------------------------------------------------------------
// Small editors
// ---------------------------------------------------------------------------

/** What a chip editor holds that the session does not: text typed and not yet committed. */
interface Buffer {
  readonly text: string;
  readonly error: string | undefined;
}

const emptyBuffer: Buffer = { text: "", error: undefined };

const Remove: FC<{ readonly label: string; readonly onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    aria-label={`Remove ${label}`}
    style={{ ...button(false), border: "none", padding: "0 4px" }}
    onClick={onClick}
  >
    ×
  </button>
);

const Draft: FC<{
  readonly label: string;
  readonly testId: string;
  readonly placeholder: string;
  readonly buffer: Buffer;
  readonly onType: (text: string) => void;
  readonly onCommit: () => void;
}> = ({ label, testId, placeholder, buffer, onType, onCommit }) => (
  <>
    <input
      style={{ ...input, minWidth: 140 }}
      aria-label={`Add ${label}`}
      placeholder={placeholder}
      value={buffer.text}
      onChange={(event) => onType(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit();
      }}
    />
    {buffer.error === undefined ? null : (
      <span style={{ color: colors.error, fontSize: font.sizeSmall }} data-testid={`${testId}-error`}>
        {buffer.error}
      </span>
    )}
  </>
);

/** Each field's test id, closed over the fields: a field added without one is TS2741. */
const testIdOf: { readonly [K in SimulationField]: string } = {
  roles: "qadi-roles",
  permissions: "qadi-permissions",
  subjectAttributes: "qadi-subject-attributes",
  attributes: "qadi-fixture-attributes",
  relationships: "qadi-relationships",
  history: "qadi-history",
  signatures: "qadi-signatures",
};

/** The form's fields held by `holder`, each as an editor. The session reads and writes them; this lays them out. */
const Fields: FC<{
  readonly fields: ReadonlyArray<FieldView>;
  readonly holder: FieldView["holder"];
  readonly session: SimulationSession;
}> = ({ fields, holder, session }) => (
  <>
    {fields
      .filter((field) => field.holder === holder)
      .map((field) => (
        <FieldEditor key={field.key} field={field} session={session} />
      ))}
  </>
);

/**
 * One field: its chips as the session read them, and a typing buffer.
 *
 * A chip is the codec's text, so what is on screen is what decodes back to the
 * element behind it; a refused value is shown as the refusal, never as a lossy
 * rendering. Committing goes through the session, whose answer - the draft moved,
 * or the reason it did not - is all this holds on to.
 */
const FieldEditor: FC<{ readonly field: FieldView; readonly session: SimulationSession }> = ({
  field,
  session,
}) => {
  const [buffer, setBuffer] = useState<Buffer>(emptyBuffer);
  const testId = testIdOf[field.key];

  const add = () => {
    const added = session.addChip(field.key, buffer.text);
    setBuffer(added._tag === "Ok" ? emptyBuffer : { text: buffer.text, error: added.reason });
  };

  return (
    <div style={{ ...row, marginBottom: 4 }} data-testid={testId}>
      <span style={{ ...muted, fontSize: font.sizeSmall, minWidth: 130 }}>{field.label}</span>
      {field.chips.map((one, index) => (
        <span key={`${index}-${one.text}`} style={chip}>
          {one.text}
          <Remove label={one.removeLabel} onClick={() => session.removeChip(field.key, index)} />
        </span>
      ))}
      <Draft
        label={field.label}
        testId={testId}
        placeholder={field.placeholder}
        buffer={buffer}
        onType={(text) => setBuffer({ text, error: undefined })}
        onCommit={add}
      />
    </div>
  );
};
