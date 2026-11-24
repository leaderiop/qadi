/**
 * Pins what the provider's context value carries, at the type level.
 *
 * Whether a guard registers is decided by the writer the provider resolves once from
 * its `instrument` prop, and the writer stays off the context on purpose
 * (ADR-QD-111). A runtime test can show today's value is right; only the compiler can
 * show a field nobody meant to publish cannot be added unnoticed.
 */
import { expect, test } from "tstyche";
import type { QadiContextValue } from "../src/QadiProvider.tsx";
import type { GateRegistry } from "../src/GateRegistry.ts";

test("the context value is the atoms, the registry and the gates", () => {
  expect<keyof QadiContextValue>().type.toBe<"atoms" | "registry" | "gates">();
});

declare const value: QadiContextValue;

test("a consumer reads the gates from the context, and instrumentation is not a field of it", () => {
  expect(value.gates).type.toBe<GateRegistry>();
  // Instrumentation is the provider's prop, not a context field.
  // @ts-expect-error does not exist
  expect(String(value.instrument)).type.toBe<string>();
});
