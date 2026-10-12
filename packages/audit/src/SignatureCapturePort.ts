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
 * actually reachable, not merely possible in principle, and `SignatureLedger`
 * (its `ledger` option) is what makes the loop actually assembled: it records the
 * signature under the key a resource-scoped `hasSignature` reads with.
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
import { resourceIdOf } from "@qadi/core";
import { ledgerEntryOf } from "./SignatureLedger.ts";
import type { SignatureLedgerError, SignatureLedgerShape } from "./SignatureLedger.ts";
import type {
  ObligationDischarge,
  Resource,
  ResourceId,
  Signature,
  SignatureMeaning,
} from "@qadi/core";

export { SIGNATURE_MEANINGS } from "@qadi/core";
export type { SignatureMeaning } from "@qadi/core";

/**
 * What a `capture` is asked to obtain: derived from the discharged question
 * (ADR-QD-057, as amended), never hand-built by a caller.
 *
 * Carries the question's key, so an implementation can persist the signature
 * where a resource-scoped `hasSignature` will look for it. The key fields are
 * required rather than optional, so a constructor cannot forget them:
 * `resourceId` is `undefined` when the question had no resource id, and
 * `resource` and `action` are `undefined` when the question had none.
 *
 * `signerId` is the subject the allow was decided for (`question.subject.id`),
 * not an ambient lookup. `signerRole`, when supplied, threads straight into the
 * produced `Signature.signerRole` — a caller with role context can populate the
 * field `@qadi/core`'s `Signature` carries; one that doesn't gets `undefined`.
 */
export interface SignatureCaptureRequest {
  readonly meaning: string;
  readonly signerId: Signature["signerId"];
  readonly signerRole?: string;
  readonly obligationIds: ReadonlyArray<string>;
  /** The evaluation whose allow carried the duty. Per attempt, not per request. */
  readonly evaluationId: string;
  /**
   * `resourceIdOf(question.resource)`: the id a resource-scoped `hasSignature`
   * asks `SignatureHistory` with, so the key a capture writes under and the key
   * it is read under come from one rule.
   */
  readonly resourceId: ResourceId | undefined;
  /** What the signer was doing, when the question said. */
  readonly action: string | undefined;
  /** The thing being signed, so a ceremony can show it. */
  readonly resource: Resource | undefined;
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
   * further questions (`askSignature`, `INV-QD-055`). Nothing in this
   * port's type enforces that premise — a `capture` that records an
   * unverified row satisfies the signature above and every invariant, and the
   * evaluator will then allow on it. Whatever reauthentication or identity
   * check the deployment needs (a password re-prompt, an MFA challenge, a
   * hardware key) belongs here, entirely inside the implementation (see this
   * file's own header on why `@qadi/audit` does not model it).
   *
   * **Where the result goes.** When no `SignatureLedger` records the returned
   * signature (`signatureObligationHandler`'s `ledger` option), an
   * implementation MUST persist it where the deployment's `SignatureHistory`
   * reads, keyed by `(signerId, resourceId)` from the request — or a
   * resource-scoped `hasSignature` will never see it, and a signature stored
   * with no resource would answer `scope: "Any"` for every resource.
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
 * **The signer is the subject the allow was decided for**, carried on the
 * discharged question (`discharge.question.subject.id`), not read from an
 * ambient `CurrentSubject`: the handler needs no service, and a handler run
 * under a different provision cannot sign as someone else. That is still an
 * assertion that the decided subject is the acting human — true for an
 * ordinary request-scoped evaluation, false for a service account or a batch
 * runner — which is why `capture` must establish identity itself (see its
 * doc).
 *
 * The request also carries the question's key (`resourceId`, `action`,
 * `resource`, `evaluationId`), so what `capture` persists can be found again by
 * a resource-scoped `hasSignature`.
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
  options?: { readonly signerRole?: string; readonly ledger?: SignatureLedgerShape },
): ((
  discharge: ObligationDischarge,
) => Effect.Effect<void, SignatureCaptureError | SignatureLedgerError>) =>
  Effect.fn("qadi.audit.signatureObligationHandler")(function* (discharge: ObligationDischarge) {
    const request = captureRequestOf(discharge, meaning, options?.signerRole);
    const signature = yield* port.capture(request);
    // A capture that attests something other than what was asked must not
    // discharge the duty, nor be recorded as though it had (INV-QD-055).
    if (signature.signerId !== request.signerId || signature.meaning !== request.meaning) {
      return yield* Effect.fail(
        new SignatureCaptureError({
          reason: "capture returned a signature for a different signer or meaning",
        }),
      );
    }
    // Without a ledger the capture port is the store, and persisting under the
    // request's key is its contract (see `capture`).
    if (options?.ledger === undefined) return;
    yield* options.ledger.append(ledgerEntryOf(request, signature));
  });

/**
 * The one place a {@link SignatureCaptureRequest} is built: from a discharge.
 *
 * `resourceId` is `resourceIdOf(question.resource)`, the writer's half of the
 * rule a resource-scoped `hasSignature` reads with.
 */
const captureRequestOf = (
  discharge: ObligationDischarge,
  meaning: string,
  signerRole: string | undefined,
): SignatureCaptureRequest => ({
  meaning,
  signerId: discharge.question.subject.id,
  ...(signerRole === undefined ? {} : { signerRole }),
  obligationIds: discharge.decision.obligations.map((o) => o.id),
  evaluationId: discharge.decision.evaluationId,
  resourceId: resourceIdOf(discharge.question.resource),
  action: discharge.question.action,
  resource: discharge.question.resource,
});
