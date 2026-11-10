---
id: ARCH-26
title: One pure short-circuit stepper both interpreters ask "does this child stop the walk?"
strength: Speculative   # 2026-10-06 architecture review, candidate #11 ("One short-circuit stepper"), benchmark-gated
status: dropped         # T0–T3 landed (7af1e22); D-26-a gate: DROP by noise (D2); T4 done, T5 landed, T6–T10 dropped
evidence_verified_at: e328e75
depends_on: []          # soft: the gate (T4) and the code (T6–T9) run after ARCH-16 lands (D-26-f); T1–T3 do not wait
blocks: []
adrs_touched:
  - ADR-QD-077 (amend — on GO, `ShortCircuit.ts` owns the stop *decision*, not only its inputs; on DROP, an addendum records the measured rejection)
  - ADR-QD-073 (read — Rev 1.3 addendum: the shared child-walk driver was measured and dropped; UNTRACED_BUDGET and the three `fnUntraced` dispatchers stay exactly as they are; on DROP, one cross-reference line)
  - ADR-QD-024 (read — the interpreters are not merged; the stepper shares one pure decision and each interpreter keeps what "certain" means for its own result type)
  - ADR-QD-091 (read — the precedent this plan follows twice: a closed string-literal answer "costs what a boolean does", and module-local bindings remove vitest's per-call getter cost on a hot cross-module call)
  - ADR-QD-013 (read — sequential short-circuit is the default; `allOf` stops at the first denial, `anyOf` at the first allow except under `Union`/`Intersection`)
  - ADR-QD-023 (read — combining algorithms; the deciding row is chosen by index)
  - ADR-QD-026 (read — the concurrent branches exit every child and fold by index; untouched here)
  - ADR-QD-034 (read — SWITCH_BUDGET; the stepper is selected through an own-property table, never a `switch`)
  - ADR-QD-092 (read — `anyOf`'s stop is the lattice's `decidedByFirst` law; a value outside the union never stops early)
  - ADR-QD-025, ADR-QD-076 (read — Stryker gate; `ignoreStatic` skips module-load code, so no decision literal may sit in a module-scope initializer)
  - ADR-QD-037 (read — madge; `ShortCircuit.ts` keeps importing only `FieldLattice.ts` and `Policy.ts` types)
  - ADR-QD-051 (read — no span is added)
packages: [core]
estimate: M   # T0–T3 ≈ ½ day (always lands); gate T4 ≈ ½–1 day; GO path T6–T10 ≈ 1 day; DROP path T5 ≈ 1 h (S)
---

# ARCH-26 — One pure short-circuit stepper both interpreters ask "does this child stop the walk?"

## 1. Verified evidence (at `e328e75`)

Everything below was re-read on `main` at `e328e75`. `Evaluate.ts` and
`Predicate.ts` are byte-identical to `d0884e6` (`git diff d0884e6 e328e75 --stat`
does not list them); `ShortCircuit.ts` gained 13 lines in `e9c7afc` (`isCombining`,
CCR-QD-183). Throwaway probes live in the session scratchpad under
`wave3/ARCH-26/` (abbreviated `$P` below):

- `$P/core/` — a copy of `packages/core/{src,test}` with `node_modules` symlinked
  to `packages/core/node_modules` and a `tsconfig.json` extending the repo's
  `tsconfig.base.json`;
- `$P/probe.py` — the stop-rule mutation probe (C3);
- `$P/spike/apply.py` — the stepper spike, applied to a copy of `src` (C6);
- `$P/harness/` — ARCH-13's measurement harness, copied from that session's
  scratchpad (`…/bec6e384…/scratchpad/arch13impl/variants/`), plus this plan's
  orientation run (C7).

Tests against a copy must run on the vitest instance `@effect/vitest` peers on:
`V=node_modules/.pnpm/@effect+vitest@4.0.0_effect@4.0.0_vitest@5.0.0/node_modules/vitest/vitest.mjs`,
`cd $P/core && node $V run …`. The copy's own `node_modules/.bin/vitest` fails
every file with `Cannot read properties of undefined (reading 'config')`, the same
two-instance failure ARCH-13 C0 recorded. In the repository itself
`pnpm vitest run packages/core/test/ShortCircuit.test.ts` works (7 passed).

### C1. `ShortCircuit.ts` holds lookups, not the stop decision — **CONFIRMED (lines CHANGED)**

`packages/core/src/ShortCircuit.ts` (102 lines) exports four functions:

| Export | Lines | What it answers |
| ------ | ----- | --------------- |
| `anyOfStopsAtAllow(strategy): boolean` | `:52-53` | forwards to `fieldStrategyLaws(strategy).decidedByFirst` (`FieldLattice.ts:345`, law `:225`), nothing else |
| `isCombining(value)` | `:71-72` | membership in the closed `Combining` union (added in `e9c7afc`) |
| `effectiveCombining(combining)` | `:88-89` | the algorithm a table is walked under (`DenyOverrides` outside the union) |
| `rulesDecisiveEffect(combining): RuleEffect \| undefined` | `:101-102` | the effect that ends a rules walk, or `undefined` under `FirstApplicable` |

The review called these "only booleans". Strictly, `rulesDecisiveEffect` returns
an effect, not a boolean, but the point stands. No function in the module answers
the question its own doc comment (`:1-12`) says the two interpreters must agree
on: *does this child's result stop the walk?* Each interpreter combines the lookup
with its child's result by hand (C2). `allOf` has no function at all (`:14-15`:
"stops at its first denial under every strategy and needs no function to say so").

### C2. The stop decision is written twice, once per interpreter — **CONFIRMED (lines CHANGED)**

There are three conjunctions, each hand-written in both interpreters, so six sites:

| Composite | `evaluate` (`Evaluate.ts`) | `toPredicate` (`Predicate.ts`, `run` `:645-705`) |
| --------- | -------------------------- | ------------------------------------------------- |
| `allOf` | `stepAllOf` `:687-697`: `if (!trace.allowed)` `:689` | `Conjunction` `:666-675`: `if (result._tag === "False") return FALSE` `:672` |
| `anyOf` | `beginAnyOf` `:817-823` sets `exhaustive: !anyOfStopsAtAllow(…)` `:820`; `stepAnyOf` `:832-854`: `if (trace.allowed)` `:835` … `if (!fold.exhaustive)` `:838` | `compile` sets `stopsAtTrue: anyOfStopsAtAllow(p.fieldStrategy)` `:523`; `Disjunction` `:677-685`: `if (p.stopsAtTrue && result._tag === "True") return TRUE` `:682` |
| `rules` | `evaluateRules` `:943-1067`: `decisiveEffect = rulesDecisiveEffect(…)` `:955`; the `step` closure `:980-992`: `if (!trace.allowed) return false` `:982`, `if (decisiveEffect === undefined) return true` `:986`, `if (rule.effect === decisiveEffect)` `:987` | `RuleTable` `:687-703`: `decisive = rulesDecisiveEffect(p.combining)` `:689`; `if (condition._tag === "True" && (decisive === undefined \|\| rule.effect === decisive))` `:698` |

The review cited `Evaluate.ts` "around 973-990" and `Predicate.ts:667-700`. The
`step` closure itself is at `:980-992` at both `d0884e6` and `e328e75`, and
`run`'s three arms are at `:666-703`. The review's ranges were approximate; the
code has not moved since.

The two interpreters read different *kinds* of result. The evaluator's child is a
`Trace`, always settled one way or the other. The translator's child is a
`Predicate`, which can be `True`, `False` or row-dependent (a column), and only a
*constant* may stop the walk. This is the one real asymmetry a shared stepper has
to absorb (D-26-b).

### C3. The real contract is tested, but only indirectly — **CHANGED (the review understated it)**

The review said `ShortCircuit.test.ts` tests the booleans, and that the real
contract, both interpreters stopping at the same child, lives only in
`Predicate.test.ts`'s walk-equality property.

- `ShortCircuit.test.ts` (69 lines, 7 tests) asserts the lookup tables row by row,
  including prototype-key values. It **CONFIRMS** the review's point.
- The walk-equality property is `Predicate.test.ts:1202-1236`, "PROPERTY: on
  resource-free trees the two interpreters make the same port calls and end the
  same way". It uses `FastCheck.sample` (200 runs, seed 2048), so a failure does
  not shrink. Its trees come from `freeTree` (`:1174-1198`: `maxDepth: 4`, at most
  3 children per composite, all three strategies and algorithms). It compares the
  **port-call logs** and an outcome label. A stop is therefore visible only when a
  later sibling makes a port call. The leaves `hasRole`, `hasPermission` and
  `hasAction` log nothing.
- **Probe** (`$P/probe.py`): six hand-made stop-rule mutants, each applied alone to
  the copy, each run against five test sets.

| Mutant | walk-eq alone | `Predicate.test` | `ShortCircuit.test` | `Rules.test` | `Evaluate.test` |
| ------ | ------------- | ---------------- | ------------------- | ------------ | --------------- |
| M1 translator rules: stop at any applying rule (`:698` drops the effect test) | killed | killed (4) | survived | survived | survived |
| M2 translator rules: `FirstApplicable` never stops | killed | killed (2) | survived | survived | survived |
| M3 translator anyOf: stop at `True` under every strategy | killed | killed (2) | survived | survived | survived |
| M4 translator allOf: never stop | killed | killed (3) | survived | survived | survived |
| M5 evaluator rules: `FirstApplicable` never stops (`:986`) | killed | killed (2) | survived | killed (2) | killed (1) |
| M6 evaluator anyOf: `First` never stops (`:838`) | killed | killed (2) | survived | killed (1) | killed (8) |

So the walk-equality property is strong: it kills 6 of 6. The per-interpreter
examples also carry part of the contract:

- on the translator side, the eight `BEH-QD-NEXT-b` examples (`Predicate.test.ts:1546-1644`);
- on the evaluator side, `Rules.test.ts`'s INV-QD-017 block (`:167-263`) and
  `Evaluate.test.ts`'s anyOf/First tests.

**`ShortCircuit.test.ts` kills none of the six**, because none of them is in
`ShortCircuit.ts`. Two things follow:

1. Every conjunction that decides a stop sits outside the module whose tests are
   said to pin it. INV-QD-058's Enforcement (`spec/invariants.md:2318`) states
   "`ShortCircuit.test.ts` pins each stop rule", which overstates what that file
   pins. This is a spec text defect, fixed in T3.
