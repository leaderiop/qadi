# Phase 40: Core owns describing a decode refusal - Research

**Researched:** 2026-11-14 (tree at `0a5a00a0`, branch `arch-wave-9`)
**Domain:** Effect v4 (`effect@4.1.2`) Schema transformations, a core codec (`SinkCodec.ts`), a devtools adapter, an audit reader, house-style budgets, spec records
**Confidence:** HIGH (typing, budget, compatibility surface, differential all read or run in this session); MEDIUM on the exact sentence wording and the per-decode cost (design choices, measured on a toy)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01: Audit gets the JSON form from core's strict decode, never by re-encoding.** Re-encoding can fail with `SinkRecordNotEncodable` on a read path, normalises differently, and could change what `Retention`'s `MutableHashMap<AuditEntry>` counts.
- **D-02: Core gets no reporter.** There is one consumer, and devtools keeps its `Effect.logWarning` adapter with `qadi.frame`.
- **D-03: Core's rows in `UNTRUSTED_DECODE_BUDGET` do not move.** Exactly one budget row goes away, for `AuditEntry.ts`. The new core export adds no counted `Schema.decode*` / `JSON.parse` token.
- **D-04: Plan shape, binding:**
  1. the compatibility decision first, with a table pin of the five words on the base and the mutation base;
  2. then the describer and annotations in core;
  3. then devtools;
  4. then audit, with the differential rows;
  5. then the one budget row that goes away, with AGENTS.md §7a, `[untrusted-decode-table]` and `[untrusted-decode-names]` in the same task;
  6. the break recorded in every place DREF-07 lists, plus `surface.tst.ts`, `Source.tst.ts` and `spec/behaviors/26-decision-stream.md`;
  7. run `pnpm spec:website-examples` explicitly.
- **D-05:** `onMalformed(frame, refusal: DecodeRefusal)`: the callback receives core's own refusal value, passed through. Devtools stops renaming it.
- **D-06:** The default warning, used when no callback is given, is annotated by core's tag-only helper plus devtools' `qadi.frame`. The helper sets `qadi.refusal`: the refusal's `_tag`, under the same key the encode side uses. `qadi.reason` goes away. This is DREF-01's compatibility decision. Record it in ADR-QD-153 before any code.
- **D-07:** `MalformedReason` and `reasonOf` are deleted outright, with no deprecated alias. The `@qadi/devtools` changeset is **Breaking** and carries the five-word upgrade map: `not-json` → `NotJson`; `too-deep` → `TooDeep`; `not-a-record` → `Malformed`; `unsupported-version` → `UnsupportedVersion`; `inconsistent` → `Inconsistent`. The map notes that `not-a-record` collapses into `Malformed`. A table pin of the five words is written on the base first.
- **D-08: Placement.** `describeDecodeRefusal`, the annotations helper and the `UntrustedValueRefusal` → `DecodeRefusal` mapping live beside `DecodeRefusal`, in core's sink-wire vocabulary (`SinkWire.ts`). If the import graph forbids the mapping there (`SinkWire.ts` is a leaf, ADR-QD-037), it goes in the nearest module that may import both. The planner states where and why. The mapping is exported, because audit's row decode needs it. `SinkCodec.ts`'s private `asDecodeRefusal` reads through the one mapping, and the duplicate in `AuditEntry.ts` is deleted.
- **D-09: What the sentence says.** `describeDecodeRefusal` is total, built once at module scope with `Match.tagsExhaustive`. It names the reason and its fix. It may include `Malformed.message` and the `supported` versions. It shows `UnsupportedVersion.version` (an `unknown`) only through a bounded, safe description, never raw. It never throws, whatever the version or message is. A new `DecodeRefusal` member is a compile error in core only.
- **D-10: The annotations helper carries exactly one key, `qadi.refusal`.** It never includes `Malformed.message` or `UnsupportedVersion.version`. A sentinel-value test proves this (INV-QD-104).
- **D-11: A new core export returns `{ record, json: SinkRecordJson }` from the one strict decode.** `json` is the decode's already-validated JSON form, with unknown envelope keys absent. `decodeSinkRecord` reads through the same path. No `as`; at most one narrow checked step to type the JSON form. Minor export, named in `spec/overview.md`. The planner names it, consistently with `decodeSinkRecord`/`decodeStoredRecord`.
- **D-12: Proof is a differential over existing audit fixtures.** It covers: an unknown envelope key, still dropped; a key-order permutation; `undefined` fields; a float; a 60,000-deep record, still `TooDeep`. `AuditEntry` output is identical to the base on every row. `Retention` is untouched. ADR-QD-110 (audit facts computed once) is cited.
- **D-13: Deleted together.** `recordJsonOf` and audit's `asDecodeRefusal` are deleted. In the same task, the `AuditEntry.ts` row leaves `UNTRUSTED_DECODE_BUDGET`, its `_NAMES` entry and the AGENTS.md §7a table.
- **D-14: The mutation baseline is committed alone, first, on the phase base.** It covers the touched source files (core `SinkWire.ts`/`SinkCodec.ts`, devtools `Source.ts`, audit `AuditEntry.ts`) with each package's own Stryker config and the exact invocation the close will use. A drop is fixed with a test, never re-baselined.
- **D-15: Reserved numbers only.** ADR-QD-153, CCR-QD-431, BEH-QD-536..540, INV-QD-325..326. Confirm each is free by grep, never run `node scripts/next-id.mjs`, and name unused numbers in the CCR row.
- **D-16: The break is recorded wherever a consumer reads it:** the devtools Breaking changeset with the upgrade map; `upgrading.md`; the devtools README; the website devtools page; the Next.js example's `Dock.tsx`; the `DecisionStreamRoute.ts:32` comment; BEH-QD-204; `spec/behaviors/26-decision-stream.md`; the overview rows; `surface.tst.ts` and `Source.tst.ts`.

### Claude's Discretion
- The new export's exact name, and the annotations helper's name (mirror `encodeRefusalAnnotations`, e.g. `decodeRefusalAnnotations`).
- The bounded description used for an `unknown` version: its length cap and its form.
- How the plans split, within D-04's order (granularity is `fine`).

### Deferred Ideas (OUT OF SCOPE)
None. Discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DREF-01 | Compatibility decision recorded before any code | Q4 table; ADR-QD-153 content in "Plan shape" step 1; the five-word map is in D-07 |
| DREF-02 | Total `describeDecodeRefusal`, module-scope `Match.tagsExhaustive` | Q3 (bounded description, sentences), Q2 (placement) |
| DREF-03 | Tag-only annotations helper; one `UntrustedValueRefusal` → `DecodeRefusal` mapping; sentinel test (INV-QD-104) | Q2 (placement, `no-refusal-annotation-outside-core` exemption), Q3, Validation Architecture |
| DREF-04 | Devtools passes `DecodeRefusal` through | Q4 table (Source.ts lines), Code Examples |
| DREF-05 | Audit decodes once, JSON form from core's strict decode; identical differential; 60,000-deep `TooDeep`; unknown envelope key dropped | Q1 (recommended design, experiments), Q6 (differential) |
| DREF-06 | `recordJsonOf` and audit's mapping deleted; budget, `_NAMES`, §7a agree | Q5 (exact lines) |
| DREF-07 | The break recorded everywhere it is read | Q4 table, Q9 (changeset convention, website gate) |
| WX-01..07 | Cross-cutting rows (gate green, records, overview, no forbidden constructs, mutation/coverage, characterise-first, Breaking recorded) | Plan shape, Validation Architecture |
</phase_requirements>

## Summary

The phase is a relocation plus one typing problem. Core already owns the decode vocabulary (`DecodeRefusal`, `SinkWire.ts:95-104`) and the encode side already has its describer, annotations and reporter in `JsonRefusal.ts`. Devtools renames `DecodeRefusal` one-to-one into five kebab words (`Source.ts:220-228`), and audit decodes a row's record twice: once strictly through `decodeSinkRecord`, once leniently through a `Schema.decodeUnknownResult(SinkRecordJson)` that is its only counted token (`AuditEntry.ts:174`, `:206`).

**The main finding (Q1).** Core can return `{ record, json }` from one decode with **no `as`, no `!`, no `any` and no narrowing step at all**, by decoding through a Schema transformation whose decoded side is `{ json: SinkRecordJson, record: SinkRecordWire }` and whose encoded source is `SinkRecordJson`, built with `Schema.encodeTo` (not `Schema.decodeTo`, see the budget note). Typing is by construction: the experiment compiled clean under the repo's own `tsc` with a deliberate canary error proving the check was live. It keeps every refusal message unchanged on the cases probed, keeps `json` in schema key order (the base `decodeAuditEntry` normalises a key-permuted row to schema order; a "pass the validated input through" design would not, which breaks D-12's key-order row), and adds no counted token. Its price is two extra structural walks per decode (toy: 6.35 µs → 11.0 µs per decode), paid by every caller of `decodeSinkRecord` because D-11 asks for one path.

**Everything else is mechanical but has three traps the CONTEXT does not mention:** (1) the house-style rule `no-refusal-annotation-outside-core` forbids the literal `"qadi.refusal"` in any `packages/*/src` file except `JsonRefusal.ts`, so putting the decode annotations helper in `SinkWire.ts` needs an `EXEMPTIONS` entry; (2) `SinkWire.ts` gains a type-only edge to `UntrustedDecode.ts` (verified cycle-free) and its "imports only…" doc must be edited; (3) the five-word upgrade map must say `not-a-record` collapses into `Malformed`, and the default log message must stay a fixed string because INV-QD-104 says a sentence is never a default log message.

**Primary recommendation:** Add `decodeSinkRecordWithJson` to `SinkCodec.ts` (decoder schema = `Schema.encodeTo` pair, prepare unchanged), make `decodeSinkRecord`/`decodeSinkRecordString` read through it, put `describeDecodeRefusal`, `decodeRefusalAnnotations` and the one mapping `decodeRefusalOf` in `SinkWire.ts` with an exemption entry for the annotation key, delete `reasonOf`/`MalformedReason`/`recordJsonOf`, and write the five-word table pin, the Malformed-message table and the audit differential green on the base before any `src` edit.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Describing a decode refusal (sentence, annotations, untrusted→wire mapping) | `@qadi/core` (`SinkWire.ts`) | — | The mirror of ADR-QD-116's encode side: the vocabulary and its readings live together so a new refusal is a compile error in one package |
| Strict decode that also yields the JSON form | `@qadi/core` (`SinkCodec.ts`) | — | One decode owns version check, envelope projection, depth guard and strictness; consumers must not re-run any of them |
| Reporting a dropped frame (log + callback) | `@qadi/devtools` (`Source.ts`) | — | D-02: one consumer, so the reporter stays an adapter; core only supplies the words |
| Reading a stored audit row | `@qadi/audit` (`AuditEntry.ts`) | `@qadi/core` | Audit owns the row envelope (`sequenceNumber`, excess keys) and takes the record's JSON form from core |
| Budget and gate bookkeeping | `scripts/check-house-style.mjs` + AGENTS.md §7a | — | Budgets and table change together (§7a, `[untrusted-decode-table]`) |

