---
phase: 61
iteration: 2
status: all_fixed
fixed: 3
skipped: 0
source_review: 61-REVIEW.md (iteration 2: 0 critical, 0 warning, 3 info)
---

# Phase 61: Review fix report, iteration 2

All three Info findings were fixed in one commit, `b2a808fd` `fix(61): name onObligations and TS2416, and list the comment-only files (review iteration 2, IN-01..03)`.

| Finding | Fix | Files |
|---|---|---|
| IN-01: the options doc omits `onObligations`, and the object is not always the caller's own (`decidedOn` spreads once per call) | The doc now says `options` is "the options object the decision was asked with, passed through by reference with no copy per lookup", and it lists `onObligations` on the enforcing entry points. The 0.13 note carries the same runtime caveat and repeats the rule: read only `concurrency`, and do not log or retain the rest. | `packages/core/src/DecisionCache.ts:56-60`, `upgrading.md` 0.13 section |
| IN-02: TS2416, the error a class-based implementer gets, is not named | ADR-QD-174 Consequences (Rev 1.2), the CCR-QD-452 row and the 0.13 note name TS2416 at the method of a class that `implements DecisionCacheShape`. The reviewer probed it with `tsc` (scratchpad `r2/p.ts`, case I4). | `spec/decisions/174-…md`, `spec/README.md`, `upgrading.md` |
| IN-03: the CCR-QD-452 row omits the two comment-only files | The row lists `EvaluationMetrics.ts` and `Simulator.test.tsx` as comment-only edits, and cites ADR-QD-174 Rev 1.2 and README Rev 1.258. | `spec/README.md` (Rev 1.258) |

## Verification
- `spec-revise --check` passes. `verify-traceability --strict` reports 21 PASS. `check-dod-table` reports 25 steps. `check-website-doc-examples` compiles 71 blocks. `check-house-style` reports 560 files clean.
- Mutation: the scoped Stryker run was redone after this commit (evidence in `chore(61)`), and the compare ends `WX-05 holds (D-06)`. The scores are unchanged, and the only survivors are the two from before the phase.
- `61-scan.mjs` reports the phase scan clean.

## Deferred
None.
