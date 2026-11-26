---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 04
subsystem: testing
tags: [audit, earlier-phases, scratch-copies, ledger, admission-step]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
check_commit: d870dcdfc59c4c15def49009a487ae1d15a94ef7
plan_head_before: 619eee80c5fb6046687d810f673e380625506e80
plan_head_after: d870dcdfc59c4c15def49009a487ae1d15a94ef7
commits: 1
status: complete

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: 89-mutation-base.json (phase_base), 89-check.mjs `commit`, the evidence file and its line forms (plans 01 and 02)
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: 88-earlier-checks.mjs (the file ported), 88-check.mjs, 88-pinned-check.mjs, 88-mutation.mjs and their records
provides:
  - 89-earlier-checks.mjs, plain and --self-test modes (47 cases), oxlint clean
  - a 59-row ledger (46 rows of 88's, re-measured, and 13 for Phase 88) measured while packages/*/src equals phase_base
  - EXPLAINING, the four lines 88's closing-records check prints once this phase writes its changeset and spec revisions, each with the one 89 commit subject that explains it
  - 89-RED-EVIDENCE.md, three `- check failed: earlier-...` lines under `## 89-04 the earlier-phase checks`
affects: [QD-89 plans 05 to 11]

actuals:
  tokens: 11000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "what is run (RUNS) and what each run must print (LEDGER) are two tables joined by the label, so a run with no row and a row with no run are findings of their own"
    - "the one row a later commit moves is computed from a table of explaining commit subjects, written before the commits exist"

key-files:
  created:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-earlier-checks.mjs
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-04-SUMMARY.md
  modified:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-RED-EVIDENCE.md

key-decisions:
  - "87-pinned-check.mjs is a fixed reasons row, not a computed one: the five test files it reports were edited by Phase 88 commits that precede this phase's base."
  - "The repository root is the working directory, refused unless it holds .planning/phases, and this phase's own directory is found by its QD-89- prefix, so a copy of the script run from the root behaves the same."

patterns-established:
  - "the earlier-checks script finds each earlier phase by name prefix and runs it only from a copy under $TMPDIR/qd89"

requirements-completed: []

coverage:
  - id: D1
    description: "89-earlier-checks.mjs re-runs Phases 85 to 88's checks from scratch copies and matches a measured, non-empty ledger"
    verified_by: "node 89-earlier-checks.mjs exits 0 with 59 `<check>: exit <n>: <line>` lines; `--self-test` prints `self-test: 47 passed`; oxlint clean"
  - id: D2
    description: "88's closing-records row is computed from the four fixed 89 commit subjects and expects the clean line today"
    verified_by: "the Task 2 verify; the self-test cases for no subject, the changeset subject, the first records subject, all three subjects, a line whose subject is absent and a subject whose line is missing"
  - id: D3
    description: "The ledger seen failing on a changed fixed line, an unexpected run and a computed row whose explaining commit exists without its line"
    verified_by: "89-RED-EVIDENCE.md, section 89-04, and the Task 3 verify"
---

# Phase 89 Plan 04: The earlier-phase checks Summary

**`89-earlier-checks.mjs`, Phase 88's earlier-checks script ported to Phases 85 to 88: every check is copied to `$TMPDIR/qd89/p85` to `p88`, run from the copy in the repository root and compared with a 59-row ledger measured while `packages/*/src` equals `phase_base`; the 85 and 86 `scan-ids` rows and 87's pinned check are whole reason sets, the trailers rows are patterns, and 88's `records --close` is computed from the four 89 commit subjects that will move it.**

## Performance

- **Completed:** 2026-11-26T03:12Z (start time not captured); **Tasks:** 3 (one tracer, two auto); one task commit (the plan commits the script and its evidence once)
- **Files created:** 2 (the script, this summary); 1 modified (the evidence file); nothing under `packages`, `spec` or any earlier phase directory changed
- Scratch files lived in `$TMPDIR/qd89` (`p85` to `p88`, the three failing copies in `p4`, verify scripts and run outputs in the session scratchpad); no scratch edit touched the tree.

## Accomplishments

- **Tracer (Task 1):** the 88 script ported with `OUT` at `qd89`, the root taken from the working directory (refused when it holds no `.planning/phases`), `87-pinned-check.mjs` turned into a fixed reasons row, and the 85, 86 and 87 rows re-measured on the base-equal tree (`git diff --quiet 8ee14f6f -- packages/audit/src packages/devtools/src packages/core/src` was clean). Every one of the 46 rows printed exactly the line 88's ledger recorded; only the two growing counts moved (87's trailers, matched by pattern). The self-test, oxlint and the run all pass, and no earlier directory is written.
- **88 rows and the computed row (Task 2):** `P88_COPIED` is the four scripts plus `88-RED-EVIDENCE.md`, `88-mutation-base.json` and `88-mutation-close.json` (the first run showed no other file missing). The 88 rows were each measured once. `EXPLAINING` holds the four lines of 88's close this phase will cause, each with its subject, and `closeExpectation` turns the subjects of the commits since `phase_base` into exit 0 with the clean line, or exit 1 with exactly the lines whose subject exists. The `Revision` of `spec/README.md`, `spec/traceability.md` and `spec/invariants.md` at `phase_base` is 1.414, 1.333 and 1.233 (`git show`), as the plan states.
- **Seen failing and commit (Task 3):** three `- check failed: earlier-...` lines from real runs of copies in `<S>/p4`, committed with the script as `chore(89-04): add the earlier-phase checks` (d870dcdf), exactly those two paths and the one trailer.

