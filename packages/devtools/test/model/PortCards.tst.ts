/**
 * Pins that a misspelt port is a compile error in every record the port cards read (CARD-03).
 *
 * ADR-QD-168 keys every reading by `PortName`, so no port is compared as a string. These
 * pins are its two compile errors: a `PortActivity` whose `port` is not a registry port,
 * and an activity or calls record whose keys are not exactly the registry's.
 */
import type { PortName } from "@qadi/core";
import { expect, test } from "tstyche";
import { isPortName } from "../../src/model/PortCards.ts";
import type { ActivityByPort, CallsByPort, PortCardRow } from "../../src/model/PortCards.ts";
import type { PortActivity, WiredServiceName } from "../../src/model/Wiring.ts";

test("a port's activity is keyed by the registry's PortName, not a string", () => {
  expect<PortActivity["port"]>().type.toBe<PortName>();
  expect<PortActivity>().type.not.toBeAssignableFrom<{
    readonly port: "AttributeResolvr";
    readonly calls: number;
    readonly retries: number;
    readonly timeouts: number;
    readonly translationCalls: number;
  }>();
  expect<PortActivity>().type.not.toBeAssignableFrom<{
    readonly port: string;
    readonly calls: number;
    readonly retries: number;
    readonly timeouts: number;
    readonly translationCalls: number;
  }>();
});

test("the per-port records have exactly the registry's keys, all required", () => {
  // The key set is exact: a misspelt extra key makes `keyof` differ from `PortName`.
  expect<keyof ActivityByPort>().type.toBe<PortName>();
  expect<keyof CallsByPort>().type.toBe<PortName>();
  // A misspelt key is not readable.
  expect<ActivityByPort>().type.not.toHaveProperty("AttributeResolvr");
  expect<CallsByPort>().type.not.toHaveProperty("SignatureHistry");
  // Every port is present: none is optional.
  expect<ActivityByPort>().type.not.toBeAssignableFrom<Partial<ActivityByPort>>();
  expect<CallsByPort>().type.not.toBeAssignableFrom<Partial<CallsByPort>>();
});

test("a card row is keyed by every wired service, and the guard narrows to a port", () => {
  expect<PortCardRow["port"]>().type.toBe<WiredServiceName>();
  expect(isPortName).type.toBe<(name: WiredServiceName) => name is PortName>();
});
