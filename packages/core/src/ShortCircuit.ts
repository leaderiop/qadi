/**
 * The stop rules: which child result settles a composite, and so where a walk
 * over a policy tree may stop asking.
 *
 * `evaluate` and `toPredicate` are two interpreters over one tree (ADR-QD-024),
 * and the one place they must agree about *liveness* — not just about answers —
 * is where they stop. A child nobody needed is a port call nobody should make, and
 * a port that fails behind it is a failure nobody should see
 * ([INV-QD-005](../../../spec/invariants.md), [INV-QD-017](../../../spec/invariants.md)).
 * Both interpreters read the rule from here, so a change to when `anyOf` may stop
 * changes both at once; the walk-equality property in `Predicate.test.ts` is what
 * makes any disagreement visible.
 *
 * Only the rules that name an *outcome* live here. `allOf` stops at its first
 * denial under every strategy and needs no function to say so.
 *
 * Each rule is a `Record` over its closed union rather than a `Match`: TypeScript
 * requires every key (TS2741), so a fourth strategy is a compile error exactly as
 * `Match.exhaustive` would make it — but a hand-built, in-process value outside
 * the union (the schema is bypassed by the smart constructors) reads as the safe
 * answer instead of throwing a `MatchError` out of an authorization decision.
 * `mergeFields` carries a runtime `default` arm for the same reason.
 *
 * Deliberately out of the barrel (AGENTS.md §9), like `PortAccess.ts`.
 */
import type { Combining, FieldStrategy, RuleEffect } from "./Policy.ts";

const STOPS_AT_ALLOW_BY_STRATEGY: Record<FieldStrategy, boolean> = {
  First: true,
  Intersection: false,
  Union: false,
};

/**
 * Whether an `anyOf` may stop at its first allowing child.
 *
 * `First` may: one allowing child already decides it (ADR-QD-013). `Union` and
 * `Intersection` may not, because they merge every allowing child's visible
 * fields and so must see them all. A value outside the union reads as
 * `undefined`, which callers negate into "must see everything" — the direction
 * that sees more, never less.
 */
export const anyOfStopsAtAllow = (strategy: FieldStrategy): boolean =>
  STOPS_AT_ALLOW_BY_STRATEGY[strategy];

const DECISIVE_EFFECT_BY_COMBINING: Record<Combining, RuleEffect | undefined> = {
  DenyOverrides: "Deny",
  PermitOverrides: "Permit",
  FirstApplicable: undefined,
};

/**
 * The effect that ends a `rules` walk, or `undefined` when the first rule that
 * applies at all is already final.
 *
 * `DenyOverrides` stops at the first applying `Deny` and `PermitOverrides` at the
 * first applying `Permit` — nothing later can beat it (INV-QD-017).
 * `FirstApplicable` has no overriding effect: whichever rule applies first
 * decides, so every applying rule is final.
 */
export const rulesDecisiveEffect = (combining: Combining): RuleEffect | undefined =>
  DECISIVE_EFFECT_BY_COMBINING[combining];
