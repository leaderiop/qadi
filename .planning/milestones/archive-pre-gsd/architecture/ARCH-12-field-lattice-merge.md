---
id: ARCH-12
title: Field-strategy merging moves beside the lattice it merges over
strength: Worth exploring   # from the 2026-10-05 architecture review (review candidate 09)
status: implemented         # 2026-10-05 on arch/deepening; T12 (full gate, mutation) deferred to the final integration gate
evidence_verified_at: e0ee958
depends_on: []              # ARCH-02 (T7, T9) already landed on arch/integration and settled two of the review's claims (§1 C6, C7)
blocks: []
adrs_touched:
  - ADR-QD-006 (read: fieldStrategy is required and always encoded; decode rejects a fourth value, so every corrupt value below is in-process only)
  - ADR-QD-029 (read: join/meet ship as utilities because "a caller made to reimplement it will get it wrong"; the argument D-12-a reuses for a public mergeFields)
  - ADR-QD-034 (amend: the four-switch exception becomes three if D-12-b(b) is taken; the "widens to the top" history stays)
  - ADR-QD-026 (read: concurrent evaluation folds children in declaration order; merge inputs keep that order)
  - ADR-QD-030 (amend: simplification's flatten condition gains the empty-child and unknown-strategy clauses, T2)
  - ADR-QD-013 (read: only First short-circuits an anyOf)
  - ADR-QD-077 (read: stop rules are read from ShortCircuit.ts by both interpreters; kept, ShortCircuit becomes an adapter over the lattice's law)
  - ADR-QD-090 (read: POLICY_TAGS, fieldsOf, foldPolicy already resolved two review claims)
  - ADR-QD-023 (read: combining algorithms; only for the sibling finding D-12-f)
  - ADR-QD-073 (read: UNTRACED_BUDGET; nothing here becomes fnUntraced)
  - ADR-QD-076 (read: static mutants skipped; the law table's literals are static)
  - ADR-QD-037 (read: madge circular-import gate)
  - ADR-QD-025 (read: Stryker is gate `pnpm mutation`)
packages: [core]
estimate: M   # T1–T3 ≈ ½ day; T4–T5 ≈ ½ day; T6–T10 ≈ 1 day; T11–T12 ≈ ½ day
---

# ARCH-12 — Field-strategy merging moves beside the lattice it merges over

## 1. Verified evidence (at `e0ee958`)

All references are to branch `arch/integration` at `e0ee958`, read in worktree
`W=.claude/worktrees/agent-adb672833eb753a12`. Since the review (which read
`main` at `c75220e`), ARCH-01 added `ShortCircuit.ts` and ARCH-02 added
`POLICY_TAGS`, `fieldsOf` and `foldPolicy`. Both changed what this plan has to
do.

**How the suspected claims were settled.** Throwaway probes in the session
scratchpad (`…/scratchpad/arch12/probe{1..6}.mts`) import the real
`packages/core/src` modules by absolute path and run with:

```sh
cd $W/packages/core && NODE_OPTIONS="--conditions=bun" \
  /Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/tsx <probe>.mts
```

Every finding a task depends on is written again as a real test in §6, so the
scratch files are not needed to reproduce anything.

**Tooling note.** The command in the shared brief
(`/Users/…/qadi/node_modules/.bin/vitest run <file>` from `$W`) fails every
file with `TypeError: Cannot read properties of undefined (reading 'config')`.
That is the two-vitest-instances problem ARCH-07 §1 C9 recorded. The worktree
has its own `node_modules`, and its own binary works:
`cd $W && node_modules/.bin/vitest run --project core <files>`. In a normal
checkout the equivalent is `pnpm exec vitest run --project core <files>`, and
this plan's Verify lines use that form.

### C1. Each strategy's meaning lives in `Evaluate.ts`, the lattice operations in `Decision.ts` — **CONFIRMED**

- `packages/core/src/Evaluate.ts:422-484`: `mergeFields(strategy, sets)` is a
  `switch (strategy)` over the `FieldStrategy` literal union (`:434`).
  - `Intersection` (`:435-436`) folds pairwise through `intersectFields`,
    imported from `Decision.ts` (`:28`).
  - `Union` (`:437-459`) re-implements union inline into one `Set` "for speed"
    (comment `:442-449`). It copies the sort rule "for the same reason
    `intersectFields`/`unionFields` are (`Decision.ts`)" (`:454-458`).
  - `First` (`:460-461`) returns `sets[0]`.
  - The `default` arm (`:462-483`) returns `[]`. Its comment records the CM-07
    history: the arm used to return the bogus strategy string, and before that
    `undefined`, which is the lattice's top.
- `packages/core/src/Decision.ts:205-355` ("Field visibility lattice") holds:
  - `VisibleFields` (`:246`) and its 45-line doc comment;
  - `CONTAINMENT_KEEP` (`:258-265`);
  - `intersectFields` (`:299-323`, sorted at `:322`);
  - `unionFields` (`:351-354`, sorted).
  `unionFields`'s doc comment (`:326-350`) says no production caller is left,
  because `mergeFields` stopped folding through it.
- Callers of `mergeFields`: `finishAllOf` (`Evaluate.ts:851-861`, call at
  `:857`) and `finishAnyOf` (`:1003-1018`, call at `:1010`).
- The switch is budgeted: `scripts/check-house-style.mjs:278-284` sets
  `SWITCH_BUDGET` to `Evaluate.ts: 2`, `Matcher.ts: 2`. `:297-300` sets
  `SWITCH_BUDGET_NAMES` to `["evaluateNode", "mergeFields"]`. AGENTS.md §5a's
  table row is "`Evaluate.ts` — `mergeFields` | the `FieldStrategy` literal
  union". The baseline run prints
  `house-style: 312 file(s) clean (4 declared switch(es))`.

### C2. The fail-closed default was hand-fixed after the switch widened to the top — **CONFIRMED** (history in ADR-QD-034 and AGENTS §5a)

ADR-QD-034 (`spec/decisions/034-…md:72-95`) records that `mergeFields` was one
of the two switches whose return type absorbed a missing case silently, and
that it would "merge to `undefined`, … the **top** … Fail-open". The test
`Evaluate.test.ts` `"mergeFields' default arm denies every field against an
unrecognized strategy (CM-07)"` (around `:1111`) pins `[]` for
`JSON.parse('"BogusStrategy"')` on an `allOf`.

### C3. NEW DEFECT — an `anyOf` whose strategy names an `Object.prototype` member widens to every field — **CONFIRMED**

The meaning of an unknown strategy is decided in **two** modules, and they
disagree.

- `ShortCircuit.ts:28-44`: `anyOfStopsAtAllow` is a plain `Record` lookup,
  `STOPS_AT_ALLOW_BY_STRATEGY[strategy]`. Its doc comment (`:17-23`, `:40-42`)
  says "a value outside the union reads as `undefined`, which callers negate
  into 'must see everything'".
- That is true for `"Xor"`. It is **not** true for a key the object inherits.

`probe3.mts` uses the subject roles `a, b` and evaluates
`anyOf([hasRole("a"), hasRole("b", {fields:["x"]})])` with a hand-built
strategy:

| `fieldStrategy` | `anyOfStopsAtAllow` returns | `anyOf` result | `allOf` result (same children) |
| --- | --- | --- | --- |
| `"Xor"` | `undefined` | Allow, `[]`, 2 children walked | Allow, `[]` |
| `"toString"` | a **function** | Allow, **`undefined` (every field)**, 1 child walked | Allow, `[]` |
| `"constructor"` | a function | Allow, **`undefined`** | Allow, `[]` |
| `"__proto__"` | an object | Allow, **`undefined`** | Allow, `[]` |
| `"hasOwnProperty"` | a function | Allow, **`undefined`** | Allow, `[]` |

A truthy non-boolean makes `beginAnyOf` (`Evaluate.ts:969-975`) set
`exhaustive: false`. `stepAnyOf` then returns the first allowing child's
`visibleFields` verbatim (`:995`), and that is the lattice top. This is exactly
the failure ADR-QD-034 exists to forbid, reborn one module over.

It is also the defect BEH-QD-035 (`spec/behaviors/05-evaluator.md:70-74`)
records the predecessor having: it "silently treated every other value as
short-circuit".

**Reachability.** Decode rejects the value (`Schema.Literals`,
`Policy.ts:59`), and so does `Policy.test.ts`'s
`"rejects an unknown fieldStrategy value…"`. It is reachable only through
in-process construction (`JSON.parse`, `as`, or a hand-built object). That is
the same class as CM-07, which the project chose to fix and pin.

`Predicate.ts:559` (`stopsAtTrue: anyOfStopsAtAllow(p.fieldStrategy)`) reads
the same function, so `toPredicate`'s walk short-circuits the same way. Its
output is unaffected: field-restricting policies are refused before
translation.

### C4. NEW DEFECT — `simplify` changes `visibleFields`, against INV-QD-024 — **CONFIRMED**

INV-QD-024 (`spec/invariants.md:815-818`) says `simplify(p)` yields "the same
verdict, the same `visibleFields` and the same obligations". `probe1.mts`
(subject role `editor`, `x = hasRole("editor", {fields:["a"]})`) shows it does
not:

| Policy | `evaluate(p)` | `evaluate(simplify(p))` |
| --- | --- | --- |
| `allOf([allOf([],{Union}), x], {Union})` | Allow, `undefined` (all) | Allow, `["a"]` |
| `allOf([x, allOf([],{Union})], {Union})` | Allow, `undefined` | Allow, `["a"]` |
| `allOf([allOf([],{First}), x], {First})` | Allow, `undefined` | Allow, `["a"]` |
| `allOf([allOf([],{Intersection}), x])` | Allow, `["a"]` | Allow, `["a"]` ✓ |
| every `anyOf` analogue | equal ✓ | equal ✓ |

**Cause.** `Simplify.ts:41-55` absorbs a same-tag, same-strategy child
unconditionally. Its own justification (`:36-38`) is "each merge is
associative: intersection and union both are, and `First` takes the first
child's set either way". Associativity is necessary but not sufficient when the
absorbed child is **empty**. An empty `allOf` allows with `mergeFields(s, []) =
undefined` (top), and top is the unit of `Intersection` but the **absorbing**
element of `Union`. `First` has no unit at all. So flattening an empty child is
sound only under `Intersection`.

`probe5.mts` finds a second, in-process-only case. A **single-child** composite
with an unknown strategy is unwrapped to its child (`Simplify.ts:117`, `:125`).
For `allOf`/`anyOf` with `fieldStrategy: "Xor"` over `hasRole("a")`,
`evaluate` gives `[]` and `evaluate(simplify(p))` gives `undefined`. That is a
**widening**, from no fields to every field.

The INV-QD-024 property (`Simplify.test.ts:232-282`, seed 1030, 120 runs) does
not generate this case, so it passes. The generator can build empty children
(`maxLength: 3`, so length 0 is allowed), but a same-strategy `Union`/`First`
`allOf` holding an empty same-strategy `allOf`, under an allowing subject, never
comes up in 120 runs.

### C5. The canonical-order claim is only half true — **CONFIRMED (new finding; semantic, not a disclosure defect)**

`Decision.ts:290-297` claims sorting makes "byte-equality of the wire form
track semantic equality of the field set". `Evaluate.ts:454-458` repeats the
claim for `Union`.

It fails for `Intersection` whenever two specs have equal shapes but different
text (`"title"` and `"title.**"`, INV-QD-004). `CONTAINMENT_KEEP` keeps the
right-hand operand on `"Equal"` (`Decision.ts:259-265`). So:

- `allOf([hasRole(fields:["title"]), hasRole(fields:["title.**"])])` gives
  `["title.**"]`.
- The same children swapped give `["title"]` (`probe1.mts`).

`Decision.test.ts:153-174` already knows. Its comment says "nothing in this
codebase claims `intersectFields`'s raw output is representative-stable". That
is contradicted by `Decision.ts:290-297`.

Measured over `Decision.test.ts`'s own field-spec alphabet (`probe2.mts`,
`probe6.mts`, 5000 samples each):

| | today | with a deterministic tie-break (keep the lexicographically smaller spec on `"Equal"`) |
| --- | --- | --- |
| `intersectFields(a,b)` vs `(b,a)`, bytes | 21 / 5000 differ | 0 |
| `(a∩b)∩c` vs `a∩(b∩c)`, bytes | 0 | 0 |
| n-ary Intersection fold, sets vs a permutation, bytes | 12 / 5000 differ | 0 |
| disclosure (`project`, `deepStrictEqual`) vs today | — | identical (only `JSON.stringify` key order differs: `project`'s output key order follows spec order) |

This matters downstream. `TraceDiff.sameFields` (`TraceDiff.ts:135-144`)
compares string sets. A what-if whose allowing children differ can therefore
report `"title.**"` → `"title"` as a change of fields when nothing a subject
can see changed.

### C6. "`restrictsFields` lists all ten leaf variants" — **REFUTED at `e0ee958` (resolved by ARCH-02 T9)**

`Predicate.ts:311-315` is
`foldPolicy<boolean>(policy, (node, children) => fieldsOf(node) !== undefined || children.some(isTrue))`.
`fieldsOf` is `Policy.ts:1112-1131`, a hoisted `Match.tagsExhaustive`. Nothing
for this plan to do.

### C7. "Duplicate 16-key registries `POLICY_TAGS_BY_TAG` / `TRACE_TAGS_BY_TAG`" — **REFUTED in code (resolved by ARCH-02 T7); one stale spec citation remains**

`grep -rn "POLICY_TAGS_BY_TAG\|TRACE_TAGS_BY_TAG" packages/*/src packages/*/test`
finds nothing.

- `Policy.ts:548` is `export const POLICY_TAGS = PolicyUnion.discriminants`.
- `Evaluate.ts:98` uses it as `preregisteredWords`.
- `Decision.ts:76` uses it in `Schema.Literals(POLICY_TAGS)`.

**Still stale:** INV-QD-003's Source paragraph (`spec/invariants.md:64-69`)
names "`Evaluate.ts`'s `POLICY_TAGS_BY_TAG`" as a guard. It also calls
`mergeFields` one of "both `_tag` dispatch switches" with TS2366. Neither is
true: the record is gone, and `mergeFields` dispatches on a literal union that
ADR-QD-034's own table says TS2366 does *not* catch. ARCH-02 T17 missed this
paragraph. T11 fixes it.

### C8. Other modules that interpret `FieldStrategy` or merge field sets — **surveyed**

`grep -rnE '"Intersection"|"Union"|"First"|fieldStrategy|FieldStrategy|intersectFields|unionFields' packages/*/src`:

| Module | What it knows about strategies / field sets | Disposition |
| --- | --- | --- |
| `ShortCircuit.ts:28-44` | `First` short-circuits; the others must see every allowing child; an unknown value reads as "see everything" (C3: not for prototype keys) | T1 fixes it; T7 makes it an adapter over the lattice's law (D-12-e) |
| `Simplify.ts:20-55` | "each merge is associative; First takes the first child's set either way" | T2 fixes it; T7 makes it ask the lattice's laws (D-12-d) |
| `Explanation.ts:396-445` | `fieldStrategyText` (prose per strategy, `Match.value` per call) and `fieldStrategyClause` (`:430-434` cites `mergeFields` (`Evaluate.ts`) for "zero or one field set is the same answer under all three") | prose stays; the citation moves to the law (T7) |
| `Policy.ts:59-60, 759-778` | schema literal and `defaultFieldStrategy` | unchanged; doc comment points at the new module |
| `Evaluate.ts:969-1000` | `beginAnyOf`'s `exhaustive` and `stepAnyOf`'s early return of `trace.visibleFields` (a third encoding of `First`) | early return kept (hot path), comment cites the `decidedByFirst` law |
| `TraceDiff.ts:128-144` | `sameFields`: string-multiset equality, `undefined` vs `[]` kept apart | unchanged; C5's tie-break removes its false positives for one policy's re-runs (§3) |
| `FieldPath.ts` | containment (`compareShapes`) and projection; doc comments name "`Decision.ts`'s `intersectFields`" (`:51`, `:92-97`, `:133`) | unchanged code; comments re-pointed (T6) |
| `SecurityLabel.ts:135-165` | `join`/`meet` of a *different* lattice (labels, ADR-QD-021/029) | out of scope (§3) |
| `Obligation.ts:56` | "Union, always — never intersection" (a comment comparing with `intersectFields`) | comment re-pointed |
| `DecisionWire.ts`, `react/HydrationEngine.ts`, `react/hooks.ts`, `react/SeededDecision.ts` | carry or project `visibleFields`; no merge. `HydrationEngine.isMismatch` (`:66-75`) compares verdict only | unaffected |
| devtools `model/Inspect.ts:188` | `String(self)` for display | unaffected |
| `Predicate.ts:311-315, 559` | `fieldsOf` (C6) and `anyOfStopsAtAllow` | unaffected beyond C3 |

No package outside core merges field sets.

### C9. Sibling finding — an unknown `combining` decides like `FirstApplicable` — **CONFIRMED (not field-related; D-12-f)**

`ShortCircuit.ts:46-62` has the same `Record`-lookup shape for `Combining`.
`probe4.mts` uses roles `a, b` with the rows
`[permitWhen(hasRole("a")), denyWhen(hasRole("b"))]`:

| `combining` | result |
| --- | --- |
| `DenyOverrides` | Deny |
| `FirstApplicable` | Allow |
| `"Xor"` | Allow |
| `"toString"` | Allow |

For `"Xor"`, the lookup returns `undefined`, so the walk follows
`FirstApplicable` semantics. For `"toString"`, it returns a function, which
never equals a rule effect. So an in-process-corrupted rule table can permit
where the author's (lost) `DenyOverrides` would have denied. The fix has the
same shape as C3. Whether it belongs in this plan is D-12-f.

### C10. Baseline runs

- `cd $W && node_modules/.bin/vitest run --project core --testTimeout=60000`:
  **39 files, 1223 tests, all pass.**
- The eight files this plan touches (`Decision`, `Layers`, `Simplify`,
  `ShortCircuit`, `Explanation`, `Evaluate`, `TraceDiff`, `Policy`):
  **397 tests pass.**
- `node scripts/check-house-style.mjs`: clean, `4 declared switch(es)`.
- `madge --circular --extensions ts,tsx packages/core/src`: no cycles.
- **Bench baseline.** `node_modules/.bin/vitest bench --run packages/core/bench/Evaluate.bench.ts`
  (laptop, 2026-10-05, one run). Means:

  | Workload | Mean |
  | --- | --- |
  | one node | 7.6 µs |
  | wide | 9.9 µs |
  | deep | 12.5 µs |
  | matcher-heavy | 12.5 µs |
  | obligation-heavy | 14.6 µs |
  | **field-heavy — allOf of 8 under Intersection** | **21.5 µs** (47 429 hz, ±0.30%) |

  Two things to know about this file. vitest warns that the bench "accessed
  module export getters too many times", and `Decision.ts > intersectFields` is
  one of the tracked getters. That is a module-runner artifact, not production
  cost, but a moved export keeps it. Also, **two of the file's seven benches
  fail at `e0ee958`**: `filter — 500 items` and `decideSubjects — 500 subjects`
  throw ``SyntaxError: `bench.compare()` requires at least 2 benchmarks``
  (vitest 5). No workload exercises `Union`'s inline path.
- `Dispatch.bench.ts` transcribes only `resolveRef`. No benchmark has ever
  measured `mergeFields`' dispatch.

### C11. Facts the design relies on

- **`export *` through two paths.** One binding re-exported by both
  `Decision.ts` (`export { x } from "./FieldLattice.ts"`) and another barrel
  member type-checks and emits cleanly under this repo's compiler settings
  (`…/arch12/reexport/`, `tsc` exit 0). So `Decision.ts` can keep
  re-exporting the moved names. `@qadi/core`'s `"./*"` wildcard export
  (`packages/core/package.json:28-33`) keeps `@qadi/core/Decision` resolving
  for anyone importing that subpath. No in-repo consumer imports
  `@qadi/core/Decision` or `@qadi/core/FieldPath`.
- **`Object.hasOwn`** is already used in core (`Decision.ts:125`,
  `Evaluate.ts:706`). `lib: ["ESNext"]`. An object literal's `__proto__` key
  sets the prototype rather than creating an own property, so
  `Object.hasOwn(table, "__proto__")` is `false`.
- **The import graph.** The new module needs `FieldPath.ts` (runtime) and
  `Policy.ts` (type-only `FieldStrategy`). `Decision.ts` re-exports from it.
  `Simplify.ts` and `ShortCircuit.ts` import it. None of these reaches back:
  `FieldPath.ts` has no imports, and `Policy.ts` does not import `Decision.ts`,
  `ShortCircuit.ts` or `Simplify.ts`.

## 2. Goal and success criteria

**Goal.** Make one **deep module**, `FieldLattice.ts`, the only place that
knows what a field strategy *means*:

- its n-ary merge, including the fast `Union` path and the sort rule;
- the deterministic tie-break;
- the fail-closed answer for a value outside the union;
- the algebraic laws other modules lean on today by restating them: "only
  `First` is decided by its first input" (ShortCircuit), and "a nested
  same-strategy composite may be absorbed" plus "a one-input merge is the
  identity" (Simplify).

Today four modules each hold part of that meaning: `Evaluate.ts`'s switch,
`Decision.ts`'s binary operations, `ShortCircuit.ts`'s table and
`Simplify.ts`'s associativity argument. C3 and C4 are what that costs: two
modules disagree with the switch about unknown strategies and empty inputs, and
both disagreements are disclosure defects.

The module's **interface** is small: `VisibleFields`, `intersectFields`,
`unionFields`, `mergeFields(strategy, sets)`, and one law accessor. Its
**implementation** hides shape-hoisting, the `Equal` tie-break, set
accumulation, sorting and the own-property guard. That gives the module
**depth**: little to know, a lot behind it.

The **seam** sits at "merge these allowing children's field sets". Callers
become **adapters** over it:

- the evaluator's `finishAllOf`/`finishAnyOf`;
- `ShortCircuit.anyOfStopsAtAllow`;
- `Simplify`'s absorb and unwrap checks.

**Locality.** A fourth strategy becomes one table row plus its laws, and the
compiler makes that row mandatory. **Leverage.** One property-test suite (the
interface is the test surface) covers what three example suites and a CM-07
regression test cover piecemeal today. The defects found while verifying
(C3, C4, and C9 if D-12-f says so) are fixed test-first, before any move.

**Success criteria** (each checkable):

1. **C3 fixed.** `Evaluate.test.ts` has `"an anyOf whose strategy names an
   Object.prototype member grants no fields (C3)"`, iterating
   `["toString", "constructor", "__proto__", "hasOwnProperty"]`. It fails at
   `e0ee958` (`expected undefined to deeply equal []`) and passes after T1.
   `ShortCircuit.test.ts` asserts `anyOfStopsAtAllow` returns exactly `false`
   (`assert.strictEqual`) for each of those values.
2. **C4 fixed.** `Simplify.test.ts` has the five C4 rows as example tests that
   fail at `e0ee958` and pass after T2. The INV-QD-024 property's generator
   (T9) produces at least one `Union`/`First` composite holding an empty
   same-strategy child per 120 samples; T9 adds a vacuity counter for this.
3. **One owner.**
   - `grep -nE "^const mergeFields|switch \(strategy\)" packages/core/src/Evaluate.ts` prints nothing.
   - `grep -nE "^export const (intersectFields|unionFields)|^const CONTAINMENT_KEEP" packages/core/src/Decision.ts` prints nothing.
   - `grep -n "STOPS_AT_ALLOW_BY_STRATEGY" packages/core/src` prints nothing (D-12-e(i)).
4. **Public surface.** `intersectFields`, `unionFields`, `VisibleFields` and the
   new `mergeFields` (D-12-a) resolve from `@qadi/core` and from
   `@qadi/core/Decision`. `node scripts/check-api-surface.mjs` passes.
5. **Byte-stable Intersection (D-12-c).** `FieldLattice.test.ts`'s
   `"PROPERTY: mergeFields('Intersection', ·) is byte-for-byte independent of
   input order"` passes. Today's code fails it (`probe6.mts`: 12/5000).
6. **Fail-closed.** `FieldLattice.test.ts` asserts that for every
   `s ∈ ["Xor", "toString", "constructor", "__proto__", "hasOwnProperty", ""]`:
   `mergeFields(s, sets)` is `[]` for every non-empty `sets`, and every law
   flag of `fieldStrategyLaws(s)` is `false`.
7. **Switch budget.** `node scripts/check-house-style.mjs` passes, and AGENTS.md
   §5a's table and `SWITCH_BUDGET`/`SWITCH_BUDGET_NAMES` agree:
   - under D-12-b(b): it prints `3 declared switch(es)` and `Evaluate.ts: 1`;
   - under D-12-b(a): it prints `4 declared switch(es)`, with a
     `packages/core/src/FieldLattice.ts: 1` entry and `["mergeFields"]` under
     that file.
8. **No regression.** `pnpm bench`'s `field-heavy — allOf of 8 under
   Intersection` and the new `field-heavy — anyOf of 8 under Union` means are
   within run-to-run noise of the T4 baseline. Measure same machine, same day,
   3 runs each side, and report the mean of the runs (AGENTS §5's method). "Noise"
   means ≤ 10% on the mean of means; a larger move needs an explanation in the
   CCR or the D-12-b fallback.
9. **Coverage and mutation.** `pnpm coverage` keeps `packages/core/src/**` at
   ≥ 95%. `pnpm exec stryker run stryker.config.mjs` stays ≥ 80 (break). For
   `FieldLattice.ts`, `ShortCircuit.ts` and `Simplify.ts`, the score is no lower
   than today's per-file figure (ARCH-02's `Simplify.ts` was 78.05%, and T9 is
   expected to raise it), unless the CCR explains the drop.
10. **Stale spec fixed.** `grep -n "POLICY_TAGS_BY_TAG" spec/invariants.md`
    finds only change-history text, never a Source paragraph. INV-QD-004's
    Source names `FieldLattice.ts`.
11. `pnpm check` is green end to end.

## 3. Non-goals

- **Changing what an empty `allOf` grants.** `allOf([])` allows with `undefined`
  under all three strategies (`Layers.test.ts` `"AllOf with no children allows
  and restricts nothing"`, BEH-QD-154 "An empty `allOf` … always allows"). Under
  `Union` the algebraic unit would be `[]`. D-12-d(iii) lists that as an
  option, but this plan fixes C4 at `Simplify` without changing evaluator
  output.
- **Canonicalizing every allow** (sorting leaf `fields`, sorting `First`'s
  pass-through). See D-12-c(iii): it would change the key order of every
  field-restricted projection (`project` follows spec order, C5), and
  `Layers.test.ts:143` pins `First`'s output "verbatim, unmerged".
- **`TraceDiff.sameFields` comparing by disclosure.** The D-12-c tie-break
  removes its false positives across re-runs of one policy. Comparing
  `"title"` to `"title.**"` as equal *across policies* would need a semantic
  equivalence check and a decision about what a diff is for (BEH-QD-194). Raise
  that separately if wanted.
- **Unifying with `SecurityLabel`'s `join`/`meet`.** That is a different element
  type and a different ADR (ADR-QD-021/029). It shares the word "lattice", not
  the operations.
- **Moving `project` or `FieldPath.ts`.** Projection is the lattice's
  denotation. `FieldPath.ts` is already a deep module (the review lists it as
  "deep enough already"), and `project` is a long-standing `Decision.ts`
  export.
- **Evaluator loop structure** (`evaluateAllOf`/`evaluateAnyOf`/`evaluateRules`,
  `UNTRACED_BUDGET`). That is ARCH-13's territory. This plan changes only which
  function `finishAllOf`/`finishAnyOf` call.
- **`Explanation.ts`'s strategy prose.** Rendering vocabulary belongs to the
  explanation module. Only its citation of `mergeFields` moves.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 (submodule imports, `.ts` extensions, `import type`) | `FieldLattice.ts` imports `type { FieldStrategy } from "./Policy.ts"` (type-only) and `{ compareShapes, shapeOf } from "./FieldPath.ts"`, plus `type { Containment }`. `Decision.ts`'s re-exports use `export { … } from "./FieldLattice.ts"` and `export type { VisibleFields } from "./FieldLattice.ts"`. |
| AGENTS.md §4 (never a defect in an evaluation path) | The fail-closed path returns `[]`. It never throws. This is why D-12-b(c), `Match.exhaustive`, is rejected: it throws `MatchError` at runtime on an unknown value. |
| AGENTS.md §5 / ADR-QD-073 | `mergeFields` is a pure, synchronous function, not effectful, so `Effect.fn` does not apply. No `Effect.fnUntraced` is added or removed. |
| AGENTS.md §5a / ADR-QD-034, `SWITCH_BUDGET` | Under D-12-b(a), the switch moves file. Edit `SWITCH_BUDGET` (`Evaluate.ts: 2→1`, new `FieldLattice.ts: 1`), `SWITCH_BUDGET_NAMES` and the §5a table in **the same commit** (the gate fails both ways). Under D-12-b(b), the switch is deleted: total `4→3`, the table row is removed, and the "Four switches remain" prose becomes three. Either form is a conversion of a budgeted switch, so §5a/ADR-QD-034 require a benchmark first (T4 before T6). |
| AGENTS.md §6 (no `as`, `!`, `any`) | Corrupt values in tests come from `JSON.parse` assigned to a `FieldStrategy`-typed `const`, the idiom `Evaluate.test.ts`'s CM-07 test already uses. Don't use `as`. The lookup `Object.hasOwn(LAWS, s) ? LAWS[s] : FAIL_CLOSED` needs no assertion, because `s` is already typed `FieldStrategy`. |
| AGENTS.md §9 (barrels) | `FieldLattice.ts` stays **out** of `index.ts` (its law helpers have generic names). Public names reach the barrel through `Decision.ts`'s explicit re-exports, which `index.ts` already `export *`s. |
| AGENTS.md §10 (core coverage 95%) | The fail-closed row becomes reachable from tests instead of an unreachable `default` arm. ADR-QD-034 noted that arm cost line and branch coverage. |
| AGENTS.md §11, §12, §15 | Spec changes in the same PR (T11). `spec/overview.md` names `mergeFields`, and the "Not listed above" table names `fieldStrategyLaws`/`StrategyLaws` (gate 13, `node scripts/check-api-surface.mjs`). Any `typescript` fence that uses `mergeFields` must compile (gate `node scripts/check-doc-examples.mjs`). |
| User preference: closed unions | `StrategyLaws` is one closed record type. The law table is `Readonly<Record<FieldStrategy, StrategyLaws>>`, so a fourth strategy is a TS2741 compile error. The fail-closed descriptor is a named constant, not an index-signature fallback. Never `Record<string, …>`. |
| User preference: no `Record<string, unknown>` widening | The table is keyed by the closed `FieldStrategy`. Membership is tested with `Object.hasOwn`, not by widening the key type. |
| ADR-QD-006 | Decode still rejects every value outside the union. This plan changes only what in-process values do. |
| ADR-QD-026 | Merge inputs arrive in declaration order (`AllOfFold.fieldSets`, `AnyOfFold.allowingFieldSets`). D-12-c makes `Intersection`/`Union` independent of that order anyway. `First` stays order-sensitive by definition. |
| ADR-QD-077 (stop rules live in `ShortCircuit.ts`) | Under D-12-e(i), `anyOfStopsAtAllow` stays the function both interpreters call. Only its source of truth moves. |
| ADR-QD-076 (`ignoreStatic`) | The law table's boolean literals and `CONTAINMENT_KEEP` are evaluated at module load, so Stryker does not mutate them. Each row is pinned by an explicit per-strategy example test (T8), the discipline `ShortCircuit.test.ts` already states ("each row is asserted"). The merge *functions* in the table run per call and stay mutated. |
| ADR-QD-037 (`pnpm circular`) | The graph in C11 adds no cycle. Verify with `pnpm circular` in T7. |
| Sequencing: ARCH-13 (combinator child driver, planned in parallel) | ARCH-13 reshapes `evaluateAllOf`/`evaluateAnyOf` and the `begin`/`step`/`finish` folds that call `mergeFields` and `anyOfStopsAtAllow`. **Land ARCH-12 first.** It is smaller, carries two defect fixes, and leaves the folds' call shape (`mergeFields(policy.fieldStrategy, sets)`) identical, so ARCH-13 rebases onto a renamed import and nothing else. If ARCH-13 lands first, T7 re-applies its two-line change in whichever pure fold function ARCH-13 produced. |
| Sequencing: ARCH-08 (comparison semantics: `attributeReason`/`refIsUnresolved`, `Evaluate.ts:378-420`) | The changes are textually adjacent: `mergeFields` starts at `:422`. They are semantically independent. Either order works; the second one rebases a hunk boundary. |

## 5. Decisions needed before work starts

### D-12-a — Where the module lives, what it is called, and what is public

| Option | Shape | For | Against |
| --- | --- | --- | --- |
| **A. New internal `FieldLattice.ts`; `Decision.ts` re-exports the public names, adding `mergeFields`** | `FieldLattice.ts` owns `VisibleFields`, `intersectFields`, `unionFields`, `mergeFields`, `fieldStrategyLaws`, `StrategyLaws`. `Decision.ts` keeps `export { intersectFields, unionFields, mergeFields }` and `export type { VisibleFields }`. Not in the barrel. | One file holds the whole lattice. Existing import paths (`@qadi/core`, `@qadi/core/Decision`) keep working. The law helpers stay out of the flat namespace. A public `mergeFields` gives callers the evaluator's exact semantics. That is ADR-QD-029's argument for `join`/`meet` ("a caller made to reimplement it will get it wrong"), and `unionFields`' own doc comment (`Decision.ts:337-345`) already imagines such a caller. | One new public export: a `minor` changeset, and gate 13 rows. |
| B. Same as A, `mergeFields` kept internal | As A, but without the re-export. | No new surface. | A caller composing two decisions' visibility by strategy reimplements it. That is ADR-QD-029's failure mode, kept on purpose. |
| C. No new file: move `mergeFields` into `Decision.ts`'s lattice section | `Decision.ts` grows by about 60 lines. | Smallest diff. | `Decision.ts` stays a mixed module (trace schema, `Allow`/`Deny`, `project`, rendering, lattice), and the laws have no obvious home. That is weaker locality. |

**Naming:** keep **`mergeFields`**. It completes the
`intersectFields`/`unionFields` family. It also keeps every current-state spec
citation valid except its file location (`spec/models/07`, `/26`, `/35`,
`behaviors/16-predicates.md:294`, `invariants.md:68`). `mergeVisibleFields` was
considered: it is more explicit, but it would rename across about ten documents
for no new meaning.

**Recommendation: A**, with the name `mergeFields`.
`status: decided (2026-10-05, A with the name `mergeFields` — recommended default)`

### D-12-b — How `mergeFields` dispatches on the strategy

| Option | Shape | For | Against |
| --- | --- | --- | --- |
| (a) Move the `switch` as is | Same body in `FieldLattice.ts`. `SWITCH_BUDGET` moves one count between files. A separate `fieldStrategyLaws` table holds the laws. | No dispatch change, so no performance risk. | Each strategy's meaning stays split across two constructs in one file (switch arms and law rows), and a corrupt value is handled twice (the `default` arm and the laws' guard). |
| **(b) One own-property law table** | `const LAWS: Readonly<Record<FieldStrategy, StrategyLaws>>`, where each row is `{ merge, decidedByFirst, emptyIsUnit, singletonIsIdentity }`. `lawsOf = (s) => Object.hasOwn(LAWS, s) ? LAWS[s] : FAIL_CLOSED`. `mergeFields = (s, sets) => lawsOf(s).merge(sets)`. | Each strategy's whole meaning is **one row** (locality). A fourth strategy is a TS2741 compile error, the same guarantee `ShortCircuit.ts` relies on (`:17-21`). The fail-closed path is one named constant used by every consumer, which makes C3's class impossible. It removes one budgeted switch (AGENTS §5a: four becomes three). The fail-closed row is reachable by tests. | An `Object.hasOwn`, a property load and an indirect call per composite node, which needs measuring (§5a, ADR-QD-034). |
| (c) Hoisted `Match.type<FieldStrategy>()` | `Match.when` per literal. | §5a's nominal preference. | `Match.exhaustive` throws `MatchError` on an unknown value, which is a defect in an authorization path (AGENTS §4). `Match.orElse(() => [])` loses compile-time exhaustiveness. Per ADR-QD-034 it is also the slower form. |

**Recommendation: (b), gated on T4's measurement.** T4 adds a
`mergeFields — one dispatch` comparison to `Dispatch.bench.ts` (switch vs
own-property table vs `Match.value`), plus a `Union` workload to
`Evaluate.bench.ts`. Take (b) if both of these hold:

- the table form is within 1.2× of the switch per dispatch;
- the two field-heavy end-to-end means are within run-to-run noise (≤ 10%).

Otherwise fall back to (a) and record the numbers in the CCR. The dispatch
runs once per composite node, beside an O(|a|·|b|) `intersectFields`, so a few
nanoseconds should not show end to end. But §5a asks for the number, not the
argument.

`status: decided (2026-10-05, (b) — by measurement: per dispatch table 2.33 µs vs switch 2.40 µs (0.97×), Match.value 2.67 µs; end to end, 6 paired runs, field-heavy Intersection +6.2% / Union −1.0% on the mean of means, medians the other way; load 7–160)`

### D-12-c — What `Intersection`'s output bytes depend on (C5)

- (i) **Leave as is.** Correct the two doc comments that over-claim
  (`Decision.ts:290-297`, `Evaluate.ts:454-458`).
- **(ii) Deterministic tie-break.** On `"Equal"`, keep the lexicographically
  smaller spec. This makes `intersectFields` byte-commutative and the n-ary
  fold byte-invariant under permutation (`probe2`/`probe6`: 21 and 12 failures
  out of 5000 drop to 0). Disclosure is unchanged (`probe2`: identical under
  `project` + `deepStrictEqual`). The pass-through when one side is `undefined`
  stays raw, so a single restricting child's array keeps the author's order.
- (iii) **Canonicalize every allow.** Sort and dedupe every `visibleFields`,
  leaves and `First` included. This is "complete" in the sense of one canonical
  form everywhere, but it changes the key order of every field-restricted
  projection users see (`project` follows spec order). It breaks
  `Layers.test.ts:143`'s "verbatim" guarantee and changes leaf `Allow` bytes,
  all for no disclosure gain. That is the one place where the more complete
  option is actually wrong.

**Recommendation: (ii)**, plus the doc correction from (i) where the text still
over-claims (the `undefined` pass-through is not sorted, so the right claim is
"independent of child order", not "canonical").
`status: decided (2026-10-05, (ii) plus the (i) doc correction — recommended default)`

### D-12-d — How `Simplify` decides a rewrite preserves fields (C4)

- **(i) Ask the lattice's laws.** Absorb a same-tag, same-strategy child when
  any of these holds:
  - the parent is `anyOf` (an empty `anyOf` child denies and contributes no
    field set);
  - the child is non-empty;
  - `fieldStrategyLaws(s).emptyIsUnit` is true (only `Intersection`).

  Replace a single-child composite with its child only when
  `fieldStrategyLaws(s).singletonIsIdentity` is true (the three known
  strategies, not an unknown value). Every simplification that is sound today
  is kept. The two unsound ones stop.
- (ii) Never absorb an empty composite child under any strategy, and never
  unwrap an unknown strategy. Simpler, but it gives up a sound `Intersection`
  flatten, and Simplify keeps its own copy of the reasoning.
- (iii) Change `mergeFields(Union, [])` to `[]` (Union's real unit), and still
  use (i) for `First`. This makes the algebra textbook-correct, but it changes
  `evaluate`'s output for `allOf([], { fieldStrategy: "Union" })` from every
  field to none. That is a narrowing behavior change against a pinned test, and
  it needs its own ADR.

**Recommendation: (i).** T2 lands it test-first with local predicates in
`Simplify.ts`, so it ships alone. T7 re-points them at `fieldStrategyLaws`.
`status: decided (2026-10-05, (i) — recommended default)`

### D-12-e — Where the "may an `anyOf` stop at its first allow" fact lives

- **(i) The lattice owns it as `decidedByFirst`.** `ShortCircuit.anyOfStopsAtAllow`
  becomes `fieldStrategyLaws(strategy).decidedByFirst`. ADR-QD-077 holds:
  both interpreters still read the stop rule from `ShortCircuit.ts`. The
  fail-closed answer is the lattice's, so C3 cannot recur.
- (ii) Delete `anyOfStopsAtAllow`, and have `Evaluate`/`Predicate` read the
  lattice directly. One hop fewer, but it reverses ADR-QD-077 / D-01-f's single
  home for stop rules.
- (iii) Keep `ShortCircuit`'s own table, hardened by T1. Two modules then hold
  two facts about one strategy.

**Recommendation: (i).**
`status: decided (2026-10-05, (i) — recommended default)`

### D-12-f — An unknown `combining` value (C9, sibling finding)

- **(i) Fail closed to `DenyOverrides`** (the most restrictive algorithm), in
  this plan as T3. Same file as T1, same fix shape.
- (ii) Document today's behavior (an unknown value walks like
  `FirstApplicable`) and only make the lookup's return honest (`undefined`, not
  a prototype function). T1 already does that part.
- (iii) Out of scope: file it for ARCH-01's owner.

**Recommendation: (i).** It is a one-row change with the same reachability
class as C3/CM-07. `DenyOverrides` is the only choice that cannot permit
something the author's real algorithm would deny, which fits the
fail-closed-unknown rule this plan applies to strategies.
`status: decided (2026-10-05, (i) — recommended default)`

## 6. Tasks

### T1 — An unknown strategy never short-circuits an `anyOf` (test-first defect fix, C3)
- **Status:** [x] done (84d918e)
- **Depends on:** —
- **Files:** `packages/core/test/Evaluate.test.ts`, `packages/core/test/ShortCircuit.test.ts`, `packages/core/src/ShortCircuit.ts`
- **Steps:**
  1. In `Evaluate.test.ts`'s `describe("field visibility")`, next to the CM-07 test (around `:1111`), add:
     ```ts
     it.effect("an anyOf whose strategy names an Object.prototype member grants no fields (C3)", () =>
       Effect.gen(function* () {
         for (const raw of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
           const bogus: P.FieldStrategy = JSON.parse(JSON.stringify(raw));
           const d = yield* evaluate(
             P.anyOf([P.hasRole("a"), P.hasRole("b", { fields: ["x"] })], { fieldStrategy: bogus }),
           );
           assert.isTrue(isAllowed(d), raw);
           if (d._tag !== "Allow") return;
           assert.deepStrictEqual(d.visibleFields, [], raw);
           assert.strictEqual(d.trace.children.length, 2, `${raw}: must see every child`);
         }
       }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a", "b"] })))));
     ```
  2. In `ShortCircuit.test.ts`, add `"a value outside the union never stops early — not even a prototype key"`. For each of `"Xor"` and the four keys above, `assert.strictEqual(anyOfStopsAtAllow(bogus), false)`.
  3. Run both. Confirm they fail: `expected undefined to deeply equal []` and `children.length 1`, and `anyOfStopsAtAllow` returns a function, an object or `undefined`.
  4. In `ShortCircuit.ts`, change `anyOfStopsAtAllow` to
     `Object.hasOwn(STOPS_AT_ALLOW_BY_STRATEGY, strategy) && STOPS_AT_ALLOW_BY_STRATEGY[strategy]`.
     Apply the same guard to `rulesDecisiveEffect` (`Object.hasOwn(…) ? DECISIVE_EFFECT_BY_COMBINING[combining] : undefined`), so its return type stops lying. What an unknown combining *means* is T3.
  5. Correct the module doc (`:17-23`) and `anyOfStopsAtAllow`'s doc (`:40-42`): "a value outside the union, including a key `Object.prototype` supplies, reads as `false`". Cite `CCR-QD-NEXT` and BEH-QD-035's predecessor sentence.
- **Tests:** two new tests (red → green). The CM-07 test and `ShortCircuit.test.ts`'s row tests stay unchanged and green.
- **Verify:** `pnpm exec vitest run --project core packages/core/test/ShortCircuit.test.ts packages/core/test/Evaluate.test.ts packages/core/test/Predicate.test.ts`
- **Done when:** both new tests failed before step 4 and pass after it. Shippable on its own.

### T2 — `simplify` preserves `visibleFields` for empty children and unknown strategies (test-first defect fix, C4)
- **Status:** [x] done (47af632)
- **Depends on:** D-12-d
- **Files:** `packages/core/test/Simplify.test.ts`, `packages/core/src/Simplify.ts`
- **Steps:**
  1. Add `describe("INV-QD-024 counterexamples (C4)")` with one `it.effect` per row of §1 C4's table, plus the two `"Xor"` single-child rows from `probe5`. Use the existing `subjectWith`/`testLayer`/`evaluate` pattern (`Simplify.test.ts:24-40`). Each asserts `evaluate(simplify(p)).visibleFields` deep-equals `evaluate(p).visibleFields`, and `isAllowed` is equal. Build the `"Xor"` strategy with `JSON.parse('"Xor"')` into a `P.FieldStrategy` const.
  2. Run the tests. Confirm the `Union`/`First` empty-child rows and both `"Xor"` rows fail, and the `Intersection` and `anyOf` rows pass.
  3. Under D-12-d(i), change `absorbable` (`Simplify.ts:41-46`) to also require
     `tag === "AnyOf" || child.policies.length > 0 || fieldStrategy === "Intersection"`.
     Gate both single-child unwraps (`:117`, `:125`) on the strategy being one of the three known values. Add a module-local
     `const KNOWN: Readonly<Record<FieldStrategy, true>> = { Intersection: true, Union: true, First: true }`
     read through `Object.hasOwn`. T7 replaces both with `fieldStrategyLaws`.
  4. Rewrite `absorbable`'s doc (`:22-40`). Associativity is necessary. An empty child is safe to absorb only where `undefined` (what an empty `allOf` grants) is the merge's unit, which is `Intersection` alone: it is `Union`'s absorbing element, and `First` has no unit. Keep the `allOf([a, allOf([b,c],{Union})],{Intersection})` example.
  5. If D-12-d chose (ii) or (iii), adjust step 3 accordingly (for (iii) also change `mergeFields`' `Union` arm and the `Layers.test.ts` expectation, under an ADR).
- **Tests:** seven new example tests (red → green for five). The existing INV-QD-024 property and idempotence property stay green. The vacuity guard (`shrunk > 10`) must still hold: re-measure, and if the count drops, record the new figure beside the threshold as JH-06 asks.
- **Verify:** `pnpm exec vitest run --project core packages/core/test/Simplify.test.ts`
- **Done when:** the five previously failing rows pass, every existing `Simplify.test.ts` test passes, and the change ships alone.

### T3 — An unknown `combining` fails closed to `DenyOverrides` (test-first, C9)
- **Status:** [x] done (c5ab5ff; also routed `toPredicate`'s plan through `effectiveCombining` — `formulaFor` threw a `MatchError` on an unknown value)
- **Depends on:** D-12-f (skip this task under (ii) or (iii); T1 already made the lookup honest)
- **Files:** `packages/core/test/Rules.test.ts`, `packages/core/test/ShortCircuit.test.ts`, `packages/core/src/ShortCircuit.ts`, `packages/core/src/Evaluate.ts` (only if the walk needs the effective algorithm, see step 3), `packages/core/src/Predicate.ts` (same)
- **Steps:**
  1. In `Rules.test.ts`, add `"a rule table with an unknown combining denies where DenyOverrides would (C9)"`. Roles `a, b`; rows `[permitWhen(hasRole("a")), denyWhen(hasRole("b"))]`; combining in turn `"Xor"` and `"toString"` (via `JSON.parse`). Expect `Deny`, with the deciding row index equal to the `DenyOverrides` run's index. Confirm red (today: `Allow`).
  2. In `ShortCircuit.ts`, add `effectiveCombining(c: Combining): Combining`, which returns `c` when `Object.hasOwn(DECISIVE_EFFECT_BY_COMBINING, c)` and `"DenyOverrides"` otherwise. Make `rulesDecisiveEffect` read through it.
  3. Read how `evaluateRules` (`Evaluate.ts:1090+`) and `Predicate.ts:721` pick the deciding row once the walk stops. If either also branches on `policy.combining` beyond `rulesDecisiveEffect`, route that read through `effectiveCombining` too, so both interpreters agree (the walk-equality property in `Predicate.test.ts` checks this).
  4. Add a `ShortCircuit.test.ts` row: `rulesDecisiveEffect(bogus) === "Deny"` for each bogus value.
- **Tests:** two new tests (red → green). `Rules.test.ts` and `Predicate.test.ts` stay green.
- **Verify:** `pnpm exec vitest run --project core packages/core/test/Rules.test.ts packages/core/test/ShortCircuit.test.ts packages/core/test/Predicate.test.ts`
- **Done when:** the unknown-combining test passes and the interpreter walk-equality property is green.

### T4 — Pin today's merge and measure today's dispatch (characterization and benchmark baseline)
- **Status:** [x] done (04dd55c; step 3 skipped — superseded by ARCH-13 T1; the oracle reimplements the frozen switch with `Match` plus `orElse` so no `switch` enters a test file)
- **Depends on:** — (run after T1–T3 if they landed, so the baseline includes them)
- **Files:** `packages/core/test/FieldLattice.oracle.test.ts` (*new, temporary*, deleted in T8), `packages/core/bench/Evaluate.bench.ts`, `packages/core/bench/Dispatch.bench.ts`
- **Steps:**
  1. **Frozen oracle.** Copy today's `mergeFields` body (`Evaluate.ts:430-484`) verbatim into `FieldLattice.oracle.test.ts` as `oracleMerge`, plus today's `intersectFields`/`unionFields` (`Decision.ts:299-354`) as `oracleIntersect`/`oracleUnion`. Mark the file "frozen copy for ARCH-12, delete in T8".
  2. **Through-the-evaluator differential.**
     - Generate `(strategy ∈ {Intersection, Union, First}, sets: Array<VisibleFields>)` with 1–5 sets over `Decision.test.ts`'s field alphabet (`:79-93`).
     - Build `allOf(sets.map(leafWith))`, where `leafWith(s)` is `hasRole("r")` with `fields: s` when `s` is defined. Evaluate it under a subject with role `r`.
     - Assert `visibleFields` deep-equals `oracleMerge(strategy, sets)`.
     - Do the same for `anyOf` with `Intersection`/`Union`. `First` short-circuits, so assert it equals `sets[0]`.

     This passes at `e0ee958`. It is the oracle the move is checked against. Use `FastCheck.sample`, `numRuns: 300`, a fixed seed.
  3. **(Superseded by ARCH-13 T1, the orchestrator's note of 2026-10-05.** ARCH-13 T1 fixes all six single-benchmark `bench.compare` calls, both in `Evaluate.bench.ts` and in `DecisionCache.bench.ts`. Land it first; this step then only checks that `pnpm bench` reports 7/7.) **Fix the two failing benches** (§1 C10): rewrite `filter — 500 items` and `decideSubjects — 500 subjects` (`Evaluate.bench.ts:250-266`) to vitest 5's single-bench form, as the error message suggests (`bench(name, fn, options).run()` or the file's equivalent). Confirm `pnpm bench` reports 7/7.
  4. **Union workload.** Add `fieldHeavyUnion = anyOf(<the same eight hasPermission arms as fieldHeavy>, { fieldStrategy: "Union" })` and `bench("field-heavy — anyOf of 8 under Union", …)` to the `evaluate` compare group. Document it like `fieldHeavy` (`:176-188`): it is the only workload that reaches the inline `Union` path.
  5. **Dispatch.** In `Dispatch.bench.ts`, add `test("mergeFields — one dispatch", …)` comparing three forms over a fixed rotation of the three strategies (as `refs` rotates arms, `:101-113`), each merging the same small `sets`:
     - `switch`, transcribed from `mergeFields`;
     - an own-property table (`Object.hasOwn` + row call);
     - `Match.value` per call.
     Arms return the real `intersectFields`/union results so the work stays realistic. The header must state that this exists for D-12-b.
  6. Run `pnpm bench` 3 times on one machine, same day. Record the means of means for `one node`, `wide`, `field-heavy (Intersection)`, `field-heavy (Union)` and the three dispatch forms in this plan's §10 and in the draft CCR text.
- **Tests:** one temporary differential property (green at HEAD). Two bench fixes and two bench additions (benches are type-checked by `tsconfig.test.json`, AGENTS §15 / ADR-QD-034).
- **Verify:** `pnpm exec vitest run --project core packages/core/test/FieldLattice.oracle.test.ts`; `pnpm bench` (×3); `pnpm typecheck`
- **Done when:** the oracle property passes at HEAD, `pnpm bench` runs 7/7 tests in `Evaluate.bench.ts` plus the new dispatch test, and the baseline numbers are written down. D-12-b can now be decided on numbers.

### T5 — Deterministic `Equal` tie-break in `intersectFields` (test-first, C5)
- **Status:** [x] done (175ec64)
- **Depends on:** D-12-c (skip steps 3–4 under (i); do only step 5's doc correction)
- **Files:** `packages/core/test/Decision.test.ts`, `packages/core/src/Decision.ts`
- **Steps:**
  1. Add `"PROPERTY: intersectFields is byte-for-byte commutative"` (`assert.deepStrictEqual(intersectFields(a,b), intersectFields(b,a))`, the existing `visibleFields` arbitrary, 300 runs, seed 2026). Add `"PROPERTY: an n-ary Intersection fold is byte-for-byte independent of input order"`: 1–5 sets, a seeded permutation, and `reduce(intersectFields, undefined)` on both orders.
  2. Add the example `intersectFields(["title"], ["title.**"])` deep-equals `intersectFields(["title.**"], ["title"])` deep-equals `["title"]`.
  3. Confirm red: the probe saw 21/5000 and 12/5000 failures; the example gives `["title.**"]` vs `["title"]`.
  4. In `intersectFields` (`Decision.ts:313-318`), on `cmp === "Equal"` push `specA.spec < specB.spec ? specA.spec : specB.spec`. Split `CONTAINMENT_KEEP`'s `"Equal"` out of `whenOr("Equal","BLessA")` into its own `"Either"` result so the hoisted matcher stays exhaustive. `ContainmentKeep` becomes the closed union `"A" | "B" | "Either" | undefined`.
  5. Correct the doc comments that over-claim. `Decision.ts:286-297`: the order is independent of operand order, and an `undefined` pass-through keeps the other operand's array as authored. Update `Decision.test.ts:153-174`'s comment, which said nothing claims representative-stability: now something does, and these properties pin it.
- **Tests:** two properties and one example (red → green). The existing "commutative/associative in what it discloses" and "never widens" properties stay green.
- **Verify:** `pnpm exec vitest run --project core packages/core/test/Decision.test.ts packages/core/test/Evaluate.test.ts packages/core/test/TraceDiff.test.ts`
- **Done when:** the three new checks pass, nothing else changes, and T4's oracle file is updated in the same commit. `oracleIntersect` takes the tie-break, so the oracle tracks intended behavior; note this in the file header.

### T6 — Create `FieldLattice.ts`: one module for the lattice and every strategy's meaning
- **Status:** [x] done (79fbcd3, committed with T7, T8 and T10)
- **Depends on:** D-12-a, D-12-b (after T4's numbers), D-12-e; T5 (or D-12-c(i))
- **Files:** `packages/core/src/FieldLattice.ts` (*new*), `packages/core/src/Decision.ts`, `packages/core/src/FieldPath.ts` (comments only), `packages/core/src/Obligation.ts` (comment only), `packages/core/src/Policy.ts` (doc comment on `FieldStrategy` only)
- **Steps** (written for D-12-a = A, D-12-b = (b), D-12-e = (i); §5 notes the variants):
  1. **Module header** (AGENTS doc-comment shape). Line one: "The field-visibility lattice, and what each `FieldStrategy` means over it." Then the why:
     - `undefined` is top, `[]` is a real restriction (move `VisibleFields`'s doc, `Decision.ts:206-245`, here);
     - a value outside the union fails closed to `[]` (ADR-QD-034, CM-07, this plan's C3);
     - the history: meaning used to live in `Evaluate.ts` and the operations in `Decision.ts`.
  2. **Move verbatim** from `Decision.ts`: `VisibleFields`, `ContainmentKeep`/`CONTAINMENT_KEEP`, `intersectFields` (with T5's tie-break) and `unionFields`, with their doc comments. Reword the `unionFields` doc's "`mergeFields`'s own `Union` arm (`Evaluate.ts`)" to point at this module.
  3. **Add the laws type** (closed, every field documented):
     ```ts
     /** What a field strategy means, as data its consumers read rather than restate. */
     export interface StrategyLaws {
       /** Merges allowing children's field sets, in declaration order. */
       readonly merge: (sets: ReadonlyArray<VisibleFields>) => VisibleFields;
       /** The merge depends on the first input alone, so an anyOf may stop at its first allow (ADR-QD-013). */
       readonly decidedByFirst: boolean;
       /** merge([]) — top — is the merge's unit, so an empty nested composite may be absorbed (Simplify). */
       readonly emptyIsUnit: boolean;
       /** merge([x]) discloses exactly x, so a one-child composite may be replaced by its child (Simplify). */
       readonly singletonIsIdentity: boolean;
     }
     ```
  4. **Add the rows.**
     - `Intersection`: `merge` is `sets.reduce(intersectFields, undefined)`; `decidedByFirst: false`; `emptyIsUnit: true`; `singletonIsIdentity: true`.
     - `Union`: `merge` is the single-`Set` accumulation moved verbatim from `Evaluate.ts:438-459`, keeping its "four allocations per iteration" comment; `decidedByFirst: false`; `emptyIsUnit: false`; `singletonIsIdentity: true`.
     - `First`: `merge` is `sets.length === 0 ? undefined : sets[0]`; `decidedByFirst: true`; `emptyIsUnit: false`; `singletonIsIdentity: true`.

     Type the table `Readonly<Record<FieldStrategy, StrategyLaws>>`.
  5. **Add the fail-closed row** as a named constant: `merge: () => []`, all three flags `false`. Move the CM-07 comment from `Evaluate.ts:463-479` here, condensed. It must say why `[]` and not `undefined`, and why prototype keys are excluded (C3).
  6. **Export the two entry points.**
     - `export const fieldStrategyLaws = (strategy: FieldStrategy): StrategyLaws => (Object.hasOwn(LAWS, strategy) ? LAWS[strategy] : FAIL_CLOSED);`
     - `export const mergeFields = (strategy: FieldStrategy, sets: ReadonlyArray<VisibleFields>): VisibleFields => fieldStrategyLaws(strategy).merge(sets);`
     - Its doc states the contract: never grants a field no input granted; an empty input is top for the three known strategies; `[]` for anything else.
  7. **Under D-12-b(a) instead:** `mergeFields` keeps the `switch` (moved verbatim, `default` arm included), and `LAWS` rows omit `merge`. Name the function exactly `mergeFields` so `SWITCH_BUDGET_NAMES` matches.
  8. **`Decision.ts`:** delete the moved block (`:205-355`). Add `export { intersectFields, mergeFields, unionFields } from "./FieldLattice.ts";` and `export type { VisibleFields } from "./FieldLattice.ts";`. Keep `import type { VisibleFields }` for `Trace`/`Allow`. Drop `Match`, `Containment`, `compareShapes`, `shapeOf` imports if now unused; keep `projectPaths` for `project`. Under D-12-a(B), omit `mergeFields` from the re-export.
  9. Re-point the comments: `FieldPath.ts:51,92-97,133` and `Obligation.ts:56` ("`FieldLattice.ts`'s `intersectFields`"); `Policy.ts:49-58` (`FieldStrategy`'s doc points at `FieldLattice.ts` for the laws).
- **Tests:** none in this task. T7 rewires consumers and T8 adds the interface tests. Commit T6–T7 together so every commit compiles and is green.
- **Verify:** `pnpm typecheck` (expect errors only in `Evaluate.ts` until T7)
- **Done when:** `FieldLattice.ts` compiles, `Decision.ts` holds no lattice implementation (§2 criterion 3, second grep), and `@qadi/core` still exports `intersectFields`/`unionFields`/`VisibleFields`.

### T7 — Rewire the adapters: `Evaluate`, `ShortCircuit`, `Simplify`, `Explanation`; update the switch budget
- **Status:** [x] done (79fbcd3)
- **Depends on:** T6
- **Files:** `packages/core/src/Evaluate.ts`, `packages/core/src/ShortCircuit.ts`, `packages/core/src/Simplify.ts`, `packages/core/src/Explanation.ts` (comment), `packages/core/src/SinkCodec.ts` (comment at `:255`), `scripts/check-house-style.mjs`, `AGENTS.md`
- **Steps:**
  1. **`Evaluate.ts`.**
     - Delete `mergeFields` (`:422-484`).
     - Replace `import { Allow, Deny, intersectFields } from "./Decision.ts"` (`:28`) with `import { Allow, Deny } from "./Decision.ts"` and `import { mergeFields } from "./FieldLattice.ts"`. Take `VisibleFields` from `./FieldLattice.ts` as a type import.
     - The calls at `:857` and `:1010` are unchanged.
     - Add one line above `stepAnyOf`'s early return (`:995`) citing `fieldStrategyLaws(...).decidedByFirst`: under it, `merge([x])` is `x`, so returning `trace.visibleFields` is the merge. Don't add a call: it would allocate on the hot path.
     - Drop the now-unused `FieldStrategy` type import if nothing else uses it.
  2. **`ShortCircuit.ts`** (D-12-e(i)): delete `STOPS_AT_ALLOW_BY_STRATEGY`. `anyOfStopsAtAllow = (strategy) => fieldStrategyLaws(strategy).decidedByFirst`. Its doc says the fact belongs to the lattice and this is the stop-rule home ADR-QD-077 names. Keep T1's tests as written; they now test the adapter. Leave `rulesDecisiveEffect` (and T3's `effectiveCombining`) here.
  3. **`Simplify.ts`** (D-12-d(i)): replace T2's `KNOWN` table and inline `Intersection` check with `fieldStrategyLaws(fieldStrategy).emptyIsUnit` and `.singletonIsIdentity`. Keep the `tag === "AnyOf"` clause: it is a combinator fact, not a lattice fact. Update the doc to cite the law names.
  4. **`Explanation.ts:430-434`**: re-point "`mergeFields` (`Evaluate.ts`) already agrees…" to `FieldLattice.ts`'s `singletonIsIdentity` and its empty-input rule. Prose (`fieldStrategyText`) is unchanged.
  5. **`SinkCodec.ts:255`**: the comment cites §5a's "`resolveRef`/`mergeFields`" guard. Under (b), drop `mergeFields` from it; under (a), keep it.
  6. **Switch budget, same commit.**
     - Under (b): `SWITCH_BUDGET["packages/core/src/Evaluate.ts"]` becomes `1` with the comment `` `evaluateNode` on `policy._tag` ``, and `SWITCH_BUDGET_NAMES` becomes `["evaluateNode"]`. In AGENTS.md §5a, delete the `mergeFields` table row; change "**Four switches remain unconverted**" to "**Three …**"; in "All four run once per…" and "Each of these switches must remain exhaustive…", keep `mergeFields`' history as history ("was the fourth; ARCH-12 replaced it with `FieldLattice.ts`'s law table, whose fail-closed row is reachable and tested"). Do not rewrite the ADR-QD-034 story.
     - Under (a): move the count and the name to `"packages/core/src/FieldLattice.ts": 1` / `["mergeFields"]`, and change the §5a row to "`FieldLattice.ts` — `mergeFields`".
  7. Run the full core suite. T4's oracle property must pass unchanged. That is the proof the move preserved behavior, with T5's tie-break already folded into the oracle.
- **Tests:** none new. Every existing test passes, including T4's oracle differential.
- **Verify:** `pnpm typecheck && pnpm lint && pnpm circular && pnpm exec vitest run --project core --testTimeout=60000`
- **Done when:** §2 criteria 3 and 7 hold, the house-style gate passes, and T4's differential is green.

### T8 — Test the lattice at its interface; delete what it replaces (replace, don't layer)
- **Status:** [x] done (deviated: `FieldLattice.ts` coverage not measured in isolation — `pnpm coverage` is deferred to the final gate; by inspection every branch is exercised; 79fbcd3)
- **Depends on:** T7
- **Files:** `packages/core/test/FieldLattice.test.ts` (*new*), `packages/core/test/Decision.test.ts`, `packages/core/test/Evaluate.test.ts`, `packages/core/test/Layers.test.ts`, `packages/core/test/FieldLattice.oracle.test.ts` (*deleted*)
- **Steps:**
  1. **Move** `Decision.test.ts`'s `describe("field lattice")` (`:18-244`, examples, the PERFORMANCE spy test and every PROPERTY), plus T5's three checks, into `FieldLattice.test.ts`. Change imports to `../src/FieldLattice.ts`. Keep `project` from `../src/Decision.ts` for the disclosure helper. Leave `describe("project")` and `describe("TraceSchema's tag list")` in `Decision.test.ts`.
  2. **Add per-row law tests**, which kill what `ignoreStatic` won't mutate. One `it` per strategy asserts its three flags exactly (`assert.strictEqual(…, true|false)`). One `it` asserts the fail-closed row for `"Xor"`, `"toString"`, `"constructor"`, `"__proto__"`, `"hasOwnProperty"` and `""` (all via `JSON.parse`): all flags `false`, `merge` gives `[]` for `[undefined]`, `[["a"]]` and `[]`.
  3. **Add n-ary properties over `mergeFields`** (`FastCheck.sample`, 300 runs, fixed seeds; sets of length 0–5 over the existing alphabet):
     - *Union fast path ≡ pairwise fold* (bytes): `mergeFields("Union", sets)` deep-equals `sets.reduce(unionFields)` with the first set normalized. This is what licenses keeping the fast path.
     - *Intersection ≡ pairwise meet* (bytes): `mergeFields("Intersection", sets)` deep-equals `sets.reduce(intersectFields, undefined)`.
     - *Order independence* (bytes): `Intersection` and `Union` over a permutation are equal (needs T5).
     - *Idempotence* (disclosure): `mergeFields(s, [x, x])` discloses what `x` does, for every known `s`.
     - *`First` is order-sensitive*: `mergeFields("First", [a, b])` is `a` by reference (`assert.strictEqual`). A counterexample with `a ≠ b` shows `[b, a]` differs. `First` is the one strategy the order law must *not* hold for.
     - *Bounded by its inputs* (disclosure, the ADR-QD-034 direction): for every known `s` and non-empty `sets`, `project(mergeFields(s, sets))` is a projection subset of `project(sets.reduce(unionFields))`. Reuse `isProjectionSubset`.
     - *The laws are true*:
       - for every `s` with `emptyIsUnit`, `mergeFields(s, [...A, mergeFields(s, []), ...C])` discloses what `mergeFields(s, [...A, ...C])` does;
       - for every `s` without it, assert a fixed counterexample exists (`Union`: `A=[["a"]]`, `C=[]`; `First`: `A=[]`, `C=[["a"]]`);
       - `decidedByFirst` implies `mergeFields(s, sets) === sets[0]`;
       - `singletonIsIdentity` implies `mergeFields(s, [x])` discloses `x`.
     - *Empty input*: `mergeFields(s, [])` is `undefined` for the three known strategies.
  4. **Delete** the tests the properties replace:
     - `Evaluate.test.ts` `"AnyOf/Union dedupes overlapping fields across three or more allowing children"` (around `:1047`) and `"AnyOf/Union stays absorbing on undefined even with other sets ahead of it"` (around `:1078`). Both test `mergeFields`' Union implementation through the evaluator, which the fast-path ≡ fold property now covers.
     - `Layers.test.ts` `"Union absorbs to all-fields when one branch is unrestricted"` (`:106-116`) and `"AllOf/First takes the first child's path-shaped field set verbatim, unmerged"` (`:143-160`). The first is a lattice law; the second is `First`'s by-reference law.

     **Keep** the wiring tests, one per combinator × strategy family (`Evaluate.test.ts` `"AllOf/Intersection keeps only fields…"`, `"AnyOf/Union merges…"`, `"AnyOf honours an explicit Intersection…"`, `"AllOf/Intersection merges path-shaped fields…"`; `Layers.test.ts` `"AllOf accepts an explicit First strategy…"`, `"AllOf with no children…"`, `"Union over an empty allow set is unreachable…"`). Keep the CM-07 test and T1's test as evaluator-level regressions. Rename the CM-07 test to say "a strategy outside the union", since there is no `default` arm any more under (b).
  5. **Delete** `FieldLattice.oracle.test.ts`. Before deleting, run it once more and confirm green. Record "oracle green at T7, deleted at T8" in §10.
  6. **Traceability for the test file.** The `spec/traceability.md` test-file row is added in T11; note `FieldLattice.test.ts` → BEH-QD-018, INV-QD-004, INV-QD-NEXT there.
- **Tests:** as above. Net effect: one interface test file; four evaluator/Layers tests and the oracle file deleted.
- **Verify:** `pnpm exec vitest run --project core packages/core/test/FieldLattice.test.ts packages/core/test/Decision.test.ts packages/core/test/Evaluate.test.ts packages/core/test/Layers.test.ts`; then `pnpm coverage` (with `--testTimeout=60000` if `FieldPath.test.ts` times out, per README)
- **Done when:** all green, `FieldLattice.ts` has 100% line and branch coverage, and `grep -c "FieldLattice.oracle" -r packages/core/test` prints `0`.

### T9 — Make the INV-QD-024 property find C4's class on its own
- **Status:** [x] done (f507713)
- **Depends on:** T2 (and T7, so it exercises the law-driven code)
- **Files:** `packages/core/test/Simplify.test.ts`
- **Steps:**
  1. In the `tree` arbitrary (`:195-217`), add one more `oneof` arm: a same-strategy pair, `FastCheck.tuple(strategies, FastCheck.array(tie("node"), { maxLength: 2 }), FastCheck.boolean()).map(([s, rest, emptyFirst]) => P.allOf(emptyFirst ? [P.allOf([], { fieldStrategy: s }), ...rest] : [...rest, P.allOf([], { fieldStrategy: s })], { fieldStrategy: s }))`, plus the `anyOf` analogue. Add one leaf arm carrying a `fields`-restricted role the subjects hold (`hasRole("editor", { fields: ["id"] })`), so the empty-child cases reach an *allowing* outcome with a restriction to lose.
  2. Add a vacuity counter: the number of sampled trees containing a `Union`/`First` `allOf` with an empty same-strategy child. Assert it is above a measured floor, and record the measured figure beside it (JH-06 discipline, `:268-278`).
  3. Prove the property would have caught C4. On a scratch revert of T2's `absorbable` guard, the property must fail; record the seed and counterexample in the test's comment. Do not commit the revert.
  4. Re-measure the existing `shrunk > 10` guard and update its comment if the count moved.
- **Tests:** strengthened property and new vacuity guard.
- **Verify:** `pnpm exec vitest run --project core packages/core/test/Simplify.test.ts`
- **Done when:** both guards pass, and the property fails against the pre-T2 `absorbable` (checked once, recorded).

### T10 — Benchmark after, decide D-12-b's fallback if needed
- **Status:** [x] done (deviated: no second worktree — the pre-move `src` was copied into a temporary, uncommitted bench directory and paired with the post-move evaluator in one compare group per workload; 79fbcd3)
- **Depends on:** T7
- **Files:** none, or `packages/core/bench/Dispatch.bench.ts` (header text only, recording the outcome)
- **Steps:**
  1. Run `pnpm bench` 3 times on T4's machine, same day as a fresh re-run of T4's baseline on the parent commit, checked out in a second worktree. Compare the means of means for `one node`, `wide`, `field-heavy (Intersection)` and `field-heavy (Union)`.
  2. If `field-heavy` either way moved by more than 10% (beyond noise) and D-12-b took (b): switch to (a) by re-applying T6 step 7 and T7 step 6's (a) branch, then re-run. Record both sets of numbers.
  3. Write the measured table into `Dispatch.bench.ts`'s header for `mergeFields`, and into the CCR text (T11), in the same "ranges, not figures" style as ADR-QD-034.
- **Tests:** none.
- **Verify:** `pnpm bench`
- **Done when:** §2 criterion 8 is met or explained, and the numbers are recorded.

### T11 — Spec, ADR, CCR, overview, AGENTS, changeset
- **Status:** [x] done (fd4846f)
- **Depends on:** T1–T10
- **Files:** `spec/decisions/NNN-field-strategy-meaning-lives-beside-the-lattice.md` (*new*, `ADR-QD-NEXT`), `spec/decisions/index.yaml`, `spec/decisions/034-the-switch-exception-is-measured.md`, `spec/decisions/030-policy-simplification.md`, `spec/behaviors/03-policy-adt.md`, `spec/behaviors/05-evaluator.md`, `spec/behaviors/20-simplification.md`, `spec/behaviors/15-rules.md` (T3 only), `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md`, `spec/models/26-xacml.md`, `AGENTS.md` (already in T7; re-check), `.changeset/arch-12-field-lattice.md` (*new*)
- **Steps:**
  1. **ADR-QD-NEXT** ("A field strategy's meaning lives beside the field lattice"). Its sections:
     - **Context:** C1–C5.
     - **Decision:** the module, the law table (or the moved switch under D-12-b(a)), the tie-break, the public `mergeFields`, and Simplify's law-driven rewrites.
     - **Alternatives:** D-12-a…f options.
     - **Consequences:** `SWITCH_BUDGET` 4→3 (if (b)); the measured bench ranges from T4/T10; static law literals pinned by row tests under ADR-QD-076.

     Add the `index.yaml` entry.
  2. **ADR-QD-034 addendum** (if (b)): `mergeFields` is no longer a switch. Its fail-closed answer is a reachable, tested table row. The two-unguarded-switches finding is history. Cite T4/T10 numbers.
  3. **ADR-QD-030 amendment**: flatten requires a non-empty child unless the strategy's empty merge is its unit; unwrap requires a known strategy (C4).
  4. **`spec/behaviors/03-policy-adt.md` BEH-QD-018**:
     - REQUIREMENT: "A `fieldStrategy` value outside the union MUST grant no fields under both `allOf` and `anyOf`, and MUST NOT short-circuit an `anyOf`" (C3).
     - REQUIREMENT: "Under `Intersection` and `Union` the merged set MUST NOT depend on the order of the allowing children, byte for byte" (C5).
     - Add `mergeFields` to the signature listing (`ts` fence):
       `export const mergeFields: (strategy: FieldStrategy, sets: ReadonlyArray<VisibleFields>) => VisibleFields;`
     - Add a `typescript` example that compiles: `mergeFields("Union", [["a"], ["b"]])` deep-equals `["a","b"]`, and `mergeFields("First", [])` is `undefined`.
  5. **`behaviors/05-evaluator.md` BEH-QD-035**: one sentence. The stop rule reads `FieldLattice.ts`'s `decidedByFirst` through `ShortCircuit.ts`, and an unknown value never stops early. The predecessor's defect, "treated every other value as short-circuit", is now pinned by test.
  6. **`behaviors/20-simplification.md` BEH-QD-154**: refine the second REQUIREMENT, "flattened ONLY when both carry the same `fieldStrategy`, AND the nested composite is non-empty or that strategy's empty merge is its unit (`Intersection`)". Add "A composite whose `fieldStrategy` is outside the union MUST be left unchanged". Add C4's counterexample beside the existing `Union`-in-`Intersection` one.
  7. **`behaviors/15-rules.md`** (T3 only): an unknown `combining` decides as `DenyOverrides`.
  8. **`spec/invariants.md`**:
     - **INV-QD-004** Source becomes `FieldLattice.ts` (`intersectFields`, `unionFields`, `mergeFields`, the law table). Enforcement names `FieldLattice.test.ts`.
     - **INV-QD-003** Source (`:64-69`): replace "`Evaluate.ts`'s `POLICY_TAGS_BY_TAG`" with `Policy.ts`'s `POLICY_TAGS` (derived, ADR-QD-090) and `fieldsOf`/`childrenOf`. Replace "TS2366 in both `_tag` dispatch switches (`evaluateNode`, `mergeFields`…)" with `evaluateNode` (and `evaluateMatcher` in `Matcher.ts`) (C7).
     - **INV-QD-024** Enforcement: name T9's generator arm and vacuity guard.
     - **INV-QD-NEXT** "A merge discloses nothing its inputs did not, and a strategy outside the union discloses nothing at all". Source: `FieldLattice.ts`. Enforcement: T8's "bounded by its inputs" property and the fail-closed row test.
     - Add a Change History row.
  9. **`spec/traceability.md`**:
     - rows for INV-QD-004 (Source and tests), INV-QD-024, INV-QD-NEXT, ADR-QD-NEXT;
     - a test-file row `packages/core/test/FieldLattice.test.ts` → BEH-QD-018, INV-QD-004, INV-QD-NEXT;
     - remove `Decision.test.ts`'s claim to the lattice laws if its row lists them;
     - add a Change History row.
  10. **`spec/overview.md`**: line 169's row becomes `` `intersectFields`, `unionFields`, `mergeFields` | function | `FieldLattice.ts`, re-exported by `Decision.ts` ``. Line 170's `VisibleFields` source becomes the same. Add a "Not listed above" row for `fieldStrategyLaws`, `StrategyLaws` (`@qadi/core/FieldLattice.ts`): consumer-facing laws for `ShortCircuit`/`Simplify`, kept out of the barrel per §9, reachable through the `./*` wildcard.
  11. **`spec/models/26-xacml.md:242`**: "`mergeFields` in `Evaluate.ts`" becomes "`mergeFields` in `FieldLattice.ts`".
  12. **`spec/README.md`**: a `CCR-QD-NEXT` row listing the files above, the two (three, with T3) defects and the bench numbers.
  13. **Changeset** `.changeset/arch-12-field-lattice.md`: `"@qadi/core": minor`. The fixed group bumps the rest. Body:
      - new export `mergeFields`;
      - fix: an `anyOf` with an out-of-union strategy no longer grants every field (in-process values only);
      - fix: `simplify` no longer changes `visibleFields` for empty same-strategy children or unknown strategies;
      - behavior: `Intersection` picks the lexicographically smaller of two equivalent specs (`"title"` over `"title.**"`), so its output no longer depends on child order;
      - T3, if taken: an unknown `combining` decides as `DenyOverrides`.
- **Tests:** doc gates only.
- **Verify:** `pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api`
- **Done when:** all five pass, `grep -n "POLICY_TAGS_BY_TAG" spec/invariants.md` shows only history, and `grep -rn "mergeFields\` in \`Evaluate.ts" spec/models spec/behaviors spec/invariants.md` prints nothing.

### T12 — Full gate and mutation
- **Status:** [~] deferred to final integration gate
- **Depends on:** T11
- **Files:** none
- **Steps:**
  1. Run `pnpm check`. If `pnpm coverage` hits the known 5s `FieldPath.test.ts` timeout (README open item), re-run coverage with `--testTimeout=60000` and say so in the PR.
  2. Run `pnpm exec stryker run stryker.config.mjs`. Record the core score and per-file scores for `FieldLattice.ts`, `Decision.ts`, `ShortCircuit.ts`, `Simplify.ts` and `Evaluate.ts` in §10.
  3. For each survivor in `FieldLattice.ts`, either add a killing test or record why it is equivalent. Expected equivalents: the `sets.length === 0` check in the `Union` merge versus the loop's natural `undefined` (it is not equivalent, `[]` vs `undefined`, so it must be killed by the empty-input test); and `CONTAINMENT_KEEP`'s static body (not mutated, ADR-QD-076).
- **Tests:** none new beyond survivors.
- **Verify:** `pnpm check`; `pnpm exec stryker run stryker.config.mjs`
- **Done when:** `pnpm check` is green, core mutation ≥ 80 (break), and `FieldLattice.ts`/`Simplify.ts`/`ShortCircuit.ts` are no lower than their pre-plan per-file figures, or the CCR explains why.

## 7. Test strategy

**Survive unchanged:**
- the evaluator wiring tests (one per combinator and strategy family);
- `Layers.test.ts`'s empty-composite tests;
- `Explanation.test.ts`'s strategy-rendering tests (INV-QD-031);
- `Policy.test.ts`'s decode-rejection test (ADR-QD-006);
- `Simplify.test.ts`'s existing properties;
- `ShortCircuit.test.ts`'s row tests (now testing the adapter);
- `TraceDiff.test.ts`;
- the `features/field-visibility` BDD scenarios.

**Move to the new interface** (`FieldLattice.test.ts`): every lattice example and
property in `Decision.test.ts:18-244`. Their imports change; their assertions
don't.

**Deleted as redundant once the interface tests exist** (replace, don't layer):

- `Evaluate.test.ts` `"AnyOf/Union dedupes overlapping fields across three or more allowing children"`
- `Evaluate.test.ts` `"AnyOf/Union stays absorbing on undefined even with other sets ahead of it"`
- `Layers.test.ts` `"Union absorbs to all-fields when one branch is unrestricted"`
- `Layers.test.ts` `"AllOf/First takes the first child's path-shaped field set verbatim, unmerged"`
- the temporary `FieldLattice.oracle.test.ts` (T4 → T8)

**Added:**

- *Defect regressions (test-first):* T1 (evaluator and adapter), T2 (five
  simplify counterexamples, two of them widening), T3 (unknown combining).
- *Property:* in `FieldLattice.test.ts`:
  - Union fast path ≡ pairwise fold;
  - Intersection n-ary ≡ pairwise meet;
  - byte-level order independence (Intersection, Union);
  - `First`'s order-sensitivity and by-reference result;
  - idempotence;
  - bounded-by-inputs (disclosure, through `project`);
  - each law flag true where claimed, with a counterexample where denied;
  - fail-closed for six corrupt values.

  The T9 generator arm makes INV-QD-024 find C4's class unaided.
- *Differential:* T4's through-the-evaluator oracle against a frozen copy of
  today's `mergeFields`, kept green across T6–T7, then deleted (ARCH-02's
  pattern).
- *Mutation:* `pnpm exec stryker run stryker.config.mjs`.
  - `ignoreStatic` skips the law-table literals and `CONTAINMENT_KEEP`. T8's
    per-row tests pin those by example, as `ShortCircuit.test.ts` does for its
    own table today.
  - The merge functions run per call and are mutated. The bounded-by-inputs and
    fold-equivalence properties are what kill them.
- *Benchmark* (tool, not a gate, ADR-QD-034): T4 baseline and T10 after-run;
  `Dispatch.bench.ts` gains the `mergeFields` dispatch comparison.

## 8. Spec and documentation updates

All of these are in T11. In summary:

- **ADR-QD-NEXT** (new). **ADR-QD-034** addendum (switch count, if (b)).
  **ADR-QD-030** amendment (flatten and unwrap conditions).
- **BEH-QD-018**: two REQUIREMENTs and `mergeFields`, with a compiling example.
- **BEH-QD-035**: one sentence. **BEH-QD-154**: refined REQUIREMENT and a new one.
- **BEH (15-rules)**: T3 only.
- **INV-QD-004** Source. **INV-QD-003** Source corrected (stale since ARCH-02).
- **INV-QD-024** Enforcement. **INV-QD-NEXT**: a merge is bounded by its inputs,
  and an unknown strategy discloses nothing.
- **`spec/traceability.md`**: rows and Change History.
- **`spec/overview.md`**: the `mergeFields` row, the source moved to
  `FieldLattice.ts`, and a "Not listed above" row for
  `fieldStrategyLaws`/`StrategyLaws` (gate 13).
- **`spec/models/26-xacml.md`**: one file reference.
- **`spec/README.md`**: CCR-QD-NEXT.
- **AGENTS.md §5a**: table and prose, done in T7 with the budget.
- **Changeset**: `@qadi/core` minor.

## 9. Risks and rollback

| Risk | How it shows up | Rollback |
| --- | --- | --- |
| The table dispatch (D-12-b(b)) is slower on the hot path | T10: `field-heavy` means move by more than 10% against the same-day baseline | Take D-12-b(a): restore the `switch` inside `FieldLattice.ts` (T6 step 7, T7 step 6's (a) branch). The laws table stays. No other task changes. |
| The tie-break (T5) changes `Allow.visibleFields` bytes for users relying on the right-operand representative | Snapshot tests downstream, or audit-trail byte comparisons, differ for `"x"`/`"x.**"` pairs only. Disclosure is unchanged (`probe2`). Hydration compares verdicts only (`HydrationEngine.ts:66-75`), so no mismatch warnings. | Revert T5 alone. The oracle and properties then use the old tie (D-12-c(i)). It is independent of the move. |
| Simplify (T2) now flattens less, so users calling `simplify` get a deeper tree in the empty-child and unknown-strategy cases | `Simplify.test.ts`'s `shrunk` vacuity count drops. Downstream traces from simplified policies keep one more node. | Intended. The previous output was wrong (INV-QD-024). Rollback means reverting T2, which reintroduces a widening (`"Xor"` unwrap), so don't. |
| T3 changes verdicts for in-process-corrupted rule tables (Allow → Deny) | Only callers who build `Rules` with an unknown `combining` by hand. Decode already rejects these. | Revert T3 alone (D-12-f(ii)). T1's honest return stays. |
| A circular import through `Decision.ts` → `FieldLattice.ts` → `Policy.ts` | `pnpm circular` fails | `FieldLattice.ts` imports `Policy.ts` type-only, so madge's TS detective should not count it. If it does, declare `FieldStrategy`'s literal type locally from the schema via `typeof` in `Policy.ts` and import nothing at runtime. C11 already checked that `Policy.ts` never reaches back. |
| `@qadi/core/Decision` subpath consumers break | `pnpm spec:package` (gate 14) or a downstream import error | `Decision.ts` re-exports every moved name (C11's `tsc` probe). The subpath keeps working, and no in-repo consumer uses it. |
| ARCH-13 lands first and moves `finishAllOf`/`finishAnyOf` | T7's two call-site lines conflict | Re-apply the import change in ARCH-13's pure fold functions. The call shape `mergeFields(strategy, sets)` is unchanged. |
| Mutation score drops on `FieldLattice.ts` because law literals are static | The Stryker report shows fewer mutants than lines suggest, not survivors | Expected (ADR-QD-076). T8's per-row tests are the pin. Note it in the ADR's Consequences. |
| The benchmark harness itself (vitest 5) misreports | `bench.compare` errors (C10) or the getter-overhead warning | T4 step 3 fixes the two broken benches. Treat getter warnings as a constant across before and after, since both sides import through modules. |

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-05 | — | plan written | Claude (planning agent) |
| 2026-10-05 | T1 | `anyOfStopsAtAllow`/`rulesDecisiveEffect` guarded by `Object.hasOwn`; red tests (`toString: expected undefined to deeply equal []`; ShortCircuit `Xor: expected undefined to equal false`) then green | Claude (impl agent) |
| 2026-10-05 | T2 | five C4 rows red then green, two control rows green; `absorbable` gains the empty-child clause, unwrap gated on a known strategy; shrunk count unchanged at 17/120 | Claude (impl agent) |
| 2026-10-05 | T3 | `effectiveCombining` in `ShortCircuit.ts`; `Rules.test.ts`, `ShortCircuit.test.ts` and a new `Predicate.test.ts` test red then green. Extra finding: `toPredicate`'s `formulaFor` (`Match.exhaustive`) threw a `MatchError` on an unknown `combining`; the plan now carries `effectiveCombining(p.combining)` | Claude (impl agent) |
| 2026-10-05 | T4 | oracle differential green; `field-heavy — anyOf of 8 under Union` and `mergeFields — one dispatch` added. Baseline, 3 runs (load 7–110): dispatch switch 2.40 µs, table 2.33 µs, Match.value 2.67 µs (3 strategies + merge work); one node 9.1, wide 10.9, field-heavy Intersection 25.9, field-heavy Union 11.8 µs (mean of means) | Claude (impl agent) |
| 2026-10-05 | T5 | three checks red (`["title.**"]` vs `["title"]`), green after the `"Either"` tie-break; oracle takes the tie-break | Claude (impl agent) |
| 2026-10-05 | T6–T8 | `FieldLattice.ts` created; consumers rewired; `SWITCH_BUDGET` 4 → 3; `FieldLattice.test.ts` (28 tests); four replaced tests and the oracle deleted (oracle green at T7, deleted at T8); core 41 files / 1273 tests green | Claude (impl agent) |
| 2026-10-05 | T9 | generator arms + editor leaf; empty-child vacuity 30/120 (floor 15); shrunk 17 → 66 (floor 10 → 40); scratch revert of T2's clause fails the property on seed 1030 (counterexample recorded in the test) | Claude (impl agent) |
| 2026-10-05 | T10 | interleaved before/after first unusable (load spikes to 160: means of 300+ µs); then six paired runs (pre-move `src` copied into a temporary bench dir, one compare group per workload, gated on 1-min load ≤ 20): field-heavy Intersection 26.6 → 28.3 µs (+6.2%, one 41.6 µs outlier; median p75 24.2 → 22.3), Union 16.3 → 16.1 (−1.0%), one node 11.5 → 10.0, wide 12.1 → 11.6. Within ≤ 10%: (b) kept | Claude (impl agent) |
| 2026-10-05 | T11 | ADR-QD-092, CCR-QD-174, INV-QD-093; ADR-QD-030/034 amended; BEH-QD-018/035/112/154; INV-QD-003/004/024; traceability, overview, models 07/26; changeset `core-field-lattice.md`. Gates: spec:examples, spec:verify:strict, spec:api, spec:gates, spec:claims green | Claude (impl agent) |
| 2026-10-05 | T12 | deferred to the final integration gate (`pnpm check`, coverage, Stryker). Ran instead: typecheck, lint (3 declared switches), circular, tstyche, `pnpm test` (113 files / 2728 tests), test:bdd | Claude (impl agent) |
| 2026-10-05 | — | Out of scope, noted: `Explanation.ts`'s `combiningText`/`fieldStrategyText` use `Match.exhaustive` and throw on an in-process value outside the union when `explain` renders it (prose, not a decision; ADR-QD-092 Consequences) | Claude (impl agent) |
