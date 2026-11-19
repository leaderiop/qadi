---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
plan: 05
subsystem: evidence
tags: [mutation-after, bench-after, d-10, static-credit]
phase_base: afdd8d9cd9701405d426089a19dda17fbc921c90
plan_head_before: d5b1b623486962c3b871fabb2cbddfc27be51956
plan_head_after: 0824e7d02ab23a57d2c9e26da1b838c95d117a87
requires: ["54-04"]
provides:
  - "54-bench-after.json (informational, D-08)"
  - "54-mutation-after.json, with the after-run's ignored mutants listed"
  - "54-mutation-static.json, the ignoreStatic:false evidence for D-10's static credit"
  - "54-mutation.mjs compare [evidence.json]: the static credit"
affects: [54-06, 54-07, 54-08]
tech-stack:
  added: []
  patterns: ["a count of detected mutants is credited for static-ignored ones only when a run with ignoreStatic off kills each, matched by mutator, line, column and replacement"]
key-files:
  created:
    - .planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-bench-after.json
    - .planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-mutation-after.json
    - .planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-mutation-static.json
  modified:
    - .planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-mutation.mjs
key-decisions:
  - "D-10's comparison credits static-ignored mutants proven killed (orchestrator ruling, 54-05); it is not a re-baseline"
requirements-completed: [WX-05]
duration: 11 min
completed: 2026-11-18
status: complete
commits: 2
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase 54 Plan 05: Bench and mutation after the verdict move Summary

The informational bench moved 1.02x to 1.09x, and the scoped Stryker after-run passes D-10 (`WX-05 holds (D-10)`) once the comparison credits 27 static-ignored mutants that a second run proves killed; the first `compare` failed by 2 detected mutants.

## Bench

Informational only (D-08); gates nothing. One run per side, same command (`pnpm exec vitest bench --run --reporter=json --outputFile=<phase dir>/54-bench-after.json packages/core/bench/Evaluate.bench.ts < /dev/null`), kept as `54-bench-after.json`.

- Base (54-01) `uptime`: before `load averages: 2.46 3.48 5.43`, after `2.18 3.27 5.25`.
- After `uptime`: before `load averages: 2.60 3.21 4.86`, after `2.09 3.01 4.70`.

| Workload | min base -> after (ns) | ratio | p50 base -> after (ns) | ratio |
|---|---|---|---|---|
| one node | 5209 -> 5375 | 1.03x | 5542 -> 5791 | 1.04x |
| wide — allOf of 8 | 6958 -> 7250 | 1.04x | 7334 -> 7666 | 1.05x |
| matcher-heavy — 3 refs | 10083 -> 10417 | 1.03x | 10583 -> 11542 | 1.09x |
| leaf-heavy — allOf of 8, matchers reference action and resource | 8458 -> 8708 | 1.03x | 8958 -> 9250 | 1.03x |
| leaf-heavy — allOf of 8, matchers reference neither | 8541 -> 8750 | 1.02x | 9083 -> 9291 | 1.02x |

Every ratio is 1.02x to 1.09x. The load was similar on both sides. One run per side proves no cause, so none is claimed. Phase 59 is the gated bench.

## Mutation after

Run on the committed tree with nothing else running: `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/LeafNeeds.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts' < /dev/null` (55 s, whole-run score 97.51, break threshold 80, exit 0). `node 54-mutation.mjs after` printed:

```
packages/core/src/LeafNeeds.ts 0.9873417721518988 (78/79) ignored 23
  survivor LeafNeeds.ts:209:64 ConditionalExpression | Survived | true | LEAF_NEEDS[leaf._tag].own === "Action"
packages/core/src/Predicate.ts 1 (284/284) ignored 22
packages/core/src/Walk.ts 0.946236559139785 (264/279) ignored 27
  15 survivors: NoCoverage :327 { maxDepth }, :437 "the obliged policy denied", :489 "a required policy denied";
  Survived :327 depth > maxDepth, nine `depth - 1 | depth + 1` (:410 :425 :443 :562 :582 :699 :713 :802 :827),
  and `{} | { concurrency: request.concurrency }` at :714 and :831
```

