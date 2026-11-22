---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 11
subsystem: change register, release notes, Phase 61 archive
status: complete
tags: [hygn-05, hygn-07, wx-02, wx-07, oi-09, oi-26, oi-27, oi-28, oi-29, ccr-qd-459, changeset]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-10's commit 5b603fea (every spec document the phase revised is bumped, so the row cites current Revisions); 68-04's committed `stamped` sentence in DecisionLog.ts
provides:
  - "the CCR-QD-459 row, right after CCR-QD-458, citing the 11 revised spec documents at their current Revision (README bumped once, 1.272 to 1.273) and naming ARCH-115, the amended ADR-QD-033, 172, 173, 174, 175 and 177, and ADR-QD-181, BEH-QD-676 to 680 and INV-QD-381 to 382 Unused; `verify-traceability.sh --strict` prints `PASS: 21   FAIL: 0   SKIP: 0`"
  - "the row's statement that CCR-QD-455's account of a capacity change's publish (a throw leaves before `begin()` and starts no read) described an order of two calls that is gone, with the one residue (TF29): on a `Stopped` feed a status listener that throws on the `Reading` the read publishes replaces the timeline listener's throw and no read is started"
  - ".changeset/devtools-capacity-change-reads.md, the phase's one changeset, a `@qadi/devtools` patch; no CHANGELOG, version, tag or publish"
  - "61-SETTLED-ITEMS.md in Phase 61's archive (HYGN-05): the `DecisionLog` `ingest` doc already names its uncontained defect path, and `d0ca3df6`'s `Simulator.test.tsx` change is comments only, each with a re-runnable evidence command"
  - "OI-26 to OI-29 recorded in the row with their reasons: the Sonnet trailers in published Phase 62, 63 and 64 history, WX-01 to WX-07 ticked at the milestone audit, the stated and accepted limits, and the 63-05, 66-04 and 66-05 plan verifies kept as written"
affects: [68-12, 68-15]

actuals:
  tokens: 20000
  tasks: 2
  commits: 1
plan_head_before: 6928d657ee5c90e06b126ecb22297f540a07d4f4
plan_head_after: eacfeb6c2b6d2a73452a05b349d4c6a38a5cec0a
commits: 1

tech-stack:
  added: []
  patterns:
    - "register row inserted by the checked edit list (exactly-once anchor on the CCR-QD-458 line), then bumped only through spec-revise --date 2026-11-21"
    - "a claim written in six texts is held by a gate that folds comment markers and line breaks and fails on a planted copy with the residue clause cut"

key-files:
  created:
    - .changeset/devtools-capacity-change-reads.md
    - .planning/milestones/v1.6-phases/QD-61-decisioncache-is-asked-only-the-question/61-SETTLED-ITEMS.md
  modified:
    - spec/README.md

key-decisions:
  - "ADR-QD-181, BEH-QD-676 to 680 and INV-QD-381 to 382 are named Unused in the row; scripts/next-id.mjs was never run"
  - "CCR-QD-455 is corrected by a statement in CCR-QD-459, never by an edit of the old row"
  - "no WX-* requirement and no HYGN-* requirement is ticked here; WX-01 to WX-07 wait for the milestone audit and 68-15 ticks HYGN-01 to HYGN-07"

requirements-completed: [HYGN-05, HYGN-07, WX-02, WX-07]

coverage:
  - id: D1
    description: "CCR-QD-459 row written after the documents it cites were bumped; every revised document cited at its current Revision; strict traceability green"
    requirement: WX-02
    verification:
      - kind: other
        ref: "bash <S>/v11-1b.sh (the plan's Task 1 verify): README SHA-256 c3769468..., adjacency, six columns, unused ids, ccr-row.mjs `ccr-row: 11 document(s) cited at their current Revision`, verify-traceability --strict PASS 21 FAIL 0 SKIP 0, spec-revise --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "the phase's one changeset, a @qadi/devtools patch, and no text states the capacity change's rethrow without its residue"
    requirement: WX-07
    verification:
      - kind: other
        ref: "node <S>/rethrow-gate.mjs over the six texts prints `rethrow-gate: 8 statement(s) in 6 file(s) carry the replacement`; exits 1 on a copy of the changeset with the residue clause cut"
        status: pass
    human_judgment: false
  - id: D3
    description: "HYGN-05: the two settled items of Phase 61 confirmed in a new archive file with evidence, no source edit"
    requirement: HYGN-05
    verification:
      - kind: other
        ref: "bash <S>/v11-2.sh (the plan's Task 2 verify): the template with the phase base filled in, ASCII, four identical ingest lines at the base and at HEAD, d0ca3df6 four and three doc-comment lines, only the new file differs in the archive, one added changeset, no CHANGELOG or tag moved, one commit with the trailer"
        status: pass
    human_judgment: false
  - id: D4
    description: "OI-26 to OI-29 recorded with the reason each cannot be changed"
    requirement: HYGN-07
    verification: []
    human_judgment: true
    rationale: "A record's wording (what each item says it cannot be changed because of) is judged by reading, not asserted by a test; the verify checks the row's shape, its citations and its unused ids"

duration: 8min
completed: 2026-11-21
---

# Phase QD-68 Plan 11: the register, the one changeset and Phase 61's settled items Summary

