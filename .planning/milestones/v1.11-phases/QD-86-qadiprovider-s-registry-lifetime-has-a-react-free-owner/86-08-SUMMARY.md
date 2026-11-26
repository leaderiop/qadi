---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
plan: 08
subsystem: release-gate
tags: [merge-gate, check-pr, spec-package, release-check, trailers, requirements]

phase_base: 41c53c65c3ceb60f974650dd374f391c81db56e7
plan_head_before: d5d9a7a169828fe83d96c400c493d0498f85db38
plan_head_after: d5d9a7a169828fe83d96c400c493d0498f85db38
commits: 0

requires:
  - phase: QD-86 plan 07
    provides: the mutation close, the react changeset and the close checks
provides:
  - the phase's merge gate (check:pr, then spec:package alone) green on the finished head, as measured lines
  - the release check: nothing tagged, versioned, pushed or consumed
affects: [QD-86 phase completion]

actuals:
  tokens: 4000
  tasks: 2
  commits: 0

tech-stack:
  added: []
  patterns:
    - "each runner alone, stdin closed, status written to a file only after the process ended"

key-files:
  created:
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-08-SUMMARY.md
  modified: []

key-decisions:
  - "No fix was needed, so the plan adds no commit of its own but this summary (docs-only; commits: 0 is the measured count of code commits)"

patterns-established: []

requirements-completed: []

coverage:
  - id: G1
    description: "pnpm check:pr exits 0 on the finished head, alone; strict traceability FAIL 0, api-surface 942 across 9, house-style ends 79 type-test files, coverage holds"
    requirement: WX-01
    verification:
      - kind: other
        ref: "Task 1 verify; ## Gate facts"
        status: pass
    human_judgment: false
  - id: G2
    description: "pnpm spec:package exits 0 alone with its package-install line (9 packages, 527 runtime exports, the base count)"
    requirement: WX-03
    verification:
      - kind: other
        ref: "Task 1 verify; ## Gate facts"
        status: pass
    human_judgment: false
  - id: G3
    description: "Nothing released; every plan commit carries the one trailer; no id leaked; no WX row ticked; no react test deleted"
    requirement: WX-07
    verification:
      - kind: other
        ref: "Task 2 verify; ## Release check"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-11-25
status: complete
---

# Phase 86 Plan 08: The phase gate Summary

**`pnpm check:pr` and then `pnpm spec:package`, each run alone on the finished head, both exit 0 with every gate line at its base count; nothing was tagged, versioned, pushed or consumed, every plan commit carries the one trailer, no WX requirement is ticked, and the render suite lost no test.**

## Performance

- **Duration:** about 8 min (`check:pr` took about 3.5 min, not the 10 to 20 the plan allowed for)
- **Tasks:** 2 (tracer, auto)
- **Files created:** this summary only
- **Commits:** 0 code commits; this summary is committed by the execute workflow

## Task Commits

None. The gate needed no fix, so the tree under test, `d5d9a7a1`, is the tree the phase ends on.

## Gate facts

Head under test: `d5d9a7a169828fe83d96c400c493d0498f85db38` (it includes the two orchestrator commits `fd1d035f` and
`d5d9a7a1`). Branch `arch-wave-16`. `git status --porcelain -- packages spec scripts stryker.react.mjs .changeset` printed
nothing before and after both runs. Output kept in `<S>/check-pr.out` and `<S>/spec-package.out`, statuses in
`<S>/check-pr.exit` and `<S>/spec-package.exit`, with `<S>` = `/private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd86`.

