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

## Not RED at the base

None. Every test written to be RED on the base failed there.
