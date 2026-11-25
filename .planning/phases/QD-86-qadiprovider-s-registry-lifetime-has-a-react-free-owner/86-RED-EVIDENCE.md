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

## 86-01 the pinned check

`86-pinned-check.mjs` was seen refusing a one-byte change (a trailing newline) to a held test and to the held lease, each
restored with `cp` from a copy in the scratch directory; the self-test also plants a changed byte, a deleted file, a
renamed file, a born file added by two commits and a born file that differs from its adding commit.

- check failed: 86-pinned-check.mjs: packages/react/test/QadiProvider.lifetime.test.tsx is reported as M against its base, not unchanged
  (scratch edit: one newline appended to the held lifetime suite)
- check failed: 86-pinned-check.mjs: packages/react/src/RegistryLease.ts is reported as M against its base, not unchanged
  (scratch edit: one newline appended to the held lease)

## 86-02 the check helper

Each line is a run of the mode seen now; the mode and the input that made it fail follow in the note under the line, and
the rest of its stderr is indented under that. `records` passes on the base and the line for it is from the scratch edit.

- check failed: commit: 0 commits since phase_base have the subject: chore(86-02): a subject nobody committed
  (a wrong subject)
- check failed: unchanged: packages/react/src/QadiProvider.tsx differs from phase_base
  (a scratch edit of QadiProvider.tsx, a newline appended and restored with git checkout --)
- check failed: seen-failing: no failure line in the evidence for: C0 a title with no failure line
  (a title with no failure line)
- check failed: scan-ids: packages/react/src/QadiProvider.tsx:360 names a plan id: // see 86-02
  (a scratch line at the end of QadiProvider.tsx holding a plan id, restored with git checkout --)
- check failed: scan-forbidden: packages/react/src/QadiProvider.tsx:360 uses an as cast: const planted = value as Planted;
  (a scratch line at the end of QadiProvider.tsx holding an as cast, restored with git checkout --)
- check failed: trailers: the message has 2 Co-Authored-By lines, not one
  (trailers --message with two Co-Authored-By lines)
- check failed: owner-shape: RegistryOwner.ts is missing
  (on the base, where the owner does not exist and the Stryker list does not name it)
  stryker.react.mjs does not mutate RegistryOwner.ts
