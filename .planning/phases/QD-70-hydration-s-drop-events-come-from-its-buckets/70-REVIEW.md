---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
reviewed: 2026-11-22T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - packages/react/src/HydrationBuckets.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/HydrationEvent.ts
  - packages/react/test/HydrationBuckets.tst.ts
  - packages/react/test/HydrationBuckets.test.ts
  - packages/react/test/HydrationDropEvents.test.ts
  - packages/react/test/HydrationPayload.test.ts
  - .changeset/react-hydration-drop-buckets.md
  - spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md
  - spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md
  - spec/behaviors/19-hydration.md
  - spec/invariants.md
  - spec/README.md
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
  necessity: 0
status: issues_found
---

# Phase QD-70: Code Review Report

**Reviewed:** 2026-11-22
**Depth:** standard (iteration 2)
**Files Reviewed:** 13 (plus `spec/traceability.md`, `spec/decisions/index.yaml`, `70-RED-EVIDENCE.md` read against the claims)
**Status:** issues_found

## Summary

All seven iteration-1 findings are fixed correctly. I verified by running, not by reading the fix report:

- `vitest --project react` on the three runtime files: 83 passed. `tstyche` on `HydrationBuckets.tst.ts`: 11 tests, 29 assertions, 6 suppressed directives, all matched. `check-house-style` clean, `spec-revise --check` clean.
- The CCR-QD-462 row cites ADR-QD-183 Rev 1.1, ADR-QD-152 Rev 1.2, behaviors/19 Rev 1.25, invariants Rev 1.171, traceability Rev 1.241 and README Rev 1.283. Each equals its document's header. `spec/overview.md` is still Rev 1.132, as the row says.
- The names the spec cites by title (the eleven `.tst.ts` pins, the four `HydrationBuckets.test.ts` rows, the pair and triple rows, the conformance test) all exist verbatim.
- The `ReasonRaisedBy<P, Rows>` default parameter and the exported type machinery do what their comments say. The doubled-record pin is a real failure: two directives, each matched against "is not assignable to type 'never'".
- The shadowed `entries` is gone from both planners and `dropEvents` calls its parameter `bucket`.
- The hydrate pair-order rows are retitled for what they feed, and each has its reverse twin. The new conformance test fails if a row names the wrong producer.
- No stale `payloadRefusalReason` or `bucketOf` reference remains in source or test.
- No phase-written line exceeds 100 columns.
- No new `as`, `!`, `any`, `switch`, bare `effect` import or `.js` import was introduced.

No behavioural defect found. What remains is one place where the spec still overstates what the compiler checks (a leftover of iteration-1 WR-03, fixed for `payload` only), and four cleanliness items.

## Warnings

### WR-01: INV-QD-385 and INV-QD-045 still say a reason "with no source does not compile", true only of "no bucket"

**File:** `spec/invariants.md` (INV-QD-385 statement, "Each record is total over its kind, so a reason with no source does not compile"; INV-QD-045 Enforcement, "makes a reason with no source a compile error"); `spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md` Decision 1 (read with the same limit in mind)
**Issue:** Iteration 1 corrected the payload kind: the compiler checks a producer is *named*, not that a call site *raises* it. The same limit holds for the two bucketed kinds and is not stated. `entryBuckets` and `dehydrationBuckets` check that a bucket exists for a reason. Nothing checks that any code pushes into it. A fourth `entry` row given a key in `entryBuckets` and no `drops.X.push(...)` compiles, and nothing is ever collected under it. That is the same "compiles and is raised nowhere" outcome the INV now carves out for `payload`. The INV defines the "source" of an `entry` or `dehydration` reason as a bucket key ("`entry` reason is a key of the hydrate side's bucket record"). Under that definition the sentence is true, but it reads, beside the carve-out for `payload` only, as if a bucketed reason's collection were also checked. The "exactly one place it is collected" wording makes it worse: a key is a place a reason *can* be collected, not one it is. The owner bar is no misleading spec text, and this is the defect iteration 1 fixed in the ADR consequence, left standing in the INV statement and in INV-QD-045's Enforcement.
**Fix:** In INV-QD-385's statement, replace "so a reason with no source does not compile" with "so a reason with no bucket or no named producer does not compile", and add one sentence: "No type checks that a call site collects into a bucket or raises a producer; `HydrationDropEvents.test.ts` and the conformance test show it." Mirror the wording in INV-QD-045's Enforcement ("makes a reason with no bucket or producer a compile error"). Revise through `scripts/spec-revise.mjs --date 2026-11-22` and update the CCR row's cited revisions to match.

