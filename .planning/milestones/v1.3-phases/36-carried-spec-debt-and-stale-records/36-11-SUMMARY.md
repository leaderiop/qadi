---
phase: 36-carried-spec-debt-and-stale-records
plan: 11
subsystem: spec-records
tags: [spec, records, ccr, adr-amendments, debt-01, debt-02, debt-03]
status: complete
requires:
  - phase: 36-10
    provides: the comment and test-wording corrections the CCR-QD-427 row lists
provides:
  - "CCR-QD-427 row in spec/README.md (Rev 1.164), landed before any other spec text cites it"
  - "BEH-QD-219..221 printed once in spec/behaviors/29-devtools-simulator.md (Rev 1.16)"
  - "traceability row 71 without the pre-rename Sources token (Rev 1.160)"
  - ".planning/MILESTONES.md fail-open claim struck through with the v1.1 closure"
  - "dated amendments on ADR-QD-053 (Rev 1.6), ADR-QD-081 (Rev 1.2), ADR-QD-140 (Rev 1.1); ADR-QD-123 one-word fix (Rev 1.2); INV-QD-064 Source line (invariants Rev 1.115)"
affects: [36-12, 36-13, 36-14]
requirements-completed: [DEBT-01, DEBT-02, DEBT-03, DEBT-04, WX-02]
actuals:
  tokens: 59000
  tasks: 3
  commits: 5
plan_head_before: edabb8a9c6cfa3e8ce4a41393bdc0743321c0701
plan_head_after: 8fbea283fe850f5bdd674a80f61b67155d4120fd
tech-stack:
  added: []
  patterns:
    - "a record is corrected by a new dated line or a Revision entry, never by rewriting history"
key-files:
  created: []
  modified:
    - spec/README.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/traceability.md
    - .planning/MILESTONES.md
    - spec/decisions/053-a-gate-can-be-found.md
    - spec/decisions/081-enforcement-error-classes-live-in-core.md
    - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md
    - spec/decisions/123-a-metric-is-declared-once.md
    - spec/invariants.md
key-decisions:
  - "The CCR-QD-427 row cites no reserved BEH, INV or ADR number; it ends 'Records for the timeline and the hydration seed follow in this row.' so 36-12 and 36-13 extend it"
  - "DEBT-02 deletes the stale token instead of replacing it with Source, which is behaviour 27's module"
---

# Phase 36 Plan 11: Spec records, DEBT-01..03 and the ADR amendments Summary

CCR-QD-427 is in the register, BEH-QD-219 to 221 are printed once (pure deletion of base lines 175-345), the stale `Sources,` token and the live fail-open claim are gone, and four ADRs plus INV-QD-064 are corrected by amendment with their old text intact.

## Commits

| Task | Hash | Subject |
|------|------|---------|
| 1 | 5768da39 | docs(36-11): CCR-QD-427, the phase's change row |
| 2 (DEBT-01) | 8f35ead7 | docs(36-11): BEH-QD-219 to 221 printed once |
| 2 (DEBT-02) | 45c59daa | docs(36-11): the simulator's traceability row drops the pre-rename module |
| 2 (DEBT-03) | b4b970ff | docs(36-11): the v1.0 milestone's fail-open line says it was closed in v1.1 |
| 3 | 8fbea283 | docs(36-11): ADR amendments and INV-QD-064's Source name where the code is |

Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## DEBT-01 span table (base `e0182035`, 1056 lines, result 885 lines)

