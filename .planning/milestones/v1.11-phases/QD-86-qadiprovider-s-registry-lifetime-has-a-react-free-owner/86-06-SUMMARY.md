---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
plan: 06
subsystem: spec
tags: [spec, records, adr, registry-owner, traceability, ccr]

phase_base: 41c53c65c3ceb60f974650dd374f391c81db56e7
plan_head_before: f3362a1483dcd137920a58a0a71c603a809f2b20
plan_head_after: f4525b44facaec0fd852b9481e1b2d901d20fa86
commits: 1

requires:
  - phase: QD-86 plan 02
    provides: 86-check.mjs `records [--close]`, `scan-ids`, `trailers`
  - phase: QD-86 plan 04
    provides: RegistryOwner.test.ts rows RO1 to RO16 and the owner's mutation record
  - phase: QD-86 plan 05
    provides: the forwarding provider the records describe
provides:
  - spec/decisions/199-a-providers-registry-lifetime-has-a-react-free-owner.md (new, Rev 1.0), with the render-suite audit table and `Tests removed: 0.`
  - ADR-QD-195 at Rev 1.4 with a dated amendment note, the index status line and the owner's enforcement lines
  - BEH-QD-766, BEH-QD-767, INV-QD-417, INV-QD-418, their traceability rows and the CCR-QD-478 row (`Unused: BEH-QD-768, BEH-QD-769, BEH-QD-770`)
  - BEH-QD-747 to 750, BEH-QD-067, INV-QD-409, INV-QD-410 and their traceability rows restated to name the owner
affects: [QD-86 plans 07 and 08]

actuals:
  tokens: 21000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a records plan edits the registers once: new ADR at 1.0, amended ADR at the next revision through spec-revise, every Pinned by naming the new test file first"
    - "a Pinned by row list written as `(RO8; RO11)` so the records check reads each row id"

key-files:
  created:
    - spec/decisions/199-a-providers-registry-lifetime-has-a-react-free-owner.md
  modified:
    - spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md
    - spec/decisions/index.yaml
    - spec/behaviors/09-react.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "The refresh difference is stated as the owner's write leaving a seeded node nothing has read carrying its preserve flag, and says that once anything reads the node a refresh resets it whatever the owner does (RO16's second commit reads without a refresh for that reason)"
  - "The effect order is quoted as read from react-dom 19.3.1's commitHookEffectListMount (one try, declaration order), not as an observed ORDER line, because no rendered test observes commit-before-hold; the records say the order is held by the provider's shape and review, not by a merge gate"
  - "INV-QD-417 says the rule is kept by the owner's tests, its mutation scope and review, and that no merge gate checks the no-React import or the provider's lack of a branch"

patterns-established:
  - "an owner-first Pinned by: the new headless test file opens each restated behaviour's paragraph and the older render citations follow"

requirements-completed: []

coverage:
  - id: D1
    description: "ADR-QD-199 at Rev 1.0 (QADI-ADR-199, status amends ADR-QD-195) with the owner, inert construction and seed order, the recycle, the one commit, detection in the owner, the unguarded write, the forwarding provider, every ADR-QD-195 rejection re-listed as still rejected, the refresh difference, the effect order on React 19.3.1, the lease header, and the audit table followed by `Tests removed: 0.`"
    requirement: PREG-05
    verification:
      - kind: other
        ref: "Task 1 and 3 verifies: records --close, verify-traceability --strict, spec:examples"
        status: pass
    human_judgment: false
  - id: D2
    description: "BEH-QD-766 and 767, INV-QD-417 and 418 written with Pinned by rows that exist; BEH-QD-768 to 770 not written; BEH-QD-747 to 750 name RegistryOwner.test.ts first; INV-QD-409 and 410 name RegistryOwner.ts; no row names a deleted ref"
    requirement: PREG-05
    verification:
      - kind: other
        ref: "86-check.mjs records --close; grep of spec for the four deleted ref names (empty)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every header moved only through spec-revise, the CCR-QD-478 row names ARCH-133, every document with its printed revision, the refresh difference, the zero-removal audit, the two documents read and left unchanged, and the unused ids; one commit holds exactly the seven spec files"
    requirement: WX-02
    verification:
      - kind: other
        ref: "Task 3 verify: spec-revise --check, pnpm spec:verify:strict, spec:examples, spec:api, spec:gates, spec:claims, records --close, scan-ids, git diff against phase_base for react-integration.md, AGENTS.md and overview.md, the commit's name list"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-11-25