`check:pr: exit 0` (`node scripts/run-check.mjs --skip-mutation`, 683 lines, "ran 17 of 18 steps; pnpm mutation was
skipped"). Each step's last line as printed, against the plan-1 base line:

| Step | Last line as printed | Base | Difference |
| ---- | -------------------- | ---- | ---------- |
| 1 typecheck | (no output, `tsc -b` then `tsc -p tsconfig.test.json`, exit 0) | n/a | none |
| 2 lint (house-style) | `house-style: 625 file(s) clean (3 declared switch(es), 79 type-test file(s))` | `622 file(s) clean (3 declared switch(es), 79 type-test file(s))` | 3 more files scanned: `RegistryOwner.ts`, `RegistryOwner.test.ts` and `support/recordingDefer.ts`, all added by the phase. Switches and type-test files unchanged. |
| 3 circular | madge, no cycle | n/a | none |
| 4 test:tstyche | `Tests: 430 passed, 1 skipped, 431 total`, then `429 passed, 2 skipped, 431 total` (the rule-on pass) | n/a | none; the skips are `FloatingEffectPins.tst.ts`'s by-design pair |
| 5 coverage | `Test Files 285 passed (285)`, `Tests 6699 passed (6699)`; `Statements 99.67%`, `Branches 98.72%`, `Functions 99.61%`, `Lines 99.84%`; `react/src` row `99.54 / 99.04 / 98.68 / 99.5` | n/a | thresholds held (core at least 95%, the rest at least 90%); no threshold error |
| 6 test:bdd | `Test Files 34 passed (34)`, `Tests 568 passed (568)` | n/a | none |
| 7 spec:examples | `doc-examples: 122 block(s) compile` | `122` | none |
| 8 spec:verify:strict | `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | the same 21 checks | decisions 155 to 156 (ADR-QD-199), 190 invariants traced; nothing failed |
| 9 spec:gates | `dod-table: 26 step(s) match pnpm check, 181 reference(s) resolve` | `26 step(s), 179 reference(s)` | 2 more references, from the spec records the phase added; all resolve |
| 10 spec:claims | `devtools-claims: 8 claim(s) registered across 6 file(s)` | `8 claim(s) across 6 file(s)` | none |
| 11 spec:api | `api-surface: 942 export(s) documented across 9 package(s)` | `942 across 9` | none (the owner stays out of the barrel) |
| 12 spec:package | `package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))` | `9 package(s) … (527 runtime export(s))` | none |
| 13 example | example vitest `7 files, 43 tests passed`, `next build` ok, playwright `30 passed (7.3s)` | n/a | none |
| 14 spec:website-examples | `website-doc-examples: 77 block(s) compile` | `77` | none |
| 15 website | `astro check` and `astro build` ok | n/a | none |
| 16 spec:publish | `publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)` | n/a | version 0.12.0, unchanged since the base |
| 17 bench:self-test | `self-test: 25 passed` | n/a | none |

`spec:package: exit 0` (`node scripts/check-package-install.mjs`, run alone after `check:pr` had ended; step 12 above ran
it inside the gate and this is its standalone run). Its last two lines as printed:

```
> node scripts/check-package-install.mjs

package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))
```

Identical to the base line: no runtime export moved, as the plan expected.

Host note: one idle `next` jest-worker process (`processChild.js`, 0.0% CPU, started 18:02 by the example's `next build`
inside `check:pr`) was still alive when `spec:package` started. It is not a runner (no vitest, Stryker, playwright or tstyche
was active) and the standalone run was green.

## Release check

| Check | As measured |
| ----- | ----------- |
| Tags containing `phase_base` | none (`git tag --contains 41c53c65…` printed nothing) |
| CHANGELOG changed since `phase_base` | none (`git diff --name-only 41c53c65… -- CHANGELOG.md '**/CHANGELOG.md'` printed nothing) |
| `"version"` field changed since `phase_base` | none (the added/removed-line grep over `package.json` and `**/package.json` found no match); `spec:publish` still reads 0.12.0 |
| Changeset unconsumed | `.changeset/react-registry-lifetime-has-an-owner.md` exists: one `"@qadi/react": patch`, ending `No export changes.` (as corrected by `fd1d035f`) |
| Remote branch holding a phase commit | none (`git branch -r --contains 7b50a19d`, the first commit after `phase_base`, printed nothing); 26 commits since the base, all local |
| `86-check.mjs trailers` | `trailers: 21 plan commits, each with the one trailer` |
| `86-check.mjs scan-ids` | `scan-ids: no id or phase wording in added lines` |
| WX-01 to WX-07 in `.planning/REQUIREMENTS.md` | all seven `- [ ]` and all seven traceability rows `Pending`; the file is unmodified in the working tree |
| Render-suite deletions | `git diff --diff-filter=D --name-only 41c53c65… -- packages/react/test` printed nothing |

render-suite deletions: 0

No push, merge, tag, release, publish, `changeset version` or version-packages PR was run, and no remote was contacted.

## Deviations from Plan

None - plan executed exactly as written. Two things worth stating, neither a deviation:

- 86-07's Task 2 verify asserts the last commit touching the changeset is `chore(86-07): add the react changeset`; since
  `fd1d035f` that prints `the changeset is not committed` (recorded in 86-07's post-plan correction). This plan's verifies do
  not read that assertion; the changeset's existence and unconsumed state are checked above.
- `check:pr` ran spec:package as its step 12, as `package.json` defines it. The standalone run the plan asks for was
  still made, alone, afterwards.

## Known Stubs

None. This plan changes no source.

## Threat Flags

None. No file outside this summary was created or modified.

## Issues Encountered

None. No render test flaked and no gate was re-run.

## Self-Check: PASSED

- FOUND: `<S>/check-pr.exit` reads `0`; `<S>/spec-package.exit` reads `0`
- FOUND: `api-surface: 942 export(s) documented across 9 package(s)`; `FAIL: 0`; house-style ends `79 type-test file(s))`
- FOUND: no tag, CHANGELOG, version change, consumed changeset or remote branch; trailers and scan-ids pass
- FOUND: WX-01 to WX-07 unchecked and Pending; render-suite deletions: 0
- Commits: none of this plan's own before this summary; head under test `d5d9a7a1`
