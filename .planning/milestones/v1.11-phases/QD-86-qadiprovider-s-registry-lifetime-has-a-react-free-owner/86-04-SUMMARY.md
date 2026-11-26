---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
plan: 04
subsystem: react
tags: [react, registry-owner, headless-tests, mutation, stryker, red-evidence]

phase_base: 41c53c65c3ceb60f974650dd374f391c81db56e7
plan_head_before: 93128bf094061c0b09d9e800ec29dd19d54b7275
plan_head_after: b131ef7ac311aae2315a1982292ae66b22b86593
commits: 2

requires:
  - phase: QD-86 plan 01
    provides: the lease mutation base 28/28 and the characterisation the provider move is judged by
  - phase: QD-86 plan 02
    provides: 86-check.mjs `owner-shape`, `scan-forbidden`, `scan-ids`, `seen-failing`
  - phase: QD-86 plan 03
    provides: 86-earlier-checks.mjs, run here and unchanged
provides:
  - packages/react/src/RegistryOwner.ts (`RegistryOwner`, `RegistryOwnerSeed`, `makeRegistryOwner`), package-private and React-free
  - packages/react/test/support/recordingDefer.ts (`RecordingDefer`, `makeRecordingDefer`)
  - packages/react/test/RegistryOwner.test.ts, rows RO1 to RO16
  - stryker.react.mjs mutating the owner after the lease
  - 86-RED-EVIDENCE.md `## 86-04 the registry owner`
affects: [QD-86 plan 05 (the provider forwards to the owner), QD-86 plan 08 (the close)]

actuals:
  tokens: 14000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a React-free owner closure over the unchanged lease: what a build, a commit and a recycle do lives where the mutation run measures it"
    - "a recycles-nothing row asserts only what is deferred and what a fire leaves alone, so a recycles-once row is its twin"

key-files:
  created:
    - packages/react/src/RegistryOwner.ts
    - packages/react/test/support/recordingDefer.ts
    - packages/react/test/RegistryOwner.test.ts
  modified:
    - stryker.react.mjs
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-RED-EVIDENCE.md

key-decisions:
  - "The recycles-nothing rows RO1, RO3 and RO4 end on what was deferred, not on a recycle, so emptying the recycle body fails RO2 and leaves them green; the plan's own wording asked for both"
  - "RO10 uses a listener that throws, because a throwing listener escapes registry.set on effect 4.1.2 (measured)"

patterns-established:
  - "the owner's subject write is unguarded; RO16 pins that a host refresh after the first commit keeps the subject"

requirements-completed: []

coverage:
  - id: D1
    description: "RegistryOwner.ts: block-bodied factory, closure state, lease composed by reference, inert at construction; owner-shape, scan-forbidden, scan-ids pass; QadiProvider.tsx, index.ts and RegistryLease.ts equal phase_base"
    requirement: PREG-02
    verification:
      - kind: other
        ref: "Task 1 verify: owner-shape, scan-forbidden, scan-ids, 86-pinned-check.mjs, git diff against phase_base"
        status: pass
    human_judgment: false
  - id: D2
    description: "Rows RO1 to RO16 headless against a real AtomRegistry, each seen failing under its scratch edit, the emptied-recycle twin line recorded"
    requirement: PREG-03
    verification:
      - kind: test
        ref: "packages/react/test/RegistryOwner.test.ts (16 passed three runs in a row); 86-check.mjs seen-failing"
        status: pass
    human_judgment: false
  - id: D3
    description: "RegistryOwner.ts under Stryker alone with --disableBail: 19 mutants, 19 killed, none survived, uncovered, ignored or timed out; every killer in RegistryOwner.test.ts"
    requirement: WX-05
    verification:
      - kind: other
        ref: "86-mutation.mjs probe owner (the report passes as its close would judge it)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-11-25
status: complete
---

# Phase 86 Plan 04: The registry owner Summary

**A React-free `makeRegistryOwner` builds and seeds a provider's registry, records the latest commit, writes the subject unguarded and recycles through the unchanged lease; sixteen headless rows, each seen failing, kill all 19 of its mutants.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 3 (tracer, auto, auto); Task 3 changed nothing, because the first probe was clean
- **Files created:** 3 (and this summary); 2 modified
- **Commits:** 2

## Accomplishments

- `RegistryOwner.ts` is a block-bodied factory (`makeRegistryOwner(seed, defer?): RegistryOwner`) with one registry
  built from `[[seed.atoms.subject, seed.subject] as const, ...(seed.initialValues ?? [])]`, a `latest` closure value,
  one `makeRegistryLease(recycle, defer)` and `hold`/`release` forwarded by reference. The recycle is
  `try { registry.reset(); } finally { registry.set(latest.atoms.subject, latest.subject); }`; `commit` reports a swap,
  records the latest, then writes the subject with no read first. Building it schedules nothing.
- `recordingDefer.ts` copies the lease test's defer (that file is held) into a shared support file.
- Rows RO1 to RO16 run with no React, a real `AtomRegistry` and the real lease. Green three runs in a row; the whole
  react project passes (44 files, 703 tests).
