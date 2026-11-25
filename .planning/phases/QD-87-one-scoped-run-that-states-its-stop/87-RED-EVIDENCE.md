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
