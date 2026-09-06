import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import { hasPermission, permission } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

/** Parses a `"resource:action"` key into a permission policy. */
export const permissionPolicy = (key: string): Policy => {
  const [resource, action] = key.split(":");
  if (resource === undefined || action === undefined) {
    throw new Error(`malformed permission key: ${key}`);
  }
  return hasPermission(permission(resource, action));
};

export const permissionWhenSteps = defineSteps<World>(({ When }) => {
  When("they request permission {string}", function* (key: string) {
    yield* run(permissionPolicy(key));
  });
});