2. The *agreement* (both interpreters stop at the same index) is stated by exactly
   one test, and that test has three weaknesses: it is indirect (port logs only),
   sampled (no shrinking), and narrow (at most 3 siblings). T2 states it directly.

### C4. **NEW DEFECT (docs in code): thirteen `-NEXT` placeholders were never assigned** — **CONFIRMED**

CCR-QD-153 (ADR-QD-077) assigned INV-QD-058 and BEH-QD-264…267
(`spec/behaviors/16-predicates.md:151,210,240`; `spec/behaviors/30-port-calls.md:90`).
The code still carries the placeholders:

- `Predicate.ts:629` (`INV-QD-NEXT`) and `:750` (`BEH-QD-NEXT-c`);
- `Predicate.test.ts:1060`, `:1204`, `:1240`, `:1284` (`INV-QD-NEXT` → INV-QD-058);
- `:1351` (`NEXT-a` → BEH-QD-264);
- `:1436`, `:1441` (`NEXT-d` → BEH-QD-267);
- `:1541`, `:1546` (`NEXT-b` → BEH-QD-265);
- `:1542`, `:1646` (`NEXT-c` → BEH-QD-266).

The probe command is `grep -rn "INV-QD-NEXT\|BEH-QD-NEXT" packages/core/src packages/core/test`,
which prints 13 lines. The traceability matrix already maps `Predicate.test.ts` to
the real ids (`spec/traceability.md:267`). A reader grepping for BEH-QD-265 finds
the spec but not the test that proves it. Fixed in T1. No gate catches it:
`spec:verify` reads the spec, not test names.

### C5. ARCH-13 and ADR-QD-073 Rev 1.3 — what was dropped, and how this differs — **CONFIRMED from the record**

`ARCH-13-combinator-child-driver.md` (status `dropped`) and ADR-QD-073's
2026-10-05 addendum (CCR-QD-176) record the proposal, the measurement and the outcome.

**The proposal.** One Effect driver, `walkChildren`, would have been the only
`Effect.fnUntraced` site. It would own the **schedule** of every composite: the
sequential walk-until-settled loop, the concurrent
`Effect.forEach(…, Effect.exit(…))`, folding the exits by index, and re-raising
the first failure with `Effect.failCause`. The three folds would have moved into an
Effect-free `CombinatorFold.ts`, and translation's `run` would have walked through
the same driver.

**What was measured.** Variants S0, S1, S2 and S2i, in two sessions at load
averages 165–198 and 17–181, using the two methods described in §5 D-26-a.

**The outcome: DROP.**

- Both sessions were inconclusive (`N_w > 10%` on 16 of 26 workloads), which the
  gate counts as a DROP.
- Two costs were reproducible on per-run minimum latency:
  1. Sequential composites were up to 15% slower in S0, S1 and S2, growing with
     depth. Inlining (S2i) recovered it, so this is vitest's module-runner getter
     artefact.
  2. Concurrent `allOf`/`anyOf` were 14–26% slower in every variant, S2i
     included. This cost is real: it is the per-child `Effect.map` that pairs each
     exit with its child.

**What this plan proposes instead, which is strictly narrower:**

- **A pure function, not an Effect.** `ShortCircuit.ts` gains functions from
  (configuration, one child's certain outcome) to `"Stop" | "Continue"`. There is
  no generator, no `Effect` import, no loop and no schedule.
- **The loops stay where they are.** The three `Effect.fnUntraced` dispatchers stay
  in `Evaluate.ts` with their names (`UNTRACED_BUDGET` unchanged). Their
  sequential and concurrent branches are untouched, apart from the one comparison
  inside each fold that decides a stop.
- **The folds stay where they are.** `stepAllOf`, `stepAnyOf` and `evaluateRules`'s
  `step` closure stay in `Evaluate.ts`. Translation's `run` keeps its three
  `Effect.gen` loops.

**Which ARCH-13 findings transfer** (the argument is in §5 D-26-a):

| ARCH-13 finding | Transfers to a pure stepper? |
| --------------- | ---------------------------- |
| Concurrent 14–26% (per-child `Effect.map` pairing) | **No.** No `Effect` is added per child; the concurrent branches keep their exact shape. |
| Sequential ≤ 15% under vitest (per-child cross-module call through an imported binding, `allOfFold.step`) | **The mechanism transfers as a risk, mitigated.** Per-child calls go through a stepper selected **once per node** into a local (anyOf, rules), or a module-local binding (allOf), which is ADR-QD-091's fix. Per node, `rulesStepper(…)`/`anyOfStepper(…)` replace today's `rulesDecisiveEffect(…)`/`anyOfStopsAtAllow(…)`, so the count of cross-module calls is unchanged. |
| One closure allocated per composite node (S2's `runChild`) | **No.** The steppers are module-scope functions picked by a table lookup; nothing is allocated per node. |
| The machine noise that made both sessions inconclusive | **Yes, fully.** The gate keeps the conclusiveness rule and tightens it (D-26-a). |

None of ARCH-13's variants is this change. S0 comes closest (folds moved to another
module, loops kept), but it called `allOfFold.step(…)` per child through an
imported object, which is the getter cost this plan avoids by construction. So the
DROP does not decide ARCH-26 either way. ADR-QD-073's reopening conditions
("a new measurement, not a new argument") are written for a child-walk driver.
This plan reopens nothing there, but takes on the same burden of proof.

### C6. Spike: the stepper is expressible, type-clean and behavior-preserving — **CONFIRMED**

`$P/spike/apply.py` applies the shape recommended in D-26-b to `$P/core/src`:

- `ShortCircuit.ts` gains `Step`, `allOfStep`, `AnyOfStepper`/`anyOfStepper` and
  `RulesStepper`/`rulesStepper`. The three rules steppers are separate arrows, and
  the selector reads a `Record<Combining, RulesStepper>` through
  `effectiveCombining`.
- `Evaluate.ts` calls `allOfStepLocal(!trace.allowed)`, where the local is a
  module-local binding. `AnyOfFold` carries `step: AnyOfStepper` in place of
  `exhaustive`, and `evaluateRules` uses `stepRule = rulesStepper(…)`.
- In `Predicate.ts`, `Plan.Disjunction` carries `step: AnyOfStepper` in place of
  `stopsAtTrue`, and the three `run` arms ask the steppers.

Results:

- `tsc -p $P/core/tsconfig.json` reports 0 errors, once the now-unused
  `RuleEffect` type import is dropped from `Evaluate.ts`.
- The **whole core suite, unchanged**, gives 44 files and **1466/1466 passed**.
  The same command on the repository's own `packages/core` gives 44 files and
  1466 passed.
- `grep -c "Effect.fnUntraced(" Evaluate.ts` is 3, and there is no `switch` in
  `ShortCircuit.ts`.

### C7. Orientation measurement — **CONFIRMED as orientation only; not the gate**

This run used `$P/harness/` on Node v22.22.0, measuring variants A (copy of
`main`), A′ (an identical copy) and V (the C6 spike), all interleaved. Other
planning agents were active on the machine.

- **In-process harness** (one run, 9 rounds × 250 ms, load 4.78 → 2.12):
  - `|A′/A − 1|` ≤ 1.4% on all 26 workloads, so `N_w` = 2% (the floor) everywhere;
  - V/A median 0.985–1.011;
  - V/A best round 0.985–1.012.
- **Paired vitest** (four runs, orders A,A2,V / V,A2,A / A2,V,A / A,V,A2, load
  1.88–2.20):
  - hz V/A median 0.982–1.008, against A′/A 0.991–1.024;
  - A's own hz spread across runs 1.6–7.2%.
- **vitest's getter warning** listed only the pre-existing
  `FieldPath.ts > compareShapes`, for all three variants. No `ShortCircuit.ts`
  export appears, which confirms that per-child calls pay no getter.
- **Caveat on the min-latency statistic.** vitest's verbose table prints `min` in
  ms to four decimals, i.e. at a resolution of **0.1 µs**. On these workloads
  (7–23 µs) one quantum is 0.4–1.4%, so per-run minimum latency, the statistic
  ARCH-13 found most stable, cannot carry a 1–2% threshold on its own. D-26-a
  therefore thresholds on harness medians and vitest hz, and reports min latency
  without gating on it.

This is the first measurement in this area where the noise band was below 2%,
whereas ARCH-13's sessions were above 10%. It says the gate is plausibly
**conclusive** on this machine today, and that V sits inside A′'s band. It is
**not** the gate: it was one session, four rather than six paired runs, run on the
spike rather than the landing code, and made before ARCH-16.

### C8. Budgets and gates the change touches — **CONFIRMED**

| Gate / budget | Where (`scripts/check-house-style.mjs`) | At `e328e75` | This plan |
| ------------- | --------------------------------------- | ------------ | --------- |
| `UNTRACED_BUDGET` / `_NAMES` | `:372-376`, `:387-389` | `{ Evaluate.ts: 3 }`, names `evaluateAllOf`/`evaluateAnyOf`/`evaluateRules` | **Unchanged.** The steppers are plain functions, never `Effect.fn`/`fnUntraced`. |
| `SWITCH_BUDGET` / `_NAMES` | `:285-310` | `{ Evaluate.ts: 1, Matcher.ts: 2 }` | **Unchanged.** Selection is an own-property `Record` read through `effectiveCombining`/`fieldStrategyLaws`, the same mechanism as ShortCircuit's existing table. No `switch`, and no per-call `Match.value`. |
| `HAS_CUSTOM_BUDGET` | `:329-341` (core/testing `src` exempt; tests are **not** exempt) | 1 entry | T2's test must not call `hasCustom`. |
| `PORT_DOUBLE_BUDGET` (test scope) | `:524-…` | — | T2 scripts its failing port with `scriptedPort(attributeResolverPort, …)` and `PortReply.fail`, never by constructing `AttributeResolveError`. |
| `no-type-assertion` (test scope), `no-non-null-assertion` | `RULES` `:116-252` | — | No `as` (only `as const`), and no `!` in T2. |
| `SCHEMA_ERROR_BUDGET`, `ANY_BUDGET`, `DECISION_READ_BUDGET` | `:449`, `:421`, `:473` | — | Not touched. |
| madge (`pnpm circular`, ADR-QD-037) | — | `ShortCircuit.ts` → `FieldLattice.ts`, `Policy.ts` (types) | Unchanged imports. |
| Stryker (`stryker.config.mjs`, `mutate: packages/core/src/**`, `ignoreStatic: true`, break 80) | — | — | The stepper bodies must be killed by `ShortCircuit.test.ts` directly (T6). No decision literal in a module-scope initializer (C10). |
| gate 13 (`node scripts/check-api-surface.mjs`) | `spec/overview.md:808` names `ShortCircuit.ts`'s exports in "Not listed above" | 4 exports | On GO, the row lists the new exports and drops the deleted ones (T9). |

### C9. The bench covers every composite the stepper touches; it has no translation workload — **CONFIRMED**

`packages/core/bench/Evaluate.bench.ts` already carries ARCH-13 T1's workloads:

- `anyOf First`/`Union` and `rules` × 3 algorithms, plus `deep rules` (`:336-341`);
- depth scaling (`:368-372`) and width scaling (`:378-382`);
- three concurrency groups (`:399-441`).

`toPredicate` has no bench. Its `run` executes once per translation, not per row
(`Predicate.ts:641-644`, ADR-QD-077), so a stepper cost there is not on a hot path
(§3).

### C10. A Stryker trap specific to this shape — **CONFIRMED by reading ADR-QD-076**

`ignoreStatic: true` skips mutants in code that runs at module load. A
factory-built stepper, `const denyOverrides = overriddenBy("Deny")`, would put the
literal `"Deny"` in a static initializer, so its mutant would be skipped and could
never be killed. Each stepper must be its own arrow with the literal inside its
body, which is what the spike does. The `Record` literal mapping algorithm to
stepper is static too, but it carries no decision of its own: a swapped row is
still caught, because the exhaustive table test reads every row through
`rulesStepper` (T6).

## 2. Goal and success criteria

**Goal.** The two interpreters must agree about *liveness*: which child ends a
walk (`ShortCircuit.ts:1-12`). Today `ShortCircuit.ts` is a shallow module. It
hands out inputs (a law, an effect), and each interpreter re-derives the decision
with its own hand-written conjunction, six copies in all (C2). The tests for the
module therefore cannot see the rule (C3).

This plan deepens it. Its interface becomes one question per composite: *given
this composite's configuration and one child's certain outcome, does the walk stop
here?* Each answer is a pure function with a closed answer, `"Stop" | "Continue"`.

- **Leverage:** both interpreters ask, and any third walker (an explainer, a
  dry-run) would ask the same question.
- **Locality:** a change to when a composite may stop, such as a fourth combining
  algorithm or a new field strategy, is one edit, and the `Record`'s TS2741 forces
  it.
- **The seam** between "what a result means" (each interpreter's *certainty
  adapter*: `trace.allowed`, or `result._tag === "True"`) and "what that does to
  the walk" (the stepper) becomes explicit. That is ADR-QD-024 held to: the
  interpreters still own their result types.
- **Testability:** the stepper is exhaustively testable on its own (2 + 6 + 12
  rows), and the agreement is stated as a direct property.

**This sits on the hottest path in the library and is Speculative, so nothing in
`src` lands unless the D-26-a gate says GO.** The tests (T1–T3) improve the
contract either way and land first.

**Success criteria:**

1. *(always)* No placeholder ids are left:
   `grep -rn "INV-QD-NEXT\|BEH-QD-NEXT" packages/core/src packages/core/test`
   prints nothing (T1).
2. *(always)* A direct agreement test exists:
   `grep -n "both interpreters stop where the stop rule says" packages/core/test/ShortCircuit.test.ts`
   finds it. It passes on `main`, and against `$P/probe.py`'s six mutants it fails
   on every one (T2, step 6).
3. *(always)* INV-QD-058's Enforcement no longer claims `ShortCircuit.test.ts`
   "pins each stop rule" without naming the agreement test:
   `grep -n "pins each stop rule" spec/invariants.md` prints nothing (T3).
4. D-26-a is `decided` with GO or DROP, with both sessions' tables in §10 (T4).
5. *(DROP)* `grep -n "stepper" spec/decisions/077-both-interpreters-read-ports-through-one-module.md`
   finds the addendum, `src` is unchanged since T3, and criteria 6–11 do not apply.
6. *(GO)* No hand-written stop conjunction is left in either interpreter:
   `grep -nE "decisiveEffect|stopsAtTrue|fold\.exhaustive|readonly exhaustive|rulesDecisiveEffect|anyOfStopsAtAllow" packages/core/src/Evaluate.ts packages/core/src/Predicate.ts`
   prints nothing. `grep -c '=== "Stop"'` gives 3 in each file.
7. *(GO)* The stepper is pure: `grep -n 'from "effect' packages/core/src/ShortCircuit.ts`
   prints nothing.
8. *(GO)* Budgets are unchanged: `git diff main -- scripts/check-house-style.mjs`
   is empty; `grep -c "Effect.fnUntraced(" packages/core/src/Evaluate.ts` = 3;
   `grep -c "switch (" packages/core/src/ShortCircuit.ts` = 0;
   `node scripts/check-house-style.mjs` passes.
9. *(GO)* `ShortCircuit.test.ts`'s stepper tables are exhaustive (every row of
   `allOfStep`, `anyOfStepper` × 3 strategies × 2 + prototype keys, and
   `rulesStepper` × 3 algorithms × 2 effects × 2 + prototype keys). Stryker on
   `ShortCircuit.ts` leaves **0 survivors**, and there are no new survivors on the
   changed line ranges of `Evaluate.ts`/`Predicate.ts` against a same-day baseline
   (T10).
