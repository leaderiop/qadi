# Phase 86 RED evidence

Every line below was written when the check it names was seen failing. A line is one of `- failed: <title>` (a test or
cell seen failing under a scratch edit), `- failed (<tag>): <title>` (the same, with the kind of edit in the tag),
`- red on the base: <title>` (a test red on the unchanged base, before the change that turns it green), or `- check
failed: <mode>: <first stderr line>` (a phase script's mode seen refusing); the rest of a run's stderr, when kept, is
indented under its line. A scratch edit is restored from a copy before anything is committed.

## 86-01 the provider registry cells

Each cell was seen failing under one scratch edit of `packages/react/src` (`QadiProvider.tsx`; C5 of `QadiAtoms.ts`, C8
of `DeveloperSignals.ts`) that changes only what it pins; the edit follows its cell, with the number of cells that failed
under it, and the other cells the same edit also moved are not listed. Each edit was restored with `cp` from a copy and
`git diff 41c53c65c3ceb60f974650dd374f391c81db56e7 -- packages/react/src` was empty afterwards.

- failed: C1 an initial value for the subject atom is read in the first render and the prop subject after the commit
  (scratch edit: the seed order reversed, the prop subject first and initialValues after; 1 cell(s) failed under it)
- failed: C2 a server render of a seeded provider schedules no timer and recycles nothing
  (scratch edit: lease.hold(); lease.release(); added in render right after the lease is built; 3 cell(s) failed under it)
- failed: C3 a render React discards schedules no timer beyond the same tree without the provider
  (scratch edit: the same edit as C2; 3 cell(s) failed under it)
- failed: C4 an atoms swap is reported before the subject of the new atom set is written
  (scratch edit: the atoms-identity effect moved below the subject-write effect; 1 cell(s) failed under it)
- failed: C5 an equal subject notifies no subscriber of the subject atom and a new one notifies once
  (scratch edit: Atom.withEquality(subjectsEqual) removed from the subject atom in QadiAtoms.ts; 1 cell(s) failed under it)
- failed: C6 no atoms swap is reported for a StrictMode double effect or a plain reveal
  (scratch edit: the report made unconditional in the atoms-identity effect; 3 cell(s) failed under it)
- failed: C7 a subject and an atom set committed together are the ones a long hide writes back
  (scratch edit: the recycle writes the first render's atoms.subject and subject instead of latestRef.current's; 1 cell(s) failed under it)
- failed: C8 a reporter that throws on an atoms swap still leaves the new subject written
  (scratch edit: the try/catch in contain removed in DeveloperSignals.ts; 1 cell(s) failed under it)
- failed: C9 the first commit writes the prop subject over a seeded one with no reader of it
  (scratch edit: the subject-write effect body emptied; 6 cell(s) failed under it)
