/**
 * Archive export and read-back — bundling a verified, ordered set of
 * `AuditEntry` rows for long-term storage or transfer ({@link archiveAuditTrail}),
 * and reading a stored bundle back as the evidence a purge needs
 * ({@link readAuditArchive}, {@link VerifiedArchive}).
 *
 * Export is the first step of retiring an audited system and runs the
 * sequence check in the same call; read-back is what lets `planPurge`
 * ([Retention.ts](./Retention.ts)) select a row for deletion only when the
 * archive a store handed back holds it (ADR-QD-056, ARCH-38).
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { UNTRUSTED_DECODE_OPTIONS } from "@qadi/core";
import type { DecodeRefusal } from "@qadi/core";
import { decodeAuditEntry } from "./AuditEntry.ts";
import type { AuditEntry } from "./AuditEntry.ts";
import { firstSequenceBreak, verifySequenceIntegrity } from "./SequenceIntegrity.ts";

/**
 * Opaque pass-through metadata `@qadi/audit` never validates or interprets —
 * the same reauthentication-style refusal
 * [SignatureCapturePort.ts](./SignatureCapturePort.ts) makes for
 * `algorithm`/`keyId`, one layer up: identity and key material are outside
 * this library's competence, so the shape is carried, not judged.
 */
export interface KeyMaterial {
  readonly keyId: string;
  readonly algorithm: string;
  readonly publicKey: string;
}

export interface ArchivalOptions {
  readonly keyMaterial?: ReadonlyArray<KeyMaterial> | undefined;
}

/**
 * The bundle {@link archiveAuditTrail} builds. **Not tamper-evident** (WD-07,
 * see the package README's own "Not tamper-evident" section) — `keyMaterial`
 * is carried, never used to sign or verify anything, and
 * `sequenceIntegrityVerified` is gap-and-duplicate detection, not a
 * cryptographic guarantee; sign or seal an archive outside this library if a
 * deployment needs that property.
 */
export interface AuditArchive {
  readonly archiveVersion: string;
  readonly metadata: {
    readonly createdAt: number;
    readonly entryCount: number;
    /**
     * No gap or duplicate found in the caller-assigned `sequenceNumber`s at
     * archive time. Not cryptographic tamper-evidence — see
     * `SequenceIntegrity.ts` — and not a claim about `keyMaterial` below,
     * which this package carries but never uses to sign or verify anything.
     *
     * `false` when fewer than two entries carry a `sequenceNumber`:
     * sequencing is opt-in and `verifySequenceIntegrity`'s gap check has
     * nothing to compare below two samples, so an archive built entirely (or
     * almost entirely) from unsequenced entries has not actually had its
     * sequence verified, whatever this field said before this correction.
     */
    readonly sequenceIntegrityVerified: boolean;
  };
  readonly entries: ReadonlyArray<AuditEntry>;
  readonly keyMaterial?: ReadonlyArray<KeyMaterial> | undefined;
}

/**
 * The bundle's own format version, not the wire version of its entries.
 *
 * It stays `"1"` across ADR-QD-096: each entry's `record` says its own wire
 * version (`version: 2`), and the bundle's shape did not change. An archive
 * bundled before 0.10 holds version-1 entries (no `version` key), which
 * `decodeAuditEntry` refuses since 0.11.0; its entries are re-encoded with
 * 0.10.x like any other pre-0.10 row, and the bundle format needs no bump.
 */
const ARCHIVE_VERSION = "1";

