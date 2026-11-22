---
phase: QD-60-devtools-headless-interface-is-the-feeds
plan: 07
subsystem: spec
tags: [spec, records, adr, beh, inv, ccr, overview, traceability, hdls-01, hdls-04, wx-02, wx-03]
phase_base: 35a48554388da6c68940c1b94a1cc526b3111eae
requires: [60-06]
provides:
  - "ADR-QD-173 with dated amendments to ADR-QD-047 (1.19), ADR-QD-099 (1.2) and ADR-QD-169 (1.1)"
  - "BEH-QD-636..640 and INV-QD-365..366, with BEH-QD-323, 465, 506, 510 and 327 amended"
  - "spec/overview.md naming the feeds and dropping the runners; gate 13 (check-api-surface.mjs) green at 939"
  - "CCR-QD-451 after CCR-QD-450; ADR-QD-173, INV-QD-365 and INV-QD-366 traced"
affects: [60-08]
actuals:
  tokens: 30000
  tasks: 3
  commits: 3
plan_head_before: 88ea363b2c2234a5e111388400003cd89da97550
plan_head_after: 67d6b33559279fcc04ae989401da3a6dfdf1e145
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-60 Plan 07: The records of the change

**ADR-QD-173, BEH-QD-636..640, INV-QD-365..366, the overview's rows, the traceability rows and CCR-QD-451 record the headless-feeds change with exactly the reserved ids; gate 13 (`check-api-surface.mjs`) is green again at 939 exports, and every spec gate passes.**

## Commits

| Task | Commit | Subject | Files |
| ---- | ------ | ------- | ----- |
| 1 | `78d8cd35` | `docs(60-07): ADR-QD-173, the devtools headless interface is its feeds` | `spec/decisions/{173-the-devtools-headless-interface-is-its-feeds,047-a-headless-devtools-model,099-entry-points-are-a-closed-list,169-the-questions-panels-two-host-inputs-are-one-feed}.md`, `spec/decisions/index.yaml` |
| 2 | `5321838d` | `docs(60-07): BEH-QD-636..640 and INV-QD-365..366` | `spec/behaviors/28-devtools-screens.md`, `spec/behaviors/09-react.md`, `spec/invariants.md`, `spec/devtools-spec/02-screens.md` |
| 3 | `67d6b335` | `docs(60-07): CCR-QD-451, the overview and the traceability of ARCH-107` | `spec/overview.md`, `spec/traceability.md`, `spec/README.md` |

`commits: 3` is measured from the ledger (`88ea363b..67d6b335`). The SUMMARY commit is separate. Revisions: ADR-047 1.19, ADR-099 1.2, ADR-169 1.1, ADR-173 1.0, spec 28 1.33, `09-react.md` 3.10, `invariants.md` 1.159, `devtools-spec/02-screens.md` 0.21 (draft), overview 1.127, traceability 1.222, README 1.254.

## Gate 13 count

`node scripts/check-api-surface.mjs` prints `api-surface: 939 export(s) documented across 9 package(s)`: 933 at `phase_base` plus 13 new devtools names minus 7 gone, as the plan expected. It was red from 60-03 (20 drifts: 13 missing, 7 stale) and closes here.

## Verifies (all exit 0)

```
Task 1  ADR-QD-173 and three amendments; spec-revise --check green; ADR commit clean
Task 2  five BEH, two INV, four Revisions; spec-revise, doc examples and gate 12 green; BEH/INV commit clean
Task 3  api-surface: 939 export(s) documented across 9 package(s); every spec gate green;
        CCR-QD-451 after CCR-QD-450; every reserved id used, no other new id
Final   spec-revise: every Revision matches its newest Change History entry
        dod-table: 25 step(s) match pnpm check, 150 reference(s) resolve        (gate 11, check-dod-table.mjs)
        check-devtools-claims.mjs green                                          (gate 12)
        verify-traceability.sh --strict: PASS: 21  FAIL: 0  SKIP: 0
        doc-examples: 117 block(s) compile
        website-doc-examples: 70 block(s) compile
```

Each `<automated>` command was extracted from the plan to a script and run as written.

## Deviations from Plan

**1. [Rule 9 - Plan error] `spec-revise.mjs <doc> "<what>"` without `--date` prints its usage and bumps nothing**
- **Found during:** Task 1, step 3.
- **Issue:** the script builds `positional` with `index !== dateFlag + 1`, and with no `--date` flag `dateFlag` is `-1`, so index 0 (the document) is dropped. The plan's commands omit `--date`.
- **Fix:** every bump was run with `--date 2026-11-19`; the script itself is untouched (out of scope). Each document is bumped exactly once, and `--check` is green.

**2. [Rule 9 - Plan note] Two anchors in new text corrected before commit**
- BEH-QD-638 first linked BEH-QD-616 and BEH-QD-618 by invented anchors and INV-QD-365 linked INV-QD-313 by one; all three were rewritten to the real headings' anchors before the BEH/INV commit, and `verify-traceability.sh` confirms every link resolves. No effect on a gate.

**3. [Scope reading] Spec 28's current-text leftovers were updated in place**
- BEH-QD-323's `ts` listing (`runDiagnostics`/`makeDiagnosticsStore` replaced by `makeDiagnosticsFeed` and `DiagnosticsOptions`), `useDiagnostics`'s signature (`:663`), BEH-QD-465's and BEH-QD-510's listings and BEH-QD-506's "package-private" note now read the new names, each under a dated "Amended 2026-11-19" note. Change History entries and earlier dated notes are untouched. `noDiagnostics` still appears in two requirements as the idle reading's internal name (BEH-QD-507 and BEH-QD-508); it is package-private, not an export, so it needed no change.

## Deviations recorded in CCR-QD-451 (from earlier plans)

- **D-12:** `QuestionsPanel.feed.characterisation.test.tsx` took a type-name edit of exactly lines 26 and 66; `git diff 35a48554 HEAD` on that file is `2 insertions(+), 2 deletions(-)`, the two lines only.
- **60-02:** the React re-exports `surface.tst.ts` could not state twice are aliased there (`ReactDiagnosticsOptions` and the like; TS2300).
- **60-03:** two positive `toBeCallableWith` pins on Effect-returning functions changed form (`5d297faf`), because the Effect language service can never let them pass.
- **60-05:** the mutation comparison's history clause was widened to admit `test(60-03)`.
- D-16's removed guard and the mutation floor (`DiagnosticsFeed.ts` 0.9540 to 0.9863) are in the same row.

## Known gates (expected red)

- `pnpm check:pr` was not run in this plan (60-08 runs it alone). Nothing this plan knows of keeps it red.

## Next plan must know

- The reservation is fully used: ARCH-107, ADR-QD-173, CCR-QD-451, BEH-QD-636..640, INV-QD-365..366, and `Unused: none` is in the CCR row. 60-08's id scan should find exactly those and no other new id outside `.planning/`.
- The changed spec files and their Revisions are listed above; `spec-revise.mjs` needs `--date` when run by hand (Deviation 1).
- HDLS-01..04 are still unmarked in `.planning/REQUIREMENTS.md`; only 60-08 marks them (rule 8).
- `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/` and the `*.iter*.md` files remain untouched and unstaged.

## Known Stubs

None.

## Self-Check: PASSED

Commits `78d8cd35`, `5321838d` and `67d6b335` are ancestors of `HEAD`; each holds exactly the files its verify names, with the trailer last; ADR-QD-173 exists; gate 13 prints 939; every spec gate above exits 0.