## Standard Stack

No new package. Everything is `effect@4.1.2` (installed, `node_modules/effect/package.json`) and the repo's own modules. [VERIFIED: node_modules/effect/package.json version 4.1.2]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` (Schema, SchemaGetter, Match, Data, Predicate, Result) | 4.1.2 | the transformation, the matchers, the tagged enums | already the house stack; `Schema.encodeTo`, `SchemaGetter.transform` read in `node_modules/effect/src/Schema.ts:5821-5842` |
| `vitest` + `@effect/vitest` | 5.1.0 / catalog | unit and property tests | project standard (`packages/*/vitest.config.ts`) |
| `tstyche` | 7.2.5 | type pins, checked `@ts-expect-error` | `pnpm exec tstyche --version` printed 7.2.5 |
| `@stryker-mutator/core` | 10.1.1 | per-file mutation baseline | `pnpm exec stryker --version` printed 10.1.1 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Schema.encodeTo` pair (recommended) | pass the prepared input through `untrustedDecoder` plus `Schema.is(SinkRecordJson)` | cheaper (about two walks), but `json` keeps input key order, so a key-permuted audit row's `entry.record` differs from the base (Q1 evidence); needs a public change to `UntrustedDecoder`; the `false` branch of the guard is dead code a mutant cannot kill |
| One decoder for both exports | two decoders (`sinkWire` record-only, `sinkWireJson`) | keeps `decodeSinkRecord` at one walk; D-11 says "the same path", so use it only if the recorded bench shows the extra cost matters |

**Installation:** none. **Package Legitimacy Audit:** no external packages are installed by this phase, so the gate has nothing to check. Packages removed as SLOP: none. Flagged SUS: none.

## Architecture Patterns

### System Architecture Diagram

```
untrusted input (unknown | text)
        |
        v
 untrustedDecoder(SinkRecordWithJson, { prepare: versionThenEnvelope })      [SinkCodec.ts]
   1. exceedsJsonDepth(input)            --> TooDeep           \
   2. versionThenEnvelope(input)         --> UnsupportedVersion |  UntrustedRefusal
        (own `version` in read set? else refuse; then project to envelope keys)
   3. strict decode (onExcessProperty "error"):
        source  SinkRecordJson  (walk 1, schema key order, messages unprefixed) --> Malformed
        getter  e => ({ json: e, record: e })
        target  Struct({ json: SinkRecordJson, record: SinkRecordWire })
                 json  -> E (identity, walk 2)    record -> T (the decoded wire, walk 3)
        |
        v  Result<{ json, record: SinkRecordWire }, UntrustedRefusal | UnsupportedVersion>
 decodeRefusalOf(...)  [SinkWire.ts, the one mapping]  --> DecodeRefusal
        |
        v  rebuild(record) --> SinkRecord  |  Inconsistent
 decodeSinkRecordWithJson : Result<{ record: SinkRecord, json: SinkRecordJson }, SinkRecordNotDecodable>
        |                              |
        v                              v
 decodeSinkRecord (.record)      decodeAuditEntry (entry = { record: json, sequenceNumber })
        |
        v
 decodeStoredRecord(String) --> devtools decodeFrame --onFailure--> onMalformed(frame, refusal)
                                                                    | default log: fixed message + decodeRefusalAnnotations(refusal) + qadi.frame
 describeDecodeRefusal(refusal) --> sentence for a caller holding the refusal (never a log message or annotation)
