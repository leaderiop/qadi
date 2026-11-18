# Phase 57: untrustedDecoder states the envelope's unknown-key policy - Context

**Gathered:** 2026-11-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase gives `@qadi/core`'s `untrustedDecoder` (`UntrustedDecode.ts`) one stated option for what an envelope does with an unknown top-level key. There are two values:
- **refuse:** the key is `Malformed`, as ADR-QD-002's strict stance has it.
- **ignore without walking:** the key is never read, guarded or decoded, as ADR-QD-096 D-15-c has it.

The five modules that wrap an envelope state their policy through that option, and no hand-built tolerance or partial walk is left in any of them:
- `SinkCodec.ts`'s record wire and stored record;
- `@qadi/audit`'s `AuditEntry.ts` (row) and `AuditArchive.ts` (archive);
- `@qadi/react`'s `HydrationEngine.ts` (payload).

`SinkCodec.ts`'s `ownValue`, `envelopeOf` and the hand-rolled stored reader are deleted.

Out of scope:
- any change to what is strict inside a payload (`Policy`, `Trace`, decision, error, outcome);
- the depth bound `MAX_DECODE_DEPTH`;
- `UntrustedRefusal`'s arms;
- the version rules of ADR-QD-096 D-15-b and D-15-d;
- the non-envelope decoders (`Policy.ts`, `PortWireEncode.ts`, `PortRemote.ts`) beyond what the option's default makes them say;
- Phase 58's in-memory stored record.

</domain>

<decisions>
## Implementation Decisions

### KEYP-01: a record envelope's deep unknown key is ignored, not `TooDeep` (2026-11-18)

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

### The option (KEYP-02)

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

### The seams (KEYP-03, KEYP-04)

- **D-07:** Record wire: `untrustedDecoder(SinkRecordWithJson, { <policy>: ignore, prepare: <version check> })`. `envelopeOf` is deleted, and the `prepare` keeps only the version check.
- **D-08:** Stored record: decoded through `untrustedDecoder` with `ignore` and `record` unwalked (`record` is typed `unknown` and handed to the guarded record decode from its own root). The hand-rolled reader (`isPlainObject`, `Object.hasOwn`, `ownValue`) is deleted, and `decodeStoredRecordString` goes through `decodeText`.
  - Each refusal's **tag** is unchanged: not an object is `Malformed`, a missing `record` is `Malformed`, and so on.
  - A changed refusal **message** is allowed only if it is recorded in a BEH and checked by the matrix.
  - If research finds a seam's tag would change, that is a stop-and-report, not an improvisation.
- **D-09:** Audit row (`AuditEntry.ts`), archive (`AuditArchive.ts`) and hydration payload (`HydrationEngine.ts`) state `refuse` explicitly, plus their existing `unwalked`. Their answers are unchanged. A seam that research shows should be `ignore` by the same D-15-c argument is reported, not changed silently. Any such change would be its own owner decision.
- **D-10:** `UNTRUSTED_DECODE_BUDGET` and AGENTS.md §7a's table move together in one commit, checked in both directions. `SinkCodec.ts`'s row loses `decodeStoredRecordString`'s `JSON.parse`. `isPlainObject` and `Object.hasOwn` reads that leave are counted wherever the gate counts them.

### Tests and mutation

- **D-11 (KEYP-05, WX-06):** The `UntrustedSeams` matrices (core, audit, react) gain a per-policy block.
  - **Inputs:** a shallow unknown top-level key, a deep unknown top-level key, an excess key inside the payload, and non-object input (`5`, `null`, `[]`).
  - **Seams:** every one of the five, plus a direct `untrustedDecoder` pair (refuse vs ignore) in `UntrustedDecode.test.ts`.
  - **Order:** the matrix is characterised on the phase base first. It is green on the base except D-01's RED case, and every answer except D-01's is identical after.
- **D-12 (WX-05):** This follows Phase 55's D-15 and Phase 56's D-11: Phase 53's D-14 rule with ADR-QD-167 Rev 1.1's static credit.
  - `57-mutation-base.json` is recorded on the phase base for `SinkCodec.ts`, `UntrustedDecode.ts`, `AuditEntry.ts`, `AuditArchive.ts` and `HydrationEngine.ts`.
  - A fall passes only as killed mutants that moved into `UntrustedDecode.ts`, where they are still killed.
  - Three Stryker configs are involved (core, audit, react). Run them one at a time and never beside vitest.