10. *(GO)* The confirmation bench on the landed code (T8) meets D-26-a's GO
    conditions, and its numbers are in the ADR-QD-077 amendment.
11. `pnpm check` is green (T11). On GO, gate 13 passes with `spec/overview.md:808`'s
    row updated.

## 3. Non-goals

- **The schedule.** No shared loop, driver, `Effect.forEach` wrapper or
  `failCause` helper. That is exactly what ARCH-13 measured and ADR-QD-073 Rev 1.3
  dropped; reopening it needs what that addendum lists, and this plan supplies none
  of it.
- **The folds.** `stepAllOf`/`finishAllOf`, `stepAnyOf`/`finishAnyOf` and
  `evaluateRules`'s accumulator stay where they are. Field merging, obligation
  union and the deciding-row bookkeeping are not stop decisions.
- **Changing any decision, trace, error, port-call sequence or span.** Every
  existing test must pass unchanged (D-26-a disqualifier D3).
- **Benchmarking `toPredicate`.** Translation runs once per query (C9). Its
  correctness is the agreement test's job, not the gate's.
- **A stored baseline or a bench merge gate.** ADR-QD-034 and ADR-QD-073 rejected
  both. The gate is a reviewer's measurement, recorded in an ADR.
- **`Not`/`Labeled`/`Obliged`.** These are single-child wrappers with no stop
  decision.
- **Three-valued translation semantics.** A row-dependent child is "not certain"
  and continues the walk, exactly as today (INV-QD-058 (3)'s superset of port
  calls on resource trees is by design).

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 | `import type { AnyOfStepper, RulesStepper, Step } from "./ShortCircuit.ts"` wherever only types are used (`verbatimModuleSyntax`), with `.ts` specifiers. |
| AGENTS.md §5, ADR-QD-073 (incl. Rev 1.3), `UNTRACED_BUDGET` | The three dispatchers keep `Effect.fnUntraced` and their names; no fourth site; the stepper is not effectful. §5's sentence "A shared child-walk driver … was measured and rejected" stays true and is not contradicted: this is not a driver. |
| AGENTS.md §5a, ADR-QD-034, `SWITCH_BUDGET` | No `switch`, and no per-call `Match.value` (§5a: 3.5–7.7× a switch per dispatch). Selection is a module-scope own-property `Record` read through `effectiveCombining` (rules) or `fieldStrategyLaws(…).decidedByFirst` (anyOf), once per node. |
| AGENTS.md §6 | No `as`/`!`/`any`. Unused imports fail `noUnusedLocals` (`RuleEffect` in `Evaluate.ts`, C6). |
| AGENTS.md §9 | `ShortCircuit.ts` stays out of the barrel. Its exports stay reachable via `./*` (`packages/core/package.json:28`), so gate 13's "Not listed above" row changes with them (T9), and a removed export is a subpath-only breaking change for the changeset (D-26-d). |
| AGENTS.md §10 | Core is held at 95% coverage. Every stepper arm is reached by T6's table; the consumers' `=== "Stop"` branches by existing suites. |
| AGENTS.md §11/§12/§15 | INV-QD-005/017/058 Source and Enforcement, BEH-QD-035/265, `05-evaluator.md:79`, traceability §1/§4, overview row, CCR and ADR amendment change with the code (T3, T9). No new `typescript` fence is required. |
| ADR-QD-024 | The interpreters are not merged. Each keeps its certainty adapter (`trace.allowed` vs a constant `Predicate` tag); the stepper never sees a `Trace` or a `Predicate`. |
| ADR-QD-091 | The answer is a closed string-literal union, the way `Verdict` is ("costs what a boolean does"). A per-child imported call is made through a **module-local binding** (`const allOfStepLocal = allOfStep`, as in `Matcher.ts:563-577` and `Predicate.ts:118-128`), or through a stepper selected once per node into a local. |
| ADR-QD-013, INV-QD-005 | `allOf` stops at the first certain denial under every strategy; `anyOf` stops at the first certain allow only when `decidedByFirst`. |
| ADR-QD-023, INV-QD-017 | A rules walk stops at the first certainly-applying rule under `FirstApplicable`, and at the first certainly-applying rule of the decisive effect under the overrides. The deciding row is still recorded by index in the fold. |
| ADR-QD-026, INV-QD-020 | The concurrent branches are untouched. They call the same fold, so the same stepper, over exits in index order. |
| ADR-QD-092 | `anyOfStepper` on a strategy outside the union returns the never-stop stepper (sees more, never less). `rulesStepper` outside the union walks as `DenyOverrides`. Both are pinned with the prototype keys `ShortCircuit.test.ts` already uses. |
| ADR-QD-025/076 (Stryker, `ignoreStatic`) | One arrow per stepper, with the literals inside the body (C10). No `overriddenBy("Deny")` factory. |
| ADR-QD-037 (madge, `pnpm circular`) | `ShortCircuit.ts` imports stay `FieldLattice.ts` + `Policy.ts` types. |
| ADR-QD-051 | No span. The observability suite is unchanged. |
| User preferences (closed unions, no `Record<string, unknown>`) | `Step` is a closed two-member union, and the tables are `Record<Combining, RulesStepper>`, keyed by the closed union, never widened. |

