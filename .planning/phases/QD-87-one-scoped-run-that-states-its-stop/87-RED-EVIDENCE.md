# Phase 87 RED evidence

Every line below was written when the check it names was seen failing. A line is one of `- red on the base: <title>`
(a test red on the unchanged base, before the change that turns it green), followed by an indented `  - failed on: <the
first failing assertion as vitest printed it>`; `- failed: <title>` (a test or cell seen failing under a scratch edit) and
`- failed (<tag>): <title>` (the same, with the kind of edit in the tag), each followed by an indented `  (scratch edit:
<the edit>; <n> row(s) failed under it)`; `- check failed: <mode>: <first stderr line>` (a phase script's mode seen
refusing); or `- spike: <line>` (a line the protocol spike printed). A scratch edit is restored from a copy before
anything is committed. The base is the phase base recorded in `87-mutation-base.json`.

## 87-01 the broken simulation run

Written on the base, before any file under `packages/*/src` moved. The three session rows fail on the text a run reports
today, the stringified cause (`Cause([...])`, with a fiber id for an interruption, which no row pins); the three
simulator rows fail because the broken-run box holds a `<span>` and no labelled block.

- red on the base: SX1 a run whose ports layer dies reports its cause in the text the feeds use: first line the error, never a Cause wrapper
  - failed on: AssertionError: Cause([Die(Error: the layer exploded)]): expected true to be false
- red on the base: SX2 a run whose ports layer dies with a value that cannot be described reports the one placeholder, as the feeds do
  - failed on: AssertionError: expected 'Cause([Die([toString threw])])' to equal 'a value that could not be described'
- red on the base: SX3 a run whose resolver interrupts itself reports the interruption in the text the feeds use
  - failed on: AssertionError: Cause([Interrupt(32)]): expected true to be false
- red on the base: SB2 a broken simulation shows its message in a labelled focusable pre
  - failed on: TestingLibraryElementError: Unable to find an accessible element with the role "group" and name "Why the simulation failed"
- red on the base: SB3 the broken simulation pre holds the message exactly, its first line the error
  - failed on: TestingLibraryElementError: Unable to find an accessible element with the role "group" and name "Why the simulation failed"
- red on the base: SB4 the broken simulation pre has the stopped box reason style
  - failed on: TestingLibraryElementError: Unable to find an accessible element with the role "group" and name "Why the simulation failed"

SB1 is green on the base: it pins the stopped box's reason block as the box draws it today, so the move of the style to
the shared theme is seen to leave the render alone.

- failed: SB1 the stopped box shows its reason in a labelled focusable pre whose style is the reason style
  (scratch edit: `maxHeight: 96` changed to `maxHeight: 97` in `reasonStyle` of `packages/devtools/src/react/StoppedBox.tsx`, restored with `cp` from a copy; 1 row(s) failed under it)

## 87-01 spike confirmation

The spike was re-run on the base through the real `makeSupersedingRun`, from a scratch test file that was deleted
afterwards. Its body is `Effect.exit(engine)` followed by a read of `run.isCurrent(token)`, with a probe recording whether
the body ever resumed; each outside path ran with `Effect.never` and with an engine that swallows its own interruption
(`swallow=true`). Every outside interruption never resumes the forked body, so its exit is never read; a self-interrupt
resumes the body as the current run; a run that ends on its own after a newer `begin` resumes it, not current. So the rule
"a current run whose engine exits with anything but success is stopped" cannot state an outside interruption, and it
states a self-interrupt.

- spike: supersede (begin+fork) swallow=false: body never resumed
- spike: supersede (begin+fork) swallow=true: body never resumed
- spike: stop() swallow=false: body never resumed
- spike: stop() swallow=true: body never resumed
- spike: scope close swallow=false: body never resumed
- spike: scope close swallow=true: body never resumed
- spike: begin without fork then stop swallow=false: body never resumed
- spike: begin without fork then stop swallow=true: body never resumed
- spike: self-interrupt: body resumed: exit=Failure interruptsOnly=true current=true
- spike: natural end after a newer begin: body resumed: exit=Failure current=false

## 87-01 the feeds on the base

