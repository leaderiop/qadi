---
phase: QD-61-decisioncache-is-asked-only-the-question
plan: 05
subsystem: docs
tags: [changeset, upgrade-guide, breaking, wx-07]
phase_base: 7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3
requires: [61-04]
provides:
  - .changeset/core-decision-cache-asked-the-question.md, the Breaking @qadi/core minor
  - the 0.13 "a DecisionCache is asked only the question" section of upgrading.md, with a compiled After fence
affects: [61-06, 61-07]
actuals:
  tokens: 2500
  tasks: 2
  commits: 1
plan_head_before: 9b447818b24707c589a4b96366e5646b32b64431
plan_head_after: 60ca58ce0f0de908b810485053e0f47f630b4e48
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-61 Plan 05: The Breaking changeset and the 0.13 note

**A Breaking `@qadi/core` minor changeset and a 0.13 upgrade-guide section whose After fence (a logging cache that delegates to `decisionCacheLayer()`) compiles under `check-website-doc-examples.mjs`: `website-doc-examples: 71 block(s) compile`; one `docs(61-05)` commit 60ca58ce; nothing released.**

## Commits

| Task | SHA | Subject |
| ---- | --- | ------- |
| 1-2 | 60ca58ce | `docs(61-05): the Breaking changeset and the 0.13 note for a DecisionCache asked only the question` |

The commit holds exactly `.changeset/core-decision-cache-asked-the-question.md` (9 lines) and
`apps/website/src/content/docs/docs/reference/upgrading.md` (+42 lines), and ends with the trailer. Both files are the
plan's verbatim blocks, extracted mechanically.

## Verifies

- Task 1 verify: `one new Breaking @qadi/core minor`.
- Task 2 verify 1: `node scripts/check-website-doc-examples.mjs` printed `website-doc-examples: 71 block(s) compile`
  (70 at `phase_base`); the section-shape check printed `section ok` (verbatim after one blank line, heading once, names
  TS2559, `Layer.provide(decisionCacheLayer())`, `first asker`, ADR-QD-174).
- Task 2 verify 2: `docs(61-05) 60ca58ce` (two files only, no package.json or CHANGELOG change since `phase_base`, no tag
  containing `phase_base`, trailer last).

## Deviations from Plan

None - plan executed exactly as written. No `packages/*/src` or `packages/*/test` file was touched, so the 61-04 mutation
evidence stays fresh.

## Next plan must know

- **The new section links ADR-QD-174** at `spec/decisions/174-a-decision-cache-is-asked-the-question.md`, which does not
  exist yet (`ls spec/decisions | grep ^174` is empty at this commit). It must be written by the plan that authors the
  ADR (61-06) at exactly that file name, or the link in `upgrading.md` and the changeset's pointer will dangle. This is
  not a gate today: the website gate compiles fences and does not check links.
- WX-07 stays Pending in `.planning/REQUIREMENTS.md` (an all-phases row, never flipped by this plan).
- `.changeset/core-decision-cache-asked-the-question.md` is unreleased; nothing was versioned, published, tagged or pushed.

## Known Stubs

None.

## Self-Check

PASSED. The changeset and `upgrading.md` section found; commit 60ca58ce is an ancestor of HEAD.
