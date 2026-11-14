# Phase 38: The sink wire version stated once - Pattern Map

**Mapped:** 2026-11-14
**Files analyzed:** 11
**Analogs found:** 11 / 11

## File Classification

| File | Role | Data Flow | Closest Analog | Match |
|------|------|-----------|----------------|-------|
| `packages/core/src/SinkWire.ts` (add `WIRE_VERSION`, derive two exports) | leaf constants | transform | itself (`:48-51`) | exact |
| `packages/core/src/SinkCodec.ts` (`:146 :154 :224 :226 :453 :470`) | codec | request-response | itself | exact |
| byte golden | test | file-I/O (exact text) | `packages/core/test/SinkCodec.test.ts:1795-1830` + `fixtures/sinkWireV2.ts` | exact, ALREADY EXISTS |
| refusal rows | test | request-response | `SinkCodec.test.ts:1956-1994` | exact |
| tstyche pin | type test | compile-time | `packages/core/test/SinkRecord.tst.ts` | role-match |
| `spec/decisions/151-*.md` + `index.yaml` | ADR | doc | `spec/decisions/150-a-scoped-run-that-a-newer-run-supersedes.md` | exact |
| `spec/invariants.md` INV-QD-096 (`:2949`) | spec | doc | INV-QD-313 amend by CCR-QD-428 | role-match |
| `spec/overview.md` (`:456`, `:515-521`) | spec | doc | same lines | exact |
| `spec/README.md` CCR row (`:365` is CCR-QD-428) | spec | doc | CCR-QD-428 row | exact |
| `spec/traceability.md` | spec | doc | ADR-QD-150 row (`:13` history, `:301` style) | exact |
| `.changeset/<name>.md` | config | doc | `.changeset/superseding-run.md` | exact |
| `38-mutation-base.json` | evidence | batch | `.planning/phases/QD-37-*/37-mutation-base.json` | exact |

## Pattern Assignments

### SinkWire.ts
Today (`:48-51`): `export type WireVersion = 2;` and `export const WIRE_VERSIONS: ReadonlyArray<WireVersion> = [2];`. `DecodeRefusal.UnsupportedVersion.supported: ReadonlyArray<WireVersion>` (`:83`) stays (it accepts `readonly [2]`). Target (D-01/02):
```ts
export const WIRE_VERSION = 2 as const;
export const WIRE_VERSIONS = [WIRE_VERSION] as const;
export type WireVersion = (typeof WIRE_VERSIONS)[number];
```
Doc style: one-line summary first, why after (AGENTS.md header). Keep ADR-QD-037 leaf note ("cannot import SinkCodec.ts"). The `WireVersion` doc says "A closed union of one member" and "future version 3 is a full-union edit": reword.

### SinkCodec.ts edits
- Import `:86` is `import { DecodeRefusal, WIRE_VERSIONS } from "./SinkWire.ts";` add `WIRE_VERSION`. `:87` `import type { WireVersion }` is used ONLY at `:453`; delete it with the private const (verbatimModuleSyntax / unused-import lint).
- `:146`, `:154`: `version: Schema.Literal(2)` becomes `Schema.Literal(WIRE_VERSION)` in `decisionV2Fields` / `obligationsV2Fields`.
- `:224`, `:226` inside `project` (`Match.type<SinkRecord>().pipe(Match.tagsExhaustive`):
  `omitUndefined({ ...record, version: 2 as const })` and `omitUndefined({ ...record, version: 2 as const, outcome: outcomeOf(record.outcome) })`; swap `2 as const` for `WIRE_VERSION` (still typed `2`).
- `:453` delete `const WIRE_VERSION: WireVersion = 2;` (and its doc `:452`).
- `:467-473` decoder:
```ts
const version = ownValue(input, "version");
return version === WIRE_VERSION   // -> WIRE_VERSIONS.some((v) => v === version)
  ? Result.succeed(envelopeOf(input))
  : Result.fail(DecodeRefusal.UnsupportedVersion({ version, supported: WIRE_VERSIONS }));
```
`version` is `unknown`, so `WIRE_VERSIONS.some((v) => v === version)` typechecks (do NOT use `.includes(version)`, it rejects `unknown`). Doc `:461` "`version: 2` is read" and `:363` "It writes version 2" are prose (leave per D-11, or touch lightly).

### Q1. Key order encodeSinkRecord emits
Path (`SinkCodec.ts:387-405`): `project(record)` (spread, then `version`, then `outcome` for a decision; `omitUndefined` only `delete`s undefined keys, `:200`), then `encodeWire = Schema.encodeResult(SinkRecordWire)` (`:364`). The struct encode writes keys in the SCHEMA's declaration order and drops undeclared ones (`:212-213`), so `project`'s spread order does not matter; the struct order does. Then `wireHazard` only reads. So:
- Decision: `_tag, version, ...decisionRecordFields (evaluationId, at, subjectId, policy, resource?, action?, cache?; SinkRecordFields.ts:55-112), outcome` (`decisionV2Fields :142-147`).
- Obligations: `_tag, version, evaluationId, at, outcome, obligationIds, subjectId?, action?, resourceId?` (`SinkRecordFields.ts:122-142`).
Key order is unchanged by the edit because `Schema.Literal(WIRE_VERSION)` stays in the same slot. Confirm against the golden fixtures.

