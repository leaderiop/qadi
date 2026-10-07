/**
 * The one gap-and-duplicate check, shared by `verifySequenceIntegrity`
 * ([SequenceIntegrity.ts](./SequenceIntegrity.ts)) and `readAuditArchive`
 * ([AuditArchive.ts](./AuditArchive.ts)).
 *
 * Kept in a module of its own, outside the barrel, so it stays package-private
 * (ADR-QD-099): the two callers ask the same question of different carriers
 * and the answer is one function.
 */
import type { AuditEntry } from "./AuditEntry.ts";

/** The first place a sorted run of sequence numbers is not `previous + 1`. */
export interface SequenceBreak {
  readonly expectedSequence: number;
  readonly actualSequence: number;
}

/**
 * The first gap or duplicate among the entries' `sequenceNumber`s, if any.
 *
 * Entries with no `sequenceNumber` contribute nothing (`flatMap` drops them, so
 * there is no predicate to get wrong); the rest are sorted, and each is compared
 * with the one before it held in a variable, so no index lookup can come back
 * `undefined`.
 */
export const firstSequenceBreak = (entries: ReadonlyArray<AuditEntry>): SequenceBreak | undefined => {
  const sorted = entries
    .flatMap((entry) => (entry.sequenceNumber === undefined ? [] : [entry.sequenceNumber]))
    .toSorted((a, b) => a - b);
  let previous: number | undefined;
  for (const actual of sorted) {
    if (previous !== undefined && actual !== previous + 1) {
      return { expectedSequence: previous + 1, actualSequence: actual };
    }
    previous = actual;
  }
  return undefined;
};