- **D-13:** Plan order, RED first: mutation base, then the per-policy matrix and the D-01 RED test, then the option, then the record wire and stored record, then the audit and hydration seams stating their policy, then budget and §7a, then records.

### Records

- **D-14 (WX-02):** ADR-QD-170 records D-01, quoting the owner's instruction, and gives its reasons and the rejected alternative.
  - It amends ADR-QD-096 D-15-c's mechanism: the projection is the decoder's option, not a `prepare`. The policy and order are kept.
  - It amends ADR-QD-143's `SinkCodec.ts` budget row.
  - It keeps ADR-QD-143 and ADR-QD-153.
  - Also INV-QD-359 (one option states an envelope's unknown-key policy, and no seam hand-builds it) and INV-QD-360 (an ignored key is never walked, so it cannot refuse the frame). Also CCR-QD-448 and BEH-QD-621..625. Any unused reservation is named "Unused: …" in the CCR row.
- **D-15 (WX-03, WX-07):**
  - `spec/overview.md` follows gate 13 for any changed export, for example a new exported policy type.
  - Changesets: `@qadi/core` minor (the option, plus D-01's widening). `@qadi/audit` and `@qadi/react` get one only if their observable behaviour or API changes; stating `refuse` explicitly changes neither.
  - Nothing is released.

### Settled after research (orchestrator under the owner's Phase 57 instruction, 2026-11-18)

Research (57-RESEARCH.md, "Open Questions") left three items needing a decision and one report. Each is settled here by the owner's instruction for this phase: take the cleanest design, never the smallest diff.

- **D-16 (Open Question 3): the policy is required on every decoder.** `untrustedDecoder(schema, options)` takes a required options object whose `unknownKeys: UnknownKeyPolicy` (`"refuse" | "ignore"`, exported) is required. This holds at every call site: the five envelope seams, `Policy.ts`, `PortWireEncode.ts`, `PortRemote.ts`, hydration's `decodePolicy` and `decodeEntry`, the bench and the tests.
  - **Why not research's "required only when an options object is passed":** that makes one field required or defaulted depending on whether its siblings are present, which is a hidden default with an odd shape. Stating it everywhere means every untrusted seam shows its rule where it is built, and D-05 needs no gate.
  - The policy is read through a closed `Record<UnknownKeyPolicy, …>` table (research Pitfall 6), never `=== "ignore"`.
  - This is **Breaking** for `@qadi/core` (a required option on a public function). It is recorded in the changeset and in `upgrading.md`'s 0.13 section, with the one-line migration `{ unknownKeys: "refuse" }`.
- **D-17 (Open Question 1): Route C.** The stored record's refusals take the strict decoder's own messages. No classifier is rebuilt in `prepare`, which would restore the hand-built reader D-08 deletes.
  - Every tag is unchanged. The changed messages are a deliberate behaviour change. They are recorded in a BEH, pinned RED first on the phase base (WX-06), and carried in the `@qadi/core` changeset.
  - The pins that move:
    - `packages/core/test/SinkCodec.test.ts` (~2204–2243) and `packages/devtools/test/model/Source.test.ts` (~1050–1058) move with their source commit, after the RED test.
    - The unreleased `.changeset/devtools-malformed-frame-is-a-decode-refusal.md` and `upgrading.md` (~631) are corrected so they stay true.
  - "A bare record" and "environment missing" become one message. This is accepted: both mean "the envelope is not `{ environment, record }`".
- **D-18 (Open Question 2): a deep `environment` is `TooDeep`.** `environment` is a declared, walked key. "The guard walks every declared key it does not leave unwalked" is the rule every other seam already follows, so `Malformed` was the hand-built reader's accident.
  - This supersedes D-08's stop-and-report for this one tag. It gets a matrix row, a RED test on the base, and a sentence in the stored-record BEH.
  - No other tag may change. Any further tag change found during execution is still a stop-and-report.
- **D-19 (mechanism, research §1.4):** under `ignore` the input is projected onto its declared keys before the guard. The projection is a shallow own-key copy that reads no value, so it cannot overflow and changes no declared key's answer.
  - The refusal precedence that ADR-QD-096 D-15-c fixes is kept for every declared key: `TooDeep`, then `UnsupportedVersion`, then `Malformed`.
  - ADR-QD-170 records that the projection now runs first, and that this is what makes D-01 true. It amends D-15-c's mechanism sentence and does not rewrite the decision.
  - `prepare` receives the projection. Under `refuse` the projection is the input, so hydration's `checkVersion` is unchanged.
- **D-20 (research Pitfall 2): D-01 reaches the audit row and archive.** They read the record through `decodeSinkRecordWithJson`, so a deep unknown key inside a stored audit row's record, or an archive entry's record, also goes from `TooDeep` to success.
  - This is the same decision, not a new one.
  - `packages/audit/test/AuditEntryDifferential.test.ts` (~117–130, the `deepExtra` half) moves with the source commit after a RED test, and the audit matrix gains the rows.
  - "Deep unknown key + version 3" goes from `TooDeep` to `UnsupportedVersion`. It is pinned the same way.
- **D-21 (research §2, Pitfall 7): the derivation is its own leaf.** The declared keys come from `SchemaAST.toEncoded(schema.ast)` through a hoisted `Match` over `Objects`, `Union` and `Suspend`. It lives in a new package-private, import-`effect`-only module (research proposes `EnvelopeKeys.ts`), out of the barrel.
  - A union member is selected by the input's own `_tag`. An unknown or absent `_tag` takes the first member, which is today's decision set.
  - A schema whose keys cannot be derived under `ignore` throws when the decoder is built.
  - The leaf-rule sentences in `UntrustedDecode.ts` and ADR-QD-143 name the new module.
- **D-22 (research Pitfall 8): `HydrationEngine.ts` is measured with `--mutate` on the command line.** `stryker.react.mjs` stays unedited, as Phase 30 did.
- **D-09 report (research §5): hydration has a D-15-c case for `ignore`.** A rolling deploy pairs a newer server's additive payload metadata with an older client bundle. It is **not** changed in this phase: criterion 4 holds every answer except D-01's, and ADR-QD-078 chose strict. It is raised with the owner as a follow-up (see Deferred). The audit row and archive stay `refuse`.

### Claude's Discretion
- The option's name, spelling and type (literal union or tagged enum), and whether `unwalked` joins it.
- How the declared key set is derived from `SchemaAST`, within D-03's bar.
- Whether non-envelope decoders state the policy, and whether a gate enforces it at envelope seams (D-05).
- BEH placement across behaviour docs.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UntrustedDecode.ts`:
  - `untrustedDecoder(schema, { unwalked, prepare })`;
  - `walked()` already filters top-level keys before `exceedsJsonDepth`, so the `ignore` policy extends the same filter;
  - `UnwalkedKey<A>`, `FreeRefusalTag`.
- `JsonShape.ts`: `isPlainObject`.
- `SinkCodec.ts`: `DECISION_KEYS`/`OBLIGATIONS_KEYS`, which D-15-c says are derived from the schema; check how and reuse the derivation.

### Established Patterns
- Guard, then `prepare`, then the strict decode, in a fixed order (ADR-QD-143). Refusals are a closed `UntrustedRefusal`, and each seam maps them with `Match.tagsExhaustive`.
- §7a's `UNTRUSTED_DECODE_BUDGET` counts `onExcessProperty`, `exceedsJsonDepth`, `Schema.decode*` and `JSON.parse` tokens per file, in both directions.

### Integration Points
- `SinkCodec.ts`:
  - 420 `ownValue`;
  - 434 `envelopeOf`;
  - 487 `versionThenEnvelope`;
  - 524 `sinkWire`;
  - 634–653 `decodeStoredRecord`/`decodeStoredRecordString`.
- `packages/audit/src/AuditEntry.ts:117` (`unwalked: ["record"]`) and `AuditArchive.ts:258` (`unwalked: ["entries"]`).
- `packages/react/src/HydrationEngine.ts:193` (`unwalked: ["entries"], prepare: checkVersion`).
- Tests:
  - `packages/core/test/UntrustedSeams.test.ts` (`:191`, `:195` and `:243–257`);
  - `packages/audit/test/UntrustedSeams.test.ts`;
  - `packages/react/test/UntrustedSeams.test.ts`;
  - `packages/core/test/UntrustedDecode.test.ts`.

</code_context>

<specifics>
## Specific Ideas

- The owner's instruction for this phase (2026-11-18) is quoted under D-01. It also governs every "at Claude's discretion" item here: take the cleanest design, never the smallest diff. Ponytail governs how a design is written, not which one.

</specifics>

<deferred>
## Deferred Ideas

- Phase 56's review Info items IN-03..IN-06 (devtools `JoinInput` shape, the poll's dead `questions` field, long lines, the `intervalMillis` doc) wait for the next change to those files.
- **For the owner:** should the hydration payload be `ignore`, by D-15-c's rolling-deploy argument (research §5)? It is not changed here (D-09). The audit row and the archive stay strict on research's reading.

</deferred>
