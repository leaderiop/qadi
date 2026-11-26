---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 01
subsystem: devtools
tags: [mutation, characterisation, base-measurement, hydration]
requires: []
provides:
  - "85-mutation.mjs and 85-mutation-base.json: DockModel.ts's Stryker floor, measured at the phase base, and the scorer that judges HydrationView.ts as a born file"
  - "QuestionsPanel.hydration.characterisation.test.tsx: thirteen byte pins of the hydration block, each seen failing"
  - "the base facts, measured"
affects: [85-02, 85-03, 85-04, 85-05]
key-files:
  created:
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-mutation.mjs
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-mutation-base.json
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md
    - packages/devtools/test/react/QuestionsPanel.hydration.characterisation.test.tsx
  modified: []
key-decisions:
  - "Decided autonomously: H10 pins an all-zero reading (counts zero, no drops) rather than the plan's bare drops: [], because a bare drops: [] on the H6 counts rendered the same bytes as H6 and could not be told apart by any scratch edit"
  - "Decided autonomously: H13's seen-failing edit is in Diagnostics.ts mergeReading (supplied hydration versus sampled), because the panel is handed one merged reading and cannot tell a sampled count from a supplied one"
  - "Decided autonomously: ABSOLUTE in the scorer is empty and the born file is judged by judgeNew alone; the absolute bar of Phase 84's scorer is kept as a driven branch of judge, not a constant"
status: complete
duration: 10min
completed: 2026-11-25
commits: 2
plan_head_before: c2e74af01076455ea4e5edc6642986c327157b4d
plan_head_after: 31d0227ec251d43fe1483191a47b6cbb4f5ecbaa
actuals:
  tokens: 31000
  tasks: 3
  commits: 2
requirements-completed: [HYDV-01, WX-05, WX-06, WX-07]
coverage:
  - id: D1
    description: "DockModel.ts's mutation floor recorded on the phase base by a scorer that also judges HydrationView.ts as a born file"
    requirement: WX-05
    verification:
      - kind: other
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-mutation.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D2
    description: "Thirteen hydration cells, born green on the base, each seen failing under a scratch edit"
    requirement: HYDV-01
    verification:
      - kind: unit
        ref: "packages/devtools/test/react/QuestionsPanel.hydration.characterisation.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "The base facts as measured lines, Phase 84's and Phase 80's checks included"
    requirement: WX-06
    verification: []
    human_judgment: true
    rationale: "A recorded measurement, not a behaviour a test asserts; later plans compare against it"
---

# Phase QD-85 Plan 01: The mutation base, the hydration cells and the base facts Summary

DockModel.ts's mutation floor (65 of 65 killed, 12 Ignored, nothing open) is recorded on the phase base by a scorer
that also holds the born HydrationView.ts to no open and no Ignored mutant, and the panel's hydration block is pinned byte
for byte by thirteen cells each seen failing.

phase_base: 2741584f50d176281038b478d0350dc35f174cc2
execution_start: c2e74af01076455ea4e5edc6642986c327157b4d
base_record: 08d5f8e5f3bbf3ca424fc325aa9294f4ce976602

## Performance

- **Duration:** 10 min
- **Started:** 2026-11-25T13:00:00Z
- **Completed:** 2026-11-25T13:10:00Z
- **Tasks:** 3
- **Files modified:** 4 created, none modified

## Accomplishments

- `85-mutation.mjs` is `84-mutation.mjs` with its directory from `import.meta.url`, a `dock` group (base and close) and a
  `hydration` group (close only; `record base hydration` is refused with `HydrationView.ts is born in the phase and has
  no base`), `UNMEASURED` naming `QuestionsPanel.tsx`, `DevtoolsDock.tsx` and `useStoreSnapshot.ts`, and a born-file
  judge that fails on any Survived, NoCoverage or Ignored mutant and on zero killed. Its self-test passes 57 cases and
  oxlint is clean.
