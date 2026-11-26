---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 03
subsystem: testing
tags: [audit, pinned-check, held-tests, declared-regions, born-files, admission-step]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
check_commit: 93ef45c9f49880d96dc222713b864b03e890600a
plan_head_before: a9491d7f
plan_head_after: 93ef45c9f49880d96dc222713b864b03e890600a

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: the two born test files and the 89-check.mjs commit checker and RED evidence line forms (plans 01 and 02)
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: 88-pinned-check.mjs, the file ported (held set from the base, regions, born set, self-test)
provides:
  - 89-pinned-check.mjs, the held, declared and born judge for the audit tests and the step's neighbours, 54 self-test cases, oxlint clean
  - the region kinds becomes, insert, kept, with lead and lines, and the fixed describe insertion for plan 08
  - 89-RED-EVIDENCE.md, six `- check failed: pinned-...` lines under `## 89-03 the pinned-test check`
affects: [QD-89 plans 04 to 11]

actuals:
  tokens: 10000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a held set computed from git ls-tree at the base, so a test the base holds cannot be left out by listing"
    - "a region either as its base text or as its fixed edited form, so the plain run passes before any edit and fails on a half edit"

key-files:
  created:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-pinned-check.mjs
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-03-SUMMARY.md
  modified:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-RED-EVIDENCE.md

key-decisions:
  - "A becomes region is valid as its base text or exactly its fixed lines, an insert region as empty or its fixed form, so the check passes on the base tree (0 of 3 applied) and on the finished tree (3 of 3) and refuses every state between."
  - "The characterisation, declared and born, is read from its adding commit with its three regions; the byte comparison of a born file is skipped for it only when both texts exist."

patterns-established:
  - "a title reader that takes each it or test row's first argument as a string literal, so an inserted describe holds exactly its fixed titles"

requirements-completed: []

coverage:
  - id: D1
    description: "89-pinned-check.mjs holds 47 files at their base text, 2 of 5 born files, 0 of 3 declared edits on the base tree, and fails --all-applied"
    verified_by: the Task 1 and Task 2 verifies, node 89-pinned-check.mjs --self-test (54 passed), oxlint clean
  - id: D2
    description: "The seven ForeignRows.test.ts regions, the Retention.test.ts row and the three characterisation regions accept exactly their declared edits (a scratch copy with every edit made printed 3 of 3 applied, then was restored)"
    verified_by: the scratch run recorded in this summary, the self-test twins and variants for each region form
  - id: D3
    description: "The check seen failing on a held file, a held extra, a born file, a region, a held text between regions and --all-applied"
    verified_by: 89-RED-EVIDENCE.md under 89-03 and the Task 3 verify
---

# Phase 89 Plan 03: Port the pinned-test check to the audit package Summary

**`89-pinned-check.mjs`: every audit test the base lists (less the two declared files) and five neighbours held byte for byte, three declared files that change only in their fixed regions (becomes, insert, kept; lead and lines ends), five born files held against their adding commits, seen failing on six kinds.**

## Performance

- **Completed:** 2026-11-26T03:01Z (start time not captured); **Tasks:** 3 (one tracer, two auto)
- **Files created:** 2 (the check and this summary), **modified:** 1 (the evidence file); nothing under `packages`, `spec`, `stryker.audit.mjs` changed (`git status --porcelain -- packages stryker.audit.mjs` is empty).
- Scratch files lived in `$TMPDIR/qd89` (verify scripts, the backups of `ForeignRows.test.ts`, `Retention.test.ts`, the characterisation, `helpers.ts`, `CodecMade.ts`, `BatchReadOnce.test.ts`, the edit scripts); each backup was restored with `cp`.

## Accomplishments

- **Tracer (Task 1):** the 88 script ported over `packages/audit/test`: the held set from `git ls-tree -r --name-only <phase_base> -- packages/audit/test`, the five extras (`CodecMade.ts`, `SequenceIntegrity.ts`, `index.ts`, `package.json`, `stryker.audit.mjs`), the five born files against their one adding commit, `git diff -M --name-status` for moves and deletions, `--all-applied`, `--self-test`. Verified green before any region was added: self-test, oxlint, and the plain run on the live tree with `2 of 5 born files held`.
- **Regions (Task 2):** `judgeRegions` gained `becomes`, `insert` (`after` or `before`, fixed `lines`, or the `describe` form with its opening line, its four string-literal titles and its closing `});` plus one blank line), `lead: n` and `lines: n`. The seven `ForeignRows.test.ts` regions, the one `Retention.test.ts` region (`lead: 1, lines: 3`) and the three characterisation regions are exactly those of the plan. The plain run prints `pinned: 47 files hold their base text, 2 of 5 born files held, 0 of 3 declared edits applied`; `--all-applied` fails on the three declared edits and the three missing born files. The self-test has 54 cases: a passing twin and a failing variant for each region form, anchors that occur zero or many times, a reversed and an overlapping pair, a held change before, between and after regions.
- **Passing twin on the real files:** on scratch copies of the three declared files, with the four `ForeignRows.test.ts` rows removed, both imports and the four-row `describe` inserted, the `Retention.test.ts` row and its blank line removed, the characterisation import added and a body line of an SF row and an F row edited, the plain run printed `pinned: 47 files hold their base text, 2 of 5 born files held, 3 of 3 declared edits applied`. The three files were restored with `cp`; the plain run is back at `0 of 3`.
- **Evidence and commit (Task 3):** six `- check failed: pinned-<kind>:` lines from real runs, each scratch edit restored and `git status --porcelain -- packages stryker.audit.mjs` empty after each. Committed as `chore(89-03): add the pinned-test check` (93ef45c9) holding exactly the script and the evidence file with the one trailer.

