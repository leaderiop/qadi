/**
 * Purge selection — a caller-invoked, caller-scheduled surface entirely
 * outside the `DecisionSink` pipeline.
 *
 * `@qadi/audit` has no scheduler of its own, consistent with every other
 * capability on this map avoiding ambient timers or state: pure functions and
 * data, parameterized on `now` rather than reading `Date.now()` internally
 * (AGENTS.md §6), so a caller decides when and how often retention runs.
 */
import type { AuditEntry } from "./AuditEntry.ts";

export interface RetentionPolicy {
  /** An entry older than this, relative to `now`, is purgeable. */
  readonly maxAgeMs: number;
}

const isPurgeable = (entry: AuditEntry, policy: RetentionPolicy, now: number): boolean =>
  now - entry.record.at > policy.maxAgeMs;

/**
 * One pass, one evaluation of `isPurgeable` per entry, so `retained` and
 * `purged` partition `entries` by construction —
 * `retained ∪ purged = entries`, `retained ∩ purged = ∅` — rather than by
 * relying on `getPurgeableEntries`/`enforceRetention` staying negations of
 * each other across two independent `.filter()` calls, which a later edit to
 * only one of them could quietly break.
 */
const partitionByRetention = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
): { readonly retained: ReadonlyArray<AuditEntry>; readonly purged: ReadonlyArray<AuditEntry> } => {
  const retained: Array<AuditEntry> = [];
  const purged: Array<AuditEntry> = [];
  for (const entry of entries) {
    (isPurgeable(entry, policy, now) ? purged : retained).push(entry);
  }
  return { retained, purged };
};

/** Entries `policy` says may be purged. */
export const getPurgeableEntries = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
): ReadonlyArray<AuditEntry> => partitionByRetention(entries, policy, now).purged;

/** Entries `policy` says must be retained. */
export const enforceRetention = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
): ReadonlyArray<AuditEntry> => partitionByRetention(entries, policy, now).retained;
