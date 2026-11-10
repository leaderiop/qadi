"use client";
/**
 * The verdict badge. Its look comes from `VerdictTreatment.ts`, which says why
 * Allow, Deny and Error are three visually distinct classes, never two.
 */
import type { FC } from "react";
import type { Verdict } from "../model/Verdict.ts";
import { displayOfVerdict } from "../model/Verdict.ts";
import { badge, colors } from "./theme.ts";
import { tagStyle, treatmentOf } from "./VerdictTreatment.ts";

export const VerdictTag: FC<{ readonly verdict: Verdict }> = ({ verdict }) => {
  const state = displayOfVerdict(verdict);
  const treatment = treatmentOf(state);
  return (
    <span style={tagStyle(treatment)} data-verdict={verdict} data-treatment={state}>
      {treatment.label}
    </span>
  );
};

/**
 * Where a decision was made.
 *
 * Rendered from whatever string the sink stamped, with no fixed Server/Client
 * vocabulary: a deployment naming its processes `"eu-west"` and `"us-east"`
 * gets those words, because nothing branches on this value and an unfamiliar
 * one should degrade to an unfamiliar badge rather than to a wrong answer.
 */
export const EnvironmentTag: FC<{ readonly environment: string }> = ({ environment }) => (
  <span
    style={{
      ...badge,
      color: colors.textMuted,
      borderColor: colors.border,
      fontWeight: 500,
    }}
    data-environment={environment}
  >
    {environment}
  </span>
);
