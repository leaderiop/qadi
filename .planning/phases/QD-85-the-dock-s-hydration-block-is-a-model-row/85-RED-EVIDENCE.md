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