Written on the base, before any file under `packages/*/src` moved. Today a timeline read or a diagnostics collector that
interrupts itself ends its run with an interrupt-only cause, which the hook that reads the run's exit never states: the
timeline stays `Reading` with an empty tape, and the diagnostics feed stays `Starting` or `Live`. That is today's
behaviour, recorded here as the failing text of the rows that state the new rule, and not pinned by any row.

- red on the base: TX1 a read that interrupts itself reads Stopped with the interruption as its reason
  - failed on: AssertionError: tape=[]: expected 'Reading' to equal 'Stopped'
- red on the base: TX2 a live stream that interrupts itself reads Stopped
  - failed on: AssertionError: tape=[]: expected 'Reading' to equal 'Stopped'
- red on the base: DX1 a collector whose snapshot interrupts itself before any sample reads Stopped and not sampled
  - failed on: AssertionError: tape=["Starting"]: expected 'Starting' to equal 'Stopped'
- red on the base: DX2 a collector whose snapshot interrupts itself after a sample reads Stopped and sampled
  - failed on: AssertionError: tape=["Starting","Live"]: expected 'Live' to equal 'Stopped'

TX3 to TX7 and DX3 to DX7 are green on the base: every outside interruption states no stop, each with a release that
dies, and a layer whose build interrupts itself stays a failed wiring read. Each was seen failing under one scratch edit.
The edit for TX3 to TX7 and DX3 to DX6 reports every failed exit of a run to the hook, whether or not the run is current and
whether or not its cause is an interruption, so an interruption from outside states a stop; the same edit turns the four
red rows green, as it should, and leaves DX7 green, so DX7 has a narrower edit of its own.

- failed (scratch): TX3 a new source interrupts the read and states no stop, even when the replaced release dies
  (scratch edit: the exit guard of `fork` in `packages/devtools/src/model/SupersedingRun.ts` reduced to `Exit.isFailure(exit)` alone; 9 row(s) failed under it)
- failed (scratch): TX4 configuring no source interrupts the read and states no stop, even when the release dies
  (scratch edit: the same edit; 9 row(s) failed under it)
- failed (scratch): TX5 a capacity change interrupts the read and states no stop, even when the release dies
  (scratch edit: the same edit; 9 row(s) failed under it)
- failed (scratch): TX6 a restart interrupts the read and states no stop, even when the release dies
  (scratch edit: the same edit; 9 row(s) failed under it)
- failed (scratch): TX7 closing the scope interrupts the read and states no stop, even when the release dies
  (scratch edit: the same edit; 9 row(s) failed under it)
- failed (scratch): DX3 changed options interrupt the poll and state no stop, even when the replaced layer release dies
  (scratch edit: the same edit; 9 row(s) failed under it)
- failed (scratch): DX4 absent options turn the poll Off and state no stop, even when the release dies
  (scratch edit: the same edit; 9 row(s) failed under it)
- failed (scratch): DX5 a restart interrupts the poll and states no stop, even when the release dies
  (scratch edit: the same edit; 9 row(s) failed under it)
- failed (scratch): DX6 closing the scope interrupts the poll and states no stop, even when the release dies
  (scratch edit: the same edit; 9 row(s) failed under it)
- failed (scratch): DX7 a layer whose build interrupts itself is a failed wiring read inside a Live feed, not a stop
  (scratch edit: the narrower edit, the start-up publish in `start` of `packages/devtools/src/model/DiagnosticsFeed.ts` publishing `Stopped({ reason: "x", sampled: false })` in place of `Starting`, because the first edit leaves DX7 green; 4 row(s) failed under it)

## 87-02 the stated-run cells

Written on the base, before any file under `packages/*/src` moved. Each cell is green on the base (three runs in a row, beside the four held store suites) and was then seen failing once under a scratch edit of the file it pins, restored from a copy before anything was committed. Row 1 and row 2 each also fail the other cells that read a source or a stop through the same code, which the count says.

- failed (scratch): SC1 a timeline read that ends by itself stays Reading and publishes nothing after its start
  (scratch edit: `readSource` in `packages/devtools/src/model/TimelineFeed.ts` forking `runSource(...)` followed by `Effect.andThen(Effect.die(new Error("ended")))`; 3 row(s) failed under it)
- failed (scratch): SC2 a timeline read that dies publishes Stopped once with the cause text and keeps the entries it delivered
  (scratch edit: the `onFailure` body of the timeline `fork` in `TimelineFeed.ts` emptied; 3 row(s) failed under it)