```

### Recommended Project Structure
```
packages/core/src/SinkWire.ts     # + describeDecodeRefusal, decodeRefusalAnnotations (+ type), decodeRefusalOf, private bounded describer
packages/core/src/SinkCodec.ts    # + decodeSinkRecordWithJson, DecodedSinkRecord; asDecodeRefusal deleted; decodeSinkRecord(String) read through the one path
packages/core/test/DecodeRefusal.test.ts   # new: sentence table, hostile-version totality, INV-QD-104 sentinel property, mapping table
packages/core/test/SinkWire.tst.ts         # + annotations type pin
packages/devtools/src/model/Source.ts      # reasonOf, MalformedReason, qadi.reason deleted; onMalformed(frame, refusal)
packages/audit/src/AuditEntry.ts           # recordJsonOf, asDecodeRefusal deleted; decodeAuditEntry reads one decode
scripts/check-house-style.mjs + AGENTS.md  # budget row, _NAMES, §7a row out; SinkWire.ts exempt from no-refusal-annotation-outside-core
```

### Pattern 1: the decoded side carries both values (Q1 recommendation)
**What:** a schema whose `Type` is `{ json, record }`, so `untrustedDecoder(...).decode` returns both with no cast.
**When to use:** whenever a reader needs the validated JSON form and the decoded value from one strict decode.
**Example:** see Code Examples (verified to compile by the toy experiment).

### Pattern 2: a reading beside its union, built once at module scope
Mirrors `describeEncodeRefusal` (`JsonRefusal.ts:143`): `const describeDecodeRefusal: (self: DecodeRefusal) => string = Match.type<DecodeRefusal>().pipe(Match.tagsExhaustive({...}))`. AGENTS.md §5a requires the annotated const for a recursive/exhaustive matcher built once.

### Anti-Patterns to Avoid
- **Re-encoding to get the JSON form** (D-01): `Schema.encodeResult` of the decoded wire normalises a `Defect` cause differently and is a new failure path on a read.
- **A sentence as an annotation or as the default log message** (INV-QD-104): the sentence may carry caller-controlled text; devtools' default log message stays the fixed string.
- **`Array.isArray` on an untrusted `version`** in the bounded description: it throws on a revoked Proxy. Use `typeof`.
- **Restating `"qadi.refusal"` in devtools**: the lint rule refuses it; call the core helper.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON form alongside the decoded record | a second decode, a re-encode, or a cast | `Schema.encodeTo(SinkRecordJson, { decode: SchemaGetter.transform(...), encode: SchemaGetter.transform(...) })` pair, read through `untrustedDecoder` | typed by construction; one strict decode; canonical key order |
| Untrusted → wire refusal mapping | a third `asDecodeRefusal` | one exported `decodeRefusalOf` in `SinkWire.ts` | two copies exist today (`SinkCodec.ts:496`, `AuditEntry.ts:159`) |
| Describing an `unknown` | `String(x)`, `JSON.stringify(x)` | a `typeof`-driven bounded describer (Q3) | `String` runs user `toString`; `JSON.stringify` throws on bigint and cycles |
| A kebab-case vocabulary in devtools | `reasonOf` | pass `DecodeRefusal` through | a 1:1 renaming that must change with every refusal |

**Key insight:** every one of these exists to make a new `DecodeRefusal` member a compile error in exactly one place, core.

## Q1. The typing of the JSON form (DREF-05, D-11)

### How the strict decode runs today
- `untrustedDecoder(schema, { unwalked?, prepare? })` builds `strict = Schema.decodeUnknownResult(schema, UNTRUSTED_DECODE_OPTIONS)` once (`UntrustedDecode.ts:174`), with `UNTRUSTED_DECODE_OPTIONS = { onExcessProperty: "error" }` (`:85`). `decode(input)` runs `exceedsJsonDepth(walked(input), MAX_DECODE_DEPTH)` → `TooDeep`, then `prepare`, then `strict` (`:183-193`); `decodeText` adds `JSON.parse` (`:195-205`). [VERIFIED: packages/core/src/UntrustedDecode.ts:85,174,183-205]
- `sinkWire = untrustedDecoder(SinkRecordWire, { prepare: versionThenEnvelope })` (`SinkCodec.ts:493`). `versionThenEnvelope` (`:474-480`) returns `Result.succeed(input)` for a non-object, `UnsupportedVersion` unless the own `version` is in the read set, else `envelopeOf(input)` (`:432-435`), the input filtered to the member's declared top-level keys. So **the sink wire has no `unwalked`: the depth guard walks the whole raw input, including an unknown envelope key's value**, and an unknown top-level key is gone before the strict decode ever sees it. [VERIFIED: SinkCodec.ts:432-435,474-480,493]
- `SinkRecordJson = Schema.toEncoded(SinkRecordWire)`, `type SinkRecordJson = typeof SinkRecordJson.Type` (`SinkCodec.ts:315-317`), exported through `export * from "./SinkCodec.ts"` (`index.ts:54`). `AuditEntry = Schema.Struct({ record: SinkRecordJson, sequenceNumber })` (`AuditEntry.ts:107-110`). [VERIFIED: those lines]

### Strict versus lenient, level by level (the subtlety)
| Level | `decodeSinkRecord` (strict) | `recordJsonOf` (lenient: default options) |
|-------|------------------------------|--------------------------------------------|
| Unknown top-level (envelope) key | removed by `envelopeOf` before the decode, so accepted and absent | ignored by the decode's default `"ignore"`, so accepted and absent |
| Unknown nested key (policy, trace, decision, error, outcome) | **refused** (`Malformed`, message names the path) | would be stripped, but is never reached because the strict decode refused first |
| Key order of the output | schema field order | schema field order |

So after a successful strict decode, the two forms of "the record's JSON" can differ only in key order, never in content. `decodeAuditEntry` accepts a row whose record has an unknown envelope key because the strict side projects it away (ADR-QD-096 D-15-c, `096-…md:133`); the lenient read then drops the same key. **"Differential identical" therefore demands: unknown top-level key absent, nested content unchanged, explicit `undefined` optional keys preserved, and key order canonical.** [VERIFIED by experiment below]

### What I ran (all deleted; `git status --porcelain -- packages scripts` empty afterwards)
1. **Base behaviour of the entry's record** (throwaway test in `packages/audit/test`): `decodeAuditEntry({ record: <keys reversed> })` returned `entry.record` keys `_tag,version,evaluationId,at,subjectId,policy,outcome`, the schema order, not the input order. A record with `resource: undefined` and `traceparent: "x"` returned keys `_tag,version,evaluationId,at,subjectId,policy,resource,outcome`: the explicit-`undefined` `resource` key is **kept**, the unknown key **dropped**, in schema position. [VERIFIED: run output 2026-11-14]
2. **"Pass the prepared input through" is not identical** (core throwaway test): for a key-permuted row `JSON.stringify(lenient)` ≠ `JSON.stringify(prepared)` (`sameKeysAsLenient(prepared): false`); strict decode of the prepared value under `SinkRecordJson` returns schema order. Retention counting is key-order insensitive (`Equal.equals({a,b},{b,a})` true, `Hash.hash` equal) but **sensitive to an explicit-`undefined` key** (`Equal.equals({a:1,b:undefined},{a:1})` false). So a pass-through is safe for `Retention` and unsafe for persisted bytes. [VERIFIED: run output]
3. **The recommended schema compiles with no cast.** Toy `Wire` (union of a struct with `Schema.Defect()`, an optional number and a version literal), `Json = Schema.toEncoded(Wire)`, `Pair = Schema.Struct({ json: Json, record: Wire }).pipe(Schema.encodeTo(Json, { decode: SchemaGetter.transform((e) => ({ json: e, record: e })), encode: SchemaGetter.transform(({ json }) => json) }))`, `untrustedDecoder(Pair, { prepare })`, result assigned to `Result.Result<{ readonly json: typeof Json.Type; readonly record: typeof Wire.Type }, unknown>`. A temp tsconfig extending `tsconfig.test.json` and including only the file ran `pnpm exec tsc -p … --noEmit` with **no output**; appending `const __bad: number = "x"` produced `TS2322` at the expected line, so the check was live. Runtime: `json` printed `{"_tag":"A","cause":{"name":"Error","message":"x"},"version":2}` (schema order, `at: undefined` input dropped by `stringify`) and `record.cause instanceof Error` was `true`; an excess key produced `Malformed` "Expected no excess property at [\"nope\"]". [VERIFIED: tsc and vitest runs]
4. **Message parity of the source walk.** Strict decode of `SinkRecordJson` versus `decodeSinkRecord` on seven rows (`at` Infinity and NaN, a bad decision `_tag`, a bad `subjectId`, a missing `outcome`, a stray second outcome, a typo inside the policy): identical `Malformed.message` on every one (e.g. `Missing key\n  at ["outcome"]`, `Expected no excess property\n  at ["policy"]["permision"]`). That matters because existing tests assert those substrings (`AuditEntry.test.ts:337,343,348`). [VERIFIED: run output]
5. **Cost.** Microbenchmark in `vitest` (20,000 iterations, a decided record with one trace child): `decodeSinkRecord` 6.35 µs, strict walk of `SinkRecordJson` alone 3.64 µs, the three-walk pair (toy with `record: SinkRecordJson`) 11.01 µs. Expect the real pair to be about 6.35 + 3.64 + 3.64 ≈ 12–13 µs. Only `@qadi/devtools` (per SSE frame) and `@qadi/audit` call `decodeSinkRecord` in `packages/*/src` (grep). `packages/core/bench/UntrustedDecode.bench.ts:96` benchmarks `decodeSinkRecord alone`; re-run it before and after and record the delta. [VERIFIED: bench run; MEDIUM that the real figure matches the toy]
6. **Dead branch.** Nine hostile `cause` values on `AttributeResolveError` (5, null, "x", `{name:1}`, arrays, booleans, nested undefined) gave the same accept/refuse answer from `decodeSinkRecord` and `decodeAuditEntry`; I found no input the strict decode accepts and the lenient `recordJsonOf` refuses, so `malformed(json.failure.message)` (`AuditEntry.ts:207`) looks unreachable. The single decode deletes it. [VERIFIED for the probed inputs; ASSUMED for all inputs]

### Candidates evaluated
| # | Design | Compiles without `as`? | Counted token (file) | Walks | `json` has unknown envelope key absent? | Same path as `decodeSinkRecord`? | Verdict |
|---|--------|------------------------|----------------------|-------|------------------------------------------|----------------------------------|---------|
| A | `untrustedDecoder` also returns the prepared input; `Schema.is(SinkRecordJson)` narrows it | needs the narrowing step; a dead `false` branch | none (`Schema.is` is not matched) | strict + `is` = 2 | yes | yes, if `decode` returns both | **No**: key order = input order (experiment 2) breaks D-12's permutation row; changes a public interface |
| B | **`Schema.encodeTo` pair, source `SinkRecordJson`, target `{ json, record }`** | **yes, by construction** (experiment 3) | none: the regex is `Schema\.decode\w*` (`check-house-style.mjs:662`) and `Schema.encodeTo` is not matched | source + json + record = 3 | yes (source walk output) | yes: `decodeSinkRecord` maps `.record` | **Recommended** |
| B′ | same pair but `prepare` returns `{ json: p, record: p }` and the schema is a plain `Struct({ json, record })`, no transformation | yes | none | 2 | yes | yes | **No**: every `Malformed.message` gains a `["record"]`/`["json"]` path prefix, breaking message assertions and the differential |
| C | `Schema.decodeTo(...)` for B | yes | **+1 in `SinkCodec.ts` (1 → 2)**: `\bSchema\.decode\w*` matches `decodeTo` | 3 | yes | yes | Conflicts with D-03; avoided by writing it as `encodeTo(to)(from)`, which the Effect source documents as `to.pipe(decodeTo(from))` (`Schema.ts:5809-5811` doc) |
| D | re-encode the decoded wire | yes | `Schema.encode*` not matched | 2 | n/a | n/a | **No**: D-01 forbids; normalises `Defect` causes |

**Recommendation: B, exported as `decodeSinkRecordWithJson`.** Justification: it mirrors the existing names (`decodeSinkRecord`, `decodeSinkRecordString`, `decodeStoredRecord`), says what it adds, returns `Result<DecodedSinkRecord, SinkRecordNotDecodable>` with `DecodedSinkRecord = { readonly record: SinkRecord; readonly json: SinkRecordJson }`, and the only `String` variant is not needed (audit's row is a parsed object), so do not add one.

**Flag for the planner on the budget (conflict check with D-03).** The token regex is a lexical `\bSchema\.decode\w*`, so a `Schema.encodeTo(...)` schema definition stays at SinkCodec's one counted token (`JSON.parse` in `decodeStoredRecordString`). That is accurate (the budget counts decode *calls*; a transformation definition is not a call), but `encodeTo(to)(from)` is `decodeTo` written the other way round. ADR-QD-153 should say so in one sentence rather than leave a reviewer to discover it. If the maintainer prefers the transformation counted, the honest alternative is SinkCodec.ts 1 → 2 with its §7a row and `_NAMES` updated, which D-03 rules out. [VERIFIED: regex at scripts/check-house-style.mjs:662; CITED: node_modules/effect/src/Schema.ts:5800-5842]

**Residual risk of B (state it in the plan).** A refusal that the source walk (the encoded form) passes but the `record` walk (the decoded form) rejects would be reported with a `["record"]` path prefix. I found none (experiment 4, plus the existing Malformed assertions). Pin it: write the Malformed-message table on the base (see Wave 0) so any prefix shows up as a red row.

## Q2. Placement of the mapping, the describer and the annotations (D-08)

- **`SinkWire.ts` imports today:** `effect/Data`, `type DecisionDisagreement` from `Decision.ts`, `type DECISION_RECORD_TAG, OBLIGATION_RECORD_TAG` from `SinkRecordFields.ts` (`SinkWire.ts:17-19`). Its doc says it "imports only `effect`, one type from `Decision.ts` and two from `SinkRecordFields.ts`" (`:7-9`). [VERIFIED: SinkWire.ts:1-19]
- **Who imports `SinkWire.ts`:** `SinkCodec.ts:86`, `Errors.ts:58` (type-only), and the barrel `index.ts:55`. [VERIFIED: grep of `packages/*/src`]
- **Where the untrusted words live:** `UntrustedRefusal`, `UntrustedValueRefusal` are in `UntrustedDecode.ts:101,111`. That module imports `effect`, `DecodeDepthGuard.ts` and `JsonShape.ts` only (`:22-28`); `DecodeDepthGuard.ts:15` imports `JsonShape.ts`; `JsonShape.ts` imports nothing. So the closure of `UntrustedDecode.ts` does not reach `SinkWire.ts`, and a **type-only** `import type { UntrustedRefusal } from "./UntrustedDecode.ts"` in `SinkWire.ts` adds no cycle. [VERIFIED: grep of the three files' import lines]
- **Enforcement of "leaf":** nothing beyond prose and cycles. `pnpm circular` is `madge --circular --extensions ts,tsx packages/*/src` (`package.json`), which counts type-only edges (ADR-QD-037, as the module docs say); no house-style rule or test pins `SinkWire.ts` to a leaf. A type-only edge in an acyclic direction passes. The doc comment at `SinkWire.ts:1-16` must be edited ("imports only…") so it does not become the next false claim (AGENTS.md §15's reason for gates). [VERIFIED for the absence of a rule: grep of `scripts/*.mjs` for "leaf" found only an unrelated comment]

**Exact placement (all in `SinkWire.ts`, beside `DecodeRefusal`):**
| Export | Where | Why |
|--------|-------|-----|
| `describeDecodeRefusal: (self: DecodeRefusal) => string` | `SinkWire.ts` | beside the union, as `describeEncodeRefusal` sits beside `EncodeRefusal` (`JsonRefusal.ts:143`) |
| `decodeRefusalAnnotations: (self: DecodeRefusal) => DecodeRefusalAnnotations` and `type DecodeRefusalAnnotations = { readonly "qadi.refusal": DecodeRefusal["_tag"] }` | `SinkWire.ts` | mirrors `EncodeRefusalAnnotations` (`JsonRefusal.ts:107-111`) with one key |
| `decodeRefusalOf: (refusal: UntrustedRefusal \| UnsupportedVersionRefusal) => DecodeRefusal` | `SinkWire.ts` (type-only import of `UntrustedRefusal`) | the one mapping; `SinkCodec` passes `UntrustedRefusal \| UnsupportedVersion` (`SinkCodec.ts:496`), audit passes `UntrustedValueRefusal` (a subset), so the wide type serves both |
| private bounded describer for `version` | `SinkWire.ts` (not exported) | only the describer needs it; Phase 41's devtools value-to-text is a different, devtools-private function |

`UnsupportedVersion` as a type is `Extract<DecodeRefusal, { _tag: "UnsupportedVersion" }>` (declared privately in `SinkCodec.ts:461`); move that alias to `SinkWire.ts` for the mapping's parameter type, or write the parameter as `UntrustedRefusal | Extract<DecodeRefusal, { readonly _tag: "UnsupportedVersion" }>`.

**Lint trap not in CONTEXT.** `no-refusal-annotation-outside-core` (`scripts/check-house-style.mjs:268-281`) matches `/"qadi\.(?:refusal|path)"|"path"\s+in\s/` on raw lines of every non-test `packages/*/src` file; `EXEMPTIONS` (`:338-341`) exempts only `JsonRefusal.ts`. Writing `"qadi.refusal"` in `SinkWire.ts` fails `pnpm lint`. Add `"packages/core/src/SinkWire.ts": ["no-refusal-annotation-outside-core"]` to `EXEMPTIONS`, update the rule's comment and message to name `decodeRefusalAnnotations`, and keep every doc comment in `SinkWire.ts` from quoting the key (the scan is raw, so a comment containing the quoted literal also fails). The `[stale-exemption]` check passes because the file exists. Devtools must not spell the key; it calls the helper. [VERIFIED: script lines read]

### The encode mirror
- `encodeRefusalAnnotations` (`JsonRefusal.ts:123-131`) returns `{ "qadi.refusal": self.refusal._tag, "qadi.path": …, evaluationId }`; the type is `EncodeRefusalAnnotations` (`:107-111`); the key for the tag is `"qadi.refusal"`.
- `describeEncodeRefusal` (`:143-155`) is `Match.type<EncodeRefusal>().pipe(Match.tagsExhaustive({...}))`, one sentence per refusal. Its fields are strings, numbers and closed literals (`path` segments, `kind`, `brand`, `maxDepth`, `message`), so it needs no `unknown` handling; `EncodeFailed`'s sentence embeds caller text (`message`) and the doc says a sentence is "never an annotation and never a default log message".
- **INV-QD-104** is "A refusal report says where, never what" (`spec/invariants.md:3180`, enforcement lines `:3195-3199`): `packages/core/test/EncodeRefusalReport.test.ts` has a table over all six variants (`:75-86`) and a property over generated sentinel strings (`:105-137`: `FastCheck.stringMatching(/^[a-z0-9]{12,24}$/).map((s) => \`sentinel-${s}\`)`). That is the model for the decode sentinel test. [VERIFIED: invariants.md and the test file read]

