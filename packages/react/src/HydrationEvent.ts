/**
 * A hydration outcome as one value, counted and reported once.
 *
 * Every exit from `dehydrateDecisions` and `hydrateDecisions` — entries put into
 * a payload, entries left out, a payload refused whole, entries dropped, entries
 * seeded, a seed answered again by this client — is a {@link HydrationEvent}.
 * `HydrationEngine.ts` builds the events a call implies, and {@link emitHydration}
 * is the only thing that writes a hydration counter or calls a hydration
 * reporter: one table, one arm per tag, so a new exit is one compile error in
 * one place.
 *
 * Why (ARCH-60, a port of the lost ARCH-53): each exit used to write a counter
 * through `HydrationCounts.ts` and call a reporter resolved in
 * `DeveloperSignals.ts`, and every pair decided its own count rule and its own
 * order against the work it reported. Two of those pairs had drifted — a payload
 * refused for naming another subject with no entries counted zero, against
 * INV-QD-045 — and a reporter called before the work it reported could stop the
 * work.
 *
 * Deliberately out of the barrel (AGENTS.md §9), same as `HydrationEngine.ts`
 * and `DeveloperSignals.ts`: this is the write side of an internal metric, not
 * something a consumer should be updating directly. `DecisionEntry` is public
 * and re-exported **by name** from `Hydration.ts`; it lives here because the
 * dehydrate event speaks about it and this file imports nothing from the engine.
 *
 * Every function here is **synchronous and total**, because its callers are.
 * `dehydrateDecisions` and `hydrateDecisions` are documented as pure and
 * synchronous and their callers are a server rendering a page and a client's
 * first render — neither of which has an Effect runtime, so `Metric.update`,
 * which is an `Effect`, is not available to them. `updateUnsafe` is, and it
 * takes the context explicitly.
 *
 * **`Context.empty()` is the whole subtlety, so it lives in one file.** A
 * `Context.Reference` resolves to its default when the context does not carry
 * it, and `MetricRegistry`'s default is the reference's default — so an
 * off-fiber write with an empty context lands in the **default registry**, which
 * is where `@qadi/devtools`' reader looks (it names `Context.empty()` too).
 * `packages/core/test/HydrationMetrics.test.ts` pins that.
 *
 * A `Context.Context` passed here is **not** a way to scope these counts, and
 * that is worth knowing before someone tries it: at effect 4.0.0 a `Metric`
 * looks its registry up on **every** update, so a different context writes a
 * different registry's series, which the reader would never see. Writer and
 * reader agree because both name the default registry, not because the metric
 * remembers one (ADR-QD-052, amended). A host exporting hydration counts from
 * its own registry must export them from the default one.
 *
 * Confined to one named file for the reason `DeveloperSignals.ts` confines
 * `console` and `process.env`: a boundary in a file with a name stays visible,
 * where one spread across three call sites dissolves into convention.
 */
import type { Decision, DehydrationDropReason, HydrationDropReason, Policy, Resource } from "@qadi/core";
import {
  hydrationDehydratedTotal,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
} from "@qadi/core";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import type {
  DroppedEntriesReporter,
  HydrationDropReporter,
  HydrationMismatch,
  HydrationMismatchReporter,
} from "./DeveloperSignals.ts";

/** One decision the server made, ready to be dehydrated. */
export interface DecisionEntry {
  readonly policy: Policy;
  /** Present when the decision was made against a resource. */
  readonly resource?: Resource | undefined;
  readonly decision: Decision;
}

/**
 * The reasons that refuse a payload **whole**.
 *
 * The subject id and the version are properties of the payload, and a value that
 * is not an envelope has no entries to speak of, so there is nothing to seed.
 * Written out rather than `Extract`ed: with {@link EntryDropReason} it partitions
 * `ClientHydrationDropReason`, and a new reason is placed by hand.
 */
export type PayloadRefusalReason = "PayloadSubjectMismatch" | "UnsupportedPayloadVersion" | "MalformedPayload";

/** The reasons that drop some entries of a payload and seed the rest. */
export type EntryDropReason = "MalformedEntry" | "UndecodablePolicy" | "EntryTooDeep";

/**
 * Everything hydration can tell the world about one call.
 *
 * Closed, with the reason narrowed per tag so that "a whole-payload reason
 * reported as a partial drop" does not compile, and `wholePayload` is derived
 * by the projection instead of stored beside a reason that already decides it.
 */
