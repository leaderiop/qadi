/**
 * The outcome of evaluating a policy.
 *
 * Every evaluation produces a full trace tree, so a denial can always answer
 * "why". Durations come from the `Clock` service rather than `performance.now`,
 * which makes traces reproducible under `TestClock` — the predecessor's traces
 * could not be asserted on at all.
 */
import * as Data from "effect/Data";
import type { Obligation } from "./Obligation.ts";
import type { Policy } from "./Policy.ts";

/** One node of the evaluation tree. */
export interface Trace {
  readonly policyTag: Policy["_tag"];
  /** Present only for `Labeled` nodes. */
  readonly label?: string | undefined;
  readonly allowed: boolean;
  /** Why the node denied. Absent when it allowed. */
  readonly reason?: string | undefined;
  readonly children: ReadonlyArray<Trace>;
  /**
   * Fields visible when this node allows. `undefined` is the top of the
   * lattice and means "all fields", not "none".
   */
  readonly visibleFields?: ReadonlyArray<string> | undefined;
  /**
   * Duties this node contributed. Empty unless it allowed.
   *
   * Required rather than optional, like `children`: every node has a set, and
   * an optional one would mean a `?? []` at each read that no execution could
   * ever take.
   *
   * Recorded here as well as on the decision so that an obligation discarded by
   * an enclosing `Not` is still visible to a reviewer. That is what makes
   * dropping it defensible rather than silent (ADR-QD-019).
   */
  readonly obligations: ReadonlyArray<Obligation>;
}

export class Allow extends Data.TaggedClass("Allow")<{
  readonly evaluationId: string;
  readonly subjectId: string;
  readonly durationMillis: number;
  readonly trace: Trace;
  readonly visibleFields: ReadonlyArray<string> | undefined;
  /**
   * What the caller must do as a condition of this permission.
   *
   * Always an array; empty is the common case. `Deny` has no counterpart — an
   * obligation conditions permission, and a denial permits nothing.
   */
  readonly obligations: ReadonlyArray<Obligation>;
}> {}

export class Deny extends Data.TaggedClass("Deny")<{
  readonly evaluationId: string;
  readonly subjectId: string;
  readonly durationMillis: number;
  readonly trace: Trace;
  readonly reason: string;
}> {}

export type Decision = Allow | Deny;

/** True when the decision permits the action. */
export const isAllowed = (self: Decision): self is Allow => self._tag === "Allow";

/**
 * Projects a record down to the fields the decision makes visible.
 *
 * A denial exposes nothing. An allow with no field restriction exposes
 * everything, since `undefined` is the top of the visibility lattice.
 */
export const project = <A extends Record<string, unknown>>(
  decision: Decision,
  data: A,
): Partial<A> => {
  if (!isAllowed(decision)) return {};
  if (decision.visibleFields === undefined) return data;

  const out: Partial<A> = {};
  for (const field of decision.visibleFields) {
    if (Object.hasOwn(data, field)) {
      out[field as keyof A] = data[field as keyof A];
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Field visibility lattice
// ---------------------------------------------------------------------------

/**
 * Intersects two visible-field sets.
 *
 * `undefined` means "all fields" — the top of the lattice — so intersecting it
 * with any set yields that set.
 */
export const intersectFields = (
  a: ReadonlyArray<string> | undefined,
  b: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const inB = new Set(b);
  return a.filter((f) => inB.has(f));
};

/** Unions two visible-field sets, preserving "all fields" as absorbing. */
export const unionFields = (
  a: ReadonlyArray<string> | undefined,
  b: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined => {
  if (a === undefined || b === undefined) return undefined;
  return [...new Set([...a, ...b])];
};
