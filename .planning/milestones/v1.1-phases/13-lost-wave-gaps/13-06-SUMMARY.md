---
phase: 13-lost-wave-gaps
plan: 06
subsystem: audit-and-compiler-metrics
tags: [audit, predicate-sql, predicate-prisma, metrics, typed-reads, lost-wave-port]

phase_base: 0925c2f
requires: ["13-05"]
provides:
  - "`packages/predicate-sql/src/CompileMetrics.ts`, `packages/predicate-prisma/src/CompileMetrics.ts`: `compiledTotal { compiled, refused }` over a private untagged base, package-private"
  - "`@qadi/audit`: `WRITES_COUNTERS`, `STAGING_COUNTERS`, `LOST_COUNTERS` (`AuditWriteReport.ts`) and `transitionsTotal` (`CircuitBreaker.ts`) exported package-privately; untagged bases stay private"
  - "Typed reads in audit `Metrics.test.ts`, `CircuitBreaker.test.ts`, `driveExit.ts` and both compilers' `Metrics.test.ts`"
affects: [13-07, 13-11, 14]

actuals:
  tokens: 70000
  tasks: 4
  commits: 6

tech-stack:
  added: []
  patterns: ["metric read by exported reference (`Metric.value(<export>)`), never by id string"]

key-files:
  created:
    - packages/predicate-sql/src/CompileMetrics.ts
    - packages/predicate-prisma/src/CompileMetrics.ts
  modified:
    - packages/predicate-sql/src/index.ts
    - packages/predicate-prisma/src/index.ts
    - packages/predicate-sql/test/Metrics.test.ts
    - packages/predicate-prisma/test/Metrics.test.ts
    - packages/audit/src/AuditWriteReport.ts
    - packages/audit/src/CircuitBreaker.ts
    - packages/audit/test/Metrics.test.ts
    - packages/audit/test/CircuitBreaker.test.ts
    - packages/audit/test/driveExit.ts

requirements-completed: []
---

# 13-06 — Audit and compiler metrics are read by reference

`phase_base: 0925c2f`. Second of three ARCH-56 plans (ARCH-61). It ports lost `d089c1d` T5–T6.

## Decisions applied

There is no `checkpoint:decision` in this plan. CONTEXT D-02 applies: the lost D-56-e is taken at its recommended option. The premise has not moved: audit's `exports` is still `.` only and its barrel names neither module. So the audit counters are `export const` in their modules but stay package-private (ADR-QD-099). D-04 holds: 13-C lands before Phase 14, and this plan's `files_modified` is the list Phase 14 rebases on.

## Planning-time premise

`git diff d089c1d^ HEAD` is empty for all eleven touched files, so the lost hunks applied verbatim with `git apply`. In added lines, ADR-QD-109 became ADR-QD-123 (see Ids).

## What was done

- **Task 1-RED (cbeff90).** Ported both compiler `Metrics.test.ts` files. RED for the stated reason in both projects:
  `Error: Cannot find module '../src/CompileMetrics.ts' imported from …/predicate-sql/test/Metrics.test.ts` (same for prisma).
  Verify: `VERIFY-OK`, and no `src` file was created.
- **Task 1 (5e4443d).** Created both `CompileMetrics.ts` from the lost file. Line one is the summary, and the doc cites ADR-QD-099, ADR-QD-123 and ADR-QD-052. The 117-column type annotation is hand-wrapped (AGENTS.md §17). The descriptions are byte-identical. Each `index.ts` writes `compiledTotal.compiled` / `.refused`, and `Metric.counter(` in the two `index.ts` went from 2 to 0.
  **The queued item is closed:** the stale doc that cited `Evaluate.ts`'s `decisionsAllowedTotal`/`decisionsDeniedTotal` (`predicate-sql/src/index.ts:306-314`) was deleted with the declaration it described. Repo grep for both names, and for `compiledSucceededTotal`/`compiledRefusedTotal`, finds nothing.
  Result: `predicate-sql` + `predicate-prisma` passed, 6 files / 130 tests, and neither barrel exports `CompileMetrics`.