- failed (scratch): SC3 a restart over a Stopped timeline publishes Reading and replays the source into the same timeline, each entry once
  (scratch edit: `restart` of `TimelineFeed.ts` reading the empty source in place of the held one; 1 row(s) failed under it)
- failed (scratch): SC4 a restart on a bare timeline feed reads the empty source: one read span, Reading kept, nothing published
  (scratch edit: `restart` of `TimelineFeed.ts` guarded by `held.source !== undefined`; 1 row(s) failed under it)
- failed (scratch): SC5 the diagnostics feed goes Off, Starting, Live and Off again as options come and go
  (scratch edit: `off` of `packages/devtools/src/model/DiagnosticsFeed.ts` without `view.set(diagnosticsOff)`; 1 row(s) failed under it)
- failed (scratch): SC6 a diagnostics collector that dies is Stopped and not sampled before a sample, and Stopped and sampled after one
  (scratch edit: the sink of `DiagnosticsFeed.ts` without `sampled = true`; 1 row(s) failed under it)
- failed (scratch): SC7 a timeline listener that throws on the Reading of a restart and reconfigures from the same call is rethrown once by identity, and only the newer read reads
  (scratch edit: the start-up publish `status.set(READING)` of `TimelineFeed.ts` wrapped in a `try`/`catch` that drops what it caught; 1 row(s) failed under it)
- failed (scratch): SC8 a diagnostics listener that throws on the Starting of a restart and reconfigures from the same call is rethrown once by identity, and the newer poll is the live one
  (scratch edit: the start-up publish of `start` in `DiagnosticsFeed.ts` wrapped in a `try`/`catch` that drops what it caught; 1 row(s) failed under it)
- failed (scratch): SC9 a session listener that throws on the Running of a run and runs again from the same call is rethrown once by identity, and the newer run is the one that lands
  (scratch edit: the `commit()` in `start` of `packages/devtools/src/model/SimulationSession.ts` wrapped in a `try`/`catch` that drops what it caught; 1 row(s) failed under it)
- failed (scratch): SC10 a session listener that throws on the Ran publish leaves Ran shown
  (scratch edit: the session fork given `{ onFailure: () => { run = { _tag: "Broke", question, message: "x" }; commit(); } }`; 1 row(s) failed under it)
- failed (scratch): SC11 a session run whose ports layer dies publishes Running and then Broke, once each
  (scratch edit: the `commit()` after the run lands skipped when the run is `Broke`; 1 row(s) failed under it)
- failed (scratch): SC12 a configure after a feed scope closed reads and publishes nothing, a capacity the timeline refuses included
  (scratch edit: the closed guard of `TimelineFeed.ts` configure moved after `completeTimelineInputs` and the closed guards of `DiagnosticsFeed.ts` and `packages/devtools/src/model/GatesFeed.ts` configure removed; each of the three edits alone also failed this row; 1 row(s) failed under it)

## 87-02 the pinned check

Written on the base, before any file under `packages/*/src` moved. The check was run on a tree it passes on, then once per kind of change it must refuse, each made to a scratch copy of the file and restored with `cp` before anything was committed: a held test, the hook, a born file, a line outside a declared region and a dropped export of the declared whole file. The line is the first line the check printed on stderr.

- check failed: 87-pinned-check.mjs: packages/devtools/test/model/TimelineFeed.test.ts: differs from its base text at line 4
  (scratch edit: one byte in a held test, `packages/devtools/test/model/TimelineFeed.test.ts`; exit status 1)
- check failed: 87-pinned-check.mjs: packages/devtools/src/react/useConfigured.ts: differs from its base text at line 15
  (scratch edit: one byte in `packages/devtools/src/react/useConfigured.ts`; exit status 1)
- check failed: 87-pinned-check.mjs: packages/devtools/test/model/TimelineFeed.stop.test.ts: differs from the commit that added it at line 2
  (scratch edit: one byte in the born file `packages/devtools/test/model/TimelineFeed.stop.test.ts`; exit status 1)
