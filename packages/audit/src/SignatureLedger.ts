/**
 * The keyed store a captured signature is written to and `hasSignature` reads
 * from.
 *
 * `signatureObligationHandler` captures a signature, and `hasSignature` later
 * asks `SignatureHistory` for it. Before this ledger nothing connected the two:
 * the capture request carried no resource, so a flow that stored what it
 * captured stored it subject-wide, where a default-scope `hasSignature` could
 * not find it and a `scope: "Any"` one found it for every resource — wider than
 * the signer attested (ADR-QD-058, as amended).
 *
 * The ledger is a **keyed store**: an adapter appends an entry
 * under an opaque {@link SignatureLedgerKey} and reads back the entries
 * appended under exactly that key. {@link ledgerKeyOf} is the one function that
 * spells the pair `(subjectId, resourceId)`, called on the write side and on the
 * read side alike, and {@link signatureHistoryFromLedger} derives the exact-pair
 * read rule from it and refuses any row the store answers from another key. An
 * adapter therefore has no nullable resource column and no query to get wrong;
 * what a type cannot rule out (a collation that folds case, trims or
 * normalises the key) `checkSignatureLedger` checks against the real store.
 *
 * A **store, not a capture** (BEH-QD-255): nothing here obtains or validates a
 * signature, and there is no default instance, not even a no-op. The ledger
 * records what `capture` returned; trust-on-presence still holds (ADR-QD-058),
 * so `hasSignature` does not re-validate what the ledger holds. Its in-memory
 * form is `SignatureLedgerTest`, a `…Test` double like `AuditTrailPortTest`.
 *
 * A deployment whose e-signature system is itself its `SignatureHistory` does
 * not need a ledger: `capture` persists where it reads, keyed from the request.
 */
import * as Brand from "effect/Brand";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { SignatureHistory, signatureHistoryPort } from "@qadi/core";
import type { ResourceId, Signature, SignatureQuery, SubjectId } from "@qadi/core";

/**
 * The key a ledger stores an entry under: opaque to the adapter, which compares
 * it byte for byte.
 *
 * Minted only by {@link ledgerKeyOf}, so a store cannot be handed a query
 * instead, and a plain string does not typecheck as one.
 */
export type SignatureLedgerKey = string & Brand.Brand<"SignatureLedgerKey">;

const makeLedgerKey = Brand.nominal<SignatureLedgerKey>();

/** The pair a signature is keyed by: the signer, and the resource it was given for. */
export interface LedgerPair {
  readonly subjectId: SubjectId;
  readonly resourceId: ResourceId | undefined;
}

/**
 * The one key for a `(subjectId, resourceId)` pair: `[1,"alice","doc-1"]`, an
 * absent resource as `null` (`[1,"alice",null]`).
 *
 * **A persisted format: changing these bytes orphans every stored signature**,
 * and every `hasSignature` then fails closed. The leading `1` is the format
 * version, so a future format is detectable row by row. It is deliberately its
 * own spelling rather than `signatureHistoryPort.key`, an in-memory request key
 * core has changed before (CCR-QD-263), and which now also keys the asker's
 * requirement (INV-QD-043). A property test pins that the two partition pairs
 * identically over its requirement-free projection. Reads only `subjectId` and
 * `resourceId`, so a query carrying `meaning` or `signerRole` reads the same
 * pair as one without, and accepts a read query and a write entry alike.
 */
export const ledgerKeyOf = (pair: LedgerPair): SignatureLedgerKey =>
  makeLedgerKey(JSON.stringify([1, pair.subjectId, pair.resourceId ?? null]));

/**
 * One captured signature and the key it answers to.
 *
 * `subjectId` is the signer; `resourceId` is `resourceIdOf` of the discharged
 * question's resource, `undefined` when it had no string id. `evaluationId`
 * names the evaluation whose allow carried the duty, for the audit trail; it is
 * not part of the read key.
 */
export interface SignatureLedgerEntry extends LedgerPair {
  readonly evaluationId: string;
  readonly signature: Signature;
}

/**
 * The ledger could not record an entry.
 *
 * Fails the discharge (`HandlerFailed`), which refuses enforcement: an
 * unrecorded signature must not let the guarded work proceed as though the duty
 * were met (INV-QD-013).
 */
export class SignatureLedgerError extends Data.TaggedError("SignatureLedgerError")<{
  readonly evaluationId: string;
  readonly cause: unknown;
}> {}

