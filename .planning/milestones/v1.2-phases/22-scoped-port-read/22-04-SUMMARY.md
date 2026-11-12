---
phase: 22-scoped-port-read
plan: 04
subsystem: spec
tags: [adr, behaviors, invariants, traceability, api-surface, changeset, stryker, merge-gate]

requires:
  - phase: 22-scoped-port-read
    provides: "22-01 recorded answers (D-02 = A, D-05 = state once); 22-02 RED tests and the mutation baseline; 22-03 the code (asks, readScoped, LeafRequests, ReadSite, LeafOf)"
provides:
  - "ADR-QD-134 (quotes both human answers and the standing instruction) and CCR-QD-412"
  - "ADR-QD-077/094/109/114 amended; BEH-QD-227/331 amended; BEH-QD-445, BEH-QD-446, INV-QD-288, INV-QD-289 new, all traced"
  - "spec/overview.md names LeafRequests, ReadSite, LeafOf and AskedOf (gate 13 green)"
  - "AGENTS.md section 3 and 5, the upgrading note and both pending changesets match the code"
  - "pnpm check:pr green; per-file mutation at or above the phase base"
affects: [23]

plan_head_before: 9c2e6204af7ccc119716ed0a3f80a03f87e23d41
plan_head_after: 1ec992527d323e260955067a10936857414115ac

actuals:
  tokens: 78900
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A discriminated `{ ok } | { ok: false }` whose false arm carries nothing is an equivalent-mutant factory under Stryker; `{ value } | undefined` is the same fact with nothing to mutate to an equal program"

key-files:
  created:
    - spec/decisions/134-a-resource-scoped-port-read-is-one-read.md
    - .planning/phases/22-scoped-port-read/22-mutation-after.json
  modified:
    - spec/decisions/077-both-interpreters-read-ports-through-one-module.md
    - spec/decisions/094-a-port-is-described-once.md
    - spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md
    - spec/decisions/114-a-port-states-what-it-serves.md
    - spec/decisions/index.yaml
    - spec/behaviors/30-port-calls.md
    - spec/behaviors/34-remote-ports.md
    - spec/behaviors/06-services.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/README.md
    - AGENTS.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - .changeset/port-serving.md
    - .changeset/one-port-read.md
    - packages/core/src/Predicate.ts
    - packages/core/test/Evaluate.test.ts

key-decisions:
  - "ADR-QD-134 records D-02 = A and D-05 = state once, each quoted from _DECISIONS-v1.2.md, with the standing instruction verbatim and the override stated as the human's"
  - "overview.md names LeafOf and AskedOf as well as the plan's LeafRequests and ReadSite, because gate 13 requires every export named"
  - "Predicate.ts's Folded became { value } | undefined to remove its one equivalent mutant, so the file's score is not held below its base by code the phase deleted"

requirements-completed: [SCOPE-02, SCOPE-04, SCOPE-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06]

coverage:
  - id: D1
    description: "ADR-QD-134 exists, quotes D-02, D-05 and the standing instruction, is indexed, and four ADRs carry CCR-QD-412 amendments"
    requirement: "SCOPE-04"
    verification:
      - kind: other
        ref: "Task 1 verify 1 (grep of QADI-ADR-134, 'cleanest solution, not the simplest one', index.yaml, CCR-QD-412 in 077/094/109/114)"
        status: pass
    human_judgment: false
  - id: D2
    description: "BEH-QD-445, BEH-QD-446, INV-QD-288, INV-QD-289 exist and are traced; BEH-QD-227/331 amended; overview names the new public types"
    requirement: "SCOPE-05"
    verification:
      - kind: other
        ref: "pnpm spec:verify:strict (21 PASS), pnpm spec:examples, pnpm spec:api (900 exports documented), node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D3
    description: "CCR-QD-412 row, AGENTS.md section 3 and 5, upgrading note and both pending changesets match the code"
    requirement: "WX-02"
    verification:
      - kind: other
        ref: "Task 2 verify 1 and 2 (CCR row count 1; readScoped, askActed, asks, requireScopedResourceId, LeafRequests present; askActedForResource absent from AGENTS.md)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No touched file's Stryker score is below 22-mutation-base.json"
    requirement: "WX-05"
    verification:
      - kind: other
        ref: "stryker run stryker.config.mjs over the nine files; plan's per-file comparison exits 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "The merge gate, minus the release-only mutation step, passes with no budget, threshold or gate script edited"
    requirement: "WX-01"
    verification:
      - kind: other
        ref: "pnpm check:pr (16 of 17 steps, exit 0); git diff 7f64db9a -- scripts vitest.config.ts packages/*/vitest.config.ts stryker.config.mjs .oxlintrc.json is empty"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-11-11
status: complete
---

# Phase 22 Plan 04: Records, mutation comparison and the merge gate Summary

**ADR-QD-134 records the one scoped read and the human's D-05 override in their own words, the behaviour, invariant, traceability and export-table entries follow, and `pnpm check:pr` exits 0 with every touched file's mutation score at or above the phase base.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-11-11T03:00:59Z
- **Completed:** 2026-11-11T03:18Z
- **Tasks:** 3 (3 commits)
- **Files modified:** 20 (2 created, 18 modified); no gate script, budget or threshold touched

