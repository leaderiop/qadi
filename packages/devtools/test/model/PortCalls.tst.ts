/**
 * Pins that the port-call collector names exactly the ports `@qadi/core`'s
 * registry does (ARCH-10): a sixth port added to the registry without a row
 * decoder here fails this, rather than producing calls the panel cannot show.
 */
import type { PortName } from "@qadi/core";
import { expect, test } from "tstyche";
import type { PortCallPort } from "../../src/model/PortCalls.ts";

test("the collector's ports are the registry's ports", () => {
  expect<PortCallPort>().type.toBe<PortName>();
});
