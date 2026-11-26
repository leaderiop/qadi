---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 08
subsystem: testing
tags: [fold-spike, madge, tsc, scratch-clones, patch-hashes]

requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: 91-check.mjs (scratch, spike, commit, scratch-clean modes and EXPECTED_VERDICTS), the recorded phase_base
provides:
  - 91-SPIKE.md, the verdict table of the ten fold candidates with patch hashes, madge counts and tsc results
  - ten reproducible patches under spike/ and their madge and tsc outputs under spike/out/
affects: [91-09 through 91-19 (each fold folds only an acyclic candidate), 91-20, 91-21 (the ADR-QD-037 amendment cites this record)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 469af8cc23e2ca025c8701589850f68c6602eb16
plan_head_after: 0e17865884da4d331856d13bd15d4e62f152551d
commits: 1

actuals:
  tokens: 14000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a candidate is a patch on a scratch clone of the base, measured by the gate's own commands, and judged by a script that re-applies it"
    - "a clone's per-package node_modules is a real directory of links, so a relative `@qadi/*` link resolves to the clone's own package"

key-files:
  created:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-SPIKE.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/a.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/b.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/b-prime.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/b-double-prime.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/c.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/d.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/e.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/e-prime.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/e-prime-fold.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/f.patch
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/spike/out/ (a .madge.txt and a .tsc.txt per candidate, plus base)
  modified: []

key-decisions:
  - "The barrel line of an absorbed file is replaced by a named export of the names it carried, so the barrel compiles and publishes what it did before"
  - "The clones' per-package node_modules are real directories of links (the plan's stated layout), not the scratch mode's whole-directory symlink"

requirements-completed: []

duration: 8min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 08: The fold spike Summary

**Ten fold candidates measured on scratch clones of phase_base: seven acyclic and tsc-clean, three cycles, every verdict the one research expected, each with a hashed patch and its raw madge and tsc output.**

## Performance

- **Duration:** about 8 minutes
- **Started:** 2026-11-26T17:58Z (approx.)
- **Completed:** 2026-11-26T18:06Z
- **Tasks:** 2 of 2
- **Files committed:** 33 (the verdict file, ten patches, twenty-two outputs)

## Accomplishments

- `spike base: 69e5247d…` (equal to `phase_base`), `madge files base: 251` (unedited clone: 251 files, no cycle, `tsc` exit 0).
- The verdict table, measured against `EXPECTED_VERDICTS`; no difference:

| Candidate | What | madge | files | tsc | Verdict | Expected |
| --------- | ---- | ----- | ----: | --- | ------- | -------- |
| a | PortSpanDecode into PortSpanEncode | none | 250 | exit 0 | acyclic | acyclic |
| b | PortInterpreter into PortSpan | none | 250 | exit 0 | acyclic | acyclic |
| b-prime | PortInterpreter into PortSpanEncode | `core/src/PortSpan.ts > core/src/PortSpanEncode.ts` | 250 | exit 0 | cycle | cycle |
| b-double-prime | PortSpanDecode into PortSpan | `core/src/PortSpan.ts > core/src/PortSpanEncode.ts` | 250 | exit 0 | cycle | cycle |
| c | GateRegistry into GateWriter | none | 250 | exit 0 | acyclic | acyclic |
| d | SequenceIntegrity into ArchiveFacts | none | 250 | exit 0 | acyclic | acyclic |
| e | Hydration into HydrationEngine as written | `react/src/QadiAtoms.ts > react/src/HydrationEngine.ts` | 250 | exit 0 | cycle | cycle |
| e-prime | HydrationTarget alone | none | 251 | exit 0 | acyclic | acyclic |
| e-prime-fold | HydrationTarget, then the fold | none | 250 | exit 0 | acyclic | acyclic |
| f | EvaluationSpan into PortSpanEncode | none | 250 | exit 0 | acyclic; not folded | acyclic |

- `f` is acyclic and `tsc`-clean, and `node scripts/check-house-style.mjs` in that clone throws `ENOENT` opening `packages/core/src/EvaluationSpan.ts` and exits 1 (recorded under `house-style:` in `spike/out/f.tsc.txt`). It is not folded (D-22).
- Patch SHA-256 values are in the table of `91-SPIKE.md`; `91-check.mjs spike` checks each against its row, and `spike --rerun` re-applied all ten to fresh clones and re-measured them: exit 0.
- The main tree was never edited: `git status --porcelain -- packages scripts spec` prints nothing, and `91-check.mjs unchanged` over the twelve named source files exits 0.

## Task Commits

1. Task 1 (the ten patches and their outputs) and Task 2 (the verdict table) share one commit, as the plan's single commit subject requires: `0e178658` `docs(91-08): record the fold spike`. Verified with `91-check.mjs commit "docs(91-08): record the fold spike" <91-SPIKE.md and every spike file>` (exit 0, one trailer).

## Deviations from Plan

### Plan defects (nothing weakened)

**1. [Plan defect] The scratch mode does not build per-package link directories.** The plan and research Pitfall 7 say the scratch mode builds them. `makeScratch` symlinks each `packages/*/node_modules` to the main checkout's directory as a whole, so a relative link such as `@qadi/core -> ../../../core` resolves to the main checkout's `packages/core`, not the clone's. A core candidate would then be measured against the main tree's core by react and devtools. Before: a clone from `scratch` as it stands. After: `layout.mjs` (a scratch helper, not committed, not in the repository) replaces each of those nine symlinks with a real directory holding copies of its links (`.bin`, `.vite*` and the self-link skipped), and `packages/react/node_modules/@qadi/core` was checked to resolve to `<clone>/packages/core`. `91-SPIKE.md` states the layout and how it was made. `91-check.mjs` is unchanged, and `spike --rerun`, which makes its clones with the scratch mode's own layout, agreed on all ten candidates, so the verdicts do not depend on the layout; a later plan that needs the escape check to be silent-escape-sensitive (research P2) must build the real directories itself or fix `makeScratch`.

### Choices the plan left open (autonomous, most complete option)

**2.** The barrel line of an absorbed file is replaced by a named export of the names it carried (`export { decodePortSpan } from "./PortSpanEncode.ts"`, `export { makeGateRegistry }` plus a type group from `GateWriter.ts`, `export { SequenceIntegrityError, verifySequenceIntegrity } from "./ArchiveFacts.ts"`, and a named block for `Hydration.ts`'s names). The plan allowed dropping the line or pointing it at the target; a star line at a target holding more than the absorbed file did would publish names the folds must keep private. `b` and `b-double-prime` need none (their target is already a star line). `f` touches no barrel.

**3.** The unedited clone's own outputs are committed as `spike/out/base.madge.txt` and `base.tsc.txt` (the plan asked only that the count be recorded). They sit under `spike/`, which the commit rule allows.

**4.** Tasks 1 and 2 are one commit: the plan names one commit subject and `PHASE_COMMITS` holds one row for it. The Task 1 verify (`unchanged`) was run before the commit and the Task 2 verify (`spike`, `spike --rerun`, `commit`) after.

**5.** `plan_head_before` is the HEAD at the start (`469af8cc`): no per-plan ledger file existed for 91-08 in `.git`, and `commits: 1` is `git rev-list --count 469af8cc..HEAD` before this summary's commit.

### Observations that are not deviations

- `b-prime` is `tsc`-clean here (declaration placed before its first use); research's TS2448/TS2454 on it came from where its patch placed the declaration. The cycle verdict does not depend on it.
- The recorded madge outputs carry the clone's absolute path in pnpm's banner line and the `f` house-style stack trace; `judgeRerun` compares only the verdict line and the (file, code) groups, so the paths do not matter.
- The `d` patch leaves a doubled ` *` line in `ArchiveFacts.ts`'s header comment. It is a measurement patch, not the fold; plan 12's real edit writes that paragraph.

**Total deviations:** 1 plan defect (a tool layout claim that does not hold), 4 open choices. **Impact:** none on the verdicts; the phase proceeds, because every measured verdict equals the expected one.

## Issues Encountered

- The first layout helper threw on `.bin` (real files, not links) after already removing the clone's symlink; the clone was rebuilt from the scratch mode and the helper skips `.bin`. Nothing outside `<S>` was touched.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None. T-91-18 is mitigated as planned: each verdict names a patch with its SHA-256 and its raw outputs, and `spike --rerun` reproduces them. No candidate reached the main tree; `scratch-clean` removed `<S>` after the commit.

## Next Phase Readiness

Later plans fold exactly `a`, `b`, `c`, `d`, and Hydration through `e-prime` then `e-prime-fold`; `b-prime`, `b-double-prime` and `e` are recorded refusals for the ADR-QD-037 amendment; `f` stays apart (D-22).

## Self-Check: PASSED

- `91-SPIKE.md`, ten `spike/<id>.patch` files and the twenty-two `spike/out/*.txt` files exist; `91-check.mjs spike` and `spike --rerun` exit 0.
- Commit `0e178658` is an ancestor of HEAD, with the subject `docs(91-08): record the fold spike` and one trailer.
- `git status --porcelain -- packages scripts spec` prints nothing; `scratch-clean --check` passes (`<S>` is gone).
