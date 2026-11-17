---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
plan: 08
subsystem: testing
tags: [stryker, mutation, merge-gate, release-check, handover]
phase_base: 712317c10688ebce97b8b29b5a5c515b84a8d71b
plan_head_before: e7733188508ba93bebb8dea582af3f43f69baf21
plan_head_after: 3b923a91734610e1c400c14d7dd38c712ebab8c0
requires: ["43-07"]
provides:
  - "43-mutation-after.json: Qadi.ts and Handover.ts both at 1.0 (36/36 and 34/34 at the commit; 35/35 after the last fix)"
  - "pnpm check:pr green on the phase's final tree"
affects: []
actuals:
  tokens: 6000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["a verdict's tag read directly through the package-private module, the only place it is observable"]
key-files:
  created:
    - .planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-mutation-after.json
  modified:
    - packages/core/test/Handover.test.ts
    - packages/core/test/Qadi.test.ts
    - packages/core/src/Handover.ts
key-decisions:
  - "The Refused-tag survivor is closed by a direct verdictOf test, not by a source change: no entry point reports the tag, so nothing else can observe it"
requirements-completed: [WX-01, WX-04, WX-05]
status: complete
---

# Phase 43 Plan 08: Close, mutation comparison and merge gate Summary

`pnpm check:pr < /dev/null` exits 0 on the final tree, and mutation on the two touched core files rose from 0.972973 and 0.974359 to 1 and 1 after two survivors were closed with tests.

## Mutation, base against after

Invocation (the base's): `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Qadi.ts,packages/core/src/Handover.ts'`.

| File | Base | First after-run | Final |
|---|---|---|---|
| `Qadi.ts` | 0.972973 | 0.972222 (35 of 36) | 1 (36 of 36) |
| `Handover.ts` | 0.974359 (moved region, detected 38, scored 39) | 0.970588 (33 of 34) | 1 (35 of 35 after the last fix) |

The first run failed the comparer three ways, each a survivor the new code introduced:

- `Qadi.ts:432` ObjectLiteral on `{ concurrency: options?.concurrency }` in `filterStreamProjected`: no test showed `options.concurrency` reaching that stream's fan-out. Closed by `Qadi.filterStreamProjected — concurrency across items` in `Qadi.test.ts` (the blocked-resolver pattern the `filterStream` describe uses).
- `Handover.ts:211:34` StringLiteral on `"Refused"` in `verdictOf`: `isAdmitted` tests only `"Admitted"`, so no entry point ever reads the refusal's tag. Closed by `the verdict an enforcing call reaches` in `Handover.test.ts`, which calls the package-private `verdictOf` directly (the file header says the module is reached through `Qadi.*`; this one case is the stated exception, commented in the file).
- `Handover.ts` had no survivor matching the base's one (`{ item, allowed: false }`, ObjectLiteral): that code no longer exists, so the base survivor is unmatched and there is no leftover.

The after-run then had no survivors. `43-mutation-after.json` is `{"packages/core/src/Qadi.ts":1,"packages/core/src/Handover.ts":1}`; `43-mutation-base.json` is untouched with one commit.

## Bench rows (a guard, not a gate)

`pnpm exec vitest bench --run packages/core/bench/Evaluate.bench.ts --reporter=verbose`, beside 43-01's:

| Row | 43-01 hz (rme) | 43-08 hz (rme) |
|---|---|---|
| filter, 500 items, hasPermission | 144.45 (+-19.79%) | 134.64 (+-11.32%) |
| concurrency: unbounded | 193.75 (+-3.52%) | 153.66 (+-9.63%) |
| sequential (default) | 178.28 (+-5.05%) | 139.19 (+-7.53%) |

The two concurrency rows are 21% and 22% lower, inside the about 30% run-to-run movement AGENTS.md section 5a allows for. Within the same run, unbounded is still ahead of sequential. Recorded, not compared by a script. If a stricter read is wanted, rerun `pnpm bench` on a quiet machine.

## Task 2 outputs

- Scope and forbidden-construct scan: after the fix commit, `41 files changed, all in scope; no forbidden construct added`.
- Commit order and ids: `25 commits in order; ids reserved`.

## Task 3 outputs

- `pnpm check:pr < /dev/null`: exit 0. Tail: `publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)` then `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).` Coverage inside it: Statements 99.49% (7079/7115), Branches 98.1% (3156/3217). Steps 1 to 16 (typecheck through spec:publish) all ran.
- Release check: `nothing released, pushed or staged`. `git status` still shows only `.planning/config.json` modified and `.agents/`, `.codex/`, `.planning/state.json` untracked, as at the start.

## Commits

- `c0e6f9b5` test(43-08): the refusal's verdict and filterStreamProjected's concurrency are observable
- `f6eb8d84` chore(43-08): mutation after the handover module
- `3b923a91` fix(43-08): verdictOf admits through Effect.map so the close's no-as scan reads clean

## Deviations from Plan

**1. [Rule 1 - Bug in a check, source adjusted] Scan false positive on `Effect.as`.** Task 2's no-`as` regex matched `Effect.as(discharge(...), { _tag: "Admitted", decision })` in `Handover.ts`, a function call and not a type assertion. The plan says to fix the source of a finding rather than touch the check, so `verdictOf` now uses `Effect.map(discharge(...), (): Verdict => ({ _tag: "Admitted", decision }))`: same value, same spans. Typecheck, the 2328 core tests and a third Stryker run (both files 100) were repeated, and the comparer, Task 1's commit check and both Task 2 verifies re-ran green. The commit follows `chore(43-08)`, as the plan allows (`fix(43-08): ...`). `43-mutation-after.json` is unchanged by it (both scores are 1).

**2. Precondition count.** Task 1's precondition expected three `docs(43-07):` commits; there are four (three tasks and the completion commit), the same off-by-one the earlier plans recorded. The intent holds.

**3. Test-surface exception.** The plan asks for tests through the public entry points; the `"Refused"` survivor cannot be reached that way (see above), so `Handover.test.ts` now imports `verdictOf` once, and says so in a comment. The file's header still describes the rest of the file accurately.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

`43-mutation-after.json` exists; `c0e6f9b5`, `f6eb8d84` and `3b923a91` are ancestors of HEAD on `arch-wave-10`; every one ends with the Co-Authored-By trailer; Task 1's commit check, Task 2's two scans and Task 3's release check exit 0 on the final HEAD, and `pnpm check:pr` exited 0 after the last source commit.
