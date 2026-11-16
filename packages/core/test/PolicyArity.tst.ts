/**
 * Pins the compile-time half of the arity record (ARCH-98, ADR-QD-164, INV-QD-347).
 *
 * `POLICY_ARITY` states each tag's arity once. `childrenOf`'s arms are typed by it,
 * `LeafPolicy` is derived from it, and `PolicyCases` and `TraceCases` are tied to it
 * here, so moving a tag's arity in one place and not the other disagrees at exactly
 * that tag. Every negative is a checked `@ts-expect-error` with one erroring
 * reference per directive: `pnpm typecheck` consumes each directive, and an unused
 * one is itself an error.
 */
import { expect, test } from "tstyche";
import type { Trace, TraceCases } from "../src/Decision.ts";
import { childrenOf } from "../src/Policy.ts";
import type { LeafPolicy, Policy, PolicyCases } from "../src/Policy.ts";
import type { Arity, ChildArms, ChildrenOf, POLICY_ARITY } from "../src/PolicyArity.ts";

type Tag = Policy["_tag"];
type Rec = typeof POLICY_ARITY;

/** What a `PolicyCases` arm's own parameter list says about its children. */
type ArmArity<K extends Tag> =
  Parameters<PolicyCases<number>[K]> extends readonly [unknown]
    ? "Leaf"
    : Parameters<PolicyCases<number>[K]> extends readonly [unknown, number]
      ? "Wrapper"
      : Parameters<PolicyCases<number>[K]> extends readonly [unknown, ReadonlyArray<unknown>]
        ? "Many"
        : never;

/** The same, for a `TraceCases` arm (a wrapper's child is `R | undefined`). */
type TraceArmArity<K extends Tag> =
  Parameters<TraceCases<number>[K]> extends readonly [Trace]
    ? "Leaf"
    : Parameters<TraceCases<number>[K]> extends readonly [Trace, number | undefined]
      ? "Wrapper"
      : Parameters<TraceCases<number>[K]> extends readonly [Trace, ReadonlyArray<number>]
        ? "Many"
        : never;

/** The record with one tag moved to another arity. */
type Moved<T extends Tag, A extends Arity> = { readonly [K in Tag]: K extends T ? A : Rec[K] };

/** The tags whose arm disagrees with the record `R`. */
type Disagreeing<R extends { readonly [K in Tag]: Arity }> = {
  [K in Tag]: [ArmArity<K>] extends [R[K]] ? ([R[K]] extends [ArmArity<K>] ? never : K) : K;
}[Tag];

type TraceDisagreeing<R extends { readonly [K in Tag]: Arity }> = {
  [K in Tag]: [TraceArmArity<K>] extends [R[K]]
    ? [R[K]] extends [TraceArmArity<K>]
      ? never
      : K
    : K;
}[Tag];

/** True for a tag when each single move away from the record disagrees at exactly that tag. */
type EveryPolicyMove = {
  [K in Tag]: {
    [A in Exclude<Arity, Rec[K]>]: [Disagreeing<Moved<K, A>>] extends [K]
      ? [K] extends [Disagreeing<Moved<K, A>>]
        ? true
        : false
      : false;
  }[Exclude<Arity, Rec[K]>];
};

type EveryTraceMove = {
  [K in Tag]: {
    [A in Exclude<Arity, Rec[K]>]: [TraceDisagreeing<Moved<K, A>>] extends [K]
      ? [K] extends [TraceDisagreeing<Moved<K, A>>]
        ? true
        : false
      : false;
  }[Exclude<Arity, Rec[K]>];
};

type AllTrue = { [K in Tag]: true };

test("the record's keys are exactly the policy tags", () => {
  expect<keyof Rec>().type.toBe<Tag>();
});

test("LeafPolicy is what it was when it was written by hand", () => {
  expect<LeafPolicy>().type.toBe<
    Exclude<Policy, { readonly _tag: "AllOf" | "AnyOf" | "Rules" | "Not" | "Obliged" | "Labeled" }>
  >();
});

test("childrenOf's public signature did not move", () => {
  expect(childrenOf).type.toBe<(self: Policy) => ReadonlyArray<Policy>>();
});

test("every PolicyCases arm states the arity the record gives its tag", () => {
  expect<Disagreeing<Rec>>().type.toBe<never>();
});

test("any single-tag move disagrees with PolicyCases at exactly that tag (all 32)", () => {
  expect<EveryPolicyMove>().type.toBe<AllTrue>();
});

test("negative control: Not moved to Many is seen", () => {
  expect<Disagreeing<Moved<"Not", "Many">>>().type.toBe<"Not">();
});

test("every TraceCases arm states the arity the record gives its tag", () => {
  expect<TraceDisagreeing<Rec>>().type.toBe<never>();
});

test("any single-tag move disagrees with TraceCases at exactly that tag (all 32)", () => {
  expect<EveryTraceMove>().type.toBe<AllTrue>();
});

test("negative control: Obliged moved to Many is seen by TraceCases", () => {
  expect<TraceDisagreeing<Moved<"Obliged", "Many">>>().type.toBe<"Obliged">();
});

test("the arm as written is accepted for the record as it stands", () => {
  const arm: ChildArms<Policy, Rec>["Not"] = (p) => [p.policy];
  expect(arm).type.toBe<ChildArms<Policy, Rec>["Not"]>();
});

test("moving Not to Many with its arm unchanged is refused (the tuple direction)", () => {
  // @ts-expect-error is not assignable to type 'never'
  const arm: ChildArms<Policy, Moved<"Not", "Many">>["Not"] = (p) => [p.policy];
  expect(arm).type.toBe<ChildArms<Policy, Moved<"Not", "Many">>["Not"]>();
});

test("moving AllOf to Wrapper with its arm unchanged is refused (the array direction)", () => {
  // @ts-expect-error is not assignable to type 'readonly [Policy]'
  const arm: ChildArms<Policy, Moved<"AllOf", "Wrapper">>["AllOf"] = (p) => p.policies;
  expect(arm).type.toBe<ChildArms<Policy, Moved<"AllOf", "Wrapper">>["AllOf"]>();
});

test("a record missing a tag is refused", () => {
  type Missing = Omit<Rec, "HasRole">;
  // @ts-expect-error does not satisfy the constraint
  type Arms = ChildArms<Policy, Missing>;
  expect<keyof Arms>().type.toBe<Tag>();
});

test("what each arity lets an arm return", () => {
  expect<readonly []>().type.not.toBeAssignableTo<ChildrenOf<"Wrapper", Policy>>();
  expect<readonly [Policy]>().type.toBeAssignableTo<ChildrenOf<"Wrapper", Policy>>();
  expect<readonly [Policy]>().type.not.toBeAssignableTo<ChildrenOf<"Many", Policy>>();
  expect<readonly [Policy, Policy]>().type.not.toBeAssignableTo<ChildrenOf<"Many", Policy>>();
  expect<ReadonlyArray<Policy>>().type.toBeAssignableTo<ChildrenOf<"Many", Policy>>();
  // The documented gap: an empty array is a valid Many, so Leaf -> Many is caught by
  // `LeafPolicy`'s readers, not by `childrenOf`'s arms.
  expect<readonly []>().type.toBeAssignableTo<ChildrenOf<"Many", Policy>>();
  expect<readonly []>().type.toBeAssignableTo<ChildrenOf<"Leaf", Policy>>();
});
