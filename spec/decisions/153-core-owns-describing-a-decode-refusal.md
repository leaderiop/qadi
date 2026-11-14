# ADR-QD-153 — Core owns describing a decode refusal

> **Document Control**
>
> | Property       | Value                                               |
> | -------------- | --------------------------------------------------- |
> | Document ID    | QADI-ADR-153                                        |
> | Revision       | 1.1                                                 |
> | Effective Date | 2026-11-14                                          |
> | Status         | Accepted — amends ADR-QD-095 and ADR-QD-143         |
> | Author         | Qadi Engineering                                    |
> | Classification | Architecture Decision Record                        |
> | Change History | 1.1 (2026-11-14): measured: the single decode before and after, and a new refusal before and after (ARCH-87, CCR-QD-431)<br>1.0 (2026-11-14): Initial release (ARCH-87, CCR-QD-431) |

---

## Context

The encode side of a sink record has one vocabulary, one describer and one tag-only annotations
helper, all in `JsonRefusal.ts` ([ADR-QD-116](./116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md)).
The decode side has the vocabulary (`DecodeRefusal`) and nothing else, so its consumers restate it:

- `SinkCodec.ts`'s private `asDecodeRefusal` maps an `UntrustedRefusal` (or an unsupported version)
  to a `DecodeRefusal`, and `AuditEntry.ts` repeats the `UntrustedValueRefusal` half of that mapping
  in its own `asDecodeRefusal`.
- `@qadi/devtools` renames the refusal a second time: `reasonOf` maps each `DecodeRefusal` to a word
  of `MalformedReason`, and the default warning annotates that word as `qadi.reason`. The five-word
  essay explaining them lives in `Source.ts`'s comments.

A new refusal is therefore a compile error in three places, and the words one place invents are not
the tags another place reports. Separately, `@qadi/audit` decodes a row's record twice:
`decodeSinkRecord` through the strict decoder, then `recordJsonOf` through a deliberately lenient
second decode to get the record's JSON form for `AuditEntry`. The second decode carries a branch
(`malformed(json.failure.message)`) that no input reaches once the first has accepted the row, and
it is one of the eleven counted tokens in `UNTRUSTED_DECODE_BUDGET`.

## Decision

**Core states what a decode refusal is called, says and carries, and decodes a record's JSON form
in the same pass as the record.** Devtools and audit stop restating it. (ARCH-87, CCR-QD-431.)

1. **The compatibility decision.** `sourceFromEventSource`'s `onMalformed` becomes
   `(frame: string, refusal: DecodeRefusal) => void`, receiving core's value unrenamed. With no
   callback the warning keeps its fixed message `qadi/devtools: a frame was not a decision record`
   and is annotated by core's `decodeRefusalAnnotations(refusal)` (one key, `qadi.refusal`, the
   refusal's `_tag`, the key the encode side already uses) plus devtools' own `qadi.frame`.
   `qadi.reason`, `MalformedReason` and `reasonOf` are deleted with no deprecated alias. This is
   `@qadi/devtools`'s one Breaking change, and the upgrade map is one row per word:

   | Was (`MalformedReason`) | Now (`DecodeRefusal._tag`) |
   | ----------------------- | -------------------------- |
   | `not-json`              | `NotJson`                  |
   | `too-deep`              | `TooDeep`                  |
   | `not-a-record`          | `Malformed`                |
   | `unsupported-version`   | `UnsupportedVersion`       |
   | `inconsistent`          | `Inconsistent`             |

   `not-a-record` collapses into `Malformed`: it named both the envelope refusal and a record the
   wire does not describe, and `Malformed.message` tells the two apart.

