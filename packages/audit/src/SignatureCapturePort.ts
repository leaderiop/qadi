/**
 * The capture side of e-signature — obtaining and later re-validating one.
 *
 * E-signature turned out to be two structurally different capabilities
 * wearing one name, and only this one fits a companion package. HexDi's
 * `hasSignature` (`libs/guard/core/src/evaluator/evaluate.ts`) is a real,
 * *wired* policy predicate — the one genuinely assembled piece across the
 * whole reference implementation — but adopting an equivalent meant
 * extending Qadi's `Policy` ADT itself, a `@qadi/core` change on the scale of
 * ADR-QD-016's own narrowing, not a corollary of it. That side landed as its
 * own map ("hasSignature: extending the Policy ADT for e-signature checks"),
 * and this file harmonizes with what it decided — see below.
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
 *
 * **Harmonized with `@qadi/core`'s `Signature` (ADR-QD-057).** This package's
 * own `ElectronicSignature` is retired — `capture`/`validate` operate on the
 * canonical `Signature` type directly, and `SIGNATURE_MEANINGS`/
 * `SignatureMeaning` are re-exported from `@qadi/core` rather than defined
 * here a second time. Only where the vocabulary is canonically *defined*
 * moved; existing `import { SIGNATURE_MEANINGS } from "@qadi/audit"` call
 * sites keep working unchanged.
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { CurrentSubject } from "@qadi/core";
import type { Obligation, Signature, SignatureMeaning } from "@qadi/core";

export { SIGNATURE_MEANINGS } from "@qadi/core";
export type { SignatureMeaning } from "@qadi/core";

/**
 * Derived from the obligations a discharge is presenting, not hand-built by a
 * caller. `signerRole`, when supplied, threads straight into the produced
 * `Signature.signerRole` — a caller with role context can now populate the
 * field `@qadi/core`'s `Signature` carries; one that doesn't gets `undefined`,
 * unchanged from before this field existed.
 */
export interface SignatureCaptureRequest {
  readonly meaning: string;
  readonly signerId: Signature["signerId"];
  readonly signerRole?: string;
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
  ) => Effect.Effect<Signature, SignatureCaptureError>;
  /**
   * Independent of `capture` on purpose — a caller reviewing an archived
   * signature later needs to re-validate it without ever calling `capture`
   * again.
   */
  readonly validate: (
    signature: Signature,
  ) => Effect.Effect<SignatureValidationResult, SignatureCaptureError>;
}

export class SignatureCapturePort extends Context.Service<
  SignatureCapturePort,
  SignatureCapturePortShape
>()("qadi/audit/SignatureCapturePort") {
  static capture = (request: SignatureCaptureRequest) =>
    SignatureCapturePort.use((p) => p.capture(request));
  static validate = (signature: Signature) =>
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
 *
 * `meaning`'s parameter type mirrors `hasSignature`'s own — `string |
 * SignatureMeaning` — for editor autocomplete over the recommended
 * vocabulary. `options.signerRole`, when given, reaches `capture()`'s
 * request, which is the only way a caller can actually set that field.
 */
export const signatureObligationHandler =
  (
    port: SignatureCapturePortShape,
    meaning: string | SignatureMeaning,
    options?: { readonly signerRole?: string },
  ) =>
  (
    obligations: ReadonlyArray<Obligation>,
  ): Effect.Effect<void, SignatureCaptureError, CurrentSubject> =>
    Effect.gen(function* () {
      const subject = yield* CurrentSubject;
      yield* port.capture({
        meaning,
        signerId: subject.id,
        ...(options?.signerRole === undefined ? {} : { signerRole: options.signerRole }),
        obligationIds: obligations.map((o) => o.id),
      });
    });
