---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 10
subsystem: devtools
tags: [mutation, stryker, changeset, close-checks]
requires:
  - phase: QD-85
    provides: "85-01: 85-mutation.mjs and the dock base; 85-04: HydrationView.ts; 85-02/03: the check helpers; 85-09: the records"
provides:
  - "85-mutation-close.json: the dock and hydration groups, both measured on one head (eed28f3c)"
  - ".changeset/devtools-the-hydration-block-is-a-model-row.md: one @qadi/devtools patch ending No export changes."
  - "every phase check passing on the finished tree, each last line recorded below"
affects: [85-11]
tech-stack:
  added: []
  patterns:
    - "A close record is two Stryker runs on one clean head, each recorded right after its own run, then compared with the base"
key-files:
  created:
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-mutation-close.json
    - .changeset/devtools-the-hydration-block-is-a-model-row.md
  modified: []
key-decisions:
  - "Decided autonomously: the CCR-QD-477 row of plan 85-09 is left as written. A changeset is a release note, not a specification document, and no earlier phase's CCR row names its changeset, so naming it would add a convention and force a spec revision for no reader's benefit; the spec gates stay as 85-09 left them"
  - "Decided autonomously: the changeset paragraph says the rate sentence in prose ('the re-check rate sentence') and names the poll's status, because a changelog reader sees behaviour, not file names"
requirements-completed: [WX-03, WX-04, WX-05, WX-06, HYDV-02, HYDV-03]
status: complete
duration: 15min
completed: 2026-11-25
commits: 2
plan_head_before: eed28f3c5cb0ff58e3ea0ee068cb78d8d1c37dc6
plan_head_after: 8b4073213e4c4584b743caa6fe3923d28153bc19
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "The dock model's mutation score did not fall and the new view holds no open or ignored mutant, both measured on one commit with the base's invocations"
    requirement: WX-05
    verification:
      - kind: command
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-mutation.mjs compare"
        status: pass
    human_judgment: false
  - id: D2
    description: "The changelog says what moved: one @qadi/devtools patch ending No export changes., with no package.json moved since the phase base"
    requirement: WX-03
    verification:
      - kind: command
        ref: "git diff --quiet 2741584f50d176281038b478d0350dc35f174cc2 -- packages/*/package.json"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every phase check passes on the finished tree and every new row title has a failure line in the evidence"
    requirement: WX-06
    verification:
      - kind: command
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-check.mjs (all modes, seen-failing), 85-pinned-check.mjs --all-applied, 85-earlier-checks.mjs, pnpm test:tstyche"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 10: The mutation close, the changeset and the close checks Summary

Both Stryker groups were measured on one head (`eed28f3c`) and recorded: `DockModel.ts` 72 of 72 detected with no new open or
Ignored mutant against its base, `HydrationView.ts` 41 of 41 detected with none open or Ignored. The devtools changeset is
added, and every phase check passes on the finished tree.

## Performance

- **Duration:** about 15 min (two Stryker runs of about 40 seconds each)
- **Completed:** 2026-11-25
- **Tasks:** 2 (a tracer and an auto task)
- **Files:** 2 created

## Accomplishments

- The tracer (Task 1): the `DockModel.ts` invocation and then the `HydrationView.ts` invocation, each alone with stdin
  closed, each recorded right after its own run. `compare` passed on the first try, so no test was added and no restart was
  needed. The tracer feedback gate re-ran the task's `<verify>` (both groups on one head, compare, committed): tracer
  verified end-to-end, expanding.
- The changeset (Task 2): one `@qadi/devtools` patch, one paragraph, ending `No export changes.`. No `changeset version`
  was run, and no `package.json` moved since the phase base.
- Every check named in the plan was run on the finished tree (below).

## Close counts

From `85-mutation-close.json`; both groups' `head` is `eed28f3c5cb0ff58e3ea0ee068cb78d8d1c37dc6`, and each invocation is the
base's.

| File | Killed | Timeout | Survived | NoCoverage | Ignored | Base |
| ---- | ------ | ------- | -------- | ---------- | ------- | ---- |
| `packages/devtools/src/model/DockModel.ts` | 72 | 0 | 0 | 0 | 12 | 65 killed, 12 Ignored |
| `packages/devtools/src/model/HydrationView.ts` | 41 | 0 | 0 | 0 | 0 | born in the phase, no base |

