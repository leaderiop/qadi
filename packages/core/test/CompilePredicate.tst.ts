/**
 * Pins that `compilePredicate`'s `rules` refuses the two fields core defaults (WR-01, BEH-QD-596).
 *
 * `Omit` alone rejects them only on a fresh object literal; a full `RenderRules` value
 * type-checked and had its own `maxInValues` silently replaced by the default. Each
 * negative is a `@ts-expect-error` checked twice, as in `PolicyArity.tst.ts`: under
 * `pnpm typecheck` an unused directive is TS2578, and under `pnpm test:tstyche` the
 * text after it is a fragment of the one suppressed error's message.
 */
import { expect, test } from "tstyche";
import type { CompilePredicateOptions, RenderRules } from "../src/RenderablePredicate.ts";

type Rules = CompilePredicateOptions<string>["rules"];

declare const full: RenderRules;
declare const dialect: Omit<RenderRules, "identifiers" | "maxInValues">;

test("a dialect's rules without the two defaulted fields are accepted", () => {
  const rules: Rules = dialect;
  expect(rules).type.toBe<Rules>();
});

test("a full RenderRules value is refused, not silently overridden", () => {
  expect(full).type.not.toBeAssignableTo<Rules>();
  // @ts-expect-error is not assignable to type 'never'
  const rules: Rules = full;
  expect(rules).type.toBe<Rules>();
});

test("a rules value carrying only maxInValues is refused", () => {
  const withMax = { ...dialect, maxInValues: 10 };
  // @ts-expect-error is not assignable to type 'never'
  const rules: Rules = withMax;
  expect(rules).type.toBe<Rules>();
});

test("a rules value carrying only identifiers is refused", () => {
  const withIdentifiers = { ...dialect, identifiers: "Ascii" };
  // @ts-expect-error is not assignable to type 'never'
  const rules: Rules = withIdentifiers;
  expect(rules).type.toBe<Rules>();
});
