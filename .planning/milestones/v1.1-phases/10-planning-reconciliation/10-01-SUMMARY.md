---
phase: 10-planning-reconciliation
plan: 01
subsystem: planning
tags: [planning, records, lost-wave]
phase_base: 0dc288e

requires: []
provides:
  - "Every lost ARCH-46…57 plan carries a wave-6 `status:` and a one-line `disposition:` (REC-02)"
  - "`.planning/architecture/README.md` opens with a Superseded 2026-11-10 banner and lost-plan disposition table (REC-01)"
affects: [10-03-archive-move, 11-lost-wave-security, 12-lost-wave-integrity, 13-lost-wave-gaps]

actuals:
  tokens: 2500
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/10-planning-reconciliation/10-01-SUMMARY.md
  modified:
    - .planning/architecture/README.md (untracked)
    - .planning/architecture/ARCH-46…57-*.md (untracked, frontmatter line 5 only)

key-decisions:
  - "No checkpoint:decision in this plan; D-01 and D-04 (10-CONTEXT) applied as written; banner wording at Claude's discretion"

patterns-established: []

requirements-completed: [REC-01, REC-02]

coverage:
  - id: D1
    description: "Twelve lost plans re-statused; none still claims done/blocked/needs-decision"
    requirement: REC-02
    verification:
      - kind: other
        ref: "10-01-PLAN Task 1 <automated> gate + ./progress.sh 46…57"
        status: pass
    human_judgment: false
  - id: D2
    description: "README superseded banner, rescue branches named local-only, _SALVAGE.md link, 12-row disposition table, stale .gitignore:43 note rewritten"
    requirement: REC-01
    verification:
      - kind: other
        ref: "10-01-PLAN Task 2 <automated> gate"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-11-10
status: complete
---

# Phase 10 Plan 01: Lost-plan statuses and superseded banner Summary

**The old tracker no longer claims any ARCH-46…57 work is on `main`: each lost plan names its wave-6 phase,
its fix on main, or its deferral, and the README opens with a superseded banner that maps all twelve.**

