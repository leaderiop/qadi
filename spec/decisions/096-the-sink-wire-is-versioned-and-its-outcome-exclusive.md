# ADR-QD-096 — The record wire is versioned, its outcome is exclusive, and its envelope tolerates unknown keys

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-903                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Accepted — amends ADR-QD-002, ADR-QD-056, ADR-QD-060 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |

---

## Context

A `SinkRecord` crosses process boundaries as JSON — forwarding's `send`, the
`/__decisions` stream, an `@qadi/audit` row — through the one codec
[ADR-QD-095](./095-sinkcodec-owns-both-directions.md) gave it
(`encodeSinkRecord`/`decodeSinkRecord`). ARCH-15 verified its wire at
`e0ee958` and re-read it after ARCH-09 at `899465c`:

- **C1. The outcome was two optional fields, not a union.** The wire's
  `Decision` member declared `decided?: DecisionWire` and
  `failed?: EvaluationError`, so its type admitted four states — decided only,
  failed only, both, neither — where the in-memory
  `DecisionRecord.outcome` is the closed `Decided | Failed`
  (`DecisionRecord.ts`). Only two of the four mean anything.
- **C2. Both outcomes: `decided` silently won** (ticket 155), "an artifact of
  check order, not a decision", by the code's own comment.
- **C3. Neither outcome: an invented error** (ticket 96). The rebuild
  fabricated `MissingResource("<malformed record: no outcome>")`, which a
  devtools row or a metric bucketed by code cannot tell from a real
  resolver-wiring failure (`ACL004`). BEH-QD-200 required it.
- **C4. A newer sender's extra envelope key rejected the whole record (GH-01).**
  `UNTRUSTED_DECODE_OPTIONS` (`onExcessProperty: "error"`) is right for the
  embedded `Policy` — a typo'd field must fail rather than drop a grant
  (ADR-QD-002) — but `Schema`'s parse options apply to a whole decode call, not
  to one nested position, so the strictness also covered the envelope. The
  GH-01 comment in `SinkCodec.ts` named it: an older receiver hard-rejects every
  record from a newer sender for the length of a rolling deploy, the same harm
  the `subjectId` fallback exists to avoid in the other direction.
- **The wire has already broken once, unversioned.** ADR-QD-060 deleted the
  error's `code` field in `@qadi/core` 0.5.0. `@qadi/audit` has persisted rows
  since 0.3.0, so a `Failed` row written by 0.3.x or 0.4.x carries
  `failed.code`, and the strict decode refused every one of them
  (`Expected no excess property at ["failed"]["code"]`). Nothing recorded that.
- **C5. One skew was tolerated, backwards only.** A record with no `subjectId`
  (a sender predating the field) decoded with a sentinel subject (PH-03).
- **C10. The audit row schema, decoded on its own, was not a reader.** Under
  `Schema`'s default options `AuditEntry` accepted a record naming no outcome
  and silently stripped a typo inside the embedded policy. `decodeAuditEntry`
  (ADR-QD-095) reads the record through `decodeSinkRecord` and refuses both.
- **The hydration payload already has a version convention**
  ([ADR-QD-078](./078-a-seed-is-its-own-type-and-the-payload-is-versioned.md)):
  a `version` key, absent meaning v1, an unknown value a named failure. The
  hydration payload does not embed the record wire, so it is untouched here.

## Decision

**The record wire carries an explicit version. Version 2 carries the outcome as
one tagged value. One inbound operation reads version 1 — for good — and
version 2, ignores top-level envelope keys it does not declare, and keeps every
nested position strict. The writer writes version 2.**

