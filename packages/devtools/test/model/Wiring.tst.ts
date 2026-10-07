/**
 * Pins that the wiring report's rows are the registry's ports plus the four
 * services that are not ports (ARCH-21): a closed union, not a `string`.
 */
import type { PortName } from "@qadi/core";
import { expect, test } from "tstyche";
import type { PortReport, WiredServiceName } from "../../src/model/Wiring.ts";

test("a row is a port of the registry or one of the four services that are not", () => {
  expect<PortReport["port"]>().type.toBe<WiredServiceName>();
  expect<PortName>().type.toBeAssignableTo<PortReport["port"]>();
  expect<WiredServiceName>().type.toBe<
    PortName | "EvaluationId" | "CurrentSubject" | "DecisionCache" | "DecisionSink"
  >();
});

test("defaulted says nothing when there is nothing to say", () => {
  expect<PortReport["defaulted"]>().type.toBe<boolean | undefined>();
});
