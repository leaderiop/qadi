---
phase: 20-decision-cache-shared-computation
plan: 04
subsystem: spec
tags: [spec, adr, ccr, changeset, mutation, phase-gate, milestone-close, issue-64, ARCH-68]

requires:
  - phase: 20-03
    provides: "abandon-on-last-leave in SharedComputation.ts; the abandon seam tests; 20-01's uninterruptible-regime test GREEN"
provides:
  - "BEH-QD-439 in spec/behaviors/21-decision-cache.md (Rev 1.8)"
  - "ADR-QD-132 (spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md) and its index entry"
  - "INV-QD-025 Enforcement note (spec/invariants.md Rev 1.100); traceability Rev 1.142"
  - "CCR-QD-410 (spec/README.md Rev 1.144)"
  - "the #64 paragraph in the pending .changeset/decision-cache-claim-window.md (@qadi/core patch)"
  - "20-mutation-after.json"
affects: []

key-files:
  created:
    - spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md
    - .planning/phases/20-decision-cache-shared-computation/20-mutation-after.json
  modified:
    - spec/behaviors/21-decision-cache.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/decisions/index.yaml
    - spec/README.md
    - .changeset/decision-cache-claim-window.md

key-decisions:
  - "ADR-QD-132 is used, not left unused as the plan said: the orchestrator's queue for this plan listed it, and 20-03 did make a choice between the three options the old comment named (A, taken at the last leave; the abandoned exit dropped rather than cached-unless-fresher). The ADR records that choice and its cost."
  - "The #64 changeset is a second paragraph in the pending decision-cache-claim-window.md, not a new file: the orchestrator asked to amend a pending decision-cache changeset in place. Patch: no type, export or option changed against the 0.11.0 tag."
  - "No new invariant: INV-QD-025 covers the cache; its Enforcement names BEH-QD-439 and the tests."

requirements-completed: [CACHE-01, CACHE-02, CACHE-03, CACHE-04, XC-01, XC-02, XC-03, XC-04, XC-05, XC-06]
duration: ~40 min
completed: 2026-11-10
status: complete
---

# Phase 20 Plan 04: Record the shared-computation regime, close Phase 20 and v1.1

**The spec now states the single-flight regime (BEH-QD-439, ADR-QD-132, INV-QD-025 note, CCR-QD-410), the pending `@qadi/core` patch changeset carries the #64 fix, the mutation compare holds, and `pnpm check:pr` exits 0. Phase 20 and the v1.1 milestone (Phases 10–20) are complete; nothing is released.**

## Branch taken

`repro_outcome: reproduced` (20-01-SUMMARY.md). `_DECISIONS.md` 20-01 T2 = `A` ("Only if #64 does not reproduce: stop the phase, keep the test as a pin"): its condition is not met, so the reproduced branch applies. 20-04 has no `checkpoint:decision` of its own.

## Ids

Grepped `spec/` and `.changeset/` before use: ADR-QD-132, CCR-QD-410 and BEH-QD-439 were absent. PROJECT.md's reservation row for Phase 20 (ARCH-68, ADR 132, CCR 410, BEH 439–448, INV 295–299) is current.

- Used: ADR-QD-132, CCR-QD-410, BEH-QD-439.
- Unused: BEH-QD-440–448; INV-QD-295–299 (INV-QD-025 covers the cache; no new invariant). Both stated in CCR-QD-410.

## Task 1: BEH-QD-439, ADR-QD-132, INV-QD-025, traceability

