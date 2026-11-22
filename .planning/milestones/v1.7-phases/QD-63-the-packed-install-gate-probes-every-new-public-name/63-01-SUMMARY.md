---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
plan: 01
subsystem: build-gate
tags: [gate-14, package-install, probe-guard, typescript-unstable-sync]
phase_base: 11dc168f4d8a8b295aef16f2d04b762c503d1ba8
plan_head_before: 11dc168f4d8a8b295aef16f2d04b762c503d1ba8
plan_head_after: f0c80cffb746327624edf268d7571723ef475d55
requires: []
provides:
  - "check 4's probe guard in scripts/check-package-install.mjs (derived make*Feed set, TYPE_ONLY_PROBES, REFUSED_SHAPE_PROBES)"
  - "63-RED-EVIDENCE.md `## The guard at its own commit`"
  - "63-mutation-base.json: empty mutation scope"
affects: [63-02, 63-03, 63-04, 63-05]
tech-stack:
  added: []
  patterns:
    - "parser loaded with await import inside the guard's try so a load failure is a fail()"
    - "required set read at run time from the installed artifact's runtime keys"
key-files:
  created:
    - .planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-RED-EVIDENCE.md
    - .planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-mutation-base.json
  modified:
    - scripts/check-package-install.mjs
key-decisions:
  - "The guard runs after the consumer's compile and run, gated on consumerReady, so it never hides their failure"
  - "A refused literal is not a use: a type reference inside a refused declaration does not count as a type-only use"
requirements-completed: []
duration: 25min
completed: 2026-11-20
status: complete
commits: 2
actuals:
  tokens: 3500
  tasks: 2
  commits: 2
---

# Phase QD-63 Plan 01: Probe guard, RED on the base Summary

Gate 14's check 4 now reads its own consumer fixture through TypeScript's native parse and fails unless every `make*Feed` the packed `@qadi/devtools` root exports is called, `DecisionCacheShape` is used as a type and a literal typed `DecisionCacheShape` holds a `@ts-expect-error` naming `getOrCompute`; it is RED on the base with exactly three lines.

## Base facts

`phase_base: 11dc168f4d8a8b295aef16f2d04b762c503d1ba8` (HEAD before this plan's first commit), measured on it:

- `node scripts/check-package-install.mjs`: exit 0, last line `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`
- `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`
- `api-surface: 939 export(s) documented across 9 package(s)`
- `dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve`
- verify-traceability: `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)`
- `devtools-claims: 8 claim(s) registered across 6 file(s)`
- `npx oxlint scripts/check-package-install.mjs`: exit 0, silent
- Revisions as read then: ADR-QD-033 1.1, `spec/README.md` 1.261, `spec/traceability.md` 1.224, `spec/process/definitions-of-done.md` 1.18

## What was built

- `scripts/check-package-install.mjs`: `TYPE_ONLY_PROBES`, `REFUSED_SHAPE_PROBES`, `consumerReady`, the guard block after the consumer run and a header paragraph. No new static import; the three `typescript/unstable/*` modules are loaded with `await import(...)` inside the guard's `try`.
- `63-RED-EVIDENCE.md` and `63-mutation-base.json`.

## RED evidence

Gate 14 at the guard commit exits 1; compile and run pass (the count of three proves it). Full variant matrix (c0, g1 to g9) with edits, exits and failure lines is in `63-RED-EVIDENCE.md`.

```
  the consumer fixture never calls makeDiagnosticsFeed, makeGatesFeed: every make*Feed the packed @qadi/devtools root exports must be probed
  the consumer fixture never uses DecisionCacheShape as a type: every type-only probe name must be a type reference outside a refused literal
  the consumer fixture never refuses a literal typed DecisionCacheShape: every refused-shape probe name must annotate a declaration holding a @ts-expect-error that names its refused member

package-install: 3 failure(s) across 9 package(s).
```

Every variant behaved as its Expected cell: mentions do not count (g1), one call plus one annotation plus one refused literal removes the names (g2), a refused literal alone refuses but does not use (g8), a directive on another property refuses nothing (g9), and a parser throw, an absent consumer.ts, a missing `unstable` subpath, an empty feed set and a failed key read each fail through `fail()` (g3 to g7).

## Task commits

| Task | Commit | Files |
| --- | --- | --- |
| 1 (tracer) | `161637ab` | `scripts/check-package-install.mjs` |
| 2 | `f0c80cff` | `63-RED-EVIDENCE.md`, `63-mutation-base.json` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Edit tool dropped one space in an unrelated line**
- **Found during:** Task 1 (diff review after the first commit)
- **Issue:** the `consumerReady` edit rewrote `["tsc", "-p", …]` as `["tsc","-p", …]`.
- **Fix:** restored the space with sed and amended the (unpushed) guard commit so the script diff is 157 insertions, 0 deletions. Task 1's verify and the whole matrix ran against the amended script's behavior (the matrix ran after the amend).
- **Files modified:** scripts/check-package-install.mjs
- **Commit:** `161637ab`

Otherwise the plan executed as written; no observed output differed from an expected line or count.

## Known Stubs

None.

## Threat Flags

None. The key-read child uses a fixed argument array with no shell (T-63-01); every parser load and API call is inside a `try` whose catch calls `fail()` (T-63-02); only `typescript`'s exported `unstable/*` subpaths are imported (T-63-03).

## Self-Check: PASSED

- `scripts/check-package-install.mjs`, `63-RED-EVIDENCE.md`, `63-mutation-base.json` exist; commits `161637ab` and `f0c80cff` are ancestors of HEAD; `.scratch/qd63-red` is gone; `git diff --quiet 11dc168f -- 'packages/*/src'` holds.
