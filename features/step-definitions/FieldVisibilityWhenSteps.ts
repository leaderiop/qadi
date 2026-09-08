import { defineSteps } from "@effect-cucumber/vitest";
import { anyOf, hasPermission, permission } from "@qadi/core";
import { roundTrip, run } from "./Bridge.ts";
import { parsePermissionKey, readState, World } from "./SharedWorld.ts";

/** Field-visibility restriction and union-visibility composition. */
export const fieldVisibilityWhenSteps = defineSteps<World>(({ When }) => {
  When(
    "a policy exposing fields {string} for {string} is evaluated",
    function* (fields: string, key: string) {
      const [resourceName, actionName] = parsePermissionKey(key);
      yield* run(hasPermission(permission(resourceName, actionName), { fields: fields.split(",") }));
    },
  );

  When(
    "a policy exposing fields {string} for {string} and {string} for {string} is evaluated with union visibility",
    function* (fieldsA: string, keyA: string, fieldsB: string, keyB: string) {
      const [ra, aa] = parsePermissionKey(keyA);
      const [rb, ab] = parsePermissionKey(keyB);
      yield* run(
        anyOf(
          [
            hasPermission(permission(ra, aa), { fields: fieldsA.split(",") }),
            hasPermission(permission(rb, ab), { fields: fieldsB.split(",") }),
          ],
          { fieldStrategy: "Union" },
        ),
      );
    },
  );

  When(
    "a policy exposing fields {string} for {string} and {string} for {string} is round-tripped and evaluated with union visibility",
    function* (fieldsA: string, keyA: string, fieldsB: string, keyB: string) {
      const [ra, aa] = parsePermissionKey(keyA);
      const [rb, ab] = parsePermissionKey(keyB);
      const policy = anyOf(
        [
          hasPermission(permission(ra, aa), { fields: fieldsA.split(",") }),
          hasPermission(permission(rb, ab), { fields: fieldsB.split(",") }),
        ],
        { fieldStrategy: "Union" },
      );
      yield* roundTrip(policy);
      const s = yield* readState();
      if (s.restored === undefined) throw new Error("round trip produced nothing");
      yield* run(s.restored);
    },
  );
});