- `85-mutation-base.json` holds the `dock` group on `c2e74af0`: 65 killed, 0 survived, 0 no coverage, 12 ignored (65 of 65, matching Phase 83's close). It was measured before any test or source file
  changed, with nothing else running.
- `QuestionsPanel.hydration.characterisation.test.tsx` holds H1 to H13, each comparing the whole `outerHTML` of
  `[data-testid=qadi-hydration]` through the public `<DevtoolsDock>` with a golden read on the base. It is green three
  runs in a row beside the two held characterisations (43 tests), typechecks and is oxlint-clean. H11, H12 and H13 render
  the same bytes by design: they pin three different states of the poll beside the same supplied counts.
- `85-RED-EVIDENCE.md` holds one `- failed: <title>` line per cell, each written from a vitest JSON run under that
  cell's own scratch edit; every edit was restored from a copy and `packages/devtools/src` equals `phase_base`.

## Task Commits

1. **Task 1: tracer, the phase base measured** - `08d5f8e5` (docs)
2. **Task 2: thirteen hydration cells and the evidence file** - `31d0227e` (test)
3. **Task 3: the base facts** - recorded in this summary, committed by the metadata commit

**Plan metadata:** the `docs(85-01): complete the mutation base and hydration cells plan` commit.

`⚡ Tracer verified end-to-end — expanding`: the Task 1 verify command passed after the commit and before Task 2.

## Base facts

Measured after Task 2 (HEAD `31d0227e`), each line as its command printed it with its exit status; the Phase 84 and Phase 80
scripts ran from scratch copies. Differences from the plan-time expectations: `house-style` reads 618 files, one more than at
plan time, which is the new cell file; `84-check.mjs base` and `84-pinned-check.mjs` exit 1 on ancestry as expected (the
squash merge `ac7578f3`, #165); `80-pinned-check.mjs` exits 1 because the copy reads `80-check.mjs` from
`.planning/phases/QD-80-...`, a path that moved to `.planning/milestones/v1.9-phases/` when the milestone was archived.

```text
house-style | exit 0 | house-style: 618 file(s) clean (3 declared switch(es), 78 type-test file(s))
api-surface | exit 0 | api-surface: 942 export(s) documented across 9 package(s)
dod-table | exit 0 | dod-table: 26 step(s) match pnpm check, 178 reference(s) resolve
doc-examples | exit 0 | doc-examples: 122 block(s) compile
devtools-claims | exit 0 | devtools-claims: 8 claim(s) registered across 6 file(s)
website-doc-examples | exit 0 | website-doc-examples: 77 block(s) compile
--- spec/scripts/verify-traceability.sh --strict

Qadi specification verification
| Status | Check                                      | Detail
| ------ | ------------------------------------------ | ------
| PASS   | appendices/index.yaml -> disk              | 1 entr(y|ies) resolve
| PASS   | appendices/ disk -> index.yaml             | no orphans
| PASS   | behaviors/index.yaml -> disk               | 34 entr(y|ies) resolve
| PASS   | behaviors/ disk -> index.yaml              | no orphans
| PASS   | decisions/index.yaml -> disk               | 154 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 186 invariant(s) traced
| PASS   | decisions -> traceability                  | 154 ADR(s) traced
| PASS   | ADR Document ID = file number              | 130 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5559 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 357 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees

PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)

--- exit 0
reservation sha256 | 61c5ff8b69267834068d7c605ec7c9e0bd6146c583c4682bcef5030a552adaf0  .git/qadi-reserved-ids.json
pnpm exec vitest run --project devtools | exit 0 | Tests  1979 passed (1979)
pnpm test:tstyche | exit 0 | Duration:   12.8s
node p84/84-check.mjs base | exit 1 | phase_base is not an ancestor of HEAD
node p84/84-check.mjs no-adapter | exit 0 | no-adapter: useConfigured takes a value that has configure, and no adapter is left
node p84/84-check.mjs no-restated-set | exit 0 | no-restated-set: every move goes through the store's set, and choose arms before it
node p84/84-check.mjs one-path | exit 0 | one-path: the lens adapter reads the guards from its one subscription and from the store
node p84/84-check.mjs one-ledger | exit 0 | one-ledger: one stop ledger, in useStopNotice, called once per feed
node p84/84-check.mjs records | exit 0 | records: the adapter row and the pinned-by lists name tests that exist
node p84/84-check.mjs records --close | exit 0 | records: the adapter row and the pinned-by lists name tests that exist, and every reserved record is written
node p84/84-pinned-check.mjs | exit 1 | phase_base is not an ancestor of HEAD
node p80/80-pinned-check.mjs | exit 1 | Error: Cannot find module '/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-check.mjs'
node p84/84-check.mjs --self-test | exit 0 | self-test: 216 passed
node p84/84-pinned-check.mjs --self-test | exit 0 | self-test: 38 passed
node p84/84-mutation.mjs --self-test | exit 0 | self-test: 44 passed
node p84/84-earlier-checks.mjs --self-test | exit 0 | self-test: 8 passed
```

## Held files

The phase holds these byte for byte from `phase_base`:

- `packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx`
- `packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx`
- `packages/devtools/test/react/Lens.questions.characterisation.test.tsx` (it renders the panel with no `hydration` prop, so the
  prop stays optional)
- `packages/devtools/test/react/DockFrame.stops.characterisation.test.tsx`
- `packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx`
- `packages/devtools/test/model/DockModel.characterisation.test.ts`
- `packages/devtools/test/react/QuestionsPanel.hydration.characterisation.test.tsx` (the new cells, from the commit that adds them)

`QuestionsPanel.test.tsx` is the one held-elsewhere file the phase edits (its hydration region, which `80-pinned-check.mjs` and
`84-pinned-check.mjs` hold); the edit is declared in `85-pinned-check.mjs`.

## Decisions Made

Decided autonomously (owner's standing instruction): see `key-decisions` above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] H10 as planned could not fail on its own**
- **Found during:** Task 2
- **Issue:** `drops: []` with the counts of H6 rendered the same bytes as H6, and the planned edit ("print the raised count
  instead of all") prints 0 either way, so no scratch edit could tell H10 from its neighbours.
- **Fix:** H10 pins an all-zero reading (counts zero, `drops: []`), and its scratch edit prints a fixed 9 for the reason count.
- **Files modified:** the cell file.
- **Commit:** `31d0227e`

**2. [Rule 3 - Blocking] H13's seen-failing edit is outside `QuestionsPanel.tsx`**
- **Found during:** Task 2
- **Issue:** the panel receives one merged reading, so no edit of it can make a sampled count win over a supplied one.
- **Fix:** the scratch edit swapped the operands of `supplied.hydration ?? sampled.hydration` in `Diagnostics.ts`'s
  `mergeReading`, was restored from a copy, and is noted in `85-RED-EVIDENCE.md`.
- **Files modified:** none left behind.

**3. [Rule 3 - Blocking] The Task 3 verify's milestone check trips on pre-existing untracked files**
- **Found during:** Task 3
- **Issue:** `git status --porcelain -- .planning/milestones` lists the untracked `*.iter*.md` review files that existed before the plan
  (and which the plan forbids staging), so the check as written fails on a tree the plan did not touch.
- **Fix:** checked instead that nothing under `.planning/milestones/` is modified or staged, and that the only entries there are
  pre-existing untracked files (`*.iter*.md` reviews, a `.review-diagnostics` folder, a `.gitkeep`).

**Total deviations:** 3 (1 Rule 1, 2 Rule 3). **Impact:** none on the outputs; every cell is still seen failing and the base
is still measured before anything changed.

## Known Stubs

None.

## Threat Flags

None. T-85-01 is mitigated by H9 (a reason holding `<b>stray</b>` renders as escaped text); T-85-02 by the record naming its head
and invocation and being committed alone first.

## Next Phase Readiness

Plan 85-02 may start: the floor is recorded and every hydration state is pinned.

## Self-Check: PASSED

Created files and both task commits (`08d5f8e5`, `31d0227e`) exist; the Task 1, 2 and 3 verify commands pass (Task 3's milestone check
as adjusted in deviation 3).