These are the base's 16 Walk survivors less the declared `HasCustom` allow-tag kill, at their new line numbers; no survivor was added anywhere. `LeafNeeds.ts` has the base's one equivalent `isActionLeaf` survivor.

## D-10

**First `compare` (the rule as 54-01 committed it) exited 1:**

```
LeafNeeds.ts 0.9811 -> 0.9873 (detected 52 -> 78; survivors +0 -0)
Predicate.ts 1 -> 1 (detected 293 -> 284; survivors +0 -0)
Walk.ts 0.948 -> 0.9462 (detected 292 -> 264; survivors +0 -1)
  gone survivor StringLiteral | Survived | "" | "HasCustom" | ? allow("HasCustom", policy.fields)
LeafNeeds.ts detects 52 -> 78 (+26); detected mutants that left the fallen files: 28
LeafNeeds.ts gained 26 detected mutants, fewer than the 28 that left the fallen files
```

The shortfall was 26 against 28. No survivor was added, and `LeafNeeds.ts` had only its one equivalent survivor, so no test could close it, and removing the equivalent site adds no detected mutant. The execution stopped and reported it.

**Cause.** The `ignored` counts rose in the files that hold the new tables: Walk 16 -> 27 (+11), LeafNeeds 7 -> 23 (+16), Predicate 22 -> 22. Walk's module-scope `ACTED_DENIAL`, `RELATIONSHIP_DENIAL` and `SIGNATURE_DENIAL` tables and LeafNeeds' `LEAF_VERDICTS` rows are static to Stryker, so with `ignoreStatic` on their mutants are ignored: neither scored nor killed. The denial-sentence mutants that were scored and killed in Walk's old inline ternaries and template literals became ignored. That is a reclassification, not a lost detection.