- check failed: 87-pinned-check.mjs: packages/devtools/test/model/SupersedingRun.test.ts: differs from its base text between the regions R3 and R5toR7, the line 127 of the base, "  it.effect(\"R4 after the scope closes, begin gives a token ", is missing or changed
  (scratch edit: one byte in row R4 of `packages/devtools/test/model/SupersedingRun.test.ts`, a line outside every declared region; exit status 1)
- check failed: 87-pinned-check.mjs: packages/devtools/test/builtFeeds.ts: no longer declares `export const timelineFeedOf`
  (scratch edit: `timelineFeedOf` renamed in `packages/devtools/test/builtFeeds.ts`, a dropped export; exit status 1)

## 87-03 the phase check

Written on the base, before any file under `packages/*/src` moved. Each mode of `87-check.mjs` was run once on a tree or an
input it must refuse, with stdin closed, and its first stderr line is recorded; every scratch edit was made to a copy in
the scratch directory or to a scratch file, and restored from the copy (`87-mutation-base.json`, `TimelineFeed.ts` and
`28-devtools-screens.md` with `cp`, the scratch source file removed) before anything was committed. The seven shape modes fail
on the tree because the code has not moved: that is their variant. `base` was first run with `phase_base` set to the parent
of `cbe375bf` as the plan words it, and it passed, since `cbe375bf` changed only `.planning/`; the variant that fails sets
`phase_base` to a commit forty before it, which does differ outside `.planning/`.

- check failed: base: .changeset/react-registry-lifetime-has-an-owner.md differs between cbe375bf and phase_base outside .planning
  (variant: phase_base set to 53848d85756a85f053dcedaf564a5041c4823b2d, the commit forty before cbe375bf)
- check failed: commit: 0 commits since phase_base have the subject: chore(87-99): no such commit
  (variant: a subject no commit has)
- check failed: unchanged: packages/devtools/src/model/TimelineFeed.ts differs from phase_base
  (variant: one byte appended to packages/devtools/src/model/TimelineFeed.ts)
- check failed: seen-failing: no failure line in the evidence for: a title that has no line
  (variant: a title that has no line in the evidence file)
- check failed: scan-ids: packages/devtools/src/model/zz-scan87.ts:1 names a decision number: // D-12 says so
  (variant: an untracked scratch file packages/devtools/src/model/zz-scan87.ts holding a decision number)
