---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
fixed_at: 2026-11-25T00:00:00Z
review_path: .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-REVIEW.md
iteration: 2
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase QD-83: Code Review Fix Report

**Fixed at:** 2026-11-25
**Source review:** .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 1 (fix_scope all; no necessity findings)
- Fixed: 1
- Skipped: 0

Edits and commits were made in the main checkout: `workflow.use_worktrees` is `false`. All verification ran there.

## Fixed Issues

### IN-01: the new SR1 title and the new WR-01 comment are not wrapped by hand

**Files modified:** `packages/devtools/test/model/DiagnosticsFeed.superseded.test.ts`, `packages/devtools/test/model/Diagnostics.test.ts`
**Commit:** 9f081401
**Applied fix:** Cosmetic, no logic change.
- `DiagnosticsFeed.superseded.test.ts`: the SR1 title string is unchanged and now sits on its own line inside `it.effect(` (title, then `() =>`, then the body one level deeper). No spec record quotes the title, and a grep of `spec/`, `scripts/` and `packages/` finds it only in this test file. The file's header comment, the `dying` collector's `snapshot` pipe, the `heard.push(...)` call and one inline comment were also wrapped, because this phase added them over about ninety columns.
- `Diagnostics.test.ts`: the raw-sample comment at line 274 is wrapped over two lines.

Remaining lines over ninety columns in the two files: the SR1 title itself (131 columns, one string literal, kept intact as instructed) and `heard.push(` argument line (91 columns). The other long lines in `Diagnostics.test.ts` predate this phase.

## Skipped Issues

None.

## Iteration 1

Findings in scope: 7. Fixed 5, declined 2. Report status was `partial`.

Fixed:
- WR-01 (the "four fields" test read the folded reading): commit `dc6b23c0`. The test now keeps the raw sample and asserts its keys; the three spec records citing it name the new title.
- WR-02 (nothing pinned that a superseded sample does not set `sampled`): commit `cd1e4d0a`. New row SR1 in a new file `DiagnosticsFeed.superseded.test.ts`, because `83-pinned-check.mjs` holds the characterisation file byte for byte.
- WR-03 (stale doc comment on `DockModelInputs.reading`): commit `4de493c1`. Comment only.
- IN-01 (changeset and upgrade entry omit the `questions` store): commit `b5221c9f`.
- IN-04 (lines over the hand-wrapped width in `Diagnostics.ts` and `DiagnosticsFeed.ts`): commit `6348a589`.
- Spec bookkeeping, the CCR-QD-475 row naming the final revisions: commit `d01fae8c`.

Declined (both re-checked by the iteration-2 reviewer against the code, who found the reasons true and did not re-raise them):
- IN-02 (characterisation header says rows are "left" in `DiagnosticsFeed.test.ts`): the file is a born file in `83-pinned-check.mjs`, held byte for byte, header included. Rewording it fails the check.
- IN-03 (a supplied reading carrying only `questions` still yields a new, content-identical shown reading): the reviewer's fix moved seven held tests, among them FC11, because the shown snapshot's identity change is what moves the questions join and the phase pins that moment as unchanged.

## Verification

All run in the main checkout, stdin closed where it applies, after commit 9f081401:

```
pnpm exec vitest run --project devtools packages/devtools/test/model   Test Files 55 passed (55); Tests 1530 passed (1530)
pnpm exec tsc -p tsconfig.test.json --noEmit                            no output, exit 0
node scripts/check-house-style.mjs                                      613 file(s) clean (3 declared switch(es), 77 type-test file(s))
pnpm exec oxlint packages/devtools/test/model                           no finding in the two edited files; the only output is existing prefer-as-const warnings in HeldChoice.test.ts
node 83-pinned-check.mjs --all-applied                                  6 files hold their base text, 2 of 2 born files held, 1 of 1 declared flips applied
```

`.planning/config.json` and `83-REVIEW.md` were already modified before this run and were not staged. The commit message ends with one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` line.

---

_Fixed: 2026-11-25_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
