---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 05
subsystem: audit
tags: [audit, admission-step, host-batch, test-first, nominal-rows, read-once]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
plan_head_before: d34819c63936c3327415300b51c03dd974561c5a
plan_head_after: 0644c721116115eb5266c015311f01c5896a15b3
commits: 2
status: complete

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: 89-check.mjs (commit, vitest, admission-step), the RED-EVIDENCE line forms, the held CodecMade.ts and BatchReadOnce.test.ts (plans 01 to 04)
provides:
  - packages/audit/src/HostBatch.ts, the package-private admission step (NowRefusalCases, AdmittedRows as a type, DatedBatch, AdmittedBatch, admitRows, admitBatch)
  - packages/audit/test/HostBatch.test.ts, rows H1 to H22, the one place the order is asserted
  - 89-RED-EVIDENCE.md, a red-before entry and fourteen variant blocks
affects: [QD-89 plans 06 to 11]

requirements-completed: []

actuals:
  tokens: 21000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a plain Result-returning step in a package-private module, no Effect and no span, so each caller keeps its own span"
    - "a nominal class that is not exported and is named in a type-only export, so only its module mints one"
    - "a host list is read as one length and one read per index into a fresh array by Array.from over { length }, and that array is what is checked and what is admitted"

key-files:
  created:
    - packages/audit/src/HostBatch.ts
    - packages/audit/test/HostBatch.test.ts
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-05-SUMMARY.md
  modified:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-RED-EVIDENCE.md

key-decisions:
  - "NowRefusalCases lives in HostBatch.ts beside the Number.isFinite check that answers it, and the step builds its refusal with its own Data.taggedEnum constructor; no entry point restates it."
  - "admitRows keeps a run-time Array.isArray guard behind a ReadonlyArray<AuditEntry> parameter: a value that is not a list reaches rowsRefusal unread and is named in the refusal, and a list is copied once."
  - "Four narrower variants beyond the plan's ten, for the five rows the ten left green (H2, H3, H5, H7, H8)."

---

# Phase 89 Plan 05: The admission step Summary

**`HostBatch.ts`, the one plain package-private step that admits a host batch in the order `now`, then the caller's terms, then the rows, with `AdmittedRows` a nominal class only the step mints and the list copied once by `Array.from({ length }, ...)`; `HostBatch.test.ts` holds its 22-row table, committed with the module after the table was seen failing with the module absent, and every row was then seen failing under a named variant of the step.**

## Performance

- **Completed:** 2026-11-26T03:19Z (start time not captured; about 14 minutes); **Tasks:** 2 (one tracer, one auto); two task commits plus the summary commit
- **Files created:** 3 (the module, its test, this summary); 1 modified (the evidence file); nothing else under `packages`, `spec` or another phase directory changed
- Scratch files lived in `$TMPDIR/qd89` (the final and original module copies, the variant reports) and the session scratchpad (the variant driver `variants-89-05.mjs` and the verify scripts); no variant is left in `packages/audit/src`.

## Accomplishments

- **Tracer (Task 1):** `HostBatch.test.ts` written with the 22 rows H1 to H22; the module was then written, the table and `tsc` seen green against it, and the module removed with a plain `rm` so the table could be run with it absent. That run failed to load (`Cannot find module '../src/HostBatch.ts'`), recorded as a `- red before:` entry with the HEAD `d34819c6` and the test blob `a6eff7b4`; the module was restored from the scratch copy and the test was not touched afterwards (the committed blob equals the recorded one). `feat(89-05): add the admission step` holds exactly the module, the test and the evidence file.
- **Variants (Task 2):** the plan's ten variants (`now-terms`, `rows-terms`, `isfinite`, `terms-on-refused-now`, `no-snapshot`, `no-list-guard`, `filter-first`, `positive-now`, `empty-refused`, `terms-dropped`) each edited a copy of the module, ran the table under the json reporter, and were restored with `cp`; four narrower variants (`now-unchecked`, `now-last`, `terms-ignored`, `rows-unchecked`) cover the rows the ten left green. All 22 titles are listed under at least one variant.

## What each row pins

- H1 the admitted batch; H2 to H12 every subset of a bad `now`, refused terms, rows that are not a list and a refused row (eleven rows, `now` wins over terms wins over rows); H13 the terms are called once for a finite `now` and never for a refused one; H14 the rows are never read for a refused `now` or refused terms; H15 and H16 the `now` boundary (`NaN`, both infinities, the string `1`, `undefined`, `null`, `1n` refused with the value given by `Object.is`; `0`, `-0`, `1` admitted as given); H17 the seven values that are not a list; H18 a hole refused at its index; H19 the row that was checked when the list flips on a second read; H20 one `length` read and one read per index; H21 the empty list; H22 a fresh array the list given cannot change.

