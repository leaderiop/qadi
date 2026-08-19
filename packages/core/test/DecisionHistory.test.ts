/**
 * `Evaluate.test.ts` covers `decisionHistoryFromEvents` through full policy
 * evaluation; this is `DecisionHistory`'s own depth, matching
 * `RelationshipResolver.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { DecisionHistory, DecisionHistoryUnknown, decisionHistoryFromEvents } from "../src/DecisionHistory.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";

const query = (
  layer: Layer.Layer<DecisionHistory>,
  event: string,
  resourceId: string | undefined,
  subjectId = "u1",
) =>
  DecisionHistory.hasActed({
    subjectId: makeSubjectId(subjectId),
    event,
    resourceId: resourceId === undefined ? undefined : makeResourceId(resourceId),
  }).pipe(Effect.provide(layer));

describe("DecisionHistory", () => {
  describe("DecisionHistoryUnknown", () => {
    it.effect("says Unknown regardless of what's asked", () =>
      Effect.gen(function* () {
        assert.strictEqual(yield* query(DecisionHistoryUnknown, "raised", "inv-1"), "Unknown");
        assert.strictEqual(yield* query(DecisionHistoryUnknown, "raised", undefined), "Unknown");
      }));
  });

  describe("decisionHistoryFromEvents", () => {
    const history = decisionHistoryFromEvents([
      { subjectId: "alice", event: "raised", resourceId: "inv-1" },
      { subjectId: "bob", event: "approved", resourceId: "inv-2" },
    ]);

    it.effect("Acted for an exact (subject, event, resource) match", () =>
      Effect.gen(function* () {
        assert.strictEqual(yield* query(history, "raised", "inv-1", "alice"), "Acted");
      }));

    it.effect("NotActed — closed world, not Unknown — for anything unlisted", () =>
      Effect.gen(function* () {
        assert.strictEqual(yield* query(history, "raised", "inv-9", "alice"), "NotActed");
        assert.strictEqual(yield* query(history, "approved", "inv-1", "alice"), "NotActed");
        assert.strictEqual(yield* query(history, "raised", "inv-1", "mallory"), "NotActed");
      }));

    it.effect("Acted for 'ever, at all' (resourceId undefined) when any matching event exists", () =>
      Effect.gen(function* () {
        assert.strictEqual(yield* query(history, "raised", undefined, "alice"), "Acted");
        assert.strictEqual(yield* query(history, "approved", undefined, "alice"), "NotActed");
      }));

    it.effect(
      "collision-immune: a subject/event split that would collide under a space-joined key does not",
      () =>
        Effect.gen(function* () {
          // The previous implementation joined `${subjectId} ${event}` /
          // `${subjectId} ${event} ${resourceId}` with a plain space and no
          // escaping — `subjectId="a b", event="c"` and `subjectId="a",
          // event="b c"` both joined to `"a b c"`. HashSet membership over a
          // Data.Class compares subjectId/event/resourceId as independent
          // structural fields, so no character is a delimiter anymore.
          const collidable = decisionHistoryFromEvents([
            { subjectId: "a b", event: "raised", resourceId: "c" },
          ]);
          assert.strictEqual(yield* query(collidable, "b raised", "c", "a"), "NotActed");

          const collidableAnywhere = decisionHistoryFromEvents([
            { subjectId: "a b", event: "raised", resourceId: "c" },
          ]);
          assert.strictEqual(
            yield* query(collidableAnywhere, "b raised", undefined, "a"),
            "NotActed",
          );
        }),
    );
  });
});
