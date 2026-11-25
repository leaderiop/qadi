---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
reviewed: 2026-11-25T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - packages/react/src/RegistryOwner.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/test/RegistryOwner.test.ts
  - packages/react/test/QadiProvider.owner.characterisation.test.tsx
  - packages/react/test/support/recordingDefer.ts
  - stryker.react.mjs
  - .changeset/react-registry-lifetime-has-an-owner.md
findings:
  critical: 0
  warning: 0
  info: 5
  total: 5
  necessity: 0
status: issues_found
---

# Phase 86: Code Review Report

**Reviewed:** 2026-11-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the React-free `RegistryOwner`, the provider that now forwards to it, the two new test files and the
recording-defer helper, the Stryker entry and the changeset. The pre-phase provider (`git show 41c53c65:...`),
`RegistryLease.ts`, ADR-QD-199 and ADR-QD-195 were read for comparison.

The behaviour holds. I traced the owner against the pre-phase component effect by effect and found no regression:

- **Atom-set swap.** The report-then-record-then-write order matches the old effect order. The first commit compares
  with the atom set the owner was built from. A StrictMode double effect or a reveal finds the same atom set and
  reports nothing.
- **Recycle.** It still calls `reset()` through the property, writes the latest committed subject in a `finally`, and
  never writes back a seed or an initial value.
- **Construction.** It is inert. `defer` is reached only from `release`, through the lease.
- **Unguarded subject write.** The write is equivalent to the old `get !== subject` guard. The subject atom has
  `Atom.withEquality(subjectsEqual)` (`QadiAtoms.ts:241`), and `NodeImpl.setValue` returns early on an equal write
  to an initialized node (effect 4.1.2 `AtomRegistry.ts:974`). On an uninitialized seeded node it replaces the
  value, which gives C9's "first commit writes the prop subject over a seed".

Checks run:

- The four suites `RegistryOwner.test.ts`, `QadiProvider.owner.characterisation.test.tsx`,
  `QadiProvider.lifetime.test.tsx` and `RegistryLease.test.ts` pass (53 of 53).
- `node scripts/check-house-style.mjs` is clean and `tsc -p packages/react/tsconfig.src.json --noEmit` is clean.
- Stryker, scoped to `RegistryOwner.ts` with `stryker.react.mjs`: 19 mutants, all killed, none survived, uncovered
  or timed out. This confirms ADR-QD-199's "19 of 19".
- ADR-QD-199's other checkable claims hold: four effects, three refs, BEH-QD-766/767 and INV-QD-417/418 exist, and
  the RO rows are cited in BEH-QD-747 to 750.

No bugs, security issues or house-rule violations were found. The items below are documentation and test-helper
quality only.

## Info

### IN-01: `RegistryOwner` interface has no doc comment

**File:** `packages/react/src/RegistryOwner.ts:34`
**Issue:** `RegistryOwnerSeed` (line 27) has a one-line summary and each member of `RegistryOwner` is documented,
but the exported interface itself has no leading summary. AGENTS.md's doc-comment shape (one-line summary of what
the export is, rationale after) is applied to every other export in the file. A reader of the barrel-less type
signature, or of the generated declaration, gets no statement of what an "owner" is.
**Fix:** Add `/** What a provider keeps for its registry's life: the registry, and the commit, hold and release that act on it. */` above `export interface RegistryOwner`.

### IN-02: `RegistryLease.ts` header names the wrong caller and the file's rationale for staying so is not about comments

**File:** `packages/react/src/RegistryLease.ts:6-8,12-13`
**Issue:** The header says "The provider holds the lease in its effect and releases it in the cleanup" and that
"`QadiProvider.tsx` is its one caller". Since this phase the owner is the caller: `RegistryOwner.ts:24,67` is the
only importer of `makeRegistryLease`, and the provider reaches the lease only through the owner. ADR-QD-199
Consequences accepts the stale header because the file is "held byte for byte" for its tests and mutation record.
Stryker mutates code, not comments, so editing the header could not move the mutation record. The two files now
disagree about who owns the lease.
**Fix:** Change the header to "`RegistryOwner.ts` is its one caller", or record in ADR-QD-199 that the byte-for-byte
hold is a process choice rather than a measurement constraint.

### IN-03: A comment in `QadiProvider.tsx` still places the registry construction "above"

**File:** `packages/react/src/QadiProvider.tsx:244-247`
**Issue:** "the registry above is built once, at mount, and never rebuilt for a later `atoms` prop". The registry is
no longer built in the provider. The owner is built above (line 241) and the registry is read from it. The sentence
is still true but points at code that has moved. The commit effect's comment is also one long block that mixes the
atoms-replaced rationale (lines 244-257) with the ticket-34 render-phase-write history (lines 258-271). That second
half is about the subject write, and the ADR says the comment was kept at the commit effect on purpose.
**Fix:** Reword to "the owner above builds its registry once, at mount, and never rebuilds it for a later `atoms`
prop". Optionally split the comment so each paragraph sits beside the line it explains.

### IN-04: `recordingDefer.ts` duplicates the lease test's helper, and `fire`'s snapshot is weaker than its doc says

**File:** `packages/react/test/support/recordingDefer.ts:17-35` (twin at `packages/react/test/RegistryLease.test.ts:17-33`)
**Issue:** There are now two copies of the same fake-defer, kept because `RegistryLease.test.ts` is "held byte for
byte". Two copies can drift. The doc says `cancel` "removes exactly the run it was returned for", but `fire` first
moves every pending run into a local `runs` array and clears `pending`. A `cancel` called from inside one fired run
for another run in the same batch therefore does not stop it. No current test does this, because a lease has at
most one pending run, so it is latent. A future test of a re-entrant release would pass for the wrong reason.
**Fix:** Make `fire` re-check membership as it iterates, for example
`for (const run of runs) if (live.has(run)) run()` over a `Set` that `cancel` deletes from. Or drop the "really
cancels" claim from the doc comment. Longer term, have `RegistryLease.test.ts` import this helper once the
byte-for-byte hold is lifted.

### IN-05: The "refresh keeps the subject" behaviour is narrower than the changeset reads, and is inconsistent across a recycle

**File:** `.changeset/react-registry-lifetime-has-an-owner.md:5`; `packages/react/src/RegistryOwner.ts:12-15`
**Issue:** The changeset says a host `registry.refresh` of the subject atom "before anything has read it now keeps
the current subject". That is accurate, and I confirmed it against effect 4.1.2 with a scratch script. After
`registry.set` on a seeded, unread node, `refresh` returns the written value. After any read (`get` then `refresh`),
or after a recycle (`reset`, `set`, `refresh`), it returns `undefined`.

The new behaviour therefore depends on whether a gate has read the subject. In a rendered provider, consumers read
it during the first render, before the commit effect runs, so the window is almost never open. The same refresh
resets the subject to `undefined` after a recycle, as it did before. Documenting the edge is fine, but the owner
header's "keeps the seed of a node nothing has read across a host `registry.refresh`" and RO16 pin a state that a
real tree rarely holds. The changeset's "One edge differs" invites a host to rely on it.
**Fix:** Say in the changeset and ADR-QD-199 that the difference is reachable only before the first read and is not
a supported guarantee. Or decide whether `refresh` of the subject atom should keep the current subject in every
state, which would need the recycle's write to carry the same flag.

---

_Reviewed: 2026-11-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
