# @qadi/audit

Audit trail, staging, a circuit breaker, retention/archival, and e-signature
capture for [`@qadi/core`](https://www.npmjs.com/package/@qadi/core), composed
into one assembled pipeline hung off `DecisionSink`.

```sh
pnpm add @qadi/audit @qadi/core effect
```

Narrows [ADR-QD-016](https://github.com/leaderiop/qadi/blob/main/spec/decisions/016-gxp-out-of-scope.md)
the way [ADR-QD-054](https://github.com/leaderiop/qadi/blob/main/spec/decisions/054-a-companion-package-may-compile-a-dialect.md)
narrowed ADR-QD-024: an optional, separately versioned, dependency-free
companion package — `@qadi/core` gains no dependency of any kind through this
package existing, and `@qadi/audit` itself opens no connection, generates no
key, and assumes no schema. Every capability that needs real storage,
identity or crypto is a caller-supplied port.

```ts
import { AuditDecisionSinkLive } from "@qadi/audit";

const AppLayer = AuditDecisionSinkLive({ failureThreshold: 5, resetTimeoutMs: 30_000 }).pipe(
  Layer.provide(myAuditTrailPortLive), // the caller's own storage
);
```

## Assembled, not individually correct

This is the whole point of the package: `AuditDecisionSinkLive`'s `record()`
sequence — encode, stage if wired, write, react to the outcome — is reachable
through the one call every evaluation already makes, unlike the reference
implementation this was compared against, where the equivalent pieces were
each unit-tested and never called from the real enforcement path.

## Refuses rather than approximates

A `resource` carrying a value with no safe durable representation fails
`AuditEntryNotEncodable` rather than being partially written or silently
dropped. An unknown decommissioning step id fails `UnknownDecommissioningStep`
rather than silently no-opping. No e-signature default ships, not even a
no-op one — `Qadi.enforce`'s existing fail-closed behavior on an unwired
obligation is the safe default already.

## Structurally outside the pipeline

Retention, archival, chain-integrity verification and the decommissioning
checklist are pure functions and data — caller-invoked, caller-scheduled,
since this package has no scheduler of its own. E-signature capture is wired
through `Qadi.ts`'s `ObligationHandler`, not `DecisionSink`:

```ts
import { signatureObligationHandler, SIGNATURE_MEANINGS } from "@qadi/audit";

Qadi.enforce(policy, {
  onObligations: signatureObligationHandler(mySignaturePort, SIGNATURE_MEANINGS.APPROVED),
});
```

## Testing

`AuditTrailPortTest`/`AuditStagingPortTest` ship as public, deterministic,
in-memory `Layer` factories for any consumer's own tests.

See [ADR-QD-056](https://github.com/leaderiop/qadi/blob/main/spec/decisions/056-audit-companion-package.md).

## License

MIT
