---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 14
subsystem: verification sweep
status: complete
tags: [hygn-06, re-verification]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-13's staleness record and the reverify.mjs and sweep-check.mjs helpers; 68-04's, 68-08's and 68-03's changes to the covered files
provides:
  - "63-VERIFICATION.md, 64-VERIFICATION.md and 65-VERIFICATION.md each re-verified: a Re-verification section, a refreshed covered_digest, verdict passed"
affects: [68-15]

actuals:
  tokens: 9277
  tasks: 3
  commits: 3
plan_head_before: 0eacebd05dbc8cdfa99f2c09886a504ff97c9a5a
plan_head_after: 0ff620df01d973ff18cc74ae9caf6bd316a94884
commits: 3

tech-stack:
  added: []
  patterns:
    - "a verification report kept whole, with a dated section appended and only its digest line replaced"

key-files:
  created: []
  modified:
    - .planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-VERIFICATION.md
    - .planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-VERIFICATION.md
    - .planning/phases/QD-65-only-admit-builds-an-admitted/65-VERIFICATION.md

key-decisions:
  - "Phase 65's Truth 4 (the bench) is answered by Phase 68's bench of record and the gap is stated: no single run compares today's tree with Phase 65's base"
  - "each report's merge-gate row is answered by naming 68-15's one check:pr run, not run here"

requirements-completed: []

coverage:
  - id: D1
    description: "Phase 63 re-verified and current: GSD reads it passed, 68-stale.mjs reads it current (HYGN-06)"
    requirement: HYGN-06
    verification:
      - kind: other
        ref: "Task 1 verify: `sweep-check: Phase 63 re-verified, 4 spot-check row(s), verdict passed`, `Phase 63 re-verified and current`"
        status: pass
    human_judgment: false
  - id: D2
    description: "Phase 64 re-verified and current (HYGN-06)"
    requirement: HYGN-06
    verification:
      - kind: other
        ref: "Task 2 verify: `sweep-check: Phase 64 re-verified, 6 spot-check row(s), verdict passed`, `Phase 64 re-verified and current`"
        status: pass
    human_judgment: false
  - id: D3
    description: "Phase 65 re-verified and current (HYGN-06)"
    requirement: HYGN-06
    verification:
      - kind: other
        ref: "Task 3 verify: `sweep-check: Phase 65 re-verified, 9 spot-check row(s), verdict passed`, `Phase 65 re-verified and current`"
        status: pass
    human_judgment: false
---

# Phase 68 Plan 14: The Re-verification of Phases 63, 64 and 65 Summary

Phases 63, 64 and 65 are re-verified against the tree Phase 68 leaves: each report is kept whole, gains one `## Re-verification (2026-11-21, Phase 68 sweep)` section and a recomputed `covered_digest`, and reads `passed`. `68-stale.mjs` now ends `redo: 66 67`.

## Verdicts and commits

| Phase | Commit | Spot-check rows re-run | Changed covered files read | Verdict |
| ----- | ------ | ---------------------- | -------------------------- | ------- |
| 63 | `44a87d05` | 4 (3 run, 1 answered by 68-15) | `scripts/check-package-install.mjs` | passed |
| 64 | `1d472db7` | 6 (5 run, 1 answered by 68-15) | `packages/devtools/README.md`, `DiagnosticsFeed.ts`, `TimelineFeed.ts`, `spec/overview.md` | passed |
| 65 | `0ff620df` | 9 (7 run or read, 1 answered by 68-15, 1 changed by 68-04 and answered in the section) | `Admission.ts`, `Admission.test.ts` | passed |

Each commit holds only its report, with exactly the trailer; each task's `<verify>` passes on HEAD. Run one at a time, in the foreground, with nothing beside them. GSD's `verification.status` reads each of 63, 64 and 65 `passed`; `68-stale.mjs` reads each `current`.

## What the re-verification found

- **Phase 63.** All four truths hold. 68-08 changed the guard's mechanism: it counts the `make*Feed` calls the consumer's run made, through a module hook, instead of reading calls from a TypeScript parse. The report's wording of Truth 1 (the parse) and its Info row (a call written but never run counts as probed) no longer describe the code; that case now fails. Gate 14 on the tree exits 0 (`9 package(s) ... (524 runtime export(s))`), the base-fixture guard is RED with the same three lines, `check-dod-table.mjs` passes, and 68-08's eight-plant script ends `pi-plants: all passed`.
- **Phase 64.** All four truths hold. 68-04 changed the code behind the report's "narrowed resize-path caveat": a capacity change's publish now stops no read (`try { push() } finally { readSource(...) }`), with the residue that a status listener throwing on the `Reading` a read publishes over a `Stopped` replaces the timeline listener's throw (TF29). The 8 files run: 157 tests pass; the characterisation files' diff is empty (the pathspec selects the three tracked files).
- **Phase 65.** All five truths hold. `admit` now reads `policy`, `maxDepth` and `subject` once; the report's audit rows saying the depth check reads `policy` and `maxDepth` apart no longer describe the code, and the texts were amended with it. The 25 tests, the pins (6 tests, 23 assertions) and `pin-codes.mjs` (TS2673 at line 62, TS2741 at line 68) pass. Truth 4's sentence that no code token changed after the bench no longer holds; see below.

## One thing the section states and does not close

Phase 65's Truth 4 rests on a bench of the code as it stood then. `Admission.ts` changed after it, and Phase 68's bench of record measures the final tree against Phase 68's base, not Phase 65's: gate pass, `# slower: 0`, geomean `+0.01%`, worst `+4.7%` on `evaluate :: field-heavy — anyOf of 8 under Union` (reference spread 2.1%), under a stricter 5% limit than Phase 65's. Its arms differ in six source files, so the delta is not attributed to `admit`. The section records that two measurements joined stand behind ADMT-04 and that no single run compares today's tree with `d1ac1df0`. It does not run the bench. The verdict is `passed` on that reading; it is the one judgment in this plan the owner may want to look at.

## Deviations from Plan

None - plan executed exactly as written. Three reading notes, none a deviation:

- The `close-scan.txt` precondition of 68-13 carries over: `close-scan-reordered.txt` ends `close-scan: 13 checks passed`, which 68-12 and 68-13 recorded and this plan accepted as the task note says.
- Each report's evidence was checked for a vacuous pathspec. Phase 63's `packages/` claim is true only of that phase's own range (checked with a glob form), Phase 64's `'*.characterisation.test.tsx'` is not vacuous (it selects 3 files), and Phase 65's `packages` ranges are not vacuous. The originals are untouched.
- A shell command of mine that waited on stdin ran into the tool timeout once and was stopped; it wrote nothing to the repository.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `63-VERIFICATION.md`, `64-VERIFICATION.md` and `65-VERIFICATION.md` exist; commits `44a87d05`, `1d472db7` and `0ff620df` are ancestors of HEAD, each with exactly the trailer.
- All three task verifies were re-run after the third commit and pass; nothing under `packages`, `features`, `scripts`, `spec` or `AGENTS.md` changed since `ec10b608`.
- Scratch lived under the temporary `qd68` directory and in a gitignored `.scratch/` directory, which was deleted afterwards.
