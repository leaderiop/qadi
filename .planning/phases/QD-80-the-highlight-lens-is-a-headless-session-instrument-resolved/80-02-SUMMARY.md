---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 02
subsystem: devtools-react-characterisation
tags: [characterisation, lens, devtools, dock, hash-hold]
requires: [80-01]
provides:
  - Lens.dock.characterisation.test.tsx, the lens as the dock shows it on the code before ADR-QD-193, ten cells, green on the base
  - 80-characterisation-check.mjs, the sha256 hold with four declared flips
affects: [80-03, 80-04, 80-07, 80-08, 80-12]
key-files:
  created:
    - packages/devtools/test/react/Lens.dock.characterisation.test.tsx
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-characterisation-check.mjs
  modified:
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-RED-EVIDENCE.md
key-decisions:
  - "The cells build their registry, markers and pointer stub inside the file and inside each it, and import none of the three shared helpers"
  - "A check run with one flip applied reports `<k> of <n> flips applied` and passes; --all-flipped is the mode 80-12 uses"
requirements-completed: [WX-06]
metrics:
  duration: 35min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 89d7e9cbbb10016d0db433cdf8508f975cd85c8e
plan_head_after: e9fd5c0066b0139aa850518726817303f43c609a
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
coverage:
  - deliverable: "Lens.dock.characterisation.test.tsx, ten cells through DevtoolsDock, green on the base"
    verification:
      - kind: command
        ref: "the plan's Task 1 verify one-liner (vitest green, commit and unchanged checks, no shared helper, four before lines once each)"
        status: pass
    human_judgment: false
  - deliverable: "80-characterisation-check.mjs, self-test 16 passed, oxlint clean, 0 of 4 flips applied on the committed file"
    verification:
      - kind: command
        ref: "the plan's Task 2 verify one-liner"
        status: pass
    human_judgment: false
---

# Phase QD-80 Plan 02: the lens through the dock Summary

Ten characterisation cells that render `DevtoolsDock` and pin the highlight lens on the phase base, committed before any
source file changed, and a check that holds the file to that commit by sha256, allowing exactly four declared flips,
each seen failing alone on the base.

## Commits

- `7546f54e` test(80-02): characterise the lens through the dock (the test file alone, 10 passed)
- `e9fd5c00` chore(80-02): hold the lens characterisation to its first commit (the check and the evidence)

## The cells

All green on the base, each a plain sentence title; the registry, guards (`Can`, `Allowed`, a real `hasPermission`
policy), pointer stub (`document.elementFromPoint`), the `scrollIntoView` counter and the overlay and picked-row readers
are written in the file, and nothing from `questionsPanelInput.ts`, `dockModelFixtures.ts`, `helpers.ts` or
`gateRegistryDouble.ts` is imported.

1. a pick, then a switch to the log and back (flip `pick-kept`)
2. a highlight, then a switch to the log and back
3. the highlight button pressed while picking (flips `highlight-ends-picking`, `highlight-survives-move`)
4. two pointer moves over one guard while picking (flip `same-hover-same-overlay`)
5. a pick on a guard swallows its click and ends picking
6. a click over no guard goes through and picking stays on
7. Escape after a pick keeps the pick
8. entering picking again drops the pick, and leaving it does not restore it
9. a pick whose guard unmounted marks no row, and the guard mounted in its place is not marked
10. a switch to the log while picking ends picking and leaves no listener

## The declared flips

The check's `FILES` table holds each as an exact whole line (indentation included), `before` occurring once at the base
and `after` never:

| Flip | Cell | Before | After |
| ---- | ---- | ------ | ----- |
| `pick-kept` | 1 | `pickedRows().length, 0, "the row picked before the switch"` | same line with `1` |
| `highlight-ends-picking` | 3 | `assert.include(pickButton().textContent ?? "", "picking —", "while picking, after the highlight")` | `assert.strictEqual(pickButton().textContent, "pick a control on the page", "while picking, after the highlight")` |
| `highlight-survives-move` | 3 | `overlays().length, 0, "after a pointer move over the dock"` | same line with `1` |
| `same-hover-same-overlay` | 4 | `assert.notStrictEqual(second, first, "the overlay after the second move")` | `assert.strictEqual(second, first, ...)`, same message |

Each after line, applied alone with `node 80-characterisation-check.mjs flip <file> <name>` to a `cp`-backed copy, failed
exactly its own cell on the unchanged source (`1 failed | 9 passed`), then the file was restored with `cp`. All four
applied together also pass `--all-flipped`. The four `- red on the base (<name>): <title>` lines and one
`- check failed: 80-characterisation-check.mjs: ...` line (one changed character of a non-flip line) are in
`80-RED-EVIDENCE.md` under `## 80-02 the lens through the dock`.

## Check modes

`node <D>80-characterisation-check.mjs`: holds the file to its first commit, flips reverted; prints
`characterisation: <file> holds its first commit (7546f54e), <k> of 4 flips applied`. Also `--all-flipped`,
`flip <file> [<name>...]`, `--red-recorded`, `--self-test` (16 cases: equal, one changed byte, one flip applied, edit
beside a flip, all-flipped with one unapplied, before absent or twice, both present, a third text, flip of an applied
flip, unknown name, red lines).

## Deviations from Plan

None - plan executed as written. Two small additions beyond the text: each cell also pins a neighbouring fact that is
green on the base and not a flip (one reveal at the pick, no overlay on the return, one overlay at a time, the click
count); and the check's self-test has 16 cases, a superset of the seven the plan lists.

## For the next plans

- Cell 1's preserved line `assert.strictEqual(scrolls(), 1, "no reveal on the return")` holds after a tab round trip
  that keeps the pick: once the session keeps `picked`, the row remounts marked, and its reveal effect (`QuestionsPanel`
  `InstanceRow`, `[picked]`) would run again and count 2. 80-07 must keep the remount from revealing again, or this
  held line fails (and it cannot be edited: it is not a declared flip).
- Cell 1 also holds `assert.strictEqual(overlays().length, 0, "no overlay on the return")` and the pick button text on
  the return; cell 5 and 7 hold the pick button reading "pick a control on the page" after a pick.
- Vitest for the file: `pnpm exec vitest run --project devtools packages/devtools/test/react/Lens.dock.characterisation.test.tsx` (10 tests).
- Phase 79's `79-pinned-check.mjs` (15 tests) and `79-characterisation-check.mjs` still pass; `packages/*/src` is unchanged
  from `phase_base`.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: packages/devtools/test/react/Lens.dock.characterisation.test.tsx
- FOUND: .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-characterisation-check.mjs
- FOUND: 7546f54e, e9fd5c00 (ancestors of HEAD)
