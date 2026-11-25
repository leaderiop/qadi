---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 11
subsystem: devtools
tags: [merge-gate, check-pr, spec-package, release-check]
requires:
  - phase: QD-85
    provides: "85-10: the mutation close, the changeset and every phase check green on the finished tree"
provides:
  - "pnpm check:pr and pnpm spec:package green at the phase close, each run alone, outputs kept"
  - "the release check: nothing tagged, versioned, changelogged or pushed since the phase base"
affects: []
tech-stack:
  added: []
  patterns:
    - "The phase gate is check:pr (check minus its one mutation step) plus a standalone spec:package; mutation was measured by the phase's own scorer in 85-10"
key-files:
  created:
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-11-SUMMARY.md
  modified: []
key-decisions:
  - "Decided autonomously: HYDV-01 to HYDV-05 are NOT marked complete in REQUIREMENTS.md by this plan. The plan's Task 2 says to tick them by hand, but the run rules for this autonomous run say the orchestrator marks requirements at phase verification and that none is to be marked here, and that instruction is the more specific and later one. The rows still read Pending and the boxes unticked; the orchestrator marks HYDV-01 to HYDV-05 and the commit is typed for what it holds, not the plan's title"
  - "Decided autonomously: the plan's `consumer: the published artifact authorizes correctly` check is satisfied by the exit code and the `package-install:` line, not by that text. scripts/check-package-install.mjs pipes the consumer's stdout (execFileSync, stdio pipe) and prints nothing from it on success, so the line can never appear in spec:package's output; the script is left untouched"
requirements-completed: []
status: complete
duration: 10min
completed: 2026-11-25
commits: 1
plan_head_before: 7ebeb0c239d09ce3066e9514427bfd5f021a6eef
plan_head_after: PENDING
actuals:
  tokens: 4000
  tasks: 2
  commits: 1
coverage:
  - id: G1
    description: "The merge gate minus mutation is green on the head, alone, with strict traceability, the api surface at its base count and 79 type-test files"
    requirement: WX-01
    verification:
      - kind: command
        ref: "pnpm check:pr < /dev/null"
        status: pass
    human_judgment: false
  - id: G2
    description: "The packed artifact installs and authorizes: nine packages pack, resolve and authorize"
    requirement: WX-03
    verification:
      - kind: command
        ref: "pnpm spec:package < /dev/null"
        status: pass
    human_judgment: false
  - id: G3
    description: "Nothing was released: no tag, CHANGELOG or version change since the phase base, the changeset unconsumed, no remote branch holds a phase commit"
    requirement: WX-07
    verification:
      - kind: command
        ref: "git tag --contains 2741584f50d176281038b478d0350dc35f174cc2; git branch -r --contains <first phase commit>; node 85-check.mjs trailers"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 11: The phase gate Summary

`pnpm check:pr` exited 0 on the finished head and `pnpm spec:package` exited 0 after it, each run alone with stdin
closed. Nothing was tagged, versioned, changelogged or pushed since the phase base. HYDV-01 to HYDV-05 are left for the
orchestrator to mark (see Deviations).

## Gate facts

Head at the run: `7ebeb0c2`, with no uncommitted change under `packages`, `spec` or `.changeset`. Outputs kept in
`$TMPDIR/qd85/check-pr.out` and `spec-package.out`, with `.exit` files reading `0`.

**check:pr: exit 0** (`run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).`)

| Step | Last line naming a count |
| ---- | ------------------------ |
| 2 lint | `house-style: 621 file(s) clean (3 declared switch(es), 79 type-test file(s))` |
| 3 circular | madge clean |
| 4 test:tstyche | `Test files: 79 passed, 79 total` (both passes; Tests 430 passed, 1 skipped, then 429 passed, 2 skipped) |
| 5 coverage | `Test Files  283 passed (283)`, `Tests  6674 passed (6674)`; `Statements   : 99.67% ( 7776/7801 )`, `Branches     : 98.72% ( 3252/3294 )`, `Functions    : 99.61% ( 3069/3081 )`, `Lines        : 99.84% ( 6877/6888 )` |
| 5 coverage, devtools | `devtools/src/model` 99.85 / 99.48 / 99.86 / 99.94 (statements, branches, functions, lines); `devtools/src/react` 99.26 / 96.52 / 98.44 / 99.51; both above the 90% floor |
| 6 test:bdd | `Test Files  34 passed (34)`, `Tests  568 passed (568)` |
| 7 spec:examples | `doc-examples: 122 block(s) compile` |
| 8 spec:verify:strict | `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` |
| 9 spec:gates | `dod-table: 26 step(s) match pnpm check, 179 reference(s) resolve` |
| 10 spec:claims | `devtools-claims: 8 claim(s) registered across 6 file(s)` |
| 11 spec:api | `api-surface: 942 export(s) documented across 9 package(s)` (the base's count) |
| 12 spec:package | `package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))` |
| 13 example | `30 passed (7.2s)` (Playwright), after `Tests  43 passed (43)` |
| 14 spec:website-examples | `website-doc-examples: 77 block(s) compile` |
| 15 website | `45 page(s) built in 1.27s`, `Complete!` |
| 16 spec:publish | `publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)` |
| 17 bench:self-test | `self-test: 25 passed` |

Lint printed warnings only, none in this phase's added lines (two `prefer-as-const` in `HeldChoice.test.ts`, which the
phase did not touch, and `startsWith` hints in an archived milestone script and `check-house-style.mjs`); the step exited 0.

