# Phase 57: untrustedDecoder states the envelope's unknown-key policy - Pattern Map

**Mapped:** 2026-11-18
**Analogs found:** 14 / 15 (one partial)

All analogs below are git-tracked source under `packages/`, `spec/`, `.changeset/`, `apps/` and `.planning/phases/`. No mirror paths.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/EnvelopeKeys.ts` (new, package-private leaf) | utility | transform (AST to key set) | `packages/core/src/Operand.ts`, `packages/core/src/JsonShape.ts` | role-match |
| `packages/core/src/UntrustedDecode.ts` (mod: required `unknownKeys`, `UnknownKeyPolicy`, policy table) | utility | request-response (decode) | itself, plus `packages/core/src/FieldLattice.ts` `LAWS` table | exact |
| `packages/core/src/SinkCodec.ts` (delete `ownValue`, `envelopeOf`, `DECISION_KEYS`, `OBLIGATIONS_KEYS` and the hand-rolled stored reader; `sinkWire` and `decodeStoredRecord*` go through `untrustedDecoder`) | service | request-response | itself (`sinkWire`, 524) | exact |
| `packages/core/src/Policy.ts`, `PortWireEncode.ts`, `PortRemote.ts` (add `{ unknownKeys: "refuse" }`) | service | request-response | `packages/audit/src/AuditEntry.ts` call site | exact |
| `packages/audit/src/AuditEntry.ts`, `AuditArchive.ts` (state `refuse`) | service | request-response | own existing `untrustedDecoder(..., { unwalked })` | exact |
| `packages/react/src/HydrationEngine.ts` (+ `decodePolicy`, `decodeEntry`) | service | request-response | own `decodeEnvelope`, line 193 | exact |
| `packages/core/test/UntrustedDecode.test.ts` (direct refuse/ignore pair) | test | request-response | same file | exact |
| `packages/core/test/UntrustedDecode.tst.ts` (pin required option, closed union) | test (type) | n/a | same file | exact |
| `packages/core/test/EnvelopeKeys.test.ts` (new) | test | transform | `packages/core/test/Operand.test.ts` | role-match |
| `packages/{core,audit,react}/test/UntrustedSeams.test.ts` (per-policy block) | test | request-response | same files | exact |
| `packages/core/test/SinkCodec.test.ts`, `packages/devtools/test/model/Source.test.ts`, `packages/audit/test/AuditEntryDifferential.test.ts` (message and `deepExtra` pins move) | test | request-response | same files | exact |
| `.planning/phases/QD-57-.../57-mutation.mjs` | script | batch | `56-mutation.mjs`, `53-mutation.mjs` | exact |
| `spec/decisions/170-*.md`, BEH-621..625, INV-359/360, CCR-448 | doc | n/a | `spec/decisions/169-*.md` | exact |
| `.changeset/*.md` (core minor, Breaking) | doc | n/a | `.changeset/devtools-questions-is-a-dock-input.md` | exact |
| `apps/website/.../upgrading.md` (0.13 section), AGENTS.md §7a, `scripts/check-house-style.mjs` `UNTRUSTED_DECODE_BUDGET` | doc/config | n/a | `## 0.13: the questions are a dock input` (line 912) | exact |

## Pattern Assignments

### `packages/core/src/UntrustedDecode.ts` (policy option and closed table)

**Analog:** `packages/core/src/FieldLattice.ts` lines 320-376: a closed `Readonly<Record<Union, Row>>` read through `Object.hasOwn`. CONTEXT D-16 requires the same shape, never `=== "ignore"`.

```ts
const LAWS: Readonly<Record<FieldStrategy, StrategyLaws>> = {
  Intersection: { merge: mergeIntersection, decidedByFirst: false, ... },
  Union: { ... },
```

Apply it as `const POLICY: Readonly<Record<UnknownKeyPolicy, (declared) => (input) => unknown>>`, with rows `refuse` (identity) and `ignore` (own-key projection onto the declared set).

**Existing code to extend** (`UntrustedDecode.ts` 140-143 and 167-193):
- Options interface: `unwalked?`, `prepare?`. Add a required `readonly unknownKeys: UnknownKeyPolicy`, and make `options` a required parameter.
- `walked()` (178-181) is the filter the projection extends.
- Order in `decode` (183-193): guard, `prepare`, strict. D-19 puts the projection first. `prepare` receives the projection.

```ts
const walked = (input: unknown): unknown =>
  unwalked.size > 0 && isPlainObject(input)
    ? Object.fromEntries(Object.entries(input).filter(([key]) => !unwalked.has(key)))
    : input;
```

The projection copies own keys only and reads no value. Under `ignore` it runs before the guard.

Header doc comment lines 18-20 name the leaf imports. Add `EnvelopeKeys.ts` there (D-21). Keep the one-line summary then the rationale (AGENTS.md doc-comment shape).

**Imports pattern** (22-28): `import * as X from "effect/X"`, and `./File.ts` relative imports with the `.ts` extension. Type-only imports use `import type`.

---

### `packages/core/src/EnvelopeKeys.ts` (new leaf, utility, transform)

**Analogs:**
- `packages/core/src/JsonShape.ts`: file header says "A leaf ... can share it without an edge (`pnpm circular`). Out of the barrel (ADR-QD-099)". It exports one small predicate.
- `packages/core/src/Operand.ts` lines 1-40: header explains why, then "Package-private: kept out of the barrel (AGENTS.md §9) and not exported from any entry point (ADR-QD-099)". It uses own-key reads (`Object.hasOwn`, `isOwnKey`).

**Dispatch pattern**, a hoisted `Match` with an annotated recursive const (AGENTS.md §5a). Copy the shape from `packages/core/src/SinkCodec.ts:223` / `SinkWire.ts:122-131`:

```ts
const project: (record: SinkRecord) => SinkRecordWire = Match.type<SinkRecord>().pipe(...)
export const decodeRefusalOf: (refusal: ...) => DecodeRefusal = Match.type<...>().pipe(
  Match.tagsExhaustive({ NotJson: () => ..., TooDeep: ({ maxDepth }) => ..., }),
);
```

For `SchemaAST.toEncoded(schema.ast)`, match over the AST `_tag`s `Objects`, `Union` and `Suspend`, with `Match.tagsExhaustive` or `Match.tags` plus a throwing default for unsupported nodes (D-21: throw at build time). Under `Union`, pick the member by the input's own `_tag` (own-property read), and an unknown or absent `_tag` takes the first member. `Match.type` hoisted at module scope, never `Match.value` (per-node path). Import only `effect/*`. This is the one new leaf: `pnpm circular` must stay green.

Today's derivation to replace: `SinkCodec.ts:178-179` (`new Set(Object.keys(decisionV2Fields))`) and 434-437 `envelopeOf`:

```ts
const keys = ownValue(input, "_tag") === "Obligations" ? OBLIGATIONS_KEYS : DECISION_KEYS;
return Object.fromEntries(Object.entries(input).filter(([key]) => keys.has(key)));
```

---

### `packages/core/src/SinkCodec.ts`

**Delete:** `ownValue` (420), `envelopeOf` (434), `DECISION_KEYS`/`OBLIGATIONS_KEYS` (178-179 if unused), and the hand-rolled reader in `decodeStoredRecord` (634-653).

**Record wire.** Today (524):
```ts
const sinkWire = untrustedDecoder(SinkRecordWithJson, { prepare: versionThenEnvelope });
```
Becomes `{ unknownKeys: "ignore", prepare: versionThenEnvelope }`. `versionThenEnvelope` (487-494) keeps only the version check. It reads `version` own-property only; `ownValue` leaves this file, so use `Object.hasOwn` inline or the `Operand.ts` `ownValue`. Its failure shape stays:

```ts
return isReadVersion(version)
  ? Result.succeed(input)
  : Result.fail(DecodeRefusal.UnsupportedVersion({ version, supported: WIRE_VERSIONS }));
```

**Stored record.** Today `decodeStoredRecordString` hand-parses JSON and `decodeStoredRecord` hand-reads the keys. Replace both with `untrustedDecoder(StoredEnvelope, { unknownKeys: "ignore", unwalked: ["record"] })`. `StoredEnvelope` is `Schema.Struct({ environment: Schema.String, record: Schema.Unknown })`. The text path goes through `.decodeText`, and `decodeRefusalOf` (`SinkWire.ts:122`) maps refusals. Then `Result.map(decodeSinkRecord(env.record), (r) => stampRecord(r, env.environment))`, as the current last line does. Per D-17 the refusals take the strict decoder's own messages. Per D-18 a deep `environment` is `TooDeep`.

---

### Seam call sites (state the policy explicitly)

**Analogs (current):**
- `packages/audit/src/AuditEntry.ts:117`: `{ unwalked: ["record"] }` becomes `{ unknownKeys: "refuse", unwalked: ["record"] }`.
- `packages/audit/src/AuditArchive.ts:258`: `{ unwalked: ["entries"] }` gets the same addition.
- `packages/react/src/HydrationEngine.ts:193`: `{ unwalked: ["entries"], prepare: checkVersion }` gets `unknownKeys: "refuse"`. Also `decodePolicy` and `decodeEntry` in that file.
- `Policy.ts`, `PortWireEncode.ts`, `PortRemote.ts`: `{ unknownKeys: "refuse" }`. Find the calls with `/usr/bin/grep -rn "untrustedDecoder(" packages/*/src packages/*/test packages/core/bench`. The bench and every test call site need the option too (D-16).

The `asArchiveRefusal` mapping (`AuditArchive.ts:260-264`) and `payloadRefusalReason` (`HydrationEngine.ts:197-`) are the `Match.tagsExhaustive` refusal-mapping template. They stay unchanged.

---

### Tests

**`packages/core/test/UntrustedSeams.test.ts`** is the matrix. Moves:
- `:195` "an unknown envelope key whose value is nested past the bound -> TooDeep" flips to success. Change it in the same commit as the source, after a RED test on the base (WX-06).
- `:243-257` stored cases (60,000-deep key -> success) stay as they are. They use the helpers `recordWith`, `nested(OVER)`, `validRecord()`, `sinkRefusalOf` (reuse, do not redefine).
- Add the per-policy block: shallow unknown key, deep unknown key, excess key inside the payload, and `5`, `null`, `[]`, for each of the five seams. The audit and react `UntrustedSeams.test.ts` twins get the same block.

Test style: `@effect/vitest` plus `assert.strictEqual(refusal?._tag, "TooDeep")` and `Result.isSuccess(...)`.

**`UntrustedDecode.tst.ts`** (tstyche). Header (1-6) says it contains no deliberate compile error, because `tsconfig.test.json` compiles every `*.tst.ts`. Extend it with `expect(...).type.toBe<...>()` for a required `unknownKeys`, and `UnknownKeyPolicy` as exactly `"refuse" | "ignore"`. Every existing `untrustedDecoder(Plain)` in that file (e.g. line 33) must become `untrustedDecoder(Plain, { unknownKeys: "refuse" })`. Declare schemas with `declare const Plain: Schema.Struct<...>` as there.

**`EnvelopeKeys.test.ts`**: mirror `Operand.test.ts` (own-key and prototype-name cases, such as `__proto__` and `constructor` keys, to match the leaf's own-key rule).

**Pins that move with source** (D-17, D-20): `packages/core/test/SinkCodec.test.ts` ~2204-2243, `packages/devtools/test/model/Source.test.ts` ~1050-1058, `packages/audit/test/AuditEntryDifferential.test.ts` ~117-130. Each gets a RED test on the base first.

---

### `57-mutation.mjs`

**Analog:** `.planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation.mjs`. Structure:
- Header comment saying the script applies the Phase 53 D-14 rule with ADR-QD-167 Rev 1.1's static credit.
- Constants `D` (phase dir), `RP` (report path `reports/mutation-<pkg>/mutation.json`), `CF` (`stryker.<pkg>.mjs`), `BASE`/`AFTER` file lists, `MOVED` (base files allowed to fall because killed mutants moved out).
- Helpers `fail`, `norm`, `text`, `idOf`, `det`.
- Subcommands `base|after|evidence <report>|compare`.

Also see `.planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-mutation.mjs` (with `53-mutation-base.json`). Phase 57 differences:
- Three configs (core, audit, react), run one at a time, never beside vitest (D-12).
- `BASE` is `SinkCodec.ts`, `UntrustedDecode.ts`, `AuditEntry.ts`, `AuditArchive.ts`, `HydrationEngine.ts`. `AFTER` adds `EnvelopeKeys.ts`. `MOVED` is `SinkCodec.ts` (and any file whose killed mutants move into `UntrustedDecode.ts`/`EnvelopeKeys.ts`).
- `HydrationEngine.ts` is measured with `--mutate` on the command line, leaving `stryker.react.mjs` unedited (D-22).

---

### Records

**ADR-QD-170**, copy the `spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md` shape:
- A "Document Control" table (Document ID `QADI-ADR-170`, Revision, Effective Date, Status "Accepted — amends ADR-QD-096 (D-15-c), ADR-QD-143; keeps ADR-QD-153", Change History).
- Then `## Context` and `## Decision` with numbered items, and the owner's quoted instruction.
- Add the row to `spec/decisions/index.yaml` (the last entry is 169).

**Changeset**, copy `.changeset/devtools-questions-is-a-dock-input.md`:
```
---
"@qadi/core": minor
---

**Breaking.** `untrustedDecoder` takes a required `unknownKeys: "refuse" | "ignore"` ... Migration: `{ unknownKeys: "refuse" }`.
```
It also states the widening (a record with a deep unknown envelope key now decodes) and the stored-record refusal message change (D-17). Correct the unreleased `.changeset/devtools-malformed-frame-is-a-decode-refusal.md` so it stays true.

**upgrading.md:** add a `## 0.13: ...` section (existing headings run from line 619 to line 912, "## 0.13: the questions are a dock input"; copy that section's tone and shape). Also correct the stored-record message text near line 631.

**BEH/INV/CCR:** reserve numbers with `scripts/next-id.mjs`. Never leave a `*-NEXT` placeholder (AGENTS.md §11). Add the BEH rows to the traceability matrix and the CCR row. Name unused reservations "Unused: ...".

**Budget and §7a:** edit `UNTRUSTED_DECODE_BUDGET` in `scripts/check-house-style.mjs` and the AGENTS.md §7a table in one commit, checked in both directions. `SinkCodec.ts`'s row loses `decodeStoredRecordString`'s `JSON.parse`, so 2 becomes 1. `UntrustedDecode.ts` (currently 5) changes if the projection adds counted tokens. Add `EnvelopeKeys.ts` to the table only if it contains a counted token. Run the gate to confirm, since `[untrusted-decode-table]` compares the two.

**overview.md:** if `UnknownKeyPolicy` is exported from the barrel (`packages/core/src/index.ts`, alphabetical `export *`), add it to `spec/overview.md` (gate 13).

## Shared Patterns

- **Import style:** `import * as Result from "effect/Result"` and so on. Relative imports end in `.ts`. Use `import type` for types.
- **Closed refusal mapping:** `Match.tagsExhaustive` at each seam (`SinkWire.ts:122`, `AuditArchive.ts:260`, `HydrationEngine.ts:197`).
- **Own-property reads only:** `Object.hasOwn` (`FieldLattice.ts:376`, `Operand.ts`). Never an inherited member.
- **No `as`, `any`, `!`, `switch`, `Date.now`, `console`.** No `Record<string, unknown>` widening as a cast dodge (user memory). `isPlainObject` from `JsonShape.ts` is the narrowing.
- **Closed union:** `UnknownKeyPolicy` is the full union, not a boolean (D-02).

## No Analog Found

| File | Reason |
|---|---|
| The `SchemaAST.toEncoded` walk in `EnvelopeKeys.ts` | No existing AST walker in core. Use RESEARCH.md §2 and the `effect` v4 source (`node_modules/effect`, `SchemaAST.ts`). Pattern shape only from the `Match.type` analogs above. |

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `packages/audit`, `packages/react`, `spec/decisions`, `.changeset`, `.planning/phases/QD-53*`, `QD-56*`
**Files scanned:** about 20
**Not verified:** the exact tracked state of `.planning` analogs via `git ls-files` (all are committed phase artifacts). Line numbers are from the working tree at base `ce6b0668`.
