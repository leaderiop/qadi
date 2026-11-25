/**
 * Pins that the hydration view's two unions are closed and its input has no optional field.
 *
 * A fourth tag on either union is a compile error at every exhaustive match over it, so the
 * panel cannot render a view it was not written for. The refusals are `@ts-expect-error`
 * lines, checked twice as in `useConfigured.tst.ts`: under `pnpm typecheck` an unused
 * directive is TS2578, and under `pnpm test:tstyche` the text after it is a fragment of the
 * one suppressed error's message. Each has an accepted twin that differs only in the tag.
 */
import { expect, test } from "tstyche";
import type { HydrationActivity } from "../../src/model/Hydration.ts";
import { HydrationDropsView, HydrationView } from "../../src/model/HydrationView.ts";
import type { HydrationInput } from "../../src/model/HydrationView.ts";

type CountsView = Extract<HydrationView, { readonly _tag: "Counts" }>;

test("the view is exactly pending, unwired or counts", () => {
  expect<HydrationView["_tag"]>().type.toBe<"Pending" | "Unwired" | "Counts">();
  // @ts-expect-error Property 'Hidden' does not exist on type
  HydrationView.Hidden();

  expect(HydrationView.Pending()._tag).type.toBe<"Pending">();
});

test("the drops view is exactly none or raised", () => {
  expect<HydrationDropsView["_tag"]>().type.toBe<"None" | "Raised">();
  // @ts-expect-error Property 'Some' does not exist on type
  HydrationDropsView.Some({ text: "x" });

  expect(HydrationDropsView.None({ text: "x" })._tag).type.toBe<"None">();
});

test("the counts arm states its numbers, its rate, its drops and its scope", () => {
  expect<CountsView["dehydrated"]>().type.toBe<number>();
  expect<CountsView["seeded"]>().type.toBe<number>();
  expect<CountsView["rechecked"]>().type.toBe<number>();
  expect<CountsView["mismatched"]>().type.toBe<number>();
  expect<CountsView["rate"]>().type.toBe<string | undefined>();
  expect<CountsView["drops"]>().type.toBe<HydrationDropsView>();
  expect<CountsView["scope"]>().type.toBe<string>();
});

test("the input states both fields, so a missing one is not assumed absent", () => {
  expect<HydrationInput["hydration"]>().type.toBe<HydrationActivity | undefined>();
  expect<HydrationInput["unsampled"]>().type.toBe<boolean>();
  expect<HydrationInput>().type.not.toBeAssignableFrom<{ readonly unsampled: boolean }>();
  expect<HydrationInput>().type.not.toBeAssignableFrom<{
    readonly hydration: HydrationActivity | undefined;
  }>();

  expect<HydrationInput>().type.toBeAssignableFrom<{
    readonly hydration: HydrationActivity | undefined;
    readonly unsampled: boolean;
  }>();
});
