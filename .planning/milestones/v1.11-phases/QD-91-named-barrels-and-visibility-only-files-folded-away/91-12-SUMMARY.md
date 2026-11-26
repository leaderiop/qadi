---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 12
subsystem: audit
tags: [folds, audit, sequence-check, barrels]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the named audit barrel (91-BARRELS.md), 91-check.mjs structural/commit/variant, 91-pinned-check.mjs, 91-earlier-checks.mjs
provides:
  - verifySequenceIntegrity and SequenceIntegrityError declared in ArchiveFacts.ts with the gap-and-duplicate disclaimer as their doc, and the visibility-only SequenceIntegrity.ts deleted
  - the sequence fold's structural block in 91-FOLDS.md (madge 247)
  - sequence-check-type-only seen failing on audit's surface test
affects: [91-18 (re-points the four citations of the disclaimer and the three source comments that name SequenceIntegrity.ts), 91-13 (the next fold appends its block)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: c8d8f44645591ae91f7187cd8a35bb9db1f233d7
plan_head_after: af405df29fb13bddc969a550784fde094044f8ab
commits: 2

actuals:
  tokens: 3000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a public check is declared beside the facts that compute it; the barrel names the two public names, so the archive internals stay unreachable"

key-files:
  created: []
  modified:
    - packages/audit/src/ArchiveFacts.ts
    - packages/audit/src/index.ts
    - packages/audit/test/AdmissionOrder.characterisation.test.ts
    - packages/audit/test/AuditArchive.test.ts
    - packages/audit/test/BatchReadOnce.test.ts
    - packages/audit/test/ForeignRows.test.ts
    - packages/audit/test/RowListAdmission.test.ts
    - packages/audit/test/SequenceIntegrity.test.ts
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-FOLDS.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md
  deleted:
    - packages/audit/src/SequenceIntegrity.ts

key-decisions:
  - "The sequence check's disclaimer travels with its declarations: it is verifySequenceIntegrity's doc, and SequenceIntegrityError's doc points to it"

requirements-completed: []

duration: 30min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 12: Sequence fold Summary

**`verifySequenceIntegrity` and `SequenceIntegrityError` are declared in `ArchiveFacts.ts` with the gap-and-duplicate, not tamper-evident disclaimer as their doc; `SequenceIntegrity.ts` is gone, the public surface is unchanged (948 exports, gate 13 at 943), and `verifiedArchiveFacts` and every other archive-facts name stay unreachable from the barrel.**

## Accomplishments

- Source side (staged by Task 1, committed with Task 2): `ArchiveFacts.ts`'s header says the module is package-private except the two names the barrel names here, that the named barrel names a name at the module that declares it, that the check is gap-and-duplicate detection and not tamper-evidence, and which four documents cite the disclaimer (README, `spec/urs.md`, `spec/models/17-purpose.md`, ADR-QD-009; ADR-QD-110). `verifySequenceIntegrity`'s doc carries the deleted file's disclaimer paragraphs verbatim (what the check is named for, no per-entry hash, an attacker can renumber, ADR-QD-056, the rename note, the no-grouping-key paragraph) plus the literal "not tamper-evident". `SequenceIntegrityError` gained a short doc pointing at the check's. Nothing of Phase 89's admission moved in.
- Barrel: regenerated with the recorded generator; the module list's `./SequenceIntegrity.ts` became `./ArchiveFacts.ts only SequenceIntegrityError verifySequenceIntegrity` (16 modules, 72 names, 0 collisions, 0 kind replacements). The regeneration changed one specifier (the line now sorts first, ahead of `./AuditArchive.ts`). `homes` and `barrels` exit 0.
- Tests: six files, declared import lines only. `AdmissionOrder.characterisation.test.ts` merged its two lines (`SequenceIntegrity.ts` and `ArchiveFacts.ts`) into `import { verifiedArchiveFacts, verifySequenceIntegrity } from "../src/ArchiveFacts.ts";`; `RowListAdmission.test.ts` keeps its type import (line 12) and value import (line 19) apart, different kinds; the other four re-point one line. `91-pinned-check.mjs`: `516 held, 26 declared (18 applied), 3 born, 27 earlier-held, clean`.

### Structural block (`91-FOLDS.md`, every command exit 0)

| Commit | madge files | circular | build | typecheck | surface (gate 13 at 943) | gate 14 | house-style |
| ------ | ----------: | -------- | ----- | --------- | ------------------------ | ------- | ----------- |
| `8eadbc55` sequence fold | 247 | exit 0 | exit 0 | exit 0 | equal to the base, 948 exports; `check-api-surface.mjs` 943 | exit 0, 9 packages, 528 runtime exports | exit 0, 648 files |

Also: `91-check.mjs vitest packages/audit/test` (734 tests in 37 files, all passed), `scan-ids` and `scan-forbidden` clean, `91-check.mjs commit` accepts the nine paths under the subject, `trailers` (39 commits, each with the one trailer), `homes`, `barrels`, `pnpm exec tsc -b tsconfig.json` and `tsc -p tsconfig.test.json --noEmit`.

### The type-only export seen failing (`91-RED-EVIDENCE.md`)

| Label | Scratch | Edit | Result |
| ----- | ------- | ---- | ------ |
| `sequence-check-type-only` | `sequence-type-only` at `8eadbc5516` | audit's barrel group for `./ArchiveFacts.ts` became `export type { SequenceIntegrityError, verifySequenceIntegrity }` | exit 1; "@qadi/audit's root exports exactly these runtime values" fails (`expected [ 'ArchiveInputInvalid', …(38) ] to deeply equal [ …(40) ]`) |

### Earlier-phase checks

`node 91-earlier-checks.mjs` run once, after both commits: exit 0, `87 runs, all match their rows`. The prediction held: the 89 pinned row moved (`89-pinned-check.mjs: exit 1: packages/audit/src/SequenceIntegrity.ts was deleted`, the row's recorded movement), and `89-check.mjs entry-points-first` stays exit 0 (it names `verifySequenceIntegrity` admitting the batch first and `verifiedArchiveFacts` taking `AdmittedRows`). The 90 and 89 `records --close`/`scan-forbidden` exit-1 rows are the recorded ones, matched.

## Task Commits

1. Tasks 1 and 2 (one commit, as the plan requires): `8eadbc55` `refactor(91-12): fold the sequence check's public home into the archive facts` (nine paths, `SequenceIntegrity.ts` deleted); `91-check.mjs commit` accepts it.
2. Task 3 record: `af405df2` `docs(91-12): record the sequence fold verdict` (`91-FOLDS.md`, `91-RED-EVIDENCE.md`); `91-check.mjs commit` accepts it.

## Deviations from Plan

### Plan defects

**1. The disclaimer, moved verbatim, holds no `tamper-evident`.** Task 1's verify and `folds` need the literal `tamper-evident` in `ArchiveFacts.ts`; `SequenceIntegrity.ts` only said "tamper-evidence" (and `ArchiveFacts.ts`'s old header said the same). Fix: `verifySequenceIntegrity`'s doc says "so the sequence is not tamper-evident" inside the moved first paragraph; no check was weakened.

**2. Task 2's `91-pinned-check.mjs` cannot be clean before the commit.** The declared edits are held against base until their commit exists (the check's own self-test says so), so the run before the commit reports the six lines; it was clean (`18 applied`) right after.

