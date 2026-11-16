---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
fixed_at: 2026-11-16T04:02:25Z
review_path: .planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-REVIEW.md
iteration: 2
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase QD-48: Code Review Fix Report

**Fixed at:** 2026-11-16T04:02:25Z
**Source review:** .planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 4 (WR-01, IN-01 to IN-03; scope `--all`)
- Fixed: 4
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`).

## Fixed Issues

### WR-01: The base characterisation no longer pins the default configuration's output for ten of the eleven leaves

**Files modified:** `packages/audit/test/AuditWriteOutput.test.ts`, `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md` (Rev 1.5), `spec/README.md` (Rev 1.215, CCR-QD-439 row)
**Commit:** 1d7ff083
**Applied fix:** The row assertions moved into one `assertRow(o, row)`. Each leaf first runs with `{ onRefused: false }`, the default configuration the base characterisation ran. Every leaf except `Refused` then runs a second time with `{ onRefused: true }` and is held to the same literals, including the empty `refusals`, which can fail in that run. `Refused`'s hook is still the separate test. No expected value changed, and the IN-06 closed keying (`BY_LEAF`, `LEAF_PATHS`) is unchanged. ADR-QD-161's Consequences now says three things: every expected value is unchanged after every commit; the test still observes each leaf with no hook, as the default sink runs; and later commits only added to it (the hooked run and the closed leaf lists). The CCR-QD-439 row cites Rev 1.5.

### IN-01: The tests still narrow `report.log` with `typeof … === "object"`

**Files modified:** `packages/audit/test/UnwrittenRow.test.ts`, `packages/audit/test/AuditWriteOutcome.test.ts`
**Commit:** 216746da
**Applied fix:** `UnwrittenRow.test.ts` uses `assert.isDefined(log); if (log === undefined) return;`, and `AuditWriteOutcome.test.ts` uses `log?.level`. No `typeof log === "object"` is left in `packages/audit`.

### IN-02: `durabilityOf`'s doc comment names the row's readers without the wording

**Files modified:** `packages/audit/src/AuditWriteOutcome.ts`
**Commit:** ebf40d27
**Applied fix:** The comment now reads "…the unwritten line's level and wording read, so they cannot disagree". This matches `UnwrittenRow.ts`, BEH-QD-578 and ADR-QD-161 decision 3. Only the comment changed.

### IN-03: The upgrade prose says the annotations carry "nothing else from the refused record"

**Files modified:** `apps/website/src/content/docs/docs/reference/upgrading.md`, `.changeset/audit-refusal-is-cores.md`, `spec/behaviors/33-audit-pipeline.md` (Rev 1.25), `spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md` (Rev 1.6), `spec/README.md` (Rev 1.216, CCR-QD-439 row)
**Commit:** 7ff85185
**Applied fix:** Four places now state INV-QD-104's exception precisely: the annotations carry no value from the record, but `qadi.path` is made of the record's own keys, so a resource keyed by data puts that key in the line. Where each change went:
- The 0.13 upgrade prose.
- The changeset's "To log a refusal" sentence.
- ADR-QD-161 decision 2.
- BEH-QD-577's `onRefused` requirement.

I left the ADR-QD-056 and ADR-QD-095 amendments alone, because they do not describe what the annotations carry. The README and `capabilities.md` lines ("nothing else from the entry") are about the unwritten lines, not refusals, so I left them as well. BEH-QD-250's narrative already says "never a value from the record". In the CCR-QD-439 row, I also added a missing comma between the BEH Rev 1.22 and Rev 1.23 entries.

## Checks

- `pnpm exec vitest run --project audit`: 28 files, 526 tests pass. The test count is unchanged, because the hooked run is inside each leaf's existing `it`.
- `pnpm typecheck`, `pnpm circular` (no cycle), `pnpm test:tstyche` (289 tests, 606 assertions), `pnpm spec:verify:strict` (21 PASS, 0 FAIL), `node scripts/spec-revise.mjs --check`, `pnpm spec:examples` (116 blocks), `pnpm spec:website-examples` (66 blocks) and `pnpm spec:api` (928 exports): all pass.
- `pnpm lint`: house-style clean (526 files). The only warnings are pre-existing ones in files this fix did not touch (`.codex/`, `scripts/`).

## Mutation

`packages/audit/src/AuditWriteOutcome.ts` was the only src file changed (a doc comment). I ran `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditWriteOutcome.ts' < /dev/null` on it:

| File | Score | Killed | Survived |
| ---- | ----- | ------ | -------- |
| `AuditWriteOutcome.ts` | 100 | 2 | 0 |

`AuditDecisionSinkLive.ts`, `AuditWriteReport.ts`, `AuditEntry.ts` and `UnwrittenRow.ts` were not changed in this iteration, so I did not re-run them. Their iteration-1 scores were all 100.

---

_Fixed: 2026-11-16T04:02:25Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
