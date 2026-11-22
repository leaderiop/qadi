/**
 * Pins that the developer-signal table has exactly one row per signal, that only the
 * production-instrumentation row speaks once per process, that `ReporterName` is derived
 * from the table, and that a call site cannot pair a row with an entry point or a reporter
 * slot it lacks.
 *
 * Each signal's console default, its condition, the option a host passes its reporter
 * through and the entry points that resolve it are stated once, in one row, so a signal
 * added without a row, a second latch, a default paired with the wrong option or a reporter
 * of the wrong slot is a compile error instead of a wrong line on a developer's console.
 * Type-level, because a runtime test cannot observe that a table stopped being total
 * (ADR-QD-041, BEH-QD-067).
 */
import { expect, test } from "tstyche";
import type { DehydrationDropReason } from "@qadi/core";
import { reporterFor, SIGNALS } from "../src/DeveloperSignals.ts";
import type {
  HydrationDropReporter,
  ReporterName,
  SignalTable,
  SignalTag,
} from "../src/DeveloperSignals.ts";
import type { DecisionEntry } from "../src/HydrationEvent.ts";

// The tags and option names written out, so a signal or option added later fails these pins
// rather than following the table silently. Each `expect` below compares a subject to one of
// these, never to its own annotation.
type Tags =
  | "SeedSuperseded"
  | "GateIdCollision"
  | "DehydrationDropped"
  | "HydrationDropped"
  | "ReporterThrew"
  | "InstrumentedInProduction"
  | "AtomsReplaced"
  | "UnwritableGateRegistry";

// The table with `AtomsReplaced` left out, and with it speaking once per process.
declare const withoutAtomsReplaced: Omit<typeof SIGNALS, "AtomsReplaced">;
type LatchedTwice = {
  readonly [Tag in SignalTag]: Tag extends "AtomsReplaced"
    ? Omit<(typeof SIGNALS)[Tag], "often"> & { readonly often: "OncePerProcess" }
    : (typeof SIGNALS)[Tag];
};
declare const latchedTwice: LatchedTwice;

/** Takes a table, so a statement passing one is the thing a directive above it refuses. */
const takeTable = (_table: SignalTable): void => undefined;

test("the table has one row per developer signal, written out", () => {
  expect<keyof typeof SIGNALS>().type.toBe<Tags>();
  expect<SignalTag>().type.toBe<Tags>();
});

test("a table missing a row is refused", () => {
  expect<Omit<typeof SIGNALS, "AtomsReplaced">>().type.not.toBeAssignableTo<SignalTable>();
  // @ts-expect-error is not assignable to
  takeTable(withoutAtomsReplaced);
  // The same table with every row is accepted.
  expect<typeof SIGNALS>().type.toBeAssignableTo<SignalTable>();
  takeTable(SIGNALS);
});

test("only InstrumentedInProduction may speak once per process", () => {
  expect<LatchedTwice>().type.not.toBeAssignableTo<SignalTable>();
  // @ts-expect-error is not assignable to
  takeTable(latchedTwice);
  // The real table, where only that row latches, is accepted.
  expect<typeof SIGNALS>().type.toBeAssignableTo<SignalTable>();
  takeTable(SIGNALS);
});

test("ReporterName is every option an entry point reports under, written out", () => {
  expect<ReporterName>().type.toBe<
    "onHydrationMismatch" | "onGateIdCollision" | "onIdCollision" | "onDropped" | "onDeveloperSignal"
  >();
});

const onIdCollision = (_id: string): void => undefined;

test("a row refuses an entry point it does not name", () => {
  // @ts-expect-error is not assignable to
  reporterFor(SIGNALS.GateIdCollision, "dehydrateDecisions", onIdCollision);
  // The entry points the row does name are accepted, and hand back the reporter's own type.
  expect(reporterFor(SIGNALS.GateIdCollision, "makeGateRegistry", onIdCollision)).type.toBe<
    ((id: string) => void) | undefined
  >();
  expect(reporterFor(SIGNALS.GateIdCollision, "makeQadiAtoms", onIdCollision)).type.toBe<
    ((id: string) => void) | undefined
  >();
});

declare const leftOut: HydrationDropReporter<DecisionEntry, DehydrationDropReason>;
declare const dropped: HydrationDropReporter<unknown>;

test("the hydrate row refuses the dehydrate reporter", () => {
  // @ts-expect-error is not assignable to
  reporterFor(SIGNALS.HydrationDropped, "hydrateDecisions", leftOut);
  // Each side's own reporter is accepted for its own row.
  expect(reporterFor(SIGNALS.DehydrationDropped, "dehydrateDecisions", leftOut)).type.toBe<
    HydrationDropReporter<DecisionEntry, DehydrationDropReason> | undefined
  >();
  expect(reporterFor(SIGNALS.HydrationDropped, "hydrateDecisions", dropped)).type.toBe<
    HydrationDropReporter<unknown> | undefined
  >();
});
