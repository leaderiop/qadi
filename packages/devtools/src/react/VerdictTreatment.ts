/**
 * The one map from a displayable state to how it looks on screen.
 *
 * Every panel's verdict colour comes from here: `VerdictTag`'s badge, a live
 * guard's state in `QuestionsPanel` and a policy node's mark in `PolicyTree`.
 * It used to live in all three, and two of them drew a denial in the amber
 * reserved for errors.
 *
 * **Three visually distinct classes, never two.** `ALLOW` is a tint, `DENY` is
 * solid, and `ERROR` is outlined. They differ in *treatment* and not only in
 * colour, so the distinction survives a reader who cannot tell the two hues
 * apart — which matters more here than usually, because collapsing ERROR into
 * DENY is the misreading this whole tool exists to prevent: Deny and Error
 * never share a channel (INV-QD-006, ADR-QD-008).
 */
import type { CSSProperties } from "react";
import type { DisplayState } from "../model/Verdict.ts";
import { badge, colors } from "./theme.ts";

export interface Treatment {
  /** The word a badge shows. */
  readonly label: string;
  /** The colour of the state as inline text on the dock's surface. */
  readonly ink: string;
  /**
   * The colour of the badge's text. The same as `ink` except for a denial,
   * whose badge is solid: light text on `denySolid`, where inline text on the
   * dark surface needs a red of its own.
   */
  readonly tagInk: string;
  readonly background: string;
  readonly border: string;
  /** The weight of the state as inline text. */
  readonly weight: number;
}

/**
 * The muted look of a state that is not an answer.
 *
 * `Pending` and `Rechecking` share it deliberately: neither is an answer, and
 * giving them different weights would suggest one is closer to being one. What
 * separates them is the word, which is on screen.
 */
const nonAnswer = (label: string): Treatment => ({
  label,
  ink: colors.textMuted,
  tagInk: colors.textMuted,
  background: "transparent",
  border: colors.border,
  weight: 400,
});

const TREATMENTS: { readonly [K in DisplayState]: Treatment } = {
  // A tint, so the common case does not shout.
  Allow: {
    label: "ALLOW",
    ink: colors.allow,
    tagInk: colors.allow,
    background: colors.allowTint,
    border: "transparent",
    weight: 400,
  },
  // Solid, and heavier as text: a refusal is what a reader is usually hunting.
  Deny: {
    label: "DENY",
    ink: colors.denyInk,
    tagInk: colors.deny,
    background: colors.denySolid,
    border: "transparent",
    weight: 700,
  },
  // Outlined, so it cannot be mistaken for either of the other two.
  Error: {
    label: "ERROR",
    ink: colors.error,
    tagInk: colors.error,
    background: "transparent",
    border: colors.error,
    weight: 400,
  },
  // Not "UNKNOWN": the row is an obligation outcome whose decision never
  // arrived, and naming what it *is* beats naming what is missing.
  Unknown: nonAnswer("NO DECISION"),
  Pending: nonAnswer("PENDING"),
  Rechecking: nonAnswer("RECHECKING"),
  // Not reached is not refused: the evaluation did not need this branch.
  NotReached: nonAnswer("NOT REACHED"),
  // A guard state this build does not know; the panel shows its own name.
  Unrecognised: nonAnswer("UNRECOGNISED"),
};

export const treatmentOf = (state: DisplayState): Treatment => TREATMENTS[state];

/** A treatment drawn as a badge. */
export const tagStyle = (treatment: Treatment): CSSProperties => ({
  ...badge,
  background: treatment.background,
  color: treatment.tagInk,
  borderColor: treatment.border,
});
