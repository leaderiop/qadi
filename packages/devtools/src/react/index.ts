/**
 * The React dock.
 *
 * A separate entry point from the model so that a server-side aggregator can
 * consume `@qadi/devtools` without React reaching its bundle at all — which is
 * why `react` is an *optional* peer dependency of this package.
 *
 * Nothing here computes. Merging, ordering, pairing and inspection are the
 * model's, and this renders what the model produced.
 *
 * **The list below is the interface** (ADR-QD-047's amendment, ARCH-40): the
 * dock, and the React half of the three stores (`useTimeline` and
 * `useTimelineStore`, `useDiagnostics`, the simulation session's hooks). The
 * panels the dock composes and the pick-gesture lens are package-private, and
 * `theme.ts` is internal scaffolding as before (AGENTS.md §9). Adding a name is a
 * line here, a row in `spec/overview.md` and a line in `test/surface.test.ts`.
 */
export type { AskedQuestionLike } from "../model/Gates.ts";
export { DevtoolsDock } from "./DevtoolsDock.tsx";
export type { DevtoolsDockProps } from "./DevtoolsDock.tsx";
export { useDiagnostics } from "./useDiagnostics.ts";
export type { DiagnosticsDockOptions } from "./useDiagnostics.ts";
export {
  useOwnedSimulationSession,
  useSimulationSession,
  useSimulationSnapshot,
} from "./useSimulationSession.ts";
export type {
  SimulationSessionView,
  UseSimulationSessionInput,
} from "./useSimulationSession.ts";
export { useTimeline, useTimelineStore } from "./useTimeline.ts";
export type { UseTimeline } from "./useTimeline.ts";
