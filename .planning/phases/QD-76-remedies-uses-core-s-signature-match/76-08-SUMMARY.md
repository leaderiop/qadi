---
phase: QD-76-remedies-uses-core-s-signature-match
plan: 08
subsystem: close
tags: [close, mutation, check-pr, requirements, width, evidence]
phase_base: bf339146723bd1eabd1f08dd94f489d8480027ef
plan_head_before: 1cc641886a8c43a02a5f7362b862357b338af9b7
plan_head_after: acc213f7e3dc71436db4536d02b8ad92e82a3c4f

requires: ["76-07"]
provides:
  - "every close scan read on the final tree and recorded in 76-RED-EVIDENCE.md under 'The close on the final tree'"
  - "the mutation close re-measured on 43e83c50: core 200/201, devtools 467/467, http 34/34 on one head"
  - "pnpm check:pr exiting 0 on 446f0b27 (17 of 18 steps, mutation skipped), api-surface 940, packed-install 526 runtime exports (the base's count)"
  - "SIGM-01 to SIGM-05 marked complete in REQUIREMENTS.md, in one commit"
affects: []

actuals:
  tokens: 15000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a close scan that reads the added lines of the whole phase finds what no per-plan scan did: the width of a row three plans earlier"

key-files:
  created:
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-08-SUMMARY.md
  modified:
    - packages/http/test/QadiHttpError.test.ts
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-mutation-close.json
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-RED-EVIDENCE.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "The four over-wide lines the close found in QadiHttpError.test.ts were fixed and the whole mutation close re-measured, rather than waived: WX-04 states 90 columns and the plan prescribes a re-measure after any packages change"
  - "A required row title written with a backslash continuation is held to 90 columns per source line, not joined: the plan's own required titles are longer than 90 characters joined"

requirements-completed: [SIGM-01, SIGM-02, SIGM-03, SIGM-04, SIGM-05]  # by hand; WX-01..07 stay Pending until the milestone closes

duration: about 45 min
completed: 2026-11-23
status: complete
---

# Phase 76 Plan 08: The close on the final tree

**The remedy table's use of core's signature and acted judgements closes: every scan holds on the final tree, `pnpm check:pr` exits 0 on it, and SIGM-01 to SIGM-05 are complete.**

## Accomplishments

- Every close scan of the plan ran on the final tree and is recorded in `76-RED-EVIDENCE.md`: the agreement files 7 of 7
  each (177 of 177 in the four devtools files), the core rows 205 of 205, the http rows 55 of 55, both type pins, the
  agreement check (3 frozen and 3 append-only) and its self-test (18), the closed list (the 36 required paths, the
  optional one unchanged), the kept test lines, api-surface 940, house-style (3 switches, 74 type-test files), the
  reservation sha256, the mutation `compare` and its self-test (38), the forbidden-construct, suppression, width, label
  and title scans, and the reader grep of the two optional error members (every file listed with its reads).
- The mutation close was re-measured (below) and reads core 200/201 (the one base survivor, `SignatureHistory.ts:366`),
  devtools 467/467 and http 34/34, all on `43e83c50`.
- `pnpm check:pr < /dev/null` exited 0 on `446f0b27`, the tree the requirements are marked on. Its last line is
  `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).`; it reads
  `api-surface: 940 export(s) documented across 9 package(s)` and
  `package-install: 9 package(s) pack, resolve and authorize (526 runtime export(s))`, the base's count.
- SIGM-01 to SIGM-05 read complete in the checkbox list and the table, by hand, in one commit that changes only those ten
  lines. WX-01 to WX-07 read Pending.

## Task Commits

1. **Width fix (deviation 1)** - `43e83c50` (fix) - `packages/http/test/QadiHttpError.test.ts`
2. **Re-measured close** - `f4e3bce4` (docs) - `76-mutation-close.json`
3. **Task 1: the close scans on the final tree** - `446f0b27` (docs) - `76-RED-EVIDENCE.md`
4. **Task 2: SIGM-01 to SIGM-05 complete** - `acc213f7` (docs) - `.planning/REQUIREMENTS.md`

## Deviations from Plan

**1. [Rule 1 - Bug] Four added lines over 90 columns in `QadiHttpError.test.ts`**
- **Found during:** Task 1 (the added-lines width scan on the final tree)
- **Issue:** the row that projects a history error carrying its event had a 110-column title line and a 91-column
  comment, and the two rows for an absent member each had a 105-column expectation (WX-04: no added line over 90).
- **Fix:** the title shortened to `the DecisionHistoryUnavailable projection and body carry its event`, the comment
  wrapped, each encoded body read once into a const. No assertion changed; 55 of 55 pass; house-style clean.
- **Re-measure:** a file under `packages/` changed after the close of `7fe82541`, so the plan's own rule applied: every
  group was re-measured with `record close core --restart` on the new head (`f4e3bce4`), and Task 1 was rerun.
  `compare` passes; scores unchanged.
- **Files modified:** `packages/http/test/QadiHttpError.test.ts`, `76-mutation-close.json`
- **Commits:** `43e83c50`, `f4e3bce4`

**2. [Verification-only] The kept-test-lines scan and `SinkCodec.test.ts:571`**
- The plan's scan allows an existing test line to change only inside an import and inside two rows. One existing
  trailing comment changed, which 76-03's plan declares: the payload comment `// missing \`subjectId\`/\`cause\`` became
  `// missing \`cause\``, input and expected value unchanged (`subjectId` is optional now). The scan was run with that
  one comment line allowed, and the exception is recorded in the evidence. No row, input or assertion of an existing
  test changed.

**3. [Verification-only] Titles written with a `\` continuation**
- The type-pin grep and the title-length scan read source text; the phase's titles are written `"...\<newline>..."`.
  The pin grep joins the continuation first (76-07's deviation 1). The length scan holds each source line of a title to
  90 columns instead of the joined title, because the plan's own required titles (for example `a fixture row it cannot
  key is skipped with its refusal and offered no row, while core fails the read`) exceed 90 characters joined; every
  non-continued added title is at most 90 characters.

**Total deviations:** 1 auto-fixed (Rule 1), 2 verification-only. **Impact:** none on behavior; a test-only reformat and
a re-measured close.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None. No file was added that introduces a network endpoint, auth path or schema at a trust boundary.

## Issues Encountered

None open. No changeset was consumed and no package version or changelog moved; nothing was released, published or
pushed.

## Next Phase Readiness

Phase 76 is complete; the WX rows stay Pending until the v1.8 milestone closes.

## Self-Check: PASSED

- `76-RED-EVIDENCE.md` holds `## The close on the final tree` once, ending `Every scan holds on the final tree.`
- Commits `43e83c50`, `f4e3bce4`, `446f0b27`, `acc213f7` are ancestors of HEAD.
- The Task 1 verify prints `every close scan holds` (with deviations 2 and 3 applied to its scans) and the Task 2 verify
  prints `phase closed`, both on the tree after the last source commit.
