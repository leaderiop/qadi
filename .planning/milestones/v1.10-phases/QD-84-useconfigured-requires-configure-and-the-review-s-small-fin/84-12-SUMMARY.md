---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 12
subsystem: devtools
tags: [mutation, close, checks, records]
requires: ["84-11"]
provides:
  - "84-mutation-close.json: the lens group measured on the close head with the base's invocation, run alone"
  - "every phase check, seen-failing record, the held-file check and the earlier checks passing at the close"
affects: [84-13]
key-files:
  created:
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-mutation-close.json
  modified: []
status: complete
completed: 2026-11-25
commits: 1
plan_head_before: d1f40a03
plan_head_after: d2f005c2
actuals:
  tokens: 12000
  tasks: 2
  commits: 1
requirements-completed: []
---

# Phase QD-84 Plan 12: the mutation close and the close checks Summary

The lens session's mutation floor holds at the close (47 of 47 killed, nothing open, 22 Ignored with none new), and every phase
check, seen-failing record, held-file check and earlier check passes on the close head.

phase_base: 8ff027e1af33826bd1d90e6c039384ae8e7906dc
base_record: ff0be2b4f784a675baa24b7a478c194b7e4049da
close_record: d2f005c2140c6b1ee91a6e9954b2c0f61386c4fd

## The mutation close

Invocation (stdin closed, alone, nothing else running): `pnpm exec stryker run stryker.devtools.mjs --mutate
packages/devtools/src/model/LensSession.ts`, `Final mutation score of 100.00`, `Done in 42 seconds`.

```
base  packages/devtools/src/model/LensSession.ts 52/52, survived 0, no coverage 0, ignored 22
close packages/devtools/src/model/LensSession.ts 47/47, survived 0, no coverage 0, ignored 22
compare: packages/devtools/src/model/LensSession.ts 52/52 -> 47/47, survived 0 -> 0, no coverage 0 -> 0, ignored 22 -> 22 (0 new)
         no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants
```

The five killed mutants that left were the ones in `move`'s body, deleted by 84-07. No mutant survived, so no
`LensSession.set.test.ts` was created, and `84-mutation-base.json` is touched by one commit only, `base_record`.

## Close facts

Each check run with stdin closed on the close head; last output line.

```
scan-ids: no id or phase wording in added lines
scan-forbidden: no forbidden form in added lines
trailers: 29 plan commits, each with the one trailer
no-adapter: useConfigured takes a value that has configure, and no adapter is left
no-restated-set: every move goes through the store's set, and choose arms before it
one-path: the lens adapter reads the guards from its one subscription and from the store
one-ledger: one stop ledger, in useStopNotice, called once per feed
records --close: the adapter row and the pinned-by lists name tests that exist, and every reserved record is written
seen-failing: Lens.questions.characterisation.test.tsx, DockFrame.stops.characterisation.test.tsx,
  useTimeline.inputs.characterisation.test.tsx, useConfigured.test.tsx, useConfigured.tst.ts, and
  LensSession.test.ts "a listener told of a pick can take its reveal" (each passes)
84-pinned-check.mjs --all-applied: pinned: 16 files hold their base text, 2 of 2 declared edits applied, useConfigured.test.tsx held from f6e3e6ff, 1 of 1 edits applied, 8 of 8 refusals added, 3 of 3 born files held
84-earlier-checks.mjs: exit 0 (last line: 83-check.mjs registers: exit 0)
guarded files and manifests (AGENTS.md, scripts/check-house-style.mjs, .oxlintrc.json, package.json, pnpm-lock.yaml,
  pnpm-workspace.yaml, packages/*/package.json) equal phase_base
no tag and no remote branch contains the first phase commit
WX-06 ordering: the three characterisations, the useConfigured double commit and the arm-before-publish evidence are ancestors of
  the first refactor commit and of the lens session change
api-surface: 942 export(s) documented across 9 package(s) (equal to the base fact)
```

## Records checked and left unchanged

- ADR-QD-137 (spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md:165 at 8ff027e1): checked that the amendment sentence is present, that `useConfigured.ts` holds `built.configure(inputs)` and that `useDockModel.ts`, `useTimeline.ts` and `useDiagnostics.ts` each call `useConfigured(`; unedited since phase_base
- ADR-QD-047 (spec/decisions/047-a-headless-devtools-model.md:533 to 535 at 8ff027e1): checked that both sentences are present, that `useLens.ts` adds `pointermove`, `click` and `keydown` document listeners, that its one react import is `import { useEffect } from "react";` and that `one-path` refuses any `useRef` in it; unedited since phase_base
- AGENTS.md section 13 (AGENTS.md:870 at 8ff027e1): checked that both sentences are present, the three listeners and that `QuestionsPanel.tsx` still holds `scrollIntoView(`; unedited since phase_base
- spec/overview.md (the tables and the `useDiagnostics` row at 8ff027e1): checked that none of `Configurable`, `UseLens`, `useStopNotice` or `StopNoticeProps` appears, that the `useDiagnostics` row still says the hook returns `DiagnosticsSnapshot` and that `check-api-surface.mjs` prints the base fact line; unedited since phase_base
- apps/website/src/content/docs/docs/reference/upgrading.md (:194 at 8ff027e1): checked that the `useLens` row reads "none: the lens is the dock's" and that neither `packages/devtools/src/index.ts` nor `packages/devtools/src/react/index.ts` names `useLens`; unedited since phase_base

## Flagged assumptions

ADPT-01, ADPT-04 and WX-07 have no edge class of their own in the plan's edge coverage lift; each is judged as follows.

- flagged ADPT-01 (the three adapters deleted, the double an object): judged by `no-adapter` and by `useConfigured.tst.ts` and
  `useConfigured.test.tsx` being seen failing; the hidden `Activity` and StrictMode rebuild clause is held by the held
  `useConfigured.test.tsx` rows, not by a new check here.
- flagged ADPT-04 (one stop ledger shared by both notices): judged by `one-ledger` and the `DockFrame.stops.characterisation`
  rows seen failing; the ledger's behaviour under restarts is DS3's, not re-measured here.
- flagged WX-07 (no phase-relative ids, nothing released, pushed or merged): judged by `scan-ids`, `trailers` and the tag
  and remote-branch checks above; "no version-packages PR is merged" is not checkable from the repository and is taken from
  the hard limits the executors ran under.

## Commits

- d2f005c2: docs(84-12): the mutation close of the lens session

## Deviations from Plan

- Task 1's verify ends with `84-check.mjs commit`, which judges an existing commit, so the close record was committed with
  `git commit` first and the whole verify run after it (it passes). Every other step ran before.
- No survivor existed, so the `test(84-12)` commit and the `LensSession.set.test.ts` path were not taken.

## Known Stubs

None.
