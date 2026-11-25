---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 10
subsystem: phase-gate
tags: [merge-gate, check-pr, spec-package, requirements, release-check]
requires: [82-09]
provides:
  - the merge gate minus mutation (`pnpm check:pr`) and the packed-install gate (`pnpm spec:package`) green at the close, each run alone
  - LEASE-01 to LEASE-05 complete in REQUIREMENTS.md, marked by hand
  - the release check over the whole phase (no tag, no CHANGELOG, no version, changeset unconsumed, every trailer)
affects: [phase-review]
key-files:
  created:
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-10-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "Decided autonomously: the gate passed on its first run at the head of 82-09, so no fix commit exists and no mutation close is re-taken here; the re-run owed after review fixes is written down below"
  - "Decided autonomously: WX-01 to WX-07 are standing v1.10 requirements already marked Complete, so only LEASE-01 to LEASE-05 changed; `requirements.mark-complete` was not run"
requirements-completed: [WX-01, WX-03, WX-07, LEASE-01, LEASE-02, LEASE-03, LEASE-04, LEASE-05]
duration: 4min
completed: 2026-11-25
status: complete
commits: 1
plan_head_before: 6d1fda561477dd41c3346415df13fb36d0872ff4
plan_head_after: 7b3d5deb047e075192ae7d719f81bf88959831b8
actuals:
  tokens: 6000
  tasks: 2
  commits: 1
---

# Phase QD-82 Plan 10: The phase gate, requirements complete, release check Summary

**`pnpm check:pr` and `pnpm spec:package` exit 0 at the head of the close, each run alone with stdin closed; LEASE-01 to LEASE-05 are marked complete by hand on that evidence; nothing was tagged, versioned, pushed or published and the changeset is unconsumed.**

phase_base: 16f09f776fbb9c8c8c2b9b9452e7cf6994a727e3

## Gate facts

Head at the run: `6d1fda56` (82-09's last commit), the tree clean under `packages spec scripts features apps examples .changeset`,
`82-mutation.mjs compare` exit 0, no vitest, bench or Stryker process running. Outputs kept in
`$TMPDIR/qd82/check-pr.out` and `$TMPDIR/qd82/spec-package.out`.

check:pr: exit 0
spec:package: exit 0

`pnpm check:pr` ran 17 of 18 steps (`pnpm mutation` skipped, the phase's own scorer measured it in 82-09). The last line of each
step that names a count:

```
typecheck           tsc -b tsconfig.json && tsc -p tsconfig.test.json: exit 0
lint                house-style: 610 file(s) clean (3 declared switch(es), 77 type-test file(s))
circular            madge --circular: exit 0
test:tstyche        Tests: 416 passed, 1 skipped, 417 total (rule off); 415 passed, 2 skipped, 417 total (rule on); Test files: 77 passed
coverage            Test Files 274 passed (274); Tests 6610 passed (6610)
test:bdd            Test Files 34 passed (34); Tests 568 passed (568)
spec:examples       doc-examples: 119 block(s) compile
spec:verify:strict  PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
spec:gates          dod-table: 26 step(s) match pnpm check, 171 reference(s) resolve
spec:claims         devtools-claims: 8 claim(s) registered across 6 file(s)
spec:api            api-surface: 942 export(s) documented across 9 package(s)
spec:package        package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))
example             Test Files 7 passed (7); Tests 43 passed (43); e2e 30 passed
spec:website-examples  website-doc-examples: 76 block(s) compile
website             astro build of apps/website: exit 0
spec:publish        publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)
bench:self-test     self-test: 25 passed
run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).
```

`pnpm spec:package`, run alone after it, last line:

```
package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))
```

No export changed in this phase (`api-surface` documents the same 942 exports), so no Breaking changeset; the `@qadi/react`
patch changeset stands.

## Re-run after review fixes

The phase's code review runs after this plan and may change files under `packages/*/src`, `spec/`, `scripts/` or `features/`.
For each fix, in order, each command run alone, from the repository root, with stdin closed (D-16, D-18):

1. For any group whose measured files a fix touches (react: `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`,
   `SweepScheduler.ts`; lease: `RegistryLease.ts`): run that group's Stryker config alone, then
   `node .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-mutation.mjs record close <group> --restart`,
   then `... 82-mutation.mjs compare`, which must exit 0 (the base floor, the lease's absolute bar, no new open or Ignored mutant;
   never a re-baseline, never a `Stryker disable`).
2. `pnpm check:pr < /dev/null`, alone, from the start, exit 0.
3. `pnpm spec:package < /dev/null`, alone after it, exit 0.
4. `node ... 82-check.mjs trailers`, `scan-ids`, `scan-forbidden`, `single-owner`.

A fix that touches nothing measured or gated (a doc under `.planning/`) needs only step 4.

## Release check

```
82-check.mjs base:      16f09f776fbb9c8c8c2b9b9452e7cf6994a727e3
git tag --contains base: empty (no tag after the phase base)
CHANGELOG.md diff base:  empty (no CHANGELOG changed)
package.json "version" diff base: no line changed in any package.json
.changeset/react-registry-recycled-in-place.md: present (no `changeset version` consumed it)
82-check.mjs trailers:  trailers: 36 plan commits, each with one Claude trailer
82-check.mjs scan-ids:  scan-ids: no id or phase wording in added lines
```

Nothing was pushed, merged, tagged, published or versioned by this plan. The trailer count is taken before this plan's own
commit; the commit is made through `82-check.mjs commit`, which checks its own trailer.

## Requirements

LEASE-01 to LEASE-05 are `- [x]` and their five table rows read `Complete`, edited by hand after both gates passed
(T-82-28). WX-01 to WX-07 were already `Complete` as standing v1.10 requirements; this plan's gate is the WX-01 and WX-03
evidence for this phase.

## Edge coverage

The three WX-01 backstops (adjacency, empty, ordering) are held by `scripts/run-check.mjs`: `check:pr` removes exactly one
`pnpm mutation` step and refuses otherwise, and it ran the 17 remaining steps in `pnpm check`'s order with nothing beside it.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 | none: the gate made no change; its output is the gate facts above | `82-10-SUMMARY.md` |
| 2 | 7b3d5deb: `docs(82-10): LEASE-01 to LEASE-05 complete` | `.planning/REQUIREMENTS.md`, `82-10-SUMMARY.md` |

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Known Stubs

None. No file under `packages/` changed in this plan.

## Threat Flags

None. Only `.planning/REQUIREMENTS.md` and this file changed. T-82-27 is mitigated (no tag, CHANGELOG or version change, the
changeset unconsumed, no push, merge, publish or `changeset version`); T-82-28 is mitigated (completion marked after both gates
passed, by hand, with the gate facts above); T-82-SC is mitigated (no package installed).

## Issues Encountered

None. The gate passed on its first run; no fix commit was needed.

## Next Phase Readiness

The phase's code review follows. It re-takes the gate and any owed mutation close after its fixes, per `## Re-run after review
fixes`.

## Self-Check: PASSED

- FOUND: `.planning/REQUIREMENTS.md` with LEASE-01 to LEASE-05 checked and Complete
- FOUND: commit 7b3d5deb, an ancestor of HEAD
- The two task verifies pass; `82-check.mjs commit`, `trailers` and `scan-ids` exit 0
