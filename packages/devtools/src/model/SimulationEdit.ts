/**
 * One change to a simulation's input — the unit a what-if sweep varies.
 *
 * A leaf, for the reason `SimulationInput.ts` is one: `Edits.ts` derives the
 * weakenings, `Remedies.ts` derives the strengthenings and `WhatIf.ts` runs
 * both, so defining the type in any of the three made an import cycle
 * ([madge](../../../../package.json) is merge gate 5).
 *
 * **An edit is a function, not a patch.** A patch would need a merge rule per
 * field of `SimulationInput`, and the interesting edits — dropping the third of
 * four relationship edges, setting a nested resource attribute — are not
 * expressible as one. A function composes for free, which is the whole of
 * `composeEdits`, and it is what makes second-order sweeps two lines rather
 * than a second implementation of merging.
 */
import type { SimulationInput } from "./SimulationInput.ts";

/**
 * Which way an edit moves the subject's standing.
 *
 * The panel groups by this, and the grouping is the point: for an allow the
 * interesting rows are the weakenings that still allow, and for a denial they
 * are the strengthenings that would fix it. Showing both families
 * undifferentiated buries whichever one the reviewer opened the screen for.
 */
export type EditDirection = "Weaken" | "Strengthen" | "Mixed";

/**
 * What an edit does, as a closed union.
 *
 * Flat literals rather than a `{ direction, target }` pair: the two axes are
 * not independent — there is no `DropAction` and no `SetRole` — so a product
 * type would admit combinations nothing produces and every consumer would carry
 * a branch for them.
 */
export type EditKind =
  // ── weakenings: something the input has, taken away ──
  | "DropRole"
  | "DropPermission"
  | "DropSubjectAttribute"
  | "DropFixtureAttribute"
  | "DropRelationship"
  | "DropEvent"
  // ── strengthenings: something the policy asks for, supplied ──
  | "GrantRole"
  | "GrantPermission"
  | "SetSubjectAttribute"
  | "SetResourceAttribute"
  | "AddRelationship"
  | "AddEvent"
  | "SetAction"
  // ── two of the above at once ──
  | "Pair";

export interface SimulationEdit {
  readonly kind: EditKind;
  readonly direction: EditDirection;
  /** How the row is titled. Unique within one sweep, and stable across runs. */
  readonly label: string;
  readonly apply: (self: SimulationInput) => SimulationInput;
  /**
   * The two edits a `Pair` composes, in application order.
   *
   * Kept rather than recomputed from the label, so a panel can offer "run just
   * this half" without parsing a string it also formatted.
   */
  readonly parts?: readonly [SimulationEdit, SimulationEdit] | undefined;
}

/**
 * Both edits, the first one first.
 *
 * Order matters for composition even though every edit this package derives is
 * order-independent: dropping the `editor` role and dropping the `doc:read`
 * permission commute, but nothing in the type says they must, and a caller
 * supplying their own edits is entitled to two that do not.
 */
export const composeEdits = (first: SimulationEdit, second: SimulationEdit): SimulationEdit => ({
  kind: "Pair",
  direction: first.direction === second.direction ? first.direction : "Mixed",
  label: `${first.label} + ${second.label}`,
  apply: (self) => second.apply(first.apply(self)),
  parts: [first, second],
});

/** Every edit in turn, left to right. */
export const applyEdits = (
  self: SimulationInput,
  edits: ReadonlyArray<SimulationEdit>,
): SimulationInput => edits.reduce((input, edit) => edit.apply(input), self);

/**
 * Every leaf edit of a possibly-composed one, in application order.
 *
 * A `Pair` of `Pair`s is not something this package builds, but `composeEdits`
 * is public and admits one, so the flattening recurses rather than assuming a
 * depth of two.
 */
export const editParts = (self: SimulationEdit): ReadonlyArray<SimulationEdit> =>
  self.parts === undefined ? [self] : self.parts.flatMap(editParts);
