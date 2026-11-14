# Phase 40: Core owns describing a decode refusal - Pattern Map

**Mapped:** 2026-11-14
**Files analyzed:** 14 (create/modify groups)
**Analogs found:** 13 / 14 (the `Schema.decodeTo` pair has no in-repo analog)

All analog paths below were checked as git-tracked source (no capability mirrors involved).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/SinkWire.ts` (add `describeDecodeRefusal`, `decodeRefusalAnnotations`, `decodeRefusalOf`) | utility (vocabulary) | transform | `packages/core/src/JsonRefusal.ts:91-153` | exact (mirror) |
| `packages/core/src/SinkCodec.ts` (pair schema, `decodeSinkRecordWithJson`, delete private `asDecodeRefusal`) | codec | transform | itself, `SinkCodec.ts:493-533` | exact |
| `packages/devtools/src/model/Source.ts` + `src/index.ts:116` | adapter | event-driven (SSE frame) | itself, `Source.ts:215-291` | exact |
| `packages/audit/src/AuditEntry.ts` | model/codec | transform | itself, `AuditEntry.ts:150-209` | exact |
| `scripts/check-house-style.mjs` (`UNTRUSTED_DECODE_BUDGET`, `_NAMES`, `EXEMPTIONS`) | config/gate | batch | itself, lines 631-660, 338-340 | exact |
| `AGENTS.md` §7a table | doc | n/a | its own table | exact |
| `spec/decisions/153-*.md` + `spec/decisions/index.yaml` | doc/record | n/a | `spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md`, index.yaml:457 | exact |
| CCR-QD-431 row, BEH-QD-536..540, INV-QD-325..326, traceability, overview rows | doc | n/a | the CCR-QD-430 / Phase 39 rows in `spec/README.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md` | exact |
| `.planning/.../40-mutation-base.json` | artifact | batch | `.planning/phases/QD-39-*/39-mutation-base.json` | exact |
| `.changeset/*.md` (core minor, devtools Breaking, audit patch) | config | n/a | `.changeset/sink-wire-version-stated-once.md`; commit `c15624a5` `atom-set-sweep.md` | exact |
| `upgrading.md` (website docs), devtools README, website devtools page, `examples/nextjs-newsroom/src/client/Dock.tsx:73`, `packages/http/src/DecisionStreamRoute.ts:32` | doc/example | n/a | `c15624a5`'s `upgrading.md` section ("0.12: the atom set holds its own bound", ts Before + compiled tsx After) | role-match |
| Tests: table pin of five words, describer/annotations sentinel, audit differential, `surface.tst.ts`, `Source.tst.ts` | test | transform | existing `Source.test.ts`, `AuditEntry.test.ts:337-348`, INV-QD-104 sentinel test of `encodeRefusalAnnotations` | role-match |
| `spec/behaviors/26-decision-stream.md`, BEH-QD-204 | doc | n/a | self | exact |
| Schema transformation `Schema.decodeTo` + `SchemaGetter` in SinkCodec | schema | transform | none in `packages/*/src` (grep for `decodeTo`/`SchemaGetter` is empty) | none |

## Pattern Assignments

### `packages/core/src/SinkWire.ts` (add describer, annotations, mapping)

**Analog:** `packages/core/src/JsonRefusal.ts`. `JsonRefusal.ts` is a leaf importing only `effect`; check `SinkWire.ts` imports before putting `UntrustedValueRefusal` there (ADR-QD-037 counts type-only edges). D-08 says: if that creates a cycle, use the nearest module that may import both and state why.

**Module-scope total matcher** (JsonRefusal.ts:91-100, 143-153):
```ts
export const encodeRefusalPath: (self: EncodeRefusal) => WirePath | undefined = Match.type<EncodeRefusal>().pipe(
  Match.tagsExhaustive({ Circular: (r) => r.path, /* ... */ EncodeFailed: () => undefined }),
);
export const describeEncodeRefusal: (self: EncodeRefusal) => string = Match.type<EncodeRefusal>().pipe(
  Match.tagsExhaustive({
    TooDeep: (refusal) => `${where(refusal.path)}: nested deeper than ${refusal.maxDepth} levels, past what a reader will decode`,
    EncodeFailed: (refusal) => `the record could not be encoded: ${refusal.message}`,
  }),
);
```
Write `describeDecodeRefusal: (self: DecodeRefusal) => string` the same way, five arms: `NotJson`, `TooDeep{maxDepth}`, `Malformed{message}`, `Inconsistent{disagreement}`, `UnsupportedVersion{version, supported}`. Render `version` only through a bounded safe description (length cap, never throws on a symbol, a throwing getter, or a huge string). The sentence must name reason and fix.

**Annotations helper** (JsonRefusal.ts:107-130). Exactly one key, and a sentinel test proves no value leaks:
```ts
export type DecodeRefusalAnnotations = { readonly "qadi.refusal": DecodeRefusal["_tag"] };
export const decodeRefusalAnnotations = (refusal: DecodeRefusal): DecodeRefusalAnnotations => ({ "qadi.refusal": refusal._tag });
```
The doc comment shape is the "Says where, never what (INV-QD-104)" paragraph at :113-122.

**The one mapping** (move from SinkCodec.ts:496-505 and export; delete the copy at AuditEntry.ts:159-164):
```ts
const asDecodeRefusal: (refusal: UntrustedRefusal | UnsupportedVersion) => DecodeRefusal = Match.type<
  UntrustedRefusal | UnsupportedVersion
