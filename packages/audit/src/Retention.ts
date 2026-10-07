/**
 * Purge selection — a caller-invoked, caller-scheduled surface entirely
 * outside the `DecisionSink` pipeline.
 *
 * `@qadi/audit` has no scheduler of its own, consistent with every other
 * capability on this map avoiding ambient timers or state: pure functions and
 * data, parameterized on `now` rather than reading `Date.now()` internally
 * (AGENTS.md §6), so a caller decides when and how often retention runs.
 *
 * **A row is selected for deletion only with a finite age past a valid limit
 * and only when its archive holds it.** `at` and `now` are finite, `maxAgeMs
 * >= 0`, and `now - at > maxAgeMs` (the age rule, in {@link planRetention});
 * and a {@link VerifiedArchive} read back from storage holds the row
 * ({@link planPurge}). Fail-closed for a deletion selector means retaining,
 * never expiring: a wrong retain keeps a row too long, a wrong purge destroys
 * evidence that may never have been archived. {@link planPurge} is the only
 * function here that returns rows to delete (INV-QD-101, INV-QD-130).
 */
import * as Data from "effect/Data";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import type { VerifiedArchive } from "./AuditArchive.ts";
import type { AuditEntry } from "./AuditEntry.ts";

export interface RetentionPolicy {
  /** An entry older than this, relative to `now`, is past its age. */
  readonly maxAgeMs: number;
}

/**
 * `planRetention` or `planPurge` refused its input: `now` is not a finite
 * number, or `maxAgeMs` is `NaN` or negative. `value` is the offending number.
 */
export class RetentionInputInvalid extends Data.TaggedError("RetentionInputInvalid")<{
  readonly field: "now" | "maxAgeMs";
  readonly value: number;
}> {}

/**
 * What an age check decided, by one pass over the entries.
 *
 * `retained` and `expired` partition the input — `retained ∪ expired =
 * entries`, `retained ∩ expired = ∅` (INV-QD-053). `expired` is rows past
 * their age; it is a report, **not a purge selection** — nothing here knows
 * whether a row was archived (see {@link planPurge}). `undated` is the part of
 * `retained` whose `at` is not a finite number (`NaN`, `±Infinity`): such a
 * row's age is unknown, so it is kept, and reported here rather than silently.
 */
export interface RetentionPlan {
  readonly retained: ReadonlyArray<AuditEntry>;
  readonly expired: ReadonlyArray<AuditEntry>;
  readonly undated: ReadonlyArray<AuditEntry>;
}

/**
 * The one age rule: which rows are past `policy`'s limit.
 *
 * Refuses `RetentionInputInvalid` when `now` is not finite or `maxAgeMs` is
 * `NaN` or negative (`+Infinity` is valid and means "retain forever").
 * Otherwise one pass: a row with a non-finite `at` is retained and `undated`;
 * one with `now - at > maxAgeMs` is expired; the rest are retained. Use it to
 * see what would expire before an archive exists; to select rows for deletion
 * use {@link planPurge}, which needs the archive.
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
  const expired: Array<AuditEntry> = [];
  const undated: Array<AuditEntry> = [];
  for (const entry of entries) {
    const at = entry.record.at;
    if (!Number.isFinite(at)) {
      retained.push(entry);
      undated.push(entry);
    } else if (now - at > policy.maxAgeMs) {
      expired.push(entry);
    } else {
      retained.push(entry);
    }
  }
  return Result.succeed({ retained, expired, undated });
};

/**
 * What a purge run decided: the rows to delete, and why every other row stays.
 *
 * `purge` and `retain` partition the input. `purge` holds only rows past their
 * age that the archive also holds; `unarchived` is the age-expired rows the
 * archive does not hold (they are in `retain`, so the caller can see what is
 * waiting on an archive); `undated` is as in {@link RetentionPlan}.
 * `sequenceIntegrityVerified` is the archive's own flag, copied for the
 * caller — an unsequenced trail can still be purged.
 */
export interface PurgePlan {
  readonly purge: ReadonlyArray<AuditEntry>;
  readonly retain: ReadonlyArray<AuditEntry>;
  readonly undated: ReadonlyArray<AuditEntry>;
  readonly unarchived: ReadonlyArray<AuditEntry>;
  readonly sequenceIntegrityVerified: boolean;
}

/**
 * Which rows may be deleted: past their age, and held by `archive`.
 *
 * Runs {@link planRetention}'s age rule, then takes each expired row's
 * counterpart out of the archive, in input order: a row `archive` holds goes
 * to `purge` and uses up one archived copy (two identical rows need two), a
 * row it does not hold stays in `retain` and is listed in `unarchived`. Rows
 * are compared structurally, so a row read back from a store matches the
 * archived one, and a row edited after archiving does not.
 *
 * `archive` is a {@link VerifiedArchive}: it can only come from
 * `readAuditArchive` over bytes the store returned, so the archive-before-purge
 * order is a property of the types rather than a duty. What that proves, and
 * what it does not (durability, tamper-evidence), is on its own doc. Selects
 * only; `@qadi/audit` deletes nothing. Cost is one structural hash per row
 * (about 25 µs measured), so a million-row run is a batch job.
 */
export const planPurge = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
  archive: VerifiedArchive,
): Result.Result<PurgePlan, RetentionInputInvalid> =>
  Result.map(planRetention(entries, policy, now), (age) => {
    const expired = new Set(age.expired);
    const consumed = MutableHashMap.empty<AuditEntry, number>();
    const purge: Array<AuditEntry> = [];
    const retain: Array<AuditEntry> = [];
    const unarchived: Array<AuditEntry> = [];
    for (const entry of entries) {
      if (!expired.has(entry)) {
        retain.push(entry);
        continue;
      }
      const used = Option.getOrElse(MutableHashMap.get(consumed, entry), () => 0);
      if (used < archive.holds(entry)) {
        MutableHashMap.set(consumed, entry, used + 1);
        purge.push(entry);
      } else {
        retain.push(entry);
        unarchived.push(entry);
      }
    }
    return {
      purge,
      retain,
      undated: age.undated,
      unarchived,
      sequenceIntegrityVerified: archive.sequenceIntegrityVerified,
    };
  });