`phase_base`: **`0dc288e`** (HEAD of `arch-wave-6` before Phase 10's first commit).

## Performance

- **Duration:** about 10 min
- **Tasks:** 2 of 2
- **Files modified:** 13 under `.planning/architecture/` (all untracked)

## Accomplishments

### Task 1: frontmatter re-status (line 5 of each file; `diff` against pre-edit copies shows only `5c5,6` per file)

| File | Old `status:` line | New `status:` | New `disposition:` (abridged; full text in file, ends `(wave 6, 2026-11-10)`) |
|---|---|---|---|
| ARCH-46 | `status: blocked   # T4 NO-GO 2026-10-13 (903be15): T1,T2,T3 + O2 landed; T5-T9 not built; see ADR-QD-077 Rev 1.2 addendum` | `superseded-by-phase-13` | T1 fixed on main by merged ARCH-47 readPort (e0365e0); T2 PortMetrics.ts block → Phase 13 (GAP-11); T4–T9 out of scope (benchmark NO-GO); was `blocked` (T4 NO-GO 2026-10-13, 903be15: T1–T3 + O2 landed, T5–T9 not built, see ADR-QD-077 Rev 1.2 addendum), partial work on rescue/wave5-1013 903be15 |
| ARCH-47 | `status: done` | `superseded-by-phase-13` | T1/T2 fixed on main by merged ARCH-46 ENF-03 (e0365e0); denial log (T3/T4) → Phase 13 (GAP-01) from b0b9363 |
| ARCH-48 | `status: done` | `superseded-by-phase-13` | Phase 13 (GAP-02…04) from 950977f |
| ARCH-49 | `status: done` | `superseded-by-phase-11` | Phase 11 (ARCH-59; SEC-05, SEC-06) from 2ea89d6 |
| ARCH-50 | `status: needs-decision` | `fixed-on-main (1721a42)` | superseded by merged ARCH-58 (#154); arch50 stashes not salvaged; was `needs-decision` |
| ARCH-51 | `status: done` | `superseded-by-phase-13` | T1 obsolete (merged ARCH-53, e0365e0); T2/T3 → Phase 13 (GAP-07, GAP-11); LeafNeeds.ts out of scope (9cf0e5f) |
| ARCH-52 | `status: done` | `superseded-by-phase-11` | Phase 11 (ARCH-59; SEC-01…04) from 8900b7e |
| ARCH-53 | `status: done` | `superseded-by-phase-12` | Phase 12 (ARCH-60; INT-03…06) from f27d049 |
| ARCH-54 | `status: done` | `superseded-by-phase-12` | Phase 12 (ARCH-60; INT-01, INT-02) from 6c67e44 |
| ARCH-55 | `status: needs-decision` | `deferred` | never committed; speculative (REQUIREMENTS.md Out of Scope); was `needs-decision` |
| ARCH-56 | `status: done` | `superseded-by-phase-13` | Phase 13 (GAP-05, GAP-06) from d089c1d |
| ARCH-57 | `status: done` | `superseded-by-phase-13` | Phase 13 (GAP-08…11) from 4b1ed49 |

No line below the frontmatter changed in any of the twelve files (bodies and §10 progress logs kept as history, D-01).

### Task 2: README banner

Inserted above `# Architecture deepening — tracker`:

> **Superseded 2026-11-10.** This tracker is history, not status.
> - Waves 1–4 (ARCH-01…45) merged in #140, #148, #150; these plans are their only record, cited by PROJECT.md "Validated".
> - The 2026-10-13 wave (ARCH-46…57) was implemented on `wave5/architecture-deepenings` and never merged; its ids collide with the merged 2026-11-08 wave (#153).
> - Recovered 2026-11-10 as local-only branches (D-04): `rescue/wave5-1013` (`950977f`), `rescue/arch50-stash-a` (`4b4c439`), `rescue/arch50-stash-b` (`fc35d5e`); Phase 13 asks whether to delete them.
> - Link: [`.planning/phases/_SALVAGE.md`](../phases/_SALVAGE.md).

followed by a 12-row `| Lost plan | Status | Where it went |` table (each first cell links the plan file).
The stale note "`.planning/` is gitignored (`.gitignore:43`)" was replaced with: `.planning/architecture/` is neither
tracked nor ignored on `1721a42` (`e0365e0` removed its `.gitignore` lines; confirmed with `git log -S'.planning' -- .gitignore`),
and plan 10-03 decides tracked/ignored/archived. Nothing else in the README changed (`diff`: `0a1,29` insert, `9,10c38,40` note).

## Task Commits

None per task: every file this plan edits is under `.planning/architecture/`, which is untracked and stays untracked
until 10-03 moves it (executor brief: never stage it unless the plan moves it). Pre-edit copies were kept in the
session scratchpad for the line-level diff above.

**Plan metadata:** `docs(10-01): complete plan` (this SUMMARY, ROADMAP, STATE).

## Decisions Made

- No `checkpoint:decision` in this plan (none in `_DECISIONS.md` for 10-01). D-01/D-04 applied as written.
- ARCH-46's and ARCH-50/55's dispositions also carry their old status (`blocked` + its comment, `needs-decision`) so nothing the old line said is lost (T-10-02).

## Deviations from Plan

- **No per-task commits** (see above) — a consequence of the files being untracked, not a scope change. 10-03 tracks them in the archive move.

## Gate Results

- Task 1 `<automated>` gate: PASS (12 wave-6 statuses, 12 dispositions, 0 stale statuses, progress.sh lists new statuses).
- Task 2 `<automated>` gate: PASS.
- `git status --porcelain -- packages spec .changeset`: empty.
- Rescue branch tips re-verified (`git branch --list 'rescue/*' -v`); `git branch -r | grep rescue` empty (local only).

## Next Phase Readiness

10-02 (orphan `lib/` clean) is independent. 10-03 moves `.planning/architecture/` to
`.planning/milestones/archive-pre-gsd/architecture/` (`_DECISIONS.md`: `archive`); the banner's relative link
`../phases/_SALVAGE.md` will need rewriting to `../../../phases/_SALVAGE.md` there, and the README note naming
"plan 10-03" should be updated to the outcome.
