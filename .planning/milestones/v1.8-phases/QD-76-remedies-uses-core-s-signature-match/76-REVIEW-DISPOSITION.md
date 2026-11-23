---
phase: 76
review: 76-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "BEH-QD-719 and ADR-QD-189 decision 5 say `remedyEdits` never throws for any value the form's subject or resource holds; it throws for a `hasRelationship` leaf and for a subject-attribute leaf"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "`canonicalKey` writes the same `Unreadable` mapping as `readGuarded`, and `readGuarded`'s comment says no caller writes a `try`"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`RemedyTotality.test.ts` documents the list tests above a helper and its header still says \"a row or a site\""
  - id: IN-03
    severity: info
    disposition: fixed
    title: "BEH-QD-445's current-tense paragraph still says the check is `readScoped`, against the dated note under it"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "`describeKeyRefusal` throws for an unkeyable object whose constructor `name` is not a string, so a row or site holding one still throws out of the judgements and the remedy table"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "BEH-QD-588 still requires `readScoped` to fail with the `MissingResourceId` \"that `errorOf` builds\""
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "`LeafNeeds.test.ts` \"never asks about the resource id\" can no longer fail"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "BEH-QD-445's rewritten sentence leaves \"Before it\" without a referent"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "`agreeAt` is byte-identical in the two frozen agreement files, and the evidence note says no declaration is"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "The `hasCustom` remedy test no longer pins the sentence it was written to pin"
open: 0
total: 10
recorded: 2026-11-23T19:42:15.685Z
---

# Phase 76: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | 76-REVIEW-FIX.md |
| IN-01 | info | fixed | 76-REVIEW-FIX.md |
| IN-02 | info | fixed | 76-REVIEW-FIX.md |
| IN-03 | info | fixed | 76-REVIEW-FIX.md |
| WR-02 | warning | fixed | 76-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 76-REVIEW-FIX.iter2.md (not in the current review) |
| WR-04 | warning | fixed | 76-REVIEW-FIX.iter2.md (not in the current review) |
| IN-04 | info | fixed | 76-REVIEW-FIX.iter2.md (not in the current review) |
| IN-05 | info | fixed | 76-REVIEW-FIX.iter2.md (not in the current review) |
| IN-06 | info | fixed | 76-REVIEW-FIX.iter1.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