| span | base lines | source copy | kept? | why |
|------|-----------|-------------|-------|-----|
| header, intro | 1-27 | once | keep | line 13 already holds every Change History row |
| BEH-QD-219 | 28-76 | copy 1 | keep | identical to 190-238; the first heading keeps the unsuffixed anchor |
| BEH-QD-220 | 78-127 | copy 1 | keep | identical to 240-289 |
| BEH-QD-221 head, fences, requirements 1-3 | 129-161 | copy 1 | keep | identical to 291-323 |
| miss requirement (typed error, BEH-QD-411) | 163-167 | copy 1 | keep | the current text |
| refused-key requirement (BEH-QD-410) | 169-173 | copy 1 | keep | the current text |
| blank | 174 | copy 1 | keep | separates 173 from the tail |
| spliced Change History fragment | 175 | stray | drop | byte-identical to the tail of line 13 (so D-05's "move back to the header" needed no move: the header already holds it) |
| duplicate intro | 176-189 | stray | drop | duplicate of 14-27 |
| BEH-QD-219, 220 | 190-289 | copy 2 | drop | byte-identical to copy 1 |
| BEH-QD-221 head to "fail-closed defaults deny" | 291-323 | copy 2 | drop | byte-identical to copy 1 |
| stale miss requirement and paragraph | 325-333 | copy 2 | drop | superseded by BEH-QD-411 (change history 1.11) |
| signature requirement and paragraph | 335-344 | copy 2 | drop | subsumed by the unified miss requirement and BEH-QD-411's SignatureHistory row |
| blank | 345 | copy 2 | drop | goes with the paragraph above |
| tail prose (`CapturedAnswers` ... ADR-QD-094) | 346-351 | copy 2 | keep | the only copy; true against `Capture.ts` |

The file equals base lines 1-174 plus 346-1056 except lines 8 and 13 (Revision, Change History); numstat `2	173`; one heading each for BEH-QD-219, -220, -221; 130 fence lines.

## Revisions, before and after

| Document | Before | After |
|----------|--------|-------|
| spec/README.md | 1.163 | 1.164 |
| spec/behaviors/29-devtools-simulator.md | 1.15 | 1.16 |
| spec/traceability.md | 1.159 | 1.160 |
| spec/decisions/053-a-gate-can-be-found.md | 1.5 | 1.6 (Status cell adds ADR-QD-140) |
| spec/decisions/081-enforcement-error-classes-live-in-core.md | 1.1 | 1.2 |
| spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md | 1.0 | 1.1 |
| spec/decisions/123-a-metric-is-declared-once.md | 1.1 | 1.2 |
| spec/invariants.md | 1.114 | 1.115 |

## Gate output

- `node scripts/spec-revise.mjs --check`: `every Revision matches its newest Change History entry` after each commit.
- `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0` after each commit (check 7, the CCR register, and check 8, Revision, included).
- `pnpm spec:examples`: `doc-examples: 112 block(s) compile` after DEBT-01 and DEBT-03.
- The plan's three `<automated>` node verifies all print their ok lines.
- Gate 13 (`pnpm spec:api`) was not run; it stays red until 36-13 Task 2, as planned.

## Deviations from Plan

None - plan executed exactly as written. Two notes that are not rule deviations:

- **DEBT-02 premise (planned, flagged):** the requirement wording names `Source.ts`; the stale token meant `Sources.ts` (renamed `SimulationSource.ts`, `dab09bc0`), so it is deleted. CCR-QD-427 records the departure.
- **DEBT-03 search:** the executor re-searched `.planning/PROJECT.md STATE.md ROADMAP.md REQUIREMENTS.md`, `README.md`, `CONTRIBUTING.md`, `apps/website/src` and `packages/*/src` for `fail-open|four ports|needs a decision`; the only live claim was `MILESTONES.md:75-77`. The other hits are corrected (`PROJECT.md:202`, `STATE.md:330`), describe this phase's task (`PROJECT.md:49`, `ROADMAP.md`, `REQUIREMENTS.md`), or are unrelated uses of the words. No further annotation was needed.
- The plan commit ledger (`.git/gsd-plan-head-before-36-11`) was written after the first commit, from `HEAD~1` (the same base, `edabb8a9`), because the ledger step was missed before it.

## Known Stubs

None.

## Threat Flags

None. Spec and record edits only; no trust boundary crossed.

## Self-Check: PASSED

All five commits are ancestors of HEAD; the nine modified files exist; `git rev-list --count edabb8a9..HEAD` is 5 before this summary.
