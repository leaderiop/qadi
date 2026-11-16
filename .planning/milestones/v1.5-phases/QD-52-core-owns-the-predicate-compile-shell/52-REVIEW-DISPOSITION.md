---
phase: 52
review: 52-REVIEW.md
titles: json
findings:
  - id: WR-01
    iteration: 1
    severity: warning
    disposition: fixed
    title: "`rules` accepts a full `RenderRules` and silently ignores its `identifiers` and `maxInValues`"
  - id: IN-01
    iteration: 1
    severity: info
    disposition: fixed
    title: "Shipped source cites a planning-only decision id, and the comment describes the authoring process"
  - id: IN-02
    iteration: 1
    severity: info
    disposition: fixed
    title: "`compilePredicate`'s doc leaves out the `render` contract and the `outcomes` field"
  - id: IN-03
    iteration: 1
    severity: info
    disposition: skipped
    title: "One new SQL test is redundant and carries an oxlint warning"
  - id: IN-04
    iteration: 1
    severity: info
    disposition: fixed
    title: "A core test title overstates what it pins"
open: 0
---

# Phase 52: Code Review Disposition

Two review iterations (`52-REVIEW.iter1.md`, `52-REVIEW.iter2.md`; `52-REVIEW.md` is iteration 2, status clean). Iteration 1 found 1 warning and 4 info; four were fixed in `6a146bf4..2404770b` (`52-REVIEW-FIX.iter1.md`). Iteration 2 found nothing.

**IN-03 skipped, deliberately.** It is a duplicated row and an oxlint `no-new-array` warning in `packages/predicate-sql/test/CompileShell.test.ts`, one of the two characterisation files that are the phase's before/after evidence (COMP-03, WX-06) and must stay byte-identical to their `test(52-02)` commit; the phase scan checks it. The warning is a warning, not a lint failure (`pnpm lint` and `pnpm check:pr` pass). A later change may tidy the file once it is no longer evidence.

**Consequences recorded for the verifier.** The fixes changed `src` after the 52-05 close by types and comments only (WR-01 closed `CompilePredicateOptions.rules` against `identifiers`/`maxInValues`; IN-01/IN-02 comments), added `packages/core/test/CompilePredicate.tst.ts`, and a second commit on `CompilePredicate.test.ts` (IN-04). So `tools/scan.mjs` (a 52-05 close tool) now reports four expected items: the new `.tst.ts` outside its scope list, the changed `rules` line, the second test commit, and `52-mutation-after.json` predating later src commits. Its checks were not edited. The post-review mutation record `52-mutation-review.json` (same three invocations at `d38f86a6`) gives core `RenderablePredicate.ts` 0.98214 (165/168), predicate-sql `index.ts` 0.95455, predicate-prisma `index.ts` 0.92437 — identical to the close — and `tools/mutation.mjs compare` against the base prints `WX-05 holds (D-09a)`. Both dialects' `lib/index.d.ts` still match the base hashes.
