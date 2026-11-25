---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 11
subsystem: testing
tags: [merge-gate, check-pr, spec-package, requirements, release-check]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: the finished tree and the mutation close of plans 01 to 10
provides:
  - pnpm check:pr and pnpm spec:package green at the close, each run alone
  - DIAG-01 to DIAG-04 complete
affects: []
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: 5380fdcf2dcb90a56213626f94f3f9277c5533d4
plan_head_after: 5380fdcf2dcb90a56213626f94f3f9277c5533d4
actuals:
  tokens: 9000
  tasks: 2
  commits: 0
tech-stack:
  added: []
  patterns: [the gate run alone on a clean tree, its output kept, requirements marked complete only after it]
key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "Requirements marked complete by hand after both gates passed; requirements.mark-complete not run"
requirements-completed: [DIAG-01, DIAG-02, DIAG-03, DIAG-04]
duration: 40min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 11: The phase gate Summary

`pnpm check:pr` and `pnpm spec:package` each exited 0 at the close, run alone on a tree equal to HEAD `5380fdcf`, with no
source file changed by this plan; DIAG-01 to DIAG-04 are complete and nothing was released.

## Gate facts

```
check:pr: exit 0 (output: $TMPDIR/qd83/check-pr.out, 680 lines)
run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).
typecheck, lint, circular: pass (lint prints only warnings in files this phase did not touch)
test:tstyche: Test files: 77 passed, 77 total; Tests: 420 passed, 1 skipped (rule off) / 419 passed, 2 skipped (rule on)
coverage: Test Files 276 passed (276); Tests 6627 passed (6627); thresholds enforced in config, step passed
coverage devtools: src/model 99.85 stmts / 99.47 branch / 99.86 funcs / 99.94 lines; src/react 99.25 / 96.33 / 98.41 / 99.51 (floor 90%)
coverage all files: Statements 99.67%, Branches 98.69%, Functions 99.6%, Lines 99.83%
test:bdd: Test Files 34 passed (34); Tests 568 passed (568)
spec:examples: doc-examples: 119 block(s) compile
spec:verify:strict: PASS: 21   FAIL: 0   SKIP: 0
spec:claims: devtools-claims: 8 claim(s) registered across 6 file(s)
spec:api: api-surface: 942 export(s) documented across 9 package(s)
spec:package (step 12): package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))
example: 43 unit tests passed, 30 e2e passed
spec:website-examples: website-doc-examples: 77 block(s) compile
spec:publish: publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)
bench:self-test: self-test: 25 passed

spec:package: exit 0 (output: $TMPDIR/qd83/spec-package.out)
package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))
```

Gate 14 holds the removed-field probes: `REFUSED_SHAPE_PROBES` names `["Diagnostics", "questions"]`, the consumer asserts
`diagnostics feed reading carries no questions` against a live reading, and its `@ts-expect-error` literal must stay or the
gate fails. The packed consumer compiled and ran to its end (the gate fails otherwise).

## Re-run after review fixes

When a review fix touches `packages/devtools/src/model/DiagnosticsFeed.ts`, `Diagnostics.ts` or `DockModel.ts`: run the close
invocation alone, stdin closed, nothing else running (`pnpm exec stryker run stryker.devtools.mjs --mutate
packages/devtools/src/model/DiagnosticsFeed.ts,packages/devtools/src/model/Diagnostics.ts,packages/devtools/src/model/DockModel.ts`),
then `node <phase dir>/83-mutation.mjs record close diagnostics --restart`, then `node <phase dir>/83-mutation.mjs compare`.
After any review fix to a measured or gated file (and after the mutation re-run when it applies), run `pnpm check:pr < /dev/null`
and then `pnpm spec:package < /dev/null` again, each alone, before the phase is complete (D-23, D-24).

## Release check

```
no tag contains phase_base: git tag --contains bc02e8e6 prints nothing
no CHANGELOG.md changed since phase_base (git diff --name-only)
no package version changed; package.json, packages/*/package.json and pnpm-lock.yaml equal phase_base
.changeset/devtools-diagnostics-has-no-questions.md exists (unconsumed)
git branch -r --contains 38fb5b28 (first phase commit) prints nothing: nothing pushed
83-check.mjs trailers: 29 plan commits, each with one Claude trailer
83-check.mjs scan-ids: no id or phase wording in added lines
```

## Deviations from Plan

**1. [Rule 1 - plan verify defect] The Task 1 verify greps `consumer: the published artifact authorizes correctly` in
`spec-package.out`.** `check-package-install.mjs` runs the consumer with `stdio: "pipe"`, so that line (and the consumer's
`the diagnostics feed was read for N turns` line) is read by the gate and never reaches its output; the gate prints only its
final `package-install: 9 package(s) pack, resolve and authorize` line on success. That final line, the exit code 0 and the
guard (the gate fails if the `Diagnostics`/`questions` probe is missing or the consumer fails) were taken as the evidence
instead. No file was changed for this.

Otherwise none: the gate passed first time, so no fix commit was needed.

## Known Stubs

None.

## Self-Check: PASSED

`$TMPDIR/qd83/check-pr.exit` and `spec-package.exit` read 0; `83-check.mjs trailers` and `scan-ids` pass; the changeset file exists.
