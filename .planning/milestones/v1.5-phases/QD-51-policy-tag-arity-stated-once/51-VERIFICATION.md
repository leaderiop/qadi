---
phase: QD-51-policy-tag-arity-stated-once
verified: 2026-11-16T18:10:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".changeset/policy-arity-stated-once.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-01-PLAN.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-01-SUMMARY.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-02-PLAN.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-02-SUMMARY.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-03-PLAN.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-03-SUMMARY.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-04-PLAN.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-04-SUMMARY.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-05-PLAN.md"
  - ".planning/phases/QD-51-policy-tag-arity-stated-once/51-05-SUMMARY.md"
  - "packages/core/src/Decision.ts"
  - "packages/core/src/Policy.ts"
  - "packages/core/src/PolicyArity.ts"
  - "packages/core/test/Decision.test.ts"
  - "packages/core/test/PolicyArity.test.ts"
  - "packages/core/test/PolicyArity.tst.ts"
  - "packages/core/test/TraceShape.test.ts"
  - "spec/decisions/164-policy-tag-arity-is-stated-once.md"
covered_digest: "v4:sha256:7ae324486bf48b0ae8fb56de006ede31a1c4931fcc419d5f5f6c3596b4d68110"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 51: Policy tag arity stated once - Verification Report

**Phase Goal:** Each policy tag's arity (Leaf, Wrapper or Many) is stated once, so `Decision.ts`'s trace shape reads it instead of a hand-kept `leafTags` array, and moving a tag's arity in one place and not the other fails to compile.
**Verified:** 2026-11-16 at HEAD `a909db56`
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One closed record gives each tag's arity; `traceShapeOf` reads it; `leafTags` is deleted | VERIFIED | `packages/core/src/PolicyArity.ts` holds `POLICY_ARITY` (16 keys: ten Leaf, three Wrapper, three Many) `as const satisfies`. `Decision.ts` has `const traceShapeOf = (tag) => POLICY_ARITY[tag]`. `grep leafTags packages/*/src` is empty. The record sits in the package-private `PolicyArity.ts`, not `Policy.ts`. CONTEXT D-01a locked this because `index.ts` does `export *` on `Policy.ts`. It is not in the barrel (`grep PolicyArity index.ts` is empty), and the api-surface count is 932, the base count. The intent of SC1 (one closed record, read by the trace shape) is met; only the location differs, by a locked decision. |
| 2 | Type-level test ties `LeafPolicy` and `childrenOf` to the record; checked `@ts-expect-error` negatives; base compiled (recorded) | VERIFIED | `tstyche PolicyArity.tst.ts` ran: 15 passed, 22 assertions. The negatives cover Not to Many (TS2322, "not assignable to type 'never'"), AllOf to Wrapper, and a record missing a tag. `tsc -p tsconfig.test.json --noEmit` exits 0. `Policy.ts` has `childrenOf`'s arms `satisfies ChildArms<Policy, typeof POLICY_ARITY>` and `LeafPolicy = Extract<Policy, {_tag: TagsOfArity<"Leaf">}>`. Base record: `base-experiment/moves.tsv` has 32 moves with `tsc_exit` 0 on all 32, `TraceShape` failing on 32 and `Decision.test.ts` on 8. `not-to-many.patch` moves `Not` from the Wrapper `whenOr` to the Many one. |
| 3 | Every tag's trace shape is unchanged, pinned by a table test written on the base | VERIFIED | `TraceShape.test.ts` landed in `dfb137ea`, before the `feat(51-03)` commit `80062b1c`, and has not changed since. Vitest `--project core` ran `TraceShape`, `PolicyArity` and `Decision`: 3 files, 89 tests passed. `moves.tsv` shows `TraceShape_failed` > 0 on all 32 moves. |
| 4 | `foldTrace` stays public and unchanged; `renderTrace` and `diffTraces` keep their walks; ADR states why; `SWITCH_BUDGET` unchanged | VERIFIED | The `foldTrace` signature and body are identical to the base (`<R>(self: Trace, cases: TraceCases<R>): R => foldTreeBy(...)`). The Decision.ts diff touches only `traceShapeOf`, `traceChildrenByArity` and `traceChildrenOf`, and `Decision.test.ts` only adds one guard test and its imports. `PolicyArity.test.ts` pins render and diff reading no arity (BEH-QD-595) over all 16 tags. ADR-QD-164 exists (1 heading, `index.yaml` entry). House style reports "539 file(s) clean (3 declared switch(es))". |

