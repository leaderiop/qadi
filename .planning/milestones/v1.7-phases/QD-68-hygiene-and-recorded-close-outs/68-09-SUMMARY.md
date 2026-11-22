---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 09
subsystem: completed-phase record scripts (Phases 65, 66, 67)
status: complete
tags: [hygn-07, oi-22, oi-23, oi-25, record-scripts]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-08's last commit ca9ffb18 (HEAD at start was its docs commit 4c9395ae)
provides:
  - "Phase 66's scorer matches a mutant by status, mutator, replacement and its line carried through git diff -U0, and counts mutants as a multiset (OI-23)"
  - "Phase 65's pin-codes loads the TypeScript tstyche's store holds for tstyche.json's target and ends with a diagnostic count (OI-22)"
  - "Phase 67's self-test covers the dirty-tree refusal at each mode's dispatch and the status reader's paths, 11 cases to 17 (OI-25)"
affects: [68-15]

actuals:
  tokens: 30000
  tasks: 2
  commits: 1
plan_head_before: 4c9395aed6e95174c0bb27b7e1bed2ec771ce870
plan_head_after: 35597a5cce31e70ab4ca614bdfa577ddceaee53b
commits: 1

tech-stack:
  added: []
  patterns:
    - "a record script is fixed only if the records it reads still pass, and a plant that the base passes fails the fix"

key-files:
  created: []
  modified:
    - .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation.mjs
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs

key-decisions:
  - "OI-22, OI-23 and OI-25 are fixed because each script's committed records still pass; no record of Phases 65 to 67 changed"

requirements-completed: [HYGN-07]
completed: 2026-11-21
---

# Phase 68 Plan 09: the completed phases' record scripts Summary

Three completed-phase record scripts now read what they claim to read: Phase 66's scorer keys a mutant by its carried line and counts duplicates, Phase 65's pin-codes loads tstyche's own TypeScript and counts what it printed, and Phase 67's self-test exercises the dirty-tree refusal at every mode.

## Commit

- `35597a5c` `fix(68-09): the completed phases' record scripts fixed where their records still pass` (the three scripts, one commit)

## Items

- **OI-23 (Phase 66 scorer).** A mutant is matched by status, mutator, replacement and its line mapped through `git diff -U0 <base head> <close head>`, never by its line's text; every comparison counts mutants as a multiset, so a second copy of one is new. `compare` on the committed 66 records exits 0 and still ends `no touched file's score fell, and no mutant on a line the phase wrote is left open` (`UntrustedDecode.ts` 46/48, `EnvelopeKeys.ts` 66/66). Plants (scratch, `$TMPDIR/qd68/m66-plants.mjs`):

  | Plant | Fixed scorer | Base scorer |
  |-------|--------------|-------------|
  | p1, the second `UntrustedDecode.ts` survivor on line 240 becomes another mutant on that line | exit 1, `UntrustedDecode.ts:240 has a new Survived mutant: EqualityOperator -> unwalked.size >= 0` | exit 0 |
  | p2, a Survived `{}` on line 167, a line whose text the base exempts | exit 1, `UntrustedDecode.ts:167 leaves open a mutant on a line the phase wrote: Survived BlockStatement -> {}` | exit 0 |

- **OI-22 (Phase 65 pin-codes).** It reads `tstyche.json`'s `target` and loads that TypeScript with `Store.load` from `tstyche/api`, not one pnpm store path. Output: `TS2673 62: …`, `TS2741 68: …`, then `pin-codes: 2 diagnostic(s) in WalkEnvironment.tst.ts under TypeScript 6.0.3`; the two codes the Phase 65 record names are unchanged.
- **OI-25 (Phase 67 scorer).** The refusal is moved into a `dispatch(modes, mode, args, status, refuse)` over a `MODES` table, and `refuseDirty` becomes `gitStatus`. `--self-test` prints `self-test: 17 passed` (11 at the base); `compare` on the committed 67 records exits 0. `m67-plants.sh` (scratch) ends `m67-plants: all passed` with three `ok` lines: `clean` (`if (false)` in dispatch) and `rec` (`record` marked `clean: false`) each fail with `ran, wanted refused`, and `paths` (the status reader reading `CHANGED`) fails with `the status reader does not read the files a record reads`.

## Verification

- Both task `<verify>` blocks pass on HEAD after the commit, including the one-commit, exact-three-files and trailer checks.
- SHA-256 of the scripts equal the plan's: `66-mutation.mjs` `0bb25e64…`, `pin-codes.mjs` `3f3b3729…`, `67-mutation.mjs` `94f8b5b6…`; the patch, `m66-plants.mjs` and `m67-plants.sh` matched theirs before use.
- No JSON or Markdown record of Phases 65 to 67 differs from phase_base `3d66becb`.
- No `packages/*/src`, bench or `package.json` file changed.

## Limits

- The 67 self-test's check that `gitStatus` reads `FILES` compares the function's source text (`gitStatus.toString()`), as the plan states; a reformatting of that line fails it by design.
- Only the plants the plan names were run; the base scorers' false greens on p1 and p2 are as the plan recorded, and were re-confirmed here (orig-p1 and orig-p2 exit 0).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- The three scripts exist and the commit `35597a5c` is an ancestor of HEAD.
- `git rev-list --count 4c9395ae..35597a5c` is 1, matching `commits: 1`.
