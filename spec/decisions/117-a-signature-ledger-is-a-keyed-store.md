# ADR-QD-117 — A signature ledger is a keyed store

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-117                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-10                                     |
> | Status         | Accepted — amends ADR-QD-105, ADR-QD-058       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-10): Initial (ARCH-59, CCR-QD-395) |

---

## Context

ADR-QD-105 gave `@qadi/audit` a `SignatureLedger` and said the key a signature is written under and the
key it is read under "are one rule". That was true of the in-memory double only. The ledger's interface
was `append(entry)` plus a full `signaturesFor(query)`, so every adapter re-implemented the rule that
matters for security: a scoped read sees exactly its pair, and a subject-global read sees only rows
stored with no resource. The rule existed as prose in four places and as code nowhere an adapter could
reuse. ARCH-59's probes found:

- **Two adapters written in common SQL idioms type-checked and granted.** `WHERE subject_id = ? AND (?
  IS NULL OR resource_id = ?)` made a signature captured on `doc-1` satisfy `hasSignature("approved",
  { scope: "Any" })` on `doc-2`; `resource_id = ? OR resource_id IS NULL` let a subject-global row
  satisfy a resource-scoped check. The shipped double denied both.
- **N1, a live over-wide grant.** A signature captured while discharging a question whose resource has
  no *string* id (`{ id: 7 }`, an object id, no `id`) was recorded subject-global
  (`resourceIdOf` is `undefined` for it), so every `scope: "Any"` check with that meaning allowed on
  every resource. The reader refuses the same resource (`MissingResourceId`); the writer quietly widened
  it.
- **N2, a spec contradiction.** ADR-QD-058 said `HasSignature` reuses `HistoryScope` with "the same
  semantics" as `HasActed`. For history, `"Any"` is "ever, on any resource" (BEH-QD-092, and
  `decisionHistoryFromEvents` implements it). For a signature, `"Any"` is "on file with no resource"
  (INV-QD-120). `explain()` rendered a signature's `"Any"` as "for anything", which is the wildcard the
  evaluator does not apply.
- **N4.** `hasSignature` never compares a signature's signer with the asking subject (trust-on-presence,
  ADR-QD-058), so the read key is the only thing tying a row to a subject.
- **N5.** The key the double grouped by was `signatureHistoryPort.key`, an in-memory request key core has
  changed before (CCR-QD-263). A persisted ledger keyed by it would orphan every stored signature on the
  next such change.

## Decision

1. **The ledger is a keyed store.** `SignatureLedgerShape` is `append(key, entry)` and `entriesAt(key)`
   over an opaque, branded `SignatureLedgerKey` that only `ledgerKeyOf` mints. A store's whole obligation
   is equality on that string, byte for byte. The optional-filter and null-wildcard idioms cannot be
   written: the adapter never sees a nullable resource column or a query. A type-level test pins the
   shape.
2. **`signatureHistoryFromLedger` derives the read rule once.** The read key is `ledgerKeyOf(query)`, the
   function the write used (`SignatureLedger.append` computes it itself). Exact-pair scoping lives there
   and nowhere else.
3. **The persisted key is ledger-owned and versioned:** `JSON.stringify([1, subjectId, resourceId ??
   null])`, pinned by a golden test. A property test ties its partition to the requirement-free
   projection of `signatureHistoryPort.key` (`ledgerKeyOf(p) === ledgerKeyOf(q)` if and only if the port
   keys of `{ subjectId, resourceId }` are equal), so a new pair field on `SignatureQuery` fails the test.
   **The format is frozen**: changing the bytes orphans every stored signature and every `hasSignature`
   then fails closed, so a v2 needs a migration.
4. **A foreign row fails the read.** An entry the store answers from another key, or whose signature's
   `signerId` is not the entry's `subjectId`, fails the read as the port's own `SignatureHistoryUnavailable`
   with a `SignatureLedgerReadError` cause, each naming its own cause. It is neither returned nor silently
   dropped: a misbehaving adapter shows up as errors, never as grants, and failure is not denial
   (INV-QD-006).
5. **A discharge whose resource cannot be keyed is refused.** A question with a resource whose `id` is not
   a string fails `signatureObligationHandler` with `SignatureCaptureError` before `capture` is called;
   nothing is recorded (`HandlerFailed`). It mirrors the reader. A question with no resource at all still
   records subject-global, the one case where that is what the signer attested. Refusing was chosen over
   storing the entry subject-wide.
