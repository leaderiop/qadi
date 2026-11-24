---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 02
subsystem: devtools-react-hooks-characterisation
tags: [characterisation, first-render, strictmode, activity, devtools]
requires: ["79-01"]
provides:
  - the first-render, StrictMode, Activity and first-configure-throw pins of useDockModel, useDiagnostics, useTimeline and useScoped, green on the phase base
  - 79-RED-EVIDENCE.md, each cell shown failing against a scratch edit
  - 79-characterisation-check.mjs, which holds the test file to its first commit by sha256
affects: [79-06, 79-10, 79-12, 79-16]
key-files:
  created:
    - packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-RED-EVIDENCE.md
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-characterisation-check.mjs
  modified: []
key-decisions:
  - "The characterisation names no dock input type and calls no constructor with an argument: the dock inputs are typed as the first parameter of the real hook, so the same file compiles after the signature change"
  - "The timeline probe passes an empty options record for an omitted capacity (exactOptionalPropertyTypes refuses an explicit undefined on the base), which is the omitted case the hook reads as undefined"
  - "The check script is a plain sha256 comparison, not the Phase 74 parse-and-compare shape: the file's helpers are its own and nothing moves out of it"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: a397884d6dc1393703a9ee25c2d099a0bc687fa5
plan_head_after: 50e2300a38c81686f503d557cc7fdfaed05396db
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
coverage:
  - deliverable: "ConfigureFirstRender.characterisation.test.tsx, cells C1 to C11, green on the base with packages/devtools/src unchanged from phase_base"
    verification:
      - kind: command
        ref: "pnpm exec vitest run --project devtools packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx (11 passed); tsc -p tsconfig.test.json; oxlint; node scripts/check-house-style.mjs"
        status: pass
    human_judgment: false
  - deliverable: "79-RED-EVIDENCE.md, edits F1 to F3 and a failing run for every title"
    verification:
      - kind: command
        ref: "the plan's Task 1 verify one-liner"
        status: pass
    human_judgment: false
  - deliverable: "79-characterisation-check.mjs, passes the committed file, fails a one-byte change, self-test 3 passed"
    verification:
      - kind: command
        ref: "the plan's Task 2 verify one-liner"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 02: the first-render characterisation Summary

An eleven-cell characterisation of the dock's first render, written on the untouched phase base through the real
`useDockModel`, `useDiagnostics`, `useTimeline` and `useScoped`, read through the model stores, and held to its first
commit by a sha256 check.

## What was built

`packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx` (own harness, every relative import
starts with `../../src/`, no panel, no input type, no constructor argument):

| Cell | Pins |
| ---- | ---- |
| C1 | diagnostics and gates handed: one distinct reader line `Starting`, unsampled, listed `a`, questions unsampled; subscribe 1, live listeners 1 |
| C2 | the same under StrictMode: the same one line, never `Off`; subscribe 2, live 1 |
| C3 | gates only, plainly and under StrictMode: `Off`, not unsampled, listed `a`, questions absent |
| C4 | a registry whose subscribe throws: every commit reads `gates=Failed`; subscribe 2 and live 0 plainly, 3 and 0 under StrictMode |
| C5 | `useDiagnostics`: `Starting, Starting` handed, `Off, Off` omitted; under StrictMode the distinct statuses are the same, never `Off` between `Starting` |
| C6 | `useTimeline`: `0@500, 1@50` with a capacity of 50, `0@500, 1@500` omitted |
| C7, C8, C9 | the Activity reveal (swapped while hidden; hide then show with new inputs in one rerender; three unsettled changes): the first reader commit after the reveal lists `b`; registry `a` gains no subscribe at the reveal and `b` is subscribed once |
| C10 | a capacity of -1 on the first mount of `useDockModel` and of `useTimeline`: no reader commit, the boundary receives an `Error` whose message is `emptyTimeline: capacity must be a non-negative integer, got -1` |
| C11 | a `useScoped` build that adds a finalizer and then throws: the finalizer ran before the boundary received the original error |

No `instances()` read count is pinned.

## RED evidence (79-RED-EVIDENCE.md)

Three scratch edits of `packages/devtools/src`, never committed, each restored with `git checkout -- packages/devtools/src`:

- F1, the bare build configured one effect later (the three hooks build `makeDockModel()`, `makeDiagnosticsFeed()`,
  `makeTimelineFeed()`): C1 to C10 fail.
- F2, a build closure held from the first render (`useState(() => ...)[0]` in `useDockModel`): C7, C8, C9 fail.
- F3, `useScoped`'s catch rethrowing without closing: C11 fails.

Every title has a `- failed:` line.

## The check (79-characterisation-check.mjs)

`BASE` is `cf3186d94b1d4c4cbb3fa2f92b2726379c888db7`, the commit that added the file. It refuses when `git log
--diff-filter=A` does not end on `BASE`, compares `git show BASE:<path>` with the working file by sha256, and
`--self-test` ends `self-test: 3 passed`. Run here: passes the committed file, exits 1 on a file with one appended
space (restored, `git status` clean), oxlint clean. 79-16 runs it at close.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 | cf3186d9 | `ConfigureFirstRender.characterisation.test.tsx`, `79-RED-EVIDENCE.md` |
| 2 | 50e2300a | `79-characterisation-check.mjs` |

## Verification

- Task 1 verify (the plan's one-liner, run as written under `bash`): exit 0.
- Task 2 verify: exit 0.
- `git status --porcelain -- packages/devtools/src` prints nothing; `pnpm exec tsc -p tsconfig.test.json --noEmit` clean;
  `node scripts/check-house-style.mjs` clean; no decision, plan, requirement or phase wording in the file.

## Deviations from Plan

None in behaviour. The base measured every sequence the plan listed: no cell needed a measured line different from the
interface facts. Two small notes on the file as first committed: the timeline probe passes `{}` for an omitted
capacity because the base's `exactOptionalPropertyTypes` refuses `{ capacity: undefined }` there, and the failed-gates
line reads `gates=Failed[]` (the tag the base prints for a registry that throws on subscribe).

## Decisions Made

- The dock inputs are typed `Parameters<typeof useDockModel>[0]`, so the file never names the input type 79-11 deletes.
- The Activity cells compare the commits after the initial mount only, so a hidden dock's missing layout effects cannot
  add or hide a line.
- The check is a byte comparison; a looser rule would let a pin follow the change it guards.

## Known Stubs

None.

## Threat Flags

None. T-79-02, T-79-03 and T-79-04 are mitigated as the plan states (cells C1 to C9 under F1; the check shown failing on
a one-byte change; C10 under F1, C11 under F3).

## Self-Check: PASSED

Files found: the test file, `79-RED-EVIDENCE.md`, `79-characterisation-check.mjs`; commits `cf3186d9` and `50e2300a` are
ancestors of HEAD.