- Every row was seen failing under its own scratch edit of the owner (`86-RED-EVIDENCE.md`). Under the emptied recycle
  body RO2 fails and RO1, RO3 and RO4 stay green (the `- twin:` line).
- RO16 fails with the `registry.get(atoms.subject) !== subject` guard reinstated: a seeded node nothing has read keeps
  its preserve flag across a host `registry.refresh` after an unguarded first commit, and a guarded one clears it.
- Stryker over the owner alone with `--disableBail`: 19 mutants, 19 killed, no survivor, no uncovered, ignored or
  timed-out mutant; `86-mutation.mjs probe owner` printed `the report passes as its close would judge it`.
- `stryker.react.mjs` mutates the owner after the lease, names it and `RegistryOwner.test.ts`, and never mutates
  `QadiProvider.tsx`; the edit is in the commit that creates the owner.

Probe output (`<S>/probe-owner.txt`):

```
packages/react/src/RegistryOwner.ts 19/19 survived 0 no coverage 0 ignored 0
packages/react/src/RegistryOwner.ts 19/19, survived 0, no coverage 0, ignored 0, timeout 0
probe owner: the report passes as its close would judge it
```

## Task Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | `bbcc29eb` | `feat(86-04): a React-free owner keeps a provider registry` |
| 2 | `b131ef7a` | `test(86-04): pin every path of the registry owner` |
| 3 | none | the first Stryker probe was clean |

## Deviations from Plan

**1. [Plan defect, fixed in place] RO1, RO3 and RO4 could not both recycle once and stay green under an emptied recycle body**
- **Found during:** Task 2
- **Issue:** the interfaces' RO4 row ends on "a later release then `fire()` recycles once", and Task 2 requires the
  evidence line `twin: recycle body emptied: RO2 failed; RO1, RO3, RO4 passed`. A row that recycles once fails under an
  emptied body, so the two could not both hold.
- **Fix:** RO1, RO3 and RO4 end on what was deferred and cancelled (`counts`) and on what a `fire()` leaves alone; RO2 is
  the recycles-once twin. The RO4 title says `a later release defers again`. The evidence line was written only after
  the run showed RO1, RO3 and RO4 green and RO2 red under the emptied body.
- **Files modified:** packages/react/test/RegistryOwner.test.ts
- **Commit:** `b131ef7a`

**2. [Measured, not as expected] Two of the plan's scratch edits left every row green; narrower edits are recorded**
- **Found during:** Task 2
- **RO3:** a `release()` at construction does nothing on an unheld lease, so all 16 rows stayed green. Recorded edit:
  `hold` runs the lease's hold and then its release (RO1, RO3, RO4, RO15 fail).
- **RO11:** `?? []` replaced by `?? [[seed.atoms.subject, seed.subject]]` adds a duplicate entry for one atom and so
  no node; all 16 rows stayed green (an equivalent edit). Recorded second edit: `?? []` replaced by one extra atom
  entry (RO11 fails). Stryker raised no survivor for it.
- **Commit:** `b131ef7a`

**3. [Measured] RO10 uses the throwing listener**
- A listener that throws escapes `registry.set` on effect 4.1.2 after the node holds the value, so RO10 makes the write
  throw and reads what a later recycle writes. A listener that releases and fires during the notification was also
  measured and works, but the plan names the throwing form first. The test-file comment says which and why.

**4. [Measured] RO16's second commit reads without a refresh**
- After a first refresh the subject has been read, so its preserve flag is cleared and a second refresh resets it to its
  default whatever the owner does. The row therefore commits the second subject and reads it directly, as the plan's
  "a further commit of a second subject reads that one" says.

**Total deviations:** 4 (1 plan defect, 3 measured differences). **Impact:** none on what the owner or its rows prove;
all 16 rows, the twin line and the born-file mutation bar hold.

## Issues Encountered

None. The Stryker run was on a quiet host (nothing else running) and finished in 8 seconds with no timeout.

## Known Stubs

None.

## Threat Flags

None. T-86-09 holds (the recycle writes only the latest commit; RO5 and RO7 seen failing with seed-writing edits),
T-86-10 (RO5, RO9, RO10), T-86-11 (RO6, RO15), T-86-12 (the owner never disposes; RO14), T-86-13 (RO8 under its three
edits) and T-86-14 (RO16 under the reinstated guard).

## Next Phase Readiness

Ready for plan 05. `QadiProvider.tsx`, `index.ts` and `RegistryLease.ts` equal `phase_base`, `owner-shape` passes,
`node 86-earlier-checks.mjs` exits 0, and `pnpm exec vitest run --project react` is green on the old wiring. The provider
can now build the owner once in render and forward to it.

## Self-Check: PASSED

- Files: `packages/react/src/RegistryOwner.ts`, `packages/react/test/support/recordingDefer.ts`,
  `packages/react/test/RegistryOwner.test.ts` exist.
- Commits `bbcc29eb` and `b131ef7a` are ancestors of HEAD, each with the one Co-Authored-By trailer.
- `node 86-check.mjs seen-failing packages/react/test/RegistryOwner.test.ts` and `node 86-mutation.mjs probe owner` pass;
  `git status --porcelain -- packages` is empty.
