/**
 * The types of `@qadi/devtools`' interface (ARCH-40, ADR-QD-047's amendment).
 *
 * Every public type is importable from its entry point (the re-export below
 * fails to compile for a name that is not there), and a representative private
 * name from each private module is refused, since out of the barrel means not
 * importable (ADR-QD-099). The values are pinned by `surface.test.ts`.
 */
import { expect, test } from "tstyche";
import type { AskedQuestionLike } from "../src/index.ts";
import type { AskedQuestionLike as ReactAskedQuestionLike } from "../src/react/index.ts";

export type {
  ActedCall,
  Answer,
  AskedQuestionLike,
  AttributeCall,
  Baseline,
  BaselineCaveat,
  BecameError,
  CacheReport,
  CapturedAnswers,
  Catalogue,
  Compared,
  Comparison,
  Counts,
  CustomPredicateCall,
  DecisionEventSource,
  Diagnostics,
  DiagnosticsOptions,
  DiagnosticsReading,
  DiagnosticsStore,
  EditDirection,
  EditKind,
  EvaluationPorts,
  EvaluationPortsLayer,
  Filters,
  GateInstanceLike,
  HydrationActivity,
  HydrationDrops,
  InspectKind,
  InspectNode,
  MalformedReason,
  NodeStatus,
  PairRole,
  PairedEntry,
  PolicyChoice,
  PolicySighting,
  PortActivity,
  PortCall,
  PortCallCollector,
  PortCallInterpreter,
  PortCallLog,
  PortCallOf,
  PortCallPort,
  PortReport,
  Recovered,
  RelationshipCall,
  ResourceText,
  RunKind,
  RunState,
  Selection,
  SignatureHistoryCall,
  SimulatedSubject,
  SimulationClock,
  SimulationEdit,
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
  SweepPlan,
  Timeline,
  TimelineEntry,
  TimelineStore,
  UnseededField,
  Verdict,
  WhatIfReport,
  WhatIfRow,
  WiredServiceName,
  WiringRead,
  WiringReport,
} from "../src/index.ts";

export type {
  DevtoolsDockProps,
  DiagnosticsDockOptions,
  SimulationSessionView,
  UseSimulationSessionInput,
  UseTimeline,
} from "../src/react/index.ts";

// Representative private names, one or more per private module. Each import
// below must fail.
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
export { resolveSource } from "../src/index.ts";

// @ts-expect-error no exported member
export { applyEdits } from "../src/index.ts";

// @ts-expect-error no exported member
export { subjectOf } from "../src/index.ts";

// @ts-expect-error no exported member
export { Simulator } from "../src/react/index.ts";

// @ts-expect-error no exported member
export { PolicyTree } from "../src/react/index.ts";

// @ts-expect-error no exported member
export { drawLens } from "../src/react/index.ts";

test("the React entry's AskedQuestionLike is the model's", () => {
  expect<ReactAskedQuestionLike>().type.toBe<AskedQuestionLike>();
});