- check failed: scan-forbidden: packages/devtools/src/model/zz-scan87.ts:2 uses switch: switch (x) {
  (variant: the same scratch file holding a switch statement)
- check failed: trailers --message: the message has 2 Co-Authored-By lines, not one
  (variant: a message file holding two trailers)
- check failed: suite: takes React as a peer, never as a dependency fails and is not red on the base
  (variant: the Task 1 report with one passing row set to failed)
- check failed: stated-run-shape: packages/devtools/src/model/StatedRun.ts is missing
  (variant: the run on the tree today, because the code has not moved)
- check failed: prologue-shape: packages/devtools/src/model/ConfigurePrologue.ts is missing
  (variant: the run on the tree today, because the code has not moved)
- check failed: feeds-supply-only-engine: packages/devtools/src/model/TimelineFeed.ts builds 0 stated runs, not one
  (variant: the run on the tree today, because the code has not moved)
- check failed: session-stop: packages/devtools/src/model/SimulationSession.ts does not import causeMessage from @qadi/core
  (variant: the run on the tree today, because the code has not moved)
- check failed: simulator-pre: packages/devtools/src/react/Simulator.tsx: the Broke box holds no pre
  (variant: the run on the tree today, because the code has not moved)
- check failed: onfailure-gone: packages/devtools/src/model/DiagnosticsFeed.ts names onFailure
  (variant: the run on the tree today, because the code has not moved)
- check failed: built-feeds-once: packages/devtools/test/builtFeeds.ts has 4 Effect.tap( calls, not 1
  (variant: the run on the tree today, because the code has not moved)
- check failed: records: BEH-QD-523 names row F99 for packages/devtools/test/model/DiagnosticsFeed.test.ts, which no title opens
  (variant: BEH-QD-523's pinned-by paragraph names the row F99, which no title opens)

## 87-04 the earlier-phase checks

- check failed: 87-earlier-checks.mjs: 85-check.mjs trailers: expected the line "trailers: 34 plan commits, each with the one trailer", got "trailers: 33 plan commits, each with the one trailer"
  (variant: the ledger row of `85-check.mjs trailers` with its `line` changed from 33 to 34 plan commits)

## 87-05 the stated run

Each row is green on the new module (three runs in a row) and was seen failing once under a scratch edit of `packages/devtools/src/model/StatedRun.ts`, restored from a copy with `cp` and compared with `cmp` before anything was committed.

- failed (scratch): ST1 start publishes the starting state before the engine runs, then runs the engine once
  (scratch edit: `plan.starting()` moved after the `fork` and the `try`/`finally` removed; 2 row(s) failed under it)
- failed (scratch): ST2 a starting state whose listener throws is rethrown once by identity after the engine has started
  (scratch edit: the same edit, `starting()` after the fork; 2 row(s) failed under it)
- failed (scratch): ST3 a current engine that dies states one stop in the cause text, its first line the error
  (scratch edit: `causeMessage(exit.cause)` replaced by `String(exit.cause)`; 3 row(s) failed under it)
- failed (scratch): ST4 a current engine that interrupts itself states one stop naming the interruption
  (scratch edit: the stop condition given `&& !Cause.hasInterruptsOnly(exit.cause)`; 1 row(s) failed under it)
- failed (scratch): ST5 a current engine that dies with a value that cannot be described states the one placeholder
  (scratch edit: `causeMessage(exit.cause)` replaced by `String(exit.cause)`; 3 row(s) failed under it)
- failed (scratch): ST6 an engine that succeeds states nothing
  (scratch edit: the narrower edit, the stop condition `runs.isCurrent(token)` stating `Exit.isFailure(exit) ? causeMessage(exit.cause) : "ended"`, because the listed edit of the condition to `runs.isCurrent(token)` alone leaves ST6 green: `causeMessage` of a success exit throws inside the forked body before it states anything; 2 row(s) failed under it)

The rows below were added to the same module's file after the first six; the edits are the same kind, each restored with `cp` and compared with `cmp`.

- failed (scratch): ST7 a newer start interrupts the older engine, and the older run states nothing even when its release dies
  (scratch edit: the narrower edit, the forked body read through `Effect.onExit` with the stop condition `Exit.isFailure(exit)` and no current-run gate, so an interruption from outside is stated, because the listed edit of the condition alone leaves this row green: an outside interruption never resumes the body, so the exit is never read; 7 row(s) failed under it)
- failed (scratch): ST8 stop interrupts a running engine and states nothing, even when its release dies
  (scratch edit: `stop` made a no-op (`stop: () => undefined`); 2 row(s) failed under it)
- failed (scratch): ST9 stop with no run states nothing and calls no starting state
  (scratch edit: the narrower edit, `stop` stating `stopped("stopped")` after `runs.stop()`, because the listed edit of the condition leaves this row green: nothing it reads is reached by a stop; 5 row(s) failed under it)
- failed (scratch): ST10 stop after the engine completed changes nothing and states nothing
  (scratch edit: the narrower edit, `stop` stating `stopped("stopped")` after `runs.stop()`, because the listed edit of the condition leaves this row green: nothing it reads is reached by a stop; 5 row(s) failed under it)
- failed (scratch): ST11 closing the scope mid-run interrupts the engine and states nothing even when its release dies, while a current engine that dies on the same module states once
  (scratch edit: the narrower edit, the forked body read through `Effect.onExit` with the stop condition `Exit.isFailure(exit)` and no current-run gate, so an interruption from outside is stated, because the listed edit of the condition alone leaves this row green: an outside interruption never resumes the body, so the exit is never read; 7 row(s) failed under it)
- failed (scratch): ST12 after the scope closed, start calls neither the starting state nor the engine, and closed reads true
  (scratch edit: the `if (runs.closed()) return;` line of `start` removed; 2 row(s) failed under it)
- failed (scratch): ST13 the guard passes a write from the current run and drops one from a run a newer start replaced
  (scratch edit: `guard` writing without reading `isCurrent` first; 1 row(s) failed under it)
- failed (scratch): ST14 an engine that starts a newer run in its synchronous start and then dies states nothing, and the newer run is live
  (scratch edit: the stop condition of `packages/devtools/src/model/StatedRun.ts` reduced to `Exit.isFailure(exit)`, the current-run gate dropped; 3 row(s) failed under it)
- failed (scratch): ST15 an engine that starts a newer run in its synchronous start and then interrupts itself states nothing
  (scratch edit: the stop condition of `packages/devtools/src/model/StatedRun.ts` reduced to `Exit.isFailure(exit)`, the current-run gate dropped; 3 row(s) failed under it)
- failed (scratch): ST16 a starting state that starts a newer run leaves only the newer engine running, and the outer run states nothing
  (scratch edit: the narrower edit, `plan.starting()` moved before `runs.begin()` so a newer run started from the starting state is superseded by the outer one, because the listed edit of the condition leaves this row green: the outer engine never runs when a newer run replaced it before its fork; 2 row(s) failed under it)
- failed (scratch): ST17 a model property: a stop is stated for exactly the current runs whose engine fails, and nothing after close
  (scratch edit: the stop condition of `packages/devtools/src/model/StatedRun.ts` reduced to `Exit.isFailure(exit)`, the current-run gate dropped; 3 row(s) failed under it)

## 87-05 the configure prologue

Each row is green on the new module (twice in a row) and was seen failing once under a scratch edit of the module, restored from a copy with `cp` and compared with `cmp` before anything was committed.

- failed (scratch): CP1 a configure after close calls nothing past the closed guard, even for input the normaliser would refuse
  (scratch edit: the closed guard of `packages/devtools/src/model/ConfigurePrologue.ts` moved after `rule.complete(raw)`; 4 row(s) failed under it)
- failed (scratch): CP2 a refused input throws from the normaliser before the held value is read, compared, held or stepped
  (scratch edit: `rule.complete(raw)` of `packages/devtools/src/model/ConfigurePrologue.ts` moved after `rule.held()`, because the gate needs the wanted value and so cannot be read before it; 3 row(s) failed under it)
- failed (scratch): CP3 an input the gate calls the same returns before hold and the steps
  (scratch edit: the gate of `packages/devtools/src/model/ConfigurePrologue.ts` ignored, `if (rule.same(before, wanted)) return;` reduced to a bare call; 1 row(s) failed under it)
- failed (scratch): CP4 a changed input is held before the steps run, and the steps receive the wanted and the previous value
  (scratch edit: `rule.hold(wanted)` of `packages/devtools/src/model/ConfigurePrologue.ts` moved after `steps(wanted, before)`; 5 row(s) failed under it)
- failed (scratch): CP5 a configure nested in a step decides, because the steps read the held value when they run
  (scratch edit: `rule.hold(wanted)` of `packages/devtools/src/model/ConfigurePrologue.ts` moved after `steps(wanted, before)`; 5 row(s) failed under it)
- failed (scratch): CP6 the gate receives the held value first and the wanted value second
  (scratch edit: the gate of `packages/devtools/src/model/ConfigurePrologue.ts` given its arguments swapped, `rule.same(wanted, before)`; 2 row(s) failed under it)
- failed (scratch): CP7 a step that throws reaches the caller after the input was held
  (scratch edit: `rule.hold(wanted)` of `packages/devtools/src/model/ConfigurePrologue.ts` moved after `steps(wanted, before)`; 5 row(s) failed under it)
- failed (scratch): CP8 the calls run in the order closed, complete, held, same, hold, steps
  (scratch edit: the closed guard of `packages/devtools/src/model/ConfigurePrologue.ts` moved after `rule.complete(raw)`; 4 row(s) failed under it)

## 87-08 the edited protocol rows

Each row is green on the module without the failure hook and was seen failing once under a scratch edit of the module, restored from a copy with `cp` and compared with `cmp` before anything was committed. The failure-hook halves each row once held are held by the stated-run rows ST3, ST4, ST7 to ST12, ST14 and ST17.

- failed (scratch): R3 closing the scope mid-run interrupts the run, even when its release dies
  (scratch edit: the run installed by `Effect.runFork` in place of the fiber handle, so the scope close interrupts nothing; 13 row(s) failed under it)
- failed (scratch): R5 stop before any run starts nothing and opens no span
  (scratch edit: the narrower edit, `stop` forking its empty run under `Effect.withSpan("stop")`, because a stop that opens a span is the property the row states; 2 row(s) failed under it)
- failed (scratch): R6 stop while a run is in flight interrupts it, and it never completes
  (scratch edit: `stop` made a no-op (`stop: () => undefined`); 4 row(s) failed under it)
- failed (scratch): R7 stop after a run completed changes nothing and opens no span
  (scratch edit: the narrower edit, `stop` forking its empty run under `Effect.withSpan("stop")`, because the row's own state-change assertions need a stop that re-forks a completed run, which the module has no path for; 2 row(s) failed under it)

## 87-10 the mutation close

The touched close (`pnpm exec stryker run stryker.devtools.mjs --mutate <the five files>`, 96.99) left eight new open mutants in `SimulationSession.ts`: the stop handed to the stated run (L365 to L368, five Survived and NoCoverage) and two on the lines the move changed (L419 `if (!live.current()) return;`, L441 `if (runs.closed()) return;`). Each row below was seen failing with its mutant applied by hand in a copy of the file, restored from it with `cp` and compared with `cmp` before the commit.

- failed (mutant): SS1 a run that dies before it reads its own exit reads Broke with the first line of the error, published once
  (mutant edits of `packages/devtools/src/model/SimulationSession.ts`, each run alone: L366 `if (run._tag !== "Running") return;` to `if (true) return;`, the body of the stop callback emptied, L367 `run = { _tag: "Broke", ... }` to `run = {}`, and L368 `commit();` removed; 1 row(s) failed under each)
- failed (mutant): SS2 a run asked of a closed session publishes nothing, even a refusal
  (mutant edit of `packages/devtools/src/model/SimulationSession.ts`: L441 `if (runs.closed()) return;` to `if (false) return;`; 1 row(s) failed under it)

L419 `if (!live.current()) return;` (`ConditionalExpression -> false`) is recorded as `EQUIVALENT` in `87-mutation.mjs`, not killed. Two rows that would reach it were written and driven: a Live resolver that starts a newer run from inside the older run's turn (the log read `Running:alice Running:alice Running:bob Ran:bob`, so the older run never landed) and a tracer whose run-span creation, inside the older engine's synchronous prefix, starts a newer run (`Running:alice | Running:alice | Running:bob | resolve | Ran:bob`). Both logs were identical with the line replaced by `if (false) return;`, so no row could fail under that mutant; neither row was kept.

### The born modules

`StatedRun.ts` and `ConfigurePrologue.ts` need no new row: measured by their own test file, every mutant is Killed (22 of 22 and 7 of 7 valid, 8 mutants with the one static arrow examined below).

- The canonical invocation (`--mutate <file> --disableBail`, the whole devtools suite per mutant) left 11 Timeout mutants on `StatedRun.ts` and 5 on `ConfigurePrologue.ts`, and a second run left the same counts, so the host load was not the cause. Applying the L78 mutant (`current: () => undefined`) by hand and running the devtools project did not finish in 120 seconds: a test of another file waits for ever on a status a stop never reaches. With `--disableBail` such a mutant keeps every covering test running and Stryker reports the sum as a Timeout, and no killer is recorded for it, so the absolute rule (a killer in the module's own test file) cannot be read from that run. A longer allowance (`--timeoutMS 120000`) left 2 on `StatedRun.ts`.
- The measurement was therefore taken over the group's own killers file alone: the same `stryker.devtools.mjs` spread with its vitest `include` narrowed to `test/model/StatedRun.test.ts` (and `test/model/ConfigurePrologue.test.ts`), through an untracked scratch config removed before each record, with the same `--mutate <file> --disableBail`. A mutant only a store's test killed would show there as Survived, so this run is stricter than the canonical one and cannot hide a gap. Result: `StatedRun.ts` 22 Killed, 0 Timeout; `ConfigurePrologue.ts` 7 Killed, 1 Ignored (the static arrow), 0 Timeout.
- The one Ignored mutant of `ConfigurePrologue.ts`, L40 `ArrowFunction -> () => undefined` (the arrow `makeConfigure` is built from, evaluated when the module loads, so `ignoreStatic` skips it): run by hand with `ignoreStatic: false` through the same scratch config it is Killed by 8 rows of `ConfigurePrologue.test.ts`. It is the scorer's `EXAMINED` entry for that file, which the absolute rule now honours the way the touched rule already did.
