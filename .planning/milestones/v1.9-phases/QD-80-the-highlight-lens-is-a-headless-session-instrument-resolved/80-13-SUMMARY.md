---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 13
subsystem: merge-gate
tags: [check-pr, spec-package, requirements, trailer-scan]
requires: [80-12]
provides:
  - pnpm check:pr and pnpm spec:package green on the tree the mutation close measured
  - LENS-01 to LENS-05 marked complete by hand
  - the plan-commit trailer scan
affects: []
key-files:
  modified:
    - .planning/REQUIREMENTS.md
key-decisions: []
requirements-completed: [LENS-01, LENS-02, LENS-03, LENS-04, LENS-05]
metrics:
  duration: 45min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: 39d6bdfb8821445e9eb565d0f8fa50a680dd378e
plan_head_after: 6f3c3f00
actuals:
  tokens: 2000
  tasks: 2
  commits: 1
---

# Phase QD-80 Plan 13: The merge gate Summary

`pnpm check:pr` and `pnpm spec:package` both exit 0 on the tree the mutation close measured, LENS-01 to LENS-05 are
marked complete by hand in one commit after the gate ran, and all 37 plan commits carry exactly one Claude trailer.

phase_base: 55c79a96db057952465918e410c529b85dc3e4e7

## Gate record

| Item | Value |
| ---- | ----- |
| `check:pr` head (`<S>/check-pr.head`) | `39d6bdfb8821445e9eb565d0f8fa50a680dd378e` |
| mutation close head (both groups) | `aa967903320c0f9fb0452b349efec33c130532aa` |
| `git diff --quiet aa967903 39d6bdfb -- packages` | no difference |
| `check:pr` exit status | `0` |
| `check:pr` last line | `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).` |
| `spec:package` exit status | `0` |
| `spec:package` last line | `package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))` |

Nothing outside `.planning/` was uncommitted when `check:pr` started (the only untracked entries were `.agents/` and
`.codex/`, which are not staged anywhere). `check:pr` and `spec:package` each ran alone, in the background, in that order.

## check:pr coverage and tests

- Unit and coverage run: 267 test files, 6541 tests passed. Coverage `All files` 99.67 / 98.69 / 99.6 / 99.83
  (stmts, branch, funcs, lines).
- `@qadi/react`: `react/src` 99.52 stmts, 99.06 branch, 98.6 funcs, 99.48 lines.
- `@qadi/devtools`: `devtools/src/react` 99.24 stmts, 96.29 branch, 98.41 funcs, 99.5 lines (the table's other devtools
  rows are above the thresholds too; the run passed its thresholds).
- tstyche passes in both passes (rule off, then rule on), including `packages/react/test/QadiProvider.tst.ts`.
- BDD: 34 files, 568 tests passed. `examples/nextjs-newsroom`: 7 files, 43 tests passed.

## Requirements

`.planning/REQUIREMENTS.md` edited by hand: the five `- [ ] **LENS-0N**` lines became `- [x]` and the five table rows
read `| LENS-0N | Phase 80 | Complete |`. No WX row changed; `requirements.mark-complete` was not used. Commit `6f3c3f00`
holds only that file and changes only LENS lines, and is a descendant of the `check:pr` head.

## Trailer scan

Rule applied: a plan commit's subject matches `^[a-z]+[(]80-[0-9]{2}[)]!?: `; the orchestrator's `docs(80):`,
`docs(phase-QD-80):` and `docs(QD-80):` commits carry no plan number and are not scanned.

```
trailers: 37 plan commits, each with one Claude trailer
```

Every commit since `phase_base` that touches a path outside `.planning/` is a plan commit, and no `.planning/config.json`,
`.planning/state.json`, `.agents/`, `.codex/` or `*REVIEW*.iter*.md` path was committed in the range.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `/private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd80/check-pr.status` and `spec-package.status` hold `0`.
- Commit `6f3c3f00` is an ancestor of HEAD; both task verifies exit 0.
