---
phase: 01-release-readiness-runtime-verification
plan: 01
subsystem: infra
tags: [github-actions, ci, node, matrix, engines]

requires: []
provides:
  - "check.yml running pnpm check on a two-leg Node matrix (20.19.0, 26), both blocking"
  - "Doc claims (CONCERNS.md, STACK.md, PROJECT.md) updated to describe the floor as CI-exercised"
affects: [01-02, 01-03, 01-04]

actuals:
  tokens: 1955
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "GitHub Actions matrix expansion within a single job (strategy.matrix + fail-fast: false) to add a runtime leg without violating the 'one job, one gate' invariant (AGENTS.md §15)"

key-files:
  created: []
  modified:
    - .github/workflows/check.yml
    - .planning/codebase/CONCERNS.md
    - .planning/codebase/STACK.md
    - .planning/PROJECT.md

key-decisions:
  - "Raised jobs.check.timeout-minutes from 30 to 60, backed by measured 27m34s-28m52s runs against the prior 30-minute budget (not a D-NN decision; a planner-added necessity per the plan)"
  - "Did not touch packages/*/package.json's looser >=20 engines range — recorded as a deliberate, known follow-up gap in CONCERNS.md rather than silently inherited"
  - "Worktree branch was forked from a commit predating .planning/ existing on main; merged main into the worktree branch (git merge, non-force, no conflicts — trees were content-identical at the fork point) before any task work, since the plan's target files did not exist on the branch otherwise"

requirements-completed: [COMPAT-01]

coverage:
  - id: D1
    description: "check.yml runs pnpm check on two matrix legs (Node 20.19.0 and 26), fail-fast false, floor leg blocking, timeout raised to fit measured runtime"
    requirement: "COMPAT-01"
    verification:
      - kind: other
        ref: "python3 structural assertion (Task 1's <automated> check) against .github/workflows/check.yml"
        status: pass
    human_judgment: false
  - id: D2
    description: "A real GitHub Actions run confirming both matrix legs conclude success, the floor leg resolves to exactly v20.19.0, and it finishes inside the 60-minute budget"
    requirement: "COMPAT-01"
    verification: []
    human_judgment: true
    rationale: "The plan explicitly defers this to a <human-check> harvested at end-of-phase verification — a real CI run requires pushing the branch/opening a PR, which is a developer decision this task does not make unilaterally. Only tooling-observability (gh auth status, gh workflow list, gh run list) was automated this session; no push or workflow dispatch was performed."
  - id: D3
    description: "No file in the repository still claims the Node floor is declared-but-unverified (check.yml comment, CONCERNS.md, STACK.md, PROJECT.md)"
    requirement: "COMPAT-01"
    verification:
      - kind: other
        ref: "python3 doc-claim assertion (Task 3's <automated> check) against CONCERNS.md, STACK.md, PROJECT.md"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-08-30
status: complete
---

# Phase 01 Plan 01: Node Engine Floor Verification Summary

**`check.yml` now runs `pnpm check` as two independent, blocking matrix legs — Node 20.19.0 (the declared floor) and Node 26 — turning the `engines` declaration into a verified claim, with every stale "unverified" doc claim retired.**

## Performance

- **Duration:** ~10 min (task work; investigation/setup overhead not included)
- **Completed:** 2026-08-30
- **Tasks:** 3/3 completed
- **Files modified:** 4

## Accomplishments

- `.github/workflows/check.yml`'s single `check` job gained a `strategy` block (`fail-fast: false`, `matrix.node-version: ["20.19.0", "26"]`), the `setup-node` step now reads `${{ matrix.node-version }}` instead of a literal, `timeout-minutes` rose from 30 to 60 (measured 27m34s-28m52s against the old 30-minute budget), and the inline comment now explains why both versions are pinned exactly and that this matrix is what verifies the floor.
- Confirmed the workflow is dispatchable/observable (`gh auth status`, `gh workflow list`, `gh run list --workflow=check.yml`) without pushing or dispatching anything — that step is left for a human, per the plan's own design (a real CI run needs a pushed branch, which is a developer decision).
- Retired every remaining claim that the floor is unverified: `CONCERNS.md`'s "Engine Version Floor Unverified" entry, `STACK.md`'s two Node references, and `PROJECT.md`'s Context and Constraints bullets all now describe the two-leg matrix as the current, exercised state — plus recorded the one deliberately-unclosed sub-gap (nine `packages/*/package.json` files still declaring the looser `>=20`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand check.yml to a two-leg Node matrix, floor first** - `03242c5` (feat)
2. **Task 2: Prove the floor leg end-to-end on a real runner** - no new commit (automation-only task; see below)
3. **Task 3: Retire every claim that the floor is unverified** - `99d3d25` (docs)

**Setup commit (not a plan task):** `9bf4569` — `git merge main` into the worktree branch, required because the worktree's branch had forked from a point in history before `.planning/` was ingested on `main` (see Deviations below). This commit brought in `.planning/`, `apps/website/`, and other `main`-only content unrelated to this plan; the plan's own two commits above are the only ones that touch this plan's four target files (`git diff --stat 9bf4569..HEAD` confirms exactly `.github/workflows/check.yml`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/STACK.md`, `.planning/PROJECT.md`).

## Files Created/Modified

