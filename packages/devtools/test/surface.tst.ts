/**
 * The types of `@qadi/devtools`' interface (ARCH-40, ADR-QD-047's amendment).
 *
 * Every public type is importable from its entry point (the re-export below
 * fails to compile for a name that is not there), and a representative private
 * name from each private module is refused, since out of the barrel means not
 * importable (ADR-QD-099). The values are pinned by `surface.test.ts`.
 */
import type * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import { expect, test } from "tstyche";
import {
  makeDiagnosticsFeed,
  makeGatesFeed,
  makeTimelineFeed,
  type AskedQuestionLike,
  type DiagnosticsFeed,
  type DiagnosticsOptions,
  type DiagnosticsReadout,
  type GateInstanceLike,
  type GateRegistryLike,
  type GatesFeed,
  type GatesSnapshot,
  type PortCallCollector,
  type TimelineFeed,
  type TimelineStatusReadout,
  type TimelineStore,
} from "../src/index.ts";
import type {
  AskedQuestionLike as ReactAskedQuestionLike,
  DevtoolsDockProps,
  DiagnosticsOptions as ReactDiagnosticsOptions,
} from "../src/react/index.ts";

export type {
  ActedCall,
  Answer,
  AskedQuestionLike,
  AskedRead,
  AttributeCall,
  Baseline,
  BaselineCaveat,
  BaselineReading,
  BecameError,
  CacheReport,
  CapturedAnswers,
  Catalogue,
  ChipAdded,
  ChipView,
  Compared,
  Comparison,
  Counts,
  CustomPredicateCall,
  DecisionEventSource,
  Diagnostics,
  DiagnosticsFeed,
  DiagnosticsOptions,
  DiagnosticsReading,
  DiagnosticsReadout,
  DiagnosticsSnapshot,
  DiagnosticsStatus,
  EditDirection,
  EditKind,
  EvaluationPorts,
  EvaluationPortsLayer,
  FieldView,
  Filters,
  GateInstanceLike,
  GateRegistryLike,
  GatesFeed,
  GatesFeedInputs,
  GatesSnapshot,
  HeldChoice,
  HydrationActivity,
  HydrationDrops,
  InspectKind,
  InspectNode,
  NodeStatus,
  ObligationState,
  PairRole,
  PairedEntry,
  PolicyChoice,
  PolicyMenu,
  PolicyMenuOption,
  PolicySighting,
  PortActivity,
  PortCall,
  PortCallCollector,
  PortCallInterpreter,
  PortCallLog,
  PortCallOf,
  PortCallPort,
  PortReport,
  RecordOutcome,
  Recovered,
  RegistryRead,
  RelationshipCall,
  ResourceText,
  RunKind,
  RunState,
  Selection,
  SignatureHistoryCall,
  SimulatedSubject,
  SimulationEdit,
  SimulationField,
  SimulationInput,
  SimulationQuestion,
  SimulationSession,
  SimulationSessionInit,
  SimulationSnapshot,
  SkippedRemedy,
  Source,
  SourceChoice,
  SourceOption,
  SourceRead,
  SourceRefusal,
  StillFailed,
  SweepCost,
  SweepPlan,
  Timeline,
  TimelineEntry,
  TimelineFeed,
  TimelineFeedInputs,
  TimelineStatus,
  TimelineStatusReadout,
  TimelineStore,
  UnseededField,
  Verdict,
  WhatIfReport,
  WhatIfRow,
  WiredServiceName,
  WiringRead,
  WiringReport,
} from "../src/index.ts";

// The root now exports four of these names too; aliasing keeps both lists in one module.
export type {
  DevtoolsDockProps,
  DiagnosticsOptions as ReactDiagnosticsOptions,
  DiagnosticsSnapshot as ReactDiagnosticsSnapshot,
  DiagnosticsStatus as ReactDiagnosticsStatus,
  SimulationSessionView,
  TimelineStatus as ReactTimelineStatus,
  UseSimulationSessionInput,
  UseTimeline,
} from "../src/react/index.ts";

// Representative private names, one or more per private module. Each import
// below must fail.
// The drop word was core's `DecodeRefusal` all along (ADR-QD-153): not an export of this package.
// @ts-expect-error no exported member
export type { MalformedReason } from "../src/index.ts";

// @ts-expect-error no exported member
export { whatIf } from "../src/index.ts";

// @ts-expect-error no exported member
export { sweepPlan } from "../src/index.ts";

// @ts-expect-error no exported member
export { edgeCodec } from "../src/index.ts";

// @ts-expect-error no exported member
export { capturing } from "../src/index.ts";

// @ts-expect-error no exported member
export { roleSummary } from "../src/index.ts";

// @ts-expect-error no exported member
export { gateGroups } from "../src/index.ts";

// @ts-expect-error no exported member
export { joinQuestions } from "../src/index.ts";

// @ts-expect-error no exported member
export { simulate } from "../src/index.ts";

// @ts-expect-error no exported member
export { fixtures } from "../src/index.ts";

// @ts-expect-error no exported member
export { remedyEdits } from "../src/index.ts";

// @ts-expect-error no exported member
export { singleEdits } from "../src/index.ts";

// @ts-expect-error no exported member
export { replayInput } from "../src/index.ts";

// @ts-expect-error no exported member
export { policyLabel } from "../src/index.ts";

// @ts-expect-error no exported member
export { prepareSource } from "../src/index.ts";

// @ts-expect-error no exported member
export { applyEdits } from "../src/index.ts";

// @ts-expect-error no exported member
export { subjectOf } from "../src/index.ts";

