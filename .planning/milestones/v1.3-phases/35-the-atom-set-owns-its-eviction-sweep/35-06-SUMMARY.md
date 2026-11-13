---
phase: 35-the-atom-set-owns-its-eviction-sweep
plan: 06
subsystem: spec
tags: [spec, adr, behaviours, invariants, traceability, agents-md]
phase_base: 14dc8212d591d04291e002d08780dc9f75ce549a
plan_head_before: f9ac60bce25e12eec3c25b9b04ece4c602246ba7
plan_head_after: c06215ff919266bc6d190e0a548a03cac0436069

requires:
  - phase: 35-the-atom-set-owns-its-eviction-sweep
    provides: the mechanism (35-04), the removals and Breaking records (35-05), 35-SPIKE.md conclusion candidate-1
provides:
  - ADR-QD-148 and the amendments to ADR-QD-014 and ADR-QD-103
  - BEH-QD-511..515, INV-QD-315..316, BEH-QD-065 / BEH-QD-198 / INV-QD-105 restated
  - traceability rows, CCR-QD-426, AGENTS.md section 13 sentence, house-rules-evidence section 4 addendum
affects: [35-07]

actuals:
  tokens: 14000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "amend, never rewrite: a header Amended line (ADR-QD-014), a dated Amendment section plus revise (ADR-QD-103), an addendum before the next section (house-rules-evidence)"

key-files:
  created:
    - spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/014-react-via-atoms.md
    - spec/decisions/103-a-question-is-opened-once.md
    - spec/behaviors/09-react.md
    - spec/behaviors/25-inspection.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - AGENTS.md
    - spec/process/house-rules-evidence.md

key-decisions:
  - "BEH-QD-514 states the removed manual sweep as 'no member a caller can use to run a sweep' rather than naming sweepEvictions, because the plan's own verify forbids the name in 09 outside Change History"

requirements-completed: [SWEEP-05, WX-02, WX-03]

coverage:
  - id: D1
    description: "ADR-QD-148 exists in ADR-QD-146's shape, cites the spike per candidate, and has an index entry; ADR-QD-014 and ADR-QD-103 are amended"
    requirement: WX-02
    verification:
      - kind: other
        ref: "Task 1 verify script (VERIFY1_OK) and node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "BEH-QD-511..515 and INV-QD-315..316 appended in id order; BEH-QD-065, BEH-QD-198, INV-QD-105 restated without sweepEvictions"
    requirement: WX-02
    verification:
      - kind: other
        ref: "Task 2 verify script and pnpm spec:examples (112 blocks compile)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Traceability, CCR-QD-426 and spec:verify:strict agree; AGENTS.md changes exactly one line; the evidence addendum rewrites no history"
    requirement: SWEEP-05
    verification:
      - kind: other
        ref: "Task 3 verify script (V3_OK); pnpm spec:verify:strict (PASS 21, FAIL 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "overview.md and the website name neither removed knob; gate 13 passes with no table edit"
    requirement: WX-03
    verification:
      - kind: other
        ref: "pnpm spec:api (916 exports documented across 9 packages)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-11-12
status: complete
---

# Phase 35 Plan 06: The Records for the Atom Set's Own Sweep Summary

**ADR-QD-148, BEH-QD-511..515, INV-QD-315..316, traceability, CCR-QD-426, the approved AGENTS.md section 13 sentence and a house-rules-evidence addendum record the atom set's own deferred sweep, using only the reserved numbers, with every spec gate green.**

## Spike winner honoured

`35-SPIKE.md` named candidate 1 (admission trigger kept, `entry.inBook` release guard kept, no cold-count guard). The plan's text is written for candidate 1, so the Decision and Alternatives sections follow it unchanged. No deviation.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `87a5689f` | docs(35-06): ADR-QD-148, the atom set owns its eviction sweep |
| 2 | `45364cce` | docs(35-06): BEH-QD-511..515 and INV-QD-315..316, the atom set's own sweep |
| 3 | `c06215ff` | docs(35-06): CCR-QD-426, traceability, and AGENTS.md §13 for the atom set's own sweep |

`commits: 3`, measured from `plan_head_before` to `plan_head_after`. Every message ends with the `Co-Authored-By: Claude Opus 5.5` trailer. `.planning/config.json` and `.planning/state.json` were never staged.

## Revisions (old to new)

| File | Old | New |
|------|-----|-----|
| `spec/decisions/103-a-question-is-opened-once.md` | 1.1 | 1.2 |
| `spec/behaviors/09-react.md` | 3.5 | 3.6 |
| `spec/behaviors/25-inspection.md` | 1.23 | 1.24 |
| `spec/invariants.md` | 1.113 | 1.114 |
| `spec/traceability.md` | 1.158 | 1.159 |
| `spec/README.md` | 1.162 | 1.163 |
| `spec/process/house-rules-evidence.md` | 1.0 | 1.1 |
| `spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md` | new | 1.0 |
| `spec/decisions/014-react-via-atoms.md` | no Document Control | `> **Amended:**` line added |
| `spec/overview.md` | 1.99 | unchanged |