## Task Commits

1. Tasks 1 to 3 (one commit, as the plan fixes): `93ef45c9f49880d96dc222713b864b03e890600a` `chore(89-03): add the pinned-test check`

## Seen failing (the six evidence lines)

`pinned-held` (one character appended to `helpers.ts`: `differs from its base text at line 123`), `pinned-extra` (a blank line appended to `CodecMade.ts`), `pinned-born` (a comment line appended to `BatchReadOnce.test.ts`: `differs from the commit that added it`), `pinned-region` (the line after `planRetention reads now and maxAgeMs before the rows` deleted: `region planOrder is not the lines it becomes`), `pinned-between` (the title at `ForeignRows.test.ts:115` changed: `the text between regions differs from its base text at line 115 of the base ... (between nowBeforeRows and planOrder)`), `pinned-all-applied` (`its declared edit is not applied`).

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan notes (choices the plan left open, taken as the most complete and clean)

- **A `becomes` region reads as its base text or its fixed lines.** The plan states "the current region text must be exactly these lines", yet also requires the plain run to pass on the base tree with `0 of 3 declared edits applied`. Both hold if the region is valid in either state and counts as applied only in the edited one; any other text (a removal with one line left) fails with `region <name> is not the lines it becomes`. An `insert` region is empty or its fixed form; a `kept` region is applied when it differs from its base text.
- **Reason forms.** The plan's forms are used, with the region names added in parentheses to the before, between and after reasons (`... at line <n> (between nowBeforeRows and planOrder)`); a missing first held line reads `at line <n> of the base, "<text>" is missing or changed`. Two reasons the plan does not list were added: `insert <name> does not end with its closing line and one blank line` (the plan's closing-form rule) and `region <name> covers <n> line(s) before its anchor, and they are not blank at the base` (the `lead` rule).
- **Born and declared at once.** For the characterisation the byte comparison of its adding commit is replaced by its three regions once both texts exist; without an adding commit or without the file the born judge decides as for the other born files.
- **Verifies ran from script files.** Each `<automated>` block was run as the same text in a scratch script (`bash <file>`); none contains `rm`; the scratch restores were plain `cp`.
- **Trailer.** The commit carries `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, the value the phase fixes.

### Auth gates

None.

## Issues Encountered

None. The audit suite is still red by design (twelve `BatchReadOnce.test.ts` rows) until plans 06 and 07 land.

## Next Phase Readiness

- Plans 05 to 08 can run `node 89-pinned-check.mjs` after each commit: the characterisation's `import`, `spanFlips` and `direct` regions, the `ForeignRows.test.ts` rows and the `Retention.test.ts` row change only as declared; plan 08's `describe` must open with `describe("each function that takes a batch refuses what the admission step refuses", () => {`, hold exactly the four fixed titles, and end with `});` and one blank line.
- `HostBatch.test.ts` (plan 05), `HostBatch.tst.ts` (plan 07) and `hostBatchFaults.ts` (plan 08) are held against their one adding commit as soon as it exists; `--all-applied` fails until all of them and the three declared edits are in.

## Known Stubs

None.

## Threat Flags

None. T-89-08 (held byte for byte from the base-computed set, the leaf, the barrel and the manifest held), T-89-09 (each region has a fixed end form and the text around it is held) and T-89-10 (born files held against their one adding commit) are mitigated, each with a recorded failure.

## Self-Check: PASSED

- Files found: 89-pinned-check.mjs, 89-RED-EVIDENCE.md, this summary.
- Commit found as an ancestor of HEAD: 93ef45c9, ending with exactly one `Co-Authored-By: Claude Opus 5.5` trailer; `git rev-list --count a9491d7f..HEAD` is 1 before the metadata commit.
- `node 89-pinned-check.mjs --self-test` prints `self-test: 54 passed`; oxlint is clean; the plain run prints `pinned: 47 files hold their base text, 2 of 5 born files held, 0 of 3 declared edits applied`; `--all-applied` exits 1; `git status --porcelain -- packages stryker.audit.mjs` prints nothing; no `.vitest/` remains.
