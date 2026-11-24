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
