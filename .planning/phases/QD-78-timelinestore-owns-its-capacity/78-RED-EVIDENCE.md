# QD-78 RED evidence

The capacity defect tests, run on the unchanged source of the phase base.

## Timeline defects

- HEAD: `a57977529c28e4b6dd58ba970fe306071ca53b6e` (no file under `packages/devtools/src` differs from `phase_base`
  `de13eb7f48f2e0e77b374299d20d2e5e891bef95`)
- Command: `pnpm exec vitest run --project devtools packages/devtools/test/model/Timeline.test.ts
  packages/devtools/test/model/TimelineStore.test.ts packages/devtools/test/model/TimelineFeed.test.ts
  packages/devtools/test/react/useTimeline.test.tsx --reporter=json --outputFile=<S>/red.json`
- Result: `Tests  6 failed | 91 passed (97)`; the command exits non-zero
- Base check: `/usr/bin/grep -nE "DEFAULT_TIMELINE_CAPACITY|capacity: undefined"
  packages/devtools/test/model/TimelineFeed.test.ts` prints nothing (exit 1), so none of TF4, TF14, TF26, TF27 or TF29
  pins an omitted capacity against the default. None of them was edited.

## RED rows

Each row is a capacity defect of the timeline, the store, the feed or the hand-fed hook.

- RED: a record a zero-capacity timeline cannot keep returns the identical timeline
  - `AssertionError: expected { entries: [], capacity: +0 } to equal { entries: [], capacity: +0 }` (a fresh object per record)
- RED: a record at a capacity of zero notifies no subscriber and keeps the snapshot
  - `AssertionError: expected 2 to equal +0` (the store notified once per record)
- RED: TF30 a capacity that is not a non-negative integer throws and changes nothing, so a later configure compares with the inputs the feed held
  - `AssertionError: refusal 2 throws: expected false to be true` (the first refusal assigned its inputs, so the second compared equal and threw nothing)
- RED: TF31 a restart after a refused configure reads the source the feed held
  - `AssertionError: expected { reads: 1 } to deeply equal { reads: +0 }` (the restart read the refused source)
- RED: TF32 a zero-capacity feed tells its timeline listeners nothing for records it cannot keep
  - `AssertionError: expected 2 to equal +0` (the mirror published once per record)
- RED: UT4 a changed capacity empties the hand-fed store at the new bound and keeps the store
  - `AssertionError: expected 5 to equal 1` (the hand-fed store kept its first capacity)

### The dock

- RED: M55: a capacity the timeline refuses throws and changes nothing in the dock, so a later configure compares with the inputs the dock held
  - `AssertionError: expected 6 to equal +0` (the later configure with the held inputs moved the rails, the ports and the timeline: six notifications)
- RED: M56: a timeline listener that throws on a capacity change is rethrown once the dock has applied the rest of the configure
  - `AssertionError: expected [] to deeply equal [ 'editor' ]` (the throw escaped before the role list was applied)

The dock rows ran at HEAD `324bf9da` (no file under `packages/devtools/src` differs from `phase_base`), by
`pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts --reporter=json
--outputFile=<S>/red-dock.json`: `Tests  2 failed | 61 passed (63)`; the command exits non-zero. `DockModel.ts` assigns its
inputs before the timeline feed is configured, and applies the rest in straight-line code after it.

## Not RED at the base

None. Every test written to be RED on the base failed there.

## Characterised at the base

The five characterisations were written on the unchanged source of the phase base
`de13eb7f48f2e0e77b374299d20d2e5e891bef95` and pass there; the same five files plus `DockModel.test.ts` still fail exactly the
eight RED titles above, and no other.

- Command: `pnpm exec vitest run --project devtools packages/devtools/test/model/Timeline.test.ts
  packages/devtools/test/model/TimelineStore.test.ts packages/devtools/test/model/TimelineFeed.test.ts
  packages/devtools/test/react/useTimeline.test.tsx packages/devtools/test/model/DockModel.test.ts --reporter=json
  --outputFile=<S>/char.json`
- Result: `Tests  8 failed | 157 passed (165)`; the command exits non-zero (the eight RED titles)
- characterised: TF33 an omitted capacity after the default capacity, and the default after an omitted one, each empty the timeline and read again
- characterised: TF34 the store a host holds is one object for the feed life: a listener added before two capacity changes hears each emptied timeline once
- characterised: TF35 a capacity change while paused releases the pause and shows the emptied live timeline
- characterised: a timeline holding entries over a zero bound is emptied by the next record
- characterised: UT5 a re-render with the same capacity, or with none after none, keeps the hand-fed entries

