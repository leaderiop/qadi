/**
 * The headless devtools model.
 *
 * Everything here is pure and Effect-native: it decodes records, merges them
 * into one ordered timeline, pairs the rows that describe one evaluation, and
 * zips a policy against its trace so a short-circuited branch can be told from a
 * denied one. Nothing in it imports React.
 *
 * The dock that renders it is a separate entry point, `@qadi/devtools/react`,
 * so a backend aggregator can consume the model without pulling in a UI.
 *
 * **The list below is the interface** (ADR-QD-047's amendment, ARCH-40): the
 * three stores a shell runs (`TimelineStore`, `SimulationSession`,
 * `DiagnosticsStore`) with their runners, the host wiring the dock takes, the
 * timeline readings ADR-QD-047 lists, and the types those name. A screen's
 * mechanics (form codecs, sweep planning, remedies, capture, replay, role trees,
 * gate grouping) are reachable inside the package only: out of the barrel means
 * not importable (ADR-QD-099). Adding a name is a line here, a row in
 * `spec/overview.md` and a line in `test/surface.test.ts`, which is deliberate.
 */
export type { Answer, CapturedAnswers } from "./model/Capture.ts";
export { catalogueOf } from "./model/Catalogue.ts";
export type { Catalogue, PolicySighting } from "./model/Catalogue.ts";
export {
  DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS,
  WiringRead,
  makeDiagnosticsStore,
  mergeReading,
  noDiagnostics,
  runDiagnostics,
} from "./model/DiagnosticsStore.ts";
export type {
  Diagnostics,
  DiagnosticsOptions,
  DiagnosticsReading,
  DiagnosticsStore,
} from "./model/DiagnosticsStore.ts";
export {
  applyFilters,
  environmentsOf,
  isUnfiltered,
  noFilters,
  searchTextOf,
} from "./model/Filters.ts";
export type { Filters } from "./model/Filters.ts";
export type { AskedQuestionLike, GateInstanceLike } from "./model/Gates.ts";
export { hasHydrated, hydrationActivity, unaccountedEntries } from "./model/Hydration.ts";
export type { HydrationActivity, HydrationDrops } from "./model/Hydration.ts";
export {
  describeTracePath,
  flattenTree,
  inspect,
  inspectEntry,
  isNeverResolved,
  isTruncated,
} from "./model/Inspect.ts";
export type { InspectKind, InspectNode, NodeStatus } from "./model/Inspect.ts";
export { pairedEntries, pairsOf } from "./model/Pairing.ts";
export type { PairRole, PairedEntry } from "./model/Pairing.ts";
export { DEFAULT_PORT_CALL_CAPACITY, collectPortCalls } from "./model/PortCalls.ts";
export type {
  ActedCall,
  AttributeCall,
  CustomPredicateCall,
  PortCall,
  PortCallCollector,
  PortCallInterpreter,
  PortCallLog,
  PortCallOf,
  PortCallPort,
  RelationshipCall,
  SignatureHistoryCall,
} from "./model/PortCalls.ts";
export type { SkippedRemedy } from "./model/Remedies.ts";
export type { Baseline, BaselineCaveat, UnseededField } from "./model/Replay.ts";
export { Evicted, NoSelection, Selected, selectionOf } from "./model/Selection.ts";
export type { Selection } from "./model/Selection.ts";
export type { SimulationClock } from "./model/Simulation.ts";
export type { EditDirection, EditKind, SimulationEdit } from "./model/SimulationEdit.ts";
export type {
  EvaluationPorts,
  EvaluationPortsLayer,
  SimulatedSubject,
  SimulationInput,
} from "./model/SimulationInput.ts";
export { makeSimulationSession } from "./model/SimulationSession.ts";
export type {
  PolicyChoice,
  ResourceText,
  RunKind,
  RunState,
  SimulationQuestion,
  SimulationSession,
  SimulationSessionInit,
  SimulationSnapshot,
  SourceChoice,
  SourceOption,
  SourceRefusal,
} from "./model/SimulationSession.ts";
export { mergeSources, sourceFromEventSource, sourceFromRecords } from "./model/Source.ts";
export type {
  DecisionEventSource,
  MalformedReason,
  Source,
  SourceRead,
} from "./model/Source.ts";
export {
  DEFAULT_TIMELINE_CAPACITY,
  TimelineDecision,
  TimelineOrphan,
  emptyTimeline,
  entryKey,
  ingest,
  ingestAll,
} from "./model/Timeline.ts";
export type { Timeline, TimelineEntry } from "./model/Timeline.ts";
export { makeTimelineStore, runSource } from "./model/TimelineStore.ts";
export type { TimelineStore } from "./model/TimelineStore.ts";
export { countsOf, verdictOf, verdictOfOutcome } from "./model/Verdict.ts";
export type { Counts, Verdict } from "./model/Verdict.ts";
export type {
  BecameError,
  Compared,
  Comparison,
  Recovered,
  StillFailed,
  SweepPlan,
  WhatIfReport,
  WhatIfRow,
} from "./model/WhatIf.ts";
export { portActivity, wiringReport } from "./model/Wiring.ts";
export type {
  CacheReport,
  PortActivity,
  PortReport,
  WiredServiceName,
  WiringReport,
} from "./model/Wiring.ts";
