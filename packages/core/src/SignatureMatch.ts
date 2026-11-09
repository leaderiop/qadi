/**
 * When a signature on file meets a `hasSignature` requirement, stated once.
 *
 * Some signature whose `meaning` equals the required one and, when the
 * requirement names a `signerRole`, whose `signerRole` equals that too. Nothing
 * else is compared: `signedAt`, `algorithm` and `keyId` are trust-on-presence
 * (`Signature.ts`'s own limitation, ADR-QD-058).
 *
 * A leaf module for a reason of layering, not size: the signature span's
 * `disclose` (`SignatureHistory.ts`) and `askSignature` (`PortAccess.ts`) both
 * need the rule, and `PortAccess.ts` imports `SignatureHistory.ts`, so the rule
 * cannot live in either without a cycle. It stays out of the barrel
 * (AGENTS.md §9, ADR-QD-099) because the match is how `@qadi/core` reads a
 * signature list, not something a host calls.
 */
import type { Signature } from "./Signature.ts";

/** Whether any of `signatures` has `meaning` and, when given, `signerRole`. */
export const signatureMatches = (
  signatures: ReadonlyArray<Signature>,
  meaning: string,
  signerRole: string | undefined,
): boolean =>
  signatures.some(
    (s) => s.meaning === meaning && (signerRole === undefined || s.signerRole === signerRole),
  );
