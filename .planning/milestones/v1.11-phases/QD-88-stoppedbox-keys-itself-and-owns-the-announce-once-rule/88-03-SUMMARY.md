---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
plan: 03
subsystem: testing
tags: [devtools, phase-check, pinned-tests, byte-hold, regions, announce-once, stopledger]

phase_base: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
plan_head_before: 0325af8cc24bcac340fda40ca49f6d0dcc7f4cf9
plan_head_after: 1fe6e79f3e1a969a68d8b6ed8c829878e1ea3f6b
commits: 1
status: complete

requires:
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: 88-mutation-base.json (phase_base), the two born files held from 22840399 and fb404767, the 88-check.mjs commit mode and evidence line forms
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-pinned-check.mjs, the file this check is a copy of with its data replaced
provides:
  - 88-pinned-check.mjs, plain, --all-applied and --self-test modes (38 cases), oxlint clean
  - held set computed from phase_base (130 files), three held source files, three born files, five declared files with regions
  - 88-RED-EVIDENCE.md, six `- check failed: pinned ...` lines
affects: [QD-88 plans 04 to 10]

actuals:
  tokens: 7391
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "regions with `kept` entries that are strings (lines containing the text) or patterns (lines matching once trimmed)"
    - "text before the first region held byte for byte, as the text between regions and after the last already was"

key-files:
  created:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-pinned-check.mjs
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-03-SUMMARY.md
  modified:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-RED-EVIDENCE.md

key-decisions:
  - "The judge holds the text before the first region (each declared file opens with held lines), which the ported judge did not."
  - "Two regions with no held text between them (TN14 and TN15) share one stretch of the file for the kept-line count."

patterns-established:
  - "a kept entry may be a pattern, so a region keeps every assertion line without listing each one"

requirements-completed: []

coverage:
  - id: D1
    description: "88-pinned-check.mjs judges held, born and declared-with-regions over the devtools tests, the dock and both barrels"
    verified_by: "node 88-pinned-check.mjs prints `pinned: 130 files hold their base text, 2 of 3 born files held, 0 of 5 declared edits applied`; --self-test prints `self-test: 38 passed`"
  - id: D2
    description: "Every mode and each region rule seen failing once, recorded"
    verified_by: "88-RED-EVIDENCE.md, section 88-03 (held, born, region, held src, kept, all-applied)"
---

# Phase 88 Plan 03: The pinned check Summary

**`88-pinned-check.mjs`, the Phase 87 pinned check with its data replaced: 130 held files computed from `phase_base` (every base test but five, plus `DevtoolsDock.tsx` and both barrels), three born files held against their adding commits, five declared files held outside named regions with their assertion lines kept; plain mode prints `pinned: 130 files hold their base text, 2 of 3 born files held, 0 of 5 declared edits applied` and `--all-applied` fails until every edit and born file lands.**

## Performance

- **Started:** 2026-11-25T23:19Z; **Completed:** 2026-11-25T23:24Z (about 5 minutes)
- **Tasks:** 2 (one tracer, one auto); one task commit (the plan commits the check and its evidence once)
- **Files created:** 2 (the check, this summary); 1 modified (the evidence file); nothing under `packages` or `spec` changed
- Scratch copies lived in `$TMPDIR/qd88`; each scratch edit was restored with `cp` and `git status --porcelain -- packages` is empty.

## Accomplishments

