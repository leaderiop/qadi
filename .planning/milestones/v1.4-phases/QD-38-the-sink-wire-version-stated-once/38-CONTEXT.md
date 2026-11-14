# Phase 38: The sink wire version stated once - Context

**Gathered:** 2026-11-14
**Status:** Ready for planning

<domain>
## Phase Boundary

The sink record wire's version number is written once: an exported `WIRE_VERSION` in `packages/core/src/SinkWire.ts`.
The schema literals, the encoder, the decoder's check, `WIRE_VERSIONS` and `WireVersion` all derive from it, so
retyping it cannot leave half the codec behind. The wire bytes do not change. The decoder still refuses every other
version as `UnsupportedVersion({ version, supported })`. Records: ARCH-85, ADR-QD-151 (amends ADR-QD-096),
CCR-QD-429, the INV-QD-096 amendment, a `spec/overview.md` row, and a `@qadi/core` minor changeset. Requirements:
WIRE-01 to WIRE-05, plus the WX cross-cutting rows.

Read first: `.planning/phases/_SHARED-CONTEXT.md`, `.planning/phases/_WAVE9-CONTEXT.md` (Phase 38 evidence),
`.planning/research/SUMMARY.md` (R5, the Phase 38 row of the verification table).

</domain>

<decisions>
## Implementation Decisions

### Constant shape (accepted 2026-11-14)
- **D-01:** `export const WIRE_VERSION = 2 as const;` in `SinkWire.ts`. It is exported, so it is public: `SinkWire.ts`
  is `export *`'d from the core barrel, and the codec cannot be the owner because `DecodeRefusal.supported` lives in
  this leaf, which cannot import `SinkCodec.ts` (ADR-QD-037). A bare `= 2` is refused, because it widens to `number`
  in the encoder spread.
- **D-02:** The rest derive from it: `export const WIRE_VERSIONS = [WIRE_VERSION] as const;` (the type narrows from
  `ReadonlyArray<2>` to `readonly [2]`) and `export type WireVersion = (typeof WIRE_VERSIONS)[number];`. No cast.
- **D-03:** The codec reads them:
  - `version: Schema.Literal(WIRE_VERSION)` in both `decisionV2Fields` and `obligationsV2Fields`.
  - The encoder's `project` writes `version: WIRE_VERSION` in the same place as today's `2 as const`, after the
    record spread, so key order and bytes are unchanged.
  - The decoder's `versionThenEnvelope` checks membership in `WIRE_VERSIONS` (`.some((v) => v === version)` or the
    equivalent), not `=== WIRE_VERSION`. The read set and the write version stay separate ideas, and the docs say so.
  - `SinkCodec.ts`'s private `const WIRE_VERSION: WireVersion = 2` is deleted.
- **D-04:** After the change, a scoped grep over `packages/core/src/Sink*.ts` for `Literal(2)`, `version: 2` (code,
  not doc prose) and `= 2` matches only the single constant.

### Proof (accepted 2026-11-14)
- **D-05:** Byte golden first: the first plan commits, on the phase base and before any source edit, a golden of the
  exact `JSON.stringify` text of one encoded decision record and one encoded obligation record. Key order is
  included and `2` is hard-coded in the expected text. It is green on the base and stays green after the change.
- **D-06:** Compile-time pin: a tstyche file (`packages/core/test/SinkWire.tst.ts`, or the existing core tstyche file
  that fits better) pins `typeof WIRE_VERSION` as `2`, `WireVersion` as `2`, `typeof WIRE_VERSIONS` as `readonly [2]`,
  and both schema structs' `version` Type as `2`. The pin is what makes WIRE-02 true: retyping the version without
  editing anything else fails the type-test gate. A throwaway retype to `3` is run twice, recorded in the SUMMARYs
  and reverted each time:
  - On the base, in the first plan, to show the harm: what compiles and what the encoder and decoder then do.
  - After the conversion, to show the fix: the codec needs no edit, because it derives, and the tstyche pin and the
    byte golden both go red.
  Together they prove that retyping is one deliberate edit, not half the codec (ROADMAP plan shape: golden and
  experiment first, because `ignoreStatic` hides module-scope constants from mutation).
