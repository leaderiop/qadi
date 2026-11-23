---
phase: QD-73-one-pure-reconcile-for-gate-registration
plan: 06
subsystem: spec
tags: [spec, react, gates, reconcile, traceability]

requires:
  - phase: 73-05
    provides: the final test titles the Pinned-by paragraphs quote
provides:
  - "BEH-QD-701 to BEH-QD-705 in spec/behaviors/09-react.md (Rev 3.13)"
  - "INV-QD-391 and INV-QD-392 in spec/invariants.md (Rev 1.181)"
  - "traceability sections 1 to 4 rows for the keyed reconcile (Rev 1.256)"
  - "CCR-QD-465 in its final form (README Rev 1.302)"
affects: [73-07]

phase_base: 1dbaf1a932109af41278b9b56892083c6ec40913
plan_head_before: ae53861a801a407f25db47d65b78bfcf8dc83d60
plan_head_after: 2ec1b00036430e876c1d8c1ece0c57847d9ed614

actuals:
  tokens: 14000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a spec record names only titles that exist verbatim in the file it cites; the plan's verify resolves every one"

key-files:
  created: []
  modified:
    - spec/behaviors/09-react.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "BEH-QD-702 carries the failure-rule sentence word for word as reconcile's doc comment and ADR-QD-186 decision 6 state it, and adds the registry's own idempotent unregister and the standing-registration caveat from the doc comment"
  - "INV-QD-391's Enforcement says plainly that the GateCurrent refusal is an @ts-expect-error in the tst file, held by its compile and by no test title, and that no module diffing states is kept by review"
  - "INV-QD-392's Enforcement says tests only and that no type or lint rule counts the refs or effects"

requirements-completed: []  # RECN-05, WX-02, WX-03, WX-07 stay Pending by instruction; only 73-07 marks requirements

duration: ~25min
completed: 2026-11-23
status: complete
---

# Phase 73 Plan 06: The behaviours, invariants and change record of the keyed reconcile Summary

**BEH-QD-701 to BEH-QD-705, INV-QD-391 and INV-QD-392 are normative and traced, every quoted test title resolves in its file, and CCR-QD-465 names every revision and every changed package file exactly.**

## Accomplishments

- Task 1 (tracer), `aadea45b`: five behaviours after BEH-QD-694 under the exact headings ADR-QD-186 links, each with Invariant and See lines, a REQUIREMENT block, prose and a Pinned-by paragraph (5, 12, 6, 7 and 6 titles). Two invariants appended, each with Source, Implication, Enforcement and Related. Traceability: BEH-QD-701 to 705 and `GateWriter.ts` in the 09 row of section 1, two section 2 rows after INV-QD-390, ADR-QD-186's section 3 row now lists both invariants, and section 4 gains the ids on four existing rows and two new rows (`GateWriter.reconcile.tst.ts`, `GateRegistration.characterisation.test.tsx`). Revisions: 09-react 3.12 to 3.13, invariants 1.180 to 1.181, traceability 1.255 to 1.256, each through `spec-revise.mjs` dated 2026-11-22.
- Task 2, `2ec1b000`: CCR-QD-465's file and text cells replaced in place. The file list cites ADR-QD-186 1.0, ADR-QD-140 1.3, ADR-QD-111 1.2, ADR-QD-103 1.5, 09-react 3.13, invariants 1.181, traceability 1.256, README 1.302, the decisions index and the ten package files in brace groups; the text states the keyed map, the one step, the rollback rule with `AggregateError`, the handle-owned equal-state rule, the hook's one ref and effect, what the compiler refuses against what tests hold, the three moved registry cases, `No changeset` with `Rev 1.132`, and `Ids used: ... Unused: none.` README 1.301 to 1.302.

## What the records say about enforcement

- Compiler: an array for the wanted map, an `id` on the identity, the removed index-aligned `GateCurrent` type (an `@ts-expect-error`, not a titled test), and the fields of the three types. Pinned in `GateWriter.reconcile.tst.ts`.
- Tests only: the step's order, update half and failure rule, the single ref and one registration effect, behaviour preserved. Said as such in BEH-QD-701, BEH-QD-702 and INV-QD-391/392.
- Neither: that no other module diffs states. Said in BEH-QD-703 and INV-QD-391 as kept by review.

## Titles

Every title the plan listed exists verbatim in the file it names; none was cited differently. The plan's verify also resolves each one, and at least the planned count per BEH (5, 12, 6, 7, 6).

## Verification

- Task 1 verify (extracted from the plan and run unchanged): `behaviours and invariants recorded`.
- Task 2 verify (extracted from the plan and run unchanged): `change record complete`.
- `spec-revise --check` passes; `check-doc-examples` reads 118 blocks compile; `verify-traceability --strict` read `PASS: 21 FAIL: 0 SKIP: 0`, 164 invariants traced, 143 ADRs traced, 316 section 4 files exist.
- `check-api-surface` reads 941; `spec/overview.md`, AGENTS.md and the DoD table equal `phase_base`; `git diff <phase_base>..<plan_head_before> -- packages` equals `git diff <phase_base>..HEAD -- packages`: this plan changed no package file.
- Gate 13 for WX-03 adjacency, ordering and encoding is a backstop for 73-07's `pnpm check:pr`.

## Deviations from Plan

None - plan executed exactly as written.

One detail beyond the plan's wording, not a deviation: INV-QD-391's Related links INV-QD-064 by its real heading anchor (`inv-qd-064-a-guard-is-listed-only-by-the-registry-its-provider-writes-to`), computed from the heading and not guessed; `verify-traceability`'s link-integrity check passes with it.

## Known Stubs

None.

## Self-Check: PASSED

- `aadea45b` and `2ec1b000` are ancestors of HEAD; the measured count from the plan ledger is 2 commits.
- The four spec files hold the claimed content; the changed-file set of this plan is exactly the four spec files, with no `packages` file touched.
