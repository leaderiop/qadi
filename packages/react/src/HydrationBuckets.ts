/**
 * Each side's drop buckets: one record keyed by every drop reason of that side,
 * and the one derivation of their events.
 *
 * The engine used to keep named arrays and write one emission line per reason, so
 * a reason given a bucket and no line compiled, and its entries were never
 * reported or counted, against INV-QD-045. The record is now the only place a
 * drop is collected and the only source of its event (ADR-QD-183, which amends
 * ADR-QD-152).
 *
 * Package-private, and out of the barrel on purpose (AGENTS.md §9, ADR-QD-099).
 */
import type { DehydrationDropReason } from "@qadi/core";
import * as Record from "effect/Record";
import type { DecisionEntry, EntryDropReason } from "./HydrationEvent.ts";

/**
 * One bucket per reason.
 *
 * A mapped type, so a literal missing a reason is a compile error naming it, and
 * one with an unknown key is an excess-property error.
 */
export type DropBuckets<R extends string, T> = { readonly [K in R]: Array<T> };

/**
 * A fresh, empty bucket record for the hydrate side, one per call so two calls
 * share nothing.
 *
 * Its key order is the side's emission order, stated here once. That order is
 * deliberately not core's table order; changing either would change what a
 * reporter sees first.
 */
export const entryBuckets = (): DropBuckets<EntryDropReason, unknown> => ({
  EntryTooDeep: [],
  MalformedEntry: [],
  UndecodablePolicy: [],
});

/**
 * A fresh, empty bucket record for the dehydrate side, one per call so two calls
 * share nothing.
 *
 * Its key order is the side's emission order, stated here once.
 */
export const dehydrationBuckets = (): DropBuckets<DehydrationDropReason, DecisionEntry> => ({
  ForeignSubject: [],
  UnencodablePolicy: [],
});

/**
 * One event per non-empty bucket, in the record's key order.
 *
 * The caller appends `Seeded` or `Dehydrated`. It visits every key of the record,
 * so no bucket can be skipped.
 */
export const dropEvents = <R extends string, T, E>(
  buckets: DropBuckets<R, T>,
  event: (reason: R, bucket: ReadonlyArray<T>) => E,
): ReadonlyArray<E> =>
  Record.keys(buckets)
    .filter((reason) => buckets[reason].length > 0)
    .map((reason) => event(reason, buckets[reason]));
