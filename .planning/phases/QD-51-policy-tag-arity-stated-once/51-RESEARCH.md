# Phase 51: Policy tag arity stated once - Research

**Researched:** 2026-11-16
**Domain:** TypeScript type-level ties inside `@qadi/core` (a keyed record read by a type, a handler record and a trace fold); no runtime change, no new dependency
**Confidence:** HIGH on code facts, compile proofs, the base experiment and mutation scores (all run this session on `9af8604f`); MEDIUM on the one assumed gate (A1)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The arity record (ARTY-01)**
- **D-01:** One keyed record in `Policy.ts`, the ADR-QD-152 pattern: `POLICY_ARITY = { HasPermission: "Leaf", …, Not: "Wrapper", Obliged: "Wrapper", Labeled: "Wrapper", AllOf: "Many", AnyOf: "Many", Rules: "Many" } as const satisfies { readonly [K in Policy["_tag"]]: Arity }`, with `type Arity = "Leaf" | "Wrapper" | "Many"` (a closed union). A missing tag is TS2741; an unknown arity word does not compile.
- **D-02:** Package-private: the record and `Arity` are not exported from `index.ts`. Barrel, `spec/overview.md` and gate 13 unchanged; the changeset is a `@qadi/core` patch. (Exporting it would make it a minor; rejected — no host asked for it.)
- **D-03:** `LeafPolicy` is derived from the record (`Extract<Policy, { readonly _tag: TagsOfArity<"Leaf"> }>`, or equivalent) instead of the hand-written `Exclude<…, "AllOf" | "AnyOf" | "Rules" | "Not" | "Obliged" | "Labeled">`. Its public type is identical (a tstyche equality check proves it); `leafCases` and `LeafNeeds.ts` (keyed by `LeafPolicy["_tag"]`) follow for free.
- **D-04:** `Decision.ts`'s `traceShapeOf` reads the record directly (`POLICY_ARITY[tag]`); `leafTags` and the three `Match.whenOr` lines are deleted, and `TraceShape` becomes `Arity` (or an alias of it). `traceChildrenOf`'s behaviour is unchanged. `Decision.ts` already imports from `Policy.ts`, so no new import edge; re-run `pnpm circular`.

**The readers and the type-level tie (ARTY-02, ARTY-03)**
- **D-05:** `childrenOf` keeps its `Match.tagsExhaustive` runtime unchanged, but its arms are typed by arity: the handler record satisfies `{ [K in Tag]: (p: PolicyOf<K>) => ChildrenOf<Arity[K]> }`, where a Leaf arm returns `readonly []`, a Wrapper arm a one-element tuple and a Many arm `ReadonlyArray<Policy>`. Moving a tag's arity in the record without changing its arm (or vice versa) is a compile error. No runtime change.
- **D-06:** `PolicyCases<R>` stays hand-written (its arm signatures differ per tag: `Rules` receives `RuleResult` rows). A tstyche test ties it to the record: every Leaf tag's arm takes only `node`, every Wrapper tag's arm a single `R` child, every Many tag's arm an array. A checked `@ts-expect-error` negative (or tstyche `.not` assertion) shows that a mismatch fails.
- **D-07:** `Decision.ts`'s `traceStep` is left as it is: it dispatches per tag to the per-tag `TraceCases` arm, which is a different fact from arity (which arm, not how many children); its children shape already comes from `traceChildrenOf`, which now reads the record.
- **D-08:** `foldTrace` stays public and byte-unchanged (its barrel pin and INV-QD-090 tests untouched). `renderTrace` (pre-order with indentation, a line final when its node is met) and `diffTraces` (lockstep over two trees) keep their own explicit-stack walks; ADR-QD-164 states why a shared fold does not fit either. `SWITCH_BUDGET`, `UNTRACED_BUDGET` and every other budget unchanged.