**CCR-QD-459 written after every document it cites was bumped (11 at their current Revision, README 1.273), the phase's one `@qadi/devtools` patch changeset, and Phase 61's two settled items confirmed in a new archive file with re-runnable evidence; `verify-traceability.sh --strict` is green again at 21 passes.**

## Performance

- **Duration:** about 8 min
- **Started:** 2026-11-21T12:32Z (approximate)
- **Completed:** 2026-11-21T12:40Z
- **Tasks:** 2
- **Files modified:** 3 (one modified, two created)

## Accomplishments

- WX-02: the CCR-QD-459 row is the line after CCR-QD-458, has the register's six columns, cites the 11 revised spec documents each at its current Revision, and names the reserved ids used (ARCH-115, CCR-QD-459) and Unused (ADR-QD-181, BEH-QD-676 to 680, INV-QD-381 to 382). It records the phase's fixes and the OI-09 correction: CCR-QD-455's statement that a capacity change's publish throw leaves before `begin()` and starts no read described an order of two calls that is gone; the throw is rethrown once the read has started, and the one residue (TF29) is stated in the same sentence.
- WX-07 and OI-09: `.changeset/devtools-capacity-change-reads.md` is the one changeset, a `@qadi/devtools` patch. `rethrow-gate.mjs` counts 8 statements of the rule in 6 files (`TimelineFeed.ts`, the devtools README, ADR-QD-177, BEH-QD-656, the README row and the changeset), each carrying the residue; it exits 1 on a planted copy of the changeset with the clause cut.
- HYGN-05: `61-SETTLED-ITEMS.md` is the only change in Phase 61's archive. Its evidence holds: the `ingest` paragraph's four lines are identical at the phase base and at HEAD, and `d0ca3df6` changes four lines of `Simulator.test.tsx` and three of `EvaluationMetrics.ts`, each a doc-comment line. It is ASCII and names the phase base by its full hash.
- HYGN-07 (OI-26 to OI-29, recorded, not changed): four Phase 64-05 commits carry a Sonnet trailer (the row also counts Phase 63's 14 and Phase 62's 35; published history is not rewritten); WX-01 to WX-07 stay unticked until the milestone audit; the limits phases 62 to 67 stated and accepted; the plan verifies of 63-05, 66-04 and 66-05 that could not pass on a correct tree stay as written.

## Task Commits

1. **Task 1: tracer, the CCR-QD-459 row, the README bump, strict traceability green** - verified end to end (`PASS: 21   FAIL: 0   SKIP: 0`) and committed with Task 2, because the plan names one `docs(68-11)` commit for the three files
2. **Task 2: the changeset and Phase 61's settled items** - `eacfeb6c` (docs)

**Plan metadata:** the commit that holds this SUMMARY, STATE.md and ROADMAP.md (docs: complete plan)

## Files Created/Modified

- `spec/README.md` - the CCR-QD-459 row after CCR-QD-458; Revision 1.272 to 1.273 through `spec-revise` (SHA-256 `c3769468...`)
- `.changeset/devtools-capacity-change-reads.md` - the `@qadi/devtools` patch note (SHA-256 `ea3c0b37...`)
- `.planning/milestones/v1.6-phases/QD-61-decisioncache-is-asked-only-the-question/61-SETTLED-ITEMS.md` - HYGN-05's record

## Decisions Made

None beyond the plan: the row, the changeset and the record are the plan's verbatim texts, each extracted and checked by SHA-256 before it was used (the record with `<phase_base>` replaced by `3d66becb9034fb16ffd97ccd5966b92d972e3b8e`).

## Deviations from Plan

None - plan executed exactly as written.

One execution note, not a deviation: the plan's two `<automated>` verifies are `bash -c '...'` one-liners with an embedded `'"'"'`. Run from a scratch script file (`v11-1b.sh`, `v11-2.sh` in the scratch directory) the quoting trick is unneeded, so the one error message that held an apostrophe reads `registers columns` there; every condition is the plan's own and both scripts exit 0.

## Issues Encountered

None. `.changeset/` already holds the earlier phases' changesets, so the verify's "exactly one added changeset" is measured against the phase base (`git diff --diff-filter=A <B> HEAD -- .changeset`), where it is this plan's alone.

## Known Stubs

None.

## Threat Flags

None. No network endpoint, auth path or schema changed; no `packages/*/src`, bench or `package.json` file was touched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 68-12 (the mutation close of the six edited files against the base, and the close scan).
- `scripts/next-id.mjs` was not run; no CHANGELOG moved; nothing was versioned, published, tagged or pushed.
- WX-01 to WX-07 and HYGN-01 to HYGN-07 are not ticked here, as the orchestrator's notes require; 68-15 ticks HYGN-01 to HYGN-07.

## Self-Check: PASSED

- `.changeset/devtools-capacity-change-reads.md`, `61-SETTLED-ITEMS.md` and `spec/README.md` exist; commit `eacfeb6c` is an ancestor of HEAD.
- Task 1 and Task 2 verifies exit 0 on HEAD after the commit; `commits: 1` is measured from the ledger (`6928d657..eacfeb6c`).

---
*Phase: QD-68-hygiene-and-recorded-close-outs*
*Completed: 2026-11-21*
