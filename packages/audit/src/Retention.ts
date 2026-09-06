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

/**
 * Entries `policy` says may be purged.
 *
 * Age alone, not archival status, decides purgeability — this module has no
 * concept of "archived" and never checks `archiveAuditTrail` (`AuditArchive.ts`)
 * was ever called on a returned entry. **The caller is responsible for the
 * ordering constraint "archive before purge"**: passing this function's
 * output straight to a deletion routine, without first confirming every one
 * of these rows already exists in a durable archive, purges audit history
 * that was never successfully archived. This invariant is documented, not
 * mechanically enforced — `@qadi/audit` has no scheduler and no archival
 * store of its own to check against (see the package README's module
 * header), so there is nothing here that could enforce it even if it tried.
 */
export const getPurgeableEntries = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
): ReadonlyArray<AuditEntry> => partitionByRetention(entries, policy, now).purged;

/**
 * Entries `policy` says must be retained.
 *
 * The complement of {@link getPurgeableEntries}: age alone decides retention
 * too. A caller building a purge routine around this pair still owns the
 * same archive-before-purge ordering constraint documented there — retaining
 * an entry here says nothing about whether it has been archived.
 */
export const enforceRetention = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
): ReadonlyArray<AuditEntry> => partitionByRetention(entries, policy, now).retained;
