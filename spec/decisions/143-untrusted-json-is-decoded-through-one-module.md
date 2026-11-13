# ADR-QD-143 — Untrusted JSON is decoded through one module

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-143                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-11-12                                     |
> | Status         | Accepted — amends ADR-QD-096, ADR-QD-107       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-11-12): the one package-private isPlainObject lives in JsonShape.ts, shared by the decoder family and FieldPath.ts (ARCH-78, CCR-QD-421)<br>1.1 (2026-11-12): Budget exceptions: PortSpanEncode.ts reason states the property that holds (named keys, SpanValue leaves); JSON.parse is counted, adding SinkCodec.ts and SimulationForm.ts rows.<br>1.0 (2026-11-12): Initial (ARCH-78, CCR-QD-421) |

---

## Context

An untrusted JSON seam has to do four things in a fixed order: parse the text (when it is text),
refuse input nested past a bound before `Schema`'s recursive descent meets it, run whatever the
seam must do before the decode (a version check, a projection), and decode strictly
(`onExcessProperty: "error"`, ADR-QD-002). Each seam wrote that order by hand. At the phase base
(`055c8593`) eight did, in seven files, and they had drifted:

| Seam | Where | Guarded | Refusal it gave |
| ---- | ----- | ------- | --------------- |
| `Policy.fromJson`, `fromJsonValue` | `Policy.ts` | yes | `PolicyDecodeTooDeep`, or a `SchemaError` for **non-JSON text as well as malformed** |
| `PolicyFromJson`, a `Schema.fromJsonString(Policy)` | `Policy.ts` | **no** | a raw `RangeError` at tens of thousands of levels |
| `decodeSinkRecord`, `decodeSinkRecordString` | `SinkCodec.ts` | yes | `DecodeRefusal` |
| the port question and answer | `PortWireEncode.ts` | yes | a message |
| the remote reply | `PortRemote.ts` | yes | `RemotePortFailure.Undecodable` |
| the archive envelope | `AuditArchive.ts` | **no**: the strict decode refused a too-deep excess key before recursing, as `Malformed` | `ArchiveRefusal.Malformed` for a too-deep envelope |
| the audit row | `AuditEntry.ts` | yes | `DecodeRefusal` |
| the hydration payload, entry and policy | `HydrationEngine.ts` | yes, by a hand-built `{ ...payload, entries: [] }` that ran after an object check | `MalformedPayload` for a too-deep envelope |

Three gaps came out of the inventory:

- **G1.** The port question, answer and reply refused a too-deep input in three sentences with no
  row that exercised them deeper than the bound.
- **G2.** The hydration and archive envelopes nested past the bound were refused as *malformed*, not
  *too deep*: the archive envelope had no guard of its own, and hydration's ran after an object
  check, so the kind said nothing about why, and neither had a row deeper than the bound.
- **G3.** `PolicyFromJson` was a public schema that decoded untrusted text with no guard at all. A
  consumer who reached for it instead of `fromJson` got the `RangeError` ADR-QD-002's trust-boundary
  framing exists to prevent.

The same recipe was therefore complete in five places and missing or partial in three, and a ninth seam would have been
written by copying whichever file the author found first. The bound (`MAX_DECODE_DEPTH`, 256) and the
strict options were calibrated together: `onExcessProperty: "error"` forces `Schema`'s struct decoder
onto a path that costs more stack per level, which is why the bound fell from 8× to 4×
`DEFAULT_MAX_DEPTH`. Two constants that must move together lived in one file and were
imported by seven.

## Decision

**The recipe lives in one public `@qadi/core` leaf, `UntrustedDecode.ts`. A seam builds a decoder
from it once, at module scope, and keeps only a total mapping from its closed refusal into its own
error.** (ARCH-78, D-01 to D-12 of the phase.)

- **Two entry points, no third.** `untrustedDecoder(schema, options?)` returns
  `{ decode, decodeText }`. `decode` takes an already-parsed value; `decodeText` runs `JSON.parse`
  first. Both are synchronous and return a `Result`; a seam adapts it in one line
  (`Effect.fromResult`, `Result.getOrUndefined`). There is no separately exported guard step, no
  `Effect`-returning core and no `maxDepth` option, so a decoder cannot be built without the guard
  and there is one bound.
