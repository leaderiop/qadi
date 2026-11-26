---
phase: QD-87-one-scoped-run-that-states-its-stop
plan: 11
subsystem: testing
tags: [merge-gate, check-pr, no-release, trailers, phase-close]

phase_base: 56b9ae4d98ebd1f950369c9830d4a310727895ac
plan_head_before: 9bcddb76005c91a6f49477fd616de566d1a146c3
plan_head_after: 9bcddb76005c91a6f49477fd616de566d1a146c3

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: the phase head after 87-10 (mutation close recorded, two patch changesets, coverage green)
provides:
  - the merge gate's result on the phase head (`pnpm check:pr`, exit 0, run alone)
  - the no-release and scope proofs over every commit since phase_base
affects: [QD-87 phase close]

requirements-completed: []

actuals:
  tokens: 12000
  tasks: 2
  commits: 0

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-11-SUMMARY.md
  modified: []

key-decisions:
  - "No code commit: the gate passed first time, so there was no finding to fix. `commits: 0` is measured over the plan's own work (the gate ran on the head 87-10 left); the workflow's metadata commit for this summary follows and is amended to carry the trailer."

duration: 10min
completed: 2026-11-25
status: complete
---

# Phase 87 Plan 11: The merge gate and the final checks Summary

**`pnpm check:pr` exits 0 on the phase head, run alone, and nothing was released: no tag, package version, changelog or changeset config moved since `phase_base`, both changesets wait, and all 35 commits since `phase_base` carry the one trailer and stay in scope.**

## Accomplishments

- The merge gate for a non-release change passed whole on the head 87-10 left: 17 of 18 steps ran (typecheck, lint, circular, tstyche, coverage, BDD, the spec gates, the package-install gate, the examples, the website, publish-status, the bench self-test); only `pnpm mutation` is skipped, as `check:pr` defines, and 87-10 recorded the mutation close.
- No release step was taken, and the proofs are below.

## Task Commits

None. Plan 87-11 changes no code: Task 1 ran the gate (it passed without a fix, so no `fix(87-11)` commit exists) and Task 2 ran the read-only checks. This summary is committed by the workflow's metadata commit.

## Merge gate

- Head it ran on: `9bcddb76005c91a6f49477fd616de566d1a146c3` (branch `arch-wave-16`)
- Command: `pnpm check:pr < /dev/null > <scratch>/qd87/check-pr.log 2>&1`, run in the background with nothing else running (no vitest, Stryker or check process existed before it started)
- Started 2026-11-25T20:50:14Z, finished 2026-11-25T20:52:59Z
- Exit status: 0
- Working tree during the run: no tracked change under `packages spec .changeset features apps examples scripts`; no `.vitest/` or `.stryker-tmp/` left afterwards

Last 30 lines of the log, verbatim:

```
21:52:58   ├─ /docs/packages/testing/index.html (+1ms) 
21:52:58   ├─ /docs/reference/api/index.html (+1ms) 
21:52:58   ├─ /docs/reference/glossary/index.html (+1ms) 
21:52:58   ├─ /docs/reference/models/index.html (+1ms) 
21:52:58   ├─ /docs/reference/upgrading/index.html (+1ms) 
21:52:58 ✓ Completed in 121ms.

21:52:58 [build] ✓ Completed in 524ms.
21:52:58 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
21:52:58 [starlight:pagefind] Building search index with Pagefind...
21:52:58 [starlight:pagefind] Found 45 HTML files.
21:52:58 [starlight:pagefind] Finished building search index in 148ms.
21:52:58 [build] 45 page(s) built in 1.11s
21:52:58 [build] Complete!

[run-check 16/17] pnpm spec:publish

> qadi-monorepo@0.4.0 spec:publish /Users/mohammadalmechkor/Projects/Perso/qadi
> node scripts/check-publish-status.mjs

publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)

[run-check 17/17] pnpm bench:self-test

> qadi-monorepo@0.4.0 bench:self-test /Users/mohammadalmechkor/Projects/Perso/qadi
> node scripts/bench/analyze.mjs --self-test

self-test: 25 passed

run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).
```

## Final checks

Run from the repository root with stdin closed, against `phase_base` `56b9ae4d98ebd1f950369c9830d4a310727895ac` (printed by `node 87-check.mjs base`).

| Command | Result as printed |
| ------- | ----------------- |
| `node 87-check.mjs trailers` | `trailers: 35 commits since phase_base, each with the one trailer` (exit 0) |
| `node 87-check.mjs scan-ids` | `scan-ids: no id or phase wording in added lines` (exit 0) |
| `node 87-check.mjs scan-forbidden` | `scan-forbidden: no forbidden form in added lines` (exit 0) |
| `node 87-earlier-checks.mjs` | exit 0; every earlier-phase check matched its ledger row (86-check `trailers` 22 plan commits, `owner-shape`, `provider-forwards-only`, `records`, `records --close`; `86-pinned-check` 59 files hold their base text, 1 of 1 born files held; the 85 and 86 self-tests 245, 37, 57, 17, 262, 18, 64 and 21 passed) |
| `git tag --contains 56b9ae4d98ebd1f950369c9830d4a310727895ac` | empty: no tag points into the phase |
| `git rev-parse --abbrev-ref HEAD` | `arch-wave-16` |
| `git diff --stat <phase_base> -- .changeset/config.json "packages/*/package.json" "packages/*/CHANGELOG.md"` | empty: no package version, changelog or the changeset config moved |
| `ls .changeset/devtools-one-stated-run.md .changeset/core-cause-text-doc.md` | both present |
| forbidden paths over `git log --name-only <phase_base>..HEAD` (`.planning/milestones/`, `.planning/config.json`, `.planning/state.json`, `.planning/REQUIREMENTS.md`, `README.md`, `.agents/`, `.codex/`, `assets/`, `*.iter*.md`) | none committed |
| plan-subject form `^[a-z]+[(]87-[0-9]{2}[)]!?: ` over the 35 commits since phase_base | 35 of 35 match; no subject naming a plan departs from the form |

No `changeset version`, push, tag, publish, merge or pull request was run.

## Deviations from Plan

None - plan executed exactly as written. One note on the check commands: the plan's Task 1 verify is a `bash -c` script that needs the log in `<S>`; the log was written there as the plan states.

## Issues Encountered

None.

## Known Stubs

None. This plan changes no source.

## Threat Flags

None.

## State updates not done

None. `roadmap.update-plan-progress` (plan_count 11, summary_count 11), `state.advance-plan` (10 to 11), `state.update-progress`, `state.record-metric`, `state.add-decision` and `state.record-session` each ran once and succeeded. No requirement was marked complete (the run rules forbid it).

## Self-Check: PASSED

- The Task 1 and Task 2 `<automated>` verifies were run as written after this file was written and exited 0.
- `check-pr.log` exists in the scratch directory and ends with the `run-check: ran 17 of 18 steps` line quoted above.
- No commit exists for this plan beyond the metadata commit that follows; the head the gate ran on (`9bcddb76`) is an ancestor of HEAD.
