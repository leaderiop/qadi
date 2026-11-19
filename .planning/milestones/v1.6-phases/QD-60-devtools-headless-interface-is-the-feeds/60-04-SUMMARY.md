---
phase: QD-60-devtools-headless-interface-is-the-feeds
plan: 04
subsystem: devtools
tags: [gate-14, packed-consumer, feeds]
phase_base: 35a48554388da6c68940c1b94a1cc526b3111eae
requires: [60-03]
provides:
  - "gate 14's packed consumer builds a timeline feed from the installed @qadi/devtools root and asserts its status Reading, compiled with skipLibCheck: false"
affects: [60-05, 60-06, 60-07, 60-08]
actuals:
  tokens: 2500
  tasks: 1
  commits: 1
plan_head_before: 027e9640d05c68e79d7c56e00cb1ff1f595066ac
plan_head_after: 657c64e6
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-60 Plan 04: The packed devtools root builds a timeline feed

**Gate 14's consumer imports `makeTimelineFeed` and `sourceFromRecords` from the installed `@qadi/devtools` root, builds one feed in `Effect.scoped` over the fixture's record, and asserts `Reading`; the package manifest is unchanged.**

## Commits

| Task | Commit | Subject | Files |
| ---- | ------ | ------- | ----- |
| 1 | `657c64e6` | `test(60-04): the packed devtools root builds a timeline feed` | `scripts/check-package-install.mjs` |

`commits: 1` is measured from the ledger (`027e9640..657c64e6`); the SUMMARY commit is separate.

## Deviations from Plan

None - plan executed exactly as written.

## Verifies (all exit 0)

```
node scripts/check-package-install.mjs:  package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))
grep verifies (import line, expect("devtools feed", fedStatus, "Reading"), const stored): ok
history verify: test(60-04) 657c64e6 holds the script alone
git diff phase_base..HEAD -- packages/devtools/package.json: empty
```

## Known gates (expected red)

- `node scripts/check-api-surface.mjs`: still red, closed by 60-07.
- `node scripts/check-doc-examples.mjs` and `node scripts/check-website-doc-examples.mjs`: still red, closed by 60-06.
- `pnpm check:pr` was not run; it stays red until 60-06 and 60-07 land.

## Next plan must know

- The consumer asserts only the status the build sets; no feed is sampled (research Pitfall 5).
- `.planning/config.json`, `.planning/state.json` and the `*.iter*.md` files remain untouched and unstaged.

## Known Stubs

None.

## Self-Check: PASSED

Commit `657c64e6` is an ancestor of `HEAD`; the script exists and holds the probe; the task verifies exited 0.
