/**
 * Pins the constraint `useConfigured` asks of the value it builds.
 *
 * The refusal is a `@ts-expect-error` checked twice, as in `ConfigureInputs.tst.ts`: under
 * `pnpm typecheck` an unused directive is TS2578, and under `pnpm test:tstyche` the text
 * after it is a fragment of the one suppressed error's message. The accepted twin differs
 * from the refused call only in having `configure`.
 */
import { expect, test } from "tstyche";
import * as Effect from "effect/Effect";
import { makeDiagnosticsFeed } from "../../src/model/DiagnosticsFeed.ts";
import type { DiagnosticsFeed, DiagnosticsSnapshot } from "../../src/model/DiagnosticsFeed.ts";
import type { DiagnosticsOptions } from "../../src/model/Diagnostics.ts";
import type { DockModel, DockModelInputs } from "../../src/model/DockModel.ts";
import type { Source } from "../../src/model/Source.ts";
import { makeTimelineFeed } from "../../src/model/TimelineFeed.ts";
import type { TimelineFeed, TimelineFeedInputs } from "../../src/model/TimelineFeed.ts";
import type { Configurable } from "../../src/react/useConfigured.ts";
import { useConfigured } from "../../src/react/useConfigured.ts";
import { useDiagnostics } from "../../src/react/useDiagnostics.ts";
import { useDockModel } from "../../src/react/useDockModel.ts";
import { useTimeline, type UseTimeline } from "../../src/react/useTimeline.ts";

test("the three values each have configure over their own inputs", () => {
  expect<DockModel>().type.toBeAssignableTo<Configurable<DockModelInputs>>();
  expect<TimelineFeed>().type.toBeAssignableTo<Configurable<TimelineFeedInputs>>();
  expect<DiagnosticsFeed>().type.toBeAssignableTo<Configurable<DiagnosticsOptions | undefined>>();
});

test("the three hooks keep their return types", () => {
  expect<ReturnType<typeof useDockModel>>().type.toBe<DockModel | undefined>();
  expect<ReturnType<typeof useTimeline>>().type.toBe<UseTimeline>();
  expect<ReturnType<typeof useDiagnostics>>().type.toBe<DiagnosticsSnapshot>();
});

declare const timelineSource: Source;

declare const configurable: { x: number; configure: (inputs: number) => void };

test("a value with no configure is refused, and its twin with configure is accepted", () => {
  // @ts-expect-error Property 'configure' is missing in type
  useConfigured(() => Effect.succeed({ x: 1 }), 1);

  expect(useConfigured(() => Effect.succeed(configurable), 1)).type.toBe<typeof configurable | undefined>();
});

test("a build handed another value's inputs is refused, and its twin with its own inputs is accepted", () => {
  // @ts-expect-error has no properties in common with type 'DiagnosticsOptions'
  useConfigured(makeDiagnosticsFeed, { source: timelineSource, capacity: 1 });

  expect(useConfigured(makeDiagnosticsFeed, undefined)).type.toBe<DiagnosticsFeed | undefined>();
});

test("a build handed a source that is not a source is refused, and its twin with a source is accepted", () => {
  // @ts-expect-error Type 'number' is not assignable to type 'Source'
  useConfigured(makeTimelineFeed, { source: 1 });

  expect(useConfigured(makeTimelineFeed, { source: timelineSource })).type.toBe<TimelineFeed | undefined>();
});