| Decision | Chosen |
| -------- | ------ |
| D-15-a — the outcome | `outcome: { _tag: "Decided", decision } \| { _tag: "Failed", error }` on the `Decision` envelope, mirroring `DecisionRecord.outcome` one for one. "Both" and "neither" are unrepresentable in the type, and the rebuild is one exhaustive `Match` with no defensive arm. The envelope's `_tag` stays `"Decision" \| "Obligations"` (ADR-QD-003) |
| D-15-b — version and rollout | A `version: 2` key on both envelope members; absent means version 1, the same spelling and the same "absent is v1" rule as ADR-QD-078. Planned as three releases (readers first, then the writer's default, then the v1 writer's removal); **landed in one** — see below |
| D-15-c — lenient envelope, strict content | Before one strict decode (`UNTRUSTED_DECODE_OPTIONS`), the input is projected onto the declared top-level keys of its member, the key set derived from the schema's own fields so it cannot drift. Everything nested — `Policy`, `Trace`, the decision, the error, the outcome — stays strict. The ignored keys are **not** logged: the codec is pure and returns `Result` (ADR-QD-095 D-09-a), so it has no logger to write to; see Consequences |
| D-15-d — the v1 reader | Permanent, and its schema frozen: the field order is part of the bytes, pinned by golden fixtures. This deliberately differs from ADR-QD-078, which retires its v1 reader after one minor: a hydration payload lives in one cached page, an audit row for years. Do not "harmonise" the two |
| D-15-e — the error surface | No new error class. `DecodeRefusal` (ADR-QD-095 D-09-b) gains `UnsupportedVersion { version, supported }`, as a full-union edit, so a version mismatch — fixed by upgrading the reader — is told apart from `Malformed`. A malformed outcome in either version is `Malformed`: in v1 from the exactly-one-outcome check, in v2 structurally |
| D-15-f — devtools | `MalformedReason` gains `"unsupported-version"`, the full closed union `"not-json" \| "too-deep" \| "not-a-record" \| "unsupported-version"` |
| D-15-g — pre-0.5 rows | The v1 reader tolerates exactly `failed.code`: that key, at that position, in version 1 only, dropped before the strict decode as the documented ADR-QD-060 artifact. Any other key under `failed` is still refused. A pre-0.5 `cause` rendered to a string decodes as that string (a string is a valid `Schema.Defect()` encoding) |
| D-15-h — the audit row | `AuditEntry.record` is `SinkRecordJson`, the closed union of both byte formats: what a store holds. `decodeAuditEntry` keeps its shape, `Result<{ entry, record }, SinkRecordNotDecodable>`, and reads either version. `AuditArchive`'s `archiveVersion` stays `"1"`: entries are self-describing, and the bundle's own shape did not change |
| D-15-i — `subjectId` | Required in version 2. The `UNKNOWN_SUBJECT` sentinel (PH-03) moves into the v1 upgrade, the only place the skew it describes can occur |
| D-15-j — who chooses the version | Planned as a `wireVersion` option on the three senders for the two releases a mixed fleet needs it in. With the stages landing together the option was added and removed in the same change, so the released writer has none |

**The rule for the future.** Additive, optional envelope metadata (a
`traceparent`, a host name) needs no version: a reader ignores a top-level key
it does not declare. Any change to content — the outcome, the decision, the
error, the policy, the trace — or to a required envelope field needs a new
version, because nested positions are strict on purpose.

