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
 * `Schema`-derived field cannot literally import it. `Schema.brand(SUBJECT_ID_TAG)`
 * declares the same tag independently, imported as a constant rather than
 * repeated as a string literal (MP-06) so a typo here is a compile error
 * instead of a silently different nominal type. This is what
 * `ElectronicSignature` already did, before `SUBJECT_ID_TAG` existed.
 */
import * as Schema from "effect/Schema";
import { SUBJECT_ID_TAG } from "./Identity.ts";

export const Signature = Schema.Struct({
  signerId: Schema.String.pipe(Schema.brand(SUBJECT_ID_TAG)),
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
  /**
   * When the signature was made. Captured for the audit record, but
   * `evaluateHasSignature` (`Evaluate.ts`) never compares it to anything —
   * `hasSignature` is trust-on-presence, with no expiry or freshness concept,
   * so an arbitrarily old signature matches exactly as well as a recent one.
   */
  signedAt: Schema.Number,
  /**
   * The signing algorithm, when the capture flow records one. Carried so a
   * deployment's own downstream verification flow can use it — nothing in
   * this monorepo reads it: `evaluateHasSignature` never inspects it, so an
   * on-file signature with an unrecognized `algorithm` still matches a
   * `hasSignature` leaf that names the right `meaning` (BS-03; see
   * ADR-QD-058 for why no live crypto verification is in scope here).
   */
  algorithm: Schema.optional(Schema.String),
  /**
   * Which key produced the signature, when the capture flow records one.
   * Like `algorithm` above, this is carried so a deployment's own downstream
   * verification flow can use it — nothing in this monorepo reads it:
   * `evaluateHasSignature` never checks whether `keyId` still resolves to a
   * valid key (BS-03).
   */
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
