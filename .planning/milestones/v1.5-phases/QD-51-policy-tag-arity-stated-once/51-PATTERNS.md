# Phase 51: Policy tag arity stated once - Pattern Map

**Mapped:** 2026-11-16
**Files analyzed:** 14 (3 new src/test sources, 2 modified src, 9 records)
**Analogs found:** 14 / 14 (all git-tracked; checked with `git ls-files`)

The 51-RESEARCH.md prototype diff, `PolicyArity.ts` sketch, tstyche tie shapes and Q7 table are the content to copy. This file only names the analog for each file and the lines to mirror. Do not re-derive them.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/PolicyArity.ts` (new, package-private) | config/type table | transform (compile-time) | `packages/core/src/LeafNeeds.ts` (`as const satisfies` table, out of barrel); `GateState.ts` / `HydrationMetrics.ts` (ADR-QD-152) | exact |
| `packages/core/src/Policy.ts` (mod: `import type`, `satisfies` on `childrenOf`, derived `LeafPolicy`) | model | transform | itself; `LeafNeeds.ts` `type LeafTag = LeafPolicy["_tag"]` for derived-type use | exact |
| `packages/core/src/Decision.ts` (mod: delete `leafTags`/`TraceShape`, `traceShapeOf = POLICY_ARITY[tag]`) | utility | transform | itself, lines 410-446 | exact |
| `packages/core/test/TraceShape.test.ts` (new, committed first) | test | request-response (fold) | `packages/core/test/Decision.test.ts:82-214` (`describe("foldTrace ...")`, its `node` and `uniform` helpers) | exact |
| `packages/core/test/PolicyArity.test.ts` (new) | test | transform | `packages/core/test/LeafNeeds.test.ts` (header comment, `describe("the barrel")` at lines 233-247) | exact |
| `packages/core/test/PolicyArity.tst.ts` (new) | test (type) | compile-time | `packages/core/test/LeafNeeds.tst.ts` (header, `not.toBeAssignableFrom`); `HydrationMetrics.tst.ts:95-115` (`@ts-expect-error`) | exact |
| `.changeset/policy-arity-stated-once.md` | config | n/a | `.changeset/leaf-needs-stated-once.md` | exact |
| `51-mutation-base.json` / `51-mutation-after.json` | evidence | batch | `.planning/phases/QD-50-.../50-mutation-base.json`; 50-06-PLAN.md mutation task | exact |
| `spec/decisions/164-...md` + `index.yaml` | record | n/a | ADR-QD-163 file and its `index.yaml` entry | exact |
| `spec/README.md` CCR-QD-442 row | record | n/a | CCR-QD-441 row (`spec/README.md:378`) | exact |
| `spec/behaviors/25-inspection.md` / `18-explanation.md` (BEH-QD-591..595; stale fence at :184-187) | record | n/a | BEH-QD-318 (beside it); Phase 50 BEH-QD-586..590 in `05-evaluator.md` | role |
| `spec/invariants.md` INV-QD-347/348 | record | n/a | INV-QD-346 (`spec/invariants.md:4002`) | exact |
| `spec/traceability.md` rows | record | n/a | ADR row style `:330-332`, INV row style `:178` | exact |
| `spec/*` revisions | record | n/a | `node scripts/spec-revise.mjs <file> "<what>" --date 2026-11-16`, then `--check` | exact |

## Pattern Assignments

### `packages/core/src/PolicyArity.ts` (type table, compile-time)

**Analog:** `packages/core/src/LeafNeeds.ts`. Mirror these parts:
- Header doc: one-line summary, then the why with ADR citations. LeafNeeds says "Package-private, out of the barrel (ADR-QD-099), and stated as a table so that a leaf added to the policy is a compile error here until it has a row (ADR-QD-163 applying ADR-QD-152, ARCH-97)". Cite ADR-QD-164 applying ADR-QD-152, ARCH-98.
- Type-only imports use `import type`, with the `.ts` extension. `PolicyArity.ts` itself imports NOTHING from `Policy.ts`; madge counts `import type` cycles (D-01a).
- Body: copy the `PolicyArity.ts` block from 51-RESEARCH.md Pattern 1 verbatim (`Arity`, `POLICY_ARITY ... as const satisfies { readonly [tag: string]: Arity }`, `ChildrenOf` with `& { readonly 0?: never }`, `ChildArms`). The closure over `Policy["_tag"]` is checked in `Policy.ts`.
- No `as`, `!` or `any`. `as const` and `satisfies` are fine.

### `packages/core/src/Policy.ts` (3 edits)

Apply the diff in 51-RESEARCH.md Pattern 1 as written.
- `childrenOf` (`Policy.ts:1040-1059`): keep `Match.type<Policy>().pipe(Match.tagsExhaustive({ ... } satisfies ChildArms<Policy, typeof POLICY_ARITY>))`. Keep the doc comment attached to `childrenOf`.
- `LeafPolicy` (`:1122-1126`) becomes `Extract<Policy, { readonly _tag: TagsOfArity<"Leaf"> }>`. `ArityRecord` and `TagsOfArity` stay module-local, NOT exported. `index.ts:32` is `export * from "./Policy.ts"`, so any export lands in the barrel and gate 13 fails.
- Leave `PolicyCases` (`:1144-1161`), `leafCases` (`:1170`) and `policyStep` alone. `leafCases`' return type `Pick<PolicyCases<R>, LeafPolicy["_tag"]>` is the free tie.

### `packages/core/src/Decision.ts` (delete and replace)

Replace `leafTags` (`:418-429`), `TraceShape` (`:432`) and the `traceShapeOf` `Match.whenOr` chain (`:434-441`) with:
```typescript
import { POLICY_ARITY } from "./PolicyArity.ts";
import type { Arity } from "./PolicyArity.ts";
const traceShapeOf = (tag: Trace["policyTag"]): Arity => POLICY_ARITY[tag];
```
The imports go after the existing `Policy.ts` imports at `Decision.ts:16-17`. Keep `traceChildrenOf` (`:443-446`) text unchanged. The `leafTags` doc comment ("a foreign leaf that carries some cannot reach a fold that was told it has none") moves onto `traceChildrenOf`, because that is the behaviour D-09 pins. Leave `traceStep`, `TraceCases` and `foldTrace` unchanged (D-07, D-08).

### `packages/core/test/TraceShape.test.ts` (D-09, first commit, green on the base)

**Analog:** `Decision.test.ts:82-100`, the `describe("foldTrace (ARCH-22 D-22-a)")` block with its `node(policyTag, children = [])` helper and `uniform` arms. Copy the Q7 sketch from 51-RESEARCH.md.
- Use `@effect/vitest` imports as in `LeafNeeds.test.ts` (`import { assert, describe, it } from "@effect/vitest"`).
- `EXPECTED` is hand-written and independent. It must NOT import `POLICY_ARITY`, or the test agrees with itself. `LeafNeeds.test.ts`'s header makes the same point ("reading no table").
- Hand every tag three children and assert what each arm receives. Add the two extra rows from Q7: a wrapper with no children gets `undefined`, and an empty Many gets `[]`.
- Use a new `describe` title so it does not collide with `Decision.test.ts`.

### `packages/core/test/PolicyArity.test.ts` (runtime agreement and barrel pin)

**Analog:** `LeafNeeds.test.ts`.
- Barrel pin (`:233-247`): `assert.isFalse(Object.hasOwn(Core, name), name)` with `import * as Core from "../src/index.ts"`. Names to pin: `"POLICY_ARITY"`. Add `"traceShapeOf"` only if it is exported.
- Agreement checks: the record against `childrenOf`, `foldPolicyCases` and `foldTrace` over a fixture per tag (INV-QD-347).

### `packages/core/test/PolicyArity.tst.ts` (type ties and negatives)

**Analog:** `LeafNeeds.tst.ts` for the header and the `expect<...>().type.not.toBeAssignableFrom(...)` style. `HydrationMetrics.tst.ts:95-115` for the checked-negative form:
```typescript
  // @ts-expect-error does not satisfy the constraint
  expect<HydrationDropReasonOf<"other">>().type.toBe<never>();
  // @ts-expect-error is not assignable to type
  const other: HydrationDropRow = { kind: "other", summary: "s", remedy: "r" };
  expect(other).type.toBe<HydrationDropRow>();
```
Copy the tie tests, the `Moved`/`Disagreeing` helpers and the `childrenOf` negatives from 51-RESEARCH.md Q4. One erroring reference per `@ts-expect-error` directive. Fragments must hold under TS 6.0.3 (tstyche) and 7.0.2 (`pnpm typecheck`), because `pnpm typecheck` compiles `.tst.ts` files. Also pin: `LeafPolicy` is identical to the old `Exclude<...>`, `keyof typeof POLICY_ARITY` is `Policy["_tag"]`, and `TraceCases` is tied (D-06a, with a wrapper clause `readonly [unknown, number | undefined]`).

### `.changeset/policy-arity-stated-once.md`

**Analog:** `.changeset/leaf-needs-stated-once.md` (front matter `"@qadi/core": patch`, then one paragraph in prose). State that no public type or export changes. Do not release.

### Mutation evidence

**Analog:** the 50-06 plan (`:9`, `:24`, `:31`, `:98-103`) and the 50-mutation-base.json shape `{ measured, counts, survivors, new, unmeasured }`. Command:
`pnpm exec stryker run --mutate 'packages/core/src/Policy.ts,packages/core/src/Decision.ts'`, alone and never concurrent. At close, add `PolicyArity.ts` (it yields no mutants). Base scores are `Decision.ts` 0.9586 and `Policy.ts` 0.9865. The only deleted survivor is `Decision.ts` L439.

### Spec records

Follow the Q9 table in 51-RESEARCH.md:
- ADR-QD-164: model it on ADR-QD-163's file and its `index.yaml` entry (`status: "Accepted — applies ADR-QD-152; reads ...; keeps ADR-QD-073, ADR-QD-077"`).
- CCR-QD-442: a row after `spec/README.md:378`.
- INV-QD-347/348: after `spec/invariants.md:4002`, with the Source / Implication / Enforcement / Related shape. INV-QD-090 is kept, not restated.
- BEH-QD-591..595: no new file (see research Q9 for placement).
- `spec/behaviors/25-inspection.md:184-187`: the stale ` ```ts ` LeafPolicy fence. Update it to the `Extract<...>` form in the same edit. It is a signature listing, not compiled.
- Revise each touched spec file with `spec-revise`.
- `spec/overview.md` and AGENTS.md: no edit. Names are unchanged, and gate 13 reports 932 exports before and after.

## Shared Patterns

- **Package-private means out of the barrel** (ADR-QD-099): sibling module, no `export` from `Policy.ts`. Verify with the `Object.hasOwn(Core, ...)` test and `node scripts/check-api-surface.mjs`.
- **Keyed closed table** (ADR-QD-152): `as const satisfies`, so a missing key is TS2741. The `Policy.ts` default type argument is the closure.
- **Checked negatives** are `// @ts-expect-error <fragment>` in `.tst.ts`, never `.type.toRaiseError()`, which breaks `pnpm typecheck`.
- **No new budget moves**: `SWITCH_BUDGET`, `UNTRACED_BUDGET` and the others are unchanged. Run `node scripts/check-house-style.mjs` and `pnpm circular` after the first move.
- **Order of commits**: characterisation test first (green on the base), then base experiment and mutation base recorded, then the source change, then records.

## No Analog Found

None. The one novel technique is `ChildrenOf`'s `& { readonly 0?: never }` Many type (D-05a). It has no repo precedent and is covered by the research proofs and the `.tst.ts` negatives.

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `.changeset`, `.planning/phases/QD-50-*`, `spec/`
**Pattern extraction date:** 2026-11-16