### Byte golden: already exists, do not re-invent
Goldens here are plain `assert.strictEqual(v2Of(record), V2.<CONST>)` against hand-written text fixtures in `packages/core/test/fixtures/sinkWireV2.ts` (`V2_DECIDED_ALLOW :14`, `V2_FAILED_MISSING_RESOURCE :26`, `V2_OBLIGATIONS :34`, `V2_OBLIGATIONS_FULL_ENVELOPE :42`, `V2_DECISION_FULL_ENVELOPE :46`), asserted at `SinkCodec.test.ts:1795-1830` ("golden bytes" block; imports `:58`). `toMatchInlineSnapshot`/`toMatchSnapshot`/`toMatchFileSnapshot`: grep over `packages/*/test` found NONE used; do not introduce. D-05's plan: either cite these existing goldens as the green-on-base characterisation (they already hard-code `"version":2` in text) and add nothing, or add one decision plus one obligation assertion only if a gap is found. Copy the `v2Of(record)` shape. Note `V2_DECIDED_ALLOW` and `V2_OBLIGATIONS` are exactly one decision and one obligation record.

### Q2. Existing UnsupportedVersion pins
- `SinkCodec.test.ts:1956-1994`: versions `[1, 3, "2", null, 2.5, {major:2}]` (`:1957-1963`), absent (`:1965`, `UNVERSIONED` const `:84`), `WIRE_VERSIONS` deepEqual `[2]` (`:1970`), pre-0.10 bytes absent (`:1985`), explicit `version:1` (`:1991`). Also `:1350` (object naming no version), `:523/:1380` (no subjectId), `:1688`, `:2148`.
- `UntrustedSeams.test.ts:178` (3), `:184` (none), `:216` (`{}`); `audit/test/AuditEntry.test.ts:378-412`, `AuditArchive.test.ts:288`; `features/features/wire-versions/wire-versions.steps.test.ts:201-208`.
- All five D-07 rows (absent, 1, 3, "2") exist; all compare with `supported: WIRE_VERSIONS`, so none hard-codes `[2]` except `:1970`. Missing: a row asserting `supported` equals the literal `[2]` on a refusal (the `:1970` row checks the const, not the refusal) and a version-2 acceptance row next to them (decode is covered elsewhere). Planner: add `supported: [2]` literal row.

### Q3. `Literal(2)` / `version: 2` / `= 2` / `2 as const` in `packages/core/src/Sink*.ts`
Code: `SinkWire.ts:48` (`type WireVersion = 2`), `:51` (`[2]`); `SinkCodec.ts:146`, `:154`, `:224`, `:226`, `:453`. Doc prose (out of scope): `SinkWire.ts:36, :62`, `SinkCodec.ts:363, :461`. `SinkEmit.ts`, `SinkRecordFields.ts`: none. After the change the code matches reduce to the single `WIRE_VERSION = 2 as const` (D-04); `:48` `= 2` goes away since the type derives.

### tstyche pin
Analog `packages/core/test/SinkRecord.tst.ts`: `import { expect, test } from "tstyche";` and `import type {...} from "../src/X.ts"`; hand-written expectation, never read from source. Name new file `packages/core/test/SinkWire.tst.ts`. Use `expect<typeof WIRE_VERSION>().type.toBe<2>()` (value import needed: `import type { WIRE_VERSION, ... }` works with `typeof` only if type-only import of a value is allowed; `import type` of a const is fine for `typeof`). For struct fields, `decisionV2Fields`/`obligationsV2Fields` are module-private in SinkCodec.ts; pin through `SinkRecordJson["version"]` (exported from SinkCodec.ts, imported in SinkRecord.tst.ts) as `2`; if the schema Type is wanted, export is NOT permitted without a gate-13 row, so use `SinkRecordJson`. Running: `package.json:25` `"test:tstyche": "tstyche"`; `pnpm check` (`:41`) runs `pnpm test:tstyche` (4th step), so the pin gates merge. No `tstyche.config.json` at root (default discovery of `*.tst.ts`).

