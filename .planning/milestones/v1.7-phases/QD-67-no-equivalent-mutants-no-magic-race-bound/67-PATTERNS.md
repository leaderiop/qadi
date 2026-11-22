# Phase 67: No equivalent mutants, no magic race bound - Pattern Map

**Mapped:** 2026-11-21
**Files analyzed:** 8 (3 source/test, 1 bench, 2 harness copies, 1 scorer copy, spec records)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/core/src/DecisionCache.ts` (eviction, ~273-288) | service adapter | CRUD (FIFO) | itself; `Chunk.take/drop` usage already there | exact (edit in place) |
| `packages/core/src/SharedComputation.ts` (claim dispatch 297-335) | service | request-response / event | `FieldLattice.ts` LAWS table (T) or `SinkCodec.ts` `Match.type` (M) | role-match |
| `packages/core/test/DecisionCache.test.ts` (I5 test 1237-1309) | test | request-response | itself | exact (edit in place) |
| `packages/core/bench/DecisionCache.bench.ts` | bench | n/a | read-only; run unchanged | exact |
| `.planning/phases/QD-67-.../bench/ab.sh`, `analyze.mjs` | tooling | batch | `QD-66-.../bench/ab.sh`, `analyze.mjs` | exact copy + parameterise |
| `.planning/phases/QD-67-.../67-mutation.mjs` | tooling | batch | `QD-66-.../66-mutation.mjs` | exact copy + 2 fixes |
| `spec/behaviors/21-decision-cache.md`, `spec/invariants.md`, `spec/traceability.md`, CCR row | spec | n/a | Phase 66 records | exact |

## 1. Eviction (MUTE-01)

### Installed `effect` is 4.1.2 (`node_modules/effect/package.json`)

**`Chunk.splitAt`** (`node_modules/effect/src/Chunk.ts:3296`, impl at line 3355) is:
```ts
dual(2, <A>(self: Chunk<A>, n: number): [Chunk<A>, Chunk<A>] => [take(self, n), drop(self, n)])
```
`take` (Chunk.ts:~1038) and `drop` (~1131) both start with `const n = Count.normalize(_n)`.
- `take`: `n <= 0` returns empty; `n >= self.length` returns `self`.
- `drop`: `n <= 0` returns `self`; `n >= self.length` returns empty.

Exact behaviour:
- **Negative count:** `[empty, self]`. Nothing is evicted.
- **Count greater than size:** `[self, empty]`. Everything is "before".
- **Count 0:** `[empty, self]`.
- I did not read `Count.normalize`, so the non-integer and NaN behaviour is unverified. `capacity` is validated as an integer at construction, so the argument is always an integer.

**Orientation that matters.** `splitAt(order, n)` returns `[evicted = first n, kept = rest]`. This is the right way round for FIFO, because the head is the oldest.

**`HashMap.removeMany`** (`HashMap.ts:1697`, data-first `(self, keys: Iterable<K>)`; impl `internal/hashMap.ts:1156-1165`):
```ts
let result = self
for (const key of keys) { result = remove(result, key) }
return result
```
It takes any `Iterable`, and a `Chunk` is iterable. A missing key is a no-op via `remove`, so there is no impossible branch. Both names exist as the roadmap says.

**Repo usage:** `grep` finds NO use of `Chunk.splitAt` or `HashMap.removeMany` in `packages/*/src`. There is no in-repo precedent, so the installed source above is the authority.

### `Option` in `DecisionCache.ts`
Matches of `Option` in the file:
- line 22: `import * as Option from "effect/Option";`
- line 281: a comment ("The `Option` check exists...")
- line 287: `if (Option.isSome(oldest)) entries = ...`
- Lines 8, 28, 102 and 135 match only inside the words `serviceOption`, `EvaluateOptions` and `options`.

After the rewrite no code use remains, so the import (line 22) and the comment paragraph (lines 280-284) both go. `HashMap.get(entries, key)` at line 255 returns an `Option` but needs no import.

### Current code to replace (`DecisionCache.ts:264-288`)
```ts
if (options?.capacity === undefined) return;
insertionOrder = Chunk.append(insertionOrder, key);
// ... comment 266-272 (while vs if; terminates)
while (HashMap.size(entries) > options.capacity) {
  // ... comment 274-284
  const oldest = Chunk.head(insertionOrder);
  insertionOrder = Chunk.drop(insertionOrder, 1);
  if (Option.isSome(oldest)) entries = HashMap.remove(entries, oldest.value);
}
```
Lines 235-249 hold the `insertionOrder` comment ("Chunk.drop is O(1) amortized"). It stays true for `splitAt`, which is `take` plus `drop`.

Target shape. The surrounding `if (exit._tag === "Success")` and the `capacity === undefined` early return are unchanged:
```ts
const [evicted, kept] = Chunk.splitAt(insertionOrder, HashMap.size(entries) - options.capacity);
entries = HashMap.removeMany(entries, evicted);
insertionOrder = kept;
```
- The `while`-vs-`if` comment (a lowered capacity case) is now moot, because one split covers any excess.
- The new comment states `Chunk.size(insertionOrder) === HashMap.size(entries)` as the invariant, and that `splitAt` clamps a count `<= 0` to "evict nothing".
- Tests to keep unedited: "evicts the oldest completed entry once exceeded, insertion order (FIFO)" (`DecisionCache.test.ts:1156`), "never evicts a key with a compute still in flight" (1189), the capacity block at 1051-1154 (rejects negative, NaN and fractional; `capacity: 0` retains nothing; unset stays unbounded), and the I5 test.
- `capacity: 0` is the edge case: `size - 0 = size`, so everything is evicted. This is covered by the test at line 1119.

## 2. Arm table precedent and per-call Match

### `FieldLattice.ts` (own-property law table, ADR-QD-092)
Row type (`FieldLattice.ts:254`) and table (`:320-351`):
```ts
const LAWS: Readonly<Record<FieldStrategy, StrategyLaws>> = {
  Intersection: { merge: mergeIntersection, decidedByFirst: false, emptyIsUnit: true, singletonIsIdentity: true },
  Union: { ... }, First: { ... },
};
const FAIL_CLOSED: StrategyLaws = { merge: () => [], decidedByFirst: false, emptyIsUnit: false, singletonIsIdentity: false };
```
The read (`:375-383`):
```ts
export const isFieldStrategy = (value: unknown): value is FieldStrategy =>
  typeof value === "string" && Object.hasOwn(LAWS, value);
export const fieldStrategyLaws = (strategy: FieldStrategy): StrategyLaws =>
  isFieldStrategy(strategy) ? LAWS[strategy] : FAIL_CLOSED;
```
- `Record<Union, Row>` makes a missing row TS2741.
- `Object.hasOwn` is used instead of `in`, because inherited keys such as `"toString"` would read as a row (CCR-QD-174).
- The fail-closed row is for values outside the union, reachable in process.

**Caveat for the claim dispatch.** `claimed._tag` is typed as the closed union, and `run` builds it itself. A fail-closed row is unreachable there, so it would be a fresh impossible branch, which this phase removes. A (T) table needs rows that close over `A`, `E`, `restore` and `key`, so the table must be built per `run` call or take them as arguments.
- A table of module-scope functions `(ctx) => Effect`, indexed by `claimed._tag` directly (`ARMS[claimed._tag](...)`), avoids both the `hasOwn` and the fail-closed row. The type system is already the closure.
- `StrategyLaws` rows hold plain flags, so this is a different use of the pattern. Say so in the plan.
- The existing precedent in `SharedComputation.ts` itself is `afterReset`/`afterLastLeave` (lines 89-100), where `{ readonly [S in Standing]: ... }` tables are read by a plain index, with no `hasOwn`. This is the closest same-file analog for (T).

### Per-call `Match.value` / `Match.tagsExhaustive` in `packages/core/src` (not hoisted)
Hoisted `Match.type<T>().pipe(Match.tagsExhaustive(...))` const forms (the (M) variant cannot use these, as `A` and `E` are generic): `SinkCodec.ts:176,217,245,278,342`, `SinkWire.ts:122,194`, `Explanation.ts:130,194,306,601`, `Predicate.ts:161`, `JsonRefusal.ts:91,144`, `PortWire.ts:99`, `Decision.ts:242`, `PortDescription.ts:103`, `Policy.ts:965`.

Per-call `Match.value(x).pipe(Match.tagsExhaustive(...))` (grep hits, indented inside functions):
- `LeafNeeds.ts:252-253`
- `EvaluationEnvironment.ts:67`
- `Explanation.ts:481,516`
- `Predicate.ts:220-221,249-250,529,580-581`
- `Decision.ts:432`

I did not read these to confirm each is inside a function body. The indentation and the file-level grep say so. The closest generic-in-a-function (M) precedent is `Predicate.ts:249` (`return Match.value(matcher).pipe(Match.tagsExhaustive({...}))`).

AGENTS.md §5a (line 294) measured `Match.value` rebuilt per call at 3.5-7.7x a `switch`. `run` is the hot path (it runs on every cached evaluation), so the bench rule in CONTEXT applies.

## 3. `SharedComputation.run`

`run` is `SharedComputation.ts:256-407`. Inside it, `Effect.uninterruptibleMask((restore) => Effect.gen(function* () {...}))` spans 284-406.

**Claim step** (`:297-320`), one `Effect.sync`, return type is the 3-arm union typed inline at 297-300:
```ts
const cached = hooks.cached(key);
if (Option.isSome(cached)) return { _tag: "Hit", value: cached.value };
const existing = HashMap.get(inFlight, key);
if (Option.isSome(existing)) { existing.value.waiters += 1; return { _tag: "Joined", entry: existing.value }; }
const entry: InFlightClaim<A, E> = { claim: Deferred.makeUnsafe<A, E>(), fiber: undefined, waiters: 1, standing: "Live" };
inFlight = HashMap.set(inFlight, key, entry);
return { _tag: "Claimed", entry };   // line 319, the surviving mutant
```
Keep this block unreordered (I5 / ARCH-45). The `Effect.sync` block is not touched.

**The three arms:**
| Arm | Lines | Body |
|---|---|---|
| Hit | 322-326 | `yield* hooks.onOutcome("hit"); return { value: claimed.value, outcome: "hit" }` |
| Joined | 329-333 | `yield* hooks.onOutcome("coalesced"); return { value: yield* restore(awaitShared(key, claimed.entry)), outcome: "coalesced" }` |
| Claimed (owner, falls through) | 334-405 | `onOutcome("miss")`, `const { entry } = claimed` (335), `forkDetach` + `onExit` (383-397), `entry.fiber = fiber` (400-402), `restore(awaitShared(key, entry))` (404), return `missed` (405) |

**Owner arm extent:** lines 334-405. The code is about 70 lines and about 55 of them are comments (337-382). The explanatory comments (337-382, 398-399) must travel with the extracted function.

**A local-function extraction must capture or receive:**
- `restore` (the `uninterruptibleMask` parameter, needed for `restore(awaitShared(...))`). It is polymorphic, so type it as the mask's restore type or pass it as a parameter.
- `entry` (from `claimed.entry`).
- `key`.
- `compute`, which is the `run` parameter and has requirement `R` (generic on `run`, so the local function must be generic or defined inside `run`).
- `hooks` (`settle`, `onOutcome`).
- `inFlight` through `forget(key, entry)` (module closure, already a local `const` at 144, reassigned directly). It is not a parameter.
- `awaitShared` (closure const, 239).
- `entry.standing` read in `onExit` (391), no extra capture.
- The `Effect.gen` generator is needed for `yield*`, so each arm helper is an `Effect.gen` or a plain pipe.
- Constraint from AGENTS.md §5: "Not an `Effect.fn`" (comment at 253-255). `UNTRACED_BUDGET` is unchanged, so no `Effect.fnUntraced` and no `Effect.fn` here. A local arrow that returns an `Effect` is fine.

Candidate (M) shape, for the plan:
```ts
return yield* Match.value(claimed).pipe(Match.tagsExhaustive({ Hit: ..., Joined: ..., Claimed: ... }));
```
Each arm returns an `Effect<Shared<A>, E, R>`.

## 4. I5 race test (`packages/core/test/DecisionCache.test.ts`)

Whole test is lines **1218-1309** (JSDoc 1218-1236, `it.effect` 1237-1309, vitest timeout `30_000` at 1308 with the comment at 1306-1307). It is inside `describe("capacity", ...)`, which opens at line 1051.

The parts to change:
- Line 1248: `for (const budget of [3, 4, 5, 6]) {`
- Line 1249: the "Measured coalesced→hit switch-over: gap 38/22/15/13 ... re-measure rather than retry." comment, to be deleted.
- Line 1250: `for (let gap = 0; gap <= 48; gap++) {`, to be replaced.
- 1245-1246: `const raced: Array<string> = []; const sides: Array<string> = [];`
- 1292: `sides.push(`${budget}:${outcomes.joined}`)`.
- 1294-1296: the per-run assertion that is kept, `kWalks !== 1 || followOn.join(",") !== "miss,miss,miss,hit"`, then `raced.push(...)`.
- 1299-1304: `assert.deepStrictEqual(raced, [])` and the `oneSided` assertion. Both stay.

Body of one iteration (1251-1296), unchanged:
- `ownerSpin = 3` and a `spinning` `AttributeResolver` that spins only for attribute `"k"`.
- The owner is `Effect.forkChild(lookup(K))`; `gap` yields; then the joiner is forked; both are joined.
- Follow-ons are `lookup(X), lookup(Y), lookup(K), lookup(K)`.
- It runs under `decisionCacheLayer({ capacity: 2 })` and `Effect.provideService(Scheduler.MaxOpsBeforeYield, budget)`.

The new loop must keep the per-run assertions on every iteration. One `Effect.gen` iteration needs a fresh layer, so the loop is a `for (let gap = 0; ; gap++)` with a stop condition, not a `for ... <= 48`.
- Per budget, track `coalesced` and `hit` counts; stop at the first-flip gap plus 3 more gaps; fail at gap 512 naming the budget and both counts.
- Note: the budget-6 flip is at gap ~13 and budget-3 at ~38, so the loop runs about 16-41 iterations per budget instead of 49. Measurement of the worst case (512) is for the plan.

**Tests that must stay unedited:** see section 1 (FIFO at 1156, in-flight at 1189, capacity validation 1052-1135, unbounded 1137). The metric tests (1312-1370) and the REGRESSION PIN tests for issue #64 (SharedComputation.ts comment 183) stay too.

## 5. Bench and mutation tooling

### Bench harness: copy from `.planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/`
- `ab.sh`. It takes 7 args: `<patch> <outdir> <rounds> <head-label> <patched-label> <bench-file> <test-name-pattern>`. It is already parameterised, so it **needs no change**. It refuses a dirty `packages/core/src`, an untracked or modified bench file, and a concurrent vitest bench or stryker run. It applies and reverses the patch between runs. Use `<bench-file>` = `packages/core/bench/DecisionCache.bench.ts` and a `-t` pattern of `DecisionCache.getOrCompute`.
- `analyze.mjs` (invoked `node analyze.mjs <outdir> <reference-label> <candidate-label>`, or `--self-test`). **Change these:**
  - Lines 17-25: `AUDIT`, `IGNORE` and the `REQUIRED` workload-key array.
  - The `readRun` key is `${b.name} :: ${t.name}` (line ~56). Replace `REQUIRED` with the keys in the next list.
  - Lines 28-30: `MIN_ROUNDS = 3`, `MAX_SLOWDOWN = 0.05`, `MAX_GEOMEAN_PCT = 2`. These already equal CONTEXT's gate (5% per workload, +2% geomean), so leave them.
  - The synthetic runs in the `--self-test` (line ~135, `new Map(REQUIRED.map(...))`) follow `REQUIRED`.
- Phase 66 also holds `bench/final/` (run output, `analysis.tsv`) and `66-BENCH.md` for the record shape.

### `DecisionCache.bench.ts` workloads (exact)
`test(...)` names and the `bench(...)` names, which form the `<b.name> :: <t.name>` key, are:
1. `DecisionCache.getOrCompute — hit` :: `repeated lookup, same subject/policy/resource`
2. `DecisionCache.getOrCompute — hit, realistic tree` :: `repeated lookup, same subject/tree/resource`
3. `DecisionCache.getOrCompute — hit, fresh-but-equal subject per lookup` :: `distinct-but-equal subject object per call`
4. `DecisionCache.getOrCompute — miss` :: `distinct policy per call, cache grows across the run`

The file header says "Two workloads, not three", which is stale. There are four `test` blocks. The `bench` name is what the key uses; whether `b.name` is the `test` title or the `bench()` string needs one probe in a Phase 66 `final/*.json` before writing `REQUIRED`. Check that file for the true key shape.

**No `capacity` workload exists.** The bench uses `decisionCacheLayer()` unbounded, so the eviction path (`capacity` set) is **not exercised** by any current workload. The claim dispatch runs on all four. CONTEXT says to bench "every workload plus any SharedComputation workload if one exists". There is no `SharedComputation` bench in `packages/core/bench/` that I found (not exhaustively searched). Flag for the planner that the eviction change is unmeasured by this file. `miss` inserts only without `capacity`.

### `66-mutation.mjs` (121 lines): copy to `67-mutation.mjs`, parameterise
Parameters to change:
- Line 14: `D` (phase directory).
- Line 17-19: `C`, `FILES` (set to `DecisionCache.ts`, `SharedComputation.ts`, `Lifecycle.ts`), `CHANGED` (set to `DecisionCache.ts`, `SharedComputation.ts`, since `Lifecycle.ts` is unchanged).
- Lines 20-21: `INVOCATION`, `EVIDENCE_INVOCATION`; the config name `stryker66-static.config.mjs` becomes a 67 name kept outside the repo.
- The `phase: "66"` strings (lines 65, 75) and the `66-mutation-*.json` names (lines 64, 74, 80-82).
- The usage string at 121.
- It also needs Phase 61's floors (0.977, 0.986, 1.000) as an extra check. The 66 scorer only compares against the phase's own base.

**IN-03 weaknesses to fix in the copy** (`66-REVIEW.md:90-94`):

1. **Exempts by line text.** Lines 109-110:
```js
const atBase = new Set(git("show", `${base.head}:${file}`).split("\n").map((line) => line.trim()));
for (const m of p.open.filter((x) => !atBase.has(x.text))) bad.push(`${file}:${m.line} leaves open a mutant on a line the phase wrote: ...`);
```
   A line whose trimmed text also appears anywhere in the base file counts as "not written by the phase", even when its behaviour changed. The mutant key (31) also uses the trimmed text, with no line number. Fix: take added line numbers from `git diff -U0 <base.head> -- <file>` (parse the `+start,count` hunks) and test `m.line` against them. The `text` field built at line 46 is `lines[m.location.start.line - 1].trim()`.

2. **Multiplicity lost.** Lines 95-96 and 97-98:
```js
const known = new Set(b.open.map(key));
for (const m of c.open.filter((x) => !known.has(key(x)))) ...
const wasIgnored = new Set(b.ignoredMutants.map(key));
const fresh = c.ignoredMutants.filter((x) => !wasIgnored.has(key(x)));
```
   `key` (line 31) is `[status, mutator, replacement, text]`. Two identical open mutants on identical lines collapse into one. Line 99 `killed` is a Set too. Fix: build a `Map<key, count>` and decrement on match; report any key whose close count exceeds its base count.

The planted-case demonstration (CONTEXT requires it): one fake report with a duplicated open mutant, and one with an open mutant on a changed line whose text matches a base line elsewhere.

## 6. Phase 61 mutation record
Source: `.planning/milestones/v1.6-phases/QD-61-decisioncache-is-asked-only-the-question/`. The JSON `61-mutation-after.json` has keys `counts, detected, ignored, measured, survivors`.

**Gate run (`61-mutation-after.json`), `ignoreStatic: true`:**
| File | killed | timeout | survived | noCoverage | ignored | score |
|---|---|---|---|---|---|---|
| `DecisionCache.ts` | 32 | 10 | 1 | 0 | 2 | **0.9767** (42/43) |
| `Lifecycle.ts` | 42 | 0 | 0 | 0 | 2 | **1.000** |
| `SharedComputation.ts` | 70 | 0 | 1 | 0 | 8 | **0.9859** (70/71) |

Survivors in `after.json`:
- `DecisionCache.ts`: `ConditionalExpression -> true` on `if (Option.isSome(oldest)) entries = HashMap.remove(...)` (line 287 at the time). This is the eviction guard.
- `SharedComputation.ts`: `StringLiteral -> ""` on `return { _tag: "Claimed", entry };` (line 319).
- `Lifecycle.ts`: none.

Line numbers are not stored; the records key on the line text. The current lines are 287 and 319.

**Static evidence run (`61-mutation-static.json`), ignoreStatic false:**
- `DecisionCache.ts`: Killed 33, Timeout 10, Survived 2. The survivors are the eviction guard (`ConditionalExpression -> true`, `Option.isSome(oldest)`) and `StringLiteral -> ""` on `>()("qadi/DecisionCache") {}` (the service id, line 142).
- `Lifecycle.ts`: Killed 44, no survivors.
- `SharedComputation.ts`: Killed 70, Survived 9. They are: `"Claimed"` (line 319), and 8 static survivors on the `afterReset` and `afterLastLeave` tables (lines 89-100): `StringLiteral -> ""` on `Superseded`, `Abandoned` and `Superseded` entries, and two `ObjectLiteral -> {}` on the table declarations.

**Implication for MUTE-04:** at close, the static run will still show the `"qadi/DecisionCache"` literal and the 8 table survivors. They are pre-existing static mutants, not on lines this phase writes. The scorer's "no open mutant on a line the phase wrote" check must not flag them, which means the line-based fix in IN-03 must keep them exempt by unchanged line, not by text match. If the phase touches lines 89-100 or 142, it triggers the checkpoint rule.

## 7. Spec records

**Behaviours (`spec/behaviors/21-decision-cache.md`):**
- BEH-QD-166 (`:153`) holds both requirements this phase touches. The eviction requirement is at `:174-177` ("oldest-inserted entry MUST be evicted"). The I5 requirement (hit check, join and claim are one synchronous step) is at `:185-189`, with the ARCH-45 I5 story at `:191-197`, and FIFO prose at `:199-202`.
- Line `:161-168` says "the eviction loop's own exit condition (`size(entries) > capacity`) unsatisfiable... an infinite loop". This text describes the loop being removed, so it needs a wording check. With `splitAt` a negative capacity no longer loops, but the construction check still stays.
- BEH-QD-439 (`:293`): the shared computation answers everyone waiting. BEH-QD-491 (`:356`): a stale answer never re-enters a cleared cache.
- The next ids are `BEH-QD-671` to `675`, reserved (CONTEXT: reserved ids only, never `next-id.mjs`).

**Invariants (`spec/invariants.md`):** INV-QD-307 (`:3707`, superseded claim's exit never settles) is the only claim invariant. INV-QD-020 is cited for `concurrency`. There is no INV for eviction. INV-QD-379/380 are reserved and likely mostly Unused.

**ADRs (`spec/decisions/`):**
- `031-decision-cache.md:141` ("An optional `capacity`, evicted FIFO", capacity addendum, lines 141-154).
- `132-a-shared-computation-is-joinable-only-while-awaited.md` (`:38-39` names the FIFO eviction staying in `DecisionCache.ts`; `:62` names the double append). This is the SharedComputation ADR.
- `174-a-decision-cache-is-asked-the-question.md`.
- ADR-QD-180 is named Unused (CONTEXT). The highest existing file is 177, and the index is `spec/decisions/index.yaml`.

**Traceability:** `spec/traceability.md`; rows of the form `| \`packages/core/test/X.test.ts\` | BEH-..., INV-... |` (see line ~494 for the `UntrustedDecode.test.ts` row). Phase 67 needs a row for `DecisionCache.test.ts` and any new id.

**AGENTS.md text naming these spots:** none names `DecisionCache`, `SharedComputation`, `insertionOrder` or the eviction loop (only `DecisionCache.tst.ts` at line 505, and `DecisionCacheShape` at 884). §5a (lines 294-340) holds `SWITCH_BUDGET` (three files: `Walk.ts`, `Matcher.ts` x2; `SharedComputation.ts` is not in it) and the "own-property law table" description for `FieldLattice.ts`, so a table-form dispatch needs no AGENTS edit (CONTEXT). A `Match.value` per call in `run` does need the §5a bench justification recorded in the CCR row.

## Shared Patterns

### Test and mutation discipline
Source: CONTEXT.md "Established Patterns", AGENTS.md §6, §10.
- RED first on the phase base; scratch lives outside the repo.
- Stryker is never run beside vitest, and the bench never runs beside anything.
- `bash -c` for multi-argument commands under zsh. Git pathspecs `:(glob)packages/*/src/**`.

### House rules for new code (AGENTS.md)
- Namespace imports `import * as Match from "effect/Match"`, `.ts` extensions (§1).
- No `as`, `!`, `any`, `switch`, `Effect.fnUntraced` addition (§5, §5a, §6).
- Doc-comment shape: one-line summary, rationale after (top of AGENTS.md).

## No Analog Found

| File | Role | Reason |
|---|---|---|
| Any use of `Chunk.splitAt` or `HashMap.removeMany` in the repo | utility | No in-repo precedent; rely on `node_modules/effect/src/Chunk.ts:3355` and `HashMap.ts:1697`. |
| A bench of a bounded (`capacity`) cache | bench | `DecisionCache.bench.ts` has no `capacity` workload, so eviction's cost is unmeasured. |
| A `SharedComputation` bench | bench | None found. |

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test/DecisionCache.test.ts`, `packages/core/bench`, `.planning/phases/QD-66-*`, `.planning/milestones/v1.6-phases/QD-61-*`, `spec/behaviors/21-decision-cache.md`, `spec/invariants.md`, `spec/decisions`, `AGENTS.md`.
**Pattern extraction date:** 2026-11-21
**Not verified:** the `Count.normalize` source, the bench key shape (`b.name`), and the per-call classification of each `Match.value` hit (grep and indentation only).
