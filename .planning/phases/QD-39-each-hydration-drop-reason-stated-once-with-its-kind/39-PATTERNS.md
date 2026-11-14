# Phase 39: Each hydration drop reason stated once, with its kind - Pattern Map

**Mapped:** 2026-11-14
**Files analyzed:** 14 (core 3, react 1, tests 5, spec/records 6+, see below)
**Analogs found:** all but two small gaps (see "No Analog Found")

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/HydrationMetrics.ts` (table, derived unions/list/meaning/guard) | config table + utility | transform (const table to types and values) | `packages/core/src/Errors.ts:496-573` | exact (structure) |
| `packages/react/src/HydrationEvent.ts:77-92` (`PayloadRefusalReason`, `EntryDropReason`) | type aliases | transform | `EnforcementDenial` / `EnforcementErrorTagOf` (`Errors.ts:563-573`) | role-match |
| `packages/core/test/HydrationMetrics.tst.ts` (partition, unknown kind, kind-less row) | test (type-level) | n/a | `packages/core/test/Errors.tst.ts:54-55`, same file's `not.toBeCallableWith` | role-match |
| `packages/core/test/HydrationMetrics.test.ts` (ordered nine-word snapshot) | test | n/a | same file `:165-176` | exact |
| `packages/react/test/Hydration.tst.ts:90` | test (type-level) | n/a | itself (unchanged, must stay green) | n/a |
| `packages/core/src/index.ts` barrel | barrel | n/a | existing `export *` of HydrationMetrics (no change expected, `HydrationDropReasonOf` rides the existing line) | n/a |
| `spec/overview.md:322-324`, `spec/behaviors/19-hydration.md`, `spec/invariants.md`, ADR-QD-152, CCR-QD-430, traceability, `index.yaml` | records | n/a | ADR-QD-151 and CCR-QD-429 | exact |
| `.changeset/<core-minor>.md`, `.changeset/<react-patch>.md` | changeset | n/a | `.changeset/sink-wire-version-stated-once.md` | exact |

No source change: `packages/devtools/src/model/Hydration.ts`, `examples/nextjs-newsroom/*`, `HydrationEngine.ts`, `DeveloperSignals.ts` (D-10, D-11).

## Pattern Assignments

### `packages/core/src/HydrationMetrics.ts` (table)

**Analog:** `packages/core/src/Errors.ts:496-573`.

**Row-constraint type, total over the key union** (`Errors.ts:503-505`):
```ts
export type EnforcementErrorClassTable<E extends { readonly _tag: string } = EnforcementError> = {
  readonly [K in E["_tag"]]: EnforcementErrorClass;
};
```
Note the constraint is keyed by a union that lives OUTSIDE the table, so a missing key is an error. For Phase 39 the key union is derived FROM the table (D-06), so the "missing entry is a compile error" mechanism is different: the guarantee is per-row, i.e. `satisfies Record<string, HydrationDropRow>` (or a named `HydrationDropTable`) where
`HydrationDropRow = { readonly kind: HydrationDropKind; readonly summary: string; readonly remedy: string }`.
A row without `kind` fails `satisfies` (TS2741/TS1360), an unknown kind fails the literal-union check. There is no "forgot to add a reason to a union" any more, because the union IS the keys. Because it is `as const satisfies`, keep `kind` literals narrow (the `as const` does that; do not annotate the const).

**`as const satisfies`** (`Errors.ts:518,547`): `export const ENFORCEMENT_ERROR_CLASSES = { ... } as const satisfies EnforcementErrorClassTable;` Comments sit above rows, per-row doc comments are fine (D-08: move the union-member doc comments onto rows).

**Kind-subset type read off the table** (`Errors.ts:563-567`), copy this shape:
```ts
export type EnforcementErrorTagOf<C extends EnforcementErrorClass> = {
  readonly [K in EnforcementError["_tag"]]: (typeof ENFORCEMENT_ERROR_CLASSES)[K] extends C ? K : never;
}[EnforcementError["_tag"]];
```
Phase 39 form: `{ readonly [R in keyof typeof TABLE]: (typeof TABLE)[R]["kind"] extends K ? R : never }[keyof typeof TABLE]`, with `K extends HydrationDropKind`. A module-private const used in an exported type needs `typeof TABLE` in a public `.d.ts`: TS emits it only if the const is exported or the alias is inlined, so expect TS4xxx/TS2883 ("has or is using private name") on `HydrationDropReasonOf`. Resolve by computing `HydrationDropReason` etc. as exported aliases, or exporting the table type (not value). Tell the planner to run `pnpm typecheck` + the declaration build early. AGENTS.md section 9 notes the same TS2883 caveat.

**Key order:** `as const satisfies` is erased at runtime; the object literal keeps source order, and `Object.keys` returns non-integer string keys in insertion order (ES2015+). Nothing reorders. Today's order to preserve (D-01): ForeignSubject, UnencodablePolicy, PayloadSubjectMismatch, MalformedEntry, UndecodablePolicy, EntryTooDeep, UnsupportedPayloadVersion, MalformedPayload, PayloadTooDeep (matches `HydrationMetrics.ts:130-140`).

**Deriving `hydrationDropReasons` with no `as` (the hard typing question).** There is NO existing keys-of-a-const helper in the repo (`grep Object.keys` hits only `SinkCodec.ts:176-177`, `FieldPath.ts`, `JsonHazard.ts`, all producing `string[]`/`Set<string>`; `Errors.ts:579` explicitly says `Object.keys` on a `satisfies` object does not produce a literal tuple). Closest precedent for the type-predicate-over-`Object.hasOwn` move is `packages/core/src/Decision.ts:283-287`:
```ts
const isFieldOf = <A extends Resource>(data: A, field: string): field is keyof A & string =>
  Object.hasOwn(data, field);
```
Recommended derivation, cast-free, using the guard D-03 already requires:
```ts
export const isHydrationDropReason = (word: string): word is HydrationDropReason =>
  Object.hasOwn(HYDRATION_DROP_TABLE, word);

export const hydrationDropReasons: ReadonlyArray<HydrationDropReason> =
  Object.keys(HYDRATION_DROP_TABLE).filter(isHydrationDropReason);
```
`Array.prototype.filter` has a type-predicate overload, so the result is `HydrationDropReason[]` with no cast. Declaration order is preserved. The guard reads the table, not the list, so there is no ordering/cycle problem. `hydrationDroppedTotal`'s `preregisteredWords: hydrationDropReasons` (`:284`) is untouched. It is a `ReadonlyArray`, not a tuple, exactly as today, so the `length === 9` pins stay oracle tests, not types. Mutation note: `Object.hasOwn` replaced by `true` is killed by the existing `isHydrationDropReason("SomethingElse")` test (`HydrationMetrics.test.ts:255-261`).

**`hydrationDropMeaning`** (`:234-235`) becomes `(reason) => TABLE[reason]`, return type annotated `HydrationDropMeaning` (row structurally has extra `kind`; assignable). Object-identity note: returning the row exposes `kind` at runtime to readers; D-08 accepts this, or project `{ summary, remedy }` if the planner wants the runtime shape unchanged (a new object per call; the `hydrationDropMeaning` tests use `assert.include` on fields, so either passes).

**Current code being replaced:** unions `:48,:71,:127`, hand list `:130-140`, `MEANINGS` `:166-231` (row text moves verbatim; keep every `summary`/`remedy` string byte-identical, pinned by `HydrationMetrics.test.ts:219-243`), guard `:243-244` (`.some`).

**Do not touch:** `hydrationDroppedTotal` declaration (`:282-285`) incl. id and description (registry key includes description, D-17, `[metric-id-literal]`/`[metric-table]`).

### `packages/react/src/HydrationEvent.ts:77-92`

Replace with, per D-09:
```ts
import type { HydrationDropReasonOf } from "@qadi/core";
export type PayloadRefusalReason = HydrationDropReasonOf<"payload">;
export type EntryDropReason = HydrationDropReasonOf<"entry">;
```
Match the file's existing `@qadi/core` import (named, from the package root, AGENTS.md section 1). Delete the "Written out rather than `Extract`ed" paragraph (`:81-84`). `bucketOf`/refusal maps stay exhaustive over the derived types (D-10). Existing pin `packages/react/test/Hydration.tst.ts:90` (`PayloadRefusalReason | EntryDropReason` toBe `ClientHydrationDropReason`) must remain green untouched.

### `packages/core/test/HydrationMetrics.tst.ts`

Existing style (file, lines 10-33): `import { expect, test } from "tstyche"`, `expect<...>().type.toBe<...>()`, `expect(fn).type.not.toBeCallableWith("x")`. Add tests: three kind subsets union toBe `HydrationDropReason`; pairwise disjoint (`HydrationDropReasonOf<"payload"> & HydrationDropReasonOf<"entry">` toBe `never`, and so on); `HydrationDropReasonOf<"bogus">` refused. Update the header comment ("The table itself is a mapped type over that union"), which becomes false.

**tstyche negative analog:** there is NO `toRaiseError` use anywhere in the repo's `*.tst.ts` (verified by grep; zero hits). The only negatives are `.type.not.toBeCallableWith` (`HydrationMetrics.tst.ts:20-21`) and `.type.not.toBe`-style; `Qadi.tst.ts` header mentions it replaced a `@ts-expect-error`. So the "kind-less row is a `toRaiseError`" pin (D-07) is new ground for the repo. `expect(...)` for `toRaiseError` takes an expression the compiler fails on, so a kind-less literal must be checked against an EXPORTED or test-local copy of the row constraint, since the table is module-private (D-05). Simplest narrow route: in the test define `type Row = { readonly kind: HydrationDropKind; summary: string; remedy: string }` is NOT possible without an export, so either export `HydrationDropKind` (second public type, then name it in changeset and `spec/overview.md`) or derive the row type from `HydrationDropMeaning & { kind: ... }`. Planner decides (D-07). If it uses tstyche, confirm `toRaiseError` in the installed version (`pnpm exec tstyche --version`) before relying on it.

### `packages/core/test/HydrationMetrics.test.ts`

Describe/test titles holding the written-out lists (keep unedited, D-04):
- `describe("HydrationMetrics")` > nested describe at ~`:160-190` (the REASONS block): `REASONS` written-out `as const` (`:165-171` shows its tail) used by `it.effect("names every drop reason, in order")` (`:172`, `deepStrictEqual([...hydrationDropReasons], [...REASONS])`) and `it.effect("every reason is in the snapshot before this suite raises any")` (`:178`).
- `describe("what each reason means")` (`:219`): written-out `pinned` list of nine triples, `it("covers every reason, with a distinct non-empty sentence of each kind")` (`:245`, `pinned.length === 9`), `it("narrows a metric key to a reason this build knows, and refuses any other")` (`:255`), and one `it(\`${reason} has its summary and its remedy\`)` per row (`:238-241`).
- `packages/devtools/test/model/Hydration.test.ts:109`: `assert.strictEqual(hydrationDropReasons.length, 9)` plus order check `:102-105`, inside an `it.effect` above "explains the two payload-level reasons...".

Add the ordered nine-word snapshot (DROP-03) beside the first block, copying `:172-176`; D-13 says it lands green on the BASE before any source edit. `METRIC_ID_LITERAL_BUDGET["packages/core/test/HydrationMetrics.test.ts"]` is 5 (`scripts/check-house-style.mjs:1918`); a snapshot test must not add a `"qadi_..."` literal outside a describe/it title.

## Mutation configs and Phase 38 invocation

- Core: `stryker.config.mjs` (`ignoreStatic: true`, `coverageAnalysis: "perTest"`, vitest dir `packages/core`), JSON report `reports/mutation/mutation.json` (gitignored). Phase 38 invocation (38-01-PLAN.md:21): `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/SinkCodec.ts,packages/core/src/SinkWire.ts'`. Phase 39 core: `--mutate 'packages/core/src/HydrationMetrics.ts'`.
- React: `stryker.react.mjs` (same flags, `reports/mutation-react/mutation.json`, mutate list includes `packages/react/src/HydrationEvent.ts`, `thresholds.break: 80`). Equivalent: `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/HydrationEvent.ts'`. Note: `HydrationEvent.ts` becomes mostly types, so the react baseline may have few mutants; compare per-file score.
- Baseline JSON shape (`38-mutation-base.json`): `{ "measured": { "<path>": <score 0..1> }, "unmeasured": {}, "new": [], "deleted": {} }`; the after file is flat `{ path: score }` (38-01-PLAN.md:113). Phase 38 wrote it with an inline `node --input-type=module -e` writer (38-01-PLAN.md:133) that refuses a report older than any src/test file or one mutating extra files; copy that task. One Stryker run alone, in the background (ADR-QD-098). Core and react run separately, so there are likely two baselines in one JSON (`measured` with two paths) or the plan decides; the react report path differs.

## Shared Patterns / Records

- **Spec rows to amend** (found by grep): `spec/overview.md:322` (`DehydrationDropReason, ClientHydrationDropReason, HydrationDropReason` row: add `HydrationDropReasonOf`, gate 13), `:323` (`hydrationDropReasons`), `:324` (`hydrationDropMeaning, isHydrationDropReason`), `:585` (HydrationDrop re-export, likely unchanged); `spec/behaviors/19-hydration.md` ~`:132`, `:573-615` (reason list and count amendment blocks; BEH-QD-232 nine-reasons), `:722-730` (metric key and `isHydrationDropReason`); `spec/invariants.md:1918-1928` (conservation law and reason groups), `:809`; `spec/behaviors/25-inspection.md` `[metric-table]` row for `qadi_hydration_dropped_total` stays UNCHANGED. Bump overview/behaviors/invariants Rev and Change History in the same edit.
- **ADR files:** `spec/decisions/123-a-metric-is-declared-once.md`, `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md`, `spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md` (also relevant). Newest ADR template: `spec/decisions/151-the-sink-wire-version-is-stated-once.md`; new `152-...md` plus a `spec/decisions/index.yaml` entry (shape at `index.yaml:453-454`: `- id: "ADR-QD-151"` / `file: ...`).
- **CCR row:** `spec/README.md:366` (CCR-QD-429) is the template; add CCR-QD-430 right after, and bump the Change History at `:13` (currently 1.172, then 1.173, 1.174 if row-then-completed like 428/429).
- **Traceability** (`spec/traceability.md`): ADR row template at `:308` (ADR-QD-151), test-file rows at `:327` (`SinkWire.tst.ts`) and `:415` (`SinkCodec.test.ts`); add ADR-QD-152 row, extend rows for `HydrationMetrics.tst.ts` / `HydrationMetrics.test.ts` / `HydrationEvent.ts` tests; bump header at `:13`.
- **Changesets:** core template `.changeset/sink-wire-version-stated-once.md` (front matter `"@qadi/core": minor`, then one paragraph on the new export and "bytes unchanged"-style compat note). No react patch changeset currently exists on disk; copy the front-matter shape from history: `git show 6bc78799^:.changeset/dehydrate-in-engine.md` (`"@qadi/react": patch`). Both go in `.changeset/` (currently only `sink-wire-version-stated-once.md`, `superseding-run.md`).
- **Commit rule:** end messages with the Co-Authored-By line given by the harness (Phase 38 plans used Opus 5.5; use the current reminder's line).
- **House style:** namespace imports for `effect` submodules, `.ts` extensions, `import type` for types, no `as`/`!`/`any`/`switch`, doc comment leads with one-line summary then rationale.

## No Analog Found

| Item | Reason |
|---|---|
| Cast-free typed keys of a const object | No helper exists; use `Object.keys(TABLE).filter(isHydrationDropReason)` per above (precedent for the predicate half: `Decision.ts:283-287`). |
| `toRaiseError` tstyche negative | Not used anywhere in the repo yet; verify the installed tstyche supports it or fall back to `not.toBeCallableWith`/`not.toBe` on an exported row type. |
| Kind-subset type over a derived key union | `EnforcementErrorTagOf` is the shape, but its keys come from an external union; here the union is `keyof typeof TABLE`, which can hit TS2883/private-name emission for a module-private const. |

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `packages/react/src,test`, `packages/devtools/test`, `spec/`, `.changeset/`, stryker configs, Phase 38 plan folder.
**Tracked check:** all analog paths are under `packages/*`, `spec/`, `.changeset`, repo root configs (tracked source; no `.gsd` mirror paths).
**Not read in full:** ADR-QD-151 body, `Hydration.ts` (devtools) and react `HydrationEngine.ts`/`DeveloperSignals.ts` (untouched by decision).
**Pattern extraction date:** 2026-11-14
