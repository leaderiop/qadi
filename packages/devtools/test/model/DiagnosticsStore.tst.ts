/**
 * Pins that a layer's failure never reaches the run's error channel (it is a
 * `WiringRead.Failed` reading instead), and that `WiringRead` narrows by `_tag`.
 */
import type * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import type * as Schedule from "effect/Schedule";
import { expect, test } from "tstyche";
import {
  mergeReading,
  runDiagnostics,
  type Diagnostics,
  type DiagnosticsOptions,
  type DiagnosticsReading,
  type DiagnosticsStore,
  type WiringRead,
} from "../../src/model/DiagnosticsStore.ts";
import type { HydrationActivity } from "../../src/model/Hydration.ts";
import type { WiringReport } from "../../src/model/Wiring.ts";

declare const store: DiagnosticsStore;
declare class MyError {
  readonly _tag: "MyError";
}
declare class Thing {
  readonly thing: true;
}
declare class Other {
  readonly other: true;
}
declare const wiringRead: WiringRead;
declare const layer: Layer.Layer<Thing, MyError>;
declare const spaced: Schedule.Schedule<unknown>;
declare const needs: Layer.Layer<Thing, never, Other>;

test("a layer's typed failure is not the run's failure", () => {
  expect(runDiagnostics(store, { layer })).type.toBe<Effect.Effect<void, never, never>>();
});

test("a run with no options has nothing to fail with either", () => {
  expect(runDiagnostics(store)).type.toBe<Effect.Effect<void, never, never>>();
});

test("the poll takes no questions thunk: the gates feed reads it", () => {
  expect(runDiagnostics).type.not.toBeCallableWith(store, { questions: () => [] });
  expect<DiagnosticsOptions>().type.not.toHaveProperty("questions");
});

test("the poll takes an interval, not a schedule", () => {
  expect(runDiagnostics).type.not.toBeCallableWith(store, { schedule: spaced });
  expect(runDiagnostics(store, { intervalMillis: 500 })).type.toBe<
    Effect.Effect<void, never, never>
  >();
});

test("a layer whose requirement is unmet is refused", () => {
  expect(runDiagnostics).type.not.toBeCallableWith(store, { layer: needs });
});

// Both arities: a reintroduced one-parameter generic fails the first line, a two-parameter one the second.
// @ts-expect-error not generic
export type NotGenericOne = DiagnosticsOptions<never>;
// @ts-expect-error not generic
export type NotGenericTwo = DiagnosticsOptions<never, never>;

test("WiringRead narrows by its tag", () => {
  const read = (self: WiringRead) => {
    if (self._tag === "Read") expect(self.report).type.toBe<WiringReport>();
    if (self._tag === "Failed") expect(self.reason).type.toBe<string>();
  };
  expect(read).type.toBeCallableWith(wiringRead);
});

test("a supplied reading is present or absent, never an explicit undefined", () => {
  expect<DiagnosticsReading>().type.toBeAssignableFrom<{ readonly hydration: HydrationActivity }>();
  expect<DiagnosticsReading>().type.not.toBeAssignableFrom<{ readonly hydration: undefined }>();
  expect<DiagnosticsReading>().type.toBeAssignableFrom<{}>();
});

test("a supplied wiring is a WiringRead, so it can state a failed read", () => {
  expect<NonNullable<DiagnosticsReading["wiring"]>>().type.toBe<WiringRead>();
});

test("mergeReading returns a full Diagnostics", () => {
  expect(mergeReading).type.toBe<
    (sampled: Diagnostics, supplied: DiagnosticsReading | undefined) => Diagnostics
  >();
});