**Overlap with other wave-3 plans.**

| Plan | Shared file / symbol | Interplay and order |
| ---- | -------------------- | ------------------- |
| ARCH-16 (question/walk split in `evaluate`, single sink emit) | `Evaluate.ts`: `evaluateNode`, the three dispatchers, possibly their module | **ARCH-16 first** (D-26-f). The gate must measure the code it lands on, and ARCH-16 may move the dispatchers (and with them `UNTRACED_BUDGET`'s file key, which is ARCH-16's edit, not this plan's). ARCH-26's evaluator edit is about 10 lines inside the three folds and re-applies trivially after any move. T1–T3 do not touch `Evaluate.ts` and land independently. |
| ARCH-17 (case-wise policy fold) | `Predicate.ts`: `compileNode` builds the `Plan` (`:511-555`), `Plan` (`:320-337`) | D-26-e changes one `Plan` field (`Disjunction.stopsAtTrue` → `step`) and adds one (`RuleTable.step`). If ARCH-17 reshapes `compileNode`, land ARCH-26's code after it and carry the field change over. Otherwise either order works. |
| ARCH-29 (loose ends, including the `./*` subpath export) | `packages/core/package.json:28` | If ARCH-29 closes `./*`, removing `anyOfStopsAtAllow`/`rulesDecisiveEffect` (D-26-d) stops being a subpath-breaking change, and the changeset note shrinks to "internal". |
| ARCH-22 (Explanation × Trace alignment) | `Explanation.ts` reads `isCombining`/`effectiveCombining` (`:26`, `:425-426`) | Untouched by this plan: neither export changes. |

## 5. Decisions needed before work starts

### D-26-a — The benchmark gate: method, conclusiveness, and the numeric GO/DROP rule

T4 runs whichever option is chosen. Options:

| Option | Rule | For | Against |
| ------ | ---- | --- | ------- |
| **A. ARCH-13's protocol, tightened to the effect size** | See below. | Same workloads, same two methods and same interleaving as D-13-a, so the result is comparable to the ADR-QD-073 addendum. The noise band and DROP threshold are sized for an expected sub-1% effect. Keeps "inconclusive twice → DROP". | Needs a quieter machine than ARCH-13 had. C7 suggests this one is quiet enough today. |
| B. D-13-a unchanged (`N_w ≤ 10%` conclusive, HARD at 5%) | ARCH-13's thresholds verbatim. | Zero new rules. | Too coarse. A 4% loss on every composite workload would pass, and the stepper buys locality, not speed, so a 4% loss is not acceptable. |
| C. Harness only | Live ESM bindings only. | Measures what a built consumer runs. | `pnpm bench` is the repo's tool and what ADR-QD-073/091 used. ADR-QD-091 shows the vitest-only cost is real to a developer running it. |
| D. No gate ("it is pure") | — | Cheapest. | The review made it benchmark-gated. ADR-QD-091 measured a pure cross-module call at 2.4× per leaf under vitest. AGENTS.md §5/§5a's discipline is "a benchmark first" on this path. Rejected. |

**Option A in full.**

- **Variants.** All are copies of `packages/core/src` taken from the gate commit, in
  a scratch directory with `node_modules → packages/core/node_modules`. Nothing is
  created in the repository.
  - **A**: the gate commit.
  - **A′**: a byte-identical copy, the noise control.
  - **V**: the change exactly as T6–T7 will land it, generated by a refreshed
    `$P/spike/apply.py`.
  - **Vi**: measurement only. V with the steppers inlined as module-local
    functions in `Evaluate.ts`. Built only if vitest's "module export getters"
    warning lists a `ShortCircuit.ts` export for V. It separates the getter
    artefact from real cost, as S2i did.
- **Workloads: the 26 of ARCH-13's harness** (`$P/harness/workloads.ts`), built
  from each variant's own modules:
  - `one node`, `wide — allOf of 8`, `deep — 10 levels`, `wrapper-heavy`,
    `matcher-heavy`, `field-heavy Intersection`, `field-heavy Union`,
    `obligation-heavy`, `resolver miss`;
  - `anyOf First 8`, `anyOf Union 8`, `rules FirstApplicable 8`,
    `rules DenyOverrides 8`, `rules PermitOverrides 8`, `deep rules 10`;
  - `depth 5/10/20/40` and `width 4/8/16/32`;
  - `conc allOf 8`, `conc anyOf Union 8` and `conc rules DenyOverrides 8`.

  **Controls:** `one node`, `resolver miss` and `wrapper-heavy` reach no composite,
  so no stepper code runs in them. The other 23 are the **composite** workloads.
- **Methods** (both, interleaved, in one process per run):
  - **M1, the in-process harness.** `node --experimental-strip-types --no-warnings harness.mts`,
    9 rounds × 250 ms. The variant order rotates every round and reverses on odd
    rounds. It uses live ESM bindings, so no getter is involved.
  - **M2, paired vitest.** `Paired.bench.ts`: one `bench.compare` per workload over
    all variants, `time: 300`, `warmupTime: 100`. Run it with the
    `@effect/vitest`-peer vitest binary, rotating the order across runs and
    reversing it on even runs.
- **Session.** One session is 6 M2 runs plus 2 M1 runs (after M2 runs 3 and 6), as
  in ARCH-13's `session.sh`. Record `uptime` before and after each run, plus
  `node --version`, the CPU model and `git rev-parse HEAD`. Run nothing else on
  the machine: no tests, Stryker, builds or other agents. Start only when the
  1-minute load average is below 4. That is advisory; the binding test is the
  noise band. Two sessions, at least one hour apart.
- **Statistics, per workload `w`, per session:**
  - `h_w = median ops/s(V) / median ops/s(A)` (M1, rounds pooled across the
    session's two runs; > 1 means V is faster);
  - `N_w = max(|median(A′)/median(A) − 1|, 0.02)` (M1);
  - `v_w = median over runs of hz(V) / median over runs of hz(A)` (M2);
  - `S′_w = max(|median hz(A′)/median hz(A) − 1|, 0.02)` (M2);
  - `c_w` = the number of the 6 M2 runs in which `hz(V) < 0.99 · hz(A)`;
  - `m_w` = the median over runs of `min(A)/min(V)` (M2 per-run minimum latency).
    It is reported but not gated on, because of its 0.1 µs resolution (C7).
- **A session is conclusive** when all three of these hold:
  - `N_w ≤ 0.05` and `S′_w ≤ 0.05` on all 26 workloads;
  - every control satisfies `|h_w − 1| ≤ N_w` and `|v_w − 1| ≤ S′_w`;
  - the run took place on a quiet machine.

  If V moves a workload that does not run its code, the session is biased.
- **GO** requires two conclusive sessions in which **every composite workload**
  satisfies all of:
  - **G1** `h_w ≥ 1 − N_w`;
  - **G2** `v_w ≥ 1 − S′_w`;
  - **G3** `c_w ≤ 4`, so V is not consistently ≥ 1% slower in 5 or more of 6 runs;
  - **G4** depth slope: `h_depth40 / h_depth5 ≥ 0.98`.
- **DROP** if any of these holds (all numeric):
  - **D1 (cost):** in both conclusive sessions, some composite workload has
    `h_w < 0.97` **and** `v_w < 0.97`. That is ≥ 3% slower by both methods, the
    same "both methods agree" shape as D-13-a's HARD rule.
  - **D2 (noise):** two consecutive inconclusive sessions. The burden of proof is
    on the change, exactly as D-13-a.
  - **D3 (behavior):** V needs any existing test edited, or changes any test
    outcome. This disqualifies it outright.
  - **D4 (no verdict):** three conclusive sessions that are neither GO nor D1. A
    small loss that keeps reappearing is not "costs nothing".
- **The getter clause.** Suppose G2 fails while G1 holds and the warning lists a
  `ShortCircuit.ts` export. Then the vitest loss is the module-runner artefact
  ADR-QD-091 diagnosed. Measure Vi in the same session:
  - if Vi passes G2, move V's offending call site onto a module-local binding (the
    landing code gets it too) and re-run the session;
  - if Vi fails G2, the cost is real, and D1 is judged on V's numbers.
- **Why 3%.** Three reasons:
  - it is the smallest loss this protocol can resolve: `N_w`'s 2% floor, plus one
    step;
  - it is far below every cost ARCH-13 found (14–26% concurrent, up to 15%
    sequential under vitest);
  - the change buys locality, not speed, so any loss the protocol can see is
    enough to refuse it.

**Recommendation: A.** `status: decided (2026-10-07, A — gate run: two A/A sessions at load 63-126, 23 and 14 of 26 workloads above 5% (max 57%); D2, DROP)`

### D-26-b — The stepper's shape

| Option | Interface | For | Against |
| ------ | --------- | --- | ------- |
| **(i) Per composite, selected once per node, closed answer** | `type Step = "Stop" \| "Continue"`; `allOfStep(certainlyDenies: boolean): Step`; `anyOfStepper(strategy): AnyOfStepper` with `AnyOfStepper = (certainlyAllows: boolean) => Step`; `rulesStepper(combining): RulesStepper` with `RulesStepper = (effect: RuleEffect, certainlyApplies: boolean) => Step` | No allocation: steppers are module-scope arrows chosen by table. Selection replaces today's per-node lookups one for one, and per-child calls go through a local. The answer reads at the call site (`=== "Stop"`). C6 and C7 measured exactly this. | Three selectors rather than one. |
| (ii) Uncurried booleans | `rulesStops(decisive, effect, applies): boolean`, `anyOfStops(decidedByFirst, allows): boolean` | Smallest diff. | Callers keep reading `rulesDecisiveEffect`/`anyOfStopsAtAllow` per node and pass lookups back in, so the module still hands out inputs. A boolean named "stops" is the vocabulary that hid C3. |
| (iii) One generic stepper over `policyTag` | `stepperFor(policy): (child) => Step` | One entry point. | It needs to know about `Trace`/`Predicate` (breaks ADR-QD-024's separation), or an `unknown` child, which is widening. It dispatches on a tag per node: `Match.value` per call, or a `switch` (SWITCH_BUDGET). |
| (iv) Tagged `Step` objects | `{ _tag: "Stop" }` constants | Matches the ADT style. | No information beyond the literal, a property load per child, and ADR-QD-091 already chose string literals for the same reason. |

Two further points apply to option (i):

- **Two-valued, not three.** Each interpreter's certainty adapter maps its own
  result to a boolean "certainly X". The evaluator passes `trace.allowed` (or
  `!trace.allowed` for `allOf`). The translator passes `result._tag === "True"`
  (or `"False"`), so a row-dependent predicate maps to `false` and the walk
  continues. A three-valued `Certainty` input would make the evaluator, which
  never has a third value, map on every child for nothing.
- **The rules call site.** The evaluator consults the stepper before its
  bookkeeping, not inside the `allowed` branch:
  `const stops = stepRule(rule.effect, trace.allowed) === "Stop"`; then, if
  `trace.allowed`, record `firstApplying ??= applied`, and if `stops`, set
  `firstDecisive = applied`; return `stops`. Under `FirstApplicable` the first
  `Stop` is the first applying row, so setting `firstDecisive` there is equivalent
  to today's `decidingRule = firstDecisive ?? firstApplying` (checked by the whole
  suite in C6).

**Recommendation: (i).** `status: decided (2026-10-07, (i) — moot on DROP, not built)`

### D-26-c — Scope: all three composites, or only the two with a rule

- **(a) All three**, including `allOf`'s one-line `allOfStep`. The interface covers
  every composite. "`allOf` needs no function" stops being a sentence a reader
  must find. A future strategy-dependent `allOf` stop is one edit. Cost: one call
  per `allOf` child, through a module-local binding (measured in C7: `wide`,
  `width 4–32`, `depth *` all inside A′'s band).
- (b) `anyOf` and `rules` only. Smaller. `allOf`'s `!trace.allowed`/`=== "False"`
  stays hand-written in both interpreters: two of the six sites remain.

**Recommendation: (a).** It is the complete version of the interface, and the
gate measures it. `status: decided (2026-10-07, (a) — moot on DROP, not built)`

### D-26-d — What happens to `anyOfStopsAtAllow` and `rulesDecisiveEffect`

- **(a) Replace.** After T7 neither has a `src` consumer, so delete
  `rulesDecisiveEffect`. `anyOfStepper` reads `fieldStrategyLaws(strategy).decidedByFirst`
  directly, and `anyOfStopsAtAllow` is deleted as well. Their `ShortCircuit.test.ts`
  rows move into the stepper tables, with the same prototype-key values.
  - **Docs to update:** `05-evaluator.md:79`, `FieldLattice.ts:9,22,222`,
    `Policy.ts:59` and `spec/overview.md:808`.
  - **Changeset:** both are reachable as `@qadi/core/ShortCircuit`, so the
    changeset says "Breaking, for `@qadi/core/ShortCircuit` subpath imports only",
    the precedent `packages/audit/CHANGELOG.md:91` set.
- (b) Keep both as exports beside the steppers. This is layering: two answers to
  one question, and the old pair is the vocabulary that hid C3.
- (c) Keep them, but unexported. Same as (a) for callers, and leaves dead
  indirection.

**Recommendation: (a).** If ARCH-29 closes `./*` first, the breaking note becomes
"internal". `status: decided (2026-10-07, (a) — moot on DROP; ARCH-29 already closed `./*`)`

### D-26-e — Where translation selects its stepper

- **(a) At `compile`, stored in the `Plan`.** `Disjunction.stopsAtTrue: boolean`
  becomes `step: AnyOfStepper` (`:331`, `:523`), and `RuleTable` gains
  `step: RulesStepper` beside `combining` (`:335-337`, `:554`). This is the same
  place `stopsAtTrue` is computed today, and `run` reads nothing from
  `ShortCircuit.ts` itself. `Plan` is internal and never serialized or compared,
  so carrying a function is harmless.
- (b) At `run`: call `rulesStepper(p.combining)`/`anyOfStepper(…)` in each arm,
  where `rulesDecisiveEffect` is called today (`:689`). `Disjunction` would then
  need the strategy instead of `stopsAtTrue`.

**Recommendation: (a)**, coordinated with ARCH-17 (§4 overlap). `status: decided (2026-10-07, (a) — moot on DROP)`

### D-26-f — Sequencing with ARCH-16 and ARCH-17

- **(a) T1–T3 now. Gate (T4) and code (T6–T10) after ARCH-16 merges, and after
  ARCH-17 if it reshapes `compileNode`.** The gate's verdict is only valid for the
  code it measured. ARCH-16 is the larger restructuring of `Evaluate.ts`, and this
  plan's evaluator edit is small enough to carry over.
- (b) Gate and code now, with ARCH-16 rebasing over them. This measures today's
  code, which ARCH-16 then changes, so T8's confirmation run must be repeated
  after ARCH-16 anyway.

**Recommendation: (a).** `status: decided (2026-10-07, (a) — ARCH-16/17/22 landed first)`

### D-26-g — The eight translator-only stop examples once T2 lands

`Predicate.test.ts:1546-1644` ("BEH-QD-NEXT-b: translation stops where the
evaluator stops") holds eight flat-composite examples. They assert only the
translator's resolver call count. T2's enumeration covers every one of their
shapes, both portless constants (roles) and a failing port, and asserts **both**
interpreters at once.

- **(a) Delete the eight.** Their BEH-QD-265 id moves to T2's test name. This is
  replace, not layer.
- (b) Keep them as readable examples.

**Recommendation: (a).** Keep `Rules.test.ts`'s INV-QD-017 block (`:167-263`):
it also asserts trace `children` and deciding rows, which T2 does not.
`status: decided (2026-10-07, (a) — the eight examples deleted)`

### D-26-h — Where a DROP is recorded

- **(a) An addendum to ADR-QD-077**, the ADR that gave `ShortCircuit.ts` its job,
  plus one sentence in `ShortCircuit.ts`'s module comment. Those are where the
  next person to propose this will be reading. Also add one cross-reference line
  under ADR-QD-073's Rev 1.3 addendum, so the driver and stepper records find each
  other.
- (b) An addendum to ADR-QD-073 plus an AGENTS.md §5 sentence, as ARCH-13 did.
  §5 is about `fnUntraced`, and a stepper is not an `fnUntraced` question.

**Recommendation: (a).** `status: decided (2026-10-07, (a) — ADR-QD-077 addendum + ADR-QD-073 cross-reference + ShortCircuit.ts comment)`

## 6. Tasks

Phases:

- **0** = always lands, whatever the gate says: T0–T3.
- **G** = the gate: T4, then T5 on DROP.
- **B** = GO only: T6–T10.
- **D** = T11, T12, on every outcome.

On DROP, T6–T10 are `[-] dropped`.

### T0 — Re-baseline on a fresh branch and re-run the §1 probes
- **Status:** [x] done
- **Depends on:** —
- **Files:** none in the repository. Probes go under the session scratchpad
  (`$P` = `…/scratchpad/arch26/`), never under `packages/`.
- **Steps:**
  1. `git switch -c arch/26-short-circuit-stepper main`. Record `git rev-parse HEAD`.
     If `Evaluate.ts`/`Predicate.ts`/`ShortCircuit.ts` changed since `e328e75`
     (`git diff e328e75 -- packages/core/src/{Evaluate,Predicate,ShortCircuit}.ts`),
     re-derive C2's line table first.
  2. Re-copy `packages/core/{src,test,vitest.config.ts,package.json}` to `$P/core/`,
     symlink `node_modules`, and recreate `$P/core/tsconfig.json` (extends the
     repo's `tsconfig.base.json`, `include: ["src/**/*.ts"]`).
  3. Re-run `python3 -I $P/probe.py`. Each of M1–M6 must still be killed by the
     walk-equality property and survived by `ShortCircuit.test.ts` (C3). If an
     anchor string moved, update it in `probe.py`.
  4. Re-run C4's grep (expect 13 lines), and C8's
     `grep -c "Effect.fnUntraced(" packages/core/src/Evaluate.ts` (expect 3).
- **Tests:** none.
- **Verify:** the commands above; `pnpm vitest run packages/core/test/ShortCircuit.test.ts packages/core/test/Predicate.test.ts`.
- **Done when:** §1's claims re-hold at the new HEAD, or the deltas are recorded in §10.

### T1 — Replace the thirteen `-NEXT` placeholders with their assigned ids (C4)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/core/src/Predicate.ts`, `packages/core/test/Predicate.test.ts`
- **Steps:**
  1. `Predicate.ts:629`: `INV-QD-NEXT` → `INV-QD-058`. `Predicate.ts:750`:
     `BEH-QD-NEXT-c` → `BEH-QD-266`.
  2. `Predicate.test.ts`:
     - `:1060`, `:1204`, `:1240`, `:1284`: `INV-QD-NEXT` → `INV-QD-058`;
     - `:1351`: `BEH-QD-NEXT-a` → `BEH-QD-264`;
     - `:1436`, `:1441`: `BEH-QD-NEXT-d` → `BEH-QD-267`;
     - `:1541`, `:1546`: `BEH-QD-NEXT-b` → `BEH-QD-265`;
     - `:1542`, `:1646`: `BEH-QD-NEXT-c` → `BEH-QD-266`.

     Change comments and `describe` names only.
  3. Check that the mapping matches the spec headings
     (`grep -n "^## BEH-QD-26[4-7]" spec/behaviors/16-predicates.md spec/behaviors/30-port-calls.md`).
- **Tests:** none new. The renamed `describe`s still pass.
- **Verify:** `grep -rn "INV-QD-NEXT\|BEH-QD-NEXT" packages/core/src packages/core/test` prints nothing; `pnpm vitest run packages/core/test/Predicate.test.ts`.
- **Done when:** criterion 1 holds. This can ship alone (one commit, no changeset: no published behavior changes).

### T2 — State the agreement directly: both interpreters stop at the child the stop rule names
- **Status:** [x] done
- **Depends on:** T0. The deletion in step 5 depends on D-26-g.
- **Files:** `packages/core/test/ShortCircuit.test.ts`; `packages/core/test/Predicate.test.ts` (step 5 only)
- **Steps:**
  1. **Oracle, written from the spec, not from `ShortCircuit.ts`.** Add a
     test-local `expectedStop`. Given a composite kind and its configuration, it
     walks a list of leaf outcomes, each one of `Holds | NotHeld | Fails`, plus an
     `effect` for each rule row. At each index it does one of three things:
     - a `Fails` leaf ends the walk as `Failed(i)`;
     - a stop ends the walk as `Stopped(i)`. The stop rules come straight from the
       spec tables, which are ADR-QD-013 for allOf and anyOf and INV-QD-017's table
       for rules:
       - allOf: on `NotHeld`;
       - anyOf `First`: on `Holds`;
       - anyOf `Union`/`Intersection`: never;
       - rules `FirstApplicable`: on `Holds`;
       - rules `DenyOverrides`: on `Holds` of a `Deny` row;
       - rules `PermitOverrides`: on `Holds` of a `Permit` row.
     - anything else continues, and a list that runs out ends as `Exhausted`.

     Do not call `anyOfStopsAtAllow`, `rulesDecisiveEffect` or (later) the
     steppers here. The oracle is the spec, and the code is under test.
  2. **Leaf alphabet**, observable in both interpreters:
     - `Holds`/`NotHeld` as a **constant**: `hasRole("editor")`/`hasRole("admin")`
       on a subject with roles `["editor"]` (portless, and folded to `Constant` by
       `compile`);
     - `Holds`/`NotHeld` via a port: `hasAttribute("a<i>", M.eq(true))`, with the
       resolver answering `true`/`false`;
     - `Fails`: the same attribute answering `PortReply.fail("down")`.

     Attribute names `a0…a7` are distinct and absent from the subject's
     attributes, so every port leaf is asked through the resolver (subject-first
     lookup, ADR-QD-077). The resolver is
     `scriptedPort(attributeResolverPort, (_id, attribute) => { log.push(attribute); return reply[attribute] })`
     (PORT_DOUBLE_BUDGET: no hand-built error).
  3. **What is asserted, per case:**
     - **evaluator:** run `evaluate(policy)` sequentially. Assert that the
       resolver log equals the oracle's prefix of port leaves (up to and including
       the stop or failure index). On `Stopped(i)`/`Exhausted`, assert
       `decision.trace.children.length === i + 1` (or `n`); on `Failed(i)`, assert
       the failure is `AttributeResolveError` for `a<i>`.
     - **translator:** run `toPredicate(policy)`. Assert the same log prefix and
       the same failure.

     Port logs, trace children and failure identity together make every index
     observable, including a portless constant that stops the walk (the shape
     BEH-QD-265's examples use).
  4. **Two tests**, under `describe("both interpreters stop where the stop rule says (INV-QD-005, INV-QD-017, INV-QD-058, BEH-QD-265)")`:
     - `"every composite of up to three children, enumerated"`: an exhaustive
       product over n ∈ 0..3 leaves × 5 leaf kinds, for allOf, anyOf × 3
       strategies, and rules × 3 algorithms × {Permit, Deny} per row. That is
       156 + 468 + 3 333 ≈ 4 000 cases, each two `runSync`-sized evaluations.
       Measure its time. If it exceeds 5 s, give it the explicit 60 s budget the
       `e9c7afc` convention uses rather than shrinking it silently, and note it in
       §10.
     - `"PROPERTY: up to eight children, generated"`: `FastCheck.assert`
       (shrinking, seeded, `numRuns: 300`) over n ∈ 0..8 with the same alphabet.
       It names the counterexample's composite, configuration and leaf list.
  5. Under D-26-g(a): delete the eight `BEH-QD-265` examples
     (`Predicate.test.ts:1546-1644` after T1's rename). Keep their
     `failingResolver` helper only if another test still uses it. Move the
     describe's first comment line ("Translation asks no port a constant has
     already decided") onto the new describe.
  6. **Prove it kills the stop mutants.** Extend `$P/probe.py` with the two new
     tests as a test set, re-run, and record in §10 that M1–M6 are each killed
     by them.
- **Tests:** the two above.
- **Verify:** `pnpm vitest run packages/core/test/ShortCircuit.test.ts packages/core/test/Predicate.test.ts`; `node scripts/check-house-style.mjs` (no `as`, `!` or `hasCustom`, and no hand-built port error); `python3 -I $P/probe.py`.
- **Done when:** criterion 2 holds and §10 records the probe table.

### T3 — Spec for Phase 0: INV-QD-058's Enforcement says what pins what
- **Status:** [x] done
- **Depends on:** T1, T2
- **Files:** `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`
- **Steps:**
  1. Rewrite INV-QD-058's Enforcement (`spec/invariants.md:2312-2318`). Replace
     "`ShortCircuit.test.ts` pins each stop rule" with: "`ShortCircuit.test.ts`
     pins each lookup, and its 'both interpreters stop where the stop rule says'
     tests pin the agreement directly — every flat composite of up to three
     children enumerated, and up to eight generated — against an oracle written
     from ADR-QD-013 and INV-QD-017's table".
  2. Bump the document control (Rev 1.56) and add a Change History line.
  3. Traceability §4 (`:269`): the `ShortCircuit.test.ts` row already lists
     BEH-QD-265, INV-QD-005, INV-QD-017 and INV-QD-058; leave it as it is. Under
     D-26-g(a), check that `Predicate.test.ts`'s row (`:267`) still carries
     BEH-QD-265 through the surviving walk-equality property, or drop it from that
     row. Rev bump.
  4. Add a CCR-QD-NEXT row to `spec/README.md`, covering C3, C4 and the Phase 0
     tests.
- **Tests:** —
- **Verify:** `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims`
- **Done when:** criterion 3 holds. T1–T3 are one PR, landable whatever the gate decides.

### T4 — GATE: two measurement sessions and the GO/DROP decision
- **Status:** [x] done
- **Depends on:** T0, D-26-a, D-26-b, D-26-c, D-26-f (after ARCH-16, and after ARCH-17 if it reshapes `compileNode`)
- **Files:** none in the repository. Variants, harness and outputs go in `$P/gate/`.
- **Steps:**
  1. **Build the variants** in `$P/gate/`:
     - `A/src` and `A2/src` as copies of `packages/core/src` at the gate commit;
     - `V/src` from `A/src` via a refreshed `$P/spike/apply.py`, matching D-26-b,
       c, d and e exactly (including the deletions of D-26-d and the module-local
       `allOfStepLocal`);
     - `node_modules → packages/core/node_modules`;
     - copy `harness.mts`, `workloads.ts`, `Paired.bench.ts`, `session.sh` and
       `analyze.py` from `$P/harness/`;
     - point `session.sh` at `$P/gate`, set `ALL=(A A2 V)`, and in the harness
       line use `VARIANTS=A,A2,V`.
  2. **Disqualifier D3:** run `tsc -p` over V (0 errors), then the whole core suite
     against V with its **unchanged** tests (`cd $P/gate/V/.. && node $V run`, test
     dir copied alongside). Every test must pass, and the count must equal A's.
  3. **Session 1:** `zsh session.sh s1`. Then
     `python3 -I analyze.py s1 > s1/analysis.txt`, adapted to variants `A2`/`V`
     and to D-26-a's statistics (`h_w`, `N_w`, `v_w`, `S′_w`, `c_w`, `m_w`). Check
     the paired outputs for getter warnings
     (`grep -h "^  - " s1/paired-*.txt | sort | uniq -c`). If a `ShortCircuit.ts`
     export appears, apply D-26-a's getter clause (build `Vi`).
  4. **Session 2**, at least one hour later: `zsh session.sh s2`, and analyze it
     the same way.
  5. Apply D-26-a: conclusive? GO, DROP (D1, D2 or D4) or a third session.
  6. Record the outcome:
     - in D-26-a's `status: decided (<date>, GO|DROP — <one line>)`;
     - in §10, with both sessions' tables (per workload: `N_w`, `h_w`, `S′_w`,
       `v_w`, `c_w`, `m_w`), the load averages, Node version, CPU and HEAD;
     - in the plan's `status:` (`ready` on GO once D-26-d, e, g and h are decided;
       `dropped` on DROP).
- **Tests:** the core suite against V, unchanged.
- **Verify:** `ls $P/gate/s1/DONE $P/gate/s2/DONE`; §10 holds both tables.
- **Done when:** D-26-a is decided with numbers (criterion 4).

### T5 — DROP outcome: record the measured rejection
- **Status:** [x] done
- **Depends on:** T4 = DROP, D-26-h
- **Files:** `spec/decisions/077-both-interpreters-read-ports-through-one-module.md`, `spec/decisions/073-the-fnuntraced-exception-is-measured.md` (one line), `packages/core/src/ShortCircuit.ts` (module comment only), `spec/README.md`
- **Steps:**
  1. Add an ADR-QD-077 addendum: `> **Addendum <date> (CCR-QD-NEXT) — a pure short-circuit stepper both interpreters would call was measured and not adopted.**`
     Give:
     - what was proposed (D-26-b's interface);
     - how it differs from ADR-QD-073 Rev 1.3's driver (C5's table);
     - the method, both sessions' tables, the load, and which rule decided (D1,
       D2 or D4) on which workloads;
     - what would justify reopening it: a measurement meeting D-26-a's GO
       conditions on a newer Effect or Node release, or a fourth combining
       algorithm or field strategy (a third and fourth hand-written conjunction).

     Bump the ADR to Rev 1.1, with a Change History line.
  2. ADR-QD-073: one line under the Rev 1.3 addendum, "A narrower proposal, a pure
     stop stepper with no schedule, was measured separately: ADR-QD-077 addendum
     <date>." No revision bump beyond what the change-history convention requires.
  3. `ShortCircuit.ts` module comment: one sentence after `:12`, saying that a
     shared stepper deciding the stop itself was measured and not adopted
     (ADR-QD-077 addendum), and that the conjunctions stay in the interpreters,
     pinned by the agreement tests (T2).
  4. Add a CCR-QD-NEXT row.
