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
 *
 * `cause` is optional here, unlike the rest of the error taxonomy (see
 * `AttributeResolveError`, `AuditWriteError`, etc., which all require it): a
 * capture or validation failure is often a business decision — a declined
 * signature, a reauthentication prompt — with no underlying technical cause
 * to report, not an I/O or codec failure wrapping one.
 */
export class SignatureCaptureError extends Data.TaggedError("SignatureCaptureError")<{
  readonly reason: string;
  readonly cause?: unknown;
}> {}

export interface SignatureCapturePortShape {
  /**
   * **An implementation MUST establish the signer's intent and identity
   * before returning a `Signature`.** ADR-QD-058 settles `hasSignature` as
   * trust-on-presence: the evaluator treats a `Signature` in
   * `SignatureHistoryShape.signaturesFor` as already validated and asks it no
   * further questions (`evaluateHasSignature`, `INV-QD-055`). Nothing in this
   * port's type enforces that premise — a `capture` that records an
   * unverified row satisfies the signature above and every invariant, and the
   * evaluator will then allow on it. Whatever reauthentication or identity
   * check the deployment needs (a password re-prompt, an MFA challenge, a
   * hardware key) belongs here, entirely inside the implementation (see this
   * file's own header on why `@qadi/audit` does not model it).
   */
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
  static readonly capture = (request: SignatureCaptureRequest) =>
    SignatureCapturePort.use((p) => p.capture(request));
  static readonly validate = (signature: Signature) =>
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
 *
 * **`signerId` is the ambient `CurrentSubject`, asserted, not verified — use
 * this handler only where that identity is the acting human.** The load-
 * bearing assumption this glue makes is that whoever the evaluation context
 * holds as `CurrentSubject` is the person performing the signing act. That is
 * true for an ordinary request-scoped evaluation, and false for a service
 * account, a batch runner, or (`SubjectSet.ts`'s own precedent) a review flow
 * evaluating on behalf of the subjects being reviewed — `SubjectSet.ts`
 * refuses to discharge obligations for exactly that reason. Reusing an
 * evaluation context whose `CurrentSubject` is not the signer attributes the
 * capture to the wrong party, and nothing here or in the type system catches
 * it.
 *
 * **`options.signerRole` is a static, unverified assertion by whoever wired
 * this handler, not an observation made at signing time.** It is fixed at
 * layer-construction time and spread into every capture this handler makes,
 * so a policy's `hasSignature` leaf naming a `signerRole` (matched by plain
 * equality against `Signature.signerRole`, documented there as "the signer's
 * role at the moment of signing") is satisfied whenever the deployment was
 * configured with that role, regardless of whether the signer held it when
 * signing. Treat it as a fixture convenience; a `capture` implementation that
 * can observe the signer's actual role at signing time should populate or
 * override `signerRole` itself rather than rely on this option.
 */
export const signatureObligationHandler = (
  port: SignatureCapturePortShape,
  meaning: string | SignatureMeaning,
  options?: { readonly signerRole?: string },
) =>
  Effect.fn("qadi.audit.signatureObligationHandler")(function* (
    obligations: ReadonlyArray<Obligation>,
  ) {
    const subject = yield* CurrentSubject;
    yield* port.capture({
      meaning,
      signerId: subject.id,
      ...(options?.signerRole === undefined ? {} : { signerRole: options.signerRole }),
      obligationIds: obligations.map((o) => o.id),
    });
  });
