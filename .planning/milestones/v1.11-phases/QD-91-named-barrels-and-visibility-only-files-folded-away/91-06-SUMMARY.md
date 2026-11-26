---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 06
subsystem: testing
tags: [pinned-check, import-regions, syntax-tree, earlier-phase-held, red-evidence]

requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: 91-check.mjs (commit, scratch, variant, scan-ids, trailers modes), the recorded phase_base, the three surface.test.ts (born, held whole)
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: 90-pinned-check.mjs, the held, declared and born shape this script ports
provides:
  - 91-pinned-check.mjs, with HELD_SOURCE, DECLARED, BORN, OPTIONAL_BORN, EARLIER_HELD, --all-applied and a 91-case --self-test
  - 91-RED-EVIDENCE.md with eight more blocks, one per reason kind of the pinned check, each seen failing on a scratch clone
affects: [91-10 through 91-14 (each fold commit is judged against its declared import regions), 91-19, 91-20 (EARLIER_HELD), 91-21 close (--all-applied)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 7552073770b60ca3c076a6ef698f1dba71bedb13
plan_head_after: 0d1a0b4689d27c2e6c81fc9226e4c63a93804288
commits: 2

actuals:
  tokens: 17000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a declared import region is a run of consecutive top-level import declarations that name a deleted module or a module its names move to; what replaces it must parse as imports only, with every text of a file parsed in one child-process call"
    - "an earlier phase's held file is a row keyed on the exact subjects that may change it, judged from the commit list of that file since the base"

key-files:
  created:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-pinned-check.mjs
  modified:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md

key-decisions:
  - "HydrationTarget.tst.ts's import region is derived from the born text's own import span (the file does not exist yet, so no line constant can be written); the amendment commit may move only that span, and the file at HEAD is the last text of the chain byte for byte"
  - "A born file that is present with no adding commit since the base is a reason, for the required and the optional kinds alike"
  - "The 91-21 optional kind is judged per commit: every path of the commit with that subject is either the evidence file or a test file under core, react or audit that the commit adds"

requirements-completed: []

duration: 90min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 06: The pinned-test check Summary

**`91-pinned-check.mjs` holds 516 existing test and source files byte for byte, declares 26 files by exact import regions that must parse as imports only, holds the three surface tests whole, and keys 27 earlier-phase files on the exact subjects that may change them; each of its reasons has been seen failing.**

## What was built

`91-pinned-check.mjs` (plain Node ESM, finds its own directory from `import.meta.url`, refuses to run outside the repository root or outside a `QD-91-` directory, takes `phase_base` from `91-mutation-base.json`). Modes: no argument, `--all-applied`, `--self-test`.

The real run on the current tree prints:

`pinned: 516 held, 26 declared (0 applied), 3 born, 27 earlier-held, clean`

**Held (516).** Every path `git ls-tree -r` lists at `phase_base` under `packages/core/test`, `packages/react/test`, `packages/audit/test`, `packages/devtools/test`, `packages/http/test`, `packages/testing/test`, `packages/core/bench` and `features`, less the 25 declared test files, computed at run time and never listed. A held file moved or deleted is reported with both paths (`git diff -M --name-status`). `HELD_SOURCE` holds `packages/devtools/src/index.ts`, `packages/devtools/src/react/index.ts`, `packages/core/src/PortServing.ts`, `packages/react/src/RegistryOwner.ts` and `packages/core/src/EvaluationSpan.ts`.

**Declared (26).** Each entry is `{ file, subject, regions }`; each region is the exact base range with the full text of its first and last base line (a wrong constant fails, anchors are checked on every run). The 25 test files, with their base regions:

| Group (subject) | File | Regions |
| --------------- | ---- | ------- |
| gate (`refactor(91-11): fold the gate registry constructor into the gate writer`) | `packages/react/test/DecisionOutcome.tst.ts` | 14-14 |
| | `DeveloperSignalReporters.test.tsx` | 56-57 |
| | `GateRegistration.characterisation.test.tsx` | 32-33 |
| | `GateRegistry.store.test.ts` | 11-11, 13-14 |
| | `GateRegistry.test.tsx` | 28-28 |
| | `GateWriter.reconcile.test.ts` | 13-21 |
| | `GateWriter.test.tsx` | 10-12, 14-14 |
| | `QadiProvider.tst.ts` | 11-11 |
| | `support/gates.ts` | 10-10 |
| | `support/trees.tsx` | 20-20 |
| | `packages/react/src/QadiProvider.tsx` (source) | 49-49 |
| audit (`refactor(91-12): fold the sequence check's public home into the archive facts`) | `packages/audit/test/AdmissionOrder.characterisation.test.ts` | 24-25 |
| | `AuditArchive.test.ts` | 8-8 |
| | `BatchReadOnce.test.ts` | 20-20 |
| | `ForeignRows.test.ts` | 27-27 |
| | `RowListAdmission.test.ts` | 12-12, 19-19 |
| | `SequenceIntegrity.test.ts` | 6-6 |
| hydration (`refactor(91-13): fold the hydration entry points into the hydration engine`) | `packages/react/test/DecisionOutcome.test.ts` | 42-42, 44-45 |
| | `Hydration.lifetime.test.ts` | 18-18 |
| | `Hydration.test.ts` | 34-35 |
| | `Hydration.tst.ts` | 26-40 |
| | `HydrationCounts.test.ts` | 33-34 |
| | `HydrationPayload.test.ts` | 33-35, 37-37 |
| | `QadiAtoms.test.ts` | 30-30, 32-32 |
| | `UntrustedSeams.test.ts` | 9-10 |
| decoder (`refactor(91-10): fold the port span decoder into the span machinery`) | `packages/core/test/PortSpan.test.ts` | 19-27 |

A region is every run of consecutive top-level import declarations whose specifier names a deleted module or a module its names move to (gate: `GateRegistry.ts`, `GateWriter.ts`; audit: `SequenceIntegrity.ts`, `ArchiveFacts.ts`; hydration: `Hydration.ts`, `HydrationEngine.ts`, `SeededDecision.ts`, `DeveloperSignals.ts`, `HydrationEvent.ts`; decoder: `PortSpanDecode.ts`, `PortSpanEncode.ts`), read from the base text by a one-off scratch script; the provider is line 49 only as the plan fixes it. The declaring commit (found by exact subject, at most one) must hold the base text on every line outside the regions; what replaces each region must be top-level import declarations only, read from the syntax tree (a statement, a comment, a blank line, a re-export or an `import x = require()` is a reason, and a replacement may be longer, shorter or empty); the file at HEAD equals that commit's text. Before the commit exists the file is held as a base file.

**Born (3 now).** The three `surface.test.ts`, whole, from `test(91-04): pin each root's runtime values on the base`. `packages/react/test/HydrationTarget.tst.ts` from `feat(91-13): hydrateDecisions takes any value with the hydrate capability` with one amendment by `refactor(91-13): fold the hydration entry points into the hydration engine`, which may move only the born text's import span; it is counted once it exists. Three optional kinds are held whole when present: `packages/react/test/GateRegistryFold.test.ts` under `test(91-11): hold the gate registry's collision report under its option`, `packages/react/test/HydrationFold.test.ts` under `test(91-14): hold the folded hydration entry points` (each added by one commit holding only it), and every test file the commit with `test(91-21): kill the new open mutants of the folded files` adds (a commit holding only added test files under core, react or audit, and the evidence file).

**Earlier-held (27 rows).** Read from each earlier phase's script, one row per file it holds that this phase edits: phase 86, the 18 react test files (the ten gate files under the gate subject, the eight hydration files under the hydration subject) and `packages/react/src/RegistryLease.ts` under `docs(91-19): name the registry lease's one caller`; phase 89, `packages/audit/src/SequenceIntegrity.ts` (deleted) and the five audit tests it holds or declares (`AdmissionOrder.characterisation`, `AuditArchive`, `BatchReadOnce`, `ForeignRows`, `SequenceIntegrity`) under the audit subject, and `packages/audit/src/index.ts` under `refactor(91-09): name the audit barrel's exports per module` or the audit subject; phase 90, `packages/core/test/PortSpan.test.ts` under the decoder subject. `RowListAdmission.test.ts` is not held by phase 89 (it does not exist at that phase's base and is not in its born list), and phases 85, 87 and 88 hold only devtools files, none of them edited here. Every commit since `phase_base` touching a row's file must carry one of its subjects.

`--all-applied` also requires every declared commit and the amending commit to exist and the required born files (the three surface tests and `HydrationTarget.tst.ts`) to be added. `README.md` and `91-03`'s other files are outside every held, declared and born set, so `8d9967bb` needed no declaration.

## Self-test

`node 91-pinned-check.mjs --self-test` ends `self-test: 91 passed`: held (body line, whitespace, line ending, appended line, moved, deleted), regions (anchors, shapes, outside the regions in three places, growth, shrinkage, an emptied region), the replacement judged on the syntax tree (an extra statement, a statement on the import's line, a blank line, a comment, a re-export, an import-equals, a multi-line import), the declared lifecycle (before the commit, with `--all-applied`, a commit that does not change the file, a file changed after the commit), the born chain (a moved import span passes, a changed body line, a statement among the imports, a line before the imports, an appended line, a commit that does not change the file), the adders, the optional kinds and the 91-21 kind, the earlier-held rows, and the constants judge. It runs on planted texts and a planted commit list; the planted texts are parsed together in one child process.

## Evidence: every reason seen failing (91-RED-EVIDENCE.md)

Each block was written by `91-check.mjs variant ... script 91-pinned-check.mjs` on its own scratch clone, exit 1:

| Label | Edit in the scratch clone | Recorded reason |
| ----- | ------------------------- | --------------- |
| `pinned-held-body` | line 79 of `PortSpan.test.ts` (an expected value) changed | `differs from its base text at line 79` |
| `pinned-held-moved` | `packages/http/test/accessPlan.test.ts` renamed | `moved to packages/http/test/accessPlanMoved.test.ts` |
| `pinned-declared-outside` | a decoder-subject commit re-points line 19 and changes line 79 | `differs outside its declared lines at line 79` |
| `pinned-declared-non-import` | a decoder-subject commit replaces line 19 by an import and a `const` | `line 2 of what replaces region 1 is not an import declaration` |
| `pinned-held-source` | `QadiProvider.tsx` line 50 edited | `differs from its base text at line 50` |
| `pinned-earlier-held` | a `chore(91-99): touch` commit edits a comment line of `RegistryLease.ts` | `changed by cd9185ff59 "chore(91-99): touch", and phase 86's pinned check holds it (only "docs(91-19): name the registry lease's one caller" may)` |
| `pinned-born` | line 1 of `packages/audit/test/surface.test.ts` edited | `differs from the commit that added it at line 1` |
| `pinned-all-applied` | none, `--all-applied` | `HydrationTarget.tst.ts: no commit adds it` and each declared file `its declared edit is not applied` |

The passing paths that the real tree cannot reach yet (a declared commit applied, the `HydrationTarget.tst.ts` chain, the two optional files, the 91-21 kind) were exercised once on a scratch clone with planted commits and not recorded: it printed `26 declared (9 applied), 6 born, 27 earlier-held, clean`, and an edit to the added mutation test after its commit was refused. That rehearsal found one bug before the commit: the evidence file's path constant lacked its `.planning/phases/` prefix, so the 91-21 commit's evidence edit was refused.

## Task Commits

1. Task 1: `46432b6d` `chore(91-06): add the pinned-test check` (exactly `91-pinned-check.mjs`)
2. Task 2: `0d1a0b46` `docs(91-06): record the pinned-test check seen failing` (exactly `91-RED-EVIDENCE.md`)

Each carries the one trailer; `91-check.mjs commit` passes for both.

## Verification

- `node 91-pinned-check.mjs --self-test` passes (91); `node 91-pinned-check.mjs` exits 0 with the line above; `pnpm exec oxlint` over the script exits 0.
- `91-check.mjs scan-ids` and `scan-forbidden` clean; `91-check.mjs trailers` reports 19 commits since the base, each with the one trailer.
- The scratch root was removed with `scratch-clean` and checked gone; no `.vitest/` or `.stryker-tmp/` left behind.

## Deviations from Plan

### Plan defects resolved by the smallest honest reading

**1. [Plan defect] `HydrationTarget.tst.ts`'s `imports` region cannot be a constant.**
- **Found during:** Task 1, writing `BORN`.
- **Issue:** the plan fixes the region as "the born text's top-level import span" as a constant, but the file is written by plan 13, after this script is committed.
- **Before:** `imports: { first, last }` as a line constant, as `90-pinned-check.mjs` does for its born files.
- **After:** the region is read from the born text's own import declarations (`judgeBornChain`), checked to hold imports only, and the amendment may move only that span; the text before the span, the text after it line by line, and the file at HEAD against the last text of the chain are compared byte for byte. The check is no weaker: nothing outside the import declarations of the born text can change.

**2. [Plan wording] The plan's region lines name only the line that imports the deleted module.**
- **Issue:** the plan's interface list gives the import lines of the deleted module (`GateRegistry.store.test.ts:11,13`, `PortSpan.test.ts:19`) while its action text says a region covers every import declaration that names the deleted module or the module its names move to.
- **Resolution:** the action text is followed: each region is the run of consecutive imports that name either module, so `PortSpan.test.ts` is 19-27 (the `PortSpanEncode.ts` import follows the decoder import), `GateWriter.reconcile.test.ts` 13-21, `Hydration.tst.ts` 26-40. The provider is line 49 only, because the plan fixes it so ("`source: true`, region line 49 only") and plan 11 re-points that one line.

### Choices the plan left open (autonomous, most complete option)

- No insertion regions: the plan's folds only replace import lines, so the region type of `90-pinned-check.mjs` that inserted fixed lines is not carried over.
- A born or optional file present with no adding commit since the base is a reason, so a file written and not committed cannot stay unjudged.
- `EARLIER_HELD` carries 27 rows. Phase 86's held set is every react test at its base, and all 18 files the folds edit are in it; the audit rows follow what `89-pinned-check.mjs` holds or declares, five tests and two sources.

## Risk for later plans

`packages/audit/src/index.ts` is an `EARLIER_HELD` row with two subjects. If the plan-19 sweep or any other commit touches it under a different subject, the check fails by design and the ledger row must be added by a reviewed edit (plan 20).

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None: a planning script and an evidence file; no source, network or schema change.

## Self-Check: PASSED

- `91-pinned-check.mjs` exists; the real run exits 0 with `pinned: 516 held, 26 declared (0 applied), 3 born, 27 earlier-held, clean`.
- `46432b6d` and `0d1a0b46` are ancestors of HEAD, each with the one trailer.
- `91-RED-EVIDENCE.md` holds the eight `pinned-` blocks, each with exit 1.
