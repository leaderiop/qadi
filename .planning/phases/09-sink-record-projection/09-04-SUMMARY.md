---
phase: 09-sink-record-projection
plan: 04
subsystem: spec
tags: [spec, overview, changeset, merge-gate, ARCH-54, ADR-QD-116, CCR-QD-393]
requires: ["09-03"]
provides:
  - "spec/overview.md's record-codec paragraph naming both leaves, SinkWire.ts and JsonRefusal.ts"
  - "CCR-QD-393 row complete with each spec document's Revision; README at Rev 1.126"
  - ".changeset/sink-record-projection.md (internal @qadi/core patch)"
affects: []
tech-stack:
  added: []
  patterns: ["an internal move with no export change takes a patch changeset in the 'Internal:' style"]
key-files:
  created:
    - .changeset/sink-record-projection.md
  modified:
    - spec/overview.md
    - spec/README.md
key-decisions:
  - "No overview export-table row was touched: no export was added or removed (gate 13 green, 863 exports)"
  - "pnpm check:pr's `pnpm example` step fails only at `playwright install --with-deps chromium` (needs sudo, no terminal); every step before it passed in the run and the three steps after it plus the example's own e2e were run directly and pass"
requirements-completed: [XC-01, XC-02, XC-03, XC-05]
status: complete
duration: 15 min
completed: 2026-11-09
commits: 1
plan_head_before: a2e1f42d30ec4d81ccae0fe5a5dea84a0274885a
plan_head_after: ca3a15c18fbcad20ffb71b501e4de185bc8d0687
actuals:
  tokens: 4000
  tasks: 2
  commits: 1
coverage:
  - deliverable: "overview names both leaves with tables untouched; CCR-QD-393 row complete with revisions; changeset exists"
    verification:
      - kind: command
        ref: "pnpm spec:api && node scripts/spec-revise.mjs --check && pnpm spec:verify:strict (21 PASS, 0 FAIL, 0 SKIP)"
        status: pass
    human_judgment: false
  - deliverable: "merge gate green (XC-01, XC-05)"
    verification:
      - kind: command
        ref: "pnpm check:pr steps 1-12 pass; step 13 (pnpm example) fails at the sudo-only `playwright install --with-deps`; its typecheck, unit tests, build and e2e (30 passed) pass when run directly; steps 14-16 (spec:website-examples, website, spec:publish) pass when run directly"
        status: fail
    human_judgment: true
    rationale: "pnpm check:pr as one command did not exit 0 on this workstation because of an environmental sudo prompt, not a code or spec defect; a human or CI (which has root) should confirm the single command"
---

# Phase 9 Plan 04: Close-out and merge gate Summary

The overview's record-codec paragraph now places the vocabulary in two leaves (`SinkWire.ts`, `JsonRefusal.ts`), the CCR-QD-393 row carries every spec document's Revision (README bumped once to 1.126), and `.changeset/sink-record-projection.md` records the phase as an internal `@qadi/core` patch; `pnpm check:pr` passes every code and spec gate, but as one command it stops at an environmental `sudo` prompt (see below).

## Commits

| Commit | Message |
| ------ | ------- |
| ca3a15c | docs(09-04): overview names both leaves, CCR-QD-393 revisions, changeset |

## Revisions recorded in the CCR-QD-393 row

| Document | Revision |
| -------- | -------- |
| spec/decisions/116-... | 1.0 (new) |
| spec/decisions/095-... | 1.5 |
| spec/decisions/102-... | 1.1 |
| spec/decisions/100-... | 1.2 |
| spec/behaviors/25-inspection.md | 1.18 |
| spec/invariants.md | 1.86 |
| spec/overview.md | 1.77 (this plan, was 1.76) |
| spec/traceability.md | 1.130 |
| spec/README.md | 1.126 (this plan, was 1.125) |

