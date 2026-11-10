---
id: ARCH-13
title: One child-loop driver for allOf, anyOf and rules; their folds become pure
strength: Speculative   # from the 2026-10-05 architecture review (candidate 10)
status: dropped  # D-13-a decided DROP by measurement (2026-10-05); T0, T1, T4 landed; T5–T13 dropped
evidence_verified_at: e0ee958
depends_on: [ARCH-12]   # soft: only under D-13-g(a) — the folds call the field-lattice merge ARCH-12 relocates
blocks: []
adrs_touched:
  - ADR-QD-073 (amend — the UNTRACED_BUDGET entries move from three dispatchers to one driver; on the DROP outcome, an addendum records the measured rejection)
  - ADR-QD-026 (amend, names only — "all three dispatchers' concurrent branches" becomes "the one driver's concurrent branch")
  - ADR-QD-013 (read — sequential short-circuit is the default; the driver's sequential path must stop at the first settled step)
  - ADR-QD-023 (read — combining algorithms; the deciding rule is chosen by index)
  - ADR-QD-034 (read — SWITCH_BUDGET; `mergeFields`'s switch moves only under D-13-g(b))
  - ADR-QD-051 (read — a span says what was asked; the driver must not add a span)
  - ADR-QD-077 (read — PortAccess.ts/ShortCircuit.ts, the stop rules both interpreters read)
  - ADR-QD-090 (read — TreeFold.ts and the suspended wrapper children; the driver must keep composites lazy)
  - ADR-QD-025, ADR-QD-076 (read — Stryker gate; `ignoreStatic` skips module-scope fold tables but not the arrow bodies inside them)
  - ADR-QD-037 (read — madge circular-import gate)
packages: [core]
estimate: L   # T0–T3 (fix + gate) ≈ 1 day; GO path T5–T13 ≈ 3–4 days; S if T3 decides DROP
---

# ARCH-13 — One child-loop driver for allOf, anyOf and rules; their folds become pure

## 1. Verified evidence (at `e0ee958`)

Everything below was re-read on branch `arch/integration` at `e0ee958`
(worktree `W=.claude/worktrees/agent-adb672833eb753a12`), which is `main`
(`c75220e`) plus ARCH-01…07. The review cited `main` at "l.1153–1478"; ARCH-01
moved the port reads out of `Evaluate.ts` and ARCH-02 added the depth pre-check
and suspended wrapper children, so every line number moved. Throwaway probes live
in the session scratchpad under `arch13/` (two edited copies of
`packages/core/src`, a `tsconfig.json`, and an interleaved timing harness
`harness.mts`); nothing in the repository was edited.

**Tooling caveat (settled first).** The root binary
`/Users/…/qadi/node_modules/.bin/vitest` fails every core test file in the
worktree with `TypeError: Cannot read properties of undefined (reading 'config')`
— two vitest instances (`.pnpm/vitest@5.0.0_@types+node@25.9.5…` vs the one
`@effect/vitest` peers on). The worktree's own binary works:
`cd $W && node_modules/.bin/vitest run <files>`. Every command below uses that
form. (Same failure class as ARCH-07 §1 C9.)

### C1. Three near-identical copies of the child loop — **CONFIRMED (lines CHANGED)**

`packages/core/src/Evaluate.ts` at `e0ee958`:

| Function | Lines | Loop skeleton |
| -------- | ----- | ------------- |
| `evaluateAllOf` | `:900-947` (doc `:863-899`) | `if (request.concurrency === undefined)` `:910`; sequential `for … yield* evaluateNode(…, depth + 1, maxDepth)` `:911-917`; else `Effect.forEach(…, (child) => Effect.exit(evaluateNode(…)), { concurrency })` `:932-936`; `for (const exit of exits)` → `Effect.failCause(exit.cause)` `:937-943`; `return finishAllOf(…)` `:946` |
| `evaluateAnyOf` | `:1032-1073` (doc `:1019-1031`) | identical shape: `:1042`, `:1043-1050`, `:1058-1062`, `:1063-1069`, `:1072` |
| `evaluateRules` | `:1090-1214` (doc `:1075-1089`) | identical shape: `:1141`, `:1142-1153`, `:1169-1178` (maps each trace to `{ index, rule, trace }`), `:1179-1185` |

The three are the only `Effect.fnUntraced` sites in the repository
(`grep -rn "Effect.fnUntraced(" packages/*/src` → `Evaluate.ts:900,1032,1090`).
Each carries its own 10–15-line copy of the same ADR-QD-026 comment explaining
why the concurrent branch exits every child (`:919-931`, `:1051-1057`,
`:1155-1168`).

### C2. Only the fold differs, and `rules` writes its fold inline — **CONFIRMED**

- `AllOf`: `interface AllOfFold` `:822`, `beginAllOf` `:828`, `stepAllOf` `:839`,
  `finishAllOf` `:851` — module-level, Effect-free, but not exported and only
  reachable through `evaluate`.
- `AnyOf`: `interface AnyOfFold` `:960`, `beginAnyOf` `:969` (reads
  `anyOfStopsAtAllow` `:972`), `stepAnyOf` `:984`, `finishAnyOf` `:1003`.
- `Rules`: **no** begin/step/finish. Inside the generator: `decisiveEffect`
  `:1102`, a local `interface Applied` `:1104-1108`, two `let` accumulators
  `:1109-1110`, a `step` closure `:1127-1139`, and the verdict built after the
  loop `:1189-1213` (including a raw object literal for the allow arm `:1204-1213`).
  So the "same fold, two schedules" guarantee for `Rules` (INV-QD-020) is a closure
  shared by two loops inside one generator, not a value anyone can test.

### C3. What ARCH-01's `ShortCircuit.ts` already shares — **CHANGED (narrower than a driver)**

`packages/core/src/ShortCircuit.ts` (62 lines) holds two total lookup tables:
`anyOfStopsAtAllow` (`:42-43`, `First` → true) and `rulesDecisiveEffect`
(`:61-62`). It is read by the evaluator (`Evaluate.ts:972`, `:1102`) and by
translation (`Predicate.ts:559`, `:721`). It shares **which result settles a
composite**, not **how a composite walks its children**. Exactly what is still
duplicated at `e0ee958`:

1. The schedule (sequential-with-stop vs. concurrent-exit-all-then-fold-by-index)
   and the first-failure re-raise — three copies in `Evaluate.ts` (C1).
2. The "step until settled, else finish" loop — three more, sequential-only, in
   translation's `run` (`Predicate.ts:697-707` `Conjunction`, `:708-717`
   `Disjunction`, `:718-735` `RuleTable`), each an `Effect.gen` with its own
   inline accumulator.
3. The `Rules` fold body (C2) — its "deciding rule" selection is still interleaved
   with the loop.

`allOf` has no stop-rule function at all (`ShortCircuit.ts:14-15`: "stops at its
first denial under every strategy and needs no function to say so").

### C4. ARCH-02's changes do not touch the combinators — **CONFIRMED**

- Suspended wrapper children: `Not`/`Obliged`/`Labeled` arms wrap their child in
  `Effect.suspend` (`Evaluate.ts:760-807`). The combinators are generators, hence
  already lazy, and were left alone.
- Depth pre-check: `if (policyDepth(policy) > maxDepth) return Effect.fail(…)`
  in `evaluate`'s `compute` (`:1299`); `evaluateNode` keeps its per-node
  guard (`:641`). The combinators only thread `depth + 1`.
- Stack safety through combinators is pinned by
  `Evaluate.test.ts:4130` ("a 100k-deep `${name}` chain evaluates with maxDepth:
  Infinity"), which includes `allOf([p])` and `rules([permitWhen(p)])` chains. A
  driver must keep each composite a lazily-built `Effect.gen` (the spike in C11
  does; `fnUntracedEager` would not — C12).

### C5. Translation has the same loop — **CONFIRMED in shape, different in three details**

`Predicate.ts:677-737` (`run`, a plain function, "once per translation, not per
row" `:674-675`). Same step-until-settled shape as C1's sequential branch, but:
(a) sequential only — `PredicateOptions` has no `concurrency`; (b) the child
result is a `Predicate`, the error `RunError`, the services
`AttributeResolver | DecisionHistory`; (c) "settled" means *a constant that decides
it* (`result._tag === "False"` for `and`; `"True"` when `stopsAtTrue`; a `True`
condition with the decisive effect for a rule table), not a verdict. A driver
generic over child type, result type, error and requirements fits all six loops
(C11 type-checks such a driver); whether translation should use it is D-13-d.

### C6. The ADR/budget conflict — **CONFIRMED**

- `scripts/check-house-style.mjs:362-366` `UNTRACED_BUDGET = { "packages/core/src/Evaluate.ts": 3 }`;
  `:377-379` `UNTRACED_BUDGET_NAMES` names `evaluateAllOf`, `evaluateAnyOf`,
  `evaluateRules`; enforced both directions (`:664-668`, `:812-839`).
- `AGENTS.md:243-298` (§5 table + "Converting anything not in the table above
  needs a benchmark first" `:294`) and `:368-392` (§5a "sibling question"
  paragraph naming the three again).
- `spec/decisions/073-the-fnuntraced-exception-is-measured.md` (Rev 1.2): the
  decision is "exactly three functions"; its table records −18% to −74% from
  removing the named span on these three; "absolute throughput on a development
  machine moves by roughly 30% between runs, so only the direction and order of
  magnitude are load-bearing". It rejects a stored-baseline bench gate.
- `SWITCH_BUDGET` (`check-house-style.mjs:278-284`, names `:297-300`):
  `Evaluate.ts: 2` = `evaluateNode` + `mergeFields`. The folds call
  `mergeFields` (`:857`, `:1010`), so wherever the folds go, `mergeFields` must be
  importable there — which is ARCH-12's territory (D-13-g).

### C7. **NEW DEFECT (tooling): `pnpm bench` exits non-zero, at `e0ee958` and on `main`**

`cd $W && node_modules/.bin/vitest bench --run packages/core/bench/Evaluate.bench.ts`
→ `Tests 2 failed | 5 passed`: `SyntaxError: bench.compare() requires at least 2
benchmarks, received 1 instead. Consider calling bench().run()`. A scan of every
bench file finds six such single-benchmark `bench.compare(…)` calls:
`Evaluate.bench.ts:251` (filter), `:260` (decideSubjects),
`DecisionCache.bench.ts:71`, `:86`, `:120`, `:136`. The same code is on `main`
(`git show c75220e:packages/core/bench/Evaluate.bench.ts`, `:233`, `:242`), so it
is not an ARCH-01…07 regression; it arrived with `vitest@5.0.0`'s bench API
(`pnpm-workspace.yaml` pins `vitest: 5.0.0`). `pnpm bench` is not a merge gate
(DoD note, `spec/process/definitions-of-done.md:247`), which is why nothing
noticed. This plan's first gate *is* a benchmark, so T1 fixes it.

### C8. The bench does not measure two of the three folds — **CONFIRMED**

`Evaluate.bench.ts` workloads: `one node`, `wide` (allOf 8), `deep` (alternating
allOf/anyOf/not), `wrapper-heavy`, `matcher-heavy`, `field-heavy`,
`obligation-heavy`, `resolver miss`, scaling sweeps, and `wide, concurrency`.
There is **no `rules` workload at all**, `anyOf` appears only inside `deep`
(always `First`, two children), and only `allOf` is measured under concurrency.
A driver that slowed `evaluateRules` would be invisible. T1 adds them.

Also observed: vitest 5's bench prints *"Benchmark "evaluate" accessed module
export getters too many times … Tracked exports: FieldPath.compareShapes,
Obligation.unionObligations, Permission.permissionKey, Decision.intersectFields,
FieldPath.shapeOf, TreeFold.foldTree"*. Under vitest's module runner every
cross-module call goes through a getter that a built `lib/` consumer never pays.
Moving the folds and the driver into their own modules adds such calls, so a
vitest-only measurement would penalize the change for a harness artefact. T2/T3
therefore measure twice: vitest bench (the repo's tool, what ADR-QD-073 used) and
an in-process Node harness (live ESM bindings, no getters).

### C9. The duplication has already cost one partial fix — **CONFIRMED from the record**

ADR-QD-026 `:119-126`: CCR-QD-152 made the concurrent branches exit every child,
and "`Rules` was the last of the three to gain it (CCR-QD-152's follow-up): its
concurrent path had the same `Effect.forEach` fail-fast dispatch as the other two,
and so the same gap". One schedule fix needed three edits and the first pass missed
one. This is the concrete cost a single driver removes.

### C10. **NEW SPEC DEFECT: BEH-QD-134 contradicts INV-QD-020 since CCR-QD-152**

`spec/behaviors/17-concurrency.md` is still Rev 1.0 (2026-07-26). BEH-QD-134
(`:120-133`) says: "A resolver failure in any concurrently evaluated branch MUST
fail the evaluation, **even when a sibling branch denied**" and "the same tree can
fail under concurrency and deny without it. Both are correct". Since CCR-QD-152
(2026-09-19), INV-QD-020 (`spec/invariants.md:615-619`) says the error that
surfaces is identical with or without `concurrency`, and the code and tests agree
with INV-QD-020: `Evaluate.test.ts:3582` ("a failure past the decisive index is
discarded, matching sequential (CCR-QD-152)") asserts `allOf([hasRole("legal"),
hasAttribute("boom", …)])` *denies* under `concurrency: "unbounded"` although
`boom` fails. Read literally, BEH-QD-134's REQUIREMENT demands the opposite. CCR-QD-152
updated `invariants.md` and ADR-QD-026 but not the behavior doc. T0 fixes the doc
(no code change).

### C11. Spike: the driver is expressible, type-clean and behavior-preserving — **CONFIRMED**; its cost — **UNVERIFIED**

Two edited copies of `packages/core/src` in `scratchpad/arch13/`:

- **S1 `driver/`** — evaluator-specific: `walkChildren = Effect.fnUntraced(function* <C, S>(children, fold, state, subject, request, matcherContext, depth, maxDepth) {…})`,
  folds as module-level `{ conditionOf, step, finish }` objects, `rules`' fold
  extracted to `step`/`finish`, the three `evaluate*` functions reduced to plain
  functions that call it. No per-node closure.
- **S2 `generic/`** — interpreter-generic:
  `walkChildren = Effect.fnUntraced(function* <C, S, A, Out, E, R>(children, runChild: (child: C) => Effect<A, E, R>, fold: ChildFold<C, S, A, Out>, state: S, concurrency: Concurrency | undefined) {…})`.
  One `runChild` closure per composite node; `E`/`R` inferred.

Results:
- `tsc -p scratchpad/arch13/tsconfig.json` (extends the worktree's
  `tsconfig.base.json`) over both copies: **0 errors**. A generic
  `Effect.fnUntraced(function* <…>(…))` type-checks without `as`, and the plain
  wrappers' declared return type `Effect.Effect<Trace, EvaluationError, WalkServices>`
  is satisfied.
- `Evaluate.test.ts` + `Rules.test.ts`, copied **unchanged**, run against each
  copy (vitest instance resolved from `@effect/vitest`'s peer): **239/239 pass for
  S1, 239/239 for S2** — including the CCR-QD-152 fault-injection property, the
  150-tree agreement property, the observability suite (`:2388`, no
  `qadi.allOf/anyOf/rules` span) and the 100k-deep `allOf`/`rules` chains (C4).
- Timing (in-process harness, interleaved A / A′ (identical copy) / S1 / S2,
  median of rounds; ratio > 1 = faster than A): **inconclusive**. The machine was
  shared with other planning agents (`uptime` load average 13–28 on 12 cores).
  Run 1 (lighter load) put S1 at 0.96–1.01 of A′ on every workload while A′ itself
  sat at 0.91–0.96 of A (a load-order bias); runs 2–4 under load 16–31 showed an
  A/A′ spread of 0.58–1.48 (run 4, 9 rounds, alone: 0.72–1.12), i.e. noise ten
  times larger than any effect being looked for. Neither variant was consistently
  slower than A′ across runs, which is all these numbers can say. The one `pnpm bench` run (`evaluate` group, verbose reporter) gave
  `one node` 137.8k hz, `wide` 104.5k, `wrapper-heavy` 100.5k, `deep` 82.0k,
  `matcher-heavy` 81.3k, `resolver miss` 75.3k, `obligation-heavy` 68.8k,
  `field-heavy` 48.6k — recorded as orientation only, not as the T2 baseline.
  **The review's precondition ("only worth reopening if a bench shows the driver
  costs nothing") is therefore unsettled, and T2/T3 exist to settle it.**

### C12. Effect API facts the decisions rest on — **CONFIRMED** (`effect@4.0.0`, `node_modules/effect/src/internal/effect.ts`)

- `fnUntraced` (`:1261-1277`) returns `suspend(() => fromIteratorUnsafe(body.apply(this, arguments)))`;
  `gen` (`:1235-1259`) returns `suspend(() => fromIteratorUnsafe(body()))`. A plain
  function returning `Effect.gen` therefore costs the same as `fnUntraced` but is
  invisible to `UNTRACED_BUDGET` (D-13-b).
- `fnUntracedEager` (`:1367-1400`) runs the generator synchronously at call time
  (`fromIteratorEagerUnsafe`), which would build children eagerly and reintroduce
  the native recursion ARCH-02 removed (D-13-b rejects it).

### C13. `Rules.test.ts` holds no concurrency tests — **REFUTED (brief)**

`grep -n "concurren" packages/core/test/Rules.test.ts` → nothing. Every
concurrency test for all three combinators is in `Evaluate.test.ts`'s
`describe("concurrent evaluation")` (`:3352-3896`, 13 tests). `Rules.test.ts` does
hold fold-semantics tests (deciding row, contributions, trace) that the pure
`rulesFold` tests replace (T9, D-13-h).

### C14. Baseline test run

`cd $W && node_modules/.bin/vitest run packages/core/test/{Evaluate,Rules,ShortCircuit,Predicate}.test.ts`
→ 4 files, **348 passed** (Evaluate 212, Rules 27, ShortCircuit 3, Predicate 106).

## 2. Goal and success criteria

**Goal.** Today the *schedule* of a composite — walk children in order and stop at
the first settled step, or run them all and fold the exits by declaration index,
re-raising the first failure — is written three times in `Evaluate.ts` and three
more times (sequentially) in `Predicate.ts`, while the *meaning* of each composite
(its fold) is only partly separable and, for `rules`, not separable at all. This
plan deepens that into two modules with small interfaces: a **driver**
(`ChildWalk.ts`, one function, the only `Effect.fnUntraced` site) that owns
ordering, stopping, concurrency and failure precedence for every composite of every
interpreter; and **folds** (`CombinatorFold.ts`, Effect-free values with
`step`/`finish`) that own what a child result means. Locality: the next schedule
fix (another CCR-QD-152) is one edit, not three-and-a-follow-up. Leverage: the
driver serves six loops across two interpreters. Testability: the folds become a
test surface of their own — property tests over generated child-result sequences
with no `Effect` run — and the driver is tested once against a toy fold.

**This is Speculative and sits on the hottest path, so the plan is a gate first.**
Nothing beyond T0/T1 lands unless T2/T3 show the driver costs nothing measurable
(D-13-a). A measured rejection is a first-class outcome (T4): it is written into
ADR-QD-073 so the next review does not propose it again.

**Success criteria:**

1. `pnpm bench` exits 0, and `Evaluate.bench.ts` has `rules` (all three algorithms),
   `anyOf` (`First` and `Union`) and per-combinator concurrency workloads:
   `grep -cE 'bench\("rules|bench\("anyOf' packages/core/bench/Evaluate.bench.ts` ≥ 5 (T1).
2. BEH-QD-134 no longer says a failure surfaces "even when a sibling branch denied":
   `grep -n "even when a sibling branch denied" spec/behaviors/17-concurrency.md` prints nothing (T0).
3. D-13-a is `decided` with a GO/PARTIAL/DROP outcome and the T2/T3 numbers in §10.
   On DROP: `grep -n "child-walk driver" spec/decisions/073-the-fnuntraced-exception-is-measured.md`
   finds the addendum, and the remaining criteria do not apply.
4. (GO) Exactly one `Effect.fnUntraced` call site in the repository, in
   `ChildWalk.ts`: `grep -rn "Effect.fnUntraced(" packages/*/src` prints one line;
   `node scripts/check-house-style.mjs` passes with
   `UNTRACED_BUDGET = { "packages/core/src/ChildWalk.ts": 1 }`.
5. (GO) No schedule code left in the interpreters:
   `grep -nE "Effect\.forEach|Effect\.failCause|Effect\.exit\(" packages/core/src/Evaluate.ts` prints nothing,
   and (D-13-d ≥ b) `grep -n "Effect.gen" packages/core/src/Predicate.ts` prints nothing.
6. (GO/PARTIAL) The folds import no Effect runtime:
   `grep -nE 'from "effect/(Effect|Exit|Fiber)"' packages/core/src/CombinatorFold.ts` prints nothing.
7. `CombinatorFold.test.ts` (property tests for `allOf`, `anyOf` × 3 strategies,
   `rules` × 3 algorithms) and `ChildWalk.test.ts` (driver) pass; the tests listed
   in D-13-h are gone; every BEH/INV id they carried is still listed against a
   surviving test file in `spec/traceability.md` §4.
8. Unchanged and green: `Evaluate.test.ts`'s two `PROPERTY` tests in
   "concurrent evaluation", "concurrency performs MORE lookups" (BEH-QD-132),
   the depth-limit combinator matrix (`:768-816`), the observability suite
   (`:2388`), the 100k-chain tests (`:4130`), `Rules.test.ts`'s INV-QD-017 block,
   and `Predicate.test.ts`'s four `PROPERTY` tests (`:943`, `:1150`, `:1186`, `:1228`).
9. The post-implementation bench (T8 step 9) meets D-13-a's thresholds against the
   T2 baseline, numbers recorded in ADR-QD-NEXT.
10. Stryker: no surviving mutant in `ChildWalk.ts`/`CombinatorFold.ts` (or each
    one recorded as equivalent in the CCR), no new survivor in `Evaluate.ts`/
    `Predicate.ts` against a same-day baseline, full core run ≥ 80.
11. `pnpm check` green end to end, including gate 13 (`node scripts/check-api-surface.mjs`)
    with every new internal export in `spec/overview.md`'s "Not listed above".

## 3. Non-goals

- **Changing any decision, trace, error or port-call sequence.** This is a pure
  restructuring; every existing interface-level test must pass unchanged before the
  D-13-h deletions (T8 runs the full suites before T9 deletes anything).
- **Adding concurrency to `toPredicate`.** Translation runs once per query; the
  driver's concurrent branch is simply never taken there (`concurrency: undefined`).
- **Moving `mergeFields` into a field-lattice module** — that is ARCH-12. This
  plan only decides the order (D-13-g).
- **Re-tracing the composites.** ADR-QD-073 stands: no `qadi.allOf`/`qadi.anyOf`/
  `qadi.rules`/`qadi.walk` span. Making composites observable again is an
  ADR-QD-051 question for a separate change.
- **A stored benchmark baseline or a bench merge gate.** Rejected by ADR-QD-034 and
  ADR-QD-073 ("a timing threshold on a shared CI runner fails for reasons that have
  nothing to do with the change"). The gate here is a reviewer's measurement,
  recorded in the ADR.
- **`Not`/`Obliged`/`Labeled`.** Single-child wrappers have no loop; they stay
  `evaluateNode` arms (ARCH-02's suspension untouched).
- **`SubjectSet.ts`/`filter` fan-out.** Their per-item fan-out is a different loop
  (no fold, no stop rule) and is out of scope.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 | `ChildWalk.ts` imports `* as Effect from "effect/Effect"`, `* as Exit from "effect/Exit"`, `import type { Concurrency } from "effect/Types"`; `.ts` relative specifiers; `import type` for `Trace`, `Policy`, `Rule`, … |
| AGENTS.md §5, ADR-QD-073, `UNTRACED_BUDGET` | The driver is the one `Effect.fnUntraced` site (D-13-b). `UNTRACED_BUDGET`/`UNTRACED_BUDGET_NAMES`, AGENTS §5's table and prose (`:243-298`), §5a's paragraph (`:368-392`) and ADR-QD-073 change **in the same commit** as the code (T8), or `pnpm lint` fails in one direction or the other. `:294` "needs a benchmark first" is satisfied by T2/T3, which run before any budget edit. The thin evaluator adapter and the folds are plain functions — never `Effect.fn` (a span per node is what #102 removed) and never `fnUntraced` (the budget would grow). |
| AGENTS.md §5a, ADR-QD-034, `SWITCH_BUDGET` | No new `switch`. The `evaluateNode` switch stays (its three combinator arms change call target only). `mergeFields`' switch moves only under D-13-g(b), with `SWITCH_BUDGET`/`SWITCH_BUDGET_NAMES`/§5a's table edited together. Dispatch on `RuleEffect` inside `rulesFold` stays an `===` on a literal, as today. |
| AGENTS.md §6 | No `as`/`!`/`any`. The concurrent branch pairs each exit with its child via `Effect.map(runChild(child), (result) => ({ child, index, result }))` inside the `forEach` (the shape `evaluateRules` already uses at `:1173-1176`), never `exits[index]` — under `noUncheckedIndexedAccess` that needs an unreachable `undefined` guard, which is both a coverage hole (core is held at 95% branches) and an unkillable Stryker survivor. `as const` only where today's code has it. |
| User preference: no `Record<string, unknown>` widening; closed unions | Fold states are monomorphic per composite (`AllOfState`, `AnyOfState`, `RulesState`), not one widened record. `ChildFold<C, S, A, Out>` is generic, not `unknown`-typed. |
| AGENTS.md §9 (barrels) | `ChildWalk.ts`, `CombinatorFold.ts` (and `PredicateFold.ts` under D-13-d(c)) stay **out** of `packages/core/src/index.ts`, like `ShortCircuit.ts`/`PortAccess.ts`/`TreeFold.ts`. Their exports are still reachable via the `./*` subpath, so gate 13 needs "Not listed above" rows (T12). Exporting the folds from `Evaluate.ts` instead is ruled out: `Evaluate.ts` is barrelled (`index.ts:17`), and `allow`/`deny`/`and`/`or` are exactly the generic names §9 warns against. |
| AGENTS.md §10 (coverage: core 95%) | Pure fold tests make every fold branch directly reachable; the driver's two branches are covered by `ChildWalk.test.ts`. |
| AGENTS.md §11, §12, §15 | BEH-QD-131/134, INV-QD-017/020/058 Source and Enforcement, traceability §1/§4, overview rows, CCR, ADRs change with the code (T0, T12). No new `typescript` fence is required; any added must compile (gate 9). |
| ADR-QD-013, INV-QD-005 | Sequential path: child *i+1* is not constructed before `step(i)` returns `undefined`. Driver test (T7) records `runChild` invocations and asserts none after a settle. |
| ADR-QD-023, INV-QD-017, BEH-QD-133 | The deciding rule is chosen by index in `rulesFold`, independent of schedule; the fold's `step` returns a verdict exactly at the first applying rule (FirstApplicable) / first applying decisive rule (overrides). Property-tested against a declarative oracle (T6); `Rules.test.ts`'s six port-count tests stay as the interface proof. |
| ADR-QD-026, INV-QD-020, BEH-QD-130–134 | Concurrent path: every child exits; exits are stepped in declaration order; first `Exit.Failure` by index re-raises its `Cause` verbatim (`Effect.failCause`); anything after the settled index is never inspected. Kept as BEH-QD-131's "one fold, driven two ways", tightened to "one driver for every composite". |
| ADR-QD-077 (`ShortCircuit.ts`) | The folds keep reading the stop rules from `ShortCircuit.ts`; the driver knows nothing about strategies or algorithms. |
| ADR-QD-090, INV-QD-090 | The driver is a lazily-built `Effect.gen` body (via `fnUntraced`), so composites stay trampolined; the 100k-chain tests must stay green. No eager variant (C12). |
| ADR-QD-037 (madge, gate 5) | `ChildWalk.ts` imports only `effect/*` and types. `CombinatorFold.ts` imports `Decision.ts` (types), `Obligation.ts` (`unionObligations`), `Policy.ts` (types), `ShortCircuit.ts`, and the lattice merge (ARCH-12's module, or itself under D-13-g(b)). Neither imports `Evaluate.ts`/`Predicate.ts`. `Decision.ts` imports `Obligation.ts`/`Policy.ts`/`FieldPath.ts` only — no cycle. |
| ADR-QD-025, ADR-QD-076 (`ignoreStatic`) | Fold objects are module-level constants, so the object literal is a static mutant (skipped), but the arrow bodies run per test and **are** mutated — they must be killed by T6. Do not put decision logic in module-scope initializers. |
| ADR-QD-051 | No span added. The observability suite (`Evaluate.test.ts:2388-2700`) gains one assertion: no span whose name starts with `qadi.` other than those it already expects. |
| Bench methodology (C8, ADR-QD-073 "ranges, not figures") | Two methods, interleaved, same machine, same session, load average < 2 (D-13-a). Absolute numbers are never compared across sessions. |

**Overlap with other plans.**

| Plan | Shared file / symbol | Interplay |
| ---- | -------------------- | --------- |
| ARCH-12 (field lattice, planned in parallel) | `mergeFields` (`Evaluate.ts:430-484`, `SWITCH_BUDGET`), `intersectFields`/`unionFields` (`Decision.ts:299`, `:351`) | The folds call the merge. **Recommended order: ARCH-12 first** (D-13-g(a)); `CombinatorFold.ts` then imports ARCH-12's merge and this plan never touches `SWITCH_BUDGET`. If ARCH-13 lands first, D-13-g(b) applies. ARCH-12's own property tests (lattice laws) are the oracle T6 leans on for field sets, so T6 asserts "equals the lattice merge of the allowing children's sets", not the lattice laws again. |
| ARCH-01 (implemented) | `ShortCircuit.ts`, `Predicate.ts` `compile`/`run`, INV-QD-058 | T10 changes `run`'s loops only; `compile` and `PortAccess.ts` untouched. INV-QD-058's properties are the regression net. |
| ARCH-02 (implemented) | `evaluateNode` arms, `TreeFold.ts`, depth | No conflict; the driver keeps composites lazy (C4). |

## 5. Decisions needed before work starts

### D-13-a — The benchmark gate: method, thresholds, and the outcome ladder

Every option below runs T2 (baseline) and T3 (spike) first; the question is what
counts as "costs nothing".

| Option | Rule | For | Against |
| ------ | ---- | --- | ------- |
| **A. Two-method, noise-calibrated, ladder** | See below. | Measures the harness artefact separately (C8); calibrates noise per workload instead of guessing; a fallback (PARTIAL) keeps the testability win if only the driver costs. | Most work: two harnesses, a ladder of variants. |
| B. vitest bench only, "within run-to-run noise" (ARCH-02 T13's rule) | Accept if every workload's interleaved median is inside the baseline's own run spread. | Same rule ARCH-02 used; one tool. | ARCH-02 measured spreads up to ±15%; a 10% regression on `deep` would pass. Penalizes module extraction for vitest's getter overhead. |
| C. Require a measurable win | Adopt only if some composite workload gets faster. | Strongest bar. | The driver is not meant to be faster; this rejects a neutral change on a technicality. |

**Option A in full.**
- *Conditions:* one machine, one session, AC power, `uptime` 1-min load average
  < 2.0 before each run (record it); no other agents or builds running.
- *Noise band per workload `N_w`:* in-process harness with an identical second copy
  (A′) of the baseline, 9 rounds × 250 ms, rotating variant order each round;
  `N_w = max(|median(A′)/median(A) − 1|, 0.02)`.
- *PASS for a variant V:* for every workload in `Evaluate.bench.ts`'s `evaluate`,
  depth-scaling, width-scaling and concurrency groups (including T1's new ones):
  (1) harness `median(V)/median(A) ≥ 1 − N_w`; and (2) vitest bench, 4 interleaved
  full runs per side (A,V,A,V,…): `median(V)/median(A) ≥ 1 − S_w` where `S_w` is the
  max/min spread of A's own runs; and (3) on composite workloads, V is not slower
  in ≥ 3 of 4 interleaved pairs by more than 2% (catches a consistent small loss
  hiding inside noise).
- *HARD FAIL:* any workload ≥ 5% slower by both methods; or the depth-scaling slope
  (`depth 40` ÷ `depth 5` time) worse by > 5%.
- *If (2) fails but (1) passes and vitest's getter warning lists the new modules:*
  re-run (2) with the folds and driver inlined into `Evaluate.ts` (a measurement-only
  variant). If that passes, the loss is the harness artefact and the variant PASSes;
  record both numbers.
- *Ladder:* S2 (generic driver, enables D-13-d) → else S1 (evaluator-specific
  driver; D-13-d forced to (a)) → else S0 = **PARTIAL** (folds extracted to
  `CombinatorFold.ts`, three `fnUntraced` loops kept, each calling the folds) →
  else **DROP**.
- *Inconclusive* (any `N_w` > 10%): repeat on another day or a quieter machine; a
  second inconclusive result is a DROP — the burden of proof is on the change.

**Recommendation: A.** `status: decided (2026-10-05, A — recommended default; outcome **DROP** — by measurement: harness N_w > 10% on 16/26 workloads in both sessions (load 165–198, then 17–181) after the planning spike's inconclusive run, so inconclusive twice → DROP; per-run min latency: S0/S1/S2 up to 15% slower on sequential composites (S2i inlined ≈ A, the getter artefact) and 14–26% slower on concurrent allOf/anyOf in every variant incl. S2i. See §10 and the ADR-QD-073 addendum)`

### D-13-b — What the driver is wrapped in

- **(i) `Effect.fnUntraced`** — the single budget entry `{ "packages/core/src/ChildWalk.ts": 1 }`, names `["walkChildren"]`.
- (ii) A plain function returning `Effect.gen` — identical runtime (C12), budget
  drops to zero, and the measured exception becomes invisible to the gate that
  exists to keep it visible. Rejected.
- (iii) `Effect.fnUntracedEager` — builds children eagerly (C12), reintroducing
  native recursion (ARCH-02 C3e). Rejected.
- (iv) `Effect.fn("qadi.walk")` — reintroduces the ≈2.7–2.9 µs per composite node
  ADR-QD-073 removed. Rejected.

**Recommendation: (i).** `status: decided (2026-10-05, (i) — recommended default — moot: D-13-a decided DROP, so nothing that depends on it was built)`

### D-13-c — Driver interface: evaluator-specific or interpreter-generic

- **(i) Generic** (spike S2): `walkChildren<C, S, A, Out, E, R>(children, runChild, fold, state, concurrency)`.
  One closure per composite node (the evaluator's `runChild` captures
  `subject/request/matcherContext/depth/maxDepth`). Serves translation (D-13-d).
- (ii) Evaluator-specific (spike S1): takes `evaluateNode`'s context parameters, no
  closure. Cannot serve translation.

**Recommendation: (i)** if T3 passes it; (ii) is the ladder's second rung, not a
separate choice. The interface either way (what a caller must know):

```ts
export interface ChildFold<C, S, A, Out> {
  /** The settled result once no later child can change it; `undefined` while open. */
  readonly step: (state: S, child: C, index: number, result: A) => Out | undefined;
  /** The result when every child was stepped and none settled it. */
  readonly finish: (state: S) => Out;
}
// Ordering: sequential = run child i, step it, stop at the first settled step (later
// children never run); concurrent = run all, step exits by index, first Exit.Failure
// by index re-raises its Cause verbatim, nothing after the settled index is inspected.
// `state` is owned by one walk: callers pass a fresh one per call.
export const walkChildren: <C, S, A, Out, E, R>(
  children: ReadonlyArray<C>,
  runChild: (child: C) => Effect.Effect<A, E, R>,
  fold: ChildFold<C, S, A, Out>,
  state: S,
  concurrency: Concurrency | undefined,
) => Effect.Effect<Out, E, R>;
```

`status: decided (2026-10-05, (i) generic — recommended default; measured as S2 and failed the gate — moot: D-13-a decided DROP, so nothing that depends on it was built)`

### D-13-d — Does `toPredicate`'s `run` use the driver?

- (a) No — evaluator only. Translation keeps its three `Effect.gen` loops.
- (b) Yes, folds private to `Predicate.ts`, tested through `toPredicate`'s existing
  properties (INV-QD-058's walk-equality and agreement properties).
- **(c) Yes, and the translation folds become pure and tested too**: move `TRUE`,
  `FALSE`, `and`, `or`, `negate`, `formulaFor` and the three translation folds into
  an internal `PredicateFold.ts` (out of the barrel — these are the generic names
  §9 warns about), and add a property that makes `Predicate.ts:662-672`'s comment
  ("Pruning never changes a successful predicate … what Stryker cannot tell a
  reader") a test: for every generated sequence of child predicates, the
  early-settled result and the result of folding the *whole* sequence agree under
  `evaluatePredicate` (`Predicate.ts:208`) on every generated row.

(c) layers on (b) and (b) on the driver; each is its own task (T10, T11).
**Recommendation: (c)** — it turns an argued-in-prose safety claim into a
checked one, and the stop *mechanics* (not only the stop rule, which ARCH-01
shared) become one implementation across both interpreters. Requires D-13-c(i).
`status: decided (2026-10-05, (c) — recommended default — moot: D-13-a decided DROP, so nothing that depends on it was built)`

### D-13-e — Where the folds live, and what replaces the three named functions

- **(i) New internal `CombinatorFold.ts`** exporting `allOfFold`/`beginAllOf`,
  `anyOfFold`/`beginAnyOf`, `rulesFold`/`beginRules`, and the trace constructors
  `allow`/`deny` with `NO_OBLIGATIONS`/`NO_CHILDREN` (moved from `Evaluate.ts:287-321`;
  `Evaluate.ts`'s leaf arms import them back). `evaluateAllOf`/`evaluateAnyOf`/
  `evaluateRules` are deleted (deletion test: each would be one forwarding
  statement); `evaluateNode`'s three arms call one evaluator-side adapter,
  `walkComposite(children, conditionOf, fold, state, subject, request, matcherContext, depth, maxDepth)`,
  which builds `runChild` and passes `request.concurrency` — so the
  "concurrency is wired" fact lives in one place and one end-to-end "MORE lookups"
  test covers all three arms.
- (ii) Keep the folds unexported inside `Evaluate.ts`, testable only via `evaluate`
  — defeats the goal.
- (iii) Keep three named thin wrappers (`evaluateAllOf` …) around the driver — keeps
  prose references in `spec/models/*` valid, at the cost of three shallow functions
  and three places that must each remember to pass `request.concurrency`.

**Recommendation: (i)**; T12 updates the prose references (`spec/models/25-rubac.md:55,66`,
`00-adoption-matrix.md:174,185`, `26-xacml.md:244`, `PortAccess.ts:117`,
`EffectFn.bench.ts:38-48,94-97`) — history in CCR rows and ADR-QD-073's body stays
as written. `status: decided (2026-10-05, (i) — recommended default — moot: D-13-a decided DROP, so nothing that depends on it was built)`

### D-13-f — Fold state: mutable accumulator or persistent value

- **(i) Mutable accumulator, fresh per walk** (today's `AllOfFold` shape): `begin*`
  allocates, `step` pushes. "Pure" is observational: no Effect, no I/O, no shared
  state; the same `(begin(p), results)` always yields `deepStrictEqual` output —
  which T6 asserts directly.
- (ii) Persistent state returned from every `step` (`Chunk`/copy-on-write arrays):
  pure in the strict sense, but an allocation per child on the per-node path the
  gate is protecting, for no observable difference. Rejected unless T3 shows zero
  cost, which a per-child allocation will not.

**Recommendation: (i).** `status: decided (2026-10-05, (i) — recommended default; the measured variants used it — moot: D-13-a decided DROP, so nothing that depends on it was built)`

### D-13-g — Sequencing with ARCH-12 (field lattice)

- **(a) ARCH-12 first.** `mergeFields` and its budgeted switch have left
  `Evaluate.ts`; `CombinatorFold.ts` imports ARCH-12's merge. This plan touches no
  `SWITCH_BUDGET` entry.
- (b) ARCH-13 first. T5 moves `mergeFields` (and its `switch`, with the
  `default: never` → `[]` fail-closed arm intact) into `CombinatorFold.ts`;
  `SWITCH_BUDGET` becomes `Evaluate.ts: 1`, `CombinatorFold.ts: 1`, names and §5a's
  table updated in the same commit; ARCH-12 then moves it once more.
- (c) ARCH-13 first, exporting `mergeFields` from `Evaluate.ts` — leaks it through
  the barrel. Rejected.

**Recommendation: (a)**; fall back to (b) only if ARCH-12 is dropped or blocked.
T0–T4 do not depend on this. `status: decided (2026-10-05, (a) — recommended default; ARCH-12 had landed, so the variants imported `FieldLattice.ts`'s `mergeFields` and no SWITCH_BUDGET entry moved — moot: D-13-a decided DROP, so nothing that depends on it was built)`

### D-13-h — Which existing tests are deleted (replace, don't layer)

Rule: a test that asserts only how child traces combine (no port call, no failure,
no depth, no schedule) is replaced by a pure fold test; a test that asserts
schedule mechanics for one combinator is replaced by the one driver test; a test
that asserts port calls, failure precedence end to end, depth, or a spec-mandated
end-to-end check stays.

**Delete from `packages/core/test/Evaluate.test.ts` ("concurrent evaluation"):**

| Line | Test | Replaced by |
| ---- | ---- | ----------- |
| `:3440` | AnyOf: concurrency performs MORE lookups | `walkComposite` is the only place concurrency is wired (D-13-e(i)); `:3421` + PROPERTY 1's vacuity guard |
| `:3465` | Rules: concurrency performs MORE lookups | same |
| `:3487` | an allowing anyOf under First keeps the first branch's fields | `ChildWalk.test.ts` "steps by index, not completion order" + `anyOfFold` First property |
| `:3508` | the deciding rule is selected by index, not by arrival | same driver test + `rulesFold` deciding-row property |
| `:3536` | a nested tree agrees at every depth | PROPERTY 1 (`:3677`) |
| `:3554` | a failure before any decisive child still fails, matching sequential | `ChildWalk.test.ts` failure-precedence tests + PROPERTY 2 (`:3758`) |
| `:3582` | a failure past the decisive index is discarded (CCR-QD-152) | same |
| `:3617` | AnyOf: a failure before any decisive child still fails | same |
| `:3644` | AnyOf: a failure past the decisive allowing index is discarded | same |

**Keep:** `:3398` (BEH-QD-130 end to end), `:3421` (BEH-QD-132's required
"strictly more lookups" test), `:3677` PROPERTY 1 (INV-QD-020 enforcement, vacuity
guard), `:3758` PROPERTY 2 (CCR-QD-152 fault injection), `:768-816` depth matrix.

**Delete from `packages/core/test/Rules.test.ts`** (moved into `CombinatorFold.test.ts`
as named examples beside the properties): "rule tables" › explicit deny row (`:25`),
no rule applying (`:33`), empty table (`:40`), default-permit row (`:48`); all five
of "the deciding rule" (`:68`, `:75`, `:82`, `:93`, `:106`); both of "order is
meaning" (`:119`, `:132`); all three of "what the deciding rule contributes"
(`:244`, `:266`, `:294`); "the trace names the row that hit" › in both directions
(`:315`) and children in order (`:325`). **Keep:** "defaults to FirstApplicable"
(`:54`, a builder default), the six INV-QD-017 port-count tests (`:143-239`), the
labeled-condition test (`:338`), and "rules compose with the rest of the ADT"
(`:347-388`). Net: `Rules.test.ts` 27 → 11 (16 deleted), `Evaluate.test.ts` −9.

**Recommendation: delete as listed** (alternative: keep everything — layering, and
the reason ADR-QD-026's fix had to be applied three times is that the tests were
also written three times). `status: decided (2026-10-05, delete as listed — recommended default — moot: D-13-a decided DROP, so nothing that depends on it was built; no test was deleted)`

## 6. Tasks

Phases: **0** = defect fixes, shippable now (T0, T1). **G** = the gate (T2, T3,
and T4 on DROP). **B** = the evaluator (T5–T9). **C** = translation (T10, T11).
**D** = docs and gate (T12, T13). On PARTIAL: T5, T6, T9 (Rules.test.ts part
only), T12 (scoped), T13; T7, T8, T10, T11 are `[-] dropped`.

### T0 — Correct BEH-QD-134 to match INV-QD-020 (spec defect, C10)
- **Status:** [x] done (21f757f, CCR-QD-171)
- **Depends on:** —
- **Files:** `spec/behaviors/17-concurrency.md`, `spec/README.md` (CCR table), `packages/core/test/Evaluate.test.ts` (test names only)
- **Steps:**
  1. Replace BEH-QD-134's REQUIREMENT with: "A resolver failure in a concurrently
     evaluated branch MUST fail the evaluation exactly when a sequential evaluation
     would reach that branch: a failure at an index before the child that settles
     the composite fails it; a failure after that index MUST be discarded with the
     speculative trace (INV-QD-020)."
  2. Replace the paragraph "the same tree can fail under concurrency and deny
     without it. Both are correct" with the CCR-QD-152 rationale (cite ADR-QD-026
     `:94-118`), and keep "an error is not a decision" (INV-QD-006).
  3. Bump the document control to Rev 1.1, Change History "BEH-QD-134 restated to
     match INV-QD-020 after CCR-QD-152 (CCR-QD-NEXT)".
  4. Prefix the names of `Evaluate.test.ts:3554` and `:3582` with `BEH-QD-134:` so
     the id is greppable (they are deleted in T9 only after `ChildWalk.test.ts`
     carries the id).
  5. CCR row `CCR-QD-NEXT` in `spec/README.md`: "BEH-QD-134 contradicted INV-QD-020
     since CCR-QD-152; doc only".
- **Tests:** none new (the behavior already has tests); the renamed two still pass.
- **Verify:** `pnpm spec:verify:strict && pnpm spec:examples && cd $W && node_modules/.bin/vitest run packages/core/test/Evaluate.test.ts`
- **Done when:** success criterion 2 holds and the gates pass.

### T1 — Make `pnpm bench` run, and make it measure every fold (tooling defect, C7/C8)
- **Status:** [x] done (95fde17; deviated in form only: `bench(name, fn).run(options)` — vitest 5 takes run options on `.run`, not as `bench`'s third argument, which is per-function `fnOpts`)
- **Depends on:** —
- **Files:** `packages/core/bench/Evaluate.bench.ts`, `packages/core/bench/DecisionCache.bench.ts`
- **Steps:**
  1. For each single-benchmark `bench.compare(…)` (`Evaluate.bench.ts:251`, `:260`;
     `DecisionCache.bench.ts:71`, `:86`, `:120`, `:136`), use vitest 5's documented
     single form: `await bench("…", fn, options).run()` (the error message's own
     suggestion). Do not invent a dummy second benchmark.
  2. Add to the `evaluate` group, each built once at module scope like the existing
     workloads, with a doc line in the header list (`:9-31`):
     - `anyOf First — 8, last allows` (7 × `hasPermission(write)` then `hasPermission(read)`): the anyOf fold's longest First walk.
     - `anyOf Union — 8` (all allow, `fieldStrategy: "Union"`): the exhaustive anyOf path.
     - `rules FirstApplicable — 8, last applies`.
     - `rules DenyOverrides — 8 permits` (must ask all, INV-QD-017).
     - `rules PermitOverrides — 8 denies` (must ask all).
     - `deep rules — 10 nested` (`rules([permitWhen(inner)])` alternating with `allOf`).
  3. Extend `evaluate — wide, concurrency` into one group per combinator:
     `anyOf Union 8` and `rules DenyOverrides 8`, sequential vs `"unbounded"`.
  4. Leave `filter`/`decideSubjects` measurements as they are, apart from step 1.
- **Tests:** `pnpm typecheck` (bench files are type-checked, DoD note `:251`).
- **Verify:** `pnpm bench` exits 0; `grep -cE 'bench\("(rules|anyOf)' packages/core/bench/Evaluate.bench.ts` ≥ 5.
- **Done when:** criterion 1 holds. Shippable on its own; kept on every outcome.

### T2 — GATE 1: baseline, noise-calibrated, on a quiet machine
- **Status:** [x] done (deviated: run in the same sessions as T3 — A and A′ copies interleaved with the variants — because the machine never got near D-13-a's load < 2; numbers in §10)
- **Depends on:** T1, D-13-a
- **Files:** none in the repo. Results go to §10 and, later, ADR-QD-NEXT or the ADR-QD-073 addendum. The harness is a scratch file (not committed), modelled on `scratchpad/arch13/harness.mts`.
- **Steps:**
  1. Preconditions per D-13-a; record `uptime`, `node --version`, `git rev-parse HEAD`, CPU model.
  2. vitest: `pnpm --filter @qadi/core exec vitest bench --run bench/Evaluate.bench.ts --reporter=verbose` × 3, recording `hz` and `mean` for every row of every group. Compute `S_w` (max/min spread of the 3 runs) per workload.
  3. In-process: copy `packages/core/src` twice (A, A′) into a scratch dir with a `node_modules` symlink to `packages/core/node_modules`; run the harness (`NODE_OPTIONS="--conditions=bun" tsx harness.mts`, 9 rounds × 250 ms, rotating order) over the same workloads as step 2 (including T1's); compute `N_w`.
  4. If any `N_w` > 10%, stop and reschedule (D-13-a "inconclusive").
- **Tests:** —
- **Verify:** the §10 row contains both tables and the load averages.
- **Done when:** `N_w` and `S_w` are recorded for every workload.

### T3 — GATE 2: spike variants and the go/no-go decision
- **Status:** [x] done (deviated: variants built as copies of `packages/core/src` under an untracked `packages/core/bench/zz-arch13/`, never committed and deleted afterwards, not on a spike branch (the brief forbids branches); plus a measurement-only S2i (S2 inlined). Outcome DROP)
- **Depends on:** T2, D-13-a, D-13-b, D-13-c
- **Files:** throwaway branch `spike/arch-13-child-driver` (never merged) — `packages/core/src/Evaluate.ts`, `ChildWalk.ts`, `CombinatorFold.ts`
- **Steps:**
  1. Build three variants on the spike branch, as separate commits so each can be checked out:
     - **S0 (PARTIAL):** folds moved to `CombinatorFold.ts` (T5's shape); the three `fnUntraced` loops kept, calling the folds.
     - **S1:** evaluator-specific driver (C11's `driver/` copy, with the D-13-e(i) adapter).
     - **S2:** generic driver (C11's `generic/` copy, with `walkComposite` and the `{ child, index, result }` pairing from §4).
  2. For each variant: `node_modules/.bin/vitest run packages/core/test/Evaluate.test.ts packages/core/test/Rules.test.ts packages/core/test/Predicate.test.ts` — **all pass unchanged** (348 at `e0ee958`, plus T0's renames). A variant that needs a test edit is disqualified.
  3. Measure each variant against A with both methods (D-13-a), interleaved, in the same session as a fresh A′ calibration (re-run T2 step 3's A′ inside the session; do not reuse T2's numbers across sessions).
  4. Apply the ladder: S2 → S1 → S0 → DROP. If (2) fails only through the getter artefact, run the inlined measurement-only variant (D-13-a).
  5. Record the outcome in D-13-a (`status: decided (<date>, <GO-S2|GO-S1|PARTIAL|DROP>)`) and §10 with the per-workload ratios and `N_w`/`S_w`. Update this plan's `status:` (`ready` for GO/PARTIAL once the other decisions are taken, `dropped` for DROP).
- **Tests:** the existing suites, unchanged, against every variant.
- **Verify:** `git diff --stat main…spike/arch-13-child-driver -- packages/core/test` is empty.
- **Done when:** D-13-a is decided with numbers.

### T4 — DROP outcome: record the measured rejection
- **Status:** [x] done (ffcdce8, CCR-QD-176; ADR-QD-073 Rev 1.3 addendum, AGENTS.md §5 sentence; `spec/decisions/index.yaml` needed no change — it carries no revision field and the status stays `Accepted`)
- **Depends on:** T3 = DROP
- **Files:** `spec/decisions/073-the-fnuntraced-exception-is-measured.md`, `spec/decisions/index.yaml` (revision only), `AGENTS.md` §5, `spec/README.md` (CCR), `.planning/architecture/README.md`
- **Steps:**
  1. ADR-QD-073: add `> **Addendum <date> (CCR-QD-NEXT) — a single child-walk driver was measured and not adopted.**`
     with the variant ladder, the per-workload ratios, `N_w`/`S_w`, the load
     averages, and the reason the change lost (which workloads, which method). State
     what would justify reopening it: a new Effect release that changes
     `fromIteratorUnsafe`'s cost, or a fourth composite tag (which would make a
     fourth copy). Bump Rev to 1.3.
  2. AGENTS.md §5, after "Converting anything not in the table above needs a
     benchmark first" (`:294`): one sentence — "A shared child-walk driver replacing
     the three was measured and rejected (ADR-QD-073 addendum, <date>); reopening it
     needs a new measurement, not a new argument."
  3. Tracker: ARCH-13 `dropped`, T5–T13 `[-] dropped`; keep T0/T1.
- **Tests:** —
- **Verify:** `node scripts/check-house-style.mjs` (unchanged budgets), `pnpm spec:verify:strict`, `pnpm spec:gates`.
- **Done when:** criterion 3's DROP clause holds.

### T5 — Extract the three folds into `CombinatorFold.ts` (behavior-preserving)
- **Status:** [-] dropped (D-13-a = DROP)
- **Depends on:** T3 ∈ {GO-S2, GO-S1, PARTIAL}, D-13-e, D-13-f, D-13-g
- **Files:** `packages/core/src/CombinatorFold.ts` (*new*), `packages/core/src/ChildWalk.ts` (*new*, type only at this step), `packages/core/src/Evaluate.ts`; under D-13-g(b) also `scripts/check-house-style.mjs` (`SWITCH_BUDGET`, names) and `AGENTS.md` §5a table
- **Steps:**
  1. `ChildWalk.ts`: module doc (one-line summary first, per AGENTS.md's doc-comment
     shape) and `export interface ChildFold<C, S, A, Out>` exactly as in D-13-c.
  2. `CombinatorFold.ts`: move `NO_OBLIGATIONS`, `NO_CHILDREN`, `allow`, `deny`
     (`Evaluate.ts:287-321`) and export them; `Evaluate.ts` imports them.
  3. `AllOf`: `export interface AllOfState { readonly strategy: FieldStrategy; readonly children: Array<Trace>; readonly fieldSets: Array<VisibleFields>; obligations: ReadonlyArray<Obligation> }`,
     `export const beginAllOf = (policy: Extract<Policy, { _tag: "AllOf" }>): AllOfState`,
     `export const allOfFold: ChildFold<Policy, AllOfState, Trace, Trace>` — `step`
     is `stepAllOf`'s body (`:839-849`), `finish` is `finishAllOf`'s (`:851-861`)
     reading `state.strategy` instead of `policy.fieldStrategy`. Move the doc
     comments (`:812-821`, `:834-838`) with them.
  4. `AnyOf`: same for `AnyOfFold`/`beginAnyOf`/`stepAnyOf`/`finishAnyOf`
     (`:960-1017`); `beginAnyOf` keeps `exhaustive: !anyOfStopsAtAllow(policy.fieldStrategy)`.
  5. `Rules`: new `export interface RulesState { readonly decisiveEffect: RuleEffect | undefined; readonly children: Array<Trace>; firstApplying: Applied | undefined; firstDecisive: Applied | undefined }`,
     module-level `interface Applied` (`:1104-1108`), `beginRules(policy)` (reads
     `rulesDecisiveEffect`), `rulesFold.step` = the `step` closure (`:1127-1139`)
     returning `rulesFold.finish(state)` where it returned `true`, and
     `rulesFold.finish` = `:1189-1213`. Keep the "takes `rule` alongside `index`"
     comment (`:1121-1127`) — `step`'s `child` parameter is that `rule`.
  6. Fields: under D-13-g(a) import ARCH-12's merge; under (b) move `mergeFields`
     (`:421-484`) here unchanged, with its `default` arm, and update
     `SWITCH_BUDGET` to `{ "packages/core/src/Evaluate.ts": 1, "packages/core/src/CombinatorFold.ts": 1, "packages/core/src/Matcher.ts": 2 }`,
     `SWITCH_BUDGET_NAMES` (`evaluateNode` / `mergeFields` split across the two
     files), and AGENTS.md §5a's table row location — in this commit.
  7. `Evaluate.ts`: the three `fnUntraced` generators now call `fold.step(state, child, index, trace)`
     / `fold.finish(state)`; `evaluateRules` loses its inline fold. This is exactly
     S0. No test file changes.
- **Tests:** existing suites unchanged.
- **Verify:** `cd $W && node_modules/.bin/vitest run packages/core/test/Evaluate.test.ts packages/core/test/Rules.test.ts` (239 + T0); `pnpm typecheck && pnpm circular && node scripts/check-house-style.mjs`
- **Done when:** green with no test edits; criterion 6 holds.

### T6 — Pure fold tests: properties over generated child-result sequences
- **Status:** [-] dropped (D-13-a = DROP)
- **Depends on:** T5
- **Files:** `packages/core/test/CombinatorFold.test.ts` (*new*)
- **Steps:**
  1. A local runner (test helper, not exported from src):
     `runFold(fold, state, results)` steps until `step` returns a value, else
     `finish`, and also returns the **stop index** (or `results.length`). It is the
     driver's sequential loop with no Effect.
  2. Arbitraries: `traceArb` — `allowed: boolean`, `reason` from a small pool or
     `undefined`, `visibleFields` `undefined` or a subset of `["id","title","body","a.b"]`,
     `obligations` a subset of three fixed `obligation(…)` values, `policyTag` from
     a few leaf tags; `tracesArb` = arrays of length 0–8. `ruleArb` = `permitWhen`/`denyWhen`
     of a placeholder condition (only `effect` is read by the fold).
  3. Declarative oracles in the test file, written from the spec tables, not from the
     fold's code:
     - allOf: settles at the first index whose trace denies; verdict
       `deny("AllOf", t.reason ?? "a required policy denied", prefix)`; otherwise
       allow with obligations = left fold of `unionObligations` over all children and
       fields = the lattice merge (ARCH-12's, or `mergeFields`) of all children's sets.
     - anyOf × `First`: settles at the first allowing index with that child's fields
       and obligations; × `Union`/`Intersection`: never settles in `step`; finish
       allows iff any child allowed, fields = merge over allowing children only,
       obligations = union over allowing children, deny reason = last denying reason
       `?? "no alternative policy allowed"`.
     - rules × each `Combining`: the deciding row per INV-QD-017's table; reason
       `rules[i] permitted|denied` / `"no rule applied"`; a `Deny` row contributes
       neither fields nor obligations; children = prefix up to and including the
       stop index.
  4. Properties (each `FastCheck.assert`, ≥ 500 runs, seeded):
     - `PROPERTY: allOfFold equals the declarative oracle` (verdict, `Trace` deep-equal, stop index).
     - `PROPERTY: anyOfFold equals the oracle under First`, `… under Union`, `… under Intersection` (three, so a strategy-specific failure names itself).
     - `PROPERTY: rulesFold equals the oracle under FirstApplicable`, `… DenyOverrides`, `… PermitOverrides`.
     - `PROPERTY: a fold never widens` — the result's fields are never `undefined` (top) unless some contributing child's were (ADR-QD-034's danger direction).
     - `PROPERTY: begin/step/finish is referentially transparent` — two fresh `begin`s over the same inputs give deep-equal outputs, and the first run's output is unchanged after the second run (no shared state, D-13-f).
     - `PROPERTY: the stop index is where the stop rule says` — for anyOf/rules, equals the first index ShortCircuit's rule marks decisive (ties the folds to ADR-QD-077's table).
  5. Named examples moved from `Rules.test.ts` (D-13-h list), rewritten as fold
     inputs (`traces` + `rules`) with the same assertions and the same BEH ids in
     their names (BEH-QD-111–117).
- **Tests:** the above.
- **Verify:** `cd $W && node_modules/.bin/vitest run packages/core/test/CombinatorFold.test.ts --coverage.enabled --coverage.include=packages/core/src/CombinatorFold.ts` → 100% lines/branches.
- **Done when:** all properties pass and `CombinatorFold.ts` is fully covered by this file alone.

### T7 — The driver, test-first
- **Status:** [-] dropped (D-13-a = DROP)
- **Depends on:** T6, T3 ∈ {GO-S2, GO-S1}, D-13-b, D-13-c
- **Files:** `packages/core/test/ChildWalk.test.ts` (*new*, written first), `packages/core/src/ChildWalk.ts`
- **Steps:**
  1. Write the tests against a toy fold ("sum until a value ≥ 10 settles it") and
     `runChild`s that record their invocation, succeed, `Effect.fail(new Tagged(k))`,
     `Effect.die(k)`, or complete after `Effect.sleep` controlled by `TestClock`:
     - `sequential: stops at the first settled step; later children are never run` (INV-QD-005).
     - `sequential: the first failure is re-raised with its Cause and later children are never run` (fail and die both; `Cause` compared with `Equal`).
     - `concurrent: every child runs` (BEH-QD-132 at driver level).
     - `concurrent: results are stepped by index, not completion order` (delays reversed; settled output and `state` identical to sequential) — BEH-QD-130/133.
     - `concurrent: a failure before the settled index fails the walk, even if it completes last`; `… after the settled index is discarded`; `… of two failures, the lower index wins regardless of completion order` — BEH-QD-134 (T0 wording), CCR-QD-152.
     - `concurrent: a defect is re-raised as a defect, not a failure`.
     - `bounded concurrency 2 agrees with unbounded and sequential`.
     - `no children: finish is returned and runChild is never called`.
     - `width: 100k children walk without overflowing the stack` (sequential).
     - `PROPERTY: sequential, unbounded and bounded give the same Exit` over generated sequences of `Allow | Deny | Fail(k) | Die(k)` with random delays.
  2. Implement `walkChildren` per D-13-c's interface with `Effect.fnUntraced`
     (D-13-b), pairing exits with children inside the `forEach` (§4, §6 row), a doc
     comment that carries ADR-QD-026's "why exit every child" paragraph **once**
     (moved from `Evaluate.ts:919-931`) and ADR-QD-073's "why untraced".
  3. Do **not** wire `Evaluate.ts` yet; `UNTRACED_BUDGET` would now be 4 and the
     lint gate fails — so this task and T8 land as one commit (T7 is the test-first
     half of that commit; run the test file alone while developing).
- **Tests:** the above.
- **Verify:** `cd $W && node_modules/.bin/vitest run packages/core/test/ChildWalk.test.ts`
- **Done when:** all pass; `ChildWalk.ts` 100% covered by this file alone.

### T8 — Put the evaluator on the driver; move the budget, AGENTS §5 and ADR-QD-073 with it
- **Status:** [-] dropped (D-13-a = DROP)
- **Depends on:** T7 (same commit), D-13-e
- **Files:** `packages/core/src/Evaluate.ts`, `scripts/check-house-style.mjs`, `AGENTS.md`, `spec/decisions/073-the-fnuntraced-exception-is-measured.md`, `packages/core/test/Evaluate.test.ts` (observability assertion only), `packages/core/src/PortAccess.ts` (comment `:117`), `packages/core/bench/EffectFn.bench.ts` (comments `:38-48`, `:94-97`)
- **Steps:**
  1. Add `walkComposite` (plain function, D-13-e(i)) in `Evaluate.ts` beside
     `evaluateNode`: builds `runChild = (child) => evaluateNode(conditionOf(child), subject, request, matcherContext, depth + 1, maxDepth)`
     and calls `walkChildren(children, runChild, fold, state, request.concurrency)`.
     (Under GO-S1, the S1 signature instead.)
  2. `evaluateNode`'s arms (`:751-758`): `AllOf` → `walkComposite(policy.policies, policyItself, allOfFold, beginAllOf(policy), …)`, `AnyOf` likewise, `Rules` → `walkComposite(policy.rules, conditionOfRule, rulesFold, beginRules(policy), …)`;
     `policyItself`/`conditionOfRule` are module-level arrows (no per-node allocation).
  3. Delete `evaluateAllOf`, `evaluateAnyOf`, `evaluateRules` and their three copies
     of the concurrency comment; move the surviving ADR-QD-073 doc paragraph
     (`:863-898`) onto `walkChildren`.
  4. `scripts/check-house-style.mjs`: `UNTRACED_BUDGET = { "packages/core/src/ChildWalk.ts": 1 }`,
     `UNTRACED_BUDGET_NAMES = { "packages/core/src/ChildWalk.ts": ["walkChildren"] }`,
     and the doc comment (`:333-361`) — "one per-node driver, `walkChildren`, which
     every composite of both interpreters walks through".
  5. AGENTS.md §5: "Three exceptions" → "One exception"; the table becomes one row
     (`ChildWalk.ts — walkChildren | Runs once per AllOf/AnyOf/Rules node, every
     evaluation, and once per composite in toPredicate`); keep the #101/#102 numbers
     table as history and add one line under it with T3's ratios; update `:273` and
     §5a's `:382-392` names.
  6. ADR-QD-073: amendment block (Rev 1.3) — the three dispatchers became one driver;
     the measured boundary ("once per composite node") is unchanged; T3's numbers;
     link ADR-QD-NEXT.
  7. Observability suite (`Evaluate.test.ts:2540-2700`): add
     `assert.isUndefined(named(spans, "qadi.walk"))` and assert the set of span
     names is exactly what it was before (no new span).
  8. Comment updates in `PortAccess.ts:117` and `EffectFn.bench.ts`.
  9. **Confirmation bench**: re-run T3 step 3 against the T2 baseline commit with the
     landed code (not the spike). It must meet D-13-a's thresholds; record the
     numbers in ADR-QD-NEXT. If it does not, revert this commit (T5's PARTIAL state
     remains valid) and fall to PARTIAL.
- **Tests:** full core suite, unchanged except step 7.
- **Verify:** `cd $W && node_modules/.bin/vitest run packages/core/test` ; `pnpm lint` ; `pnpm circular` ; criteria 4 and 5 greps.
- **Done when:** criteria 4, 5, 8, 9 hold.

### T9 — Delete the tests the folds and the driver replace
- **Status:** [-] dropped (D-13-a = DROP)
- **Depends on:** T6, T7, T8, D-13-h
- **Files:** `packages/core/test/Evaluate.test.ts`, `packages/core/test/Rules.test.ts`
- **Steps:**
  1. Delete exactly the tests listed in D-13-h. Remove helpers left unused
     (`label`, `counting` survive — `:3398`/`:3421` use them).
  2. Re-read every deleted test's comment for a fact not yet in a surviving test or
     doc comment (e.g. `:3487`'s "the interaction the roadmap named"); move such a
     sentence onto the replacing test.
  3. Check each BEH/INV id the deleted tests carried (BEH-QD-111–117, 130, 133, 134,
     INV-QD-004, -017, -020) appears in a surviving test file's row in traceability §4
     (T12 updates the rows).
- **Tests:** suite count drops by 9 (`Evaluate`) and 16 (`Rules`); `CombinatorFold`/`ChildWalk` added.
- **Verify:** `cd $W && node_modules/.bin/vitest run packages/core/test` ; `pnpm coverage` (core ≥ 95%; use `--testTimeout=60000` if `FieldPath.test.ts` times out as on baseline, README "Open items").
- **Done when:** criterion 7 holds and coverage thresholds pass.

### T10 — Translation walks through the driver (D-13-d ≥ b)
- **Status:** [-] dropped (D-13-a = DROP)
- **Depends on:** T8, D-13-c(i), D-13-d ∈ {b, c}
- **Files:** `packages/core/src/Predicate.ts`
- **Steps:**
  1. Three private folds over `Plan` children with `A = Out = Predicate`:
     `conjunctionFold` (step: `result._tag === "False" ? FALSE : (push, undefined)`;
     finish: `and(collected)`), `disjunctionFold` (state carries `stopsAtTrue`),
     `ruleTableFold` (state carries `combining` and `decisive = rulesDecisiveEffect(…)`;
     child is the compiled rule; step pushes `{ effect, condition }` and settles with
     `formulaFor(…)` on a decisive `True`; finish `formulaFor(…)`).
  2. `run`'s three arms (`:697-735`) become
     `walkChildren(p.plans, (inner) => run(inner, subject, context), conjunctionFold, { collected: [] }, undefined)` etc.
     `run` itself stays a plain function (once per translation).
  3. Keep the "Pruning never changes a successful predicate" doc (`:662-672`) on the folds.
- **Tests:** existing `Predicate.test.ts` unchanged — INV-QD-058's walk-equality and
  agreement properties (`:943`, `:1150`, `:1186`, `:1228`) are the regression net.
- **Verify:** `cd $W && node_modules/.bin/vitest run packages/core/test/Predicate.test.ts packages/core/test/ShortCircuit.test.ts` ; `grep -n "Effect.gen" packages/core/src/Predicate.ts` prints nothing.
- **Done when:** green, criterion 5's second clause holds.

### T11 — Translation folds become pure and the pruning claim becomes a test (D-13-d = c)
- **Status:** [-] dropped (D-13-a = DROP)
- **Depends on:** T10, D-13-d = c
- **Files:** `packages/core/src/PredicateFold.ts` (*new*), `packages/core/src/Predicate.ts`, `packages/core/test/PredicateFold.test.ts` (*new*)
- **Steps:**
  1. Move `TRUE`, `FALSE`, `and`, `or`, `negate`, `formulaFor` (and `constant` if
     only they use it) plus T10's three folds into `PredicateFold.ts`; `Predicate.ts`
     imports them. `PredicateFold.ts` imports `Predicate`'s *type* only — check
     `pnpm circular` (the type import is erased; if madge flags it, move the
     `Predicate` type alias into `PredicateFold.ts` and re-export it from
     `Predicate.ts` so the public name is unchanged).
  2. Tests: arbitrary child-predicate sequences (constants, `Compare`s over two
     columns, nested `And`/`Or`) and rows; properties
     `PROPERTY: pruning never changes the predicate's meaning` for each fold (the
     early-settled result and `finish` over the whole sequence agree under
     `evaluatePredicate` on every row) and `PROPERTY: the stop index is where
     ShortCircuit says`. Examples for each `Combining` from `Predicate.ts:662-672`'s
     three cases.
- **Tests:** the above.
- **Verify:** `cd $W && node_modules/.bin/vitest run packages/core/test/PredicateFold.test.ts packages/core/test/Predicate.test.ts` ; `pnpm circular` ; `node scripts/check-api-surface.mjs` (after T12's rows).
- **Done when:** green; `Predicate.ts:662-672`'s comment cites the property by name.

### T12 — Spec, ADRs, traceability, overview, models prose, changeset
- **Status:** [-] dropped (D-13-a = DROP)
- **Depends on:** T8 (T10/T11 if taken)
- **Files:** `spec/decisions/NNN-composite-children-are-walked-by-one-driver.md` (*new*, ADR-QD-NEXT), `spec/decisions/index.yaml`, `spec/decisions/026-concurrent-evaluation.md`, `spec/behaviors/17-concurrency.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md`, `spec/models/25-rubac.md`, `spec/models/00-adoption-matrix.md`, `spec/models/26-xacml.md`, `.changeset/arch-13-child-walk-driver.md` (*new*)
- **Steps:**
  1. **ADR-QD-NEXT** "Composite children are walked by one driver": Context (C1, C3,
     C9), Decision (D-13-b/c/d/e/f outcomes), the T3/T8 measurement tables with
     method and load averages, Alternatives (S1, S0, DROP, eager, traced),
     Consequences (one budget entry; folds are a test surface; translation shares the
     stop mechanics). Status Accepted, amends ADR-QD-073 and ADR-QD-026.
  2. **ADR-QD-026**: amendment note — `:119-126`'s "all three composite dispatchers"
     now reads "the one driver, `ChildWalk.ts`"; history kept.
  3. **BEH-QD-131** (`17-concurrency.md:67-82`): REQUIREMENT becomes "The rules that
     combine child results MUST exist in exactly one fold per composite, and every
     composite of every interpreter MUST be walked by the one driver, which drives the
     fold in declaration order under both schedules." Rev 1.2 (T0 was 1.1).
  4. **INV-QD-017** Source: `CombinatorFold.ts`'s `rulesFold.step` settles; `ChildWalk.ts`
     stops. Enforcement: + "`CombinatorFold.test.ts`'s per-algorithm oracle properties".
  5. **INV-QD-020** Source (`:621-641`): the fold per composite in `CombinatorFold.ts`,
     the schedule once in `ChildWalk.ts`; Enforcement (`:659-674`): + driver tests and
     its `Exit`-equality property; the "explicit cases" sentence now points at
     `ChildWalk.test.ts`.
  6. **INV-QD-058** Source: + `ChildWalk.ts` (both interpreters stop by the same
     mechanics, not only the same rule); + `PredicateFold.test.ts` under D-13-d(c).
  7. **Traceability**: §1 rows for behaviors 15 and 17 gain `ChildWalk.ts`/
     `CombinatorFold.ts` as Source; INV rows `:97`, `:102`, `:100` updated; §4 rows:
     `Rules.test.ts` → `INV-QD-006, INV-QD-017` (+ BEH ids it still carries),
     new rows `CombinatorFold.test.ts` (BEH-QD-111–117, BEH-QD-131, INV-QD-004,
     INV-QD-012, INV-QD-017, INV-QD-020), `ChildWalk.test.ts` (BEH-QD-130–134,
     INV-QD-005, INV-QD-020), `PredicateFold.test.ts` (INV-QD-058); `Evaluate.test.ts`
     row keeps BEH-QD-134 only if a surviving test names it (else move it to
     `ChildWalk.test.ts`'s row). Rev bump + change-history line.
  8. **Overview** "Not listed above" (`spec/overview.md:766-767` neighbourhood): rows
     for `walkChildren`, `ChildFold` (`@qadi/core/ChildWalk.ts`); `allow`, `deny`,
     `NO_OBLIGATIONS`, `NO_CHILDREN`, `allOfFold`, `beginAllOf`, `AllOfState`,
     `anyOfFold`, `beginAnyOf`, `AnyOfState`, `rulesFold`, `beginRules`,
     `RulesState` (`@qadi/core/CombinatorFold.ts`); `PredicateFold.ts`'s exports
     under (c) — reason "scaffolding shared by the evaluator's composites (and both
     interpreters), reachable only via the `./*` subpath (AGENTS.md §9)", mirroring
     the `ShortCircuit.ts` row. Rev 1.32.
  9. **Models prose**: `25-rubac.md:55,66`, `00-adoption-matrix.md:174,185`,
     `26-xacml.md:244` — "hard-coded in `evaluateAllOf` and `evaluateAnyOf`" →
     "in `CombinatorFold.ts`'s `allOfFold`/`anyOfFold`"; `evaluateRules` →
     `rulesFold`.
  10. **CCR-QD-NEXT** row in `spec/README.md` listing every file above.
  11. **Changeset** `patch` for `@qadi/core` (the fixed group bumps all public
      packages together): "Internal: one child-walk driver for `allOf`/`anyOf`/`rules`
      (and `toPredicate`'s composites); no change to decisions, traces, errors or
      port calls." New internal modules are reachable only through the `./*`
      subpath; say so.
- **Tests:** —
- **Verify:** `pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api`
- **Done when:** all five pass.

### T13 — Full gate and mutation testing
- **Status:** [-] dropped (D-13-a = DROP; nothing to mutate — the only code ARCH-13 changed is `Evaluate.bench.ts`/`DecisionCache.bench.ts` (T1). The orchestrator's final `pnpm check` still covers T0/T1/T4)
- **Depends on:** T9, T12 (T11 if taken)
- **Files:** —
- **Steps:**
  1. Same-day baseline on the pre-ARCH-13 commit:
     `pnpm exec stryker run --mutate packages/core/src/Evaluate.ts,packages/core/src/Predicate.ts`
     (record survivors per file; ARCH-01 recorded 22 + 7 no-cov in `Evaluate.ts`).
  2. On the branch: `pnpm exec stryker run --mutate packages/core/src/ChildWalk.ts,packages/core/src/CombinatorFold.ts,packages/core/src/Evaluate.ts,packages/core/src/Predicate.ts` (+ `PredicateFold.ts` under (c)).
     Expected killers: driver tests (`concurrency === undefined` flips, `settled !== undefined`
     flips, `failCause` removal), fold properties (every `allowed` test, `??` defaults,
     `push` removals, `===` on `RuleEffect`, `exhaustive` negation).
  3. Any survivor in a new module gets a test, or — if equivalent — a line in the
     CCR naming it (ADR-QD-025: no ignore list without an ADR).
  4. Full gate: `pnpm check`. If the default 5 s timeout trips `FieldPath.test.ts`
     on this machine (README "Open items"), record it and run the coverage step as
     `pnpm vitest run --coverage --testTimeout=60000`, as ARCH-01/02 did.
- **Tests:** —
- **Verify:** `pnpm check` ; the Stryker commands above.
- **Done when:** criteria 10 and 11 hold.

## 7. Test strategy

**Survive unchanged (the interface tests):** everything in `Evaluate.test.ts`
except the nine D-13-h deletions — notably the two `PROPERTY` tests of "concurrent
evaluation" (INV-QD-020 end to end, with the vacuity guard BEH-QD-132 requires),
`:3398`, `:3421`, the depth matrix `:768-816`, the observability suite, the
INV-QD-090 100k chains; `Rules.test.ts`'s INV-QD-017 port-count block (the
interface proof that the walk stops), composition and failure tests;
`Predicate.test.ts` entirely (INV-QD-058); `ShortCircuit.test.ts`.

**Move to the new interfaces:**
- *Fold semantics* → `CombinatorFold.test.ts`: model-based properties against
  declarative oracles for `allOf`, `anyOf` × 3 strategies, `rules` × 3 algorithms;
  "never widens" and referential-transparency properties; the Rules.test.ts examples
  as named fold examples. No `Effect` is run.
- *Schedule mechanics* → `ChildWalk.test.ts`: one test per ordering/stop/failure-
  precedence rule, plus an `Exit`-equality property across sequential, unbounded and
  bounded schedules.
- *Translation folds* (D-13-d(c)) → `PredicateFold.test.ts`: the pruning-preserves-
  meaning property, evaluated with `evaluatePredicate`.

**Deleted (replace, don't layer):** D-13-h's 9 + 16 tests, after T6–T8 land and
the full suite is green with them still present.

**Differential:** the spike's own check — the unchanged suites pass against every
variant (T3 step 2) — is the differential between old and new code; no frozen copy
of the old functions is kept (ARCH-02's T18 deleted its oracles for the same reason).

**Mutation (ADR-QD-025):** T13. The point of making folds pure is that a mutant in a
fold is killed by a direct property rather than only by a lucky end-to-end tree.

**Benchmarks:** T1 (coverage of every fold), T2 (baseline), T3 (gate), T8 step 9
(confirmation) — recorded in the ADR, never a merge gate.

## 8. Spec and documentation updates

- `spec/behaviors/17-concurrency.md`: BEH-QD-134 corrected (T0, Rev 1.1); BEH-QD-131 tightened (T12, Rev 1.2).
- `spec/invariants.md`: INV-QD-017, INV-QD-020, INV-QD-058 Source/Enforcement (T12).
- `spec/decisions/`: ADR-QD-NEXT (new, GO path); ADR-QD-073 amendment (GO) **or** addendum (DROP, T4); ADR-QD-026 amendment note; `index.yaml`.
- `spec/traceability.md`: §1 and §4 rows (T12).
- `spec/overview.md`: "Not listed above" rows for every new internal export (gate 13, T12).
- `spec/models/*`: prose references to the deleted function names (T12).
- `spec/README.md`: CCR-QD-NEXT for T0, and CCR-QD-NEXT for the GO/PARTIAL/DROP outcome.
- `AGENTS.md` §5/§5a (T8 on GO; one sentence in T4 on DROP); `scripts/check-house-style.mjs` budgets and doc comment.
- `.changeset/arch-13-child-walk-driver.md` (patch). T1's bench fix needs no changeset (bench files are not published).

## 9. Risks and rollback

| Risk | Detection signal | Rollback |
| ---- | ---------------- | -------- |
| The driver is slower on the hot path | T3 ladder; T8 step 9 confirmation | Revert T7+T8's commit; T5/T6 (PARTIAL) remain valid on their own. On a T3 failure, DROP with T4. |
| A noisy machine produces a false PASS | `N_w` > 10%, or A/A′ ratio far from 1 | D-13-a's inconclusive rule: re-run; second time, DROP. |
| vitest's getter overhead penalizes module extraction | the "module export getters" warning lists `ChildWalk`/`CombinatorFold` | D-13-a's inlined measurement-only variant separates artefact from cost. |
| A `runChild` closure per composite node costs more than measured in isolation | S2 fails, S1 passes | Take S1; D-13-d becomes (a); T10/T11 dropped. |
| Stack overflow on deep or wide trees | `Evaluate.test.ts:4130`; T7's 100k-width test | Driver must stay `fnUntraced` (lazy). Never `fnUntracedEager`. |
| A behavior change slips in with the restructure | any unchanged test fails at T3 step 2 / T5 / T8 | Variant disqualified (T3) or commit reverted. |
| Deleting tests loses a requirement | T9 step 3's id check; `pnpm spec:verify:strict` | Restore the deleted test from git; add the missing assertion to the fold/driver test. |
| `UNTRACED_BUDGET` and AGENTS §5 drift apart | `pnpm lint` (`untraced-budget`, `untraced-budget-names`) | Edit together in T8's single commit. |
| ARCH-12 and ARCH-13 both move `mergeFields` | merge conflict in `Evaluate.ts`/`SWITCH_BUDGET` | D-13-g(a): ARCH-12 first. |
| Translation sharing breaks INV-QD-058 | `Predicate.test.ts` properties | Revert T10/T11 only; the evaluator half stands alone. |
| Mutation score drops for `Evaluate.ts` because code moved | T13 per-file comparison | Expected: survivors move with the code into `CombinatorFold.ts` and are killed there; compare totals across the moved files, not `Evaluate.ts` alone. |

**Rollback granularity:** T0 and T1 are independent commits. T5(+T6) is the
PARTIAL commit. T7+T8 are one commit (budget consistency). T9, T10, T11, T12 are
each one commit and revert in reverse order.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-05 | — | Plan written; evidence re-verified at `e0ee958` (spike copies S1/S2 type-check and pass 239/239 unchanged tests; timing inconclusive under load 13–28). New defects: `pnpm bench` fails on six single-benchmark `bench.compare` calls (C7); BEH-QD-134 contradicts INV-QD-020 since CCR-QD-152 (C10). Brief's "concurrency tests in Rules.test.ts" refuted (C13). Status `needs-decision`: D-13-a…h open. | Claude (planning agent) |
| 2026-10-05 | T0 | BEH-QD-134 restated to match INV-QD-020 (`17-concurrency.md` Rev 1.1); the two `Evaluate.test.ts` tests renamed `BEH-QD-134: …`; CCR-QD-171 registered in `spec/README.md` Rev 1.72. Commit `21f757f`. `spec:verify:strict` 19/19, `spec:examples` 81 blocks, `Evaluate.test.ts` 212/212. | Claude (impl agent, step 1) |
| 2026-10-05 | T1 | Six single-benchmark `bench.compare` calls → `bench(name, fn).run(options)` (not `bench(name, fn, options).run()`: the third `bench` argument is per-function `fnOpts`; run options go on `.run`, per `node_modules/vitest` 5.0.0's `BenchRegistration.run(options?)`). Added the six anyOf/rules workloads to the `evaluate` group and two concurrency groups (`anyOf Union 8`, `rules DenyOverrides 8`). `pnpm bench` exits 0 (4 files, 18 tests, 125 s, load avg 57–76); `grep -cE 'bench\("(rules\|anyOf)'` = 5; `pnpm typecheck`, `pnpm lint` clean. Commit `95fde17`. T2+ left for a later agent; status stays `needs-decision`. | Claude (impl agent, step 1) |
| 2026-10-05 | T2+T3 | **Gate run: DROP.** Environment: Apple M3 Pro (12 cores), Node 22.22.0, HEAD `e1d4cb6`. The machine was shared with the user's Rust test suites and a parallel agent the whole time, so D-13-a's load < 2 precondition could not be met. Variants were built as copies of `packages/core/src` under an untracked `packages/core/bench/zz-arch13/`, generated by `scratchpad/arch13impl/gen.py` and archived in `scratchpad/arch13impl/variants/`: **A** (today), **A′** (identical copy), **S0** (folds in `CombinatorFold.ts`, three `fnUntraced` loops kept), **S1** (evaluator-specific `walkComposite` driver in `Evaluate.ts`), **S2** (generic `walkChildren` in `ChildWalk.ts` plus a `walkComposite` adapter, pairing `{ child, index, result }` inside the `forEach` per §4) and **S2i** (S2 with both modules inlined, measurement only). `tsc` on all four: 0 errors apart from unused imports. Tests, unchanged: S1 and S2 41 files / 1273 pass (whole core suite); S0 Evaluate+Rules+Predicate+ShortCircuit 358 pass. Vitest must be the instance `@effect/vitest` peers on (`node_modules/.pnpm/@effect+vitest@4.0.0_…/node_modules/vitest`), else "Cannot read properties of undefined (reading 'config')". **Method:** `workloads.ts` builds all 26 composite, depth, width and concurrency workloads of `Evaluate.bench.ts` (plus `one node` and `resolver miss` as controls) from each variant's own modules. (1) `harness.mts`, run with `node --experimental-strip-types`: in-process, 9 rounds × 250 ms, rotating order, A/A′/S0/S1/S2. (2) `Paired.bench.ts`: one vitest `bench.compare` per workload over all six variants, 300 ms + 100 ms warmup, order rotated and reversed per run. Each session ran 6 paired runs and 2 harness runs. **Session 1** (load 165–198): harness N_w 2.0–59.2%, **> 10% on 16/26**; vitest S_w (A's p75 max/min) 5.5–166.7%. **Session 2** (load 17–181, mostly 20–50): harness N_w 2.0–60.6%, **> 10% on 16/26**; S_w 8.1–183.3%. Both sessions are inconclusive under D-13-a, and so was C11's planning spike, so the rule gives **DROP**. Formally every rung also fails criteria (1)–(3), with HARD flags, though A′ itself trips HARD flags at this noise. **Supplementary, reproducible across sessions:** per-run *min* latency, median of 6, as A/V (> 1 = V faster). A′ is within ±3% on 21/26 (s1) and 24/26 (s2) workloads and ±9% on all. Sequential composites (both sessions): S0 0.85–0.97, S1 0.86–0.99, S2 0.86–1.01, S2i 0.96–1.05, with `depth 40` S0/S1/S2 0.86–0.87 against S2i 0.97–0.98, so the module split costs up to 15%, growing with depth, and inlining recovers it (vitest's getter artefact, the ARCH-08 lesson). Concurrent `allOf` 8 / `anyOf Union` 8: S0 0.79/0.78 (s1) and 0.84/0.78 (s2); S1 0.78/0.74 and 0.86/0.80; S2 0.79/0.80 and 0.85/0.80; **S2i 0.83/0.79 and 0.86/0.83**. That is a real 14–26% cost: the per-child `Effect.map` pairing, which today's `AllOf`/`AnyOf` concurrent branches do not pay. Concurrent `rules`: ±3% (it already pays the pairing). Raw outputs: `scratchpad/arch13impl/s1/`, `s2/` (`paired-*.txt`, `harness-*.json`, `analysis.txt`). Scaffolding deleted from the worktree. | Claude (impl agent, step 6) |
| 2026-10-05 | T4 | ADR-QD-073 Rev 1.3 addendum "a single child-walk driver was measured and not adopted": variant ladder, both sessions' N_w/S_w and load averages, the min-latency table, the two costs, and the reopening conditions. The conditions are a quiet-machine run with every N_w ≤ 10%, an Effect release changing the cost of `fromIteratorUnsafe`/`exit`/`map`, a driver that pairs exits without a per-child Effect or unchecked index, or a fourth composite tag. AGENTS.md §5 gets one sentence after "needs a benchmark first"; `spec/README.md` Rev 1.77 adds CCR-QD-176. `check-house-style`, `spec:verify:strict` 19/19, `spec:gates`, `spec:claims` and `spec:api` (794 exports) pass. Budgets are unchanged. Also green: `pnpm typecheck`, `pnpm lint`, `pnpm circular`, `pnpm test:tstyche`, `pnpm spec:examples` (86 blocks) and `pnpm bench` (5 files, 21 benchmarks, exit 0). Commit `ffcdce8`. T5–T13 dropped, and D-13-b…h recorded as recommended defaults made moot by the DROP. | Claude (impl agent, step 6) |
