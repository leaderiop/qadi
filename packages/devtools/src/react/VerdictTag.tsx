"use client";
/**
 * The verdict badge — **three visually distinct classes, never two**.
 *
 * `ALLOW` is a tint, `DENY` is solid, and `ERROR` is outlined. They differ in
 * *treatment* and not only in colour, so the distinction survives a reader who
 * cannot tell the two hues apart — which matters more here than usually,
 * because collapsing ERROR into DENY is the misreading this whole tool exists
 * to prevent (INV-QD-006).
 */
import type { CSSProperties, FC } from "react";
import type { Verdict } from "../model/Verdict.ts";
import { colors, font } from "./theme.ts";

const base: CSSProperties = {
  display: "inline-block",
  padding: "0 6px",
  borderRadius: 3,
  fontSize: font.sizeSmall,
  fontWeight: 600,
  letterSpacing: 0.4,
  border: "1px solid transparent",
};

const styles: Record<Verdict, CSSProperties> = {
  Allow: { ...base, background: colors.allowTint, color: colors.allow },
  Deny: { ...base, background: colors.denySolid, color: colors.deny },
  Error: { ...base, color: colors.error, borderColor: colors.error },
  Unknown: { ...base, color: colors.textMuted, borderColor: colors.border },
};

const labels: Record<Verdict, string> = {
  Allow: "ALLOW",
  Deny: "DENY",
  Error: "ERROR",
  // Not "UNKNOWN": the row is an obligation outcome whose decision never
  // arrived, and naming what it *is* beats naming what is missing.
  Unknown: "NO DECISION",
};

export const VerdictTag: FC<{ readonly verdict: Verdict }> = ({ verdict }) => (
  <span style={styles[verdict]} data-verdict={verdict}>
    {labels[verdict]}
  </span>
);

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
      ...base,
      color: colors.textMuted,
      borderColor: colors.border,
      fontWeight: 500,
    }}
    data-environment={environment}
  >
    {environment}
  </span>
);
