/**
 * The React dock.
 *
 * A separate entry point from the model so that a server-side aggregator can
 * consume `@qadi/devtools` without React reaching its bundle at all — which is
 * why `react` is an *optional* peer dependency of this package.
 *
 * Nothing here computes. Merging, ordering, pairing and inspection are the
 * model's, and this renders what the model produced.
 */
export * from "./DecisionLog.tsx";
export * from "./DecisionPanels.tsx";
export * from "./DevtoolsDock.tsx";
export * from "./Inspector.tsx";
export * from "./Lens.ts";
export * from "./PolicyExplorer.tsx";
export * from "./PolicyTree.tsx";
export * from "./QuestionsPanel.tsx";
export * from "./RoleViewer.tsx";
export * from "./ServicesPanel.tsx";
export * from "./Simulator.tsx";
export * from "./VerdictTag.tsx";
export * from "./WhatIfTable.tsx";
export * from "./useLens.ts";
export * from "./useTimeline.ts";
