---
"@qadi/audit": minor
---

`SignatureCapturePort` now speaks `@qadi/core`'s canonical `Signature` type
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
