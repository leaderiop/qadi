---
phase: QD-62-type-pins-that-can-fail
plan: 06
subsystem: testing
tags: [tstyche, type-tests, floatingEffect, definition-of-done, gate-11]
phase_base: 4cab2e74afd9487e19d9f025dd7a6436e459ba5c
plan_head_before: 71e3ad5617863a33f051904112dfc6434465cb0c
plan_head_after: 7ab77aa6ff7c93060b386170ea942c3d2521382e
requires: [62-05]
provides:
  - "scripts/run-tstyche.mjs: tstyche under tsconfig.tstyche.json (rule off) then tsconfig.test.json (rule on), skip-text guard, per-pass project check"
  - "test:tstyche is node scripts/run-tstyche.mjs; DoD row 6, its paragraph, ADR-QD-037's heading and AGENTS.md section 6 agree with it under gate 11"
affects: [62-07, 62-08]
tech-stack:
  added: []
  patterns: ["spawnSync(process.execPath, fixed argv), no shell", "read the reporter's 'uses TypeScript ... with <project>' lines to prove which tsconfig compiled each file"]
key-files:
  created:
    - scripts/run-tstyche.mjs
  modified:
    - package.json
    - spec/process/definitions-of-done.md
    - spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md
    - AGENTS.md
decisions:
  - "Each characterisation half runs in exactly one pass: pass 1 skips the rule-on block, pass 2 the config block"
  - "A pass fails when tstyche names a project other than its own, or none, so a type test outside the include cannot run under baseline"
requirements: [PIN-04, WX-04, WX-06]
metrics:
  duration: ~20min
  completed: 2026-11-20
status: complete
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase QD-62 Plan 06: Step 6 runs tstyche under each floatingEffect setting Summary

`pnpm test:tstyche` now runs `scripts/run-tstyche.mjs`: tstyche under `tsconfig.tstyche.json` (rule off), then under `tsconfig.test.json` (rule on), so a bare negative pin on an Effect subject cannot keep a passing twin. Requirement ids are left for the 62-08 close sweep.

## Results

- `node scripts/run-tstyche.mjs` exits 0. Both passes print `Test files: 66 passed, 66 total`.
  - Pass 1: `Tests: 346 passed, 1 skipped, 347 total`, `Assertions: 753 passed, 3 fixme, 3 skipped, 759 total`.
  - Pass 2: `Tests: 345 passed, 2 skipped, 347 total`, `Assertions: 753 passed, 6 skipped, 759 total`, compiled under `./tsconfig.test.json`.
  - Timing: about 20 s wall for both passes (roughly 10 s each, cold); the DoD paragraph says "about eight seconds" per the plan's text.
- Gate 11: `dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve`.
- `node scripts/check-house-style.mjs`: `560 file(s) clean (3 declared switch(es), 66 type-test file(s))`. `pnpm lint` exits 0.
- `git diff --quiet 4cab2e74 -- 'packages/*/src'` is clean.

## RED evidence

Scratch scripts in `$TMPDIR/qd62-red` (never committed); no probe file remains, `packages/` is unchanged.

- Rule-on probe (`packages/core/test/ZzRuleOnProbe.tst.ts`, a positive and a bare negative pin on an Effect subject): `pass 1 exit 0, pass 2 exit 1, house-style exit 1, run-tstyche exit 1` then `rule-on RED: pass 1 green, control check silent, pass 2 red; probe removed`. House-style exit 1 is the probe's uncounted pin budget row, as expected.
- Guard matrix: `ok title renamed`, `ok planted in another type test`, `ok twice in the characterisation`, `ok rule-on title renamed`, then `guard RED: 4 scenario(s) refused`; each refused before pass 1.
- Baseline probe (`scripts/ZzBaselineProbe.tst.ts`): `probe alone exit 0, run-tstyche exit 1` then `baseline RED: the probe passes alone, and both passes refuse it; probe removed`.
- Gate 11 with `package.json` changed alone (3 drifts):
  - `[mismatch] step 6 is node scripts/run-tstyche.mjs in package.json and tstyche in the table`
  - `037-...-gates.md:83 [unnamed] names gate 6 without naming the command it means`
  - `definitions-of-done.md:108 [stale] names gate 6, and the command in this paragraph is step 1`
- Twin: gate 11 refuses the old row 6 (`[mismatch] step 6`); AGENTS.md names the two passes.

## Deviations from Plan

None. The script, package.json, DoD row/paragraph, ADR heading and AGENTS.md block were applied verbatim.

Note: `pnpm lint` reports one warning on `scripts/run-tstyche.mjs:40` (`eslint(no-control-regex)` on the verbatim colour-code regex `COLOUR`). Exit status 0, so not a gate failure; left as the plan specifies byte for byte.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- scripts/run-tstyche.mjs FOUND; commits ac329b40 and 7ab77aa6 are ancestors of HEAD; probes absent.