status: complete
---

# Phase 86 Plan 06: The registry owner records Summary

**ADR-QD-199 records the React-free registry owner with its render-suite audit (`Tests removed: 0.`) and the one deliberate `registry.refresh` difference, ADR-QD-195 is amended to Rev 1.4, and BEH-QD-766/767, INV-QD-417/418 and CCR-QD-478 land with every restated record naming the owner, in one commit.**

## Performance

- **Duration:** about 12 min
- **Tasks:** 3 (tracer, auto, auto); nothing committed until Task 3, as the plan states
- **Files created:** 1 (and this summary); 6 modified
- **Commits:** 1

## Accomplishments

- **ADR-QD-199** (Rev 1.0, `QADI-ADR-199`, status `Accepted — amends ADR-QD-195`): Decision items for the owner module, inert
  construction and the seed order, the recycle, the one commit, detection in the owner with reporting in the component, the
  unguarded write, the forwarding provider and keeping every render test; Alternatives re-lists all nine of ADR-QD-195's
  rejections as still rejected and adds eight more (three ordered effects, detection in the component, a boolean return, the
  owner importing the signals, the `registry.get` pre-check and its unconditional variant, folding into the hold effect,
  folding the lease in, amending ADR-QD-195 alone); Consequences state the refresh difference, the effect order on React 19.3.1,
  the held lease header that still names the provider as its caller, the mutation record (19 of 19) and the 20-row audit
  table ending `Tests removed: 0.`.
- **ADR-QD-195** at Rev 1.4: a dated note opens its Decision and extends decisions 2, 3 and 4 to the owner; a note under the
  mutation record, a line in "What enforces it" and a Related link name the owner; the status line records the amendment in the
  file and in `index.yaml`. No older sentence changed (the diff is additions plus the header).
- **BEH-QD-766** (commit is one transition, reported then recorded then written, before the hold) and **BEH-QD-767** (building
  schedules nothing) after BEH-QD-750; BEH-QD-747 to 750 restated to name the owner and open their `Pinned by` with
  `RegistryOwner.test.ts` rows; BEH-QD-067 gains an amendment note and a `Pinned by` paragraph.
- **INV-QD-417** and **INV-QD-418** after INV-QD-416; INV-QD-409 and 410's Source and Enforcement name `RegistryOwner.ts` and its
  tests, and no `registryRef`, `latestRef`, `leaseRef` or `atomsIdentityRef` remains anywhere under `spec/`.
- Traceability: a new sub-table for the owner's two behaviours, INV-QD-417 and 418 rows, the ADR-QD-199 row, rows for
  `RegistryOwner.test.ts` and `QadiProvider.owner.characterisation.test.tsx`, the restated BEH-QD-746 to 750, INV-QD-409,
  INV-QD-410, ADR-QD-195 and lifetime-test rows, and the `09 — React Integration` summary row.
- **CCR-QD-478** row with every revision `spec-revise` printed (README 1.412, ADR-QD-195 1.4, 09-react 3.23, invariants 1.231,
  traceability 1.331, ADR-QD-199 1.0), the refresh difference, the zero-removal audit, `spec/appendices/react-integration.md`
  section 3 and AGENTS.md read and unchanged, and `Unused: BEH-QD-768, BEH-QD-769, BEH-QD-770`.
- Green: `spec-revise --check`, `pnpm spec:verify:strict` (21 checks), `spec:examples`, `spec:api`, `spec:gates`,
  `spec:claims`, `86-check.mjs records --close`, `scan-ids`, `scan-forbidden`, `trailers`.

## Task Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer), 2, 3 | `f4525b44` | `docs(86-06): record the registry owner` |

## Deviations from Plan