/**
 * A ledger read failed, or its answer was refused.
 *
 * Raised by a store that cannot read, and by {@link signatureHistoryFromLedger}
 * when the store answers an entry stored under another key, or one whose
 * signature was made by someone other than the entry's subject. Surfaces as the
 * port's own `SignatureHistoryUnavailable` with this as its cause, so
 * enforcement refuses rather than reading a failure as a denial (INV-QD-006).
 */
export class SignatureLedgerReadError extends Data.TaggedError("SignatureLedgerReadError")<{
  readonly key: SignatureLedgerKey;
  readonly cause: unknown;
}> {}

export interface SignatureLedgerShape {
  /** Which implementation this is. A label only. */
  readonly name?: string | undefined;
  /**
   * Stores `entry` under `key`. The store's only obligation is to return it,
   * and every other entry appended under exactly `key`, from `entriesAt(key)`.
   */
  readonly append: (
    key: SignatureLedgerKey,
    entry: SignatureLedgerEntry,
  ) => Effect.Effect<void, SignatureLedgerError>;
  /**
   * Every entry appended under exactly `key`, and no other, compared byte for
   * byte: no case folding, trimming or normalisation.
   */
  readonly entriesAt: (
    key: SignatureLedgerKey,
  ) => Effect.Effect<ReadonlyArray<SignatureLedgerEntry>, SignatureLedgerReadError>;
}

export class SignatureLedger extends Context.Service<SignatureLedger, SignatureLedgerShape>()(
  "qadi/audit/SignatureLedger",
) {
  static readonly append = (entry: SignatureLedgerEntry) =>
    SignatureLedger.use((l) => l.append(ledgerKeyOf(entry), entry));
}

/**
 * Reads a ledger as the `SignatureHistory` port, so `hasSignature` sees exactly
 * what the ledger recorded under the pair asked.
 *
 * Derives the exact-pair rule once, for every adapter: the read key is
 * {@link ledgerKeyOf} of the query, the same function the write used, so a
 * resource-scoped query sees only entries stored with that resource and a
 * subject-global one only entries stored with none (INV-QD-120). An entry the
 * store answers from another key, or one whose signer is not its subject, fails
 * the read as `SignatureHistoryUnavailable` rather than being returned or
 * silently dropped: `hasSignature` never compares a signature's signer with the
 * asking subject, so the key is the only thing tying a row to a subject. A
 * failing store surfaces as the same typed error.
 */
export const signatureHistoryFromLedger = (
  ledger: SignatureLedgerShape,
): Layer.Layer<SignatureHistory> =>
  Layer.succeed(SignatureHistory, {
    name: ledger.name ?? "signatureHistoryFromLedger",
    // Unnamed on purpose: the span it runs under is the port's own
    // `qadi.hasSignature`.
    signaturesFor: Effect.fn(function* (query: SignatureQuery) {
      const key = ledgerKeyOf(query);
      const entries = yield* ledger
        .entriesAt(key)
        .pipe(Effect.mapError((cause) => signatureHistoryPort.failure([query], cause)));
      for (const entry of entries) {
        const refused =
          ledgerKeyOf(entry) !== key
            ? "the ledger answered an entry stored under another key"
            : entry.signature.signerId !== entry.subjectId
              ? "the ledger answered an entry whose signer is not its subject"
              : undefined;
        if (refused !== undefined) {
          return yield* Effect.fail(
            signatureHistoryPort.failure([query], new SignatureLedgerReadError({ key, cause: refused })),
          );
        }
      }
      // A fresh array per read: a caller mutating the answer must not change
      // the next one.
      return entries.map((entry): Signature => entry.signature);
    }),
  });

/**
 * What a capture request must carry for the ledger to key its entry. A
 * `SignatureCaptureRequest` satisfies it; stated structurally so this module
 * does not import the capture port (madge counts a type-only edge, ADR-QD-037).
 */
export interface LedgerKeySource {
  readonly evaluationId: string;
  readonly resourceId: ResourceId | undefined;
}

/**
 * The ledger entry for a signature a capture returned.
 *
 * The one place the entry's pair is computed: the signer is the signature's own
 * `signerId`, and the resource is the request's `resourceId`, which is
 * `resourceIdOf` of the question's resource. {@link ledgerKeyOf} of the entry
 * is the key it is appended under, and of a query the key it is read under.
 */
export const ledgerEntryOf = (
  request: LedgerKeySource,
  signature: Signature,
): SignatureLedgerEntry => ({
  subjectId: signature.signerId,
  resourceId: request.resourceId,
  evaluationId: request.evaluationId,
  signature,
});
