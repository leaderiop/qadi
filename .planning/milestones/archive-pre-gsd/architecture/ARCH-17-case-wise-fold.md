---
id: ARCH-17
title: A case-wise fold over Policy, Matcher and Explanation, so a node's arity is a type and not a runtime throw
strength: Strong
status: implemented       # wave 3, branch arch/wave3; T6 and T13 dropped on measurement (see §10)
evidence_verified_at: e328e75
depends_on: []            # ARCH-02 (done) built the seam this deepens
blocks: []
adrs_touched:
  - ADR-QD-090 (amend — the seam is kept, its interface gains a case-wise form beside the array form; one loop still owns the stack; "Not yet" gains a line for `Trace`'s case form via ARCH-22)
  - ADR-QD-034 (read — no new `switch`; every dispatcher is a hoisted `Match.tagsExhaustive`; `SWITCH_BUDGET` stays `Evaluate.ts: 1`, `Matcher.ts: 2`)
  - ADR-QD-092 (read — the per-tag record table is the measured precedent for D-17-b's rejected option; not adopted here)
  - ADR-QD-002 (read — the schema union stays the one definition; `PolicyCases` is checked against it by the dispatcher, not restated)
  - ADR-QD-027 (read — `explain` stays total and subject-free)
  - ADR-QD-030 (read — `simplify`'s two rewrites and its "no double negation" finding are unchanged)
  - ADR-QD-024 (read — `toPredicate`'s refusal precedence, first refusal in declaration order, is unchanged)
  - ADR-QD-047 (read — devtools `src/model` is held to 95% and its own Stryker run)
  - ADR-QD-073 (read — no `Effect.fnUntraced`; every function here is pure)
  - ADR-QD-076 (read — `ignoreStatic: true`; the new module-scope dispatchers are static and are not counted)
  - ADR-QD-098 (read — mutation runs stay sequential; T11 runs them one at a time)
  - ADR-QD-037 (read — madge; nothing new crosses a module boundary)
  - ADR-QD-038 (read — one changeset, fixed version group; additive ⇒ minor)
packages: ["@qadi/core", "@qadi/devtools", "apps/website (docs only)"]
estimate: L   # ≈ 3½ days for T0–T14; M (≈ 2 days) if D-17-h is deferred and D-17-d keeps devtools on the array form
---

# ARCH-17 — A case-wise fold, so a node's arity is a type and not a runtime throw

Glossary used in this plan. **Nesting depth** is how deeply a `Policy`, `Matcher` or
`Explanation` value nests. **Module depth** is the architecture sense. **Arity** is how
many children a node has *by its tag*: `Not`/`Obliged`/`Labeled` exactly one, a
matcher wrapper (`FieldMatch`/`SomeMatch`/`EveryMatch`/`Size`) exactly one, a
`Negated`/`Named`/`Owing` exactly one, `Rules`/`Table` one per row, `AllOf`/`AnyOf`/`All`/`Any`
any number, a leaf none. The **array form** is today's
`combine(node, children: ReadonlyArray<R>)`; the **case form** is this plan's
`foldPolicyCases(self, { AllOf: (p, rs) => …, Not: (p, r) => …, Rules: (p, rows) => …, … })`.

## 1. Verified evidence (at `e328e75`)

Re-read at `git rev-parse --short HEAD` = `e328e75` on `main`. Since the review's
`d0884e6`, only `Explanation.ts` (+85), `FieldLattice.ts`, `ShortCircuit.ts` and
devtools' `Inspect.ts` changed under `packages/{core,devtools}/src`
(`git diff --stat d0884e6 e328e75 -- packages/core/src packages/devtools/src`); every
line the review cited in `Simplify.ts`, `Policy.ts`, `Predicate.ts` and `Remedies.ts` is
where it said.

**Probes** ran from
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/a032054c-2984-4500-9b86-240b3767ee96/scratchpad/wave3/ARCH-17/`,
on a *copy* of `packages/core/src` (`core/src`, `node_modules` symlinked to
`packages/core/node_modules`), with `node_modules/.bin/tsx` on Node v22.22.0 and
`tsc -p core/tsconfig.json` (extends the repo's `tsconfig.base.json`: strict,
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). Nothing
in the repository was edited. The prototype:

- `core/src/TreeFold.ts` + `foldTreeBy` — the same post-order loop, but `combine(node, resultOf)`
  reads a child's result **by naming the child** (a lookup in the memo the loop already keeps),
  and throws `"foldTree: combine read a node that was not folded as a child"` on a miss.
- `core/src/PolicyCases.ts` — `PolicyCases<R>` (16 per-tag arms; `Not`/`Obliged`/`Labeled`
  receive `child: R`, `Rules` receives `rows: ReadonlyArray<{ rule, result }>`), a module-scope
  `Match.tagsExhaustive` dispatcher whose arms return a generic
  `Step = <R>(cases: PolicyCases<R>, resultOf: (child: Policy) => R) => R`, and
  `foldPolicyCases`. **`tsc`: 0 errors in it, no `as`, no `!`, no `any`.**
- `core/src/ProbeConsumers.ts` — `simplify` and `policyDepth` rewritten onto the case form.
- `core/src/ProbeNegative.ts` — a cases object missing `Rules` and a `Not` arm that calls
  `.length` on its child: **TS2741** ("Property 'Rules' is missing") and **TS2339**
  ("Property 'length' does not exist on type 'number'"). Arity is a type.
- `probe.ts`: differential over 20,000 seeded random policies (all composite tags, three field
  strategies, matcher leaves): **0 mismatches** between today's `simplify`/`policyDepth` and the
  case-form versions (`JSON.stringify` equality / `===`). Stack safety: 100,000 nested `not`
  and 100,000 nested one-row `rules` fold (depth 100,000), a 250,000-wide `anyOf` folds; a
  shared leaf under `allOf([s, s])` is combined **once**; a hand-built cycle throws
  `"foldTree: the tree contains a cycle"`.
- `probe2.ts`–`probe7.ts`: micro-benchmarks, quoted under C7 and N2. Single laptop runs, three
  rounds each; read only the direction (AGENTS.md §5a).

### Claims from the review

| # | Claim | Verdict | Evidence at `e328e75` |
| - | ----- | ------- | --------------------- |
| C1 | `Policy.ts:1151` `foldPolicy` passes `combine(node, children: ReadonlyArray<R>)` in `childrenOf` order, erasing the ADT's arity | **CONFIRMED** | `packages/core/src/Policy.ts:1151-1154` (`foldTree(self, childrenOf, combine)`); `childrenOf` at `:1081-1099` returns `[p.policy]` for `Not`/`Obliged`/`Labeled` and `p.rules.map((r) => r.condition)` for `Rules`. The same erasure holds for `foldMatcher` (`Matcher.ts:502-505`, children from `matcherChildrenOf` `:457-472`, always `[m.matcher]` for the four wrappers) and `foldExplanation` (`Explanation.ts:147-150`, `explanationChildrenOf` `:125-136`). `TreeFold.ts:36-40`'s signature is where the arity is lost: `combine: (node: N, children: ReadonlyArray<R>) => R`. |
| C2 | Six "exactly one child" helpers rebuild that arity with runtime throws: `expectOne` (Simplify.ts:94), `expectOne`/`expectOneText`/`expectOnePiece` (Explanation.ts:171,227,492), `onlyChild` (Predicate.ts:405-412), one in `Remedies.ts:183` | **CHANGED — seven, two of them in `Remedies.ts`** | `Simplify.ts:94-100` `expectOne` (called `:179,185,190`); `Explanation.ts:173-179` `expectOneText` (called `:197,199,201,203`), `:229-235` `expectOne` (called `:324,330,335`), `:558-564` `expectOnePiece` (called `:616,620,624`) — the last three moved from `:171,227,492` by the +85 lines in `Explanation.ts`; `Predicate.ts:406-412` `onlyChild` (called `:528,534`); `packages/devtools/src/model/Remedies.ts:181-187` `onlyWitness` (called `:248,250,254,261`) **and** `:339-348` `onlyRequirements` (called `:406,407`), which the review missed. Each destructures `[only, ...rest]` and throws on `only === undefined \|\| rest.length !== 0`. `grep -rn "exactly one child\|misaligned\|fewer children" packages/*/test features` finds **no test** reaching any of them. |
| C3 | Two copies of the `Rules` length/alignment re-check: Simplify.ts:196-210 and Explanation.ts:338-351 | **CHANGED — four throwing copies and one silent one** | `Simplify.ts:195-214` (length throw `:196-200`, per-index throw `:208-210`); `Explanation.ts:339-357` (`:340-344`, `:352-354`). Two more in iterator form the review did not list: `Predicate.ts:547` `"toPredicate: Rules folded fewer children than rows"` and `Remedies.ts:400` `"remedyEdits: Rules folded fewer children than rows"`. And a **silent** one: `renderExplanation`'s `Table` arm (`Explanation.ts:628-637`, the read at `:635`) reads `conditions[i]` — typed `string \| undefined` under `noUncheckedIndexedAccess` — straight into a template literal, so a misaligned fold would render the word `undefined` rather than throw. Unreachable today; the case form makes it unrepresentable. |
| C4 | Simplify's own comment says mutation testing found these branches unreachable but not provably so | **CHANGED — the comment is about a neighbour; the evidence for the guards themselves is the Stryker report** | `Simplify.ts:137-145` says "mutation testing confirmed twice" that a length-derived "exactly one" left "one arm unreachable-but-not-provably-so" — but it is the `AllOf`/`AnyOf` single-child *unwrap* (`:146-149`), which the case form leaves alone (an `AllOf` still has any number of children). `Predicate.ts`'s `Checked` doc (`:282-291`) states the same principle for the depth guard. The guards C2/C3 name are shown unkillable by `reports/mutation/mutation.json` (core, 2026-10-04 03:08) and `reports/mutation-devtools/mutation.json` (03:14). **Both predate ARCH-02** (`TreeFold.ts` landed in `1fd8700`, 2026-10-06), so they cover only the two helpers that existed then: in `Simplify.ts` the `expectOne` guard left **4 Survived + 2 NoCoverage**, its three tag-name arguments **3 Survived**, and the `Rules` checks **5 Survived + 4 NoCoverage** (18); `Explanation.ts` the identical **18**. Read with `scratchpad/.../ARCH-17/mut.mjs`. T0 re-baselines at HEAD. |
| C5 | Target: a case-wise fold built on `TreeFold.ts`, so arity is a type | **CONFIRMED feasible (prototype)** | See the probe list: `PolicyCases.ts` type-checks with no assertion; the negative probe fails with TS2741/TS2339; 0 differential mismatches over 20,000 policies; 100k-deep / 250k-wide / shared / cycle behaviour identical to `foldTree`'s. The one remaining runtime check is `foldTreeBy`'s `resultOf` miss, which lives in `TreeFold.ts` and **is** reachable — by a `TreeFold.test.ts` case whose `combine` names a node `childrenOf` did not list — so its mutants are killable, unlike the seven helpers'. |
| C6 | Count every consumer of `foldPolicy`/`foldMatcher`/`foldExplanation` across `packages/*/src` | **CONFIRMED: 11 call sites, 9 functions, 5 files** (`grep -rn "foldPolicy\|foldMatcher\|foldExplanation" packages --include='*.ts' --include='*.tsx'`, `lib/` and `node_modules` excluded) | **`foldPolicy` (6):** `policyDepth` `Policy.ts:1231`; `simplify` `Simplify.ts:229`; `explain` `Explanation.ts:378`; `restrictsFields` `Predicate.ts:276`; `compileTree` `Predicate.ts:564`; `requirementsOf` `devtools/src/model/Remedies.ts:425`. **`foldMatcher` (4):** `matcherDepth` `Matcher.ts:518`; `referencesRef` `Matcher.ts:539` (behind `referencesAction` `:550` and `referencesResource` `:561`); `matcherText` `Explanation.ts:209`; `satisfyingValue` `Remedies.ts:145`. **`foldExplanation` (1):** `renderExplanation` `Explanation.ts:669`. No other package (`http`, `react`, `promise`, `audit`, `testing`, `predicate-sql`, `predicate-prisma`) and no example calls any of them. Tests: `Policy.test.ts:918-971` (3 tests), `Simplify.test.ts:241`, `Explanation.test.ts:607-618`, `Matcher.test.ts:1042`, `Compare.test.ts:271`, `Policy.tst.ts:64-66`. Devtools' `Inspect.ts:110` folds through its **own** `model/TreeFold.ts` twin over `Position`s, not through any of the three. |
| C7 | Check whether `evaluate` uses the fold, and whether `foldPolicyCases` adds per-node cost on a hot path | **CHANGED — `evaluate` uses two folds, one of them per node per evaluation** | (a) `Evaluate.ts:1152` calls `policyDepth` before every uncached evaluation; it is memoised per policy object (`Policy.ts:1251` `depthMemo`), so the fold runs once per distinct policy object. (b) **`Evaluate.ts:523,535,550` call `referencesAction`/`referencesResource` on every `HasAttribute`/`HasResourceAttribute` node when the request has no action/resource** — a `foldMatcher` per node per evaluation, unmemoised. `Evaluate.bench.ts`'s `run` passes no request (`:142-144`), so `matcher-heavy` does 8 matcher folds per evaluation. (c) `toPredicate` folds twice per call (`restrictsFields`, `compileTree`); `explain`/`simplify`/`renderExplanation`/devtools are off the request path. **Cost of the case form** (`probe2`–`probe5`): it is one hoisted `Match` dispatch plus one closure per node. For every arity-sensitive consumer that already dispatches with a `Match` per node (`simplify`, `explain`, `compileTree`, `requirementsOf`, `matcherText`, `satisfyingValue`, `renderExplanation`) the dispatch *replaces* theirs: `simplify` d40 31.1→32.8 µs, wrap40 15.2→15.2 µs (±6%, noise). `policyDepth` gets **faster** (d10 7.3→6.6 µs, d40 28.5→25.7 µs), because the case form drops its per-node `matcherOf` dispatch. For a *homogeneous* fold with no per-node `Match` today it is a real cost: hoisted cases add **≈110–150 ns per call** to `referencesAction` (eq 438→598 ns), and building the cases object per call adds ≈0.8 µs. That is why D-17-d keeps `referencesRef` on the array form. |

### Findings the review did not have

| # | Finding | Verdict | Evidence |
| - | ------- | ------- | -------- |
| N1 | The case form also deletes two private per-tag tables | **CONFIRMED (prototype)** | `policyDepth`'s `matcherOf` (`Policy.ts:1165-1184`, 16 arms) and `leafNesting` (`:1187-1190`) exist only to ask "which leaf carries a matcher" inside an array-form combine; in the case form `HasAttribute`/`HasResourceAttribute` arms read `p.matcher` with the node already narrowed. `satisfyingValue`'s `checked(node, children.length === 0, …)` (`Remedies.ts:146,159-167`) infers leaf-ness from the child count; in the case form only leaf arms call it and the `isLeaf` parameter goes. |
| N2 | `foldTree`'s fixed setup is ≈14% of `matcher-heavy` | **CONFIRMED (probe, outside the bench harness)** | `probe6.ts`: `evaluate(matcher-heavy)` ≈ 28.5 µs/op under `tsx`, and its 8 `referencesAction`/`referencesResource` calls ≈ 4.0 µs — most of it allocating a `Map`, a `Set`, a frame and an iterator for a matcher that is usually a single leaf. `probe7.ts`: skipping that setup for a childless root makes `referencesAction(eq(…))` 424→198 ns and leaves a one-wrapper matcher unchanged (705→699 ns). Not in the review; D-17-h decides whether this plan takes it. |
| N3 | Devtools' `TreeFold.ts` twin is untouched by this plan | **CONFIRMED** | Only `Inspect.ts:110` uses it, over virtual `Position` nodes (ADR-QD-090 "Devtools gets a package-private twin"). A `Position` has no tag-determined arity, so a case form buys it nothing; ARCH-22 owns the Explanation×Trace alignment it does. |
| N4 | `foldPolicy`/`foldMatcher`/`foldExplanation` are published API | **CONFIRMED** | `packages/core/CHANGELOG.md:38` (0.10.0, "New exports: `foldPolicy`, … `foldExplanation` … `foldMatcher`"); npm `@qadi/core` lists 0.10.0 and 0.11.0. Removing or re-typing them is a breaking change for anyone outside this repo, not only for `@qadi/devtools`. |

## 2. Goal and success criteria

The fold seam ADR-QD-090 built is shallow at exactly one point: its **interface** — `combine(node,
children: ReadonlyArray<R>)` — throws away a fact the ADT states (a `Not` has one child, a `Rules`
row has one condition), so every adapter that needs the fact rebuilds it with a runtime check that
no input can reach. Seven helpers and five `Rules` re-checks are the same fact restated twelve times
in five modules, each one an unkillable mutant and a line a reader must convince themselves is dead.
The goal is to deepen the seam: the three adapter modules (`Policy.ts`, `Matcher.ts`,
`Explanation.ts`) each gain a **case-wise interface** whose per-tag arms receive their children in
the ADT's own shape — `child: R` for a wrapper, `ReadonlyArray<R>` for a combinator,
`ReadonlyArray<{ rule, result }>` for a table — so a consumer's arity is checked by the compiler and
alignment is by construction. The knowledge of "which field of which tag is a child, and how many"
moves into one module-scope dispatcher per ADT, beside the `childrenOf` it must agree with
(**locality**); the mechanism (stack, memo, cycle check) stays one loop in `TreeFold.ts` (**one
seam, two adapters' worth of interface**); and the array form stays as the right interface for a
homogeneous fold (count, max, any), which is what most external callers write (**leverage** without
a break).

Success criteria:

1. `foldPolicyCases`, `foldMatcherCases` and `foldExplanationCases` exist and are exported from
   `@qadi/core`'s barrel; `foldPolicy`, `foldMatcher` and `foldExplanation` keep their 0.11.0
   signatures (`git diff main -- packages/core/src | grep -n "export const fold"` shows only additions).
2. `grep -rnE "expectOne|expectOneText|expectOnePiece|onlyChild|onlyWitness|onlyRequirements" packages/*/src` → no output.
3. `grep -rnE "expected exactly one child|children misaligned|Rules expected .* children|folded fewer children" packages/*/src` → no output.
4. `grep -n "conditions\[i\]" packages/core/src/Explanation.ts` → no output (the `Table` arm reads `rows[].result`).
5. A missing case arm and a `Not` arm treating its child as an array are compile errors, pinned by
   `packages/core/test/Policy.tst.ts` (and the `Matcher`/`Explanation` equivalents) with
   `expect(...).type.toRaiseError(...)`; `pnpm test:tstyche` passes.
6. A property test shows each case dispatcher reads **exactly** `childrenOf(node)` (same objects,
   each once, same order) for every node of `policyArbitrary()`/`matcherArbitrary(4)`/`explain(policyArbitrary())`.
7. Stack safety: every ARCH-02 depth test listed in INV-QD-090's **Enforcement** passes unchanged,
   plus a 100,000-deep and a 250,000-wide test on each `fold…Cases` and on `foldTreeBy`.
8. `pnpm vitest run packages/core/test/Simplify.test.ts packages/core/test/Explanation.test.ts packages/core/test/Predicate.test.ts packages/core/test/RolesAndDepth.test.ts packages/core/test/Matcher.test.ts packages/devtools/test/model/Remedies.test.ts packages/devtools/test/model/WhatIf.test.ts`
   passes with **no test edited** in those files except the ones §7 names.
9. Stryker: the core and devtools runs report **no** Survived/NoCoverage mutant on any line T0's
   baseline attributes to a C2/C3 helper (they no longer exist), and **no** Survived mutant in the
   new dispatchers or in `foldTreeBy`'s `resultOf`; both runs stay at or above `break: 80`.
10. Benchmarks (interleaved A/B, T10): `Evaluate.bench.ts`'s `matcher-heavy` and `depth scaling`
    workloads are inside the baseline's own run-to-run spread; `policyDepth`/`simplify`/`explain`
    on the new `Fold.bench.ts` are no worse than baseline beyond that spread.
11. `SWITCH_BUDGET` unchanged (`Evaluate.ts: 1`, `Matcher.ts: 2`); `pnpm lint` (house style) and
    `pnpm circular` pass; `pnpm check` passes.

## 3. Non-goals

- **`Trace` folds.** `renderTrace`/`diffTraces` and a `foldTrace` are ARCH-22's (ADR-QD-090 "Not
  yet"). This plan's T12 adds one sentence to that list: when ARCH-22 builds `foldTrace`, it should
  ship in the case form from the start.
- **Devtools' `TreeFold.ts` twin and `Inspect.ts`** (N3). Its nodes have no tag-determined arity.
- **`evaluateNode` and `judgeMatcher`.** They are effectful/short-circuiting, not post-order folds,
  and they are `SWITCH_BUDGET` sites (ADR-QD-034). ARCH-26 owns the stepper.
- **Removing the array form** (D-17-a recommends keeping it). Its removal, if ever, is its own
  breaking change with its own changeset.
- **Making `referencesAction`/`referencesResource` cheaper by memoisation.** N2 is recorded and
  D-17-h offers only the zero-risk leaf fast path inside `TreeFold.ts`; a per-matcher memo is a
  separate trade-off for ARCH-26's benchmark gate.
- **Changing what any consumer computes.** Every migration is behaviour-preserving; §7's
  differential tests prove it.

## 4. Constraints

- **AGENTS.md §1** — namespace `effect/*` imports; devtools imports `foldPolicyCases`,
  `foldMatcherCases`, `leafCases`, `leafMatcherCases` **from `@qadi/core`'s root**, never a subpath.
  `foldTreeBy` stays out of the barrel (§9), reachable only via the `./*` wildcard subpath.
- **AGENTS.md §5a / ADR-QD-034 / `SWITCH_BUDGET`** — each adapter's dispatcher is a
  `Match.type<…>().pipe(Match.tagsExhaustive({…}))` **built once at module scope**, its arms
  returning a generic `Step`. No `switch` is added, so `SWITCH_BUDGET` and
  `SWITCH_BUDGET_NAMES` are untouched; any count change fails gate `pnpm lint`.
- **AGENTS.md §6 / `no-type-assertion`, `no-non-null-assertion`, `ANY_BUDGET`** — the prototype
  needs none; `ANY_BUDGET` (scoped to `HttpApiMiddlewareClient.ts`) is untouched. A consumer that
  "needs" `children[0]!` is the bug this plan removes.
- **`UNTRACED_BUDGET`, `SCHEMA_ERROR_BUDGET`, `HAS_CUSTOM_BUDGET`, `DECISION_READ_BUDGET`,
  `PORT_DOUBLE_BUDGET`** — not interacted with: nothing here is effectful, an error class, a
  `hasCustom(` call, an `AsyncResult` read or a port double. (`leafCases`'s `HasCustom` *arm key* is
  not a `hasCustom(` call; the budget's regex counts calls.)
- **ADR-QD-090** — "one seam": the case form must ride the *same* loop as the array form (D-17-b),
  not a second copy. The devtools twin is unaffected. INV-QD-090 must stay true of every new export.
- **ADR-QD-037 (`pnpm circular`)** — every new export lives in the module that owns its ADT
  (`Policy.ts`, `Matcher.ts`, `Explanation.ts`) and `TreeFold.ts`; no new import edge. Type-only
  edges count, so `RuleResult` must not import from `Explanation.ts` or vice versa.
- **Gate `pnpm spec:api` (`scripts/check-api-surface.mjs`)** — every new barrel export
  (`foldPolicyCases`, `PolicyCases`, `RuleResult`, `LeafPolicy`, `leafCases`, `foldMatcherCases`,
  `MatcherCases`, `LeafMatcher`, `leafMatcherCases`, `foldExplanationCases`, `ExplanationCases`,
  `RowResult`) must appear in `spec/overview.md`'s tables, and `foldTreeBy` (wildcard subpath) in
  "Not listed above".
- **Gate `pnpm spec:examples` / `pnpm spec:website-examples`** — any ` ```typescript ` fence added
  to `spec/behaviors/*.md` or the website must compile against the real API; signature listings use
  ` ```ts ` (AGENTS.md §12).
- **Coverage** (`pnpm coverage`): core 95%, devtools `src/model` 95% (ADR-QD-047). Deleting
  unreachable throws raises both; `foldTreeBy`'s miss branch must be covered by T1's test.
- **Stryker** (`pnpm mutation`, `break: 80`, `ignoreStatic: true` per ADR-QD-076, sequential per
  ADR-QD-098): the module-scope dispatchers are static initialisers and are skipped as static; the
  arms' *bodies* run per call and are mutated, and must be killed (criterion 9).
- **Gate `pnpm test:tstyche`** — type-level tests for the new interfaces (criterion 5).
- **Changeset (ADR-QD-038)** — one `.changeset/*.md`, `minor`, fixed group. Per the user's
  standing instruction, **no release, no version-packages merge, no publish**.

## 5. Decisions needed before work starts

### D-17-a — Does the array form stay public?

- **(a) Keep `foldPolicy`/`foldMatcher`/`foldExplanation` public and unchanged, add the case form
  beside them.** Non-breaking (N4). Two interfaces per ADT, each the right one for its job: the
  array form for a homogeneous fold (count, max, any — "a node and its children's results"), the
  case form for anything that reads a child by position. Risk: a future consumer picks the array
  form for an arity-sensitive fold and writes an eighth `expectOne`; mitigated by doc comments on
  both and by Stryker flagging the helper as unkillable.
- **(b) Add the case form, migrate every in-repo consumer, mark the array form `@deprecated`, and
  remove it in a later minor.** One interface eventually; the deprecation is itself a breaking
  change on a 0.x minor later. Costs the hot `referencesRef` its measured ≈110–150 ns/call (C7) or
  a hand-written non-fold.
- **(c) Replace outright.** Breaking now (N4); same hot-path cost as (b).

**Recommendation: (a).** The array form is not a mistake — it is the correct interface for the
three homogeneous in-repo folds (D-17-d) and for most external ones — and removing it costs a
measured hot-path regression for no type-safety gain (a homogeneous fold has no arity to check).
`status: decided (2026-10-07, (a) keep the array form public and unchanged)`

### D-17-b — How the case form rides `TreeFold.ts`

- **(a) One loop, two projections.** `TreeFold.ts`'s loop keeps its frames' `results` arrays (the
  array form needs them) and also exposes a per-call `resultOf(child)` reading the memo it already
  keeps; `foldTree` (array) and `foldTreeBy` (named) are one-line projections of it. One mechanism,
  as ADR-QD-090 requires. Cost: one `resultOf` closure per fold call for array-form callers — to be
  measured on `referencesAction` in T1.
- **(b) Two loops** (`foldTree` and a separate `foldTreeBy`, as the prototype did). Simplest, but a
  second copy of the mechanism — the exact thing ADR-QD-090 removed.
- **(c) Positional: the case dispatcher reads `results[0]`/zips `results` with rows.** No `resultOf`,
  but every adapter keeps one arity check of its own — three unkillable guards instead of seven, not
  zero.
- **(d) A per-tag record table instead of `Match`** (`probe2.ts` V2: ≈ array-form speed). Needs a
  correlated-union index (`steps[node._tag](node, …)`), which the prototype could only type with a
  cast, and an AGENTS.md §5a exception like ADR-QD-092's. Not justified: the arity-sensitive
  consumers already pay a `Match` per node, so (a)'s dispatch is cost-neutral for them (C7).

**Recommendation: (a)**, falling back to (b) only if T1's benchmark shows the array form regressing
outside noise on `referencesAction`, in which case the ADR amendment records why two loops exist.
`status: decided (2026-10-07, (a) one loop, two projections — measured against a second loop (b): indistinguishable, so one seam; the array form passes `combine` straight through)`

### D-17-c — The shape of the leaf arms

- **(a) Every tag is its own arm** (16 for `Policy`, 12 for `Matcher`, 7 for `Explanation`), **plus
  exported `leafCases(f)` / `leafMatcherCases(f)` helpers** that build all leaf arms from one
  function over the `LeafPolicy`/`LeafMatcher` sub-union. One dispatch per node; a consumer with
  per-leaf semantics writes each leaf arm, one with uniform leaves spreads the helper; a new leaf tag
  is a compile error in the helper (TS2741) and in every consumer that lists leaves. Larger surface
  (two helpers, two sub-union types).
- **(b) Composite arms plus one `Leaf` arm over `LeafPolicy`.** Smallest interface. A consumer with
  per-leaf semantics (`explain`, `compileTree`, `requirementsOf`, `matcherText`, `satisfyingValue`)
  needs a second `Match` over `LeafPolicy` — two dispatches per leaf; and a new composite tag that is
  forgotten in the composite list silently becomes a "leaf" whose children are folded and ignored.
- **(c) Per-tag arms only, no helper.** `simplify`, `policyDepth` and `restrictsFields` each list ten
  identical leaf arms — the ten-leaf restatement ARCH-02 C4 removed from `restrictsFields`.

**Recommendation: (a).** Complete and single-dispatch; the helpers keep uniform consumers from
re-listing leaves, and exhaustiveness holds in both places. `status: decided (2026-10-07, (a) every tag its own arm plus `leafCases`/`leafMatcherCases`)`

### D-17-d — Which in-repo consumers migrate

- **(a) Every arity-sensitive fold, plus `policyDepth`; homogeneous folds stay on the array form.**
  Migrate `simplify`, `explain`, `matcherText`, `renderExplanation`, `compileTree`, `requirementsOf`,
  `satisfyingValue` (all seven helpers and five `Rules` checks go) and `policyDepth` (measured faster,
  deletes `matcherOf`/`leafNesting`, N1). Keep `referencesRef` (hot path, C7), `matcherDepth` and
  `restrictsFields` on the array form: each is "any/max over children", has no arity to check, and
  keeps the array form exercised by `src` and by Stryker.
- **(b) Everything.** One style in-repo; costs `referencesRef` ≈110–150 ns per call on the evaluate
  path (8 calls per `matcher-heavy` evaluation), and `restrictsFields` needs `leafCases` plus six
  composite arms to say "any".
- **(c) Core only; devtools' `Remedies.ts` stays on the array form.** Smaller blast radius (no
  devtools Stryker run needed), but leaves two of the seven helpers and one `Rules` check in place.

**Recommendation: (a).** `status: decided (2026-10-07, (a) with one deviation: `policyDepth` stays on the array form — measured +5–7% on a fresh evaluate in the one-loop implementation; `referencesRef`, `matcherDepth`, `restrictsFields` stay too)`

### D-17-e — Names

- **(a) `foldPolicyCases` / `foldMatcherCases` / `foldExplanationCases`, `PolicyCases<R>` /
  `MatcherCases<R>` / `ExplanationCases<R>`, `RuleResult<R>` (`{ rule: Rule; result: R }`),
  `RowResult<R>` (`{ row: Row; result: R }`), `LeafPolicy`, `LeafMatcher`, `leafCases`,
  `leafMatcherCases`; `TreeFold.ts`'s `foldTreeBy`.** The review's names; the `…Cases` suffix says
  "an object of per-tag arms", consistent with `Match.tagsExhaustive`'s vocabulary.
- **(b) Overload `foldPolicy(self, combineOrCases)`.** One name, but a `typeof` branch in an exported
  function and an overload signature in every doc — and it hides which interface a call site uses.
- **(c) `foldPolicyBy` / `matchFoldPolicy`.** No precedent in the codebase.

**Recommendation: (a).** `status: decided (2026-10-07, (a) the review's names)`

### D-17-f — Consumers whose arms close over per-call state

`compileTree` (subject, action, matcher context), `renderExplanation` (`term`) and
`satisfyingValue` (input, matcher context) need per-call values inside their arms.

- **(a) Build the cases object per call.** Measured ≈0.8 µs per call for a 12-arm object (C7) —
  off the request path for `renderExplanation`/`satisfyingValue`, and for `compileTree` it
  *replaces* today's `Match.value(node)` rebuilt per **node** (`Predicate.ts:437`), so it is a net
  improvement. No API change.
- **(b) A third `context` argument, `foldPolicyCases(self, cases, context)`,** with arms
  `(p, r, ctx) => …`, so every cases object hoists. Wider interface for three callers, two of them
  off the hot path.

**Recommendation: (a).** `status: decided (2026-10-07, (a) build the cases object per call)`

### D-17-g — ADR handling

- **(a) Amend ADR-QD-090 in place**: Revision 1.1, a dated `## Amendment (ARCH-17)` section stating
  the case form, the dispatcher-beside-`childrenOf` locality rule, the lockstep property test, and
  the measurements; Document Control `Status` gains "amended by CCR-QD-NEXT".
- **(b) A new ADR-QD-NEXT "A fold hands children in the ADT's shape"** that amends ADR-QD-090.

**Recommendation: (a)**, as the brief requires: the seam and its rationale are unchanged; only its
interface widens. `status: decided (2026-10-07, (a) amend ADR-QD-090 in place, Rev 1.2 — Rev 1.1 was taken by ADR-QD-099)`

### D-17-h — `TreeFold`'s leaf fast path (N2)

- **(a) Take it here.** In the shared loop, a root whose `childrenOf` is empty is combined directly
  without allocating the memo, the path set or a frame; the children array is still read once.
  Measured `referencesAction(eq(…))` 424→198 ns; no change for a nested matcher. Touches the loop
  this plan already touches, behind its own task (T13) so it reverts alone.
- **(b) Defer to ARCH-26**, whose benchmark gate owns evaluate-path cost.
- **(c) Drop.**

**Recommendation: (a)**, as the last code task, benchmark-gated and independently revertible; if the
orchestrator prefers to keep ARCH-17 strictly about arity, (b). `status: decided (2026-10-07, (a) taken, then dropped on measurement: no gain on matcher-heavy, one-wrapper `referencesAction` +9% — reverted per T13's rule)`

## 6. Tasks

Every task branches from (or continues on) `arch/17-case-wise-fold`, cut from `main`. `$S` below is
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/<session>/scratchpad/arch17/`.

### T0 — Re-baseline

- **Status:** [x] done — greps reproduce; mutation baseline run at HEAD (scoped Stryker, core and devtools) and bench baseline taken as an interleaved in-process A/B with an A/A control, because load made `pnpm bench` unusable
- **Depends on:** —
- **Files:** none in the repo; notes under `$S`
- **Steps:**
  1. `git switch -c arch/17-case-wise-fold main`; record `git rev-parse --short HEAD`.
  2. Re-run §1's greps: C2's helper grep, C3's message grep, C6's consumer grep, C7's
     `grep -n "referencesAction\|referencesResource\|policyDepth(" packages/core/src/Evaluate.ts`.
     Update §1 line numbers if anything moved; if ARCH-20 or ARCH-22 landed first, re-read
     `Remedies.ts`/`Explanation.ts` and note the new lines.
  3. Mutation baseline, sequentially (ADR-QD-098):
     `pnpm exec stryker run stryker.config.mjs --mutate "packages/core/src/{Simplify,Explanation,Predicate,Policy,Matcher,TreeFold}.ts"`,
     then `pnpm exec stryker run stryker.devtools.mjs --mutate "packages/devtools/src/model/Remedies.ts"`.
     With `$S/mut.mjs` (copy of the probe's reader) list every Survived/NoCoverage mutant; tag each
     that sits on a C2 helper, a C3 check or a call site's tag-name string. Save the table to
     `$S/baseline-mutants.md`. Expected order of magnitude (C4's pre-ARCH-02 counts extrapolated):
     ≈6 per helper × 7, ≈21 tag-name strings, ≈9 per index-form `Rules` check × 2, ≈3 per iterator
     form × 2 — **≈85**.
  4. Benchmark baseline: `pnpm --filter @qadi/core bench -- Evaluate.bench.ts` four times; keep the
     medians of `matcher-heavy`, `depth 5/10/20/40` (these build a fresh policy per iteration, so
     they re-run `policyDepth`'s fold every time) and `one node`.
- **Tests:** none
- **Verify:** the greps reproduce §1; the two Stryker runs finish.
- **Done when:** `$S/baseline-mutants.md` and the bench medians exist and §10 has a T0 row.

### T1 — `TreeFold.ts`: one loop, a named-child projection (test-first)

- **Status:** [x] done — `foldTreeBy` on the same loop (D-17-b(a)); micro-bench caught a 40% array-form regression from a per-call reader closure, fixed by passing `combine` straight through
- **Depends on:** T0, D-17-b, D-17-e
- **Files:** `packages/core/src/TreeFold.ts`, `packages/core/test/TreeFold.test.ts`
- **Steps:**
  1. **Red:** in `TreeFold.test.ts` add a `describe("foldTreeBy")` mirroring every existing
     `foldTree` case (post-order; shared node combined once, same reference; `childrenOf` called once
     per distinct node; 100,000 deep; 250,000 wide; cycle and self-cycle throw; diamond is not a
     cycle; `undefined` results stored without a sentinel; children array read once) plus two new
     ones: (i) a `combine` that calls `resultOf` on a node `childrenOf` did not list throws
     `/not folded as a child/`; (ii) `resultOf` on a shared child returns the identical reference
     both times. Run: fails (no export).
  2. Under D-17-b(a): restructure the loop body into a private `walk<N, R>(root, childrenOf,
     finish: (node: N, results: ReadonlyArray<R>, resultOf: (child: N) => R) => R)`; keep frames'
     `results`; define `resultOf` once per call over `memo`, throwing
     `Error("foldTree: combine read a node that was not folded as a child")` on a miss. Export
     `foldTree = (root, childrenOf, combine) => walk(root, childrenOf, (n, rs) => combine(n, rs))`
     (signature unchanged) and `foldTreeBy = (root, childrenOf, combine) => walk(root, childrenOf,
     (n, _rs, resultOf) => combine(n, resultOf))`. Under D-17-b(b): add `foldTreeBy` as the
     prototype's separate loop and say so in the doc comment.
  3. Doc comment: lead with the one-line summary; the paragraph after explains why a named read
     makes arity a type for the adapters and why the miss is the one reachable check.
  4. Micro-bench (scratch, not committed): `referencesAction(eq(subject("x")))` and
     `fieldMatch("level", gte(2))` before/after this change, interleaved ×4. If the array form
     regresses outside the before-runs' spread, switch to D-17-b(b) and record it.
- **Tests:** the new `foldTreeBy` describe block; existing `foldTree` tests unchanged.
- **Verify:** `pnpm vitest run packages/core/test/TreeFold.test.ts`; `pnpm typecheck`
- **Done when:** both describe blocks pass and the micro-bench result is in §10.

### T2 — Type-level tests for the three case interfaces (test-first)

- **Status:** [x] done — `Policy.tst.ts`, new `Matcher.tst.ts`, `Explanation.tst.ts` (negative cases pinned with `not.toBeCallableWith`, not `toRaiseError`, because tsc also compiles `.tst.ts`)
- **Depends on:** T0, D-17-c, D-17-e
- **Files:** `packages/core/test/Policy.tst.ts`, *new* `packages/core/test/Matcher.tst.ts`,
  *new* `packages/core/test/Explanation.tst.ts`
- **Steps:**
  1. `Policy.tst.ts`: `foldPolicyCases` infers `R` from the arms; `Not`/`Obliged`/`Labeled`'s second
     parameter is `R` (`expect<Parameters<PolicyCases<number>["Not"]>[1]>().type.toBe<number>()`);
     `Rules`'s is `ReadonlyArray<RuleResult<number>>`; a cases object missing `Rules`
     `toRaiseError("Rules")`; `{ ...leafCases(() => 0), AllOf: …, … }` type-checks; `leafCases`'s
     return type has exactly `LeafPolicy["_tag"]` keys.
  2. `Matcher.tst.ts`: the same for `MatcherCases` (four wrappers receive `R`), `leafMatcherCases`.
  3. `Explanation.tst.ts`: `Negated`/`Named`/`Owing` receive `R`; `Table` receives
     `ReadonlyArray<RowResult<R>>`.
  4. Run `pnpm test:tstyche`: red (exports missing). Commit together with T3–T5 so the branch never
     carries a red gate.
- **Tests:** as above.
- **Verify:** `pnpm test:tstyche`
- **Done when:** the three files fail only because the exports are missing.

### T3 — `foldPolicyCases` in `Policy.ts`

- **Status:** [x] done
- **Depends on:** T1, T2
- **Files:** `packages/core/src/Policy.ts`, `packages/core/test/Policy.test.ts`
- **Steps:**
  1. Beside `childrenOf` (`:1081`), add `type LeafPolicy = Exclude<Policy, { readonly _tag:
     "AllOf" | "AnyOf" | "Rules" | "Not" | "Obliged" | "Labeled" }>`, `interface RuleResult<R>`,
     `interface PolicyCases<R>` (16 readonly arms, composites as in §1's prototype), and
     `leafCases = <R>(f: (node: LeafPolicy) => R): Pick<PolicyCases<R>, LeafPolicy["_tag"]>` (an
     object literal of the ten leaf keys).
  2. Add the module-scope dispatcher `policyStep: (node: Policy) => PolicyStep`, with
     `type PolicyStep = <R>(cases: PolicyCases<R>, resultOf: (child: Policy) => R) => R`, built with
     `Match.type<Policy>().pipe(Match.tagsExhaustive({…}))`, arms exactly as in
     `scratchpad/.../ARCH-17/core/src/PolicyCases.ts`: composites read `p.policies.map(resultOf)`,
     `p.rules.map((rule) => ({ rule, result: resultOf(rule.condition) }))`, `resultOf(p.policy)`.
     Its doc comment states the lockstep rule: "reads exactly what `childrenOf` lists".
  3. `export const foldPolicyCases = <R>(self: Policy, cases: PolicyCases<R>): R =>
     foldTreeBy(self, childrenOf, (node, resultOf) => policyStep(node)(cases, resultOf));`
     Doc: one-line summary; then "use this when an arm reads a child by position; use `foldPolicy`
     for a fold that treats children alike".
  4. `foldPolicy`'s doc comment gains the converse pointer. Its code is unchanged.
  5. Tests in `Policy.test.ts`: (i) **lockstep property** over `policyArbitrary()` and
     `sharedPolicyArbitrary`: instrument `resultOf` by folding with arms that record which child
     objects they received (compare to `childrenOf(node)` element-wise, by identity, in order — for
     `Rules`, `rows.map(r => r.rule.condition)`); (ii) `foldPolicyCases` with counting arms equals
     `foldPolicy`'s node count; (iii) 100,000 `not`, 100,000 one-row `rules`, 250,000-wide `anyOf`;
     (iv) cycle throws; (v) `leafCases` routes each of the ten leaf tags (one fixture each).
- **Tests:** as above; T2's `Policy.tst.ts` goes green.
- **Verify:** `pnpm vitest run packages/core/test/Policy.test.ts`; `pnpm test:tstyche`; `pnpm circular`
- **Done when:** green, and `pnpm lint` reports `SWITCH_BUDGET` unchanged.

### T4 — `foldMatcherCases` in `Matcher.ts`

- **Status:** [x] done
- **Depends on:** T1, T2
- **Files:** `packages/core/src/Matcher.ts`, `packages/core/test/Matcher.test.ts`
- **Steps:**
  1. Beside `matcherChildrenOf` (`:457`): `LeafMatcher`, `MatcherCases<R>` (eight leaf arms
     `(m) => R`, four wrappers `(m, child: R) => R`), `leafMatcherCases`, a module-scope
     `matcherStep` dispatcher, `foldMatcherCases` over `foldTreeBy(self, matcherChildrenOf, …)`.
  2. `foldMatcher`, `matcherDepth`, `referencesRef` unchanged (D-17-d(a)).
  3. Tests: lockstep property over `matcherArbitrary(4)`; 100,000 nested `size`; `leafMatcherCases`
     routes all eight leaf tags.
- **Tests:** as above; `Matcher.tst.ts` green.
- **Verify:** `pnpm vitest run packages/core/test/Matcher.test.ts`; `pnpm test:tstyche`
- **Done when:** green.

### T5 — `foldExplanationCases` in `Explanation.ts`

- **Status:** [x] done
- **Depends on:** T1, T2
- **Files:** `packages/core/src/Explanation.ts`, `packages/core/test/Explanation.test.ts`
- **Steps:**
  1. Beside `explanationChildrenOf` (`:125`): `RowResult<R>`, `ExplanationCases<R>` (`Requirement`,
     `All`/`Any` with `parts: ReadonlyArray<R>`, `Negated`/`Named`/`Owing` with `part: R`, `Table`
     with `rows: ReadonlyArray<RowResult<R>>`), module-scope `explanationStep`,
     `foldExplanationCases`. No leaf helper: one leaf tag.
  2. Tests: lockstep property over `explain(policyArbitrary())`; 100,000 nested `Negated`;
     250,000-part `Any`.
- **Tests:** as above; `Explanation.tst.ts` green.
- **Verify:** `pnpm vitest run packages/core/test/Explanation.test.ts`; `pnpm test:tstyche`
- **Done when:** green. T2–T5 commit together.

### T6 — Migrate `policyDepth`; delete `matcherOf` and `leafNesting`

- **Status:** [-] dropped — `policyDepth` on the case form measured +5–7% on a fresh evaluate over the A/A control (D-17-d deviation); stays on `foldPolicy`, `matcherOf`/`leafNesting` stay
- **Depends on:** T3, D-17-d
- **Files:** `packages/core/src/Policy.ts`
- **Steps:**
  1. Replace the body's fold with a module-scope `depthCases: PolicyCases<number>` =
     `{ ...leafCases(() => 0), HasAttribute: (p) => matcherDepth(p.matcher), HasResourceAttribute:
     (p) => matcherDepth(p.matcher), AllOf/AnyOf: (_p, rs) => rs.length === 0 ? 0 : 1 + maxOf(rs),
     Rules: (_p, rows) => rows.length === 0 ? 0 : 1 + maxOf(rows.map(…)), Not/Obliged/Labeled:
     (_p, r) => 1 + r }` (hoisted: it closes over nothing). Keep `depthMemo`.
  2. Delete `matcherOf` (`:1165-1184`) and `leafNesting` (`:1187-1190`) and the comment at
     `:1232-1234` that justified asking every node. Keep `maxOf`.
- **Tests:** unchanged; `RolesAndDepth.test.ts` (100k/250k, agreement with `evaluate` both
  directions) and `Policy.test.ts`'s manual-count property cover it.
- **Verify:** `pnpm vitest run packages/core/test/RolesAndDepth.test.ts packages/core/test/Policy.test.ts packages/core/test/Evaluate.test.ts`
- **Done when:** green with no test edited.

### T7 — Migrate `simplify`; delete `expectOne` and both `Rules` checks

- **Status:** [x] done
- **Depends on:** T3, D-17-d
- **Files:** `packages/core/src/Simplify.ts`
- **Steps:**
  1. Replace `rebuild` (`:117-216`) with a module-scope `simplifyCases: PolicyCases<Policy>`:
     `...leafCases((p) => p)`; `AllOf`/`AnyOf` bodies verbatim (the `[only, ...rest]` unwrap and its
     comment at `:137-145` stay — that check is real, not arity); `Not`/`Labeled`/`Obliged`:
     `(p, policy) => ({ ...p, policy })` keeping each arm's existing comment (the double-negation
     finding stays on `Not`); `Rules: (p, rows) => ({ ...p, rules: rows.map(({ rule, result }) =>
     ({ ...rule, condition: result })) })` keeping the "row order is semantic" comment.
  2. Delete `expectOne` (`:86-100`). `simplify = (policy) => foldPolicyCases(policy, simplifyCases)`;
     update its doc comment's "Folds through `foldPolicy`" to `foldPolicyCases`.
- **Tests:** unchanged; `Simplify.test.ts` (properties: verdict/field/obligation preservation,
  100k/250k) is the differential. Add one example asserting `simplify(rules([permitWhen(allOf([a])),
  denyWhen(b)]))` keeps row order and effects (pins the `{ ...rule, condition }` rebuild).
- **Verify:** `pnpm vitest run packages/core/test/Simplify.test.ts`
- **Done when:** green; C2/C3 greps no longer hit `Simplify.ts`.

### T8 — Migrate `explain`, `matcherText`, `renderExplanation`; delete three helpers, both `Rules` checks and the `Table` index

- **Status:** [x] done
- **Depends on:** T3, T4, T5, D-17-d, D-17-f
- **Files:** `packages/core/src/Explanation.ts`
- **Steps:**
  1. `matcherTextStep` (`:185-205`) → module-scope `matcherTextCases: MatcherCases<string>` (eight
     leaf arms verbatim; wrappers `(m, text) => \`has ${m.field} that ${text}\``, …).
     `matcherText = (m) => foldMatcherCases(m, matcherTextCases)`. Delete `expectOneText`
     (`:165-179`).
  2. `rebuildExplanation` (`:245-358`) → module-scope `explainCases: PolicyCases<Explanation>`: the
     ten leaf arms verbatim (each a direct `(p) => requirement(…)`), `AllOf`/`AnyOf` as today,
     `Not: (_p, part) => ({ _tag: "Negated", part })`, `Labeled`, `Obliged` likewise, `Rules: (p,
     rows) => ({ _tag: "Table", rows: rows.map(({ rule, result }) => ({ effect: rule.effect,
     condition: result })), combining: p.combining })`. Delete `expectOne` (`:221-235`).
     `explain = (policy) => foldPolicyCases(policy, explainCases)`.
  3. `renderStep` (`:591-640`) → a per-call `renderCases(context): ExplanationCases<Piece>`
     (D-17-f(a)); each arm returns `{ text, atomic: isAtomic(node) }`; `Negated`/`Named`/`Owing`
     use `embed(part)` directly; `Table: (e, rows) => …rows.map(({ row, result }, i) => \`[${i}]
     ${row.effect.toLowerCase()} when ${embed(result)}\`)`. Delete `expectOnePiece` (`:552-564`),
     the `Render`/`render` scaffolding if unused, and the `conditions[i]` read.
  4. Keep every existing doc comment's *why* paragraph that still applies (INV-QD-031,
     ADR-QD-092 amendment, EK-04); rewrite the sentences that said "supplied in `childrenOf` order".
- **Tests:** unchanged; `Explanation.test.ts` (renderings, INV-QD-031 injectivity, out-of-union
  values, 100k/250k, deep matcher) is the differential.
- **Verify:** `pnpm vitest run packages/core/test/Explanation.test.ts packages/core/test/HydrationWarning.test.ts`;
  `pnpm vitest run packages/react` (react's `HydrationWarning.ts` calls `explain`)
- **Done when:** green; C2/C3/criterion-4 greps no longer hit `Explanation.ts`.

### T9 — Migrate `compileTree`; delete `onlyChild` and the `Rules` iterator throw

- **Status:** [x] done
- **Depends on:** T3, D-17-d, D-17-f
- **Files:** `packages/core/src/Predicate.ts`
- **Steps:**
  1. Inside `compileTree` (`:385-565`), replace `compileNode`'s per-node `Match.value(node)`
     (`:436-557`) with a per-call `const cases: PolicyCases<Compiled> = { … }` — leaf arms verbatim;
     `AllOf: (_p, folded) => …plansOf(folded)…`; `AnyOf` likewise; `Not: (_p, plan) => plan
     instanceof Refusal ? plan : planned({ _tag: "Negation", plan })`; `Labeled: (_p, plan) => plan`;
     `Obliged: () => refused(…)` (ignores its child, as today); `Rules: (p, rows) => { const plans =
     plansOf(rows.map((r) => r.result)); … rules = rows.map(({ rule }, i) …)` — better: walk `rows`
     once, returning the first `Refusal` in row order, else pairing `rule.effect` with the plan.
  2. Delete `onlyChild` (`:402-412`) and the iterator + throw (`:543-548`), and the comment that
     justified them.
  3. `return foldPolicyCases(policy, cases)`. The comment at `:559-563` keeps the "first refusal in
     declaration order" argument, now about `plansOf`/the row walk.
  4. `restrictsFields` (`:275-279`) stays on `foldPolicy` (D-17-d(a)).
- **Tests:** unchanged; `Predicate.test.ts` (refusal order, `Not`/`Labeled` transparency, rule tables,
  100k `not`/`labeled`, 250k wide) and the `predicate-sql`/`predicate-prisma` goldens are the
  differential.
- **Verify:** `pnpm vitest run packages/core/test/Predicate.test.ts packages/predicate-sql packages/predicate-prisma`
- **Done when:** green; greps no longer hit `Predicate.ts`.

### T10 — Migrate devtools `Remedies.ts`; delete `onlyWitness`, `onlyRequirements`, the `Rules` throw and `checked`'s `isLeaf`

- **Status:** [x] done — plus a `hasSignature` test for a previously uncovered arm
- **Depends on:** T3, T4, D-17-d (skip entirely under D-17-d(c))
- **Files:** `packages/devtools/src/model/Remedies.ts`
- **Steps:**
  1. Import `foldMatcherCases`, `leafMatcherCases` (if used), `foldPolicyCases`, `leafCases`,
     `PolicyCases`, `MatcherCases` from `@qadi/core` (root import, AGENTS.md §1).
  2. `witnessStep` (`:199-268`) → a per-call `witnessCases(input, context): MatcherCases<Synthesised>`
     (D-17-f(a)); each **leaf** arm returns `checked(node, witness, context)`; wrapper arms
     `(m, child) => mapValue(child, …)`. `checked` loses its `isLeaf` parameter. Delete
     `onlyWitness` (`:175-186`) and `step`/`Step` if unused. `satisfyingValue` folds through
     `foldMatcherCases`.
  3. `requirementStep` (`:359-409`) → module-scope `requirementCases: PolicyCases<ReadonlyArray<Requirement>>`
     (leaf arms verbatim; `Rules: (_p, rows) => concat(rows.filter((r) => r.rule.effect ===
     "Permit").map((r) => r.result))`; `Not: () => []`; `Obliged`/`Labeled: (_p, r) => r`). Delete
     `onlyRequirements` (`:333-348`) and the throw at `:400`. Keep the anti-remedy comments.
  4. Update `Remedies.ts:178,196,337,418` comments that cite "by construction of `foldMatcher`/`childrenOf`".
- **Tests:** unchanged; `Remedies.test.ts` (100k, witness-is-checked, anti-remedy for `Deny` rows
  and `Not`), `WhatIf.test.ts` (100k labeled) are the differential.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Remedies.test.ts packages/devtools/test/model/WhatIf.test.ts packages/devtools/test/model/Simulation*.test.ts`
- **Done when:** green; greps no longer hit `Remedies.ts`.

### T11 — Benchmark gate

- **Status:** [x] done — interleaved in-process A/B + A/A control (see ADR-QD-090 amendment); `Fold.bench.ts` added
- **Depends on:** T6–T10
- **Files:** *new* `packages/core/bench/Fold.bench.ts`
- **Steps:**
  1. `Fold.bench.ts` (vitest bench, same `options` as `Evaluate.bench.ts`): `policyDepth` on a fresh
     `buildDeep(10)`/`(40)` per iteration (memo miss), `simplify` and `explain` on `deep`,
     `wrapper-heavy` and a 3-row `rules`, `renderExplanation(explain(deep))`. Doc comment says what it
     measures and why it is separate from `Evaluate.bench.ts` (the fold is off the evaluate path
     except `policyDepth` on a miss and `referencesRef`, which this plan leaves on the array form).
  2. Interleaved A/B, four runs each, alternating `main` and the branch (`git stash` not needed:
     use a second worktree of `main` for A), medians of ops/s, for `Evaluate.bench.ts`
     (`matcher-heavy`, `depth 5/10/20/40`, `one node`) and `Fold.bench.ts`.
  3. Threshold: a workload regresses only if the branch median is below the *A* runs' minimum. Any
     regression on `Evaluate.bench.ts` blocks T13; a regression on `Fold.bench.ts` is recorded in
     the ADR amendment with its size (these are off the request path).
- **Tests:** none
- **Verify:** `pnpm --filter @qadi/core bench -- Evaluate.bench.ts Fold.bench.ts`
- **Done when:** the A/B table is pasted into §10 and the ADR draft.

### T12 — Mutation check

- **Status:** [x] done — before/after table in the ADR amendment
- **Depends on:** T6–T10
- **Files:** none (reports only)
- **Steps:**
  1. Re-run T0 step 3's two scoped Stryker commands, sequentially.
  2. Compare against `$S/baseline-mutants.md`: every baseline row tagged C2/C3 must be gone; list any
     new Survived/NoCoverage mutant. Expected new mutants: each dispatcher arm (`ArrowFunction`,
     `ObjectLiteral` in `Rules`) — killed by the lockstep property and the per-tag fixtures;
     `foldTreeBy`'s miss (`BlockStatement`, `StringLiteral`, `ConditionalExpression`) — killed by T1's
     test (the message is asserted by regex). A survivor here is a missing test: add it, do not
     ignore it.
  3. Record before/after Survived + NoCoverage counts per file in §10.
- **Tests:** whatever step 2 finds missing.
- **Verify:** both Stryker runs at or above `break: 80`; the per-file survivor counts drop by T0's
  tagged total (≈85).
- **Done when:** §10 carries the before/after table.

### T13 — `TreeFold` leaf fast path (D-17-h(a) only)

- **Status:** [-] dropped — leaf fast path gave no gain on matcher-heavy (31.6 → 31.9 µs), one-wrapper `referencesAction` +9%; reverted
- **Depends on:** T11, D-17-h
- **Files:** `packages/core/src/TreeFold.ts`, `packages/core/test/TreeFold.test.ts`,
  `packages/devtools/src/model/TreeFold.ts`, `packages/devtools/test/model/TreeFold.test.ts`
- **Steps:**
  1. In `walk`, read `childrenOf(root)` once; if it is empty, return `finish(root, [], resultOf)`
     without allocating `memo`/`onPath`/a frame (for `foldTreeBy`, a leaf's `resultOf` is never
     called; keep a throwing one). Otherwise open the root frame from the array already read, so
     `childrenOf` is still called exactly once per node.
  2. Mirror it in devtools' twin (ADR-QD-090 keeps the two loops identical).
  3. Tests: "a childless root calls `childrenOf` once and `combine` once"; the existing
     "`childrenOf` once per distinct node" test must still pass.
  4. Re-run T11 step 2 for `matcher-heavy` only; keep the change only if it is at or above the A
     runs' maximum median, else revert this task's commit.
- **Tests:** as above.
- **Verify:** `pnpm vitest run packages/core/test/TreeFold.test.ts packages/devtools/test/model/TreeFold.test.ts packages/core/test/Matcher.test.ts packages/core/test/Evaluate.test.ts`
- **Done when:** green and the `matcher-heavy` A/B row is in §10, or the commit is reverted with the
  reason in §10.

### T14 — Spec, ADR amendment, overview, traceability, CCR, website, changeset

- **Status:** [x] done — CCR-QD-190, BEH-QD-318, ADR-QD-090 Rev 1.2, INV-QD-090, overview, traceability, website, changeset
- **Depends on:** T3–T12 (T13 if taken), D-17-g
- **Files:** `spec/decisions/090-a-tree-is-folded-through-one-seam.md`,
  `spec/behaviors/25-inspection.md`, `spec/behaviors/04-matchers.md`,
  `spec/behaviors/18-explanation.md`, `spec/invariants.md`, `spec/overview.md`,
  `spec/traceability.md`, `spec/README.md`, `spec/decisions/index.yaml` (revision only),
  `apps/website/src/content/docs/docs/reference/api.md`, *new* `.changeset/case-wise-fold.md`
- **Steps:** as §8 lists, in that order. Use `CCR-QD-NEXT` / `BEH-QD-NEXT` until the work lands.
- **Tests:** none new.
- **Verify:** `pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:api && pnpm spec:website-examples`
- **Done when:** all five pass.

### T15 — Full gate

- **Status:** [~] not run here — the orchestrator runs `pnpm check` once at the end; the targeted gates passed
- **Depends on:** T14
- **Files:** —
- **Steps:** run `pnpm check`; fix anything it reports in the task that owns it.
- **Tests:** —
- **Verify:** `pnpm check`
- **Done when:** exit 0 on the branch head.

### T16 — Update the tracker

- **Status:** [x] done
- **Depends on:** T15
- **Files:** this plan (frontmatter `status`, task boxes, §10)
- **Steps:** set `status: implemented` (or `done` once merged), tick every task, add the §10 rows.
  The orchestrator updates `.planning/architecture/README.md`.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-17-*.md | sort | uniq -c`
- **Done when:** the grep shows no `[ ] todo`.

## 7. Test strategy

**Replace, don't layer.** The behaviour of every migrated consumer is already pinned by tests that
call the *public* function (`simplify`, `explain`, `renderExplanation`, `toPredicate`, `remedyEdits`,
`satisfyingValue`, `whatIf`, `policyDepth`); those files are the differential and are **not edited**
(criterion 8). Their ARCH-02 depth tests are the stack-safety regression net for the migrations.

- **Survive unchanged:** `Simplify.test.ts`, `Explanation.test.ts` (except below),
  `Predicate.test.ts`, `RolesAndDepth.test.ts`, `Evaluate.test.ts`, `Matcher.test.ts` (except below),
  `Compare.test.ts` (it uses `foldMatcher` as a tag collector — a homogeneous fold, correctly so),
  devtools `Remedies.test.ts`, `WhatIf.test.ts`, `Inspect.test.ts`, both `TreeFold.test.ts` `foldTree`
  blocks, the predicate-sql/prisma goldens, the BDD suite.
- **Added at the new interfaces:** `foldTreeBy` (T1, mirrors `foldTree`'s block + miss + identity);
  per ADT a lockstep property (dispatcher reads exactly `childrenOf`), a count-agreement with the array
  form, 100k/250k, cycle, leaf-helper routing (T3–T5); the three `.tst.ts` files (T2).
- **Moved, not duplicated:** `Policy.test.ts`'s "hands children to combine in childrenOf order, rows
  in row order" stays for `foldPolicy`; its case-form twin is the lockstep property, not a second
  example. `Simplify.test.ts:241`'s `foldPolicy`-based helper stays (homogeneous).
- **Deleted:** nothing — no test reached the deleted throws (C2).
- **Mutation:** T12 compares per-file Survived/NoCoverage against T0's baseline. The expected
  change is ≈85 fewer unkillable mutants (all on deleted lines) and ≈30 new mutants on dispatcher arms
  and `resultOf`, all killed. `ignoreStatic` skips the dispatchers' construction.
- **Property seeds:** new properties use fixed seeds in the `20261017NN` range, `numRuns` 300–500,
  matching `Policy.test.ts`'s convention.

## 8. Spec and documentation updates

1. **ADR-QD-090 (amend, D-17-g(a))** — Revision 1.1, `Status: Accepted — amends ADR-QD-034,
   ADR-QD-024; amended by CCR-QD-NEXT`. New `## Amendment (ARCH-17, 2026-MM-DD)`: the array form
   erased arity (C1); seven helpers and five `Rules` checks restated it (C2, C3) and were unkillable
   (C4, T12 numbers); the case form (`foldPolicyCases`/`foldMatcherCases`/`foldExplanationCases`)
   rides the same loop through `foldTreeBy`'s named read (D-17-b); each dispatcher lives beside its
   `childrenOf` and a lockstep property keeps them in agreement; the array form stays for
   homogeneous folds (D-17-a) and three in-repo folds use it on purpose (D-17-d); T11's A/B table;
   T13's outcome. **"What stays"** gains: `SWITCH_BUDGET` still `Evaluate.ts: 1`, `Matcher.ts: 2`.
   **"Not yet"** gains: "a `Trace` fold, when ARCH-22 builds it, takes the case form from the start".
   **"Alternatives considered"** gains D-17-b(c)/(d), D-17-c(b), D-17-a(b)/(c) with the reasons.
2. **`spec/behaviors/25-inspection.md`** — after BEH-QD-300, new **BEH-QD-NEXT "A policy folds
   case-wise, each arm receiving its children in the tag's own shape"**: ` ```ts ` signature listing
   of `foldPolicyCases`, `PolicyCases`, `RuleResult`, `LeafPolicy`, `leafCases`; REQUIREMENTs: a
   wrapper arm receives exactly its one child's result; a `Rules` arm receives one `{ rule, result }`
   per row, in row order, `rule` being the node's own row; same post-order, sharing, stack-safety and
   cycle requirements as BEH-QD-300. BEH-QD-300's closing sentence ("`policyDepth`, `simplify`,
   `explain` … are all `foldPolicy` users") is corrected to name which use which. One
   ` ```typescript ` example (compiled by `spec:examples`) counting `Not` nodes with `leafCases`.
3. **`spec/behaviors/04-matchers.md`** — BEH-QD-304 gains `foldMatcherCases`/`MatcherCases`/
   `LeafMatcher`/`leafMatcherCases` in its listing and one REQUIREMENT for the wrapper arms.
4. **`spec/behaviors/18-explanation.md`** — BEH-QD-303 gains `foldExplanationCases`/
   `ExplanationCases`/`RowResult` and a REQUIREMENT for `Table` rows; its prose names
   `renderExplanation` as a case-form user.
5. **`spec/invariants.md` INV-QD-090** — **Source** names `foldTreeBy` and the three `…Cases` folds;
   **Enforcement** adds the `foldTreeBy` block and the per-ADT case-form depth tests.
6. **`spec/overview.md`** (gate `pnpm spec:api`) — the "Inspecting a policy…" table gains rows for
   every new export (§4's list) with their source files; the paragraph after it says which form to
   use when; "Not listed above" gains `foldTreeBy` (`@qadi/core/TreeFold.ts`) beside `foldTree`;
   Change History row.
7. **`spec/traceability.md`** — the INV-QD-090 row names the new folds; new rows for
   `packages/core/test/Matcher.tst.ts`, `Explanation.tst.ts` and `bench/Fold.bench.ts` if the matrix
   lists benches; `Policy.tst.ts`'s row gains BEH-QD-NEXT.
8. **`spec/README.md`** — `CCR-QD-NEXT` row: files touched, ADR-QD-090 Rev 1.1, the new BEH id.
9. **`spec/decisions/index.yaml`** — ADR-QD-090's revision/amended-by fields, if the index carries them.
10. **Website** `apps/website/src/content/docs/docs/reference/api.md:53` — name the case forms beside
    the array forms, one sentence on which to use (gate `pnpm spec:website-examples` if a fence is added).
11. **Changeset** `.changeset/case-wise-fold.md` — `@qadi/core: minor`, `@qadi/devtools: patch` (fixed
    group bumps together per ADR-QD-038): "New: `foldPolicyCases`, `foldMatcherCases`,
    `foldExplanationCases` (+ types and leaf helpers). Each case arm receives its children in the tag's
    shape, so a wrapper's one child is `R`, not an array. `foldPolicy`/`foldMatcher`/`foldExplanation`
    are unchanged." No release.
12. **AGENTS.md** — no change: no section governs folds, and no budget moves.

## 9. Risks and rollback

| Risk | How it shows up | Mitigation / rollback |
| ---- | --------------- | --------------------- |
| A dispatcher and `childrenOf` drift apart (an arm reads a field `childrenOf` does not list, or vice versa) | `foldTreeBy` throws "not folded as a child" (first case); a child folded but never read (second case) is silent | The lockstep property (T3–T5) fails on either; the doc comment on each dispatcher names `childrenOf` as its partner; both are `Match.tagsExhaustive`, so a new tag must be added to both |
| The array form regresses from `walk`'s extra `resultOf` closure | T1's micro-bench / T11's `matcher-heavy` row | D-17-b fallback (b): two loops, recorded in the ADR |
| Per-call cases objects cost more than measured | `Fold.bench.ts` / `Predicate`-heavy callers slower | D-17-f(b) (context argument) is an additive follow-up; `compileTree` is still net faster than today's per-node `Match.value` |
| `simplify`/`explain` change output subtly in the rewrite | `Simplify.test.ts`/`Explanation.test.ts` properties, INV-QD-031 injectivity test | Revert the one migration task's commit; each of T6–T10 is a separate commit and independently revertible because the array form still exists |
| ARCH-20 or ARCH-22 lands first and rewrites `Remedies.ts`/`Explanation.ts` | T0's re-read finds moved lines | Rebase; T8/T10 steps are written per function, not per line |
| A future consumer uses the array form for an arity-sensitive fold | An eighth `expectOne` appears and Stryker flags it as unkillable | Doc comments on both forms say which to use; T12-style review on the next mutation run |
| T13's fast path changes `childrenOf`-call counts | `TreeFold.test.ts` "once per distinct node" fails | T13 is its own commit; revert it alone |

**Rollback of the whole plan:** revert the branch's commits in reverse order. Because the array form
is never removed (D-17-a(a)), every intermediate state compiles and passes, and no published
signature changes, so a revert needs no changeset beyond deleting `.changeset/case-wise-fold.md`.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence re-verified at `e328e75`; prototype (`foldTreeBy`, `foldPolicyCases`, case-form `simplify`/`policyDepth`) type-checked and differential-tested in scratchpad | planner |
| 2026-10-07 | T0–T16 | Implemented (wave 3). D-17-a…h decided at the recommended defaults, with two measured deviations: T6 (`policyDepth` stays on the array form) and T13 (leaf fast path reverted). Ids: CCR-QD-190, BEH-QD-318; ADR-QD-090 amended to Rev 1.2 (no new ADR); INV-QD-090 extended. Measured by an interleaved in-process A/B plus an A/A control (the machine's load average was in the dozens to hundreds, so `pnpm bench` was unusable): evaluate rows inside the control, `toPredicate` 34–47% faster, `simplify`/`explain`/`render` ≈5–23% slower. Mutation (scoped, Survived+NoCoverage before → after): `Simplify` 19→1, `Explanation` 39→2, `Predicate` 11→1, devtools `Remedies` 22→0. Test-first note: `foldTreeBy` and the three case folds were written before their tests in one sitting rather than observed red first. | implementer |
