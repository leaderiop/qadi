# Phase 51: Policy tag arity stated once - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Each policy tag's arity (Leaf, Wrapper or Many) is stated once, in one closed record in `packages/core/src/Policy.ts`. `Decision.ts`'s trace shape (`traceShapeOf`) reads it instead of the hand-kept `leafTags` array, and `LeafPolicy`, `childrenOf` and `PolicyCases` are tied to it, so moving a tag's arity in one place and not the other fails to compile. `foldTrace` stays public and unchanged; `renderTrace` and `diffTraces` keep their own walks, and the ADR states why.

Requirements: ARTY-01..03, WX-01..07. Reserved ids: ARCH-98, ADR-QD-164, CCR-QD-442, BEH-QD-591..595, INV-QD-347..348 (INV-QD-090 is kept, not restated). Starts from Phase 50's head (which edited `Walk.ts`, `Predicate.ts` and added `LeafNeeds.ts`, whose rows are keyed by `LeafPolicy["_tag"]`).

</domain>

<decisions>
## Implementation Decisions

### The arity record (ARTY-01)
- **D-01:** One keyed record in `Policy.ts`, the ADR-QD-152 pattern: `POLICY_ARITY = { HasPermission: "Leaf", …, Not: "Wrapper", Obliged: "Wrapper", Labeled: "Wrapper", AllOf: "Many", AnyOf: "Many", Rules: "Many" } as const satisfies { readonly [K in Policy["_tag"]]: Arity }`, with `type Arity = "Leaf" | "Wrapper" | "Many"` (a closed union). A missing tag is TS2741; an unknown arity word does not compile.
- **D-02:** Package-private: the record and `Arity` are not exported from `index.ts`. Barrel, `spec/overview.md` and gate 13 unchanged; the changeset is a `@qadi/core` patch. (Exporting it would make it a minor; rejected — no host asked for it.)
- **D-03:** `LeafPolicy` is derived from the record (`Extract<Policy, { readonly _tag: TagsOfArity<"Leaf"> }>`, or equivalent) instead of the hand-written `Exclude<…, "AllOf" | "AnyOf" | "Rules" | "Not" | "Obliged" | "Labeled">`. Its public type is identical (a tstyche equality check proves it); `leafCases` and `LeafNeeds.ts` (keyed by `LeafPolicy["_tag"]`) follow for free.
- **D-04:** `Decision.ts`'s `traceShapeOf` reads the record directly (`POLICY_ARITY[tag]`); `leafTags` and the three `Match.whenOr` lines are deleted, and `TraceShape` becomes `Arity` (or an alias of it). `traceChildrenOf`'s behaviour is unchanged. `Decision.ts` already imports from `Policy.ts`, so no new import edge; re-run `pnpm circular`.

### The readers and the type-level tie (ARTY-02, ARTY-03)
- **D-05:** `childrenOf` keeps its `Match.tagsExhaustive` runtime unchanged, but its arms are typed by arity: the handler record satisfies `{ [K in Tag]: (p: PolicyOf<K>) => ChildrenOf<Arity[K]> }`, where a Leaf arm returns `readonly []`, a Wrapper arm a one-element tuple and a Many arm `ReadonlyArray<Policy>`. Moving a tag's arity in the record without changing its arm (or vice versa) is a compile error. No runtime change.
- **D-06:** `PolicyCases<R>` stays hand-written (its arm signatures differ per tag: `Rules` receives `RuleResult` rows). A tstyche test ties it to the record: every Leaf tag's arm takes only `node`, every Wrapper tag's arm a single `R` child, every Many tag's arm an array. A checked `@ts-expect-error` negative (or tstyche `.not` assertion) shows that a mismatch fails.
- **D-07:** `Decision.ts`'s `traceStep` is left as it is: it dispatches per tag to the per-tag `TraceCases` arm, which is a different fact from arity (which arm, not how many children); its children shape already comes from `traceChildrenOf`, which now reads the record.
- **D-08:** `foldTrace` stays public and byte-unchanged (its barrel pin and INV-QD-090 tests untouched). `renderTrace` (pre-order with indentation, a line final when its node is met) and `diffTraces` (lockstep over two trees) keep their own explicit-stack walks; ADR-QD-164 states why a shared fold does not fit either. `SWITCH_BUDGET`, `UNTRACED_BUDGET` and every other budget unchanged.