**Score:** 4/4 truths verified (0 behavior-unverified)

### Behavior-dependent truths

The fold's runtime behavior (SC3) is exercised by passing tests: all 16 tags with three children, plus empty wrapper and Many cases. A foreign tag throws before any arm runs, checked for `Bogus`, `constructor`, `toString` and `__proto__`.

The compile-time claims (SC2) are exercised by tstyche and `tsc`, not by grep.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/PolicyArity.ts` | VERIFIED | 68 lines, imports nothing, keeps `readonly 0?: never`, out of the barrel. |
| `packages/core/src/Policy.ts` | VERIFIED | Three type-only edits (`import type`, `satisfies`, `LeafPolicy` via `TagsOfArity`). |
| `packages/core/src/Decision.ts` | VERIFIED | `traceShapeOf` is one line. The per-arity table `traceChildrenByArity` is `as const satisfies { [A in Arity]: ... }`, so a fourth arity word does not compile. |
| `TraceShape.test.ts`, `PolicyArity.test.ts`, `PolicyArity.tst.ts` | VERIFIED | Pass. The assertions are real, and the tstyche negatives are checked. |
| Spec records | VERIFIED | BEH-QD-591..595, INV-QD-347 and 348, and ADR-QD-164 each have exactly one heading. CCR-QD-442 is in `spec/README.md`. `spec-revise --check` passes, and `traceability.md`, `invariants.md` and `index.yaml` are updated. |
| `.changeset/policy-arity-stated-once.md` | VERIFIED | `@qadi/core` patch. It states the foreign-tag TypeError change. |
| Mutation records | VERIFIED | `51-mutation-base.json`, `51-mutation-after.json` and `51-mutation-review.json` exist and `mutation.mjs compare` prints `WX-05 holds`. |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `Decision.ts` | `PolicyArity.ts` | WIRED | `POLICY_ARITY` and `Arity` are imported and used in `traceShapeOf` and the per-arity table. |
| `Policy.ts` | `PolicyArity.ts` | WIRED | `import type`, so there is no madge edge. `pnpm circular` reports no cycle. |
| `traceChildrenOf` | `foldTrace` and `traceStep` | WIRED | `foldTrace` still calls `traceChildrenOf`, unchanged. |

### Data-Flow Trace (Level 4)

Not applicable: there is no rendered dynamic data. The record is a static constant read by the fold, and the fold is tested end to end.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type-level negatives | `node_modules/.bin/tstyche packages/core/test/PolicyArity.tst.ts` | 15 passed | PASS |
| Table, arity and Decision tests | `vitest run --project core <3 files>` | 89 passed | PASS |
| Test typecheck | `tsc -p tsconfig.test.json --noEmit` | exit 0 | PASS |
| Circular dependencies | `pnpm circular` | none | PASS |
| House style | `check-house-style.mjs` | 539 files clean, 3 declared switches | PASS |
| API surface | `check-api-surface.mjs` | 932 exports (the base count) | PASS |
| Mutation comparison | `tools/mutation.mjs compare` | `WX-05 holds` | PASS |
| Spec revisions | `spec-revise.mjs --check` | match | PASS |

### Probe Execution

No conventional probe scripts apply (not a migration or tooling phase). `tools/proofs.mjs` and `tools/moves.mjs` were not run because they edit `src` temporarily. Their committed outputs, `moves.tsv` and `not-to-many.patch`, were checked instead.

### Requirements Coverage

Every ID in the PLAN frontmatter (51-01: WX-02, WX-05, WX-06; 51-02: ARTY-01, ARTY-02, WX-06; 51-03: ARTY-01, ARTY-02, WX-04; 51-04: ARTY-03, WX-02, WX-03, WX-07; 51-05: ARTY-01..03, WX-01, WX-05..07) maps to a requirement ID in REQUIREMENTS.md. No orphaned phase IDs. Together they cover all ten IDs the phase requires.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ARTY-01 | SATISFIED | `POLICY_ARITY` is stated once and `traceShapeOf` reads it. `leafTags` is deleted. The record is in `PolicyArity.ts`, not `Policy.ts`, by D-01a. REQUIREMENTS wording "in `Policy.ts`" is superseded by that locked decision. The text could be corrected, but this is not a gap. |
| ARTY-02 | SATISFIED | Checked negatives pass under tstyche. `tsc` is clean on the real tree. The base compiled for all 32 moves. |
| ARTY-03 | SATISFIED | `foldTrace` is unchanged and its barrel pin is untouched. ADR-QD-164 and BEH-QD-595 state why `renderTrace` and `diffTraces` keep their own walks. |
| WX-01 | SATISFIED | `pnpm check:pr < /dev/null` exited 0 at HEAD per the orchestrator. I re-ran the relevant sub-gates myself: tstyche, vitest core subset, tsc, circular, house-style, api-surface and spec-revise. |
| WX-02 | SATISFIED | Only reserved ids are used (CCR-QD-442, ADR-QD-164, BEH-QD-591..595, INV-QD-347 and 348), each heading appears once. `next-id.mjs` was never run per the records. |
| WX-03 | SATISFIED | `spec/overview.md` is unchanged, since no export is added or removed. Gate 13 reports 932. |
| WX-04 | SATISFIED | My scan of added lines in `src` and `test` found no `as` assertion (other than `as const`), `!`, `any` (English words in comments only), `switch`, `fnUntraced`, `async`/`await`, `console`, `process.env` or clock. The switch count is still 3. |
| WX-05 | SATISFIED | `Decision.ts` 0.9586 to 0.9677, `Policy.ts` 0.9865 unchanged. `PolicyArity.ts` has no scored mutant under `ignoreStatic`, which is recorded under `unmeasured`. Survivors +0 -1 in the after-run and +0 -2 post-review. |
| WX-06 | SATISFIED | Commit order: `d7324ee4` (mutation base), `dfb137ea` (base-green table), `4288068a` (experiment), `1168fdab` (RED tests), `80062b1c` (feat). |
| WX-07 | SATISFIED | No public break: no export or type change. `LeafPolicy` is type-equal to the base's, pinned in the tst. The foreign-tag error class changes (Match `absurd` to `TypeError`), and is recorded in the changeset, ADR, BEH-QD-593 and T-51-09. Nothing was released. |

### Anti-Patterns Found

None. There are no `TBD`, `FIXME` or `XXX` markers in the phase's added lines (the grep matches were English words). No stubs: every artifact is substantive and wired.

### `tools/scan.mjs` assessment

It exits 1 and prints exactly the three items the orchestrator predicted:

1. `Decision.test.ts` is outside its scope list. The review fix added one guard test, a legitimate, reviewed change.
2. `traceChildrenOf`'s body changed. Review fix WR-02 made it table-driven, so a fourth arity word does not compile.
3. `51-mutation-after.json` does not follow the last src commit. This is superseded by `51-mutation-review.json`, which was measured after the review fixes.

It prints nothing else, so every remaining check holds. These are the same checks I verified independently: scope, constructs, switch totals, record import-free, out of the barrel, and `foldTrace` untouched.

Two items have no scan to back them. I verified the Policy.ts "emits base JS" claim by reading the diff: all three edits are type-only (`import type`, `satisfies`, a type alias). I did not run a transpile comparison.

### Human Verification Required

None.

### Gaps Summary

No gaps. The only deviation from the literal roadmap text is the record's file (`PolicyArity.ts`, not `Policy.ts`), which is covered by locked decision D-01a and by the barrel and `madge` reasoning in the ADR. The base experiment confirms the failure mode existed (32/32 moves compiled on the base). The after state refuses the moves through checked negatives, and the existing tests plus the new table pin the shapes.

---

_Verified: 2026-11-16_
_Verifier: Claude (gsd-verifier)_
