# @qadi/audit

## 0.3.0

### Minor Changes

- a52e92e: The audit pipeline's correctness guarantees are now formally specified
  rather than implied, and held by tests that are themselves checked for
  whether they'd notice a break.

  **Five properties are named, not just intended.** INV-QD-051 through
  INV-QD-055 and BEH-QD-249 through BEH-QD-257 state what `@qadi/audit`
  promises: staging presence or absence never changes the committed audit
  entries (staging non-observability); once a circuit breaker trips,
  concurrent `record()` calls cannot race it into attempting a write before
  reset (circuit-breaker atomicity under concurrency); `enforceRetention` and
  `getPurgeableEntries` partition every entry set exactly, with no row
  double-counted or dropped (retention's partition property);
  `verifyChainIntegrity` detects every gap and every duplicate sequence
  number (chain-integrity gap detection); and `signatureObligationHandler`
  calls `capture` exactly once per discharge, with the recorded
  `ObligationRecord` outcome matching whether that call succeeded (the
  signature obligation handler's call-once / outcome-match guarantee). A
  consumer relying on this package for an audit trail cares which of these
  are guaranteed and which were previously only intended.

  **A mutation-testing gate now runs as part of `pnpm check`.** `stryker.audit.mjs`
  mutates `packages/audit/src/**/*.ts` and breaks the build below 80%. The
  first run scored 81.46% and revealed real gaps in what the existing tests
  would notice; the suite was hardened to 92.03%, clearing the 90% high
  threshold. Reporting only the final number would hide what the gate found;
  reporting only the first would understate what closed the gap.

  Nothing here changes `@qadi/audit`'s public API — this is worth a release
  note anyway, because what changed for a consumer is the strength of the
  guarantee behind an interface that looks identical: the promise was always
  made, and now it's checked.

  See INV-QD-051–055, BEH-QD-249–257.

- 0ee42d1: `SignatureCapturePort` now speaks `@qadi/core`'s canonical `Signature` type
  instead of a second, independently-maintained one of its own.

  **`capture` now returns, and `validate` now accepts, `@qadi/core`'s
  `Signature` directly.** `@qadi/audit`'s own `ElectronicSignature` is retired.
  The two types started out structurally identical, but two
  independently-maintained "signature" types, one per package, is exactly the
  drift ADR-QD-002's single-definition reasoning exists to prevent for the
  Policy ADT — and now that `@qadi/core` has a canonical `Signature` of its
  own, the same reasoning applies here.

  **Breaking**: `ElectronicSignature` is removed outright, with no
  compatibility type alias. A consumer that imports `ElectronicSignature` by
  name must switch to `@qadi/core`'s `Signature` — there is no rename, no
  deprecation window, and no bridging type to fall back on.

  **`SIGNATURE_MEANINGS` and `SignatureMeaning` now live in `@qadi/core`,
  re-exported from `@qadi/audit`.** Existing
  `import { SIGNATURE_MEANINGS } from "@qadi/audit"` call sites keep working
  unchanged — only where the vocabulary is canonically defined moved, not the
  value itself.

  **`SignatureCaptureRequest` gains an optional `signerRole`, threaded
  straight into the produced `Signature.signerRole`.** A caller with role
  context can now populate it; a caller that omits it gets `undefined`, the
  same behavior as before the field existed. This part is additive and needs
  no action from anyone.

  See ADR-QD-057.

### Patch Changes

- Updated dependencies [efa3435]
- Updated dependencies [dc767f2]
- Updated dependencies [d251db4]
- Updated dependencies [a61dadc]
- Updated dependencies [f1c6aa5]
- Updated dependencies [50bf38a]
- Updated dependencies [2227e5e]
- Updated dependencies [39b7cbe]
- Updated dependencies [0649129]
- Updated dependencies [f03d75c]
- Updated dependencies [0363a5a]
- Updated dependencies [e2a44d9]
- Updated dependencies [73508bb]
- Updated dependencies [0363a5a]
  - @qadi/core@0.3.0
