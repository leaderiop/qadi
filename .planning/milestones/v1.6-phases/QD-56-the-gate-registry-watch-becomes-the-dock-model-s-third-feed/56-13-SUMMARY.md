---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 13
subsystem: verification
tags: [phase-scan, mutation, check-pr, release-check, gfed-01, gfed-02, gfed-03, gfed-04, gfed-05, wx-01, wx-02, wx-04, wx-05, wx-06, wx-07]
requires: ["56-12"]
provides:
  - the phase scan, the model scan and the D-11 comparison, all clean on the committed tree
  - pnpm check:pr exit 0 (16 of 17 steps; only pnpm mutation skipped)
  - the release check (nothing versioned, tagged, pushed or published)
  - GFED-01..05 marked Complete in both places in REQUIREMENTS.md
affects: []
actuals:
  tokens: 6000
  tasks: 2
  commits: 0
plan_head_before: 18acb17dcd1446bf62981bee8371b1924836c933
plan_head_after: 18acb17dcd1446bf62981bee8371b1924836c933
tech-stack:
  added: []
  patterns: ["a verification-only close-out plan: the scan, the comparison and the gate run on the committed tree, and nothing outside .planning/ changes"]
key-files:
  created:
    - .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-13-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "The phase's own history is the evidence: the scan ran against the code as it is after 56-09's mutation-driven rewrite, with two plan-scan corrections (below)."
requirements-completed: [GFED-01, GFED-02, GFED-03, GFED-04, GFED-05]
requirements-held-pending: [WX-01, WX-02, WX-04, WX-05, WX-06, WX-07]
duration: 25min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 13: the phase scan, check:pr and GFED-01..05 complete

The whole phase diff and history obey the phase's rules (after two scan-script corrections, below), the D-11 mutation comparison holds on the final tree, `pnpm check:pr` exits 0, nothing was released, and GFED-01..05 are Complete. The six WX rows stay Pending for the milestone.

No source, test, spec, script or example file changed in this plan; the only edit is `.planning/REQUIREMENTS.md`. There is no task commit (the plan is verification only), so `commits: 0` is legitimate: the one commit is the `docs(56-13)` close-out holding this SUMMARY, REQUIREMENTS.md and the STATE/ROADMAP progress.

## Phase scan

