"use client";
/**
 * Screen 7 — the React panel, keyed by question, with the instances underneath.
 *
 * This screen was scoped on the belief that a per-instance view was
 * *unobtainable*: `Atom.family` compares with `Equal.equals`, so ten
 * `<Can policy={isAdmin}>` in different places are one atom, and the library
 * cannot tell them apart. Every word of that is still true, and it establishes
 * something narrower than it was read as — that the **atom layer** cannot see
 * instances, not that nothing can. A component knows perfectly well that it
 * exists; nothing was asking it.
 *
 * So the panel now shows both, and they are different questions rather than
 * rival answers. `QadiAtoms.asked()` says what has been **asked** — the atom's
 * view, unchanged. `QadiAtoms.gates` says who is **asking**, right now, and what
 * each of them rendered. The grouping still goes through `Equal.equals`, so a
 * group is exactly an atom and the panel cannot claim two questions where the
 * evaluator sees one ([ADR-QD-053](../../../../spec/decisions/053-a-gate-can-be-found.md)).
 *
 * A reader arrives here asking "why is this button missing", which the first
 * view cannot answer and the second can — and the lens can point at the place
 * the button is not.
 */
import * as Match from "effect/Match";
import type { CSSProperties, FC, ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { Resource } from "@qadi/core";
import { policyLabel } from "../model/Catalogue.ts";
import { isUnsampled } from "../model/DiagnosticsFeed.ts";
import type { ExternalStore } from "../model/ExternalStore.ts";
import type {
  GateInstanceLike,
  GatesView,
  QuestionRow,
  QuestionsSnapshot,
  QuestionsView,
} from "../model/Gates.ts";
import { displayOfGateState, isLocatable, locatableIds } from "../model/Gates.ts";
import type { HydrationActivity } from "../model/Hydration.ts";
import { unaccountedEntries } from "../model/Hydration.ts";
import { DiagnosticsNotice, diagnosticsRootProps } from "./DiagnosticsNotice.tsx";
import type { DiagnosticsNoticeProps } from "./DiagnosticsNotice.tsx";
import { button, colors, font, muted } from "./theme.ts";
import { useLens } from "./useLens.ts";
import { useStoreSnapshot } from "./useStoreSnapshot.ts";
import { treatmentOf } from "./VerdictTreatment.ts";

export type { AskedQuestionLike } from "../model/Gates.ts";

export interface QuestionsPanelProps {
  /**
   * The dock model's readout: one snapshot of the asked questions joined with the guards asking them.
   *
   * The model reads the question source and the gate registry at one moment, so a
   * row never pairs a question from one moment with a guard from another. A guard
   * registry handed over absent, or listing nothing because the provider is not
   * instrumented, is the snapshot's `gates` view, and those two states are
   * distinguished because one is a missing prop and the other a missing prop
   * **on the provider**, with different fixes.
   */
  readonly questions: Pick<ExternalStore<QuestionsSnapshot>, "subscribe" | "getSnapshot">;
  /**
   * Read with `hydrationActivity`, which needs no wiring at all.
   *
   * `hydration.mismatched` is the verdict-disagreement count a host used to
   * accumulate itself from `onHydrationMismatch`, before anything in
   * `@qadi/react` counted: the metric is written whether or not a reporter is
   * supplied.
   */
  readonly hydration?: HydrationActivity | undefined;
  /** Wired to `useInvalidate`. Absent means the button is not shown. */
  readonly onInvalidate?: (() => void) | undefined;
  /**
   * The dock's diagnostics status and restart, stated by the shared notice.
   *
   * Required, so a screen cannot forget it.
   */
  readonly diagnostics: DiagnosticsNoticeProps;
}

/** What the hydration block reads before any sample was taken. */
const NO_COUNTS_YET = "no counts read yet.";

const GATES_ABSENT_TEXT =
  "No live guards were handed to the dock. Pass gates — usually atoms.gates, from @qadi/react — to list who is asking.";
const GATES_EMPTY_TEXT =
  "No guard is registered. Pass instrument to QadiProvider to let them say that they exist.";

const row: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "baseline",
  padding: "3px 0",
  borderBottom: `1px solid ${colors.border}`,
};

