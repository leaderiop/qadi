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
 * view, unchanged. `gateInstances()` says who is **asking**, right now, and what
 * each of them rendered. The grouping still goes through `Equal.equals`, so a
 * group is exactly an atom and the panel cannot claim two questions where the
 * evaluator sees one ([ADR-QD-053](../../../../spec/decisions/053-a-gate-can-be-found.md)).
 *
 * A reader arrives here asking "why is this button missing", which the first
 * view cannot answer and the second can — and the lens can point at the place
 * the button is not.
 */
import type { CSSProperties, FC } from "react";
import { useEffect, useMemo, useRef } from "react";
import type { Policy, Resource } from "@qadi/core";
import { policyLabel } from "../model/Catalogue.ts";
import type { GateGroup, GateInstanceLike } from "../model/Gates.ts";
import { gateGroups, instancesAsking, isLocatable, locatableIds } from "../model/Gates.ts";
import type { HydrationActivity } from "../model/Hydration.ts";
import { unaccountedEntries } from "../model/Hydration.ts";
import { button, colors, font, muted } from "./theme.ts";
import { useLens } from "./useLens.ts";

/**
 * One question an atom set has been asked.
 *
 * Structurally identical to `@qadi/react`'s `AskedQuestion` and deliberately
 * not imported from it: `@qadi/devtools` does not depend on `@qadi/react` and
 * should not start for one type. A host passes `atoms.asked()` straight in.
 */
export interface AskedQuestionLike {
  readonly policy: Policy;
  /** Absent when the question was asked with no resource in scope. */
  readonly resource?: Resource | undefined;
}

export interface QuestionsPanelProps {
  readonly questions: ReadonlyArray<AskedQuestionLike> | undefined;
  /**
   * Read with `hydrationActivity`, which needs no wiring at all.
   *
   * It supersedes {@link hydrationMismatches}, which a host had to accumulate
   * itself because nothing in `@qadi/react` counted anything.
   */
  readonly hydration?: HydrationActivity;
  /**
   * Verdict disagreements, counted by the host.
   *
   * Kept for a host already passing it, and shown only when {@link hydration}
   * is absent. A host counting its own `onHydrationMismatch` calls counts
   * exactly what `hydration.mismatched` counts, so showing both would invite a
   * reader to reconcile one number with itself.
   */
  readonly hydrationMismatches?: number;
  /**
   * The live guards, usually `gateInstances()` from `@qadi/react`.
   *
   * Absent, or empty because the provider is not instrumented, and the panel
   * shows only what has been asked and says how to see who is asking. Those two
   * states are distinguished, because one is a missing prop and the other is a
   * missing prop **on the provider** and they have different fixes.
   */
  readonly gates?: ReadonlyArray<GateInstanceLike>;
  /** Wired to `useInvalidate`. Absent means the button is not shown. */
  readonly onInvalidate?: () => void;
}

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
  hydrationMismatches,
  gates,
  onInvalidate,
}) => {
  const instances = useMemo(() => gates ?? [], [gates]);
  const groups = useMemo(() => gateGroups(instances), [instances]);

  const lens = useLens(instances);

  return (
  <div style={{ padding: 12 }} data-testid="qadi-questions">
    <p style={{ ...muted, fontSize: font.sizeSmall, marginTop: 0 }} data-testid="qadi-keying-note">
      {/* Said up front, because a reader counting rows against components in
          their tree would otherwise conclude the panel is broken. Both halves
          have to be said: the row count is questions, the nested count is
          components, and they are different numbers on purpose. */}
      One row per <em>question</em>, not per component. Atoms are keyed
      structurally, so ten gates on the same policy are one atom — that is what
      the evaluator sees. The guards asking each question are listed underneath.
    </p>

    {instances.length === 0 ? (
      <p style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-gates-absent">
        {gates === undefined
          ? "No live guards were handed to the dock. Pass gates — usually gateInstances() — to list who is asking."
          : "No guard is registered. Pass instrument to QadiProvider to let them say that they exist."}
      </p>
    ) : (
      <PickButton lens={lens} />
    )}

    {questions === undefined ? (
      <p style={muted} data-testid="qadi-questions-absent">
        No atom set was handed to the dock. Pass <code>questions</code> — usually{" "}
        <code>atoms.asked()</code> — to list what has been asked.
      </p>
    ) : questions.length === 0 ? (
      <p style={muted} data-testid="qadi-questions-empty">
        Nothing has been asked yet. A question appears here the first time a
        component reads its decision.
      </p>
    ) : (
      questions.map((question, index) => (
        <Question
          key={`${policyLabel(question.policy)}-${index}`}
          question={question}
          groups={groups}
          lens={lens}
        />
      ))
    )}

    <Hydration activity={hydration} mismatches={hydrationMismatches} />

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

/** One question, and the guards currently asking it. */
const Question: FC<{
  readonly question: AskedQuestionLike;
  readonly groups: ReadonlyArray<GateGroup>;
  readonly lens: ReturnType<typeof useLens>;
}> = ({ question, groups, lens }) => {
  const asking = instancesAsking(groups, question.policy, question.resource);
  const locatable = asking.filter(isLocatable);

  return (
    <div data-testid="qadi-question-block">
      <div style={row} data-testid="qadi-question">
        <span>{policyLabel(question.policy)}</span>
        <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-question-scope">
          {question.resource === undefined ? "no resource" : resourceOf(question.resource)}
        </span>
        {asking.length === 0 ? (
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

      {asking.map((instance) => (
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
      <span style={{ color: stateColour(instance.state) }} data-testid="qadi-instance-state">
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

/**
 * `Rechecking` and `Pending` share the muted colour deliberately.
 *
 * Neither is an answer, and giving them different weights would suggest one is
 * closer to being one. What separates them is the word, which is on screen.
 */
const stateColour = (state: string): string => {
  if (state === "Allowed") return colors.allow;
  if (state === "Denied") return colors.error;
  if (state === "Failed") return colors.error;
  return colors.textMuted;
};

const PickButton: FC<{ readonly lens: ReturnType<typeof useLens> }> = ({ lens }) => (
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
  readonly mismatches: number | undefined;
}> = ({ activity, mismatches }) => (
  <div style={{ marginTop: 10 }} data-testid="qadi-hydration">
    <div style={heading}>hydration</div>
    {activity === undefined ? (
      <LegacyMismatches mismatches={mismatches} />
    ) : (
      <Counts activity={activity} />
    )}
  </div>
);

/** The one number a host could accumulate before anything counted for it. */
const LegacyMismatches: FC<{ readonly mismatches: number | undefined }> = ({ mismatches }) => (
  <>
    {mismatches === undefined ? (
      <span style={muted} data-testid="qadi-hydration-unwired">
        no counts read. Pass <code>hydration</code> — the result of{" "}
        <code>hydrationActivity</code>, which needs no wiring — to fill this in.
      </span>
    ) : (
      <span data-testid="qadi-hydration-mismatches">
        {mismatches} mismatch{mismatches === 1 ? "" : "es"}
        <span style={{ ...muted, marginLeft: 6 }}>
          — a server allow that no longer holds client-side
        </span>
      </span>
    )}
  </>
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
