---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
fixed_at: 2026-11-14T03:50:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase QD-37: Code Review Fix Report

**Fixed at:** 2026-11-14
**Source review:** 37-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (fix_scope `all`; IN-01 is a necessity finding)
- Fixed: 4
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit, commit and check ran in the main checkout. Verification ran in the main checkout, so it is reproducible from the tree as it stands.

## Fixed Issues

### IN-04: A doc comment still describes the session's handle as its own

**Files modified:** `packages/devtools/src/model/SimulationSession.ts`
**Commit:** 6934fe16
**Applied fix:** "the handle its runs fork into" now reads "the superseding run its runs fork into".

### IN-02: Two forks of the same token behave differently when the second is held

**Files modified:** `packages/devtools/src/model/SupersedingRun.ts`
**Commit:** cff0df37
**Applied fix:** Documentation only. The module doc and `fork`'s interface doc now say a token is forked once, and that a second fork of the same token from inside a start overwrites the held one. No behaviour change and no test row.

### IN-03: The "opens no span" assertions (R5, R7) have no positive control

**Files modified:** `packages/devtools/test/model/SupersedingRun.test.ts`
**Commit:** dc266bbd
**Applied fix:** R5 and R7 each end with one traced effect (`Effect.void.pipe(Effect.withSpan("control"))`) through the same collecting tracer, asserting `spans.length === before + 1`. No test title changed. 18 of 18 tests pass.

### IN-01: The `onFailure === undefined ? run : run.pipe(onExit …)` branch (necessity)

**Files modified:** `packages/devtools/src/model/SupersedingRun.ts`, `.planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-mutation-after.json`, `.planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-mutation-survivors.json`
**Commit:** 0231bbfc
**Status:** fixed: requires human verification (a necessity finding removes code)
**Applied fix:** `fork` always wraps `run` in `Effect.onExit`, keeping the `isCurrent(token) && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)` condition, and calls the hook optionally. One variation from the suggested `hooks?.onFailure?.(...)`: the parameter is `hooks: ForkHooks = {}` and the call is `hooks.onFailure?.(exit.cause)`. The interface still declares `hooks?: ForkHooks`. The default parameter leaves one optional-chaining site instead of two, so the mutation run has one equivalent survivor there rather than two.

**Mutation re-run** (`pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/SupersedingRun.ts < /dev/null`): 50 detected (49 killed, 1 timeout) of 53, 94.34. 37-09 had 54 of 57, 94.74. The old L114 survivor is gone. The three survivors are all equivalent, with reasons in `37-mutation-survivors.json`:
- `SupersedingRun.ts:94:29 ObjectLiteral` and `:94:45 BooleanLiteral`: the token brand's key and value, both moved from line 89 by the added doc lines.
- `SupersedingRun.ts:121:13 OptionalChaining` (`hooks.onFailure(...)`): throws a TypeError inside the `onExit` finalizer only for a current failing run with no hook, which changes only the exit of a fiber nothing observes. A scratch test with a collecting logger confirmed no log line is emitted for that mutant (the test was deleted, not committed).

The score is 0.4 points below 37-09 because the deleted branch took killed mutants with it. No survivor was added, so no test was added. `37-mutation-after.json` now holds 0.9433962264150944 for this file, and `37-mutation-base.json` is untouched.

## Spec check

`/usr/bin/grep` over `spec/` and `AGENTS.md` found no statement the fixes made false. ADR-QD-150 point 6 ("The session passes none") still holds, the ADR and BEH text never name the `onFailure === undefined` branch or the L114 survivor, and the CCR-QD-428 row says nothing about the survivors. `spec-revise` was not run and no change-history line was added.

## Verification

- `pnpm exec vitest run --project devtools < /dev/null`: 1391 of 1391 passed.
- `pnpm typecheck`: clean.
- `pnpm lint`: house-style 496 files clean. Warnings are all in untracked `.codex/`, none in `SupersedingRun`.

---

_Fixed: 2026-11-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
