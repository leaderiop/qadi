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
 * The module is out of the barrel, so it is package-private (ADR-QD-099). The
 * check is gap-and-duplicate detection, not tamper-evidence (see
 * [SequenceIntegrity.ts](./SequenceIntegrity.ts)).
 */
import type { AuditEntry } from "./AuditEntry.ts";
import { firstSequenceBreak } from "./SequenceBreak.ts";
import type { SequenceBreak } from "./SequenceBreak.ts";

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
 * The facts of `entries`. Pure.
 *
 * The order, the claim and the break are each stated here and nowhere else. The
 * out-of-order index is derived from the same comparator that orders `ordered`,
 * so the reader's reading of "in order" is the writer's.
 */
export const archiveFacts = (entries: ReadonlyArray<AuditEntry>): ArchiveFacts => {
  const sequencedCount = entries.filter((entry) => entry.sequenceNumber !== undefined).length;
  let outOfOrderAt: number | undefined;
  let previous: AuditEntry | undefined;
  for (const [index, entry] of entries.entries()) {
    if (previous !== undefined && archiveOrder(previous, entry) > 0) {
      outOfOrderAt = index;
      break;
    }
    previous = entry;
  }
  return {
    ordered: entries.toSorted(archiveOrder),
    sequencedCount,
    sequenceIntegrityVerified: sequencedCount >= 2,
    sequenceBreak: firstSequenceBreak(entries),
    outOfOrderAt,
  };
};