## Q3. A bounded, safe description of `UnsupportedVersion.version` (D-09)

- **No existing core helper** describes an `unknown` safely. `describeThrown` (`SinkCodec.ts:366-370`) wraps `String(thrown)` in `Result.try` with a fallback (guards a throwing `toString`, no length cap) and is private. `PortKey.ts:146` uses `String(bigint)` for a known bigint. `effect/Formatter` exists in `node_modules/effect/src` but was not evaluated for hostile input; the typeof form below needs nothing from it. [VERIFIED: grep and read]
- `version` reaches the refusal from `ownValue(input, "version")` (`SinkCodec.ts:418,476`), which reads a data descriptor's `.value` (an accessor yields `undefined`, no getter runs); with `decodeSinkRecord(input: unknown)` it can be any value, including a bigint, symbol, function, cyclic object or a multi-megabyte string. `Malformed.message` is a Schema error text.

**Proposal (smallest total form).** `typeof` only; never call a user method; cap strings:
```ts
const SHOWN_VERSION_CHARS = 40; // a string longer than this is cut and marked
const shownVersion = (version: unknown): string =>
  version === undefined ? "none"
  : typeof version === "string" ? JSON.stringify(version.length > SHOWN_VERSION_CHARS ? `${version.slice(0, SHOWN_VERSION_CHARS)}…` : version)
  : typeof version === "number" || typeof version === "boolean" ? String(version)
  : version === null ? "null"
  : `a ${typeof version}`; // placeholder: "a object" reads wrong, so use the noun table below
```
Write the non-scalar arm as a small `typeof` → noun table (`object` → "an object", `bigint` → "a bigint", `symbol` → "a symbol", `function` → "a function"), built with `Match`/`Predicate` as the house style prefers, not `Array.isArray` (throws on a revoked Proxy). `JSON.stringify` of a *string* cannot throw and escapes lone surrogates. A number prints at most about 24 characters, so no cap is needed. Also cap `Malformed.message` in the sentence (suggest 200 characters, same ellipsis) because a Schema message can echo a long received value (ASSUMED: not measured). [ASSUMED: cap values 40 and 200, form]

**Sentences currently emitted anywhere for a refusal** (so the new wording can be pinned against them):
- Devtools default log: the fixed message `"qadi/devtools: a frame was not a decision record"` with annotations `qadi.frame` and `qadi.reason` (`Source.ts:288-289`). **Keep the message fixed** (INV-QD-104: a sentence is never a default log message).
- Audit: `"an audit row has no record"` (`AuditEntry.ts:201`, pinned at `UntrustedSeams.test.ts:142`); the envelope sentences `"a stored record is a JSON object { environment, record }"`, `"a bare record, not a stored-record envelope { environment, record }"`, `"a stored record's environment is not a string"`, `"a stored record names no record"` (`SinkCodec.ts:603-609`, pinned `SinkCodec.test.ts:2210-2218`). These are `Malformed.message` values, not per-refusal sentences.
- The only per-refusal wording that exists is prose: the five-reason essay at `Source.ts:250-268` and the `DecodeRefusal` doc (`SinkWire.ts:70-94`). The describer replaces the essay.

**Proposed sentences** (name the reason and its fix; pin each in a table, like `EncodeRefusalReport.test.ts:75-86`):
| Tag | Sentence |
|-----|----------|
| `NotJson` | `not JSON: the text did not parse (a stream truncated or replaced by a proxy)` |
| `TooDeep` | `nested deeper than ${maxDepth} levels, past what a reader decodes: an older or foreign sender` |
| `Malformed` | `not a record of the version it claims: ${bounded(message)}` |
| `Inconsistent` | `a record that contradicts itself (${disagreement}): a hand-built record or tampering, not version skew` |
| `UnsupportedVersion` | `a record of wire version ${shownVersion(version)}, which this reader does not read (it reads ${supported.join(", ")}): upgrade the reader for a newer version, or the sender for none` |

`disagreement` is a closed literal union (`Decision.ts:198-206`: `Verdict`, `VisibleFields`, `Obligations`, `Reason`, `DenyObligations`, `EvaluationId`, `SubjectId`, `PolicyTag`), so embedding it is safe. [CITED: Decision.ts:198-206] Wording is Claude's discretion (CONTEXT); the plan pins whatever it chooses in the table.

## Q4. The compatibility surface (DREF-01, DREF-04, DREF-07, D-16)

Tracked-file grep (`git grep`, excluding `.planning` and generated CHANGELOGs) for `MalformedReason|reasonOf|onMalformed|qadi.reason` and for the five words. `.stryker-tmp/` holds a stale sandbox copy; ignore it. [VERIFIED: grep output]

