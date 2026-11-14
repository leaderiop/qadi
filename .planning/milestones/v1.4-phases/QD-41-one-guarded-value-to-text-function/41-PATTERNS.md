# Phase 41: One guarded value-to-text function - Pattern Map

**Mapped:** 2026-11-14
**Files analyzed:** 12
**Analogs found:** 12 / 12

Note: the session has no `setPolicy` or `chooseSight`. The real commands are `choosePolicy(policy)`, `choosePolicyAt(n)`, `setSightings`, `edit(input)`. The tests' idiom is `sessionWith(policy, input)`.

## File Classification

| File | Role | Data Flow | Closest Analog | Match |
|------|------|-----------|----------------|-------|
| `packages/devtools/src/model/ValueText.ts` (new; name is discretionary) | utility | transform | `SimulationForm.ts:95-103` `stringify` | exact |
| `packages/devtools/test/model/ValueText.test.ts` (new, one table) | test | transform | `Filters.test.ts:296-312` plus Remedies "renders a witness JSON cannot represent" | role |
| `packages/devtools/test/model/<NonJsonWitness>.test.ts` (new RED) | test | request-response | `Remedies.test.ts:395-415` (remedy level), `SimulationSession.test.ts:114-120` `sessionWith` (session level) | exact |
| `packages/devtools/src/model/Remedies.ts` | utility | transform | itself, `render` at 574 | modify |
| `packages/devtools/src/model/Filters.ts` | utility | transform | itself, `render` at 136-146 | modify |
| `packages/devtools/src/model/SimulationForm.ts` | utility | transform | itself, `stringify` at 95-103 (moves out) | modify |
| `.planning/phases/QD-41-.../41-mutation-base.json` | config | batch | `QD-40-.../40-mutation-base.json` | exact |
| `spec/behaviors/29-devtools-simulator.md` (BEH-QD-541) | spec | n/a | BEH-QD-223 block at line 289 | role |
| `spec/README.md` (CCR-QD-432 row) | spec | n/a | CCR-QD-431 row at line 368 | exact |
| `.changeset/<name>.md` | config | n/a | `.changeset/devtools-malformed-frame-is-a-decode-refusal.md` | role |

## Pattern Assignments

### JSON.stringify inventory (verified)

| File:line | Argument | Unknown value? | Throws today? |
|-----------|----------|----------------|---------------|
| `Remedies.ts:575` | `v: unknown` | yes | **yes, the live defect** |
| `Filters.ts:141` | `value: unknown` | yes | no, inside `try` |
| `SimulationForm.ts:98` | `value: unknown` | yes | no, inside `try` (`stringify`) |
| `SimulationForm.ts:179` `encodeName` | `name: string` | no, out of scope | no |

`jsonText` (`SimulationForm.ts:112`) and `resourceText` (`Filters.ts:127`) call these helpers and do not stringify themselves.

### New primitive (utility, transform)

**Analog:** `SimulationForm.ts:95-103`. This is the guard to lift:
```typescript
/** `JSON.stringify` that answers `undefined` instead of throwing (a `BigInt`, a cycle). */
const stringify = (value: unknown): string | undefined => {
  try {
    const text: string | undefined = JSON.stringify(value);
    return text;
  } catch {
    return undefined;
  }
};
```
It already satisfies D-03 for bigint, circular and throwing `toJSON` or getter. Export it from the new module (named export, `.ts` import extension). Do not add it to `src/index.ts` or the react barrel. `SimulationForm.ts` then imports it instead of declaring `stringify`.

**Package-private precedent:** `packages/devtools/src/index.ts` names exports per module (`export { catalogueOf } from "./model/Catalogue.ts"`). Modules not named there are private, and the `devtools-named-barrel` rule in `scripts/check-house-style.mjs:1855` only refuses `export *` and unsorted specifiers. `WhatIf.ts` and `Remedies.ts` are private and are reached by relative import (`WhatIf.ts:36`: `import { remedyEdits } from "./Remedies.ts"`).

### `Remedies.ts` (modify)