- **The refusal is closed.** `UntrustedRefusal = NotJson | TooDeep | Malformed`, a
  `Data.taggedEnum` like `DecodeRefusal` and `EncodeRefusal`. `NotJson` is raised only by
  `decodeText`; `UntrustedValueRefusal` is the union without it, which is all `decode` can say.
  `Malformed` carries the `Schema.SchemaError` as well as its message: `Policy.fromJson`'s public
  channel is `SchemaError`, and the devtools paste box prints the issue tree. A seam maps the
  refusal with `Match.tagsExhaustive`, so a new arm is a compile error at every seam.
- **`unwalked` and `prepare`, in a fixed order.** The order is guard, then `prepare`, then the strict
  decode. `unwalked` names top-level keys the guard leaves out because a second decoder guards them
  from its own root: hydration's `entries`, the audit envelope's `entries`, the audit row's `record`.
  It replaces hydration's hand-built `{ ...payload, entries: [] }`, and each key is pinned by a type
  (`UnwalkedKey<A>`: only a key typed `unknown` or `ReadonlyArray<unknown>` is accepted) and by a
  test that its slot is `Schema.Unknown` (INV-QD-306). `prepare` runs after the guard and before the
  decode; `SinkCodec` uses it for its version check (`UnsupportedVersion`) and the envelope
  projection of ADR-QD-096 D-15-c, which keeps the pinned order guard, version, project, decode.
  A `prepare` refusal tagged like one of the module's own is a compile error, so the union stays
  closed.
- **One bound, declared beside the options it was calibrated with.** `MAX_DECODE_DEPTH` is declared
  in `UntrustedDecode.ts` with the 4× calibration comment, and a test pins it to
  `DEFAULT_MAX_DEPTH * 4`. It stays public: BEH-QD-059 names it as normative and
  `PolicyDecodeTooDeep` reports it.
- **The strict options are private; the depth walk leaves the barrel.** `UNTRUSTED_DECODE_OPTIONS`
  is a module-private constant and `exceedsJsonDepth` is out of `@qadi/core`'s surface.
  `DecodeDepthGuard.ts` stays as the module's primitive and as the encode side's
  (`JsonHazard.ts`'s `wireHazard`, whose depth count must equal the guard's, INV-QD-096). A seam
  outside `@qadi/core` reaches the whole recipe through the decoder instead of assembling it, which
  is why BEH-QD-259 no longer requires the walk to be barrel-reachable.
