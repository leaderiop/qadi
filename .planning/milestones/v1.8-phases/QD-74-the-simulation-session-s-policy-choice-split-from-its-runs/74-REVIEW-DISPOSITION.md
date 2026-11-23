---
phase: 74
review: 74-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "The characterisation check still passes import and fixture edits that change what a row runs"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "CCR-QD-466 cites `spec/README.md` at Rev 1.320; the header is 1.321"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "`74-REVIEW-FIX.md` reports revisions that `e0c6b67a` superseded before the report was committed"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`SeededChoice.test.ts` shadows the imported fixture helper `sighting`"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "`Simulator.test.tsx` builds its own orphan row and its own `read`"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "BEH-QD-709 cites a `withSightings` test as evidence that choosing the held policy is a no-op"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "ADR-QD-187's \"What enforces it\" omits the transition-signature pin and decision 1's no-op rows"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "ADR-QD-187 says `spec/overview.md` does not change"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "The characterisation header claims every row checks the notification count"
  - id: WR-05
    severity: warning
    disposition: fixed
    title: "Two \"pins nothing\" rows cannot fail if a replayed seed does pin"
  - id: WR-06
    severity: warning
    disposition: fixed
    title: "`SeededChoice.test.ts` copies about a dozen helpers from the characterisation"
  - id: WR-07
    severity: warning
    disposition: fixed
    title: "A plan-relative reference shipped in a test comment"
  - id: WR-08
    severity: warning
    disposition: fixed
    title: "The barrel type pin cannot fail for the reason its title names"
  - id: WR-09
    severity: warning
    disposition: fixed
    title: "The characterisation duplicates session tests that stayed in `SimulationSession.test.ts`"
open: 0
total: 14
recorded: 2026-11-23T06:25:22.548Z
---

# Phase 74: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 74-REVIEW-FIX.md |
| WR-02 | warning | fixed | 74-REVIEW-FIX.md |
| IN-01 | info | fixed | 74-REVIEW-FIX.md |
| IN-02 | info | fixed | 74-REVIEW-FIX.md |
| IN-03 | info | fixed | 74-REVIEW-FIX.md |
| IN-04 | info | fixed | 74-REVIEW-FIX.iter2.md (not in the current review) |
| IN-05 | info | fixed | 74-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 74-REVIEW-FIX.iter1.md (not in the current review) |
| WR-04 | warning | fixed | 74-REVIEW-FIX.iter1.md (not in the current review) |
| WR-05 | warning | fixed | 74-REVIEW-FIX.iter1.md (not in the current review) |
| WR-06 | warning | fixed | 74-REVIEW-FIX.iter1.md (not in the current review) |
| WR-07 | warning | fixed | 74-REVIEW-FIX.iter1.md (not in the current review) |
| WR-08 | warning | fixed | 74-REVIEW-FIX.iter1.md (not in the current review) |
| WR-09 | warning | fixed | 74-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