The row's file list was checked against `git log --name-only --grep='(09-0'`; it already named every committed source, test, script and spec file, so nothing was added.

## `pnpm check:pr` result

Real outcome: **exit 1**, at step 13 of 16, `pnpm example`. Log: `/tmp/claude-1002/-home-yopu-Project-Perso-qadi/aba45836-036b-4004-bf13-84d23c53af0c/scratchpad/checkpr.log`.

| Step | Result |
| ---- | ------ |
| 1 typecheck, 2 lint + house-style (408 files clean, 3 declared switches), 3 circular (none), 4 tstyche | pass |
| 5 coverage: 157 files, 3994 tests; 99.08% statements, 96.78% branches, 99.08% functions, 99.54% lines; every per-package threshold held | pass |
| 6 BDD (559 tests), 7 spec:examples, 8 spec:verify:strict (21 PASS), 9 spec:gates, 10 spec:claims, 11 spec:api (863 exports), 12 spec:package (9 packages, 496 runtime exports) | pass |
| 13 `pnpm example`: typecheck, 42 unit tests and `next build` pass; then `playwright install --with-deps chromium` fails: `sudo: a terminal is required to read the password` | FAIL (environmental) |
| 14 spec:website-examples (40 blocks compile), 15 website (45 pages), 16 spec:publish (9 packages, version 0.11.0): not reached by the runner; run directly afterwards | pass |

The failing command is the example's `check` script (`... && playwright install --with-deps chromium && pnpm test:e2e`). `--with-deps` installs OS packages through sudo, which this non-interactive session cannot do. The Chromium build is already cached in `~/.cache/ms-playwright`, `npx playwright install chromium` reports it present, and `pnpm --filter @qadi/example-nextjs test:e2e` was then run directly: 30 passed. No gate script, budget or threshold was edited. The single command `pnpm check:pr` should be re-run once somewhere with root (CI, or a terminal where `sudo` can prompt) to confirm exit 0; nothing in this phase touches the example, so no code defect is expected.

`pnpm check:fast` (13 of 17 steps) was green before `check:pr`.

## Reserved numbers

ARCH-54, ADR-QD-116 and CCR-QD-393 were consumed as reserved, with no substitution. ADR-QD-115 was left unused: the record projection changes no documented contract (ADR-QD-100 already made `SinkEmit.ts` the one projection, and ADR-QD-105's record had been built beside it), so it takes the CCR row and an ADR-QD-100 amendment instead (D-07; the CCR row says so).

## Requirements

The `[x]` checkboxes for SINK-01..03 and XC-01..05 in `.planning/REQUIREMENTS.md` were already ticked before this plan. `requirements.mark-complete XC-01 XC-02 XC-03 XC-05` flipped nothing: all four returned `table_unmatched`, because the traceability table uses range rows (`SINK-01..03`, `XC-01..05`) the tool cannot match. I edited the `SINK-01..03` row by hand from Pending to Complete; the `XC-01..05` row ("All phases") was left Pending, as it spans phases not yet done and XC-01's single-command `check:pr` result is unconfirmed (see above).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `spec-revise.mjs` needs `--date`**
- **Found during:** Task 1
- **Issue:** the script fails with a usage error when `--date` is omitted (known from 09-03).
- **Fix:** passed `--date 2026-11-09` on both calls; the script was not changed.
- **Commit:** n/a

### Deferred / environmental

**2. `pnpm example` cannot complete under a non-interactive session** (see above). Not auto-fixable: `--with-deps` needs root, and the fix would be to edit the example's script or a gate, which the plan forbids. Remaining steps and the e2e were verified directly.

**Total deviations:** 1 auto-fixed (Rule 3), 1 environmental gate limitation reported. **Impact:** none on code or spec.

## Known Stubs

None.

## Threat Flags

None. T-09-10 (changeset scope claim): gate 13 and gate 14 both pass. T-09-11 (overview drift): gate 13 passes. T-09-12 (fail-closed regression): the whole suite, BDD and coverage pass, and no budget, threshold or gate script was changed.

## Self-Check: PASSED

- FOUND: .changeset/sink-record-projection.md, spec/overview.md (Rev 1.77), spec/README.md (Rev 1.126)
- FOUND commit: ca3a15c
- `pnpm spec:api`, `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict`: green
