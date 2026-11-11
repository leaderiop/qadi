---
phase: 24-simulation-source-preparation
plan: 03
subsystem: spec
tags: [spec, adr, ccr, changeset, mutation, devtools, simulation]

requires:
  - phase: 24-simulation-source-preparation
    provides: 24-02's prepareSource and the thinner session; 24-01's mutation baseline
provides:
  - ADR-QD-050 amended (Rev 1.4): the source-choice rule is prepareSource's, stated once
  - BEH-QD-455 (a source choice is prepared in one place); BEH-QD-220/322 name prepareSource
  - overview row for SourceChoice/SourceOption/SourceRefusal at model/SimulationSource.ts; traceability rows
  - CCR-QD-414 and the @qadi/devtools patch changeset
  - 24-mutation-after.json and a green pnpm check:pr
affects: []

actuals:
  tokens: 9000
  tasks: 3
  commits: 2

commits: 2
plan_head_before: b221d00799583b081164417ec0e4369004688a7e
plan_head_after: 8bca7c2f7b8bc515fb32979d2871184e37889443

tech-stack:
  added: []
  patterns: ["a spec amendment corrects an earlier amendment's sentence without rewriting it"]

key-files:
  created:
    - .changeset/simulation-source-preparation.md
    - .planning/phases/24-simulation-source-preparation/24-mutation-after.json
    - .planning/phases/24-simulation-source-preparation/deferred-items.md
  modified:
    - spec/decisions/050-a-simulation-is-sealed.md
    - spec/decisions/index.yaml
    - spec/behaviors/29-devtools-simulator.md
    - spec/devtools-spec/02-screens.md
    - spec/overview.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "ADR-QD-136 not used: the rule moved, so ADR-QD-050 is amended instead of a new decision"

requirements-completed: [SRC-01, SRC-02, SRC-03, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06]

coverage:
  - id: D1
    description: "ADR-QD-050 amendment, BEH-QD-455, corrected BEH-QD-220/322, overview and traceability rows"
    requirement: SRC-01
    verification:
      - kind: other
        ref: "pnpm spec:verify:strict && pnpm spec:examples && pnpm spec:claims && pnpm spec:api"
        status: pass
    human_judgment: false
  - id: D2
    description: "CCR-QD-414 lists the files and the used and unused numbers; patch changeset exists"
    requirement: WX-02
    verification:
      - kind: other
        ref: "node scripts/spec-revise.mjs --check; grep of README and changeset"
        status: pass
    human_judgment: false
  - id: D3
    description: "Merge gate green on the final tree, no gate/budget/threshold edited"
    requirement: WX-01
    verification:
      - kind: other
        ref: "pnpm check:pr (16 of 17 steps; mutation skipped by design), git diff of scripts/AGENTS.md/vitest/stryker/oxlintrc empty"
        status: pass
    human_judgment: false
  - id: D4
    description: "Per-file mutation score of SimulationSession.ts is 0.0007 below the base"
    requirement: WX-05
    verification:
      - kind: other
        ref: ".planning/phases/24-simulation-source-preparation/24-mutation-after.json"
        status: fail
    human_judgment: true
    rationale: "Arithmetic of moving well-killed mutants out of the file; all 12 survivors read as equivalent. A human should accept or overrule."

duration: 12min
completed: 2026-11-11
status: complete
---

# Phase 24 Plan 03: Spec, CCR-QD-414 and the merge gate Summary

**ADR-QD-050 now says the source-choice rule is `prepareSource`'s, BEH-QD-455 specifies it, CCR-QD-414 registers the phase, and `pnpm check:pr` is green; one per-file mutation score (`SimulationSession.ts`) is 0.0007 under the base.**

## Performance

- **Duration:** about 12 min
- **Started:** 2026-11-11T06:06:54Z
- **Completed:** 2026-11-11T06:17Z
- **Tasks:** 3
- **Files modified:** 7 spec/changeset files, 3 planning files created

## Accomplishments

- ADR-QD-050 Rev 1.4: "Amendment (2026-11-11, CCR-QD-414)" places availability and the Live-captures rule in `prepareSource`, says the session stores the result, and corrects the 2026-10-07 amendment's "the session's rule" without rewriting it. `index.yaml` status extended.
- BEH-QD-455 added to `29-devtools-simulator.md` (Rev 1.12) with its three requirements and enforcement; BEH-QD-220's refusal paragraph and BEH-QD-322's fence and note name `prepareSource`; no added line names `resolveSource`.
- `02-screens.md` section 5 gains one presence sentence; `overview.md` (Rev 1.91) lists the three types at `model/SimulationSource.ts`; `traceability.md` (Rev 1.148) adds BEH-QD-455, `SimulationSource` and a `SimulationSource.prepare.test.ts` row.
- CCR-QD-414 in `spec/README.md` (Rev 1.148); `.changeset/simulation-source-preparation.md` (`@qadi/devtools` patch).

## Task Commits