- `.github/workflows/check.yml` - Two-leg Node matrix (20.19.0, 26), `fail-fast: false`, `timeout-minutes: 60`, rewritten setup-node comment
- `.planning/codebase/CONCERNS.md` - "Engine Version Floor Unverified" retitled and rewritten to describe the matrix as current state; records the `packages/*` `>=20` follow-up gap
- `.planning/codebase/STACK.md` - Environment line and Development Node Versions section now describe both matrix legs instead of presenting v26 as verification of the floor
- `.planning/PROJECT.md` - Context bullet and Constraints "Compatibility" bullet moved to past tense, pointing at the matrix

## Decisions Made

- Raised `timeout-minutes` to 60 (not 45, the plan's minimum bound) — the measured Node 26 runs (27m34s, 28m43s, 28m52s, plus a newly observed 27m46s from `gh run list`) leave the older, slower Node 20.19.0 leg real headroom rather than the bare minimum.
- Followed the plan's explicit instruction not to assert a green CI run in the doc rewrites — all three doc edits describe what the workflow now *does* (matrix exists, both legs run `pnpm check`, floor leg blocking), not that a run has been observed green. That observation is Task 2's `<human-check>`, listed in full below under Next Phase Readiness.
- Merged `main` into the worktree branch before starting task work (see Deviations) — the alternative (asking the orchestrator to respawn the worktree from a correct base) was not available mid-execution, and the merge was verified safe (content-identical trees at the fork point, no conflicts).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree branch predated `.planning/` on `main`; merged `main` in before task work**
- **Found during:** Initial required-reading step, before Task 1
- **Issue:** This worktree's branch (`worktree-agent-a5847d4254fc5fced`) had forked from commit `52a13f1`/`f86f028` (a "hasSignature" feature commit), which predates every `.planning/` commit on `main` (the ADR ingest, phase context, research, and this very `01-01-PLAN.md`). None of the plan's target `.planning/*` files existed in the worktree's working tree at all, and the plan's own required-reading and `<context>` `@`-references were unreadable from within the worktree.
- **Fix:** Verified `git diff 52a13f1 f86f028` was empty (the worktree branch's tip was tree-identical to an ancestor of `main`'s history — same content, different commit hash, consistent with a squash-merge), then ran `git merge main -m "chore: merge main to pick up .planning setup before executing 01-01 plan"` from a clean working tree. The merge completed with zero conflicts (git auto-merged; no manual conflict resolution was needed), bringing in `.planning/`, `apps/website/`, and other `main`-only commits unrelated to this plan, alongside this plan's own target files.
- **Files modified:** None directly by the merge decision itself; the merge commit (`9bf4569`) is a standard non-force `git merge`, not a rewrite of any history. This plan's two task commits (`03242c5`, `99d3d25`) sit on top of it and touch only the four files the plan specifies.
- **Verification:** `git diff --stat 9bf4569..HEAD` confirms exactly four files changed across this plan's two commits, matching `files_modified` in the plan's frontmatter. `.github/workflows/check.yml` was also confirmed byte-identical between the worktree's pre-merge HEAD and `main` before editing, so the merge introduced no surprise pre-existing drift in the file this plan edits.
- **Committed in:** `9bf4569` (merge commit, precedes the two task commits)

---

**Total deviations:** 1 auto-fixed (1 blocking — Rule 3, environment/branch setup)
**Impact on plan:** Necessary to make the plan's target files reachable at all; no scope creep — the merge commit's content is entirely `main`'s pre-existing, already-committed work, not new authorship by this execution. This is flagged for the orchestrator: worktrees for this phase's remaining plans (`01-02`, `01-03`, `01-04`) may have the same stale-fork issue if spawned from the same base.

## Issues Encountered

None beyond the branch-fork issue documented above under Deviations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`check.yml`'s config-level work is done and committed. What remains is exactly Task 2's `<human-check>`, unautomatable from this environment (requires a pushed branch or an opened PR, which is a developer decision, not this task's to make):

1. Open a PR (or push the branch) and confirm on the `check` workflow run: two legs appear — `check (20.19.0)` and `check (26)` — and both conclude success.
2. The `20.19.0` leg's "Setup Node" step log shows it installed exactly v20.19.0 (RESEARCH.md Assumption A2 is unverified until this is read from a real run log).
3. The `20.19.0` leg finished inside 60 minutes; note the actual duration.
4. Any `@qadi`-unrelated engine warning naming `@changesets/cli` in the Install step is expected noise, not a failure (RESEARCH.md Pitfall 2 — `@changesets/cli@3.0.1` declares `engines.node` of `^22.11 || ^24 || >=26` and cannot run on Node 20 at all; no `.npmrc` sets `engine-strict`, so this is advisory, not fatal).
5. If the floor leg failed on a real Node 20 incompatibility, say so rather than approving — D-07 requires it be fixed inside this phase, not deferred or worked around by raising the floor.

Automated tooling-observability for this was confirmed this session: `gh auth status` reports an authenticated `github.com` account (`leaderiop`), `git remote get-url origin` resolves to `git@github.com:leaderiop/qadi.git`, `gh workflow list` shows the `check` workflow active, and `gh run list --workflow=check.yml --limit 5` is readable — recent durations observed: 27m46s, 27m34s, 28m43s, 1m57s (cancelled run, not representative), 28m52s. No `git push` and no `gh workflow run` was executed by this task, per the plan's explicit instruction.

Flag for the orchestrator: this worktree required a `git merge main` before task work could begin (see Deviations). If `01-02`, `01-03`, `01-04` worktrees were spawned from the same stale base as this one, they will hit the identical issue and need the same fix.

---
*Phase: 01-release-readiness-runtime-verification*
*Completed: 2026-08-30*
