/**
 * Obligations — duties a caller must discharge as a condition of permission.
 *
 * "Permit, provided the access is logged" is one rule, and field visibility
 * cannot express it: `fields` restricts what comes back, never what the caller
 * owes. See [ADR-QD-019](../../../spec/decisions/019-obligations.md).
 *
 * Schema-derived, because an obligation travels *inside* a policy and therefore
 * crosses the same trust boundary the policy does (ADR-QD-002). The decision it
 * ends up on has no codec, but the `Obliged` node that produced it does.
 *
 * An obligation is **data**. Nothing here runs; the evaluator never invokes an
 * obligation, because the moment it could, evaluation would acquire side
 * effects and INV-QD-009 — a guarded effect does not run when denied — would be
 * gone.
 */
import * as Equal from "effect/Equal";
import * as Schema from "effect/Schema";

export const Obligation = Schema.Struct({
  /** Names the duty. Not an identity: two duties may share one id. */
  id: Schema.String,
  /** Whatever the caller needs in order to discharge it. */
  attributes: Schema.Record(Schema.String, Schema.Unknown),
  /**
   * XACML's *advice*: the caller may ignore it.
   *
   * A non-advisory obligation binds, and `Qadi.enforce` refuses an allow
   * carrying one it cannot discharge.
   */
  advisory: Schema.Boolean,
});

export type Obligation = typeof Obligation.Type;

export interface ObligationOptions {
  /** Defaults to `false`. An advisory obligation never blocks enforcement. */
  readonly advisory?: boolean;
}

/** Builds an obligation. `attributes` defaults to empty, `advisory` to false. */
export const obligation = (
  id: string,
  attributes: Readonly<Record<string, unknown>> = {},
  options?: ObligationOptions,
): Obligation => ({
  id,
  attributes,
  advisory: options?.advisory ?? false,
});

/**
 * Combines two obligation sets.
 *
 * Union, always — never intersection, and the asymmetry with `intersectFields`
 * is deliberate. An absent field set is the *top* of its lattice, so narrowing
 * discloses less and is safe; an absent obligation set is the *bottom* of this
 * one, so narrowing would let a caller discharge fewer duties than an allowing
 * branch required. That is a quiet grant, which is why there is no strategy to
 * configure here (ADR-QD-019).
 *
 * Identity is the whole value rather than the `id`: the same obligation reached
 * twice through a diamond appears once, while two duties sharing an id with
 * different attributes are two duties and both survive.
 */
export const unionObligations = (
  a: ReadonlyArray<Obligation>,
  b: ReadonlyArray<Obligation>,
): ReadonlyArray<Obligation> => {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const out = [...a];
  for (const candidate of b) {
    if (!out.some((seen) => Equal.equals(seen, candidate))) out.push(candidate);
  }
  return out;
};

/** The obligations that bind. Advisory ones are reported but never block. */
export const bindingObligations = (
  self: ReadonlyArray<Obligation>,
): ReadonlyArray<Obligation> => self.filter((o) => !o.advisory);