- **XC-05 fix (1c6069b).** See Mutation.
- **Task 2-RED (eaf163b).** Ported the three audit test files. RED: `TypeError: Cannot read properties of undefined (reading 'encode_failed' | 'write_failed' | 'valueUnsafe')` and `Cannot convert undefined or null to object`. The names are not exported, so the imports are `undefined`. The run was 38 failed / 298 passed. Verify: `VERIFY-OK`, and `packages/audit/src` was untouched.
- **Task 2 (8d05fb3).** Added the four `export` keywords. The `AuditWriteReport.ts` doc now uses the lost wording, with ADR-QD-123. `packages/audit/src/index.ts` was not touched.
  Result: audit 336/336, `pnpm typecheck` OK, `pnpm lint` exit 0 (house-style 423 files clean), and no `AuditWriteReport|CircuitBreaker` in the audit barrel.

### Final id-literal counts (for 13-07's `METRIC_ID_LITERAL_BUDGET`)

The counts use the plan's invocation: literals outside comments and titles.

| File | 0925c2f | now | what remains |
|---|---|---|---|
| `packages/audit/test/Metrics.test.ts` | 8 | **4** | the 4 `series.id` / `transitionsTotal.id` pins (writes, transitions, staging, lost); lost final was 4 |
| `packages/audit/test/CircuitBreaker.test.ts` | 4 | **0** | |
| `packages/audit/test/driveExit.ts` | 4 | **0** | |
| `packages/predicate-sql/test/Metrics.test.ts` | 1 | **2** | the `series.id` pin and the snapshot `filter` that reads the attributes (only a snapshot shows them) |
| `packages/predicate-prisma/test/Metrics.test.ts` | 1 | **2** | same as predicate-sql |

### Barrels

No barrel and no `exports` map changed. `git diff 0925c2f -- packages/{audit,predicate-sql,predicate-prisma}/src/index.ts` touches only the two compiler `index.ts` files, which are implementations. Each gained an import of `./CompileMetrics.ts` and has no `export … from "./CompileMetrics"`. No `package.json` changed. `pnpm spec:api` shows only the 10 drifts expected from 13-04/13-05, and none come from these packages.

## Mutation (XC-05)

The score is (Killed+Timeout)/(Killed+Timeout+Survived+NoCoverage), per file, against `13-mutation-base.json`. The runs were `stryker.predicate-sql.mjs` and `stryker.predicate-prisma.mjs` in full, plus `stryker.audit.mjs --mutate AuditWriteReport.ts,CircuitBreaker.ts`.

| File | base | after |
|---|---|---|
| predicate-sql `index.ts` | .9559 | .9559 (65/68), the base's own 3 survivors |
| predicate-sql `CompileMetrics.ts` | new | 0 mutants (`ignoreStatic`; pinned by the declaration test) |
| predicate-prisma `index.ts` | .9237 | 121/132 = .9167 → **113/122 = .9262** after 1c6069b |
| predicate-prisma `CompileMetrics.ts` | new | 0 mutants |
| audit `AuditWriteReport.ts` | .9659 | .9659 (85/88) |
| audit `CircuitBreaker.ts` | .8051 | .8051 (157/195) |

**The predicate-prisma drop and its fix.** Moving the declarations did not change the file's mutants. I re-ran Stryker with `index.ts` and `Metrics.test.ts` set to their `0925c2f` content, then restored them from HEAD. That run also gave 121/132 with the same survivors. The `.9237` (121/131) in the base file therefore comes from a run that counted one mutant fewer. The ratio rule still applies, so I used fix step 2: simplify away an equivalent mutant. Two survivors were `ConditionalExpression → false` on `All`'s `nonVacuousTrue.length === 0 ? { AND: [] } : { AND: nonVacuousTrue }` (and the `Any`/`OR` mirror). I checked them before calling them equivalent: with the condition forced false, the empty case returns `{ AND: nonVacuousTrue }` where `nonVacuousTrue` is `[]`. That is a fresh `{ AND: [] }`, structurally identical to the ternary's arm, so no input can tell them apart. Both arms are now `return { AND: nonVacuousTrue }` / `{ OR: nonVacuousFalse }`. predicate-prisma passes 74/74. The remaining survivors are the base's: `isVacuousTrue/False`'s `keys.length === 1` and `excludeNull`'s `"not" in filter` branch. That branch is NoCoverage, and its doc says `toRenderable` never asks for that shape.

## Deviations

