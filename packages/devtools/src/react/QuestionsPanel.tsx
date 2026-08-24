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
  /** Verdict disagreements between a server decision and its client re-check. */
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

    <Hydration mismatches={hydrationMismatches} />

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

/**
 * The one hydration number that is obtainable, and the ones that are not.
 *
 * `hydrateDecisions` returns an array and forgets it, so the dehydrated-entry
 * count is not retained anywhere; nothing counts re-evaluations. Only a verdict
 * *disagreement* is reported, once per question. Naming the gap beats leaving a
 * reader to wonder why two of the three numbers they expected are missing.
 */
const Hydration: FC<{ readonly mismatches: number | undefined }> = ({ mismatches }) => (
  <div style={{ marginTop: 10 }} data-testid="qadi-hydration">
    <div
      style={{
        ...muted,
        fontSize: font.sizeSmall,
        textTransform: "uppercase",
        letterSpacing: 0.6,
      }}
    >
      hydration
    </div>
    {mismatches === undefined ? (
      <span style={muted} data-testid="qadi-hydration-unwired">
        no mismatch reporter wired
      </span>
    ) : (
      <span data-testid="qadi-hydration-mismatches">
        {mismatches} mismatch{mismatches === 1 ? "" : "es"}
        <span style={{ ...muted, marginLeft: 6 }}>
          — a server allow that no longer holds client-side
        </span>
      </span>
    )}
    <div style={{ ...muted, fontSize: font.sizeSmall }} data-testid="qadi-hydration-limits">
      Dehydrated and re-checked counts are not obtainable: hydration returns its
      entries and does not retain them, and nothing counts re-evaluations.
    </div>
  </div>
);

const resourceOf = (resource: Resource): string => {
  const id = resource["id"];
  return typeof id === "string" ? id : Object.keys(resource).join(", ");
};
