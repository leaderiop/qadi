---
title: E-Signatures
description: hasSignature's trust-on-presence policy check, and @qadi/audit's SignatureCapturePort for discharging a signature obligation.
---

E-signatures in Qadi split into two separate concerns: *checking* that a
signature exists (`@qadi/core`'s `hasSignature`), and *capturing* one at
enforcement time (`@qadi/audit`'s `SignatureCapturePort`). Neither performs
live cryptographic verification. This page covers both; for the check side
as a concept on its own — decomposability, the `SignatureHistory` port, and
how it differs from `hasCustom` — see
[Signatures](/docs/concepts/signatures/).

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
derived from the discharged question: the signer is the subject the allow was
decided for (no ambient `CurrentSubject` is read), and the request carries
`resourceId`, `action`, `resource` and `evaluationId`. If `options.signerRole`
is given it is threaded into the produced `Signature.signerRole`. `SIGNATURE_MEANINGS` and
`SignatureMeaning` are defined in `@qadi/core` and re-exported from
`@qadi/audit` unchanged.

`SignatureCapturePortShape` is a two-method port:

```ts
export interface SignatureCapturePortShape {
  readonly capture: (request: SignatureCaptureRequest) => Effect.Effect<Signature, SignatureCaptureError>;
  readonly validate: (signature: Signature) => Effect.Effect<SignatureValidationResult, SignatureCaptureError>;
}
```

```ts
export interface SignatureCaptureRequest {
  readonly meaning: string;
  readonly signerId: SubjectId;
  readonly signerRole?: string;
  readonly obligationIds: ReadonlyArray<string>;
  readonly evaluationId: string;
  readonly resourceId: ResourceId | undefined; // resourceIdOf(question.resource)
  readonly action: string | undefined;
  readonly resource: Resource | undefined;
}
```

Neither method models reauthentication — no challenge/token types exist here.
Whatever reauthentication a real `capture` implementation needs happens
inside the caller's own port; `@qadi/audit` treats it as invisible.

## Where the signature goes — `SignatureLedger`

`hasSignature` asks `SignatureHistory` for `(subjectId, resourceId)`, so a
signature must be stored under that pair to be found. A `capture` that persists
without a resource stores it subject-wide, which a resource-scoped check cannot
find and a `scope: "Any"` check finds for every resource.

Pass a `SignatureLedger` and the handler records the signature `capture`
**returned**, keyed by the question, then `signatureHistoryFromLedger` reads the
same store back as `SignatureHistory`:

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  currentSubjectLayer,
  decide,
  EvaluationIdLive,
  guard,
  hasPermission,
  hasSignature,
  makeSubject,
  obligation,
  obliged,
  permission,
  portsLayer,
} from "@qadi/core";
import {
  signatureHistoryFromLedger,
  signatureObligationHandler,
  SignatureLedgerTest,
} from "@qadi/audit";
import type { SignatureCapturePortShape } from "@qadi/audit";

const approve = permission("doc", "approve");

// A real port runs the signing ceremony. This one returns what it was asked for.
declare const port: SignatureCapturePortShape;

// SignatureLedgerTest is in-memory; a deployment implements SignatureLedgerShape over its store.
const { ledger } = SignatureLedgerTest();

const services = Layer.mergeAll(
  portsLayer({ SignatureHistory: signatureHistoryFromLedger(ledger) }),
  EvaluationIdLive,
  currentSubjectLayer(makeSubject({ id: "alice", permissions: ["doc:approve"] })),
);

const program = Effect.gen(function* () {
  yield* guard(approve, obliged(obligation("sig.approve"), hasPermission(approve)), {
    onObligations: signatureObligationHandler(port, "approved", { ledger }),
  })({ id: "doc-1" }, () => Effect.void);

  // Allow on doc-1, Deny on doc-2: the signature answers the document it was captured for.
  return yield* decide(hasSignature("approved"), { resource: { id: "doc-1" } });
}).pipe(Effect.provide(services));
```

A `capture` that returns a signature for a different signer or meaning than the
request asked for fails the discharge (nothing is appended), and so does a
ledger that cannot record: enforcement is refused rather than proceeding as
though the duty were met. A `capture` that normalises `meaning` is therefore
refused. If your e-signature system is itself your `SignatureHistory`, skip the
ledger: `capture` then must persist where `SignatureHistory` reads, keyed by the
request's `signerId` and `resourceId`.

## No default ships

There is no shipped default `SignatureCapturePort` implementation — not even
a no-op one. A `SignatureLedger` is a store, not a capture: it records only what
your own `capture` returned. An obligation wired to `signatureObligationHandler` with no real
port behind it, or a `hasSignature` policy with no `SignatureHistory`
provided, fails closed the same way any other unwired port does: enforcement
refuses with `UndischargedObligation` rather than proceeding.

This is a factual boundary, not a compliance claim: `hasSignature` matches a
caller-supplied record's presence, meaning, and role — it does not validate a
cryptographic signature, does not check expiry, and does not model
reauthentication. Whether that's sufficient for a given regulatory
requirement is a question for [Compliance](/compliance/), not for this page.