**One in-memory wire type.** The v1 bytes decode into the v1 schema and are then
upgraded, by a pure function, into the v2 wire type; the rebuild into record
classes reads only v2. Encoding projects a record onto the v2 type; the v1
encoder, while it existed, was the inverse function feeding the frozen v1
schema. The upgrade is a function rather than a `Schema.decodeTo` transformation
into `Schema.toType` of v2 so the embedded `Policy` is walked once per decode,
not twice (the plan's named fallback, ARCH-15 C13).

### The staged rollout, landed together

The plan staged this over three minor releases so that, at every step, every
reader could read what every writer wrote:

| Phase | Readers | Writers |
| ----- | ------- | ------- |
| A | v1 and v2 | v1 by default; `wireVersion: 2` opt-in |
| B | v1 and v2 | v2 by default; `wireVersion: 1` to hold a lagging fleet |
| C | v1 and v2 (v1 permanently) | v2 only; the option removed |

All three phases land in **one** release. The readers that understand v1 and v2
ship in the same release whose writers write v2, and that release has no
`wireVersion` option. The pairing that results:

| Receiver ↓ / Sender → | Earlier release (writes v1) | This release (writes v2) |
| --------------------- | --------------------------- | ------------------------ |
| Earlier release (strict v1) | OK | **refused** |
| This release or later | OK (v1 reader) | OK |

**Rolling-deploy consequence.** In a fleet where receivers and senders are
separate deployments — a devtools panel or an aggregator reading another
service's stream or forwarding, audit tooling reading rows another service
writes — the order is the operator's to keep: **upgrade every reader of
decision records before any writer.** A writer upgraded first sends v2 records
that an earlier reader refuses: an earlier devtools panel drops them as
`not-a-record`, an earlier aggregator answers 400, an earlier
`decodeAuditEntry` refuses the row, and earlier tooling decoding rows with the
`AuditEntry` schema alone (never the sanctioned reader) silently reads a record
with no outcome, the C10 hazard. A process that is both the reader and the
writer of its own records — the in-process devtools, a store written and read by
one deployment — upgrades both halves at once and is unaffected. The changeset
and the release notes say this in bold.

## Consequences

**Positive.**

- "Which outcome did the sender mean" is a property of the type, not of the
  reader's check order: tickets 96 and 155 are closed, and the invented
  `MissingResource` is gone, so `ACL004` once again means only a resolver that
  could not find an attribute
  ([INV-QD-098](../invariants.md#inv-qd-098-a-decoded-decision-record-has-exactly-the-outcome-its-sender-sent)).
- A record decodes to the same `SinkRecord` whichever version carried it
  ([INV-QD-099](../invariants.md#inv-qd-099-a-record-decodes-the-same-whichever-wire-version-carried-it)).
- GH-01 is closed: additive envelope metadata no longer breaks a rolling
  deploy, while a typo inside the embedded policy is still refused.
- Rows written by `@qadi/audit` 0.3.x and 0.4.x read again.
- The version policy lives in one module (`SinkCodec.ts`) and this record.

**Negative.**

- **Breaking, 0.x minor.** `@qadi/core`: the bytes a sender writes (v2);
  `SinkRecordJson` is the union of both byte formats; `DecodeRefusal` gains a
  member, so an exhaustive match over it needs an arm; `WireVersion` and
  `WIRE_VERSIONS` are new. `@qadi/audit`: the row type is the union, so an
  adapter reading `entry.record.decided` must narrow on `version`.
  `@qadi/devtools`: `MalformedReason` gains a member.
- **No version escape hatch.** Because the stages landed together, a fleet
  cannot hold its writers at v1 for a release; the readers-first order above is
  the only lever.
- **Ignored envelope keys are silent.** A reader cannot tell from the decode
  that a newer sender added metadata. Making it observable would need either an
  effectful decode (a logger) or a second return value, each a change to
  ADR-QD-095's interface for a diagnostic; not taken.
- **The v1 schema can never change.** It is frozen by golden fixtures, which
  are now read-only: nothing writes version 1.
- **A trace is one level deeper.** Version 2 carries a decision's trace at
  `outcome.decision.trace`, one level below version 1's `decided.trace`, so a
  trace at the very edge of the decode depth bound (`MAX_DECODE_DEPTH`) that
  version 1 carried is refused at the sender as `TooDeep`. No evaluation under
  the default `maxDepth` comes near it.
- **`SinkRecordJson` stays the union.** The writer emits only the version-2
  member, but the type is what a receiver of the wire or a stored row may hold,
  so it is not narrowed to what this release writes.

## Alternatives considered

- **Lift the outcome into the envelope `_tag`** (`"Decided" \| "Failed" \|
  "Obligations"`). Flattest bytes, but the wire `_tag` would stop matching the
  in-memory `SinkRecord` tags, and every consumer switching on it would break.
- **Keep the two optional fields and add an exactly-one check.** Fixes the
  decode (it shipped first, as ARCH-15 T1), but the type still admits four
  states and GH-01 is untouched.
- **Shape-sniffing instead of a version key.** No mechanism for the next content
  change, and once unknown keys are ignored a future v3 key would be silently
  ignorable by a v2 reader — exactly wrong for content.
- **Transport negotiation** (an SSE event name, an HTTP header). *Wrong, not
  merely expensive*: audit rows have no transport, and BEH-QD-199 puts the
  wire's shape beside the record, not inside its first carrier.
- **A two-pass decode** (envelope lenient, `policy`/`outcome` decoded strictly
  afterwards). Two or three decode calls per record, and two passes that can
  disagree about what "envelope" means.
- **`StructWithRest` with an index signature.** One schema, but it leaks
  `{ readonly [k: string]: unknown }` into the wire type and everything typed
  by it.
- **Default parse options for the whole decode.** *Wrong*: it loosens the
  embedded `Policy` and reintroduces the silent-drop defect ADR-QD-002 exists
  to prevent.
- **Retire the v1 reader after N releases**, as ADR-QD-078 does. *Wrong* for
  persisted records: old audit rows would become unreadable by the library that
  wrote them.
- **A separate `UnsupportedWireVersion` error class with its own code.** The
  plan's first shape; with ADR-QD-095's closed `DecodeRefusal` in place, a
  second error would layer a parallel failure channel over the one reason union.
- **Ship the stages as three releases.** The plan's design, and the safer one
  for a fleet with independently deployed readers; set aside at the maintainer's
  direction so that the whole change lands at once, with the consequence above
  recorded rather than hidden.

## Related

Amends [ADR-QD-002](./002-schema-derived-policy-adt.md) (the version
discriminator it deferred, for the record wire only; `Policy` decoding is
unchanged and stays strict),
[ADR-QD-056](./056-audit-companion-package.md) (a persisted row is a closed
union of wire versions, read back with `decodeAuditEntry`) and
[ADR-QD-060](./060-schema-taggederror-for-the-nine-wire-crossing-errors.md)
(dropping `code` was an unversioned break; the v1 reader tolerates it). Reads
[ADR-QD-003](./003-tag-discriminant.md),
[ADR-QD-008](./008-error-taxonomy.md),
[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md),
[ADR-QD-044](./044-an-optional-decision-sink.md),
[ADR-QD-045](./045-the-topology-is-a-choice-of-sink.md),
[ADR-QD-046](./046-a-decision-feed-is-sse-and-guarded.md),
[ADR-QD-078](./078-a-seed-is-its-own-type-and-the-payload-is-versioned.md),
[ADR-QD-095](./095-sinkcodec-owns-both-directions.md).
[INV-QD-098](../invariants.md#inv-qd-098-a-decoded-decision-record-has-exactly-the-outcome-its-sender-sent),
[INV-QD-099](../invariants.md#inv-qd-099-a-record-decodes-the-same-whichever-wire-version-carried-it);
[BEH-QD-199](../behaviors/25-inspection.md),
[BEH-QD-200](../behaviors/25-inspection.md),
[BEH-QD-204](../behaviors/27-devtools-timeline.md),
[BEH-QD-312](../behaviors/33-audit-pipeline.md#beh-qd-312-a-stored-row-is-read-back-through-a-guard).
