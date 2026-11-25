---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 02
subsystem: devtools
tags: [check-helper, text-checks, structural-rules, red-evidence]
requires:
  - phase: QD-85
    provides: "85-01: the phase base facts, the mutation base and the hydration cells"
provides:
  - "85-check.mjs: the shared modes (base, commit, unchanged, seen-failing, scan-ids, scan-forbidden, trailers [--message]) ported from the earlier phase check, and the phase modes no-react-in-model, three-predicates, panel-decides-nothing, frame-reads-status and records [--close]"
  - "85-RED-EVIDENCE.md: one seen-failing line per run mode of the check"
affects: [85-03, 85-04, 85-05, 85-06, 85-07, 85-08, 85-09, 85-10, 85-11]
key-files:
  created:
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-check.mjs
  modified:
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: a module-scope function declaration is read as ending at the next lone closing brace in column zero, and a statement whose block body is also its return type's literal is read wrongly; the header says so and the fix is to reword the declaration, never to weaken a judge"
  - "Decided autonomously: three-predicates names no function for the shared key reader; it accepts any module-scope function declaration that holds the one non-guard isUnsampled call, so plan 85-05 picks the name"
  - "Decided autonomously: panel-decides-nothing accepts a hydration store read through any useStoreSnapshot call whose argument names hydration (the optional prop's default store included), and judges an import line by the names it binds so a name is reported once"
  - "Decided autonomously: records reads describe titles as well as test titles (a pinned-by paragraph may quote a describe), and it fails when one of BEH-QD-699, 700, 735 or 742 loses its heading or names no test file, so a deleted paragraph cannot pass by being absent"
  - "Decided autonomously: no-react-in-model requires exactly two Data.taggedEnum constants in the view, the view's two unions, rather than any number"
  - "Decided autonomously: each evidence line carries a one-line note under it naming the input that made the mode fail, before the rest of its stderr"
requirements-completed: [WX-04, WX-06, WX-07, HYDV-02, HYDV-03, HYDV-04, HYDV-05]
status: complete
duration: 25min
completed: 2026-11-25
commits: 2
plan_head_before: f6ced6d9616399bf061c1121dae929cba97cfc7f
plan_head_after: 15839b81a0c1d2b822d0be8f9d74b5fc1ebf8336
actuals:
  tokens: 23700
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "One committed, self-tested check states every structural rule of the phase as a text check, and fails on the base for the reason the phase removes"
    requirement: HYDV-03
    verification:
      - kind: other
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-check.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each of the twelve run modes seen failing once, recorded with its first stderr line"
    requirement: WX-06
    verification:
      - kind: other
        ref: "85-RED-EVIDENCE.md, section 85-02 the check helper"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 02: The phase check helper Summary

One committed script, `85-check.mjs`, ports the shared modes of the earlier phase check to this phase and adds five phase
modes that state the hydration-row rules as text checks over the source and the spec; every run mode was seen failing once.

## Performance

- **Duration:** about 25 min
- **Completed:** 2026-11-25
- **Tasks:** 2
- **Files:** 1 created, 1 appended; nothing outside `.planning/` changed

## Accomplishments

- `85-check.mjs` (self-test: 245 cases passed, oxlint clean, directory derived from `import.meta.url`). The shared modes carry
  every `84` name, the scratch directory `qd85`, the subject pattern `85-NN` and the id tokens (`85-NN`, `HYDV-0N`, `WX-0N`,
  `QD-85`, `Phase 85`, the decision number) changed, and `PHASE_BASE` fixed at `2741584f50d176281038b478d0350dc35f174cc2`.
  `trailers` gained `--message <file>`; `blank` gained a `keepStrings` option so an import specifier can be read.
- `no-react-in-model` reads the view's imports (only `effect/Data` and `./Hydration.ts`), its exported function
  declaration `hydrationView`, its module-scope statements (imports, types, exactly two `Data.taggedEnum` constants and function
  declarations) and every model file's imports for React.
- `three-predicates` reads the questions guard (once), the two `isUnsampled(` calls (the guard and one module-scope function
  declaration), the services and hydration keys (both call that function), the hydration store (`parents: [shownReading]`,
  `compute: hydrationView`, key reads `reading.hydration`, no spread) and the view's order (the hydration field before
  `unsampled`).
- `panel-decides-nothing`, `frame-reads-status` and `records [--close]` as the plan's must-haves state them. A probe against a
  hand-edited copy of the real `DockModel.ts`, `DevtoolsDock.tsx` and `useStoreSnapshot.ts` (kept in the scratchpad, not in the
  tree) showed the judges accept realistic text, not only the self-test's plants.
- On the base: `base`, `scan-ids`, `scan-forbidden`, `trailers` and `records` pass; `no-react-in-model`, `three-predicates`,
  `panel-decides-nothing`, `frame-reads-status` and `records --close` fail for the reasons the phase removes.
- `85-RED-EVIDENCE.md` holds a `- check failed: <mode>: <first stderr line>` line for each of the twelve run modes; the tree was
  clean under `packages`, `spec`, `scripts` and `AGENTS.md` after every scratch edit.

## Task Commits

1. **Task 1: tracer, the phase check helper** - `b70083fa` (chore)
2. **Task 2: each run mode seen failing once** - `15839b81` (docs)

`⚡ Tracer verified end-to-end — expanding`: the Task 1 verify command passed after the commit and before Task 2.

## Decisions Made

Decided autonomously (owner's standing instruction): see `key-decisions` above.

## Deviations from Plan

None - plan executed exactly as written. The one wording the plan left open was how a judge reads a shape the later plans will
write (the shared key reader's name, the panel's way of reading its store); each was decided in the widest form that still
states the rule, and is listed under `key-decisions`.

## Known Stubs

None.

## Threat Flags

None. T-85-03 is mitigated by a passing and a failing plant in the self-test for every rule each phase mode states, and by
every mode being seen failing on the real tree; T-85-04 by `trailers` accepting exactly the one owner line (all four plan
commits so far pass).

## Next Phase Readiness

Plan 85-03 may start: every structural rule a later verify calls is one command.

## Self-Check: PASSED

`85-check.mjs` and `85-RED-EVIDENCE.md` exist; both task commits (`b70083fa`, `15839b81`) are ancestors of HEAD; both task verify
commands pass.