**1. [Plan defect, fixed in place] Task 1's strict-traceability verify cannot pass before the CCR row exists**
- **Found during:** Task 1
- **Issue:** Task 1's verify runs `verify-traceability.sh --strict`, whose "CCR register coverage" check fails for any
  `CCR-QD-NNN` cited under `spec/` that has no row in `spec/README.md`. The new ADR, BEH and INV records cite CCR-QD-478 in Task 1,
  and the plan writes its row only in Task 3.
- **Fix:** a short CCR-QD-478 row (documents, ARCH-133, the unused ids) was written in Task 1 and replaced by the full row in
  Task 3, the same "row begun" step earlier CCR rows record. The verify itself is unchanged.
- **Files modified:** spec/README.md
- **Commit:** `f4525b44`

**2. [Plan wording] BEH-QD-747 cites RO8, RO11 and RO14, not RO12 and RO14**
- **Issue:** the proposed citation put RO12 (a `reset` replaced after construction is the one a recycle calls) first for "a
  provider holds one registry"; that row is about the recycle reaching the property, not about one registry.
- **Fix:** RO8 (a swap reported once, which keeps the registry), RO11 (seeded at construction) and RO14 (one registry object)
  open BEH-QD-747's `Pinned by`. BEH-QD-749 also cites RO6 and BEH-QD-750 also cites RO13, which hold their prose.
- **Commit:** `f4525b44`

**3. [Plan wording] `Pinned by` row lists are written `(RO8; RO11)`, not `RO8 and RO9`**
- **Issue:** `86-check.mjs records` reads a row id only after `(` or `;` or as `A to B`, so `C4 and C8` would be unchecked.
- **Fix:** `(C4; C8)`, `(RO1; RO3)` and the like, so every cited row is checked against a title that opens it.
- **Commit:** `f4525b44`

**4. [Plan wording] BEH-QD-067 had no `Pinned by` paragraph; one was added**
- The plan says to name the cells beside its existing tests, but the section had none. The paragraph cites `RegistryOwner.test.ts`
  (RO11; RO16), the characterisation (C1; C5; C9), `QadiProvider.subject.test.tsx` (SUBJ1 to SUBJ3) and `QadiAtoms.test.ts` (RC-01).

**5. [Measured] The owner's behaviours get their own traceability sub-table, and ADR-QD-195's header status is edited too**
- The ARCH-129 table keeps its heading; BEH-QD-766 and 767 sit in a new ARCH-133 table, as each earlier phase did. ADR-QD-195's
  `Status` row in its own header carries the amendment as well as `index.yaml` (ADR-QD-193 and ADR-QD-185 do the same).

**6. [Plan verify, noted] `sed -n "83p;85p;273p"` in Task 2 reads other rows after Task 1's inserts**
- Inserting the new sub-table moves the INV-QD-410 row from 273 to 280. The check still passes and is weaker than its intent, so
  the whole of `spec/` and `apps/website/src` was searched for `registryRef|latestRef|leaseRef|atomsIdentityRef` instead: none.

**Total deviations:** 6 (1 plan defect, 5 wording or measured). **Impact:** none on what any record states or what any check proves.

## Issues Encountered

`pnpm spec:verify:strict` finished in well under the two minutes the run rules allowed for. No `.vitest/` directory was created
and `git status --porcelain -- packages` is empty.

## Known Stubs

None.

## Threat Flags

None. T-86-18 holds (ADR-QD-199 and the CCR row both state the refresh difference and the audit; `records --close` refuses an ADR
without either) and T-86-19 (every cited row id and title opens a test in the named file, and strict traceability finds every
named test file).

## Next Phase Readiness

Ready for plans 07 and 08. The records read the code as it is on this branch: the owner, its rows, the characterisation and the
forwarding provider all exist. `spec/appendices/react-integration.md`, `AGENTS.md` and `spec/overview.md` equal `phase_base`.

## Self-Check: PASSED

- Files: `spec/decisions/199-a-providers-registry-lifetime-has-a-react-free-owner.md` and this summary exist.
- Commit `f4525b44` is an ancestor of HEAD, with the one Co-Authored-By trailer; the commit holds exactly the seven spec files.
- All three task verifies passed; `node 86-check.mjs records --close` passes; `git status --porcelain -- packages` is empty.
