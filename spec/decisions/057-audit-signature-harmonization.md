# ADR-QD-057 — `@qadi/audit` harmonizes with the canonical `Signature`

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-057                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-25): Initial release (CCR-QD-089) |

---

## Context

[ADR-QD-056](./056-audit-companion-package.md) shipped `@qadi/audit` with its
own `ElectronicSignature` type on `SignatureCapturePort.ts` — `Schema`-derived,
`signerId: SubjectId`, an open `meaning` string, `SIGNATURE_MEANINGS` kept from
HexDi as-is. At the time, `@qadi/core` had no canonical signature concept of
its own: e-signature *check* (a `Policy` predicate) was explicitly out of that
ADR's scope.

[ADR-QD-058](./058-hassignature-a-ninth-service-and-a-decomposable-leaf.md)
closed that gap: `@qadi/core`'s `Signature.ts` now defines the canonical
shape — the same fields `ElectronicSignature` had, plus a new `signerRole`
field — and `hasSignature` matches against it. Two independently-maintained
"signature" types, one in core and one in audit, is exactly the drift
[ADR-QD-002](./002-schema-derived-policy-adt.md)'s single-definition
reasoning exists to prevent, even though the two would have started out
structurally identical.

This narrows ADR-QD-056 the way [ADR-QD-054](./054-a-companion-package-may-compile-a-dialect.md)
narrowed [ADR-QD-024](./024-predicate-output.md) — a new ADR referencing the
one it revises, not an in-place edit to the superseded file. (An earlier
draft of the wayfinder ticket resolving this cited a nonexistent "ADR-QD-017
amendment convention" for in-place editing; ADR-QD-017 is "A decision being
re-checked is not a decision," `@qadi/react`'s staleness rule, and says
nothing about ADR governance. The 054→024 pattern is the real, load-bearing
precedent.)

## Decision

**`ElectronicSignature` is retired, fully removed — no compatibility type
alias.** `SignatureCapturePort.capture`/`validate` retype directly to
`@qadi/core`'s `Signature`:

```ts
export interface SignatureCapturePortShape {
  readonly capture: (
    request: SignatureCaptureRequest,
  ) => Effect.Effect<Signature, SignatureCaptureError>;
  readonly validate: (
    signature: Signature,
  ) => Effect.Effect<SignatureValidationResult, SignatureCaptureError>;
}
```

**`SIGNATURE_MEANINGS`/`SignatureMeaning` move to `@qadi/core`, re-exported
from `@qadi/audit`.** Only where the vocabulary is canonically *defined*
moves; `import { SIGNATURE_MEANINGS } from "@qadi/audit"` keeps working
unchanged for every existing consumer, since the *value* never changed, only
where it lives.

**`SignatureCaptureRequest` gains an optional `signerRole`**, threaded
straight into the produced `Signature.signerRole` (`undefined` when
omitted) — closes the gap ADR-QD-058 flagged: `@qadi/audit`'s capture flow
never populated that field before it existed. A caller with role context can
now supply it; one that doesn't gets the unchanged prior behavior.

**`signatureObligationHandler` gains the same shape `hasSignature` has**:
`meaning: string | SignatureMeaning` for editor autocomplete, and an
`options?: { signerRole?: string }` passed through to `capture()`'s
request — the only way a caller can actually set the field above.

```ts
export const signatureObligationHandler: (
  port: SignatureCapturePortShape,
  meaning: string | SignatureMeaning,
  options?: { readonly signerRole?: string },
) => (obligations: ReadonlyArray<Obligation>) => Effect.Effect<void, SignatureCaptureError, CurrentSubject>;
```

**INV-QD-055 and BEH-QD-256 are revised in place, not superseded.** The
property they state — `signatureObligationHandler` calls `capture` exactly
once per discharge, and the `ObligationRecord` outcome matches whether it
succeeded — is unchanged by this ADR; only the type name in their
source-reference prose moves from `ElectronicSignature` to `Signature`. A
changed *property* would warrant new ids; a renamed type underneath an
unchanged property does not.

## Alternatives considered

- **A compatibility type alias**, `export type ElectronicSignature =
  Signature`. Rejected: this only delays the same break to whenever the
  alias is eventually removed, and the map's own charting language
  ("retired... not merely aligned with") was explicit that this is a real
  retirement, not a soft deprecation.
- **Dropping `SIGNATURE_MEANINGS`/`SignatureMeaning` from `@qadi/audit`
  entirely**, forcing consumers to import from `@qadi/core` directly.
  Rejected: a silent removal breaks every existing `@qadi/audit` consumer's
  import line for a constant whose value never changed — only its canonical
  definition site did.
- **Superseding INV-QD-055/BEH-QD-256 with new ids.** Rejected: superseding
  is for a changed property; this is the same property, renamed underneath
  it. New ids would be pure noise in the traceability matrix.
- **Amending ADR-QD-056 in place**, per the wayfinder ticket's own
  (incorrect) framing. Rejected once the citation was checked and found not
  to exist — see Context. The 054→024 narrowing pattern is what this repo
  actually does.

## Consequences

**Positive**:

- One canonical `Signature` definition, matched by `hasSignature` and
  `@qadi/audit` alike — the drift ADR-QD-002 exists to prevent stays
  unrepresentable here too.
- Existing `@qadi/audit` consumers' `SIGNATURE_MEANINGS` import lines need no
  change.
- `signerRole` becomes populable through the capture flow, closing the gap
  ADR-QD-058 flagged rather than leaving it open indefinitely.

**Negative**:

- A breaking change to `@qadi/audit`'s public API: any consumer that
  imported `ElectronicSignature` by name must switch to `@qadi/core`'s
  `Signature` — no compatibility path is offered, by design (see
  Alternatives).
- `@qadi/audit` now depends on `@qadi/core`'s `Signature.ts` for a type it
  previously defined itself — an existing, not a new, dependency direction
  (`@qadi/audit` already depends on `@qadi/core` for `CurrentSubject`,
  `Obligation`), but one more surface within it.

**Implemented**: `packages/audit/src/SignatureCapturePort.ts`,
`packages/audit/test/SignatureCapturePort.test.ts`; INV-QD-055 and
BEH-QD-256 revised in place (`spec/invariants.md`,
`spec/behaviors/33-audit-pipeline.md`).
