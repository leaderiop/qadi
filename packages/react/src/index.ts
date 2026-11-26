/**
 * The React binding over `effect/reactivity`: the provider, the atom set, the
 * declarative guards and the atom-reading hooks.
 *
 * **The list below is the interface** (ADR-QD-047's amendment, ADR-QD-204): each
 * module's exports are named, modules in path order and, within a module, values
 * before types. A module's other names are reachable inside the package only: out
 * of the barrel means not importable (ADR-QD-099). Adding a name is a line here,
 * a row in `spec/overview.md` and a line in `test/surface.test.ts`, which is
 * deliberate.
 *
 * `components.tsx` and `hooks.ts` are deliberate multi-export grouping files, not
 * one-PascalCase-file-per-domain-concept: each groups a family of thin, closely
 * related exports (the declarative guards; the atom-reading hooks) that share one
 * doc comment and no independent lifecycle worth a file each.
 */
export { DecisionOutcome, currentDecision, outcomeOf } from "./DecisionOutcome.ts";
export type { DecisionResult } from "./DecisionOutcome.ts";
export { runtimeLayer, useDevtoolsFeed } from "./DevtoolsFeed.ts";
export type { DevtoolsDiagnosticsFeed, DevtoolsFeed } from "./DevtoolsFeed.ts";
export { makeGateRegistry } from "./GateWriter.ts";
export type {
  GateInstance,
  GateKind,
  GateRegistry,
  GateRegistryOptions,
  GateRenderState,
} from "./GateWriter.ts";
export {
  SeededAllow,
  SeededDeny,
  dehydrateDecisions,
  hydrateDecisions,
  isSeeded,
  permits,
} from "./Hydration.ts";
export type {
  AllowDisclosure,
  ClientDecision,
  DecisionEntry,
  DehydrateOptions,
  DehydratedDecisions,
  DehydratedEntry,
  DenyDisclosure,
  HydrateOptions,
  HydrationDrop,
  HydrationDropReporter,
  SeededDecision,
} from "./Hydration.ts";
export { makeQadiAtoms } from "./QadiAtoms.ts";
export type {
  AskedQuestion,
  HydrationMismatch,
  HydrationMismatchReporter,
  QadiAtoms,
  QadiAtomsOptions,
  QadiLayer,
  QadiRuntimeServices,
} from "./QadiAtoms.ts";
export {
  MissingQadiProviderError,
  QadiProvider,
  useAtomValue,
  useQadiContext,
} from "./QadiProvider.tsx";
export type {
  InitialValues,
  ProviderSignal,
  ProviderSignalReporter,
  QadiContextValue,
  QadiProviderProps,
} from "./QadiProvider.tsx";
export { Can, Cannot } from "./components.tsx";
export type { CanProps, CannotProps, DeniedNode } from "./components.tsx";
export {
  useCan,
  useDecision,
  useDecisionSuspense,
  useGateInstances,
  useInvalidate,
  usePolicies,
  useProjected,
  useQuestions,
  useSubject,
} from "./hooks.ts";
