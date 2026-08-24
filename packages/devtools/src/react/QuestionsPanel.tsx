"use client";
/**
 * Screen 7 — the React panel, **keyed by question rather than by instance**.
 *
 * The original design listed every live `<Can>` and `<Cannot>` with its render
 * state. That is not unimplemented, it is unobtainable: `Atom.family` compares
 * with `Equal.equals`, so ten `<Can policy={isAdmin}>` in different places in
 * the tree are **one atom**. The library cannot tell them apart, and a panel
 * showing ten rows would be inventing a distinction the architecture does not
 * have — while a panel keyed by policy shows exactly what is shared, which is
 * the more useful fact anyway.
 *
 * `QadiAtoms.asked()` records the questions, in the atom layer rather than by
 * components registering themselves: AGENTS.md §13 keeps the React glue to one
 * `useSyncExternalStore` call and decisions out of React state, and an instance
 * registry would breach both.
 */
import type { CSSProperties, FC } from "react";
import type { Policy, Resource } from "@qadi/core";
import { policyLabel } from "../model/Catalogue.ts";
import type { HydrationActivity } from "../model/Hydration.ts";
import { unaccountedEntries } from "../model/Hydration.ts";
import { button, colors, font, muted } from "./theme.ts";

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
  onInvalidate,
}) => (
  <div style={{ padding: 12 }} data-testid="qadi-questions">
    <p style={{ ...muted, fontSize: font.sizeSmall, marginTop: 0 }} data-testid="qadi-keying-note">
      {/* Said up front, because a reader counting rows against components in
          their tree will otherwise conclude the panel is broken. */}
      One row per <em>question</em>, not per component. Atoms are keyed
      structurally, so ten gates on the same policy are one atom — the library
      cannot tell them apart, and a per-instance count would be invented.
    </p>

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
        <div key={`${policyLabel(question.policy)}-${index}`} style={row} data-testid="qadi-question">
          <span>{policyLabel(question.policy)}</span>
          <span style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-question-scope">
            {question.resource === undefined ? "no resource" : resourceOf(question.resource)}
          </span>
        </div>
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