- **Tracer (Task 1):** held set = `git ls-tree -r --name-only phase_base -- packages/devtools/test` (132 paths) less the five declared files, plus the dock and the two barrels, 130 files. Plain mode passes on the tree plan 02 left, `--all-applied` fails naming `StopLedger.test.ts` and the five declared files, oxlint is clean. Every region anchor occurs exactly once at `phase_base`.
- **Declared files:** `helpers.ts` (import, `liveNotice`), `DiagnosticsNotice.test.tsx` (imports and handles, N9, N12), `TimelineNotice.test.tsx` (react import, ledger import, ledger helper, TN14, TN15), `Simulator.broke.test.tsx` (header history, imports and golden note, SB1, SB4) and `surface.tst.ts` (the stop ledger refusals), each with the kept lines the plan names. N9 and N12 keep every `assert.` line by a pattern.
- **Self-test (Task 2):** the 87 cases ported over the new data plus: an edit inside a region passes, an edit one line outside it fails naming the line, a dropped kept `assert.` line (one of two equal ones) fails, a kept pattern with no match at the base fails, a change before the first region fails, two adjacent regions pass or fail on a dropped kept line, a changed held source file fails naming it, and each declared edit is recognised only on text that has it. Born-changed and born-added-twice cases are kept from the port.
- **Seen failing (first stderr line of each real run, from `88-RED-EVIDENCE.md`):**
  - held: `DiagnosticsNotice.test.tsx: differs from its base text after the region N12, at line 225` (one byte in N13)
  - born: `useStopNotice.test.tsx: differs from the commit that added it at line 79`
  - region: `TimelineNotice.test.tsx: differs from its base text between the regions ledger and TN14, at line 261` (one byte in TN13)
  - held src: `DevtoolsDock.tsx: differs from its base text at line 268`
  - kept: `DiagnosticsNotice.test.tsx: the region N9 dropped a kept line: assert.isNull(silent.getAttribute("role"));`
  - all-applied: `helpers.ts: its declared edit is not applied`

## Task Commits

1. Tasks 1 and 2: `1fe6e79f3e1a969a68d8b6ed8c829878e1ea3f6b` `chore(88-03): add the pinned-test check` (`88-pinned-check.mjs` and `88-RED-EVIDENCE.md`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The ported region judge did not hold the text before the first region**
- **Found during:** Task 1, reading the anchors against the five files.
- **Issue:** the 87 judge began every file with a `head` region from the file start, so nothing needed holding before it. Here the first region of `helpers.ts`, `DiagnosticsNotice.test.tsx`, `TimelineNotice.test.tsx`, `Simulator.broke.test.tsx` and `surface.tst.ts` starts at a line, and a change in the lines above it would have passed.
- **Fix:** `judgeRegions` compares the lines before the first region byte for byte (`differs from its base text before the region <name>, at line <n>`), with a self-test case.
- **Files modified:** `88-pinned-check.mjs`.
- **Commit:** 1fe6e79f.

**2. [Rule 1 - Bug] Adjacent regions miscounted kept lines**
- **Found during:** Task 1, plain mode failed on the unchanged tree with `the region TN14 dropped a kept line`.
- **Issue:** TN14 and TN15 touch (no held text between them) and the ported judge gave the first an empty stretch of the file.
- **Fix:** adjacent regions share one stretch of the file for the kept-line count; a kept line may sit in either, because where one ends and the next starts cannot be recovered once an edit touches the line between them. A self-test case covers it.
- **Files modified:** `88-pinned-check.mjs`.
- **Commit:** 1fe6e79f.

### Choices the plan left open (decided autonomously)

- **Kept entries may be patterns.** The plan asks N9 and N12 to keep every `assert.` line at the base; a pattern over the trimmed line states that once instead of listing each line.
- **An extra seen-failing line, `pinned kept`,** was recorded beside the five the plan names, so the kept-line rule is seen failing on a real file and not only in the self-test.
- **The `liveNotice` region** ends at the line starting ` * A thrown value that can be neither stringified`, as the plan states, so the `/**` line above it sits inside the region; that line occurs many times in the file and cannot be an anchor.

### Plan defects

None. Both verifies ran as written and passed.

### Auth gates

None.

## Issues Encountered

- A first scratch edit with BSD `sed` and a `0,/re/` address changed nothing; the edits were redone with `perl` before the evidence lines were taken.

## Next Phase Readiness

- Plans 04 to 10 run `88-pinned-check.mjs` plain on every tree and `--all-applied` at the close, once the born `StopLedger.test.ts` and the five declared edits land. The plan commits no file under `packages`.

## Known Stubs

None.

## Threat Flags

None. T-88-05 is mitigated: the held set is computed from `phase_base`, declared edits are confined to named regions with kept assertion lines, born files are held from their adding commit.

## Self-Check: PASSED

- Files found: 88-pinned-check.mjs, 88-RED-EVIDENCE.md, this summary.
- Commit found as an ancestor of HEAD: 1fe6e79f.
- `node 88-pinned-check.mjs --self-test` prints `self-test: 38 passed`; plain mode prints `pinned: 130 files hold their base text, 2 of 3 born files held, 0 of 5 declared edits applied`; oxlint is clean; nothing is modified under `packages`.
