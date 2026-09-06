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
  const sequenceNumbers = entries
    .map((entry) => entry.sequenceNumber)
    .filter((n): n is number => n !== undefined)
    .toSorted((a, b) => a - b);

  for (let i = 1; i < sequenceNumbers.length; i++) {
    const previous = sequenceNumbers[i - 1];
    const actual = sequenceNumbers[i];
    if (previous === undefined || actual === undefined) continue;
    const expected = previous + 1;
    if (actual !== expected) {
      return yield* Effect.fail(
        new SequenceIntegrityError({ expectedSequence: expected, actualSequence: actual }),
      );
    }
  }
});
