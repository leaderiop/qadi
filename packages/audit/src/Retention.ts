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
 * and only when its archive holds it.** `now` is finite, `maxAgeMs` is a number `>= 0`, and
 * `now - at > maxAgeMs` (the age rule both plans run); and a
 * {@link VerifiedArchive} read back from storage holds the row
 * ({@link planPurge}). A row's `at` is finite because only the codec makes a
 * row and its decode refuses any other (ADR-QD-190), and the step in
 * `HostBatch.ts` admits each batch first, refusing a list holding a row the
 * codec did not make, so the rule has no case for an unknown age. Fail-closed
 * for a deletion selector means retaining, never expiring: a wrong retain keeps
 * a row too long, a wrong purge destroys evidence that may never have been
 * archived. {@link planPurge} is the only function here that returns rows to
 * delete (INV-QD-101, INV-QD-130).
 */
import * as Data from "effect/Data";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import type { VerifiedArchive } from "./AuditArchive.ts";
import type { AuditEntry } from "./AuditEntry.ts";
import type { RowsRefusalCases } from "./CodecMade.ts";
import { admitBatch } from "./HostBatch.ts";
import type { AdmittedBatch, NowRefusalCases } from "./HostBatch.ts";

export interface RetentionPolicy {
  /** An entry older than this, relative to `now`, is past its age. */
  readonly maxAgeMs: number;
}

/**
 * Why `planRetention` or `planPurge` refused its input, one member per case.
 *
 * - `NowNotFinite`: `now` is not a finite number, and `value` is the value given
 *   (`HostBatch.ts`, the one step that admits a batch).
 * - `MaxAgeInvalid`: `maxAgeMs` is not a number from zero up (`NaN`, negative, or not a number at all), and `value`
 *   is the value given.
 * - `EntriesNotAList`: `entries` is not a list, and `value` is the value given.
 * - `EntryNotMadeByCodec`: the entry at `index`, the first, is not a row the codec made
 *   (`CodecMade.ts`, ADR-QD-190).
 *
 * `unknown` appears only where a member holds a value the caller gave, and `index` is
 * always a number. The last two members are the ones `ArchiveInputRefusal`
 * (`ArchiveFacts.ts`) has too, stated once in `CodecMade.ts`, and `NowNotFinite` is the
 * fragment `ArchiveInputRefusal` shares, stated once in `HostBatch.ts`.
 */
export type RetentionInputRefusal = Data.TaggedEnum<
  RowsRefusalCases &
    NowRefusalCases & {
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

/**
 * Reads the policy's age limit once, and refuses one that is not a number from zero up.
 *
 * `+Infinity`, `0` and `-0` are valid. Only a primitive number is compared, so nothing is converted: `null`, a
 * boolean, a string, a list, a boxed number, an object with its own `valueOf`, a Symbol and an object with no
 * prototype are each refused with the value given, and none of them is read as `0` or throws. A `null` or
 * `undefined` policy, and one with no limit, is refused with `value` `undefined`, so a host's missing policy is a
 * typed refusal rather than a thrown read.
 */
const maxAgeOf = (
  policy: RetentionPolicy,
): Result.Result<number, ReturnType<typeof RetentionInputRefusal.MaxAgeInvalid>> => {
  const value: unknown = policy?.maxAgeMs;
  return typeof value === "number" && value >= 0
    ? Result.succeed(value)
    : Result.fail(RetentionInputRefusal.MaxAgeInvalid({ value }));
};

/**
 * Splits an admitted batch by the age rule: a row with `now - at > maxAgeMs` is expired, the rest are retained.
 *
 * The limit is the number the terms check admitted, never the policy read a second time.
 */
const ageRule = (batch: AdmittedBatch<number>): RetentionPlan => {
  const retained: Array<AuditEntry> = [];
  const expired: Array<AuditEntry> = [];
  for (const entry of batch.rows.entries) {
    if (batch.now - entry.record.at > batch.terms) {
      expired.push(entry);
    } else {
      retained.push(entry);
    }
  }
  return { retained, expired };
};

/**
 * Which rows are past `policy`'s limit: a {@link RetentionPlan} of the rows retained and the rows expired, or
 * `RetentionInputInvalid`.
 *
 * The step in `HostBatch.ts` admits the batch first and each input is read once, so the plan reads the number the
 * limit check admitted and the rows it checked. Refuses `RetentionInputInvalid` when `now` is not finite
 * (`NowNotFinite`), `maxAgeMs` is not a number from zero up or is absent (`MaxAgeInvalid`; `+Infinity` is valid and
 * means "retain forever"), `entries` is not a list (`EntriesNotAList`) or an entry is not a row the codec made
 * (`EntryNotMadeByCodec`, the index of the first). A store client's `any` and a JavaScript caller's literal pass the
 * type; a row of unknown shape has no age to read. Otherwise one pass: a row with `now - at > maxAgeMs` is expired
 * and the rest are retained. Use it to see what would expire before an archive exists; to select rows for deletion
 * use {@link planPurge}, which needs the archive. The rule itself is the module-private age rule both plans run.
 */
export const planRetention = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
): Result.Result<RetentionPlan, RetentionInputInvalid> => {
  const admitted = admitBatch({ now, terms: () => maxAgeOf(policy), entries });
  if (Result.isFailure(admitted)) {
    return Result.fail(new RetentionInputInvalid({ refusal: admitted.failure }));
  }
  return Result.succeed(ageRule(admitted.success));
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
 * The step in `HostBatch.ts` admits this call's own batch first and each input is read once, so the archive is never
 * asked about a refused batch and the pass below reads the rows the step checked, not the list given. It then runs
 * the age rule {@link planRetention} runs, and takes each expired row's counterpart out of the archive, in input
 * order: a row `archive` holds goes to `purge` and uses up one archived copy (two identical rows need two), a row it
 * does not hold stays in `retain` and is listed in `unarchived`. Rows are compared structurally, so a row read back
 * from a store matches the archived one, and a row edited after archiving does not.
 *
 * A row the codec did not make is refused when the batch is admitted, and the archive would not hold it in any case:
 * `holds` counts by structural equality with the archived rows, which are all codec-made class instances, so a plain
 * object with the same fields has no copy there.
 *
 * `archive` is a {@link VerifiedArchive}: it can only come from `readAuditArchive` over bytes the store returned, so
 * the archive-before-purge order is a property of the types rather than a duty. What that proves, and what it does
 * not (durability, tamper-evidence), is on its own doc. Selects only; `@qadi/audit` deletes nothing. Cost is one
 * structural hash per row (the whole call measured about 22 µs per row, ADR-QD-190), so a million-row run is a batch
 * job.
 */
export const planPurge = (
  entries: ReadonlyArray<AuditEntry>,
  policy: RetentionPolicy,
  now: number,
  archive: VerifiedArchive,
): Result.Result<PurgePlan, RetentionInputInvalid> => {
  const admitted = admitBatch({ now, terms: () => maxAgeOf(policy), entries });
  if (Result.isFailure(admitted)) {
    return Result.fail(new RetentionInputInvalid({ refusal: admitted.failure }));
  }
  const expired = new Set(ageRule(admitted.success).expired);
  const consumed = MutableHashMap.empty<AuditEntry, number>();
  const purge: Array<AuditEntry> = [];
  const retain: Array<AuditEntry> = [];
  const unarchived: Array<AuditEntry> = [];
  for (const entry of admitted.success.rows.entries) {
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
  return Result.succeed({
    purge,
    retain,
    unarchived,
    sequenceIntegrityVerified: archive.sequenceIntegrityVerified,
  });
};