## The measured ledger (rows as printed on the tree where `packages/*/src` equals `phase_base`)

```
85-check.mjs base: exit 0: 2741584f50d176281038b478d0350dc35f174cc2
85-check.mjs scan-ids: exit 1: (reason set: the five PHASE_RELATIVE lines below)
85-check.mjs scan-forbidden: exit 0: scan-forbidden: no forbidden form in added lines
85-check.mjs trailers: exit 0: trailers: 33 plan commits, each with the one trailer
85-check.mjs no-react-in-model: exit 0: no-react-in-model: the hydration view is pure, and no model file imports React
85-check.mjs three-predicates: exit 0: three-predicates: the questions guard, the one shared reader and the hydration key stay distinct
85-check.mjs panel-decides-nothing: exit 0: panel-decides-nothing: the panel renders the hydration view and decides nothing
85-check.mjs frame-reads-status: exit 0: frame-reads-status: the dock frame reads the poll's status alone
85-check.mjs records: exit 0: records: the pinned-by lists name tests that exist
85-check.mjs records --close: exit 0: records: the pinned-by lists name tests that exist, and every reserved record is written
85-pinned-check.mjs: exit 0: pinned: 18 files hold their base text, 1 of 1 born files held, 1 of 1 declared edits applied
86-check.mjs base: exit 0: 41c53c65c3ceb60f974650dd374f391c81db56e7
86-check.mjs scan-ids: exit 1: (the same five-line reason set)
86-check.mjs scan-forbidden: exit 0: scan-forbidden: no forbidden form in added lines
86-check.mjs trailers: exit 0: trailers: 22 plan commits, each with the one trailer
86-check.mjs owner-shape: exit 0: owner-shape: the registry's lifetime is kept by one React-free module
86-check.mjs provider-forwards-only: exit 0: provider-forwards-only: the provider builds the owner once and only forwards to it
86-check.mjs records: exit 0: records: the pinned-by lists name tests that exist
86-check.mjs records --close: exit 0: records: the pinned-by lists name tests that exist, and every reserved record is written
86-pinned-check.mjs: exit 0: pinned: 59 files hold their base text, 1 of 1 born files held
85-check.mjs --self-test: exit 0: self-test: 245 passed
85-pinned-check.mjs --self-test: exit 0: self-test: 37 passed
85-mutation.mjs --self-test: exit 0: self-test: 57 passed
85-earlier-checks.mjs --self-test: exit 0: self-test: 17 passed
86-check.mjs --self-test: exit 0: self-test: 262 passed
86-pinned-check.mjs --self-test: exit 0: self-test: 18 passed
86-mutation.mjs --self-test: exit 0: self-test: 64 passed
86-earlier-checks.mjs --self-test: exit 0: self-test: 21 passed
87-check.mjs base: exit 0: 56b9ae4d98ebd1f950369c9830d4a310727895ac
87-check.mjs scan-ids: exit 0: scan-ids: no id or phase wording in added lines
87-check.mjs scan-forbidden: exit 0: scan-forbidden: no forbidden form in added lines
87-check.mjs trailers: exit 0: trailers: <N> commits since phase_base, each with the one trailer   (pattern; 114 at measurement)
87-check.mjs stated-run-shape: exit 0: stated-run-shape: StatedRun.ts is the one run that states its stop
87-check.mjs prologue-shape: exit 0: prologue-shape: ConfigurePrologue.ts is the one configure prologue
87-check.mjs feeds-supply-only-engine: exit 0: feeds-supply-only-engine: timeline, diagnostics, gates supply only their engine
87-check.mjs session-stop: exit 0: session-stop: the session starts its runs through the stated run
87-check.mjs simulator-pre: exit 0: simulator-pre: the broken-run box is a labelled preformatted block
87-check.mjs onfailure-gone: exit 0: onfailure-gone: no failure hook remains
87-check.mjs built-feeds-once: exit 0: built-feeds-once: test/builtFeeds.ts builds and configures through one helper
87-check.mjs records: exit 0: records: the pinned-by lists name tests that exist
87-check.mjs records --close: exit 0: records: the pinned-by lists name tests that exist, and every reserved record is written
87-pinned-check.mjs: exit 1: (reason set: the five lines below)
87-check.mjs --self-test: exit 0: self-test: 301 passed
87-pinned-check.mjs --self-test: exit 0: self-test: 35 passed
87-mutation.mjs --self-test: exit 0: self-test: 103 passed
87-earlier-checks.mjs --self-test: exit 0: self-test: 21 passed
88-check.mjs base: exit 0: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
88-check.mjs scan-ids: exit 0: scan-ids: no id or phase wording in added lines
88-check.mjs scan-forbidden: exit 0: scan-forbidden: no forbidden form in added lines
88-check.mjs trailers: exit 0: trailers: <N> commits since phase_base, each with the one trailer   (pattern; 62 at measurement)
88-check.mjs box-keys-itself: exit 0: box-keys-itself: the stopped box keys itself, decides its alert at mount and records at commit; the notices hand it the notice whole
88-check.mjs ledger-module: exit 0: ledger-module: the stop ledger is one React-free module holding stop and count, imported in src only by the box and the hook
88-check.mjs records: exit 0: records: the pinned-by lists name tests that exist
88-check.mjs records --close: exit 0: records: the pinned-by lists name tests that exist, and every reserved record is written   (computed row: the clean answer)
88-pinned-check.mjs: exit 0: pinned: 130 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied
88-check.mjs --self-test: exit 0: self-test: 302 passed
88-pinned-check.mjs --self-test: exit 0: self-test: 38 passed
88-mutation.mjs --self-test: exit 0: self-test: 68 passed
88-earlier-checks.mjs --self-test: exit 0: self-test: 46 passed
```

