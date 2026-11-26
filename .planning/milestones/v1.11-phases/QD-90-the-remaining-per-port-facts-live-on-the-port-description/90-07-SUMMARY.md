---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 07
subsystem: testing
status: complete
tags: [pinned-tests, held-files, declared-regions, born-files, red-evidence]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: 660b818e72b52e110eed7ea5a7562381136870d1
plan_head_after: ecf335b53ebef5b91238ca73d0b1350901b27540

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: the born characterisation and type pins (plans 03, 04), the bench file and the gate of record (plan 06), 90-check.mjs variant and commit modes (plan 02)
provides:
  - 90-pinned-check.mjs, the judge of held, declared and born files with every region an exact line range
  - 11 scratch variants in 90-RED-EVIDENCE.md under `## pinned-<name>`, one per reason the plan names
affects: [QD-90 plans 08 to 16 - every later plan runs this check; a declared edit becomes applied when its commit lands]

requirements-completed: []

actuals:
  tokens: 13479
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a declared edit judged in two steps: the declaring commit (found by its exact subject) equals the base outside the region ranges, and HEAD equals that commit's text"
    - "an import region held by a constant range of the born text, located at HEAD from the syntax tree (typescript/unstable/sync in a child process over a temporary project), so a block that grows shifts the lines after it and widens nothing"

key-files:
  created:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-pinned-check.mjs
  modified:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md

key-decisions:
  - "The syntax tree comes from typescript 7's unstable sync API in a child process over a temporary project: the installed typescript has no in-process parser, and the project's own scans (module-state-scan, probe-guard-parse) read a file the same way."
  - "Every region also names the text its first and last base line start with, and the check reads them against the base, so a wrong line constant fails instead of passing quietly."

duration: 35min
completed: 2026-11-26
---

# Phase 90 Plan 07: The Pinned-Test Check Summary

**`90-pinned-check.mjs` holds 408 base files byte for byte, judges five declared edits by exact base line ranges against their declaring commits, and holds three born files (the characterisation and the type pins outside an import region read from the syntax tree, the bench file whole) plus the permitted mutation test file; every reason has been seen failing on a scratch clone.**

## The output line at HEAD

```
90-pinned-check.mjs: pinned: 408 files hold their base text, 3 of 3 born files held, 1 of 5 declared edits applied
```

Exactly the numbers the plan expects: 410 files under the five directories at `phase_base`, minus the three declared test files, plus `PortServing.ts` is 408; the three born files hold; `LeafNeeds.test.ts` is the one declared edit applied. `--self-test` passes, `pnpm exec oxlint` on the script is clean, and `--all-applied` on HEAD fails naming the four declared edits whose commits do not exist yet (`PortName.tst.ts`, `PortDescription.test.ts`, `LeafNeeds.ts`, `ScopedLeaf.ts`).

## What the check holds

- **Held.** `git ls-tree -r -z <phase_base>` over `packages/core/test`, `packages/http/test`, `packages/testing/test`, `packages/devtools/test` and `features`, less the declared test files, plus `packages/core/src/PortServing.ts`. Each file is compared by `git hash-object --no-filters` against its base blob, and the text is read only for one that differs, so the reason names the first differing line. A held file moved or deleted is a reason (`git diff -M --name-status`).
- **Declared (five), each region an exact `[first, last]` of base lines:**
  - `LeafNeeds.test.ts` 9-43 and 133-160 at `test(90-04): hold the scoped read to its leaf rows`;
  - `PortName.tst.ts` 1-8, 10-12 and 32-39 at `feat(90-10)!: a port description states its own span name`;
  - `PortDescription.test.ts` one inserted line between base lines 120 and 121, exactly `  fixture: () => named(undefined, 0),`, at `feat(90-11)!: a port description states its own fixture`;
  - `LeafNeeds.ts` 44-48 and `ScopedLeaf.ts` 8-19 at `refactor(90-12): route every scoped read off its leaf row`.
  Step one judges the declaring commit's file against the base outside the regions (the held segments are found in order, so a region may grow or shrink); step two requires HEAD to equal that commit's text. Before the commit exists the file is held. The two source files apply only when `90-BENCH.md`'s last `# gate:` line is `pass` (it is); when it is not, they join the held set and the declared total is 3.
- **Born (three, plus one permitted).**
  - the characterisation at `test(90-03): pin the port facts on the base`, import region 24-61, nothing appended;
  - `PortFacts.tst.ts` at `test(90-04): pin the moved port types on the base`, import region 11-20, lines appended after the born text allowed;
  - `Evaluate.bench.ts` whole at `test(90-06): add the scoped-heavy bench workloads`;
  - `PortFacts.mutation.test.ts`, only when it exists: added by exactly one commit, `test(90-13): kill the surviving port facts mutants`, which holds exactly that path, and equal to that commit's text (absent is not a reason; the output's `<m>` is 3, or 4 once it exists).
- **Import regions.** Each constant is checked against the born text's syntax tree (the span of its top-level import declarations, with no other statement and no uncovered non-blank line inside). At HEAD the region starts at the same line and ends at the last line of the last top-level import declaration; a non-import statement or a comment line inside it is a reason; the text before it is compared byte for byte and the text after it line by line from its end.

