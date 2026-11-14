---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
plan: 07
subsystem: spec
tags: [adr, ccr, amendment, changeset, agents-md, devtools]
plan_head_before: 3b1f3f41a2aa89eed33d36b8d3480b4a1b89fddf
plan_head_after: e0de1815695c6f8bb81ea7f61900312220e0a222
status: complete

requires: ["37-06"]
provides:
  - "ADR-QD-150, indexed, amending ADR-QD-137"
  - "ADR-QD-137 Revision 1.3: points 3, 4, 7 and the ordering consequence corrected"
  - "CCR-QD-428 row in spec/README.md"
  - "AGENTS.md section 10 names only testers that exist"
  - ".changeset/superseding-run.md, a @qadi/devtools patch"
affects: [37-08, 37-09]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["a dated amendment blockquote after the previous one, in-place correction of the stale Decision sentences"]

key-files:
  created:
    - spec/decisions/150-a-scoped-run-that-a-newer-run-supersedes.md
    - .changeset/superseding-run.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md
    - spec/traceability.md
    - spec/README.md
    - AGENTS.md

key-decisions:
  - "ADR-QD-150 records the held fork as the stronger form of RUN-05, with the report-only fallback named and not needed"
  - "The CCR-QD-428 row lists the file set known so far and says 37-08 completes it; no reserved number is unused"

requirements-completed: [RUN-08, WX-07]
requirements-partial: [WX-02]

duration: 14 min
completed: 2026-11-14
---

# Phase 37 Plan 07: ADR-QD-150, the ADR-QD-137 correction and the devtools patch changeset Summary

ADR-QD-150 records the one superseding-run module (two-step interface, opaque token, finalizer order with its `Scope.make("parallel")` caveat, unconditional stop, failure hook, pre-fork re-check, held-fork repair, synchronous start), ADR-QD-137 now says what the code does, and AGENTS.md section 10 no longer names a tester `@effect/vitest@4.1.2` lacks.

## Revisions reached

| Document | Revision |
|---|---|
| `spec/decisions/150-a-scoped-run-that-a-newer-run-supersedes.md` | 1.0 (new) |
| `spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md` | 1.3 |
| `spec/traceability.md` | 1.164 |
| `spec/README.md` | 1.169 |
| `spec/decisions/index.yaml` | no Revision cell |
| `AGENTS.md` | no Revision cell; section 10 only |

## CCR-QD-428 row as written

`| CCR-QD-428 | 2026-11-14 | <ADR-QD-150 (new), index.yaml, ADR-QD-137 Rev 1.3, traceability Rev 1.164, README Rev 1.169, AGENTS.md section 10, SupersedingRun.ts (new), the three stores, their tests, SupersedingRun.test.ts and SimulationSession.runs.test.ts (new), the changeset> | ARCH-84. **A scoped run that a newer run supersedes.** ... |` directly after the CCR-QD-427 row. It states the module, the three adopters, the re-check and held fork (TF21 to TF23, F28, F29 and SR5, each seen RED first), the unconditional stop, INV-QD-313 unchanged, the out-of-scope notes (the timeline feed's republish of `Reading` after close, `CircuitBreaker.ts`, `DockModel.ts`), and "Reserved ADR-QD-150, CCR-QD-428, BEH-QD-521 to 525 and INV-QD-319 to 320, none unused". 37-08 completes its file list.

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 | 63db18b5 | docs(37-07): ADR-QD-150, a scoped run that a newer run supersedes, amending ADR-QD-137 |
| 2 | e0de1815 | docs(37-07): AGENTS.md section 10 names the testers that exist, and a devtools patch changeset |

## Verification

`node scripts/spec-revise.mjs --check` passes; `pnpm spec:verify:strict` 21 PASS, 0 FAIL, 0 SKIP; `pnpm spec:examples` 113 blocks compile; `pnpm spec:gates` (dod-table) passes; `pnpm lint` house-style 496 files clean (the oxlint warnings are pre-existing and in unrelated files, `.codex/` and `packages/react`). Both plan verify scripts and the added-id check pass: every id added since the phase base is reserved or already existed at the base. `node scripts/next-id.mjs` was never run.

## Deviations from Plan

None - plan executed exactly as written. The commit trailer follows the milestone rule (`Claude Opus 5.5`), not the harness attribution reminder. The task's reserved-number precondition was checked with `grep` over `spec`, `AGENTS.md` and `packages`: only gitignored built `lib/` output in `packages/devtools` mentions ADR-QD-150 (from 37-02 and 37-06 source comments), and no tracked file did.

## Known Stubs

None.

## Threat Flags

None. Documentation and a changeset only. T-37-16 and T-37-17 are mitigated: the added-id check passed, and the AGENTS.md diff since the phase base sits inside section 10.

## Self-Check: PASSED

Files exist: ADR-QD-150, `.changeset/superseding-run.md`. Commits 63db18b5 and e0de1815 are ancestors of HEAD.

## Next

Ready for 37-08 (BEH-QD-521 to 525, INV-QD-319 and 320, restated BEH-QD-461, BEH-QD-322 and INV-QD-313).
