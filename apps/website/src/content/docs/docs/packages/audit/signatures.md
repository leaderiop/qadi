---
title: E-Signatures
description: hasSignature's trust-on-presence policy check, and @qadi/audit's SignatureCapturePort for discharging a signature obligation.
---

E-signatures in Qadi split into two separate concerns: *checking* that a
signature exists (`@qadi/core`'s `hasSignature`), and *capturing* one at
enforcement time (`@qadi/audit`'s `SignatureCapturePort`). Neither performs
live cryptographic verification.

## `hasSignature` — the policy check

```ts
export const hasSignature: (
  meaning: string | SignatureMeaning,
  options?: SignatureOptions,
) => Policy;
```

`hasSignature` is a `@qadi/core` `Policy` leaf backed by the `SignatureHistory`
port. It allows when *any* signature the port returns for the subject (and,
for a resource-scoped check, the resource) matches the requested `meaning`
and, if given, `signerRole`:

```ts
signatures.some(
  (s) => s.meaning === policy.meaning &&
    (policy.signerRole === undefined || s.signerRole === policy.signerRole),
);
```

This is **trust-on-presence**: there is no comparison against `signedAt`, no
expiry window, and no live crypto verification. `hasSignature` assumes
whatever populated the `SignatureHistory` port already validated the
signature — typically `@qadi/audit`'s capture flow below. A `Signature` is:

```ts
export const Signature = Schema.Struct({
  signerId: Schema.String.pipe(Schema.brand("SubjectId")),
  meaning: Schema.String,
  signerRole: Schema.optional(Schema.String),
  signedAt: Schema.Number,
  algorithm: Schema.optional(Schema.String),
  keyId: Schema.optional(Schema.String),
});
```

`SignatureHistory`'s default, `SignatureHistoryNone`, answers with an empty
array — no signatures on file, denying unambiguously.

## Capture — wired through `ObligationHandler`

`@qadi/audit`'s `SignatureCapturePort` and `signatureObligationHandler` are
how a signature gets *produced*. Capture is a condition of enforcement, so it
is wired through `Qadi.ts`'s `ObligationHandler` mechanism — the `onObligations`
option `enforce`/`assert`/`enforceProjected`/`filter` accept — never through
`DecisionSink`:

```ts
import { signatureObligationHandler, SIGNATURE_MEANINGS } from "@qadi/audit";

const program = doPublish.pipe(
  enforce(mayPublish, {
    onObligations: signatureObligationHandler(mySignaturePort, SIGNATURE_MEANINGS.APPROVED),
  }),
);
```

`signatureObligationHandler(port, meaning, options?)` calls `port.capture`
exactly once per discharge — never once per obligation — with a request
derived from the current subject and, if `options.signerRole` is given,
threaded into the produced `Signature.signerRole`. `SIGNATURE_MEANINGS` and
`SignatureMeaning` are defined in `@qadi/core` and re-exported from
`@qadi/audit` unchanged.

`SignatureCapturePortShape` is a two-method port:

```ts
export interface SignatureCapturePortShape {
  readonly capture: (request: SignatureCaptureRequest) => Effect.Effect<Signature, SignatureCaptureError>;
  readonly validate: (signature: Signature) => Effect.Effect<SignatureValidationResult, SignatureCaptureError>;
}
```

Neither method models reauthentication — no challenge/token types exist here.
Whatever reauthentication a real `capture` implementation needs happens
inside the caller's own port; `@qadi/audit` treats it as invisible.

## No default ships

There is no shipped default `SignatureCapturePort` implementation — not even
a no-op one. An obligation wired to `signatureObligationHandler` with no real
port behind it, or a `hasSignature` policy with no `SignatureHistory`
provided, fails closed the same way any other unwired port does: enforcement
refuses with `UndischargedObligation` rather than proceeding.

This is a factual boundary, not a compliance claim: `hasSignature` matches a
caller-supplied record's presence, meaning, and role — it does not validate a
cryptographic signature, does not check expiry, and does not model
reauthentication. Whether that's sufficient for a given regulatory
requirement is a question for [Compliance](/compliance/), not for this page.
