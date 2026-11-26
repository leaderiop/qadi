---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
plan: 02
subsystem: testing
tags: [devtools, phase-check, shape-judge, records-judge, announce-once, stoppedbox, stopledger]

phase_base: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
plan_head_before: 87428f1adac62b9796148e6f03fb7f71eede5dd4
plan_head_after: bef151c95af45946b1687841a4a6f08d65838267
commits: 1

requires:
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: 88-mutation-base.json (phase_base), the held born files and the 88-RED-EVIDENCE.md line forms from plan 01
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-check.mjs, the file this check is a copy of with its data replaced
provides:
  - 88-check.mjs, twelve modes and a self-test (286 passed), oxlint clean
  - box-keys-itself and ledger-module, the two shape modes, both exit 1 on the base source
  - records and records --close, the judge of the pinned-by lists and of every reserved record
  - 88-RED-EVIDENCE.md, one `- check failed:` line per mode
affects: [QD-88 plans 03 to 10]

actuals:
  tokens: 27014
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "an opening-tag reader that keeps only an element's own attributes (brackets blanked), so a key inside an attribute expression is not the element's key"
    - "a never-staged path list checked in the commit mode over both the found commit and the asked list"

key-files:
  created:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-check.mjs
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-02-SUMMARY.md
  modified:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-RED-EVIDENCE.md

key-decisions:
  - "The shape modes accept a layout effect keyed on any list ending `record, status` (`[announced.record, status]` is the form the plan states; a destructured `record` is read the same), and refuse `[announced, status]`."
  - "records reads BEH-QD-509, 759 and 775 as kept behaviors that must keep their heading and a pinned-by paragraph, and BEH-QD-776 to 780 only once they exist."

patterns-established:
  - "a revision one step above its base is the next minor number (1.413 to 1.414, 1.4 to 1.5), read from each document's control table and the base text, never written by the check"

requirements-completed: []

coverage:
  - id: D1
    description: "88-check.mjs holds the twelve modes, each a pure judge plus a thin reader, driven both ways by --self-test"
    verified_by: node 88-check.mjs --self-test (286 passed) and the Task 1 and Task 2 verifies
  - id: D2
    description: "box-keys-itself and ledger-module state the shape the change must reach and exit 1 on the base source"
    verified_by: the Task 2 verify, and the two evidence lines naming the first rule broken
  - id: D3
    description: "Every mode seen failing once, recorded, the check committed once with exactly its two paths, trailers clean"
    verified_by: the Task 3 verify and 88-RED-EVIDENCE.md
---

# Phase 88 Plan 02: The phase check Summary

**`88-check.mjs`, the Phase 87 check ported with its data replaced: twelve modes (base, commit, unchanged, seen-failing, vitest, suite, scan-ids, scan-forbidden, trailers, box-keys-itself, ledger-module, records) and a 286-case self-test, where both shape modes exit 1 on the base source and `records --close` exits 1 until plans 05 to 10 write the records.**

## Performance

- **Started:** 2026-11-25, about 23:06Z; **Completed:** 2026-11-25T23:20Z (roughly 14 minutes)
- **Tasks:** 3 (one tracer, two auto); the plan commits the check and its evidence once, after Task 3, so there is one task commit
- **Files created:** 2 (the check, this summary); 1 modified (the evidence file); nothing under `packages` or `spec` changed
- Scratch files lived in `$TMPDIR/qd88` (a copy of the check and a planted base record, planted vitest reports, copies of the hook test and of the screens behavior document, the evidence lines before they were appended); each scratch edit was restored with `cp` and `git status --porcelain -- packages spec` is empty.

## Accomplishments

