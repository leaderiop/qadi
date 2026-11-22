---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
plan: 08
subsystem: phase-close
tags: [phase-scan, check-pr, release-check, requirements]
phase_base: afdd8d9cd9701405d426089a19dda17fbc921c90
plan_head_before: c3d685da6e8cf78d5bb4a90f403f57279b86e57c
plan_head_after: c3d685da6e8cf78d5bb4a90f403f57279b86e57c
requires: ["54-07"]
provides:
  - "the whole-phase scan (scope, forbidden constructs, budgets, order, kept tests, ids) clean at HEAD"
  - "VERD-01 and VERD-02 checks green"
  - "pnpm check:pr green (16 of 17 steps; mutation skipped by design)"
  - "VERD-01..04 marked Complete in REQUIREMENTS.md"
affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "The mutation-script clause of the scan is narrowed to 0c917fdf alone (orchestrator ruling recorded in 54-05)"
requirements-completed: [VERD-01, VERD-02, VERD-03, VERD-04]
duration: 15 min
completed: 2026-11-18
status: complete
commits: 0
actuals:
  tokens: 3000
  tasks: 2
  commits: 0
---

# Phase 54 Plan 08: Phase close Summary

The whole phase's diff and history pass the scan and both verdict-step checks, `pnpm check:pr` is green (16 of 17 steps, mutation skipped by design), nothing was released, and VERD-01..04 are marked Complete. No source, test, spec or script file changed in this plan; `commits: 0` is measured and legitimate (the only commit is the `docs(54-08)` metadata commit that carries this file and follows it).

## Phase scan

Run from the repository root against `phase_base` `afdd8d9c`, after the last commit touching packages (54-05) and before `check:pr`. The command is the plan's first `<automated>` verbatim except for one clause, narrowed under the orchestrator's D-10 ruling (see Deviations).

```
phase scan clean
```

Exit 0. It checked: every changed path is in the allow-list (or under `.planning/`); no forbidden construct in any added line under `packages/*/src` and `packages/*/test` (comments and strings stripped); `switch (` and `Effect.fnUntraced(` counts in `packages/*/src` equal to `phase_base`; AGENTS.md, scripts, `stryker.config.mjs`, barrels, `Compare.ts`, `Matcher.ts`, `PortAccess.ts`, manifests and the lockfile unchanged; Walk.ts still has the three `Effect.fnUntraced` composite functions and `switch (policy._tag)`; Evaluate.test.ts, Predicate.test.ts, LeafMatrix.test.ts and LeafFixtures.ts unchanged; LeafNeeds.test.ts lost no line; no LeafNeeds.tst.ts pin lost; exactly two `test(54-02)` commits and LeafVerdict.test.ts lost no line after them; `chore(54-01)` is the first plan commit and carries only the two baseline files; the characterisation precedes the first src commit; the RED `test(54-03)` precedes `refactor(54-03)`; `54-mutation-after.json` follows the last commit touching packages; every plan commit ends with the trailer; every added id is reserved or already present at `phase_base`; no placeholder id; each of BEH-QD-606..610 and INV-QD-353..354 is a heading exactly once; the reservation file reads `{"CCR":452,"ADR":174,"BEH":645,"INV":368}`.

## VERD-01

```
VERD-01: the polarity map and the verdict rule are written once, in LeafNeeds.ts
```

Exit 0.

## VERD-02

```
VERD-02: every leaf reads its verdict row; the walk keeps its reasons, the translator folds
```

Exit 0.

## check:pr

`pnpm check:pr < /dev/null`, last on a clean committed tree, nothing else heavy running (precondition `pgrep` check printed `idle`; `git status --porcelain -- packages spec scripts AGENTS.md .changeset` printed nothing). Final run: exit 0.

