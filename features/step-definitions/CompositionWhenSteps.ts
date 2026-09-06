import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import { allOf, anyOf } from "@qadi/core";
import { run } from "./Bridge.ts";
import { permissionPolicy } from "./PermissionWhenSteps.ts";
import { World } from "./SharedWorld.ts";

const permissionList = (keys: string): ReadonlyArray<Policy> =>
  keys.split(",").map((k) => permissionPolicy(k.trim()));

/** Boolean composition (`allOf`/`anyOf`) over permission checks. */
export const compositionWhenSteps = defineSteps<World>(({ When }) => {
  When("they must satisfy all of {string}", function* (keys: string) {
    yield* run(allOf(permissionList(keys)));
  });

  When("they must satisfy any of {string}", function* (keys: string) {
    yield* run(anyOf(permissionList(keys)));
  });
});
