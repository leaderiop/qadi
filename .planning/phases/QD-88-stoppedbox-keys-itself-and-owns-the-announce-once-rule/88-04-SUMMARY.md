---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
plan: 04
subsystem: testing
tags: [devtools, phase-check, earlier-phases, scratch-copies, ledger, stopledger]

phase_base: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
plan_head_before: bb34a8755ff8c100e7fdac9f508b338af85d79da
plan_head_after: 371da10c222e583d0799d235db96a424c8bc4b23
commits: 1
status: complete

requires:
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: 88-mutation-base.json (phase_base), 88-check.mjs `unchanged`, the evidence file and its line forms
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: 87-earlier-checks.mjs (the file ported), 87-check.mjs, 87-pinned-check.mjs, 87-mutation.mjs
provides:
  - 88-earlier-checks.mjs, plain and --self-test modes (46 cases), oxlint clean
  - a 46-row ledger (28 rows of 87's unchanged, 18 for Phase 87) measured while packages/*/src equals phase_base
  - EXPLAINED, the five files 87's pinned check will report with the 88 commit subject that explains each
  - 88-RED-EVIDENCE.md, one `- check failed: earlier checks:` line
affects: [QD-88 plans 05 to 10]

actuals:
  tokens: 9900
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a row judged by a pattern (a count that grows), by its whole stderr reason set, or computed from the tree"
    - "the expectation of a check that must move is computed from a table of explaining commit subjects, written before the commits exist"

key-files:
  created:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-earlier-checks.mjs
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-04-SUMMARY.md
  modified:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-RED-EVIDENCE.md

key-decisions:
  - "A row names its judge once: `line`, `pattern`, `reasons: true` with a `set`, or `computed`."
  - "A differing explained file with no explaining commit makes the computed row unanswerable: its problems are the failure, and the row is not also judged against a guess."

patterns-established:
  - "the earlier-checks script finds each earlier phase by name prefix and runs it only from a copy under $TMPDIR/qd88"

requirements-completed: []

coverage:
  - id: D1
    description: "88-earlier-checks.mjs re-runs Phases 85, 86 and 87's checks from scratch copies and matches a measured ledger"
    verified_by: "node 88-earlier-checks.mjs exits 0 with 46 `<check>: exit <n>: <line>` lines; `--self-test` prints `self-test: 46 passed`"
  - id: D2
    description: "The script seen failing once on a real run, recorded"
    verified_by: "88-RED-EVIDENCE.md, section 88-04"
---

# Phase 88 Plan 04: The earlier-phase checks Summary

**`88-earlier-checks.mjs`, Phase 87's earlier-checks script ported to Phases 85 to 87: every check is copied to `$TMPDIR/qd88/p85|p86|p87`, run from the copy and compared with a 46-row ledger measured while the source equals `phase_base`; 87's trailers row is matched by pattern, the two known exit-1 `scan-ids` rows compare their whole five-line reason set, and 87's pinned row is computed from `EXPLAINED`, so it expects exit 0 now and exactly the five files plan 06 edits afterwards, each with its explaining commit subject.**

## Performance

- **Started:** 2026-11-25T23:25Z; **Completed:** 2026-11-25T23:30Z (about 5 minutes)
- **Tasks:** 2 (one tracer, one auto); one task commit (the plan commits the script and its evidence once)
- **Files created:** 2 (the script, this summary); 1 modified (the evidence file); nothing under `packages`, `spec` or any earlier phase directory changed
- Scratch copies lived in `$TMPDIR/qd88` (`p85`, `p86`, `p87`); the scratch edit for the seen-failing run was restored with `cp` and `git status --porcelain -- packages` is empty.

## Accomplishments

- **Tracer (Task 1):** the 87 script ported with `OUT` at `qd88`, `P87_COPIED` as the plan lists (the first run showed no other file missing, so none was added), the `pattern`, `reasons` and `computed` row kinds and the ledger. The whole run exits 0 on the tree plan 03 left; the 28 earlier rows print exactly the lines `87-earlier-checks.mjs` recorded, so nothing in Phases 85 and 86's rows moved.
- **Self-test (Task 2):** 46 cases: the ported 21 over the new data (46 rows, 46 unique labels, 28 earlier plus 18 for 87, every row's copy made by the script) plus: a pattern row passes a growing count and fails a different sentence, a missing count and a failing run; a reasons row fails when one reason is added, dropped or reworded; the computed row expects exit 0 and the clean line when nothing differs, the exact reason set (any order) for a planted differing file with an explaining commit, a `the commit that added it` reason for the born file, fails an added, missing or outside-`EXPLAINED` reason, a wrong exit either way, and is unanswerable for a differing file with no explaining commit, with another file's subject, or outside `EXPLAINED`.
- **Seen failing (first stderr line of the real run, from `88-RED-EVIDENCE.md`):** `packages/devtools/test/react/DiagnosticsNotice.test.tsx: differs from phase_base and no commit since it has one of its explaining subjects` (one space appended, then restored).

## The ledger, as printed on the tree (source equals phase_base)

```
85-check.mjs base: exit 0: 2741584f50d176281038b478d0350dc35f174cc2
85-check.mjs scan-ids: exit 1: packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: /** The status tag of every notification a feed publishes from now on, in order. */   (reason set: five lines, below)
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
87-check.mjs trailers: exit 0: trailers: 61 commits since phase_base, each with the one trailer   (matched by pattern; the count grows)
87-check.mjs stated-run-shape: exit 0: stated-run-shape: StatedRun.ts is the one run that states its stop
87-check.mjs prologue-shape: exit 0: prologue-shape: ConfigurePrologue.ts is the one configure prologue
87-check.mjs feeds-supply-only-engine: exit 0: feeds-supply-only-engine: timeline, diagnostics, gates supply only their engine
87-check.mjs session-stop: exit 0: session-stop: the session starts its runs through the stated run
87-check.mjs simulator-pre: exit 0: simulator-pre: the broken-run box is a labelled preformatted block
87-check.mjs onfailure-gone: exit 0: onfailure-gone: no failure hook remains
87-check.mjs built-feeds-once: exit 0: built-feeds-once: test/builtFeeds.ts builds and configures through one helper
87-check.mjs records: exit 0: records: the pinned-by lists name tests that exist
87-check.mjs records --close: exit 0: records: the pinned-by lists name tests that exist, and every reserved record is written
87-pinned-check.mjs: exit 0: pinned: 122 files hold their base text, 5 of 5 born files held, 2 of 2 declared edits applied   (computed row: this is the clean answer)
87-check.mjs --self-test: exit 0: self-test: 301 passed
87-pinned-check.mjs --self-test: exit 0: self-test: 35 passed
87-mutation.mjs --self-test: exit 0: self-test: 103 passed
87-earlier-checks.mjs --self-test: exit 0: self-test: 21 passed
```

The five-line reason set of `85-check.mjs scan-ids` and `86-check.mjs scan-ids` (identical): `DiagnosticsFeed.stop.test.ts:35`, `StatedRun.characterisation.test.ts:45`, `:54`, `:63` and `TimelineFeed.stop.test.ts:29`, each `has phase-relative wording` on a comment saying a feed `publishes from now on`. They are Phase 87's born tests, held byte for byte; the rule and the lines are both left alone, and this is the finding the rows record.

`EXPLAINED` (the five files 87's pinned check will report after plan 06, each with the subjects that may explain it): `test/helpers.ts`, `test/react/DiagnosticsNotice.test.tsx` and `test/react/TimelineNotice.test.tsx` to `refactor(88-06): the stopped box keys itself and records its stop through the feed ledger`; `test/react/Simulator.broke.test.tsx` to that subject and `test(88-06): compare the simulator reason block with the rendered stopped box`; `test/surface.tst.ts` to `test(88-06): refuse the stop ledger names from both entries`.

## Task Commits

1. Tasks 1 and 2: `371da10c222e583d0799d235db96a424c8bc4b23` `chore(88-04): add the earlier-phase checks` (`88-earlier-checks.mjs` and `88-RED-EVIDENCE.md`)

## Deviations from Plan

### Auto-fixed Issues

None.

### Choices the plan left open (decided autonomously)

- **A `reasons: true` row carries its set in a `set` field**, and the computed pinned row answers with the same two fields when files differ, so one judge compares both.
- **An unanswerable computed row stops the pinned row only.** When a differing file has no explaining commit (or is outside `EXPLAINED`) the problems are printed as the failure and the pinned row is left out of the ledger judgement, so the output is not also a spurious `unexpected run` for it; every other row is still judged.
- **No other file was added to `P87_COPIED`.** The first run showed none missing.
- The `when` and `chooseRows` machinery ported from 87 is kept; no row carries a `when`.

### Plan defects

None. Both verifies ran as written.

### Auth gates

None.

## Issues Encountered

None.

## Next Phase Readiness

- Plans 05 to 10 run `88-earlier-checks.mjs` from the repository root. After plan 06 commits with the three subjects above, 87's pinned row switches to exit 1 with five reasons, one per file, and still passes.
- **Risk for the plans that amend records:** `87-check.mjs records --close` requires 87's amended decisions (ADR-QD-047 at 1.24, 150 at 1.1, 182 at 1.2, 192 at 1.7, 194 at 1.4, 196 at 1.4) at exactly those revisions. If this phase amends one of them its row changes, and that is a finding to explain, not a row to widen. ADR-QD-197 is not in that list.
- `87-check.mjs scan-ids` and `scan-forbidden` scan every added line of the tree against Phase 87's base, so a line plan 05 to 10 add with phase-relative wording or a forbidden form fails there.

## Known Stubs

None.

## Threat Flags

None. T-88-06 is mitigated: the scripts run from scratch copies and `git status --porcelain --untracked-files=no` over `.planning/milestones` and the Phase 85 to 87 directories is empty.

## Self-Check: PASSED

- Files found: 88-earlier-checks.mjs, 88-RED-EVIDENCE.md, this summary.
- Commit found as an ancestor of HEAD: 371da10c.
- `node 88-earlier-checks.mjs --self-test` prints `self-test: 46 passed`; the plain run exits 0; oxlint is clean; nothing is modified under `packages`.