Steps printed (`run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).`):

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm circular`
4. `pnpm test:tstyche`
5. `pnpm coverage` (233 files, 5699 tests passed; coverage thresholds met)
6. `pnpm test:bdd` (34 files passed)
7. `pnpm spec:examples`
8. `pnpm spec:verify:strict`
9. `pnpm spec:gates`
10. `pnpm spec:claims`
11. `pnpm spec:api`
12. `pnpm spec:package`
13. `pnpm example`
14. `pnpm spec:website-examples`
15. `pnpm website`
16. `pnpm spec:publish` (`9 package(s) and 6 document(s) agree on version (0.12.0)`)

The first run failed at step 5 (`pnpm coverage`) on exactly one test: `|devtools| test/model/DockModel.test.ts > … P2: whatever the registry and the poll do, each snapshot's rows are the questions and guards of one moment`, `Test timed out in 5000ms` (233 files, 5698 of 5699 passed). Diagnosis: a FastCheck sample property test in `@qadi/devtools`, a package and file this phase never touched (the scan proves it), run under v8 coverage with the machine at load average 19.6 (`uptime` before the rerun). Run alone, `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` passed 59 of 59 in 0.6 s, and the full `check:pr` rerun passed every step. Treated as a load-induced timeout flake, not a phase defect; no test, timeout or threshold was changed. Recorded here because the test's 5 s budget leaves little headroom under coverage on a loaded machine; it is outside this phase's scope and not fixed here.

## Release check

The plan's second verify, verbatim:

```
nothing released; VERD-01..04 complete; WX rows Pending
```

Exit 0 (run after the REQUIREMENTS.md edit). Branch `arch-wave-11`; no remote branch contains HEAD; no tag contains a phase commit; no CHANGELOG or `package.json` change; no changeset deleted; nothing staged. `pnpm changeset version`, `next-id.mjs`, push, tag and publish were not run.

## Requirements

`.planning/REQUIREMENTS.md`: `- [x] **VERD-01**`..`**VERD-04**` and `| VERD-0N | Phase 54 | Complete |` for N = 1..4. WX-01..WX-07 rows are untouched and still `Pending` (they close with the milestone).

## Deviations from Plan

### Orchestrator-authorised

**1. [Orchestrator ruling, D-10] The `re-baselined after chore(54-01)` clause of the scan is narrowed**
- **Found during:** Task 1 (scan).
- **Reason:** 54-05's D-10 breach was ruled on by the orchestrator: `54-mutation.mjs` changed once, in `0c917fdf` ("docs(54-05): D-10 credits static-ignored mutants proven killed"). The plan's clause refused any later change to either baseline file, which would fail on that ruled commit.
- **Fix:** the clause stays strict for `54-mutation-base.json` and is narrowed for `54-mutation.mjs` to "changed by `0c917fdf` alone". Every other clause is as written. The original clause was
  `const later=g("diff","--name-only",plan[0].h,"HEAD","--",...base);if(later)bad.push("re-baselined after chore(54-01): "+later)`
  and the narrowed text, verbatim, is
  `const later=g("diff","--name-only",plan[0].h,"HEAD","--",base[0]);if(later)bad.push("re-baselined after chore(54-01): "+later);const lm=g("log","--format=%h",plan[0].h+"..HEAD","--",base[1]);if(lm!=="0c917fdf")bad.push("54-mutation.mjs changed after chore(54-01) by commits other than 0c917fdf alone: "+JSON.stringify(lm))`
  where `base[0]` is `54-mutation-base.json` and `base[1]` is `54-mutation.mjs` (the equivalent of `git log --format=%h <chore(54-01)>..HEAD -- 54-mutation.mjs` listing `0c917fdf` alone).
- **Files modified:** none (scan command only; run from a scratchpad copy of the plan's verify with that one substitution).
- **Commit:** none.

### Auto-fixed Issues

None.

**Total deviations:** 1 orchestrator-authorised, 0 auto-fixed. **Impact:** none; the scan's other clauses and the plan's other verifies ran as written.

## Known Stubs

None. This plan added no source.

## Threat Flags

None.

## Self-Check: PASSED

- Phase scan, VERD-01 and VERD-02 checks exit 0 on the committed tree.
- `pnpm check:pr` exit 0 (second run; first run's single timeout recorded above).
- Release check exit 0 after the REQUIREMENTS.md edit; `git status --porcelain -- packages spec scripts AGENTS.md .changeset` prints nothing; `.planning/config.json` not staged.
