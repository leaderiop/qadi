# Phase 30: One strict-decode module - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** 24
**Analogs found:** 22 / 24 (all cited paths verified tracked via `git ls-files` for the spot-checked core/script files; the rest are plain `packages/*/src` sources)

Line numbers below are current on branch `arch-wave-8` (they match the research for `Policy.ts`; re-grep before editing).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| NEW `packages/core/src/UntrustedDecode.ts` | utility leaf (decoder + closed refusal) | transform (sync Result) | `JsonRefusal.ts` (leaf, `Data.taggedEnum`) + `SinkWire.ts:78-87` (`DecodeRefusal`) + `DecodeDepthGuard.ts` | role-match |
| NEW `packages/core/test/UntrustedDecode.test.ts` (+ property test) | test | transform | `SinkCodec.test.ts:1296-1306` (FastCheck TooDeep === exceedsJsonDepth), `PredicateLiteral.test.ts` (`import * as FastCheck from "fast-check"`) | exact |
| `packages/core/src/Policy.ts` (`fromJson` 1019-1040, `fromJsonValue` 1057-1062, `PolicyFromJson` ~916, `MAX_DECODE_DEPTH` 978, `UNTRUSTED_DECODE_OPTIONS` 1002, `decodePolicyUnknown` 1004) | seam | request-response (Effect) | itself (current guard-then-decode) | exact |
| `packages/core/src/Errors.ts` (`PolicyNotJson`, `QadiError` ~430, `ERROR_CODES` 442-) | model | n/a | `PolicyDecodeTooDeep` (`Policy.ts:943`, `ERROR_CODES` `"PolicyDecodeTooDeep": "ACL017"` at 459) | exact |
| `packages/core/src/SinkCodec.ts` (`decodeWire` 423, `decodeSinkRecord` 501-511, `decodeSinkRecordString` ~519, stored envelope below) | seam | transform | itself; `prepare` = version check + `envelopeOf` | exact |
| `packages/core/src/PortWireEncode.ts` (decodeQ/decodeA 104-106, guards 120, 138; `WIRE_MAX_DEPTH` 27; imports 18, 23) | seam | request-response | itself | exact |
| `packages/core/src/PortRemote.ts` (`decodeReply` 123, guard 151; imports 31-32) | seam | request-response | itself | exact |
| `packages/react/src/HydrationEngine.ts` (decoders 198-200, payload guard 440, entry guard 480; imports 41-46) | seam | transform (Option) | itself | exact |
| `packages/react/src/HydrationEvent.ts` (`PayloadRefusalReason` line 85) | model | event | itself (closed union, write full union) | exact |
| `packages/react/src/DeveloperSignals.ts`, `packages/core/src/HydrationMetrics.ts` | signal/metric | event | itself | exact |
| `packages/audit/src/AuditArchive.ts` (`decodeEnvelope` 252, use 277, import 18) | seam | batch | itself (`ArchiveRefusal`) | exact |
| `packages/audit/src/AuditEntry.ts` (`decodeRow` 150-152; `recordJsonOf` 163 stays OUT) | seam | transform | itself | exact |
| `packages/devtools/src/model/ExplorerSession.ts` (`fromJson` use 288, `formatDecodeFailure` ~123-139) | consumer | request-response | itself; add `PolicyNotJson` sentence | exact |
| MAX_DECODE_DEPTH importers: `FieldPath.ts`, `Explanation.ts`, `TreeFold.ts`, `RelationshipResolver.ts`, `Simplify.ts` (mostly doc-comment mentions today), `SinkCodec.ts:77`, `PortWireEncode.ts:23`, react `HydrationEngine.ts:41` | re-point | n/a | `JsonRefusal.ts` precedent (ADR-QD-116, moved name not re-exported) | exact |
| `packages/core/src/index.ts` | barrel | n/a | itself; `export * from "./UntrustedDecode.ts"` after `TraceDiff.ts` | exact |
| `scripts/check-house-style.mjs` (`[untrusted-decode]`) | config/gate | batch | `DECISION_READ_BUDGET` (589-613, check 1432-1475) | exact |
| `AGENTS.md` (new budget section) | doc | n/a | AGENTS.md §13 `DECISION_READ_BUDGET` bullet (line ~599); §5 `UNTRACED_BUDGET` table | role-match |
| `spec/overview.md`, `spec/behaviors/25-inspection.md`, `19-hydration.md:537`, ADR/INV/CCR docs | spec | n/a | existing rows in same files | exact |
| `.changeset/*.md` (three: core, react, audit) | config | n/a | `.changeset/access-plan.md` | exact |
| `apps/website/src/content/docs/docs/reference/upgrading.md` | doc | n/a | existing entries in same file (note: under `apps/website`, not `spec/`) | exact |
| Per-seam characterisation tests (D-13) | test | transform | `SinkCodec.test.ts` (pinned order ~1304) and `Policy.test.ts:565-583` | role-match |
| `packages/devtools/src/model/SimulationForm.ts:67-70`, `PortSpanEncode.ts` | non-seam | n/a | OUT of scope (typed-text parse) | n/a |
| http `PortRoutes.ts`/`RemotePorts.ts`, devtools `Source.ts` | classify | n/a | grep found NO `onExcessProperty`/`exceedsJsonDepth`/`decodeUnknown` in `packages/http/src` or `packages/devtools/src`: not seams (they call core's `decodeQuestion`/`fromJson`); no change | n/a |

## Pattern Assignments

### NEW `UntrustedDecode.ts` (utility leaf)

**Analog A, closed refusal enum:** `packages/core/src/SinkWire.ts:78-87`
```ts
export type DecodeRefusal = Data.TaggedEnum<{
  NotJson: Record<never, never>;
  TooDeep: { readonly maxDepth: number };
  Malformed: { readonly message: string };
  ...
}>;
export const DecodeRefusal = Data.taggedEnum<DecodeRefusal>();
```
Copy for `UntrustedRefusal = NotJson | TooDeep{maxDepth} | Malformed{message, error: Schema.SchemaError}`.

**Analog B, leaf header and imports:** `JsonRefusal.ts:1-19` (doc-comment: one-line summary, then why; imports only `effect/*`, so no cycle). Imports: `import * as Data from "effect/Data"; import * as Match from "effect/Match";` plus here `Result`, `Schema`, `type * as SchemaAST`, and `./DecodeDepthGuard.ts`. Constants move here from `Policy.ts`: `MAX_DECODE_DEPTH = DEFAULT_MAX_DEPTH * 4` (978, with the 4x calibration comment 947-978; `DEFAULT_MAX_DEPTH` import must not create a cycle, so check where it lives with `pnpm circular`) and private `UNTRUSTED_DECODE_OPTIONS: SchemaAST.ParseOptions = { onExcessProperty: "error" }` (1002).

**Core recipe to centralise** (currently `Policy.ts:1019-1040`, `SinkCodec.ts:501-511`):
```ts
const parsed = Result.try((): unknown => JSON.parse(text));          // SinkCodec ~519
if (Result.isFailure(parsed)) return NotJson
if (exceedsJsonDepth(input, MAX_DECODE_DEPTH)) return TooDeep({ maxDepth: MAX_DECODE_DEPTH })
// prepare(input) here (SinkCodec: version check then envelopeOf)
Schema.decodeUnknownResult(schema, UNTRUSTED_DECODE_OPTIONS)(prepared)  // SinkCodec:423
```
For `unwalked`, replace hydration's hand-built `exceedsJsonDepth({ ...payload, entries: [] }, MAX_DECODE_DEPTH)` (`HydrationEngine.ts:440`) with a guard over the input minus those top-level keys. Pin each `unwalked` key as `Schema.Unknown` in a test (INV-QD-306). Dispatch with `Match.tagsExhaustive`, no `switch`.

### `Policy.ts` seam
Current shape to replace (1019-1040, 1057-1062): `Effect.suspend` plus `try { JSON.parse }`, falling back to `Schema.decodeUnknownEffect(PolicyFromJson, ...)` on parse failure. New: `Effect.fromResult(decoder.decodeText(json))` mapped by `Match.tagsExhaustive` to `PolicyNotJson | PolicyDecodeTooDeep({maxDepth}) | error` (SchemaError). The `PolicyDecodeTooDeep` class (943) stays in `Policy.ts` (Errors.ts imports it as a type, `Errors.ts:56`). Remove `PolicyFromJson` (916), `MAX_DECODE_DEPTH`, `UNTRUSTED_DECODE_OPTIONS`, and the `exceedsJsonDepth` import (26). Restate the pin `Policy.test.ts:565-583`.

### `PolicyNotJson` in `Errors.ts`
**Analog:** `PolicyDecodeTooDeep` plus the `QadiError` union (`Errors.ts:413-432`) and `ERROR_CODES` (442-). Plain tag, no `qadi/` prefix (AGENTS.md §4):
```ts
export class PolicyNotJson extends Data.TaggedError("PolicyNotJson")<{ readonly message?: string }> {}
```
Add `| PolicyNotJson` to `QadiError` and `"PolicyNotJson": "ACLnnn"` after the last entry (grep the tail of `ERROR_CODES` past ACL020 for the next free code). `PolicyDecodeTooDeep` is defined in `Policy.ts` because of the cycle; define `PolicyNotJson` beside it there and `import type` it in `Errors.ts` (same trick, `Errors.ts:413-419`). Also check the second tag-keyed map beside `ERROR_CODES` (`Errors.ts:~509`) and `ExplorerSession`'s sentence table.

### `SinkCodec.ts` seam
`decodeSinkRecord` (501) becomes `decoder.decode` with `prepare` = `isJsonObject` check, version check returning `DecodeRefusal.UnsupportedVersion`, then `envelopeOf(input)`; `decodeSinkRecordString` (~519) uses `decodeText`. Map `UntrustedRefusal` to `DecodeRefusal` (NotJson/TooDeep/Malformed map 1:1) via `Match.tagsExhaustive`. Keep pinned order guard, version, project, decode (`SinkCodec.test.ts:~1304`). Prepare's own error type is `R`: `Result<unknown, DecodeRefusal>`.

### `PortWireEncode.ts` / `PortRemote.ts` seams
`PortWireEncode.ts:104-140`: each `decodeX` is `exceedsJsonDepth(input, WIRE_MAX_DEPTH) ? Result.fail("the question nests deeper than the decode bound") : Result.map(Result.mapError(decodeQ(input), (e) => e.message), ...)`. Replace with `decoder.decode(input)` and one sentence table (D-08), keeping sentences byte-identical ("the question/answer nests deeper than the decode bound", `error.message` for Malformed). `WIRE_MAX_DEPTH = MAX_DECODE_DEPTH` (27) re-points to the leaf, dropping the `./Policy.ts` import (23). `PortRemote.ts:123,151` same: map refusal to `RemotePortFailure.Undecodable({ message })` (shape unchanged).

### `HydrationEngine.ts` (react)
Imports named from `@qadi/core` root (41-46: `MAX_DECODE_DEPTH`, `UNTRUSTED_DECODE_OPTIONS`, `exceedsJsonDepth`); replace with `untrustedDecoder`, `MAX_DECODE_DEPTH`. `decodePolicy/decodeEnvelope/decodeEntry` (198-200) are `Schema.decodeUnknownOption(..., UNTRUSTED_DECODE_OPTIONS)`; adapt with `Result.getSuccess` for the Option seam. Envelope decoder uses `unwalked: ["entries"]`. Payload TooDeep maps to new `PayloadTooDeep` (reason, `HydrationEvent.ts:85`, written as the full closed union `"PayloadSubjectMismatch" | "UnsupportedPayloadVersion" | "MalformedPayload" | "PayloadTooDeep"`); entry-level stays `EntryTooDeep` (480). The reason is a metric label (`HydrationMetrics.ts`, `spec/behaviors/25-inspection.md` table; use `Metric.value(series)` in tests, `METRIC_ID_LITERAL_BUDGET`).

### Audit seams
`AuditArchive.ts:252` `decodeEnvelope`, `unwalked: ["entries"]`; `ArchiveRefusal` gains `TooDeep` (full closed union); per-entry stays `EntryNotDecodable{index, refusal}`. `AuditEntry.ts:150-152` `decodeRow`, `unwalked: ["record"]`, TooDeep maps to existing `DecodeRefusal.TooDeep`. `recordJsonOf` (163) stays plain `Schema.decodeUnknownResult(SinkRecordJson)`. Keep the `[untrusted-decode]` rule from flagging it: it has no `onExcessProperty` literal.

### House-style rule `[untrusted-decode]`
**Analog:** `DECISION_READ_BUDGET` + `_NAMES` (`check-house-style.mjs:589-613`), checks at 1432-1475, headed by a comment block (1432-1437). Shape to copy:
```js
const UNTRUSTED_DECODE_BUDGET = { "packages/core/src/UntrustedDecode.ts": n, "packages/core/src/JsonHazard.ts": n, "packages/core/src/DecodeDepthGuard.ts": n };
for (const [rel, budget] of Object.entries(X)) { const found = lines.get(rel) ?? []; if (found.length !== budget) { failures += 1; console.error(`${rel}  [untrusted-decode] declares ...`) } }
for (const [rel, found] of lines) { if (rel in X) continue; failures += 1; console.error(...) }
```
The scan feeding `decisionReadLines` lives near line ~988 (src-only budgets block; helper `scripts/lib/raw-decision-read.mjs` is the precedent for a lib scanner). Count literal `onExcessProperty` and `exceedsJsonDepth(` calls in `packages/*/src`; expected after moving: `UntrustedDecode.ts` (decode + the option literal), `JsonHazard.ts` (only if it calls it; today it only mentions it in a doc comment at 82, so count may be 0), `DecodeDepthGuard.ts` (its definition). Strip comments before counting, as the other rules do. Also add `*_NAMES` rename-guard if desired. No existing script test file was found for these budgets (`scripts/` has `check-house-style.mjs` only, gate is `pnpm check`); verify with a negative run. AGENTS.md: add a section modelled on §5/§13 (table plus "checked in both directions"), and keep it in the same task; also update the budget-count prose in the script header comment (23-31).

### Barrel
`packages/core/src/index.ts`: add `export * from "./UntrustedDecode.ts";` after `TraceDiff.ts` (alphabetical, `[barrel-order]`). `JsonRefusal.ts` precedent: barrel re-exports every name, so `UNTRUSTED_DECODE_OPTIONS` must NOT be exported from the leaf (keep module-private) and `exceedsJsonDepth` must leave the barrel: check whether `DecodeDepthGuard.ts` has its own `export *` line and remove it, then add/keep `spec/overview.md` "Not listed above" gate (gate 13) in sync.

### Tests
**Property test analog:** `SinkCodec.test.ts:1296-1306`:
```ts
return (refusalOf(record)?._tag === "TooDeep") === exceedsJsonDepth(wire, P.MAX_DECODE_DEPTH);
}),
{ numRuns: 200, seed: 7319 },
```
with `import * as FastCheck from "fast-check"` (`PredicateLiteral.test.ts:2`). Use fixed `seed` and `numRuns`; arbitrary JSON values on both sides of 256; assert never throws, refusal is a function of the input, and `TooDeep` iff `exceedsJsonDepth` over the walked part. Characterisation tables (D-13): copy the `SinkCodec.test.ts` precedence tests and `Policy.test.ts:565-583`; write them table-driven (`it.each`-style rows) per seam, green on base before moving. Also `MAX_DECODE_DEPTH === DEFAULT_MAX_DEPTH * 4`. Rewrite test-scope users of `UNTRUSTED_DECODE_OPTIONS` (`DecisionWire.test.ts:8`, `Policy.test.ts:380`, `features/features/hydration-counts/hydration-counts.steps.test.ts`, `v4-api-smoke.test.ts:166` comment). The test-scope budgets in the script (`PORT_DOUBLE_BUDGET`, metric-id literal) apply to new tests.

### Changesets and upgrading
**Analog:** `.changeset/access-plan.md`: frontmatter `"@qadi/http": minor` then `**Breaking.**` lead, bullets, `Migration:` paragraph. Write three files for `@qadi/core`, `@qadi/react`, `@qadi/audit`. Upgrading entries go in `apps/website/src/content/docs/docs/reference/upgrading.md` (verified path).

## Shared Patterns

### Closed refusal mapping
**Source:** `Match.tagsExhaustive` (AGENTS.md §5a), `Data.taggedEnum` (`SinkWire.ts:87`). Apply to every seam's mapping function; define it at module scope, a new refusal arm is a compile error at every seam.

### Decoders built once at module scope
**Source:** `SinkCodec.ts:423`, `PortRemote.ts:123`, `HydrationEngine.ts:198-200`, `AuditArchive.ts:252`. Keep `const decodeX = untrustedDecoder(Schema, ...)` top-level.

### Imports and conventions
Namespace imports for `effect/*`, relative imports with `.ts`, `import type` for types, cross-package named imports from `@qadi/core` (AGENTS.md §1). No `as`, `!`, `any`, `switch`. Run `pnpm circular` after the first edit: leaf imports only `effect/*`, `DecodeDepthGuard.ts` (and `DEFAULT_MAX_DEPTH`'s home, check it).

## No Analog Found

| File | Reason |
|---|---|
| `unwalked` mechanism (guard over input minus named top-level keys) | Nothing equivalent; only hydration's inline `{ ...payload, entries: [] }` (`HydrationEngine.ts:440`) |
| `[untrusted-decode]` comment-aware literal scanner | Closest is `scripts/lib/raw-decision-read.mjs`; read it before writing |

## Metadata

**Analog search scope:** `packages/{core,react,audit,devtools,http}/src`, `scripts/check-house-style.mjs`, `.changeset`, `AGENTS.md`
**Pattern extraction date:** 2026-11-12
**Not verified:** exact `ERROR_CODES` next code (tail not read), `DEFAULT_MAX_DEPTH` home module, `JsonHazard.ts` call-site count for the budget, `index.ts` line for `DecodeDepthGuard`.
