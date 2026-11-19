# Phase 57: untrustedDecoder states the envelope's unknown-key policy - Research

**Researched:** 2026-11-18
**Domain:** `@qadi/core` untrusted-JSON decoding (`UntrustedDecode.ts`), effect v4.1.2 `SchemaAST`, house-style budgets, Stryker evidence
**Confidence:** HIGH for the design and every measured answer (a throwaway prototype of the whole design reproduced the matrix). MEDIUM for mutation runtimes and for the one decision research cannot close (Open Question 1, the stored envelope's messages).
**Base verified:** `git log --oneline -1` is `7adb1aab docs(57): capture phase context ...`. `git status --short packages scripts spec .changeset AGENTS.md` printed nothing before and after every probe (all probes were deleted).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### KEYP-01: a record envelope's deep unknown key is ignored, not `TooDeep` (2026-11-18)

The owner directed on 2026-11-18: "for the Phase 57, answer by the cleanest solutions not the simplest, we dont care about the complexity, we should have the most clean solution". This checkpoint is therefore settled by the orchestrator under that instruction, not by a question.

- **D-01: Ignored.** A deep unknown top-level key on the record wire (`decodeSinkRecord` and its text and `WithJson` forms) is ignored without being walked, as the stored envelope already does. `UntrustedSeams.test.ts:195` ("an unknown envelope key whose value is nested past the bound -> TooDeep") flips to success. `:249` (stored, 60,000 deep -> success) is unchanged.
  - **Why this is the clean answer:**
    1. *It is what "ignored" means.* D-15-c says the reader ignores an undeclared envelope key. A key that can still refuse the frame is not ignored. The record's `TooDeep` answer comes from where the guard happens to sit (it walks before `prepare` drops the key), not from a decision. ADR-QD-143 itself records the stored envelope's opposite answer as the D-15-c behaviour.
    2. *One option, two values, one meaning each.* Keeping `TooDeep` would need a third value, "ignore but walk", which ignores a key's content while letting its depth refuse the frame. Two envelopes in one module would then answer the same input differently forever.
    3. *The guard has nothing to protect.* The guard exists so `Schema`'s recursive descent never meets hostile nesting (INV-QD-305). A key that is dropped is never descended into. `JSON.parse` has already run on the text path, and the 60,000-deep stored pin proves it does not throw.
    4. *It is GH-01's own failure mode.* A newer sender's additive envelope metadata that happens to nest past 256 would refuse every frame for the length of a rolling deploy. D-15-c exists to prevent exactly that.
  - **The rejected alternative:** keep `TooDeep` and change the stored envelope to match. It is the smaller diff on the record, but it turns a documented "ignored, however deep" (ADR-QD-143's `SinkCodec.ts` row, `decodeStoredRecord`'s doc) into a refusal and keeps a key whose content is ignored able to refuse the frame. It is rejected as incoherent, not as more work.
  - **Breaking?** Not for a caller's types. It is a behaviour change, and only a widening: input that was refused is now accepted. It is recorded as a **minor** `@qadi/core` changeset entry and in `upgrading.md`'s unreleased 0.13 section. The changeset says plainly that a record with a deep unknown envelope key now decodes. It is not marked Breaking unless research finds a caller-visible type or export change, in which case that change is Breaking.
  - **RED first (WX-06):** a test written on the phase base asserts that the record with a deep unknown envelope key decodes. It is RED there (`TooDeep`) and goes green after. The existing `:195` case is the pin that moves. It is changed in the same commit as the source, never weakened in advance, and the RED commit's output is recorded in its SUMMARY.

#### The option (KEYP-02)

- **D-02:** The policy is one closed, stated option on `untrustedDecoder` with exactly two values:
  - **refuse:** an unknown top-level key fails the strict decode as `Malformed`. A deep unknown key is still walked first and says `TooDeep`, unchanged.
  - **ignore:** an unknown top-level key is left out before the guard and never reaches `prepare` or the decode.
  - It is a closed union, never a boolean or an open string. Its name and spelling are at Claude's discretion, for example `unknownKeys: "refuse" | "ignore"` or a `Data.TaggedEnum`.
- **D-03:** Under `ignore`, "declared" is derived from the schema's own encoded fields so it cannot drift, as D-15-c already requires. It is not a key list the seam writes by hand.
  - For a union discriminated by `_tag` (the sink record: `Decision | Obligations`), the declared set is the member that the input's own `_tag` selects.
  - An unknown or absent `_tag` keeps today's answer (the decision member's set, then `Malformed` in the decode). Research confirms each answer in the matrix is unchanged.
  - Research settles how this is derived from `SchemaAST`, including through `SinkRecordWithJson`'s `decodeTo`. The bar is: no hand-written key set survives anywhere.
- **D-04:** ADR-QD-096 D-15-c's order (guard, version, project, decode) is kept.
  - Under `ignore`, the guard walks only the declared keys, minus `unwalked`. `prepare` (the version check) still runs after it, and the decode reads only the declared keys.
  - "Nested past the bound and version 3 -> TooDeep" stays, because `resource` is declared.
  - The version check reads `version` the way the decoder reads every key: own property only. `ownValue` leaves `SinkCodec.ts`.
- **D-05:** The default is `refuse`. That is what every decoder does today, and ADR-QD-002's stance. The five envelope seams state their policy explicitly even where it is `refuse`, so a reader sees each envelope's rule at its decoder. Whether a non-envelope decoder must also state it, or a gate refuses an envelope decoder without it, is at Claude's discretion. The bar is that no envelope seam leaves its policy implicit.
- **D-06:** `unwalked` stays as it is (INV-QD-306: a key a second decoder guards from its own root, typed `unknown`). It composes with both values. Whether it folds into the same option object is at Claude's discretion; the clean shape is preferred over the smaller diff.

#### The seams (KEYP-03, KEYP-04)

- **D-07:** Record wire: `untrustedDecoder(SinkRecordWithJson, { <policy>: ignore, prepare: <version check> })`. `envelopeOf` is deleted, and the `prepare` keeps only the version check.
- **D-08:** Stored record: decoded through `untrustedDecoder` with `ignore` and `record` unwalked (`record` is typed `unknown` and handed to the guarded record decode from its own root). The hand-rolled reader (`isPlainObject`, `Object.hasOwn`, `ownValue`) is deleted, and `decodeStoredRecordString` goes through `decodeText`.
  - Each refusal's **tag** is unchanged: not an object is `Malformed`, a missing `record` is `Malformed`, and so on.
  - A changed refusal **message** is allowed only if it is recorded in a BEH and checked by the matrix.
  - If research finds a seam's tag would change, that is a stop-and-report, not an improvisation.
- **D-09:** Audit row (`AuditEntry.ts`), archive (`AuditArchive.ts`) and hydration payload (`HydrationEngine.ts`) state `refuse` explicitly, plus their existing `unwalked`. Their answers are unchanged. A seam that research shows should be `ignore` by the same D-15-c argument is reported, not changed silently. Any such change would be its own owner decision.
- **D-10:** `UNTRUSTED_DECODE_BUDGET` and AGENTS.md §7a's table move together in one commit, checked in both directions. `SinkCodec.ts`'s row loses `decodeStoredRecordString`'s `JSON.parse`. `isPlainObject` and `Object.hasOwn` reads that leave are counted wherever the gate counts them.

#### Tests and mutation

- **D-11 (KEYP-05, WX-06):** The `UntrustedSeams` matrices (core, audit, react) gain a per-policy block.
  - **Inputs:** a shallow unknown top-level key, a deep unknown top-level key, an excess key inside the payload, and non-object input (`5`, `null`, `[]`).
  - **Seams:** every one of the five, plus a direct `untrustedDecoder` pair (refuse vs ignore) in `UntrustedDecode.test.ts`.
  - **Order:** the matrix is characterised on the phase base first. It is green on the base except D-01's RED case, and every answer except D-01's is identical after.
- **D-12 (WX-05):** This follows Phase 55's D-15 and Phase 56's D-11: Phase 53's D-14 rule with ADR-QD-167 Rev 1.1's static credit.
  - `57-mutation-base.json` is recorded on the phase base for `SinkCodec.ts`, `UntrustedDecode.ts`, `AuditEntry.ts`, `AuditArchive.ts` and `HydrationEngine.ts`.
  - A fall passes only as killed mutants that moved into `UntrustedDecode.ts`, where they are still killed.
  - Three Stryker configs are involved (core, audit, react). Run them one at a time and never beside vitest.
- **D-13:** Plan order, RED first: mutation base, then the per-policy matrix and the D-01 RED test, then the option, then the record wire and stored record, then the audit and hydration seams stating their policy, then budget and §7a, then records.

#### Records

