---
phase: QD-78-timelinestore-owns-its-capacity
plan: 08
subsystem: spec-records
tags: [spec, behaviours, invariants, traceability, ccr]
requires: [78-07]
provides:
  - BEH-QD-726, BEH-QD-727, BEH-QD-728 and BEH-QD-730 in doc 28, BEH-QD-729 in doc 27, INV-QD-401 and INV-QD-402
  - BEH-QD-465, BEH-QD-636 and BEH-QD-656 restated, BEH-QD-205 pointing to BEH-QD-729
  - traceability rows in sections 1, 2 and 4, and the CCR-QD-470 row naming every reserved id
affects: [78-09, 78-10, 78-11]
key-files:
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/27-devtools-timeline.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
decisions:
  - "The refusal rule goes first and end to end (BEH-QD-728, INV-QD-401): the feed's and the dock's configure check before any input moves, and a listener's throw is rethrown after the feed started its read and the dock applied the rest"
  - "BEH-QD-730 cites INV-QD-401 as its invariant and BEH-QD-729 cites INV-QD-039; no new invariant was invented for either"
  - "The doc 28 section 1 row lists BEH-QD-726, BEH-QD-727, BEH-QD-728 and BEH-QD-730 as ids and not as a range, so a search for one id finds the row"
requirements-completed: []
metrics:
  duration: 40min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: a9f10ef840230becb5bf0d15be459e4d21253adc
plan_head_after: bcba35c1cabd0885fb512b9c80bcd6fb48f2903d
actuals:
  tokens: 16000
  tasks: 2
  commits: 2
---

# Phase QD-78 Plan 08: the timeline store capacity rules as behaviour and invariant records Summary

The five behaviour records and two invariants ADR-QD-191 names are written from the shipped code and its tests, each
naming the tests that pin it, traced in sections 1, 2 and 4 of the traceability matrix, and registered by the
CCR-QD-470 row, which ends `Unused: none.`. The refusal rule, which spans the store, the feed and the dock, went first.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 (tracer) | `c5a84e38` | `28-devtools-screens.md`, `invariants.md`, `traceability.md`, `README.md` |
| 2 | `bcba35c1` | `28-devtools-screens.md`, `27-devtools-timeline.md`, `invariants.md`, `traceability.md`, `README.md` |

## What shipped

- Doc 28 Rev 1.52 to 1.54: BEH-QD-726 (`resize` and its answer, `clear` at the held bound), BEH-QD-727 (the feed's one
  store, the idle store's `false`, an omitted capacity as the default), BEH-QD-728 (a refused capacity changes nothing in
  `configure`; a listener's throw is rethrown after the read started and the dock applied the rest), BEH-QD-730 (the
  hand-fed hook follows its capacity). BEH-QD-465 gains the dated amendment, a `configure` requirement that dispatches a
  capacity only when the bound it means changed, and M55 and M56 in its pinned-by sentence. BEH-QD-636 reads an omitted
  source as `undefined` and an omitted capacity as `DEFAULT_TIMELINE_CAPACITY`, with a dated amendment linking
  BEH-QD-727 and BEH-QD-728. BEH-QD-656 names a capacity other than the one the store holds.
- Doc 27 Rev 1.14 to 1.15: BEH-QD-729 (a record a zero-capacity timeline cannot keep returns the identical timeline; a
  timeline holding entries over a zero bound is still emptied), and BEH-QD-205 points to it.
- `spec/invariants.md` Rev 1.213 to 1.215: INV-QD-401 (with its run-time guard) and INV-QD-402.
- `spec/traceability.md` Rev 1.294 to 1.296: section 1 rows of docs 27 and 28, the section 2 rows of INV-QD-401 and
  INV-QD-402, and section 4 rows for the timeline, store, feed, dock, lifetime, hook and surface tests.
- `spec/README.md` Rev 1.359 to 1.361: the CCR-QD-470 row names the five documents with their revisions, each record with
  its source and test files, and `Ids used: ... Unused: none.`.

## Verification

- Task 1 verify: exit 0 on the final tree, and its constituent checks passed before the commit (the strict traceability
  check `PASS: 21 FAIL: 0`, `spec-revise --check`, `check-doc-examples` 118 blocks, `scripts/check-dod-table.mjs` 26
  steps, the plan-local wording scan of the added lines, the four-file commit and one trailer).
- Task 2 verify: exit 0 (headings, doc 28 order 699 < 726 < 727 < 728 < 730, BEH-QD-205's pointer, BEH-QD-636's
  restatement, the section 2 rows, the CCR row's ids and its `Unused: none.` ending, wording scan, every Revision moved in
  the commit, strict check, `spec-revise --check`, doc examples, DoD table, five files and one trailer).
- Anchors: the seven headings' GitHub slugs match every link to them in ADR-QD-191, the invariants, doc 28, doc 27 and the
  traceability matrix (checked with a slug script, 0 broken).
- Tracer gate: Task 1's checks passed end to end before Task 2 began.
- No `packages/*/src` or test file was touched; `node scripts/next-id.mjs` was not run.

## Deviations from Plan

**1. [Rule 3 - Blocking] The doc 28 section 1 row names ids, not a range.** Task 1's verify greps that row for
`BEH-QD-728` at HEAD, and Task 2's addition of BEH-QD-726 to BEH-QD-727 made the row read `BEH-QD-726–728`, which the
Task 1 verify then failed on. The row now lists `BEH-QD-726, BEH-QD-727, BEH-QD-728, BEH-QD-730`. The fix was folded into
the Task 2 commit (amended, unpushed) so the Revision it moved still covers it; both verifies then passed on the final
tree.

**2. Additional section 4 rows.** BEH-QD-727 cites `DockModel.test.ts` (M11) and `TimelineLifetime.test.tsx` (L3), so
their rows carry BEH-QD-727 too, beyond the five rows the plan listed.

**3. TF33 is cited.** BEH-QD-727 states that an omitted capacity and the default are one bound, which TF33 pins, so it
cites TF33 beside the TF34 to TF36 the plan listed.

## Known Stubs

None.

## Threat Flags

None. T-78-18 (each record is written from the shipped doc comments and tests and names what pins it) and T-78-19 (every
Revision moved through `scripts/spec-revise.mjs`, checked per commit and by `--check`) are mitigated.

## Self-Check: PASSED

- `c5a84e38` and `bcba35c1` are ancestors of HEAD; the five edited documents exist and their Revisions agree with their
  newest Change History entries; `bash spec/scripts/verify-traceability.sh --strict` reported `FAIL: 0`.