## New headings

- `## BEH-QD-511: An atom set holds its own bound, wherever it runs` (doc 25, after BEH-QD-200, with a compiled `typescript` fence on a bare `AtomRegistry`)
- `## BEH-QD-512: One atom set has one sweeper`
- `## BEH-QD-513: A sweep runs after the pressure, never inside the call that caused it`
- `## BEH-QD-514: The provider forks no sweep, and there is no manual sweep`
- `## BEH-QD-515: The book returns to its bound after a provider unmounts` (doc 09, after BEH-QD-327)
- `## INV-QD-315: One atom set has one sweeper, by construction`
- `## INV-QD-316: A sweep never runs on the render path or inside the dispose-then-reread window` (after INV-QD-314)
- `ADR-QD-148` after ADR-QD-146 in `index.yaml`; CCR-QD-426 after CCR-QD-425 in `spec/README.md`, ending exactly `Used: ARCH-83, ADR-QD-148, CCR-QD-426, BEH-QD-511..515, INV-QD-315..316. Unused: none.`

## AGENTS.md section 13, before and after

Before (the middle sentence): "`maxTrackedQuestions` bounds the question book through a qadi-owned `sweepEvictions` fork, never through `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL`, which reroutes dispatch and dropped a required render."

After: "`maxTrackedQuestions` is enforced by the atom set itself: the question book signals when it goes over the bound and the atom set forks one deferred, one-shot sweep per pressure episode (ADR-QD-148), chosen after the dispose-reread smoke, the eviction pins, the e2e, one sweeper per atom set, StrictMode and `<Activity>`, and no leaked fibers all held; `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL` stay off limits, because they reroute dispatch and dropped a required render."

The line still begins "`@effect/atom-react` is a dependency of `@qadi/react` (ADR-QD-014, reversed in CCR-QD-150)." and ends with the `house-rules-evidence.md` section 4 pointer. `git diff` against the phase base shows exactly one added and one removed line in AGENTS.md.

## Gate 13 grep

`git grep -n -E "sweepEvictions|sweepIntervalMillis" -- spec/overview.md apps/website/src ":!apps/website/src/content/docs/docs/reference/upgrading.md"` printed nothing (rc 1). No overview row was added or dropped; `SweepScheduler.ts` and `BookOptions.signal` are package-private.

## Gate results

| Command | Exit | Result |
|---------|------|--------|
| `node scripts/spec-revise.mjs --check` | 0 | every Revision matches its newest Change History entry |
| `pnpm spec:verify:strict` | 0 | PASS 21, FAIL 0, SKIP 0 (it failed once, mid-task, on `CCR register coverage` until CCR-QD-426 was added, as expected) |
| `pnpm spec:api` | 0 | 916 exports documented across 9 packages |
| `pnpm spec:gates` | 0 | dod-table: 25 steps match `pnpm check`, 141 references resolve |
| `pnpm spec:examples` | 0 | 112 blocks compile (BEH-QD-511's fence included) |
| `pnpm lint` | 0 | house-style 484 files clean (3 declared switches); the oxlint warnings printed are pre-existing |

## Deviations from Plan

**1. [Rule 1 - Bug in plan text] BEH-QD-514 does not name `sweepEvictions`**
- **Found during:** Task 2 verify
- **Issue:** the plan's action has BEH-QD-514 say "`QadiAtoms` has no `sweepEvictions`", while its own verify refuses the name anywhere in 09 outside Change History.
- **Fix:** the requirement reads "`QadiAtoms` MUST have no member a caller can use to run a sweep", and the note calls it "the atom set's former manual sweep member". The removal is still recorded by name in the changeset, the upgrade guide, ADR-QD-148's Decision and the CCR row.
- **Files modified:** `spec/behaviors/09-react.md`
- **Committed in:** `45364cce`

**2. Format detail (no rule):** ADR-QD-148 cites the spike by name with its phase-record path as code text, and CCR-QD-150 as plain text, instead of relative markdown links, because `.planning/` is not part of the spec link graph and `spec:verify:strict` checks link integrity.

**Total deviations:** 1 auto-fixed (plan self-contradiction), 1 format note. No scope change.

## Known Stubs

None.

## Threat Flags

None. Records only; no new endpoint, auth path or file access. T-35-13 and T-35-14 are met: no history row, quoted paragraph or CCR row other than the new one was changed (Task 3's verify finds no removed line in house-rules-evidence outside its Document Control), no id outside the reservation appears, `next-id.mjs` was not run and no `-NEXT` placeholder exists.

## Issues Encountered

None.

## Next Phase Readiness

35-07's closing checks have everything they cite: the three `docs(35-06)` commits in order, ADR-QD-148 and the reserved numbers, and green spec gates. Nothing in `packages/` changed in this plan.

## Self-Check: PASSED

- `spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md` exists; commits `87a5689f`, `45364cce`, `c06215ff` are ancestors of HEAD; `git status --short` shows only `.planning/config.json` and `.planning/state.json`, never staged.