Current, 566-575 (`render`; callers `:255` Size refusal, `:481` subject attribute label, `:496` resource attribute label):
```typescript
const render = (v: unknown): string =>
  typeof v === "string" ? v : String(JSON.stringify(v));
```
Contract to keep byte-identical (D-07): a string is bare. A function, symbol or `undefined` gives the word `undefined`. Other values give JSON. Only values that threw get the new label (a bigint as `10n`, anything else as one fixed placeholder). The shape is `typeof v === "string" ? v : (valueText(v) ?? <fallback>)`. Take care that `valueText` returns `undefined` both for "no JSON form" (function, symbol, which must render `undefined`) and for a throw (which must render the new label). If the primitive cannot tell them apart, the Remedies mapping must check `typeof v === "bigint"` first and must separate the throw case from the function/symbol case. Decide this in the plan.

**Where the throw escapes:**
- `SimulationSession.ts:385-396` `build()` calls `sweepPlan(policyNow, draft, ...)` at 393, and `commit()` (436) calls `store.publish(build())`.
- `WhatIf.ts:173` `derive(...)`, defined at 191-203, calls `remedyEdits(policy, input)` at 201.
- `Remedies.ts` `SubjectAttribute` (~473-486) and `ResourceAttribute` (~488-500) call `render(witnessed.value)`.

The throw is synchronous and escapes `commit()`.

### `Filters.ts` (modify)

Current `render`, 136-146:
```typescript
const render = (value: unknown): ReadonlyArray<string> => {
  if (typeof value === "string") return [value];
  try {
    const rendered = JSON.stringify(value);
    return rendered === undefined ? [] : [rendered];
  } catch {
    return [];
  }
};
```
Becomes `typeof value === "string" ? [value] : (t => t === undefined ? [] : [t])(valueText(value))`, written plainly. `resourceText` (127-128) is unchanged.

### `SimulationForm.ts` (modify)

Delete the local `stringify` and import the primitive. `jsonText` at 112 is the only caller. Keep the round-trip refusal "not representable in the form".

### RED test file (new)

**Remedy level** (`Remedies.test.ts:65-66` and the idiom at 395-400):
```typescript
const labels = (policy: Parameters<typeof remedyEdits>[0], input = alice) =>
  remedyEdits(policy, input).edits.map((e) => e.label);
// e.g. labels(hasAttribute("clearance", gte(5)))
```
`alice` is at `Remedies.test.ts:59`: `{ subject: { id: "alice", attributes: { dept: "legal", tier: 3 } }, ... }`. Probes: `hasAttribute("x", contains(10n))`, `inArray([1n])`, `eq(literal(1n))`, and the circular variants. Resource-attribute variants need an input with a resource (see `Remedies.test.ts:417`).

**Session level** (`SimulationSession.test.ts:53` `sighting`, 114-120 `sessionWith`):
```typescript
const sessionWith = (policy: Policy, input: SimulationInput = withClearance) =>
  Effect.gen(function* () {
    const session = yield* makeSimulationSession({ sightings: [sighting(policy)] });
    session.edit(input);
    return session;
  });
```
It runs under `it.effect`. `edit` calls `commit()`, so the throw shows there. `choosePolicy(policy)` (`SimulationSession.ts:197`) also commits.

**Core builders** (`packages/core/src/Matcher.ts`):
```typescript
169: export const eq = (ref: ValueRef): Matcher => ({ _tag: "Eq", ref });
234: export const inArray = (values: ReadonlyArray<unknown>): Matcher => ({ _tag: "In", values });
284: export const contains = (value: unknown): Matcher => ({ _tag: "Contains", value });
```
`literal(...)` is from core as well; `Remedies.test.ts:776-780` uses `eq(literal(token))`.

### Pinned outputs to keep identical (all already on the base)

