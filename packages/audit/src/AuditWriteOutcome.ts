/**
 * What became of one `SinkRecord` handed to `AuditDecisionSinkLive` — the
 * pipeline's answer to "where did this entry end up?", as a value.
 *
 * Before ARCH-35 the answer was implied by which combination of metrics and log
 * lines a branch of `record` happened to fire, and two of the eleven
 * combinations fired nothing that said "lost". `record` now returns exactly one
 * {@link AuditWriteOutcome} per record from the port calls alone, and a single
 * projection (`AuditWriteReport.ts`) turns it into its metrics, its log line and
 * its hooks. A twelfth case is one compile error there, and a caller's
 * `onOutcome` hook reads the same value the metrics were derived from.
 *
 * The union is closed and nested so an illegal state cannot be built: a
 * `Written` entry cannot carry a `Staged` (uncommitted) copy, because a write
 * that succeeded either committed its staged copy or failed to. Eleven leaves,
 * each one a row of the table in BEH-QD-252.
 */
import * as Data from "effect/Data";
import type * as Cause from "effect/Cause";
import * as Match from "effect/Match";
import type { AuditEntry, AuditEntryNotEncodable } from "./AuditEntry.ts";
import type { AuditStagingError } from "./AuditStagingPort.ts";

/**
 * The staging result of a record whose trail write **succeeded**.
 *
 * - `NotWired`: no `AuditStagingPort` is wired.
 * - `StageFailed`: `stage()` failed or died; the write still ran and succeeded,
 *   so the entry is in the trail without a staged copy. Carries no cause: the
 *   pipeline has never logged one.
 * - `Committed`: staged, written, and the staged copy committed.
 * - `CommitFailed`: staged and written, but `commit` failed or died. The entry
 *   is durable in the trail; only the staging store's bookkeeping is stale.
 */
export type WrittenStaging = Data.TaggedEnum<{
  NotWired: {};
  StageFailed: {};
  Committed: {};
  CommitFailed: { readonly cause: Cause.Cause<AuditStagingError> };
}>;

/** Constructors and guards for {@link WrittenStaging}. */
export const WrittenStaging = Data.taggedEnum<WrittenStaging>();

/**
 * The staging result of a record whose trail write **did not succeed** —
 * because it failed, or because the circuit breaker refused it.
 *
 * - `NotWired`: no `AuditStagingPort` is wired, so nothing holds the entry.
 * - `Staged`: `stage()` succeeded; the staged copy is left alone for the
 *   caller's reconciliation (ticket #5), so the entry is recoverable.
 * - `StageFailed`: `stage()` failed or died; nothing holds the entry.
 */
export type UnwrittenStaging = Data.TaggedEnum<{
  NotWired: {};
  Staged: {};
  StageFailed: {};
}>;

/** Constructors and guards for {@link UnwrittenStaging}. */
export const UnwrittenStaging = Data.taggedEnum<UnwrittenStaging>();

/**
 * Where one record ended up, with how its staging went.
 *
 * - `Refused`: the record could not be encoded for the trail; no row, no
 *   staging, no write attempt. Carries the refusal, not an entry, because none
 *   was produced.
 * - `Written`: the trail write succeeded.
 * - `WriteFailed`: the breaker admitted the record and the trail write failed
 *   or died.
 * - `Skipped`: the breaker refused the record, so no write was attempted.
 *
 * Every non-`Refused` case carries the encoded `entry`, so a caller's
 * `onOutcome` can dead-letter a lost entry or write ADR-QD-056's gap marker
 * itself. The library writes none.
 */
export type AuditWriteOutcome = Data.TaggedEnum<{
  Refused: { readonly refusal: AuditEntryNotEncodable };
  Written: { readonly entry: AuditEntry; readonly staging: WrittenStaging };
  WriteFailed: { readonly entry: AuditEntry; readonly staging: UnwrittenStaging };
  Skipped: { readonly entry: AuditEntry; readonly staging: UnwrittenStaging };
}>;

/** Constructors and guards for {@link AuditWriteOutcome}. */
export const AuditWriteOutcome = Data.taggedEnum<AuditWriteOutcome>();

/**
 * Where an entry is recoverable from.
 *
 * - `Trail`: written.
 * - `StagingOnly`: not written, but its staged copy exists.
 * - `Lost`: in neither the trail nor staging.
 * - `Refused`: never encodable, so there was never an entry to keep.
 */
export type Durability = "Trail" | "StagingOnly" | "Lost" | "Refused";

// A helper, not a literal: a `Match` arm returning `"Lost"` infers `string`.
const durability = (d: Durability): Durability => d;

const unwrittenDurability: (self: UnwrittenStaging) => Durability = Match.type<UnwrittenStaging>().pipe(
  Match.tagsExhaustive({
    NotWired: () => durability("Lost"),
    Staged: () => durability("StagingOnly"),
    StageFailed: () => durability("Lost"),
  }),
);

/**
 * Whether an outcome's entry survives, and where.
 *
 * The single place "lost or not" is decided: the lost-entry counter, the
 * warning-versus-info choice and a caller's dead-letter decision all read it,
 * so they cannot disagree.
 */
export const durabilityOf: (self: AuditWriteOutcome) => Durability = Match.type<AuditWriteOutcome>().pipe(
  Match.tagsExhaustive({
    Refused: () => durability("Refused"),
    Written: () => durability("Trail"),
    WriteFailed: (o) => unwrittenDurability(o.staging),
    Skipped: (o) => unwrittenDurability(o.staging),
  }),
);
