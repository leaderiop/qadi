---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 07
subsystem: spec-records
tags: [spec, behaviours, invariants, traceability, registry-lease, activity]
requires: [82-06]
provides:
  - BEH-QD-746 to BEH-QD-750 in spec/behaviors/09-react.md (Rev 3.21), each with a REQUIREMENT block, ADR-QD-195 as its decision and the tests that pin it
  - INV-QD-409 and INV-QD-410 in spec/invariants.md (Rev 1.223)
  - BEH-QD-067 and BEH-QD-516 restated (one registry for the provider's life, recycled, never disposed); the integration appendix (Rev 1.4) no longer says the provider disposes its registry
  - traceability rows (Rev 1.317) for the five behaviours, the two invariants, the lease and lifetime test files and the restated edges row; ADR-QD-195 (Rev 1.2) links all seven records
affects: [82-08, 82-09, 82-10]
key-files:
  created: []
  modified:
    - spec/behaviors/09-react.md
    - spec/invariants.md
    - spec/appendices/react-integration.md
    - spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "Decided autonomously: BEH-QD-067's amendment is a dated blockquote under its requirement that states the change without quoting the old wording, because the plan's own verify refuses the old sentence anywhere in the file"
  - "Decided autonomously: the two limits a recycle costs a host (a subjectless or never-answered seeded gate staying Pending, a host's own registry subscription detached) are stated in BEH-QD-067's note and in BEH-QD-750, each with its test label (LT9, LT10, LT15)"
  - "Decided autonomously: per-behaviour rows for BEH-QD-746 to BEH-QD-750 sit in a small table under traceability section 1's range table, because the plan's verify needs a row that begins with the behaviour's link and section 1 held none"
requirements-completed: [LEASE-05, WX-02]
duration: 14min
completed: 2026-11-25
status: complete
commits: 2
plan_head_before: 42c409b44ede8742777974c1cdf1482b61402cef
plan_head_after: c2d6d23d7e7517e5fedff7f3141681aa083770bc
actuals:
  tokens: 52000
  tasks: 2
  commits: 2
---

# Phase QD-82 Plan 07: The lifetime rule as five behaviours and two invariants Summary

**BEH-QD-746 to BEH-QD-750 and INV-QD-409 and INV-QD-410 state the provider's registry lifetime (one registry built in render, recycled in place by the lease, the latest subject written back, no seed re-applied), each naming the lifetime, lease and edges tests that pin it, with BEH-QD-067, BEH-QD-516 and the integration appendix restated so no spec document says the provider disposes its registry.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-11-25T01:42:00Z
- **Completed:** 2026-11-25T01:56:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Task 1 (tracer): five sections after BEH-QD-740 in `09-react.md`. BEH-QD-746 (a long hide then a reveal throws nothing and renders the decision: LT1 to LT4, LT6), BEH-QD-747 (one registry for the provider's life, `AtomsReplaced` still reported: LT4 to LT8, LT13), BEH-QD-748 (one recycle per release a hold did not cancel, a read straggling after the release recreates a node nothing holds: RL1 to RL10, LT5, LT14, the edges unmount test), BEH-QD-749 (the latest committed subject written back, never one read in render: LT6, LT13) and BEH-QD-750 (neither `initialValues` nor a seed re-applied, with the four recorded losses: LT9, LT10, LT11, LT15, edges). Traceability rows, the two new section 4 rows (`RegistryLease.test.ts`, `QadiProvider.lifetime.test.tsx`) and the restated edges row; ADR-QD-195 links the five; the CCR-QD-474 row lists the revised documents.
- Task 2: INV-QD-409 (no consumer reaches an unusable registry) and INV-QD-410 (one registry for the provider's life), each with Source, Implication, Enforcement and Related; BEH-QD-067's requirement now reads "own one registry for its life, and MUST NOT release it while any of its effects hold it" with a paragraph pointing to ADR-QD-195 and BEH-QD-748 and stating the two limits; BEH-QD-516 reads "until the provider's registry is recycled, and the recycle writes the subject back"; the appendix diagram says `recycles` and the paragraph says the provider keeps its registry for its life; the section 2 rows and the invariant links in the three behaviours and in ADR-QD-195.

## Task Commits

1. **Task 1: BEH-QD-746 to BEH-QD-750, traced** - `67d93554` (docs)
2. **Task 2: INV-QD-409 and INV-QD-410, BEH-QD-067, BEH-QD-516 and the appendix restated** - `c2d6d23d` (docs)

**Plan metadata:** the commit that carries this file, STATE.md and ROADMAP.md.

## Verification

Each task's automated verify ran and passed (its greps, then `node scripts/spec-revise.mjs --check`, `node scripts/check-doc-examples.mjs` with 119 blocks compiling, `bash spec/scripts/verify-traceability.sh --strict` at `PASS: 21 FAIL: 0 SKIP: 0`, and `82-check.mjs scan-ids`). Because `82-check.mjs commit` is a post-commit check, each commit was made with `git commit` and then confirmed by it (rc 0 for both). `82-check.mjs trailers` reports 28 plan commits, each with one Claude trailer. `scripts/check-house-style.mjs` (610 files clean) and `scripts/check-dod-table.mjs` also pass. No `packages/*/src` file changed.

## Decisions Made

See `key-decisions`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Traceability section 1 held no per-behaviour rows**
- **Found during:** Task 1
- **Issue:** the plan's verify requires a row beginning `| [BEH-QD-746]` in `traceability.md`, but section 1 is a per-file range table and no such row exists for any behaviour.
- **Fix:** the file 09 range row names `BEH-QD-746–750` and `RegistryLease.ts`, and a five-row table (behaviour, title, source module, test) sits under the range table, which the strict script does not parse and which links each behaviour's anchor.
- **Files modified:** `spec/traceability.md`
- **Committed in:** `67d93554`

**2. [Rule 3 - Blocking] The plan's verify refuses the old wording, so the amendment does not quote it**
- **Found during:** Task 2
- **Issue:** the verify fails if "MUST NOT dispose it" appears anywhere in `09-react.md`, and the spec's usual amendment banner quotes the replaced sentence.
- **Fix:** the dated banner under BEH-QD-067's requirement states what changed ("does not speak of a disposal", its earlier form required only that a double mount not dispose the registry) without the verbatim old text. The ADR keeps the past text.
- **Files modified:** `spec/behaviors/09-react.md`
- **Committed in:** `c2d6d23d`

**3. [Rule 1 - Accuracy] Wording the phase check refuses**
- **Found during:** Task 2
- **Issue:** `82-check.mjs scan-ids` refuses "no longer" in an added spec line (phase-relative wording).
- **Fix:** the banner reads "does not speak of a disposal".
- **Committed in:** `c2d6d23d`

---

**Total deviations:** 3 (2 blocking, 1 accuracy). **Impact:** none on scope; each makes a record state what the code shows and satisfy the plan's own checks. No `packages/*/src` file changed.

## Issues Encountered

None. The first commit attempt of Task 2 failed on a shell word-splitting slip (zsh does not split an unquoted variable); nothing was staged or committed, and it was redone with an array.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. Spec text only. T-82-20 (the subjectless pending seed and the detached host subscription are stated, each with the test that pins it: LT10, LT15) and T-82-21 (every new section names its tests; strict traceability and doc examples pass at each commit) are mitigated. T-82-SC: no package installed, no manifest or lockfile changed.

## Self-Check: PASSED

- FOUND: `## BEH-QD-746` to `## BEH-QD-750` in `spec/behaviors/09-react.md`; `## INV-QD-409` and `## INV-QD-410` in `spec/invariants.md`; the appendix diagram says `recycles`
- FOUND: commits 67d93554 and c2d6d23d on `arch-wave-15`; `git rev-list --count 42c409b4..HEAD` read 2 before this file
- `node scripts/spec-revise.mjs --check` passes; strict traceability prints `PASS: 21 FAIL: 0 SKIP: 0`; doc examples compile; `82-check.mjs scan-ids` and `trailers` pass

## Next Phase Readiness

Ready for 82-08: the lifetime rule is specified and traced. The ADR, five behaviours and two invariants all link each other, and the CCR-QD-474 row lists every document revised so far (README Rev 1.395). The changeset, the website's React page, the api-surface check and the completed CCR-QD-474 row are 82-08's.

---
*Phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime*
*Completed: 2026-11-25*