/**
 * Verifies sequence integrity, then bundles. Fails with
 * `SequenceIntegrityError` rather than archiving a set of rows already known
 * to have a gap or a duplicate — an archive exists to be trusted later, so it
 * refuses to be built on a foundation this package can already tell is
 * broken.
 *
 * `verifySequenceIntegrity` tolerates and is tested against entries arriving
 * out of write order — it checks the *sequence numbers*, not array order.
 * `metadata.sequenceIntegrityVerified: true` would be a false claim if the
 * archive then stored `entries` exactly as handed in: a reviewer trusting a
 * verified archive to be in sequence order would get rows in whatever order
 * the caller happened to read them back in. Sorted here, by `sequenceNumber`
 * — stably, so the (opt-in, unordered-by-definition) entries carrying none
 * keep their relative order rather than being shuffled by an incidental
 * comparator result. Placed after every sequenced entry, in the order given;
 * ordering them by `at` is a reader's job (`storedRecordOrder`, ADR-QD-056),
 * since the archive cannot verify a clock.
 *
 * `sequenceIntegrityVerified` is `true` only when at least two entries carry
 * a `sequenceNumber` — `verifySequenceIntegrity`'s gap-and-duplicate check
 * has nothing to compare below two samples, so passing it with zero or one
 * sequenced entries proves nothing. Passing that check is necessary but not
 * sufficient for the claim; this second condition is what makes it
 * sufficient too.
 */
export const archiveAuditTrail = Effect.fn("qadi.audit.archiveAuditTrail")(function* (
  entries: ReadonlyArray<AuditEntry>,
  now: number,
  options?: ArchivalOptions,
) {
  yield* verifySequenceIntegrity(entries);

  const ordered = entries.toSorted(
    (a, b) => (a.sequenceNumber ?? Number.POSITIVE_INFINITY) - (b.sequenceNumber ?? Number.POSITIVE_INFINITY),
  );

  const sequencedCount = entries.filter((entry) => entry.sequenceNumber !== undefined).length;

  const archive: AuditArchive = {
    archiveVersion: ARCHIVE_VERSION,
    metadata: {
      createdAt: now,
      entryCount: ordered.length,
      sequenceIntegrityVerified: sequencedCount >= 2,
    },
    entries: ordered,
    ...(options?.keyMaterial === undefined ? {} : { keyMaterial: options.keyMaterial }),
  };
  return archive;
});

/**
 * Why a stored bundle is not an archive this package will vouch for.
 *
 * Each member is a different repair: `Malformed` and `UnsupportedArchiveVersion`
 * say the bytes are not a bundle this reader reads; `EntryNotDecodable` names
 * the row (`index`) and `@qadi/core`'s own refusal for it; `CountMismatch`,
 * `SequenceBroken`, `NotInSequenceOrder` and `UnbackedClaim` say the bundle
 * decodes but is not the one {@link archiveAuditTrail} wrote.
 *
 * - `CountMismatch`: `metadata.entryCount` (`declared`) differs from the number
 *   of entries (`actual`) — rows were dropped or added after bundling.
 * - `SequenceBroken`: the caller-assigned `sequenceNumber`s have a gap or a
 *   duplicate (`SequenceIntegrity.ts`).
 * - `NotInSequenceOrder`: the entry at `index` breaks the order the writer
 *   uses — sequenced entries in number order, then unsequenced ones.
 * - `UnbackedClaim`: `sequenceIntegrityVerified` is not `sequencedCount >= 2`
 *   (it claims a verification there was nothing to verify, or denies one).
 */
export type ArchiveRefusal = Data.TaggedEnum<{
  Malformed: { readonly message: string };
  UnsupportedArchiveVersion: { readonly version: string };
  EntryNotDecodable: { readonly index: number; readonly refusal: DecodeRefusal };
  CountMismatch: { readonly declared: number; readonly actual: number };
  SequenceBroken: { readonly expectedSequence: number; readonly actualSequence: number };
  NotInSequenceOrder: { readonly index: number };
  UnbackedClaim: { readonly sequencedCount: number };
}>;

/** Constructors and guards for {@link ArchiveRefusal}. */
export const ArchiveRefusal = Data.taggedEnum<ArchiveRefusal>();

/**
 * {@link readAuditArchive} refused a stored bundle; `refusal` says which check failed.
 *
 * A typed result, never thrown. Declared here rather than in `@qadi/core`,
 * per ADR-QD-054: only `@qadi/audit` reads archives.
 */
