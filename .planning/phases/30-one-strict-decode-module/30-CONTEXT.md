# Phase 30: One strict-decode module - Context

**Gathered:** 2026-11-12
**Status:** Ready for planning

**Read first:** `.planning/phases/_SHARED-CONTEXT.md` (house rules, user preferences, mutation procedure), then
`.planning/phases/_WAVE8-CONTEXT.md` (base `aab87576`, numbering, review evidence), then
`.planning/research/ARCHITECTURE.md` §"Phase 30" and `.planning/research/FEATURES.md` §"Phase 30" (seam table with file:line,
gaps G1–G3). Where this file and the research disagree, **this file wins**: the decisions below apply the user's standing
direction (cleanest design, breaking changes allowed), and several of them reverse a research recommendation that was
made only to keep compatibility.

<domain>
## Phase Boundary

A new untrusted-JSON seam gets the depth guard by default. The decode order (parse for text, depth guard, an optional
seam-supplied preparation step, strict decode) is stated once, in a new public `@qadi/core` leaf
`packages/core/src/UntrustedDecode.ts`, which returns a closed refusal. Every untrusted JSON seam in `packages/*/src`
decodes through it and keeps only a total mapping from that refusal into its own error: `Policy.fromJson`/`fromJsonValue`,
`SinkCodec`'s `decodeSinkRecord` (and the string/stored variants through it), the two `PortWireEncode` decoders, `PortRemote`'s
reply decode, `@qadi/react`'s `HydrationEngine` (payload, entry, policy), and `@qadi/audit`'s `AuditArchive` envelope and
`AuditEntry` row decoders. Requirements: DEC-01..DEC-08 and WX-01..WX-07.

