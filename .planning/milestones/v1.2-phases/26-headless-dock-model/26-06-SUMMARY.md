---
phase: 26-headless-dock-model
plan: 06
subsystem: spec
tags: [adr-qd-047, dock-model, spec, traceability, changeset, mutation, check-pr]
requires:
  - phase: 26-headless-dock-model
    provides: "26-01..26-05: DockModel.test.ts, makeDockModel, the held-choice cell, the dock on useDockModel, the deduplicated dock test"
provides:
  - "ADR-QD-047 Rev 1.12: the dock is one model (CCR-QD-416)"
  - "BEH-QD-465 (the dock is one model) and BEH-QD-466 (a choice from a list has one shape); BEH-QD-322 and BEH-QD-389 corrected"
  - "INV-QD-296 (the dock's stores never disagree about the timeline); INV-QD-107's Source and Enforcement name DockModel and useDockModel"
  - "traceability rows, the CCR-QD-416 register row with its mutation comparison, two edited changesets and .changeset/dock-model.md"
  - "the phase gate: mutation not lower and pnpm check:pr green"
affects: []
actuals:
  tokens: 14000
  tasks: 3
  commits: 2
plan_head_before: b40269da38198137256aa82de16c685bb96e5854
plan_head_after: 295fa9afe0aaa555ef1818b85fd55fd60e43312f
commits: 2
tech-stack:
  added: []
  patterns:
    - "an amendment to an existing ADR (Rev 1.12) instead of a new one, with the reserved ADR number left unused and said so in the CCR row"
key-files:
  created:
    - .changeset/dock-model.md
  modified:
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/index.yaml
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/README.md
    - .changeset/simulation-session.md
key-decisions:
  - "ADR-QD-138 stays unused: the change amends ADR-QD-047 (same boundary as Rev 1.7 and Rev 1.10), recorded in the amendment and the CCR-QD-416 row"
  - "the plan's grep that useOwnedSimulationSession is absent from the whole of spec/overview.md is not satisfiable: the change-history line (:13, Phase 25's Rev 1.92 and now this plan's Rev 1.93) names it, and AGENTS.md section 15 exempts history; the export tables name it nowhere"
requirements-completed: [DMOD-01, DMOD-02, DMOD-03, DMOD-04, DMOD-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06]
coverage:
  - id: D1
    description: "ADR-QD-047 amendment (Rev 1.12), BEH-QD-465/466, INV-QD-296, INV-QD-107's sources, BEH-QD-322/389 corrected, traceability, overview, CCR-QD-416, changesets"
    requirement: WX-02
    verification:
      - kind: other
        ref: "node scripts/spec-revise.mjs --check; pnpm spec:examples (108 blocks); pnpm spec:verify:strict (PASS 21, FAIL 0); pnpm spec:claims; pnpm spec:api (906 exports)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mutation score of the five model files is not below 26-mutation-base.json; DockModel.ts has 0 NoCoverage and is at least 90"
    requirement: WX-05
    verification:
      - kind: other
        ref: "stryker.devtools.mjs over the five files, then the plan's compare script (exit 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The phase gate: pnpm check:pr exits 0 with no budget, threshold or gate script edited"
    requirement: WX-01
    verification:
      - kind: other
        ref: "pnpm check:pr: ran 16 of 17 steps (mutation skipped by design), exit 0; git diff --stat of check-house-style.mjs, vitest.config.ts and stryker.devtools.mjs against 7396491d is empty"
        status: pass
    human_judgment: false
duration: 8min
completed: 2026-11-11
status: complete
---

# Phase 26 Plan 06: Records and the phase gate Summary

**ADR-QD-047 is amended to Rev 1.12 ("the dock is one model"), BEH-QD-465/466 and INV-QD-296 exist with their traceability, CCR-QD-416 records the phase with ADR-QD-138 left unused, no model file's mutation score fell (DockModel.ts new at 100), and `pnpm check:pr` exits 0 over 16 of 17 steps.**

## Performance

- **Duration:** about 8 min of work (Stryker 2 min 22 s and `pnpm check:pr` ran in the background)
- **Started:** 2026-11-11T13:05Z
- **Completed:** 2026-11-11T13:12Z
- **Tasks:** 3 (2 commits; Task 3 is verification and writes nothing but this SUMMARY)
- **Files modified:** 10 (one created)

## Accomplishments