| Pin | File:line | Title |
|-----|-----------|-------|
| bare string and JSON labels | `Remedies.test.ts:399` | "offers an attribute value read out of the matcher" (`= 5`) |
| bare string (`contains("fin")`) | `Remedies.test.ts:768` | `labels(hasAttribute("tags", contains("fin")))` (inside an unnamed `it`; read the title) |
| word `undefined` | `Remedies.test.ts:778-781` | "renders a witness JSON cannot represent" (Symbol gives `x = undefined`) |
| Filters `[]` for function/symbol | `Filters.test.ts:296-312` | "a resource value JSON cannot represent contributes nothing rather than 'undefined'" |
| Filters circular | `Filters.test.ts:327-329` | circular resource case (read the title) |
| Form refusal | `SimulationForm.test.ts:385,387` (`reasonOf(...)` equals "not representable in the form"); `SimulationSession.test.ts:1509`; `SimulationFields.test.ts:385,394` | chip rows with `refused: true` |

There is no existing Remedies pin for the `= low` bare string, other than `contains("fin")`. Add a row per consumer to the primitive's test table, as D-12 step 2 says.

### Mutation

`stryker.devtools.mjs`: `mutate: ["packages/devtools/src/model/**/*.ts"]`, so a new model file is mutated automatically. The report is `reports/mutation-devtools/mutation.json`, `thresholds.break` is 80, and the run is perTest with `ignoreStatic`. A file with no mutants has no `files` entry in the report.

Baseline JSON shape (`40-mutation-base.json`):
```json
{ "measured": { "<path>": 0.975, "...": 1 }, "unmeasured": {}, "new": [], "deleted": {} }
```
Scores are ratios in 0..1. For Phase 41 measure `Remedies.ts`, `Filters.ts` and `SimulationForm.ts`, and list the new module under `new`. Apply the 40-01 Deviation 1 default of an empty mutant list, which reads 1, for any file with no entry. Commit the baseline alone and first (40-01 commit `bc19d65e`). The 40-01 writer is described in `40-01-SUMMARY.md` lines 72-80, and the comparison JSON is `40-mutation-after.json`.

### Spec

- BEH-QD-223 is at `spec/behaviors/29-devtools-simulator.md:289`, and the next block, BEH-QD-224, starts at 342. Put BEH-QD-541 after BEH-QD-223 (or after BEH-QD-226 at 466 if it is placed in numeric-by-topic order). Leave BEH-QD-223 untouched. The Change History cell is on line 13, at Rev 1.19, so the next revision is 1.20.
- Bump the revision with `node scripts/spec-revise.mjs spec/behaviors/29-devtools-simulator.md "<what changed>" --date 2026-11-14`. Always pass `--date`.
- CCR template: `spec/README.md:368`, `| CCR-QD-431 | 2026-11-14 | <files with revisions> | ...`. Add the row for CCR-QD-432. The README's own Change History cell (line 13) is currently at 1.177, so bump it as well.
- Reserved numbers only. Never run `scripts/next-id.mjs`.

### Changeset template

`.changeset/devtools-malformed-frame-is-a-decode-refusal.md` (frontmatter `"@qadi/devtools": minor`, then prose). Use this shape with `patch`:
```markdown
---
"@qadi/devtools": patch
---

<one paragraph: the simulator and the panels no longer throw on a bigint or circular value; a remedy over one is still offered, with a degraded label.>
```
Use a kebab-case file name, as the existing ones do.

## Shared Patterns

### Guard
Bare `catch {` with no blanket catch, no `orDie` and no `Result.try`. See `SimulationForm.ts:95-103` and `Filters.ts:140-145`.

### Imports
Relative imports carry `.ts`. Use `import type` for types only. No `effect` namespace import is needed in the primitive.

### Doc comment
One summary line first, then the why in the next paragraph (AGENTS.md preamble).

## No Analog Found

None. Open for the planner: the placeholder wording for a value with no JSON form, and the Remedies label split (see above).

## Metadata

**Analog search scope:** `packages/devtools/src/model`, `packages/devtools/test/model`, `packages/core/src/Matcher.ts`, `spec/`, `.changeset/`, `.planning/phases/QD-40-*`, `stryker.devtools.mjs`
**Pattern extraction date:** 2026-11-14
