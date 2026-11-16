/**
 * Pins `isPortDefault`'s signature (ARCH-94): any port's description, any service value, a
 * boolean back, and a name that is not a port refused. No deliberate compile error lives here,
 * because `tsconfig.test.json` also compiles every `*.tst.ts`.
 */
import { expect, test } from "tstyche";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { isPortDefault } from "../src/PortDescription.ts";
import { forEveryPort } from "../src/Ports.ts";

test("isPortDefault takes any port's description and any service value, and answers a boolean", () => {
  expect(isPortDefault).type.toBeCallableWith(attributeResolverPort, { name: "x" });
  expect(isPortDefault).type.toBeCallableWith(attributeResolverPort, undefined);
  expect(isPortDefault(attributeResolverPort, {})).type.toBe<boolean>();
  forEveryPort((d) => expect(isPortDefault).type.toBeCallableWith(d, d.none));
});

test("a name that is not a port is refused", () => {
  expect(isPortDefault).type.not.toBeCallableWith({ port: "Nope" }, {});
});
