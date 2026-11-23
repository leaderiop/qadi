/**
 * The seeded choice's types: the arms `HeldChoice` gives `PolicyChoice`, the menu's
 * shape and the transitions' answers.
 */
import { expect, test } from "tstyche";
import type { Policy } from "@qadi/core";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import type { HeldChoice } from "../../src/model/HeldChoice.ts";
import type { UnseededField } from "../../src/model/Replay.ts";
import {
  choose,
  seedFrom,
  seededChoice,
  withSightings,
} from "../../src/model/SeededChoice.ts";
import type {
  PolicyChoice,
  PolicyMenu,
  PolicyMenuOption,
  SeededChoice,
  Seeding,
} from "../../src/model/SeededChoice.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import type {
  PolicyChoice as BarrelPolicyChoice,
  PolicyMenu as BarrelPolicyMenu,
  PolicyMenuOption as BarrelPolicyMenuOption,
} from "../../src/index.ts";

test("the first three arms of PolicyChoice are HeldChoice of PolicySighting", () => {
  expect<Exclude<PolicyChoice, { readonly _tag: "Seeded" }>>().type.toBe<
    HeldChoice<PolicySighting>
  >();
});

test("the Seeded arm carries the row, its policy and the unseeded fields", () => {
  expect<Extract<PolicyChoice, { readonly _tag: "Seeded" }>>().type.toBe<{
    readonly _tag: "Seeded";
    readonly entry: TimelineEntry;
    readonly policy: Policy;
    readonly unseeded: ReadonlyArray<UnseededField>;
  }>();
});

test(
  "a menu option is a value and a label, and a menu its options and selected value",
  () => {
    expect<PolicyMenuOption>().type.toBe<{
      readonly value: string;
      readonly label: string;
    }>();
    expect<PolicyMenu>().type.toBe<{
      readonly options: ReadonlyArray<PolicyMenuOption>;
      readonly selected: string;
    }>();
  },
);

test(
  "choose and withSightings answer a SeededChoice; seededChoice and seedFrom a Seeding",
  () => {
    expect(choose).type.toBe<(choice: SeededChoice, policy: Policy) => SeededChoice>();
    expect(withSightings).type.toBe<
      (choice: SeededChoice, sightings: ReadonlyArray<PolicySighting>) => SeededChoice
    >();
    expect(seedFrom).type.toBe<
      (choice: SeededChoice, entry: TimelineEntry | undefined) => Seeding
    >();
    expect(seededChoice).type.toBe<
      (sightings: ReadonlyArray<PolicySighting>, seed?: TimelineEntry) => Seeding
    >();
  },
);

test("the barrel names the three types from the seeded choice module", () => {
  expect<BarrelPolicyChoice>().type.toBe<PolicyChoice>();
  expect<BarrelPolicyMenu>().type.toBe<PolicyMenu>();
  expect<BarrelPolicyMenuOption>().type.toBe<PolicyMenuOption>();
});
