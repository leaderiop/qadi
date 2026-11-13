---
phase: 30
review: 30-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "`DecodeDepthGuard.ts` mutation score fell from 94.74 to 92.59 (WX-05)"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "`UntrustedDecode.ts`'s constant `\"not JSON\"` arm, and a thin mutation margin"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "Plan-local decision and plan numbers in shipped comments and test titles"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "`PortSpanEncode.ts` budget exemption rests on a false provenance claim"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "Byte-identical `isPlainObject` still lives in `FieldPath.ts`"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "Closure-returning `Match` arms in `HydrationEngine.ts`"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "Three copies of the plain-object predicate; long NS-01 comment"
open: 0
total: 7
recorded: 2026-11-12T05:41:07.834Z
---

# Phase 30: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 30-REVIEW-FIX.md |
| IN-01 | info | fixed | 30-REVIEW-FIX.md |
| WR-02 | warning | fixed | 30-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 30-REVIEW-FIX.iter2.md (not in the current review) |
| IN-02 | info | fixed | 30-REVIEW-FIX.iter3.md (not in the current review) |
| IN-03 | info | fixed | 30-REVIEW-FIX.iter2.md (not in the current review) |
| IN-04 | info | fixed | 30-REVIEW-FIX.iter2.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
