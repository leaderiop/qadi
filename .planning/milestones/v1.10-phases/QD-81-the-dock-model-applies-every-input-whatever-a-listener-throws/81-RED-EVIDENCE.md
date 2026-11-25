# Phase 81 RED evidence

Each line below was printed by a run on the phase base (`node <this directory>/81-check.mjs <mode>`), stdin closed, from the
repository root. A scratch edit was made to a copy-backed `packages/devtools/src/model/DockModel.ts` and restored with
`cp` from a copy in the scratch directory; `git status --porcelain -- packages` printed nothing afterwards.

## 81-01 the check helper

- check failed: commit: 0 commits since phase_base have the subject: docs(81-01): a subject no commit has
- check failed: unchanged: packages/devtools/src/model/DockModel.ts differs from phase_base
- check failed: seen-failing: no failure line in the evidence for: planted
- check failed: scan-ids: packages/devtools/src/model/DockModel.ts:452 names a requirement id: // COLL-01 planted
- check failed: scan-forbidden: packages/devtools/src/model/DockModel.ts:453 uses an as cast: const planted = value as Planted;
- check failed: trailers: the message has 2 Co-Authored-By lines, not one

`trailers` is recorded through the judge the self-test drives (`judgeTrailer` on a planted message holding two trailers),
because a failing run needs a plan commit with two trailers, which no commit of this phase may be.

`single-source` on the phase base, every line it prints (exit 1), the reasons the promotion of the collect-and-rethrow rule
removes:

- check failed: single-source: callAll is not declared in ExternalStore.ts
- check failed: single-source: collect loop outside callAll: packages/devtools/src/model/ExternalStore.ts:78
- check failed: single-source: collect loop outside callAll: packages/devtools/src/model/ExternalStore.ts:211
- check failed: single-source: throwCollected is reached other than through callAll
- check failed: single-source: DockModel.ts holds a try

## 81-02 the dock model's listener tests

Each line below was printed by `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.listeners.test.ts`
on the phase base (`packages/devtools/src` equal to `phase_base`, stdin closed), from the repository root.

- red on the base: DL4 with a throwing explorer listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - failed on: AssertionError: expected [] to deeply equal [ 'editor' ] (the roles read, in the run that leaves the capacity where it was; the run that moves it is green on the base)
- failed (scratch): DL1 with a throwing timeline listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - edit: deleted the simulation.setPorts call from configure; failed on: AssertionError: expected false to equal true (the Live source option)
- failed (scratch): DL2 with a throwing dock listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - edit: deleted the simulation.setPorts call from configure; failed on: AssertionError: expected false to equal true (the Live source option)
- red on the base: DL3 with a throwing roles listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - failed on: AssertionError: expected false to equal true (the Live source option of the simulation, which needs the handed ports: the roles step threw before the ports step)
- red on the base: DL5 with a throwing simulation listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - failed on: AssertionError: expected [] to deeply equal [ 'editor' ] (the roles read, in the run that leaves the capacity where it was)
- red on the base: DL6 with a throwing diagnostics listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - failed on: AssertionError: expected [] to deeply equal [ [ 'g1' ] ] (the questions asking read: the poll was never forked)
- red on the base: DL7 with a throwing timelineStatus listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - failed on: AssertionError: expected [] to deeply equal [ 'a', 'b' ] (the timeline entries: the read was never started)
- red on the base: DL8 with a throwing questions listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - failed on: AssertionError: expected false to be true (the diagnostics status is not Live: the diagnostics step never ran)
- red on the base: DL9 with a throwing services listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - failed on: AssertionError: expected [] to deeply equal [ [ 'g1' ] ] (the questions asking read: the poll was never forked)
- failed (scratch): DL10 with a throwing lens listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing
  - edit: deleted the simulation.setPorts call from configure; failed on: AssertionError: expected false to equal true (the Live source option)
- failed (scratch): DL11 the rows above cover every store a built model exposes
  - edit: added an extra member with subscribe and getSnapshot to the returned model; failed on: AssertionError: expected [ 'timeline', 'dock', 'lens', ...(8) ] to have the same members as [ Array(10) ]
- red on the base: DL12 a timeline listener and a roles listener that both throw are rethrown as one AggregateError in step order, with the message naming the configure
  - failed on: AssertionError: expected false to equal true (the Live source option: the roles step threw before the ports step, so the read stops at an applied input before the two throws are compared)
- red on the base: DL13 a listener that throws undefined is rethrown as undefined once every input is applied
  - failed on: AssertionError: expected false to equal true (the Live source option of the simulation, which needs the handed ports)
- red on the base: DL14 a listener that throws null is rethrown as null once every input is applied
  - failed on: AssertionError: expected [] to deeply equal [ 'editor' ] (the roles read, in the run that leaves the capacity where it was)

The four rows green on the base (DL1, DL2, DL10, DL11) are characterisations of what already holds; each was shown failing once by a
copy-backed scratch edit of `packages/devtools/src/model/DockModel.ts`, restored with `cp` from a copy in the scratch directory
(`git status --porcelain -- packages/devtools/src` printed nothing afterwards).