1. **[XC-05, Rule 1] predicate-prisma `index.ts` simplification (1c6069b).** This is a source change beyond the lost hunks, made to clear the ratio rule. It changes no behaviour.
2. **[House rule] `driveExit.ts` helpers.** The lost hunk typed `lostTotal`/`lostLabelsMoved` over `{ readonly [label: string]: number }`, an index signature widened to dodge a key type (the user's "`Record<string, unknown>` is a hack" preference). The helpers now take `Effect.Success<typeof readCounts>` and iterate `Record.keys(after.lost)` (closed keys). That dropped two unreachable `?? 0` fallbacks and the `lostSeries` indirection. The behaviour is the same, and audit passes 336/336.
3. **[Style] `CompileMetrics.ts`.** The `compiledTotal` type annotation is wrapped across four lines (§17 hand-wrapping). The lost file had it on one 117-column line.
4. No changeset: both metrics changesets belong to 13-07 (see below).

## Gate results

- Task 1-RED verify: pass (both suites RED, no src).
- Task 1 verify: pass (130/130, `Metric.counter(` 0, no barrel export).
- Task 2-RED verify: pass (both RED, `git diff --quiet -- packages/audit/src`).
- Task 2 verify: pass (audit 336/336, typecheck, lint, no barrel line, CircuitBreaker + driveExit literals 0).
- Coverage with `--coverage.include='src/**/*.ts'`: audit 99.37 % statements / 99.45 % branches / 98.8 % functions / 99.53 % lines. predicate-sql 98.41 / 100 / 97.14 / 98.36. predicate-prisma 98.41 / 96.96 / 100 / 100. All are ≥ 90 %.
- `pnpm spec:api`: red with the 10 expected drifts only (6 core metrics, 4 devtools types).
- Ids, types, descriptions and attributes are unchanged. The descriptions are byte-identical strings, the pins in each `Metrics.test.ts` assert them, and the compiler attribute pin is `[{ outcome: "compiled" }]`.

## For 13-07

- `.changeset/metrics-read-by-reference.md` covers this plan: `"@qadi/audit": patch`, `"@qadi/predicate-sql": patch`, `"@qadi/predicate-prisma": patch`. It is not Breaking vs 0.11.0, because no public export changed and the ids, descriptions and attributes are unchanged. The prisma `All`/`Any` simplification is internal and needs no changeset line.
- `METRIC_ID_LITERAL_BUDGET`: use the table above (audit `Metrics.test.ts` 4; each compiler `Metrics.test.ts` 2; `CircuitBreaker.test.ts` and `driveExit.ts` 0).
- `[metric-declaration]` declaration counts: audit `AuditWriteReport.ts` 3 + `CircuitBreaker.ts` 1, and each `CompileMetrics.ts` 1. The untagged bases (`writesTotal`, `stagingTotal`, `entriesLostTotal`, `compiledBase`) are outside core, so `METRIC_BASE_UNEXPORTED` needs no entry for them.
- `spec/behaviors/31-predicate-compilation.md:99-106` still says the counter is in each package's `index.ts`. That revision is 13-07's (lost wording in `d089c1d`, with ADR-QD-109 → ADR-QD-123).
- `CompileMetrics.ts` and `AuditWriteReport.ts` cite ADR-QD-123, which is not written yet.

## For 13-11

- Traceability: audit `Metrics.test.ts`, `CircuitBreaker.test.ts`, `AuditWriteExits.test.ts` (via `driveExit.ts`) and both compiler `Metrics.test.ts` → BEH-QD-368 (13-07 writes it).
- No overview rows: nothing public was added.
- The CCR register row for ARCH-61's metrics plans (13-07 picks the number) covers this plan too.

## Ids

- Cited: ADR-QD-123 (renumbered lost ADR-QD-109; written by 13-07), ADR-QD-099, ADR-QD-052 (merged meanings).
- Lost ids in added lines: none. The scoped grep for ADR-QD-108..110, CCR-QD-383..391, BEH-QD-334..336, INV-QD-242..245 and ARCH-46..57 over `git diff 0925c2f -U0` of the three packages is empty.
- Used: none new. Still free: BEH-QD-360..367, ADR-QD-121, ADR-QD-122. Planned for 13-07: BEH-QD-368, INV-QD-259.

## Commits

| sha | subject |
|---|---|
| cbeff90 | test(13-06): RED — the compiler metric tests read compiledTotal by reference |
| 5e4443d | feat(13-06): each compiler declares its compile counter once, in CompileMetrics.ts |
| 1c6069b | refactor(13-06): All/Any return their filtered parts without an equivalent ternary |
| eaf163b | test(13-06): RED — the audit tests read their counters by reference |
| 8d05fb3 | feat(13-06): audit's write counters and breaker frequency are readable by reference |