**Evidence and records (WX-01..07)**
- **D-09:** RED/characterisation first, committed on the phase base before any source change: a table test over **every** policy tag pinning its trace shape through `foldTrace` (which children each arm receives: none, the first, all — including a leaf that carries foreign children and a wrapper with extra children), green on the base and after.
- **D-10:** The base experiment is recorded, not committed as code: on the base, move a wrapper tag under "Many" in `Decision.ts` (and a tag's arm in `childrenOf`), run `tsc`, record that it compiles, then revert; record the exact edit and output in the plan SUMMARY and ADR-QD-164. After the change, the same edit fails to compile (the checked negative of D-05/D-06).
- **D-11:** Mutation base for `Policy.ts` and `Decision.ts` recorded first (XC-05 / WX-05 comparison: no drop in a touched file's score, or the D-13-of-Phase-50 rule if killed mutants leave with deleted code). **No bench**: the change replaces a `Match.whenOr` chain on a fold that runs only in `foldTrace` (no in-repo caller) with a record read; nothing on the evaluation path changes.
- **D-12:** Records: ADR-QD-164 (the record, why `renderTrace`/`diffTraces` keep their walks, the recorded base experiment), CCR-QD-442 in `spec/README.md`, BEH-QD-591+ for the arity rule and the trace shapes, INV-QD-347 (every tag has exactly one arity, and every reader agrees with it), traceability rows, `index.yaml`; `@qadi/core` patch changeset. AGENTS.md only if a section names a moved fact.

### Claude's Discretion
- Exact names (`POLICY_ARITY`/`policyArity`, `Arity`, `TagsOfArity`, `ChildrenOf`) and whether `TraceShape` is deleted or aliased.
- Whether the arity-typed `childrenOf` is expressed via `satisfies` on the handler record or a typed helper, as long as the runtime is unchanged and the mismatch is a compile error.

### Deferred Ideas (OUT OF SCOPE)
- Exporting the arity record for hosts (a minor bump) — no consumer asked for it.
- Deriving `PolicyCases` as a mapped type from the record — rejected in discuss (the `Rules` arm's row shape makes it non-uniform).
- Routing `renderTrace`/`diffTraces` through a shared walker — rejected; the ADR states why.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARTY-01 | One closed record gives each tag's arity; `traceShapeOf` reads it, `leafTags` deleted | Q2 (record + closure proof), Q5 (the exact `Decision.ts` diff) |
| ARTY-02 | A type-level test ties `LeafPolicy` and `childrenOf` to the record | Q2 (LeafPolicy identity), Q3 (the `childrenOf` typing and which moves it catches), Q4 (tstyche shapes) |
| ARTY-03 | `foldTrace` unchanged and public; `renderTrace`/`diffTraces` keep their walks, ADR says why | Q1 (neither reads an arity), Q5, Q9 |
| WX-01 | `pnpm check:pr < /dev/null` green | Q10 (per-step timings of the prototype) |
| WX-02 | Records use only reserved ids | Q9 (all reserved ids confirmed free; last used ids) |
| WX-03 | `spec/overview.md` names every added export | Q2 / Open Question 1 (the record must **not** be a `Policy.ts` export, or gate 13 fails) |
| WX-04 | No new `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, ambient clock/console | prototype passed `check-house-style.mjs` ("538 file(s) clean (3 declared switch(es))") |
| WX-05 | Stryker score of touched files does not fall | Q8 (base and prototype scores, 55 s runs) |
| WX-06 | Characterisation before change | Q6, Q7 (the all-tags table, green on the base, kills 32 of 32 moves) |
| WX-07 | Public breaks recorded Breaking | none: no public type or export changes (a `@qadi/core` patch) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Binding directives from `./CLAUDE.md` -> `./AGENTS.md` that bear on this phase [VERIFIED: AGENTS.md read this session]:
- Imports: `effect/*` as submodule namespaces; relative imports carry `.ts`; `import type` is mandatory for type-only imports (`verbatimModuleSyntax`).
- Dispatch on `_tag` uses `Match`, never `switch` (§5a); `SWITCH_BUDGET` is exactly three switches (`evaluateNode`, `judgeMatcher`, `resolveRef`). `UNTRACED_BUDGET` is exactly three `Effect.fnUntraced`. Neither changes here.
- Forbidden: `as`, `as any`, `!`, `any` (§6). `as const` and `as const satisfies` are fine; the existing `// @ts-expect-error <fragment>` directive in a `.tst.ts` is the repo's checked negative.
- A package-private module is one **not in the barrel** (§9, ADR-QD-099): `export * from "./Policy.ts"` publishes every `export` in `Policy.ts`, and gate 13 (`scripts/check-api-surface.mjs`) then demands an overview row.
- Doc-comment shape: one-line summary first, the why after it (§ opening).
- Specification is normative (§11); a `typescript` fence in `spec/` is compiled, a `ts` fence is a signature listing (§12). Documentation is gated (§15): `spec/overview.md` must name every export.
- Hand-wrapping wins (§17); `oxfmt` is not a gate.
- Memory: closed unions over widening; prefer the complete design; release only when asked (no release here).

## Summary

The change is small and compiles cleanly. A package-private record `POLICY_ARITY` plus a few types give every reader of "how many children does this tag have" one source: `LeafPolicy` is derived from it, `childrenOf`'s handler record is `satisfies`-typed against it, `Decision.ts`'s `traceShapeOf` is `POLICY_ARITY[tag]`, and a tstyche test ties `PolicyCases` (and, recommended, `TraceCases`) to it. The emitted JavaScript of `Policy.ts` is byte-identical apart from comments; `Decision.ts` loses the `leafTags` array and a `Match.whenOr` chain for a one-line record read. I built the whole thing in a scratch copy and then in the real tree (reverted afterwards): `tsc -p tsconfig.test.json`, `pnpm circular`, `check-house-style.mjs`, `check-api-surface.mjs`, the full core vitest run (2455 tests), the full tstyche run (61 files, 309 tests) and Stryker all pass.

**Two findings change how the locked decisions are implemented. Neither reopens a decision.**

1. **D-01 and D-02 cannot both hold as worded.** `packages/core/src/index.ts:32` is `export * from "./Policy.ts"`, so anything `Decision.ts` can import from `Policy.ts` is exported from `@qadi/core`. I proved it: a throwaway `export const POLICY_ARITY` in `Policy.ts` makes `check-api-surface.mjs` fail with "`POLICY_ARITY` is exported by @qadi/core and is not named in spec/overview.md" (Open Question 1). The repo's own way to keep something package-private is a sibling module that is not in the barrel (`LeafNeeds.ts`, `FieldLattice.ts`, `TreeFold.ts`). The record therefore belongs in a new `packages/core/src/PolicyArity.ts`, and `Policy.ts` reads it by type. That module must not import from `Policy.ts`, because madge counts `import type`: I reproduced "Found 1 circular dependency! Policy.ts > PolicyArity.ts". The closure over `Policy["_tag"]` is therefore checked in `Policy.ts` (a default type argument with a constraint), which still gives "a missing tag does not compile" (TS2741 at the constraint) and, with one more clause, "an extra tag does not compile".
2. **D-05's stated type has a hole.** With `ReadonlyArray<Policy>` for a Many arm, moving `Not` to `Many` while its arm still returns `[p.policy]` **compiles** (tuple assignable to array; proven, exit 0). Tightening the Many child type to `ReadonlyArray<Policy> & { readonly 0?: never }` closes it: a literal non-empty array is typed as a tuple by the contextual type, and a tuple has a `0` property, so it is refused (`Type 'Policy' is not assignable to type 'never'`), while `p.policies` and `p.rules.map(…)` still pass. Verified under tsc 7.0.2 and TypeScript 6.0.3 (tstyche's target).

On the base, **all 32 single-tag arity moves in `Decision.ts` compile** (`tsc` ok), and the existing `Decision.test.ts` catches only 8 of the 32. The all-tags table test sketched in Q7 is green on the base and fails on all 32.

**Primary recommendation:** add package-private `PolicyArity.ts` (record, `Arity`, `ChildrenOf`, `ChildArms`), edit `Policy.ts` in three places (an `import type`, a `satisfies ChildArms<Policy, typeof POLICY_ARITY>` on `childrenOf`'s handler record, a derived `LeafPolicy`), replace `leafTags`/`traceShapeOf` in `Decision.ts` with `POLICY_ARITY[tag]`, tie `PolicyCases` and `TraceCases` to the record in a tstyche file, and commit the all-tags `foldTrace` table test and the recorded base experiment first.

## Architectural Responsibility Map

This phase is inside one library package (`@qadi/core`); there is no browser, SSR or database tier. The useful split is by layer inside core.

| Capability | Primary Layer | Secondary Layer | Rationale |
|------------|---------------|-----------------|-----------|
| The arity fact (which tag has 0, 1, n children) | `PolicyArity.ts` (new, package-private) | `Policy.ts` (reads it, closes it over the union) | One keyed record; kept out of the barrel (ADR-QD-099) |
| `LeafPolicy`, `childrenOf`, `leafCases` | `Policy.ts` | — | The public ADT surface; derived or typed from the record |
| `PolicyCases` signature | `Policy.ts` (hand-written) | tstyche tie | Per-tag row types differ (`Rules`), so a tie, not a derivation (D-06) |
| Trace shape for `foldTrace` | `Decision.ts` | `PolicyArity.ts` | Reads the record; behaviour unchanged |
| `renderTrace`, `diffTraces` | `Decision.ts`, `TraceDiff.ts` | — | Read `node.children` directly and never an arity; untouched (D-08) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| effect | 4.1.2 | `Match.type().pipe(Match.tagsExhaustive(...))` (unchanged runtime) | the repo's dispatch idiom (§5a); `node_modules/effect` is truth [VERIFIED: the prototype compiled and ran against it] |
| typescript (tsc) | 7.0.2+effect-tsgo.0.67.5 | `pnpm typecheck` | [VERIFIED: `node_modules/.bin/tsc --version`] |
| typescript (tstyche target) | 6.0.3 | the compiler tstyche runs `.tst.ts` under (`tstyche.json` `"target": "6.0.3"`) | [VERIFIED: `tstyche.json`; tstyche output "uses TypeScript 6.0.3"] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tstyche | 7.2.5 | type tests (`*.tst.ts`) | the `PolicyCases`/`TraceCases` tie and the arm-shape negatives |
| vitest + `@effect/vitest` | 5.1.0 | the all-tags table test and the arity-agreement test | runtime characterisation |
| fast-check | in tree | not needed beyond existing lockstep property | — |
| madge | 8.x | `pnpm circular` | after the first move |
| @stryker-mutator/vitest-runner | 10.1.1 | WX-05 | base and after |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sibling `PolicyArity.ts` | The record in `Policy.ts`, exported | Matches D-01's location but is a public export: gate 13 fails until named, a minor changeset, and D-02 reversed (Open Question 1) |
| Sibling `PolicyArity.ts` | `Policy.ts` un-exported record + `export type` alias | `Decision.ts` needs the **value**; no type-only route exists |
| `{ readonly 0?: never }` on Many | A brand on Many arm results | Brands need a runtime wrapper on every arm (D-05: no runtime change) |

**Installation:** none. No package is added or changed.

**Version verification:** `pnpm --version` 10.17.1, `vitest --version` 5.1.0 (node v26.13.0), `tstyche --version` 7.2.5, `tsc --version` 7.0.2, `pnpm exec stryker --version` 10.1.1 [VERIFIED: run this session].

## Package Legitimacy Audit

No external package is installed or upgraded by this phase. The audit is not applicable.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                       PolicyArity.ts   (package-private, NOT in index.ts, imports nothing from Policy.ts)
                       ┌──────────────────────────────────────────────┐
                       │ type Arity = "Leaf" | "Wrapper" | "Many"     │
                       │ POLICY_ARITY = { 16 tags } as const satisfies │
                       │ ChildrenOf<A, Child>   ChildArms<Node, R>    │
                       └───────┬──────────────────────┬───────────────┘
              import type only │                      │ value import
                               ▼                      ▼
   Policy.ts                                    Decision.ts
   ├ ArityRecord = {[K in Policy["_tag"]]: Arity}   ├ traceShapeOf(tag) = POLICY_ARITY[tag]
   ├ TagsOfArity<A, R = typeof POLICY_ARITY>        ├ traceChildrenOf: Leaf → [] / Wrapper → first / Many → all
   │   (R must have every tag and no other)         └ foldTrace (public, byte-unchanged) → traceStep → TraceCases arm
   ├ LeafPolicy = Extract<Policy, {_tag: TagsOfArity<"Leaf">}>
   │      ├─► leafCases : Pick<PolicyCases<R>, LeafPolicy["_tag"]>   (TS2353 if a leaf leaves)
   │      └─► LeafNeeds.ts : { [K in LeafPolicy["_tag"]]: … }        (TS2741 / TS7053)
   ├ childrenOf = Match.tagsExhaustive({…} satisfies ChildArms<Policy, typeof POLICY_ARITY>)
   │      └─► foldPolicy, foldPolicyCases (policyStep) via foldTree/foldTreeBy
   └ PolicyCases<R> (hand-written) ◄── tstyche tie: each arm's parameter list says the record's arity

   renderTrace (Decision.ts) and diffTraces (TraceDiff.ts) read node.children directly: no arity, no change.
```

Trace one tag end to end: `Not` is `"Wrapper"` in the record → `childrenOf`'s `Not` arm must return `readonly [Policy]` → `PolicyCases.Not` takes `(node, child: R)` (tstyche tie) → `traceChildrenOf` hands `foldTrace`'s `Not` arm `children.slice(0, 1)`.

### Recommended Project Structure
```
packages/core/src/
├── PolicyArity.ts        # NEW, package-private: Arity, POLICY_ARITY, ChildrenOf, ChildArms
├── Policy.ts             # 3 edits: import type, childrenOf `satisfies`, derived LeafPolicy
└── Decision.ts           # leafTags + whenOr chain → POLICY_ARITY[tag]
packages/core/test/
├── TraceShape.test.ts    # NEW: the all-tags foldTrace table (first commit, green on the base)
├── PolicyArity.test.ts   # NEW: record agrees with an independent table, with childrenOf/foldPolicyCases/foldTrace, barrel exports none of it
└── PolicyArity.tst.ts    # NEW: tie PolicyCases + TraceCases, LeafPolicy identity, ChildrenOf shapes, @ts-expect-error negatives
```

### Pattern 1: the ADR-QD-152 keyed record, closed over the union in the reader
**What:** the record declares its words; the module that owns the union closes it. **Why here:** `PolicyArity.ts` cannot import `Policy.ts` without a madge cycle, so the closure check moves to `Policy.ts`.

`PolicyArity.ts` [VERIFIED: compiled and exercised in the prototype, tsc 7.0.2 and TS 6.0.3]:
```typescript
export type Arity = "Leaf" | "Wrapper" | "Many";

export const POLICY_ARITY = {
  HasPermission: "Leaf",
  HasRole: "Leaf",
  HasAttribute: "Leaf",
  HasResourceAttribute: "Leaf",
  HasRelationship: "Leaf",
  HasAction: "Leaf",
  HasActed: "Leaf",
  HasNotActed: "Leaf",
  HasCustom: "Leaf",
  HasSignature: "Leaf",
  Not: "Wrapper",
  Obliged: "Wrapper",
  Labeled: "Wrapper",
  AllOf: "Many",
  AnyOf: "Many",
  Rules: "Many",
} as const satisfies { readonly [tag: string]: Arity };

/** What an arm of `Arity` `A` may return as children of `Child`. A Many arm may not be a literal non-empty array. */
export type ChildrenOf<A extends Arity, Child> = A extends "Leaf"
  ? readonly []
  : A extends "Wrapper"
    ? readonly [Child]
    : ReadonlyArray<Child> & { readonly 0?: never };

/** One arm per tag of `Node`, each returning the children its arity in `R` allows. */
export type ChildArms<
  Node extends { readonly _tag: string },
  R extends { readonly [K in Node["_tag"]]: Arity },
> = {
  readonly [K in Node["_tag"]]: (p: Extract<Node, { readonly _tag: K }>) => ChildrenOf<R[K], Node>;
};
```

`Policy.ts` — the whole diff [VERIFIED: applied to a copy of the real file; `tsc` exit 0; emitted `Policy.js` differs from the base in comments only]:
```diff
+import type { Arity, ChildArms, POLICY_ARITY } from "./PolicyArity.ts";
 …
     Labeled: (p) => [p.policy],
-  }),
+  } satisfies ChildArms<Policy, typeof POLICY_ARITY>),
 …
