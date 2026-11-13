---
phase: 36
review: 36-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Live comments (and a shipped metric description) still name `Evaluate.ts` for port calls"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "`v4-http-smoke.test.ts` header lists `PermissionRegistry.ts`, omits `AccessPlan.ts`"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "Mis-indented `status:` literal in `makeTimelineFeed`"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "`rowsOf` builds `snapshot(capture)` twice per usable Snapshot row"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "`StoppedBox`'s `hooks` and `focusTarget` are independent unions"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "The contrast helper uses the superseded sRGB linearisation threshold"
  - id: IN-06
    severity: info
    disposition: skipped
    title: "`focusRingProps.onFocus` throws where `:focus-visible` is unsupported"
open: 0
total: 7
recorded: 2026-11-13T02:05:03.892Z
---

# Phase 36: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 36-REVIEW-FIX.md (not in the current review) |
| IN-01 | info | fixed | 36-REVIEW-FIX.md (not in the current review) |
| IN-02 | info | fixed | 36-REVIEW-FIX.md (not in the current review) |
| IN-03 | info | fixed | 36-REVIEW-FIX.md (not in the current review) |
| IN-04 | info | fixed | 36-REVIEW-FIX.md (not in the current review) |
| IN-05 | info | fixed | 36-REVIEW-FIX.md (not in the current review) |
| IN-06 | info | skipped | 36-REVIEW-FIX.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
