---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
fixed_at: 2026-11-16T04:10:23Z
review_path: .planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-REVIEW.md
iteration: 3
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase QD-48: Code Review Fix Report

**Fixed at:** 2026-11-16T04:10:23Z
**Source review:** .planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 3 (IN-01 to IN-03; scope `--all`)
- Fixed: 3
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`). Every fix is spec text; no source or test file changed.

The fixes were committed in the order IN-03, IN-02, IN-01. That way the CCR-QD-439 row edit (IN-01) could cite the invariants, traceability and overview revisions the other two fixes made, with one `spec/README.md` bump instead of three.

## Fixed Issues

### IN-03: INV-QD-342 cites as enforcement a hook-payload assertion that cannot tell core's class from the removed one

**Files modified:** `spec/invariants.md` (Rev 1.138), `spec/traceability.md` (Rev 1.202)
**Commit:** 5b3d7c3b
**Applied fix:** INV-QD-342's Enforcement now cites three tests:
- `AuditRefusal.tst.ts`: the types of `encodeAuditEntry`'s error, both `onRefused` hooks and `Refused` are core's class.
- `AuditEntry.test.ts`: `encodeAuditEntry` fails with an instance of core's class.
- `AuditDecisionSinkLive.test.ts`: the hook receives an instance of core's class with no own `reason`.

It also says that `AuditWriteOutput.test.ts` pins only the payload's fields, which the removed class carried too, so that test characterises the payload and does not hold the invariant.

In `spec/traceability.md`, the INV-QD-342 row now lists `AuditDecisionSinkLive.test.ts` in place of `AuditWriteOutput.test.ts`. I also added INV-QD-342 to the test-file rows for `AuditDecisionSinkLive.test.ts` and `AuditEntry.test.ts`, which did not map it before.

### IN-02: The overview's `durabilityOf` row still names the line's level, not its wording, as a reader of the row

**Files modified:** `spec/overview.md` (Rev 1.117)
**Commit:** 2b83831f
**Applied fix:** The row now reads "…the unwritten line's level and wording read (ADR-QD-161)". `pnpm spec:api` passes.

### IN-01: The CCR-QD-439 row says the two characterisation files "stay unedited across the phase", and its file list omits `AuditWriteExits.test.ts`

**Files modified:** `spec/README.md` (Rev 1.217)
**Commit:** 14099ab2
**Applied fix:** The narrative now matches ADR-QD-161 Rev 1.5: the two files "were written on the phase base; their expected values are unchanged across the phase, and later commits only added the hooked run and closed the leaf lists."

`packages/audit/test/AuditWriteExits.test.ts` is added to the file list. Against `git diff --name-only c9fde4ba..HEAD -- packages spec apps .changeset`, it was the only phase-changed file the list omitted.

The row also cites this iteration's revisions: invariants Rev 1.138, overview Rev 1.117, traceability Rev 1.202, and `spec/README.md` Rev 1.210 to 1.217.

## Checks

- `pnpm exec vitest run --project audit`: 28 files, 526 tests pass.
- These all pass:
  - `pnpm typecheck`
  - `pnpm circular` (no cycle)
  - `pnpm test:tstyche` (289 tests, 606 assertions)
  - `pnpm spec:verify:strict` (21 PASS, 0 FAIL)
  - `node scripts/spec-revise.mjs --check`
  - `pnpm spec:examples` (116 blocks)
  - `pnpm spec:website-examples` (66 blocks)
  - `pnpm spec:api` (928 exports)
- `pnpm lint`: house-style is clean (526 files). The only warnings are pre-existing ones in files this fix did not touch (`.codex/`, `scripts/`, `packages/react/src/QadiAtoms.ts`).

## Mutation

No `packages/audit/src` file changed in this iteration, so I did not run Stryker. The iteration-1 and iteration-2 scores still apply: 100 for `AuditDecisionSinkLive.ts`, `AuditWriteReport.ts`, `AuditEntry.ts`, `AuditWriteOutcome.ts` and `UnwrittenRow.ts`.

---

_Fixed: 2026-11-16T04:10:23Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
