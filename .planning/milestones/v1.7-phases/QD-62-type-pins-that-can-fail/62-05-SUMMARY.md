---
phase: QD-62-type-pins-that-can-fail
plan: 05
subsystem: testing
tags: [tstyche, type-tests, house-style, control-check, plugin-drift]
phase_base: 4cab2e74afd9487e19d9f025dd7a6436e459ba5c
plan_head_before: a2259a8f122d60f1c6477659b6b3cf5ec8e6f426
plan_head_after: 066f415f1c4c3387a91765940eebaca2f3f94162
requires: [62-04]
provides:
  - "[not-callable-control] in scripts/check-house-style.mjs: every negative pin has a same-form, same-kind, same-subject positive twin that tstyche runs"
  - "readJsonc, nearestPlugins and [tstyche-plugin-drift]: tstyche's plugin entry equals the base's apart from floatingEffect, and the base keeps floatingEffect on"
  - AGENTS.md section 6 paragraph naming both checks
affects: [62-06, 62-07, 62-08]
tech-stack:
  added: []
  patterns: ["a gate that reads pins with a bracket-matching parse and refuses any pin it cannot read", "JSONC reading via blankCode with keepStrings"]
key-files:
  created: []
  modified:
    - scripts/check-house-style.mjs
    - tsconfig.tstyche.json
    - AGENTS.md
decisions:
  - "The control check is a floor; each twin's single variable stays a hand review, stated in AGENTS.md section 6"
  - "FloatingEffectPins.tst.ts is the only file exempt from the run-mode and directive refusal"
requirements: [PIN-02, PIN-04, WX-04, WX-06]
metrics:
  duration: ~15min
  completed: 2026-11-20
status: complete
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase QD-62 Plan 05: Twin control and plugin-drift checks Summary

`node scripts/check-house-style.mjs` now fails on a negative type pin with no same-subject positive twin, on a twin that tstyche would not run as an ordinary passing test, and on tstyche's plugin entry drifting from the base's. Its clean line is unchanged: `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`.

Both checks were clean on the tree at the first run, so no twin from 62-02 needed fixing. No requirement is marked complete here; 62-08 owns that.

## RED evidence

`[not-callable-control]` (`red-control.mjs`, scratch in `/private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd62-red`, not committed):

```
ok  admit's twins removed: exit 1
ok  Deny's control removed: exit 1
ok  aliased expect: exit 1
ok  twin split over lines (clean): exit 0
ok  twins moved into test.skip: exit 1
ok  fixme on the twins: exit 1
ok  a focused test: exit 1
ok  a to-do test: exit 1
ok  skip in a comment (clean): exit 0
red matrix: 9 scenario(s) as expected
```

`[tstyche-plugin-drift]` (`red-drift.mjs`):

```
ok  a base setting dropped: exit 1
ok  floatingEffect on: exit 1
ok  tstyche.json pointed back: exit 1
ok  plugins in tsconfig.test.json: exit 1
ok  a comment added (clean): exit 0
ok  base floatingEffect off: exit 1
ok  base floatingEffect error (clean): exit 0
red matrix: 7 scenario(s) as expected
```

`git status --porcelain -- packages` was unchanged after the control matrix, and the four configs hashed the same before and after the drift matrix.

## Verification

`pnpm test:tstyche` (66 files, 347 tests, 756 assertions passed, 3 fixme; compiles under `./tsconfig.tstyche.json`), `pnpm typecheck` and `pnpm lint` all exit 0. The `tsconfig.tstyche.json` header change is comments only.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- scripts/check-house-style.mjs, tsconfig.tstyche.json, AGENTS.md modified; commits 8eb935d5 and 066f415f on `arch-wave-12`.
