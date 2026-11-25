/**
 * Pins the input record each feed compares when it is configured again.
 *
 * A feed holds its inputs as `Required<…>`, every field present and possibly
 * `undefined`, and compares them field by field. Each input type's complete shape is
 * written out here, and so is the return type of the normaliser that builds it, so a
 * field added to an input type fails the golden and the normaliser's declared return
 * type together, and cannot reach a feed without being compared (ADR-QD-192).
 *
 * Each negative is a `@ts-expect-error` checked twice, as in `ExternalStore.tst.ts`:
 * under `pnpm typecheck` an unused directive is TS2578, and under `pnpm test:tstyche`
 * the text after it is a fragment of the one suppressed error's message. Each refused
 * record differs from its accepted twin in one field, the one it leaves out.
 */
import { expect, test } from "tstyche";
import type * as Layer from "effect/Layer";
import type { Catalogue } from "../../src/model/Catalogue.ts";
import type { DiagnosticsOptions, DiagnosticsReading } from "../../src/model/Diagnostics.ts";
import { completeDockInputs, feedInputsOf } from "../../src/model/DockModel.ts";
import type { DockModelInputs } from "../../src/model/DockModel.ts";
import type { EvaluationPortsLayer } from "../../src/model/SimulationInput.ts";
import type { PortCallCollector } from "../../src/model/PortCalls.ts";
import type { Source } from "../../src/model/Source.ts";
import type { AskedQuestionLike, GateRegistryLike } from "../../src/model/Gates.ts";
import { completeDiagnosticsOptions } from "../../src/model/DiagnosticsFeed.ts";
import { completeGatesInputs } from "../../src/model/GatesFeed.ts";
import type { GatesFeedInputs } from "../../src/model/GatesFeed.ts";
import { completeTimelineInputs } from "../../src/model/TimelineFeed.ts";
import type { TimelineFeedInputs } from "../../src/model/TimelineFeed.ts";

type TimelineRecord = {
  readonly capacity: number | undefined;
  readonly source: Source | undefined;
};

type DiagnosticsRecord = {
  readonly layer: Layer.Layer<never, unknown> | undefined;
  readonly collector: PortCallCollector | undefined;
  readonly intervalMillis: number | undefined;
};

type GatesRecord = {
  readonly gates: GateRegistryLike | undefined;
  readonly questions: (() => ReadonlyArray<AskedQuestionLike>) | undefined;
  readonly intervalMillis: number | undefined;
};

test("a timeline feed compares a capacity and a source, each present and possibly undefined", () => {
  expect<Required<TimelineFeedInputs>>().type.toBe<TimelineRecord>();
  expect<ReturnType<typeof completeTimelineInputs>>().type.toBe<TimelineRecord & { readonly capacity: number }>();

  const whole: Required<TimelineFeedInputs> = { capacity: undefined, source: undefined };
  expect(whole).type.toBe<Required<TimelineFeedInputs>>();

  // @ts-expect-error is missing in type
  const missing: Required<TimelineFeedInputs> = { capacity: undefined };
  expect(missing).type.toBe<Required<TimelineFeedInputs>>();
});

test("a diagnostics feed compares a layer, a collector and an interval, each present and possibly undefined", () => {
  expect<Required<DiagnosticsOptions>>().type.toBe<DiagnosticsRecord>();
  expect<ReturnType<typeof completeDiagnosticsOptions>>().type.toBe<DiagnosticsRecord>();

  const whole: Required<DiagnosticsOptions> = { layer: undefined, collector: undefined, intervalMillis: undefined };
  expect(whole).type.toBe<Required<DiagnosticsOptions>>();

  // @ts-expect-error is missing in type
  const missing: Required<DiagnosticsOptions> = { layer: undefined, collector: undefined };
  expect(missing).type.toBe<Required<DiagnosticsOptions>>();
});

test("a gates feed compares a registry, a thunk and an interval, each present and possibly undefined", () => {
  expect<Required<GatesFeedInputs>>().type.toBe<GatesRecord>();
  expect<ReturnType<typeof completeGatesInputs>>().type.toBe<GatesRecord>();

  const whole: Required<GatesFeedInputs> = { gates: undefined, questions: undefined, intervalMillis: undefined };
  expect(whole).type.toBe<Required<GatesFeedInputs>>();

  // @ts-expect-error is missing in type
  const missing: Required<GatesFeedInputs> = { gates: undefined, questions: undefined };
  expect(missing).type.toBe<Required<GatesFeedInputs>>();
});

type DockRecord = {
  readonly capacity: number | undefined;
  readonly catalogue: Catalogue | undefined;
  readonly diagnostics: DiagnosticsOptions | undefined;
  readonly gates: GateRegistryLike | undefined;
  readonly questions: (() => ReadonlyArray<AskedQuestionLike>) | undefined;
  readonly reading: DiagnosticsReading | undefined;
  readonly ports: EvaluationPortsLayer | undefined;
  readonly source: Source | undefined;
};

test("a dock model compares eight inputs, each present and possibly undefined, and maps them onto its three feeds", () => {
  expect<Required<DockModelInputs>>().type.toBe<DockRecord>();
  expect<ReturnType<typeof completeDockInputs>>().type.toBe<DockRecord>();
  expect<ReturnType<typeof feedInputsOf>>().type.toBe<{
    readonly timeline: Required<TimelineFeedInputs>;
    readonly gates: Required<GatesFeedInputs>;
    readonly diagnostics: DiagnosticsOptions | undefined;
  }>();

  const whole: Required<DockModelInputs> = {
    capacity: undefined,
    catalogue: undefined,
    diagnostics: undefined,
    gates: undefined,
    questions: undefined,
    reading: undefined,
    ports: undefined,
    source: undefined,
  };
  expect(whole).type.toBe<Required<DockModelInputs>>();

  // @ts-expect-error is missing in type
  const missing: Required<DockModelInputs> = {
    capacity: undefined,
    catalogue: undefined,
    diagnostics: undefined,
    gates: undefined,
    questions: undefined,
    reading: undefined,
    ports: undefined,
  };
  expect(missing).type.toBe<Required<DockModelInputs>>();
});
