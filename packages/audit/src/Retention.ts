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
 * and only when its archive holds it.** `now` is finite, `maxAgeMs >= 0`, and
 * `now - at > maxAgeMs` (the age rule, in {@link planRetention}); and a
 * {@link VerifiedArchive} read back from storage holds the row
 * ({@link planPurge}). A row's `at` is finite because only the codec makes a
 * row and its decode refuses any other (ADR-QD-190), and {@link planRetention}
 * refuses a list holding a row the codec did not make, so the rule has no case
 * for an unknown age. Fail-closed for a deletion selector means retaining,
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
import { rowsRefusal } from "./CodecMade.ts";
import type { RowsRefusalCases } from "./CodecMade.ts";

export interface RetentionPolicy {
  /** An entry older than this, relative to `now`, is past its age. */
  readonly maxAgeMs: number;
}

/**
 * Why `planRetention` or `planPurge` refused its input, one member per case.
 *
 * - `NowNotFinite`: `now` is not a finite number, and `value` is the value given.
 * - `MaxAgeInvalid`: `maxAgeMs` is `NaN` or negative, and `value` is the value given.
 * - `EntriesNotAList`: `entries` is not a list, and `value` is the value given.
 * - `EntryNotMadeByCodec`: the entry at `index`, the first, is not a row the codec made
 *   (`CodecMade.ts`, ADR-QD-190).
 *
 * `unknown` appears only where a member holds a value the caller gave, and `index` is
 * always a number. The last two members are the ones `ArchiveInputRefusal`
 * (`ArchiveFacts.ts`) has too, stated once in `CodecMade.ts`.
 */
export type RetentionInputRefusal = Data.TaggedEnum<
  RowsRefusalCases & {
    NowNotFinite: { readonly value: unknown };
    MaxAgeInvalid: { readonly value: unknown };
  }
>;

/** Constructors and guards for {@link RetentionInputRefusal}. */
export const RetentionInputRefusal = Data.taggedEnum<RetentionInputRefusal>();

/**
 * `planRetention` or `planPurge` refused its input; `refusal` says which.
 *
 * A typed result, never thrown. Shaped like `ArchiveInputInvalid` (`ArchiveFacts.ts`), a
 * `refusal` that is a closed `Data.TaggedEnum`, and a different error because the
 * refusals differ by which call refused.
 */
export class RetentionInputInvalid extends Data.TaggedError("RetentionInputInvalid")<{
  readonly refusal: RetentionInputRefusal;
}> {}

/**
 * What an age check decided, by one pass over the entries.
 *
 * `retained` and `expired` partition the input — `retained ∪ expired =
 * entries`, `retained ∩ expired = ∅` (INV-QD-053). `expired` is rows past
 * their age; it is a report, **not a purge selection** — nothing here knows
 * whether a row was archived (see {@link planPurge}).
 */
export interface RetentionPlan {
  readonly retained: ReadonlyArray<AuditEntry>;
  readonly expired: ReadonlyArray<AuditEntry>;
}

const refuse = (refusal: RetentionInputRefusal) =>
  Result.fail(new RetentionInputInvalid({ refusal }));

/**
 * The one age rule: which rows are past `policy`'s limit.
 *
 * Refuses `RetentionInputInvalid` when `now` is not finite (`NowNotFinite`) or `maxAgeMs`
 * is `NaN` or negative (`MaxAgeInvalid`; `+Infinity` is valid and means "retain
 * forever"), and then when `entries` is not a list (`EntriesNotAList`) or an entry is not
 * a row the codec made (`EntryNotMadeByCodec`, the index of the first). A store client's
 * `any` and a JavaScript caller's literal pass the type; a row of unknown shape has no
 * age to read. Otherwise one pass: a row with
 * `now - at > maxAgeMs` is expired and the rest are retained. Use it to see what
 * would expire before an archive exists; to select rows for deletion use
 * {@link planPurge}, which needs the archive.
 */
export const planRetention = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
): Result.Result<RetentionPlan, RetentionInputInvalid> => {
  if (!Number.isFinite(now)) {
    return refuse(RetentionInputRefusal.NowNotFinite({ value: now }));
  }
  if (!(policy.maxAgeMs >= 0)) {
    return refuse(RetentionInputRefusal.MaxAgeInvalid({ value: policy.maxAgeMs }));
  }
  const refused = rowsRefusal(entries);
  if (refused !== undefined) {
    return refuse(refused);
  }
  const retained: Array<AuditEntry> = [];
  const expired: Array<AuditEntry> = [];
  for (const entry of entries) {
    if (now - entry.record.at > policy.maxAgeMs) {
      expired.push(entry);
    } else {
      retained.push(entry);
    }
  }
  return Result.succeed({ retained, expired });
};

/**
 * What a purge run decided: the rows to delete, and why every other row stays.
 *
 * `purge` and `retain` partition the input. `purge` holds only rows past their
 * age that the archive also holds; `unarchived` is the age-expired rows the
 * archive does not hold (they are in `retain`, so the caller can see what is
 * waiting on an archive).
 * `sequenceIntegrityVerified` is the archive's own flag, copied for the
 * caller — an unsequenced trail can still be purged.
 */
export interface PurgePlan {
  readonly purge: ReadonlyArray<AuditEntry>;
  readonly retain: ReadonlyArray<AuditEntry>;
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
 * A row the codec did not make is refused by that age rule, and the archive
 * would not hold it in any case: `holds` counts by structural equality with the
 * archived rows, which are all codec-made class instances, so a plain object
 * with the same fields has no copy there.
 *
 * `archive` is a {@link VerifiedArchive}: it can only come from
 * `readAuditArchive` over bytes the store returned, so the archive-before-purge
 * order is a property of the types rather than a duty. What that proves, and
 * what it does not (durability, tamper-evidence), is on its own doc. Selects
 * only; `@qadi/audit` deletes nothing. Cost is one structural hash per row (the
 * whole call measured about 22 µs per row, ADR-QD-190), so a million-row run is a
 * batch job.
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
      unarchived,
      sequenceIntegrityVerified: archive.sequenceIntegrityVerified,
    };
  });
