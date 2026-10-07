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
 * honoured, what a Live run captured, which run is current, what is stale —
 * lives in `SimulationSession` (model), and the form's text is
 * `SimulationForm`'s codec. The only state held here is a chip editor's
 * uncommitted typing buffer.
 *
 * **The form's job is to be honest about what it does not know.** Seeded from a
 * logged row it can fill in the policy, the action and the resource, and nothing
 * else — a record names the subject by id and carries what the ports answered
 * only inside its trace. So the grants are the reviewer's hypothesis, the panel
 * says which fields those are, and the baseline card says whether the hypothesis
 * reproduces the row.
 */
import { useState, type CSSProperties, type FC } from "react";
import * as Match from "effect/Match";
import { isAllowed } from "@qadi/core";
import type { Allow, DecisionOutcome, PermissionKey } from "@qadi/core";
import type { PolicySighting } from "../model/Catalogue.ts";
import { sameEdge, sameEvent } from "../model/Edits.ts";
import { describeTracePath, inspect } from "../model/Inspect.ts";
import { matchesBaseline } from "../model/Replay.ts";
import type { Baseline, UnseededField } from "../model/Replay.ts";
import type { SimulationClock } from "../model/Simulation.ts";
import {
  actionOf,
  addChip,
  attributeCodec,
  attributeLabel,
  edgeCodec,
  eventCodec,
  permissionCodec,
  removeAt,
  roleCodec,
  sameSignature,
  signatureCodec,
  withAction,
  withPair,
  withoutPair,
} from "../model/SimulationForm.ts";
import type { ChipCodec } from "../model/SimulationForm.ts";
import type { EvaluationPortsLayer } from "../model/SimulationInput.ts";
import type {
  RunState,
  SimulationSession,
  SimulationSnapshot,
  SourceChoice,
  SourceOption,
  SourceRefusal,
} from "../model/SimulationSession.ts";
import type { TimelineEntry } from "../model/Timeline.ts";
import { verdictOfOutcome } from "../model/Verdict.ts";
import { FieldsPanel, ObligationList } from "./DecisionPanels.tsx";
import { PolicyTree } from "./PolicyTree.tsx";
import { useSimulationSession, useSimulationSnapshot } from "./useSimulationSession.ts";
import type { SimulationSessionView } from "./useSimulationSession.ts";
import { VerdictTag } from "./VerdictTag.tsx";
import { WhatIfTable } from "./WhatIfTable.tsx";
import { button, chip, colors, font, heading, input, muted, panel } from "./theme.ts";

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
  /**
   * A session the host owns, so the form, the capture and the result outlive
   * this component — `DevtoolsDock` passes one, which is what keeps them across
   * a tab switch. When given, `sightings`, `seed` and `ports` are the session's
   * to be told (`useSimulationSession`), not read from here.
   */
  readonly session?: SimulationSession;
}

export const Simulator: FC<SimulatorProps> = ({ session, ...own }) =>
  session === undefined ? <OwnedSimulator {...own} /> : <SharedSimulator session={session} />;

const OwnedSimulator: FC<Omit<SimulatorProps, "session">> = (props) => (
  <SimulatorView view={useSimulationSession(props)} />
);

const SharedSimulator: FC<{ readonly session: SimulationSession }> = ({ session }) => (
  <SimulatorView view={useSimulationSnapshot(session)} />
);

