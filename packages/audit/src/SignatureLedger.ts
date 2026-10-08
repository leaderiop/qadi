/**
 * The store a captured signature is written to and `hasSignature` reads from.
 *
 * `signatureObligationHandler` captures a signature, and `hasSignature` later
 * asks `SignatureHistory` for it. Before this ledger nothing connected the two:
 * the capture request carried no resource, so a flow that stored what it
 * captured stored it subject-wide, where a default-scope `hasSignature` could
 * not find it and a `scope: "Any"` one found it for every resource — wider than
 * the signer attested (ADR-QD-058, as amended). The ledger closes that loop by
 * construction: the key a signature is written under ({@link ledgerEntryOf})
 * and the key it is read under (`signatureHistoryPort.key`) are the same pair,
 * `(subjectId, resourceId)`, derived from the discharged question.
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
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { SignatureHistory } from "@qadi/core";
import type { ResourceId, Signature, SignatureHistoryShape, SubjectId } from "@qadi/core";

/**
 * One captured signature and the key it answers to.
 *
 * `subjectId` is the signer; `resourceId` is `resourceIdOf` of the discharged
 * question's resource, `undefined` when it had no string id. `evaluationId`
 * names the evaluation whose allow carried the duty, for the audit trail; it is
 * not part of the read key.
 */
export interface SignatureLedgerEntry {
  readonly subjectId: SubjectId;
  readonly resourceId: ResourceId | undefined;
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

export interface SignatureLedgerShape {
  /** Which implementation this is. A label only. */
  readonly name?: string | undefined;
  /** Records one captured signature. */
  readonly append: (entry: SignatureLedgerEntry) => Effect.Effect<void, SignatureLedgerError>;
  /**
   * The read side, shaped as `SignatureHistoryShape.signaturesFor`: a
   * resource-scoped query sees only entries stored with that resource, and a
   * subject-global one only entries stored with none.
   */
  readonly signaturesFor: SignatureHistoryShape["signaturesFor"];
}

export class SignatureLedger extends Context.Service<SignatureLedger, SignatureLedgerShape>()(
  "qadi/audit/SignatureLedger",
) {
  static readonly append = (entry: SignatureLedgerEntry) =>
    SignatureLedger.use((l) => l.append(entry));
}

/**
 * Reads a ledger as the `SignatureHistory` port, so `hasSignature` sees exactly
 * what the ledger recorded.
 */
export const signatureHistoryFromLedger = (
  ledger: SignatureLedgerShape,
): Layer.Layer<SignatureHistory> =>
  Layer.succeed(SignatureHistory, {
    name: ledger.name ?? "signatureHistoryFromLedger",
    signaturesFor: ledger.signaturesFor,
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
 * The one place the write key is computed: the signer is the signature's own
 * `signerId`, and the resource is the request's `resourceId`, which is
 * `resourceIdOf` of the question's resource: the same pair
 * `signatureHistoryPort.key` reads with.
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
