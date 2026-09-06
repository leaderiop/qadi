/**
 * A `CustomPredicate` registry that records which names it was asked to
 * evaluate.
 *
 * Mirrors `recordingAttributeResolver`: lets a test assert not just the
 * decision but whether a given `hasCustom` node was actually reached, which
 * is how short-circuiting is verified for this node the same way it is for
 * an attribute.
 *
 * A name absent from `table` **fails**, mirroring core's
 * `customPredicateFromRecord`: a populated table missing one entry is a
 * wiring mistake (most likely a typo in `hasCustom`'s `name`), not a
 * legitimate denial. Denying every name unconditionally remains
 * `CustomPredicateNone`'s job.
 */
import { CustomPredicate, CustomPredicateError } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { makeCallRecorder } from "./CallRecorder.ts";

export const recordingCustomPredicate = (
  table: Readonly<Record<string, boolean>> = {},
): {
  readonly layer: Layer.Layer<CustomPredicate>;
  readonly calls: ReadonlyArray<string>;
} => {
  const recorder = makeCallRecorder();
  return {
    get calls() {
      return recorder.calls;
    },
    layer: Layer.succeed(CustomPredicate, {
      evaluate: (name) =>
        Effect.sync(() => {
          recorder.record(name);
          return table[name];
        }).pipe(
          Effect.flatMap((value) =>
            value === undefined
              ? Effect.fail(
                  new CustomPredicateError({
                    name,
                    reason: "no predicate is registered under this name",
                  }),
                )
              : Effect.succeed(value),
          ),
        ),
    }),
  };
};
