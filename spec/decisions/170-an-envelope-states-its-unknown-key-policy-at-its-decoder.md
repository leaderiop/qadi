# ADR-QD-170 — An envelope states its unknown-key policy at its decoder

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-170                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-11-19                                     |
> | Status         | Accepted — amends ADR-QD-096, ADR-QD-143; keeps ADR-QD-153; amended 2026-11-20 (the ignore projection reads only what it declares; the hydration payload stays refuse) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-11-20): amendment: _tag is read to choose a member only when the schema flattens to more than one; the bench gate names its statistic, the median of per-run minima (phase 66 review IN-01, IN-04)<br>1.1 (2026-11-20): amendment — the ignore projection reads only what it declares; the hydration payload stays refuse (ARCH-113, CCR-QD-457)<br>1.0 (2026-11-19): Initial release (ARCH-104, CCR-QD-448) |

---

## Context

`untrustedDecoder` ([ADR-QD-143](./143-untrusted-json-is-decoded-through-one-module.md)) runs one recipe: parse, guard,
`prepare`, strict decode. What it did with a top-level key the schema does not declare was not stated at any decoder. The
strict decode refused it as `Malformed` ([ADR-QD-002](./002-schema-derived-policy-adt.md)), and two envelopes held their
own tolerance beside it.

- **The record wire** kept an unknown envelope key by a projection in `prepare` (`envelopeOf`, built from two hand-derived
  key sets, `DECISION_KEYS` and `OBLIGATIONS_KEYS`), as [ADR-QD-096](./096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)
  D-15-c says an undeclared key is ignored. But the depth guard ran before `prepare`, so a deep unknown key was refused
  as `TooDeep`: a key whose content is ignored could still refuse the frame.
- **The stored envelope** (`{ environment, record }`) was read by a hand-built reader (`isPlainObject`, `Object.hasOwn`,
  `ownValue`, four hand-written messages, its own `JSON.parse`), and a deep unknown key was ignored there. Two envelopes
  in one module answered the same input differently.
- **Every other envelope** (the audit row, the archive, the hydration payload) was strict by the decode's default, with
  nothing at the decoder saying so.

D-15-c exists for a rolling deploy: a newer sender's additive envelope metadata must not refuse every frame because it
happens to nest past 256 levels.

## Decision

1. **D-01: a deep unknown top-level key on the record wire is ignored, never walked.** It was `TooDeep`. The owner's
   instruction for this phase settled the open questions:
   "for the Phase 57, answer by the cleanest solutions not the simplest, we dont care about the complexity, we should have the most clean solution".
   Ignored is what D-15-c means by ignored: a key that can still refuse the frame is not ignored, and keeping `TooDeep` would need a third value, "ignore
   but walk", leaving two envelopes in one module answering the same input differently. The guard exists so `Schema`'s
   recursive descent never meets hostile nesting (INV-QD-305); a dropped key is never descended into. This is a
   widening: input that was refused now decodes.
2. **D-02, D-16: `untrustedDecoder(schema, options)` takes a required closed `unknownKeys: UnknownKeyPolicy`**
   (`"refuse" | "ignore"`, exported), at every call site: the five envelope seams, `Policy.ts`, `PortWireEncode.ts`,
   `PortRemote.ts`, hydration's two entry decoders, the bench and the tests. It is read through a closed
   `Record<UnknownKeyPolicy, …>` table, never an `=== "ignore"` test, so a third value is a compile error. Every seam shows
   its rule where it is built, and no gate is needed to find an envelope that left it implicit (D-05).
