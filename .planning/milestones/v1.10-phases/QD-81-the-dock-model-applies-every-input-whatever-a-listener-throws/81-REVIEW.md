---
phase: QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws
reviewed: 2026-11-25T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/test/model/ConfigureRule.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DockModel.listeners.test.ts
  - packages/devtools/test/model/ExternalStore.callAll.test.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/model/SimulationSession.runs.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/README.md
  - .changeset/devtools-configure-applies-every-input.md
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
  necessity: 0
status: issues_found
---

# Phase QD-81: Code Review Report

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

I re-reviewed the phase after b16a3a0c and 05aee2bf (`git diff 35d53fbc..HEAD`: the README, `spec/README.md`, BEH records in `spec/behaviors/28-devtools-screens.md`, ADR-QD-194, `spec/invariants.md` and `spec/traceability.md`). I ran `pnpm vitest run` on `DockModel.listeners.test.ts`, `DiagnosticsFeed.test.ts` and `TimelineFeed.test.ts`. All 92 tests pass. No source file changed in these two commits, and I found no defect in them.

Verification of the second review's findings:

- **WR-01 (stale DL10 descriptions): fixed.** BEH-QD-728, BEH-QD-741, the INV-QD-407 enforcement paragraph, both traceability rows and the ADR-QD-194 change table now say DL1 to DL9 are the nine stores a `configure` notifies, and DL10 is the lens a `configure` never calls. That matches the tests: the DL1 to DL9 rows pass `heard: true`, DL10 passes `heard: false`, and DL11 still covers all ten stores. The "ten stores" statements left in the spec (BEH-QD-741's requirement, INV-QD-407's statement, the store count at line 1109 of the screens behavior, CR22) are still true. A lens listener that is never called throws nothing, so a `configure` still runs and applies everything.
- **WR-02 (DL18 to DL20 uncited, unrequired): fixed.**
  - DL18 and DL19 are in BEH-QD-742's "Pinned by", the INV-QD-407 enforcement, and both traceability rows. The traceability row for `DockModel.listeners.test.ts` now runs to DL20. I checked their messages and the nesting against the tests.
  - BEH-QD-656 has the new requirement: a listener's throw on a record the timeline read hands over, or on a sample the diagnostics poll hands over, MUST end that read or poll, and its status MUST say `Stopped`.
  - DL20 pins the read. The source returns `r1` and `r2` with `Stream.never` as its live stream, so only the throw can produce `Stopped`. The timeline holds `["r1"]` and `r2` is never accepted.
  - F32 pins the poll. The throw on `Live` ends the poll after one collector call, the heard sequence is `Starting, Live, Stopped`, and the held `Stopped` has `sampled` true.
  - The requirement is accurate for those two paths.
- **IN-01 (TF37's two reads): fixed.** BEH-QD-745, the traceability TF37 clause and ADR-QD-194 item 6 now say the source is read once by the inner call and once by the outer call's own read step, the replay deduplicated by the timeline. That matches TF37: `b.tally` is `{ reads: 2 }`, the entries are `["from-b"]`, and `c.tally` is `{ reads: 0 }`.
- **IN-02 (README nested-`AggregateError` sentence): fixed by narrowing.** The sentence now says several listeners of one store that throw in one notification are one `AggregateError`, and the dock keeps it whole as its step's throw, nested and never flattened. DL18 pins the first half (two listeners on one store, whole, with the store's message). DL19 pins the second (a nested aggregate beside another step's throw, with the dock's message). The sentence no longer claims anything about the timeline feed's own two steps, so it claims only what the tests pin.

The two remaining findings are low-severity gaps in how the new requirement is recorded and pinned.

## Info

### IN-01: The new BEH-QD-656 requirement is pinned for a read only through a derived-store listener and a backlog record

**File:** `spec/behaviors/28-devtools-screens.md:2761-2762`, `packages/devtools/test/model/DockModel.listeners.test.ts:544-567`, `packages/devtools/README.md:171-172`

**Issue:** The requirement and the README sentence are written for any "listener" and for "a record the timeline read hands over". DL20 pins one case: an explorer listener (a derived store, reached through the dock model's own timeline listener) throwing on a backlog record. No test pins a listener on the feed's own `timeline` store throwing on a record, or a throw on a record from the live stream, and `TimelineFeed.test.ts` has no read-ending case. TF25 calls `accept` directly. The README sentence sits in "Without React: the feeds", which addresses a shell that builds `makeTimelineFeed` without the dock model. The behavior is true by construction, because every record goes through `marking.accept` into `timeline.accept`, and `reads.fork`'s `onFailure` publishes `Stopped`. It is pinned only by the dock-level row.

**Fix:** Add one `TimelineFeed.test.ts` case. A source returns a two-record backlog, a `feed.timeline` listener always throws, and the case asserts `idsOf(feed)` is `["x"]` and the status is `Stopped`. Add its id to BEH-QD-656's "Pinned by". Or word the "Pinned by" for DL20 as "an explorer listener" and leave it there.

### IN-02: BEH-QD-656's new requirement has no amendment banner and is not reflected in INV-QD-373's rows

**File:** `spec/behaviors/28-devtools-screens.md:2741-2746`, `spec/traceability.md:201` (INV-QD-373 row)

**Issue:**
- BEH-QD-656 carries an "Amended" and a "Restated" banner for each earlier change to its requirements. The 2026-11-25 requirement is recorded only in the document's change history, not in a banner. A reader of the section cannot tell which requirement is new.
- The linked invariant INV-QD-373 and its traceability row list the existing test files but not `DockModel.listeners.test.ts`, which now pins one of BEH-QD-656's requirements.

**Fix:** Add a third banner line, for example "**Amended 2026-11-25 (CCR-QD-473).** A listener's throw on a record or a sample ends the read or poll and the status says `Stopped`", linking BEH-QD-744. Add `DockModel.listeners.test.ts` to the INV-QD-373 row's test list.

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
