/**
 * Type-level tests for the audit sink's layer: its one error is `InvalidAuditSinkOption`.
 *
 * The layer's error channel was `never` before ARCH-92; a bad option now fails the layer, which is
 * the phase's one public break (ADR-QD-158). The class's fields are pinned here too, because
 * `option` is a closed union and `received` is the raw input, not a decoded duration.
 */
import { expect, test } from "tstyche";
import type * as Duration from "effect/Duration";
import type * as Layer from "effect/Layer";
import type { DecisionSink } from "@qadi/core";
import type { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import type { AuditTrailPort } from "../src/AuditTrailPort.ts";
import type { InvalidAuditSinkOption } from "../src/InvalidAuditSinkOption.ts";

test("the layer fails only with InvalidAuditSinkOption", () => {
  expect<ReturnType<typeof AuditDecisionSinkLive>>().type.toBe<
    Layer.Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>
  >();
});

test("option is the closed union of the three options", () => {
  expect<InvalidAuditSinkOption["option"]>().type.toBe<"failureThreshold" | "resetTimeoutMs" | "storeCallTimeout">();
});

test("received is the raw Duration.Input and the tag is unprefixed", () => {
  expect<InvalidAuditSinkOption["received"]>().type.toBe<Duration.Input>();
  expect<InvalidAuditSinkOption["_tag"]>().type.toBe<"InvalidAuditSinkOption">();
});