3. **D-03, D-21: under `ignore` the declared keys come from the schema.** `EnvelopeKeys.ts` is a package-private leaf,
   out of the barrel, importing `effect` only. It reads `SchemaAST.toEncoded(schema.ast)` through a hoisted `Match` over
   `Objects`, `Union` and `Suspend`; a union member is selected by the input's own `_tag`, and an unknown or absent `_tag`
   takes the first member (today's decision set). A schema whose keys cannot be derived, a non-object, an array, or a
   union with no distinct literal `_tag`, throws when the decoder is built, with a message beginning
   `unknownKeys "ignore" needs`. No hand-written key set survives anywhere.
4. **D-19: the projection runs first.** The order is project, guard, `prepare`, decode. The projection is a top-level
   copy that reads the input's own key names, then each declared key's value once, a `_tag` once more to choose
   the member when the schema flattens to more than one, and an undeclared key's value never (since the 2026-11-20 amendment; it read every own value before), so
   it cannot overflow and changes no declared key's answer. The precedence D-15-c
   fixes is kept for every declared key: `TooDeep`, then `UnsupportedVersion`, then `Malformed`. `prepare` receives the
   projection; under `refuse` the projection is the input, so hydration's `checkVersion` is unchanged. This amends D-15-c's
   mechanism sentence and not the decision.
5. **D-07, D-08: the record wire and the stored envelope state `ignore`.** The record wire is
   `untrustedDecoder(SinkRecordWithJson, { unknownKeys: "ignore", prepare: checkVersion })` and `prepare` holds only the
   version check; `envelopeOf`, `DECISION_KEYS`, `OBLIGATIONS_KEYS` and `ownValue` are deleted. The stored envelope is
   `untrustedDecoder(StoredEnvelopeWire, { unknownKeys: "ignore", unwalked: ["record"] })`, `record` typed `unknown` and
   handed to the guarded `decodeSinkRecord` from its own root, and `decodeStoredRecordString` goes through `decodeText`.
6. **D-17: Route C for the stored envelope's messages.** Every refusal tag is unchanged, and the messages are the strict
   decoder's own. No classifier is rebuilt in `prepare`, which would restore the hand-built reader D-08 deletes. The
   changed messages are a deliberate behaviour change, pinned and recorded:

   | Input | Was | Is |
   | ----- | --- | -- |
   | not an object | `a stored record is a JSON object { environment, record }` | `Expected object` |
   | no `environment`, and no `record` (a bare record, `{}`) | `a bare record, not a stored-record envelope { environment, record }` | `Missing key` at `["environment"]` |
   | `record` and no `environment` | `a stored record's environment is not a string` | `Missing key` at `["environment"]` |
   | `environment` not a string | `a stored record's environment is not a string` | `Expected string` at `["environment"]` |
   | `environment` and no `record` | `a stored record names no record` | `Missing key` at `["record"]` |

   "A bare record" and "environment missing" become one message: both mean the envelope is not
   `{ environment, record }`.
7. **D-18: a deep `environment` is `TooDeep`.** It was `Malformed`, the hand-built reader's accident. `environment` is a
   declared, walked key, and the rule every other seam follows is that the guard walks each declared key it does not leave
   unwalked. This is the one tag the phase changes beyond D-01.
8. **D-20: D-01 reaches the audit row and archive.** They read the record through `decodeSinkRecordWithJson`, so a deep
   unknown key inside a stored row's record, or an archive entry's record, goes from `TooDeep` to success, and a deep
   unknown key with version 3 goes from `TooDeep` to `UnsupportedVersion`. It is the same decision, reaching a second
   reader, not a new one.
9. **D-09: every other seam states `refuse`.** `Policy.fromJson`, the port wires, the hydration payload, entry and policy,
   the archive envelope and the audit row keep their answers, their `unwalked` and their `prepare`, and now say so. The one
   place a D-15-c argument for `ignore` exists outside the record is the hydration payload (a newer server's additive
   metadata against an older client bundle). It was reported and not acted on here (ADR-QD-078 chose strict); the
   2026-11-20 amendment resolves it, and the payload stays `refuse`.
10. **`unwalked` is kept apart from the policy.** It composes with both values and means something else (INV-QD-306: a key
    a second decoder guards from its own root, typed `unknown`).

## Alternatives rejected

- **Keeping `TooDeep` for a deep unknown record key** (and changing the stored envelope to match). The smaller diff on the
  record, but it turns "ignored, however deep" into a refusal and keeps a key whose content is ignored able to refuse the
  frame. Rejected as incoherent, not as more work.
- **An optional `unknownKeys` defaulting to `refuse`.** A hidden default: an envelope that forgot the option would be strict
  and say nothing, which is how the policy went unstated in the first place.
- **Required only when an options object is passed.** One field would be required or defaulted depending on whether its
  siblings are present, an odd shape with a hidden default for the no-options call.
- **An `=== "ignore"` test.** A third value would silently take the other branch. The closed table makes it a compile
  error.
- **A message classifier rebuilt in `prepare`** (to keep the four stored messages). It restores the hand-built reader D-08
  deletes, for the sake of sentences nothing depends on.
- **`Malformed` for a deep `environment`.** The old answer was an accident of where the hand reader sat; it contradicts the
  rule that a declared key is walked.
- **Per-seam hand-written key lists.** They drift from the schema, which is the defect `DECISION_KEYS` and
  `OBLIGATIONS_KEYS` were derived to avoid, and the derivation was then written by hand twice.
- **Folding `unwalked` into the policy.** They answer different questions (what an undeclared key does, against which
  declared key the guard skips), and a fold would make `ignore` and `unwalked` one option with two meanings.
- **A type that refuses `ignore` for a non-object schema.** The build-time throw says the same thing at the one place the
  schema is read; a type-level version would need the encoded shape lifted into the type and gains no test the throw lacks.

## Mutation

The three mutation gates (`stryker.config.mjs`, `stryker.audit.mjs`, `stryker.react.mjs`, all unedited) were run on the phase
base and on the closing tree by `57-mutation.mjs`, each score as `(detected/scored)`, where detected is killed plus timeout
and scored adds survivors and no-coverage mutants (D-12). The numbers are those of `57-mutation-base.json` and
`57-mutation-after.json`.

| File | Base | After |
| ---- | ---- | ----- |
| `AuditArchive.ts` | 0.9811 (52/53) | 1 (53/53) |
| `AuditEntry.ts` | 1 (17/17) | 1 (17/17) |
| `SinkCodec.ts` | 0.9755 (159/163) | 0.9683 (122/126) |
| `UntrustedDecode.ts` | 0.9355 (29/31) | 0.9429 (33/35) |
| `HydrationEngine.ts` | 1 (169/169) | 1 (169/169) |
| `EnvelopeKeys.ts` | not built | 1 (48/48) |

`SinkCodec.ts` fell only as killed mutants moved out of it, its survivor set unchanged (four, the same lines). The leaf's
48 detected plus the decoder's gain of 4 cover the 37 detected that left. The static-ignored mutants of `EnvelopeKeys.ts`
were measured too, with `ignoreStatic: false` (`57-mutation-static.json`): all 9 are `Killed`. Five mutants in the leaf
survived the first run and were closed with tests, never a source rewrite or a re-baseline. The comparison printed
`WX-05 holds (D-12)`.

## Consequences

- **Breaking** for `@qadi/core`: `untrustedDecoder`'s `options` is required and `unknownKeys` is required in it. The
  migration is one line, `{ unknownKeys: "refuse" }`, which is what every decoder did before. `UnknownKeyPolicy` is a new
  export.
- Two widenings, both only of input once refused: a deep unknown top-level key on the record wire (D-01), and the same key
  inside an audit row's or archive entry's record (D-20). A deep `environment` on the stored envelope is now `TooDeep`
  (D-18). Five stored-envelope messages changed (D-17); no tag did apart from D-18.
- `SinkCodec.ts` holds one counted token, `SinkRecordWithJson`'s `Schema.decodeTo` (ADR-QD-153), and the untrusted-decode
  budget's total is 10. The stored-record non-seam retires: the envelope is a seam now. The leaf sentence names
  `EnvelopeKeys.ts` beside `DecodeDepthGuard.ts` and `JsonShape.ts`.
- INV-QD-359 and INV-QD-360 state the two properties (one option states an envelope's policy and no seam hand-builds it; an
  ignored key is never walked, so it cannot refuse the frame), and BEH-QD-621..625 the behaviours.
- ADR-QD-153 is kept: the audit row still reads one strict decode through `decodeSinkRecordWithJson`.

## Amendment (2026-11-20, CCR-QD-457): the projection reads only what it declares, and the hydration payload stays strict

D-19 said more than the code held, and D-09 left one question open. Both are settled.

- **The `ignore` projection reads names first.** D-19 said the projection reads no value. It read every one: it took
  the input's own entries, which runs every own enumerable accessor of an in-process value, declared or not, before it
  kept the declared keys, so an undeclared accessor that threw was thrown out of the decode. The sentence held for a
  `JSON.parse` result, whose values are data, but `decodeSinkRecord`, `decodeSinkRecordWithJson` and
  `decodeStoredRecord` take any value. The projection now takes the input's own enumerable key names, keeps those the
  member declares, and reads each kept value once into a fresh object, so an undeclared value is never read, an
  accessor's included. The input's own enumerable `_tag` is read to choose a member only when the schema flattens to more than one,
  so there it is read twice, once to choose and once as a kept value. A schema that flattens to one member, such as
  the stored envelope or a union of one, chooses no member, so no `_tag` is read to choose one: a declared `_tag` is read once, as a kept value, and an undeclared `_tag` accessor is
  never invoked. Only the top level is projected: the depth guard and the strict decode still read what lies under a
  kept value, accessors included, and under `refuse`, where nothing is projected, every own value of the input is read,
  declared or not. Making those reads accessor-safe was weighed and left out: this amendment states them rather than
  changing them (INV-QD-377, BEH-QD-666).
- **The hydration payload stays `refuse`.** D-09 reported a D-15-c argument for `ignore` on the hydration payload and
  did not act on it. The payload stays `refuse`: it is written by the same build that reads it, its version is
  checked, and an unknown top-level key there is more likely tampering than a newer sender's metadata, which a strict
  refusal reports as `MalformedPayload` (BEH-QD-269). `packages/react/test/UntrustedSeams.test.ts` pins it (H1), and
  `packages/react/src` is unchanged.

`untrustedDecoder`'s signature, the untrusted-decode budget and every refusal are unchanged; a `@qadi/core` patch
changeset records the change. The committed source was measured against the source before the change on the `ignore`
seams' workloads, 3 + 3 interleaved. The gate is on the median of per-run minima: no workload was more than 5% slower
by it, and the geometric mean of those deltas was no worse than +2%. The p50 and the mean of each workload are
recorded beside it and decide nothing; the means are the noisier, and the phase's `66-BENCH.md` and its
`bench/final/analysis.tsv` hold them.

## Related

[ADR-QD-002](./002-schema-derived-policy-adt.md), [ADR-QD-096](./096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md),
[ADR-QD-143](./143-untrusted-json-is-decoded-through-one-module.md), [ADR-QD-153](./153-core-owns-describing-a-decode-refusal.md),
BEH-QD-621..625, BEH-QD-666, INV-QD-359, INV-QD-360, INV-QD-377, ARCH-104, ARCH-113, CCR-QD-448, CCR-QD-457.