export class ArchiveNotVerified extends Data.TaggedError("ArchiveNotVerified")<{
  readonly refusal: ArchiveRefusal;
}> {}

/**
 * The implementation of {@link VerifiedArchive}; deliberately not exported.
 *
 * The ECMAScript `#counts` field makes the class nominal: an object literal
 * with the same public fields is not assignable to it, and nothing outside this
 * module can construct one, so the only source of a value is
 * {@link readAuditArchive}.
 */
class VerifiedArchiveImpl {
  readonly #counts: MutableHashMap.MutableHashMap<AuditEntry, number>;
  readonly entries: ReadonlyArray<AuditEntry>;
  readonly createdAt: number;
  readonly entryCount: number;
  readonly sequenceIntegrityVerified: boolean;
  readonly keyMaterial: ReadonlyArray<KeyMaterial> | undefined;

  constructor(init: {
    readonly entries: ReadonlyArray<AuditEntry>;
    readonly createdAt: number;
    readonly sequenceIntegrityVerified: boolean;
    readonly keyMaterial: ReadonlyArray<KeyMaterial> | undefined;
  }) {
    this.#counts = MutableHashMap.empty<AuditEntry, number>();
    for (const entry of init.entries) {
      const held = Option.getOrElse(MutableHashMap.get(this.#counts, entry), () => 0);
      MutableHashMap.set(this.#counts, entry, held + 1);
    }
    this.entries = init.entries;
    this.createdAt = init.createdAt;
    this.entryCount = init.entries.length;
    this.sequenceIntegrityVerified = init.sequenceIntegrityVerified;
    this.keyMaterial = init.keyMaterial;
  }

  /**
   * How many copies of `entry` the archive holds, by structural equality (0 if
   * none). Two rows are the same when every field is equal — a row edited after
   * archiving, or a sibling row of the same evaluation, is a different row.
   */
  holds(entry: AuditEntry): number {
    return Option.getOrElse(MutableHashMap.get(this.#counts, entry), () => 0);
  }
}

/**
 * An archive read back from storage and found internally consistent — the
 * evidence `planPurge` requires before it selects a row for deletion.
 *
 * Obtainable only from {@link readAuditArchive}: the type has a private member,
 * so no object literal is assignable to it. That is a compile-time guard; it
 * does not stop a caller who reaches for reflection.
 *
 * **What it proves.** The bytes handed to `readAuditArchive` were a bundle of
 * this format, every entry decoded through `decodeAuditEntry`, the declared
 * count matched, the caller-assigned sequence numbers had no gap or duplicate,
 * and the order was the one {@link archiveAuditTrail} writes. **What it does
 * not.** That the store is durable, that the bytes are untampered, that the
 * trail is complete, or that the rows were retained long enough: `@qadi/audit`
 * owns no storage and offers no cryptographic proof (ADR-QD-016, ADR-QD-056).
 * It proves what the store said it holds, no more.
 */
export type VerifiedArchive = VerifiedArchiveImpl;

const KeyMaterialSchema = Schema.Struct({
  keyId: Schema.String,
  algorithm: Schema.String,
  publicKey: Schema.String,
});

const ArchiveEnvelope = Schema.Struct({
  archiveVersion: Schema.String,
  metadata: Schema.Struct({
    createdAt: Schema.Number,
    entryCount: Schema.Int,
    sequenceIntegrityVerified: Schema.Boolean,
  }),
  entries: Schema.Array(Schema.Unknown),
  keyMaterial: Schema.optional(Schema.Array(KeyMaterialSchema)),
});

const decodeEnvelope = Schema.decodeUnknownResult(ArchiveEnvelope, UNTRUSTED_DECODE_OPTIONS);

const refuse = (refusal: ArchiveRefusal) => Result.fail(new ArchiveNotVerified({ refusal }));

/** The index of the first entry that breaks sequenced-then-unsequenced, ascending order. */
const firstOutOfOrder = (entries: ReadonlyArray<AuditEntry>): number | undefined => {
  let previous: number | undefined;
  let unsequencedSeen = false;
  for (const [index, entry] of entries.entries()) {
    const sequenceNumber = entry.sequenceNumber;
    if (sequenceNumber === undefined) {
      unsequencedSeen = true;
    } else if (unsequencedSeen || (previous !== undefined && sequenceNumber < previous)) {
      return index;
    } else {
      previous = sequenceNumber;
    }
  }
  return undefined;
};

/**
 * Reads a stored archive bundle back and, if it holds together, returns the
 * {@link VerifiedArchive} a purge needs.
 *
 * Pass what the long-term store returned — `JSON.parse` of the stored bytes,
 * typed `unknown` — not {@link archiveAuditTrail}'s in-memory result: "archived"
 * means "the store gave this back", the closest this package can get to "it
 * was stored" without owning storage. Pure; a refusal is a value. Checks run in
 * this order and each has its own {@link ArchiveRefusal}: the envelope is a
 * bundle (`Malformed`), `archiveVersion` is `"1"` (`UnsupportedArchiveVersion`),
 * every entry decodes through `decodeAuditEntry` (`EntryNotDecodable`), the
 * count matches (`CountMismatch`), no sequence gap or duplicate
 * (`SequenceBroken`), the order is the writer's (`NotInSequenceOrder`), and
 * `sequenceIntegrityVerified` is exactly `sequencedCount >= 2`
 * (`UnbackedClaim`). The order is read, never repaired: this does not sort.
 * A bundle written before the 2026-09 vacuous-`true` correction fails
 * `UnbackedClaim`; re-bundle its entries with {@link archiveAuditTrail}.
 */
export const readAuditArchive = (input: unknown): Result.Result<VerifiedArchive, ArchiveNotVerified> => {
  const envelope = decodeEnvelope(input);
  if (Result.isFailure(envelope)) {
    return refuse(ArchiveRefusal.Malformed({ message: envelope.failure.message }));
  }
  const bundle = envelope.success;
  if (bundle.archiveVersion !== ARCHIVE_VERSION) {
    return refuse(ArchiveRefusal.UnsupportedArchiveVersion({ version: bundle.archiveVersion }));
  }
  const entries: Array<AuditEntry> = [];
  for (const [index, raw] of bundle.entries.entries()) {
    const decoded = decodeAuditEntry(raw);
    if (Result.isFailure(decoded)) {
      return refuse(ArchiveRefusal.EntryNotDecodable({ index, refusal: decoded.failure.refusal }));
    }
    entries.push(decoded.success.entry);
  }
  if (bundle.metadata.entryCount !== entries.length) {
    return refuse(
      ArchiveRefusal.CountMismatch({ declared: bundle.metadata.entryCount, actual: entries.length }),
    );
  }
  const broken = firstSequenceBreak(entries);
  if (broken !== undefined) {
    return refuse(ArchiveRefusal.SequenceBroken(broken));
  }
  const outOfOrder = firstOutOfOrder(entries);
  if (outOfOrder !== undefined) {
    return refuse(ArchiveRefusal.NotInSequenceOrder({ index: outOfOrder }));
  }
  const sequencedCount = entries.filter((entry) => entry.sequenceNumber !== undefined).length;
  if (bundle.metadata.sequenceIntegrityVerified !== sequencedCount >= 2) {
    return refuse(ArchiveRefusal.UnbackedClaim({ sequencedCount }));
  }
  return Result.succeed(
    new VerifiedArchiveImpl({
      entries,
      createdAt: bundle.metadata.createdAt,
      sequenceIntegrityVerified: bundle.metadata.sequenceIntegrityVerified,
      keyMaterial: bundle.keyMaterial,
    }),
  );
};