- **Tests:** —
- **Verify:** `node scripts/check-house-style.mjs` (budgets unchanged); `pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims`; `git diff main -- packages/core/src | grep -v '^[-+] \*'` shows comment lines only.
- **Done when:** criterion 5 holds. T6–T10 are `[-] dropped`.

### T6 — GO: the stepper in `ShortCircuit.ts`, test-first and exhaustive
- **Status:** [-] dropped (D-26-a verdict DROP, 2026-10-07)
- **Depends on:** T4 = GO, D-26-b, D-26-c, D-26-d
- **Files:** `packages/core/test/ShortCircuit.test.ts` (written first), `packages/core/src/ShortCircuit.ts`
- **Steps:**
  1. **Test first.** Replace the `anyOfStopsAtAllow` describe (`:17-30`) and the
     first two tests of the `rulesDecisiveEffect` describe (`:33-40`). In the
     prototype-key test (`:42-48`), keep its `effectiveCombining` assertion and
     drop the `rulesDecisiveEffect` one. Keep the `isCombining` and "known value"
     tests (`:50-68`), and rename the describe to `effectiveCombining and
     isCombining`. Add exhaustive tables:
     - `allOfStep(true) === "Stop"`, `allOfStep(false) === "Continue"`;
     - for each of `First`/`Intersection`/`Union`: `anyOfStepper(s)(true)` and
       `(false)`. Only `First`/`true` stops.
     - every `BOGUS_VALUES` strategy never stops;
     - for each algorithm × `Permit`/`Deny` × `true`/`false`: `rulesStepper(c)(e, a)`
       against the same spec table as T2's oracle (12 rows);
     - every `BOGUS_VALUES` combining stops exactly where `DenyOverrides` does
       (4 rows each);
     - `rulesStepper(c)` returns the same function object for the same `c` (no
       per-call allocation, D-26-b).

     Run it and watch it fail on the missing exports.
  2. **Implement**, as in C6's spike, with doc comments following the AGENTS.md
     shape:
     - `export type Step = "Stop" | "Continue"`;
     - `allOfStep`;
     - `AnyOfStepper` with two module-scope arrows, `stopsAtAllow` and
       `seesEveryChild`. `anyOfStepper(strategy)` reads
       `fieldStrategyLaws(strategy).decidedByFirst`.
     - `RulesStepper` with three module-scope arrows, `firstApplicable`,
       `denyOverrides` and `permitOverrides`, each with its literal **inside** the
       body (C10);
     - `const RULES_STEPPER: Record<Combining, RulesStepper>`;
     - `rulesStepper(combining) = RULES_STEPPER[effectiveCombining(combining)]`.
  3. Under D-26-d(a), delete `anyOfStopsAtAllow` and `rulesDecisiveEffect` (and
     `DECISIVE_EFFECT_BY_COMBINING` if `isCombining` can read `RULES_STEPPER`'s
     keys instead; it must stay `Object.hasOwn`-guarded).
  4. Rewrite the module comment's first paragraph. The module now answers "does
     this child stop the walk", and the interpreters each supply only what
     "certain" means for their own result (ADR-QD-024).
