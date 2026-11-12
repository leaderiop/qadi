---
phase: 28
review: 28-REVIEW.md
titles: json
findings:
  - id: IN-01
    severity: info
    disposition: open
    title: "`GateWriter.ts` header says `GateRegistry.ts` re-exports \"three public types\"; it re-exports four"
  - id: IN-02
    severity: info
    disposition: open
    title: "`GateIdentity.atom` doc links to `useGates`, which is not in this module"
  - id: IN-03
    severity: info
    disposition: open
    title: "INV-QD-064's Source attributes the handle's key-closure to `GateWriter.ts`"
  - id: IN-04
    severity: info
    disposition: open
    title: "ADR-QD-140 Consequences overstate how little the tests changed"
  - id: IN-05
    severity: info
    disposition: open
    title: "ADR-QD-053's amendment blockquote still places `useGates` in `GateWriter.ts`"
  - id: IN-06
    severity: info
    disposition: open
    title: "No test drives the instrumented registration lifecycle under StrictMode"
open: 6
total: 6
recorded: 2026-11-11T22:36:23.936Z
---

# Phase 28: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| IN-05 | info | open | - |
| IN-06 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