## Info

### IN-01: ADR-QD-152's Consequences bullet still states the superseded facts, with a name that no longer exists

**File:** `spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md:102-106`
**Issue:** The Amendment paragraph (lines 85-94) says "the consequence below ... is amended", but the bullet it points at is left verbatim: "a compile error at `HydrationEngine.ts`'s `bucketOf` (TS2741)", "A `payload` row compiles everywhere", "A `dehydration` row likewise". `bucketOf` no longer exists anywhere in source. A reader of Consequences, where ADRs are skimmed, gets three false statements and meets the correction only if they read upward past Alternatives. INV-QD-323 and INV-QD-045 were amended in place for the same reason.
**Fix:** Add a short marker at the end of the bullet: "(Amended 2026-11-22 by ADR-QD-183; see the Amendment above: the record is now `entryBuckets`/`dehydrationBuckets`/`PAYLOAD_PRODUCERS`.)". A bump of Rev 1.2 to 1.3 through `spec-revise` is needed with the CCR row following. Alternatively mark the bullet as superseded with strikethrough, as the repo does for history kept beside a correction.

### IN-02: Tautological `expect(...)` lines in the bucket-record pins

**File:** `packages/react/test/HydrationBuckets.tst.ts:51`, `:59`, `:65`, `:71`, `:78`, `:83`, `:157`, `:165`
**Issue:** Each of `expect(missing)`, `expect(excess)`, `expect(whole)` and `expect(refused)`/`expect(accepted)` compares a variable to the type it was just annotated with, so the `expect` can never fail. What fails the test is the `@ts-expect-error` directive (or its absence, when the positive twin stops compiling), not the assertion. The same pattern was flagged in iteration 1 for the constructor pins and fixed there; these are the rows left. They make a reader look for a pin that is not there.
**Fix:** Keep the directives and the positive twin, and drop the self-comparing `expect` calls, using the variable some other way if `noUnusedLocals` objects (`void missing;`), or say in the file header that the directives are the pin and the `expect` only reads the binding.

### IN-03: Header of the characterisation omits that rows were retitled, and the spec speaks of "the phase base"

**File:** `packages/react/test/HydrationDropEvents.test.ts:4-6` (header); `spec/invariants.md` INV-QD-045 Enforcement ("written on the phase base"); `spec/decisions/183-...md` Consequences ("a characterisation written on the base")
**Issue:** The header says later edits "only wrapped lines, derived a constant from the declared reasons and added rows". It also retitled five rows (the three hydrate pair-order rows, the "malformed and a disagreeing" row, and the two `describe` titles). The expected values are unchanged, so the claim that matters holds, but "only" is false and INV-QD-386 cites the new titles. Separately, "the phase base" is a process term. Normative spec read later has no referent for it (BEH-QD-690 says "against the engine as it was", which is clear). INV-QD-045's Enforcement sentence is also now a single 120-plus word run mixing three clauses.
**Fix:** Header: "later edits wrapped lines, retitled the order rows for what they feed, derived a constant from the declared reasons and added rows". In the spec, say "written against the engine before its drops were collected in records", and split the INV-QD-045 sentence at "and [INV-QD-385] makes ...".

### IN-04: Small cleanliness items in the phase's code and tests

**File:** `packages/react/src/HydrationEngine.ts:205`, `:264`; `packages/react/test/HydrationBuckets.test.ts:45`
**Issue:** (a) The two new doc comments cite "AGENTS.md section 9" and "section 5a". Every other citation in `packages/react/src` (`HydrationBuckets.ts:11`, `HydrationEngine.ts:13`, `:63`, `SeededQuestion.ts:13`, `DeveloperSignals.ts`) writes the section sign. (b) `expect([...stated].sort())` copies an array that is already fresh. `stated` is built by a spread two lines above, so the second spread is dead.
**Fix:** Use `AGENTS.md §9` and `§5a`; write `expect(stated.sort()).toEqual([...hydrationDropReasons].sort())`.

---

_Reviewed: 2026-11-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