- check failed: provider-forwards-only: packages/react/src/QadiProvider.tsx has 6 useEffect calls, not 4
  (on the base, where the provider holds six effects, six refs and the lease wiring)
  packages/react/src/QadiProvider.tsx has 6 useRef calls, not 3
  packages/react/src/QadiProvider.tsx does not build the owner once, as ownerRef.current ??= makeRegistryOwner(
  packages/react/src/QadiProvider.tsx calls makeRegistryOwner( other than once
  packages/react/src/QadiProvider.tsx names registryRef, which the owner keeps
  packages/react/src/QadiProvider.tsx names atomsIdentityRef, which the owner keeps
  packages/react/src/QadiProvider.tsx names latestRef, which the owner keeps
  packages/react/src/QadiProvider.tsx names leaseRef, which the owner keeps
  packages/react/src/QadiProvider.tsx names makeRegistryLease, which the owner keeps
  packages/react/src/QadiProvider.tsx names RegistryLease, which the owner keeps
  packages/react/src/QadiProvider.tsx names AtomRegistry.make, which the owner keeps
  packages/react/src/QadiProvider.tsx names .reset(, which the owner keeps
  packages/react/src/QadiProvider.tsx names registry.set(, which the owner keeps
  packages/react/src/QadiProvider.tsx names registry.get(, which the owner keeps
  packages/react/src/QadiProvider.tsx does not read owner.registry
  packages/react/src/QadiProvider.tsx does not import AtomRegistry as a type only (import type * as AtomRegistry)
  packages/react/src/QadiProvider.tsx does not import makeRegistryOwner from ./RegistryOwner.ts
  packages/react/src/QadiProvider.tsx imports from RegistryLease.ts
- check failed: records --close: BEH-QD-766 has no heading in spec/behaviors/09-react.md
  (on the base, where no reserved record is written yet)
  BEH-QD-766 has no row in spec/traceability.md §1
  BEH-QD-767 has no heading in spec/behaviors/09-react.md
  BEH-QD-767 has no row in spec/traceability.md §1
  BEH-QD-747's Pinned by paragraph names packages/react/test/QadiProvider.lifetime.test.tsx first, not packages/react/test/RegistryOwner.test.ts
  BEH-QD-748's Pinned by paragraph names packages/react/test/RegistryLease.test.ts first, not packages/react/test/RegistryOwner.test.ts
  BEH-QD-749's Pinned by paragraph names packages/react/test/QadiProvider.lifetime.test.tsx first, not packages/react/test/RegistryOwner.test.ts
  BEH-QD-750's Pinned by paragraph names packages/react/test/QadiProvider.lifetime.test.tsx first, not packages/react/test/RegistryOwner.test.ts
  INV-QD-417 has no heading in spec/invariants.md
  INV-QD-417 has no row in spec/traceability.md §2
  INV-QD-418 has no heading in spec/invariants.md
  INV-QD-418 has no row in spec/traceability.md §2
  the **Source**: line of INV-QD-409 does not name RegistryOwner.ts
  the **Source**: line of INV-QD-410 does not name RegistryOwner.ts
  the **Source**: line of INV-QD-410 still names registryRef
  spec/decisions/199-*.md does not exist
  spec/decisions/index.yaml has no ADR-QD-199 entry
  ADR-QD-199 has no row in spec/traceability.md §3
  ADR-QD-195 is not at Revision 1.4
  ADR-QD-195 does not name ADR-QD-199
  spec/README.md has no CCR-QD-478 row
- check failed: records: BEH-QD-748 names row RL11 for packages/react/test/RegistryLease.test.ts, which no title opens
  (a copy-backed scratch edit of spec/behaviors/09-react.md changing RL1 to RL10 to RL1 to RL99 in the Pinned by paragraph of BEH-QD-748, restored with cp)
  BEH-QD-748 names row RL12 for packages/react/test/RegistryLease.test.ts, which no title opens
  (and one such line for each of RL13 to RL99, 87 lines)

## 86-03 the earlier-checks ledger

The ledger passes on the tree. The line below is its first stderr line under a copy-backed scratch edit of
`stryker.react.mjs` that drops `"packages/react/src/RegistryLease.ts",` from `mutate` (restored with `cp`, after which
`git diff --quiet -- stryker.react.mjs` held and the ledger exited 0 again). The one run that changed is Phase 82's
`single-owner`, which now prints exit 1 and `stryker.react.mjs does not mutate RegistryLease.ts`; every other row still
matched.

- check failed: 86-earlier-checks.mjs: 82-check.mjs single-owner: expected exit 0, got exit 1: stryker.react.mjs does not mutate RegistryLease.ts
  (a scratch edit of stryker.react.mjs removing RegistryLease.ts from mutate; that was the only reason, and the exit status was 1)

## 86-04 the registry owner

Each row was seen failing under one scratch edit of `packages/react/src/RegistryOwner.ts`, a copy-backed edit restored with
`cp` from a copy in the scratch directory (`git diff -- packages/react/src` was empty afterwards); the edit follows its row.

- failed: RO2 a release recycles once when its deferred run fires
  (scratch edit: the recycle body emptied; 2 row(s) failed under it, RO2 and RO5)
- failed: RO5 a long hide re-seeds from the latest commit before any read
  (scratch edit: the recycle writes seed.atoms.subject and seed.subject instead of the latest; 1 row(s) failed under it)

- failed: RO1 a built owner defers nothing, and a commit and a hold defer nothing either
  (scratch edit: the factory ends with lease.hold(); lease.release();; 4 row(s) failed under it, RO1, RO3, RO4 and RO15)
- failed: RO3 commits and holds with no release leave the registry alone however often they run
  (scratch edit: hold runs the lease hold and then its release; 4 row(s) failed under it, RO1, RO3, RO4 and RO15. The plan edit, a release at construction, left all 16 rows green because a release on an unheld lease does nothing, so it is the narrower edit that is recorded)
- failed: RO4 a hold before the deferred run fires cancels the one recycle, and a later release defers again
  (scratch edit: hold forwarded as a function that does nothing; 12 row(s) failed under it)
- failed: RO6 a recycle whose reset throws still writes the latest subject back and the owner recycles again
  (scratch edit: the try/finally replaced by two plain statements; 1 row(s) failed under it)
- failed: RO7 a recycle returns neither an initial value nor the seed, only the latest commit
  (scratch edit: the recycle re-applies seed.initialValues after the subject write; 6 row(s) failed under it)
- failed: RO8 an atom set that is not the last committed one is reported once however often it is committed
  (scratch edit: the condition replaced by true, by false and by === in three separate edits; RO8 and RO9 failed under each)
- failed: RO9 the callback runs before the subject is written and a callback that throws writes nothing
  (scratch edit: the subject write moved before the callback; 2 row(s) failed under it, RO9 and RO10)
- failed: RO10 a commit whose write throws has already recorded the latest for a later recycle
  (scratch edit: the record of the latest moved after the write; 1 row(s) failed under it)
- failed: RO11 the subject is seeded first so an initial value for it wins, and the node count is the entries and the subject
  (scratch edit: the seed order reversed, the host entries first and the subject last; 1 row(s) failed under it. The plan edit that replaces ?? [] by the subject entry left all 16 rows green because a duplicate entry for one atom adds no node, so the narrower edit that replaces ?? [] by one extra atom entry is the one that also fails RO11)
- failed: RO12 a reset replaced on the registry after construction is the one a recycle calls
  (scratch edit: the recycle calls a reset captured at construction; 3 row(s) failed under it)
- failed: RO13 a subscription a host holds on the registry stops hearing after a recycle
  (scratch edit: the recycle body emptied; 9 row(s) failed under it)
- failed: RO14 one registry object is the one a commit, a hold, a release and a recycle all act on
  (scratch edit: the returned registry is a second AtomRegistry.make; 15 row(s) failed under it)
- failed: RO15 a defer that throws makes the release throw and leaves the owner usable and held
  (scratch edit: release wrapped to swallow the throw; 1 row(s) failed under it)
- failed: RO16 a host refresh of the subject atom after the first commit keeps the current subject
  (scratch edit: the registry.get(atoms.subject) !== subject guard reinstated around the write; 1 row(s) failed under it)
- twin: recycle body emptied: RO2 failed; RO1, RO3, RO4 passed
  (the recycles-nothing rows RO1, RO3 and RO4 assert only what is deferred and what a fire leaves alone, so RO2 is their recycles-once twin; 9 rows failed under the edit in all: RO2, RO5, RO6, RO7, RO10, RO12, RO13, RO14 and RO15)