6. **A conformance check covers what a type cannot.** `checkSignatureLedger` appends a fixed table of
   adversarial pairs (case, trailing space, NFC/NFD, `"null"`, `""`, quotes, a second subject, an unseen
   key) and reads each back, so a store whose collation folds or trims is caught.
   `checkSignatureHistoryScoping` checks the same exact-pair rule for any raw `SignatureHistory`, which
   covers the capture-persists mode where no ledger exists. Both return violations as data
   (`LedgerConformanceViolation`: `Foreign` or `Missing`); no test framework enters `src`. They are test
   aids: no default instance (BEH-QD-255, ADR-QD-016), and nothing runs them automatically (BEH-QD-339).
7. **`"Any"` keeps its literal and its meaning for a signature.** Nothing renames it (it is in the
   persisted `Policy` wire and devtools' closed span decode). ADR-QD-058's "same semantics" holds for
   `"Resource"` only; for a signature, `"Any"` reads rows stored with no resource, not "ever". `explain()`
   says "on file subject-wide, not for a resource", and BEH-QD-092 and the docs state the difference.
8. **`SignatureLedger` is not a registry port** (ADR-QD-094, ADR-QD-107). It has a write method and no
   fail-closed answer (a `none` would be a default instance, which BEH-QD-255 forbids), no span and no
   wire. Its read side reaches the five-port machinery through `signatureHistoryFromLedger`, which returns
   a `Layer<SignatureHistory>` that `signatureHistoryRetrying`/`Bounded`/`TimingOut`, remote serving and
   devtools capture already wrap.

## What moved on `main`

This decision was first drafted on a branch that was lost before it merged, against a `main` where
`signatureHistoryPort.key` keyed only the pair. Since then the signature query carries the asker's
requirement, `meaning` and `signerRole`, as optional context (ADR-QD-109), and the port's request key
keys it too (INV-QD-043): two asks for one pair with different requirements are two requests. Grouping
a ledger or the core fixture by the full port key would split one pair's rows by requirement and hide
rows from a read that asked differently. So:

- `ledgerKeyOf` reads only `subjectId` and `resourceId`. A query carrying `meaning` or `signerRole` reads
  the same pair as one without; the requirement is matched after the read, never by the store.
- Core's `signatureHistoryFromSignatures` groups and looks up by `signatureHistoryPort.key([{ subjectId,
  resourceId }])`, the requirement-free projection, rather than restating the pair inline twice.
- The key law of Decision 3 is stated over that projection, and the differential test checks every
  query with and without a requirement on both paths.

## Consequences

- An adapter author implements `append`/`entriesAt` over an equality lookup, which any store does
  natively, and runs `checkSignatureLedger` against the real store.
- `SignatureLedgerShape.signaturesFor` is gone and `append` takes a key. The ledger arrives in the same
  unreleased `@qadi/audit` minor as ADR-QD-105, so no published consumer sees a break: the pending
  changeset is amended in place.
- A deployment that discharges signature obligations on a resource with a non-string id now gets
  `HandlerFailed` where it got a silent, over-wide record. It could never use a resource-scoped
  `hasSignature` on that resource anyway.
- `SignatureLedgerTest` is an opaque-key multimap like any adapter, and no longer filters by
  `signatureHistoryPort.key`.
- One more public key format to keep. The golden test and the frozen-format rule are its cost.

## Alternatives

- **Keep `signaturesFor` and ship a conformance check only.** Smallest diff, but every adapter still
  writes the rule and the check finds the mistake only if the deployment runs it.
- **Key by `signatureHistoryPort.key` verbatim.** One function, but it ties a persisted format to an
  in-memory request key core has changed, and which now also keys the requirement.
- **A structured key `{ subjectId, resourceId | null }`.** Reads naturally in SQL but hands the adapter
  `NULL` semantics (`resource_id = NULL` is never true), recreating the hand-written rule.
- **Record an unkeyable resource under a sentinel, or coerce the id with `String(7)`.** The first records
  an unusable row and hides the wiring mistake; the second disagrees with the reader, which refuses a
  non-string id. Two rules for one id is the drift this decision removes.
- **Narrow INV-QD-120 to string-id resources.** Documents the over-wide grant instead of removing it.
- **Align a signature's `"Any"` with history's wildcard, or add a distinct literal.** The first is the
  answer wider than the signer attested; the second breaks the persisted `Policy` wire.
- **Make the ledger a sixth registry port.** Needs a `none`, a span and a wire for a store core never
  reads directly, and contradicts BEH-QD-255.
- **`resourceId` on `Signature`.** Rejected by ADR-QD-105 (breaks the canonical shape of every stored
  signature).

---

_Related: [ADR-QD-058](./058-hassignature-a-ninth-service-and-a-decomposable-leaf.md) · [ADR-QD-105](./105-an-obligation-is-discharged-against-the-question-it-answered.md) · [ADR-QD-109](./109-a-ports-span-is-projected-once-and-every-read-is-one-body.md) · [INV-QD-120](../invariants.md) · [BEH-QD-339](../behaviors/33-audit-pipeline.md)_
