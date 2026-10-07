/**
 * Purge selection — a caller-invoked, caller-scheduled surface entirely
 * outside the `DecisionSink` pipeline.
 *
 * `@qadi/audit` has no scheduler of its own, consistent with every other
 * capability on this map avoiding ambient timers or state: pure functions and
 * data, parameterized on `now` rather than reading `Date.now()` internally
 * (AGENTS.md §6), so a caller decides when and how often retention runs.
 *
 * **A row is selected for deletion only with a finite age past a valid
 * limit.** `at` and `now` are finite, `maxAgeMs >= 0`, and `now - at >
 * maxAgeMs`; nothing else purges. Fail-closed for a deletion selector means
 * retaining, never expiring: a wrong retain keeps a row too long, a wrong
 * purge destroys evidence that may never have been archived. The rule lives
 * in {@link planRetention}; the two older functions project it (INV-QD-101).
 */
import * as Data from "effect/Data";
import * as Result from "effect/Result";
import type { AuditEntry } from "./AuditEntry.ts";

export interface RetentionPolicy {
  /** An entry older than this, relative to `now`, is purgeable. */
  readonly maxAgeMs: number;
}

/**
 * `planRetention` refused its input: `now` is not a finite number, or
 * `maxAgeMs` is `NaN` or negative. `value` is the offending number.
 */
export class RetentionInputInvalid extends Data.TaggedError("RetentionInputInvalid")<{
  readonly field: "now" | "maxAgeMs";
  readonly value: number;
}> {}

/**
 * What a retention run decided, by one pass over the entries.
 *
 * `retained` and `purged` partition the input — `retained ∪ purged =
 * entries`, `retained ∩ purged = ∅` (INV-QD-053). `undated` is the part of
 * `retained` whose `at` is not a finite number (`NaN`, `±Infinity`): such a
 * row's age is unknown, so it is kept, and reported here rather than silently.
 */
export interface RetentionPlan {
  readonly retained: ReadonlyArray<AuditEntry>;
  readonly purged: ReadonlyArray<AuditEntry>;
  readonly undated: ReadonlyArray<AuditEntry>;
}

/**
 * The one rule for "may this row be deleted?".
 *
 * Refuses `RetentionInputInvalid` when `now` is not finite or `maxAgeMs` is
 * `NaN` or negative (`+Infinity` is valid and means "retain forever").
 * Otherwise one pass: a row with a non-finite `at` is retained and `undated`;
 * one with `now - at > maxAgeMs` is purged; the rest are retained. Prefer it
 * to {@link getPurgeableEntries}, which on a refusal purges nothing without
 * telling the caller why.
 */
export const planRetention = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
): Result.Result<RetentionPlan, RetentionInputInvalid> => {
  if (!Number.isFinite(now)) {
    return Result.fail(new RetentionInputInvalid({ field: "now", value: now }));
  }
  if (!(policy.maxAgeMs >= 0)) {
    return Result.fail(new RetentionInputInvalid({ field: "maxAgeMs", value: policy.maxAgeMs }));
  }
  const retained: Array<AuditEntry> = [];
  const purged: Array<AuditEntry> = [];
  const undated: Array<AuditEntry> = [];
  for (const entry of entries) {
    const at = entry.record.at;
    if (!Number.isFinite(at)) {
      retained.push(entry);
      undated.push(entry);
    } else if (now - at > policy.maxAgeMs) {
      purged.push(entry);
    } else {
      retained.push(entry);
    }
  }
  return Result.succeed({ retained, purged, undated });
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
): ReadonlyArray<AuditEntry> =>
  Result.match(planRetention(entries, policy, now), {
    onFailure: () => [],
    onSuccess: (plan) => plan.purged,
  });

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
): ReadonlyArray<AuditEntry> =>
  Result.match(planRetention(entries, policy, now), {
    onFailure: () => entries,
    onSuccess: (plan) => plan.retained,
  });
