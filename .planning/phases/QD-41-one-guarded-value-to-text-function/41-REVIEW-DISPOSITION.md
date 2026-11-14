---
phase: 41
review: 41-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "The label rule is written twice, in core's `literalText` and devtools' `render`"
  - id: WR-02
    severity: warning
    disposition: skipped
    title: "An object whose `toJSON` gives nothing changes label, against D-07"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "The `In` fallback's element walk can still throw"
  - id: IN-01
    severity: info
    disposition: skipped
    title: "Two different non-JSON witnesses share one label, so one remedy is offered"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "`render` relies on `JSON.stringify(null)` being text without saying so"
  - id: IN-03
    severity: info
    disposition: skipped
    title: "`valueText` is a generic name in core's flat barrel"
open: 0
total: 6
recorded: 2026-11-14T17:40:00.000Z
---

# Phase 41: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | iteration 1, `781f08e4`: the rule lives once in core's new public export `valueLabel` (overview row, changeset, ADR-QD-154 Rev 1.1, BEH-QD-541/542, CCR-QD-432) |
| WR-02 | warning | skipped | the one changed label was chosen at plan time and recorded in ADR-QD-154 and BEH-QD-541; the more correct label wins over byte-compatibility (project preference). It departs from D-07's wording and is reported to the user |
| WR-03 | warning | fixed | iteration 1, `781f08e4`: `listText` walks inside one bare `try`, an unwalkable list reads through `valueLabel`; revoked-proxy and throwing-trap cases pinned |
| IN-01 | info | skipped | documented behaviour (BEH-QD-541): the fixed words carry none of the value, so two such witnesses are one remedy |
| IN-02 | info | fixed | iteration 1, `781f08e4` (comment in `valueLabel`) |
| IN-03 | info | skipped | deliberate (D-13, ADR-QD-154) |

Iteration 2 review clean (`b47cf33a`).

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.

## Mutation after the review fixes

The fixes changed `Explanation.ts`, `ValueText.ts` and `Remedies.ts` after `41-mutation-after.json` was written, so the five
files were re-run with the baseline invocations, one at a time (2026-11-14):

| File | Base | 41-06 after | After review fixes |
|------|------|-------------|--------------------|
| `packages/core/src/Explanation.ts` | 0.98673 | 0.98750 | 0.98701 (228/231; the same three survivors) |
| `packages/core/src/ValueText.ts` | new | 1 (2/2) | 1 (13/13) |
| `packages/devtools/src/model/Remedies.ts` | 1 | 1 | 1 (297/297) |
| `packages/devtools/src/model/Filters.ts` | 1 | 1 | 1 (75/75) |
| `packages/devtools/src/model/SimulationForm.ts` | 0.98195 | 0.98367 | 0.98367 |

No score is below its base.
