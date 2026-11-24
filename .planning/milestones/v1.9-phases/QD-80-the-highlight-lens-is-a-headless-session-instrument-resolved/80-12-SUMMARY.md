---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 12
subsystem: mutation-close
tags: [stryker, mutation, close-scans, lens-session]
requires: [80-11]
provides:
  - 80-mutation-close.json (dock and lens groups, both measured on aa967903)
  - every close scan passing on the final tree
affects: [80-13]
key-files:
  created:
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-mutation-close.json
  modified:
    - packages/devtools/src/model/LensSession.ts
key-decisions:
  - "The lens session's `move` returns void: its boolean was read by no caller, so two BooleanLiteral mutants survived and no test could reach them (orchestrator-decided, autonomous, 2026-11-24)"
requirements-completed: []
metrics:
  duration: 20min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: f3e4ba5de128f252a0d608b559df075c78ab3bf9
plan_head_after: 13df00affdd588806a19fe03172a4b5f1b4eb244
actuals:
  tokens: 4000
  tasks: 2
  commits: 2
---

# Phase QD-80 Plan 12: The mutation close and the close scans Summary

`DockModel.ts` holds its base (69/69) and `LensSession.ts` closes at 52/52 with no open mutant, both measured on one
head (`aa967903`) with no `packages/` change after it; a by-hand run of the lens session with `ignoreStatic: false`
killed all 74 of its mutants; every close scan passes on the final tree.

## Commits

- `aa967903` refactor(80-12): the lens session's move returns nothing (made by the orchestrator, see Deviations)
- `13df00af` docs(80-12): record the mutation close of the dock model and the lens session

## Mutation close

Both groups measured by `80-mutation.mjs record close`, each Stryker run alone in the background with stdin closed, on
head `aa967903`; `git diff aa967903 HEAD -- packages` is empty.

| File | Base | Close | Killed | Survived | NoCoverage | Ignored | Timeout |
| ---- | ---- | ----- | ------ | -------- | ---------- | ------- | ------- |
| `DockModel.ts` | 69/69 | 69/69 | 69 | 0 | 0 | 12 (base 12, 0 new) | 0 |
| `LensSession.ts` | none (new file) | 52/52 | 52 | 0 | 0 | 22 | 0 |

The dock score is compared by cross-multiplication (`69*69 >= 69*69`). `compare` prints:

```
packages/devtools/src/model/DockModel.ts 69/69 -> 69/69, survived 0 -> 0, no coverage 0 -> 0, ignored 12 -> 12 (0 new)
packages/devtools/src/model/LensSession.ts 52/52, survived 0, no coverage 0, ignored 22
no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants
```

`--self-test` ends `self-test: 28 passed`.

### By-hand run, `LensSession.ts` with `ignoreStatic: false`

Config in the scratch directory (`stryker.examined-LensSession.mjs`, never committed): `stryker.devtools.mjs` spread with
`ignoreStatic: false` and its own report paths. Result: 74 mutants, **74 Killed**, 0 Survived, 0 NoCoverage, 0 Ignored.
So each of the 22 mutants the gated run lists as Ignored is Killed when run:

| Lines | Mutator and replacement | Why Ignored in the gated run |
| ----- | ----------------------- | ---------------------------- |
| 42, 51, 76, 79, 87, 100, 111, 123 | ObjectLiteral `{}` | the `Match.tagsExhaustive` handler tables are built once at import time (static) |
| 43, 52, 53, 80, 81, 88, 89, 101, 102, 112, 116, 124, 128 | ArrowFunction `() => undefined` | the handlers inside those tables, created at import time (static) |
| 75 | ArrayDeclaration `["Stryker was here"]` | the module-scope `NOTHING` constant (static) |

### Survivors met, and how they were closed

The first close, on `f3e4ba5d`, scored the lens session 52/54: two BooleanLiteral mutants survived in `move`
(`return false` to `true`, `return true` to `false`), in the gated run and the by-hand run alike. Nothing reads the
boolean `move` returned (`toggle`, `hover`, `cancel` and `highlight` call it as a statement; `choose` does its own
comparison), and `move` is closure-local, so no test could observe it. The close needed a source change, so the
plan stopped and the orchestrator applied it (below). Re-closed from scratch on `aa967903`: no survivor, no test added.

## Deviations from Plan

### Orchestrator-decided source change (autonomous, 2026-11-24)

**1. [Rule 1 - Dead code, orchestrator-decided] `LensSession.ts`'s `move` returned an unread boolean**
- **Found during:** Task 1, first close on `f3e4ba5d` (lens 52/54, two Survived BooleanLiteral mutants at the two returns)
- **Fix:** `move` is `(next: LensSnapshot): void` and returns early on `next === store.getSnapshot()`; the doc comment no
  longer says "whether it did". Behaviour is unchanged; the no-publish and keep-the-reference rules stay held by the
  existing tests.
- **Files modified:** `packages/devtools/src/model/LensSession.ts`
- **Commit:** `aa967903` (the `trailers` scan counts it as a plan commit: scope `80-12`, one trailer)
- Both groups were re-closed from scratch on `aa967903` with `record close <group>` on a record that did not yet exist,
  so no stale head was kept.

No other deviations.

## Close scans

Run from `phase_base` (`55c79a96db057952465918e410c529b85dc3e4e7`) on the final tree:

- Manifests, lockfile, workspace file, scripts, `AGENTS.md`, `.oxlintrc.json`, `stryker.devtools.mjs`, `stryker.react.mjs`
  unchanged from `phase_base`: `git diff --quiet` passes.
- No tag contains `phase_base`.
- house-style: `602 file(s) clean (3 declared switch(es), 77 type-test file(s))`.
- `scan-forbidden`: `scan-forbidden: no forbidden form in added lines`.
- `scan-ids`: `scan-ids: no id or phase wording in added lines`.
- No DOM call (`document.`, `window.`, `scrollIntoView`, `getBoundingClientRect`) in added lines of `packages/react/src`.
- `seen-failing`: `LensSession.test.ts`, `Lens.dock.test.tsx` and `QadiProvider.tst.ts` each pass.
- Characterisation `--all-flipped`: devtools `Lens.dock.characterisation.test.tsx` holds `7546f54e`, 4 of 4 flips applied;
  react `InstrumentToggle.characterisation.test.tsx` holds `2cca1f46`, 1 of 1 applied.
- Characterisation `--red-recorded`: `every flip has its red line`.
- Pinned `--all-applied`: `4 files hold their base text, 3 of 3 declared edits applied`.
- Phase 79 `79-characterisation-check.mjs`: `ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)`.
- Phase 79 `79-pinned-check.mjs`: `15 tests hold their assertions`.

## Known Stubs

None.

## Threat Flags

None.

## Notes for 80-13

- The close head is `aa967903`; do not touch `packages/` after it without re-closing both groups with `--restart`.
- `80-mutation-close.json` is committed (`13df00af`); the trailer scan will count `aa967903` and `13df00af` as 80-12 commits.
- Not run here: `pnpm check:pr`, `pnpm spec:package`, `requirements.mark-complete` (80-13 only).
