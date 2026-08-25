/**
 * The capture side of e-signature — obtaining and later re-validating one.
 *
 * E-signature turned out to be two structurally different capabilities
 * wearing one name, and only this one fits a companion package. HexDi's
 * `hasSignature` (`libs/guard/core/src/evaluator/evaluate.ts`) is a real,
 * *wired* policy predicate — the one genuinely assembled piece across the
 * whole reference implementation — but adopting an equivalent means
 * extending Qadi's `Policy` ADT itself, a `@qadi/core` change on the scale of
 * ADR-QD-016's own narrowing, not a corollary of it. That side is out of
 * scope for this map entirely.
 *
 * `SignatureServicePort` (capture) genuinely is unwired in HexDi — no
 * reference anywhere in `guard.ts` — the same unassembled shape as its
 * WAL and circuit breaker. This side fits cleanly: signature capture is a
 * condition of enforcement, and `Qadi.ts`'s `ObligationHandler` is exactly
 * that mechanism already. `signatureObligationHandler` below is what makes it
 * actually reachable, not merely possible in principle.
 *
 * **No reauthentication modeling.** No `ReauthenticationChallenge`/`Token`
 * types — whatever reauthentication flow a real `capture` implementation
 * needs stays entirely inside it, invisible to `@qadi/audit`. Identity and
 * crypto are outside this library's competence; a minimal
 * one-input-one-output port is what "refuse rather than approximate" looks
 * like here.
 *
 * **No shipped default — not even a `Noop`.** HexDi's `NoopSignatureService`
 * "always validates successfully," which is exactly the false-compliance
 * affordance ADR-QD-016 rejected. `Qadi.enforce` already fails closed on an
 * unwired obligation (`UndischargedObligation`) — the safe default exists for
 * free, and a `Noop` here would only manufacture the risk of someone
 * forgetting to swap it out.
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { CurrentSubject } from "@qadi/core";
import type { Obligation } from "@qadi/core";

/**
 * The recommended vocabulary for `meaning`, kept from HexDi as-is — one
 * decision that was already correct. `meaning` itself stays an open string on
 * `ElectronicSignature`; a deployment may extend this with site-specific
 * meanings, the same open-namespace treatment `Policy.ts` gives `attribute`.
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

/**
 * `Schema`-derived, the same ADR-QD-002 condition `AuditEntry` meets: captured
 * once, typically persisted in an archive, re-parsed later.
 *
 * `signerId` reuses Qadi's own `SubjectId` brand rather than a second identity
 * concept — an external, non-subject signer is the caller's own `capture`
 * implementation's business, invisible here. `algorithm`/`keyId` stay opaque
 * strings this package never interprets, the same reauthentication-style
 * refusal.
 */
export const ElectronicSignature = Schema.Struct({
  signerId: Schema.String.pipe(Schema.brand("SubjectId")),
  signedAt: Schema.Number,
  meaning: Schema.String,
  algorithm: Schema.optional(Schema.String),
  keyId: Schema.optional(Schema.String),
});
export type ElectronicSignature = typeof ElectronicSignature.Type;

/** Derived from the obligations a discharge is presenting, not hand-built by a caller. */
export interface SignatureCaptureRequest {
  readonly meaning: string;
  readonly signerId: ElectronicSignature["signerId"];
  readonly obligationIds: ReadonlyArray<string>;
}

export interface SignatureValidationResult {
  readonly valid: boolean;
  readonly reason?: string | undefined;
  readonly validatedAt: number;
}

/**
 * Covers both `capture` and `validate` failures under one tag — unlike the
 * audit-write split (encode vs. I/O), there is no analogous second failure
 * *kind* here to distinguish.
 */
export class SignatureCaptureError extends Data.TaggedError("SignatureCaptureError")<{
  readonly reason: string;
  readonly cause?: unknown;
}> {}

export interface SignatureCapturePortShape {
  readonly capture: (
    request: SignatureCaptureRequest,
  ) => Effect.Effect<ElectronicSignature, SignatureCaptureError>;
  /**
   * Independent of `capture` on purpose — a caller reviewing an archived
   * signature later needs to re-validate it without ever calling `capture`
   * again.
   */
  readonly validate: (
    signature: ElectronicSignature,
  ) => Effect.Effect<SignatureValidationResult, SignatureCaptureError>;
}

export class SignatureCapturePort extends Context.Service<
  SignatureCapturePort,
  SignatureCapturePortShape
>()("qadi/audit/SignatureCapturePort") {
  static capture = (request: SignatureCaptureRequest) =>
    SignatureCapturePort.use((p) => p.capture(request));
  static validate = (signature: ElectronicSignature) =>
    SignatureCapturePort.use((p) => p.validate(signature));
}

/**
 * Ready-made `ObligationHandler` glue: `Qadi.enforce(policy, { onObligations:
 * signatureObligationHandler(myPort, "approved") })`.
 *
 * Without this, `SignatureCapturePort` would be exactly as
 * reachable-in-principle-but-not-in-practice as HexDi's own unwired port —
 * this is the piece that makes it actually assembled.
 *
 * Takes the port's shape directly rather than resolving it from `Context`:
 * the caller already has an instance in hand (however they built it), and an
 * `ObligationHandler` should not force `SignatureCapturePort` into `enforce`'s
 * own requirement channel just to call one method on it.
 */
export const signatureObligationHandler =
  (port: SignatureCapturePortShape, meaning: string) =>
  (
    obligations: ReadonlyArray<Obligation>,
  ): Effect.Effect<void, SignatureCaptureError, CurrentSubject> =>
    Effect.gen(function* () {
      const subject = yield* CurrentSubject;
      yield* port.capture({
        meaning,
        signerId: subject.id,
        obligationIds: obligations.map((o) => o.id),
      });
    });