-/** The ten `Policy` tags that have no children. */
-export type LeafPolicy = Exclude<
-  Policy,
-  { readonly _tag: "AllOf" | "AnyOf" | "Rules" | "Not" | "Obliged" | "Labeled" }
->;
+/** One arity for each `Policy` tag, and for no other word. */
+type ArityRecord = { readonly [K in Policy["_tag"]]: Arity };
+
+type TagsOfArity<
+  A extends Arity,
+  R extends ArityRecord & { readonly [K in Exclude<keyof R, Policy["_tag"]>]: never } = typeof POLICY_ARITY,
+> = { [K in keyof R]: R[K] extends A ? K : never }[keyof R];
+
+/** The ten `Policy` tags that have no children: the ones `POLICY_ARITY` calls `Leaf`. */
+export type LeafPolicy = Extract<Policy, { readonly _tag: TagsOfArity<"Leaf"> }>;
```
`Policy.ts` keeps `Match.type<Policy>().pipe(Match.tagsExhaustive(...))`; `satisfies` is erased, so the runtime is the same object literal. Keep `childrenOf`'s doc comment attached to `childrenOf`.

### Anti-Patterns to Avoid
- **Exporting the record from `Policy.ts`** to avoid a new file: it lands in the barrel (`export *`) and gate 13 fails (Open Question 1).
- **`PolicyArity.ts` importing `Policy.ts`** (even `import type`): madge counts it; `pnpm circular` fails.
- **A plain `ReadonlyArray<Policy>` for Many**: a Wrapper-to-Many move compiles (the D-05 hole).
- **Restating the arity in the test's expected table by importing `POLICY_ARITY`**: the D-09 table must be hand-written and independent, or it passes whatever the record says.
- **`export type TagsOfArity`/`ArityRecord` from `Policy.ts`**: they would also leak through `export *`. They stay module-local; `tsc` emits them as non-exported declarations in `Policy.d.ts` (checked).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Which tags are Leaf" | a second literal list, in `Decision.ts` or a test helper | `TagsOfArity<"Leaf">` / `POLICY_ARITY[tag]` | the whole point; the base's `leafTags` is exactly the failure |
| A checked negative | a comment or a try/catch test | `// @ts-expect-error <message fragment>` in the `.tst.ts` (precedent `HydrationMetrics.tst.ts:102-110`) | tsc consumes the directive; tstyche checks the fragment |
| Proving two types identical | mutual `toBeAssignableTo` | tstyche `expect<A>().type.toBe<B>()` | identity, not assignability; probe passed incl. a negative control |
| "Is this tag a leaf" at runtime | `leafCases(...)` keys or `Object.hasOwn` on a list | `POLICY_ARITY[tag] === "Leaf"` in tests only | the one record |

**Key insight:** every reader keeps its own *semantics* (which arm, which row shape, which walk order). Only the count of children is shared, and the compiler can only enforce that where the reader is typed against the record, so each reader is either derived from it, typed against it, or tied to it by a type test.

## Runtime State Inventory

Not a rename, rebrand or migration phase: nothing is stored, registered or cached under a tag name, and no runtime behaviour changes. Stored data: none. Live service config: none. OS-registered state: none. Secrets/env: none. Build artifacts: none stale (`packages/*/lib` is gitignored and rebuilt by `tsc -b`; a stale `lib/` from an earlier build does not affect `vitest`, which imports `src/`). *Verified by*: the change adds one module and edits type positions plus one function body.

## Findings by Question

### Q1. Inventory: every place that states a tag's arity

[VERIFIED: grep over `packages/*/src` and reads of each file, this session]