const SimulatorView: FC<{ readonly view: SimulationSessionView }> = ({ view }) => {
  const { session, snapshot, run } = view;
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
      <Controls snapshot={snapshot} session={session} onRun={run} />

      <SubjectCard snapshot={snapshot} session={session} />
      <CheckCard snapshot={snapshot} session={session} />
      <FixturesCard snapshot={snapshot} session={session} />
      {policy._tag === "Seeded" ? <UnseededCard unseeded={policy.unseeded} /> : null}

      <RunView state={snapshot.run} stale={snapshot.stale} />
      {snapshot.baseline === undefined ? null : <BaselineCard baseline={snapshot.baseline} />}
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
  readonly onRun: (kind: "Run" | "Sweep") => void;
}> = ({ snapshot, session, onRun }) => {
  const running = snapshot.run._tag === "Running";
  const seeded = snapshot.policy._tag === "Seeded";
  const chosen = snapshot.policy._tag === "Chosen" ? snapshot.policy.index : 0;
  const plan = snapshot.plan;
  const causesIO = plan?.causesIO === true;

  return (
    <div style={{ ...row, marginBottom: 10 }}>
      <select
        aria-label="Policy"
        data-testid="qadi-simulator-policy"
        style={input}
        value={seeded ? -1 : chosen}
        onChange={(event) => session.choosePolicy(Number(event.target.value))}
      >
        {seeded ? <option value={-1}>from the replayed row</option> : null}
        {snapshot.sightings.map((sighting, index) => (
          <option key={`${sighting.label}-${index}`} value={index}>
            {sighting.label}
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
        onClick={() => onRun("Run")}
      >
        run
      </button>
      <button
        type="button"
        style={button(false)}
        disabled={running}
        data-testid="qadi-simulator-sweep"
        onClick={() => onRun("Sweep")}
      >
        what if
      </button>

      {/* Before the sweep, never after it: a count discovered afterwards is not a
          warning (E3.2). And the count is the count the sweep runs. */}
      <span
        style={{ ...muted, fontSize: font.sizeSmall, ...(causesIO ? { color: colors.error } : {}) }}
        data-testid="qadi-simulator-cost"
      >
        {snapshot.refusal !== undefined
          ? `a run would be refused: ${snapshot.refusal.reason}`
          : plan === undefined
            ? ""
            : causesIO
              ? `a sweep runs ${plan.evaluations} evaluations against your live resolvers`
              : `a sweep runs ${plan.evaluations} evaluations, all in this process`}
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
  const draft = snapshot.draft;
  const subjectId = draft.subject.id;
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
      <Chips<string>
        label="roles"
        testId="qadi-roles"
        values={draft.subject.roles ?? []}
        codec={roleCodec}
        same={(a, b) => a === b}
        subjectId={subjectId}
        onChange={(roles) => session.edit({ ...draft, subject: { ...draft.subject, roles } })}
      />
      <Chips<PermissionKey>
        label="permissions"
        testId="qadi-permissions"
        placeholder="resource:action"
        values={draft.subject.permissions ?? []}
        codec={permissionCodec}
        same={(a, b) => a === b}
        subjectId={subjectId}
        onChange={(permissions) =>
          session.edit({ ...draft, subject: { ...draft.subject, permissions } })
        }
      />
      <Pairs
        label="attributes"
        testId="qadi-subject-attributes"
        values={draft.subject.attributes ?? {}}
        onChange={(attributes) =>
          session.edit({ ...draft, subject: { ...draft.subject, attributes } })
        }
      />
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
          // Absent, not empty. `hasAction` fails with `MissingAction` when no
          // action was supplied, and an empty string is a different question.
          onChange={(event) => session.edit(withAction(draft, actionOf(event.target.value)))}
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
  const draft = snapshot.draft;
  const subjectId = draft.subject.id;
  return (
    <section style={panel} data-testid="qadi-fixtures-card">
      <div style={heading}>fixtures — what the ports would answer</div>
      <Pairs
        label="resolver attributes"
        testId="qadi-fixture-attributes"
        values={draft.attributes ?? {}}
        onChange={(attributes) => session.edit({ ...draft, attributes })}
      />
      <Chips
        label="relationships"
        testId="qadi-relationships"
        placeholder="relation:resourceId"
        values={draft.relationships ?? []}
        codec={edgeCodec}
        same={sameEdge}
        subjectId={subjectId}
        onChange={(relationships) => session.edit({ ...draft, relationships })}
      />
      <Chips
        label="history"
        testId="qadi-history"
        placeholder="event:resourceId"
        values={draft.history ?? []}
        codec={eventCodec}
        same={sameEvent}
        subjectId={subjectId}
        onChange={(history) => session.edit({ ...draft, history })}
      />
      <Chips
        label="signatures"
        testId="qadi-signatures"
        placeholder="meaning:resourceId"
        values={draft.signatures ?? []}
        codec={signatureCodec}
        same={sameSignature}
        subjectId={subjectId}
        onChange={(signatures) => session.edit({ ...draft, signatures })}
      />
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
  const outcome = result.outcome;
  const policy = result.question.policy;
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
    return `differs — ${flipped.policyTag} at ${describeTracePath(flipped.path)} was ${
      flipped.before ? "allowed" : "denied"
    } and is now ${flipped.after ? "allowed" : "denied"}`;
  }
  return `differs at ${String(comparison.differences.length)} node${
    comparison.differences.length === 1 ? "" : "s"
  }, with the same verdict`;
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

/**
 * One list field. A chip is shown as its codec's text, so what is on screen is
 * what decodes back to the element behind it; a refused value is shown as the
 * refusal, never as a lossy rendering.
 */
const Chips = <A,>({
  label,
  testId,
  placeholder,
  values,
  codec,
  same,
  subjectId,
  onChange,
}: {
  readonly label: string;
  readonly testId: string;
  readonly placeholder?: string;
  readonly values: ReadonlyArray<A>;
  readonly codec: ChipCodec<A>;
  readonly same: (a: A, b: A) => boolean;
  readonly subjectId: string;
  readonly onChange: (values: ReadonlyArray<A>) => void;
}) => {
  const [buffer, setBuffer] = useState<Buffer>(emptyBuffer);

  const add = () => {
    if (buffer.text.trim() === "") return;
    const added = addChip(values, buffer.text, codec, same, subjectId);
    if (added._tag === "Refused") {
      setBuffer({ text: buffer.text, error: added.reason });
      return;
    }
    setBuffer(emptyBuffer);
    onChange(added.value);
  };

  return (
    <div style={{ ...row, marginBottom: 4 }} data-testid={testId}>
      <span style={{ ...muted, fontSize: font.sizeSmall, minWidth: 130 }}>{label}</span>
      {values.map((value, index) => {
        const text = codec.encode(value, subjectId);
        const shown = text._tag === "Ok" ? text.value : `(${text.reason})`;
        return (
          <span key={`${index}-${shown}`} style={chip}>
            {shown}
            <Remove label={shown} onClick={() => onChange(removeAt(values, index))} />
          </span>
        );
      })}
      <Draft
        label={label}
        testId={testId}
        placeholder={placeholder ?? label}
        buffer={buffer}
        onType={(text) => setBuffer({ text, error: undefined })}
        onCommit={add}
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
  const [buffer, setBuffer] = useState<Buffer>(emptyBuffer);

  const add = () => {
    if (buffer.text.trim() === "") return;
    const pair = attributeCodec.decode(buffer.text, "");
    if (pair._tag === "Refused") {
      setBuffer({ text: buffer.text, error: pair.reason });
      return;
    }
    setBuffer(emptyBuffer);
    onChange(withPair(values, pair.value));
  };

  return (
    <div style={{ ...row, marginBottom: 4 }} data-testid={testId}>
      <span style={{ ...muted, fontSize: font.sizeSmall, minWidth: 130 }}>{label}</span>
      {Object.entries(values).map((pair) => {
        const text = attributeLabel(pair);
        const shown = text._tag === "Ok" ? text.value : `${pair[0]} (${text.reason})`;
        return (
          <span key={pair[0]} style={chip}>
            {shown}
            <Remove label={pair[0]} onClick={() => onChange(withoutPair(values, pair[0]))} />
          </span>
        );
      })}
      <Draft
        label={label}
        testId={testId}
        placeholder="name:value"
        buffer={buffer}
        onType={(text) => setBuffer({ text, error: undefined })}
        onCommit={add}
      />
    </div>
  );
};
