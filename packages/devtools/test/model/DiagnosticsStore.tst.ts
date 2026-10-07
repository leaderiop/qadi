/**
 * Pins that a layer's failure never reaches the run's error channel (it is a
 * `WiringRead.Failed` reading instead), and that `WiringRead` narrows by `_tag`.
 */
import type * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import { expect, test } from "tstyche";
import {
  runDiagnostics,
  type DiagnosticsStore,
  type WiringRead,
} from "../../src/model/DiagnosticsStore.ts";
import type { WiringReport } from "../../src/model/Wiring.ts";

declare const store: DiagnosticsStore;
declare class MyError {
  readonly _tag: "MyError";
}
declare class Thing {
  readonly thing: true;
}
declare const wiringRead: WiringRead;
declare const layer: Layer.Layer<Thing, MyError>;

test("a layer's typed failure is not the run's failure", () => {
  expect(runDiagnostics(store, { layer })).type.toBe<Effect.Effect<void, never, never>>();
});

test("a run with no options has nothing to fail with either", () => {
  expect(runDiagnostics(store)).type.toBe<Effect.Effect<void, never, never>>();
});

test("WiringRead narrows by its tag", () => {
  const read = (self: WiringRead) => {
    if (self._tag === "Read") expect(self.report).type.toBe<WiringReport>();
    if (self._tag === "Failed") expect(self.reason).type.toBe<string>();
  };
  expect(read).type.toBeCallableWith(wiringRead);
});
