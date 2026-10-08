# ADR-QD-105 — An obligation is discharged against the question it answered

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-105                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-08                                     |
> | Status         | Accepted — amends ADR-QD-019, ADR-QD-057, ADR-QD-058, ADR-QD-096 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-08): Initial (ARCH-30, CCR-QD-220) |

---

## Context

`discharge` held the whole decided question and handed a handler one field of it: the
obligation array. The `Question` that `evaluate` built never left `evaluate`. So every handler
rebuilt its context from ambient services, and the one shipped handler,
`signatureObligationHandler`, could not rebuild the resource at all.

That was a defect, found by a probe, not a missing nicety. The capture request carried no
resource, so a flow that stored what it captured stored it with none. A default-scope
`hasSignature` (which asks `SignatureHistory` for `(subjectId, resourceId)`) then denied "no
signatures are on file", and a `scope: "Any"` one allowed for **every** resource: wider than the
signer attested, since the signing act was about one document. ADR-QD-058 named this loop as the
expected way the port is populated, and no test covered it.

Three smaller facts rode along. `Qadi.ts` documented the missing context as "tracked separately",
and nothing tracked it. The handler's `signerId` was read from the ambient `CurrentSubject`, a
property the handler's own doc conceded was asserted, not verified. And an obligation record
named only an evaluation id, so an orphan row (whose decision never arrived) could say only
"something was refused".

## Decision

- **A handler receives one value, `ObligationDischarge = { question, decision }`** (**breaking**):
  the `Question` the lifecycle decided and the `Allow` itself. `decision.obligations` is the one
  source of the duties, as ADR-QD-019 requires; nothing is restated. The handler needs no ambient
  service to learn the subject, resource or action.
- **The lifecycle is split so the question is built once.** A package-private `Lifecycle.ts` holds
  `decideQuestion` (what `evaluate` was, taking a `Question`, still the `qadi.evaluate` span) and
  `ask`, which reads `CurrentSubject`, builds the question once and returns it beside the
  decision. `evaluate` is `ask`'s decision; `permitted` and `decideOne` keep both and pass them to
  `discharge`. This is ADR-QD-100's "a question is built once", extended to the discharge, and it
  is why `discharge` does not call `questionOf` itself.
- **The obligation record names who and what.** `ObligationRecord` gains optional `subjectId`,
  `action` and `resourceId`: the question's identity, never its content (the resource stays on
  the decision row, so it is not disclosed twice). They are optional envelope keys under wire
  version 2, the first use of ADR-QD-096's rule that additive, optional metadata needs no version;
  a row written before them decodes with them absent and re-encodes byte-identically.
- **`@qadi/audit`'s capture request carries the question's key** (**breaking** for code that
  constructs one): required `evaluationId`, `resourceId`, `action` and `resource`. `resourceId` is
  `resourceIdOf(question.resource)`, newly public in `@qadi/core`, the writer's half of the rule
  `askSignature` reads with. `signerId` is `question.subject.id`, and
  `signatureObligationHandler` no longer requires `CurrentSubject`.
- **A `SignatureLedger` closes the loop by construction.** `signatureObligationHandler`'s optional
  `ledger` records the signature `capture` **returned**, keyed by `ledgerEntryOf`, and
  `signatureHistoryFromLedger` reads the same store as `SignatureHistory`; the write key and the
  read key are one rule. A returned signature for a different signer or meaning fails the
  discharge (fail closed), and so does a ledger that cannot record. Without a ledger, `capture`
  persists where it reads and its documentation states the MUST. The ledger is a store, not a
  capture: no default instance ships (ADR-QD-016, BEH-QD-255), and `SignatureLedgerTest` is a
  `...Test` double.
- **The library mints no idempotency key.** `decision.evaluationId` is per attempt (a retry
  mints a fresh one), and the question is shared by two distinct requests, so a key derived from
  either merges two real duties or splits one. The handler gets the facts; the per-request key is
  the caller's own request id, captured by the `onObligations` closure.

## Consequences

- Every third-party `onObligations` that read the array fails to compile, which is loud. A
  handler written `() => ...` still compiles. The migration is `(obligations) =>` to
  `({ decision }) =>` reading `decision.obligations`.
- A `capture` that legitimately normalises `meaning` (upper-casing it, say) is now refused:
  fail-closed and visible as `HandlerFailed`.
- A 0.11 reader drops the three new record keys silently (ADR-QD-096, "ignored envelope keys are
  silent"); a 0.11 row has none and the type says so. `resourceId` and `action` are already on the
  paired decision row, so nothing new is disclosed.
- `@qadi/http` still passes no obligation handler: a binding obligation on a guarded route answers
  403 `UndischargedObligation`. A per-API handler would key on the question this change hands
  over, which makes it a follow-up rather than a part of this.
- Rejected: an additive `(obligations, discharge)` signature (two paths to one array, kept
  forever; source compatibility is not a safety argument); an ambient `CurrentDischarge` service
  (the lookup the defect came from, with a service every handler must remember to read);
  `Allow` carrying its `Question` (changes `Decision`, the wire and hydration, another plan's
  ground); `resourceId` on `Signature` (breaks ADR-QD-057/058's canonical shape and every stored
  signature, when the history port already carries the scope in its query); a second public
  decision path over an arbitrary subject (ADR-QD-100 rejected exporting `walk` for the same
  reason).