## Seen failing (11 blocks, `## pinned-<name>` in 90-RED-EVIDENCE.md)

| Variant | Reason printed |
| ------- | -------------- |
| `Ports.test.ts` edited (held core test) | `differs from its base text at line 642` |
| `packages/devtools/test/builtFeeds.ts` edited (held devtools file) | `differs from its base text at line 38` |
| `features/step-definitions/CustomPredicateWhenSteps.ts` edited (held features file) | `differs from its base text at line 12` |
| `PortServing.ts` edited | `differs from its base text at line 115` |
| `LeafNeeds.test.ts` edited outside its regions | `differs from the commit that added it at line 54` and `differs outside its declared lines at line 54` |
| characterisation edited outside its import block | `differs from the commit that added it at line 698` |
| characterisation with a `const` among its imports | `line 31 inside its import region is not an import declaration` |
| `PortFacts.tst.ts` edited inside its born text | `differs from the commit that added it at line 24` |
| bench file edited | `differs from the commit that added it at line 623` |
| mutation test file added under `test(90-99): scratch only` | `added by a commit other than the one that may add it` |
| `--all-applied` on the unedited clone | `its declared edit is not applied` for the four declared files whose commits are missing |

No commit on the main tree carries the subject `test(90-99): scratch only` (it exists only in the scratch clone). The `--self-test` also plants each remaining reason, and two sabotaged copies of the script (the suffix compare removed, the born-region constant check removed) were seen failing it.

## Task Commits

1. **Task 1: the check** - `501710b2` `chore(90-07): add the pinned-test check` (the script alone)
2. **Task 2: the evidence** - `ecf335b5` `docs(90-07): record the pinned-test check seen failing` (90-RED-EVIDENCE.md alone)

## Deviations from Plan

### Choices the plan left open (recorded, most complete option taken)

1. **The syntax tree.** The plan says "through typescript's parser, the way `module-state-scan.mjs` reads a file". The installed `typescript` is 7.0.2, whose only parse is `typescript/unstable/sync`'s server-backed `API`, which reads files of a project. The script writes the texts to be read (the born text and HEAD's text of each file with an import region) into a temporary project, runs one child (`--parse-child`, under `runTypescriptChild`'s timeout and server cleanup, imported from `scripts/lib/typescript-server-child.mjs`), prints each top-level statement's line range, and removes the project. A failure to start the server fails the check.
2. **Anchors on every region.** Each region also states the text its first and last base line start with (`top`, `bottom`), read against the base text on every run, so an off-by-one constant fails. The plan fixes only the ranges.
3. **A declaring commit must change its file** and must hold text for it; a commit with the subject that leaves the file as the base is a reason, not an applied edit.
4. **Two reasons when a declared file at HEAD differs from its commit.** HEAD is also judged against the base regions, so an edit outside them names `differs outside its declared lines` beside `differs from the commit that added it`; an edit inside them names only the second.
5. **The born type pins and characterisation.** A commit that is not the only one adding the file, or not the one with the named subject, is a reason; a file present with no adding commit passes plain and fails `--all-applied` (the Phase 89 rule). The bench file is judged by the commit with its subject, which must change it.
6. **A comment line among the imports** is read as "not an import declaration", as a non-blank line no import covers. Neither born text has one.
7. **When the gate of record failed**, the two source files join the held set (so `<n>` is 410) and the declared total is 3. `90-BENCH.md` without a `# gate:` line fails the check.
8. **Scratch clones.** Only the 11 `pinned-*` clones were removed. `ab-routing.log`, `bench-routing` and `bench-routing-patch` under the scratch root belong to plan 06 (`90-BENCH.md` lists the raw run files left there) and were not touched; `scratch-clean` was not run, so the close must decide when to remove them.

### Plan defects

None. The acceptance numbers (408, 3 of 3, 1 of 5) were measured exactly.

## Known Stubs

None.

## Threat Flags

None. T-90-15 (a held test quietly edited) is mitigated by the check and was seen failing on a held core test, a held devtools file, a held features file and `PortServing.ts`.

## Issues Encountered

- The first draft of the self-test planted a `const` inside an `import {` block, which is a syntax error rather than a statement among imports; it now inserts between whole import declarations.

## Denied commands

None.

## Not done

- No coverage, Stryker or `pnpm check:pr` run: the plan adds a phase script and evidence only, and writes no source or test.
- The declared edits of plans 10, 11 and 12 are held until their commits exist; the check has not seen them applied (the self-test plants them).

## Self-Check: PASSED

- `90-pinned-check.mjs` and `90-RED-EVIDENCE.md` exist; commits `501710b2` and `ecf335b5` are ancestors of HEAD (`90-check.mjs commit` accepted both subjects with exactly their one path each); `90-check.mjs trailers` reports 22 commits since phase_base, each with the one trailer.
- `node 90-pinned-check.mjs --self-test` passes; `node 90-pinned-check.mjs` exits 0 with the line above; `pnpm exec oxlint` on the script is clean; the evidence file holds 11 `## pinned-` blocks, each with exit 1 and its failing text; `90-check.mjs seen-failing` still passes for the type pins; no `.vitest/` directory exists.
