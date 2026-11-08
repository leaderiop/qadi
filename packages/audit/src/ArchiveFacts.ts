/**
 * The facts of a list of audit entries, computed once: their archive order, how
 * many are sequenced and what that lets an archive claim, the first sequence gap
 * or duplicate, and where the list as given departs from archive order.
 *
 * `archiveAuditTrail` builds its bundle from these facts and `readAuditArchive`
 * recomputes them and compares them with the bundle's claims, so neither restates
 * a rule (ARCH-48, ADR-QD-110). Before this module the writer ordered with a
 * comparator, the reader with a separate loop, and each counted sequenced entries
 * for itself; a reader that drifted from the writer would either refuse archives
 * this package wrote, which blocks a purge, or accept ones it did not, which
 * weakens ARCH-38's evidence.
 *
 * The module is out of the barrel, so it is package-private (ADR-QD-099); the two
 * names that are public, `verifySequenceIntegrity` and `SequenceIntegrityError`,
 * reach the barrel through [SequenceIntegrity.ts](./SequenceIntegrity.ts), which
 * re-exports them. The check is gap-and-duplicate detection, not tamper-evidence
 * (see that file).
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type { AuditEntry } from "./AuditEntry.ts";

/** The first place a sorted run of sequence numbers is not `previous + 1`. */
export interface SequenceBreak {
  readonly expectedSequence: number;
  readonly actualSequence: number;
}

/** What {@link archiveFacts} says about a list of entries. */
export interface ArchiveFacts {
  /** The entries in archive order: sequenced by number, then unsequenced in the order given. */
  readonly ordered: ReadonlyArray<AuditEntry>;
  /** How many entries carry a `sequenceNumber`. */
  readonly sequencedCount: number;
  /** What an archive of these entries may claim: true exactly when two or more are sequenced. */
  readonly sequenceIntegrityVerified: boolean;
  /** The first gap or duplicate among the sequence numbers, if any. */
  readonly sequenceBreak: SequenceBreak | undefined;
  /** The index, in the order given, of the first entry that sorts before its predecessor. */
  readonly outOfOrderAt: number | undefined;
}

/**
 * The archive order: sequenced entries by number, every unsequenced entry after
 * every sequenced one.
 *
 * Two unsequenced entries compare as `NaN`; `toSorted` reads that as `+0`, so they
 * keep their given order (ARCH-29, CCR-QD-185), and the scan in {@link archiveFacts}
 * reads it as "not out of order".
 */
const archiveOrder = (a: AuditEntry, b: AuditEntry): number =>
  (a.sequenceNumber ?? Number.POSITIVE_INFINITY) - (b.sequenceNumber ?? Number.POSITIVE_INFINITY);

/**
 * The first gap or duplicate in `sorted`, an ascending run of sequence numbers.
 *
 * Each number is compared with the one before it, held in a variable, so no index
 * lookup can come back `undefined`.
 */
const firstBreakIn = (sorted: ReadonlyArray<number>): SequenceBreak | undefined => {
  let previous: number | undefined;
  for (const actual of sorted) {
    if (previous !== undefined && actual !== previous + 1) {
      return { expectedSequence: previous + 1, actualSequence: actual };
    }
    previous = actual;
  }
  return undefined;
};

/**
 * The facts of `entries`. Pure.
 *
 * The order, the claim and the break are each stated here and nowhere else. The
 * out-of-order index is derived from the same comparator that orders `ordered`,
 * so the reader's reading of "in order" is the writer's.
 *
 * Entries with no `sequenceNumber` contribute nothing to the count or the break
 * (`flatMap` drops them, so there is no predicate to get wrong).
 */
export const archiveFacts = (entries: ReadonlyArray<AuditEntry>): ArchiveFacts => {
  const sequenceNumbers = entries
    .flatMap((entry) => (entry.sequenceNumber === undefined ? [] : [entry.sequenceNumber]))
    .toSorted((a, b) => a - b);
  let outOfOrderAt: number | undefined;
  let previous: AuditEntry | undefined;
  for (const [index, entry] of entries.entries()) {
    if (previous !== undefined && archiveOrder(previous, entry) > 0) {
      outOfOrderAt = index;
      break;
    }
    previous = entry;
  }
  const sequencedCount = sequenceNumbers.length;
  return {
    ordered: entries.toSorted(archiveOrder),
    sequencedCount,
    sequenceIntegrityVerified: sequencedCount >= 2,
    sequenceBreak: firstBreakIn(sequenceNumbers),
    outOfOrderAt,
  };
};

export class SequenceIntegrityError extends Data.TaggedError("SequenceIntegrityError")<{
  readonly expectedSequence: number;
  readonly actualSequence: number;
}> {}

/**
 * The facts of `entries`, or `SequenceIntegrityError` at their first gap or
 * duplicate: the writer's reading of them.
 *
 * The Effect wrapper `archiveAuditTrail` needs, and the one place a break becomes
 * a failure (ARCH-48, ADR-QD-110). The span keeps the name it had before the facts
 * were gathered here, so a trace shows the same span under `archiveAuditTrail` and
 * under the public check.
 */
export const verifiedArchiveFacts = Effect.fn("qadi.audit.verifySequenceIntegrity")(function* (
  entries: ReadonlyArray<AuditEntry>,
) {
  const facts = archiveFacts(entries);
  if (facts.sequenceBreak !== undefined) {
    return yield* Effect.fail(new SequenceIntegrityError(facts.sequenceBreak));
  }
  return facts;
});

/**
 * Entries with no `sequenceNumber` are ignored — sequencing is opt-in, and a
 * caller who never assigns one has nothing here to verify.
 *
 * Detects both a gap (a jump past the expected next number) and a duplicate
 * (the same number twice, which sorts to *less* than expected) — one check
 * catches both, since a duplicate's `actual` is never equal to
 * `expected = previous + 1`.
 *
 * Unnamed on purpose: the span is `verifiedArchiveFacts`'s, so a call opens
 * exactly one.
 */
export const verifySequenceIntegrity = Effect.fn(function* (entries: ReadonlyArray<AuditEntry>) {
  yield* verifiedArchiveFacts(entries);
});
