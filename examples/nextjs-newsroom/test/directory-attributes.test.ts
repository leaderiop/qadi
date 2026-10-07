// @vitest-environment node
/**
 * The newsroom directory resolves only the attributes a subject owns (ARCH-31 T1, C13).
 * A prototype key such as `constructor` or `__proto__` is not an attribute.
 */
import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import { AttributeResolver, makeSubjectId } from "@qadi/core";
import { ports } from "../src/server/ports.ts";

const resolve = (attribute: string) =>
  Effect.runPromise(
    AttributeResolver.resolve(makeSubjectId("nadia"), attribute).pipe(Effect.provide(ports)),
  );

describe("the newsroom directory", () => {
  for (const key of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
    it(`does not resolve the prototype key ${key}`, async () => {
      expect(await resolve(key)).toBeUndefined();
    });
  }
});