- **A moved name is not re-exported from its old module** (after ADR-QD-116's `JsonRefusal.ts`).
  `Policy.ts` neither declares nor re-exports `MAX_DECODE_DEPTH`; its importers (`SinkCodec.ts`,
  `FieldPath.ts`, `Explanation.ts`, `PortWireEncode.ts`, `TreeFold.ts`, `RelationshipResolver.ts`,
  `Simplify.ts`, react's `HydrationEngine.ts`) import it from the leaf, and `PortWireEncode.ts` lost
  its edge to `Policy.ts`. The leaf imports `effect`, `DecodeDepthGuard.ts` and `JsonShape.ts` only (ADR-QD-037
  counts type-only edges), so `Policy.ts` can import it and never the reverse. `JsonShape.ts` is the
  one package-private plain-object predicate that `DecodeDepthGuard.ts`, the decoder, `SinkCodec.ts`
  and `FieldPath.ts` share; it holds no depth logic and no budget row.
- **The rule is enforced, not remembered.** `[untrusted-decode]` in `scripts/check-house-style.mjs`
  counts `onExcessProperty`, `exceedsJsonDepth`, `Schema.decode*` and `JSON.parse` tokens (comments and strings
  stripped) per file in `packages/*/src`, and AGENTS.md §7a states the table. It is
  `UNTRUSTED_DECODE_BUDGET`, checked in both directions like the other budgets. Six files carry a
  count, and each is an exception for a stated reason:

  | File | Count | Why it is allowed |
  | ---- | ----- | ----------------- |
  | `UntrustedDecode.ts` | 5 | the decoder: the guard's import and call, the strict option, one `Schema.decodeUnknownResult`, `decodeText`'s `JSON.parse` |
  | `DecodeDepthGuard.ts` | 1 | the walk's own declaration, package-private |
  | `AuditEntry.ts` | 1 | `recordJsonOf`, a *lenient* decode that runs only after the strict read accepted the record, so the entry is the row as this version describes it and not a copy of whatever extra a newer writer added (ADR-QD-096 D-15-c) |
  | `PortSpanEncode.ts` | 2 | `spanStruct` reads only its own named keys, and every leaf is a `SpanValue` primitive (INV-QD-044), so there is no nesting or excess key for a guard to bound; not an untrusted seam regardless of who supplies the map |
  | `SinkCodec.ts` | 1 | `decodeStoredRecordString` parses the stored envelope itself and must not walk it (an unknown envelope key is ignored, however deep); `record` reaches the guarded `decodeSinkRecord` from its own root |
  | `SimulationForm.ts` | 1 | `parseJson`, the form's own typed text parsed for the form's own validation |

### Where each seam now stands

| Seam | Decoder | Maps the refusal to |
| ---- | ------- | ------------------- |
| `Policy.fromJson` (text), `fromJsonValue` (value) | `untrustedDecoder(Policy)` | `PolicyDecodeTooDeep`, `PolicyNotJson`, `Schema.SchemaError` |
| `decodeSinkRecord`, `decodeSinkRecordString` | `untrustedDecoder(SinkRecordWire, { prepare })` | `DecodeRefusal` |
| port question, answer, remote reply | one decoder per schema | one sentence function: the too-deep text is written once, byte-identical |
| archive envelope (`readAuditArchive`) | `untrustedDecoder(ArchiveEnvelope, { unwalked: ["entries"] })` | `ArchiveRefusal` |
| audit row (`decodeAuditEntry`) | `untrustedDecoder(…, { unwalked: ["record"] })` | `DecodeRefusal` |
| hydration payload, entry, policy | three decoders, the payload with `{ unwalked: ["entries"], prepare }` | `PayloadRefusalReason`, `ClientHydrationDropReason` |

### The breaks

None of these is avoided; the project is not in production and the user's standing direction is the
cleanest design, with the break recorded rather than dodged. Each is a closed-union or surface change
written out in full (never `old | "New"`).

- **`PolicyFromJson` is removed** (`@qadi/core`). `Policy.fromJson` (text) and `Policy.fromJsonValue`
  (value) are the only policy decoders, both through the module (closes G3).
- **`UNTRUSTED_DECODE_OPTIONS` is no longer exported.** It was published by `Policy.ts` (CCR-QD-139);
  it is now private to the leaf.
- **`exceedsJsonDepth` is no longer exported from `@qadi/core`'s barrel.**
- **`fromJson`'s error channel gains `PolicyNotJson`** (`@qadi/core`, `Data.TaggedError`, code
  `ACL021`, a member of `QadiError`). Text that is not JSON was a `SchemaError`; it is now its own
  kind, so a caller can tell "this is not JSON" from "this is JSON that is not a policy". Too deep is
  still `PolicyDecodeTooDeep` (`ACL017`) and malformed is still the `SchemaError`.
- **`ArchiveRefusal` gains `TooDeep { maxDepth }`** (`@qadi/audit`): an archive envelope nested past
  the bound outside its entries. Per-entry attribution stays `EntryNotDecodable { index, refusal }`.
- **`PayloadRefusalReason` gains `PayloadTooDeep`** (`@qadi/react`, the ninth hydration drop reason):
  a payload nested past the bound outside its entries. Entry-level stays `EntryTooDeep`. The reason
  is a metric label, so `qadi_hydration_dropped_total` gains the series by preregistration; its id
  and description do not change.
- **The audit row's too-deep** maps to the existing `DecodeRefusal.TooDeep`: a row nested past the
  bound outside its record was `Malformed`, and is now told apart. No member is added.

### Non-seams

Four sites have a depth guard's neighbours but are deliberately outside the module, each for a reason
stated where it lives:

- **The stored-record envelope** (`decodeStoredRecord`, `decodeStoredRecordString`). It reads the
  envelope with `ownValue` and hands `record` to the guarded `decodeSinkRecord`. Walking the envelope
  would refuse a deep unknown envelope key that ADR-QD-096 D-15-c says is ignored.
- **`recordJsonOf`** (`AuditEntry.ts`). Lenient on purpose, and run only after the strict read
  accepted the record.
- **`PortSpanEncode.ts`.** Reads only its own named keys, and every leaf is a `SpanValue` primitive (INV-QD-044), so there is no nesting or excess key for a guard to bound, whoever supplies the attribute map.
- **`SimulationForm.ts`** (`@qadi/devtools`). The form's own typed text, parsed for the form's own
  validation; nothing crosses a trust boundary.

## Cost

The only added work is the second walk (a guard-and-decode per decoder where there was one walk and
one decode), measured once with `pnpm bench` on `packages/core/bench/UntrustedDecode.bench.ts`
(D-15), two runs. Throughput moves about 30% between runs (AGENTS.md §5a), so the figures are ratios
of one pair within one run and a range over the two.

| Pair | Ratio, per decode | Runs |
| ---- | ----------------- | ---- |
| policy decoder alone, against an entry decoder then the policy decoder, 10 frames | 1.19–1.22× | 2 |
| same, 60 frames | 1.04–1.05× | 2 |
| strict decode with no guard, against `untrustedDecoder(Policy)`, 10 frames | 1.13× | 2 |
| same, 60 frames | 1.09–1.11× | 2 |
| `decodeSinkRecord` alone, against a row decoder then `decodeSinkRecord` | 1.10–1.11× | 2 |

Hydration's second decoder costs about a fifth at ten frames and a twentieth at sixty, the cost of
the entry's scalar fields and a second guard walk that shrinks against a deeper policy. The guard
alone is a tenth. These are decode costs paid once per entry or per row on a cold path (a page's
hydration, an audit read), not per policy node on an evaluation path, so none is a reason to drop a
guard. **No guard was dropped** for the sake of any of them; a guard is never dropped for speed.

## Alternatives considered

- **An `Effect`-returning core.** Rejected: the decode is pure and synchronous, three of the seams
  (`Policy`, the port wire, hydration) adapt it differently, and an `Effect` core would force an
  `Effect.runSync` in the seam that wants an `Option`. A `Result` converts to each in one line.
- **A `maxDepth` option.** Rejected: the bound and the strict options were calibrated together
  (4×, with the options), so a seam passing its own number could silently overflow the stack that the
  options consume. One bound, declared once.
- **An exported guard step** (the depth check as a function a seam calls before `Schema.decode*`).
  Rejected: that is the status quo, and a seam can forget to call it. `decode` and `decodeText` being
  the only way in is what makes the guard unskippable.
- **Keeping `PolicyFromJson`, routed through the module.** Rejected: a `Schema` value cannot carry
  the guard, because the guard runs before `Schema` sees the input. A schema that decodes text is
  either guarded by being a function or unguarded by being a schema, and the unguarded one is G3.
- **`Option`-returning decoders.** Rejected: they lose the kind, and `Policy.fromJson`, the
  paste box and the audit archive each report which refusal it was.
- **Walking the stored envelope.** Rejected for the reason in the non-seams above: it changes what
  ADR-QD-096 D-15-c accepts.

## Consequences

- A new untrusted seam gets the guard by construction, and one that skips it is a gate failure
  rather than a review note: [INV-QD-305](../invariants.md) states the property and
  `[untrusted-decode]` enforces it.
- A partial walk is typed, named and pinned: [INV-QD-306](../invariants.md). A key named in
  `unwalked` that the schema does decode is a compile error, and each of the three keys has a
  60,000-deep row proving the second decoder guards it.
- Three refusal kinds at one seam can no longer disagree with another seam's: a too-deep input is
  `TooDeep` everywhere, including the two envelopes that said `Malformed` before.
- Consumers who matched `PolicyFromJson`, imported `UNTRUSTED_DECODE_OPTIONS` or `exceedsJsonDepth`,
  or matched `ArchiveRefusal` or `PayloadRefusalReason` exhaustively, have a compile or runtime
  change to make; the changesets and `upgrading.md` carry the list (CCR-QD-421).
- ADR-QD-096's D-15-c projection is now the decoder's `prepare` step and ADR-QD-107's strict decode
  is the module's; both carry a dated amendment pointing here.

## Related

[ADR-QD-002](002-schema-derived-policy-adt.md) (the trust boundary),
[ADR-QD-096](096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md),
[ADR-QD-107](107-a-port-is-answered-remotely-through-its-description.md),
[ADR-QD-116](116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md) (the precedent for a moved name),
[BEH-QD-486](../behaviors/08-serialization.md), [BEH-QD-487](../behaviors/08-serialization.md),
[BEH-QD-488](../behaviors/19-hydration.md), [BEH-QD-489](../behaviors/33-audit-pipeline.md),
[INV-QD-305](../invariants.md), [INV-QD-306](../invariants.md), CCR-QD-421.
