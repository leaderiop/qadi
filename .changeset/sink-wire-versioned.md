---
"@qadi/core": minor
"@qadi/http": minor
"@qadi/audit": minor
"@qadi/devtools": minor
---

The decision-record wire is versioned, a decision's outcome on it is exclusive, and a reader ignores envelope metadata it does not know (ADR-QD-903, INV-QD-904, INV-QD-905).

**Rollout — read this first. This release writes wire version 2 by default, and a reader on an earlier release refuses it. Upgrade every *reader* of decision records (devtools panels, aggregators, audit tooling) to this version before any *writer*, or set `wireVersion: 1` on `decisionSinkForwarding`, `decisionStreamRoute` and `AuditDecisionSinkLive` until they have upgraded.**

- **Two wire versions, both read.** Version 1 is the wire every earlier release wrote (no `version` key; the outcome as `decided` or `failed`), and is read for good, so audit rows written by any earlier release — including `@qadi/audit` 0.3/0.4 rows whose error still carries the `code` 0.5.0 dropped — keep reading. Version 2 adds `version: 2` and carries the outcome as one tagged value, `outcome: { _tag: "Decided", decision } | { _tag: "Failed", error }`. Any other `version` is refused as `UnsupportedVersion`.
- **Choosing the version a sender writes.** `encodeSinkRecord`/`encodeSinkRecordString` take `{ wireVersion }`, defaulting to the new `DEFAULT_WIRE_VERSION` (`2`); `decisionSinkForwarding`, `DecisionStreamOptions` and `AuditDecisionSinkLive` take the same `wireVersion`. `WireVersion` (`1 | 2`), `WIRE_VERSIONS` and `SinkRecordEncodeOptions` are exported.
- **A newer sender's extra envelope field no longer refuses the record.** A top-level key a reader does not declare is ignored; a key it does not declare anywhere nested — inside the policy, the trace, the decision or the error — is still refused.
- **Breaking (`@qadi/core`):** a decision record naming neither outcome, or both, is now refused as `Malformed` instead of decoding to an invented `MissingResource` error (indistinguishable by `ACL004` from a real resolver failure) or a silently chosen `decided`. `DecodeRefusal` gains `UnsupportedVersion { version, supported }`, so an exhaustive match over it needs an arm. `SinkRecordJson` is the closed union of version-1 and version-2 bytes.
- **Breaking (`@qadi/audit`):** `AuditEntry.record` is that union, so a store adapter reading `entry.record.decided` directly must narrow on `"version" in entry.record`. `decodeAuditEntry` reads both versions with the same leniency and strictness as the core decode; it is the one re-parse path — the `AuditEntry` schema alone silently strips a typo inside a stored policy.
- **Breaking (`@qadi/devtools`):** `MalformedReason` gains `"unsupported-version"`: a server newer than the panel, fixed by upgrading the panel.