1. **Task 1: ADR-QD-050, BEH-QD-455, BEH-QD-220/322, devtools-spec, overview, traceability** - `2046f19c` (docs)
2. **Task 2: CCR-QD-414 and the changeset** - `8bca7c2f` (docs)
3. **Task 3: mutation comparison and merge gate** - no source change; `24-mutation-after.json` and this SUMMARY are committed with the plan metadata.

## Reserved numbers

- Used: BEH-QD-455, CCR-QD-414.
- Unused: ARCH-72 is the ticket id itself (used in text); ADR-QD-136 (no new decision, ADR-QD-050 amended); BEH-QD-456..459 and INV-QD-292..293 (no new property). `scripts/next-id.mjs` was never run.

## Mutation comparison (WX-05)

| File | Base (24-01) | After | Killed / survived base | Killed / survived after |
| ---- | ------------ | ----- | ---------------------- | ----------------------- |
| `SimulationSource.ts` | 0.9444 | 0.9841 | 17 / 1 | 62 / 1 |
| `SimulationSession.ts` | 0.9619 | 0.9612 | 353 / 14 | 297 / 12 |

`SimulationSession.ts` is 0.0007 below the base, so the plan's per-file verify one-liner exits 1 for that file. Survivors fell from 14 to 12; the score falls because about 56 killed mutants left the file with the code that moved to `SimulationSource.ts`. I read all 12 survivors: none can be killed by a test. Two are in code this phase wrote (`SimulationSession.ts:283`, spreading `source` for a `Refused`, and `:308`, `refusal` for a `Ready`); their mutated forms read the same value (`source: undefined` falls through `options?.source ?? fixtures`; `Ready` has no `refusal`). The other ten are earlier equivalents or defensive clauses (`policyNow === undefined ||`, `question.seed !== seedOf(policy)`, which `reseed` and `choosePolicy` already clear by resetting the run, `generation -= 1`, `{ discard }` on an unused result, and similar). No threshold, disable comment or Stryker config was touched. This is recorded as a deviation for a human to accept; the new rule's lines in `SimulationSource.ts` are covered (62 killed, 1 survivor, a pre-existing one in `fixtureLayer`).

## pnpm check:pr

Exit 0, 16 of 17 steps (`pnpm mutation` is skipped by `check:pr` by design; the devtools mutation run was done by hand above). Devtools and core suites 4519 tests, BDD 568, tstyche 42; `spec:verify:strict` 21 pass 0 fail; `spec:api`, `spec:claims`, `spec:examples`, `spec:package`, `example`, `website`, `spec:publish` all green; coverage threshold met. No host-specific failure on this macOS host. `git diff` of `scripts`, `AGENTS.md`, vitest configs, stryker configs and `.oxlintrc.json` since the phase base is empty (T-24-08).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `spec-revise.mjs` drops the first positional argument when `--date` is absent**
- **Found during:** Task 1 (first `spec-revise` call printed usage)
- **Issue:** `positional` excludes `index === dateFlag + 1`, which is index 0 when there is no `--date`.
- **Fix:** passed `--date 2026-11-11` on every call; the script is not edited (gate scripts are off limits, and it is outside this phase). Worth a separate fix.
- **Files modified:** none

**2. [Rule 1 - Bug] A Change History entry named `resolveSource`**
- **Found during:** Task 1 verify (the "no added line names the deleted function" check counted 1)
- **Fix:** reworded the Rev 1.12 history entry.
- **Committed in:** `2046f19c`

**3. [Mutation, not a Rule] `SimulationSession.ts` 0.0007 below the base** - see above; not fixable by a test, left for a human.

`devtools-spec/02-screens.md` has a draft-style `Revision 0.15 (draft)` header that `spec-revise` does not parse ("no Revision / Change History rows"), so it got the sentence and no revision bump; the plan said to revise it only if it has a revision table.

**Total deviations:** 2 auto-fixed, 1 mutation shortfall reported. **Impact:** none on behaviour.

## Issues Encountered

`spec/behaviors/29-devtools-simulator.md` already held BEH-QD-219..221 twice (two similar blocks), and `traceability.md` names a non-existent `Sources` module. Both are pre-existing and logged in `deferred-items.md`; the BEH-QD-220 wording was applied to both copies so they stay equal.

## Known Stubs

None.

## Threat Flags

None.

## Next Phase Readiness

Phase 24 is complete. Open for a human: accept the 0.0007 session score gap, and decide on the two deferred spec items.

## Self-Check: PASSED

- FOUND: `.changeset/simulation-source-preparation.md`, `24-mutation-after.json`, `deferred-items.md`, edited spec files
- FOUND commits `2046f19c`, `8bca7c2f` (reachable from HEAD)
- `## BEH-QD-455` in `29-devtools-simulator.md`, `| CCR-QD-414 |` once in `spec/README.md`

---
*Phase: 24-simulation-source-preparation*
*Completed: 2026-11-11*