### Choices the plan left open (autonomous, most complete option)

**3.** `SequenceIntegrityError` had no doc; it gained a short one pointing to the check's rather than staying bare under a barrel that now names it at its declaring module.

### Process incident

**4. `scratch-clean` removed the whole scratch root, including the uncommitted barrel generator.** The Task 3 clean-up (`91-check.mjs scratch-clean`) deletes `$TMPDIR/qd91`, where the generator lives (`gen/`). It was rebuilt in place: `genbarrel.mjs` and `child.mjs` were recreated from the source printed earlier in the run, and both match the shas recorded in `91-BARRELS.md` (`0dbf0508…5284`, `f586f2dc…da63`); the three packages' module lists and headers were rebuilt from the current barrels (with the recorded `only`/`except` rows for `GateWriter.ts`, `PortSpan.ts`, `PortSpanEncode.ts` and the new `ArchiveFacts.ts` row), and the generator reproduces `packages/audit`, `packages/react` and `packages/core` `src/index.ts` byte for byte. The audit list now names `./ArchiveFacts.ts only SequenceIntegrityError verifySequenceIntegrity` instead of `./SequenceIntegrity.ts`. Later plans that regenerate a barrel can use `$TMPDIR/qd91/gen` as before; do not run `scratch-clean` again before the phase's last plan.

**Total deviations:** 2 plan defects, 1 open choice, 1 process incident. **Impact:** none on the shipped tree; no check weakened.

## Known Stubs

None.

## Threat Flags

None. T-91-25 (the sequence check read as tamper-evidence) is mitigated: the disclaimer is the declarations' doc and `folds` requires `tamper-evident` in `ArchiveFacts.ts`; the remaining prose citations of `SequenceIntegrity.ts` (`AuditArchive.ts:112`, `AuditDecisionSinkLive.ts:16`, `AuditEntry.ts:92`, and the README) are re-pointed in plan 18.

## Self-Check: PASSED

- `packages/audit/src/SequenceIntegrity.ts` does not exist; `ArchiveFacts.ts` declares both names and holds `tamper-evident`; no import of `SequenceIntegrity.ts` remains under `packages/*/src` or `packages/*/test`.
- Commits `8eadbc55` and `af405df2` are ancestors of HEAD, each with the one trailer.
- `91-FOLDS.md` holds the sequence block with every command exit 0 and `madge files: 247`; `91-RED-EVIDENCE.md` holds `sequence-check-type-only` with exit 1 and a `- seen failing:` line.