// The field table and what is derived from it are package-private (ARCH-61,
// porting lost ARCH-48 `950977f`); only the types the session's interface names
// are exported.
// @ts-expect-error no exported member
export { SIMULATION_FIELDS } from "../src/index.ts";

// @ts-expect-error no exported member
export { fieldOps } from "../src/index.ts";

// @ts-expect-error no exported member
export { formOf } from "../src/index.ts";

// `RecordOutcome` and `ObligationState` are public types; the read that builds them is not.
// @ts-expect-error no exported member
export { readOutcome } from "../src/index.ts";

// @ts-expect-error no exported member
export { FIELD_ORDER } from "../src/index.ts";

// @ts-expect-error no exported member
export { FIXTURE_DATA } from "../src/index.ts";

// @ts-expect-error no exported member
export { Simulator } from "../src/react/index.ts";

// @ts-expect-error no exported member
export { PolicyTree } from "../src/react/index.ts";

// @ts-expect-error no exported member
export { drawLens } from "../src/react/index.ts";

// The stores' runners and the feeds' private readouts are package-private (ADR-QD-173):
// a host builds a feed, it does not run a store.

// @ts-expect-error no exported member
export { makeTimelineStore } from "../src/index.ts";

// @ts-expect-error no exported member
export { runSource } from "../src/index.ts";

// @ts-expect-error no exported member
export { makeDiagnosticsStore } from "../src/index.ts";

// @ts-expect-error no exported member
export { runDiagnostics } from "../src/index.ts";

// @ts-expect-error no exported member
export { noDiagnostics } from "../src/index.ts";

// @ts-expect-error no exported member
export { idleTimeline } from "../src/index.ts";

// @ts-expect-error no exported member
export { idleTimelineStatus } from "../src/index.ts";

// @ts-expect-error no exported member
export { idleDiagnostics } from "../src/index.ts";

// @ts-expect-error no exported member
export { isUnsampled } from "../src/index.ts";

// @ts-expect-error no exported member
export type { DiagnosticsStore } from "../src/index.ts";

// One option shape, `DiagnosticsOptions`; the dock-only name is gone from both entries.
// @ts-expect-error no exported member
export type { DiagnosticsDockOptions } from "../src/index.ts";

// @ts-expect-error no exported member
export type { DiagnosticsDockOptions as ReactDiagnosticsDockOptions } from "../src/react/index.ts";

// @ts-expect-error no exported member
export { useStoreSnapshot } from "../src/react/index.ts";

// @ts-expect-error no exported member
export { DiagnosticsNotice } from "../src/react/index.ts";

test("the React entry's AskedQuestionLike is the model's", () => {
  expect<ReactAskedQuestionLike>().type.toBe<AskedQuestionLike>();
});

test("GateRegistryLike is the two methods react's registry has, and no more", () => {
  expect<GateRegistryLike>().type.toBe<{
    readonly instances: () => ReadonlyArray<GateInstanceLike>;
    readonly subscribe: (listener: () => void) => () => void;
  }>();
});

test("React's DiagnosticsOptions is the root's", () => {
  expect<ReactDiagnosticsOptions>().type.toBe<DiagnosticsOptions>();
});

test("DiagnosticsOptions is a layer, a collector and an interval, and nothing else", () => {
  expect<DiagnosticsOptions>().type.toBe<{
    readonly layer?: Layer.Layer<never, unknown> | undefined;
    readonly collector?: PortCallCollector | undefined;
    readonly intervalMillis?: number | undefined;
  }>();
});

test("each feed is built in a scope and fails with nothing", () => {
  expect(makeTimelineFeed()).type.toBe<Effect.Effect<TimelineFeed, never, Scope.Scope>>();
  expect(makeDiagnosticsFeed()).type.toBe<Effect.Effect<DiagnosticsFeed, never, Scope.Scope>>();
  expect(makeGatesFeed()).type.toBe<Effect.Effect<GatesFeed, never, Scope.Scope>>();
  expect<Parameters<typeof makeTimelineFeed>>().type.toBe<[]>();
  expect<Parameters<typeof makeDiagnosticsFeed>>().type.toBe<[]>();
  expect<Parameters<typeof makeGatesFeed>>().type.toBe<[]>();
});

test("a handle's parts are nameable (TS2883)", () => {
  expect<TimelineFeed["status"]>().type.toBe<TimelineStatusReadout>();
  expect<DiagnosticsFeed>().type.toBeAssignableTo<DiagnosticsReadout>();
  expect<ReturnType<GatesFeed["getSnapshot"]>>().type.toBe<GatesSnapshot>();
});

test("a timeline store resizes itself and answers whether it did", () => {
  expect<TimelineStore["resize"]>().type.toBe<(capacity: number) => boolean>();
  expect<Omit<TimelineStore, "resize">>().type.not.toBeAssignableTo<TimelineStore>();
  expect<TimelineFeed["timeline"]>().type.toBe<TimelineStore>();
});

test("the dock takes eight model inputs and two host props, each accepting undefined", () => {
  expect<keyof DevtoolsDockProps>().type.toBe<
    | "source"
    | "capacity"
    | "catalogue"
    | "ports"
    | "diagnostics"
    | "reading"
    | "gates"
    | "questions"
    | "unknownParents"
    | "onInvalidate"
  >();
  expect<{
    readonly source: undefined;
    readonly capacity: undefined;
    readonly catalogue: undefined;
    readonly ports: undefined;
    readonly diagnostics: undefined;
    readonly reading: undefined;
    readonly gates: undefined;
    readonly questions: undefined;
    readonly unknownParents: undefined;
    readonly onInvalidate: undefined;
  }>().type.toBeAssignableTo<DevtoolsDockProps>();
});