The five-line reason set of `85-check.mjs scan-ids` and `86-check.mjs scan-ids` (identical to 88's ledger): `DiagnosticsFeed.stop.test.ts:35`, `StatedRun.characterisation.test.ts:45`, `:54`, `:63` and `TimelineFeed.stop.test.ts:29`, each `has phase-relative wording` on a comment saying a feed `publishes from now on`. They are Phase 87's born tests, held byte for byte; the rule and the lines are left alone, and this is the finding the rows record.

The five-line reason set of `87-pinned-check.mjs` (each line names a file Phase 88's ledger explains): `packages/devtools/test/helpers.ts: differs from its base text at line 14`, `.../react/DiagnosticsNotice.test.tsx: ... at line 12`, `.../react/TimelineNotice.test.tsx: ... at line 14`, `.../surface.tst.ts: ... at line 312`, and `.../react/Simulator.broke.test.tsx: differs from the commit that added it at line 9`.

The computed row's four lines, each with the one 89 commit that causes it (the row expects the clean line while none of the subjects exists, and today none does): `2 changesets are added since phase_base, not one` (`chore(89-09): add the patch changeset`); `spec/README.md is at Revision 1.415, not 1.414` and `spec/traceability.md is at Revision 1.334, not 1.333` (`docs(89-10): record the admission step decision`); `spec/invariants.md is at Revision 1.234, not 1.233` (`docs(89-10): state the admission rules in the behaviors and invariants`).

## Seen failing (the three evidence lines)

`earlier-fixed` (the `85-check.mjs scan-forbidden` row's line shortened by one letter: `expected the line "...added line", got "...added lines"`), `earlier-unexpected` (that row deleted from `LEDGER`: `unexpected run: 85-check.mjs scan-forbidden`), `earlier-computed` (the changeset subject replaced by `chore(89-02): add the phase check`, which exists, so the row expects the changeset line 88 does not print: `88-check.mjs records --close: expected exit 1, got exit 0: records: the pinned-by lists name tests that exist, and every reserved record is written`).

## Task Commits

1. Tasks 1 to 3 (one commit, as the plan fixes): `d870dcdfc59c4c15def49009a487ae1d15a94ef7` `chore(89-04): add the earlier-phase checks` (`89-earlier-checks.mjs` and `89-RED-EVIDENCE.md`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The ported ledger could not produce an unexpected run**
- **Found during:** Task 3, running the `earlier-unexpected` copy (the row deleted).
- **Issue:** in 88's script the runs were enumerated from the ledger rows, so deleting a row removed its run too: the copy exited 0, and `judgeLedger`'s `unexpected run` and `missing run` branches could only be reached by a hand-built input in the self-test, never by the script itself. The plan's third failing kind ("that row deleted, so its run is unexpected") named a failure the ported design cannot have.
- **Fix:** the table is split in two, joined by the label: `RUNS` (the label, the copy, the script and its arguments, in print order) and `LEDGER` (what each run must print). The script runs `RUNS` and judges the runs against `LEDGER`, so a row deleted leaves its run unexpected and a run deleted leaves its row with no run. The self-test gained a case that the two tables carry the same labels in the same order, and the ledger count and 46 plus 13 split read from them.
- **Files modified:** `89-earlier-checks.mjs` (before its commit). **Commit:** d870dcdf.

### Plan notes (choices the plan left open, taken as the most complete and clean)

- **The 88 trailers row is a pattern** (the plan lists it so); the count printed at measurement was 62, 87's was 114.
- **`P88_COPIED`** holds the four scripts, `88-RED-EVIDENCE.md`, `88-mutation-base.json` and `88-mutation-close.json`; `88-04-SUMMARY.md` and the other 88 documents are not read by any of the four scripts, so they are not copied.
- **The root and the base.** `run()` reads the base from this phase's own `89-mutation-base.json` and the subjects with `git log --format=%s <phase_base>..HEAD`; the root is `realpathSync(process.cwd())` and `judgeRoot` refuses one with no `.planning/phases`.
- **Verifies ran from script files** (`bash <file>`), each the same text as the plan's `<automated>` block; none contains `rm`. The Task 3 verify runs the plan's text after the commit.
- **Trailer.** The commit carries `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, the value the phase fixes.

### Auth gates

None.

## Issues Encountered

None. The audit suite is still red by design (twelve `BatchReadOnce.test.ts` rows) until plans 06 and 07 land; no earlier phase's output moved.

## Next Phase Readiness

- Plans 05 to 11 run `89-earlier-checks.mjs` from the repository root. A line a plan adds that an older rule refuses shows up as a named reason. After `chore(89-09): add the patch changeset` the 88 closing row switches to exit 1 with the changeset line, and after the two `docs(89-10)` commits it prints all four lines; both are expected and the script passes only with them.
- **Risk for plan 10:** if the three spec documents or the changeset are written under another subject than the three in `EXPLAINING`, or at another revision, the row fails with a named mismatch; the subjects and revisions are fixed in this file, so a plan that must differ edits both together as a reviewed change.
- The 85 and 86 `scan-ids` rows and 87's pinned row compare whole sets: a plan 05 to 08 test line that reads as phase-relative wording to an older rule adds a sixth reason and fails here.

## Known Stubs

None.

## Threat Flags

None. T-89-11 is mitigated: the scripts run from scratch copies and `git diff --quiet HEAD` over the Phase 85 to 88 directories and `.planning/milestones` is clean. T-89-12 is mitigated: each row was measured on the base-equal tree and the one moving row is computed from fixed commit subjects.

## Self-Check: PASSED

- Files found: 89-earlier-checks.mjs, 89-RED-EVIDENCE.md, this summary.
- Commit found as an ancestor of HEAD: d870dcdf, ending with exactly one `Co-Authored-By: Claude Opus 5.5` trailer; `git rev-list --count 619eee80..HEAD` is 1 before the metadata commit.
- `node 89-earlier-checks.mjs --self-test` prints `self-test: 47 passed`; oxlint is clean; the plain run exits 0 with 59 rows; the Task 1, Task 2 and Task 3 verifies re-ran green; `git status --porcelain -- packages` prints nothing; no `.vitest/` remains.
