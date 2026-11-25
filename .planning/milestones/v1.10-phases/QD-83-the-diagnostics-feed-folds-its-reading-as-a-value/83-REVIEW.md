---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
reviewed: 2026-11-25T00:00:00Z
depth: standard
iteration: 3
files_reviewed: 29
files_reviewed_list:
  - packages/devtools/src/model/Diagnostics.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/Gates.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/PortCards.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/useDiagnostics.ts
  - packages/devtools/src/index.ts
  - packages/devtools/src/react/index.ts
  - packages/devtools/test/model/Diagnostics.test.ts
  - packages/devtools/test/model/Diagnostics.tst.ts
  - packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.superseded.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DockModel.reading.test.ts
  - packages/devtools/test/surface.tst.ts
  - scripts/check-package-install.mjs
  - .changeset/devtools-diagnostics-has-no-questions.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - apps/website/src/content/docs/docs/packages/devtools.md
  - packages/devtools/README.md
  - spec/decisions/196-the-diagnostics-feed-folds-its-reading-as-a-value.md
  - spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md
  - spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/behaviors/28-devtools-screens.md
  - spec/invariants.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase QD-83: Code Review Report (iteration 3)

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 29
**Status:** clean

## Summary

I re-reviewed the phase's change (`git diff bc02e8e6..HEAD`), with attention to the latest fix commit `9f081401`. I found no bug, security defect or house-rule violation.

- **Commit `9f081401` is cosmetic.** It wraps comments and calls in `DiagnosticsFeed.superseded.test.ts` and `Diagnostics.test.ts`. The SR1 title string is unchanged. It sits on its own line inside `it.effect(`, at 131 columns, which is one literal and was kept intact as instructed. Re-indenting the body one level changed no statement. I ran both files: 2 files and 30 tests pass.
- **The one other line over 90 columns** is `superseded.test.ts:40`, at 91 columns. The fixer disclosed it. It is not a finding.
- **Source is untouched by the fix.** `git diff --quiet HEAD -- packages/devtools/src` is clean.
- **`DiagnosticsFeed.ts` and `Diagnostics.ts`** are consistent with their doc comments.
  - The run guard (`runs.isCurrent(token)`) comes before the read, the fold and the `sampled = true` write. `SupersedingRun.fork`'s `onFailure` is itself gated on `isCurrent`, so a superseded run's defect is never stated as a stop.
  - `foldReading` builds an object literal naming every field of `Diagnostics`. The return-type check makes a new field a compile error.
  - `mergeReading` copies the four fields and drops `questions`, as `DockModel.reading`'s doc comment says.
- **The package-install consumer** declares `// @ts-expect-error` on the `questions` field and checks `"questions" in after.reading` is false. `surface.tst.ts` pins `foldReading` and `DiagnosticsSink` out of the root and `keyof Diagnostics` to the four fields.
- **`scripts/check-house-style.mjs`** budget key was renamed with the type-test file. The call count (3) is unchanged.

IN-02 and IN-03 from iteration 1 were declined with reasons that iteration 2 confirmed. I did not re-raise them.

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
