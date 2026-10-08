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
import * as Layer from "effect/Layer";

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

## One wire, read back through a guard

An audit row's `record` is the same JSON the decision stream and forwarding
emit for that record — `@qadi/core`'s `encodeSinkRecord` output — so a store
persists `JSON.stringify(entry)` as it is, and a resolver error's `cause`
arrives as `{ name, message }` rather than `{}`. Read rows back with
`decodeAuditEntry`, which refuses a row nested past the decode bound with a
typed reason instead of overflowing the stack, and rebuilds the record.

A row is wire version 2, the only version this release reads. A row written
before 0.10 (wire version 1, with no `version` key) is refused as
`UnsupportedVersion`. Re-encode such rows with 0.10.x (`decodeAuditEntry`, then
`encodeAuditEntry`, from `@qadi/audit@0.10`) before upgrading.

## Refuses rather than approximates

A record carrying a value with no safe durable representation — a function,
a circular reference, a `bigint`, a `Map`/`Set`/`RegExp`/binary array, in the
resource, the policy or anywhere else — fails `AuditEntryNotEncodable`, with
the refusal and the path it was found at, rather than being partially written
or silently dropped. A refused record is reported, never dropped silently: it reaches
`onRefused` when you pass one to `AuditDecisionSinkLive`, otherwise it is logged as a
warning naming the refusal, its path and the `evaluationId`, and the
`qadi_audit_writes_total{outcome="encode_failed"}` counter increments either way. An unknown decommissioning step id fails `UnknownDecommissioningStep`
rather than silently no-opping. No e-signature default ships, not even a
no-op one — `Qadi.enforce`'s existing fail-closed behavior on an unwired
obligation is the safe default already.

## What the pipeline reports

Every record `record()` receives ends as exactly one outcome, and each outcome is
reported once: `qadi_audit_writes_total` counts it (every record, including those
the breaker refused), `qadi_audit_staging_total` counts what staging did, and the
line below is logged with the record's `evaluationId` and nothing else from the
entry. `AuditDecisionSinkOptions.onOutcome` receives the same outcome as a value
(`AuditWriteOutcome`), with the encoded entry, so you can dead-letter a lost entry
or record a gap marker yourself; `durabilityOf(outcome)` says whether it was
`Trail`, `StagingOnly`, `Lost` or `Refused`.

| Outcome | Where the entry is | `writes_total` | `staging_total` | Log |
| ------- | ------------------ | -------------- | --------------- | --- |
| `Refused` | nowhere (never encodable) | `encode_failed` | | `onRefused`, else a warning naming the refusal |
| `Written` | the trail | `written` | `staged` (committed), `staged` + `commit_failed`, `failed`, or none | a warning only if the commit failed |
| `WriteFailed`, unwired | **lost** | `write_failed` | none | warning: `audit entry dropped: trail write failed and no staging port wired` |
| `WriteFailed`, staged | staging only | `write_failed` | `staged` | info: `audit entry not written: trail write failed; its staged copy is left for reconciliation` |
| `WriteFailed`, stage failed | **lost** | `write_failed` | `failed` | warning: `audit entry dropped: trail write failed and staging failed` |
| `Skipped`, unwired | **lost** | `skipped_open` | `skipped_open` | warning: `audit entry dropped: circuit breaker open and no staging port wired` |
| `Skipped`, staged | staging only | `skipped_open` | `staged` | info: `audit entry not written: circuit breaker open; its staged copy is left for reconciliation` |
| `Skipped`, stage failed | **lost** | `skipped_open` | `failed_open` | warning: `audit entry dropped: circuit breaker open and staging failed` |

`qadi_audit_entries_lost_total{after, staging}` counts the four **lost** rows.

## Not tamper-evident (WD-07)

**The audit trail this package produces is not cryptographically
tamper-evident, and archiving it does not make it so.** `verifySequenceIntegrity`
(see `SequenceIntegrity.ts`) catches a gap or a duplicate in a caller-assigned
sequence number — accidental loss or reordering in the caller's own store — not
deliberate tampering: there is no per-entry hash, nothing links one entry to
the next, and an attacker who can modify stored rows can renumber them and
pass the check. `AuditArchive`'s `keyMaterial` is opaque pass-through metadata
this package never uses to sign or verify anything (see `AuditArchive.ts`),
and `DecommissioningChecklist`'s "Revoke signing keys" step names an action
this package has no part in performing. If a deployment needs tamper-evidence
— a hash chain, a signature per archive, a WORM store — that has to be built
and verified outside this library; nothing here provides it or claims to.

## Structurally outside the pipeline

Retention, archival, sequence-integrity verification (gap-and-duplicate
detection — not cryptographic tamper-evidence, see `SequenceIntegrity.ts`) and
the decommissioning checklist are pure functions and data — caller-invoked,
caller-scheduled, since this package has no scheduler of its own. E-signature
capture is wired through `Qadi.ts`'s `ObligationHandler`, not `DecisionSink`:

A row is selected for purging only with a finite `at` past a valid limit;
anything else retains. `getPurgeableEntries` and `enforceRetention` purge
nothing on an invalid `now` or `maxAgeMs` without saying so, so prefer
`planRetention`, which returns a `RetentionInputInvalid` and lists the `undated`
rows it kept.

Nothing here connects the two: `getPurgeableEntries` selects by age alone and
has no idea whether an entry was ever handed to `archiveAuditTrail`. **Archive
before you purge** is a documented invariant a caller must uphold itself, not
one this package can check — see the doc comments on `Retention.ts`'s
exports.

```ts
import { signatureObligationHandler, SIGNATURE_MEANINGS } from "@qadi/audit";
import * as Qadi from "@qadi/core";

Qadi.enforce(policy, {
  onObligations: signatureObligationHandler(mySignaturePort, SIGNATURE_MEANINGS.APPROVED, {
    // Records the signature `capture` returned, under (signer, resource), where a
    // resource-scoped `hasSignature` will look: read it back with
    // `signatureHistoryFromLedger(ledger)`.
    ledger,
  }),
});
```

The handler takes the discharged question: the signer is the subject the allow was
decided for, and the capture request carries `resourceId`, `action`, `resource` and
`evaluationId`. A `capture` returning a signature for a different signer or meaning
fails the discharge. Without a `ledger`, `capture` itself must persist where your
`SignatureHistory` reads, keyed by the request's `signerId` and `resourceId`.

## Testing

`AuditTrailPortTest`/`AuditStagingPortTest` ship as public, deterministic,
in-memory `Layer` factories for any consumer's own tests, and `SignatureLedgerTest`
is the in-memory `SignatureLedger` (with `signatureHistoryFromLedger` to read it back).

See [ADR-QD-056](https://github.com/leaderiop/qadi/blob/main/spec/decisions/056-audit-companion-package.md).

## License

MIT
