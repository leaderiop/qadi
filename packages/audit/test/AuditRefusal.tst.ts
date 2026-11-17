/**
 * Pins that audit's refusal is core's `SinkRecordNotEncodable` wherever audit hands one over.
 *
 * Audit used to declare its own copy of core's error plus a `reason` field holding a sentence core
 * already computes (ARCH-95). A caller wiring forwarding, http and audit would then handle two
 * refusal types for one failure; now there is one. The four places a refusal leaves audit are
 * pinned: both `onRefused` hooks, the `Refused` outcome and `encodeAuditEntry`'s error channel.
 * No deliberate compile error lives here, because `tsconfig.test.json` also compiles every `*.tst.ts`.
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type { SinkRecordNotEncodable } from "@qadi/core";
import type { AuditDecisionSinkOptions } from "../src/AuditDecisionSinkLive.ts";
import type { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditWriteOutcome } from "../src/AuditWriteOutcome.ts";
import type { AuditWriteEmitOptions } from "../src/AuditWriteReport.ts";

test("onRefused takes core's SinkRecordNotEncodable", () => {
  expect<Parameters<NonNullable<AuditDecisionSinkOptions["onRefused"]>>[0]>().type.toBe<SinkRecordNotEncodable>();
});

test("the emit options' onRefused takes it too", () => {
  expect<Parameters<NonNullable<AuditWriteEmitOptions["onRefused"]>>[0]>().type.toBe<SinkRecordNotEncodable>();
});

test("Refused carries it", () => {
  expect<Extract<AuditWriteOutcome, { readonly _tag: "Refused" }>["refusal"]>().type.toBe<SinkRecordNotEncodable>();
});

test("encodeAuditEntry fails with it", () => {
  expect<Effect.Error<ReturnType<typeof encodeAuditEntry>>>().type.toBe<SinkRecordNotEncodable>();
});