- **Tests:** the tables above. T2's agreement tests are unchanged.
- **Verify:** `pnpm vitest run packages/core/test/ShortCircuit.test.ts` (the interpreters still compile only if T7 lands in the same commit; develop with the test file alone, then commit T6 and T7 together).
- **Done when:** every table row passes, and `ShortCircuit.ts` is covered 100% by `ShortCircuit.test.ts` alone (`pnpm vitest run packages/core/test/ShortCircuit.test.ts --coverage.enabled --coverage.include=packages/core/src/ShortCircuit.ts`).

### T7 — GO: route both interpreters through the stepper
- **Status:** [-] dropped (D-26-a verdict DROP, 2026-10-07)
- **Depends on:** T6 (same commit), D-26-e
- **Files:** `packages/core/src/Evaluate.ts`, `packages/core/src/Predicate.ts`
- **Steps:**
  1. `Evaluate.ts`:
     - **Imports.** The value import becomes
       `{ allOfStep, anyOfStepper, rulesStepper }`, plus
       `import type { AnyOfStepper } from "./ShortCircuit.ts"`. Add a module-local
       binding, `const allOfStepLocal = allOfStep;`, with a comment citing
       ADR-QD-091/`Matcher.ts:563-569` for why. Drop `RuleEffect` from the
       `Policy.ts` type import if it becomes unused.
     - **`stepAllOf`** (`:689`): `if (allOfStepLocal(!trace.allowed) === "Stop")`.
     - **`AnyOfFold`** (`:808-815`): `exhaustive: boolean` becomes
       `step: AnyOfStepper`, with its doc line updated.
     - **`beginAnyOf`** (`:820`): `step: anyOfStepper(policy.fieldStrategy)`.
     - **`stepAnyOf`** (`:838`): `if (fold.step(trace.allowed) === "Stop")`.
       Update the comment at `:844-849`: "`Stop` here means `decidedByFirst`
       holds, so `merge(sets)` is `sets[0]`".
     - **`evaluateRules`**: `:955` becomes `const stepRule = rulesStepper(policy.combining);`.
       The `step` closure (`:980-992`) takes D-26-b's shape:
       `children.push(trace); const stops = stepRule(rule.effect, trace.allowed) === "Stop"; if (trace.allowed) { const applied = …; firstApplying ??= applied; if (stops) firstDecisive = applied; } return stops;`.
       Keep the `Applied` doc and the "takes `rule` alongside `index`" comment.
     - Leave the three `Effect.fnUntraced` generators and both of their branches
       otherwise byte-identical.
  2. `Predicate.ts`:
     - **Imports.** `{ allOfStep, anyOfStepper, effectiveCombining, rulesStepper }`,
       plus a type import of `AnyOfStepper`/`RulesStepper`.
     - **`Plan` changes** (D-26-e(a)): `Disjunction.stopsAtTrue` becomes
       `step: AnyOfStepper` (`:331`, `:523`), and `RuleTable` gains
       `step: RulesStepper`, set at `:554` as `rulesStepper(p.combining)`. Keep
       `combining`, because `formulaFor` reads it.
     - **The three `run` arms:**
       - `Conjunction` `:672`: `if (allOfStep(result._tag === "False") === "Stop") return FALSE;`
       - `Disjunction` `:682`: `if (p.step(result._tag === "True") === "Stop") return TRUE;`
       - `RuleTable`: delete `:689`; `:698` becomes
         `if (p.step(rule.effect, condition._tag === "True") === "Stop") break;`.
     - Keep the "Pruning never changes a successful predicate" doc
       (`:631-641`), and add that the stop is `ShortCircuit.ts`'s answer.
  3. Grep for stale prose naming the deleted functions:
     `grep -rn "anyOfStopsAtAllow\|rulesDecisiveEffect\|stopsAtTrue\|fold.exhaustive\|!exhaustive" packages/core/src`.
     Fix `FieldLattice.ts:9,22,222`, `Policy.ts:59` and any other hit.