### Q4. house-style
`scripts/check-house-style.mjs` rule ids (`:134-322+`) cover async/await, promise, barrel imports, `as`, time, uuid, console, `!`, extensionless imports, legacy service API, static layer, TaggedError, orDie, fs, either, etc. None flags a new exported const or `.some(...)` (`.some` appears only in the script's own code). `2 as const` is a const assertion, the `no-type-assertion` rule is for `as`-casts, and D-01 keeps `as const` (already present at `:224`), so it is already tolerated; verify with `pnpm lint`/`node scripts/check-house-style.mjs`. `UNTRUSTED_DECODE_BUDGET` (`:631-643`): `SinkCodec.ts` = 1 (its `JSON.parse` in `decodeStoredRecordString`); `SinkWire.ts` is not listed. The edit adds/removes none of `onExcessProperty`, `exceedsJsonDepth`, `Schema.decode*`, `JSON.parse`; `Schema.encodeResult` is not counted. Budget unchanged. Do not add the literal words `JSON.parse` to comments in SinkCodec.ts/SinkWire.ts (comments are stripped anyway).

### Q5. Gate 13 (`scripts/check-api-surface.mjs`)
Header `:14-18`: MISSING requires every package export to appear as a backticked token anywhere between `## Public API surface` and `## Worked example`; STALE reads backticked names in the Export column of API tables. So write `WIRE_VERSION` backticked in the prose of the core errors row at `spec/overview.md:456` (`...`SinkRecordNotDecodable` (with `DecodeRefusal`, `WireVersion` and `WIRE_VERSIONS`)` -> add `WIRE_VERSION`), and update `:515-521` prose (`WireVersion` "is the closed `2`", `WIRE_VERSIONS` (`[2]`), the "leaf SinkWire.ts" list of declared names). Because `WireVersion` becomes derived, say so there. The `:349` `decodeSinkRecord` row needs no export edit. Run `pnpm spec:api`.

### Spec records
- ADR: copy `150-*.md` header table (Document ID `QADI-ADR-151`, Revision `1.0`, Effective Date, `Status | Accepted — amends ADR-QD-096`, Change History `1.0 (2026-11-14): Initial (ARCH-85, CCR-QD-429)`); add to `spec/decisions/index.yaml` (entry shape: `id`, `file`, `title`, `status: "Accepted — amends ADR-QD-096"`). Also amend ADR-QD-096 per the ADR-150 precedent (150 edited `137-*.md`).
- INV-QD-096 (`spec/invariants.md:2949`): amend in place (Source/Enforcement paragraphs `:2959-2975`, Enforcement already cites "golden bytes"), bump the file's Change History at `:13` (`1.118 (2026-11-14): ... (CCR-QD-428)` is the style) and no new INV number.
- CCR: `spec/README.md:365` is CCR-QD-428's row (`| CCR-QD-428 | 2026-11-14 | <files> | ... |`); add CCR-QD-429 below it and bump README `:13` Change History (`1.170`, then 1.171). `spec/traceability.md` row for ADR-QD-151 (style `:301`) and `:13` history (`1.166` -> `1.167`). Revisions via `pnpm spec:revise` (`package.json:37`, `scripts/spec-revise.mjs --date`, then `--check`); gates `pnpm spec:verify:strict`, `spec:gates`.
- Changeset: `.changeset/superseding-run.md` is `---\n"@qadi/devtools": patch\n---\n` plus one paragraph; for core use `"@qadi/core": minor`, state the new `WIRE_VERSION` export and that `WIRE_VERSIONS` narrows `ReadonlyArray<2>` to `readonly [2]`, source-compatible.

### Mutation (Phase 37 precedent)
`37-mutation-base.json` shape: `{"measured": {<file>: <ratio>}, "unmeasured": {}, "new": [], "deleted": {}}`. Invocation pattern (37-01-PLAN `:83`): `pnpm exec stryker run <config> --mutate '<comma list>'`. For core the config is `stryker.config.mjs` (default, no name; `mutate: ["packages/core/src/**/*.ts"...]`, `ignoreStatic: true :79`, `thresholds.break: 80 :89`; `pnpm mutation` runs bare `stryker run` first). So: `pnpm exec stryker run --mutate 'packages/core/src/SinkCodec.ts,packages/core/src/SinkWire.ts'` (or `stryker run stryker.config.mjs --mutate ...`). Check the JSON reporter path in the config's `jsonReporter.fileName` before writing the baseline writer. `ignoreStatic` hides module-scope constants, as the roadmap notes.

## Shared Patterns
- Imports: `.ts` extensions, named import from leaf `./SinkWire.ts` (`SinkCodec.ts:86`), `import type` for types.
- Tests: `@effect/vitest`; refusal comparisons via `decodeRefusalOf(text)` and `DecodeRefusal.UnsupportedVersion({ version, supported: WIRE_VERSIONS })`.
- Only tracked sources named above (`git ls-files` confirmed for tst and stryker config; fixtures and ADRs are tracked repo files).

## No Analog Found
None. A new byte-golden file is likely unnecessary (see above).

## Metadata
**Scope:** packages/core/src, packages/core/test, spec, scripts, .planning/phases/QD-37-*. Not verified: the stryker jsonReporter path for core, whether `pnpm lint` flags `import type` of a value for `typeof`, whether ADR-096 needs its own Change History row edit.