**Ruling (orchestrator, under D-10; a deviation, not a re-baseline; the user's later review can overturn it).** Take "prove, then credit":

- `/…/scratchpad/stryker54-static.config.mjs` is the repo config with only `ignoreStatic: false` and the reporters changed (`stryker.config.mjs` itself was not edited). Its text, in full:

  ```js
  // Evidence-only run (54-05 D-10 ruling): the repo config with ignoreStatic off. Never a gate run.
  import base from "/Users/mohammadalmechkor/Projects/Perso/qadi/stryker.config.mjs";
  export default {
    ...base,
    ignoreStatic: false,
    reporters: ["json", "clear-text"],
    jsonReporter: { fileName: "<scratchpad>/stryker54-static-report.json" },
  };
  ```

- It ran with the identical `--mutate` list on the after tree (61 s, exit 0). Static-run kill counts: `LeafNeeds.ts` 101 Killed + 1 Survived (78 + 23); `Predicate.ts` 306 Killed (284 + 22); `Walk.ts` 291 Killed + 12 Survived + 3 NoCoverage (264 + 27; the same 15 survivors as the gate run). Every mutant the gate run marks Ignored is Killed in the static run: LeafNeeds 23/23, Predicate 22/22, Walk 27/27 (72 in all).
- `54-mutation.mjs` was edited for this one change (the plan's "never edit the script" prohibition was lifted for it only), committed as `0c917fdf` before the after JSON. `after` now also writes an `ignored` list (mutator, line, column, replacement) per file; `compare` takes an optional evidence path and credits `static = (ignored in the three files, after) - (same, base)` only if every after-run Ignored mutant is Killed in that evidence, matched by mutator, line, column and replacement, otherwise it grants nothing and fails listing the unmatched mutants. The check becomes `gained + static >= left`. The survivor-set check, `KILLED`, `54-mutation-base.json` and `stryker.config.mjs` are untouched. `54-mutation-static.json` (per file `{mutator, line, column, replacement, status}`, trimmed from the static report; source verified equal to disk) is the committed evidence. Reproduce with: run Stryker with the config above, then `node 54-mutation.mjs after` and `node 54-mutation.mjs compare 54-mutation-static.json`.

**Second `compare` with the evidence exited 0** (`gained 26 + static 27 = 53 >= left 28`):

```
packages/core/src/LeafNeeds.ts 0.9811320754716981 -> 0.9873417721518988 (detected 52 -> 78; survivors +0 -0)
packages/core/src/Predicate.ts 1 -> 1 (detected 293 -> 284; survivors +0 -0)
packages/core/src/Walk.ts 0.948051948051948 -> 0.946236559139785 (detected 292 -> 264; survivors +0 -1)
  gone survivor StringLiteral | Survived | "" | "HasCustom" | ? allow("HasCustom", policy.fields)
packages/core/src/LeafNeeds.ts detects 52 -> 78 (+26); detected mutants that left the fallen files: 28
static 27 (ignored 45 -> 72 in the three files); all 72 after-run ignored mutants are Killed in .planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-mutation-static.json
WX-05 holds (D-10)
```

Note for ADR-QD-167: total detected across the three files went 637 -> 626; the 11 net difference is the 9 detected mutants `Predicate.ts` lost when the two interpreters' duplicate verdict steps became one (D-10 does not count them, its score stayed at 1) plus the mutants that merged in Walk. With the static credit the three files together hold 626 + 72 killed mutants against the base's 637 + 45.

## Commits

- `0c917fdf` `docs(54-05): D-10 credits static-ignored mutants proven killed` (54-mutation.mjs, 54-mutation-static.json)
- `0824e7d0` `chore(54-05): mutation after-run for LeafNeeds, Predicate and Walk` (54-mutation-after.json alone, after the last commit touching packages)

## Deviations from Plan

**1. [Orchestrator-authorised, D-10] Static-ignored mutants credited in `compare`, script edited**
- **Found during:** Task 2
- **Issue:** the committed rule left a 2-mutant shortfall (26 gained of 28 left) that no sanctioned remedy could close, caused by Stryker ignoring static tables.
- **Fix:** the evidence-gated credit described under `## D-10`. Not a re-baseline.
- **Files modified:** `54-mutation.mjs`; added `54-mutation-static.json`.
- **Consequences for the plan's own checks:** Task 2's second verify tests that `54-mutation.mjs` is unchanged since `chore(54-01)`, requires `chore(54-05)` to be the first `chore(54-05):` commit and to touch the after JSON alone; the script diff is therefore flagged by that verify by design of the ruling (the script change was kept out of the `chore(54-05)` commit, which does touch the after JSON alone and follows the last commit touching packages). The base JSON and `stryker.config.mjs` are unchanged since `chore(54-01)`.
- **Commit:** `0c917fdf`.

**2. [Environment] The pin guard script was missing**
- `/…/scratchpad/pin54.sh` no longer existed when the commits were made (the scratchpad had been cleaned, which also removed the bench and Stryker logs). The pin's check was done inline instead: `git rev-parse --show-toplevel` equals the pinned root and the branch is `arch-wave-11`.

**Total deviations:** 2 (1 orchestrator-authorised, 1 environmental). **Impact:** WX-05 holds under the amended comparison; the user's review may overturn the ruling.

## Known Stubs

None.

## Self-Check: PASSED

- `54-bench-after.json`, `54-mutation-after.json`, `54-mutation-static.json`, `54-mutation.mjs` present on disk.
- `0c917fdf` and `0824e7d0` are ancestors of HEAD; `0824e7d0` touches `54-mutation-after.json` alone and ends with the trailer.
- `node 54-mutation.mjs compare 54-mutation-static.json` exits 0 and prints `WX-05 holds (D-10)`.
- No file under `packages` changed in this plan; `stryker.config.mjs` and `54-mutation-base.json` are unchanged since `chore(54-01)`.