- **Tests:** the full core suite, **unchanged** apart from T6's file.
- **Verify:** `pnpm typecheck && pnpm lint && pnpm circular && pnpm vitest run packages/core/test`; criteria 6, 7 and 8 greps.
- **Done when:** green with no test edits outside `ShortCircuit.test.ts`; criteria 6–8 hold.

### T8 — GO: confirmation bench on the landed code
- **Status:** [-] dropped (D-26-a verdict DROP, 2026-10-07)
- **Depends on:** T7
- **Files:** none in the repository.
- **Steps:**
  1. Build variants from the **branch** (V = `packages/core/src` at the T7 commit,
     not the spike) and from its merge base (A, A′), exactly as in T4 step 1.
  2. Run one session (D-26-a). It must be conclusive and meet G1–G4.
  3. If it fails, revert T6+T7 (a single commit) and re-open D-26-a with the new
     numbers. Do not tune thresholds after the fact.
  4. Record the table in §10 and in T9's ADR amendment.
- **Tests:** —
- **Verify:** `$P/gate/confirm/analysis.txt`.
- **Done when:** criterion 10 holds.

### T9 — GO: spec, ADR amendment, overview, traceability, CCR, changeset
- **Status:** [-] dropped (D-26-a verdict DROP, 2026-10-07)
- **Depends on:** T8
- **Files:**
  - ADR and spec: `spec/decisions/077-both-interpreters-read-ports-through-one-module.md`,
    `spec/invariants.md`, `spec/behaviors/05-evaluator.md`,
    `spec/behaviors/16-predicates.md`, `spec/traceability.md`,
    `spec/overview.md`, `spec/README.md`;
  - changeset: `.changeset/arch-26-short-circuit-stepper.md` (*new*).
- **Steps:**
  1. **ADR-QD-077 amendment (Rev 1.1).** "The stop rules live in one place" now
     means the decision, not only its inputs. Record:
     - the stepper interface (D-26-b);
     - the certainty adapters each interpreter keeps (ADR-QD-024);
     - the T4 and T8 tables, the method and the load;
     - how this differs from ADR-QD-073 Rev 1.3 (C5).
  2. **INV-QD-005, INV-QD-017 and INV-QD-058 Source:** name `allOfStep`,
     `anyOfStepper` and `rulesStepper`. INV-QD-058 Enforcement adds "the stepper
     tables are exhaustive". Rev bump.
  3. **Behavior docs.**
     - `05-evaluator.md:79`: "reads `FieldLattice.ts`'s `decidedByFirst` law
       through `ShortCircuit.ts`'s `anyOfStepper`".
     - `16-predicates.md` BEH-QD-265 (`:210-238`): "the stop is `ShortCircuit.ts`'s
       answer, which both interpreters ask".
     - Rev bumps on both.
  4. **Overview** `:808`: the row becomes
     `Step`, `AnyOfStepper`, `RulesStepper`, `allOfStep`, `anyOfStepper`,
     `rulesStepper`, `effectiveCombining`, `isCombining` (`@qadi/core/ShortCircuit.ts`),
     with the same reason. Rev 1.42.
  5. **Traceability:** §1 row `:58`, unchanged sources. INV rows `:100` (and the
     INV-QD-017 row): "`ShortCircuit.ts` (one stop decision)". §4 `:269` adds
     BEH-QD-111–113 if the rule tables now carry them. Rev bump.
  6. **CCR-QD-NEXT** row listing every file above.
  7. **Changeset**, `patch` for `@qadi/core` (the fixed group bumps the rest):
     "Internal: both interpreters ask one pure stepper where a composite's walk
     stops; no change to decisions, traces, errors or port calls." Under
     D-26-d(a), add: "Breaking, for `@qadi/core/ShortCircuit` subpath imports
     only: `anyOfStopsAtAllow` and `rulesDecisiveEffect` are replaced by
     `anyOfStepper` and `rulesStepper`." Do not publish (standing instruction: no
     releases).
- **Tests:** —
- **Verify:** `pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api`
- **Done when:** all five pass.