| File:line | What it is | Must become |
|-----------|------------|-------------|
| `packages/devtools/src/model/Source.ts:103` | doc: a bare record "is reported `not-a-record`" | "reported `Malformed`" |
| `:126` | `onMalformed?: (frame: string, reason: MalformedReason) => void` | `(frame: string, refusal: DecodeRefusal) => void` |
| `:142`, `:241-248` | `decodeFrame(options.onMalformed)`; `reasonOf(error.refusal)` | pass `error.refusal` straight through |
| `:214-228` | `reasonOf`, the five-word `Match` | **delete** |
| `:250-278` | the five-reason essay and `export type MalformedReason` | **delete** (core's `DecodeRefusal` doc and `describeDecodeRefusal` own it) |
| `:281-293` | `malformed(frame, reason, onMalformed)`; default log annotates `qadi.frame` + `qadi.reason` | `annotateLogs({ ...decodeRefusalAnnotations(refusal), "qadi.frame": frame })`, message unchanged |
| `packages/devtools/src/index.ts:116` | `export type { …, MalformedReason, … }` | remove the name |
| `packages/devtools/test/surface.tst.ts:48` | `MalformedReason` in the exported-type list | remove |
| `packages/devtools/test/model/Source.tst.ts:13,35` | type import and the "options and result are unchanged" pin with `reason: MalformedReason` | `refusal: DecodeRefusal` (import from `@qadi/core`); retitle the test |
| `packages/devtools/test/model/Source.test.ts:27,99,108,209,260-266,268,285-293,321-324,341-349,396-400,410-424,433-455,495-510` | helper types and every `reported` assertion on a five-word string | `DecodeRefusal.NotJson()`, `.Malformed({ message })`, `.TooDeep({ maxDepth })`, `.UnsupportedVersion({ version, supported })`, `.Inconsistent({ disagreement })` |
| `Source.test.ts:523-542` | "without onMalformed the drop is logged": asserts `annotationOf(…, "qadi.reason") === "not-json"` | assert `"qadi.refusal" === "NotJson"` and `qadi.frame`, and that `qadi.reason` is absent |
| `examples/nextjs-newsroom/src/client/Dock.tsx:73-75` | `onMalformed: (frame, reason) => { console.warn(\`qadi: dropped a ${reason} frame\`, …) }` | `(frame, refusal) => … ${describeDecodeRefusal(refusal)} …` (compiled by `pnpm example`) |
| `packages/devtools/README.md:100-109` | `ts` fence with the five-word comments (not compiled: ```` ```ts ````) | rewrite the comment block over the five `_tag`s |
| `apps/website/src/content/docs/docs/packages/devtools.md:101-111` | prose: `"not-a-record"`, `"unsupported-version"`, `"inconsistent"`, `onMalformed`/`onDisconnect` | prose over `Malformed`, `UnsupportedVersion`, `Inconsistent` (no compiled fence on those lines; `:92-96` is a fence that does not use `onMalformed`) |
| `apps/website/src/content/docs/docs/reference/upgrading.md:77-78` | "reports … as `"unsupported-version"` … `"not-a-record"`" in the 0.11 section | keep as history but add "(0.12: `UnsupportedVersion` and `Malformed`)", and **add a new `## 0.12: onMalformed receives core's DecodeRefusal` section** with a `ts` Before and a ```` ```typescript ```` After (compiled by `pnpm spec:website-examples`), carrying the five-word map and the `not-a-record` → `Malformed` collapse |
| `packages/http/src/DecisionStreamRoute.ts:32` | comment: an older reader reports each `message` frame as `not-a-record` | "…as a malformed frame (`not-a-record` before 0.12, `Malformed` since)" (comment only) |
| `spec/behaviors/27-devtools-timeline.md:167-206` | **BEH-QD-204** requirement text names the five words | rewrite over the five `DecodeRefusal` tags with an `Amended in CCR-QD-431` block (history stays) |
| `spec/behaviors/26-decision-stream.md:419,597` | "`onMalformed` ([BEH-QD-204]…) … unchanged" | add a note that `onMalformed`'s second argument is core's `DecodeRefusal` since CCR-QD-431 |
| `spec/overview.md:850` | `@qadi/devtools` row: `MalformedReason` is the five-word union | drop `MalformedReason`; say `onMalformed` receives `DecodeRefusal` (gate 13) |
| `spec/overview.md` `@qadi/core` tables (rows near `:346-352`) | decode codec rows | add `decodeSinkRecordWithJson`, `DecodedSinkRecord`, `describeDecodeRefusal`, `decodeRefusalAnnotations`, `DecodeRefusalAnnotations`, `decodeRefusalOf`; update the `AuditEntry`/`decodeAuditEntry` row at `:752` |
| `spec/decisions/095…:66,116`, `096…:136,213`, `097…:70,190`, `106…:65,99`, `spec/invariants.md:2979,3058,3079` | historical statements of the five-word union | **leave** (change history); ADR-QD-153 amends ADR-QD-095 D-09-f and ADR-QD-143 in amendment blocks |
| `spec/decisions/143…:110,158` | the `recordJsonOf` budget row and bullet | amendment block: the row retires |
| `.changeset/*.md` | none mention these names today | three new changesets (Q9) |

Unrelated hits to leave alone: `packages/core/src/Lifecycle.ts:169` and `Evaluate.test.ts:3413` use `"qadi.reason"` for a *decision's* reason; `SimulationForm.test.ts:371` and `SinkCodec.test.ts:2205` define a local helper named `reasonOf`. No hit in `features/`, `spec/devtools-spec` or any other README.

**Doc-fence gates.** `pnpm spec:examples` (`scripts/check-doc-examples.mjs`) compiles ```` ```typescript ````/```` ```tsx ```` fences in `spec/`, AGENTS.md, CONTRIBUTING.md, the root README and every package README (README `ts` fences are not compiled). `pnpm spec:website-examples` (`scripts/check-website-doc-examples.mjs`, a script in `package.json`) compiles the same fence kinds in every `.md`/`.mdx` under `apps/website/src/content/docs` against the workspace's own TypeScript, and refuses a raw decision read in a fence that imports `@qadi/react`. So only the new `upgrading.md` After block is compiled; the README and devtools-page edits are prose. [VERIFIED: script heads read]

## Q5. The budget and its checks (DREF-06, D-13)

`scripts/check-house-style.mjs`: [VERIFIED: lines read]
- `UNTRUSTED_DECODE_BUDGET` `:631-644`: rows `UntrustedDecode.ts: 5`, `DecodeDepthGuard.ts: 1`, **`packages/audit/src/AuditEntry.ts: 1` (comment line `:636`, entry `:637`)**, `PortSpanEncode.ts: 2`, `SinkCodec.ts: 1`, `SimulationForm.ts: 1`.
- `UNTRUSTED_DECODE_BUDGET_NAMES` `:652-659`: `"packages/audit/src/AuditEntry.ts": ["recordJsonOf"]` (line 655).
- `UNTRUSTED_DECODE_TOKEN` `:662`: `/\bonExcessProperty\b|\bexceedsJsonDepth\b|\bSchema\.decode\w*|\bJSON\.parse\b/g`.
- Checks: `[untrusted-decode]` `:1548-1567` (per budgeted file the found count must equal the budget; any other file with a token fails), `[untrusted-decode-names]` `:1569-1580` (each name must match `\b(?:const|function)\s+NAME\b` in the file), `[untrusted-decode-table]` `:1585-1608` (finds the first `| Location | Count | Why |` header in AGENTS.md, parses rows with `^\|\s*\`([^\`]+)\`\s*\|\s*(\d+)\s*\|`, requires the listed files and counts to equal the budget's keys and values in both directions).

**What changes when the `AuditEntry.ts` row goes (one task):**
1. `scripts/check-house-style.mjs`: delete the `AuditEntry.ts` budget entry and its preceding comment (`:636-637`), and the `_NAMES` entry (`:655`). Also edit the header comment if it names the audit decode (it does not; `:42-44` is generic).
2. `AGENTS.md` §7a: delete the `| \`packages/audit/src/AuditEntry.ts\` | 1 | \`recordJsonOf\`… |` row (line 533). The paragraph above ("Eight seams used to assemble…") needs no change.
3. After the deletion `AuditEntry.ts` has zero counted tokens: its only token was `Schema.decodeUnknownResult` at `:174`. If any token remains the file fails `[untrusted-decode]` as an un-budgeted file.
4. Core's rows: `UntrustedDecode.ts` 5, `DecodeDepthGuard.ts` 1, `PortSpanEncode.ts` 2, `SinkCodec.ts` 1 **do not move** under the recommended design: the pair uses `Schema.encodeTo` and `SchemaGetter.transform`, neither matched by the regex, and adds no `JSON.parse`/`onExcessProperty`/`exceedsJsonDepth`. D-03 holds. (The one wording caveat is in Q1.) The plan's check: run `node scripts/check-house-style.mjs` after the core change with the budget untouched; it must print no `[untrusted-decode]` line.
5. Separately, `EXEMPTIONS` gains the `SinkWire.ts` entry (Q2) and the rule comment at `:268-278` is updated; that is a different rule, not a budget.

## Q6. The audit differential (D-12)

**Fixtures and tests that exist.** `packages/audit/test/AuditEntry.test.ts` (423 lines): `ROW_V2` and friends (`:370-375`), "a row whose record carries an unknown envelope key decodes, and the entry drops the key" (`:404-408`, asserts `notInclude(JSON.stringify(entry), "traceparent")`), the 60,000-deep test (`:191-202`, a `Not` chain, asserts `DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH })`), message assertions (`:337,343,348`), round trips (`:227-247`). `packages/audit/test/UntrustedSeams.test.ts`: a refusal-precedence table for `decodeAuditEntry` (`:136-170`: no record, past-bound record `TooDeep`, shallow and deep excess row keys, unknown envelope key success) and the archive's 60,000-deep entry (`:114-126`). `Retention.test.ts:363` carries an unrelated 60,000 ms timeout. Helpers: `packages/audit/test/helpers.ts` (`decisionRecord`, `failedRecord`).

**`Retention`.** `planPurge` (`Retention.ts:129-165`) uses `MutableHashMap.empty<AuditEntry, number>()` and `archive.holds(entry)`; Effect v4 structural equality ignores key order (`Equal.equals`/`Hash.hash` verified) and distinguishes `{a:1,b:undefined}` from `{a:1}` (verified). So `Retention` is affected only if an `undefined`-valued key appears or disappears. The differential must therefore pin presence of explicit-`undefined` keys. [VERIFIED: run output]

**Proposed differential rows** (a table test in `packages/audit/test/AuditEntry.test.ts` or a sibling `AuditEntryDifferential.test.ts`; each row asserts `Object.keys(entry.record)` joined, `JSON.stringify(entry)`, `Equal.equals(entry, expected)` and the decoded `record`, written as **expected values written out by hand** from a base run, not recomputed):
1. an unknown top-level key (`traceparent`): absent from `entry.record` and from the stringified entry;
2. the same row with keys in reverse order: `entry.record` keys in schema order (`_tag,version,evaluationId,at,subjectId,policy,outcome`, observed on the base);
3. explicit `undefined` optional fields (`resource: undefined`): key kept, schema position (observed `…,policy,resource,outcome`); also `sequenceNumber: undefined` on the row;
4. a float: `at: 1.5` and `durationMillis: 2.5` survive; `at: 1e400` stays `Malformed` (`AuditEntry.test.ts:262-269`);
5. a 60,000-deep policy: `TooDeep` (existing test); plus a 60,000-deep value under an **unknown envelope key**: still `TooDeep`, because the sink wire has no `unwalked` (a new row; it characterises that the guard precedes the projection);
6. a pre-0.10 row (`UnsupportedVersion`, `version: undefined`), a version-3 row, and the five `Malformed` message strings from experiment 4, so a `["record"]` prefix would turn a row red;
7. a `Retention` counting row: two entries from the same row text, one key-permuted, count equal under `planPurge`'s `holds` (document that `Retention` itself is not edited).

**Green on the base first.** Write the file against the unmodified tree (every row passes), commit it alone, then change `decodeAuditEntry`; the diff in this plan must show no edit to any expected value. Row 2 and row 3 are the two that an input-order or key-dropping implementation turns red, which is the evidence that candidate A is not identical.

## Q7. The mutation baseline (D-14)

Configs (read): `stryker.config.mjs` (core: `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]`, vitest dir `packages/core`, `jsonReporter.fileName: "reports/mutation/mutation.json"`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `thresholds.break: 80`); `stryker.devtools.mjs` (`mutate: ["packages/devtools/src/model/**/*.ts"]`, report `reports/mutation-devtools/mutation.json`); `stryker.audit.mjs` (`mutate: ["packages/audit/src/**/*.ts", "!packages/audit/src/index.ts"]`, report `reports/mutation-audit/mutation.json`). The devtools and audit vitest configs alias `@qadi/core` to core's `src`, so a core edit reaches their tests with no build. [VERIFIED: config and vitest config reads]

**Exact invocations, run one at a time in the background** (ADR-QD-098 `098-mutation-runs-stay-sequential`):
```bash
pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/SinkCodec.ts,packages/core/src/SinkWire.ts'
pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/Source.ts'
pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditEntry.ts'
```
(The first is Phase 38's invocation, quoted in `38-01-SUMMARY.md:47`; `--mutate` replaces the config's list. An exit 1 after "below breaking threshold" with the report written is not a failed baseline.) **JSON shape** (`39-mutation-base.json`, `38-mutation-base.json`): `{ "measured": { "<path>": <unrounded detected/scored>, … }, "unmeasured": {}, "new": [], "deleted": {} }`; score = (Killed+Timeout) / (Killed+Timeout+Survived+NoCoverage), 1 when nothing is scored; the writer one-liner is in `39-01-PLAN.md` step 4 (it refuses a stale report, a report that mutated another file and a config reporting elsewhere); adapt its `E` list to the four files and the three configs/reports, with `DIRS` `["packages/core/src","packages/core/test"]`, `["packages/devtools/src","packages/devtools/test","packages/core/src"]`, `["packages/audit/src","packages/audit/test","packages/core/src"]`. Output path `.planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-mutation-base.json`. Phase 38's base: `SinkCodec.ts` 0.9634146341463414, `SinkWire.ts` 1 (no scored mutant: module-scope expressions are ignored under `ignoreStatic`). Phase 38 and 39 plans each recorded about 10 minutes for the baseline task (`38-01-SUMMARY.md:24`, `39-01-SUMMARY.md:27`); per-file runtime for the three configs was not measured here. [VERIFIED: summaries; ASSUMED for the runtime of devtools/audit files]

**What to expect.** `SinkWire.ts` stays at score 1: `describeDecodeRefusal` and the other new exports are module-scope `Match` constants, which `ignoreStatic` hides (ADR-QD-076, as Phase 39's note says). The sentence table, the totality test and the sentinel property are what guard them, not mutation. `AuditEntry.ts` loses mutants with `recordJsonOf` and the dead `malformed(json.failure.message)` branch; the score must not fall.

## Q8. Records and numbers (D-15)

All reserved ids are free: `git grep -lE "<id>([^0-9]|$)"` over `spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts` printed nothing for ARCH-87, ADR-QD-153, CCR-QD-431, BEH-QD-536 to 540, INV-QD-325 and 326; `spec/decisions/` ends at `152-…`; the highest BEH in `spec/behaviors` is BEH-QD-525. `node scripts/next-id.mjs` was not run. [VERIFIED: grep output]

**Where records live** (from `39-04-PLAN.md`, the analog): ADR file `spec/decisions/153-core-owns-describing-a-decode-refusal.md` (Document Control table; Document ID `QADI-ADR-153` must match the file number, checked by `verify-traceability.sh` check 3a) plus an entry at the end of `spec/decisions/index.yaml`; CCR row appended after CCR-QD-430 in `spec/README.md` (ends `Used: … Unused: … |`); INV in `spec/invariants.md`, BEH in `spec/behaviors/*.md`; `spec/traceability.md` rows (ADR row after ADR-QD-152, INV row, a row for each new test file, extended rows for amended ADRs). `node scripts/spec-revise.mjs <doc> "<message>" --date D` bumps a document's revision (message: no backtick, no `|`), and `--check` fails on any Revision not equal to its newest entry. Gates: `spec:verify:strict` (`spec/scripts/verify-traceability.sh --strict`: index.yaml↔files, every INV and ADR in traceability, ADR Document ID, links not broken or gitignored, test paths in §4 exist), `spec:api` (gate 13, every export named in `overview.md`), `spec:examples`, `spec:gates`.

**Recommendation (only statements nothing covers):**
- **ARCH-87, ADR-QD-153, CCR-QD-431:** used. ADR-QD-153 records DREF-01's compatibility decision (the five-word map, `qadi.reason` gone, the log message fixed) **before any code**, amends ADR-QD-095 D-09-f (devtools' closed union), ADR-QD-143 (the `recordJsonOf` row retires, the JSON form is the strict decode's), reads ADR-QD-116 (the mirror), ADR-QD-110 (audit facts computed once), ADR-QD-096 D-15-c (envelope projection precedes the strict decode) and ADR-QD-037 (the new type edge), and states the `Schema.encodeTo` note from Q1.
- **INV-QD-104: amend, do not add.** Its Source gains `SinkWire.ts` (`decodeRefusalAnnotations`, `decodeRefusalOf`), its Enforcement gains the decode sentinel property, its text covers "a refusal report" generally. This is DREF-03's invariant.
- **INV-QD-325 (use):** "An audit entry's record is the JSON form of the record the strict decode accepted": audit decodes a row's record once, so the entry is exactly the strict decode's JSON (unknown envelope key absent, canonical order, explicit `undefined` kept). Nothing states it today beyond ADR-QD-143 prose. Enforcement: the differential.
- **INV-QD-326:** leave **unused**. "Core describes every decode refusal" is a compile-time property (a new member is a TS2366/TS2741 error), covered by the tstyche pin and INV-QD-104's amendment.
- **BEH-QD-536 (use):** `describeDecodeRefusal` gives one sentence per refusal and never throws on a hostile `version` or `message`; place beside the sink codec behaviours (`spec/behaviors/24-decision-sink.md`). **BEH-QD-537 (use):** `decodeSinkRecordWithJson` returns the record and its JSON form from one decode and refuses exactly what `decodeSinkRecord` refuses. BEH-QD-204 is amended in place (not a new number). **BEH-QD-538 to 540: unused**, named in the CCR row as Phase 39 did.
(These are recommendations; the planner may trim to fewer, but the CCR row must name every unused reserved number.)

## Q9. Changesets and docs gates

- Convention: a changeset is `.changeset/<kebab>.md` with front matter `"<pkg>": minor|patch` then a paragraph; a Breaking one leads each break with `**Breaking.**` and uses **`minor`** (pre-1.0, one fixed group in `.changeset/config.json`). Example: `.changeset/atom-set-sweep.md` from commit `c15624a5` (`"@qadi/react": minor`, two `**Breaking.**` paragraphs), recorded together with an `upgrading.md` section. Current non-Breaking examples: `.changeset/sink-wire-version-stated-once.md` (`"@qadi/core": minor`). [VERIFIED: git show c15624a5]
- This phase: `@qadi/core: minor` (new exports, source-compatible), `@qadi/devtools: minor` with `**Breaking.**` ×2 (`onMalformed`'s second argument; `MalformedReason` removed and `qadi.reason` replaced by `qadi.refusal`) carrying the five-word map and the `not-a-record` → `Malformed` collapse, `@qadi/audit: patch` (`decodeAuditEntry` reads one decode; no observable change). Do not run `changeset`, `changeset version` or publish.
- `upgrading.md` is `apps/website/src/content/docs/docs/reference/upgrading.md` (the only one; sections are `## 0.12: …`, the latest is "a checked baseline carries its own reading"). Add `## 0.12: onMalformed receives core's DecodeRefusal`; Before in ```` ```ts ````, After in ```` ```typescript ```` (compiled), as the sections at `:553-619` do.

## Common Pitfalls

### Pitfall 1: a pass-through `json` changes persisted bytes
**What goes wrong:** `entry.record` keeps the stored row's key order, so `JSON.stringify(entry)` differs from the base for a hand-ordered row. **Why:** the lenient base decode rebuilds structs in schema order. **Avoid:** the pair-schema design; keep the key-order differential row. **Warning sign:** the permutation row fails on `Object.keys`.

### Pitfall 2: the `"qadi.refusal"` literal outside the exempt file
**What goes wrong:** `pnpm lint` fails `no-refusal-annotation-outside-core` for `SinkWire.ts`, or for any comment quoting the key. **Avoid:** the `EXEMPTIONS` entry, no quoted key in comments, devtools calls the helper. **Warning sign:** the first `pnpm lint` after the helper lands.

### Pitfall 3: a `["record"]` path prefix on `Malformed.message`
**What goes wrong:** a plain `Struct({ json, record })` fed by `prepare` (design B′) prefixes every message; tests asserting `Missing key\n  at ["outcome"]` break and devtools/audit show different text. **Avoid:** source walk on `SinkRecordJson` (unprefixed), pinned by a message table written on the base.

### Pitfall 4: hostile `version` in the sentence
**What goes wrong:** `String(version)` runs a user `toString`; `JSON.stringify` throws on a bigint or cycle; `Array.isArray` throws on a revoked Proxy; a 5 MB string becomes a 5 MB sentence. **Avoid:** the `typeof`-only bounded form (Q3) and a hostile-value table test.

### Pitfall 5: the default log message becomes the sentence
**What goes wrong:** INV-QD-104 says a sentence is never a default log message or an annotation. **Avoid:** keep `"qadi/devtools: a frame was not a decision record"` fixed; the sentence goes to `Dock.tsx`'s `console.warn` through the callback only. Note `qadi.frame` (the whole untrusted frame text) is an existing annotation (`Source.ts:289`) and out of this phase's scope.

### Pitfall 6: `SinkWire.ts` leaf claim and cycles
**What goes wrong:** the doc says it imports only `effect` plus two types; after the change it also imports a type from `UntrustedDecode.ts`. **Avoid:** edit the doc; run `pnpm circular`.

### Pitfall 7: `Data.TaggedEnum` equality in tests
`DecodeRefusal.NotJson()` takes no argument (`NotJson: Record<never, never>`). Tests compare with `assert.deepStrictEqual(reported, [[frame, DecodeRefusal.NotJson()]])`, as `AuditEntry.test.ts:200` and `UntrustedSeams.test.ts:122` already do for `TooDeep`.

### Conflicts with CONTEXT decisions (stated plainly)
1. **D-11 "at most one narrow checked step":** the recommended design needs **none**. Not a conflict in effect (it exceeds the requirement), but the plan must not add a `Schema.is` guard "to be safe".
2. **D-03 "adds no counted `Schema.decode*` token":** holds lexically; see the `encodeTo` caveat in Q1. If the maintainer reads the budget's intent as "no schema-level decoding machinery outside `UntrustedDecode.ts`", the pair breaks that intent and the choice is to count it (SinkCodec 1 → 2), which D-03 rules out. This needs the maintainer's one-line confirmation recorded in ADR-QD-153; it is flagged, not decided here.
3. **D-08 "beside `DecodeRefusal` in `SinkWire.ts`":** the import graph allows it (Q2), but D-08 does not mention the **`EXEMPTIONS` edit** the annotation helper forces. Add it to the plan; it is the third place the encode side's rule needs to learn about the decode side.
4. **D-11 "`decodeSinkRecord` reads through the same path":** satisfied, but at a measured cost of about two extra walks (toy 6.35 → 11.0 µs per decode). If the recorded bench is unacceptable the fallback is two decoders built from one factory (record-only and with-JSON); say so in the ADR rather than discover it in review.
5. **D-12 "output identical on every row":** holds for the recommended design and the probed rows; it is **false** for the pass-through design (key order). The differential must therefore compare key order, not only deep equality.

## Code Examples

### The pair schema and the decoder (core, `SinkCodec.ts`) [VERIFIED to compile in the toy experiment; names `SinkRecordWire`, `SinkRecordJson`, `versionThenEnvelope` are the real ones]
```typescript
// Source: experiment of 2026-11-14 over node_modules/effect/src/Schema.ts:5821 (encodeTo) and SchemaGetter.transform
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

/**
 * The record's JSON form and its decoded wire, read from one strict decode.
 * `SinkRecordJson` is the source, so a refusal names its path unprefixed; the pair is built
 * with `encodeTo` (`to.pipe(decodeTo(from))`) and is not a decode call.
 */
const SinkRecordWithJson = Schema.Struct({ json: SinkRecordJson, record: SinkRecordWire }).pipe(
  Schema.encodeTo(SinkRecordJson, {
    decode: SchemaGetter.transform((json) => ({ json, record: json })),
    encode: SchemaGetter.transform(({ json }) => json),
  }),
);

const sinkWire = untrustedDecoder(SinkRecordWithJson, { prepare: versionThenEnvelope });
```

### The describer and the helpers (core, `SinkWire.ts`) [pattern: JsonRefusal.ts:123-155]
```typescript
export type DecodeRefusalAnnotations = { readonly "qadi.refusal": DecodeRefusal["_tag"] };

export const decodeRefusalAnnotations = (self: DecodeRefusal): DecodeRefusalAnnotations => ({
  "qadi.refusal": self._tag,
});

export const describeDecodeRefusal: (self: DecodeRefusal) => string = Match.type<DecodeRefusal>().pipe(
  Match.tagsExhaustive({
    NotJson: () => "not JSON: the text did not parse (a stream truncated or replaced by a proxy)",
    TooDeep: ({ maxDepth }) => `nested deeper than ${maxDepth} levels, past what a reader decodes: an older or foreign sender`,
    Malformed: ({ message }) => `not a record of the version it claims: ${shown(message, 200)}`,
    Inconsistent: ({ disagreement }) => `a record that contradicts itself (${disagreement}): a hand-built record or tampering, not version skew`,
    UnsupportedVersion: ({ version, supported }) =>
      `a record of wire version ${shownVersion(version)}, which this reader does not read (it reads ${supported.join(", ")}): upgrade the reader for a newer version, or the sender for none`,
  }),
);
```

### Devtools passes the refusal through (`Source.ts`)
```typescript
const malformed = (
  frame: string,
  refusal: DecodeRefusal,
  onMalformed: ((frame: string, refusal: DecodeRefusal) => void) | undefined,
): Effect.Effect<Result.Result<never, string>> =>
  Effect.as(
    onMalformed === undefined
      ? Effect.logWarning("qadi/devtools: a frame was not a decision record").pipe(
          Effect.annotateLogs({ ...decodeRefusalAnnotations(refusal), "qadi.frame": frame }),
        )
      : Effect.sync(() => onMalformed(frame, refusal)),
    Result.fail(frame),
  );
```

### Audit decodes once (`AuditEntry.ts`)
```typescript
export const decodeAuditEntry = (input: unknown) => {
  if (!Predicate.hasProperty(input, "record")) return malformed("an audit row has no record");
  const decoded = decodeSinkRecordWithJson(input.record);
  if (Result.isFailure(decoded)) return Result.fail(decoded.failure);
  const row = decodeRow(input);
  if (Result.isFailure(row)) return Result.fail(new SinkRecordNotDecodable({ refusal: decodeRefusalOf(row.failure) }));
  const entry: AuditEntry = { record: decoded.success.json, sequenceNumber: row.success.sequenceNumber };
  return Result.succeed({ entry, record: decoded.success.record });
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| three copies of the refusal mapping (`SinkCodec.ts:496`, `AuditEntry.ts:159`, devtools `reasonOf`) | one `decodeRefusalOf` in core | this phase | a new refusal member is one compile error |
| a second, lenient audit decode (`recordJsonOf`) | the strict decode's JSON form | this phase | one counted token and one dead branch retire |
| devtools' kebab-case reasons | core's `DecodeRefusal` | this phase (Breaking) | five-word map in the changeset and `upgrading.md` |

**Deprecated/outdated:** `MalformedReason`, `reasonOf`, `qadi.reason` on the devtools log.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | caps 40 (version string) and 200 (Malformed message) and the proposed sentences | Q3 | wording/length differs from what the maintainer wants; low (pinned by a table the plan writes) |
| A2 | `malformed(json.failure.message)` is unreachable for every input (probed nine) | Q1 | if reachable, the differential gains a row and the single decode returns a different refusal for it |
| A3 | the real three-walk pair costs about 12-13 µs (toy 11 µs) | Q1 | bench shows a larger regression; fallback is two decoders (ADR note) |
| A4 | devtools/audit per-file Stryker runtime is similar to core's (about 10 min per plan task) | Q7 | longer baseline wall time only |
| A5 | the real `SinkRecordWire.Encoded` equals `SinkRecordJson.Type` so the pair typechecks in situ | Q1 | by definition of `Schema.toEncoded`, and a generic toy compiled; the first core task must typecheck the real pair before anything builds on it |
| A6 | the maintainer accepts `Schema.encodeTo` as outside the budget's counted tokens | Q1 | if not, SinkCodec's budget row becomes 2 (contradicts D-03) and a decision is needed |

## Open Questions

1. **Is the `encodeTo` reading of D-03 acceptable?**
   - Known: the regex does not match it; the pair is a schema definition. Unclear: whether the maintainer wants it counted.
   - Recommendation: proceed with `encodeTo`, state it in ADR-QD-153, and treat an objection as a one-line budget edit.
2. **Single path or two decoders for the hot read?**
   - Known: single path costs about two extra walks on each devtools frame. Unclear: whether that matters to anyone.
   - Recommendation: single path (D-11), re-run `packages/core/bench/UntrustedDecode.bench.ts` before and after and record both numbers in the summary.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 (repo engines `>=22.12.0`) | — |
| pnpm | all scripts | yes | 10.17.1 | — |
| vitest | tests | yes | 5.1.0 (run in this session) | — |
| tstyche | type pins | yes | 7.2.5 | — |
| Stryker | baseline and close | yes | 10.1.1 (not run here) | — |
| madge | `pnpm circular` | declared in devDependencies; not run here | `^8.0.0` | — |

No missing dependency. A stale `.stryker-tmp/` sandbox and `reports/mutation*/` exist locally; both are git-ignored and must not be edited.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest` (core, devtools, audit projects); tstyche 7.2.5 with checked `@ts-expect-error` directives (`*.tst.ts`); per-package Stryker 10.1.1 (`stryker.config.mjs` core, `stryker.devtools.mjs`, `stryker.audit.mjs`); fast-check for properties |
| Config file | root `vitest.config.ts` (projects `packages/*`, coverage thresholds: core 95%, others 90%), `packages/{core,devtools,audit}/vitest.config.ts`, `tstyche.json` |
| Quick run command | `pnpm exec vitest run --project core packages/core/test/DecodeRefusal.test.ts packages/core/test/SinkCodec.test.ts && pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts && pnpm exec vitest run --project audit packages/audit/test/AuditEntry.test.ts packages/audit/test/UntrustedSeams.test.ts && pnpm exec tstyche SinkWire.tst Source.tst surface.tst` |
| Full suite command | `pnpm test`, then `pnpm check:pr < /dev/null` at the phase gate (CI runs `pnpm check` only on release PRs, AGENTS.md §15) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DREF-01 | compatibility decision exists before code; five-word table pinned on the base | doc + unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts` (new table case green on base, rewritten after); ADR file present by commit order | ❌ Wave 0 (table case) |
| DREF-02 | `describeDecodeRefusal`: one sentence per tag, total on hostile `version`/`message` (throwing `toString`, `Object.create(null)`, bigint, symbol, function, cyclic object, 1e6-char string, revoked Proxy) | unit + property | `pnpm exec vitest run --project core packages/core/test/DecodeRefusal.test.ts` | ❌ Wave 0 (new file, written with the describer) |
| DREF-02 | a new `DecodeRefusal` member is a compile error in core only | tstyche + recorded experiment | `pnpm exec tstyche SinkWire.tst`; experiment recorded as in 39-01 | ✅ `SinkWire.tst.ts` (extend) |
| DREF-03 | annotations carry exactly `qadi.refusal` = `_tag`, never `message` or `version` (sentinel property, INV-QD-104); `decodeRefusalOf` maps each untrusted refusal | unit + property | `pnpm exec vitest run --project core packages/core/test/DecodeRefusal.test.ts` | ❌ Wave 0 |
| DREF-04 | devtools calls `onMalformed(frame, DecodeRefusal.<Tag>(...))` for all five; default log annotated `qadi.refusal` + `qadi.frame`, no `qadi.reason`; `MalformedReason` not exported | unit + tstyche | `pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts`; `pnpm exec tstyche Source.tst surface.tst` | ✅ (edit) |
| DREF-05 | `decodeAuditEntry` output identical to base on the differential rows; 60,000-deep `TooDeep`; unknown envelope key absent; `decodeSinkRecordWithJson` and `decodeSinkRecord` refuse alike | unit + differential | `pnpm exec vitest run --project audit packages/audit/test/AuditEntry.test.ts packages/audit/test/UntrustedSeams.test.ts`; `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts` | ❌ Wave 0 (differential and Malformed-message table written on the base) |
| DREF-06 | `recordJsonOf` and audit's mapping gone; budget, `_NAMES`, §7a agree; core rows 5/1/2/1 unchanged | gate | `node scripts/check-house-style.mjs` (no `[untrusted-decode*]` line) and `pnpm lint` | ✅ |
| DREF-07 | changesets (core minor, devtools minor + Breaking, audit patch), `upgrading.md` section compiles, README/website/Dock/DecisionStreamRoute/BEH-QD-204/overview/surface updated | gate + scan | `pnpm spec:website-examples`, `pnpm spec:examples`, `pnpm spec:api`, `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict`, `pnpm example`; a `git grep -nE "MalformedReason|reasonOf|qadi\.reason"` outside history prints only the allowed rows | ✅ (gates exist) |
| WX-01 | gate green at phase end | gate | `pnpm check:pr < /dev/null` | ✅ |
| WX-02 | only reserved numbers; unused named in the CCR row; `next-id.mjs` never run | scan | `git grep -lE "(ARCH-8[0-9]|ADR-QD-15[0-9]|CCR-QD-43[0-9]|BEH-QD-5[3-4][0-9]|INV-QD-32[0-9])"` limited to the reserved set; `node scripts/spec-revise.mjs --check` | ✅ |
| WX-03 | overview names each added export and drops `MalformedReason` | gate 13 | `pnpm spec:api` | ✅ |
| WX-04 | no new `as`/`!`/`any`/`switch`/`fnUntraced`/`async`/ambient clock or console | lint + scan | `pnpm lint`; added-line scan as in 39-05 Task 1 | ✅ |
| WX-05 | coverage thresholds hold; Stryker score of touched files does not fall vs `40-mutation-base.json` | coverage + mutation | `pnpm coverage`; the three Q7 invocations, then compare | ❌ Wave 0 (baseline) |
| WX-06 | baseline commit, then characterisation commits (five-word table, Malformed-message table, audit differential, all green on base), precede any `packages/*/src` change | commit order | the 39-05-style commit-order check over `git log --reverse --grep="(40-0"` | ❌ Wave 0 |
| WX-07 | Breaking recorded as above; nothing released or versioned | scan | check `.changeset/*.md` front matter and that `CHANGELOG.md` files are unchanged | ✅ |

### Sampling Rate
- **Per task commit:** the quick run command for the files the task edits, plus `pnpm typecheck` when `src` changes and `node scripts/check-house-style.mjs` when a budget, exemption or `src` token moves.
- **Per wave merge:** `pnpm typecheck && pnpm lint && pnpm circular`, `pnpm exec tstyche`, `pnpm run build` (declaration emit), and the spec gates once records change.
- **Phase gate:** `pnpm check:pr < /dev/null` green, the three Stryker compares, `pnpm spec:website-examples` run explicitly (D-04 step 7), `pnpm example`, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `40-mutation-base.json` committed alone first: the three Q7 invocations, one at a time, the writer adapted to the four files.
- [ ] `ADR-QD-153` (compatibility decision) written before any code, with the CCR-QD-431 row's first citation.
- [ ] Five-word table pin in `packages/devtools/test/model/Source.test.ts`: five frames (not JSON, 60,000-deep or past-bound, bare record, version 3, a self-contradicting record) reported as `not-json`, `too-deep`, `not-a-record`, `unsupported-version`, `inconsistent` in one table, green on the base.
- [ ] Malformed-message table in `packages/core/test/SinkCodec.test.ts` (the seven rows of experiment 4, expected strings written out).
- [ ] Audit differential on the base (Q6 rows 1-7).
- [ ] `packages/core/test/DecodeRefusal.test.ts` is written with the describer (it tests new code), not on the base; `SinkWire.tst.ts` gains the annotations pin.
- [ ] The base-side experiment for "a new `DecodeRefusal` member" recorded and reverted, as 39-01 did, only if the plan wants the harm shown (devtools' `reasonOf` already fails to compile on a new member, so the base "harm" is a second place to edit; record that count).

## Security Domain

`security_enforcement` is enabled (`.planning/config.json:10`, ASVS level 1).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | **yes** | the one strict `untrustedDecoder` (depth guard, version check, envelope projection, `onExcessProperty: "error"`); a bounded description of untrusted values |
| V6 Cryptography | no | — |
| V7 Error Handling and Logging | **yes** | annotations carry only the refusal tag (INV-QD-104); the default log message is a fixed string; a sentence never reaches a log or span automatically |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hostile `version` / `Malformed.message` reaching logs or spans (a throwing `toString`, a huge string, secrets echoed in a Schema message) | Information disclosure, Denial of service | annotations never include them; the describer is `typeof`-only, length-capped, never calls user code |
| Deeply nested JSON exhausting the stack | Denial of service | `exceedsJsonDepth` runs first inside `untrustedDecoder`; the 60,000-deep rows stay `TooDeep` |
| A second, differently-strict decode accepting what the first refused | Tampering | audit reads one decode; the `Inconsistent`/`UnsupportedVersion` precedence is unchanged |
| `qadi.frame` carries the whole untrusted frame in the default warning | Information disclosure | pre-existing and out of scope (D-06 keeps it); noted, not changed |

## Plan Shape (maps D-04's seven steps to files and commands)

1. **40-01: base evidence and the decision (D-04 step 1; WX-02, WX-05, WX-06).**
   - Task 1: reserved-number grep (Q8), then `chore(40-01)` = `40-mutation-base.json` alone (Q7 invocations, one at a time, writer adapted from `39-01-PLAN.md` step 4), `phase_base` in the SUMMARY.
   - Task 2: `docs(40-01)`: `spec/decisions/153-core-owns-describing-a-decode-refusal.md` + `index.yaml` entry + the CCR-QD-431 row's first citation, with the five-word map, the `qadi.reason` removal, the fixed log message, the `encodeTo` note and the single-path cost note (DREF-01: before any code).
   - Task 3: `test(40-01)`, green on the base: devtools five-word table, core Malformed-message table, audit differential, plus the tstyche pin that does not need new exports. Nothing under `packages/*/src`.
2. **40-02: core describer, annotations, mapping (step 2; DREF-02, DREF-03).** `SinkWire.ts` (`describeDecodeRefusal`, `decodeRefusalAnnotations`, `DecodeRefusalAnnotations`, `decodeRefusalOf`, private bounded describer; doc edit), `SinkCodec.ts` (`asDecodeRefusal` deleted, reads `decodeRefusalOf`), `scripts/check-house-style.mjs` (`EXEMPTIONS` + rule comment), new `packages/core/test/DecodeRefusal.test.ts`, `SinkWire.tst.ts`. Verify: quick run, `pnpm lint`, `pnpm circular`, `pnpm typecheck`.
3. **40-03: core single decode with JSON (step 2/4 hinge; D-11).** `SinkCodec.ts` (`SinkRecordWithJson`, `decodeSinkRecordWithJson`, `DecodedSinkRecord`; `decodeSinkRecord`/`String` read through it), `packages/core/test/SinkCodec.test.ts` cases, re-run `bench/UntrustedDecode.bench.ts` and record both numbers. Verify: the Malformed-message table from 40-01 still green unedited, `pnpm exec tstyche`, `node scripts/check-house-style.mjs` clean with core's rows unchanged.
4. **40-04: devtools (step 3; DREF-04).** `Source.ts`, `index.ts`, `Source.test.ts` (the table pin rewritten to `DecodeRefusal` values), `Source.tst.ts`, `surface.tst.ts`, `Dock.tsx` (compiled by `pnpm example`). Verify: devtools quick run, `pnpm exec tstyche`, `pnpm example`.
5. **40-05: audit and the budget row (steps 4-5; DREF-05, DREF-06).** `AuditEntry.ts` (`recordJsonOf`, `asDecodeRefusal` deleted; reads `decodeSinkRecordWithJson`/`decodeRefusalOf`), then in the same commit `scripts/check-house-style.mjs` (budget entry, comment, `_NAMES`) and `AGENTS.md` §7a row. Verify: the audit differential from 40-01 unedited and green, `node scripts/check-house-style.mjs`, `pnpm lint`, the Q7 compares.
6. **40-06: records and the break (step 6; DREF-07, WX-02, WX-03, WX-07).** ADR-QD-153 completed; ADR-QD-095/143 amendments; INV-QD-104 amended, INV-QD-325 added; BEH-QD-536/537 added, BEH-QD-204 and `26-decision-stream.md` amended; overview rows; traceability; CCR-QD-431 row completed (`Unused: BEH-QD-538 to 540, INV-QD-326`); three changesets; `upgrading.md` section; devtools README and website page; `DecisionStreamRoute.ts` comment. `spec-revise --date` then `--check` after every spec document. Verify: `pnpm spec:api`, `pnpm spec:verify:strict`, `pnpm spec:examples`, `pnpm spec:gates`.
7. **40-07: close (step 7; WX-01, WX-05).** `pnpm spec:website-examples` run explicitly and alone, `pnpm website`, the three Stryker compares written to `40-mutation-after.json` (a drop is fixed with a test), `pnpm check:pr < /dev/null`.

Commit rule for the milestone (as in 39-01): messages end `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (the milestone trailer; 39-05 used the wrong one); never stage `.planning/config.json`, `.planning/state.json`, `.agents/` or `.codex/`; never run `node scripts/next-id.mjs`; nothing is released or published.

## Project Constraints (from CLAUDE.md / AGENTS.md)

- §1 submodule namespace imports only (`import * as Schema from "effect/Schema"`, `import * as SchemaGetter from "effect/SchemaGetter"`); `.ts` extensions; `import type` for type-only (the new `SinkWire.ts` edge is `import type`).
- §4 `Data.TaggedError` default; `Effect.catchTag` array form; never `orDie` in evaluation/enforcement.
- §5a dispatch on `_tag` with `Match.tagsExhaustive` built once at module scope, const annotated; no new `switch`.
- §6 no `as`/`!`/`any`, `async`, ambient `console`/`process.env`/clock; `Date.now()` etc. forbidden.
- §7a untrusted decode only through `untrustedDecoder`; `UNTRUSTED_DECODE_BUDGET`, `_NAMES` and the §7a table change together.
- §9 barrels: `export *` alphabetical; `SinkWire.ts` is already exported, so the new names reach the root with no barrel edit; `spec/overview.md` must name every export (§15, gate 13).
- §10 `@effect/vitest`, coverage core 95% and others 90%; §11-12 spec is normative, `typescript` fences compile, `ts` fences do not.
- Doc-comment shape: a one-line summary first, the why after (AGENTS.md preamble).
- Project memory: prefer the complete design, breaking changes are fine, never release without the user's explicit "the release".

## Sources

### Primary (HIGH confidence)
- `packages/core/src/{UntrustedDecode,SinkCodec,SinkWire,JsonRefusal,JsonShape,DecodeDepthGuard,Decision}.ts`, `packages/audit/src/{AuditEntry,Retention}.ts`, `packages/devtools/src/{index.ts,model/Source.ts}`: read this session at the cited lines.
- `scripts/check-house-style.mjs` (budget, names, table check, the `no-refusal-annotation-outside-core` rule and `EXEMPTIONS`), `AGENTS.md` §1-§17, `spec/invariants.md` INV-QD-104, `spec/decisions/116-…md`, `spec/behaviors/27-devtools-timeline.md` BEH-QD-204.
- `node_modules/effect/src/Schema.ts:5660-5842` (`decodeTo`, `encodeTo`), `effect@4.1.2` `package.json`.
- Experiments run and deleted this session: toy pair schema (tsc with a canary, vitest), key-order/undefined/message/cost probes on the real `SinkRecordJson`, `decodeAuditEntry` probes, `Equal`/`Hash` structural-equality probe.
- Phase 38/39 artifacts: `39-01-PLAN.md`, `39-04-PLAN.md`, `39-VALIDATION.md`, `38-mutation-base.json`.

### Secondary (MEDIUM confidence)
- Phase summaries' "about 10 minutes" baseline durations; the toy-versus-real cost extrapolation.

### Tertiary (LOW confidence)
- Proposed sentences and caps (A1) are design choices, not facts.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (no new dependency)
- Architecture and typing: HIGH (compiled and run), MEDIUM on in-situ real-pair typing (A5; the first core task re-checks)
- Pitfalls: HIGH (the lint rule, the key-order and message evidence are observed)
- Records/changeset conventions: HIGH (read from the analog phase and git history)

**Research date:** 2026-11-14
**Valid until:** 2026-12-14 (Effect `latest` dist-tag moves; `pnpm-lock.yaml` pins 4.1.2)
