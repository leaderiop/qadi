/**
 * `TestLayerOptions` has one way to set up each port: `ports.<Port>` is either
 * `{ answers }` (the port's fixture data) or `{ layer }` (a layer of the port's
 * service), never both and never the removed top-level data options.
 *
 * Pinned as types because the runtime has nothing to test: under the old shape
 * an `attributes` option and an `AttributeResolver` layer could both be given
 * and a precedence rule chose between them; here that case cannot be written.
 */
import { expect, test } from "tstyche";
import * as Layer from "effect/Layer";
import type { AttributeResolver } from "@qadi/core";
import type { TestLayerOptions } from "../src/QadiReviewLayer.ts";

declare const attributeResolver: Layer.Layer<AttributeResolver>;

test("a port is set up with its fixture answers", () => {
  expect<TestLayerOptions>().type.toBeAssignableFrom({
    ports: { CustomPredicate: { answers: { isOwner: true } } },
  });
  expect<TestLayerOptions>().type.toBeAssignableFrom({
    ports: { AttributeResolver: { answers: { tier: 5 } } },
  });
});

test("a port is set up with a layer of its own service", () => {
  expect<TestLayerOptions>().type.toBeAssignableFrom({
    ports: { AttributeResolver: { layer: attributeResolver } },
  });
});

test("answers and a layer for one port is rejected", () => {
  expect<TestLayerOptions>().type.not.toBeAssignableFrom({
    ports: { AttributeResolver: { answers: {}, layer: attributeResolver } },
  });
});

test("a layer of another port's service is rejected", () => {
  expect<TestLayerOptions>().type.not.toBeAssignableFrom({
    ports: { CustomPredicate: { layer: attributeResolver } },
  });
});

test("answers of the wrong shape for the port are rejected", () => {
  expect<TestLayerOptions>().type.not.toBeAssignableFrom({
    ports: { CustomPredicate: { answers: { isOwner: "yes" } } },
  });
});

test("the removed top-level data options are rejected", () => {
  expect<TestLayerOptions>().type.not.toBeAssignableFrom({ attributes: { tier: 5 } });
  expect<TestLayerOptions>().type.not.toBeAssignableFrom({ relationships: [] });
  expect<TestLayerOptions>().type.not.toBeAssignableFrom({ history: [] });
  expect<TestLayerOptions>().type.not.toBeAssignableFrom({ signatures: [] });
});
