/**
 * Aggregate counts for decisions crossing the network into a client.
 *
 * `dehydrateDecisions` and `hydrateDecisions` return their entries and forget
 * them, so nothing retained how many were shipped, how many were seeded, or how
 * many were thrown away on the way — and the one number a panel could show, the
 * mismatch count, was accumulated by the *host* through a callback rather than
 * by the library. A screen could therefore report a disagreement but not whether
 * hydration had happened at all.
 *
 * **Declared here, written by `@qadi/react`, read by `@qadi/devtools`.** That
 * split needs saying, because the obvious alternative silently does not work:
 * `Metric`'s registry key is `type:id:description`
 * (`makeKey` in `effect/Metric`), so a reader that re-declares a metric with the
 * same id but a different — or absent — description gets a *separate* entry and
 * reads zero, with no error anywhere. A metric is a contract between a writer
 * and a reader, and a contract whose key includes a prose string has to be
 * declared once, in a module both sides import. `@qadi/core` is the only package
 * both of them already depend on.
 *
 * That also makes {@link PortMetrics}'s note about descriptions — that nothing
 * reads them back, so mutation testing cannot distinguish one from none — false
 * for *these* four. Changing a description here silently detaches the reader
 * from the writer, so `HydrationMetrics.test.ts` pins each one.
 *
 * **Counters and frequencies rather than a log**, for the reason `PortMetrics.ts`
 * gives: the default registry is memoised on the reference, so a reader calls
 * `Metric.value` and gets these with **zero wiring**. Hydration runs where no
 * Effect runtime need exist at all — `dehydrateDecisions` on a server rendering
 * a page, `hydrateDecisions` during a client's first render — so the write side
 * uses `updateUnsafe`, which is the only form available off a fiber.
 *
 * These are **process-wide** aggregates, like the port metrics and for the same
 * reason. On a server they accumulate across every request the process served.
 */
import * as Metric from "effect/Metric";

/**
 * Why the **server** left an entry out of a payload.
 *
 * One case today, and it is still a named union rather than a bare string
 * literal: the two sides are reported through different callbacks with different
 * payloads, so a reader of either signature should be able to see which set of
 * reasons it is looking at.
 */
export type DehydrationDropReason =
  /** An entry whose decision was made for another subject. */
  "ForeignSubject";

/**
 * Why the **client** did not seed an entry, or a whole payload.
 *
 * The first two reject the payload entire rather than entry by entry: the
 * subject id is a property of the payload, and an atom set with no seed lookup
 * has nowhere for any of them to go.
 */
export type ClientHydrationDropReason =
  /** The payload names a subject this client is not. */
  | "PayloadSubjectMismatch"
  /** The atom set was not built by `makeQadiAtoms`, so it has no seed to write to. */
  | "UnregisteredAtoms"
  /** A field other than `policy` did not match `DehydratedEntry`'s shape. */
  | "MalformedEntry"
  /** The entry's policy did not decode. */
  | "UndecodablePolicy";

/**
 * Every reason a decision failed to survive the trip, from either end.
 *
 * The key domain of {@link hydrationDroppedTotal}, and closed rather than a free
 * string: an unbounded frequency key grows a permanent registry entry per
 * distinct value, which is the cardinality objection `PortMetrics.ts` records
 * for keying on a port name.
 */
export type HydrationDropReason = DehydrationDropReason | ClientHydrationDropReason;

/** Every reason, as values — so a reader need not restate the union. */
export const hydrationDropReasons: ReadonlyArray<HydrationDropReason> = [
  "ForeignSubject",
  "PayloadSubjectMismatch",
  "UnregisteredAtoms",
  "MalformedEntry",
  "UndecodablePolicy",
];

/**
 * Decisions a server projected into a payload.
 *
 * A **counter** rather than a key on a shared frequency, and the reason is
 * mechanical: `Metric.frequency` increments by exactly one per call, so a
 * payload of a thousand entries would be a thousand map writes on a server's
 * render path. A counter takes the number.
 */
export const hydrationDehydratedTotal = Metric.counter("qadi_hydration_dehydrated_total", {
  description: "Decisions projected into a payload by dehydrateDecisions.",
});

/**
 * Decisions a client seeded out of a payload.
 *
 * Read **against** {@link hydrationDehydratedTotal}: a payload that shipped a
 * thousand and seeded none is the failure worth catching, and either number
 * alone looks like a working system.
 */
export const hydrationSeededTotal = Metric.counter("qadi_hydration_seeded_total", {
  description: "Decisions seeded into an atom set by hydrateDecisions.",
});

/**
 * Entries a payload lost, by why they were lost.
 *
 * A frequency here rather than a counter, because *which* reason is the whole
 * diagnosis — "three dropped" is a number and "three dropped, all undecodable"
 * is a version skew. The per-call increment costs one map write per lost entry,
 * on a path that only runs when something is already wrong.
 *
 * `preregisteredWords` puts all five reasons in the snapshot at zero, so a
 * reader gets the closed set from the metric rather than having to restate it —
 * and an absent reason reads as *did not happen* rather than as *this build does
 * not know about it*.
 */
export const hydrationDroppedTotal = Metric.frequency("qadi_hydration_dropped_total", {
  description: "Decisions a payload discarded rather than trusted, by reason.",
  preregisteredWords: hydrationDropReasons,
});

/**
 * Seeded questions this client has since answered for itself.
 *
 * Counted once per question, at the moment the client's own answer becomes
 * authoritative and the seed is spent — never for a question that was never
 * seeded, which is not a re-check but a first answer.
 */
export const hydrationRechecksTotal = Metric.counter("qadi_hydration_rechecks_total", {
  description: "Seeded questions this client has re-answered for itself.",
});

/**
 * Re-checks whose verdict disagreed with the seed.
 *
 * A strict subset of {@link hydrationRechecksTotal}, so the pair is a rate. The
 * **verdict** only, matching `isMismatch`: two allows differing in visible
 * fields are a projection difference, not a control that appeared and vanished.
 */
export const hydrationMismatchesTotal = Metric.counter("qadi_hydration_mismatches_total", {
  description: "Re-checks whose verdict disagreed with the server's seed.",
});