| # | Site | Fact it states | Tied by | Disposition |
|---|------|----------------|---------|-------------|
| 1 | `Policy.ts:1040-1059` `childrenOf` | 0 / 1 / n children per tag | `Match.tagsExhaustive` (names only) | **D-05**: handler record `satisfies ChildArms<Policy, typeof POLICY_ARITY>` |
| 2 | `Policy.ts:1122-1126` `LeafPolicy` = `Exclude<Policy, { readonly _tag: "AllOf" \| "AnyOf" \| "Rules" \| "Not" \| "Obliged" \| "Labeled" }>` | the leaf set, as its complement | nothing | **D-03**: derived |
| 3 | `Policy.ts:1144-1161` `PolicyCases` | arm parameter list per tag (`node`; `node, child: R`; `node, children: ReadonlyArray<R>`; `Rules`: `ReadonlyArray<RuleResult<R>>`) | nothing | **D-06**: stays; tstyche tie (Q4) |
| 4 | `Policy.ts:1170-1181` `leafCases` | the ten leaf keys | return type `Pick<PolicyCases<R>, LeafPolicy["_tag"]>` | follows D-03 for free: a leaf moved out gives TS2353 at `:1181` (measured) |
| 5 | `Policy.ts:1194-1217` `policyStep` | how each tag calls its `PolicyCases` arm (`p.policies.map`, `resultOf(p.policy)`, rows) | each call type-checks against `PolicyCases`; the lockstep property `Policy.test.ts:1025-1039` | **left** (D-06 scope); the tie is `PolicyCases` ↔ record plus the runtime lockstep |
| 6 | `Decision.ts:418-429` `leafTags` | the ten leaf tags, as an array | nothing | **D-04**: deleted |
| 7 | `Decision.ts:432-441` `TraceShape`, `traceShapeOf` | Leaf / Wrapper / Many per tag in three `Match.whenOr` lines | `Match.exhaustive` (names only) | **D-04**: `POLICY_ARITY[tag]`; `TraceShape` deleted (it is private, unexported) |
| 8 | `Decision.ts:443-446` `traceChildrenOf` | `[]` / first / all by shape | reads `traceShapeOf` | unchanged text |
| 9 | `Decision.ts:389-406` `TraceCases` | arm parameter list per tag; wrapper child is `R \| undefined` | nothing | **not named in D-06**; the same tstyche tie works (probed) — recommended, Open Question 3 |
| 10 | `Decision.ts:448-467` `traceStep` | which arm a tag calls and which of `children` it passes | per-arm type check | **D-07**: left |
| 11 | `LeafNeeds.ts:165-174`, `:149`, `:204-225` | keyed by `LeafPolicy["_tag"]` | the derived `LeafPolicy` | follows D-03 for free (TS2353 / TS2741 / TS7053 when a leaf moves; measured) |
| 12 | `Policy.ts:1076-1095` `fieldsOf`, `:1243-1262` `matcherOf` | *which tags carry `fields` / a matcher* | `Match.tagsExhaustive` | **different facts**, not arity (`fields` coincides with the Leaf set today) — leave |
| 13 | `Explanation.ts:129-139` `explanationChildrenOf`, `Matcher.ts` `matcherChildrenOf` | children of **other** ADTs | — | out of scope (CONTEXT) |
| 14 | `Walk.ts` `evaluateNode` (budgeted switch #1), `Predicate.ts`, `Simplify.ts`, `devtools/model/Remedies.ts` | per-tag semantics through `PolicyCases` or the switch | `PolicyCases` signature (and so the tstyche tie) | unchanged; ADR-QD-073/077 forbid re-proposing the composite folds |
| 15 | `Decision.ts:564-590` `renderTrace`, `TraceDiff.ts:266-281` `diffTraces` | **no arity**: both iterate `node.children` / `a.children`/`b.children` for every tag | — | D-08: untouched; the ADR's reason is that they never read an arity (a leaf carrying foreign children is *rendered* by `renderTrace`, and *not walked* by `foldTrace`) |

No other `packages/*/src` file lists leaf, wrapper or many tags by hand: `grep` for `"Obliged"` finds only `Decision.ts`, `Explanation.ts`, `Policy.ts`, `Predicate.ts`, `Simplify.ts`, `Walk.ts`, `devtools/src/model/Remedies.ts`, and the last four read children through `PolicyCases` or the budgeted switch. `foldTrace`'s only users are tests (`Decision.test.ts`).

### Q2. The record and the derived `LeafPolicy`

Built in a copy of `packages/core/{src,test}` under the scratchpad (symlinked `node_modules`), compiled with `tsc -p packages/core/tsconfig.src.json --outDir <scratch>`, then again in the real tree (reverted).

(a) **A missing tag is a compile error.** Removing `HasRole` from the record (final variant, sibling module): `Policy.ts(1059,33): error TS2741: Property 'HasRole' is missing in type '{ readonly HasPermission: "Leaf"; …}'` (at the `satisfies ChildArms<Policy, typeof POLICY_ARITY>` line), `Policy.ts(1134,89): error TS2344: Type '{ … }' does not satisfy the constraint` (at the `TagsOfArity` default type argument), `Simplify.ts(100,7) TS2741`, `LeafNeeds.ts(165,3) TS2353` and `Decision.ts(421,58) TS7053`. An **unknown arity word** (`Not: "Wrap"`): `TS2322: Type '"Wrap"' is not assignable to type 'Arity'`. An **extra tag** (`Bogus: "Leaf"`): compiles with a plain `R extends ArityRecord`; with the `& { readonly [K in Exclude<keyof R, Policy["_tag"]>]: never }` clause it is `TS2344`. Use the clause.

(b) **The derived `LeafPolicy` is identical to today's.** tstyche (TS 6.0.3) `expect<LeafPolicy>().type.toBe<Exclude<Policy, { readonly _tag: "AllOf" | … }>>()` passed, and `expect<keyof typeof POLICY_ARITY>().type.toBe<Policy["_tag"]>()` passed; a negative control (`not.toBe<Exclude<OldLeaf, HasRole>>`) passed.

(c) **`LeafNeeds.ts` and `leafCases` still compile**, and they are the live tie: moving `HasRole` to `Wrapper` or `Many` gives `LeafNeeds.ts(165,3) TS2353`, `LeafNeeds.ts(262,38) TS2339`, `Policy.ts(1181,3) TS2353`, `Predicate.ts(395,75) TS2345`, `Simplify.ts(100,7) TS2741`, `Walk.ts(323,28) TS2345`.

(d) **`.d.ts` emission is clean; the barrel is the real hazard.** Un-exported `type Arity`, `declare const POLICY_ARITY` and `type TagsOfArity` are emitted as non-exported declarations in `Policy.d.ts` (no TS2883/TS4023); the final variant emits `import type { Arity, POLICY_ARITY } from "./PolicyArity.ts"` and a local `type TagsOfArity`. A published `.d.ts` importing a non-barrel module already exists: `packages/core/lib/Decision.d.ts:2` `import type { VisibleFields } from "./FieldLattice.ts"` [VERIFIED: read]. Gate 14 was not run (A1). The hazard: a record exported from `Policy.ts` makes `node scripts/check-api-surface.mjs` print `[missing] 'Arity' is exported by @qadi/core and is not named in spec/overview.md…` and the same for `POLICY_ARITY` (run this session, then reverted). With `PolicyArity.ts` out of the barrel the gate prints `api-surface: 932 export(s) documented across 9 package(s)`, the base figure.

### Q3. `childrenOf` typed by arity, both directions

Proven by editing the record and recompiling (final variant, tsc 7.0.2; the same shapes under TS 6.0.3 for the tuple direction):

| Record move, arm unchanged | Compile result |
|---|---|
| Wrapper → Many (`Not`, `Obliged`, `Labeled`) | **error** `Policy.ts(1056,18) TS2322: Type 'Policy' is not assignable to type 'never'` — only with `{ readonly 0?: never }`; with a plain `ReadonlyArray<Policy>` it **compiles (exit 0)** |
| Many → Wrapper (`AllOf`) | error `TS2322: Type 'readonly Policy[]' is not assignable to type 'readonly [Policy]'` |
| `Rules` → Wrapper | error `TS2322: Type 'Policy[]' is not assignable to type 'readonly [Policy]'` |
| Leaf → Wrapper | error `TS2322: Type '[]' is not assignable to type 'readonly [Policy]'` (+ `LeafPolicy` consumers) |
| Wrapper → Leaf, Many → Leaf | error `[Policy]` / `readonly Policy[]` not assignable to `readonly []` (+ `LeafNeeds` missing row) |
| **Leaf → Many** | **the one move `childrenOf`'s types cannot catch**: `[]` is a valid empty Many. Caught instead by the derived `LeafPolicy` (above: `leafCases`, `LeafNeeds.ts`, `Predicate.ts`, `Walk.ts`, `Simplify.ts` all fail) and by the tstyche `PolicyCases` tie, which fails for all 32 moves |
| Arm moved, record unchanged: `Not: () => []`, `Not: (p) => [p.policy, p.policy]` | both errors (`'[]'` / `'[Policy, Policy]'` not assignable to `'readonly [Policy]'`) |
| `AllOf: () => []`, `AllOf: (p) => p.policies.slice(0, 1)` | compile (a Many may be empty or short); the runtime lockstep property catches `() => []` (17 failures measured on the base for the same edit) |

How the trick works: an array literal whose contextual type has a numeric-like property `"0"` is typed as a tuple, and a tuple has `0: Policy`, which is not assignable to `0?: never`; a `Policy[]` has no `0` property and is accepted. Cost: a Many arm may not return a literal non-empty array; every real Many arm reads an existing array (`p.policies`, `p.rules.map(...)`), so no current arm is affected, and a future fixed-two-children tag would be a Wrapper-like new arity, which is the point. The message is opaque, so the comment on `ChildrenOf` must say why, and the `@ts-expect-error` fragments below pin it.

`ChildArms<Node, R>` is generic over the record (not over `Policy`) so the negatives can be written against `ChildArms<Policy, MovedRecord>`: the real arms literal in `Policy.ts` is not exported and must stay unexported (it would leak through the barrel).

### Q4. tstyche: configuration, existing style, the tie

Configuration [VERIFIED: `tstyche.json`, `package.json`]: `{ "target": "6.0.3", "tsconfig": "tsconfig.test.json" }`; `pnpm test:tstyche` = `tstyche`; test files are `*.tst.ts` anywhere (`packages/core/test/*.tst.ts`: 29 of them); one file: `node_modules/.bin/tstyche packages/core/test/Policy.tst.ts` (≈2 s). **`tsc -p tsconfig.test.json` (`pnpm typecheck`) also compiles every `.tst.ts`**, so a negative must be a `// @ts-expect-error <fragment>` directive, not a bare error and not `expect(() => …).type.toRaiseError()` (I tried the latter: tsc reports TS2322 in the test file). Existing style: `LeafNeeds.tst.ts` (`expect<LeafNeedOf<…>>().type.toBe<…>()`, `not.toBeAssignableFrom`), `Policy.tst.ts:73-87` (`expect<Parameters<PolicyCases<number>["Not"]>[1]>().type.toBe<number>()`), `HydrationMetrics.tst.ts:102-110` (`// @ts-expect-error is not assignable to type`).

The `PolicyCases` tie, **passed** under tstyche (TS 6.0.3) [VERIFIED: prototype]:
```typescript
type Tag = Policy["_tag"];
type Rec = typeof POLICY_ARITY;

/** What a PolicyCases arm's own parameter list says about its children, with R = number. */
type ArmArity<K extends Tag> =
  Parameters<PolicyCases<number>[K]> extends readonly [unknown] ? "Leaf"
  : Parameters<PolicyCases<number>[K]> extends readonly [unknown, number] ? "Wrapper"
  : Parameters<PolicyCases<number>[K]> extends readonly [unknown, ReadonlyArray<unknown>] ? "Many"
  : never;

type Moved<T extends Tag, A extends Arity> = { readonly [K in Tag]: K extends T ? A : Rec[K] };

/** Tags whose arm disagrees with the record `R`. */
type Disagreeing<R extends { readonly [K in Tag]: Arity }> = {
  [K in Tag]: [ArmArity<K>] extends [R[K]] ? ([R[K]] extends [ArmArity<K>] ? never : K) : K;
}[Tag];

test("every PolicyCases arm states the arity the record gives its tag", () => {
  expect<Disagreeing<Rec>>().type.toBe<never>();
});
test("any single-tag move disagrees with PolicyCases at exactly that tag (all 32)", () => {
  type EveryMove = { [K in Tag]: { [A in Exclude<Arity, Rec[K]>]:
    [Disagreeing<Moved<K, A>>] extends [K] ? ([K] extends [Disagreeing<Moved<K, A>>] ? true : false) : false;
  }[Exclude<Arity, Rec[K]>] };
  expect<EveryMove>().type.toBe<{ [K in Tag]: true }>();
});
test("negative control", () => { expect<Disagreeing<Moved<"Not", "Many">>>().type.toBe<"Not">(); });
```
For `TraceCases`, change the Wrapper clause to `readonly [unknown, number | undefined]` (its wrapper child is `R | undefined`); same two assertions passed, with `Disagreeing<Moved<"Obliged","Many">>` equal to `"Obliged"`.

The `childrenOf` negatives, **passed** with tstyche and with `tsc -p tsconfig.test.json` (the directive is consumed):
```typescript
test("the arm as written is accepted for the record as it stands", () => {
  const arm: ChildArms<Policy, Rec>["Not"] = (p) => [p.policy];
  expect(arm).type.toBe<ChildArms<Policy, Rec>["Not"]>();
});
test("moving Not to Many with its arm unchanged is refused (the tuple direction)", () => {
  // @ts-expect-error is not assignable to type 'never'
  const arm: ChildArms<Policy, Moved<"Not", "Many">>["Not"] = (p) => [p.policy];
  expect(arm).type.toBe<ChildArms<Policy, Moved<"Not", "Many">>["Not"]>();
});
test("moving AllOf to Wrapper with its arm unchanged is refused (the array direction)", () => {
  // @ts-expect-error is not assignable to type 'readonly [Policy]'
  const arm: ChildArms<Policy, Moved<"AllOf", "Wrapper">>["AllOf"] = (p) => p.policies;
  expect(arm).type.toBe<ChildArms<Policy, Moved<"AllOf", "Wrapper">>["AllOf"]>();
});
test("a record missing a tag is refused", () => {
  type Missing = Omit<Rec, "HasRole">;
  // @ts-expect-error does not satisfy the constraint
  type Arms = ChildArms<Policy, Missing>;
  expect<keyof Arms>().type.toBe<Tag>();
});
```
A directive that matches two errors in one statement leaves the second unsuppressed (my first attempt did): keep one erroring reference per directive. The `ChildrenOf` shape pins (`readonly []` not assignable to Wrapper; `[Policy]` and `readonly [Policy, Policy]` not assignable to Many; `readonly []` **is** assignable to Many, the documented gap) also passed. Add `expect(childrenOf).type.toBe<(self: Policy) => ReadonlyArray<Policy>>()` to pin that the public signature did not move.

### Q5. `traceShapeOf` rewrite (D-04)

Exact change [VERIFIED: applied, compiled, full core suite green]:
```diff
 import { DEFAULT_MAX_DEPTH, POLICY_TAGS } from "./Policy.ts";
 import type { Policy } from "./Policy.ts";
+import { POLICY_ARITY } from "./PolicyArity.ts";
+import type { Arity } from "./PolicyArity.ts";
 …
-const leafTags = [ "HasPermission", …, "HasSignature" ] as const;
-/** How a tag's trace node is folded: nothing beneath it, one child, or all of them. */
-type TraceShape = "Leaf" | "Wrapper" | "Many";
-const traceShapeOf: (tag: Trace["policyTag"]) => TraceShape = Match.type<Trace["policyTag"]>().pipe(
-  Match.whenOr(...leafTags, (): TraceShape => "Leaf"),
-  Match.whenOr("Not", "Obliged", "Labeled", (): TraceShape => "Wrapper"),
-  Match.whenOr("AllOf", "AnyOf", "Rules", (): TraceShape => "Many"),
-  Match.exhaustive,
-);
+const traceShapeOf = (tag: Trace["policyTag"]): Arity => POLICY_ARITY[tag];
```
Keep `traceShapeOf` as the one-line function (ARTY-01's wording, one named site) rather than inlining. `Decision.ts:16-17` already imports value `POLICY_TAGS`/`DEFAULT_MAX_DEPTH` and type `Policy` from `Policy.ts`; the **only new edge is `Decision.ts → PolicyArity.ts`**, and `PolicyArity.ts` imports nothing, so `pnpm circular` printed "No circular dependency found!" with the prototype (and printed one when `PolicyArity.ts` imported `Policy.ts`).

Behaviour identical, including a leaf carrying foreign children and a wrapper with extra children: the all-tags table (Q7) is green on the base and after. A tag the union does not have (a hand-built `Trace` cast through `unknown`) throws the same error on both: for `"Bogus"`, `"toString"`, `"constructor"`, `"__proto__"`, `"hasOwnProperty"` the base throws `Error: effect/match/Match/exhaustive: absurd` from `traceShapeOf`; after, `POLICY_ARITY["toString"]` returns an inherited function (treated as Many, harmless), and `traceStep`'s `Match.exhaustive` throws the **same** message one call later (probe output identical on both). `traceChildrenOf` has no other caller.

### Q6. The base experiment (D-10), run on `9af8604f`

`tsc -p packages/core/tsconfig.src.json --outDir <scratch> --tsBuildInfoFile <scratch>/tsbi` (the typecheck of core without touching `lib/`); untouched base: `exit 0`.

**Experiment 1 (the roadmap's):** in `Decision.ts` move `"Not"` from the Wrapper `whenOr` to the Many one:
```diff
-  Match.whenOr("Not", "Obliged", "Labeled", (): TraceShape => "Wrapper"),
-  Match.whenOr("AllOf", "AnyOf", "Rules", (): TraceShape => "Many"),
+  Match.whenOr("Obliged", "Labeled", (): TraceShape => "Wrapper"),
+  Match.whenOr("Not", "AllOf", "AnyOf", "Rules", (): TraceShape => "Many"),
```
Output: `exit 0` (compiles). Reverted with `git checkout -- packages/core/src/Decision.ts`.

**Experiment matrix (all 32 single-tag moves** of `traceShapeOf`, leaf moves also edit `leafTags`): `tsc` ok for **all 32**; `Decision.test.ts` fails for only 8 (`HasRole` ×2, `Not` ×2, `AllOf` ×2, `Rules` ×2); the other 24 (every other leaf, `Obliged`, `Labeled`, `AnyOf`) pass silently. The all-tags table in Q7 fails on all 32.

**Experiment 2 (`childrenOf` arm moved, record absent):** on the base `Not: () => []`, `Not: (p) => [p.policy, p.policy]` and `AllOf: () => []` all compile (`tsc` ok); the runtime tests fail (14, 1 and 17 failures in `Policy.test.ts` + `Decision.test.ts` + `Explanation.test.ts`). After the change the first two are `TS2322` and the third still compiles (a Many may be empty).

Exact commands for the plan's SUMMARY and ADR-QD-164: the edit above; `node_modules/.bin/tsc -p packages/core/tsconfig.src.json --outDir "$SCRATCH/out" --tsBuildInfoFile "$SCRATCH/out/tsbi"` (expected `exit 0`); `git checkout -- packages/core/src/Decision.ts`; `git status --short` shows only `.planning/config.json` plus the untracked files already there. **Expected post-change failure** for the same edit: it cannot be expressed (there is no list to edit); the equivalent edit is the record, `Not: "Many"`, which fails `Policy.ts(1056,18) TS2322: Type 'Policy' is not assignable to type 'never'`; `Rules: "Wrapper"` fails `TS2322: Type 'Policy[]' is not assignable to type 'readonly [Policy]'`; and `Disagreeing<Moved<"Not","Many">>` is `"Not"` in the tstyche tie.

### Q7. The all-tags trace-shape table (D-09)

Existing foldTrace tests [VERIFIED: `Decision.test.ts:82-214`] cover specific tags only (a mixed tree, "does not walk a leaf's children" with `HasRole`/`HasAction`/`Not`, 100k deep with `Not`, 250k wide with `AllOf`, sharing, a cycle, one arm per tag). `foldTrace` has no `src` caller; `RenderTrace.test.ts`/`TraceDiff.test.ts` use `TraceOracle.ts` (frozen `renderTrace`/`diffTraces` oracles) and never `foldTrace`. The table below is new, imports nothing the change adds, and was run **green on the base** (17 tests), **green on the prototype**, and **red for all 32 moves** of Q6 [VERIFIED]:
```typescript
type Tag = Policy["_tag"];
type Shape = "Leaf" | "Wrapper" | "Many";

/** Hand-written from INV-QD-090 and `childrenOf`; not read from POLICY_ARITY or any list the change adds. */
const EXPECTED: { readonly [K in Tag]: Shape } = { /* the 16 tags, as in the record */ };

const node = (policyTag: Tag, children: ReadonlyArray<Trace> = []): Trace =>
  ({ policyTag, allowed: true, children, obligations: [] });

const logging = (visited: Array<string>): TraceCases<string> => {            // every arm logs its own tag
  const leaf = (n: Trace) => { visited.push(n.policyTag); return n.policyTag; };
  const many = (n: Trace, kids: ReadonlyArray<string>) => { visited.push(n.policyTag); return `${n.policyTag}[${kids.join(",")}]`; };
  const wrapper = (n: Trace, kid: string | undefined) => { visited.push(n.policyTag); return `${n.policyTag}<${kid ?? "-"}>`; };
  return { HasPermission: leaf, /* …nine more leaves */ AllOf: many, AnyOf: many, Rules: many,
           Not: wrapper, Obliged: wrapper, Labeled: wrapper };
};

const marks = [node("HasRole"), node("HasAction"), node("HasPermission")] as const;
for (const tag of POLICY_TAGS) it(`${tag} is a ${EXPECTED[tag]}`, () => {
  const visited: Array<string> = [];
  const result = foldTrace(node(tag, marks), logging(visited));   // three children under EVERY tag
  // Leaf: visited [tag], result tag.   Wrapper: visited ["HasRole", tag], result `${tag}<HasRole>`.
  // Many:  visited ["HasRole","HasAction","HasPermission", tag], result `${tag}[HasRole,HasAction,HasPermission]`.
});
it("the table names every tag exactly once", () => {
  assert.deepStrictEqual(Object.keys(EXPECTED).sort(), [...POLICY_TAGS].sort());
});
```
Add two rows the sketch lacks: a wrapper with **no** children hands its arm `undefined` (all three wrappers), and an empty Many hands `[]`. Place it in a new `TraceShape.test.ts` (separately committable, no `describe` collision with `Decision.test.ts`'s `foldTrace` block). A file-scope `const EXPECTED` typed `{ readonly [K in Tag]: Shape }` is a fourth restatement in a test, deliberately: it is the independent oracle.

### Q8. Mutation (D-11 / WX-05)

`stryker.config.mjs` `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]` covers `Policy.ts`, `Decision.ts` and the new `PolicyArity.ts` [VERIFIED: read]. `ignoreStatic: true` means module-scope literals are not mutated: **`PolicyArity.ts` produced no mutants and does not appear in the report**. No `*mutation*.json` exists for `Policy.ts`/`Decision.ts` before this research; the latest per-phase files are `QD-43..50-mutation-base/after.json` and only list each phase's touched files.

**Exact command** (alone, never concurrent with another heavy job; 55 s at the base, 54 s with the prototype):
```bash
pnpm exec stryker run --mutate 'packages/core/src/Policy.ts,packages/core/src/Decision.ts'
# at close: …,'packages/core/src/PolicyArity.ts' (adds nothing; keep it for the record)
```
Reports: `reports/mutation/mutation.json` (gitignored); copy it out and write `51-mutation-base.json` with the 50-style shape `{ measured, counts, survivors, new, unmeasured }`.

**Scores at HEAD** [VERIFIED: Stryker run this session, score = (killed + timeout) / (killed + timeout + survived + no coverage)]:

| File | Killed + timeout | Survived | No cov | Ignored | Base score | Prototype + table test |
|------|-----------------:|---------:|-------:|--------:|-----------:|-----------------------:|
| `Decision.ts` | 160 + 2 | 6 | 1 | 25 | **0.9586** | 158 + 2, 5 survived, 1 no cov: **0.9639** |
| `Policy.ts` | 146 + 0 | 2 | 0 | 141 | **0.9865** | identical: **0.9865** |

Base survivors: `Decision.ts` L104 `NoCoverage BooleanLiteral trace.allowed`; L354 `ConditionalExpression true` (`isFieldOf`); L358, L359 `BooleanLiteral false` (`writable`, `configurable`); **L439 `StringLiteral ""` in `Match.whenOr("AllOf","AnyOf","Rules", (): TraceShape => "Many")`** (deleted by this phase); L581 `ArithmeticOperator +1` and L583 `ConditionalExpression true` (`renderTrace`). `Policy.ts`: L1272 `EqualityOperator value >= max` (`maxOf`), L815 `StringLiteral "" ` in `defaultFieldStrategy("AnyOf")`. After: the same set minus L439, so no new survivor and no score drop; the fold runs in 55 s, so the D-13-of-Phase-50 arithmetic wrinkle does not arise (killed mutants left with the deleted `whenOr` lines, but a survivor left with them too, so `Decision.ts` rises).

### Q9. Spec records (D-12)

Reserved ids are free: `grep` for `BEH-QD-59[1-5]`, `INV-QD-34[78]`, `CCR-QD-442`, `ADR-QD-164`, `ARCH-98` over `spec/`, `AGENTS.md`, `packages/`, `.changeset/`, `features/` found nothing. Last used: `INV-QD-346` at `spec/invariants.md:4002`, `CCR-QD-441` at `spec/README.md:378`, `BEH-QD-590` at `spec/behaviors/05-evaluator.md:325`, `ADR-QD-163` last in `spec/decisions/index.yaml`.

| Record | Where | Shape (precedent read this session) |
|--------|-------|--------------------------------------|
| **ADR-QD-164** | `spec/decisions/164-policy-tag-arity-is-stated-once.md` + `index.yaml` entry | `- id: "ADR-QD-164"` / `file: "164-….md"` / `title: "…"` / `status: "Accepted — applies ADR-QD-152; reads ADR-QD-090, ADR-QD-101, ADR-QD-099; keeps ADR-QD-073, ADR-QD-077"` (ADR-QD-163's entry is the model). File: `# ADR-QD-164 — …`, a Document Control table (`Document ID QADI-ADR-164`), then Context / Decision. Content: the record and why it is a sibling module (barrel `export *`, gate 13, madge counts `import type`); `renderTrace`/`diffTraces` read no arity and need pre-order-with-final-lines / two-tree lockstep, so a bottom-up per-tag fold does not fit (`foldTrace` drops a leaf's foreign children, `renderTrace` shows them); the recorded base experiment (Q6, with the 32 / 8 / 32 counts); the `{ 0?: never }` tuple trick and the one gap (Leaf → Many) |
| **CCR-QD-442** | a new row in `spec/README.md` after `:378`, plus its own revision | `| CCR-QD-442 | 2026-11-16 | <files with Rev> | ARCH-98. **<title>.** … |` |
| **BEH-QD-591..595** | no new file. Suggested: 591 every tag has one arity and the record is closed (`25-inspection.md`, beside BEH-QD-318); 592 `LeafPolicy` is the tags the record calls Leaf, `childrenOf` is typed by arity (`25-inspection.md`); 593 `foldTrace` hands each arm its tag's children by the same record (`18-explanation.md`, where the `foldTrace` REQUIREMENT is); 594 the `PolicyCases`/`TraceCases` arms agree with the record (type tests); 595 `renderTrace` and `diffTraces` walk every present child and read no arity | `## BEH-QD-NNN: <title>`, `> **Invariant:**`/`> **See:**` lines, a fenced `REQUIREMENT:` block, prose (`05-evaluator.md:325-355` is the model) |
| **INV-QD-347 / 348** | `spec/invariants.md` after `:4002` | `## INV-QD-347: Every policy tag has exactly one arity, and every reader agrees with it`; `**Source**`, `**Implication**`, `**Enforcement**` (the test files), `**Related**`. 348 is reserved; use it for the trace-shape half ("`foldTrace` hands an arm what the record says, and a leaf's foreign children never reach a fold") or name it Unused in the CCR row |
| **INV-QD-090** | `spec/invariants.md:2629` | **kept, not restated**: its text names `foldTrace`, `renderTrace`, `diffTraces` as stack-safe walkers and nothing about `leafTags` |
| **Traceability** | `spec/traceability.md` | ADR row (style `:330-332`), INV row (style `:178`), rows for each new test file, and a Change History entry via `spec-revise` |
| **Revisions** | `node scripts/spec-revise.mjs <file> "<what>" --date 2026-11-16` once per file touched and per entry (`--check` verifies); form read from the script header | |
| **A `ts` fence that goes stale** | `spec/behaviors/25-inspection.md:184-187` lists `export type LeafPolicy = Exclude<Policy, { readonly _tag: "AllOf" \| … }>;` | a **signature listing** (` ```ts `), not compiled, and the type is identical, but the declaration shown is no longer the source: update it to the `Extract<…>` form in the same edit (bump the file with `spec-revise`) |
| **`spec/overview.md`** | `:406-407` lists `leafCases`, `PolicyCases`, `RuleResult`, `LeafPolicy` | **no edit**: names unchanged; gate 13 reports 932 exports before and after |
| **AGENTS.md** | grep for `leafTags`, `traceShapeOf`, `LeafPolicy`, `TraceShape` finds **nothing** | no edit (D-12: "only if a section names a moved fact"). ADR-QD-163 `:278` says "nothing here depends on `Decision.ts`'s `leafTags`": history, leave it |
| **Changeset** | `.changeset/policy-arity-stated-once.md` | `"@qadi/core": patch` (model `.changeset/leaf-needs-stated-once.md`); no public type, export or outcome changes; **no release** (memory) |
| **Barrel pin** | `PolicyArity.test.ts` | `assert.isFalse(Object.hasOwn(Core, name), name)` for `POLICY_ARITY` (model `LeafNeeds.test.ts:234-246`) |

### Q10. Validation and security

See the two sections below. Prototype timings (alone, on this machine): `pnpm circular` 1.1 s; `node scripts/check-house-style.mjs` 0.3 s; `tsc -p tsconfig.test.json` 1.1 s; `node scripts/check-api-surface.mjs` <1 s; `vitest run --project core` 4.3 s (2455 tests with the table test added); `pnpm test:tstyche` 7.1 s (61 files, 309 tests); `stryker` on two files 55 s. `pnpm check:pr` itself was **not** run (heavy: coverage, BDD, examples, website, packing); `pnpm check:fast` (`scripts/run-check.mjs --tier fast`) is the implementer loop and `check:pr < /dev/null` the gate.

## Common Pitfalls

### Pitfall 1: Putting the record in `Policy.ts` as D-01 words it
**What goes wrong:** the record must be importable by `Decision.ts`, so it is exported, and `export *` publishes it; gate 13 fails, or D-02 is silently broken.
**How to avoid:** the sibling module (Open Question 1). **Warning sign:** `[missing] 'POLICY_ARITY' is exported by @qadi/core`.

### Pitfall 2: `import type` is a cycle to madge
**What goes wrong:** `PolicyArity.ts` takes `import type { Policy }` and `Policy.ts` imports from it → `pnpm circular` fails (reproduced). **How to avoid:** keep `PolicyArity.ts` free of `Policy.ts`; make `ChildArms`/`ChildrenOf` generic over the node union and close the record in `Policy.ts`.

### Pitfall 3: A Many type that accepts a tuple
**What goes wrong:** `ReadonlyArray<Policy>` accepts `[p.policy]`; moving `Not` to `Many` compiles, which is the defect the phase exists to remove. **How to avoid:** `& { readonly 0?: never }`, pinned by the `Not → Many` `@ts-expect-error`. **Warning sign:** the tuple-direction test passes on a type without the clause.

### Pitfall 4: A negative that is not checked on every typecheck
**What goes wrong:** `expect(() => …).type.toRaiseError()` makes `tsc -p tsconfig.test.json` fail (it compiles `.tst.ts`). **How to avoid:** the `// @ts-expect-error <fragment>` form; one erroring reference per directive. tstyche runs TS 6.0.3 and `pnpm typecheck` runs 7.0.2, so a fragment must be true for the TS 6 message and the directive for both.

### Pitfall 5: Reading the record with an untrusted tag
**What goes wrong:** `POLICY_ARITY["constructor"]` is `Object`. **Not reachable here:** `traceShapeOf` takes `Trace["policyTag"]`, a closed union decoded by `Schema.Literals(POLICY_TAGS)` (`Decision.ts:78`), and a foreign tag still throws in `traceStep` with the same `Match.exhaustive` message (Q5 probe). Do not add a fail-open default; if a future caller reads an unvalidated string, use `Object.hasOwn` (ADR-QD-092 (b)).

### Pitfall 6: Believing the type ties `policyStep`
`policyStep` (`Policy.ts:1194`) calls `cases.Not(p, resultOf(p.policy))` etc.; it is type-checked against `PolicyCases` but not against the record. A wrong child read there is caught at runtime by the lockstep property (`Policy.test.ts:1025`), not at compile time. State this in the ADR rather than claiming a full type tie.

### Pitfall 7: Running Stryker or `pnpm check` concurrently
A `Timeout` counts as detected, so contention inflates the score. Run the mutation step alone (Phase 50 Pitfall 9).

## Code Examples

The three diffs and the record are in Architecture Patterns (Pattern 1), Q5 and Q4. Barrel-absence and agreement tests, sketched [model: `LeafNeeds.test.ts:234-246`, `Policy.test.ts:1000-1039`]:
```typescript
import * as Core from "../src/index.ts";
import { POLICY_ARITY } from "../src/PolicyArity.ts";

it("the barrel exports none of it (ADR-QD-099)", () => {
  for (const name of ["POLICY_ARITY", "Arity", "ChildArms", "ChildrenOf"]) {
    assert.isFalse(Object.hasOwn(Core, name), name);   // types are erased; the value is the check
  }
});
it("the record's keys are exactly POLICY_TAGS", () => {
  assert.deepStrictEqual(Object.keys(POLICY_ARITY).sort(), [...POLICY_TAGS].sort());   // the extra-tag guard
});
it("every reader agrees with the record, for a sample of every tag", () => {
  // Leaf: childrenOf(p) is [] and isLeafPolicy(p); Wrapper: exactly one child;
  // Many: childrenOf(p) equals p.policies / the rule conditions.
  // And foldTrace over node(tag, marks) gives the shape POLICY_ARITY[tag] names.
});
```
Samples per tag exist in `Policy.test.ts:899-920` (ten leaves, six composites).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| A leaf list restated beside a `Match.whenOr` chain in `Decision.ts` | One keyed record read by type and by value | this phase | a moved arity fails to compile |
| A free-standing `LeafPolicy` `Exclude` | Derived from the record | this phase | identical public type |

**Deprecated/outdated:** none beyond the above. ADR-QD-152's pattern (`as const satisfies`) is the precedent, as `GateState.ts` and `LeafNeeds.ts` show.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Gate 14 (`pnpm spec:package`, packs and type-checks a consumer against the shipped `.d.ts`) passes with `Policy.d.ts` importing the type-only `PolicyArity.ts`. Precedent: `Decision.d.ts` imports `./FieldLattice.ts` (non-barrel) today; I did not run the gate (it builds every package's `lib/`) | Q2(d) | The plan's final `check:pr` fails at gate 14; fix is exporting nothing more, but moving the type aliases into `Policy.ts` (they only need the record's *type*) |
| A2 | `pnpm check:pr` wall time for this phase is a few minutes | Q10 | scheduling only |

## Open Questions

1. **D-01 (record "in `Policy.ts`") versus D-02 (package-private, barrel and gate 13 unchanged) — needs a user decision.**
   - What we know: `index.ts:32` is `export * from "./Policy.ts"`; a `Policy.ts` export is public; `Decision.ts` needs the *value*; gate 13 fails on an unlisted export (reproduced); madge forbids the sibling importing `Policy.ts`.
   - What's unclear: whether "in `Policy.ts`" or "package-private" is the priority.
   - Recommendation: **the sibling `PolicyArity.ts`** (D-02 wins; location amended to "in `PolicyArity.ts`, closed over the union by `Policy.ts`"). The alternative (export from `Policy.ts`, list in overview, minor changeset) is the deferred idea the user rejected.
2. **D-05's literal type (`ReadonlyArray<Policy>` for Many) does not meet D-05's own stated behaviour** (a Wrapper → Many move compiles). Not a user decision: tighten to `& { readonly 0?: never }` (Q3). Say so in ADR-QD-164.
3. **Tie `TraceCases` to the record too?** D-06 names `PolicyCases` only; `TraceCases` (`Decision.ts:389-406`) restates the same arity in its arm signatures and is the type `foldTrace` publishes. The same tstyche helper ties it (probed). Recommendation: yes, one extra `test` block; no runtime or public-type change. Needs a nod only because it extends D-06.
4. **One move `childrenOf`'s types cannot catch (Leaf → Many)** — covered by the derived `LeafPolicy` and the `PolicyCases` tstyche tie (all 32 moves). State it in the ADR; no decision needed.
5. **SC2's "checked `@ts-expect-error`" is written against `ChildArms<Policy, MovedRecord>`**, not the real arms literal, because that literal must stay unexported. The real arms are checked by `Policy.ts` compiling (every `tsc`). No decision needed; word the SUMMARY accordingly.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | ✓ | v26.13.0 | — |
| pnpm | scripts | ✓ | 10.17.1 | — |
| tsc | typecheck | ✓ | 7.0.2+effect-tsgo.0.67.5 | — |
| TypeScript 6.0.3 | tstyche target | ✓ | in `node_modules/.pnpm/typescript@6.0.3` | — |
| tstyche | type tests | ✓ | 7.2.5 | — |
| vitest | tests | ✓ | 5.1.0 | — |
| @stryker-mutator/vitest-runner | WX-05 | ✓ | 10.1.1 | — |
| madge | `pnpm circular` | ✓ | 8.x | — |

**Missing dependencies with no fallback:** none. **With fallback:** none.

## Validation Architecture

> `workflow.nyquist_validation: true`, `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"` in `.planning/config.json` [VERIFIED].

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest`; fast-check; tstyche 7.2.5 for `*.tst.ts` |
| Config file | `vitest.config.ts` (root), `packages/core/vitest.config.ts`, `tstyche.json`, `tsconfig.test.json`, `stryker.config.mjs` |
| Quick run command | `node_modules/.bin/vitest run --project core packages/core/test/TraceShape.test.ts packages/core/test/PolicyArity.test.ts packages/core/test/Decision.test.ts packages/core/test/Policy.test.ts` and `node_modules/.bin/tstyche packages/core/test/PolicyArity.tst.ts packages/core/test/Policy.tst.ts packages/core/test/LeafNeeds.tst.ts` (≈ 2 s each) |
| Full suite command | `node_modules/.bin/vitest run --project core` (≈ 4 s), `pnpm test:tstyche` (≈ 7 s), then `pnpm check:pr < /dev/null` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARTY-01 | record has every tag once; `traceShapeOf` reads it | unit + compile | quick run; `node_modules/.bin/tsc -p tsconfig.test.json` | ❌ Wave 0 `PolicyArity.test.ts` |
| ARTY-01 | all 16 trace shapes unchanged | characterisation (green on base) | `vitest run --project core packages/core/test/TraceShape.test.ts` | ❌ Wave 0 `TraceShape.test.ts` |
| ARTY-02 | derived `LeafPolicy` identical; `childrenOf` typed; moves refused | type | `tstyche packages/core/test/PolicyArity.tst.ts` | ❌ Wave 0 `PolicyArity.tst.ts` |
| ARTY-02 | `PolicyCases`/`TraceCases` agree with the record (all 32 moves) | type | same | ❌ Wave 0 |
| ARTY-03 | `foldTrace` public and unchanged; walks untouched | existing | `Decision.test.ts`, `RenderTrace.test.ts`, `TraceDiff.test.ts`, `TraceAlignment.test.ts`; barrel pin in the existing core barrel tests | ✅ |
| WX-01..04 | gates, ids, overview, banned constructs | gate | `pnpm check:pr < /dev/null`; `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`; `pnpm circular` | ✅ |
| WX-05 | no score drop for `Policy.ts`/`Decision.ts` | mutation | the Q8 command (55 s, alone) | base: Q8 |
| WX-06 | characterisation before change | ordering | commit order below | — |
| WX-07 | no break | n/a | patch changeset only | — |

### Sampling Rate
- **Per task commit:** the quick run commands.
- **Per wave merge:** `node_modules/.bin/vitest run --project core`, `pnpm test:tstyche`, `node_modules/.bin/tsc -p tsconfig.test.json`, `pnpm circular`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, Stryker re-run with the Q8 invocation, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`, then `/gsd-verify-work`.

**Commit order (RED first):** (1) `51-mutation-base.json` alone; (2) `TraceShape.test.ts` (green on the base) and the recorded base experiment (`51-BASE-EXPERIMENT.md`: edit, command, `exit 0`, the 32/8 matrix); (3) `PolicyArity.ts`, then the three `Policy.ts` edits and `Decision.ts`, with `PolicyArity.test.ts`; (4) `PolicyArity.tst.ts`; (5) records (ADR, CCR, BEH, INV, traceability, `index.yaml`, the `25-inspection.md` fence, changeset); (6) close: `check:pr`, Stryker after, `51-mutation-after.json`.

### Wave 0 Gaps
- [ ] `packages/core/test/TraceShape.test.ts` — the Q7 table, committed on the base, before any `src` edit
- [ ] `51-mutation-base.json` — Q8 scores, before any `src` edit
- [ ] `packages/core/test/PolicyArity.test.ts` — barrel absence, record keys equal `POLICY_TAGS`, readers agree (RED by import until `PolicyArity.ts` exists)
- [ ] `packages/core/test/PolicyArity.tst.ts` — Q4 (RED by import until the module exists)

## Security Domain

### Applicable ASVS Categories (level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | **yes (indirect)** | the arity decides which children of a trace or a policy a fold sees; one record plus compile-time ties and an all-tags test keep the readers in step |
| V5 Input Validation | **yes (unchanged)** | a `Trace` from untrusted JSON is decoded with `Schema.Literals(POLICY_TAGS)` (`Decision.ts:78`), so a tag outside the union never reaches `POLICY_ARITY[tag]`; policies still go through `untrustedDecoder` only (§7a) |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A wrong arity makes `foldTrace` drop or misattribute a child of an `AccessDenied.trace` a host walks (e.g. a wrapper folded as Many hands the first and the extra child; a leaf folded as Many walks foreign children) | Tampering / Information disclosure | the all-tags table kills all 32 single-tag moves (the existing tests killed 8); the record is typed against `childrenOf`, `PolicyCases` and `TraceCases` |
| A derived `LeafPolicy` silently widening (a non-leaf admitted as a leaf, or a leaf dropped so a table row fails open) | Elevation of privilege | tstyche identity check against the old `Exclude`; `LEAF_NEEDS` and `leafCases` fail to compile when the set moves (INV-QD-345's `LeafNeedOf` already makes a leaf with no classification `never`) |
| Prototype-key lookup on the record (`"toString"`) read as an arity | Elevation of privilege | not reachable (closed tag union, decoded literals); a foreign tag still throws identically (Q5 probe); no default row is added |
| `.d.ts` or barrel leak of the record (public surface growth) | Information disclosure (low) | the record lives in a non-barrel module; `PolicyArity.test.ts` asserts the barrel exports none of it; gate 13 reports 932 exports unchanged |
| A `0?: never` refusal reading as a mystery error and being "fixed" by widening | Tampering (process) | the comment on `ChildrenOf` and the pinned `@ts-expect-error` fragments |

No ASVS finding at or above `security_block_on: "high"` is expected: no new input surface, dependency, export, I/O or runtime behaviour.

## Sources

### Primary (HIGH confidence)
- This repository at `9af8604f` on `arch-wave-10`: `packages/core/src/{Policy,Decision,LeafNeeds,GateState,TreeFold,TraceDiff,Explanation,index}.ts`, `packages/core/test/{Policy,Decision,LeafNeeds,HydrationMetrics,TraceOracle,LeafFixtures}.{test,tst}.ts`, `packages/core/lib/Decision.d.ts`, `stryker.config.mjs`, `tstyche.json`, `tsconfig.{json,base,test}.json`, `scripts/{check-api-surface,check-package-install,run-check,spec-revise}.mjs`, `spec/{overview,invariants,traceability,README}.md`, `spec/behaviors/{05-evaluator,18-explanation,25-inspection}.md`, `spec/decisions/{163,index.yaml}`, `AGENTS.md`, `.planning/{REQUIREMENTS,ROADMAP}.md`, `_WAVE10-CONTEXT.md`, `50-RESEARCH.md`.
- Commands run this session: `tsc` (7.0.2) and TypeScript 6.0.3 `tsc` over a scratch copy and the real tree; `tstyche` on probe files and the full suite; `vitest run --project core` (base, prototype, 32-move matrices); `madge`; `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs` (with and without a leaked export); `stryker run --mutate` twice; `oxlint`. Probe sources and outputs are under `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bf083921-e7cd-4930-bcad-a3ef483d2ac8/scratchpad/p51/` (`PolicyArity.final.ts`, `Policy.final.ts`, `Decision.E.ts`, `TraceShape.probe.test.ts`, `packages/core/test/ArityProbe*.tst.ts`, `mutation-base.json`, `mutation-after.json`, `matrix.py`).

### Secondary (MEDIUM confidence)
- none

### Tertiary (LOW confidence)
- none. No web or Context7 lookup was needed: the phase touches no external API beyond installed `effect`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed versions read; nothing added.
- Architecture: HIGH — built, type-checked under two compilers, run against the full core suite, the full tstyche suite and Stryker, then reverted.
- Pitfalls: HIGH — each reproduced (barrel leak, madge type cycle, tuple hole, `toRaiseError` under `tsc`).
- Spec-record mechanics: HIGH for shapes (precedents read), MEDIUM for BEH placement (discretion).

**Research date:** 2026-11-16
**Valid until:** Phase 51 landing, or any change to `Policy.ts`, `Decision.ts`, `index.ts` or the `PolicyCases`/`TraceCases` signatures (otherwise 30 days).