2. **Core's describer.** `describeDecodeRefusal`, `decodeRefusalAnnotations` with its type
   `DecodeRefusalAnnotations`, and `decodeRefusalOf` (the one `UntrustedRefusal` to `DecodeRefusal`
   mapping) live in `SinkWire.ts` beside `DecodeRefusal`. The only new edge is
   `import type { UntrustedRefusal } from "./UntrustedDecode.ts"`, cycle-free because
   `UntrustedDecode.ts`'s closure (`DecodeDepthGuard.ts`, `JsonShape.ts`) does not reach
   `SinkWire.ts` ([ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md), `pnpm circular`).
   `describeDecodeRefusal` is total and a module-scope `Match.tagsExhaustive`, so a new member is a
   compile error in `packages/core/src` only. It shows `UnsupportedVersion.version` only through a
   `typeof`-only bounded description (a string cut at 40 UTF-16 code units, a number or boolean as
   text, `none` for undefined, `null`, a noun for anything else) and `Malformed.message` cut at 200
   code units, never calls user code and never throws. The annotations carry exactly `qadi.refusal`,
   never `message` or `version`, and the sentence is never an annotation or the default log message
   ([INV-QD-104](../invariants.md#inv-qd-104-a-refusal-report-says-where-never-what)). The rule
   `no-refusal-annotation-outside-core` gains `packages/core/src/SinkWire.ts` in `EXEMPTIONS`, the
   module that now states the key on the decode side. There is no reporter in core: one consumer
   reads a refusal, and it keeps its `Effect.logWarning` adapter.

3. **The single decode, counted.** `SinkCodec.ts` exports
   `decodeSinkRecordWithJson(input: unknown): Result<DecodedSinkRecord, SinkRecordNotDecodable>`,
   `DecodedSinkRecord` being `{ readonly record: SinkRecord; readonly json: SinkRecordJson }`. It is
   one strict decode through the existing `untrustedDecoder` and `versionThenEnvelope`, of a private
   schema `SinkRecordWithJson`, written
   `SinkRecordJson.pipe(Schema.decodeTo(Schema.Struct({ json: SinkRecordJson, record: SinkRecordWire }), …))`
   with `SchemaGetter.transform` in both directions. The strict walk of the source is the JSON form
   with unknown envelope keys already absent, and it is the same value the pair carries, so `json`
   is typed by construction: no `as` and no `Schema.is` step. `decodeSinkRecord` and
   `decodeSinkRecordString` read through the same path.

   The transformation is a schema-level decode, and it is counted. `SinkCodec.ts` goes from 1 to 2
   in `UNTRUSTED_DECODE_BUDGET`, its `_NAMES` entry gains `SinkRecordWithJson`, and its AGENTS.md
   §7a row says why. `AuditEntry.ts`'s row retires with `recordJsonOf`, so the total of eleven does
   not move. `Schema.encodeTo` would build the same transformation reversed
   (`encodeTo(to)(from)` is `to.pipe(decodeTo(from))`) only so the budget's token pattern, a lexical
   `Schema.decode*`, does not see it. It is rejected: the budget counts where untrusted text is
   decoded, and a reversed spelling that leaves the count unchanged defeats the budget it is
   written under.

4. **Audit decodes once.** `decodeAuditEntry`'s entry record is the strict decode's `json`
   ([ADR-QD-110](./110-an-archives-facts-are-computed-once.md)): the archive's facts are computed
   once, not decoded twice. There is no re-encode, which can fail with `SinkRecordNotEncodable` on
   a read path and normalises a `Defect` cause. `recordJsonOf`, audit's `asDecodeRefusal` and the
   unreachable `malformed(json.failure.message)` branch are deleted. `Retention` is untouched. A
   differential over existing fixtures (an unknown envelope key, a key-order permutation, an
   explicit `undefined`, a float, a 60,000-deep record) is identical to the base on every row.

5. **Cost.** The single path walks the record three times (the source, `json`, `record`) where
   `decodeSinkRecord` walked it once. `UntrustedDecode.bench.ts`'s `decodeSinkRecord alone` is
   recorded before and after, and this ADR's later revision carries both figures. The fallback, if
   the figure is unacceptable, is two decoders built from one factory (a record-only one and a
   with-JSON one), not a cast.

## Alternatives considered

- **Re-encode the decoded record.** It can fail with `SinkRecordNotEncodable` on a read path, it
  normalises a `Defect` cause, and it could change what `Retention`'s counting sees.
- **Pass the prepared input through and narrow it with `Schema.is(SinkRecordJson)`.** It keeps the
  input's key order, so a permuted row's persisted bytes change, and it needs a narrowing step with a
  dead `false` branch.
- **A plain `Struct({ json, record })` fed by `prepare`.** Every `Malformed.message` gains a
  `["record"]` or `["json"]` path prefix, which breaks the message assertions and the audit
  differential.
- **`Schema.encodeTo`.** Rejected above: the same transformation, reversed to go uncounted.
- **A decode reporter in core.** One consumer reads a refusal; a reporter with one caller is a
  second place for its adapter to drift, and devtools' `qadi.frame` annotation has no core home.
- **A deprecated `MalformedReason` alias.** A Breaking change is not a cost here: the package is
  pre-1.0 and nothing is published, and an alias would keep the second vocabulary alive.

## Consequences

- `@qadi/devtools` is Breaking (minor, pre-1.0), with the five-word map in its changeset and
  `upgrading.md`. `@qadi/core` is a minor (new exports). `@qadi/audit` is a patch, because nothing
  observable changes.
- A new `DecodeRefusal` member is a compile error in `packages/core/src` only; devtools, audit and
  the Next.js example stop restating the vocabulary.
- `decodeSinkRecord` costs two more walks per record, bounded by the figure recorded above.
- [ADR-QD-095](./095-sinkcodec-owns-both-directions.md) names `decodeSinkRecord` as the one decode
  and [ADR-QD-143](./143-untrusted-json-is-decoded-through-one-module.md) lists `recordJsonOf` as a
  counted token; both are amended in place.

## Measured

**The cost.** `UntrustedDecode.bench.ts`'s `decodeSinkRecord alone`, on the base and after the
single decode, with the figures as they were recorded:

- decodeSinkRecord alone: 120,796.63 hz, mean 0.0084 ms (ran on `2356dc4e`, whose `packages/*/src` equals `phase_base`; `pnpm exec vitest bench --run --root packages/core UntrustedDecode --reporter=verbose`; the planning reading was 119,701.35 hz, mean 0.0084 ms)
- decodeSinkRecord alone: 54,601.48 hz, mean 0.0184 ms (base: 120,796.63 hz, mean 0.0084 ms; ratio 0.452 by hz, mean 2.19x; a second run read 54,617.21 hz; `pnpm exec vitest bench --run --root packages/core UntrustedDecode --reporter=verbose` at `0cbdb70a`)

The decode costs a little over twice what it did, about 10 microseconds more per record: the source
walk validates `SinkRecordJson`, then the target walk decodes `record` from the same value, on top
of the depth guard and the projection. That is paid per frame on `@qadi/devtools`' feed and per row
on `@qadi/audit`'s read path, neither of which is a per-evaluation path, and in exchange the record
and its JSON form can no longer disagree. The single path stays. The fallback named above, two
decoders built from one factory, is not taken: the cost is bounded and per record, and two decoders
would be two paths whose refusals must be kept identical.

**The vocabulary.** A new `DecodeRefusal` member was added as an experiment and reverted, before and
after the change. On the base `tsc` named one file, `@qadi/devtools`' `Source.ts` (`reasonOf`), and
one more exhaustive read sat outside `tsc`'s project, in the Next.js example's `api.ts`
(`refusedBecause`), found only by searching for `Match.type<DecodeRefusal>`. After the change `tsc`
names only `packages/core/src/SinkWire.ts` (`describeDecodeRefusal`), and no `Match.type<DecodeRefusal>`
remains outside it.

## Related

[ADR-QD-116](./116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md),
[ADR-QD-095](./095-sinkcodec-owns-both-directions.md),
[ADR-QD-143](./143-untrusted-json-is-decoded-through-one-module.md),
[ADR-QD-110](./110-an-archives-facts-are-computed-once.md),
[ADR-QD-096](./096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md),
[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md),
[INV-QD-104](../invariants.md#inv-qd-104-a-refusal-report-says-where-never-what).
