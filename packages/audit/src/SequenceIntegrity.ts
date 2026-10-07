/**
 * Sequence-gap verification over already-persisted `AuditEntry` rows.
 *
 * Named for what this actually checks — a caller-assigned sequence number has
 * no gap or duplicate — not for what it does not: there is no per-entry hash,
 * nothing links one entry to the next, and nothing here is cryptographically
 * verified. An attacker who can modify stored rows can also renumber them,
 * defeating this check entirely; it catches accidental loss or duplication in
 * the caller's own store, not deliberate tampering. `ADR-QD-056` scopes this
 * capability as "gap-and-duplicate detection" for the same reason. (Renamed
 * from `ChainIntegrity`/`verifyChainIntegrity`/`ChainIntegrityError`, which
 * read as tamper-evidence to a compliance reviewer and were not.)
 *
 * No grouping key — HexDi groups by `scopeId`; Qadi has no such concept, ruled
 * out during the Retention ticket's resolution. Sequencing here is a single
 * flat, global sequence: whatever `sequenceNumber`s the caller's own store
 * assigned at write time, read back and checked for gaps.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type { AuditEntry } from "./AuditEntry.ts";

export class SequenceIntegrityError extends Data.TaggedError("SequenceIntegrityError")<{
  readonly expectedSequence: number;
  readonly actualSequence: number;
}> {}

/** The first place a sorted run of sequence numbers is not `previous + 1`. */
export interface SequenceBreak {
  readonly expectedSequence: number;
  readonly actualSequence: number;
}

/**
 * The first gap or duplicate among the entries' `sequenceNumber`s, if any.
 *
 * Package-private (not barrelled): {@link verifySequenceIntegrity} and
 * `readAuditArchive` (`AuditArchive.ts`) both ask the same question of
 * different carriers, and the answer is one function. Entries with no
 * `sequenceNumber` contribute nothing (`flatMap` drops them, so there is no
 * predicate to get wrong); the rest are sorted, and each is compared with the
 * one before it held in a variable, so no index lookup can come back
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

/**
 * Entries with no `sequenceNumber` are ignored — sequencing is opt-in, and a
 * caller who never assigns one has nothing here to verify.
 *
 * Detects both a gap (a jump past the expected next number) and a duplicate
 * (the same number twice, which sorts to *less* than expected) — one check
 * catches both, since a duplicate's `actual` is never equal to
 * `expected = previous + 1`.
 */
export const verifySequenceIntegrity = Effect.fn("qadi.audit.verifySequenceIntegrity")(function* (
  entries: ReadonlyArray<AuditEntry>,
) {
  const broken = firstSequenceBreak(entries);
  if (broken !== undefined) {
    return yield* Effect.fail(new SequenceIntegrityError(broken));
  }
});
