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
 */
export * from "./model/Capture.ts";
export * from "./model/Catalogue.ts";
export * from "./model/Filters.ts";
export * from "./model/Inspect.ts";
export * from "./model/Pairing.ts";
export * from "./model/RoleTree.ts";
export * from "./model/Selection.ts";
export * from "./model/Simulation.ts";
export * from "./model/SimulationInput.ts";
export * from "./model/Source.ts";
export * from "./model/Sources.ts";
export * from "./model/Timeline.ts";
export * from "./model/TimelineStore.ts";
export * from "./model/Verdict.ts";
export * from "./model/Wiring.ts";