- red on the base: DL15 an explorer listener that always throws leaves the simulation and the dock on every record the timeline accepts, and each accept rethrows it
  - failed on: AssertionError: expected [] to deeply equal [ 'r1', 'r2' ] (the dock's rows: both accepts rethrew the listener's value and the timeline held both entries, while the dock stayed on its first timeline)
- red on the base: DL16 a configure that moves the capacity and the catalogue publishes the sightings once to the explorer and once to the simulation
  - failed on: AssertionError: expected { timeline: 1, dock: 1, ...(8) } to deeply equal the same record with explorer 1 and simulation 1 (received explorer 2 and simulation 2, and nothing else differed)
- base counts (capacity and catalogue): timeline 1, dock 1, explorer 2, roles 1, simulation 2, diagnostics 0, timelineStatus 0, questions 0, services 0, lens 0
- red on the base: DL17 a listener that configures the dock again from inside a step leaves the model where a plain configure with those inputs leaves a fresh one
  - failed on: AssertionError: expected the nested model's state to deeply equal the fresh model's (the nested model held the outer call's gates "g1", its collector's one call and the Live source option enabled, where the fresh one holds "g2", the second collector's two calls and Live disabled)

## 81-03 the windows

Each line below was printed by `pnpm exec vitest run --project devtools <file> -t "<label> "` on the phase base
(`packages/devtools/src` equal to `phase_base`, stdin closed), from the repository root. A test the plan flips is run as it
is first (its `before` line), then rewritten and run again (its `red` line).

- before (passing on the base): TF29 a status listener that throws on the Reading a capacity change publishes over a Stopped replaces the timeline listener's throw, and no read is started
- red on the base: TF29 a timeline listener and a status listener that throw on a capacity change over a Stopped read are rethrown as one AggregateError in that order, and the read is started
  - failed on: AssertionError: expected Error: status boom to be an instance of AggregateError (the base rethrows the status listener's throw alone, replacing the timeline listener's, and starts no read)
- flip TF29: a status listener's throw on the Reading replaced the timeline listener's and no read started => both throws are rethrown as one AggregateError, the timeline's first, and the read starts
- before (passing on the base): TF28 a listener that throws on the Reading a restart publishes over a Stopped leaves the status Reading with no read started
- red on the base: TF28 a listener that throws on the Reading a restart publishes over a Stopped is rethrown once the read has started
  - failed on: AssertionError: expected 1 to equal 2 (the reads: the Reading's listener threw before the read was forked, so the second read never ran)
- flip TF28: a listener's throw on the Reading a restart publishes left the status Reading with no read started => the throw is rethrown as itself and the read starts (two reads, x and y)
- before (passing on the base): F31 a listener that throws on the Starting a configure publishes leaves the feed Starting, and no new poll starts
- red on the base: F31 a listener that throws on the Starting a configure publishes is rethrown once the new poll has started
  - failed on: AssertionError: expected +0 to be above +0 (the new collector's calls: the Starting's listener threw before the poll was forked)
- flip F31: a listener's throw on the Starting a configure publishes left the feed Starting and no new poll started => the throw is rethrown as itself, the new poll starts and the status reaches Live
- red on the base: TF37 a timeline listener that configures the feed again during a capacity change leaves it reading the inner source at the inner capacity
  - failed on: AssertionError: expected [ 'from-b', 'from-c' ] to deeply equal [ 'from-b' ] (the outer configure's read step took its entry-time source after the nested configure had moved the inputs, and read the outer source)
- red on the base: SR6 a subscriber that throws on the Running a run publishes is rethrown once the run has started, and the run lands
  - failed on: AssertionError: expected +0 to equal 1 (the resolver was never asked: the Running's subscriber threw before the run was forked)
- failed (scratch): G49 a listener that throws on the publish a configure makes is rethrown, and the questions cadence that configure started keeps reading the thunk
  - edit: moved the cadence() call in GatesFeed.configure after the publish call, from a copy-backed GatesFeed.ts restored with cp; failed on: AssertionError: expected 1 to be at least 3 (the thunk read once, at the configure, and never again: the publish threw before the cadence was forked)

G49 is green on the base, a characterisation of a window that is already closed: the gates feed forks its cadence before it publishes. A first draft configured the feed with a thunk already, and stayed green under the scratch edit because the cadence already running reads the held thunk; the feed that starts with no thunk is the one whose cadence the configure itself forks.

`node <this directory>/81-pinned-check.mjs` on the tree, every line it prints, after a scratch edit that appended one comment
line to a copy-backed `packages/devtools/test/model/DockModel.test.ts` (restored with `cp` from a copy in the scratch
directory; `git status --porcelain -- packages` printed nothing afterwards):

- check failed: pinned: packages/devtools/test/model/DockModel.test.ts: differs from its base text at line 1832

On the restored tree it prints `pinned: 8 files hold their base text, 3 of 4 declared flips applied`, and `--all-applied`
fails on `CR22` alone (the test equals its base and no `- flip CR22: ` line is recorded), which the restatement of CR22
changes.

## 81-04 callAll

Each line below was printed by `pnpm exec vitest run --project devtools packages/devtools/test/model/ExternalStore.callAll.test.ts`
on the phase base (`packages/devtools/src` equal to `phase_base`, stdin closed), from the repository root: 8 failed of 8. The
module exports no `callAll`, so each test fails on the first call to it.

- red on the base: callAll with no call returns and throws nothing
  - failed on: TypeError: callAll is not a function (ExternalStore.ts exports no callAll)
- red on the base: callAll runs every call in order and returns when none throws
  - failed on: TypeError: callAll is not a function (ExternalStore.ts exports no callAll)
- red on the base: callAll runs every call after one throws, then rethrows that value as itself
  - failed on: TypeError: callAll is not a function (ExternalStore.ts exports no callAll)
- red on the base: callAll rethrows a thrown undefined as undefined and a thrown null as null
  - failed on: TypeError: callAll is not a function (ExternalStore.ts exports no callAll)
- red on the base: callAll collects two or more throws into one AggregateError in call order, with the message it was given
  - failed on: TypeError: callAll is not a function (ExternalStore.ts exports no callAll)
- red on the base: callAll keeps one value thrown by two calls as two errors
  - failed on: TypeError: callAll is not a function (ExternalStore.ts exports no callAll)
- red on the base: callAll keeps an AggregateError a call threw as one error, never flattened
  - failed on: TypeError: callAll is not a function (ExternalStore.ts exports no callAll)
- red on the base: callAll over a live set calls a member added during the pass and skips one removed before its turn
  - failed on: TypeError: callAll is not a function (ExternalStore.ts exports no callAll)

## 81-06 the dock

CR22 was run as it stood against the rebuilt dock model (the sightings rail a derived store, `configure` seven steps through
`callAll`), stdin closed, from the repository root. Each record failed on the explorer and the simulation alone, 3 received
as 2; every other store's count was unchanged, and the one more on three stores once the poll has built is unchanged.

- flip CR22: building 2, 2, 3, 3, 0, 1, 0, 2, 1 and 0, built 2, 2, 3, 3, 0, 2, 0, 3, 2 and 0 => building 2, 2, 2, 2, 0, 1, 0, 2, 1 and 0, built 2, 2, 2, 2, 0, 2, 0, 3, 2 and 0
- CR22 is restated from DL16, red on the base

A scratch-free correction found while turning DL15 green: its rail assertion listed the two sightings oldest first, while
the rail is newest first (`policiesSeen` walks the timeline newest first), so the expected order was swapped to
`canWrite`, `canRead`; the assertion that the explorer and the simulation hold the model's rail is unchanged.

## 81-10 the close

The mutation close found one mutant the begin-then-fork change left alive: the guard `if (!runs.isCurrent(token)) return;` in the diagnostics feed's `accept` (`ConditionalExpression -> false`). At the base the pre-flip F31 killed it, because a throw on the `Starting` left the old poll running, fenced by its token; with the window closed, no held test reached a stale `accept` and told it from a fresh one. F33 closes it.

- failed (scratch): F33 a sample the superseded run takes on its way out is dropped, so the feed stays Starting until the newest run samples
  - edit: replaced the guard in `makeDiagnosticsFeed`'s `accept` with `if (false) return;` in the working tree, restored with `git checkout -- packages/devtools/src/model/DiagnosticsFeed.ts`; failed on: AssertionError: expected [ 'Starting', 'Live' ] to deeply equal [ 'Starting' ] (the superseded run's sample reached the store while the newest run was held)

F33 is green on the base, a characterisation of a guard that was already there. The close was re-measured on the head that holds it: `DiagnosticsFeed.ts` 60/60, no open mutant.

The pinned check found TF36 failing beside TF29 once TF37 was appended after it: the archived check cuts a test to the next test or the closing line, so the blank line before the appended test fell inside TF36's block, with no line of TF36 changed. TF37 now sits before TF36.

- archived checks at close:
  - 79-pinned-check.mjs: exit 1: packages/devtools/test/model/TimelineFeed.test.ts: TF29: an assertion or a line other than a construction changed
  - 79-characterisation-check.mjs: exit 0: characterisation: packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)
  - 80-pinned-check.mjs --all-applied: exit 0: pinned: 4 files hold their base text, 4 of 4 declared edits applied
  - 80-characterisation-check.mjs --all-flipped: exit 0: characterisation: packages/react/test/InstrumentToggle.characterisation.test.tsx holds its first commit (2cca1f46), 1 of 1 flips applied
  - 80-characterisation-check.mjs --red-recorded: exit 0: red-recorded: every flip has its red line
- 79-pinned-check fails on TF29 only: the flip recorded above (D-13)