export const QuestionsPanel: FC<QuestionsPanelProps> = ({
  questions,
  hydration,
  onInvalidate,
  diagnostics,
}) => {
  const unsampled = isUnsampled(diagnostics.status);
  const snapshot = useStoreSnapshot(questions);

  const lens = useLens(snapshot.instances);

  return (
    <div {...diagnosticsRootProps(diagnostics.status)} data-testid="qadi-questions">
      <DiagnosticsNotice {...diagnostics} />
      <p style={{ ...muted, fontSize: font.sizeSmall, marginTop: 0 }} data-testid="qadi-keying-note">
        {/* Said up front, because a reader counting rows against components in
            their tree would otherwise conclude the panel is broken. Both halves
            have to be said: the row count is questions, the nested count is
            components, and they are different numbers on purpose. */}
        One row per <em>question</em>, not per component. Atoms are keyed
        structurally, so ten gates on the same policy are one atom — that is what
        the evaluator sees. The guards asking each question are listed underneath.
      </p>

      {gatesBlock(snapshot.gates)(lens)}

      {questionsBlock(snapshot.questions)(lens)}

      <Hydration activity={hydration} unsampled={unsampled} />

      {onInvalidate === undefined ? null : (
        <button
          type="button"
          style={{ ...button(false), marginTop: 8 }}
          data-testid="qadi-invalidate"
          onClick={onInvalidate}
        >
          invalidate all
        </button>
      )}
    </div>
  );
};

type Lens = ReturnType<typeof useLens>;

const gatesNote = (text: string) => (): ReactNode => (
  <p style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-gates-absent">
    {text}
  </p>
);

/** The gates block for one view, built once; a new view is a compile error here. */
const gatesBlock: (view: GatesView) => (lens: Lens) => ReactNode = Match.type<GatesView>().pipe(
  Match.tagsExhaustive({
    Absent: () => gatesNote(GATES_ABSENT_TEXT),
    Empty: () => gatesNote(GATES_EMPTY_TEXT),
    Listed: () => (lens: Lens) => <PickButton lens={lens} />,
    // The precedent's wording and colour: `ServicesPanel`'s `qadi-wiring-failed`.
    Failed: ({ reason }) => () => (
      <p style={{ ...muted, color: colors.error }} data-testid="qadi-gates-failed">
        The registry handed to the dock threw when it was read, so who is asking cannot be shown: {reason}
      </p>
    ),
  }),
);

/** The questions block for one view, built once; a new view is a compile error here. */
const questionsBlock: (view: QuestionsView) => (lens: Lens) => ReactNode = Match.type<QuestionsView>().pipe(
  Match.tagsExhaustive({
    Unsampled: () => () => null,
    Absent: () => () => (
      <p style={muted} data-testid="qadi-questions-absent">
        No atom set was handed to the dock. Pass <code>questions</code> — usually{" "}
        <code>atoms.asked()</code> — to list what has been asked.
      </p>
    ),
    Empty: () => () => (
      <p style={muted} data-testid="qadi-questions-empty">
        Nothing has been asked yet. A question appears here the first time a
        component reads its decision.
      </p>
    ),
    Rows: (view) => (lens: Lens) =>
      view.rows.map((entry, index) => (
        <Question key={`${policyLabel(entry.question.policy)}-${index}`} entry={entry} lens={lens} />
      )),
  }),
);

