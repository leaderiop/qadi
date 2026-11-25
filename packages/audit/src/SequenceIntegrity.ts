/**
 * The public sequence check, `verifySequenceIntegrity` and `SequenceIntegrityError`,
 * re-exported from `ArchiveFacts.ts`.
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
 *
 * The file survives the move of the check into `ArchiveFacts.ts` (ARCH-48,
 * ADR-QD-110) because the barrel's `export *` line for this module is what keeps
 * the two names public, while `ArchiveFacts.ts` stays out of the barrel
 * (ADR-QD-099). The package README, `spec/urs.md`, `spec/models/17-purpose.md`
 * and ADR-QD-009 cite this file for the disclaimers above.
 */
export { SequenceIntegrityError, verifySequenceIntegrity } from "./ArchiveFacts.ts";
