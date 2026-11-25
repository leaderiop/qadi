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
