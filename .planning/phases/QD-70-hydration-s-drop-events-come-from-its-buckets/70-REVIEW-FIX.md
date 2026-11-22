---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
fixed_at: 2026-11-22T00:00:00Z
review_path: .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-REVIEW.md
iteration: 2
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase QD-70: Code Review Fix Report

**Fixed at:** 2026-11-22
**Source review:** .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 5 (1 warning, 4 info; fix scope `all`)
- Fixed: 5
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), after the last commit: `vitest --project react` (578 passed), `pnpm typecheck`, `pnpm test:tstyche` (both passes, 67 files), `check-house-style`, `check-doc-examples` (118 blocks), `check-api-surface` (941 exports), `spec-revise --check`, and `verify-traceability.sh --strict` (21 pass, 0 fail).

WR-01, IN-01 and the spec half of IN-03 share one commit because they edit the same set of spec documents, each revised once.

## Fixed Issues

### WR-01: INV-QD-385 and INV-QD-045 still say a reason "with no source does not compile"

**Files modified:** `spec/invariants.md` (Rev 1.172), `spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md` (Rev 1.2), `spec/behaviors/19-hydration.md` (Rev 1.26), `.changeset/react-hydration-drop-buckets.md`, `spec/README.md` (Rev 1.284)
**Commit:** 67ac2f6f
**Applied fix:** INV-QD-385's statement now says a reason with no bucket, or for a `payload` reason no named producer, does not compile; every bucket is emitted, so an entry dropped under any bucketed reason is reported and counted; and no type checks that a call site collects into a bucket or raises a producer, which `HydrationDropEvents.test.ts` and the conformance test show. Its first sentence says "stated" (a bucket or a producer row) instead of "collected or produced". Its Implication adds that a bucket no call site fills compiles and collects nothing. INV-QD-045's Enforcement is split into two sentences with the same wording. ADR-QD-183's Consequences bullet says the same (every bucket emitted; the compiler does not check that code drops anything under a reason). BEH-QD-686 gained one sentence to that effect. The changeset says a reason must have a bucket, every bucket is reported and counted, a payload reason needs a named producer, and no type checks that code drops under a reason. The code comments (`HydrationBuckets.ts`, `HydrationEngine.ts`), BEH-QD-687 to BEH-QD-690, INV-QD-323 and the ADR-QD-152 amendment were read and already state only what holds, so they were not edited. Revisions were bumped only through `scripts/spec-revise.mjs --date 2026-11-22`; CCR-QD-462's row cites 183 Rev 1.2, 152 Rev 1.3, behaviors/19 Rev 1.26, invariants Rev 1.172, traceability Rev 1.241 (unchanged) and README Rev 1.284, each checked equal to its header. No new id.

### IN-01: ADR-QD-152's Consequences bullet still states the superseded facts

**Files modified:** `spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md` (Rev 1.3)
**Commit:** 67ac2f6f
**Applied fix:** The old bullet is kept verbatim, with an "(Amended 2026-11-22 by ADR-QD-183: see the Amendment above ...)" marker added after it naming `bucketOf` as gone and the three records (`entryBuckets`, `dehydrationBuckets`, `PAYLOAD_PRODUCERS`) that replace it. The 1.3 history entry records it.

### IN-02: Tautological `expect(...)` lines in the bucket-record pins

**Files modified:** `packages/react/test/HydrationBuckets.tst.ts`
**Commit:** 5a516de9
**Applied fix:** Added two written-out types, `EntryBucketRecord` and `DehydrationBucketRecord`. Every `expect(missing)`, `expect(excess)`, `expect(whole)` now compares to the matching one, and the `refused` and `accepted` inverse pins compare to the inverse written out (`never` for the two slots the doubled record leaves unnamed). The constructor pins use the same two types. Every `@ts-expect-error` keeps its positive twin. Gutting check, run once: `DropBuckets`' arrays widened to `ReadonlyArray<T>` turned 4 tests and 8 assertions red ("Type 'DropBuckets<...>' is not the same as type 'DehydrationBucketRecord'"), then the edit was reverted with `git checkout` and the file went green again (11 tests, 29 assertions). No negative `toBeCallableWith` or `toBeConstructableWith` pin was added, so the budget table is untouched. Status: fixed, requires human verification (type-level pins).

### IN-03: Header of the characterisation omits that rows were retitled, and the spec speaks of "the phase base"

**Files modified:** `packages/react/test/HydrationDropEvents.test.ts` (commit f069f666); `spec/invariants.md`, `spec/decisions/183-...md` (commit 67ac2f6f)
**Applied fix:** The header now says later edits "wrapped lines, retitled the order rows for what they feed, derived a constant from the declared reasons and added rows". INV-QD-045 says "written against the engine before its drops were collected in records", and its long sentence is split before INV-QD-385. ADR-QD-183 no longer says "the base" in its Context, decision 3 or Consequences ("the code before this decision", "the order the engine emitted before this decision", "written against the engine before its drops were collected in records"). ADR-QD-152's own "phase base" line is history of a different phase and was left. No expected value in the characterisation changed.

### IN-04: Small cleanliness items in the phase's code and tests

**Files modified:** `packages/react/src/HydrationEngine.ts`, `packages/react/test/HydrationBuckets.test.ts`
**Commit:** dd0e8f1c
**Applied fix:** The two doc comments cite `AGENTS.md §9` and `§5a`; the redundant spread became `expect(stated.sort())`.

---

_Fixed: 2026-11-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
