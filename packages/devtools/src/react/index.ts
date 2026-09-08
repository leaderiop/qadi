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
// `useLens.ts` and `useTimeline.ts` are deliberate multi-export grouping
// files, not one-PascalCase-file-per-domain-concept: each groups a small
// family of closely related exports (the pick gesture's DOM listeners;
// timeline-scrubbing state) with no independent lifecycle worth a file each.
// `theme.ts` is a third such file but, per AGENTS.md §9, is not re-exported
// here at all — it is internal shared scaffolding (styling tokens consumed
// directly by sibling components), not public API.
export * from "./useLens.ts";
export * from "./useTimeline.ts";
