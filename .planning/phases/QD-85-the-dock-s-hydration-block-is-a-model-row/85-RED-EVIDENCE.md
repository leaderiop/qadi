# Phase 85 RED evidence

Every line below was written when the check it names was seen failing. A line is one of `- failed: <title>` (a test or
cell seen failing under a scratch edit), `- failed (<tag>): <title>` (the same, with the kind of edit in the tag),
`- red on the base: <title>` (a test red on the unchanged base, before the change that turns it green), or `- check
failed: <mode>: <first stderr line>` (a phase script's mode seen refusing); the rest of a run's stderr, when kept, is
indented under its line. A scratch edit is restored from a copy before anything is committed.

## 85-01 the hydration cells

Each cell was seen failing under one scratch edit of `packages/devtools/src/react/QuestionsPanel.tsx` (H13: of
`Diagnostics.ts`) that changes only what it pins; the edit follows its cell, and the other cells the same edit also
moved are not listed.

- failed: H1 rechecked 1, mismatched 1: the singular rate
  (scratch edit: the rate's singular rule dropped (always the plural s); 1 cell(s) failed under it)
- failed: H2 rechecked 4, mismatched 1: the plural rate
  (scratch edit: the rate's plural s dropped; 10 cell(s) failed under it)
- failed: H3 rechecked 0 with seeded 3: no rate
  (scratch edit: the rate rendered at rechecked 0; 2 cell(s) failed under it)
- failed: H4 dehydrated equals seeded: 0 dehydrated entries
  (scratch edit: the y/ies rule swapped; 12 cell(s) failed under it)
- failed: H5 a shortfall of 1: 1 dehydrated entry
  (scratch edit: the y/ies rule swapped; 12 cell(s) failed under it)
- failed: H6 a shortfall of 6: 6 dehydrated entries
  (scratch edit: the y/ies rule swapped; 12 cell(s) failed under it)
- failed: H7 seeded more than dehydrated: a client reading payloads
  (scratch edit: the seeded-more sentence shortened; 1 cell(s) failed under it)
- failed: H8 a raised drop beside a zero one: one row, no all-clear
  (scratch edit: zero drops no longer filtered out; 1 cell(s) failed under it)
- failed: H9 a foreign reason holding markup is text
  (scratch edit: the drop reason rendered inside a code element; 2 cell(s) failed under it)
- failed: H10 no drops, all counts zero: All 0 reasons
  (scratch edit: the all-reasons count printed as a fixed 9; 11 cell(s) failed under it)
- failed: H11 supplied counts while the poll is Starting
  (scratch edit: a Starting or unsampled status wins over supplied counts; 2 cell(s) failed under it)
- failed: H12 supplied counts while the poll stopped unsampled
  (scratch edit: a Starting or unsampled status wins over supplied counts; 2 cell(s) failed under it)
- failed: H13 supplied counts win over a live poll's
  (scratch edit: the sampled counts win over the supplied ones (scratch edit of Diagnostics.ts mergeReading, where the panel's one reading is merged; the panel is handed that single reading); 1 cell(s) failed under it)

## 85-02 the check helper

Each line is a run of the mode seen now; the mode and the input that made it fail follow in the note under the line, and
the rest of its stderr is indented under that.

- check failed: commit: 0 commits since phase_base have the subject: chore(85-02): a subject no commit has
  (a wrong subject)
- check failed: unchanged: packages/devtools/src/model/DockModel.ts differs from phase_base
  (a scratch edit of DockModel.ts)
- check failed: seen-failing: no failure line in the evidence for: H99 a title no failure line names
  (a title with no failure line)
- check failed: scan-ids: packages/devtools/src/model/DockModel.ts:454 names a plan id: const planted = value as Planted; // see 85-02
  (a scratch line at the end of DockModel.ts holding a plan id)
- check failed: scan-forbidden: packages/devtools/src/model/DockModel.ts:454 uses an as cast: const planted = value as Planted; // see 85-02
  (the same scratch line holding an as cast)
- check failed: trailers: the message has 2 Co-Authored-By lines, not one
  (trailers --message with two Co-Authored-By lines)
- check failed: no-react-in-model: packages/devtools/src/model/HydrationView.ts does not exist
  (on the base, where the view does not exist)
- check failed: three-predicates: packages/devtools/src/model/DockModel.ts:405 calls isUnsampled outside the guard and outside a module-scope function declaration
  (on the base, where the services key calls isUnsampled itself and no hydration store exists)
  packages/devtools/src/model/DockModel.ts:397 the services key does not call the shared reader
  packages/devtools/src/model/DockModel.ts: 0 derived stores are computed by hydrationView, not one (the hydration store)
  packages/devtools/src/model/HydrationView.ts does not exist
- check failed: panel-decides-nothing: packages/devtools/src/react/QuestionsPanel.tsx:29 imports isUnsampled from ../model/DiagnosticsFeed.ts
  (on the base, where the panel holds the rate, plural and drop rules)
  packages/devtools/src/react/QuestionsPanel.tsx:39 imports HydrationActivity from ../model/Hydration.ts
  packages/devtools/src/react/QuestionsPanel.tsx:40 imports unaccountedEntries from ../model/Hydration.ts
  packages/devtools/src/react/QuestionsPanel.tsx:373 holds the unaccounted-entries arithmetic: const unaccounted = unaccountedEntries(activity);
  packages/devtools/src/react/QuestionsPanel.tsx:374 holds a drop-filter rule on count: const raised = activity.drops.filter((drop) => drop.count > 0);
  packages/devtools/src/react/QuestionsPanel.tsx:374 holds a drop filter: const raised = activity.drops.filter((drop) => drop.count > 0);
  packages/devtools/src/react/QuestionsPanel.tsx:389 holds a rate rule on rechecked: {activity.rechecked === 0 ? null : (
  packages/devtools/src/react/QuestionsPanel.tsx:392 holds a rate rule on rechecked: {activity.rechecked === 1 ? "" : " "} disagreed with the server.
  packages/devtools/src/react/QuestionsPanel.tsx:392 holds a plural rule: {activity.rechecked === 1 ? "" : " "} disagreed with the server.
  packages/devtools/src/react/QuestionsPanel.tsx:400 holds a watched-count read of drops.length: Nothing was dropped. All {activity.drops.length} reasons are watched.
  packages/devtools/src/react/QuestionsPanel.tsx:422 holds the unaccounted-entries arithmetic: {unaccounted === undefined
  packages/devtools/src/react/QuestionsPanel.tsx:424 holds the unaccounted-entries arithmetic: : `${unaccounted}                ${unaccounted === 1 ? " " : "   "}                                         `}
  packages/devtools/src/react/QuestionsPanel.tsx:424 holds a plural rule: : `${unaccounted}                ${unaccounted === 1 ? " " : "   "}                                         `}
  packages/devtools/src/react/QuestionsPanel.tsx has no module-scope Match.type<HydrationView>()
  packages/devtools/src/react/QuestionsPanel.tsx does not read its hydration store through useStoreSnapshot
- check failed: frame-reads-status: packages/devtools/src/react/DevtoolsDock.tsx calls useDiagnosticsStatus 0 times, not once
  (on the base, where the frame subscribes to the whole reading)
  packages/devtools/src/react/DevtoolsDock.tsx:112 subscribes to the whole diagnostics snapshot
  packages/devtools/src/react/DevtoolsDock.tsx:112 still names shown
  packages/devtools/src/react/DevtoolsDock.tsx:181 still names shown
  packages/devtools/src/react/DevtoolsDock.tsx:181 still names shown
  packages/devtools/src/react/DevtoolsDock.tsx:229 still names shown
  packages/devtools/src/react/DevtoolsDock.tsx:258 still names shown
  packages/devtools/src/react/DevtoolsDock.tsx:18 still imports Diagnostics
  packages/devtools/src/react/DevtoolsDock.tsx does not pass hydration={props.model.hydration} to the questions tab
  packages/devtools/src/react/useStoreSnapshot.ts does not declare useDiagnosticsStatus
- check failed: records: BEH-QD-700 names row CR99 for packages/devtools/test/model/ConfigureRule.test.ts, which no title opens
  (a copy-backed scratch edit of spec/behaviors/28-devtools-screens.md naming a row id in BEH-QD-700's Pinned by paragraph that no test opens)
- check failed: records --close: BEH-QD-761 has no heading in spec/behaviors/28-devtools-screens.md
  (on the base, where no reserved record exists)
  BEH-QD-761 has no row in spec/traceability.md §1
  BEH-QD-762 has no heading in spec/behaviors/28-devtools-screens.md
  BEH-QD-762 has no row in spec/traceability.md §1
  BEH-QD-763 has no heading in spec/behaviors/28-devtools-screens.md
  BEH-QD-763 has no row in spec/traceability.md §1
  BEH-QD-764 has no heading in spec/behaviors/28-devtools-screens.md
  BEH-QD-764 has no row in spec/traceability.md §1
  BEH-QD-765 has no heading in spec/behaviors/28-devtools-screens.md
  BEH-QD-765 has no row in spec/traceability.md §1
  INV-QD-415 has no heading in spec/invariants.md
  INV-QD-415 has no row in spec/traceability.md §2
  INV-QD-416 has no heading in spec/invariants.md
  INV-QD-416 has no row in spec/traceability.md §2
  spec/decisions/198-*.md does not exist
  spec/decisions/index.yaml has no ADR-QD-198 entry
  ADR-QD-198 has no row in spec/traceability.md §3
  spec/README.md has no CCR-QD-477 row
  BEH-QD-699's heading does not say five computed stores
  BEH-QD-700 does not name `hydration`
  BEH-QD-218's table has no hydration row

## 85-03 the pinned and earlier checks

- check failed: 85-pinned-check.mjs: packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx: differs from its base text at line 375
  (a copy-backed scratch edit appending one newline to the held file, restored with `cp`)
- check failed: 85-pinned-check.mjs --all-applied: packages/devtools/test/react/QuestionsPanel.test.tsx: 0 of 1 declared edits applied, not all
  (on the tree as it is, the declared edit not yet applied; the second reason is `QuestionsPanel.test.tsx: the region is not changed from the base`)
- check failed: 85-earlier-checks.mjs: 84-check.mjs records: expected exit 0, got exit 1: BEH-QD-736 quotes "a title no test has" for packages/devtools/test/model/LensSession.test.ts, which holds no such test
  (a copy-backed scratch edit of the quoted title in BEH-QD-736's `Pinned by` paragraph in spec/behaviors/28-devtools-screens.md, restored with `cp`; `84-check.mjs records --close` failed the same way)

## 85-04 the hydration view

- red on the base: HydrationView.test.ts cannot import ../../src/model/HydrationView.ts
  (vitest: Failed to resolve import "../../src/model/HydrationView.ts", no tests ran)
- failed: V1 no counts and a sampled poll: the unwired advice
  (scratch edit: Pending returned for both absent cases)
- failed: V2 no counts and an unsampled poll: pending
  (scratch edit: Unwired returned for both absent cases)
- failed: V3 counts while unsampled: the counts win
  (scratch edit: the precedence swapped: the poll's unsampled flag tested before the counts)
- failed: V4 the four numbers pass through unchanged
  (scratch edit: a number copied from the wrong field (seeded read from dehydrated))
- failed: V5 nothing re-checked: no rate
  (scratch edit: the rate rendered at rechecked 0)
- failed: V6 one re-checked, one mismatched: the singular rate
  (scratch edit: the rate's singular rule dropped (always the plural s))
- failed: V7 four re-checked, one mismatched: the plural rate
  (scratch edit: the rate's plural s dropped)
- failed: V8 nine drops all at zero: nothing was dropped
  (scratch edit: the all-clear counted the raised drops, not every reason (also moved by the filter taken at >= 0))
- failed: V9 no drops listed: all 0 reasons
  (scratch edit: the all-clear count printed as a fixed 9)
- failed: V10 one raised drop beside a zero one: exactly the raised row
  (scratch edit: zero drops no longer filtered out (>= 0; also V8, V11))
- failed: V11 a drop at count 1 is raised and one at 0 is not
  (scratch edit: a drop at count 1 no longer raised (the filter at > 1))
- failed: V12 a foreign reason keeps its reason and meaning verbatim
  (scratch edit: a raised row's reason altered on the way through)
- failed: V13 dehydrated equals seeded: 0 dehydrated entries
  (scratch edit: the y/ies rule swapped (also V14, V15, and the scope branches swapped))
- failed: V14 a shortfall of 1: 1 dehydrated entry
  (scratch edit: the y/ies rule swapped (also V13, V15))
- failed: V15 a shortfall of 6: 6 dehydrated entries
  (scratch edit: the y/ies rule swapped (also V13, V14))
- failed: V16 seeded more than dehydrated: a client reading payloads
  (scratch edit: the scope branches swapped (also V13, V14, V15))
- failed: V17 the same reading twice gives equal views and leaves the input alone
  (scratch edit: the input array reversed in place by the drop filter's source)
- failed (tstyche): the view is exactly pending, unwired or counts
  (scratch edit: a fourth tag `Hidden: {}` added to HydrationView; 1 test failed under it)
- probe: HydrationView.ts killed 41, survived 0, noCoverage 0, ignored 0
  (stryker.devtools.mjs --mutate packages/devtools/src/model/HydrationView.ts, 12 seconds; every mutant Killed, so the function-declaration shape needed no fallback; not the close record)

## 85-05 the hydration store

- red on the base: M57: the hydration store holds Unwired on a bare model, Pending while the poll layer is still building, and the counts handed to it from the first snapshot
  (vitest: TypeError: Cannot read properties of undefined (reading 'getSnapshot'); the member does not exist)
- failed: M57: the hydration store holds Unwired on a bare model, Pending while the poll layer is still building, and the counts handed to it from the first snapshot
  (scratch edit: the hydration store's compute returned Unwired for every input)
- failed: CR22 a reader subscribed to every store of a bare dock before its first configure hears 2, 2, 2, 2, 0, 1, 0, 2, 1, 1 and 0 notifications while the poll layer is still building, and one more on four stores once it has built
  (scratch edit: the hydration store's parents emptied, so it follows no reading; DL21 and M57 failed under it too)
- failed: DL11 the rows above cover every store a built model exposes
  (scratch edit: hydration left out of the returned model; 21 tests failed under it)
- failed: a built model's members with subscribe and getSnapshot are exactly this list
  (scratch edit: hydration left out of the returned model)
- failed: DL21 with a throwing hydration listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  (scratch edit: the hydration key returned one constant object, so the store never notifies; DL21 failed on heard)
- check failed: three-predicates: packages/devtools/src/model/DockModel.ts: isUnsampled( is called 3 times, not twice
  (scratch edit: the services key calling isUnsampled(status) itself instead of the shared reader)
  packages/devtools/src/model/DockModel.ts:419 calls isUnsampled outside the guard and outside a module-scope function declaration
  packages/devtools/src/model/DockModel.ts:415 the services key does not call the shared reader shownInputOf

## 85-06 the hydration store's identity

- failed: M58: a poll whose reading equals the last publishes nothing from the hydration store, and a configure handing it other counts publishes it once
  (scratch edit: the hydration key copied the counts, `{ ...reading.hydration }`, so an identical configure republished; expected 2 to equal 1)
- failed: M60: with counts handed to it, a poll that stops after a sample publishes nothing from the hydration store, and Off to Live passes through Starting, so the reference moves and both ends are equal
  (scratch edit: the hydration key also carried the shown status object, so Live to a sampled Stopped republished)
- failed: M59: with counts handed to it, the flip from Starting to Live publishes the hydration store once and the two views are equal, because its key compares the unsampled flag by identity
  (scratch edit: the key's unsampled was `hydration === undefined && isUnsampled(status)`, so the flip with counts handed published nothing; M60 failed under it too)
- failed: DL22 when a services listener and a hydration listener both throw in one configure, the last step's aggregate holds the services error before the hydration error
  (scratch edit: the hydration store built before services, so the nested aggregate listed hydration first)

## 85-07 the panel renders the view

- failed: renders a view still waiting for its first sample as no counts read yet
  (scratch edit: the pending and unwired test ids swapped; H10 and the held absent-gates cells failed under it too)
- failed: renders an unwired view with the fix it names
  (scratch edit: the pending and unwired test ids swapped)
- failed: renders the four counts, the rate, each raised drop and the scope under their test ids
  (scratch edit: the rate div dropped; H1, H2 and H4 to H7 failed under it too; also failed under the raised rows rendered as the no-drops div, with H8 and H9)
- failed: renders a counts view with no rate as nothing dropped, without a rate line
  (scratch edit: the rate div rendered whether or not the view carried a rate)
- failed: renders each drop's reason as text
  (scratch edit: the reason rendered as inner HTML in place of a text child; H9 failed under it too)
- check failed: panel-decides-nothing: packages/devtools/src/react/QuestionsPanel.tsx:29 imports isUnsampled from ../model/DiagnosticsFeed.ts
  (scratch edit: the status predicate imported and called in the panel again)
