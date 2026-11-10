---
id: ARCH-08
title: One owner for comparison semantics, so evaluateMatcher, evaluatePredicate and the denial reason cannot drift
strength: Strong   # from the 2026-10-05 architecture review
status: implemented   # 2026-10-05 on arch/deepening; T17 deferred to the final integration gate
evidence_verified_at: e0ee958
depends_on: []     # builds on ARCH-01/02/03 as already implemented on arch/integration
blocks: []
adrs_touched:
  - ADR-QD-024 (read: a predicate is a second interpreter shipped with its reference semantics; INV-QD-018 direction)
  - ADR-QD-079 (amend: the "one isRangeBound, so the rule cannot lag" premise is false for row values; a Range leaf gains a non-finite guard and RenderRules a finiteness fact)
  - ADR-QD-054 (read: a companion package compiles a dialect; narrowed again only for predicate-prisma's `floating` declaration)
  - ADR-QD-034 (read: SWITCH_BUDGET; the budgeted switch keeps its count, the function hosting it is renamed — AGENTS.md §5a table edit, no ADR amendment)
  - ADR-QD-073 (read: UNTRACED_BUDGET; nothing here is Effect.fn, nothing new is fnUntraced)
  - ADR-QD-076 (read: ignoreStatic; module-scope tables are skipped by Stryker, closure bodies are not)
  - ADR-QD-090 (read: foldMatcher; judgeMatcher keeps evaluateMatcher's recursion shape)
  - ADR-QD-077 (read: AskAttribute already routes translation's subject side through evaluateMatcher)
  - ADR-QD-040 (amend in prose only: the denial-reason table gains two rows)
  - ADR-QD-037 (read: madge circular-import gate)
  - ADR-QD-002 (read: matchers cross the untrusted-JSON boundary; Schema.Finite on bounds stays)
  - ADR-QD-NEXT (new: comparison semantics have one owner)
packages: [core, predicate-sql, predicate-prisma, devtools]
estimate: L   # T1–T4 ≈ 1½ days (the defect wave); T5–T6 ≈ 1 day (Prisma spike + guard); T7–T14 ≈ 2½ days; T15–T17 ≈ 1 day
---

# ARCH-08 — One owner for comparison semantics, so evaluateMatcher, evaluatePredicate and the denial reason cannot drift

## 1. Verified evidence (at `e0ee958`)

Every claim below was re-checked on branch `arch/integration`, worktree
`W=/Users/mohammadalmechkor/Projects/Perso/qadi/.claude/worktrees/agent-adb672833eb753a12`,
HEAD `e0ee958`. Probes are throwaway scripts in the session scratchpad
(`…/scratchpad/probe-int2.mts` and `…/scratchpad/arch08/{e2e,engines,guards,guards2,prisma,remedies}.mts`),
importing `$W/packages/*/src/*.ts` by absolute path and run with
`cd $W/packages/core && NODE_OPTIONS="--conditions=bun" <root>/node_modules/.bin/tsx <probe>`.
Every scenario a probe settled is written again as a real test in §6, so the
scratch files are not needed to reproduce anything.

**Tooling note.** `<root>/node_modules/.bin/vitest run …` from the worktree fails
every file with `TypeError: Cannot read properties of undefined (reading 'config')`
(two vitest instances, the same caveat ARCH-07 C9 recorded). The worktree's own
binary works: `cd $W && ./node_modules/.bin/vitest run <file>`. In the real
checkout `pnpm exec vitest run <file>` is the form, and that is what §6 uses.

### C1. LIVE FAIL-OPEN: a non-finite **row value** — **CONFIRMED**, and the mirror direction too

`probe-int2.mts` at `e0ee958`:

```
value  Infinity  matcher gte(3): false  predicate gte(3): true   matcher lt(3): false  predicate lt(3): false
value -Infinity  matcher gte(3): false  predicate gte(3): false  matcher lt(3): false  predicate lt(3): true
```

End to end (`arch08/e2e.mts`: `toPredicate` then `evaluatePredicate`, against
`evaluate(policy, { resource: { level } })`):

| Policy | `level` | `evaluate` | `evaluatePredicate(toPredicate(…))` | Direction |
| ------ | ------- | ---------- | ----------------------------------- | --------- |
| `hasResourceAttribute("level", gte(3))` | `Infinity` | deny | **admit** | **fail-open** |
| `hasResourceAttribute("level", lt(3))` | `-Infinity` | deny | **admit** | **fail-open** |
| `not(hasResourceAttribute("level", gte(3)))` | `Infinity` | allow | deny | fail-closed |
| `not(hasResourceAttribute("level", lt(3)))` | `-Infinity` | allow | deny | fail-closed |
| either, `NaN` | — | agree | agree | — |

Both directions violate INV-QD-018 ("exactly"), BEH-QD-127's REQUIREMENT, and
BEH-QD-027's "MUST return false unless BOTH operands … are finite". The fail-open
rows are ADR-QD-024's named worst case: `toPredicate` admits rows `evaluate`
denies.

Cause: `Predicate.ts:160-169`'s `Gte`/`Lt` arms check `typeof value === "number"`
on the row value and `isRangeBound(against)` on the bound, but not
`Number.isFinite(value)`. `Matcher.ts:591-610` checks both operands.

**Settled by a prototype, not by argument.** In a scratch copy of
`packages/core` (since deleted), adding `±Infinity`/`NaN` to the agreement
property's `level` generator made three tests fail at `e0ee958`
(`PROPERTY: the two interpreters agree, row by row`,
`PROPERTY: a translation that succeeds agrees with the evaluator on every row, and a failure is typed`,
and a named `gte(3)`/`lt(3)`/`not(…)` × non-finite test). Changing both arms to
`isRangeBound(value) && isRangeBound(against) && value >= against` (and `<`) made
`Predicate.test.ts`, `RenderablePredicate.test.ts`, `Matcher.test.ts`,
`PredicateLiteral.test.ts` and `Evaluate.test.ts` all green, 490/490. T1 is that
change.

A detail the failure messages hid: `JSON.stringify` prints `-Infinity` and `NaN`
as `null`, so the property reported `"level":null` for a `-Infinity` row. T1 fixes
the message with a replacer.

### C2. The false claim that made C1 possible — **CONFIRMED**, restated in more places than the brief listed

8b07a6d (CCR-QD-120) guarded only the bound and wrote down why the row side
supposedly needed nothing. Every place that says so, or leans on it:

| Where (at `e0ee958`) | What it says | Status |
| -------------------- | ------------ | ------ |
| `packages/core/src/Predicate.ts:154-159` | "The bound is the only side that needs it: a non-finite *row* value already agrees, since `NaN >= x` is false in both interpreters and `Infinity >= x` is true in both." | **false**: the matcher returns false for `Infinity >= x` |
| `packages/core/src/PredicateLiteral.ts:53-55` (`isRangeBound`'s doc) | "Only the bound needs the check: a non-finite *row* value already agrees across interpreters …" | **false**, same claim |
| `packages/core/src/PredicateLiteral.ts:10-11` (module header) | "`evaluatePredicate`'s `Gte`/`Lt` arms and `toRenderable`'s classifier both call `isRangeBound`, so that rule has exactly one definition." | true for the bound, implies a sufficiency that is false |
| `spec/decisions/079-renderability-is-a-core-rule.md:25-26, 58-61` | "a third copy of the finite-bound half inside `evaluatePredicate`" … "call the same `isRangeBound`, so the rule cannot lag" | the premise is incomplete. The row half was never a copy anywhere except the matcher |
| `spec/invariants.md:2350-2352` (INV-QD-061 Source) | "whose `Gte`/`Lt` arm shares `isRangeBound` … with `evaluatePredicate`" | true, insufficient |
| `spec/overview.md:166` | "`evaluatePredicate`'s `Gte`/`Lt` and `toRenderable` call the same `isRangeBound`" | true, insufficient |
| `spec/invariants.md:545-566` (INV-QD-018's CCR-QD-120 paragraph) | describes the bound fix as closing the divergence | incomplete. No row-value sentence |

A **second false claim, newly found**, about the matcher itself:

| Where | What it says | Truth |
| ----- | ------------ | ----- |
| `packages/core/src/Matcher.ts:601-604` (`Lt` arm) | "`Infinity < finiteBound` already fails closed without this, but the guard is added for consistency rather than left asymmetric." | The load-bearing case for `Lt` is **`-Infinity`**, which `-Infinity < 3` admits. The guard is not cosmetic |
| `spec/behaviors/04-matchers.md:145-147` (BEH-QD-027) | "`lt` already failed closed in the mirror case, but is guarded the same way for consistency" | same error |
| `packages/core/test/Matcher.test.ts:147-152` | "while `Lt` already failed closed (`Infinity < 3` is `false`) even before the value side was guarded" | same error |

The mutation report shows the consequence. `reports/mutation/mutation.json`
(written 2026-10-04 08:06 on this branch) has a **surviving** `LogicalOperator`
mutant at `Matcher.ts:606` (`typeof value === "number" || Number.isFinite(value)`).
No test evaluates `lt(3)` against `-Infinity`. `Matcher.test.ts:154` uses
`+Infinity` and `:89` uses `lt(-Infinity)` on `-Infinity`, and both are false with
or without the guard. So the one guard that matters for `Lt` is unpinned.

**Mis-citations, newly found.** The value-side guard is CCR-QD-116
(`spec/README.md:341`, 04-matchers Rev 1.4), and the bound-side guard is
CCR-QD-120 (`spec/README.md:338`, issue #65). CCR-QD-115 is `FieldPath.ts`'s stack
safety (`spec/README.md:342`). Yet:

- `Matcher.ts:256` and `:594` cite "CCR-QD-115" for the value guard;
- `Matcher.test.ts:146` cites "CCR-QD-115" for the value guard;
- `Predicate.test.ts:871` and `:968-969` cite "CCR-QD-115, issue #65" for the bound guard.

T2 corrects all of these together.

### C3. The renderers and real engines — **CONFIRMED** divergent, plus one live engine defect independent of C1

`arch08/engines.mts` compiles leaves with `compileSql` and runs them on PGlite
(PostgreSQL) and `node:sqlite`, over a **`double precision`/`REAL`** column holding
`3, 5, 0, Infinity, -Infinity, NaN`. The reference is `evaluatePredicate` at HEAD.

| Leaf | Engine | Engine returns | `evaluatePredicate` (HEAD) | |
| ---- | ------ | -------------- | -------------------------- | - |
| `Compare level Gte 3` | postgres | `3, 5, Infinity, NaN` | `3, 5, Infinity` | **DISAGREE: PG admits `NaN`** |
| `Compare level Gte 3` | sqlite | `3, 5, Infinity` | `3, 5, Infinity` | agree |
| `Compare level Lt 3` | both | `0, -Infinity` | `0, -Infinity` | agree |
| `Negate(Gte 3)` | postgres | `0, -Infinity` | `0, -Infinity, NaN` | disagree (under-admit) |
| `Negate(Gte 3)` | sqlite | `0, -Infinity, NaN` | `0, -Infinity, NaN` | agree (SQLite stored `NaN` as `NULL`) |
| `Neq 3`, `MemberOf [3,5]`, `Negate(Lt 3)` | both | — | — | agree |

Findings:

1. **NEW live defect, independent of C1.** PostgreSQL orders `NaN` above every
   number, so `"level" >= $1` admits a `NaN` row that both `evaluatePredicate` and
   `evaluate` deny. This is an INV-QD-047 over-admission on any `double precision`,
   `real` or `numeric` column holding `'NaN'`.
2. **The engines agree with today's wrong reference on `±Infinity`.** So T1 alone
   moves the end-to-end SQL fail-open rather than removing it. Before T1,
   `evaluatePredicate` and `compileSql` both admit `Infinity` under `Gte`, and
   `evaluate` denies it. After T1, `evaluatePredicate` denies it and `compileSql`
   still admits it. **The end-to-end SQL path is fixed only when the renderer
   excludes non-finite rows (T4).** T1's CCR must say so.
3. SQLite stores `Infinity`/`-Infinity` as REAL infinities (`typeof(level) = 'real'`)
   and stores `NaN` as `NULL`.
4. **Prisma has the same divergence** (`arch08/prisma.mts`, the generated fixture
   client over SQLite). A raw-inserted `9e999` in the `Int?` column `level` is
   returned by `{level: {gte: 3}}` (ids `[1,2,4]`, where 4 is `Infinity`), and
   `-9e999` by `{level: {lt: 3}}`.
5. **MySQL is UNVERIFIED** because there is no embeddable engine. MySQL's
   `DOUBLE`/`FLOAT` cannot store `Infinity`/`NaN`, per the MySQL reference manual
   on floating-point types. BEH-QD-241 already covers MySQL structurally (S2), and
   T4 keeps that.

**Candidate guards, measured** (`arch08/guards.mts`, `arch08/guards2.mts`), as
returned row labels:

| Guard | PG `float8` | PG `numeric` | PG `real` | PG `int`/`bigint` | SQLite `REAL`/`INTEGER` |
| ----- | ----------- | ------------ | --------- | ----------------- | ----------------------- |
| `col >= $1 AND col <= $2` with `$2 = Number.MAX_VALUE` | ok | ok | **ERROR** out of range for real | **ERROR** invalid input for integer | ok |
| `col >= $1 AND col < 'Infinity'::float8` | ok | ok | ok | ok | n/a (PG syntax) |
| `col >= $1 AND col - col = 0` | ok (`3,5`) | ok | ok | ok, incl. `int4` max `2147483647` and `int8` max | ok (`3,5`; `int` max ok) |
| `CASE WHEN (col >= $1 AND col - col = 0) THEN FALSE ELSE TRUE END` | `0,-Inf,NaN,NULL` | same | same | `0` | `0,-Inf,NaN→NULL,NULL` |

`col - col = 0` is the only guard that is one text for both engines, never
overflows (equal operands), excludes all three non-finite values (`Inf - Inf` is
`NaN`, and PG's `NaN = 0` is false; SQLite's `NaN` becomes `NULL`), and behaves
correctly under the two-valued `CASE WHEN` negation. Prisma cannot express a
column-to-column expression. Its options are bounded filters
(`lte: Number.MAX_VALUE` was refused for the `Int` field:
"Unable to fit value 1.7976931348623157e+308 into a 64-bit signed integer for field `lte`",
and `lt: Infinity` was refused: "Argument `lt` is missing"). So Prisma needs
per-field type knowledge (D-08-g, spike T5). **UNVERIFIED:** Prisma's behavior on
a `Float` field, because the fixture schema has none.

### C4. The engine oracles cannot see C1 or C3 — **CONFIRMED**

- `packages/predicate-sql/test/sqlEngines.ts:83` creates PG `level int` and
  `:136` creates SQLite `level INTEGER`. `ROWS` (`:38-50`) holds `level ∈ {null, 0, 3, 5}`.
- `packages/predicate-prisma/prisma/schema.prisma` declares `level Int?`, and
  `test/prismaEngine.ts:75-81` creates `"level" INTEGER`.
- `packages/predicate-sql/test/generators.ts:22-27` and the Prisma twin draw
  `Gte`/`Lt` bounds from `integer({min: 0, max: 5})`.

An integer column cannot hold a non-finite value in PostgreSQL, so BEH-QD-241/242
and INV-QD-047/048 have never sampled one.

### C5. The in-process agreement properties never generate a non-finite row value — **CONFIRMED**

- `packages/core/test/Predicate.test.ts:839-852`: `level` is `integer(0..5)`,
  `"3"`/`"0"` or `null`. The bounds were widened to `±Infinity`/`NaN` (`:866-885`),
  but the row side never was.
- `packages/core/test/RenderablePredicate.test.ts:64-69`: `cell` is strings,
  `0, 1, 3, 5, -2`, booleans and `null`. Its test-only two-valued interpreter
  (`:146-151`) evaluates `Range` as `typeof cell === "number" && cell >= bound`,
  which encodes the same false belief as C2. INV-QD-061 ("for every row … including
  rows whose values have the wrong type") is therefore unchecked for non-finite cells.
- The port-world `riskScore` (`Predicate.test.ts:1033`) is integers or
  `undefined`. That is harmless: the subject side folds through `evaluateMatcher`
  on both interpreters (`Predicate.ts:686-689`), so there is nothing to diverge.

### C6. Comparison semantics are hand-copied in three places — **CONFIRMED**, with line numbers **CHANGED**

| Rule | `Matcher.ts` (`evaluateMatcher`, `:552-641`) | `Predicate.ts` (`dispatchCompare` `:126-171`, `dispatchPredicate` `:196-206`) | `RenderablePredicate.ts` (`dispatch` `Compare` arm `:274-316`) |
| ---- | ----------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| absent operand denies `Eq`/`Neq` (CCR-QD-112) | `:569`, `:576` | `:136`, `:141` | — (no `undefined` in a table) |
| `Gte`/`Lt` need numbers | `:596`, `:606` | `:163`, `:168` | `:292-293` (constant false) |
| bound finite (CCR-QD-120) | `:598`, `:608` | via `isRangeBound` | via `isRangeBound` |
| **value finite (CCR-QD-116)** | `:597`, `:607` | **missing (C1)** | **missing (C3)** |
| membership | `:588` (`includes`) | `:201` (`includes`) | `:333-356` (literal split) |
| NULL meaning | — | — | `nullGuardFor` (`:250-253`) **derives it from `evaluatePredicate`** |

The brief's `foldAttribute` no longer exists. ARCH-01 replaced it with `run`'s
`AskAttribute` arm (`Predicate.ts:686-689`), which already calls `evaluateMatcher`
(CHANGED). The column side, `columnPredicate` (`:269-295`), maps matcher tags to
`CompareOp`s and is the only translation-side copy left. The brief's
"`evaluateMatcher` switch ~l.500-610" is at `:552-641` (CHANGED).

Repair history, each one a patch to one copy that the others then had to follow:
CCR-QD-112 (absent operand, 2026-09-07), CCR-QD-116 (value finite, 2026-09-08),
CCR-QD-120 (bound finite, 2026-09-08), and now C1.

`RenderablePredicate.ts`'s `nullGuardFor` is the precedent that works: it asks
the reference (`evaluatePredicate(leaf, {[column]: null})`) instead of keeping a
second belief. The plan applies the same move to every comparison rule.

**Mutation evidence that the copies are partly redundant** (`reports/mutation/mutation.json`):

| Survivor | Why it survives |
| -------- | --------------- |
| `Matcher.ts:569` ×3 and `Predicate.ts:136` ×4 (`Eq`'s `value !== undefined && other !== undefined`, mutated to `\|\|` or `true`) | **equivalent**: `value === other` with exactly one side `undefined` is already false, so only `value !== undefined` is load-bearing |
| `Matcher.ts:596`, `:606` (`typeof value === "number"` mutated to `true`) | **equivalent at runtime**: `Number.isFinite` already rejects non-numbers. It exists only for TypeScript narrowing |
| `Matcher.ts:606` (`\|\|`) | **real**: C2's missing `lt(3)` × `-Infinity` test |

Under ADR-QD-076's `ignoreStatic`, the module-scope `Match.when(…, () => closure)`
wrappers in `Predicate.ts:133-169` are `Ignored`, but the closure **bodies** are
mutated (`:136` shows `Survived`, not `Ignored`). So a module-scope table of
comparison functions stays inside the mutated set.

### C7. The denial reason re-derives what the boolean dropped — **CONFIRMED**

`Evaluate.ts:378-390` (`attributeReason`) and `:409-419` (`refIsUnresolved`)
reconstruct "which operand was absent" after `evaluateMatcher` returned only a
boolean (`:679-689`, `:710-720`). `refIsUnresolvedFor` is a second `ValueRef`
dispatcher that "must mirror `resolveRef`'s" arms (`:397-401`). It is entry #2 in
the ED-03 ledger at `Matcher.ts:371-391`.

Imprecisions that follow, all pinned or reachable:

- `eq(subject("missing"))` on a present attribute reads "did not match". The
  comparison never ran (the reference is absent), which is exactly what
  CCR-QD-112's `Neq` correction refused to say for `Neq`, and BEH-QD-045 says a
  reason must not assert.
- `dominates(resource("label"))` with an absent label says the same.
- `gte(3)` on `Infinity`, or on `"5"`, reads "did not match". True, but it hides
  that the value is not comparable at all.

### C8. `SWITCH_BUDGET` pins the switch by count **and by function name** — **CONFIRMED**

`scripts/check-house-style.mjs:278-284` holds `"packages/core/src/Matcher.ts": 2`,
and `:297-300` holds `SWITCH_BUDGET_NAMES` `["evaluateMatcher", "resolveRef"]`,
checked verbatim. AGENTS.md §5a's table names `Matcher.ts — evaluateMatcher`
(`AGENTS.md:343`). Moving the switch into a renamed function needs all three
edits together (T8).

### C9. Two more consumers of comparison semantics, newly found

1. **`@qadi/devtools`'s witness synthesis lies on in-process matchers**
   (`arch08/remedies.mts`). `satisfyingValue` (`packages/devtools/src/model/Remedies.ts:115`,
   `witnessStep` `:149-200`) returns witnesses that `evaluateMatcher` rejects:

   | Matcher | Witness | Satisfies? |
   | ------- | ------- | ---------- |
   | `gte(Infinity)` / `gte(NaN)` / `gte(-Infinity)` | the bound itself | **false** |
   | `eq(literal(NaN))` | `NaN` | **false** |
   | `eq(literal(undefined))` | `undefined` | **false** |

   This violates BEH-QD-223 ("A synthesised value MUST satisfy the matcher it came
   from"). The `Lt` arm (`:174-182`) already guards finiteness by hand, and `Gte`
   (`:173`) does not. It is reachable only in process, because `Schema.Finite`
   rejects non-finite bounds at decode (`Matcher.ts:104-105`) and JSON cannot
   carry `NaN` or `undefined`. Low severity, but it is the same "one copy forgot a
   rule" defect class.
2. **`In` treats an absent value as a member.** `evaluateMatcher(inArray([undefined]), undefined)`
   is `true`, and `evaluatePredicate`'s `MemberOf` agrees (both use
   `Array.prototype.includes`). Every other matcher denies `undefined`
   (`Exists`, `Eq`, `Neq` since CCR-QD-112, `Gte`, `Lt`, `Contains`, `Size`,
   `FieldMatch`, `SomeMatch`, `EveryMatch`, `Dominates`). It is reachable only in
   process. `Matcher.test.ts:209-216` and `:426` use `inArray([undefined])` on
   purpose, as the one matcher that is true on `undefined`, to detect a
   prototype-chain read. D-08-h settles it.

### C10. Baselines at `e0ee958`

| Command (from `$W`) | Result |
| ------------------- | ------ |
| `./node_modules/.bin/vitest run packages/core/test/Predicate.test.ts` | 106 passed |
| `… packages/core/test/Matcher.test.ts` | 122 passed |
| `… packages/core/test/PredicateLiteral.test.ts` | 11 passed |
| `… packages/core/test/RenderablePredicate.test.ts` | 39 passed |
| `… packages/core/test/Evaluate.test.ts` | 212 passed |
| `./node_modules/.bin/vitest run --project predicate-sql --project predicate-prisma` | 6 files, 120 passed |
| `./node_modules/.bin/vitest bench --run packages/core/bench/Evaluate.bench.ts --reporter=verbose` | `evaluate` group, mean per op: one node 7.7 µs, wide 9.9 µs, deep 12.6 µs, **matcher-heavy 12.8 µs**, resolver miss 13.9 µs, obligation-heavy 15.0 µs. **`filter — 500 items` and `decideSubjects — 500 subjects` FAIL** (`bench.compare()` requires at least 2 benchmarks, the vitest 5 API) |

The two failing bench cases are a pre-existing tooling defect, out of scope (§3).
No existing bench isolates `evaluateMatcher` or `evaluatePredicate` per row. T8
adds one.

Mutation scores on this branch (README): core 93.32, predicate-sql 95.45,
predicate-prisma 90.18, devtools 96.96.

## 2. Goal and success criteria

**Goal.** Deepen comparison semantics into one module, `Compare.ts` (D-08-a). It
owns what `Eq`, `Neq`, `Gte`, `Lt` and membership *mean*: the absent-operand
rule, the finite-number rule for both operands, type gating, and the
`NaN`/SameValueZero split. It answers with a closed `Verdict`
(`Held | NotHeld | ValueAbsent | ReferenceAbsent | Incomparable`, D-08-b) rather
than a bare boolean.

`evaluateMatcher`, `evaluatePredicate`, `toRenderable`'s classifier, the
evaluator's denial reason and devtools' witness check all become **adapters** of
that one interface. Today the same five rules live in three implementations, each
with a comment claiming to mirror the others. One has already drifted into a live
fail-open (C1), and its comment says it could not (C2).

After the change the rules have **locality** (one file states them, one test file
pins them) and **leverage** (five call sites, one fix). The deletion test:
deleting `Compare.ts` would make every comparison rule reappear in each of
`Matcher.ts`, `Predicate.ts`, `RenderablePredicate.ts` and `Evaluate.ts`. The
module earns its keep. The seam between "is this operand comparable, and how did
the comparison come out" and "what does a matcher or a row filter do with that"
already has two real adapters (`evaluateMatcher`, `evaluatePredicate`), so it is
a real seam, not a hypothetical one.

Independently, and first, the live defects are fixed test-first, at every layer
they reach:
- C1, `evaluatePredicate`;
- C3, PostgreSQL/SQLite/Prisma over-admitting non-finite rows, including PG's
  `NaN`;
- C2, the false claims and mis-citations;
- C9, the devtools witnesses.

**Success criteria** (each checkable):

1. `Predicate.test.ts`'s agreement properties generate `±Infinity`/`NaN` row
   values, and a named test asserts `gte(3)`, `lt(3)`, `not(gte(3))` and
   `not(lt(3))` agree with `evaluate` on all three. They fail at `e0ee958` and
   pass after T1:
   `pnpm exec vitest run packages/core/test/Predicate.test.ts`.
2. `Matcher.test.ts` asserts `lt(3)` denies `-Infinity`, and the Stryker survivor
   at `Matcher.ts:606` is killed (T2):
   `pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/Matcher.ts`.
3. `grep -rnE "already agrees|true in both|only side that needs it|for consistency rather than left asymmetric|already failed closed in the mirror case" packages/*/src packages/*/test spec`
   prints nothing outside change-history rows and `>`-quoted superseded text (T2).
4. `grep -rn "CCR-QD-115" packages/core/src/Matcher.ts packages/core/test/Matcher.test.ts packages/core/test/Predicate.test.ts`
   prints nothing (T2).
5. The real-engine oracles hold a non-finite-capable column:
   - PG `double precision` with `±Infinity` and `NaN`;
   - SQLite `REAL` with `±Infinity`;
   - Prisma `Float?`, if T5 confirms it.

   S1/S3 (sql) and P1 (prisma) pass with that column in play (T3, T4, T6):
   `pnpm exec vitest run --project predicate-sql --project predicate-prisma`.
6. `RenderablePredicate.test.ts` R2/R3 sample `±Infinity`/`NaN` cells, and its
   test-only interpreter applies the new `Range` guard literally (T4).
7. `packages/core/src/Compare.ts` exists. `grep -nE "Number\.isFinite|!== undefined && .* === " packages/core/src/Matcher.ts packages/core/src/Predicate.ts packages/core/src/RenderablePredicate.ts`
   finds no comparison rule outside `Compare.ts`: `getByPath`/`isObject`
   structural guards stay, and are listed in T11's allowlist (T7–T10).
8. A leaf-agreement property in `packages/core/test/Compare.test.ts` asserts
   `holds(judgeMatcher(m, x)) === evaluatePredicate(compareFor(m), {c: x})` for
   every primitive matcher `m` and every `x` in a fixed universe of operand
   classes (T11).
9. `Evaluate.ts` no longer contains `refIsUnresolved`. `attributeReason` reads a
   `Verdict`. The ED-03 ledger in `Matcher.ts` lists four `ValueRef` dispatch
   sites, not five (T12).
10. `satisfyingValue` never returns a witness that `judgeMatcher` rejects. A
    property over generated matchers, including non-finite bounds and `NaN`
    literals, asserts it (T14).
11. `node scripts/check-house-style.mjs` passes. `SWITCH_BUDGET` still holds `2`
    for `Matcher.ts`. `SWITCH_BUDGET_NAMES` and AGENTS.md §5a name the renamed
    host (D-08-c). `UNTRACED_BUDGET`, `ANY_BUDGET`, `SCHEMA_ERROR_BUDGET` and
    `HAS_CUSTOM_BUDGET` are unchanged.
12. `pnpm bench`, same machine and same session, before and after T8/T9:
    `matcher-heavy`, `deep` and the new `Compare.bench.ts` per-leaf and per-row
    cases each move by no more than the run-to-run spread of the baseline runs.
    The numbers are recorded in the CCR.
13. `pnpm check` is green end to end, including gate 13
    (`node scripts/check-api-surface.mjs`) with `judgeMatcher`, `Verdict` and the
    new `RenderRules`/`RenderableNode` members named in `spec/overview.md`, and
    the four mutation configs at or above their current scores (T17).

## 3. Non-goals

- **Changing `Eq`'s `NaN` semantics.** `===` stays (`Matcher.ts:137-145`, pinned in
  the "eq vs inArray" block, `Matcher.test.ts:334`). `Compare.ts` states it once
  and does not change it.
- **Coercion and `Date`.** BEH-QD-244's accepted N2 limitation (a JS-typed literal
  against a differently typed column) is untouched. `isSafeLiteral` keeps refusing
  `Date`.
- **Dominance and label semantics.** `labelDominates`/`isSecurityLabel` stay in
  `SecurityLabel.ts`. `Compare.ts` returns a `Verdict` around them. It does not
  restate the lattice.
- **A per-column finiteness declaration for `@qadi/predicate-sql`.** A wrong
  declaration of "this column is finite" would over-admit, which breaks the
  lie-safety principle ADR-QD-079 (d) set for declarations. SQL renders the guard
  unconditionally on dialects that can store non-finite values (D-08-f). Prisma is
  the exception, because it has no expression form (D-08-g).
- **A MySQL engine oracle.** There is none embeddable. S2's structural check
  carries MySQL, as today.
- **Fixing `Evaluate.bench.ts`'s two broken `bench.compare` cases** (C10). That is
  a vitest-5 tooling issue unrelated to comparisons, and should be raised
  separately. This plan's benches avoid the single-bench `compare` form.
- **Changing what composite matchers report.** `FieldMatch`/`SomeMatch`/`EveryMatch`/`Size`
  keep reading "did not match" when an inner comparison fails (the known
  imprecision pinned at `Evaluate.test.ts:146-163`). D-08-b's composite rule keeps
  it that way on purpose.
- **Making the evaluator's reason text structured** (codes instead of sentences).
  That is a wire-format question for `SinkCodec`/`AccessDenied`, not for this
  plan.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 (submodule imports, `.ts` extensions, `import type`) | `Compare.ts` imports `./SecurityLabel.ts` only. Consumers write `import { … } from "./Compare.ts"`, and `import type { Verdict }` where only the type is used. Devtools uses the root barrel name (`judgeMatcher` from `@qadi/core`), never a `@qadi/core/Compare` subpath (no `packages/*/src` file imports a `@qadi/core/…` subpath today). |
| AGENTS.md §5 (`Effect.fn`) / ADR-QD-073 | Everything here is pure and synchronous, like `evaluateMatcher` today, so there are no spans and no new `Effect.fn`/`fnUntraced`. `toRenderable` keeps its existing `Effect.fn`. |
| AGENTS.md §5a / ADR-QD-034 / `SWITCH_BUDGET` + `SWITCH_BUDGET_NAMES` | The per-node matcher switch stays a `switch`, with the same count of 2 for `Matcher.ts`. If D-08-c moves it into `judgeMatcher`, then `SWITCH_BUDGET_NAMES["packages/core/src/Matcher.ts"]`, AGENTS.md §5a's table row (`AGENTS.md:343`) and the `:399` sentence change together, in one commit. `Compare.ts` dispatches its `CompareOp` through a module-scope `Record<CompareOp, …>` (the `RANGE_OPERATOR`/`NULL_GUARD`/`FLIP` idiom), not a `switch` and not a per-call `Match.value`. **Any hot-path change is bench-gated:** T8/T9 record `pnpm bench` before and after. |
| AGENTS.md §6 (no `as`, `!`, `any`; no `Record<string, unknown>` widening, per the user's memory note) | `Verdict` is a closed literal union. Type gates are type predicates (`isFiniteNumber: (u: unknown) => u is number`, reusing `Number.isFinite`, which does not coerce), so the redundant `typeof` halves (C6) disappear without an `as`. The test-only operand universe is a `ReadonlyArray<unknown>`, not a record. |
| User preference: closed unions, not widening | `Verdict` has five named members. `RenderableNode`'s `Range` gains a closed `finiteGuard: "None" \| "ExcludeNonFinite"`. `RenderRules` gains a closed `ColumnFiniteness` union. Each new case is added as the full union, not as `old \| "New"`. |
| User preference: complete over simple | Each decision in §5 lists the minimal path and recommends the complete one unless the complete one is wrong. D-08-f's per-column SQL declaration is the one place the complete-looking option is *wrong* (§3), and the reason is stated there. |
| AGENTS.md §9 (barrels) | `Compare.ts` stays out of `packages/core/src/index.ts` (D-08-a). It is reachable through the `./*` wildcard as `@qadi/core/Compare`, so its exports get a "Not listed above" row in `spec/overview.md`, like `ShortCircuit.ts` (`overview.md:767`). `Verdict` must be nameable in `.d.ts` for `judgeMatcher` (TS2883), so `Matcher.ts` re-exports it as a type. |
| AGENTS.md §10 (core coverage 95%; others 90%) | `Compare.ts` is covered by its own `Compare.test.ts`, the interface as the test surface. `vitest.config.ts`'s per-package thresholds are unchanged. |
| AGENTS.md §11, §12, §15 (spec normative; doc fences compile; gate 13) | BEH-QD-027/028/045/122/127/223/241/242/244/271, INV-QD-018/047/048/061, ADR-QD-079/040, the traceability matrix, and `spec/overview.md` change in the same PRs as the behavior (T15). New ` ```typescript ` fences must compile under `pnpm spec:examples`. |
| AGENTS.md §16 (publishing) | No new package. `Compare.ts` is under `packages/core/src`, already in `tsconfig.build.json`'s graph. The changesets bump the fixed group (`.changeset/config.json`). |
| ADR-QD-079 (d), INV-QD-062 lie-safety | A renderer-side guard may only ever *remove* rows the plain operator would admit, never add any. The new `Range` guard is a conjunct inside the leaf, so under a two-valued `CASE WHEN` or a three-valued Prisma `NOT` it can only make the leaf match the reference more closely (C3 table, last row). A Prisma `floating` declaration that is wrong in the "declared floating, actually `Int`" direction fails loudly (C3: "Unable to fit value…"). The other direction, "declared not floating, actually `Float`", can over-admit, which is why D-08-g makes the declaration required and derives it mechanically. |
| ADR-QD-037 (`madge --circular`, gate 5) | `Compare.ts` → `SecurityLabel.ts` only. `Matcher.ts`, `Predicate.ts`, `RenderablePredicate.ts`, `PredicateLiteral.ts` and `Evaluate.ts` import `Compare.ts`. `PredicateLiteral.ts` stays import-free of `Predicate.ts` (its header promise, `:13`) and may import `Compare.ts`. There is no cycle. |
| ADR-QD-076 (`ignoreStatic`) | Comparison functions are `const f = (…) => …` declarations, and a `Record` table holds references to them. Their bodies run at call time and stay in Stryker's mutated set (C6's evidence). Do not compute any comparison outcome at module load. |
| ADR-QD-002 (untrusted JSON) | `Schema.Finite` on `Gte`/`Lt` bounds (`Matcher.ts:104-105`) stays. `Compare.ts`'s runtime guard is for in-process bounds and for resolved values. |
| Merge gates in `pnpm check` (`package.json:38`) | Typecheck, lint (incl. `check-house-style.mjs`), circular, tstyche, coverage, BDD, spec gates, api, package, example, mutation (all six configs), website. T17 runs the lot. |

## 5. Decisions needed before work starts

### D-08-a — Where the comparison module lives, and whether it is exported

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| **(i) Internal `packages/core/src/Compare.ts`, out of the barrel** | Reachable as `@qadi/core/Compare` via `./*`. Listed in `spec/overview.md` "Not listed above". Public names that need it (`judgeMatcher`, `Verdict`) are exported from `Matcher.ts`. | Matches the `PortAccess.ts`/`ShortCircuit.ts`/`TreeFold.ts` precedent (ADR-QD-077, ADR-QD-090). It keeps generic names like `isFiniteNumber`/`holds` out of the flat namespace (AGENTS.md §9). The interface stays free to change while only core consumes it. | Third parties writing their own renderer cannot import the rules from the root. They can still differential-test against `evaluatePredicate`, which BEH-QD-122 already promises. |
| (ii) A public barrel module | Every function is exported from `@qadi/core`. | Renderer authors get the rules directly. | It freezes a five-function interface into the public surface on day one, and adds generic names to the barrel. |
| (iii) Fold into `PredicateLiteral.ts` | Rename it to "the dialect-free rules", comparisons included. | One fewer file. | `PredicateLiteral.ts` is about *what a renderer may bind*, and the matcher would then import a predicate module, which mixes two concerns. Locality gets worse, not better. |

**Recommendation: (i).** Name it `Compare.ts`, not `Comparison.ts`:
`@qadi/devtools` already exports a `Comparison` type (BEH-QD-224) meaning
something else.

`status: decided (2026-10-05, (i) — recommended default)`

### D-08-b — The result shape

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| (i) Boolean plus a separate "was an operand absent" query | Today's shape, centralized. | Smallest diff. | The reason still re-derives after the fact (C7). Two functions must agree forever, which is the drift this plan exists to remove. |
| (ii) Three-way `Held \| NotHeld \| Unresolved` | The brief's proposal. | It removes `refIsUnresolved`. | It cannot say *which* operand was absent ("has no value" vs "has no reference value", both already distinct sentences in BEH-QD-045), nor tell absence from incomparability (C7's `gte(3)` on `"5"`). |
| **(iii) Closed five-member literal union** | `type Verdict = "Held" \| "NotHeld" \| "ValueAbsent" \| "ReferenceAbsent" \| "Incomparable"`, plus `holds = (v) => v === "Held"`. | Every distinction the reason table needs, with no allocation (string literals, so it is as cheap as a boolean on the hot path). The **ordering is part of the interface**: value absent, then reference absent, then incomparable (type or finiteness, either side), then the comparison. | Five names to document. A boolean caller writes `holds(…)`. |

**Recommendation: (iii).** Composite matchers (`FieldMatch`/`SomeMatch`/`EveryMatch`/`Size`)
return `ValueAbsent` when their own outer value is `undefined`, `Incomparable`
when it is the wrong shape, and otherwise `Held`/`NotHeld` only. They never
propagate an inner absence, which keeps the pinned "did not match" for composites
(§3).

`status: decided (2026-10-05, (iii) — recommended default)`

### D-08-c — How `evaluateMatcher` consumes it, and what happens to the budgeted switch

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| **(i) New public `judgeMatcher(self, value, context): Verdict` hosts the switch** | `evaluateMatcher = (…) => holds(judgeMatcher(…))` becomes a one-line adapter with an unchanged signature (BEH-QD-028). Leaf arms call `Compare.ts`. `SWITCH_BUDGET` stays at 2. `SWITCH_BUDGET_NAMES` and AGENTS.md §5a's table say `judgeMatcher`. | No breaking change. The evaluator calls `judgeMatcher` once and gets both the decision and the reason, which removes the re-resolution `refIsUnresolved` does on every `Neq` denial. | One more public export. Three house-style artefacts must be edited in one commit. |
| (ii) Change `evaluateMatcher`'s return type to `Verdict` | — | No new name. | Breaking for every caller that treats it as a boolean (`if (evaluateMatcher(…))` stops meaning what it did, because a non-empty string is always truthy). That is a silent semantic break, not a compile error. **Wrong.** |
| (iii) Keep `evaluateMatcher` boolean, with leaf arms calling `holds(Compare.eqVerdict(…))` | — | Least churn. | The reason keeps re-deriving (C7 stays). Half the depth gain is lost. |

**Recommendation: (i)**, bench-gated (T8). If `judgeMatcher` regresses
`matcher-heavy` beyond the noise band and no inlining-friendly form recovers it,
the fallback is (iii) for the leaf arms plus D-08-d (ii).

`status: decided (2026-10-05, (i) — by measurement: three `vitest bench` runs before and after, same session, load 28–173. Calling the imported `Compare.ts` verdicts directly regressed per-leaf `evaluateMatcher` ~2.4x (gte(3) 2.18M → 0.88M ops/s by hz), outside the baseline spread; T8 step 7 option (a), module-local bindings of the same functions, recovered it: every case within the baseline's run-to-run hz spread (matcher-heavy 53.1k → 59.4k, deep 57.1k → 61.8k, gte(3) 2.18M → 2.55M, eq(subject) 1.81M → 1.77M within its 5.0% spread, 3-leaf And × 12 rows 403k → 585k after T9). Fallback (iii) not needed)`

### D-08-d — Where the denial-reason text lives, and what it says

| Option | Shape |
| ------ | ----- |
| **(i) Verdict-driven table in `Evaluate.ts`** (text stays with the evaluator; `Compare.ts` returns no prose) | `ValueAbsent` → "has no value" (unchanged). `ReferenceAbsent` → "has no reference value to compare against" (today only for `Neq`; **now also `Eq` and `Dominates`**). `Incomparable` → "is not a value this matcher can compare" (**new**). `NotHeld` on a top-level `Neq` → "matched an excluded value" (unchanged). `NotHeld` otherwise → "did not match" (unchanged). `refIsUnresolved` is deleted. |
| (ii) As (i), but `Incomparable` keeps "did not match" | Fewer text changes. One fewer row in BEH-QD-045. |
| (iii) Move the sentences into `Compare.ts` | `Compare.ts` would learn about "subject attribute 'x'" phrasing, so the module gets shallower in the wrong direction. |

**Recommendation: (i).** The `Eq`/`Dominates` `ReferenceAbsent` row is the same
correction CCR-QD-112 made for `Neq`: "did not match" asserts a comparison that
never ran, which is what INV-QD-029/BEH-QD-045 forbid. The `Incomparable` row
names a type problem as one instead of as a mismatch. The value itself is never
printed, as today.

`status: decided (2026-10-05, (i) — recommended default)`

### D-08-e — Fix the live bug first, as a one-line guard, before any refactor?

- **(i) Yes.** T1 changes `Predicate.ts:163,168` to
  `isRangeBound(value) && isRangeBound(against) && …`, test-first, and is
  shippable alone. The prototype is already green (C1).
- (ii) Fold the fix into the `Compare.ts` refactor. This delays a fail-open fix
  behind an L-sized refactor.

**Recommendation: (i)**, and ship T1–T4 together as the defect wave. T1 alone
fixes in-process `evaluatePredicate` users but moves, rather than removes, the
compiled-SQL over-admission (C3 finding 2).

`status: decided (2026-10-05, (i) — recommended default)` (the brief recommends (i). T1 does not depend on this decision:
the fix is required by BEH-QD-027/127 either way, and only the ordering is being
decided)

### D-08-f — How a compiled query excludes non-finite rows (`@qadi/predicate-sql` and core)

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| **(i) A `Range` guard derived in core, rendered per dialect** | `RenderableNode`'s `Range` gains `finiteGuard: "None" \| "ExcludeNonFinite"`. `RenderRules` gains `finiteness: ColumnFiniteness = { _tag: "Unrepresentable" } \| { _tag: "Unknown" } \| { _tag: "Declared"; floating: ReadonlySet<string> }`. The classifier sets `ExcludeNonFinite` exactly when the target can hold a non-finite value in that column **and** the reference denies some non-finite value on the leaf (`[Infinity, -Infinity, NaN].some((x) => !evaluatePredicate(leaf, {[col]: x}))`, the `nullGuardFor` move: ask the reference, keep no second belief). `@qadi/predicate-sql` passes `Unknown` for `postgres`/`sqlite` and `Unrepresentable` for `mysql`, and renders `ExcludeNonFinite` as `(<range> AND <col> - <col> = 0)`. | One verified text for both engines and every numeric column type (C3 table). No overflow. Excludes all three values. Correct under the `CASE WHEN` negation. MySQL output is unchanged. The decision is in core, so a third dialect only prints syntax. | `compileSql`'s text for every `Range` on postgres/sqlite changes (`"level" >= $1` becomes `("level" >= $1 AND "level" - "level" = 0)`). That breaks a consumer's golden strings, so it is a **minor, marked Breaking** release. The extra residual filter costs nothing measurable, and the range index is still used for the `>=`. |
| (ii) Dialect literal guards | PG `col < 'Infinity'::float8` / `col > '-Infinity'::float8`, SQLite `col < 9e999` / `col > -9e999`. | Also verified on PG. | Two guard shapes (per op), per dialect. The SQLite literal is an engine parsing quirk. More syntax to get wrong. |
| (iii) Bound parameter `col <= $n` with `Number.MAX_VALUE` | — | Dialect-free text. | **Fails** on PG `int` and `real` columns (C3). Rejected. |
| (iv) Refuse every `Range` on a column that may hold non-finite values | — | No new syntax. | On PG/SQLite that is every `Range`, which makes the feature useless. Rejected. |
| (v) Document as an accepted limitation, like N2 | — | Nothing to build. | It is an over-admission (fail-open), not a coercion quirk. ADR-QD-024 forbids it. Rejected. |

**Recommendation: (i)**, with `Declared` used only by Prisma (D-08-g). SQL
callers get no way to switch the guard off (§3: a wrong "finite" declaration
would over-admit).

`status: decided (2026-10-05, (i) — recommended default)`

### D-08-g — The Prisma rendering of `ExcludeNonFinite` (spike-gated, T5)

Prisma has no column arithmetic, and its bounded filters are type-checked per
field (C3). Options:

| Option | Shape | Wrong-declaration behavior |
| ------ | ----- | -------------------------- |
| **(i) Required `floating: ReadonlySet<string>` option plus a `floatingFieldsOf(model)` helper** (`type ∈ {"Float", "Decimal"}`, `kind === "scalar"`) | Core receives `Declared(floating)`. A guarded `Range` renders `{gte: b, lte: Number.MAX_VALUE}` / `{lt: b, gte: -Number.MAX_VALUE}`. | Declared floating but actually `Int`: Prisma refuses loudly (verified message, C3). Declared not floating but actually `Float` holding `Infinity`: **over-admits**. Mitigated because the declaration is required, `floatingFieldsOf` derives it from DMMF, and `type` survives in Prisma 7's runtime DMMF (**UNVERIFIED**, checked by T5). |
| (ii) Optional, defaulting to every column floating | No declaration needed. | Every `Range` on an `Int` field fails at query time. Safe but unusable as a default. |
| (iii) Refuse `Range` on declared-floating columns | No guard syntax at all. | Safe, but Prisma users lose `gte`/`lt` on every `Float` field. |
| (iv) Do nothing for Prisma; document | — | Fail-open on `Float` fields holding non-finite values. Rejected. |

Also **UNVERIFIED** until T5: whether `lte: Number.MAX_VALUE` is accepted on a
`Float` field over SQLite (and PG `double precision`); what `Decimal` does; and
how Prisma reads a non-finite `Float` back. If T5 shows `{lte: MAX_VALUE}` is
refused or unsound, fall back to (iii).

**Recommendation: (i)** if T5 confirms it, else (iii). It is breaking for
`compilePrismaWhere` (a new required option), the same shape and release note as
CCR-QD-157's required `nullable`.

`status: decided (2026-10-05, (iii) — by measurement: T5 spike, Prisma 7.10 + better-sqlite3 `:memory:`. `{score: {gte: 3, lte: Number.MAX_VALUE}}` returned ids `[2,3,4]` where 4 holds `Infinity` — Prisma binds `MAX_VALUE` as the 309-digit decimal string `"1797693134862316…0"`, which SQLite reads back as `Infinity`, so the bound excludes nothing. Same for `Decimal?` (`[2,3,4]`). `{lt: 3, gte: -Number.MAX_VALUE}` returned `[1,5]` (5 = `-Infinity`). On an `Int?` field the bound is refused loudly ("Unable to fit value 1.7976931348623157e+308 into a 64-bit signed integer"). Reading a non-finite `Float`/`Decimal` back returns `Infinity`/`-Infinity`, no throw. Runtime `Prisma.dmmf` keeps `type` (`Float`, `Decimal`, `Int`) but not `isRequired`. The plan's rule — "if `{lte: MAX_VALUE}` is refused or unsound, fall back to (iii)" — applies)`

### D-08-h — Does membership (`In`/`MemberOf`) follow the absent-operand rule?

- **(i) Yes.** `In` and `MemberOf` deny an `undefined` value, as every other
  matcher already does (C9.2). That makes "an absent value never satisfies any
  matcher" total, so it can be stated and property-tested as an invariant
  (INV-QD-NEXT-b). Renderers are unaffected: `undefined` is never a safe literal,
  and a table has no absent column. `Matcher.test.ts`'s prototype-chain tests
  (`:209-216`, `:426`) swap their "true on `undefined`" device for one that is
  true on the *prototype's* value (e.g. `exists()` against a field named
  `constructor`, which reads `Object.prototype.constructor` without the guard and
  `undefined` with it).
- (ii) No. Keep SameValueZero membership of `undefined` and document it as the
  one exception.

**Recommendation: (i)**, as its own task (T13), separable and droppable without
affecting anything else.

`status: decided (2026-10-05, (i) — recommended default)`

### D-08-i — How devtools' witnesses stay honest

- **(i) A post-check.** `satisfyingValue` runs `judgeMatcher` on every witness it
  builds, with a `MatcherContext` derived from `SimulationInput`, and returns
  `Unsynthesisable("the synthesised value does not satisfy the matcher")`
  otherwise. Also give `Gte` the finiteness guard `Lt` already has, so the common
  case keeps a specific reason. BEH-QD-223's REQUIREMENT becomes true by
  construction, whatever comparison semantics do next.
- (ii) Only special-case `Gte` non-finite and `Eq` `NaN`/`undefined`. This patches
  the copy again, the pattern this plan removes.

**Recommendation: (i).**

`status: decided (2026-10-05, (i) — recommended default; post-check applied per leaf, see §10)`

## 6. Tasks

Order: **T1–T4 are the defect wave** (T1–T3 need no decision). T5–T6 are
Prisma. T7–T14 are the deepening. T15–T17 are spec, BDD and the full gate.

### T1 — Make `evaluatePredicate` deny a non-finite row value under `Gte`/`Lt` (test-first defect fix, C1)
- **Status:** [x] done (9927264)
- **Depends on:** —
- **Files:** `packages/core/test/Predicate.test.ts`, `packages/core/src/Predicate.ts`
- **Steps:**
  1. In `Predicate.test.ts`'s `INV-QD-018` describe (`:836`), extend the `level`
     arbitrary (`:845-849`) with
     `FastCheck.constantFrom(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN)`.
     Update the comment above it: "a non-finite row value, like a numeric string,
     is where the two interpreters diverged (CCR-QD-NEXT)". This also feeds the
     faulty-ports property at `:1186`, which shares `rows`.
  2. Add a module-local `const show = (u: unknown) => JSON.stringify(u, (_k, v) => typeof v === "number" && !Number.isFinite(v) ? String(v) : v);`
     and use it in the two property failure messages (`:961`, and the
     `:1186`-property's message). Otherwise `-Infinity`/`NaN` print as `null`
     (C1).
  3. After the named bound test (`:973-990`), add:
     ```ts
     it.effect("a non-finite row value denies on both sides, never admits on one", () =>
       Effect.gen(function* () {
         const cases = [
           P.hasResourceAttribute("level", M.gte(3)),
           P.hasResourceAttribute("level", M.lt(3)),
           P.not(P.hasResourceAttribute("level", M.gte(3))),
           P.not(P.hasResourceAttribute("level", M.lt(3))),
         ];
         for (const policy of cases) {
           const predicate = yield* translate(policy);
           for (const level of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]) {
             const row = { level };
             const decision = yield* evaluate(policy, { resource: row }).pipe(Effect.provide(layer));
             assert.strictEqual(evaluatePredicate(predicate, row), isAllowed(decision), show({ policy, level }));
           }
         }
       }));
     ```
     Add a two-line comment: before CCR-QD-NEXT, `gte(3)` admitted `Infinity` and
     `lt(3)` admitted `-Infinity` through `toPredicate`, while `evaluate` denied
     both, which is ADR-QD-024's worst case.
  4. Run it and confirm **three** failures: the two properties and the named test
     (`expected true to equal false` on `gte(3)` × `Infinity`).
  5. In `Predicate.ts`, change the `Gte` arm (`:163`) to
     `isRangeBound(value) && isRangeBound(against) && value >= against`, and the
     `Lt` arm (`:168`) the same with `<`. `isRangeBound` is a type predicate, so
     there is no `typeof` half to leave as an equivalent mutant (C6).
  6. Replace the comment at `:143-159` with three sentences. State that both
     operands must be finite numbers, as in `evaluateMatcher` (BEH-QD-027,
     CCR-QD-116), and that `isRangeBound` is that check. Say that before
     CCR-QD-NEXT only the bound was guarded, on the false belief that `Infinity >= x`
     agrees across interpreters (it does not: the matcher denies it). Cite issue
     #65/CCR-QD-120 for the bound and CCR-QD-NEXT for the row value. Follow the
     doc-comment shape: summary first.
- **Tests:** one new named test, and two widened properties (red → green). All
  106 existing `Predicate.test.ts` tests stay green.
- **Verify:** `pnpm exec vitest run packages/core/test/Predicate.test.ts packages/core/test/RenderablePredicate.test.ts packages/core/test/Evaluate.test.ts`
- **Done when:** the three tests failed before step 5 and pass after it, and the
  three files are green (prototype: 490/490 across the five comparison test files,
  C1).

### T2 — Pin `lt(3)` × `-Infinity` in the matcher and correct every false claim and mis-citation (C2)
- **Status:** [x] done (2d8a748; the `Matcher.ts:606` `||` mutant is Killed by a scoped Stryker run)
- **Depends on:** T1
- **Files:** `packages/core/test/Matcher.test.ts`, `packages/core/src/Matcher.ts`, `packages/core/src/PredicateLiteral.ts`, `packages/core/test/Predicate.test.ts`, `spec/behaviors/04-matchers.md`
- **Steps:**
  1. In `Matcher.test.ts`'s `"gte and lt reject a non-finite resolved value…"`
     (`:145-156`), add `assert.isFalse(run(M.lt(3), Number.NEGATIVE_INFINITY));`
     and `assert.isFalse(run(M.gte(3), Number.NEGATIVE_INFINITY));`. Rewrite the
     comment (`:146-152`): the load-bearing value for `Lt` is `-Infinity`
     (`-Infinity < 3` is true), and for `Gte` it is `+Infinity`. Cite CCR-QD-116,
     not -115.
  2. Confirm the new `lt` assertion kills the `Matcher.ts:606` `LogicalOperator`
     survivor:
     `pnpm exec stryker run stryker.config.mjs --mutate "packages/core/src/Matcher.ts:601-610"`.
  3. `Matcher.ts`: rewrite `:601-604` as "Symmetric with `Gte` and load-bearing:
     `-Infinity < bound` is true for every finite bound, so without the value
     guard an attribute that decoded to `-Infinity` satisfies every `lt(…)`"
     (CCR-QD-116). Change `:256`'s and `:594`'s "CCR-QD-115" to "CCR-QD-116".
     Keep the `gte` doc's untrusted-JSON argument.
  4. `PredicateLiteral.ts`: rewrite `isRangeBound`'s doc (`:47-56`) as "Whether
     `value` is a number `evaluatePredicate`'s `Gte`/`Lt` can compare: a finite
     number. Both operands are checked: the bound, which is reachable from
     untrusted JSON (CCR-QD-120), and the row value, which a real column can hold
     as `±Infinity`/`NaN` (CCR-QD-NEXT)." Delete "Only the bound needs the check…".
     Rewrite the header's `:10-11` sentence to say both operands.
  5. `Predicate.test.ts:871` and `:968-969`: change "CCR-QD-115" to "CCR-QD-120".
  6. `spec/behaviors/04-matchers.md:139-148` (BEH-QD-027): replace "`lt` already
     failed closed in the mirror case, but is guarded the same way for
     consistency (CCR-QD-116)" with "`lt`'s mirror case is `-Infinity`, which
     `-Infinity < 3` admits, so both guards are load-bearing (CCR-QD-116,
     corrected in CCR-QD-NEXT)". Keep the old text as a `>` blockquote under a
     **Corrected** note (§15's history convention). T15 handles the doc's Change
     History row.
  7. Run the grep from success criterion 3 and fix whatever else it finds in
     `packages/*/src`, `packages/*/test` and `spec`. Leave change-history rows and
     quoted superseded text alone.
- **Tests:** two new assertions. Mutation check on the one range.
- **Verify:** `pnpm exec vitest run packages/core/test/Matcher.test.ts packages/core/test/PredicateLiteral.test.ts` and both greps (criteria 3, 4)
- **Done when:** both greps are empty, and the `:606` mutant is `Killed`.

### T3 — Give the SQL engine oracles a non-finite-capable column (red characterization, C3/C4)
- **Status:** [x] done (3bb389a, committed with T4 so no commit leaves a red suite)
- **Depends on:** T1 (the reference must be right before an engine is compared against it)
- **Files:** `packages/predicate-sql/test/sqlEngines.ts`, `packages/predicate-sql/test/generators.ts`, `packages/predicate-sql/test/EngineAgreement.test.ts`
- **Steps:**
  1. `sqlEngines.ts`: add `score` to `EngineRow` (`number | null`) and to both
     DDLs: PG `score double precision` (`:83`), SQLite `score REAL` (`:136`).
     Assign it **cyclically**, `score = SCORES[(id - 1) % SCORES.length]`, so the
     universe stays 48 rows. Use
     `SCORES_PG = [null, 0, 3, 5, Infinity, -Infinity, NaN]` and
     `SCORES_SQLITE = [null, 0, 3, 5, Infinity, -Infinity]`: SQLite stores `NaN`
     as `NULL` (C3.3), so a reference row holding `NaN` would not describe the
     stored row. Export both `ROWS_PG` and `ROWS_SQLITE`, and keep `ROWS` as the
     PG one for existing callers. PGlite binds `Infinity`/`NaN` correctly when
     passed as the strings `'Infinity'`, `'-Infinity'` and `'NaN'` with an
     explicit `$n::float8` cast in the insert (the probe's form).
  2. Update the doc comment's row-universe sentence. Say why `score` is a float
     column: "the only column type that can hold the non-finite values CCR-QD-NEXT
     found both engines admit".
  3. `generators.ts`: add `Gte`/`Lt` leaves on `score` with `integer({min: 0, max: 5})`
     bounds, `Eq`/`Neq` on `score` with finite literals, and a `MemberOf` on
     `score`.
  4. `EngineAgreement.test.ts`: compute `expected` per engine from that engine's
     row array. Add a named test `"S5: a non-finite score is never admitted where
     evaluatePredicate denies it"` that asserts, per engine, exact ids for
     `Gte score 3`, `Lt score 3`, `Negate(Gte score 3)` and `Negate(Lt score 3)`.
  5. Run it. Expect PG to **fail** on `Gte` (admits `Infinity` and `NaN`) and on
     `Lt` (admits `-Infinity`). Expect SQLite to fail on `Gte` (`Infinity`) and on
     `Lt` (`-Infinity`). Record the exact failing ids in the CCR. Land T3 and T4
     in one PR. T3's tests are the red half.
- **Tests:** S1/S3 sample `score` leaves. New S5.
- **Verify:** `pnpm exec vitest run --project predicate-sql packages/predicate-sql/test/EngineAgreement.test.ts`
- **Done when:** S5 fails as described at T1's HEAD and passes after T4, and
  S1–S4 pass after T4.

### T4 — Core classifies a `Range` guard; `@qadi/predicate-sql` renders it (D-08-f)
- **Status:** [x] done (3bb389a)
- **Depends on:** T3, D-08-f
- **Files:** `packages/core/src/RenderablePredicate.ts`, `packages/core/test/RenderablePredicate.test.ts`, `packages/predicate-sql/src/index.ts`, `packages/predicate-sql/test/CompileSql.test.ts`, `packages/predicate-prisma/src/index.ts` (interim: pass `Unrepresentable` until T6, see step 6)
- **Steps** (written for D-08-f (i)):
  1. `RenderablePredicate.ts`: add
     `export type ColumnFiniteness = { readonly _tag: "Unrepresentable" } | { readonly _tag: "Unknown" } | { readonly _tag: "Declared"; readonly floating: ReadonlySet<string> };`
     and `export type FiniteGuard = "None" | "ExcludeNonFinite";`. Add
     `readonly finiteness: ColumnFiniteness` to `RenderRules` (`:81-90`) and
     `readonly finiteGuard: FiniteGuard` to the `Range` member (`:128-134`), with
     doc comments that state the lie-safety argument: the guard is a conjunct, so
     it only removes rows.
  2. Add `NON_FINITE: ReadonlyArray<number> = [Infinity, -Infinity, NaN]`. Add
     `mayHoldNonFinite(finiteness, column)` as a `Record<ColumnFiniteness["_tag"], …>`
     table, not a switch. Add
     `finiteGuardFor(leaf, column, rules): FiniteGuard`, which returns
     `"ExcludeNonFinite"` when `mayHoldNonFinite(…)` and
     `NON_FINITE.some((x) => !evaluatePredicate(leaf, { [column]: x }))`, else
     `"None"`. This is the `nullGuardFor` move: the reference decides.
  3. In the `Compare` arm's `Range` branch (`:294-300`), set
     `finiteGuard: finiteGuardFor(p, p.column, ctx.rules)`.
  4. `RenderablePredicate.test.ts`:
     - add `Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN` to
       `cell` (`:64-69`);
     - make the test-only interpreter's `Range` (`:146-151`) apply the guard
       literally: `finiteGuard === "ExcludeNonFinite"` conjoins
       `Number.isFinite(cell)`;
     - add `finiteness` to every `RenderRules` literal the file builds;
     - add R9, "a Range's finiteGuard is ExcludeNonFinite exactly when the target
       may hold a non-finite value and the reference denies one", over
       `Unrepresentable`/`Unknown`/`Declared`;
     - update the golden `Range` literals (`:417`, `:719`, `:816`).
  5. `predicate-sql/src/index.ts`: add `finiteness` to `DialectSyntax`'s
     neighbor, a `FINITENESS: Record<SqlDialect, ColumnFiniteness>`
     (`postgres`/`sqlite`: `Unknown`, `mysql`: `Unrepresentable`), and pass
     `FINITENESS[options.dialect]` in `compileSql`'s `rules` (`:293-303`). Add
     `FINITE_GUARDED: Record<FiniteGuard, (column: string, expression: string) => string>`
     with `ExcludeNonFinite: (c, e) => \`(${e} AND ${c} - ${c} = 0)\``. Apply it
     inside `Range` (`:183-188`) *before* `GUARDED[n.nullGuard]`, so a nullable
     column reads `((col >= $1 AND col - col = 0) OR …)`. The null guard is never
     `AdmitNull` on a `Range`, but the order is stated anyway. Comment the C3
     measurements, including why not `MAX_VALUE` (fails on PG `int`/`real`).
  6. `predicate-prisma/src/index.ts`: until T6, pass
     `finiteness: { _tag: "Unrepresentable" }`, with a `// T6 (ARCH-08)` comment
     naming the known Prisma gap. This keeps Prisma's output byte-identical in
     this PR. Its renderer must still accept the new `Range` field (it ignores
     `finiteGuard` until T6).
  7. `CompileSql.test.ts`: update every postgres/sqlite golden `Range` string.
     Add `"a Range on postgres and sqlite excludes non-finite rows; mysql does not
     need to"`, asserting the three texts.
- **Tests:** R2/R3 widened, new R9, S5 (T3) green, goldens updated.
- **Verify:** `pnpm exec vitest run packages/core/test/RenderablePredicate.test.ts` then `pnpm exec vitest run --project predicate-sql --project predicate-prisma`, then `pnpm typecheck`
- **Done when:** T3's S5 and S1–S4 pass on both engines, R2/R3/R9 pass with
  non-finite cells, and `predicate-prisma`'s suite is unchanged and green.

### T5 — Spike: what Prisma accepts and returns for a non-finite `Float` (D-08-g)
- **Status:** [x] done (spike in scratch; D-08-g decided (iii) on evidence)
- **Depends on:** — (can run beside T1–T4)
- **Files:** scratch only (a copy of `packages/predicate-prisma/prisma/schema.prisma` with `score Float?`, generated into the scratchpad). No repo file changes.
- **Steps:**
  1. Generate a client from the scratch schema (`pnpm exec prisma generate --schema <scratch>/schema.prisma`)
     into the scratchpad.
  2. Over `@prisma/adapter-better-sqlite3` `:memory:`, insert
     `score ∈ {0, 3, 5, 9e999, -9e999}` raw. Run `findMany` with `{score: {gte: 3}}`,
     `{score: {gte: 3, lte: Number.MAX_VALUE}}`,
     `{score: {lt: 3, gte: -Number.MAX_VALUE}}`, and each wrapped in `{NOT: …}`.
     Record the returned ids, and whether reading `score` back returns
     `Infinity` or throws.
  3. Repeat for a `Decimal?` column.
  4. Check `Prisma.dmmf.datamodel.models[0].fields[*].type` at runtime in Prisma
     7.10, which decides whether `floatingFieldsOf` can read it.
  5. Write the results into D-08-g and set its status.
- **Tests:** none (spike).
- **Verify:** the recorded output table in D-08-g.
- **Done when:** D-08-g is `decided`, with (i) confirmed or the fallback (iii)
  chosen on evidence.

### T6 — `@qadi/predicate-prisma` renders the guard (D-08-g)
- **Status:** [x] done (e649f80; deviated per D-08-g (iii): ranges on declared-floating columns refuse `NonFiniteColumn`; see §10)
- **Depends on:** T4, T5, D-08-g
- **Files:** `packages/predicate-prisma/src/index.ts`, `packages/predicate-prisma/prisma/schema.prisma`, `packages/predicate-prisma/test/{fixture.ts,prismaEngine.ts,generators.ts,EngineAgreement.test.ts,CompilePrismaWhere.test.ts}`
- **Steps** (written for D-08-g (i)):
  1. Add `readonly floating: ReadonlySet<string>` (required) to
     `CompilePrismaWhereOptions` (`:59-69`), with the declaration's
     wrong-in-each-direction behavior in its doc comment. Add `type: string` to
     `PrismaFieldLike` (`:74-78`) and
     `export const floatingFieldsOf = (model: PrismaModelLike): ReadonlySet<string>`
     (`kind === "scalar"` and `type` is `"Float"` or `"Decimal"`).
  2. Pass `finiteness: { _tag: "Declared", floating: options.floating }` in
     `compilePrismaWhere` (`:389-396`). Replace T4's interim `Unrepresentable`.
  3. In `Range` (`:307`), merge the guard into the field filter:
     `{gte: b, lte: Number.MAX_VALUE}` or `{lt: b, gte: -Number.MAX_VALUE}`,
     before `GUARDED[n.nullGuard]`. That composes with `excludeNull`'s
     `{…, not: null}`.
  4. Fixture: add `score Float?` to `schema.prisma`, the DDL in `prismaEngine.ts`
     (`"score" REAL`), cyclic `score` values as in T3 without `NaN`, and
     `FIXTURE_FLOATING = new Set(["score"])` in `fixture.ts`, threaded through
     `compile`.
  5. Generators: `score` leaves as in T3. Add an engine test P5 mirroring S5.
  6. `CompilePrismaWhere.test.ts`: the goldens for `Range` on `score`, a test
     that `floatingFieldsOf` reads a DMMF-shaped model, and a test that
     declaring an `Int` column floating fails at query time (the loud direction,
     T5's message).
- **Tests:** P5. Widened P1–P4. New golden and helper tests.
- **Verify:** `pnpm exec vitest run --project predicate-prisma` (globalSetup regenerates the fixture client if `prisma/generated` is stale; delete it first: `rm -rf packages/predicate-prisma/prisma/generated`)
- **Done when:** P5 passes and no existing Prisma test regresses. If D-08-g took
  (iii), the steps become "refuse `Range` on a declared-floating column with
  `refusal: "NonFiniteColumn"`", which widens `RenderRefusal` as a full closed
  union, with a test per direction.

### T7 — Create `Compare.ts`: one owner of primitive comparison semantics (D-08-a, D-08-b)
- **Status:** [x] done (6336d71)
- **Depends on:** T1, T2, D-08-a, D-08-b
- **Files:** `packages/core/src/Compare.ts` *(new)*, `packages/core/test/Compare.test.ts` *(new)*
- **Steps** (for D-08-a (i), D-08-b (iii)):
  1. Write the module. Its header follows the doc-comment shape: the summary line,
     then why. Name the three repairs (CCR-QD-112/116/120) and C1 as the cost of
     the copies, and `nullGuardFor` as the precedent.
     ```ts
     /** How one comparison came out. Ordered: an absent value is reported before an absent reference, both before incomparability. */
     export type Verdict = "Held" | "NotHeld" | "ValueAbsent" | "ReferenceAbsent" | "Incomparable";
     export const holds = (verdict: Verdict): boolean => verdict === "Held";
     /** A finite number. `Number.isFinite` does not coerce, so a non-number is false too. */
     export const isFiniteNumber = (u: unknown): u is number => Number.isFinite(u);
     export const equalsVerdict: (value: unknown, reference: unknown) => Verdict;   // `===`: NaN never equal (pinned, Matcher.ts:137-145)
     export const differsVerdict: (value: unknown, reference: unknown) => Verdict;  // `!==` on two present operands
     export const atLeastVerdict: (value: unknown, bound: unknown) => Verdict;      // both finite, then `>=`
     export const belowVerdict: (value: unknown, bound: unknown) => Verdict;        // both finite, then `<`
     export const memberVerdict: (value: unknown, values: ReadonlyArray<unknown>) => Verdict; // SameValueZero; absent rule per D-08-h (T13)
     export const dominatesVerdict: (value: unknown, reference: unknown) => Verdict; // isSecurityLabel both, then labelDominates
     export type CompareOp = "Eq" | "Neq" | "Gte" | "Lt";
     export const compareVerdict: (op: CompareOp, value: unknown, reference: unknown) => Verdict; // via a module-scope Record<CompareOp, …>
     ```
     `equalsVerdict` is `value === undefined ? "ValueAbsent" : reference === undefined ? "ReferenceAbsent" : value === reference ? "Held" : "NotHeld"`.
     The redundant `other !== undefined` half is gone (C6's equivalent mutants).
     `atLeastVerdict` returns `ValueAbsent` for `undefined`, `Incomparable` when
     either side is not a finite number, and then `value >= bound`.
     `memberVerdict` keeps today's semantics until T13.
  2. Move `CompareOp` here. `Predicate.ts` re-exports it
     (`export type { CompareOp } from "./Compare.ts"`) so the public name and
     `spec/overview.md`'s row stay put.
  3. `Compare.test.ts`, the interface as the test surface:
     - a table-driven test per verdict function over an **operand universe**:
       `undefined`, `null`, `0`, `3`, `-2.5`, `"3"`, `true`, `Infinity`,
       `-Infinity`, `NaN`, `{}`, `[]`, `10n`, a `SecurityLabel`. It asserts the
       exact `Verdict`, ordering included;
     - a test that `compareVerdict(op, …)` equals the named function for each op;
     - a test that `holds` is true only for `"Held"`.
- **Tests:** new file. Every row is one assertion with a message naming the
  operand pair.
- **Verify:** `pnpm exec vitest run packages/core/test/Compare.test.ts` and `pnpm circular`
- **Done when:** the file is green, `madge` shows no cycle, and nothing imports
  `Compare.ts` yet.

### T8 — `judgeMatcher` hosts the budgeted switch; `evaluateMatcher` becomes its adapter (D-08-c), bench-gated
- **Status:** [x] done (d8d56f3; option (a) module-local bindings were needed, see §10)
- **Depends on:** T7, D-08-c
- **Files:** `packages/core/src/Matcher.ts`, `packages/core/bench/Compare.bench.ts` *(new)*, `scripts/check-house-style.mjs`, `AGENTS.md`, `packages/core/test/Matcher.test.ts`
- **Steps:**
  1. **Bench baseline first.** Add `Compare.bench.ts` with these single-`bench`
     cases (not `bench.compare` with one case, see C10):
     - `evaluateMatcher` on `gte(3)`, `eq(subject("tenantId"))`, `neq(literal("x"))`
       and `someMatch(eq(literal("red")))` over a fixed value list;
     - `evaluatePredicate` over a 3-leaf `And` × 12 rows.

     Run `pnpm exec vitest bench --run packages/core/bench/Compare.bench.ts packages/core/bench/Evaluate.bench.ts --reporter=verbose`
     **three times** at the pre-T8 commit, and record the mean of each case (C10
     has one run).
  2. Rename the switch's host. Add
     `export const judgeMatcher = (self: Matcher, value: unknown, context: MatcherContext): Verdict => { switch (self._tag) { … } }`,
     moving the body of `:552-641` with these leaf arms:
     - `Eq`/`Neq`: `equalsVerdict`/`differsVerdict(value, resolveRef(self.ref, context))`;
     - `Dominates`: `dominatesVerdict(…)`;
     - `In`: `memberVerdict`;
     - `Gte`/`Lt`: `atLeastVerdict`/`belowVerdict(value, self.value)`;
     - `Exists`: `value === undefined ? "ValueAbsent" : value === null ? "NotHeld" : "Held"`;
     - `Contains`: `undefined` → `ValueAbsent`, wrong shape → `Incomparable`;
     - the composite rule from D-08-b, with recursion through `judgeMatcher` and
       `holds` for `SomeMatch`/`EveryMatch`.

     Keep the budget comment (`:557-562`), renamed. The `Verdict` return type
     still makes a missed arm TS2366.
  3. `export const evaluateMatcher = (self, value, context): boolean => holds(judgeMatcher(self, value, context));`
     with its existing doc comment plus one line naming `judgeMatcher`. Add
     `export type { Verdict } from "./Compare.ts";`.
  4. `scripts/check-house-style.mjs:298`: change `"evaluateMatcher"` to
     `"judgeMatcher"` in `SWITCH_BUDGET_NAMES`, and the comment at `:282`. In
     AGENTS.md §5a, change the table row `:343` to `Matcher.ts — judgeMatcher`
     and `:399`'s sentence the same way. Same commit.
  5. Delete the now-dead comments in the old arms (`:592-610`) that restate the
     rules. Point at `Compare.ts` once.
  6. `Matcher.test.ts`: tests that only restate a primitive rule against
     `evaluateMatcher` move to `Compare.test.ts` (replace, don't layer):
     `:80-90`, `:145-156` and the `Eq`/`Neq` absent-operand pins. Keep tests of
     matcher *structure* (`FieldMatch` own-property, `EveryMatch` vacuity, `Size`,
     prototype guards, the "eq vs inArray" block) where they are. Add a
     `judgeMatcher` test per composite rule from D-08-b.
  7. **Bench after**, three runs, same session. Accept if every case is within
     the baseline's run-to-run spread. Otherwise try (a) inlining the
     `Gte`/`Lt`/`Eq`/`Neq` verdicts as local `const` arrows in `Matcher.ts` that
     call the exported `Compare.ts` ones, then (b) D-08-c's fallback. Record both
     tables in the CCR.
- **Tests:** `Matcher.test.ts` and `Evaluate.test.ts` unchanged in outcome (212 +
  the moved count).
- **Verify:** `pnpm exec vitest run packages/core/test/Matcher.test.ts packages/core/test/Compare.test.ts packages/core/test/Evaluate.test.ts`, `pnpm lint`, `pnpm bench` (the two files above)
- **Done when:** the tests are green, `check-house-style.mjs` passes with
  `SWITCH_BUDGET` unchanged, and the bench tables are recorded and within noise.

### T9 — `evaluatePredicate` and translation consume `Compare.ts`
- **Status:** [x] done (f3c149f)
- **Depends on:** T7
- **Files:** `packages/core/src/Predicate.ts`, `packages/core/test/Predicate.test.ts`
- **Steps:**
  1. Delete `dispatchCompare` and `compare` (`:113-174`). Set the
     `dispatchPredicate` arms to
     `Compare: (p) => (row) => holds(compareVerdict(p.op, row[p.column], p.value))`
     and `MemberOf: (p) => (row) => holds(memberVerdict(row[p.column], p.values))`.
     Drop the now-unused `isRangeBound` import.
  2. `columnPredicate` (`:269-295`): leave its tag→`CompareOp` mapping, typed by
     `Compare.ts`'s `CompareOp`. Its doc comment names `Compare.ts` as where the
     ops' *meaning* lives.
  3. Rewrite `evaluatePredicate`'s doc (`:176-193`): the reference semantics of a
     `Predicate` are `Compare.ts`'s verdicts applied per row, the same functions
     `judgeMatcher` applies, so the leaves of the two interpreters cannot
     disagree by construction (T11 is the test).
  4. Re-run T8's bench `evaluatePredicate` case (three runs) and record it.
- **Tests:** `Predicate.test.ts` unchanged and green (T1's additions included).
- **Verify:** `pnpm exec vitest run packages/core/test/Predicate.test.ts` and the bench
- **Done when:** green, and `grep -n "dispatchCompare\|isRangeBound" packages/core/src/Predicate.ts` is empty.

### T10 — The renderable classifier and `PredicateLiteral.ts` consume `Compare.ts`
- **Status:** [x] done (a0e389c)
- **Depends on:** T4, T7
- **Files:** `packages/core/src/RenderablePredicate.ts`, `packages/core/src/PredicateLiteral.ts`, `packages/core/test/PredicateLiteral.test.ts`
- **Steps:**
  1. `PredicateLiteral.ts`: `export const isRangeBound: (value: unknown) => value is number = isFiniteNumber;`
     The same function object stays a public export (overview row
     `spec/overview.md:166`). Its doc says it is `Compare.ts`'s `isFiniteNumber`
     under the renderer-facing name. `isSafeLiteral`'s number branch calls
     `isFiniteNumber` too.
  2. `RenderablePredicate.ts`: the `Gte`/`Lt` constant-false rule (`:287-293`) asks
     the reference rather than restating it: a `Range` exists exactly when
     `isFiniteNumber(value)`. Keep `isRangeBound` as the call so the overview row
     stays true. Rewrite the comment to cite `Compare.ts`'s `atLeastVerdict`/`belowVerdict`.
  3. `PredicateLiteral.test.ts`: add `assert.strictEqual(isRangeBound, isFiniteNumber)`
     (identity, not behavior). That is the "one definition" claim made checkable.
- **Tests:** existing R-tests and the bound-rule test (`RenderablePredicate.test.ts:845-875`) stay green.
- **Verify:** `pnpm exec vitest run packages/core/test/PredicateLiteral.test.ts packages/core/test/RenderablePredicate.test.ts`
- **Done when:** green.

### T11 — Prove the two interpreters' leaves are one function: a leaf-agreement property
- **Status:** [x] done (dd0eeff)
- **Depends on:** T8, T9
- **Files:** `packages/core/test/Compare.test.ts`
- **Steps:**
  1. Add `"PROPERTY: every primitive matcher and its predicate leaf agree on every
     operand class"`. For `m` in
     `[eq(literal(v)), neq(literal(v)), gte(n), lt(n), inArray(vs)]`, with
     `v`/`n`/`vs` drawn from the T7 operand universe (bounds include non-finite
     values), and for every `x` in the universe, assert
     `holds(judgeMatcher(m, x, ctx)) === evaluatePredicate(leafFor(m), { c: x })`,
     where `leafFor` is the `columnPredicate` mapping restated in the test
     (`Compare`/`MemberOf` on column `c`). Count the pairs and assert the count,
     so a shrunken universe fails rather than passing vacuously (the INV-QD-019
     discipline).
  2. Add the structural grep from success criterion 7 as a test-adjacent script
     check in T17. Allowlist: `getByPath`/`isObject`/`Object.hasOwn` guards,
     `lengthOf`, `containsValue`'s shape checks. Write the allowlist into the
     CCR, not into a script.
- **Tests:** one property.
- **Verify:** `pnpm exec vitest run packages/core/test/Compare.test.ts`
- **Done when:** green, with the asserted pair count.

### T12 — The denial reason reads a `Verdict`; `refIsUnresolved` is deleted (D-08-d)
- **Status:** [x] done (683ebef)
- **Depends on:** T8, D-08-d
- **Files:** `packages/core/src/Evaluate.ts`, `packages/core/src/Matcher.ts` (ED-03 ledger), `packages/core/test/Evaluate.test.ts`
- **Steps** (for D-08-d (i)):
  1. In both attribute arms (`:679-689`, `:710-720`), call `judgeMatcher` once:
     `const verdict = judgeMatcher(policy.matcher, value, matcherContext); return holds(verdict) ? allow(…) : deny(…, attributeReason(side, attribute, verdict, policy.matcher));`.
  2. Replace `attributeReason` (`:378-390`) with a lookup:
     - `ValueAbsent` → `has no value`;
     - `ReferenceAbsent` → `has no reference value to compare against`;
     - `Incomparable` → `is not a value this matcher can compare`;
     - `NotHeld` → `matcher._tag === "Neq" ? "matched an excluded value" : "did not match"`.

     Use a module-scope `Record<Exclude<Verdict, "Held" | "NotHeld">, string>`
     plus the one `Neq` branch. Shorten the 55-line doc comment (`:323-377`) to
     the summary, then one paragraph each on the `Neq` inversion and on
     composites, then the history: CCR-QD-112 and CCR-QD-NEXT.
  3. Delete `refIsUnresolvedFor`/`refIsUnresolved` (`:392-419`). Update the ED-03
     ledger (`Matcher.ts:371-391`) to four sites, and renumber.
  4. `Evaluate.test.ts`:
     - keep `:76-83`, `:85-95`, `:97-163` and `:247-255` as they are, since their
       texts are unchanged;
     - add `"An Eq against an unresolved reference says so, not 'did not match'"`
       (`hasAttribute("tenant", eq(subject("missing")))` on a present `tenant`);
     - add the `Dominates` twin;
     - add `"A non-finite or wrong-typed value is named incomparable"` for
       `gte(3)` × `Infinity` and × `"5"`;
     - add a test that a composite (`someMatch(eq(subject("missing")))`) still
       reads "did not match".
- **Tests:** four new reason tests. The existing ones are unchanged.
- **Verify:** `pnpm exec vitest run packages/core/test/Evaluate.test.ts` and `grep -n "refIsUnresolved" packages/core/src/Evaluate.ts` (expect nothing)
- **Done when:** green and the grep is empty.

### T13 — Membership follows the absent-operand rule (D-08-h)
- **Status:** [x] done (78d3b84)
- **Depends on:** T7, T8, T9, D-08-h
- **Files:** `packages/core/src/Compare.ts`, `packages/core/test/Compare.test.ts`, `packages/core/test/Matcher.test.ts`, `packages/core/test/Predicate.test.ts`
- **Steps** (for D-08-h (i)):
  1. Write the tests first.
     - `Compare.test.ts`: `memberVerdict(undefined, [undefined])` is `"ValueAbsent"`.
     - `Predicate.test.ts`: `MemberOf` on an absent column with values
       `[undefined]` denies, and agrees with `evaluate`.
     - Add a `Compare.test.ts` property: **for every matcher in the generator
       (all twelve tags, nested), `judgeMatcher(m, undefined)` is not `"Held"`**
       (INV-QD-NEXT-b).

     Confirm they fail.
  2. `memberVerdict`: `value === undefined ? "ValueAbsent" : values.includes(value) ? "Held" : "NotHeld"`.
  3. Rewrite `Matcher.test.ts:209-216` and `:426`. Each must still kill the
     `Object.hasOwn` mutant, with a matcher true on the *prototype's* value: for
     `:426`, `fieldMatch("constructor", exists())` on `{ a: 1 }` must deny (it
     would allow if the guard read `Object.prototype.constructor`). Re-run
     `pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/Matcher.ts`
     and confirm the `Object.hasOwn` mutants stay killed.
- **Tests:** three new, two rewritten.
- **Verify:** `pnpm exec vitest run packages/core/test/Compare.test.ts packages/core/test/Matcher.test.ts packages/core/test/Predicate.test.ts`
- **Done when:** green, and the `Matcher.ts` `Object.hasOwn` mutants are `Killed`.

### T14 — Devtools witnesses are checked against `judgeMatcher` (D-08-i, C9.1)
- **Status:** [x] done (c97942a; deviated: the post-check judges leaf witnesses only, see §10)
- **Depends on:** T8, D-08-i
- **Files:** `packages/devtools/src/model/Remedies.ts`, `packages/devtools/test/Remedies.test.ts` (or the file that tests `satisfyingValue`, located with `grep -rln satisfyingValue packages/devtools/test`)
- **Steps:**
  1. Tests first:
     - `satisfyingValue(gte(Infinity))`, `gte(NaN)`, `gte(-Infinity)`,
       `eq(literal(NaN))` and `eq(literal(undefined))` each return
       `Unsynthesisable` with a reason;
     - a property over generated matchers (reuse ARCH-02's devtools matcher
       generator if one exists, else a small `letrec` over the twelve tags,
       non-finite bounds included): every `Value` witness satisfies
       `judgeMatcher` (BEH-QD-223).

     Confirm the five named cases fail at HEAD (C9.1's table).
  2. In `satisfyingValue` (`:115-116`), fold as today, then post-check: if the
     result is a `Value` and
     `!holds(judgeMatcher(matcher, result.value, contextOf(input)))`, return
     `cannot("the synthesised value does not satisfy the matcher")`.
     `contextOf(input)` builds a `MatcherContext` from `SimulationInput`
     (`subject.attributes`, `subject.id`, `resource`, `action`).
  3. `Gte` (`:173`): mirror `Lt`'s finiteness guard so the common case keeps a
     specific reason (`no value at least ${String(m.value)} can be synthesised`).
- **Tests:** five named, one property.
- **Verify:** `pnpm exec vitest run --project devtools`
- **Done when:** green. `stryker.devtools.mjs` is run in T17.

### T15 — Spec, ADR, CCR, traceability, overview and changesets
- **Status:** [x] done (be696da)
- **Depends on:** T1–T14 (each behavior PR carries its own slice; this task is the checklist)
- **Files:** `spec/behaviors/04-matchers.md`, `spec/behaviors/06-services.md`, `spec/behaviors/16-predicates.md`, `spec/behaviors/29-devtools-simulator.md`, `spec/behaviors/31-predicate-compilation.md`, `spec/invariants.md`, `spec/decisions/079-renderability-is-a-core-rule.md`, `spec/decisions/040-an-unwired-port-names-its-absence.md`, `spec/decisions/NNN-comparison-semantics-have-one-owner.md` *(new, ADR-QD-NEXT)*, `spec/decisions/index.yaml`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md` (CCR register), `.changeset/*.md` *(new)*
- **Steps:**
  1. **BEH-QD-027** (04-matchers): the T2 correction. Add **BEH-QD-NEXT-a**,
     "Comparison semantics have one owner", with the `Verdict` union and its
     ordering, `judgeMatcher`'s signature, and `evaluateMatcher = holds ∘ judgeMatcher`.
     **BEH-QD-028**: add `judgeMatcher` to its ` ```ts ` listing. Bump the Rev and
     add a Change History row.
  2. **BEH-QD-045** (06-services): the reason table gains `Eq`/`Dominates` with an
     unresolved reference ("has no reference value to compare against") and the
     incomparable row (D-08-d). Add a matching `>` **Corrected** note in
     ADR-QD-040 `:125-138`.
  3. **BEH-QD-122/127** (16-predicates): state that `evaluatePredicate`'s leaves
     are `Compare.ts`'s verdicts. BEH-QD-127 names non-finite row values among the
     generated rows.
  4. **BEH-QD-271/272, 241, 242, 244** (31-predicate-compilation):
     - `Range` gains `finiteGuard`, and `RenderRules` gains `finiteness`;
     - add a new **BEH-QD-NEXT-c**: "A range never admits a non-finite row the
       reference denies". REQUIREMENT text: postgres/sqlite render
       `col - col = 0`; mysql needs nothing; Prisma per D-08-g. Add a ` ```typescript `
       example compiling `Compare score Gte 3` for postgres, which must compile
       under `pnpm spec:examples`;
     - BEH-QD-241/242: the engines hold a `double precision`/`REAL`/`Float` column;
     - BEH-QD-244: record PG's `NaN` ordering (C3.1) as the found defect.
  5. **BEH-QD-223** (29-devtools-simulator): the post-check sentence.
  6. **Invariants:**
     - INV-QD-018: a dated paragraph in the style of `:545-566`. The row side was
       never sampled, the bound fix's comment claimed it agreed, and the property
       now samples it (CCR-QD-NEXT);
     - INV-QD-047/048: engines hold non-finite values, and PG `NaN` is the defect
       a real engine found again;
     - INV-QD-061: the Source names `finiteGuardFor`, and Enforcement names
       non-finite cells and R9;
     - **INV-QD-NEXT-a**: "A primitive matcher and its predicate leaf are one
       function". Source `Compare.ts`, Enforcement T11;
     - **INV-QD-NEXT-b** (if D-08-h (i)): "An absent value never satisfies a
       matcher". Enforcement T13's property.
  7. **ADR-QD-079** Rev 1.1, under an `## Amendment (CCR-QD-NEXT)` heading: (a)'s
     "so the rule cannot lag" was true of the bound only, and the row half is now
     `Compare.ts`'s. Add (e) finiteness: a renderer-declared `ColumnFiniteness`,
     the derived `Range` guard, and why SQL takes no declaration (lie-safety).
     Prisma's `floating` narrows ADR-QD-054's "never sees a schema" once more,
     by one fact.
  8. **ADR-QD-NEXT** (new file plus an `index.yaml` row): "Comparison semantics
     have one owner". Context: C6's table and the four repairs. Decision:
     D-08-a/b/c/d/h. Consequences: one more public export (`judgeMatcher`,
     `Verdict`); `SWITCH_BUDGET_NAMES` renamed; the ED-03 ledger shrinks.
  9. **Traceability:** rows for `Compare.ts`/`Compare.test.ts`/`Compare.bench.ts`,
     the new BEH/INV ids, the T3/T6 engine tests, and ADR-QD-NEXT. Run
     `pnpm spec:verify:strict`.
  10. **`spec/overview.md`** (gate 13):
      - `judgeMatcher`, `Verdict` in the matcher row (`:142`);
      - `ColumnFiniteness`, `FiniteGuard` in the renderable row;
      - `floatingFieldsOf` in the Prisma table;
      - correct the `isRangeBound` row (`:166`) to say both operands;
      - a "Not listed above" row for `@qadi/core/Compare.ts`'s exports
        (`holds`, `isFiniteNumber`, `equalsVerdict`, `differsVerdict`,
        `atLeastVerdict`, `belowVerdict`, `memberVerdict`, `dominatesVerdict`,
        `compareVerdict`), with the AGENTS.md §9 reason;
      - a Change History row.

      Run `pnpm spec:api`.
  11. **CCR register** (`spec/README.md`): one CCR-QD-NEXT row for the defect wave
      (T1–T6) and one for the deepening (T7–T14). Assign numbers at merge.
  12. **Changesets** (fixed group, so one bump moves all nine packages):
      - `@qadi/core` minor: the fix, `judgeMatcher`/`Verdict`, `RenderRules.finiteness`
        and `Range.finiteGuard`. **Breaking** for any hand-built `RenderRules`
        and for exhaustive matches on `Range`'s fields;
      - `@qadi/predicate-sql` minor: **Breaking**, the `Range` text on
        postgres/sqlite gains `AND col - col = 0`;
      - `@qadi/predicate-prisma` minor: **Breaking**, the required `floating`
        option and `floatingFieldsOf`;
      - `@qadi/devtools` patch: the witness post-check.

      Each changeset names the C1/C3 fail-open in one sentence.
- **Tests:** the gates themselves.
- **Verify:** `pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && pnpm spec:api`
- **Done when:** all five pass.

### T16 — BDD: the acceptance suite names the non-finite case
- **Status:** [x] done (d7b54e7; deviated: two Scenarios, not a Scenario Outline, see §10)
- **Depends on:** T1
- **Files:** `features/features/predicates/predicates.feature`, `features/features/predicates/predicates.steps.test.ts`
- **Steps:**
  1. Add `Scenario: A resource whose level is infinite is denied by the evaluator
     and excluded by the filter`, under the existing `@REQ-QD-016` tag. Use the
     `gte(3)` policy, a resource with `level: Infinity`, and the `-Infinity`
     `lt(3)` twin as a `Scenario Outline` row.
  2. Add the steps by reusing the existing "The compiled filter agrees with the
     evaluator" step shape (`predicates.feature:70`).
- **Tests:** two scenario rows.
- **Verify:** `pnpm test:bdd`
- **Done when:** green, and the scenarios fail if T1's guard is reverted (check
  once by hand).

### T17 — Full gate and mutation
- **Status:** [~] deferred to final integration gate (scoped Stryker runs, structural grep and `pnpm bench` were run; see §10)
- **Depends on:** T1–T16
- **Files:** none (verification); the CCR records the numbers
- **Steps:**
  1. `pnpm check` from a clean checkout (`pnpm clean` first). Use
     `--testTimeout=60000` for `pnpm coverage` if `FieldPath.test.ts` times out
     on this machine (README open item, also on baseline).
  2. `pnpm exec stryker run stryker.config.mjs`. Core must be ≥ 93.32 (README),
     with the `Matcher.ts:606` survivor gone and the C6 equivalent mutants gone
     (the guards no longer exist). Any new survivor in `Compare.ts` gets a test or
     an explained equivalence in the CCR.
  3. `pnpm exec stryker run stryker.predicate-sql.mjs` (≥ 95.45),
     `stryker.predicate-prisma.mjs` (≥ 90.18) and `stryker.devtools.mjs`
     (≥ 96.96).
  4. Run the structural grep from success criterion 7 against T11's allowlist.
  5. Run the final `pnpm bench` for the two bench files and paste the tables
     into the CCR.
- **Tests:** —
- **Verify:** the commands above
- **Done when:** everything is green, the scores are at or above their
  baselines, and the CCR has the numbers.

## 7. Test strategy

**Survive unchanged:**
- every `Evaluate.test.ts` reason test whose text is unchanged (`:76-163`, `:247-255`);
- every structural `Matcher.test.ts` test (`FieldMatch`/`EveryMatch`/`Size`/prototype
  guards, the "eq vs inArray" `NaN` block at `:334`);
- `Predicate.test.ts`'s translation, refusal, port and span tests;
- `RenderablePredicate.test.ts`'s R1/R4–R8 and the bound-rule test;
- the sql/prisma refusal and golden tests, except `Range` goldens.

**Move to the deepened interface (replace, don't layer):** the primitive-rule
assertions against `evaluateMatcher` (`Matcher.test.ts:80-90`, `:145-156`, and
the `Eq`/`Neq` absent-operand pins) move to `Compare.test.ts`'s table, which
covers every operand class against every verdict function. They are deleted from
`Matcher.test.ts` in T8, not duplicated. `Predicate.test.ts:93-147`'s per-op
`evaluatePredicate` examples keep only the cases about `Predicate` structure
(column lookup, absent column). The per-op semantics live in `Compare.test.ts`.

**Properties:**
- INV-QD-018: the widened row generator (T1);
- INV-QD-061: the widened cell generator plus R9 (T4);
- the leaf-agreement property, with a pair count (T11);
- "an absent value never satisfies a matcher" over all twelve tags (T13);
- the witness-satisfies property (T14).

**Differential against real engines:** PGlite and `node:sqlite` with a float
column holding `±Infinity` and PG `NaN` (T3, T4). Prisma over SQLite with a
`Float?` column (T6). Each property's universe is per engine, because SQLite has
no `NaN`.

**Mutation:**
- core: kills `Matcher.ts:606`, and removes the equivalent survivors at
  `Matcher.ts:569`/`:596`/`:606` and `Predicate.ts:136` by deleting the
  redundant guards;
- `Compare.ts` bodies stay mutated under `ignoreStatic` (C6);
- sql, prisma and devtools each run their own config.

**Benchmarks:**
- `Compare.bench.ts` (new): per-leaf `evaluateMatcher` and per-row
  `evaluatePredicate`;
- `Evaluate.bench.ts`'s `evaluate` group;
- three runs before and after T8/T9, same session.

## 8. Spec and documentation updates

Everything in T15, summarized:
- **Behaviors:**
  - BEH-QD-027 (correction), BEH-QD-028 (`judgeMatcher`), BEH-QD-NEXT-a (one
    owner, `Verdict`);
  - BEH-QD-045 (two reason rows), BEH-QD-122/127 (non-finite rows);
  - BEH-QD-223 (post-check);
  - BEH-QD-241/242/244/271/272, plus BEH-QD-NEXT-c (range guard).
- **Invariants:** INV-QD-018/047/048/061 paragraphs, INV-QD-NEXT-a (leaf
  identity), INV-QD-NEXT-b (absent never satisfies, if D-08-h (i)).
- **ADRs:** ADR-QD-079 Rev 1.1 amendment, ADR-QD-040 corrected note, ADR-QD-NEXT
  (new) and its `index.yaml` row.
- **Overview:** `spec/overview.md` rows plus a "Not listed above" row for
  `@qadi/core/Compare` (gate 13).
- **Matrix and register:** the traceability rows, and two CCR-QD-NEXT rows
  (defect wave; deepening).
- **AGENTS.md:** §5a's table row and `:399` sentence (T8). Not a convention
  change, only the renamed host.
- **Changesets:** four. Breaking notes for core (`RenderRules`/`Range`),
  predicate-sql (`Range` text) and predicate-prisma (`floating`).
- **Not touched:** the website (no mention of finiteness or `isRangeBound`,
  checked with grep), and package READMEs (no mention, checked).

## 9. Risks and rollback

| Risk | Detection signal | Rollback |
| ---- | ---------------- | -------- |
| T1 ships alone and a reader assumes compiled SQL is fixed too | C3 finding 2. T3's S5 fails on T1's HEAD | Ship T1–T4 in one release. T1's CCR states the residual explicitly |
| `col - col = 0` misbehaves on a column type not probed (PG `money`, `interval`, a domain type) | A user's query error, or S1 if the fixture grows | `Range` on a non-numeric column is already outside the supported matrix (N2). Fall back per dialect to D-08-f (ii)'s literal guard by changing one `FINITE_GUARDED` entry |
| Callers pinned `compileSql` text in golden tests | Their CI breaks on upgrade | That is the intended signal. The changeset marks it **Breaking** with the before/after text. Rollback is pinning the previous minor |
| Prisma's `{lte: Number.MAX_VALUE}` is refused or unsound on `Float`/`Decimal` | T5's spike | D-08-g fallback (iii): refuse `Range` on declared-floating columns |
| A wrong `floating` declaration ("not floating" for a real `Float` column) over-admits | Not detectable in the package. Only the engine test P5 with a true declaration | The required option plus `floatingFieldsOf` derived from DMMF. Documented as the one non-lie-safe declaration in ADR-QD-079 Rev 1.1 |
| `judgeMatcher` regresses the per-node hot path | T8's three-run bench beyond baseline spread | T8 step 7 (a) inline local arrows, then (b) D-08-c's fallback: keep the boolean switch and call `holds(...)` |
| `SWITCH_BUDGET_NAMES`, AGENTS.md §5a and the code disagree mid-change | `node scripts/check-house-style.mjs` fails (BS-06 check) | All three edits are in one commit (T8 step 4) |
| D-08-h breaks a consumer relying on `inArray([undefined])` matching absence | Only possible in process (JSON cannot carry `undefined`). A consumer test fails | T13 is separable. Revert it alone, and keep the rest |
| New denial texts (D-08-d) break log parsers or snapshot tests downstream | Their tests fail | The texts are additive rows, and the old rows are unchanged. Revert T12 alone, which keeps `refIsUnresolved` |
| Engine fixtures grow slow (PGlite inserts) | `EngineAgreement.test.ts` duration | The cyclic `score` keeps 48 rows. There is no product growth |
| Another ARCH-09…15 plan edits `Matcher.ts`/`Predicate.ts`/`RenderablePredicate.ts` concurrently | Merge conflicts | Land T1–T4 first (small, local). Rebase T7–T12 after. Coordinate through the README's overlap table |

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-05 | — | plan written | Claude (planning agent) |
| 2026-10-05 | T1 | `evaluatePredicate`'s `Gte`/`Lt` check both operands with `isRangeBound`. Test-first: the widened `level` generator and the named test failed 3 as predicted (two properties + named), then 358/358 across Predicate/RenderablePredicate/Evaluate. Failure messages use a `show` replacer. Commit `9927264`. | Claude (impl agent, step 1) |
| 2026-10-05 | T2 | `lt(3)`/`gte(3)` × `-Infinity` pinned; comments corrected in `Matcher.ts`, `PredicateLiteral.ts`, `Predicate.ts`; BEH-QD-027 corrected with a `>` superseded note; CCR-QD-115 → 116/120. Scoped Stryker (`Matcher.ts:591-610`): the `:606` `\|\|` mutant is **Killed**; the two remaining survivors were the C6 `typeof` equivalents (gone after T8). CCR-QD-172 registered. Commit `2d8a748`. | Claude |
| 2026-10-05 | T3+T4 | One commit (`3bb389a`) so no commit leaves a red suite. SQL oracles gain `score` (PG `double precision` `[null,0,3,5,±Inf,NaN]`, SQLite `REAL` without `NaN`), cyclic, 48 rows; per-engine reference. Red before T4: S1 (both engines), all three S3 and S5 failed — PG `score >= 3` returned the `Infinity` ids (`(id-1)%7==4`) and the `NaN` ids (`%7==6`), `< 3` the `-Infinity` ids (`%7==5`); SQLite the `Infinity` (`(id-1)%6==4`) and `-Infinity` (`%6==5`) ids. Core: `ColumnFiniteness`, `FiniteGuard`, `RenderRules.finiteness`, `Range.finiteGuard`, `finiteGuardFor` via a module-scope `Match.tagsExhaustive` (not a `Record`, so a new `ColumnFiniteness` tag is a compile error rather than a silent `false`). SQL: `FINITE_GUARDED` renders `(<range> AND col - col = 0)` inside the null guard; MySQL `Unrepresentable`. S2 now strips the guard before comparing MySQL with SQLite (and asserts >20 guards stripped). Also: the engine layer gets `{ timeout: "120 seconds" }` — PGlite boot outlasted vitest's 10 s hook default at load ~150. | Claude |
| 2026-10-05 | T5 | Spike (scratch, Prisma 7.10 + better-sqlite3 `:memory:`, `Float?` and `Decimal?`): bounded filter **unsound** (Prisma binds `MAX_VALUE` as a 309-digit decimal string → SQLite `Infinity`), `Int?` refuses it loudly, readback returns `±Infinity`, runtime DMMF keeps `type`. D-08-g → (iii) by the plan's rule. | Claude |
| 2026-10-05 | T6 | Deviated per D-08-g (iii): `compilePrismaWhere` takes a required `floating` (+ `floatingFieldsOf`, which reads `type`, so it works on the runtime DMMF — hence separate `PrismaTypedFieldLike`/`PrismaTypedModelLike` instead of adding `type` to `PrismaFieldLike`, which would have broken `nullableFieldsOf` callers on the runtime DMMF). Core gains `RenderRules.finiteExclusion: "Expressible" \| "Inexpressible"` and `RenderRefusal` `"NonFiniteColumn"` (full closed union), so the refusal is `toRenderable`'s and the refusal-parity property still holds. Fixture `score Float?`; P6 (P5 was taken) pins the refusal, the over-admission an undeclared `Float` causes, the loud `Int`-declared-floating direction, and the bounded-filter engine fact. README/website/`check-package-install.mjs` updated. Commit `e649f80`. | Claude |
| 2026-10-05 | T7 | `Compare.ts` + `Compare.test.ts` (every verdict function × every pair of a 14-class universe). `CompareOp` moved; `Predicate.ts` re-exports. Overview "Not listed above" row. Commit `6336d71`. | Claude |
| 2026-10-05 | T8 | `judgeMatcher` hosts switch #4; `evaluateMatcher = holds(judgeMatcher(...))`; `Verdict` re-exported from `Matcher.ts`; `SWITCH_BUDGET_NAMES` + AGENTS §5a renamed in the same commit. Bench: see D-08-c — direct calls regressed ~2.4x per leaf under vitest (module-runner getters, ARCH-13 C8's artefact); local bindings (option (a)) recovered it. Pure-rule tests moved out of `Matcher.test.ts` (non-finite bound, non-finite value, "require numbers"); `judgeMatcher` composite tests added. Commit `d8d56f3`. | Claude |
| 2026-10-05 | T9 | `dispatchCompare`/`compare` deleted; leaves are `holds(compareVerdict/memberVerdict)` via local bindings. 3 runs: 3-leaf And × 12 rows 403k → 585k ops/s; all evaluate workloads within spread. Commit `f3c149f`. | Claude |
| 2026-10-05 | T10 | `isRangeBound = isFiniteNumber` (identity test), `isSafeLiteral` uses it, classifier comment cites the verdicts. `PredicateLiteral.ts` now imports `Compare.ts` (header updated; no cycle). Commit `a0e389c`. | Claude |
| 2026-10-05 | T11 | Leaf-agreement property: (14 Eq + 14 Neq + 6 Gte + 6 Lt + 6 In) × 14 = 644 pairs, count asserted. Structural grep (criterion 7) empty after fixing two stale `Matcher.ts` comments. Allowlist for the record: `getByPath`/`isObject`/`Object.hasOwn`, `lengthOf`, `containsValue`'s shape checks — none matched the grep. Commit `dd0eeff`. | Claude |
| 2026-10-05 | T12 | `DENIAL_TEXT: Record<Exclude<Verdict,"Held">, (matcher) => string>`; `holds` became a type predicate so the deny branch narrows. `refIsUnresolved` deleted, ED-03 → four sites. Four new reason tests; all existing reason tests unchanged; all other packages and BDD green. Commit `683ebef`. | Claude |
| 2026-10-05 | T13 | Test-first: 4 red (two Compare tests, the INV-QD-092 property over all 12 tags with an `inArray`-over-`undefined` generator, Predicate `MemberOf` on an absent column). `memberVerdict` absent-first. `Matcher.test.ts` Size/FieldMatch prototype tests now assert verdicts. Scoped Stryker over `Compare.ts` + `Matcher.ts:340-352,590-680`: 192/192 killed (100%). Commit `78d3b84`. | Claude |
| 2026-10-05 | T14 | Test-first: 5 red (gte × three bounds, eq NaN/undefined, inArray([undefined]), propagation, and an exhaustive universe of 735 matchers two wrappers deep — devtools has no fast-check dependency, so exhaustive instead of generated). Deviation: the `judgeMatcher` post-check runs on **leaf** witnesses inside the fold, not once on the top-level result — judging a composite recurses natively and the existing 100k-deep stack-safety test would overflow; wrappers hold iff their child does by construction, so checking leaves checks the whole. `Gte` got `Lt`'s guard. The test pinning `x = undefined` as a remedy (which nothing satisfies) now asserts the requirement is skipped. Commit `c97942a`. | Claude |
| 2026-10-05 | T16 | Two Scenarios (no Scenario Outline is used anywhere in this repo's BDD suite); verified by hand both fail with the value-side check reverted — note the BDD suite imports `@qadi/core`'s built `lib/`, so `pnpm typecheck` must run first to see a src change. Commit `d7b54e7`. | Claude |
| 2026-10-05 | T15 | BEH-QD-305/306, INV-QD-091/092 (BEH max was 304, INV max 090), ADR-QD-091 (+ index.yaml), ADR-QD-079 Rev 1.1 amendment, ADR-QD-040 Rev 1.2, CCR-QD-172 (defect wave) and CCR-QD-173 (deepening), traceability Rev 1.80, overview Rev 1.33, four changesets. All spec gates green. Commit `be696da`. | Claude |
| 2026-10-05 | T17 | Deferred to the final integration gate (full `pnpm check`, coverage, all six Stryker configs). Run here: typecheck, lint, circular, tstyche, `pnpm test` (2700/2703; the 3 failures are the known load timeouts in `FieldPath.test.ts`/`Explanation.test.ts`, green at `--testTimeout=60000`), BDD 512/512, all `spec:*` gates incl. website examples, `pnpm bench` exit 0. | Claude |