/** One question, and the guards currently asking it. */
const Question: FC<{
  readonly entry: QuestionRow;
  readonly lens: Lens;
}> = ({ entry, lens }) => {
  const { question, asking } = entry;
  // `undefined`: the registry could not be read, so this row says nothing about who is asking.
  const locatable = (asking ?? []).filter(isLocatable);

  return (
    <div data-testid="qadi-question-block">
      <div style={row} data-testid="qadi-question">
        <span>{policyLabel(question.policy)}</span>
        <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-question-scope">
          {question.resource === undefined ? "no resource" : resourceOf(question.resource)}
        </span>
        {asking === undefined ? null : asking.length === 0 ? (
          <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-question-unmounted">
            {/* Not an error. A component that asked and then unmounted leaves
                its question behind in the atom layer. */}
            asked, nothing mounted
          </span>
        ) : (
          <button
            type="button"
            style={{ ...button(false), fontSize: font.sizeSmall }}
            data-testid="qadi-highlight"
            disabled={locatable.length === 0}
            title={
              locatable.length === 0
                ? "only hooks are asking this, and a hook has no element to point at"
                : undefined
            }
            onClick={() => {
              lens.highlight(locatableIds(asking));
            }}
          >
            highlight {locatable.length}
          </button>
        )}
      </div>

      {(asking ?? []).map((instance) => (
        <InstanceRow key={instance.id} instance={instance} picked={lens.picked === instance.id} />
      ))}
    </div>
  );
};

/** One guard, and whether the reader just picked it off the page. */
const InstanceRow: FC<{
  readonly instance: GateInstanceLike;
  readonly picked: boolean;
}> = ({ instance, picked }) => {
  const node = useRef<HTMLDivElement | null>(null);
  const state = displayOfGateState(instance.state);
  const treatment = treatmentOf(state);

  useEffect(() => {
    // The row reveals itself, from its own ref. The panel looking its rows up
    // by attribute would be re-inventing the string lookup `Lens.ts` avoids, in
    // the one place a ref is trivially at hand.
    if (picked) node.current?.scrollIntoView({ block: "nearest" });
  }, [picked]);

  return (
    <div
      ref={node}
      data-testid="qadi-instance"
      data-qadi-picked={picked ? "true" : undefined}
      style={{
        ...row,
        paddingLeft: 14,
        borderBottom: "none",
        ...(picked ? { background: colors.disagree } : {}),
      }}
    >
      <span style={{ ...muted, fontSize: font.sizeSmall }}>{instance.kind}</span>
      <span
        style={{ color: treatment.ink, fontWeight: treatment.weight }}
        data-testid="qadi-instance-state"
        data-treatment={state}
      >
        {/* Its own name, even when unrecognised: a wrong label is visible. */}
        {instance.state}
      </span>
      {isLocatable(instance) ? null : (
        <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-instance-unlocatable">
          {/* Enumerable and not locatable. Said, or the disabled highlight
              button above looks like a bug. */}
          no element — a hook has no node of its own
        </span>
      )}
    </div>
  );
};

const PickButton: FC<{ readonly lens: Lens }> = ({ lens }) => (
  <div style={{ marginBottom: 6 }}>
    <button
      type="button"
      style={{ ...button(lens.picking), fontSize: font.sizeSmall }}
      data-testid="qadi-pick"
      onClick={lens.togglePicking}
    >
      {lens.picking ? "picking — click a control, or press Escape" : "pick a control on the page"}
    </button>
  </div>
);

