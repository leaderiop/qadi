---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 13
subsystem: verification sweep
status: complete
tags: [hygn-06, staleness, re-verification]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-12's mutation close and close scan (ec10b608 is its last commit), 68-01's 68-stale.mjs
provides:
  - "68-STALENESS.md: 68-stale.mjs's output after the phase's last code commit, verbatim, with GSD's status of each of Phases 62 to 67 and the plan that re-verifies each"
  - "68-reverify.mjs: the committed helper for any re-verification after the sweep"
  - "Phase 62's report re-verified: a Re-verification section, a refreshed covered_digest, verdict passed"
affects: [68-14, 68-15]

actuals:
  tokens: 5283
  tasks: 2
  commits: 2
plan_head_before: ec10b6081026489f74d406e1d8a203de2874dc30
plan_head_after: abf47015ef551561779e2fcc431c878d43557ef7
commits: 2

tech-stack:
  added: []
  patterns:
    - "a verification report kept whole, with a dated section appended and only its digest line replaced"

key-files:
  created:
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-STALENESS.md
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-reverify.mjs
  modified:
    - .planning/phases/QD-62-type-pins-that-can-fail/62-VERIFICATION.md

key-decisions:
  - "Phase 62's merge-gate spot-check row is answered by naming 68-15's one pnpm check:pr run, not run here; the verdict says it stands only while that run is green"
  - "the report's WX-03 evidence command used a git pathspec that matches nothing; recorded in the new section's notes, the original text left whole"

requirements-completed: []

coverage:
  - id: D1
    description: "the staleness of Phases 62 to 67 after Phase 68 is recorded from the tree after the last code commit (HYGN-06)"
    requirement: HYGN-06
    verification:
      - kind: other
        ref: "Task 1 verify: `the sweep input is recorded: 6 stale`"
        status: pass
    human_judgment: false
  - id: D2
    description: "Phase 62 re-verified fully and current: GSD reads it passed, 68-stale.mjs reads it current (HYGN-06)"
    requirement: HYGN-06
    verification:
      - kind: other
        ref: "Task 2 verify: `sweep-check: Phase 62 re-verified, 6 spot-check row(s), verdict passed`, `Phase 62 re-verified and current`"
        status: pass
    human_judgment: false
---

# Phase 68 Plan 13: The Staleness Record and Phase 62's Re-verification Summary

All six of Phases 62 to 67 are stale after Phase 68; Phase 62's report is re-verified against today's tree and reads `passed`, with every truth and spot-check re-run and no gap.

## Staleness (HYGN-06 input)

`68-stale.mjs` ran on `ec10b608`, the commit after 68-12's last commit. Its output, and GSD's `verification.status` for each phase, are recorded verbatim in `68-STALENESS.md` (commit `030dcae5`, which also holds `68-reverify.mjs`, SHA-256 `8d660a21...`).

```text
62: stale, verification b9ab1ea2, 30 cited, 9 changed since
63: stale, verification 321e213d, 18 cited, 5 changed since
64: stale, verification af3ef24e, 25 cited, 11 changed since
65: stale, verification 30582032, 24 cited, 7 changed since
66: stale, verification ba4392cf, 23 cited, 8 changed since
67: stale, verification 4f9d906a, 30 cited, 5 changed since
redo: 62 63 64 65 66 67
```

GSD read all six `stale`. Re-verified by: 62 in 68-13, 63 to 65 in 68-14, 66 and 67 in 68-15. After this plan `68-stale.mjs` ends `redo: 63 64 65 66 67`.

## Phase 62 re-verification

Commit `abf47015`: only `62-VERIFICATION.md`. The report is kept whole; its `covered_digest` is now `v4:sha256:7fc32fe9...` (recomputed by `verification.fingerprint` over the same 23 covered files) and a `## Re-verification (2026-11-21, Phase 68 sweep)` section is appended. Its verdict is `passed`. Run one at a time, in the foreground, with nothing beside them:

- The four Observable Truths hold. The scripts 68-08 changed were run: `scripts/check-house-style.mjs` exits 0 (`560 file(s) clean (3 declared switch(es), 66 type-test file(s))`); `scripts/run-tstyche.mjs` exits 0 (66 passed in each of two passes, `Assertions: 759 passed, 3 fixme, 3 skipped, 765 total` then `759 passed, 6 skipped`).
- The planted probes failed as the report says: a negative pin on an Effect subject under `tstyche.json` (`Expression is callable with the given argument`), a twin-less budgetless pin under house-style (`[not-callable-pin]` and `[not-callable-control]`, exit 1), the rule-on block under the rule-off config (`Assertions: 3 failed, 5 passed`). The 62-06 rule-on and baseline probes were re-run too: both end RED as designed and removed their probe. After each, `git status` showed no probe and no change to `packages`, `scripts`, `spec` or `features`.
- The merge-gate row is answered by 68-15's one `check:pr` run, not run here. If that run fails, this section's verdict does not stand.

`sweep-check.mjs` printed `sweep-check: Phase 62 re-verified, 6 spot-check row(s), verdict passed`; GSD's `verification.status` reads Phase 62 `passed`; `68-stale.mjs` prints `62: current`.

Two things in the original report's evidence are recorded in the new section, not edited:

- The WX-03 row's `git diff --quiet 4cab2e74 -- 'packages/*/src'` matches no file (the pathspec does not select files below `src`; `git ls-files 'packages/*/src'` lists none), so its exit 0 proved nothing. With `'packages/*/src/**'` the claim holds for Phase 62's own range (0 files between `4cab2e74` and `b9ab1ea2`).
- The report's "27 files" for the pin budget reads as the rows besides the characterisation's; the budget and AGENTS.md's table both hold 28 entries, the same count as at the verification commit.

`62-VALIDATION.md` is `draft` with `nyquist_compliant: false`: reported, not edited.

## Deviations from Plan

**1. [Precondition] `close-scan.txt` does not end `close-scan: 13 checks passed`**
- **Found during:** Task 1 precondition
- **Issue:** `close-scan.txt` ends `FAIL 11 commits: out of order: test(68-06) ...`, the unmodified script's reading after the owner's 2026-11-21 reorder. 68-12 records this and ran a corrected copy; `close-scan-reordered.txt` ends `close-scan: 13 checks passed`, and 68-12's SUMMARY explains it.
- **Fix:** proceeded on the reordered result as 68-12 recorded it, so the precondition's substance (the close scan passes on the real commit order) holds. No condition was changed here.

**Total deviations:** 1, a precondition read against the file 68-12 explained. **Impact:** none on the repository.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `68-STALENESS.md`, `68-reverify.mjs` and `62-VERIFICATION.md` exist; commits `030dcae5` and `abf47015` are ancestors of HEAD, each with exactly the trailer.
- Both task verifies were re-run after the second commit and pass; nothing under `packages`, `features`, `scripts`, `spec` or `AGENTS.md` changed since `ec10b608`.
