---
phase: QD-65-only-admit-builds-an-admitted
fixed_at: 2026-11-20T20:45:00Z
review_path: .planning/phases/QD-65-only-admit-builds-an-admitted/65-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase QD-65: Code Review Fix Report

**Fixed at:** 2026-11-20
**Source review:** .planning/phases/QD-65-only-admit-builds-an-admitted/65-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (WR-01, plus IN-01 by the orchestrator's instruction)
- Fixed: 2
- Skipped: 0
- Left alone on purpose: IN-02, IN-03 (recorded for the milestone audit)

## Fixed Issues

### WR-01: "One read of the question" overclaims

**Files modified:** `packages/core/src/Admission.ts`, `spec/decisions/172-admission-produces-the-one-walk-environment.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/behaviors/05-evaluator.md`
**Commit:** a23dacf1
**Applied fix:** Every text now says only that the question's resource and action are each read once.
- `SUPPLIED` comment: "in which `admit` read the question's resource and action once each".
- ADR-QD-172 Decision 3 and the 2026-11-20 amendment: the flag and "the resource or action it describes" come from one read of the question's resource or action.
- INV-QD-376 retitled "...come from one read of the question's resource and action". The anchor changed to `#inv-qd-376-the-supplied-flags-and-the-matcher-context-come-from-one-read-of-the-questions-resource-and-action`. The old anchor was linked from `spec/invariants.md` (INV-QD-375 Related), `spec/traceability.md` (the row and the ADR-QD-172 row) and `spec/behaviors/05-evaluator.md` (BEH-QD-662). All four links were updated, and a grep for the old anchor finds none left outside the phase's historical plan and summary files.
- The traceability row title matches the new INV title.
- No text claims `policy`, `maxDepth` or `subject` are read once, and none claims a compile-time guarantee.
- Revisions bumped with `scripts/spec-revise.mjs ... --date 2026-11-20`: `invariants.md` 1.162 to 1.163, `traceability.md` 1.229 to 1.230, `behaviors/05-evaluator.md` 1.18 to 1.19, ADR-QD-172 1.1 to 1.2.

### IN-01: `Admitted.admit` doc cited INV-QD-364 for the read-once rule

**Files modified:** `packages/core/src/Admission.ts`
**Commit:** c0be0db8
**Applied fix:** The doc now cites INV-QD-376. The optional INV-QD-375 citation on the class doc was not added.

## Comment-only proof for `Admission.ts`

Both commits were checked by scanning the file with TypeScript 6.0.3's scanner (`skipTrivia` on, so every comment is dropped) and diffing the token streams.
- WR-01 commit against its parent: 364 tokens, diff empty.
- IN-01 commit against its parent: 364 tokens, diff empty.
- The two commits together change only comment text. The first (WR-01) changed 2 lines of the `SUPPLIED` doc. The second (IN-01) changed 1 line of the `admit` doc.

## Verification

Run in the main checkout, because `workflow.use_worktrees` is `false`. No worktree was created.

- `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0. This is the script `pnpm spec:verify:strict` runs. `scripts/verify-traceability.mjs` does not exist in this repo.
- `node scripts/check-doc-examples.mjs`: 117 blocks compile.
- `node scripts/check-dod-table.mjs`: 25 steps match `pnpm check`, 151 references resolve.
- `node_modules/.bin/oxlint packages/core/src/Admission.ts`: clean (`oxlint` is not on PATH).
- `node scripts/check-house-style.mjs`: 560 files clean.
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest history entry.
- `pnpm vitest run --project core packages/core/test/Admission.test.ts`: 17 passed.
- `pnpm check:pr` was not run, as instructed.

Staged by explicit path only. `.planning/config.json` is still modified and unstaged, as it was before. No push, tag, release or changeset.

---

_Fixed: 2026-11-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
