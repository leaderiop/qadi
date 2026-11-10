---
phase: 10-planning-reconciliation
plan: 03
subsystem: planning
tags: [planning, records, lost-wave, merge-gate]

requires: ["10-01", "10-02"]
provides:
  - "The old tracker is tracked history at `.planning/milestones/archive-pre-gsd/architecture/` (REC-03)"
  - "No live planning doc names `.planning/architecture/`; STATE.md's stale blocker and numbering todo corrected"
  - "`pnpm check:pr` green at Phase 10's close (XC-01)"
affects: [11-lost-wave-security, 12-lost-wave-integrity, 13-lost-wave-gaps, 14-audit-sink-deadline, 15-dock-session, 17-injective-request-key, 20-decision-cache-shared-computation]

actuals:
  tokens: 9000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/milestones/archive-pre-gsd/architecture/** (79 files, moved from `.planning/architecture/`)
    - .planning/phases/10-planning-reconciliation/10-03-SUMMARY.md
  modified:
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/phases/_SALVAGE.md
    - .planning/phases/_DECISIONS.md
    - 25 phase CONTEXT/PLAN files under .planning/phases/1[1-7]-*, 20-* (path text only)

key-decisions:
  - "D-02 answered in `_DECISIONS.md`: `archive` — \"Move `.planning/architecture/` to `.planning/milestones/archive-pre-gsd/architecture/` and track it there; rewrite references in the same commit\""

patterns-established: []

requirements-completed: [REC-03, XC-01]

coverage:
  - id: D1
    description: "Tree archived and tracked, secret scan clean, no live doc names the old path, README link resolves, no rescue branch on a remote"
    requirement: REC-03
    verification:
      - kind: other
        ref: "10-03-PLAN Task 2 <automated> gate"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-05 lost-wave note matches `git branch`; STATE.md stale lines gone; merge gate green"
    requirement: XC-01
    verification:
      - kind: other
        ref: "10-03-PLAN Task 3 <automated> gate (grep part + `pnpm check:pr` exit 0)"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-11-10
status: complete
---

# Phase 10 Plan 03: Archive the old tracker and close the phase Summary

**The 2026-10-13 tracker now lives, tracked, at `.planning/milestones/archive-pre-gsd/architecture/`; every live
planning doc points there, STATE.md no longer claims `.planning/` is ignored or that CCR-QD-394 is free, and
`pnpm check:pr` exits 0.**

## Task 1: decision (D-02)

Answered in `.planning/phases/_DECISIONS.md`: **`archive`** — "Move the old tracker to
`.planning/milestones/archive-pre-gsd/architecture/` and track it there; rewrite references in the same commit".

## Task 2: apply it

- Secret scan (plan regex, `/usr/bin/grep -rEn`) over `.planning/architecture/` before adding: **0 hits**.
- `mv .planning/architecture .planning/milestones/archive-pre-gsd/architecture`; `git add` tracked all **79** files
  (none ignored). `git status` no longer shows `?? .planning/architecture/`.
- Path rewrite (`.planning/architecture/` → `.planning/milestones/archive-pre-gsd/architecture/`, 33 occurrences) in
  28 files: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `phases/_SALVAGE.md`, `11-CONTEXT.md`, `12-CONTEXT.md`,
  `12-01…12-04-PLAN.md`, `13-CONTEXT.md`, `13-01…13-11-PLAN.md`, `13-13-PLAN.md`, `14-CONTEXT.md`, `15-CONTEXT.md`,
  `15-04-PLAN.md`, `17-CONTEXT.md`, `20-CONTEXT.md`. `git diff --word-diff` showed only path tokens plus the wording
  fixes below.
- Wording fixes where a mechanical rewrite would have made a sentence false: PROJECT.md's lost-wave note and
  `_SALVAGE.md`'s "Lost" bullet said "untracked `.planning/architecture/`" — now "untracked until Phase 10 archived it
  to …"; `_DECISIONS.md`'s D-02 row reworded to "Move the old tracker (`architecture/` at the `.planning/` root) to …"
  so it still describes the move.
- Moved `README.md`: banner link `../phases/_SALVAGE.md` → `../../../phases/_SALVAGE.md` (resolves); the 10-01 note
  now says Phase 10 (plan 10-03) archived it here, tracked, on 2026-11-10 (D-02: `archive`).
- Session executor brief (scratchpad, not in repo) updated: the tracker now lives, tracked, at the archive path.
- Rescue branches not pushed (D-04): `git branch -r | grep rescue` empty.

## Task 3: D-05, STATE.md, merge gate

- **D-05 check — no change needed.** `git branch --list 'rescue/*' -v`: `rescue/wave5-1013` `950977f`,
  `rescue/arch50-stash-a` `4b4c439`, `rescue/arch50-stash-b` `fc35d5e`. PROJECT.md's paragraph names
  `rescue/wave5-1013` (tip `950977f`) and the two stashes, says the ids collide with #153 and are ported under new
  numbers, and points at `_SALVAGE.md`. Only its path text changed (Task 2).
- **STATE.md corrections:**
  1. Blocker "`.planning/` is gitignored (`.gitignore:43`)…" → "`.planning/` is tracked (no `.gitignore` line).
     `.planning/architecture/` was archived under `.planning/milestones/archive-pre-gsd/` (tracked) by Phase 10 on 2026-11-10."
  2. Todo "Next free after v1.0: ARCH-55, ADR-QD-117, CCR-QD-394…" → confirm reserved numbers against PROJECT.md's
     wave-6 reservation table (grep `spec/` first); ARCH ids below 59 are never reused; CCR-QD-394 is used by ARCH-58.
- **`pnpm check:pr`** (local macOS host, repo root): **exit 0**. `run-check: ran 16 of 17 steps; "pnpm mutation" was
  skipped`. Steps: typecheck, lint, circular, test:tstyche, coverage, test:bdd, spec:examples, spec:verify:strict,
  spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website, spec:publish. The example
  step's Playwright install ran on this host; no container or CI route needed.

## Task Commits

- `9f2d8d6` docs(10-03): archive the old architecture tracker under milestones and track it
- `5f5a809` docs(10-03): correct STATE.md's stale gitignore blocker and numbering todo
- Plan metadata: `docs(10-03): complete plan` (this SUMMARY, ROADMAP, REQUIREMENTS, STATE)

## Deviations from Plan

- **Rewrite list larger than the plan's (rule 3, blocking).** The plan listed 24 files and said to stop if the re-run
  grep differed. It found 29 live files (excluding milestones and phase 10). The five extra — `_DECISIONS.md`,
  `12-03-PLAN.md`, `12-04-PLAN.md`, `13-11-PLAN.md`, `13-13-PLAN.md` — were all committed in `0dc288e` with the rest, so they are a planning-time undercount, not a later plan
  adding references. Each is an `@`-include or citation of an archived file that would break after the move, and the
  Task 2 gate requires zero live references, so they were rewritten too (`_DECISIONS.md` reworded rather than
  path-substituted, see above). No unrelated file touched.
- **XC-01 box left open.** XC-01 is "green at the end of each phase"; ticking its box after Phase 10 would claim it
  for phases 11–20. REQUIREMENTS.md records "Phase 10: green (10-03, 2026-11-10)" on the line and in the
  traceability row instead. REC-01…04 ticked and their row set to Complete.

## Next Phase Readiness

Phase 10 complete. Later plans' `@`-includes of lost ARCH plans now point at
`.planning/milestones/archive-pre-gsd/architecture/`. Phase 11 base is this plan's final commit.
