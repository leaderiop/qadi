---
phase: 51
review: 51-REVIEW.md
titles: json
findings:
  - id: WR-01
    iteration: 1
    severity: warning
    disposition: fixed
    title: "ADR-QD-164 says every \"experiment, after\" edit compiled on the base; three of them did not (or did not exist)"
  - id: WR-02
    iteration: 1
    severity: warning
    disposition: fixed
    title: "A non-exhaustive dispatch on the closed `Arity` union brings back the silent-widening class this phase removes"
  - id: WR-03
    iteration: 1
    severity: warning
    disposition: fixed
    title: "`proofs.mjs`'s first row passes on any `git apply` failure, so it cannot fail for the reason it claims"
  - id: WR-04
    iteration: 1
    severity: warning
    disposition: fixed
    title: "`proofs.mjs` and `moves.mjs` claim to restore on Ctrl-C, but their SIGINT handlers cannot run, and SIGTERM and SIGHUP are not handled"
  - id: IN-01
    iteration: 1
    severity: info
    disposition: fixed
    title: "The text after `@ts-expect-error` in the tstyche negatives is decorative; the directive passes for any error on that line"
  - id: IN-02
    iteration: 1
    severity: info
    disposition: fixed
    title: "`POLICY_ARITY[tag]` is an unguarded own-property read, so a foreign tag falls through to Many and no test pins it"
  - id: IN-03
    iteration: 1
    severity: info
    disposition: fixed
    title: "`PolicyArity.test.ts` has one assertion that cannot fail and two that couple to unrelated output shape"
  - id: IN-04
    iteration: 1
    severity: info
    disposition: fixed
    title: "The Many type refuses every fixed-length array literal, which a future Many tag will meet as an opaque error"
  - id: IN-05
    iteration: 1
    severity: info
    disposition: fixed
    title: "ADR-QD-164 and the proof table cite a test file as the reader that refuses Leaf to Many; the `src` readers refuse it first"
  - id: IN-06
    iteration: 1
    severity: info
    disposition: fixed
    title: "Tooling brittleness: a hard-coded TypeScript path, a dead fallback branch, and survivor identity that is a set, not a multiset"
  - id: WR-01
    iteration: 2
    severity: warning
    disposition: fixed
    title: "`51-SECURITY.md` T-51-09 describes the foreign-tag behaviour of code that no longer exists"
  - id: WR-02
    iteration: 2
    severity: warning
    disposition: fixed
    title: "`proofs.mjs`'s runtime-refusal row passes whenever vitest exits non-zero, not only when a test fails"
  - id: IN-01
    iteration: 2
    severity: info
    disposition: fixed
    title: "BEH-QD-593 and the changeset say nothing about the error class a foreign tag now raises"
  - id: IN-02
    iteration: 2
    severity: info
    disposition: fixed
    title: "The IN-04 tstyche line for `Array.of` pins nothing beyond the line above it"
  - id: IN-03
    iteration: 2
    severity: info
    disposition: fixed
    title: "INV-QD-348 says `Decision.test.ts` is \"untouched\", and the CCR-QD-442 row does not list it"
open: 0
---

# Phase 51: Code Review Disposition

Three review iterations (`51-REVIEW.iter1.md`, `iter2`, `iter3`; `51-REVIEW.md` is iteration 3, status clean). Ids restart per iteration, so each row carries its iteration. Every finding was fixed in the matching `51-REVIEW-FIX.iter<N>.md` commits (iteration 1: `6b007eea..2cd90675`; iteration 2: `1a68e58f..ea7e8501`); none is open, deferred, skipped or accepted. Iteration 3 found nothing.

**Consequences recorded for the verifier.** The fixes changed `src` after the 51-05 close (iteration 1 WR-02 replaced `traceChildrenOf`'s ternary with a closed per-arity table; doc comments), and added one guard test to `packages/core/test/Decision.test.ts` to hold `Decision.ts`'s mutation floor. So `tools/scan.mjs` (a 51-05 close tool) now reports three expected items: `Decision.test.ts` outside its scope list, `traceChildrenOf`'s body changed, and `51-mutation-after.json` predating later src commits. Its checks were not edited. The post-review mutation record `51-mutation-review.json` (Stryker at `bbdc7675`, same invocation) gives Decision.ts 0.9677 (150/155) and Policy.ts 0.9865 (146/148), `PolicyArity.ts` no mutant; `tools/mutation.mjs compare` against the base: WX-05 holds, survivors +0 −2. A tag outside the `Policy` union now throws a `TypeError` in `traceChildrenOf` (the base threw Match's `absurd` at `traceStep`), still before any arm; T-51-09, BEH-QD-593, ADR-QD-164 and the changeset say so.