### T10 — GO: Stryker on `ShortCircuit.ts` and the changed ranges
- **Status:** [-] dropped (D-26-a verdict DROP, 2026-10-07)
- **Depends on:** T7
- **Files:** —
- **Steps:**
  1. Take a same-day baseline on the merge base, over the line ranges T7 will
     touch: `pnpm exec stryker run --mutate "packages/core/src/Evaluate.ts:687-697,packages/core/src/Evaluate.ts:808-854,packages/core/src/Evaluate.ts:943-992,packages/core/src/Predicate.ts:320-337,packages/core/src/Predicate.ts:511-555,packages/core/src/Predicate.ts:645-705,packages/core/src/ShortCircuit.ts"`.
     Record the survivors.
  2. On the branch, run the same command with T7's new line ranges.
  3. Requirements:
     - `ShortCircuit.ts` has **0 survivors**. Expected killers are T6's tables
       (`"Stop"`/`"Continue"` string mutants, `applies ? …` conditionals, and
       `effect === "Deny"` equality and literal mutants).
     - No survivor on the changed ranges that the baseline did not have. The
       consumers' `=== "Stop"` mutants are killed by T2, `Rules.test.ts` and the
       walk-equality property.
     - A survivor gets a test or, if it is equivalent, a line in the CCR naming it
       (ADR-QD-025: there is no ignore list).
- **Tests:** —
- **Verify:** the two Stryker commands; `reports/mutation/mutation.json`.
- **Done when:** criterion 9 holds.

### T11 — Full gate
- **Status:** [x] done
- **Depends on:** T3, plus T5 (DROP) or T10 (GO)
- **Files:** —
- **Steps:**
  1. Run `pnpm check`.
  2. If the 5 s default timeout trips a heavy test on this machine, record it and
     use the explicit per-test budget convention from `e9c7afc`. Never raise the
     global timeout.
- **Tests:** —
- **Verify:** `pnpm check`
- **Done when:** criterion 11 holds.

### T12 — Update the tracker
- **Status:** [x] done
- **Depends on:** T11
- **Files:** `.planning/architecture/README.md` (row and decision register), this file (§10, `status:`)
- **Steps:**
  1. Set the ARCH-26 row's status (`implemented`/`done` on GO, `dropped` on DROP,
     with T1–T3 noted as landed either way).
  2. Record D-26-a…h outcomes in the register.
  3. Add a §10 row per landed task.
- **Tests:** —
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-26-*.md | sort | uniq -c`
- **Done when:** the tracker and this plan agree.

## 7. Test strategy

**Unchanged:**

- `Predicate.test.ts`'s four `PROPERTY` tests. The walk-equality property
  (`:1202`) stays: it covers nesting, port-call order across port kinds, and
  outcomes, which T2 does not.
- `Rules.test.ts` entirely. Its INV-QD-017 block asserts trace `children` and
  deciding rows as well as stops.
- `Evaluate.test.ts` entirely, including "concurrent evaluation" and its two
  `PROPERTY` tests: the concurrent branches are untouched.
- `ShortCircuit.test.ts`'s `effectiveCombining`/`isCombining` tests.

**New, landing whatever the gate decides (T2):** the agreement contract, stated
directly against an oracle written from the spec.

- An exhaustive enumeration over every flat composite of up to three children
  (constants, port answers and port failures).
- A shrinking property up to eight children.

This is the test that turns C3's "indirectly, through port logs, sampled, at most
three siblings" into "directly, by index, enumerated". It kills M1–M6 on its own
(T2 step 6).

**Replaced (replace, don't layer):**

- On GO (T6), `ShortCircuit.test.ts`'s `anyOfStopsAtAllow` and
  `rulesDecisiveEffect` tests are replaced by the exhaustive stepper tables, with
  the same prototype-key coverage.
- Under D-26-g(a) (T2), the eight translator-only BEH-QD-265 examples are deleted,
  because T2 covers each shape for both interpreters.

**Differential:** D3 (the core suite, unchanged, against V) in T4, and again in T7
against the landing code.

**Mutation:**

- `$P/probe.py`'s six stop mutants document what each test set kills (C3, T2).
- On GO, Stryker on `ShortCircuit.ts` must leave 0 survivors, and the changed
  ranges must not regress (T10).
- The design keeps decision literals out of static initializers, so Stryker can
  see them (C10).

**Benchmarks:** T4 (the gate), plus T8 (confirmation) on GO. They are recorded in
the ADR and are never a merge gate.

## 8. Spec and documentation updates

- **Always (T1, T3):**
  - code and test comments now use the assigned INV-QD-058 and BEH-QD-264…267;
  - `spec/invariants.md` INV-QD-058 Enforcement is restated (Rev 1.56);
  - `spec/traceability.md` gets a Rev bump, with the BEH-QD-265 row checked;
  - `spec/README.md` gets a CCR-QD-NEXT row.
- **DROP (T5):**
  - an ADR-QD-077 addendum (Rev 1.1);
  - a one-line cross-reference under ADR-QD-073 Rev 1.3;
  - one sentence in `ShortCircuit.ts`'s module comment;
  - a CCR-QD-NEXT row.
- **GO (T9):**
  - an ADR-QD-077 amendment (Rev 1.1) carrying the T4/T8 numbers;
  - the INV-QD-005/017/058 Source and Enforcement;
  - BEH-QD-035 (`05-evaluator.md:79`) and BEH-QD-265 (`16-predicates.md`);
  - traceability §1 and §4;
  - the `spec/overview.md:808` "Not listed above" row (gate 13);
  - a CCR-QD-NEXT row;
  - `.changeset/arch-26-short-circuit-stepper.md` (patch; "Breaking, for
    `@qadi/core/ShortCircuit` subpath imports only" under D-26-d(a)).
- **Not changed on any path:**
  - AGENTS.md §5 and §5a, which have no budget change and no new exception;
  - `scripts/check-house-style.mjs`.

## 9. Risks and rollback

| Risk | Detection signal | Rollback |
| ---- | ---------------- | -------- |
| The stepper costs time on the hot path | T4 G1–G4 / D1; T8 | DROP via T5. On a T8 failure, revert the single T6+T7 commit. T1–T3 stand alone. |
| A noisy machine produces a false GO | `N_w`/`S′_w` > 5%, a control moving, or A′ far from A | D-26-a's conclusiveness rule. Two inconclusive sessions mean DROP, never a "probably fine". |
| vitest's getter artefact penalizes the change | the "module export getters" warning lists a `ShortCircuit.ts` export | D-26-a's getter clause: Vi, then a module-local binding (ADR-QD-091). C7 saw no such warning for the spike. |
| A stop moves where both interpreters agree but the spec says otherwise | T2's oracle is written from ADR-QD-013 and INV-QD-017, not from the code | T2 fails, which is the point of an independent oracle. |
| `firstDecisive` bookkeeping changes the deciding row under `FirstApplicable` | `Rules.test.ts` "the deciding rule" and "what the deciding rule contributes" blocks; C6's full-suite run | Restore the old `decisiveEffect === undefined` branch in the fold only. The stepper stays. |
| T2 is slow under Stryker's per-test coverage | T2's measured time; T10's run time | Cut the enumeration to n ≤ 2 and keep the property, or give it the explicit 60 s budget. Record the choice. |
| Removing two subpath exports breaks a downstream importer | the changeset's breaking note; gate 14 (`check-package-install.mjs`) packs and consumes | D-26-d(b) (keep them) is the fallback. ARCH-29 may make this moot. |
| ARCH-16 or ARCH-17 move the edited code first | merge conflict in `Evaluate.ts`/`Predicate.ts` | D-26-f(a): the gate and code run after them. The edit is about 10 lines per file and re-applies. |
| Gate scaffolding leaks into the repository | `git status` shows files under `packages/` | Everything lives in `$P/gate/` with a `node_modules` symlink. C7 proved this layout runs both methods. |

**Rollback granularity:** T1, T2 and T3 can each be reverted alone (comments,
tests, spec). T6+T7 is one commit, because neither compiles without the other. T9
and T5 are doc-only commits.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | Plan written; evidence re-verified at `e328e75`. The six stop-rule mutants M1–M6 are all killed by the walk-equality property and none by `ShortCircuit.test.ts` (C3). Thirteen `-NEXT` placeholders were found (C4). The stepper spike type-checks and passes 1466/1466 unchanged core tests (C6). The orientation harness and 4 paired vitest runs (load 1.9–4.8) put V inside A′'s band on all 26 workloads (`N_w` = 2%, harness V/A 0.985–1.011, vitest hz V/A 0.982–1.008) with no `ShortCircuit.ts` getter warning (C7). This is orientation only, not the gate. Status `not-started`: T0–T3 are startable now, and T4+ waits on D-26-a and D-26-f. | planner |
| 2026-10-07 | T0, T1 | Re-baselined on `arch/wave3` (evaluator folds now live in `Walk.ts`; `Predicate.ts` folds are ARCH-17's case form). Sixteen placeholders replaced, not thirteen: `Explanation.ts:248` and `TraceAlignment.test.ts:2,78` (ARCH-22's, INV-QD-103) were also unassigned. Hand-made mutants M1-M6 re-applied to the current `Walk.ts`/`Predicate.ts` lines. | impl |
| 2026-10-07 | T2 | Two tests in `ShortCircuit.test.ts` (3,957 enumerated cases, about 9 s at load 177, 60 s budget; property 300 runs seed 2049). Every one of M1-M6 fails both tests on its own. Eight BEH-QD-265 examples deleted from `Predicate.test.ts`. Port doubles are `scriptedPort`; no hand-built error. | impl |
| 2026-10-07 | T3 | INV-QD-058 Enforcement rewritten; invariants Rev 1.60, traceability Rev 1.96, README Rev 1.91, CCR-QD-192. | impl |
| 2026-10-07 | T4 | Gate not runnable: load 177 at start, 63-126 during. Two interleaved in-process A/A control sessions (A and A2 identical copies of `packages/core/src`, M1 harness, 26 workloads; variant V not built, since the control already fails): S1 (5 x 150 ms, load 125) 23 of 26 workloads with A2/A above 5%, max 57.5% (`wide`); S2 (9 x 250 ms, load 126 to 63) 14 of 26, max 51.5% (`obligation-heavy`). Both inconclusive (N_w above 5%) = D2, DROP. Deviations: sessions minutes apart not an hour; M2 (paired vitest) and V/Vi not run, as the control decides D2 alone. | impl |
| 2026-10-07 | T5 | ADR-QD-077 Rev 1.1 addendum, ADR-QD-073 Rev 1.5 cross-reference line, `ShortCircuit.ts` module comment (comment only in `src` apart from the placeholder ids). T6-T10 `[-]`. T11: targeted checks run (typecheck 0 errors, lint, circular, house-style, spec:verify:strict/gates/claims/api/examples, three vitest files); `pnpm check` left to the orchestrator. Commit 7af1e22. | impl |