### Evidence and records (WX-01..07)
- **D-09:** RED/characterisation first, committed on the phase base before any source change: a table test over **every** policy tag pinning its trace shape through `foldTrace` (which children each arm receives: none, the first, all — including a leaf that carries foreign children and a wrapper with extra children), green on the base and after.
- **D-10:** The base experiment is recorded, not committed as code: on the base, move a wrapper tag under "Many" in `Decision.ts` (and a tag's arm in `childrenOf`), run `tsc`, record that it compiles, then revert; record the exact edit and output in the plan SUMMARY and ADR-QD-164. After the change, the same edit fails to compile (the checked negative of D-05/D-06).
- **D-11:** Mutation base for `Policy.ts` and `Decision.ts` recorded first (XC-05 / WX-05 comparison: no drop in a touched file's score, or the D-13-of-Phase-50 rule if killed mutants leave with deleted code). **No bench**: the change replaces a `Match.whenOr` chain on a fold that runs only in `foldTrace` (no in-repo caller) with a record read; nothing on the evaluation path changes.
- **D-12:** Records: ADR-QD-164 (the record, why `renderTrace`/`diffTraces` keep their walks, the recorded base experiment), CCR-QD-442 in `spec/README.md`, BEH-QD-591+ for the arity rule and the trace shapes, INV-QD-347 (every tag has exactly one arity, and every reader agrees with it), traceability rows, `index.yaml`; `@qadi/core` patch changeset. AGENTS.md only if a section names a moved fact.

### Amendments after research (2026-11-16, user answers to 51-RESEARCH.md's open questions)
- **D-01a (amends D-01's location, keeps D-02):** the record lives in a new package-private sibling module `packages/core/src/PolicyArity.ts`, outside the barrel (as `LeafNeeds.ts`, `FieldLattice.ts`, `TreeFold.ts`), because `index.ts` does `export * from "./Policy.ts"` and anything there is public. `PolicyArity.ts` must not import `Policy.ts` (madge counts `import type` cycles); `Policy.ts` closes the record over `Policy["_tag"]` through a constrained type argument, so a missing or extra tag is still a compile error.
- **D-05a (research, not a user decision):** the Many child type is `ReadonlyArray<Policy> & { readonly 0?: never }` so a Many arm returning a one-element tuple is refused; Leaf→Many, which `childrenOf`'s types cannot catch, is caught by the derived `LeafPolicy` and by the `PolicyCases` tie.
- **D-06a:** `Decision.ts`'s `TraceCases` is tied to the record by the same tstyche helper as `PolicyCases`, with a negative. Negatives are `// @ts-expect-error` directives (as `HydrationMetrics.tst.ts`), because `pnpm typecheck` compiles `.tst.ts` files.

### Claude's Discretion
- Exact names (`POLICY_ARITY`/`policyArity`, `Arity`, `TagsOfArity`, `ChildrenOf`) and whether `TraceShape` is deleted or aliased.
- Whether the arity-typed `childrenOf` is expressed via `satisfies` on the handler record or a typed helper, as long as the runtime is unchanged and the mismatch is a compile error.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GateState.ts` / `HydrationMetrics.ts`: the ADR-QD-152 keyed-table pattern (`as const satisfies`), with `.tst.ts` proofs.
- `LeafNeeds.ts` (Phase 50): `as const satisfies { [K in LeafTag]: LeafNeedOf<K> }`, closed classification lists defaulting to `never`, and a `Disjoint` check — the same type-level technique applies to arity.
- `POLICY_TAGS = PolicyUnion.discriminants` (`Policy.ts:554`), `PolicyOf<T>` (`Policy.ts`), `Policy.tst.ts`.

### Established Patterns
- `childrenOf` (`Policy.ts:1040`), `LeafPolicy` (`:1123`), `PolicyCases` (`:1142`), `leafCases` (`:1170`) state arity today; `Decision.ts:418–446` restates it in `leafTags` + `traceShapeOf` + `traceChildrenOf`.
- `Explanation.ts`'s `explanationChildrenOf` mirrors `childrenOf` for a different ADT (not in scope).
- Tests: `Policy.test.ts`, `Policy.tst.ts`, `TreeFold.test.ts`, `RenderTrace.test.ts`, `TraceDiff.test.ts`, `TraceOracle.ts`.

### Integration Points
- `Decision.ts` imports `POLICY_TAGS` and `DEFAULT_MAX_DEPTH` from `Policy.ts` already.
- `LeafNeeds.ts` and `leafCases` read `LeafPolicy["_tag"]`; `foldPolicy`/`foldPolicyCases` read `childrenOf`.

</code_context>

<specifics>
## Specific Ideas

- The roadmap's success criterion 2 wants the base experiment *recorded*: "on the base, moving a wrapper tag under 'Many' in `Decision.ts` compiles".
- The review correction stands: `foldTrace` has no in-repo caller by design; it is the stack-safe public primitive for hosts (INV-QD-090).

</specifics>

<deferred>
## Deferred Ideas

- Exporting the arity record for hosts (a minor bump) — no consumer asked for it.
- Deriving `PolicyCases` as a mapped type from the record — rejected in discuss (the `Rules` arm's row shape makes it non-uniform).
- Routing `renderTrace`/`diffTraces` through a shared walker — rejected; the ADR states why.

</deferred>