- `21-decision-cache.md` 1.7 → 1.8: BEH-QD-439 "A shared computation answers everyone still waiting, and nobody else". Four requirements: run once and settle every waiter; a waiter leaving does not interrupt while another waits; the last leave interrupts and no later ask joins, so a never-interrupted ask never receives an interruption, uninterruptible region or not; an abandoned computation writes nothing. It records how the third requirement was found red (issue #64 follow-up, ARCH-68), and **the stated cost**: `Fiber.interrupt` waits for its target, so the last leaver still waits for a computation parked uninterruptibly to leave its region; in that window the question may be computed twice. Enforcement cites `SharedComputation.test.ts` (including the two "abandon" tests) and `DecisionCache.test.ts`'s "issue #64, uninterruptible regime" and the two REGRESSION PIN tests. No `typescript` fence (the module is package-private).
- ADR-QD-132 (new) and `decisions/index.yaml`: context, options A/B/C from the old comment, decision (A at the last leave; abandoned exit dropped; interface unchanged), consequences (the cost; possible double computation), alternatives rejected.
- `invariants.md` 1.99 → 1.100: INV-QD-025's Enforcement adds "an interruption is not an answer a hit or a miss can differ by" with BEH-QD-439 and its tests; Related gains BEH-QD-439 and ADR-QD-132.
- `traceability.md` 1.141 → 1.142: behaviour 21 row (BEH-QD-439, `SharedComputation.ts`), INV-QD-025 row, ADR-QD-132 row, `DecisionCache.test.ts` row (the uninterruptible-regime and REGRESSION PIN tests), new `SharedComputation.test.ts` row.

## Task 2: CCR-QD-410 and the changeset

- `spec/README.md` 1.143 → 1.144: CCR-QD-410 after CCR-QD-409, with the files since the phase base, the gap and how it was found red (`e5a0403f`, `78bc0852`), the extraction, the fix and why, the cost, the bench medians from 20-02/20-03, the mutation numbers, and the number accounting.
- `.changeset/decision-cache-claim-window.md` (pending since b655b3be, after the 0.11.0 tags): a second paragraph, `@qadi/core` patch. Breaking judged against `@qadi/core@0.11.0`: no export, type or option changed; a request that was never cancelled now gets an answer instead of an interruption.

## Task 3: gates

- `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict` (21 PASS, 0 FAIL), `pnpm spec:examples` (108 blocks), `check-dod-table.mjs` (25 steps, 139 references): green before commit.
- **`pnpm check:pr`: exit 0.** `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped`. Vitest 173 files / 4468 tests, coverage all files 99.46% statements; tstyche 43 files / 199 tests; BDD 34 files / 568 tests.
- No gate, budget table, threshold or overview edit since the phase base: `git diff --name-only a7a5a8cb -- scripts AGENTS.md vitest.config.ts "packages/*/vitest.config.ts" stryker.config.mjs .oxlintrc.json spec/overview.md` is empty.

## Mutation (XC-05)

Not re-run: `git diff daf75c97 HEAD -- packages/` is empty, so 20-03's measurement of the final source stands. Written to `20-mutation-after.json` and compared with the plan's one-liner (exit 0):

| File | Base (`20-mutation-base.json`) | Final | Verdict |
|------|------|-------|---------|
| `DecisionCache.ts` | 0.9479 | 0.9583 (46/48) | no drop |
| `SharedComputation.ts` | none (new) | 0.9857 (69/70) | ≥ 0.80 |

## Cross-cutting requirements (XC-01..06), evidence for Phases 10–20

All six ticked. Phase 10 changed only `.planning/` (`git diff` over its commits outside `.planning` is empty) and PROJECT.md reserves it no numbers, so XC-02..06 hold for it vacuously.

- **XC-01**: check:pr green at each phase's close: 10-03, 11-07, 12-05, 13-12, 14-07, 15-04, 16-04, 17-06, 18-03, 19-03 (REQUIREMENTS note) and 20-04 (above).
- **XC-02**: CCR-QD-395..410 each present once in `spec/README.md`. New ADR files are 117, 118, 123, 126, 128, 129, 130 and 132; every unused reserved ADR (119–122, 124, 125, 127, 131) has its reason in a CCR row. Every new BEH and INV heading since `1721a42` falls inside its phase's reservation (BEH 339, 349, 359, 368, 379–380, 389–390, 399–400, 409–411, 419–420, 429–430, 439; INV 250, 251, 257, 259, 280, 285). BEH-QD-219–221 were already on main and were only retitled.
- **XC-03**: gate 13 (`check-api-surface.mjs`) fails in both directions (it reports `[stale]` rows) and runs inside every green check:pr listed under XC-01.
- **XC-04**: added `packages/*/src` lines since `1721a42` (2925, comments excluded) contain no `switch (`, `fnUntraced`, `async`/`await`, `console.`, `process.env`, `Date.now`, `new Date(`, `performance.now`, `any`, type assertion or `x!` (only `import type * as` and `Deferred.await` matched the pattern, both false positives). The budget edits came with their AGENTS.md text: 13-07 (`1f3813a7` and `ca7051ef`), 13-10 (`a1aef7a8`) and 14-05 (`fe8284b6`). 12-03 (`28c8d364`) lowered `DECISION_READ_BUDGET`'s HydrationEngine.ts count from 3 to 2 with no AGENTS.md edit. §13 names that budget's two files and gives no count, so the text stayed true. This is a judgement call, flagged here.
- **XC-05**: every phase's mutation compare reported no drop: 11-07, 12-05, 13-12/13-13, 14-07, 15-04, 16-04, 17-06, 18-03, 19-03, 20-04. Coverage holds in every green check:pr.
- **XC-06**: every code-defect fix commit follows a RED commit in its phase: 11 (`902142b`, `8bfb81d`, `4aa4cfb`, `bdfefcf`), 12 (`f29b1bf3`, `1f41e081`, `3c0daa49`, `c292760a`, `4ec68001`, `8868c29f`), 13 (`6d40ea15`, `a762844c`, `b57c3252`, `210499f4`, `54190c6f`, `c448b475`, `cbeff903`, `eaf163b3`, `1f3813a7`, `6a210e6a`), 14 (14-01's RED AuditSinkDeadline tests), 15 (15-01, seen at e9d1104), 16 (`6fecedf`, `a253594`), 17 (`be0fad38`, `11c117df`, `a16d1a6d`), 18 (`8c97750f`, `e8430a34`, `85ded1c1`), 19 (`feef498a`, `22ddee4c`) and 20 (`e5a0403f`, `78bc0852`). The one reading to note: 13-13's documentation defects (GAP-11) were corrected without a RED test. They change no runtime behaviour, so I read XC-06 as covering code defects only.

## Deviations from Plan

1. **ADR-QD-132 used** (the plan had it unused): the orchestrator's queue for 20-04 listed "ADR-QD-132" among the spec records for #64. As a result, the plan's "unused numbers stay unused" check, which requires that ADR-QD-132 not appear in the lines this phase adds to `spec/behaviors`, `invariants.md` and `traceability.md`, now matches: BEH-QD-439 and INV-QD-025 cite the ADR. That is intended.
2. **Changeset amended in place** (the plan named a new `.changeset/decision-cache-abandoned-computation.md`): the orchestrator asked to amend a pending decision-cache changeset, and `decision-cache-claim-window.md` is one. The plan's changeset check names the new file, so it now looks in `decision-cache-claim-window.md` (which has `"@qadi/core": patch`).
3. **Mutation not re-run**: no source file changed since 20-03's run, which the orchestrator allowed.
4. **XC-01..06 ticked** at the orchestrator's request, with the evidence above.

## Commits

- `57d243c9` docs(20-04): BEH-QD-439 and ADR-QD-132, a shared computation answers everyone still waiting
- `352238b9` docs(20-04): CCR-QD-410 and the @qadi/core patch changeset (#64)
- docs(20-04): complete plan (this summary, mutation-after json, ROADMAP, STATE, REQUIREMENTS)

## Self-Check: PASSED