## `pnpm check:pr` result

**Exit 0**, 16 of 17 steps (`pnpm mutation` is skipped by design in `check:pr`; the nine core files were mutated by hand, below). Steps: typecheck, lint, circular, test:tstyche, coverage (173 files, 4499 tests; statements 99.46%, branches 97.67%), test:bdd (34 files, 568 tests), spec:examples (108 blocks), spec:verify:strict (21 PASS, 0 FAIL), spec:gates, spec:claims, spec:api (900 exports), spec:package, example (7 tests), spec:website-examples, website (45 pages), spec:publish. `pnpm check:fast` was run first and also passed after one fix (see Deviations 2).

## Per-file mutation comparison (WX-05)

Killed+Timeout over Killed+Timeout+Survived+NoCoverage, `22-mutation-base.json` against `22-mutation-after.json` (the plan's `--mutate` list, 22-02 Task 1):

| File | Base | After |
| ---- | ---- | ----- |
| PortAccess.ts | 0.9759 | 1.0000 |
| Walk.ts | 0.9431 | 0.9508 |
| Predicate.ts | 0.9968 | 1.0000 |
| PortRemote.ts | 0.8242 | 0.8365 |
| SignatureHistory.ts | 0.9600 | 0.9605 |
| CustomPredicate.ts | 0.9444 | 0.9459 |
| AttributeResolver.ts | 1 | 1 |
| RelationshipResolver.ts | 1 | 1 |
| DecisionHistory.ts | 1 | 1 |

Overall run score 96.13 (base 95.70). The first run, right after 22-03's code, left two files just under their base (Walk.ts 0.9415, Predicate.ts 0.9966); see Deviations 1.

## Reserved numbers

- **Used:** ADR-QD-134, CCR-QD-412, BEH-QD-445, BEH-QD-446, INV-QD-288, INV-QD-289.
- **Unused:** BEH-QD-447..449. Re-checked by grep before writing; no hit outside the register's own "Unused" text. `next-id.mjs` was not run.

## Accomplishments

- ADR-QD-134: Context (the three copies with file and line, the trace difference, the leaf mapping stated twice, the latent transposition), Decision (D-02 = A and D-05 = state once quoted verbatim with the standing instruction, the override named as the human's; D-01, D-03, D-04 and the D-05 design: `asks`, `ReadSite`, `LeafRequests`, the facet without `leaves`, `declare({ names, asked })`, `SERVING_SITE` and why one site suffices), the rejected site-free split and its cost, Consequences.
- Four dated CCR-QD-412 amendments (077: reads take their leaf and `readScoped` owns the check; 094: a description states `asks`; 109: the accepted duplicate early annotation is retired; 114: `leaves` leaves the facet, `servingFor` derives through `asks` and `asked`, the `"own-records"` pseudo-name is gone).
- BEH-QD-227 and BEH-QD-331 amended; BEH-QD-445 (a missing resource id leaves the port's span and nothing else, on every scoped port) and BEH-QD-446 (a leaf's request is stated once; `servingFor` serves exactly what those requests ask) new; the `PortDescription` listing and `makePortDescription`'s signature in 06-services show `asks` and the new type parameters.
- INV-QD-288 and INV-QD-289 new; INV-QD-095 reworded where it said the facet states which leaves ask a port; traceability rows for the two BEH, two INV and ADR-QD-134, the BEH-QD-227/331 and ADR-077/094/109/114 rows updated, `PortAccess.tst.ts` and `PortAsks.tst.ts` rows added.
- `spec/overview.md`: the `PortServingFacet`, `ServedLeaves` row is now `PortServingFacet`; `LeafRequests`, `ReadSite`, `LeafOf`; `AskedOf` is named beside `ArgsOf`; the `PortDescription` row names `P`, `asks` and `Asks`.
- CCR-QD-412 in `spec/README.md` names every changed file, the human's override in their words, the RED commits (`aa595231`, `78a14584`, `e7c8d96c`), GREEN (`7d8bd021`), the mutation numbers and the unused numbers.
- AGENTS.md section 3 (a description states `asks`) and section 5 (`askActed` replaces the two acted reads; the `requireScopedResourceId` sentence now says the check is `readScoped`, which opens no span); the UNTRACED and SWITCH tables untouched.
- Website upgrading note and both pending changesets amended in place (`port-serving.md`: facet without `leaves`, `asks` and its type parameters **Breaking** for a hand-built description because `PortDescription` shipped in 0.10.0, `ServedLeaves` replaced by `LeafRequests`, `ReadSite`, `LeafOf` and `AskedOf` new; `one-port-read.md`: the missing-id trace). No entry for `@qadi/http` or `@qadi/devtools`; both files were still pending, so no new changeset.

## Task Commits

1. **Task 1: ADR-QD-134, the four amendments, BEH/INV entries, traceability, overview** - `53d35b71` (docs)
2. **Task 2: CCR-QD-412, AGENTS.md section 3 and 5, upgrading note, changesets** - `5b5a3369` (docs)
3. **Task 3: mutation fallout and the merge gate** - `1ec99252` (test)

**Plan metadata:** the STATE/ROADMAP/REQUIREMENTS close-out commit follows this SUMMARY.

## Deviations from Plan

**1. [Rule 1 - Bug] Two touched files fell just under their mutation base after 22-03**
- **Found during:** Task 3
- **Issue:** `Walk.ts` 0.9415 (base 0.9431) and `Predicate.ts` 0.9966 (base 0.9968). The code 22-03 removed had been killing mutants while the survivors stayed, so the ratios dropped; the plan forbids a score below the base.
- **Fix:** Two Evaluate tests (a `HasSignature` denial that requires a signer role asserts the full reason and the trace tag; a `HasCustom` denial asserts its trace tag) killed four pre-existing `Walk.ts` survivors. `Predicate.ts`'s one survivor was an equivalent mutant (`ResourceRef: () => ({ ok: false })` to `{}`, read only through `other.ok ? … : undefined`), which no test can kill, so `Folded` became `{ value: unknown } | undefined`, same behaviour, nothing left to mutate to an equal program.
- **Files modified:** packages/core/test/Evaluate.test.ts, packages/core/src/Predicate.ts
- **Verification:** the plan's per-file comparison exits 0; `Predicate.test.ts` and `Evaluate.test.ts` pass; `pnpm check:pr` green.
- **Commit:** `1ec99252`

**2. [Rule 3 - Blocking] ADR-QD-134 named "gate 13" without its command**
- **Found during:** Task 3 (`pnpm check:fast`, `node scripts/check-dod-table.mjs`)
- **Fix:** the sentence now reads "gate 13, `node scripts/check-api-surface.mjs`", as AGENTS.md section 15 requires.
- **Commit:** `1ec99252`

**3. [Rule 3 - Blocking] `AskedOf` is also a new public export**
- **Found during:** Task 1 (`pnpm spec:api`: "`AskedOf` is exported by @qadi/core and is not named")
- **Fix:** named it beside `ArgsOf` in `spec/overview.md`; the plan and 22-03's SUMMARY listed only `LeafRequests`, `ReadSite`, `LeafOf`. The changeset names it too.
- **Commit:** `53d35b71`

**4. Plan verify not literally satisfiable.** Task 1's second check requires `! grep -qF ServedLeaves spec/overview.md`; the file still contains it once, in a historical Change History entry (ARCH-53) that records what that revision said and is exempt from rewriting. Every table row and the current revision entry are clean, and the check's other conjuncts and `pnpm spec:api` pass.

**5. Plan wording not recoverable.** The plan asks ADR-QD-134's rejected section to state D-02's options B and C "as the old checkpoint stated them". That checkpoint text is in neither `22-CONTEXT.md` nor the git history of the plans, so the ADR describes the two rejected shapes from the tree (the nested helper span on every scoped port; the three traces left as they were) without claiming to quote the checkpoint. No decision was affected: D-02 = A is quoted verbatim.

**6. INV-QD-095 reworded** (not in the plan's file list, but in `spec/invariants.md`, which is): it said the serving facet states "the leaves that ask the port", which `asks` now does.

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking), 3 notes. No scope change.

## REQUIREMENTS.md

Checked, not edited. Its checkboxes for SCOPE-01..05 and WX-01..06 are already `[x]` (22-03 and phase 21 marked them). The v1.2 traceability table maps `SCOPE-01..05` to Phase 22 and `WX-01..06` to "All v1.2 phases", which is correct; its Status column reads `Pending` for every row, Phase 21's included after it closed, so it is updated at phase close and not per plan. The `write_set_complete: false` 22-03 reported is the SDK not finding one row per ID in a table that groups IDs by phase; nothing is out of step and no row was invented.

## Known Stubs

None

## Threat Flags

None. T-22-13 (an unrecorded public change) is mitigated by BEH-QD-227/445/446, the export table and the changesets; T-22-14 by the verbatim quotes in ADR-QD-134 (verify greps the standing instruction); T-22-15 by `pnpm check:pr` and the unedited gate scripts.

## Issues Encountered

- A first Stryker run was started behind a `git check-ignore` guard that returned non-zero, so nothing ran and the report read was the 22-02 baseline; noticed from the report's timestamp and re-run properly.
- `pnpm check:pr` took about 11 minutes; run in the background, redirected to a log in the session scratchpad.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 22 has four SUMMARYs and is ready for verification. Phase 23 starts from a tree where the port description states `asks`, `readScoped` is the one scoped read and `spec/overview.md` is current.

## Self-Check: PASSED

- FOUND: spec/decisions/134-a-resource-scoped-port-read-is-one-read.md, .planning/phases/22-scoped-port-read/22-mutation-after.json
- FOUND commits: 53d35b71, 5b5a3369, 1ec99252 (ancestors of HEAD)

---
*Phase: 22-scoped-port-read*
*Completed: 2026-11-11*
