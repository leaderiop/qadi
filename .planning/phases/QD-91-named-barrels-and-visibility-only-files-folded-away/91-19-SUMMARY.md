---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 19
subsystem: spec
tags: [stale-sweep, registry-lease, citations, named-barrel]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the folds (91-10 to 91-13), the decision and its notes (91-16 to 91-18), the changesets (91-18)
provides:
  - RegistryLease.ts's header names RegistryOwner.ts as its one caller, and the Phase 86 IN-02 Known Issue is gone
  - 91-SWEEP.md, the before list, the fixed rows and every remaining hit classified
  - no source, README, script, app or example names a deleted path or the old rule name
affects: [91-20 (ledger reconcile), 91-21 (close)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 2bc3c744
plan_head_after: c6ab1351e742b71d67d939cc851164cebdc48777
commits: 5

actuals:
  tokens: 45000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "a decision whose body names a folded module takes a dated note saying where it lives, never a rewrite of its past account"

key-files:
  created:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-SWEEP.md
  modified:
    - packages/react/src/RegistryLease.ts
    - .planning/PROJECT.md
    - packages/audit/src/AuditArchive.ts
    - packages/audit/src/AuditDecisionSinkLive.ts
    - packages/audit/src/AuditEntry.ts
    - packages/core/src/Decision.ts
    - packages/core/src/FieldLattice.ts
    - packages/react/src/SeededDecision.ts
    - packages/react/src/SeededQuestion.ts
    - packages/react/src/HydrationEvent.ts
    - packages/react/test/ServerRender.test.tsx
    - spec/README.md
    - spec/decisions/014-react-via-atoms.md
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/056-audit-companion-package.md
    - spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md
    - spec/decisions/099-entry-points-are-a-closed-list.md
    - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
    - spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-pinned-check.mjs
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-earlier-checks.mjs

key-decisions:
  - "A decision's body that names a folded module is history and takes a dated note (the way 91-18 did); only a present-tense inventory line is edited in place (decided autonomously)"
  - "The one held test comment naming react's Hydration.ts is fixed, under a new comment kind of declared region in the pinned check, rather than left (the owner's rule to prefer fixing)"

requirements-completed: []

duration: 60min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 19: The registry lease's caller and the stale sweep Summary

**`RegistryLease.ts` names `RegistryOwner.ts` as its one caller, and no source, README, script, app or example names `PortSpanDecode.ts`, `PortInterpreter.ts`, `GateRegistry.ts`, `SequenceIntegrity.ts`, react's `Hydration.ts` or `devtools-named-barrel`; every hit left in `spec` is a classified row of `91-SWEEP.md`.**

## Accomplishments

- Task 1 (`0a7abe7e`): `/usr/bin/grep -rln 'from "./RegistryLease.ts"' packages/react/src` printed only `RegistryOwner.ts`. The header's "`QadiProvider.tsx` is its one caller" now reads "`RegistryOwner.ts` is its one caller" (two lines, nothing below the header changed); the `.planning/PROJECT.md` Phase 86 IN-02 Known Issue is deleted (`grep -c 'Phase 86 review IN-02'` is 0). `91-check.mjs commit` accepts it, and `git log <phase_base>..HEAD -- RegistryLease.ts` prints only this subject. The lease and owner tests (26) pass.
- Task 2 and 3 (`743f6f85`): the before search over the plan's directories found 138 hits (122 in `spec`, 16 elsewhere, a line holding two patterns counted under each). Eight source comments are fixed, each keeping its claim: `AuditArchive.ts:112`, `AuditDecisionSinkLive.ts:16` and `AuditEntry.ts:92` now cite `ArchiveFacts.ts`; `Decision.ts:69` and `FieldLattice.ts:71` cite `HydrationEngine.ts`; `SeededDecision.ts:15`, `SeededQuestion.ts:18` and `HydrationEvent.ts:23` no longer name react's `Hydration.ts` (the barrel names what a consumer may hold). The one comment of `packages/react/test/ServerRender.test.tsx:189` is fixed too. Only comments changed: `git diff -- packages` shows no code line.
- Spec: `devtools-named-barrel` becomes `named-barrel` in ADR-QD-047 and 099 (inside the revisions this phase already made, no second bump). ADR-QD-014's module inventory names `GateWriter.ts` and `HydrationEngine.ts` and takes a dated note (no Document Control block, so no revision). ADR-QD-056's retention inventory names `ArchiveFacts.ts`, and 056 (1.18 to 1.19), 078 (1.5 to 1.6), 111 (1.3 to 1.4) and 190 (1.7 to 1.8) each take one dated note on where the folded module's names live, one bump each. The CCR-QD-483 row in `spec/README.md` grows in place to name them.
- `91-SWEEP.md` holds `## Before` (the counts per pattern and the output cut at 170 characters), `## Fixed` (20 rows over 17 files) and `## Remaining` (120 hits: 94 `history`, 26 `other file`, none unclassified).

## Verdict counts of the Remaining hits

| verdict | count | what |
| ------- | ----- | ---- |
| history | 94 | Change History and register rows, this change's own record (ADR-QD-037 and 204), decisions' own past accounts, and the new notes' own words |
| other file | 26 | devtools' `model/Hydration.ts`, and react's type test `Hydration.tst.ts` (which contains the text `Hydration.ts`) |
| fixed | 20 rows | see `## Fixed` |

`spec/behaviors/25-inspection.md:991` ("was a module-scope map") and `spec/process/house-rules-evidence.md:237` ("used to say") are past tense: recorded as history, no edit.

## Task Commits

1. Task 1: `0a7abe7e` `docs(91-19): name the registry lease's one caller` (the two paths).
2. Task 2 and 3: `743f6f85` `docs(91-19): sweep the deleted paths and the old rule name` (`91-SWEEP.md` and the 17 files its Fixed rows name; `91-check.mjs commit` accepts it).
3. Off-table: `f961469b` `fix(91-19): let the pinned check declare one test comment line`; `484d0327` `fix(91-19): key the 86 pinned row on the sweep's test comment`; `c6ab1351` `fix(91-19): key the 89 close on the sweep's decision note`.

## Checks run

- `node 91-check.mjs rule`, `folds` (6 folds, 5 files gone), `changesets` (3 patch changesets), `scan-ids`, `trailers` (72 commits, each with the one trailer), `records` exit 0; `--self-test` 475 passed.
- `pnpm spec:verify:strict` (21 pass, 0 fail), `node scripts/spec-revise.mjs --check`, `node scripts/check-house-style.mjs`, `node scripts/check-api-surface.mjs` exit 0. `pnpm exec vitest run packages/audit/test` 734 passed; `ServerRender.test.tsx` 7 passed.
- `91-pinned-check.mjs` and `--all-applied`: `pinned: 515 held, 27 declared (27 applied), 4 born, 27 earlier-held, clean`; `--self-test` 97 passed (six new comment-region rows).
- `91-earlier-checks.mjs`: `87 runs, all match their rows` after the lease commit (the predicted move of the 86 pinned row), and after each of the two ledger commits.
- `91-check.mjs records --close` prints one line, `AGENTS.md section 16 does not name outside its own package`, and exits 0: that wording is a later plan's work. The two `RegistryLease.ts` header lines and the PROJECT.md Known Issue it listed after plan 18 are closed by this plan.

## Deviations from Plan

### Plan defects

**1. A held test comment cannot be declared by the pinned check as written.** The task says to "declare an exact region for that comment line honestly". `91-pinned-check.mjs` only lets a declared region be replaced by top-level import declarations (a comment there is a reason). Before: a declared region's replacement is judged by `judgeImportGaps` alone. After: a region may carry `comment: true`, its replacement must be one or more `//` line comments (an empty or non-comment replacement is a reason), the other regions are judged as before, and the row is `ServerRender.test.tsx` lines 189 to 190 under the sweep subject. Six new self-test rows. Nothing is weakened: the file is still held byte for byte outside the two lines, the declaring commit is still found by exact subject, and HEAD must equal that commit. Off-table commit `f961469b`.

**2. Two earlier-phase rows move that the plan did not predict.** Phase 86's pinned check holds `ServerRender.test.tsx`, and Phase 89's close pins ADR-QD-190's revision. Each is a computed row keyed on the sweep subject in `91-earlier-checks.mjs` (`PINNED_86`, `CLOSE_89`, `MOVES_BY_SUBJECT.sweep`), with one self-test row each and the subject count 13 to 14. Off-table commits `484d0327` and `c6ab1351`. The ledger was fixed honestly, not widened: each row prints the unmoved line until the sweep commit exists.

### Choices the plan left open (autonomous, most complete option)

**3. Decision bodies are history, not rewritten.** A decision's own past account of a module that was folded is recorded as `history` and the record takes a dated note saying where the module lives (014, 056, 078, 111, 190, the way plan 18 did for eight others). Only a present-tense inventory line is edited in place (014's two names, 056's retention list). ADR-QD-053 (the original decision and its correction), 072 (an "already existed" account), 152 and 198 are not touched: their hits are history or another file.

**4. The sweep record's `## Before` cuts each hit at 170 characters.** Register rows run to several thousand characters; the file:line, the pattern and the start of the line identify each hit.

**5. The `Remaining` table also holds the non-`spec` hits that are another file** (devtools' `model/Hydration.ts` imports, `AGENTS.md:576` and `scripts/check-house-style.mjs:780`, which name `Hydration.tst.ts`), so that nothing the search prints is unclassified.

**Total deviations:** 2 plan defects, 3 open choices. **Impact:** three extra commits; no check weakened.

## Known Stubs

None.

## Threat Flags

None. T-91-35 (the sequence check's not-tamper-evident disclaimer cited at a deleted file) is mitigated: `AuditArchive.ts` now points at `ArchiveFacts.ts`, and the zero search over sources and the row-by-row classification of `spec` are the plan's verify.

## Self-Check: PASSED

- `.planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-SWEEP.md` exists with `## Before`, `## Fixed` and `## Remaining`; `grep -c 'Phase 86 review IN-02' .planning/PROJECT.md` is 0; `RegistryLease.ts` holds "`RegistryOwner.ts` is its one caller".
- Commits `0a7abe7e`, `f961469b`, `484d0327`, `743f6f85` and `c6ab1351` are ancestors of HEAD, each with the one trailer.