Run from the repository root, with the phase base `88f0ca26d54ead81df550ce8da2d49b396f065e1` (56-01's `phase_base`). The script as written in the plan failed with two lines; each is a defect of the scan script, not of the tree, and each was fixed narrowly (see Deviations). With those two fixes the whole output is:

```
phase scan clean
```

The plan's `git diff ... -- "packages/*/src/*"` pathspec (trailing `/*`) matches files below the directories, so the orchestrator's vacuous-pathspec note (`'packages/*/src'`) did not apply to this script; no change was needed there. The construct regex in this script already skips `import` lines, so the second orchestrator note needed no change either.

Raw first-run output, before the two corrections:

```
outside the phase scope: packages/devtools/src/react/useDiagnostics.ts
GatesFeed.test.ts lost a line after its first commit: const guard = (id: string, policy: Policy): GateInstanceLike => ({ id, kind: "Ca
```

## Model scan

```
DockModel composes three feeds; the watch lives in GatesFeed.ts, twinned and package-private
```

## D-11

```
packages/devtools/src/model/DiagnosticsFeed.ts 0.9473684210526315 -> 0.9885057471264368 (detected 90 -> 86; survivors +0 -4)
  gone survivor ConditionalExpression | Survived | false | !runs.isCurrent(token) | if (!runs.isCurrent(token)) return;
  gone survivor ConditionalExpression | Survived | false | next.collector === undefined | ...(next.collector === undefined ? {} : { collector: next.collector }),
  gone survivor ConditionalExpression | Survived | false | next.layer === undefined | ...(next.layer === undefined ? {} : { layer: next.layer }),
  gone survivor ConditionalExpression | Survived | false | next.questions === undefined | ...(next.questions === undefined ? {} : { questions: next.questions }),
packages/devtools/src/model/DiagnosticsStore.ts 1 -> 1 (detected 60 -> 57; survivors +0 -0)
packages/devtools/src/model/DockModel.ts 1 -> 1 (detected 145 -> 114; survivors +0 -0)
packages/devtools/src/model/Gates.ts 1 -> 1 (detected 66 -> 70; survivors +0 -0)
packages/devtools/src/model/GatesFeed.ts 1 (detected 118; survivors 0; ignored 4)
static: all 4 ignored mutants of packages/devtools/src/model/GatesFeed.ts are Killed in .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation-static.json
WX-05 holds (D-11)
```

## check:pr

`pnpm check:pr < /dev/null`, run in the background after the three verifies passed, with nothing else running (no Stryker, vitest or bench); exit code 0. The tree was clean (no tracked change besides the pre-existing `.planning/config.json`). Steps it printed:

```
[run-check 1/16] pnpm typecheck
[run-check 2/16] pnpm lint
[run-check 3/16] pnpm circular
[run-check 4/16] pnpm test:tstyche
[run-check 5/16] pnpm coverage
[run-check 6/16] pnpm test:bdd
[run-check 7/16] pnpm spec:examples
[run-check 8/16] pnpm spec:verify:strict
[run-check 9/16] pnpm spec:gates
[run-check 10/16] pnpm spec:claims
[run-check 11/16] pnpm spec:api
[run-check 12/16] pnpm spec:package
[run-check 13/16] pnpm example
[run-check 14/16] pnpm spec:website-examples
[run-check 15/16] pnpm website
[run-check 16/16] pnpm spec:publish
run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).
```

Last-line facts: coverage Statements 99.6%, Branches 98.42%, Functions 99.48%, Lines 99.83% (thresholds met); `spec:verify:strict` PASS: 21 FAIL: 0 SKIP: 0; `spec:gates` 25 step(s) match pnpm check, 143 reference(s) resolve; `spec:publish` 9 package(s) and 6 document(s) agree on version (0.12.0). The lint step printed only pre-existing `unicorn(no-useless-fallback-in-spread)` warnings in `features/step-definitions/CustomPredicateGivenSteps.ts`, a file this phase did not touch.

## Release check

```
nothing released; GFED-01..05 complete; WX rows Pending
```

On `arch-wave-11`, no remote branch contains HEAD, no tag contains a phase commit, no version or changelog file changed since `phase_base`, no changeset was deleted, nothing is staged. `pnpm changeset version` was never run; nothing was pushed or published.

## Deviations from Plan

### Orchestrator-authorised scan corrections

Recorded verbatim as the orchestrator notes require: the 56-02 correction (the `capture code remains` regex applied outside the `GOLDEN` literal) and the 56-04 corrections (the `':(glob)packages/*/src/**'` pathspec; the `as` regex skipping import lines) belong to scan commands this plan's script does not contain (its pathspec ends in `/*` and already matches below the directories; it already skips import lines and has no capture-code regex), so none had to be applied.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The scan's scope list omitted `useDiagnostics.ts`**
- **Found during:** Task 1, first verify
- **Issue:** `outside the phase scope: packages/devtools/src/react/useDiagnostics.ts`. The file is named in 56-07's plan (frontmatter `files_modified` and Task 3) and was changed only by `15a6a152 refactor(56-07)!: the diagnostics poll no longer samples a questions thunk`, a doc-comment edit ("four fields" to "three fields (`layer`, `collector`, `intervalMillis`)") that 56-07's own verify requires.
- **Fix:** added `RS+"useDiagnostics.ts"` to the scan's `ALLOWED` set (a copy of the script in the scratchpad; the plan file is untouched).
- **Files modified:** none in the repository.

**2. [Rule 3 - Blocking] The scan's "lost no line" check did not allow the `guard` test helper's widening**
- **Found during:** Task 1, first verify
- **Issue:** `GatesFeed.test.ts lost a line after its first commit: const guard = (id: string, policy: Policy): GateInstanceLike => ...`. Commit `7ce2f20e test(56-05): GP2, the gates feed's twin of P2` widened the one-line `guard` helper to take an optional `{ state, resource }` (GP2 needs a resource and a state); every case is retained (the only removed lines in the whole range are two import lines and that helper's old one-line form).
- **Fix:** extended the check's allow pattern with `^const guard = \(id: string, policy: Policy\): GateInstanceLike`, so exactly that helper's old form is exempt; any removed `it.effect` line would still fail.
- **Files modified:** none in the repository.

**Total deviations:** 2 auto-fixed (both Rule 3, both defects of the scan script's lists, not of the tree). **Impact:** none on the tree; the phase's rules hold.

## Known Stubs

None. This plan edits no source.

## Threat Flags

None.

## Self-Check: PASSED

- `56-13-SUMMARY.md` and `.planning/REQUIREMENTS.md` exist and the release check confirms GFED-01..05 checked and Complete in both places with WX-01..07 Pending and unchecked.
- The phase scan, model scan and D-11 comparison printed their clean lines; `pnpm check:pr` exited 0; `git status` shows no tracked change outside `.planning/` (the pre-existing `.planning/config.json` modification is not staged).