`DockModel.ts` gained seven killed mutants and no Survived, NoCoverage or new Ignored one (12 Ignored at the base, 12 now,
0 new). Stryker printed a final score of 100.00 for each run.

## Close checks

All commands run from the repository root with stdin closed; `<D>` is
`.planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/`. Each exited 0.

| Command | Last line |
| ------- | --------- |
| `node <D>85-mutation.mjs compare` | `no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants` |
| `node <D>85-check.mjs base` | `2741584f50d176281038b478d0350dc35f174cc2` |
| `node <D>85-check.mjs scan-ids` | `scan-ids: no id or phase wording in added lines` |
| `node <D>85-check.mjs scan-forbidden` | `scan-forbidden: no forbidden form in added lines` |
| `node <D>85-check.mjs trailers` | `trailers: 30 plan commits, each with the one trailer` |
| `node <D>85-check.mjs no-react-in-model` | `no-react-in-model: the hydration view is pure, and no model file imports React` |
| `node <D>85-check.mjs three-predicates` | `three-predicates: the questions guard, the one shared reader and the hydration key stay distinct` |
| `node <D>85-check.mjs panel-decides-nothing` | `panel-decides-nothing: the panel renders the hydration view and decides nothing` |
| `node <D>85-check.mjs frame-reads-status` | `frame-reads-status: the dock frame reads the poll's status alone` |
| `node <D>85-check.mjs records --close` | `records: the pinned-by lists name tests that exist, and every reserved record is written` |
| `seen-failing QuestionsPanel.hydration.characterisation.test.tsx` (every title, H1 to H13) | `seen-failing: packages/devtools/test/react/QuestionsPanel.hydration.characterisation.test.tsx` |
| `seen-failing HydrationView.test.ts` (every title, V1 to V17) | `seen-failing: packages/devtools/test/model/HydrationView.test.ts` |
| `seen-failing DockModel.test.ts` (M57, M58, M59, M60 and the member-list test) | `seen-failing: packages/devtools/test/model/DockModel.test.ts` |
| `seen-failing DockModel.listeners.test.ts` (DL11, DL21, DL22) | `seen-failing: packages/devtools/test/model/DockModel.listeners.test.ts` |
| `seen-failing ConfigureRule.test.ts` (CR22) | `seen-failing: packages/devtools/test/model/ConfigureRule.test.ts` |
| `seen-failing QuestionsPanel.test.tsx` (the five hydration render tests) | `seen-failing: packages/devtools/test/react/QuestionsPanel.test.tsx` |
| `seen-failing DockFrame.renders.test.tsx` (every title, R1 to R3; R1 by its red-on-the-base line) | `seen-failing: packages/devtools/test/react/DockFrame.renders.test.tsx` |
| `node <D>85-pinned-check.mjs --all-applied` | `pinned: 18 files hold their base text, 1 of 1 born files held, 1 of 1 declared edits applied` |
| `node <D>85-earlier-checks.mjs` | `84-earlier-checks.mjs --self-test: exit 0: self-test: 8 passed` |
| `pnpm test:tstyche` | `Test files: 79 passed, 79 total` (Tests 429 passed, 2 skipped; Assertions 931 passed, 6 skipped) |
| `git diff --quiet 2741584f50d176281038b478d0350dc35f174cc2 -- "packages/*/package.json"` | exit 0: no package version or manifest moved |

The `seen-failing` titles for the files that also hold older rows (`DockModel.test.ts`, `DockModel.listeners.test.ts`,
`ConfigureRule.test.ts`, `QuestionsPanel.test.tsx`) were extracted from the test files by pattern and passed to the check as
exact titles; a pattern that matched no title would have failed the run, and none did.

## Task Commits

1. **Task 1 (tracer): the mutation close** - `docs(85-10): record the mutation close` (`f7882f03`)
2. **Task 2: the changeset** - `chore(85-10): add the devtools changeset` (`8b407321`)

## Deviations from Plan

None - plan executed exactly as written.

Two points decided autonomously are in `key-decisions`: the CCR-QD-477 row is not edited to name the changeset, and the
changeset's wording.

## Auth Gates

None.

## Known Stubs

None.

## Self-Check: PASSED

- `85-mutation-close.json` and `.changeset/devtools-the-hydration-block-is-a-model-row.md` exist.
- `f7882f03` and `8b407321` are on `arch-wave-16`, each with the one trailer.
- No version was bumped, no `changeset version` run, nothing pushed.
