---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 02
subsystem: devtools
tags: [checks, pinned-tests, earlier-phase-rerun]
requires: ["84-01"]
provides:
  - "84-pinned-check.mjs: sixteen held test files, the two declared edits of Lens.adapter.test.tsx, the re-expressed useConfigured.test.tsx, the eight surface refusals and three born files, each judged against phase_base"
  - "84-earlier-checks.mjs: Phase 83's pinned, earlier-phase and four structural checks re-run from a scratch copy"
affects: [84-03, 84-05, 84-06, 84-08, 84-09, 84-12]
key-files:
  created:
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-pinned-check.mjs
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-earlier-checks.mjs
  modified:
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md
status: complete
completed: 2026-11-25
commits: 1
plan_head_before: db98d00cab1615e99824771d049e8a7850e0dd19
plan_head_after: 9a0ab55d2bc923bdeb980d6f4175b0bc1c81c259
actuals:
  tokens: 28000
  tasks: 2
  commits: 1
requirements-completed: []
---

# Phase QD-84 Plan 02: The pinned-test check and the earlier-phase re-run Summary

The tests the phase must not rewrite are now held by a committed script that compares each with its `phase_base` text apart
from exactly the declared edits, and Phase 83's checks re-run green from a scratch copy; both were seen failing once.

## What was built

- `84-pinned-check.mjs` (self-test 38 cases): sixteen files byte for byte; `Lens.adapter.test.tsx` through its two edits
  (`mount-call`, and the two-line `import-useStoreSnapshot`); `useConfigured.test.tsx` held at the base until the commit
  `test(84-05): the useConfigured double carries its own configure` exists, then against that commit's text with the
  `harness-call` edit; `surface.tst.ts` through `judgeAdditions` over `git diff -U0` (blank lines, the directive and the eight
  refusals, each once right after its directive); three born characterisation files held against their adding commit.
  On the tree: `pinned: 16 files hold their base text, 0 of 2 declared edits applied, useConfigured.test.tsx held at the base,
  0 of 8 refusals added, 0 of 3 born files held`. `--all-applied` fails now, first line
  `packages/devtools/test/react/Lens.adapter.test.tsx: 0 of 2 declared edits applied, not all`.
- `84-earlier-checks.mjs` (self-test 8 cases): copies five Phase 83 files to `<S>/p83/`, rewrites the root line of the copy of
  `83-earlier-checks.mjs`, and requires six labels at exit 0 (`83-pinned-check.mjs --all-applied`, `83-earlier-checks.mjs`,
  `83-check.mjs` `no-store`, `single-fold`, `stale-path`, `registers`). Phase 83's own expected `79-pinned-check.mjs` TF29 line
  is echoed (indented) and accepted by `83-earlier-checks.mjs`, not treated as a failure here.

## Seen failing (84-RED-EVIDENCE.md)

- `pinned --all-applied`: `packages/devtools/test/react/Lens.adapter.test.tsx: 0 of 2 declared edits applied, not all`
- `pinned`: `packages/devtools/test/model/LensSession.test.ts: differs from its base text at line 399` (scratch comment line, restored)
- `earlier`: `83-pinned-check.mjs --all-applied: expected exit 0, got exit 1: packages/devtools/test/model/DockModel.characterisation.test.ts: differs from its base text at line 386` (scratch comment line, restored)

The declared edits and refusals were also exercised once against the real tree (adapter edits and eight refusals applied in
the working tree from copies, `pinned` passed at `2 of 2` and `8 of 8`, then restored with `cp`; `git status` clean).

## Commits

- 9a0ab55d: chore(84-02): add the pinned-test check and the earlier-phase re-run

## Deviations from Plan

- The held-file entries drop the unused `flips`/`added` fields and `rangeOf`/`splice`/`unrecorded` (no flips exist here); the
  `edits` apply rule gained one condition over 83's: an edit is reverted only when its `before` is also absent now. Without it
  the two-line import edit (whose `after` is a substring of its `before`) is reverted on the unedited base and doubles the
  line.
- Header comments name `<phase 84 directory>` rather than the literal path, because both verify steps fail a script that
  contains the directory name. The commit was amended once (still local, unpushed) to carry this; it remains one commit.

## Self-Check: PASSED

- FOUND: 84-pinned-check.mjs, 84-earlier-checks.mjs and the three evidence lines.
- FOUND: 9a0ab55d on `arch-wave-15`; both task verify steps run as written and exit 0; the tree outside `.planning/` equals `phase_base`; Phase 83's directory and `.planning/milestones/` unchanged.