- **D-07:** Refusal rows stay pinned, adding any that are missing: an object with `version` absent, `1`, `3` or the
  string `"2"` is `UnsupportedVersion({ version, supported: [2] })`, with `version` `undefined` when absent
  (INV-QD-098). A version-2 record still decodes.
- **D-08:** Mutation: `SinkCodec.ts` and `SinkWire.ts` are baselined at the phase base with the exact invocation the
  close will use, committed alone and first (`38-mutation-base.json`). The close compares per file. A drop is fixed
  with a test and never re-baselined (WX-05).

### Records (accepted 2026-11-14)
- **D-09:** ADR-QD-151 amends ADR-QD-096: the version is stated once, in `SinkWire.ts`, and the schema, the encoder,
  the decoder's read set and the two exports derive from it. It states the decoder-read set (`WIRE_VERSIONS`) as
  distinct from the encoder-write version (`WIRE_VERSION`). CCR-QD-429 gets a row. INV-QD-096 is amended in place,
  with no new invariant. No new BEH or INV numbers; the CCR row names the unused reserved ones. Use only the reserved
  numbers (ADR 150–155, CCR 428–433, BEH 521–550, INV 319–330) and confirm each is free by grep. Never run
  `node scripts/next-id.mjs`. The CCR README row lands in the same plan as its first citation, then
  `spec-revise --date`, then `--check`.
- **D-10:** A `spec/overview.md` gate-13 row adds `WIRE_VERSION` next to `WireVersion`/`WIRE_VERSIONS` (around
  `:456` and `:515-521`). A `@qadi/core` **minor** changeset covers the new export. It records the `WIRE_VERSIONS`
  type narrowing to `readonly [2]` as source-compatible, not Breaking.
- **D-11:** Out of scope and untouched: hydration's payload `version: 2`, audit's bundle version, and doc prose such
  as "version 2, and only it". Goldens and refusal tests keep `2` hard-coded.

### Claude's Discretion
- Exact placement and wording of the doc comments on the three exports, and whether the tstyche pin goes in a new
  file or an existing one.
- The fixture records used for the byte golden. Prefer existing `SinkCodec.test.ts` fixtures.

</decisions>

<code_context>
## Existing Code Insights

### The sites restating the version today
- `SinkWire.ts:48` `export type WireVersion = 2`; `:51` `WIRE_VERSIONS: ReadonlyArray<WireVersion> = [2]`;
  `:83` `DecodeRefusal.UnsupportedVersion.supported: ReadonlyArray<WireVersion>`.
- `SinkCodec.ts:146, :154` `version: Schema.Literal(2)`; `:224, :226` `version: 2 as const` in `project`;
  `:453` `const WIRE_VERSION: WireVersion = 2`; `:470-472` the decoder's `version === WIRE_VERSION` check and its
  refusal.
- The harm: retyping `WireVersion` to `3` compiles, the encoder keeps writing `2`, and the decoder refuses its own
  output.

### Tests
- `packages/core/test/SinkCodec.test.ts` (refusals near `:83`, `:513-580`) and `SinkCodecAgreement.test.ts`.
- Core tstyche files use the `*.tst.ts` suffix (`DecisionSink.tst.ts`, `DecisionWire.test.ts` sits beside them).

### Spec
- ADR-QD-095 (`spec/decisions/095-sinkcodec-owns-both-directions.md`) and ADR-QD-096
  (`spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md`); INV-QD-096 in `spec/invariants.md`.
- `spec/overview.md:349` (`decodeSinkRecord` row), `:456`, `:515-521` (the wire's own words).

</code_context>

<specifics>
## Specific Ideas

- The user accepted every recommended answer in all three areas.
- RED-first does not apply to a pure relocation. The byte golden and the refusal rows are the green-on-base
  characterisations, and the throwaway retype is the negative control.

</specifics>

<deferred>
## Deferred Ideas

None. Hydration's payload version and audit's bundle version are out of scope per REQUIREMENTS.md.

</deferred>
