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
 * A shared stepper that decided the stop itself, one pure function per composite
 * both interpreters would call, was measured and not adopted (ADR-QD-077
 * addendum, 2026-10-07): the conjunctions stay in the interpreters, and
 * `ShortCircuit.test.ts`'s agreement tests pin where each one stops.
 *
 * Only the rules that name an *outcome* live here. `allOf` stops at its first
 * denial under every strategy and needs no function to say so.
 *
 * The combining rule is a `Record` over its closed union rather than a `Match`:
 * TypeScript requires every key (TS2741), so a fourth algorithm is a compile
 * error exactly as `Match.exhaustive` would make it — but a hand-built,
 * in-process value outside the union (the schema is bypassed by the smart
 * constructors) reads as the safe answer instead of throwing a `MatchError` out
 * of an authorization decision. The field-strategy rule is not a table of this
 * module's own any more: whether an `anyOf` may stop is a fact about the merge,
 * so it is `FieldLattice.ts`'s `decidedByFirst` law, and this module is the
 * adapter both interpreters read it through (ADR-QD-077, ADR-QD-092).
 *
 * Every lookup is guarded by `Object.hasOwn`. A bare `TABLE[value]` reads an
 * *inherited* member for a key `Object.prototype` supplies (`"toString"`,
 * `"constructor"`, `"__proto__"`, …): a function or an object, truthy, which an
 * `anyOf` read as "stop at the first allow" and so returned that child's
 * unrestricted field set (CCR-QD-174, ARCH-12 C3) — the predecessor's defect
 * BEH-QD-035 records, "silently treated every other value as short-circuit",
 * reborn one module over. So a value outside the union, prototype keys
 * included, reads as the answer that sees more, never less.
 *
 * Deliberately out of the barrel (AGENTS.md §9), like `PortAccess.ts`.
 */
import { fieldStrategyLaws } from "./FieldLattice.ts";
import type { Combining, FieldStrategy, RuleEffect } from "./Policy.ts";

/**
 * Whether an `anyOf` may stop at its first allowing child.
 *
 * `First` may: one allowing child already decides it (ADR-QD-013). `Union` and
 * `Intersection` may not, because they merge every allowing child's visible
 * fields and so must see them all. The fact is the field lattice's —
 * `fieldStrategyLaws(strategy).decidedByFirst` — and so is the answer for a
 * value outside the union, including a key `Object.prototype` supplies:
 * `false`, "must see everything", the direction that sees more, never less
 * (CCR-QD-174).
 */
export const anyOfStopsAtAllow = (strategy: FieldStrategy): boolean =>
  fieldStrategyLaws(strategy).decidedByFirst;

const DECISIVE_EFFECT_BY_COMBINING: Record<Combining, RuleEffect | undefined> = {
  DenyOverrides: "Deny",
  PermitOverrides: "Permit",
  FirstApplicable: undefined,
};

/**
 * Whether `value` is one of the closed union's combining algorithms — a key of
 * this module's own table, read through `Object.hasOwn` for the reason the
 * module comment gives. A value that is not a string at all is outside it too.
 *
 * The one membership test for an algorithm: {@link effectiveCombining} reads it
 * to choose the fallback, and `Explanation.ts` reads it to say in words that a
 * table's algorithm is outside the union rather than throw on it (ADR-QD-092
 * amendment, CCR-QD-183).
 */
export const isCombining = (value: unknown): value is Combining =>
  typeof value === "string" && Object.hasOwn(DECISIVE_EFFECT_BY_COMBINING, value);

/**
 * The algorithm a rule table is actually walked under: its own `combining`, or
 * `DenyOverrides` for a value outside the union.
 *
 * Decode rejects such a value (ADR-QD-006), so only a policy built in process
 * reaches here with one. A bare lookup used to walk `"Xor"` as
 * `FirstApplicable` and `"toString"` as an algorithm with no decisive effect —
 * both able to permit where the author's lost `DenyOverrides` would have
 * denied. `DenyOverrides` is the one fallback that cannot permit anything the
 * real algorithm would refuse, the same fail-closed rule an unknown field
 * strategy follows (CCR-QD-174, ARCH-12 C9). Both interpreters read it:
 * `rulesDecisiveEffect` below for where the walk stops, and `toPredicate`'s
 * plan for which formula a table becomes.
 */
export const effectiveCombining = (combining: Combining): Combining =>
  isCombining(combining) ? combining : "DenyOverrides";

/**
 * The effect that ends a `rules` walk, or `undefined` when the first rule that
 * applies at all is already final.
 *
 * `DenyOverrides` stops at the first applying `Deny` and `PermitOverrides` at the
 * first applying `Permit` — nothing later can beat it (INV-QD-017).
 * `FirstApplicable` has no overriding effect: whichever rule applies first
 * decides, so every applying rule is final. A value outside the union is read
 * through {@link effectiveCombining}, so it stops where `DenyOverrides` does.
 */
export const rulesDecisiveEffect = (combining: Combining): RuleEffect | undefined =>
  DECISIVE_EFFECT_BY_COMBINING[effectiveCombining(combining)];
