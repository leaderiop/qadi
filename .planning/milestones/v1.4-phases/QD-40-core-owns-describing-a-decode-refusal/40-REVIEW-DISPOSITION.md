---
phase: 40
review: 40-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "A throwing `onMalformed` callback ends the stream, against the module's stated contract"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "A test helper reuses the name of the new public export `decodeRefusalOf`"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "The SinkWire.ts and SinkCodec.ts header comments do not name the new exports"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "The `TooDeep` and `NotJson` sentences assume a sender"
  - id: IN-01-i2
    severity: info
    disposition: fixed
    title: "`thrownName` is not hardened against a throwing `name` getter or a revoked Proxy"
open: 0
total: 5
recorded: 2026-11-14T13:10:00.000Z
---

# Phase 40: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | iteration 1, `9eb6175f`; BEH-QD-204 states it (27-devtools-timeline.md Rev 1.13) |
| IN-01 | info | fixed | iteration 1, `dd0c3da3` (helper renamed `refusalOfText`) |
| IN-02 | info | fixed | iteration 1, `a7553b90` |
| IN-03 | info | fixed | iteration 1, `946a35ce` (40-02 pins untouched) |
| IN-01 (iteration 2) | info | fixed | `0c4f5545`; iteration 3 review clean |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.

## Mutation after the review fixes

The fixes changed `SinkWire.ts`, `SinkCodec.ts` (comments) and `Source.ts` after `40-mutation-after.json` was written, so the
changed files were re-run with the baseline invocations, one at a time (2026-11-14):

| File | Base | 40-09 after | After review fixes |
|------|------|-------------|--------------------|
| `packages/core/src/SinkCodec.ts` | 0.97516 | 0.97546 | 0.97546 (159/163; the same four survivors, lines shifted by two) |
| `packages/core/src/SinkWire.ts` | 1 | 1 | 1 (60/60) |
| `packages/devtools/src/model/Source.ts` | 1 | 1 | 1 (80/80) |

`AuditEntry.ts` was not changed by the review fixes; it stays at 1.