## Variant results (rows turned red)

| Variant | Rows red |
| ------- | -------- |
| now-terms | H6, H11, H12, H13 |
| rows-terms | H9, H10, H14 |
| isfinite | H15 |
| terms-on-refused-now | H13 |
| no-snapshot | H19, H20, H22 |
| no-list-guard | H4, H17 |
| filter-first | H18 |
| positive-now | H15, H16 |
| empty-refused | H21 |
| terms-dropped | H1 |
| now-unchecked (narrower) | H2, H6, H7, H8, H11, H12, H13, H14, H15 |
| now-last (narrower) | H6, H7, H8, H11, H12, H13, H14 |
| terms-ignored (narrower) | H3, H9, H10, H14 |
| rows-unchecked (narrower) | H4, H5 |

## Task Commits

1. Task 1 (tracer): `16a97ff7` `feat(89-05): add the admission step` (`HostBatch.ts`, `HostBatch.test.ts`, `89-RED-EVIDENCE.md`)
2. Task 2: `0644c721` `docs(89-05): record the admission step variants` (`89-RED-EVIDENCE.md` only)

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan notes (choices the plan left open, taken as the most complete and clean)

- **The red run was taken after a green dry run.** The plan has the table written, seen failing, then the module written. To be sure the table could not need an edit after the failing run (the blob must equal the committed one), the module was written first at its final path, the table, `tsc`, oxlint and house style were run against it, and the module was then removed so the load failure was the run recorded. The test text is the text written before any module existed; no edit followed the dry run.
- **Four extra variants.** The plan asks for narrower variants where the ten leave a row green; the ten left H2, H3, H5, H7 and H8 green, so `now-unchecked` (H2), `now-last` (H7, H8), `terms-ignored` (H3) and `rows-unchecked` (H5) are added, each block naming the row it was added for. `filter-first` and `empty-refused` were first run in a form that also threw on a non-list (`.filter` or `.length` of `null`); they were rewritten to touch only a list and re-run, so each now turns red only the row it names.
- **The failing text** in the red-before entry has the checkout root elided as `<root>`; the rest is vitest's line.
- **No second pinned or earlier-phase check moved:** `89-pinned-check.mjs` (47 held, 3 of 5 born files held) and `89-earlier-checks.mjs` exit 0; `scan-ids`, `scan-forbidden` and `trailers` pass; `entry-points-first` still lists the four entry points as not yet calling the step, which plans 06 and 07 change.
- **Verifies ran from script files** (`bash <file>`), each the plan's text; none contains `rm`. The trailer on both commits is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, the value the phase fixes.

### Auth gates

None.

## Issues Encountered

None. The audit suite stays red by design (twelve `BatchReadOnce.test.ts` rows) until plans 06 and 07 land.

## Next Phase Readiness

- Plans 06 and 07 import `admitBatch`, `admitRows`, `NowRefusalCases`, `DatedBatch`, `AdmittedBatch` and the type `AdmittedRows` from `./HostBatch.ts` (value imports for the two functions: the module imports no entry-point module, so there is no cycle, and `pnpm circular` is clean).
- `verifiedArchiveFacts(rows: AdmittedRows)` can take `rows.entries`; the only way to hold an `AdmittedRows` is through `admitRows` or `admitBatch`.

## Known Stubs

None.

## Threat Flags

None. T-89-13 is mitigated and pinned (H19, H20, H22: one read of `length` and each index, the copy is what is checked and admitted); T-89-14 by `Number.isFinite` and the `Array.isArray` guard (H15, H17); T-89-15 because `AdmittedRows` is an unexported class named in a type-only export.

## Self-Check: PASSED

- `packages/audit/src/HostBatch.ts`, `packages/audit/test/HostBatch.test.ts` and this summary exist; `16a97ff7` and `0644c721` are ancestors of HEAD.
- Task 1 verify (`v89-05-t1.sh`): `T1 VERIFY OK` (22 rows in 1 file, 0 failed; tsc, `pnpm circular` and house style clean; module-only shape clean).
- Task 2 verify: the ten variant blocks, all 22 titles under a `- failed:` line, `git diff --quiet HEAD -- packages/audit/src`, the variants commit holding only the evidence file with the one trailer.