## Shown failing once

Each characterisation was run against a one-line, uncommitted edit of the base source it is about, failed, and the edit
was restored with `git checkout -- <file>`. After the last restore `git diff --quiet -- packages/devtools/src` holds.

- shown failing: TF33 an omitted capacity after the default capacity, and the default after an omitted one, each empty the timeline and read again
  - Edit: `TimelineFeed.ts` `configure`: `const resized = false;` (the identity comparison never fires)
  - First message: `AssertionError: expected [ 'manual' ] to deeply equal []`
- shown failing: TF34 the store a host holds is one object for the feed life: a listener added before two capacity changes hears each emptied timeline once
  - Edit: `TimelineFeed.ts`: `const push = () => {};` (the mirror hears nothing)
  - First message: `AssertionError: expected [] to deeply equal [ 3, 2 ]`
- shown failing: TF35 a capacity change while paused releases the pause and shows the emptied live timeline
  - Edit: `TimelineFeed.ts` forwarder: `isPaused: () => true,`
  - First message: `AssertionError: expected true to be false`
- shown failing: a timeline holding entries over a zero bound is emptied by the next record
  - Edit: `Timeline.ts`: `const bound = (self: Timeline): Timeline => self;`
  - First message: `AssertionError: expected [ TimelineDecision{ …(6) }, …(1) ] to deeply equal []`
- shown failing: UT5 a re-render with the same capacity, or with none after none, keeps the hand-fed entries
  - Edit: `useTimeline.ts` `useTimelineStore`: `const [store] = [makeTimelineStore(options)];` (a store per render)
  - First message: `AssertionError: expected { entries: [], capacity: 3 } to equal { entries: [], capacity: 3 }`

## RED at the change

Each test was run against the tree that lacks the rule it pins, and failed.

- RED at the change: a clear after a resize keeps the capacity it was resized to
  - Run before `clear` changed, with `resize` in place: `AssertionError: expected 5 to equal 3` (the clear rebuilt the timeline at the constructor's capacity)
- RED at the change: TF33 an omitted capacity after the default capacity, and the default after an omitted one, each empty the timeline and read again
  - The base form, run unedited against the new feed (the effective capacity is the store's): `AssertionError: expected [ 'manual' ] to deeply equal []` (the timeline is kept and nothing is read again); rewritten in the same commit as the one-bound rule

## Shown failing once, after the change

Each check was run against a one-line, uncommitted edit of the changed source, failed, and the edit was restored with
`git checkout -- packages/devtools/src/model/TimelineFeed.ts`. After the last restore `git diff --quiet -- packages/devtools/src` holds.

- shown failing: TF33 an omitted capacity and the default capacity are one bound: moving between them keeps the timeline and reads nothing again
  - Edit: `TimelineFeed.ts` `configure`: the read condition `resized || next.source !== before.source` replaced by `next.capacity !== before.capacity || next.source !== before.source` (the identity rule)
  - First message: `AssertionError: expected { started: 2, finalized: 1 } to deeply equal { started: 1, finalized: +0 }`
- shown failing: TF36 the idle timeline answers any resize with false and stays one empty snapshot that nothing hears
  - Edit: `TimelineFeed.ts`: `resize: () => true,` on `idleTimeline`
  - First message: `AssertionError: expected true to be false`

## The dock, shown failing once after the change

M55 and M56 pass unedited since the dock RED commit. Each was run against an uncommitted edit of `DockModel.ts` that
undoes the half of the fix it pins, failed, and the file was restored. After the last restore `git diff --quiet --
packages/devtools/src` holds (the working-tree fix is the change under commit).

- shown failing: M55: a capacity the timeline refuses throws and changes nothing in the dock, so a later configure compares with the inputs the dock held
  - edit: `DockModel.ts` `configure`: `const capacity = next.capacity;` in place of `const capacity = effectiveCapacity(next.capacity);`
  - First message: `AssertionError: expected 4 to equal +0` (the refused capacity left the dock holding inputs it never applied, so the later configure moved the rails, the ports and the timeline)
- shown failing: M56: a timeline listener that throws on a capacity change is rethrown once the dock has applied the rest of the configure
  - edit: `DockModel.ts` `configure`: the `try`/`finally` unwrapped, the feed configure and the rest of the inputs in straight-line code
  - First message: `AssertionError: expected [] to deeply equal [ 'editor' ]` (the throw escaped before the role list was applied)
