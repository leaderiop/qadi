/**
 * An attribute resolver that records what it was asked for.
 *
 * Lets a test assert not just the decision but the work done to reach it —
 * which is how short-circuiting is verified.
 *
 * **Subject-blind on purpose, and therefore not a fixture for subject sets.**
 * One flat table answers every subject, which is exactly the resolver shape
 * INV-QD-016 warns about: harmless while an environment names one subject,
 * a cross-subject leak the moment a batch runs over it. Tests that care wire
 * their own keyed resolver.
 */
import { AttributeResolver } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const recordingAttributeResolver = (
  table: Readonly<Record<string, unknown>> = {},
): {
  readonly layer: Layer.Layer<AttributeResolver>;
  readonly calls: ReadonlyArray<string>;
} => {
  const calls: Array<string> = [];
  return {
    calls,
    layer: Layer.succeed(AttributeResolver, {
      resolve: (_subjectId, attribute) =>
        Effect.sync(() => {
          calls.push(attribute);
          return table[attribute];
        }),
    }),
  };
};
