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
export * from "./model/Source.ts";
export * from "./model/Timeline.ts";
export * from "./model/TimelineStore.ts";
