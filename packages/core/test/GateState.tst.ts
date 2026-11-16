/**
 * Pins the compile-time half of the gate-state vocabulary.
 *
 * `GateState` is the keys of one module-private table, so the union is written
 * out here by hand and the table itself is refused at the import (ADR-QD-162
 * applying ADR-QD-152, ARCH-96).
 */
import { expect, test } from "tstyche";
import { gateStates, isGateState } from "../src/GateState.ts";
import type { GateState } from "../src/GateState.ts";

test("GateState is the five states, written out", () => {
  expect<GateState>().type.toBe<"Failed" | "Denied" | "Rechecking" | "Pending" | "Allowed">();
});

test("isGateState narrows a string to the union", () => {
  expect(isGateState).type.toBe<(word: string) => word is GateState>();
});

test("gateStates is a read-only list of the union", () => {
  expect(gateStates).type.toBe<ReadonlyArray<GateState>>();
});

// The table is module-private: naming it from outside is a compile error.
// @ts-expect-error no exported member
export { GATE_STATE_TABLE } from "../src/GateState.ts";