- **Tracer (Task 1):** `base` prints the `phase_base` of the committed record after checking that `947bb0a3` and `phase_base` are ancestors of HEAD and that nothing outside `.planning/` differs between them. Then `commit` (with the never-staged refusal over the found commit and the asked list, each of the ten forms), `unchanged`, `seen-failing`, `vitest`, `suite`, `scan-ids`, `scan-forbidden` and `trailers` were ported and the Task 1 verify passed before the shape modes began. `scan-ids` and `scan-forbidden` exit 0 and `trailers` judges the five commits since `phase_base`, `87428f1a` and `73510900` included, each with the one trailer.
- **Shape modes (Task 2):** `box-keys-itself` reads the four stop-path files with comments and strings blanked: no `useRef` and no `.current` anywhere; no `key=` on a `<StoppedBox` (read from the element's own attributes only), no `Binding`, no `stoppedKey` in a notice; the box exports `StoppedBox`, renders exactly one keyed element keyed by `stoppedKey(` on a ledger then a status, that element a module-private const, decides the alert through one `announcesStop(` in a `useState` initializer and records in a `useLayoutEffect` that calls `record(` and is keyed on `[announced.record, status]`; the hook holds `useReducer` over `recordStop` and `noStops` and a `useMemo` keyed on `status`, `onRestart`, `ledger` and `record`. `ledger-module` requires the module to exist, import nothing, hold no JSX and no `use client`, export exactly `StopLedger`, `noStops`, `stoppedKey`, `announcesStop` and `recordStop`, be imported in `packages/*/src` by exactly the box and the hook and be named by neither barrel, and no touched file to hold a module-scope `let` or `var`.
- **Records judge (Task 2):** `records` reads the pinned-by paragraphs of BEH-QD-509, 759 and 775 (each must keep its heading) and of 776 to 780 once they have one; `--close` needs the five behaviors with their section 1 rows, both invariants with section 2 rows and `**Source**` lines, BEH-QD-759 free of `useRef` and naming ADR-QD-201 and the three born test files, BEH-QD-509's two anchors, ADR-QD-201 with its audit table (each of N9, N12, TN14, TN15, SB1 and SB4 naming an id that opens an existing devtools test title), `Tests removed: 0.`, the cost line, the section 13 line and both alternatives, the index entries, the ADR-QD-197 status and text, the section 3 row, the rows naming the module and the three test files, the CCR-QD-480 row, each amended document one revision above its `phase_base` text, ADR-QD-201 at 1.0 and exactly one changeset holding the D-04 sentence.
- **Evidence (Task 3):** one `- check failed:` line per mode under `## 88-02 the phase check`, each from a real run, and the check was committed once with exactly its two paths.

## Task Commits

1. Tasks 1 to 3: `bef151c95af45946b1687841a4a6f08d65838267` `chore(88-02): add the phase check` (`88-check.mjs` and `88-RED-EVIDENCE.md`)

## Seen failing (the first stderr line of each mode, from `88-RED-EVIDENCE.md`)

- `base`: phase_base is not an ancestor of HEAD (a planted record, the check copied into the scratch directory)
- `commit`: 0 commits since phase_base have the subject: chore(88-02): no commit has this subject
- `unchanged`: packages/devtools/test/react/useStopNotice.test.tsx differs from phase_base
- `seen-failing`: no failure line in the evidence for: a title with no failure line
- `vitest`: the report names no test file (a path that does not exist)
- `suite`: planted row fails and is not red before
- `scan-ids`: useStopNotice.test.tsx:145 names a requirement id (a planted `SBOX-01` line, restored with `cp`)
- `scan-forbidden`: useStopNotice.test.tsx:145 uses an as cast (a planted cast, restored with `cp`)
- `trailers`: the message has 0 Co-Authored-By lines, not one (`--message` over a planted text)
- `box-keys-itself`: StoppedBox.tsx reads .current: no render reads a ref (the base source as it is)
- `ledger-module`: StopLedger.ts is missing (the base source as it is)
- `records`: BEH-QD-759 names packages/devtools/test/react/NoSuchFile.test.tsx, which does not exist (the behavior document edited and restored with `cp`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The id and wording scan reads the owner's unrelated edits**
- **Found during:** Task 1.
- **Issue:** `scan-ids` and `scan-forbidden` read every added line against `phase_base` outside `.planning/`, and the working tree holds the root `README.md` (369 lines added) and an untracked `assets/` directory, both on the never-stage list. A phrase in either would fail every later plan's verify for a change this phase did not make.
- **Fix:** the tree reader's pathspec also leaves out `:!assets` and `:!README.md` (beside `.planning`, `.agents` and `.codex`), with a comment saying why; the `commit` mode refuses staging either, so the phase cannot change them unseen. Neither held a finding when this was decided.
- **Files modified:** `88-check.mjs`.
- **Commit:** bef151c9.

**2. [Rule 1 - Bug] The first stderr line of a refused git call was git's own text**
- **Found during:** Task 3, the `base` evidence line read `fatal: bad object ...` instead of the check's reason.
- **Issue:** the `git` helper inherited stderr, so a failing `git diff` or `git merge-base` printed git's line before the check's own reasons.
- **Fix:** the helper pipes stderr (`stdio: ["ignore", "pipe", "pipe"]`), which also closes stdin for every git call; a failing call still throws and the judges still print their own reasons.
- **Files modified:** `88-check.mjs`.
- **Commit:** bef151c9.

### Choices the plan left open (decided autonomously)

- **A revision "0.001 above" its base** is implemented as the next minor number (1.413 to 1.414, 1.4 to 1.5): the plan's own D-19 takes ADR-QD-197 from 1.4 to 1.5, which is 0.1 and not 0.001, and `spec-revise` steps the minor number.
- **`suite` does not fail when the evidence lists nothing red before**, as the 87 judge did, because the base rows of this phase are green; with an empty allowed set any failing row or file fails the suite. A file listed by path may fail to load, a row listed by exact title may fail, both under `- red before: `.
- **`vitest` removes a report left by an earlier run before it starts**, so a stale report cannot stand for a run that wrote none; the plan asks only that a missing report fail.
- **The born files `suite` requires to have run** are the three the plan names (`model/StopLedger.test.ts`, `react/DockFrame.announce.characterisation.test.tsx`, `react/useStopNotice.test.tsx`), each only when it exists in the tree, since the pinned check that would declare them is a later plan's file.
- **The layout-effect key** is read as any list ending `record, status` (so `[record, status]` passes too), not the literal `[announced.record, status]` text.

### Plan defects

None. Every verify ran as written and passed.

### Auth gates

None.

## Issues Encountered

- None blocking. `oxlint` first reported two `prefer-string-starts-ends-with` warnings (the changeset frontmatter test and the ADR-QD-197 file lookup); both were rewritten to `startsWith` and the check is clean.
- The check's `--self-test` drives every judge both ways (286 cases): the shared modes over the 87 cases with the 88 data, the never-staged refusal in each of its ten forms three ways, the suite judge with the born and partial rules, the vitest report judge, the opening-tag and export readers, one passing text and one failing text per box and ledger rule, and one failing close case per records rule.

## Next Phase Readiness

- Plans 03 to 10 run `88-check.mjs` for every claim: `box-keys-itself` and `ledger-module` turn green only when plans 05 and 06 land, `records --close` only when the records are written, `suite` reads `- red before:` lines that plan 03 and later write.
- No path under `packages`, `spec` or `stryker.devtools.mjs` was touched.

## Known Stubs

None.

## Threat Flags

None. T-88-03 is mitigated by the self-test (every judge driven both ways) and by the twelve real failing runs; T-88-04 by `trailers`, which judges every commit since `phase_base`, the workflow's metadata commits included.

## Self-Check: PASSED

- Files found: 88-check.mjs, 88-RED-EVIDENCE.md, this summary.
- Commit found as an ancestor of HEAD: bef151c9.
- `node 88-check.mjs --self-test` prints `self-test: 286 passed`; oxlint is clean; `commit`, `trailers`, `scan-ids` and `scan-forbidden` pass on the tree; nothing is modified under `packages` or `spec`; no `.vitest/` remains.