export type HydrationEvent = Data.TaggedEnum<{
  /** Entries a server put into a payload. */
  Dehydrated: { readonly count: number };
  /** Entries a server left out of one. */
  LeftOut: {
    readonly reason: DehydrationDropReason;
    readonly entries: ReadonlyArray<DecisionEntry>;
  };
  /** A payload this client refused whole; `entries` is every entry it carried. */
  PayloadRefused: {
    readonly reason: PayloadRefusalReason;
    readonly entries: ReadonlyArray<unknown>;
  };
  /** Entries of a payload this client did not seed, for one reason. */
  EntriesDropped: {
    readonly reason: EntryDropReason;
    readonly entries: ReadonlyArray<unknown>;
  };
  /** Entries a client seeded. */
  Seeded: { readonly count: number };
  /** A seeded question this client answered for itself, and where it disagreed. */
  Rechecked: { readonly mismatch: HydrationMismatch | undefined };
}>;

export const HydrationEvent = Data.taggedEnum<HydrationEvent>();

/**
 * The reporters an event is announced to, already resolved by `DeveloperSignals.ts`:
 * the development default, the host's own reporter, or `undefined` for none.
 */
export interface HydrationHooks {
  readonly leftOut?: DroppedEntriesReporter<DecisionEntry> | undefined;
  readonly dropped?: HydrationDropReporter<unknown> | undefined;
  readonly mismatch?: HydrationMismatchReporter | undefined;
}

/** The empty context, built once. Resolves every reference to its default. */
const registry = Context.empty();

/**
 * Records `count` entries lost for one reason.
 *
 * A frequency increments by one per call, so this loops — bounded by the number
 * of entries already going in the bin, on a path that only runs when a payload
 * is malformed. Zero iterations write nothing, and the reason still appears in
 * the snapshot at zero because the metric pre-registers its whole key set.
 */
const drop = (reason: HydrationDropReason, count: number): void => {
  for (let index = 0; index < count; index += 1) {
    hydrationDroppedTotal.updateUnsafe(reason, registry);
  }
};

/**
 * What each event counts and says.
 *
 * Built once at module scope (AGENTS.md §5a) and exhaustive, so an event without
 * an arm is a compile error. Each arm counts first and announces second, so
 * whatever a reporter does the count is already written. The count rule lives in
 * the arm: a payload refused whole is **at least one** drop, so a counter moves
 * even when the payload held no entries and a dashboard sees the refusal at all.
 * Both re-check counters move together on a disagreement, so
 * `hydrationMismatchesTotal` is a strict subset of `hydrationRechecksTotal` and
 * the pair reads as a rate rather than as two unrelated numbers.
 */
const project: (event: HydrationEvent) => (hooks: HydrationHooks) => void = Match.type<HydrationEvent>().pipe(
  Match.tagsExhaustive({
    Dehydrated:
      ({ count }) =>
      () => {
        hydrationDehydratedTotal.updateUnsafe(count, registry);
      },
    LeftOut:
      ({ reason, entries }) =>
      (hooks: HydrationHooks) => {
        drop(reason, entries.length);
        hooks.leftOut?.(entries);
      },
    PayloadRefused:
      ({ reason, entries }) =>
      (hooks: HydrationHooks) => {
        drop(reason, Math.max(1, entries.length));
        hooks.dropped?.({ reason, entries, wholePayload: true });
      },
    EntriesDropped:
      ({ reason, entries }) =>
      (hooks: HydrationHooks) => {
        drop(reason, entries.length);
        hooks.dropped?.({ reason, entries, wholePayload: false });
      },
    Seeded:
      ({ count }) =>
      () => {
        hydrationSeededTotal.updateUnsafe(count, registry);
      },
    Rechecked:
      ({ mismatch }) =>
      (hooks: HydrationHooks) => {
        hydrationRechecksTotal.updateUnsafe(1, registry);
        if (mismatch === undefined) return;
        hydrationMismatchesTotal.updateUnsafe(1, registry);
        hooks.mismatch?.(mismatch);
      },
  }),
);

/** Counts one event, then announces it to whichever of `hooks` its tag speaks to. */
export const emitHydration = (event: HydrationEvent, hooks: HydrationHooks): void => project(event)(hooks);
