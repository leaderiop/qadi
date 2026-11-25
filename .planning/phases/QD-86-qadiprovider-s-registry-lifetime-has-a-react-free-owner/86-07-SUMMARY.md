---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
plan: 07
subsystem: react
tags: [react, stryker, mutation, changeset, close-checks, registry-owner]

phase_base: 41c53c65c3ceb60f974650dd374f391c81db56e7
plan_head_before: 07c5afb4a116b0873a9ac4628489e6b33a86d4e3
plan_head_after: f1f19c51b16583558499a6e4fbfc9389e2f3d203
commits: 2

requires:
  - phase: QD-86 plan 01
    provides: the lease mutation base (28/28) and 86-mutation.mjs
  - phase: QD-86 plan 04
    provides: RegistryOwner.ts and its 19/19 probe
  - phase: QD-86 plans 02, 03, 05, 06
    provides: the phase checks, the earlier-checks ledger, the forwarding provider and the records
provides:
  - 86-mutation-close.json, the lease and the owner measured on one head with --disableBail
  - .changeset/react-registry-lifetime-has-an-owner.md, one @qadi/react patch
  - every phase check run on the finished tree, as measured lines
affects: [QD-86 plan 08]

actuals:
  tokens: 6000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "each Stryker close run alone on a quiet host, stdin closed, its report recorded before the next run overwrote it"

key-files:
  created:
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-mutation-close.json
    - .changeset/react-registry-lifetime-has-an-owner.md
  modified: []

key-decisions:
  - "The two Stryker runs were sequential and alone; neither timed out, so no result was discarded or re-run (D-15, WX-05)"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "86-mutation-close.json holds lease (28 killed of 28) and owner (19 killed of 19) on head 07c5afb4, both with --disableBail; compare passes; the base record keeps its one commit"
    requirement: WX-05
    verification:
      - kind: other
        ref: "node 86-mutation.mjs compare; Task 1 verify"
        status: pass
    human_judgment: false
  - id: D2
    description: "One @qadi/react patch changeset ending No export changes.; no version or CHANGELOG changed"
    requirement: WX-03
    verification:
      - kind: other
        ref: "Task 2 verify; pnpm exec changeset status lists the file under @qadi/react"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every phase check passes on the finished tree and its line is under Close checks"
    requirement: WX-06
    verification:
      - kind: other
        ref: "## Close checks below; Task 3 verify"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-11-25
status: complete
---

# Phase 86 Plan 07: The mutation close, the react changeset and the close checks Summary

**The lease holds 28 of 28 killed and the owner 19 of 19 killed on one head with `--disableBail`, `compare` against the base passes, the `@qadi/react` patch changeset is committed, and every phase check passes on the finished tree.**

## Performance

- **Duration:** about 12 min
- **Tasks:** 3 (tracer, auto, auto)
- **Files created:** 2 (and this summary)
- **Commits:** 2

## Accomplishments

- `RegistryLease.ts` (alone, then recorded): 28 mutants, 28 Killed, 0 Survived, 0 NoCoverage, 0 Ignored, 0 Timeout;
  against the base 28/28 -> 28/28 with 0 new open or Ignored mutants.
- `RegistryOwner.ts` (alone, then recorded): 19 mutants, 19 Killed, none Survived, uncovered, Ignored or Timeout, every
  killer in `RegistryOwner.test.ts`.
- `86-mutation-close.json` lists `QadiProvider.tsx` as unmeasured with its reason. The base record has exactly its one
  commit.
- The changeset is a `@qadi/react` patch whose last line is `No export changes.`.

## Task Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | `2255ce8a` | `docs(86-07): record the mutation close of the lease and the owner` |
| 2 | `f1f19c51` | `chore(86-07): add the react changeset` |
| 3 | (none) | the checks changed nothing; their lines are in this file |

## Close checks

Each command from the repository root with stdin closed; the last line it printed (whole output when it failed; none did).

```
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs base
41c53c65c3ceb60f974650dd374f391c81db56e7
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs scan-ids
scan-ids: no id or phase wording in added lines
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs scan-forbidden
scan-forbidden: no forbidden form in added lines
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs trailers
trailers: 20 plan commits, each with the one trailer
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs owner-shape
owner-shape: the registry's lifetime is kept by one React-free module
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs provider-forwards-only
provider-forwards-only: the provider builds the owner once and only forwards to it
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs records --close
records: the pinned-by lists name tests that exist, and every reserved record is written
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs seen-failing packages/react/test/RegistryOwner.test.ts
seen-failing: packages/react/test/RegistryOwner.test.ts
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs seen-failing packages/react/test/QadiProvider.owner.characterisation.test.tsx
seen-failing: packages/react/test/QadiProvider.owner.characterisation.test.tsx
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-pinned-check.mjs
pinned: 59 files hold their base text, 1 of 1 born files held
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-pinned-check.mjs --all-applied
pinned: 59 files hold their base text, 1 of 1 born files held
$ node .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-earlier-checks.mjs
85-earlier-checks.mjs --self-test: exit 0: self-test: 17 passed
$ pnpm exec vitest run --project react
      Tests  703 passed (703)
$ pnpm test:tstyche
Duration:   10.1s   (Tests: 429 passed, 2 skipped, 431 total; Assertions: 931 passed, 6 skipped, 937 total)
$ pnpm circular
✔ No circular dependency found!
$ pnpm lint
house-style: 625 file(s) clean (3 declared switch(es), 79 type-test file(s))
$ pnpm exec tsc -p tsconfig.test.json
(no output, exit 0)
```

`git diff --diff-filter=D --name-only 41c53c65c3ceb60f974650dd374f391c81db56e7 -- packages/react/test | wc -l` prints 0:
no react test was deleted since `phase_base`. `.vitest` was removed after the vitest run.

## Deviations from Plan

None. The plan executed as written.

Two things worth stating, neither a deviation:

- `pnpm exec changeset status` lists the new file under `@qadi/react`, but the bump it prints for the package is
  `minor` (to 0.13.0): other pending changesets in the same `fixed` group carry a minor, and this file is a patch among
  them. Nothing was consumed or versioned here.
- The `trailers` line counts the 20 plan commits that existed when it ran; the two commits of this plan were among them.

## Issues Encountered

None. Neither Stryker run timed out, so no result was discarded and no `--restart` was used.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-mutation-close.json`
- FOUND: `.changeset/react-registry-lifetime-has-an-owner.md`
- FOUND commits: `2255ce8a`, `f1f19c51`