- **ADR-QD-047 Rev 1.12** gains the amendment `Amended 2026-11-11 (CCR-QD-416): the dock is one model`, after CCR-QD-415's. It states the gap (six stores, six layout effects, a 1,430-line dock test, with two named cases), `makeDockModel` owning the stores and pushing the rail, the one `configure`, the scope and the model's own source read (ADR-QD-137 cited, not restated), `useDockModel` as the one owned-model hook, the four deleted hooks (`useOwnedSimulationSession` unreleased), the shared held-choice cell and `PolicyChoice`/`ExplorerShown` carrying `HeldChoice`'s arms, and the accepted `Activity` behaviour. It says it extends the 2026-11-09 and 2026-11-10 amendments and reverses neither. The Status cell and `index.yaml` list it.
- **BEH-QD-465 / BEH-QD-466** added to `28-devtools-screens.md` (Rev 1.16). BEH-QD-389's note no longer names `useOwnedDockSession`. `29-devtools-simulator.md` (Rev 1.14): BEH-QD-322's paragraph names `Empty`, `Listed`, `Evicted`, `Seeded`; its fence never listed `PolicyChoice`, so nothing there to follow.
- **INV-QD-296** added (Rev 1.105). INV-QD-107's Source names `makeDockModel` (`DockModel.ts`) owned through `useDockModel`; its Enforcement adds `DockModel.test.ts` (M8, M9, M10, M11) and the Stryker list adds `DockModel.ts`.
- **Traceability** (Rev 1.150): behaviour 28's list and modules, an INV-QD-296 row, a `DockModel.test.ts` row, BEH-QD-466 on the three session test rows, BEH-QD-465 on the dock test row, the INV-QD-107 and ADR-QD-047 rows.
- **Overview** (Rev 1.93): the `HeldChoice` row was already there (26-03), the `useSimulationSession` row already rewritten (26-04); this plan added the revision entry only. `pnpm spec:api`: 906 exports documented.
- **CCR-QD-416** register row (`spec/README.md` Rev 1.152), with the mutation comparison and the numbers: used ARCH-74, CCR-QD-416, BEH-QD-465/466, INV-QD-296; unused ADR-QD-138, BEH-QD-467 to BEH-QD-469, INV-QD-297.
- **Changesets:** `simulation-session.md` now says `SimulationSnapshot.policy` is a `PolicyChoice` (its first three arms `HeldChoice`'s, exported as a type) and `ExplorerShown` carries the same; `.changeset/dock-model.md` is an `@qadi/devtools` patch. `simulator-session-only.md` needed no edit (26-04 had already removed the deleted hook from it).

## Mutation (WX-05)

`pnpm exec stryker run stryker.devtools.mjs --mutate <five files>`, then the plan's compare script (exit 0):

| File | Base | After | Killed | Survived | NoCoverage |
| ---- | ---- | ----- | ------ | -------- | ---------- |
| `SimulationSession.ts` | 96.94 | 97.45 | 344 | 9 | 0 |
| `ExplorerSession.ts` | 91.57 | 91.62 | 164 | 15 | 0 |
| `HeldChoice.ts` | 97.22 | 100.00 | 63 | 0 | 0 |
| `DockSession.ts` | 100.00 | 100.00 | 53 | 0 | 0 |
| `DockModel.ts` | new (needs 90, 0 NoCoverage) | 100.00 | 55 | 0 | 0 |

No survivor was added; none needed a new test or an ignore.

## WX-06 (RED first)

`git log --reverse --format='%h %s' 7396491d..HEAD`, the first lines:

```
4fbf56ec chore(26-01): record the phase base and the per-file mutation baseline
8785c80f test(26-01): RED — the dock's cross-store rules as model tests
1cb8a5eb docs(26-01): complete the dock model RED plan
403b0cef feat(26-02): makeDockModel owns the dock's six stores and pushes the rail itself
```

The RED test commit precedes every `feat`/`refactor` commit that touches `packages/devtools/src`.

## Requirement map

| Requirement | Satisfied by |
| ----------- | ------------ |
| DMOD-01 | `packages/devtools/src/model/DockModel.ts` (`makeDockModel`: scope, its own source `FiberHandle`, rail pushed by `push`/`spread`); `react/useDockModel.ts` (one `useScoped` scope, one `configure` layout effect, forks nothing); ADR-QD-047 Rev 1.12, BEH-QD-465, INV-QD-296 |
| DMOD-02 | `test/model/DockModel.test.ts` (M1 to M17, P1), written RED in 26-01, green in 26-02; the 13 DOM duplicates removed in 26-05 (`DevtoolsDock.test.tsx` 76 to 63 cases) |
| DMOD-03 | the four `useOwned*` hooks deleted (26-04); `Screen` takes `{ model, view, shown, host }` (was 18 props); layout effects in `src/react` 7 to 5 |
| DMOD-04 | `model/HeldChoice.ts` (`makeHeldChoice`, `heldValue`, `heldIndex`) embedded by `SimulationSession` and `ExplorerSession`, read by `RoleViewer`; `PolicyChoice` is `HeldChoice`'s arms or `Seeded` (26-03); BEH-QD-466 |
| DMOD-05 | AGENTS.md section 13 holds: no React state for decisions, no `outcomeOf` bypass (`pnpm lint:style` green, `DECISION_READ_BUDGET` unchanged); INV-QD-107 and ADR-QD-047's note that a hide/show rebuilds the model |
| WX-01 | `pnpm check:pr` exit 0, 16 of 17 steps |
| WX-02 | ADR-QD-047 Rev 1.12 (no new ADR, ADR-QD-138 unused), CCR-QD-416, BEH-QD-465/466, INV-QD-296, traceability; only reserved numbers used |
| WX-03 | `spec/overview.md` (`HeldChoice` row; `useOwnedSimulationSession` gone from the tables); `pnpm spec:api` 906 exports |
| WX-04 | no budgeted construct added; `git diff --stat 7396491d -- scripts/check-house-style.mjs vitest.config.ts stryker.devtools.mjs` is empty; `pnpm lint:style` green |
| WX-05 | the mutation table above; `pnpm coverage` (step 5 of `check:pr`) green |
| WX-06 | the RED-first log above |

Inventory totals: the dock test went from 76 to 63 DOM cases, and 13 rules are now headless (`DockModel.test.ts` and `DockSession.test.ts`); the devtools project is 46 files, 1222 tests.

## `pnpm check:pr`

Exit 0. `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).` Steps: typecheck, lint, circular, test:tstyche, coverage, test:bdd, spec:examples, spec:verify:strict (PASS 21, FAIL 0), spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website, spec:publish. `pnpm example` ran green (no Playwright install problem arose). Mutation is covered by the table above, run directly on the touched files.

## Task Commits

1. **Task 1: ADR-QD-047 amendment and the behaviours** - `b9330d5c` (docs)
2. **Task 2: invariants, traceability, overview, CCR row, changesets** - `295fa9af` (docs)
3. **Task 3: phase gate (mutation compare, config diff, `pnpm check:pr`)** - verification only, no code commit; recorded here

**Plan metadata:** the `docs(26-06): complete the records and phase gate plan` commit (this SUMMARY, STATE.md, ROADMAP.md).

## Decisions Made

- ADR-QD-138 is left unused; ADR-QD-047 is amended instead (see `key-decisions`).
- Older ADR-QD-047 amendments (CCR-QD-405, CCR-QD-415) and ADR-QD-137:81 still name `useOwnedDockSession` / `useOwnedSimulationSession`. They are change history written when those names were true, so they stay (AGENTS.md section 15); Rev 1.12's amendment states the hooks are deleted.

## Deviations from Plan

### Departures from the plan's wording

- **Task 2's verify greps `useOwnedSimulationSession` out of the whole of `spec/overview.md`.** The change-history line at `spec/overview.md:13` names it (Phase 25's Rev 1.92 entry, and this plan's Rev 1.93 entry), and history is exempt, as the orchestrator's note for this run said. Checked the part the check means: the export tables and both pending changesets name it nowhere. The other three checks in that `bash -c` (CCR-QD-416 row, INV-QD-296 heading, the patch line) pass, and every gate command before it (`spec-revise --check`, `spec:verify:strict`, `spec:claims`, `spec:api`) exits 0.
- **`.changeset/simulator-session-only.md` was not edited:** 26-04 already removed the deleted hook from it, as the orchestrator's note said.
- **`spec/overview.md`: only a revision entry was added.** The `HeldChoice` row (26-03) and the `useSimulationSession` row rewrite (26-04) were already in place and were not duplicated.
- **Mutation ran in the background while Task 1 was written.** The code was already final, so the order changes nothing.

### Auto-fixed Issues

None: no gate failed on a first run after its inputs were written (the one `spec:verify:strict` FAIL, "CCR register coverage", was the expected state between the INV/traceability edits and the CCR-QD-416 row, and cleared when the row landed).

**Total deviations:** 0 auto-fixed, 4 wording departures.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None: no code, endpoint or trust boundary changed in this plan (spec and changeset text only).

## Next Phase Readiness

Phase 26 is complete: every plan has a SUMMARY. The orchestrator marks DMOD-01..05 on phase completion (this plan did not tick checkboxes in `REQUIREMENTS.md`, as directed). `.planning/config.json`, `.planning/state.json` and the four `24-`/`25-REVIEW*.iter2.md` files were left unstaged.

## Self-Check: PASSED

- FOUND: `.changeset/dock-model.md`, `spec/decisions/047-a-headless-devtools-model.md` (Rev 1.12), `spec/behaviors/28-devtools-screens.md` (`## BEH-QD-465`, `## BEH-QD-466`), `spec/invariants.md` (`## INV-QD-296`), `spec/README.md` (`| CCR-QD-416 |`).
- FOUND: commits `b9330d5c` and `295fa9af` (ancestors of HEAD).
- `git rev-list --count b40269da..295fa9af` is 2, matching `commits: 2`.
