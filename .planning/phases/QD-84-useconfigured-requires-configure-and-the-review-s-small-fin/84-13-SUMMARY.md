---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 13
subsystem: gate
tags: [check-pr, spec-package, requirements, release-check]
requires: ["84-12"]
provides:
  - "pnpm check:pr and pnpm spec:package green at the close, each run alone"
  - "ADPT-01 to ADPT-05 complete in REQUIREMENTS.md"
affects: []
key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
status: complete
completed: 2026-11-25
commits: 1
plan_head_before: 2123c9c1db68c6e9aa5c5579d14721373c6330e1
plan_head_after: pending-the-docs-commit
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
requirements-completed: [WX-01, WX-03, WX-07, ADPT-01, ADPT-02, ADPT-03, ADPT-04, ADPT-05]
---

# Phase QD-84 Plan 13: the phase gate Summary

`pnpm check:pr` (17 of 18 steps, mutation skipped by design) and `pnpm spec:package` exit 0 on the close head, run alone, and
ADPT-01 to ADPT-05 are marked complete by hand. Nothing was pushed, tagged, versioned or published.

## Gate facts

Outputs kept in `$TMPDIR/qd84/`: `check-pr.out` and `check-pr.exit` (second run), `check-pr.run1.out` and `check-pr.run1.exit`
(first run), `spec-package.out` and `spec-package.exit`. Head: 2123c9c1db68c6e9aa5c5579d14721373c6330e1.

`check:pr: exit 0` (second run, 17 of 17 steps, `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped`):

```
1  typecheck        tsc -b tsconfig.json && tsc -p tsconfig.test.json: clean
2  lint             house-style: 617 file(s) clean (3 declared switch(es), 78 type-test file(s))
3  circular         No circular dependency found
4  test:tstyche     pass 1: Test files: 78 passed, 78 total; Tests: 423 passed, 1 skipped, 424 total; Assertions: 912 passed, 3 fixme, 3 skipped, 918 total
                    pass 2: Test files: 78 passed, 78 total; Tests: 422 passed, 2 skipped, 424 total; Assertions: 912 passed, 6 skipped, 918 total
5  coverage         Test Files 280 passed (280); Tests 6638 passed (6638)
                    All files 99.67 stmts / 98.69 branch / 99.6 funcs / 99.83 lines
                    devtools/src/model 99.85 / 99.47 / 99.86 / 99.94; devtools/src/react 99.24 / 96.33 / 98.4 / 99.5 (90% held)
6  test:bdd         Test Files 34 passed (34); Tests 568 passed (568)
7  spec:examples    doc-examples: 119 block(s) compile
8  spec:verify:strict  PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
9  spec:gates       dod-table: 26 step(s) match pnpm check, 178 reference(s) resolve
10 spec:claims      devtools-claims: 8 claim(s) registered across 6 file(s)
11 spec:api         api-surface: 942 export(s) documented across 9 package(s)
12 spec:package     package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))
13 example          7 files / 43 tests passed, build, e2e 30 passed
14 spec:website-examples  website-doc-examples: 77 block(s) compile
15 website          built
16 spec:publish     publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)
17 bench:self-test  self-test: 25 passed
```

`spec:package: exit 0`, run alone after it, last two lines of its output:

```
> node scripts/check-package-install.mjs

package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))
```

The api surface equals its base count (942). Gate 12 (`spec:claims`) is clean.

## Release check

- No tag contains `phase_base` (8ff027e1af33826bd1d90e6c039384ae8e7906dc): `git tag --contains` prints nothing.
- No `CHANGELOG.md` and no package `version` field changed since `phase_base`.
- `.changeset/devtools-lens-reads-each-fact-once.md` still exists (unconsumed).
- No remote branch contains the first phase commit (cc4ca5df).
- `84-check.mjs scan-ids`: no id or phase wording in added lines.
- `84-check.mjs trailers`: 30 plan commits, each with the one trailer.
- No push, merge, tag, publish or `changeset version` was run.

## Re-run after review fixes

When a review fix touches `LensSession.ts`, run the Stryker close alone first: the close invocation
(`pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/LensSession.ts`, stdin closed, nothing else
running) through `node <D>84-mutation.mjs record close lens --restart`, then `node <D>84-mutation.mjs compare`. Whatever the
fix touches, run `pnpm check:pr < /dev/null` and then `pnpm spec:package < /dev/null` again, each alone, outputs kept.

## Deviations from Plan

**1. [Rule 3 - Blocking] First `pnpm check:pr` run failed at step 5 on a timeout, the cause was machine load, rerun from the start passed.**
- **Found during:** Task 1.
- **Run 1 (exit 1):** steps 1 to 4 passed; step 5 `pnpm coverage`: `Test Files 1 failed | 279 passed (280)`, `Tests 1 failed | 6637 passed (6638)`. The one failure: `|devtools| test/model/DockModel.test.ts > the questions store (...) > P2: whatever the registry and the poll do, each snapshot's rows are the questions and guards of one moment`, `Error: Test timed out in 5000ms` (the file took 7916 ms). `run-check: pnpm coverage failed (exit 1)`. Output kept as `check-pr.run1.out`.
- **Cause:** a 5000 ms property-test timeout under a load average of 98 (after the run still 84), from `mediaanalysisd` and a Virtualization VM outside this repo. `DockModel.test.ts` and `DockModel.ts` are untouched by the phase (`git diff 8ff027e1 HEAD` over `packages/devtools/test/model/DockModel.test.ts` is empty; the only `src/model` change is `LensSession.ts`). The test passes alone in about 0.6 s, three times in a row.
- **Fix:** none to the code. Waited for the load to fall to 15 and ran `pnpm check:pr` again from the start, which exited 0 (the plan's own instruction on a failure). Both runs are kept. The test is a candidate flake under load, not investigated further, and out of the phase's scope.

**2. [Plan assumption] `spec:package` does not print `consumer: the published artifact authorizes correctly`.**
- The plan's truth and verify expect that line. `scripts/check-package-install.mjs` (unchanged since `phase_base`) runs the consumer with `stdio: "pipe"` and prints only the final `package-install: ... pack, resolve and authorize` line on success; the consumer's `console.log` is never forwarded. The consumer did run: a failed compile or run exits 1 with its reason, and a `make*Feed` the consumer never calls also fails the script. The task 1 verify was run without that one `grep -qF "consumer: ..."` clause; every other clause ran as written.

**3. [Plan assumption] `check:pr` already includes `spec:package` as step 12.** The standalone run asked for by the plan was run as well, alone, after `check:pr` finished.

**4.** `ADPT-01` to `ADPT-05` were marked with one `sed` over the ten lines rather than the Edit tool; `requirements.mark-complete` was not run.

## Known Stubs

None.