**spec:package: exit 0**, run alone after `check:pr`. Its last two lines:

```
> node scripts/check-package-install.mjs

package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))
```

The plan also wanted the text `consumer: the published artifact authorizes correctly`. The script prints it from the
sandboxed consumer, whose stdout it pipes and drops on success, so it cannot appear (Deviations). The consumer's compile,
run, feed-call and probe guards all ran: the closing `package-install:` line is printed only when `failures` is empty,
after the consumer step.

The tstyche step reads 79 files because `HydrationView.tst.ts` joined the base's 78, and the api surface kept its base
count because the view, the store and the hook are package-private.

## Re-run after review fixes

When a review fix touches `DockModel.ts` or `HydrationView.ts`:

1. Run that group's close invocation alone, from the repository root with stdin closed:
   `node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-mutation.mjs record close <group> --restart`
   (`<group>` is `dock` for `DockModel.ts`, `hydration` for `HydrationView.ts`), and re-record any group the restart drops.
2. Run `node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-mutation.mjs compare`.
3. Then `pnpm check:pr < /dev/null` and `pnpm spec:package < /dev/null` again, each alone, nothing else running.

A fix that touches neither file needs only step 3.

## Release check

| Check | Result |
| ----- | ------ |
| `git tag --contains 2741584f50d176281038b478d0350dc35f174cc2` | prints nothing: no tag since the phase base |
| `git diff --name-only <base> -- CHANGELOG.md '**/CHANGELOG.md'` | prints nothing: no CHANGELOG changed |
| `git diff <base> -- package.json '**/package.json'` filtered to `"version"` lines | prints nothing: no package version changed |
| `.changeset/devtools-the-hydration-block-is-a-model-row.md` | exists: the changeset is unconsumed |
| `git branch -r --contains a6372095` (the first commit after the base) | prints nothing: no remote branch holds a phase commit; `arch-wave-16` has no upstream |
| `node 85-check.mjs scan-ids` | `scan-ids: no id or phase wording in added lines` |
| `node 85-check.mjs trailers` (before this plan's commit) | `trailers: 31 plan commits, each with the one trailer` |
| `node 85-check.mjs trailers` (after this plan's commit) | see Self-Check |

No `changeset version`, push, merge, tag, publish or release was run.

## Task Commits

1. **Task 1 (tracer): the merge gate on the head** - no file of its own; its output is the record above and it is committed
   with the summary. The tracer feedback gate: the gate ran end to end on the finished head and passed.
2. **Task 2: release check** - `docs(85-11): record the phase gate and the release check`

## Deviations from Plan

**1. [Run rule over plan] HYDV-01 to HYDV-05 not ticked in `REQUIREMENTS.md`**
- **Found during:** Task 2
- **Issue:** the plan has Task 2 tick the five boxes and rows by hand, and its verify greps for `- [x] **HYDV-0N**`; the
  run rules for this autonomous run say not to mark any requirement complete in `REQUIREMENTS.md` because the orchestrator
  marks them at phase verification.
- **Fix:** followed the run rules. The edit was made, then reverted before any commit (`git checkout --` on that one file);
  the file is untouched. Decided autonomously. Task 2's verify therefore reads red on its HYDV clause by design.
- **Owed to the orchestrator:** tick `- [ ] **HYDV-01**` to `HYDV-05` (lines 12-16) and the five `| HYDV-0N | Phase 85 |
  Pending |` rows (lines 104-108) to `Complete`; leave the WX rows `Pending`.
- **Files modified:** none.

**2. [Plan defect] `consumer:` line cannot appear in `spec:package`'s output**
- **Found during:** Task 1
- **Issue:** `scripts/check-package-install.mjs` runs the consumer with `stdio: "pipe"` and prints nothing from it on
  success, so the plan's verify grep for `consumer: the published artifact authorizes correctly` cannot pass.
- **Fix:** none to the script (a gate is never reshaped to pass a check); the exit code 0 and the `package-install:` line,
  printed only after the consumer compiled, ran and passed its probe guard, are the evidence. Decided autonomously.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path or file access; the threat register's T-85-20 and T-85-21 mitigations ran as
the Release check above.

## Self-Check: PENDING
