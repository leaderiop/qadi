/**
 * Whether an audit entry that was not written to the trail was lost, and the word that names why: one row per unwritten staging.
 *
 * `durabilityOf`, the lost-entry counter's label and the unwritten line's level
 * and wording all read this row, so they cannot disagree (ARCH-95, ADR-QD-161).
 * The three tags are declared structurally here because importing `UnwrittenStaging` from
 * `AuditWriteOutcome.ts`, which imports this module, would be an import cycle
 * (ADR-QD-037), and a fourth variant passed to {@link unwrittenRow} is a
 * compile error at every call.
 *
 * Package-private (ADR-QD-099): not exported from the barrel.
 */
import * as Match from "effect/Match";

/** The word on `qadi_audit_entries_lost_total`'s `staging` label. */
export type LostWord = "not_wired" | "failed";

/** What an unwritten entry's staging says: still held by staging, or lost, and named. */
export type UnwrittenRow =
  | { readonly durability: "StagingOnly" }
  | { readonly durability: "Lost"; readonly lost: LostWord };

/** The three `UnwrittenStaging` variants, by tag. */
export type UnwrittenTag =
  | { readonly _tag: "NotWired" }
  | { readonly _tag: "Staged" }
  | { readonly _tag: "StageFailed" };

// Builders, not literals: a `Match` arm returning an object literal infers `string`.
const lostRow = (lost: LostWord): UnwrittenRow => ({ durability: "Lost", lost });
const STAGING_ONLY: UnwrittenRow = { durability: "StagingOnly" };

/** The row for one unwritten staging. */
export const unwrittenRow: (self: UnwrittenTag) => UnwrittenRow = Match.type<UnwrittenTag>().pipe(
  Match.tagsExhaustive({
    NotWired: () => lostRow("not_wired"),
    Staged: () => STAGING_ONLY,
    StageFailed: () => lostRow("failed"),
  }),
);