>().pipe(
  Match.tagsExhaustive({
    NotJson: () => DecodeRefusal.NotJson(),
    TooDeep: ({ maxDepth }) => DecodeRefusal.TooDeep({ maxDepth }),
    Malformed: ({ message }) => DecodeRefusal.Malformed({ message }),
    UnsupportedVersion: (refusal) => refusal,
  }),
);
```
Audit's row decoder (`decodeRow`) yields only `UntrustedValueRefusal` (TooDeep | Malformed), so a single mapping over the wider union serves both only if the types accept the narrower input. A function over the wider union does accept a narrower argument.

**Gate interplay:** `no-refusal-annotation-outside-core` (check-house-style.mjs:268-280) matches `"qadi.refusal"` and `"qadi.path"` literals in `packages/*/src`. The new helper adds the literal `"qadi.refusal"` in core, so either
- add `packages/core/src/SinkWire.ts` to `EXEMPTIONS` (line 338-340; `[stale-exemption]` requires the file to exist and, presumably, to be used), or
- have SinkWire reuse `encodeRefusalAnnotations`' key by a shared constant.

Devtools must not restate the literal; it spreads the helper plus `qadi.frame`. Update the rule's message and comment to mention `decodeRefusalAnnotations`.

---

### `packages/core/src/SinkCodec.ts` (single decode with JSON form)

**Analog:** the existing wiring, SinkCodec.ts:493-533:
```ts
const sinkWire = untrustedDecoder(SinkRecordWire, { prepare: versionThenEnvelope });
export const decodeSinkRecord = (input: unknown): Result.Result<SinkRecord, SinkRecordNotDecodable> =>
  decoded(Result.mapError(sinkWire.decode(input), asDecodeRefusal));
export const decodeSinkRecordString = (text: string) => decoded(Result.mapError(sinkWire.decodeText(text), asDecodeRefusal));
```
Related: `SinkRecordJson = Schema.toEncoded(SinkRecordWire)` (:315-317); `decodeStoredRecord` (:602) calls `decodeSinkRecord(ownValue(input, "record"))` and must keep reading through the same path.

**Pair schema (no analog in the repo; the recipe is from 40-RESEARCH.md and uses `Schema.decodeTo` per amended D-03, not `encodeTo`):**
- Source: `SinkRecordJson`. This is walk 1, with schema key order and unprefixed messages, so `Malformed.message` stays identical to today (AuditEntry.test.ts:337-348 asserts substrings).
- Getter: `SchemaGetter.transform((e) => ({ json: e, record: e }))` (check exact name and signature in `node_modules/effect/src/Schema.ts` and `SchemaGetter.ts`).
- Target: `Schema.Struct({ json: SinkRecordJson, record: SinkRecordWire })`.
- Expose `decodeSinkRecordWithJson: (input) => Result<{ record: SinkRecord; json: SinkRecordJson }, SinkRecordNotDecodable>` (name from RESEARCH). `decodeSinkRecord` is its `.record` projection, and `decodeSinkRecordString` should also read through the same wire.
- Run it under `untrustedDecoder(..., { prepare: versionThenEnvelope })`, so the guard, version check and envelope projection are unchanged.
- Add the declaration name to `UNTRUSTED_DECODE_BUDGET_NAMES`.
- No `as`, `!` or `any`.
- Re-run `packages/core/bench/UntrustedDecode.bench.ts:96` before and after (RESEARCH estimate: 6.35 to about 12 µs).

Key-order, undefined-field and float rows come from the differential tests, not from this code.

---

### `packages/devtools/src/model/Source.ts` (pass-through, Breaking)

**Analog:** itself, :215-291. Delete `reasonOf` (:220-228) and `MalformedReason` (:273). Keep `malformed` and `decodeFrame`, retyped:
```ts
onFailure: (error) => malformed(frame, error.refusal, onMalformed),
// malformed:
onMalformed === undefined
  ? Effect.logWarning("qadi/devtools: a frame was not a decision record").pipe(
      Effect.annotateLogs({ "qadi.frame": frame, ...decodeRefusalAnnotations(refusal) }))
  : Effect.sync(() => onMalformed(frame, refusal))
```
`onMalformed` is typed `(frame: string, refusal: DecodeRefusal) => void` at :126. Remove the `MalformedReason` export at `packages/devtools/src/index.ts:116`, and check `Match` and the `DecodeRefusal` imports. The five-word upgrade map is in CONTEXT D-07. Devtools has a named barrel (`devtools-named-barrel`), so `DecodeRefusal` stays imported from `@qadi/core` as a named import.

---

### `packages/audit/src/AuditEntry.ts` (decode once)

**Analog:** itself, :150-209. Replace the lines marked below. `decodeRow` (the unwalked `record`) stays.
```ts
const record = decodeSinkRecord(input.record);          // -> decodeSinkRecordWithJson(input.record)
...
const json = recordJsonOf(input.record);                 // delete (and its Schema.decodeUnknownResult)
if (Result.isFailure(json)) return malformed(json.failure.message);  // delete
const entry: AuditEntry = { record: json.success, ... }  // -> record: decoded.success.json
```
Delete `recordJsonOf` (:174), audit's private `asDecodeRefusal` (:159-164) and its `UntrustedValueRefusal` import. `decodeRow`'s failure maps through core's exported mapping (the `Match`, `DecodeRefusal` and `Schema` imports may shrink). The doc comment of `decodeAuditEntry` should cite ADR-QD-110 (audit facts computed once). `Retention` is untouched.

**Differential test rows over existing audit fixtures:** an unknown envelope key (dropped), a key-order permutation, `undefined` fields, a float, and a 60,000-deep record (`TooDeep`). The expected `AuditEntry` must equal the base output on every row. Write the differential green on base first (D-04 order).

---

### `scripts/check-house-style.mjs`, AGENTS.md §7a (budget change, one task)

**Analog:** lines 631-660.
```js
"packages/audit/src/AuditEntry.ts": 1,        // delete this row and its comment
"packages/core/src/SinkCodec.ts": 1,          // -> 2; extend the comment: also names the pair schema's Schema.decodeTo
...
"packages/audit/src/AuditEntry.ts": ["recordJsonOf"],           // delete
"packages/core/src/SinkCodec.ts": ["decodeStoredRecordString"], // -> ["decodeStoredRecordString", "<pair schema const>"]
```
The token regex (:662) is `/\bonExcessProperty\b|\bexceedsJsonDepth\b|\bSchema\.decode\w*|\bJSON\.parse\b/g`, so `Schema.decodeTo` matches once. Do not let a doc comment or string carry the token (comments and strings are stripped, but verify with the gate). The three checks are `[untrusted-decode]`, `[untrusted-decode-names]` and `[untrusted-decode-table]`, which compares AGENTS.md §7a's table (delete the `AuditEntry.ts` row, set `SinkCodec.ts` to 2 with a reason). The header comment of `UNTRUSTED_DECODE_BUDGET` and the §7a prose that mentions audit's lenient decode need an edit as well. The total stays unchanged.

---

### Records (ADR, CCR, BEH, INV, traceability)

**Analog:** Phase 39 (`ADR-QD-152`). Copy the structure of `spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md` into `153-core-owns-describing-a-decode-refusal.md`, and add an index.yaml entry beside :457:
```yaml
  - id: "ADR-QD-153"
    file: "153-....md"
    title: "..."
    status: "Accepted — mirrors ADR-QD-116"
```
ADR-QD-153 content, per CONTEXT: D-01, D-02, D-03 amended (counted `decodeTo`, and a sentence that `encodeTo` is the same transformation reversed and is not used), D-05..D-07 (compat decision recorded before any code), ADR-QD-110 and INV-QD-104 citations.

Confirm each reserved number is free by grep. Never run `scripts/next-id.mjs`. The CCR-QD-431 row goes where CCR-QD-430 is (`spec/README.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md` all mention 430, so mirror its footprint). Name unused BEH/INV numbers in the CCR row. Overview: name every new core export (`describeDecodeRefusal`, `decodeRefusalAnnotations`, the mapping, `decodeSinkRecordWithJson` and its result type), because gate 13 (`check-api-surface.mjs`) fails otherwise. Devtools overview rows drop `MalformedReason`.

### `.planning/.../40-mutation-base.json` (baseline commit alone, first)

**Analog:** `39-mutation-base.json`, shape:
```json
{ "measured": { "packages/core/src/HydrationMetrics.ts": 1, "packages/react/src/HydrationEvent.ts": 1 },
  "unmeasured": {}, "new": [], "deleted": {} }
```
Invocation pattern (39-01-PLAN.md:23): `pnpm exec stryker run <package config> --mutate '<file>'`, one file or config at a time, with the same invocation reused at close (core `stryker.config.mjs`, `stryker.react.mjs` as the react config's name; look up the devtools and audit config names). Files for 40: core `SinkWire.ts`, `SinkCodec.ts`, devtools `Source.ts`, audit `AuditEntry.ts`. Never edit afterwards; fix a drop with a test. Use `39-04-PLAN.md` and `39-02-PLAN.md:126` for the record-keeping task layout. The after file is `40-mutation-after.json`, a flat `{path: score}`.

### Changesets

**Analog:** `.changeset/sink-wire-version-stated-once.md` (core minor, `---\n"@qadi/core": minor\n---` plus prose) and `c15624a5`'s `atom-set-sweep.md`:
```md
---
"@qadi/react": minor
---

**Breaking.** `QadiProvider`'s `sweepIntervalMillis` prop is removed. <why>. Delete the prop.
```
Three files: `@qadi/core: minor` (new exports), `@qadi/devtools: minor` with a **Breaking.** lead for `MalformedReason`/`reasonOf` gone, `onMalformed` receiving a `DecodeRefusal`, `qadi.reason` replaced by `qadi.refusal`, with the five-word map, and `@qadi/audit: patch`. Use the bump level the repo's convention implies (the 0.x Breaking for react was `minor`). `upgrading.md` gets a section in the same shape as c15624a5's (a `ts` Before and a compiled `tsx` or `typescript` After; run `pnpm spec:website-examples` explicitly).

## Shared Patterns

### Totality and exhaustiveness
**Source:** JsonRefusal.ts:91-153. `Match.type<T>().pipe(Match.tagsExhaustive({...}))` at module scope with an annotated const type. A new `DecodeRefusal` member is a compile error in core only.

### Says-what-never-value (INV-QD-104)
**Source:** JsonRefusal.ts:113-122. Annotations carry the tag only. A sentinel test (a value that must not appear in any annotation, e.g. a `Malformed.message` or a `UnsupportedVersion.version` sentinel) is the analog of the encode-side test; find it with `grep -rn "encodeRefusalAnnotations" packages/core/test`.

### Untrusted decode
**Source:** AGENTS.md §7a. Only the budgeted files hold `Schema.decode*` / `JSON.parse` / `onExcessProperty` / `exceedsJsonDepth`. Tests are exempt.

### Imports, errors, style
Submodule namespace imports from `effect/*`, relative imports with `.ts`, `import type` for types, named imports across packages (`import { DecodeRefusal, decodeRefusalAnnotations } from "@qadi/core"`), no `as`/`!`/`any`, doc comments with a one-line summary then the why.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Pair schema (`Schema.decodeTo` with `SchemaGetter.transform`) in `SinkCodec.ts` | schema | transform | no `decodeTo`/`SchemaGetter` use in `packages/*/src`. Use RESEARCH.md's recipe (lines ~63, 105-121, 196-203) and the effect source (`node_modules/effect/src/Schema.ts`, `SchemaGetter.ts`) for exact names. Verify the typed result needs no cast. |

## Metadata

**Analog search scope:** `packages/core/src`, `packages/devtools/src/model`, `packages/audit/src`, `scripts/check-house-style.mjs`, `spec/decisions`, `.changeset`, `.planning/phases/QD-39-*`
**Pattern extraction date:** 2026-11-14
**Not checked:** exact test file names for the sentinel and Source tests, the devtools/audit stryker config names, whether `SinkWire.ts` can import `UntrustedRefusal` without a cycle (planner to run the circular-imports gate).
