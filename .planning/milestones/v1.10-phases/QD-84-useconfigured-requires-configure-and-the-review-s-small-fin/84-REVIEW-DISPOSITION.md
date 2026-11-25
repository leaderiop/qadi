---
phase: 84
review: 84-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: fixed
    title: "The type test's header still describes one refusal"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "Nothing pins the \"property, not method\" choice"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "BEH-QD-756 says three refusals are pinned, and only one is"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "\"The lens group of `stryker.devtools.mjs`\" does not exist in that file"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "ADR-QD-197 says `LensSession.ts` is the only file under the mutation glob"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "Stray trailing comma in the generic of a `.ts` file"
open: 0
total: 6
recorded: 2026-11-25T09:20:11.610Z
---

# Phase 84: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | fixed | 84-REVIEW-FIX.md (not in the current review) |
| IN-02 | info | fixed | 84-REVIEW-FIX.md (not in the current review) |
| WR-01 | warning | fixed | 84-REVIEW-FIX.iter2.md (not in the current review) |
| WR-02 | warning | fixed | 84-REVIEW-FIX.iter2.md (not in the current review) |
| WR-03 | warning | fixed | 84-REVIEW-FIX.iter2.md (not in the current review) |
| IN-03 | info | fixed | 84-REVIEW-FIX.iter2.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

## Findings dropped by id reuse

The review ran three iterations, and iteration 2 reused the ids `IN-01` and `IN-02` for new findings, so the
ledger above kept only the later two. The two iteration-1 findings it dropped were both fixed, and are
recorded here so that no finding leaves this record (8 findings in all, 0 open):

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 (iteration 1): the `useConfigured.ts` header line ran to about 115 columns | info | fixed | f5cfd3f2; `84-REVIEW-FIX.md` § Iteration 1 |
| IN-02 (iteration 1): the `Configurable` doc said it was exported for the type test alone | info | fixed | a14679ef; `84-REVIEW-FIX.md` § Iteration 1 |
