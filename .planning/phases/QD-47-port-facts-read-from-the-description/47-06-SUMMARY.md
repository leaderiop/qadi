---
phase: QD-47-port-facts-read-from-the-description
plan: 06
subsystem: spec
tags: [spec, behaviours, invariants, traceability, ports]
phase_base: 9f2051228ef4d577262891a4e7882a8683b7754e
plan_head_before: bcc26a921fab94427e8db5965b50d3f2143b1b2c
plan_head_after: 4e2b0ebbe3514daa542c217e67f292c0d0346c8b
commits: 2
requires: [47-05]
provides:
  - "BEH-QD-571 and 572 (25-inspection.md), BEH-QD-573 and 575 (28-devtools-screens.md), BEH-QD-574 (30-port-calls.md)"
  - "BEH-QD-196, 215 and 228 amended; the devtools-spec Services sentence"
  - "INV-QD-339 and INV-QD-340; traceability rows; overview PortReport row; ADR-QD-160 links; CCR-QD-438 complete"
affects: [47-07]
tech-stack:
  added: []
  patterns: ["spec-revise bumps each edited document; the devtools-spec draft header is bumped by hand"]
key-files:
  created: []
  modified:
    - spec/behaviors/25-inspection.md
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/30-port-calls.md
    - spec/devtools-spec/02-screens.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/decisions/160-port-facts-are-read-from-the-description.md
    - spec/README.md
key-decisions:
  - "BEH-QD-574 lives in 30-port-calls.md beside BEH-QD-228; 573 and 575 stay in 28-devtools-screens.md."
  - "The new behaviour blocks use ts listings, not compiled typescript fences."
requirements-completed: [PFCT-01, PFCT-02, PFCT-03, PFCT-04, PFCT-05, WX-02]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
status: complete
---

# Phase 47 Plan 06: The specification brought into line Summary

BEH-QD-571 to 575 and INV-QD-339 and INV-QD-340 state that a port's fail-closed default is a mark its service carries (not a name a reader parses), traced to the tests that pin them; the withdrawn "defaulted is a reader's label derived from `name`" claim is gone from BEH-QD-215, the overview and the Services sentence, and CCR-QD-438 names every reserved id Used.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `49a1579b` | `docs(47-06): BEH-QD-571 to 575; BEH-QD-196, 215 and 228 amended` |
| 2 | `4e2b0ebb` | `docs(47-06): INV-QD-339 and 340, traceability, and CCR-QD-438 completed` |

Each ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer.

## Documents and revisions

| Document | Revision | Change |
|---|---|---|
| `spec/behaviors/25-inspection.md` | 1.28 to 1.29 | BEH-QD-196 says its composed name is display only and links BEH-QD-571; BEH-QD-571 and BEH-QD-572 added before BEH-QD-197 |
| `spec/behaviors/28-devtools-screens.md` | 1.21 to 1.22 | BEH-QD-215's name-derived paragraph rewritten to the structural reading; BEH-QD-573 and BEH-QD-575 added before BEH-QD-216 |
| `spec/behaviors/30-port-calls.md` | 1.7 to 1.8 | BEH-QD-228's `PortCall` listing is the derived form; BEH-QD-574 added before BEH-QD-229 |
| `spec/devtools-spec/02-screens.md` | 0.18 to 0.19 (draft) | Services sentence: any wrapper that carries the default reads defaulted |
| `spec/invariants.md` | 1.133 to 1.134 | INV-QD-339 and INV-QD-340 after INV-QD-338 |
| `spec/traceability.md` | 1.196 to 1.197 | §1 rows 25, 28, 30; two §2 rows; ADR-QD-160's §3 cell as links; four new §4 rows; Wiring, Capture and PortCalls rows amended |
| `spec/overview.md` | 1.113 to 1.114 | `PortReport` row cites `isPortDefault`, BEH-QD-571, BEH-QD-215 |
| `spec/decisions/160-...md` | 1.0 to 1.1 | Related list links the behaviours and invariants |
| `spec/README.md` | 1.201 to 1.202 | CCR-QD-438 row complete, ending `Used: ARCH-94, ADR-QD-160, CCR-QD-438, BEH-QD-571..575, INV-QD-339..340. Unused: none.` |

## Gate results

`pnpm spec:verify:strict` `PASS: 21 FAIL: 0 SKIP: 0`; `pnpm spec:claims` (8 claims), `pnpm spec:examples` (116 blocks compile), `pnpm spec:api` (929 exports), `pnpm spec:gates` (dod-table 25 steps), `node scripts/spec-revise.mjs --check` all pass. Both tasks' node verifies print `ok`, and the whole-repo search for the withdrawn claim (outside change history and the CCR log) is clean. Only nine files under `spec/` changed in the plan.

## Deviations from Plan

**1. [Rule 3 - Blocking] `02-screens.md` Revision bumped by hand.** `scripts/spec-revise.mjs` reports "has no Revision / Change History rows" for it, because its `Revision` is `0.18 (draft)`. I edited the Revision cell to `0.19 (draft)` and prepended a `0.19 (2026-11-16)` entry by hand, in the document's own form. Not a gate change.

**2. Task 1's literal verify regex** `any wrapper that carries it` needs the phrase on one line, so the Services sentence was reflowed to keep it on one line.

## Known Stubs

None.

## Threat Flags

None. T-47-20 mitigated (the final grep is clean), T-47-21 mitigated (only CCR-QD-438's row and the document control changed in `spec/README.md`).

## Self-Check: PASSED

All nine documents exist; `49a1579b` and `4e2b0ebb` are ancestors of HEAD; `git diff --name-only bcc26a92 HEAD` lists only `spec/` files.