const heading: CSSProperties = {
  ...muted,
  fontSize: font.sizeSmall,
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

/**
 * What crossed the network, and what was lost.
 *
 * All four counts are now read rather than handed in: they come from metrics
 * `@qadi/core` declares and `@qadi/react` writes, which is why this needs no
 * wiring and why the panel no longer has to say two of the three numbers are
 * unobtainable.
 *
 * `dehydrated` and `seeded` are **process-wide**, so the footer says so. On a
 * server they accumulate across every request; in a browser only `seeded` moves
 * at all, because nothing there built a payload. Subtracting one from the other
 * is a comparison a reader will attempt unprompted, so `unaccountedEntries`
 * refuses it where it would not mean anything.
 */
const Hydration: FC<{
  readonly activity: HydrationActivity | undefined;
  readonly unsampled: boolean;
}> = ({ activity, unsampled }) => (
  <div style={{ marginTop: 10 }} data-testid="qadi-hydration">
    <div style={heading}>hydration</div>
    {activity === undefined ? (
      unsampled ? (
        // Advice to pass `diagnostics` would be wrong: it was passed, and nothing has been read yet.
        <span style={muted} data-testid="qadi-hydration-pending">
          {NO_COUNTS_YET}
        </span>
      ) : (
        <span style={muted} data-testid="qadi-hydration-unwired">
          no counts read. Pass <code>{"diagnostics={{}}"}</code> to sample them, or{" "}
          <code>hydration</code> — the result of <code>hydrationActivity</code>,
          which needs no wiring — to fill this in.
        </span>
      )
    ) : (
      <Counts activity={activity} />
    )}
  </div>
);

const Counts: FC<{ readonly activity: HydrationActivity }> = ({ activity }) => {
  const unaccounted = unaccountedEntries(activity);
  const raised = activity.drops.filter((drop) => drop.count > 0);

  return (
    <>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "2px 0" }}>
        <Count label="dehydrated" value={activity.dehydrated} testId="qadi-hydration-dehydrated" />
        <Count label="seeded" value={activity.seeded} testId="qadi-hydration-seeded" />
        <Count label="re-checked" value={activity.rechecked} testId="qadi-hydration-rechecked" />
        <Count
          label="mismatched"
          value={activity.mismatched}
          testId="qadi-hydration-mismatched"
        />
      </div>

      {activity.rechecked === 0 ? null : (
        <div style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-hydration-rate">
          {activity.mismatched} of {activity.rechecked} re-checked question
          {activity.rechecked === 1 ? "" : "s"} disagreed with the server.
        </div>
      )}

      {raised.length === 0 ? (
        <div style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-hydration-no-drops">
          {/* Said rather than left blank: every reason is watched for, and none
              of them fired. An empty area would read as "not implemented". */}
          Nothing was dropped. All {activity.drops.length} reasons are watched.
        </div>
      ) : (
        <div style={{ marginTop: 4 }} data-testid="qadi-hydration-drops">
          {raised.map((drop) => (
            <div key={drop.reason} style={{ ...row, borderBottom: "none" }} data-testid="qadi-hydration-drop">
              {/* `error`, not `denySolid`: a dropped entry is a fault to chase,
                  not a refusal. Colouring it as a denial would file a wiring
                  bug under the one thing the dock's palette reserves for a
                  policy saying no. */}
              <span style={{ color: colors.error }}>{drop.count}</span>
              <span>{drop.reason}</span>
              <span style={{ ...muted, fontSize: font.sizeSmall }}>— {drop.meaning}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-hydration-scope">
        {/* The reader will try to subtract one from the other, so the shape of
            the numbers has to be stated before they do. */}
        Process-wide totals, not this page&apos;s.{" "}
        {unaccounted === undefined
          ? "This process seeded more than it built, so it is a client reading payloads rendered elsewhere."
          : `${unaccounted} dehydrated entr${unaccounted === 1 ? "y" : "ies"} have no seeding counted in this process.`}
      </div>
    </>
  );
};

const Count: FC<{
  readonly label: string;
  readonly value: number;
  readonly testId: string;
}> = ({ label, value, testId }) => (
  <span data-testid={testId}>
    <span style={{ fontWeight: 600 }}>{value}</span>
    <span style={{ ...muted, marginLeft: 4, fontSize: font.sizeSmall }}>{label}</span>
  </span>
);

const resourceOf = (resource: Resource): string => {
  const id = resource["id"];
  return typeof id === "string" ? id : Object.keys(resource).join(", ");
};