- **D-14 (WX-02):** ADR-QD-170 records D-01, quoting the owner's instruction, and gives its reasons and the rejected alternative.
  - It amends ADR-QD-096 D-15-c's mechanism: the projection is the decoder's option, not a `prepare`. The policy and order are kept.
  - It amends ADR-QD-143's `SinkCodec.ts` budget row.
  - It keeps ADR-QD-143 and ADR-QD-153.
  - Also INV-QD-359 (one option states an envelope's unknown-key policy, and no seam hand-builds it) and INV-QD-360 (an ignored key is never walked, so it cannot refuse the frame). Also CCR-QD-448 and BEH-QD-621..625. Any unused reservation is named "Unused: ..." in the CCR row.
- **D-15 (WX-03, WX-07):**
  - `spec/overview.md` follows gate 13 for any changed export, for example a new exported policy type.
  - Changesets: `@qadi/core` minor (the option, plus D-01's widening). `@qadi/audit` and `@qadi/react` get one only if their observable behaviour or API changes; stating `refuse` explicitly changes neither.
  - Nothing is released.

### Claude's Discretion
- The option's name, spelling and type (literal union or tagged enum), and whether `unwalked` joins it.
- How the declared key set is derived from `SchemaAST`, within D-03's bar.
- Whether non-envelope decoders state the policy, and whether a gate enforces it at envelope seams (D-05).
- BEH placement across behaviour docs.

### Deferred Ideas (OUT OF SCOPE)
- Phase 56's review Info items IN-03..IN-06 (devtools `JoinInput` shape, the poll's dead `questions` field, long lines, the `intervalMillis` doc) wait for the next change to those files.
- Whether the audit row, archive or hydration payload should also be `ignore` under D-15-c's argument. It is not changed here (D-09). If research finds a case for it, it is raised for the owner.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KEYP-01 | Deep unknown record-envelope key: ignored (settled, D-01) and recorded in ADR-QD-170 | Section 3 matrix (measured HEAD answers, every row D-01 flips); section 8 (records, free ids) |
| KEYP-02 | `untrustedDecoder` takes the unknown-key policy as one stated option | Section 1 (option shape, semantics, composition with `unwalked`/`prepare`); section 2 (derivation) |
| KEYP-03 | Both `SinkCodec` envelopes decode through it; `ownValue`, `envelopeOf`, stored reader deleted; budget and §7a move together | Sections 4 (stored record), 6 (gate arithmetic), Code Examples |
| KEYP-04 | Audit row, archive, hydration state their policy through the option | Section 5 |
| KEYP-05 | Matrix per policy; every answer unchanged except D-01's, with a RED test | Section 3 (full per-seam table, existing pins, the two pins that flip) |
| WX-01 | `pnpm check:pr < /dev/null` green at the end | Validation Architecture |
| WX-02 | ADR/CCR/BEH/INV only from reserved numbers; never run `next-id.mjs` | Section 8 (all reserved ids confirmed free) |
| WX-03 | `spec/overview.md` follows gate 13 | Section 1 (public surface), section 8 |
| WX-04 | Nothing forbidden added (`as`, `!`, `any`, `switch`, `Effect.fnUntraced`, ...) | Section 2 (derivation compiles with none of them), section 9 |
| WX-05 | Coverage holds; Stryker score of touched files does not fall | Section 7 |
| WX-06 | Behaviour change preceded by a base test (RED for the defect, green for preserved) | Section 3 (the two RED rows), Validation Architecture |
| WX-07 | Public break recorded Breaking in changeset and `upgrading.md` | Section 1 (the option shape decides this), section 8 |
</phase_requirements>

## Summary

`untrustedDecoder` (`packages/core/src/UntrustedDecode.ts`) gets one required, closed option, `unknownKeys: "refuse" | "ignore"`, whenever an options object is passed. Under `ignore`, before the depth guard, the decoder projects a plain-object input onto the top-level keys that the schema's own encoded AST declares for the member the input's own discriminant selects. The guard then walks the projection minus `unwalked`, `prepare` receives the projection, and the strict decode reads the projection. Under `refuse` nothing is projected, so every current answer is byte-identical. The declared keys come from `SchemaAST.toEncoded(schema.ast)`, walked with `Match` over `Objects`/`Union`/`Suspend`, once at build time. A throwaway prototype of exactly this design, run against the real `SinkRecordJson`, reproduced every HEAD answer of the record wire except the rows D-01 flips.

Research found three things the CONTEXT did not anticipate, all measured:
1. **D-01 flips more than `UntrustedSeams.test.ts:195`.** `decodeAuditEntry` and `readAuditArchive` read the record through `decodeSinkRecordWithJson`, so a deep unknown key inside an audit row's record, or inside an archive entry's record, also flips from `TooDeep` to success. A second pin moves: `packages/audit/test/AuditEntryDifferential.test.ts:117-130` (the `deepExtra` half). Also, "deep unknown key + version 3" flips from `TooDeep` to `UnsupportedVersion`.
2. **The stored envelope's `environment` becomes a walked key.** A stored envelope whose `environment` holds a value nested past 256 is `Malformed` at HEAD and becomes `TooDeep` through the decoder. That is a tag change, which D-08 says to stop and report (Open Question 2). No existing test pins it.
3. **The stored reader's four reason messages cannot be kept for free.** The strict decode says `Missing key at ["environment"]` where the reader says "a bare record ...", and the text path (`decodeText`) never hands the seam the parsed input a classifier would need. Two pinned tests hold the old messages, one of them in `@qadi/devtools` (Open Question 1).

**Primary recommendation:** Add `unknownKeys` as a required field of `UntrustedDecoderOptions` (so every envelope seam states its policy by construction, and no gate is needed), dispatch it through a closed `Record<UnknownKeyPolicy, ...>` table (so a Stryker `""` mutant of a stated `"refuse"` is killed, not equivalent), derive declared keys in a new package-private leaf `EnvelopeKeys.ts`, keep `unwalked` and `prepare` as they are, and record the required field as a **Breaking** `@qadi/core` change.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Unknown-key policy and the projection | `@qadi/core` `UntrustedDecode.ts` (decoder leaf) | `EnvelopeKeys.ts` (new package-private leaf) | The decoder owns guard, prepare, strict decode in one fixed order (ADR-QD-143); the policy is one more step of that recipe |
| Declared top-level keys of a schema | `EnvelopeKeys.ts`, read from `SchemaAST` | none | Derived from the same AST the strict decode reads, so it cannot drift (D-15-c) |
| Record wire version check | `SinkCodec.ts` (`prepare`) | `SinkWire.ts` (`WIRE_VERSIONS`) | Version is wire vocabulary, not a decoder concern |
| Stored-record envelope | `SinkCodec.ts` seam over the decoder | none | One decoder for the envelope, `record` handed to `decodeSinkRecord` from its own root |
| Audit row, archive, hydration payload | each seam's own module (`@qadi/audit`, `@qadi/react`) | none | They state `refuse` at their decoder; they keep their own `unwalked` and refusal mapping |
| Budget and §7a table | `scripts/check-house-style.mjs` + `AGENTS.md` | none | Checked in both directions |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` | 4.1.2 | `Schema`, `SchemaAST`, `Match`, `Result`, `Data` | The project's only runtime dependency; the decoder already imports it. [VERIFIED: `node_modules/effect/package.json` `"version": "4.1.2"`] |

### Supporting
No new package. No new dependency. `SchemaAST` is a submodule of the already-installed `effect`. [VERIFIED: `node_modules/effect/src/SchemaAST.ts` exists, 5356 lines]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `SchemaAST` walk for declared keys | `Object.keys(fields)` at each seam (today's `DECISION_KEYS`) | A hand-kept list per seam; it is exactly what D-03 forbids and it cannot see through `decodeTo` |
| Required `unknownKeys` | Optional with default `"refuse"` | Smaller diff, additive (minor, not Breaking), but D-05's bar "no envelope seam leaves its policy implicit" then needs a house-style gate or stays a convention |

**Installation:** none.

## Package Legitimacy Audit

No external package is installed by this phase, so the gate has nothing to check.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | - | - | - | - | - | - |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## 1. The option's design

### 1.1 What exists at HEAD

[VERIFIED: `packages/core/src/UntrustedDecode.ts:119-128, 140-143, 146-150, 167-208`] The decoder is `untrustedDecoder<S extends Schema.ConstraintDecoder<unknown>, R extends { readonly _tag: string } = never>(schema: S, options?: UntrustedDecoderOptions<S["Encoded"], R> & FreeRefusalTag<R>)`. Its options interface is:

```ts
export interface UntrustedDecoderOptions<A, R extends { readonly _tag: string }> {
  readonly unwalked?: ReadonlyArray<UnwalkedKey<A>>;
  readonly prepare?: (input: unknown) => Result.Result<unknown, R>;
}
```

`decode` is `walked(input)` then `exceedsJsonDepth(..., MAX_DECODE_DEPTH)`, then `prepare(input)` (the **raw** input), then `strict(value)`. `walked` only filters `unwalked` keys, and only for a plain object (`unwalked.size > 0 && isPlainObject(input)`, lines 178-181). `Constraint.ast` is typed `SchemaAST.AST` on the schema, so `schema.ast` needs no cast. [VERIFIED: `node_modules/effect/src/Schema.ts:818-824`, `readonly "ast": SchemaAST.AST`]

### 1.2 Public surface (answers "are these public?")

[VERIFIED: `packages/core/src/index.ts` line 59 `export * from "./UntrustedDecode.ts";`] `untrustedDecoder`, `UntrustedDecoder`, `UntrustedDecoderOptions`, `UnwalkedKey`, `UntrustedRefusal`, `UntrustedValueRefusal`, `MAX_DECODE_DEPTH` are all public. [VERIFIED: `spec/overview.md:132-136`] names `untrustedDecoder`, `UntrustedDecoder`/`UntrustedDecoderOptions` (row text "what a seam adds (`unwalked`, `prepare`)"), `UntrustedRefusal`, `UntrustedValueRefusal` and `UnwalkedKey`. [VERIFIED: `packages/core/test/UntrustedDecode.tst.ts` read in full] pins the type contract with tstyche (`unwalked` accepts only `unknown`-typed keys, a clashing `prepare` tag is refused). `spec/behaviors/08-serialization.md` BEH-QD-486 carries the interface in a `ts` (uncompiled) fence. The only other source consumers are in-repo: `Policy.ts:962`, `PortRemote.ts:123`, `PortWireEncode.ts:125,127`, `SinkCodec.ts:524`, `AuditEntry.ts:117`, `AuditArchive.ts:258`, `HydrationEngine.ts:164,193,205`, and `packages/core/bench/UntrustedDecode.bench.ts:36,39,49`.

**Consequence for WX-07:** a *required* new field of the options bag is a caller-visible type break for any external caller that passes `{ unwalked }` or `{ prepare }` alone. An *optional* field is additive. CONTEXT D-15 says to mark Breaking exactly when research finds such a change, so the shape chosen in 1.3 decides the changeset class.

### 1.3 Recommended shape (cleanest, per the owner's instruction)

```ts
/** What an envelope does with a top-level key its schema does not declare. */
export type UnknownKeyPolicy = "refuse" | "ignore";

export interface UntrustedDecoderOptions<A, R extends { readonly _tag: string }> {
  /** Required whenever options are passed: every envelope states its rule at its decoder. */
  readonly unknownKeys: UnknownKeyPolicy;
  readonly unwalked?: ReadonlyArray<UnwalkedKey<A>>;
  readonly prepare?: (input: unknown) => Result.Result<unknown, R>;
}
```

- **Required when an options object is passed; omitting the options object means `"refuse"`.** Every call that today passes options is an envelope (the five seams, all of which D-05 says must state a policy), and the three non-envelope decoders (`Policy.ts`, `PortRemote.ts`, `PortWireEncode.ts`, plus hydration's `decodePolicy` and `decodeEntry`) pass none, so the compiler enforces D-05's bar with no gate. [VERIFIED: grep of every `untrustedDecoder(` call, listed in 1.2] Sites that must change to compile: the four envelope seams, `packages/core/test/DecodeRefusal.test.ts:217` (`untrustedDecoder(Schema.String, {})`), `packages/core/test/UntrustedDecode.test.ts:43,129-148,159,172,179`, `UntrustedDecode.tst.ts`, and the three bench decoders.
- **Name `UnknownKeyPolicy`** is exported so the closed dispatch table and the BEH fence can name it; that is one new `spec/overview.md` row (gate 13). [ASSUMED] Inlining the literal union instead avoids the row but forces the table to be typed through an indexed access; the owner's cleanliness instruction favours the named type.
- **Keep `unwalked` flat, do not fold it into the policy.** `unwalked` is about the depth guard (INV-QD-306, typed by `UnwalkedKey`); the policy is about which keys exist. Folding them would couple two orthogonal axes and change INV-QD-306's type pin text for no gain. D-06 allows either.
- **Alternative (not recommended, offered for the planner):** `unknownKeys?: UnknownKeyPolicy` defaulting to `"refuse"`. Additive, so the changeset stays minor. Cost: nothing forces a seam to state it.

### 1.4 Exact semantics

For `decode(input)` (and `decodeText`, which is `JSON.parse` then `decode`), in this fixed order:

1. **Project (new, `ignore` only).** If `isPlainObject(input)`, take `Object.entries(input)` (own, enumerable, string keys), compute the declared key set for the member the input selects (section 2), and keep only entries whose key is in it. Anything that is not a plain object (a primitive, `null`, an array) is passed through untouched, so the decode reports it `Malformed` exactly as today. Under `refuse` this step is the identity.
2. **Guard.** `exceedsJsonDepth(walked(projected), MAX_DECODE_DEPTH)` where `walked` still removes `unwalked` keys. `unwalked` keys are *declared*, so they survive step 1 and are excluded here only.
3. **Prepare.** `prepare(projected)`, not `prepare(input)`. Under `refuse` `projected === input`, so hydration's `checkVersion` is unchanged. Under `ignore` it sees the declared keys only, which is what lets the record wire's version check read `version` from a fresh object.
4. **Strict decode.** `strict(prepared)`.

`ignore` composes with `unwalked` (declared and unwalked: kept in the projection, left out of the walk) and with `prepare` (it sees the projection). The order guard, version, project, decode of ADR-QD-096 D-15-c becomes project, guard, version, decode. Project is a shallow own-key copy that never reads a value, so it cannot overflow and it cannot change the answer of the guard for any *declared* key; moving it before the guard is what makes D-01 true. D-04's "nested past the bound and version 3 -> TooDeep" is unchanged because `resource` is declared. [VERIFIED: prototype, `B4 declared deep + v3` stayed `TooDeep`]

**The closed dispatch (mutation-critical, see Pitfall 6).** The policy value must be read through a closed table, not an `=== "ignore"` test:

```ts
// Source: AGENTS.md §5a precedent (FieldLattice.ts's closed Record read through Object.hasOwn)
const PROJECTION: Readonly<Record<UnknownKeyPolicy, (schema: Schema.Top) => Projection>> = {
  refuse: () => identity,
  ignore: projectionOf,   // EnvelopeKeys.ts
};
```

A stated `unknownKeys: "refuse"` at a seam, mutated by Stryker to `""`, then reads `undefined` from the table and throws when the decoder is built, so the mutant is killed. With an `=== "ignore"` test the same mutant is behaviourally equivalent and would survive in four files.

## 2. Deriving the declared keys from the schema (D-03)

### 2.1 How they are derived today

[VERIFIED: `packages/core/src/SinkCodec.ts:145-157, 167-170, 174-179`]

```ts
const decisionV2Fields = { _tag: Schema.Literal(DECISION_RECORD_TAG), version: Schema.Literal(WIRE_VERSION), ...decisionRecordFields.fields, outcome: OutcomeWire };
const obligationsV2Fields = { _tag: Schema.Literal(OBLIGATION_RECORD_TAG), version: Schema.Literal(WIRE_VERSION), ...obligationRecordFields.fields };
const SinkRecordWire = Schema.Union([Schema.Struct(decisionV2Fields), Schema.Struct(obligationsV2Fields)]);
const DECISION_KEYS: ReadonlySet<string> = new Set(Object.keys(decisionV2Fields));
const OBLIGATIONS_KEYS: ReadonlySet<string> = new Set(Object.keys(obligationsV2Fields));
```

So they are `Object.keys` of the very record that builds each `Schema.Struct`; they cannot drift, but they only exist where the fields record is in scope (SinkCodec) and the choice between them is `envelopeOf`'s hand-written `ownValue(input, "_tag") === "Obligations"` (line 435). Their only reader is `envelopeOf` (grep: three occurrences, all in `SinkCodec.ts`), so both constants are deleted with it.

### 2.2 What the AST looks like (measured)

[VERIFIED: probe this session, `SchemaAST.toEncoded(ast)` on each shape]

| Schema | `schema.ast` | `SchemaAST.toEncoded(schema.ast)` |
|---|---|---|
| plain `Schema.Struct({ record: Unknown, sequenceNumber: optional(Number) })` | `Objects` | `Objects[record:Unknown, sequenceNumber:Union?]`, `encoding` none |
| `Struct.mapFields(...)` (hydration `Envelope`) | `Objects` | `Objects[a:String, entries:Arrays]` |
| `Struct(...).pipe(Schema.encodeKeys({ a: "A" }))` | `Objects` with encoding | `Objects[A:String]` (the **encoded** key name) |
| `Schema.NumberFromString` inside a struct field | field `Number` with encoding | field `String`, the property name unchanged |
| `SinkRecordWithJson` = `SinkRecordJson.pipe(Schema.decodeTo(Struct{ json, record }))` | `Objects` **with** an encoding link (`enc=yes`) | **`Union(2)`** of `Objects[_tag:Literal=Decision, version:Literal=2, evaluationId:String, at:Number, subjectId:String, policy:Union, resource:Union?, action:Union?, cache:Union?, outcome:Union]` and `Objects[_tag:Literal=Obligations, version:Literal=2, evaluationId:String, at:Number, outcome:Union, obligationIds:Arrays, subjectId:Union?, action:Union?, resourceId:Union?]`, both `enc=none` |
| `Policy` | `Union(16)` of `Objects[_tag:Literal=..., ...]` | same shape, `_tag` literal per member |
| `Schema.Unknown` | `Unknown` | `Unknown` |
| `Schema.Array(String)` | `Arrays` | `Arrays` |

Answers to the questions asked:
- **Plain struct:** `Objects.propertySignatures[].name`. [VERIFIED: `SchemaAST.ts:2858-2870` `Objects` has `propertySignatures: ReadonlyArray<PropertySignature>` with `name: PropertyKey`, `type: AST`, and `indexSignatures`]
- **Union discriminated by a literal `_tag`:** `Union.types: ReadonlyArray<A>` (`SchemaAST.ts:3692-3700`). The member for an input is the one whose non-optional `Literal` slot equals the input's own value for that key. The two sink members also share `version: Literal=2`, so `version` does **not** discriminate (same value in both); `_tag` does (distinct).
- **`Schema.decodeTo` transformation (`SinkRecordWithJson`):** the *encoded input* side is the **source** of the `decodeTo`, i.e. `SinkRecordJson`'s own `Union`. `toEncoded` is `toType(flip(ast))` (`SchemaAST.ts:4775-4777`), which strips the link and returns the source AST. The decoded `{ json, record }` target is never what the strict decode reads. Using `toEncoded` is therefore correct for every case in the table, including `encodeKeys`; using `schema.ast` directly or `toType` would be wrong for `SinkRecordWithJson` (it would yield `{json, record}`).
- **`Schema.suspend` / other wrappers:** `Suspend.thunk: () => AST` (`SchemaAST.ts:4022-4060`); `thunk` memoises. None of the five envelope schemas has a top-level `Suspend` (`Policy` is a `Union` at the top with suspended children). Handle `Suspend` by resolving `thunk()`; every other node (`Unknown`, `Arrays`, primitives, `Declaration`) has no declared object keys.
- **Unknown or absent discriminant:** the first union member, which for `SinkRecordJson` is the Decision member, equal to today's `DECISION_KEYS` fallback. Measured identical (prototype rows `unknown _tag` and `no _tag` gave the same `Malformed` text as HEAD).

`collectSentinels` and `getCandidateIndex` already do the discriminant work inside effect, but they are marked `/** @internal */` and absent from the published declarations [VERIFIED: `grep` of `node_modules/effect/dist/SchemaAST.d.ts` for `collectSentinels|getCandidateIndex` returned no match], so the derivation must be ours.

### 2.3 Proposed code (compiles; no `as`, `!`, `any`, `switch`, no `Effect.fnUntraced`)

A new package-private leaf, `packages/core/src/EnvelopeKeys.ts`, imports `effect/Match` and `effect/SchemaAST` only (value import; the decoder currently has `import type * as SchemaAST`). It sits in the same family as `DecodeDepthGuard.ts` and `JsonShape.ts`: out of the barrel (ADR-QD-099), no budget row, no tokens the gate counts. [VERIFIED: the `Match.type<SchemaAST.AST>().pipe(Match.tag(...), Match.orElse(...))` recursion below was compiled with `tsc -p <scratch config>` this session; a deliberate type error appended to the same file was reported, so the check was live. The scratch file was deleted.]

```ts
// packages/core/src/EnvelopeKeys.ts (sketch)
import * as Match from "effect/Match";
import * as SchemaAST from "effect/SchemaAST";

/** One object member: its declared top-level keys, and the required literal slots that tell members apart. */
interface Member {
  readonly keys: ReadonlySet<PropertyKey>;
  readonly literals: ReadonlyMap<PropertyKey, unknown>;
}

const memberOf = (ast: SchemaAST.Objects): Member => ({
  keys: new Set(ast.propertySignatures.map((ps) => ps.name)),
  literals: new Map(
    ast.propertySignatures.flatMap((ps) =>
      SchemaAST.isLiteral(ps.type) && !SchemaAST.isOptional(ps.type) ? [[ps.name, ps.type.literal] as const] : [],
    ),
  ),
});

/** The object members under an encoded AST; recursion is annotated per AGENTS.md §5a. Any other node declares no keys. */
const membersOf: (ast: SchemaAST.AST) => ReadonlyArray<Member> = Match.type<SchemaAST.AST>().pipe(
  Match.tag("Objects", (ast) => [memberOf(ast)]),
  Match.tag("Union", (ast) => ast.types.flatMap(membersOf)),
  Match.tag("Suspend", (ast) => membersOf(ast.thunk())),
  Match.orElse(() => []),
);
```

Then `projectionOf(schema)` runs once at decoder build:

```ts
const members = membersOf(SchemaAST.toEncoded(schema.ast));
// members.length === 0: not an object schema.  members.length > 1 and no key whose literals are pairwise distinct: undiscriminated.
// Both are programmer errors at module scope -> throw at construction (precedent below).
const discriminant = members.length === 1 ? undefined : [...first.literals.keys()].find(/* every member holds a distinct non-undefined literal */);
// per call: entries = Object.entries(input); tag = entries.find(([k]) => k === discriminant)?.[1];
//           keys = (members.find((m) => m.literals.get(discriminant) === tag) ?? first).keys;
```

- **Keys are `PropertyKey` sets, not string-filtered.** `Set<PropertyKey>.has(string)` needs no `typeof name === "string"` branch, so there is no symbol-key branch to cover at the 95% core threshold.
- **Computed once.** `membersOf(toEncoded(schema.ast))`, the discriminant and the per-member sets are built when the decoder is built; per call there is one `Object.entries`, one `find` on a 1-2 element array and one filter. `SchemaAST.toEncoded` is memoised by effect (`memoizeIdempotent`, `SchemaAST.ts:4775`).
- **Selection reads the same entries the projection copies**, so it is own-property only with no `ownValue`: `Object.entries` yields own enumerable string keys, never an inherited one (measured: `Object.create({ version: 2 })` is `UnsupportedVersion`, same as HEAD) and an own `__proto__` key from `JSON.parse` is read as data (the filter drops it; `Object.fromEntries` defines it as an own property, it does not touch the prototype).
- **Schemas whose keys cannot be derived: a construction-time `throw`.** This is the existing precedent for a programmer error at build time: `DecisionCache.ts:203`, `DecisionLog.ts:212`, `TreeFold.ts:76,122`, `Timeline.ts:85` all `throw new Error(...)` and no house rule forbids it (the `RULES` list in `scripts/check-house-style.mjs` has no `throw` rule; WX-04's forbidden list does not include it). A type that refuses `ignore` for a non-object `Encoded` is possible (`unknown extends E` or `E extends ReadonlyArray`) but cannot see an undiscriminated union, so it would only cover half the cases and leave the throw as the backstop anyway. Recommend the throw plus a test that builds the decoder **inside a test body** (also needed for mutation, Pitfall 5).
- **Where it lives.** Inside `UntrustedDecode.ts` this adds about 35 lines and keeps the leaf's import list unchanged; as `EnvelopeKeys.ts` the leaf imports one more module (still no cycle, still `effect` only). The cleanest split follows `DecodeDepthGuard.ts`; if chosen, UntrustedDecode's header sentence "imports `effect`, `DecodeDepthGuard.ts` and `JsonShape.ts` only" and ADR-QD-143's twin sentence gain the new module. `[ASSUMED]` that no gate enforces that sentence: `grep` of `scripts/*.mjs` for `UntrustedDecode` found only the budget lines, and the only structural check is `pnpm circular` (madge), which a leaf that imports only `effect` cannot fail.

## 3. Every seam's answer today, and after (D-11)

All "HEAD" cells below are measured by probe tests run at `7adb1aab` (`pnpm exec vitest run --project core|audit ...`), then deleted. "After" is the prototype of section 1.4 and 2.3 run through the real `SinkRecordJson` plus the rule "D-01 ignores unknown keys". Hydration's HEAD answers are its existing, passing pins.

### 3.1 Record wire: `decodeSinkRecord`, `decodeSinkRecordString`, `decodeSinkRecordWithJson`

All three gave the same answer in every row (HEAD).

| Input | HEAD (tag and message) | After |
|---|---|---|
| valid v2 record | success | same |
| A. shallow unknown top-level key | success | same |
| **B. deep (266) unknown top-level key** | `TooDeep` 256 | **success (D-01)** |
| **B2. 60,000-deep unknown key** | `TooDeep` 256 | **success (D-01)** |
| **B3. deep unknown key and `version: 3`** | `TooDeep` 256 | **`UnsupportedVersion` carrying 3 (D-01 consequence: the key is no longer walked, so the version check is reached)** |
| B4. deep *declared* key (`resource`) and `version: 3` | `TooDeep` 256 | same (the existing `UntrustedSeams.test.ts:174` pin) |
| C. excess key inside the policy | `Malformed`, `Expected no excess property\n  at ["policy"]["sneaky"]` | same |
| D. `5`, `null`, `[]` | `Malformed`, starts `Expected { readonly "_tag": "Decision", readonly "version": 2, ... } \| { readonly "_tag": ` | same (non-plain input is not projected) |
| `{}` | `UnsupportedVersion`, `version: undefined` | same |
| unknown `_tag` with an unknown key | `Malformed`, `Expected { readonly "_tag": "Decision", ...` | same |
| no `_tag` (decision keys) | `Malformed`, `Missing key\n  at ["_tag"]\nExpected no excess property\n  at ["policy"]` | same |
| Obligations record carrying a Decision-only key (`policy`) | success (the key is not in the Obligations member) | same |
| `Object.create({ version: 2 })` (inherited) | `UnsupportedVersion`, `version: undefined` | same |
| **own `__proto__` key holding a 266-deep value** | `TooDeep` 256 | **success (D-01)** |

### 3.2 Stored record: `decodeStoredRecord`, `decodeStoredRecordString`

HEAD answers were identical on the value and text path except the two noted rows.

| Input | HEAD | After, strict decode with `ignore` and `record` unwalked |
|---|---|---|
| valid envelope | success | same |
| A. shallow unknown key; B. 266-deep; B2. 60,000-deep unknown key | success | same (the `:249` pin) |
| C. excess key in `record`'s policy | `Malformed`, `Expected no excess property\n  at ["policy"]["sneaky"]` | same (`record` goes to `decodeSinkRecord`) |
| C2. `record` nested past the bound (declared `resource`) | `TooDeep` 256 | same |
| `5`, `null`, `[]` | `Malformed`, "a stored record is a JSON object { environment, record }" | `Malformed`, `Expected object` (strict-decode text) |
| `{}` and `{ cursor: "x" }` | `Malformed`, "a bare record, not a stored-record envelope { environment, record }" | `Malformed`, `Missing key\n  at ["environment"]` |
| a bare record (what a pre-0.10 server sends) | the same "a bare record ..." text | `Malformed`, `Missing key\n  at ["environment"]` |
| `{ environment: "E" }` (no record) | `Malformed`, "a stored record names no record" | `Malformed`, `Missing key\n  at ["record"]` |
| `{ record }` (no environment) | `Malformed`, "a stored record's environment is not a string" | `Malformed`, `Missing key\n  at ["environment"]` |
| `{ environment: 1, record }` | `Malformed`, "... environment is not a string" | `Malformed`, `Expected string\n  at ["environment"]` |
| inherited `environment` (`Object.create`) | `Malformed`, "... not a string" | `Malformed`, `Missing key\n  at ["environment"]` (own keys only) |
| `{ environment: "E", record: undefined }`, value path | `Malformed`, `Expected { readonly "_tag": ...` (from `decodeSinkRecord(undefined)`) | same (`Schema.Unknown` accepts the own `undefined`) |
| `{ environment: "E" }` text path of the above (JSON drops `undefined`) | `Malformed`, "a stored record names no record" | `Malformed`, `Missing key\n  at ["record"]` |
| `record: null` | `Malformed`, `Expected { readonly "_tag": ...` | same |
| **`environment` holding a 266-deep value** (with or without `record`) | **`Malformed`, "... environment is not a string"** | **`TooDeep` 256: a tag change (Open Question 2)** |

[VERIFIED: probe for HEAD; prototype for "After". `Schema.Unknown` as a required key: `{ environment: "E" }` is `Missing key at ["record"]`, an own `record: undefined` and `record: null` succeed.] **Every tag is unchanged except the `environment` row; every message changes unless Open Question 1 is decided to keep them.**

### 3.3 Audit row: `decodeAuditEntry` (refuse, `unwalked: ["record"]`)

| Input | HEAD | After |
|---|---|---|
| valid row; row without `sequenceNumber` | success | same |
| A. shallow unknown **row** key | `Malformed`, `Expected no excess property\n  at ["sneaky"]` | same |
| B. 266-deep / 60,000-deep unknown **row** key | `TooDeep` 256 | same (row is `refuse`) |
| shallow unknown key inside the row's **record** envelope | success | same |
| **266-deep / 60,000-deep unknown key inside the row's record** | `TooDeep` 256 | **success (D-01 propagates through `decodeSinkRecordWithJson`)** |
| excess key in the record's policy | `Malformed`, `... at ["policy"]["sneaky"]` | same |
| `sequenceNumber: "x"` | `Malformed`, `Expected number \| undefined\n  at ["sequenceNumber"]` | same |
| `5`, `null`, `[]`, `{}` | `Malformed`, "an audit row has no record" (`Predicate.hasProperty` fails first) | same |
| `record: 5`, `record: null` | `Malformed`, `Expected { readonly "_tag": ...` | same |

### 3.4 Audit archive: `readAuditArchive` (refuse, `unwalked: ["entries"]`)

| Input | HEAD | After |
|---|---|---|
| valid archive | success | same |
| shallow unknown envelope key | `Malformed`, `Expected no excess property\n  at ["sneaky"]` | same |
| 266-deep / 60,000-deep unknown envelope key; the same with `archiveVersion: "2"` | `TooDeep` 256 | same |
| excess key in `metadata` | `Malformed`, `... at ["metadata"]["note"]` | same |
| entry 1 with an excess key in its record's policy | `EntryNotDecodable` index 1, inner `Malformed` | same |
| entry with a shallow unknown record key | success | same |
| **entry 0 with a 266-deep unknown record key** | `EntryNotDecodable` index 0, inner `TooDeep` | **success (D-01 propagates)** |
| `5`, `null`, `[]` | `Malformed`, `Expected object` | same |
| `{}` | `Malformed`, `Missing key\n  at ["archiveVersion"]` | same |

### 3.5 Hydration payload (refuse, `unwalked: ["entries"]`, `prepare: checkVersion`)

All pinned by `packages/react/test/UntrustedSeams.test.ts` and unchanged: valid -> seeded 1; `5`, `null`, `[]` -> `MalformedPayload`; `{}` -> `UnsupportedPayloadVersion`; version 3 -> `UnsupportedPayloadVersion`; shallow excess envelope key -> `MalformedPayload`; excess key with a value nested past the bound -> `PayloadTooDeep`; an array payload nested past the bound -> `PayloadTooDeep`; nested and version 3 -> `PayloadTooDeep`; `subjectId` nested past the bound -> `PayloadTooDeep`. Stating `refuse` changes none (`refuse` is the identity projection, and `prepare` still receives the raw input).

### 3.6 Direct `untrustedDecoder` pair (new `UntrustedDecode.test.ts` block)

For a `Needs = Struct({ a: Number })` and a `Slots`-like struct, `{ unknownKeys: "refuse" }` vs `"ignore"`: shallow unknown key (`Malformed` vs success), 257-deep unknown key (`TooDeep` vs success, value `{ a: 1 }`), excess inside a nested struct (`Malformed` vs `Malformed`), `5`/`null`/`[]` (identical, `Malformed`), `ignore` with `unwalked` (unwalked slot decodes at 60,000 deep, a deep unknown key is ignored, a deep declared walked key is `TooDeep`), `prepare` under `ignore` sees no unknown key and is not called when the guard refuses, a discriminated union (matching tag, unknown tag, absent tag falls to the first member and is `Malformed`), and the two construction-time throws (`Schema.Unknown`, an undiscriminated union).

### 3.7 Existing tests that pin these answers

| Pin | Where | After the phase |
|---|---|---|
| deep unknown record key -> `TooDeep` | `packages/core/test/UntrustedSeams.test.ts:195` | **flips to success, same commit as the source** |
| deep (60,000) key under an unknown record key -> `TooDeep` | `packages/audit/test/AuditEntryDifferential.test.ts:117-130` (the `deepExtra` assertion; the title also names it) | **flips to success; the `deepPolicy` half (a declared key) stays `TooDeep`** |
| stored, 60,000-deep unknown key -> success | `UntrustedSeams.test.ts:249` | unchanged |
| the four stored envelope reasons | `packages/core/test/SinkCodec.test.ts:2204-2220` (exact strings) and `:2232-2243` (`include "bare record"`) | **change only under Open Question 1 Route C** |
| the bare-record reason, exact | `packages/devtools/test/model/Source.test.ts:1050-1058` | **same** |
| stored tags: `Malformed` for bad environment, no record, text, `[1]`, `null` | `SinkCodec.test.ts:2190-2202` | unchanged |
| refuse-side answers | `UntrustedSeams.test.ts` in audit (`readAuditArchive`, `decodeAuditEntry`), `packages/react/test/UntrustedSeams.test.ts`, `UntrustedDecode.test.ts:129-148,157-197,250-274` | unchanged; `:129-148` and the option literals gain `unknownKeys: "refuse"` |
| record leniency | `SinkCodec.test.ts:797-860` (shallow only) | unchanged |
| frames | `packages/devtools/test/model/Source.test.ts:497` (shallow unknown key), `:1032` (`TooDeep` from a declared key) | unchanged |

`grep` found no `.feature`, golden file, devtools or http test pinning the deep-unknown-key `TooDeep` answer. [VERIFIED: grep of tests for `traceparent`, `addedLater`, `unknown envelope key` across `packages/*/test`, `features/`]

## 4. The stored record (D-08)

[VERIFIED: `SinkCodec.ts:575-654`] today: `StoredRecordJson = Schema.Struct({ environment: Schema.String, record: SinkRecordJson })` (exported, the **encode** side, stays untouched so the stored byte goldens hold); `notAnEnvelope(message)`; `decodeStoredRecord` (reads with `isPlainObject`, `Object.hasOwn`, `ownValue`, then `decodeSinkRecord(ownValue(input, "record"))` and `stampRecord`); `decodeStoredRecordString` (`Result.try(JSON.parse)`, `NotJson()` on failure).

**Replacement.** A module-private decode schema, because `record` must be `unknown` for `unwalked` (INV-QD-306) and must not be strict-decoded twice:

```ts
const StoredEnvelopeWire = Schema.Struct({ environment: Schema.String, record: Schema.Unknown });
const storedWire = untrustedDecoder(StoredEnvelopeWire, { unknownKeys: "ignore", unwalked: ["record"] });
```

`decodeStoredRecord(input)` = `storedWire.decode(input)`, map refusal with `decodeRefusalOf`, then `decodeSinkRecord(envelope.record)`, then `stampRecord(record, environment)`. `decodeStoredRecordString(text)` = the same through `storedWire.decodeText(text)`; `NotJson` maps to `DecodeRefusal.NotJson()` via the existing `decodeRefusalOf` (parser message dropped, as today). `StoredRecordJson` stays the encode-side type; keep the decode schema distinct so Phase 58's "the stored codec is the record codec plus one field" can replace it in one place.

**Tags (mandatory unchanged):** every Malformed case of the old reader is `Malformed` from the decoder (table 3.2); `NotJson` is unchanged; `TooDeep` for a `record` nested past the bound is unchanged because `record` still goes to the guarded `decodeSinkRecord`. The single tag change is a deep `environment` (Open Question 2).

**Messages.** Four reason strings are pinned (3.7). They cannot be preserved by the decoder alone: the strict decode needs the input to tell "a bare record" (neither key) from "environment missing" (only `record`), and `decodeText` never returns the parsed input, while `UntrustedRefusal.Malformed` carries only `{ message, error }` and its arms are out of scope. `SchemaIssue` records the input only when "input reporting is enabled" [CITED: `node_modules/effect/src/SchemaIssue.ts:87-95`, `hasInput`], which the decoder does not enable. See Open Question 1 for the routes.

**Consumers of `decodeStoredRecord`/`decodeStoredRecordString`.** [VERIFIED: grep] `packages/devtools/src/model/Source.ts:31,237` (frames, reports `DecodeRefusal` with `describeDecodeRefusal`), `packages/http/src/DecisionBacklogRoute.ts:10` (doc only), tests in `packages/http/test/{DecisionLogHttp,decisionBacklog,decisionStream}.test.ts` and `packages/core/test/{SinkCodec,DecisionStream,UntrustedSeams}.test.ts`, `examples/nextjs-newsroom/e2e/decision-log.spec.ts:13,74`. None of them reads a refusal **message** except `SinkCodec.test.ts` and `Source.test.ts:1055`. `@qadi/audit` and the examples do not call it.

**What this phase must leave clean for Phase 58.** [VERIFIED: ROADMAP Phase 58, `.planning/ROADMAP.md:545-560`] Phase 58 deletes `StoredDecisionRecord`/`StoredObligationRecord`/`stampRecord`/`stampRecordMatch` and makes the stored codec "the record codec plus one field", with the byte goldens unchanged. So Phase 57 should: (a) keep the stored decode behind one named decoder (`storedWire`) and one schema, so 58 replaces `stampRecord(record, environment)` and the schema without touching the refusal mapping; (b) leave the single `stampRecord` call as one isolated line; (c) not touch `StoredRecordJson`, `encodeStoredRecord*` or `DecisionRecord.ts`; (d) decide the message question now, so 58 inherits one refusal vocabulary and never re-pins messages. `[ASSUMED]` that 58 will keep `record` decoded from its own root; if 58 instead nests `SinkRecordWithJson` inside the envelope schema the `unwalked: ["record"]` line disappears, which is an edit local to `storedWire`.

## 5. Audit row, archive, hydration (D-09)

All three keep their `unwalked`, add `unknownKeys: "refuse"`, and change no answer (3.3-3.5). `refuse` is the identity projection and `prepare` still receives the raw input, so hydration's `checkVersion` is byte-for-byte unchanged.

[VERIFIED: sites] `AuditEntry.ts:117-121`, `AuditArchive.ts:258` (`untrustedDecoder(ArchiveEnvelope, { unwalked: ["entries"] }).decode`), `HydrationEngine.ts:193` (`untrustedDecoder(Envelope, { unwalked: ["entries"], prepare: checkVersion }).decode`). `HydrationEngine.ts:164` (`decodePolicy`) and `:205` (`decodeEntry`) pass no options and stay on the default.

**Is there a D-15-c argument for `ignore` on any of them? Reported, not decided (D-09):**
- *Hydration payload.* Strongest case. A server page embeds the payload and a rolling deploy gives a newer server and an older client bundle, GH-01's exact shape. The `version` key already covers format changes; an additive envelope key without a bump refuses the whole payload (`MalformedPayload`, every entry re-evaluated client-side, fail-closed). Against: ADR-QD-078 chose strict, and a drop only costs seeds.
- *Audit row.* Weak. It is the store's own format; a store that adds a column would be refused as `Malformed`. For a compliance record, silently dropping an unknown field is the data-loss shape ADR-QD-002 rules out, though the record inside already drops unknown keys (ADR-QD-153: "the entry drops the key").
- *Archive.* Weakest. It gates `planPurge` as evidence; `archiveVersion` is the format switch and strict is the safer reading of "internally consistent".

## Architecture Patterns

### System Architecture Diagram

```
untrusted input (parsed value, or text)
        |
        v
  decodeText only: JSON.parse ----fails----> NotJson
        |
        v
  isPlainObject(input)?
     no  ---------------------------------------------------+
     yes                                                    |
        |                                                   |
        v                                                   |
  unknownKeys policy (closed table, once per decoder)        |
     refuse: projected = input                               |
     ignore: entries = Object.entries(input)                 |
             keys = declared keys of the member the          |
                    discriminant selects (else first member) |
             projected = entries filtered to keys            |
        |<--------------------------------------------------+
        v
  walked = projected minus unwalked keys
        |
        v
  exceedsJsonDepth(walked, 256) ---yes---> TooDeep
        |no
        v
  prepare(projected)  (version check, ...) ---refuses---> seam's refusal
        |
        v
  strict decode (onExcessProperty: "error") ---fails---> Malformed
        |
        v
  decoded value --> seam maps refusal with Match.tagsExhaustive
                    (record wire: rebuild; stored: decodeSinkRecord(record) from its own root, stamp)
```

### Recommended Project Structure
```
packages/core/src/
├── UntrustedDecode.ts   # option, closed policy table, project/guard/prepare/decode
├── EnvelopeKeys.ts      # new, package-private leaf: declared keys from SchemaAST
├── DecodeDepthGuard.ts  # unchanged
└── JsonShape.ts         # unchanged
packages/core/test/
├── UntrustedDecode.test.ts   # + the refuse/ignore pair, derivation cases built inside test bodies
├── UntrustedDecode.tst.ts    # + the closed union pin, required-when-options pin
└── UntrustedSeams.test.ts    # + per-policy block, :195 flipped
```

### Pattern 1: closed table over `Record<Union, ...>`, never `=== "x"`
**What:** read the policy through a `Record<UnknownKeyPolicy, ...>` so a missing or mutated value throws at build time.
**When to use:** any closed literal union dispatched once per build.
**Example:** section 1.4 (`PROJECTION`). Precedent: `FieldLattice.ts`'s law table (AGENTS.md §5a, ARCH-12, ADR-QD-092).

### Anti-Patterns to Avoid
- **A key list in a seam.** `DECISION_KEYS` is the shape to delete; any `new Set([...])` of envelope keys at a seam reintroduces drift.
- **Reading a value off the raw input for the version or the tag.** Read from the projection (a fresh own-key object), never `input.version` on a possibly prototyped input.
- **Walking before projecting under `ignore`.** That is the D-01 defect itself.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A schema's declared keys | a per-seam `Set` of names | `SchemaAST.toEncoded(schema.ast)` walked with `Match` | follows `decodeTo`, `encodeKeys`, `mapFields`; cannot drift |
| Choosing a union member | an `if (tag === "Obligations")` | the member whose required literal slot equals the input's own value | derived, so a third tag needs no edit here |
| Recording stored-envelope shape | `isPlainObject` + `Object.hasOwn` + `ownValue` | `untrustedDecoder(StoredEnvelopeWire, { unknownKeys: "ignore", unwalked: ["record"] })` | one decoder, one guard, own-key semantics for free |
| Depth refusal | a second `exceedsJsonDepth` call | the decoder's guard | INV-QD-305; the budget refuses it elsewhere |

**Key insight:** the policy is a property of the *envelope decode*, not of a seam's prose. Once the option states it, the five hand-built variants (a `prepare` projection, a bypassed reader, three `unwalked`-only decoders that say nothing) collapse into one stated rule.

## Runtime State Inventory

Not a rename or migration phase. Omitted.

## Common Pitfalls

### Pitfall 1: the guard must walk the projection, not the input
**What goes wrong:** a decoder that projects only inside `prepare` (today's shape) keeps `TooDeep` for an ignored key.
**Why it happens:** `walked(input)` runs before `prepare`. D-01 is exactly this.
**How to avoid:** project first, guard `walked(projected)`, `prepare(projected)`.
**Warning signs:** `B2 60,000-deep unknown key` returns `TooDeep` after the change.

### Pitfall 2: D-01 propagates to the audit row and archive entries
**What goes wrong:** only `UntrustedSeams.test.ts:195` is moved; `AuditEntryDifferential.test.ts:117-130` then fails in the audit suite, and a plan that says "every answer except D-01's is unchanged" misses two seams.
**How to avoid:** the matrix and the RED commit cover the record wire, the audit row and an archive entry; both pins move in the source commit.

### Pitfall 3: a deep `environment` changes tag
**What goes wrong:** the stored envelope's `environment` is declared and walked, so a 266-deep `environment` is `TooDeep`, not `Malformed`.
**How to avoid:** Open Question 2, decided before planning, recorded in a BEH, one matrix row.

### Pitfall 4: `prepare` now receives a projection
**What goes wrong:** a `prepare` that reads a key the schema does not declare silently stops seeing it under `ignore`.
**How to avoid:** document `prepare`'s input as "the projection" and keep the record wire's version check reading only `version` (declared).

### Pitfall 5: static mutants hide the derivation
**What goes wrong:** every decoder in `SinkCodec.ts`, the audit files and `HydrationEngine.ts` is built at module scope, so `ignoreStatic: true` marks the derivation's and the stated-policy literals' mutants `Ignored`, and `EnvelopeKeys.ts` could look 100% with half its mutants unmeasured.
**How to avoid:** tests build decoders **inside `it` bodies** for each derivation case (struct, discriminated union, single-member union, `Suspend`, `decodeTo`, both throws), so those mutants are non-static; and the static-credit evidence run (`ignoreStatic: false`) proves the rest Killed (D-12, ADR-QD-167 Rev 1.1).

### Pitfall 6: an equivalent `""` mutant of every stated `"refuse"`
**What goes wrong:** with `if (policy === "ignore")` the string literal `"refuse"` at four seams, mutated to `""`, behaves identically, so each is a surviving equivalent mutant in four files whose score may not fall.
**How to avoid:** the closed `Record<UnknownKeyPolicy, ...>` dispatch of section 1.4: `""` throws at build.

### Pitfall 7: `Match.tag` on `SchemaAST.AST` needs the recursion annotated
**What goes wrong:** an inferred recursive const is a TS7022 error. **How to avoid:** `const membersOf: (ast: SchemaAST.AST) => ReadonlyArray<Member> = ...` (AGENTS.md §5a); verified to compile.

### Pitfall 8: `HydrationEngine.ts` is not in the react Stryker set
See section 7. Editing `stryker.react.mjs`'s `mutate` would put the file under the `break: 80` gate for every `pnpm check`; scope with `--mutate` on the command line instead.

### Pitfall 9: the spec still says "no option MAY loosen the strictness"
`BEH-QD-486` and `INV-QD-305` say no option loosens strictness. `ignore` leaves unknown top-level keys out, which is a stated loosening of one thing and not of the bound or the guard. Amend both: the guard still runs, and nothing under `ignore` reaches `Schema` that the guard did not count (INV-QD-360's property).

## 6. The gate

[VERIFIED: `scripts/check-house-style.mjs:635-663, 1103-1123, 1549-1608`]

**Counting rule.** For every source file under `packages/` that is not a test or bench file, each line is passed through `strip()` (line and block comments, string, regex and single-line template literals removed; lines starting `*` skipped), then matched with the global regex `/\bonExcessProperty\b|\bexceedsJsonDepth\b|\bSchema\.decode\w*|\bJSON\.parse\b/g`; a line with two tokens counts two. So the count is the number of those four tokens in code, per file.

- `[untrusted-decode]` fails when a budgeted file's count differs, or when any unbudgeted file has a token.
- `[untrusted-decode-names]` fails unless each name listed in `UNTRUSTED_DECODE_BUDGET_NAMES[file]` appears as `const NAME` or `function NAME` in that file (a rename guard, not a count).
- `[untrusted-decode-table]` fails unless AGENTS.md §7a's `| Location | Count | Why |` table has exactly the budget's files with the same counts.
- **`isPlainObject` and `Object.hasOwn` are not tokens.** The gate counts neither anywhere, so "reads that leave are counted wherever the gate counts them" (D-10) means: nothing changes in the budget for them. Only the `JSON.parse` leaves.

**Numbers after the change.**
- `SinkCodec.ts`: today 2 (`Schema.decodeTo` at line 507 and `JSON.parse` at 652). After: **1** (`Schema.decodeTo` in `SinkRecordWithJson`). `UNTRUSTED_DECODE_BUDGET_NAMES["packages/core/src/SinkCodec.ts"]` becomes `["SinkRecordWithJson"]` (`decodeStoredRecordString` no longer holds a token). The AGENTS.md §7a row and the budget comment are rewritten together; ADR-QD-143's `SinkCodec.ts` row amends the same way (D-14).
- `UntrustedDecode.ts`: stays **5** if the derivation adds no token: nothing in section 2.3 matches `Schema.decode*` (`SchemaAST.toEncoded` is not `Schema.decode`), and there is still one strict option, one `Schema.decodeUnknownResult`, one `JSON.parse`, one guard import and one guard call. `EnvelopeKeys.ts` has none, so it needs no row. Names stay `["untrustedDecoder"]`.
- Other files unchanged: `DecodeDepthGuard.ts` 1, `PortSpanEncode.ts` 2, `SimulationForm.ts` 1.

**Other rules.** The `no-type-assertion` regex is `/\bas\s+(?!const\b)(?:[A-Za-z_$]|[([{])/` and applies in tests too (`testScope: true`); `as const` is exempt, so `[ps.name, ps.type.literal] as const` is allowed. `no-switch` and `SWITCH_BUDGET` are untouched (the code uses `Match` and a closed table). `UNTRACED_BUDGET` and `ANY_BUDGET` are untouched (no `Effect.fnUntraced`, no `any`). `pnpm circular` (`madge --circular --extensions ts,tsx packages/*/src`): `EnvelopeKeys.ts` imports `effect` only, so it cannot create a cycle. The leaf sentence in `UntrustedDecode.ts`'s header and ADR-QD-143 changes if the new module is used (ADR-QD-037 counts type-only edges). A `throw new Error` is not a house-style rule violation (no such rule exists), with five precedents under `packages/*/src`.

## 7. Mutation (D-12)

[VERIFIED: `stryker.config.mjs`, `stryker.audit.mjs`, `stryker.react.mjs` read in full]

| Suite | Config | `mutate` | Report | Files of this phase |
|---|---|---|---|---|
| core | `stryker.config.mjs` | `packages/core/src/**/*.ts`, minus `index.ts` | `reports/mutation/mutation.json` | `SinkCodec.ts`, `UntrustedDecode.ts`, new `EnvelopeKeys.ts` |
| audit | `stryker.audit.mjs` | `packages/audit/src/**/*.ts`, minus `index.ts` | `reports/mutation-audit/mutation.json` | `AuditEntry.ts`, `AuditArchive.ts` |
| react | `stryker.react.mjs` | **only** `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts` | `reports/mutation-react/mutation.json` | `HydrationEngine.ts` is **not** in the set |

All three share `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `thresholds: { high: 90, low: 80, break: 80 }`, `timeoutMS: 20000`, `tsconfigFile: "tsconfig.stryker-disabled.json"`. Installed runner: `stryker --version` is 10.1.1.

**How 56 scoped a run.** `pnpm exec stryker run stryker.devtools.mjs --mutate '<comma-separated files>' < /dev/null`, run alone on the untouched tree before any test is written (`56-01-SUMMARY.md:73`, 1 minute 37 seconds, 21.74 tests per mutant; Phase 55's was 49 seconds). `--mutate` overrides the config's `mutate`, which is how Phase 30 measured `HydrationEngine.ts` through the react config: `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/HydrationEngine.ts,packages/react/src/HydrationEvent.ts,packages/react/src/DeveloperSignals.ts'` [CITED: `.planning/milestones/v1.3-phases/30-one-strict-decode-module/30-01-PLAN.md:133`]. So `HydrationEngine.ts` needs **no config edit**: use `--mutate`. Do not add it to `stryker.react.mjs`'s `mutate` in this phase: that would put a new file under the `break: 80` gate of every `pnpm check`, a change the phase does not need.

**Current scores.** No report at HEAD covers these files: `reports/mutation/mutation.json` is an unrelated scoped run (it contains neither `SinkCodec.ts` nor `UntrustedDecode.ts`), and `reports/` is committed only under `audit-*` dashboards. The last committed numbers are v1.3 Phase 30's `30-mutation-after.json`, **stale and only an orientation**: `UntrustedDecode.ts` 0.9355, `SinkCodec.ts` 0.9634, `HydrationEngine.ts` 0.9776, `AuditArchive.ts` 0.9811, `AuditEntry.ts` 0.9130 [CITED: `.planning/milestones/v1.3-phases/30-one-strict-decode-module/30-mutation-after.json`]. D-12's `57-mutation-base.json` must be re-measured on the phase base.

**Estimated runtime.** [ASSUMED] core scoped to `SinkCodec.ts` + `UntrustedDecode.ts`: 5-15 minutes (`SinkCodec.test.ts` is 2,500+ lines with property tests, so tests per mutant is high); audit scoped to two files: 2-5 minutes; react scoped to one file: 1-3 minutes. Run serially, never beside vitest (ADR-QD-098), in the background with stdin closed.

**One `57-mutation.mjs` for three reports (proposal).** Same modes as `56-mutation.mjs` (`base`, `after`, `evidence <report>`, `compare`), keyed by file and driven by a table instead of constants:

```js
const SUITES = {
  core:  { cfg: "stryker.config.mjs", rp: "reports/mutation/mutation.json",       dirs: ["packages/core/src",  "packages/core/test"],  files: [SC, UD, EK] },
  audit: { cfg: "stryker.audit.mjs",  rp: "reports/mutation-audit/mutation.json", dirs: ["packages/audit/src", "packages/audit/test"], files: [AE, AA] },
  react: { cfg: "stryker.react.mjs",  rp: "reports/mutation-react/mutation.json", dirs: ["packages/react/src", "packages/react/test"], files: [HE] },
};
// usage: node 57-mutation.mjs base <suite> | after <suite> | evidence <suite> <report> | compare [static json]
```

- `base <suite>` and `after <suite>` run 56's `reportOf` per suite (stale check against that suite's own `src`/`test` newest mtime, exact file set, report source equals the file on disk) and **merge** into one `57-mutation-base.json` / `57-mutation-after.json`. File keys are repository-relative and disjoint across suites, so a merge is lossless.
- `compare` checks all five base files against the after set. MOVED (declared before the change, as 56 did): `SinkCodec.ts` (loses `envelopeOf`, `ownValue`, `versionThenEnvelope`'s projection, the stored reader). The fall passes only when `SinkCodec.ts`'s survivor set is unchanged and `UntrustedDecode.ts` plus `EnvelopeKeys.ts` together detect at least the detected mutants that left. `AuditEntry.ts`, `AuditArchive.ts` and `HydrationEngine.ts` gain only a stated literal, so any fall there is closed with a test, not credited.
- `EnvelopeKeys.ts` is the new file (absent at base): zero `Survived`/`NoCoverage`, and every `Ignored` mutant (static) must be `Killed` in the `ignoreStatic: false` evidence run, exactly as 56 required of `GatesFeed.ts`. The evidence run needs three scratchpad configs (core, audit, react) or one config per suite; keep them outside the repository (`56-09-PLAN.md`: "evidence config and report stay outside the repository").

## Code Examples

### The seam declarations after the change

```ts
// SinkCodec.ts  (the record wire; envelopeOf, ownValue, DECISION_KEYS, OBLIGATIONS_KEYS deleted)
const sinkWire = untrustedDecoder(SinkRecordWithJson, { unknownKeys: "ignore", prepare: checkVersion });

// the stored envelope
const storedWire = untrustedDecoder(StoredEnvelopeWire, { unknownKeys: "ignore", unwalked: ["record"] });

// AuditEntry.ts
const decodeRow = untrustedDecoder(
  Schema.Struct({ record: Schema.Unknown, sequenceNumber: SequenceNumber }),
  { unknownKeys: "refuse", unwalked: ["record"] },
).decode;

// AuditArchive.ts
const decodeEnvelope = untrustedDecoder(ArchiveEnvelope, { unknownKeys: "refuse", unwalked: ["entries"] }).decode;

// HydrationEngine.ts
const decodeEnvelope = untrustedDecoder(Envelope, { unknownKeys: "refuse", unwalked: ["entries"], prepare: checkVersion }).decode;
```

### The record wire's `prepare`, reduced to the version check (reads the projection)

```ts
// Source: SinkCodec.ts:487-493 today, minus ownValue and envelopeOf
const checkVersion = (input: unknown): Result.Result<unknown, UnsupportedVersion> =>
  !isPlainObject(input) || isReadVersion(input["version"])
    ? Result.succeed(input)
    : Result.fail(DecodeRefusal.UnsupportedVersion({ version: input["version"], supported: WIRE_VERSIONS }));
```

`input` is the decoder's projection (a fresh object of own declared keys), so `input["version"]` cannot read an inherited value. A non-plain input still passes through and the strict decode calls it `Malformed` (measured: `5`, `null`, `[]` keep their text). [ASSUMED] If a reviewer wants the own-property read to be visible at the call, use `Object.hasOwn(input, "version") ? input["version"] : undefined`; both are covered by the `Object.create({ version: 2 })` row.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Projection written in the seam's `prepare` (`envelopeOf`) | Policy stated on the decoder, projection derived from the schema's encoded AST | this phase | `ownValue`, `envelopeOf`, `DECISION_KEYS`, `OBLIGATIONS_KEYS` deleted |
| Stored envelope outside the decoder | Stored envelope through `untrustedDecoder` | this phase | one fewer `JSON.parse` token in `SinkCodec.ts` |

**Deprecated/outdated:** none external. [VERIFIED: effect 4.1.2 still has no per-struct excess-property switch; `ParseOptions.onExcessProperty` is a decode-call option, `SchemaAST.ts:490, 539`.]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Export `UnknownKeyPolicy` (one overview row) rather than inline the literal union | 1.3 | Low: a naming choice within Claude's discretion |
| A2 | No gate enforces the leaf sentence "imports `effect`, `DecodeDepthGuard.ts` and `JsonShape.ts` only"; only `pnpm circular` structural check applies | 2.3, 6 | Low: if a gate exists the new module needs a row or the derivation moves inline |
| A3 | Mutation runtimes (core 5-15 min, audit 2-5, react 1-3) | 7 | Low: planning only |
| A4 | Phase 58 keeps decoding `record` from its own root | 4 | Low: the `unwalked: ["record"]` line is local to `storedWire` |
| A5 | Reading `input["version"]` from the projection is safe without `Object.hasOwn` | Code Examples | Low: covered by the inherited-version row |

## Open Questions

1. **The stored envelope's four reason messages (D-08).** The tag of every refusal is unchanged; the messages are not free. Routes:
   - **Route C (recommended, cleanest code): change the messages to the strict decode's own** and record that in a BEH. Cost: edit `SinkCodec.test.ts:2204-2243` and `Source.test.ts:1050-1058`; "a bare record" is no longer told apart from "environment missing" (the `unreleased` changeset `devtools-malformed-frame-is-a-decode-refusal.md:13` and `upgrading.md:631` say the message tells them apart, so both are edited). A sharper wording is possible without hand-reading: annotate the schema fields, `Schema.String.annotate({ message }).annotateKey({ messageMissingKey })` and the struct `annotate({ message })`. [VERIFIED: probe] the root message is printed exactly and a keyed message is printed with `\n  at ["key"]` appended, so each reason survives as the first line, but bare versus `{ record }` still merge into one.
   - **Route K: keep all four strings exactly.** Needs the parsed input, which `decodeText` does not hand back. It works only by a classifier in `prepare` (a shape check that returns a seam-owned refusal before the strict decode), which re-adds `isPlainObject` and own-key reads to `SinkCodec.ts` and contradicts D-08's "hand-rolled reader ... is deleted". Not recommended.
   - D-08 permits Route C ("allowed only if recorded in a BEH and checked by the matrix"), so the planner can take it without a new owner decision; the cost is the devtools-visible "bare record" wording. Decide before planning.
2. **A deep `environment` becomes `TooDeep` (tag change, D-08 says stop-and-report).** `environment` is a declared, walked key, like hydration's `subjectId` (its existing pin: "a `subjectId` value nested past the bound -> `PayloadTooDeep`"). Making it unwalked would need it typed `unknown`, i.e. a hand check back in the seam. Recommend accepting `TooDeep`, recording it in a BEH and adding a matrix row; no existing test pins the old `Malformed`. Needs the owner's nod because D-08 reserves tag changes.
3. **Required versus optional `unknownKeys`.** Required is a **Breaking** `@qadi/core` change (any caller passing `{ unwalked }` or `{ prepare }` alone stops compiling) and a Breaking changeset plus an `upgrading.md` entry (WX-07), but it removes the need for a gate and makes "no envelope seam leaves its policy implicit" a compile error. Optional is minor. The owner's standing instruction (cleanest design, breaking changes acceptable if recorded) favours required.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 | none needed |
| pnpm | commands | yes | 10.17.1 | none needed |
| vitest | tests, probes | yes | 5.1.0 | none needed |
| tsc | typecheck, probe compile | yes | 7.0.2 (`effect-tsgo`) | none needed |
| Stryker | WX-05 evidence | yes (not run) | 10.1.1 | none needed |

**Missing dependencies:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 with `@effect/vitest`; tstyche for `*.tst.ts` |
| Config file | `vitest.config.ts` (`projects: ["packages/*"]`), per-package `vitest.config.ts` |
| Quick run command | `pnpm exec vitest run --project core packages/core/test/UntrustedDecode.test.ts packages/core/test/UntrustedSeams.test.ts packages/core/test/SinkCodec.test.ts < /dev/null` |
| Full suite command | `pnpm check:pr < /dev/null` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KEYP-01 | deep unknown record key decodes (RED on base) | unit | `pnpm exec vitest run --project core packages/core/test/UntrustedSeams.test.ts < /dev/null` | yes, new row beside `:195` |
| KEYP-01 | the same through an audit row and an archive entry | unit | `pnpm exec vitest run --project audit packages/audit/test/UntrustedSeams.test.ts packages/audit/test/AuditEntryDifferential.test.ts < /dev/null` | yes, new rows; `:117-130` flips |
| KEYP-02 | refuse vs ignore pair; `ignore` with `unwalked` and `prepare`; derivation cases built inside test bodies; two construction throws | unit | `pnpm exec vitest run --project core packages/core/test/UntrustedDecode.test.ts < /dev/null` | yes, extend |
| KEYP-02 | `unknownKeys` is the closed union, required when options are passed | type | `pnpm test:tstyche` (`UntrustedDecode.tst.ts`) | yes, extend |
| KEYP-03 | stored envelope through the decoder; tags unchanged; deep `environment` row; messages per Open Question 1 | unit | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts packages/core/test/UntrustedSeams.test.ts < /dev/null` | yes |
| KEYP-04 | audit row, archive, hydration answers unchanged after stating `refuse` | unit | `--project audit` and `--project react packages/react/test/UntrustedSeams.test.ts` | yes (characterise on the base first) |
| KEYP-05 | per-policy matrix in core, audit, react | unit | as above | yes |
| WX-04 / D-10 | budget and §7a agree; no `as`, `switch` | gate | `node scripts/check-house-style.mjs` | yes |
| WX-05 | mutation not lower | harness | `node .planning/phases/QD-57-.../57-mutation.mjs compare <static json>` | Wave 0 |

### Sampling Rate
- **Per task commit:** the quick run command for the touched project, plus `node scripts/check-house-style.mjs` once the budget moves.
- **Per wave merge:** `pnpm check:pr < /dev/null`.
- **Phase gate:** full `pnpm check:pr` green, then the three scoped Stryker runs, one at a time, then `57-mutation.mjs compare`.

### Wave 0 Gaps
- [ ] `57-mutation.mjs` and `57-mutation-base.json` (measured on the untouched tree, first plan commit, never re-baselined)
- [ ] The per-policy matrix and the D-01 RED rows written and committed on the base (green except D-01)
- [ ] `packages/core/test/EnvelopeKeys` cases (or inside `UntrustedDecode.test.ts`) building decoders inside `it` bodies
- Framework install: none.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | - |
| V3 Session Management | no | - |
| V4 Access Control | no (this phase decodes records, it does not decide) | - |
| V5 Input Validation | yes | `untrustedDecoder`: depth guard, strict decode, closed refusal |
| V6 Cryptography | no | - |

### Known Threat Patterns for untrusted-JSON decoding

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stack exhaustion from deeply nested input | Denial of service | the depth guard runs over every **declared** walked key before `Schema` recurses (INV-QD-305). Under `ignore` an ignored key is never descended into, so it cannot exhaust the stack; `JSON.parse` has already run for text, and the 60,000-deep stored pin shows it does not throw |
| Silent drop of attacker-chosen top-level keys | Tampering | the ignored key never reaches `prepare` or the decode; the content stays strict, and the drop is documented (D-15-c, not logged because the codec is pure) |
| Prototype pollution through an own `__proto__` key | Tampering | projection builds a fresh object with `Object.fromEntries`, which defines `__proto__` as an own data property; the declared-key filter drops it anyway (measured: `__proto__` deep key, success, no throw) |
| Inherited-key confusion for the version or tag | Spoofing | own enumerable keys only (`Object.entries`); `Object.create({ version: 2 })` is `UnsupportedVersion`, as at HEAD (Phase 53's own-property rule, `Operand.ts:26-42`) |
| Discriminant forging to pick another member's key set | Spoofing | the member is chosen from the input's own `_tag`; an unknown or absent tag falls to the first member and the strict decode then refuses it `Malformed` |
| Cost of a very wide object | Denial of service | one `Object.entries` and one filter, linear in the key count, the same order as the guard's own walk |

## Pitfalls specific to cost and ordering

**Per-record cost on audit reads.** `decodeAuditEntry` decodes each row through `decodeSinkRecordWithJson`. Today the record path does one raw walk, one `ownValue`, one `Object.entries` + `fromEntries` (`envelopeOf`), one strict decode. After: one `Object.entries` + `fromEntries` (the projection), one walk over the *projection* (never more keys than the raw input), one strict decode. The declared-key sets and discriminant are computed once at build, so per-call additions are one `find` over one or two array elements. [ASSUMED by reasoning, not benchmarked] net cost is flat or slightly lower. The stored envelope gains one small `Struct` decode (`environment`, `record: Unknown`) in place of two `hasOwn` and a descriptor read, which is negligible beside the record decode. `packages/core/bench/UntrustedDecode.bench.ts` already measures guard cost (ADR-QD-143 "Cost"); add one `ignore` row if the planner wants a number, otherwise state the reasoning.

## Sources

### Primary (HIGH confidence)
- `packages/core/src/UntrustedDecode.ts` (read in full), `SinkCodec.ts` lines 1-654 (read), `SinkWire.ts` lines 1-200, `JsonShape.ts`, `packages/audit/src/AuditEntry.ts:80-180`, `AuditArchive.ts:200-330`, `packages/react/src/HydrationEngine.ts:130-260`
- `scripts/check-house-style.mjs:595-675, 930-1123, 1540-1608`
- `node_modules/effect/src/SchemaAST.ts` (`AST` union, `Objects`, `Union`, `Suspend`, `toEncoded`, `collectSentinels`), `SchemaIssue.ts:60-160`, `Schema.ts:818-879`
- Test files read: `packages/core/test/UntrustedSeams.test.ts`, `UntrustedDecode.test.ts`, `UntrustedDecode.tst.ts`, `packages/audit/test/UntrustedSeams.test.ts`, `packages/react/test/UntrustedSeams.test.ts`, `SinkCodec.test.ts:790-860, 2120-2290`, `Source.test.ts:1020-1080`, `AuditEntryDifferential.test.ts:100-150`
- `stryker.config.mjs`, `stryker.audit.mjs`, `stryker.react.mjs`, `56-mutation.mjs`, `.planning/ROADMAP.md` Phase 58
- Probes run and deleted this session: core record-wire and stored-record matrix, audit row and archive matrix, AST shapes, annotation messages, and a full prototype of the option; a `tsc` compile of the `Match` derivation

### Secondary (MEDIUM confidence)
- `.planning/milestones/v1.3-phases/30-one-strict-decode-module/30-mutation-after.json` (stale scores) and its plan (the `--mutate` scoping for `HydrationEngine.ts`)

### Tertiary (LOW confidence)
- Mutation runtime estimates (A3)

## 8. Records

**Free ids.** [VERIFIED: grep of `git ls-files` outside `.planning` for each id] `ADR-QD-170`, `CCR-QD-448`, `BEH-QD-621`..`625`, `INV-QD-359`, `INV-QD-360` and `ARCH-104` each matched **no file** in `spec/`, `packages/`, `.changeset/` or `AGENTS.md`. The highest used are ADR-QD-169 (`spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md`), CCR-QD-447, BEH-QD-620, INV-QD-358. Never run `node scripts/next-id.mjs`.

**Where the existing text lives.**
- ADR-QD-096 D-15-c: `spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md:133` (the decision row) and the **2026-11-12 amendment (ADR-QD-143, CCR-QD-421)** at lines 304-306, which currently says the projection "runs as the untrusted decoder's `prepare` step ... the version check, then `envelopeOf`" and that the stored envelope "stays outside the decoder". ADR-QD-170 adds a new amendment stating the projection is the decoder's option, the order is project, guard, version, decode, and the stored envelope now goes through the decoder. Its Change History is Rev 1.5 at line 13, so the next is 1.6.
- ADR-QD-143: `spec/decisions/143-untrusted-json-is-decoded-through-one-module.md`, Revision 1.3. Its budget table row for `SinkCodec.ts` (count 1 in the ADR text, count 2 in the gate: the ADR's row predates ADR-QD-153's `decodeTo`), its "Non-seams" bullet 1 (the stored envelope, deleted by this phase), and its seam table ("Where each seam now stands": the `decodeSinkRecord`, archive, audit row and hydration rows gain their stated policy).
- ADR-QD-153 (`spec/decisions/153-core-owns-describing-a-decode-refusal.md`): kept; line 85 and 103 describe the entry dropping an unknown envelope key.
- `spec/decisions/index.yaml` gets the ADR-QD-170 row; `spec/decisions/` currently ends at 169.

**Behaviours.** BEH-QD-486 (`spec/behaviors/08-serialization.md:94`, fixed-order and "no option loosens" requirements, plus the `ts` interface fence) is **amended**. Suggested placement of the new five:
- `08-serialization.md`: BEH-QD-621 (an envelope decoder states its unknown-key policy: `"refuse" | "ignore"`, required when options are passed), BEH-QD-622 (an ignored key is never walked, never reaches `prepare`, so it cannot refuse the frame), BEH-QD-623 (the declared keys are those of the member the input's own discriminant selects, derived from the schema's encoded side; unknown or absent discriminant falls to the first member; an underivable schema is refused when the decoder is built).
- `26-decision-stream.md` (the stored envelope, around line 397): BEH-QD-624 (the stored record is read by the decoder; the reasons per Open Question 1; a deep `environment` is `TooDeep`).
- `33-audit-pipeline.md` (BEH-QD-489 area) or `19-hydration.md` (BEH-QD-488): BEH-QD-625 (the audit row, archive and hydration payload state `refuse`, answers unchanged; a deep unknown key in an audit row's or archive entry's *record* is ignored).
- Amended in place: `25-inspection.md:1118-1124` and `26-decision-stream.md:397` (envelope tolerance prose), `33-audit-pipeline.md:224`.

**Invariants.** INV-QD-305 (`spec/invariants.md:3654`) and INV-QD-306 (`:3668`) live mid-file, but the file is numerically ordered and currently ends at INV-QD-358 (`:4147`, 4,157 lines). New INV-QD-359 and INV-QD-360 go **at the end**, after 358, and INV-QD-305/306's `Related` lines point to them; "beside" 305/306 would break the numeric order. INV-QD-305's sentence "cannot decode with options that loosen the strictness or the bound" needs the carve-out of Pitfall 9.

**Traceability and CCR.** `spec/traceability.md` (Rev 1.217; INV rows at `:152-153`, the ADR-QD-143 row at `:329`, test-file rows such as `:472`) gets rows for ADR-QD-170, BEH-QD-621..625, INV-QD-359/360 and the new or changed test files. The CCR row goes in the table in `spec/README.md` (CCR-QD-447 is the template, line 384): a date, the files with their new revisions, then the source and tests; any unused reserved id is named "Unused: ..." in that row. Revisions follow the pattern in CCR-QD-447's row: `spec/overview.md` Rev 1.123 now, `spec/README.md` Rev 1.250, `spec/invariants.md` Rev 1.154, `spec/traceability.md` Rev 1.217. `spec/overview.md:132-136` rows for `untrustedDecoder`, `UntrustedDecoder`/`UntrustedDecoderOptions` change text (`unknownKeys`, `unwalked`, `prepare`) and one row is added for `UnknownKeyPolicy`. The `spec-revise` and merge gates (`node scripts/spec-revise.mjs --check`, gate 13) validate these.

**Changesets and docs.** [VERIFIED: `.changeset/` holds one file per package change, e.g. `audit-entry-decoded-once.md` has YAML front matter `"@qadi/audit": patch`.] `@qadi/core`: one entry, **Breaking** if the option is required (Open Question 3) and covering D-01's widening in plain words ("a record, audit row or archive entry with a deep unknown envelope key now decodes"). `@qadi/audit`: the audit row and archive entries now accept a deep unknown key inside a record, which is observable, so an `@qadi/audit` patch note is warranted (CONTEXT D-15 says only "if their observable behaviour changes"; this does). `@qadi/react`: none (hydration unchanged). `apps/website/src/content/docs/docs/reference/upgrading.md` has the unreleased 0.13 sections (`## 0.13: ...` at lines 619, 664, 693, 716, 742, 773, 794, 829, 872, 899); add one `## 0.13: ...` section. No website page or README describes the record envelope's tolerance (grep of `apps/website/src/content`, `packages/*/README.md`, `README.md` found none beyond the 0.12 `untrustedDecoder` section at line 395, whose example passes no options and keeps compiling).

## Project Constraints (from CLAUDE.md)

Taken from `CLAUDE.md` -> `AGENTS.md`; every one binds the plan:
- **Imports:** `effect` submodule namespace imports only (`import * as SchemaAST from "effect/SchemaAST"`), relative imports carry `.ts`, `import type` for type-only (`verbatimModuleSyntax`).
- **Services/layers/errors:** not touched; the existing `Data.TaggedEnum` refusals stay (`UntrustedRefusal`'s arms are out of scope).
- **Functions:** no new `Effect.fnUntraced` (`UNTRACED_BUDGET`); the decoder is synchronous and `Result`-valued, so no `Effect.fn` is involved.
- **Dispatch:** `Match`, not `switch`, on `_tag` (`SWITCH_BUDGET`, §5a); a literal-keyed closed `Record` table is the blessed alternative for a literal union (`FieldLattice.ts`, ADR-QD-092). Annotate recursive dispatchers.
- **Forbidden:** `as` (except `as const`), `!`, `any`, `async`/`await`, ambient `console`/`process.env`/clocks, in tests too for `as`/`!`.
- **§7a:** `UNTRUSTED_DECODE_BUDGET` and the §7a table move together in one commit, in both directions.
- **§9/§15:** a new non-barrel module is package-private; `spec/overview.md` must name every export (gate 13), and a changed `UnknownKeyPolicy` export is a row.
- **§10:** `@effect/vitest`; core at 95% coverage, others 90%; every behaviour in `spec/behaviors/` has tests.
- **§11:** `spec/` is normative; changing public behaviour updates the BEH, INV and traceability in the same change; `typescript` fences in `spec/behaviors/*.md` are compiled, `ts` fences are not.
- **§16:** nothing released; `pnpm publish` only, never by hand here.
- **Doc-comment shape:** one-line summary first, the why after.
- **Memory (owner preferences):** closed unions over widening (the policy is a full closed union, never `old | "New"`); `Record<string, unknown>` is not an implementation shortcut (the derivation uses typed `ReadonlySet<PropertyKey>` and `ReadonlyMap<PropertyKey, unknown>`); cleanest design beats smallest diff, breaking changes recorded; never run `next-id.mjs`; do not run Stryker in research.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No new dependency; effect 4.1.2 read from source.
- Architecture: HIGH. Prototype of the full design reproduced every HEAD answer except the rows D-01 flips, and the AST derivation compiled and ran against the real `SinkRecordJson`.
- Pitfalls: HIGH for 1-4 and 6-9 (measured or read in source); MEDIUM for 5 (depends on Stryker's static classification, established by ADR-QD-076 and the 56 harness).
- Open Question 1: MEDIUM. The routes are verified; the choice is a product and wording decision.

**Research date:** 2026-11-18
**Valid until:** 2026-12-18 for the repository facts (they change with each phase merge); effect 4.1.2 internals until the dev catalog (`latest` dist-tag, pinned by `pnpm-lock.yaml`) moves.