Out of this phase: the encode half (`wireHazard`, `toJson`) beyond keeping its depth count equal to the guard's (INV-QD-096);
`recordJsonOf` (`AuditEntry.ts:163`), which is deliberately lenient (ADR-QD-096 D-15-c) and stays outside the module; the
non-seams the research checked (`PortSpanEncode.ts`, `SimulationForm.ts`'s typed-text parse).

</domain>

<decisions>
## Implementation Decisions

### Module interface (UntrustedDecode.ts)
- **D-01 Shape:** `untrustedDecoder(schema, options?)` returns `{ decode: (input: unknown) => Result<A, …>, decodeText: (text: string) => Result<A, …> }`. The core is a synchronous `Result`; seams adapt it in one line (`Policy` → `Effect.fromResult`, hydration → `Option`). `decode`/`decodeText` are the **only** way in, so no caller can skip the guard. Decoders are built once at module scope, as every seam does today. There is **no** separate exported guard step and no `Effect`-returning core.
- **D-02 One depth limit:** there is **no** `maxDepth` option. The limit is `MAX_DECODE_DEPTH` (256), tuned together with the strict options (the 4× calibration comment at `Policy.ts:947-978`, which records that `onExcessProperty: "error"` forced the drop from 8×, moves with it into the leaf).
- **D-03 Refusal:** `UntrustedRefusal = NotJson | TooDeep | Malformed`, a `Data.taggedEnum` (like `DecodeRefusal`/`EncodeRefusal`). `Malformed` carries the underlying `Schema.SchemaError` (plus its message), because `ExplorerSession.formatDecodeFailure` (`ExplorerSession.ts:123-139`) prints the issue tree and `Policy.fromJson`'s public channel is `SchemaError`. Seams map it with `Match.tagsExhaustive`, so a new arm is a compile error at every seam. `NotJson` applies only to `decodeText`.
- **D-04 Partial walks and preparation:** `unwalked: ReadonlyArray<string>` names top-level keys whose schema slot is `Schema.Unknown` and which a second decoder guards from its own root (hydration's `entries`, the audit envelope's `entries`, the audit row's `record`). It replaces hydration's hand-built `{ ...payload, entries: [] }` (`HydrationEngine.ts:440`). Each `unwalked` key is pinned by a test that its slot really is `Schema.Unknown`. `prepare: (input: unknown) => Result<unknown, R>` runs after the guard and before the strict decode; `SinkCodec` uses it for its version check (`UnsupportedVersion`) and `envelopeOf` projection, which keeps the pinned order guard → version → project → decode (`SinkCodec.test.ts:1304`). The order is fixed: guard, prepare, decode.

### How each seam reports a refusal (DEC-03, DEC-04)
- **D-05 `PolicyFromJson` is removed** from the public surface (`Policy.ts:916`, `spec/overview.md`), **Breaking**. `Policy.fromJson` (text) and `Policy.fromJsonValue` (value) are the only policy decoders, both through the module.
- **D-06 `Policy.fromJson`'s errors:** too deep → `PolicyDecodeTooDeep` (unchanged, `maxDepth` 256, `ACL017`); malformed → `Schema.SchemaError` (issue tree kept); not JSON → a **new** `PolicyNotJson` `Data.TaggedError` (added to `QadiError` and `ERROR_CODES` with the next free code), so non-JSON text no longer surfaces as a schema error. The 60,000-deep malformed-text pin (`Policy.test.ts:565-583`) is restated for the new kinds, not deleted. `ExplorerSession`'s sentence table gains the `PolicyNotJson` case. Breaking for `@qadi/core`.
- **D-07 Seams whose errors are a closed union gain a too-deep member**, written out as the full closed union (never `old | "New"`), recorded as Breaking: `@qadi/audit`'s `ArchiveRefusal` gains `TooDeep` (envelope-level; per-entry attribution stays `EntryNotDecodable{ index, refusal }`); `@qadi/react`'s `PayloadRefusalReason` gains `PayloadTooDeep` (payload-level; entry-level stays `EntryTooDeep`). The hydration reason is also a metric label, so the tagged counter's series and `spec/behaviors/25-inspection.md`'s metric table follow (METRIC_ID_LITERAL rules apply), and `DeveloperSignals.ts`'s wording follows. The audit row decoder's too-deep maps to the existing `DecodeRefusal.TooDeep` (no widening needed there).
- **D-08 Seams whose errors are a message** (the port-wire `decodeQuestion`/`decodeAnswer` strings, `RemotePortFailure.Undecodable({ message })`): the message is rendered from the typed refusal through one table, so the too-deep sentence is written once. Existing sentences stay byte-identical ("the question nests deeper than the decode bound", etc.); `RemotePortFailure`'s shape does not change.

### Public surface and enforcement (DEC-05, DEC-08)
- **D-09 `UNTRUSTED_DECODE_OPTIONS` is private to the leaf** and removed from the `@qadi/core` barrel (**Breaking**). Its in-repo users (`AuditArchive.ts`, `AuditEntry.ts`, `HydrationEngine.ts`, `SinkCodec.ts`, `PortWireEncode.ts`, `PortRemote.ts`, `Policy.ts`) move onto the decoder; the test-scope users (`DecisionWire.test.ts:8`, `Policy.test.ts:380`, `features/features/hydration-counts/hydration-counts.steps.test.ts`, the `v4-api-smoke.test.ts:166` comment) are rewritten to use the decoder or dropped.
- **D-10 `exceedsJsonDepth` leaves the barrel** (**Breaking**); `DecodeDepthGuard.ts` stays as the module's primitive and is also used by core's encode side (`JsonHazard.ts`'s `wireHazard`). BEH-QD-259 (which today requires it barrel-reachable "because `@qadi/react` has no reason to reach into core's module layout") is restated: `@qadi/react` now reaches the whole recipe through the decoder instead.
- **D-11 `MAX_DECODE_DEPTH` stays public**, declared in the leaf (BEH-QD-059 names the bound as normative and `PolicyDecodeTooDeep` reports it). `Policy.ts` no longer declares or re-exports it (ADR-QD-116 precedent: a moved name is not re-exported from its old module). Its in-core importers (`SinkCodec`, `FieldPath`, `Explanation`, `PortWireEncode`, `TreeFold`, `RelationshipResolver`, `Simplify`, react's `HydrationEngine`) import it from the leaf; `PortWireEncode.ts` loses its edge to `Policy.ts`. A test pins `MAX_DECODE_DEPTH === DEFAULT_MAX_DEPTH * 4`.
- **D-12 House-style rule `[untrusted-decode]`** in `scripts/check-house-style.mjs`: in `packages/*/src`, the literal `onExcessProperty` and calls of `exceedsJsonDepth` may appear only in `UntrustedDecode.ts` and an exact allowlist (the encode side, e.g. `JsonHazard.ts`, plus `DecodeDepthGuard.ts` itself), each with its exact count, checked in both directions like the other budgets; a new budget name and its AGENTS.md section (with the table) land in the same task. Test scope is exempt.

### Proof and records
- **D-13 Characterisation first:** one refusal-precedence table per seam (rows as applicable: not JSON, too deep, deep and wrong version, wrong version, extra envelope key, excess key, valid), committed **green on the phase base** before any seam moves. The rows whose kind changes by D-06/D-07 (policy not-JSON, audit envelope too-deep, hydration payload too-deep) flip in the same commit as the change, and that commit names them.
- **D-14 Property test** over the module: the refusal kind is a function of the input; it refuses `TooDeep` exactly when `exceedsJsonDepth` does over the walked part (unwalked slots excluded); it never throws; it runs on both sides of the limit. Plus a deeper-than-bound test at every guarded seam, closing gaps G1 (port wire, remote reply), G2 (hydration envelope) and G3 (the removed `PolicyFromJson`, replaced by `fromJson`'s pins). `wireHazard`'s outbound depth count still equals `exceedsJsonDepth` (INV-QD-096).
- **D-15 Cost:** the double depth check (hydration entry then policy; sink record then audit row) is measured once with `pnpm bench`, and the numbers go into ADR-QD-143. A guard is never dropped for speed.
- **D-16 Records:** new **ADR-QD-143** (where the strict recipe lives, why it is public, the move-without-re-export rule, `unwalked`/`prepare`, the closed refusal, and the breaks). **INV-QD-305**: every untrusted JSON seam is guarded by construction. **INV-QD-306**: an unwalked slot is `Schema.Unknown` and has its own guarded decoder. Dated cross-reference amendments on ADR-QD-096 (D-15-c: envelope leniency is now `prepare`) and ADR-QD-107 (the "strict" sentence). BEH-QD-059, BEH-QD-259 and BEH-QD-230 (`19-hydration.md:537`) restated; new BEH from BEH-QD-486..490 as needed; CCR-QD-421; `spec/overview.md` rows (added `untrustedDecoder`/`UntrustedRefusal`/`PolicyNotJson`, removed `PolicyFromJson`/`UNTRUSTED_DECODE_OPTIONS`/`exceedsJsonDepth`, module column for `MAX_DECODE_DEPTH`); changesets: `@qadi/core` (Breaking: removals, `PolicyNotJson`, `fromJson` error channel), `@qadi/react` (Breaking: `PayloadTooDeep`), `@qadi/audit` (Breaking: `ArchiveRefusal.TooDeep`); `apps/website/.../reference/upgrading.md` entries for each.

### Claude's Discretion
- The exact generic signature of `untrustedDecoder` (how `R` from `prepare` threads into the result type) and the internal name of the sentence table for message seams.
- The next free `ERROR_CODES` code for `PolicyNotJson` (grep `Errors.ts` at the phase base).
- How the characterisation tables are split across test files (one per package is fine), provided each is green on the base before its seam moves.
- Whether the `[untrusted-decode]` budget also counts `Schema.decodeUnknown*` calls in the moved seams, provided the rule makes a hand-assembled guard-then-decode outside the leaf fail the gate.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/DecodeDepthGuard.ts`: `exceedsJsonDepth` (iterative, array stack); the module's primitive.
- `DecodeRefusal`/`EncodeRefusal` (`SinkWire.ts`/`JsonRefusal.ts`): the `Data.taggedEnum` pattern the new refusal copies.
- `JsonRefusal.ts` (ADR-QD-116): the precedent for a new public leaf that a moved name is not re-exported around.
- Decoders hoisted to module scope (`SinkCodec.ts:423`) — keep that for the new decoders.

### Established Patterns
- Seam mappings are closed: `Match.tagsExhaustive` over a tagged union (AGENTS.md §5a), no `switch`.
- Errors: `Data.TaggedError` default; `PolicyNotJson` is not one of the twelve `Schema.TaggedError` classes, so `SCHEMA_ERROR_BUDGET` is untouched.
- Budgets in `scripts/check-house-style.mjs` are exact counts checked in both directions, with an AGENTS.md table edited in the same task.
- Barrel order is gated alphabetically (`[barrel-order]`): `UntrustedDecode.ts` lands after `TraceDiff.ts`.

### Integration Points
- Seam table with file:line: `.planning/research/FEATURES.md` §"Phase 30", rows 1–16; the refusal mapping table: `.planning/research/ARCHITECTURE.md` §"Seam mapping".
- Cross-package consumers import from the `@qadi/core` root by name (AGENTS.md §1): react's `HydrationEngine.ts`, audit's `AuditArchive.ts`/`AuditEntry.ts`.
- `pnpm circular` after the first source edit: the leaf imports only `effect/*` and `DecodeDepthGuard.ts`; `Policy.ts` imports the leaf, never the reverse.

</code_context>

<specifics>
## Specific Ideas

- The user's standing direction for this milestone: "we should have the most clean solution not the simplest, we don't care about the complexity" and "we are not in prod yet, so you break changes". Every break above is deliberate and is recorded, not avoided.
- Plan order (from the research, kept): characterisation tables (green on base) → the leaf and its property test → core seams (`Policy`, `SinkCodec`, `PortWireEncode`, `PortRemote`) → audit → hydration (needs the core export) → the house-style rule → records.
- Mutation: record per-file Stryker base scores in the first plan (`30-mutation-base.json`); moving code can drop a file's score (Phase 29: `HydrationEngine.ts` 0.9619 → 0.9605 under `ignoreStatic`), so seam tests land before the old guards are deleted, and a drop is closed with a test.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
