/**
 * The canonical e-signature shape: what a caller's capture flow produces and
 * what `SignatureHistory` (`SignatureHistory.ts`) hands back for `hasSignature`
 * to match against.
 *
 * `Schema`-derived, the same ADR-QD-002 trust-boundary condition `AuditEntry`
 * meets: captured once — typically through `@qadi/audit`'s
 * `SignatureCapturePort` — persisted, and re-parsed later. This type
 * supersedes `@qadi/audit`'s `ElectronicSignature`, which is retired in favor
 * of it (wayfinder ticket #15, still open): `@qadi/core` is where a Policy leaf
 * can depend on the shape without depending on the optional companion
 * package that happens to capture it.
 *
 * `signerId` reuses `SubjectId`'s brand *tag*, not the brand itself —
 * `SubjectId` (`Identity.ts`) is a plain `Brand.nominal`, not a `Schema`, so a
 * `Schema`-derived field cannot literally import it. `Schema.brand("SubjectId")`
 * declares the same tag independently, which is what `ElectronicSignature`
 * already did.
 */
import * as Schema from "effect/Schema";

export const Signature = Schema.Struct({
  signerId: Schema.String.pipe(Schema.brand("SubjectId")),
  /**
   * What the signature attests to — open, not a closed union. A deployment
   * may extend {@link SIGNATURE_MEANINGS} with site-specific meanings, the
   * same open-namespace treatment `Policy.ts` gives `attribute`.
   */
  meaning: Schema.String,
  /**
   * The signer's role at the moment of signing — `"manager"`,
   * `"quality-reviewer"`. Open for the same reason `meaning` is: role
   * vocabularies are deployment-specific. Absent when the capturing flow
   * doesn't track roles; a `hasSignature` leaf that names a `signerRole`
   * matches only signatures carrying that same value.
   */
  signerRole: Schema.optional(Schema.String),
  signedAt: Schema.Number,
  algorithm: Schema.optional(Schema.String),
  keyId: Schema.optional(Schema.String),
});
export type Signature = typeof Signature.Type;

/**
 * The recommended vocabulary for `meaning`. Carried over from `@qadi/audit`'s
 * `SignatureCapturePort.ts` — one decision that was already correct and did
 * not need revisiting for the move.
 */
export const SIGNATURE_MEANINGS = {
  AUTHORED: "authored",
  REVIEWED: "reviewed",
  APPROVED: "approved",
  REJECTED: "rejected",
  WITNESSED: "witnessed",
  RELEASED: "released",
  WITNESSED_DESTRUCTION: "witnessed-destruction",
} as const;

export type SignatureMeaning = (typeof SIGNATURE_MEANINGS)[keyof typeof SIGNATURE_MEANINGS];
